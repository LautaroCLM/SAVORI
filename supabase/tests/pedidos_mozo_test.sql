-- =============================================================================
-- Tests de crear_pedido_mozo y permisos de estado de pedidos (pgTAP)
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, email, aud, role) values
  ('d1000000-0000-4000-a000-000000000001', 'admin-x@test.test',  'authenticated', 'authenticated'),
  ('d1000000-0000-4000-a000-000000000002', 'mozo-x@test.test',   'authenticated', 'authenticated'),
  ('d1000000-0000-4000-a000-000000000003', 'cocina-x@test.test', 'authenticated', 'authenticated'),
  ('d2000000-0000-4000-a000-000000000001', 'admin-y@test.test',  'authenticated', 'authenticated');
insert into public.restaurantes (id, nombre, slug) values
  ('d1111111-1111-4000-a000-000000000000', 'Resto X', 'resto-x-test'),
  ('d2222222-2222-4000-a000-000000000000', 'Resto Y', 'resto-y-test');
insert into public.perfiles (id, restaurante_id, nombre, rol) values
  ('d1000000-0000-4000-a000-000000000001', 'd1111111-1111-4000-a000-000000000000', 'Admin X',  'admin'),
  ('d1000000-0000-4000-a000-000000000002', 'd1111111-1111-4000-a000-000000000000', 'Mozo X',   'mozo'),
  ('d1000000-0000-4000-a000-000000000003', 'd1111111-1111-4000-a000-000000000000', 'Cocina X', 'cocina'),
  ('d2000000-0000-4000-a000-000000000001', 'd2222222-2222-4000-a000-000000000000', 'Admin Y',  'admin');
insert into public.salones (id, restaurante_id, nombre) values
  ('d1aaaaaa-0000-4000-a000-000000000000', 'd1111111-1111-4000-a000-000000000000', 'Salón X'),
  ('d2aaaaaa-0000-4000-a000-000000000000', 'd2222222-2222-4000-a000-000000000000', 'Salón Y');
insert into public.mesas (id, restaurante_id, salon_id, numero) values
  ('d1bbbbbb-0000-4000-a000-000000000000', 'd1111111-1111-4000-a000-000000000000', 'd1aaaaaa-0000-4000-a000-000000000000', 1),
  ('d2bbbbbb-0000-4000-a000-000000000000', 'd2222222-2222-4000-a000-000000000000', 'd2aaaaaa-0000-4000-a000-000000000000', 1);
insert into public.categorias (id, restaurante_id, nombre, activa) values
  ('d1cccccc-0000-4000-a000-000000000000', 'd1111111-1111-4000-a000-000000000000', 'Cat X', false),
  ('d2cccccc-0000-4000-a000-000000000000', 'd2222222-2222-4000-a000-000000000000', 'Cat Y', true);
insert into public.productos (id, restaurante_id, categoria_id, nombre, precio, costo, disponible) values
  ('d1dddddd-0000-4000-a000-000000000001', 'd1111111-1111-4000-a000-000000000000', 'd1cccccc-0000-4000-a000-000000000000', 'Prod X', 1500, 600, true),
  ('d1dddddd-0000-4000-a000-000000000002', 'd1111111-1111-4000-a000-000000000000', 'd1cccccc-0000-4000-a000-000000000000', 'Agotado X', 900, 300, false),
  ('d2dddddd-0000-4000-a000-000000000001', 'd2222222-2222-4000-a000-000000000000', 'd2cccccc-0000-4000-a000-000000000000', 'Prod Y', 2000, 800, true);

-- anon
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select throws_ok($$ select public.crear_pedido_mozo('d1bbbbbb-0000-4000-a000-000000000000', '[]') $$, '42501', null, 'anon no puede usar crear_pedido_mozo');

-- cocina: no crea pedidos
set local role authenticated;
set local request.jwt.claims to '{"sub":"d1000000-0000-4000-a000-000000000003","role":"authenticated"}';
select throws_ok($$ select public.crear_pedido_mozo('d1bbbbbb-0000-4000-a000-000000000000', '[{"producto_id":"d1dddddd-0000-4000-a000-000000000001","cantidad":1}]') $$,
                 '42501', 'NO_AUTORIZADO', 'La cocina no puede crear pedidos');

-- mozo
set local request.jwt.claims to '{"sub":"d1000000-0000-4000-a000-000000000002","role":"authenticated"}';
select throws_ok($$ select public.crear_pedido_mozo('d2bbbbbb-0000-4000-a000-000000000000', '[{"producto_id":"d1dddddd-0000-4000-a000-000000000001","cantidad":1}]') $$,
                 'P0001', 'MESA_INVALIDA', 'No se puede cargar un pedido en la mesa de otro restaurante');
select throws_ok($$ select public.crear_pedido_mozo('d1bbbbbb-0000-4000-a000-000000000000', '[{"producto_id":"d2dddddd-0000-4000-a000-000000000001","cantidad":1}]') $$,
                 'P0001', 'PRODUCTO_NO_DISPONIBLE', 'No se puede pedir un producto de otro restaurante');
select throws_ok($$ select public.crear_pedido_mozo('d1bbbbbb-0000-4000-a000-000000000000', '[{"producto_id":"d1dddddd-0000-4000-a000-000000000002","cantidad":1}]') $$,
                 'P0001', 'PRODUCTO_NO_DISPONIBLE', 'No se puede pedir un producto no disponible');
select throws_ok($$ select public.crear_pedido_mozo('d1bbbbbb-0000-4000-a000-000000000000', '[{"producto_id":"d1dddddd-0000-4000-a000-000000000001","cantidad":0}]') $$,
                 'P0001', 'ITEMS_INVALIDOS', 'Cantidad inválida');
select throws_ok($$ select public.crear_pedido_mozo('d1bbbbbb-0000-4000-a000-000000000000', '[]') $$,
                 'P0001', 'ITEMS_INVALIDOS', 'Pedido vacío');

select is((public.crear_pedido_mozo('d1bbbbbb-0000-4000-a000-000000000000',
            '[{"producto_id":"d1dddddd-0000-4000-a000-000000000001","cantidad":2,"precio":1}]', 'sin sal') ->> 'total')::numeric,
          3000::numeric, 'El pedido del mozo usa el precio de la base (categoría oculta permitida)');
select is((select origen::text from public.pedidos where mesa_id = 'd1bbbbbb-0000-4000-a000-000000000000'), 'mozo', 'El origen es "mozo"');
select is((select estado::text from public.mesas where id = 'd1bbbbbb-0000-4000-a000-000000000000'), 'ocupada', 'La mesa quedó ocupada');
select is((select count(*)::int from public.sesiones_mesa where mesa_id = 'd1bbbbbb-0000-4000-a000-000000000000' and cerrada_at is null), 1, 'Se abrió una sesión');

select lives_ok($$ select public.crear_pedido_mozo('d1bbbbbb-0000-4000-a000-000000000000', '[{"producto_id":"d1dddddd-0000-4000-a000-000000000001","cantidad":1}]') $$, 'Segundo pedido en la misma mesa');
select is((select count(distinct sesion_id)::int from public.pedidos where mesa_id = 'd1bbbbbb-0000-4000-a000-000000000000'), 1, 'Ambos pedidos comparten la sesión');

-- idempotencia: reintentar con el mismo id no duplica el pedido (cola offline)
select is((public.crear_pedido_mozo('d1bbbbbb-0000-4000-a000-000000000000', '[{"producto_id":"d1dddddd-0000-4000-a000-000000000001","cantidad":1}]', null, 'd1eeeeee-0000-4000-a000-000000000001') ->> 'repetido')::boolean, false, 'Primer envío con id propio');
select is((public.crear_pedido_mozo('d1bbbbbb-0000-4000-a000-000000000000', '[{"producto_id":"d1dddddd-0000-4000-a000-000000000001","cantidad":1}]', null, 'd1eeeeee-0000-4000-a000-000000000001') ->> 'repetido')::boolean, true, 'El reintento devuelve el mismo pedido');
select is((select count(*)::int from public.pedidos where id = 'd1eeeeee-0000-4000-a000-000000000001'), 1, 'No se duplicó el pedido');
select is((select count(*)::int from public.pedido_items where pedido_id = 'd1eeeeee-0000-4000-a000-000000000001'), 1, 'Ni sus items');
select is((select total from public.pedidos where id = 'd1eeeeee-0000-4000-a000-000000000001'), 1500::numeric, 'El reintento no suma de más a la cuenta');
update public.pedidos set estado = 'cancelado' where id = 'd1eeeeee-0000-4000-a000-000000000001';

-- el total de la cuenta abierta se actualiza en vivo
select is((select total from public.sesiones_mesa where mesa_id = 'd1bbbbbb-0000-4000-a000-000000000000' and cerrada_at is null), 4500::numeric, 'El total de la sesión abierta se mantiene al día');

-- cocina avanza el estado
set local request.jwt.claims to '{"sub":"d1000000-0000-4000-a000-000000000003","role":"authenticated"}';
select lives_ok($$ update public.pedidos set estado = 'en_preparacion' where mesa_id = 'd1bbbbbb-0000-4000-a000-000000000000' and estado <> 'cancelado' $$, 'La cocina cambia el estado');

-- cancelar un pedido lo descuenta de la cuenta abierta
set local role authenticated;
set local request.jwt.claims to '{"sub":"d1000000-0000-4000-a000-000000000002","role":"authenticated"}';
select lives_ok($$ update public.pedidos set estado = 'cancelado' where mesa_id = 'd1bbbbbb-0000-4000-a000-000000000000' and total = 3000 $$, 'El mozo cancela un pedido');
select is((select total from public.sesiones_mesa where mesa_id = 'd1bbbbbb-0000-4000-a000-000000000000' and cerrada_at is null), 1500::numeric, 'La cuenta descuenta el pedido cancelado');

-- cerrar la cuenta
set local request.jwt.claims to '{"sub":"d1000000-0000-4000-a000-000000000002","role":"authenticated"}';
update public.sesiones_mesa set cerrada_at = now(), metodo_pago = 'efectivo' where mesa_id = 'd1bbbbbb-0000-4000-a000-000000000000' and cerrada_at is null;
reset role;
select is((select total from public.sesiones_mesa where mesa_id = 'd1bbbbbb-0000-4000-a000-000000000000'), 1500::numeric, 'Total de la sesión = suma de sus pedidos vigentes');
select is((select estado::text from public.mesas where id = 'd1bbbbbb-0000-4000-a000-000000000000'), 'libre', 'Al cerrar la cuenta la mesa queda libre');

select * from finish();
rollback;
