-- =====================================================================
-- Permisos UT · 004 · Carga inicial de catalogos (desde los Google Sheets, 21-oct-2026)
-- Correr DESPUES del 003. Pegar COMPLETO > Run.
-- Seguro de correr dos veces: NO pisa lo que ya editaste en la app
-- (solo agrega lo que falta).
-- Cambios contra el Sheet: se quitan espacios sobrantes ("Dirección ", "Nuñez ")
-- y se corrige el puesto "Coodinador" -> "Coordinador". Los NOMBRES van tal cual.
-- =====================================================================
begin;

-- 1) Personas (26)
insert into public.empleados (nombre_oficial, nombre_corto, iniciales, puesto, area_id, jornada, en_nomina, roles)
select v.nombre, v.corto, v.ini, v.puesto, a.id, v.jornada::public.jornada, v.nomina, v.roles::public.rol[]
from (values
  ('Valentina Morales Mendoza', 'Valentina', 'VMM', 'Dibujante', 'Taller de Proyectos', 'MT', false, '{empleado,jefe,filtro,final,admin,altas}'),
  ('Adrián Everardo Gómez Facio', null, 'AEGF', 'Dibujante', 'Taller de Proyectos', 'MT', false, '{empleado}'),
  ('Andrea Nefertary Rubio Ayala', null, 'ANRA', 'Dibujante', 'Taller de Proyectos', 'TC', false, '{empleado}'),
  ('Jaime Antonio Guzmán Gutiérrez', null, 'JAGG', 'Arquitecto Proyectista', 'Taller de Proyectos', 'TC', false, '{empleado}'),
  ('Diego Misael Pimentel Becerra', null, 'DMPB', 'Dibujante', 'Taller de Proyectos', 'TC', false, '{empleado}'),
  ('Luis Alonso Muñoz Casas', null, 'LAMC', 'Dibujante', 'Taller de Proyectos', 'TC', true, '{empleado}'),
  ('Jesús Alberto Mendoza Vázquez', null, 'JAMV', 'Arquitecto Líder de Proyectos', 'Taller de Proyectos', 'MT', true, '{empleado}'),
  ('Omar Peñaloza Chávez', null, 'OPC', 'Arquitecto Líder de Proyectos', 'Taller de Proyectos', 'TC', true, '{empleado}'),
  ('Raúl Edilberto Martínez Carrazco', 'Raúl', 'REMC', 'Coordinador de Unidad de Proyectos', 'Taller de Proyectos', 'MT', true, '{empleado,jefe}'),
  ('Juan Antonio Wario González', null, 'JAWG', 'Auxiliar Financiero Contable', 'Secretaría Técnica', 'MT', false, '{empleado}'),
  ('Mariana Flores Ballesteros', null, 'MFB', 'Arquitecto Proyectista', 'Secretaría Técnica', 'TC', true, '{empleado}'),
  ('José María Carrillo Murguía', null, 'JMCM', 'Arquitecto Proyectista', 'Secretaría Técnica', 'TC', true, '{empleado}'),
  ('Teotzinitztli Sánchez Sánchez', null, 'TSS', 'Coordinador de Ingenierías', 'Secretaría Técnica', 'MT', false, '{empleado}'),
  ('Héctor Max Roesner Arias', 'Max', 'HMRA', 'Coordinador de Secretaría Técnica', 'Secretaría Técnica', 'TC', false, '{empleado,jefe}'),
  ('Laura Zafiro Torres Muñoz', 'Laura', 'LZTM', 'Gerente de División Administrativa', 'Administración', 'TC', true, '{empleado,jefe,final}'),
  ('Andrés Orta Santana', null, 'AOS', 'Encargado de Transparencia y Control de Patrimonio', 'Administración', 'TC', true, '{empleado}'),
  ('Miguel Ángel Pérez Du Pont', null, 'MAPD', 'Asesor Financiero', 'Gestión Inmobiliaria', 'MT', true, '{empleado}'),
  ('Edgar Estefano Estaco Estevez', null, 'EEEE', 'Servicio Técnico en Informática', 'Secretaría Técnica', 'TC', false, '{empleado}'),
  ('Julia Alejandra Hernández Ortiz', null, 'JAHO', 'Auxiliar de Gestión Inmobiliaria', 'Gestión Inmobiliaria', 'TC', true, '{empleado}'),
  ('Josué Fernando Camporredondo Escobedo', null, 'JFCE', 'Servicio Técnico en Informática', 'Secretaría Técnica', 'MT', false, '{empleado}'),
  ('Paulo César Cruz Hernández', null, 'PCCH', 'Servicio Técnico en Informática', 'Secretaría Técnica', 'MT', false, '{empleado}'),
  ('Gabriela Téllez Buendía', 'Gaby', 'GTB', 'Auxiliar de Administración', 'Administración', 'MT', false, '{empleado,filtro,altas}'),
  ('Pável Morales Rivas', null, 'PMR', 'Director', 'Dirección', 'TC', true, '{empleado}'),
  ('María Isabel Soto Nuñez', null, 'MISN', 'Intendencia', 'Intendencia', 'MT', true, '{empleado}'),
  ('Ana Paola Garay Reyes', null, 'APGR', 'Contador', 'Administración', 'TC', true, '{empleado}'),
  ('Karla Yadira Gomez Salcido', null, 'KYGS', 'Seguridad', 'Administración', 'MT', true, '{empleado}')
) as v(nombre, corto, ini, puesto, area, jornada, nomina, roles)
join public.areas a on a.nombre = v.area
on conflict (iniciales) do nothing;

-- Valen: todos los roles (para probar todo)
update public.empleados set roles = '{empleado,jefe,filtro,final,admin,altas}' where iniciales = 'VMM';

-- 2) Quien valida / quien firma (solo si estan vacios)
update public.empleados e set
  valida_id = coalesce(e.valida_id, (select id from public.empleados where iniciales = v.valida)),
  firma_id  = coalesce(e.firma_id,  (select id from public.empleados where iniciales = v.firma))
from (values
  ('VMM', 'REMC', 'REMC'),
  ('AEGF', 'REMC', 'REMC'),
  ('ANRA', 'REMC', 'REMC'),
  ('JAGG', 'REMC', 'REMC'),
  ('DMPB', 'REMC', 'REMC'),
  ('LAMC', 'REMC', 'REMC'),
  ('JAMV', 'REMC', 'REMC'),
  ('OPC', 'REMC', 'REMC'),
  ('REMC', 'PMR', 'PMR'),
  ('JAWG', 'LZTM', 'HMRA'),
  ('MFB', 'HMRA', 'REMC'),
  ('JMCM', 'HMRA', 'REMC'),
  ('TSS', 'HMRA', 'HMRA'),
  ('HMRA', 'PMR', 'PMR'),
  ('LZTM', 'PMR', 'PMR'),
  ('AOS', 'LZTM', 'LZTM'),
  ('MAPD', 'PMR', 'LZTM'),
  ('EEEE', 'PMR', 'PMR'),
  ('JAHO', 'PMR', 'LZTM'),
  ('JFCE', 'PMR', 'HMRA'),
  ('PCCH', 'PMR', 'HMRA'),
  ('GTB', 'PMR', 'PMR'),
  ('PMR', 'PMR', 'PMR'),
  ('MISN', 'LZTM', 'LZTM'),
  ('APGR', 'LZTM', 'LZTM'),
  ('KYGS', 'LZTM', 'LZTM')
) as v(ini, valida, firma)
where e.iniciales = v.ini;

-- 3) Jefes de area
insert into public.jefes_area (area_id, jefe_id)
select a.id, e.id from (values
  ('Taller de Proyectos', 'REMC'),
  ('Administración', 'LZTM'),
  ('Secretaría Técnica', 'HMRA'),
  ('Gestión Inmobiliaria', 'LZTM'),
  ('Dirección', 'PMR'),
  ('Intendencia', 'LZTM')
) as v(area, ini)
join public.areas a on a.nombre = v.area
join public.empleados e on e.iniciales = v.ini
on conflict (area_id) do nothing;

-- 4) Proyectos (13)
insert into public.proyectos (nombre_corto, nombre_oficial) values
  ('Plan Maestro CUCosta', 'Plan Maestro del Centro Universitario de la Costa'),
  ('Edificio PIDAT CUCEI', 'Proyecto Conceptual de Edificio PIDAT - CUCEI'),
  ('Hospital de Ciudad Guzmán', 'Hospital Civil de Guadalajara del Sur'),
  ('Hospital de Puerto Vallarta', 'Hospital Civil de Guadalajara de Puerto Vallarta'),
  ('Casa FIL', 'Casa FIL'),
  ('Edificio Administrativo CUTlajomulco', 'Edificio Administrativo CUTlajomulco'),
  ('Edificio CUCEI Fase 1', null),
  ('Complejo Acuático', null),
  ('Edificio Lagos de Moreno', null),
  ('Cubiertas ANONAS', null),
  ('Aulas Magnas', 'Aulas Magnas del CUCosta'),
  ('Hospital Civil de Oriente', null),
  ('Edificio de Posgrados CUCSUR', null)
on conflict (nombre_corto) do nothing;

-- 5) Horarios de medio tiempo (todos "por revisar"; solo a quien todavia no tiene horario)
create temp table _hor (ini text, periodo text, desde date, dia int, txt text) on commit drop;
insert into _hor values
  ('AEGF', 'Vacaciones Jun-Ago', '2026-06-01', 1, '9:00-14:00'),
  ('AEGF', 'Vacaciones Jun-Ago', '2026-06-01', 2, '9:00-14:00'),
  ('AEGF', 'Vacaciones Jun-Ago', '2026-06-01', 3, '9:00-14:00'),
  ('AEGF', 'Vacaciones Jun-Ago', '2026-06-01', 4, '9:00-14:00'),
  ('AEGF', 'Vacaciones Jun-Ago', '2026-06-01', 5, '9:00-13:00'),
  ('VMM', 'Vacaciones Jun-Ago', '2026-06-01', 1, '9:00-14:00'),
  ('VMM', 'Vacaciones Jun-Ago', '2026-06-01', 2, '9:00-14:00'),
  ('VMM', 'Vacaciones Jun-Ago', '2026-06-01', 3, '9:00-14:00'),
  ('VMM', 'Vacaciones Jun-Ago', '2026-06-01', 4, '9:00-14:00'),
  ('VMM', 'Vacaciones Jun-Ago', '2026-06-01', 5, '9:00-14:00'),
  ('JAMV', 'Vacaciones Jun-Ago', '2026-06-01', 1, '9:00-18:00'),
  ('JAMV', 'Vacaciones Jun-Ago', '2026-06-01', 2, '9:00-18:00'),
  ('JAMV', 'Vacaciones Jun-Ago', '2026-06-01', 3, '9:00-18:00'),
  ('JAMV', 'Vacaciones Jun-Ago', '2026-06-01', 4, '9:00-18:00'),
  ('JAMV', 'Vacaciones Jun-Ago', '2026-06-01', 5, '9:00-18:00'),
  ('REMC', 'Vacaciones Jun-Ago', '2026-06-01', 1, '9:00-18:00'),
  ('REMC', 'Vacaciones Jun-Ago', '2026-06-01', 2, '9:00-18:00'),
  ('REMC', 'Vacaciones Jun-Ago', '2026-06-01', 3, '9:00-18:00'),
  ('REMC', 'Vacaciones Jun-Ago', '2026-06-01', 4, '9:00-18:00'),
  ('REMC', 'Vacaciones Jun-Ago', '2026-06-01', 5, '9:00-18:00'),
  ('MAPD', 'Indefinido', '2026-01-01', 1, '10:00-17:00'),
  ('MAPD', 'Indefinido', '2026-01-01', 2, '10:00-17:00'),
  ('MAPD', 'Indefinido', '2026-01-01', 3, '10:00-17:00'),
  ('MAPD', 'Indefinido', '2026-01-01', 4, '10:00-17:00'),
  ('MAPD', 'Indefinido', '2026-01-01', 5, '10:00-17:00'),
  ('JFCE', 'Vacaciones Jun-Ago', '2026-06-01', 1, '9:00-14:00'),
  ('JFCE', 'Vacaciones Jun-Ago', '2026-06-01', 2, '9:00-14:00'),
  ('JFCE', 'Vacaciones Jun-Ago', '2026-06-01', 3, '9:00-14:00'),
  ('JFCE', 'Vacaciones Jun-Ago', '2026-06-01', 4, '9:00-14:00'),
  ('JFCE', 'Vacaciones Jun-Ago', '2026-06-01', 5, '-'),
  ('PCCH', 'Vacaciones Jun-Ago', '2026-06-01', 1, '10:00-15:00'),
  ('PCCH', 'Vacaciones Jun-Ago', '2026-06-01', 2, '-'),
  ('PCCH', 'Vacaciones Jun-Ago', '2026-06-01', 3, '10:00-15:00'),
  ('PCCH', 'Vacaciones Jun-Ago', '2026-06-01', 4, '10:00-15:00'),
  ('PCCH', 'Vacaciones Jun-Ago', '2026-06-01', 5, '10:00-15:00'),
  ('GTB', 'Indefinido', '2026-01-01', 1, '9:00-18:00'),
  ('GTB', 'Indefinido', '2026-01-01', 2, '9:00-18:00'),
  ('GTB', 'Indefinido', '2026-01-01', 3, '9:00-18:00'),
  ('GTB', 'Indefinido', '2026-01-01', 4, '9:00-18:00'),
  ('GTB', 'Indefinido', '2026-01-01', 5, '9:00-14:00'),
  ('MISN', 'Indefinido', '2026-01-01', 1, '7:00-13:00'),
  ('MISN', 'Indefinido', '2026-01-01', 2, '7:00-13:00'),
  ('MISN', 'Indefinido', '2026-01-01', 3, '7:00-13:00'),
  ('MISN', 'Indefinido', '2026-01-01', 4, '7:00-13:00'),
  ('MISN', 'Indefinido', '2026-01-01', 5, '7:00-13:00'),
  ('KYGS', 'Indefinido', '2026-01-01', 1, '19:30-7:30'),
  ('KYGS', 'Indefinido', '2026-01-01', 2, '19:30-7:30'),
  ('KYGS', 'Indefinido', '2026-01-01', 3, '19:30-7:30'),
  ('KYGS', 'Indefinido', '2026-01-01', 4, '19:30-7:30'),
  ('KYGS', 'Indefinido', '2026-01-01', 5, '19:30-7:30');

insert into public.horarios (empleado_id, periodo, vigente_desde, por_revisar)
select distinct e.id, h.periodo, h.desde, true
from _hor h join public.empleados e on e.iniciales = h.ini
where not exists (select 1 from public.horarios x where x.empleado_id = e.id);

insert into public.horario_dias (horario_id, dia, entrada, salida)
select hz.id, h.dia,
       case when h.txt = '-' then null else split_part(h.txt, '-', 1)::time end,
       case when h.txt = '-' then null else split_part(h.txt, '-', 2)::time end
from _hor h
join public.empleados e on e.iniciales = h.ini
join public.horarios hz on hz.empleado_id = e.id and hz.periodo = h.periodo and hz.vigente_desde = h.desde
on conflict (horario_id, dia) do nothing;

commit;

-- Comprobacion: debe decir 26 / 6 / 13 / 10 / 50
select (select count(*) from public.empleados)    as personas,
       (select count(*) from public.jefes_area)   as jefes,
       (select count(*) from public.proyectos)    as proyectos,
       (select count(*) from public.horarios)     as horarios,
       (select count(*) from public.horario_dias) as dias;
