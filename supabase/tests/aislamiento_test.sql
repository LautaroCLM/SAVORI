-- =============================================================================
-- Tests de aislamiento multi-tenant y permisos (pgTAP)
-- Correr con:  npx supabase test db
-- Todo corre dentro de una transacción que se revierte al final.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;

select plan(54);

-- -----------------------------------------------------------------------------
-- Fixtures: dos restaurantes (A y B) con un usuario cada uno + roles extra en A
-- -----------------------------------------------------------------------------
insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-0000-4000-a000-000000000001', 'admin-a@test.test',  'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-4000-a000-000000000002', 'mozo-a@test.test',   'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-4000-a000-000000000003', 'cocina-a@test.test', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-4000-a000-000000000001', 'admin-b@test.test',  'authenticated', 'authenticated');

insert into public.restaurantes (id, nombre, slug) values
  ('aaaaaaaa-1111-4000-a000-000000000000', 'Resto A', 'resto-a-test'),
  ('bbbbbbbb-1111-4000-a000-000000000000', 'Resto B', 'resto-b-test');

insert into public.perfiles (id, restaurante_id, nombre, rol) values
  ('aaaaaaaa-0000-4000-a000-000000000001', 'aaaaaaaa-1111-4000-a000-000000000000', 'Admin A',  'admin'),
  ('aaaaaaaa-0000-4000-a000-000000000002', 'aaaaaaaa-1111-4000-a000-000000000000', 'Mozo A',   'mozo'),
  ('aaaaaaaa-0000-4000-a000-000000000003', 'aaaaaaaa-1111-4000-a000-000000000000', 'Cocina A', 'cocina'),
  ('bbbbbbbb-0000-4000-a000-000000000001', 'bbbbbbbb-1111-4000-a000-000000000000', 'Admin B',  'admin');

insert into public.salones (id, restaurante_id, nombre) values
  ('aaaaaaaa-2222-4000-a000-000000000000', 'aaaaaaaa-1111-4000-a000-000000000000', 'Salón A'),
  ('bbbbbbbb-2222-4000-a000-000000000000', 'bbbbbbbb-1111-4000-a000-000000000000', 'Salón B');

insert into public.mesas (id, restaurante_id, salon_id, numero, qr_token) values
  ('aaaaaaaa-3333-4000-a000-000000000000', 'aaaaaaaa-1111-4000-a000-000000000000', 'aaaaaaaa-2222-4000-a000-000000000000', 1, 'test-token-a-mesa-1'),
  ('bbbbbbbb-3333-4000-a000-000000000000', 'bbbbbbbb-1111-4000-a000-000000000000', 'bbbbbbbb-2222-4000-a000-000000000000', 1, 'test-token-b-mesa-1');

insert into public.categorias (id, restaurante_id, nombre) values
  ('aaaaaaaa-4444-4000-a000-000000000000', 'aaaaaaaa-1111-4000-a000-000000000000', 'Cat A'),
  ('bbbbbbbb-4444-4000-a000-000000000000', 'bbbbbbbb-1111-4000-a000-000000000000', 'Cat B');

insert into public.productos (id, restaurante_id, categoria_id, nombre, precio, costo) values
  ('aaaaaaaa-5555-4000-a000-000000000000', 'aaaaaaaa-1111-4000-a000-000000000000', 'aaaaaaaa-4444-4000-a000-000000000000', 'Prod A', 1000, 400),
  ('bbbbbbbb-5555-4000-a000-000000000000', 'bbbbbbbb-1111-4000-a000-000000000000', 'bbbbbbbb-4444-4000-a000-000000000000', 'Prod B', 2000, 900);

insert into public.pedidos (id, restaurante_id, mesa_id, origen) values
  ('aaaaaaaa-6666-4000-a000-000000000000', 'aaaaaaaa-1111-4000-a000-000000000000', 'aaaaaaaa-3333-4000-a000-000000000000', 'mozo'),
  ('bbbbbbbb-6666-4000-a000-000000000000', 'bbbbbbbb-1111-4000-a000-000000000000', 'bbbbbbbb-3333-4000-a000-000000000000', 'mozo');

insert into public.pedido_items (pedido_id, producto_id, cantidad, nombre_snapshot, precio_unitario) values
  ('aaaaaaaa-6666-4000-a000-000000000000', 'aaaaaaaa-5555-4000-a000-000000000000', 2, '', 0),
  ('bbbbbbbb-6666-4000-a000-000000000000', 'bbbbbbbb-5555-4000-a000-000000000000', 1, '', 0);

-- =============================================================================
-- 1) Triggers de integridad (como postgres)
-- =============================================================================
select is((select precio_unitario from public.pedido_items where pedido_id = 'aaaaaaaa-6666-4000-a000-000000000000'),
          1000.00::numeric, 'El snapshot toma el precio de la base, no el enviado');
select is((select total from public.pedidos where id = 'aaaaaaaa-6666-4000-a000-000000000000'),
          2000.00::numeric, 'El total del pedido se recalcula desde los items');

-- =============================================================================
-- 2) Admin del restaurante A
-- =============================================================================
set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-a000-000000000001","role":"authenticated"}';

select results_eq('select id from public.restaurantes',
                  $$ values ('aaaaaaaa-1111-4000-a000-000000000000'::uuid) $$,
                  'A solo ve su restaurante');
select is((select count(*)::int from public.perfiles), 3, 'A solo ve los perfiles de su equipo');
select is_empty($$ select 1 from public.salones      where restaurante_id = 'bbbbbbbb-1111-4000-a000-000000000000' $$, 'A no ve salones de B');
select is_empty($$ select 1 from public.mesas        where restaurante_id = 'bbbbbbbb-1111-4000-a000-000000000000' $$, 'A no ve mesas de B');
select is_empty($$ select 1 from public.categorias   where restaurante_id = 'bbbbbbbb-1111-4000-a000-000000000000' $$, 'A no ve categorías de B');
select is_empty($$ select 1 from public.productos    where restaurante_id = 'bbbbbbbb-1111-4000-a000-000000000000' $$, 'A no ve productos de B');
select is_empty($$ select 1 from public.pedidos      where restaurante_id = 'bbbbbbbb-1111-4000-a000-000000000000' $$, 'A no ve pedidos de B');
select is_empty($$ select 1 from public.pedido_items where restaurante_id = 'bbbbbbbb-1111-4000-a000-000000000000' $$, 'A no ve items de B');
select is((select count(*)::int from public.mesas), 1, 'A ve sus propias mesas');

select lives_ok($$ update public.productos set precio = 1 where id = 'bbbbbbbb-5555-4000-a000-000000000000' $$, 'UPDATE sobre producto de B no falla…');
select lives_ok($$ delete from public.categorias where id = 'bbbbbbbb-4444-4000-a000-000000000000' $$, 'DELETE sobre categoría de B no falla…');

select throws_ok($$ insert into public.categorias (restaurante_id, nombre) values ('bbbbbbbb-1111-4000-a000-000000000000', 'hack') $$,
                 '42501', null, 'A no puede insertar en B');
select throws_ok($$ insert into public.pedido_items (pedido_id, producto_id, cantidad, nombre_snapshot, precio_unitario)
                    values ('bbbbbbbb-6666-4000-a000-000000000000', 'bbbbbbbb-5555-4000-a000-000000000000', 1, '', 0) $$,
                 '42501', null, 'A no puede agregar items a un pedido de B');
select throws_ok($$ insert into public.mesas (salon_id, numero) values ('bbbbbbbb-2222-4000-a000-000000000000', 99) $$,
                 '23503', null, 'A no puede crear una mesa en un salón de B (FK compuesta)');
select lives_ok($$ update public.perfiles set rol = 'mozo' where id = 'aaaaaaaa-0000-4000-a000-000000000001' $$,
                'UPDATE del admin sobre su propio perfil no falla…');
select lives_ok($$ insert into public.categorias (nombre) values ('Nueva A') $$, 'restaurante_id se asigna solo al insertar');
select is((select restaurante_id from public.categorias where nombre = 'Nueva A'),
          'aaaaaaaa-1111-4000-a000-000000000000'::uuid, '…y es el restaurante del usuario');

reset role;
select is((select precio from public.productos where id = 'bbbbbbbb-5555-4000-a000-000000000000'),
          2000.00::numeric, '…pero el producto de B no cambió');
select isnt_empty($$ select 1 from public.categorias where id = 'bbbbbbbb-4444-4000-a000-000000000000' $$,
                  '…y la categoría de B sigue existiendo');
select is((select rol from public.perfiles where id = 'aaaaaaaa-0000-4000-a000-000000000001'), 'admin'::public.rol_usuario,
          '…y el admin no pudo cambiarse su propio rol');

-- =============================================================================
-- 3) Roles dentro de A
-- =============================================================================
set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-a000-000000000002","role":"authenticated"}';  -- mozo

select throws_ok($$ insert into public.productos (categoria_id, nombre, precio) values ('aaaaaaaa-4444-4000-a000-000000000000', 'x', 1) $$,
                 '42501', null, 'El mozo no puede crear productos');
select throws_ok($$ update public.mesas set x = 500 where id = 'aaaaaaaa-3333-4000-a000-000000000000' $$,
                 '42501', null, 'El mozo no puede mover mesas');
select lives_ok($$ update public.mesas set estado = 'ocupada' where id = 'aaaaaaaa-3333-4000-a000-000000000000' $$,
                'El mozo puede cambiar el estado de la mesa');

set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-a000-000000000003","role":"authenticated"}';  -- cocina

select throws_ok($$ update public.pedidos set notas = 'x' where id = 'aaaaaaaa-6666-4000-a000-000000000000' $$,
                 '42501', null, 'La cocina no puede editar notas del pedido');
select lives_ok($$ update public.pedidos set estado = 'en_preparacion' where id = 'aaaaaaaa-6666-4000-a000-000000000000' $$,
                'La cocina puede cambiar el estado del pedido');
select throws_ok($$ insert into public.pedidos (mesa_id, origen) values ('aaaaaaaa-3333-4000-a000-000000000000', 'mozo') $$,
                 '42501', null, 'La cocina no puede crear pedidos');

reset role;
update public.mesas set estado = 'libre' where id = 'aaaaaaaa-3333-4000-a000-000000000000';

-- =============================================================================
-- 4) anon: ninguna tabla accesible directamente
-- =============================================================================
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';

select throws_ok('select * from public.restaurantes',      '42501', null, 'anon no lee restaurantes');
select throws_ok('select * from public.perfiles',          '42501', null, 'anon no lee perfiles');
select throws_ok('select * from public.salones',           '42501', null, 'anon no lee salones');
select throws_ok('select * from public.mesas',             '42501', null, 'anon no lee mesas');
select throws_ok('select * from public.sesiones_mesa',     '42501', null, 'anon no lee sesiones_mesa');
select throws_ok('select * from public.categorias',        '42501', null, 'anon no lee categorias');
select throws_ok('select * from public.productos',         '42501', null, 'anon no lee productos');
select throws_ok('select * from public.pedidos',           '42501', null, 'anon no lee pedidos');
select throws_ok('select * from public.pedido_items',      '42501', null, 'anon no lee pedido_items');
select throws_ok('select * from public.movimientos_stock', '42501', null, 'anon no lee movimientos_stock');
select throws_ok($$ select public.regenerar_qr_mesa('aaaaaaaa-3333-4000-a000-000000000000') $$,
                 '42501', null, 'anon no puede ejecutar funciones internas');

-- =============================================================================
-- 5) RPC públicas
-- =============================================================================
select is(public.obtener_carta('token-que-no-existe'), null, 'Token inválido → carta null');
select is(public.obtener_carta('test-token-a-mesa-1') -> 'restaurante' ->> 'nombre', 'Resto A', 'La carta devuelve el restaurante correcto');
select ok(position('costo' in public.obtener_carta('test-token-a-mesa-1')::text) = 0, 'La carta no expone el costo');

select throws_ok($$ select public.crear_pedido_qr('test-token-a-mesa-1', '[{"producto_id":"bbbbbbbb-5555-4000-a000-000000000000","cantidad":1}]') $$,
                 'P0001', 'PRODUCTO_NO_DISPONIBLE', 'No se puede pedir un producto de otro restaurante');
select throws_ok($$ select public.crear_pedido_qr('test-token-a-mesa-1', '[{"producto_id":"aaaaaaaa-5555-4000-a000-000000000000","cantidad":"mucho"}]') $$,
                 'P0001', 'ITEMS_INVALIDOS', 'Items mal formados se rechazan');
select is((public.crear_pedido_qr('test-token-a-mesa-1',
            '[{"producto_id":"aaaaaaaa-5555-4000-a000-000000000000","cantidad":3,"precio":1}]') ->> 'total')::numeric,
          3000::numeric, 'El pedido QR usa el precio de la base (ignora el del cliente)');

-- Ya hay 1 pedido QR: 4 más llegan al límite (5) y el 6º se rechaza
select lives_ok($$ do $d$ begin for i in 1..4 loop
                     perform public.crear_pedido_qr('test-token-a-mesa-1', '[{"producto_id":"aaaaaaaa-5555-4000-a000-000000000000","cantidad":1}]');
                   end loop; end $d$ $$, 'Se permiten hasta 5 pedidos por mesa en la ventana');
select throws_ok($$ select public.crear_pedido_qr('test-token-a-mesa-1', '[{"producto_id":"aaaaaaaa-5555-4000-a000-000000000000","cantidad":1}]') $$,
                 'P0001', 'DEMASIADOS_PEDIDOS', 'Anti-spam: el 6º pedido se rechaza');

reset role;
select is((select estado from public.mesas where id = 'aaaaaaaa-3333-4000-a000-000000000000'), 'ocupada'::public.estado_mesa,
          'El pedido QR marca la mesa como ocupada');
select is((select count(*)::int from public.sesiones_mesa where mesa_id = 'aaaaaaaa-3333-4000-a000-000000000000' and cerrada_at is null),
          1, 'Todos los pedidos QR comparten una única sesión abierta');

-- Cierre de sesión por el mozo
set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-a000-000000000002","role":"authenticated"}';
select lives_ok($$ update public.sesiones_mesa set cerrada_at = now(), metodo_pago = 'efectivo'
                   where mesa_id = 'aaaaaaaa-3333-4000-a000-000000000000' and cerrada_at is null $$,
                'El mozo puede cerrar la sesión de la mesa');
reset role;
select is((select estado from public.mesas where id = 'aaaaaaaa-3333-4000-a000-000000000000'), 'libre'::public.estado_mesa,
          'Al cerrar la sesión la mesa vuelve a libre');
select is((select total from public.sesiones_mesa where mesa_id = 'aaaaaaaa-3333-4000-a000-000000000000'),
          7000.00::numeric, 'El total de la sesión se calcula con sus pedidos');

-- =============================================================================
-- 6) Restaurante suspendido (activo = false)
-- =============================================================================
update public.restaurantes set activo = false where id = 'bbbbbbbb-1111-4000-a000-000000000000';

set local role authenticated;
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-4000-a000-000000000001","role":"authenticated"}';
select is_empty('select 1 from public.productos', 'Un restaurante suspendido no ve sus datos');

set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select is(public.obtener_carta('test-token-b-mesa-1'), null, 'La carta QR de un restaurante suspendido no responde');

reset role;
select * from finish();
rollback;
