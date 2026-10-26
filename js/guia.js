// Permisos UT · guia.js
// Pagina "📘 Guía" (N8, wireframe aprobado docs/wireframes/guia.html): una pestaña por cada rol de la persona,
// temas que se abren de uno en uno, buscador y ventanita "¿Por qué?". Usa lo global de index.html.

const GD = t => '<span class="gdonde">' + t + '</span>';
const GUIA = {
  empleado: ['Empleado', [
    ['🔑', 'Entrar y tu PIN', 'la primera vez y si se te olvida', [
      'Elige tu área y tu nombre y escribe tu PIN de 6 números.',
      'La primera vez la app te pide elegir un PIN nuevo que solo tú sepas.',
      'Marca “Recordarme en este dispositivo” para no ponerlo cada vez (solo en tu compu o tu celular).',
      'Para cambiarlo: toca tus iniciales ' + GD('arriba a la derecha') + ' → Cambiar mi PIN.'],
      'Si te equivocas 5 veces se bloquea. Si se te olvida o se bloqueó, pídeselo a Gaby.'],
    ['＋', 'Hacer una solicitud', 'llegué tarde, falté, horas extras…', [
      'En el Inicio toca ' + GD('＋ Nueva solicitud') + ' o un atajo (Llegué tarde, Falté…).',
      'Contesta una pregunta por página y dale Siguiente. A un lado ves “Lo que llevas”: tu horario y cuántas horas se mueven.',
      'Al final revisa, marca “Confirmo que la información es verídica” y Enviar.',
      'Te da un folio (F-TUS INICIALES-2026-0001). <b>Listo: ya no tienes que hacer nada más.</b> Solo se mueve de tu jefe a Gaby y al final a Laura.',
      'Solo vuelves a entrar si te piden cambios (te sale un aviso naranja en el Inicio) o para descargar tu PDF cuando Laura la apruebe.'],
      'Una solicitud por cada cosa: si el mismo día llegaste tarde y saliste antes, son dos.'],
    ['📂', 'Ver cómo va la solicitud', 'estado y PDF', [
      'Entra a ' + GD('Mis solicitudes') + ': ahí ves si espera a tu jefe, a Gaby o a Laura.',
      'Cuando Laura la aprueba ya puedes descargar el PDF.',
      'Imprímelo, fírmalo y entrégalo como siempre.',
      'Si te piden el formato en papel llenado a mano, usa el PDF como base: ya trae todo escrito como debe ir.']],
    ['✏️', 'Si te piden cambios', 'corregir una solicitud', [
      'Te sale un aviso naranja en el Inicio con lo que te pidieron.',
      'Toca Corregir (o ' + GD('Corregir una solicitud') + ') y cambia solo lo que te pidieron.',
      'Se crea el folio -R1 y va directo con Gaby.'],
      'Después de enviar una solicitud ya no se edita: siempre se corrige así.'],
    ['⏱️', 'Tu banco de horas', 'saldo, movimientos y bitácora', [
      'Entra a ' + GD('Mi banco de horas') + ': tu saldo en verde (a favor) o rojo (debes).',
      'Las horas extras se suman cuando las aprueba tu jefe; el “Uso de horas acumuladas” las resta.',
      'La reposición va aparte: ahí ves lo que debes reponer y lo que ya repusiste. <button class="gpq" type="button" data-pq="rep">¿Por qué aparte?</button>',
      'Cada 15 movimientos se cierra tu bitácora y Gaby te la da a firmar.']],
    ['🌴', 'Vacaciones', 'pedirlas y el formato', [
      '<b>Antes:</b> toca el atajo ' + GD('🌴 Vacaciones') + ', pon desde y hasta, y envíalas. Van directo a Laura (con tu jefe lo hablas en persona).',
      'Si Laura aprueba, los días quedan <b>apartados</b>.',
      '<b>Después</b>, cuando ya faltaste: ' + GD('＋ Nueva solicitud') + ' → Falté → A cuenta de vacaciones → eliges tus vacaciones apartadas.',
      'Los días se descuentan cuando Laura aprueba ese formato. Si un día sí viniste, ese no se cuenta.',
      'Tus días los ves en ' + GD('Mis vacaciones') + ': cuántos te quedan y cuántos te quedarían.'],
      'Solo cuentan los días de lunes a viernes que no son festivos. Tus días se renuevan en tu aniversario y no se acumulan. Si no te alcanzan, “Pedir como excepción” es solo si ya lo hablaste en persona.'],
    ['📆', 'Próximos días sin trabajo', 'tus vacaciones y los festivos', [
      'En el Inicio (al costado en la compu, hasta abajo en el celular) ves tus próximas vacaciones y los festivos.',
      'Toca “Ver festivos” para ver la lista completa.']]
  ]],
  jefe: ['Jefe', [
    ['📥', 'Tu bandeja', 'lo que espera tu decisión', [
      'En el Inicio, la franja verde ' + GD('Por decidir') + ' te dice cuántas tienes → Abrir mi bandeja.',
      'Abre en Pendientes. Toca una fila para ver el detalle: horario, qué pasó, horas y redacción.']],
    ['✅', 'Decidir', 'aprobar, pedir cambios o rechazar', [
      '<b>Aprobar:</b> pasa con Gaby y, si mueve el banco, se aplica en ese momento.',
      '<b>Pedir cambios</b> o <b>Rechazar:</b> el comentario es obligatorio (la persona necesita saber qué cambiar).',
      '<b>Resuelto:</b> cierra como hecho, sin banco ni PDF.',
      'Puedes cambiar tu decisión después con “Cambiar decisión”, mientras Laura no la haya aprobado.']],
    ['📦', 'Aprobar en lote', 'varias a la vez', [
      'Las pendientes ya vienen marcadas: quita las que no y dale Aprobar en lote.']],
    ['⏱️', 'Cambiar horas', 'antes de aprobar', [
      'En el detalle, antes de aprobar, toca “Cambiar horas”, pon las correctas y el motivo.',
      'Si con esa solicitud la persona queda en negativo, la app te avisa antes.'],
      'Queda registrado quién las cambió y cuánto daba el cálculo.'],
    ['🏦', 'Tu área', 'banco de horas y vacaciones', [
      'En el Inicio, ' + GD('Para quien valida') + ': Banco de horas y Vacaciones de tu área.',
      'En “Próximos días sin trabajo” ves quién de tu área sale de vacaciones.']]
  ]],
  gaby: ['Gaby', [
    ['🔍', 'Filtro', 'revisar que esté bien llenada', [
      'Mi bandeja → pestaña ' + GD('Filtro (Gaby)') + '.',
      'Si la redacción tiene algo mal, toca “Editar” (queda quién la cambió y cómo decía antes).',
      'Aprobar → pasa con Laura. Pedir cambios → le llega el aviso a la persona.'],
      'También ves las que el jefe mandó a cambios, para avisarle a la persona.'],
    ['👥', 'Personas y PINs', 'altas, fecha de ingreso, horario, PIN', [
      'Administración → ' + GD('👥 Personas y PINs') + ' → toca a la persona.',
      'Ahí cambias puesto, área, fecha de ingreso, quién firma y su horario.',
      'En Acceso: “Dar PIN temporal” (la persona lo cambia al entrar) o “Desbloquear”.']],
    ['🏦', 'Ajustes al banco', 'sumar o restar a mano', [
      'Banco de horas → la persona → ' + GD('+ Ajuste a mano') + '.',
      'Elige Banco o Reposición, escribe las horas (+ suma, − resta) y el motivo.'],
      'Nada se borra: para deshacer un ajuste, haz otro al revés.'],
    ['📄', 'Bitácoras', 'imprimir y recoger firma', [
      'Cuando alguien junta 15 movimientos, su bitácora se cierra sola y te sale un aviso con el botón ' + GD('📄 Bitácora') + '.',
      'Imprímela y recoge la firma de la persona.',
      'Si la quieres cerrar antes: Banco de horas → la persona → Cerrar ahora.']],
    ['🌴', 'Vacaciones', 'saldo de arranque y ajustes', [
      'Inicio → ' + GD('🌴 Vacaciones') + ' → toca a la persona.',
      '<b>Saldo de arranque</b> (una sola vez): los días que le quedan hoy, contando desde su último aniversario.',
      '<b>Ajuste:</b> +/− días con el motivo, para corregir.',
      'Te sale un aviso cuando a alguien ya le pasaron sus vacaciones y no ha hecho su formato.']],
    ['📅', 'Festivos', 'cargar los días festivos', [
      'Administración → ' + GD('📅 Festivos') + ' → fecha, nombre → Agregar.',
      'Si ya había vacaciones aprobadas ese día, la app te avisa para regresarle el día con un ajuste.']]
  ]],
  laura: ['Laura', [
    ['🖊️', 'Aprobación final', 'las solicitudes', [
      'Mi bandeja → pestaña ' + GD('Aprobación final (Laura)') + '.',
      'Al aprobar, la solicitud queda congelada y su PDF se guarda solo.',
      'Si después hay que cambiar algo, la persona hace una corrección (-R1).']],
    ['🌴', 'Vacaciones por aprobar', 'apartar los días', [
      'En el Inicio, ' + GD('Por decidir') + ' te dice cuántas hay → Vacaciones por aprobar.',
      'Toca una: ves cuántos días le quedan y cuántos le quedarían. Si es excepción, sale en rojo con con quién lo habló.',
      'Aprobar = los días quedan apartados. Rechazar pide comentario.',
      'Los días se descuentan cuando apruebas su formato de “Falté a cuenta de vacaciones”.']],
    ['📊', 'Panel general', 'todo, en vivo', [
      'Inicio → ' + GD('Panel general') + ': todas las solicitudes con su estado y un resumen por persona.']],
    ['📁', 'PDF guardados', 'todos los formatos', [
      'Inicio → ' + GD('PDF guardados') + ': busca y descarga cualquier PDF aprobado.']]
  ]]
};
// Ventanitas "¿Por qué?"
const POPS = {
  rep: '<h3>¿Por qué son cosas distintas?</h3><div class="gdos">' +
    '<div><b>⏱️ Banco de horas</b><br>Son horas extra que trabajaste para tener <b>tiempo libre</b> cuando lo necesites. Siempre está en 0 o a tu favor.</div>' +
    '<div><b>↩️ Reposición</b><br>Cuando faltas por algo y quedas <b>debiendo</b> esas horas. Está en 0 o en negativo, y se paga trabajándolas.</div></div>' +
    '<p><b>Te conviene:</b> si faltas y eliges reponer, no gastas tus horas extra ganadas; las sigues teniendo para cuando las quieras usar.</p>'
};
const GU = { tab: null, abierto: 0, q: '' };
function tabsGuia(){
  const r = rolesVista(), out = ['empleado'];
  if (r.includes('admin') || r.includes('jefe')) out.push('jefe');
  if (r.includes('admin') || r.includes('filtro')) out.push('gaby');
  if (r.includes('admin') || r.includes('final')) out.push('laura');
  return out;
}
function vistaGuia(){ GU.abierto = 0; GU.q = ''; pintarGuia(); }
function pintarGuia(){
  const tabs = tabsGuia();
  if (!tabs.includes(GU.tab)) GU.tab = tabs[0];
  let h = '<div class="titulo"><h2>📘 Guía</h2><div class="sub">Cómo se usa la app, en pasos cortos. Toca un tema para abrirlo.</div></div>';
  if (tabs.length > 1) h += '<div class="gtabs">' + tabs.map(t => '<button class="gtab' + (t === GU.tab ? ' on' : '') + '" type="button" data-gt="' + t + '">' + GUIA[t][0] + '</button>').join('') + '</div>';
  h += '<input class="f gbuscar" id="gB" type="search" placeholder="Buscar… (ej. PIN, vacaciones)" value="' + esc(GU.q) + '">';
  const temas = GU.q ? tabs.flatMap(t => GUIA[t][1]) : GUIA[GU.tab][1];
  let n = 0;
  temas.forEach((x, i) => {
    if (GU.q && !sinAcentos(x[1] + ' ' + x[2] + ' ' + x[3].join(' ') + ' ' + (x[4] || '')).includes(sinAcentos(GU.q))) return;
    n++;
    h += '<details class="gtema" data-i="' + i + '"' + (GU.q || i === GU.abierto ? ' open' : '') + '><summary><span class="e">' + x[0] + '</span><div><b>' + x[1] + '</b><small>' + x[2] + '</small></div><em>›</em></summary>' +
      '<ol>' + x[3].map(p => '<li>' + p + '</li>').join('') + '</ol>' + (x[4] ? '<div class="gojo">💡 ' + x[4] + '</div>' : '') + '</details>';
  });
  if (!n) h += '<div class="vacio">No encontré nada con “' + esc(GU.q) + '”.</div>';
  h += '<div class="ver">' + VERSION + '</div>';
  $('vista').innerHTML = h;
  $('vista').querySelectorAll('[data-gt]').forEach(b => b.onclick = () => { GU.tab = b.dataset.gt; GU.abierto = 0; pintarGuia(); });
  $('gB').oninput = () => { GU.q = $('gB').value; pintarGuia(); const b = $('gB'); b.focus(); b.setSelectionRange(GU.q.length, GU.q.length); };
  $('vista').querySelectorAll('details.gtema').forEach(d => d.addEventListener('toggle', () => {
    if (d.open && !GU.q){ GU.abierto = +d.dataset.i; $('vista').querySelectorAll('details.gtema').forEach(o => { if (o !== d) o.open = false; }); }
  }));
  $('vista').querySelectorAll('[data-pq]').forEach(b => b.onclick = e => {
    e.preventDefault();
    const v = document.createElement('div'); v.className = 'gvelo';
    v.innerHTML = '<div class="gpop">' + POPS[b.dataset.pq] + '<button class="btn" type="button">Entendido</button></div>';
    v.onclick = ev => { if (ev.target === v || ev.target.tagName === 'BUTTON') v.remove(); };
    document.body.appendChild(v);
  });
}

// Registrar la vista en el enrutador de index.html
VISTAS.guia = ['Guía', vistaGuia, 'todos'];
