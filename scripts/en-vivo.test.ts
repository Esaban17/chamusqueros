// Prueba de api/en-vivo.ts: caché, ritmo, concurrencia, errores por liga, forma inválida, interruptor y orden.
// Corre el handler real con un fetch falso: ni Neon ni ESPN se tocan (esta red tampoco llega a ESPN):
//   npx tsx scripts/en-vivo.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fixture = (n: string) => JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url), 'utf8'));
const EN_VIVO = fixture('espn-scoreboard-live');
const VACIO = fixture('espn-scoreboard-empty');

process.env.DATABASE_URL = 'postgres://u:p@ep-prueba.neon.tech/db';

// ---- Reloj y tabla de la base falsa (una sola fila, id = 1) ----
const T0 = Date.parse('2026-10-14T18:00:00Z');
let reloj = T0;
const seg = (s: number) => s * 1000;
const min = (m: number) => m * 60_000;
let fila = { payload: [] as unknown[], actualizado: null as number | null, intento: 0 };
let baseCaida = false;

// ---- Proveedor falso: una respuesta por slug ----
type Resp = { status?: number; body?: unknown; texto?: string; colgar?: boolean; red?: boolean };
let porSlug: (slug: string) => Resp = (s) => ({ body: s === 'gua.1' ? EN_VIVO : VACIO });
const llamadas = { neon: 0, espn: {} as Record<string, number>, ajenos: [] as string[] };
const plazos: number[] = [];
let simultaneas = 0, maxSimultaneas = 0, retardoMs = 0;
const logs: string[] = [];
let cuerposEspn: { url: string; init?: RequestInit }[] = [];

// Los plazos reales (4 y 8 s) se achican 100 veces para no esperar; se anota el valor pedido para comprobar que están puestos.
const plazoReal = AbortSignal.timeout.bind(AbortSignal);
AbortSignal.timeout = (ms: number) => (plazos.push(ms), plazoReal(Math.ceil(ms / 100)));
// Los temporizadores de AbortSignal.timeout no mantienen vivo el proceso: sin esto, una consulta colgada lo dejaría salir a medias.
const vivo = setInterval(() => {}, 1000);
for (const k of ['log', 'warn', 'error'] as const) console[k] = (...a: unknown[]) => void logs.push(a.map(String).join(' '));

globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
  const u = new URL(String(url));
  if (u.host.endsWith('.neon.tech')) {
    llamadas.neon++;
    if (baseCaida) return new Response(JSON.stringify({ message: 'relation "en_vivo_cache" does not exist', code: '42P01' }), { status: 400, headers: { 'content-type': 'application/json' } });
    const { query, params } = JSON.parse(String(init?.body)) as { query: string; params: unknown[] };
    // Como responde Neon por HTTP: columnas en fields (con el tipo de Postgres) y cada fila como arreglo de texto; el driver las convierte.
    const ok = (fields: [string, number][], rows: (string | null)[][]) =>
      new Response(JSON.stringify({ command: 'SELECT', fields: fields.map(([name, dataTypeID]) => ({ name, dataTypeID })), rowCount: rows.length, rows, rowAsArray: false }), { headers: { 'content-type': 'application/json' } });
    // Decisión síncrona (sin await antes): igual que la sentencia atómica de Postgres, un solo ganador.
    if (/^\s*UPDATE en_vivo_cache SET intento_at/.test(query)) {
      // Misma fórmula que el WHERE de api/en-vivo.ts (reclamar).
      if (fila.intento <= reloj - seg(Number(params[0]))) { fila.intento = reloj; return ok([['id', 23]], [['1']]); }
      return ok([['id', 23]], []);
    }
    if (/^\s*UPDATE en_vivo_cache SET payload/.test(query)) { fila.payload = JSON.parse(String(params[0])); fila.actualizado = reloj; return ok([], []); }
    if (/^\s*SELECT payload/.test(query)) return ok([['payload', 3802], ['actualizado', 701], ['edad', 701]], [[JSON.stringify(fila.payload), fila.actualizado == null ? null : String(fila.actualizado), fila.actualizado == null ? null : String((reloj - fila.actualizado) / 1000)]]);
    throw new Error(`consulta inesperada: ${query}`);
  }
  if (u.host === 'site.api.espn.com') {
    const slug = /\/soccer\/([^/]+)\/scoreboard$/.exec(u.pathname)?.[1] ?? '?';
    llamadas.espn[slug] = (llamadas.espn[slug] ?? 0) + 1;
    cuerposEspn.push({ url: String(url), init });
    simultaneas++; maxSimultaneas = Math.max(maxSimultaneas, simultaneas);
    try {
      if (retardoMs) await new Promise((r) => setTimeout(r, retardoMs));
      const r = porSlug(slug);
      if (r.red) throw new TypeError('fetch failed');
      if (r.colgar) await new Promise((_, rej) => init!.signal!.addEventListener('abort', () => rej(init!.signal!.reason)));
      return new Response(r.texto ?? JSON.stringify(r.body), { status: r.status ?? 200, headers: { 'content-type': 'application/json' } });
    } finally { simultaneas--; }
  }
  llamadas.ajenos.push(u.host);
  throw new Error(`host no permitido: ${u.host}`);
}) as typeof fetch;

const mod = await import('../api/en-vivo');
const { GET } = mod;

type Resultado = { status: number; headers: Headers; json: { actualizado: number | null; partidos: any[] }; texto: string };
async function pedir(): Promise<Resultado> {
  const res = await GET();
  const texto = await res.text();
  return { status: res.status, headers: res.headers, json: JSON.parse(texto), texto };
}
const nombres = (r: Resultado) => r.json.partidos.map((p) => `${p.liga}: ${p.local} ${p.gl}-${p.gv} ${p.visita}`);
const total = () => Object.values(llamadas.espn).reduce((a, b) => a + b, 0);
const XSS = '<img src=x onerror=window.__x=1>';
const SLUGS = 22;

function reiniciar() {
  reloj = T0; fila = { payload: [], actualizado: null, intento: 0 }; baseCaida = false;
  porSlug = (s) => ({ body: s === 'gua.1' ? EN_VIVO : VACIO });
  llamadas.neon = 0; llamadas.espn = {}; plazos.length = 0; cuerposEspn = []; retardoMs = 0; maxSimultaneas = 0;
  delete process.env.ESPN_EN_VIVO; logs.length = 0;
}
let n = 0;
async function caso(nombre: string, f: () => Promise<void>) { reiniciar(); await f(); n++; process.stdout.write(`  ok  ${nombre}\n`); }
/** Evento en juego mínimo para armar scoreboards a mano. */
const ev = (local: unknown, visita: unknown, extra: { clock?: string; score?: [unknown, unknown]; state?: string; type?: Record<string, unknown> } = {}) => ({
  status: { displayClock: extra.clock ?? "10'", type: { name: 'STATUS_FIRST_HALF', state: extra.state ?? 'in', ...extra.type } },
  competitions: [{ competitors: [
    { homeAway: 'home', score: extra.score?.[0] ?? '0', team: { displayName: local } },
    { homeAway: 'away', score: extra.score?.[1] ?? '0', team: { displayName: visita } },
  ] }],
});
const con = (por: Record<string, unknown[]>) => (s: string): Resp => ({ body: { events: por[s] ?? [] } });

console.log('en-vivo:');

await caso('CA-1: solo partidos en juego, con la etiqueta propia y en orden', async () => {
  const r = await pedir();
  assert.equal(r.status, 200);
  assert.deepEqual(nombres(r), [
    `Liga Nacional GT: Municipal 2-1 ${[...XSS].slice(0, 28).join('')}`,
    `Liga Nacional GT: ${[...'Asociación Deportiva Mixco de Guatemala Club Social'].slice(0, 28).join('').trim()} 0-0 Xelajú MC`,
  ]);
  assert.equal(r.json.partidos[0].minuto, 67);
  assert.equal(r.json.partidos[1].estado, 'descanso');
  assert.equal(r.json.partidos[0].estado, 'jugando');
  assert.equal(r.json.actualizado, T0);
});

await caso('CA-10: campos exactos, sin logos ni URLs, y cabeceras', async () => {
  const r = await pedir();
  for (const p of r.json.partidos) assert.deepEqual(Object.keys(p).sort(), ['estado', 'gl', 'gv', 'liga', 'local', 'minuto', 'visita']);
  assert.doesNotMatch(r.texto, /https?:|logo|href|espncdn/i);
  const cc = r.headers.get('cache-control')!;
  const s = Number(/s-maxage=(\d+)/.exec(cc)?.[1]);
  assert.ok(s >= 30 && s <= 120, cc);
  assert.match(cc, /max-age=0/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.match(r.headers.get('content-type')!, /application\/json/);
});

await caso('CA-2: tope de 30 partidos', async () => {
  porSlug = con({ 'eng.1': Array.from({ length: 35 }, (_, i) => ev(`Local ${i}`, `Visita ${i}`, { clock: `${i + 1}'` })) });
  const r = await pedir();
  assert.equal(r.json.partidos.length, 30);
  assert.equal(r.json.partidos[0].minuto, 35); // se queda con los de más minutos
});

await caso('orden de ligas, minutos y nulos al final', async () => {
  // Pedidos en desorden a propósito: el orden sale de la tabla de ligas, no de la respuesta.
  porSlug = con({
    'uefa.nations': [ev('N1', 'N2')], 'fifa.world': [ev('W1', 'W2')], 'concacaf.gold': [ev('G1', 'G2')],
    'eng.1': [ev('E1', 'E2', { clock: "20'" }), ev('E3', 'E4', { clock: '' }), ev('E5', 'E6', { clock: "88'" })],
    'uefa.champions': [ev('C1', 'C2')], 'usa.1': [ev('U1', 'U2')], 'mex.1': [ev('M1', 'M2')], 'gua.1': [ev('P1', 'P2')], 'hon.1': [ev('H1', 'H2')],
  });
  const r = await pedir();
  assert.deepEqual(r.json.partidos.map((p) => `${p.liga}/${p.local}`), [
    'Liga Nacional GT/P1', 'Honduras/H1', 'Liga MX/M1', 'MLS/U1', 'Champions League/C1',
    'Premier League/E5', 'Premier League/E1', 'Premier League/E3', 'Mundial/W1', 'Copa Oro/G1', 'Liga de Naciones UEFA/N1',
  ]);
});

await caso('sin partidos: respuesta vacía 200', async () => {
  porSlug = () => ({ body: VACIO });
  const r = await pedir();
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { actualizado: null, partidos: [] });
  assert.equal(total(), SLUGS); // se consultó y lo vacío también se guardó
  assert.deepEqual(fila.payload, []);
});

await caso('CA-4: 20 solicitudes simultáneas con la caché vencida consultan cada liga una vez', async () => {
  retardoMs = 5;
  const rs = await Promise.all(Array.from({ length: 20 }, () => GET()));
  assert.ok(rs.every((r) => r.status === 200));
  assert.equal(Object.keys(llamadas.espn).length, SLUGS);
  assert.ok(Object.values(llamadas.espn).every((c) => c === 1), JSON.stringify(llamadas.espn));
});

await caso('límite de concurrencia: nunca más de 5 ligas a la vez, y se usan las 5', async () => {
  retardoMs = 5;
  await pedir();
  assert.equal(total(), SLUGS);
  assert.equal(maxSimultaneas, 5);
});

await caso('CA-5: ritmo de 3 minutos (2:59 no consulta, 3:00 sí)', async () => {
  await pedir();
  assert.equal(total(), SLUGS);
  reloj = T0 + seg(179); await pedir();
  assert.equal(total(), SLUGS, 'a 2:59 no debe consultar');
  reloj = T0 + seg(180); await pedir();
  assert.equal(total(), SLUGS * 2, 'a 3:00 debe consultar');
  reloj = T0 + seg(359); await pedir();
  assert.equal(total(), SLUGS * 2);
});

await caso('plazos puestos: 4 s por liga y 8 s por ronda; redirect error; host fijo y sin datos del usuario', async () => {
  await pedir();
  assert.ok(plazos.includes(4000) && plazos.includes(8000), String(plazos));
  assert.equal(cuerposEspn.length, SLUGS);
  for (const { url, init } of cuerposEspn) {
    assert.match(url, /^https:\/\/site\.api\.espn\.com\/apis\/site\/v2\/sports\/soccer\/[a-z0-9.]+\/scoreboard$/);
    assert.equal(init?.redirect, 'error');
    assert.ok(init?.signal instanceof AbortSignal);
  }
  assert.deepEqual(llamadas.ajenos, []);
});

/** Guarda un estado bueno, pasa `despues` segundos y deja que `falla` rija la siguiente ronda. */
async function conGuardado(despues: number, falla: (s: string) => Resp) {
  const antes = await pedir();
  assert.equal(antes.json.partidos.length, 2);
  const guardado = structuredClone(fila);
  reloj = T0 + seg(despues);
  porSlug = falla;
  llamadas.espn = {};
  return { antes, guardado };
}

const caidas: [string, (s: string) => Resp][] = [
  ['HTTP 403', () => ({ status: 403, body: { message: 'Forbidden' } })],
  ['HTTP 404', () => ({ status: 404, body: {} })],
  ['HTTP 500', () => ({ status: 500, body: {} })],
  ['error de red', () => ({ red: true })],
  ['tiempo agotado', () => ({ colgar: true })],
  ['JSON inválido', () => ({ texto: '<html>no es json' })],
  ['sin events', () => ({ body: { algo: [] } })],
  ['events no es arreglo', () => ({ body: { events: 'x' } })],
  ['cuerpo que no es objeto', () => ({ body: null })],
  ['cuerpo gigante', () => ({ texto: ' '.repeat(1_600_000) })],
  ['state no reconocido', () => ({ body: { events: [ev('A', 'B', { state: 'delayed' })] } })],
];
for (const [nombre, falla] of caidas) {
  await caso(`ESPN caído por completo (${nombre}): 200, lo guardado no cambia y se avisa sin datos sensibles`, async () => {
    const { guardado, antes } = await conGuardado(181, falla);
    const r = await pedir();
    assert.equal(r.status, 200);
    // Con todo colgado, el tope de la ronda (8 s) corta antes de llegar a las 22 ligas.
    if (nombre === 'tiempo agotado') assert.ok(total() >= 5 && total() < SLUGS, `${total()} ligas`);
    else assert.equal(total(), SLUGS, 'la ronda se intentó una vez');
    const intentadas = total();
    assert.deepEqual(fila, { ...guardado, intento: reloj }, 'lo guardado no cambia (solo el intento)');
    assert.deepEqual(r.json, antes.json, 'se sigue sirviendo lo último guardado, con su antigüedad');
    assert.ok(logs.some((l) => /^en-vivo: espn gua\.1 /.test(l)) && logs.some((l) => /todas las ligas fallaron/.test(l)));
    // Un error no dispara otra consulta antes de que venza el ritmo.
    await pedir();
    assert.equal(total(), intentadas);
  });
}

await caso('ESPN caído por completo desde el inicio: respuesta vacía 200 (la barra se oculta)', async () => {
  porSlug = () => ({ status: 403, body: {} });
  const r = await pedir();
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { actualizado: null, partidos: [] });
  assert.deepEqual(fila.payload, []);
  assert.equal(fila.actualizado, null);
});

await caso('una liga caída y las demás bien: solo esa se omite', async () => {
  for (const [nombre, mala] of [['404', { status: 404, body: {} }], ['tiempo', { colgar: true }], ['forma', { body: { events: [ev('A', 'B', { state: 'raro' })] } }]] as [string, Resp][]) {
    reiniciar();
    porSlug = (s) => (s === 'gua.1' ? { body: EN_VIVO } : s === 'mex.1' ? { body: { events: [ev('Cruz Azul', 'Pumas', { score: ['1', '1'] })] } } : s === 'hon.1' ? mala : { body: VACIO });
    const r = await pedir();
    assert.deepEqual(r.json.partidos.map((p) => p.liga), ['Liga Nacional GT', 'Liga Nacional GT', 'Liga MX'], nombre);
    assert.ok(logs.some((l) => l.startsWith('en-vivo: espn hon.1 ')), nombre);
    assert.ok(!logs.some((l) => l.startsWith('en-vivo: espn gua.1 ') || l.startsWith('en-vivo: espn mex.1 ')), nombre);
    assert.deepEqual(fila.payload.length, 3);
  }
});

await caso('CA-8: lo guardado vale 30 minutos (29 sí, 31 no)', async () => {
  await conGuardado(min(29) / 1000, () => ({ status: 500 }));
  let r = await pedir();
  assert.equal(r.json.partidos.length, 2);
  assert.equal(r.json.actualizado, T0);
  reloj = T0 + min(31); // el ritmo venció: reintenta, falla y lo guardado sigue ahí, pero ya es viejo
  r = await pedir();
  assert.deepEqual(r.json, { actualizado: null, partidos: [] });
  assert.equal(fila.payload.length, 2);
});

await caso('CA-9: ESPN_EN_VIVO=off no consulta, no sirve lo guardado y no toca la base', async () => {
  await pedir();
  const neon = llamadas.neon, espn = total();
  process.env.ESPN_EN_VIVO = 'off';
  reloj = T0 + min(1);
  const r = await pedir();
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { actualizado: null, partidos: [] });
  assert.equal(total(), espn);
  assert.equal(llamadas.neon, neon);
  reloj = T0 + min(10); await pedir();
  assert.equal(total(), espn);
  // Solo el valor exacto "off" apaga.
  for (const v of ['OFF', 'on', '']) {
    process.env.ESPN_EN_VIVO = v;
    assert.equal((await pedir()).json.partidos.length, 2, `"${v}" no apaga`);
  }
  // Al quitarlo vuelve solo.
  delete process.env.ESPN_EN_VIVO;
  assert.equal((await pedir()).json.partidos.length, 2);
});

await caso('A08: partidos con forma inválida se descartan enteros y el resto se sanea', async () => {
  const ok = ev('Local OK', 'Visita OK', { score: ['3', '2'], clock: "45'+2'" });
  const sin = (f: (e: any) => void) => { const e = structuredClone(ok); f(e); return e; };
  porSlug = con({ 'esp.1': [
    ok,
    sin((e) => { e.competitions[0].competitors[0].team.displayName = { x: 1 }; }),
    sin((e) => { e.competitions[0].competitors[1].team.displayName = '   '; }),
    sin((e) => { e.competitions[0].competitors[0].homeAway = 'away'; }),
    sin((e) => { e.competitions = []; }),
    sin((e) => { e.competitions = 'x'; }),
    sin((e) => { e.competitions[0].competitors = null; }),
    ev('Marcador raro', 'Otro', { score: ['abc', 123] }),
    ev('Largo ' + 'x'.repeat(60), 'Con\u0000control‮ey\n\ttabs', { clock: '999\'' }),
    ev('Emoji ' + '⚽'.repeat(40), 'B', { clock: 'abc' }),
    sin((e) => { e.status = undefined; e.competitions[0].status = { displayClock: "30'", type: { state: 'in', name: 'STATUS_SHOOTOUT' } }; }),
  ] });
  const r = await pedir();
  const p = r.json.partidos;
  assert.equal(p.length, 5);
  assert.deepEqual(p.filter((x) => x.local === 'Local OK').map((x) => [x.gl, x.gv, x.minuto, x.estado]), [[3, 2, 45, 'jugando'], [3, 2, 30, 'penales']]);
  const raro = p.find((x) => x.local === 'Marcador raro');
  assert.deepEqual([raro.gl, raro.gv], [null, null]);
  const largo = p.find((x) => x.local.startsWith('Largo'));
  assert.equal([...largo.local].length, 28);
  assert.equal(largo.visita, 'Con control ey tabs');
  assert.equal(largo.minuto, null);
  assert.equal(p.find((x) => x.local.startsWith('Emoji')).minuto, null);
  assert.equal([...p.find((x) => x.local.startsWith('Emoji')).local].length, 28);
  assert.ok(p.every((x) => x.liga === 'LaLiga'), 'la etiqueta sale de la tabla');
});

await caso('el nombre de un equipo con HTML viaja como texto (el cliente lo pinta con textContent)', async () => {
  const r = await pedir();
  assert.ok(r.json.partidos[0].visita.startsWith('<img src=x'), 'se conserva como texto, sin interpretar ni borrar');
});

await caso('base caída: 200 vacío con no-store y error registrado', async () => {
  baseCaida = true;
  const r = await pedir();
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { actualizado: null, partidos: [] });
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.ok(logs.some((l) => l.startsWith('en-vivo: base')));
  assert.equal(total(), 0, 'sin poder reclamar no se consulta a ESPN');
});

await caso('solo se exporta GET (Vercel responde 405 a los demás métodos)', async () => {
  assert.deepEqual(Object.keys(mod).sort(), ['GET']);
});

await caso('el registro solo lleva slug y motivo corto, nunca cuerpos ni mensajes del proveedor', async () => {
  porSlug = () => ({ red: true });
  await pedir();
  assert.ok(logs.length > 0);
  assert.ok(logs.every((l) => /^en-vivo: espn (\S+ )?[a-zñáéíóú ]+( \d{3})?$/i.test(l)), logs.join('\n'));
  assert.ok(logs.every((l) => !/fetch failed|<html|Forbidden/.test(l)));
});

assert.deepEqual(llamadas.ajenos, [], 'ninguna consulta fuera de Neon y site.api.espn.com');
clearInterval(vivo);
process.stdout.write(`en-vivo: ${n} casos ok.\n`);
