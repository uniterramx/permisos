// Prueba de la Fase 5 en el navegador contra el Postgres local (como cada persona).
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs'), path = require('path');
const F = require('./sbfake');
const REPO = '/home/user/uniterra-permisos', S = path.resolve(__dirname, '..'), OUT = S + '/ui';
fs.mkdirSync(OUT, { recursive: true });
const LIBS = { 'supabase-js': S + '/pl/sbx/package/dist/umd/supabase.js', 'pdf-lib': S + '/pl/x/package/dist/pdf-lib.min.js' };
const subDe = ini => F.admin("select a.auth_pin_id from accesos a join empleados e on e.id = a.empleado_id where e.iniciales = '" + ini + "'");
const idDe = ini => F.admin("select id from empleados where iniciales = '" + ini + "'");
const como = (ini, q) => { const r = F.sql(q, subDe(ini)); if (r.err) throw new Error(ini + ': ' + r.err); return r.out; };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.pdf': 'application/pdf', '.ico': 'image/x-icon', '.webmanifest': 'application/json' };
let fallas = 0;
const ok = (c, t) => { console.log((c ? 'OK   ' : 'FALLA') + ' ' + t); if (!c) fallas++; };

async function pagina(browser, ini, ancho){
  const ctx = await browser.newContext({ viewport: { width: ancho || 1366, height: 900 }, serviceWorkers: 'block', acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('  [error js] ' + e.message); fallas++; });
  await ctx.route('https://cdn.jsdelivr.net/**', r => { const k = Object.keys(LIBS).find(k => r.request().url().includes(k)); return k ? r.fulfill({ path: LIBS[k], contentType: 'text/javascript' }) : r.abort(); });
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await ctx.route('https://fonts.gstatic.com/**', r => r.abort());
  await ctx.route('https://tnlgwfrseajntindzofg.supabase.co/**', F.manejar);
  await ctx.route('http://ut.local/**', r => {
    let p = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html';
    const f = path.join(REPO, p);
    return fs.existsSync(f) ? r.fulfill({ path: f, contentType: MIME[path.extname(f)] || 'application/octet-stream' }) : r.fulfill({ status: 404, body: '' });
  });
  await ctx.addInitScript(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('ut_vercomo', 'todo'); }, ['sb-tnlgwfrseajntindzofg-auth-token', F.sesion(subDe(ini))]);
  await page.goto('http://ut.local/');
  await page.waitForSelector('#app:not(.oculto)', { timeout: 15000 });
  return { page, ctx };
}
async function bajar(page, click, nombre){
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), click()]);
  const f = OUT + '/' + nombre; await d.saveAs(f); return { f, nombre: d.suggestedFilename() };
}
const toast = async page => (await page.locator('#toast').textContent().catch(() => '')) || '';

(async () => {
  // Datos: solicitud real de Luis Alonso (en nómina) aprobada por jefe y Gaby, esperando a Laura
  const fol = JSON.parse(como('LAMC', "select public.crear_solicitud('" + JSON.stringify({ tipo: 'llegada_tarde', justificacion: 'uso_horas', fecha_inicio: '2026-10-27', hora_ref: '10:30',
    redaccion: 'Variación de horario con cargo al banco de horas acumuladas. Mi horario oficial es de 9:00 a 15:00 h; este día entré a las 10:30 h. Apliqué 1.5 h de mi tiempo acumulado.', mueve: 'retiro', horas_calculadas: -1.5 }) + "')")).folio;
  const sid = F.admin("select id from solicitudes where folio = '" + fol + "'");
  como('REMC', "select public.decidir('" + sid + "', 'jefe', 'aprobado')");
  como('GTB', "select public.decidir('" + sid + "', 'gaby', 'aprobado')");
  // Una de Adrián (NO nómina): sin logo
  const fol2 = JSON.parse(como('AEGF', "select public.crear_solicitud('" + JSON.stringify({ tipo: 'ausencia', justificacion: 'comision', fecha_inicio: '2026-10-28', fecha_fin: '2026-10-29', redaccion: 'Atención a comisión / reunión externa — Plan Maestro CUCosta.', mueve: 'no' }) + "')")).folio;
  const sid2 = F.admin("select id from solicitudes where folio = '" + fol2 + "'");
  como('REMC', "select public.decidir('" + sid2 + "', 'jefe', 'aprobado')"); como('GTB', "select public.decidir('" + sid2 + "', 'gaby', 'aprobado')");

  const browser = await chromium.launch();
  // 1) Laura aprueba una en el detalle y otra en lote -> se guardan los PDF
  { const { page, ctx } = await pagina(browser, 'LZTM');
    await page.goto('http://ut.local/#bandeja'); await page.waitForSelector('[data-tab="laura"]');
    await page.click('[data-tab="laura"]'); await page.click('tr[data-id="' + sid + '"]');
    await page.click('[data-dec="aprobado"]');
    await page.waitForFunction(() => /PDF guardado/.test(document.getElementById('toast')?.textContent || ''), null, { timeout: 20000 }).catch(() => {});
    ok(F.admin("select count(*) from documentos where solicitud_id = '" + sid + "'") === '1', 'Laura aprueba -> PDF guardado (' + await toast(page) + ')');
    await page.waitForSelector('#bLoteBtn'); await page.click('#bLoteBtn'); await page.click('#bLoteSi');
    await page.waitForFunction(() => /PDF guardado/.test(document.getElementById('toast')?.textContent || ''), null, { timeout: 20000 }).catch(() => {});
    ok(F.admin("select count(*) from documentos where solicitud_id = '" + sid2 + "'") === '1', 'Laura en lote -> PDF guardado');
    // abrir la aprobada y descargar
    await page.click('.seg [data-filtro="tot"]'); await page.click('tr[data-id="' + sid + '"]');
    const d = await bajar(page, () => page.click('#dPDF'), 'laura-' + fol + '.pdf');
    ok(d.nombre === fol + '.pdf', 'Laura descarga ' + d.nombre);
    await ctx.close(); }
  // 2) El empleado descarga la suya desde Mis solicitudes (la guardada, igualita)
  { const { page, ctx } = await pagina(browser, 'LAMC');
    await page.goto('http://ut.local/#mias'); await page.click('tr[data-id="' + sid + '"]');
    const d = await bajar(page, () => page.click('#mPDF'), 'empleado-' + fol + '.pdf');
    ok(Buffer.compare(fs.readFileSync(d.f), F.ARCH.get('solicitudes/' + fol + '.pdf')) === 0, 'Empleado baja el PDF guardado (mismo archivo)');
    // el jefe no tiene botón (P5a) -> se revisa abajo
    await ctx.close(); }
  { const { page, ctx } = await pagina(browser, 'REMC');
    await page.goto('http://ut.local/#panelgral'); await page.click('tr[data-id="' + sid + '"]');
    ok(!(await page.locator('#dPDF').count()), 'Jefe (Raúl) no ve botón de PDF de otros');
    await ctx.close(); }
  // 3) Bitácora: Gaby hace 15 ajustes a Luis -> se cierra sola (ya tenía 1 retiro) y le avisa
  for (let i = 1; i <= 15; i++) como('GTB', "select public.ajuste_banco('" + idDe('LAMC') + "', 'banco', " + (i === 1 ? 4 : i % 4 === 0 ? -1 : 0.5) + ", '" + (i === 1 ? 'Saldo que traía' : 'Ajuste ' + i) + "')");
  ok(F.admin("select count(*) from bitacoras") === '1', 'Bitácora cerrada sola a los 15');
  { const { page, ctx } = await pagina(browser, 'GTB');
    await page.waitForSelector('[data-avbit]');
    const d = await bajar(page, () => page.click('[data-avbit]'), 'gaby-aviso-bitacora.pdf');
    ok(/^B-LAMC-2026-0001\.pdf$/.test(d.nombre), 'Gaby baja la bitácora cerrada desde el aviso: ' + d.nombre);
    ok(F.admin("select count(*) from documentos where tipo = 'bitacora'") === '1', 'Bitácora cerrada guardada en Storage');
    // banco de la persona: bloque de bitácoras
    await page.goto('http://ut.local/#bancos'); await page.click('tr[data-id="' + idDe('LAMC') + '"]');
    await page.waitForSelector('#kBit .bitf');
    const txt = await page.locator('#kBit').innerText();
    ok(/1 de 15/.test(txt) && /B-LAMC-2026-0001/.test(txt), 'Bloque bitácora: activa 1 de 15 + cerrada');
    const d2 = await bajar(page, () => page.click('[data-bitact="0"]'), 'gaby-activa.pdf');
    ok(d2.nombre === 'B-LAMC-2026-0002.pdf', 'Activa con folio provisional ' + d2.nombre);
    await page.screenshot({ path: OUT + '/gaby-banco-1366.png', fullPage: true });
    // cerrar a mano
    await page.click('[data-bitcerrar]'); await page.click('#kBitSi'); await page.waitForTimeout(800);
    ok(F.admin("select count(*) from bitacoras") === '2', 'Gaby cierra a mano la activa');
    // PDF guardados
    await page.goto('http://ut.local/'); await page.waitForSelector('[data-ir="pdfs"]');
    await page.waitForFunction(() => /archivos/.test(document.querySelector('.ifila[data-ir="pdfs"] small')?.textContent || ''));
    console.log('  tarjeta: ' + await page.locator('.ifila[data-ir="pdfs"] small').textContent());
    await page.goto('http://ut.local/#pdfs'); await page.waitForSelector('#pFilas tr');
    ok((await page.locator('#pFilas tr').count()) === 3, 'PDF guardados: 3 (2 solicitudes + 1 bitácora)');
    await page.screenshot({ path: OUT + '/gaby-pdfs-1366.png', fullPage: true });
    await ctx.close(); }
  // 4) Celular 390: sin scroll horizontal
  for (const [ini, hash] of [['GTB', '#pdfs'], ['LAMC', '#banco'], ['GTB', '']]){
    const { page, ctx } = await pagina(browser, ini, 390);
    await page.goto('http://ut.local/' + hash); await page.waitForTimeout(1500);
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    ok(sw <= cw, '390 px sin scroll de página ' + ini + ' ' + (hash || 'inicio') + ' (' + sw + '/' + cw + ')');
    await page.screenshot({ path: OUT + '/m-' + ini + (hash.slice(1) || 'inicio') + '.png', fullPage: true });
    await ctx.close();
  }
  // 5) Empleado: su banco muestra la bitácora; descarga la cerrada (guardada) y la activa
  { const { page, ctx } = await pagina(browser, 'LAMC');
    await page.goto('http://ut.local/#banco'); await page.waitForSelector('#kBit .bitf');
    ok(!(await page.locator('[data-bitcerrar]').count()), 'Empleado no tiene "Cerrar ahora"');
    const d = await bajar(page, () => page.locator('[data-bitpdf]').last().click(), 'empleado-cerrada.pdf');
    ok(Buffer.compare(fs.readFileSync(d.f), F.ARCH.get('bitacoras/B-LAMC-2026-0001.pdf')) === 0, 'Empleado baja la cerrada guardada (igual)');
    await ctx.close(); }
  // 6) Valen: pruebas -> bitácora de prueba, PDF a pruebas/, y "Borrar pruebas" quita archivos
  for (let i = 1; i <= 15; i++) como('VMM', "select public.ajuste_banco('" + idDe('LAMC') + "', 'banco', 1, 'prueba " + i + "')");
  { const { page, ctx } = await pagina(browser, 'VMM');
    await page.waitForSelector('[data-avbit]');
    const d = await bajar(page, () => page.click('[data-avbit]'), 'valen-prueba.pdf');
    ok(d.nombre === 'PRUEBA-B-LAMC-01.pdf' && F.ARCH.has('pruebas/bitacoras/PRUEBA-B-LAMC-01.pdf'), 'Valen: bitácora de prueba guardada en pruebas/');
    await page.goto('http://ut.local/#pruebas'); await page.waitForSelector('#pzBorrar');
    console.log('  ' + (await page.locator('.lista').innerText()).replace(/\n/g, ' | '));
    await page.click('#pzBorrar'); await page.click('#pzSi'); await page.waitForTimeout(1500);
    ok(!F.ARCH.has('pruebas/bitacoras/PRUEBA-B-LAMC-01.pdf') && F.admin("select count(*) from bitacoras where es_prueba") === '0', 'Borrar pruebas quitó archivo y bitácora de prueba');
    ok(F.admin("select count(*) from bitacoras") === '2' && F.ARCH.has('bitacoras/B-LAMC-2026-0001.pdf'), 'Lo real sigue intacto');
    await ctx.close(); }
  await browser.close();
  for (const [k, v] of F.ARCH) fs.writeFileSync(OUT + '/storage-' + k.replace(/\//g, '_'), v);
  console.log(fallas ? '\n' + fallas + ' FALLAS' : '\nTODO BIEN');
  process.exit(fallas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
