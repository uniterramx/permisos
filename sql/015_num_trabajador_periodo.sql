-- =====================================================================
-- Permisos UT · 015 · Numero de trabajador y periodo de cada vacacion (P1, P2, ...)
-- Pegar COMPLETO en Supabase > SQL Editor > New query > Run. Correr DESPUES del 014.
-- Se puede correr dos veces sin romper nada.
--  · empleados.num_trabajador: texto libre ("10", "01 UT"), en blanco para que Gaby lo llene.
--  · vac_movimientos.periodo: años cumplidos el dia de la vacacion (P4 = en su 4o año). Se guarda
--    al registrarse y ya no cambia aunque luego corrijan la fecha de ingreso. Lo ya registrado se llena aqui.
-- =====================================================================

alter table public.empleados add column if not exists num_trabajador text;
alter table public.vac_movimientos add column if not exists periodo int;

-- El candado deja llenar UNA vez periodo y fecha_fin vacios (solo desde este SQL); lo demas no se toca
create or replace function public._vac_movimientos_candado()
returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('ut.borrando_pruebas', true), '') = '1' and old.es_prueba then return old; end if;
  if tg_op = 'UPDATE' and coalesce(current_setting('ut.llenando_periodo', true), '') = '1'
     and (to_jsonb(new) - 'periodo' - 'fecha_fin') = (to_jsonb(old) - 'periodo' - 'fecha_fin')
     and (old.periodo is null or old.periodo = new.periodo) and (old.fecha_fin is null or old.fecha_fin = new.fecha_fin) then
    return new;
  end if;
  raise exception 'Los movimientos de vacaciones no se editan ni se borran: se corrigen con un ajuste';
end $$;

-- Al registrar: periodo (y fecha de fin del reverso) se ponen solos
create or replace function public._vac_mov_periodo()
returns trigger language plpgsql security definer set search_path = public as $$
declare o public.vac_movimientos%rowtype;
begin
  if new.tipo = 'reverso' and new.revierte_a is not null then
    o := (select x from public.vac_movimientos x where x.id = new.revierte_a);
    new.periodo := coalesce(new.periodo, o.periodo);
    new.fecha_fin := coalesce(new.fecha_fin, o.fecha_fin);
  end if;
  if new.periodo is null then
    new.periodo := public._vac_anio((select e.fecha_ingreso from public.empleados e where e.id = new.empleado_id), new.fecha);
  end if;
  return new;
end $$;
drop trigger if exists vac_movimientos_periodo on public.vac_movimientos;
create trigger vac_movimientos_periodo before insert on public.vac_movimientos
for each row execute function public._vac_mov_periodo();

-- Las tomadas por formato ahora guardan tambien su ultimo dia
create or replace function public._vac_registrar(p_sol uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  s public.solicitudes%rowtype; e public.empleados%rowtype; a uuid; v_ped uuid;
begin
  s := (select t from public.solicitudes t where t.id = p_sol);
  if s.id is null or s.tipo <> 'ausencia' or s.justificacion is distinct from 'vacaciones' then return; end if;
  e := (select t from public.empleados t where t.id = s.empleado_id);
  if not e.lleva_vacaciones or e.fecha_ingreso is null then return; end if;
  -- Si es una correccion, se cancela lo que habian descontado las anteriores (B2)
  a := s.corrige_a;
  v_ped := s.vac_pedido_id;
  while a is not null loop
    perform public._vac_revertir(a, 'se corrigió en ' || s.folio);
    v_ped := coalesce(v_ped, (select t.vac_pedido_id from public.solicitudes t where t.id = a));
    a := (select t.corrige_a from public.solicitudes t where t.id = a);
  end loop;
  -- anti-duplicado
  if exists (select 1 from public.vac_movimientos m where m.solicitud_id = s.id and m.tipo <> 'reverso'
             and not exists (select 1 from public.vac_movimientos r where r.revierte_a = m.id)) then return; end if;
  -- un renglon por año laboral (si las vacaciones cruzan el aniversario)
  insert into public.vac_movimientos (empleado_id, tipo, dias, fecha, fecha_fin, solicitud_id, referencia, es_prueba, registrado_por)
  select s.empleado_id, 'tomadas', -count(*), min(h.dia), max(h.dia), s.id, s.folio, s.es_prueba, public.mi_empleado_id()
  from public._vac_habiles(s.fecha_inicio, s.fecha_fin) h
  group by public._vac_anio(e.fecha_ingreso, h.dia);
  -- las apartadas que uso quedan como "usadas" (lo que no tomo se libera)
  if v_ped is not null then
    update public.vac_pedidos set estado = 'usada', usada_en = s.id where id = v_ped and estado = 'aprobada';
  end if;
end $$;

create or replace function public.vac_resumen(p_emp uuid, p_sin_pruebas boolean default false)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  e public.empleados%rowtype;
  v_pr boolean := public.tengo_rol('admin') and not p_sin_pruebas;
begin
  if not public.puedo_ver_vac(p_emp, false) then raise exception 'No puedes ver las vacaciones de esa persona'; end if;
  e := (select x from public.empleados x where x.id = p_emp);
  return json_build_object(
    'empleado_id', e.id, 'lleva', e.lleva_vacaciones, 'fecha_ingreso', e.fecha_ingreso, 'hoy', public._hoy_mx(),
    'k_hoy', case when e.fecha_ingreso is null then null else public._vac_anio(e.fecha_ingreso, public._hoy_mx()) end,
    'anios', coalesce((select json_agg(row_to_json(a) order by a.k) from public._vac_anios(p_emp, p_sin_pruebas) a), '[]'),
    'movimientos', coalesce((select json_agg(json_build_object('id', m.id, 'tipo', m.tipo, 'dias', m.dias, 'fecha', m.fecha, 'fecha_fin', m.fecha_fin, 'periodo', m.periodo,
        'k', public._vac_anio(e.fecha_ingreso, m.fecha), 'referencia', m.referencia, 'revierte_a', m.revierte_a, 'es_prueba', m.es_prueba,
        'tipo_original', (select o.tipo from public.vac_movimientos o where o.id = m.revierte_a),
        'anulado', exists (select 1 from public.vac_movimientos r where r.revierte_a = m.id), 'registrado_at', m.registrado_at,
        'por', m.registrado_por,
        'sol', (select json_build_object('folio', s.folio, 'fecha_inicio', s.fecha_inicio, 'fecha_fin', s.fecha_fin, 'excepcion', s.vac_excepcion,
                  'pedido', s.vac_pedido_id is not null or exists (select 1 from public.solicitudes o where o.id = s.corrige_a and o.vac_pedido_id is not null),
                  'aprobo', d.decidido_por, 'aprobo_at', d.decidido_at)
                from public.solicitudes s left join public.decisiones d on d.solicitud_id = s.id and d.etapa = 'laura'
                where s.id = m.solicitud_id)) order by m.fecha, m.id)
      from public.vac_movimientos m where m.empleado_id = p_emp and (v_pr or not m.es_prueba)), '[]'),
    'pedidos', coalesce((select json_agg(json_build_object('id', p.id, 'fecha_inicio', p.fecha_inicio, 'fecha_fin', p.fecha_fin, 'dias', p.dias,
        'estado', p.estado, 'excepcion', p.excepcion, 'hablado_con', p.hablado_con, 'motivo', p.motivo, 'comentario', p.comentario,
        'es_prueba', p.es_prueba, 'creado_at', p.creado_at, 'usada_en', p.usada_en,
        'con_formato', exists (select 1 from public.solicitudes s where s.vac_pedido_id = p.id and s.estado_global <> 'rechazada')) order by p.fecha_inicio)
      from public.vac_pedidos p where p.empleado_id = p_emp and (v_pr or not p.es_prueba)), '[]'));
end $$;


-- ---------- Llenar lo ya registrado (una sola vez) ----------
select set_config('ut.llenando_periodo', '1', true);
update public.vac_movimientos m
   set fecha_fin = coalesce(m.fecha_fin, (select max(h.dia) from public.solicitudes s, public._vac_habiles(s.fecha_inicio, s.fecha_fin) h, public.empleados e
                                          where s.id = m.solicitud_id and e.id = m.empleado_id
                                            and public._vac_anio(e.fecha_ingreso, h.dia) = public._vac_anio(e.fecha_ingreso, m.fecha)))
 where m.tipo = 'tomadas' and m.fecha_fin is null;
update public.vac_movimientos m
   set periodo = public._vac_anio((select e.fecha_ingreso from public.empleados e where e.id = m.empleado_id), m.fecha)
 where m.periodo is null and m.tipo <> 'reverso';
update public.vac_movimientos m
   set periodo = (select o.periodo from public.vac_movimientos o where o.id = m.revierte_a),
       fecha_fin = coalesce(m.fecha_fin, (select o.fecha_fin from public.vac_movimientos o where o.id = m.revierte_a))
 where m.tipo = 'reverso' and (m.periodo is null or m.fecha_fin is null) and m.revierte_a is not null;
select set_config('ut.llenando_periodo', '', true);

-- Comprobacion: debe salir 1 renglon: "si" y 0 movimientos sin periodo.
select case when exists (select 1 from information_schema.columns where table_name = 'empleados' and column_name = 'num_trabajador') then 'si' else 'no' end as num_trabajador,
       (select count(*) from public.vac_movimientos where periodo is null) as sin_periodo;
