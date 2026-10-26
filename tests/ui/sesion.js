const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs'), path = require('path'); const F = require('./sbfake');
const REPO = '/home/user/uniterra-permisos', S = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.pdf': 'application/pdf' };
const sub = ini => F.admin("select a.auth_pin_id from accesos a join empleados e on e.id = a.empleado_id where e.iniciales = '" + ini + "'");
let fallas = 0; const ok = (c, t) => { console.log((c ? 'OK   ' : 'FALLA') + ' ' + t); if (!c) fallas++; };
async function abrir(b, ini, rec){
  const ctx = await b.newContext({ serviceWorkers: 'block' }); const page = await ctx.newPage(); page.on('pageerror', e => { console.log('ERR', e.message); fallas++; });
  await ctx.route('https://cdn.jsdelivr.net/**', r => r.fulfill({ path: S + '/pl/sbx/package/dist/umd/supabase.js', contentType: 'text/javascript' }));
  await ctx.route('https://fonts.**/**', r => r.abort());
  await ctx.route('https://tnlgwfrseajntindzofg.supabase.co/**', F.manejar);
  await ctx.route('http://ut.local/**', r => { const p = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html'; const f = path.join(REPO, p); return fs.existsSync(f) ? r.fulfill({ path: f, contentType: MIME[path.extname(f)] || 'application/octet-stream' }) : r.fulfill({ status: 404, body: '' }); });
  await page.goto('http://ut.local/blank.html').catch(() => {});
  await page.evaluate(([k, v, rec]) => { localStorage.setItem(k, v); if (rec) localStorage.setItem('ut_recordarme', rec); }, ['sb-tnlgwfrseajntindzofg-auth-token', F.sesion(sub(ini)), rec]);
  await page.goto('http://ut.local/'); await page.waitForTimeout(1500);
  return { page, ctx };
}
const visible = (page, id) => page.evaluate(id => !document.getElementById(id).classList.contains('oculto'), id);
(async () => { const b = await chromium.launch();
  let { page, ctx } = await abrir(b, 'VMM', null);
  ok(await visible(page, 'entrar') && !(await page.evaluate(() => Object.keys(localStorage).some(k => k.includes('auth-token')))), 'Sin "Recordarme": al abrir pide PIN y se borra la sesión guardada');
  ok(await page.isVisible('#chkRecordar'), 'Casilla "Recordarme" en la entrada'); await ctx.close();
  ({ page, ctx } = await abrir(b, 'VMM', '1'));
  ok(await visible(page, 'app'), 'Con "Recordarme": entra directo');
  await page.reload(); await page.waitForTimeout(1200); ok(await visible(page, 'app'), 'Recargar sigue dentro'); await ctx.close();
  ({ page, ctx } = await abrir(b, 'VMM', '0'));
  ok(await visible(page, 'entrar'), 'Recordarme apagado: pide PIN'); await ctx.close();
  // misma pestaña sin recordarme pero con sesion viva
  ({ page, ctx } = await abrir(b, 'VMM', '0'));
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); sessionStorage.setItem('ut_viva', '1'); }, ['sb-tnlgwfrseajntindzofg-auth-token', F.sesion(sub('VMM'))]);
  await page.reload(); await page.waitForTimeout(1500); ok(await visible(page, 'app'), 'Sin recordarme, recargar la misma pestaña sigue dentro'); await ctx.close();
  // PIN temporal: boton No soy yo
  ({ page, ctx } = await abrir(b, 'GTB', '1'));
  ok(await visible(page, 'cambiar') && (await page.textContent('#btnCancelarCambio')).includes('No soy yo'), 'Elige tu PIN muestra "No soy yo · salir"');
  await page.click('#btnCancelarCambio'); await page.waitForTimeout(1000);
  ok(await visible(page, 'entrar'), '"No soy yo" regresa a la entrada'); await ctx.close();
  await b.close(); console.log(fallas ? fallas + ' FALLAS' : 'TODO BIEN'); })();
