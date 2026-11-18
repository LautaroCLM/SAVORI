-- =============================================================================
-- Tests de stock automático, movimientos y ganancias (pgTAP)
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

insert into auth.users (id, email, aud, role) values
  ('e1000000-0000-4000-a000-000000000001', 'admin-s@test.test', 'authenticated', 'authenticated'),
  ('e1000000-0000-4000-a000-000000000002', 'mozo-s@test.test',  'authenticated', 'authenticated'),
  ('e2000000-0000-4000-a000-000000000001', 'admin-t@test.test', 'authenticated', 'authenticated');
insert into public.restaurantes (id, nombre, slug) values
  ('e1111111-1111-4000-a000-000000000000', 'Resto S', 'resto-s-test'),
  ('e2222222-2222-4000-a000-000000000000', 'Resto T', 'resto-t-test');
insert into public.perfiles (id, restaurante_id, nombre, rol) values
  ('e1000000-0000-4000-a000-000000000001', 'e1111111-1111-4000-a000-000000000000', 'Admin S', 'admin'),
  ('e1000000-0000-4000-a000-000000000002', 'e1111111-1111-4000-a000-000000000000', 'Mozo S',  'mozo'),
  ('e2000000-0000-4000-a000-000000000001', 'e2222222-2222-4000-a000-000000000000', 'Admin T', 'admin');
insert into public.salones (id, restaurante_id, nombre) values
  ('e1aaaaaa-0000-4000-a000-000000000000', 'e1111111-1111-4000-a000-000000000000', 'Salón S'),
  ('e2aaaaaa-0000-4000-a000-000000000000', 'e2222222-2222-4000-a000-000000000000', 'Salón T');
insert into public.mesas (id, restaurante_id, salon_id, numero) values
  ('e1bbbbbb-0000-4000-a000-000000000000', 'e1111111-1111-4000-a000-000000000000', 'e1aaaaaa-0000-4000-a000-000000000000', 1),
  ('e2bbbbbb-0000-4000-a000-000000000000', 'e2222222-2222-4000-a000-000000000000', 'e2aaaaaa-0000-4000-a000-000000000000', 1);
insert into public.categorias (id, restaurante_id, nombre) values
  ('e1cccccc-0000-4000-a000-000000000000', 'e1111111-1111-4000-a000-000000000000', 'Cat S'),
  ('e2cccccc-0000-4000-a000-000000000000', 'e2222222-2222-4000-a000-000000000000', 'Cat T');
-- A: con control de stock (10 u, mínimo 3) · B: sin control · C: del otro restaurante
insert into public.productos (id, restaurante_id, categoria_id, nombre, precio, costo, controla_stock, stock_actual, stock_minimo) values
  ('e1dddddd-0000-4000-a000-00000000000a', 'e1111111-1111-4000-a000-000000000000', 'e1cccccc-0000-4000-a000-000000000000', 'Con stock', 1500, 600, true, 10, 3),
  ('e1dddddd-0000-4000-a000-00000000000b', 'e1111111-1111-4000-a000-000000000000', 'e1cccccc-0000-4000-a000-000000000000', 'Sin control', 800, 200, false, 0, 0),
  ('e2dddddd-0000-4000-a000-00000000000c', 'e2222222-2222-4000-a000-000000000000', 'e2cccccc-0000-4000-a000-000000000000', 'Otro resto', 2000, 900, true, 5, 1);

-- ----------------------------------------------------------------------------- anon
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select throws_ok($$ select public.registrar_movimiento_stock('e1dddddd-0000-4000-a000-00000000000a', 'entrada', 1) $$, '42501', null, 'anon no registra movimientos');
select throws_ok($$ select * from public.resumen_ganancias(current_date, current_date) $$, '42501', null, 'anon no ve ganancias');

-- ----------------------------------------------------------------------------- mozo
set local role authenticated;
set local request.jwt.claims to '{"sub":"e1000000-0000-4000-a000-000000000002","role":"authenticated"}';
select throws_ok($$ select public.registrar_movimiento_stock('e1dddddd-0000-4000-a000-00000000000a', 'entrada', 1) $$, '42501', 'NO_AUTORIZADO', 'El mozo no registra movimientos');
select throws_ok($$ select * from public.resumen_ganancias(current_date, current_date) $$, '42501', 'NO_AUTORIZADO', 'El mozo no ve ganancias');

-- Pedido de 4 unidades del producto con stock + 1 del que no controla
select lives_ok($$ select public.crear_pedido_mozo('e1bbbbbb-0000-4000-a000-000000000000',
   '[{"producto_id":"e1dddddd-0000-4000-a000-00000000000a","cantidad":4},{"producto_id":"e1dddddd-0000-4000-a000-00000000000b","cantidad":1}]') $$, 'El mozo carga un pedido');
select is((select stock_actual from public.productos where id = 'e1dddddd-0000-4000-a000-00000000000a'), 6::numeric, 'El pedido descuenta el stock (10 → 6)');
select is((select cantidad from public.movimientos_stock where producto_id = 'e1dddddd-0000-4000-a000-00000000000a' and tipo = 'venta'), -4::numeric, 'Queda un movimiento de venta de −4');
select is((select count(*)::int from public.movimientos_stock where producto_id = 'e1dddddd-0000-4000-a000-00000000000b'), 0, 'El producto sin control no genera movimientos');
select throws_ok($$ select public.crear_pedido_mozo('e1bbbbbb-0000-4000-a000-000000000000', '[{"producto_id":"e1dddddd-0000-4000-a000-00000000000a","cantidad":7}]') $$,
                 'P0001', 'SIN_STOCK', 'No se puede pedir más de lo que hay');
select is((select stock_actual from public.productos where id = 'e1dddddd-0000-4000-a000-00000000000a'), 6::numeric, 'El pedido rechazado no tocó el stock');

-- Cancelar devuelve el stock (una sola vez) y es estado final
select lives_ok($$ update public.pedidos set estado = 'cancelado' where mesa_id = 'e1bbbbbb-0000-4000-a000-000000000000' $$, 'El mozo cancela el pedido');
select is((select stock_actual from public.productos where id = 'e1dddddd-0000-4000-a000-00000000000a'), 10::numeric, 'Cancelar devuelve el stock (6 → 10)');
select is((select count(*)::int from public.movimientos_stock where producto_id = 'e1dddddd-0000-4000-a000-00000000000a' and motivo = 'Pedido cancelado'), 1, 'La devolución queda registrada');
select lives_ok($$ update public.pedidos set estado = 'cancelado' where mesa_id = 'e1bbbbbb-0000-4000-a000-000000000000' $$, 'Cancelar de nuevo no falla…');
select is((select stock_actual from public.productos where id = 'e1dddddd-0000-4000-a000-00000000000a'), 10::numeric, '…ni devuelve el stock dos veces');
select throws_ok($$ update public.pedidos set estado = 'pendiente' where mesa_id = 'e1bbbbbb-0000-4000-a000-000000000000' $$, 'P0001', 'PEDIDO_CANCELADO', 'Un pedido cancelado no se reabre');

-- Pedidos para las ganancias: 1 entregado (2 u), 1 pendiente, y el cancelado de antes
select public.crear_pedido_mozo('e1bbbbbb-0000-4000-a000-000000000000', '[{"producto_id":"e1dddddd-0000-4000-a000-00000000000a","cantidad":2}]');
select public.crear_pedido_mozo('e1bbbbbb-0000-4000-a000-000000000000', '[{"producto_id":"e1dddddd-0000-4000-a000-00000000000b","cantidad":3}]');
update public.pedidos set estado = 'entregado'
 where id = (select p.id from public.pedidos p join public.pedido_items i on i.pedido_id = p.id
              where i.producto_id = 'e1dddddd-0000-4000-a000-00000000000a' and p.estado = 'pendiente');

-- ----------------------------------------------------------------------------- admin
set local request.jwt.claims to '{"sub":"e1000000-0000-4000-a000-000000000001","role":"authenticated"}';

select is(public.registrar_movimiento_stock('e1dddddd-0000-4000-a000-00000000000a', 'entrada', 5, 'Compra'), 13::numeric, 'Entrada de 5 (8 + 5 = 13)');
select is(public.registrar_movimiento_stock('e1dddddd-0000-4000-a000-00000000000a', 'ajuste', 10, 'Conteo'), 10::numeric, 'Ajuste al conteo físico (13 → 10)');
select is((select cantidad from public.movimientos_stock where motivo = 'Conteo'), -3::numeric, 'El ajuste registra la diferencia (−3)');
select is(public.registrar_movimiento_stock('e1dddddd-0000-4000-a000-00000000000a', 'ajuste', 10), 10::numeric, 'Un ajuste igual al stock no registra nada');
select throws_ok($$ select public.registrar_movimiento_stock('e1dddddd-0000-4000-a000-00000000000a', 'salida', 50) $$, 'P0001', 'STOCK_NEGATIVO', 'No se puede sacar más de lo que hay');
select throws_ok($$ select public.registrar_movimiento_stock('e1dddddd-0000-4000-a000-00000000000a', 'venta', 1) $$, 'P0001', 'TIPO_INVALIDO', 'El tipo "venta" es solo automático');
select throws_ok($$ select public.registrar_movimiento_stock('e1dddddd-0000-4000-a000-00000000000a', 'entrada', 0) $$, 'P0001', 'CANTIDAD_INVALIDA', 'Cantidad cero en una entrada');
select throws_ok($$ select public.registrar_movimiento_stock('e2dddddd-0000-4000-a000-00000000000c', 'entrada', 1) $$, 'P0001', 'PRODUCTO_INVALIDO', 'No se toca el stock de otro restaurante');
select throws_ok($$ select public.registrar_movimiento_stock('e1dddddd-0000-4000-a000-00000000000b', 'entrada', 1) $$, 'P0001', 'PRODUCTO_INVALIDO', 'No se registra stock de un producto sin control');
select throws_ok($$ update public.productos set stock_actual = -1 where id = 'e1dddddd-0000-4000-a000-00000000000a' $$, '23514', null, 'El stock nunca puede ser negativo');

-- ----------------------------------------------------------------------------- ganancias
select is((select pedidos from public.resumen_ganancias((now() at time zone 'America/Argentina/Buenos_Aires')::date, (now() at time zone 'America/Argentina/Buenos_Aires')::date)), 1::bigint,
          'Solo cuenta los pedidos ENTREGADOS (no pendientes ni cancelados)');
select is((select ganancia from public.resumen_ganancias((now() at time zone 'America/Argentina/Buenos_Aires')::date, (now() at time zone 'America/Argentina/Buenos_Aires')::date)), 1800::numeric,
          'Ganancia = (1500 − 600) × 2');
update public.productos set precio = 9999, costo = 1 where id = 'e1dddddd-0000-4000-a000-00000000000a';
select is((select ingresos from public.resumen_ganancias((now() at time zone 'America/Argentina/Buenos_Aires')::date, (now() at time zone 'America/Argentina/Buenos_Aires')::date, 'mes')), 3000::numeric,
          'Editar el producto no cambia las ganancias históricas');
select is((select unidades from public.productos_mas_vendidos((now() at time zone 'America/Argentina/Buenos_Aires')::date, (now() at time zone 'America/Argentina/Buenos_Aires')::date) where nombre = 'Con stock'), 2::bigint,
          'Productos más vendidos');
select throws_ok($$ select * from public.resumen_ganancias(current_date, current_date, 'siglo') $$, 'P0001', 'AGRUPACION_INVALIDA', 'Agrupación inválida');

-- Otro restaurante: no ve nada de S
set local request.jwt.claims to '{"sub":"e2000000-0000-4000-a000-000000000001","role":"authenticated"}';
select is_empty($$ select * from public.resumen_ganancias(current_date - 1, current_date + 1) $$, 'Otro restaurante no ve las ganancias de S');

select * from finish();
rollback;
