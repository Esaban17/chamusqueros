// Verifica un futbolista de Retos Fútbol contra Wikidata (datos CC0). Ver specs/retos-futbol/plan.md, "Servicio de verificación".
// GET /api/futbolista?nombre=<texto>&tipo=pais|club&id=<código de país o id de club>
// 200 { valido, qid, nombreCanonico } · 400 entrada inválida · 429 límite de uso · 502 Wikidata respondió mal · 504 Wikidata tardó.
// El navegador trata todo lo que no sea 200 como "no verificable" y decide el rival (RF-17).
// Nada de lo que escribe el jugador decide a dónde se llama ni entra a una consulta SPARQL: este servicio no usa SPARQL.
import { CLUBES, NOMBRE_RE, PAISES, normalizar, type Verificacion } from './_retos.js';
import { FalloWikidata, verificarConCache } from './_verificar.js';

// La verificación contra Wikidata (único host, redirect: 'error', plazos, caché y tope de llamadas salientes) vive en api/_verificar.ts.
// Aquí queda la validación de la entrada, el límite por IP y la respuesta HTTP.
const IP_MAX = 5000;
const POR_IP = 30; // solicitudes por ventana
const VENTANA_MS = 60_000;

// ponytail: el límite por IP está en memoria de cada instancia, de mejor esfuerzo; la CDN (s-maxage) es la caché compartida
// y una regla de "Rate Limiting" en el Firewall de Vercel sería el tope global (configuración, no código).
const ips = new Map<string, { n: number; vence: number }>();

const cabeceras = (cache: string, extra: Record<string, string> = {}) => ({
  'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff', 'cache-control': cache, ...extra,
});
const fallo = (status: number, error: string, extra: Record<string, string> = {}) =>
  Response.json({ error }, { status, headers: cabeceras('no-store', extra) });

/** Ventana fija por IP; devuelve los segundos que faltan si se pasó del límite, o 0. */
function limitar(ip: string, ahora: number): number {
  const e = ips.get(ip);
  if (!e || e.vence <= ahora) {
    if (ips.size >= IP_MAX) {
      for (const [k, v] of ips) if (v.vence <= ahora) ips.delete(k);
      if (ips.size >= IP_MAX) ips.delete(ips.keys().next().value!); // sigue lleno: sale la más antigua
    }
    ips.set(ip, { n: 1, vence: ahora + VENTANA_MS });
    return 0;
  }
  return ++e.n > POR_IP ? Math.max(1, Math.ceil((e.vence - ahora) / 1000)) : 0;
}

export async function GET(req: Request) {
  const ahora = Date.now();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0, 64) || 'desconocida';
  const espera = limitar(ip, ahora);
  if (espera) return fallo(429, 'Demasiadas solicitudes', { 'retry-after': String(espera) });

  // Validación antes de gastar una llamada: tipo e id son listas cerradas y el nombre pasa por NOMBRE_RE.
  const p = new URL(req.url).searchParams;
  const nombre = p.get('nombre') ?? '';
  const tipo = p.get('tipo') ?? '';
  const id = p.get('id') ?? '';
  const idOk = (tipo === 'pais' && Object.hasOwn(PAISES, id)) || (tipo === 'club' && Object.hasOwn(CLUBES, id));
  const t = NOMBRE_RE.test(nombre) ? normalizar(nombre) : '';
  if (!idOk || (t.match(/\p{L}/gu)?.length ?? 0) < 2) return fallo(400, 'Entrada inválida');

  let v: Verificacion;
  try {
    v = await verificarConCache(t, tipo, id, ahora);
  } catch (e) {
    const f = e instanceof FalloWikidata ? e : new FalloWikidata(502);
    if (f.status === 429) return fallo(429, 'Límite de uso', { 'retry-after': f.retry || '30' });
    return fallo(f.status, f.status === 504 ? 'La fuente tardó demasiado' : 'La fuente respondió mal');
  }
  return responder(v);
}

function responder(v: Verificacion) {
  return Response.json(v, {
    headers: cabeceras(v.valido
      ? 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400'
      : 'public, max-age=0, s-maxage=3600'),
  });
}
