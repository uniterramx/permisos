# Prompt de arranque para Claude Code

> Copia TODO lo que está dentro del bloque y pégalo como primer mensaje en Claude Code, abierto en
> la carpeta del repo nuevo, con la carpeta `07_Migracion_Claude_Code` copiada adentro
> (o en `docs/migracion/`).

```
Hola. Vamos a construir desde cero la versión nueva del "Sistema de Solicitudes de Permiso" de
Uniterra, que hoy vive en Google Forms + Sheets + Apps Script. NO vamos a programar todavía en este
primer turno.

1) Lee COMPLETOS, en este orden: CLAUDE.md, 01_Especificacion.md, 02_Modelo_de_Datos.md,
   05_Bugs_y_Lecciones.md, 04_Formatos_PDF.md, 06_Datos_a_Migrar.md, 03_Inventario_Scripts.md y
   07_Preguntas_Abiertas.md (están en la carpeta 07_Migracion_Claude_Code). Si algo de CLAUDE.md
   choca con lo que harías normalmente, manda CLAUDE.md.

2) Stack ya decidido: web app instalable (PWA) que funcione perfecto en iPhone (inputs a 16 px o
   más, sin zoom al escribir, sin scroll horizontal) + Supabase (Postgres, Auth, Storage, Edge
   Functions) + GitHub Pages. Salimos por completo de Google (Google solo es la fuente de la
   migración). Acceso: cada quien elige entrar con correo o con PIN. Firmas: se imprime y se firma a
   mano. Avisos: contador en la app + Pushover opcional. Migramos TODO, pendientes incluidos.

3) Cuando termines de leer, respóndeme SOLO esto, en bullets cortos (tengo TDAH):
   - En qué paso vamos.
   - Un resumen de 10 líneas máximo de lo que entendiste del sistema.
   - Las 3 cosas que te parecen más riesgosas.
   - Una propuesta de FASES para construirlo (nombres cortos, qué entra en cada una, qué se puede
     probar al final de cada una). Que la primera fase sea chica y se pueda ver funcionando.
   - Las preguntas de "ANTES DE EMPEZAR" del 07 que necesitas que conteste ya (de máximo 4 en 4,
     con opciones para escoger).

Reglas mientras trabajemos:
- Nunca afirmes cómo está algo sin abrir el archivo o la tabla. Si no lo puedes comprobar, dilo.
- Antes de cualquier pantalla: wireframe o concepto para que yo lo apruebe (soy muy picky con lo
  visual). Antes de cualquier operación masiva: dry-run que solo reporte.
- Cada regla de cálculo del 01 lleva su test con los casos reales del 06 §6.
- Si me das código o comandos para pegar, dame el archivo/bloque COMPLETO, nunca pedazos.
- Dime siempre CÓMO se hace algo aunque lo hagas tú.
- Ícono de la app: esquinas redondeadas, sin fondo transparente, embebido + PNG + ICO
  (y apple-touch-icon). Te pido opciones antes de hacerlo.
- No toques el sistema viejo de Google ni mandes avisos a nadie sin preguntarme.
- Si la conversación se alarga, avísame y hazme un handoff con el texto exacto para el chat nuevo.
```

## Qué decirle después (orden sugerido de fases, para que no se pierda)
1. **Fase 0 — Esqueleto**: repo, Supabase, GitHub Pages, login (correo/PIN), PWA con ícono, una
   pantalla "Hola [nombre]" en iPhone. Se prueba instalando la app en tu inicio.
2. **Fase 1 — Catálogos**: áreas, empleados, jefes, horarios, proyectos (migrados del organigrama, con
   dry-run y lista de diferencias). Pantalla de organigrama para Valen.
3. **Fase 2 — Solicitar**: el formulario nuevo (las 8 opciones) + redacción automática + folios.
4. **Fase 3 — Bandejas**: jefe → Gaby → Laura, estados, pedir cambios, sincronización, corrección -R1,
   panel general, contador de pendientes.
5. **Fase 4 — Banco y reposición**: cálculos con tests, saldos, consulta del empleado.
6. **Fase 5 — PDFs**: solicitud y bitácora idénticos a los aprobados, ciclo de 15, subir escaneo.
7. **Fase 6 — Migración real** + cuadre de saldos y conteos + día del cambio.
8. **Fase 7 — Extras**: Pushover, vacaciones, reportes, auditoría, respaldos, mini-guía.
