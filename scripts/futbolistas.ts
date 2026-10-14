// Banco de "¿De dónde es?": genera (plantillas SPARQL), verifica contra Wikidata y escribe src/retos/futbolistas.json.
//   npx tsx scripts/futbolistas.ts --generar     genera, verifica y, SOLO si todo pasa, escribe el banco, la muestra de revisión y el informe
//   npx tsx scripts/futbolistas.ts --verificar   verifica el banco que ya existe, sin regenerarlo (CA-9); no escribe nada
// Las consultas SPARQL son cadenas fijas de este archivo (los QID salen de src/retos/selecciones.ts): no llevan texto de ningún usuario.
// Corre solo a mano, en la máquina del desarrollador. La única fuente es Wikidata (CC0); si la red no llega, el script FALLA: nunca salta la verificación.
//
// Qué entra al banco (RF-22). Un futbolista entra solo si, leído de nuevo con wbgetentities, cumple TODO:
//   - es humano (P31 = Q5) y futbolista de asociación (P106 incluye Q937857);
//   - "país para el deporte" (P1532) con UN solo valor, y es el de su Selección en src/retos/selecciones.ts;
//   - jugó en esa Selección mayor (P54 incluye una selección absoluta de ese país) y en NINGUNA selección absoluta de otro país;
//   - su nombre es la etiqueta (es, o en si no hay) de la entidad, y se puede mostrar con seguridad (mismo alfabeto que el ping pong).
// Quedan fuera los ambiguos (dos selecciones mayores, datos contradictorios, sin etiqueta) y los nombres repetidos entre personas distintas.
// Fama: número de enlaces a Wikipedias (`wikibase:sitelinks`), con un piso calibrado por confederación. Los partidos internacionales (P1350) se
// descartaron como criterio: solo un tercio de los jugadores de Guatemala, México y Argentina lo tiene anotado en sus declaraciones de P54.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { NOMBRE_RE, normalizar } from '../api/_retos';
import { SELECCIONES } from '../src/retos/selecciones';
import { FLAG_CODE } from '../src/ui/flags';
import type { Confed } from '../src/engine/countries';

const UA = 'Chamusqueros/1.0 (https://chamusqueros.vercel.app/privacidad.html; retos-futbol)';
const WD_API = 'https://www.wikidata.org/w/api.php';
const WDQS = 'https://query.wikidata.org/sparql';
const BANCO = new URL('../src/retos/futbolistas.json', import.meta.url);
const CARPETA = new URL('./futbolistas/', import.meta.url);
const MUESTRA = new URL('./futbolistas/revision-30.json', import.meta.url);
const INFORME = new URL('./futbolistas/informe.json', import.meta.url);
const SEMILLA = 20261014;

export interface Entrada { q: string; nombre: string; sel: string }
const HUMANO = 'Q5';
const FUTBOLISTA = 'Q937857';
const SELECCION_MAYOR = 'Q135408445';     // "men's national association football team": las selecciones absolutas (las juveniles casi nunca la llevan)
export const MIN_TOTAL = 400, MAX_TOTAL = 800, TOPE_CONFED = 0.45;
export const MINIMOS: Partial<Record<Confed, number>> = { CONCACAF: 60, CONMEBOL: 60, CAF: 40, AFC: 25 };
const CONFEDS: Confed[] = ['CONCACAF', 'CONMEBOL', 'UEFA', 'AFC', 'CAF'];

// Calibración (ver el informe que deja --generar): piso de enlaces por confederación, presupuesto del banco y tope por país.
// UEFA tiene muchísimos con fama, por eso su piso es alto y su presupuesto no pasa del 40 %; en CONCACAF y CAF, el piso es más bajo.
const PISO: Record<Confed, number> = { UEFA: 45, CONMEBOL: 35, CONCACAF: 25, CAF: 30, AFC: 30 };
const CENTROAMERICA = new Set(['Guatemala', 'El Salvador', 'Honduras', 'Costa Rica', 'Panamá', 'Nicaragua', 'Belice']);
const PISO_CENTROAMERICA = 15;           // los de Centroamérica rara vez pasan de 30 enlaces: con 15 todavía son jugadores con partidos y varias páginas
const PISO_GUATEMALA = 9;                // Guatemala solo tiene 3 jugadores con 14 o más enlaces; con 9 hay una docena y siguen verificados uno por uno
const PRESUPUESTO: Record<Confed, number> = { UEFA: 200, CONMEBOL: 100, CONCACAF: 100, CAF: 70, AFC: 50 };
const TOPE_PAIS: Record<Confed, number> = { UEFA: 14, CONMEBOL: 20, CONCACAF: 18, CAF: 10, AFC: 8 };
const TOPE_CENTROAMERICA = 10;

// ---------- Utilidades ----------

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function barajar<T>(a: readonly T[], rng: () => number): T[] {
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
      const r = await fetch(url, { ...init, headers: { 'user-agent': UA, ...init.headers }, signal: AbortSignal.timeout(90000) });
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
      return r;
    } catch (e) {
      if (i >= intentos) throw e;
      await dormir(2000 * i);
    }
  }
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

// ---------- La fuente: lo único que toca la red (en las pruebas se sustituye por una falsa) ----------

export interface Entidad {
  id: string;
  missing?: string;
  labels?: Record<string, { value: string }>;
  claims?: Record<string, { rank?: string; mainsnak: { snaktype: string; datavalue?: { value: any } } }[]>;
}
/** Selecciones absolutas: QID de la selección → los "países" con que la fuente la identifica (P1532 y P17). */
export type Equipos = Map<string, string[]>;
export interface Fuente {
  entidades(ids: string[]): Promise<Map<string, Entidad>>;
  equipos(): Promise<Equipos>;
}

/** Plantilla B: todas las selecciones absolutas masculinas, con el país que les da la fuente. Se descartan las juveniles y olímpicas que la lleven. */
const PLANTILLA_SELECCIONES = `SELECT ?t ?tLabel ?deporte ?pais WHERE {
  ?t wdt:P31 wd:${SELECCION_MAYOR} .
  OPTIONAL { ?t wdt:P1532 ?deporte }
  OPTIONAL { ?t wdt:P17 ?pais }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;
const NO_ABSOLUTA = /\b(under|olympic|women|beach|futsal|amateur|reserve|b team)\b|\bu-?\d{2}\b/i;

export const fuenteWikidata: Fuente = {
  async entidades(ids) {
    const m = new Map<string, Entidad>();
    for (let i = 0; i < ids.length; i += 25) {
      const lote = ids.slice(i, i + 25);
      const r = await pedir(`${WD_API}?` + new URLSearchParams({ action: 'wbgetentities', ids: lote.join('|'), props: 'claims|labels', languages: 'es|en', format: 'json' }));
      if (!r.ok) throw new Error(`wbgetentities ${r.status}`);
      const j: any = await r.json();
      if (!j.entities) throw new Error(`wbgetentities sin entidades: ${JSON.stringify(j).slice(0, 200)}`);
      for (const [id, e] of Object.entries<any>(j.entities)) m.set(id, e);
      await dormir(250);
    }
    return m;
  },
  async equipos() {
    const filas = await sparql(PLANTILLA_SELECCIONES);
    const etiqueta = new Map<string, string>();
    const paises = new Map<string, Set<string>>();
    for (const f of filas) {
      etiqueta.set(f.t, f.tLabel);
      const s = paises.get(f.t) ?? new Set<string>();
      for (const k of ['deporte', 'pais']) if (f[k]) s.add(f[k]);
      paises.set(f.t, s);
    }
    // Sin etiqueta en inglés la fuente devuelve el QID: se queda como absoluta, así un conflicto no se pasa por alto.
    return new Map([...paises].filter(([t]) => !NO_ABSOLUTA.test(etiqueta.get(t) ?? '')).map(([t, s]) => [t, [...s]]));
  },
};

// ---------- Verificación de una entidad (misma regla para generar y para verificar) ----------

const ids = (e: Entidad, prop: string): (string | null)[] =>
  (e.claims?.[prop] ?? []).filter((c) => c.rank !== 'deprecated').map((c) => (c.mainsnak.snaktype === 'value' && typeof c.mainsnak.datavalue?.value?.id === 'string' ? c.mainsnak.datavalue.value.id : null));

/**
 * Nombre para mostrar: la etiqueta en español, o en inglés si no hay. Si la de inglés (el título más conocido en Wikipedia) es el mismo nombre
 * sin los apellidos que la de español agrega ("Hugo Sánchez" y "Hugo Sánchez Márquez"), se usa la corta.
 */
export function nombreDe(e: Entidad): string | null {
  const es = e.labels?.es?.value, en = e.labels?.en?.value;
  if (es && en && es !== en) {
    const ten = normalizar(en).split(' '), tes = normalizar(es).split(' ');
    if (ten.length >= 2 && ten.length < tes.length && ten.every((t) => tes.includes(t))) return en;
  }
  return es ?? en ?? null;
}

export interface Hallazgo { codigo: string; texto: string }
/** Qué le falla a una entrada contra su entidad leída de la fuente (lista vacía = verificada). */
export function diagnosticar(e: Entidad | undefined, q: string, sel: string, equipos: Equipos, nombre?: string): Hallazgo[] {
  const r: Hallazgo[] = [];
  const m = (codigo: string, texto: string) => r.push({ codigo, texto: `${q} (${sel}): ${texto}` });
  const s = SELECCIONES[sel];
  if (!s) return [{ codigo: 'selección desconocida', texto: `${q}: la selección "${sel}" no está en SELECCIONES` }];
  if (!e || e.missing !== undefined || e.id !== q) return [{ codigo: 'entidad ausente', texto: `${q}: la fuente no tiene esa entidad` }];
  if (!ids(e, 'P31').includes(HUMANO)) m('no es humano', 'no es un humano');
  if (!ids(e, 'P106').includes(FUTBOLISTA)) m('no es futbolista', 'su ocupación no incluye futbolista de asociación');
  const paises = ids(e, 'P1532');
  if (paises.length !== 1) m('varios países para el deporte', `tiene ${paises.length} valores de país para el deporte (tiene que ser exactamente 1)`);
  else if (paises[0] !== s.pais) m('país para el deporte distinto', `su país para el deporte es ${paises[0]}, no ${s.pais}`);
  const absolutas = ids(e, 'P54').filter((t): t is string => t !== null && equipos.has(t));
  if (!absolutas.some((t) => equipos.get(t)!.includes(s.pais))) m('sin selección absoluta propia', 'no figura en ninguna selección absoluta de ese país');
  const ajenas = absolutas.filter((t) => !equipos.get(t)!.includes(s.pais));
  if (ajenas.length) m('otra selección absoluta (ambiguo)', `también figura en otra selección absoluta (${[...new Set(ajenas)].join(', ')}): ambiguo`);
  const etiqueta = nombreDe(e);
  if (!etiqueta) m('sin etiqueta', 'no tiene etiqueta en español ni en inglés');
  else if (nombre !== undefined && ![e.labels?.es?.value, e.labels?.en?.value].includes(nombre)) m('nombre distinto de la etiqueta', `el nombre "${nombre}" no es su etiqueta en la fuente ("${etiqueta}")`);
  return r;
}
export const evaluarEntidad = (...a: Parameters<typeof diagnosticar>): string[] => diagnosticar(...a).map((h) => h.texto);

// ---------- Verificación del banco ----------

const QID = /^Q[1-9]\d{0,9}$/;
export function conteos(banco: Entrada[]) {
  const porConfed = Object.fromEntries(CONFEDS.map((c) => [c, banco.filter((x) => SELECCIONES[x.sel]?.confed === c).length]));
  const porSeleccion: Record<string, number> = {};
  for (const x of banco) porSeleccion[x.sel] = (porSeleccion[x.sel] ?? 0) + 1;
  const orden = Object.entries(porSeleccion).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'));
  return { total: banco.length, porConfed, selecciones: orden.length, porSeleccion: Object.fromEntries(orden), guatemala: banco.filter((x) => x.sel === 'Guatemala').map((x) => x.nombre) };
}

/** Forma, repetidos, tamaño, mínimos y tope por confederación y banderas: lo que se puede comprobar sin red. */
export function verificarEstructura(banco: unknown): string[] {
  const err: string[] = [];
  if (!Array.isArray(banco)) return ['el banco no es una lista'];
  const qs = new Set<string>(), nombres = new Map<string, string>();
  for (const [i, x] of banco.entries()) {
    const dnd = `entrada ${i}`;
    if (!x || typeof x !== 'object' || Object.keys(x).sort().join() !== 'nombre,q,sel') { err.push(`${dnd}: tiene que tener exactamente q, nombre y sel`); continue; }
    const { q, nombre, sel } = x as Entrada;
    if (typeof q !== 'string' || !QID.test(q)) { err.push(`${dnd}: q inválido`); continue; }
    if (typeof nombre !== 'string' || !NOMBRE_RE.test(nombre) || nombre !== nombre.trim()) err.push(`${q}: el nombre ${JSON.stringify(nombre)} no se puede mostrar con seguridad`);
    if (typeof sel !== 'string' || !SELECCIONES[sel]) err.push(`${q}: la selección ${JSON.stringify(sel)} no está en SELECCIONES`);
    else if (!FLAG_CODE[sel]) err.push(`${q}: la selección "${sel}" no tiene bandera en el juego`);
    if (qs.has(q)) err.push(`${q}: repetido`);
    qs.add(q);
    const clave = typeof nombre === 'string' ? normalizar(nombre) : '';
    if (clave && nombres.has(clave)) err.push(`${q}: el nombre "${nombre}" ya lo lleva ${nombres.get(clave)} (dos personas con el mismo nombre confunden)`);
    else if (clave) nombres.set(clave, q);
  }
  if (banco.length < MIN_TOTAL || banco.length > MAX_TOTAL) err.push(`el banco tiene ${banco.length} futbolistas y tiene que tener de ${MIN_TOTAL} a ${MAX_TOTAL}`);
  const c = conteos(banco.filter((x): x is Entrada => !!x && typeof x.sel === 'string'));
  for (const f of CONFEDS) {
    const n = c.porConfed[f];
    if (n > TOPE_CONFED * banco.length) err.push(`${f} tiene ${n} de ${banco.length} (${Math.round((100 * n) / banco.length)} %): el tope es ${TOPE_CONFED * 100} %`);
    const min = MINIMOS[f];
    if (min !== undefined && n < min) err.push(`${f} tiene ${n}: el mínimo es ${min}`);
  }
  return err;
}

/** Vuelve a leer cada futbolista en la fuente y exige que siga cumpliendo todo. */
export async function verificarContraFuente(banco: Entrada[], fuente: Fuente, avisar: (s: string) => void = () => {}): Promise<string[]> {
  const equipos = await fuente.equipos();
  if (equipos.size < 100) return [`la fuente devolvió solo ${equipos.size} selecciones absolutas: no es creíble`];
  const err: string[] = [];
  for (let i = 0; i < banco.length; i += 100) {
    const lote = banco.slice(i, i + 100);
    const leidas = await fuente.entidades(lote.map((x) => x.q));
    for (const x of lote) err.push(...evaluarEntidad(leidas.get(x.q), x.q, x.sel, equipos, x.nombre));
    avisar(`  verificados ${Math.min(i + 100, banco.length)} de ${banco.length}…`);
  }
  return err;
}

// ---------- Generación ----------

const piso = (sel: string) => (sel === 'Guatemala' ? PISO_GUATEMALA : CENTROAMERICA.has(sel) ? PISO_CENTROAMERICA : PISO[SELECCIONES[sel].confed]);
const tope = (sel: string) => (CENTROAMERICA.has(sel) ? TOPE_CENTROAMERICA : TOPE_PAIS[SELECCIONES[sel].confed]);

/** Plantilla A: los futbolistas con más enlaces cuyo "país para el deporte" es el de esa Selección. El QID y las cifras son constantes de este archivo. */
const plantillaCandidatos = (pais: string, pisoEnlaces: number, limite: number) => `SELECT ?p ?pLabel ?sl WHERE {
  ?p wdt:P1532 wd:${pais} ; wdt:P31 wd:${HUMANO} ; wdt:P106 wd:${FUTBOLISTA} ; wikibase:sitelinks ?sl .
  FILTER(?sl >= ${pisoEnlaces})
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
} ORDER BY DESC(?sl) LIMIT ${limite}`;

interface Candidato { q: string; sel: string; nombre: string; enlaces: number }

async function generar(nota: (s: string) => void): Promise<{ banco: Entrada[]; informe: Record<string, unknown> }> {
  // 1. Candidatos por Selección (plantilla A).
  const candidatos = new Map<string, Candidato[]>();
  for (const sel of Object.keys(SELECCIONES)) {
    const lim = tope(sel) * 2;
    const filas = await sparql(plantillaCandidatos(SELECCIONES[sel].pais, piso(sel), lim));
    candidatos.set(sel, filas.map((f) => ({ q: f.p, sel, nombre: f.pLabel, enlaces: Number(f.sl) })));
    await dormir(400);
  }
  const brutos = [...candidatos.values()].reduce((n, l) => n + l.length, 0);
  nota(`Plantilla A: ${brutos} candidatos de ${candidatos.size} selecciones (piso de enlaces ${JSON.stringify(PISO)}, Centroamérica ${PISO_CENTROAMERICA}, Guatemala ${PISO_GUATEMALA}).`);

  // 2. Releer cada candidato y aplicar la misma regla del verificador (descarta ambiguos y contradictorios).
  const fuente = fuenteWikidata;
  const equipos = await fuente.equipos();
  nota(`Plantilla B: ${equipos.size} selecciones absolutas.`);
  const todos = [...candidatos.values()].flat();
  const leidas = await fuente.entidades([...new Set(todos.map((c) => c.q))]);
  const descartes: Record<string, number> = {};
  const validos = new Map<string, Candidato[]>();
  for (const c of todos) {
    const e = leidas.get(c.q);
    const hallazgos = diagnosticar(e, c.q, c.sel, equipos);
    if (hallazgos.length) {
      descartes[hallazgos[0].codigo] = (descartes[hallazgos[0].codigo] ?? 0) + 1;
      continue;
    }
    const nombre = nombreDe(e!)!;
    if (!NOMBRE_RE.test(nombre) || nombre !== nombre.trim()) { descartes['nombre no mostrable'] = (descartes['nombre no mostrable'] ?? 0) + 1; continue; }
    validos.set(c.sel, [...(validos.get(c.sel) ?? []), { ...c, nombre }]);
  }
  nota(`Descartados al releer: ${JSON.stringify(descartes)}`);

  // 3. Selección: por confederación, de a un jugador por país en cada vuelta (el más famoso de cada uno), hasta llenar su presupuesto.
  const banco: Entrada[] = [];
  const nombresUsados = new Set<string>();
  const porPais: Record<string, number> = {};
  for (const conf of CONFEDS) {
    const paises = Object.keys(SELECCIONES).filter((s) => SELECCIONES[s].confed === conf);
    let elegidos = 0;
    for (let vuelta = 0; elegidos < PRESUPUESTO[conf]; vuelta++) {
      const turno = paises.filter((s) => (validos.get(s)?.length ?? 0) > vuelta && (porPais[s] ?? 0) < tope(s)).map((s) => validos.get(s)![vuelta]);
      if (!turno.length) break;
      for (const c of turno.sort((a, b) => b.enlaces - a.enlaces)) {
        if (elegidos >= PRESUPUESTO[conf]) break;
        const clave = normalizar(c.nombre);
        if (nombresUsados.has(clave)) { descartes['nombre repetido'] = (descartes['nombre repetido'] ?? 0) + 1; continue; }
        nombresUsados.add(clave);
        porPais[c.sel] = (porPais[c.sel] ?? 0) + 1;
        banco.push({ q: c.q, nombre: c.nombre, sel: c.sel });
        elegidos++;
      }
    }
  }
  banco.sort((a, b) => a.sel.localeCompare(b.sel, 'es') || a.nombre.localeCompare(b.nombre, 'es'));
  const informe = {
    fecha: new Date().toISOString().slice(0, 10),
    calibracion: { pisoEnlaces: PISO, pisoCentroamerica: PISO_CENTROAMERICA, pisoGuatemala: PISO_GUATEMALA, presupuesto: PRESUPUESTO, topePorPais: TOPE_PAIS, topeCentroamerica: TOPE_CENTROAMERICA },
    candidatosBrutos: brutos,
    validosTrasReleer: [...validos.values()].reduce((n, l) => n + l.length, 0),
    descartes,
    ...conteos(banco),
  };
  return { banco, informe };
}

const enLineas = (arr: unknown[]) => '[\n' + arr.map((x) => ' ' + JSON.stringify(x)).join(',\n') + '\n]\n';

// ---------- Programa principal ----------

async function main() {
  const nota = (s: string) => console.log(s);
  const generando = process.argv.includes('--generar');
  if (!generando && !process.argv.includes('--verificar')) { console.error('Uso: npx tsx scripts/futbolistas.ts --generar | --verificar'); process.exit(2); }
  let banco: Entrada[], extra: Record<string, unknown> = {};
  if (generando) {
    const g = await generar(nota);
    banco = g.banco;
    extra = g.informe;
    nota(`Generados ${banco.length} futbolistas.`);
  } else {
    if (!existsSync(BANCO)) { console.error('Todavía no existe src/retos/futbolistas.json: corré --generar.'); process.exit(1); }
    banco = JSON.parse(readFileSync(BANCO, 'utf8'));
  }
  const errores = verificarEstructura(banco);
  if (!errores.length) errores.push(...(await verificarContraFuente(banco, fuenteWikidata, nota)));
  const c = conteos(banco);
  console.log('\nInforme de conteos:\n' + JSON.stringify({ total: c.total, porConfed: c.porConfed, selecciones: c.selecciones, guatemala: c.guatemala }, null, 1));
  if (errores.length) {
    console.error(`\n${errores.length} ERRORES:\n- ` + errores.join('\n- '));
    process.exit(1);
  }
  console.log('\nVerificación sin errores.');
  if (!generando) return;
  if (!existsSync(CARPETA)) mkdirSync(CARPETA);
  writeFileSync(BANCO, enLineas(banco));
  const muestra = barajar(banco, mulberry32(SEMILLA)).slice(0, 30).map((x) => ({
    q: x.q, nombre: x.nombre, sel: x.sel, fuente: `https://www.wikidata.org/wiki/${x.q}`, selQ: SELECCIONES[x.sel].pais, selFuente: `https://www.wikidata.org/wiki/${SELECCIONES[x.sel].pais}`,
  }));
  writeFileSync(MUESTRA, enLineas(muestra));
  writeFileSync(INFORME, JSON.stringify(extra, null, 1) + '\n');
  console.log(`Escribí ${banco.length} futbolistas en src/retos/futbolistas.json, la muestra de 30 en scripts/futbolistas/revision-30.json y el informe en scripts/futbolistas/informe.json.`);
}

// Solo corre al invocarlo desde la consola: la prueba (scripts/futbolistas.test.ts) importa las funciones sin tocar la red.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
