// Lógica pura de "¿De dónde es?": puntos de una ronda, las 4 opciones, el sorteo del futbolista y el cierre de ronda con el desempate.
// Sin DOM, sin red, sin `Date.now()` ni `Math.random()` obligatorios: la comparten la pantalla local, el motor y el servidor. Se prueba con tsx
// (scripts/dedonde.test.ts). No importa el banco de futbolistas: lo carga solo quien lo necesita.
import type { Indice } from './online/protocolo';
import { SELECCIONES, plausiblesDe } from './selecciones';
import { barajar } from './trivia-puro';

// Valores de configuración (RF-18, RF-19). El pedido dijo "500 pts por ejemplo" y "10 a 15 s": son constantes, no reglas.
export const META = 500, PLAZO_MS = 12_000, BASE = 100, BONUS_MAX = 50, MAX_RONDAS = 25, EXTRAS_MAX = 3;

export interface Futbolista { q: string; nombre: string; sel: string }     // sel: clave de FLAG_CODE (nombre del país en español)
export interface Marcador { puntos: [number, number]; rondas: number; extras: number }
export type MotivoFin = 'meta' | 'tope_rondas' | 'empate_extras';
export type Azar = () => number;

export const marcadorInicial = (): Marcador => ({ puntos: [0, 0], rondas: 0, extras: 0 });

/** 0 si falló o no respondió (tardoMs null) o tardó más de PLAZO_MS; si no, BASE + floor(BONUS_MAX × (PLAZO_MS − tardoMs) / PLAZO_MS). */
export function puntosRonda(acerto: boolean, tardoMs: number | null): number {
  if (!acerto || tardoMs === null || !Number.isFinite(tardoMs) || tardoMs > PLAZO_MS) return 0;
  // Un reloj que se corrió hacia atrás no regala más del bonus máximo.
  const t = Math.max(0, tardoMs);
  return BASE + Math.floor((BONUS_MAX * (PLAZO_MS - t)) / PLAZO_MS);
}

/** 4 opciones barajadas: la selección correcta y 3 de su confederación (de las marcadas `plausible`), sin repetir. */
export function opcionesRonda(f: Futbolista, azar: Azar = Math.random): { opciones: string[]; correcta: number } {
  const s = SELECCIONES[f.sel];
  if (!s) throw new Error(`Selección desconocida: ${f.sel}`);
  let pool = plausiblesDe(s.confed).filter((k) => k !== f.sel);
  // ponytail: si una confederación se quedara con menos de 3 plausibles, se completa con las demás de la misma confederación (hoy no pasa: la prueba lo vigila).
  if (pool.length < 3) pool = Object.keys(SELECCIONES).filter((k) => SELECCIONES[k].confed === s.confed && k !== f.sel);
  if (pool.length < 3) throw new Error(`Faltan distractores para ${f.sel}`);
  const opciones = barajar([f.sel, ...barajar(pool, azar).slice(0, 3)], azar);
  return { opciones, correcta: opciones.indexOf(f.sel) };
}

/** Un futbolista del banco que no esté en `usados` (por `q`). */
export function elegirFutbolista(banco: readonly Futbolista[], usados: ReadonlySet<string>, azar: Azar = Math.random): Futbolista {
  const libres = banco.filter((f) => !usados.has(f.q));
  if (!libres.length) throw new Error('No quedan futbolistas sin usar');
  return libres[Math.floor(azar() * libres.length)];
}

/** Suma los puntos de la ronda y decide: seguir, o fin con ganador/empate (regla de RF-19). */
export function cerrarRonda(m: Marcador, ganado: readonly [number, number]): { marcador: Marcador; fin: null | { ganador: Indice | null; motivo: MotivoFin } } {
  const puntos: [number, number] = [m.puntos[0] + ganado[0], m.puntos[1] + ganado[1]];
  const rondas = m.rondas + 1;
  const terminable = puntos[0] >= META || puntos[1] >= META || rondas >= MAX_RONDAS;
  if (!terminable) return { marcador: { puntos, rondas, extras: m.extras }, fin: null };
  if (puntos[0] !== puntos[1]) {
    const motivo: MotivoFin = puntos[0] >= META || puntos[1] >= META ? 'meta' : 'tope_rondas';
    return { marcador: { puntos, rondas, extras: m.extras }, fin: { ganador: puntos[0] > puntos[1] ? 0 : 1, motivo } };
  }
  // Empatados al cerrar: rondas extra hasta EXTRAS_MAX; si la última también queda igual, empate.
  if (m.extras >= EXTRAS_MAX) return { marcador: { puntos, rondas, extras: m.extras }, fin: { ganador: null, motivo: 'empate_extras' } };
  return { marcador: { puntos, rondas, extras: m.extras + 1 }, fin: null };
}

/** La frase del motivo (la usan la pantalla local y, en línea, el servidor). */
export function frase(fin: { ganador: Indice | null; motivo: MotivoFin }, nombres: readonly [string, string], puntos: readonly [number, number]): string {
  if (fin.ganador === null) return `Empate a ${puntos[0]} puntos, incluso tras ${EXTRAS_MAX} rondas extra.`;
  const g = nombres[fin.ganador];
  const cuenta = fin.ganador === 0 ? `${puntos[0]} a ${puntos[1]}` : `${puntos[1]} a ${puntos[0]}`;   // siempre el ganador primero
  return fin.motivo === 'meta' ? `${g} gana ${cuenta}: se llegó a ${META} puntos.` : `Tras ${MAX_RONDAS} rondas nadie llegó a ${META}: gana ${g}, que tiene más puntos (${cuenta}).`;
}
