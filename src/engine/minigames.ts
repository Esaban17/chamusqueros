// Reglas puras de los minijuegos que decide el motor: dificultad, resultado y el sorteo de "Simular". Sin DOM.
import { clamp, type Rng } from './rng';
import type { MinigameResult } from './types';

/** 0,7 o más es éxito; de 0,35 a menos de 0,7, a medias; menos de 0,35, fallo. */
export const OK_AT = 0.7;
export const HALF_AT = 0.35;

/** Baja con el nivel del jugador y sube con la importancia (1 a 3); siempre entre 0,1 y 0,9. */
export const difficultyFor = (rating: number, importance: number) => clamp(0.5 + 0.15 * (importance - 2) - 0.01 * (rating - 65), 0.1, 0.9);

/** Un resultado que no es número finito cuenta como 0 y uno fuera de rango se recorta (viene del cliente). */
export function resultOf(score: number): MinigameResult {
  const s = Number.isFinite(score) ? clamp(score, 0, 1) : 0;
  return s >= OK_AT ? 'ok' : s >= HALF_AT ? 'half' : 'fail';
}

/**
 * Jugador promedio ("Simular"): con 0,5 sale 40 % éxito, 35 % a medias, 25 % fallo; con 0,1, 60/35/5; con 0,9, 20/35/45.
 * Sortea el resultado y después un valor uniforme dentro de su tramo, para que resultOf(simulatedScore) lo devuelva igual.
 */
export function simulatedScore(rng: Rng, difficulty: number): number {
  const ok = 0.4 - 0.5 * (difficulty - 0.5);
  const fail = 0.25 + 0.5 * (difficulty - 0.5);
  const r = rng();
  const u = rng();
  if (r < ok) return OK_AT + u * (1 - OK_AT);
  if (r < 1 - fail) return HALF_AT + u * (OK_AT - HALF_AT - 1e-9);
  return u * (HALF_AT - 1e-9);
}
