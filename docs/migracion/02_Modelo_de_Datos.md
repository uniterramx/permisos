# 02 · Modelo de datos

> Parte 1 = cómo están HOY los datos (para migrar). Parte 2 = propuesta para Supabase (Postgres).
> La propuesta es un punto de partida: Claude Code la valida con Valen antes de crear tablas.

---

## PARTE 1 · Estructura actual (medida en vivo el 21-oct-2026)

### 1.1 Organigrama (`1QvqqQPlFya05FW1ai3dBJRSnQURaFcf_DsqVh6CsC5w`)
- **Empleados** (fila 1 encabezados, datos 2–27 = 26 personas; filas 29–31 = avisos de Valen):
  A Nombre completo (oficial) · B Iniciales · C Puesto (oficial) · D Área / Departamento ·
  E Quién valida · F Quién firma · G Tipo de jornada (`Tiempo Completo`/`Medio Tiempo`) · H En nómina (`Sí`/`No`).
  Los nombres en E/F son texto (dropdown de validación, **no** smart chips).
- **Vacaciones**: A Nombre · B Área · C En nómina · D (vacía) · E Fecha de ingreso · F Años cumplidos ·
  G Días correspondientes · H Días tomados · I Días disponibles · K:L tabla de ley.
  ⚠️ No coincide con el script 38 (que creaba A Nombre · B Fecha · C Años…): Valen la reacomodó.
- **Áreas y Jefes**: A Área · B Jefe del área · C Puesto del jefe (6 filas).
- **Horarios Medio Tiempo**: A1 = "REGLA GENERAL TIEMPO COMPLETO: 9:00 a 18:00 hrs"; fila 3
  encabezados Empleado · Periodo · Lunes · Martes · Miércoles · Jueves · Viernes; valores `9:00-14:00`,
  `-` = no labora.

### 1.2 Bandejas (5 archivos, datos desde la **fila 20**, encabezados en la 19, tablero en 1–17)
Payload común **A–R (18 columnas)**:
| Col | Campo | Ejemplo |
|---|---|---|
| A | Folio | F-VMM-2026-0012 |
| B | Recibido | 19/08/2026 13:09 |
| C | Empleado | Valentina Morales Mendoza |
| D | Tipo de variación | Ausencia / Llegada tarde / Llegada temprana / Llegada a destiempo / Salida anticipada / Horas extras / Cambio de horario / Omisión de checado / Reposición / Corrección |
| E | Justificación | (lista §2.1 del 01) o "Cambio de horario" |
| F | Fecha inicio | 18/08/2026 |
| G | Fecha fin | 18/08/2026 (siempre llena; = inicio si es un día) |
| H | Hora referencia | 15:30 (formato HH:mm) |
| I | Hora fin | 19:00 |
| J | Duración / día(s) | **siempre vacía (columna muerta)** |
| K | ¿Mueve banco? | Depósito / Retiro / Deuda / Reposicion / No |
| L | Horas (+/−) | 4 / −5 (editable por el jefe) |
| M | Proyecto (corto) | Hospital de Puerto Vallarta |
| N | Proyecto (oficial) | Hospital Civil de Guadalajara de Puerto Vallarta |
| O | ¿Qué olvidó checar? | Entrada / Salida / Ambas |
| P | Motivo / detalle | campo3 \| motivo \| razón real (+ "CORREGIDA - continúa en …") |
| Q | Folio a corregir | F-VMM-2026-0001 |
| R | Redacción oficial | texto que va al PDF |

Columnas de decisión por archivo:
| Archivo | S | T | U | V | W | X | Y |
|---|---|---|---|---|---|---|---|
| Jefe (Raúl/Max/Laura-jefa) — 21 col | **Dec jefe** | Coment jefe | Fecha | | | | |
| Gaby — 25 col | Dec jefe (espejo) | Coment jefe | **Dec Gaby** | Coment Gaby | Fecha Gaby | Dec Laura (espejo) | Coment Laura |
| Laura-formatos — 25 col | Dec jefe | Dec Gaby | Coment jefe | Coment Gaby | **Dec Laura** | Coment Laura | Fecha Laura |
(El encabezado de S dice "Decisión Raúl" / "Decisión Max" / etc. según la pestaña.)

### 1.3 Banco de Horas (`1PLr7OjOpdm1m6zLTyzwxZGQG49Nihiyjclt6R-lRJD4`), una pestaña por área
- Filas 1–2 título; fila 4 "Saldos por empleado"; fila 5 encabezados; fila 6+ un renglón por empleado:
  A:B Empleado · C:D DEPÓSITOS · E:F RETIROS · G:H SALDO DISPONIBLE · I DEBE · J REPUESTO · K PENDIENTE (fórmulas).
- Luego fila espaciadora, "Movimientos", encabezados y datos (lo más nuevo ARRIBA):
  A Fecha registro · B Folio · C Empleado · D Tipo (`Deposito`/`Retiro`/`Saldo inicial`/`Deuda`/`Reposicion`, **sin acento a propósito**) ·
  E Proyecto / referencia · F Día(s) del evento · G Horario (de-a) · H Cálculo · I Horas (+/−) ·
  J Saldo después · K Horas reposición · L Bitacora (estampa = folio B-…).
- ⚠️ La posición de columnas puede variar por pestaña (Taller es la vieja renombrada); el código la
  detecta por encabezado. Al migrar, **leer por nombre de encabezado**.

### 1.4 Panel general (`1kkUVHW2T-YEFqRoDPIkNyAj5byiecJo-gHiCbVoZxEg`), pestaña "Panel"
Datos desde fila 17, 13 columnas A–M (ver 01 §4.9).

### 1.5 Registro maestro (`1dfv9IHqh6YnrUcoK1VQevJ7CY50vuBPjeO7Z_xJkkcU`) — no accesible hoy con el conector
Pestañas: "Registro maestro" (fila 2 encabezados, datos desde 3; 21 col: Registrado · Área · ¿Jefe? +
payload A–R) · "Registro de cambios" (Fecha y hora · Quién (correo) · Archivo · Pestaña · Folio ·
Columna · Valor anterior · Valor nuevo · Revisar) · "Conciliaciones" (Fecha · Que hizo · Folio ·
Empleado · Destino · Detalle).

### 1.6 Proyectos UT (`1VyD03jM0p_VDwZw7XOpMD5aDLAAkFsoYAre5MSHivgo`)
Fila 2 encabezados: A Nombre Oficial · B Nombre Corto; datos desde fila 3 (13 proyectos; 6 sin
nombre oficial → N queda vacía).

### 1.7 Propiedades del script (ScriptProperties) — viven en Apps Script, no en Sheets
`FOLIO_<INICIALES>_<AÑO>` (contador por persona) · `ID_BANCO` · `ID_MAESTRO` · `COLA_PDF_LAURA`.
Al migrar, los contadores se **reconstruyen** desde el máximo folio existente (no hace falta leerlos).

---

## PARTE 2 · Propuesta para Supabase

Convenciones: `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`, enums
de Postgres para todo lo que hoy es texto-llave. Zona horaria **America/Mexico_City** para fechas de
negocio (guardar `date` para fechas del evento y `time` para horas; `timestamptz` para sellos).

### 2.1 Catálogos
```
areas(id, nombre text unique, tiene_bandeja_jefe bool, orden int)
  -- Taller de Proyectos, Secretaría Técnica, Administración, Gestión Inmobiliaria, Intendencia, Dirección

empleados(id, nombre_oficial text unique, iniciales text unique, puesto text,
          area_id fk, valida_id fk empleados null,      -- "Quién valida" (informativo)
          firma_id fk empleados null,                    -- "Quién firma" (PDF)
          jornada enum('TC','MT'), en_nomina bool, activo bool,
          fecha_ingreso date null, apodo text null,      -- apodos: TEPA, CHEMA, NEFER, TOÑO...
          nombre_corto text null)                        -- "Max", "Raúl", "Gaby"

jefes_area(area_id fk pk, jefe_id fk empleados)         -- reemplaza "Áreas y Jefes"
horarios_mt(id, empleado_id fk, periodo text, vigente_desde date, vigente_hasta date null,
            dia_semana smallint 1..5, entrada time null, salida time null)  -- null = no labora
            -- permite turnos que cruzan medianoche (salida < entrada)
proyectos(id, nombre_corto text unique, nombre_oficial text null, activo bool)
vacaciones_ley(anios_desde int pk, dias int)
```

### 2.2 Usuarios y roles
```
usuarios(id = auth.users.id, empleado_id fk unique, rol enum(
   'empleado','jefe','filtro','final','admin'),        -- jefe=Raúl/Max/Laura · filtro=Gaby · final=Laura · admin=Valen
   metodo_login enum('correo','pin'), pin_hash text null,
   pushover_user_key text null, notif_push bool default false)
-- Una persona puede tener varios roles (Laura = jefe + final). Usar tabla usuario_roles si hace falta.
```
RLS: empleado ve solo lo suyo · jefe ve su(s) área(s) · Gaby ve todo lo que pasó la 1ª etapa (y lo
que se saltó) · Laura ve lo que pasó a Gaby · admin todo. La **razón real interna** visible hasta
Laura, nunca en PDF.

### 2.3 Solicitudes (una fila por folio; nada de copias por bandeja)
```
solicitudes(
  id, folio text unique,                 -- F-INI-AAAA-NNNN o ...-R1
  empleado_id fk, area_id fk,            -- área congelada al momento de la solicitud
  es_jefe bool,                          -- congelado
  tipo enum('llegada_tarde','llegada_temprana','llegada_destiempo','salida_anticipada','ausencia',
            'horas_extras','cambio_horario','omision_checado','reposicion','correccion'),
  justificacion enum('comision','home_office','vacaciones','uso_horas','reposicion_horas',
                     'asunto_personal','otro') null,
  fecha_inicio date, fecha_fin date, hora_ref time null, hora_fin time null,
  proyecto_id fk null,
  que_checar enum('entrada','salida','ambas') null,
  texto_oficial text null,               -- campo 3 (asunto personal / otro)
  etiqueta_retiro text null,             -- campo 3 cuando es uso de horas (deuda de diseño: separarlo)
  notas text null,                       -- campo 4 (se imprime)
  razon_real text null,                  -- campo 5 (NO se imprime)
  motivo_cambio_horario text null,
  verificacion text null,                -- [Verificación: CUMPLE…]
  mueve enum('deposito','retiro','deuda','reposicion','no'),
  horas_calculadas numeric(6,2) null,    -- precálculo mostrado
  horas_override numeric(6,2) null,      -- red de seguridad del jefe
  redaccion text,                        -- col R (editable por Gaby/Laura)
  corrige_a uuid fk solicitudes null,    -- la original de una -R
  correccion_sin_origen bool default false,
  etapa enum('jefe','gaby','laura','cerrada'),
  estado_global enum('nueva_espera_jefe','espera_gaby','espera_laura','cambios_solicitados',
                     'aprobada','rechazada','resuelta','corregida'),
  congelada bool default false,          -- Laura aprobó: ya hay PDF
  es_prueba bool default false,
  recibido_at timestamptz, origen enum('form','migracion','carga_manual'))
```

### 2.4 Decisiones (una por etapa; historial completo en eventos)
```
decisiones(id, solicitud_id fk, etapa enum('jefe','gaby','laura'),
           decidido_por fk empleados null, decision enum('pendiente','aprobado','rechazado',
           'pedir_cambios','resuelto','paso_por_correccion','no_aplica'),
           comentario text, decidido_at timestamptz null,
           unique(solicitud_id, etapa))
eventos(id, solicitud_id fk, tipo text, antes jsonb, despues jsonb, actor fk, at timestamptz)  -- append-only
```
Reglas: la decisión de etapa N solo se crea cuando N−1 aprobó/resolvió (o pidió cambios: se avisa a
Gaby). Congelado si laura = aprobado.

### 2.5 Banco, reposición y bitácora (append-only)
```
movimientos_banco(id, empleado_id fk, solicitud_id fk null, folio_ref text,   -- 'CARGA', '-', o folio
   tipo enum('deposito','retiro','saldo_inicial','ajuste','reverso'),
   horas numeric(6,2),                    -- con signo
   referencia text, dias_evento text, horario text, calculo text,
   fecha_registro date, bitacora_id fk null,   -- la "estampa"
   unique(solicitud_id, tipo) where solicitud_id is not null)   -- anti-duplicado

movimientos_reposicion(id, empleado_id, solicitud_id, tipo enum('deuda','reposicion'),
   horas numeric(6,2), referencia, dias_evento, horario, calculo, fecha_registro)

bitacoras(id, folio text unique,          -- B-INI-AAAA-NNNN
   empleado_id fk, anio int, estado enum('activa','cerrada'),
   saldo_anterior numeric null, saldo_final numeric,
   motivo_cierre enum('15_filas','manual','saldo_cero'), cerrada_at timestamptz,
   pdf_path text, escaneo_firmado_path text null)
```
Saldo = `sum(horas)` por empleado (vista). Debe/Repuesto/Pendiente = vista sobre movimientos_reposicion.
El "Saldo después" del viejo NO se migra como verdad: se recalcula.

### 2.6 Documentos, auditoría y avisos
```
documentos(id, solicitud_id null, bitacora_id null, tipo enum('solicitud','bitacora'),
           storage_path text, version int, generado_at, plantilla enum('sin_logo','con_logo'))
auditoria(id, tabla, registro_id, campo, antes, despues, actor, at, riesgo enum('alto','medio') null, motivo)
notificaciones(id, para_empleado_id, tipo, solicitud_id null, leida bool, enviada_push bool, at)
vacaciones_mov(id, empleado_id, solicitud_id null, dias numeric, tipo enum('tomado','ajuste'), at)
folio_contadores(iniciales text, anio int, ultimo int, primary key(iniciales, anio))
```

### 2.7 Folio transaccional
Función `siguiente_folio(empleado_id)` con `insert … on conflict do update set ultimo = ultimo+1
returning` dentro de la misma transacción que crea la solicitud. Formato `lpad(n,4,'0')`.

### 2.8 Lo que NO se migra como tabla
- Tableros/dashboards → vistas o consultas.
- Copias de bandejas, Panel general, maestro, conciliaciones → se vuelven vistas o se archivan como
  histórico de solo lectura (Storage/CSV).
- Formatos condicionales, banding, filtros → UI.
