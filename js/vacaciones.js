// Permisos UT · vacaciones.js
// Vacaciones en dos pasos (pedir -> apartar con Laura; formato de "Falté" -> descuenta lo real) y días festivos.
// Wireframe aprobado: docs/wireframes/vacaciones.html. Reglas: 07 RESPONDIDAS (26-oct) y sql/012.
// Usa lo global de index.html (sb, D, yo, $, esc, toast, ...) y de los otros js (diaTxt, veSim, errTxt, puedoAjustar, ...).

/* ================= Catalogos y formato ================= */
const VAC_LEY = [[1, 12], [2, 14], [3, 16], [4, 18], [5, 20], [6, 22], [11, 24], [16, 26], [21, 28], [26, 30]];
const vacLey = k => k < 1 ? 0 : VAC_LEY.filter(([d]) => d <= k).pop()[1];
const VAC_EST = { espera_laura: ['Espera a Laura', 'c-rev'], aprobada: ['Apartadas', 'c-ok'], rechazada: ['Rechazada', 'c-blk'],
  cancelada: ['Cancelada', 'c-no'], usada: ['Usadas', 'c-no'] };
const HABLO = { laura: 'Laura', gaby: 'Gaby', jefe: 'su jefe' };
const MOVV_TXT = { inicial: 'Saldo de arranque', tomadas: 'Tomadas', reverso: 'Reverso', ajuste: 'Ajuste', previas: 'Tomadas antes' };
const MOVV_CL = { inicial: 'm-ini', tomadas: 'm-ret', reverso: 'm-rev', ajuste: 'm-aj', previas: 'm-ret' };
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const faltaSQL012 = err => /vac_|festivo|fecha_ingreso|lleva_vacaciones|PGRST202|PGRST205|schema cache|does not exist/i.test((err?.message || '') + (err?.code || ''));
const errVac = err => faltaSQL012(err) ? 'Falta correr el SQL 012 en Supabase.' : errTxt(err);
const llevaVac = e => !!e && e.lleva_vacaciones !== false;
const sinPruebas = () => !!yo?.simulado;
const nDias = n => { const v = Math.round(Math.abs(+n) * 10) / 10; return v + (v === 1 ? ' día' : ' días'); };
const vNum = n => +n > 0 ? '<i class="vpos">' + (Math.round(+n * 10) / 10) + '</i>' : +n < 0 ? '<i class="vneg">−' + (Math.round(-n * 10) / 10) + '</i>' : '<i class="vcero">0</i>';
const vSigno = n => +n > 0 ? '<i class="vpos">+' + (Math.round(+n * 10) / 10) + '</i>' : +n < 0 ? '<i class="vneg">−' + (Math.round(-n * 10) / 10) + '</i>' : '<span class="cero">0</span>';
const dCorto = iso => +iso.slice(8, 10) + ' ' + MESES[+iso.slice(5, 7) - 1] + (iso.slice(0, 4) !== hoyISO().slice(0, 4) ? ' ' + iso.slice(0, 4) : '');
function rangoCorto(a, b){
  if (!b || a === b) return dCorto(a);
  if (a.slice(0, 7) === b.slice(0, 7)) return +a.slice(8, 10) + '–' + dCorto(b);
  return dCorto(a).replace(' ' + a.slice(0, 4), '') + ' – ' + dCorto(b);
}
const sumaDias = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const veoTodasVac = () => rolesVista().some(r => ['filtro', 'final', 'admin'].includes(r));
function tocaDecidirVac(p){
  if (p.es_prueba) return soyAdmin();
  if (yoEmp().decide_solo_pruebas) return false;
  return (yo.roles || []).includes('final');
}
const puedeDecidirVac = p => !yo.simulado && tocaDecidirVac(p);
const puedoFestivos = () => !yo.simulado && rolesVista().some(r => ['admin', 'altas', 'filtro'].includes(r));

async function vacResumen(empId){
  const { data, error } = await sb.rpc('vac_resumen', { p_emp: empId, p_sin_pruebas: sinPruebas() });
  if (error) throw error;
  return data;
}
async function vacPreview(empId, ini, fin, excluir){
  const { data, error } = await sb.rpc('vac_preview', { p_emp: empId, p_ini: ini, p_fin: fin, p_excluir: excluir || null, p_sin_pruebas: sinPruebas() });
  if (error) throw error;
  return data;
}
const anioHoy = r => (r.anios || []).find(a => a.k === r.k_hoy) || null;
// Dias tomados en un año (tomadas y sus reversos)
const esToma = m => ['tomadas', 'previas'].includes(m.tipo) || (m.tipo === 'reverso' && ['tomadas', 'previas'].includes(m.tipo_original));
const tomadasAnio = (r, k) => -(r.movimientos || []).filter(m => m.k === k && esToma(m)).reduce((x, m) => x + +m.dias, 0);

// Texto de los dias que cuentan: "mié 23, jue 24 y lun 28 · no cuentan vie 25 (Navidad) ni sáb/dom"
function diasQueCuentan(prev){
  const ds = (prev.lista || []).map(d => DIAS_TXT[Calc.diaSemana(d)] + ' ' + +d.slice(8, 10));
  const lista = ds.length > 6 ? ds.slice(0, 3).join(', ') + ' … ' + ds[ds.length - 1] : ds.length > 1 ? ds.slice(0, -1).join(', ') + ' y ' + ds[ds.length - 1] : ds[0] || '';
  const fes = (prev.festivos || []).map(f => DIAS_TXT[Calc.diaSemana(f.fecha)] + ' ' + +f.fecha.slice(8, 10) + ' (' + esc(f.nombre) + ')');
  return lista + (fes.length ? ' · no cuentan ' + fes.join(', ') + ' ni sáb/dom' : ' · no cuentan sáb/dom');
}
// "Te quedan 10 → te quedarían 7" por cada año laboral que toca
function bloqueQuedan(prev, quien, despues){
  const v = quien === 'tu' ? ['Te quedan', 'te quedarían'] : ['Le quedan', 'le quedarían'];
  return (prev.por_anio || []).map(a => {
    const otros = +a.comprometidos ? '<br><span class="peq">' + (quien === 'tu' ? 'ya tienes ' : 'ya tiene ') + nDias(a.comprometidos) + ' apartados o en espera ese año</span>' : '';
    const deAnio = (prev.por_anio.length > 1 || a.k !== prev.k_hoy) && a.desde ? ' <span class="peq">(año laboral ' + dCorto(a.desde) + ' – ' + dCorto(a.hasta) + ')</span>' : '';
    return '<div>' + v[0] + ' <b>' + (Math.round(a.quedan * 10) / 10) + '</b> <span class="vflecha">→</span> ' + v[1] + ' <b>' + vNum(a.despues) + '</b>' + (despues ? ' <span class="peq">' + despues + '</span>' : '') + deAnio + otros + '</div>';
  }).join('');
}

/* ================= MIS VACACIONES / detalle de una persona ================= */
const VV = { emp: null, mio: true, r: null, desde: null };
async function vistaMisVac(){
  VV.emp = yo.id; VV.mio = true; VV.desde = null;
  $('vista').innerHTML = '<div class="titulo"><h2>Mis vacaciones</h2></div><div class="carga">Cargando…</div>';
  try { VV.r = await vacResumen(yo.id); }
  catch (err){ $('vista').querySelector('.carga').textContent = errVac(err); return; }
  pintarVacPersona();
}
async function abrirVacPersona(empId){
  VV.emp = empId; VV.mio = empId === yo.id; VV.desde = 'todos';
  $('vista').innerHTML = '<div class="titulo"><h2>Vacaciones</h2></div><div class="carga">Cargando…</div>';
  try { VV.r = await vacResumen(empId); }
  catch (err){ $('vista').querySelector('.carga').textContent = errVac(err); return; }
  cerrarPanel(); pintarVacPersona(); window.scrollTo(0, 0);
}

function pintarVacPersona(){
  const r = VV.r, e = empPorId(VV.emp), mio = VV.mio, hoy = r.hoy || hoyISO();
  let h = '<div class="titulo">' + (VV.desde ? '<button class="lnk" type="button" id="vVolver">← Vacaciones de todos</button>' : '') +
    '<h2>' + (mio && !VV.desde ? 'Mis vacaciones' : esc(e?.nombre_oficial || '')) + '</h2><div class="sub">' + (mio && !VV.desde ? esc(e?.nombre_oficial || yo.nombre) + ' · ' : '') +
    '<span class="chip ' + areaClase(e?.area_id) + '">' + esc(areaPorId(e?.area_id)?.nombre || '') + '</span></div></div>';
  if (!r.lleva){ $('vista').innerHTML = h + '<div class="vacio">' + (mio ? 'No llevas' : 'No lleva') + ' conteo de vacaciones.</div><div class="ver">' + VERSION + '</div>'; return volverVac(); }
  if (!r.fecha_ingreso){ $('vista').innerHTML = h + '<div class="alerta" style="max-width:560px;margin-top:14px">' + (mio ? 'Todavía no está capturada tu fecha de ingreso. Pídele a Gaby que la capture (Personas).' : 'Falta su fecha de ingreso: captúrala en Administración › Personas.') + '</div><div class="ver">' + VERSION + '</div>'; return volverVac(); }
  const a = anioHoy(r) || { k: r.k_hoy, base: 0, final: 0, apartados: 0, ley: 0, desde: r.fecha_ingreso, hasta: r.fecha_ingreso, tiene_inicial: false };
  const tom = tomadasAnio(r, a.k), aparta = +a.apartados, queda = +a.final;
  const dato = (t, b, s, cl) => '<div class="dato' + (cl ? ' ' + cl : '') + '"><span>' + t + '</span><b>' + b + '</b><small>' + s + '</small></div>';
  h += '<div class="tures vt4" style="margin-top:14px">' +
    dato('Antigüedad', a.k + (a.k === 1 ? ' año' : ' años'), 'desde ' + fechaMX(r.fecha_ingreso)) +
    dato(mio && !VV.desde ? 'Te tocan este año' : 'Le tocan este año', nDias(a.base), a.tiene_inicial ? 'saldo de arranque' : a.k < 1 ? 'aún no cumple su primer año' : 'por ley (' + a.k + 'º año)' + (+a.base !== +a.ley ? ' · ' + (a.ley - a.base) + ' de préstamo' : '')) +
    dato('Tomados', nDias(tom), 'en este año laboral') +
    '<div class="dato vhi"><span>' + (mio && !VV.desde ? 'Te quedan' : 'Le quedan') + '</span><b class="' + (!queda ? 'n0' : queda > 0 ? 'verde' : 'rojo') + '">' + (queda < 0 ? '−' : '') + nDias(queda) + '</b><small>' + (aparta ? (mio ? 'te' : 'le') + ' quedarían ' + (Math.round((queda - aparta) * 10) / 10) + ' · ' + nDias(aparta) + ' apartados' : 'hoy') + '</small></div></div>';
  if (mio && !yo.simulado) h += '<div class="fila" style="margin-top:12px"><button class="btn" type="button" id="vPedir">🌴 Pedir vacaciones</button></div>';

  // Apartadas / en espera / rechazadas recientes
  const peds = (r.pedidos || []).filter(p => ['espera_laura', 'aprobada'].includes(p.estado) || (p.estado === 'rechazada' && p.fecha_fin >= sumaDias(hoy, -60)));
  if (peds.length){
    h += '<div class="secc">Vacaciones pedidas (todavía no descontadas)</div><div class="tabla-w"><table class="angosta"><thead><tr><th>Fechas</th><th class="num">Días</th><th>Estado</th><th></th></tr></thead><tbody>' +
      peds.map(p => {
        const pasaron = p.estado === 'aprobada' && p.fecha_fin < hoy && !p.con_formato;
        const est = pasaron ? '<span class="chip c-blk">Ya pasaron · falta ' + (mio ? 'tu' : 'su') + ' formato</span>'
          : p.estado === 'aprobada' && p.con_formato ? '<span class="chip c-ok">Formato en camino</span>'
          : '<span class="chip ' + VAC_EST[p.estado][1] + '">' + VAC_EST[p.estado][0] + '</span>';
        const acc = !mio || yo.simulado ? '' : pasaron ? '<button class="btn chico" type="button" data-vform="' + p.id + '">Hacer formato</button>'
          : ['espera_laura', 'aprobada'].includes(p.estado) && !p.con_formato ? '<button class="lnk" type="button" data-vcanc="' + p.id + '">Cancelar</button>' : '';
        return '<tr><td>' + rangoCorto(p.fecha_inicio, p.fecha_fin) + (p.es_prueba ? ' <span class="chip c-rev">prueba</span>' : '') + (p.excepcion ? ' <span class="chip c-blk">excepción</span>' : '') + '</td>' +
          '<td class="num">' + (+p.dias) + '</td><td>' + est + (p.comentario ? ' <span class="peq">“' + esc(p.comentario) + '”</span>' : '') + '</td><td>' + acc + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    if (peds.some(p => p.fecha_inicio > a.hasta)) h += '<div class="ayuda">Las que caen después de tu aniversario salen de tus días nuevos, no de los de hoy.</div>';
  }

  // Año laboral
  const sig = vacLey(a.k + 1), carry = Math.min(0, queda);
  h += '<div class="aviso-c info"><div><b>' + (mio && !VV.desde ? 'Tu' : 'Su') + ' año laboral: ' + fechaMX(a.desde) + ' – ' + fechaMX(a.hasta) + '.</b> Lo que no se tome antes del ' + fechaMX(a.hasta) + ' se vence.<br>' +
    '<span class="peq">El ' + fechaMX(sumaDias(a.hasta, 1)) + ' cumple ' + (a.k + 1) + (a.k + 1 === 1 ? ' año' : ' años') + ' y empieza con ' + (carry ? sig + ' − ' + (-carry) + ' = ' + (sig + carry) : sig) + ' días.</span></div></div>';

  // Movimientos (mas nuevo abajo). Aniversarios y vencidas se calculan de las reglas; lo demas es lo guardado.
  h += historialVac(r);
  h += '<div class="secc">Movimientos</div><div class="tabla-w"><table class="angosta"><thead><tr><th>Fecha</th><th>Folio</th><th>Movimiento</th><th>Detalle</th><th class="num">Días</th><th class="num">Disponibles</th></tr></thead><tbody>' +
    filasMovVac(r) + '</tbody></table></div><div class="ayuda">Nada se borra: si Laura cambia algo, el renglón original sale tachado y abajo su reverso. Los de fondo crema son lo que va a pasar (aniversario y lo que se vence).</div>';
  h += '<div class="ver">' + VERSION + '</div>';
  $('vista').innerHTML = h;
  volverVac();
  if ($('vPedir')) $('vPedir').onclick = () => { location.hash = 'pedirvac'; };
  $('vista').querySelectorAll('[data-vform]').forEach(b => b.onclick = () => {
    const p = r.pedidos.find(x => x.id === b.dataset.vform);
    atajoVac = { id: p.id, ini: p.fecha_inicio, fin: p.fecha_fin }; location.hash = 'nueva';
  });
  $('vista').querySelectorAll('[data-vquita]').forEach(b => b.onclick = async () => {
    if (!confirm('¿Quitar este registro? Queda como reverso (no se borra).')) return;
    b.disabled = true;
    const { error } = await sb.rpc('vac_quitar', { p_mov: +b.dataset.vquita });
    if (error){ b.disabled = false; return toast(errVac(error), true); }
    toast('Quitado.'); VV.r = await vacResumen(VV.emp); pintarVacPersona();
  });
  $('vista').querySelectorAll('[data-vcanc]').forEach(b => b.onclick = async () => {
    if (!confirm('¿Cancelar estas vacaciones? Los días dejan de estar apartados.')) return;
    b.disabled = true;
    const { error } = await sb.rpc('vac_cancelar', { p_pedido: b.dataset.vcanc });
    if (error){ b.disabled = false; return toast(errVac(error), true); }
    toast('Vacaciones canceladas.');
    VV.r = await vacResumen(VV.emp); pintarVacPersona();
  });
}
// Historial: cada vez que tomo vacaciones (con formato o registradas por Gaby), lo mas nuevo arriba
function historialVac(r){
  const quita = !VV.mio && puedoAjustar() && !yo.simulado;
  const tomas = (r.movimientos || []).filter(m => ['tomadas', 'previas'].includes(m.tipo) && !m.anulado).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
  const filas = tomas.map(m => {
    const s = m.sol, quien = id => esc(nombreCorto(empPorId(id)) || '—');
    const fechas = m.tipo === 'tomadas' && s ? rangoCorto(s.fecha_inicio, s.fecha_fin) : rangoCorto(m.fecha, m.fecha_fin || m.fecha);
    const como = m.tipo === 'tomadas'
      ? 'Formato ' + esc(s?.folio || m.referencia || '') + ' · ' + (s?.pedido ? 'apartadas' : 'imprevisto') + (s?.excepcion ? ' <span class="chip c-blk">excepción</span>' : '')
      : 'Registradas por Gaby' + (m.referencia && m.referencia !== 'Tomadas antes de la app' ? ' · ' + esc(m.referencia) : '');
    const aprobo = m.tipo === 'tomadas' ? (s?.aprobo ? quien(s.aprobo) + ' · ' + fechaMX(String(s.aprobo_at).slice(0, 10)) : '—') : quien(m.por) + ' · ' + fechaMX(String(m.registrado_at).slice(0, 10));
    return '<tr><td>' + fechas + (m.es_prueba ? ' <span class="chip c-rev">prueba</span>' : '') + '</td><td class="num">' + (Math.round(-m.dias * 10) / 10) + '</td><td>' + como + '</td><td>' + aprobo + '</td>' +
      (quita ? '<td>' + (m.tipo === 'previas' ? '<button class="lnk" type="button" data-vquita="' + m.id + '">Quitar</button>' : '') + '</td>' : '') + '</tr>';
  }).join('');
  const ajustes = quita ? (r.movimientos || []).filter(m => m.tipo === 'ajuste' && !m.anulado) : [];
  return '<div class="secc">Historial de vacaciones</div><div class="tabla-w"><table class="angosta"><thead><tr><th>Fechas</th><th class="num">Días</th><th>Cómo</th><th>Aprobó / registró</th>' + (quita ? '<th></th>' : '') + '</tr></thead><tbody>' +
    (filas || '<tr><td colspan="5" class="vacio">Todavía no hay vacaciones tomadas.</td></tr>') + '</tbody></table></div>' +
    (ajustes.length ? '<div class="ayuda">Ajustes: ' + ajustes.map(m => vSigno(m.dias) + ' “' + esc(m.referencia || '') + '” <button class="lnk" type="button" data-vquita="' + m.id + '">Quitar</button>').join(' · ') + '</div>' : '');
}
function volverVac(){ if ($('vVolver')) $('vVolver').onclick = () => { location.hash = 'vacaciones_todos'; vistaVacTodos(); }; }

function filasMovVac(r){
  const hoy = r.hoy || hoyISO(), anios = r.anios || [], movs = r.movimientos || [];
  const fila = (fecha, folio, tag, cl, det, dias, disp, extra) => '<tr class="' + (extra || '') + '"><td>' + fechaMX(fecha) + '</td><td>' + folio + '</td><td><span class="tipo-mv ' + cl + '">' + tag + '</span></td>' +
    '<td>' + det + '</td><td class="num">' + vSigno(dias) + '</td><td class="num"><b>' + (disp == null ? '' : Math.round(disp * 10) / 10) + '</b></td></tr>';
  let h = '', previo = null;
  anios.forEach(a => {
    const deAnio = movs.filter(m => m.k === a.k);
    if (a.k < r.k_hoy && !deAnio.length && !a.tiene_inicial){ previo = +a.final; return; }  // años pasados sin registro (antes del arranque): no se muestran
    let acc = 0;
    if (!a.tiene_inicial && a.k >= 1){
      const carry = Math.min(0, previo || 0);
      acc = +a.base;
      h += fila(a.desde, 'Aniversario', a.k + (a.k === 1 ? ' año' : ' años'), 'm-dep', 'le tocan ' + a.ley + ' días' + (carry ? ' menos ' + (-carry) + ' de préstamo' : ''), +a.base, acc, a.desde > hoy ? 'vfut' : '');
    }
    deAnio.forEach(m => {
      acc += +m.dias;
      const folio = m.tipo === 'tomadas' || m.tipo === 'reverso' ? esc(String(m.referencia || '').replace(/^Reverso: .*/, '') || '—') : '—';
      const det = m.tipo === 'tomadas' ? 'formato aprobado por Laura' : m.tipo === 'previas' ? rangoCorto(m.fecha, m.fecha_fin || m.fecha) + ' · ' + esc(m.referencia || '') : esc(m.referencia || '');
      h += fila(m.fecha, m.tipo === 'reverso' ? 'Reverso' : m.tipo === 'inicial' ? 'Inicial' : m.tipo === 'ajuste' ? 'Ajuste' : folio,
        MOVV_TXT[m.tipo] + (m.es_prueba ? ' · prueba' : ''), MOVV_CL[m.tipo], det, +m.dias, acc, m.anulado ? 'anul' : '');
    });
    const fin = +a.final;
    if (fin > 0) h += fila(a.hasta, 'Vencidas', 'Fin de año laboral', 'm-ret', 'lo que no se tomó', -fin, 0, a.hasta >= hoy ? 'vfut' : '');
    else if (fin < 0) h += fila(a.hasta, 'Préstamo', 'Pasa al siguiente año', 'm-deu', 'se descuenta de los días nuevos', 0, fin, a.hasta >= hoy ? 'vfut' : '');
    previo = fin;
  });
  // el aniversario que viene
  const ult = anios[anios.length - 1];
  if (ult && ult.hasta >= hoy){
    const k = ult.k + 1, carry = Math.min(0, +ult.final);
    h += fila(sumaDias(ult.hasta, 1), 'Aniversario', k + (k === 1 ? ' año' : ' años'), 'm-dep', 'le tocan ' + vacLey(k) + ' días' + (carry ? ' menos ' + (-carry) + ' de préstamo' : ''), vacLey(k) + carry, vacLey(k) + carry, 'vfut');
  }
  return h || '<tr><td colspan="6" class="vacio">Sin movimientos todavía.</td></tr>';
}

/* ================= PASO 1 · PEDIR VACACIONES ================= */
const PV = { ini: null, fin: null, prev: null, exc: false, con: 'laura', mot: '', prueba: false, t: 0 };
let atajoVac = null;  // "Hacer formato" desde Mis vacaciones: { id, ini, fin }
function vistaPedirVac(){
  const e = empPorId(yo.id);
  Object.assign(PV, { ini: sumaDias(hoyISO(), 1), fin: sumaDias(hoyISO(), 1), prev: null, exc: false, con: 'laura', mot: '', prueba: soyAdmin() });
  let h = '<div class="titulo"><h2>Pedir vacaciones</h2><div class="sub">Va directo a Laura. Con tu jefe lo hablas en persona. No lleva formato: si Laura aprueba, los días quedan apartados.</div></div>';
  if (yo.simulado){ $('vista').innerHTML = h + '<div class="vacio">Modo solo ver: no se pide nada a nombre de otra persona.</div>'; return; }
  if (!llevaVac(e)){ $('vista').innerHTML = h + '<div class="vacio">No llevas conteo de vacaciones.</div>'; return; }
  if (e && 'fecha_ingreso' in e && !e.fecha_ingreso){ $('vista').innerHTML = h + '<div class="alerta" style="max-width:560px;margin-top:14px">Todavía no está capturada tu fecha de ingreso. Pídele a Gaby que la capture (Personas).</div>'; return; }
  h += '<div class="vcaja"><div class="g2m"><div><label for="pvIni">Desde</label><input class="f" type="date" id="pvIni" value="' + PV.ini + '"></div>' +
    '<div><label for="pvFin">Hasta (último día que faltas)</label><input class="f" type="date" id="pvFin" value="' + PV.fin + '" min="' + PV.ini + '"></div></div>' +
    '<div id="pvPrev" class="vbloque"><span class="peq">Calculando…</span></div><div id="pvExc"></div>' +
    (soyAdmin() ? '<label class="check"><input type="checkbox" id="pvPrueba"' + (PV.prueba ? ' checked' : '') + '> Es prueba (solo tú la ves)</label>' : '') +
    '<div class="fila" style="margin-top:14px"><button class="btn" type="button" id="pvEnviar" disabled>Enviar a Laura</button><button class="btn l" type="button" id="pvCancelar">Cancelar</button></div>' +
    '<div class="msg oculto" id="pvMsg"></div><div class="ayuda">Se pueden pedir fechas a futuro: cada día cuenta en el año laboral en que cae. Después, cuando faltes, haces tu formato de “Falté a cuenta de vacaciones” y ahí se descuentan los días reales.</div></div>' +
    '<div class="ver">' + VERSION + '</div>';
  $('vista').innerHTML = h;
  $('pvIni').onchange = () => { PV.ini = $('pvIni').value; if (!PV.fin || PV.fin < PV.ini) $('pvFin').value = PV.fin = PV.ini; $('pvFin').min = PV.ini; prevPedir(); };
  $('pvFin').onchange = () => { PV.fin = $('pvFin').value; prevPedir(); };
  if ($('pvPrueba')) $('pvPrueba').onchange = () => { PV.prueba = $('pvPrueba').checked; };
  $('pvCancelar').onclick = () => { location.hash = 'vacaciones'; };
  $('pvEnviar').onclick = enviarPedido;
  prevPedir();
}
async function prevPedir(){
  const t = ++PV.t; PV.prev = null; botonPedir();
  if (!PV.ini || !PV.fin || PV.fin < PV.ini){ $('pvPrev').innerHTML = '<span class="peq">Revisa las fechas.</span>'; $('pvExc').innerHTML = ''; return; }
  let prev;
  try { prev = await vacPreview(yo.id, PV.ini, PV.fin, null); } catch (err){ if (t === PV.t) $('pvPrev').innerHTML = '<i class="vneg">' + esc(errVac(err)) + '</i>'; return; }
  if (t !== PV.t || !$('pvPrev')) return;
  PV.prev = prev;
  $('pvPrev').innerHTML = !+prev.dias ? '<b>0 días hábiles</b><br><span class="peq">En esas fechas no hay días hábiles (fin de semana o festivos).</span>'
    : '🌴 <b>' + nDias(prev.dias) + ' hábiles</b><br><span class="peq">' + diasQueCuentan(prev) + '</span>' + bloqueQuedan(prev, 'tu');
  pintarExcepcion($('pvExc'), prev.alcanza || !+prev.dias, PV, botonPedir);
  botonPedir();
}
// Excepcion: solo aparece si no alcanzan los dias. obj guarda exc/con/mot.
function pintarExcepcion(cont, alcanza, obj, alCambiar){
  if (alcanza){ cont.innerHTML = ''; obj.exc = false; return; }
  cont.innerHTML = '<div class="vrojo">No te alcanzan los días. Así no se puede enviar.</div>' +
    '<label class="check"><input type="checkbox" id="xExc"' + (obj.exc ? ' checked' : '') + '> <b>Pedir como excepción</b> <span class="peq">(solo si ya lo hablaste en persona)</span></label>' +
    '<div id="xCampos" class="' + (obj.exc ? '' : 'oculto') + '"><label for="xCon">Ya lo hablé en persona con</label><select class="f" id="xCon">' +
    Object.entries({ laura: 'Laura', gaby: 'Gaby', jefe: 'Mi jefe' }).map(([k, t]) => '<option value="' + k + '"' + (obj.con === k ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>' +
    '<label for="xMot">Motivo (obligatorio)</label><textarea class="f ta" id="xMot" rows="2" placeholder="Ej.: viaje familiar ya pagado">' + esc(obj.mot) + '</textarea>' +
    '<div class="ayuda">Si Laura la aprueba y te quedas en negativo, en tu siguiente aniversario se descuenta de tus días nuevos.</div></div>';
  $('xExc').onchange = () => { obj.exc = $('xExc').checked; $('xCampos').classList.toggle('oculto', !obj.exc); alCambiar(); };
  $('xCon').onchange = () => { obj.con = $('xCon').value; };
  $('xMot').oninput = () => { obj.mot = $('xMot').value; alCambiar(); };
}
function botonPedir(){
  if (!$('pvEnviar')) return;
  const p = PV.prev;
  $('pvEnviar').disabled = !p || !+p.dias || (!p.alcanza && !(PV.exc && PV.mot.trim()));
}
async function enviarPedido(){
  $('pvEnviar').disabled = true; aviso($('pvMsg'), '');
  const { data, error } = await sb.rpc('vac_pedir', { p: { fecha_inicio: PV.ini, fecha_fin: PV.fin, excepcion: PV.exc, hablado_con: PV.exc ? PV.con : null,
    motivo: PV.exc ? PV.mot.trim() : null, es_prueba: soyAdmin() && PV.prueba } });
  if (error){ botonPedir(); return aviso($('pvMsg'), errVac(error)); }
  toast('Listo: ' + nDias(data.dias) + ' enviados a Laura' + (data.excepcion ? ' (como excepción)' : '') + '.');
  location.hash = 'vacaciones';
}

/* ================= PASO 2 · página "vac" del formato de Falté (la usa js/solicitar.js) ================= */
// W.vac_pedido: id de las apartadas que usó ('' = imprevisto) · W.vacPrev: vista previa · W.vacExc: { exc, con, mot }
const vacEnFormato = () => W && W.tipo === 'ausencia' && W.justificacion === 'vacaciones' && llevaVac(empW());
function paginaVac(){
  return preg('Tus vacaciones', 'Elige las vacaciones apartadas que usaste. Si fue de improviso, también se puede.') +
    '<div id="wVacAp"><span class="peq">Cargando tus vacaciones apartadas…</span></div><div id="wVacPrev" class="vbloque"><span class="peq">Calculando…</span></div><div id="wVacExc"></div>';
}
async function enlaceVac(){
  W.vacExc = W.vacExc || { exc: false, con: 'laura', mot: '' };
  const e = empW();
  if ('fecha_ingreso' in e && !e.fecha_ingreso){
    $('wVacAp').innerHTML = '<div class="alerta">Falta la fecha de ingreso de ' + esc(e.nombre_oficial) + '. Gaby la captura en Personas; mientras, no se puede mandar este formato.</div>';
    $('wVacPrev').innerHTML = ''; W.vacPrev = null; return;
  }
  let peds = [];
  const r = await sb.from('vac_pedidos').select('id,fecha_inicio,fecha_fin,dias,estado,es_prueba').eq('empleado_id', W.para).eq('estado', 'aprobada').order('fecha_inicio');
  if (r.error){ $('wVacAp').innerHTML = '<i class="vneg">' + esc(errVac(r.error)) + '</i>'; return; }
  peds = (r.data || []).filter(p => !p.es_prueba || W.es_prueba);
  if (W.vac_pedido === undefined){  // primera vez: la que se cruza con las fechas, si hay
    const fin = W.fecha_fin || W.fecha_inicio;
    W.vac_pedido = (peds.find(p => p.fecha_inicio <= fin && p.fecha_fin >= W.fecha_inicio) || {}).id || '';
  }
  const op = (v, t, s) => '<label class="vop"><input type="radio" name="wVacP" value="' + v + '"' + (W.vac_pedido === v ? ' checked' : '') + '><span><b>' + t + '</b>' + (s ? '<small>' + s + '</small>' : '') + '</span></label>';
  $('wVacAp').innerHTML = peds.map(p => op(p.id, rangoCorto(p.fecha_inicio, p.fecha_fin) + ' · ' + nDias(p.dias) + ' apartados', p.es_prueba ? 'prueba' : 'aprobadas por Laura')).join('') +
    op('', 'No las aparté (imprevisto)', 'se revisa si te alcanzan');
  $('wVacAp').querySelectorAll('input[name=wVacP]').forEach(i => i.onchange = () => { W.vac_pedido = i.value; prevFormatoVac(); });
  prevFormatoVac();
}
async function prevFormatoVac(){
  W.vacPrev = null;
  const t = (W._vt = (W._vt || 0) + 1);
  let prev;
  try { prev = await vacPreview(W.para, W.fecha_inicio, W.fecha_fin || W.fecha_inicio, W.vac_pedido || null); }
  catch (err){ if ($('wVacPrev')) $('wVacPrev').innerHTML = '<i class="vneg">' + esc(errVac(err)) + '</i>'; return; }
  if (t !== W._vt || !$('wVacPrev')) return;
  W.vacPrev = prev;
  $('wVacPrev').innerHTML = !+prev.dias ? '<b>0 días hábiles</b><br><span class="peq">En esas fechas no hay días hábiles.</span>'
    : '🌴 <b>' + nDias(prev.dias) + ' reales</b><br><span class="peq">' + diasQueCuentan(prev) + '</span>' + bloqueQuedan(prev, W.para === yo.id ? 'tu' : 'el', 'cuando Laura apruebe el formato') +
      (W.vac_pedido ? '<span class="peq">Lo apartado que no uses se libera.</span>' : '');
  pintarExcepcion($('wVacExc'), prev.alcanza || !+prev.dias, W.vacExc, () => {});
  refrescarResumen();
}
function validaVac(){
  if (!vacEnFormato()) return null;
  const p = W.vacPrev;
  if (!p) return 'Espera a que se calculen tus días (o revisa las fechas).';
  if (!+p.dias) return 'En esas fechas no hay días hábiles.';
  if (!p.alcanza && !(W.vacExc?.exc && (W.vacExc.mot || '').trim())) return 'No te alcanzan los días: marca “Pedir como excepción” y escribe el motivo.';
  return null;
}
const vacTxtFormato = () => { const p = W.vacPrev; if (!p) return '';
  const a = (p.por_anio || [])[0];
  return nDias(p.dias) + (a ? ' · ' + (W.para === yo.id ? 'te quedan ' : 'le quedan ') + (Math.round(a.quedan * 10) / 10) + ' → ' + vNum(a.despues) : '') + (W.vacExc?.exc && !p.alcanza ? ' · excepción' : ''); };
const datosVacFormato = () => ({ pedido_id: W.vac_pedido || null, excepcion: !!(W.vacExc?.exc && !W.vacPrev?.alcanza), hablado_con: W.vacExc?.con || null, motivo: (W.vacExc?.mot || '').trim() || null });

/* ================= Bandeja: bloque de vacaciones en el detalle del formato ================= */
async function pintarVacDetalle(s){
  const cont = $('dVac'); if (!cont) return;
  const e = empPorId(s.empleado_id);
  if (!llevaVac(e)){ cont.innerHTML = '<div class="fst">Vacaciones</div><div class="ayuda">No lleva conteo de vacaciones.</div>'; return; }
  let h = '<div class="fst">Vacaciones</div>';
  if (s.vac_excepcion) h += '<div class="vrojo"><b>Excepción</b> · lo habló en persona con ' + esc(HABLO[s.vac_hablado_con] || '') + ' · “' + esc(s.vac_motivo || '') + '”</div>';
  if (s.congelada || s.corregida_por){ cont.innerHTML = h + '<div class="ayuda">' + (s.congelada ? 'Ya se descontaron' + (s.vac_dias ? ' ' + nDias(s.vac_dias) : ' los días') + ' al aprobarla Laura.' : 'Se corrigió: el descuento va en la corrección.') + '</div>'; return; }
  try {
    const prev = await vacPreview(s.empleado_id, s.fecha_inicio, s.fecha_fin, s.vac_pedido_id);
    h += '<div class="vbloque">🌴 <b>' + nDias(prev.dias) + ' hábiles</b>' + (s.vac_pedido_id ? ' <span class="peq">· usa vacaciones apartadas</span>' : ' <span class="peq">· imprevisto (no las apartó)</span>') +
      '<br><span class="peq">' + diasQueCuentan(prev) + '</span>' + bloqueQuedan(prev, 'el', 'si Laura aprueba') + '</div>' +
      '<div class="ayuda">Los días se descuentan cuando Laura aprueba este formato.</div>';
    const neg = (prev.por_anio || []).find(a => +a.despues < 0);
    if (neg) h += '<div class="alerta">Queda en <b>' + vNum(neg.despues) + ' días</b>: en su aniversario se le descuentan de sus días nuevos.</div>';
  } catch (err){ h += '<div class="ayuda">' + esc(errVac(err)) + '</div>'; }
  cont.innerHTML = h;
}

/* ================= VACACIONES DE TODOS ================= */
const VT = { filas: [], area: '', nom: '', buscar: '', sel: null, aj: 'previas' };
async function vistaVacTodos(){
  VT.sel = null;
  $('vista').innerHTML = '<div class="titulo"><h2>Vacaciones</h2></div><div class="carga">Cargando…</div>';
  const { data, error } = await sb.rpc('vac_resumen_todos', { p_sin_pruebas: sinPruebas() });
  if (error){ $('vista').querySelector('.carga').textContent = errVac(error); return; }
  const areas = misAreasJefe(), todos = veoTodasVac();
  VT.filas = (data || []).filter(x => { const e = empPorId(x.empleado_id); return e && veSim({}, e.id, e.area_id) && (todos || areas.includes(e.area_id) || e.id === yo.id); })
    .sort((a, b) => { const ea = empPorId(a.empleado_id), eb = empPorId(b.empleado_id);
      return (areaPorId(ea.area_id)?.orden || 99) - (areaPorId(eb.area_id)?.orden || 99) || ea.nombre_oficial.localeCompare(eb.nombre_oficial, 'es'); });
  pintarVacTodos();
}
function pintarVacTodos(){
  const todos = veoTodasVac();
  let h = '<div class="titulo"><h2>Vacaciones</h2><div class="sub">' + (todos ? 'Todas las áreas · por área y luego nombre' : 'Tu área') + ' · toca una persona para ver su detalle</div></div>';
  h += '<div class="barra"><input class="f buscar" id="vtBuscar" type="search" placeholder="Buscar persona…" value="' + esc(VT.buscar) + '">' +
    (todos ? '<select class="f" id="vtArea"><option value="">Todas las áreas</option>' + D.areas.map(a => '<option value="' + a.id + '"' + (VT.area === a.id ? ' selected' : '') + '>' + esc(a.nombre) + '</option>').join('') + '</select>' : '') +
    '<select class="f" id="vtNom">' + [['', 'Nómina: todos'], ['si', 'En nómina'], ['no', 'Fuera de nómina']].map(([k, t]) => '<option value="' + k + '"' + (VT.nom === k ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>' +
    '<span class="esp"></span><button class="btn chico l" type="button" id="vtPDF">📄 PDF</button><button class="btn chico l" type="button" id="vtFest">📅 Festivos</button>' + (rolesVista().some(r => ['final', 'admin'].includes(r)) ? '<button class="btn chico" type="button" id="vtPed">Por aprobar</button>' : '') + '</div>';
  h += '<div class="tabla-w"><table><thead><tr><th>Persona</th><th>Área</th><th>Ingreso</th><th class="num">Años</th><th class="num">Le tocan</th><th class="num">Tomados</th><th class="num">Quedan</th><th class="num">Apartados</th><th class="num">Quedarían</th><th>Aniversario</th></tr></thead><tbody id="vtFilas"></tbody></table></div>' +
    '<div class="ayuda">Quedan y Quedarían: + verde · 0 negro · − rojo. “Le tocan” en 0 = todavía no cumple su primer año.</div><div class="ver">' + VERSION + '</div>';
  $('vista').innerHTML = h;
  $('vtBuscar').oninput = e => { VT.buscar = e.target.value; filasVacTodos(); };
  if ($('vtArea')) $('vtArea').onchange = e => { VT.area = e.target.value; filasVacTodos(); };
  $('vtNom').onchange = e => { VT.nom = e.target.value; filasVacTodos(); };
  $('vtPDF').onclick = pdfVacTodos;
  $('vtFest').onclick = () => { location.hash = 'festivos'; };
  if ($('vtPed')) $('vtPed').onclick = () => { location.hash = 'vacpedidos'; };
  filasVacTodos();
}
// Lo que se ve con los filtros puestos (area, nomina y busqueda): lo usan la tabla y el PDF
function filasVacFiltradas(){
  const t = sinAcentos(VT.buscar);
  return VT.filas.filter(x => { const e = empPorId(x.empleado_id);
    return (!VT.area || e.area_id === VT.area) && (!VT.nom || !!e.en_nomina === (VT.nom === 'si')) && (!t || sinAcentos(e.nombre_oficial).includes(t)); });
}
// PDF: hoja limpia con la tabla en una ventana nueva; se guarda con "Guardar como PDF" del navegador
function pdfVacTodos(){
  const filas = filasVacFiltradas(), hoy = fechaMX(hoyISO());
  const filtro = [VT.area ? areaPorId(VT.area)?.nombre : 'Todas las áreas', VT.nom === 'si' ? 'En nómina' : VT.nom === 'no' ? 'Fuera de nómina' : ''].filter(Boolean).join(' · ');
  const n = v => { v = Math.round(+v * 10) / 10; return v < 0 ? '<span class="neg">−' + (-v) + '</span>' : v ? String(v) : '<span class="cero">0</span>'; };
  const cuerpo = filas.map(x => { const e = empPorId(x.empleado_id), a = esc(areaPorId(e.area_id)?.nombre || '');
    if (!x.lleva) return '<tr class="gris"><td>' + esc(e.nombre_oficial) + '</td><td>' + a + '</td><td colspan="8">no lleva conteo de vacaciones</td></tr>';
    if (!x.fecha_ingreso) return '<tr class="gris"><td>' + esc(e.nombre_oficial) + '</td><td>' + a + '</td><td colspan="8">falta su fecha de ingreso</td></tr>';
    return '<tr><td>' + esc(e.nombre_oficial) + '</td><td>' + a + '</td><td>' + fechaMX(x.fecha_ingreso) + '</td><td class="n">' + x.k + '</td><td class="n">' + n(x.le_tocan) + '</td>' +
      '<td class="n">' + n(x.tomadas) + '</td><td class="n"><b>' + n(x.quedan) + '</b></td><td class="n">' + n(x.apartados) + '</td><td class="n">' + n(+x.quedan - +x.apartados) + '</td><td>' + fechaMX(x.aniversario) + '</td></tr>'; }).join('');
  const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Vacaciones ' + esc(filtro) + ' ' + hoy.replace(/\//g, '-') + '</title>' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap"><style>' +
    '@page{size:letter landscape;margin:12mm}body{font-family:Outfit,system-ui,sans-serif;color:#5a4d3e;margin:0;padding:16px}' +
    'h1{font-size:18px;margin:0;font-weight:700}.sub{font-size:11px;color:#9a8e7f;margin:2px 0 12px}' +
    'table{border-collapse:collapse;width:100%;font-size:10px}th{background:#D9D7CE;text-align:left;font-weight:600;padding:6px 8px;border:1px solid #ECE4DF}' +
    'td{padding:6px 8px;border:1px solid #ECE4DF}tbody tr:nth-child(even) td{background:#faf9f7}.n{text-align:right}.neg{color:#b04040}.cero{color:#c4bdb1}.gris td{color:#c4bdb1}' +
    '.pie{font-size:9px;color:#9a8e7f;margin-top:8px}.bar{margin-bottom:12px}.bar button{font:inherit;font-size:13px;padding:8px 14px;border:0;border-radius:8px;background:#5a4d3e;color:#fff;cursor:pointer}' +
    '@media print{.bar{display:none}body{padding:0}}</style></head><body>' +
    '<div class="bar"><button onclick="print()">Guardar como PDF / imprimir</button></div>' +
    '<h1>Vacaciones · ' + esc(filtro) + '</h1><div class="sub">Uniterra · corte al ' + hoy + ' · ' + filas.length + (filas.length === 1 ? ' persona' : ' personas') + '</div>' +
    '<table><thead><tr><th>Persona</th><th>Área</th><th>Ingreso</th><th class="n">Años</th><th class="n">Le tocan</th><th class="n">Tomados</th><th class="n">Quedan</th><th class="n">Apartados</th><th class="n">Quedarían</th><th>Aniversario</th></tr></thead>' +
    '<tbody>' + (cuerpo || '<tr><td colspan="10">Nadie coincide con los filtros.</td></tr>') + '</tbody></table>' +
    '<div class="pie">Días del año laboral actual (de aniversario a aniversario). Quedan = días reales; Quedarían = quedan menos las vacaciones apartadas.</div>' +
    '<script>document.fonts && document.fonts.ready.then(() => setTimeout(() => print(), 300));<\/script></body></html>';
  const w = window.open('', '_blank');
  if (!w) return toast('El navegador bloqueó la ventana. Permite ventanas emergentes para esta página.', true);
  w.document.open(); w.document.write(html); w.document.close();
}
function filasVacTodos(){
  const filas = filasVacFiltradas();
  const g = n => +n ? (Math.round(+n * 10) / 10) : '<span class="cero">0</span>';
  $('vtFilas').innerHTML = filas.length ? filas.map(x => {
    const e = empPorId(x.empleado_id), area = '<td class="' + areaClase(e.area_id) + '">' + esc(areaPorId(e.area_id)?.nombre || '') + '</td>';
    if (!x.lleva) return '<tr class="vnocuenta"><td>' + esc(e.nombre_oficial) + '</td>' + area + '<td colspan="8">no lleva conteo de vacaciones</td></tr>';
    if (!x.fecha_ingreso) return '<tr class="clic' + (VT.sel === e.id ? ' sel' : '') + '" data-id="' + e.id + '"><td><b>' + esc(e.nombre_oficial) + '</b></td>' + area + '<td colspan="8" class="inact">falta su fecha de ingreso</td></tr>';
    return '<tr class="clic' + (VT.sel === e.id ? ' sel' : '') + '" data-id="' + e.id + '"><td><b>' + esc(e.nombre_oficial) + '</b></td>' + area + '<td>' + fechaMX(x.fecha_ingreso) + '</td>' +
      '<td class="num">' + x.k + '</td><td class="num">' + g(x.le_tocan) + '</td><td class="num">' + g(x.tomadas) + '</td><td class="num"><b>' + vNum(x.quedan) + '</b></td>' +
      '<td class="num">' + g(x.apartados) + '</td><td class="num">' + vNum(+x.quedan - +x.apartados) + '</td><td>' + fechaMX(x.aniversario) + '</td></tr>';
  }).join('') : '<tr><td colspan="10" class="vacio">Nadie coincide.</td></tr>';
  $('vtFilas').querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => abrirVacPanel(tr.dataset.id));
}
function abrirVacPanel(empId){
  VT.sel = empId; filasVacTodos();
  const x = VT.filas.find(f => f.empleado_id === empId), e = empPorId(empId);
  const fila = (a, b) => '<div class="r"><span>' + a + '</span><b>' + b + '</b></div>';
  let h = '<div class="cab"><div><h3>' + esc(e.nombre_oficial) + '</h3><div class="sub">' + esc(areaPorId(e.area_id)?.nombre || '') + (x.fecha_ingreso ? ' · ingreso ' + fechaMX(x.fecha_ingreso) : '') + '</div></div><button class="x" type="button" id="vpX" aria-label="Cerrar">✕</button></div>';
  if (!x.fecha_ingreso) h += '<div class="alerta" style="margin-top:12px">Falta su fecha de ingreso. Captúrala en Administración › Personas (sección Puesto y área).</div>';
  else h += '<div class="lista" style="margin-top:12px">' + fila('Le tocan este año', nDias(x.le_tocan) + (x.tiene_inicial ? ' <span class="peq">(arranque)</span>' : '')) + fila('Tomados', nDias(x.tomadas)) +
    fila('Quedan', vNum(x.quedan)) + fila('Apartados', nDias(x.apartados)) + fila('Quedarían', vNum(+x.quedan - +x.apartados)) + fila('Aniversario', fechaMX(x.aniversario)) + '</div>' +
    '<button class="btn l" type="button" id="vpMov" style="margin-top:12px">Ver movimientos</button>';
  if (x.fecha_ingreso && puedoAjustar() && !yo.simulado){
    if (!['previas', 'ajuste'].includes(VT.aj)) VT.aj = 'previas';
    const pr = VT.aj === 'previas';
    h += '<section class="fsec"><div class="fst">' + (pr ? 'Vacaciones tomadas antes' : 'Ajuste a mano') + (yoEmp().decide_solo_pruebas ? ' <span class="chip c-rev">el tuyo queda de prueba</span>' : '') + '</div>' +
      '<div class="segm" style="margin-bottom:8px"><button type="button" data-vaj="previas" class="' + (pr ? 'on' : '') + '">Tomadas antes</button><button type="button" data-vaj="ajuste" class="' + (pr ? '' : 'on') + '">Ajuste</button></div>' +
      (pr ? '<div class="g2m"><div><label class="fl" for="vpIni">Del</label><input class="f" type="date" id="vpIni"></div><div><label class="fl" for="vpFin">Al</label><input class="f" type="date" id="vpFin"></div></div>' +
            '<label class="fl" for="vpDias">Días</label><input class="f" id="vpDias" inputmode="decimal" placeholder="se cuentan solos (L–V sin festivos)"><div class="ayuda" id="vpCuenta"></div>' +
            '<label class="fl" for="vpMot">Nota (opcional)</label><input class="f" id="vpMot" placeholder="Ej.: viaje familiar">'
          : '<label class="fl" for="vpDias">Días (+ suma, − resta)</label><input class="f" id="vpDias" inputmode="decimal" placeholder="+2 o -1">' +
            '<label class="fl" for="vpMot">Motivo (obligatorio)</label><input class="f" id="vpMot" placeholder="Ej.: 2 días del año pasado (acuerdo)">') +
      '<div class="fila"><button class="btn chico" type="button" id="vpOk">Guardar</button></div>' +
      '<div class="ayuda">' + (pr ? 'Se resta del año laboral en que cayeron y sale en su historial. Si te equivocas, en “Ver movimientos” lo quitas.' : 'Queda como renglón “Ajuste” con quién y por qué. Nada se borra: si te equivocas, lo quitas en “Ver movimientos”.') + '</div></section>';
  } else h += '<div class="ayuda" style="margin-top:12px">Solo Gaby registra vacaciones tomadas antes y ajustes.</div>';
  $('panel').innerHTML = h;
  $('panel').classList.remove('oculto'); $('vista').classList.add('con-panel'); $('panel').scrollTop = 0;
  $('vpX').onclick = () => { VT.sel = null; cerrarPanel(); filasVacTodos(); };
  if ($('vpMov')) $('vpMov').onclick = () => abrirVacPersona(empId);
  $('panel').querySelectorAll('[data-vaj]').forEach(b => b.onclick = () => { VT.aj = b.dataset.vaj; abrirVacPanel(empId); });
  let cuenta = null;
  const contar = async () => {
    const ini = $('vpIni').value, fin = $('vpFin').value || ini; cuenta = null; $('vpCuenta').textContent = '';
    if (!ini || fin < ini) return;
    try { const p = await vacPreview(empId, ini, fin, null); cuenta = +p.dias;
      if (!$('vpDias').value || $('vpDias').dataset.auto === '1'){ $('vpDias').value = cuenta; $('vpDias').dataset.auto = '1'; }
      $('vpCuenta').innerHTML = nDias(cuenta) + ' hábiles · ' + diasQueCuentan(p) + ' · si fue distinto (medio día, etc.), cámbialo.';
    } catch (err){ $('vpCuenta').textContent = errVac(err); }
  };
  if ($('vpIni')){
    $('vpIni').onchange = () => { if (!$('vpFin').value || $('vpFin').value < $('vpIni').value) $('vpFin').value = $('vpIni').value; contar(); };
    $('vpFin').onchange = contar;
    $('vpDias').oninput = () => { $('vpDias').dataset.auto = ''; };
  }
  if ($('vpOk')) $('vpOk').onclick = async () => {
    const dias = parseFloat(String($('vpDias').value).replace(',', '.').replace('−', '-'));
    let r;
    if (VT.aj === 'previas'){
      if (!$('vpIni').value) return toast('Pon las fechas.', true);
      if (isNaN(dias) || dias <= 0) return toast('Escribe cuántos días fueron.', true);
      $('vpOk').disabled = true;
      r = await sb.rpc('vac_previa', { p_empleado: empId, p_ini: $('vpIni').value, p_fin: $('vpFin').value || $('vpIni').value, p_dias: cuenta !== null && dias === cuenta ? null : dias, p_nota: $('vpMot').value.trim() || null });
    } else {
      if (isNaN(dias) || !dias) return toast('Escribe los días (+ suma, − resta).', true);
      if (!$('vpMot').value.trim()) return toast('Escribe el motivo del ajuste.', true);
      $('vpOk').disabled = true;
      r = await sb.rpc('vac_ajuste', { p_empleado: empId, p_tipo: 'ajuste', p_dias: dias, p_motivo: $('vpMot').value.trim() });
    }
    if (r.error){ $('vpOk').disabled = false; return toast(errVac(r.error), true); }
    toast(VT.aj === 'previas' ? 'Registradas: ' + nDias(r.data.dias) + '.' : 'Ajuste guardado.');
    await vistaVacTodos(); abrirVacPanel(empId);
  };
}

/* ================= PASO 1 · LAURA: VACACIONES POR APROBAR ================= */
const VP = { lista: [], ver: 'pend', sel: null, cambio: false };
async function vistaVacPedidos(){
  VP.sel = null; VP.cambio = false;
  $('vista').innerHTML = '<div class="titulo"><h2>Vacaciones por aprobar</h2></div><div class="carga">Cargando…</div>';
  const { data, error } = await sb.from('vac_pedidos').select('*').order('creado_at', { ascending: false }).limit(300);
  if (error){ $('vista').querySelector('.carga').textContent = errVac(error); return; }
  const areas = misAreasJefe(), todos = veoTodasVac();
  VP.lista = (data || []).filter(p => { const e = empPorId(p.empleado_id); return e && veSim(p, e.id, e.area_id) && (todos || areas.includes(e.area_id)); });
  pintarVacPedidos();
}
function pintarVacPedidos(){
  const pend = VP.lista.filter(p => p.estado === 'espera_laura');
  let h = '<div class="titulo"><h2>Vacaciones por aprobar</h2><div class="sub">Paso 1: la persona las pide antes. Si apruebas, los días quedan apartados; se descuentan cuando apruebes su formato de “Falté”.</div></div>' +
    '<div class="barra"><div class="segm" role="group"><button type="button" data-vpv="pend" class="' + (VP.ver === 'pend' ? 'on' : '') + '">Pendientes (' + pend.length + ')</button><button type="button" data-vpv="tot" class="' + (VP.ver === 'tot' ? 'on' : '') + '">Todas</button></div></div>';
  const filas = (VP.ver === 'pend' ? pend : VP.lista).slice().sort((a, b) => (b.estado === 'espera_laura') - (a.estado === 'espera_laura') || a.fecha_inicio.localeCompare(b.fecha_inicio));
  h += '<div class="tabla-w"><table><thead><tr><th>Persona</th><th>Área</th><th>Fechas</th><th class="num">Días</th><th>Pedida</th><th>Estado</th></tr></thead><tbody>' +
    (filas.length ? filas.map(p => { const e = empPorId(p.empleado_id);
      return '<tr class="clic' + (VP.sel === p.id ? ' sel' : '') + '" data-id="' + p.id + '"><td><b>' + esc(e?.nombre_oficial || '') + '</b>' + (p.es_prueba ? ' <span class="chip c-rev">prueba</span>' : '') + '</td>' +
        '<td class="' + areaClase(e?.area_id) + '">' + esc(areaPorId(e?.area_id)?.nombre || '') + '</td><td>' + rangoCorto(p.fecha_inicio, p.fecha_fin) + (p.excepcion ? ' <span class="chip c-blk">excepción</span>' : '') + '</td>' +
        '<td class="num">' + (+p.dias) + '</td><td>' + fechaMX(p.creado_at.slice(0, 10)) + '</td><td><span class="chip ' + VAC_EST[p.estado][1] + '">' + VAC_EST[p.estado][0] + '</span></td></tr>'; }).join('')
      : '<tr><td colspan="6" class="vacio">' + (VP.ver === 'pend' ? 'Nada pendiente 🎉' : 'Todavía no hay vacaciones pedidas.') + '</td></tr>') + '</tbody></table></div><div class="ver">' + VERSION + '</div>';
  $('vista').innerHTML = h;
  $('vista').querySelectorAll('[data-vpv]').forEach(b => b.onclick = () => { VP.ver = b.dataset.vpv; pintarVacPedidos(); });
  $('vista').querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => abrirVacPedido(tr.dataset.id));
}
async function abrirVacPedido(id){
  if (VP.sel !== id) VP.cambio = false;
  VP.sel = id;
  $('vista').querySelectorAll('tr[data-id]').forEach(tr => tr.classList.toggle('sel', tr.dataset.id === id));
  const p = VP.lista.find(x => x.id === id), e = empPorId(p.empleado_id);
  const fila = (a, b) => b ? '<div class="r"><span>' + a + '</span><b>' + b + '</b></div>' : '';
  let h = '<div class="cab"><div><h3>' + esc(e?.nombre_oficial || '') + '</h3><div class="sub">Pedir vacaciones · ' + rangoCorto(p.fecha_inicio, p.fecha_fin) + ' · <span class="chip ' + VAC_EST[p.estado][1] + '">' + VAC_EST[p.estado][0] + '</span></div></div><button class="x" type="button" id="vdX" aria-label="Cerrar">✕</button></div>';
  if (p.excepcion) h += '<div class="vrojo"><b>Excepción</b> · lo habló en persona con ' + esc(HABLO[p.hablado_con] || '') + ' · “' + esc(p.motivo || '') + '”</div>';
  h += '<div id="vdPrev" class="vbloque"><span class="peq">Calculando…</span></div><div id="vdNeg"></div>';
  h += '<div class="lista" style="margin-top:8px">' + fila('Pedida', fechaMX(p.creado_at.slice(0, 10)) + (p.creado_por && p.creado_por !== p.empleado_id ? ' · capturó ' + esc(nombreCorto(empPorId(p.creado_por))) : '')) +
    fila('Decisión', p.decidido_at ? esc(nombreCorto(empPorId(p.decidido_por))) + ' · ' + fechaMX(p.decidido_at.slice(0, 10)) : '') + fila('Comentario', esc(p.comentario || '')) + '</div>';
  h += '<div class="ayuda" style="margin-top:10px">Al aprobar, los días quedan apartados (no se descuentan todavía). Su jefe las ve en “Próximos días sin trabajo”.</div>';
  const puede = puedeDecidirVac(p);
  if (puede && (p.estado === 'espera_laura' || (VP.cambio && ['aprobada', 'rechazada'].includes(p.estado)))){
    h += '<div class="fpie col"><label class="fl" for="vdCom">Comentario <span class="oblig">(obligatorio para Rechazar)</span></label><textarea class="f ta" id="vdCom" rows="2"></textarea>' +
      '<div class="bts"><button class="btn apr" type="button" data-vd="aprobada">Aprobar</button><button class="btn rech" type="button" data-vd="rechazada">Rechazar</button></div>' +
      (VP.cambio ? '<button class="lnk" type="button" id="vdNo">No cambiar nada</button>' : '') + '</div>';
  } else if (puede && ['aprobada', 'rechazada'].includes(p.estado)){
    h += '<div class="fpie"><span class="peq">Decidiste: <span class="chip ' + VAC_EST[p.estado][1] + '">' + VAC_EST[p.estado][0] + '</span></span><button class="lnk" type="button" id="vdCambiar">Cambiar decisión</button></div>';
  } else if (p.estado === 'espera_laura' && !p.es_prueba && yoEmp().decide_solo_pruebas) h += '<div class="ayuda" style="margin-top:12px">Tú solo decides vacaciones de prueba.</div>';
  $('panel').innerHTML = h;
  $('panel').classList.remove('oculto'); $('vista').classList.add('con-panel'); $('panel').scrollTop = 0;
  $('vdX').onclick = () => { VP.sel = null; cerrarPanel(); $('vista').querySelectorAll('tr.sel').forEach(tr => tr.classList.remove('sel')); };
  if ($('vdCambiar')) $('vdCambiar').onclick = () => { VP.cambio = true; abrirVacPedido(id); };
  if ($('vdNo')) $('vdNo').onclick = () => { VP.cambio = false; abrirVacPedido(id); };
  $('panel').querySelectorAll('[data-vd]').forEach(b => b.onclick = async () => {
    const dec = b.dataset.vd, com = $('vdCom').value.trim();
    if (dec === 'rechazada' && !com){ toast('Escribe el comentario: la persona necesita saber por qué.', true); return $('vdCom').focus(); }
    $('panel').querySelectorAll('[data-vd]').forEach(x => x.disabled = true);
    const { error } = await sb.rpc('vac_decidir', { p_pedido: id, p_decision: dec, p_comentario: com || null });
    if (error){ $('panel').querySelectorAll('[data-vd]').forEach(x => x.disabled = false); return toast(errVac(error), true); }
    toast(dec === 'aprobada' ? 'Aprobadas: los días quedan apartados.' : 'Rechazadas.');
    VP.cambio = false;
    await vistaVacPedidos(); abrirVacPedido(id);
  });
  try {
    const prev = await vacPreview(p.empleado_id, p.fecha_inicio, p.fecha_fin, p.id);
    if (VP.sel !== id || !$('vdPrev')) return;
    $('vdPrev').innerHTML = '🌴 <b>' + nDias(prev.dias) + ' hábiles</b><br><span class="peq">' + diasQueCuentan(prev) + '</span>' + bloqueQuedan(prev, 'el', p.estado === 'espera_laura' ? 'si apruebas' : '');
    const neg = (prev.por_anio || []).find(a => +a.despues < 0);
    if (neg && p.estado !== 'usada'){
      const sig = vacLey(neg.k + 1);
      $('vdNeg').innerHTML = '<div class="alerta"><b>Ojo:</b> queda en <b>' + vNum(neg.despues) + ' días</b>. Si los toma, en su aniversario (' + fechaMX(sumaDias(neg.hasta, 1)) + ') se le descuentan de sus días nuevos: empieza con ' + sig + ' − ' + (-neg.despues) + ' = ' + (sig + +neg.despues) + '.</div>';
    }
  } catch (err){ if ($('vdPrev')) $('vdPrev').innerHTML = '<span class="peq">' + esc(errVac(err)) + '</span>'; }
}

/* ================= FESTIVOS ================= */
const FE = { lista: [], pasados: false };
async function vistaFestivos(){
  $('vista').innerHTML = '<div class="titulo"><h2>Días festivos</h2></div><div class="carga">Cargando…</div>';
  const { data, error } = await sb.from('festivos').select('*').order('fecha');
  if (error){ $('vista').querySelector('.carga').textContent = errVac(error); return; }
  FE.lista = data || [];
  pintarFestivos();
}
function pintarFestivos(){
  const hoy = hoyISO(), edita = puedoFestivos();
  const lista = FE.lista.filter(f => FE.pasados ? f.fecha < hoy : f.fecha >= hoy);
  if (FE.pasados) lista.reverse();
  let h = '<div class="titulo"><h2>Días festivos</h2><div class="sub">No se trabaja · no cuentan como vacaciones' + (edita ? ' · los cargan Gaby y Valen' : '') + '</div></div>' +
    '<div class="barra"><div class="segm" role="group"><button type="button" data-fp="0" class="' + (FE.pasados ? '' : 'on') + '">Próximos</button><button type="button" data-fp="1" class="' + (FE.pasados ? 'on' : '') + '">Pasados</button></div></div>';
  h += '<div class="vdos"><div><div class="tabla-w"><table class="angosta"><thead><tr><th>Fecha</th><th>Día</th><th>Festivo</th><th>Origen</th>' + (edita ? '<th></th>' : '') + '</tr></thead><tbody>' +
    (lista.length ? lista.map(f => '<tr' + (f.fecha < hoy ? ' class="vnocuenta"' : '') + '><td>' + fechaMX(f.fecha) + '</td><td>' + DIAS_TXT[Calc.diaSemana(f.fecha)] + '</td><td>' + esc(f.nombre) + '</td>' +
      '<td>' + (f.origen === 'ley' ? 'Ley' : 'Uniterra') + '</td>' + (edita ? '<td><button class="lnk" type="button" data-fq="' + f.fecha + '">Quitar</button></td>' : '') + '</tr>').join('')
      : '<tr><td colspan="5" class="vacio">' + (FE.pasados ? 'No hay festivos pasados.' : 'Todavía no hay festivos cargados.') + '</td></tr>') + '</tbody></table></div></div>';
  if (edita) h += '<div class="vcaja" style="margin:0"><div class="fst">Agregar festivo</div><label for="feF">Fecha</label><input class="f" type="date" id="feF">' +
    '<label for="feN">Nombre</label><input class="f" id="feN" placeholder="Ej.: Viernes Santo"><label for="feO">Origen</label><select class="f" id="feO"><option value="uniterra">Uniterra / UdeG</option><option value="ley">Ley</option></select>' +
    '<div class="fila" style="margin-top:12px"><button class="btn chico" type="button" id="feOk">Agregar</button></div>' +
    '<div class="ayuda">Si ya hay vacaciones aprobadas que caen ese día, te aviso para que Gaby les regrese el día con un ajuste.</div></div>';
  h += '</div><div class="ver">' + VERSION + '</div>';
  $('vista').innerHTML = h;
  $('vista').querySelectorAll('[data-fp]').forEach(b => b.onclick = () => { FE.pasados = b.dataset.fp === '1'; pintarFestivos(); });
  $('vista').querySelectorAll('[data-fq]').forEach(b => b.onclick = async () => {
    if (!confirm('¿Quitar el festivo del ' + fechaMX(b.dataset.fq) + '?')) return;
    const { error } = await sb.rpc('festivo_quitar', { p_fecha: b.dataset.fq });
    if (error) return toast(errVac(error), true);
    toast('Festivo quitado.'); vistaFestivos();
  });
  if ($('feOk')) $('feOk').onclick = async () => {
    if (!$('feF').value || !$('feN').value.trim()) return toast('Pon la fecha y el nombre.', true);
    $('feOk').disabled = true;
    const { data, error } = await sb.rpc('festivo_agregar', { p_fecha: $('feF').value, p_nombre: $('feN').value.trim(), p_origen: $('feO').value });
    if (error){ $('feOk').disabled = false; return toast(errVac(error), true); }
    toast(data?.afectadas ? 'Agregado. Ojo: ' + data.afectadas + ' vacaciones ya aprobadas incluyen ese día; regrésales el día con un ajuste.' : 'Festivo agregado.');
    vistaFestivos();
  };
}

/* ================= INICIO: cifra, columna "Próximos días sin trabajo" y avisos ================= */
async function pintarVacInicio(){
  const el = $('datoVac'); if (!el) return;
  try {
    const r = await vacResumen(yo.id), a = anioHoy(r);
    if (!r.fecha_ingreso || !a){ el.textContent = '—'; $('datoVacS').textContent = 'falta fecha de ingreso'; return; }
    const q = Math.round(+a.final * 10) / 10, ap = +a.apartados;
    el.textContent = q + (Math.abs(q) === 1 ? ' día' : ' días'); el.className = !q ? 'n0' : q > 0 ? 'verde' : 'rojo';
    $('datoVacS').textContent = ap ? 'te quedarían ' + (Math.round((q - ap) * 10) / 10) : 'te quedan';
  } catch (err){ el.textContent = faltaSQL012(err) ? 'falta SQL 012' : '—'; }
}
async function pintarLadoInicio(){
  const cont = $('vLado'); if (!cont) return;
  const hoy = hoyISO(), yoE = empPorId(yo.id);
  const [fes, peds] = await Promise.all([
    sb.from('festivos').select('fecha,nombre').gte('fecha', hoy).order('fecha').limit(4),
    sb.from('vac_pedidos').select('id,empleado_id,fecha_inicio,fecha_fin,dias,estado,es_prueba').gte('fecha_fin', hoy).in('estado', ['espera_laura', 'aprobada']).order('fecha_inicio').limit(80)
  ]);
  if (fes.error && faltaSQL012(fes.error)){ cont.innerHTML = '<b class="vlt">📆 Próximos días sin trabajo</b><div class="ayuda">Falta correr el SQL 012 en Supabase.</div>'; return; }
  const todas = (peds.data || []).filter(p => veSim(p, p.empleado_id));
  const mias = todas.filter(p => p.empleado_id === yo.id);
  const areas = misAreasJefe(), todos = veoTodasVac(), jefe = rolesVista().includes('jefe');
  const otros = todas.filter(p => p.empleado_id !== yo.id && p.estado === 'aprobada' && !p.es_prueba && (todos || (jefe && areas.includes(empPorId(p.empleado_id)?.area_id)))).slice(0, 6);
  const li = (a, b) => '<div class="vli"><b>' + a + '</b><span>' + b + '</span></div>';
  let h = '<b class="vlt">📆 Próximos días sin trabajo</b>';
  if (llevaVac(yoE)) h += '<div class="vlg">🌴 Tus vacaciones</div>' + (mias.length ? mias.map(p => li(rangoCorto(p.fecha_inicio, p.fecha_fin), nDias(p.dias) + ' · ' + (p.estado === 'aprobada' ? '<i class="vpos">✓ apartadas</i>' : 'espera a Laura'))).join('')
    : '<div class="vli"><span>Ninguna pedida</span><button class="lnk" type="button" id="vlPedir">Pedir</button></div>');
  h += '<div class="vlg">🎉 Festivos</div>' + ((fes.data || []).length ? fes.data.map(f => li(DIAS_TXT[Calc.diaSemana(f.fecha)] + ' ' + f.fecha.slice(8, 10) + '/' + f.fecha.slice(5, 7), esc(f.nombre))).join('') : '<div class="vli"><span>Todavía no hay cargados</span></div>');
  if (todos || (jefe && areas.length)) h += '<div class="vlg">👥 ' + (todos ? 'De vacaciones' : 'De tu área') + '</div>' + (otros.length ? otros.map(p => li(esc(nombreCorto(empPorId(p.empleado_id))), rangoCorto(p.fecha_inicio, p.fecha_fin))).join('') : '<div class="vli"><span>Nadie por ahora</span></div>');
  h += '<button class="btn chico l" type="button" id="vlTodos" style="width:100%;margin-top:12px">Ver festivos ›</button>';
  cont.innerHTML = h;
  $('vlTodos').onclick = () => { location.hash = 'festivos'; };
  if ($('vlPedir')) $('vlPedir').onclick = () => { location.hash = 'pedirvac'; };
}
async function pintarAvisosVac(){
  const caja = $('avisosVac'); if (!caja) return;
  const { data, error } = await sb.rpc('vac_sin_formato', { p_sin_pruebas: sinPruebas() });
  if (error || !data?.length){ caja.innerHTML = ''; return; }
  const otrosVeo = rolesVista().some(r => ['filtro', 'admin'].includes(r));
  const lista = data.filter(p => veSim(p, p.empleado_id) && (p.empleado_id === yo.id || otrosVeo));
  caja.innerHTML = lista.map(p => p.empleado_id === yo.id
    ? '<div class="aviso-c"><div><b>Ya pasaron tus vacaciones del ' + rangoCorto(p.fecha_inicio, p.fecha_fin) + '.</b>' + (p.es_prueba ? ' <span class="chip c-rev">prueba</span>' : '') + '<br>Haz tu formato de “Falté a cuenta de vacaciones” para que se descuenten.</div>' +
      '<button class="btn chico camb" type="button" data-vfi="' + p.id + '">Hacer formato</button></div>'
    : '<div class="aviso-c info"><div><b>' + esc(nombreCorto(empPorId(p.empleado_id))) + ' no ha hecho su formato</b> de las vacaciones del ' + rangoCorto(p.fecha_inicio, p.fecha_fin) + ' (ya pasaron). Le sale el mismo aviso en su Inicio.</div></div>').join('');
  caja.querySelectorAll('[data-vfi]').forEach(b => b.onclick = () => { const p = lista.find(x => x.id === b.dataset.vfi); atajoVac = { id: p.id, ini: p.fecha_inicio, fin: p.fecha_fin }; location.hash = 'nueva'; });
}
// Banner en "Mi bandeja" de Laura y conteo para la franja "Por decidir" (modo persona)
async function contarVacPorAprobar(){
  const { data, error } = await sb.from('vac_pedidos').select('id,empleado_id,es_prueba,estado').eq('estado', 'espera_laura');
  if (error) return 0;
  return (data || []).filter(p => veSim(p, p.empleado_id) && tocaDecidirVac(p)).length;
}
async function pintarBannerVac(){
  const caja = $('bVac'); if (!caja) return;
  const n = await contarVacPorAprobar();
  caja.innerHTML = n ? '<div class="aviso-c info"><div>🌴 <b>' + n + (n === 1 ? ' vacaciones esperan' : ' vacaciones esperan') + ' tu aprobación</b> (paso 1: apartar los días).</div><button class="btn chico" type="button" id="bVacIr">Ver vacaciones</button></div>' : '';
  if ($('bVacIr')) $('bVacIr').onclick = () => { location.hash = 'vacpedidos'; };
}

// Registrar las vistas en el enrutador de index.html
VISTAS.vacaciones = ['Mis vacaciones', vistaMisVac, 'todos'];
VISTAS.pedirvac = ['Pedir vacaciones', vistaPedirVac, 'todos'];
VISTAS.vacaciones_todos = ['Vacaciones', vistaVacTodos, 'valida'];
VISTAS.vacpedidos = ['Vacaciones por aprobar', () => { cerrarPanel(); vistaVacPedidos(); }, 'valida'];
VISTAS.festivos = ['Días festivos', vistaFestivos, 'todos'];
