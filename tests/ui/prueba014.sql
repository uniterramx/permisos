-- Pruebas del SQL 014 (tomadas antes, quitar, reinicio). Correr despues de 012 y 014 con PINs dados. Rollback al final.
\set ON_ERROR_STOP 1
begin;
create or replace function public._t_como(p_ini text) returns void language sql security definer as $$
  select set_config('request.jwt.claim.sub', (select a.auth_pin_id::text from public.accesos a join public.empleados e on e.id = a.empleado_id where e.iniciales = p_ini), true); $$;
grant execute on function public._t_como(text) to authenticated;
create or replace function public._t_emp(p_ini text) returns uuid language sql stable as $$ select id from public.empleados where iniciales = p_ini $$;
grant execute on function public._t_emp(text) to authenticated;
create or replace function public._t_fin(p_ini text) returns numeric language sql security definer as $$
  select a.final from public._vac_anios(public._t_emp(p_ini), true) a where a.k = public._vac_anio((select fecha_ingreso from public.empleados where iniciales = p_ini), public._hoy_mx()) $$;
grant execute on function public._t_fin(text) to authenticated;
update public.empleados set fecha_ingreso = '2022-02-01' where iniciales = 'OPC';
update public.empleados set fecha_ingreso = '2022-02-01' where iniciales = 'JAMV';
-- un "inicial" viejo de JAMV (como lo que Gaby ya cargo) y su reinicio
reset role;
insert into public.vac_movimientos (empleado_id, tipo, dias, fecha) values (public._t_emp('JAMV'), 'inicial', 5, '2026-10-20');
insert into public.vac_movimientos (empleado_id, tipo, dias, fecha, referencia, revierte_a)
select empleado_id, 'reverso', -dias, fecha, 'Reverso: reinicio', id from public.vac_movimientos where tipo = 'inicial';
do $$ begin assert public._t_fin('JAMV') = 18, 'inicial cancelado: vuelve a la ley (18): ' || public._t_fin('JAMV'); end $$;

set role authenticated;
select public._t_como('GTB');
-- Caso de Valen: 18 por ley + 2 del año pasado - 10 tomadas (10 al 21 ago 2026) = 10
select public.vac_ajuste(public._t_emp('OPC'), 'ajuste', 2, '2 días del año pasado (acuerdo)');
do $$ declare r json := public.vac_previa(public._t_emp('OPC'), '2026-08-10', '2026-08-21', null, 'Viaje');
begin assert (r->>'dias')::numeric = 10, 'cuenta 10 habiles'; end $$;
do $$ begin assert public._t_fin('OPC') = 10, '18 + 2 - 10 = 10: ' || public._t_fin('OPC'); end $$;
-- dias a mano (medio dia)
select public.vac_previa(public._t_emp('OPC'), '2026-09-04', '2026-09-04', 0.5, null);
do $$ begin assert public._t_fin('OPC') = 9.5, 'medio dia'; end $$;
-- quitar el medio dia: reverso
select public.vac_quitar((select id from public.vac_movimientos where dias = -0.5));
do $$ begin assert public._t_fin('OPC') = 10, 'quitado'; end $$;
do $$ begin perform public.vac_quitar((select id from public.vac_movimientos where dias = -0.5)); assert false, 'dos veces';
exception when others then if sqlerrm not like '%ya se habia quitado%' then raise; end if; end $$;
-- cruza aniversario (1 feb 2027): se parte en dos años
select public.vac_previa(public._t_emp('OPC'), '2027-01-28', '2027-02-02', null, null);
do $$ begin assert (select count(*) from public.vac_movimientos where tipo = 'previas' and fecha >= '2027-01-01') = 2, 'partida en dos'; end $$;
-- ya no hay saldo de arranque
do $$ begin perform public.vac_ajuste(public._t_emp('OPC'), 'inicial', 5, null); assert false, 'inicial';
exception when others then if sqlerrm not like '%ya no se usa%' then raise; end if; end $$;
-- Omar no registra
select public._t_como('OPC');
do $$ begin perform public.vac_previa(public._t_emp('OPC'), '2026-08-10', '2026-08-10'); assert false, 'Omar';
exception when others then if sqlerrm not like '%Solo Gaby%' then raise; end if; end $$;
-- Vacaciones de todos: tomados = 10 en su año actual
select public._t_como('LZTM');
do $$ declare v numeric := (select (x->>'tomadas')::numeric from json_array_elements(public.vac_resumen_todos()) x where x->>'empleado_id' = public._t_emp('OPC')::text); begin assert v = 12, 'tomados 10 + 2 (28 y 29 ene caen en su 4o año): ' || coalesce(v::text,'null'); end $$;
-- el historial trae fecha_fin
do $$ begin assert (select count(*) from json_array_elements(public.vac_resumen(public._t_emp('OPC'))->'movimientos') x where x->>'tipo' = 'previas' and x->>'fecha_fin' is not null) >= 3, 'fecha_fin'; end $$;
reset role;
select 'TODAS LAS PRUEBAS 014 PASARON' as resultado;
rollback;
