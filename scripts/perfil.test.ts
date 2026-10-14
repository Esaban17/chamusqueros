// Prueba de api/perfil.ts, api/_ids.ts y api/_nombres.ts (RF-26 a RF-28, CA-13; A01, A03, A07): sin red, con Neon falso.
//   npx tsx scripts/perfil.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COUNTRIES } from '../src/engine/countries';
import { ALL_CLUBS } from '../src/engine/clubs';
import { CLUB_IDS, COUNTRY_CODES } from '../api/_ids';
import { servidor } from './fixtures/servidor';

// ---------- A3: las listas cerradas coinciden con las del juego ----------
assert.equal(CLUB_IDS.size, ALL_CLUBS.length, 'CLUB_IDS tiene los mismos clubes que ALL_CLUBS');
for (const c of ALL_CLUBS) assert.ok(CLUB_IDS.has(c.id), `falta el club ${c.id} en api/_ids.ts`);
assert.deepEqual([...COUNTRY_CODES].sort(), COUNTRIES.map((c) => c.code).sort(), 'COUNTRY_CODES coincide con COUNTRIES');
const rankingSrc = readFileSync(new URL('../api/ranking.ts', import.meta.url), 'utf8');
const enRanking = [...(rankingSrc.match(/COUNTRY_CODES = new Set\(\[([^\]]*)\]\)/)?.[1] ?? '').matchAll(/'([A-Z]{2})'/g)].map((m) => m[1]).sort();
assert.deepEqual([...COUNTRY_CODES].sort(), enRanking, 'api/_ids.ts y api/ranking.ts listan los mismos países');

const s = servidor({ ably: false }); // el perfil funciona sin Ably (RF-37)
const { GET, PUT } = await import('../api/perfil');
const AVATAR = [1, 2, 3, 0, 1, 10];
const edicion = (o: Record<string, unknown> = {}) => ({ apodo: 'Ana', avatar: AVATAR, club: 'municipal', seleccion: 'GT', ...o });
// Cada PUT avanza el reloj más que la ventana del límite por dispositivo (10/min): los casos de abajo no son sobre el límite, que se prueba aparte.
const put = (d: ReturnType<typeof s.nuevoDispositivo> | null, cuerpo: unknown, extra: { token?: string; texto?: string; ip?: string } = {}) => {
  s.reloj.avanzar(61_000);
  return PUT(s.peticion('PUT', '/api/perfil', { d, cuerpo, ...extra }));
};
const get = (d: ReturnType<typeof s.nuevoDispositivo> | null, extra: { token?: string } = {}) => GET(s.peticion('GET', '/api/perfil', { d, ...extra }));

const ana = s.nuevoDispositivo('Ana');
const beto = s.nuevoDispositivo('Beto');

// Sin perfil: 404 sin_perfil; sin credencial: 401.
{
  const r = await get(ana);
  assert.equal(r.status, 404);
  assert.equal(((await r.json()) as any).error, 'sin_perfil');
  assert.equal((await get(null)).status, 401);
}

// Crear (201) y leer: estadísticas en cero, posición nula, sin mejor carrera.
{
  const r = await put(ana, edicion());
  assert.equal(r.status, 201);
  const cuerpo = (await r.json()) as any;
  assert.equal(cuerpo.apodo, 'Ana'); assert.deepEqual(cuerpo.avatar, AVATAR); assert.equal(cuerpo.club, 'municipal'); assert.equal(cuerpo.seleccion, 'GT');
  assert.deepEqual(cuerpo.estadisticas, { jugadas: 0, victorias: 0, empates: 0, derrotas: 0, rachaTipo: null, rachaN: 0, mejorRachaV: 0, puntos: 0, posicion: null });
  assert.equal(cuerpo.mejorCarrera, null);
  const g = await get(ana);
  assert.equal(g.status, 200);
  assert.deepEqual(await g.json(), cuerpo);
}

// Editar (200) persiste: apodo, avatar, club y selección; null borra el favorito.
{
  const r = await put(ana, edicion({ apodo: '  Ana   María ', avatar: [0, 0, 0, 0, 0, 1], club: null, seleccion: 'MX' }));
  assert.equal(r.status, 200);
  const c = (await r.json()) as any;
  assert.equal(c.apodo, 'Ana María'); assert.equal(c.club, null); assert.equal(c.seleccion, 'MX'); assert.deepEqual(c.avatar, [0, 0, 0, 0, 0, 1]);
  assert.deepEqual(((await (await get(ana)).json()) as any).avatar, [0, 0, 0, 0, 0, 1]);
}

// Otro dispositivo no puede modificarlo aunque conozca el identificador (A01); tampoco leerlo.
{
  const intruso = { ...beto, id: ana.id };
  const r = await put(intruso, edicion({ apodo: 'Intruso' }));
  assert.equal(r.status, 403);
  assert.equal(((await r.json()) as any).error, 'sin_credencial');
  assert.equal((await get(intruso)).status, 403);
  assert.equal(s.bd.jugadores.get(ana.id)!.apodo, 'Ana María', 'no cambió nada');
  // Con el token correcto pero para otro id inexistente en GET: 404 (no hay perfil), no se filtra nada de Ana.
  assert.equal((await get({ ...ana, id: beto.id })).status, 404);
  // Credenciales con forma inválida: 401 sin tocar la base.
  const antes = s.bd.consultas.length;
  for (const mala of [{ ...ana, token: 'corto' }, { ...ana, token: 'x'.repeat(44) }, { ...ana, token: '!'.repeat(43) }]) assert.equal((await get(mala)).status, 401);
  assert.equal((await GET(s.peticion('GET', '/api/perfil', { d: ana, cabeceras: { 'x-jugador-id': 'no-es-uuid' } }))).status, 401);
  assert.equal(s.bd.consultas.length, antes);
}

// El servidor guarda solo el hash del token (A02, A07): ni el token ni nada parecido está en la base falsa ni en lo que se mandó a ella.
{
  const fila = s.bd.jugadores.get(ana.id)!;
  assert.equal(fila.th, s.hash(ana.token));
  assert.ok(!JSON.stringify([...s.bd.jugadores.values()]).includes(ana.token));
  assert.ok(!JSON.stringify(s.bd.consultas).includes(ana.token), 'el token no viaja a Neon');
  assert.ok(s.errores.every((e) => !e.includes(ana.token)));
}

// CA-13: apodos rechazados (400 apodo_rechazado, con el motivo en una frase) y clubes, selecciones y avatares fuera de las listas (400 entrada_invalida).
{
  const antes = JSON.stringify([...s.bd.jugadores.values()]);
  const rechazados = ['a', '<img src=x onerror=alert(1)>', 'juan@correo.com', '5551234567', 'x'.repeat(21), '!!!???', 'PENDEJO', 'Pendéjo', 'p3nd3j0', 'H1jueputa', 'cabrón', '', '   ', 'http://x.co'];
  for (const apodo of rechazados) {
    const r = await put(beto, edicion({ apodo }));
    assert.equal(r.status, 400, `${JSON.stringify(apodo)} debía rechazarse`);
    const c = (await r.json()) as any;
    assert.equal(c.error, 'apodo_rechazado', JSON.stringify(apodo));
    assert.ok(c.mensaje.length > 10);
  }
  const invalidos: Record<string, unknown>[] = [
    { club: 'no-existe' }, { club: 'MUNICIPAL' }, { club: 5 }, { club: '' }, { club: "x'; DROP TABLE retos_jugadores;--" }, { club: {} },
    { seleccion: 'ZZ' }, { seleccion: 'gt' }, { seleccion: 'GTX' }, { seleccion: 7 }, { seleccion: ['GT'] },
    { avatar: [6, 0, 0, 0, 0, 1] }, { avatar: [0, 8, 0, 0, 0, 1] }, { avatar: [0, 0, 6, 0, 0, 1] }, { avatar: [0, 0, 0, 5, 0, 1] }, { avatar: [0, 0, 0, 0, 4, 1] },
    { avatar: [0, 0, 0, 0, 0, 0] }, { avatar: [0, 0, 0, 0, 0, 100] }, { avatar: [0, 0, 0, 0, 0, -1] }, { avatar: [0, 0, 0, 0, 0] }, { avatar: [0, 0, 0, 0, 0, 1, 1] },
    { avatar: [0, 0, 0, 0, 0, 1.5] }, { avatar: ['0', 0, 0, 0, 0, 1] }, { avatar: null }, { avatar: 'xxxxxx' }, { avatar: {} },
    { apodo: 12 }, { apodo: null }, { apodo: ['Ana'] },
  ];
  for (const malo of invalidos) {
    const r = await put(beto, edicion(malo));
    assert.equal(r.status, 400, JSON.stringify(malo));
    assert.ok(['entrada_invalida', 'apodo_rechazado'].includes(((await r.json()) as any).error));
  }
  // Campos de más (por ejemplo, intentar fijar puntos) o de menos, cuerpos que no son un objeto, JSON roto y cuerpos de más de 2 KB.
  for (const cuerpo of [edicion({ puntos: 9999 }), edicion({ id: ana.id }), edicion({ estadisticas: { puntos: 5 } }), { apodo: 'Beto' }, [], [edicion()], 'texto', 5, null]) {
    assert.equal((await put(beto, cuerpo)).status, 400, JSON.stringify(cuerpo));
  }
  assert.equal((await put(beto, null, { texto: '{no es json' })).status, 400);
  assert.equal((await put(beto, null, { texto: JSON.stringify(edicion({ apodo: 'x'.repeat(3000) })) })).status, 400);
  assert.equal((await put(beto, null, { texto: JSON.stringify({ ...edicion(), relleno: 'y'.repeat(2100) }) })).status, 400);
  assert.equal(JSON.stringify([...s.bd.jugadores.values()]), antes, 'nada de eso tocó la base');
  assert.ok(!s.bd.jugadores.has(beto.id), 'el perfil de Beto no se creó');
}

// Aceptados: apodos con tildes, apóstrofo, guion y punto; los nombres comunes que contienen una raíz en medio.
for (const apodo of ['Sofía', "D'Artagnan", 'Ana-Lucía', 'J. Pérez', 'Computadora', 'Vergara', 'Ñoño 10']) {
  const d = s.nuevoDispositivo(apodo);
  assert.equal((await put(d, edicion({ apodo }))).status, 201, apodo);
}

// Estadísticas, posición y mejor carrera (solo lectura): las escribe el servidor al cerrar partidas, nunca el PUT.
{
  const j = s.bd.jugadores.get(ana.id)!;
  Object.assign(j, { puntos: 150, jugadas: 3, victorias: 2, empates: 0, derrotas: 1, racha_tipo: 'V', racha_n: 2, mejor_racha_v: 2, llegada: 5 });
  const otro = [...s.bd.jugadores.values()].find((x) => x.id !== ana.id)!;
  Object.assign(otro, { puntos: 200, victorias: 5, llegada: 1 });
  s.bd.carreras.set(ana.id, { score: 321, titles: 4, caps: 55 });
  const c = (await (await get(ana)).json()) as any;
  assert.deepEqual(c.estadisticas, { jugadas: 3, victorias: 2, empates: 0, derrotas: 1, rachaTipo: 'V', rachaN: 2, mejorRachaV: 2, puntos: 150, posicion: 2 });
  assert.deepEqual(c.mejorCarrera, { score: 321, titles: 4, caps: 55 });
  // Un PUT no toca ni las estadísticas ni la mejor carrera.
  const r = (await (await put(ana, edicion({ apodo: 'Ana B' }))).json()) as any;
  assert.deepEqual(r.estadisticas, c.estadisticas);
  assert.deepEqual(s.bd.carreras.get(ana.id), { score: 321, titles: 4, caps: 55 });
  // Si el ranking de carreras no está disponible, el perfil se muestra igual.
  s.bd.fallarEn('mejorCarrera');
  const sin = await get(ana);
  assert.equal(sin.status, 200);
  assert.equal(((await sin.json()) as any).mejorCarrera, null);
  s.bd.fallarEn(null);
}

// Cabeceras (A02, A05): JSON declarado, sin sniffing, sin caché y sin CORS.
for (const r of [await get(ana), await get(null), await put(ana, edicion({ apodo: 'a' }))]) {
  assert.match(r.headers.get('content-type')!, /^application\/json/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal(r.headers.get('access-control-allow-origin'), null);
}

// Un error de Neon responde genérico, sin detalles internos, y no deja secretos en los registros (A05, A09).
{
  s.bd.fallarEn('leerPerfil');
  const r = await get(ana);
  assert.equal(r.status, 500);
  const t = await r.text();
  assert.ok(!/hunter2|password|neon|XX000/i.test(t), 'sin detalles internos');
  assert.ok(s.errores.length > 0 && s.errores.every((e) => !/hunter2|password|Bearer|authorization/i.test(e) && !e.includes(ana.token)), 'los registros no llevan secretos');
  s.bd.fallarEn(null);
}

// Límites (A04): 10 PUT por minuto por dispositivo, con retry-after; la ventana se reinicia.
{
  const d = s.nuevoDispositivo('Limite');
  let ultimo = 0;
  const ip = '203.0.113.7';
  const rapido = (cuerpo: unknown) => PUT(s.peticion('PUT', '/api/perfil', { d, cuerpo, ip }));
  s.reloj.avanzar(61_000);
  for (let i = 0; i < 12; i++) { const r = await rapido(edicion({ apodo: 'Limite' })); ultimo = r.status; if (i < 10) assert.ok(r.status < 300, `PUT ${i}`); }
  assert.equal(ultimo, 429);
  const r = await rapido(edicion({ apodo: 'Limite' }));
  assert.ok(Number(r.headers.get('retry-after')) >= 1);
  s.reloj.avanzar(61_000);
  assert.ok((await rapido(edicion({ apodo: 'Limite' }))).status < 300, 'la ventana se reinicia');
}

s.restaurar();
console.log('perfil: listas cerradas al día; crear, editar, token ajeno, entradas hostiles, estadísticas de solo lectura, cabeceras, errores y límites.');
