-- =============================================================================
-- 0002 · Funciones auxiliares y triggers
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Contexto del usuario actual.
-- SECURITY DEFINER para poder leer `perfiles` sin disparar su propia RLS
-- (evita recursión). Si el perfil o el restaurante están inactivos devuelven
-- NULL → todas las políticas fallan → la cuenta queda suspendida.
-- -----------------------------------------------------------------------------
create or replace function public.mi_restaurante_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.restaurante_id
  from public.perfiles p
  join public.restaurantes r on r.id = p.restaurante_id
  where p.id = auth.uid() and p.activo and r.activo;
$$;

create or replace function public.mi_rol()
returns public.rol_usuario
language sql
stable
security definer
set search_path = ''
as $$
  select p.rol
  from public.perfiles p
  join public.restaurantes r on r.id = p.restaurante_id
  where p.id = auth.uid() and p.activo and r.activo;
$$;

-- Datos para el frontend al iniciar sesión (incluye el flag `activo`, para poder
-- mostrar "cuenta suspendida" en lugar de una pantalla vacía).
create or replace function public.mi_contexto()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'usuario_id',         p.id,
    'nombre',             p.nombre,
    'rol',                p.rol,
    'perfil_activo',      p.activo,
    'restaurante_id',     r.id,
    'restaurante_nombre', r.nombre,
    'restaurante_activo', r.activo
  )
  from public.perfiles p
  join public.restaurantes r on r.id = p.restaurante_id
  where p.id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.mesas     for each row execute function public.tg_set_updated_at();
create trigger set_updated_at before update on public.productos for each row execute function public.tg_set_updated_at();
create trigger set_updated_at before update on public.pedidos   for each row execute function public.tg_set_updated_at();

-- -----------------------------------------------------------------------------
-- restaurante_id automático en INSERT: el frontend no necesita mandarlo.
-- (Si lo manda, RLS igual verifica que sea el suyo.)
-- -----------------------------------------------------------------------------
create or replace function public.tg_asignar_restaurante()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.restaurante_id is null then
    new.restaurante_id := public.mi_restaurante_id();
  end if;
  return new;
end;
$$;

create trigger asignar_restaurante before insert on public.salones           for each row execute function public.tg_asignar_restaurante();
create trigger asignar_restaurante before insert on public.mesas             for each row execute function public.tg_asignar_restaurante();
create trigger asignar_restaurante before insert on public.sesiones_mesa     for each row execute function public.tg_asignar_restaurante();
create trigger asignar_restaurante before insert on public.categorias        for each row execute function public.tg_asignar_restaurante();
create trigger asignar_restaurante before insert on public.productos         for each row execute function public.tg_asignar_restaurante();
create trigger asignar_restaurante before insert on public.pedidos           for each row execute function public.tg_asignar_restaurante();
create trigger asignar_restaurante before insert on public.movimientos_stock for each row execute function public.tg_asignar_restaurante();

-- -----------------------------------------------------------------------------
-- pedido_items: restaurante_id desde el pedido + snapshot de nombre/precio/costo
-- tomado SIEMPRE de la base (nunca se confía en el precio que manda el cliente).
-- Items sin producto_id (ítem libre) deben traer su propio snapshot.
-- -----------------------------------------------------------------------------
create or replace function public.tg_preparar_pedido_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prod record;
begin
  if tg_op = 'INSERT' then
    select restaurante_id into new.restaurante_id from public.pedidos where id = new.pedido_id;
    if new.restaurante_id is null then
      raise exception 'Pedido inexistente' using errcode = 'P0002';
    end if;
  elsif new.restaurante_id <> old.restaurante_id or new.pedido_id <> old.pedido_id then
    raise exception 'No se puede mover un item a otro pedido' using errcode = '42501';
  end if;

  if new.producto_id is not null
     and (tg_op = 'INSERT' or new.producto_id is distinct from old.producto_id) then
    select nombre, precio, costo into v_prod
    from public.productos
    where id = new.producto_id and restaurante_id = new.restaurante_id;
    if not found then
      raise exception 'Producto inexistente' using errcode = 'P0002';
    end if;
    new.nombre_snapshot := v_prod.nombre;
    new.precio_unitario := v_prod.precio;
    new.costo_unitario  := v_prod.costo;
  elsif tg_op = 'UPDATE' and new.producto_id is not null then
    -- mismo producto: el snapshot no se puede tocar
    new.nombre_snapshot := old.nombre_snapshot;
    new.precio_unitario := old.precio_unitario;
    new.costo_unitario  := old.costo_unitario;
  end if;
  return new;
end;
$$;

create trigger preparar_pedido_item
  before insert or update on public.pedido_items
  for each row execute function public.tg_preparar_pedido_item();

-- Total del pedido = suma de sus items
create or replace function public.tg_recalcular_total_pedido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido_id uuid := coalesce(new.pedido_id, old.pedido_id);
begin
  update public.pedidos p
     set total = coalesce((select sum(i.precio_unitario * i.cantidad)
                           from public.pedido_items i
                           where i.pedido_id = v_pedido_id), 0)
   where p.id = v_pedido_id;
  return null;
end;
$$;

create trigger recalcular_total_pedido
  after insert or update or delete on public.pedido_items
  for each row execute function public.tg_recalcular_total_pedido();

-- -----------------------------------------------------------------------------
-- Restricciones por rol a nivel columna (RLS es por fila; esto completa).
--   * cocina: en pedidos solo puede cambiar `estado`.
--   * mozo/cocina: en mesas solo pueden cambiar `estado`.
-- mi_rol() es NULL para service_role y para las RPC públicas → no aplica.
-- -----------------------------------------------------------------------------
create or replace function public.tg_proteger_pedido()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.mi_rol() = 'cocina'
     and (new.restaurante_id, new.mesa_id, new.sesion_id, new.origen, new.notas, new.total, new.creado_por)
         is distinct from
         (old.restaurante_id, old.mesa_id, old.sesion_id, old.origen, old.notas, old.total, old.creado_por) then
    raise exception 'La cocina solo puede cambiar el estado del pedido' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger proteger_pedido before update on public.pedidos
  for each row execute function public.tg_proteger_pedido();

create or replace function public.tg_proteger_mesa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.mi_rol() in ('mozo', 'cocina')
     and (new.restaurante_id, new.salon_id, new.numero, new.capacidad, new.x, new.y,
          new.ancho, new.alto, new.forma, new.rotacion, new.qr_token)
         is distinct from
         (old.restaurante_id, old.salon_id, old.numero, old.capacidad, old.x, old.y,
          old.ancho, old.alto, old.forma, old.rotacion, old.qr_token) then
    raise exception 'Solo un admin puede modificar la mesa (salvo su estado)' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger proteger_mesa before update on public.mesas
  for each row execute function public.tg_proteger_mesa();

-- -----------------------------------------------------------------------------
-- Sesiones de mesa ↔ estado de la mesa
--   * Abrir sesión  → mesa 'ocupada'
--   * Cerrar sesión → calcula total (pedidos no cancelados) y mesa 'libre'
--   * Una sesión cerrada no se reabre.
-- -----------------------------------------------------------------------------
create or replace function public.tg_sesion_abierta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.mesas set estado = 'ocupada' where id = new.mesa_id and estado <> 'ocupada';
  return null;
end;
$$;

create trigger sesion_abierta after insert on public.sesiones_mesa
  for each row execute function public.tg_sesion_abierta();

create or replace function public.tg_sesion_antes_de_actualizar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.cerrada_at is not null then
    raise exception 'La sesión ya está cerrada' using errcode = '42501';
  end if;
  if new.mesa_id <> old.mesa_id or new.restaurante_id <> old.restaurante_id then
    raise exception 'No se puede cambiar la mesa de una sesión' using errcode = '42501';
  end if;
  if new.cerrada_at is not null then
    new.total := coalesce((select sum(p.total) from public.pedidos p
                           where p.sesion_id = new.id and p.estado <> 'cancelado'), 0);
  end if;
  return new;
end;
$$;

create trigger sesion_antes_de_actualizar before update on public.sesiones_mesa
  for each row execute function public.tg_sesion_antes_de_actualizar();

create or replace function public.tg_sesion_cerrada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.cerrada_at is null and new.cerrada_at is not null then
    update public.mesas set estado = 'libre' where id = new.mesa_id;
  end if;
  return null;
end;
$$;

create trigger sesion_cerrada after update on public.sesiones_mesa
  for each row execute function public.tg_sesion_cerrada();

-- -----------------------------------------------------------------------------
-- Regenerar el QR de una mesa (invalida el QR impreso anterior). Solo admin.
-- -----------------------------------------------------------------------------
create or replace function public.regenerar_qr_mesa(p_mesa_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if public.mi_rol() is distinct from 'admin' then
    raise exception 'Solo un admin puede regenerar el QR' using errcode = '42501';
  end if;
  update public.mesas
     set qr_token = public.generar_qr_token()
   where id = p_mesa_id and restaurante_id = public.mi_restaurante_id()
  returning qr_token into v_token;
  if v_token is null then
    raise exception 'Mesa inexistente' using errcode = 'P0002';
  end if;
  return v_token;
end;
$$;
