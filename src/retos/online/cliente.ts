// Cliente HTTP del modo en línea: funciones tipadas con protocolo.ts, la identidad del dispositivo y el reloj del servidor.
// Es el único archivo de online/ que toca localStorage (con try/catch en cada acceso: puede no existir o estar bloqueado); fuera de online/, solo dia/almacen.ts (specs/reto-del-dia).
// Nunca registra ni muestra el token; el `id` y el token solo viajan en cabeceras.
import {
  CODIGO_RE, type AvatarCodigo, type CodigoError, type Config, type EventoCanal, type Accion, type PerfilCompleto,
  type PerfilEdicion, type PeticionSala, type PreviaSala, type RankingRetos, type RespuestaSala, type RespuestaToken, type SalaPublica,
} from './protocolo';

const K_ID = 'chamusqueros:id';              // el mismo del ranking de carreras (src/main.ts lo guarda como JSON)
const K_TOKEN = 'chamusqueros:retos-token';  // secreto del dispositivo: nunca en la URL ni en un registro
const K_SALA = 'chamusqueros:sala';          // solo el código de la última sala, sin ningún secreto
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// ponytail: solo un filtro de forma laxo (el servidor es quien valida el secreto); uno estricto dejaría sin perfil a quien lo guardó otro bloque con otro formato
const TOKEN_RE = /^[\w=+/-]{20,200}$/;
const TIEMPO_MS = 10_000;

// ---------- Almacenamiento (todo con try/catch) ----------
function leer(clave: string): string | null {
  try { return globalThis.localStorage?.getItem(clave) ?? null; } catch { return null; }
}
function escribir(clave: string, valor: string | null): void {
  try {
    if (valor === null) globalThis.localStorage?.removeItem(clave); else globalThis.localStorage?.setItem(clave, valor);
  } catch { /* sin almacenamiento: el juego sigue, pero no se recuerda la sala ni el perfil */ }
}
/** Acepta el valor tal cual o como JSON (así guarda src/main.ts el id). */
function limpio(raw: string | null): string | null {
  if (!raw) return null;
  try { const v: unknown = JSON.parse(raw); return typeof v === 'string' ? v : raw; } catch { return raw; }
}

export function idDispositivo(): string {
  const guardado = limpio(leer(K_ID));
  if (guardado && UUID.test(guardado)) return guardado;
  const nuevo = crypto.randomUUID();
  escribir(K_ID, JSON.stringify(nuevo));
  return nuevo;
}
export const tokenGuardado = (): string | null => { const t = limpio(leer(K_TOKEN)); return t && TOKEN_RE.test(t) ? t : null; };
function crearToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  escribir(K_TOKEN, token);
  return token;
}
export const salaGuardada = (): string | null => { const c = limpio(leer(K_SALA)); return c && CODIGO_RE.test(c) ? c : null; };
export const guardarSala = (codigo: string) => escribir(K_SALA, codigo);
export const olvidarSala = () => escribir(K_SALA, null);

/** Cabeceras de identidad del contrato. Sin token todavía (sin perfil), solo va el id. */
export function cabeceras(): Record<string, string> {
  const t = tokenGuardado();
  return { 'x-jugador-id': idDispositivo(), ...(t ? { authorization: `Bearer ${t}` } : {}) };
}

// ---------- Errores ----------
const MENSAJES: Record<CodigoError, string> = {
  entrada_invalida: 'Algo no salió bien con lo que enviaste. Probá de nuevo.',
  apodo_rechazado: 'Ese apodo no se puede usar. Probá con otro.',
  sin_credencial: 'Primero necesitás un apodo.',
  sin_perfil: 'Primero necesitás un apodo.',
  no_miembro: 'No sos parte de esa sala.',
  sala_inexistente: 'La sala no existe o ya venció.',
  sala_vencida: 'La sala no existe o ya venció.',
  sala_llena: 'Sala llena.',
  mismo_dispositivo: 'No podés jugar contra vos mismo.',
  no_anfitrion: 'Eso lo decide solo quien creó la sala.',
  fase_incorrecta: 'Eso ya no se puede hacer: la partida siguió.',
  fuera_de_turno: 'Todavía no es tu turno.',
  aun_no: 'Todavía no se acaba el tiempo.',
  conflicto: 'Hubo un cruce de jugadas. Probá de nuevo.',
  limite: 'Demasiados intentos seguidos. Esperá unos segundos.',
  en_linea_no_disponible: 'El modo en línea no está disponible por ahora.',
  error: 'Algo falló. Probá de nuevo en un momento.',
};
const CODIGOS = new Set<string>(Object.keys(MENSAJES));
const POR_ESTADO: Record<number, CodigoError> = { 400: 'entrada_invalida', 401: 'sin_credencial', 403: 'no_miembro', 404: 'sala_inexistente', 410: 'sala_vencida', 429: 'limite', 503: 'en_linea_no_disponible' };

export class ErrorCliente extends Error {
  constructor(readonly codigo: CodigoError, readonly estado: number, mensaje?: string, readonly faltanMs?: number, readonly reintentarSeg?: number) {
    super(mensaje || MENSAJES[codigo]);
  }
  /** Una caída de red o una respuesta que no es del servidor: no dice nada del estado de la sala. */
  get esRed() { return this.estado === 0; }
}

// ---------- HTTP ----------
interface Opciones { metodo?: 'GET' | 'POST' | 'PUT'; cuerpo?: unknown; identidad?: boolean }

async function llamar<T>(ruta: string, { metodo = 'GET', cuerpo, identidad = true }: Opciones = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(ruta, {
      method: metodo,
      headers: { ...(identidad ? cabeceras() : {}), ...(cuerpo !== undefined ? { 'content-type': 'application/json' } : {}) },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(TIEMPO_MS),
    });
  } catch {
    throw new ErrorCliente('error', 0, 'No hay conexión con el servidor.');
  }
  let datos: unknown = null;
  try { datos = await res.json(); } catch { /* cuerpo vacío o que no es JSON */ }
  if (res.ok) {
    if (datos === null || typeof datos !== 'object') throw new ErrorCliente('error', 0);
    return datos as T;
  }
  const d = (datos && typeof datos === 'object' ? datos : {}) as { error?: unknown; mensaje?: unknown; faltanMs?: unknown };
  const codigo = typeof d.error === 'string' && CODIGOS.has(d.error) ? (d.error as CodigoError) : (POR_ESTADO[res.status] ?? 'error');
  const seg = Number(res.headers.get('retry-after'));
  throw new ErrorCliente(
    codigo, res.status,
    codigo === 'apodo_rechazado' && typeof d.mensaje === 'string' ? d.mensaje.slice(0, 160) : undefined,   // el motivo del filtro, en una frase
    typeof d.faltanMs === 'number' ? d.faltanMs : undefined,
    Number.isFinite(seg) && seg > 0 ? seg : undefined,
  );
}

// ---------- Forma mínima de lo que llega (antes de pintar) ----------
const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const txt = (x: unknown): x is string => typeof x === 'string';
const dupla = (x: unknown, f: (v: unknown) => boolean): boolean => Array.isArray(x) && x.length === 2 && x.every(f);
const lista = (x: unknown, f: (v: unknown) => boolean): boolean => Array.isArray(x) && x.every(f);
const obj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const CATS: readonly string[] = ['pais', 'club', 'preguntas', 'dedonde'];
const FASES: readonly string[] = ['lobby', 'jugando', 'entre', 'fin', 'cerrada'];
const idx = (x: unknown) => x === 0 || x === 1;

function esJuego(j: unknown): boolean {
  if (!obj(j) || !num(j.deadline)) return false;
  if (j.cat === 'pais' || j.cat === 'club') {
    return txt(j.ref) && txt(j.fase) && idx(j.turno) && (j.texto === null || txt(j.texto)) && typeof j.porFuente === 'boolean'
      && lista(j.jugadas, (x) => obj(x) && idx(x.jugador) && txt(x.nombre) && typeof x.sinVerificar === 'boolean' && typeof x.apelacion === 'boolean');
  }
  if (j.cat === 'preguntas' || j.cat === 'dedonde') {
    const comun = txt(j.fase) && num(j.n) && lista(j.opciones, txt) && dupla(j.respondio, (v) => typeof v === 'boolean')
      && (j.revelado === null || (obj(j.revelado) && num(j.revelado.correcta) && dupla(j.revelado.elegida, (v) => v === null || num(v))));
    return j.cat === 'preguntas'
      ? comun && txt(j.pregunta) && num(j.total) && typeof j.subita === 'boolean' && dupla(j.aciertos, num)
      : comun && txt(j.nombre) && typeof j.extra === 'boolean' && dupla(j.puntos, num) && num(j.meta);
  }
  return false;
}
const esPerfilPublico = (p: unknown) => obj(p) && txt(p.apodo) && (p.avatar === null || (Array.isArray(p.avatar) && p.avatar.length === 6 && p.avatar.every(num)))
  && (p.club === null || txt(p.club)) && (p.seleccion === null || txt(p.seleccion));

export function esSalaPublica(s: unknown): s is SalaPublica {
  if (!obj(s) || !txt(s.codigo) || !CODIGO_RE.test(s.codigo) || !num(s.v) || !num(s.ahora) || !num(s.vence) || !txt(s.fase) || !FASES.includes(s.fase)) return false;
  if (!obj(s.config) || !txt(s.config.modo) || !(s.config.modo === 'completo' || CATS.includes(s.config.modo)) || !(s.config.ref === null || txt(s.config.ref))) return false;
  if (!Array.isArray(s.jugadores) || s.jugadores.length < 1 || s.jugadores.length > 2 || !s.jugadores.every(esPerfilPublico)) return false;
  if (!dupla(s.revancha, (v) => typeof v === 'boolean') || !(s.salio === null || idx(s.salio))) return false;
  if (s.partida === null) return true;
  const p = s.partida;
  return obj(p) && num(p.num) && lista(p.categorias, (c) => txt(c) && CATS.includes(c)) && num(p.actual)
    && lista(p.resultados, (r) => obj(r) && txt(r.categoria) && (r.ganador === null || idx(r.ganador)) && dupla(r.puntos, num) && txt(r.motivo))
    && (p.juego === null || esJuego(p.juego)) && (p.entreDeadline === null || num(p.entreDeadline))
    && (p.final === null || (obj(p.final) && (p.final.ganador === null || idx(p.final.ganador)) && txt(p.final.motivo) && (p.final.abandono === null || idx(p.final.abandono))
      && dupla(p.final.rankingGanado, num) && dupla(p.final.sinPuntos, (v) => v === null || txt(v))));
}
export const esEvento = (x: unknown): x is EventoCanal => obj(x) && num(x.v) && esSalaPublica(x.sala) && x.sala.v === x.v;
export const esRespuestaSala = (x: unknown): x is RespuestaSala => obj(x) && esSalaPublica(x.sala) && idx(x.yo);
const esPrevia = (x: unknown): x is PreviaSala => obj(x) && x.previa === true && typeof x.llena === 'boolean' && txt(x.anfitrion);

async function pedirSala(ruta: string, o?: Opciones): Promise<RespuestaSala> {
  const r = await llamar<unknown>(ruta, o);
  if (!esRespuestaSala(r)) throw new ErrorCliente('error', 0);
  return r;
}

// ---------- Funciones del contrato ----------
/** ¿Hay modo en línea? Cualquier falla (sin red, sin API, respuesta rara) cuenta como "no" y la opción se oculta (RF-01). */
export async function infoEnLinea(): Promise<boolean> {
  try {
    const r = await llamar<unknown>('/api/sala', { identidad: false });
    return obj(r) && r.enLinea === true;
  } catch { return false; }
}
const post = (cuerpo: PeticionSala) => pedirSala('/api/sala', { metodo: 'POST', cuerpo });
export const crearSala = () => post({ accion: 'crear' });
export const unirse = (codigo: string) => post({ accion: 'unirse', codigo });
export const configurar = (codigo: string, config: Config) => post({ accion: 'configurar', codigo, config });
export const empezar = (codigo: string) => post({ accion: 'empezar', codigo });
export const jugar = (codigo: string, jugada: Accion) => post({ accion: 'jugar', codigo, jugada });
export const vencer = (codigo: string, v: number) => post({ accion: 'vencer', codigo, v });
export const revancha = (codigo: string) => post({ accion: 'revancha', codigo });
export const salir = (codigo: string) => post({ accion: 'salir', codigo });

/** La sala si el dispositivo es de ella; si no, la vista previa (llena o no, y el apodo del anfitrión). */
export async function estadoSala(codigo: string): Promise<RespuestaSala | PreviaSala> {
  if (!CODIGO_RE.test(codigo)) throw new ErrorCliente('sala_inexistente', 404);
  const r = await llamar<unknown>(`/api/sala?codigo=${encodeURIComponent(codigo)}`);
  if (esPrevia(r)) return r;
  if (!esRespuestaSala(r)) throw new ErrorCliente('error', 0);
  return r;
}
export const esPrevio = (r: RespuestaSala | PreviaSala): r is PreviaSala => 'previa' in r;

export async function pedirToken(codigo: string): Promise<RespuestaToken> {
  const r = await llamar<unknown>('/api/ably-token', { metodo: 'POST', cuerpo: { codigo } });
  if (obj(r) && r.dev === true) return { dev: true };
  if (obj(r) && txt(r.token) && num(r.issued) && num(r.expires) && txt(r.capability)) return { token: r.token, issued: r.issued, expires: r.expires, capability: r.capability };
  throw new ErrorCliente('error', 0);
}

export async function ranking(): Promise<RankingRetos> {
  const r = await llamar<unknown>('/api/retos-ranking');
  const fila = (f: unknown) => obj(f) && num(f.pos) && txt(f.apodo) && num(f.puntos) && num(f.victorias) && typeof f.yo === 'boolean'
    && (f.avatar === null || (Array.isArray(f.avatar) && f.avatar.length === 6 && f.avatar.every(num)));
  if (!obj(r) || !lista(r.top, fila) || !(r.yo === null || fila(r.yo))) throw new ErrorCliente('error', 0);
  return r as unknown as RankingRetos;
}

// ---------- Perfil mínimo para jugar (RF-31) ----------
/** [piel, pelo, color de pelo, barba, extra, dorsal] al azar, dentro de los rangos que valida el servidor. */
export function avatarAlAzar(azar: () => number = Math.random): AvatarCodigo {
  const r = (n: number) => Math.floor(azar() * n);
  return [r(6), r(8), r(6), r(5), r(4), 1 + r(99)];
}
/** El perfil de este dispositivo, o null si todavía no tiene (sin token, o el servidor dice que no existe). */
export async function perfilPropio(): Promise<PerfilCompleto | null> {
  if (!tokenGuardado()) return null;
  try {
    return await llamar<PerfilCompleto>('/api/perfil');
  } catch (e) {
    if (e instanceof ErrorCliente && !e.esRed && (e.estado === 404 || e.estado === 401 || e.estado === 403)) return null;
    throw e;
  }
}
/** Crea el perfil con el apodo y un avatar al azar. El token nuevo se queda guardado solo si el servidor lo acepta. */
export async function crearPerfil(apodo: string): Promise<PerfilCompleto> {
  const hay = tokenGuardado();
  if (!hay) crearToken();
  const cuerpo: PerfilEdicion = { apodo, avatar: avatarAlAzar(), club: null, seleccion: null };
  try {
    return await llamar<PerfilCompleto>('/api/perfil', { metodo: 'PUT', cuerpo });
  } catch (e) {
    // Rechazo definitivo: el token nuevo no sirve. Si fue la red, se conserva: el perfil pudo haberse creado y el reintento lo reclama.
    if (!hay && !(e instanceof ErrorCliente && e.esRed)) escribir(K_TOKEN, null);
    throw e;
  }
}

// ---------- Reloj del servidor ----------
/**
 * ahora() = Date.now() + desfase. Cada vista trae `ahora` del servidor; llega con la latencia de la red, así que la medida siempre
 * queda por debajo del desfase real: se guarda la MAYOR (la de menor latencia).
 * ponytail: no corrige un cambio de hora del celular a mitad de la sala; al reentrar se vuelve a medir.
 */
export function crearReloj(ahora: () => number = Date.now) {
  let desfase: number | null = null;
  return {
    muestrear(servidorAhora: number) {
      const d = servidorAhora - ahora();
      if (desfase === null || d > desfase) desfase = d;
    },
    ahora: () => ahora() + (desfase ?? 0),
  };
}
