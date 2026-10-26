# Pendientes de Valen · para el 23-oct-2026 (en la compu)

> Lista viva: Claude agrega aquí lo que toca hacer en la compu. Tachar al terminar.

## 1. Supabase (5 min)
- [x] Correr `sql/005_guardar_horario.sql` en **SQL Editor → New query → pegar completo → Run**.
- [x] Mandarle a Claude **captura de la tabla que sale al final** (últimos 15 cambios): sirve para saber si
      el horario de anoche llegó a guardarse.
- [x] Correr `sql/006_fase2_solicitudes.sql` (solicitudes, folios y ruteo). Debe decir "Success".

## 2. Probar en la app (recargar con Ctrl+Shift+R; abajo debe decir v0.3.0 o más)
- [x] Cambiar un horario y guardar → debe decir "Cambios guardados" y quedarse el cambio.
      Si sale aviso rojo, captura y a Claude.
- [ ] Personas: revisar avisos (3 nombres, 10 horarios, 2 sin horario). En Edgar "Estevez": si así es su
      nombre oficial, "Está bien así".
- [ ] Editar un proyecto y un área.
- [ ] (si no se hizo en el celular) PIN temporal a alguien de prueba → salir → entrar como esa persona →
      debe pedir PIN nuevo.

## 3. Con Claude
- [x] Selectores de hora en el horario (hecho 22-oct, v0.2.2): cada 30 min, 8:00–20:00, "Otro horario"
      abre 0:00–23:30 (turnos de noche). Probarlo en la compu después del SQL 005.
- [x] **Probar la Fase 2** (23-oct: PRUEBA-132420-40f llegó bien, cálculo y texto correctos; faltan más tipos) (Nueva solicitud): hacer 3–4 solicitudes de PRUEBA de distintos tipos (llegada tarde
      con uso de horas, falta de varios días, horas extras, olvidé checar). Revisar que el resumen y el texto del
      formato digan lo correcto. Ver que salgan en "Mis solicitudes". Probar "Para otra persona".
- [x] Fase 3 · Bandejas: wireframe aprobado y construida (v0.4.0).

## 4. Fase 3 (v0.4.0) · en la compu
- [ ] Correr `sql/007_fase3_bandejas.sql` (SQL Editor → New query → pegar completo → Run). Al final sale 1 renglón con "si", "si", "true".
- [ ] Recargar la app con Ctrl+Shift+R → abajo debe decir **v0.4.0 · Fase 3**.
- [ ] Hacer una **Nueva solicitud de PRUEBA** → Mi bandeja → aprobarla como jefe → pestaña Gaby → editar la redacción y aprobar → pestaña Laura → aprobar (queda congelada).
- [ ] Otra PRUEBA: pedir cambios con comentario → corregirla desde "Corregir una solicitud" (sale -R1 directo con Gaby; la original queda "Corregida").
- [ ] Probar "Aprobar en lote" con 2 pruebas pendientes. Revisar el Panel general.
- Nota: en las solicitudes reales no te salen botones (solo decides pruebas, decisión G4).

## Resultado 22-oct (tarde)
- Diagnóstico SQL 005: el horario de la noche anterior nunca llegó a la base (la pantalla vieja lo perdía). Con v0.3.0 ya se guarda.
- SQL 005 y 006 corridos. Primera solicitud de prueba creada y leída de vuelta en "Mis solicitudes".

## 5. Fase 4 (v0.5.0) · banco de horas
- [ ] Correr `sql/008_fase4_banco.sql` (SQL Editor → New query → pegar completo → Run). Al final: "si", "si", "si".
- [ ] Recargar con Ctrl+Shift+R → abajo **v0.5.0 · Fase 4**.
- [ ] PRUEBA de horas extras → aprobarla como jefe → revisar "Mi banco de horas" de esa persona (Banco de horas → tocar su nombre).
- [ ] PRUEBA de llegada tarde con uso de horas → "Cambiar horas" antes de aprobar → aprobar → ver el retiro.
- [ ] Cambiar la decisión de una aprobada → debe salir el reverso. Corregir una aprobada (-R1) y aprobarla como Gaby → reverso + movimiento nuevo.
- [ ] Correr también `sql/009_rechazo_regresa_horas.sql` (después del 008). Al final: "si", "si". App v0.5.1.
- [ ] PRUEBA aprobada por jefe y Gaby → Laura la rechaza con comentario → debe salir el reverso y un aviso en tu Inicio.
- [ ] Al terminar: Inicio → Administración → 🧪 Pruebas → Borrar todas las pruebas.

## 6. Fase 5 (v0.6.0) · PDFs y bitácoras
- [x] Correr `sql/010_fase5_pdfs_bitacoras.sql` (SQL Editor → New query → pegar completo → Run). Al final: "si", "si", "si".
- [x] Recargar con Ctrl+Shift+R → abajo **v0.6.0 · Fase 5**.
- [x] PRUEBA aprobada por jefe, Gaby y Laura → al aprobar Laura sale "PDF guardado" → abrirla y "📄 Descargar PDF".
- [x] Banco de horas → una persona → bloque "Bitácora": PDF de la activa; "Cerrar ahora" (la tuya queda de prueba) → PDF de la cerrada.
- [x] Inicio → 📁 PDF guardados (espacio usado). Al terminar: 🧪 Pruebas → Borrar (también borra bitácoras y PDF de prueba).

## 7. v0.7.2 · PIN temporal visible
- [x] Correr `sql/011_pin_temporal_visible.sql` (SQL Editor → New query → pegar completo → Run). Al final: "si", "si".
- [x] Personas y PINs → Gabriela → Acceso → "Dar PIN temporal" → debe quedarse mostrando ese número.

## 8. Vacaciones · respuestas de Gaby
- [x] Preguntarle qué días cuentan (horario / L–V / naturales, festivos) y si lo no tomado se acumula o se pierde.
- [ ] Preguntarle qué son los negativos de jul-2026 en su Excel (Max −18, Wario −17, Laura −1, Teo −1).
- [ ] Pasarle a Claude lo que conteste.

## 9. v0.8.0 · Vacaciones (en la compu)
- [ ] Correr `sql/012_vacaciones.sql` (SQL Editor → New query → pegar completo → Run). Al final: "si", "si", "si", "true".
- [ ] Recargar con Ctrl+Shift+R → abajo **v0.8.0 · Vacaciones**.
- [ ] Personas → tu ficha → "Fecha de ingreso" (16/02/2026) → Guardar. (A los demás se las captura Gaby con su Excel.)
- [ ] Inicio → 🌴 Vacaciones → pedir unas de PRUEBA → aprobarlas en Vacaciones por aprobar → hacer el formato de "Falté" (A cuenta de vacaciones) de PRUEBA → aprobarlo hasta Laura → ver el descuento en Mis vacaciones.
- [ ] Administración → 📅 Festivos: cargar la lista de festivos (cuando la tengas).
- [ ] Al terminar: 🧪 Pruebas → Borrar (también borra vacaciones de prueba).
- [ ] Pendiente de Gaby: Excel de vacaciones cuadrado con el registro de Andrés → se captura como "Saldo de arranque" de cada quien (Vacaciones de todos → persona → Saldo de arranque).
