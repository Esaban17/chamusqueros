// Prueba de api/ranking.ts (CA-9): la carta solo conserva uno de los 27 códigos de país y la carrera se guarda igual.
// Corre el handler real con un fetch falso en lugar de Neon, así que no toca ninguna base:
//   npx tsx scripts/ranking.test.ts
import assert from 'node:assert/strict';
import { COUNTRIES } from '../src/engine/countries';
import { reiniciarLimites } from '../api/_limite';

process.env.DATABASE_URL = 'postgres://u:p@ep-prueba.neon.tech/db';
const consultas: { query: string; params: unknown[] }[] = [];
globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
  consultas.push(JSON.parse(String(init?.body)));
  return new Response(JSON.stringify({ command: 'SELECT', fields: [], rowCount: 0, rows: [], rowAsArray: false }), { headers: { 'content-type': 'application/json' } });
}) as typeof fetch;

const { POST } = await import('../api/ranking');

/** Envía una carrera con ese país en la carta y devuelve la carta que se mandó a la base (null si se descartó la carta entera). */
async function guardar(country: unknown, extra: Record<string, unknown> = {}) {
  consultas.length = 0;
  reiniciarLimites(); // el tope por IP no es lo que se prueba aquí
  const body = {
    id: '11111111-1111-4111-8111-111111111111', name: 'Prueba', score: 120, titles: 3, caps: 12,
    card: { pos: 'DEL', ovr: 80, club: 'municipal', dept: 'Guatemala', foot: 'Derecho', apps: 300, goals: 100, assists: 40, country },
    ...extra,
  };
  const res = await POST(new Request('http://x/api/ranking', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  const insert = consultas.find((c) => /INSERT INTO ranking/.test(c.query));
  return { status: res.status, insertado: !!insert, card: insert ? JSON.parse(String(insert.params[6])) : undefined };
}

// Los 27 códigos válidos se conservan.
for (const c of COUNTRIES) {
  const r = await guardar(c.code);
  assert.equal(r.card?.country, c.code, `${c.code} debía conservarse`);
}
// Todo lo demás se descarta, pero la carrera se guarda (con la carta, sin país).
for (const malo of ['ZZ', 'gt', 'GTX', 'G', '', '<img src=x onerror=alert(1)>', "GT'; DROP TABLE ranking;--", 12, null, ['GT'], { code: 'GT' }]) {
  const r = await guardar(malo);
  assert.equal(r.status, 200, `${JSON.stringify(malo)}: la carrera se debe guardar`);
  assert.ok(r.insertado, `${JSON.stringify(malo)}: debe haber INSERT`);
  assert.equal(r.card?.country ?? null, null, `${JSON.stringify(malo)}: el país se debe descartar`);
  assert.equal(r.card?.pos, 'DEL', `${JSON.stringify(malo)}: el resto de la carta se conserva`);
}
// Los límites de puntaje y títulos siguen igual (CA-9).
for (const [extra, ok] of [[{ score: 1200, titles: 200, caps: 500 }, true], [{ score: 1201 }, false], [{ score: -101 }, false], [{ titles: 201 }, false], [{ caps: 501 }, false]] as const) {
  const r = await guardar('IT', extra);
  assert.equal(r.status === 200, ok, `límites ${JSON.stringify(extra)}`);
}
// Aclaración 7: el nombre de la carrera pasa por el filtro de ofensivos; si no pasa, 400 claro y no se escribe nada (A03).
for (const nombre of ['Pendejo', 'PENDEJO', 'p3nd3j0', 'Juan Hijueputa', 'Cabrón', 'xX_puto_Xx', 'p.u.t.a', 'Eres un idiota']) {
  const r = await guardar('GT', { name: nombre });
  assert.equal(r.status, 400, `${nombre} debía rechazarse`);
  assert.equal(r.insertado, false, `${nombre}: no debe haber INSERT`);
}
{
  reiniciarLimites();
  const res = await POST(new Request('http://x/api/ranking', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: '11111111-1111-4111-8111-111111111111', name: 'Pendejo', score: 10, titles: 0, caps: 0 }) }));
  assert.deepEqual(await res.json(), { error: 'Nombre no permitido' });
}
// Los nombres de siempre siguen entrando: vacío ("Anónimo"), con tildes, largos, raros, y palabras que contienen una raíz sin serlo.
for (const nombre of ['', 'Estuardo', 'Sofía Ñoño', 'Computadora', 'Vergara', 'Maricarmen', '日本語の名前', 'x'.repeat(60), "O'Brien-Pérez Jr."]) {
  const r = await guardar('GT', { name: nombre });
  assert.equal(r.status, 200, `${nombre} debía aceptarse`);
  assert.ok(r.insertado, nombre);
}
console.log('ranking: 27 códigos válidos se conservan; ZZ, minúsculas, 3 letras, vacío, HTML, SQL y tipos raros se descartan sin perder la carrera; límites intactos; nombres ofensivos → 400 sin escribir.');

// Seguridad B-2: sin content-type JSON no hay preflight de CORS; se rechaza sin tocar la base.
{
  reiniciarLimites();
  consultas.length = 0;
  const res = await POST(new Request('http://x/api/ranking', { method: 'POST', body: JSON.stringify({ id: '11111111-1111-4111-8111-111111111111', name: 'Prueba', score: 10, titles: 0, caps: 0 }) }));
  assert.equal(res.status, 400);
  assert.equal(consultas.length, 0);
}
