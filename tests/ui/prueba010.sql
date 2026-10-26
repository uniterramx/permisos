\set ON_ERROR_STOP 0
select public._dar_pin(id, '135790') from public.empleados where iniciales in ('GTB','LZTM','VMM','LAMC','REMC','AEGF');
create or replace function pg_temp.como(ini text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', (select a.auth_pin_id::text from public.accesos a join public.empleados e on e.id=a.empleado_id where e.iniciales=ini), false); end $$;
\echo '== 1) Gaby: 16 ajustes reales a LAMC -> se cierra sola a los 15'
select pg_temp.como('GTB'); set role authenticated;
select count(*) from (select public.ajuste_banco((select id from empleados where iniciales='LAMC'),'banco', case when g%3=0 then -1 else 2 end, 'aj '||g) from generate_series(1,16) g) x;
select folio, anio, saldo_anterior, saldo_final, movimientos, motivo from bitacoras;
select count(*) filter (where bitacora_id is not null) estampados, count(*) filter (where bitacora_id is null) activos from movimientos;
select texto, bitacora_id is not null con_bit from avisos;
select public.bitacora_activa((select id from empleados where iniciales='LAMC'));
reset role;
\echo '== 2) LAMC ve su bitacora; AEGF no; jefe REMC si'
select pg_temp.como('LAMC'); set role authenticated; select count(*) lamc from bitacoras; reset role;
select pg_temp.como('AEGF'); set role authenticated; select count(*) aegf from bitacoras; select public.bitacora_activa((select id from empleados where iniciales='LAMC')); reset role;
select pg_temp.como('REMC'); set role authenticated; select count(*) remc from bitacoras; reset role;
\echo '== 3) candado: editar movimiento falla; LAMC no puede cerrar; Gaby cierra a mano'
update movimientos set horas = 9 where id = 1;
update movimientos set bitacora_id = null where id = 1;
select pg_temp.como('LAMC'); set role authenticated; select public.cerrar_bitacora((select id from empleados where iniciales='LAMC')); reset role;
select pg_temp.como('GTB'); set role authenticated; select public.cerrar_bitacora((select id from empleados where iniciales='LAMC'));
select public.cerrar_bitacora((select id from empleados where iniciales='LAMC'));
select public.bitacora_activa((select id from empleados where iniciales='LAMC')); reset role;
select folio, saldo_anterior, saldo_final, movimientos, motivo from bitacoras order by cerrada_at;
\echo '== 4) Valen: 15 ajustes de prueba a LAMC -> bitacora de prueba, la real no se toca'
select pg_temp.como('VMM'); set role authenticated;
select count(*) from (select public.ajuste_banco((select id from empleados where iniciales='LAMC'),'banco', 1, 'p '||g) from generate_series(1,15) g) x;
select folio, es_prueba, movimientos, saldo_final from bitacoras order by cerrada_at;
select public.cerrar_bitacora((select id from empleados where iniciales='LAMC'));
select texto, es_prueba from avisos where es_prueba;
reset role;
select pg_temp.como('GTB'); set role authenticated; select count(*) gaby_ve from bitacoras; reset role;
