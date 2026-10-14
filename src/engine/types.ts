import type { Club } from './clubs';
import type { Country } from './countries';

export type Position = 'POR' | 'DEF' | 'MED' | 'DEL';
export type Foot = 'Derecho' | 'Zurdo' | 'Ambidiestro';
export type Mode = 'intensa' | 'normal' | 'expres';

export const MODE_SEASONS: Record<Mode, number> = { intensa: 1, normal: 2, expres: 3 };

export const POSITION_NAMES: Record<Position, string> = {
  POR: 'Portero',
  DEF: 'Defensa',
  MED: 'Mediocampista',
  DEL: 'Delantero',
};

export interface Avatar {
  skin: number; // índice en SKIN_TONES
  hair: number; // índice en HAIR_STYLES
  hairColor: number; // índice en HAIR_COLORS
  beard: number; // índice en BEARD_STYLES
  extra: number; // índice en EXTRAS (cintillo, arete...)
}

export interface PlayerSetup {
  firstName: string;
  lastName: string;
  country: string; // código del país (nacionalidad); las carreras viejas no lo tienen y son de Guatemala
  dept: string; // departamento, estado o provincia de origen
  position: Position;
  foot: Foot;
  number: number;
  mode: Mode;
  avatar: Avatar;
}

export interface SeasonRecord {
  label: string; // "2026-27"
  age: number;
  clubId: string;
  tier: Tier;
  apps: number;
  goals: number;
  assists: number;
  rating: number;
  titles: string[];
  awards: SeasonAward[];
  cleanSheets?: number; // solo porteros: partidos sin recibir gol
  injured: boolean;
  note?: string; // por ejemplo, un cambio de club por falta de minutos
  /** Partidos con la Selección mayor en la temporada. debut: los primeros de su carrera. */
  nt?: { debut: boolean; matches: NtMatch[]; groups?: NtGroup[] };
  /** Salario de la temporada, en quetzales: el del contrato con el que se jugó. */
  salary: number;
}

/** Grupo de Guatemala en un torneo de la temporada, con la tabla final ya ordenada. */
export interface NtGroup {
  comp: string; // el mismo texto que NtMatch.comp
  note: string; // quiénes avanzan
  advance: number; // filas de arriba que avanzan
  table: NtGroupRow[];
  out?: string; // cierre del torneo con fase final: "Eliminado en cuartos de final", "Campeón"...
}

export interface NtGroupRow {
  team: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  ga: number;
  pts: number;
}

export type AwardKind = 'goleador' | 'asistidor' | 'portero' | 'joven' | 'mvp' | 'ideal';

export interface SeasonAward {
  kind: AwardKind;
  name: string; // "Goleador de Liga Nacional 2026-27", el mismo texto que va a Player.awards
}

export interface NtMatch {
  comp: string; // "Eliminatoria Mundial 2030", "Copa Oro 2027", "Amistoso"...
  rival: string;
  gf: number; // goles de la Selección del jugador
  ga: number;
  goals: number; // goles del jugador
  round?: string; // solo fase final: "Octavos de final"
  pen?: [number, number]; // penales (Selección, rival) si empató en fase final
}

/** División en el país del jugador (en Guatemala 1 = Liga Nacional, 2 = Primera, 3 = Segunda); 0 = extranjero */
export type Tier = 0 | 1 | 2 | 3;

/**
 * Nivel con la Selección mayor: 0 nunca convocado, 1 convocado ocasional, 2 fijo en la lista, 3 titular indiscutible.
 */
export type NtLevel = 0 | 1 | 2 | 3;

export interface Player {
  setup: PlayerSetup;
  age: number;
  year: number; // año en que arranca la temporada actual (Apertura)
  rating: number; // 35-97
  potential: number;
  morale: number; // 0-100
  fitness: number; // 0-100
  fame: number; // 0 en adelante
  coach: number; // relación con el técnico, 0-100 (afecta los minutos)
  clubId: string;
  injurySeasons: number;
  ntLevel: NtLevel;
  caps: number;
  natGoals: number;
  wcProgress: number; // avance en la eliminatoria del ciclo actual (0-3)
  seasons: SeasonRecord[];
  titles: string[];
  awards: string[];
  milestones: string[];
  flags: Record<string, number>;
  peakRating: number;
  retired: boolean;
  /** Contrato vigente con p.clubId. Siempre existe: lo firma el debut y cada cambio de club. */
  contract: Contract;
}

/** salary: quetzales por temporada. until: año de inicio de la última temporada cubierta (años que quedan = until - year + 1). */
export interface Contract {
  salary: number;
  until: number;
}

/** Contexto que el motor calcula antes de elegir una decisión. */
export interface EventContext {
  country: Country; // nacionalidad del jugador
  club: Club;
  tier: Tier;
  abroad: boolean;
  last?: SeasonRecord; // última temporada jugada
  /** true si la temporada actual cae en la eliminatoria rumbo a un Mundial (2028-29 para 2030, 2032-33 para 2034...) */
  qualifiers: boolean;
  /** Año del Mundial al que apunta la eliminatoria actual o la próxima */
  worldCupYear: number;
  /** Mejor club que podría ficharlo ahora (para textos de ofertas). Puede ser null. */
  suitor: Club | null;
}

export interface Effects {
  rating?: number;
  potential?: number;
  morale?: number;
  fitness?: number;
  fame?: number;
  coach?: number;
  injury?: number; // temporadas afectadas
  /**
   * up: club de mejor nivel (puede ser de una división superior) · down: club de menor nivel
   * tierUp: sube exactamente una división · abroad: primer destino en el extranjero
   * abroadUp: un destino mejor dentro del extranjero · home: vuelve a Guatemala, de preferencia a su departamento
   * any: un club de nivel parecido · suitor: el club de ctx.suitor
   */
  transfer?: 'up' | 'down' | 'tierUp' | 'abroad' | 'abroadUp' | 'home' | 'any' | 'suitor';
  transferTo?: string;
  retire?: boolean;
  flag?: string | string[]; // marca una o varias banderas (valor 1)
  unflag?: string | string[];
  position?: Position;
  milestone?: string; // se guarda con el año
  ntLevel?: NtLevel; // fija el nivel con la Selección mayor (si es mayor que el actual)
  caps?: number; // partidos extra con la Selección
  natGoals?: number;
  wcProgress?: number; // suma al avance de la eliminatoria
  /** Contrato que se firma con transferTo: el mismo que mostró la oferta. Sin él, el motor calcula uno al cambiar de club. */
  contract?: Contract;
}

export interface Outcome {
  p: number;
  text: string;
  effects: Effects;
}

export interface EventOption {
  label: string;
  outcomes: Outcome[];
}

export type EventCategory =
  | 'formacion'
  | 'vida'
  | 'cancha'
  | 'medios'
  | 'contrato'
  | 'seleccion'
  | 'extranjero'
  | 'divisiones'
  | 'amor'
  | 'retiro';

export interface GameEvent {
  id: string;
  category: EventCategory;
  title: string;
  text: string;
  options: EventOption[];
  /** Solo la oferta de traspaso: un club por opción (las primeras), con lo que se mostró. La última opción es quedarse. */
  offers?: { clubId: string; salary: number; years: number }[];
}

export interface EventTemplate {
  id: string;
  category: EventCategory;
  title: string | ((p: Player, ctx: EventContext) => string);
  text: (p: Player, ctx: EventContext) => string;
  when: (p: Player, ctx: EventContext) => boolean;
  /** Peso base 1. Puede depender del contexto: los eventos de una ruta activa deben pesar más (2-4). */
  weight?: number | ((p: Player, ctx: EventContext) => number);
  once?: boolean;
  /** Bloques mínimos antes de repetirse (por defecto 4). */
  cooldown?: number;
  options: (p: Player, ctx: EventContext) => EventOption[];
}

export interface Resolution {
  text: string;
  changes: string[]; // resumen corto, por ejemplo "+2 Nivel"
}
