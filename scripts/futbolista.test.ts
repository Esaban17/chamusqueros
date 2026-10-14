// Prueba de api/futbolista.ts (CA-2, CA-11, RF-11, RF-15, A03, A04, A05, A10).
// Corre el servicio real con un fetch falso en lugar de Wikidata, así que no toca la red:
//   npx tsx scripts/futbolista.test.ts
// Las respuestas están modeladas sobre lo observado en Wikidata el 14/10/2026 (ver specs/retos-futbol/plan.md).
import assert from 'node:assert/strict';
import { normalizar } from '../api/_retos';

// Reloj controlado: el límite de uso y la caché leen Date.now().
let reloj = Date.now();
Date.now = () => reloj;

// ---------- Wikidata falso ----------
const ENTIDADES: Record<string, { es?: string; en?: string; alias?: string[] }> = {
  Q615: { es: 'Lionel Messi', en: 'Lionel Messi', alias: ['Leo Messi'] },
  Q141539677: { es: 'Emi Mercenari', alias: ['Mexican Messi'] },
  Q108159340: { es: 'Arda Güler', en: 'Arda Güler', alias: ['Turkish Messi'] },
  Q165125: { es: 'Javier Hernández Balcázar', en: 'Javier Hernández', alias: ['Chicharito'] },
  Q266613: { es: 'Wayne Rooney', en: 'Wayne Rooney' },
  Q10520: { es: 'David Beckham', en: 'David Beckham' },
};
// [texto, filtro] → Q de lo que devuelve la búsqueda (en ese orden). Lo que no está aquí no devuelve nada.
const AR = 'haswbstatement:P27=Q414|P1532=Q414';
const MX = 'haswbstatement:P27=Q96|P1532=Q96';
const EN = 'haswbstatement:P27=Q21|P1532=Q21';
const BUSQUEDAS: Record<string, string[]> = {
  [`messi|${AR}`]: ['Q615'],
  [`lionel messi|${AR}`]: ['Q615'],
  [`messi|${MX}`]: ['Q141539677'], // falso positivo por alias: la regla de coincidencia lo rechaza
  [`chicharito|${MX}`]: ['Q165125'],
  [`messi|haswbstatement:P54=Q8682`]: ['Q108159340'], // Real Madrid
  [`messi|haswbstatement:P54=Q7156`]: ['Q615'], // FC Barcelona
  [`rooney|${EN}`]: ['Q266613'],
  [`rooney|haswbstatement:P54=Q18656`]: ['Q266613'],
};

const llamadas: { url: string; init: RequestInit }[] = [];
let modo: 'normal' | 'timeout' | 'http500' | 'http429' | 'error' | 'noJson' = 'normal';
const json = (o: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(o), { headers: { 'content-type': 'application/json' }, ...init });

globalThis.fetch = (async (input: unknown, init: RequestInit = {}) => {
  const url = String(input);
  llamadas.push({ url, init });
  if (modo === 'timeout') throw Object.assign(new Error('timeout'), { name: 'TimeoutError' });
  if (modo === 'http500') return json({}, { status: 500 });
  if (modo === 'http429') return json({}, { status: 429, headers: { 'retry-after': '17' } });
  if (modo === 'error') return json({ error: { code: 'internal_api_error', info: 'secreto interno' } });
  if (modo === 'noJson') return new Response('<html>', { status: 200 });
  const p = new URL(url).searchParams;
  if (p.get('list') === 'search') {
    const m = /^"([^"]*)" haswbstatement:P106=Q937857 (haswbstatement:\S+)$/.exec(p.get('srsearch') ?? '');
    const q = m ? BUSQUEDAS[`${m[1]}|${m[2]}`] ?? [] : [];
    return json({ query: { search: q.map((title) => ({ ns: 0, title })) } });
  }
  if (p.get('action') === 'wbgetentities') {
    const entities: Record<string, unknown> = {};
    for (const q of (p.get('ids') ?? '').split('|')) {
      const e = ENTIDADES[q];
      if (e) entities[q] = {
        labels: { ...(e.es && { es: { language: 'es', value: e.es } }), ...(e.en && { en: { language: 'en', value: e.en } }) },
        aliases: { en: (e.alias ?? []).map((value) => ({ language: 'en', value })) },
      };
    }
    return json({ entities });
  }
  return json({}, { status: 400 });
}) as typeof fetch;

const { GET } = await import('../api/futbolista');

let ipN = 0;
/** Consulta como lo hace el navegador (texto normalizado) desde una IP distinta, salvo que se pida otra. */
async function consultar(nombre: string, tipo: string, id: string, ip = `10.1.${Math.floor(++ipN / 250)}.${ipN % 250}`) {
  const q = new URLSearchParams({ nombre, tipo, id });
  const res = await GET(new Request(`http://localhost/api/futbolista?${q}`, { headers: { 'x-forwarded-for': `${ip}, 76.76.21.21` } }));
  return { res, body: (await res.json()) as any, llamadas: llamadas.length };
}
const cliente = (s: string) => normalizar(s);
const sinLlamadas = async (f: () => Promise<unknown>) => { const n = llamadas.length; await f(); return llamadas.length - n; };

// ---------- CA-2: los 12 casos ----------
const casos: [string, string, string, boolean, string | null][] = [
  ['Messi', 'pais', 'AR', true, 'Lionel Messi'],
  ['  MESSI ', 'pais', 'AR', true, 'Lionel Messi'],
  ['Chicharito', 'pais', 'MX', true, 'Javier Hernández Balcázar'],
  ['Rooney', 'pais', 'EN', true, 'Wayne Rooney'],
  ['Messi', 'pais', 'MX', false, null],
  ['Messi', 'club', 'es-real-madrid', false, null],
  ['Messi', 'club', 'es-barcelona', true, 'Lionel Messi'],
  ['Rooney', 'club', 'en-manchester-united', true, 'Wayne Rooney'],
  ['Lionel Mesi', 'pais', 'AR', false, null],
  ['Taylor Swift', 'pais', 'US', false, null],
  ['xqzvwk', 'pais', 'GT', false, null],
];
for (const [texto, tipo, id, valido, nombre] of casos) {
  const r = await consultar(cliente(texto), tipo, id);
  assert.equal(r.res.status, 200, `${texto}/${id}: estado`);
  assert.equal(r.body.valido, valido, `${texto}/${id}: valido`);
  assert.equal(r.body.nombreCanonico, nombre, `${texto}/${id}: nombre`);
  assert.equal(r.body.qid, valido ? (nombre === 'Lionel Messi' ? 'Q615' : r.body.qid) : null, `${texto}/${id}: qid`);
}
// "Messi" y luego "Lionel Messi": el servicio da el mismo qid (la repetición la detecta evaluar(), ver retos.test.ts).
const a = await consultar(cliente('Messi'), 'pais', 'AR');
const b = await consultar(cliente('Lionel Messi'), 'pais', 'AR');
assert.equal(a.body.qid, 'Q615');
assert.equal(b.body.qid, a.body.qid, 'Messi y Lionel Messi son el mismo futbolista');
// Los apodos y alias solo valen completos: "Mexican" (parte de un alias) no vale, aunque la búsqueda lo devuelva.
BUSQUEDAS[`mexican|${MX}`] = ['Q141539677'];
assert.equal((await consultar('mexican', 'pais', 'MX')).body.valido, false, 'parte de un apodo no vale');
BUSQUEDAS[`mexican messi|${MX}`] = ['Q141539677'];
assert.equal((await consultar('mexican messi', 'pais', 'MX')).body.valido, true, 'el apodo completo sí vale');

// ---------- Todas las llamadas salientes: host fijo, agente propio, sin redirecciones ----------
assert.ok(llamadas.length > 0);
for (const { url, init } of llamadas) {
  assert.ok(url.startsWith('https://www.wikidata.org/w/api.php?'), `llamada fuera del host fijo: ${url}`);
  assert.equal(init.redirect, 'error');
  const ua = (init.headers as Record<string, string>)['user-agent'];
  assert.match(ua, /^Chamusqueros\/\d/);
  assert.ok(ua.includes('https://chamusqueros.vercel.app/') && !ua.includes('@'), 'el agente lleva nombre y URL, sin correos');
  assert.ok(init.signal, 'toda llamada lleva plazo');
}
// La búsqueda lleva la frase entre comillas y los filtros del mapa, nada más.
const busq = llamadas.map((l) => new URL(l.url).searchParams).find((p) => p.get('list') === 'search' && p.get('srsearch')!.startsWith('"messi"'))!;
assert.equal(busq.get('srsearch'), `"messi" haswbstatement:P106=Q937857 ${AR}`);
assert.equal(busq.get('srlimit'), '5');

// ---------- CA-11 y RF-11: entradas hostiles → 400 y cero llamadas ----------
const hostiles: [string, string, string][] = [
  ['a" haswbstatement:P27=Q96', 'pais', 'AR'],
  ['-messi', 'pais', 'AR'],
  ['messi:x', 'pais', 'AR'],
  ['(messi)', 'pais', 'AR'],
  ['*', 'pais', 'AR'],
  ['messi*', 'pais', 'AR'],
  ['messi~', 'pais', 'AR'],
  ['a'.repeat(200), 'pais', 'AR'],
  ['a'.repeat(41), 'pais', 'AR'],
  ['%00', 'pais', 'AR'],
  ['messi\u0000', 'pais', 'AR'],
  ['messi\nOR', 'pais', 'AR'],
  ['<img src=x onerror=alert(1)>', 'pais', 'AR'],
  ["'; DROP TABLE ranking;--", 'pais', 'AR'],
  ['Messi1', 'pais', 'AR'],
  ['', 'pais', 'AR'],
  ['a', 'pais', 'AR'],
  ['. .', 'pais', 'AR'],
  ['messi', 'otro', 'AR'],
  ['messi', '', 'AR'],
  ['messi', 'pais', 'zz'],
  ['messi', 'pais', 'ar'],
  ['messi', 'pais', 'constructor'],
  ['messi', 'pais', '__proto__'],
  ['messi', 'club', 'AR'],
  ['messi', 'pais', 'es-barcelona'],
  ['messi', 'club', 'Q7156'],
  ['messi', 'club', 'toString'],
];
for (const [nombre, tipo, id] of hostiles) {
  const n = await sinLlamadas(async () => {
    const r = await consultar(nombre, tipo, id);
    assert.equal(r.res.status, 400, `${JSON.stringify([nombre, tipo, id])}: debía dar 400`);
    assert.deepEqual(r.body, { error: 'Entrada inválida' });
    assert.equal(r.res.headers.get('cache-control'), 'no-store');
  });
  assert.equal(n, 0, `${JSON.stringify([nombre, tipo, id])}: no debía consultar a Wikidata`);
}
// Faltan parámetros por completo.
assert.equal((await GET(new Request('http://localhost/api/futbolista', { headers: { 'x-forwarded-for': '10.9.9.9' } }))).status, 400);
// Operadores en mayúscula: se normalizan a minúscula y viajan entre comillas, sin poder actuar como operadores.
await consultar(cliente('messi OR ronaldo AND NOT pele'), 'pais', 'AR');
const op = llamadas.map((l) => new URL(l.url).searchParams.get('srsearch')).find((s) => s?.includes('ronaldo'))!;
assert.equal(op, `"messi or ronaldo and not pele" haswbstatement:P106=Q937857 ${AR}`);
// Tildes, apóstrofos, guiones y puntos entran y se normalizan.
assert.equal((await consultar(cliente("N'Golo Kanté-Jr."), 'pais', 'FR')).res.status, 200);
assert.ok(llamadas.some((l) => new URL(l.url).searchParams.get('srsearch')?.startsWith('"n golo kante jr" ')));

// ---------- Cabeceras (A05) ----------
const ok = await consultar('messi', 'pais', 'AR');
assert.equal(ok.res.headers.get('content-type'), 'application/json; charset=utf-8');
assert.equal(ok.res.headers.get('x-content-type-options'), 'nosniff');
assert.ok(![...ok.res.headers.keys()].some((k) => k.startsWith('access-control-')), 'sin CORS');
assert.equal(ok.res.headers.get('cache-control'), 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400');
const no = await consultar('xqzvwk', 'pais', 'AR');
assert.equal(no.res.headers.get('cache-control'), 'public, max-age=0, s-maxage=3600');

// ---------- Caché en memoria: dos peticiones iguales, una sola consulta a Wikidata ----------
{
  const n0 = llamadas.length;
  await consultar('rooney', 'club', 'en-manchester-united', '10.2.0.1');
  const tras1 = llamadas.length - n0;
  assert.equal(tras1, 0, 'ya estaba en caché por el caso anterior');
  BUSQUEDAS[`beckham|${EN}`] = ['Q10520'];
  await consultar('beckham', 'pais', 'EN', '10.2.0.2');
  const una = llamadas.length - n0;
  assert.equal(una, 2, 'una búsqueda y una de etiquetas');
  await consultar('beckham', 'pais', 'EN', '10.2.0.3');
  assert.equal(llamadas.length - n0, una, 'la segunda no sale a Wikidata');
  // Vence: lo válido a las 24 h y lo inválido a la hora.
  reloj += 61 * 60_000;
  await consultar('xqzvwk', 'pais', 'AR', '10.2.0.4');
  assert.equal(llamadas.length - n0, una + 1, 'lo inválido venció a la hora (solo la búsqueda, sin resultados)');
  await consultar('beckham', 'pais', 'EN', '10.2.0.5');
  assert.equal(llamadas.length - n0, una + 1, 'lo válido sigue en caché pasada 1 h');
  reloj += 24 * 3600_000;
  await consultar('beckham', 'pais', 'EN', '10.2.0.6');
  assert.equal(llamadas.length - n0, una + 3, 'lo válido venció a las 24 h');
}

// ---------- Errores de Wikidata: 502, 504 y 429, sin detalles internos ni caché ----------
for (const [m, estado] of [['http500', 502], ['error', 502], ['noJson', 502], ['timeout', 504], ['http429', 429]] as const) {
  modo = m;
  const r = await consultar('carlos ruiz', 'pais', 'GT');
  assert.equal(r.res.status, estado, `${m}: estado`);
  assert.equal(r.res.headers.get('cache-control'), 'no-store', `${m}: los errores no se cachean`);
  assert.ok(!JSON.stringify(r.body).includes('secreto') && !JSON.stringify(r.body).includes('wikidata'), `${m}: sin detalles internos`);
  assert.deepEqual(Object.keys(r.body), ['error']);
}
{
  modo = 'http429';
  assert.equal((await consultar('carlos ruiz', 'pais', 'GT')).res.headers.get('retry-after'), '17');
  modo = 'normal';
  BUSQUEDAS[`carlos ruiz|haswbstatement:P27=Q774|P1532=Q774`] = ['Q615'];
  ENTIDADES.Q615.alias!.push('Carlos Ruiz');
  const n0 = llamadas.length;
  const r = await consultar('carlos ruiz', 'pais', 'GT');
  assert.equal(r.res.status, 200, 'tras el error se vuelve a consultar: no quedó nada guardado');
  assert.equal(llamadas.length - n0, 2);
}

// ---------- Límite de uso por IP: 30 por 60 s ----------
{
  modo = 'normal';
  reloj += 120_000;
  const ip = '10.3.0.1';
  for (let i = 1; i <= 30; i++) assert.equal((await consultar('messi', 'pais', 'AR', ip)).res.status, 200, `solicitud ${i}`);
  const r31 = await consultar('messi', 'pais', 'AR', ip);
  assert.equal(r31.res.status, 429, 'la 31.ª en 60 s da 429');
  assert.ok(Number(r31.res.headers.get('retry-after')) >= 1);
  assert.equal(r31.res.headers.get('cache-control'), 'no-store');
  assert.equal((await consultar('messi', 'pais', 'AR', '10.3.0.2')).res.status, 200, 'otra IP no se ve afectada');
  reloj += 61_000;
  assert.equal((await consultar('messi', 'pais', 'AR', ip)).res.status, 200, 'pasada la ventana vuelve a 200');
  // El límite se aplica antes de validar: una entrada inválida también gasta cuota.
  for (let i = 0; i < 29; i++) await consultar('', 'pais', 'AR', ip);
  assert.equal((await consultar('', 'pais', 'AR', ip)).res.status, 429);
}

// ---------- Tope de llamadas salientes (150 por minuto por instancia) ----------
{
  reloj += 120_000;
  const n0 = llamadas.length;
  let estados: number[] = [];
  for (let i = 0; i < 90; i++) {
    const nombre = cliente('jugador ' + 'abcdefghijklmnopqrstuvwxyz'[i % 26] + 'xyz'[Math.floor(i / 26)]);
    BUSQUEDAS[`${nombre}|${AR}`] = ['Q615']; // cada uno hace 2 llamadas
    estados.push((await consultar(nombre, 'pais', 'AR')).res.status);
  }
  assert.ok(llamadas.length - n0 <= 150, `no más de 150 llamadas por minuto (hubo ${llamadas.length - n0})`);
  assert.ok(estados.slice(0, 70).every((s) => s === 200) && estados.includes(429), 'pasado el tope responde 429');
  reloj += 61_000;
  assert.equal((await consultar('messi', 'pais', 'AR')).res.status, 200);
}

// ---------- El mapa ----------
{
  const { PAISES, CLUBES, NOMBRE_RE } = await import('../api/_retos');
  const { COUNTRIES } = await import('../src/engine/countries');
  assert.deepEqual(Object.keys(PAISES).sort(), COUNTRIES.map((c) => c.code).sort(), '27 países del juego');
  assert.ok(Object.keys(CLUBES).length >= 40);
  for (const q of [...Object.values(CLUBES), ...Object.values(PAISES).flatMap((p) => [...p.nac, p.sel])]) assert.match(q, /^Q[1-9]\d{0,9}$/);
  assert.deepEqual(PAISES.EN, { nac: ['Q21'], sel: 'Q21' });
  assert.deepEqual(PAISES.NL, { nac: ['Q29999'], sel: 'Q55' });
  assert.ok(NOMBRE_RE.test('Wayne Rooney') && NOMBRE_RE.test("N'Golo Kanté") && NOMBRE_RE.test('Son Heung-min') && NOMBRE_RE.test('Ødegaard'));
  assert.ok(!NOMBRE_RE.test('Messi1') && !NOMBRE_RE.test('a') && !NOMBRE_RE.test('a'.repeat(41)) && NOMBRE_RE.test('a'.repeat(40)));
}

console.log('futbolista: 11 casos de CA-2, apodos solo completos, 28 entradas hostiles → 400 sin consultar, host y agente fijos, cabeceras, caché (24 h / 1 h), errores 502/504/429 sin guardar, límite 30/min por IP y tope de salientes.');
