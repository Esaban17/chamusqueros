// Prueba de api/retos-ranking.ts (RF-25, CA-12): 50 filas más la propia, orden y desempate, 0 puntos fuera, y ningún identificador en la respuesta cruda. Sin red:
//   npx tsx scripts/retos-ranking.test.ts
import assert from 'node:assert/strict';
import { servidor } from './fixtures/servidor';

const s = servidor({ ably: false }); // el ranking tampoco depende de Ably (RF-37)
const { GET } = await import('../api/retos-ranking');
const ver = async (d: ReturnType<typeof s.nuevoDispositivo> | null, extra: { token?: string; ip?: string } = {}) => {
  const r = await GET(s.peticion('GET', '/api/retos-ranking', { d, ...extra }));
  const texto = await r.text();
  return { status: r.status, texto, cuerpo: JSON.parse(texto), headers: r.headers };
};

// 60 jugadores con 1 a 60 «decenas» de puntos; Cero con 0 puntos no aparece.
const todos = Array.from({ length: 60 }, (_, i) => {
  const d = s.nuevoDispositivo(`Jugador${i}`);
  s.bd.jugadores.set(d.id, { id: d.id, th: s.hash(d.token), apodo: d.apodo, avatar: [i % 6, 0, 0, 0, 0, 1], club: null, seleccion: null, puntos: (i + 1) * 10, jugadas: 1, victorias: i, empates: 0, derrotas: 0, racha_tipo: 'V', racha_n: 1, mejor_racha_v: 1, llegada: i });
  return d;
});
const cero = s.nuevoDispositivo('Cero');
s.bd.jugadores.set(cero.id, { id: cero.id, th: s.hash(cero.token), apodo: 'Cero', avatar: null, club: null, seleccion: null, puntos: 0, jugadas: 0, victorias: 0, empates: 0, derrotas: 0, racha_tipo: null, racha_n: 0, mejor_racha_v: 0, llegada: null });

// Visitante: 50 filas, ordenadas por puntos; sin fila propia.
{
  const r = await ver(null);
  assert.equal(r.status, 200);
  assert.equal(r.cuerpo.top.length, 50);
  assert.equal(r.cuerpo.yo, null);
  assert.deepEqual(r.cuerpo.top.map((f: any) => f.pos), Array.from({ length: 50 }, (_, i) => i + 1));
  assert.equal(r.cuerpo.top[0].apodo, 'Jugador59'); assert.equal(r.cuerpo.top[0].puntos, 600);
  assert.equal(r.cuerpo.top[49].apodo, 'Jugador10');
  assert.ok(r.cuerpo.top.every((f: any) => f.yo === false));
  assert.deepEqual(Object.keys(r.cuerpo.top[0]).sort(), ['apodo', 'avatar', 'pos', 'puntos', 'victorias', 'yo'], 'solo los campos públicos');
  assert.ok(!r.cuerpo.top.some((f: any) => f.apodo === 'Cero'), 'quien tiene 0 puntos no aparece');
  // Nunca hay identificadores en la respuesta cruda (CA-12): ni UUID, ni tokens, ni hashes.
  assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(r.texto), 'hay un UUID en la respuesta');
  for (const d of todos.slice(0, 5)) assert.ok(!r.texto.includes(d.token) && !r.texto.includes(s.hash(d.token)));
  assert.ok(!/"id"|player_id|token/i.test(r.texto));
  assert.match(r.headers.get('content-type')!, /^application\/json/);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('access-control-allow-origin'), null);
}
// Quien quedó fuera del top ve su fila propia aparte, con su posición real; quien está dentro la ve marcada y `yo` queda en null.
{
  const fuera = await ver(todos[2]);   // 30 puntos: puesto 58 de 60
  assert.equal(fuera.cuerpo.top.length, 50);
  assert.equal(fuera.cuerpo.yo.pos, 58); assert.equal(fuera.cuerpo.yo.apodo, 'Jugador2'); assert.equal(fuera.cuerpo.yo.yo, true); assert.equal(fuera.cuerpo.yo.puntos, 30);
  assert.ok(fuera.cuerpo.top.every((f: any) => !f.yo));
  const dentro = await ver(todos[59]);
  assert.equal(dentro.cuerpo.yo, null);
  assert.equal(dentro.cuerpo.top[0].yo, true);
  assert.equal(dentro.cuerpo.top.filter((f: any) => f.yo).length, 1);
  const sin = await ver(cero);
  assert.equal(sin.cuerpo.yo, null, 'con 0 puntos no hay posición');
  // Una credencial mal formada o ajena no tumba el ranking: se ve como visitante.
  for (const extra of [{ token: 'corto' }, { token: todos[1].token }]) {
    const r = await ver(todos[0], extra);
    assert.equal(r.status, 200); assert.equal(r.cuerpo.yo, null);
  }
  assert.ok(!(await ver(todos[0])).texto.includes(todos[0].id));
}
// Orden: puntos ↓, victorias ↓, quien llegó primero.
{
  const [a, b, c] = todos;
  Object.assign(s.bd.jugadores.get(a.id)!, { puntos: 700, victorias: 2, llegada: 50 });
  Object.assign(s.bd.jugadores.get(b.id)!, { puntos: 700, victorias: 2, llegada: 10 });   // empata con a, pero llegó antes
  Object.assign(s.bd.jugadores.get(c.id)!, { puntos: 700, victorias: 5, llegada: 99 });   // más victorias
  const r = await ver(null);
  assert.deepEqual(r.cuerpo.top.slice(0, 3).map((f: any) => f.apodo), ['Jugador2', 'Jugador1', 'Jugador0']);
  // Avatar con forma de 6 enteros o null.
  assert.ok(r.cuerpo.top.every((f: any) => f.avatar === null || (Array.isArray(f.avatar) && f.avatar.length === 6)));
}
// Límite de uso: 60 por minuto por IP.
{
  const ip = '198.51.100.99';
  const c: number[] = [];
  for (let i = 0; i < 62; i++) c.push((await ver(null, { ip })).status);
  assert.equal(c.filter((x) => x === 429).length, 2);
  s.reloj.avanzar(61_000);
  assert.equal((await ver(null, { ip })).status, 200);
}
// Un error de Neon responde genérico y no deja secretos en los registros.
{
  s.bd.fallarEn('rankingRetos');
  const r = await ver(null);
  assert.equal(r.status, 500);
  assert.ok(!/hunter2|password|neon/i.test(r.texto));
  assert.ok(s.errores.every((e) => !/hunter2|password/i.test(e)));
  s.bd.fallarEn(null);
}
s.restaurar();
console.log('retos-ranking: 50 filas más la propia, orden y desempate, 0 puntos fuera, respuesta cruda sin identificadores y límite de uso.');
