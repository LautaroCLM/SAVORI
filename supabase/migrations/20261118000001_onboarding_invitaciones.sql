-- =============================================================================
-- 0005 · Onboarding: crear restaurante propio o unirse con código de invitación
-- =============================================================================
-- Flujo:
--   * Solo el dueño del sistema crea usuarios de auth (registro público cerrado).
--   * Un usuario sin perfil, al ingresar, puede:
--       a) crear_mi_restaurante(nombre, mi_nombre) → queda como admin
--       b) unirme_con_codigo(codigo, mi_nombre)    → entra con el rol de la invitación
--   * El admin de un restaurante genera códigos con generar_invitacion(rol).
--
-- Errores (campo `message`): NO_AUTENTICADO, YA_TIENE_RESTAURANTE, NOMBRE_INVALIDO,
--   CODIGO_INVALIDO, ROL_INVALIDO
-- =============================================================================

create table public.invitaciones (
  id              uuid primary key default gen_random_uuid(),
  restaurante_id  uuid not null references public.restaurantes (id) on delete cascade,
  codigo          text not null unique,
  rol             public.rol_usuario not null,
  creada_por      uuid default auth.uid() references auth.users (id) on delete set null,
  expira_at       timestamptz not null default now() + interval '7 days',
  revocada        boolean not null default false,
  usada_por       uuid references auth.users (id) on delete set null,
  usada_at        timestamptz,
  created_at      timestamptz not null default now(),
  check ((usada_por is null) = (usada_at is null))
);
create index invitaciones_restaurante_idx on public.invitaciones (restaurante_id, created_at desc);

alter table public.invitaciones enable row level security;

-- El admin ve y revoca las de su restaurante. Las altas y el canje van por RPC.
create policy invitaciones_select on public.invitaciones
  for select to authenticated
  using (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) = 'admin');

create policy invitaciones_update_admin on public.invitaciones
  for update to authenticated
  using      (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) = 'admin')
  with check (restaurante_id = (select public.mi_restaurante_id()) and (select public.mi_rol()) = 'admin');

-- Solo se permite tocar `revocada` desde el cliente
revoke update on public.invitaciones from authenticated;
grant  update (revocada) on public.invitaciones to authenticated;
grant  select on public.invitaciones to authenticated;

-- -----------------------------------------------------------------------------
-- Código legible: 8 caracteres sin ambiguos (sin 0/O/1/I/L), formato XXXX-XXXX
-- -----------------------------------------------------------------------------
create or replace function public.generar_codigo_invitacion()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  c_alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea := extensions.gen_random_bytes(8);
  v_codigo text := '';
  i integer;
begin
  for i in 0..7 loop
    v_codigo := v_codigo || substr(c_alfabeto, (get_byte(v_bytes, i) % length(c_alfabeto)) + 1, 1);
  end loop;
  return substr(v_codigo, 1, 4) || '-' || substr(v_codigo, 5, 4);
end;
$$;

-- -----------------------------------------------------------------------------
-- crear_mi_restaurante(p_nombre_restaurante, p_mi_nombre) → restaurante_id
-- -----------------------------------------------------------------------------
create or replace function public.crear_mi_restaurante(p_nombre_restaurante text, p_mi_nombre text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_nombre  text := trim(coalesce(p_nombre_restaurante, ''));
  v_mi      text := trim(coalesce(p_mi_nombre, ''));
  v_base    text;
  v_id      uuid;
begin
  if v_uid is null then raise exception 'NO_AUTENTICADO' using errcode = 'P0001'; end if;
  if exists (select 1 from public.perfiles where id = v_uid) then
    raise exception 'YA_TIENE_RESTAURANTE' using errcode = 'P0001';
  end if;
  if length(v_nombre) not between 2 and 80 or length(v_mi) not between 2 and 80 then
    raise exception 'NOMBRE_INVALIDO' using errcode = 'P0001';
  end if;

  -- slug: sin tildes, a-z0-9 y guiones, + sufijo aleatorio para evitar choques
  v_base := trim(both '-' from regexp_replace(
              lower(translate(v_nombre, 'áàäâéèëêíìïîóòöôúùüûñÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑ',
                                        'aaaaeeeeiiiioooouuuunAAAAEEEEIIIIOOOOUUUUN')),
              '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'restaurante'; end if;
  v_base := left(v_base, 40);

  insert into public.restaurantes (nombre, slug)
  values (v_nombre, v_base || '-' || substr(encode(extensions.gen_random_bytes(3), 'hex'), 1, 5))
  returning id into v_id;

  insert into public.perfiles (id, restaurante_id, nombre, rol)
  values (v_uid, v_id, v_mi, 'admin');

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- generar_invitacion(p_rol) → código    (solo admin del restaurante)
-- -----------------------------------------------------------------------------
create or replace function public.generar_invitacion(p_rol public.rol_usuario)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_resto  uuid := public.mi_restaurante_id();
  v_codigo text;
  v_intento integer := 0;
begin
  if public.mi_rol() is distinct from 'admin' then
    raise exception 'Solo un admin puede invitar' using errcode = '42501';
  end if;
  if p_rol is null then raise exception 'ROL_INVALIDO' using errcode = 'P0001'; end if;

  loop
    v_codigo := public.generar_codigo_invitacion();
    begin
      insert into public.invitaciones (restaurante_id, codigo, rol)
      values (v_resto, v_codigo, p_rol);
      return v_codigo;
    exception when unique_violation then
      v_intento := v_intento + 1;
      if v_intento > 5 then raise; end if;
    end;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- unirme_con_codigo(p_codigo, p_mi_nombre) → restaurante_id
-- El UPDATE ... RETURNING es atómico: un código no se puede canjear dos veces.
-- -----------------------------------------------------------------------------
create or replace function public.unirme_con_codigo(p_codigo text, p_mi_nombre text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_mi     text := trim(coalesce(p_mi_nombre, ''));
  v_inv    record;
begin
  if v_uid is null then raise exception 'NO_AUTENTICADO' using errcode = 'P0001'; end if;
  if exists (select 1 from public.perfiles where id = v_uid) then
    raise exception 'YA_TIENE_RESTAURANTE' using errcode = 'P0001';
  end if;
  if length(v_mi) not between 2 and 80 then
    raise exception 'NOMBRE_INVALIDO' using errcode = 'P0001';
  end if;

  update public.invitaciones i
     set usada_por = v_uid, usada_at = now()
   from public.restaurantes r
   where i.codigo = upper(trim(coalesce(p_codigo, '')))
     and r.id = i.restaurante_id
     and r.activo
     and not i.revocada
     and i.usada_por is null
     and i.expira_at > now()
  returning i.restaurante_id, i.rol into v_inv;

  if v_inv.restaurante_id is null then
    raise exception 'CODIGO_INVALIDO' using errcode = 'P0001';
  end if;

  insert into public.perfiles (id, restaurante_id, nombre, rol)
  values (v_uid, v_inv.restaurante_id, v_mi, v_inv.rol);

  return v_inv.restaurante_id;
end;
$$;

-- Las funciones nuevas nacen ejecutables por PUBLIC: se cierra explícitamente.
revoke execute on function public.crear_mi_restaurante(text, text)        from public, anon;
revoke execute on function public.generar_invitacion(public.rol_usuario) from public, anon;
revoke execute on function public.unirme_con_codigo(text, text)           from public, anon;

grant execute on function public.crear_mi_restaurante(text, text) to authenticated;
grant execute on function public.generar_invitacion(public.rol_usuario) to authenticated;
grant execute on function public.unirme_con_codigo(text, text) to authenticated;
-- generar_codigo_invitacion es interna: sin acceso para anon/authenticated
revoke execute on function public.generar_codigo_invitacion() from public, anon, authenticated;
