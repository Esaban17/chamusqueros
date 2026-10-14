// Atajos para escribir decisiones.
import type { Club } from './clubs';
import type { Effects, EventContext, EventOption, Outcome, Player } from './types';

export const o = (p: number, text: string, effects: Effects = {}): Outcome => ({ p, text, effects });
export const opt = (label: string, ...outcomes: Outcome[]): EventOption => ({ label, outcomes });

/** Nombre para mostrar: los clubes del extranjero se muestran por país o liga. */
export const clubLabel = (c: Club) => (c.abroad ? c.name : c.name);
export const has = (p: Player, flag: string) => (p.flags[flag] ?? 0) > 0;
export const always = () => true;
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "de" con contracción: de('el Tri') → "del Tri", de('la Roja') → "de la Roja". */
export const de = (s: string) => (s.startsWith('el ') ? `del ${s.slice(3)}` : `de ${s}`);
/** "a" con contracción: a('el Tri') → "al Tri". */
export const a = (s: string) => (s.startsWith('el ') ? `al ${s.slice(3)}` : `a ${s}`);

/** Rival de clásico o derbi del club actual, si lo tiene (está en los datos de cada equipo). */
export const rivalOf = (ctx: EventContext): string | null => ctx.club.rival ?? null;

/** Texto corto de la última temporada, por ejemplo "12 goles en 30 partidos". */
export function lastSeasonLine(p: Player, ctx: EventContext): string {
  const l = ctx.last;
  if (!l) return 'tu primera temporada';
  if (p.setup.position === 'POR') return `${l.apps} partidos`;
  return `${l.goals} goles en ${l.apps} partidos`;
}
