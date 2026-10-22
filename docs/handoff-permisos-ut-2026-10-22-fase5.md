Hola. Vengo de otro chat donde construimos "Permisos UT", la app nueva del Sistema de Solicitudes de Permiso de Uniterra (repo vmmterminus-star/uniterra-permisos). No adjunto archivos: todo está en el repo, salvo el logo que ya quedó en icons/logo-uniterra.png.

Lee COMPLETOS, en este orden, antes de responder:
1. docs/handoff-permisos-ut-2026-10-22-fase5.md  ← este handoff
2. CLAUDE.md
3. docs/HANDOFF.md y docs/PENDIENTES_VALEN.md
4. docs/migracion/07_Preguntas_Abiertas.md (sección RESPONDIDAS: todas mis decisiones, no las repreguntes)
5. docs/migracion/04_Formatos_PDF.md (diseño EXACTO de los 2 PDF, con coordenadas)

## 1. Objetivo
- Reemplazar el sistema viejo de Google por una PWA propia (GitHub Pages + Supabase): empleado pide → jefe → Gaby (filtro) → Laura (aprobación final) → PDF oficial + banco de horas + bitácora.
- Fin inmediato: tenerla lista para mostrársela a Laura y empezar a usarla. Sin fecha límite fija.

## 2. Dónde nos quedamos
- HECHO y probado por Valen en la base real: Fases 0–4. Versión actual v0.5.1. SQL corridos: 001–009.
  - Fase 3 (v0.4.x): Mi bandeja con pestañas Jefe/Gaby/Laura, tarjetas de estado con color, resumen por persona, aprobar en lote (pre-marcadas), detalle con Aprobar/Pedir cambios/Rechazar/Resuelto, cambiar decisión, editar redacción (Gaby/Laura), Panel general, Corregir (-R1/-R2), contador en Inicio, aviso "Te pidieron cambios".
  - Fase 4 (v0.5.x): Mi banco de horas, Banco de horas (todos), ajuste a mano (Gaby), "Cambiar horas" antes de aprobar, saldo antes/después con aviso si queda negativo, reversos, borrar pruebas, avisos en Inicio cuando Gaby/Laura rechazan algo que ya movió el banco.
- AVANCE: ~65–70 %. Faltan Fase 5 (PDFs), 6 (arranque real: saldos de Gaby, PINs a todos, día del cambio) y 7 (extras).
- SIGUIENTE PASO CONCRETO: programar la Fase 5 (NO hace falta wireframe: el diseño de los PDF está aprobado desde mayo y está en 04_Formatos_PDF.md). Primero generar 1 PDF de solicitud y 1 de bitácora de EJEMPLO con datos reales de prueba y mandárselos a Valen para revisión visual; luego construir.

## 3. Decisiones de la Fase 5 (ya respondidas, están en 07)
- P1a: logo automático. En nómina → CON logo (arriba-izquierda); fuera de nómina → SIN logo. Logo: icons/logo-uniterra.png (ícono + "Uniterra" en rojo Uniterra #E35A48; lema "Innovación en Hábitat" en #231F20; fondo transparente; 1904×415 px). Sacado del vectorial que dio Valen.
- P2a: firma derecha = "Valida y firma" (firma_id) de la ficha de cada persona; a los jefes los firma Pável (Raúl no se firma a sí mismo).
- P3c: si el concepto no cabe en 3 renglones → se usan 4 (solo en ese caso).
- P4: se GUARDAN TODOS los PDF en Supabase Storage ("como Google Drive"), sin papelera. La app muestra el espacio usado y avisa al 80 %; al llegar, se exportan años viejos a Drive (Fase 7). Cálculo dado a Valen: plan gratis 1 GB archivos; PDF con logo ≈60 KB; ~1,300 PDF/año ≈ 80 MB/año ≈ 12 años. OJO: proyecto gratis se pausa tras 1 semana sin uso (vacaciones de diciembre); se reactiva con un clic.
- P5a: descargan el PDF de solicitud Gaby, Laura y el propio empleado.
- P6: la bitácora se CIERRA SOLA al llegar a 15 movimientos (Gaby también puede cerrarla a mano antes). Al cerrarse → aviso en la app a Gaby para imprimir y recoger la firma del empleado. El empleado siempre puede ver/descargar su bitácora activa.
- P7a: subir el escaneo firmado → Fase 7 (quizá ni haga falta).
- Pendiente de proponer en la Fase 5 (no se preguntó): qué se imprime en la columna folio de la bitácora para saldo inicial/ajuste/reverso (propuesta anterior: "Saldo inicial", "Ajuste", "Reverso"). Preguntarlo.

## 4. Otras decisiones clave de este chat (todas en 07 RESPONDIDAS)
- Fase 3: F1a cambiar decisión con confirmación (se congela cuando Laura aprueba) · F2a Gaby/Laura editan SOLO la redacción, con registro · F3a la original queda "Corregida → continúa en …-R1" · F4a lote con pendientes pre-marcadas · G1a comentario obligatorio en Pedir cambios/Rechazar · G2a la bandeja abre en Pendientes (botón Pendientes | Todas) · G3a Gaby ve "Cambios (jefe)" sin acción · G4a Panel general solo para quien aprueba · G5a "Resuelto" botón chico.
- PRIVACIDAD (G4): Laura NUNCA debe poder saber que Valen tiene todo el acceso. Valen solo decide sobre PRUEBAS (empleados.decide_solo_pruebas=true para VMM). Las PRUEBA y sus movimientos/avisos solo los ve admin. Gaby sí puede ver los roles de Valen.
- Fase 4: B4a saldo negativo permitido con aviso al jefe · B3a cambiar decisión → reverso automático · B2 (idea de Valen) la -R1 al aprobarla Gaby cancela (reverso) el movimiento de la original y registra el suyo · H1a el jefe (o Gaby si el solicitante es jefe) puede cambiar horas antes de aprobar, con motivo · H2a ajustes a mano solo Gaby (los de Valen quedan como prueba) · N3a cada quien ve su banco; jefes su área; Gaby/Laura todos · P0 las pruebas mueven el banco real pero solo admin las ve; se borran con "🧪 Pruebas" · B9a vacaciones → Fase 7 · si Gaby/Laura rechazan algo que ya movió el banco → reverso + aviso al empleado y a quien aprobó.
- Si escriben un folio que no existe en Corregir, la app avisa (ya no hay "corrección sin origen").

## 5. Descartado (no volver a proponer)
- Mostrar wireframes como artefacto o meter un wireframe "dentro" de la app en lugar de construir: a Valen le molestó. Wireframe = página aparte en docs/wireframes/ publicada en Pages, y cuando ella da correcciones eso cuenta como aprobación → se construye en la app.
- Papelera rotativa de PDFs. Entrar con correo/OTP. Formulario en una sola página. Miniatura del PDF para el empleado. Horarios como texto. Redondeo a la hora. Menú "Catálogos" con pestañas. Migrar solicitudes viejas. Barras horizontales apiladas (como layout).

## 6. Reglas de Valen
- Modo /adhd APAGADO en este chat ("olvidemos lo del adhd hasta que te diga"). Respuestas cortas, al grano, ahorro de tokens.
- Las correcciones visuales que da = aprobación: construir directo en la app y publicar. No volver a preguntar "¿dale?" después de que ya corrigió.
- Siempre publicar a main (la página oficial) cuando se actualice algo y decirle: recarga con Ctrl+Shift+R y revisa la versión abajo. Si pregunta "¿por qué no lo subiste?", verificar el deploy con mcp__github__actions_list (workflow "pages build and deployment").
- SQL: COMPLETO para Supabase → SQL Editor → New query → Run; sin tablas temporales; probado antes en el Postgres local; se manda como archivo con SendUserFile. Cada SQL termina con un select de comprobación ("si").
- Guardar en docs/PENDIENTES_VALEN.md lo que ella tenga que hacer en la compu.
- Tablas: colores de estado como en sus Sheets (tarjetas con fondo de color), área con su color en todas las filas (sin alternado), columnas de texto largo anchas (2 renglones), columnas cortas (fecha) angostas, pastillas sin partir texto en 2 renglones.
- El detalle (panel derecho) siempre debe poder cerrarse (✕) y cerrarse solo al decidir.

## 7. Datos literales [LITERAL]
- App: https://vmmterminus-star.github.io/uniterra-permisos/
- Repo: vmmterminus-star/uniterra-permisos (público). Se trabaja en la rama de la sesión y se publica con `git push origin <rama>:main`. (La rama vieja claude/expediente ya no existe.)
- Supabase: proyecto tnlgwfrseajntindzofg (URL y anon key en config.js). La sesión NO puede conectarse a Supabase ni abrir github.io (red bloqueada).
- Versión actual: v0.5.1 (const VERSION en index.html y en sw.js; subir las dos en cada entrega; agregar js nuevos a SHELL de sw.js).
- Rojo Uniterra: #E35A48. Lema del logo: #231F20.
- Wireframes: docs/wireframes/fase3-bandejas.html y fase4-banco.html (publicados en Pages).

## 8. Archivos (todo en el repo)
- index.html (app, CSS, Inicio, router VISTAS con acceso 'todos' | 'valida' | admin) · js/calculos.js (+ tests/calculos.test.js, 39 pruebas) · js/solicitar.js (nueva solicitud, Mis solicitudes) · js/bandejas.js (Fase 3) · js/banco.js (Fase 4 + avisos) · sql/001–009 (todos corridos) · icons/logo-uniterra.png (nuevo).
- Tablas nuevas: decision_eventos (append-only), movimientos (append-only, candado por trigger; bitacora_id reservado para la "estampa" de la Fase 5), avisos. Funciones: decidir, decidir_lote, editar_redaccion, corregir_solicitud, contar_pendientes, cambiar_horas, ajuste_banco, borrar_pruebas(p_confirmar), aviso_visto, _recalcular_estado, _etapa_banco, _registrar_banco, _revertir_banco, _deshacer_por_rechazo.

## 9. Cómo se prueba (en la sesión)
- Postgres 16 local: /usr/lib/postgresql/16/bin. Usar un directorio de ruta corta (p. ej. /var/lib/pgut) porque el socket con la ruta del scratchpad es demasiado largo; puerto 54329. Imitar Supabase: roles anon/authenticated/service_role, esquemas auth/extensions, auth.users/auth.identities, auth.uid() leyendo request.jwt.claim.sub, default privileges. Correr 001, 003–009 (002 con correo/PIN de prueba vía sed). Dar PINs de prueba con _dar_pin; impersonar con set_config('request.jwt.claim.sub', accesos.auth_pin_id) + set role authenticated.
- Interfaz: Playwright (npm root -g) contra la app servida con page.route, con un "Supabase de mentira" que manda cada consulta a /__sb y el test la ejecuta con psql como ese usuario (soporta select/eq/is/order/limit y rpc, incluidas funciones setof). Probar en 1366 y 390 px; scrollWidth debe ser igual al ancho.
- Para PDFs: pdf-lib (UMD) se tendrá que conseguir con npm pack (jsdelivr bloqueado en la sesión; en la app sí se carga de cdn.jsdelivr.net).

## 10. Abierto
- Fase 5 completa (ver §3). Fase 6: saldos iniciales que da Gaby (tipo 'saldo_inicial' ya existe en movimientos), PINs a todos, día del cambio (M6). Fase 7: N1 avisos al celular, vacaciones (B9), reportes (N4), respaldos/export (N7), guía (N8), escaneo firmado (P7), métricas (N6).
- Avisos de nombre por revisar: "Gomez", "Nuñez", "Estevez". Horarios "por revisar" (10) y sin horario: Teotzinitztli y Wario.
- Privacidad técnica: empleados se lee con select('*') (incluye roles); en la UI Laura no lo ve, pero por API sí. Si Valen quiere blindarlo, restringir columnas (no se ha pedido).

## 11. Glosario
- Gaby: filtro (2ª etapa). Laura: jefa de Administración, Gestión e Intendencia Y aprobación final. Raúl: jefe del Taller. Max: jefe de Secretaría Técnica. Pável: director; firma a los jefes.
- -R1/-R2: folios de corrección. PRUEBA: folio de prueba (solo Valen). Etapa del banco: jefe, o Gaby si el jefe se salta o es corrección. Reverso: movimiento que cancela otro (nunca se borra). Estampa: bitácora a la que se fue un movimiento.

## 12. Qué NO hacer
- No dejar cosas "solo en el wireframe" cuando Valen ya corrigió: construir en la app y publicar.
- No inventar reglas: si no está en 01 o en RESPONDIDAS, se pregunta.
- No tocar el sistema viejo de Google ni mandar avisos reales a nadie.
- No dar SQL en pedazos ni con tablas temporales. No editar ni borrar movimientos (append-only).
- No mostrar el nombre de Valen en nada real (solo pruebas).

ANTES DE SEGUIR: explícame en 5 líneas qué entendiste (objetivo, dónde nos quedamos, siguiente paso, cómo trabajamos y qué no debes hacer) y dime si te falta algo. No avances hasta que te confirme.
