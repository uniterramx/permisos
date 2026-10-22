# HANDOFF · Permisos UT (al 22-oct-2026)

## Dónde vamos
- **Fase 0 (esqueleto)**: ✅ PWA en GitHub Pages, entrada con PIN, ícono D (calendario + palomita).
- **Fase 1 (catálogos)**: ✅ construida y cargada (v0.2.0). SQL 001–004 corridos en Supabase
  (26 personas, 6 jefes, 13 proyectos, 10 horarios). **Falta que Valen la pruebe** (ver abajo).
- **Fase 2 (solicitar)**: ✅ construida (v0.3.0): formulario paso a paso, cálculos (`js/calculos.js`, 39 tests en
  `tests/calculos.test.js`), redondeo a 15 min, folios, ruteo inicial, modo PRUEBA, "Mis solicitudes". SQL 006.
  Corrección (-R1) se hace en la Fase 3. **Falta: Valen corre SQL 005 y 006 y prueba.**
- **Ajustes 22-oct (v0.3.1–0.3.2)**: campos de 13–14 px (zoom de iPhone apagado con `maximum-scale=1`), tablas que
  se deslizan de lado con el nombre fijo, ficha de persona rediseñada en apartados (aprobada por Valen).
- Valen trabaja con el modo **/adhd**: un paso por mensaje, plan antes de código, estado al inicio.
- Redondeo confirmado (22-oct): al cuarto de hora **más cercano** (20 min → 15, 23 min → 30).
- Siguiente: **Fase 3 · Bandejas**. Wireframe primero.
- Pruebas locales: hay Postgres 16 en la máquina; `sql/` se prueba contra una imitación de Supabase
  (roles anon/authenticated, `auth.uid()` por `request.jwt.claim.sub`). Ver cómo en el historial de este chat.

## Datos clave
- App: https://vmmterminus-star.github.io/uniterra-permisos/
- Repo: `vmmterminus-star/uniterra-permisos` (público). Rama de trabajo `claude/expediente`, publicada a `main`.
- Supabase: proyecto `tnlgwfrseajntindzofg` (URL y anon key en `config.js`). La sesión de Claude Code
  NO puede conectarse a Supabase (red bloqueada): todo SQL se le da a Valen completo para el SQL Editor.
  ⚠️ El SQL Editor no conserva tablas temporales entre sentencias: usar CTE/`values` en línea.
- SQL: `sql/001` base acceso · `002` acceso de Valen · `003` catálogos/RLS/PIN · `004` carga.
- Expediente completo: `CLAUDE.md` + `docs/migracion/` (decisiones en `07_Preguntas_Abiertas.md`, sección RESPONDIDAS).

## Decisiones tomadas en este chat
- Solo se migran catálogos; solicitudes viejas NO. Saldos iniciales (banco, reposición, vacaciones) los da Gaby.
- **Todos entran con PIN** (6 dígitos, bloqueo a los 5 intentos). PIN temporal lo asignan Valen/Gaby y la
  persona lo cambia al entrar. No acepta PINs fáciles.
- App **primero de computadora**, luego celular. Paleta cálida (V1-a). Alexandria. Inputs ≥16 px.
- Catálogos se editan en la app (Sheets quedan en el pasado). Nombres tal cual + aviso si parecen sin acento;
  puestos sí se corrigen. Horarios MT cargados "por revisar", editables por periodo con fecha.
- Ruteo/firmas raras (Wario, Max) se cargaron tal cual, sin avisos.
- Valen tiene TODOS los roles y el menú "Ver la app como" (Todo/Empleado/Jefe/Gaby/Laura).
- Inicio > Administración con tarjetas directas: Personas y PINs · Proyectos · Áreas y jefes.

## Bug del 22-oct (horario no se guardaba) → v0.2.1
- Síntoma: al guardar un horario se refrescaba y volvía al original, sin error.
- Causa probable: Supabase responde "ok" aunque RLS bloquee un UPDATE (0 renglones, sin error). No se pudo
  confirmar contra la base real (la sesión no se conecta a Supabase).
- Arreglo: horario se guarda con la función `guardar_horario` (SQL 005, un solo paso, errores claros);
  la app verifica tras recargar que el cambio quedó; los UPDATE de personas/proyectos/áreas exigen 1 renglón.
- **Pendiente: Valen corre `sql/005_guardar_horario.sql`** (su select final muestra los últimos cambios = diagnóstico).

## Pendientes de probar (Fase 1)
1. Personas: abrir una ficha, editar, guardar; revisar avisos (3 nombres, 10 horarios, 2 sin horario).
2. Asignar PIN temporal a alguien de prueba → salir → entrar como esa persona → debe pedir PIN nuevo.
3. Editar un proyecto y un área. 4. "Ver como" Empleado.

## Preguntas abiertas para fases siguientes
V2 (colores de estado: naranja vs azul en "Pedir cambios") · N1 (avisos: Pushover/Web Push) ·
B1–B11 (reglas de cálculo) antes de la Fase 4 · P1–P6 (PDF) antes de la Fase 5.
