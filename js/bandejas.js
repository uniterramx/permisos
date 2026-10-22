// Permisos UT · bandejas.js
// Fase 3: Mi bandeja (jefe -> Gaby -> Laura), Panel general, Corregir una solicitud (-R1) y contador de pendientes.
// Usa lo global de index.html (sb, D, yo, $, esc, toast, ...) y de solicitar.js (TIPO_TXT, JUST_TXT, opcHoras, ...).

/* ================= Catalogos ================= */
const ETAPAS = ['jefe', 'gaby', 'laura'];
const ESPERA = { jefe: 'nueva_espera_jefe', gaby: 'espera_gaby', laura: 'espera_laura' };
const DEC_TXT = { pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado', pedir_cambios: 'Pedir cambios',
  resuelto: 'Resuelto', paso_por_correccion: 'Pasó por corrección', no_aplica: '—' };
const DEC_CL = { pendiente: 'd-pend', aprobado: 'd-apr', rechazado: 'd-rech', pedir_cambios: 'd-camb', resuelto: 'd-res',
  paso_por_correccion: 'd-ppc', no_aplica: 'd-na' };
const EST_PANEL = { nueva_espera_jefe: ['Nueva - espera jefe', 'd-pend'], espera_gaby: ['Espera Gaby', 'd-pend'],
  espera_laura: ['Espera Laura', 'd-pend'], cambios_solicitados: ['Cambios solicitados', 'd-camb'], aprobada: ['Aprobada', 'd-apr'],
  rechazada: ['Rechazada', 'd-rech'], resuelta: ['Resuelta', 'd-res'], corregida: ['Corregida', 'd-ppc'] };
const TAB_TXT = { jefe: 'Aprobación del jefe', gaby: 'Filtro (Gaby)', laura: 'Aprobación final (Laura)' };
const TAB_SUB = { jefe: 'Autorizas el permiso. Si apruebas, pasa con Gaby.', gaby: 'Revisas que esté bien llenada. Si apruebas, pasa con Laura.',
  laura: 'Aprobación final. Al aprobar queda congelada (en la Fase 5 sale el PDF).' };
const SIGUE = { jefe: 'Pasan con Gaby.', gaby: 'Pasan con Laura.', laura: 'Quedan congeladas.' };

const chipDec = v => '<span class="chip ' + (DEC_CL[v] || 'd-na') + '">' + (DEC_TXT[v] || '—') + '</span>';
const chipEst = s => { const e = EST_PANEL[s.estado_global] || [s.estado_global, 'd-na']; return '<span class="chip ' + e[1] + '">' + e[0] + '</span>'; };
const chipPrueba = s => s.es_prueba ? ' <span class="chip c-rev">prueba</span>' : '';
const faltaSQL007 = err => /decidir|contar_pendientes|corregir_solicitud|corregida_por|decision_eventos|PGRST202|schema cache|does not exist/i.test((err?.message || '') + ' ' + (err?.code || ''));
const errTxt = err => faltaSQL007(err) ? 'Falta correr el SQL 007 en Supabase.' : String(err?.message || err).replace(/^.*?ERROR:\s*/, '');

/* ================= Datos ================= */
const B = { sol: [], tab: null, filtro: 'pend', buscar: '', marcadas: new Set(), conf: false, abierta: null, cambio: false, editRed: false };
const PG = { est: '', area: '', buscar: '' };
let corregirFolio = null;

async function cargarSolicitudes(soloMias){
  let q = sb.from('solicitudes').select('*, decisiones(*)').order('recibido_at', { ascending: false }).limit(1000);
  if (soloMias) q = q.eq('empleado_id', yo.id);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(s => ({ ...s, d: Object.fromEntries((s.decisiones || []).map(x => [x.etapa, x])) }));
}

/* ================= Quien decide que (espejo de puedo_decidir del SQL 007) ================= */
const yoEmp = () => empPorId(yo.id) || {};
const misAreasJefe = () => D.jefes.filter(j => j.jefe_id === yo.id).map(j => j.area_id);
function puedeDecidir(s, st){
  if (s.es_prueba) return soyAdmin();
  if (yoEmp().decide_solo_pruebas) return false;
  if (st === 'jefe') return misAreasJefe().includes(s.area_id);
  if (st === 'gaby') return (yo.roles || []).includes('filtro');
  if (st === 'laura') return (yo.roles || []).includes('final');
  return false;
}
function misEtapas(){
  const r = rolesVista(), out = [];
  if (r.includes('jefe') && (soyAdmin() || misAreasJefe().length)) out.push('jefe');
  if (r.includes('filtro')) out.push('gaby');
  if (r.includes('final')) out.push('laura');
  return out;
}
const veoBandeja = () => misEtapas().length > 0;

function filasEtapa(st){
  return B.sol.filter(s => {
    if (st === 'jefe') return s.d.jefe && s.d.jefe.decision !== 'no_aplica' && (soyAdmin() || misAreasJefe().includes(s.area_id));
    if (st === 'gaby') return !!s.d.gaby || s.d.jefe?.decision === 'pedir_cambios';
    return !!s.d.laura;
  });
}
const esPend = (s, st) => !s.corregida_por && s.estado_global === ESPERA[st];
const decDe = (s, st) => s.d[st]?.decision || 'no_aplica';
const pendMias = st => filasEtapa(st).filter(s => esPend(s, st) && puedeDecidir(s, st));
function categoria(s, st){
  if (s.corregida_por) return 'apr';
  if (esPend(s, st)) return 'pend';
  const v = decDe(s, st);
  if (['aprobado', 'resuelto', 'paso_por_correccion'].includes(v)) return 'apr';
  if (v === 'rechazado' || s.estado_global === 'rechazada') return 'rech';
  if (v === 'pedir_cambios' || s.estado_global === 'cambios_solicitados') return 'camb';
  return 'otro';
}

/* ================= Textos de una solicitud ================= */
const nomTabla = e => { if (!e) return ''; const p = e.nombre_oficial.split(' '); return p.length > 2 ? p[0] + ' ' + p[p.length - 2] : e.nombre_oficial; };
const diasTxt = s => fechaMX(s.fecha_inicio) + (s.fecha_fin !== s.fecha_inicio ? ' – ' + fechaMX(s.fecha_fin) : '');
const horTxt = s => s.horario_oficial ? s.horario_oficial.replace('-', ' a ') : '—';
const cuando = t => t ? new Date(t).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '') : '';
function queHecho(s){
  if (/^llegada/.test(s.tipo)) return 'Llegó ' + hhmm(s.hora_ref);
  if (s.tipo === 'salida_anticipada') return 'Salió ' + hhmm(s.hora_ref);
  if (['horas_extras', 'cambio_horario', 'reposicion'].includes(s.tipo)) return hhmm(s.hora_ref) + ' a ' + hhmm(s.hora_fin);
  if (s.tipo === 'ausencia'){ const n = Math.round((new Date(s.fecha_fin) - new Date(s.fecha_inicio)) / 864e5) + 1; return n + (n === 1 ? ' día' : ' días'); }
  if (s.tipo === 'omision_checado') return ({ entrada: 'Entrada', salida: 'Salida', ambas: 'Entrada y salida' })[s.que_checar] || '';
  return '';
}
function horasTxt(s){
  const n = +s.horas_calculadas;
  if (!n) return '<span class="cero">—</span>';
  return '<span class="' + (n > 0 ? 'pos' : 'neg') + '">' + (n > 0 ? '+' : '−') + Calc.fmtH(Math.abs(n)) + '</span>';
}
const proyTxt = s => { const p = D.proyectos.find(x => x.id === s.proyecto_id); return p ? (p.nombre_oficial || p.nombre_corto) : (s.comision_ref || ''); };
const detalleTxt = s => [s.texto_oficial || s.etiqueta_banco, s.motivo_cambio, s.motivo_correccion].filter(Boolean).join(' | ');
const jefeDeArea = areaId => empPorId(D.jefes.find(j => j.area_id === areaId)?.jefe_id);
function conQuien(s){
  if (s.estado_global === 'nueva_espera_jefe') return nombreCorto(jefeDeArea(s.area_id)) || '—';
  return { espera_gaby: 'Gaby', espera_laura: 'Laura' }[s.estado_global] || '—';
}
function quienPidioCambios(s){
  const d = Object.fromEntries((s.decisiones || []).map(x => [x.etapa, x]));
  for (const st of ['laura', 'gaby', 'jefe']){
    const x = d[st];
    if (x && x.decision === 'pedir_cambios') return { quien: nombreCorto(empPorId(x.decidido_por)) || TAB_TXT[st], com: x.comentario || '' };
  }
  return null;
}

/* ================= MI BANDEJA ================= */
async function vistaBandeja(){
  $('vista').innerHTML = '<div class="titulo"><h2>Mi bandeja</h2></div><div class="carga">Cargando…</div>';
  try { B.sol = await cargarSolicitudes(); }
  catch (err){ $('vista').querySelector('.carga').textContent = errTxt(err); return; }
  const ets = misEtapas();
  if (!ets.includes(B.tab)) B.tab = ets[0];
  B.filtro = 'pend'; B.buscar = ''; B.conf = false; B.abierta = null;
  preMarcar();
  pintarBandeja();
}
// F4a: al abrir, las pendientes que puedes decidir ya vienen marcadas
function preMarcar(){ B.marcadas = new Set(pendMias(B.tab).map(s => s.id)); B.conf = false; }

function pintarBandeja(){
  const ets = misEtapas(), st = B.tab;
  if (!st){ $('vista').innerHTML = '<div class="vacio">No tienes bandeja en esta vista.</div>'; return; }
  const todas = filasEtapa(st);
  const cnt = k => todas.filter(s => categoria(s, st) === k).length;
  let h = '<div class="titulo"><h2>Mi bandeja</h2><div class="sub">' + TAB_SUB[st] + '</div></div>';
  if (ets.length > 1) h += '<div class="btabs" role="tablist">' + ets.map(e => { const n = pendMias(e).length;
    return '<button type="button" role="tab" class="btab' + (e === st ? ' on' : '') + '" data-tab="' + e + '">' + TAB_TXT[e] + (n ? '<em>' + n + '</em>' : '') + '</button>'; }).join('') + '</div>';
  const tarj = [['tot', 'Total', todas.length, 'var(--cafe)'], ['apr', 'Aprobadas', cnt('apr'), 'var(--ok)'], ['pend', 'Pendientes', cnt('pend'), 'var(--rev)'],
    ['camb', 'Pedir cambios', cnt('camb'), 'var(--naranja)'], ['rech', 'Rechazadas', cnt('rech'), 'var(--rojo)']];
  h += '<div class="bloques"><div class="stats">' + tarj.map(([k, t, n, c]) => '<button type="button" class="stat k-' + k + (B.filtro === k ? ' on' : '') + '" data-filtro="' + k + '"><span><i class="pt" style="background:' + c + '"></i>' + t + '</span><b class="' + (n ? '' : 'z') + '">' + n + '</b></button>').join('') + '</div>';
  h += '<details class="pp o-res" open><summary id="bResT"></summary><div class="tabla-w"><table class="mini"><thead><tr><th>Persona</th><th>Total</th><th>Aprob.</th><th>Pend.</th><th>Cambios</th><th>Rech.</th><th>Estado</th></tr></thead><tbody id="bRes"></tbody></table></div></details>';
  h += '<div class="o-tab"><div class="barra"><input class="f buscar" id="bBuscar" type="search" placeholder="Buscar persona o folio…" value="' + esc(B.buscar) + '">' +
    '<div class="seg" role="group" aria-label="Qué ver"><button type="button" data-filtro="pend" class="' + (B.filtro === 'pend' ? 'on' : '') + '">Pendientes</button><button type="button" data-filtro="tot" class="' + (B.filtro === 'tot' ? 'on' : '') + '">Todas</button></div>' +
    '<span class="esp"></span><span class="peq">Toca una fila para ver el detalle</span></div><div id="bLote"></div>';
  const prev = st === 'gaby' ? ['jefe'] : st === 'laura' ? ['jefe', 'gaby'] : [];
  h += '<div class="tabla-w"><table><thead><tr><th>Empleado · folio</th><th>Recibido</th><th>Área</th><th>Tipo</th><th>Justificación</th><th>Día(s)</th><th>Horario oficial</th><th>Qué pasó</th><th>Horas</th>' +
    prev.map(p => '<th>Decisión ' + (p === 'jefe' ? 'jefe' : 'Gaby') + '</th>').join('') + '<th class="acc">Decisión</th><th class="acc">Comentario</th></tr></thead><tbody id="bFilas"></tbody></table></div></div></div>';
  h += '<div class="ver">' + VERSION + '</div>';
  $('vista').innerHTML = h;
  $('vista').querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { B.tab = b.dataset.tab; B.filtro = 'pend'; preMarcar(); cerrarDetalle(); pintarBandeja(); });
  $('vista').querySelectorAll('[data-filtro]').forEach(b => b.onclick = () => { B.filtro = b.dataset.filtro; B.conf = false; pintarBandeja(); });
  $('bBuscar').oninput = e => { B.buscar = e.target.value; B.conf = false; filasBandeja(); };
  filasBandeja();
}

function filasVisibles(){
  const st = B.tab, t = sinAcentos(B.buscar);
  return filasEtapa(st).filter(s => (B.filtro === 'tot' || categoria(s, st) === B.filtro) &&
    (!t || sinAcentos((empPorId(s.empleado_id)?.nombre_oficial || '') + ' ' + s.folio).includes(t)))
    .sort((a, b) => esPend(b, st) - esPend(a, st));
}

function filasBandeja(){
  const st = B.tab, filas = filasVisibles();
  const prev = st === 'gaby' ? ['jefe'] : st === 'laura' ? ['jefe', 'gaby'] : [];
  // Lote: solo las pendientes visibles que tu puedes decidir
  const pend = filas.filter(s => esPend(s, st) && puedeDecidir(s, st)), marc = pend.filter(s => B.marcadas.has(s.id));
  $('bLote').innerHTML = !pend.length ? '' : B.conf
    ? '<div class="conf"><div>Vas a <b>aprobar ' + marc.length + '</b>: ' + marc.map(s => esc(nombreCorto(empPorId(s.empleado_id))) + ' (' + esc((TIPO_TXT[s.tipo] || s.tipo).toLowerCase()) + ')').join(', ') + '. ' + SIGUE[st] + '</div>' +
      '<button class="btn chico apr" type="button" id="bLoteSi">Sí, aprobar ' + marc.length + '</button><button class="btn chico l" type="button" id="bLoteNo">Cancelar</button></div>'
    : '<div class="lote"><span><b>' + marc.length + ' de ' + pend.length + '</b> pendientes marcadas</span><button class="lnk" type="button" id="bTodas">' + (marc.length === pend.length ? 'Desmarcar todas' : 'Marcar todas') + '</button><span class="esp"></span>' +
      '<button class="btn chico apr" type="button" id="bLoteBtn"' + (marc.length ? '' : ' disabled') + '>Aprobar ' + marc.length + ' marcada' + (marc.length === 1 ? '' : 's') + '</button></div>';
  $('bFilas').innerHTML = filas.length ? filas.map(s => {
    const e = empPorId(s.empleado_id), v = decDe(s, st), dc = s.d[st], miPend = esPend(s, st) && puedeDecidir(s, st);
    const celda = s.corregida_por ? '<span class="chip d-ppc">Corregida</span>'
      : (v === 'pendiente' && !esPend(s, st)) || (!dc && st === 'gaby') ? (s.estado_global === 'cambios_solicitados' ? '<span class="chip d-camb">Cambios (jefe)</span>' : chipEst(s)) : chipDec(v);
    const com = dc?.comentario || (st !== 'jefe' && (s.d.jefe?.decision === 'pedir_cambios' || s.d.jefe?.decision === 'no_aplica') ? s.d.jefe.comentario : '') || '';
    return '<tr class="clic' + (B.abierta === s.id ? ' sel' : '') + (s.corregida_por ? ' corr' : '') + '" data-id="' + s.id + '"><td><div class="nm">' +
      (miPend ? '<input type="checkbox" data-marca="' + s.id + '"' + (B.marcadas.has(s.id) ? ' checked' : '') + ' aria-label="Marcar ' + esc(s.folio) + '">' : '<span class="ck0"></span>') +
      '<div><b>' + esc(nomTabla(e)) + '</b><small>' + esc(s.folio) + chipPrueba(s) + '</small></div></div></td>' +
      '<td>' + cuando(s.recibido_at) + '</td><td><span class="chip ' + areaClase(s.area_id) + '">' + esc(areaPorId(s.area_id)?.nombre || '') + '</span></td>' +
      '<td class="media">' + esc(TIPO_TXT[s.tipo] || s.tipo) + '</td><td class="media' + (s.justificacion ? '' : ' inact') + '">' + (s.justificacion ? esc(JUST_TXT[s.justificacion]) : '—') + '</td>' +
      '<td>' + diasTxt(s) + '</td><td>' + horTxt(s) + '</td><td>' + esc(queHecho(s)) + '</td><td class="num">' + horasTxt(s) + '</td>' +
      prev.map(p => '<td>' + chipDec(decDe(s, p)) + '</td>').join('') +
      '<td>' + celda + '</td><td class="larga' + (com ? '' : ' inact') + '"><div class="clamp" title="' + esc(com) + '">' + esc(com || '—') + '</div></td></tr>';
  }).join('') : '<tr><td colspan="13" class="vacio">' + (B.filtro === 'pend' ? 'No tienes pendientes. 🎉' : 'Nada con este filtro.') + '</td></tr>';
  // Resumen por persona: sigue el mismo filtro
  const per = new Map();
  filasEtapa(st).forEach(s => { const k = s.empleado_id; if (!per.has(k)) per.set(k, { t: 0, apr: 0, pend: 0, camb: 0, rech: 0 }); const x = per.get(k); x.t++; const c = categoria(s, st); if (c in x) x[c]++; });
  const verPer = x => B.filtro === 'tot' ? x.t > 0 : x[B.filtro] > 0;
  $('bResT').textContent = 'Resumen por persona · ' + ({ pend: 'solo quien tiene pendientes', apr: 'solo quien tiene aprobadas', camb: 'solo quien tiene cambios pedidos', rech: 'solo quien tiene rechazadas' }[B.filtro] || 'todos');
  const gente = [...per.entries()].filter(([, x]) => verPer(x)).sort((a, b) => (empPorId(a[0])?.nombre_oficial || '').localeCompare(empPorId(b[0])?.nombre_oficial || '', 'es'));
  $('bRes').innerHTML = gente.length ? gente.map(([id, x]) => '<tr><td>' + esc(empPorId(id)?.nombre_oficial || '') + '</td>' +
    [x.t, x.apr, x.pend, x.camb, x.rech].map(n => '<td class="num' + (n ? '' : ' cero') + '">' + n + '</td>').join('') +
    '<td><div class="bar">' + [[x.apr, 'var(--ok)'], [x.pend, 'var(--rev)'], [x.camb, 'var(--naranja)'], [x.rech, 'var(--rojo)']].map(([n, c]) => n ? '<i style="width:' + (n / x.t * 100) + '%;background:' + c + '"></i>' : '').join('') + '</div></td></tr>').join('')
    : '<tr><td colspan="7" class="vacio">Nadie con este filtro.</td></tr>';
  // Eventos
  $('bFilas').querySelectorAll('input[data-marca]').forEach(c => { c.onclick = e => e.stopPropagation(); c.onchange = () => { c.checked ? B.marcadas.add(c.dataset.marca) : B.marcadas.delete(c.dataset.marca); filasBandeja(); }; });
  $('bFilas').querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => abrirDetalle(tr.dataset.id, st));
  if ($('bTodas')) $('bTodas').onclick = () => { const todas = pend.every(s => B.marcadas.has(s.id)); pend.forEach(s => todas ? B.marcadas.delete(s.id) : B.marcadas.add(s.id)); filasBandeja(); };
  if ($('bLoteBtn')) $('bLoteBtn').onclick = () => { B.conf = true; filasBandeja(); };
  if ($('bLoteNo')) $('bLoteNo').onclick = () => { B.conf = false; filasBandeja(); };
  if ($('bLoteSi')) $('bLoteSi').onclick = async () => {
    $('bLoteSi').disabled = true;
    const { data, error } = await sb.rpc('decidir_lote', { p_ids: marc.map(s => s.id), p_etapa: st });
    if (error){ B.conf = false; toast('No se aprobó ninguna: ' + errTxt(error), true); return recargarBandeja(); }
    toast(data.aprobadas + ' aprobada' + (data.aprobadas === 1 ? '' : 's') + '. ' + SIGUE[st]);
    recargarBandeja();
  };
}

async function recargarBandeja(){
  try { B.sol = await cargarSolicitudes(); } catch (err){ toast(errTxt(err), true); }
  cerrarDetalle(); preMarcar(); pintarBandeja();
}

/* ================= Detalle (panel lateral) ================= */
function cerrarDetalle(){ B.abierta = null; B.cambio = false; B.editRed = false; cerrarPanel(); $('vista').querySelectorAll('tr.sel').forEach(tr => tr.classList.remove('sel')); }

function abrirDetalle(id, st, lista){
  const s = (lista || B.sol).find(x => x.id === id); if (!s) return;
  if (B.abierta !== id){ B.cambio = false; B.editRed = false; }
  B.abierta = id;
  $('vista').querySelectorAll('tr[data-id]').forEach(tr => tr.classList.toggle('sel', tr.dataset.id === id));
  const e = empPorId(s.empleado_id), v = st ? decDe(s, st) : null;
  const puede = st && puedeDecidir(s, st) && !s.congelada && !s.corregida_por && !['no_aplica', 'paso_por_correccion'].includes(v);
  const editable = st && ['gaby', 'laura'].includes(st) && puedeDecidir(s, st) && !s.congelada && !s.corregida_por;
  const fila = (a, b) => b ? '<div class="r"><span>' + a + '</span><b>' + b + '</b></div>' : '';
  let h = '<div class="cab"><div><h3>' + esc(e?.nombre_oficial || '') + '</h3><div class="sub">' + esc(s.folio) + ' · ' + chipEst(s) + chipPrueba(s) + '</div></div><button class="x" type="button" id="dX" aria-label="Cerrar">✕</button></div>';
  if (s.congelada) h += '<div class="alerta ve"><b>Congelada.</b> Laura ya la aprobó. Para cambiar algo, el empleado hace “Corregir una solicitud”.</div>';
  if (s.corregida_por) h += '<div class="alerta mo"><b>Corregida.</b> Continúa en ' + esc(B.sol.concat(lista || []).find(x => x.id === s.corregida_por)?.folio || 'su corrección') + '. Ya no avanza.</div>';
  if (s.corrige_a) h += '<div class="alerta mo">Es una corrección. No pasó por el jefe: entró directo con Gaby.<br>' + esc(s.motivo_correccion || '') + '</div>';
  h += '<section class="fsec"><div class="fst">Qué pide</div>' +
    fila('Área', '<span class="chip ' + areaClase(s.area_id) + '">' + esc(areaPorId(s.area_id)?.nombre || '') + '</span>') +
    fila('Tipo', esc(TIPO_TXT[s.tipo] || s.tipo) + (s.justificacion ? ' · ' + esc(JUST_TXT[s.justificacion]) : '')) +
    fila('Día(s)', diasTxt(s)) + fila('Horario oficial', horTxt(s)) + fila('Qué pasó', esc(queHecho(s))) +
    fila('Horas al banco', +s.horas_calculadas ? horasTxt(s) + (s.mueve === 'no' ? ' <span class="peq">(no mueve banco)</span>' : '') : '') +
    fila('Proyecto', esc(proyTxt(s))) + fila('Motivo / detalle', esc(detalleTxt(s))) + fila('Verificación', esc(s.verificacion || '')) +
    fila('Recibida', cuando(s.recibido_at) + (s.capturado_por && s.capturado_por !== s.empleado_id ? ' · capturó ' + esc(nombreCorto(empPorId(s.capturado_por))) : '')) + '</section>';
  h += '<section class="fsec"><div class="fst">Redacción para el formato<span class="esp"></span>' + (editable && !B.editRed ? '<button class="lnk" type="button" id="dEditRed">Editar</button>' : '') + '</div>' +
    (B.editRed && editable
      ? '<textarea class="f ta" id="dRedTxt" rows="4">' + esc(s.redaccion) + '</textarea><div class="fila"><button class="btn chico" type="button" id="dRedOk">Guardar redacción</button><button class="btn chico l" type="button" id="dRedNo">Cancelar</button></div><div class="ayuda">Queda registrado quién la cambió y cómo decía antes.</div>'
      : '<div class="red">' + esc(s.redaccion) + '</div>' + (s.redaccion_por ? '<div class="ayuda">Editada por ' + esc(nombreCorto(empPorId(s.redaccion_por))) + ' el ' + cuando(s.redaccion_at) + '. Antes decía: “' + esc(s.redaccion_antes || '') + '”</div>' : '')) + '</section>';
  h += '<section class="fsec"><div class="fst">Recorrido</div>' + ETAPAS.map(et => {
    const x = s.d[et];
    const quien = et === 'jefe' ? (s.es_jefe ? 'Jefe (se salta)' : 'Jefe · ' + esc(nombreCorto(jefeDeArea(s.area_id)) || '—')) : et === 'gaby' ? 'Gaby' : 'Laura';
    if (!x) return '<div class="paso"><i class="pt"></i><div class="pq"><b>' + quien + '</b><small>todavía no le llega</small></div></div>';
    return '<div class="paso"><i class="pt ' + (DEC_CL[x.decision] || '') + '"></i><div><div class="pq"><b>' + quien + '</b>' + chipDec(x.decision) +
      (x.decidido_at ? '<small>' + esc(nombreCorto(empPorId(x.decidido_por))) + (x.decidido_por ? ' · ' : '') + cuando(x.decidido_at) + '</small>' : '') + '</div>' +
      (x.comentario ? '<div class="c">' + esc(x.comentario) + '</div>' : '') + '</div></div>';
  }).join('') + '</section>';
  if (puede){
    const sig = st === 'jefe' ? 'gaby' : st === 'gaby' ? 'laura' : null;
    if (esPend(s, st) || B.cambio){
      const avanzo = !esPend(s, st) && sig && s.d[sig];
      h += '<div class="fpie col">' + (avanzo ? '<div class="alerta">Ya decidiste <b>' + DEC_TXT[v] + '</b> y pasó con ' + (sig === 'gaby' ? 'Gaby' : 'Laura') + '. Si la cambias, verá el cambio y le sale de pendientes. ¿Seguro?</div>' : '') +
        '<label class="fl" for="dCom">Comentario <span class="oblig">(obligatorio para Pedir cambios y Rechazar)</span></label><textarea class="f ta" id="dCom" rows="2" placeholder="Ej.: falta el proyecto"></textarea>' +
        '<div class="bts"><button class="btn apr" type="button" data-dec="aprobado">Aprobar</button><button class="btn camb" type="button" data-dec="pedir_cambios">Pedir cambios</button>' +
        '<button class="btn rech" type="button" data-dec="rechazado">Rechazar</button><button class="btn res chico" type="button" data-dec="resuelto" title="Cerrar como hecho; no toca banco ni PDF">Resuelto</button></div>' +
        (B.cambio ? '<button class="lnk" type="button" id="dNoCambio">No cambiar nada</button>' : '') + '</div>';
    } else if (v !== 'pendiente'){
      h += '<div class="fpie"><span class="peq">Tu decisión: ' + chipDec(v) + '</span><button class="lnk" type="button" id="dCambiar">Cambiar decisión</button></div>';
    } else h += '<div class="ayuda" style="margin-top:12px">Todavía no te toca: está como “' + (EST_PANEL[s.estado_global] || [''])[0] + '”.</div>';
  } else if (st && !s.es_prueba && yoEmp().decide_solo_pruebas){
    h += '<div class="ayuda" style="margin-top:12px">Tú solo decides solicitudes de prueba.</div>';
  }
  $('panel').innerHTML = h;
  $('panel').classList.remove('oculto'); $('vista').classList.add('con-panel');
  $('dX').onclick = cerrarDetalle;
  const re = () => abrirDetalle(id, st, lista);
  if ($('dEditRed')) $('dEditRed').onclick = () => { B.editRed = true; re(); };
  if ($('dRedNo')) $('dRedNo').onclick = () => { B.editRed = false; re(); };
  if ($('dRedOk')) $('dRedOk').onclick = async () => {
    $('dRedOk').disabled = true;
    const { error } = await sb.rpc('editar_redaccion', { p_solicitud: id, p_texto: $('dRedTxt').value });
    if (error){ $('dRedOk').disabled = false; return toast(errTxt(error), true); }
    toast('Redacción guardada.'); B.editRed = false;
    try { B.sol = await cargarSolicitudes(); } catch (err){}
    filasBandeja(); abrirDetalle(id, st);
  };
  if ($('dCambiar')) $('dCambiar').onclick = () => { B.cambio = true; re(); };
  if ($('dNoCambio')) $('dNoCambio').onclick = () => { B.cambio = false; re(); };
  $('panel').querySelectorAll('[data-dec]').forEach(b => b.onclick = async () => {
    const dec = b.dataset.dec, com = $('dCom').value.trim();
    if (['pedir_cambios', 'rechazado'].includes(dec) && !com){ toast('Escribe el comentario: el empleado necesita saber qué cambiar.', true); return $('dCom').focus(); }
    $('panel').querySelectorAll('[data-dec]').forEach(x => x.disabled = true);
    const { error } = await sb.rpc('decidir', { p_solicitud: id, p_etapa: st, p_decision: dec, p_comentario: com || null });
    if (error){ $('panel').querySelectorAll('[data-dec]').forEach(x => x.disabled = false); return toast(errTxt(error), true); }
    toast(s.folio + ': ' + DEC_TXT[dec] + (dec === 'aprobado' ? '. ' + SIGUE[st].replace('Pasan', 'Pasa').replace('Quedan congeladas', 'Quedó congelada') : ''));
    B.marcadas.delete(id);
    recargarBandeja();
  });
  $('panel').scrollTop = 0;
}

/* ================= PANEL GENERAL ================= */
async function vistaPanelGral(){
  $('vista').innerHTML = '<div class="titulo"><h2>Panel general</h2></div><div class="carga">Cargando…</div>';
  try { B.sol = await cargarSolicitudes(); }
  catch (err){ $('vista').querySelector('.carga').textContent = errTxt(err); return; }
  pintarPanelGral();
}
const GRUPO = { proc: ['nueva_espera_jefe', 'espera_gaby', 'espera_laura'], camb: ['cambios_solicitados'], apro: ['aprobada', 'resuelta'], rech: ['rechazada'] };
function pintarPanelGral(){
  const S = B.sol, n = k => S.filter(s => GRUPO[k].includes(s.estado_global)).length;
  const tarj = [['', 'Total', S.length, 'var(--cafe)'], ['proc', 'En proceso', n('proc'), 'var(--rev)'], ['camb', 'Cambios solicitados', n('camb'), 'var(--naranja)'],
    ['apro', 'Aprobadas', n('apro'), 'var(--ok)'], ['rech', 'Rechazadas', n('rech'), 'var(--rojo)']];
  let h = '<div class="titulo"><h2>Panel general</h2><div class="sub">Todas las solicitudes desde que se envían. Aquí solo se ve; se decide en “Mi bandeja”.</div></div>';
  h += '<div class="stats">' + tarj.map(([k, t, c, col]) => '<button type="button" class="stat k-' + ({ proc: 'pend', apro: 'apr' }[k] || k || 'tot') + (PG.est === k ? ' on' : '') + '" data-est="' + k + '"><span><i class="pt" style="background:' + col + '"></i>' + t + '</span><b class="' + (c ? '' : 'z') + '">' + c + '</b></button>').join('') + '</div>';
  h += '<div class="barra"><input class="f buscar" id="gBuscar" type="search" placeholder="Buscar persona o folio…" value="' + esc(PG.buscar) + '">' +
    '<select class="f" id="gArea"><option value="">Todas las áreas</option>' + D.areas.map(a => '<option value="' + a.id + '"' + (PG.area === a.id ? ' selected' : '') + '>' + esc(a.nombre) + '</option>').join('') + '</select></div>';
  h += '<div class="tabla-w"><table><thead><tr><th>Empleado · folio</th><th>Recibido</th><th>Área</th><th>Tipo</th><th>Justificación</th><th>Día(s)</th><th>Horario</th><th>Estado</th><th>Con quién</th><th>Motivo / detalle</th><th>Proyecto</th><th>Última actualización</th></tr></thead><tbody id="gFilas"></tbody></table></div>';
  h += '<div class="ver">' + VERSION + '</div>';
  $('vista').innerHTML = h;
  $('vista').querySelectorAll('[data-est]').forEach(b => b.onclick = () => { PG.est = b.dataset.est; pintarPanelGral(); });
  $('gBuscar').oninput = e => { PG.buscar = e.target.value; filasPanelGral(); };
  $('gArea').onchange = e => { PG.area = e.target.value; filasPanelGral(); };
  filasPanelGral();
}
function filasPanelGral(){
  const t = sinAcentos(PG.buscar);
  const filas = B.sol.filter(s => (!PG.est || GRUPO[PG.est].includes(s.estado_global)) && (!PG.area || s.area_id === PG.area) &&
    (!t || sinAcentos((empPorId(s.empleado_id)?.nombre_oficial || '') + ' ' + s.folio).includes(t)));
  $('gFilas').innerHTML = filas.length ? filas.map(s => {
    const det = detalleTxt(s), pr = proyTxt(s);
    return '<tr class="clic' + (B.abierta === s.id ? ' sel' : '') + '" data-id="' + s.id + '"><td><div class="nm"><div><b>' + esc(nomTabla(empPorId(s.empleado_id))) + '</b><small>' + esc(s.folio) + chipPrueba(s) + '</small></div></div></td>' +
      '<td>' + cuando(s.recibido_at) + '</td><td class="' + areaClase(s.area_id) + '">' + esc(areaPorId(s.area_id)?.nombre || '') + '</td>' +
      '<td class="media">' + esc(TIPO_TXT[s.tipo] || s.tipo) + '</td><td class="media' + (s.justificacion ? '' : ' inact') + '">' + (s.justificacion ? esc(JUST_TXT[s.justificacion]) : '—') + '</td>' +
      '<td>' + diasTxt(s) + '</td><td>' + horTxt(s) + '</td><td>' + chipEst(s) + '</td><td>' + esc(conQuien(s)) + '</td>' +
      '<td class="larga' + (det ? '' : ' inact') + '"><div class="clamp" title="' + esc(det) + '">' + esc(det || '—') + '</div></td><td class="media' + (pr ? '' : ' inact') + '"><div class="clamp">' + esc(pr || '—') + '</div></td><td>' + cuando(s.actualizado_at) + '</td></tr>';
  }).join('') : '<tr><td colspan="12" class="vacio">Nada con este filtro.</td></tr>';
  $('gFilas').querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => abrirDetalle(tr.dataset.id, null));
}

/* ================= CORREGIR UNA SOLICITUD (-R1) ================= */
const C = { paso: 0, folio: '', que: '', cambia: new Set(), v: {}, ok: false, lista: [] };
const C_PASOS = ['¿Qué solicitud corriges?', '¿Qué te pidieron cambiar?', '¿Qué cambia?', 'Revisa y envía'];
const C_OPC = o => [['fecha', o.tipo === 'ausencia' ? 'Primer día' : 'Fecha'],
  ...(o.tipo === 'ausencia' ? [['ultimo', 'Último día que faltas']] : []),
  ...(/^llegada|salida_anticipada/.test(o.tipo) ? [['hora', o.tipo === 'salida_anticipada' ? 'Hora de salida' : 'Hora de llegada']] : []),
  ...(['horas_extras', 'cambio_horario', 'reposicion'].includes(o.tipo) ? [['inicio', 'Hora de inicio'], ['fin', 'Hora de fin']] : []),
  ...(o.tipo === 'horas_extras' ? [['proyecto', 'Proyecto']] : []),
  ['texto', 'Texto del formato']];
const corrOrig = () => C.lista.find(s => s.folio === C.folio);
const folioNuevo = f => /-R(\d+)$/.test(f) ? f.replace(/-R(\d+)$/, (m, n) => '-R' + (+n + 1)) : f + '-R1';

async function vistaCorregir(){
  Object.assign(C, { paso: 0, folio: corregirFolio || '', que: '', cambia: new Set(), v: {}, ok: false, lista: [] });
  corregirFolio = null;
  $('vista').innerHTML = '<div class="carga">Cargando…</div>';
  try { C.lista = (await cargarSolicitudes(!puedeCapturar())).filter(s => !s.corregida_por); }
  catch (err){ $('vista').querySelector('.carga').textContent = errTxt(err); return; }
  C.lista.sort((a, b) => (b.estado_global === 'cambios_solicitados') - (a.estado_global === 'cambios_solicitados'));
  if (C.folio && corrOrig()) C.paso = 1; else C.folio = '';
  pintarCorregir();
}

function calcCorr(){
  const o = corrOrig(), c = C.cambia, v = C.v, out = {};
  if (['fecha', 'ultimo', 'hora', 'inicio', 'fin', 'proyecto'].some(k => c.has(k))){
    const fi = c.has('fecha') ? v.fecha : o.fecha_inicio;
    const ff = o.tipo !== 'ausencia' ? fi : c.has('ultimo') ? v.ultimo : (o.fecha_fin < fi ? fi : o.fecha_fin);
    const hr = c.has('hora') ? v.hora : c.has('inicio') ? v.inicio : (o.hora_ref ? o.hora_ref.slice(0, 5) : null);
    const hf = c.has('fin') ? v.fin : (o.hora_fin ? o.hora_fin.slice(0, 5) : null);
    const proyId = c.has('proyecto') ? v.proyecto : o.proyecto_id;
    const s = { tipo: o.tipo, justificacion: o.justificacion, fecha_inicio: fi, fecha_fin: ff, hora_ref: hr, hora_fin: hf, que_checar: o.que_checar,
      proyecto: D.proyectos.find(p => p.id === proyId)?.nombre_corto, comision_ref: o.comision_ref, texto_oficial: o.texto_oficial, notas: o.notas, motivo_cambio: o.motivo_cambio };
    const r = Calc.calcular(empPorId(o.empleado_id) || { jornada: 'TC' }, D.horarios.filter(h => h.empleado_id === o.empleado_id), s);
    Object.assign(out, { fecha_inicio: fi, fecha_fin: ff, hora_ref: hr, hora_fin: hf, proyecto_id: proyId || '', tipo: r.tipo,
      horas_calculadas: r.horas, calculo: r.calculo, horario_oficial: r.oficial ? hhmm(r.oficial.entrada) + '-' + hhmm(r.oficial.salida) : '',
      verificacion: r.verificacion?.texto || '', redaccion: r.redaccion });
  }
  if (c.has('texto') && (v.texto || '').trim()) out.redaccion = v.texto.trim();
  return out;
}
function validaCorr(){
  const p = C.paso, c = C.cambia, v = C.v, o = corrOrig();
  if (p === 0 && !o) return 'Elige la solicitud o escribe un folio que exista.';
  if (p === 1 && !C.que.trim()) return 'Escribe qué te pidieron cambiar.';
  if (p === 2){
    if (!c.size) return 'Elige al menos una cosa que cambia.';
    if (c.has('fecha') && !v.fecha) return 'Elige la fecha.';
    if (c.has('ultimo') && (v.ultimo || '') < (c.has('fecha') ? v.fecha : o.fecha_inicio)) return 'El último día no puede ser antes del primero.';
    if (c.has('inicio') && c.has('fin') && v.inicio === v.fin) return 'La hora de inicio y la de fin son iguales.';
    if (c.has('proyecto') && !v.proyecto) return 'Elige el proyecto.';
    if (c.has('texto') && !(v.texto || '').trim()) return 'Escribe el nuevo texto del formato.';
  }
  if (p === 3 && !C.ok) return 'Marca la casilla de confirmación.';
  return null;
}

function pintarCorregir(){
  const p = C.paso, o = corrOrig();
  let h = '<div class="wiz"><div class="wiz-main"><div class="prog">' + C_PASOS.map((_, i) => '<i class="' + (i <= p ? 'on' : '') + '"></i>').join('') + '</div><div class="pn">Paso ' + (p + 1) + ' de ' + C_PASOS.length + '</div><div class="wcard">';
  h += '<div class="q">' + C_PASOS[p] + '</div>';
  if (p === 0){
    h += '<div class="qs">Primero salen las que tienen cambios pedidos. Si no aparece, escribe el folio.</div><div class="opc">' +
      (C.lista.slice(0, 12).map(s => '<button type="button" class="op' + (C.folio === s.folio ? ' on' : '') + '" data-folio="' + esc(s.folio) + '"><div><b>' + esc(s.folio) + '</b>' + chipPrueba(s) +
        '<small>' + (s.empleado_id !== yo.id ? esc(nombreCorto(empPorId(s.empleado_id))) + ' · ' : '') + esc(TIPO_TXT[s.tipo] || s.tipo) + ' · ' + diasTxt(s) + '</small></div>' + chipEst(s) + '</button>').join('') || '<div class="peq">No tienes solicitudes para corregir.</div>') +
      '</div><label class="fl" for="cFolio">O escribe el folio</label><input class="f" id="cFolio" placeholder="F-ABC-2026-0001" value="' + esc(C.folio) + '" style="max-width:280px" autocapitalize="characters">';
  } else if (p === 1){
    const pc = quienPidioCambios(o);
    h += '<div class="qs">Se hereda todo lo de <b>' + esc(o.folio) + '</b>. Aquí solo dices qué te pidieron.</div>' +
      (pc ? '<div class="alerta" style="margin-bottom:12px">' + esc(pc.quien) + ' te pidió: “' + esc(pc.com) + '”</div>' : '') +
      '<textarea class="f ta" id="cQue" rows="3" placeholder="Ej.: faltaba el proyecto">' + esc(C.que) + '</textarea>';
  } else if (p === 2){
    h += '<div class="qs">Elige solo lo que cambia; lo demás se queda igual. Si cambias fecha u horas, se recalculan las horas y la redacción.</div>' +
      '<div class="wchips">' + C_OPC(o).map(([k, t]) => '<button type="button" class="wchip' + (C.cambia.has(k) ? ' on' : '') + '" data-cambia="' + k + '">' + t + '</button>').join('') + '</div>';
    const v = C.v, campo = (lbl, html) => '<div><label class="fl">' + lbl + '</label>' + html + '</div>';
    let g = '';
    if (C.cambia.has('fecha')) g += campo(o.tipo === 'ausencia' ? 'Nuevo primer día' : 'Nueva fecha', '<input class="f" type="date" id="cv_fecha" value="' + (v.fecha || '') + '">');
    if (C.cambia.has('ultimo')) g += campo('Nuevo último día', '<input class="f" type="date" id="cv_ultimo" value="' + (v.ultimo || '') + '">');
    if (C.cambia.has('hora')) g += campo('Nueva hora', '<select class="f" id="cv_hora">' + opcHoras(v.hora) + '</select>');
    if (C.cambia.has('inicio')) g += campo('Nueva hora de inicio', '<select class="f" id="cv_inicio">' + opcHoras(v.inicio) + '</select>');
    if (C.cambia.has('fin')) g += campo('Nueva hora de fin', '<select class="f" id="cv_fin">' + opcHoras(v.fin) + '</select>');
    if (C.cambia.has('proyecto')) g += campo('Proyecto', '<select class="f" id="cv_proyecto"><option value="">—</option>' + D.proyectos.filter(x => x.activo).map(x => '<option value="' + x.id + '"' + (x.id === v.proyecto ? ' selected' : '') + '>' + esc(x.nombre_corto) + '</option>').join('') + '</select>');
    if (g) h += '<div class="g2" style="margin-top:6px">' + g + '</div>';
    if (C.cambia.has('texto')) h += '<label class="fl" for="cv_texto">Nuevo texto del formato</label><textarea class="f ta" id="cv_texto" rows="3" placeholder="Si lo llenas, este texto gana sobre la redacción automática">' + esc(v.texto || '') + '</textarea>';
    h += '<div class="alerta" style="margin-top:14px">¿El error es el <b>tipo</b> o la <b>justificación</b>? Eso no se corrige: pide que la rechacen y haz una nueva.</div>';
  } else {
    const c = calcCorr(), fila = (a, b) => '<div class="r"><span>' + a + '</span><b>' + b + '</b></div>';
    const nombres = { fecha: 'fecha', ultimo: 'último día', hora: 'hora', inicio: 'hora de inicio', fin: 'hora de fin', proyecto: 'proyecto', texto: 'texto' };
    h += '<div class="qs">Así se va a ir:</div><div class="lista">' + fila('Folio nuevo', esc(folioNuevo(o.folio))) + fila('Corrige a', esc(o.folio)) +
      (o.empleado_id !== yo.id ? fila('A nombre de', esc(empPorId(o.empleado_id)?.nombre_oficial || '')) : '') +
      fila('Qué te pidieron', esc(C.que)) + fila('Qué cambia', [...C.cambia].map(k => nombres[k]).join(', ')) +
      ('horas_calculadas' in c && +c.horas_calculadas ? fila('Horas', horasTxt({ horas_calculadas: c.horas_calculadas }) + ' <span class="peq">(la corrección no mueve el banco)</span>') : '') +
      fila('Va con', 'Gaby, directo (tu jefe la ve como “Pasó por corrección”)') + '</div>' +
      '<div class="peq" style="margin-top:12px">Texto del formato:</div><div class="red">' + esc(c.redaccion || o.redaccion) + '</div>' +
      '<label class="confirma"><input type="checkbox" id="cOk"' + (C.ok ? ' checked' : '') + '><span>Confirmo que la información es verídica. Después de enviar no se edita; si algo sale mal, se vuelve a corregir.</span></label>';
  }
  h += '<div class="wnav">' + (p ? '<button class="btn l" type="button" id="cAtras">← Atrás</button>' : '<span></span>') +
    '<button class="btn" type="button" id="cSig">' + (p === 3 ? 'Enviar corrección' : 'Siguiente →') + '</button></div><div class="msg oculto" id="cMsg"></div></div></div></div>';
  $('vista').innerHTML = h;
  // Eventos
  $('vista').querySelectorAll('[data-folio]').forEach(b => b.onclick = () => { C.folio = b.dataset.folio; C.cambia = new Set(); C.v = {}; pintarCorregir(); });
  if ($('cFolio')) $('cFolio').oninput = e => { const f = e.target.value.toUpperCase().replace(/\s/g, ''); const ok = C.lista.find(s => s.folio.toUpperCase() === f); C.folio = ok ? ok.folio : ''; $('vista').querySelectorAll('[data-folio]').forEach(b => b.classList.toggle('on', b.dataset.folio === C.folio)); };
  if ($('cQue')) $('cQue').oninput = e => { C.que = e.target.value; };
  $('vista').querySelectorAll('[data-cambia]').forEach(b => b.onclick = () => {
    const k = b.dataset.cambia;
    if (C.cambia.has(k)) C.cambia.delete(k);
    else { C.cambia.add(k); const ini = { fecha: o.fecha_inicio, ultimo: o.fecha_fin, hora: o.hora_ref?.slice(0, 5), inicio: o.hora_ref?.slice(0, 5), fin: o.hora_fin?.slice(0, 5), proyecto: o.proyecto_id || '', texto: o.redaccion }; if (C.v[k] == null) C.v[k] = ini[k] || ''; }
    pintarCorregir();
  });
  ['fecha', 'ultimo', 'hora', 'inicio', 'fin', 'proyecto', 'texto'].forEach(k => { const el = $('cv_' + k); if (el) el.oninput = el.onchange = () => { C.v[k] = el.value; }; });
  if ($('cOk')) $('cOk').onchange = e => { C.ok = e.target.checked; };
  if ($('cAtras')) $('cAtras').onclick = () => { C.paso--; pintarCorregir(); };
  $('cSig').onclick = async () => {
    const err = validaCorr(); if (err) return aviso($('cMsg'), err);
    if (C.paso < 3){ C.paso++; return pintarCorregir(); }
    $('cSig').disabled = true;
    const { data, error } = await sb.rpc('corregir_solicitud', { p: { folio: o.folio, que_cambio: C.que.trim(), ...calcCorr() } });
    if (error){ $('cSig').disabled = false; return aviso($('cMsg'), 'No se pudo enviar: ' + errTxt(error)); }
    $('vista').innerHTML = '<div class="listo"><div style="font-size:44px">✅</div><h2>¡Listo, ya se mandó la corrección!</h2><div class="folio">' + esc(data.folio) + '</div>' +
      '<div class="sub">Va directo con Gaby. La ' + esc(data.corrige) + ' quedó como “Corregida”.</div>' +
      '<div class="acciones" style="justify-content:center"><button class="btn l" type="button" id="cMias">Mis solicitudes</button><button class="btn" type="button" id="cInicio">Inicio</button></div></div>';
    $('cMias').onclick = () => { location.hash = 'mias'; };
    $('cInicio').onclick = () => { location.hash = ''; };
  };
  window.scrollTo(0, 0);
}

/* ================= Inicio: contador y avisos ================= */
async function pintarExtrasInicio(){
  const card = $('vista').querySelector('[data-ir="bandeja"]');
  if (card){
    const { data, error } = await sb.rpc('contar_pendientes');
    if (!error && data){
      const ets = misEtapas(), tot = ets.reduce((a, e) => a + (data[e] || 0), 0);
      card.querySelector('span').textContent = tot ? tot + ' por decidir' : 'Nada pendiente';
      if (tot) card.insertAdjacentHTML('afterbegin', '<div class="badge">' + tot + '</div>');
      if (ets.length > 1) card.insertAdjacentHTML('beforeend', '<div class="desg">' + ets.map(e => '<i>' + { jefe: 'Jefe', gaby: 'Gaby', laura: 'Laura' }[e] + ' ' + (data[e] || 0) + '</i>').join('') + '</div>');
    } else if (error && faltaSQL007(error)) card.querySelector('span').textContent = 'falta el SQL 007';
  }
  const caja = $('avisosInicio');
  if (!caja) return;
  const { data } = await sb.from('solicitudes').select('id,folio,tipo,fecha_inicio,fecha_fin,estado_global,corregida_por,decisiones(*)')
    .eq('empleado_id', yo.id).eq('estado_global', 'cambios_solicitados').order('recibido_at', { ascending: false });
  caja.innerHTML = (data || []).filter(s => !s.corregida_por).map(s => { const pc = quienPidioCambios(s) || { quien: '', com: '' };
    return '<div class="aviso-c"><div><b>Te pidieron cambios en ' + esc(s.folio) + '</b> (' + esc((TIPO_TXT[s.tipo] || '').toLowerCase()) + ', ' + diasTxt(s) + ')<br>' + esc(pc.quien) + ': “' + esc(pc.com) + '”</div>' +
      '<button class="btn chico camb" type="button" data-corr="' + esc(s.folio) + '">Corregir</button></div>'; }).join('');
  caja.querySelectorAll('[data-corr]').forEach(b => b.onclick = () => { corregirFolio = b.dataset.corr; location.hash = 'corregir'; });
}

// Registrar las vistas en el enrutador de index.html
VISTAS.bandeja = ['Mi bandeja', () => { cerrarDetalle(); vistaBandeja(); }, 'valida'];
VISTAS.panelgral = ['Panel general', () => { cerrarDetalle(); vistaPanelGral(); }, 'valida'];
VISTAS.corregir = ['Corregir una solicitud', vistaCorregir, 'todos'];
