// Máquina de estados de una sala de Retos en línea (RF-05 a RF-21). Pura: sin DOM, red, `Date.now()` ni `Math.random()`: el reloj y el azar entran por `Entorno`.
// La usa el servidor (api/sala.ts), que es el árbitro; el cliente nunca la importa. La estructura de la sala se guarda en Neon (SalaInterna) y lo único que
// sale al mundo, por el canal y por las respuestas, es `vistaPublica`, que quita la respuesta correcta y lo que eligió el rival (A01).
// Los imports relativos llevan `.js`: el servidor corre como módulos ES de Node y scripts/imports-api.test.ts lo comprueba.
import { CLUBES, PAISES, type Verificacion } from '../../../api/_retos.js';
import * as dedondeReal from '../dedonde.js';
import type { Futbolista, Marcador } from '../dedonde.js';
import { abre, claveTexto, evaluar, limpiar, marcadorCompleto, nuevaPartida, validarEntrada, type Partida } from '../pingpong.js';
import { DIFICULTADES, MAX_RONDAS as MAX_SUBITA, TIEMPO_MS, muerteSubita, repartir, resultadoDuelo, type PreguntaBanco, type PreguntaJuego } from '../trivia-puro.js';
import type {
  Accion, Categoria, CodigoError, Config, DeDondePublico, FaseSala, FinalPublico, Indice, JugadaPing, JuegoPublico, Modo, PartidaPublica, PerfilPublico,
  PeticionSala, PingPublico, PreguntasPublico, ResultadoCategoria, SalaPublica,
} from './protocolo.js';
import { SALA_VIDA_MS } from './protocolo.js';
import { rendimientoCategoria, tipoJuego, type Jugadas, type TipoJuego } from './puntos.js';

// ---------- Plazos (ms) ----------
export const TURNO_MS = 15_000;       // ping pong: un turno (RF-12)
export const VERIFICAR_MS = 6_000;    // ping pong: la consulta a la fuente (el reloj del turno está detenido)
export const APELAR_MS = 10_000;      // ping pong: el autor apela o acepta la derrota
export const DECIDIR_MS = 20_000;     // ping pong: el rival decide (falla de la fuente o apelación)
export const REVELADO_MS = 3_000;     // preguntas y ¿De dónde es?: se ve la correcta antes de seguir
export const ENTRE_MS = 6_000;        // Reto completo: marcador entre categorías
export const PREGUNTAS_N = DIFICULTADES.length;
/** Plazos seguidos sin ninguna petición de quien debía actuar para que pierda por abandono (RF-09). */
export const PLAZOS_PARA_ABANDONO = 2;

// ---------- Estado interno (lo que se guarda en Neon; no sale del servidor) ----------
export interface Miembro { id: string; perfil: PerfilPublico }
export interface Entorno {
  ahora: number;
  azar: () => number;
  bancos: { preguntas: PreguntaBanco[]; futbolistas: Futbolista[] };
  /** La lógica de ¿De dónde es? del bloque C; las pruebas pasan un doble. */
  dedonde?: Pick<typeof dedondeReal, 'cerrarRonda' | 'elegirFutbolista' | 'opcionesRonda' | 'puntosRonda'>;
}

interface JugadaPingInt extends JugadaPing { texto: string; qid: string | null }
interface PingInt {
  t: 'ping'; cat: 'pais' | 'club'; ref: string; fase: PingPublico['fase']; turno: Indice; texto: string | null; porFuente: boolean; deadline: number;
  jugadas: JugadaPingInt[];
}
interface PregInt {
  t: 'preguntas'; fase: 'pregunta' | 'revelado'; n: number; subita: boolean; idx: number; lista: PreguntaJuego[]; actual: PreguntaJuego;
  respuestas: [number | null, number | null]; aciertos: [number, number]; rondasSubita: [boolean, boolean][]; deadline: number;
}
interface DondeInt {
  t: 'dedonde'; fase: 'ronda' | 'revelado'; n: number; extra: boolean; f: Futbolista; opciones: string[]; correcta: number;
  respuestas: [{ opcion: number; tardo: number } | null, { opcion: number; tardo: number } | null]; marcador: Marcador; ganado: [number, number];
  fin: { ganador: Indice | null; motivo: string } | null; deadline: number;
}
type JuegoInt = PingInt | PregInt | DondeInt;

interface PartidaInt {
  num: number; categorias: Categoria[]; actual: number; primero: Indice; resultados: ResultadoCategoria[]; juego: JuegoInt | null;
  entreDeadline: number | null; final: FinalPublico | null;
  plazo: number;                          // número del plazo vigente (sube con cada plazo nuevo)
  visto: [number, number];                // último plazo en que cada jugador mandó una petición (jugar o vencer)
  faltas: [number, number];               // plazos seguidos en que debía actuar y no mandó nada
  jugadas: Record<TipoJuego, number>;     // futbolistas aceptados, preguntas cerradas, rondas cerradas
  tipos: TipoJuego[];                     // tipos de juego que ya empezaron
  usados: { preguntas: string[]; futbolistas: string[] };
}

export interface SalaInterna {
  codigo: string; v: number; act: number; fase: FaseSala; config: Config; miembros: Miembro[];
  partida: PartidaInt | null; revancha: [boolean, boolean]; salio: Indice | null; num: number;
}

export interface CierrePartida {
  num: number; categorias: Categoria[]; ganador: Indice | null; abandono: Indice | null;
  rendimiento: [number, number];          // suma de rendimientoCategoria de lo jugado, con sus topes
  jugadas: Jugadas;                       // lo jugado por tipo (null = ese tipo no empezó)
  ids: [string, string];
}
export type Efecto = { t: 'verificar'; texto: string; tipo: 'pais' | 'club'; id: string } | { t: 'cierre'; cierre: CierrePartida };
export type Peticion = PeticionSala | { accion: 'verificado'; texto: string; resultado: Verificacion | 'fuente_falla' };
/** `cambio`: 'publico' = cambió lo que ven los jugadores (hay que publicar); 'privado' = solo la cuenta de actividad; 'nada' = no hace falta guardar. */
export type Cambio = 'nada' | 'privado' | 'publico';
export type Resultado =
  | { ok: true; sala: SalaInterna; efectos: Efecto[]; cambio: Cambio }
  | { ok: false; error: CodigoError; faltanMs?: number; sala: SalaInterna; cambio: Cambio };

const rival = (i: Indice): Indice => (i === 0 ? 1 : 0);
const elegir = <T>(a: readonly T[], azar: () => number): T => a[Math.floor(azar() * a.length)];
const MODOS: readonly Modo[] = ['completo', 'pais', 'club', 'preguntas', 'dedonde'];

/** La configuración del lobby: modo conocido y, solo en ping pong, un país o club del juego (o null = al azar). Ningún campo de más. */
export function configValida(c: unknown): Config | null {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
  const { modo, ref, ...resto } = c as Record<string, unknown>;
  if (Object.keys(resto).length || typeof modo !== 'string' || !MODOS.includes(modo as Modo)) return null;
  if (ref === null || ref === undefined) return { modo: modo as Modo, ref: null };
  if (typeof ref !== 'string') return null;
  if ((modo === 'pais' && Object.hasOwn(PAISES, ref)) || (modo === 'club' && Object.hasOwn(CLUBES, ref))) return { modo, ref };
  return null;
}

// ---------- Creación y entrada ----------

export function crearSala(codigo: string, anfitrion: Miembro, env: Pick<Entorno, 'ahora'>): SalaInterna {
  return { codigo, v: 1, act: env.ahora, fase: 'lobby', config: { modo: 'completo', ref: null }, miembros: [anfitrion], partida: null, revancha: [false, false], salio: null, num: 0 };
}

/** RF-04/RF-05: entra como jugador 1. Quien ya es el invitado recibe su sala (reconexión); el anfitrión no puede ocupar los dos lugares. */
export function unirse(sala: SalaInterna, miembro: Miembro, env: Pick<Entorno, 'ahora'>): Resultado {
  const i = sala.miembros.findIndex((m) => m.id === miembro.id);
  if (i === 1) return { ok: true, sala, efectos: [], cambio: 'nada' };
  if (i === 0) return { ok: false, error: 'mismo_dispositivo', sala, cambio: 'nada' };
  if (sala.fase === 'cerrada') return { ok: false, error: 'sala_vencida', sala, cambio: 'nada' };
  if (sala.miembros.length >= 2) return { ok: false, error: 'sala_llena', sala, cambio: 'nada' };
  const s = structuredClone(sala);
  s.miembros.push(miembro);
  return { ok: true, sala: subirVersion(s, env.ahora), efectos: [], cambio: 'publico' };
}

function subirVersion(s: SalaInterna, ahora: number): SalaInterna {
  s.v++;
  s.act = ahora;
  return s;
}

// ---------- aplicar ----------

interface Ctx { s: SalaInterna; env: Entorno; efectos: Efecto[]; publico: boolean; privado: boolean }
class Rechazo extends Error {
  constructor(readonly error: CodigoError, readonly faltanMs?: number) { super(error); }
}
const rechazar = (error: CodigoError, faltanMs?: number): never => { throw new Rechazo(error, faltanMs); };

/** Aplica la petición de un miembro (`quien`) a la sala y devuelve la sala nueva; no modifica la recibida. */
export function aplicar(sala: SalaInterna, quien: Indice, peticion: Peticion, env: Entorno): Resultado {
  const c: Ctx = { s: structuredClone(sala), env, efectos: [], publico: false, privado: false };
  const salida = (): Cambio => (c.publico ? 'publico' : c.privado ? 'privado' : 'nada');
  try {
    if (peticion.accion === 'verificado') verificado(c, peticion);
    else {
      if (peticion.accion === 'jugar' || peticion.accion === 'vencer') anotarActividad(c, quien);
      accion(c, quien, peticion);
    }
  } catch (e) {
    if (!(e instanceof Rechazo)) throw e;
    // El error se responde igual, pero la actividad anotada (y solo eso) se conserva: pedir cerrar un plazo cuenta aunque no transicione.
    return { ok: false, error: e.error, faltanMs: e.faltanMs, sala: c.privado || c.publico ? soloActividad(c, sala) : sala, cambio: c.privado || c.publico ? 'privado' : 'nada' };
  }
  if (c.publico) subirVersion(c.s, env.ahora);
  else if (c.privado) c.s.act = env.ahora;
  return { ok: true, sala: c.s, efectos: c.efectos, cambio: salida() };
}

/** La sala original con solo la actividad anotada, para guardarla cuando la petición se rechaza. */
function soloActividad(c: Ctx, original: SalaInterna): SalaInterna {
  const s = structuredClone(original);
  if (s.partida && c.s.partida) { s.partida.visto = c.s.partida.visto; s.partida.faltas = c.s.partida.faltas; }
  s.act = c.env.ahora;
  return s;
}

/** RF-09: cualquier `jugar` o `vencer` de un miembro, transicione o no, muestra que sigue ahí. */
function anotarActividad(c: Ctx, quien: Indice) {
  const p = c.s.partida;
  if (!p || (c.s.fase !== 'jugando' && c.s.fase !== 'entre')) return;
  if (p.visto[quien] !== p.plazo || p.faltas[quien] !== 0) { p.visto[quien] = p.plazo; p.faltas[quien] = 0; c.privado = true; }
}

function accion(c: Ctx, quien: Indice, pet: PeticionSala) {
  const s = c.s;
  switch (pet.accion) {
    case 'configurar': {
      if (quien !== 0) rechazar('no_anfitrion');
      if (s.fase !== 'lobby') rechazar('fase_incorrecta');
      const cfg = configValida(pet.config) ?? rechazar('entrada_invalida');
      s.config = cfg;
      c.publico = true;
      return;
    }
    case 'empezar':
      if (quien !== 0) rechazar('no_anfitrion');
      if (s.fase !== 'lobby' || s.miembros.length < 2) rechazar('fase_incorrecta');
      return iniciarPartida(c);
    case 'revancha':
      if (s.fase !== 'fin' || s.salio !== null) rechazar('fase_incorrecta');
      s.revancha[quien] = true;
      c.publico = true;
      if (s.revancha[0] && s.revancha[1]) iniciarPartida(c);
      return;
    case 'salir':
      return salir(c, quien);
    case 'jugar':
      return jugar(c, quien, pet.jugada);
    case 'vencer':
      return vencer(c, pet.v);
    default:
      return rechazar('fase_incorrecta'); // crear y unirse no pasan por aquí
  }
}

function salir(c: Ctx, quien: Indice) {
  const s = c.s;
  if (s.fase === 'cerrada') return;
  if (s.fase === 'lobby') {
    if (quien === 0) { s.fase = 'cerrada'; s.salio = 0; } else s.miembros.pop();
  } else if (s.fase === 'fin') {
    s.salio = quien;
    s.revancha = [false, false];
  } else {
    return terminarPorAbandono(c, quien); // RF-09: "Salir" confirmado en plena partida
  }
  c.publico = true;
}

// ---------- Partida y categorías ----------

function iniciarPartida(c: Ctx) {
  const s = c.s;
  s.num++;
  const completo = s.config.modo === 'completo';
  const categorias: Categoria[] = completo ? ['pais', 'club', 'preguntas'] : [s.config.modo as Categoria];
  // RF-10: alterna quién abre en cada revancha.
  const primero: Indice = (s.num - 1) % 2 === 0 ? 0 : 1;
  s.partida = {
    num: s.num, categorias, actual: 0, primero, resultados: [], juego: null, entreDeadline: null, final: null, plazo: 0, visto: [-1, -1], faltas: [0, 0],
    jugadas: { ping: 0, preguntas: 0, dedonde: 0 }, tipos: [], usados: { preguntas: [], futbolistas: [] },
  };
  s.fase = 'jugando';
  s.revancha = [false, false];
  s.salio = null;
  c.publico = true;
  iniciarCategoria(c, 0);
}

const abreCategoria = (p: PartidaInt, k: number): Indice => (p.categorias.length === 1 ? p.primero : ((p.primero + abre(k)) % 2) as Indice);
function nuevoPlazo(p: PartidaInt) { p.plazo++; }

function iniciarCategoria(c: Ctx, k: number) {
  const { s, env } = c;
  const p = s.partida!;
  p.actual = k;
  p.entreDeadline = null;
  s.fase = 'jugando';
  const cat = p.categorias[k];
  if (!p.tipos.includes(tipoJuego(cat))) p.tipos.push(tipoJuego(cat));
  nuevoPlazo(p);
  if (cat === 'pais' || cat === 'club') {
    const ref = (s.config.modo === cat ? s.config.ref : null) ?? elegir(Object.keys(cat === 'pais' ? PAISES : CLUBES), env.azar);
    p.juego = { t: 'ping', cat, ref, fase: 'turno', turno: abreCategoria(p, k), texto: null, porFuente: false, deadline: env.ahora + TURNO_MS, jugadas: [] };
  } else if (cat === 'preguntas') {
    const [a, b] = repartir(env.bancos.preguntas, env.azar);
    p.usados.preguntas.push(...a.map((x) => x.id), ...b.map((x) => x.id));
    p.juego = { t: 'preguntas', fase: 'pregunta', n: 1, subita: false, idx: 0, lista: a, actual: a[0], respuestas: [null, null], aciertos: [0, 0], rondasSubita: [], deadline: env.ahora + TIEMPO_MS };
  } else {
    p.juego = rondaDeDonde(c, 1, false, { puntos: [0, 0], rondas: 0, extras: 0 });
  }
}

function rondaDeDonde(c: Ctx, n: number, extra: boolean, marcador: Marcador): DondeInt {
  const { env } = c;
  const d = env.dedonde ?? dedondeReal;
  const usados = c.s.partida!.usados.futbolistas;
  const f = d.elegirFutbolista(env.bancos.futbolistas, new Set(usados), env.azar);
  const o = d.opcionesRonda(f, env.azar);
  usados.push(f.q);
  return {
    t: 'dedonde', fase: 'ronda', n, extra, f, opciones: o.opciones, correcta: o.correcta, respuestas: [null, null], marcador, ganado: [0, 0], fin: null,
    deadline: env.ahora + dedondeReal.PLAZO_MS,
  };
}

// ---------- Jugadas ----------

function jugar(c: Ctx, quien: Indice, a: Accion) {
  const s = c.s;
  const p = s.partida;
  if (s.fase !== 'jugando' || !p?.juego) rechazar('fase_incorrecta');
  const j = p!.juego!;
  if (c.env.ahora > j.deadline) rechazar('fase_incorrecta'); // RF-11: una jugada llegada después del plazo no cuenta; el plazo lo cierra `vencer`
  if (j.t === 'ping') return jugarPing(c, p!, j, quien, a);
  if (a.t !== 'responder') rechazar('fase_incorrecta');
  const op = (a as { opcion: unknown }).opcion;
  if (!Number.isInteger(op) || (op as number) < 0 || (op as number) > 3) rechazar('entrada_invalida');
  if (j.fase !== (j.t === 'preguntas' ? 'pregunta' : 'ronda')) rechazar('fase_incorrecta');
  if (j.t === 'preguntas') {
    if (j.respuestas[quien] !== null) return; // solo cuenta la primera
    j.respuestas[quien] = op as number;
    c.publico = true;
    if (j.respuestas[0] !== null && j.respuestas[1] !== null) cerrarPregunta(c, p!, j);
  } else {
    if (j.respuestas[quien] !== null) return;
    j.respuestas[quien] = { opcion: op as number, tardo: c.env.ahora - (j.deadline - dedondeReal.PLAZO_MS) };
    c.publico = true;
    if (j.respuestas[0] && j.respuestas[1]) cerrarRondaDeDonde(c, p!, j);
  }
}

function jugarPing(c: Ctx, p: PartidaInt, j: PingInt, quien: Indice, a: Accion) {
  const { env } = c;
  if (a.t === 'texto') {
    if (j.fase !== 'turno') rechazar('fase_incorrecta');
    if (quien !== j.turno) rechazar('fuera_de_turno');
    if (typeof a.texto !== 'string') rechazar('entrada_invalida');
    const texto = limpiar(a.texto);
    if (validarEntrada(texto)) rechazar('entrada_invalida');
    if (evaluar(vistaPartida(j), texto, null) === 'repetido') return perderPing(c, quien, `${apodo(c, quien)} repitió un futbolista que ya se dijo.`); // mismo texto: pierde sin consultar
    pasarPlazo(c, [j.turno]); // quien escribe actuó en este plazo: no suma falta
    nuevoPlazo(p);
    j.fase = 'verificando';
    j.texto = texto;
    j.deadline = env.ahora + VERIFICAR_MS;
    c.efectos.push({ t: 'verificar', texto: claveTexto(texto), tipo: j.cat, id: j.ref });
  } else if (a.t === 'apelar') {
    if (j.fase !== 'rechazado') rechazar('fase_incorrecta');
    if (quien !== j.turno) rechazar('fuera_de_turno');
    if (typeof a.apelar !== 'boolean') rechazar('entrada_invalida');
    if (!a.apelar) return perderPing(c, quien, `«${j.texto}» no figura como futbolista de esa categoría.`);
    if (!pasarPlazo(c, [j.turno])) return;
    j.fase = 'decide';
    j.porFuente = false;
    j.deadline = env.ahora + DECIDIR_MS;
  } else if (a.t === 'decidir') {
    if (j.fase !== 'decide') rechazar('fase_incorrecta');
    if (quien === j.turno) rechazar('fuera_de_turno');
    if (typeof a.vale !== 'boolean') rechazar('entrada_invalida');
    if (!a.vale) return perderPing(c, j.turno, `${apodo(c, quien)} no aceptó a «${j.texto}».`);
    if (!pasarPlazo(c, [rival(j.turno)])) return;
    aceptarPing(c, p, j, { nombre: j.texto!, qid: null, sinVerificar: j.porFuente, apelacion: !j.porFuente });
  } else rechazar('fase_incorrecta');
  c.publico = true;
}

/** Cierra el plazo vigente; si alguien llegó al límite de faltas, termina la partida por abandono y devuelve false.
 *  De quien debía actuar y no mandó ninguna petición en este plazo se anota una falta. Nunca se le cuenta al que pide el cierre (su petición ya
 *  quedó anotada), así que a lo sumo uno llega al límite. */
function pasarPlazo(c: Ctx, obligados: Indice[]): boolean {
  const p = c.s.partida!;
  for (const i of obligados) {
    if (p.visto[i] !== p.plazo) { p.faltas[i]++; c.privado = true; }
    if (p.faltas[i] >= PLAZOS_PARA_ABANDONO) { terminarPorAbandono(c, i); return false; }
  }
  return true;
}

/** Vista de la partida de ping pong para reusar `evaluar` de pingpong.ts. */
function vistaPartida(j: PingInt): Partida {
  const p = nuevaPartida(j.turno);
  p.jugadas = j.jugadas.map((x) => ({ jugador: x.jugador, texto: x.texto, nombre: x.nombre, qid: x.qid, sinVerificar: x.sinVerificar, apelacion: x.apelacion }));
  return p;
}

function aceptarPing(c: Ctx, p: PartidaInt, j: PingInt, x: { nombre: string; qid: string | null; sinVerificar: boolean; apelacion: boolean }) {
  j.jugadas.push({ jugador: j.turno, texto: j.texto!, nombre: x.nombre, qid: x.qid, sinVerificar: x.sinVerificar, apelacion: x.apelacion });
  p.jugadas.ping++;
  nuevoPlazo(p);
  j.turno = rival(j.turno);
  j.fase = 'turno';
  j.texto = null;
  j.porFuente = false;
  j.deadline = c.env.ahora + TURNO_MS;
}

function perderPing(c: Ctx, quien: Indice, motivo: string) {
  const p = c.s.partida!;
  const j = p.juego as PingInt;
  const puntos: [number, number] = [j.jugadas.filter((x) => x.jugador === 0).length, j.jugadas.filter((x) => x.jugador === 1).length];
  finCategoria(c, rival(quien), puntos, motivo);
}

/** RF-12: resultado de la consulta a la fuente (lo manda el endpoint, no un jugador). Se ignora si ya no corresponde. */
function verificado(c: Ctx, pet: { texto: string; resultado: Verificacion | 'fuente_falla' }) {
  const { s, env } = c;
  const p = s.partida;
  const j = p?.juego;
  if (s.fase !== 'jugando' || !p || j?.t !== 'ping' || j.fase !== 'verificando' || claveTexto(j.texto ?? '') !== pet.texto) return;
  const r = pet.resultado;
  if (r === 'fuente_falla') return decideRival(c, p, j, true);
  if (!r.valido) { // la fuente dijo que no: el autor puede apelar o aceptar la derrota
    nuevoPlazo(p);
    j.fase = 'rechazado';
    j.deadline = env.ahora + APELAR_MS;
    c.publico = true;
    return;
  }
  if (evaluar(vistaPartida(j), j.texto!, r.qid) === 'repetido') return perderPing(c, j.turno, `${apodo(c, j.turno)} repitió un futbolista que ya se dijo.`);
  aceptarPing(c, p, j, { nombre: (r.nombreCanonico ?? j.texto!).slice(0, 80), qid: r.qid, sinVerificar: false, apelacion: false });
  c.publico = true;
}

function decideRival(c: Ctx, p: PartidaInt, j: PingInt, porFuente: boolean) {
  nuevoPlazo(p);
  j.fase = 'decide';
  j.porFuente = porFuente;
  j.deadline = c.env.ahora + DECIDIR_MS;
  c.publico = true;
}

// ---------- Preguntas ----------

function cerrarPregunta(c: Ctx, p: PartidaInt, j: PregInt) {
  if (!pasarPlazo(c, [0, 1])) return;
  const acierto = j.respuestas.map((r) => r === j.actual.correcta) as [boolean, boolean];
  if (acierto[0]) j.aciertos[0]++;
  if (acierto[1]) j.aciertos[1]++;
  if (j.subita) j.rondasSubita.push(acierto);
  p.jugadas.preguntas++;
  nuevoPlazo(p);
  j.fase = 'revelado';
  j.deadline = c.env.ahora + REVELADO_MS;
  c.publico = true;
}

/** Tras el revelado: la siguiente pregunta, la muerte súbita, o el fin de la categoría. */
function siguientePregunta(c: Ctx, p: PartidaInt, j: PregInt) {
  const { env } = c;
  if (!j.subita && j.idx + 1 < j.lista.length) {
    j.idx++;
    j.n++;
    j.actual = j.lista[j.idx];
  } else {
    const r = resultadoDuelo(j.aciertos, j.rondasSubita);
    if (r.terminado) {
      const motivo = r.ganador === null ? 'Empate: tras la muerte súbita siguen igualados.' : `${apodo(c, r.ganador)} acertó más preguntas.`;
      return finCategoria(c, r.ganador, [j.aciertos[0], j.aciertos[1]], motivo);
    }
    const [q] = muerteSubita(env.bancos.preguntas, new Set(p.usados.preguntas), env.azar);
    p.usados.preguntas.push(q.id);
    j.subita = true;
    j.n = j.rondasSubita.length + 1;
    j.actual = q;
  }
  nuevoPlazo(p);
  j.fase = 'pregunta';
  j.respuestas = [null, null];
  j.deadline = env.ahora + TIEMPO_MS;
}

// ---------- ¿De dónde es? ----------

function cerrarRondaDeDonde(c: Ctx, p: PartidaInt, j: DondeInt) {
  if (!pasarPlazo(c, [0, 1])) return;
  const d = c.env.dedonde ?? dedondeReal;
  const ganado = j.respuestas.map((r) => d.puntosRonda(!!r && r.opcion === j.correcta, r ? r.tardo : null)) as [number, number];
  const { marcador, fin } = d.cerrarRonda(j.marcador, ganado);
  j.ganado = ganado;
  j.marcador = marcador;
  j.fin = fin ? { ganador: fin.ganador, motivo: motivoDeDonde(c, fin.ganador, fin.motivo) } : null;
  p.jugadas.dedonde++;
  nuevoPlazo(p);
  j.fase = 'revelado';
  j.deadline = c.env.ahora + REVELADO_MS;
  c.publico = true;
}

function motivoDeDonde(c: Ctx, ganador: Indice | null, motivo: 'meta' | 'tope_rondas' | 'empate_extras'): string {
  if (ganador === null) return 'Empate: siguen igualados tras las rondas extra.';
  return motivo === 'meta' ? `${apodo(c, ganador)} llegó primero a ${dedondeReal.META} puntos.` : `${apodo(c, ganador)} tenía más puntos tras ${dedondeReal.MAX_RONDAS} rondas.`;
}

function siguienteRondaDeDonde(c: Ctx, p: PartidaInt, j: DondeInt) {
  if (j.fin) return finCategoria(c, j.fin.ganador, [j.marcador.puntos[0], j.marcador.puntos[1]], j.fin.motivo);
  nuevoPlazo(p);
  p.juego = rondaDeDonde(c, j.n + 1, j.marcador.extras > 0, j.marcador);
}

// ---------- Vencer ----------

function vencer(c: Ctx, v: number) {
  const { s, env } = c;
  const p = s.partida;
  if (!p || (s.fase !== 'jugando' && s.fase !== 'entre')) return; // ya terminó o no empezó: nada que cerrar
  const dl = s.fase === 'entre' ? p.entreDeadline! : p.juego!.deadline;
  if (env.ahora <= dl) {
    if (v === s.v) rechazar('aun_no', dl - env.ahora + 1); // el cliente adelantó su reloj
    return; // versión vieja: ya cambió; que mire el estado actual
  }
  c.publico = true;
  if (s.fase === 'entre') {
    if (!pasarPlazo(c, [0, 1])) return;
    return iniciarCategoria(c, p.actual);
  }
  const j = p.juego!;
  if (j.t === 'ping') {
    if (j.fase === 'turno') { if (pasarPlazo(c, [j.turno])) perderPing(c, j.turno, `${apodo(c, j.turno)} no respondió a tiempo.`); } // se acabó el tiempo
    else if (j.fase === 'verificando') decideRival(c, p, j, true); // la función murió o la fuente tardó: se trata como falla de la fuente
    else if (j.fase === 'rechazado') { if (pasarPlazo(c, [j.turno])) perderPing(c, j.turno, `${apodo(c, j.turno)} no apeló a tiempo.`); }
    else if (pasarPlazo(c, [rival(j.turno)])) aceptarPing(c, p, j, { nombre: j.texto!, qid: null, sinVerificar: j.porFuente, apelacion: !j.porFuente }); // sin decisión a tiempo, vale
  } else if (j.t === 'preguntas') {
    if (j.fase === 'pregunta') cerrarPregunta(c, p, j);
    else if (pasarPlazo(c, [0, 1])) siguientePregunta(c, p, j);
  } else if (j.fase === 'ronda') cerrarRondaDeDonde(c, p, j);
  else if (pasarPlazo(c, [0, 1])) siguienteRondaDeDonde(c, p, j);
}

// ---------- Fin de categoría y de partida ----------

const apodo = (c: Ctx, i: Indice) => c.s.miembros[i].perfil.apodo;

function finCategoria(c: Ctx, ganador: Indice | null, puntos: [number, number], motivo: string) {
  const p = c.s.partida!;
  p.resultados.push({ categoria: p.categorias[p.actual], ganador, puntos, motivo });
  p.juego = null;
  c.publico = true;
  if (p.categorias.length === 1) return finPartida(c, ganador, motivo, null);
  const m = marcadorCompleto(p.resultados.map((r) => r.ganador));
  if (m.terminado) {
    const resumen = m.ganador === null ? `Empate ${m.victorias[0]} a ${m.victorias[1]} en el Reto completo.` : `${apodo(c, m.ganador)} ganó el Reto completo ${Math.max(...m.victorias)} a ${Math.min(...m.victorias)}.`;
    return finPartida(c, m.ganador, resumen, null);
  }
  nuevoPlazo(p);
  p.actual++;
  c.s.fase = 'entre';
  p.entreDeadline = c.env.ahora + ENTRE_MS;
}

function terminarPorAbandono(c: Ctx, quien: Indice) {
  return finPartida(c, rival(quien), `${apodo(c, quien)} abandonó la partida.`, quien, c.s.partida!.juego);
}

function finPartida(c: Ctx, ganador: Indice | null, motivo: string, abandono: Indice | null, enCurso: JuegoInt | null = null) {
  const { s } = c;
  const p = s.partida!;
  // Lo que alcanzó la categoría a medias también cuenta como rendimiento propio.
  const resultados = [...p.resultados];
  if (enCurso) resultados.push({ categoria: p.categorias[p.actual], ganador: null, puntos: puntosEnCurso(enCurso), motivo: '' });
  const rendimiento: [number, number] = [0, 1].map((i) => resultados.reduce((t, r) => t + rendimientoCategoria(r.categoria, r.puntos[i]), 0)) as [number, number];
  const jugadas = Object.fromEntries((['ping', 'preguntas', 'dedonde'] as TipoJuego[]).map((t) => [t, p.tipos.includes(t) ? p.jugadas[t] : null])) as Jugadas;
  p.juego = null;
  p.entreDeadline = null;
  nuevoPlazo(p);
  s.fase = 'fin';
  s.revancha = [false, false];
  s.salio = null;
  p.final = {
    ganador, motivo, abandono, rankingGanado: [0, 0], sinPuntos: [null, null],
  };
  c.publico = true;
  c.efectos.push({
    t: 'cierre',
    cierre: {
      num: p.num, categorias: p.categorias, ganador, abandono, rendimiento, jugadas,
      ids: [s.miembros[0].id, s.miembros[1].id],
    },
  });
}

function puntosEnCurso(j: JuegoInt): [number, number] {
  if (j.t === 'ping') return [j.jugadas.filter((x) => x.jugador === 0).length, j.jugadas.filter((x) => x.jugador === 1).length];
  if (j.t === 'preguntas') return [j.aciertos[0], j.aciertos[1]];
  return [j.marcador.puntos[0], j.marcador.puntos[1]];
}

// ---------- Vista pública (A01): lo único que sale del servidor ----------

export function vistaPublica(sala: SalaInterna, ahora: number): SalaPublica {
  const p = sala.partida;
  return {
    codigo: sala.codigo, v: sala.v, ahora, vence: sala.act + SALA_VIDA_MS, fase: sala.fase, config: sala.config,
    jugadores: sala.miembros.map((m) => ({ apodo: m.perfil.apodo, avatar: m.perfil.avatar, club: m.perfil.club, seleccion: m.perfil.seleccion })),
    partida: p ? partidaPublica(p) : null, revancha: sala.revancha, salio: sala.salio,
  };
}

function partidaPublica(p: PartidaInt): PartidaPublica {
  return {
    num: p.num, categorias: p.categorias, actual: p.actual, resultados: p.resultados, juego: p.juego ? juegoPublico(p.juego) : null,
    entreDeadline: p.entreDeadline, final: p.final,
  };
}

function juegoPublico(j: JuegoInt): JuegoPublico {
  if (j.t === 'ping') {
    return {
      cat: j.cat, ref: j.ref, fase: j.fase, turno: j.turno, texto: j.texto, porFuente: j.porFuente, deadline: j.deadline,
      jugadas: j.jugadas.map((x) => ({ jugador: x.jugador, nombre: x.nombre, sinVerificar: x.sinVerificar, apelacion: x.apelacion })),
    };
  }
  const rev = j.fase === 'revelado';
  if (j.t === 'preguntas') {
    const pub: PreguntasPublico = {
      cat: 'preguntas', fase: j.fase, n: j.n, total: j.subita ? MAX_SUBITA : PREGUNTAS_N, subita: j.subita, pregunta: j.actual.pregunta, opciones: [...j.actual.opciones],
      respondio: [j.respuestas[0] !== null, j.respuestas[1] !== null], aciertos: [j.aciertos[0], j.aciertos[1]], deadline: j.deadline,
      revelado: rev ? { correcta: j.actual.correcta, elegida: [j.respuestas[0], j.respuestas[1]] } : null,
    };
    return pub;
  }
  const pub: DeDondePublico = {
    cat: 'dedonde', fase: j.fase, n: j.n, extra: j.extra, nombre: j.f.nombre, opciones: [...j.opciones], respondio: [!!j.respuestas[0], !!j.respuestas[1]],
    puntos: [j.marcador.puntos[0], j.marcador.puntos[1]], meta: dedondeReal.META, deadline: j.deadline,
    revelado: rev ? { correcta: j.correcta, elegida: [j.respuestas[0]?.opcion ?? null, j.respuestas[1]?.opcion ?? null], ganado: j.ganado } : null,
  };
  return pub;
}
