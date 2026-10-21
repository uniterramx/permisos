-- =====================================================================
-- Permisos UT · 002 · Tu acceso (Valen)
-- ANTES DE CORRER cambia 2 cosas:
--   1) TU_CORREO_AQUI  -> el correo con el que entras a Supabase
--   2) 000000          -> el PIN de 6 numeros que quieras
-- Luego: SQL Editor > New query > pegar > Run.
-- Si lo corres otra vez con otro PIN, el PIN se cambia.
-- =====================================================================

select public._dar_correo((select id from public.empleados where iniciales = 'VMM'), 'TU_CORREO_AQUI');
select public._dar_pin   ((select id from public.empleados where iniciales = 'VMM'), '000000');

-- Comprobacion: debe salir 1 renglon con tu nombre y "si" en las dos columnas.
select e.nombre_oficial,
       case when x.auth_correo_id is not null then 'si' else 'no' end as tiene_correo,
       case when x.pin_hash       is not null then 'si' else 'no' end as tiene_pin
from public.empleados e join public.accesos x on x.empleado_id = e.id
where e.iniciales = 'VMM';
