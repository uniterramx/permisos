const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs'), path = require('path'); const F = require('./sbfake');
const REPO = '/home/user/uniterra-permisos', S = path.resolve(__dirname, '..'), OUT = S + '/ui';
const LIBS = { 'supabase-js': S + '/pl/sbx/package/dist/umd/supabase.js', 'pdf-lib': S + '/pl/x/package/dist/pdf-lib.min.js' };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.pdf': 'application/pdf' };
const subDe = ini => F.admin("select a.auth_pin_id from accesos a join empleados e on e.id = a.empleado_id where e.iniciales = '" + ini + "'");
const idDe = ini => F.admin("select id from empleados where iniciales = '" + ini + "'");
const como = (ini, q) => { const r = F.sql(q, subDe(ini)); if (r.err) throw new Error(ini + ': ' + r.err); return r.out; };
let fallas = 0; const ok = (c, t) => { console.log((c ? 'OK   ' : 'FALLA') + ' ' + t); if (!c) fallas++; };
async function pagina(b, ini, ancho, vercomo){
  const ctx = await b.newContext({ viewport: { width: ancho || 1366, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage(); page.on('pageerror', e => { console.log('  [error js] ' + e.message); fallas++; });
  await ctx.route('https://cdn.jsdelivr.net/**', r => { const k = Object.keys(LIBS).find(k => r.request().url().includes(k)); return k ? r.fulfill({ path: LIBS[k], contentType: 'text/javascript' }) : r.abort(); });
  await ctx.route('https://fonts.**/**', r => r.abort());
  await ctx.route('https://tnlgwfrseajntindzofg.supabase.co/**', F.manejar);
  await ctx.route('http://ut.local/**', r => { const p = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html'; const f = path.join(REPO, p); return fs.existsSync(f) ? r.fulfill({ path: f, contentType: MIME[path.extname(f)] || 'application/octet-stream' }) : r.fulfill({ status: 404, body: '' }); });
  await ctx.addInitScript(([k, v, c]) => { if (!sessionStorage.getItem('x')){ localStorage.setItem(k, v); localStorage.setItem('ut_vercomo', c); localStorage.setItem('ut_recordarme', '1'); sessionStorage.setItem('x', 1); } }, ['sb-tnlgwfrseajntindzofg-auth-token', F.sesion(subDe(ini)), vercomo || 'todo']);
  await page.goto('http://ut.local/'); await page.waitForSelector('#app:not(.oculto)');
  return { page, ctx };
}
(async () => {
  // datos: Luis con saldo +2 y una pendiente con su jefe; Adrian con saldo -1 y debe reponer
  como('GTB', "select public.ajuste_banco('" + idDe('LAMC') + "', 'banco', 2, 'x')");
  como('GTB', "select public.ajuste_banco('" + idDe('AEGF') + "', 'banco', -1, 'x')");
  como('GTB', "select public.ajuste_banco('" + idDe('AEGF') + "', 'reposicion', -1.5, 'debe')");
  como('LAMC', "select public.crear_solicitud('" + JSON.stringify({ tipo: 'llegada_tarde', justificacion: 'uso_horas', fecha_inicio: '2026-10-27', hora_ref: '10:30', redaccion: 'x', mueve: 'retiro', horas_calculadas: -1.5 }) + "')");
  const b = await chromium.launch();
  { const { page, ctx } = await pagina(b, 'LAMC');
    await page.waitForFunction(() => $('datoSaldo').textContent !== '·' && $('datoProc').textContent !== '·');
    ok(await page.evaluate(() => $('datoSaldo').className === 'verde' && $('datoRep').className === 'n0' && $('datoProc').textContent === '1'), 'Luis: saldo verde, reponer negro, 1 en proceso');
    ok(!(await page.locator('.decidir').count()), 'Empleado sin "Por decidir"');
    await page.screenshot({ path: OUT + '/ini-empleado.png', fullPage: true });
    await page.click('[data-atajo="ausencia"]'); await page.waitForSelector('#wFecha');
    ok(/Desde qué día/.test(await page.locator('.q').first().innerText()), 'Atajo "Falté" abre el formulario en la fecha');
    await ctx.close(); }
  { const { page, ctx } = await pagina(b, 'AEGF', 390);
    await page.waitForFunction(() => $('datoSaldo').textContent !== '·');
    ok(await page.evaluate(() => $('datoSaldo').className === 'rojo' && $('datoRep').className === 'rojo'), 'Adrián: saldo rojo y reponer rojo');
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]); ok(sw <= cw, '390 sin scroll ' + sw);
    await page.screenshot({ path: OUT + '/ini-cel.png', fullPage: true }); await ctx.close(); }
  { const { page, ctx } = await pagina(b, 'REMC');
    await page.waitForFunction(() => $('decN') && $('decN').textContent !== '·');
    ok(await page.evaluate(() => $('decN').textContent === '1'), 'Raúl: 1 por decidir');
    await ctx.close(); }
  // Valen: Inicio + Ver como persona
  { const { page, ctx } = await pagina(b, 'VMM');
    await page.waitForFunction(() => $('decN') && $('decN').textContent !== '·');
    await page.screenshot({ path: OUT + '/ini-valen.png', fullPage: true });
    await page.selectOption('#vcSel', 'p:' + idDe('REMC')); await page.waitForSelector('#comobar:not(.oculto)');
    await page.waitForFunction(() => $('decN') && $('decN').textContent !== '·');
    ok(await page.evaluate(() => /Raúl/.test(document.querySelector('.hero h1').textContent) && $('decN').textContent === '1'), 'Ver como Raúl: su Inicio, 1 por decidir (contado con sus reglas)');
    await page.screenshot({ path: OUT + '/ini-como-raul.png', fullPage: true });
    await page.goto('http://ut.local/#bandeja'); await page.waitForSelector('#bFilas tr');
    ok((await page.locator('#bFilas input[type=checkbox]').count()) === 0 && (await page.locator('#bLoteBtn').count()) === 0, 'Como Raúl: bandeja sin casillas ni lote');
    await page.click('#bFilas tr[data-id]'); await page.waitForSelector('#panel:not(.oculto)');
    ok(!(await page.locator('[data-dec]').count()), 'Como Raúl: detalle sin botones de decidir');
    const err = await page.evaluate(async () => (await sb.rpc('decidir', { p_solicitud: '00000000-0000-0000-0000-000000000000', p_etapa: 'jefe', p_decision: 'aprobado' })).error?.message);
    ok(/solo ver/i.test(err || ''), 'Como persona, guardar está bloqueado');
    const err2 = await page.evaluate(async () => (await sb.from('proyectos').update({ nombre_corto: 'x' }).eq('id', 'x').select()).error?.message);
    ok(/solo ver/i.test(err2 || ''), 'Como persona, update bloqueado');
    // persistencia y volver a mí
    await page.reload(); await page.waitForSelector('#comobar:not(.oculto)');
    ok(/Raúl/.test(await page.locator('#comobar').innerText()), 'Al recargar sigue viendo como Raúl');
    await page.click('#cbFuera'); await page.waitForTimeout(500);
    ok(await page.evaluate(() => !yo.simulado && /Valentina/.test(document.querySelector('.hero h1').textContent)), 'Volver a mí');
    // Banco: orden por area
    await page.goto('http://ut.local/#bancos'); await page.waitForSelector('#kFilas tr');
    const areas = await page.$$eval('#kFilas tr td:nth-child(2)', t => t.map(x => x.textContent));
    const orden = await page.evaluate(a => a.map(n => D.areas.find(x => x.nombre === n)?.orden || 99), areas);
    ok(orden.every((v, i) => !i || orden[i - 1] <= v), 'Banco de horas ordenado por área: ' + [...new Set(areas)].join(' > '));
    await ctx.close(); }
  await b.close(); console.log(fallas ? fallas + ' FALLAS' : 'TODO BIEN'); process.exit(fallas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
