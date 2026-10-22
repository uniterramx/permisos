-- =====================================================================
-- Permisos UT · 007 · Fase 3 (bandejas, decisiones y correccion -R1)
-- Pegar COMPLETO en Supabase > SQL Editor > New query > Run.
-- Se puede correr dos veces sin romper nada.
-- =====================================================================

-- ---------- Columnas nuevas ----------
alter table public.solicitudes add column if not exists corregida_por     uuid references public.solicitudes(id);
alter table public.solicitudes add column if not exists motivo_correccion text;          -- "Correccion de F-...: lo que pidieron"
alter table public.solicitudes add column if not exists redaccion_antes   text;          -- como decia antes de que Gaby/Laura la editaran
alter table public.solicitudes add column if not exists redaccion_por     uuid references public.empleados(id);
alter table public.solicitudes add column if not exists redaccion_at      timestamptz;
alter table public.solicitudes add column if not exists actualizado_at    timestamptz not null default now();

-- Valen solo decide sobre solicitudes de PRUEBA (decision 23-oct)
alter table public.empleados add column if not exists decide_solo_pruebas boolean not null default false;
update public.empleados set decide_solo_pruebas = true where iniciales = 'VMM';

-- Historial de decisiones (append-only: nunca se borra ni se edita)
create table if not exists public.decision_eventos (
  id           bigserial primary key,
  solicitud_id uuid not null references public.solicitudes(id),
  etapa        public.etapa not null,
  decision     public.decision not null,
  comentario   text,
  por          uuid references public.empleados(id),
  at           timestamptz not null default now()
);
alter table public.decision_eventos enable row level security;

-- ---------- Quien ve que ----------
-- Las de PRUEBA solo las ve un administrador (nadie mas sabe que existen).
create or replace function public.puedo_ver_solicitud(s public.solicitudes)
returns boolean language sql stable security definer set search_path = public as $$
  select case when s.es_prueba then public.tengo_rol('admin')
    else s.empleado_id = public.mi_empleado_id()
      or s.capturado_por = public.mi_empleado_id()
      or public.tengo_rol('admin') or public.tengo_rol('filtro') or public.tengo_rol('final')
      or exists (select 1 from public.jefes_area j where j.area_id = s.area_id and j.jefe_id = public.mi_empleado_id())
    end;
$$;

drop policy if exists decision_eventos_leer on public.decision_eventos;
create policy decision_eventos_leer on public.decision_eventos for select to authenticated
  using (exists (select 1 from public.solicitudes s where s.id = solicitud_id and public.puedo_ver_solicitud(s)));

-- ---------- Quien decide cada etapa ----------
create or replace function public.puedo_decidir(s public.solicitudes, p_etapa public.etapa)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when s.es_prueba then public.tengo_rol('admin')
    when exists (select 1 from public.empleados e where e.id = public.mi_empleado_id() and e.decide_solo_pruebas) then false
    when p_etapa = 'jefe'  then exists (select 1 from public.jefes_area j where j.area_id = s.area_id and j.jefe_id = public.mi_empleado_id())
    when p_etapa = 'gaby'  then public.tengo_rol('filtro')
    when p_etapa = 'laura' then public.tengo_rol('final')
    else false end;
$$;

-- ---------- Estado global (lo manda la etapa mas avanzada) ----------
create or replace function public._recalcular_estado(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  s public.solicitudes%rowtype;
  j public.decision; g public.decision; l public.decision;
  v_est public.estado_global; v_et public.etapa;
begin
  select * into s from public.solicitudes where id = p_id;
  if s.corregida_por is not null then
    update public.solicitudes set estado_global = 'corregida', etapa = 'cerrada', actualizado_at = now() where id = p_id;
    return;
  end if;
  select decision into j from public.decisiones where solicitud_id = p_id and etapa = 'jefe';
  select decision into g from public.decisiones where solicitud_id = p_id and etapa = 'gaby';
  select decision into l from public.decisiones where solicitud_id = p_id and etapa = 'laura';
  if j is null or j = 'pendiente'      then v_est := 'nueva_espera_jefe';   v_et := 'jefe';
  elsif j = 'rechazado'                then v_est := 'rechazada';           v_et := 'cerrada';
  elsif j = 'pedir_cambios'            then v_est := 'cambios_solicitados'; v_et := 'jefe';
  elsif j = 'resuelto' and g is null   then v_est := 'resuelta';            v_et := 'cerrada';
  elsif g is null or g = 'pendiente'   then v_est := 'espera_gaby';         v_et := 'gaby';
  elsif g = 'rechazado'                then v_est := 'rechazada';           v_et := 'cerrada';
  elsif g = 'pedir_cambios'            then v_est := 'cambios_solicitados'; v_et := 'gaby';
  elsif g = 'resuelto' and l is null   then v_est := 'resuelta';            v_et := 'cerrada';
  elsif l is null or l = 'pendiente'   then v_est := 'espera_laura';        v_et := 'laura';
  elsif l = 'rechazado'                then v_est := 'rechazada';           v_et := 'cerrada';
  elsif l = 'pedir_cambios'            then v_est := 'cambios_solicitados'; v_et := 'laura';
  elsif l = 'resuelto'                 then v_est := 'resuelta';            v_et := 'cerrada';
  else                                      v_est := 'aprobada';            v_et := 'cerrada';
  end if;
  update public.solicitudes
     set estado_global = v_est, etapa = v_et, congelada = (l = 'aprobado') is true, actualizado_at = now()
   where id = p_id;
end $$;

-- ---------- Decidir (una solicitud, una etapa) ----------
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

  perform public._recalcular_estado(s.id);
  select * into s from public.solicitudes where id = p_solicitud;
  return json_build_object('folio', s.folio, 'estado', s.estado_global);
end $$;

-- ---------- Aprobar en lote (todas o ninguna) ----------
create or replace function public.decidir_lote(p_ids uuid[], p_etapa public.etapa)
returns json language plpgsql security definer set search_path = public as $$
declare v uuid; n int := 0; s public.solicitudes%rowtype;
begin
  foreach v in array coalesce(p_ids, '{}') loop
    select * into s from public.solicitudes where id = v;
    if not found then raise exception 'No encontre una de las solicitudes'; end if;
    if not exists (select 1 from public.decisiones d where d.solicitud_id = v and d.etapa = p_etapa and d.decision = 'pendiente') then
      raise exception 'La % ya no esta pendiente (alguien la decidio). Recarga y vuelve a intentar.', s.folio;
    end if;
    perform public.decidir(v, p_etapa, 'aprobado', null);
    n := n + 1;
  end loop;
  return json_build_object('aprobadas', n);
end $$;

-- ---------- Editar la redaccion (solo Gaby y Laura) ----------
create or replace function public.editar_redaccion(p_solicitud uuid, p_texto text)
returns json language plpgsql security definer set search_path = public as $$
declare
  yo uuid := public.mi_empleado_id();
  s public.solicitudes%rowtype;
  v_txt text := trim(regexp_replace(coalesce(p_texto, ''), '\s+', ' ', 'g'));
begin
  select * into s from public.solicitudes where id = p_solicitud for update;
  if not found or not public.puedo_ver_solicitud(s) then raise exception 'No encontre esa solicitud'; end if;
  if not (public.puedo_decidir(s, 'gaby') or public.puedo_decidir(s, 'laura')) then
    raise exception 'Solo Gaby y Laura pueden editar la redaccion';
  end if;
  if s.congelada then raise exception 'La % ya la aprobo Laura y quedo congelada', s.folio; end if;
  if s.corregida_por is not null then raise exception 'La % ya se corrigio: edita la correccion', s.folio; end if;
  if v_txt = '' then raise exception 'La redaccion no puede quedar vacia'; end if;
  if v_txt = s.redaccion then return json_build_object('folio', s.folio, 'sin_cambios', true); end if;
  update public.solicitudes
     set redaccion_antes = s.redaccion, redaccion = v_txt, redaccion_por = yo, redaccion_at = now(), actualizado_at = now()
   where id = s.id;
  return json_build_object('folio', s.folio);
end $$;

-- ---------- Corregir una solicitud (-R1, -R2...) ----------
-- p: { folio, que_cambio, y SOLO lo que cambia: fecha_inicio, fecha_fin, hora_ref, hora_fin, proyecto_id,
--      tipo (solo dentro de "llegada"), horas_calculadas, calculo, horario_oficial, verificacion, redaccion }
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
    'no',  -- la correccion no mueve el banco (07 #B2, se decide en la Fase 4)
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

-- ---------- Contador de "Mi bandeja" ----------
create or replace function public.contar_pendientes()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'jefe',  count(*) filter (where s.estado_global = 'nueva_espera_jefe' and public.puedo_decidir(s, 'jefe')),
    'gaby',  count(*) filter (where s.estado_global = 'espera_gaby'       and public.puedo_decidir(s, 'gaby')),
    'laura', count(*) filter (where s.estado_global = 'espera_laura'      and public.puedo_decidir(s, 'laura')))
  from public.solicitudes s
  where public.puedo_ver_solicitud(s);
$$;

-- ---------- Permisos ----------
revoke all on function public._recalcular_estado(uuid) from public, anon, authenticated;
revoke all on function public.puedo_decidir(public.solicitudes, public.etapa) from public, anon;
revoke all on function public.decidir(uuid, public.etapa, public.decision, text) from public, anon;
revoke all on function public.decidir_lote(uuid[], public.etapa) from public, anon;
revoke all on function public.editar_redaccion(uuid, text) from public, anon;
revoke all on function public.corregir_solicitud(jsonb) from public, anon;
revoke all on function public.contar_pendientes() from public, anon;
grant execute on function public.puedo_decidir(public.solicitudes, public.etapa) to authenticated;
grant execute on function public.decidir(uuid, public.etapa, public.decision, text) to authenticated;
grant execute on function public.decidir_lote(uuid[], public.etapa) to authenticated;
grant execute on function public.editar_redaccion(uuid, text) to authenticated;
grant execute on function public.corregir_solicitud(jsonb) to authenticated;
grant execute on function public.contar_pendientes() to authenticated;

-- Comprobacion: debe salir 1 renglon con "si" en todo.
select case when exists (select 1 from pg_proc where proname = 'decidir') then 'si' else 'no' end as decidir,
       case when exists (select 1 from pg_proc where proname = 'corregir_solicitud') then 'si' else 'no' end as corregir,
       (select decide_solo_pruebas from public.empleados where iniciales = 'VMM') as valen_solo_pruebas;
