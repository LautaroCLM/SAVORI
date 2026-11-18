-- =============================================================================
-- 0004 · RPC públicas (carta por QR) y Realtime
-- =============================================================================
-- El cliente que escanea el QR NO inicia sesión (rol anon). anon no tiene
-- acceso a ninguna tabla: todo pasa por estas dos funciones SECURITY DEFINER,
-- que devuelven solo lo necesario (nunca `costo` ni datos internos).
--
-- Errores de crear_pedido_qr (campo `message`, para que el frontend los traduzca):
--   QR_INVALIDO, ITEMS_INVALIDOS, PRODUCTO_NO_DISPONIBLE, SIN_STOCK, DEMASIADOS_PEDIDOS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- obtener_carta(p_token) → jsonb | null
-- -----------------------------------------------------------------------------
create or replace function public.obtener_carta(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mesa as (
    select m.restaurante_id, m.numero, r.nombre as restaurante_nombre
    from public.mesas m
    join public.restaurantes r on r.id = m.restaurante_id
    where m.qr_token = p_token
      and r.activo
  ),
  prods as (
    select p.*
    from public.productos p
    join mesa on mesa.restaurante_id = p.restaurante_id
    where p.disponible
      and (not p.controla_stock or p.stock_actual > 0)
  ),
  cats as (
    select c.id, c.nombre, c.orden,
           jsonb_agg(
             jsonb_build_object(
               'id',          p.id,
               'nombre',      p.nombre,
               'descripcion', p.descripcion,
               'precio',      p.precio,
               'imagen_url',  p.imagen_url
             ) order by p.orden, p.nombre
           ) as productos
    from public.categorias c
    join prods p on p.categoria_id = c.id
    where c.activa
    group by c.id, c.nombre, c.orden
  )
  select jsonb_build_object(
    'restaurante', jsonb_build_object('nombre', mesa.restaurante_nombre),
    'mesa',        jsonb_build_object('numero', mesa.numero),
    'categorias',  coalesce(
                     (select jsonb_agg(
                               jsonb_build_object('id', cats.id, 'nombre', cats.nombre, 'productos', cats.productos)
                               order by cats.orden, cats.nombre)
                      from cats),
                     '[]'::jsonb)
  )
  from mesa;
$$;

-- -----------------------------------------------------------------------------
-- crear_pedido_qr(p_token, p_items, p_notas) → jsonb {pedido_id, total}
--   p_items: [{ "producto_id": uuid, "cantidad": int, "notas"?: text }, ...]
-- -----------------------------------------------------------------------------
create or replace function public.crear_pedido_qr(
  p_token text,
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
  -- Anti-spam: máximo N pedidos QR por mesa dentro de la ventana
  c_max_pedidos  constant integer  := 5;
  c_ventana      constant interval := interval '10 minutes';
  c_max_items    constant integer  := 30;
  c_max_cantidad constant integer  := 50;

  v_mesa      record;
  v_sesion_id uuid;
  v_pedido_id uuid;
  v_total     numeric(12,2);
  v_n_items   integer;
  v_n_validos integer;
begin
  -- 1) Mesa + restaurante activo. FOR UPDATE serializa pedidos simultáneos de
  --    la misma mesa (anti-spam exacto y una sola sesión abierta).
  select m.id, m.restaurante_id
    into v_mesa
    from public.mesas m
    join public.restaurantes r on r.id = m.restaurante_id
   where m.qr_token = p_token
     and r.activo
     for update of m;

  if not found then
    raise exception 'QR_INVALIDO' using errcode = 'P0001';
  end if;

  -- 2) Anti-spam
  if (select count(*) from public.pedidos
       where mesa_id = v_mesa.id
         and origen = 'qr'
         and created_at > now() - c_ventana) >= c_max_pedidos then
    raise exception 'DEMASIADOS_PEDIDOS' using errcode = 'P0001',
      hint = format('Máximo %s pedidos cada %s', c_max_pedidos, c_ventana);
  end if;

  -- 3) Validar forma de los items
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'ITEMS_INVALIDOS' using errcode = 'P0001';
  end if;
  v_n_items := jsonb_array_length(p_items);
  if v_n_items = 0 or v_n_items > c_max_items then
    raise exception 'ITEMS_INVALIDOS' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where case  -- CASE garantiza el orden de evaluación (evita errores de cast)
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

  -- 4) Todos los productos deben ser de ESTE restaurante, estar disponibles
  --    y pertenecer a una categoría activa
  select count(*)
    into v_n_validos
    from jsonb_array_elements(p_items) e
    join public.productos p
      on p.id = (e ->> 'producto_id')::uuid
     and p.restaurante_id = v_mesa.restaurante_id
     and p.disponible
    join public.categorias c on c.id = p.categoria_id and c.activa;

  if v_n_validos <> v_n_items then
    raise exception 'PRODUCTO_NO_DISPONIBLE' using errcode = 'P0001';
  end if;

  -- 5) Stock (solo productos con controla_stock). El descuento real se hace en Fase 4.
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

  -- 6) Sesión de mesa: reutiliza la abierta o abre una nueva
  select id into v_sesion_id
    from public.sesiones_mesa
   where mesa_id = v_mesa.id and cerrada_at is null;

  if v_sesion_id is null then
    insert into public.sesiones_mesa (restaurante_id, mesa_id)
    values (v_mesa.restaurante_id, v_mesa.id)
    returning id into v_sesion_id;
  end if;

  -- La mesa queda ocupada aunque alguien la haya marcado libre a mano
  update public.mesas set estado = 'ocupada' where id = v_mesa.id and estado <> 'ocupada';

  -- 7) Pedido + items. Precio/costo/nombre los completa el trigger desde la base.
  insert into public.pedidos (restaurante_id, mesa_id, sesion_id, origen, notas)
  values (v_mesa.restaurante_id, v_mesa.id, v_sesion_id, 'qr',
          nullif(left(trim(p_notas), 500), ''))
  returning id into v_pedido_id;

  insert into public.pedido_items (pedido_id, producto_id, cantidad, notas,
                                   nombre_snapshot, precio_unitario)
  select v_pedido_id,
         (e ->> 'producto_id')::uuid,
         (e ->> 'cantidad')::integer,
         nullif(left(trim(e ->> 'notas'), 200), ''),
         '', 0   -- placeholders: los pisa el trigger preparar_pedido_item
    from jsonb_array_elements(p_items) e;

  select total into v_total from public.pedidos where id = v_pedido_id;

  return jsonb_build_object('pedido_id', v_pedido_id, 'total', v_total);
end;
$$;

grant execute on function public.obtener_carta(text)                to anon, authenticated;
grant execute on function public.crear_pedido_qr(text, jsonb, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Realtime: el dashboard y la cocina escuchan estos cambios.
-- Realtime aplica RLS al suscriptor, así que cada uno recibe solo lo suyo;
-- además el cliente filtra por restaurante_id.
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.pedidos, public.pedido_items, public.mesas;
