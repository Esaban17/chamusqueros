// Prueba del contador anónimo de carreras (specs/contador-carreras; RF-01 a RF-16; CA-1 a CA-16): servidor con Neon falso, cliente con fetch falso y
// comprobaciones estáticas de src/main.ts, api/carreras.ts y privacidad.html. Sin red ni base de datos.
//   npx tsx scripts/contador-carreras.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { servidor } from './fixtures/servidor';

const leer = (r: string) => readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const sinComentarios = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

// =============== Servidor ===============
const s = servidor();
const mod = await import('../api/carreras');
const { POST } = mod;
const aviso = (cuerpo: unknown, ip?: string) => POST(s.peticion('POST', '/api/carreras', { cuerpo, ip }));
const dias = () => Object.fromEntries(s.bd.carrerasDia);
const escrituras = () => s.bd.consultas.filter((c) => c.tag === 'contarCarrera').length;

// CA-1 y CA-2 (parte servidor): el 204 sin cuerpo y la tabla en (1, 0) y luego (1, 1).
{
  s.reloj.set(Date.UTC(2026, 9, 15, 18, 0, 0));
  const r = await aviso({ evento: 'iniciada' });
  assert.equal(r.status, 204);
  assert.equal(await r.text(), '', '204 sin cuerpo');
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('access-control-allow-origin'), null, 'sin CORS (A05)');
  assert.deepEqual(dias(), { '2026-10-15': { iniciadas: 1, terminadas: 0 } });
  assert.equal((await aviso({ evento: 'terminada' })).status, 204);
  assert.deepEqual(dias(), { '2026-10-15': { iniciadas: 1, terminadas: 1 } });
}

// CA-9: 3 iniciadas y 2 terminadas el mismo día quedan en (3, 2), y la suma es una sola sentencia.
{
  s.bd.limpiar();
  for (const e of ['iniciada', 'terminada', 'iniciada', 'terminada', 'iniciada']) assert.equal((await aviso({ evento: e })).status, 204);
  assert.deepEqual(dias(), { '2026-10-15': { iniciadas: 3, terminadas: 2 } });
  assert.equal(escrituras(), 5, 'una consulta por aviso');
  const fuente = leer('api/_bd.ts');
  const consulta = /\/\* contarCarrera \*\/([\s\S]*?)`;/.exec(fuente)?.[1] ?? '';
  assert.match(consulta, /INSERT INTO carreras_dia[\s\S]*ON CONFLICT \(dia\) DO UPDATE[\s\S]*carreras_dia\.iniciadas \+ EXCLUDED\.iniciadas/, 'INSERT ... ON CONFLICT DO UPDATE con suma en la base');
  assert.equal(/SELECT/i.test(consulta), false, 'no se lee antes de escribir');
  // Concurrentes: no se pierde ninguno.
  s.bd.limpiar();
  await Promise.all(Array.from({ length: 20 }, (_, i) => aviso({ evento: i % 2 ? 'terminada' : 'iniciada' })));
  assert.deepEqual(dias(), { '2026-10-15': { iniciadas: 10, terminadas: 10 } });
}

// CA-7: 1.000 avisos desde 50 IP distintas el mismo día → 1 fila; a la base solo llegan [hora, evento, evento] (ninguna IP). Tabla de 3 columnas.
{
  s.bd.limpiar();
  for (let i = 0; i < 1000; i++) assert.equal((await aviso({ evento: i % 2 ? 'terminada' : 'iniciada' }, `203.0.113.${i % 50}`)).status, 204, `aviso ${i}`);
  assert.equal(s.bd.carrerasDia.size, 1);
  assert.deepEqual(dias(), { '2026-10-15': { iniciadas: 500, terminadas: 500 } });
  for (const c of s.bd.consultas) {
    assert.equal(c.tag, 'contarCarrera');
    assert.equal(c.params.length, 3);
    assert.equal(String(c.params[0]), String(s.reloj.ahora)); // el driver manda los parámetros como texto
    assert.ok(c.params[1] === 'iniciada' || c.params[1] === 'terminada');
    assert.equal(c.params[2], c.params[1]);
    assert.equal(JSON.stringify(c.params).includes('203.0.113'), false, 'ninguna IP llega a la base');
  }
  const ddl = leer('db/contador-carreras.sql');
  const cols = [...ddl.matchAll(/^\t(\w+) (?:date|int)\b/gm)].map((m) => m[1]);
  assert.deepEqual(cols, ['dia', 'iniciadas', 'terminadas'], 'la tabla tiene exactamente 3 columnas');
  assert.match(ddl, /CREATE TABLE IF NOT EXISTS carreras_dia/, 'migración idempotente (RF-13)');
  assert.match(ddl, /dia date PRIMARY KEY/);
  assert.equal((ddl.match(/CHECK \(\w+ >= 0\)/g) ?? []).length, 2);
}

// CA-8: corte de día en hora de Guatemala; el cliente no manda fecha.
{
  s.bd.limpiar();
  s.reloj.set(Date.UTC(2026, 9, 16, 5, 59, 59));
  assert.equal((await aviso({ evento: 'iniciada' })).status, 204);
  s.reloj.set(Date.UTC(2026, 9, 16, 6, 0, 0));
  assert.equal((await aviso({ evento: 'iniciada' })).status, 204);
  assert.deepEqual(dias(), { '2026-10-15': { iniciadas: 1, terminadas: 0 }, '2026-10-16': { iniciadas: 1, terminadas: 0 } });
  const antes = JSON.stringify(dias()), n = escrituras();
  const r = await aviso({ evento: 'iniciada', dia: '2020-01-01' });
  assert.equal(r.status, 400);
  assert.equal(JSON.stringify(dias()), antes);
  assert.equal(escrituras(), n);
}

// CA-10: todo lo mal formado responde con error y no toca la base.
{
  s.bd.limpiar();
  const POST_ = (init: { cabeceras?: Record<string, string>; texto?: string }) =>
    POST(new Request('https://chamusqueros.vercel.app/api/carreras', { method: 'POST', headers: { 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 250)}`, ...init.cabeceras }, body: init.texto }));
  const json = { 'content-type': 'application/json' };
  const casos: [string, Promise<Response>][] = [
    ['sin content-type', POST_({ texto: '{"evento":"iniciada"}', cabeceras: { 'content-type': 'text/plain' } })],
    ['formulario', POST_({ texto: 'evento=iniciada', cabeceras: { 'content-type': 'application/x-www-form-urlencoded' } })],
    ['{}', POST_({ texto: '{}', cabeceras: json })],
    ['otra', aviso({ evento: 'otra' })],
    ['INICIADA', aviso({ evento: 'INICIADA' })],
    ['arreglo', aviso({ evento: ['iniciada'] })],
    ['clave extra', aviso({ evento: 'iniciada', x: 1 })],
    ['sin evento', aviso({ otra: 'iniciada' })],
    ['no es objeto (arreglo)', POST_({ texto: '["iniciada"]', cabeceras: json })],
    ['no es objeto (texto)', POST_({ texto: '"iniciada"', cabeceras: json })],
    ['no es objeto (null)', POST_({ texto: 'null', cabeceras: json })],
    ['no es JSON', POST_({ texto: '{evento', cabeceras: json })],
    ['3 KB', POST_({ texto: JSON.stringify({ evento: 'iniciada', relleno: 'x'.repeat(3000) }), cabeceras: json })],
    ['3 KB con content-length', POST_({ texto: JSON.stringify({ evento: 'iniciada', relleno: 'x'.repeat(3000) }), cabeceras: { ...json, 'content-length': '3030' } })],
  ];
  for (const [nombre, p] of casos) {
    const r = await p;
    assert.ok(r.status === 400, `${nombre}: responde 400 (fue ${r.status})`);
  }
  assert.equal(s.bd.consultas.length, 0, 'ninguna consulta a la base');
  assert.equal(s.bd.carrerasDia.size, 0);
  // GET (y todo lo que no es POST): el archivo solo exporta POST, así que Vercel responde 405 (RF-16, no hay lectura pública).
  assert.deepEqual(Object.keys(mod), ['POST']);
}

// CA-11: tope de 60 por hora por IP.
{
  s.bd.limpiar();
  s.reloj.set(Date.UTC(2026, 9, 15, 18, 0, 0));
  const ip = '192.0.2.77';
  for (let i = 0; i < 60; i++) assert.equal((await aviso({ evento: 'iniciada' }, ip)).status, 204, `aviso ${i + 1}`);
  assert.equal(escrituras(), 60);
  const r = await aviso({ evento: 'iniciada' }, ip);
  assert.equal(r.status, 429);
  const espera = Number(r.headers.get('retry-after'));
  assert.ok(espera >= 1 && espera <= 3600, `retry-after ${espera}`);
  assert.equal(escrituras(), 60, 'el 61 no escribe');
  assert.equal(((await r.json()) as any).error, 'limite');
  assert.equal((await aviso({ evento: 'iniciada' }, '192.0.2.78')).status, 204, 'otra IP no se ve afectada');
  // lo malformado también cuenta contra el tope (va antes de leer el cuerpo)
  s.reloj.avanzar(3600_001);
  assert.equal((await aviso({ evento: 'iniciada' }, ip)).status, 204, 'pasada la hora vuelve a responder 204');
}

// CA-13: la base falla con un secreto en el mensaje → 500 genérico, y el registro solo trae acción y nombre del error.
{
  s.bd.limpiar();
  s.errores.length = 0;
  s.bd.fallarEn('contarCarrera');
  const r = await aviso({ evento: 'iniciada' });
  assert.equal(r.status, 500);
  const texto = await r.text();
  assert.equal(texto.includes('hunter2'), false);
  assert.equal(texto.includes('password'), false);
  assert.equal(((JSON.parse(texto)) as any).error, 'error');
  assert.equal(s.errores.length, 1);
  assert.match(s.errores[0], /^retos-en-linea: carreras falló \(\w+\)$/);
  assert.equal(s.errores[0].includes('hunter2'), false);
  s.bd.fallarEn(null);
}

// RF-15: el servidor no hace llamadas salientes nuevas.
assert.equal(s.salientes.length, 0, 'ninguna salida de red que no sea Neon');
s.restaurar();

// =============== Estática de api/carreras.ts ===============
{
  const f = sinComentarios(leer('api/carreras.ts'));
  assert.deepEqual([...f.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(\w+)/g)].map((m) => m[1]), ['POST'], 'solo exporta POST');
  assert.ok(f.indexOf('limitar(') !== -1 && f.indexOf('limitar(') < f.indexOf('leerJson('), 'el tope va antes de leer el cuerpo');
  for (const prohibido of ['x-player', 'x-jugador', 'authorization', 'x-forwarded-for', 'neon(', 'console.', 'fetch(']) assert.equal(f.toLowerCase().includes(prohibido), false, `api/carreras.ts no usa ${prohibido}`);
  assert.match(f, /from '\.\/_bd\.js'/);
}

// =============== Cliente ===============
const { contarCarrera } = await import('../src/contador-carreras');
const fetchOriginal = globalThis.fetch;
const sinCapturar: unknown[] = [];
process.on('unhandledRejection', (e) => sinCapturar.push(e));
const turno = () => new Promise((r) => setTimeout(r, 10));
let usosAlmacenamiento = 0;
const trampa = new Proxy({}, { get() { usosAlmacenamiento++; return () => null; }, set() { usosAlmacenamiento++; return true; } });
Object.assign(globalThis, { localStorage: trampa, sessionStorage: trampa });

type Llamada = { url: string; init: RequestInit };
const llamadas: Llamada[] = [];
const conFetch = (f: (u: string, i: RequestInit) => Promise<Response>) => {
  llamadas.length = 0;
  globalThis.fetch = ((u: unknown, i: RequestInit) => { llamadas.push({ url: String(u), init: i }); return f(String(u), i); }) as typeof fetch;
};

// CA-6 y CA-5: cuerpo exacto, sin cabeceras del juego, una petición por llamada, sin reintento si falla.
for (const evento of ['iniciada', 'terminada'] as const) {
  conFetch(async () => new Response(null, { status: 204 }));
  assert.equal(contarCarrera(evento), undefined);
  await turno();
  assert.equal(llamadas.length, 1);
  const { url, init } = llamadas[0];
  assert.equal(url, '/api/carreras');
  assert.equal(init.method, 'POST');
  assert.equal(init.body, `{"evento":"${evento}"}`);
  assert.ok(String(init.body).length < 30);
  assert.deepEqual(init.headers, { 'content-type': 'application/json' }, 'ninguna cabecera de identidad');
  assert.equal(init.credentials, 'omit');
  assert.equal(init.keepalive, true);
}
assert.equal(usosAlmacenamiento, 0, 'no toca el almacenamiento local');
{
  const f = leer('src/contador-carreras.ts');
  for (const prohibido of ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'x-player', 'authorization', 'setInterval', 'setTimeout', 'await ']) assert.equal(f.includes(prohibido), false, `el cliente no usa ${prohibido}`);
}

// CA-12 / CA-5: ante 500, 429, red caída, lentitud o un fetch que lanza al instante, no propaga, no espera y no reintenta.
const fallas: [string, (u: string, i: RequestInit) => Promise<Response>][] = [
  ['500', async () => new Response('{"error":"error"}', { status: 500 })],
  ['429', async () => new Response('{"error":"limite"}', { status: 429, headers: { 'retry-after': '60' } })],
  ['red caída', async () => { throw new TypeError('fetch failed'); }],
  ['30 s de lentitud', () => new Promise<Response>(() => {})],
  ['lanza síncrono', (() => { throw new TypeError('sync'); }) as never],
];
for (const [nombre, f] of fallas) {
  conFetch(f);
  const t0 = Date.now();
  assert.equal(contarCarrera('iniciada'), undefined, nombre);
  assert.ok(Date.now() - t0 < 50, `${nombre}: no espera la respuesta`);
  await turno();
  assert.equal(llamadas.length, 1, `${nombre}: una sola petición, sin reintento`);
}
assert.deepEqual(sinCapturar, [], 'ningún unhandledrejection');
globalThis.fetch = fetchOriginal;

// =============== Estática de src/main.ts (CA-1, CA-2, CA-3) ===============
{
  const m = leer('src/main.ts');
  assert.equal((m.match(/contarCarrera\(/g) ?? []).length, 2, 'solo dos llamadas a contarCarrera en main.ts');
  assert.equal((m.match(/contarCarrera\('iniciada'\)/g) ?? []).length, 1);
  assert.equal((m.match(/contarCarrera\('terminada'\)/g) ?? []).length, 1);
  const ini = m.indexOf("contarCarrera('iniciada')");
  assert.equal((m.match(/new Career\(/g) ?? []).length, 1, 'un solo punto de creación de jugador');
  assert.ok(m.indexOf('new Career(') < ini && ini < m.indexOf('debut();', ini) && ini - m.indexOf('new Career(') < 60, "'iniciada' va justo después de new Career(setup)");
  const fin = m.indexOf('function finish() {');
  assert.ok(fin > 0 && m.slice(fin).startsWith("function finish() {\n  contarCarrera('terminada');"), "'terminada' es la primera línea de finish()");
  assert.match(m, /import \{ contarCarrera \} from '\.\/contador-carreras';/);
}

// =============== privacidad.html (CA-15) ===============
{
  const h = leer('privacidad.html');
  const i = h.indexOf('<h2>Contador de carreras</h2>');
  assert.ok(i > 0 && i < h.indexOf('<h2>Anuncios</h2>'), 'sección «Contador de carreras» antes de «Anuncios»');
  const sec = h.slice(i, h.indexOf('<h2>Anuncios</h2>'));
  for (const t of ['crear un jugador', 'pantalla final', 'iniciada', 'terminada', 'dos números por día', 'ningún identificador', 'nombre', 'dirección IP', '60 avisos por hora', 'memoria temporal', 'Vercel', 'Neon', 'registros técnicos'])
    assert.ok(sec.includes(t), `la sección menciona «${t}»`);
  // La fecha de última actualización no es anterior al día del cambio (15 de octubre de 2026).
  const m = /Última actualización: (\d+) de (\w+) de (\d{4})\./.exec(h);
  assert.ok(m, 'hay fecha de última actualización');
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  assert.ok(MES.includes(m![2]));
  assert.ok(Date.UTC(+m![3], MES.indexOf(m![2]), +m![1]) >= Date.UTC(2026, 9, 15), 'la fecha es la del cambio o posterior');
}

console.log('contador-carreras: OK');
