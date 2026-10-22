-- =====================================================================
-- Permisos UT · 009 · Rechazo de Gaby/Laura regresa las horas + avisos
-- Pegar COMPLETO en Supabase > SQL Editor > New query > Run.
-- Se puede correr dos veces sin romper nada.
-- =====================================================================

-- ---------- Avisos dentro de la app (salen en el Inicio hasta que la persona da "Entendido") ----------
create table if not exists public.avisos (
  id           bigserial primary key,
  para         uuid not null references public.empleados(id),
  texto        text not null,
  solicitud_id uuid references public.solicitudes(id),
  es_prueba    boolean not null default false,
  creado_at    timestamptz not null default now(),
  visto_at     timestamptz
);
create index if not exists avisos_para on public.avisos (para, visto_at);
alter table public.avisos enable row level security;
-- Cada quien ve los suyos; los de prueba solo un administrador.
drop policy if exists avisos_leer on public.avisos;
create policy avisos_leer on public.avisos for select to authenticated
  using (case when es_prueba then public.tengo_rol('admin') else para = public.mi_empleado_id() end);
revoke insert, update, delete on public.avisos from anon, authenticated;

create or replace function public.aviso_visto(p_id bigint)
returns void language sql security definer set search_path = public as $$
  update public.avisos set visto_at = now()
  where id = p_id and visto_at is null
    and (para = public.mi_empleado_id() or (es_prueba and public.tengo_rol('admin')));
$$;

-- ---------- Deshacer el banco por un rechazo de Gaby o Laura ----------
create or replace function public._deshacer_por_rechazo(p_id uuid, p_etapa public.etapa, p_com text)
returns void language plpgsql security definer set search_path = public as $$
declare
  s public.solicitudes%rowtype; m public.movimientos%rowtype; v_aprobo uuid; v_quien text; v_emp text; v_hor text; v_txt text;
begin
  select * into s from public.solicitudes where id = p_id;
  select * into m from public.movimientos x where x.solicitud_id = p_id and x.tipo <> 'reverso'
    and not exists (select 1 from public.movimientos r where r.revierte_a = x.id) order by x.id desc limit 1;
  if not found then return; end if;  -- no habia movido el banco
  v_quien := case p_etapa when 'gaby' then 'Gaby' else 'Laura' end;
  perform public._revertir_banco(p_id, 'rechazada por ' || v_quien);
  select coalesce(nombre_corto, split_part(nombre_oficial, ' ', 1)) into v_emp from public.empleados where id = s.empleado_id;
  v_hor := trim(to_char(abs(m.horas), 'FM990.99')) || ' h';
  v_txt := case when m.cuenta = 'reposicion' then 'se deshizo su movimiento de reposición (' || v_hor || ')'
                when m.horas < 0 then 'se regresaron ' || v_hor || ' al banco' else 'se quitaron ' || v_hor || ' que se habían sumado al banco' end;
  insert into public.avisos (para, texto, solicitud_id, es_prueba)
  values (s.empleado_id, v_quien || ' rechazó tu ' || s.folio || coalesce(' (“' || p_com || '”)', '') || ': ' || v_txt || '.', s.id, s.es_prueba);
  select decidido_por into v_aprobo from public.decisiones where solicitud_id = p_id and etapa = public._etapa_banco(p_id);
  if v_aprobo is not null and v_aprobo <> s.empleado_id then
    insert into public.avisos (para, texto, solicitud_id, es_prueba)
    values (v_aprobo, v_quien || ' rechazó la ' || s.folio || ' de ' || v_emp || ' que aprobaste' || coalesce(' (“' || p_com || '”)', '') || ': ' || v_txt || '.', s.id, s.es_prueba);
  end if;
end $$;

-- ---------- Decidir (igual que en el 008 + rechazo de Gaby/Laura) ----------
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
  -- Gaby o Laura rechazan algo que ya movio el banco: se deshace y se avisa al empleado y a quien lo aprobo
  elsif p_decision = 'rechazado' then
    perform public._deshacer_por_rechazo(s.id, p_etapa, v_com);
  -- si luego cambian el rechazo por otra cosa (y el banco seguia aprobado) se vuelve a registrar
  elsif p_decision in ('aprobado','resuelto') and exists (select 1 from public.decisiones d where d.solicitud_id = s.id
        and d.etapa = public._etapa_banco(s.id) and d.decision = 'aprobado') then
    perform public._registrar_banco(s.id);
  end if;

  perform public._recalcular_estado(s.id);
  select * into s from public.solicitudes where id = p_solicitud;
  return json_build_object('folio', s.folio, 'estado', s.estado_global);
end $$;

-- ---------- Borrar pruebas: ahora tambien sus avisos ----------
create or replace function public.borrar_pruebas(p_confirmar boolean default false)
returns json language plpgsql security definer set search_path = public as $$
declare v_sol int; v_mov int;
begin
  if not public.tengo_rol('admin') then raise exception 'Solo un administrador puede borrar pruebas'; end if;
  select count(*) into v_sol from public.solicitudes where es_prueba;
  select count(*) into v_mov from public.movimientos where es_prueba;
  if not p_confirmar then return json_build_object('solicitudes', v_sol, 'movimientos', v_mov, 'borrado', false); end if;
  perform set_config('ut.borrando_pruebas', '1', true);
  delete from public.avisos where es_prueba;
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
revoke all on function public._deshacer_por_rechazo(uuid, public.etapa, text) from public, anon, authenticated;
revoke all on function public.aviso_visto(bigint) from public, anon;
grant execute on function public.aviso_visto(bigint) to authenticated;

-- Comprobacion: debe salir 1 renglon con "si" en todo.
select case when exists (select 1 from pg_class where relname = 'avisos') then 'si' else 'no' end as avisos,
       case when exists (select 1 from pg_proc where proname = '_deshacer_por_rechazo') then 'si' else 'no' end as rechazo;
