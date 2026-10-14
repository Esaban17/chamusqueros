// Lógica pura del ping pong de futbolistas y del Reto completo. Sin DOM: se prueba con tsx (scripts/retos.test.ts).
import { NOMBRE_RE, normalizar } from '../../api/_retos.js';
import type { Indice, Pareja } from './comun';

export type Categoria = 'pais' | 'club' | 'preguntas';
/** Orden del Reto completo (RF-07). */
export const CATEGORIAS: readonly Categoria[] = ['pais', 'club', 'preguntas'];

/** Misma clave que usa el servidor: sin tildes ni mayúsculas ni signos. */
export const claveTexto = normalizar;
/** Espacios sobrantes fuera. */
export const limpiar = (s: string) => s.replace(/\s+/g, ' ').trim();

/** RF-05: vacío → "Jugador 1"/"Jugador 2"; hasta 20 caracteres; si quedan iguales, " (1)" y " (2)". */
export function sanearNombres(a: string, b: string): Pareja {
  const uno = (s: string, i: number) => [...limpiar(s)].slice(0, 20).join('').trim() || `Jugador ${i + 1}`;
  const [x, y] = [uno(a, 0), uno(b, 1)];
  return x.toLowerCase() === y.toLowerCase() ? [`${x} (1)`, `${y} (2)`] : [x, y];
}

/** RF-11: null si el texto se puede enviar; si no, el motivo en una frase (el reloj sigue corriendo). */
export function validarEntrada(texto: string): string | null {
  if (!texto) return 'Escribí el nombre de un futbolista.';
  if ([...texto].length > 40) return 'El nombre puede tener hasta 40 caracteres.';
  if (!NOMBRE_RE.test(texto) || (claveTexto(texto).match(/\p{L}/gu)?.length ?? 0) < 2) {
    return 'Usá solo letras, espacios, apóstrofo, guion o punto (mínimo 2 letras).';
  }
  return null;
}

export interface Jugada {
  jugador: Indice;
  texto: string;          // lo que escribió, ya limpio de espacios
  nombre: string;         // el nombre completo reconocido por la fuente (o el texto si no se verificó)
  qid: string | null;     // identidad del futbolista en la fuente; null si no se verificó
  sinVerificar: boolean;  // la fuente falló y lo aceptó el rival (RF-17)
  apelacion: boolean;     // la fuente dijo que no, pero el rival aceptó la apelación (RF-14)
}
export interface Partida { jugadas: Jugada[]; turno: Indice }

export const nuevaPartida = (empieza: Indice = 0): Partida => ({ jugadas: [], turno: empieza });

/** RF-16: repetido por identidad (mismo QID) o, sin ella, por el mismo texto normalizado (RF-17). */
export function evaluar(p: Partida, texto: string, qid: string | null): 'ok' | 'repetido' {
  const clave = claveTexto(texto);
  return p.jugadas.some((j) => (qid !== null && j.qid === qid) || claveTexto(j.texto) === clave) ? 'repetido' : 'ok';
}

/** Anota la jugada del jugador de turno y pasa el turno al rival. No modifica la partida recibida. */
export function aceptar(p: Partida, j: Omit<Jugada, 'jugador'>): Partida {
  return { jugadas: [...p.jugadas, { ...j, jugador: p.turno }], turno: p.turno === 0 ? 1 : 0 };
}

export const rival = (i: Indice): Indice => (i === 0 ? 1 : 0);
export const puntos = (p: Partida): [number, number] => [p.jugadas.filter((j) => j.jugador === 0).length, p.jugadas.filter((j) => j.jugador === 1).length];

/** Quién abre la categoría número `i` (0, 1, 2) del Reto completo: 0, 1, 0 (RF-07). */
export const abre = (i: number): Indice => (i % 2 === 0 ? 0 : 1);

/** RF-07: resultados de las categorías jugadas hasta ahora (índice del ganador o null si empató). */
export function marcadorCompleto(resultados: (Indice | null)[]): { victorias: [number, number]; terminado: boolean; ganador: Indice | null } {
  const victorias: [number, number] = [resultados.filter((r) => r === 0).length, resultados.filter((r) => r === 1).length];
  const terminado = victorias[0] >= 2 || victorias[1] >= 2 || resultados.length >= CATEGORIAS.length;
  const ganador = victorias[0] === victorias[1] ? null : victorias[0] > victorias[1] ? 0 : 1;
  return { victorias, terminado, ganador };
}
