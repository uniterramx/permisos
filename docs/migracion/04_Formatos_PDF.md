# 04 · Formatos PDF

> Revisados: los 8 PDF aprobados en mayo (`02_Plantillas_PDF/`: Solicitud y Bitácora × ejemplo/plantilla
> × con/sin logo), la plantilla v2 de bitácora (ago), el PDF de prueba real `Bitacora_PRUEBA_ajuste_de_texto.pdf`
> (B-AEGF-2026-0001) y los generadores `generador_plantilla_pdf.py` / `generador_bitacora_pdf_v2.py`.
> Las plantillas RELLENABLES que usa producción viven en Drive (cuenta de Valen):
> Solicitud `1rSphA9w3db2mzBfYbpXcwEROkAmJlHsJ` · Bitácora v2 `1Rl7m1FohivkdSpD0Vwcapq8pSCtLbjI5`
> (se actualizan con "Administrar versiones", el ID no cambia). Hay que DESCARGARLAS para el sistema nuevo.

## 0. Reglas generales
- Tamaño **carta** (612×792 pt), vertical, una columna.
- **Marco negro** rectangular a 40 pt de cada orilla (1 pt). Valen lo pidió explícito: "un offset de un
  par de centímetros de la orilla". Contenido entre x=60 y x=552.
- Tipografía **Times New Roman** (Times-Roman / Times-Bold estándar de PDF), lo más parecido al
  original. Nada de Alexandria en los PDF.
- Lo rellenado va en Times; los **puestos** en **negritas**; nombres y puestos en **MAYÚSCULAS**.
- Sin fondos azules en campos (se quitaron). Círculos: vacío ○ / lleno ●.
- Las **líneas empiezan justo donde termina cada etiqueta** (+6 pt). Valen lo corrigió en la v1.
- Nombres largos deben caber en su renglón: el texto **se encoge** hasta un mínimo y, si no cabe,
  se recorta con "…" (nunca cortado a media letra).
- **Logo**: el formato es del **corporativo UdG**. Empleados **en nómina → CON logo Uniterra**
  (arriba a la izquierda); **no nómina → SIN logo**. ⚠️ Hoy producción usa UNA sola plantilla (sin
  logo) para todos; la selección automática por col H "En nómina" está pendiente (07 #P1). El logo
  original (PNG, fondo negro procesado a transparente) no está en la carpeta local → pedirlo (07 #M1).
- Nombre de archivo vigente: **`[FOLIO].pdf`** (ej. `F-VMM-2026-0012.pdf`, `B-AEGF-2026-0001.pdf`).
  ⚠️ Contradicción: la decisión de mayo era `[Departamento]_[Empleado]_[Fecha]_[Folio]`; el código
  (chat 14) cambió a "SOLO el folio" con aprobación de Valen. Manda el folio.

## 1. Solicitud de Permiso (1 página)

De arriba hacia abajo (coordenadas en pt, origen abajo-izquierda):
1. **Logo** Uniterra arriba-izquierda (solo versión con logo).
2. **Folio** arriba-derecha, chico y gris (Times 8, campo `folio`, x≈457, y≈722).
3. Título **"SOLICITUD DE PERMISO"** centrado, Times-Bold 15.
4. `DEPARTAMENTO:` ______ (campo `departamento` = área en MAYÚSCULAS).
5. `SE LE HA CONCEDIDO PERMISO AL TRABAJADOR:` ______ (`trabajador`).
6. Bloque de horario — 3 opciones con círculo (solo una marcada):
   - ○ `PARA AUSENTARSE DE LA OFICINA EL DÍA:` ____ (`c_ausentar`, `fecha_ausentar`)
     `REGRESANDO EL DIA:` ____ (`fecha_regreso`, vacía si es el mismo día)
   - ○ `ENTRAR A LAS:` ____ `HORAS DEL DIA` ____ (`c_entrar`, `hora_entrar`, `dia_entrar`)
   - ○ `PARA SALIR A LAS:` ____ `HORAS DEL DIA` ____ (`c_salir`, `hora_salir`, `dia_salir`)
7. Barra gris (0.85) con **"CONCEPTO DEL PERMISO"** (Times-Bold 10.5 centrado).
8. 6 opciones con círculo, columna en x=230, separación 19 pt:
   `A CUENTA DE VACACIONES` (`c_vacaciones`) · `COMISIÓN` (`c_comision`) · `HOME OFFICE`
   (`c_homeoffice`) · `REPOSICIÓN DE HORAS` (`c_reposicion`) · `OMISIÓN DE CHECADO` (`c_omision`) ·
   `OTRO` (`c_otro`).
9. Barra gris **"CONCEPTO"**.
10. Campo `concepto` (ancho completo, alto 64): **3 renglones subrayados dibujados a mano**, Times 10.5,
    renglones cada 20 pt; el texto se reparte por palabras (lo que no cabe en 3 renglones se pierde
    — ⚠️ no hay aviso; 07 #P3).
11. **Firma de Laura arriba, centrada**: línea de 260 pt · `LAURA Z. TORRES MUÑOZ` (Times 9.5) ·
    `GERENTE DIVISIÓN ADMINISTRATIVA` (Times-Bold 9.5). Impreso fijo. (Se corrigió el typo
    "GERNTE" del formato físico.)
12. Abajo dos firmas:
    - Izquierda: línea · `trabajador_pie` (nombre, Times 9.5) · `puesto_pie` (puesto, Bold 9.5).
    - Derecha: línea · `jefe_pie` (**quien firma**, col F; respaldo: quien valida) ·
      `puesto_jefe_pie` (su puesto, Bold). En la plantilla v1 esto estaba impreso fijo con Raúl; en
      la v2 (chat 16) son campos.
13. Pie derecho gris Times 8: `Generado: dd/MM/yyyy HH:mm hrs` (campo `generado`).

Total 22 campos AcroForm. Se rellena y se **aplana** (flatten).

### 1.1 Embudo de mapeo (qué se marca)
| Tipo | Círculo de horario | Datos |
|---|---|---|
| Ausencia | c_ausentar | fecha_ausentar = inicio · fecha_regreso = fin solo si ≠ inicio |
| Llegada tarde / temprana / a destiempo | c_entrar | hora_entrar = hora · dia_entrar = fecha |
| Salida anticipada | c_salir | hora_salir · dia_salir |
| Horas extras, Cambio de horario, Omisión, Reposición | ninguno | — |

| Concepto | Regla |
|---|---|
| Omisión de checado (tipo) | c_omision |
| Reposición — "Repuse horas" (tipo) | c_reposicion |
| Horas extras / Cambio de horario (tipo) | c_otro |
| Si no, por justificación (palabra clave sin acentos): `vacacion` → c_vacaciones · `home office` → c_homeoffice · `reposicion` → c_reposicion · `comision`/`reunion`/`visita a obra` → c_comision · resto (Uso de horas acumuladas, Asunto personal, Otro) → c_otro |

Ejemplo aprobado (mayo): Taller de Proyectos · Valentina Morales Mendoza · ● PARA SALIR A LAS 14:30 ·
23/05/2026 · ● COMISIÓN · "Asistencia a comisión foránea para levantamiento de obra en sitio del
proyecto X, en coordinación con el equipo técnico asignado." · Folio F-2026-0142 · Generado 25/05/2026 11:42.

### 1.2 Cuándo y dónde
- Se genera al **aprobar Laura** (o en lote, en segundo plano). Regenerar = reemplaza.
- Hoy: `Drive/[raíz 1BcaPCl9b…]/[Área]/Permisos/[Empleado]/[FOLIO].pdf` + copia en
  `Historial de Solicitudes/`. Nuevo: Storage `solicitudes/[area]/[empleado]/[FOLIO].pdf` (+ versión).
- Firmas: se **imprime, firma a mano y escanea** (decisión 21-oct). Hay que permitir **subir el
  escaneo firmado** y ligarlo al folio (07 #P4).
- Espacios de firma "caso por caso" (ej. Raúl no se firma a sí mismo; un jefe lo firma Pável) →
  quizá otra plantilla con menos líneas (07 #P2).

## 2. Bitácora — Aplicación de horas adicionales (v2, 1 página, 116 campos)

1. Logo (versión con logo) arriba-izquierda.
2. Título **"BITÁCORA — APLICACIÓN DE HORAS ADICIONALES"** Times-Bold 15 centrado (y = 697).
3. `FOLIO:` ____ a la derecha (`folio`, ej. B-AEGF-2026-0001).
4. `EMPLEADO:` ____ ancho completo (`empleado`, alineado a la izquierda).
5. `DEPARTAMENTO:` ____ (hasta x=430) · `AÑO:` ____ (`departamento`, `anio`).
6. `SALDO ANTERIOR:` ____ · `SALDO ACTUAL:` ____ · `ESTADO:` ____ en un renglón
   (`saldo_anterior` = "4 hrs" o **"—"** si no hereda; `saldo_actual` = "16.5 hrs";
   `estado` = `Activa` / `Cerrada`).
7. Barra gris **"MOVIMIENTOS"**.
8. Tabla de **15 filas + encabezado**, filas de 21 pt, bordes grises 0.6, ancho 492 pt:
   | # (22) | FOLIO (44) | FECHA (70) | TIPO (44) | HORAS (40) | PROYECTO / REFERENCIA (140) | SALDO (44) | FIRMA (88) |
   - `#` impreso gris (1–15). Campos `folio_n, fecha_n, tipo_n, horas_n, proyecto_n, saldo_n, firma_n` (n=1..15).
   - FOLIO = **consecutivo corto** de la solicitud (`F-AEGF-2026-0031` → `0031`; `-R1` se ignora;
     `CARGA`/`-` → vacío según el código. ⚠️ El PDF de prueba `Bitacora_PRUEBA_ajuste_de_texto.pdf`
     muestra folios 0031…0045 en movimientos que en el banco son `CARGA`; probablemente se generó con
     datos simulados. No verificado → 07 #P5).
   - FECHA compacta: "del 05/08/2026 al 07/08/2026" → `05/08 a 07/08/26`.
   - TIPO impreso: `Deposito`→**Depósito**, `Retiro`, `Saldo inicial`→**Inicial** (solo al imprimir).
   - HORAS con signo: `+4`, `-2`, `2.25`. SALDO = acumulado corriendo.
   - Proyecto alineado a la izquierda; el resto centrado. Letra base 8.5, mínimo 5.5 (se encoge).
   - Columna FIRMA vacía: el empleado firma cada renglón a mano.
9. Firmas al pie (50 pt bajo la tabla): izquierda empleado (`firma_empleado_pie` 9, `puesto_empleado_pie`
   Bold 8) · derecha **quien firma** (`firma_jefe_pie` 8.5, `puesto_jefe_pie` Bold 8). **No Laura.**
   Respaldo si el organigrama no trae firmante: RAÚL EDILBERTO MARTÍNEZ CARRAZCO / COORDINADOR DE LA
   UNIDAD DE PROYECTOS. ⚠️ Los puestos en negritas son más anchos: medir con Times-Bold.
10. Tamaños base de encabezado: 10.5 (mín. 6).

Ejemplo del PDF de PRUEBA de ajuste de texto (06-ago-2026, datos no necesariamente reales): B-AEGF-2026-0001 · ADRIÁN EVERARDO GÓMEZ FACIO · TALLER DE
PROYECTOS · 2026 · saldo anterior — · saldo actual 16.5 hrs · Cerrada · 15 movimientos (incluye
saldos negativos −1 y −2.5 y una fracción 2.25).

### 2.1 Cuándo y dónde
- Se emite **sola al cerrarse** (15 movimientos) y a demanda la **abierta**; cerradas congeladas.
- Hoy: `Drive/[raíz]/[Área]/Bitacoras/[Empleado]/[FOLIO_B].pdf` + `Historial de Bitacoras/`.
- Se imprime, firman empleado y jefe, se escanea y se guarda (aviso pendiente en el Panel).

## 3. Implementación sugerida en el sistema nuevo
- Opción A: reutilizar las plantillas AcroForm (descargarlas de Drive) + **pdf-lib** (ya probado
  que funciona; mismo código de relleno, `updateFieldAppearances(times)`, flatten).
- Opción B: dibujar desde cero con pdf-lib replicando las coordenadas de los generadores .py.
- Generar en el navegador (rápido, gratis) o en una Edge Function (para lotes/auditoría). Guardar en
  Storage y registrar en `documentos`.
- Verificación obligatoria: render a PNG y comparar contra los PDF aprobados de `02_Plantillas_PDF/`
  (que Valen apruebe visualmente antes de producción).

## 4. Bitácora de generación (idea original de mayo, cubierta por `documentos`)
"Una hoja donde diga que a tal hora de tal día se generó el formato número X en la carpeta del
empleado X." Columnas pensadas: fecha y hora · empleado · tipo de formato · número · ruta · link.
