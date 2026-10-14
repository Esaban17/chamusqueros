// Verifica un futbolista de Retos Fútbol contra Wikidata (datos CC0). Ver specs/retos-futbol/plan.md, "Servicio de verificación".
// GET /api/futbolista?nombre=<texto>&tipo=pais|club&id=<código de país o id de club>
// 200 { valido, qid, nombreCanonico } · 400 entrada inválida · 429 límite de uso · 502 Wikidata respondió mal · 504 Wikidata tardó.
// El navegador trata todo lo que no sea 200 como "no verificable" y decide el rival (RF-17).
// Nada de lo que escribe el jugador decide a dónde se llama ni entra a una consulta SPARQL: este servicio no usa SPARQL.
import { CLUBES, NOMBRE_RE, PAISES, coincide, normalizar, type Verificacion } from './_retos.js';

// Único host y ruta de salida (A10, SSRF). Con redirect: 'error' tampoco se puede desviar.
const WIKIDATA = 'https://www.wikidata.org/w/api.php';
// La política de Wikimedia pide un agente propio con un contacto: esa página lista el correo de contacto del sitio.
const UA = 'Chamusqueros/1.0 (https://chamusqueros.vercel.app/privacidad.html; retos-futbol)';
const FUTBOLISTA = 'Q937857'; // ocupación (P106): futbolista de asociación
const QID = /^Q[1-9]\d{0,9}$/;
const POR_LLAMADA_MS = 2000;
const TOTAL_MS = 4000;

const HORA = 3600_000;
const CACHE_MAX = 1000;
const IP_MAX = 5000;
const POR_IP = 30; // solicitudes por ventana
const VENTANA_MS = 60_000;
const SALIENTES_MAX = 150; // llamadas a Wikidata por minuto por instancia (cortesía con Wikimedia)

// ponytail: caché y límites en memoria de cada instancia, de mejor esfuerzo; la CDN (s-maxage) es la caché compartida
// y una regla de "Rate Limiting" en el Firewall de Vercel sería el tope global (configuración, no código).
const cache = new Map<string, { v: Verificacion; vence: number }>();
const ips = new Map<string, { n: number; vence: number }>();
let salientes = { n: 0, vence: 0 };

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

class FalloWikidata extends Error {
  constructor(readonly status: number, readonly retry = '') { super('wikidata'); }
}

const plazoVencido = (e: unknown) => ['TimeoutError', 'AbortError'].includes((e as Error)?.name);

/** Una llamada a Wikidata: parámetros por URLSearchParams, plazo propio y sin seguir redirecciones. */
async function llamar(params: Record<string, string>, plazoMs: number): Promise<any> {
  const ahora = Date.now();
  if (salientes.vence <= ahora) salientes = { n: 0, vence: ahora + VENTANA_MS };
  if (++salientes.n > SALIENTES_MAX) throw new FalloWikidata(429, String(Math.max(1, Math.ceil((salientes.vence - ahora) / 1000))));
  if (plazoMs <= 0) throw new FalloWikidata(504);
  let res: Response;
  try {
    res = await fetch(`${WIKIDATA}?${new URLSearchParams({ ...params, format: 'json' })}`, {
      signal: AbortSignal.timeout(Math.min(POR_LLAMADA_MS, plazoMs)),
      redirect: 'error',
      headers: { 'user-agent': UA, accept: 'application/json' },
    });
  } catch (e) {
    throw new FalloWikidata(plazoVencido(e) ? 504 : 502);
  }
  if (res.status === 429) throw new FalloWikidata(429, res.headers.get('retry-after')?.match(/^\d{1,4}$/)?.[0] ?? '30');
  if (!res.ok) throw new FalloWikidata(502);
  let data: any;
  try { data = await res.json(); } catch (e) { throw new FalloWikidata(plazoVencido(e) ? 504 : 502); }
  if (!data || typeof data !== 'object' || data.error) throw new FalloWikidata(502);
  return data;
}

/** Filtro de la búsqueda. Los Q salen del mapa estático, nunca del jugador. */
function filtro(tipo: string, id: string): string {
  if (tipo === 'club') return `haswbstatement:P54=${CLUBES[id]}`;
  const p = PAISES[id];
  return 'haswbstatement:' + [...p.nac.map((q) => `P27=${q}`), `P1532=${p.sel}`].join('|');
}

async function verificar(t: string, tipo: string, id: string): Promise<Verificacion> {
  const inicio = Date.now();
  const busqueda = await llamar({
    action: 'query', list: 'search', srlimit: '5', srnamespace: '0', srprop: '',
    // Entre comillas y solo con letras y espacios: no hay operadores ni comodines posibles (A03). La minúscula neutraliza AND/OR/NOT.
    srsearch: `"${t}" haswbstatement:P106=${FUTBOLISTA} ${filtro(tipo, id)}`,
  }, TOTAL_MS);
  const qids: string[] = (Array.isArray(busqueda.query?.search) ? busqueda.query.search : [])
    .map((r: any) => r?.title)
    .filter((q: unknown): q is string => typeof q === 'string' && QID.test(q));
  if (!qids.length) return { valido: false, qid: null, nombreCanonico: null };

  const ent = await llamar({
    action: 'wbgetentities', ids: qids.join('|'), props: 'labels|aliases', languages: 'es|en',
  }, TOTAL_MS - (Date.now() - inicio));
  // Se recorre en el orden de la búsqueda: el primero que cumpla la regla gana.
  for (const q of qids) {
    const e = ent.entities?.[q];
    if (!e) continue;
    const es: string | undefined = e.labels?.es?.value;
    const en: string | undefined = e.labels?.en?.value;
    const etiquetas = [es, en].filter((x): x is string => typeof x === 'string').map(normalizar);
    const alias = ['es', 'en'].flatMap((l) => (Array.isArray(e.aliases?.[l]) ? e.aliases[l] : []).map((a: any) => (typeof a?.value === 'string' ? normalizar(a.value) : '')));
    if (coincide(t, etiquetas, alias)) return { valido: true, qid: q, nombreCanonico: es ?? en ?? null };
  }
  return { valido: false, qid: null, nombreCanonico: null };
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

  const clave = `${tipo}|${id}|${t}`;
  const guardado = cache.get(clave);
  if (guardado && guardado.vence > ahora) return responder(guardado.v);

  let v: Verificacion;
  try {
    v = await verificar(t, tipo, id);
  } catch (e) {
    const f = e instanceof FalloWikidata ? e : new FalloWikidata(502);
    if (f.status === 429) return fallo(429, 'Límite de uso', { 'retry-after': f.retry || '30' });
    return fallo(f.status, f.status === 504 ? 'La fuente tardó demasiado' : 'La fuente respondió mal');
  }
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(clave, { v, vence: ahora + (v.valido ? 24 : 1) * HORA });
  return responder(v);
}

function responder(v: Verificacion) {
  return Response.json(v, {
    headers: cabeceras(v.valido
      ? 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400'
      : 'public, max-age=0, s-maxage=3600'),
  });
}
