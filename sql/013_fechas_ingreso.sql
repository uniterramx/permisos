-- =====================================================================
-- Permisos UT · 013 · Fechas de ingreso (del Excel de vacaciones de Gaby, VAC.xlsx)
-- Pegar COMPLETO en Supabase > SQL Editor > New query > Run. Correr DESPUES del 012.
-- Solo llena a quien todavia NO tiene fecha (no pisa lo que ya se capturo a mano).
-- Pavel no aparece en el Excel (no lleva conteo). Paola sale como SUSPENDIDO en el Excel.
-- =====================================================================
update public.empleados e set fecha_ingreso = v.fecha
from (values
  ('MISN', date '2009-08-17'), ('JAHO', date '2012-09-18'), ('JAMV', date '2022-02-01'), ('AOS',  date '2015-12-01'),
  ('LZTM', date '2007-07-16'), ('MFB',  date '2022-02-01'), ('MAPD', date '2022-02-01'), ('OPC',  date '2022-02-01'),
  ('JMCM', date '2022-02-01'), ('APGR', date '2024-03-01'), ('LAMC', date '2026-06-01'), ('KYGS', date '2025-04-01'),
  ('REMC', date '2025-05-15'), ('HMRA', date '2019-07-16'), ('JAWG', date '2019-07-16'), ('VMM',  date '2026-02-16'),
  ('TSS',  date '2024-04-16'), ('GTB',  date '2025-01-06'), ('EEEE', date '2025-02-10'), ('PCCH', date '2025-06-02'),
  ('JFCE', date '2025-06-03'), ('AEGF', date '2025-08-01'), ('DMPB', date '2025-11-06'), ('ANRA', date '2025-11-06'),
  ('JAGG', date '2025-12-01')
) as v(ini, fecha)
where e.iniciales = v.ini and e.fecha_ingreso is null;

-- Comprobacion: con_fecha debe ser 25 y sin_fecha solo Pavel.
select (select count(*) from public.empleados where activo and fecha_ingreso is not null) as con_fecha,
       (select string_agg(nombre_oficial, ', ') from public.empleados where activo and fecha_ingreso is null) as sin_fecha;
