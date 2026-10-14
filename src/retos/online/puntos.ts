// Puntos de ranking de Retos en línea (RF-23, RF-24). Pura: sin DOM, red ni reloj; la usa solo el servidor (api/sala.ts) al cerrar una partida.
// Los pesos son constantes de este archivo (Aclaración 6 de specs/retos-en-linea/spec.md).
import type { Categoria, MotivoSinPuntos } from './protocolo';

export const RES = { V: 100, E: 30, D: 10 } as const;
export const POR_ACIERTO = { ping: 5, preguntas: 5 } as const;
export const TOPE = { ping: 50, preguntas: 50, dedonde: 60 } as const;
/** Futbolistas aceptados en total (ping pong), preguntas cerradas, rondas cerradas: con menos, la partida no suma a nadie. */
export const MIN = { ping: 4, preguntas: 3, dedonde: 3 } as const;
/** Por partidas previas válidas contra el mismo rival en 24 h: 1.ª 100 %, 2.ª 50 %, 3.ª 25 %, desde la 4.ª 0 %. */
export const FACTOR = [1, 0.5, 0.25, 0] as const;
export const TOPE_DIARIO = 600;
/** Ventana de "el mismo rival" y del tope diario. */
export const VENTANA_MS = 24 * 3600_000;

export type TipoJuego = 'ping' | 'preguntas' | 'dedonde';
export const tipoJuego = (c: Categoria): TipoJuego => (c === 'pais' || c === 'club' ? 'ping' : c);
/** Lo jugado en la partida por tipo; null = ese tipo no se jugó (en el Reto completo no hay ¿De dónde es?). */
export type Jugadas = Record<TipoJuego, number | null>;

/** Rendimiento propio de UNA categoría con su tope: ping pong y preguntas, 5 por acierto (tope 50); ¿De dónde es?, floor(puntos / 10) (tope 60). */
export function rendimientoCategoria(c: Categoria, valor: number): number {
  const t = tipoJuego(c);
  const bruto = t === 'dedonde' ? Math.floor(valor / 10) : valor * POR_ACIERTO[t];
  return Math.max(0, Math.min(bruto, TOPE[t]));
}

/** El ping pong cuenta los futbolistas de todas sus categorías juntas ("en total"); cada tipo jugado debe llegar a su mínimo. */
export const cumpleMinimo = (j: Jugadas): boolean =>
  (Object.keys(MIN) as TipoJuego[]).every((t) => j[t] === null || j[t]! >= MIN[t]);

export interface EntradaPuntos {
  resultado: 'V' | 'E' | 'D' | 'A';   // A: este jugador abandonó
  rendimiento: number;                // suma de rendimientoCategoria de lo jugado, ya con sus topes
  cumpleMinimo: boolean;
  previasRival24h: number;            // partidas válidas anteriores contra el mismo rival en las últimas 24 h
  sumado24h: number;                  // puntos de ranking que este jugador ya sumó en las últimas 24 h
}

export function puntosRanking(e: EntradaPuntos): { puntos: number; sinPuntos: MotivoSinPuntos | null } {
  if (!e.cumpleMinimo) return { puntos: 0, sinPuntos: 'corta' };
  if (e.resultado === 'A') return { puntos: 0, sinPuntos: null };
  const factor = FACTOR[Math.min(Math.max(0, e.previasRival24h), FACTOR.length - 1)];
  const bruto = Math.floor((RES[e.resultado] + e.rendimiento) * factor);
  if (bruto <= 0) return { puntos: 0, sinPuntos: 'repetida' };
  const puntos = Math.min(bruto, Math.max(0, TOPE_DIARIO - e.sumado24h));
  return puntos > 0 ? { puntos, sinPuntos: null } : { puntos: 0, sinPuntos: 'tope' };
}
