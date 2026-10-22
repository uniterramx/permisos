Hola. Vengo de otro chat donde construimos "Permisos UT", la app nueva del Sistema de Solicitudes de Permiso de Uniterra. Te paso el handoff completo. No necesitas adjuntos: todo vive en el repo `vmmterminus-star/uniterra-permisos` (ábrelo en la sesión).

## 1. Objetivo
- Reemplazar el sistema viejo de Google (Form + 5 Sheets + Banco de Horas + Apps Script + PDFs) por una web app propia: **PWA en GitHub Pages + Supabase**.
- Flujo: empleado pide → jefe del área → Gaby (filtro) → Laura (aprobación final) → PDF oficial + banco de horas + bitácora.
- Fin inmediato: tenerla lista para **mostrársela a Laura** y empezar a usarla. Sin fecha límite fija.

## 2. Dónde nos quedamos
- **Hecho y probado por Valen en la base real (v0.3.2):**
  - Fase 0: PWA, ícono, entrada con PIN.
  - Fase 1: personas, proyectos y áreas editables en la app; PIN temporal y cambio de PIN; "Ver como".
  - Fase 2: nueva solicitud paso a paso, cálculos, folios, ruteo inicial, modo PRUEBA y "Mis solicitudes".
  - Ajustes de diseño: ficha de persona rediseñada, campos chicos, tablas que se deslizan.
- **SQL corridos en Supabase:** 001 a 006.
- **Falta:** Fases 3 a 7.
- **SIGUIENTE PASO CONCRETO:** hacer el **wireframe de la Fase 3 (bandejas)**, computadora primero:
  - Bandeja del jefe, de Gaby y de Laura.
  - Aprobar, rechazar, pedir cambios y "resuelto", con aprobación en lote.
  - Panel general y contador de pendientes en la tarjeta "Mi bandeja".
  - Corrección -R1.
  - Mostrar el wireframe a Valen ANTES de programar, con las preguntas que falten.

## 3. Fases (aprobadas)
0 Esqueleto ✅ · 1 Catálogos ✅ · 2 Solicitar ✅ · **3 Bandejas** · 4 Banco y reposición · 5 PDFs (solicitud y bitácora) · 6 Arranque real (saldos que da Gaby) · 7 Extras (avisos, vacaciones, reportes, respaldos, guía).

## 4. Decisiones tomadas (y por qué)
- **Migración:** solo catálogos (personas, áreas, jefes, horarios, proyectos). Las solicitudes viejas NO se migran: el sistema viejo está sin uso desde agosto y se arranca limpio. Los saldos iniciales (banco, reposición, vacaciones) los da Gaby, porque ella llevó el registro a la par.
- **Google queda en el pasado:** todo se edita en la app.
- **Acceso:** TODOS entran con PIN de 6 dígitos, con bloqueo a los 5 intentos. Antes se planeaba PIN o correo; se quitó el correo porque Valen lo prefiere más fácil.
  - PIN temporal: lo asignan Valen o Gaby, y la persona lo cambia al entrar. No acepta PINs fáciles.
  - Altas y PINs: Valen y Gaby.
- **Dispositivo:** primero computadora, luego iPhone.
- **Visual:** paleta cálida (V1-a), fuente Alexandria, ícono D (calendario con palomita verde, fondo `#efeae3`).
- **Campos:** de 13–14 px. El zoom del iPhone se apaga con `maximum-scale=1` (reemplaza la regla vieja de 16 px).
- **Tablas:** en el celular se deslizan de lado con la 1ª columna fija.
- **Nombres en el organigrama:** van tal cual; si parecen sin acento, sale aviso ("Está bien así" lo quita). Los puestos sí se corrigen ("Coodinador" → "Coordinador").
- **Horarios de medio tiempo:**
  - Se cargaron "por revisar" y se editan en la app por periodo con fecha "vigente desde".
  - Selectores cada **30 min**, rango 8:00–20:00, con casilla "Otro horario" (0:00–23:30) para turnos de noche.
- **Ruteo y firmas raras** (Wario, Max no está en nómina): se cargaron tal cual, SIN avisos; ya se analizó cuando se hizo el sistema viejo.
- **Fase 2:**
  - Formulario **paso a paso como Google Forms**, una pregunta por página.
  - El empleado NO ve el PDF; solo ve un **resumen de información** (horario, qué afecta, horas) y el texto del formato.
  - La hora se elige **cada 5 min**.
  - **Redondeo al cuarto de hora MÁS CERCANO** (20 min → 15; 23 → 30), ya no a la hora.
  - **B1:** la pregunta es "¿Último día que faltas?".
  - **B10:** el campo 3 se separa en "Redacción para el formato" y "Etiqueta para el banco".
  - **B8:** sin límite de días hacia atrás (luego se revisa con Laura).
  - **V2:** "Pedir cambios" en **naranja** `#fef0e6/#b06630`, porque comunica "falta algo"; el azul no.
  - Capturar a nombre de otra persona: solo Valen y Gaby, y queda registrado quién capturó.
  - No se edita después de enviar: se corrige con "Corregir una solicitud". Antes de enviar hay una casilla obligatoria "Confirmo que la información es verídica…".
  - **Modo PRUEBA** (solo admin): folio `PRUEBA-hhmmss-xxx`, no gasta folio real.
- **Organización de la ficha de persona:** apartados en tarjetas (Identidad · Puesto y área · Valida y firma · Jornada y horario · Roles · Acceso), interruptores para Sí/No y TC/MT, ayuda en ⓘ, Guardar fijo abajo.
- **Administración en el inicio:** tarjetas directas (Personas y PINs · Proyectos · Áreas y jefes), no un menú "Catálogos".
- **Valen tiene TODOS los roles** y el menú "Ver la app como" (Todo / Empleado / Jefe / Gaby / Laura) para probar.

## 5. Descartado (no lo vuelvas a proponer)
- Entrar con correo / OTP / Resend: quitado.
- Formulario en una sola página y miniatura del PDF para el empleado: rechazados.
- Horario escrito como texto ("9:00-14:00"): rechazado; van selectores.
- Redondeo a la hora completa, o siempre hacia arriba: rechazados.
- Menú "Catálogos" con pestañas: se prefirieron tarjetas directas.
- Migrar solicitudes, decisiones y PDFs viejos: no.

## 6. Reglas de Valen (además de CLAUDE.md)
- Modo **/adhd**: un paso de instrucciones por mensaje, plan en palabras sencillas y esperar su "dale" antes de escribir código, línea de estado al inicio, "Luego" al final. Las preguntas van como texto normal.
- Wireframe aprobado ANTES de construir cualquier pantalla; es muy picky con lo visual.
- Ahorrar tokens: respuestas cortas, solo lo indispensable para decidir.
- SQL: dárselo **COMPLETO** para pegar en Supabase → SQL Editor → New query → Run.
  - Sin tablas temporales: el SQL Editor no las conserva entre sentencias; usar CTE/`values`.
  - Probarlo ANTES contra el Postgres local que imita Supabase.
- Cuando se actualice la app: publicar a `main` y decirle que recargue con Ctrl+Shift+R y revise el número de versión abajo.
- Guardar en `docs/PENDIENTES_VALEN.md` todo lo que ella tenga que hacer después en la compu.
- Si el chat se alarga: proponer handoff con el texto exacto.

## 7. Datos literales [LITERAL]
- App: `https://vmmterminus-star.github.io/uniterra-permisos/`
- Repo: `vmmterminus-star/uniterra-permisos` (público). Rama de trabajo `claude/expediente`; se publica con `git push origin claude/expediente:main`.
- Supabase: proyecto `tnlgwfrseajntindzofg` (URL y anon key en `config.js`). La cuenta de GitHub de Valen para Claude es `vmmterminus-star`; `valenmm03` es otra cuenta y no se usa.
- Versión actual: **v0.3.2** (en `index.html` const VERSION y en `sw.js`; subir las dos en cada entrega).
- Tu horario real de los jueves es **13:00–18:00** (confirmado). Los otros días: 9:00–14:00.
- Solo Valen tiene PIN por ahora. Nadie más puede entrar todavía.
- Solicitud de prueba real en la base: `PRUEBA-132420-40f` (llegada tarde 13:20, uso de horas, −0.25 h, con Raúl).
- Diagnóstico del bug de horario (21-oct): el horario nunca llegó a la base; la pantalla vieja lo perdía. Arreglado desde v0.2.3 con `guardar_horario` (SQL 005), verificación tras guardar y periodos visibles.

## 8. Archivos (todo en el repo)
- `CLAUDE.md`: reglas del proyecto (leer primero).
- `docs/HANDOFF.md` (estado técnico) · `docs/PENDIENTES_VALEN.md` (lista de Valen) · `docs/migracion/01–07` + `PROMPT_CLAUDE_CODE.md` (expediente).
  - El 07 tiene la sección **RESPONDIDAS** con todas las decisiones.
- `index.html`: la app (login, inicio por rol, Personas, Proyectos, Áreas, cambio de PIN, ruteo por `#hash`).
- `js/calculos.js`: reglas de cálculo y redacción (§5 y §6 del 01). Tests en `tests/calculos.test.js` (39 pruebas: `node tests/calculos.test.js`).
- `js/solicitar.js`: el formulario paso a paso y "Mis solicitudes".
- `sql/001`–`006`: todos corridos. El 002 trae el correo y PIN de Valen como marcadores (ella los llenó).
- `icons/` (D) · `manifest.webmanifest` · `sw.js` (caché, red primero) · `config.js`.
- **Pruebas locales:** hay Postgres 16 en `/usr/lib/postgresql/16/bin`.
  - Se imita Supabase con roles `anon`/`authenticated`, esquemas `auth`/`extensions`, `auth.uid()` que lee `request.jwt.claim.sub` y privilegios por defecto.
  - Se corren 001–006 y se prueba con `set local role authenticated; set local request.jwt.claim.sub='<uid>'`.
  - La interfaz se prueba con Playwright, simulando Supabase con `page.route` y el bundle `@supabase/supabase-js@2.45.4` (jsdelivr está bloqueado en la sesión; se baja con `npm pack`).

## 9. Cómo trabajábamos
- Valen decide punto por punto; Claude propone con opciones y una recomendación primero.
- Claude construye, prueba local (SQL + interfaz en 1366 px y 390 px) y publica. Valen corre los SQL y prueba en la base real.
- La sesión NO puede conectarse a Supabase (red bloqueada); Valen no encontró dónde agregar el dominio permitido.

## 10. Abierto
- Fase 3 completa por diseñar.
- Preguntas para fases siguientes (en el 07): N1 (avisos: Pushover o Web Push) · B2, B3, B4, B9, B11 (reglas de banco y vacaciones) · P1–P6 (PDF y logo) · M1 (logo Uniterra en PNG y plantillas rellenables de Drive) · N2–N8.
- Avisos de nombre por revisar: "Gomez", "Nuñez", "Estevez" (Valen los confirma con RH).
- Horarios marcados "por revisar" (10) y sin horario: Teotzinitztli y Wario.
- Las solicitudes tipo "Corregir" llegan en la Fase 3; hoy la tarjeta sale apagada.
- Fase 4: el banco se mueve al aprobar el JEFE (o Gaby si el solicitante es jefe), con `horas_calculadas` ya guardadas en `solicitudes`.

## 11. Glosario
- **Gaby:** filtro (2ª etapa). **Laura:** jefa de 3 áreas Y aprobación final. **Raúl:** jefe del Taller. **Max:** jefe de Secretaría Técnica. **Pável:** director; firma a los jefes ("Firma Pável pendiente").
- **-R1:** folio de corrección. **PRUEBA:** folio de prueba.
- **Por revisar:** horario cargado del Sheet sin confirmar.
- **Ver como:** el selector de rol de Valen.
- **TC / MT:** tiempo completo / medio tiempo.

## 12. Qué NO hacer
- No programar pantallas sin wireframe aprobado. No escribir código sin su "dale".
- No tocar el sistema viejo de Google ni mandar avisos a nadie.
- No inventar reglas de negocio: si no está en el 01 o en RESPONDIDAS, se pregunta.
- No dar SQL en pedazos ni con tablas temporales.
- No usar fuentes de 16 px en campos (ya no aplica). No usar barras horizontales apiladas.

ANTES DE SEGUIR: explícame en 5 líneas qué entendiste (objetivo, dónde nos quedamos, siguiente paso, cómo trabajamos y qué no debes hacer) y dime si te falta algo. No avances hasta que te confirme.
