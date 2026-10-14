// Prueba del motor de salas de Retos en línea (src/retos/online/motor.ts): lobby, ping pong, preguntas, ¿De dónde es?, Reto completo, abandono,
// revancha y que la vista pública no filtre secretos. Pura y sin red, con reloj y azar inyectados:
//   npx tsx scripts/motor.test.ts
// "¿De dónde es?" se prueba con un doble de src/retos/dedonde.ts (la lógica real es del bloque C; su prueba es scripts/dedonde.test.ts).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import preguntasJson from '../src/retos/preguntas.json' with { type: 'json' };
import {
  APELAR_MS, DECIDIR_MS, ENTRE_MS, REVELADO_MS, TURNO_MS, VERIFICAR_MS, aplicar, configValida, crearSala, unirse, vistaPublica,
  type Cambio, type Efecto, type Entorno, type Peticion, type Resultado, type SalaInterna,
} from '../src/retos/online/motor';
import type { Futbolista, Marcador } from '../src/retos/dedonde';
import type { DeDondePublico, Indice, PingPublico, PreguntasPublico } from '../src/retos/online/protocolo';
import type { PreguntaBanco } from '../src/retos/trivia-puro';

// ---------- Utilidades ----------
function semilla(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const IDS = ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'] as const;
const NOMBRES = ['Ana', 'Beto'] as const;
const perfil = (apodo: string) => ({ apodo, avatar: null, club: null, seleccion: null });
const T0 = 1_800_000_000_000;

// Doble de la lógica de ¿De dónde es? según el plan (RF-18, RF-19): el bloque C trae la real.
const PLAZO = 12_000, META = 500, MAXR = 25, EXTRAS = 3;
const SELS = ['Argentina', 'Brasil', 'Uruguay', 'Chile', 'Colombia', 'Perú', 'Ecuador', 'Paraguay'];
const BANCO_F: Futbolista[] = Array.from({ length: 60 }, (_, i) => ({ q: `Q${1000 + i}`, nombre: `Futbolista ${i}`, sel: SELS[i % SELS.length] }));
const doble: NonNullable<Entorno['dedonde']> = {
  puntosRonda: (acerto, tardo) => (!acerto || tardo === null || tardo > PLAZO ? 0 : 100 + Math.floor((50 * (PLAZO - tardo)) / PLAZO)),
  opcionesRonda: (f, azar) => {
    const otras = SELS.filter((s) => s !== f.sel).sort(() => (azar ?? Math.random)() - 0.5).slice(0, 3);
    const opciones = [...otras];
    const correcta = Math.floor((azar ?? Math.random)() * 4);
    opciones.splice(correcta, 0, f.sel);
    return { opciones, correcta };
  },
  elegirFutbolista: (banco, usados, azar) => {
    const libres = banco.filter((f) => !usados.has(f.q));
    return libres[Math.floor((azar ?? Math.random)() * libres.length)];
  },
  cerrarRonda: (m: Marcador, ganado) => {
    const puntos: [number, number] = [m.puntos[0] + ganado[0], m.puntos[1] + ganado[1]];
    const rondas = m.rondas + 1;
    const terminable = puntos[0] >= META || puntos[1] >= META || rondas >= MAXR;
    const fin = (ganador: Indice | null, motivo: 'meta' | 'tope_rondas' | 'empate_extras') => ({ marcador: { puntos, rondas, extras: m.extras }, fin: { ganador, motivo } });
    if (!terminable) return { marcador: { puntos, rondas, extras: m.extras }, fin: null };
    if (puntos[0] !== puntos[1]) return fin(puntos[0] > puntos[1] ? 0 : 1, puntos[0] >= META || puntos[1] >= META ? 'meta' : 'tope_rondas');
    if (m.extras >= EXTRAS) return fin(null, 'empate_extras');
    return { marcador: { puntos, rondas, extras: m.extras + 1 }, fin: null };
  },
};

let ahora = T0;
const azar = semilla(7);
const env = (): Entorno => ({ ahora, azar, bancos: { preguntas: preguntasJson as unknown as PreguntaBanco[], futbolistas: BANCO_F }, dedonde: doble });
let sala!: SalaInterna;
let efectos: Efecto[] = [];
const miembro = (i: Indice) => ({ id: IDS[i], perfil: perfil(NOMBRES[i]) });

/** Aplica la petición y deja la sala nueva (también si se rechazó pero anotó actividad). */
function pasa(quien: Indice, pet: Peticion): Resultado {
  const r = aplicar(sala, quien, pet, env());
  if (r.ok) { sala = r.sala; efectos.push(...r.efectos); } else if (r.cambio !== 'nada') sala = r.sala;
  return r;
}
const bien = (r: Resultado): Extract<Resultado, { ok: true }> => { assert.ok(r.ok, `debía aceptarse: ${r.ok ? '' : r.error}`); return r as Extract<Resultado, { ok: true }>; };
const mal = (r: Resultado, error: string) => { assert.ok(!r.ok, `debía rechazarse con ${error}`); assert.equal((r as { error: string }).error, error); return r as Extract<Resultado, { ok: false }>; };
const cambio = (r: Resultado): Cambio => r.cambio;

function nueva(config?: { modo: string; ref: string | null }): void {
  ahora = T0;
  efectos = [];
  sala = crearSala('ABC234', miembro(0), env());
  bien(unirse(sala, miembro(1), env()));
  sala = (unirse(sala, miembro(1), env()) as Extract<Resultado, { ok: true }>).sala;
  if (config) bien(pasa(0, { accion: 'configurar', codigo: 'ABC234', config: config as never }));
}
function empezada(config: { modo: string; ref: string | null }) {
  nueva(config);
  bien(pasa(0, { accion: 'empezar', codigo: 'ABC234' }));
}
const juego = () => vistaPublica(sala, ahora).partida!.juego!;
const vencer = () => pasa(0, { accion: 'vencer', codigo: 'ABC234', v: sala.v });
const vencerAmbos = () => { const v = sala.v; const a = pasa(0, { accion: 'vencer', codigo: 'ABC234', v }); pasa(1, { accion: 'vencer', codigo: 'ABC234', v }); return a; };
const cierres = () => efectos.filter((e) => e.t === 'cierre').length;
const respuestaCorrecta = (): number => {
  const j = sala.partida!.juego as unknown as { actual?: { correcta: number }; correcta?: number };
  return j.actual?.correcta ?? j.correcta!;
};

// ---------- Lobby ----------
nueva();
assert.equal(sala.fase, 'lobby');
assert.equal(vistaPublica(sala, ahora).jugadores.length, 2);
mal(pasa(1, { accion: 'configurar', codigo: 'ABC234', config: { modo: 'preguntas', ref: null } }), 'no_anfitrion');
mal(pasa(1, { accion: 'empezar', codigo: 'ABC234' }), 'no_anfitrion');
for (const malo of [{ modo: 'xyz', ref: null }, { modo: 'pais', ref: 'ZZ' }, { modo: 'club', ref: 'AR' }, { modo: 'preguntas', ref: 'AR' }, { modo: 'pais', ref: 5 },
  { modo: 'pais', ref: null, extra: 1 }, null, 'pais', [], { ref: null }]) {
  mal(pasa(0, { accion: 'configurar', codigo: 'ABC234', config: malo as never }), 'entrada_invalida');
}
for (const bueno of [{ modo: 'pais', ref: 'AR' }, { modo: 'pais', ref: null }, { modo: 'club', ref: 'municipal' }, { modo: 'completo', ref: null }, { modo: 'dedonde', ref: null }]) {
  assert.ok(configValida(bueno), JSON.stringify(bueno));
  bien(pasa(0, { accion: 'configurar', codigo: 'ABC234', config: bueno as never }));
}
assert.deepEqual(configValida({ modo: 'club', ref: 'municipal' }), { modo: 'club', ref: 'municipal' });
// Sala con un solo jugador: no se puede empezar. Un tercero ve "llena"; el anfitrión no puede ocupar el otro lugar (RF-05); el invitado que vuelve entra a su sala.
{
  const sola = crearSala('ABC234', miembro(0), env());
  assert.equal(vistaPublica(sola, ahora).jugadores.length, 1);
  const r = aplicar(sola, 0, { accion: 'empezar', codigo: 'ABC234' }, env());
  mal(r, 'fase_incorrecta');
  mal(unirse(sola, miembro(0), env()), 'mismo_dispositivo');
  const dos = bien(unirse(sola, miembro(1), env()));
  assert.equal(cambio(dos), 'publico');
  assert.equal(dos.sala.v, sola.v + 1);
  assert.equal(bien(unirse(dos.sala, miembro(1), env())).cambio, 'nada');
  mal(unirse(dos.sala, { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', perfil: perfil('Cami') }, env()), 'sala_llena');
}
// Si el anfitrión sale del lobby, la sala se cierra; si sale el invitado, queda libre el lugar.
nueva();
bien(pasa(1, { accion: 'salir', codigo: 'ABC234' }));
assert.equal(sala.miembros.length, 1);
bien(unirse(sala, { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', perfil: perfil('Cami') }, env()));
nueva();
bien(pasa(0, { accion: 'salir', codigo: 'ABC234' }));
assert.equal(vistaPublica(sala, ahora).fase, 'cerrada');
mal(unirse(sala, { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', perfil: perfil('Cami') }, env()), 'sala_vencida');
// Acciones de partida en el lobby.
nueva();
mal(pasa(0, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'responder', opcion: 0 } }), 'fase_incorrecta');
mal(pasa(0, { accion: 'revancha', codigo: 'ABC234' }), 'fase_incorrecta');
assert.equal(bien(pasa(0, { accion: 'vencer', codigo: 'ABC234', v: sala.v })).cambio, 'nada');
mal(pasa(0, { accion: 'crear' }), 'fase_incorrecta');

// ---------- Ping pong (CA-5) ----------
empezada({ modo: 'pais', ref: 'AR' });
{
  let j = juego() as PingPublico;
  assert.equal(j.cat, 'pais'); assert.equal(j.ref, 'AR'); assert.equal(j.fase, 'turno'); assert.equal(j.turno, 0);
  assert.equal(j.deadline, T0 + TURNO_MS);
  // Fuera de turno y entradas inválidas.
  mal(pasa(1, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'texto', texto: 'Lionel Messi' } }), 'fuera_de_turno');
  for (const malo of ['', 'a', '<img src=x>', 'x'.repeat(41), '12345', 7 as never]) {
    mal(pasa(0, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'texto', texto: malo } }), 'entrada_invalida');
  }
  mal(pasa(0, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'responder', opcion: 1 } }), 'fase_incorrecta');
  // "cerrar plazo" 1 ms antes: rechazado, con lo que falta; 1 ms después: aceptado y pierde quien no jugó.
  ahora = T0 + TURNO_MS - 1;
  const aun = mal(vencer(), 'aun_no');
  assert.equal(aun.faltanMs, 2);
  ahora = T0 + TURNO_MS;
  mal(vencer(), 'aun_no');
  ahora = T0 + TURNO_MS + 1;
  const antes = sala.v;
  const dos = [aplicar(sala, 0, { accion: 'vencer', codigo: 'ABC234', v: antes }, env()), aplicar(sala, 1, { accion: 'vencer', codigo: 'ABC234', v: antes }, env())];
  // Dos "vencer" simultáneos sobre la misma versión: cada uno sale con la misma transición, pero al guardar (versión) solo una se aplica; la segunda,
  // aplicada sobre el resultado de la primera, ya no hace nada.
  assert.ok(dos[0].ok && dos[1].ok);
  const primera = dos[0] as Extract<Resultado, { ok: true }>;
  const segunda = aplicar(primera.sala, 1, { accion: 'vencer', codigo: 'ABC234', v: antes }, env());
  assert.ok(segunda.ok);
  assert.equal(primera.efectos.filter((e) => e.t === 'cierre').length, 1, 'el vencimiento cierra una sola vez');
  assert.equal((segunda as Extract<Resultado, { ok: true }>).efectos.length, 0, 'el segundo vencer no cierra de nuevo');
  assert.equal((segunda as Extract<Resultado, { ok: true }>).sala.v, primera.sala.v, 'ni cambia la versión');
  sala = primera.sala;
  j = vistaPublica(sala, ahora) as never;
  assert.equal(sala.fase, 'fin');
  const f = vistaPublica(sala, ahora).partida!.final!;
  assert.equal(f.ganador, 1); assert.equal(f.abandono, null); assert.match(f.motivo, /Ana no respondió a tiempo/);
  assert.deepEqual(f.rankingGanado, [0, 0]);
}

// Ping pong completo: aceptar, rechazar con apelación, repetición, fuente caída, decisión del rival y sus plazos.
const valido = (n: string) => ({ valido: true, qid: `Q${n.length}${n.charCodeAt(0)}`, nombreCanonico: n });
function jugarTexto(quien: Indice, texto: string) { return bien(pasa(quien, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'texto', texto } })); }
function verificar(texto: string, resultado: Parameters<typeof pasa>[1] extends infer P ? P extends { accion: 'verificado'; resultado: infer R } ? R : never : never) {
  return bien(pasa(0, { accion: 'verificado', texto, resultado }));
}
empezada({ modo: 'club', ref: 'municipal' });
{
  const r = jugarTexto(0, '  Lionel   Messi ');
  assert.deepEqual(r.efectos, [{ t: 'verificar', texto: 'lionel messi', tipo: 'club', id: 'municipal' }]);
  let j = juego() as PingPublico;
  assert.equal(j.fase, 'verificando'); assert.equal(j.texto, 'Lionel Messi'); assert.equal(j.deadline, ahora + VERIFICAR_MS);
  mal(pasa(0, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'texto', texto: 'Otro Mas' } }), 'fase_incorrecta');
  // Un resultado de otra consulta no se aplica.
  assert.equal(bien(pasa(0, { accion: 'verificado', texto: 'cristiano ronaldo', resultado: valido('Cristiano Ronaldo') })).cambio, 'nada');
  verificar('lionel messi', valido('Lionel Messi'));
  j = juego() as PingPublico;
  assert.equal(j.fase, 'turno'); assert.equal(j.turno, 1); assert.equal(j.jugadas.length, 1); assert.equal(j.jugadas[0].nombre, 'Lionel Messi');
  // El rival repite al mismo (por identidad) y pierde sin apelación.
  ahora += 1000;
  jugarTexto(1, 'leo messi');
  verificar('leo messi', valido('Lionel Messi'));
  assert.equal(sala.fase, 'fin');
  assert.match(vistaPublica(sala, ahora).partida!.final!.motivo, /Beto repitió/);
  assert.equal(vistaPublica(sala, ahora).partida!.final!.ganador, 0);
}
empezada({ modo: 'pais', ref: 'AR' });
{
  // Mismo texto exacto: pierde sin consultar a la fuente.
  jugarTexto(0, 'Messi');
  verificar('messi', valido('Lionel Messi'));
  const r = jugarTexto(1, ' MESSI ');
  assert.equal(r.efectos.filter((e) => e.t === 'verificar').length, 0);
  assert.equal(sala.fase, 'fin');
}
empezada({ modo: 'pais', ref: 'AR' });
{
  // "No cumple": 10 s para apelar; sin respuesta, pierde.
  jugarTexto(0, 'Zorro Gris');
  verificar('zorro gris', { valido: false, qid: null, nombreCanonico: null });
  let j = juego() as PingPublico;
  assert.equal(j.fase, 'rechazado'); assert.equal(j.deadline, ahora + APELAR_MS);
  mal(pasa(1, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'apelar', apelar: true } }), 'fuera_de_turno');
  ahora += APELAR_MS + 1;
  bien(vencer());
  assert.equal(sala.fase, 'fin'); assert.equal(vistaPublica(sala, ahora).partida!.final!.ganador, 1);
}
empezada({ modo: 'pais', ref: 'AR' });
{
  // Apelación: decide el rival; "no vale" pierde el autor; "vale" lo acepta con la marca de apelación.
  jugarTexto(0, 'Zorro Gris');
  verificar('zorro gris', { valido: false, qid: null, nombreCanonico: null });
  bien(pasa(0, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'apelar', apelar: true } }));
  let j = juego() as PingPublico;
  assert.equal(j.fase, 'decide'); assert.equal(j.porFuente, false); assert.equal(j.deadline, ahora + DECIDIR_MS);
  mal(pasa(0, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'decidir', vale: true } }), 'fuera_de_turno');
  bien(pasa(1, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'decidir', vale: true } }));
  j = juego() as PingPublico;
  assert.equal(j.fase, 'turno'); assert.equal(j.turno, 1); assert.equal(j.jugadas[0].apelacion, true); assert.equal(j.jugadas[0].sinVerificar, false);
  assert.equal(j.jugadas[0].nombre, 'Zorro Gris');
}
empezada({ modo: 'pais', ref: 'AR' });
{
  // Aceptar la derrota; fuente caída → decide el rival y su silencio acepta; y la fuente puede fallar de nuevo con el verificando vencido.
  jugarTexto(0, 'Zorro Gris');
  verificar('zorro gris', { valido: false, qid: null, nombreCanonico: null });
  bien(pasa(0, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'apelar', apelar: false } }));
  assert.equal(sala.fase, 'fin'); assert.equal(vistaPublica(sala, ahora).partida!.final!.ganador, 1);
}
empezada({ modo: 'pais', ref: 'AR' });
{
  jugarTexto(0, 'Marco Pappa');
  verificar('marco pappa', 'fuente_falla');
  let j = juego() as PingPublico;
  assert.equal(j.fase, 'decide'); assert.equal(j.porFuente, true);
  ahora += DECIDIR_MS;
  mal(vencer(), 'aun_no');
  ahora += 1;
  bien(vencer());
  j = juego() as PingPublico;
  assert.equal(j.fase, 'turno'); assert.equal(j.turno, 1); assert.equal(j.jugadas[0].sinVerificar, true); assert.equal(j.jugadas[0].apelacion, false);
  // El rival juega, y esta vez la función murió a mitad de la verificación: el vencimiento la trata como falla de la fuente.
  jugarTexto(1, 'Otro Jugador');
  ahora += VERIFICAR_MS + 1;
  bien(vencer());
  j = juego() as PingPublico;
  assert.equal(j.fase, 'decide'); assert.equal(j.porFuente, true);
  // "No vale" del rival: pierde el autor.
  bien(pasa(0, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'decidir', vale: false } }));
  assert.equal(sala.fase, 'fin'); assert.equal(vistaPublica(sala, ahora).partida!.final!.ganador, 0);
}
// Una jugada tardía no cuenta (RF-11) y el servidor no aplica un resultado de verificación fuera de su fase.
empezada({ modo: 'pais', ref: 'AR' });
{
  ahora = T0 + TURNO_MS + 1;
  mal(pasa(0, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'texto', texto: 'Lionel Messi' } }), 'fase_incorrecta');
  assert.equal((juego() as PingPublico).fase, 'turno');
  assert.equal(bien(pasa(0, { accion: 'verificado', texto: 'lionel messi', resultado: valido('Lionel Messi') })).cambio, 'nada');
}

// ---------- Preguntas simultáneas (RF-13, CA-6) ----------
empezada({ modo: 'preguntas', ref: null });
{
  let j = juego() as PreguntasPublico;
  assert.equal(j.cat, 'preguntas'); assert.equal(j.fase, 'pregunta'); assert.equal(j.n, 1); assert.equal(j.total, 5); assert.equal(j.deadline, T0 + 20_000);
  assert.deepEqual(j.respondio, [false, false]); assert.equal(j.revelado, null);
  assert.equal(j.opciones.length, 4);
  const correcta = respuestaCorrecta();
  const mala = (correcta + 1) % 4;
  bien(pasa(0, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'responder', opcion: correcta } }));
  j = juego() as PreguntasPublico;
  assert.deepEqual(j.respondio, [true, false]); assert.equal(j.revelado, null);
  assert.equal(JSON.stringify(vistaPublica(sala, ahora)).includes('"elegida"'), false, 'nadie ve lo que eligió el otro antes del cierre');
  // Solo cuenta la primera respuesta.
  assert.equal(bien(pasa(0, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'responder', opcion: mala } })).cambio, 'nada');
  for (const malo of [4, -1, 1.5, '1', null]) mal(pasa(1, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'responder', opcion: malo as never } }), 'entrada_invalida');
  mal(pasa(1, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'texto', texto: 'Messi' } }), 'fase_incorrecta');
  bien(pasa(1, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'responder', opcion: mala } }));
  j = juego() as PreguntasPublico;
  assert.equal(j.fase, 'revelado');
  assert.equal(j.revelado!.correcta, correcta); assert.deepEqual(j.revelado!.elegida, [correcta, mala]); assert.deepEqual(j.aciertos, [1, 0]);
  assert.equal(j.deadline, ahora + REVELADO_MS);
  mal(pasa(0, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'responder', opcion: 0 } }), 'fase_incorrecta');
  // El revelado dura 3 s y sigue la próxima, con la misma pregunta para los dos.
  ahora += REVELADO_MS + 1;
  bien(vencer());
  j = juego() as PreguntasPublico;
  assert.equal(j.fase, 'pregunta'); assert.equal(j.n, 2); assert.deepEqual(j.respondio, [false, false]);
}
// Cinco preguntas, 3 a 2 sin muerte súbita; el ganador y el cierre (una sola vez) con rendimiento y jugadas.
function jugarPreguntas(aciertos: [boolean[], boolean[]]) {
  for (let i = 0; i < aciertos[0].length; i++) {
    const c = respuestaCorrecta();
    for (const q of [0, 1] as Indice[]) bien(pasa(q, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'responder', opcion: aciertos[q][i] ? c : (c + 1) % 4 } }));
    ahora += REVELADO_MS + 1;
    bien(vencer());
  }
}
empezada({ modo: 'preguntas', ref: null });
{
  jugarPreguntas([[true, true, true, false, false], [true, false, false, true, false]]);
  assert.equal(sala.fase, 'fin');
  const f = vistaPublica(sala, ahora).partida!;
  assert.equal(f.final!.ganador, 0);
  const c = efectos.filter((e) => e.t === 'cierre') as { t: 'cierre'; cierre: import('../src/retos/online/motor').CierrePartida }[];
  assert.equal(c.length, 1);
  assert.deepEqual(c[0].cierre.rendimiento, [15, 10]);
  assert.deepEqual(c[0].cierre.jugadas, { ping: null, preguntas: 5, dedonde: null });
  assert.deepEqual(c[0].cierre.ids, [IDS[0], IDS[1]]);
  assert.equal(c[0].cierre.ganador, 0);
  assert.equal(c[0].cierre.abandono, null);
}
// Empate 2 a 2... con 5 preguntas: 3 a 3 imposible, así que 2 a 2 con un fallo de ambos en una → muerte súbita de hasta 3 rondas.
empezada({ modo: 'preguntas', ref: null });
{
  jugarPreguntas([[true, true, false, false, false], [true, true, false, false, false]]);
  let j = juego() as PreguntasPublico;
  assert.equal(sala.fase, 'jugando'); assert.equal(j.subita, true); assert.equal(j.n, 1); assert.equal(j.total, 3);
  // Ronda 1: acierta solo el 1 → gana el 1.
  const c = respuestaCorrecta();
  bien(pasa(0, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'responder', opcion: (c + 1) % 4 } }));
  bien(pasa(1, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'responder', opcion: c } }));
  ahora += REVELADO_MS + 1;
  bien(vencer());
  assert.equal(sala.fase, 'fin'); assert.equal(vistaPublica(sala, ahora).partida!.final!.ganador, 1);
}
empezada({ modo: 'preguntas', ref: null });
{
  jugarPreguntas([[true, true, false, false, false], [true, true, false, false, false]]);
  for (let r = 1; r <= 3; r++) { // tres rondas igualadas (los dos fallan) → empate
    assert.equal((juego() as PreguntasPublico).n, r);
    const c = respuestaCorrecta();
    for (const q of [0, 1] as Indice[]) bien(pasa(q, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'responder', opcion: (c + 1) % 4 } }));
    ahora += REVELADO_MS + 1;
    bien(vencer());
  }
  assert.equal(sala.fase, 'fin'); assert.equal(vistaPublica(sala, ahora).partida!.final!.ganador, null);
  assert.match(vistaPublica(sala, ahora).partida!.final!.motivo, /Empate/);
}
// Las preguntas no se repiten en la partida (5 + hasta 3 de desempate).
empezada({ modo: 'preguntas', ref: null });
assert.equal(new Set(sala.partida!.usados.preguntas).size, sala.partida!.usados.preguntas.length);

// ---------- Abandono (RF-09, CA-4) ----------
// Quien desaparece: no manda nada en dos plazos seguidos → pierde por abandono (aquí: la pregunta y su revelado).
empezada({ modo: 'preguntas', ref: null });
{
  ahora += 20_000 + 1;
  bien(vencer());                           // la pregunta vence; solo el 0 sigue conectado
  assert.equal(sala.fase, 'jugando');
  ahora += REVELADO_MS + 1;
  bien(vencer());
  assert.equal(sala.fase, 'fin');
  const f = vistaPublica(sala, ahora).partida!.final!;
  assert.equal(f.ganador, 0); assert.equal(f.abandono, 1); assert.match(f.motivo, /Beto abandonó/);
  assert.equal(cierres(), 1);
  const cierre = (efectos.find((e) => e.t === 'cierre') as { cierre: import('../src/retos/online/motor').CierrePartida }).cierre;
  assert.equal(cierre.abandono, 1);
}
// Un jugador conectado que deja 5 preguntas sin responder NO abandona: cada vez que su reloj llega a 0 manda "vencer". Cuentan como incorrectas.
empezada({ modo: 'preguntas', ref: null });
{
  for (let i = 0; i < 5; i++) {
    const c = respuestaCorrecta();
    bien(pasa(0, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'responder', opcion: c } }));
    ahora += 20_000 + 1;
    vencerAmbos();                            // el 1 está conectado pero no responde
    assert.equal((juego() as PreguntasPublico).fase, 'revelado');
    ahora += REVELADO_MS + 1;
    vencerAmbos();
  }
  assert.equal(sala.fase, 'fin');
  const f = vistaPublica(sala, ahora).partida!.final!;
  assert.equal(f.abandono, null); assert.equal(f.ganador, 0);
  assert.deepEqual(vistaPublica(sala, ahora).partida!.resultados[0].puntos, [5, 0]);
}
// "Pedir cerrar el plazo" (aunque no responda) reinicia la cuenta: falta uno, manda un vencer, falta otro, y no abandona.
empezada({ modo: 'preguntas', ref: null });
{
  ahora += 20_000 + 1;
  bien(vencer());                           // plazo 1 sin el 1
  assert.deepEqual(sala.partida!.faltas, [0, 1]);
  mal(pasa(1, { accion: 'vencer', codigo: 'ABC234', v: sala.v }), 'aun_no');   // un vencer del 1, aunque no transicione, cuenta como presencia
  assert.deepEqual(sala.partida!.faltas, [0, 0], 'la actividad se conserva aunque se rechace');
  ahora += REVELADO_MS + 1;
  bien(vencer());                           // el pedido del 1 cayó dentro del plazo del revelado: ese plazo sí lo vio
  assert.equal(sala.fase, 'jugando');
  assert.deepEqual(sala.partida!.faltas, [0, 0]);
  ahora += 20_000 + 1;
  bien(vencer());                           // la siguiente pregunta vence sin el 1: una falta, no dos seguidas
  assert.equal(sala.fase, 'jugando');
  assert.deepEqual(sala.partida!.faltas, [0, 1]);
}
// Una petición vencer con versión vieja también anota actividad.
empezada({ modo: 'preguntas', ref: null });
{
  const vieja = sala.v;
  ahora += 20_000 + 1;
  bien(vencer());
  const r = bien(pasa(1, { accion: 'vencer', codigo: 'ABC234', v: vieja }));
  assert.equal(r.cambio, 'privado');
  assert.deepEqual(sala.partida!.faltas, [0, 0]);
}
// "Salir" en plena partida: la victoria es del rival y la partida termina una sola vez.
empezada({ modo: 'pais', ref: null });
{
  bien(pasa(1, { accion: 'salir', codigo: 'ABC234' }));
  assert.equal(sala.fase, 'fin');
  const f = vistaPublica(sala, ahora).partida!.final!;
  assert.equal(f.ganador, 0); assert.equal(f.abandono, 1);
  assert.equal(cierres(), 1);
  const otra = bien(pasa(0, { accion: 'salir', codigo: 'ABC234' })); // ya terminó: marca que salió, sin un segundo cierre
  assert.equal(cierres(), 1);
  assert.equal(otra.sala.salio, 0);
  mal(pasa(1, { accion: 'revancha', codigo: 'ABC234' }), 'fase_incorrecta');
}
// ---------- Revancha (RF-10) ----------
empezada({ modo: 'pais', ref: null });
{
  assert.equal(sala.partida!.primero, 0);
  bien(pasa(0, { accion: 'salir', codigo: 'ABC234' }));   // el 0 abandona: fin
  // Revancha: la acepta uno y no pasa nada; la acepta el otro y empieza; alterna quién abre.
  sala.salio = null;                                     // (el que abandonó sigue en la sala)
  bien(pasa(0, { accion: 'revancha', codigo: 'ABC234' }));
  assert.deepEqual(vistaPublica(sala, ahora).revancha, [true, false]);
  assert.equal(sala.fase, 'fin');
  bien(pasa(1, { accion: 'revancha', codigo: 'ABC234' }));
  assert.equal(sala.fase, 'jugando'); assert.equal(sala.num, 2);
  assert.equal((juego() as PingPublico).turno, 1, 'abre el otro');
  assert.deepEqual(vistaPublica(sala, ahora).revancha, [false, false]);
  assert.equal(vistaPublica(sala, ahora).partida!.num, 2);
  // Si uno sale de la sala, el otro ve "salió" y no hay revancha.
  bien(pasa(1, { accion: 'salir', codigo: 'ABC234' }));
  sala.salio = null;
  bien(pasa(0, { accion: 'revancha', codigo: 'ABC234' }));
  bien(pasa(0, { accion: 'salir', codigo: 'ABC234' }));
  assert.equal(vistaPublica(sala, ahora).salio, 0);
  assert.deepEqual(vistaPublica(sala, ahora).revancha, [false, false]);
  mal(pasa(1, { accion: 'revancha', codigo: 'ABC234' }), 'fase_incorrecta');
}

// ---------- ¿De dónde es? (RF-17 a RF-20, CA-8) ----------
empezada({ modo: 'dedonde', ref: null });
{
  let j = juego() as DeDondePublico;
  assert.equal(j.cat, 'dedonde'); assert.equal(j.fase, 'ronda'); assert.equal(j.n, 1); assert.equal(j.extra, false); assert.equal(j.meta, 500);
  assert.equal(j.deadline, T0 + PLAZO); assert.equal(j.opciones.length, 4); assert.deepEqual(j.puntos, [0, 0]); assert.equal(j.revelado, null);
  const nombre1 = j.nombre;
  // Los dos ven al mismo futbolista; el bonus se mide con el reloj del servidor desde que se mostró.
  const c = respuestaCorrecta();
  ahora = T0 + 6000;
  bien(pasa(0, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'responder', opcion: c } }));
  assert.equal(JSON.stringify(vistaPublica(sala, ahora)).includes('"elegida"'), false);
  ahora = T0 + 12_000;
  bien(pasa(1, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'responder', opcion: c } }));
  j = juego() as DeDondePublico;
  assert.equal(j.fase, 'revelado'); assert.deepEqual(j.revelado!.ganado, [125, 100]); assert.deepEqual(j.puntos, [125, 100]); assert.equal(j.revelado!.correcta, c);
  ahora += REVELADO_MS + 1;
  vencerAmbos();
  j = juego() as DeDondePublico;
  assert.equal(j.n, 2); assert.notEqual(j.nombre, nombre1, 'un futbolista no se repite');
  // Respuesta fuera del plazo (12,001 s): no cuenta.
  const inicio = ahora;
  ahora = inicio + PLAZO + 1;
  mal(pasa(0, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'responder', opcion: respuestaCorrecta() } }), 'fase_incorrecta');
  vencerAmbos();                                           // sin responder: 0 y sin penalización
  j = juego() as DeDondePublico;
  assert.equal(j.fase, 'revelado'); assert.deepEqual(j.revelado!.ganado, [0, 0]); assert.deepEqual(j.puntos, [125, 100]); assert.deepEqual(j.revelado!.elegida, [null, null]);
}
// Una partida entera hasta los 500 puntos, con registro de los futbolistas vistos.
empezada({ modo: 'dedonde', ref: null });
{
  const vistos = new Set<string>();
  let rondas = 0;
  while (sala.fase === 'jugando') {
    const j = juego() as DeDondePublico;
    if (j.fase === 'ronda') {
      vistos.add(j.nombre);
      const c = respuestaCorrecta();
      bien(pasa(0, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'responder', opcion: c } }));
      bien(pasa(1, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'responder', opcion: (c + 1) % 4 } }));
      rondas++;
    } else {
      ahora += REVELADO_MS + 1;
      bien(vencer());
    }
    assert.ok(rondas < 30);
  }
  assert.equal(sala.fase, 'fin');
  assert.equal(vistaPublica(sala, ahora).partida!.final!.ganador, 0);
  assert.equal(vistos.size, rondas, 'sin repetir');
  const cierre = (efectos.find((e) => e.t === 'cierre') as { cierre: import('../src/retos/online/motor').CierrePartida }).cierre;
  assert.equal(cierre.jugadas.dedonde, rondas); assert.equal(cierre.jugadas.ping, null);
  assert.equal(cierre.rendimiento[1], 0);
  assert.ok(cierre.rendimiento[0] >= 50);
}

// ---------- Reto completo (RF-02, RF-11) ----------
empezada({ modo: 'completo', ref: null });
{
  let p = vistaPublica(sala, ahora).partida!;
  assert.deepEqual(p.categorias, ['pais', 'club', 'preguntas']);
  assert.equal((juego() as PingPublico).turno, 0);
  // País: el 0 no juega y pierde; entre categorías hay marcador y 6 s.
  ahora += TURNO_MS + 1;
  vencerAmbos();
  assert.equal(sala.fase, 'entre');
  p = vistaPublica(sala, ahora).partida!;
  assert.equal(p.juego, null); assert.equal(p.resultados.length, 1); assert.equal(p.resultados[0].ganador, 1); assert.equal(p.entreDeadline, ahora + ENTRE_MS);
  assert.equal(p.actual, 1);
  mal(pasa(0, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'texto', texto: 'Lionel Messi' } }), 'fase_incorrecta');
  ahora += ENTRE_MS;
  mal(vencer(), 'aun_no');
  ahora += 1;
  vencerAmbos();
  assert.equal(sala.fase, 'jugando');
  assert.equal((juego() as PingPublico).cat, 'club'); assert.equal((juego() as PingPublico).turno, 1, 'abre 0, 1, 0');
  // Club: el 1 pierde (no responde a tiempo) → 1 a 1; sigue preguntas; el 0 abre... y el 0 gana más preguntas → 2 a 1.
  ahora += TURNO_MS + 1;
  vencerAmbos();
  assert.equal(sala.fase, 'entre');
  ahora += ENTRE_MS + 1;
  vencerAmbos();
  assert.equal((juego() as PreguntasPublico).cat, 'preguntas');
  jugarPreguntas([[true, true, true, true, true], [false, false, false, false, false]]);
  assert.equal(sala.fase, 'fin');
  const f = vistaPublica(sala, ahora).partida!.final!;
  assert.equal(f.ganador, 0); assert.match(f.motivo, /Reto completo 2 a 1/);
}
// El Reto completo se corta al ganar 2 de 3 (no se juega la tercera).
empezada({ modo: 'completo', ref: null });
{
  ahora += TURNO_MS + 1; vencerAmbos();       // 1 gana país
  ahora += ENTRE_MS + 1; vencerAmbos();
  // club: abre el 1; el 0 puede no jugar, pero hacemos que el 1 no juegue y pierda → 1 a 1; mejor: el 1 juega y el 0 pierde.
  const v = (juego() as PingPublico);
  assert.equal(v.turno, 1);
  jugarTexto(1, 'Nombre Uno');
  verificar('nombre uno', valido('Nombre Uno'));
  ahora += TURNO_MS + 1; vencerAmbos();       // el 0 no responde: pierde club → 0 a 2 para el 1
  assert.equal(sala.fase, 'fin');
  assert.equal(vistaPublica(sala, ahora).partida!.final!.ganador, 1);
  assert.equal(vistaPublica(sala, ahora).partida!.resultados.length, 2);
  const cierre = (efectos.find((e) => e.t === 'cierre') as { cierre: import('../src/retos/online/motor').CierrePartida }).cierre;
  assert.deepEqual(cierre.jugadas, { ping: 1, preguntas: null, dedonde: null });
}

// ---------- La vista pública no filtra secretos (A01, CA-6, CA-8) ----------
// Claves internas que nunca salen (se buscan como claves JSON, no como texto: una pregunta puede decir «lista»).
const CLAVES_INTERNAS = ['id', 'q', 'qid', 'sel', 'lista', 'respuestas', 'usados', 'faltas', 'visto', 'miembros', 'token', 'authorization', 'fuente', 'verificado', 'origen', 'tardo'];
function sinSecretos(vista: ReturnType<typeof vistaPublica>, enRevelado: boolean) {
  // Solo después del cierre de la pregunta o ronda (fase 'revelado') se ve la correcta y lo que eligió cada uno.
  enRevelado ||= !!(vista.partida?.juego as { revelado?: unknown } | null)?.revelado;
  const t = JSON.stringify(vista);
  for (const id of IDS) assert.ok(!t.includes(id), 'la vista pública contiene un identificador de dispositivo');
  for (const k of CLAVES_INTERNAS) assert.ok(!t.includes(`"${k}":`), `la vista pública contiene la clave interna «${k}»`);
  if (!enRevelado) for (const k of ['correcta', 'elegida', 'ganado']) assert.ok(!t.includes(`"${k}":`), `la vista pública muestra «${k}» antes del cierre`);
}
/** Cambiar lo oculto (la respuesta correcta y lo que eligió el rival) no cambia nada de lo que se ve antes del cierre. */
function invarianteOculto() {
  const j = sala.partida?.juego as unknown as { t: string; fase: string; respuestas: unknown[]; correcta?: number; actual?: { correcta: number } } | null;
  if (!j || (j.t !== 'preguntas' && j.t !== 'dedonde') || (j.fase !== 'pregunta' && j.fase !== 'ronda')) return;
  const antes = JSON.stringify(vistaPublica(sala, ahora));
  const copia = structuredClone(sala);
  const k = copia.partida!.juego as unknown as typeof j;
  if (k.actual) k.actual.correcta = (k.actual.correcta + 1) % 4; else k.correcta = (k.correcta! + 1) % 4;
  for (let i = 0; i < 2; i++) if (k.respuestas[i] !== null) k.respuestas[i] = j.t === 'preguntas' ? ((k.respuestas[i] as number) + 1) % 4 : { opcion: 3, tardo: 1 };
  assert.equal(JSON.stringify(vistaPublica(copia, ahora)), antes, 'lo oculto cambió lo que se ve');
}
{
  const rng = semilla(99);
  let vistas = 0;
  for (let n = 0; n < 1000; n++) {
    const modo = (['preguntas', 'dedonde', 'completo', 'pais', 'club'] as const)[n % 5];
    empezada({ modo, ref: null });
    for (let paso = 0; paso < 400 && sala.fase !== 'fin' && sala.fase !== 'cerrada'; paso++) {
      sinSecretos(vistaPublica(sala, ahora), false);
      vistas++;
      if (sala.fase === 'jugando') {
        const j = sala.partida!.juego!;
        if (j.t === 'preguntas' || j.t === 'dedonde') {
          const fase = j.fase;
          if (fase === 'pregunta' || fase === 'ronda') {
            const q = (rng() < 0.5 ? 0 : 1) as Indice;
            if (rng() < 0.15) { ahora += 25_000; vencerAmbos(); } else bien(pasa(q, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'responder', opcion: Math.floor(rng() * 4) } }));
            invarianteOculto();
          } else { ahora += REVELADO_MS + 1; vencerAmbos(); }
        } else if (j.fase === 'turno') {
          const q = j.turno;
          if (rng() < 0.2) { ahora += TURNO_MS + 1; vencerAmbos(); } else {
            const nom = `Jugador ${'abcdefghij'[paso % 10]}${'klmnopqrst'[Math.floor(paso / 10) % 10]} Nombre`;
            jugarTexto(q, nom);
            verificar(nom.toLowerCase(), rng() < 0.7 ? valido(nom) : rng() < 0.5 ? 'fuente_falla' : { valido: false, qid: null, nombreCanonico: null });
          }
        } else if (j.fase === 'rechazado' || j.fase === 'decide') {
          const q = (j.fase === 'decide' ? (j.turno === 0 ? 1 : 0) : j.turno) as Indice;
          if (j.fase === 'rechazado') bien(pasa(q, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'apelar', apelar: rng() < 0.5 } }));
          else bien(pasa(q, { accion: 'jugar', codigo: 'ABC234', jugada: { t: 'decidir', vale: rng() < 0.6 } }));
        } else { ahora += VERIFICAR_MS + 1; vencerAmbos(); }
      } else if (sala.fase === 'entre') { ahora += ENTRE_MS + 1; vencerAmbos(); }
    }
    assert.equal(sala.fase, 'fin', `la partida ${n} (${modo}) debía terminar`);
    sinSecretos(vistaPublica(sala, ahora), true);
  }
  console.log(`motor: ${vistas} vistas públicas de 1000 partidas sin secretos y con lo oculto invariante.`);
}

// Cobertura de importaciones: el motor no arrastra DOM ni bancos.
const fuente = readFileSync(new URL('../src/retos/online/motor.ts', import.meta.url), 'utf8');
assert.ok(!/from '\.\.\/trivia(\.js)?'/.test(fuente), 'el motor no importa trivia.ts (arrastra preguntas.json)');
assert.ok(!/Date\.now|Math\.random|document|window|fetch\(/.test(fuente.replace(/\/\/.*$/gm, '')), 'el motor es puro: sin reloj, azar, DOM ni red');
console.log('motor: lobby, ping pong (CA-5), preguntas (CA-6), abandono (CA-4), revancha, ¿De dónde es? (CA-8), Reto completo y vista pública.');
