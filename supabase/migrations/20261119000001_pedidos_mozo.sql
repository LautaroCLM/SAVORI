-- =============================================================================
-- 0006 · Pedidos cargados por el mozo + Realtime de sesiones
-- =============================================================================
-- crear_pedido_mozo(p_mesa_id, p_items, p_notas) → {pedido_id, total}
--   Igual que crear_pedido_qr (precios y nombres SIEMPRE de la base, abre la
--   sesión si no hay una abierta, marca la mesa ocupada) pero para usuarios
--   logueados (admin / mozo) y sin límite anti-spam.
--
-- Errores (campo `message`): NO_AUTORIZADO, MESA_INVALIDA, ITEMS_INVALIDOS,
--   PRODUCTO_NO_DISPONIBLE, SIN_STOCK
-- =============================================================================

create or replace function public.crear_pedido_mozo(
  p_mesa_id uuid,
  p_items jsonb,
  p_notas text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_max_items    constant integer := 40;
  c_max_cantidad constant integer := 50;

  v_resto     uuid := public.mi_restaurante_id();
  v_mesa      record;
  v_sesion_id uuid;
  v_pedido_id uuid;
  v_total     numeric(12,2);
  v_n_items   integer;
  v_n_validos integer;
begin
  if v_resto is null or public.mi_rol() not in ('admin', 'mozo') then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  -- Mesa del propio restaurante; FOR UPDATE serializa pedidos simultáneos de la misma mesa
  select m.id, m.restaurante_id into v_mesa
    from public.mesas m
   where m.id = p_mesa_id and m.restaurante_id = v_resto
     for update of m;
  if not found then
    raise exception 'MESA_INVALIDA' using errcode = 'P0001';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'ITEMS_INVALIDOS' using errcode = 'P0001';
  end if;
  v_n_items := jsonb_array_length(p_items);
  if v_n_items = 0 or v_n_items > c_max_items then
    raise exception 'ITEMS_INVALIDOS' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where case
      when jsonb_typeof(e) is distinct from 'object' then true
      when jsonb_typeof(e -> 'producto_id') is distinct from 'string' then true
      when (e ->> 'producto_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then true
      when jsonb_typeof(e -> 'cantidad') is distinct from 'number' then true
      when e ? 'notas' and jsonb_typeof(e -> 'notas') not in ('string', 'null') then true
      else (e ->> 'cantidad')::numeric <> floor((e ->> 'cantidad')::numeric)
           or (e ->> 'cantidad')::numeric not between 1 and c_max_cantidad
    end
  ) then
    raise exception 'ITEMS_INVALIDOS' using errcode = 'P0001';
  end if;

  -- Productos del restaurante y disponibles (el mozo puede pedir de categorías ocultas)
  select count(*) into v_n_validos
    from jsonb_array_elements(p_items) e
    join public.productos p
      on p.id = (e ->> 'producto_id')::uuid
     and p.restaurante_id = v_resto
     and p.disponible;
  if v_n_validos <> v_n_items then
    raise exception 'PRODUCTO_NO_DISPONIBLE' using errcode = 'P0001';
  end if;

  if exists (
    select 1
      from (select (e ->> 'producto_id')::uuid as producto_id,
                   sum((e ->> 'cantidad')::integer) as cantidad
              from jsonb_array_elements(p_items) e
             group by 1) pedido
      join public.productos p on p.id = pedido.producto_id
     where p.controla_stock and p.stock_actual < pedido.cantidad
  ) then
    raise exception 'SIN_STOCK' using errcode = 'P0001';
  end if;

  select id into v_sesion_id
    from public.sesiones_mesa
   where mesa_id = v_mesa.id and cerrada_at is null;
  if v_sesion_id is null then
    insert into public.sesiones_mesa (restaurante_id, mesa_id)
    values (v_resto, v_mesa.id)
    returning id into v_sesion_id;
  end if;
  update public.mesas set estado = 'ocupada' where id = v_mesa.id and estado <> 'ocupada';

  insert into public.pedidos (restaurante_id, mesa_id, sesion_id, origen, notas)
  values (v_resto, v_mesa.id, v_sesion_id, 'mozo', nullif(left(trim(p_notas), 500), ''))
  returning id into v_pedido_id;

  insert into public.pedido_items (pedido_id, producto_id, cantidad, notas, nombre_snapshot, precio_unitario)
  select v_pedido_id, (e ->> 'producto_id')::uuid, (e ->> 'cantidad')::integer,
         nullif(left(trim(e ->> 'notas'), 200), ''), '', 0  -- los pisa el trigger preparar_pedido_item
    from jsonb_array_elements(p_items) e;

  select total into v_total from public.pedidos where id = v_pedido_id;
  return jsonb_build_object('pedido_id', v_pedido_id, 'total', v_total);
end;
$$;

revoke execute on function public.crear_pedido_mozo(uuid, jsonb, text) from public, anon;
grant  execute on function public.crear_pedido_mozo(uuid, jsonb, text) to authenticated;

-- Realtime: las sesiones también (total/abierta de cada mesa en el mapa)
alter publication supabase_realtime add table public.sesiones_mesa;

-- -----------------------------------------------------------------------------
-- Total de la cuenta abierta en vivo: se recalcula cuando cambia cualquier pedido de la sesión
-- (el mapa lo muestra bajo el número de mesa). Al cerrar la sesión el trigger existente lo fija.
-- -----------------------------------------------------------------------------
create or replace function public.tg_total_sesion_abierta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.sesion_id is not null then
    update public.sesiones_mesa s
       set total = coalesce((select sum(p.total) from public.pedidos p
                              where p.sesion_id = s.id and p.estado <> 'cancelado'), 0)
     where s.id = new.sesion_id and s.cerrada_at is null;
  end if;
  return null;
end;
$$;

create trigger total_sesion_abierta
  after insert or update of total, estado on public.pedidos
  for each row execute function public.tg_total_sesion_abierta();
