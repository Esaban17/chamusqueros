// Retos Fútbol, categoría "Preguntas": la lógica pura (sin DOM ni banco). La comparten trivia.ts (la pantalla local),
// el motor del servidor y los pintores en línea. Nunca importa preguntas.json: así quien la use no arrastra el banco.
import type { Indice, ResultadoReto } from './comun';

export type Dificultad = 1 | 2 | 3;
export interface PreguntaBanco { id: string; tema: string; dificultad: Dificultad; pregunta: string; opciones: string[]; correcta: number; fuente: string; verificado: string; origen: string }
/** Una pregunta ya preparada para jugar: opciones barajadas y `correcta` recalculada. */
export interface PreguntaJuego { id: string; dificultad: Dificultad; pregunta: string; opciones: string[]; correcta: number }
export type Azar = () => number;

/** Dificultad de cada una de las 5 preguntas de un jugador (RF-19). */
export const DIFICULTADES: readonly Dificultad[] = [1, 1, 2, 2, 3];
export const TIEMPO_MS = 20000;
export const MAX_RONDAS = 3;
/** Segundos restantes en los que el reloj se anuncia a lectores de pantalla; 0 es "se acabó el tiempo" (RF-26). */
export const UMBRALES = [10, 5, 0] as const;

/** Fisher-Yates sobre una copia. */
export function barajar<T>(a: readonly T[], azar: Azar = Math.random): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function preparar(p: PreguntaBanco, azar: Azar): PreguntaJuego {
  const orden = barajar(p.opciones.map((texto, i) => ({ texto, ok: i === p.correcta })), azar);
  return { id: p.id, dificultad: p.dificultad, pregunta: p.pregunta, opciones: orden.map((o) => o.texto), correcta: orden.findIndex((o) => o.ok) };
}

/** 5 preguntas para cada jugador con las dificultades 1, 1, 2, 2, 3. En cada puesto, los dos jugadores reciben preguntas distintas de la misma dificultad; ninguna se repite en la partida. */
export function repartir(preguntas: readonly PreguntaBanco[], azar: Azar = Math.random): [PreguntaJuego[], PreguntaJuego[]] {
  const usadas = new Set<string>();
  const a: PreguntaJuego[] = [];
  const b: PreguntaJuego[] = [];
  for (const d of DIFICULTADES) {
    const [p1, p2] = barajar(preguntas.filter((p) => p.dificultad === d && !usadas.has(p.id)), azar);
    if (!p2) throw new Error(`Faltan preguntas de dificultad ${d}`);
    usadas.add(p1.id);
    usadas.add(p2.id);
    a.push(preparar(p1, azar));
    b.push(preparar(p2, azar));
  }
  return [a, b];
}

/** Gana quien acierta más; null si hay empate. */
export const ganador = (puntos: readonly [number, number]): Indice | null => (puntos[0] > puntos[1] ? 0 : puntos[1] > puntos[0] ? 1 : null);

/** Una ronda de muerte súbita: dos preguntas nuevas de dificultad media (una para cada jugador). Si ya no quedan medias, completa con las demás. */
export function muerteSubita(preguntas: readonly PreguntaBanco[], usadas: ReadonlySet<string>, azar: Azar = Math.random): [PreguntaJuego, PreguntaJuego] {
  const libres = preguntas.filter((p) => !usadas.has(p.id));
  const [p1, p2] = [...barajar(libres.filter((p) => p.dificultad === 2), azar), ...barajar(libres.filter((p) => p.dificultad !== 2), azar)];
  if (!p2) throw new Error('No quedan preguntas para la muerte súbita');
  return [preparar(p1, azar), preparar(p2, azar)];
}

/** Resultado del duelo: `rondas` son las de muerte súbita ya jugadas (si acertó el jugador 0 y si acertó el 1). Gana quien acierta y el otro no; tras MAX_RONDAS iguales, empate. */
export function resultadoDuelo(puntos: readonly [number, number], rondas: readonly (readonly [boolean, boolean])[]): { ganador: Indice | null; terminado: boolean } {
  const g = ganador(puntos);
  if (g !== null) return { ganador: g, terminado: true };
  for (const [a, b] of rondas) if (a !== b) return { ganador: a ? 0 : 1, terminado: true };
  return { ganador: null, terminado: rondas.length >= MAX_RONDAS };
}

/** Anuncios del reloj que ya corresponden con ese tiempo restante y todavía no se hicieron (con la pestaña en segundo plano puede haber varios a la vez). */
export function anunciosPendientes(restanteMs: number, hechos: ReadonlySet<number>): number[] {
  return UMBRALES.filter((t) => restanteMs <= t * 1000 && !hechos.has(t));
}

/** Ciclo de vida de la partida: `onFin` se llama una sola vez, nunca después de cancelar, y cancelar es idempotente. */
export function crearControl(onFin: (r: ResultadoReto) => void) {
  let activo = true;
  const limpiezas: (() => void)[] = [];
  const limpiar = () => { while (limpiezas.length) limpiezas.pop()!(); };
  return {
    get activo() { return activo; },
    alLimpiar(f: () => void) { limpiezas.push(f); },
    terminar(r: ResultadoReto): boolean {
      if (!activo) return false;
      activo = false;
      limpiar();
      onFin(r);
      return true;
    },
    cancelar() {
      if (!activo) return;
      activo = false;
      limpiar();
    },
  };
}
