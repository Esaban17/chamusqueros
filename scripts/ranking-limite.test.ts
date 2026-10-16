// Prueba del tope de uso del ranking de carreras (specs/ranking-rate-limit, CA-01 a CA-07): base falsa, reloj controlado, una IP por petición. Sin red:
//   npx tsx scripts/ranking-limite.test.ts
import assert from 'node:assert/strict';
import { servidor, T0 } from './fixtures/servidor';

const s = servidor({ ably: false });
const { GET, POST } = await import('../api/ranking');
const { GET: GET_RETOS } = await import('../api/retos-ranking');

const AVATAR = '0,0,0,0,0,1';
const uuid = (n: number) => `22222222-2222-4222-8222-${String(n).padStart(12, '0')}`;
const ver = (ip: string, id?: number) =>
  GET(s.peticion('GET', '/api/ranking', { ip, cabeceras: id === undefined ? {} : { 'x-player-id': uuid(id), 'x-player-avatar': AVATAR } }));
const guardar = (ip: string, n: number, extra: Record<string, unknown> = {}) =>
  POST(s.peticion('POST', '/api/ranking', { ip, cuerpo: { id: uuid(n), name: 'Prueba', score: 120, titles: 3, caps: 12, ...extra } }));
const verRetos = (ip: string) => GET_RETOS(s.peticion('GET', '/api/retos-ranking', { ip }));
const consultas = () => s.bd.consultas.length;
const espera = (r: Response) => Number(r.headers.get('retry-after'));
const estados = async (ps: Promise<Response>[]) => (await Promise.all(ps)).map((r) => r.status);
const todos = (xs: number[], v: number) => xs.every((x) => x === v);

// CA-01: 150 lecturas a la vez entran; la 151 espera 60 s, luego 30 s, y a los 60 s vuelve a entrar.
{
  s.reloj.set(T0);
  const ip = '203.0.113.1';
  assert.ok(todos(await estados(Array.from({ length: 150 }, () => ver(ip))), 200), 'las 150 lecturas deben entrar');
  const r = await ver(ip);
  assert.equal(r.status, 429); assert.equal(espera(r), 60);
  s.reloj.avanzar(30_000);
  const r2 = await ver(ip);
  assert.equal(r2.status, 429); assert.equal(espera(r2), 30);
  s.reloj.set(T0 + 60_000);
  assert.equal((await ver(ip)).status, 200, 'pasada la ventana la IP vuelve a entrar con la cuenta en cero');
}

// CA-02: 150 guardados válidos entran; el 151 espera 3600 s; pasada una hora, vuelve a entrar.
{
  s.reloj.set(T0);
  const ip = '203.0.113.2';
  for (let n = 1; n <= 150; n++) assert.equal((await guardar(ip, n)).status, 200, `guardado ${n}`);
  const r = await guardar(ip, 151);
  assert.equal(r.status, 429); assert.equal(espera(r), 3600);
  s.reloj.set(T0 + 3_600_000);
  assert.equal((await guardar(ip, 152)).status, 200);
}

// CA-03: los topes son independientes entre sí, por IP y frente al ranking de Retos.
{
  s.reloj.set(T0);
  const A = '203.0.113.3', B = '203.0.113.4';
  for (let i = 0; i < 150; i++) await ver(A);
  assert.equal((await ver(A)).status, 429);
  assert.equal((await ver(B)).status, 200, 'otra IP no se ve afectada');
  assert.equal((await guardar(A, 1000)).status, 200, 'agotar lecturas no limita guardados');
  assert.equal((await verRetos(A)).status, 200, 'agotar lecturas de carrera no limita el ranking de Retos');
  const C = '203.0.113.5';
  for (let n = 0; n < 150; n++) await guardar(C, 2000 + n);
  assert.equal((await guardar(C, 3000)).status, 429);
  assert.equal((await ver(C)).status, 200, 'agotar guardados no limita lecturas');
  // Y al revés: agotar el ranking de Retos no limita el de carreras.
  const D = '203.0.113.6';
  for (let i = 0; i < 61; i++) await verRetos(D);
  assert.equal((await verRetos(D)).status, 429);
  assert.equal((await ver(D)).status, 200);
}

// CA-04: la petición rechazada no hace ninguna consulta; la que entra sí.
{
  s.reloj.set(T0);
  const ip = '203.0.113.7';
  let antes = consultas();
  assert.equal((await ver(ip, 1)).status, 200);
  assert.equal(consultas() - antes, 2, 'lectura con avatar bajo el tope: escritura de avatar + ranking');
  for (let i = 1; i < 150; i++) await ver(ip, 1);
  antes = consultas();
  assert.equal((await ver(ip, 1)).status, 429);
  assert.equal(consultas(), antes, 'lectura rechazada: 0 consultas');

  const ipP = '203.0.113.8';
  antes = consultas();
  assert.equal((await guardar(ipP, 1)).status, 200);
  assert.ok(consultas() - antes >= 1, 'guardado bajo el tope consulta la base');
  for (let n = 2; n <= 150; n++) await guardar(ipP, n);
  antes = consultas();
  assert.equal((await guardar(ipP, 151)).status, 429);
  assert.equal(consultas(), antes, 'guardado rechazado: 0 consultas');
}

// CA-05: forma del 429 (cabeceras, cuerpo mínimo, sin datos internos, espera en rango).
{
  s.reloj.set(T0);
  const ipG = '203.0.113.9', ipL = '203.0.113.10', idJ = uuid(77);
  for (let i = 0; i < 150; i++) await ver(ipL);
  for (let n = 0; n < 150; n++) await guardar(ipG, 5000 + n);
  const lectura = await ver(ipL, 77);
  const guardado = await POST(s.peticion('POST', '/api/ranking', { ip: ipG, cuerpo: { id: idJ, name: 'Prueba', score: 120, titles: 3, caps: 12 } }));
  for (const [r, ip, max] of [[lectura, ipL, 60], [guardado, ipG, 3600]] as const) {
    assert.equal(r.status, 429);
    const texto = await r.text();
    assert.match(r.headers.get('content-type')!, /^application\/json/);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(![...r.headers.keys()].some((k) => k.startsWith('access-control-')), 'sin CORS');
    assert.deepEqual(Object.keys(JSON.parse(texto)).sort(), ['error', 'mensaje']);
    for (const prohibido of ['neon', 'sql', 'DATABASE', ip, idJ]) assert.ok(!texto.toLowerCase().includes(prohibido.toLowerCase()), `el 429 no debe contener «${prohibido}»`);
    const e = r.headers.get('retry-after')!;
    assert.match(e, /^\d+$/); assert.ok(Number(e) >= 1 && Number(e) <= max, `espera ${e} fuera de 1..${max}`);
  }
}

// CA-06: los guardados inválidos también cuentan; antes del tope dan 400 como hoy.
{
  s.reloj.set(T0);
  const ip = '203.0.113.11';
  for (let n = 0; n < 150; n++) assert.equal((await guardar(ip, 6000 + n, { score: 5000 })).status, 400);
  assert.equal((await guardar(ip, 7000)).status, 429, 'el 151 válido ya está rechazado');
}

// CA-07: 40 dispositivos con la misma IP: 1 carrera y 3 lecturas cada uno en el mismo minuto, y hasta 3 carreras en la hora, sin ningún 429.
{
  s.reloj.set(T0);
  const ip = '203.0.113.12';
  const fallas: number[] = [];
  const anotar = (r: Response) => { if (r.status !== 200) fallas.push(r.status); };
  for (let d = 0; d < 40; d++) {
    anotar(await guardar(ip, 8000 + d));
    for (let k = 0; k < 3; k++) anotar(await ver(ip, 8000 + d));
  }
  for (const minutos of [20, 40]) {
    s.reloj.set(T0 + minutos * 60_000);
    for (let d = 0; d < 40; d++) anotar(await guardar(ip, 8000 + d));
  }
  assert.deepEqual(fallas, [], '40 dispositivos (160 peticiones y 120 guardados) no deben recibir 429');
}

s.restaurar();
console.log('ranking-limite: 150 lecturas/min y 150 guardados/h por IP (CA-01, CA-02), independientes entre sí, por IP y de Retos (CA-03), 429 sin consultas (CA-04) y sin datos internos (CA-05), inválidos cuentan (CA-06), grupo de 40 sin 429 (CA-07).');
