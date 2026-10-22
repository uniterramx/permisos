// Permisos UT · banco.js
// Fase 4: Mi banco de horas, Banco de horas (todos), ajustes a mano (Gaby) y borrar pruebas (admin).
// Usa lo global de index.html, solicitar.js y bandejas.js.

/* ================= Catalogos ================= */
const MOV_TXT = { saldo_inicial: 'Saldo inicial', deposito: 'Depósito', retiro: 'Retiro', ajuste: 'Ajuste', reverso: 'Reverso', deuda: 'Debe', reposicion: 'Repuso' };
const MOV_CL = { saldo_inicial: 'm-ini', deposito: 'm-dep', retiro: 'm-ret', ajuste: 'm-aj', reverso: 'm-rev', deuda: 'm-deu', reposicion: 'm-rep' };
const BK = { movs: [], ver: 'banco', persona: null, orden: 'nombre', buscar: '', ajuste: false, ajCuenta: 'banco' };

const hTxt = n => (n < 0 ? '−' : '') + Calc.fmtH(Math.abs(n));
const hCelda = (n, cl) => n ? '<span class="' + (cl || '') + '">' + hTxt(n) + '</span>' : '<span class="cero">0</span>';
const hSigno = n => n ? '<span class="' + (n > 0 ? 'pos' : 'neg') + '">' + (n > 0 ? '+' : '') + hTxt(n) + '</span>' : '<span class="cero">0</span>';

async function cargarMovs(empId){
  let q = sb.from('movimientos').select('*').order('id');
  if (empId) q = q.eq('empleado_id', empId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
const faltaSQL008 = err => /movimientos|cambiar_horas|ajuste_banco|borrar_pruebas|PGRST202|PGRST205|schema cache|does not exist/i.test((err?.message || '') + ' ' + (err?.code || ''));
const errBanco = err => faltaSQL008(err) ? 'Falta correr el SQL 008 en Supabase.' : errTxt(err);

// Depositos/retiros sin contar lo anulado (un movimiento revertido y su reverso se cancelan entre si)
function resumenMovs(movs){
  const anulados = new Set(movs.filter(m => m.revierte_a).map(m => m.revierte_a));
  const activos = movs.filter(m => m.tipo !== 'reverso' && !anulados.has(m.id));
  const b = activos.filter(m => m.cuenta === 'banco'), r = activos.filter(m => m.cuenta === 'reposicion');
  const pos = a => a.filter(m => +m.horas > 0).reduce((x, m) => x + +m.horas, 0);
  const neg = a => -a.filter(m => +m.horas < 0).reduce((x, m) => x + +m.horas, 0);
  const dep = pos(b), ret = neg(b), debe = neg(r), rep = pos(r);
  return { dep, ret, saldo: dep - ret, debe, rep, pend: debe - rep, ult: movs.length ? movs[movs.length - 1].registrado_at : null, anulados };
}
const fechaCorta = t => t ? new Date(t).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

/* ================= Quien ve a quien ================= */
function genteBanco(){
  const r = rolesVista();
  const todos = r.some(x => ['filtro', 'final', 'admin'].includes(x));
  const areas = misAreasJefe();
  const dir = D.areas.find(a => sinAcentos(a.nombre) === 'direccion')?.id;  // Pavel no lleva banco
  return D.empleados.filter(e => e.activo && e.area_id !== dir && (todos || areas.includes(e.area_id)));
}
const puedoAjustar = () => (yo.roles || []).includes('filtro') && rolesVista().includes('filtro');

/* ================= MI BANCO DE HORAS ================= */
async function vistaMiBanco(){
  BK.ver = 'banco'; BK.ajuste = false;
  $('vista').innerHTML = '<div class="titulo"><h2>Mi banco de horas</h2></div><div class="carga">Cargando…</div>';
  try { BK.movs = await cargarMovs(yo.id); }
  catch (err){ $('vista').querySelector('.carga').textContent = errBanco(err); return; }
  pintarPersona(yo.id, true);
}

/* ================= BANCO DE HORAS (todos) ================= */
async function vistaBancos(){
  BK.persona = null; BK.ajuste = false; BK.ver = 'banco';
  $('vista').innerHTML = '<div class="titulo"><h2>Banco de horas</h2></div><div class="carga">Cargando…</div>';
  try { BK.movs = await cargarMovs(); }
  catch (err){ $('vista').querySelector('.carga').textContent = errBanco(err); return; }
  pintarBancos();
}

function pintarBancos(){
  const gente = genteBanco().map(e => [e, resumenMovs(BK.movs.filter(m => m.empleado_id === e.id))]);
  const neg = gente.filter(g => g[1].saldo < 0).length, deben = gente.filter(g => g[1].pend > 0).length;
  const enBanco = gente.reduce((a, g) => a + g[1].saldo, 0), porReponer = gente.reduce((a, g) => a + Math.max(0, g[1].pend), 0);
  const todos = rolesVista().some(x => ['filtro', 'final', 'admin'].includes(x));
  let h = '<div class="titulo"><h2>Banco de horas</h2><div class="sub">' + (todos ? 'Todas las áreas' : 'Tu área') + ' · toca una persona para ver sus movimientos</div></div>';
  h += '<div class="stats"><div class="stat"><span>Personas</span><b>' + gente.length + '</b></div><div class="stat"><span>Horas en el banco</span><b>' + Calc.fmtH(enBanco).replace(' h', '') + '</b></div>' +
    '<div class="stat k-neg"><span>En negativo</span><b class="' + (neg ? '' : 'z') + '">' + neg + '</b></div><div class="stat k-rep"><span>Deben reponer</span><b class="' + (deben ? '' : 'z') + '">' + deben + '</b></div>' +
    '<div class="stat k-rep"><span>Horas por reponer</span><b class="' + (porReponer ? '' : 'z') + '">' + Calc.fmtH(porReponer).replace(' h', '') + '</b></div></div>';
  h += '<div class="barra"><input class="f buscar" id="kBuscar" type="search" placeholder="Buscar persona…" value="' + esc(BK.buscar) + '">' +
    '<select class="f" id="kOrden">' + [['nombre', 'Ordenar por nombre'], ['saldo', 'Saldo más bajo primero'], ['pend', 'Más pendiente de reponer']].map(([k, t]) => '<option value="' + k + '"' + (BK.orden === k ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>';
  h += '<div class="tabla-w"><table><thead><tr><th>Persona</th><th>Área</th><th>Depósitos</th><th>Retiros</th><th>Saldo</th><th class="rp">Debe</th><th class="rp">Repuesto</th><th class="rp">Pendiente</th><th>Último movimiento</th></tr></thead><tbody id="kFilas"></tbody></table></div>';
  h += '<div class="ver">' + VERSION + '</div>';
  $('vista').innerHTML = h;
  $('kBuscar').oninput = e => { BK.buscar = e.target.value; filasBancos(gente); };
  $('kOrden').onchange = e => { BK.orden = e.target.value; filasBancos(gente); };
  filasBancos(gente);
}
function filasBancos(gente){
  const t = sinAcentos(BK.buscar);
  const filas = gente.filter(([e]) => !t || sinAcentos(e.nombre_oficial).includes(t))
    .sort((a, b) => BK.orden === 'saldo' ? a[1].saldo - b[1].saldo : BK.orden === 'pend' ? b[1].pend - a[1].pend : a[0].nombre_oficial.localeCompare(b[0].nombre_oficial, 'es'));
  $('kFilas').innerHTML = filas.length ? filas.map(([e, r]) => '<tr class="clic" data-id="' + e.id + '"><td><b>' + esc(e.nombre_oficial) + '</b></td>' +
    '<td class="' + areaClase(e.area_id) + '">' + esc(areaPorId(e.area_id)?.nombre || '') + '</td>' +
    '<td class="num">' + hCelda(r.dep) + '</td><td class="num">' + hCelda(r.ret) + '</td>' +
    '<td class="num"><b>' + hCelda(r.saldo, r.saldo < 0 ? 'neg-t' : '') + '</b></td>' +
    '<td class="num">' + hCelda(r.debe, 'neg-t') + '</td><td class="num">' + hCelda(r.rep, 'pos-t') + '</td>' +
    '<td class="num"><b>' + hCelda(r.pend, r.pend > 0 ? 'neg-t' : 'pos-t') + '</b></td><td>' + fechaCorta(r.ult) + '</td></tr>').join('')
    : '<tr><td colspan="9" class="vacio">Nadie coincide.</td></tr>';
  $('kFilas').querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => { BK.persona = tr.dataset.id; BK.ver = 'banco'; BK.ajuste = false; pintarPersona(tr.dataset.id, false); window.scrollTo(0, 0); });
}

/* ================= Una persona (lo mismo para "Mi banco" y para el detalle) ================= */
function pintarPersona(empId, mio){
  const e = empPorId(empId), movs = BK.movs.filter(m => m.empleado_id === empId), r = resumenMovs(movs);
  const card = (cl, t, n, sub, numCl) => '<div class="big ' + cl + '"><span>' + t + '</span><b class="' + (n ? numCl || '' : 'zero') + '">' + hTxt(n) + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
  let h = '<div class="titulo">' + (mio ? '' : '<button class="lnk" type="button" id="kVolver">← Banco de horas</button>') +
    '<h2>' + (mio ? 'Mi banco de horas' : esc(e?.nombre_oficial || '')) + '</h2><div class="sub">' + (mio ? esc(e?.nombre_oficial || yo.nombre) + ' · ' : '') +
    '<span class="chip ' + areaClase(e?.area_id) + '">' + esc(areaPorId(e?.area_id)?.nombre || '') + '</span></div></div>';
  h += '<div class="saldo">' + card('hi', 'Saldo', r.saldo, 'disponible', r.saldo < 0 ? 'neg-t' : '') + card('dep', 'Depósitos', r.dep, 'horas extra + saldo inicial') + card('ret', 'Retiros', r.ret, 'uso de horas') + '</div>';
  h += '<div class="reph">Reposición de horas <span>· aparte: no toca el banco</span></div><div class="saldo rep">' +
    card('deu', 'Debe', r.debe) + card('rp', 'Repuesto', r.rep) +
    card('pe', 'Pendiente', r.pend, r.pend > 0 ? (mio ? 'te falta reponer' : 'le falta reponer') : r.pend < 0 ? 'repuso de más' : 'al corriente', r.pend > 0 ? 'neg-t' : 'pos-t') + '</div>';
  h += '<div class="barra"><div class="segm" role="group"><button type="button" data-kver="banco" class="' + (BK.ver === 'banco' ? 'on' : '') + '">Movimientos del banco</button><button type="button" data-kver="rep" class="' + (BK.ver === 'rep' ? 'on' : '') + '">Reposición</button></div><span class="esp"></span>' +
    (!mio && puedoAjustar() && !BK.ajuste ? '<button class="btn chico" type="button" id="kAj">+ Ajuste a mano</button>' : '') + '</div>';
  if (!mio && puedoAjustar() && BK.ajuste){
    h += '<div class="formaj"><div class="fst">Ajuste a mano · queda registrado quién lo hizo' + (yoEmp().decide_solo_pruebas ? ' (el tuyo queda como prueba)' : '') + '</div><div class="g2m">' +
      '<div><label class="fl">¿Dónde?</label><div class="segm"><button type="button" data-kaj="banco" class="' + (BK.ajCuenta === 'banco' ? 'on' : '') + '">Banco</button><button type="button" data-kaj="reposicion" class="' + (BK.ajCuenta === 'reposicion' ? 'on' : '') + '">Reposición</button></div></div>' +
      '<div><label class="fl" for="kAjH">Horas (+ suma, − resta)</label><input class="f" id="kAjH" inputmode="decimal" placeholder="+1 o -0.5"></div></div>' +
      '<label class="fl" for="kAjM">Motivo (obligatorio)</label><input class="f" id="kAjM" placeholder="Ej.: horas que repuso el sábado 8">' +
      '<div class="fila"><button class="btn chico" type="button" id="kAjOk">Guardar ajuste</button><button class="btn chico l" type="button" id="kAjNo">Cancelar</button></div>' +
      '<div class="ayuda">' + (BK.ajCuenta === 'reposicion' ? 'En reposición: + es lo que repuso, − es lo que debe.' : 'En el banco: + suma horas a su saldo, − le resta.') + '</div></div>';
  }
  const lista = movs.filter(m => (BK.ver === 'banco') === (m.cuenta === 'banco'));
  let acc = 0;
  h += '<div class="tabla-w"><table class="angosta"><thead><tr><th>Fecha</th><th>Folio</th><th>Movimiento</th><th>Referencia</th>' +
    '<th class="' + (BK.ver === 'rep' ? 'rp' : '') + '">Horas</th><th class="' + (BK.ver === 'rep' ? 'rp' : '') + '">' + (BK.ver === 'rep' ? 'Pendiente' : 'Saldo') + '</th>' + (BK.ver === 'banco' ? '<th>Bitácora</th>' : '') + '</tr></thead><tbody>';
  h += lista.length ? lista.map(m => {
    acc += BK.ver === 'rep' ? -m.horas : +m.horas;
    return '<tr class="' + (r.anulados.has(m.id) ? 'anul' : '') + '"><td>' + fechaCorta(m.registrado_at) + '</td><td>' + esc(m.folio_ref || '—') + (m.es_prueba ? ' <span class="chip c-rev">prueba</span>' : '') + '</td>' +
      '<td><span class="tipo-mv ' + MOV_CL[m.tipo] + '">' + MOV_TXT[m.tipo] + '</span></td><td>' + esc(m.referencia || '') + '</td>' +
      '<td class="num">' + hSigno(+m.horas) + '</td><td class="num"><b>' + hTxt(acc) + '</b></td>' + (BK.ver === 'banco' ? '<td class="inact">' + (m.bitacora_id ? 'impresa' : 'activa') + '</td>' : '') + '</tr>';
  }).join('') : '<tr><td colspan="7" class="vacio">Sin movimientos todavía.</td></tr>';
  h += '</tbody></table></div><div class="ayuda" style="margin-top:8px">Nada se borra: si se corrige o se cambia una decisión, el renglón original sale tachado y abajo su reverso.' + (BK.ver === 'banco' ? ' La bitácora se imprime en la Fase 5.' : '') + '</div>';
  h += '<div class="ver">' + VERSION + '</div>';
  $('vista').innerHTML = h;
  if ($('kVolver')) $('kVolver').onclick = () => { BK.persona = null; pintarBancos(); };
  $('vista').querySelectorAll('[data-kver]').forEach(b => b.onclick = () => { BK.ver = b.dataset.kver; pintarPersona(empId, mio); });
  if ($('kAj')) $('kAj').onclick = () => { BK.ajuste = true; BK.ajCuenta = BK.ver === 'rep' ? 'reposicion' : 'banco'; pintarPersona(empId, mio); };
  if ($('kAjNo')) $('kAjNo').onclick = () => { BK.ajuste = false; pintarPersona(empId, mio); };
  $('vista').querySelectorAll('[data-kaj]').forEach(b => b.onclick = () => { BK.ajCuenta = b.dataset.kaj; pintarPersona(empId, mio); });
  if ($('kAjOk')) $('kAjOk').onclick = async () => {
    const horas = parseFloat(String($('kAjH').value).replace(',', '.').replace('−', '-'));
    if (!horas) return toast('Escribe las horas (+ suma, − resta).', true);
    if (!$('kAjM').value.trim()) return toast('Escribe el motivo del ajuste.', true);
    $('kAjOk').disabled = true;
    const { error } = await sb.rpc('ajuste_banco', { p_empleado: empId, p_cuenta: BK.ajCuenta, p_horas: horas, p_motivo: $('kAjM').value.trim() });
    if (error){ $('kAjOk').disabled = false; return toast(errBanco(error), true); }
    toast('Ajuste guardado.'); BK.ajuste = false; BK.ver = BK.ajCuenta === 'reposicion' ? 'rep' : 'banco';
    try { BK.movs = await cargarMovs(); } catch (err){}
    pintarPersona(empId, mio);
  };
}

/* ================= En el detalle de la bandeja: saldo antes/despues y "Cambiar horas" ================= */
const etapaBanco = s => s.corrige_a || ['no_aplica', 'paso_por_correccion'].includes(s.d?.jefe?.decision) ? 'gaby' : 'jefe';
const horasFinales = s => +(s.horas_override ?? s.horas_calculadas ?? 0);

async function pintarBancoDetalle(s, st, refrescar){
  const caja = $('dBanco'); if (!caja) return;
  let movs;
  try { movs = await cargarMovs(s.empleado_id); } catch (err){ caja.innerHTML = '<div class="ayuda">' + esc(errBanco(err)) + '</div>'; return; }
  if (!$('dBanco')) return;
  const r = resumenMovs(movs), esRep = ['deuda', 'reposicion'].includes(s.mueve);
  const mio = movs.find(m => m.solicitud_id === s.id && m.tipo !== 'reverso' && !r.anulados.has(m.id));
  const h = horasFinales(s), signo = ['retiro', 'deuda'].includes(s.mueve) ? -Math.abs(h) : Math.abs(h);
  const et = etapaBanco(s), puedeCambiar = st === et && esPend(s, st) && puedeDecidir(s, st);
  const fila = (a, b) => '<div class="queda"><span class="sub">' + a + '</span><b>' + b + '</b></div>';
  let x = '<div class="fst">' + (esRep ? 'Reposición de horas' : 'Banco de horas') + '<span class="esp"></span>' + (puedeCambiar && !B.cambiaHoras ? '<button class="lnk" type="button" id="dChH">Cambiar horas</button>' : '') + '</div>';
  if (B.cambiaHoras && puedeCambiar){
    x += '<div class="g2m"><div><label class="fl" for="dHn">Horas que ' + (signo < 0 ? 'se descuentan' : 'se suman') + '</label><input class="f" id="dHn" inputmode="decimal" value="' + Math.abs(h) + '"></div>' +
      '<div><label class="fl" for="dHm">¿Por qué? (obligatorio)</label><input class="f" id="dHm" placeholder="Ej.: repuso media hora"></div></div>' +
      '<div class="fila"><button class="btn chico" type="button" id="dHok">Guardar horas</button><button class="btn chico l" type="button" id="dHno">Cancelar</button></div>' +
      '<div class="ayuda">El cálculo da ' + Calc.fmtH(Math.abs(+s.horas_calculadas || 0)) + '. Queda registrado quién lo cambió.</div>';
  }
  if (s.horas_override != null) x += '<div class="ayuda">Horas cambiadas por ' + esc(nombreCorto(empPorId(s.horas_override_por))) + ': “' + esc(s.horas_override_motivo || '') + '”. El cálculo daba ' + Calc.fmtH(Math.abs(+s.horas_calculadas || 0)) + '.</div>';
  if (mio){
    x += fila('Ya se registró', hSigno(+mio.horas)) + fila(esRep ? 'Pendiente de reponer hoy' : 'Saldo hoy', hTxt(esRep ? r.pend : r.saldo));
  } else {
    const hoy = esRep ? r.pend : r.saldo, queda = esRep ? hoy - signo : hoy + signo;
    x += fila(esRep ? 'Pendiente de reponer hoy' : 'Saldo hoy', '<span class="' + (hoy < 0 && !esRep ? 'neg-t' : '') + '">' + hTxt(hoy) + '</span>') +
      fila('Esta solicitud', hSigno(signo)) + fila('Queda en', '<span class="' + (queda < 0 && !esRep ? 'neg-t' : '') + '">' + hTxt(queda) + '</span>');
    if (!esRep && queda < 0 && signo < 0) x += '<div class="alerta">Con esta solicitud su saldo queda en <b>' + hTxt(queda) + '</b>. Se puede aprobar igual.</div>';
    x += '<div class="ayuda">Se registra al aprobar ' + (et === 'jefe' ? 'el jefe' : 'Gaby') + '.</div>';
  }
  caja.innerHTML = x;
  if ($('dChH')) $('dChH').onclick = () => { B.cambiaHoras = true; pintarBancoDetalle(s, st, refrescar); };
  if ($('dHno')) $('dHno').onclick = () => { B.cambiaHoras = false; pintarBancoDetalle(s, st, refrescar); };
  if ($('dHok')) $('dHok').onclick = async () => {
    const n = parseFloat(String($('dHn').value).replace(',', '.'));
    if (!(n >= 0)) return toast('Escribe las horas (un número positivo).', true);
    if (!$('dHm').value.trim()) return toast('Escribe por qué cambias las horas.', true);
    $('dHok').disabled = true;
    const { error } = await sb.rpc('cambiar_horas', { p_solicitud: s.id, p_horas: n, p_motivo: $('dHm').value.trim() });
    if (error){ $('dHok').disabled = false; return toast(errBanco(error), true); }
    toast('Horas cambiadas. Ahora decide la solicitud.'); B.cambiaHoras = false;
    refrescar();
  };
}

/* ================= Inicio: saldo en la tarjeta ================= */
async function pintarSaldoInicio(){
  const card = $('vista').querySelector('[data-ir="banco"]'); if (!card) return;
  try {
    const r = resumenMovs(await cargarMovs(yo.id));
    card.querySelector('span').textContent = 'Saldo ' + hTxt(r.saldo) + (r.pend > 0 ? ' · debes reponer ' + Calc.fmtH(r.pend) : '');
  } catch (err){ if (faltaSQL008(err)) card.querySelector('span').textContent = 'falta el SQL 008'; }
}

/* ================= Borrar pruebas (admin) ================= */
async function vistaPruebas(){
  $('vista').innerHTML = '<div class="titulo"><h2>Pruebas</h2><div class="sub">Folios PRUEBA y los movimientos del banco que hicieron. Solo tú los ves.</div></div><div class="carga">Contando…</div>';
  const { data, error } = await sb.rpc('borrar_pruebas', { p_confirmar: false });
  if (error){ $('vista').querySelector('.carga').textContent = errBanco(error); return; }
  const n = data.solicitudes + data.movimientos;
  $('vista').querySelector('.carga').outerHTML = '<div class="formaj" style="max-width:520px"><div class="lista">' +
    '<div class="r"><span>Solicitudes de prueba</span><b>' + data.solicitudes + '</b></div><div class="r"><span>Movimientos de prueba en el banco</span><b>' + data.movimientos + '</b></div></div>' +
    (n ? '<div id="pzConf"><button class="btn rech" type="button" id="pzBorrar" style="margin-top:12px">Borrar todas las pruebas</button></div>' : '<div class="ayuda">No hay pruebas que borrar.</div>') +
    '<div class="ayuda">Lo real no se toca: solo se borra lo que está marcado como prueba.</div></div>';
  if ($('pzBorrar')) $('pzBorrar').onclick = () => {
    $('pzConf').innerHTML = '<div class="alerta" style="margin-top:12px">Se van a borrar <b>' + data.solicitudes + ' solicitudes</b> y <b>' + data.movimientos + ' movimientos</b> de prueba. No se puede deshacer.</div>' +
      '<div class="fila"><button class="btn chico rech" type="button" id="pzSi">Sí, borrar</button><button class="btn chico l" type="button" id="pzNo">Cancelar</button></div>';
    $('pzNo').onclick = vistaPruebas;
    $('pzSi').onclick = async () => {
      $('pzSi').disabled = true;
      const r = await sb.rpc('borrar_pruebas', { p_confirmar: true });
      if (r.error){ $('pzSi').disabled = false; return toast(errBanco(r.error), true); }
      toast('Listo: se borraron ' + r.data.solicitudes + ' solicitudes y ' + r.data.movimientos + ' movimientos de prueba.');
      vistaPruebas();
    };
  };
}

// Registrar las vistas en el enrutador de index.html
VISTAS.banco = ['Mi banco de horas', vistaMiBanco, 'todos'];
VISTAS.bancos = ['Banco de horas', vistaBancos, 'valida'];
VISTAS.pruebas = ['Administración › Pruebas', vistaPruebas];
