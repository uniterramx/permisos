\set ON_ERROR_STOP 0
create or replace function pg_temp.como(ini text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', (select a.auth_pin_id::text from public.accesos a join public.empleados e on e.id=a.empleado_id where e.iniciales=ini), false); end $$;
\echo '== 5) solicitud real LAMC -> jefe -> Gaby -> Laura; PDF a Storage'
select pg_temp.como('LAMC'); set role authenticated;
select public.crear_solicitud('{"tipo":"llegada_tarde","justificacion":"uso_horas","fecha_inicio":"2026-10-27","hora_ref":"10:30","redaccion":"Variación de horario con cargo al banco.","mueve":"retiro","horas_calculadas":-1.5}') ->> 'folio' as folio \gset
reset role;
select pg_temp.como('REMC'); set role authenticated; select public.decidir((select id from solicitudes where folio=:'folio'),'jefe','aprobado'); reset role;
select pg_temp.como('LAMC'); set role authenticated;
insert into storage.objects (bucket_id,name,metadata) values ('pdfs','solicitudes/'||:'folio'||'.pdf','{"size":1}');  -- antes de Laura: no
reset role;
select pg_temp.como('GTB'); set role authenticated; select public.decidir((select id from solicitudes where folio=:'folio'),'gaby','aprobado');
insert into storage.objects (bucket_id,name,metadata) values ('pdfs','solicitudes/'||:'folio'||'.pdf','{"size":1}');  -- no congelada: no
reset role;
select pg_temp.como('LZTM'); set role authenticated; select public.decidir((select id from solicitudes where folio=:'folio'),'laura','aprobado');
insert into storage.objects (bucket_id,name,metadata) values ('pdfs','solicitudes/'||:'folio'||'.pdf','{"size":65143}');
select public.registrar_pdf('solicitud',(select id from solicitudes where folio=:'folio'), true);
select public.registrar_pdf('solicitud',(select id from solicitudes where folio=:'folio'), true);
update storage.objects set metadata='{"size":2}';  -- no se reemplaza
delete from storage.objects;                        -- no se borra
select public.espacio_pdfs();
reset role;
select pg_temp.como('LAMC'); set role authenticated; select count(*) lamc_storage from storage.objects; select count(*) lamc_docs from documentos;
insert into storage.objects (bucket_id,name,metadata) values ('pdfs','bitacoras/B-LAMC-2026-0001.pdf','{"size":5}'); select public.espacio_pdfs(); reset role;
select pg_temp.como('REMC'); set role authenticated; select count(*) jefe_storage from storage.objects; reset role;
select pg_temp.como('AEGF'); set role authenticated; select count(*) otro_storage from storage.objects; reset role;
\echo '== 6) Gaby guarda la bitacora cerrada; Gaby NO puede subir la de prueba'
select pg_temp.como('GTB'); set role authenticated;
insert into storage.objects (bucket_id,name,metadata) values ('pdfs','bitacoras/B-LAMC-2026-0001.pdf','{"size":96000}');
select public.registrar_pdf('bitacora',(select id from bitacoras where folio='B-LAMC-2026-0001'), true);
insert into storage.objects (bucket_id,name,metadata) values ('pdfs','pruebas/bitacoras/PRUEBA-B-LAMC-01.pdf','{"size":9}');
reset role;
\echo '== 7) Valen: guarda la de prueba, cuenta y borra pruebas'
select pg_temp.como('VMM'); set role authenticated;
insert into storage.objects (bucket_id,name,metadata) values ('pdfs','pruebas/bitacoras/PRUEBA-B-LAMC-01.pdf','{"size":9}');
select public.registrar_pdf('bitacora',(select id from bitacoras where folio='PRUEBA-B-LAMC-01'), true);
select ruta from documentos where es_prueba;
delete from storage.objects where name like 'pruebas/%';
delete from storage.objects where name like 'solicitudes/%';
select public.borrar_pruebas(false); select public.borrar_pruebas(true);
reset role;
select folio, es_prueba from bitacoras order by folio; select count(*) mov_prueba from movimientos where es_prueba; select ruta from documentos;
select name from storage.objects order by 1;
