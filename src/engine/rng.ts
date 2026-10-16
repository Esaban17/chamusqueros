// Generador pseudoaleatorio con semilla (mulberry32), para poder repetir carreras y simular.
export type Rng = () => number;
/** Un Rng que también dice en qué punto va: createRng(rng.estado()) continúa exactamente la misma secuencia (carrera guardada). */
export type RngConEstado = Rng & { estado(): number };

export function createRng(seed: number): RngConEstado {
  let a = seed >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Object.assign(rng, { estado: () => a });
}

export const randInt = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
export const randRange = (rng: Rng, min: number, max: number) => min + rng() * (max - min);
export const chance = (rng: Rng, p: number) => rng() < p;
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Goles de un equipo en un partido (distribución de Poisson), con tope de 9. */
export function poisson(rng: Rng, mean: number): number {
  let k = 0;
  let term = Math.exp(-mean);
  let sum = term;
  const u = rng();
  while (u > sum && k < 9) {
    k++;
    term *= mean / k;
    sum += term;
  }
  return k;
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function weightedPick<T>(rng: Rng, items: readonly T[], weight: (item: T) => number): T {
  const total = items.reduce((sum, it) => sum + Math.max(0, weight(it)), 0);
  let r = rng() * total;
  for (const it of items) {
    r -= Math.max(0, weight(it));
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}
