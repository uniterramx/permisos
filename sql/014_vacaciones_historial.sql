-- =====================================================================
-- Permisos UT · 014 · Vacaciones: "tomadas antes" con fechas, historial y reinicio de la carga
-- Pegar COMPLETO en Supabase > SQL Editor > New query > Run. Correr DESPUES del 013.
-- Se puede correr dos veces sin romper nada.
--
-- Decision de Valen (28-oct): ya no hay "saldo de arranque". Cada persona queda asi:
--   lo que le toca por ley (la app lo pone sola con su fecha de ingreso)
--   + Ajuste (Gaby, con motivo; p. ej. "2 dias del año pasado")
--   - Tomadas antes (Gaby, con fechas del / al) -> salen en el historial
-- Lo que Gaby ya habia cargado (saldos de arranque y ajustes reales) se cancela con reverso
-- (nada se borra) para empezar de 0.
-- =====================================================================

-- ---------- "Tomadas antes": nuevo tipo de movimiento con fecha de fin ----------
alter table public.vac_movimientos add column if not exists fecha_fin date;
alter table public.vac_movimientos drop constraint if exists vac_movimientos_tipo_check;
alter table public.vac_movimientos add constraint vac_movimientos_tipo_check check (tipo in ('inicial', 'tomadas', 'reverso', 'ajuste', 'previas'));

-- ---------- Saldo por año: un "inicial" cancelado ya no cuenta (ni su reverso) ----------
create or replace function public._vac_anios(p_emp uuid, p_sin_pruebas boolean default false, p_hasta int default null)
returns table (k int, desde date, hasta date, ley int, base numeric, movs numeric, final numeric,
               apartados numeric, en_espera numeric, tiene_inicial boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_ing date := (select e.fecha_ingreso from public.empleados e where e.id = p_emp);
  v_pr boolean := public.tengo_rol('admin') and not p_sin_pruebas;
  v_hoy int; v_ini int; v_max int; i int; v_prev numeric := null; v_tiene boolean; v_base numeric; v_movs numeric;
begin
  if v_ing is null then return; end if;
  v_hoy := public._vac_anio(v_ing, public._hoy_mx());
  v_ini := coalesce((select min(public._vac_anio(v_ing, m.fecha)) from public.vac_movimientos m
                     where m.empleado_id = p_emp and m.tipo = 'inicial' and (v_pr or not m.es_prueba)
                       and not exists (select 1 from public.vac_movimientos r where r.revierte_a = m.id)), 0);
  v_max := greatest(v_hoy,
    coalesce((select max(public._vac_anio(v_ing, m.fecha)) from public.vac_movimientos m where m.empleado_id = p_emp), 0),
    coalesce((select max(public._vac_anio(v_ing, p.fecha_fin)) from public.vac_pedidos p
              where p.empleado_id = p_emp and p.estado in ('espera_laura', 'aprobada')), 0),
    coalesce(p_hasta, 0));
  i := v_ini;
  while i <= v_max loop
    v_tiene := exists (select 1 from public.vac_movimientos m where m.empleado_id = p_emp and m.tipo = 'inicial'
                       and (v_pr or not m.es_prueba) and public._vac_anio(v_ing, m.fecha) = i
                       and not exists (select 1 from public.vac_movimientos r where r.revierte_a = m.id));
    if v_tiene then
      v_base := (select coalesce(sum(m.dias), 0) from public.vac_movimientos m where m.empleado_id = p_emp and m.tipo = 'inicial'
                 and (v_pr or not m.es_prueba) and public._vac_anio(v_ing, m.fecha) = i
                 and not exists (select 1 from public.vac_movimientos r where r.revierte_a = m.id));
    else
      v_base := public._vac_ley(i) + least(0, coalesce(v_prev, 0));
    end if;
    -- todo lo demas del año, menos los "inicial" y los reversos de un "inicial"
    v_movs := (select coalesce(sum(m.dias), 0) from public.vac_movimientos m where m.empleado_id = p_emp and m.tipo <> 'inicial'
               and (v_pr or not m.es_prueba) and public._vac_anio(v_ing, m.fecha) = i
               and not (m.tipo = 'reverso' and exists (select 1 from public.vac_movimientos o where o.id = m.revierte_a and o.tipo = 'inicial')));
    k := i;
    desde := (v_ing + make_interval(years => i))::date;
    hasta := (v_ing + make_interval(years => i + 1))::date - 1;
    ley := public._vac_ley(i);
    base := v_base; movs := v_movs; final := v_base + v_movs; tiene_inicial := v_tiene;
    apartados := (select count(*) from public.vac_pedidos p, public._vac_habiles(p.fecha_inicio, p.fecha_fin) h
                  where p.empleado_id = p_emp and p.estado = 'aprobada' and (v_pr or not p.es_prueba)
                    and public._vac_anio(v_ing, h.dia) = i);
    en_espera := (select count(*) from public.vac_pedidos p, public._vac_habiles(p.fecha_inicio, p.fecha_fin) h
                  where p.empleado_id = p_emp and p.estado = 'espera_laura' and (v_pr or not p.es_prueba)
                    and public._vac_anio(v_ing, h.dia) = i);
    return next;
    v_prev := v_base + v_movs;
    i := i + 1;
  end loop;
end $$;

-- ---------- Resumen de una persona: ahora con los datos del formato para el historial ----------
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
    'movimientos', coalesce((select json_agg(json_build_object('id', m.id, 'tipo', m.tipo, 'dias', m.dias, 'fecha', m.fecha, 'fecha_fin', m.fecha_fin,
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

-- ---------- Vacaciones de todos: "Tomados" ahora incluye las tomadas antes ----------
create or replace function public.vac_resumen_todos(p_sin_pruebas boolean default false)
returns json language plpgsql stable security definer set search_path = public as $$
declare v_hoy date := public._hoy_mx();
begin
  return coalesce((
    select json_agg(json_build_object(
      'empleado_id', e.id, 'lleva', e.lleva_vacaciones, 'fecha_ingreso', e.fecha_ingreso,
      'k', a.k, 'le_tocan', a.base, 'ley', a.ley, 'tiene_inicial', a.tiene_inicial,
      'tomadas', coalesce((select -sum(m.dias) from public.vac_movimientos m where m.empleado_id = e.id
                           and (m.tipo in ('tomadas', 'previas')
                                or (m.tipo = 'reverso' and exists (select 1 from public.vac_movimientos o where o.id = m.revierte_a and o.tipo in ('tomadas', 'previas'))))
                           and (not m.es_prueba or (public.tengo_rol('admin') and not p_sin_pruebas))
                           and public._vac_anio(e.fecha_ingreso, m.fecha) = a.k), 0),
      'quedan', a.final, 'apartados', a.apartados, 'en_espera', a.en_espera, 'hasta', a.hasta,
      'aniversario', case when e.fecha_ingreso is null then null else a.hasta + 1 end))
    from public.empleados e
    left join lateral (select x.* from public._vac_anios(e.id, p_sin_pruebas) x
                       where x.k = public._vac_anio(e.fecha_ingreso, v_hoy)) a on true
    where e.activo and public.puedo_ver_vac(e.id, false)), '[]');
end $$;

-- ---------- Registrar vacaciones tomadas antes de la app (solo Gaby; Valen solo en pruebas) ----------
-- p_dias: si va vacio se cuentan los dias habiles (L-V sin festivos) entre las fechas.
create or replace function public.vac_previa(p_empleado uuid, p_ini date, p_fin date, p_dias numeric default null, p_nota text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  yo uuid := public.mi_empleado_id(); v_prueba boolean; e public.empleados%rowtype;
  v_fin date := coalesce(p_fin, p_ini); v_hab int; v_anios int;
  v_nota text := coalesce(nullif(trim(coalesce(p_nota, '')), ''), 'Tomadas antes de la app');
begin
  if not public.tengo_rol('filtro') then raise exception 'Solo Gaby puede registrar vacaciones tomadas antes'; end if;
  v_prueba := exists (select 1 from public.empleados x where x.id = yo and x.decide_solo_pruebas);
  e := (select x from public.empleados x where x.id = p_empleado);
  if e.id is null then raise exception 'No encontre a esa persona'; end if;
  if not e.lleva_vacaciones then raise exception 'Esta persona no lleva conteo de vacaciones'; end if;
  if e.fecha_ingreso is null then raise exception 'Primero captura su fecha de ingreso (Personas)'; end if;
  if p_ini is null or v_fin < p_ini then raise exception 'Revisa las fechas'; end if;
  if v_fin - p_ini > 120 then raise exception 'Son demasiados dias: registralas por partes'; end if;
  v_hab := (select count(*) from public._vac_habiles(p_ini, v_fin));
  v_anios := (select count(distinct public._vac_anio(e.fecha_ingreso, h.dia)) from public._vac_habiles(p_ini, v_fin) h);
  if p_dias is not null and (p_dias <= 0 or p_dias > 60 or p_dias <> round(p_dias * 2) / 2) then
    raise exception 'Los dias van enteros o en medios (0.5) y mayores a 0';
  end if;
  if coalesce(p_dias, v_hab) = 0 then raise exception 'En esas fechas no hay dias habiles: escribe cuantos dias fueron'; end if;
  if v_anios > 1 and p_dias is not null and p_dias <> v_hab then
    raise exception 'Esas fechas cruzan su aniversario: registralas en dos partes (antes y despues del aniversario)';
  end if;
  if v_anios > 1 then  -- se parte en un renglon por año laboral
    insert into public.vac_movimientos (empleado_id, tipo, dias, fecha, fecha_fin, referencia, es_prueba, registrado_por)
    select e.id, 'previas', -count(*), min(h.dia), max(h.dia), v_nota, v_prueba, yo
    from public._vac_habiles(p_ini, v_fin) h group by public._vac_anio(e.fecha_ingreso, h.dia);
  else
    insert into public.vac_movimientos (empleado_id, tipo, dias, fecha, fecha_fin, referencia, es_prueba, registrado_por)
    values (e.id, 'previas', -coalesce(p_dias, v_hab), p_ini, v_fin, v_nota, v_prueba, yo);
  end if;
  return json_build_object('dias', coalesce(p_dias, v_hab), 'prueba', v_prueba);
end $$;

-- ---------- Quitar una "tomada antes" o un ajuste mal puesto (queda como reverso; solo Gaby) ----------
create or replace function public.vac_quitar(p_mov bigint)
returns json language plpgsql security definer set search_path = public as $$
declare yo uuid := public.mi_empleado_id(); m public.vac_movimientos%rowtype;
begin
  if not public.tengo_rol('filtro') then raise exception 'Solo Gaby puede quitar registros'; end if;
  m := (select x from public.vac_movimientos x where x.id = p_mov);
  if m.id is null then raise exception 'No encontre ese registro'; end if;
  if m.tipo not in ('previas', 'ajuste', 'inicial') then raise exception 'Ese registro viene de un formato: se corrige con una correccion'; end if;
  if m.es_prueba <> exists (select 1 from public.empleados x where x.id = yo and x.decide_solo_pruebas) then raise exception 'No te toca ese registro'; end if;
  if exists (select 1 from public.vac_movimientos r where r.revierte_a = m.id) then raise exception 'Ese registro ya se habia quitado'; end if;
  insert into public.vac_movimientos (empleado_id, tipo, dias, fecha, fecha_fin, referencia, revierte_a, es_prueba, registrado_por)
  values (m.empleado_id, 'reverso', -m.dias, m.fecha, m.fecha_fin, 'Reverso: quitado por ' || coalesce((select coalesce(nombre_corto, split_part(nombre_oficial, ' ', 1)) from public.empleados where id = yo), ''), m.id, m.es_prueba, yo);
  return json_build_object('ok', true);
end $$;

-- ---------- Ajuste: ya no se captura "saldo de arranque" ----------
create or replace function public.vac_ajuste(p_empleado uuid, p_tipo text, p_dias numeric, p_motivo text)
returns json language plpgsql security definer set search_path = public as $$
declare
  yo uuid := public.mi_empleado_id(); v_prueba boolean; e public.empleados%rowtype;
  v_mot text := nullif(trim(coalesce(p_motivo, '')), '');
begin
  if not public.tengo_rol('filtro') then raise exception 'Solo Gaby puede hacer ajustes a mano'; end if;
  if p_tipo <> 'ajuste' then raise exception 'El saldo de arranque ya no se usa: registra las vacaciones tomadas antes y, si hace falta, un ajuste'; end if;
  v_prueba := exists (select 1 from public.empleados x where x.id = yo and x.decide_solo_pruebas);
  e := (select x from public.empleados x where x.id = p_empleado);
  if e.id is null then raise exception 'No encontre a esa persona'; end if;
  if not e.lleva_vacaciones then raise exception 'Esta persona no lleva conteo de vacaciones'; end if;
  if e.fecha_ingreso is null then raise exception 'Primero captura su fecha de ingreso (Personas)'; end if;
  if p_dias is null or p_dias = 0 or abs(p_dias) > 60 then raise exception 'Escribe los dias (+ suma, - resta)'; end if;
  if p_dias <> round(p_dias * 2) / 2 then raise exception 'Los dias van enteros o en medios (0.5)'; end if;
  if v_mot is null then raise exception 'Escribe el motivo del ajuste'; end if;
  insert into public.vac_movimientos (empleado_id, tipo, dias, fecha, referencia, es_prueba, registrado_por)
  values (e.id, 'ajuste', p_dias, public._hoy_mx(), v_mot, v_prueba, yo);
  return json_build_object('ok', true, 'prueba', v_prueba);
end $$;

-- ---------- Empezar de 0: cancelar con reverso lo que ya se habia cargado a mano (saldos de arranque y ajustes reales) ----------
insert into public.vac_movimientos (empleado_id, tipo, dias, fecha, fecha_fin, referencia, revierte_a, es_prueba, registrado_por)
select m.empleado_id, 'reverso', -m.dias, m.fecha, m.fecha_fin, 'Reverso: reinicio de la carga (28-oct)', m.id, false, null
from public.vac_movimientos m
where not m.es_prueba and m.tipo in ('inicial', 'ajuste')
  and not exists (select 1 from public.vac_movimientos r where r.revierte_a = m.id);

-- ---------- Permisos ----------
revoke all on function public.vac_previa(uuid, date, date, numeric, text) from public, anon;
revoke all on function public.vac_quitar(bigint) from public, anon;
grant execute on function public.vac_previa(uuid, date, date, numeric, text) to authenticated;
grant execute on function public.vac_quitar(bigint) to authenticated;

-- Comprobacion: debe salir 1 renglon: "si", "si" y 0 cargas pendientes de reiniciar.
select case when exists (select 1 from pg_proc where proname = 'vac_previa') then 'si' else 'no' end as tomadas_antes,
       case when exists (select 1 from pg_proc where proname = 'vac_quitar') then 'si' else 'no' end as quitar,
       (select count(*) from public.vac_movimientos m where not m.es_prueba and m.tipo in ('inicial', 'ajuste')
          and not exists (select 1 from public.vac_movimientos r where r.revierte_a = m.id)) as sin_reiniciar;
