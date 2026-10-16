// Reto del día, lógica pura (specs/reto-del-dia): fecha de Guatemala, qué reto toca, opciones deterministas y el registro de la racha.
// Sin DOM, sin almacenamiento, sin leer el reloj ni el azar del sistema: todo entra por parámetro, así se prueba con tsx (scripts/reto-del-dia.test.ts).
import { opcionesRonda, type Futbolista } from '../dedonde';
import { barajar, type Azar, type PreguntaBanco, type PreguntaJuego } from '../trivia-puro';

const DIA_MS = 86_400_000;
export const MAX_TEXTO = 4096;   // RF-14: tope del texto guardado
const HIST = 7;                  // RF-12: días de historial

// ---------- Fecha de Guatemala (RF-03) ----------

/** Días enteros desde 1970-01-01 en hora de Guatemala (UTC−6 fijo): cambia a las 06:00 UTC. */
export const diaGT = (ms: number): number => Math.floor((ms - 6 * 3_600_000) / DIA_MS);

/** `AAAA-MM-DD` de un número de día. */
export const fechaDe = (dia: number): string => new Date(dia * DIA_MS).toISOString().slice(0, 10);

/** Número de día de un `AAAA-MM-DD`, o null si no es una fecha real (rechaza `2026-02-30`). */
export function diaDe(fecha: unknown): number | null {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const [a, m, d] = fecha.split('-').map(Number);
  const ms = Date.UTC(a, m - 1, d);
  if (!Number.isFinite(ms)) return null;
  const dia = ms / DIA_MS;
  return Number.isInteger(dia) && fechaDe(dia) === fecha ? dia : null;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** "15 de octubre" o, con `anio`, "15 de octubre de 2026" (RF-02). Sin `Intl`. */
export function fechaTexto(dia: number, anio = false): string {
  const [a, m, d] = fechaDe(dia).split('-').map(Number);
  return `${d} de ${MESES[m - 1]}${anio ? ` de ${a}` : ''}`;
}

// ---------- Qué reto toca (RF-04, RF-05) ----------

export type Tipo = 'pregunta' | 'futbolista';
export const tipoDe = (dia: number): Tipo => (dia % 2 === 0 ? 'pregunta' : 'futbolista');

/** Generador pseudoaleatorio sembrado (mulberry32): la misma semilla da la misma secuencia en cualquier dispositivo. */
export function mulberry32(semilla: number): Azar {
  let a = semilla | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Semillas fijas del orden de cada banco. Cambiarlas reordena todos los días: no se tocan una vez publicado.
const SEMILLA: Record<Tipo, number> = { pregunta: 0x5eed0001, futbolista: 0x5eed0002 };

/** Índice del banco (de tamaño `n`, el del tipo de ese día) que toca ese día: cada uno sale una vez antes de que se repita cualquiera. */
export function indiceDe(dia: number, n: number): number {
  const orden = barajar(Array.from({ length: n }, (_, i) => i), mulberry32(SEMILLA[tipoDe(dia)]));
  return orden[Math.floor(dia / 2) % n];
}

/** La pregunta con las opciones en el orden fijo de ese día (y `correcta` recalculada). */
export function preguntaDelDia(p: PreguntaBanco, dia: number): PreguntaJuego {
  const orden = barajar(p.opciones.map((texto, i) => ({ texto, ok: i === p.correcta })), mulberry32(dia));
  return { id: p.id, dificultad: p.dificultad, pregunta: p.pregunta, opciones: orden.map((o) => o.texto), correcta: orden.findIndex((o) => o.ok) };
}

/** Las 4 selecciones del futbolista en el orden fijo de ese día. */
export const opcionesDelDia = (f: Futbolista, dia: number) => opcionesRonda(f, mulberry32(dia));

// ---------- Registro, validación y racha (RF-10 a RF-16) ----------

export interface Entrada { f: string; ok: 0 | 1 }
export interface Registro { v: 1; racha: number; mejor: number; jugados: number; aciertos: number; hist: Entrada[] }

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const entero = (x: unknown, tope: number): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= tope;

/** Todo o nada (RF-14): devuelve un objeto NUEVO con campos ya comprobados, o null. Nunca devuelve `raw` ni copia claves de más. */
export function validar(raw: unknown, hoy: number): Registro | null {
  if (!esObjeto(raw) || raw.v !== 1) return null;
  const { racha, mejor, jugados, aciertos, hist } = raw;
  if (!entero(racha, hoy) || !entero(mejor, hoy) || !entero(jugados, hoy) || !entero(aciertos, hoy)) return null;
  if (mejor < racha || jugados < aciertos || jugados < mejor) return null;
  if (!Array.isArray(hist) || hist.length > HIST || hist.length !== Math.min(jugados, HIST)) return null;
  const copia: Entrada[] = [];
  let previo = -Infinity;
  let serie = 0;   // largo de la serie de días consecutivos que termina en la última entrada
  for (const e of hist) {
    if (!esObjeto(e) || (e.ok !== 0 && e.ok !== 1)) return null;
    const d = diaDe(e.f);
    if (d === null || d > hoy || d <= previo) return null;
    serie = d === previo + 1 ? serie + 1 : 1;
    previo = d;
    copia.push({ f: e.f as string, ok: e.ok });
  }
  if (serie < copia.length ? racha !== serie : racha < serie) return null;
  return { v: 1, racha, mejor, jugados, aciertos, hist: copia };
}

/** Texto guardado → registro válido o null (tope de tamaño, JSON y `validar`). No lanza nunca. */
export function desdeTexto(texto: string | null, hoy: number): Registro | null {
  if (typeof texto !== 'string' || texto.length === 0 || texto.length > MAX_TEXTO) return null;
  try { return validar(JSON.parse(texto), hoy); } catch { return null; }
}

/** Día de la última jugada, o -Infinity si no hay (el registro ya viene validado). */
const ultimo = (reg: Registro | null): number => (reg && reg.hist.length ? (diaDe(reg.hist[reg.hist.length - 1].f) as number) : -Infinity);

/** Suma una jugada (RF-10). Una fecha igual o anterior a la última (pestaña doble, pestaña vieja) no cambia nada (RF-16). */
export function registrar(reg: Registro | null, dia: number, acierto: boolean): Registro {
  const ult = ultimo(reg);
  if (reg && dia <= ult) return reg;
  const racha = reg && dia === ult + 1 ? reg.racha + 1 : 1;
  return {
    v: 1, racha, mejor: Math.max(reg?.mejor ?? 0, racha), jugados: (reg?.jugados ?? 0) + 1, aciertos: (reg?.aciertos ?? 0) + (acierto ? 1 : 0),
    hist: [...(reg?.hist ?? []), { f: fechaDe(dia), ok: acierto ? 1 : 0 } as Entrada].slice(-HIST),
  };
}

/** La racha que se muestra (RF-11): la guardada si la última jugada fue hoy o ayer; 0 si pasó más. */
export const rachaVigente = (reg: Registro | null, hoy: number): number => (reg && ultimo(reg) >= hoy - 1 ? reg.racha : 0);

/** A cuánto llegaría la racha jugando hoy cuando la última jugada fue ayer; null en cualquier otro caso (RF-11). */
export const llegariaA = (reg: Registro | null, hoy: number): number | null => (reg && ultimo(reg) === hoy - 1 ? reg.racha + 1 : null);

/** Hoy y los 6 días anteriores, del más viejo al de hoy (RF-12). */
export function ultimos7(reg: Registro | null, hoy: number): { dia: number; estado: 'ok' | 'mal' | 'nada' }[] {
  return Array.from({ length: HIST }, (_, i) => {
    const dia = hoy - (HIST - 1) + i;
    const e = reg?.hist.find((x) => x.f === fechaDe(dia));
    return { dia, estado: e ? (e.ok ? 'ok' : 'mal') : 'nada' };
  });
}

/** El resultado de la jugada de esa fecha, o null si no se jugó (RF-08). */
export function yaJugado(reg: Registro | null, dia: number): { ok: boolean } | null {
  const e = reg?.hist.find((x) => x.f === fechaDe(dia));
  return e ? { ok: e.ok === 1 } : null;
}

// ---------- Textos (siempre con símbolo y palabra: nada se dice solo con color, RF-12) ----------
export const textoRacha = (n: number): string => `${n} ${n === 1 ? 'día' : 'días'}`;
export const textoEstado = (e: 'ok' | 'mal' | 'nada'): string => (e === 'ok' ? '✓ acertó' : e === 'mal' ? '✗ falló' : '– no jugó');
