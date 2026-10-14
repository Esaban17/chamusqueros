// Prueba del transporte y del cliente del modo en línea (B1, B3). Sin red ni navegador:
//   npx tsx scripts/transporte.test.ts
import assert from 'node:assert/strict';
import { soloNuevos, transporteAuto, transporteFalso, transporteSondeo } from '../src/retos/online/transporte';
import { crearReloj, esEvento, esSalaPublica, ErrorCliente, estadoSala, idDispositivo, infoEnLinea, jugar, salaGuardada, guardarSala, cabeceras, crearPerfil, avatarAlAzar } from '../src/retos/online/cliente';
import { canal, type EstadoConexion, type EventoCanal, type SalaPublica, type Transporte } from '../src/retos/online/protocolo';

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
function sala(v: number, extra: Partial<SalaPublica> = {}): SalaPublica {
  return {
    codigo: 'ABC234', v, ahora: 1000, vence: 9000, fase: 'lobby', config: { modo: 'pais', ref: null },
    jugadores: [{ apodo: 'Ana', avatar: [1, 2, 3, 0, 0, 7], club: null, seleccion: null }], partida: null, revancha: [false, false], salio: null, ...extra,
  };
}
const evento = (v: number): EventoCanal => ({ v, sala: sala(v) });

// ---------- soloNuevos: ignora versiones menores o iguales ----------
{
  const vistos: number[] = [];
  const f = soloNuevos((e) => vistos.push(e.v));
  for (const v of [1, 2, 2, 1, 5, 3, 6]) f(evento(v));
  assert.deepEqual(vistos, [1, 2, 5, 6]);
}

// ---------- Transporte falso: emitir, reconexión, cancelar libera ----------
{
  const t = transporteFalso();
  const vistos: number[] = [];
  const estados: EstadoConexion[] = [];
  const cancelar = await t.suscribir(canal('ABC234'), (e) => vistos.push(e.v), (c) => estados.push(c));
  t.emitir(evento(1)); t.emitir(evento(1)); t.emitir(evento(3)); t.emitir(evento(2));
  t.conexion('reconectando'); t.conexion('conectado');
  assert.deepEqual(vistos, [1, 3]);
  assert.deepEqual(estados, ['conectado', 'reconectando', 'conectado']);
  assert.equal(t.suscritos(), 1);
  cancelar();
  assert.equal(t.suscritos(), 0);
  t.emitir(evento(9));
  assert.deepEqual(vistos, [1, 3], 'cancelar libera: ya no llega nada');
}

// ---------- Sondeo: solo emite si la versión subió, avisa del estado y cancelar detiene ----------
{
  let llamadas = 0;
  let falla = false;
  const serie = [1, 1, 2, 2, 2, 3];
  const obtener = async (codigo: string) => {
    assert.equal(codigo, 'ABC234');
    if (falla) throw new Error('sin red');
    return evento(serie[Math.min(llamadas++, serie.length - 1)]);
  };
  const t = transporteSondeo(obtener, 10);
  const vistos: number[] = [];
  const estados: EstadoConexion[] = [];
  const cancelar = await t.suscribir(canal('ABC234'), (e) => vistos.push(e.v), (c) => estados.push(c));
  await dormir(120);
  assert.deepEqual(vistos, [1, 2, 3]);
  assert.equal(estados.at(-1), 'conectado');
  falla = true;
  await dormir(120);
  assert.ok(estados.includes('reconectando'), 'las primeras fallas son reconectando');
  assert.equal(estados.at(-1), 'caido', 'tras 3 fallas seguidas, caído');
  falla = false;
  await dormir(150);
  assert.equal(estados.at(-1), 'conectado', 'al volver la red, conectado');
  cancelar();
  const antes = llamadas;
  await dormir(80);
  assert.equal(llamadas, antes, 'cancelar detiene el sondeo');
}

// ---------- Fábrica: dev → sondeo; fallo del token → sondeo; Ably que no conecta → sondeo a los 8 s (aquí, 40 ms) ----------
{
  const nuncaConecta = (canceladas: { n: number }): Transporte => ({ suscribir: async () => () => { canceladas.n++; } });
  let sondeos = 0;
  const obtener = async () => { sondeos++; return evento(sondeos); };
  // dev
  let t = transporteAuto(async () => ({ dev: true }), obtener, { sondeoMs: 10, esperaMs: 40 });
  let c = await t.suscribir(canal('ABC234'), () => {});
  await dormir(50);
  assert.ok(sondeos >= 2, 'con { dev: true } usa el sondeo');
  c();
  // el token falla (503)
  sondeos = 0;
  t = transporteAuto(async () => { throw new ErrorCliente('en_linea_no_disponible', 503); }, obtener, { sondeoMs: 10, esperaMs: 40 });
  c = await t.suscribir(canal('ABC234'), () => {});
  await dormir(50);
  assert.ok(sondeos >= 2, 'sin token usa el sondeo');
  c();
  // Ably nunca conecta
  sondeos = 0;
  const canc = { n: 0 };
  const estados: EstadoConexion[] = [];
  t = transporteAuto(async () => ({ token: 't', issued: 1, expires: 2, capability: '{}' }), obtener, { sondeoMs: 10, esperaMs: 40, ably: () => nuncaConecta(canc) });
  c = await t.suscribir(canal('ABC234'), () => {}, (e) => estados.push(e));
  assert.equal(sondeos, 0);
  await dormir(110);
  assert.ok(sondeos >= 2, 'a los 8 s (40 ms aquí) sin conexión pasa al sondeo');
  assert.equal(canc.n, 1, 'y suelta Ably');
  c();
  // Ably conecta: no hay sondeo
  sondeos = 0;
  let emitir!: (e: EventoCanal) => void;
  const conecta: Transporte = { suscribir: async (_c, al, con) => { emitir = al; con?.('conectado'); return () => {}; } };
  const vistos: number[] = [];
  t = transporteAuto(async () => ({ token: 't', issued: 1, expires: 2, capability: '{}' }), obtener, { sondeoMs: 10, esperaMs: 40, ably: () => conecta });
  c = await t.suscribir(canal('ABC234'), (e) => vistos.push(e.v));
  await dormir(100);
  assert.equal(sondeos, 0, 'conectado a tiempo: no sondea');
  emitir(evento(4)); emitir(evento(4)); emitir(evento(3));
  assert.deepEqual(vistos, [4]);
  c();
}

// ---------- Cliente: forma mínima, errores, identidad, reloj ----------
{
  // La forma del evento
  assert.ok(esEvento(evento(1)));
  assert.ok(!esEvento({ v: 1 }));
  assert.ok(!esEvento({ v: 2, sala: sala(1) }), 'la v del evento y la de la sala deben coincidir');
  assert.ok(!esSalaPublica(sala(1, { codigo: 'ABC10O' })), 'el código tiene que cumplir CODIGO_RE');
  assert.ok(!esSalaPublica(sala(1, { fase: 'otra' as never })));
  assert.ok(!esSalaPublica(sala(1, { jugadores: [] })));
  assert.ok(!esSalaPublica(sala(1, { partida: { num: 1, categorias: ['pais'], actual: 0, resultados: [], juego: { cat: 'pais' } as never, entreDeadline: null, final: null } })));

  // Almacenamiento que lanza: nada se rompe
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('bloqueado'); } });
  assert.match(idDispositivo(), /^[0-9a-f-]{36}$/);
  assert.equal(salaGuardada(), null);
  guardarSala('ABC234');
  assert.equal(cabeceras().authorization, undefined);

  // Almacenamiento en memoria
  const mem = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } });
  mem.set('chamusqueros:id', JSON.stringify('11111111-2222-4333-8444-555555555555'));
  assert.equal(idDispositivo(), '11111111-2222-4333-8444-555555555555', 'reutiliza el id que guarda main.ts (JSON)');
  guardarSala('XYZ789'); assert.equal(salaGuardada(), 'XYZ789');
  mem.set('chamusqueros:sala', 'no-es-un-codigo'); assert.equal(salaGuardada(), null);

  // Llamadas con un fetch falso
  const llamadas: { url: string; init: RequestInit }[] = [];
  let respuesta: () => Response = () => Response.json({ enLinea: true });
  globalThis.fetch = (async (url: string, init: RequestInit) => { llamadas.push({ url, init }); return respuesta(); }) as typeof fetch;
  assert.equal(await infoEnLinea(), true);
  assert.equal((llamadas[0].init.headers as Record<string, string>)['x-jugador-id'], undefined, 'el estado general no lleva identidad');
  respuesta = () => Response.json({ enLinea: false });
  assert.equal(await infoEnLinea(), false);
  respuesta = () => new Response('<html>', { status: 200 });
  assert.equal(await infoEnLinea(), false, 'una respuesta que no es JSON (sin API) oculta la opción');
  respuesta = () => { throw new Error('red'); };
  assert.equal(await infoEnLinea(), false);

  // Errores: 410, 429 con retry-after, 409 con faltanMs, códigos desconocidos
  respuesta = () => Response.json({ error: 'sala_vencida' }, { status: 410 });
  await assert.rejects(estadoSala('ABC234'), (e: ErrorCliente) => e.codigo === 'sala_vencida' && e.estado === 410);
  respuesta = () => new Response('{"error":"limite"}', { status: 429, headers: { 'retry-after': '7' } });
  await assert.rejects(jugar('ABC234', { t: 'responder', opcion: 1 }), (e: ErrorCliente) => e.codigo === 'limite' && e.reintentarSeg === 7);
  respuesta = () => Response.json({ error: 'aun_no', faltanMs: 340 }, { status: 409 });
  await assert.rejects(jugar('ABC234', { t: 'responder', opcion: 1 }), (e: ErrorCliente) => e.codigo === 'aun_no' && e.faltanMs === 340);
  respuesta = () => Response.json({ error: '<img src=x>' }, { status: 500 });
  await assert.rejects(estadoSala('ABC234'), (e: ErrorCliente) => e.codigo === 'error' && !e.message.includes('<'));
  await assert.rejects(estadoSala('abc'), (e: ErrorCliente) => e.codigo === 'sala_inexistente', 'un código mal formado ni sale a la red');

  // Respuestas de sala: miembro, previa y forma rara
  respuesta = () => Response.json({ sala: sala(3), yo: 0 });
  const r = await estadoSala('ABC234');
  assert.ok('sala' in r && r.sala.v === 3);
  respuesta = () => Response.json({ previa: true, llena: true, anfitrion: 'Ana' });
  assert.deepEqual(await estadoSala('ABC234'), { previa: true, llena: true, anfitrion: 'Ana' });
  respuesta = () => Response.json({ sala: { v: 1 }, yo: 0 });
  await assert.rejects(estadoSala('ABC234'), (e: ErrorCliente) => e.codigo === 'error');

  // Perfil nuevo: crea token, lo manda como Bearer y lo conserva si el servidor acepta; lo quita si rechaza
  const perfil = { apodo: 'Ana', avatar: [1, 1, 1, 1, 1, 1], club: null, seleccion: null, estadisticas: {}, mejorCarrera: null };
  respuesta = () => Response.json({ error: 'apodo_rechazado', mensaje: 'Ese apodo no vale.' }, { status: 400 });
  await assert.rejects(crearPerfil('x'), (e: ErrorCliente) => e.codigo === 'apodo_rechazado' && e.message === 'Ese apodo no vale.');
  assert.equal(mem.get('chamusqueros:retos-token'), undefined, 'un rechazo no deja un token guardado');
  respuesta = () => Response.json(perfil, { status: 201 });
  await crearPerfil('Ana');
  const tok = mem.get('chamusqueros:retos-token')!;
  assert.match(tok, /^[A-Za-z0-9_-]{43}$/);
  const ult = llamadas.at(-1)!;
  assert.equal((ult.init.headers as Record<string, string>).authorization, `Bearer ${tok}`);
  assert.equal(ult.init.method, 'PUT');
  const cuerpo = JSON.parse(ult.init.body as string);
  assert.deepEqual(Object.keys(cuerpo).sort(), ['apodo', 'avatar', 'club', 'seleccion']);
  assert.equal(cuerpo.avatar.length, 6);
  for (const [i, max] of [5, 7, 5, 4, 3, 99].entries()) for (let k = 0; k < 200; k++) { const a = avatarAlAzar()[i]; assert.ok(Number.isInteger(a) && a >= (i === 5 ? 1 : 0) && a <= max); }

  // Reloj: se queda con la mejor medida (menor latencia)
  let ahora = 10_000;
  const reloj = crearReloj(() => ahora);
  reloj.muestrear(10_500 - 80);   // llegó con 80 ms de latencia
  reloj.muestrear(10_500 - 20);   // otra con 20 ms: mejor
  reloj.muestrear(10_500 - 200);  // peor: se ignora
  ahora = 11_000;
  assert.equal(reloj.ahora(), 11_000 + 480);

  if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete (globalThis as { localStorage?: unknown }).localStorage;
}
console.log('transporte y cliente: versiones, reconexión, cancelar, respaldo a sondeo, errores, identidad y reloj: todo bien');
