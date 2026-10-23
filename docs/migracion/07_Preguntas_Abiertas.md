# 07 · Preguntas abiertas (lo que Valen tiene que decidir)

> Ordenadas por **cuándo estorban**. Claude Code: pregunta las de "ANTES DE EMPEZAR" en la primera
> sesión, de una en una o en bloques chicos; las demás cuando toque esa parte. Cada una trae opciones.

## RESPONDIDAS (21-oct-2026)
- **M2** → (c) ya no se usa desde ago (se pausó por otros proyectos). No se sabe si algo se rompió. Objetivo: presentárselo a Laura para empezar a usarlo.
- **Alcance de migración** → solo catálogos base; NO solicitudes/decisiones/PDFs viejos. Saldos iniciales (banco, reposición, vacaciones) → (c) los da Gaby al arrancar (ella llevó registro a la par).
- **V1** → (a) paleta cálida de Sheets/Banco + verde del Panel.
- **A1** → (cambio 21-oct) **TODOS entran con PIN** de 6 dígitos, bloqueo tras 5 intentos (desbloquean Valen/Gaby). Sin correo en la pantalla de entrar.
- **Dispositivo** → la app es **primero de computadora** y en segundo plano de celular (diseñar escritorio primero, que también funcione en iPhone).
- **A2** → (b) Valen y Gaby.
- **Hosting** → GitHub Pages; el repo se hace público.
- **Fases** → aprobadas las 0–7 de PROMPT_CLAUDE_CODE.md.

- **Fase 1 · fuente de verdad** → organigrama, proyectos y cualquier otro catálogo se **editan dentro de la app**; los Google Sheets quedan en el pasado (solo fuente de la carga inicial).
- **D4** → corregir solo ortografía que NO sea de nombres ("Coodinador" → "Coordinador"). Los nombres se cargan tal cual; si parecen mal escritos ("Gomez", "Nuñez") → tarjeta de aviso en la app.
- **B7** → cargar los horarios MT que hay, marcados "por revisar" y editables en la app (con fecha de vigencia).
- **PIN inicial** → (a) Valen/Gaby asignan uno temporal; la persona lo cambia la primera vez que entra.
- **D1/D3** → cargar ruteo y firmas tal cual (ya se analizó al construir el sistema viejo). No poner avisos de eso.
- **B1** (22-oct) → (a) la pregunta cambia a **"¿Último día que faltas?"** (ya no "¿en qué fecha regresas?"). El cálculo cuenta de inicio a ese día inclusive.
- **B10** (22-oct) → **separar** el campo 3 en "Redacción para el formato" y "Etiqueta para el banco".
- **B8** (22-oct) → **sin límite** de días hacia atrás por ahora; más adelante se revisa con Laura si quiere un tope.
- **V2** (22-oct) → "Pedir cambios" en **naranja** `#fef0e6/#b06630` (comunica "algo falta o está mal"; el azul no).
- **Horario en la ficha** (22-oct) → cambiar los campos de texto por **selectores de hora** (entrada y salida por día), cada **30 min**, rango base 8:00–20:00 + casilla **"Otro horario"** (0:00–23:30, turnos de noche). Hecho en v0.2.2.
- **Fase 2 · formato del formulario** (22-oct) → **paso a paso como Google Forms** (una pregunta por página, Atrás/Siguiente). Nada de miniatura del PDF: el empleado solo ve un **resumen de información** (su horario, qué afecta, horas que se mueven, cómo queda su banco) y la redacción en texto.
- **Hora de llegada/salida** → selector **cada 5 minutos**.
- **Capturar a nombre de otro** → sí, **Gaby y Valen**; queda registrado quién la capturó.
- **Después de enviar** → no se edita; se corrige con "Corregir una solicitud". Antes de enviar: paso de **revisión + casilla "Confirmo que la información es verídica"** con aviso de que después habrá que corregir.

- **B5 redondeo** (22-oct) → al **cuarto de hora más cercano** (15 min), ya no a la hora completa. Ej.: 1 h 40 min → 1.75 h; 08:30–09:00 → 0.5 h. Confirmado: MÁS CERCANO (no siempre hacia arriba).

- **Fase 3 · wireframe** (23-oct) → aprobado (`docs/wireframes/fase3-bandejas.html`). F1a: una decisión se puede cambiar después de avanzar, con confirmación; se congela cuando Laura aprueba. F2a: Gaby y Laura pueden editar SOLO la redacción y queda registrado quién y cómo decía antes. F3a: al entrar la -R1, la original queda "Corregida → continúa en …-R1" y sale de pendientes. F4a: lote con las pendientes ya marcadas.
- **G1–G5** (23-oct) → comentario obligatorio en Pedir cambios y Rechazar · la bandeja abre en Pendientes con botón Pendientes/Todas · Gaby sigue viendo lo que el jefe mandó a cambios ("Cambios (jefe)", sin acción) para avisar · Panel general solo para quien aprueba · "Resuelto" como botón chico junto a los otros. Área con su color en todas las filas (sin alternado). Resumen por persona sigue el filtro; arriba en compu, abajo en celular.
- **G4 privacidad** (23-oct) → Laura nunca debe poder saber que Valen tiene todos los accesos: en ninguna pantalla se muestra quién más puede ver algo. Valen **solo decide sobre solicitudes de PRUEBA** (así nunca sale "Aprobado por Valen" en una real). Gaby sí puede ver los roles de Valen en Personas (no hace falta esconderlos).

- **Fase 4 · reglas** (23-oct) → **B4a** saldo negativo permitido, con aviso al jefe en el detalle antes de aprobar ("queda en −1.5 h"). **B3a** si el jefe cambia una decisión ya aprobada → movimiento de reverso automático (nunca se borra); si vuelve a aprobar, se registra otra vez. **B2 (propuesta de Valen)** al aprobar Gaby una -R1 → se **cancela** (reverso) el movimiento de la original y se registra el de la corrección completo. **H1a** el jefe puede cambiar las horas antes de aprobar (queda quién y cuánto daba el cálculo). **H2a** ajustes a mano: solo Gaby (Valen solo en pruebas). **N3a** cada empleado ve su saldo, movimientos y reposición; jefes ven su área; Gaby y Laura ven a todos. **P0 (Valen)** las pruebas mueven el banco real de la persona pero esos movimientos SOLO los ve admin; al terminar se borran los folios de prueba y sus movimientos. **B9a** vacaciones pasan a la Fase 7. **H1-Gaby**: cuando el solicitante es jefe (el banco se mueve al aprobar Gaby), Gaby también puede cambiar las horas, con registro. **Rechazo posterior** (23-oct): si Gaby o Laura rechazan algo que ya movió el banco → reverso automático + aviso en la app al empleado y a quien lo aprobó (sale en su Inicio hasta que da "Entendido"). Si después cambian el rechazo, el movimiento se registra otra vez.

- **Fase 5 · PDFs** (23-oct) → **P1a** logo automático: en nómina CON logo, fuera de nómina SIN logo. Logo en `icons/logo-uniterra.png` (sacado del vectorial que dio Valen; ícono + "Uniterra" en rojo Uniterra `#E35A48`, lema "Innovación en Hábitat" casi negro `#231F20`, fondo transparente). **P2a** firma derecha = "Valida y firma" (firma_id) de la ficha; a los jefes los firma Pável. **P3c** si el concepto no cabe en 3 renglones → se usan 4 (solo en ese caso). **P4** se GUARDAN TODOS los PDF en Supabase Storage ("como Google Drive"), sin papelera: la app muestra el espacio usado y avisa al 80 %; al llegar, se exportan los años viejos a Drive (Fase 7). Cálculo: plan gratis 1 GB de archivos; PDF con logo ≈60 KB; ~1,300 PDF/año ≈ 80 MB/año ≈ 12 años. Ojo: el proyecto gratis se pausa tras 1 semana sin uso (se reactiva con un clic en Supabase). **P5a** descargan el PDF de solicitud: Gaby, Laura y el propio empleado. **P6** la bitácora se CIERRA SOLA al llegar a 15 movimientos (y Gaby puede cerrarla a mano antes); al cerrarse → aviso a Gaby para imprimir y recoger la firma del empleado; el empleado siempre puede ver/descargar su bitácora activa. **P7a** subir escaneo firmado → Fase 7 (quizá ni haga falta).
- **P5 folio de la bitácora** (23-oct) → en la columna FOLIO: consecutivo corto (`0031`) para solicitudes; **Inicial**, **Ajuste** y **Reverso** para esos movimientos. Ejemplos de PDF aprobados ("va"). Técnico (no regla nueva): las pruebas de Valen forman su propia bitácora de prueba (no se mezclan con la real); la activa no se guarda (se genera al momento), la cerrada sí y queda congelada.

## ANTES DE EMPEZAR

**M2. ¿El sistema de Google se sigue usando?** Lo último es del 28-ago; hay 2 en Raúl, 33 en Gaby y 18
en Laura esperando. Opciones: (a) sí, sigue vivo y se migra en caliente; (b) está en pausa, se puede
congelar ya; (c) se dejó de usar y hay que entender por qué antes de construir lo nuevo (adopción).

**A1. PIN o correo, "cada quien elige": ¿qué tan seguro?** Con solo PIN cualquiera que sepa tu nombre
puede probar PINs. Opciones: (a) PIN de 6 dígitos + bloqueo tras 5 intentos + quien da de alta el
PIN es Valen; (b) PIN solo para empleados y correo obligatorio para jefes/Gaby/Laura (los que
aprueban); (c) PIN + "recordar este dispositivo". Recomendado: (b)+(a).

**A2. ¿Quién da de alta a la gente y resetea PINs?** (a) solo Valen; (b) Valen y Gaby.

**V1. Identidad visual de la app** (Valen es muy picky: aprobar wireframe antes). Opciones de base:
(a) paleta cálida de sus Sheets/Banco (`#5a4d3e`, `#f8f6f3`, `#efeae3`, bordes `#e2ddd6`/`#ECE4DF`,
alternado `#faf9f7`) + verde del Panel (`#C6E7D0`/`#38761D`); (b) el "malva terrosa" de sus otras
apps; (c) algo nuevo. Fuente Alexandria en todas.

**V2. Colores de estados.** Código vigente: Pedir cambios **naranja** `#fef0e6/#b06630`. Memoria del
formato aprobado (jun): Pedir cambios **azul** `#CFE2F3/#1155CC` y otra paleta (`#FFF2CC`…). ¿Cuál?

**V3. Ícono** de la app (esquinas redondeadas, sin transparencia, PNG + ICO + embebido): ¿idea? (UT,
reloj, sello, calendario…).

**N1. Pushover**: cada persona compra la app de Pushover (pago único, ~5 USD por plataforma tras
30 días de prueba; verificar precio en pushover.net/pricing) y pega su "user key" en su perfil; el
sistema manda los avisos con una sola cuenta de app (límite gratis mensual de mensajes, de sobra
para 26 personas). **No es complicado.** Alternativa sin costo para nadie: **Web Push** nativo de la
PWA (iPhone iOS 16.4+, solo si la instalaron en inicio). Opciones: (a) solo Pushover; (b) Web Push
para todos + Pushover opcional; (c) solo contador en la app. ¿Qué eventos avisan? (ver 01 §10)

## REGLAS DE NEGOCIO (antes de programar cálculos)

**B1. Ausencias: ¿"fecha en que regresas" cuenta como falta?** Hoy el código cobra también ese día
(posible día de más). Opciones: (a) cambiar la pregunta a "último día que faltas"; (b) restar 1 día
automáticamente; (c) dejarlo como está (confirmar con datos reales).

**B2. Corrección que cambia horas**: (a) construir el "banco por diferencia" (movimiento de ajuste);
(b) seguir con "la -R1 no mueve banco" y corregir a mano.

**B3. Si un jefe aprueba y luego rechaza/pide cambios**: (a) reverso automático del movimiento de
banco con confirmación; (b) a mano como hoy.

**B4. ¿Se permite saldo negativo en el banco?** Hoy sí (hay −1 y −2.5). (a) Sí, sin aviso; (b) sí,
pero avisar al jefe antes de aprobar; (c) bloquear.

**B5. Redondeo**: hoy al entero más cercano (0.5 sube → 30 min = 1 h). ¿Sigue igual? (La carga
histórica sí tiene fracciones: 3.5, 1.5, 0.5, 2.25.) (a) entero más cercano; (b) medias horas; (c) exacto.

**B6. Turno nocturno (Karla 19:30–7:30) y días que no labora (`-`)**: confirmar que (a) el turno cruza
medianoche y (b) `-` = 0 h.

**B7. Horarios de medio tiempo con vigencia**: ¿se capturan por periodo con fechas (semestre /
vacaciones) para que el sistema use el correcto según la fecha del evento?

**B8. ¿Tope de días hacia atrás para registrar?** Hoy no hay (se permiten retroactivos e imprevistos).

**B9. Vacaciones (Fase 4)**: ¿se construye ya? ¿descuento automático al aprobar "A cuenta de
vacaciones" (al aprobar el jefe o Laura)? ¿días hábiles L–V? ¿caducidad/periodos? (pendiente de
investigar con RH/Gaby). ¿Gaby deja sus dos hojas y usa esto?

**B10. Campo 3 doble uso**: separarlo en "Redacción para el formato" y "Etiqueta para el banco"
(recomendado) o dejarlo.

**B11. Catálogo de redacciones aprobadas** (idea de mayo): ¿se hace?

## FIRMAS Y PDF

**P1. Logo automático por "En nómina"**: ¿se activa ya? (hay 4 versiones aprobadas en mayo).
¿Bitácora también con/sin logo?

**P2. Espacios de firma** (Raúl no se firma a sí mismo; jefes firmados por Pável): ¿otra plantilla?

**P3. Concepto que no cabe en 3 renglones**: (a) encoger la letra; (b) avisar al aprobar; (c) 4 renglones.

**P4. Escaneo firmado**: ¿se sube a la app y se liga al folio? ¿quién lo sube (empleado, Gaby)?

**P5. Folios corto de la bitácora**: confirmar qué se imprime para movimientos `CARGA`/saldo inicial.

**P6. Regenerar** los PDF viejos de comisión que salieron con OTRO (bug A3): ¿antes o después de migrar?

## ORGANIGRAMA Y ROLES

**D1. ¿"Quién valida" (col E) debe rutear?** Hoy rutea el área (decisión chat 22). Casos que hoy no
cuadran: Wario (Secretaría, valida Laura); varios "valida Pável" de Secretaría (Edgar, Josué, Paulo)
que hoy caen con Max.

**D2. Dirección**: si Pável solicita, hoy cae en la pestaña de Taller. ¿Área propia o no aplica?

**D3. Max firma a 4 personas (Wario, Teo, Josué, Paulo) pero NO está en nómina.** La regla dice que
quien firma debe estar en nómina. ¿Raúl los firma?

**D4. Ortografía**: "Coodinador de Ingenierías", "Karla Yadira Gomez" (¿Gómez?), "María Isabel Soto
Nuñez" (¿Núñez?), espacios al final. ¿Se corrigen en el sistema nuevo?

**D5. Gestión Inmobiliaria** tiene 2 personas y Laura como jefa; ¿se mantiene como área aparte?

## DATOS Y MIGRACIÓN

**M1. Material que no está en la carpeta**: logo Uniterra en PNG, fotos del formato físico, bitácora
de Julieta (mayo), plantillas rellenables actuales (Drive). ¿Dónde están?

**M3. PDFs ya generados**: (a) copiarlos a Supabase Storage; (b) dejar links a Drive como histórico.

**M4. Vacaciones**: fechas de ingreso a futuro y días tomados negativos (05 #B-15). ¿Quién las corrige?
Dudosas desde jul: Gabriela Téllez = "GABY" 6-ene-25 · Ana Paola = "PAOLA" 1-mar-24 (¿suspendida?) ·
Pável (no aparece en la base de Gaby) · Raúl 15-may-25.

**M5. Acceso al Registro maestro**: compartirlo con la cuenta del conector o exportarlo a CSV.

**M6. ¿Quién entra el día 1?** (a) todos los 26; (b) piloto Taller (Laura prefería "todos o nadie"
para no hacer doble chamba); (c) Valen + Gaby + 1–2 personas de prueba primero.

## INFRAESTRUCTURA

**N2. Dominio**: `usuario.github.io/...` gratis o dominio propio (costo anual).

**N3. Consulta de saldo del empleado**: ¿cada quien ve su saldo y su bitácora abierta en la app?
(diseño original: no quería que el empleado entrara a un Sheet; con la app ya no aplica esa objeción).

**N4. Reporte mensual** (Panel: permisos/h generadas/h usadas por empleado): ¿se manda solo a Laura
cada mes o se consulta?

**N5. Auditoría**: ¿la vista de "cambios sospechosos" la ve solo Valen o también Laura?

**N6. Métricas para dirección** (tiempo de aprobación, rebotes, patrones por área): ¿v1 o después?

**N7. Respaldos**: plan gratis de Supabase tiene respaldos limitados. ¿Export semanal automático a
CSV/XLSX (decisión original de 3 capas) en Storage o a Drive/correo de Valen?

**N8. Mini-guía para cada rol** (entregable de cierre): ¿PDF, página dentro de la app o video?

**N9. ¿Se borra `Centro de Links - Uniterra.html`?** (copia vieja; preguntado dos veces sin respuesta).
