-- =====================================================================
-- Permisos UT · 006 · Fase 2 (solicitudes, folios y primer ruteo)
-- Pegar COMPLETO en Supabase > SQL Editor > New query > Run.
-- Se puede correr dos veces sin romper nada.
-- =====================================================================

-- ---------- Tipos ----------
do $$ begin create type public.tipo_solicitud as enum ('llegada_tarde','llegada_temprana','llegada_destiempo','salida_anticipada',
  'ausencia','horas_extras','cambio_horario','omision_checado','reposicion','correccion');
exception when duplicate_object then null; end $$;
do $$ begin create type public.justificacion as enum ('comision','home_office','vacaciones','uso_horas','reposicion_horas','asunto_personal','otro');
exception when duplicate_object then null; end $$;
do $$ begin create type public.mueve as enum ('deposito','retiro','deuda','reposicion','no');
exception when duplicate_object then null; end $$;
do $$ begin create type public.que_checar as enum ('entrada','salida','ambas');
exception when duplicate_object then null; end $$;
do $$ begin create type public.etapa as enum ('jefe','gaby','laura','cerrada');
exception when duplicate_object then null; end $$;
do $$ begin create type public.estado_global as enum ('nueva_espera_jefe','espera_gaby','espera_laura','cambios_solicitados','aprobada','rechazada','resuelta','corregida');
exception when duplicate_object then null; end $$;
do $$ begin create type public.decision as enum ('pendiente','aprobado','rechazado','pedir_cambios','resuelto','paso_por_correccion','no_aplica');
exception when duplicate_object then null; end $$;

-- ---------- Tablas ----------
create table if not exists public.folio_contadores (
  iniciales text not null, anio int not null, ultimo int not null default 0,
  primary key (iniciales, anio)
);

create table if not exists public.solicitudes (
  id               uuid primary key default gen_random_uuid(),
  folio            text not null unique,
  empleado_id      uuid not null references public.empleados(id),
  area_id          uuid not null references public.areas(id),   -- congelada al momento de pedir
  es_jefe          boolean not null default false,               -- congelado
  capturado_por    uuid references public.empleados(id),         -- quien la lleno (Gaby/Valen a nombre de otro)
  tipo             public.tipo_solicitud not null,
  justificacion    public.justificacion,
  fecha_inicio     date not null,
  fecha_fin        date not null,
  hora_ref         time,
  hora_fin         time,
  proyecto_id      uuid references public.proyectos(id),
  comision_ref     text,                                         -- proyecto o cliente de la comision
  que_checar       public.que_checar,
  texto_oficial    text,                                         -- "Redaccion para el formato" (asunto personal / otro)
  etiqueta_banco   text,                                         -- "Etiqueta para el banco" (uso de horas)
  notas            text,                                         -- se imprime
  razon_real       text,                                         -- NUNCA se imprime
  motivo_cambio    text,
  verificacion     text,
  mueve            public.mueve not null default 'no',
  horas_calculadas numeric(6,2),
  horas_override   numeric(6,2),
  calculo          text,
  horario_oficial  text,                                         -- "9:00-14:00" ese dia (congelado)
  redaccion        text not null,
  corrige_a        uuid references public.solicitudes(id),
  etapa            public.etapa not null,
  estado_global    public.estado_global not null,
  congelada        boolean not null default false,
  es_prueba        boolean not null default false,
  recibido_at      timestamptz not null default now(),
  check (fecha_fin >= fecha_inicio)
);
create index if not exists solicitudes_empleado on public.solicitudes (empleado_id, recibido_at desc);

create table if not exists public.decisiones (
  id           uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes(id),
  etapa        public.etapa not null,
  decision     public.decision not null default 'pendiente',
  comentario   text,
  decidido_por uuid references public.empleados(id),
  decidido_at  timestamptz,
  unique (solicitud_id, etapa)
);

alter table public.folio_contadores enable row level security;
alter table public.solicitudes      enable row level security;
alter table public.decisiones       enable row level security;

-- ---------- Quien ve que (lectura). Escribir: solo con las funciones de abajo ----------
create or replace function public.puedo_ver_solicitud(s public.solicitudes)
returns boolean language sql stable security definer set search_path = public as $$
  select s.empleado_id = public.mi_empleado_id()
      or s.capturado_por = public.mi_empleado_id()
      or public.tengo_rol('admin') or public.tengo_rol('filtro') or public.tengo_rol('final')
      or exists (select 1 from public.jefes_area j where j.area_id = s.area_id and j.jefe_id = public.mi_empleado_id());
$$;

drop policy if exists solicitudes_leer on public.solicitudes;
create policy solicitudes_leer on public.solicitudes for select to authenticated using (public.puedo_ver_solicitud(solicitudes));
drop policy if exists decisiones_leer on public.decisiones;
create policy decisiones_leer on public.decisiones for select to authenticated
  using (exists (select 1 from public.solicitudes s where s.id = solicitud_id and public.puedo_ver_solicitud(s)));

-- Registro de cambios tambien para solicitudes y decisiones
do $$
declare t text;
begin
  foreach t in array array['solicitudes','decisiones'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_cambios', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public._registrar_cambio()', t || '_cambios', t);
  end loop;
end $$;

-- ---------- Crear solicitud: folio + solicitud + ruteo, TODO en una transaccion ----------
-- p: json con los campos de la solicitud (la app ya calculo horas y redaccion).
create or replace function public.crear_solicitud(p jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare
  yo uuid := public.mi_empleado_id();
  emp public.empleados%rowtype;
  v_area public.areas%rowtype;
  v_jefe uuid;
  v_es_jefe boolean;
  v_anio int := extract(year from now() at time zone 'America/Mexico_City');
  v_n int; v_folio text; v_id uuid;
  v_tipo public.tipo_solicitud := (p->>'tipo')::public.tipo_solicitud;
  v_just public.justificacion := nullif(p->>'justificacion', '')::public.justificacion;
  v_ini date := (p->>'fecha_inicio')::date;
  v_fin date := coalesce(nullif(p->>'fecha_fin', '')::date, (p->>'fecha_inicio')::date);
  v_salta boolean; v_coment text;
  v_prueba boolean := coalesce((p->>'es_prueba')::boolean, false);
begin
  if yo is null then raise exception 'Tu sesion no esta ligada a ninguna persona'; end if;
  select * into emp from public.empleados where id = coalesce(nullif(p->>'empleado_id', '')::uuid, yo) and activo;
  if not found then raise exception 'No encontre a esa persona (o esta inactiva)'; end if;
  if emp.id <> yo and not (public.tengo_rol('admin') or public.tengo_rol('altas')) then
    raise exception 'Solo Gaby o Valen pueden capturar a nombre de otra persona';
  end if;
  if coalesce(trim(p->>'redaccion'), '') = '' then raise exception 'Falta la redaccion'; end if;
  if v_tipo in ('llegada_tarde','llegada_temprana','llegada_destiempo','salida_anticipada','ausencia') and v_just is null then
    raise exception 'Falta la justificacion';
  end if;
  if v_tipo in ('horas_extras','reposicion','cambio_horario') and (p->>'hora_ref' is null or p->>'hora_fin' is null) then
    raise exception 'Faltan las horas de inicio y fin';
  end if;
  if v_tipo = 'cambio_horario' and coalesce(trim(p->>'motivo_cambio'), '') = '' then raise exception 'Falta el motivo del cambio de horario'; end if;
  if v_tipo = 'horas_extras' and nullif(p->>'proyecto_id', '') is null then raise exception 'Falta el proyecto'; end if;
  if v_tipo = 'correccion' then raise exception 'Las correcciones llegan en la Fase 3'; end if;

  select * into v_area from public.areas where id = emp.area_id;
  select jefe_id into v_jefe from public.jefes_area where area_id = emp.area_id;
  v_es_jefe := exists (select 1 from public.jefes_area where jefe_id = emp.id);
  v_salta := v_es_jefe or v_jefe is null;
  v_coment := case when v_es_jefe then 'Firma Pável pendiente'
                   when v_jefe is null then 'Área sin jefe asignado (' || v_area.nombre || ')' end;

  if v_prueba and not public.tengo_rol('admin') then raise exception 'Solo un administrador puede hacer solicitudes de prueba'; end if;
  if v_prueba then
    -- prueba: no gasta folio real
    v_folio := 'PRUEBA-' || to_char(now() at time zone 'America/Mexico_City', 'HH24MISS') || '-' || substr(md5(random()::text), 1, 3);
  else
    -- folio por persona y por año (en la misma transaccion)
    insert into public.folio_contadores (iniciales, anio, ultimo) values (emp.iniciales, v_anio, 1)
    on conflict (iniciales, anio) do update set ultimo = public.folio_contadores.ultimo + 1
    returning ultimo into v_n;
    v_folio := 'F-' || emp.iniciales || '-' || v_anio || '-' || lpad(v_n::text, 4, '0');
  end if;

  insert into public.solicitudes (folio, empleado_id, area_id, es_jefe, capturado_por, tipo, justificacion, fecha_inicio, fecha_fin,
    hora_ref, hora_fin, proyecto_id, comision_ref, que_checar, texto_oficial, etiqueta_banco, notas, razon_real, motivo_cambio,
    verificacion, mueve, horas_calculadas, calculo, horario_oficial, redaccion, etapa, estado_global, es_prueba)
  values (v_folio, emp.id, emp.area_id, v_es_jefe, yo, v_tipo, v_just, v_ini, v_fin,
    nullif(p->>'hora_ref', '')::time, nullif(p->>'hora_fin', '')::time, nullif(p->>'proyecto_id', '')::uuid,
    nullif(trim(p->>'comision_ref'), ''), nullif(p->>'que_checar', '')::public.que_checar,
    nullif(trim(p->>'texto_oficial'), ''), nullif(trim(p->>'etiqueta_banco'), ''), nullif(trim(p->>'notas'), ''),
    nullif(trim(p->>'razon_real'), ''), nullif(trim(p->>'motivo_cambio'), ''), nullif(p->>'verificacion', ''),
    coalesce(nullif(p->>'mueve', ''), 'no')::public.mueve, nullif(p->>'horas_calculadas', '')::numeric,
    nullif(p->>'calculo', ''), nullif(p->>'horario_oficial', ''), trim(p->>'redaccion'),
    case when v_salta then 'gaby' else 'jefe' end::public.etapa,
    case when v_salta then 'espera_gaby' else 'nueva_espera_jefe' end::public.estado_global, v_prueba)
  returning id into v_id;

  if v_salta then
    insert into public.decisiones (solicitud_id, etapa, decision, comentario) values (v_id, 'jefe', 'no_aplica', v_coment);
    insert into public.decisiones (solicitud_id, etapa, decision) values (v_id, 'gaby', 'pendiente');
  else
    insert into public.decisiones (solicitud_id, etapa, decision) values (v_id, 'jefe', 'pendiente');
  end if;

  return json_build_object('id', v_id, 'folio', v_folio,
    'con_quien', case when v_salta then 'Gaby' else (select coalesce(nombre_corto, split_part(nombre_oficial, ' ', 1)) from public.empleados where id = v_jefe) end);
end $$;

revoke all on function public.crear_solicitud(jsonb) from public, anon;
grant execute on function public.crear_solicitud(jsonb) to authenticated;
revoke all on function public.puedo_ver_solicitud(public.solicitudes) from public, anon;
grant execute on function public.puedo_ver_solicitud(public.solicitudes) to authenticated;
