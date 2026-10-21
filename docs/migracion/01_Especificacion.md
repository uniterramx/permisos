# 01 · Especificación funcional

> Fuente: código vigente (carpeta raíz `06_Codigo_AppsScript`, último cambio 26-ago-2026 = "chat 27"),
> HANDOFF (chats 8–26), conversación original (may-2026) y Sheets en vivo (leídos 21-oct-2026).
> Cuando el diseño original y el código difieren, **manda el código** y se anota "⚠️ contradicción".

---

## 1. Personas, áreas y roles

### 1.1 Áreas (exactas del organigrama)
Taller de Proyectos · Secretaría Técnica · Administración · Gestión Inmobiliaria · Intendencia ·
Dirección (⚠️ en el Sheet está escrita `"Dirección "` con espacio al final).

### 1.2 Actores
| Persona | Nombre oficial | Rol en el sistema |
|---|---|---|
| Empleados (26 en el organigrama) | ver 06_Datos_a_Migrar §2 | Llenan solicitudes. Antes acuerdan el permiso **informalmente** (WhatsApp/en persona) con su jefe |
| **Raúl** | Raúl Edilberto Martínez Carrazco — Coordinador de Unidad de Proyectos | Jefe de **Taller de Proyectos**: 1ª validación (permiso). Firma la mayoría de los PDF (también de Secretaría Técnica, ver "Quién firma") |
| **Max** | Héctor Max Roesner Arias — Coordinador de Secretaría Técnica | Jefe de **Secretaría Técnica**: 1ª validación. **No está en nómina → no debería firmar** (pero hoy firma a 4 personas, ver 07 #D3). Se le dice "Max" |
| **Laura (jefa)** | Laura Zafiro Torres Muñoz — Gerente de División Administrativa | Jefa de **Administración, Gestión Inmobiliaria e Intendencia**: 1ª validación de esas 3 áreas (archivo aparte: "Laura-jefa") |
| **Gaby** | Gabriela Téllez Buendía — Auxiliar de Administración | **Filtro de calidad** (2ª etapa, todas las áreas). Informal: no firma. Avisa a los empleados cuando hay cambios. También lleva el sistema de vacaciones en otro archivo |
| **Laura (formatos)** | la misma Laura | **Aprobación final** (3ª etapa, redacción). Su aprobación genera el PDF oficial. Su firma va **arriba al centro** del PDF (decisión de ella: "es tema administrativo") |
| **Pável** | Pável Morales Rivas — Director | No es actor del sistema: no tiene bandeja. Firma solo cuando el solicitante es un jefe ("Firma Pável pendiente"). Es "Quién valida/firma" de los jefes |
| **Valen** | Valentina Morales Mendoza | Administra el sistema (cuenta dueña), corre mantenimiento, enseña a la gente |

### 1.3 Organigrama: columnas y su significado (texto de los avisos de Valen en el Sheet)
| Col | Campo | Regla |
|---|---|---|
| A | Nombre completo (oficial) | "No modificar: un cambio pequeño, como una tilde, cambia todo" |
| B | Iniciales | Se usan en el folio. Únicas por persona; si coinciden dos, comparten contador → agregar número distintivo |
| C | Puesto (oficial) | Se imprime en el PDF bajo el nombre del empleado. Verificar con RH |
| D | Área / Departamento | Define a qué bandeja llegan (ruteo REAL) y se estampa en el PDF |
| E | Quién valida | "Con quién se hablan los permisos, la práctica". **Informativo: el motor NO rutea por esta columna** (decisión chat 22) |
| F | Quién firma | "Quién firma los PDF. Debe estar en nómina. Auditable. La teoría". Si está vacía se usa E como respaldo |
| G | Tipo de jornada | `Tiempo Completo` / `Medio Tiempo` (el código acepta "MT" o "MEDIO") |
| H | En nómina | Sí/No. "Eventualmente definirá si el PDF lleva logo". Control de quién puede firmar |

⚠️ El aviso del Sheet en col D dice "define a quién le llegan" y en E "es a quien se le piden
informalmente"; el aviso de Fase 1 (chat 21) decía que E definiría la bandeja. **Lo vigente (chat 22 +
código): rutea D (área), E es informativo.**

### 1.4 Ruteo (vigente)
| Área del solicitante | 1ª etapa (permiso) | 2ª | 3ª |
|---|---|---|---|
| Taller de Proyectos | Raúl | Gaby / pestaña Taller | Laura-formatos / pestaña Taller |
| Secretaría Técnica | Max | Gaby / Secretaría | Laura / Secretaría |
| Administración | Laura-jefa / pestaña Administración | Gaby / Administración | Laura / Administración |
| Gestión Inmobiliaria | Laura-jefa / Gestión Inmobiliaria | Gaby / Gestión | Laura / Gestión |
| Intendencia | Laura-jefa / Intendencia | Gaby / Intendencia | Laura / Intendencia |
| Dirección (o área sin jefe) | se salta → directo a Gaby, comentario "Área sin jefe asignado (área)" | Gaby / **Taller** (fallback: no hay pestaña Dirección) | Laura / Taller |
| **El solicitante ES jefe** (Raúl, Max, Laura) | se salta → directo a Gaby con Decisión jefe = `—` y comentario **"Firma Pável pendiente"** | Gaby / su área | Laura / su área |

- "Es jefe" = aparece en la columna B de la pestaña **Áreas y Jefes** (Raúl/Taller, Laura/Admin,
  Max/Secretaría, Laura/Gestión, Pável/Dirección, Laura/Intendencia).
- Laura aprueba **dos veces** las de sus 3 áreas: como jefa (permiso) y como formatos (redacción).
- En el sistema nuevo: "área" y "es jefe" deben ser datos relacionales (FK), no texto.

---

## 2. Tipos de solicitud (lo que elige el empleado) y su sección del Form

| Opción en el Form (texto exacto) | Tipo interno | Datos que pide |
|---|---|---|
| Llegué/llegaré tarde | `Llegada tarde` → se reclasifica (§5.6) | Fecha de la llegada tarde · ¿A qué hora llegaste/llegarás? · Justificación (+ 3 textos libres) |
| Salí/saldré antes | `Salida anticipada` | Fecha de la salida anticipada · ¿A qué hora saliste/saldrás? · Justificación |
| Falté/faltaré uno o varios días completos | `Ausencia` | ¿Desde qué fecha te ausentas? · ¿En qué fecha regresas? (opcional: vacía = un solo día) · Justificación |
| Generé horas extras | `Horas extras` | Fecha · Hora de inicio del trabajo extra · Hora de fin · ¿En qué proyecto trabajaste? (lista de Proyectos UT) · Notas · Razón real |
| Cambié mi horario (recorrí mi jornada) | `Cambio de horario` | Fecha del cambio · Hora de entrada (ese día) · Hora de salida (ese día) · Motivo (obligatorio) |
| Olvidé checar entrada o salida | `Omisión de checado` | Fecha de la omisión · ¿Qué olvidaste checar? (Entrada/Salida/Ambas) · Notas · Razón real |
| Repuse horas que debía | `Reposición` | Fecha en que repusiste las horas · Hora de inicio · Hora de fin · Notas |
| Quiero corregir una solicitud anterior | `Corrección` | Folio a corregir (ej. F-2026-0142) · ¿Qué te pidieron cambiar? · Nueva información corregida (opcional) · 5 overrides opcionales (§4.6) |

Antes del tipo: **Selecciona tu área de trabajo** → página "Identificación — [Área]" → **Selecciona tu
nombre** (lista filtrada por área, para no scrollear en el celular). Al final: casilla "Confirmo que
la información es veraz y completa". **Sin recolección de correo** (la mayoría no tiene correo de
trabajo en el celular). No se puede editar tras enviar (para eso está Corrección).

### 2.1 Justificaciones (solo para Llegada tarde / Salida anticipada / Ausencia)
`Comisión / reunión externa / visita a obra` · `Home office` · `A cuenta de vacaciones` ·
`Uso de horas acumuladas` · `Reposición de horas` · `Asunto personal` · `Otro`.

Textos libres de esa sección:
- (3) "Si es Asunto personal u Otro: redacción para el formato oficial" — **deuda de diseño**: con
  "Uso de horas acumuladas" se escribe ahí una etiqueta corta ("Asunto personal") que va al banco; con
  "Asunto personal" se espera una oración completa. En el sistema nuevo, **separar en dos campos**.
- (4) "Notas adicionales (opcional)" — se pega al final de la redacción oficial (se imprime).
- (5) "Razón real interna (opcional, no se imprime)" — la ven jefe/Gaby/Laura; **nunca** llega al PDF,
  al banco ni a la bitácora.
- "Si es Comisión o Visita a obra: ¿qué proyecto o cliente?" (lista de Proyectos UT).

Mensaje de confirmación del Form (vigente): "¡Listo! Tu solicitud quedó registrada y entró a
revisión. Qué sigue: 1) Tu jefe directo la valida. 2) Gaby la pre-revisa. 3) Laura da la aprobación
final. No se envían correos automáticos… Si te piden una corrección, te avisarán por WhatsApp o en
persona; entonces vuelve a llenar este formulario eligiendo «Quiero corregir una solicitud anterior»".

Ayuda de las preguntas de hora (vigente): "Puedes reportarlo de dos formas… SOLO el bloque extra
(18:00 a 20:00) o TU JORNADA COMPLETA (7:00 a 20:00). El sistema descuenta solo tu horario oficial…
En sábado y domingo todo cuenta." Y aviso de AM/PM en celular.

---

## 3. Recepción de una solicitud (qué hace el sistema al enviar)

Orden exacto del motor (`alEnviarForm`), todo bajo un **candado** (no dos operaciones a la vez):
1. Si el tipo es Corrección → flujo §4.6 y termina.
2. Calcula: tipo (y reclasifica llegada), redacción (§6), **¿mueve banco?** (§5.1), **folio** (§4.1),
   recibido (`dd/MM/yyyy HH:mm`), **horas (+/−) precalculadas** (§5.2–5.4) para que el jefe vea el
   número antes de aprobar, redacción enriquecida (§6.3), nombre oficial del proyecto.
3. Registra en **Panel general** (estado inicial) y en el **Registro maestro** (append-only).
4. Deposita en la bandeja de la 1ª etapa según §1.4 con decisión `Pendiente`.

En el sistema nuevo esto es **una sola transacción**: la solicitud existe una vez; "bandejas",
"panel" y "maestro" son **vistas/consultas**, no copias.

---

## 4. Decisiones, estados y flujos

### 4.1 Folios
- Solicitud: **`F-[INICIALES]-[AÑO]-[NNNN]`**, contador **por persona y por año** (ej. F-VMM-2026-0012).
  Iniciales = col B del organigrama (el código viejo las calcula de las primeras letras del nombre
  sin acentos; en la práctica coinciden. En el nuevo: usar col B). Cada año arranca en 0001.
  Iniciales compartidas = misma secuencia (caso raro).
- Corrección: **`<folio original>-R1`**, `-R2` si se corrige una corrección.
- Bitácora: **`B-[INICIALES]-[AÑO]-[NNNN]`** (§5.8).
- Prueba: `PRUEBA-hhmmss` (no consume folio, no mueve banco, el panel las ignora).
- Carga histórica del banco: folio `CARGA`. Saldo inicial: folio `-`.
- Reseteo de folios: el contador se ajusta al **máximo folio que existe** de esa persona (no adivina).
  En el sistema nuevo el folio debe salir de una secuencia transaccional; "resetear" solo para pruebas.

### 4.2 Estados de decisión (valores EXACTOS de los dropdown)
`Pendiente` · `Aprobado` · `Rechazado` · `Pedir cambios` · `Resuelto` · `Pasó por corrección`.
- `Resuelto` = cierre manual "hecho" que avanza a la siguiente etapa llevando "Resuelto"; cuenta
  como cerrada/aprobada en tableros; **no toca banco ni genera PDF** (ni en Laura).
- `Pasó por corrección` = **automático**; lo pone el sistema en la columna del jefe de una `-R1`.
  Avisar a los jefes que **no lo elijan a mano**.
- `—` = no aplica (el jefe se saltó).

Colores del semáforo (bandejas): Pendiente `#fef6e4/#a0872e` · Aprobado `#eaf5e8/#4a8c42` ·
Rechazado `#fce8e8/#b04040` · Pedir cambios `#fef0e6/#b06630` · Resuelto `#e3eef7/#37699e` ·
Pasó por corrección `#f0eaf7/#7a5aa0`. (⚠️ La memoria "formato aprobado" del chat 2 usa
Pendiente `#FFF2CC/#BF9000`, Aprobado `#D9EAD3/#38761D`, Rechazado `#F4CCCC/#CC0000`, Pedir cambios
**azul** `#CFE2F3/#1155CC`; el código vigente usa la paleta cálida de arriba con Pedir cambios
naranja. Confirmar con Valen → 07 #V2.)

### 4.3 Qué pasa en cada decisión
**Jefe (Raúl/Max/Laura-jefa):**
- `Aprobado` → sella fecha → **registra banco** (§5.1) → **registra reposición** (§5.5) → revisa
  **cierre de bitácora** (§5.8) → pasa a Gaby con Gaby `Pendiente`.
- `Pedir cambios` → sella fecha → **también se copia a Gaby** (para que ella avise al empleado).
- `Rechazado` → sella fecha. No avanza.
- `Resuelto` → sella fecha → pasa a Gaby con Gaby = `Resuelto`.

**Gaby:**
- `Aprobado` → sella fecha → pasa a Laura con Laura `Pendiente`. Si el empleado **es jefe**, aquí
  (no antes) se registran su banco, su reposición y su cierre de bitácora.
- `Resuelto` → pasa a Laura con `Resuelto`. `Rechazado` / `Pedir cambios` → sella fecha, no avanza.

**Laura (formatos):**
- `Aprobado` → sella fecha → **genera el PDF de la Solicitud** (§7).
- `Rechazado` / `Pedir cambios` / `Resuelto` → sella fecha. No hay PDF.
- Cualquier decisión de Laura se **refleja en Gaby** (columnas "Decisión Laura"/"Comentario Laura")
  para que Gaby avise al empleado. Al crear la fila en Laura se escribe de inmediato `Pendiente` en
  ese espejo (bug del chat 27: si no, Gaby creía que no había llegado).

**Si piden cambios**: regresa al **EMPLEADO**, no al jefe (el jefe solo autoriza el hecho). El
empleado corrige con el flujo de Corrección. Ayuda de criterio se pide en persona, fuera del sistema.

### 4.4 Sincronización de estados (hacia adelante)
Si una decisión cambia después de haber avanzado (ej. jefe aprobó y luego pone "Pedir cambios"), se
**actualiza** la copia que ya existe adelante (no se duplica):
- Jefe → se refleja en Gaby y en Laura (columna "Decisión [jefe]" y su comentario).
- Gaby → se refleja en Laura.
- **TOPE**: si Laura ya puso `Aprobado`, todo se **congela** (ya hay PDF oficial). Para cambiar algo
  después → Corrección.
- **No revierte el banco** a propósito (borrar un movimiento bueno por un clic mal dado es peor).
  Quitar un movimiento = a mano. En el sistema nuevo: proponer "movimiento de reverso" con
  confirmación (07 #B3).

### 4.5 Tableros (dashboards) de cada bandeja
Tarjetas: TOTAL · APROBADAS (incluye Resuelto y Pasó por corrección) · PENDIENTES · PEDIR CAMBIOS ·
RECHAZADAS. Resumen por empleado (Total/Aprob./Pend./Cambios/Deneg. + barra). Cada bandeja cuenta
**su propia** columna de decisión. Panel general cuenta por **área** y por estado del panel (§4.9).

### 4.6 Corrección (diseño cerrado chats 19 y 23)
1. El empleado elige "Quiero corregir…" y escribe el folio. Se normaliza (trim, mayúsculas, sin
   espacios).
2. Se busca el folio en todas las etapas y se toma **la copia más avanzada** (Laura > Gaby > jefe:
   trae el texto más curado).
3. Si no existe → "**CORRECCIÓN SIN ORIGEN**": cae en Gaby con folio `<folio>-R?` (o `SIN-FOLIO`) y
   aviso para resolver a mano. Nunca se pierde.
4. Si existe → fila nueva `-R1` que **hereda TODO** (payload completo), con:
   recibido = ahora · ¿mueve banco? = `No` · Folio a corregir = original ·
   Motivo = "Corrección de [folio]: [qué te pidieron cambiar]".
5. **Overrides opcionales** (pisan lo heredado si se llenan): nueva fecha (inicio), nueva fecha de
   regreso, nueva hora de entrada/inicio, nueva hora de salida/fin, nuevo proyecto (y su nombre
   oficial). Si hubo override → **recalcula horas mostradas** y, si no escribieron "Nueva
   información", **regenera la redacción automática** igual que una solicitud nueva.
   Si escribieron "Nueva información corregida" → esa gana como redacción.
6. **Tipo o justificación equivocada NO se corrige**: se rechaza y se hace solicitud nueva.
7. La `-R1` **no vuelve al jefe**: entra directo a Gaby `Pendiente`, con Decisión jefe =
   `Pasó por corrección`; y se **muestra** en la bandeja del jefe con ese mismo estado
   (comentario "Corrección de X — ya está con Gaby").
8. La original se marca **con nota y texto** "CORREGIDA - continúa en [folio -R1]" (nunca con
   formato/colores). Sus decisiones no se tocan; simplemente ya no avanza.
   ⚠️ Contradicción: el diseño del chat 23 decía que la original pasaría **automáticamente** a
   `Resuelto`; el código vigente **no lo hace** (solo nota+texto; `Resuelto` quedó manual).
9. **PENDIENTE (no construido): "banco por diferencia"**: si la corrección cambia horas, registrar un
   movimiento de AJUSTE = (horas corregidas − originales), con nota "Corrección del folio X". Caso
   borde: si la original nunca la aprobó el jefe (no movió banco) → no hay diferencia; se registra
   normal. Hoy la `-R1` no mueve el banco nunca (07 #B2).

### 4.7 Jefes como empleados (chat 24)
Los jefes (Raúl/Taller, Max/Secretaría, Laura/**solo** Administración) también piden permisos.
Cuentan como empleados de su área (aparecen en saldos del banco y resúmenes) pero **no se
auto-validan**: van directo a Gaby. Su banco/reposición/bitácora se registra **cuando aprueba Gaby**.
"Es jefe" (ruteo) ≠ "no cuenta como empleado" (se quitó). Pável no lleva banco.

### 4.8 Pedir cambios: el hueco que se cerró
Antes, si el jefe pedía cambios en algo que Gaby no había visto, o Laura pedía cambios, Gaby no se
enteraba (solo por WhatsApp). Hoy: jefe "Pedir cambios" → se copia a Gaby; Laura → espejo en Gaby.
En el sistema nuevo: un estado global de la solicitud + notificación al empleado (y a Gaby).

### 4.9 Panel general (para Laura, "00 Panel general")
Vista de seguimiento de TODAS las solicitudes en vivo desde que se envían. Decisiones de Valen:
**solo panel, sin correos** · compartido con todos pero pensado para Laura · aprobadas y rechazadas
en la misma lista (se filtra por estado) · Motivo y Proyecto visibles, Redacción **no** · área
identificada por **color de fondo** (paleta fría a propósito, que no parezca estado).
Columnas: Folio · Recibido · Empleado · Área · Tipo · Justificación · Día(s) (inicio – fin si
difieren) · Horario ("8:00 a 14:00") · **Estado** · **Con quién** · Motivo/detalle · Proyecto
(oficial, si no corto) · Última actualización.
Estados del panel (texto exacto): `Nueva - espera jefe` · `Espera Gaby` · `Espera Laura` ·
`Cambios solicitados` · `Aprobada` · `Rechazada`. "Con quién" = nombre corto del jefe (primer nombre;
excepción Roesner → "Max"), "Gaby", "Laura" o "—".
Paleta de áreas: Taller `#e8eef5/#4a6484` · Secretaría `#ece9f3/#635a7e` · Administración
`#e4efee/#40706a` · Gestión `#f0eae0/#7d6a4d` · Intendencia `#f2eaee/#7d5a68`.
Regla de reconciliación: el estado lo manda **la etapa más avanzada** donde existe el folio.
(Origen: lo pidió Gaby; Laura se molestaba de no enterarse en tiempo real de permisos/llegadas tarde.)

### 4.10 Panel de control (Web App) — funciones que hay que conservar
Corre como Valen; acceso "cualquier usuario" (por eso hoy no hay seguridad real: es un selector
"¿quién eres?" de comodidad). Secciones y botones (con frecuencia de uso: diario/ocasional/esporádico):
- **Aprobar en lote** — "Bandeja express": dices quién eres, ves tus pendientes **pre-marcados**,
  destachas los que quieras revisar y apruebas de un jalón. En Laura, los PDF se encolan y se generan
  en segundo plano (lotes de ~4.5 min). ⚠️ Bug: no registra reposición, ni cierra bitácora, ni el
  banco de jefes, ni actualiza el panel (05 #B-14).
- **Bandejas**: Ver pendientes por área (folio, área, esperando a, link) · Ver estado global (paso
  de cada folio: "Con el jefe", "Aprobada por Gaby", "PDF listo"…) · Reparar bandejas (diagnóstico +
  casillas).
- **Folios**: folios por persona del año · Resetear folios (uno o todos) · Borrar folio de prueba
  (confirmación en 2 pasos; borra de todas las etapas y del panel).
- **Banco**: consultar saldo de un empleado + aviso de movimientos sin aprobar (cuántos y cuántas h).
- **Documentos**: generar bitácora (abierta) de un empleado con link a su carpeta · regenerar PDF de
  un folio aprobado por Laura (reemplaza el anterior).
- **Mantenimiento**: crear carpetas para gente nueva (y lista de carpetas "fuera del organigrama") ·
  actualizar proyectos del Form · arreglar colores · **Reporte del mes** (por empleado: # permisos
  aprobados por Laura en el mes, h generadas, h usadas; últimos 6 meses).
- Selector de empleado en **dos pasos** (área → empleado). Sello de versión visible.
- Pendiente (no construido): aviso del ciclo de bitácora (lista de bitácoras cerradas con
  recordatorio de imprimir, firmar y guardar) — las funciones lectoras ya existen.

### 4.11 Centro de Links (index.html en GitHub Pages)
Tres zonas por audiencia: **Para todos** (Form · Banco de horas · Manuales) · **Para quien valida**
(Panel general destacado; columnas 1ª aprobación jefes / 2ª y 3ª formatos; navegador de carpetas de
Drive por área → Permisos/Bitácoras → persona) · **Referencia** (Proyectos UT · Organigrama ·
Carpeta raíz). Buscador que ignora acentos. Decisión de estilo de Valen: **nada de barras
horizontales apiladas**; columnas lado a lado + mosaico de tarjetas con subtítulo. Recuerda la última
selección (localStorage). En el sistema nuevo, el Centro de Links se vuelve la pantalla de inicio de
la app según el rol.

---

## 5. Banco de horas, reposición y bitácora

### 5.1 Qué mueve cada solicitud (columna "¿Mueve banco?") — en este orden
1. Justificación = `Reposición de horas` → **`Deuda`** (no toca el banco; §5.5)
2. Tipo = `Reposición` → **`Reposicion`** (no toca el banco; §5.5)
3. Justificación = `Uso de horas acumuladas` → **`Retiro`** (−)
4. Tipo = `Horas extras` → **`Depósito`** (+)
5. Todo lo demás → **`No`** (incluye Cambio de horario, Omisión, Comisión, Home office, Vacaciones,
   Asunto personal, Otro, Corrección, Llegada temprana).
Se registra **cuando aprueba el JEFE** (no Laura) — o Gaby si el solicitante es jefe. Anti-duplicado
por folio. La columna "Horas (+/−)" es **editable** por el jefe como red de seguridad: si tiene un
número, ese manda (con el signo que corresponde al tipo).

### 5.2 Horario oficial de cada persona
- Tiempo Completo: **9:00–18:00** de lunes a viernes; un día completo = **8 h** (ya descuenta 1 h de
  comida, que es flexible).
- Medio Tiempo: pestaña "Horarios Medio Tiempo" (Lunes…Viernes, formato `9:00-14:00`; `-` = no
  labora). Se actualiza **a mano por periodo** (semestre/vacaciones); el campo "Periodo" es solo
  informativo. Si no hay dato: respaldo 9:00–14:00. Día completo MT = salida − entrada del día.
- Para variaciones parciales se cuentan **horas de reloj** contra el horario (sin restar comida).
- El sistema **siempre conoce** el horario; el Form no lo pregunta.
- ⚠️ Bugs del cálculo viejo a corregir: día con `-` cae en el respaldo 9–14 en vez de 0; turno que
  cruza medianoche (Karla 19:30-7:30) da negativo. Ver 05.

### 5.3 Depósito (horas extras) — `calcularDeposito`
- `brutas = fin − inicio`.
- **Jornada completa (chat 25)**: si es **lunes a viernes**, se descuenta el traslape con el horario
  oficial de ese día: `netas = (fin − inicio − traslape)`. Sábado y domingo no descuentan.
- `horas = redondeo al entero más cercano` (`Math.round`; .5 sube). Si ≤ 0 → no hay movimiento.
- Ejemplos: 18:00–20:00 (TC) → 2 h · 07:00–20:00 (TC 9–18) → 13 − 9 = **4 h** · 08:30–09:00 → 0.5 →
  **1 h** · 07:30–09:00 → 1.5 → **2 h** · 18:00–18:30 → 1 h.
- Texto "Cálculo": `"20:00 - 18:00 = 2 h -> 2 h"` o
  `"20:00 - 07:00 = 13 h; menos su jornada 9:00-18:00 (9 h) = 4 h"`.
- Referencia del movimiento = proyecto (nombre corto).
- Diseño original: "bloques de 1 hora, sin caducidad, sin tope, FIFO, el jefe autoriza". No hay
  caducidad ni tope en el código. FIFO es solo conceptual (el saldo es uno).

### 5.4 Retiro (uso de horas) — `calcularRetiro`
- **Ausencia**: suma, por cada día **lunes–viernes** entre inicio y fin (inclusive), las horas de
  jornada de ese día (TC 8, MT su horario). Cálculo: `"(TC) 8h + 8h = 16 h"`.
  ⚠️ Posible bug sin verificar: la pregunta es "¿En qué fecha **regresas**?" (el día que SÍ vino) y el
  código la cuenta como día ausente → podría cobrar un día de más (07 #B1). Datos reales: F-LAMC-0002
  del 17 al 19/07 (vie–dom) cobró 8 h = solo el viernes.
- **Salida anticipada**: `salida oficial − hora real`, redondeo al entero (mín. 0).
- **Llegada tarde / a destiempo**: `hora real − entrada oficial`, redondeo al entero (mín. 0).
- **Llegada temprana**: no cuesta nada.
- Ejemplo real: llegó 11:45 (TC) → 2.75 → **3 h**. Llegó 13:00 → 4 h.
- Referencia del retiro = el campo 3 antes de la barra ("Asunto personal", "Cita médica"…) o la
  justificación. **Nunca la razón real interna.**
- No hay candado de saldo: **el saldo puede quedar negativo** (pasa en datos reales: −1, −2.5).
  07 #B4: ¿se permite?

### 5.5 Reposición de horas (chat 25, definición cerrada por Valen)
**No es usar el banco.** Es: no cumpliste tu jornada (tarde/antes/faltaste) y **repones ese tiempo
trabajando después**. **Neto cero**: ni ganas ni gastas horas guardadas. El banco de horas extra no
se entera. Es hasta psicológico (no gastar lo ahorrado).
- **Deuda**: Ausencia/Llegada tarde/Salida anticipada con justificación `Reposición de horas`. Se
  calcula igual que un retiro (negativo). Referencia = campo 3 o justificación.
- **Reposición**: tipo "Repuse horas que debía" (fecha + de/a). Se calcula igual que un depósito
  (positivo, con descuento de jornada). Referencia = "Reposicion de horas".
- Se registran al aprobar el jefe, en una **columna propia** (no contamina depósitos/retiros/saldo).
- Por empleado: **DEBE** = suma de deudas · **REPUESTO** = suma de reposiciones ·
  **PENDIENTE** = debe − repuesto (>0 debe, 0 al corriente, <0 repuso de más).
- La reposición abona **al total** (no se liga a un folio de deuda; FIFO como el banco).
- **Nunca** aparece en la bitácora de horas extra.
- PDF: la deuda marca el círculo **"Reposición de horas"**; la reposición (repuse) también.
- "Uso de horas acumuladas" se queda en **OTRO** en el PDF (decisión cerrada: son cosas distintas).
- Paleta propia (Valen): encabezados morado `#ece5f5/#6b4a94`, positivo azul `#e3edf6/#37699e`,
  negativo terracota `#f5e4d8/#a56a3f`, cero gris `#c4bdb1`. A propósito **no** verde/rojo (ya
  significan Depósito/Retiro).

### 5.6 Clasificación de llegada
"Llegué/llegaré tarde" se compara contra la entrada oficial de ese día:
hora < entrada → **`Llegada temprana`** (no cuesta) · hora ≥ entrada → **`Llegada tarde`** ·
sin horario claro → **`Llegada a destiempo`**. (Existe en datos un "Llegada tardía" escrito a mano.)

### 5.7 Cambio de horario (neto cero, solo se verifica)
Compara la **duración de reloj** de la jornada recorrida contra la programada (ambas incluyen la
comida). Escribe en Motivo/detalle:
`[Verificación: CUMPLE su jornada — programado 9 h (9:00–18:00), trabajó 9 h.]` o
`[Verificación: QUEDÓ A DEBER 1 h — programado …, trabajó …]`. Si queda a deber **no se descuenta
solo**: queda marcado para que el jefe lo vea. Redacción: ver §6.

### 5.8 Bitácora de horas adicionales — ciclo (chat 26, diseño cerrado "no reabrir")
- **Una bitácora viva por empleado**, cronológica, con todos los depósitos y retiros (saldo
  inicial/carga incluidos), **sin** movimientos de reposición.
- **Corte a 15 movimientos** (filas de la hoja). La regla "cerrar también al llegar a saldo 0" se
  diseñó y quedó **APAGADA** (`CERRAR_EN_CERO=false`): la gente pasa por cero todo el tiempo y salían
  bitácoras de 2–6 renglones. ⚠️ Contradicción con la memoria "design-decisions" (dice que sí cierra
  en 0): manda el código/chat 26.
- **Cierre manual** cuando convenga (fin de año, alguien que se va, antes de auditoría).
- **Memoria = estampa**: cada movimiento impreso guarda el folio de la bitácora a la que se fue.
  Lote ACTIVO = movimientos sin estampa. Lo estampado **no se reagrupa** aunque se editen horas.
- **Folio** `B-[INI]-[AÑO]-[NNNN]` = máximo estampado de ese empleado y año + 1 (nunca contando
  PDFs). Año = fecha de registro del primer movimiento del lote.
- **Herencia**: SALDO ANTERIOR = saldo con que cerró la anterior. Si no hereda (primera, o anterior
  en 0): **guion largo "—"**. Saldo de cada renglón = acumulado corriendo desde 0 (no el guardado).
  Saldo actual = saldo anterior + movimientos del lote. Formato "16.5 hrs".
- **Congelado**: una cerrada no se regenera sola; existe "forzar regeneración" por folio.
- **Emisión automática** del PDF al cerrarse (al aprobar el jefe, o Gaby si es jefe).
- La abierta se genera a demanda (botón), con estado "Activa"; primero se cierra lo que ya debía
  cerrarse (nunca se imprime una hoja recortada).
- Firmas: **empleado + quien firma** (col F). **No Laura.** Se imprime, firma y escanea.
- Diseño original además pedía "firma por cada retiro" → se resolvió con bitácora acumulativa
  re-impresa/re-firmada.
- Estado real (corte retroactivo 06-ago-2026): 11 empleados con movimientos, 78 en total; se cerró
  **una sola**: `B-AEGF-2026-0001` (Adrián, 15 movimientos).

### 5.9 Saldos y consulta
- Saldo disponible = suma de horas (+/−). Depósitos = suma de positivos (incluye saldo inicial),
  Retiros = suma de negativos en valor absoluto.
- Cómo consulta el empleado su saldo: **nunca se cerró** (opciones del diseño: preguntar a Gaby,
  Form de consulta con respuesta por correo, reporte mensual por correo). Valen no quería que el
  empleado entrara a un Sheet. Con la web app: cada quien ve **su** saldo (07 #N3).

### 5.10 Vacaciones (Fase 4 — NO construida)
- Base propia (no se conecta a la de Gaby: ella usa apodos y 2 hojas nómina/no-nómina).
- Pestaña "Vacaciones" en el organigrama (vivo hoy: Nombre · Área · En nómina · Fecha de ingreso ·
  Años cumplidos · Días correspondientes · Días tomados · Días disponibles + tabla de ley).
- Ley "Vacaciones Dignas" (LFT): 1 año 12 · 2→14 · 3→16 · 4→18 · 5→20 · 6–10→22 · 11–15→24 ·
  16–20→26 · 21–25→28 · 26+→30. Disponibles = correspondientes − tomados.
- Pendiente: al aprobar "A cuenta de vacaciones" **descontar días tomados** y **avisar a Gaby**; a
  futuro que Gaby use este sistema y no sus dos hojas. Periodos/caducidad: investigar con RH (07 #N4).

---

## 6. Redacciones automáticas (texto EXACTO del motor)

### 6.1 Base por tipo/justificación
| Caso | Redacción oficial (col R) |
|---|---|
| Horas extras | `Trabajo fuera de horario oficial en proyecto [proyecto].` + notas |
| Reposición (repuse) | `Reposición de horas trabajadas el día dd/mm/aaaa, de HH:MM a HH:MM.` + notas |
| Omisión de checado | `Omisión de checado de entrada.` / `de salida.` / `de entrada y salida.` + notas |
| Cambio de horario | `Variación de horario: jornada recorrida de HH:MM a HH:MM. [Motivo].` (la verificación va a Motivo) |
| Comisión / reunión externa / visita a obra | `Atención a comisión / reunión externa — [proyecto o cliente].` (sin proyecto: `Atención a comisión / reunión externa.`) |
| Home office | `Trabajo en modalidad home office autorizado por mi jefe directo.` |
| A cuenta de vacaciones | `Ausencia a cuenta de días de vacaciones.` |
| Uso de horas acumuladas | `Variación de horario con cargo al banco de horas acumuladas.` |
| Reposición de horas (justificación) | `Variación de horario con compromiso de reposición de las horas correspondientes.` |
| Asunto personal / Otro | el texto del campo 3 tal cual |

Las "Notas adicionales" se pegan **siempre** al final (`unirOraciones`: une con ". " sin duplicar
punto). Fechas `dd/mm/aaaa`; horas `HH:mm` 24 h.

### 6.2 Motivo/detalle (col P)
`campo 3 | motivo del cambio de horario | razón real interna` unidos con `" | "` (la barra es a
propósito porque el campo 3 puede traer puntos). En el sistema nuevo: **campos separados**.

### 6.3 Redacción enriquecida (solo si mueve banco: Depósito o Retiro)
Se agrega: `Mi horario oficial es de H:MM a H:MM h; este día trabajé de HH:MM a HH:MM h.`
(o `…; este día entré a las HH:MM h.` / `…salí a las HH:MM h.`; o solo `Mi horario oficial es de…`
para ausencias) y luego `Generé N h de tiempo adicional.` o `Apliqué N h de mi tiempo acumulado.`
Cada parte cierra con punto. (⚠️ `redondearTexto` ya incluye " h".) No aplica a reposición.
Ejemplo real: "Trabajo fuera de horario oficial en proyecto Edificio Lagos de Moreno. Mi horario
oficial es de 9:00 a 18:00 h; este día trabajé de 18:00 a 19:00 h. Generé 1 h de tiempo adicional."

### 6.4 Catálogo de redacciones (idea original, nunca construida)
Banco de redacciones aprobadas por Laura para reusar (no menú obligatorio: "a veces las razones son
reales"). Valen quitó esa pestaña del organigrama ("no estamos listos"). Ver 07 #N6.

---

## 7. PDF de la Solicitud (resumen; detalle en 04)
- Se genera **solo** cuando Laura (formatos) aprueba. **Todos los tipos generan PDF** (lo pidió
  Laura: la razón real se "embuda" a las opciones del formato).
- Círculo de horario: Ausencia → "ausentarse" (fecha + regreso solo si es distinta) · Llegada
  tarde/temprana/a destiempo → "entrar a las … del día …" · Salida anticipada → "salir a las …" ·
  los demás → ninguno.
- Círculo de concepto: Omisión → OMISIÓN DE CHECADO · Reposición (repuse) → REPOSICIÓN · Horas extras
  y Cambio de horario → OTRO · resto según justificación por **palabra clave** (vacacion → A CUENTA
  DE VACACIONES · home office → HOME OFFICE · reposicion → REPOSICIÓN · comision/reunion/visita a obra
  → COMISIÓN · lo demás, incl. Uso de horas acumuladas y Asunto personal → OTRO).
- Concepto = redacción (3 renglones). Firmas: Laura arriba (fija), empleado + su puesto, **quien
  firma** (col F) + su puesto. Nombres y puestos en MAYÚSCULAS.
- Archivo `[FOLIO].pdf` en `[Área]/Permisos/[Empleado]/` + copia en "Historial de Solicitudes".
  Regenerar reemplaza (no duplica).

---

## 8. Auditoría y red de seguridad (en el viejo eran parches; en el nuevo, diseño)
- **Registro maestro** (fuente de verdad, append-only): cada solicitud procesada con área y ¿jefe?.
- **Registro de cambios**: cada edición a mano: fecha, quién (correo), archivo, pestaña, folio,
  columna, antes → después, y **sospechosos**: (A) cambiar un "Aprobado" ya dado = ALTO (rojo);
  (C) tocar horas o "¿mueve banco?" a mano = MEDIO (ámbar); (B) editar tipo/justificación/fechas/
  horas/redacción de un folio cuya decisión propia ya es "Aprobado" = MEDIO. Valen eligió registro +
  detección, **no** protección (bloqueo), porque solo comparte con Gaby. Límites viejos: no veía
  escrituras del motor, pegados de bloque ni borrados.
- **Conciliador** (cada hora): repone folios del maestro que no existen en ninguna bandeja; las
  correcciones `-R` van a Gaby; no resucita folios en lista de ignorados; reporta avisos.
- **Reparador**: propaga "Aprobado en N ⇒ existe en N+1" y borra filas vacías.
- En el sistema nuevo: una sola tabla de solicitudes + tabla de eventos (decisiones) + log de
  auditoría por trigger de Postgres; los reparadores sobran, pero conserva un **diagnóstico de
  integridad** de solo lectura.

## 9. Respaldos (decisión original, NO implementada)
3 capas: historial nativo + copia semanal automática + export mensual a .xlsx. En el viejo solo
existe el historial de versiones de Sheets. En Supabase: backups del plan + export programado
(CSV/XLSX a Storage) → 07 #N7.

## 10. Notificaciones (decisión nueva 21-oct-2026)
Hoy no se manda **ningún** correo (a propósito; textos del Form lo dicen). Nuevo: contador de
pendientes en la app para cada rol + **Pushover opcional** (quien lo instale registra su user key).
Eventos sugeridos: te toca decidir · te pidieron cambios · tu solicitud fue aprobada/rechazada ·
PDF listo · bitácora cerrada (imprimir y firmar). Notificar al EMPLEADO en "Pedir cambios" y
"Rechazado" resuelve el ping-pong original (Gaby iba persona por persona).

## 11. Ideas originales que siguen vivas (no construidas)
- Marcar formatos faltantes cuando hay auditoría próxima y avisar al empleado.
- Métricas para Laura/dirección: tiempo promedio de aprobación, rebotes por redacción, formatos por
  mes, horas generadas vs usadas, patrones por área.
- Registros retroactivos e imprevistos: sí se permiten (fechas pasadas, sin límite hoy).
- Varias variaciones el mismo día = **una solicitud por variación** (el formato solo permite un
  círculo de horario).
- Mini-guía de uso para cada rol (entregable de cierre).
