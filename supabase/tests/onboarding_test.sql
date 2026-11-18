-- =============================================================================
-- Tests del onboarding: crear restaurante propio y unirse con código (pgTAP)
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, email, aud, role) values
  ('c1000000-0000-4000-a000-000000000001', 'dueno1@test.test',  'authenticated', 'authenticated'),
  ('c1000000-0000-4000-a000-000000000002', 'dueno2@test.test',  'authenticated', 'authenticated'),
  ('c1000000-0000-4000-a000-000000000003', 'invitado@test.test','authenticated', 'authenticated'),
  ('c1000000-0000-4000-a000-000000000004', 'colado@test.test',  'authenticated', 'authenticated');

-- ---------------------------------------------------------------------------
-- anon no puede usar nada de esto
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select throws_ok($$ select public.crear_mi_restaurante('X resto', 'Pepe') $$, '42501', null, 'anon no puede crear restaurantes');
select throws_ok($$ select public.unirme_con_codigo('AAAA-BBBB', 'Pepe') $$, '42501', null, 'anon no puede canjear códigos');
select throws_ok($$ select * from public.invitaciones $$, '42501', null, 'anon no lee invitaciones');

-- ---------------------------------------------------------------------------
-- Usuario nuevo sin perfil
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"c1000000-0000-4000-a000-000000000001","role":"authenticated"}';

select is(public.mi_contexto(), null, 'Sin perfil, mi_contexto() es null (el frontend muestra el onboarding)');
select throws_ok($$ select public.generar_invitacion('mozo') $$, '42501', null, 'Sin perfil no se pueden generar invitaciones');
select throws_ok($$ select public.crear_mi_restaurante('A', 'Pepe') $$, 'P0001', 'NOMBRE_INVALIDO', 'Nombre de restaurante demasiado corto');
select throws_ok($$ select public.unirme_con_codigo('NOEXISTE', 'Pepe') $$, 'P0001', 'CODIGO_INVALIDO', 'Código inexistente');

select lives_ok($$ select public.crear_mi_restaurante('Café Ñandú Ñam!', 'Pepe Dueño') $$, 'Crea su restaurante');
select is((public.mi_contexto() ->> 'rol'), 'admin', 'Quedó como admin');
select matches((select slug from public.restaurantes), '^cafe-nandu-nam-[0-9a-f]{5}$', 'El slug se arma sin tildes y con sufijo');
select throws_ok($$ select public.crear_mi_restaurante('Otro', 'Pepe') $$, 'P0001', 'YA_TIENE_RESTAURANTE', 'No puede crear un segundo restaurante');
select throws_ok($$ select public.unirme_con_codigo('AAAA-BBBB', 'Pepe') $$, 'P0001', 'YA_TIENE_RESTAURANTE', 'Quien ya tiene perfil no puede unirse a otro');

-- ---------------------------------------------------------------------------
-- El admin genera un código
-- ---------------------------------------------------------------------------
create temp table cod (codigo text);
grant all on cod to authenticated;
insert into cod select public.generar_invitacion('mozo');

select matches((select codigo from cod), '^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$', 'El código tiene formato XXXX-XXXX');
select is((select count(*)::int from public.invitaciones), 1, 'El admin ve sus invitaciones');
select throws_ok($$ update public.invitaciones set rol = 'admin' $$, '42501', null, 'El admin solo puede modificar `revocada` (no el rol)');

-- ---------------------------------------------------------------------------
-- Otro usuario canjea el código
-- ---------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"c1000000-0000-4000-a000-000000000003","role":"authenticated"}';
select is_empty('select 1 from public.invitaciones', 'Un no-admin no ve invitaciones');
select lives_ok($$ select public.unirme_con_codigo(lower((select codigo from cod)), 'Inés Mozo') $$, 'Se une con el código (sin importar mayúsculas)');
select is(public.mi_contexto() ->> 'rol', 'mozo', 'Entra con el rol de la invitación');

-- El código es de un solo uso
set local request.jwt.claims to '{"sub":"c1000000-0000-4000-a000-000000000004","role":"authenticated"}';
select throws_ok($$ select public.unirme_con_codigo((select codigo from cod), 'Colado') $$, 'P0001', 'CODIGO_INVALIDO', 'El código no se puede reutilizar');

-- Revocado y vencido
set local request.jwt.claims to '{"sub":"c1000000-0000-4000-a000-000000000001","role":"authenticated"}';
insert into cod select public.generar_invitacion('cocina');
update public.invitaciones set revocada = true where codigo = (select codigo from cod offset 1 limit 1);
reset role;
insert into public.invitaciones (restaurante_id, codigo, rol, expira_at)
select restaurante_id, 'VENC-IDO2', 'mozo', now() - interval '1 minute' from public.invitaciones limit 1;

set local role authenticated;
set local request.jwt.claims to '{"sub":"c1000000-0000-4000-a000-000000000004","role":"authenticated"}';
select throws_ok($$ select public.unirme_con_codigo((select codigo from cod offset 1 limit 1), 'Colado') $$, 'P0001', 'CODIGO_INVALIDO', 'Un código revocado no sirve');
select throws_ok($$ select public.unirme_con_codigo('VENC-IDO2', 'Colado') $$, 'P0001', 'CODIGO_INVALIDO', 'Un código vencido no sirve');

-- Restaurante suspendido
reset role;
update public.restaurantes set activo = false;
insert into public.invitaciones (restaurante_id, codigo, rol)
select id, 'SUSP-ENDI', 'mozo' from public.restaurantes limit 1;
set local role authenticated;
set local request.jwt.claims to '{"sub":"c1000000-0000-4000-a000-000000000004","role":"authenticated"}';
select throws_ok($$ select public.unirme_con_codigo('SUSP-ENDI', 'Colado') $$, 'P0001', 'CODIGO_INVALIDO', 'No se puede entrar a un restaurante suspendido');

reset role;
select * from finish();
rollback;
