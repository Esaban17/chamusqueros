import { HOME_CLUBS_BY_DEPT, clubById, clubsOf, viewClub, ALL_CLUBS, type Club } from './clubs';
import { CONFED_CUP, countryOf, type Confed, type Country } from './countries';
import { ALL_EVENTS } from './events';
import { chance, clamp, createRng, pick, poisson, randInt, randRange, weightedPick, type Rng } from './rng';
import {
  MODE_SEASONS,
  type AwardKind,
  type Effects,
  type EventCategory,
  type EventContext,
  type EventOption,
  type EventTemplate,
  type GameEvent,
  type NtGroup,
  type NtGroupRow,
  type NtLevel,
  type NtMatch,
  type Player,
  type PlayerSetup,
  type Resolution,
  type SeasonAward,
  type SeasonRecord,
  type Tier,
} from './types';

export const START_YEAR = 2026;
const FIRST_WORLD_CUP = 2030;
/** Partidos posibles por temporada (Apertura + Clausura con fase final) según la división. */
const MATCHES: Record<Tier, number> = { 0: 36, 1: 44, 2: 40, 3: 32 };
const GOALS_PER_APP = { POR: 0, DEF: 0.045, MED: 0.14, DEL: 0.37 };
const ASSISTS_PER_APP = { POR: 0.005, DEF: 0.06, MED: 0.19, DEL: 0.13 };
const DEBUT_WEIGHT: Record<Tier, number> = { 0: 0, 1: 0.2, 2: 0.35, 3: 0.45 };

// Rivales de la Selección con una fuerza aproximada (Guatemala ronda 64-70). Ficción: solo sirve para simular marcadores.
// Cada lista se usa sin la selección del jugador (ver rivals()).
type Rival = [name: string, strength: number];
const CONCACAF: Rival[] = [
  ['México', 84], ['Estados Unidos', 83], ['Canadá', 80], ['Panamá', 74], ['Costa Rica', 73], ['Jamaica', 71], ['Honduras', 70],
  ['Curazao', 65], ['El Salvador', 64], ['Haití', 64], ['Trinidad y Tobago', 62], ['Surinam', 61], ['Nicaragua', 58],
];
const NATIONS_LEAGUE: Rival[] = [
  ['Panamá', 74], ['Costa Rica', 73], ['Jamaica', 71], ['Honduras', 70], ['El Salvador', 64], ['Haití', 64], ['Trinidad y Tobago', 62],
  ['Surinam', 61], ['Nicaragua', 58], ['República Dominicana', 57], ['Cuba', 55], ['Guyana', 54], ['Belice', 50], ['Bermudas', 49], ['Granada', 48],
];
const FRIENDLIES: Rival[] = [
  ['Colombia', 83], ['Japón', 82], ['Ecuador', 80], ['Corea del Sur', 79], ['Paraguay', 76], ['Perú', 75], ['Chile', 75], ['Venezuela', 74],
  ['Arabia Saudita', 72], ['Islandia', 70], ['Bolivia', 66], ['El Salvador', 64], ['Nicaragua', 58],
];
const WORLD_CUP: Rival[] = [
  ['Argentina', 93], ['Francia', 92], ['España', 92], ['Brasil', 90], ['Inglaterra', 90], ['Portugal', 89], ['Países Bajos', 88], ['Alemania', 88],
  ['Croacia', 84], ['Uruguay', 84], ['Marruecos', 83], ['Japón', 82], ['Senegal', 79], ['Corea del Sur', 79], ['Australia', 76], ['Nigeria', 76],
  ['Egipto', 75], ['Ghana', 74],
];
const CONMEBOL: Rival[] = [
  ['Argentina', 93], ['Brasil', 90], ['Uruguay', 84], ['Colombia', 83], ['Ecuador', 80], ['Paraguay', 76], ['Perú', 75], ['Chile', 75],
  ['Venezuela', 74], ['Bolivia', 66],
];
const UEFA: Rival[] = [
  ['Francia', 92], ['España', 92], ['Inglaterra', 90], ['Portugal', 89], ['Países Bajos', 88], ['Alemania', 88], ['Italia', 87], ['Bélgica', 86],
  ['Croacia', 84], ['Suiza', 82], ['Dinamarca', 82], ['Austria', 81], ['Noruega', 80], ['Turquía', 80], ['Serbia', 78], ['Polonia', 78],
  ['Ucrania', 78], ['Suecia', 77], ['Chequia', 77], ['Escocia', 76], ['Hungría', 76], ['Gales', 75], ['Grecia', 75], ['Rumania', 74],
  ['Georgia', 73], ['Irlanda', 73], ['Albania', 72], ['Islandia', 70], ['Finlandia', 69], ['Bulgaria', 68], ['Kazajistán', 62],
  ['Luxemburgo', 62], ['Chipre', 60], ['Malta', 52], ['Andorra', 45], ['San Marino', 38],
];
const AFC: Rival[] = [
  ['Japón', 82], ['Irán', 79], ['Corea del Sur', 79], ['Australia', 76], ['Arabia Saudita', 72], ['Uzbekistán', 72], ['Catar', 70],
  ['Irak', 70], ['Jordania', 70], ['Emiratos Árabes Unidos', 69], ['Omán', 66], ['China', 64], ['Siria', 64], ['Baréin', 63],
  ['Tailandia', 62], ['Palestina', 62], ['Vietnam', 61], ['India', 55],
];
const CAF: Rival[] = [
  ['Marruecos', 83], ['Senegal', 79], ['Argelia', 77], ['Costa de Marfil', 77], ['Nigeria', 76], ['Egipto', 75], ['Túnez', 74],
  ['Camerún', 74], ['Ghana', 74], ['Malí', 73], ['RD Congo', 72], ['Sudáfrica', 71], ['Burkina Faso', 71], ['Cabo Verde', 70],
  ['Guinea', 69], ['Gabón', 68], ['Angola', 66], ['Zambia', 65], ['Benín', 64], ['Uganda', 63], ['Kenia', 60],
];
type Competition = [name: string, weight: number, rivals: Rival[]];
/** Rondas de la fase final, de la primera a la final; cada torneo empieza en la que le toca. */
const ROUNDS = ['Dieciseisavos de final', 'Octavos de final', 'Cuartos de final', 'Semifinal', 'Final'];
/** Suma un partido a la fila de la tabla. */
function tally(r: NtGroupRow, gf: number, ga: number) {
  r.pj++;
  r.gf += gf;
  r.ga += ga;
  if (gf > ga) r.g++;
  else if (gf === ga) r.e++;
  else r.p++;
  r.pts = r.g * 3 + r.e;
}
/** Torneos de cada confederación: liga de naciones (si tiene), copa con sus años y eliminatoria mundialista. */
// nations: [nombre, rivales, solo rivales de nivel parecido].
const CONFEDS: Record<Confed, { nations?: [string, Rival[], boolean?]; cup: [string, (summer: number) => boolean, Rival[]]; quali: Rival[] }> = {
  CONCACAF: { nations: ['Liga de Naciones', NATIONS_LEAGUE], cup: [CONFED_CUP.CONCACAF, (s) => s % 2 === 1, CONCACAF], quali: CONCACAF },
  CONMEBOL: { cup: [CONFED_CUP.CONMEBOL, (s) => s % 4 === 0, [...CONMEBOL, ['México', 84], ['Estados Unidos', 83]]], quali: CONMEBOL },
  UEFA: { nations: ['Liga de Naciones de la UEFA', UEFA, true], cup: [CONFED_CUP.UEFA, (s) => s % 4 === 0, UEFA.slice(0, 26)], quali: UEFA },
  AFC: { cup: [CONFED_CUP.AFC, (s) => s % 4 === 3, AFC], quali: AFC },
  CAF: { cup: [CONFED_CUP.CAF, (s) => s % 2 === 1, CAF], quali: CAF },
};
/**
 * Ronda final de la eliminatoria fuera de Concacaf (Concacaf juega segunda ronda y ronda final, ver simulateNationalTeam):
 * [equipos, vueltas, puestos que van al Mundial o al repechaje, texto].
 */
const QUALI: Record<Exclude<Confed, 'CONCACAF'>, [number, number, number, string]> = {
  CONMEBOL: [10, 2, 7, 'Los seis primeros van al Mundial; el séptimo, al repechaje.'],
  UEFA: [5, 2, 2, 'El primero va al Mundial; el segundo, al repechaje.'],
  AFC: [6, 2, 2, 'Los dos primeros van al Mundial.'],
  CAF: [6, 2, 2, 'El primero va al Mundial; el segundo, al repechaje.'],
};
/** Copa de la confederación y si se juega el verano que cierra la temporada. Lo usan también los eventos. */
export const confedCup = (c: Country, summer: number) => {
  const [name, when] = CONFEDS[c.conf].cup;
  return { name, now: when(summer) };
};
/** Copas continentales de clubes: valen como título internacional. */
export const CLUB_CUPS = ['Concacaf Champions Cup', 'Copa Libertadores', 'Champions League', 'Champions League de la AFC', 'Champions League de la CAF'];
/** Centroamérica juega la Copa Centroamericana de clubes. */
const centralAmerican = (c: Country) => c.conf === 'CONCACAF' && c.code !== 'MX' && c.code !== 'US';
/** Título de liga: "Liga Nacional · Apertura 2026" (torneos cortos) o "LaLiga 2027". */
export const isLeagueTitle = (title: string, league: string) => {
  const rest = title.slice(league.length);
  return title.startsWith(league) && (rest.startsWith(' · ') || /^ \d{4}$/.test(rest));
};

/**
 * Puntos de ranking por premio. Solo suman los que existían cuando se abrió el ranking (goleador y mejor jugador),
 * para que las carreras ya guardadas sigan siendo comparables; los demás se muestran pero no puntúan.
 */
const AWARD_POINTS: Record<AwardKind, number> = { goleador: 5, mvp: 5, portero: 0, asistidor: 0, joven: 0, ideal: 0 };

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
export const seasonLabel = (year: number) => `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
/** Próximo Mundial cuyo verano (año) es >= al año dado. */
const nextWorldCup = (year: number) => FIRST_WORLD_CUP + Math.max(0, Math.ceil((year - FIRST_WORLD_CUP) / 4)) * 4;

export class Career {
  readonly rng: Rng;
  readonly player: Player;
  /** Nacionalidad: liga del debut, Selección y textos. */
  readonly home: Country;
  /** Clubes del país del jugador y primeras divisiones del resto del mundo, ya vistas desde su nacionalidad. */
  private readonly homeClubs: Club[];
  private readonly abroadClubs: Club[];
  private usedOnce = new Set<string>();
  private lastSeen = new Map<string, number>();
  private recentCategories: EventCategory[] = [];
  private block = 0;
  private suitor: Club | null = null;
  private pending: GameEvent | null = null;

  constructor(setup: PlayerSetup, seed = Date.now()) {
    this.rng = createRng(seed);
    const rng = this.rng;
    this.home = countryOf(setup.country);
    this.homeClubs = clubsOf(this.home.code);
    this.abroadClubs = ALL_CLUBS.filter((c) => c.country !== this.home.code && c.tier === 1).map((c) => viewClub(c, this.home));
    const potential = Math.round(clamp(56 + ((rng() + rng() + rng()) / 3) * 36 + randRange(rng, -4, 4), 54, 94));
    this.player = {
      setup: { ...setup, country: this.home.code, avatar: { ...setup.avatar } },
      age: 16,
      year: START_YEAR,
      rating: randInt(rng, 42, 50),
      potential,
      morale: 65,
      fitness: 90,
      fame: 0,
      coach: 50,
      clubId: '',
      injurySeasons: 0,
      ntLevel: 0,
      caps: 0,
      natGoals: 0,
      wcProgress: 0,
      seasons: [],
      titles: [],
      awards: [],
      milestones: [],
      flags: {},
      peakRating: 0,
      retired: false,
    };
    this.player.clubId = this.debutClub(setup.dept).id;
    this.player.peakRating = this.player.rating;
  }

  get club(): Club {
    return viewClub(clubById(this.player.clubId), this.home);
  }

  get pendingEvent(): GameEvent | null {
    return this.pending;
  }

  get isOver(): boolean {
    return this.player.retired;
  }

  /** El debut es en un club del departamento si existe; casi siempre en divisiones de ascenso. */
  private debutClub(dept: string): Club {
    const rng = this.rng;
    const tiers = ([3, 2, 1] as Tier[]).filter((t) => t <= this.home.leagues.length);
    const tier = weightedPick(rng, tiers, (t) => DEBUT_WEIGHT[t]);
    const local = this.regionClubs(dept);
    const localTier = local.filter((c) => c.tier === tier);
    if (localTier.length) return pick(rng, localTier);
    if (local.length && chance(rng, 0.6)) return pick(rng, local);
    return pick(rng, this.homeClubs.filter((c) => c.tier === tier));
  }

  private regionClubs(dept: string): Club[] {
    return (HOME_CLUBS_BY_DEPT[this.home.code]?.[dept] ?? []).map(clubById);
  }

  // ---------- Temporadas ----------

  /** Primera decisión, a los 16 años y antes de jugar la primera temporada. */
  start() {
    if (!this.pending && !this.player.seasons.length) this.pending = this.drawEvent();
  }

  /** Simula un bloque de temporadas según el modo y prepara la siguiente decisión. */
  playBlock(): SeasonRecord[] {
    const played: SeasonRecord[] = [];
    const n = MODE_SEASONS[this.player.setup.mode];
    for (let i = 0; i < n && !this.player.retired; i++) {
      played.push(this.simulateSeason());
      this.checkForcedRetirement();
    }
    this.block++;
    this.pending = this.player.retired ? null : this.drawEvent();
    return played;
  }

  private simulateSeason(): SeasonRecord {
    const p = this.player;
    const rng = this.rng;
    const club = this.club;
    const tier = club.tier;
    const injured = p.injurySeasons > 0;
    if (injured) p.injurySeasons--;

    const diff = p.rating - club.prestige;
    let starter = sigmoid(diff / 4 + (p.morale - 55) / 50 + (p.coach - 50) / 30);
    if (p.age < 18) starter *= tier === 3 ? 0.75 : tier === 2 ? 0.55 : 0.35;
    const fitnessFactor = 0.55 + 0.45 * (p.fitness / 100);
    const apps = Math.round(
      MATCHES[tier] * clamp(starter, 0.03, 0.97) * fitnessFactor * (injured ? 0.25 : 1) * randRange(rng, 0.85, 1.05),
    );

    const pos = p.setup.position;
    const quality = clamp(1 + diff / 40, 0.5, 1.35);
    const goals = Math.round(apps * GOALS_PER_APP[pos] * quality * randRange(rng, 0.7, 1.3));
    const assists = Math.round(apps * ASSISTS_PER_APP[pos] * quality * randRange(rng, 0.7, 1.3));

    // Títulos
    const titles: string[] = [];
    const contribution = (apps / MATCHES[tier]) * clamp((p.rating - club.prestige + 12) / 20, 0, 1);
    // Torneos cortos (Apertura y Clausura) en casa si el país los juega; afuera y en ligas largas, un título por temporada.
    const single = club.abroad || !this.home.split;
    const tournaments = single ? [`${club.league} ${p.year + 1}`] : [`${club.league} · Apertura ${p.year}`, `${club.league} · Clausura ${p.year + 1}`];
    // Las chances de campeonar dependen del nivel del club en su propia liga (afuera también).
    const own = clubById(club.id);
    for (const t of tournaments) {
      let base = own.tier === 1 ? clamp(0.1 * Math.exp((own.prestige - 68) / 6), 0.03, 0.42) : 0.09;
      if (single && !club.abroad) base = Math.min(0.6, base * 1.8); // ponytail: compensa jugar un torneo por temporada en vez de dos
      if (apps >= 5 && chance(rng, base * (0.8 + 0.5 * contribution))) titles.push(t);
    }
    if (apps >= 10) {
      if (tier === 1 && centralAmerican(this.home) && titles.length > 0 && chance(rng, 0.14)) titles.push(`Copa Centroamericana ${p.year}`);
      // Copa continental: sus grandes la ganan más seguido.
      const cup = countryOf(own.country).cup;
      if (cup && own.tier === 1 && chance(rng, cup[1] * clamp(Math.exp((own.prestige - 72) / 4), 0.2, 2))) titles.push(`${cup[0]} ${p.year + 1}`);
    }
    p.titles.push(...titles);
    if ((tier === 2 || tier === 3) && titles.length) p.flags.ascenso = 1;

    // Premios individuales
    const leagueName = club.league;
    const share = apps / MATCHES[tier];
    const cleanSheets = pos === 'POR' ? Math.round(apps * clamp(0.3 + diff / 40, 0.12, 0.5) * randRange(rng, 0.8, 1.2)) : undefined;
    const awards: SeasonAward[] = [];
    const award = (kind: AwardKind, name: string) => awards.push({ kind, name: `${name} de ${leagueName} ${seasonLabel(p.year)}` });
    if (goals >= (tier === 3 ? 16 : 20)) award('goleador', 'Goleador');
    if (assists >= (tier === 3 ? 9 : 11)) award('asistidor', 'Máximo asistidor');
    if (cleanSheets !== undefined && share >= 0.7 && cleanSheets >= apps * 0.45 && chance(rng, 0.35)) award('portero', 'Guardameta menos vencido');
    if (share >= 0.7 && diff >= 8 && chance(rng, 0.3)) award('mvp', 'Mejor jugador');
    else if (share >= 0.6 && diff >= 4 && chance(rng, 0.35)) award('ideal', 'Once ideal');
    if (p.age <= 21 && share >= 0.5 && diff >= -2 && chance(rng, 0.3)) award('joven', 'Jugador joven del año');
    p.awards.push(...awards.map((a) => a.name));

    const clubTitles = titles.length; // los títulos de selección no cuentan para el ánimo ni la fama de club
    const nt = this.simulateNationalTeam(goals, apps, titles);

    const record: SeasonRecord = {
      label: seasonLabel(p.year),
      age: p.age,
      clubId: p.clubId,
      tier,
      apps,
      goals,
      assists,
      rating: Math.round(p.rating),
      titles,
      awards,
      cleanSheets,
      injured,
      nt,
    };
    p.seasons.push(record);
    this.progress(apps / MATCHES[tier], clubTitles, goals);
    this.checkPlayingTime(record);
    p.age++;
    p.year++;
    return record;
  }

  private simulateNationalTeam(clubGoals: number, apps: number, titles: string[]): SeasonRecord['nt'] {
    const p = this.player;
    const rng = this.rng;
    const club = this.club;
    const visible = club.abroad || club.tier === 1;
    const debut = p.caps === 0;
    const matches: NtMatch[] = [];
    const groups: NtGroup[] = [];
    const summer = p.year + 1;
    const wcYear = summer >= FIRST_WORLD_CUP && (summer - FIRST_WORLD_CUP) % 4 === 0;
    const h = this.home;
    const conf = CONFEDS[h.conf];
    const bar = h.callup - 71; // los umbrales de Guatemala, corridos según lo difícil que es entrar a cada Selección
    // Fase final del grupo g: fama por victoria, hito de semifinal y, si gana, el título (a la temporada y a la carrera).
    const play = (g: NtGroup, rounds: string[], pool: Rival[], win: number, trophy: number, hard?: number, extra?: number) => {
      const ms = this.finals(g, rounds, pool, hard, extra);
      const title = /\d{4}$/.test(g.comp) ? g.comp : `${g.comp} ${summer}`;
      const de = title.startsWith('Mundial') ? 'del' : 'de la'; // las copas y ligas de selecciones son femeninas
      p.fame += ms.filter((m) => m.gf > m.ga || (m.pen && m.pen[0] > m.pen[1])).length * win;
      // La Liga de Naciones arranca en semifinales: ahí llegar no es un hito.
      if (rounds.length > 2 && ms.some((m) => m.round === 'Semifinal')) {
        p.milestones.push(`Semifinal ${de} ${title}`);
        p.fame += 8;
      }
      if (g.out === 'Campeón') {
        titles.push(title);
        p.titles.push(title);
        p.milestones.push(`Campeón ${de} ${title} con ${h.name}`);
        p.fame += trophy;
      }
      return ms;
    };
    // Goles del jugador en partidos de fase final: cada uno donde su Selección anotó, con la probabilidad de su puesto.
    const strike = (ms: NtMatch[], prob: number) => {
      const scored = ms.filter((m) => m.gf > 0 && chance(rng, prob));
      for (const m of scored) m.goals++;
      p.natGoals += scored.length;
      return scored.length;
    };
    const ko: NtMatch[] = [];

    // Convocatorias y bajas automáticas (los eventos de Selección aceleran este camino).
    if (p.ntLevel > 0 && (p.rating < 60 + bar || p.age >= 36 || p.flags.sel_retirado)) {
      p.ntLevel = 0;
    } else if (p.age >= 19 && visible && apps >= 10) {
      if (p.ntLevel === 0 && p.rating >= 71 + bar && chance(rng, 0.3)) this.setNtLevel(1);
      else if (p.ntLevel === 1 && p.rating >= 72 + bar && chance(rng, 0.3)) this.setNtLevel(2);
      else if (p.ntLevel === 2 && p.rating >= 77 + bar && chance(rng, 0.2)) this.setNtLevel(3);
    }

    // El Mundial se decide antes de armar la ronda final, para que la tabla cuadre con lo que pasó.
    // Si un evento ya contó la clasificación o la eliminación, manda eso; si no, decide la suerte.
    let qualified = false;
    if (wcYear && p.ntLevel > 0) {
      const told = p.milestones.some((m) => m.startsWith(`Clasificó al Mundial ${summer}`));
      const q = clamp(h.wc + p.wcProgress * 0.06 + (p.ntLevel - 1) * 0.015 + Math.max(0, p.rating - 74 - bar) * 0.004, 0.01, Math.max(0.35, h.wc));
      qualified = told || (!p.flags.sel_elim_fuera && chance(rng, q));
    }

    if (p.ntLevel > 0) {
      const caps = { 1: randInt(rng, 1, 3), 2: randInt(rng, 4, 8), 3: randInt(rng, 7, 11) }[p.ntLevel as 1 | 2 | 3];
      const rate = { POR: 0, DEF: 0.04, MED: 0.1, DEL: 0.3 }[p.setup.position];
      const goals = Math.round(caps * rate * randRange(rng, 0.5, 1.5) * (clubGoals > 0 ? 1 : 0.6));
      const wc = nextWorldCup(summer);
      const comps: Competition[] = [['Amistoso', 1, this.rivals(FRIENDLIES)]];
      const fixtures = new Map<string, NtMatch[]>();
      const group = (comp: string, weight: number, pool: Rival[], size: number, legs: number, note: string, advance: number, band?: [number, number]) => {
        const g = this.drawGroup(comp, pool, size, legs, band);
        groups.push({ comp, note, advance, table: g.table });
        fixtures.set(comp, g.fixtures);
        comps.push([comp, weight, pool]);
        return g.table.findIndex((r) => r.team === h.name);
      };

      if (conf.nations) {
        const pos = group(conf.nations[0], 1.5, this.rivals(conf.nations[1], conf.nations[2]), 4, 2, 'El primero sube de liga y juega la fase final.', 1);
        // ponytail: sin divisiones A y B; todo el que gana su grupo juega semifinal y final contra rivales de todo el pool.
        if (pos === 0) {
          const ms = play(groups.at(-1)!, ROUNDS.slice(3), this.rivals(conf.nations[1]), 1, 8, 1, 4);
          ko.push(...ms);
          strike(ms, rate);
        }
      }
      if (h.conf === 'CONCACAF') {
        // Eliminatoria: segunda ronda la temporada anterior al Mundial y ronda final la del año del Mundial.
        // Si un evento ya contó cómo les fue en la segunda ronda, la tabla lo respeta.
        const outEarly = p.flags.sel_elim_fuera && p.wcProgress === 0;
        if (wc - summer === 1 && !p.flags.sel_elim_r2 && !(p.flags.sel_elim_fuera && p.wcProgress > 0)) {
          const band: [number, number] | undefined = p.wcProgress > 0 ? [0, 0] : outEarly ? [2, 4] : undefined;
          const pos = group(`Eliminatoria Mundial ${wc} · Segunda ronda`, 3, this.rivals(NATIONS_LEAGUE), 5, 1, 'Los dos primeros pasan a la ronda final.', 2, band);
          p.flags.sel_elim_r2 = 1;
          // Avanzar no suma wcProgress: eso queda para los eventos, así la tasa de Mundiales sigue como antes.
          if (pos > 1) p.flags.sel_elim_fuera = 1;
        } else if (wcYear && !outEarly) {
          // ponytail: clasificado = 1.º o 2.º (repechaje ganado); no distingue si un evento contó el repechaje.
          group(`Eliminatoria Mundial ${wc} · Ronda final`, 3, this.rivals(CONCACAF), 4, 2, 'El primero va al Mundial; el segundo, al repechaje.', 2, qualified ? [0, 1] : [2, 3]);
        }
      } else if (wcYear) {
        // El resto de confederaciones: un solo grupo, que cuadra con si la Selección va o no al Mundial.
        const [size, legs, advance, note] = QUALI[h.conf];
        group(`Eliminatoria Mundial ${wc} · Ronda final`, 3, this.rivals(conf.quali), size, legs, note, advance, qualified ? [0, advance - 1] : [advance, size - 1]);
      }
      const cup = confedCup(h, summer);
      if (cup.now) {
        const direct = h.conf === 'CONCACAF' || h.conf === 'CONMEBOL';
        const note = direct ? 'Los dos primeros pasan a cuartos de final.' : 'Pasan los dos primeros y los mejores terceros.';
        const pos = group(`${cup.name} ${summer}`, 2, this.rivals(conf.cup[2]), 4, 1, note, 2);
        const g = groups.at(-1)!;
        // ponytail: mejor tercero = 3.º con 4 puntos o más; no se comparan los terceros de otros grupos.
        if (pos < 2 || (!direct && pos === 2 && g.table[2].pts >= 4)) {
          if (pos === 2) g.advance = 3;
          const ms = play(g, ROUNDS.slice(direct ? 2 : 1), this.rivals(conf.cup[2]), 2, 20);
          ko.push(...ms);
          strike(ms, rate);
        } else g.out = 'Eliminado en la fase de grupos';
      }
      const played = this.ntMatches(comps, fixtures, caps, goals);
      matches.push(...played.matches, ...ko);
      p.caps += caps + ko.length;
      p.natGoals += played.goals;
      p.fame += (caps + ko.length) * 0.6;
    }

    // Mundial: se juega al final de la temporada que termina en año mundialista.
    if (wcYear) {
      if (qualified) {
        p.flags.mundial = (p.flags.mundial ?? 0) + 1;
        p.milestones.push(`Jugó el Mundial ${summer} con ${h.name}`);
        p.fame += 30;
        // Fase de grupos: tres partidos, todos con el jugador en cancha.
        const g = this.drawGroup(`Mundial ${summer}`, this.rivals(WORLD_CUP), 4, 1);
        const ng: NtGroup = { comp: `Mundial ${summer}`, note: 'Pasan los dos primeros y los mejores terceros.', advance: 2, table: g.table };
        groups.push(ng);
        p.caps += 3;
        matches.push(...g.fixtures);
        const prob = { POR: 0, DEF: 0.12, MED: 0.25, DEL: 0.45 }[p.setup.position];
        const goalHit = `Gol en el Mundial ${summer}`;
        const scored = g.fixtures.filter((m) => m.gf > 0);
        if (scored.length && chance(rng, prob)) {
          pick(rng, scored).goals++;
          p.milestones.push(goalHit);
          p.fame += 15;
          p.natGoals++;
        }
        // Fase final: 1.º y 2.º pasan; el 3.º, si es de los mejores terceros. ponytail: 3.º con 4 puntos o más, sin comparar otros grupos.
        const pos = g.table.findIndex((r) => r.team === h.name);
        if (pos < 2 || (pos === 2 && g.table[2].pts >= 4)) {
          if (pos === 2) ng.advance = 3;
          const ms = play(ng, ROUNDS, this.rivals(WORLD_CUP), 5, 50, 0.5);
          matches.push(...ms);
          p.caps += ms.length;
          if (strike(ms, prob) && !p.milestones.includes(goalHit)) {
            p.milestones.push(goalHit);
            p.fame += 15;
          }
        } else ng.out = 'Eliminado en la fase de grupos';
      } else if (p.ntLevel > 0 && p.wcProgress >= 2) {
        p.milestones.push(`Eliminado en la recta final rumbo al Mundial ${summer}`);
      }
      p.wcProgress = 0;
      // Las banderas de la eliminatoria valen solo para un ciclo mundialista.
      for (const f of ['sel_elim_fuera', 'sel_elim_decidido', 'sel_repechaje', 'sel_elim_r2']) delete p.flags[f];
    }
    return matches.length ? { debut, matches, groups } : undefined;
  }

  /**
   * Fase final de un grupo de la Selección del jugador: un partido por ronda, penales si empata, y se elimina al perder.
   * Deja el cierre del torneo en g.out. Los rivales salen de pool, sin repetir a los del grupo.
   */
  private finals(g: NtGroup, rounds: string[], pool: Rival[], hard = 1, extra = 0) {
    const rng = this.rng;
    const gt = this.gtStrength();
    const left = pool.filter(([name]) => !g.table.some((r) => r.team === name));
    const matches: NtMatch[] = [];
    for (const [i, round] of rounds.entries()) {
      // ponytail: sin cuadro; el rival es el más fuerte de varios sorteos (más en cada ronda), así quien llega lejos enfrenta a los mejores.
      let [rival, strength] = pick(rng, left);
      for (let j = 0; j < extra + Math.floor(i * hard); j++) {
        const c = pick(rng, left);
        if (c[1] > strength) [rival, strength] = c;
      }
      left.splice(left.findIndex(([name]) => name === rival), 1);
      const gf = poisson(rng, 1.2 * Math.exp((gt - strength) / 20));
      const ga = poisson(rng, 1.2 * Math.exp((strength - gt) / 20));
      const m: NtMatch = { comp: g.comp, rival, gf, ga, goals: 0, round };
      if (gf === ga) {
        // ponytail: sin tanda real; gana con ventaja leve por fuerza y el marcador es verosímil (4-2 a 5-4).
        const w = randInt(rng, 4, 5);
        const l = randInt(rng, 2, w - 1);
        m.pen = chance(rng, 0.5 + clamp((gt - strength) / 100, -0.15, 0.15)) ? [w, l] : [l, w];
      }
      matches.push(m);
      if (gf < ga || (m.pen && m.pen[0] < m.pen[1])) {
        g.out = round === 'Final' ? 'Subcampeón' : round === 'Semifinal' ? 'Eliminado en semifinales' : `Eliminado en ${round.toLowerCase()}`;
        return matches;
      }
    }
    g.out = 'Campeón';
    return matches;
  }

  /** Fuerza de la Selección del jugador; en Guatemala, 64 + (nivel - 70) / 4 + su peso en el equipo. */
  private gtStrength() {
    return this.home.strength - 2 + (this.player.rating - this.home.callup + 1) * 0.25 + this.player.ntLevel;
  }

  /** Rivales sin la propia Selección del jugador. near: solo los 7 de fuerza más parecida (ligas de naciones por nivel). */
  private rivals(list: Rival[], near = false): Rival[] {
    const others = list.filter(([name]) => name !== this.home.name);
    if (!near) return others;
    const s = this.home.strength;
    return [...others].sort((a, b) => Math.abs(a[1] - s) - Math.abs(b[1] - s)).slice(0, 7);
  }

  /**
   * Sortea el grupo de la Selección del jugador y juega todos los partidos (también los de los rivales entre sí).
   * Con band, repite el grupo empujando a la Selección hasta que termine entre esos puestos (0 = primero),
   * para que la tabla cuadre con un resultado ya decidido.
   */
  private drawGroup(comp: string, pool: Rival[], size: number, legs: number, band: [number, number] = [0, size - 1]) {
    const rng = this.rng;
    const home = this.home.name;
    const left = [...pool];
    const rivals = Array.from({ length: size - 1 }, () => left.splice(Math.floor(rng() * left.length), 1)[0]);
    for (let bias = 0; ; bias += band[0] > 0 ? -2 : 2) {
      const teams: Rival[] = [[home, this.gtStrength() + bias], ...rivals];
      const rows = teams.map(([team]): NtGroupRow => ({ team, pj: 0, g: 0, e: 0, p: 0, gf: 0, ga: 0, pts: 0 }));
      const fixtures: NtMatch[] = [];
      for (let leg = 0; leg < legs; leg++) {
        for (let i = 0; i < size; i++) {
          for (let j = i + 1; j < size; j++) {
            const a = poisson(rng, 1.2 * Math.exp((teams[i][1] - teams[j][1]) / 20));
            const b = poisson(rng, 1.2 * Math.exp((teams[j][1] - teams[i][1]) / 20));
            tally(rows[i], a, b);
            tally(rows[j], b, a);
            if (i === 0) fixtures.push({ comp, rival: teams[j][0], gf: a, ga: b, goals: 0 });
          }
        }
      }
      const table = rows.sort((x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf);
      const pos = table.findIndex((r) => r.team === home);
      if (pos >= band[0] && pos <= band[1]) return { table, fixtures };
    }
  }

  /**
   * Arma los partidos del jugador en la temporada: salen del calendario de cada grupo (sin inventar partidos que no estén
   * en la tabla) o son amistosos. Los goles solo caen donde su Selección anotó, salvo en amistosos.
   */
  private ntMatches(comps: Competition[], fixtures: Map<string, NtMatch[]>, n: number, goals: number) {
    const rng = this.rng;
    const gt = this.gtStrength();
    const matches: NtMatch[] = [];
    for (let i = 0; i < n; i++) {
      const open = comps.filter(([c]) => !fixtures.has(c) || fixtures.get(c)!.length);
      const [comp, , rivals] = weightedPick(rng, open, (c) => c[1]);
      const pending = fixtures.get(comp);
      if (pending) {
        matches.push(pending.splice(Math.floor(rng() * pending.length), 1)[0]);
        continue;
      }
      const played = matches.filter((m) => m.comp === comp).map((m) => m.rival);
      const fresh = rivals.filter(([name]) => !played.includes(name));
      const [rival, strength] = pick(rng, fresh.length ? fresh : rivals);
      const gf = poisson(rng, 1.2 * Math.exp((gt - strength) / 20));
      const ga = poisson(rng, 1.2 * Math.exp((strength - gt) / 20));
      matches.push({ comp, rival, gf, ga, goals: 0 });
    }
    let scored = 0;
    for (let g = 0; g < goals; g++) {
      const open = matches.filter((m) => m.goals < m.gf || !fixtures.has(m.comp));
      if (!open.length) break;
      const m = pick(rng, open);
      m.goals++;
      m.gf = Math.max(m.gf, m.goals);
      scored++;
    }
    return { matches, goals: scored };
  }

  private setNtLevel(level: NtLevel, announced = false) {
    const p = this.player;
    if (level <= p.ntLevel) return;
    if (p.ntLevel === 0 && !announced) p.milestones.push(`Debut con la Selección mayor (${p.year})`);
    if (level === 3) p.milestones.push(`Titular indiscutible de la Selección (${p.year})`);
    p.ntLevel = level;
  }

  private progress(share: number, titles: number, goals: number) {
    const p = this.player;
    const rng = this.rng;
    const gap = p.potential - p.rating;
    const minutes = 0.5 + share / 2;
    const mood = 0.6 + p.morale / 125;
    if (p.age <= 23) p.rating += clamp(gap * 0.2 * mood * minutes, 0, 6) + randRange(rng, -0.8, 1);
    else if (p.age <= 29) p.rating += (gap > 0 ? gap * 0.12 : 0) + randRange(rng, -1, 1);
    else if (p.age <= 32) p.rating -= randRange(rng, 0, 2);
    else p.rating -= randRange(rng, 1.5, 4);
    p.rating = clamp(p.rating, 35, 97);
    p.peakRating = Math.max(p.peakRating, Math.round(p.rating));

    p.fitness = p.age >= 30 ? p.fitness - randInt(rng, 2, 7) : p.fitness + (100 - p.fitness) * 0.3;
    p.fitness = clamp(p.fitness, 20, 100);
    p.morale = clamp(p.morale + (60 - p.morale) * 0.25 + (share > 0.65 ? 5 : share < 0.2 ? -8 : 0) + titles * 4, 0, 100);
    p.coach = clamp(p.coach + (55 - p.coach) * 0.3, 0, 100); // cada temporada la relación se normaliza un poco
    const visibility = this.club.tier === 1 || this.club.abroad ? 1 : 0.4;
    p.fame += (goals * 0.25 + titles * 4 + (share > 0.65 ? 1.5 : 0)) * visibility;
  }

  /** Si pasa dos temporadas casi sin jugar, baja a un club donde sí tenga minutos. */
  private checkPlayingTime(record: SeasonRecord) {
    const p = this.player;
    if (p.age < 19 || record.injured) return;
    p.flags.banca = record.apps < MATCHES[record.tier] * 0.2 ? (p.flags.banca ?? 0) + 1 : 0;
    if (p.flags.banca < 2) return;
    p.flags.banca = 0;
    const current = this.club;
    const fits = this.homeClubs.filter((c) => c.id !== current.id && c.prestige < current.prestige && c.prestige <= p.rating + 3);
    const lowest = this.home.leagues.length;
    const dest = fits.length
      ? weightedPick(this.rng, fits, (c) => Math.exp((c.prestige - current.prestige) / 6))
      : this.homeClubs.filter((c) => c.tier === lowest && c.id !== current.id).sort((a, b) => a.prestige - b.prestige)[0];
    if (!dest) return;
    p.clubId = dest.id;
    p.coach = 55;
    const tierNote = dest.tier !== current.tier ? ` (${dest.league})` : '';
    record.note = `Sin minutos: pasó a ${dest.name}${tierNote}`;
  }

  private checkForcedRetirement() {
    const p = this.player;
    if (p.age >= 40 || (p.age >= 30 && p.rating < 48) || (p.age >= 33 && p.fitness <= 25)) this.retire();
  }

  private retire() {
    this.player.retired = true;
    this.pending = null;
  }

  // ---------- Decisiones ----------

  context(): EventContext {
    const p = this.player;
    const club = this.club;
    const wc = nextWorldCup(p.year + 1);
    return {
      club,
      tier: club.tier,
      abroad: club.abroad,
      country: this.home,
      last: p.seasons.at(-1),
      qualifiers: wc - (p.year + 1) <= 2,
      worldCupYear: wc,
      suitor: this.suitor,
    };
  }

  private drawEvent(): GameEvent {
    const p = this.player;
    const rng = this.rng;
    this.suitor = p.age <= 32 ? this.findClub('up') : null;
    if (p.age >= 33 && chance(rng, clamp((p.age - 32) * 0.16, 0, 0.8))) return this.retirementEvent();

    const club = this.club;
    const last = p.seasons.at(-1);
    const outgrowing = p.rating >= club.prestige + 4 && p.age <= 31;
    const ctx = this.context();
    const pool = ALL_EVENTS.filter((e) => this.available(e) && e.when(p, ctx));
    // Una ruta en curso (pasos encadenados con peso >= 3) tiene prioridad sobre las ofertas genéricas.
    const routeSteps = pool.filter((e) => typeof e.weight === 'number' && e.weight >= 3);
    const routeStep = routeSteps.length > 0;
    const offerChance = ((outgrowing ? 0.22 : 0.05) + (p.flags.ascenso ? 0.2 : 0)) * (routeStep ? 0.3 : 1);
    if (this.suitor && chance(rng, offerChance)) {
      delete p.flags.ascenso;
      this.remember('oferta', 'contrato');
      return this.transferOffer(this.suitor);
    }

    const notable = !!last && (last.titles.length > 0 || last.goals >= 15 || last.apps < MATCHES[last.tier] * 0.2);
    // Si hay una historia en curso, casi siempre continúa: así las rutas (Selección, extranjero) se completan.
    const candidates = routeStep && chance(rng, 0.7) ? routeSteps : pool;
    const template = weightedPick(rng, candidates, (e) => {
      let w = typeof e.weight === 'function' ? e.weight(p, ctx) : (e.weight ?? 1);
      const isRoute = typeof e.weight === 'number' && e.weight >= 3;
      const repeats = this.recentCategories.filter((c) => c === e.category).length;
      // Variedad: no repetir el mismo tipo de escena, salvo que sea el siguiente paso de una ruta.
      if (isRoute) w *= 3;
      else w *= repeats === 0 ? 1 : repeats === 1 ? 0.4 : 0.15;
      if (e.category === 'medios' && notable) w *= 1.8;
      if (e.category === 'seleccion' && ctx.qualifiers && p.ntLevel > 0) w *= 1.6;
      if (e.category === 'extranjero' && ctx.abroad) w *= 1.4;
      if (e.category === 'divisiones' && ctx.tier >= 2) w *= 1.5;
      return w;
    });
    this.remember(template.id, template.category);
    if (template.once) this.usedOnce.add(template.id);
    return {
      id: template.id,
      category: template.category,
      title: typeof template.title === 'function' ? template.title(p, ctx) : template.title,
      text: template.text(p, ctx),
      options: template.options(p, ctx),
    };
  }

  private available(e: EventTemplate) {
    if (e.once && this.usedOnce.has(e.id)) return false;
    const seen = this.lastSeen.get(e.id);
    return seen === undefined || this.block - seen > (e.cooldown ?? 4);
  }

  private remember(id: string, category: EventCategory) {
    this.lastSeen.set(id, this.block);
    this.recentCategories = [category, ...this.recentCategories].slice(0, 3);
  }

  private transferOffer(target: Club): GameEvent {
    const p = this.player;
    const current = this.club;
    const jump =
      target.abroad ? 'del extranjero' : target.tier < current.tier ? `de ${target.league}` : 'de otro club';
    const options: EventOption[] = [
      {
        label: `Me voy a ${target.name}`,
        outcomes: [
          { p: 0.75, text: `Firmaste con ${target.name}. Nueva etapa.`, effects: { transferTo: target.id, morale: 8, fame: 4 } },
          { p: 0.25, text: `Firmaste con ${target.name}, pero la adaptación cuesta.`, effects: { transferTo: target.id, morale: -6 } },
        ],
      },
      {
        label: `Me quedo en ${current.name}`,
        outcomes: [
          { p: 0.7, text: 'La afición y el técnico valoran tu lealtad.', effects: { morale: 6, fame: 3, coach: 8 } },
          { p: 0.3, text: 'Te quedaste con la duda de qué hubiera pasado.', effects: { morale: -8 } },
        ],
      },
    ];
    return {
      id: 'oferta',
      category: 'contrato',
      title: `Oferta ${jump}`,
      text: `${target.name} (${target.city}) hizo una oferta formal por vos. ${
        p.age >= 28 ? 'Puede ser la última gran oportunidad.' : 'Tu representante dice que es ahora o nunca.'
      }`,
      options,
    };
  }

  private retirementEvent(): GameEvent {
    const p = this.player;
    return {
      id: 'retiro',
      category: 'retiro',
      title: 'Hora de colgar los tacos',
      text: `Tenés ${p.age} años. ${this.club.name} te ofrece un partido homenaje si decidís retirarte.`,
      options: [
        { label: 'Me retiro con homenaje', outcomes: [{ p: 1, text: 'Estadio lleno y tu familia en la cancha. Gracias por todo.', effects: { retire: true, fame: 5 } }] },
        {
          label: 'Una temporada más',
          outcomes: [
            { p: 0.6, text: 'Todavía tenés cuerda.', effects: { morale: 4 } },
            { p: 0.4, text: 'El cuerpo ya no responde igual.', effects: { rating: -3, fitness: -10 } },
          ],
        },
      ],
    };
  }

  choose(optionIndex: number): Resolution {
    const event = this.pending;
    if (!event) throw new Error('No hay decisión pendiente');
    const option = event.options[optionIndex];
    const outcome = weightedPick(this.rng, option.outcomes, (o) => o.p);
    const changes = this.applyEffects(outcome.effects);
    this.pending = null;
    return { text: outcome.text, changes };
  }

  private applyEffects(e: Effects): string[] {
    const p = this.player;
    const changes: string[] = [];
    const add = (key: 'rating' | 'morale' | 'fitness' | 'fame' | 'coach', delta: number | undefined, label: string) => {
      if (!delta) return;
      const max = key === 'rating' ? 97 : key === 'fame' ? 9999 : 100;
      p[key] = clamp(p[key] + delta, 0, max);
      changes.push(`${delta > 0 ? '+' : ''}${delta} ${label}`);
    };
    add('rating', e.rating, 'Nivel');
    add('morale', e.morale, 'Ánimo');
    add('fitness', e.fitness, 'Físico');
    add('fame', e.fame, 'Fama');
    add('coach', e.coach, 'Técnico');
    if (e.potential) p.potential = clamp(p.potential + e.potential, 40, 97);
    p.peakRating = Math.max(p.peakRating, Math.round(p.rating));
    if (e.injury) {
      p.injurySeasons += e.injury;
      changes.push('Lesión');
    }
    for (const f of [e.flag ?? []].flat()) p.flags[f] = 1;
    for (const f of [e.unflag ?? []].flat()) delete p.flags[f];
    if (e.milestone) p.milestones.push(`${e.milestone} (${p.year})`);
    if (e.position) p.setup.position = e.position;
    if (e.ntLevel !== undefined && e.ntLevel > p.ntLevel) {
      changes.push(p.ntLevel === 0 ? 'Convocado a la Selección' : 'Más peso en la Selección');
      this.setNtLevel(e.ntLevel, !!e.milestone);
    }
    if (e.caps) {
      p.caps += e.caps;
      changes.push(`+${e.caps} PJ Selección`);
    }
    if (e.natGoals) {
      p.natGoals += e.natGoals;
      changes.push(`+${e.natGoals} gol${e.natGoals > 1 ? 'es' : ''} con ${this.home.name}`);
    }
    if (e.wcProgress) {
      p.wcProgress = clamp(p.wcProgress + e.wcProgress, 0, 3);
      changes.push(`${this.home.name} avanza en la eliminatoria`);
    }
    const dest = e.transferTo
      ? viewClub(clubById(e.transferTo), this.home)
      : e.transfer === 'suitor'
        ? this.suitor
        : e.transfer
          ? this.findClub(e.transfer)
          : null;
    if (dest && dest.id !== p.clubId) {
      p.clubId = dest.id;
      p.coach = 50;
      changes.push(`Nuevo club: ${dest.name}`);
    }
    if (e.retire) this.retire();
    return changes;
  }

  findClub(kind: NonNullable<Effects['transfer']>): Club | null {
    const p = this.player;
    const rng = this.rng;
    const current = this.club;
    const others = (list: Club[]) => list.filter((c) => c.id !== p.clubId);
    let pool: Club[] = [];
    switch (kind) {
      case 'suitor':
        return this.suitor;
      case 'up': {
        const abroadOk = p.age <= 30 && (p.rating >= 64 || current.abroad) && current.tier <= 1;
        pool = others([...this.homeClubs, ...(abroadOk ? this.abroadClubs : [])]).filter(
          (c) =>
            c.prestige > current.prestige + 1 &&
            c.prestige <= p.rating + 5 &&
            (c.abroad || current.abroad || c.tier >= current.tier - 1),
        );
        break;
      }
      case 'tierUp': {
        if (current.abroad || current.tier === 1) return this.findClub('up');
        const target = (current.tier - 1) as Tier;
        pool = others(this.homeClubs.filter((c) => c.tier === target && c.prestige <= p.rating + 6));
        if (!pool.length) pool = this.homeClubs.filter((c) => c.tier === target).sort((a, b) => a.prestige - b.prestige).slice(0, 2);
        break;
      }
      case 'down':
        pool = others(this.homeClubs).filter((c) => c.prestige < current.prestige && c.prestige >= current.prestige - 14);
        break;
      case 'abroad':
        pool = others(this.abroadClubs).filter((c) => c.prestige <= Math.max(p.rating + 6, 64));
        break;
      case 'abroadUp':
        pool = others(this.abroadClubs).filter((c) => c.prestige > current.prestige && c.prestige <= p.rating + 6);
        break;
      case 'home': {
        const home = this.regionClubs(p.setup.dept).filter((c) => c.tier === 1 || c.tier === 2);
        pool = others(home);
        if (!pool.length) pool = others(this.homeClubs).filter((c) => c.tier === 1 && c.prestige <= p.rating + 4);
        break;
      }
      case 'any': {
        const list = current.abroad ? this.abroadClubs : this.homeClubs;
        pool = others(list).filter(
          (c) => Math.abs(c.prestige - current.prestige) <= 8 && c.prestige <= Math.max(current.prestige, p.rating + 4),
        );
        break;
      }
    }
    if (!pool.length) return null;
    // Preferir el club de mayor nivel posible, con algo de azar; afuera, los de su confederación pesan el doble.
    const near = (c: Club) => (c.abroad && countryOf(c.country).conf === this.home.conf ? 2 : 1);
    return weightedPick(rng, pool, (c) => Math.exp((c.prestige - current.prestige) / 8) * near(c));
  }
}

// ---------- Resumen final ----------

export interface CareerSummary {
  apps: number;
  goals: number;
  assists: number;
  clubs: { club: Club; from: string; to: string; apps: number; goals: number }[];
  titles: string[];
  verdict: ReturnType<typeof verdictFor>;
  score: number;
}

export function summarize(p: Player): CareerSummary {
  const home = countryOf(p.setup.country);
  const apps = p.seasons.reduce((s, r) => s + r.apps, 0);
  const goals = p.seasons.reduce((s, r) => s + r.goals, 0);
  const assists = p.seasons.reduce((s, r) => s + r.assists, 0);
  const clubs: CareerSummary['clubs'] = [];
  for (const r of p.seasons) {
    const last = clubs.at(-1);
    if (last && last.club.id === r.clubId) {
      last.to = r.label;
      last.apps += r.apps;
      last.goals += r.goals;
    } else {
      clubs.push({ club: viewClub(clubById(r.clubId), home), from: r.label, to: r.label, apps: r.apps, goals: r.goals });
    }
  }
  // Ligas del país del jugador: la primera vale como Liga Nacional y las de ascenso como Primera y Segunda.
  const count = (league: string) => p.titles.filter((t) => isLeagueTitle(t, league)).length;
  const ln = count(home.leagues[0]);
  const lower = home.leagues.slice(1).reduce((t, l) => t + count(l), 0);
  const other = p.titles.length - ln - lower;
  const mundial = p.flags.mundial ?? 0;
  // Un club top del extranjero, medido igual para todas las nacionalidades (como se vería desde Guatemala).
  const abroadTop = clubs.some((c) => c.club.abroad && clubById(c.club.id).prestige + countryOf(c.club.country).level >= 82);
  const firstDivApps = p.seasons.filter((s) => s.tier <= 1).reduce((s, r) => s + r.apps, 0);
  const awardPoints = p.seasons.flatMap((s) => s.awards).reduce((t, a) => t + AWARD_POINTS[a.kind], 0);
  // Entero: es lo que se muestra y lo que ordena el ranking.
  const score = Math.round(
    ln * 8 + lower * 2 + other * 10 + goals * 0.2 + p.caps * 0.5 + awardPoints + mundial * 60 +
    (abroadTop ? 15 : 0) + p.fame * 0.15 + (p.peakRating - 60) * 1.2 + firstDivApps * 0.05,
  );

  return { apps, goals, assists, clubs, titles: p.titles, verdict: verdictFor(score, home.adj), score };
}

// Cada veredicto trae su carta, de la más rara a la más común.
export type CardTier = 'icono' | 'heroe' | 'salon' | 'oro' | 'plata' | 'bronce';

const VERDICTS: [number, string, string, CardTier][] = [
  [230, 'Leyenda', 'Tu nombre se canta en los estadios de todo el país.', 'icono'],
  [170, 'Ídolo nacional', 'Los patojos piden tu camisola en el mercado.', 'heroe'],
  [120, 'Referente de la Liga', 'Una carrera que se recuerda con respeto.', 'salon'],
  [70, 'Jugador de culto', 'Tu afición te recuerda con cariño.', 'oro'],
  [38, 'Cumplidor', 'Profesional, constante y sin escándalos.', 'plata'],
  [-999, 'Promesa que no fue', 'El fútbol a veces no devuelve lo que uno le da.', 'bronce'],
];

/** adj: gentilicio para la leyenda ("Leyenda chapina"). Sin él (el ranking mezcla países) queda "Leyenda". */
export function verdictFor(score: number, adj?: string) {
  const [min, title, line, tier] = VERDICTS.find(([min]) => score >= min)!;
  return { title: adj && min === VERDICTS[0][0] ? `${title} ${adj}` : title, line, tier };
}
