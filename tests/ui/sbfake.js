// Supabase de mentira para Playwright: traduce REST/RPC/Storage a SQL y lo corre con psql COMO el usuario (RLS real).
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const PSQL = ['-h', '/var/lib/pgut', '-p', '54329', '-U', 'postgres', '-d', 'ut', '-q', '-At', '-v', 'ON_ERROR_STOP=1'];
const lit = v => v === null || v === undefined ? 'NULL' : "'" + String(v).replace(/'/g, "''") + "'";

function sql(q, sub){
  const full = 'begin; set local role authenticated; set local request.jwt.claim.sub = ' + lit(sub || '') + '; ' + q + '; commit;';
  try { return { out: execFileSync('psql', [...PSQL, '-c', full], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() }; }
  catch (e){ const m = String(e.stderr || e.message).match(/ERROR:\s+(.*)/); return { err: m ? m[1] : String(e.stderr || e.message) }; }
}
const admin = q => execFileSync('psql', [...PSQL, '-c', q], { encoding: 'utf8' }).trim();

const HIJOS = { decisiones: 'solicitud_id', horario_dias: 'horario_id' };
function cols(sel){
  const out = []; let d = 0, cur = '';
  for (const ch of sel || '*'){ if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d){ out.push(cur); cur = ''; } else cur += ch; }
  out.push(cur);
  return out.map(c => c.trim()).filter(Boolean).map(c => {
    const m = c.match(/^(\w+)\((.*)\)$/);
    if (m) return '(select coalesce(json_agg(x), \'[]\') from public.' + m[1] + ' x where x.' + HIJOS[m[1]] + ' = t.id) as ' + m[1];
    return c === '*' ? 't.*' : 't.' + c;
  }).join(', ');
}
function rest(table, params){
  const where = [], order = []; let limit = '';
  for (const [k, v] of params){
    if (k === 'select') continue;
    if (k === 'order'){ v.split(',').forEach(o => { const [c, dir, nl] = o.split('.'); order.push('t.' + c + ' ' + (dir || 'asc') + (nl ? ' ' + nl.replace('nulls', 'nulls ') : '')); }); continue; }
    if (k === 'limit'){ limit = ' limit ' + (+v); continue; }
    const [op, ...rest] = v.split('.'); const val = rest.join('.');
    if (op === 'eq') where.push('t.' + k + '::text = ' + lit(val));
    else if (op === 'is') where.push('t.' + k + ' is ' + (val === 'null' ? 'null' : val));
    else if (op === 'in') where.push('t.' + k + '::text in (' + val.replace(/^\(|\)$/g, '').split(',').map(x => lit(x.replace(/^"|"$/g, ''))).join(',') + ')');
    else if (op === 'neq') where.push('t.' + k + '::text <> ' + lit(val));
    else if (['gte', 'lte', 'gt', 'lt'].includes(op)) where.push('t.' + k + ' ' + { gte: '>=', lte: '<=', gt: '>', lt: '<' }[op] + ' ' + lit(val));
    else throw new Error('filtro no soportado ' + k + '=' + v);
  }
  return 'select coalesce(json_agg(r), \'[]\') from (select ' + cols(params.get('select')) + ' from public.' + table + ' t' +
    (where.length ? ' where ' + where.join(' and ') : '') + (order.length ? ' order by ' + order.join(', ') : '') + limit + ') r';
}
function argSql(v){
  if (v === null || v === undefined) return 'NULL';
  if (Array.isArray(v)) return lit('{' + v.join(',') + '}');
  if (typeof v === 'object') return lit(JSON.stringify(v));
  return lit(v);
}
const setof = {};
function rpc(fn, args){
  if (!(fn in setof)) setof[fn] = admin("select proretset from pg_proc where proname = '" + fn + "' limit 1") === 't';
  const a = Object.entries(args || {}).map(([k, v]) => k + ' => ' + argSql(v)).join(', ');
  return setof[fn] ? 'select coalesce(json_agg(x), \'[]\') from public.' + fn + '(' + a + ') x' : 'select to_json(public.' + fn + '(' + a + '))';
}

const ARCH = new Map(); // ruta -> Buffer
function subDe(req){
  const h = req.headers()['authorization'] || '';
  const t = h.replace(/^Bearer\s+/i, '').split('.')[1];
  if (!t) return '';
  try { return JSON.parse(Buffer.from(t, 'base64url').toString()).sub || ''; } catch (e){ return ''; }
}
const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function manejar(route){
  const req = route.request(), url = new URL(req.url()), sub = subDe(req), p = url.pathname;
  if (p.startsWith('/auth/v1/')) return json(route, 200, { id: sub, aud: 'authenticated', role: 'authenticated' });
  if (p.startsWith('/rest/v1/rpc/')){
    const r = sql(rpc(p.split('/').pop(), req.postDataJSON() || {}), sub);
    return r.err ? json(route, 400, { message: r.err, code: 'P0001' }) : json(route, 200, r.out === '' ? null : JSON.parse(r.out));
  }
  if (p.startsWith('/rest/v1/')){
    if (req.method() !== 'GET') return json(route, 400, { message: 'mock: solo GET' });
    const r = sql(rest(p.split('/').pop(), url.searchParams), sub);
    if (r.err) return json(route, 400, { message: r.err });
    const arr = JSON.parse(r.out);
    if ((req.headers()['accept'] || '').includes('vnd.pgrst.object')) return arr.length === 1 ? json(route, 200, arr[0]) : json(route, 406, { message: 'no rows', code: 'PGRST116' });
    return json(route, 200, arr);
  }
  const ms = p.match(/^\/storage\/v1\/object\/(?:authenticated\/)?pdfs\/?(.*)$/);
  if (ms){
    const ruta = decodeURIComponent(ms[1]);
    if (req.method() === 'POST'){
      const buf = req.postDataBuffer() || Buffer.alloc(0);
      const r = sql("insert into storage.objects (bucket_id, name, metadata) values ('pdfs', " + lit(ruta) + ", jsonb_build_object('size', " + buf.length + "))", sub);
      if (r.err) return json(route, /duplicate|unique/i.test(r.err) ? 409 : 400, { statusCode: /duplicate|unique/i.test(r.err) ? '409' : '403', error: 'x', message: /duplicate|unique/i.test(r.err) ? 'The resource already exists' : r.err });
      ARCH.set(ruta, buf);
      return json(route, 200, { Key: 'pdfs/' + ruta });
    }
    if (req.method() === 'GET'){
      const r = sql("select count(*) from storage.objects where bucket_id = 'pdfs' and name = " + lit(ruta), sub);
      if (r.err || r.out !== '1' || !ARCH.has(ruta)) return json(route, 400, { statusCode: '404', message: 'Object not found' });
      return route.fulfill({ status: 200, contentType: 'application/pdf', body: ARCH.get(ruta) });
    }
    if (req.method() === 'DELETE'){
      const pref = (req.postDataJSON() || {}).prefixes || [];
      const r = sql("delete from storage.objects where bucket_id = 'pdfs' and name in (" + (pref.map(lit).join(',') || "''") + ") returning name", sub);
      if (r.err) return json(route, 400, { message: r.err });
      const borr = r.out ? r.out.split('\n') : [];
      borr.forEach(n => ARCH.delete(n));
      return json(route, 200, borr.map(name => ({ name })));
    }
  }
  return json(route, 404, { message: 'mock: no sé ' + req.method() + ' ' + p });
}

function token(sub){
  const b = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  return b({ alg: 'HS256', typ: 'JWT' }) + '.' + b({ sub, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 36000 }) + '.firma';
}
function sesion(sub){
  return JSON.stringify({ access_token: token(sub), token_type: 'bearer', expires_in: 36000, expires_at: Math.floor(Date.now() / 1000) + 36000,
    refresh_token: 'r', user: { id: sub, aud: 'authenticated', role: 'authenticated', email: 'x@pin.local', app_metadata: {}, user_metadata: {} } });
}
module.exports = { manejar, sesion, admin, sql, ARCH };
