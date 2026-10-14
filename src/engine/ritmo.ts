// Ritmo por temporada (specs/ritmo-por-temporada): cuántas decisiones trae cada temporada, cómo se escalan sus efectos y qué
// decisiones de historia se suman. Puro: sin DOM y sin importar engine.ts (el motor le pasa lo que necesita).
import { chance, clamp, type Rng } from './rng';
import type { Effects, EventCategory, EventContext, EventTemplate, Mode, Player } from './types';

/** Decisiones de ritmo por temporada: intensa 3, normal alterna 3 y 2 (empieza en 3), exprés 2. */
export const DECISIONES: Record<Mode, readonly number[]> = { intensa: [3], normal: [3, 2], expres: [2] };
/** temporada: cuántas se jugaron ya (0 = la primera, a los 16 años). */
export const decisionesDe = (mode: Mode, temporada: number) => DECISIONES[mode][temporada % DECISIONES[mode].length];

/**
 * Perillas de calibración (T6). Un solo lugar a propósito: se mueven juntas y se miden con `npm run simulate`.
 * ponytail: valores de partida del prototipo, ajustados con las 12 plantillas de minijuego de hoy; hay que recalibrarlos
 * cuando entre el contenido nuevo (decisiones y situaciones de minijuego). `scripts/ritmo.ts` los puede sobrescribir (AJUSTES=json).
 */
export const AJUSTES = {
  /** Peso total de las decisiones de ritmo de una temporada: cada una pesa ESCALA / K (1/6 con 3, 1/4 con 2). */
  ESCALA: 0.5,
  /** Peso de los efectos de un minijuego (casi cosmético en el puntaje, RF-13). */
  ESCALA_MJ: 0.04,
  /** Probabilidad por temporada de que una categoría con un paso de ruta disponible lo traiga. */
  P_PASO: 1,
  /** Ídem para la entrada a una ruta (categorías de historia) y, aparte, para amor. */
  P_ENTRADA: 0.04,
  P_ENTRADA_AMOR: 0.11,
  /** Una decisión con consecuencias fuertes (Selección, traspaso, retiro) por temporada, como mucho. */
  P_CONSECUENCIA: 0.025,
  /** Multiplica el offerChance de la oferta de traspaso (que era por decisión y ahora es por temporada). */
  P_OFERTA: 0.6,
  /** Probabilidad por temporada de cada oferta de otro país disponible (ascendencia o naturalización). */
  P_NAC: 0.25,
  /** Multiplicadores por categoría sobre las decisiones de ritmo (lo que falta para acercar las proporciones, CA-12). */
  PESO_CATEGORIA: { cancha: 0.2, vida: 0.3, medios: 0.45, formacion: 0.8, amor: 0.05 } as Partial<Record<EventCategory, number>>,
};

/** Tope de decisiones de historia por temporada, sin contar traspaso ni retiro (RF-03). */
export const TOPE_HISTORIA = 3;

const ESCALABLES = ['rating', 'potential', 'morale', 'fitness', 'coach', 'fame', 'injury', 'caps', 'natGoals', 'wcProgress'] as const;

/**
 * Multiplica los efectos numéricos por s y redondea sin sesgo: 0,2 sale 1 de cada 5 veces (el promedio mostrado es el aplicado).
 * Con s === 1 devuelve el mismo objeto y no gasta el generador. Lo que no es un número (flag, transfer, retire...) pasa igual.
 */
export function escalar(e: Effects, s: number, rng: Rng): Effects {
  if (s === 1) return e;
  const out: Effects = { ...e };
  for (const k of ESCALABLES) {
    const v = e[k];
    if (!v) continue;
    const x = v * s;
    const base = Math.floor(x);
    out[k] = base + (rng() < x - base ? 1 : 0);
  }
  return out;
}

// ---------- Clases de plantilla ----------

/**
 * paso: el siguiente paso de una ruta ya abierta (peso numérico >= 3) · entrada: abre una ruta (fija una bandera en una categoría de historia)
 * nac: oferta de otro país · consecuencia: mueve la Selección, el club o el retiro · ritmo: todo lo demás.
 */
export type Clase = 'paso' | 'entrada' | 'nac' | 'consecuencia' | 'ritmo';
const ENTRADAS: EventCategory[] = ['seleccion', 'extranjero', 'amor', 'medios', 'divisiones'];
const CONSECUENTES = ['ntLevel', 'caps', 'natGoals', 'wcProgress', 'transfer', 'transferTo', 'retire', 'position'] as const;
const clases = new Map<string, Clase>();
/** Lo clasificado hasta ahora (solo lectura), para que `scripts/ritmo.ts` audite la clasificación. */
export const CLASES: ReadonlyMap<string, Clase> = clases;

/**
 * Clase de una plantilla, derivada de la propia plantilla (sin escribirla a mano en cada una) y memoizada por id.
 * Solo se llama con plantillas que ya pasaron `when`: sus `options` pueden suponer que el contexto aplica (p.herencia!, residencia!).
 * ponytail: la clasificación sale de la primera vez que se vio; `scripts/ritmo.ts` la imprime para auditarla.
 */
export function claseDe(t: EventTemplate, p: Player, ctx: EventContext): Clase {
  const hit = clases.get(t.id);
  if (hit) return hit;
  let c: Clase;
  if (typeof t.weight === 'number' && t.weight >= 3) c = 'paso';
  else {
    const fx = t.options(p, ctx).flatMap((o) => o.outcomes.map((x) => x.effects));
    if (fx.some((e) => e.natTeam)) c = 'nac';
    else if (ENTRADAS.includes(t.category) && fx.some((e) => e.flag !== undefined)) c = 'entrada';
    else if (fx.some((e) => CONSECUENTES.some((k) => e[k] !== undefined))) c = 'consecuencia';
    else c = 'ritmo';
  }
  clases.set(t.id, c);
  return c;
}

// ---------- Agenda de la temporada ----------

export type Item =
  | { k: 'retiro' | 'oferta' | 'consecuencia' | 'ritmo' }
  | { k: 'paso' | 'entrada'; cat: EventCategory }
  | { k: 'nac'; id: string };

export interface EntradaAgenda {
  /** Decisiones de ritmo de la temporada (decisionesDe). */
  ritmo: number;
  /** Lo que hay disponible hoy (pasó available y when). */
  pool: { id: string; category: EventCategory; clase: Clase }[];
  /** Probabilidad de la oferta de retiro (0 si no toca) y la de traspaso de hoy, sin las perillas (0 si no hay quién ofrezca). */
  pRetiro: number;
  pOferta: number;
}

/**
 * Sortea las decisiones de la temporada, en este orden: retiro, traspaso, un paso por categoría, una entrada por categoría, una
 * consecuencia y las ofertas de otro país; recorta la historia al tope y suma las de ritmo. Retiro y traspaso van primero y el resto mezclado.
 * No saca ninguna plantilla: cada ítem se resuelve al momento de mostrarlo, con el estado de entonces (el motor).
 */
export function armarAgenda(rng: Rng, a: EntradaAgenda): Item[] {
  const A = AJUSTES;
  const primeros: Item[] = [];
  if (chance(rng, a.pRetiro)) primeros.push({ k: 'retiro' });
  // Una ruta en curso baja la oferta de traspaso, como antes (x0,3).
  const hayPaso = a.pool.some((x) => x.clase === 'paso');
  if (chance(rng, a.pOferta * (hayPaso ? 0.3 : 1) * A.P_OFERTA)) primeros.push({ k: 'oferta' });

  const cats = (clase: Clase) => [...new Set(a.pool.filter((x) => x.clase === clase).map((x) => x.category))];
  const pasos: Item[] = cats('paso').filter(() => chance(rng, A.P_PASO)).map((cat) => ({ k: 'paso', cat }));
  const entradas: Item[] = cats('entrada')
    .filter((cat) => chance(rng, cat === 'amor' ? A.P_ENTRADA_AMOR : A.P_ENTRADA))
    .map((cat) => ({ k: 'entrada', cat }));
  const consecuencias: Item[] = a.pool.some((x) => x.clase === 'consecuencia') && chance(rng, A.P_CONSECUENCIA) ? [{ k: 'consecuencia' }] : [];
  const nacs: Item[] = a.pool.filter((x) => x.clase === 'nac').filter(() => chance(rng, A.P_NAC)).map((x) => ({ k: 'nac', id: x.id }));

  // Tope: primero se quitan las entradas, luego las consecuencias, las ofertas de otro país y, al final, los pasos.
  const historia = [pasos, nacs, consecuencias, entradas]; // ponytail: de los pasos se quita el último de la lista, sin mirar la ventana de cada ruta
  let sobran = historia.reduce((n, l) => n + l.length, 0) - TOPE_HISTORIA;
  for (const l of [...historia].reverse()) while (sobran > 0 && l.length) (l.pop(), sobran--);

  const resto: Item[] = [...pasos, ...entradas, ...consecuencias, ...nacs, ...Array.from({ length: a.ritmo }, (): Item => ({ k: 'ritmo' }))];
  for (let i = resto.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [resto[i], resto[j]] = [resto[j], resto[i]];
  }
  return [...primeros, ...resto];
}

/** Probabilidad de ofrecer el retiro: a los 33 años 0,16 y sube 0,16 por año hasta 0,8 (la misma de siempre, ahora por temporada). */
export const pRetiroDe = (age: number) => (age >= 33 ? clamp((age - 32) * 0.16, 0, 0.8) : 0);
