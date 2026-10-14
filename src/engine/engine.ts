import { ABROAD_CLUBS, GT_CLUBS, HOME_CLUBS_BY_DEPT, clubById, type Club } from './clubs';
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
export const LEAGUE_NAME: Record<Tier, string> = { 0: '', 1: 'Liga Nacional', 2: 'Primera División', 3: 'Segunda División' };

// Rivales de la Selección con una fuerza aproximada (Guatemala ronda 64-70). Ficción: solo sirve para simular marcadores.
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
type Competition = [name: string, weight: number, rivals: Rival[]];

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
  private usedOnce = new Set<string>();
  private lastSeen = new Map<string, number>();
  private recentCategories: EventCategory[] = [];
  private block = 0;
  private suitor: Club | null = null;
  private pending: GameEvent | null = null;

  constructor(setup: PlayerSetup, seed = Date.now()) {
    this.rng = createRng(seed);
    const rng = this.rng;
    const potential = Math.round(clamp(56 + ((rng() + rng() + rng()) / 3) * 36 + randRange(rng, -4, 4), 54, 94));
    this.player = {
      setup: { ...setup, avatar: { ...setup.avatar } },
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
    return clubById(this.player.clubId);
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
    const tier = weightedPick(rng, [3, 2, 1] as Tier[], (t) => ({ 3: 0.45, 2: 0.35, 1: 0.2 })[t as 1 | 2 | 3]);
    const local = (HOME_CLUBS_BY_DEPT[dept] ?? []).map(clubById);
    const localTier = local.filter((c) => c.tier === tier);
    if (localTier.length) return pick(rng, localTier);
    if (local.length && chance(rng, 0.6)) return pick(rng, local);
    return pick(rng, GT_CLUBS.filter((c) => c.tier === tier));
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
    const tournaments = club.abroad ? [`${club.league} ${p.year + 1}`] : [`Apertura ${p.year}`, `Clausura ${p.year + 1}`];
    for (const t of tournaments) {
      const base = club.abroad ? 0.1 : tier === 1 ? clamp(0.1 * Math.exp((club.prestige - 68) / 6), 0.03, 0.42) : 0.09;
      if (apps >= 5 && chance(rng, base * (0.8 + 0.5 * contribution))) {
        titles.push(club.abroad ? t : `${LEAGUE_NAME[tier]} · ${t}`);
      }
    }
    if (apps >= 10) {
      if (tier === 1 && titles.length > 0 && chance(rng, 0.14)) titles.push(`Copa Centroamericana ${p.year}`);
      if (['mx', 'mls'].includes(club.id) && chance(rng, 0.05)) titles.push(`Concacaf Champions Cup ${p.year + 1}`);
    }
    p.titles.push(...titles);
    if ((tier === 2 || tier === 3) && titles.length) p.flags.ascenso = 1;

    // Premios individuales
    const leagueName = club.abroad ? club.league : LEAGUE_NAME[tier];
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

    const nt = this.simulateNationalTeam(goals, apps);

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
    this.progress(apps / MATCHES[tier], titles.length, goals);
    this.checkPlayingTime(record);
    p.age++;
    p.year++;
    return record;
  }

  private simulateNationalTeam(clubGoals: number, apps: number): SeasonRecord['nt'] {
    const p = this.player;
    const rng = this.rng;
    const club = this.club;
    const visible = club.abroad || club.tier === 1;
    const debut = p.caps === 0;
    const matches: NtMatch[] = [];

    // Convocatorias y bajas automáticas (los eventos de Selección aceleran este camino).
    if (p.ntLevel > 0 && (p.rating < 60 || p.age >= 36 || p.flags.sel_retirado)) {
      p.ntLevel = 0;
    } else if (p.age >= 19 && visible && apps >= 10) {
      if (p.ntLevel === 0 && p.rating >= 71 && chance(rng, 0.3)) this.setNtLevel(1);
      else if (p.ntLevel === 1 && p.rating >= 72 && chance(rng, 0.3)) this.setNtLevel(2);
      else if (p.ntLevel === 2 && p.rating >= 77 && chance(rng, 0.2)) this.setNtLevel(3);
    }

    if (p.ntLevel > 0) {
      const caps = { 1: randInt(rng, 1, 3), 2: randInt(rng, 4, 8), 3: randInt(rng, 7, 11) }[p.ntLevel as 1 | 2 | 3];
      p.caps += caps;
      const rate = { POR: 0, DEF: 0.04, MED: 0.1, DEL: 0.3 }[p.setup.position];
      const goals = Math.round(caps * rate * randRange(rng, 0.5, 1.5) * (clubGoals > 0 ? 1 : 0.6));
      p.natGoals += goals;
      p.fame += caps * 0.6;
      const summer = p.year + 1;
      const wc = nextWorldCup(summer);
      const comps: Competition[] = [['Amistoso', 1, FRIENDLIES], ['Liga de Naciones', 1.5, NATIONS_LEAGUE]];
      if (wc - summer <= 2) comps.push([`Eliminatoria Mundial ${wc}`, 3, CONCACAF]);
      if (summer % 2 === 1) comps.push([`Copa Oro ${summer}`, 2, CONCACAF]);
      matches.push(...this.ntMatches(comps, caps, goals));
      if (summer % 2 === 1 && p.ntLevel >= 2 && chance(rng, 0.12 + Math.max(0, p.rating - 72) * 0.01)) {
        p.milestones.push(`Semifinal de Copa Oro ${summer}`);
        p.fame += 8;
      }
    }

    // Mundial: se decide al final de la temporada que termina en año mundialista.
    const summer = p.year + 1;
    if (summer >= FIRST_WORLD_CUP && (summer - FIRST_WORLD_CUP) % 4 === 0) {
      if (p.ntLevel > 0) {
        const q = clamp(0.012 + p.wcProgress * 0.06 + (p.ntLevel - 1) * 0.015 + Math.max(0, p.rating - 74) * 0.004, 0.01, 0.35);
        if (chance(rng, q)) {
          p.flags.mundial = (p.flags.mundial ?? 0) + 1;
          p.milestones.push(`Jugó el Mundial ${summer} con Guatemala`);
          p.fame += 30;
          const wcGoal = chance(rng, { POR: 0, DEF: 0.12, MED: 0.25, DEL: 0.45 }[p.setup.position]);
          if (wcGoal) {
            p.milestones.push(`Gol en el Mundial ${summer}`);
            p.fame += 15;
            p.natGoals++;
          }
          // Fase de grupos: tres partidos.
          p.caps += 3;
          matches.push(...this.ntMatches([[`Mundial ${summer}`, 1, WORLD_CUP]], 3, wcGoal ? 1 : 0));
        } else if (p.wcProgress >= 2) {
          p.milestones.push(`Eliminado en la recta final rumbo al Mundial ${summer}`);
        }
      }
      p.wcProgress = 0;
      // Las banderas de la eliminatoria valen solo para un ciclo mundialista.
      for (const f of ['sel_elim_fuera', 'sel_elim_decidido', 'sel_repechaje']) delete p.flags[f];
    }
    void apps;
    return matches.length ? { debut, matches } : undefined;
  }

  /** Arma los partidos de la temporada con la Selección y reparte entre ellos los goles del jugador. */
  private ntMatches(comps: Competition[], n: number, goals: number): NtMatch[] {
    const rng = this.rng;
    const gt = 64 + (this.player.rating - 70) * 0.25 + this.player.ntLevel;
    const matches: NtMatch[] = [];
    for (let i = 0; i < n; i++) {
      const [comp, , rivals] = weightedPick(rng, comps, (c) => c[1]);
      const played = matches.filter((m) => m.comp === comp).map((m) => m.rival);
      const fresh = rivals.filter(([name]) => !played.includes(name));
      const [rival, strength] = pick(rng, fresh.length ? fresh : rivals);
      const gf = poisson(rng, 1.2 * Math.exp((gt - strength) / 20));
      const ga = poisson(rng, 1.2 * Math.exp((strength - gt) / 20));
      matches.push({ comp, rival, gf, ga, goals: 0 });
    }
    for (let g = 0; g < goals; g++) {
      const m = pick(rng, matches);
      m.goals++;
      m.gf = Math.max(m.gf, m.goals);
    }
    return matches;
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
    const fits = GT_CLUBS.filter((c) => c.id !== current.id && c.prestige < current.prestige && c.prestige <= p.rating + 3);
    const dest = fits.length
      ? weightedPick(this.rng, fits, (c) => Math.exp((c.prestige - current.prestige) / 6))
      : GT_CLUBS.filter((c) => c.tier === 3 && c.id !== current.id).sort((a, b) => a.prestige - b.prestige)[0];
    if (!dest) return;
    p.clubId = dest.id;
    p.coach = 55;
    const tierNote = dest.tier !== current.tier ? ` (${LEAGUE_NAME[dest.tier]})` : '';
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
      title: template.title,
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
      target.abroad ? 'del extranjero' : target.tier < current.tier ? `de ${LEAGUE_NAME[target.tier]}` : 'de otro club';
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
      changes.push(`+${e.natGoals} gol${e.natGoals > 1 ? 'es' : ''} con Guatemala`);
    }
    if (e.wcProgress) {
      p.wcProgress = clamp(p.wcProgress + e.wcProgress, 0, 3);
      changes.push('Guatemala avanza en la eliminatoria');
    }
    const dest = e.transferTo
      ? clubById(e.transferTo)
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
        pool = others([...GT_CLUBS, ...(abroadOk ? ABROAD_CLUBS : [])]).filter(
          (c) =>
            c.prestige > current.prestige + 1 &&
            c.prestige <= p.rating + 5 &&
            (c.abroad || current.abroad || c.tier >= current.tier - 1),
        );
        break;
      }
      case 'tierUp': {
        if (current.abroad || current.tier === 1) return this.findClub('up');
        const target = (current.tier === 3 ? 2 : 1) as Tier;
        pool = others(GT_CLUBS.filter((c) => c.tier === target && c.prestige <= p.rating + 6));
        if (!pool.length) pool = GT_CLUBS.filter((c) => c.tier === target).sort((a, b) => a.prestige - b.prestige).slice(0, 2);
        break;
      }
      case 'down':
        pool = others(GT_CLUBS).filter((c) => c.prestige < current.prestige && c.prestige >= current.prestige - 14);
        break;
      case 'abroad':
        pool = others(ABROAD_CLUBS).filter((c) => c.prestige <= Math.max(p.rating + 6, 64));
        break;
      case 'abroadUp':
        pool = others(ABROAD_CLUBS).filter((c) => c.prestige > current.prestige && c.prestige <= p.rating + 6);
        break;
      case 'home': {
        const home = (HOME_CLUBS_BY_DEPT[p.setup.dept] ?? []).map(clubById).filter((c) => c.tier === 1 || c.tier === 2);
        pool = others(home);
        if (!pool.length) pool = others(GT_CLUBS).filter((c) => c.tier === 1 && c.prestige <= p.rating + 4);
        break;
      }
      case 'any': {
        const list = current.abroad ? ABROAD_CLUBS : GT_CLUBS;
        pool = others(list).filter(
          (c) => Math.abs(c.prestige - current.prestige) <= 8 && c.prestige <= Math.max(current.prestige, p.rating + 4),
        );
        break;
      }
    }
    if (!pool.length) return null;
    // Preferir el club de mayor nivel posible, con algo de azar.
    return weightedPick(rng, pool, (c) => Math.exp((c.prestige - current.prestige) / 8));
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
      clubs.push({ club: clubById(r.clubId), from: r.label, to: r.label, apps: r.apps, goals: r.goals });
    }
  }
  const count = (prefix: string) => p.titles.filter((t) => t.startsWith(prefix)).length;
  const ln = count('Liga Nacional');
  const lower = count('Primera División') + count('Segunda División');
  const other = p.titles.length - ln - lower;
  const mundial = p.flags.mundial ?? 0;
  const abroadTop = clubs.some((c) => ['mx', 'esp2', 'eur'].includes(c.club.id));
  const firstDivApps = p.seasons.filter((s) => s.tier <= 1).reduce((s, r) => s + r.apps, 0);
  const awardPoints = p.seasons.flatMap((s) => s.awards).reduce((t, a) => t + AWARD_POINTS[a.kind], 0);
  // Entero: es lo que se muestra y lo que ordena el ranking.
  const score = Math.round(
    ln * 8 + lower * 2 + other * 10 + goals * 0.2 + p.caps * 0.5 + awardPoints + mundial * 60 +
    (abroadTop ? 15 : 0) + p.fame * 0.15 + (p.peakRating - 60) * 1.2 + firstDivApps * 0.05,
  );

  return { apps, goals, assists, clubs, titles: p.titles, verdict: verdictFor(score), score };
}

// Cada veredicto trae su carta, de la más rara a la más común.
export type CardTier = 'icono' | 'heroe' | 'salon' | 'oro' | 'plata' | 'bronce';

const VERDICTS: [number, string, string, CardTier][] = [
  [230, 'Leyenda chapina', 'Tu nombre se canta en los estadios de todo el país.', 'icono'],
  [170, 'Ídolo nacional', 'Los patojos piden tu camisola en el mercado.', 'heroe'],
  [120, 'Referente de la Liga', 'Una carrera que se recuerda con respeto.', 'salon'],
  [70, 'Jugador de culto', 'Tu afición te recuerda con cariño.', 'oro'],
  [38, 'Cumplidor', 'Profesional, constante y sin escándalos.', 'plata'],
  [-999, 'Promesa que no fue', 'El fútbol a veces no devuelve lo que uno le da.', 'bronce'],
];

export function verdictFor(score: number) {
  const [, title, line, tier] = VERDICTS.find(([min]) => score >= min)!;
  return { title, line, tier };
}
