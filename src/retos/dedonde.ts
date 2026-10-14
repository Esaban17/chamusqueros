// Stub de T0 (bloque D): solo las firmas y las constantes de "¿De dónde es?". Gana el archivo del bloque C (plan, "Regla de merge").
import type { Indice } from './comun';

export const META = 500, PLAZO_MS = 12_000, BASE = 100, BONUS_MAX = 50, MAX_RONDAS = 25, EXTRAS_MAX = 3;
export interface Futbolista { q: string; nombre: string; sel: string }     // sel: clave de FLAG_CODE (nombre del país en español)
export interface Marcador { puntos: [number, number]; rondas: number; extras: number }
const pendiente = (): never => { throw new Error('pendiente: bloque C'); };
/** 0 si falló o no respondió (tardoMs null) o tardó más de PLAZO_MS; si no, BASE + floor(BONUS_MAX × (PLAZO_MS − tardoMs) / PLAZO_MS). */
export function puntosRonda(_acerto: boolean, _tardoMs: number | null): number { return pendiente(); }
/** 4 opciones barajadas: la selección correcta y 3 de su confederación (de las marcadas `plausible`), sin repetir. */
export function opcionesRonda(_f: Futbolista, _azar: () => number): { opciones: string[]; correcta: number } { return pendiente(); }
/** Un futbolista del banco que no esté en `usados` (por `q`). */
export function elegirFutbolista(_banco: readonly Futbolista[], _usados: ReadonlySet<string>, _azar: () => number): Futbolista { return pendiente(); }
/** Suma los puntos de la ronda y decide: seguir, o fin con ganador/empate (regla de RF-19). */
export function cerrarRonda(_m: Marcador, _ganado: readonly [number, number]): { marcador: Marcador; fin: null | { ganador: Indice | null; motivo: 'meta' | 'tope_rondas' | 'empate_extras' } } { return pendiente(); }
