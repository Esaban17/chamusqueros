// Credencial de tiempo real (RF-16, RF-37; A01, A02): token de Ably de SOLO suscripción sobre el canal de esa sala, de 15 min y sin clientId.
// POST /api/ably-token (cuerpo { codigo }) → TokenAbly · 503 en_linea_no_disponible si no hay llave · { dev: true } con EN_LINEA_DEV=1.
// Solo se emite a quien es miembro de la sala; el cliente la vuelve a pedir al vencer, así quien sale deja de renovar.
import { CODIGO_RE, SALA_VIDA_MS, type RespuestaToken } from '../src/retos/online/protocolo.js';
import { disponible, modoDev, pedirToken } from './_ably.js';
import { identificar } from './_auth.js';
import { leerSala } from './_bd.js';
import { fallo, ipDe, leerJson, limitado, registrar, responder } from './_http.js';
import { LIMITES, limitar } from './_limite.js';
import type { SalaInterna } from '../src/retos/online/motor.js';

export async function POST(req: Request) {
  try {
    // Sin llave, sin detalles: el mismo 503 para cualquiera (CA-1).
    if (!disponible()) return fallo('en_linea_no_disponible');
    const ip = limitar(`token-ip:${ipDe(req)}`, LIMITES.tokenIp);
    if (ip) return limitado(ip);
    const b = await leerJson(req);
    if (!b || Object.keys(b).length !== 1 || typeof b.codigo !== 'string' || !CODIGO_RE.test(b.codigo)) return fallo('entrada_invalida');
    const quien = await identificar(req);
    if (!quien.ok) return fallo(quien.error, { status: quien.status });
    const dev = limitar(`token:${quien.id}`, LIMITES.token);
    if (dev) return limitado(dev);

    const fila = await leerSala(b.codigo);
    if (!fila) return fallo('sala_inexistente');
    if (Date.now() - fila.actualizado > SALA_VIDA_MS) return fallo('sala_vencida');
    const sala = fila.estado as SalaInterna;
    if (sala.fase === 'cerrada') return fallo('sala_vencida');
    if (!sala.miembros.some((m) => m.id === quien.id)) return fallo('no_miembro');

    if (modoDev()) return responder(200, { dev: true } satisfies RespuestaToken);
    const token = await pedirToken(b.codigo);
    return token ? responder(200, token satisfies RespuestaToken) : fallo('en_linea_no_disponible');
  } catch (e) {
    registrar('ably-token', e);
    return fallo('error');
  }
}
