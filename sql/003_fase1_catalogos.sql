-- =====================================================================
-- Permisos UT · 003 · Fase 1 (catalogos editables en la app)
-- Pegar COMPLETO en Supabase > SQL Editor > New query > Run.
-- Se puede correr dos veces sin romper nada.
-- =====================================================================

-- ---------- Columnas nuevas ----------
alter table public.empleados add column if not exists valida_id uuid references public.empleados(id);
alter table public.empleados add column if not exists firma_id  uuid references public.empleados(id);
alter table public.empleados add column if not exists nombre_revisado boolean not null default false;
alter table public.accesos   add column if not exists debe_cambiar boolean not null default false;

-- ---------- Tablas nuevas ----------
create table if not exists public.jefes_area (
  area_id uuid primary key references public.areas(id),
  jefe_id uuid references public.empleados(id)
);

create table if not exists public.proyectos (
  id             uuid primary key default gen_random_uuid(),
  nombre_corto   text not null unique,
  nombre_oficial text,
  activo         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- Un horario = un periodo (con fecha de inicio). Sus dias van en horario_dias.
create table if not exists public.horarios (
  id            uuid primary key default gen_random_uuid(),
  empleado_id   uuid not null references public.empleados(id),
  periodo       text,
  vigente_desde date not null,
  por_revisar   boolean not null default false,
  created_at    timestamptz not null default now()
);

-- dia 1=lunes ... 5=viernes. entrada/salida vacias = no labora ese dia.
-- Si salida < entrada el turno cruza la medianoche (ej. 19:30-7:30).
create table if not exists public.horario_dias (
  horario_id uuid not null references public.horarios(id) on delete cascade,
  dia        smallint not null check (dia between 1 and 5),
  entrada    time,
  salida     time,
  primary key (horario_id, dia),
  check ((entrada is null) = (salida is null))
);

-- Registro de cambios (append-only): quien cambio que, antes y despues.
create table if not exists public.cambios (
  id       bigserial primary key,
  tabla    text not null,
  registro text,
  accion   text not null,
  antes    jsonb,
  despues  jsonb,
  actor    uuid,
  at       timestamptz not null default now()
);

-- ---------- Quien soy / que rol tengo ----------
create or replace function public.mi_empleado_id()
returns uuid language sql stable security definer set search_path = public as $$
  select x.empleado_id from public.accesos x
  where auth.uid() is not null and (x.auth_pin_id = auth.uid() or x.auth_correo_id = auth.uid())
  limit 1;
$$;

create or replace function public.tengo_rol(r public.rol)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.empleados e
                 where e.id = public.mi_empleado_id() and e.activo and r = any(e.roles));
$$;

create or replace function public.puedo_editar()
returns boolean language sql stable security definer set search_path = public as $$
  select public.tengo_rol('admin') or public.tengo_rol('altas');
$$;

grant execute on function public.mi_empleado_id() to authenticated;
grant execute on function public.tengo_rol(public.rol) to authenticated;
grant execute on function public.puedo_editar() to authenticated;

-- ---------- Seguridad (RLS) ----------
alter table public.jefes_area   enable row level security;
alter table public.proyectos    enable row level security;
alter table public.horarios     enable row level security;
alter table public.horario_dias enable row level security;
alter table public.cambios      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['empleados','areas','jefes_area','proyectos','horarios','horario_dias'] loop
    execute format('drop policy if exists %I on public.%I', t || '_leer_auth', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_leer_auth', t);
    execute format('drop policy if exists %I on public.%I', t || '_alta', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.puedo_editar())', t || '_alta', t);
    execute format('drop policy if exists %I on public.%I', t || '_editar', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.puedo_editar()) with check (public.puedo_editar())', t || '_editar', t);
  end loop;
end $$;

drop policy if exists cambios_leer on public.cambios;
create policy cambios_leer on public.cambios for select to authenticated using (public.tengo_rol('admin'));

-- ---------- Limpieza y candado de roles en empleados ----------
create or replace function public._empleados_antes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.nombre_oficial := trim(regexp_replace(new.nombre_oficial, '\s+', ' ', 'g'));
  new.iniciales      := upper(trim(new.iniciales));
  new.puesto         := nullif(trim(coalesce(new.puesto, '')), '');
  new.nombre_corto   := nullif(trim(coalesce(new.nombre_corto, '')), '');
  if 'empleado' <> all(new.roles) then new.roles := array_prepend('empleado'::public.rol, new.roles); end if;
  -- Solo admin cambia roles (desde la app). El SQL Editor (sin sesion) si puede.
  if auth.uid() is not null and not public.tengo_rol('admin') then
    if (tg_op = 'INSERT' and new.roles <> '{empleado}') or (tg_op = 'UPDATE' and new.roles is distinct from old.roles) then
      raise exception 'Solo un administrador puede cambiar roles';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists empleados_antes on public.empleados;
create trigger empleados_antes before insert or update on public.empleados
for each row execute function public._empleados_antes();

-- ---------- Registro de cambios (trigger) ----------
create or replace function public._registrar_cambio()
returns trigger language plpgsql security definer set search_path = public as $$
declare j jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.cambios (tabla, registro, accion, antes, despues, actor)
  values (tg_table_name,
          coalesce(j->>'id', j->>'area_id', (j->>'horario_id') || ':' || (j->>'dia')),
          tg_op,
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end,
          public.mi_empleado_id());
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['empleados','areas','jefes_area','proyectos','horarios','horario_dias'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_cambios', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public._registrar_cambio()', t || '_cambios', t);
  end loop;
end $$;

-- ---------- PINs desde la app ----------
create or replace function public.admin_accesos()
returns table (empleado_id uuid, estado text)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.puedo_editar() then raise exception 'Sin permiso'; end if;
  return query
    select e.id,
           case when x.pin_hash is null then 'sin_pin'
                when x.bloqueado then 'bloqueado'
                when x.debe_cambiar then 'temporal'
                else 'activo' end
    from public.empleados e left join public.accesos x on x.empleado_id = e.id;
end $$;

create or replace function public.admin_pin_temporal(p_empleado uuid, p_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.puedo_editar() then raise exception 'Sin permiso'; end if;
  perform public._dar_pin(p_empleado, p_pin);
  update public.accesos set debe_cambiar = true where empleado_id = p_empleado;
end $$;

create or replace function public.admin_desbloquear(p_empleado uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.puedo_editar() then raise exception 'Sin permiso'; end if;
  update public.accesos set bloqueado = false, intentos = 0, updated_at = now() where empleado_id = p_empleado;
end $$;

-- Cambiar mi PIN. Si es temporal no pide el actual (lo acaba de usar para entrar).
create or replace function public.cambiar_mi_pin(p_nuevo text, p_actual text default null)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v uuid := public.mi_empleado_id(); a public.accesos%rowtype;
begin
  if v is null then return json_build_object('ok', false, 'error', 'sin_sesion'); end if;
  select * into a from public.accesos where empleado_id = v for update;
  if p_nuevo !~ '^[0-9]{6}$' then return json_build_object('ok', false, 'error', 'formato'); end if;
  if p_nuevo ~ '^(.)\1{5}$' or p_nuevo in ('123456','654321','012345','543210') then
    return json_build_object('ok', false, 'error', 'facil');
  end if;
  if not a.debe_cambiar and (p_actual is null or crypt(p_actual, a.pin_hash) <> a.pin_hash) then
    return json_build_object('ok', false, 'error', 'actual');
  end if;
  if crypt(p_nuevo, a.pin_hash) = a.pin_hash then
    return json_build_object('ok', false, 'error', 'igual');
  end if;
  update public.accesos set pin_hash = crypt(p_nuevo, gen_salt('bf')), debe_cambiar = false, intentos = 0, updated_at = now()
  where empleado_id = v;
  return json_build_object('ok', true);
end $$;

-- Perfil con el aviso de PIN temporal.
create or replace function public.mi_perfil()
returns json language sql security definer stable set search_path = public as $$
  select json_build_object(
    'id', e.id, 'nombre', e.nombre_oficial, 'nombre_corto', e.nombre_corto,
    'iniciales', e.iniciales, 'puesto', e.puesto, 'area', a.nombre,
    'jornada', e.jornada, 'en_nomina', e.en_nomina, 'roles', e.roles,
    'debe_cambiar', x.debe_cambiar)
  from public.accesos x
  join public.empleados e on e.id = x.empleado_id
  join public.areas a on a.id = e.area_id
  where e.activo and auth.uid() is not null
    and (x.auth_correo_id = auth.uid() or x.auth_pin_id = auth.uid())
  limit 1;
$$;

revoke all on function public.admin_accesos()                 from public, anon;
revoke all on function public.admin_pin_temporal(uuid, text)  from public, anon;
revoke all on function public.admin_desbloquear(uuid)         from public, anon;
revoke all on function public.cambiar_mi_pin(text, text)      from public, anon;
grant execute on function public.admin_accesos()                to authenticated;
grant execute on function public.admin_pin_temporal(uuid, text) to authenticated;
grant execute on function public.admin_desbloquear(uuid)        to authenticated;
grant execute on function public.cambiar_mi_pin(text, text)     to authenticated;
