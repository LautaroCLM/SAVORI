-- =============================================================================
-- 0007 · Stock automático, movimientos y ganancias
-- =============================================================================
-- Stock (solo productos con controla_stock):
--   * Al agregar un item a un pedido se DESCUENTA el stock en forma atómica (el UPDATE condicional
--     bloquea la fila: dos mesas que piden la última unidad a la vez → una recibe SIN_STOCK).
--   * Cancelar un pedido DEVUELVE el stock. Cancelado es un estado final.
--   * Quitar o cambiar la cantidad de un item también ajusta el stock.
--   * Todo queda en movimientos_stock (cantidad CON SIGNO: + entra, − sale).
--   * registrar_movimiento_stock(...) es la única vía para entradas, salidas y ajustes manuales (admin).
--
-- Ganancias = Σ (precio_unitario − costo_unitario) × cantidad de pedidos ENTREGADOS, usando el
-- snapshot del item (editar un producto no cambia el historial). Día/semana/mes en hora de Argentina.
--
-- Errores (campo `message`): SIN_STOCK, PEDIDO_CANCELADO, NO_AUTORIZADO, PRODUCTO_INVALIDO,
--   TIPO_INVALIDO, CANTIDAD_INVALIDA, STOCK_NEGATIVO, AGRUPACION_INVALIDA, RANGO_INVALIDO
-- =============================================================================

alter table public.productos
  add constraint productos_stock_no_negativo check (stock_actual >= 0);

-- -----------------------------------------------------------------------------
-- Interna: mueve stock y registra el movimiento. Solo la llaman los triggers.
-- -----------------------------------------------------------------------------
create or replace function public._mover_stock(p_producto_id uuid, p_delta numeric, p_pedido_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_resto uuid;
  v_controla boolean;
begin
  select restaurante_id, controla_stock into v_resto, v_controla
    from public.productos where id = p_producto_id;
  if not found or not v_controla then
    return;  -- producto borrado o sin control de stock
  end if;

  -- UPDATE condicional: bloquea la fila y no deja pasar de 0
  update public.productos
     set stock_actual = stock_actual + p_delta
   where id = p_producto_id and stock_actual + p_delta >= 0;
  if not found then
    raise exception 'SIN_STOCK' using errcode = 'P0001';
  end if;

  insert into public.movimientos_stock (restaurante_id, producto_id, tipo, cantidad, motivo, pedido_id, usuario_id)
  values (v_resto, p_producto_id,
          case when p_delta < 0 then 'venta'::public.tipo_movimiento_stock else 'ajuste'::public.tipo_movimiento_stock end,
          p_delta, p_motivo, p_pedido_id, auth.uid());
end;
$$;
revoke execute on function public._mover_stock(uuid, numeric, uuid, text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Triggers sobre pedido_items
-- -----------------------------------------------------------------------------
create or replace function public.tg_stock_items()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado public.estado_pedido;
  v_pedido uuid;
begin
  if tg_op = 'INSERT' then
    if new.producto_id is not null then
      perform public._mover_stock(new.producto_id, -new.cantidad, new.pedido_id, null);
    end if;

  elsif tg_op = 'DELETE' then
    -- Si el pedido ya no existe (borrado en cascada) el movimiento no puede referenciarlo
    select estado, id into v_estado, v_pedido from public.pedidos where id = old.pedido_id;
    if old.producto_id is not null and v_estado is distinct from 'cancelado' then
      perform public._mover_stock(old.producto_id, old.cantidad, v_pedido, 'Ítem quitado del pedido');
    end if;

  else  -- UPDATE de la cantidad del mismo producto
    if new.producto_id is not null and new.producto_id is not distinct from old.producto_id
       and new.cantidad <> old.cantidad then
      select estado into v_estado from public.pedidos where id = new.pedido_id;
      if v_estado is distinct from 'cancelado' then
        perform public._mover_stock(new.producto_id, old.cantidad - new.cantidad, new.pedido_id, 'Cantidad modificada');
      end if;
    end if;
  end if;
  return null;
end;
$$;

create trigger stock_items
  after insert or delete or update of cantidad on public.pedido_items
  for each row execute function public.tg_stock_items();

-- -----------------------------------------------------------------------------
-- Cancelar un pedido devuelve el stock; cancelado es un estado final
-- -----------------------------------------------------------------------------
create or replace function public.tg_stock_pedido_estado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if old.estado = 'cancelado' and new.estado <> 'cancelado' then
    raise exception 'PEDIDO_CANCELADO' using errcode = 'P0001';
  end if;
  if new.estado = 'cancelado' and old.estado <> 'cancelado' then
    for r in select producto_id, cantidad from public.pedido_items
              where pedido_id = new.id and producto_id is not null loop
      perform public._mover_stock(r.producto_id, r.cantidad, new.id, 'Pedido cancelado');
    end loop;
  end if;
  return null;
end;
$$;

create trigger stock_pedido_estado
  after update of estado on public.pedidos
  for each row execute function public.tg_stock_pedido_estado();

-- -----------------------------------------------------------------------------
-- Movimiento manual: entrada (compra), salida (merma) o ajuste (conteo físico)
--   p_cantidad: entrada/salida → unidades (>0) · ajuste → stock real contado (>=0)
-- Devuelve el stock resultante. Solo admin.
-- -----------------------------------------------------------------------------
create or replace function public.registrar_movimiento_stock(
  p_producto_id uuid,
  p_tipo public.tipo_movimiento_stock,
  p_cantidad numeric,
  p_motivo text default null
)
returns numeric
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_resto uuid := public.mi_restaurante_id();
  v_prod  record;
  v_delta numeric;
  v_nuevo numeric;
begin
  if v_resto is null or public.mi_rol() is distinct from 'admin' then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;
  if p_tipo not in ('entrada', 'salida', 'ajuste') then
    raise exception 'TIPO_INVALIDO' using errcode = 'P0001';
  end if;
  if p_cantidad is null or p_cantidad < 0 or (p_tipo <> 'ajuste' and p_cantidad = 0) then
    raise exception 'CANTIDAD_INVALIDA' using errcode = 'P0001';
  end if;

  select id, stock_actual, controla_stock into v_prod
    from public.productos
   where id = p_producto_id and restaurante_id = v_resto
     for update;
  if not found or not v_prod.controla_stock then
    raise exception 'PRODUCTO_INVALIDO' using errcode = 'P0001';
  end if;

  v_delta := case p_tipo
               when 'entrada' then p_cantidad
               when 'salida'  then -p_cantidad
               else p_cantidad - v_prod.stock_actual
             end;
  v_nuevo := v_prod.stock_actual + v_delta;
  if v_nuevo < 0 then
    raise exception 'STOCK_NEGATIVO' using errcode = 'P0001';
  end if;
  if v_delta = 0 then
    return v_prod.stock_actual;  -- el conteo coincide: nada que registrar
  end if;

  update public.productos set stock_actual = v_nuevo where id = p_producto_id;
  insert into public.movimientos_stock (restaurante_id, producto_id, tipo, cantidad, motivo, usuario_id)
  values (v_resto, p_producto_id, p_tipo, v_delta, nullif(left(trim(p_motivo), 200), ''), auth.uid());
  return v_nuevo;
end;
$$;

revoke execute on function public.registrar_movimiento_stock(uuid, public.tipo_movimiento_stock, numeric, text) from public, anon;
grant  execute on function public.registrar_movimiento_stock(uuid, public.tipo_movimiento_stock, numeric, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Ganancias por período (solo admin)
-- -----------------------------------------------------------------------------
create or replace function public.resumen_ganancias(p_desde date, p_hasta date, p_agrupar text default 'dia')
returns table (periodo date, pedidos bigint, unidades bigint, ingresos numeric, costos numeric, ganancia numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  c_tz constant text := 'America/Argentina/Buenos_Aires';
  v_resto uuid := public.mi_restaurante_id();
begin
  if v_resto is null or public.mi_rol() is distinct from 'admin' then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;
  if p_agrupar not in ('dia', 'semana', 'mes') then
    raise exception 'AGRUPACION_INVALIDA' using errcode = 'P0001';
  end if;
  if p_desde is null or p_hasta is null or p_hasta < p_desde or p_hasta - p_desde > 1100 then
    raise exception 'RANGO_INVALIDO' using errcode = 'P0001';
  end if;

  return query
  select date_trunc(case p_agrupar when 'dia' then 'day' when 'semana' then 'week' else 'month' end,
                    p.created_at at time zone c_tz)::date,
         count(distinct p.id),
         coalesce(sum(i.cantidad), 0)::bigint,
         coalesce(sum(i.precio_unitario * i.cantidad), 0),
         coalesce(sum(i.costo_unitario * i.cantidad), 0),
         coalesce(sum((i.precio_unitario - i.costo_unitario) * i.cantidad), 0)
    from public.pedidos p
    join public.pedido_items i on i.pedido_id = p.id
   where p.restaurante_id = v_resto
     and p.estado = 'entregado'
     and (p.created_at at time zone c_tz)::date between p_desde and p_hasta
   group by 1
   order by 1;
end;
$$;

create or replace function public.productos_mas_vendidos(p_desde date, p_hasta date, p_limite integer default 10)
returns table (nombre text, unidades bigint, ingresos numeric, ganancia numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  c_tz constant text := 'America/Argentina/Buenos_Aires';
  v_resto uuid := public.mi_restaurante_id();
begin
  if v_resto is null or public.mi_rol() is distinct from 'admin' then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;
  if p_desde is null or p_hasta is null or p_hasta < p_desde or p_hasta - p_desde > 1100 then
    raise exception 'RANGO_INVALIDO' using errcode = 'P0001';
  end if;

  return query
  select i.nombre_snapshot,
         sum(i.cantidad)::bigint,
         sum(i.precio_unitario * i.cantidad),
         sum((i.precio_unitario - i.costo_unitario) * i.cantidad)
    from public.pedidos p
    join public.pedido_items i on i.pedido_id = p.id
   where p.restaurante_id = v_resto
     and p.estado = 'entregado'
     and (p.created_at at time zone c_tz)::date between p_desde and p_hasta
   group by i.nombre_snapshot
   order by 2 desc, 3 desc
   limit greatest(1, least(coalesce(p_limite, 10), 100));
end;
$$;

revoke execute on function public.resumen_ganancias(date, date, text) from public, anon;
revoke execute on function public.productos_mas_vendidos(date, date, integer) from public, anon;
grant  execute on function public.resumen_ganancias(date, date, text) to authenticated;
grant  execute on function public.productos_mas_vendidos(date, date, integer) to authenticated;
