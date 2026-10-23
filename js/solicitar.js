// Permisos UT · solicitar.js
// Fase 2: "Nueva solicitud" paso a paso (como Google Forms) y "Mis solicitudes".
// Usa lo global de index.html (sb, D, yo, $, esc, toast, recordar, ...) y Calc (js/calculos.js).

/* ================= Catalogos de la solicitud ================= */
const TIPOS_FORM = [
  ['llegada', '⏰', 'Llegué / llegaré tarde'],
  ['salida_anticipada', '🚪', 'Salí / saldré antes'],
  ['ausencia', '📅', 'Falté uno o varios días'],
  ['horas_extras', '➕', 'Generé horas extras'],
  ['cambio_horario', '🔁', 'Cambié mi horario'],
  ['omision_checado', '☝️', 'Olvidé checar'],
  ['reposicion', '↩️', 'Repuse horas que debía'],
  ['correccion', '✏️', 'Corregir una solicitud']
];
const TIPO_TXT = { llegada: 'Llegada', llegada_tarde: 'Llegada tarde', llegada_temprana: 'Llegada temprana', llegada_destiempo: 'Llegada a destiempo',
  salida_anticipada: 'Salida anticipada', ausencia: 'Ausencia', horas_extras: 'Horas extras', cambio_horario: 'Cambio de horario',
  omision_checado: 'Omisión de checado', reposicion: 'Reposición', correccion: 'Corrección' };
const JUSTS = [
  ['comision', 'Comisión / reunión externa / visita a obra'], ['home_office', 'Home office'], ['vacaciones', 'A cuenta de vacaciones'],
  ['uso_horas', 'Uso de horas acumuladas'], ['reposicion_horas', 'Reposición de horas'], ['asunto_personal', 'Asunto personal'], ['otro', 'Otro']
];
const JUST_TXT = Object.fromEntries(JUSTS);
const CHECAR = [['entrada', 'Entrada'], ['salida', 'Salida'], ['ambas', 'Entrada y salida']];
const ESTADOS = {
  nueva_espera_jefe: ['Nueva · espera jefe', '#fef6e4', '#a0872e'], espera_gaby: ['Espera Gaby', '#fef6e4', '#a0872e'],
  espera_laura: ['Espera Laura', '#fef6e4', '#a0872e'], cambios_solicitados: ['Cambios solicitados', '#fef0e6', '#b06630'],
  aprobada: ['Aprobada', '#eaf5e8', '#4a8c42'], rechazada: ['Rechazada', '#fce8e8', '#b04040'],
  resuelta: ['Resuelta', '#e3eef7', '#37699e'], corregida: ['Corregida', '#f0eaf7', '#7a5aa0']
};
const puedeCapturar = () => (yo?.roles || []).some(r => r === 'admin' || r === 'altas');

/* ================= Estado del formulario ================= */
let W = null, paso = 0;
function nuevoW(){
  return { para: yo.id, otra: false, tipo: null, fecha_inicio: hoyISO(), fecha_fin: null, hora_ref: null, hora_fin: null,
    justificacion: null, proyecto_id: '', comision_sel: '', comision_otro: '', que_checar: null, texto_oficial: '',
    etiqueta_banco: '', notas: '', razon_real: '', motivo_cambio: '', confirmo: false,
    es_prueba: soyAdmin() };
}
const empW = () => empPorId(W.para) || { jornada: yo.jornada, nombre_oficial: yo.nombre };
const horariosW = () => D.horarios.filter(h => h.empleado_id === W.para);
const ofDia = iso => Calc.horarioDelDia(empW(), horariosW(), iso || W.fecha_inicio);
const conJust = t => ['llegada', 'salida_anticipada', 'ausencia'].includes(t);

// Pasos segun el tipo (una pregunta por pagina)
function pasos(){
  const p = [];
  if (puedeCapturar()) p.push('para');
  p.push('tipo');
  switch (W.tipo){
    case 'llegada': case 'salida_anticipada': p.push('fecha', 'hora', 'just', 'detalles'); break;
    case 'ausencia': p.push('fecha', 'ultimo', 'just', 'detalles'); break;
    case 'horas_extras': p.push('fecha', 'rango', 'proyecto', 'detalles'); break;
    case 'cambio_horario': p.push('fecha', 'rango', 'motivo', 'detalles'); break;
    case 'omision_checado': p.push('fecha', 'checar', 'detalles'); break;
    case 'reposicion': p.push('fecha', 'rango', 'detalles'); break;
  }
  if (W.tipo) p.push('revisar');
  return p;
}

// Calculo vivo
function calcW(){
  if (!W.tipo || !W.fecha_inicio) return null;
  if (['llegada', 'salida_anticipada'].includes(W.tipo) && !W.hora_ref) return null;
  if (['horas_extras', 'cambio_horario', 'reposicion'].includes(W.tipo) && (!W.hora_ref || !W.hora_fin)) return null;
  const proy = D.proyectos.find(p => p.id === W.proyecto_id);
  const comProy = D.proyectos.find(p => p.id === W.comision_sel);
  const s = { ...W, fecha_fin: W.tipo === 'ausencia' ? (W.fecha_fin || W.fecha_inicio) : W.fecha_inicio,
    proyecto: proy?.nombre_corto, comision_ref: W.comision_sel === 'otro' ? W.comision_otro.trim() : comProy?.nombre_corto || '' };
  return { s, r: Calc.calcular(empW(), horariosW(), s) };
}

/* ================= Opciones de hora (cada 5 min) ================= */
function opcHoras(sel){
  let h = '';
  for (let m = 0; m < 24 * 60; m += 5){
    const v = String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    h += '<option value="' + v + '"' + (v === sel ? ' selected' : '') + '>' + hhmm(v) + '</option>';
  }
  return h;
}
const redondea5 = t => { const m = Calc.aMin(t); const r = Math.round(m / 5) * 5 % (24 * 60); return String(Math.floor(r / 60)).padStart(2, '0') + ':' + String(r % 60).padStart(2, '0'); };

/* ================= Pantalla ================= */
function vistaNueva(){
  W = nuevoW(); paso = 0;
  pintarPaso();
}

function pintarPaso(){
  const ps = pasos(); paso = Math.min(paso, ps.length - 1);
  const k = ps[paso];
  const prog = '<div class="prog">' + ps.map((_, i) => '<i class="' + (i <= paso ? 'on' : '') + '"></i>').join('') + '</div><div class="pn">Paso ' + (paso + 1) + ' de ' + ps.length + '</div>';
  const cuerpo = PAGINAS[k]();
  const esUltimo = k === 'revisar';
  let h = '<div class="wiz"><div class="wiz-main">' + prog +
    '<details class="res-cel"' + (recordar.get('resAbierto') === '1' ? ' open' : '') + '><summary>' + resumenCorto() + '</summary>' + resumenFilas() + '</details>' +
    '<div class="wcard">' + cuerpo +
    '<div class="wnav">' + (paso > 0 ? '<button class="btn l" type="button" id="wAtras">← Atrás</button>' : '<span></span>') +
    (esUltimo ? '<button class="btn" type="button" id="wEnviar" disabled>Enviar solicitud</button>' : '<button class="btn" type="button" id="wSig">Siguiente →</button>') +
    '</div><div class="msg oculto" id="wMsg"></div></div></div>' +
    '<aside class="wiz-res"><div class="res"><h4>Lo que llevas</h4>' + resumenFilas() + '</div></aside></div>';
  $('vista').innerHTML = h;
  $('vista').querySelector('.res-cel').ontoggle = e => recordar.set('resAbierto', e.target.open ? '1' : '0');
  if ($('wAtras')) $('wAtras').onclick = () => { paso--; pintarPaso(); };
  if ($('wSig')) $('wSig').onclick = siguiente;
  if ($('wEnviar')) $('wEnviar').onclick = enviar;
  ENLACES[k]?.();
  window.scrollTo(0, 0);
}

function siguiente(){
  const k = pasos()[paso];
  const err = VALIDA[k]?.();
  if (err) return aviso($('wMsg'), err);
  paso++; pintarPaso();
}
function refrescarResumen(){
  const f = resumenFilas();
  $('vista').querySelectorAll('.wiz-res .res, .res-cel').forEach(el => {
    if (el.tagName === 'DETAILS'){ el.querySelector('summary').innerHTML = resumenCorto(); el.querySelectorAll('.r,.peq').forEach(x => x.remove()); el.insertAdjacentHTML('beforeend', f); }
    else el.innerHTML = '<h4>Lo que llevas</h4>' + f;
  });
}

/* ---- Resumen ("Lo que llevas") ---- */
function resumenFilas(){
  const fila = (a, b) => '<div class="r"><span>' + a + '</span><b>' + b + '</b></div>';
  const e = empW(); let h = '';
  if (W.para !== yo.id) h += fila('Para', esc(e.nombre_oficial));
  if (W.tipo) h += fila('Qué pasó', esc((TIPOS_FORM.find(t => t[0] === W.tipo) || [])[2] || ''));
  if (W.tipo && W.fecha_inicio){
    const dia = W.tipo === 'ausencia' && W.fecha_fin && W.fecha_fin !== W.fecha_inicio ? diaTxt(W.fecha_inicio) + ' al ' + diaTxt(W.fecha_fin) : diaTxt(W.fecha_inicio);
    h += fila('Día', dia);
    const of = ofDia();
    h += fila('Horario ese día', of ? hhmm(of.entrada) + ' – ' + hhmm(of.salida) + (of.respaldo ? ' ⚠️' : '') : 'no labora');
  }
  const c = calcW();
  if (c){
    const r = c.r;
    if (['llegada', 'salida_anticipada'].includes(W.tipo)) h += fila(W.tipo === 'llegada' ? 'Llegada' : 'Salida', hhmm(W.hora_ref)) + fila('Tiempo', r.minutosReales ? Calc.fmtDuracion(r.minutosReales) + (W.tipo === 'llegada' ? ' tarde' : ' antes') : r.tipo === 'llegada_temprana' ? 'llegaste antes' : '—');
    if (['horas_extras', 'cambio_horario', 'reposicion'].includes(W.tipo)) h += fila('Horas', hhmm(W.hora_ref) + ' a ' + hhmm(W.hora_fin));
    if (W.tipo === 'ausencia') h += fila('Tiempo', Calc.fmtDuracion(r.minutosReales || 0) + ' de jornada');
    if (W.justificacion) h += fila('Justificación', esc(JUST_TXT[W.justificacion]));
    if (!conJust(W.tipo) || W.justificacion) h += fila('Banco de horas', bancoTxt(r));
  } else if (W.justificacion) h += fila('Justificación', esc(JUST_TXT[W.justificacion]));
  return h || '<div class="peq">Aquí vas a ver tu horario, qué afecta y cuántas horas se mueven.</div>';
}
function resumenCorto(){
  const t = (TIPOS_FORM.find(x => x[0] === W.tipo) || [])[2];
  if (!t) return '▾ Lo que llevas';
  const c = calcW(), of = W.fecha_inicio ? ofDia() : null;
  return '▾ <b>' + esc(t) + ' · ' + diaTxt(W.fecha_inicio) + '</b>' + (of ? ' · horario ' + hhmm(of.entrada) + '–' + hhmm(of.salida) : '') + (c && (!conJust(W.tipo) || W.justificacion) ? ' · ' + bancoTxt(c.r, true) : '');
}
function bancoTxt(r, corto){
  const n = Math.abs(r.horas), rd = r.minutosReales && Math.round(r.minutosReales) !== Math.round(n * 60) ? ' (' + Calc.fmtDuracion(r.minutosReales) + ' → se redondea a ' + Calc.fmtH(n) + ')' : '';
  switch (r.mueve){
    case 'deposito': return n ? '<span class="pos">+' + Calc.fmtH(n) + '</span>' + (corto ? '' : rd) : 'no suma (cae en tu horario)';
    case 'retiro': return n ? '<span class="neg">−' + Calc.fmtH(n) + '</span>' + (corto ? '' : rd) : 'no descuenta';
    case 'deuda': return n ? 'debes reponer <span class="neg">' + Calc.fmtH(n) + '</span>' + (corto ? '' : rd) : 'no hay nada que reponer';
    case 'reposicion': return n ? 'repones <span class="pos">' + Calc.fmtH(n) + '</span>' + (corto ? '' : rd) : 'no repone (cae en tu horario)';
    default: return corto ? 'no mueve tu banco' : 'No mueve tu banco';
  }
}
const DIAS_TXT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const diaTxt = iso => iso ? DIAS_TXT[Calc.diaSemana(iso)] + ' ' + fechaMX(iso) : '';

/* ---- Paginas ---- */
const preg = (q, s) => '<div class="q">' + q + '</div>' + (s ? '<div class="qs">' + s + '</div>' : '');
const chips = (lista, sel, attr) => '<div class="wchips">' + lista.map(([k, t]) => '<button type="button" class="wchip' + (k === sel ? ' on' : '') + '" data-' + attr + '="' + k + '">' + esc(t) + '</button>').join('') + '</div>';
const areaOpts = sel => D.areas.map(a => '<option value="' + a.id + '"' + (a.id === sel ? ' selected' : '') + '>' + esc(a.nombre) + '</option>').join('');

const PAGINAS = {
  para: () => preg('¿Para quién es la solicitud?', 'Como ' + (soyAdmin() ? 'administradora' : 'encargada de altas') + ' puedes capturarla a nombre de otra persona; quedará registrado que tú la llenaste.') +
    chips([['yo', 'Para mí'], ['otra', 'Para otra persona']], W.otra ? 'otra' : 'yo', 'para') +
    (W.otra ? '<label for="wArea">Área</label><select class="f" id="wArea">' + areaOpts(empPorId(W.para)?.area_id || D.areas[0]?.id) + '</select>' +
      '<label for="wPersona">Persona</label><select class="f" id="wPersona"></select>' : ''),
  tipo: () => preg('¿Qué pasó?', 'Una solicitud por cada variación. Si el mismo día llegaste tarde y saliste antes, son dos.') +
    '<div class="tipos">' + TIPOS_FORM.map(([k, e, t]) => '<button type="button" class="tipo' + (W.tipo === k ? ' on' : '') + '" data-tipo="' + k + '"><span class="e">' + e + '</span>' + t + (k === 'correccion' ? '<small>cuando te piden cambios</small>' : '') + '</button>').join('') + '</div>',
  fecha: () => preg(W.tipo === 'ausencia' ? '¿Desde qué día faltas?' : '¿Qué día fue (o va a ser)?', 'Puedes registrar días pasados o futuros.') +
    '<input class="f" id="wFecha" type="date" value="' + W.fecha_inicio + '" style="max-width:240px"><div class="ayuda" id="wFechaNota"></div>',
  ultimo: () => preg('¿Último día que faltas?', 'Si es un solo día, déjalo igual. Sábados, domingos y días que no trabajas no se cuentan.') +
    '<input class="f" id="wUltimo" type="date" min="' + W.fecha_inicio + '" value="' + (W.fecha_fin || W.fecha_inicio) + '" style="max-width:240px">',
  hora: () => { const of = ofDia(); const ll = W.tipo === 'llegada';
    W.hora_ref = W.hora_ref || (of ? (ll ? of.entrada : of.salida) : '09:00');
    return preg(ll ? '¿A qué hora llegaste o vas a llegar?' : '¿A qué hora saliste o vas a salir?',
      of ? 'Tu ' + (ll ? 'entrada' : 'salida') + ' oficial ese día es a las ' + hhmm(ll ? of.entrada : of.salida) + '.' : 'Ese día no tienes horario oficial.') +
      '<select class="f" id="wHora" style="max-width:200px">' + opcHoras(redondea5(W.hora_ref)) + '</select><div class="ayuda">De 5 en 5 minutos.</div>'; },
  rango: () => { const of = ofDia();
    if (!W.hora_ref) W.hora_ref = W.tipo === 'cambio_horario' ? (of?.entrada || '09:00') : (of?.salida || '18:00');
    if (!W.hora_fin) W.hora_fin = W.tipo === 'cambio_horario' ? (of?.salida || '18:00') : redondea5(Calc.HHMM(String((Calc.aMin(W.hora_ref) + 120) % 1440 / 60 | 0) + ':' + String((Calc.aMin(W.hora_ref) + 120) % 60)));
    const q = { horas_extras: ['¿De qué hora a qué hora trabajaste?', 'Puedes poner solo el bloque extra (18:00 a 20:00) o tu jornada completa (7:00 a 20:00): el sistema descuenta tu horario oficial. En sábado y domingo todo cuenta.'],
      cambio_horario: ['¿A qué hora entraste y saliste ese día?', of ? 'Tu horario oficial ese día es de ' + hhmm(of.entrada) + ' a ' + hhmm(of.salida) + '.' : ''],
      reposicion: ['¿De qué hora a qué hora repusiste?', 'Solo cuenta lo que quede fuera de tu horario oficial.'] }[W.tipo];
    return preg(q[0], q[1]) + '<div class="rango"><div><label for="wIni">De</label><select class="f" id="wIni">' + opcHoras(redondea5(W.hora_ref)) + '</select></div>' +
      '<span>a</span><div><label for="wFin">A</label><select class="f" id="wFin">' + opcHoras(redondea5(W.hora_fin)) + '</select></div></div><div class="ayuda" id="wRangoNota"></div>'; },
  just: () => preg('¿Por qué?', 'Elige la justificación que más se acerque.') + chips(JUSTS, W.justificacion, 'just'),
  proyecto: () => preg('¿En qué proyecto trabajaste?') + '<select class="f" id="wProy"><option value="">Elige un proyecto…</option>' +
    D.proyectos.filter(p => p.activo).map(p => '<option value="' + p.id + '"' + (p.id === W.proyecto_id ? ' selected' : '') + '>' + esc(p.nombre_corto) + '</option>').join('') + '</select>',
  checar: () => preg('¿Qué olvidaste checar?') + chips(CHECAR, W.que_checar, 'checar'),
  motivo: () => preg('¿Por qué recorriste tu jornada?', 'Va en tu formato oficial.') + '<textarea class="f ta" id="wMotivo" rows="3" placeholder="Ej. Entrega de proyecto en la tarde">' + esc(W.motivo_cambio) + '</textarea>',
  detalles: () => {
    let h = preg('Detalles', 'Solo lo que aplica a tu caso.');
    if (W.justificacion === 'comision') h += '<label for="wCom">¿Qué proyecto o cliente?</label><select class="f" id="wCom"><option value="">(sin especificar)</option>' +
      D.proyectos.filter(p => p.activo).map(p => '<option value="' + p.id + '"' + (p.id === W.comision_sel ? ' selected' : '') + '>' + esc(p.nombre_corto) + '</option>').join('') +
      '<option value="otro"' + (W.comision_sel === 'otro' ? ' selected' : '') + '>Otro (escribirlo)</option></select>' +
      '<input class="f' + (W.comision_sel === 'otro' ? '' : ' oculto') + '" id="wComOtro" style="margin-top:8px" placeholder="Nombre del proyecto o cliente" value="' + esc(W.comision_otro) + '">';
    if (['asunto_personal', 'otro'].includes(W.justificacion)) h += '<label for="wTexto">Redacción para el formato <span class="tag">se imprime tal cual</span></label><textarea class="f ta" id="wTexto" rows="3" placeholder="Ej. Atención de un trámite personal.">' + esc(W.texto_oficial) + '</textarea>';
    if (W.justificacion === 'uso_horas') h += '<label for="wEtiq">Etiqueta para el banco <span class="tag">va a tu banco de horas</span></label><input class="f" id="wEtiq" placeholder="Ej. Cita médica" value="' + esc(W.etiqueta_banco) + '">';
    h += '<label for="wNotas">Notas adicionales <span class="tag">se imprimen · opcional</span></label><textarea class="f ta" id="wNotas" rows="2">' + esc(W.notas) + '</textarea>';
    h += '<label for="wRazon">Razón real <span class="tag">🔒 solo la ven tu jefe, Gaby y Laura · nunca se imprime · opcional</span></label><textarea class="f ta" id="wRazon" rows="2">' + esc(W.razon_real) + '</textarea>';
    return h;
  },
  revisar: () => {
    const c = calcW(); if (!c) return preg('Falta información', 'Regresa y completa los pasos.');
    const r = c.r, ps = pasos(), ir = k => ' <button type="button" class="cambiar" data-ir-paso="' + ps.indexOf(k) + '">cambiar</button>';
    const fila = (a, b, k) => '<div class="r"><span>' + a + '</span><b>' + b + (k && ps.includes(k) ? ir(k) : '') + '</b></div>';
    let h = preg('Revisa antes de enviar', 'Después de enviarla ya no se puede editar.') + '<div class="lista">';
    if (W.para !== yo.id) h += fila('Para', esc(empW().nombre_oficial), 'para');
    h += fila('Qué pasó', esc(TIPO_TXT[r.tipo] || ''), 'tipo');
    h += fila('Día', W.tipo === 'ausencia' && c.s.fecha_fin !== W.fecha_inicio ? diaTxt(W.fecha_inicio) + ' al ' + diaTxt(c.s.fecha_fin) : diaTxt(W.fecha_inicio), 'fecha');
    if (W.hora_ref && !W.hora_fin) h += fila(W.tipo === 'llegada' ? 'Llegada' : 'Salida', hhmm(W.hora_ref), 'hora');
    if (W.hora_fin) h += fila('Horas', hhmm(W.hora_ref) + ' a ' + hhmm(W.hora_fin), 'rango');
    if (W.justificacion) h += fila('Justificación', esc(JUST_TXT[W.justificacion]) + (W.etiqueta_banco ? ' · “' + esc(W.etiqueta_banco) + '”' : ''), 'just');
    if (W.que_checar) h += fila('Qué olvidó', esc(Object.fromEntries(CHECAR)[W.que_checar]), 'checar');
    if (W.razon_real) h += fila('Razón real 🔒', esc(W.razon_real), 'detalles');
    h += fila('Banco de horas', bancoTxt(r));
    if (r.verificacion) h += fila('Verificación', esc(r.verificacion.texto));
    h += '</div><div class="peq" style="margin-top:12px">Texto que irá en tu formato:</div><div class="red">' + esc(r.redaccion) + '</div>';
    if (soyAdmin()) h += '<label class="check"><input type="checkbox" id="wPrueba"' + (W.es_prueba ? ' checked' : '') + '> Es prueba (folio PRUEBA, no gasta folio real)</label>';
    h += '<label class="confirma"><input type="checkbox" id="wConfirmo"' + (W.confirmo ? ' checked' : '') + '><span><b>Confirmo que la información es verídica y completa.</b><br>Si algo está mal después de enviarla, habrá que hacer una corrección y volver a pasar por aprobación.</span></label>';
    return h;
  }
};

/* ---- Eventos de cada pagina ---- */
const ENLACES = {
  para: () => {
    $('vista').querySelectorAll('[data-para]').forEach(b => b.onclick = () => { W.otra = b.dataset.para === 'otra'; if (!W.otra) W.para = yo.id; W.tipo = null; resetDatos(); pintarPaso(); });
    if (!W.otra) return;
    const llenar = () => {
      const gente = D.empleados.filter(e => e.activo && e.area_id === $('wArea').value).sort((a, b) => a.nombre_oficial.localeCompare(b.nombre_oficial, 'es'));
      $('wPersona').innerHTML = gente.map(e => '<option value="' + e.id + '"' + (e.id === W.para ? ' selected' : '') + '>' + esc(e.nombre_oficial) + '</option>').join('');
      W.para = $('wPersona').value || yo.id; refrescarResumen();
    };
    $('wArea').onchange = llenar; $('wPersona').onchange = () => { W.para = $('wPersona').value; resetDatos(); refrescarResumen(); };
    llenar();
  },
  tipo: () => $('vista').querySelectorAll('[data-tipo]').forEach(b => b.onclick = () => {
    if (b.dataset.tipo === 'correccion'){ location.hash = 'corregir'; return; }
    if (W.tipo !== b.dataset.tipo){ W.tipo = b.dataset.tipo; resetDatos(); }
    siguiente();
  }),
  fecha: () => { const nota = () => { const of = ofDia(); $('wFechaNota').textContent = !W.fecha_inicio ? '' : of ? 'Tu horario ese día: ' + hhmm(of.entrada) + ' a ' + hhmm(of.salida) + (of.respaldo ? ' (no tienes horario registrado; se usa 9:00 a 14:00 — avísale a Gaby)' : '') : 'Ese día no tienes horario oficial (fin de semana o día que no trabajas).'; };
    $('wFecha').onchange = () => { W.fecha_inicio = $('wFecha').value; if (W.fecha_fin && W.fecha_fin < W.fecha_inicio) W.fecha_fin = W.fecha_inicio; W.hora_ref = W.tipo === 'llegada' || W.tipo === 'salida_anticipada' ? null : W.hora_ref; nota(); refrescarResumen(); }; nota(); },
  ultimo: () => $('wUltimo').onchange = () => { W.fecha_fin = $('wUltimo').value; refrescarResumen(); },
  hora: () => $('wHora').onchange = () => { W.hora_ref = $('wHora').value; refrescarResumen(); },
  rango: () => { const nota = () => { const d = Calc.duracion(W.hora_ref, W.hora_fin); $('wRangoNota').textContent = Calc.aMin(W.hora_fin) <= Calc.aMin(W.hora_ref) ? 'Termina al día siguiente (' + Calc.fmtDuracion(d) + ').' : Calc.fmtDuracion(d) + ' en total.'; };
    $('wIni').onchange = () => { W.hora_ref = $('wIni').value; nota(); refrescarResumen(); };
    $('wFin').onchange = () => { W.hora_fin = $('wFin').value; nota(); refrescarResumen(); };
    W.hora_ref = $('wIni').value; W.hora_fin = $('wFin').value; nota(); refrescarResumen(); },
  just: () => $('vista').querySelectorAll('[data-just]').forEach(b => b.onclick = () => { W.justificacion = b.dataset.just; siguiente(); }),
  proyecto: () => $('wProy').onchange = () => { W.proyecto_id = $('wProy').value; refrescarResumen(); },
  checar: () => $('vista').querySelectorAll('[data-checar]').forEach(b => b.onclick = () => { W.que_checar = b.dataset.checar; siguiente(); }),
  motivo: () => $('wMotivo').oninput = () => { W.motivo_cambio = $('wMotivo').value; },
  detalles: () => {
    if ($('wCom')) $('wCom').onchange = () => { W.comision_sel = $('wCom').value; $('wComOtro').classList.toggle('oculto', W.comision_sel !== 'otro'); };
    if ($('wComOtro')) $('wComOtro').oninput = () => W.comision_otro = $('wComOtro').value;
    if ($('wTexto')) $('wTexto').oninput = () => W.texto_oficial = $('wTexto').value;
    if ($('wEtiq')) $('wEtiq').oninput = () => W.etiqueta_banco = $('wEtiq').value;
    $('wNotas').oninput = () => W.notas = $('wNotas').value;
    $('wRazon').oninput = () => W.razon_real = $('wRazon').value;
  },
  revisar: () => {
    const btn = () => $('wEnviar').disabled = !W.confirmo;
    $('wConfirmo').onchange = () => { W.confirmo = $('wConfirmo').checked; btn(); };
    if ($('wPrueba')) $('wPrueba').onchange = () => W.es_prueba = $('wPrueba').checked;
    $('vista').querySelectorAll('[data-ir-paso]').forEach(b => b.onclick = () => { paso = +b.dataset.irPaso; pintarPaso(); });
    btn();
  }
};
function resetDatos(){
  Object.assign(W, { fecha_fin: null, hora_ref: null, hora_fin: null, justificacion: null, proyecto_id: '', comision_sel: '', comision_otro: '',
    que_checar: null, texto_oficial: '', etiqueta_banco: '', motivo_cambio: '', confirmo: false });
}

/* ---- Validaciones por pagina ---- */
const VALIDA = {
  para: () => !W.para ? 'Elige a la persona.' : null,
  tipo: () => !W.tipo ? 'Elige qué pasó.' : null,
  fecha: () => !W.fecha_inicio ? 'Elige el día.' : null,
  ultimo: () => (W.fecha_fin || W.fecha_inicio) < W.fecha_inicio ? 'El último día no puede ser antes del primero.' : null,
  hora: () => !W.hora_ref ? 'Elige la hora.' : null,
  rango: () => W.hora_ref === W.hora_fin ? 'La hora de inicio y la de fin son iguales.' : null,
  just: () => !W.justificacion ? 'Elige la justificación.' : null,
  proyecto: () => !W.proyecto_id ? 'Elige el proyecto.' : null,
  checar: () => !W.que_checar ? 'Elige qué olvidaste checar.' : null,
  motivo: () => !W.motivo_cambio.trim() ? 'Escribe el motivo; es obligatorio y va en tu formato.' : null,
  detalles: () => ['asunto_personal', 'otro'].includes(W.justificacion) && !W.texto_oficial.trim() ? 'Escribe la redacción para el formato.'
    : W.comision_sel === 'otro' && !W.comision_otro.trim() ? 'Escribe el proyecto o cliente.' : null
};

/* ---- Enviar ---- */
async function enviar(){
  const c = calcW(); if (!c) return aviso($('wMsg'), 'Falta información.');
  if (!W.confirmo) return aviso($('wMsg'), 'Marca la casilla de confirmación.');
  const r = c.r, of = r.oficial;
  const p = {
    empleado_id: W.para, tipo: r.tipo, justificacion: conJust(W.tipo) ? W.justificacion : null,
    fecha_inicio: W.fecha_inicio, fecha_fin: c.s.fecha_fin, hora_ref: W.hora_ref, hora_fin: W.hora_fin,
    proyecto_id: W.tipo === 'horas_extras' ? W.proyecto_id : (W.comision_sel && W.comision_sel !== 'otro' ? W.comision_sel : null),
    comision_ref: c.s.comision_ref || null, que_checar: W.que_checar, texto_oficial: W.texto_oficial, etiqueta_banco: W.etiqueta_banco,
    notas: W.notas, razon_real: W.razon_real, motivo_cambio: W.motivo_cambio, verificacion: r.verificacion?.texto || null,
    mueve: r.mueve, horas_calculadas: r.horas, calculo: r.calculo, horario_oficial: of ? hhmm(of.entrada) + '-' + hhmm(of.salida) : null,
    redaccion: r.redaccion, es_prueba: soyAdmin() && W.es_prueba
  };
  $('wEnviar').disabled = true; aviso($('wMsg'), '');
  const { data, error } = await sb.rpc('crear_solicitud', { p });
  if (error){
    $('wEnviar').disabled = false;
    return aviso($('wMsg'), /crear_solicitud|PGRST202|schema cache/i.test(error.message + error.code) ? 'Falta correr el SQL 006 en Supabase.' : 'No se pudo enviar: ' + error.message);
  }
  pintarListo(data);
}

function pintarListo(d){
  const e = empW();
  $('vista').innerHTML = '<div class="listo"><div style="font-size:44px">✅</div><h2>¡Listo, ya se mandó!</h2>' +
    (W.para !== yo.id ? '<div class="sub">a nombre de ' + esc(e.nombre_oficial) + '</div>' : '') +
    '<div class="sub" style="margin-top:10px">Folio</div><div class="folio">' + esc(d.folio) + '</div>' +
    '<div class="pasos">' + (d.con_quien === 'Gaby' ? '1. Va directo con Gaby (no pasa por jefe)' : '1. ' + esc(d.con_quien) + ' la valida') +
    '<br>' + (d.con_quien === 'Gaby' ? '2.' : '2. Gaby la revisa<br>3.') + ' Laura da la aprobación final' +
    '<br><span class="peq">Si te piden cambios, lo vas a ver en “Mis solicitudes”.</span></div>' +
    '<div class="listo-btns"><button class="btn" type="button" id="lInicio">Volver al inicio</button><button class="btn l" type="button" id="lOtra">Hacer otra solicitud</button><button class="btn l" type="button" id="lMias">Ver mis solicitudes</button></div></div>';
  $('lInicio').onclick = () => { location.hash = ''; };
  $('lOtra').onclick = () => vistaNueva();
  $('lMias').onclick = () => { location.hash = 'mias'; };
  window.scrollTo(0, 0);
}

/* ================= Mis solicitudes ================= */
async function vistaMias(){
  $('vista').innerHTML = '<div class="titulo"><h2>Mis solicitudes</h2><div class="sub">Las que pediste tú (y las que alguien capturó a tu nombre).</div></div><div class="carga">Cargando…</div>';
  const { data, error } = await sb.from('solicitudes').select('id,folio,recibido_at,tipo,justificacion,fecha_inicio,fecha_fin,hora_ref,hora_fin,estado_global,etapa,mueve,horas_calculadas,redaccion,verificacion,es_prueba,capturado_por,empleado_id,corregida_por,congelada,decisiones(*)')
    .eq('empleado_id', yo.id).order('recibido_at', { ascending: false }).limit(200);
  if (error){ $('vista').querySelector('.carga').textContent = /solicitudes|PGRST/i.test(error.message) ? 'Falta correr el SQL 006 en Supabase.' : 'No pude cargar: ' + error.message; return; }
  const filas = (data || []).map(s => { const e = ESTADOS[s.estado_global] || [s.estado_global, '#eee', '#555'];
    return '<tr class="clic" data-id="' + s.id + '"><td>' + esc(s.folio) + (s.es_prueba ? ' <span class="chip c-rev">prueba</span>' : '') + '</td>' +
      '<td class="opt">' + new Date(s.recibido_at).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + '</td>' +
      '<td>' + esc(TIPO_TXT[s.tipo] || s.tipo) + '</td><td>' + fechaMX(s.fecha_inicio) + (s.fecha_fin !== s.fecha_inicio ? ' – ' + fechaMX(s.fecha_fin) : '') + '</td>' +
      '<td class="opt">' + (s.mueve === 'no' || !+s.horas_calculadas ? '<span class="c-no">—</span>' : (s.horas_calculadas > 0 ? '+' : '') + Calc.fmtH(s.horas_calculadas).replace(/^/, s.horas_calculadas < 0 ? '−' : '')) + '</td>' +
      '<td><span class="chip" style="background:' + e[1] + ';color:' + e[2] + '">' + e[0] + '</span></td></tr>'; }).join('');
  $('vista').innerHTML = '<div class="titulo"><h2>Mis solicitudes</h2><div class="sub">Las que pediste tú (y las que alguien capturó a tu nombre).</div></div>' +
    '<div class="barra"><span class="esp"></span><button class="btn" type="button" id="mNueva">+ Nueva solicitud</button></div>' +
    '<div class="tabla-w"><table><thead><tr><th>Folio</th><th class="opt">Recibida</th><th>Qué</th><th>Día(s)</th><th class="opt">Banco</th><th>Estado</th></tr></thead><tbody>' +
    (filas || '<tr><td colspan="6" class="vacio">Todavía no tienes solicitudes.</td></tr>') + '</tbody></table></div><div class="ver">' + VERSION + '</div>';
  $('mNueva').onclick = () => { location.hash = 'nueva'; };
  const porId = Object.fromEntries((data || []).map(s => [s.id, s]));
  $('vista').querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => verSolicitud(porId[tr.dataset.id]));
}

function verSolicitud(s){
  const pedido = s.estado_global === 'cambios_solicitados' ? quienPidioCambios(s) : null;
  const e = ESTADOS[s.estado_global] || [s.estado_global, '#eee', '#555'];
  const fila = (a, b) => b ? '<div class="r"><span>' + a + '</span><b>' + b + '</b></div>' : '';
  $('panel').innerHTML = '<div class="cab"><div><h3>' + esc(s.folio) + '</h3><div class="sub">' + esc(TIPO_TXT[s.tipo] || s.tipo) + '</div></div><button class="x" type="button" id="xPanel" aria-label="Cerrar">✕</button></div>' +
    '<div class="lista" style="margin-top:12px">' + fila('Estado', '<span class="chip" style="background:' + e[1] + ';color:' + e[2] + '">' + e[0] + '</span>') +
    fila('Día(s)', fechaMX(s.fecha_inicio) + (s.fecha_fin !== s.fecha_inicio ? ' al ' + fechaMX(s.fecha_fin) : '')) +
    fila('Horas', s.hora_ref ? hhmm(s.hora_ref) + (s.hora_fin ? ' a ' + hhmm(s.hora_fin) : '') : '') +
    fila('Justificación', s.justificacion ? esc(JUST_TXT[s.justificacion]) : '') +
    fila('Banco', s.mueve !== 'no' && +s.horas_calculadas ? bancoTxt({ mueve: s.mueve, horas: +s.horas_calculadas }, true) + ' <span class="peq">(se aplica al aprobar tu jefe)</span>' : '') +
    fila('Verificación', esc(s.verificacion || '')) + '</div>' +
    (pedido ? '<div class="alerta">' + esc(pedido.quien) + ' pidió: “' + esc(pedido.com) + '”</div>' : '') +
    '<div class="peq" style="margin-top:12px">Texto de tu formato:</div><div class="red">' + esc(s.redaccion) + '</div>' +
    (s.congelada ? '<button class="btn" type="button" id="mPDF" style="margin-top:16px">📄 Descargar PDF</button>' : '') +
    (!s.corregida_por ? '<button class="btn' + (pedido ? '' : ' l') + '" type="button" id="mCorr" style="margin-top:16px">✏️ Corregir esta solicitud</button>' : '');
  $('panel').classList.remove('oculto'); $('vista').classList.add('con-panel');
  $('xPanel').onclick = cerrarPanel;
  if ($('mPDF')) $('mPDF').onclick = () => descargarSolicitud(s.id, $('mPDF'));
  if ($('mCorr')) $('mCorr').onclick = () => { corregirFolio = s.folio; location.hash = 'corregir'; };
}

// Registrar las vistas en el enrutador de index.html
VISTAS.nueva = ['Nueva solicitud', vistaNueva, 'todos'];
VISTAS.mias = ['Mis solicitudes', vistaMias, 'todos'];
