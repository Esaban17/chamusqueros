// Cliente del perfil: GET/PUT /api/perfil con la identidad del dispositivo, y la copia local que precarga la carrera.
// Identidad (plan, "Una identidad por dispositivo"): el UUID de siempre (`chamusqueros:id`, el del ranking de carreras) más un token
// aleatorio de 256 bits (`chamusqueros:retos-token`) que se crea al guardar el perfil por primera vez y solo viaja en la cabecera.
// La copia local (`chamusqueros:perfil`) nunca lleva el token. Todo acceso a localStorage va con try/catch.
import { COUNTRIES } from '../engine/countries';
import { ALL_CLUBS } from '../engine/clubs';
import { avatarDeCodigo } from '../ui/avatar-editor';
import type { AvatarCodigo, CodigoError, MejorCarrera, PerfilCompleto, PerfilEdicion, PerfilPublico, TipoRacha } from '../retos/online/protocolo';

export const ID_KEY = 'chamusqueros:id';
export const TOKEN_KEY = 'chamusqueros:retos-token';
export const PERFIL_KEY = 'chamusqueros:perfil';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const CLUBES = new Set(ALL_CLUBS.map((c) => c.id));
const PAISES = new Set(COUNTRIES.map((c) => c.code));

function leer(clave: string): string | null {
  try { return localStorage.getItem(clave); } catch { return null; }
}
function escribir(clave: string, valor: string) {
  try { localStorage.setItem(clave, valor); } catch { /* sin almacenamiento: el perfil sigue en el servidor */ }
}
/** main.ts guarda el id con JSON.stringify (entre comillas); el token se guarda tal cual. Se aceptan las dos formas. */
const sinComillas = (s: string | null) => (s ?? '').replace(/^"|"$/g, '');

/** El id anónimo del dispositivo; si todavía no existe lo crea con el mismo formato que main.ts. */
export function idDispositivo(): string {
  const id = sinComillas(leer(ID_KEY));
  if (UUID_RE.test(id)) return id;
  const nuevo = crypto.randomUUID();
  escribir(ID_KEY, JSON.stringify(nuevo));
  return nuevo;
}
export function tokenGuardado(): string | null {
  const t = sinComillas(leer(TOKEN_KEY));
  return TOKEN_RE.test(t) ? t : null;
}
function tokenNuevo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ---------- Copia local y validación (lo que viene del servidor o de localStorage no se cree) ----------

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const entero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : 0);

/** Un `PerfilEdicion` válido o null: apodo, avatar dentro de rango, club y selección de las listas del juego. */
export function normalizarEdicion(v: unknown): PerfilEdicion | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const apodo = texto(o.apodo, 20).trim();
  if (!apodo || !avatarDeCodigo(o.avatar)) return null;
  return {
    apodo,
    avatar: o.avatar as AvatarCodigo,
    club: typeof o.club === 'string' && CLUBES.has(o.club) ? o.club : null,
    seleccion: typeof o.seleccion === 'string' && PAISES.has(o.seleccion) ? o.seleccion : null,
  };
}

/** El perfil guardado en este dispositivo, o null. */
export function perfilLocal(): PerfilEdicion | null {
  try { return normalizarEdicion(JSON.parse(leer(PERFIL_KEY) ?? 'null')); } catch { return null; }
}
export function guardarLocal(p: PerfilPublico) {
  escribir(PERFIL_KEY, JSON.stringify({ apodo: p.apodo, avatar: p.avatar, club: p.club, seleccion: p.seleccion }));
}

const RACHAS: readonly string[] = ['V', 'E', 'D'];
function normalizarCompleto(v: unknown): PerfilCompleto | null {
  const base = normalizarEdicion(v);
  if (!base) return null;
  const o = v as Record<string, unknown>;
  const e = (o.estadisticas && typeof o.estadisticas === 'object' ? o.estadisticas : {}) as Record<string, unknown>;
  const c = o.mejorCarrera && typeof o.mejorCarrera === 'object' ? (o.mejorCarrera as Record<string, unknown>) : null;
  const mejorCarrera: MejorCarrera | null = c ? { score: entero(c.score), titles: entero(c.titles), caps: entero(c.caps) } : null;
  return {
    ...base,
    estadisticas: {
      jugadas: entero(e.jugadas), victorias: entero(e.victorias), empates: entero(e.empates), derrotas: entero(e.derrotas),
      rachaTipo: typeof e.rachaTipo === 'string' && RACHAS.includes(e.rachaTipo) ? (e.rachaTipo as TipoRacha) : null,
      rachaN: entero(e.rachaN), mejorRachaV: entero(e.mejorRachaV), puntos: entero(e.puntos),
      posicion: e.posicion == null ? null : entero(e.posicion) || null,
    },
    mejorCarrera,
  };
}

// ---------- HTTP ----------

export class ErrorPerfil extends Error {
  constructor(public codigo: CodigoError | 'red', mensaje?: string) { super(mensaje ?? codigo); }
}

async function pedir(metodo: 'GET' | 'PUT', token: string, cuerpo?: PerfilEdicion): Promise<PerfilCompleto | null> {
  let res: Response;
  try {
    res = await fetch('/api/perfil', {
      method: metodo,
      headers: { 'x-jugador-id': idDispositivo(), authorization: `Bearer ${token}`, ...(cuerpo ? { 'content-type': 'application/json' } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ErrorPerfil('red');
  }
  if (res.status === 404 && metodo === 'GET') return null;   // sin_perfil
  const datos: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const e = (datos && typeof datos === 'object' ? datos : {}) as { error?: unknown; mensaje?: unknown };
    throw new ErrorPerfil(typeof e.error === 'string' ? (e.error as CodigoError) : 'error', typeof e.mensaje === 'string' ? e.mensaje.slice(0, 200) : undefined);
  }
  const p = normalizarCompleto(datos);
  if (!p) throw new ErrorPerfil('error');
  return p;
}

/** El perfil del servidor; null si este dispositivo todavía no tiene (o no tiene credencial). Refresca la copia local. */
export async function leerPerfil(): Promise<PerfilCompleto | null> {
  const token = tokenGuardado();
  if (!token) return null;
  const p = await pedir('GET', token);
  if (p) guardarLocal(p);
  return p;
}

/** Crea o edita el perfil. El token nuevo solo se conserva si el servidor lo aceptó. */
export async function guardarPerfil(p: PerfilEdicion): Promise<PerfilCompleto> {
  const token = tokenGuardado() ?? tokenNuevo();
  const r = await pedir('PUT', token, p);
  if (!r) throw new ErrorPerfil('error');
  escribir(TOKEN_KEY, token);
  guardarLocal(r);
  return r;
}
