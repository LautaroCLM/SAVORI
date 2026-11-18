-- =============================================================================
-- 0003 · Permisos y Row Level Security
-- =============================================================================
-- Modelo:
--   * anon         → SIN acceso a ninguna tabla. Solo las RPC públicas (0004).
--   * authenticated→ solo filas de su restaurante (mi_restaurante_id()).
--   * Rol de negocio (perfiles.rol):
--       admin  : todo dentro de su restaurante
--       mozo   : lee todo; gestiona pedidos, items y sesiones; cambia estado de mesas
--       cocina : lee todo; solo cambia el estado de los pedidos
--   * Altas de restaurantes y usuarios: solo service_role (script local).
-- Las llamadas a funciones van envueltas en (select ...) para que Postgres las
-- evalúe una sola vez por consulta (initPlan) y no por fila.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Privilegios base
-- -----------------------------------------------------------------------------
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from public, anon;

-- authenticated necesita ejecutar los helpers que usan las políticas
grant execute on function public.mi_restaurante_id() to authenticated;
grant execute on function public.mi_rol()            to authenticated;
grant execute on function public.mi_contexto()       to authenticated;
grant execute on function public.regenerar_qr_mesa(uuid) to authenticated;
-- generar_qr_token se usa como DEFAULT de mesas.qr_token
grant execute on function public.generar_qr_token()  to authenticated;

-- -----------------------------------------------------------------------------
-- Habilitar RLS en todas las tablas
-- -----------------------------------------------------------------------------
alter table public.restaurantes      enable row level security;
alter table public.perfiles          enable row level security;
alter table public.salones           enable row level security;
alter table public.mesas             enable row level security;
alter table public.sesiones_mesa     enable row level security;
alter table public.categorias        enable row level security;
alter table public.productos         enable row level security;
alter table public.pedidos           enable row level security;
alter table public.pedido_items      enable row level security;
alter table public.movimientos_stock enable row level security;

-- -----------------------------------------------------------------------------
-- restaurantes: lectura del propio. Escritura solo service_role.
-- -----------------------------------------------------------------------------
create policy restaurantes_select on public.restaurantes
  for select to authenticated
  using (id = (select public.mi_restaurante_id()));

-- -----------------------------------------------------------------------------
-- perfiles: ver los del equipo; el admin edita a los demás (no a sí mismo,
-- para que no pueda quitarse el rol admin por error). Altas/bajas: script.
-- -----------------------------------------------------------------------------
create policy perfiles_select on public.perfiles
  for select to authenticated
  using (restaurante_id = (select public.mi_restaurante_id()));

create policy perfiles_update_admin on public.perfiles
  for update to authenticated
  using (
    restaurante_id = (select public.mi_restaurante_id())
    and (select public.mi_rol()) = 'admin'
    and id <> (select auth.uid())
  )
  with check (restaurante_id = (select public.mi_restaurante_id()));

-- -----------------------------------------------------------------------------
-- Catálogo (salones, categorias, productos): todos leen, admin escribe
-- -----------------------------------------------------------------------------
create policy salones_select on public.salones
  for select to authenticated using (restaurante_id = (select public.mi_restaurante_id()));
create policy salones_admin_all on public.salones
  for all to authenticated
  using      (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) = 'admin')
  with check (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) = 'admin');

create policy categorias_select on public.categorias
  for select to authenticated using (restaurante_id = (select public.mi_restaurante_id()));
create policy categorias_admin_all on public.categorias
  for all to authenticated
  using      (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) = 'admin')
  with check (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) = 'admin');

create policy productos_select on public.productos
  for select to authenticated using (restaurante_id = (select public.mi_restaurante_id()));
create policy productos_admin_all on public.productos
  for all to authenticated
  using      (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) = 'admin')
  with check (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) = 'admin');

-- -----------------------------------------------------------------------------
-- mesas: todos leen; admin todo; mozo actualiza (el trigger limita a `estado`)
-- -----------------------------------------------------------------------------
create policy mesas_select on public.mesas
  for select to authenticated using (restaurante_id = (select public.mi_restaurante_id()));
create policy mesas_admin_all on public.mesas
  for all to authenticated
  using      (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) = 'admin')
  with check (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) = 'admin');
create policy mesas_update_mozo on public.mesas
  for update to authenticated
  using      (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) = 'mozo')
  with check (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) = 'mozo');

-- -----------------------------------------------------------------------------
-- sesiones_mesa: todos leen; admin y mozo abren/cierran; solo admin borra
-- -----------------------------------------------------------------------------
create policy sesiones_select on public.sesiones_mesa
  for select to authenticated using (restaurante_id = (select public.mi_restaurante_id()));
create policy sesiones_insert on public.sesiones_mesa
  for insert to authenticated
  with check (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) in ('admin', 'mozo'));
create policy sesiones_update on public.sesiones_mesa
  for update to authenticated
  using      (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) in ('admin', 'mozo'))
  with check (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) in ('admin', 'mozo'));
create policy sesiones_delete on public.sesiones_mesa
  for delete to authenticated
  using (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) = 'admin');

-- -----------------------------------------------------------------------------
-- pedidos: todos leen; admin/mozo crean; todos actualizan (cocina solo estado,
-- vía trigger); solo admin borra
-- -----------------------------------------------------------------------------
create policy pedidos_select on public.pedidos
  for select to authenticated using (restaurante_id = (select public.mi_restaurante_id()));
create policy pedidos_insert on public.pedidos
  for insert to authenticated
  with check (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) in ('admin', 'mozo'));
create policy pedidos_update on public.pedidos
  for update to authenticated
  using      (restaurante_id = (select public.mi_restaurante_id()))
  with check (restaurante_id = (select public.mi_restaurante_id()));
create policy pedidos_delete on public.pedidos
  for delete to authenticated
  using (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) = 'admin');

-- -----------------------------------------------------------------------------
-- pedido_items: todos leen; admin/mozo escriben
-- -----------------------------------------------------------------------------
create policy pedido_items_select on public.pedido_items
  for select to authenticated using (restaurante_id = (select public.mi_restaurante_id()));
create policy pedido_items_write on public.pedido_items
  for all to authenticated
  using      (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) in ('admin', 'mozo'))
  with check (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) in ('admin', 'mozo'));

-- -----------------------------------------------------------------------------
-- movimientos_stock: log de auditoría → solo SELECT e INSERT (sin update/delete)
-- -----------------------------------------------------------------------------
create policy movimientos_select on public.movimientos_stock
  for select to authenticated using (restaurante_id = (select public.mi_restaurante_id()));
create policy movimientos_insert_admin on public.movimientos_stock
  for insert to authenticated
  with check (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) = 'admin');
