// Prueba de api/sala.ts de punta a punta, sin red: Neon, Ably y Wikidata falsos, reloj controlado (CA-1 a CA-5, CA-10, CA-11, CA-18; A01, A04, A07, A08, A09, A10).
//   npx tsx scripts/sala.test.ts
import assert from 'node:assert/strict';
import { normalizar } from '../api/_retos';
import { CODIGO_RE } from '../src/retos/online/protocolo';
import { servidor, T0, type Dispositivo, type Servidor } from './fixtures/servidor';

// ---------- CA-1: sin la llave de Ably, "en línea no disponible" y nada más se rompe ----------
{
  const s = servidor({ ably: false });
  const { GET, POST } = await import('../api/sala');
  const tok = await import('../api/ably-token');
  const per = await import('../api/perfil');
  const d = s.nuevoDispositivo('Ana');
  assert.equal((await per.PUT(s.peticion('PUT', '/api/perfil', { d, cuerpo: { apodo: 'Ana', avatar: [0, 0, 0, 0, 0, 1], club: null, seleccion: null } }))).status, 201, 'el perfil sigue funcionando');
  const info = await GET(s.peticion('GET', '/api/sala'));
  assert.equal(info.status, 200);
  assert.deepEqual(await info.json(), { enLinea: false });
  const crear = await POST(s.peticion('POST', '/api/sala', { d, cuerpo: { accion: 'crear' } }));
  assert.equal(crear.status, 503);
  const t = await tok.POST(s.peticion('POST', '/api/ably-token', { d, cuerpo: { codigo: 'ABC234' } }));
  assert.equal(t.status, 503);
  const cuerpo = (await t.json()) as any;
  assert.deepEqual(Object.keys(cuerpo).sort(), ['error', 'mensaje'], 'sin detalles internos');
  assert.equal(cuerpo.error, 'en_linea_no_disponible');
  assert.equal((await GET(s.peticion('GET', '/api/sala?codigo=ABC234', { d }))).status, 503);
  // Una llave mal formada tampoco cuenta como disponible.
  process.env.ABLY_API_KEY = 'no-es-una-llave';
  assert.deepEqual(await (await GET(s.peticion('GET', '/api/sala'))).json(), { enLinea: false });
  process.env.ABLY_API_KEY = '';
  assert.deepEqual(await (await GET(s.peticion('GET', '/api/sala'))).json(), { enLinea: false });
  assert.equal(s.salientes.length, 0);
  s.restaurar();
}

const s = servidor();
const { GET, POST } = await import('../api/sala');
const perfilApi = await import('../api/perfil');
const tokenApi = await import('../api/ably-token');

type R = { status: number; body: any; headers: Headers; texto: string };
const leer = async (r: Response): Promise<R> => { const texto = await r.text(); return { status: r.status, body: texto ? JSON.parse(texto) : null, headers: r.headers, texto }; };
const post = async (d: Dispositivo | null, cuerpo: unknown, extra: Parameters<Servidor['peticion']>[2] = {}) => leer(await POST(s.peticion('POST', '/api/sala', { d, cuerpo, ...extra })));
const obtener = async (d: Dispositivo | null, codigo?: string, extra: Parameters<Servidor['peticion']>[2] = {}) =>
  leer(await GET(s.peticion('GET', codigo ? `/api/sala?codigo=${codigo}` : '/api/sala', { d, ...extra })));
const conPerfil = async (apodo: string): Promise<Dispositivo> => {
  const d = s.nuevoDispositivo(apodo);
  const r = await perfilApi.PUT(s.peticion('PUT', '/api/perfil', { d, cuerpo: { apodo, avatar: [1, 2, 3, 0, 1, 10], club: 'municipal', seleccion: 'GT' } }));
  assert.equal(r.status, 201);
  return d;
};
const perfil = async (d: Dispositivo) => (await leer(await perfilApi.GET(s.peticion('GET', '/api/perfil', { d })))).body;

const ana = await conPerfil('Ana');
const beto = await conPerfil('Beto');
const cami = await conPerfil('Cami');

// ---------- CA-1 (con llave) y CA-2: salas ----------
assert.deepEqual((await obtener(null)).body, { enLinea: true });
let codigo: string;
{
  const r = await post(ana, { accion: 'crear' });
  assert.equal(r.status, 201);
  codigo = r.body.sala.codigo;
  assert.match(codigo, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  assert.ok(CODIGO_RE.test(codigo));
  assert.match(r.body.link, new RegExp(`^https://chamusqueros\\.vercel\\.app/\\?sala=${codigo}$`));
  assert.equal(r.body.yo, 0);
  assert.equal(r.body.sala.fase, 'lobby');
  assert.deepEqual(r.body.sala.jugadores, [{ apodo: 'Ana', avatar: [1, 2, 3, 0, 1, 10], club: 'municipal', seleccion: 'GT' }]);
  assert.equal(r.body.sala.ahora, s.reloj.ahora);
  assert.equal(r.body.sala.vence, s.reloj.ahora + 30 * 60_000);
  // El identificador del dispositivo nunca sale (A01).
  assert.ok(!r.texto.includes(ana.id), 'la respuesta no lleva el id del dispositivo');
  assert.ok(!r.texto.includes(ana.token));
  // Ni el encabezado Host decide el dominio del link (A05).
  const raro = await leer(await POST(new Request('https://evil.example/api/sala', { method: 'POST', headers: { host: 'evil.example', 'x-forwarded-host': 'evil.example', 'x-forwarded-for': '10.99.0.1', 'x-jugador-id': beto.id, authorization: `Bearer ${beto.token}` }, body: JSON.stringify({ accion: 'crear' }) })));
  assert.match(raro.body.link, /^https:\/\/chamusqueros\.vercel\.app\/\?sala=/);
  process.env.SITE_URL = 'https://otro.example.com/';
  assert.match((await post(cami, { accion: 'crear' })).body.link, /^https:\/\/otro\.example\.com\/\?sala=/);
  process.env.SITE_URL = 'javascript:alert(1)';
  assert.match((await post(cami, { accion: 'crear' })).body.link, /^https:\/\/chamusqueros\.vercel\.app\//, 'un SITE_URL raro se ignora');
  delete process.env.SITE_URL;
  s.bd.salas.delete(raro.body.sala.codigo);
}
{
  // La vista previa de quien no es de la sala: solo "llena" y el apodo del anfitrión.
  const previa = await obtener(beto, codigo);
  assert.deepEqual(previa.body, { previa: true, llena: false, anfitrion: 'Ana' });
  const sinCred = await obtener(null, codigo);
  assert.deepEqual(sinCred.body, { previa: true, llena: false, anfitrion: 'Ana' });
  // Un código que no existe.
  const no = await obtener(beto, 'ZZZZZZ');
  assert.equal(no.status, 404); assert.equal(no.body.error, 'sala_inexistente');
  // El mismo dispositivo no puede ocupar los dos lugares.
  const mismo = await post(ana, { accion: 'unirse', codigo });
  assert.equal(mismo.status, 409); assert.equal(mismo.body.error, 'mismo_dispositivo');
  // Un invitado entra; vuelve a abrir el link y recibe su sala; un tercero ve "llena".
  const uno = await post(beto, { accion: 'unirse', codigo });
  assert.equal(uno.status, 200); assert.equal(uno.body.yo, 1); assert.equal(uno.body.sala.jugadores.length, 2);
  assert.equal((await post(beto, { accion: 'unirse', codigo })).body.yo, 1);
  const tercero = await post(cami, { accion: 'unirse', codigo });
  assert.equal(tercero.status, 409); assert.equal(tercero.body.error, 'sala_llena');
  assert.deepEqual((await obtener(cami, codigo)).body, { previa: true, llena: true, anfitrion: 'Ana' });
  // Los dos miembros ven su sala completa; los ids no salen.
  const g = await obtener(beto, codigo);
  assert.equal(g.body.yo, 1); assert.equal(g.body.sala.codigo, codigo);
  for (const id of [ana.id, beto.id, cami.id]) assert.ok(!g.texto.includes(id));
  // Sin perfil no se entra (RF-31); con credencial ajena, tampoco.
  const sinPerfil = s.nuevoDispositivo('Sin');
  assert.equal((await post(sinPerfil, { accion: 'unirse', codigo })).status, 404);
  assert.equal((await post({ ...cami, token: beto.token }, { accion: 'unirse', codigo })).status, 403);
  assert.equal((await post(null, { accion: 'unirse', codigo })).status, 401);
  // El invitado no puede cambiar la categoría; "Empezar" es del anfitrión y necesita 2 jugadores.
  const cfg = { accion: 'configurar', codigo, config: { modo: 'preguntas', ref: null } };
  const rechazo = await post(beto, cfg);
  assert.equal(rechazo.status, 403); assert.equal(rechazo.body.error, 'no_anfitrion');
  assert.equal((await post(beto, { accion: 'empezar', codigo })).body.error, 'no_anfitrion');
  assert.equal((await post(ana, { accion: 'configurar', codigo, config: { modo: 'pais', ref: 'ZZ' } })).status, 400);
  assert.equal((await post(ana, cfg)).status, 200);
  assert.equal((await obtener(beto, codigo)).body.sala.config.modo, 'preguntas');
  // Un tercero que no es de la sala no puede hacer nada con ella.
  for (const a of [{ accion: 'empezar', codigo }, { accion: 'salir', codigo }, { accion: 'vencer', codigo, v: 1 }, { accion: 'revancha', codigo }, { accion: 'jugar', codigo, jugada: { t: 'responder', opcion: 0 } }]) {
    const x = await post(cami, a);
    assert.equal(x.status, 403, JSON.stringify(a)); assert.equal(x.body.error, 'no_miembro');
  }
  const sola = await post(cami, { accion: 'crear' });
  assert.equal((await post(cami, { accion: 'empezar', codigo: sola.body.sala.codigo })).status, 409, 'con un solo jugador no se empieza');
}

// ---------- Empezar una partida de preguntas (CA-6/CA-8 en servidor): lo que viaja no lleva secretos ----------
const salaInterna = (c: string) => s.bd.salas.get(c)!.estado;
const publicado = () => s.ably.llamadas.filter((l) => l.url.includes('/messages'));
{
  s.ably.llamadas.length = 0;
  const e = await post(ana, { accion: 'empezar', codigo });
  assert.equal(e.status, 200); assert.equal(e.body.sala.fase, 'jugando');
  const j = e.body.sala.partida.juego;
  assert.equal(j.cat, 'preguntas'); assert.equal(j.fase, 'pregunta'); assert.equal(j.revelado, null);
  assert.ok(!e.texto.includes('"correcta"') && !e.texto.includes('"respuestas"'));
  // La publicación a Ably: un evento con la versión y la vista pública completa, con id idempotente.
  const ult = publicado().at(-1)!;
  assert.equal(ult.url, `https://main.realtime.ably.net/channels/retos%3A${codigo}/messages`);
  assert.equal(ult.metodo, 'POST');
  assert.equal(ult.cuerpo.name, 'estado');
  assert.equal(ult.cuerpo.id, `${codigo}:${e.body.sala.v}`);
  assert.equal(ult.cuerpo.data.v, e.body.sala.v);
  assert.deepEqual(ult.cuerpo.data.sala.partida.juego, j);
  assert.equal(ult.autorizacion, `Basic ${Buffer.from('abc123.def456:secreto-de-prueba_1').toString('base64')}`);
  assert.equal(ult.redirect, 'error');
  // Nada de lo publicado lleva ids, tokens ni lo que no se debe ver.
  const todo = JSON.stringify(publicado().map((p) => p.cuerpo));
  for (const x of [ana.id, beto.id, ana.token, beto.token, '"correcta"', '"respuestas"', '"usados"', '"miembros"']) assert.ok(!todo.includes(x), `lo publicado lleva ${x}`);
}
// Reconexión (CA-3): recargar a mitad de una pregunta devuelve la misma, con el tiempo restante correcto (± 1 s).
{
  const antes = (await obtener(beto, codigo)).body.sala;
  s.reloj.avanzar(7000);
  const despues = (await obtener(beto, codigo)).body;
  assert.equal(despues.sala.partida.juego.pregunta, antes.partida.juego.pregunta);
  assert.equal(despues.sala.partida.juego.deadline - despues.sala.ahora, 20_000 - 7000);
  assert.equal(despues.sala.v, antes.v, 'leer no cambia la versión');
  assert.equal(despues.yo, 1);
}
// Jugada de quien no es de la sala o sin credencial: rechazada (CA-5).
{
  const antes = JSON.stringify(salaInterna(codigo));
  assert.equal((await post(cami, { accion: 'jugar', codigo, jugada: { t: 'responder', opcion: 0 } })).status, 403);
  assert.equal((await post(null, { accion: 'jugar', codigo, jugada: { t: 'responder', opcion: 0 } })).status, 401);
  assert.equal((await post({ ...ana, token: beto.token }, { accion: 'jugar', codigo, jugada: { t: 'responder', opcion: 0 } })).status, 403, 'nadie juega por otro con un token ajeno');
  assert.equal(JSON.stringify(salaInterna(codigo)), antes);
}

// ---------- Vencimiento de la sala a los 30 minutos (CA-3) ----------
{
  const c = (await post(cami, { accion: 'crear' })).body.sala.codigo;
  const t0 = s.reloj.ahora;
  s.reloj.set(t0 + 29 * 60_000 + 59_000);
  assert.equal((await obtener(cami, c)).status, 200, 'a los 29 min 59 s sigue viva');
  s.reloj.set(t0 + 30 * 60_000 + 1000);
  const v = await obtener(cami, c);
  assert.equal(v.status, 410); assert.equal(v.body.error, 'sala_vencida');
  assert.equal((await obtener(beto, c)).status, 410, 'quien no es de la sala ve lo mismo');
  assert.equal((await post(cami, { accion: 'configurar', codigo: c, config: { modo: 'pais', ref: null } })).status, 410);
  assert.equal((await post(beto, { accion: 'unirse', codigo: c })).status, 410);
  // Con actividad, la sala se mantiene: cada guardado reinicia los 30 minutos.
  s.reloj.set(t0 + 40 * 60_000);
  const c2 = (await post(cami, { accion: 'crear' })).body.sala.codigo;
  s.reloj.avanzar(20 * 60_000);
  assert.equal((await post(cami, { accion: 'configurar', codigo: c2, config: { modo: 'club', ref: null } })).status, 200);
  s.reloj.avanzar(20 * 60_000);
  assert.equal((await obtener(cami, c2)).status, 200);
  s.reloj.set(t0 + 40 * 60_000 + 0);
  s.reloj.set(t0 + 120 * 60_000);
}

// ---------- Ping pong con la fuente falsa (CA-5) y puntos de ranking (CA-10, CA-11) ----------
let nombres = 0;
const letras = (n: number) => { let t = ''; do { t = String.fromCharCode(97 + (n % 26)) + t; n = Math.floor(n / 26) - 1; } while (n >= 0); return t; };
const conocer = (nombre: string) => { s.wikidata.conocidos.set(normalizar(nombre), { q: `Q${100000 + s.wikidata.conocidos.size}`, nombre }); return nombre; };
const nuevoNombre = () => conocer(`Futbolista ${letras(nombres++)} Prueba`);
const vista = async (d: Dispositivo, c: string) => (await obtener(d, c)).body.sala;

/** Una sala nueva de Ana (anfitrión) y Beto con esa categoría, ya empezada. */
async function sala2(config: { modo: string; ref: string | null }, a = ana, b = beto): Promise<string> {
  const c = (await post(a, { accion: 'crear' })).body.sala.codigo;
  assert.equal((await post(b, { accion: 'unirse', codigo: c })).status, 200);
  assert.equal((await post(a, { accion: 'configurar', codigo: c, config })).status, 200);
  assert.equal((await post(a, { accion: 'empezar', codigo: c })).status, 200);
  return c;
}
const vencerAmbos = async (c: string, v?: number) => {
  const vv = v ?? (await vista(ana, c)).v;
  return Promise.all([post(ana, { accion: 'vencer', codigo: c, v: vv }), post(beto, { accion: 'vencer', codigo: c, v: vv })]);
};

/** Juega el ping pong hasta que gane `w`: cada uno acepta futbolistas hasta su cupo; el primero que ya cumplió su cupo en su turno deja pasar el tiempo. */
async function pingHasta(c: string, w: Dispositivo, l: Dispositivo, cupoW: number, cupoL: number) {
  const cuenta = new Map<string, number>([[w.id, 0], [l.id, 0]]);
  const cupo = new Map<string, number>([[w.id, cupoW], [l.id, cupoL]]);
  for (let i = 0; i < 60; i++) {
    const sv = await vista(w, c);
    if (sv.fase === 'fin') return sv;
    const turno = sv.partida.juego.turno;
    const d = sv.jugadores[turno].apodo === 'Ana' ? ana : beto;
    if ((cuenta.get(d.id) ?? 0) >= (cupo.get(d.id) ?? 0)) {
      s.reloj.avanzar(15_001);
      await vencerAmbos(c, sv.v);
    } else {
      const r = await post(d, { accion: 'jugar', codigo: c, jugada: { t: 'texto', texto: nuevoNombre() } });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      cuenta.set(d.id, (cuenta.get(d.id) ?? 0) + 1);
    }
  }
  throw new Error('la partida no terminó');
}
{
  const c = await sala2({ modo: 'pais', ref: 'AR' });
  const v0 = await vista(ana, c);
  assert.equal(v0.partida.juego.cat, 'pais'); assert.equal(v0.partida.juego.turno, 0);
  // Fuera de turno y jugada de otro tipo: rechazadas; el reloj lo manda el servidor.
  const fuera = await post(beto, { accion: 'jugar', codigo: c, jugada: { t: 'texto', texto: 'Lionel Messi' } });
  assert.equal(fuera.status, 409); assert.equal(fuera.body.error, 'fuera_de_turno');
  assert.equal((await post(ana, { accion: 'jugar', codigo: c, jugada: { t: 'responder', opcion: 1 } })).body.error, 'fase_incorrecta');
  // Un "cerrar plazo" 1 ms antes del plazo se rechaza (con lo que falta); 1 ms después se acepta.
  s.reloj.set(v0.partida.juego.deadline - 1);
  const aun = await post(beto, { accion: 'vencer', codigo: c, v: v0.v });
  assert.equal(aun.status, 409); assert.equal(aun.body.error, 'aun_no'); assert.equal(aun.body.faltanMs, 2);
  assert.equal((await vista(ana, c)).fase, 'jugando');
  s.reloj.set(v0.partida.juego.deadline + 1);
  // Dos "cerrar plazo" simultáneos producen UNA sola transición y la partida se anota una vez (CA-5, CA-11).
  const [x, y] = await vencerAmbos(c, v0.v);
  assert.equal(x.status, 200); assert.equal(y.status, 200);
  assert.equal((await vista(ana, c)).fase, 'fin');
  assert.equal(s.bd.partidas.filter((p) => p.sala === c).length, 1, 'se anotó una sola vez');
  assert.equal(s.bd.salas.get(c)!.estado.partida.final.ganador, 1);
  // Partida muy corta (0 futbolistas): nadie suma y la pantalla lo dice (CA-10).
  const f = (await vista(ana, c)).partida.final;
  assert.deepEqual(f.rankingGanado, [0, 0]); assert.deepEqual(f.sinPuntos, ['corta', 'corta']);
  assert.equal((await perfil(ana)).estadisticas.jugadas, 0, 'una partida corta no cuenta en las estadísticas');
}
{
  // Fuente caída: decide el rival (20 s) y su silencio acepta; fuente caída después de aceptar no rompe la partida.
  const c = await sala2({ modo: 'club', ref: 'municipal' });
  s.wikidata.modo = 'cae';
  const nom = conocer('Futbolista Caida Prueba');
  const r = await post(ana, { accion: 'jugar', codigo: c, jugada: { t: 'texto', texto: nom } });
  assert.equal(r.status, 200);
  assert.equal(r.body.sala.partida.juego.fase, 'decide'); assert.equal(r.body.sala.partida.juego.porFuente, true);
  s.wikidata.modo = 'normal';
  s.reloj.avanzar(20_001);
  await vencerAmbos(c);
  const t = (await vista(ana, c)).partida.juego;
  assert.equal(t.fase, 'turno'); assert.equal(t.turno, 1); assert.equal(t.jugadas[0].sinVerificar, true);
  assert.ok(!JSON.stringify(t).includes('"qid"'));
  // La fuente dice "no cumple": 10 s para apelar. Beto escribe un nombre desconocido.
  const r2 = await post(beto, { accion: 'jugar', codigo: c, jugada: { t: 'texto', texto: 'Nombre Desconocido Total' } });
  assert.equal(r2.body.sala.partida.juego.fase, 'rechazado');
  assert.equal((await post(ana, { accion: 'jugar', codigo: c, jugada: { t: 'apelar', apelar: true } })).body.error, 'fuera_de_turno');
  const ap = await post(beto, { accion: 'jugar', codigo: c, jugada: { t: 'apelar', apelar: true } });
  assert.equal(ap.body.sala.partida.juego.fase, 'decide'); assert.equal(ap.body.sala.partida.juego.porFuente, false);
  assert.equal((await post(beto, { accion: 'jugar', codigo: c, jugada: { t: 'decidir', vale: true } })).body.error, 'fuera_de_turno', 'el autor no decide su propia apelación');
  const ok = await post(ana, { accion: 'jugar', codigo: c, jugada: { t: 'decidir', vale: true } });
  assert.equal(ok.body.sala.partida.juego.jugadas[1].apelacion, true);
  // Una repetición no se apela: pierde quien repite (tras la apelación aceptada es el turno de Ana, que repite al de la fuente caída por texto).
  const rep = await post(ana, { accion: 'jugar', codigo: c, jugada: { t: 'texto', texto: nom } });
  assert.equal(rep.body.sala.fase, 'fin');
  assert.match(rep.body.sala.partida.final.motivo, /Ana repitió/);
  assert.equal(rep.body.sala.partida.final.ganador, 1);
}
// CA-10: la 1.ª partida entre A y B (A gana con 6 futbolistas, B con 5): A suma 130 y B suma 35; a la 2.ª, 62 y 17 (B abre y quedan 5 y 5); a la 3.ª, 32 y 8; a la 4.ª, 0 y 0.
{
  const esperado = [[130, 35, null], [62, 17, null], [32, 8, null], [0, 0, 'repetida']] as const;
  s.reloj.avanzar(61_000);
  const c = await sala2({ modo: 'pais', ref: 'AR' });
  let acum = [0, 0];
  for (let i = 0; i < 4; i++) {
    const sv = await pingHasta(c, ana, beto, i === 1 ? 5 : 6, 5);
    const f = sv.partida.final;
    assert.deepEqual([f.rankingGanado[0], f.rankingGanado[1]], [esperado[i][0], esperado[i][1]], `partida ${i + 1}`);
    assert.deepEqual(f.sinPuntos, [esperado[i][2], esperado[i][2]]);
    acum = [acum[0] + esperado[i][0], acum[1] + esperado[i][1]];
    const [pa, pb] = [await perfil(ana), await perfil(beto)];
    assert.equal(pa.estadisticas.puntos, acum[0]); assert.equal(pb.estadisticas.puntos, acum[1]);
    if (i < 3) {
      s.reloj.avanzar(61_000); // (se acaba la ventana de los límites por minuto antes de la siguiente partida)
      assert.equal((await post(ana, { accion: 'revancha', codigo: c })).body.sala.revancha[0], true);
      assert.equal((await post(beto, { accion: 'revancha', codigo: c })).body.sala.fase, 'jugando');
    }
  }
  // Rachas y conteo: las 3 primeras suman (V para Ana); la 4.ª no cuenta en estadísticas (no sumó puntos), pero sí quedó anotada.
  const pa = await perfil(ana);
  assert.deepEqual([pa.estadisticas.jugadas, pa.estadisticas.victorias, pa.estadisticas.rachaN, pa.estadisticas.rachaTipo, pa.estadisticas.mejorRachaV], [3, 3, 3, 'V', 3]);
  const pb = await perfil(beto);
  assert.deepEqual([pb.estadisticas.jugadas, pb.estadisticas.derrotas, pb.estadisticas.rachaTipo], [3, 3, 'D']);
  assert.equal(s.bd.partidas.filter((p) => p.sala === c).length, 4);
  // Un POST armado a mano con puntos no cambia nada; los puntos no se envían.
  const antes = JSON.stringify([...s.bd.jugadores.values()]);
  for (const cuerpo of [{ accion: 'vencer', codigo: c, v: 1, puntos: 999 }, { accion: 'revancha', codigo: c, rankingGanado: [500, 0] }, { accion: 'jugar', codigo: c, jugada: { t: 'responder', opcion: 0, puntos: 500 } }]) {
    assert.equal((await post(ana, cuerpo)).status, 400);
  }
  assert.equal(JSON.stringify([...s.bd.jugadores.values()]), antes);
  // Ranking de la sección (CA-12) se prueba en retos-ranking.test.ts; aquí, la posición en el perfil.
  assert.equal((await perfil(ana)).estadisticas.posicion, 1);
  assert.equal((await perfil(beto)).estadisticas.posicion, 2);
}
// Tope diario: con 600 puntos sumados en 24 h, la partida siguiente suma 0 y dice "tope" (CA-10).
{
  const c1 = await sala2({ modo: 'pais', ref: 'AR' }, cami, ana);
  const d = cami;
  const j = s.bd.jugadores.get(d.id)!;
  j.puntos += 600;
  s.bd.partidas.push({ sala: 'ZZZ222', num: 1, a: d.id, b: ana.id, puntosA: 600, puntosB: 0, valida: true, cerrada: s.reloj.ahora - 3600_000 });
  const mio = { Cami: cami, Ana: ana } as Record<string, Dispositivo>;
  void mio;
  // Cami (anfitriona) gana 6-5 contra Ana: ya llevaba 600.
  for (let i = 0; i < 60; i++) {
    const sv = await vista(cami, c1);
    if (sv.fase === 'fin') break;
    const turno = sv.partida.juego.turno;
    const dev = turno === 0 ? cami : ana;
    const n = sv.partida.juego.jugadas.filter((x: any) => x.jugador === turno).length;
    if (dev === ana && n >= 5) { s.reloj.avanzar(15_001); await Promise.all([post(cami, { accion: 'vencer', codigo: c1, v: sv.v }), post(ana, { accion: 'vencer', codigo: c1, v: sv.v })]); } else await post(dev, { accion: 'jugar', codigo: c1, jugada: { t: 'texto', texto: nuevoNombre() } });
  }
  const f = (await vista(cami, c1)).partida.final;
  assert.equal(f.rankingGanado[0], 0); assert.equal(f.sinPuntos[0], 'tope');
}

// ---------- Abandono (CA-4) con el servidor ----------
{
  // Quien desaparece pierde por abandono tras dos plazos seguidos; el abandono cuenta como derrota; el rival gana si la partida cumplió el mínimo.
  const a = await conPerfil('Abi'), b = await conPerfil('Bru');
  const c = await sala2({ modo: 'preguntas', ref: null }, a, b);
  const correcta = () => salaInterna(c).partida.juego.actual.correcta;
  for (let i = 0; i < 3; i++) {    // 3 preguntas cerradas: cumple el mínimo
    await post(a, { accion: 'jugar', codigo: c, jugada: { t: 'responder', opcion: correcta() } });
    await post(b, { accion: 'jugar', codigo: c, jugada: { t: 'responder', opcion: correcta() } });
    s.reloj.avanzar(3001);
    const v = (await vista(a, c)).v;
    await Promise.all([post(a, { accion: 'vencer', codigo: c, v }), post(b, { accion: 'vencer', codigo: c, v })]);
  }
  // Bru desaparece; Abi sigue conectada y manda "vencer" cuando su reloj llega a 0. A los dos plazos seguidos sin ninguna petición de Bru, abandona
  // (el "vencer" tardío que Bru mandó al cerrar la tercera pregunta cuenta como presencia en el plazo siguiente, así que son hasta 3 vencimientos).
  let fin: R | null = null;
  for (let i = 0; i < 5 && !fin; i++) {
    s.reloj.avanzar(20_001);
    const v = (await vista(a, c)).v;
    const r = await post(a, { accion: 'vencer', codigo: c, v });
    assert.equal(r.status, 200);
    if (r.body.sala.fase === 'fin') fin = r;
    else assert.ok(i < 3, 'Bru debía haber abandonado');
  }
  assert.ok(fin);
  assert.equal(fin!.body.sala.partida.final.abandono, 1); assert.equal(fin!.body.sala.partida.final.ganador, 0);
  const [pa, pb] = [await perfil(a), await perfil(b)];
  assert.equal(pa.estadisticas.victorias, 1); assert.ok(pa.estadisticas.puntos > 0);
  assert.equal(pb.estadisticas.derrotas, 1); assert.equal(pb.estadisticas.puntos, 0, 'quien abandona recibe 0');
  assert.equal(s.bd.partidas.filter((p) => p.sala === c).length, 1);
  // Terminada una sola vez: más vencer/salir no la anotan de nuevo.
  await post(a, { accion: 'vencer', codigo: c, v: (await vista(a, c)).v });
  await post(b, { accion: 'salir', codigo: c });
  assert.equal(s.bd.partidas.filter((p) => p.sala === c).length, 1);
  assert.equal((await perfil(b)).estadisticas.jugadas, 1);
  assert.equal((await vista(a, c)).salio, 1);
  assert.equal((await post(a, { accion: 'revancha', codigo: c })).body.error, 'fase_incorrecta', 'si el rival salió, no hay revancha');
}
{
  // Abandono en una partida muy corta: el rival no suma; quien abandona cuenta una derrota (CA-11).
  const a = await conPerfil('Ada'), b = await conPerfil('Bea');
  const c = await sala2({ modo: 'preguntas', ref: null }, a, b);
  const r = await post(b, { accion: 'salir', codigo: c });
  assert.equal(r.body.sala.partida.final.abandono, 1);
  assert.deepEqual(r.body.sala.partida.final.sinPuntos, ['corta', 'corta']);
  const [pa, pb] = [await perfil(a), await perfil(b)];
  assert.deepEqual([pa.estadisticas.jugadas, pa.estadisticas.puntos], [0, 0]);
  assert.deepEqual([pb.estadisticas.jugadas, pb.estadisticas.derrotas, pb.estadisticas.rachaTipo], [1, 1, 'D']);
}

// ---------- Concurrencia: otra petición cambia la sala justo antes de guardar ----------
{
  const a = await conPerfil('Cora'), b = await conPerfil('Dino');
  const c = await sala2({ modo: 'preguntas', ref: null }, a, b);
  const correcta = salaInterna(c).partida.juego.actual.correcta;
  let interferido = 0;
  s.bd.gancho = (tag) => {
    if (tag === 'guardarSala' && interferido++ === 0) { // "el otro celular" responde justo antes de que se guarde la respuesta de Cora
      const f = s.bd.salas.get(c)!;
      f.estado.partida.juego.respuestas[1] = (correcta + 1) % 4;
      f.estado.v++;
      f.version++;
    }
  };
  const r = await post(a, { accion: 'jugar', codigo: c, jugada: { t: 'responder', opcion: correcta } });
  s.bd.gancho = null;
  assert.equal(r.status, 200);
  assert.equal(r.body.sala.partida.juego.fase, 'revelado', 'se releyó la sala y se recalculó: ahora los dos respondieron');
  assert.deepEqual(r.body.sala.partida.juego.revelado.elegida, [correcta, (correcta + 1) % 4]);
  // Si la sala sigue cambiando, tras 3 intentos responde "conflicto" y no guarda nada a medias.
  const c2 = await sala2({ modo: 'preguntas', ref: null }, a, b);
  const copia = JSON.stringify(salaInterna(c2));
  s.bd.gancho = (tag) => { if (tag === 'guardarSala') s.bd.salas.get(c2)!.version++; };
  const x = await post(a, { accion: 'jugar', codigo: c2, jugada: { t: 'responder', opcion: 0 } });
  s.bd.gancho = null;
  assert.equal(x.status, 409); assert.equal(x.body.error, 'conflicto');
  assert.equal(JSON.stringify(salaInterna(c2)), copia);
}

// ---------- CA-18: entradas hostiles → 400 sin llamar a ningún servicio externo ni gastar consultas ----------
{
  const c = codigo;
  const salientes0 = s.salientes.length;
  const consultas0 = s.bd.consultas.length;
  const hostiles: unknown[] = [
    { accion: 'borrar', codigo: c }, { accion: 'jugar', codigo: c }, { accion: 'jugar', codigo: c, jugada: { t: 'texto', texto: 5 } },
    { accion: 'jugar', codigo: c, jugada: { t: 'texto', texto: 'x'.repeat(300) } }, { accion: 'jugar', codigo: c, jugada: { t: 'responder', opcion: 4 } },
    { accion: 'jugar', codigo: c, jugada: { t: 'responder', opcion: '1' } }, { accion: 'jugar', codigo: c, jugada: { t: 'otra' } }, { accion: 'jugar', codigo: c, jugada: [] },
    { accion: 'jugar', codigo: c, jugada: { t: 'apelar', apelar: 'si' } }, { accion: 'jugar', codigo: c, jugada: { t: 'decidir', vale: 1 } },
    { accion: 'jugar', codigo: c, jugada: { t: 'texto', texto: 'ok', extra: 1 } },
    { accion: 'vencer', codigo: c }, { accion: 'vencer', codigo: c, v: -1 }, { accion: 'vencer', codigo: c, v: 1.5 }, { accion: 'vencer', codigo: c, v: '1' }, { accion: 'vencer', codigo: c, v: 2 ** 40 },
    { accion: 'unirse' }, { accion: 'unirse', codigo: 'abc234' }, { accion: 'unirse', codigo: 'ABC23' }, { accion: 'unirse', codigo: 'ABC2345' }, { accion: 'unirse', codigo: 'ABCO01' },
    { accion: 'unirse', codigo: "ABC234'; DROP TABLE retos_salas;--" }, { accion: 'unirse', codigo: ['ABC234'] }, { accion: 'unirse', codigo: { $ne: null } },
    { accion: 'unirse', codigo: c, otro: true }, { accion: 'crear', extra: 1 }, { accion: 'configurar', codigo: c }, { accion: 'configurar', codigo: c, config: { modo: 'xx', ref: null } },
    { accion: 'configurar', codigo: c, config: { modo: 'pais', ref: '<script>' } }, { accion: 'configurar', codigo: c, config: { modo: 'pais', ref: null, extra: 1 } },
    { accion: 'empezar', codigo: c, config: {} }, { accion: ['crear'] }, { accion: { toString: 'x' } }, { __proto__: { accion: 'crear' } }, { constructor: { prototype: {} } },
    [], [{ accion: 'crear' }], 'crear', 7, null, true,
  ];
  for (const h of hostiles) {
    const r = await post(ana, h);
    assert.equal(r.status, 400, `${JSON.stringify(h)} debía dar 400, dio ${r.status}`);
    assert.equal(r.body.error, 'entrada_invalida');
    assert.ok(!/at |\/Users\/|node_modules|neon|sql/i.test(r.texto), 'sin detalles internos');
  }
  for (const texto of ['{roto', '', '{"accion":"crear"', 'x'.repeat(5000), JSON.stringify({ accion: 'crear', relleno: 'y'.repeat(2100) })]) {
    assert.equal((await post(ana, null, { texto })).status, 400, texto.slice(0, 30));
  }
  for (const q of ['abc234', 'ABC23', '../../etc', 'ABC234&x=1', 'ABCO01', '%00', "ABC234'--", 'A'.repeat(500)]) {
    const r = await obtener(ana, encodeURIComponent(q));
    assert.equal(r.status, 400, q);
  }
  assert.equal(s.salientes.length, salientes0, 'ninguna llamada a un servicio externo');
  assert.equal(s.bd.consultas.length, consultas0, 'ni una consulta a la base');
  // Un texto de futbolista con comillas, operadores o SPARQL nunca llega a Wikidata.
  const cc = await sala2({ modo: 'pais', ref: 'AR' });
  const w0 = s.wikidata.llamadas.length;
  for (const t of ['" haswbstatement:P27=Q1', "Messi'; DROP", 'Messi" OR "', '<b>Messi</b>', 'Mes\u0000si', 'a', 'Messi 10', 'x'.repeat(41), '{{template}}', 'Messi|P54']) {
    const r = await post(ana, { accion: 'jugar', codigo: cc, jugada: { t: 'texto', texto: t } });
    assert.equal(r.status, 400, t);
  }
  assert.equal(s.wikidata.llamadas.length, w0, 'ningún texto hostil llegó a Wikidata');
}

// ---------- A10: toda llamada saliente va a un host fijo y sin seguir redirecciones ----------
{
  assert.ok(s.salientes.length > 0);
  for (const { url, init } of s.salientes) {
    assert.ok(url.startsWith('https://main.realtime.ably.net/') || url.startsWith('https://www.wikidata.org/w/api.php?'), `llamada saliente inesperada: ${url}`);
    assert.equal(init?.redirect, 'error', url);
    assert.ok(init?.signal, `sin plazo: ${url}`);
  }
}

// ---------- A04: límites de uso ----------
{
  // Fuerza bruta de códigos: 20 intentos por minuto por IP para quien no es de la sala.
  const ip = '198.51.100.20';
  let ultimo = 0;
  for (let i = 0; i < 25; i++) { const r = await obtener(null, 'ZZZZZ' + 'ABCDEFGHJKMNPQRSTUVWXYZ'[i % 20], { ip }); ultimo = r.status; if (i < 20) assert.equal(r.status, 404); }
  assert.equal(ultimo, 429);
  const r = await obtener(null, 'ZZZZZA', { ip });
  assert.ok(Number(r.headers.get('retry-after')) >= 1);
  assert.equal(r.body.error, 'limite');
  // Crear: 5 salas por hora por dispositivo, contadas en Neon, aunque cambie la IP.
  const d = await conPerfil('Spam');
  const estados: number[] = [];
  for (let i = 0; i < 7; i++) estados.push((await post(d, { accion: 'crear' })).status);
  assert.deepEqual(estados, [201, 201, 201, 201, 201, 429, 429]);
  // Pasada la hora, vuelve a poder.
  s.reloj.avanzar(3600_000 + 1000);
  assert.equal((await post(d, { accion: 'crear' })).status, 201);
  // Jugadas: 30 por minuto por dispositivo; vencer 60.
  const c = (await post(d, { accion: 'crear' })).body.sala.codigo;
  const rs: number[] = [];
  for (let i = 0; i < 32; i++) rs.push((await post(d, { accion: 'jugar', codigo: c, jugada: { t: 'responder', opcion: 0 } })).status);
  assert.equal(rs.filter((x) => x === 429).length, 2);
  assert.equal(rs.indexOf(429), 30);
  const vs: number[] = [];
  s.reloj.avanzar(61_000);
  for (let i = 0; i < 62; i++) vs.push((await post(d, { accion: 'vencer', codigo: c, v: 1 })).status);
  assert.equal(vs.filter((x) => x === 429).length, 2);
  // Unirse: 20 por minuto por IP.
  const ipU = '198.51.100.30';
  const us: number[] = [];
  s.reloj.avanzar(61_000);
  for (let i = 0; i < 22; i++) us.push((await post(d, { accion: 'unirse', codigo: 'ZZZZZZ' }, { ip: ipU })).status);
  assert.equal(us.filter((x) => x === 429).length, 2);
  // Una inundación por IP se corta antes de gastar consultas.
  const ipF = '198.51.100.40';
  s.reloj.avanzar(61_000);
  let n429 = 0; const q0 = s.bd.consultas.length;
  for (let i = 0; i < 260; i++) if ((await obtener(null, undefined, { ip: ipF })).status === 429) n429++;
  assert.equal(n429, 20);
  assert.equal(s.bd.consultas.length, q0, 'GET de información no usa la base');
  // Ventana nueva.
  s.reloj.avanzar(61_000);
  assert.equal((await obtener(null, undefined, { ip: ipF })).status, 200);
}

// ---------- A07: el código de sala sale de un alfabeto sin ambigüedades y de forma pareja; el hash es todo lo que se guarda ----------
{
  const { codigoNuevo } = await import('../api/_ids');
  const cuenta = new Map<string, number>();
  for (let i = 0; i < 31 * 600; i++) { const c = codigoNuevo(); assert.match(c, CODIGO_RE); for (const ch of c) cuenta.set(ch, (cuenta.get(ch) ?? 0) + 1); }
  assert.equal(cuenta.size, 31);
  const media = (31 * 600 * 6) / 31;
  for (const [ch, n] of cuenta) assert.ok(Math.abs(n - media) < media * 0.12, `el carácter ${ch} sale ${n} veces (esperado ≈ ${media})`);
  for (const d of [ana, beto, cami]) assert.ok(!JSON.stringify([...s.bd.jugadores.values(), ...s.bd.salas.values()]).includes(d.token));
  assert.ok(!JSON.stringify(s.bd.consultas).includes(ana.token));
}
// El código reciclado: no se crea una sala con un código que ya tiene partidas anotadas (el ON CONFLICT DO NOTHING perdería los puntos en silencio).
{
  const bd = await import('../api/_bd');
  s.bd.partidas.push({ sala: 'QQQ222', num: 1, a: ana.id, b: beto.id, puntosA: 1, puntosB: 1, valida: true, cerrada: s.reloj.ahora });
  assert.equal(await bd.crearSala('QQQ222', ana.id, {}, s.reloj.ahora), false);
  assert.equal(await bd.crearSala('QQQ223', ana.id, {}, s.reloj.ahora), true);
  assert.equal(await bd.crearSala('QQQ223', ana.id, {}, s.reloj.ahora), false, 'tampoco uno que ya existe');
}
// Retención perezosa al crear: las salas de más de 1 hora sin actividad se borran.
{
  const d = await conPerfil('Limpia');
  const vieja = (await post(d, { accion: 'crear' })).body.sala.codigo;
  s.reloj.avanzar(61 * 60_000);
  const d2 = await conPerfil('Limpia2');
  await post(d2, { accion: 'crear' });
  assert.ok(!s.bd.salas.has(vieja), 'la sala vieja se borró');
}

// ---------- A02, A05, A09: cabeceras, errores sin detalles y registros sin secretos ----------
{
  const casos: Response[] = [
    await GET(s.peticion('GET', '/api/sala')), await GET(s.peticion('GET', `/api/sala?codigo=${codigo}`, { d: ana })), await GET(s.peticion('GET', '/api/sala?codigo=ZZZZZZ', { d: ana })),
    await POST(s.peticion('POST', '/api/sala', { d: ana, cuerpo: { accion: 'x' } })), await POST(s.peticion('POST', '/api/sala', { d: null, cuerpo: { accion: 'crear' } })),
    await POST(s.peticion('POST', '/api/sala', { d: ana, cuerpo: { accion: 'unirse', codigo: 'ZZZZZZ' } })),
  ];
  for (const r of casos) {
    assert.match(r.headers.get('content-type')!, /^application\/json/);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(r.headers.get('access-control-allow-origin'), null, 'sin CORS abierto');
  }
  // Un error de Neon: 500 genérico; nada de «hunter2», contraseñas ni cabeceras en el cuerpo ni en los registros.
  s.errores.length = 0;
  s.bd.fallarEn('leerSala');
  const e1 = await leer(await GET(s.peticion('GET', `/api/sala?codigo=${codigo}`, { d: ana })));
  assert.equal(e1.status, 500); assert.equal(e1.body.error, 'error');
  s.bd.fallarEn(null);
  // Un error de Ably al publicar no rompe la jugada (el estado ya está guardado) y se registra sin cuerpos.
  s.ably.publicar = 'error500';
  const c = (await post(ana, { accion: 'crear' })).body.sala.codigo;
  const u = await post(beto, { accion: 'unirse', codigo: c });
  assert.equal(u.status, 200, 'si Ably falla, la sala igual se guarda');
  assert.equal(s.bd.salas.get(c)!.estado.miembros.length, 2);
  s.ably.publicar = 'cae';
  assert.equal((await post(ana, { accion: 'configurar', codigo: c, config: { modo: 'club', ref: null } })).status, 200);
  s.ably.publicar = 'ok';
  assert.ok(s.errores.length >= 2);
  for (const e of s.errores) {
    assert.ok(!/hunter2|password|Basic |Bearer|authorization|secreto-de-prueba|TOKEN-ABLY/i.test(e), `registro con secretos: ${e}`);
    for (const d of [ana, beto, cami]) assert.ok(!e.includes(d.token) && !e.includes(d.id));
  }
}

// ---------- El token de Ably (A12, A01): solo suscripción, un canal, solo a miembros ----------
{
  s.ably.llamadas.length = 0;
  const c = (await post(ana, { accion: 'crear' })).body.sala.codigo;
  await post(beto, { accion: 'unirse', codigo: c });
  const pedir = (d: Dispositivo | null, cod: unknown, extra: Parameters<Servidor['peticion']>[2] = {}) => leer(tokenApi.POST(s.peticion('POST', '/api/ably-token', { d, cuerpo: { codigo: cod }, ...extra })) as unknown as Response);
  const pedirR = async (d: Dispositivo | null, cod: unknown, extra: Parameters<Servidor['peticion']>[2] = {}) => leer(await tokenApi.POST(s.peticion('POST', '/api/ably-token', { d, cuerpo: { codigo: cod }, ...extra })));
  void pedir;
  const ok = await pedirR(beto, c);
  assert.equal(ok.status, 200);
  assert.deepEqual(Object.keys(ok.body).sort(), ['capability', 'expires', 'issued', 'token']);
  assert.equal(ok.body.token, 'TOKEN-ABLY-DE-PRUEBA');
  assert.deepEqual(JSON.parse(ok.body.capability), { [`retos:${c}`]: ['subscribe'] });
  assert.ok(!ok.texto.includes('clientId') && !ok.texto.includes('filtrado'));
  const llamada = s.ably.llamadas.at(-1)!;
  assert.equal(llamada.url, 'https://main.realtime.ably.net/keys/abc123.def456/requestToken');
  assert.deepEqual(Object.keys(llamada.cuerpo).sort(), ['capability', 'keyName', 'nonce', 'timestamp', 'ttl']);
  assert.equal(llamada.cuerpo.ttl, '900000'); assert.equal(llamada.cuerpo.keyName, 'abc123.def456');
  assert.ok(llamada.cuerpo.nonce.length >= 16); assert.equal(llamada.cuerpo.timestamp, s.reloj.ahora);
  assert.ok(!('clientId' in llamada.cuerpo));
  assert.ok(!llamada.cuerpo.capability.includes('publish'));
  // Quien no es miembro, sin perfil, sin credencial, con código inexistente o inválido: nada.
  assert.equal((await pedirR(cami, c)).status, 403);
  assert.equal((await pedirR(null, c)).status, 401);
  assert.equal((await pedirR(s.nuevoDispositivo('x'), c)).status, 404);
  assert.equal((await pedirR(ana, 'ZZZZZZ')).status, 404);
  for (const mal of ['abc234', 5, null, ['ABC234'], 'ABC23', "X'--"]) assert.equal((await pedirR(ana, mal)).status, 400);
  const n = s.ably.llamadas.length;
  assert.equal(s.ably.llamadas.filter((l) => l.url.includes('requestToken')).length, 1, 'solo el token del miembro llegó a Ably');
  // Ably caído o con una respuesta rara: 503 sin detalles.
  s.ably.token = 'error';
  const caido = await pedirR(ana, c);
  assert.equal(caido.status, 503);
  assert.ok(!/secreto|401|key invalid/i.test(caido.texto));
  s.ably.token = 'forma';
  assert.equal((await pedirR(ana, c)).status, 503);
  s.ably.token = 'ok';
  void n;
  // 30 por hora por dispositivo.
  const e: number[] = [];
  s.reloj.avanzar(3600_000 + 1);
  for (let i = 0; i < 32; i++) e.push((await pedirR(ana, c)).status);
  assert.equal(e.filter((x) => x === 429).length, 2);
  // Una sala vencida o cerrada no da token.
  s.reloj.avanzar(3600_000);
  assert.equal((await pedirR(ana, c)).status, 410);
  // Modo de desarrollo: sin llave, EN_LINEA_DEV=1 responde { dev: true } y no sale nada a Ably.
  const llave = process.env.ABLY_API_KEY;
  delete process.env.ABLY_API_KEY; process.env.EN_LINEA_DEV = '1';
  const c2 = (await post(ana, { accion: 'crear' })).body.sala.codigo;
  s.ably.llamadas.length = 0;
  assert.deepEqual((await pedirR(ana, c2)).body, { dev: true });
  assert.deepEqual((await obtener(null)).body, { enLinea: true });
  await post(beto, { accion: 'unirse', codigo: c2 });
  assert.equal(s.ably.llamadas.length, 0, 'en modo de desarrollo no se llama a Ably');
  delete process.env.EN_LINEA_DEV; process.env.ABLY_API_KEY = llave;
}

// ---------- Reloj de ¿De dónde es? con el banco real todavía vacío: el servidor no se cae, responde error genérico ----------
{
  const c = await (async () => {
    const x = (await post(ana, { accion: 'crear' })).body.sala.codigo;
    await post(beto, { accion: 'unirse', codigo: x });
    await post(ana, { accion: 'configurar', codigo: x, config: { modo: 'dedonde', ref: null } });
    return x;
  })();
  const r = await post(ana, { accion: 'empezar', codigo: c });
  // Con el banco de futbolistas de C (o el vacío de T0) la respuesta es una partida o un error genérico, nunca un fallo con detalles.
  assert.ok(r.status === 200 || r.status === 500, `status ${r.status}`);
  if (r.status === 500) assert.equal(r.body.error, 'error');
}

s.restaurar();
console.log(`sala: CA-1 a CA-5, CA-10 (130/35, 62/17, 32/8, 0/0), CA-11, CA-18, tope diario, abandono, concurrencia, límites y token (${T0 > 0 ? 'ok' : ''}).`);
