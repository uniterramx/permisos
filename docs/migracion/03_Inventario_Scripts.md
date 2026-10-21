# 03 · Inventario de scripts del sistema viejo

> Carpeta **RAÍZ** `Formatos Uniterra/06_Codigo_AppsScript/` = VIGENTE (último cambio 26-ago-2026).
> Carpeta `Sistema_Solicitudes_Permiso/06_Codigo_AppsScript/` = VIEJA (respaldos; no confiar).
> Todos los vigentes viven en **un solo proyecto de Apps Script** (el del motor) y comparten
> variables globales; por eso muchos "reusan" funciones de otros.
> Verificado: los 30 archivos de la raíz están completos (sin bytes NUL ni truncados).
> ⚠️ La carpeta es la fuente de verdad del código, pero ya pasó que lo pegado en Apps Script tenía
> cosas que el archivo no (chat 25). Ejemplo vivo: `31_Panel_Motor.gs` de la carpeta trae
> `ID_PANEL = 'PEGA_AQUI_EL_ID_DEL_PANEL'`; el ID real (`1kkUVHW2…`) solo está en Apps Script.

## A. VIGENTES (carpeta raíz)

| Script | Qué hace | Reemplazo en el sistema nuevo |
|---|---|---|
| `26_Motor_v5.gs` (1033 l.) | **El motor.** `alEnviarForm` (recibe Form, folio, redacción, mueve-banco, horas, ruteo por área, panel, maestro) y `alEditarBandeja` (decisiones, relevos jefe→Gaby→Laura, sellos de fecha, PDF, ganchos de banco/reposición/bitácora/auditoría/sync). Candado LockService. Folios por persona, reseteos, `agregarFila` con blindaje de filtros, dashboards por fórmula, estados nuevos, Laura→Gaby, infoEmpleado/esJefe, mapearTipo, extraerCampos, construirRedaccion, enriquecerRedaccion, verificarCambioDeHorario, clasificarLlegada, horasCalculadas | Funciones de Postgres/Edge: `crear_solicitud()`, `decidir(solicitud, etapa, decision)`; módulo `redaccion.ts`; módulo `calculos.ts` |
| `26_Motor_v5_CANDADO.gs` | Versión vieja con solo el candado | **OBSOLETO** (fusionado al 26 en chat 25) — ignorar |
| `17_Banco_Horas_v4.gs` | Banco por área: montar pestañas, `registrarBancoSiAplica`, `calcularDeposito` (descuento de jornada), `calcularRetiro`, horarios TC/MT, saldos, SEMILLA/saldo inicial, fechas | Tabla `movimientos_banco` + `calculos.ts` (mismas reglas, con tests) |
| `42_Reposicion_Horas.gs` | Deuda/Reposición en columna propia, DEBE/REPUESTO/PENDIENTE, `pendienteDe`, Form de reposición, ayuda de horarios, `verReglasDeColor`, auto-reparación de columnas | `movimientos_reposicion` + vista de pendiente |
| `42_Reposicion_COMO_ENCENDERLO.md` | Guía de 8 pasos para Valen | Referencia histórica |
| `43_Ciclo_Bitacora.gs` | Ciclo de bitácora: estampa, lotes de 15, folio desde estampa, herencia, cierre manual/automático, corte retroactivo, blindaje de borrado (chat 27), lectores para el Panel | Tabla `bitacoras` + función `cerrar_bitacoras_si_aplica(empleado)` |
| `43_Ciclo_Bitacora_PRUEBAS.js` | 75 pruebas en node sobre hoja simulada | **Portar como tests** (casos: 38 movs → 15+15+8, herencia, saltar reposición, 2 empleados, reinicio por año, cierre manual) |
| `24_Generar_Bitacora_Motor_v3.gs` | Dibuja la bitácora con pdf-lib (plantilla v2), texto que se encoge/recorta, carpeta, historial, menú/selector | Generador PDF bitácora |
| `23_Generar_PDF_Motor_v3.gs` | PDF de Solicitud al aprobar Laura; círculos; `datosEmpleado` (firma = col F); `columnasOrganigrama`; `revisarFirmantes`; `regenerarFolio`; `crearOReemplazar` | Generador PDF solicitud + diagnóstico "revisar firmantes" |
| `21_Crear_Carpetas_Drive_v3.gs` | Carpetas Área/Permisos/Empleado y Área/Bitacoras/Empleado + Historial de Solicitudes/Bitácoras + `guardarEnHistorial` + `listarCarpetas` (genera bloque para index.html) | Rutas de Supabase Storage (sin carpetas manuales) |
| `21_Crear_Carpetas_Drive_v2.gs` | Versión sin historial | **OBSOLETO** (v3 lo contiene) |
| `23_Generar_PDF_Motor_v2.gs` | Versión sin reemplazo/historial, firma col E | **OBSOLETO** |
| `24_Generar_Bitacora_Motor_v2.gs` | Bitácora sin ciclo (recortaba a últimos 15) | **OBSOLETO** (bug grave, ver 05) |
| `11_Actualizar_Form_v2.gs` | Modifica el Form existente: textos, abanicos de proyectos, personal por área, Cambio de horario, notas/razón en horas extras y omisión, campos de corrección, Envío→SUBMIT | Formulario propio de la web app |
| `28_Arreglar_Colores.gs` | Alternado por fórmula, números negros/ceros grises en tableros | UI (no aplica) |
| `29_Cargar_Movimientos_Banco.gs` | Carga histórica de 57 movimientos (folio CARGA), dry-run y deshacer; tabla de apodos | Script de migración (los datos ya están en el Banco) |
| `30_Crear_Panel_General.gs` | Genera el archivo "00 Panel general" (proyecto aparte) | Vista "Panel" en la app |
| `31_Panel_Motor.gs` | Alimenta el panel (alta, cambio de estado, `reconciliarPanel`, formato) | Vista SQL (sin copia) |
| `32_Correcciones.gs` | Flujo de corrección -R1, herencia, overrides, regenerar redacción, huérfanas, marcar original | `crear_correccion()` |
| `33_Sincronizar_Estados.gs` | Refleja decisiones hacia adelante; tope en Laura aprobado | Innecesario (una sola fila); conservar la REGLA del tope |
| `34_Reparar_Bandejas.gs` | Repone aprobados faltantes, borra filas vacías, reparación cada hora | Innecesario; dejar diagnóstico de integridad |
| `35_Menu_Herramientas.gs` | Menú "Herramientas Uniterra" en Sheets | No aplica |
| `36_Quitar_Menus.gs` | Borra todos los onOpen | No aplica |
| `37_Panel_WebApp.gs` + `Panel.html` | Panel de control (ver 01 §4.10): pendientes, estado global, reparar, folios, reseteo, borrar prueba, saldo, bitácora, regenerar PDF, carpetas, proyectos, colores, reporte del mes, **bandeja express (aprobar en lote)**, cola de PDFs | Pantallas de la app por rol |
| `38_Crear_Pestana_Vacaciones.gs` | Crea pestaña Vacaciones con tabla de ley | Tabla `vacaciones_ley` + vista |
| `39_Jefes_Como_Empleados.gs` | Banco del jefe al aprobar Gaby; meter jefes en saldos/resúmenes | Regla en `decidir()` |
| `40_Bitacora_Maestra.gs` | Registro maestro append-only | Tabla `solicitudes` (+ eventos) |
| `41_Registro_Cambios.gs` | Log de ediciones + detección de sospechosos | Tabla `auditoria` por trigger |
| `44_Conciliador_Maestro.gs` | Repone lo que está en maestro y en ninguna bandeja; cada hora; log Conciliaciones | Innecesario; diagnóstico |
| `Centro de Links - Uniterra.html` (raíz) | Copia vieja que apunta al Panel viejo (`AKfycbyCs…`) | **OBSOLETO** (Valen nunca respondió si borrarla) |
| `index.html` (raíz) | Centro de Links vigente (Panel `AKfycbwHk…`), en GitHub Pages | Pantalla de inicio de la app |

## B. Carpeta VIEJA `Sistema_Solicitudes_Permiso/06_Codigo_AppsScript/`

| Script | Estado | Nota |
|---|---|---|
| `01_Crear_Google_Form.gs` | Obsoleto | Creó el Form el 04-jun-2026 |
| `01_Crear_Google_Form_v2_COMPLETO.gs` | **Respaldo útil** | Regenera el Form completo con títulos exactos; mejor fuente de la estructura del Form |
| `02/03/04_Crear_Sheet_Raul/Gaby/Laura.gs`, `08_Crear_Sheet_Raul_v2.gs` | Obsoletos | Layout viejo A–H |
| `14_Crear_Sheet_Raul_v3.gs` | Generador vigente de la bandeja de Raúl (layout A–U, tablero) | Referencia visual del tablero |
| `15_Crear_Sheets_Gaby_Laura_v3.gs` | Superado (Gaby/Laura multi-pestaña se hicieron A MANO) | — |
| `25_Crear_Sheets_Max_LauraJefa.gs` | Generador vigente de Max y Laura-jefa | Referencia |
| `05_Motor.gs`, `09_Motor_v2.gs`, `10_Motor_v3.gs`, `16_Motor_v4.gs` | Obsoletos | Historia del motor |
| `26_Motor_v5.gs` (carpeta vieja) | Obsoleto | La buena es la de la raíz |
| `07_Banco_Horas.gs`, `12_Banco_Horas_v2.gs`, `17_Banco_Horas_v3.gs` | Obsoletos | Banco dentro del Sheet de Raúl / una sola pestaña |
| `11_Actualizar_Form.gs` | Obsoleto | Reemplazado por v2 |
| `13_Menu_Boton.gs` | Obsoleto | Menú "Sistema" en Raúl |
| `18_Crear_Plantilla_Doc.gs`, `19_Prueba_Plantilla.gs` | Descartados | Camino Google Doc → PDF ("feo") |
| `20_Prueba_Generar_PDF.gs`, `22_Prueba_Generar_Bitacora.gs` | Pruebas aisladas | — |
| `21_Crear_Carpetas_Drive.gs`, `23_Generar_PDF_Motor.gs`, `24_Generar_Bitacora_Motor.gs` | Obsoletos | v1 |
| `27_Prueba_Ruteo.gs` | Útil como idea | Filas PRUEBA por área + `limpiarPruebas` → en el nuevo: modo prueba |
| `generador_plantilla_pdf.py` | **Vigente** | Genera `Solicitud_Permiso_RELLENABLE.pdf` (reportlab). ⚠️ el rellenable v2 con `jefe_pie` editable (chat 16) se generó aparte; la versión en Drive es la buena |
| `generador_bitacora_pdf.py` | Obsoleto | v1 (99 campos) |
| `generador_bitacora_pdf_v2.py` | **Vigente** | Plantilla de bitácora v2 (116 campos) + ejemplo |
| `05_Motor_COMO_ENCENDERLO.md`, `07_Banco_COMO_ENCENDERLO.md` | Históricos | — |

## C. Otros archivos en la carpeta
- `roadmap-por-fases.skill`, `roadmap-por-fases/SKILL.md`, `zinwQAvi` (zip de esa skill): no son del sistema.
- `_raster_bitacora.png`, `_raster_check.png`: capturas de verificación de PDFs (jun-2026).
- `03_Material_Referencia/`, `04_Datos_Maestros/`, `05_Output_Sistema/{Backups,Bitacora_de_Generacion,Por_Empleado}`:
  **vacías en local**. Las fotos del formato físico, el logo y la bitácora de Julieta de mayo no
  están en la carpeta (07 #M1).

## D. Disparadores (triggers) vivos en Apps Script (según código; no verificable desde aquí)
`alEnviarForm` (onFormSubmit) · `alEditarBandeja` (onEdit × 5 Sheets) · `conciliarTodo` (cada hora;
reemplazó a `repararBandejas`) · `generarPDFsPendientes` (cada minuto mientras haya cola) ·
`alAbrirBanco`/`alAbrirBandeja` (onOpen, probablemente quitados por `quitarTodosLosMenus`).
Implementación vigente del Panel: `https://script.google.com/macros/s/AKfycbwHkUtyQ6KEPzuvo8xmpPmkbawB7EpW9dedSsqkNv7PuOx21GIFznYOHLQbjt2-SinL/exec` ("PANEL — el bueno (Netlify)").
