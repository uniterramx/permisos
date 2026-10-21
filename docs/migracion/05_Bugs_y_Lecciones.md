# 05 · Bugs que ya pasaron, bugs vivos y lecciones

> Formato: **qué pasó → causa → cómo se arregló → qué hacer en el sistema nuevo.**
> Sección A = históricos (resueltos en el viejo). Sección B = **vivos hoy** (encontrados al medir el
> 21-oct-2026 o documentados como pendientes). Sección C = lecciones de trato con Valen.

## A. Bugs históricos

| # | Qué pasó | Causa | Arreglo en el viejo | En el sistema nuevo |
|---|---|---|---|---|
| A1 | **Bug del FILTRO**: F-VMM-2026-0012/13/14 se perdieron completas y en silencio (12–26 ago) | Raúl tenía un filtro con filas escondidas en la col Decisión; Sheets rechazó el `copyTo` de formato y, como Apps Script manda operaciones en bloque, se cayó TODO (insertar + formato + datos). El error asomaba en `extenderBandingArriba` (primer `getBandings()`), no en la operación culpable. Los tableros con COUNTIF decían "0 pendientes" → las filas no estaban ocultas, **no existían** | `_filtroGuardar/_filtroRestaurar` en `agregarFila`, panel y banco; conciliador 44 contra el maestro, cada hora | Escritura transaccional en Postgres. Prueba explícita: "si falla un paso, no queda nada a medias y el error se ve". **Lección: cuando un síntoma coincide con lo que el usuario señala, revisa el log antes de descartarlo (Valen tenía razón)** |
| A2 | Fila vacía en Gaby / dato en la fila equivocada | Envío del Form y aprobación corriendo al mismo tiempo; uno insertaba filas mientras el otro ya había calculado su renglón | LockService (candado) en motor; reparador 34 | Transacciones + IDs (nunca "número de fila") |
| A3 | Toda **COMISIÓN** salía marcada **OTRO** en el PDF, desde siempre | Mapa con llave exacta `'Comisión'` vs opción real `'Comisión / reunión externa / visita a obra'` | Búsqueda por palabra clave sin acentos | Enums. Hay que **regenerar** los PDF viejos de comisión (pendiente de Valen) |
| A4 | Patrón repetido 3 veces: comparar etiquetas largas del Form con `===` | Títulos/opciones del Form usados como llaves | Normalizar | Enums/IDs; textos de UI libres |
| A5 | El PDF firmaba con el **validador** (caso Max, que no está en nómina) | `datosEmpleado` leía col E por posición; E pasó a ser "Quién valida" y F "Quién firma" | Buscar columnas por NOMBRE de encabezado; firma = F con respaldo E | Campo `firma_id` explícito + diagnóstico "revisar firmantes" |
| A6 | Teotzinitztli salió firmada por Max | Hueco en "Quién firma" del organigrama | Llenar el organigrama (no código) | Validación: firmante obligatorio y en nómina (o advertencia) |
| A7 | "Todo cae en Taller" | Typo en el organigrama: "Carrilo" vs "Carrillo"; el sistema identifica por nombre exacto; fallback a Taller | Match tolerante + nombre canónico; regla: un cambio de nombre se refleja en Form, banco, resúmenes y carpetas | IDs. Nunca fallback silencioso a un área: error visible |
| A8 | Al agregar al jefe al resumen se **encimaron fórmulas sobre los datos** de Gaby y Laura (#REF, datos perdidos) | `fijarFormulasDashboard` recorría "hasta vacío" y la fila 17 era el centinela | Tope duro + copiar fila plantilla; se recuperó con Historial de versiones | No mezclar tablero y datos en la misma superficie |
| A9 | Dependencia circular / #REF en tableros | Fórmulas de columna entera `$C:$C` incluían las propias celdas del resumen | `INDIRECT("C20:C")` | Consultas SQL |
| A10 | **Bitácora recortada en silencio** | `movimientosDe` juntaba todo y se quedaba con los últimos 15; cada generación sacaba folio nuevo con el mismo contenido → traslapes | Ciclo con estampa (43) | `bitacoras` + estampa por movimiento |
| A11 | Folio de bitácora fijo en -0001, luego reusaba números al borrar PDFs | Folio calculado contando archivos | Folio = máximo estampado + 1 | Secuencia en BD |
| A12 | `borrarBitacorasViejas()` se llevó la bitácora vigente | Borraba por patrón de nombre | Blindaje chat 27: solo huérfanas; si no puede leer estampas, no borra nada; escape `PERMITIR_BORRAR_VIGENTES=false` | Nada se borra por patrón; "vigente" es un dato |
| A13 | Marcas de "corregida" (tachado gris) se contagiaron a todas las filas nuevas | `agregarFila` copia el formato de la fila de abajo | Marcar con NOTA y TEXTO, nunca formato | Estado en datos, no en estilo |
| A14 | El renglón nuevo quedaba **sin color**; colores que "no se ven" | Formato condicional anclado en la 1ª fila de datos (se recorre al insertar arriba); **gana la PRIMERA regla** que aplica, y el alternado pintaba fondo | Anclar en el encabezado; reglas propias primero (`misReglas.concat(ya)`); alternado al final; fórmula `INDIRECT("D"&ROW())`; `verReglasDeColor` | No aplica (UI con CSS) — pero la lección "verifica la prioridad antes de afirmar" sí |
| A15 | Columnas fantasma y "Saldo después" pisado en el banco (2 corridas = 2 columnas) | `insertColumns(n)` inserta ANTES de n | `insertColumnsAfter` + auto-reparación; **nunca asumir el ancho**: leer encabezados | Migración: leer columnas por nombre de encabezado |
| A16 | Horas como `12/30/1899` | Leer celdas de hora con `getValues()` | `getDisplayValues()` / formato `HH:mm` | Tipos `time`; al migrar, leer valores mostrados |
| A17 | Notas adicionales se perdían; campos 3 y 4 competían por la misma celda; campo 5 se perdía | Mal reparto de campos libres | Reparto chat 19 (R = fija/campo3 + notas; P = campo3 \| razón real) | Campos separados |
| A18 | Reportar la jornada completa inflaba horas extra (7–20 contaba 13) | No se descontaba el horario oficial | Descuento de traslape L–V | Mismo cálculo + tests |
| A19 | "MEDIO TIEMPO" se leía como Tiempo Completo | Solo buscaba "MT" | Buscar "MEDIO" o "MT" | Enum |
| A20 | Fecha de regreso repetida en PDF ("del 05/08 al 05/08") | El motor siempre llena fin = inicio | No imprimir si es igual | Igual |
| A21 | Envío del Form dejó de enviar | Al agregar una sección al final, "Envío" mandaba a "Siguiente" | Forzar Envío → SUBMIT | No aplica |
| A22 | Renombrar una pregunta del Form ("…(opcional, se imprime)") rompió el motor | Título = llave | Revertir; info nueva va en la AYUDA | No aplica (enums) |
| A23 | PERMISSION_DENIED a Raúl (cuenta institucional UdG) al generar bitácoras | Los menús corren con la cuenta de quien los usa; dominios bloquean apps sin verificar | Web App "ejecutar como Valen" | Auth propia (correo/PIN) |
| A24 | El Panel servía código viejo | La Web App corre la versión **desplegada**; además había varias implementaciones sin nombre | Sello de versión visible + redesplegar siempre; implementación con nombre | Deploy por GitHub Actions + versión visible en la app |
| A25 | `/macros/u/1/s/...` "No se pudo abrir el archivo" | Chrome con varias cuentas de Google | Otro navegador | No aplica |
| A26 | El 26 de la carpeta no tenía 3 enganches que Valen pegó solo en Apps Script | "Enganche = 1 línea" dicho pero no escrito en el archivo | Escribirlo en el archivo; diferenciar antes de editar | Repo git = única fuente de verdad |
| A27 | Llamada a función no definida → PDFs fallando **en silencio** (try/catch) | `node --check` no caza errores de ejecución | Verificar que toda función llamada exista | Tipado (TypeScript) + tests + errores visibles, nunca tragados |
| A28 | Emojis en strings de .gs rompían el pegado ("Unexpected end of input"); `*/` en comentarios | Editor de Apps Script | Sin emojis en código pegable | Conservador en strings |
| A29 | Mount de OneDrive truncaba .gs en bash (falsos errores de `node --check`) | Sincronización | Verificar con el lector | Trabajar en repo git local |
| A30 | Fórmulas a mano daban "error de análisis" | Sheets en español usa `;` | — | No aplica |
| A31 | Espejo de Laura en Gaby vacío hasta que Laura tocaba la celda | onEdit no se dispara con escrituras de script | Escribir el espejo al crear la fila (chat 27) | Una sola fila: no hay espejos |
| A32 | Sumatorias del banco en 0 | (lo resolvió Valen sola, sin detalle) | — | — |

## B. Bugs / riesgos VIVOS (no arreglados en el viejo — el nuevo NO debe heredarlos)

| # | Hallazgo (verificado el 21-oct salvo que diga otra cosa) | Qué hacer |
|---|---|---|
| B-1 | **El sistema parece detenido desde el 28-ago**: Raúl tiene 2 pendientes (F-VMM-0015/0016 del 27–28 ago); Gaby/Taller 33 pendientes; Laura/Secretaría 18 pendientes + 2 aprobadas; Panel: 41 "Espera Gaby", 32 "Espera Laura", 4 cerradas de 78 | Preguntar a Valen si se sigue usando (07 #M2). Migrar con su estado real |
| B-2 | **F-VMM-0015 y 0016 NO están en el Panel general** (sí en la bandeja de Raúl) → el conciliador horario no las repuso al panel o no está corriendo | Diagnóstico de integridad en el nuevo; en la migración, la fuente es la bandeja + maestro |
| B-3 | **Bandeja express (aprobar en lote)** solo hace banco + relevo: **no** registra reposición, **no** cierra bitácora, **no** registra banco de jefes al aprobar Gaby, **no** actualiza panel/auditoría/sync (las escrituras de script no disparan onEdit) | En el nuevo, aprobar uno o en lote llama a la MISMA función `decidir()` |
| B-4 | Resumen de Gaby/Taller tiene "**Luis Alonso Muñoz**" (sin "Casas") → sus solicitudes cuentan 0 | Tableros por ID |
| B-5 | Día de MT con `-` (no labora; ej. Josué viernes, Paulo martes) cae en el respaldo 9:00–14:00 | `null` = no labora → 0 h |
| B-6 | Turno que cruza medianoche (Karla Yadira, 19:30-7:30) da horas negativas/0 | Soportar salida < entrada (+24 h) |
| B-7 | Horarios MT con periodo "Vacaciones Jun-Ago" siguen vigentes en octubre (el periodo no se usa en cálculos) | Horarios con vigencia por fechas + aviso cuando caduca |
| B-8 | Retiro por ausencia: la pregunta es "¿en qué fecha **regresas**?" y se cuenta como día ausente (posible día de más) — **sin verificar** | Decidir semántica (07 #B1) y cambiar etiqueta a "último día que faltas" o restar 1 |
| B-9 | Saldo de banco puede quedar **negativo** sin aviso (datos reales −1, −2.5) | Regla explícita (07 #B4) |
| B-10 | Corrección no ajusta el banco ("banco por diferencia" no construido) | Movimiento de ajuste |
| B-11 | Sync de estados no revierte el banco: si el jefe aprueba y luego rechaza, las horas quedan | Movimiento de reverso con confirmación |
| B-12 | PDF con o sin logo: una sola plantilla para todos | Elegir por `en_nomina` |
| B-13 | El texto del concepto que no cabe en 3 renglones se pierde sin aviso | Encoger/advertir |
| B-14 | Organigrama: espacios al final en "Dirección " y "María Isabel Soto Nuñez "; Karla "Gomez" sin acento (pendiente de Valen) | Normalizar (trim) al migrar y confirmar ortografía |
| B-15 | Vacaciones: fechas de ingreso **en el futuro** (Adrián 1-ago-26, Andrea 6-nov-26, Jaime 1-dic-26, Diego 6-nov-26, Luis 1-jun-26, Valen 16-feb-26) y días tomados **negativos** (Wario −17, Max −18, Laura −1, Teo −1) | Validar con Valen/Gaby antes de migrar (07 #M4) |
| B-16 | Juan Antonio Wario: área Secretaría Técnica (rutea a Max) pero "Quién valida" = Laura y firma Max (no nómina) | Confirmar (07 #D3) |
| B-17 | Valores de tipo fuera de catálogo en datos: "Llegada tardía" (F-ANRA-2026-0001) | Mapear al migrar |
| B-18 | Laura/Secretaría: "Recibido" sin hora en algunos folios (`11/8/2026`) → filas movidas/escritas a mano | Aceptar fecha sin hora |
| B-19 | El "Saldo después" guardado en el banco no siempre es cronológico (las CARGA se calcularon en orden de carga) | Recalcular saldos |
| B-20 | El registro de cambios no capta borrados de fila, pegados de bloque ni escrituras del motor; correo a veces vacío | Auditoría por trigger en BD (capta todo) |
| B-21 | Permisos: hoy el Panel corre como Valen y "¿quién eres?" no es seguridad | RLS por rol |
| B-22 | Duración (col J) nunca se llena | Calcularla o quitarla |

## C. Lecciones de trato (Valen lo pidió explícitamente)
1. **No afirmar de memoria.** Ir al código/la tabla y reportar lo que dicen. Cuando se hizo así
   (simular su caso exacto en node), salió bien a la primera.
2. Dar **funciones de diagnóstico de solo lectura** (dry-run) en vez de adivinar por turnos.
3. "Me super hiciste bolas": no entregar tabla de casos + efectos + reflexión de golpe. Paso actual +
   bullets + qué hacer en una frase.
4. Explicar paso a paso sin asumir que sabe de código; mostrar qué cambia y por qué **antes** de mover.
5. El editor de Apps Script solo corría funciones sin parámetros (por eso había variables como
   `FOLIO_A_REGENERAR`); Valen intentó meter el folio dentro de la definición y rompió el archivo.
   En el nuevo: toda herramienta de mantenimiento con botón y campo de texto, nunca "edita el código".
6. Si se equivoca Claude: una línea, arreglar, seguir.
