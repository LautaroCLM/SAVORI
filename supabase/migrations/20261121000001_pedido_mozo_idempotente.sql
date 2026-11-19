-- =============================================================================
-- 0008 · crear_pedido_mozo idempotente (para la cola offline)
-- =============================================================================
-- La app puede reintentar un envío cuyo resultado no llegó a conocer (se cortó la conexión justo
-- después de que el servidor lo procesó). Con un ID generado en el cliente (`p_id`) el reintento
-- devuelve el pedido ya creado en lugar de duplicarlo.
--
--   crear_pedido_mozo(p_mesa_id, p_items, p_notas, p_id) → {pedido_id, total, repetido}
--
-- Errores nuevos: ID_EN_USO (el id ya pertenece a otro restaurante)
-- =============================================================================

drop function if exists public.crear_pedido_mozo(uuid, jsonb, text);

create or replace function public.crear_pedido_mozo(
  p_mesa_id uuid,
  p_items jsonb,
  p_notas text default null,
  p_id uuid default null
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
  v_previo    record;
  v_sesion_id uuid;
  v_pedido_id uuid;
  v_total     numeric(12,2);
  v_n_items   integer;
  v_n_validos integer;
begin
  if v_resto is null or public.mi_rol() not in ('admin', 'mozo') then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  -- Idempotencia: si ese pedido ya existe (reintento), se devuelve tal cual
  if p_id is not null then
    select id, total, restaurante_id into v_previo from public.pedidos where id = p_id;
    if found then
      if v_previo.restaurante_id <> v_resto then
        raise exception 'ID_EN_USO' using errcode = 'P0001';
      end if;
      return jsonb_build_object('pedido_id', v_previo.id, 'total', v_previo.total, 'repetido', true);
    end if;
  end if;

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

  insert into public.pedidos (id, restaurante_id, mesa_id, sesion_id, origen, notas)
  values (coalesce(p_id, gen_random_uuid()), v_resto, v_mesa.id, v_sesion_id, 'mozo',
          nullif(left(trim(p_notas), 500), ''))
  returning id into v_pedido_id;

  insert into public.pedido_items (pedido_id, producto_id, cantidad, notas, nombre_snapshot, precio_unitario)
  select v_pedido_id, (e ->> 'producto_id')::uuid, (e ->> 'cantidad')::integer,
         nullif(left(trim(e ->> 'notas'), 200), ''), '', 0  -- los pisa el trigger preparar_pedido_item
    from jsonb_array_elements(p_items) e;

  select total into v_total from public.pedidos where id = v_pedido_id;
  return jsonb_build_object('pedido_id', v_pedido_id, 'total', v_total, 'repetido', false);
end;
$$;

revoke execute on function public.crear_pedido_mozo(uuid, jsonb, text, uuid) from public, anon;
grant  execute on function public.crear_pedido_mozo(uuid, jsonb, text, uuid) to authenticated;
