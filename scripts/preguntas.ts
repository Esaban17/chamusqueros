// Banco de preguntas de Retos Fútbol: genera (plantillas SPARQL + curadas), verifica contra la fuente y escribe src/retos/preguntas.json.
//   npx tsx scripts/preguntas.ts              genera, verifica y, SOLO si todo pasa, escribe el banco y la muestra de revisión
//   npx tsx scripts/preguntas.ts --verificar  verifica el banco que ya existe, sin regenerarlo (CA-7)
//   npx tsx scripts/preguntas.ts --autoprueba estropea preguntas buenas y comprueba que el verificador las rechaza
// Las consultas SPARQL son cadenas fijas de este archivo: no llevan texto de ningún usuario. Corre solo a mano, en la máquina del desarrollador.
//
// Fuentes: todas las preguntas citan una entidad de Wikidata con la propiedad que sostiene la respuesta, como fragmento de la URL:
//   https://www.wikidata.org/wiki/Q170645#P1346            la entidad Q170645 tiene en P1346 (ganador) la respuesta
//   https://www.wikidata.org/wiki/Q615#P166=Q166177@2009   ... y esa declaración tiene ese valor y ese año (para premios)
//   https://www.wikidata.org/wiki/Q159848#P131+            ... en P131 o en sus ancestros (hasta 3 niveles)
// El verificador relee esa declaración por la API (no por SPARQL) y exige que la respuesta correcta figure y que ninguna incorrecta figure.
// Si la red no llega a Wikipedia (p. ej. un proxy corporativo), una fuente de Wikipedia FALLA: nunca se salta la verificación.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { ALL_CLUBS } from '../src/engine/clubs';

const UA = 'Chamusqueros/1.0 (https://chamusqueros.vercel.app/privacidad.html; retos-futbol)';
const WD_API = 'https://www.wikidata.org/w/api.php';
const WDQS = 'https://query.wikidata.org/sparql';
const BANCO = new URL('../src/retos/preguntas.json', import.meta.url);
const CURADAS = new URL('./preguntas/curadas.json', import.meta.url);
const MUESTRA = new URL('./preguntas/revision-30.json', import.meta.url);
const INFORME = new URL('./preguntas/informe.json', import.meta.url);
const SEMILLA = 20261014;

type Dif = 1 | 2 | 3;
const TEMAS = ['mundiales', 'champions', 'balon-de-oro', 'records', 'clubes', 'estadios', 'centroamerica'] as const;
type Tema = (typeof TEMAS)[number];
interface Pregunta {
  id: string; tema: Tema; dificultad: Dif; pregunta: string; opciones: string[]; correcta: number;
  fuente: string; verificado: string; origen: 'sparql' | 'curada';
}
/** Pregunta aún sin opciones: `pool` son candidatos a incorrecta, ya filtrados por la plantilla (nunca la correcta). */
interface Borrador { id: string; tema: Tema; dificultad: Dif; pregunta: string; correcta: string; pool: string[]; fuente: string; personas?: boolean }
interface Curada { id: string; tema: Tema; dificultad: Dif; pregunta: string; correcta: string; distractores: [string, string, string]; fuente: string }

const MINIMO_TOTAL = 150;
const MINIMOS_TEMA: Record<Tema, number> = { mundiales: 25, champions: 20, 'balon-de-oro': 15, records: 15, clubes: 25, estadios: 20, centroamerica: 20 };
const MINIMOS_DIF: Record<Dif, number> = { 1: 40, 2: 50, 3: 30 };
const VETADAS = /\b(actual|actualmente|hoy|vigente|ultimo|ultima|ultimos|ultimas|mas reciente)\b/;

// ---------- Utilidades ----------

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Sin tildes ni mayúsculas, solo letras y números separados por un espacio. */
const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
/** `frag` aparece en `texto` como palabras completas ("milan" está en "inter de milan"; "ita" no está en "italia"). */
const contiene = (texto: string, frag: string) => ` ${norm(texto)} `.includes(` ${norm(frag)} `);

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Azar = () => number;
function barajar<T>(a: T[], rng: Azar): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

async function pedir(url: string, init: RequestInit = {}, intentos = 4): Promise<Response> {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { ...init, headers: { 'user-agent': UA, ...init.headers }, signal: AbortSignal.timeout(60000) });
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
      return r;
    } catch (e) {
      if (i >= intentos) throw e;
      await dormir(1500 * i);
    }
  }
}
async function api(params: Record<string, string>): Promise<any> {
  const r = await pedir(`${WD_API}?` + new URLSearchParams({ format: 'json', ...params }));
  return r.json();
}
const sinPrefijo = (v: string) => v.replace('http://www.wikidata.org/entity/', '');
async function sparql(consulta: string): Promise<Record<string, string>[]> {
  const r = await pedir(WDQS, {
    method: 'POST',
    headers: { accept: 'application/sparql-results+json', 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ query: consulta }),
  });
  if (!r.ok) throw new Error(`WDQS ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j: any = await r.json();
  return j.results.bindings.map((b: any) => Object.fromEntries(Object.entries(b).map(([k, v]: [string, any]) => [k, sinPrefijo(v.value)])));
}
const anio = (iso: string) => Number(iso.slice(0, 4));
const informe: string[] = [];
const nota = (s: string) => { informe.push(s); console.log(s); };

// ---------- Nombres para mostrar ----------

// Mapa de clubes de Retos (plan, "Mapa de identificadores"): id del juego -> Q de Wikidata. El nombre para mostrar sale del propio juego.
// ponytail: copia del mapa del plan para que B no dependa de api/_retos.ts (bloque A); si A1 lo cambia, actualizar aquí.
const CLUBES_RETOS: Record<string, string> = {
  municipal: 'Q1024341', comunicaciones: 'Q1024337', xelaju: 'Q868872', antigua: 'Q2853237', 'cr-saprissa': 'Q868582', 'cr-alajuelense': 'Q1322654',
  'cr-herediano': 'Q82429', 'hn-olimpia': 'Q1023208', 'hn-motagua': 'Q1023205', 'sv-alianza': 'Q1969256', 'sv-aguila': 'Q932563', 'pa-tauro': 'Q921299',
  'mx-america': 'Q459090', 'mx-guadalajara': 'Q503321', 'mx-cruz-azul': 'Q845859', 'mx-pumas': 'Q1143000', 'mx-tigres': 'Q849823', 'mx-monterrey': 'Q768253',
  'es-real-madrid': 'Q8682', 'es-barcelona': 'Q7156', 'es-atletico-de-madrid': 'Q8701', 'es-sevilla': 'Q10329', 'es-athletic-club': 'Q8687',
  'en-manchester-united': 'Q18656', 'en-manchester-city': 'Q50602', 'en-liverpool': 'Q1130849', 'en-chelsea': 'Q9616', 'en-arsenal': 'Q9617',
  'it-juventus': 'Q1422', 'it-milan': 'Q1543', 'it-inter-de-milan': 'Q631', 'it-napoles': 'Q2641', 'de-bayern-munich': 'Q15789', 'de-borussia-dortmund': 'Q41420',
  'fr-paris-saint-germain': 'Q483020', 'pt-benfica': 'Q131499', 'pt-oporto': 'Q128446', 'nl-ajax': 'Q81888', 'ar-boca-juniors': 'Q170703', 'ar-river-plate': 'Q15799',
  'br-flamengo': 'Q17479', 'uy-penarol': 'Q16320', 'us-inter-miami': 'Q16844931', 'sa-al-nassr': 'Q482764',
};
const ES_CENTROAMERICA = (id: string) => /^(municipal|comunicaciones|xelaju|antigua|cr-|hn-|sv-|pa-)/.test(id);
// Nombre del club en la pregunta cuando el del juego es ambiguo (Barcelona SC, Alianza Lima, Olimpia de Paraguay…).
const NOMBRE_PREGUNTA: Record<string, string> = {
  'es-barcelona': 'FC Barcelona', 'it-milan': 'AC Milan', 'mx-pumas': 'Pumas UNAM', 'mx-tigres': 'Tigres UANL', 'mx-guadalajara': 'Chivas de Guadalajara', 'mx-america': 'América de México',
  'hn-olimpia': 'Olimpia de Tegucigalpa', 'sv-alianza': 'Alianza de San Salvador', 'sv-aguila': 'Águila de San Miguel', municipal: 'Municipal de Guatemala', comunicaciones: 'Comunicaciones de Guatemala',
};
// Nombres que se repiten en otros países: no se les pregunta el país (la pregunta lo delataría o sería ambigua).
const AMBIGUOS = new Set(['hn-olimpia', 'sv-alianza', 'sv-aguila', 'pa-tauro', 'municipal', 'comunicaciones', 'antigua']);
// Año de fundación con duda razonable: Wikidata da 1894 para el Manchester City (el cambio de nombre; el club cuenta desde 1880). Sin otra fuente a mano, no entra.
const FUNDACION_DUDOSA = new Set(['en-manchester-city', 'cr-herediano']);
const PAISES_FUTBOL = ['Argentina', 'España', 'Italia', 'Alemania', 'Francia', 'Portugal', 'Países Bajos', 'Brasil', 'México', 'Estados Unidos', 'Uruguay', 'Colombia', 'Arabia Saudí', 'Chile'];
const PAISES_CA = ['Guatemala', 'Honduras', 'El Salvador', 'Costa Rica', 'Panamá', 'Nicaragua', 'Belice', 'México', 'Colombia'];
const CLUB_FAMOSO = new Set(['es-real-madrid', 'es-barcelona', 'en-manchester-united', 'en-liverpool', 'it-juventus', 'it-milan', 'de-bayern-munich', 'ar-boca-juniors', 'ar-river-plate', 'nl-ajax']);
const CLUB_Q: Record<string, string> = {};
const NOMBRE_CLUB: Record<string, string> = {};
for (const [id, q] of Object.entries(CLUBES_RETOS)) {
  const c = ALL_CLUBS.find((x) => x.id === id);
  if (!c) throw new Error(`El club ${id} del mapa de Retos no existe en el juego`);
  CLUB_Q[q] = id;
  NOMBRE_CLUB[q] = c.name;
}
// Nombres cortos de los clubes que salen en los premios y copas y no están en la lista de Retos (se ven en las opciones, junto a los de la lista).
const NOMBRE_EXTRA: Record<string, string> = {
  Q8682: 'Real Madrid', Q131499: 'Benfica', Q1543: 'Milan', Q631: 'Inter de Milán', Q19593: 'Celtic', Q18656: 'Manchester United', Q134241: 'Feyenoord', Q81888: 'Ajax',
  Q15789: 'Bayern Múnich', Q1130849: 'Liverpool', Q19490: 'Nottingham Forest', Q18711: 'Aston Villa', Q51974: 'Hamburgo', Q1422: 'Juventus', Q179658: 'Steaua de Bucarest',
  Q128446: 'Oporto', Q11938: 'PSV Eindhoven', Q173009: 'Estrella Roja', Q7156: 'Barcelona', Q132885: 'Olympique de Marsella', Q41420: 'Borussia Dortmund', Q9616: 'Chelsea',
  Q50602: 'Manchester City', Q483020: 'París Saint-Germain', Q1024341: 'Municipal', Q1024337: 'Comunicaciones', Q1023208: 'Olimpia', Q2539734: 'FAS', Q932563: 'Águila',
  Q1024460: 'Cartaginés', Q868582: 'Saprissa', Q1322654: 'Alajuelense', Q845859: 'Cruz Azul', Q459090: 'América', Q503321: 'Guadalajara', Q1143000: 'Pumas',
  Q736937: 'Pachuca', Q1280895: 'Necaxa', Q204357: 'LA Galaxy', Q238593: 'D.C. United', Q638657: 'Racing Club Haïtien', Q670186: 'Toluca', Q1851944: 'Transvaal',
  Q4816974: 'Atlético Español', Q2301350: 'Violette', Q849949: 'Atlante', Q646596: 'Puebla', Q113009: 'Defence Force', Q768253: 'Monterrey',
};
const nombreClub = (q: string, etiqueta: string) => NOMBRE_CLUB[q] ?? NOMBRE_EXTRA[q] ?? etiqueta;
const nombrePais = (etiqueta: string) => etiqueta.replace(/^selecci[oó]n de f[uú]tbol (de|del)\s+(los |las |la |el )?/i, '').replace(/^./, (c) => c.toUpperCase());

// ---------- Plantillas SPARQL (cadenas fijas) ----------

const ETIQUETAS = 'SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }';
const agrupar = <T extends Record<string, string>>(filas: T[], clave: keyof T) => {
  const m = new Map<string, T[]>();
  for (const f of filas) m.set(f[clave], [...(m.get(f[clave]) ?? []), f]);
  return m;
};
const dificultadPorAnio = (y: number, facil: number, media: number): Dif => (y >= facil ? 1 : y >= media ? 2 : 3);
const wd = (q: string, frag: string) => `https://www.wikidata.org/wiki/${q}#${frag}`;

/** Elige hasta cuota[d] borradores por dificultad, al azar con semilla. */
function elegir(cands: Borrador[], cuota: Record<Dif, number>, rng: Azar): Borrador[] {
  return ([1, 2, 3] as Dif[]).flatMap((d) => barajar(cands.filter((c) => c.dificultad === d), rng).slice(0, cuota[d]));
}

/** Mundiales (Q19317): campeón y sede de cada edición; cifras de ediciones cerradas. */
async function plantillaMundiales() {
  const filas = await sparql(`SELECT ?e ?eLabel ?w ?wLabel ?h ?hLabel ?t ?n ?g ?m WHERE {
    ?e wdt:P3450 wd:Q19317 ; wdt:P1346 ?w ; wdt:P580 ?t .
    OPTIONAL { ?e wdt:P17 ?h } OPTIONAL { ?e wdt:P1132 ?n } OPTIONAL { ?e wdt:P1351 ?g } OPTIONAL { ?e wdt:P1350 ?m }
    ${ETIQUETAS} }`);
  const cuentas = await sparql(`SELECT ?e (COUNT(DISTINCT ?p) AS ?c) WHERE { ?e wdt:P3450 wd:Q19317 ; wdt:P1346 ?w . OPTIONAL { ?e wdt:P1923 ?p } } GROUP BY ?e`);
  const participantes = new Map(cuentas.map((f) => [f.e, Number(f.c)]));
  const ediciones = [...agrupar(filas, 'e').entries()].map(([e, fs]) => ({ e, y: anio(fs[0].t), fs }));
  // Calibración: 22 Mundiales hasta 2022 y el de 2026 = 23 ediciones (1930 a 2026 cada 4 años, sin 1942 ni 1946); cada una con un solo campeón.
  const esperados = Array.from({ length: 25 }, (_, i) => 1930 + 4 * i).filter((y) => y !== 1942 && y !== 1946);
  const anios = ediciones.map((x) => x.y).sort((a, b) => a - b);
  if (JSON.stringify(anios) !== JSON.stringify(esperados)) throw new Error(`Mundiales: se esperaban ${esperados.join(',')} y llegaron ${anios.join(',')}`);
  for (const x of ediciones) {
    if (new Set(x.fs.map((f) => f.w)).size !== 1) throw new Error(`Mundial ${x.y}: más de un campeón`);
    if (!x.fs[0].eLabel.endsWith(String(x.y))) throw new Error(`Mundial ${x.y}: la etiqueta "${x.fs[0].eLabel}" no coincide con la fecha`);
  }
  nota(`Mundiales: ${filas.length} filas, ${ediciones.length} ediciones (1930 a 2026), una por campeón: calibrada.`);

  const campeonDe = (x: (typeof ediciones)[number]) => nombrePais(x.fs[0].wLabel);
  const poolCampeones = [...new Set(ediciones.map(campeonDe))];
  const campeon: Borrador[] = ediciones.map((x) => ({
    id: `mun-${x.y}-campeon`, tema: 'mundiales', dificultad: dificultadPorAnio(x.y, 1998, 1970),
    pregunta: `¿Qué selección ganó el Mundial de ${x.y}?`, correcta: campeonDe(x),
    pool: poolCampeones.filter((p) => p !== campeonDe(x)), fuente: wd(x.e, 'P1346'),
  }));

  // Sede: solo ediciones con una sede. 2002 y 2026 son conjuntas (dos respuestas) y 1966 figura como "Reino Unido" (no "Inglaterra"): se excluyen.
  const unaSede = ediciones.filter((x) => new Set(x.fs.map((f) => f.h)).size === 1 && x.fs[0].h && x.fs[0].e !== 'Q134202');
  const sedesDe = (x: (typeof ediciones)[number]) => new Set(x.fs.map((f) => f.hLabel));
  const poolSedes = [...new Set(unaSede.flatMap((x) => [...sedesDe(x)]))];
  const sede: Borrador[] = unaSede.map((x) => ({
    id: `mun-${x.y}-sede`, tema: 'mundiales', dificultad: dificultadPorAnio(x.y, 1990, 1966),
    pregunta: `¿Qué país fue sede del Mundial de ${x.y}?`, correcta: x.fs[0].hLabel,
    pool: poolSedes.filter((p) => !sedesDe(x).has(p)), fuente: wd(x.e, 'P17'),
  }));
  nota(`Mundiales, sede: ${sede.length} de ${ediciones.length} ediciones (fuera las conjuntas 2002 y 2026 y 1966).`);

  // Cifras: solo si la edición está cerrada y los datos son coherentes (participantes = selecciones listadas); 2002 (33 contra 32) y 2022 (32 contra 4) se descartan.
  const cifras: Borrador[] = [];
  const REAL_PART = [13, 15, 16, 24, 32];
  const REAL_PART_PART = [18, 22, 26, 32, 35, 38, 52, 64];
  for (const x of ediciones.filter((z) => z.y <= 2022)) {
    const f = x.fs[0];
    if (f.n && Number(f.n) === participantes.get(x.e))
      cifras.push({ id: `rec-${x.y}-selecciones`, tema: 'records', dificultad: x.y >= 1998 ? 2 : 3, pregunta: `¿Cuántas selecciones participaron en el Mundial de ${x.y}?`, correcta: f.n, pool: REAL_PART.map(String).filter((p) => p !== f.n), fuente: wd(x.e, 'P1132') });
    else nota(`  descartada la cifra de selecciones de ${x.y}: Wikidata dice ${f.n} y lista ${participantes.get(x.e)}`);
    if (f.m) cifras.push({ id: `rec-${x.y}-partidos`, tema: 'records', dificultad: x.y >= 1998 ? 2 : 3, pregunta: `¿Cuántos partidos se jugaron en el Mundial de ${x.y}?`, correcta: f.m, pool: REAL_PART_PART.map(String).filter((p) => p !== f.m), fuente: wd(x.e, 'P1350') });
    if (f.g) cifras.push({ id: `rec-${x.y}-goles`, tema: 'records', dificultad: 3, pregunta: `¿Cuántos goles se marcaron en total en el Mundial de ${x.y}?`, correcta: f.g, pool: cercanos(Number(f.g)), fuente: wd(x.e, 'P1351') });
  }
  return { campeon, sede, cifras };
}
/** Números plausibles cerca de `n` (para totales de goles). */
function cercanos(n: number): string[] {
  const paso = Math.max(1, Math.round(n * 0.05));
  return [-3, -2, -1, 1, 2, 3, 4].map((k) => n + k * paso).filter((v) => v > 0 && v !== n).map(String);
}

/** Champions (Q18756): campeón por temporada. La temporada sale de la fecha de inicio, no de la etiqueta (hay una edición con la etiqueta de otra). */
async function plantillaChampions() {
  const filas = await sparql(`SELECT ?e ?eLabel ?w ?wLabel ?t WHERE { ?e wdt:P3450 wd:Q18756 ; wdt:P1346 ?w ; wdt:P580 ?t . ${ETIQUETAS} }`);
  const porEdicion = [...agrupar(filas, 'e').entries()];
  const ok: { e: string; y: number; temporada: string; club: string; q: string }[] = [];
  const descartadas: string[] = [];
  for (const [e, fs] of porEdicion) {
    const y = anio(fs[0].t);
    const temporada = `${y}-${String(y + 1).slice(2)}`;
    const m = /(\d{4})\D+(\d{2,4})$/.exec(fs[0].eLabel);
    if (new Set(fs.map((f) => f.w)).size !== 1 || !m || Number(m[1]) !== y) { descartadas.push(`${e} "${fs[0].eLabel}" (inicio ${fs[0].t.slice(0, 10)})`); continue; }
    ok.push({ e, y, temporada, q: fs[0].w, club: nombreClub(fs[0].w, fs[0].wLabel) });
  }
  // Calibración: de 1955-56 a 2025-26 hay 71 ediciones; se tolera perder hasta 2 por etiqueta o campeón dudosos.
  if (ok.length < 69 || ok.length > 71 || new Set(ok.map((x) => x.y)).size !== ok.length) throw new Error(`Champions: ${ok.length} ediciones válidas (se esperaban 69 a 71)`);
  nota(`Champions: ${filas.length} filas, ${ok.length} temporadas válidas; descartadas por etiqueta o campeón dudosos: ${descartadas.join('; ') || 'ninguna'}.`);
  const pool = [...new Set(ok.map((x) => x.club))];
  return ok.map<Borrador>((x) => ({
    id: `cha-${x.temporada}`, tema: 'champions', dificultad: dificultadPorAnio(x.y, 2005, 1985),
    pregunta: `¿Qué club fue campeón de Europa (Champions League) en la temporada ${x.temporada}?`, correcta: x.club,
    pool: pool.filter((p) => p !== x.club), fuente: wd(x.e, 'P1346'),
  }));
}

/** Premios de futbolistas con año: Balón de Oro (Q166177 y Q2291862, el "FIFA Balón de Oro" de 2010 a 2015) y Balón de Oro del Mundial (Q17355204). Solo hombres. */
async function premiosConAnio(premios: string[]) {
  const filas = await sparql(`SELECT ?p ?pLabel ?a ?y WHERE {
    VALUES ?a { ${premios.map((p) => 'wd:' + p).join(' ')} }
    ?p wdt:P21 wd:Q6581097 ; p:P166 ?s . ?s ps:P166 ?a ; pq:P585 ?y .
    ${ETIQUETAS} }`);
  const porAnio = new Map<number, Map<string, { q: string; nombre: string; premio: string }>>();
  for (const f of filas) {
    const y = anio(f.y);
    const m = porAnio.get(y) ?? new Map();
    m.set(f.p, { q: f.p, nombre: f.pLabel, premio: f.a });
    porAnio.set(y, m);
  }
  const unicos = [...porAnio.entries()].filter(([, m]) => m.size === 1).map(([y, m]) => ({ y, ...[...m.values()][0] }));
  const multiples = [...porAnio.entries()].filter(([, m]) => m.size > 1).map(([y]) => y);
  return { filas: filas.length, unicos: unicos.sort((a, b) => a.y - b.y), multiples };
}
const NOMBRE_PERSONA: Record<string, string> = { Q529207: 'Ronaldo Nazário' };  // "Ronaldo" a secas se confunde con Cristiano Ronaldo

async function plantillaBalon() {
  const r = await premiosConAnio(['Q166177', 'Q2291862']);
  if (r.unicos.length < 35) throw new Error(`Balón de Oro: solo ${r.unicos.length} años con un ganador`);
  nota(`Balón de Oro: ${r.filas} filas con año, ${r.unicos.length} años con un solo ganador masculino; descartados por más de un ganador: ${r.multiples.join(', ') || 'ninguno'}; los años sin dato (Wikidata no lo tiene) no se rellenan.`);
  const nombre = (x: { q: string; nombre: string }) => NOMBRE_PERSONA[x.q] ?? x.nombre;
  const pool = [...new Set(r.unicos.map(nombre))];
  return r.unicos.map<Borrador>((x) => ({
    id: `bdo-${x.y}`, tema: 'balon-de-oro', dificultad: dificultadPorAnio(x.y, 2000, 1980), personas: true,
    pregunta: `¿Qué futbolista ganó el Balón de Oro masculino de ${x.y}?`, correcta: nombre(x),
    pool: pool.filter((p) => p !== nombre(x)), fuente: wd(x.q, `P166=${x.premio}@${x.y}`),
  }));
}

async function plantillaBalonMundial() {
  const r = await premiosConAnio(['Q17355204']);
  const pool = [...new Set([...r.unicos.map((x) => NOMBRE_PERSONA[x.q] ?? x.nombre), 'Cristiano Ronaldo', 'Neymar', 'Zlatan Ibrahimović', 'Thierry Henry', 'Luis Suárez', 'Andrés Iniesta', 'Franz Beckenbauer', 'Johan Cruyff'])];
  nota(`Balón de Oro del Mundial: ${r.filas} filas con año, ${r.unicos.length} Mundiales con un solo ganador masculino (${r.unicos.map((x) => x.y).join(', ')}).`);
  // Desde 1982, cuando el premio es oficial (antes solo hay elecciones retroactivas).
  return r.unicos.filter((x) => x.y >= 1982).map<Borrador>((x) => {
    const n = NOMBRE_PERSONA[x.q] ?? x.nombre;
    return {
      id: `rec-${x.y}-balon`, tema: 'records', dificultad: x.y >= 2006 ? 2 : 3, personas: true,
      pregunta: `¿Qué futbolista fue elegido el mejor del Mundial de ${x.y} y ganó el Balón de Oro del torneo?`, correcta: n,
      pool: pool.filter((p) => p !== n), fuente: wd(x.q, `P166=${x.premio}@${x.y}`),
    };
  });
}

/** Clubes de la lista de Retos: año de fundación (un solo año en Wikidata) y país. */
async function plantillaClubes() {
  const filas = await sparql(`SELECT ?c ?cLabel ?i ?pr ?ctry ?ctryLabel WHERE {
    VALUES ?c { ${Object.values(CLUBES_RETOS).map((q) => 'wd:' + q).join(' ')} }
    OPTIONAL { ?c p:P571 ?s . ?s psv:P571 ?v . ?v wikibase:timeValue ?i ; wikibase:timePrecision ?pr . }
    OPTIONAL { ?c wdt:P17 ?ctry }
    ${ETIQUETAS} }`);
  const porClub = [...agrupar(filas, 'c').entries()];
  if (porClub.length !== Object.keys(CLUBES_RETOS).length) throw new Error(`Clubes: ${porClub.length} de ${Object.keys(CLUBES_RETOS).length}`);
  const fundacion: Borrador[] = [];
  const pais: Borrador[] = [];
  const descartes: string[] = [];
  for (const [q, fs] of porClub) {
    const id = CLUB_Q[q];
    const nombre = `el club ${NOMBRE_PREGUNTA[id] ?? NOMBRE_CLUB[q]}`;
    const ca = ES_CENTROAMERICA(id);
    // Solo fechas con precisión de día (11): las de precisión de año suelen ser un "1 de enero" de relleno o la fecha legal, no la histórica (Sevilla 1905 contra 1890).
    const anios = new Set(fs.filter((f) => f.i && Number(f.pr) >= 11).map((f) => anio(f.i)));
    if (anios.size === 1 && !FUNDACION_DUDOSA.has(id)) {
      const y = [...anios][0];
      fundacion.push({
        id: `${ca ? 'ca' : 'clu'}-${id}-fundacion`, tema: ca ? 'centroamerica' : 'clubes', dificultad: !ca && CLUB_FAMOSO.has(id) ? 2 : 3,
        pregunta: `¿En qué año se fundó ${nombre}?`, correcta: String(y), pool: [-12, -9, -6, -4, -3, -2, 2, 3, 4, 6, 9].map((k) => String(y + k)), fuente: wd(q, 'P571'),
      });
    } else descartes.push(`${NOMBRE_CLUB[q]} (${FUNDACION_DUDOSA.has(id) ? 'dudoso' : anios.size ? [...anios].join('/') : 'fecha sin día'})`);
    const p = fs[0].ctryLabel;
    // El Reino Unido no sirve para los clubes ingleses (la respuesta natural es Inglaterra); los nombres ambiguos darían el país en la pregunta.
    if (p && p !== 'Reino Unido' && !AMBIGUOS.has(id)) {
      pais.push({
        id: `${ca ? 'ca' : 'clu'}-${id}-pais`, tema: ca ? 'centroamerica' : 'clubes', dificultad: ca ? 2 : 1,
        pregunta: `¿En qué país juega ${nombre}?`, correcta: p, pool: (ca ? PAISES_CA : PAISES_FUTBOL).filter((x) => x !== p), fuente: wd(q, 'P17'),
      });
    }
  }
  nota(`Clubes: ${porClub.length} clubes; fundación para ${fundacion.length}; descartados (fecha sin día, dos años o dudoso): ${descartes.join(', ')}; país para ${pais.length} (sin los ingleses, que Wikidata da como Reino Unido, ni los de nombre ambiguo).`);
  return { fundacion, pais };
}

/** Copa de Campeones de la Concacaf (Q83335): campeones centroamericanos por edición. */
async function plantillaCopaCampeones() {
  const filas = await sparql(`SELECT ?e ?eLabel ?w ?wLabel ?ctry WHERE { ?e wdt:P3450 wd:Q83335 ; wdt:P1346 ?w . OPTIONAL { ?w wdt:P17 ?ctry } ${ETIQUETAS} }`);
  const CA = new Set(['Q774', 'Q783', 'Q792', 'Q800', 'Q804', 'Q811', 'Q242']);
  const ediciones = [...agrupar(filas, 'e').entries()]
    .map(([e, fs]) => ({ e, label: fs[0].eLabel, y: /\s(\d{4})$/.exec(fs[0].eLabel)?.[1], ganadores: new Set(fs.map((f) => f.w)), fs }))
    .filter((x) => x.y && x.ganadores.size === 1);
  const centro = ediciones.filter((x) => CA.has(x.fs[0].ctry));
  if (centro.length < 10) throw new Error(`Copa de Campeones: solo ${centro.length} ediciones con campeón centroamericano`);
  nota(`Copa de Campeones de la Concacaf: ${filas.length} filas, ${ediciones.length} ediciones con año en la etiqueta y un solo campeón, ${centro.length} con campeón centroamericano.`);
  const pool = [...new Set(ediciones.map((x) => nombreClub(x.fs[0].w, x.fs[0].wLabel)))];
  return centro.map<Borrador>((x) => {
    const n = nombreClub(x.fs[0].w, x.fs[0].wLabel);
    return {
      id: `ca-ccc-${x.y}`, tema: 'centroamerica', dificultad: Number(x.y) >= 1990 ? 2 : 3,
      pregunta: `¿Qué club ganó la Copa de Campeones de la Concacaf de ${x.y}?`, correcta: n, pool: pool.filter((p) => p !== n), fuente: wd(x.e, 'P1346'),
    };
  });
}

/** Campeonato Concacaf de selecciones (Q189327): campeones centroamericanos (ediciones con un solo campeón; 1971 figura con tres y se descarta). */
async function plantillaCampeonatoConcacaf() {
  const filas = await sparql(`SELECT ?e ?eLabel ?w ?wLabel ?ctry WHERE { ?e wdt:P3450 wd:Q189327 ; wdt:P1346 ?w . OPTIONAL { ?w wdt:P17 ?ctry } ${ETIQUETAS} }`);
  const CA = new Set(['Q774', 'Q783', 'Q792', 'Q800', 'Q804', 'Q811', 'Q242']);
  const ediciones = [...agrupar(filas, 'e').entries()]
    .map(([e, fs]) => ({ e, y: /\s(\d{4})$/.exec(fs[0].eLabel)?.[1], ganadores: new Set(fs.map((f) => f.w)), fs }))
    .filter((x) => x.y && x.ganadores.size === 1);
  const pool = [...new Set(ediciones.map((x) => nombrePais(x.fs[0].wLabel)))];
  const centro = ediciones.filter((x) => CA.has(x.fs[0].ctry));
  nota(`Campeonato Concacaf y Copa Oro: ${filas.length} filas, ${ediciones.length} ediciones con un solo campeón, ${centro.length} con campeón centroamericano (Wikidata no tiene campeón en 2021, 2023 ni 2025: sin esas).`);
  return centro.map<Borrador>((x) => {
    const n = nombrePais(x.fs[0].wLabel);
    const pre = Number(x.y) >= 1991 ? 'la Copa Oro de la Concacaf' : 'el Campeonato Concacaf';
    return {
      id: `ca-concacaf-${x.y}`, tema: 'centroamerica', dificultad: 3,
      pregunta: `¿Qué selección ganó ${pre} de ${x.y}?`, correcta: n, pool: pool.filter((p) => p !== n), fuente: wd(x.e, 'P1346'),
    };
  });
}

// ---------- Armado ----------

function armar(b: Borrador, rng: Azar): Pregunta {
  const vistos = new Set([norm(b.correcta)]);
  const elegidos: string[] = [];
  const tokens = (s: string) => norm(s).split(' ').filter((t) => t.length >= 4);
  for (const c of barajar([...new Set(b.pool)], rng)) {
    if (elegidos.length === 3) break;
    if (vistos.has(norm(c))) continue;
    // Opciones de personas que comparten un apellido o nombre ("Ronaldo" y "Cristiano Ronaldo") se confunden: no van juntas.
    if (b.personas && [b.correcta, ...elegidos].some((o) => tokens(o).some((t) => tokens(c).includes(t)))) continue;
    vistos.add(norm(c));
    elegidos.push(c);
  }
  if (elegidos.length < 3) throw new Error(`${b.id}: faltan opciones incorrectas (${elegidos.length} de 3)`);
  const opciones = barajar([b.correcta, ...elegidos], rng);
  return { id: b.id, tema: b.tema, dificultad: b.dificultad, pregunta: b.pregunta, opciones, correcta: opciones.indexOf(b.correcta), fuente: b.fuente, verificado: new Date().toISOString().slice(0, 10), origen: 'sparql' };
}
function armarCurada(c: Curada, rng: Azar): Pregunta {
  const opciones = barajar([c.correcta, ...c.distractores], rng);
  return { id: c.id, tema: c.tema, dificultad: c.dificultad, pregunta: c.pregunta, opciones, correcta: opciones.indexOf(c.correcta), fuente: c.fuente, verificado: new Date().toISOString().slice(0, 10), origen: 'curada' };
}

// ---------- Verificador (CA-7) ----------

const labelsCache = new Map<string, string[]>();
/** Etiquetas y alias (es, en y "mul") de las entidades. */
async function etiquetas(ids: string[]): Promise<(id: string) => string[]> {
  const faltan = [...new Set(ids)].filter((i) => !labelsCache.has(i));
  for (let i = 0; i < faltan.length; i += 50) {
    const lote = faltan.slice(i, i + 50);
    const j = await api({ action: 'wbgetentities', ids: lote.join('|'), props: 'labels|aliases', languages: 'es|en|mul' });
    for (const id of lote) {
      const e = j.entities?.[id];
      const n: string[] = [];
      for (const l of Object.values<any>(e?.labels ?? {})) n.push(l.value);
      for (const arr of Object.values<any[]>(e?.aliases ?? {})) for (const a of arr) n.push(a.value);
      labelsCache.set(id, n);
    }
  }
  return (id) => labelsCache.get(id) ?? [];
}
interface Hecho { entidad?: string; texto?: string; anios: number[] }
const claimsCache = new Map<string, Hecho[]>();
async function hechos(qid: string, prop: string): Promise<Hecho[]> {
  const k = `${qid}|${prop}`;
  if (claimsCache.has(k)) return claimsCache.get(k)!;
  const j = await api({ action: 'wbgetclaims', entity: qid, property: prop });
  const r = ((j.claims?.[prop] ?? []) as any[]).map<Hecho>((c) => {
    const dv = c.mainsnak?.datavalue;
    const anios = ['P585', 'P580', 'P582'].flatMap((p) => ((c.qualifiers?.[p] ?? []) as any[]).map((s) => anio(s.datavalue?.value?.time?.slice(1) ?? '')));
    if (dv?.type === 'wikibase-entityid') return { entidad: dv.value.id, anios };
    if (dv?.type === 'time') return { texto: String(anio(dv.value.time.slice(1))), anios };
    if (dv?.type === 'quantity') return { texto: String(Number(dv.value.amount)), anios };
    return { texto: typeof dv?.value === 'string' ? dv.value : '', anios };
  });
  claimsCache.set(k, r);
  return r;
}

async function verificarWikidata(p: Pregunta, url: URL, err: (m: string) => void) {
  const qid = /^\/wiki\/(Q[1-9]\d{0,9})$/.exec(url.pathname)?.[1];
  const frag = /^(P\d+)(\+)?(?:=(Q\d+))?(?:@(\d{4}))?$/.exec(url.hash.slice(1));
  if (!qid || !frag) return err(`${p.id}: la fuente de Wikidata debe ser /wiki/Q…#P… (con =Q… y @año si es un premio): ${p.fuente}`);
  const [, prop, transitiva, valorQ, anioQ] = frag;
  const h = await pedir(`https://www.wikidata.org/wiki/${qid}`, { method: 'HEAD' });
  if (!h.ok) return err(`${p.id}: la fuente no responde 200 (${h.status}): ${p.fuente}`);

  let declaraciones = await hechos(qid, prop);
  if (transitiva) {
    // P131+: la entidad y sus ancestros por P131, hasta 3 niveles.
    let frontera = declaraciones.flatMap((d) => (d.entidad ? [d.entidad] : []));
    for (let nivel = 0; nivel < 3 && frontera.length; nivel++) {
      const siguiente: string[] = [];
      for (const q of frontera) for (const d of await hechos(q, prop)) if (d.entidad && !declaraciones.some((x) => x.entidad === d.entidad)) { declaraciones.push(d); siguiente.push(d.entidad); }
      frontera = siguiente;
    }
  }
  if (valorQ) declaraciones = declaraciones.filter((d) => d.entidad === valorQ);
  if (anioQ) declaraciones = declaraciones.filter((d) => d.anios.includes(Number(anioQ)));
  if (!declaraciones.length) return err(`${p.id}: ${qid} no tiene la declaración ${prop}${valorQ ? '=' + valorQ : ''}${anioQ ? '@' + anioQ : ''}`);

  const nombres = await etiquetas([qid, ...declaraciones.flatMap((d) => (d.entidad ? [d.entidad] : []))]);
  const valores = declaraciones.flatMap((d) => (d.entidad ? nombres(d.entidad) : d.texto ? [d.texto] : []));
  const propios = nombres(qid);
  const correcta = p.opciones[p.correcta];
  // La respuesta es el valor de la propiedad, o (en un premio) la propia persona que tiene la declaración con ese valor y año.
  const enValores = valores.some((v) => contiene(v, correcta));
  const enPropios = !!valorQ && propios.some((v) => contiene(v, correcta));
  if (!enValores && !enPropios) return err(`${p.id}: la respuesta "${correcta}" no figura en ${prop} de ${qid} (valores: ${valores.slice(0, 6).join(', ')})`);
  for (const [i, o] of p.opciones.entries())
    if (i !== p.correcta && (valores.some((v) => norm(v) === norm(o)) || (!!valorQ && propios.some((v) => norm(v) === norm(o)))))
      err(`${p.id}: la incorrecta "${o}" también figura en la fuente`);
}

async function verificarWikipedia(p: Pregunta, url: URL, err: (m: string) => void) {
  const lang = url.hostname.split('.')[0];
  const titulo = decodeURIComponent(url.pathname.replace(/^\/wiki\//, '')).replace(/_/g, ' ');
  const r = await pedir(`https://${url.hostname}/w/api.php?` + new URLSearchParams({ action: 'query', prop: 'extracts', explaintext: '1', titles: titulo, redirects: '1', format: 'json' }));
  let texto = '';
  try {
    const j: any = await r.json();
    const pag: any = Object.values(j.query.pages)[0];
    if (pag.missing !== undefined) return err(`${p.id}: la página de Wikipedia (${lang}) no existe: ${p.fuente}`);
    texto = pag.extract ?? '';
  } catch {
    return err(`${p.id}: no se pudo leer Wikipedia desde esta red (respuesta que no es de la API); la fuente no se puede verificar: ${p.fuente}`);
  }
  if (!contiene(texto, p.opciones[p.correcta])) err(`${p.id}: la respuesta "${p.opciones[p.correcta]}" no aparece en ${p.fuente}`);
}

const HOSTS_FUENTE = new Set(['es.wikipedia.org', 'en.wikipedia.org', 'www.wikidata.org']);
/** Esquema de una pregunta: campos y tipos, 4 opciones distintas, `correcta` de 0 a 3, fuente https de Wikipedia o Wikidata, sin palabras vetadas. */
function verificarEsquema(p: Pregunta): string[] {
  const errores: string[] = [];
  const ok = (c: boolean, m: string) => { if (!c) errores.push(`${p.id}: ${m}`); };
  ok(typeof p.id === 'string' && p.id.length > 0, 'id vacío');
  ok((TEMAS as readonly string[]).includes(p.tema), `tema desconocido ${p.tema}`);
  ok([1, 2, 3].includes(p.dificultad), 'dificultad fuera de 1 a 3');
  ok(typeof p.pregunta === 'string' && p.pregunta.length > 8, 'pregunta vacía');
  ok(Array.isArray(p.opciones) && p.opciones.length === 4 && p.opciones.every((o) => typeof o === 'string' && o.trim() !== ''), 'tiene que tener 4 opciones de texto');
  ok(new Set((p.opciones ?? []).map(norm)).size === 4, 'las 4 opciones tienen que ser distintas');
  ok(Number.isInteger(p.correcta) && p.correcta >= 0 && p.correcta <= 3, 'correcta fuera de 0 a 3');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(p.verificado), 'verificado sin fecha');
  ok(p.origen === 'sparql' || p.origen === 'curada', 'origen desconocido');
  ok(!VETADAS.test(norm(p.pregunta ?? '')), 'usa una palabra vetada (actual, hoy, último…): el dato tiene que ser de una edición cerrada');
  let url: URL | null = null;
  try { url = new URL(p.fuente); } catch { errores.push(`${p.id}: fuente sin URL válida`); }
  if (url) ok(url.protocol === 'https:' && HOSTS_FUENTE.has(url.hostname), `la fuente tiene que ser https de ${[...HOSTS_FUENTE].join(', ')}`);
  return errores;
}

/** Comprueba contra la red que la fuente de una pregunta existe y sostiene la respuesta. Una fuente que no se puede leer es un error, nunca un pase. */
async function verificarFuente(p: Pregunta, err: (m: string) => void) {
  let url: URL;
  try { url = new URL(p.fuente); } catch { return; }
  if (url.protocol !== 'https:' || !HOSTS_FUENTE.has(url.hostname)) return;  // ya lo informa el esquema; nunca se llama a otro host
  try {
    if (url.hostname === 'www.wikidata.org') await verificarWikidata(p, url, err);
    else await verificarWikipedia(p, url, err);
  } catch (e) {
    err(`${p.id}: no se pudo verificar (${(e as Error).message})`);
  }
}

/** Verifica el banco: esquema, mínimos, duplicados, palabras vetadas y, contra la red, cada fuente. Devuelve los errores. */
async function verificar(banco: Pregunta[], conRed = true): Promise<string[]> {
  const errores: string[] = [];
  const err = (m: string) => errores.push(m);
  const ids = new Set<string>();
  const textos = new Set<string>();
  for (const p of banco) {
    errores.push(...verificarEsquema(p));
    if (ids.has(p.id)) err(`${p.id}: id repetido`);
    ids.add(p.id);
    if (textos.has(norm(p.pregunta))) err(`${p.id}: pregunta repetida`);
    textos.add(norm(p.pregunta));
  }
  for (const t of TEMAS) {
    const n = banco.filter((p) => p.tema === t).length;
    if (n < MINIMOS_TEMA[t]) err(`tema ${t}: ${n} preguntas, el mínimo es ${MINIMOS_TEMA[t]}`);
  }
  for (const d of [1, 2, 3] as Dif[]) {
    const n = banco.filter((p) => p.dificultad === d).length;
    if (n < MINIMOS_DIF[d]) err(`dificultad ${d}: ${n} preguntas, el mínimo es ${MINIMOS_DIF[d]}`);
  }
  if (banco.length < MINIMO_TOTAL) err(`el banco tiene ${banco.length} preguntas, el mínimo es ${MINIMO_TOTAL}`);
  if (!conRed) return errores;
  let i = 0;
  for (const p of banco) {
    if (++i % 25 === 0) console.log(`  verificadas ${i} de ${banco.length}…`);
    await verificarFuente(p, err);
  }
  return errores;
}

// ---------- Autoprueba del verificador ----------

/** Estropea preguntas buenas de formas distintas y comprueba que el verificador las rechaza (si pasara alguna, el verificador no sirve). */
async function autoprueba(banco: Pregunta[]) {
  const una = (pref: string) => banco.find((p) => p.id.startsWith(pref))!;
  const clonar = (p: Pregunta, cambio: Partial<Pregunta>): Pregunta => ({ ...structuredClone(p), ...cambio });
  const otra = (p: Pregunta) => (p.correcta + 1) % 4;
  const camp = una('mun-2018-campeon'), bdo = una('bdo-2008') ?? una('bdo-2009') ?? una('bdo-20'), cap = una('ca-ccc-1978'), fun = banco.find((p) => p.id.startsWith('clu-') && p.id.endsWith('-fundacion'))!, est = una('est-camp-nou');
  const casos: [string, Pregunta][] = [
    ['respuesta cambiada por una incorrecta', clonar(camp, { correcta: otra(camp) })],
    ['la respuesta correcta puesta como incorrecta además (opción repetida)', clonar(camp, { opciones: [camp.opciones[camp.correcta], camp.opciones[camp.correcta], 'X', 'Y'], correcta: 0 })],
    ['fuente de otra edición', clonar(camp, { fuente: una('mun-2014-campeon').fuente })],
    ['propiedad equivocada', clonar(camp, { fuente: camp.fuente.replace('#P1346', '#P17') })],
    ['año del premio cambiado', clonar(bdo, { fuente: bdo.fuente.replace(/@(\d{4})/, (_, y) => '@' + (Number(y) + 1)) })],
    ['premio con otra persona', clonar(bdo, { correcta: otra(bdo) })],
    ['campeón de otra copa', clonar(cap, { correcta: otra(cap) })],
    ['año de fundación cambiado', clonar(fun, { correcta: otra(fun) })],
    ['ciudad de estadio cambiada (con ancestros)', clonar(est, { correcta: otra(est) })],
    ['una incorrecta que también figura en la fuente (el barrio del estadio)', clonar(est, { opciones: est.opciones.map((o, i) => (i === otra(est) ? 'La Maternitat i Sant Ramon' : o)), correcta: est.correcta })],
    ['fuente sin propiedad', clonar(camp, { fuente: 'https://www.wikidata.org/wiki/Q170645' })],
    ['host no permitido', clonar(camp, { fuente: 'https://example.com/wiki/Q170645#P1346' })],
    ['fuente de Wikipedia que no sostiene la respuesta', clonar(camp, { fuente: 'https://es.wikipedia.org/wiki/Copa_Mundial_de_F%C3%BAtbol_de_2018', correcta: otra(camp) })],
    ['palabra vetada', clonar(camp, { pregunta: '¿Qué selección es la campeona actual del mundo?' })],
    ['entidad que no existe', clonar(camp, { fuente: 'https://www.wikidata.org/wiki/Q999999999#P1346' })],
  ];
  let fallos = 0;
  for (const [nombre, p] of casos) {
    const errores: string[] = [];
    // Esquema por separado de la red: el error puede venir de cualquiera de los dos.
    errores.push(...verificarEsquema(p));
    await verificarFuente(p, (m) => errores.push(m));
    const rechazada = errores.length > 0;
    console.log(`${rechazada ? 'OK  ' : 'FALLA'} ${nombre}${rechazada ? ' → ' + errores[0].slice(0, 110) : ' (pasó y no debía)'}`);
    if (!rechazada) fallos++;
  }
  if (fallos) { console.error(`${fallos} casos malos pasaron el verificador`); process.exit(1); }
  console.log(`Autoprueba: el verificador rechazó los ${casos.length} casos malos.`);
}

// ---------- Informe ----------

function conteos(banco: Pregunta[]) {
  const porTema = Object.fromEntries(TEMAS.map((t) => [t, banco.filter((p) => p.tema === t).length]));
  const porDificultad = Object.fromEntries(([1, 2, 3] as Dif[]).map((d) => [d, banco.filter((p) => p.dificultad === d).length]));
  const cruce = Object.fromEntries(TEMAS.map((t) => [t, Object.fromEntries(([1, 2, 3] as Dif[]).map((d) => [d, banco.filter((p) => p.tema === t && p.dificultad === d).length]))]));
  return { total: banco.length, porTema, porDificultad, cruce, origen: { sparql: banco.filter((p) => p.origen === 'sparql').length, curada: banco.filter((p) => p.origen === 'curada').length } };
}
const enLineas = (arr: unknown[]) => '[\n' + arr.map((x) => ' ' + JSON.stringify(x)).join(',\n') + '\n]\n';

// ---------- Programa principal ----------

async function main() {
  const soloVerificar = process.argv.includes('--verificar') || process.argv.includes('--autoprueba');
  let banco: Pregunta[];
  if (soloVerificar) {
    banco = JSON.parse(readFileSync(BANCO, 'utf8'));
  } else {
    const rng = mulberry32(SEMILLA);
    const m = await plantillaMundiales();
    const champions = await plantillaChampions();
    const balon = await plantillaBalon();
    const balonMundial = await plantillaBalonMundial();
    const clubes = await plantillaClubes();
    const copa = await plantillaCopaCampeones();
    const concacaf = await plantillaCampeonatoConcacaf();
    const q = (n1: number, n2: number, n3: number): Record<Dif, number> => ({ 1: n1, 2: n2, 3: n3 });
    const elegidos: Borrador[] = [
      ...elegir(m.campeon, q(8, 7, 6), rng),
      ...elegir(m.sede, q(5, 4, 4), rng),
      ...elegir(champions, q(7, 8, 7), rng),
      ...elegir(balon, q(7, 7, 6), rng),
      ...balonMundial,
      ...elegir(m.cifras.filter((c) => c.id.endsWith('goles')), q(0, 0, 4), rng),
      ...elegir(m.cifras.filter((c) => !c.id.endsWith('goles')), q(0, 3, 3), rng),
      ...elegir(clubes.fundacion.filter((c) => c.tema === 'clubes'), q(0, 4, 10), rng),
      ...elegir(clubes.pais.filter((c) => c.tema === 'clubes'), q(16, 0, 0), rng),
      ...clubes.fundacion.filter((c) => c.tema === 'centroamerica'),
      ...clubes.pais.filter((c) => c.tema === 'centroamerica'),
      ...copa,
      ...concacaf,
    ];
    const curadas: Curada[] = existsSync(CURADAS) ? JSON.parse(readFileSync(CURADAS, 'utf8')) : [];
    banco = [...elegidos.map((b) => armar(b, rng)), ...curadas.map((c) => armarCurada(c, rng))];
    banco.sort((a, b) => TEMAS.indexOf(a.tema) - TEMAS.indexOf(b.tema) || a.dificultad - b.dificultad || a.id.localeCompare(b.id));
    nota(`Generadas ${banco.length} preguntas (${elegidos.length} de plantillas SPARQL, ${curadas.length} curadas).`);
  }

  if (process.argv.includes('--autoprueba')) return autoprueba(banco);
  console.log(`Verificando ${banco.length} preguntas contra Wikidata…`);
  const errores = await verificar(banco);
  const c = conteos(banco);
  console.log('\nInforme de conteos:\n' + JSON.stringify(c, null, 1));
  if (errores.length) {
    console.error(`\n${errores.length} ERRORES:\n- ` + errores.join('\n- '));
    process.exit(1);
  }
  console.log('\nVerificación sin errores.');
  if (!soloVerificar) {
    writeFileSync(BANCO, enLineas(banco));
    const rng = mulberry32(SEMILLA + 1);
    writeFileSync(MUESTRA, enLineas(barajar(banco, rng).slice(0, 30)));
    writeFileSync(INFORME, JSON.stringify({ ...c, fecha: new Date().toISOString().slice(0, 10), calibracion: informe }, null, 1) + '\n');
    console.log(`Escribí ${banco.length} preguntas en src/retos/preguntas.json, la muestra de 30 en scripts/preguntas/revision-30.json y el informe en scripts/preguntas/informe.json.`);
  }
}

await main();
