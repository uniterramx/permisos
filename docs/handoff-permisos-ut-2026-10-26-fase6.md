Hola. Vengo de otro chat donde construimos "Permisos UT", la app nueva del Sistema de Solicitudes de Permiso de Uniterra. El repo CAMBIÓ: ahora es **uniterramx/permisos** (antes vmmterminus-star/uniterra-permisos). No adjunto archivos: todo está en el repo.

Lee COMPLETOS, en este orden, antes de responder:
1. docs/handoff-permisos-ut-2026-10-26-fase6.md  ← este handoff
2. CLAUDE.md (OJO: regla 12 cambió a Outfit)
3. docs/HANDOFF.md y docs/PENDIENTES_VALEN.md
4. docs/migracion/07_Preguntas_Abiertas.md (sección RESPONDIDAS: todas mis decisiones, no las repreguntes; sobre todo M6, B9, N1)
5. docs/migracion/06_Datos_a_Migrar.md (saldos y datos del arranque)

## 1. Objetivo
- Reemplazar el sistema viejo de Google por una PWA propia (GitHub Pages + Supabase): empleado pide → jefe → Gaby (filtro) → Laura (aprobación final) → PDF oficial + banco de horas + bitácora.
- Fin inmediato: arrancar de verdad (Fase 6) y presentársela a Laura. Sin fecha límite fija.

## 2. Dónde nos quedamos
- HECHO y probado por Valen en la base real: Fases 0–5. Versión actual **v0.7.3**. SQL corridos: **001–011**.
- Fase 5 (v0.6.0): PDF de solicitud (se genera y guarda en Storage al aprobar Laura; descargan empleado, Gaby, Laura, admin; jefes no), bitácoras (activa a demanda con folio provisional; se cierra sola a 15 movimientos o Gaby a mano; la cerrada se guarda congelada; aviso a Gaby con botón "📄 Bitácora"), "📁 PDF guardados" con espacio usado y aviso al 80 %.
- Tweaks del 26-oct:
  - v0.6.1: hora con RUEDA tipo iPhone (horas 00–23, minutos de 5 en 5) en Nueva solicitud y Corregir. No da la vuelta (23 → 00 no sigue); Valen no pidió que la dé.
  - v0.7.0: Inicio nuevo (wireframe `docs/wireframes/inicio.html` aprobado): Nueva solicitud en la cabecera + atajos por tipo; franja verde "Por decidir"; "Tu resumen" (Mi saldo: + verde / 0 negro / − rojo; Por reponer: + rojo / 0 negro / − verde); listas compactas; Administración en fila. "👁️ Ver como" en la barra de arriba (solo admin): por ROL (sigues siendo tú) o por PERSONA = solo ver (simula lo que esa persona ve con las mismas reglas de la base, bloquea toda escritura; los avisos de otros no se alcanzan a leer). Banco de horas ordenado por área y luego nombre.
  - v0.7.1: tipografía **Outfit** con jerarquía 700 títulos/cifras · 600 acciones/botones/encabezados · 500 datos clave · 400 texto · 300 secundario.
  - v0.7.2 (SQL 011): la ficha de persona muestra el PIN TEMPORAL hasta que la persona elige el suyo; luego "elegido · lo cambió el dd/mm/aaaa". El elegido NUNCA se guarda ni se ve (opción A de Valen).
  - v0.7.3: casilla "Recordarme en este dispositivo" al entrar (sin ella, al volver a abrir la app pide PIN; recargar la misma pestaña no). "Elige tu PIN" tiene "No soy yo · salir".
  - Repo transferido a la organización **uniterramx** (de Valen). La app ahora vive en https://uniterramx.github.io/permisos/.
- Gaby: tiene PIN TEMPORAL asignado; todavía no ha elegido el suyo (Valen entró con él por error y salió sin cambiarlo).
- AVANCE: ~80 %. Falta Fase 6 (arranque real) y Fase 7 (extras).
- SIGUIENTE PASO CONCRETO: planear la **Fase 6** con Valen, punto por punto: (1) saldos iniciales que da Gaby (banco y reposición, tipo 'saldo_inicial' ya existe en movimientos; formato de captura a decidir), (2) PINs temporales a todos, (3) día del cambio / quién entra el día 1 (M6), (4) revisar avisos de Personas (nombres "Gomez", "Nuñez", "Estevez"; 10 horarios "por revisar"; Teotzinitztli y Wario sin horario). Empezar proponiendo el plan, sin código.

## 3. Decisiones de este chat (+ por qué)
- P5 folio de bitácora: consecutivo corto (0031) para solicitudes; "Inicial", "Ajuste", "Reverso" para esos movimientos.
- PDFs: se dibujan sobre las plantillas RELLENABLES de mayo (`plantillas/*.pdf`, sin campos) con pdf-lib → idénticos al formato aprobado. Ejemplos aprobados por Valen ("va").
- Pruebas de Valen: su propia cadena de bitácoras (`PRUEBA-B-INI-NN`), PDFs en `pruebas/`; "Borrar pruebas" borra también bitácoras, registros y archivos de prueba. (Técnico, no regla nueva: así nunca se mezclan con lo real.)
- La activa no se guarda (se genera al momento); la cerrada sí y queda congelada.
- Inicio: wireframe aprobado tal cual ("me gusta el wireframe, diséñalo así").
- Tipografía: Outfit (eligió entre Alexandria, Outfit, Plus Jakarta Sans, Manrope, DM Sans, Figtree) con 5 pesos.
- PIN elegido: NO se guarda visible (si se guardara, quien tenga el acceso podría entrar como Laura y aprobar en su nombre).
- Dominio: opción 2 = organización de GitHub "uniterramx" (gratis, sin depender de nadie).
- Sesión: siempre a la entrada salvo "Recordarme".

## 4. Descartado (no volver a proponer)
- Guardar/mostrar el PIN elegido. Que Claude transfiera/renombre repos (no tiene herramienta; lo hace Valen). Crear repo duplicado en la organización.
- Lista desplegable de horas de 5 en 5 (288 opciones): reemplazada por la rueda.
- Wireframes como artefacto o dentro de la app; papelera de PDFs; correo/OTP; formulario en una sola página; miniatura del PDF; migrar solicitudes viejas; barras horizontales apiladas.

## 5. Reglas de Valen
- Modo /adhd ENCENDIDO desde el 26-oct: estado en la 1ª línea, UN paso por mensaje, "Por qué" en lenguaje simple, tiempo, "Luego". Para código: plan primero y esperar "dale" (sus correcciones visuales explícitas o "diséñalo así" cuentan como dale). Se apaga con "stop adhd mode".
- Respuestas cortas, ahorro de tokens, español mexicano.
- Siempre publicar a main y decirle: recarga con Ctrl+Shift+R y revisa la versión abajo. Verificar deploy con mcp__github__actions_list ("pages build and deployment") si pregunta.
- SQL: COMPLETO para SQL Editor, probado antes en el Postgres local, termina con select "si". **NUNCA usar `select ... into variable` ni `returning ... into` dentro de funciones**: el SQL Editor de Supabase lo confunde con "crear tabla" y mete `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` en medio (rompió el 010 la primera vez). Usar `v := (select ...)`. Ni siquiera en comentarios.
- Cuando algo no se puede: darle TODAS las opciones posibles, recomendada primero.
- Guardar en docs/PENDIENTES_VALEN.md lo que le toca hacer en la compu.
- Clases CSS nuevas: revisar choques de nombre antes (`.res`, `.lista`, `.fila` ya existían y descompusieron el Inicio; se renombraron a `.tures`, `.ilista`, `.ifila`).

## 6. Datos literales [LITERAL]
- App: https://uniterramx.github.io/permisos/
- Repo: uniterramx/permisos (público). Rama de la sesión anterior: claude/exciting-shannon-x8y45q; se publica con `git push origin <rama>:main`. La app de Claude ya está instalada en la organización uniterramx (push funciona).
- Supabase: proyecto tnlgwfrseajntindzofg (URL y anon key en config.js). La sesión NO se conecta a Supabase.
- Versión: v0.7.3 (const VERSION en index.html y sw.js; subir las dos; agregar js nuevos a SHELL de sw.js).
- Wireframes: docs/wireframes/fase3-bandejas.html, fase4-banco.html, inicio.html, tipografia.html.
- Rescate de PIN de Valen (por si se le olvida otra vez), en SQL Editor: `select public._dar_pin((select id from public.empleados where iniciales = 'VMM'), '000000');` cambiando 000000.

## 7. Archivos (todo en el repo)
- index.html (app, CSS, Inicio, Ver como, sesión/Recordarme, Personas) · js/calculos.js (+ tests/calculos.test.js, 39 pruebas) · js/solicitar.js (Nueva solicitud con rueda y atajos, Mis solicitudes) · js/bandejas.js · js/banco.js · js/pdf.js (generador) · js/documentos.js (PDFs, bitácoras, PDF guardados) · plantillas/solicitud.pdf y bitacora.pdf · icons/logo-uniterra.png · sql/001–011 (todos corridos).
- tests/ui/: arnés de pruebas (Postgres local + Supabase de mentira para Playwright). Ver tests/ui/LEEME.md.

## 8. Cómo se prueba (en la sesión)
- Postgres 16 local en /var/lib/pgut, puerto 54329 (tests/ui/init.sh + supa.sql; ajustar rutas). Correr 001, 003–011; PINs con _dar_pin; impersonar con request.jwt.claim.sub = accesos.auth_pin_id + role authenticated.
- Playwright (npm root -g) con tests/ui/sbfake.js; supabase-js 2.45.4, pdf-lib 1.17.1 y @fontsource/outfit por `npm pack` (jsdelivr y Google Fonts bloqueados en la sesión). Probar 1366 y 390 px.

## 9. Abierto
- Fase 6 completa (ver §2). Fase 7: avisos al celular (N1), vacaciones (B9), reportes (N4), respaldos/export (N7), guía (N8), escaneo firmado (P7), métricas (N6), rueda que dé la vuelta (si la pide).
- PDFs pesan ~65 KB (solicitud) y ~96 KB (bitácora): más que los 60 KB del cálculo de espacio (≈8–9 años en vez de 12). Se puede adelgazar luego.
- Privacidad técnica: empleados se lee con select('*') (incluye roles). No se ha pedido blindar.

## 10. Glosario
- Gaby: filtro. Laura: aprobación final (y jefa de su área). Raúl: jefe del Taller. Max: jefe de Secretaría Técnica. Pável: director; firma a los jefes.
- -R1/-R2: correcciones. PRUEBA: folio de prueba (solo Valen). Estampa: bitácora a la que se fue un movimiento. Reverso: movimiento que cancela otro. "Ver como persona": modo solo ver.

## 11. Qué NO hacer
- No inventar reglas: si no está en 01 o en RESPONDIDAS, se pregunta.
- No tocar el sistema viejo de Google ni mandar avisos reales a nadie.
- No dar SQL en pedazos, con tablas temporales ni con `select ... into`.
- No editar ni borrar movimientos (append-only). No mostrar el nombre de Valen en nada real.
- No escribir código sin el "dale" de Valen (modo /adhd).

ANTES DE SEGUIR: explícame en 5 líneas qué entendiste (objetivo, dónde nos quedamos, siguiente paso, cómo trabajamos y qué no debes hacer) y dime si te falta algo. No avances hasta que te confirme.
