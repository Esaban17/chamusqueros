// Identidad del dispositivo (A01, A07): `x-jugador-id` (UUID) + `authorization: Bearer <token>` (32 bytes aleatorios en base64url, 43 caracteres).
// El servidor guarda solo sha256(token) y lo compara en tiempo constante. El token nunca va en la URL ni en un cuerpo, ni se registra.
import { createHash, timingSafeEqual } from 'node:crypto';
import { hashDe } from './_bd.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TOKEN = /^Bearer ([A-Za-z0-9_-]{43})$/;

export const sha256 = (token: string) => createHash('sha256').update(token).digest('hex');

export type Credencial = { id: string; hash: string } | null;
/** Solo la forma: el id en minúsculas y el hash del token. Null si falta algo o viene mal formado (401). */
export function credencial(req: Request): Credencial {
  const id = req.headers.get('x-jugador-id')?.toLowerCase();
  const t = TOKEN.exec(req.headers.get('authorization') ?? '');
  return id && UUID.test(id) && t ? { id, hash: sha256(t[1]) } : null;
}

export type Identificado = { ok: true; id: string } | { ok: false; error: 'sin_credencial' | 'sin_perfil'; status: number };
/** Forma + coincidencia con el hash guardado. Sin perfil → 404; token ajeno → 403; forma inválida → 401. */
export async function identificar(req: Request): Promise<Identificado> {
  const c = credencial(req);
  if (!c) return { ok: false, error: 'sin_credencial', status: 401 };
  const guardado = await hashDe(c.id);
  if (!guardado) return { ok: false, error: 'sin_perfil', status: 404 };
  const a = Buffer.from(guardado, 'hex'), b = Buffer.from(c.hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b) ? { ok: true, id: c.id } : { ok: false, error: 'sin_credencial', status: 403 };
}
