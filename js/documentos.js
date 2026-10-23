// Permisos UT · documentos.js
// Fase 5: PDF de la solicitud y de la bitácora (js/pdf.js), guardado en Storage, bitácoras y "PDF guardados".
// Usa lo global de index.html, solicitar.js, bandejas.js y banco.js.

/* ================= Herramientas ================= */
const PDFLIB_URL = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
let pdfLibListo = null;
function cargarPDFLib(){
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  if (!pdfLibListo) pdfLibListo = new Promise((ok, mal) => {
    const s = document.createElement('script'); s.src = PDFLIB_URL;
    s.onload = () => ok(window.PDFLib); s.onerror = () => { pdfLibListo = null; mal(new Error('No pude cargar el generador de PDF (¿sin internet?)')); };
    document.head.appendChild(s);
  });
  return pdfLibListo;
}
const archivos = {};
async function archivo(ruta){
  if (!archivos[ruta]) archivos[ruta] = fetch(ruta).then(r => { if (!r.ok) throw new Error('No encontré ' + ruta); return r.arrayBuffer(); })
    .catch(e => { delete archivos[ruta]; throw e; });
  return archivos[ruta];
}
const faltaSQL010 = err => /bitacora|documentos|registrar_pdf|espacio_pdfs|PGRST202|PGRST205|schema cache|does not exist|Bucket not found/i.test((err?.message || '') + ' ' + (err?.code || ''));
const errDoc = err => faltaSQL010(err) ? 'Falta correr el SQL 010 en Supabase.' : errTxt(err);

const ddmmaaaa = iso => fechaMX(iso);
function ahoraTxt(){
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ' hrs';
}
const num = n => String(Math.round(+n * 100) / 100);
const conSigno = n => (+n > 0 ? '+' : '') + num(n);
const isoDe = t => { const d = new Date(t); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

function bajar(bytes, nombre){
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
// Quien guarda PDFs en Storage (espejo de puedo_subir_pdf): Gaby, Laura o admin
const puedoGuardarPDF = () => (yo.roles || []).some(r => ['filtro', 'final', 'admin'].includes(r));
const veoPDFs = () => rolesVista().some(r => ['filtro', 'final', 'admin'].includes(r));

/* ================= Solicitud ================= */
// 04_Formatos_PDF §1.1: qué círculo se marca
function horarioPDF(s){
  if (s.tipo === 'ausencia') return 'ausentar';
  if (/^llegada/.test(s.tipo)) return 'entrar';
  if (s.tipo === 'salida_anticipada') return 'salir';
  return null;
}
function conceptoPDF(s){
  if (s.tipo === 'omision_checado') return 'omision';
  if (s.tipo === 'reposicion') return 'reposicion';
  if (['horas_extras', 'cambio_horario'].includes(s.tipo)) return 'otro';
  return { vacaciones: 'vacaciones', home_office: 'homeoffice', reposicion_horas: 'reposicion', comision: 'comision' }[s.justificacion] || 'otro';
}
// Firma derecha (P2a): "Valida y firma" de la ficha; respaldo: quien valida; luego el jefe del área
const firmanteDe = e => empPorId(e?.firma_id) || empPorId(e?.valida_id) || jefeDeArea(e?.area_id) || null;

async function bytesSolicitud(s){
  const [PDFLib, plantilla] = await Promise.all([cargarPDFLib(), archivo('plantillas/solicitud.pdf')]);
  const e = empPorId(s.empleado_id), f = firmanteDe(e), h = horarioPDF(s);
  const logo = e?.en_nomina ? await archivo('icons/logo-uniterra.png') : null;
  return PDF_UT.solicitud(PDFLib, plantilla, {
    folio: s.folio, departamento: areaPorId(s.area_id)?.nombre || '', trabajador: e?.nombre_oficial || '', puesto: e?.puesto || '',
    horario: h, fecha_ausentar: ddmmaaaa(s.fecha_inicio), fecha_regreso: s.fecha_fin !== s.fecha_inicio ? ddmmaaaa(s.fecha_fin) : '',
    hora: s.hora_ref ? s.hora_ref.slice(0, 5) : '', dia: ddmmaaaa(s.fecha_inicio),
    concepto_permiso: conceptoPDF(s), concepto: s.redaccion,
    firma_nombre: f?.nombre_oficial || '', firma_puesto: f?.puesto || '', generado: ahoraTxt(), logo
  });
}
const rutaSolicitud = s => (s.es_prueba ? 'pruebas/' : '') + 'solicitudes/' + s.folio + '.pdf';

// Guarda en Storage + registra. Si ya existe (otro lo guardó antes), no pasa nada.
async function guardarPDF(tipo, id, ruta, bytes, conLogo){
  const up = await sb.storage.from('pdfs').upload(ruta, new Blob([bytes], { type: 'application/pdf' }), { contentType: 'application/pdf', upsert: false });
  if (up.error && !/exist|duplicate|409/i.test(up.error.message + ' ' + (up.error.statusCode || ''))) throw up.error;
  const r = await sb.rpc('registrar_pdf', { p_tipo: tipo, p_id: id, p_con_logo: conLogo });
  if (r.error) throw r.error;
}
async function bajarGuardado(ruta, nombre){
  const { data, error } = await sb.storage.from('pdfs').download(ruta);
  if (error) throw error;
  bajar(await data.arrayBuffer(), nombre);
}

async function descargarSolicitud(id, boton){
  if (boton) { boton.disabled = true; boton.dataset.txt = boton.dataset.txt || boton.textContent; boton.textContent = 'Generando…'; }
  try {
    const { data: s, error } = await sb.from('solicitudes').select('*').eq('id', id).limit(1).maybeSingle();
    if (error) throw error;
    if (!s || !s.congelada) throw new Error('El PDF sale cuando Laura la aprueba.');
    const ruta = rutaSolicitud(s);
    const doc = await sb.from('documentos').select('ruta').eq('ruta', ruta).limit(1);
    if (doc.error) throw doc.error;
    if (doc.data?.length) return await bajarGuardado(ruta, s.folio + '.pdf');
    const bytes = await bytesSolicitud(s);
    if (puedoGuardarPDF()) await guardarPDF('solicitud', s.id, ruta, bytes, !!empPorId(s.empleado_id)?.en_nomina);
    bajar(bytes, s.folio + '.pdf');
  } catch (err){ toast('No salió el PDF: ' + errDoc(err), true); }
  finally { if (boton){ boton.disabled = false; boton.textContent = boton.dataset.txt; } }
}

// Al aprobar Laura (una o en lote): se genera y se guarda en segundo plano
async function guardarSolicitudesAprobadas(ids){
  let mal = [];
  for (const id of ids){
    try {
      const { data: s, error } = await sb.from('solicitudes').select('*').eq('id', id).limit(1).maybeSingle();
      if (error) throw error;
      if (!s?.congelada) continue;
      const ruta = rutaSolicitud(s);
      const doc = await sb.from('documentos').select('ruta').eq('ruta', ruta).limit(1);
      if (doc.data?.length) continue;
      await guardarPDF('solicitud', s.id, ruta, await bytesSolicitud(s), !!empPorId(s.empleado_id)?.en_nomina);
    } catch (err){ console.warn('PDF', id, err); mal.push(id); }
  }
  if (mal.length) toast('No se pudo guardar ' + mal.length + ' PDF. Se genera cuando alguien lo descargue.', true);
  else if (ids.length) toast(ids.length === 1 ? 'PDF guardado.' : ids.length + ' PDF guardados.');
}

/* ================= Bitácora ================= */
const folioCorto = m => {
  if (m.tipo === 'saldo_inicial') return 'Inicial';
  if (m.tipo === 'ajuste') return 'Ajuste';
  if (m.tipo === 'reverso') return 'Reverso';
  if (/^PRUEBA/i.test(m.folio_ref || '')) return 'Prueba';
  return (String(m.folio_ref || '').match(/-(\d{3,})(?:-R\d+)?$/) || [, ''])[1];
};
function fechaBit(m, sol){
  if (!sol || ['reverso', 'ajuste', 'saldo_inicial'].includes(m.tipo)) return ddmmaaaa(isoDe(m.registrado_at));
  if (sol.fecha_fin && sol.fecha_fin !== sol.fecha_inicio)
    return sol.fecha_inicio.slice(8, 10) + '/' + sol.fecha_inicio.slice(5, 7) + ' a ' + sol.fecha_fin.slice(8, 10) + '/' + sol.fecha_fin.slice(5, 7) + '/' + sol.fecha_fin.slice(2, 4);
  return ddmmaaaa(sol.fecha_inicio);
}
const tipoBit = m => m.tipo === 'saldo_inicial' ? 'Inicial' : +m.horas < 0 ? 'Retiro' : 'Depósito';
function refBit(m, todos){
  if (m.tipo !== 'reverso') return m.referencia || '';
  const orig = todos.find(x => x.id === m.revierte_a);
  const motivo = String(m.referencia || '').replace(/^Reverso:\s*/i, '');
  return 'Reverso de ' + (orig ? folioCorto(orig) : '') + (motivo ? ' (' + motivo + ')' : '');
}

// b = bitácora cerrada, o null para la activa (de la cadena real o de prueba)
async function datosBitacora(empId, b, prueba){
  const { data: todos, error } = await sb.from('movimientos').select('*').eq('empleado_id', empId).order('id');
  if (error) throw error;
  const movs = (todos || []).filter(m => m.cuenta === 'banco' && (b ? m.bitacora_id === b.id : !m.bitacora_id && !!m.es_prueba === !!prueba));
  let cab;
  if (b) cab = { folio: b.folio, anio: b.anio, saldo_anterior: b.saldo_anterior == null ? null : +b.saldo_anterior };
  else {
    const r = await sb.rpc('bitacora_activa', { p_empleado: empId, p_prueba: !!prueba });
    if (r.error) throw r.error;
    cab = r.data;
  }
  const ids = [...new Set(movs.map(m => m.solicitud_id).filter(Boolean))];
  let sols = [];
  if (ids.length){
    const r = await sb.from('solicitudes').select('id,fecha_inicio,fecha_fin').in('id', ids);
    if (!r.error) sols = r.data || [];
  }
  let acc = cab.saldo_anterior == null ? 0 : +cab.saldo_anterior;
  const filas = movs.slice(0, 15).map(m => {
    acc += +m.horas;
    return { folio: folioCorto(m), fecha: fechaBit(m, sols.find(x => x.id === m.solicitud_id)), tipo: tipoBit(m), horas: conSigno(m.horas), proyecto: refBit(m, todos), saldo: num(acc) };
  });
  return { cab, filas, total: movs.length, saldo: acc };
}

async function bytesBitacora(empId, b, prueba){
  const e = empPorId(empId), f = firmanteDe(e);
  const [PDFLib, plantilla, x] = await Promise.all([cargarPDFLib(), archivo('plantillas/bitacora.pdf'), datosBitacora(empId, b, prueba)]);
  const logo = e?.en_nomina ? await archivo('icons/logo-uniterra.png') : null;
  const bytes = await PDF_UT.bitacora(PDFLib, plantilla, {
    folio: x.cab.folio, empleado: e?.nombre_oficial || '', departamento: areaPorId(e?.area_id)?.nombre || '', anio: String(x.cab.anio),
    saldo_anterior: x.cab.saldo_anterior == null ? '—' : num(x.cab.saldo_anterior) + ' hrs', saldo_actual: num(x.saldo) + ' hrs',
    estado: b ? 'Cerrada' : 'Activa', movimientos: x.filas, puesto: e?.puesto || '',
    firma_nombre: f?.nombre_oficial || 'Raúl Edilberto Martínez Carrazco', firma_puesto: f ? f.puesto : 'Coordinador de la Unidad de Proyectos', logo
  });
  return { bytes, folio: x.cab.folio, total: x.total };
}
const rutaBitacora = b => (b.es_prueba ? 'pruebas/' : '') + 'bitacoras/' + b.folio + '.pdf';

// Cerrada: la guardada (congelada); si aún no está guardada, se genera una vez y se guarda. Activa: siempre al momento.
async function descargarBitacora(empId, bitId, prueba, boton){
  if (boton) { boton.disabled = true; boton.dataset.txt = boton.dataset.txt || boton.textContent; boton.textContent = 'Generando…'; }
  try {
    let b = null;
    if (bitId){
      const r = await sb.from('bitacoras').select('*').eq('id', bitId).limit(1).maybeSingle();
      if (r.error) throw r.error;
      b = r.data; if (!b) throw new Error('No encontré esa bitácora');
      empId = b.empleado_id;
      const doc = await sb.from('documentos').select('ruta').eq('ruta', rutaBitacora(b)).limit(1);
      if (doc.error) throw doc.error;
      if (doc.data?.length) return await bajarGuardado(rutaBitacora(b), b.folio + '.pdf');
    }
    const x = await bytesBitacora(empId, b, prueba);
    if (b && puedoGuardarPDF()) await guardarPDF('bitacora', b.id, rutaBitacora(b), x.bytes, !!empPorId(empId)?.en_nomina);
    bajar(x.bytes, x.folio + '.pdf');
  } catch (err){ toast('No salió la bitácora: ' + errDoc(err), true); }
  finally { if (boton){ boton.disabled = false; boton.textContent = boton.dataset.txt; } }
}

/* ================= En "Mi banco" / banco de una persona: bitácora activa y cerradas ================= */
async function pintarBitacorasPersona(empId, mio){
  const caja = $('kBit'); if (!caja) return;
  const r = await sb.from('bitacoras').select('*').eq('empleado_id', empId).order('cerrada_at', { ascending: false });
  if (!$('kBit')) return;
  if (r.error){ caja.innerHTML = '<div class="ayuda">' + esc(errDoc(r.error)) + '</div>'; return; }
  const bits = r.data || [];
  const movs = BK.movs.filter(m => m.empleado_id === empId && m.cuenta === 'banco' && !m.bitacora_id);
  const cadenas = [false].concat(soyAdmin() && movs.some(m => m.es_prueba) ? [true] : []);
  const gaby = (yo.roles || []).includes('filtro') && rolesVista().includes('filtro');
  let h = '<div class="fst">Bitácora de horas adicionales<span class="esp"></span></div>';
  h += cadenas.map(pr => {
    const n = movs.filter(m => !!m.es_prueba === pr).length;
    return '<div class="bitf"><div><b>Activa' + (pr ? ' <span class="chip c-rev">prueba</span>' : '') + '</b><small>' + n + ' de 15 movimientos · se cierra sola al llegar a 15</small></div>' +
      '<div class="bitb"><button class="btn chico l" type="button" data-bitact="' + (pr ? 1 : 0) + '"' + (n ? '' : ' disabled') + '>📄 PDF</button>' +
      (!mio && gaby && n && pr === !!yoEmp().decide_solo_pruebas ? '<button class="btn chico l" type="button" data-bitcerrar>Cerrar ahora</button>' : '') + '</div></div>';
  }).join('');
  h += bits.map(b => '<div class="bitf"><div><b>' + esc(b.folio) + (b.es_prueba ? ' <span class="chip c-rev">prueba</span>' : '') + '</b><small>Cerrada ' + fechaCorta(b.cerrada_at) +
    ' · ' + b.movimientos + ' mov. · saldo ' + num(b.saldo_final) + ' h' + (b.motivo === 'manual' ? ' · a mano' : '') + '</small></div>' +
    '<div class="bitb"><button class="btn chico l" type="button" data-bitpdf="' + b.id + '">📄 PDF</button></div></div>').join('');
  h += '<div class="ayuda">Se imprime y la firman ' + (mio ? 'tú' : 'la persona') + ' y quien valida. La cerrada queda guardada tal cual.</div>';
  caja.innerHTML = h;
  // En la tabla: a qué bitácora se fue cada movimiento
  const porId = Object.fromEntries(bits.map(b => [b.id, b.folio]));
  $('vista').querySelectorAll('[data-bit]').forEach(td => { if (td.dataset.bit && porId[td.dataset.bit]) td.textContent = porId[td.dataset.bit]; });
  caja.querySelectorAll('[data-bitact]').forEach(bt => bt.onclick = () => descargarBitacora(empId, null, bt.dataset.bitact === '1', bt));
  caja.querySelectorAll('[data-bitpdf]').forEach(bt => bt.onclick = () => descargarBitacora(empId, bt.dataset.bitpdf, false, bt));
  const c = caja.querySelector('[data-bitcerrar]');
  if (c) c.onclick = () => {
    c.parentElement.innerHTML = '<span class="peq">¿Cerrarla ya? Ya no se le agregan movimientos.</span><button class="btn chico rech" type="button" id="kBitSi">Sí, cerrar</button><button class="btn chico l" type="button" id="kBitNo">No</button>';
    $('kBitNo').onclick = () => pintarBitacorasPersona(empId, mio);
    $('kBitSi').onclick = async () => {
      $('kBitSi').disabled = true;
      const x = await sb.rpc('cerrar_bitacora', { p_empleado: empId });
      if (x.error){ $('kBitSi').disabled = false; return toast(errDoc(x.error), true); }
      toast('Se cerró la ' + x.data.folio + ' (' + x.data.movimientos + ' movimientos). Ya puedes imprimirla.');
      try { BK.movs = await cargarMovs(); } catch (err){}
      pintarPersona(empId, mio);
    };
  };
}

/* ================= PDF guardados (Gaby, Laura, admin) ================= */
const MB = n => (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + ' MB';
const DOCS = { buscar: '', tipo: '' };
async function vistaPDFs(){
  if (!veoPDFs()){ location.hash = ''; return; }
  $('vista').innerHTML = '<div class="titulo"><h2>PDF guardados</h2></div><div class="carga">Cargando…</div>';
  const [esp, docs] = await Promise.all([sb.rpc('espacio_pdfs'), sb.from('documentos').select('*').order('generado_at', { ascending: false }).limit(2000)]);
  const err = esp.error || docs.error;
  if (err){ $('vista').querySelector('.carga').textContent = errDoc(err); return; }
  DOCS.lista = docs.data || []; DOCS.esp = esp.data;
  const ids = [...new Set(DOCS.lista.map(d => d.solicitud_id).filter(Boolean))], bids = [...new Set(DOCS.lista.map(d => d.bitacora_id).filter(Boolean))];
  const [s, b] = await Promise.all([ids.length ? sb.from('solicitudes').select('id,empleado_id').in('id', ids) : { data: [] }, bids.length ? sb.from('bitacoras').select('id,empleado_id').in('id', bids) : { data: [] }]);
  const quien = Object.fromEntries([...(s.data || []), ...(b.data || [])].map(x => [x.id, x.empleado_id]));
  DOCS.lista.forEach(d => { d.emp = quien[d.solicitud_id || d.bitacora_id]; d.folio = d.ruta.split('/').pop().replace(/\.pdf$/, ''); });
  pintarPDFs();
}
function pintarPDFs(){
  const e = DOCS.esp, pct = e.bytes / e.limite * 100;
  let h = '<div class="titulo"><h2>PDF guardados</h2><div class="sub">Solicitudes aprobadas por Laura y bitácoras cerradas. Se guardan tal cual se imprimieron.</div></div>';
  h += '<div class="espacio"><div class="et"><b>' + MB(e.bytes) + '</b> de 1 GB · ' + e.archivos + ' archivos</div><div class="bar"><i style="width:' + Math.min(100, Math.max(1, pct)) + '%;background:' + (pct >= 80 ? 'var(--rojo)' : 'var(--ok)') + '"></i></div>' +
    (pct >= 80 ? '<div class="alerta">Ya va en ' + Math.round(pct) + ' %. Toca pasar los años viejos a Drive (avísale a Valen).</div>' : '<div class="ayuda">Al llegar al 80 % te aviso para pasar los años viejos a Drive.</div>') + '</div>';
  h += '<div class="barra"><input class="f buscar" id="pBuscar" type="search" placeholder="Buscar persona o folio…" value="' + esc(DOCS.buscar) + '">' +
    '<div class="seg" role="group"><button type="button" data-ptipo="" class="' + (!DOCS.tipo ? 'on' : '') + '">Todos</button><button type="button" data-ptipo="solicitud" class="' + (DOCS.tipo === 'solicitud' ? 'on' : '') + '">Solicitudes</button><button type="button" data-ptipo="bitacora" class="' + (DOCS.tipo === 'bitacora' ? 'on' : '') + '">Bitácoras</button></div></div>';
  h += '<div class="tabla-w"><table class="angosta"><thead><tr><th>Persona</th><th>Folio</th><th>Tipo</th><th>Guardado</th><th>Tamaño</th></tr></thead><tbody id="pFilas"></tbody></table></div><div class="ver">' + VERSION + '</div>';
  $('vista').innerHTML = h;
  $('pBuscar').oninput = ev => { DOCS.buscar = ev.target.value; filasPDFs(); };
  $('vista').querySelectorAll('[data-ptipo]').forEach(bt => bt.onclick = () => { DOCS.tipo = bt.dataset.ptipo; pintarPDFs(); });
  filasPDFs();
}
function filasPDFs(){
  const t = sinAcentos(DOCS.buscar);
  const f = DOCS.lista.filter(d => (!DOCS.tipo || d.tipo === DOCS.tipo) && (!t || sinAcentos((empPorId(d.emp)?.nombre_oficial || '') + ' ' + d.folio).includes(t)));
  $('pFilas').innerHTML = f.length ? f.map(d => '<tr><td><div class="nm"><button class="btn chico l" type="button" data-pbajar="' + esc(d.ruta) + '" aria-label="Descargar ' + esc(d.folio) + '">📄</button><b>' + esc(empPorId(d.emp)?.nombre_oficial || '—') + '</b></div></td><td>' + esc(d.folio) + (d.es_prueba ? ' <span class="chip c-rev">prueba</span>' : '') + '</td>' +
    '<td>' + (d.tipo === 'solicitud' ? 'Solicitud' : 'Bitácora') + '</td><td>' + fechaCorta(d.generado_at) + '</td><td class="num">' + Math.round(d.bytes / 1024) + ' KB</td></tr>').join('')
    : '<tr><td colspan="5" class="vacio">' + (DOCS.lista.length ? 'Nada coincide.' : 'Todavía no hay PDF guardados.') + '</td></tr>';
  $('pFilas').querySelectorAll('[data-pbajar]').forEach(bt => bt.onclick = async () => {
    bt.disabled = true;
    try { await bajarGuardado(bt.dataset.pbajar, bt.dataset.pbajar.split('/').pop()); } catch (err){ toast(errDoc(err), true); }
    bt.disabled = false;
  });
}

/* ================= Inicio: tarjeta de PDF guardados (con aviso al 80 %) ================= */
async function pintarPDFsInicio(){
  const card = $('vista').querySelector('[data-ir="pdfs"]'); if (!card) return;
  const { data, error } = await sb.rpc('espacio_pdfs');
  if (error){ if (faltaSQL010(error)) card.querySelector('span').textContent = 'falta el SQL 010'; return; }
  const pct = data.bytes / data.limite * 100;
  card.querySelector('span').textContent = data.archivos + ' archivos · ' + MB(data.bytes) + ' de 1 GB';
  if (pct >= 80) $('avisosBanco')?.insertAdjacentHTML('afterbegin', '<div class="aviso-c"><div><b>El espacio de PDF va en ' + Math.round(pct) + ' %</b><br>Toca pasar los años viejos a Drive para que no se llene (1 GB).</div></div>');
}

// Registrar la vista en el enrutador de index.html
VISTAS.pdfs = ['PDF guardados', vistaPDFs, 'valida'];
