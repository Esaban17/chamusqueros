// Verificación de futbolistas contra Wikidata (datos CC0), compartida por api/futbolista.ts (el modo local) y api/sala.ts (el ping pong en línea).
// Ver specs/retos-futbol/plan.md, "Servicio de verificación". Nada de lo que escribe el jugador decide a dónde se llama ni entra a una consulta SPARQL.
import { CLUBES, PAISES, coincide, normalizar, type Verificacion } from './_retos.js';

// Único host y ruta de salida (A10, SSRF). Con redirect: 'error' tampoco se puede desviar.
const WIKIDATA = 'https://www.wikidata.org/w/api.php';
// La política de Wikimedia pide un agente propio con un contacto: esa página lista el correo de contacto del sitio.
const UA = 'Chamusqueros/1.0 (https://chamusqueros.vercel.app/privacidad.html; retos-futbol)';
const FUTBOLISTA = 'Q937857'; // ocupación (P106): futbolista de asociación
const QID = /^Q[1-9]\d{0,9}$/;
const POR_LLAMADA_MS = 2000;
const TOTAL_MS = 4000;

const VENTANA_MS = 60_000;
const SALIENTES_MAX = 150; // llamadas a Wikidata por minuto por instancia (cortesía con Wikimedia)
const CACHE_MAX = 1000;
const HORA = 3600_000;

// ponytail: caché y tope en memoria de cada instancia, de mejor esfuerzo; la CDN (s-maxage) es la caché compartida
// y una regla de "Rate Limiting" en el Firewall de Vercel sería el tope global (configuración, no código).
const cache = new Map<string, { v: Verificacion; vence: number }>();
let salientes = { n: 0, vence: 0 };

export class FalloWikidata extends Error {
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

export async function verificar(t: string, tipo: string, id: string): Promise<Verificacion> {
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


/** Verificación con la caché de la instancia: lo válido dura 24 h; lo inválido, 1 h. Lanza FalloWikidata si la fuente falla. */
export async function verificarConCache(t: string, tipo: string, id: string, ahora = Date.now()): Promise<Verificacion> {
  const clave = `${tipo}|${id}|${t}`;
  const guardado = cache.get(clave);
  if (guardado && guardado.vence > ahora) return guardado.v;
  const v = await verificar(t, tipo, id);
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(clave, { v, vence: ahora + (v.valido ? 24 : 1) * HORA });
  return v;
}
