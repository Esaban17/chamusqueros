// Respuestas, errores y lectura del cuerpo comunes a los endpoints de Retos en línea (A02, A05, A09). El prefijo "_" hace que Vercel no lo publique como ruta.
import type { CodigoError, ErrorApi } from '../src/retos/online/protocolo.js';

const ESTADO: Record<CodigoError, number> = {
  entrada_invalida: 400, apodo_rechazado: 400, sin_credencial: 401, sin_perfil: 404, no_miembro: 403, sala_inexistente: 404, sala_vencida: 410,
  sala_llena: 409, mismo_dispositivo: 409, no_anfitrion: 403, fase_incorrecta: 409, fuera_de_turno: 409, aun_no: 409, conflicto: 409, limite: 429,
  en_linea_no_disponible: 503, error: 500,
};
/** Mensajes genéricos: nunca llevan detalles internos (A05). */
const MENSAJE: Partial<Record<CodigoError, string>> = {
  entrada_invalida: 'Entrada inválida.', sin_credencial: 'Falta la credencial del dispositivo o no corresponde.', sin_perfil: 'Todavía no hay perfil en este dispositivo.',
  no_miembro: 'No sos parte de esa sala.', sala_inexistente: 'La sala no existe o ya venció.', sala_vencida: 'La sala no existe o ya venció.', sala_llena: 'Sala llena.',
  mismo_dispositivo: 'No podés jugar contra vos mismo.', no_anfitrion: 'Solo el anfitrión puede hacer eso.', fase_incorrecta: 'Eso no se puede hacer ahora.',
  fuera_de_turno: 'No es tu turno.', aun_no: 'Todavía no venció el plazo.', conflicto: 'Hubo un cambio al mismo tiempo; intentá de nuevo.',
  limite: 'Demasiadas solicitudes; esperá un momento.', en_linea_no_disponible: 'El modo en línea no está disponible.', error: 'Algo salió mal.',
};

/** JSON con tipo declarado, sin sniffing, sin caché y sin CORS: todo lo de Retos en línea depende de quién pregunta. */
export function responder(status: number, cuerpo: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff', 'cache-control': 'no-store', ...extra },
  });
}

export function fallo(error: CodigoError, extra: { mensaje?: string; faltanMs?: number; retryAfter?: number; status?: number } = {}): Response {
  const cuerpo: ErrorApi = { error, mensaje: extra.mensaje ?? MENSAJE[error] };
  if (extra.faltanMs !== undefined) cuerpo.faltanMs = extra.faltanMs;
  return responder(extra.status ?? ESTADO[error], cuerpo, extra.retryAfter ? { 'retry-after': String(extra.retryAfter) } : {});
}

export const limitado = (segundos: number) => fallo('limite', { retryAfter: segundos });

export const ipDe = (req: Request) => req.headers.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0, 64) || 'desconocida';

const CUERPO_MAX = 2048;
/** Cuerpo JSON de a lo más 2 KB y que sea un objeto; null si no cumple (el endpoint responde 400). */
export async function leerJson(req: Request): Promise<Record<string, unknown> | null> {
  const largo = Number(req.headers.get('content-length') ?? 0);
  if (!Number.isFinite(largo) || largo > CUERPO_MAX) return null;
  let texto: string;
  try { texto = await req.text(); } catch { return null; }
  if (new TextEncoder().encode(texto).length > CUERPO_MAX) return null;
  try {
    const v = JSON.parse(texto);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch { return null; }
}

/** A09: un error se registra con la acción y el nombre del error (o el código de estado), nunca con cuerpos, cabeceras ni tokens. */
export function registrar(accion: string, e: unknown) {
  const detalle = e instanceof Error ? e.name : typeof e === 'string' ? e : 'desconocido';
  console.error(`retos-en-linea: ${accion} falló (${detalle})`);
}
