// Bloque "Ritmo" de la simulación (specs/ritmo-por-temporada, CA-01 a CA-13): juega las MISMAS carreras en los tres modos (misma semilla, país,
// posición y departamento) con tres políticas (al azar, mejor opción y techo) y mide ritmo, equidad entre modos, tasas, rutas, variedad y duración.
// Lo llama scripts/simulate.ts al final (RITMO=off lo omite). Solo: `npx tsx scripts/ritmo.ts 5000` (RITMO_N carreras por modo).
// Perillas: AJUSTES='{"ESCALA":0.45,"P_NAC":0.3}' sobrescribe src/engine/ritmo.ts AJUSTES (para calibrar sin tocar el código).
// Con menos de 5.000 carreras solo reporta lo estadístico; con menos de 20.000 las bandas de equidad, tasas y rutas informan sin fallar.
import { readFileSync } from 'node:fs';
import { Career, summarize } from '../src/engine/engine';
import { COUNTRIES } from '../src/engine/countries';
import { ALL_EVENTS } from '../src/engine/events';
import { AJUSTES, CLASES, decisionesDe, escalar, TOPE_HISTORIA } from '../src/engine/ritmo';
import { createRng } from '../src/engine/rng';
import type { Effects, Mode, Position } from '../src/engine/types';

if (process.env.AJUSTES) Object.assign(AJUSTES, JSON.parse(process.env.AJUSTES));

const MODES: Mode[] = ['intensa', 'normal', 'expres'];
const POSITIONS: Position[] = ['POR', 'DEF', 'MED', 'DEL'];
type Politica = 'azar' | 'mejor' | 'techo';
const POLITICAS: Politica[] = ['azar', 'mejor', 'techo'];

// ---- Lo que mide "hoy" (main, 6c440b6; ver "Línea base medida" del spec): el ancla de las bandas ----
const HOY = {
  media: 107.6, p50: 81.7, p90: 206,
  mundial: 10.8, afuera: 12.0, seleccion: 21.7, cambio: 0.8, ofertas: 1.68, titulos: 3.74, premios: 8.55,
  // Proporción de cada categoría sin contar oferta de traspaso, retiro ni minijuego (media de modos).
  categorias: { amor: 10.8, cancha: 13.4, contrato: 9.7, divisiones: 18.7, extranjero: 3.4, formacion: 3.8, medios: 21.4, seleccion: 6.8, vida: 11.9 } as Record<string, number>,
};
/** Rutas encadenadas: [nombre, primer paso, último paso, % de carreras que ven el primero (media de hoy), finalización media de hoy]. */
const RUTAS: [string, string, string, number, number][] = [
  ['Extranjero: visor → oferta final', 'ext_visor', 'ext_oferta_final', 13.8, 1],
  ['Selección: prelista → debut', 'sel_prelista', 'sel_debut', 5.4, 40],
  ['Selección: eliminatoria grupos → decisivo', 'sel_elim_grupos', 'sel_elim_decisivo', 17.1, 12],
  ['Selección: Sub-20 → Mundial Sub-20', 'sel_sub20_conv', 'sel_sub20_mundial', 6.4, 4],
  ['Amor: cita → compromiso', 'amor_cita', 'amor_compromiso', 24.6, 41],
  ['Amor: compromiso → boda', 'amor_compromiso', 'amor_boda', 10.9, 31],
  ['Amor: hija del técnico (1 → 3)', 'amor_hija_1', 'amor_hija_3', 13.9, 19],
  ['Amor: pareja de un compañero (1 → 2)', 'amor_companero_1', 'amor_companero_2', 14.4, 42],
];
const CATEGORIAS_RITMO = ['cancha', 'vida', 'medios', 'formacion', 'divisiones'];
/** Supuestos de duración (spec, "Duración estimada"): segundos por decisión, minijuego jugado, minijuego en "Simular" y resumen de temporada. */
const SEG = { decision: 12, minijuego: 16, simular: 4, resumen: 8 };

// ---------- Una carrera ----------

interface Agg {
  n: number;
  scores: number[];
  peak: number; mundial: number; afuera: number; seleccion: number; cambio: number; ofertas: number; titulos: number; premios: number; dinero: number;
  temporadas: number; edadRetiro: number; ritmo: number; historia: number; minijuegos: number; resumenes: number; amor: number; amorMax: number; amorConAlguno: number;
  cats: Record<string, number>; coreTotal: number;
  /** Temporadas con exactamente K decisiones de ritmo / total; máximo de historia por temporada; suma de historia (sin traspaso ni retiro). */
  ritmoOk: number; ritmoMal: number; histMax: number; histSuma: number; seasonsN: number;
  /** Minijuegos: temporadas elegibles (18 o más años y 2 jugadas) con exactamente uno, elegibles, minijuegos antes de los 18, repetidos en menos de 3 temporadas. */
  mjExacto: Record<string, number>; mjElegibles: Record<string, number>; mjAntes18: number; mjCerca: number;
  mjAporte: number; mjVisible: number; ritmoVisible: number;
  repetidas: number; decisionesUnicas: number; cercanas: number; relajadas: number; saltadas: number;
  ruta: Record<string, [primero: number, ultimo: number]>;
  maxCaps: number; maxTitulos: number;
}
const nuevo = (): Agg => ({
  n: 0, scores: [], peak: 0, mundial: 0, afuera: 0, seleccion: 0, cambio: 0, ofertas: 0, titulos: 0, premios: 0, dinero: 0, temporadas: 0, edadRetiro: 0,
  ritmo: 0, historia: 0, minijuegos: 0, resumenes: 0, amor: 0, amorMax: 0, amorConAlguno: 0, cats: {}, coreTotal: 0, ritmoOk: 0, ritmoMal: 0, histMax: 0, histSuma: 0, seasonsN: 0,
  mjExacto: {}, mjElegibles: {}, mjAntes18: 0, mjCerca: 0, mjAporte: 0, mjVisible: 0, ritmoVisible: 0, repetidas: 0, decisionesUnicas: 0, cercanas: 0, relajadas: 0, saltadas: 0,
  ruta: Object.fromEntries(RUTAS.map(([n]) => [n, [0, 0]])), maxCaps: 0, maxTitulos: 0,
});

/** Valor esperado de una opción en nivel y fama (la política "mejor opción" de las otras secciones). */
const valor = (o: { outcomes: { p: number; effects: Effects }[] }) =>
  o.outcomes.reduce((t, x) => t + x.p * (3 * (x.effects.rating ?? 0) + (x.effects.potential ?? 0) + 0.1 * (x.effects.fame ?? 0) + 0.05 * (x.effects.morale ?? 0)), 0);

const reparto = (i: number) => {
  const country = COUNTRIES[i % COUNTRIES.length];
  const k = Math.floor(i / COUNTRIES.length);
  return { country, dept: country.regions[k % country.regions.length], position: POSITIONS[k % 4] };
};
const crear = (i: number, mode: Mode) => {
  const { country, dept, position } = reparto(i);
  return new Career(
    { firstName: 'Sim', lastName: `#${i}`, country: country.code, dept, position, foot: 'Derecho', number: 10, mode, avatar: { skin: 0, hair: 0, hairColor: 0, beard: 0, extra: 0 } },
    i + 1,
  );
};
const ESPECIALES = new Set(['oferta', 'retiro']);

function jugar(i: number, mode: Mode, politica: Politica, a: Agg, auditar?: (c: Career) => void) {
  const c = crear(i, mode);
  const p = c.player;
  const pos = p.setup.position;
  c.start();
  let temporada: { age: number; played: number; ritmo: number; hist: number; mj: number } | null = null;
  const season = () => (temporada ??= { age: p.age, played: p.seasons.length, ritmo: 0, hist: 0, mj: 0 });
  const visto = new Map<string, number>(); // plantilla -> temporada en que salió por última vez
  const rutas = new Set<string>();
  let amor = 0, guard = 0, decisiones = 0, minijuegos = 0;
  const stay = (n: number) => n - 1;
  while (!c.isOver && guard++ < 5000) {
    if (!c.pendingEvent) {
      season();
      const r = c.advance();
      if (r) {
        const t = temporada!;
        temporada = null;
        a.resumenes++;
        a.seasonsN++;
        if (t.ritmo === decisionesDe(mode, t.played)) a.ritmoOk++;
        else a.ritmoMal++;
        a.histMax = Math.max(a.histMax, t.hist);
        a.histSuma += t.hist;
        if (t.age < 18 && t.mj) a.mjAntes18 += t.mj;
        if (t.age >= 18 && t.played >= 2) {
          a.mjElegibles[pos] = (a.mjElegibles[pos] ?? 0) + 1;
          if (t.mj === 1) a.mjExacto[pos] = (a.mjExacto[pos] ?? 0) + 1;
        }
      }
      continue;
    }
    const ev = c.pendingEvent!;
    const t = season();
    const antes = { fame: p.fame, rating: p.rating };
    let res;
    if (ev.minigame) {
      t.mj++;
      minijuegos++;
      const ultimo = visto.get(ev.id);
      if (ultimo !== undefined && p.seasons.length - ultimo < 3) a.mjCerca++;
      visto.set(ev.id, p.seasons.length);
      res = politica === 'techo' ? c.choose(0, 1) : c.choose(0); // "Simular" salvo el techo, que juega perfecto
      a.mjAporte += (p.fame - antes.fame) * 0.15 + (p.rating - antes.rating) * 1.2;
      if (res.changes.length) a.mjVisible++;
      (a.cats.minijuego = (a.cats.minijuego ?? 0) + 1);
    } else {
      decisiones++;
      if (ev.clase === 'ritmo') {
        t.ritmo++;
        a.ritmo++;
      } else {
        a.historia++;
        if (!ESPECIALES.has(ev.id)) t.hist++;
      }
      if (rutas.size < 1000) rutas.add(ev.id);
      a.cats[ev.category] = (a.cats[ev.category] ?? 0) + 1;
      if (ev.category === 'amor') amor++;
      if (ev.id === 'oferta') a.ofertas++;
      if (!ESPECIALES.has(ev.id)) {
        a.coreTotal++;
        const antesVisto = visto.get(ev.id);
        if (antesVisto !== undefined) {
          a.repetidas++;
          const tpl = ALL_EVENTS.find((e) => e.id === ev.id)!;
          if (p.seasons.length - antesVisto <= (tpl.cooldown ?? 4)) a.cercanas++;
        } else a.decisionesUnicas++;
        visto.set(ev.id, p.seasons.length);
      }
      let pick: number;
      if (politica === 'azar') {
        pick = ev.id === 'oferta' ? (c.rng() < 0.5 ? stay(ev.options.length) : Math.floor(c.rng() * stay(ev.options.length))) : Math.floor(c.rng() * ev.options.length);
      } else pick = ev.options.reduce((best, o, j) => (valor(o) > valor(ev.options[best]) ? j : best), 0);
      res = c.choose(pick);
      if (ev.clase === 'ritmo' && res.changes.length) a.ritmoVisible++;
    }
    void res;
  }
  if (guard >= 5000) throw new Error(`carrera ${i} (${mode}) alcanzó el límite de iteraciones`);
  auditar?.(c);
  const s = summarize(p);
  a.n++;
  a.scores.push(s.score);
  a.peak += p.peakRating;
  a.mundial += p.flags.mundial ? 1 : 0;
  a.afuera += s.clubs.some((x) => x.club.abroad) ? 1 : 0;
  a.seleccion += p.caps > 0 ? 1 : 0;
  a.cambio += p.cambioSel ? 1 : 0;
  a.titulos += s.titles.length;
  a.premios += p.awards.length;
  a.dinero += s.earned / 1e6;
  a.temporadas += p.seasons.length;
  a.edadRetiro += p.age;
  a.minijuegos += minijuegos;
  a.amor += amor;
  a.amorMax = Math.max(a.amorMax, amor);
  a.amorConAlguno += amor > 0 ? 1 : 0;
  a.relajadas += c.stats.relajadas;
  a.saltadas += c.stats.saltadas;
  a.maxCaps = Math.max(a.maxCaps, p.caps);
  a.maxTitulos = Math.max(a.maxTitulos, s.titles.length);
  for (const [nombre, primero, ultimo] of RUTAS) {
    if (rutas.has(primero)) a.ruta[nombre][0]++;
    if (rutas.has(primero) && rutas.has(ultimo)) a.ruta[nombre][1]++;
  }
  void decisiones;
}

// ---------- Estadística ----------

const q = (v: number[], f: number) => v[Math.min(v.length - 1, Math.floor(f * v.length))];
const f1 = (x: number) => x.toFixed(1);
const f2 = (x: number) => x.toFixed(2);
const pc = (x: number, n: number) => (100 * x) / Math.max(1, n);
const dentro = (x: number, ref: number, tol: number) => Math.abs(x - ref) <= tol * ref;
const suma = (aggs: Agg[], f: (a: Agg) => number) => aggs.reduce((t, a) => t + f(a), 0);

/**
 * Juega n carreras por modo (las mismas en los tres) con cada política y devuelve los errores. n: lo que pide `npm run simulate -- N`.
 * Falla en lo mecánico (CA-01, CA-09, CA-10, CA-11, CA-13, tope de historia) y, con 20.000 o más, también en equidad, tasas y rutas (CA-03 a CA-08, CA-12).
 */
export function medirRitmo(n: number, todos = true): string[] {
  const errores = new Set<string>();
  const blandos = new Set<string>(); // se reportan, pero no fallan (muestra chica o contenido pendiente)
  const grande = n >= 5000 && todos;
  const enorme = n >= 20000 && todos;
  const falla = (duro: boolean, msg: string) => (duro ? errores : blandos).add(msg);
  const t0 = Date.now();
  const nMejor = process.env.RAPIDO ? Math.min(n, 300) : Math.min(n, 8000); // RAPIDO=1: calibrar solo con decisiones al azar
  const agg: Record<Politica, Record<Mode, Agg>> = {
    azar: { intensa: nuevo(), normal: nuevo(), expres: nuevo() },
    mejor: { intensa: nuevo(), normal: nuevo(), expres: nuevo() },
    techo: { intensa: nuevo(), normal: nuevo(), expres: nuevo() },
  };
  for (const pol of POLITICAS) {
    const cuantas = pol === 'azar' ? n : nMejor;
    for (let i = 0; i < cuantas; i++) for (const m of MODES) jugar(i, m, pol, agg[pol][m]);
  }
  console.log(`Ritmo: ${n} carreras por modo con decisiones al azar y ${nMejor} con mejor opción y techo, las mismas en los tres modos (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  console.log(`  AJUSTES ${JSON.stringify(AJUSTES)}`);

  // ---- CA-01, CA-02: decisiones por temporada y minijuego por temporada ----
  console.log('Decisiones por temporada (al azar): ritmo exacto · historia por temporada (máx) · minijuegos por temporada · interacciones por carrera · duración');
  for (const m of MODES) {
    const a = agg.azar[m];
    const hist = a.histSuma / a.seasonsN;
    const mj = a.minijuegos / a.seasonsN;
    const inter = (a.ritmo + a.historia + a.minijuegos) / a.n;
    const decs = (a.ritmo + a.historia) / a.n;
    const min = (a.n ? (decs * SEG.decision + (a.minijuegos / a.n) * SEG.minijuego + (a.temporadas / a.n) * SEG.resumen) / 60 : 0);
    const minSim = (decs * SEG.decision + (a.minijuegos / a.n) * SEG.simular + (a.temporadas / a.n) * SEG.resumen) / 60;
    console.log(`  ${m.padEnd(7)} ${f1(pc(a.ritmoOk, a.ritmoOk + a.ritmoMal))}% ok · ${f2(hist)} (${a.histMax}) · ${f2(mj)} · ${f1(inter)} (${f1(decs)} decisiones + ${f1(a.minijuegos / a.n)} minijuegos) · ${f1(min)} min (${f1(minSim)} con todos en Simular)`);
    if (a.ritmoMal) errores.add(`${m}: ${a.ritmoMal} temporadas sin sus decisiones de ritmo exactas (CA-01)`);
    if (a.histMax > TOPE_HISTORIA) errores.add(`${m}: una temporada con ${a.histMax} decisiones de historia (CA-01)`);
    if (hist > 0.8) errores.add(`${m}: ${f2(hist)} decisiones de historia por temporada (máximo 0,8, CA-01)`);
    if (a.mjAntes18) errores.add(`${m}: ${a.mjAntes18} minijuegos antes de los 18 años (CA-02)`);
    if (a.mjCerca) errores.add(`${m}: ${a.mjCerca} minijuegos repetidos en menos de 3 temporadas (CA-02)`);
    if (m === 'intensa' && inter < 60) errores.add(`intensa: ${f1(inter)} interacciones por carrera (mínimo 60, CA-11)`);
  }
  const hs = MODES.map((m) => agg.azar[m].histSuma / agg.azar[m].seasonsN);
  if (Math.max(...hs) / Math.min(...hs) > 1.15) falla(grande, `la historia por temporada difiere ${f1((Math.max(...hs) / Math.min(...hs) - 1) * 100)}% entre modos (máximo 15%, CA-01)`);
  console.log('Minijuego por temporada (temporadas con 18 años o más y 2 jugadas que traen exactamente uno), por posición:');
  for (const pos of POSITIONS) {
    const cols = MODES.map((m) => `${m} ${f1(pc(agg.azar[m].mjExacto[pos] ?? 0, agg.azar[m].mjElegibles[pos] ?? 0))}%`);
    console.log(`  ${pos}: ${cols.join(' · ')}`);
    for (const m of MODES) {
      const cobertura = pc(agg.azar[m].mjExacto[pos] ?? 0, agg.azar[m].mjElegibles[pos] ?? 0);
      if (cobertura < 95) blandos.add(`pendiente de contenido (T6): ${m} ${pos} con minijuego en ${f1(cobertura)}% de las temporadas (mínimo 95%, CA-02)`);
    }
  }
  const mjs = ALL_EVENTS.filter((e) => e.category === 'minijuego');
  if (mjs.length < 24) blandos.add(`pendiente de contenido (T6): ${mjs.length} situaciones de minijuego (mínimo 24, CA-02)`);

  // ---- CA-03, CA-04, CA-05: equidad ----
  console.log('Puntaje (media / p50 / p90 / máximo) por política y modo, y desvío de cada modo contra el promedio de los tres:');
  const stat = (a: Agg) => { const v = [...a.scores].sort((x, y) => x - y); return { media: v.reduce((t, x) => t + x, 0) / v.length, p50: q(v, 0.5), p90: q(v, 0.9), max: v.at(-1)! }; };
  let maxPuntaje = 0;
  const mediaDe: Record<string, number> = {};
  for (const pol of POLITICAS) {
    const st = MODES.map((m) => stat(agg[pol][m]));
    const prom = { media: st.reduce((t, s) => t + s.media, 0) / 3, p50: st.reduce((t, s) => t + s.p50, 0) / 3, p90: st.reduce((t, s) => t + s.p90, 0) / 3 };
    mediaDe[pol] = prom.media;
    MODES.forEach((m, k) => {
      const s = st[k];
      const d = (x: number, ref: number) => `${x >= ref ? '+' : ''}${f1((100 * (x - ref)) / ref)}%`;
      console.log(`  ${pol.padEnd(5)} ${m.padEnd(7)} ${f1(s.media)} / ${s.p50} / ${s.p90} / ${s.max}   (${d(s.media, prom.media)} / ${d(s.p50, prom.p50)} / ${d(s.p90, prom.p90)})`);
      maxPuntaje = Math.max(maxPuntaje, s.max);
      for (const [nombre, x, ref] of [['media', s.media, prom.media], ['p50', s.p50, prom.p50], ['p90', s.p90, prom.p90]] as const) {
        if (!dentro(x, ref, 0.05)) falla(enorme, `${pol} ${m}: ${nombre} ${f1(x)} fuera de ±5% del promedio ${f1(ref)} (CA-03/CA-04)`);
      }
    });
    if (pol === 'azar') {
      const sorted = MODES.flatMap((m) => agg.azar[m].scores).sort((x, y) => x - y);
      const g = { media: sorted.reduce((t, x) => t + x, 0) / sorted.length, p50: q(sorted, 0.5), p90: q(sorted, 0.9) };
      console.log(`  azar, los tres modos: ${f1(g.media)} / ${g.p50} / ${g.p90} (hoy ${HOY.media} / ${HOY.p50} / ${HOY.p90}, banda ±5%)`);
      if (!dentro(g.media, HOY.media, 0.05)) falla(enorme, `puntaje medio ${f1(g.media)} fuera de ${f1(HOY.media * 0.95)} a ${f1(HOY.media * 1.05)} (CA-05)`);
      if (!dentro(g.p50, HOY.p50, 0.05)) falla(enorme, `p50 ${g.p50} fuera de ±5% de ${HOY.p50} (CA-05)`);
      if (!dentro(g.p90, HOY.p90, 0.05)) falla(enorme, `p90 ${g.p90} fuera de ±5% de ${HOY.p90} (CA-05)`);
    }
  }
  if (maxPuntaje > 960) errores.add(`puntaje máximo ${maxPuntaje} sobre 960 (80% del límite del servidor, CA-04)`);

  // ---- CA-06: tasas globales y por modo ----
  const az = MODES.map((m) => agg.azar[m]);
  const tasa = (a: Agg[], f: (x: Agg) => number) => pc(suma(a, f), suma(a, (x) => x.n));
  const media = (a: Agg[], f: (x: Agg) => number) => suma(a, f) / suma(a, (x) => x.n);
  console.log('Tasas (al azar): Mundial · jugó afuera · Selección mayor · cambió de Selección · ofertas por carrera · títulos · premios · dinero (M de Q) · edad de retiro · temporadas');
  const fila = (nombre: string, a: Agg[]) =>
    `  ${nombre.padEnd(8)} ${f1(tasa(a, (x) => x.mundial))}% · ${f1(tasa(a, (x) => x.afuera))}% · ${f1(tasa(a, (x) => x.seleccion))}% · ${f2(tasa(a, (x) => x.cambio))}% · ${f2(media(a, (x) => x.ofertas))} · ${f2(media(a, (x) => x.titulos))} · ${f2(media(a, (x) => x.premios))} · ${f1(media(a, (x) => x.dinero))} · ${f1(media(a, (x) => x.edadRetiro))} · ${f1(media(a, (x) => x.temporadas))}`;
  for (const m of MODES) console.log(fila(m, [agg.azar[m]]));
  console.log(fila('todos', az));
  console.log(`  hoy      ${HOY.mundial}% · ${HOY.afuera}% · ${HOY.seleccion}% · ${HOY.cambio}% · ${HOY.ofertas} · ${HOY.titulos} · ${HOY.premios} · 94.8 · 37.0 · 21.0`);
  const T = (x: number, ref: number, tol: number, nombre: string) => { if (Math.abs(x - ref) > tol) falla(enorme, `${nombre} ${f2(x)} fuera de ${ref} ±${tol} (CA-06)`); };
  T(tasa(az, (x) => x.mundial), HOY.mundial, 1.5, 'Mundial');
  T(tasa(az, (x) => x.afuera), HOY.afuera, 2, 'jugó afuera');
  T(tasa(az, (x) => x.seleccion), HOY.seleccion, 2.5, 'Selección mayor');
  T(tasa(az, (x) => x.cambio), HOY.cambio, 0.5, 'cambio de Selección');
  T(media(az, (x) => x.ofertas), HOY.ofertas, HOY.ofertas * 0.1, 'ofertas de traspaso por carrera');
  T(media(az, (x) => x.titulos), HOY.titulos, HOY.titulos * 0.1, 'títulos por carrera');
  T(media(az, (x) => x.premios), HOY.premios, HOY.premios * 0.1, 'premios por carrera');
  T(media(az, (x) => x.dinero), 94.8, 9.48, 'dinero medio');
  for (const [nombre, f] of [['Mundial', (x: Agg) => tasa([x], (y) => y.mundial)], ['jugó afuera', (x: Agg) => tasa([x], (y) => y.afuera)], ['ofertas', (x: Agg) => media([x], (y) => y.ofertas)]] as const) {
    const prom = (f(az[0]) + f(az[1]) + f(az[2])) / 3;
    MODES.forEach((m, k) => { if (!dentro(f(az[k]), prom, 0.1)) falla(enorme, `${m}: ${nombre} ${f2(f(az[k]))} fuera de ±10% del promedio ${f2(prom)} (CA-06)`); });
  }

  // ---- CA-07: rutas ----
  console.log('Rutas, al azar (% de carreras que ven el primer paso / el último / finalización); hoy: arranca / finalización:');
  for (const [nombre, , , arranca, fin] of RUTAS) {
    const cols = MODES.map((m) => {
      const [a, b] = agg.azar[m].ruta[nombre];
      const f = pc(b, a);
      if (a >= 30 && f < 0.9 * fin) falla(enorme, `${nombre}, ${m}: finalización ${f1(f)}% menor que el 90% de ${fin}% (CA-07)`);
      if (pc(a, agg.azar[m].n) > 2.5 * arranca) falla(enorme, `${nombre}, ${m}: arranca en ${f1(pc(a, agg.azar[m].n))}% de las carreras, más de 2,5 veces ${arranca}% (CA-07)`);
      return `${f1(pc(a, agg.azar[m].n))} / ${f1(pc(b, agg.azar[m].n))} / ${f1(f)}%`;
    });
    const total = suma(az, (x) => x.ruta[nombre][1]);
    if (!total) falla(grande, `${nombre}: ninguna carrera la completa (CA-07)`);
    console.log(`  ${nombre.padEnd(43)} ${cols.join(' | ')}   (hoy ${arranca} / ${fin}%)`);
  }

  // ---- CA-08: variedad y repertorio ----
  console.log('Variedad (al azar): decisiones cuya plantilla ya había salido en la carrera · salieron antes de su espaciado · espaciado relajado · ítems de historia saltados (por carrera)');
  for (const m of MODES) {
    const a = agg.azar[m];
    console.log(`  ${m.padEnd(7)} ${f1(pc(a.repetidas, a.coreTotal))}% · ${f2(pc(a.cercanas, a.coreTotal))}% · ${a.relajadas} · ${f2(a.saltadas / a.n)}`);
    if (pc(a.repetidas, a.coreTotal) > 50) errores.add(`${m}: ${f1(pc(a.repetidas, a.coreTotal))}% de decisiones repetidas (tope 50%, CA-08)`);
    if (pc(a.cercanas, a.coreTotal) > 0.5) falla(enorme, `${m}: ${f2(pc(a.cercanas, a.coreTotal))}% de decisiones antes de su espaciado (máximo 0,5%, CA-08)`);
    if (pc(a.repetidas, a.coreTotal) > 35) blandos.add(`pendiente de contenido (T6): ${m} repite ${f1(pc(a.repetidas, a.coreTotal))}% de las plantillas (meta 35%, CA-08)`);
  }

  // ---- CA-09, CA-10: efectos visibles y peso del minijuego ----
  const ritmoTot = suma(az, (x) => x.ritmo), mjTot = suma(az, (x) => x.minijuegos);
  const visR = pc(suma(az, (x) => x.ritmoVisible), ritmoTot), visM = pc(suma(az, (x) => x.mjVisible), mjTot);
  console.log(`Efectos visibles: decisiones de ritmo con algún cambio ${f1(visR)}% (mínimo 80%) · minijuegos ${f1(visM)}% (mínimo 40%)`);
  if (grande && visR < 80) errores.add(`decisiones de ritmo con cambio visible ${f1(visR)}% (mínimo 80%, CA-09)`);
  if (grande && visM < 40) errores.add(`minijuegos con cambio visible ${f1(visM)}% (mínimo 40%, CA-09)`);
  const aporte = suma(az, (x) => x.mjAporte) / suma(az, (x) => x.n);
  const subeTecho = mediaDe.techo - mediaDe.mejor;
  console.log(`Aporte de los minijuegos al puntaje (con "Simular"): ${f2(aporte)} por carrera (máximo 1) · techo contra mejor opción: ${f2(subeTecho)} (máximo 3)`);
  if (grande && aporte > 1) errores.add(`los minijuegos aportan ${f2(aporte)} puntos por carrera (máximo 1, CA-10)`);
  if (grande && subeTecho > 3) errores.add(`el techo sube ${f2(subeTecho)} puntos sobre mejor opción (máximo 3, CA-10)`);

  // ---- CA-12: proporción de categorías ----
  const cats: Record<string, number> = {};
  let core = 0;
  for (const a of az) for (const [k, v] of Object.entries(a.cats)) if (!['minijuego', 'retiro'].includes(k)) { cats[k] = (cats[k] ?? 0) + v; core += v; }
  core -= suma(az, (x) => x.ofertas); // la oferta de traspaso es de categoría contrato
  cats.contrato = (cats.contrato ?? 0) - suma(az, (x) => x.ofertas);
  console.log('Proporción de categorías (sin traspaso, retiro ni minijuego), al azar: ahora (hoy, diferencia en puntos):');
  console.log('  ' + Object.keys(HOY.categorias).map((k) => `${k} ${f1(pc(cats[k] ?? 0, core))}% (${HOY.categorias[k]}, ${pc(cats[k] ?? 0, core) - HOY.categorias[k] >= 0 ? '+' : ''}${f1(pc(cats[k] ?? 0, core) - HOY.categorias[k])})`).join(' · '));
  for (const [k, hoy] of Object.entries(HOY.categorias)) {
    const ahora = pc(cats[k] ?? 0, core);
    if (Math.abs(ahora - hoy) > 8) falla(enorme, `${k}: ${f1(ahora)}% cambió más de 8 puntos contra ${hoy}% (CA-12)`);
    if (CATEGORIAS_RITMO.includes(k) && Math.abs(ahora - hoy) > 4) falla(enorme, `${k} (de ritmo): ${f1(ahora)}% a más de 4 puntos de ${hoy}% (CA-12)`);
    if ((k === 'amor' || k === 'seleccion') && ahora < 0.4 * hoy) falla(enorme, `${k}: ${f1(ahora)}% bajó del 40% de su proporción de hoy (${f1(0.4 * hoy)}%, CA-12)`);
  }
  for (const m of MODES) {
    const a = agg.azar[m];
    const media = a.amor / a.n;
    console.log(`  amor ${m}: ${f2(media)} eventos por carrera (1,0 a 3,0) · máximo ${a.amorMax} (14) · ${f1(pc(a.amor, a.coreTotal))}% de las decisiones (15%)`);
    if (media < 1 || media > 3) falla(enorme, `amor ${m}: ${f2(media)} eventos por carrera fuera de 1,0 a 3,0 (CA-12)`);
    if (a.amorMax > 14) errores.add(`amor ${m}: una carrera con ${a.amorMax} eventos (máximo 14, CA-12)`);
    if (pc(a.amor, a.coreTotal) > 15) errores.add(`amor ${m}: ${f1(pc(a.amor, a.coreTotal))}% de las decisiones (máximo 15%, CA-12)`);
  }

  // ---- CA-13: límites del servidor ----
  const api = readFileSync(new URL('../api/ranking.ts', import.meta.url), 'utf8');
  const limite = Number(/isInt\(b\.score, -100, (\d+)\)/.exec(api)?.[1]);
  const maxCaps = Math.max(...POLITICAS.flatMap((p) => MODES.map((m) => agg[p][m].maxCaps)));
  const maxTitulos = Math.max(...POLITICAS.flatMap((p) => MODES.map((m) => agg[p][m].maxTitulos)));
  console.log(`Límites del servidor: puntaje máximo ${maxPuntaje} de ${limite} (margen ${f1(pc(limite - maxPuntaje, maxPuntaje))}%, mínimo 25%) · títulos ${maxTitulos} de 200 · partidos ${maxCaps} de 500`);
  if (limite < 1.25 * maxPuntaje) errores.add(`el límite ${limite} no deja 25% de margen sobre ${maxPuntaje} (CA-13)`);
  if (maxTitulos > 200 || maxCaps > 500) errores.add(`títulos ${maxTitulos} o partidos ${maxCaps} sobre los límites (CA-13)`);
  {
    const huella = (seed: number) => { const c = crear(seed, 'normal'); c.start(); let g = 0; while (!c.isOver && g++ < 5000) { if (!c.pendingEvent) c.advance(); else c.choose(Math.floor(c.rng() * c.pendingEvent.options.length)); } return JSON.stringify(c.player.seasons) + c.player.fame + c.player.rating; };
    for (const seed of [3, 41, 97]) if (huella(seed) !== huella(seed)) errores.add(`la semilla ${seed} no repite la carrera (CA-13)`);
  }

  // ---- CA-09: redondeo sin sesgo y neutralidad con escala 1 ----
  {
    const rng = createRng(99);
    const escalas = [AJUSTES.ESCALA / 3, AJUSTES.ESCALA / 2, AJUSTES.ESCALA_MJ];
    for (const s of escalas) {
      for (const v of [1, 2, 4, 6, 12, -3, -10]) {
        let tot = 0;
        for (let i = 0; i < 100000; i++) tot += escalar({ fame: v }, s, rng).fame!;
        const esperado = 100000 * v * s;
        if (Math.abs(tot - esperado) > 0.02 * Math.abs(esperado)) errores.add(`escalar(${v}, ${f2(s)}): promedio mostrado ${f2(tot / 100000)}, aplicado ${f2(v * s)} (CA-09)`);
      }
    }
    const a = createRng(5), b = createRng(5);
    const e: Effects = { rating: 2, fame: 5, flag: 'x' };
    if (escalar(e, 1, a) !== e || a() !== b()) errores.add('escalar con escala 1 devolvió otro objeto o gastó el generador (CA-09)');
    const out = escalar({ rating: 2, flag: 'x', transfer: 'up', retire: true, milestone: 'm' }, 0.5, createRng(1));
    if (out.flag !== 'x' || out.transfer !== 'up' || !out.retire || out.milestone !== 'm') errores.add('escalar tocó campos que no son números');
  }

  // ---- Auditoría de la clasificación ----
  const porClase: Record<string, string[]> = {};
  for (const [id, clase] of CLASES) (porClase[clase] ??= []).push(id);
  console.log(`Clasificación de plantillas vistas: ${Object.entries(porClase).map(([k, v]) => `${k} ${v.length}`).join(' · ')}`);
  for (const k of ['entrada', 'consecuencia', 'nac']) console.log(`  ${k}: ${(porClase[k] ?? []).sort().join(', ')}`);

  for (const m of blandos) console.log(`  (informa, no falla) ${m}`);
  return [...errores];
}

// Ejecución directa: npx tsx scripts/ritmo.ts [carreras por modo]
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const n = Number(process.argv[2] ?? 3000);
  const errores = medirRitmo(n);
  if (errores.length) {
    console.error(`Ritmo con errores (${errores.length}):\n  ${errores.join('\n  ')}`);
    process.exitCode = 1;
  } else console.log('Ritmo: sin errores.');
}
