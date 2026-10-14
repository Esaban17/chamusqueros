// Verificador de los identificadores de Wikidata de Retos Fútbol (CA-8) y prueba de humo del servicio (CA-2 en vivo).
//   npx tsx scripts/retos-qids.ts          comprueba api/_retos.ts contra Wikidata y contra el juego; sale con 1 si algo no cuadra
//   npx tsx scripts/retos-qids.ts --humo   corre la tabla de CA-2 contra Wikidata con el servicio real y mide la latencia
// Es una prueba a mano (usa la red), no de CI. Si un identificador falla, se corrige el mapa, no este script.
import { CLUBES, PAISES, normalizar } from '../api/_retos';
import { COUNTRIES } from '../src/engine/countries';
import { ALL_CLUBS, clubById } from '../src/engine/clubs';

const WIKIDATA = 'https://www.wikidata.org/w/api.php';
const UA = 'Chamusqueros/1.0 (https://chamusqueros.vercel.app/privacidad.html; retos-futbol; verificador)';
const FUTBOLISTA = 'Q937857';
const MIN = 40; // futbolistas mínimos por país o club (CA-8)
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(params: Record<string, string>): Promise<any> {
  for (let intento = 0; ; intento++) {
    await pausa(120);
    const res = await fetch(`${WIKIDATA}?${new URLSearchParams({ ...params, format: 'json' })}`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(15000) });
    if (res.status === 429 && intento < 3) { await pausa(5000); continue; }
    if (!res.ok) throw new Error(`Wikidata ${res.status} en ${params.action}`);
    return res.json();
  }
}

// ---------- Humo: la tabla de CA-2 con el servicio real ----------
if (process.argv.includes('--humo')) {
  const { GET } = await import('../api/futbolista');
  // [entrada, tipo, id, valido esperado, nombre esperado (opcional)]
  const casos: [string, 'pais' | 'club', string, boolean, string?][] = [
    ['messi', 'pais', 'AR', true, 'Lionel Messi'],
    ['  MESSI ', 'pais', 'AR', true, 'Lionel Messi'],
    ['Lionel Messi', 'pais', 'AR', true, 'Lionel Messi'],
    ['Chicharito', 'pais', 'MX', true],
    ['Rooney', 'pais', 'EN', true, 'Wayne Rooney'],
    ['Messi', 'pais', 'MX', false],
    ['Messi', 'club', 'es-real-madrid', false],
    ['Messi', 'club', 'es-barcelona', true, 'Lionel Messi'],
    ['Rooney', 'club', 'en-manchester-united', true, 'Wayne Rooney'],
    ['Carlos Ruiz', 'pais', 'GT', true],
    ['Lionel Mesi', 'pais', 'AR', false],
    ['Taylor Swift', 'pais', 'US', false],
    ['xqzvwk', 'pais', 'GT', false],
  ];
  const ms: number[] = [];
  let mal = 0;
  for (const [entrada, tipo, id, valido, nombre] of casos) {
    const t0 = Date.now();
    const url = `http://x/api/futbolista?${new URLSearchParams({ nombre: normalizar(entrada), tipo, id })}`;
    const res = await GET(new Request(url, { headers: { 'x-forwarded-for': '10.0.0.1' } }));
    const dt = Date.now() - t0;
    ms.push(dt);
    const cuerpo = await res.json();
    const ok = res.status === 200 && cuerpo.valido === valido && (!nombre || cuerpo.nombreCanonico === nombre);
    if (!ok) mal++;
    console.log(`${ok ? 'OK  ' : 'FALLA'} ${String(dt).padStart(5)} ms  ${JSON.stringify(entrada)} / ${id} → ${res.status} ${JSON.stringify(cuerpo)}`);
    await pausa(300);
  }
  ms.sort((a, b) => a - b);
  const p90 = ms[Math.ceil(ms.length * 0.9) - 1];
  console.log(`\nLatencia: mediana ${ms[Math.floor(ms.length / 2)]} ms, p90 ${p90} ms, máxima ${ms[ms.length - 1]} ms (meta: 90 % en 2000 ms o menos).`);
  if (mal || p90 > 2000) { console.error(`${mal} caso(s) fuera de lo esperado${p90 > 2000 ? ' y latencia p90 por encima de la meta' : ''}.`); process.exit(1); }
  console.log('Humo: todos los casos dan lo esperado.');
  process.exit(0);
}

// ---------- Identificadores (a a f del plan) ----------
const fallas: string[] = [];
const falla = (m: string) => { fallas.push(m); console.error('FALLA ' + m); };

// Nombre esperado de cada club (fragmentos normalizados; "|" separa alternativas); se busca en la etiqueta o los alias es/en.
const ESPERADO: Record<string, string> = {
  'municipal': 'municipal', 'comunicaciones': 'comunicaciones', 'xelaju': 'xelaju', 'antigua': 'antigua',
  'cr-saprissa': 'saprissa', 'cr-alajuelense': 'alajuelense', 'cr-herediano': 'herediano',
  'hn-olimpia': 'olimpia', 'hn-motagua': 'motagua', 'sv-alianza': 'alianza', 'sv-aguila': 'aguila', 'pa-tauro': 'tauro',
  'mx-america': 'america', 'mx-guadalajara': 'guadalajara', 'mx-cruz-azul': 'cruz azul', 'mx-pumas': 'pumas', 'mx-tigres': 'tigres', 'mx-monterrey': 'monterrey',
  'es-real-madrid': 'real madrid', 'es-barcelona': 'barcelona', 'es-atletico-de-madrid': 'atletico', 'es-sevilla': 'sevilla', 'es-athletic-club': 'athletic',
  'en-manchester-united': 'manchester united', 'en-manchester-city': 'manchester city', 'en-liverpool': 'liverpool', 'en-chelsea': 'chelsea', 'en-arsenal': 'arsenal',
  'it-juventus': 'juventus', 'it-milan': 'milan', 'it-inter-de-milan': 'inter', 'it-napoles': 'napoli|napoles',
  'de-bayern-munich': 'bayern', 'de-borussia-dortmund': 'dortmund', 'fr-paris-saint-germain': 'paris saint germain',
  'pt-benfica': 'benfica', 'pt-oporto': 'porto|oporto', 'nl-ajax': 'ajax', 'ar-boca-juniors': 'boca juniors', 'ar-river-plate': 'river plate',
  'br-flamengo': 'flamengo', 'uy-penarol': 'penarol', 'us-inter-miami': 'inter miami', 'sa-al-nassr': 'nassr',
};
// El país (P17) de un club inglés es el Reino Unido y el de uno neerlandés, a veces el Reino: se aceptan ambos.
const P17_EXTRA: Record<string, string[]> = { EN: ['Q145'], NL: ['Q29999'] };

// (e) y (f): contra el juego, sin red.
const codigos = COUNTRIES.map((c) => c.code).sort().join();
if (Object.keys(PAISES).sort().join() !== codigos) falla(`los códigos de PAISES no son los 27 de COUNTRIES (${Object.keys(PAISES).length} contra ${COUNTRIES.length})`);
if (Object.keys(CLUBES).length < MIN) falla(`CLUBES tiene ${Object.keys(CLUBES).length}, se piden ${MIN} o más`);
const idsJuego = new Set(ALL_CLUBS.map((c) => c.id));
for (const id of Object.keys(CLUBES)) if (!idsJuego.has(id)) falla(`el club "${id}" no existe en el juego (ALL_CLUBS)`);
for (const id of Object.keys(CLUBES)) if (!ESPERADO[id]) falla(`falta el nombre esperado de "${id}" en este verificador`);

/** Etiquetas y alias (es/en) normalizados de varias entidades; Wikidata admite 50 por llamada. */
async function nombres(qids: string[]): Promise<Record<string, { etiquetas: string[]; todos: string[] }>> {
  const out: Record<string, { etiquetas: string[]; todos: string[] }> = {};
  for (let i = 0; i < qids.length; i += 50) {
    const d = await api({ action: 'wbgetentities', ids: qids.slice(i, i + 50).join('|'), props: 'labels|aliases', languages: 'es|en' });
    for (const [q, e] of Object.entries<any>(d.entities ?? {})) {
      const etiquetas = Object.values<any>(e.labels ?? {}).map((l) => normalizar(l.value));
      const alias = Object.values<any[]>(e.aliases ?? {}).flat().map((a) => normalizar(a.value));
      out[q] = { etiquetas, todos: [...etiquetas, ...alias] };
    }
  }
  return out;
}
async function futbolistas(filtro: string): Promise<number> {
  const d = await api({ action: 'query', list: 'search', srsearch: `haswbstatement:P106=${FUTBOLISTA} ${filtro}`, srlimit: '1', srnamespace: '0', srprop: '', srinfo: 'totalhits' });
  return d.query?.searchinfo?.totalhits ?? 0;
}

console.log('Países…');
const qPaises = [...new Set(Object.values(PAISES).flatMap((p) => [...p.nac, p.sel]))];
const nombresPais = await nombres(qPaises);
for (const c of COUNTRIES) {
  const p = PAISES[c.code];
  if (!p) continue;
  // (a) la etiqueta de la selección (y la nacionalidad) corresponde al país del juego
  for (const q of new Set([p.sel, ...p.nac])) {
    const n = nombresPais[q];
    if (!n) { falla(`${c.code}: ${q} no existe en Wikidata`); continue; }
    if (!n.todos.some((x) => x.includes(normalizar(c.name)))) falla(`${c.code}: ${q} se llama ${JSON.stringify(n.etiquetas)}, no "${c.name}"`);
  }
  // (d) al menos MIN futbolistas con el filtro completo
  const filtro = 'haswbstatement:' + [...p.nac.map((q) => `P27=${q}`), `P1532=${p.sel}`].join('|');
  const n = await futbolistas(filtro);
  console.log(`  ${c.code} ${c.name}: ${n} futbolistas`);
  if (n < MIN) falla(`${c.code}: ${n} futbolistas (mínimo ${MIN})`);
}

console.log('Clubes…');
const nombresClub = await nombres(Object.values(CLUBES));
for (const [id, q] of Object.entries(CLUBES)) {
  const n = nombresClub[q];
  if (!n) { falla(`${id}: ${q} no existe en Wikidata`); continue; }
  const esperados = (ESPERADO[id] ?? '').split('|');
  if (!n.todos.some((x) => esperados.some((e) => x.includes(e)))) falla(`${id}: ${q} se llama ${JSON.stringify(n.etiquetas)}, se esperaba "${ESPERADO[id]}"`);
  // (b) el país (P17) del club es el de su país en el juego
  const club = idsJuego.has(id) ? clubById(id) : undefined;
  if (club) {
    const p = PAISES[club.country];
    const permitidos = new Set([...(p?.nac ?? []), p?.sel, ...(P17_EXTRA[club.country] ?? [])]);
    const d = await api({ action: 'wbgetclaims', entity: q, property: 'P17' });
    const paises: string[] = (d.claims?.P17 ?? []).map((c: any) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
    if (!paises.some((x) => permitidos.has(x))) falla(`${id}: ${q} tiene país ${JSON.stringify(paises)}, se esperaba uno de ${[...permitidos].join(', ')}`);
  }
  // (c) al menos MIN futbolistas con ese club
  const total = await futbolistas(`haswbstatement:P54=${q}`);
  console.log(`  ${id} (${q}): ${total} futbolistas`);
  if (total < MIN) falla(`${id}: ${total} futbolistas con ${q} (mínimo ${MIN})`);
}

if (fallas.length) { console.error(`\n${fallas.length} falla(s).`); process.exit(1); }
console.log(`\nOK: ${COUNTRIES.length} países y ${Object.keys(CLUBES).length} clubes verificados contra Wikidata y contra el juego.`);
