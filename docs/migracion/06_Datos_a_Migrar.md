# 06 · Datos a migrar

> Decisión: **migrar TODO, pendientes incluidos** (21-oct-2026). Conteos medidos ese día con el
> conector de Google Sheets (la cuenta conectada sí ve los Sheets; **no** ve el Registro maestro,
> el Form ni las carpetas de Drive). Para lo que no se ve, la migración se corre desde la cuenta
> **valentina.uniterra@gmail.com** (export a CSV o un Apps Script de exportación de solo lectura).

## 1. Fuentes (IDs)

| Fuente | ID | Acceso hoy | Qué contiene |
|---|---|---|---|
| Google Form "Solicitud de Permiso – Uniterra" | `19anycvuelSkrP5ae7C6k86A6VxKxoTxjq2rIBxLSj64` (llenar: `…/e/1FAIpQLScwc_A8k51Rt4G3gxofrI0X2o-1T2XAbUrbROD0gVaLtChrPA/viewform`) | ✗ | Estructura del Form (copiar textos de ayuda) + respuestas crudas (respaldo) |
| Organigrama Uniterra | `1QvqqQPlFya05FW1ai3dBJRSnQURaFcf_DsqVh6CsC5w` (pestaña Empleados GID 887133218) | ✓ | Empleados, Vacaciones, Áreas y Jefes, Horarios MT |
| 01 Validación – Taller de Proyectos (Raúl) | `1zxWOjt5JI7godOP_qG6BE9PNY1NY-mxzGZBgCgNqcb4` | ✓ | Pestaña Bandeja |
| 01 Validación – Secretaría Técnica (Max) | `1KQxlQrKlmcowiuE8-oCD3jZerRmCgtVulYd-eW63YQo` | ✓ | Bandeja |
| 01 Validación – Laura (jefa de área) | `1ps-9h1O8QiI2plCmxRbvgzDm9H3_MI1etlFT4o2Dwss` | ✓ | Administración / Gestión Inmobiliaria / Intendencia |
| 02 Validación – Gaby | `1X2ScYq93zmOoyRTTuL0j4iOHE6JhvUyTKu-mqL8en1M` | ✓ | 5 pestañas por área |
| 03 Validación – Laura (formatos) | `1Nuaxxkv-FNP90W6SI7XQekF58aMk8YkIEOXKNL0q0Jc` | ✓ | 5 pestañas por área |
| Banco de Horas | `1PLr7OjOpdm1m6zLTyzwxZGQG49Nihiyjclt6R-lRJD4` | ✓ | 5 pestañas por área (saldos + movimientos + reposición + estampa) |
| 00 Panel general | `1kkUVHW2T-YEFqRoDPIkNyAj5byiecJo-gHiCbVoZxEg` | ✓ | Vista (no migrar como verdad; sirve para cruzar) |
| Registro maestro – Solicitudes Uniterra | `1dfv9IHqh6YnrUcoK1VQevJ7CY50vuBPjeO7Z_xJkkcU` | ✗ (permiso denegado) | Maestro + Registro de cambios + Conciliaciones |
| Proyectos UT | `1VyD03jM0p_VDwZw7XOpMD5aDLAAkFsoYAre5MSHivgo` | ✓ | 13 proyectos |
| Carpeta raíz Drive (PDFs) | `1BcaPCl9b1a2KdrXld-VRPSNBauVPcDTa` | ✗ | Área/Permisos/Empleado, Área/Bitacoras/Empleado, Historial de Solicitudes, Historial de Bitacoras |
| Carpeta Manuales | `1nMKnX4KzQfeW8MxWdvDCEnRROioVjS4b` | ✗ | Guías |
| Plantilla PDF Solicitud (rellenable v2) | `1rSphA9w3db2mzBfYbpXcwEROkAmJlHsJ` | ✗ | Descargar |
| Plantilla PDF Bitácora (v2) | `1Rl7m1FohivkdSpD0Vwcapq8pSCtLbjI5` | ✗ | Descargar |
| Base de vacaciones de Gaby (2 hojas: nómina / no nómina, IDs con sufijo "UT") | desconocido | ✗ | Fechas de ingreso, días tomados (usa apodos) |
| IDs de carpetas por persona | en `index.html` (bloque `CARPETAS`) | ✓ | Para ligar PDFs existentes |

IDs muertos (no usar): Raúl `1uhF4xqEQPiAXFyFTGr57zyujSEA-LyuLaMbANG-plz0`, `1UuXyRoRDjKaxTUkf2hLsf5CcCmccHZTT1QghKkbMoX8`;
Gaby `1gDvvEvHzYv2dYmARiecFvtOMQVAJzqcXSL_PZbs6cZU`; Laura `12MH1pi1cc5y5nCIIlhJ4Fh2gk7gyMzyrJSk5xHFJH5U`.

## 2. Catálogos (medidos)

### 2.1 Empleados (26) — organigrama al 21-oct-2026
| Nombre | Ini | Puesto | Área | Valida | Firma | Jornada | Nómina |
|---|---|---|---|---|---|---|---|
| Valentina Morales Mendoza | VMM | Dibujante | Taller | Raúl | Raúl | MT | No |
| Adrián Everardo Gómez Facio (TEPA) | AEGF | Dibujante | Taller | Raúl | Raúl | MT | No |
| Andrea Nefertary Rubio Ayala (NEFER) | ANRA | Dibujante | Taller | Raúl | Raúl | TC | No |
| Jaime Antonio Guzmán Gutiérrez (TOÑO) | JAGG | Arquitecto Proyectista | Taller | Raúl | Raúl | TC | No |
| Diego Misael Pimentel Becerra (DIEGO) | DMPB | Dibujante | Taller | Raúl | Raúl | TC | No |
| Luis Alonso Muñoz Casas (LUIS) | LAMC | Dibujante | Taller | Raúl | Raúl | TC | Sí |
| Jesús Alberto Mendoza Vázquez (ALBERTO) | JAMV | Arquitecto Líder de Proyectos | Taller | Raúl | Raúl | MT | Sí |
| Omar Peñaloza Chávez (OMAR) | OPC | Arquitecto Líder de Proyectos | Taller | Raúl | Raúl | TC | Sí |
| Raúl Edilberto Martínez Carrazco | REMC | Coordinador de Unidad de Proyectos | Taller | Pável | Pável | MT | Sí |
| Juan Antonio Wario González | JAWG | Auxiliar Financiero Contable | Secretaría | **Laura** | **Max** | MT | No |
| Mariana Flores Ballesteros | MFB | Arquitecto Proyectista | Secretaría | Max | Raúl | TC | Sí |
| José María Carrillo Murguía (CHEMA) | JMCM | Arquitecto Proyectista | Secretaría | Max | Raúl | TC | Sí |
| Teotzinitztli Sánchez Sánchez | TSS | Coodinador de Ingenierías (sic) | Secretaría | Max | **Max** | MT | No |
| Héctor Max Roesner Arias | HMRA | Coordinador de Secretaría Técnica | Secretaría | Pável | Pável | TC | No |
| Laura Zafiro Torres Muñoz | LZTM | Gerente de División Administrativa | Administración | Pável | Pável | TC | Sí |
| Andrés Orta Santana | AOS | Encargado de Transparencia y Control de Patrimonio | Administración | Laura | Laura | TC | Sí |
| Miguel Ángel Pérez Du Pont | MAPD | Asesor Financiero | Gestión Inmob. | Pável | Laura | MT | Sí |
| Edgar Estefano Estaco Estevez | EEEE | Servicio Técnico en Informática | Secretaría | Pável | Pável | TC | No |
| Julia Alejandra Hernández Ortiz | JAHO | Auxiliar de Gestión Inmobiliaria | Gestión Inmob. | Pável | Laura | TC | Sí |
| Josué Fernando Camporredondo Escobedo | JFCE | Servicio Técnico en Informática | Secretaría | Pável | **Max** | MT | No |
| Paulo César Cruz Hernández | PCCH | Servicio Técnico en Informática | Secretaría | Pável | **Max** | MT | No |
| Gabriela Téllez Buendía (GABY) | GTB | Auxiliar de Administración | Administración | Pável | Pável | MT | No |
| Pável Morales Rivas | PMR | Director | `Dirección ` | Pável | Pável | TC | Sí |
| María Isabel Soto Nuñez (sic, con espacio final) | MISN | Intendencia | Intendencia | Laura | Laura | MT | Sí |
| Ana Paola Garay Reyes (PAOLA) | APGR | Contador | Administración | Laura | Laura | TC | Sí |
| Karla Yadira Gomez Salcido | KYGS | Seguridad | Administración | Laura | Laura | MT | Sí |
Nombres cortos: "Raúl", "Max", "Laura", "Gaby". Max ≠ nómina pero firma a 4 personas (Wario, Teo,
Josué, Paulo) → contradice la regla "quien firma debe estar en nómina" (07 #D3).

### 2.2 Horarios MT (medidos)
Adrián L–J 9:00-14:00, V 9:00-13:00 · Valentina L–V 9:00-14:00 · Jesús Alberto L–V 9:00-18:00 ·
Raúl L–V 9:00-18:00 · Teotzinitztli y Wario **sin horario** · Miguel Ángel 10:00-17:00 · Josué L–J
9:00-14:00, V `-` · Paulo L 10:00-15:00, M `-`, Mi–V 10:00-15:00 · Gabriela L–J 9:00-18:00, V
9:00-14:00 · María Isabel 7:00-13:00 · Karla 19:30-7:30 (cruza medianoche). Periodos: "Vacaciones
Jun-Ago" o "Indefinido". TC = 9:00–18:00.

### 2.3 Proyectos UT (13)
Plan Maestro CUCosta (= Plan Maestro del Centro Universitario de la Costa) · Edificio PIDAT CUCEI
(= Proyecto Conceptual de Edificio PIDAT - CUCEI) · Hospital de Ciudad Guzmán (= Hospital Civil de
Guadalajara del Sur) · Hospital de Puerto Vallarta (= Hospital Civil de Guadalajara de Puerto
Vallarta) · Casa FIL · Edificio Administrativo CUTlajomulco · Edificio CUCEI Fase 1* · Complejo
Acuático* · Edificio Lagos de Moreno* · Cubiertas ANONAS* · Aulas Magnas (= Aulas Magnas del
CUCosta) · Hospital Civil de Oriente* · Edificio de Posgrados CUCSUR*. (*sin nombre oficial)
En datos aparecen además "Casa Club Andares", "Torre Laprida" solo en EJEMPLOS del PDF (no reales).

### 2.4 Vacaciones (pestaña viva) — ver problemas B-15 del 05. Tabla de ley en 01 §5.10.

## 3. Datos operativos (medidos)

| Conjunto | Conteo | Notas |
|---|---|---|
| Solicitudes totales (Panel general) | **78** (más 2 de Raúl que no están en el panel = **80**) | Primera F-VMM-2026-0001 (17-jul); última F-VMM-2026-0016 (28-ago). Incluye F-VMM-2026-0001-R1 |
| Por área (panel) | Taller 55 · Secretaría 23 · Admin/Gestión/Intendencia 0 | Nadie de esas 3 áreas ha usado el sistema |
| Estado (panel) | 0 espera jefe (⚠️ falso: Raúl tiene 2) · 41 espera Gaby · 32 espera Laura · 4 cerradas | |
| Bandeja Raúl | 42 filas (2 Pendiente, 40 Aprobado) | |
| Bandeja Max | 22 filas | |
| Laura-jefa | 0 en las 3 pestañas | |
| Gaby / Taller | 55 (21 aprob., 33 pend., 1 rechazada) | incluye 14 de Raúl (13 pendientes) |
| Laura-formatos / Taller | 22 filas | |
| Laura-formatos / Secretaría | 20 filas (2 aprobadas = F-TSS-0002 y 0004 "prueba para ver si sale firma correcta", 18 pendientes) | |
| Banco / Taller | 76 movimientos (52 `CARGA` + 24 del sistema, de ellos 1 Deuda y 1 Reposición) | Saldos: VMM 9, AEGF 16.5, ANRA 21, JAGG 2, DMPB 0.5, LAMC 2, JAMV 49, OPC 24, REMC 1. Reposición: VMM debe 5, repuso 4, pendiente 1 |
| Banco / Secretaría | 14 movimientos (5 `CARGA` + 9) | JMCM 9.5, TSS 2 |
| Banco / Admin, Gestión, Intendencia | sin movimientos | |
| Carga histórica (`CARGA`) | 57 movimientos | Verificada contra el RESUMEN de Gaby: Adicional 157 / Aplicación 24.5 / Neto 132.5. Fracciones reales: Diego 8-abr 20:30–00:00 = 3.5; Adrián 25-may 9:00–10:30 = 1.5; José María 9-jun 8:30–9:00 = 0.5 |
| Bitácoras cerradas | 1: **B-AEGF-2026-0001** (Adrián, 15 movs estampados: 14 `CARGA` + F-AEGF-2026-0001; recalculado
corriendo desde 0 cierra en **21.5 h** y pasa por −1 y −2.5. El PDF `Bitacora_PRUEBA_ajuste_de_texto.pdf`
muestra otros datos (16.5 h, folios 0031–0045): era una prueba, no el PDF vigente) | Corte retroactivo 06-ago: 11 empleados, 78 movimientos |
| Registro de cambios / Conciliaciones | ? (no accesible) | Pedir export |
| PDFs de Solicitud generados | ? (no accesible) — al menos los aprobados por Laura | Comisiones anteriores al 06-ago salieron con círculo OTRO (bug A3): regenerar |
| Bitácoras PDF | ? | |
| ScriptProperties (contadores de folio) | no se migran | Reconstruir del máximo folio por persona/año |

## 4. Mapeo viejo → nuevo
- **Una solicitud por folio**. Tomar el payload A–R de la **etapa más avanzada** donde exista
  (Laura > Gaby > jefe) porque trae el texto más curado; decisiones de cada etapa de su propia
  columna (S/T/U del jefe, U/V/W de Gaby, W/X/Y de Laura; respetar el layout de 02 §1.2).
- Para Gaby, la decisión del jefe se lee de su propio archivo (no del espejo).
- `—` en decisión del jefe = `no_aplica` (solicitante jefe o área sin jefe).
- Tipo/justificación por texto → enum (normalizar acentos; "Llegada tardía" → llegada_tarde).
- Fechas `dd/mm/aaaa` (a veces `d/m/aaaa`, sin hora) → `date`/`timestamptz` America/Mexico_City.
- Motivo/detalle (col P) partir por " | " → texto_oficial / motivo / razón real (heurística: si
  justificación es asunto personal u otro, la 1ª parte es texto_oficial; marcar dudosos para revisión).
  Quitar el sufijo "CORREGIDA - continúa en …" y ligar `corrige_a`.
- Banco: cada movimiento → `movimientos_banco` (Deposito/Retiro/Saldo inicial) o
  `movimientos_reposicion` (Deuda/Reposicion); `CARGA` → origen carga_manual; estampa → `bitacora_id`.
  **No** migrar "Saldo después": recalcular y comparar con los saldos de la tabla de arriba (deben
  dar igual; si no, reportar).
- PDFs: importar desde Drive a Storage y ligar por nombre = folio (o solo guardar el link de Drive
  como histórico → 07 #M3).

## 5. Orden de migración sugerido (con dry-run en cada paso)
1. Catálogos: áreas, empleados (trim + confirmar ortografía), jefes, horarios MT, proyectos, ley de vacaciones.
2. Usuarios (correo o PIN) — Valen decide quién usa qué.
3. Solicitudes + decisiones (todas las etapas) + correcciones.
4. Banco + reposición + bitácoras (estampas).
5. Vacaciones (después de limpiar fechas).
6. PDFs (Storage o links).
7. Auditoría vieja (Registro de cambios) como histórico de solo lectura.
8. **Cuadre**: por empleado, saldo nuevo = saldo viejo; por área, conteos por estado = tableros viejos;
   lista de diferencias para que Valen las revise.
9. Día del cambio: congelar el Form (cerrar respuestas) → última migración incremental → abrir el nuevo.

## 6. Datos de prueba para tests (casos reales)
- F-JAMV-2026-0004: horas extra 08:00–09:00 TC → 1 h · F-OPC-2026-0001 08:30–09:00 → 0.5 → 1 h ·
  F-JAMV-2026-0002 07:30–09:00 → 1.5 → 2 h · F-AEGF-2026-0001 MT 14:00–18:00 (oficial 9–14) → 4 h.
- F-LAMC-2026-0003 llegada 11:45 TC con uso de horas → −3 h · F-DMPB-2026-0002 llegada 13:00 → −4 h ·
  F-JMCM-2026-0012 salida 15:00 → −3 h · F-LAMC-2026-0002 ausencia 17–19 jul (vie–dom) TC → −8 h ·
  F-VMM-2026-0004 ausencia 1 día MT (9–14) → −5 h.
- F-VMM-2026-0010 ausencia con "Reposición de horas" → Deuda −5 · F-VMM-2026-0011 repuso 14:00–18:00
  (MT 9–14, sin traslape) → +4 → pendiente 1.
- F-VMM-2026-0003 cambio de horario 10:00–15:00 (MT 9–14: 5 h programadas vs 5 h) → CUMPLE.
- F-VMM-2026-0001 → F-VMM-2026-0001-R1 (corrección real).
- B-AEGF-2026-0001: 15 movimientos estampados, saldo anterior "—", saldo final 21.5, pasa por negativos.
- Ciclo: Adrián tiene hoy 3 movimientos sin estampar (AEGF-0002, 0003, 0004) = su 0002 activa.
