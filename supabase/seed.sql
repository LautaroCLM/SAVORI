-- =============================================================================
-- Seed de DESARROLLO LOCAL (se ejecuta con `npx supabase db reset`).
-- NO correr en producción: crea usuarios con contraseñas conocidas.
--
-- Usuarios de prueba (contraseña: demo1234):
--   admin@demo.test   → admin
--   mozo@demo.test    → mozo
--   cocina@demo.test  → cocina
-- Carta pública: http://localhost:5173/m/demo-mesa-1-token  (… hasta demo-mesa-6-token)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Usuarios de auth (forma mínima que acepta GoTrue para login con email)
-- -----------------------------------------------------------------------------
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('00000000-0000-4000-a000-000000000001'::uuid, 'admin@demo.test'),
      ('00000000-0000-4000-a000-000000000002'::uuid, 'mozo@demo.test'),
      ('00000000-0000-4000-a000-000000000003'::uuid, 'cocina@demo.test')
    ) as t(id, email)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('demo1234', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(),
      '', '', '', '', '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text,
            jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
            'email', now(), now(), now());
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Restaurante y perfiles
-- -----------------------------------------------------------------------------
insert into public.restaurantes (id, nombre, slug) values
  ('10000000-0000-4000-a000-000000000001', 'Bodegón Demo', 'bodegon-demo');

insert into public.perfiles (id, restaurante_id, nombre, rol) values
  ('00000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'Ana Admin',  'admin'),
  ('00000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', 'Mario Mozo', 'mozo'),
  ('00000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000001', 'Carla Cocina', 'cocina');

-- -----------------------------------------------------------------------------
-- Salón y 6 mesas (tokens fijos solo para facilitar las pruebas locales)
-- -----------------------------------------------------------------------------
insert into public.salones (id, restaurante_id, nombre, orden) values
  ('20000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'Salón principal', 1);

insert into public.mesas (restaurante_id, salon_id, numero, capacidad, x, y, ancho, alto, forma, qr_token) values
  ('10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', 1, 2,  40,  40,  80,  80, 'redonda',     'demo-mesa-1-token'),
  ('10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', 2, 2, 180,  40,  80,  80, 'redonda',     'demo-mesa-2-token'),
  ('10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', 3, 4, 320,  40,  90,  90, 'cuadrada',    'demo-mesa-3-token'),
  ('10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', 4, 4,  40, 200,  90,  90, 'cuadrada',    'demo-mesa-4-token'),
  ('10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', 5, 6, 180, 200, 160,  80, 'rectangular', 'demo-mesa-5-token'),
  ('10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', 6, 8, 380, 200, 200,  90, 'rectangular', 'demo-mesa-6-token');

-- -----------------------------------------------------------------------------
-- Carta
-- -----------------------------------------------------------------------------
insert into public.categorias (id, restaurante_id, nombre, orden) values
  ('30000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'Entradas',     1),
  ('30000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', 'Principales',  2),
  ('30000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000001', 'Postres',      3),
  ('30000000-0000-4000-a000-000000000004', '10000000-0000-4000-a000-000000000001', 'Bebidas',      4);

insert into public.productos (restaurante_id, categoria_id, nombre, descripcion, precio, costo, orden, controla_stock, stock_actual, stock_minimo) values
  ('10000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000001', 'Empanada de carne', 'Cortada a cuchillo, al horno', 2500, 900, 1, false, 0, 0),
  ('10000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000001', 'Provoleta', 'Con orégano y aceite de oliva', 7800, 3100, 2, false, 0, 0),
  ('10000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000002', 'Milanesa napolitana', 'Con papas fritas', 16500, 6800, 1, false, 0, 0),
  ('10000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000002', 'Bife de chorizo', '400 g, con guarnición a elección', 22000, 11000, 2, false, 0, 0),
  ('10000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000002', 'Ravioles de ricota', 'Con salsa fileto o crema', 13900, 4200, 3, false, 0, 0),
  ('10000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000003', 'Flan casero', 'Con dulce de leche y crema', 5500, 1500, 1, false, 0, 0),
  ('10000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000003', 'Panqueque con dulce de leche', null, 6000, 1700, 2, false, 0, 0),
  ('10000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000004', 'Agua sin gas 500 ml', null, 2200, 700, 1, true, 48, 12),
  ('10000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000004', 'Gaseosa línea Coca 500 ml', null, 3000, 1100, 2, true, 36, 12),
  ('10000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000004', 'Copa de Malbec', 'Mendoza', 5200, 1800, 3, false, 0, 0);

-- Solo desarrollo: bucket público que imita a Cloudflare R2 para las fotos de productos.
insert into storage.buckets (id, name, public) values ('imagenes', 'imagenes', true) on conflict (id) do nothing;
