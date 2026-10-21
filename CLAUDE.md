# CLAUDE.md — Sistema de Solicitudes de Permiso · Uniterra (migración)

> Léelo completo antes de tocar nada. Expediente armado el 21-oct-2026 (Cowork) con revisión de
> TODO el sistema viejo: memoria, HANDOFF (chats 8–27), conversación original, 63 scripts, PDFs y
> los Google Sheets en vivo. Si algo aquí contradice al código viejo, manda lo más reciente y la
> contradicción está anotada en el archivo correspondiente.

## 1. Qué es

Uniterra (Inmobiliaria Universitaria, ligada a la UdeG, Guadalajara) obliga a llenar un formato
físico **"Solicitud de Permiso"** (formato corporativo UdG) cada vez que alguien varía su horario
(llegar tarde, salir antes, faltar, horas extra, omisión de checado…) y a llevar a mano una
**"Bitácora — Aplicación de horas adicionales"** para las horas extra.

Valen construyó en Google (Forms + 5 Sheets de validación + Banco de Horas + Apps Script + PDFs con
pdf-lib) un sistema que ya funciona punta a punta desde julio 2026:
**Form → bandeja del jefe del área → Gaby (filtro) → Laura (aprobación final) → PDF oficial + banco
de horas + bitácora**. Ahora se migra TODO a una **web app propia**.

## 2. Decisiones de stack (cerradas con Valen el 21-oct-2026)

| Tema | Decisión |
|---|---|
| Tipo | **Web app instalable (PWA)**: compu + iPhone, se agrega a la pantalla de inicio |
| Google | **Salir por completo**. Google solo se usa como FUENTE de la migración |
| Backend | **Supabase** (Postgres + Auth + Storage + Edge Functions) |
| Hosting | **GitHub Pages** (Valen ya lo usa en sus otras apps; no conoce Cloudflare) |
| Acceso | **PIN o correo, cada quien elige** (correo = link mágico/OTP de Supabase; PIN = nombre + PIN). Ver 07_Preguntas_Abiertas #A1 sobre seguridad del PIN |
| Firmas | **Imprimir y firmar a mano** (como hoy). El sistema genera el PDF; no hay firma digital |
| Avisos | **Contador de pendientes dentro de la app** + **Pushover opcional** para quien lo instale (cada quien guarda su user key en su perfil) |
| Arranque | **Solo se migra lo BASE** (catálogos: áreas, empleados, jefes, horarios, proyectos). Las solicitudes, decisiones y PDFs viejos **NO** se migran (decisión 21-oct, cambia la anterior de "migrar todo"). El sistema viejo está sin uso desde ago-2026; la app nueva arranca limpia para presentársela a Laura |
| Repo | `vmmterminus-star/uniterra-permisos`, **público** (requisito de GitHub Pages gratis; los datos viven en Supabase) |

## 3. Quién es Valen y cómo trabajar con ella (OBLIGATORIO)

- Valentina Morales Mendoza, dibujante del Taller de Proyectos de Uniterra y estudiante de
  arquitectura. **No es desarrolladora**, pero piensa muy bien en lógica de sistemas y flujos.
  Su papá (Pável Morales Rivas) es el director: eso le da respaldo político al proyecto.
- **Tiene TDAH.** Cada respuesta: primero **en qué paso vamos**, luego bullets cortos, al grano.
  No apiles contexto sobre algo que ya funciona. Cuando algo quede, cierra con **QUÉ HACER en una
  frase**. Guarda las observaciones extra para después. ("me super hiciste bolas" = demasiado junto.)
- **Diseño antes de construir**: wireframe/concepto aprobado ANTES de generar pantallas o archivos
  pesados. Es *muy* picky con lo visual; pregunta formato visual antes de hacer.
- Decide punto por punto; recuérdale pendientes; dile siempre **cómo** se hace algo aunque tú lo hagas.
- Pregúntale al empezar algo largo si necesita ahorrar tokens. Agrupa cambios en un turno, edita
  puntual, verifica una vez al final.
- Cuando entregues código para pegar: **archivo completo**, nunca fragmentos. Si el chat se alarga,
  propón handoff con el texto exacto para el chat nuevo.
- Español mexicano natural, informal, con humor. Nada de español de España.
- Cuando te equivoques: una línea de qué falló y por qué, arreglar, seguir. Sin disculpas largas.

## 4. Reglas de oro (aprendidas a la mala — ver 05_Bugs_y_Lecciones)

1. **Nunca afirmes cómo está algo sin abrir el archivo/la tabla.** Nada de "seguramente es X".
   Si no se puede comprobar, dilo.
2. **Simula su caso exacto antes de entregar** (datos reales del 06_Datos_a_Migrar). Tests de
   cálculo automatizados para cada regla del 01_Especificacion.
3. **Al arreglar A, comprueba que no rompiste B.**
4. **Diagnóstico de solo lectura** antes de cualquier operación masiva (dry-run que reporta qué haría).
5. **Nada de comparar textos largos por igualdad exacta.** Usa enums/IDs en la base; normaliza
   (sin acentos, minúsculas, trim) donde entre texto humano. El sistema viejo tuvo 3 bugs así.
6. **La identidad es un ID, no un nombre.** El viejo identificaba gente por nombre exacto y un
   typo ("Carrilo") o un espacio final ("Dirección ") rompía el ruteo.
7. **Toda escritura que involucre varias tablas va en una transacción** (o una función de Postgres).
   El viejo perdía solicitudes completas en silencio (bug del FILTRO) y dejaba filas vacías por
   choques de concurrencia.
8. **Append-only para lo auditable**: movimientos de banco, decisiones, registro de cambios. Nunca
   se borra; se corrige con un movimiento de ajuste.
9. **Lo que ya se imprimió y firmó queda congelado** (PDF aprobado por Laura, bitácora cerrada).
10. **iPhone**: todo `input/select/textarea` con `font-size >= 16px` (evita el zoom al escribir),
    `viewport` con `width=device-width, initial-scale=1`, nada de scroll horizontal, áreas táctiles
    >= 44px. Probar en 390 px de ancho.
11. **Ícono de la app**: cuadrado con **esquinas redondeadas**, **sin fondo transparente**, en tres
    formas: embebido en el HTML (favicon), **PNG** (incluye `apple-touch-icon` 180×180) e **ICO**.
    Más manifest de PWA (192 y 512). Diseño a aprobar por Valen antes.
12. **Tipografía Alexandria** (Google Fonts). En tablas densas tamaño 7–8 (como sus Sheets), pero
    los campos de captura siempre ≥16px (regla 10).
13. Los textos de la UI (etiquetas, opciones) son libres de cambiar en el sistema nuevo porque las
    llaves serán enums. **Pero los textos que se IMPRIMEN en el PDF y las redacciones** salen
    exactas del 01_Especificacion §6 y 04_Formatos_PDF.

## 4-bis. Preferencias visuales ya aprobadas (punto de partida; la UI nueva se aprueba con wireframe)

- **Formato de los Sheets de validación (aprobado jun-2026, reusar el espíritu en las tablas)**:
  Alexandria 8 · filas al doble de alto (~42 px) · filtros en todas las columnas · bordes
  `#ECE4DF` · filas alternadas desde la 2ª (`#FFFFFF` / `#F3F1EC`; luego `#faf9f7`) · encabezados
  de info en gris `#D9D7CE`, de acción en verde `#C6E7D0`, negritas, fila congelada · **semáforo SOLO
  en la columna Decisión**, no en toda la fila. Columnas "gris" = automáticas/solo lectura.
- **Paleta cálida** del banco/tableros: título `#5a4d3e`, fondos `#f8f6f3` / `#efeae3`, borde
  `#e2ddd6`, subtítulo `#9a8e7f`, ceros en gris `#c4bdb1`, números distintos de cero en negro.
- **Panel/Centro de Links**: fondo `#FBFAF7`, tarjetas blancas, verde `#C6E7D0`/`#38761D`, radio 10 px,
  emojis como íconos de tarjeta, leyenda de frecuencia (diario/ocasional/esporádico), sello de versión.
  Valen **no quiere barras horizontales apiladas**: columnas lado a lado + mosaico con subtítulo.
- Colores de **estado**, **áreas** y **reposición**: 01_Especificacion §4.2, §4.9 y §5.5.
- Organigrama: encabezado `#4bacc6`, Alexandria 8 bold blanco.
- Tableros con tarjetas grandes (Total / Aprobadas / Pendientes / Pedir cambios / Rechazadas) y
  resumen por persona con barra de estado: a Valen y a Laura les gustan.

## 5. Mapa del expediente

> Los archivos 01–07 y el PROMPT viven en `docs/migracion/`.

| Archivo | Para qué |
|---|---|
| `01_Especificacion.md` | Personas, ruteo, cada flujo de punta a punta, reglas y cálculos con ejemplos, redacciones |
| `02_Modelo_de_Datos.md` | Entidades, campos, tipos, estados, folios, propuesta de tablas Supabase |
| `03_Inventario_Scripts.md` | Cada script viejo: qué hace, vigente/obsoleto, qué lo reemplaza |
| `04_Formatos_PDF.md` | Diseño exacto de los 2 PDF, campos, nombres de archivo, dónde se guardan |
| `05_Bugs_y_Lecciones.md` | Lo que ya falló y cómo no repetirlo (incluye bugs vivos encontrados hoy) |
| `06_Datos_a_Migrar.md` | Fuentes con IDs, conteos medidos, problemas de calidad, orden de migración |
| `07_Preguntas_Abiertas.md` | Lo que Valen todavía tiene que decidir |
| `PROMPT_CLAUDE_CODE.md` | El mensaje de arranque |

## 6. Dónde vive el sistema viejo (solo lectura para la migración)

- Cuenta dueña: **valentina.uniterra@gmail.com** (cuenta de trabajo de Valen, no institucional).
- Código: carpeta local `Formatos Uniterra/06_Codigo_AppsScript/` (la de la RAÍZ es la vigente;
  `Sistema_Solicitudes_Permiso/06_Codigo_AppsScript/` es la vieja). Todos los IDs en 06_Datos_a_Migrar.
- El sistema viejo **sigue vivo** durante la construcción: no lo apagues ni escribas en él sin
  pedírselo a Valen. El corte (día del cambio) se planea con ella.

## 7. Lo que NO se hace

- No inventar reglas de negocio: si algo no está en el 01, se pregunta.
- No mandar correos ni notificaciones a nadie durante pruebas (usar datos de prueba marcados).
- No usar emojis dentro de código que se copie y pegue (rompía el pegado en Apps Script; en el
  sistema nuevo es menos crítico, pero sé conservador en strings).
- No borrar datos de producción. "Borrar folio de prueba" existe solo para folios marcados como prueba.
