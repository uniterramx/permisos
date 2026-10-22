# Pendientes de Valen · para el 23-oct-2026 (en la compu)

> Lista viva: Claude agrega aquí lo que toca hacer en la compu. Tachar al terminar.

## 1. Supabase (5 min)
- [ ] Correr `sql/005_guardar_horario.sql` en **SQL Editor → New query → pegar completo → Run**.
- [ ] Mandarle a Claude **captura de la tabla que sale al final** (últimos 15 cambios): sirve para saber si
      el horario de anoche llegó a guardarse.
- [ ] Correr `sql/006_fase2_solicitudes.sql` (solicitudes, folios y ruteo). Debe decir "Success".

## 2. Probar en la app (recargar con Ctrl+Shift+R; abajo debe decir v0.3.0 o más)
- [ ] Cambiar un horario y guardar → debe decir "Cambios guardados" y quedarse el cambio.
      Si sale aviso rojo, captura y a Claude.
- [ ] Personas: revisar avisos (3 nombres, 10 horarios, 2 sin horario). En Edgar "Estevez": si así es su
      nombre oficial, "Está bien así".
- [ ] Editar un proyecto y un área.
- [ ] (si no se hizo en el celular) PIN temporal a alguien de prueba → salir → entrar como esa persona →
      debe pedir PIN nuevo.

## 3. Con Claude
- [x] Selectores de hora en el horario (hecho 22-oct, v0.2.2): cada 30 min, 8:00–20:00, "Otro horario"
      abre 0:00–23:30 (turnos de noche). Probarlo en la compu después del SQL 005.
- [ ] **Probar la Fase 2** (Nueva solicitud): hacer 3–4 solicitudes de PRUEBA de distintos tipos (llegada tarde
      con uso de horas, falta de varios días, horas extras, olvidé checar). Revisar que el resumen y el texto del
      formato digan lo correcto. Ver que salgan en "Mis solicitudes". Probar "Para otra persona".
- [ ] Siguiente: **Fase 3 · Bandejas** (jefe → Gaby → Laura, pedir cambios, corrección -R1, panel). Wireframe primero.
