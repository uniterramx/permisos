-- Pruebas del SQL 012 (vacaciones) en el Postgres local que imita Supabase.
-- Correr DESPUES de 001, 003-012 y de dar PINs (ver LEEME). Deja todo como estaba (rollback al final).
-- Cada "assert" que falla detiene el script con el mensaje.
\set ON_ERROR_STOP 1
begin;
create or replace function public._t_como(p_ini text) returns void language sql security definer as $$
  select set_config('request.jwt.claim.sub', (select a.auth_pin_id::text from public.accesos a join public.empleados e on e.id = a.empleado_id where e.iniciales = p_ini), true);
$$;
grant execute on function public._t_como(text) to authenticated;
create or replace function public._t_emp(p_ini text) returns uuid language sql stable as $$ select id from public.empleados where iniciales = p_ini $$;
grant execute on function public._t_emp(text) to authenticated;
create or replace function public._t_anio(p_ini text, p_k int) returns jsonb language sql security definer as $$
  select to_jsonb(a) from public._vac_anios(public._t_emp(p_ini), true, p_k) a where a.k = p_k $$;
grant execute on function public._t_anio(text, int) to authenticated;

-- Datos: fechas de ingreso (ejemplo) y un festivo
update public.empleados set fecha_ingreso = '2022-02-01' where iniciales = 'OPC';
update public.empleados set fecha_ingreso = '2025-04-01' where iniciales = 'KYGS';
update public.empleados set fecha_ingreso = '2026-02-16' where iniciales = 'VMM';
insert into public.festivos (fecha, nombre, origen) values ('2026-12-25', 'Navidad', 'ley'), ('2026-11-16', 'Revolución', 'ley');

-- 1) Dias habiles: 23 al 28 dic 2026 = mie 23, jue 24, lun 28 (vie 25 festivo, sab/dom no)
do $$ begin assert (select count(*) from public._vac_habiles('2026-12-23', '2026-12-28')) = 3, 'habiles 23-28 dic'; end $$;
-- Ley
do $$ begin assert public._vac_ley(0) = 0 and public._vac_ley(1) = 12 and public._vac_ley(4) = 18 and public._vac_ley(5) = 20
  and public._vac_ley(7) = 22 and public._vac_ley(10) = 22 and public._vac_ley(11) = 24 and public._vac_ley(19) = 26 and public._vac_ley(30) = 30, 'tabla de ley'; end $$;
-- Año laboral
do $$ begin assert public._vac_anio('2022-02-01', '2026-10-26') = 4 and public._vac_anio('2022-02-01', '2027-01-31') = 4
  and public._vac_anio('2022-02-01', '2027-02-01') = 5, 'año laboral'; end $$;

-- 2) Sin saldo de arranque, Omar (4 años) tiene los 18 de ley
set role authenticated;
select public._t_como('OPC');
do $$ begin assert (public._t_anio('OPC', 4)->>'final')::numeric = 18, 'Omar sin inicial = 18'; end $$;
-- Omar no puede hacer ajustes
do $$ begin perform public.vac_ajuste(public._t_emp('OPC'), 'ajuste', 1, 'x'); assert false, 'Omar no debe ajustar';
exception when others then if sqlerrm not like '%Solo Gaby%' then raise; end if; end $$;

-- 3) Gaby captura su saldo de arranque: 10
select public._t_como('GTB');
select public.vac_ajuste(public._t_emp('OPC'), 'inicial', 10, null);
do $$ begin assert (public._t_anio('OPC', 4)->>'final')::numeric = 10, 'inicial 10'; end $$;
do $$ begin perform public.vac_ajuste(public._t_emp('OPC'), 'inicial', 5, null); assert false, 'no dos iniciales';
exception when others then if sqlerrm not like '%Ya tiene saldo%' then raise; end if; end $$;

-- 4) Omar pide 23-28 dic (3 dias) -> alcanza; queda en espera
select public._t_como('OPC');
do $$ declare r json := public.vac_pedir('{"fecha_inicio":"2026-12-23","fecha_fin":"2026-12-28"}');
begin assert (r->>'dias')::int = 3 and not (r->>'excepcion')::boolean, 'pedido 3 dias'; end $$;
do $$ begin assert (public._t_anio('OPC', 4)->>'en_espera')::numeric = 3, 'en espera 3'; end $$;
-- No se pueden cruzar fechas
do $$ begin perform public.vac_pedir('{"fecha_inicio":"2026-12-24","fecha_fin":"2026-12-24"}'); assert false, 'cruce';
exception when others then if sqlerrm not like '%se cruzan%' then raise; end if; end $$;
-- Omar no aprueba
do $$ begin perform public.vac_decidir((select id from public.vac_pedidos where fecha_inicio = '2026-12-23'), 'aprobada'); assert false, 'Omar no aprueba';
exception when others then if sqlerrm not like '%Solo Laura%' then raise; end if; end $$;

-- 5) Laura aprueba -> apartados 3; rechazar sin comentario no se puede
select public._t_como('LZTM');
do $$ begin perform public.vac_decidir((select id from public.vac_pedidos where fecha_inicio = '2026-12-23'), 'rechazada'); assert false, 'rechazo sin comentario';
exception when others then if sqlerrm not like '%comentario%' then raise; end if; end $$;
select public.vac_decidir((select id from public.vac_pedidos where fecha_inicio = '2026-12-23'), 'aprobada');
do $$ begin assert (public._t_anio('OPC', 4)->>'apartados')::numeric = 3 and (public._t_anio('OPC', 4)->>'en_espera')::numeric = 0, 'apartados 3'; end $$;
do $$ begin assert (public.contar_pendientes()->>'vac')::int = 0, 'contador vac 0'; end $$;
-- Valen (decide solo pruebas) no aprueba vacaciones reales
select public._t_como('VMM');
do $$ begin perform public.vac_decidir((select id from public.vac_pedidos where fecha_inicio = '2026-12-23'), 'aprobada'); assert false, 'Valen no decide reales';
exception when others then if sqlerrm not like '%Solo Laura%' then raise; end if; end $$;

-- 6) Febrero 2027 cae en su 5o año: sale de los 20 nuevos, no de los 10
select public._t_como('OPC');
do $$ declare r json := public.vac_preview(public._t_emp('OPC'), '2027-02-10', '2027-02-12');
begin assert (r->'por_anio'->0->>'k')::int = 5 and (r->'por_anio'->0->>'quedan')::numeric = 20 and (r->>'alcanza')::boolean, 'feb sale del año 5: ' || r::text; end $$;
-- Una que cruza el aniversario se parte en dos años
do $$ declare r json := public.vac_preview(public._t_emp('OPC'), '2027-01-28', '2027-02-02');
begin assert json_array_length(r->'por_anio') = 2 and (r->>'dias')::int = 4, 'cruza aniversario: ' || r::text; end $$;

-- 7) Karla (1 año, 12) con arranque 1: pide 3 dias -> no alcanza; con excepcion si
select public._t_como('GTB');
select public.vac_ajuste(public._t_emp('KYGS'), 'inicial', 1, null);
select public._t_como('KYGS');
do $$ begin perform public.vac_pedir('{"fecha_inicio":"2026-12-02","fecha_fin":"2026-12-04"}'); assert false, 'Karla sin dias';
exception when others then if sqlerrm not like '%No te alcanzan%' then raise; end if; end $$;
do $$ begin perform public.vac_pedir('{"fecha_inicio":"2026-12-02","fecha_fin":"2026-12-04","excepcion":true}'); assert false, 'excepcion sin motivo';
exception when others then if sqlerrm not like '%con quien%' then raise; end if; end $$;
do $$ declare r json := public.vac_pedir('{"fecha_inicio":"2026-12-02","fecha_fin":"2026-12-04","excepcion":true,"hablado_con":"laura","motivo":"Viaje familiar ya pagado"}');
begin assert (r->>'excepcion')::boolean, 'excepcion guardada'; end $$;
select public._t_como('LZTM');
do $$ begin assert (public.contar_pendientes()->>'vac')::int = 1, 'contador vac 1'; end $$;
select public.vac_decidir((select id from public.vac_pedidos where fecha_inicio = '2026-12-02'), 'aprobada');

-- 8) Paso 2: Omar fue el lun 28; su formato es 23-24 dic ligado a sus apartadas
select public._t_como('OPC');
do $$ declare r json := public.crear_solicitud_vac(
  json_build_object('tipo','ausencia','justificacion','vacaciones','fecha_inicio','2026-12-23','fecha_fin','2026-12-24','redaccion','Ausencia a cuenta de días de vacaciones.','mueve','no')::jsonb,
  json_build_object('pedido_id', (select id from public.vac_pedidos where fecha_inicio = '2026-12-23'))::jsonb);
begin assert (select vac_dias from public.solicitudes where id = (r->>'id')::uuid) = 2, 'formato 2 dias'; end $$;
-- jefe, Gaby, Laura
select public._t_como('REMC');
select public.decidir((select id from public.solicitudes where fecha_inicio = '2026-12-23' and corrige_a is null), 'jefe', 'aprobado');
do $$ begin assert (public._t_anio('OPC', 4)->>'final')::numeric = 10, 'el jefe no descuenta'; end $$;
select public._t_como('GTB');
select public.decidir((select id from public.solicitudes where fecha_inicio = '2026-12-23' and corrige_a is null), 'gaby', 'aprobado');
select public._t_como('LZTM');
select public.decidir((select id from public.solicitudes where fecha_inicio = '2026-12-23' and corrige_a is null), 'laura', 'aprobado');
do $$ begin assert (public._t_anio('OPC', 4)->>'final')::numeric = 8 and (public._t_anio('OPC', 4)->>'apartados')::numeric = 0, 'Laura descuenta 2 y libera'; end $$;
do $$ begin assert (select estado from public.vac_pedidos where fecha_inicio = '2026-12-23') = 'usada', 'pedido usado'; end $$;
do $$ begin assert (select count(*) from public.vac_movimientos where tipo = 'tomadas' and dias = -2) = 1, 'un movimiento -2'; end $$;

-- 9) Correccion -R1 (faltó 23 al 28): al aprobarla Laura se cancela lo anterior y se descuentan 3
select public._t_como('OPC');
select public.corregir_solicitud(json_build_object('folio', (select folio from public.solicitudes where fecha_inicio = '2026-12-23' and corrige_a is null),
  'que_cambio', 'tambien falte el 28', 'fecha_fin', '2026-12-28')::jsonb);
select public._t_como('GTB');
select public.decidir((select id from public.solicitudes where corrige_a is not null and fecha_inicio = '2026-12-23'), 'gaby', 'aprobado');
select public._t_como('LZTM');
select public.decidir((select id from public.solicitudes where corrige_a is not null and fecha_inicio = '2026-12-23'), 'laura', 'aprobado');
do $$ begin assert (public._t_anio('OPC', 4)->>'final')::numeric = 7, '-R1: 10 - 3 = 7, no 5: ' || (public._t_anio('OPC', 4)->>'final')::numeric; end $$;
do $$ begin assert (select count(*) from public.vac_movimientos where tipo = 'reverso') = 1, 'un reverso'; end $$;

-- 10) Karla: formato con excepcion; queda en -2 y el siguiente año empieza con 14 - 2 = 12
select public._t_como('KYGS');
do $$ begin perform public.crear_solicitud_vac(
  json_build_object('tipo','ausencia','justificacion','vacaciones','fecha_inicio','2026-12-02','fecha_fin','2026-12-04','redaccion','Ausencia a cuenta de días de vacaciones.','mueve','no')::jsonb,
  json_build_object('pedido_id', (select id from public.vac_pedidos where fecha_inicio = '2026-12-02'))::jsonb);
  assert false, 'sin excepcion no deberia pasar';
exception when others then if sqlerrm not like '%No te alcanzan%' then raise; end if; end $$;
do $$ begin perform public.crear_solicitud_vac(
  json_build_object('tipo','ausencia','justificacion','vacaciones','fecha_inicio','2026-12-02','fecha_fin','2026-12-04','redaccion','x','mueve','no')::jsonb,
  json_build_object('pedido_id', (select id from public.vac_pedidos where fecha_inicio = '2026-12-02'), 'excepcion', true, 'motivo', 'sin con quien')::jsonb);
  assert false, 'excepcion sin con quien';
exception when others then if sqlerrm not like '%con quien%' then raise; end if; end $$;
select public.crear_solicitud_vac(
  json_build_object('tipo','ausencia','justificacion','vacaciones','fecha_inicio','2026-12-02','fecha_fin','2026-12-04','redaccion','Ausencia a cuenta de días de vacaciones.','mueve','no')::jsonb,
  json_build_object('pedido_id', (select id from public.vac_pedidos where fecha_inicio = '2026-12-02'), 'excepcion', true, 'hablado_con', 'laura', 'motivo', 'Viaje familiar ya pagado')::jsonb);
select public._t_como('LZTM');
select public.decidir((select id from public.solicitudes where fecha_inicio = '2026-12-02'), 'jefe', 'aprobado');
select public._t_como('GTB');
select public.decidir((select id from public.solicitudes where fecha_inicio = '2026-12-02'), 'gaby', 'aprobado');
select public._t_como('LZTM');
select public.decidir((select id from public.solicitudes where fecha_inicio = '2026-12-02'), 'laura', 'aprobado');
do $$ begin assert (public._t_anio('KYGS', 1)->>'final')::numeric = -2, 'Karla -2'; end $$;
do $$ begin assert (public._t_anio('KYGS', 2)->>'base')::numeric = 12, 'préstamo: 14 - 2 = 12'; end $$;
-- Lo positivo NO se arrastra: Omar termina su 4o año con 7 y el 5o empieza con 20
do $$ begin assert (public._t_anio('OPC', 5)->>'base')::numeric = 20, 'no se acumula'; end $$;

-- 11) Aviso: vacaciones aprobadas que ya pasaron sin formato
reset role;
insert into public.vac_pedidos (empleado_id, fecha_inicio, fecha_fin, dias, estado) values (public._t_emp('OPC'), '2026-10-01', '2026-10-02', 2, 'aprobada');
set role authenticated;
select public._t_como('OPC');
do $$ begin assert json_array_length(public.vac_sin_formato()) = 1, 'Omar ve su aviso'; end $$;
select public._t_como('KYGS');
do $$ begin assert json_array_length(public.vac_sin_formato()) = 0, 'Karla no ve el de Omar'; end $$;
select public._t_como('GTB');
do $$ begin assert json_array_length(public.vac_sin_formato()) = 1, 'Gaby ve el de Omar'; end $$;

-- 12) Quien ve que: Karla no ve a Omar; Raul (jefe de Taller) si; Laura todos
select public._t_como('KYGS');
do $$ begin assert (select count(*) from public.vac_pedidos where empleado_id = public._t_emp('OPC')) = 0, 'Karla no ve pedidos de Omar'; end $$;
do $$ begin perform public.vac_resumen(public._t_emp('OPC')); assert false, 'Karla no ve resumen de Omar';
exception when others then if sqlerrm not like '%No puedes%' then raise; end if; end $$;
select public._t_como('REMC');
do $$ begin assert (select count(*) from public.vac_pedidos where empleado_id = public._t_emp('OPC')) = 2, 'Raul ve a Omar'; end $$;
do $$ begin assert (select count(*) from public.vac_pedidos where empleado_id = public._t_emp('KYGS')) = 0, 'Raul no ve a Karla'; end $$;
select public._t_como('LZTM');
do $$ begin assert json_array_length(public.vac_resumen_todos()) >= 20, 'Laura ve a todos'; end $$;

-- 13) Pruebas de Valen: su ajuste queda de prueba y Omar no lo ve; borrar pruebas lo quita
select public._t_como('GTB');  -- Gaby real no hace pruebas
select public._t_como('VMM');
select public.vac_ajuste(public._t_emp('OPC'), 'ajuste', 5, 'prueba');
do $$ begin assert (select es_prueba from public.vac_movimientos where referencia = 'prueba'), 'ajuste de Valen = prueba'; end $$;
select public._t_como('OPC');
do $$ begin assert (select (x->>'final')::numeric from json_array_elements(public.vac_resumen(public._t_emp('OPC'))->'anios') x where (x->>'k')::int = 4) = 7, 'Omar no ve la prueba'; end $$;
select public._t_como('VMM');
do $$ begin assert (public.borrar_pruebas(false)->>'vacaciones')::int = 1, 'cuenta 1 prueba'; end $$;
select public.borrar_pruebas(true);
do $$ begin assert not exists (select 1 from public.vac_movimientos where es_prueba), 'pruebas borradas'; end $$;

-- 14) Append-only: no se borra ni edita
reset role;
do $$ begin delete from public.vac_movimientos; assert false, 'no debe borrar';
exception when others then if sqlerrm not like '%no se editan%' then raise; end if; end $$;
-- Pavel no lleva
set role authenticated;
select public._t_como('GTB');
do $$ begin perform public.vac_ajuste(public._t_emp('PMR'), 'ajuste', 1, 'x'); assert false, 'Pavel';
exception when others then if sqlerrm not like '%no lleva%' then raise; end if; end $$;
-- Festivos: Omar no puede; Gaby si y avisa las afectadas
select public._t_como('OPC');
do $$ begin perform public.festivo_agregar('2026-12-24', 'Nochebuena'); assert false, 'Omar festivo';
exception when others then if sqlerrm not like '%Solo Gaby%' then raise; end if; end $$;
select public._t_como('GTB');
do $$ begin assert (public.festivo_agregar('2026-12-24', 'Nochebuena')->>'afectadas')::int = 1, 'una vacacion afectada'; end $$;

reset role;
select 'TODAS LAS PRUEBAS 012 PASARON' as resultado;
rollback;
