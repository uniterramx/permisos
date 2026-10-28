// Prueba de navegador de Vacaciones (v0.8.0) contra el Postgres local (ver LEEME).
// Copiar junto con sbfake.js a <scratchpad>/ui/ (las librerias van en <scratchpad>/pl/, ver LEEME) y correr: node vacaciones.js
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
  page.on('dialog', d => d.accept());
  await ctx.route('https://cdn.jsdelivr.net/**', r => { const k = Object.keys(LIBS).find(k => r.request().url().includes(k)); return k ? r.fulfill({ path: LIBS[k], contentType: 'text/javascript' }) : r.abort(); });
  await ctx.route('https://fonts.**/**', r => r.abort());
  await ctx.route('https://tnlgwfrseajntindzofg.supabase.co/**', F.manejar);
  await ctx.route('http://ut.local/**', r => { const p = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html'; const f = path.join(REPO, p); return fs.existsSync(f) ? r.fulfill({ path: f, contentType: MIME[path.extname(f)] || 'application/octet-stream' }) : r.fulfill({ status: 404, body: '' }); });
  await ctx.addInitScript(([k, v, c]) => { if (!sessionStorage.getItem('x')){ localStorage.setItem(k, v); localStorage.setItem('ut_vercomo', c); localStorage.setItem('ut_recordarme', '1'); sessionStorage.setItem('x', 1); } }, ['sb-tnlgwfrseajntindzofg-auth-token', F.sesion(subDe(ini)), vercomo || 'todo']);
  await page.goto('http://ut.local/'); await page.waitForSelector('#app:not(.oculto)');
  return { page, ctx };
}
const sinScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

(async () => {
  // Datos: fechas de ingreso, arranque de Karla = 1, festivo de Navidad
  F.admin("update empleados set fecha_ingreso = '2022-02-01' where iniciales = 'OPC'; update empleados set fecha_ingreso = '2025-04-01' where iniciales = 'KYGS'; update empleados set fecha_ingreso = '2025-01-06' where iniciales = 'GTB'");
  F.admin("insert into festivos (fecha, nombre, origen) values ('2026-12-25', 'Navidad', 'ley') on conflict do nothing");
  como('GTB', "select public.vac_ajuste('" + idDe('KYGS') + "', 'ajuste', -11, 'arranque: le queda 1')");
  const b = await chromium.launch();

  // 1) Omar: Inicio con la columna al costado y la cifra de vacaciones
  { const { page, ctx } = await pagina(b, 'OPC');
    await page.waitForFunction(() => $('datoVac') && $('datoVac').textContent !== '·' && !/Cargando/.test($('vLado').textContent));
    ok(await page.evaluate(() => $('datoVac').textContent === '18 días' && $('datoVac').className === 'verde'), 'Omar: 18 días en verde (' + await page.evaluate(() => $('datoVac').textContent) + ')');
    const lado = await page.locator('#vLado').boundingBox(), res = await page.locator('.tures').boundingBox();
    ok(lado.x > res.x + res.width, 'compu: la columna va al costado');
    ok(/Navidad/.test(await page.locator('#vLado').innerText()), 'columna: festivo Navidad');
    ok(await page.locator('[data-ir="pedirvac"]').count() >= 1, 'atajo 🌴 Vacaciones');
    await page.screenshot({ path: OUT + '/vac-inicio-omar.png', fullPage: true });
    // 2) Pedir vacaciones 23-28 dic
    await page.click('.atajo[data-ir="pedirvac"]'); await page.waitForSelector('#pvIni');
    await page.fill('#pvIni', '2026-12-23'); await page.dispatchEvent('#pvIni', 'change');
    await page.fill('#pvFin', '2026-12-28'); await page.dispatchEvent('#pvFin', 'change');
    await page.waitForFunction(() => /3 días hábiles/.test($('pvPrev').textContent));
    ok(/vie 25 \(Navidad\)/.test(await page.locator('#pvPrev').innerText()), 'preview: no cuenta vie 25 (Navidad)');
    ok(/18\s*→\s*te quedarían\s*15/.test(await page.locator('#pvPrev').innerText()), 'preview: 18 → 15');
    ok(!(await page.locator('#pvEnviar').isDisabled()), 'Enviar habilitado');
    await page.screenshot({ path: OUT + '/vac-pedir.png', fullPage: true });
    await page.click('#pvEnviar'); await page.waitForSelector('text=Vacaciones pedidas');
    ok(/Espera a Laura/.test(await page.locator('#vista').innerText()), 'Mis vacaciones: espera a Laura');
    await page.screenshot({ path: OUT + '/vac-mias-1.png', fullPage: true });
    await ctx.close(); }

  // 3) Karla: no le alcanza -> excepcion
  { const { page, ctx } = await pagina(b, 'KYGS');
    await page.evaluate(() => { location.hash = 'pedirvac'; }); await page.waitForSelector('#pvIni');
    await page.fill('#pvIni', '2026-12-02'); await page.dispatchEvent('#pvIni', 'change');
    await page.fill('#pvFin', '2026-12-04'); await page.dispatchEvent('#pvFin', 'change');
    await page.waitForSelector('#xExc');
    ok(await page.locator('#pvEnviar').isDisabled(), 'Karla: sin excepción no se puede enviar');
    await page.check('#xExc'); await page.fill('#xMot', 'Viaje familiar ya pagado'); await page.dispatchEvent('#xMot', 'input');
    ok(!(await page.locator('#pvEnviar').isDisabled()), 'con excepción y motivo sí');
    await page.click('#pvEnviar'); await page.waitForSelector('text=Vacaciones pedidas');
    ok(/excepción/.test(await page.locator('#vista').innerText()), 'queda marcada como excepción');
    await ctx.close(); }

  // 4) Laura: franja Por decidir con vacaciones, aprueba las dos
  { const { page, ctx } = await pagina(b, 'LZTM');
    await page.waitForFunction(() => /Vacaciones 2/.test($('decChips').textContent));
    ok(true, 'Laura: chip "Vacaciones 2" en Por decidir');
    await page.evaluate(() => { location.hash = 'vacpedidos'; }); await page.waitForSelector('tr[data-id]');
    await page.locator('tr[data-id]', { hasText: 'Karla' }).click(); await page.waitForFunction(() => /quedarían/.test(($('vdPrev') || {}).textContent || ''));
    ok(/14 − 2 = 12/.test(await page.locator('#panel').innerText()), 'Laura ve el préstamo: 14 − 2 = 12');
    ok(/Excepción/.test(await page.locator('#panel').innerText()), 'Laura ve la excepción en rojo');
    await page.screenshot({ path: OUT + '/vac-laura-detalle.png', fullPage: true });
    await page.click('[data-vd="aprobada"]'); await page.waitForSelector('#panel >> text=Apartadas');
    await page.locator('tr[data-id]', { hasText: 'Omar' }).click(); await page.waitForSelector('[data-vd="aprobada"]');
    await page.click('[data-vd="aprobada"]'); await page.waitForTimeout(400);
    ok(F.admin("select count(*) from vac_pedidos where estado = 'aprobada'") === '2', 'las dos quedaron apartadas');
    await ctx.close(); }

  // 5) Omar: formato de Falté (fue el lun 28): 23 y 24 dic, ligado a sus apartadas
  { const { page, ctx } = await pagina(b, 'OPC');
    await page.click('[data-atajo="ausencia"]'); await page.waitForSelector('#wFecha');
    await page.fill('#wFecha', '2026-12-23'); await page.dispatchEvent('#wFecha', 'change'); await page.click('#wSig');
    await page.fill('#wUltimo', '2026-12-24'); await page.dispatchEvent('#wUltimo', 'change'); await page.click('#wSig');
    await page.click('[data-just="vacaciones"]'); await page.waitForFunction(() => /2 días reales/.test(($('wVacPrev') || {}).textContent || ''));
    ok(await page.locator('input[name=wVacP]:checked').evaluate(i => i.value !== ''), 'se preselecciona la apartada que se cruza');
    ok(/18\s*→\s*le?\s*quedarían|Te quedan 18/.test(await page.locator('#wVacPrev').innerText()), 'paso 2: te quedan 18 → 16');
    await page.screenshot({ path: OUT + '/vac-formato.png', fullPage: true });
    await page.click('#wSig'); await page.click('#wSig'); await page.waitForSelector('#wConfirmo');
    ok(/Vacaciones/.test(await page.locator('.lista').innerText()), 'revisar: fila Vacaciones');
    await page.check('#wConfirmo'); await page.click('#wEnviar'); await page.waitForSelector('.listo');
    await ctx.close(); }
  const fol = F.admin("select id from solicitudes where justificacion = 'vacaciones' and empleado_id = '" + idDe('OPC') + "'");
  ok(F.admin("select vac_dias::int || '|' || (vac_pedido_id is not null) from solicitudes where id = '" + fol + "'") === '2|true', 'formato guardado: 2 días, ligado');
  como('REMC', "select public.decidir('" + fol + "', 'jefe', 'aprobado')");
  como('GTB', "select public.decidir('" + fol + "', 'gaby', 'aprobado')");
  // 6) Laura ve el bloque de vacaciones en el detalle del formato y lo aprueba
  { const { page, ctx } = await pagina(b, 'LZTM');
    await page.evaluate(() => { location.hash = 'bandeja'; }); await page.waitForSelector('#bFilas tr');
    ok(/vacaciones esperan/.test(await page.locator('#vista').innerText()) === false, 'bandeja: ya no hay vacaciones por aprobar (banner oculto)');
    await page.click('[data-tab="laura"]'); await page.waitForSelector('#bFilas tr[data-id]');
    await page.locator('#bFilas tr[data-id]').first().click(); await page.waitForFunction(() => /hábiles/.test(($('dVac') || {}).textContent || ''));
    ok(/usa vacaciones apartadas/.test(await page.locator('#dVac').innerText()), 'detalle: bloque de vacaciones');
    await page.screenshot({ path: OUT + '/vac-bandeja.png', fullPage: true });
    await ctx.close(); }
  como('LZTM', "select public.decidir('" + fol + "', 'laura', 'aprobado')");
  ok(F.admin("select sum(dias) from vac_movimientos where tipo = 'tomadas'") === '-2.0', 'Laura aprobó: se descontaron 2');

  // 7) Omar: Mis vacaciones con el descuento y la columna en celular
  { const { page, ctx } = await pagina(b, 'OPC', 390);
    await page.waitForFunction(() => $('datoVac') && $('datoVac').textContent !== '·' && !/Cargando/.test($('vLado').textContent));
    ok(await page.evaluate(() => $('datoVac').textContent) === '16 días', 'Omar: 16 días (' + await page.evaluate(() => $('datoVac').textContent) + ')');
    const lado = await page.locator('#vLado').boundingBox(), res = await page.locator('.tures').boundingBox();
    ok(lado.y > res.y, 'celular: la columna va abajo de todo');
    ok(await sinScroll(page), '390: sin scroll de lado (Inicio)');
    await page.screenshot({ path: OUT + '/vac-inicio-cel.png', fullPage: true });
    await page.evaluate(() => { location.hash = 'vacaciones'; }); await page.waitForSelector('text=Movimientos');
    const txt = await page.locator('#vista').innerText();
    ok(/Tomadas/.test(txt) && /Vencidas/.test(txt) && /Aniversario/.test(txt), 'movimientos: tomadas, vencidas y aniversario');
    ok(await sinScroll(page), '390: sin scroll de lado (Mis vacaciones)');
    await page.screenshot({ path: OUT + '/vac-mias-cel.png', fullPage: true });
    await ctx.close(); }

  // 8) Gaby: Vacaciones de todos, ajuste a mano, festivos
  { const { page, ctx } = await pagina(b, 'GTB');
    await page.evaluate(() => { location.hash = 'vacaciones_todos'; }); await page.waitForSelector('#vtFilas tr');
    ok(/no lleva conteo/.test(await page.locator('#vtFilas').innerText()), 'Pável: no lleva conteo');
    ok(/falta su fecha de ingreso/.test(await page.locator('#vtFilas').innerText()), 'sin fecha de ingreso se avisa');
    await page.locator('#vtFilas tr[data-id]', { hasText: 'Omar' }).click(); await page.waitForSelector('#vpDias');
    await page.fill('#vpDias', '1'); await page.fill('#vpMot', 'corrección de captura'); await page.click('#vpOk');
    await page.waitForFunction(() => /Ajuste guardado/.test($('toast').textContent));
    ok(F.admin("select count(*) from vac_movimientos where tipo = 'ajuste' and not es_prueba") === '1', 'ajuste guardado (real)');
    await page.screenshot({ path: OUT + '/vac-todos.png', fullPage: true });
    await page.evaluate(() => { location.hash = 'festivos'; }); await page.waitForSelector('#feF');
    await page.fill('#feF', '2027-03-26'); await page.fill('#feN', 'Viernes Santo'); await page.click('#feOk');
    await page.waitForSelector('text=Viernes Santo');
    ok(true, 'Gaby agrega festivo');
    await page.screenshot({ path: OUT + '/vac-festivos.png', fullPage: true });
    await ctx.close(); }

  // 9) Omar ve festivos sin poder editar; Valen "viendo como" Omar no truena
  { const { page, ctx } = await pagina(b, 'OPC');
    await page.evaluate(() => { location.hash = 'festivos'; }); await page.waitForSelector('text=Viernes Santo');
    ok(!(await page.locator('#feF').count()), 'Omar: festivos solo ver');
    await ctx.close(); }
  { const { page, ctx } = await pagina(b, 'VMM', 1366, 'p:' + idDe('OPC'));
    await page.waitForFunction(() => $('datoVac') && $('datoVac').textContent !== '·' && !/Cargando/.test($('vLado').textContent));
    ok(await page.evaluate(() => $('datoVac').textContent) === '17 días', 'Ver como Omar: 17 días');
    await page.evaluate(() => { location.hash = 'vacaciones'; }); await page.waitForSelector('text=Movimientos');
    ok(!(await page.locator('#vPedir').count()), 'modo solo ver: sin botón de pedir');
    await ctx.close(); }

  await b.close();
  console.log(fallas ? fallas + ' FALLAS' : 'TODO BIEN');
})().catch(e => { console.log('ERROR', e.message); process.exit(1); });
