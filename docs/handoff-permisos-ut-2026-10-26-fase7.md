Hola. Vengo de otro chat donde construimos "Permisos UT", la app nueva del Sistema de Solicitudes de Permiso de Uniterra.
Repo: **uniterramx/permisos** (app en https://uniterramx.github.io/permisos/). No adjunto archivos: todo está en el repo.

Lee COMPLETOS, en este orden, antes de responder:
1. docs/handoff-permisos-ut-2026-10-26-fase7.md  ← este handoff
2. CLAUDE.md
3. docs/HANDOFF.md y docs/PENDIENTES_VALEN.md
4. docs/migracion/07_Preguntas_Abiertas.md (sección RESPONDIDAS: todas mis decisiones, no las repreguntes; sobre todo "Vacaciones", N4 y N8)

## 1. Objetivo
- PWA propia (GitHub Pages + Supabase) que reemplaza el sistema de Google: empleado pide → jefe → Gaby (filtro) → Laura (aprobación final) → PDF + banco de horas + bitácora + vacaciones.
- Fin inmediato: arrancar de verdad (el día del cambio lo lleva Valen) y dejar la app completa.

## 2. Dónde nos quedamos
- Versión **v0.10.0**. SQL corridos por Valen: **001–013** (014 pendiente de correr: ver PENDIENTES §10).
- v0.9.1: filtro Nómina + botón PDF en Vacaciones de todos. v0.10.0: historial por persona; carga = ley automática + Ajuste + Tomadas antes (sin saldo de arranque).
- **v0.8.0 Vacaciones** (SQL 012, `js/vacaciones.js`, wireframe `docs/wireframes/vacaciones.html`):
  - Paso 1 "Pedir vacaciones": directo a Laura, sin formato; aprobadas = días **apartados**.
  - Paso 2 el formato de siempre "Falté → A cuenta de vacaciones": liga las apartadas o "imprevisto"; **descuenta lo real al aprobar Laura** (trigger `decisiones_vacaciones`).
  - Días hábiles L–V sin festivos (catálogo en la app; Valen ya cargó los festivos). Año laboral de aniversario a aniversario, no se acumula. Excepción ("ya lo hablé en persona con…") = préstamo que se descuenta del siguiente año. Pável sin conteo.
  - Dos números: "te quedan" (real) y "te quedarían" (menos apartados). Aviso a la persona y a Gaby si ya pasaron las apartadas sin formato.
  - Columna "Próximos días sin trabajo": al costado en compu, **abajo de todo en celular** (v0.8.1).
- **SQL 013**: fechas de ingreso del Excel viejo de Gaby (18 activos + Pável sin fecha; Valen apagó a 7 que ya no están).
- **v0.9.0 Guía** (`js/guia.js`, wireframe `docs/wireframes/guia.html` aprobado): pestaña por rol, temas de uno en uno, buscador, ventanita "¿Por qué aparte?" (banco vs reposición).
- Ya hecho por Valen: festivos cargados, nombres corregidos, PIN temporal a todos.
- AVANCE: ~95 %.

## 3. Pendiente (de otros)
- **Gaby**: carga ELLA en la app, por persona: fecha de ingreso (si cambió), **Tomadas antes** (del/al, días automáticos L–V sin festivos, editables) y **Ajuste** (+/− con motivo, p. ej. días guardados del año pasado). Los días de ley salen solos. Errores: "Quitar" (reverso).
  - Valen NO debe cargar saldos: su usuario (decide_solo_pruebas) los deja como prueba.
- **Valen**: horarios "por revisar" (los carga cuando los tenga); día del cambio y quién entra (lo lleva ella, no preguntar).
- Reportes para Laura (N4): NO, solo si Laura los pide.

## 4. Siguiente paso posible (preguntar a Valen qué quiere)
- Revisar lo que Gaby cargó (captura de Doña Isa).
- Fase 7 que queda: avisos al celular (N1), respaldos/export (N7), escaneo firmado (P7), métricas (N6), rueda que dé la vuelta (si la pide).

## 5. Reglas de Valen
- Modo /adhd: estado en la 1ª línea, UN paso por mensaje, "Por qué" simple, tiempo, "Luego". Código solo con "dale" (sus correcciones visuales o "diséñalo así" cuentan como dale). Wireframe en docs/wireframes/ antes de pantallas nuevas.
- **Ahorro de créditos**: nada de pruebas o trabajo extra que no pidió; respuestas cortas.
- Publicar siempre a main (`git push origin <rama>:main`; el remote viejo vmmterminus-star/uniterra-permisos redirige solo) y decir: recarga con Ctrl+Shift+R y revisa la versión abajo. Subir VERSION en index.html y sw.js; agregar js nuevos al SHELL de sw.js.
- SQL: COMPLETO para el SQL Editor, probado antes en el Postgres local, termina con select de comprobación. NUNCA `select ... into` ni `returning ... into` (ni en comentarios): usar `v := (select ...)` o `x := (select t from tabla t where ...)`.
- Clases CSS nuevas con prefijo propio (vacaciones usa v*, guía usa g*) para no chocar.
- Español mexicano, informal. Cuando algo no se puede: todas las opciones, recomendada primero.

## 6. Datos literales
- App: https://uniterramx.github.io/permisos/ · Supabase: proyecto tnlgwfrseajntindzofg (la sesión NO se conecta).
- Rama de este chat: claude/vibrant-albattani-m9t2el.
- Pruebas locales: tests/ui/LEEME.md (Postgres 16 en /var/lib/pgut:54329; `prueba012.sql`; `vacaciones.js`; las pruebas de navegador necesitan `ut_recordarme=1` en localStorage desde v0.7.3). `pin.js` y `sesion.js` se atoran en la pantalla de entrada (sin investigar; no son de vacaciones).
- Rescate de PIN de Valen: `select public._dar_pin((select id from public.empleados where iniciales = 'VMM'), '000000');`

## 7. Qué NO hacer
- No inventar reglas; no tocar el sistema viejo de Google ni mandar avisos reales.
- No editar ni borrar movimientos (append-only, también los de vacaciones).
- No escribir código sin "dale". No repreguntar lo de RESPONDIDAS ni el día del cambio.

ANTES DE SEGUIR: explícame en 5 líneas qué entendiste (objetivo, dónde nos quedamos, siguiente paso, cómo trabajamos y qué no debes hacer) y dime si te falta algo. No avances hasta que te confirme.
