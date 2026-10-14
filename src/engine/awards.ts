// Premios individuales con nombre propio (specs/trofeos-reales): el goleador según la liga y la Bota de Oro, el Golden Boy y el Balón de Oro.
// Funciones puras, sin DOM ni azar: la misma semilla da las mismas temporadas. engine.ts las consulta; la interfaz no las necesita.
import { countryOf } from './countries';
import type { Tier } from './types';

/** Nombre del premio de goleador en la primera división de cada país (RF-01). El resto de ligas conserva "Goleador de <liga>". */
export const SCORER_NAME: Record<string, string> = {
  ES: 'Pichichi',
  IT: 'Capocannoniere',
  EN: 'Bota de Oro de la Premier League',
  DE: 'Torjägerkanone',
  FR: 'Máximo goleador de la Ligue 1',
};
/** Solo en primera división: en las de ascenso es "Goleador de <liga>". */
export const scorerName = (country: string, ownTier: Tier): string | undefined => (ownTier === 1 ? SCORER_NAME[country] : undefined);

/** Los tres premios nuevos y su nombre. Viven aquí (y no en ui/) porque el motor los escribe en el registro. */
export const AWARD_LABEL_ES = { balon: 'Balón de Oro', bota: 'Bota de Oro', golden: 'Golden Boy' } as const;
export type MajorAward = keyof typeof AWARD_LABEL_ES;

/** Umbrales (RF-02 a RF-04) y topes por carrera, en un solo lugar para calibrarlos con `npm run simulate`. */
export const UMBRAL = {
  /** Bota: goles ponderados >= tasa x partidos. */
  bota: { tasa: 1.1, grandes: 2, otras: 1.5, tope: 3 },
  /** Golden Boy: edad máxima, mitad de los partidos, nivel mínimo; una vez por carrera. */
  golden: { edad: 21, titular: 0.5, nivel: 70 },
  /** Balón: nivel, partidos, goles de una gran temporada, fama y nivel de liga mínimos; hasta 5 por carrera. */
  balon: { nivel: 84, titular: 0.7, goles: 15, fama: 60, liga: 14, tope: 5 },
};
/** Las cinco grandes ligas europeas: sus goles valen el doble para la Bota de Oro. */
export const GRANDES = ['ES', 'EN', 'IT', 'DE', 'FR'];

export interface SeasonFacts {
  rating: number; // Math.round(p.rating): el mismo que guarda el registro
  age: number;
  fame: number; // la fama al empezar la temporada (antes de cerrarla)
  apps: number;
  goals: number;
  matches: number; // partidos posibles de la vista del jugador (36 afuera, 44 en casa)
  clubTitles: number; // títulos de club de la temporada (los de Selección se suman después)
  own: { country: string; tier: Tier }; // el club REAL: su país y su división en su propia liga
  held: { balon: number; bota: number; golden: boolean }; // lo ya ganado en la carrera
}

/** Qué premios nuevos gana esta temporada, en el orden del palmarés (balón, bota, golden). */
export function majorAwards(f: SeasonFacts): MajorAward[] {
  if (f.own.tier !== 1) return [];
  const { conf, level } = countryOf(f.own.country);
  const won: MajorAward[] = [];
  const u = UMBRAL;
  if (level >= u.balon.liga && f.rating >= u.balon.nivel && f.apps >= u.balon.titular * f.matches && (f.goals >= u.balon.goles || f.clubTitles >= 1) && f.fame >= u.balon.fama && f.held.balon < u.balon.tope) won.push('balon');
  if (conf === 'UEFA') {
    const peso = GRANDES.includes(f.own.country) ? u.bota.grandes : u.bota.otras;
    if (f.goals * peso >= u.bota.tasa * f.matches && f.held.bota < u.bota.tope) won.push('bota');
    if (f.age <= u.golden.edad && f.apps >= u.golden.titular * f.matches && f.rating >= u.golden.nivel && !f.held.golden) won.push('golden');
  }
  return won;
}
