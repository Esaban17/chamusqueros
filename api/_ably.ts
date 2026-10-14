// Ably (tiempo real) para Retos en línea: publicar el estado de una sala desde el servidor y emitir tokens de solo suscripción (A01, A02, A10).
// Los clientes NO publican: toda jugada va por HTTP al servidor, que valida y publica. La llave (ABLY_API_KEY) vive solo en variables de entorno del servidor.
// Único host: https://main.realtime.ably.net; sin seguir redirecciones; el único dato variable es el nombre del canal, que sale de CODIGO_RE.
import { randomBytes } from 'node:crypto';
import { CODIGO_RE, EVENTO, canal, type EventoCanal, type TokenAbly } from '../src/retos/online/protocolo.js';
import { registrar } from './_http.js';

export const ABLY = 'https://main.realtime.ably.net';
const TOKEN_VIDA_MS = 15 * 60_000;
const PLAZO_MS = 3000;
// Forma de la llave de Ably: idApp.idLlave:secreto
const LLAVE_RE = /^([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+):[A-Za-z0-9_+/=-]+$/;

/** EN_LINEA_DEV=1: sin llave, para trabajar en local; el cliente usa el transporte de sondeo y nada sale a Ably. */
export const modoDev = () => process.env.EN_LINEA_DEV === '1';
const llave = () => (process.env.ABLY_API_KEY && LLAVE_RE.test(process.env.ABLY_API_KEY) ? process.env.ABLY_API_KEY : null);
/** RF-01, RF-37: sin llave válida (ni modo de desarrollo) el modo en línea no está disponible y nada más se rompe. */
export const disponible = () => modoDev() || llave() !== null;

const basic = (l: string) => `Basic ${Buffer.from(l).toString('base64')}`;

/** Publica el estado de la sala; el `id` hace la publicación idempotente. De mejor esfuerzo: si falla, el estado ya está guardado y el cliente se corrige con el siguiente evento o con un GET. */
export async function publicar(codigo: string, evento: EventoCanal): Promise<boolean> {
  const l = llave();
  if (modoDev()) return true;
  if (!l || !CODIGO_RE.test(codigo)) return false;
  try {
    const res = await fetch(`${ABLY}/channels/${encodeURIComponent(canal(codigo))}/messages`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(PLAZO_MS),
      headers: { authorization: basic(l), 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ name: EVENTO, data: evento, id: `${codigo}:${evento.v}` }),
    });
    if (res.status !== 201) { registrar('ably-publicar', `http ${res.status}`); return false; }
    return true;
  } catch (e) {
    registrar('ably-publicar', e);
    return false;
  }
}

/** Token de Ably de solo suscripción sobre el canal de esa sala, de 15 min y sin clientId (no se filtra identidad). null si Ably no responde bien. */
export async function pedirToken(codigo: string): Promise<TokenAbly | null> {
  const l = llave();
  if (!l || !CODIGO_RE.test(codigo)) return null;
  const keyName = LLAVE_RE.exec(l)![1];
  try {
    const res = await fetch(`${ABLY}/keys/${encodeURIComponent(keyName)}/requestToken`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(PLAZO_MS),
      headers: { authorization: basic(l), 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        keyName, ttl: String(TOKEN_VIDA_MS), capability: JSON.stringify({ [canal(codigo)]: ['subscribe'] }), timestamp: Date.now(), nonce: randomBytes(16).toString('hex'),
      }),
    });
    if (!res.ok) { registrar('ably-token', `http ${res.status}`); return null; }
    const d = (await res.json()) as Record<string, unknown>;
    // Solo se reenvía la forma exacta que espera el cliente; nada más de lo que conteste Ably.
    if (typeof d?.token !== 'string' || d.token.length > 4096 || typeof d.issued !== 'number' || typeof d.expires !== 'number' || typeof d.capability !== 'string') {
      registrar('ably-token', 'respuesta con forma inesperada');
      return null;
    }
    return { token: d.token, issued: d.issued, expires: d.expires, capability: d.capability };
  } catch (e) {
    registrar('ably-token', e);
    return null;
  }
}
