// Prueba estática de cabeceras de seguridad y analítica, sin red (CA-1 a CA-3, CA-5, CA-6, CA-8; RF-01 a RF-03, RF-05 a RF-07).
//   npx tsx scripts/headers.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const leer = (r: string) => readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');

// ---------- Bloque H: vercel.json ----------
const cfg = JSON.parse(leer('vercel.json')) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
assert.deepEqual(Object.keys(cfg), ['headers'], 'vercel.json no toca build ni enrutado');
const reglas = cfg.headers.filter((r) => r.source === '/(.*)');
assert.equal(reglas.length, 1, 'una regla para todas las rutas');
const h = new Map(reglas[0].headers.map((x) => [x.key, x.value]));
assert.equal(h.get('X-Content-Type-Options'), 'nosniff');
assert.equal(h.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
assert.equal(h.get('X-Frame-Options'), 'DENY');
assert.equal(h.get('Permissions-Policy'), 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
assert.ok(!/web-share|clipboard/.test(h.get('Permissions-Policy')!), 'no se cierran web-share ni clipboard-write');
assert.ok(h.has('Content-Security-Policy-Report-Only'), 'RF-02: solo-reporte');
assert.ok(!h.has('Content-Security-Policy'), 'RF-02: ninguna CSP que bloquee');
assert.equal(h.size, 5);

// ---------- CSP (RF-03): orígenes exactos de la tabla del spec ----------
const csp = h.get('Content-Security-Policy-Report-Only')!;
assert.ok(!csp.includes('unsafe-eval'));
const d = new Map(csp.split(';').map((s) => s.trim().split(/\s+/)).map(([k, ...v]) => [k, v] as const));
const permitido: Record<string, string[]> = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ['https://fonts.gstatic.com'],
  'img-src': ["'self'", 'data:', 'https://flagcdn.com'],
  'connect-src': ["'self'", 'https://main.realtime.ably.net', 'wss://main.realtime.ably.net', 'https://*.ably-realtime.com', 'wss://*.ably-realtime.com'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};
assert.deepEqual([...d.keys()].sort(), Object.keys(permitido).sort(), 'ninguna directiva de más');
for (const [k, v] of Object.entries(permitido)) assert.deepEqual(d.get(k), v, k);
for (const v of d.values()) assert.ok(!v.includes('*'), 'sin comodín suelto');

// ---------- Bloque A: index.html y páginas legales (RF-05) ----------
const idx = leer('index.html');
const TAG = '/_vercel/insights/script.js';
assert.equal(idx.split(TAG).length - 1, 1, 'una sola etiqueta de analítica');
assert.ok(idx.includes(`<script defer src="${TAG}"></script>`));
assert.ok(idx.indexOf('/analitica-init.js') >= 0 && idx.indexOf('/analitica-init.js') < idx.indexOf(TAG), 'el inicio va antes');
assert.ok(idx.includes('<script src="/analitica-init.js"></script>'), 'el inicio es bloqueante (sin defer/module)');
for (const f of ['terminos.html', 'privacidad.html', 'creditos.html']) assert.ok(!leer(f).includes('_vercel/insights'), f);

// ---------- beforeSend (RF-06 / CA-6) ----------
const win: any = {};
vm.runInNewContext(leer('public/analitica-init.js'), { window: win, URL, Object });
assert.equal(win.vaq[0][0], 'beforeSend');
const bs = win.vaq[0][1] as (e: { type: string; url: string }) => { url: string } | null;
const url = (u: string) => bs({ type: 'pageview', url: u })?.url ?? null;
assert.equal(url('https://x.app/?sala=ABC234'), 'https://x.app/');
assert.equal(url('https://x.app/?sala=ABC234&ref=reto'), 'https://x.app/?ref=reto');
assert.equal(url('https://x.app/'), 'https://x.app/');
assert.equal(bs({ type: 'pageview', url: 'no es url' }), null);
assert.equal(bs({ type: 'pageview', url: undefined as any }), null);
assert.equal(bs({ type: 'pageview', url: 'https://x.app/?a=1&sala=Z#f' })!.url, 'https://x.app/?a=1#f');

// ---------- privacidad (RF-07 / CA-8) ----------
const p = leer('privacidad.html');
for (const t of ['Web Analytics', 'nuestro propio dominio', 'procesa Vercel', 'No usa cookies', '24 horas', 'datos agregados', 'No se cruza con otros sitios', '?sala=', 'Última actualización: 15 de octubre de 2026', 'dos servicios externos', 'El juego no crea cookies propias'])
  assert.ok(p.includes(t), t);

console.log('headers.test.ts: OK');
