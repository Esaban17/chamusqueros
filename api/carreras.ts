// Contador anónimo de carreras (specs/contador-carreras): un aviso "iniciada" o "terminada" suma 1 al contador del día. Solo escribe; no devuelve datos ni se puede leer.
// Esquema en db/contador-carreras.sql. No lee ninguna cabecera de identidad del juego: el aviso es anónimo por diseño.
import { contarCarrera } from './_bd.js';
import { fallo, ipDe, leerJson, limitado, registrar } from './_http.js';
import { LIMITES, limitar } from './_limite.js';

export async function POST(req: Request): Promise<Response> {
  try {
    // Primero el tope (lo más barato): lo malformado también cuenta contra la IP.
    const espera = limitar(`carreras-ip:${ipDe(req)}`, LIMITES.carrerasIp);
    if (espera) return limitado(espera);
    // Exigir JSON impide que un formulario de otro sitio dispare el aviso.
    if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return fallo('entrada_invalida');
    const cuerpo = await leerJson(req);
    const claves = cuerpo ? Object.keys(cuerpo) : [];
    if (!cuerpo || claves.length !== 1 || claves[0] !== 'evento' || (cuerpo.evento !== 'iniciada' && cuerpo.evento !== 'terminada')) return fallo('entrada_invalida');
    await contarCarrera(cuerpo.evento, Date.now());
    return new Response(null, { status: 204, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
  } catch (e) {
    registrar('carreras', e);
    return fallo('error');
  }
}
