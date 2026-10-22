-- =====================================================================
-- Permisos UT · 008 · Fase 4 (banco de horas y reposicion)
-- Pegar COMPLETO en Supabase > SQL Editor > New query > Run.
-- Se puede correr dos veces sin romper nada.
-- =====================================================================

-- ---------- Tipos ----------
do $$ begin create type public.cuenta_banco as enum ('banco','reposicion');
exception when duplicate_object then null; end $$;
do $$ begin create type public.tipo_mov as enum ('saldo_inicial','deposito','retiro','ajuste','reverso','deuda','reposicion');
exception when duplicate_object then null; end $$;

-- ---------- Columnas nuevas ----------
-- horas_override ya existe (006): son las horas que puso el jefe/Gaby en lugar del calculo.
alter table public.solicitudes add column if not exists horas_override_por    uuid references public.empleados(id);
alter table public.solicitudes add column if not exists horas_override_motivo text;
alter table public.solicitudes add column if not exists horas_override_at     timestamptz;

-- ---------- Movimientos (append-only: nunca se editan ni se borran; se corrige con reverso o ajuste) ----------
create table if not exists public.movimientos (
  id             bigserial primary key,
  empleado_id    uuid not null references public.empleados(id),
  cuenta         public.cuenta_banco not null,
  tipo           public.tipo_mov not null,
  horas          numeric(7,2) not null,          -- con signo: + suma, - resta
  solicitud_id   uuid references public.solicitudes(id),
  folio_ref      text,                           -- folio, 'CARGA' o '-'
  referencia     text,
  revierte_a     bigint references public.movimientos(id),
  es_prueba      boolean not null default false,
  registrado_por uuid references public.empleados(id),
  registrado_at  timestamptz not null default now(),
  bitacora_id    uuid                            -- la "estampa" (Fase 5)
);
create index if not exists movimientos_empleado on public.movimientos (empleado_id, id);
create index if not exists movimientos_solicitud on public.movimientos (solicitud_id);
alter table public.movimientos enable row level security;

create or replace function public._movimientos_candado()
returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('ut.borrando_pruebas', true), '') = '1' and old.es_prueba then return old; end if;
  raise exception 'Los movimientos del banco no se editan ni se borran: se corrigen con un ajuste';
end $$;
drop trigger if exists movimientos_candado on public.movimientos;
create trigger movimientos_candado before update or delete on public.movimientos
for each row execute function public._movimientos_candado();

-- Quien ve que: las de prueba solo admin; el empleado lo suyo; jefes su area; Gaby, Laura y admin todo.
create or replace function public.puedo_ver_movimiento(m public.movimientos)
returns boolean language sql stable security definer set search_path = public as $$
  select case when m.es_prueba then public.tengo_rol('admin')
    else m.empleado_id = public.mi_empleado_id()
      or public.tengo_rol('admin') or public.tengo_rol('filtro') or public.tengo_rol('final')
      or exists (select 1 from public.empleados e join public.jefes_area j on j.area_id = e.area_id
                 where e.id = m.empleado_id and j.jefe_id = public.mi_empleado_id())
    end;
$$;
drop policy if exists movimientos_leer on public.movimientos;
create policy movimientos_leer on public.movimientos for select to authenticated using (public.puedo_ver_movimiento(movimientos));

-- ---------- En que etapa se mueve el banco ----------
-- Jefe; o Gaby si el jefe se salto (el solicitante es jefe / area sin jefe) o si es una correccion.
create or replace function public._etapa_banco(p_id uuid)
returns public.etapa language sql stable security definer set search_path = public as $$
  select case when s.corrige_a is not null
                or exists (select 1 from public.decisiones d where d.solicitud_id = s.id and d.etapa = 'jefe'
                           and d.decision in ('no_aplica','paso_por_correccion'))
              then 'gaby'::public.etapa else 'jefe'::public.etapa end
  from public.solicitudes s where s.id = p_id;
$$;

-- ---------- Revertir: un movimiento de reverso por cada movimiento activo de la solicitud ----------
create or replace function public._revertir_banco(p_id uuid, p_motivo text)
returns int language plpgsql security definer set search_path = public as $$
declare m public.movimientos%rowtype; n int := 0;
begin
  for m in select * from public.movimientos x
           where x.solicitud_id = p_id and x.tipo <> 'reverso'
             and not exists (select 1 from public.movimientos r where r.revierte_a = x.id) loop
    insert into public.movimientos (empleado_id, cuenta, tipo, horas, solicitud_id, folio_ref, referencia, revierte_a, es_prueba, registrado_por)
    values (m.empleado_id, m.cuenta, 'reverso', -m.horas, m.solicitud_id, m.folio_ref, 'Reverso: ' || p_motivo, m.id, m.es_prueba, public.mi_empleado_id());
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------- Registrar el movimiento de una solicitud (anti-duplicado) ----------
create or replace function public._registrar_banco(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  s public.solicitudes%rowtype;
  h numeric; v_cuenta public.cuenta_banco; v_tipo public.tipo_mov; v_ref text;
begin
  select * into s from public.solicitudes where id = p_id;
  -- B2: si es una correccion, primero se cancela lo de la original
  if s.corrige_a is not null then
    perform public._revertir_banco(s.corrige_a, 'se corrigió en ' || s.folio);
  end if;
  if s.mueve = 'no' then return; end if;
  -- ya tiene un movimiento activo: no se duplica
  if exists (select 1 from public.movimientos x where x.solicitud_id = p_id and x.tipo <> 'reverso'
             and not exists (select 1 from public.movimientos r where r.revierte_a = x.id)) then return; end if;
  h := abs(coalesce(s.horas_override, s.horas_calculadas, 0));
  if h = 0 then return; end if;
  v_cuenta := case when s.mueve in ('deuda','reposicion') then 'reposicion' else 'banco' end;
  v_tipo := s.mueve::text::public.tipo_mov;
  v_ref := case s.mueve
    when 'deposito' then coalesce((select p.nombre_corto from public.proyectos p where p.id = s.proyecto_id), nullif(s.comision_ref, ''), 'Horas extras')
    when 'reposicion' then 'Reposición de horas'
    else coalesce(nullif(trim(s.etiqueta_banco), ''), nullif(trim(s.texto_oficial), ''),
                  case s.justificacion when 'uso_horas' then 'Uso de horas acumuladas' when 'reposicion_horas' then 'Reposición de horas'
                    when 'asunto_personal' then 'Asunto personal' when 'otro' then 'Otro' else 'Uso de horas acumuladas' end) end;
  insert into public.movimientos (empleado_id, cuenta, tipo, horas, solicitud_id, folio_ref, referencia, es_prueba, registrado_por)
  values (s.empleado_id, v_cuenta, v_tipo, case when s.mueve in ('deposito','reposicion') then h else -h end,
          s.id, s.folio, v_ref, s.es_prueba, public.mi_empleado_id());
end $$;

-- ---------- Decidir (igual que en el 007 + mueve el banco) ----------
create or replace function public.decidir(p_solicitud uuid, p_etapa public.etapa, p_decision public.decision, p_comentario text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  yo uuid := public.mi_empleado_id();
  s public.solicitudes%rowtype;
  act public.decisiones%rowtype;
  v_com text := nullif(trim(coalesce(p_comentario, '')), '');
  v_sig public.etapa;
  v_espera text := case p_etapa when 'jefe' then 'nueva_espera_jefe' when 'gaby' then 'espera_gaby' when 'laura' then 'espera_laura' end;
begin
  if yo is null then raise exception 'Tu sesion no esta ligada a ninguna persona'; end if;
  if p_decision not in ('aprobado','rechazado','pedir_cambios','resuelto') then raise exception 'Esa decision no se elige a mano'; end if;
  if p_etapa = 'cerrada' then raise exception 'Etapa no valida'; end if;
  select * into s from public.solicitudes where id = p_solicitud for update;
  if not found or not public.puedo_ver_solicitud(s) then raise exception 'No encontre esa solicitud'; end if;
  if s.corregida_por is not null then raise exception 'La % ya se corrigio: decide sobre la correccion', s.folio; end if;
  if s.congelada then raise exception 'La % ya la aprobo Laura y quedo congelada. Para cambiar algo, el empleado la corrige.', s.folio; end if;
  if not public.puedo_decidir(s, p_etapa) then raise exception 'No te toca decidir la % en esta etapa', s.folio; end if;
  select * into act from public.decisiones where solicitud_id = s.id and etapa = p_etapa;
  if not found then raise exception 'La % todavia no llega a esta etapa', s.folio; end if;
  if act.decision in ('no_aplica','paso_por_correccion') then raise exception 'En la % esta etapa no aplica', s.folio; end if;
  if act.decision = 'pendiente' and s.estado_global::text <> v_espera then
    raise exception 'La % no esta esperando tu decision', s.folio;
  end if;
  if p_decision in ('rechazado','pedir_cambios') and v_com is null then
    raise exception 'Escribe el comentario: el empleado necesita saber que cambiar';
  end if;

  update public.decisiones set decision = p_decision, comentario = v_com, decidido_por = yo, decidido_at = now() where id = act.id;
  insert into public.decision_eventos (solicitud_id, etapa, decision, comentario, por) values (s.id, p_etapa, p_decision, v_com, yo);

  -- Hacia adelante: aprobar crea la siguiente etapa en Pendiente; Resuelto la pasa como Resuelto.
  -- Lo que ya decidio una persona en la siguiente etapa no se toca.
  v_sig := case p_etapa when 'jefe' then 'gaby' when 'gaby' then 'laura' end;
  if v_sig is not null and p_decision = 'aprobado' then
    insert into public.decisiones (solicitud_id, etapa, decision) values (s.id, v_sig, 'pendiente')
    on conflict (solicitud_id, etapa) do update set decision = 'pendiente', comentario = null, decidido_at = null
      where public.decisiones.decidido_por is null and public.decisiones.decision = 'resuelto';
  elsif v_sig is not null and p_decision = 'resuelto' then
    insert into public.decisiones (solicitud_id, etapa, decision, comentario, decidido_at)
    values (s.id, v_sig, 'resuelto', case p_etapa when 'jefe' then 'Resuelto por el jefe' else 'Resuelto por Gaby' end, now())
    on conflict (solicitud_id, etapa) do update set decision = 'resuelto', comentario = excluded.comentario, decidido_at = now()
      where public.decisiones.decidido_por is null;
  end if;

  -- Fase 4: el banco se mueve cuando decide la etapa "del banco" (jefe; o Gaby si el jefe se salto o es correccion)
  if p_etapa = public._etapa_banco(s.id) then
    if p_decision = 'aprobado' then perform public._registrar_banco(s.id);
    else perform public._revertir_banco(s.id, 'cambió la decisión a ' || replace(p_decision::text, '_', ' '));
    end if;
  end if;

  perform public._recalcular_estado(s.id);
  select * into s from public.solicitudes where id = p_solicitud;
  return json_build_object('folio', s.folio, 'estado', s.estado_global);
end $$;

-- ---------- Corregir (igual que en el 007, pero la correccion conserva "que mueve") ----------
create or replace function public.corregir_solicitud(p jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare
  yo uuid := public.mi_empleado_id();
  o public.solicitudes%rowtype;
  v_folio text; v_base text; v_n int; v_id uuid; v_tipo public.tipo_solicitud;
  v_que text := nullif(trim(coalesce(p->>'que_cambio', '')), '');
  v_buscar text := upper(regexp_replace(coalesce(p->>'folio', ''), '\s', '', 'g'));
  llegadas public.tipo_solicitud[] := '{llegada_tarde,llegada_temprana,llegada_destiempo}';
begin
  if yo is null then raise exception 'Tu sesion no esta ligada a ninguna persona'; end if;
  select * into o from public.solicitudes where upper(folio) = v_buscar for update;
  if not found or not public.puedo_ver_solicitud(o) then raise exception 'No encontre el folio %', v_buscar; end if;
  if o.empleado_id <> yo and not (public.tengo_rol('admin') or public.tengo_rol('altas')) then
    raise exception 'Solo puedes corregir tus propias solicitudes';
  end if;
  if o.corregida_por is not null then
    raise exception 'La % ya se corrigio: corrige la %', o.folio, (select folio from public.solicitudes where id = o.corregida_por);
  end if;
  if v_que is null then raise exception 'Escribe que te pidieron cambiar'; end if;

  if o.folio ~ '-R[0-9]+$' then
    v_base := regexp_replace(o.folio, '-R[0-9]+$', '');
    v_n := substring(o.folio from '-R([0-9]+)$')::int + 1;
  else
    v_base := o.folio; v_n := 1;
  end if;
  v_folio := v_base || '-R' || v_n;

  -- El tipo y la justificacion NO se corrigen; solo una llegada se reclasifica si cambia la hora.
  v_tipo := o.tipo;
  if o.tipo = any(llegadas) and (p->>'tipo') = any(llegadas::text[]) then v_tipo := (p->>'tipo')::public.tipo_solicitud; end if;

  insert into public.solicitudes (folio, empleado_id, area_id, es_jefe, capturado_por, tipo, justificacion, fecha_inicio, fecha_fin,
    hora_ref, hora_fin, proyecto_id, comision_ref, que_checar, texto_oficial, etiqueta_banco, notas, razon_real, motivo_cambio,
    verificacion, mueve, horas_calculadas, calculo, horario_oficial, redaccion, corrige_a, motivo_correccion,
    etapa, estado_global, es_prueba)
  values (v_folio, o.empleado_id, o.area_id, o.es_jefe, yo, v_tipo, o.justificacion,
    case when p ? 'fecha_inicio' then (p->>'fecha_inicio')::date else o.fecha_inicio end,
    case when p ? 'fecha_fin' then (p->>'fecha_fin')::date else o.fecha_fin end,
    case when p ? 'hora_ref' then nullif(p->>'hora_ref', '')::time else o.hora_ref end,
    case when p ? 'hora_fin' then nullif(p->>'hora_fin', '')::time else o.hora_fin end,
    case when p ? 'proyecto_id' then nullif(p->>'proyecto_id', '')::uuid else o.proyecto_id end,
    o.comision_ref, o.que_checar, o.texto_oficial, o.etiqueta_banco, o.notas, o.razon_real, o.motivo_cambio,
    case when p ? 'verificacion' then nullif(p->>'verificacion', '') else o.verificacion end,
    coalesce(nullif(p->>'mueve', '')::public.mueve, o.mueve),  -- B2: al aprobarla Gaby reemplaza el movimiento de la original
    case when p ? 'horas_calculadas' then nullif(p->>'horas_calculadas', '')::numeric else o.horas_calculadas end,
    case when p ? 'calculo' then nullif(p->>'calculo', '') else o.calculo end,
    case when p ? 'horario_oficial' then nullif(p->>'horario_oficial', '') else o.horario_oficial end,
    coalesce(nullif(trim(coalesce(p->>'redaccion', '')), ''), o.redaccion),
    o.id, 'Corrección de ' || o.folio || ': ' || v_que,
    'gaby', 'espera_gaby', o.es_prueba)
  returning id into v_id;

  insert into public.decisiones (solicitud_id, etapa, decision, comentario, decidido_at)
  values (v_id, 'jefe', 'paso_por_correccion', 'Corrección de ' || o.folio || ' — ya está con Gaby', now());
  insert into public.decisiones (solicitud_id, etapa, decision) values (v_id, 'gaby', 'pendiente');

  update public.solicitudes set corregida_por = v_id where id = o.id;
  perform public._recalcular_estado(o.id);

  return json_build_object('id', v_id, 'folio', v_folio, 'corrige', o.folio);
end $$;

-- ---------- Cambiar las horas antes de aprobar (H1: jefe; o Gaby si el banco se mueve con ella) ----------
create or replace function public.cambiar_horas(p_solicitud uuid, p_horas numeric, p_motivo text)
returns json language plpgsql security definer set search_path = public as $$
declare s public.solicitudes%rowtype; v_et public.etapa; v_mot text := nullif(trim(coalesce(p_motivo, '')), '');
begin
  select * into s from public.solicitudes where id = p_solicitud for update;
  if not found or not public.puedo_ver_solicitud(s) then raise exception 'No encontre esa solicitud'; end if;
  v_et := public._etapa_banco(s.id);
  if not public.puedo_decidir(s, v_et) then raise exception 'Solo quien aprueba el banco de la % puede cambiar sus horas', s.folio; end if;
  if s.estado_global::text <> (case v_et when 'jefe' then 'nueva_espera_jefe' else 'espera_gaby' end) then
    raise exception 'Las horas solo se cambian antes de aprobar';
  end if;
  if s.mueve = 'no' then raise exception 'La % no mueve el banco', s.folio; end if;
  if p_horas is null or p_horas < 0 or p_horas > 200 then raise exception 'Escribe las horas (un numero positivo)'; end if;
  if v_mot is null then raise exception 'Escribe por que cambias las horas'; end if;
  update public.solicitudes set horas_override = case when s.mueve in ('retiro','deuda') then -p_horas else p_horas end,
    horas_override_por = public.mi_empleado_id(), horas_override_motivo = v_mot, horas_override_at = now(), actualizado_at = now()
  where id = s.id;
  return json_build_object('folio', s.folio);
end $$;

-- ---------- Ajuste a mano (H2: solo Gaby; Valen solo en pruebas) ----------
create or replace function public.ajuste_banco(p_empleado uuid, p_cuenta public.cuenta_banco, p_horas numeric, p_motivo text)
returns json language plpgsql security definer set search_path = public as $$
declare yo uuid := public.mi_empleado_id(); v_prueba boolean; v_mot text := nullif(trim(coalesce(p_motivo, '')), ''); v_id bigint;
begin
  if not public.tengo_rol('filtro') then raise exception 'Solo Gaby puede hacer ajustes a mano'; end if;
  v_prueba := exists (select 1 from public.empleados e where e.id = yo and e.decide_solo_pruebas);
  if not exists (select 1 from public.empleados e where e.id = p_empleado) then raise exception 'No encontre a esa persona'; end if;
  if p_horas is null or p_horas = 0 or abs(p_horas) > 200 then raise exception 'Escribe las horas (+ suma, - resta)'; end if;
  if v_mot is null then raise exception 'Escribe el motivo del ajuste'; end if;
  insert into public.movimientos (empleado_id, cuenta, tipo, horas, folio_ref, referencia, es_prueba, registrado_por)
  values (p_empleado, p_cuenta, 'ajuste', p_horas, '-', v_mot, v_prueba, yo) returning id into v_id;
  return json_build_object('id', v_id, 'prueba', v_prueba);
end $$;

-- ---------- Borrar pruebas (solo admin). Sin confirmar solo CUENTA (diagnostico) ----------
create or replace function public.borrar_pruebas(p_confirmar boolean default false)
returns json language plpgsql security definer set search_path = public as $$
declare v_sol int; v_mov int;
begin
  if not public.tengo_rol('admin') then raise exception 'Solo un administrador puede borrar pruebas'; end if;
  select count(*) into v_sol from public.solicitudes where es_prueba;
  select count(*) into v_mov from public.movimientos where es_prueba;
  if not p_confirmar then return json_build_object('solicitudes', v_sol, 'movimientos', v_mov, 'borrado', false); end if;
  perform set_config('ut.borrando_pruebas', '1', true);
  delete from public.movimientos where es_prueba and revierte_a is not null;
  delete from public.movimientos where es_prueba;
  delete from public.decision_eventos where solicitud_id in (select id from public.solicitudes where es_prueba);
  delete from public.decisiones where solicitud_id in (select id from public.solicitudes where es_prueba);
  update public.solicitudes set corregida_por = null, corrige_a = null where es_prueba;
  delete from public.solicitudes where es_prueba;
  perform set_config('ut.borrando_pruebas', '', true);
  return json_build_object('solicitudes', v_sol, 'movimientos', v_mov, 'borrado', true);
end $$;

-- ---------- Permisos ----------
revoke all on function public._etapa_banco(uuid) from public, anon, authenticated;
revoke all on function public._revertir_banco(uuid, text) from public, anon, authenticated;
revoke all on function public._registrar_banco(uuid) from public, anon, authenticated;
revoke all on function public.puedo_ver_movimiento(public.movimientos) from public, anon;
revoke all on function public.cambiar_horas(uuid, numeric, text) from public, anon;
revoke all on function public.ajuste_banco(uuid, public.cuenta_banco, numeric, text) from public, anon;
revoke all on function public.borrar_pruebas(boolean) from public, anon;
grant execute on function public.puedo_ver_movimiento(public.movimientos) to authenticated;
grant execute on function public.cambiar_horas(uuid, numeric, text) to authenticated;
grant execute on function public.ajuste_banco(uuid, public.cuenta_banco, numeric, text) to authenticated;
grant execute on function public.borrar_pruebas(boolean) to authenticated;
revoke insert, update, delete on public.movimientos from anon, authenticated;

-- Comprobacion: debe salir 1 renglon con "si" en todo.
select case when exists (select 1 from pg_class where relname = 'movimientos') then 'si' else 'no' end as movimientos,
       case when exists (select 1 from pg_proc where proname = 'cambiar_horas') then 'si' else 'no' end as cambiar_horas,
       case when exists (select 1 from pg_proc where proname = 'borrar_pruebas') then 'si' else 'no' end as borrar_pruebas;
