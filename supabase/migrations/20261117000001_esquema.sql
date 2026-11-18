-- =============================================================================
-- 0001 · Esquema base: extensiones, enums, tablas e índices
-- =============================================================================
-- Convenciones:
--   * Toda tabla de negocio lleva restaurante_id (multi-tenant).
--   * Cada tabla "padre" expone UNIQUE (restaurante_id, id) para que las FKs
--     de las tablas hijas sean compuestas: así es IMPOSIBLE que una fila de un
--     restaurante apunte a una fila de otro (RLS filtra lecturas, pero no
--     impide por sí solo referencias cruzadas).
--   * Montos en numeric(12,2). Cantidades de stock en numeric(12,3) (permite kg/l).
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.rol_usuario           as enum ('admin', 'mozo', 'cocina');
create type public.forma_mesa            as enum ('cuadrada', 'redonda', 'rectangular');
create type public.estado_mesa           as enum ('libre', 'ocupada');
create type public.origen_pedido         as enum ('qr', 'mozo');
create type public.estado_pedido         as enum ('pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado');
create type public.tipo_movimiento_stock as enum ('entrada', 'salida', 'ajuste', 'venta');
create type public.metodo_pago           as enum ('efectivo', 'debito', 'credito', 'transferencia', 'mercadopago', 'otro');

-- -----------------------------------------------------------------------------
-- Token aleatorio para los QR (16 bytes → 22 caracteres base64url)
-- -----------------------------------------------------------------------------
create or replace function public.generar_qr_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/=', '-_');
$$;

-- -----------------------------------------------------------------------------
-- restaurantes
-- -----------------------------------------------------------------------------
create table public.restaurantes (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (length(trim(nombre)) > 0),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- perfiles (1:1 con auth.users)
-- -----------------------------------------------------------------------------
create table public.perfiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  restaurante_id  uuid not null references public.restaurantes (id) on delete cascade,
  nombre          text not null check (length(trim(nombre)) > 0),
  rol             public.rol_usuario not null,
  activo          boolean not null default true,
  created_at      timestamptz not null default now()
);
create index perfiles_restaurante_idx on public.perfiles (restaurante_id);

-- -----------------------------------------------------------------------------
-- salones
-- -----------------------------------------------------------------------------
create table public.salones (
  id              uuid primary key default gen_random_uuid(),
  restaurante_id  uuid not null references public.restaurantes (id) on delete cascade,
  nombre          text not null check (length(trim(nombre)) > 0),
  orden           integer not null default 0,
  created_at      timestamptz not null default now(),
  unique (restaurante_id, id)
);

-- -----------------------------------------------------------------------------
-- mesas
-- -----------------------------------------------------------------------------
create table public.mesas (
  id              uuid primary key default gen_random_uuid(),
  restaurante_id  uuid not null references public.restaurantes (id) on delete cascade,
  salon_id        uuid not null,
  numero          integer not null check (numero > 0),
  capacidad       integer not null default 4 check (capacidad > 0),
  x               numeric(8,2) not null default 0,
  y               numeric(8,2) not null default 0,
  ancho           numeric(8,2) not null default 80 check (ancho > 0),
  alto            numeric(8,2) not null default 80 check (alto > 0),
  forma           public.forma_mesa  not null default 'cuadrada',
  rotacion        numeric(6,2) not null default 0,
  estado          public.estado_mesa not null default 'libre',
  qr_token        text not null unique default public.generar_qr_token() check (length(qr_token) >= 16),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (restaurante_id, id),
  unique (restaurante_id, numero),
  foreign key (restaurante_id, salon_id) references public.salones (restaurante_id, id) on delete cascade
);
create index mesas_salon_idx on public.mesas (restaurante_id, salon_id);

-- -----------------------------------------------------------------------------
-- sesiones_mesa (una "cuenta" abierta por mesa)
-- -----------------------------------------------------------------------------
create table public.sesiones_mesa (
  id              uuid primary key default gen_random_uuid(),
  restaurante_id  uuid not null references public.restaurantes (id) on delete cascade,
  mesa_id         uuid not null,
  abierta_at      timestamptz not null default now(),
  cerrada_at      timestamptz,
  total           numeric(12,2) not null default 0 check (total >= 0),
  metodo_pago     public.metodo_pago,
  abierta_por     uuid default auth.uid() references auth.users (id) on delete set null,
  unique (restaurante_id, id),
  foreign key (restaurante_id, mesa_id) references public.mesas (restaurante_id, id) on delete cascade,
  check (cerrada_at is null or cerrada_at >= abierta_at)
);
-- Solo una sesión abierta por mesa
create unique index sesiones_mesa_una_abierta_idx on public.sesiones_mesa (mesa_id) where cerrada_at is null;
create index sesiones_mesa_restaurante_idx on public.sesiones_mesa (restaurante_id, abierta_at desc);

-- -----------------------------------------------------------------------------
-- categorias
-- -----------------------------------------------------------------------------
create table public.categorias (
  id              uuid primary key default gen_random_uuid(),
  restaurante_id  uuid not null references public.restaurantes (id) on delete cascade,
  nombre          text not null check (length(trim(nombre)) > 0),
  orden           integer not null default 0,
  activa          boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (restaurante_id, id)
);

-- -----------------------------------------------------------------------------
-- productos
-- -----------------------------------------------------------------------------
create table public.productos (
  id              uuid primary key default gen_random_uuid(),
  restaurante_id  uuid not null references public.restaurantes (id) on delete cascade,
  categoria_id    uuid not null,
  nombre          text not null check (length(trim(nombre)) > 0),
  descripcion     text,
  precio          numeric(12,2) not null check (precio >= 0),
  costo           numeric(12,2) not null default 0 check (costo >= 0),
  imagen_url      text,
  disponible      boolean not null default true,
  controla_stock  boolean not null default false,
  stock_actual    numeric(12,3) not null default 0,
  stock_minimo    numeric(12,3) not null default 0 check (stock_minimo >= 0),
  orden           integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (restaurante_id, id),
  -- restrict: no se puede borrar una categoría que todavía tiene productos
  foreign key (restaurante_id, categoria_id) references public.categorias (restaurante_id, id) on delete restrict
);
create index productos_categoria_idx on public.productos (restaurante_id, categoria_id);

-- -----------------------------------------------------------------------------
-- pedidos
-- -----------------------------------------------------------------------------
create table public.pedidos (
  id              uuid primary key default gen_random_uuid(),
  restaurante_id  uuid not null references public.restaurantes (id) on delete cascade,
  mesa_id         uuid not null,
  sesion_id       uuid,
  origen          public.origen_pedido not null,
  estado          public.estado_pedido not null default 'pendiente',
  total           numeric(12,2) not null default 0 check (total >= 0),
  notas           text check (notas is null or length(notas) <= 500),
  creado_por      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (restaurante_id, id),
  foreign key (restaurante_id, mesa_id)   references public.mesas (restaurante_id, id) on delete restrict,
  foreign key (restaurante_id, sesion_id) references public.sesiones_mesa (restaurante_id, id) on delete restrict
);
create index pedidos_restaurante_fecha_idx  on public.pedidos (restaurante_id, created_at desc);
create index pedidos_restaurante_estado_idx on public.pedidos (restaurante_id, estado);
create index pedidos_mesa_fecha_idx         on public.pedidos (mesa_id, created_at desc);
create index pedidos_sesion_idx             on public.pedidos (sesion_id);

-- -----------------------------------------------------------------------------
-- pedido_items (con snapshot de nombre/precio/costo)
-- -----------------------------------------------------------------------------
create table public.pedido_items (
  id               uuid primary key default gen_random_uuid(),
  restaurante_id   uuid not null references public.restaurantes (id) on delete cascade,
  pedido_id        uuid not null,
  producto_id      uuid,
  nombre_snapshot  text not null,
  precio_unitario  numeric(12,2) not null check (precio_unitario >= 0),
  costo_unitario   numeric(12,2) not null default 0 check (costo_unitario >= 0),
  cantidad         integer not null check (cantidad > 0),
  notas            text check (notas is null or length(notas) <= 200),
  created_at       timestamptz not null default now(),
  foreign key (restaurante_id, pedido_id) references public.pedidos (restaurante_id, id) on delete cascade,
  -- si se borra el producto, el item histórico queda (con su snapshot)
  foreign key (restaurante_id, producto_id) references public.productos (restaurante_id, id) on delete set null (producto_id)
);
create index pedido_items_pedido_idx   on public.pedido_items (pedido_id);
create index pedido_items_producto_idx on public.pedido_items (restaurante_id, producto_id);

-- -----------------------------------------------------------------------------
-- movimientos_stock (log de auditoría; cantidad CON SIGNO: + suma, − resta)
-- -----------------------------------------------------------------------------
create table public.movimientos_stock (
  id              uuid primary key default gen_random_uuid(),
  restaurante_id  uuid not null references public.restaurantes (id) on delete cascade,
  producto_id     uuid not null,
  tipo            public.tipo_movimiento_stock not null,
  cantidad        numeric(12,3) not null check (cantidad <> 0),
  motivo          text,
  pedido_id       uuid,
  usuario_id      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  foreign key (restaurante_id, producto_id) references public.productos (restaurante_id, id) on delete cascade,
  foreign key (restaurante_id, pedido_id)   references public.pedidos (restaurante_id, id) on delete set null (pedido_id)
);
create index movimientos_stock_producto_idx on public.movimientos_stock (restaurante_id, producto_id, created_at desc);
