// Prueba de api/_ably.ts con Ably falso (A7: RF-16, RF-37; A02, A10): disponibilidad, publicar y pedir token. Sin red:
//   npx tsx scripts/ably.test.ts
import assert from 'node:assert/strict';
import { servidor, LLAVE_FALSA, T0 } from './fixtures/servidor';

const s = servidor();
const ably = await import('../api/_ably');
const evento = { v: 7, sala: { codigo: 'ABC234' } } as never;

// Disponibilidad: una llave con la forma idApp.idLlave:secreto, o EN_LINEA_DEV=1; si no, nada (RF-01, RF-37).
assert.equal(ably.disponible(), true);
for (const mala of ['', 'sin-forma', 'a.b', 'a.b:', ':secreto', 'a b.c:d', 'a.b:c d', 'a.b:c:d', 'a.b.c:d']) {
  process.env.ABLY_API_KEY = mala;
  assert.equal(ably.disponible(), false, `«${mala}» no es una llave válida`);
}
delete process.env.ABLY_API_KEY;
assert.equal(ably.disponible(), false);
process.env.EN_LINEA_DEV = '1';
assert.equal(ably.disponible(), true, 'el modo de desarrollo no necesita llave');
assert.equal(await ably.publicar('ABC234', evento), true);
assert.equal(s.ably.llamadas.length, 0, 'y no llama a Ably');
delete process.env.EN_LINEA_DEV;
process.env.ABLY_API_KEY = LLAVE_FALSA;

// Publicar: POST al host fijo, Basic con la llave, cuerpo { name, data, id } y éxito = 201.
{
  assert.equal(await ably.publicar('ABC234', evento), true);
  const l = s.ably.llamadas.at(-1)!;
  assert.equal(l.url, 'https://main.realtime.ably.net/channels/retos%3AABC234/messages');
  assert.equal(l.metodo, 'POST');
  assert.equal(l.autorizacion, `Basic ${Buffer.from(LLAVE_FALSA).toString('base64')}`);
  assert.deepEqual(l.cuerpo, { name: 'estado', data: evento, id: 'ABC234:7' });
  assert.equal(l.redirect, 'error');
  // Un código que no sale de CODIGO_RE nunca decide la URL (A10).
  const n = s.ably.llamadas.length;
  for (const c of ['../../keys', 'ABC234/../x', 'abc234', 'ABC 234', '', 'ABC234?x=1', 'A'.repeat(300)]) assert.equal(await ably.publicar(c, evento), false);
  assert.equal(s.ably.llamadas.length, n);
}
// Un fallo (500, red) no lanza: devuelve false y se registra sin cuerpos ni llaves (la jugada no se rompe).
{
  s.ably.publicar = 'error500';
  assert.equal(await ably.publicar('ABC234', evento), false);
  s.ably.publicar = 'cae';
  assert.equal(await ably.publicar('ABC234', evento), false);
  s.ably.publicar = 'ok';
  assert.equal(s.errores.length, 2);
  assert.ok(s.errores.every((e) => !/secreto|Basic|abc123/.test(e)), s.errores.join('\n'));
}
// Pedir token: TokenRequest sin firmar, sin clientId, solo suscripción al canal de la sala, ttl de 15 min como cadena.
{
  const t = await ably.pedirToken('ABC234');
  assert.deepEqual(t, { token: 'TOKEN-ABLY-DE-PRUEBA', issued: T0, expires: T0 + 900_000, capability: '{"retos:ABC234":["subscribe"]}' });
  const l = s.ably.llamadas.at(-1)!;
  assert.equal(l.url, 'https://main.realtime.ably.net/keys/abc123.def456/requestToken');
  assert.equal(l.autorizacion, `Basic ${Buffer.from(LLAVE_FALSA).toString('base64')}`);
  assert.deepEqual(Object.keys(l.cuerpo).sort(), ['capability', 'keyName', 'nonce', 'timestamp', 'ttl']);
  assert.equal(l.cuerpo.ttl, '900000'); assert.equal(l.cuerpo.keyName, 'abc123.def456'); assert.match(l.cuerpo.nonce, /^[0-9a-f]{32}$/);
  const otro = await ably.pedirToken('ABC234');
  assert.notEqual(s.ably.llamadas.at(-1)!.cuerpo.nonce, l.cuerpo.nonce, 'el nonce cambia en cada pedido');
  assert.ok(otro);
  // Lo que Ably conteste de más (clientId, keyName) no se reenvía.
  assert.deepEqual(Object.keys(t!).sort(), ['capability', 'expires', 'issued', 'token']);
  assert.equal(await ably.pedirToken('../x'), null);
  s.ably.token = 'error';
  assert.equal(await ably.pedirToken('ABC234'), null);
  s.ably.token = 'forma';
  assert.equal(await ably.pedirToken('ABC234'), null);
  s.ably.token = 'ok';
  assert.ok(s.errores.every((e) => !/secreto|Basic|abc123|key invalid/.test(e)), s.errores.join('\n'));
  delete process.env.ABLY_API_KEY;
  assert.equal(await ably.pedirToken('ABC234'), null, 'sin llave no hay token');
}
// Todo lo que salió empieza por el host fijo de Ably y no sigue redirecciones.
assert.ok(s.salientes.every((x) => x.url.startsWith('https://main.realtime.ably.net/') && x.init?.redirect === 'error' && !!x.init.signal));

s.restaurar();
console.log('ably: disponibilidad, publicar (cuerpo, cabeceras, 201, fallos sin romper) y token de solo suscripción sin clientId.');
