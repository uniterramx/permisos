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
- **Fase 3 (bandejas)**: ✅ construida (v0.4.0), igual al wireframe aprobado (`docs/wireframes/fase3-bandejas.html`). `js/bandejas.js` (Mi bandeja con pestañas jefe/Gaby/Laura, lote, detalle con decidir/cambiar decisión/editar redacción, Panel general, Corregir -R1/-R2, contador y aviso de cambios en Inicio). SQL 007: `decidir`, `decidir_lote`, `editar_redaccion`, `corregir_solicitud`, `contar_pendientes`, `_recalcular_estado`, tabla `decision_eventos` (append-only); las PRUEBA solo las ve admin; Valen (`decide_solo_pruebas`) solo decide pruebas. Probado en Postgres local + navegador conectado a esa base. SQL 007 corrido y probado por Valen (v0.4.2).
- **Fase 4 (banco y reposición)**: ✅ construida (v0.5.0). `js/banco.js` (Mi banco de horas, Banco de horas por persona, ajuste a mano de Gaby, saldo antes/después y "Cambiar horas" en el detalle, borrar pruebas). SQL 008: tabla `movimientos` append-only (candado por trigger; reverso en lugar de borrar), `_registrar_banco`/`_revertir_banco` dentro de `decidir` (etapa del banco = jefe, o Gaby si el jefe se salta o es -R1; la -R1 cancela la original, B2), `cambiar_horas`, `ajuste_banco`, `borrar_pruebas` (sin confirmar solo cuenta). Pruebas mueven el banco pero solo admin las ve. SQL 008 y 009 corridos por Valen (v0.5.1: rechazo de Gaby/Laura regresa horas + avisos en Inicio). Vacaciones → Fase 7.
- **Fase 5 (PDFs)**: ✅ construida (v0.6.0). Ejemplos aprobados por Valen (23-oct). `js/pdf.js` dibuja sobre `plantillas/*.pdf` (las RELLENABLES de mayo sin campos) con pdf-lib; `js/documentos.js`: PDF de solicitud (se guarda al aprobar Laura, uno o lote; descargan empleado/Gaby/Laura/admin), bitácoras (activa a demanda con folio provisional; se cierra sola a 15 o Gaby a mano; la cerrada se guarda congelada; aviso a Gaby con botón), "PDF guardados" con espacio usado y aviso al 80 %. SQL 010: `bitacoras`, `documentos`, bucket privado `pdfs` + políticas, estampa (`bitacora_id`, una sola vez), `cerrar_bitacora`, `bitacora_activa`, `registrar_pdf`, `espacio_pdfs`, `borrar_pruebas` ampliado. Las pruebas llevan su propia cadena de bitácoras (`PRUEBA-B-INI-NN`) y sus PDF en `pruebas/`. SQL 010 corrido y probado por Valen (23-oct): salió bien. **Siguiente: Fase 6 (arranque real).**
- **v0.6.1** (26-oct): hora con rueda tipo iPhone (horas 0–23, minutos de 5 en 5) en Nueva solicitud y Corregir.
- **v0.7.0** (26-oct): Inicio rediseñado según `docs/wireframes/inicio.html` (aprobado): Nueva solicitud en la cabecera con atajos por tipo, franja "Por decidir", "Tu resumen" (saldo +verde/0 negro/−rojo; por reponer +rojo/0 negro/−verde), listas compactas, Administración en fila. "Ver como" ahora en la barra de arriba (solo admin): por rol (sigues siendo tú) o por PERSONA = solo ver (se simula lo que esa persona ve con las mismas reglas de la base; se bloquea toda escritura; los avisos de otros no se alcanzan a leer). Banco de horas ordenado por área y luego nombre.
- **v0.7.1** (26-oct): tipografía **Outfit** (elegida en `docs/wireframes/tipografia.html`) con jerarquía de pesos 700/600/500/400/300 (bloque al final del CSS de index.html).
- **v0.7.2** (26-oct): ficha de persona → Acceso muestra el PIN temporal (guardado en `accesos.pin_temporal` solo mientras debe cambiarlo) y, cuando la persona elige el suyo, "elegido · lo cambió el …" (el elegido NO se guarda: opción A de Valen). SQL 011 (trigger `accesos_pin_elegido`, `admin_accesos` con 2 columnas más). SQL 011 corrido por Valen.
- 26-oct: repo transferido a la organización **uniterramx** → `uniterramx/permisos`, app en https://uniterramx.github.io/permisos/.
- **v0.7.3** (26-oct): casilla "Recordarme en este dispositivo" en la entrada (sin ella, al volver a abrir la app pide PIN; recargar la misma pestaña no). "Elige tu PIN" tiene "No soy yo · salir".
- **v0.9.0** (26-oct): página **📘 Guía** (`js/guia.js`, wireframe `docs/wireframes/guia.html` aprobado): pestaña por rol, temas de uno en uno, buscador, ventanita "¿Por qué?" de reposición. Reportes (N4): no, solo si Laura los pide. v0.8.1: columna de vacaciones abajo de todo en celular.
- **v0.8.0** (26-oct): **Vacaciones** (se adelantó antes de la Fase 6; wireframe aprobado `docs/wireframes/vacaciones.html`). SQL 012 (`sql/012_vacaciones.sql`, pruebas en `tests/ui/prueba012.sql`) + `js/vacaciones.js` (pruebas de navegador `tests/ui/vacaciones.js`). Dos pasos: (1) **Pedir vacaciones** (tipo nuevo, directo a Laura, sin formato; aprobadas = días **apartados**), (2) el formato de siempre **Falté a cuenta de vacaciones** descuenta los días reales al aprobarlo **Laura** (trigger `decisiones_vacaciones`), liga las apartadas o "imprevisto". Días hábiles L–V sin **festivos** (catálogo en la app, Gaby/Valen). Año laboral de aniversario a aniversario, no se acumula; excepción ("ya lo hablé en persona con…") = préstamo que se descuenta del siguiente año. Pável sin conteo. Fecha de ingreso en la ficha de Personas. Saldo de arranque (Inicial) lo captura Gaby en Vacaciones de todos cuando mande el Excel cuadrado con el registro de Andrés. Inicio: columna "Próximos días sin trabajo" al costado (arriba en celular). **Falta: Valen corre SQL 012 y prueba.**
- Antes: — decisiones P1–P7 en 07 RESPONDIDAS; logo en `icons/logo-uniterra.png`. Handoff: `docs/handoff-permisos-ut-2026-10-22-fase5.md`.
- Rama de trabajo (chat 23–26 oct): `claude/exciting-shannon-x8y45q`, se publica a `main`. **Siguiente: Fase 6** — handoff: `docs/handoff-permisos-ut-2026-10-26-fase6.md`.
- Pruebas locales: hay Postgres 16 en la máquina; `sql/` se prueba contra una imitación de Supabase
  (roles anon/authenticated, `auth.uid()` por `request.jwt.claim.sub`). Ver cómo en el historial de este chat.

## Datos clave
- App: https://uniterramx.github.io/permisos/
- Repo: `uniterramx/permisos` (público). Rama de trabajo `claude/expediente`, publicada a `main`.
- Supabase: proyecto `tnlgwfrseajntindzofg` (URL y anon key en `config.js`). La sesión de Claude Code
  NO puede conectarse a Supabase (red bloqueada): todo SQL se le da a Valen completo para el SQL Editor.
  ⚠️ El SQL Editor no conserva tablas temporales entre sentencias: usar CTE/`values` en línea.
- SQL: `sql/001` base acceso · `002` acceso de Valen · `003` catálogos/RLS/PIN · `004` carga.
- Expediente completo: `CLAUDE.md` + `docs/migracion/` (decisiones en `07_Preguntas_Abiertas.md`, sección RESPONDIDAS).

## Decisiones tomadas en este chat
- Solo se migran catálogos; solicitudes viejas NO. Saldos iniciales (banco, reposición, vacaciones) los da Gaby.
- **Todos entran con PIN** (6 dígitos, bloqueo a los 5 intentos). PIN temporal lo asignan Valen/Gaby y la
  persona lo cambia al entrar. No acepta PINs fáciles.
- App **primero de computadora**, luego celular. Paleta cálida (V1-a). Alexandria. Campos de 13–14 px (zoom apagado con maximum-scale=1).
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
