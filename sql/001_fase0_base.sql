-- =====================================================================
-- Permisos UT · 001 · Fase 0 (base de acceso)
-- Pegar COMPLETO en Supabase > SQL Editor > New query > Run.
-- Se puede correr dos veces sin romper nada.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- Tipos ----------
do $$ begin
  create type public.jornada as enum ('TC','MT');
exception when duplicate_object then null; end $$;

do $$ begin
  -- empleado = todos · jefe = Raul/Max/Laura · filtro = Gaby · final = Laura (formatos)
  -- admin = Valen · altas = quien da de alta gente y PINs (Valen y Gaby)
  create type public.rol as enum ('empleado','jefe','filtro','final','admin','altas');
exception when duplicate_object then null; end $$;

-- ---------- Tablas ----------
create table if not exists public.areas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  orden      int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.empleados (
  id             uuid primary key default gen_random_uuid(),
  nombre_oficial text not null unique,
  nombre_corto   text,
  iniciales      text not null unique,
  puesto         text,
  area_id        uuid not null references public.areas(id),
  jornada        public.jornada not null default 'TC',
  en_nomina      boolean not null default false,
  activo         boolean not null default true,
  roles          public.rol[] not null default '{empleado}',
  correo         text unique,
  created_at     timestamptz not null default now()
);

-- Accesos: privada. Nadie la lee directo; solo las funciones de abajo.
create table if not exists public.accesos (
  empleado_id    uuid primary key references public.empleados(id) on delete cascade,
  auth_correo_id uuid,
  auth_pin_id    uuid,
  pin_email      text unique,
  pin_hash       text,
  pin_secreto    text,
  intentos       int not null default 0,
  bloqueado      boolean not null default false,
  updated_at     timestamptz not null default now()
);

alter table public.areas     enable row level security;
alter table public.empleados enable row level security;
alter table public.accesos   enable row level security;

drop policy if exists areas_leer on public.areas;
create policy areas_leer on public.areas for select to anon, authenticated using (true);
-- empleados y accesos: sin politicas = nadie los lee directo (se usan via funciones).

-- ---------- Catalogo de areas ----------
insert into public.areas (nombre, orden) values
  ('Taller de Proyectos', 1),
  ('Secretaría Técnica', 2),
  ('Administración', 3),
  ('Gestión Inmobiliaria', 4),
  ('Intendencia', 5),
  ('Dirección', 6)
on conflict (nombre) do update set orden = excluded.orden;

-- ---------- Primera persona: Valen (el resto entra en la Fase 1) ----------
insert into public.empleados (nombre_oficial, nombre_corto, iniciales, puesto, area_id, jornada, en_nomina, roles)
select 'Valentina Morales Mendoza', 'Valentina', 'VMM', 'Dibujante', a.id, 'MT', false,
       '{empleado,admin,altas}'
from public.areas a where a.nombre = 'Taller de Proyectos'
on conflict (nombre_oficial) do nothing;

-- ---------- Funciones internas (solo se corren desde el SQL Editor) ----------
create or replace function public._crear_usuario_auth(p_email text, p_password text)
returns uuid
language plpgsql security definer
set search_path = public, extensions, auth
as $$
declare v uuid;
begin
  select id into v from auth.users where lower(email) = lower(p_email);
  if v is null then
    v := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', v, 'authenticated', 'authenticated', lower(p_email),
      case when p_password is null then '' else crypt(p_password, gen_salt('bf')) end, now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v, v::text,
      jsonb_build_object('sub', v::text, 'email', lower(p_email), 'email_verified', true),
      'email', now(), now(), now());
  elsif p_password is not null then
    update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = v;
  end if;
  return v;
end $$;

create or replace function public._dar_correo(p_empleado uuid, p_correo text)
returns void
language plpgsql security definer
set search_path = public, extensions, auth
as $$
declare v_uid uuid;
begin
  if p_empleado is null then raise exception 'No encontre a esa persona'; end if;
  if p_correo !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Correo no valido: %', p_correo; end if;
  v_uid := public._crear_usuario_auth(trim(p_correo), null);
  update public.empleados set correo = lower(trim(p_correo)) where id = p_empleado;
  insert into public.accesos (empleado_id, auth_correo_id) values (p_empleado, v_uid)
  on conflict (empleado_id) do update set auth_correo_id = excluded.auth_correo_id, updated_at = now();
end $$;

create or replace function public._dar_pin(p_empleado uuid, p_pin text)
returns void
language plpgsql security definer
set search_path = public, extensions, auth
as $$
declare v_email text; v_secreto text; v_uid uuid;
begin
  if p_empleado is null then raise exception 'No encontre a esa persona'; end if;
  if p_pin !~ '^[0-9]{6}$' then raise exception 'El PIN debe tener exactamente 6 numeros'; end if;
  v_email   := 'pin-' || replace(p_empleado::text, '-', '') || '@pin.permisos-ut.local';
  v_secreto := encode(gen_random_bytes(24), 'hex');
  v_uid     := public._crear_usuario_auth(v_email, v_secreto);
  insert into public.accesos (empleado_id, auth_pin_id, pin_email, pin_hash, pin_secreto, intentos, bloqueado)
  values (p_empleado, v_uid, v_email, crypt(p_pin, gen_salt('bf')), v_secreto, 0, false)
  on conflict (empleado_id) do update set
    auth_pin_id = excluded.auth_pin_id, pin_email = excluded.pin_email, pin_hash = excluded.pin_hash,
    pin_secreto = excluded.pin_secreto, intentos = 0, bloqueado = false, updated_at = now();
end $$;

revoke all on function public._crear_usuario_auth(text, text) from public, anon, authenticated;
revoke all on function public._dar_correo(uuid, text)         from public, anon, authenticated;
revoke all on function public._dar_pin(uuid, text)            from public, anon, authenticated;

-- ---------- Funciones publicas (las usa la app) ----------

-- Lista para la pantalla de entrar: solo quien ya tiene PIN.
create or replace function public.login_lista()
returns table (empleado_id uuid, nombre text, area text, area_orden int)
language sql security definer stable
set search_path = public
as $$
  select e.id, e.nombre_oficial, a.nombre, a.orden
  from public.empleados e
  join public.areas a on a.id = e.area_id
  join public.accesos x on x.empleado_id = e.id
  where e.activo and x.pin_hash is not null
  order by a.orden, e.nombre_oficial;
$$;

-- Revisa el PIN. 5 intentos fallidos = bloqueado hasta que Valen o Gaby lo desbloqueen.
create or replace function public.login_pin(p_empleado uuid, p_pin text)
returns json
language plpgsql security definer
set search_path = public, extensions
as $$
declare a public.accesos%rowtype;
begin
  select * into a from public.accesos where empleado_id = p_empleado for update;
  if not found or a.pin_hash is null then
    return json_build_object('ok', false, 'error', 'sin_pin');
  end if;
  if a.bloqueado then
    return json_build_object('ok', false, 'error', 'bloqueado');
  end if;
  if p_pin is not null and crypt(p_pin, a.pin_hash) = a.pin_hash then
    update public.accesos set intentos = 0 where empleado_id = p_empleado;
    return json_build_object('ok', true, 'email', a.pin_email, 'secreto', a.pin_secreto);
  end if;
  update public.accesos
     set intentos = a.intentos + 1, bloqueado = (a.intentos + 1 >= 5), updated_at = now()
   where empleado_id = p_empleado;
  if a.intentos + 1 >= 5 then
    return json_build_object('ok', false, 'error', 'bloqueado');
  end if;
  return json_build_object('ok', false, 'error', 'pin_incorrecto', 'quedan', 5 - (a.intentos + 1));
end $$;

-- Quien soy (segun la sesion).
create or replace function public.mi_perfil()
returns json
language sql security definer stable
set search_path = public
as $$
  select json_build_object(
    'id', e.id, 'nombre', e.nombre_oficial, 'nombre_corto', e.nombre_corto,
    'iniciales', e.iniciales, 'puesto', e.puesto, 'area', a.nombre,
    'jornada', e.jornada, 'en_nomina', e.en_nomina, 'roles', e.roles)
  from public.accesos x
  join public.empleados e on e.id = x.empleado_id
  join public.areas a on a.id = e.area_id
  where e.activo and auth.uid() is not null
    and (x.auth_correo_id = auth.uid() or x.auth_pin_id = auth.uid())
  limit 1;
$$;

revoke all on function public.login_lista()          from public;
revoke all on function public.login_pin(uuid, text)  from public;
revoke all on function public.mi_perfil()            from public;
grant execute on function public.login_lista()         to anon, authenticated;
grant execute on function public.login_pin(uuid, text) to anon, authenticated;
grant execute on function public.mi_perfil()           to authenticated;
