const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs'), path = require('path'); const F = require('./sbfake');
const REPO = '/home/user/uniterra-permisos', S = path.resolve(__dirname, '..'), OUT = S + '/ui';
const LIBS = { 'supabase-js': S + '/pl/sbx/package/dist/umd/supabase.js', 'pdf-lib': S + '/pl/x/package/dist/pdf-lib.min.js' };
const sub = F.admin("select a.auth_pin_id from accesos a join empleados e on e.id = a.empleado_id where e.iniciales = 'LAMC'");
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.pdf': 'application/pdf' };
(async () => {
  const b = await chromium.launch();
  for (const ancho of [1366, 390]){
    const ctx = await b.newContext({ viewport: { width: ancho, height: 900 }, serviceWorkers: 'block', hasTouch: ancho < 500 });
    const page = await ctx.newPage(); page.on('pageerror', e => console.log('ERR', e.message));
    await ctx.route('https://cdn.jsdelivr.net/**', r => { const k = Object.keys(LIBS).find(k => r.request().url().includes(k)); return k ? r.fulfill({ path: LIBS[k], contentType: 'text/javascript' }) : r.abort(); });
    await ctx.route('https://fonts.**/**', r => r.abort());
    await ctx.route('https://tnlgwfrseajntindzofg.supabase.co/**', F.manejar);
    await ctx.route('http://ut.local/**', r => { const p = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html'; const f = path.join(REPO, p); return fs.existsSync(f) ? r.fulfill({ path: f, contentType: MIME[path.extname(f)] || 'application/octet-stream' }) : r.fulfill({ status: 404, body: '' }); });
    await ctx.addInitScript(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('ut_recordarme', '1'); }, ['sb-tnlgwfrseajntindzofg-auth-token', F.sesion(sub)]);
    await page.goto('http://ut.local/#nueva'); await page.waitForSelector('[data-tipo="llegada"]');
    await page.click('[data-tipo="llegada"]');
    for (let i = 0; i < 5 && !(await page.locator('#wHora').count()); i++){ await page.click('#wSig'); await page.waitForTimeout(200); }
    const v0 = await page.evaluate(() => $('wHora').value);
    // deslizar minutos 4 lugares y horas 1 lugar
    await page.evaluate(() => { const c = document.querySelectorAll('#wHora .rcol'); c[1].scrollTop += 36 * 4; c[0].scrollTop += 36; });
    await page.waitForTimeout(400);
    const v1 = await page.evaluate(() => $('wHora').value);
    // tocar un minuto
    await page.click('#wHora .rcol[data-parte="m"] .ri[data-v="45"]'); await page.waitForTimeout(700);
    const v2 = await page.evaluate(() => $('wHora').value);
    const res = await page.locator('.wiz-res, .res-cel').first().innerText();
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    console.log(ancho, 'inicial', v0, '-> deslizar', v1, '-> tocar 45', v2, '| sin scroll', sw <= cw, '| resumen dice', (res.match(/Llegada\s*\n?\s*([\d:]+)/) || [])[1]);
    await page.screenshot({ path: OUT + '/rueda-' + ancho + '.png' });
    // rango (horas extras)
    await page.goto('http://ut.local/#'); await page.goto('http://ut.local/#nueva'); await page.waitForSelector('[data-tipo="horas_extras"]');
    await page.click('[data-tipo="horas_extras"]');
    for (let i = 0; i < 5 && !(await page.locator('#wIni').count()); i++){ await page.click('#wSig'); await page.waitForTimeout(200); }
    await page.evaluate(() => { document.querySelectorAll('#wFin .rcol')[0].scrollTop += 36 * 2; }); await page.waitForTimeout(400);
    console.log(ancho, 'rango', await page.evaluate(() => $('wIni').value + ' a ' + $('wFin').value + ' · ' + $('wRangoNota').textContent));
    await page.screenshot({ path: OUT + '/rango-' + ancho + '.png' });
    await ctx.close();
  }
  await b.close();
})();
