// Tests de calculos con los casos reales del 06_Datos_a_Migrar §6 (ajustados al redondeo de 15 min).
// Correr: node tests/calculos.test.js
const C = require('../js/calculos.js');
const assert = require('assert');
let ok = 0, mal = 0;
function t(nombre, fn) { try { fn(); ok++; } catch (e) { mal++; console.log('FALLA:', nombre, '\n   ', e.message); } }

const TC = { jornada: 'TC' }, MT = { jornada: 'MT' };
const dias = (txt) => txt.map((v, i) => v === '-' ? { dia: i + 1, entrada: null, salida: null } : { dia: i + 1, entrada: v.split('-')[0] + ':00', salida: v.split('-')[1] + ':00' });
const H = (txt, desde = '2026-01-01') => [{ vigente_desde: desde, horario_dias: dias(txt) }];
const VMM = H(['09:00-14:00', '09:00-14:00', '09:00-14:00', '09:00-14:00', '09:00-14:00']);
const JFCE = H(['09:00-14:00', '09:00-14:00', '09:00-14:00', '09:00-14:00', '-']);
const KYGS = H(['19:30-07:30', '19:30-07:30', '19:30-07:30', '19:30-07:30', '19:30-07:30']);
const MIE = '2026-10-21', VIE = '2026-10-23', SAB = '2026-10-24';

// ---- Redondeo ----
t('redondeo 15 min', () => {
  assert.strictEqual(C.redondear15(90), 90); assert.strictEqual(C.redondear15(100), 105); assert.strictEqual(C.redondear15(97), 90);
  assert.strictEqual(C.redondear15(5), 0); assert.strictEqual(C.redondear15(10), 15);
});

// ---- Depositos (horas extras) ----
const dep = (emp, h, iso, a, b) => C.calcularDeposito(emp, h, iso, a, b).horas;
t('JAMV-0004 08:00-09:00 TC -> 1 h', () => assert.strictEqual(dep(TC, [], MIE, '08:00', '09:00'), 1));
t('OPC-0001 08:30-09:00 -> 0.5 h (antes 1)', () => assert.strictEqual(dep(TC, [], MIE, '08:30', '09:00'), 0.5));
t('JAMV-0002 07:30-09:00 -> 1.5 h (antes 2)', () => assert.strictEqual(dep(TC, [], MIE, '07:30', '09:00'), 1.5));
t('AEGF-0001 MT 14:00-18:00 (oficial 9-14) -> 4 h', () => assert.strictEqual(dep(MT, VMM, MIE, '14:00', '18:00'), 4));
t('jornada completa 07:00-20:00 TC -> 4 h', () => assert.strictEqual(dep(TC, [], MIE, '07:00', '20:00'), 4));
t('18:00-20:00 TC -> 2 h', () => assert.strictEqual(dep(TC, [], MIE, '18:00', '20:00'), 2));
t('Diego 20:30-00:00 cruza medianoche -> 3.5 h', () => assert.strictEqual(dep(TC, [], MIE, '20:30', '00:00'), 3.5));
t('sabado no descuenta jornada', () => assert.strictEqual(dep(TC, [], SAB, '09:00', '14:00'), 5));
t('18:00-18:30 -> 0.5 h (antes 1)', () => assert.strictEqual(dep(TC, [], MIE, '18:00', '18:30'), 0.5));
t('texto calculo con descuento', () => assert.strictEqual(C.calcularDeposito(TC, [], MIE, '07:00', '20:00').calculo, '20:00 - 07:00 = 13 h; menos su jornada 9:00-18:00 (9 h) = 4 h'));

// ---- Retiros ----
const ret = (emp, h, tipo, iso, fin, hora) => C.calcularRetiro(emp, h, tipo, iso, fin, hora).horas;
t('LAMC-0003 llegada 11:45 TC -> -2.75 h (antes -3)', () => assert.strictEqual(ret(TC, [], 'llegada_tarde', MIE, null, '11:45'), -2.75));
t('DMPB-0002 llegada 13:00 -> -4 h', () => assert.strictEqual(ret(TC, [], 'llegada_tarde', MIE, null, '13:00'), -4));
t('JMCM-0012 salida 15:00 TC -> -3 h', () => assert.strictEqual(ret(TC, [], 'salida_anticipada', MIE, null, '15:00'), -3));
t('LAMC-0002 ausencia vie 17 a dom 19 jul TC -> -8 h', () => assert.strictEqual(ret(TC, [], 'ausencia', '2026-07-17', '2026-07-19'), -8));
t('VMM-0004 ausencia 1 dia MT 9-14 -> -5 h', () => assert.strictEqual(ret(MT, VMM, 'ausencia', MIE, MIE), -5));
t('ausencia mie a vie TC (ultimo dia que falta = vie) -> -24 h', () => assert.strictEqual(ret(TC, [], 'ausencia', MIE, VIE), -24));
t('Josue viernes "-" no labora -> 0', () => assert.strictEqual(ret(MT, JFCE, 'ausencia', VIE, VIE), 0));
t('Karla turno de noche 19:30-7:30 -> -12 h', () => assert.strictEqual(ret(MT, KYGS, 'ausencia', MIE, MIE), -12));
t('MT sin horario usa respaldo 9-14', () => assert.strictEqual(C.horarioDelDia(MT, [], MIE).respaldo, true));
t('horario a futuro no aplica antes de su fecha', () => {
  const hs = [...VMM, ...H(['10:00-15:00', '10:00-15:00', '10:00-15:00', '10:00-15:00', '10:00-15:00'], '2027-01-15')];
  assert.strictEqual(C.horarioDelDia(MT, hs, MIE).entrada, '09:00');
  assert.strictEqual(C.horarioDelDia(MT, hs, '2027-01-20').entrada, '10:00');
});

// ---- Clasificacion y que mueve ----
t('llegada 8:50 -> temprana (no cuesta)', () => {
  const r = C.calcular(TC, [], { tipo: 'llegada', justificacion: 'uso_horas', fecha_inicio: MIE, hora_ref: '08:50' });
  assert.strictEqual(r.tipo, 'llegada_temprana'); assert.strictEqual(r.horas, 0);
});
t('llegada en sabado -> a destiempo', () => assert.strictEqual(C.calcular(TC, [], { tipo: 'llegada', justificacion: 'otro', fecha_inicio: SAB, hora_ref: '10:00' }).tipo, 'llegada_destiempo'));
t('queMueve en orden §5.1', () => {
  assert.strictEqual(C.queMueve('ausencia', 'reposicion_horas'), 'deuda');
  assert.strictEqual(C.queMueve('reposicion', null), 'reposicion');
  assert.strictEqual(C.queMueve('llegada_tarde', 'uso_horas'), 'retiro');
  assert.strictEqual(C.queMueve('horas_extras', null), 'deposito');
  assert.strictEqual(C.queMueve('cambio_horario', null), 'no');
  assert.strictEqual(C.queMueve('salida_anticipada', 'home_office'), 'no');
});
t('VMM-0010 ausencia con reposicion de horas -> deuda -5', () => {
  const r = C.calcular(MT, VMM, { tipo: 'ausencia', justificacion: 'reposicion_horas', fecha_inicio: MIE, fecha_fin: MIE });
  assert.strictEqual(r.mueve, 'deuda'); assert.strictEqual(r.horas, -5);
});
t('VMM-0011 repuso 14:00-18:00 (MT 9-14) -> +4', () => {
  const r = C.calcular(MT, VMM, { tipo: 'reposicion', fecha_inicio: MIE, hora_ref: '14:00', hora_fin: '18:00' });
  assert.strictEqual(r.mueve, 'reposicion'); assert.strictEqual(r.horas, 4);
});
t('VMM-0003 cambio de horario 10:00-15:00 (MT 9-14) -> CUMPLE', () => {
  const v = C.verificarCambio(MT, VMM, MIE, '10:00', '15:00');
  assert.strictEqual(v.cumple, true);
  assert.strictEqual(v.texto, '[Verificación: CUMPLE su jornada — programado 5 h (9:00–14:00), trabajó 5 h.]');
});
t('cambio de horario que queda a deber', () => {
  const v = C.verificarCambio(TC, [], MIE, '10:00', '18:00');
  assert.strictEqual(v.texto, '[Verificación: QUEDÓ A DEBER 1 h — programado 9 h (9:00–18:00), trabajó 8 h.]');
});

// ---- Redacciones exactas (§6) ----
const red = (emp, h, s) => C.calcular(emp, h, s).redaccion;
t('horas extras (ejemplo real)', () => assert.strictEqual(red(TC, [], { tipo: 'horas_extras', fecha_inicio: MIE, hora_ref: '18:00', hora_fin: '19:00', proyecto: 'Edificio Lagos de Moreno' }),
  'Trabajo fuera de horario oficial en proyecto Edificio Lagos de Moreno. Mi horario oficial es de 9:00 a 18:00 h; este día trabajé de 18:00 a 19:00 h. Generé 1 h de tiempo adicional.'));
t('llegada con uso de horas', () => assert.strictEqual(red(MT, VMM, { tipo: 'llegada', justificacion: 'uso_horas', fecha_inicio: MIE, hora_ref: '10:30', etiqueta_banco: 'Cita médica' }),
  'Variación de horario con cargo al banco de horas acumuladas. Mi horario oficial es de 9:00 a 14:00 h; este día entré a las 10:30 h. Apliqué 1.5 h de mi tiempo acumulado.'));
t('salida con uso de horas', () => assert.strictEqual(red(TC, [], { tipo: 'salida_anticipada', justificacion: 'uso_horas', fecha_inicio: MIE, hora_ref: '15:00' }),
  'Variación de horario con cargo al banco de horas acumuladas. Mi horario oficial es de 9:00 a 18:00 h; este día salí a las 15:00 h. Apliqué 3 h de mi tiempo acumulado.'));
t('ausencia con uso de horas', () => assert.strictEqual(red(MT, VMM, { tipo: 'ausencia', justificacion: 'uso_horas', fecha_inicio: MIE, fecha_fin: MIE }),
  'Variación de horario con cargo al banco de horas acumuladas. Mi horario oficial es de 9:00 a 14:00 h. Apliqué 5 h de mi tiempo acumulado.'));
t('reposicion (repuse)', () => assert.strictEqual(red(MT, VMM, { tipo: 'reposicion', fecha_inicio: MIE, hora_ref: '14:00', hora_fin: '18:00' }),
  'Reposición de horas trabajadas el día 21/10/2026, de 14:00 a 18:00.'));
t('omision ambas + notas', () => assert.strictEqual(red(TC, [], { tipo: 'omision_checado', fecha_inicio: MIE, que_checar: 'ambas', notas: 'Se fue la luz del checador' }),
  'Omisión de checado de entrada y salida. Se fue la luz del checador.'));
t('cambio de horario con motivo', () => assert.strictEqual(red(TC, [], { tipo: 'cambio_horario', fecha_inicio: MIE, hora_ref: '10:00', hora_fin: '19:00', motivo_cambio: 'Entrega de proyecto' }),
  'Variación de horario: jornada recorrida de 10:00 a 19:00. Entrega de proyecto.'));
t('comision con y sin referencia', () => {
  assert.strictEqual(red(TC, [], { tipo: 'salida_anticipada', justificacion: 'comision', fecha_inicio: MIE, hora_ref: '15:00', comision_ref: 'Casa FIL' }), 'Atención a comisión / reunión externa — Casa FIL.');
  assert.strictEqual(red(TC, [], { tipo: 'salida_anticipada', justificacion: 'comision', fecha_inicio: MIE, hora_ref: '15:00' }), 'Atención a comisión / reunión externa.');
});
t('home office / vacaciones / reposicion de horas', () => {
  assert.strictEqual(red(TC, [], { tipo: 'ausencia', justificacion: 'home_office', fecha_inicio: MIE, fecha_fin: MIE }), 'Trabajo en modalidad home office autorizado por mi jefe directo.');
  assert.strictEqual(red(TC, [], { tipo: 'ausencia', justificacion: 'vacaciones', fecha_inicio: MIE, fecha_fin: MIE }), 'Ausencia a cuenta de días de vacaciones.');
  assert.strictEqual(red(TC, [], { tipo: 'ausencia', justificacion: 'reposicion_horas', fecha_inicio: MIE, fecha_fin: MIE }), 'Variación de horario con compromiso de reposición de las horas correspondientes.');
});
t('asunto personal: texto tal cual + notas sin doble punto', () => assert.strictEqual(
  red(TC, [], { tipo: 'llegada', justificacion: 'asunto_personal', fecha_inicio: MIE, hora_ref: '10:00', texto_oficial: 'Atención de un trámite personal.', notas: 'Avisé a mi jefe' }),
  'Atención de un trámite personal. Avisé a mi jefe.'));
t('etiqueta del banco y razon real NUNCA en la redaccion', () => {
  const r = red(TC, [], { tipo: 'llegada', justificacion: 'uso_horas', fecha_inicio: MIE, hora_ref: '10:00', etiqueta_banco: 'Cita médica', razon_real: 'SECRETO' });
  assert.ok(!r.includes('SECRETO') && !r.includes('Cita médica'));
});

console.log(ok + ' pruebas bien, ' + mal + ' fallaron');
process.exit(mal ? 1 : 0);
