// Clubes de todos los países por división.
// Los datos de cada equipo (nombre, ciudad, departamento, colores) están en ./data; los países, en ./countries.ts.
// prestige: nivel del club (35-95) visto desde su propio país. Un titular necesita una valoración cercana a este número.
// Los escudos se cargan desde /escudos/<id>.png si el archivo existe; si no, se dibuja un escudo con iniciales.
import { COUNTRIES, countryOf, type Country } from './countries';
import type { TeamData } from './data/teams';
import type { Tier } from './types';

export interface Club {
  id: string;
  country: string; // código del país
  tier: Tier; // división en su país (1 primera); 0 en la vista de un jugador extranjero (ver viewClub)
  name: string;
  short: string; // 3 letras para escudos genéricos
  city: string;
  dept?: string;
  stadium?: string; // estadio de local; vacío si no se confirmó
  rival?: string; // rival de clásico
  colors: [string, string];
  prestige: number;
  abroad: boolean; // true solo en la vista de un jugador de otra nacionalidad
  league: string; // nombre del torneo para los títulos
}

// Nivel de los clubes de Liga Nacional (por historia y presupuesto). Los que no aparecen toman 60.
const LIGA_PRESTIGE: Record<string, number> = {
  municipal: 76, comunicaciones: 75, antigua: 72, xelaju: 70, coban: 68, guastatoya: 68,
  malacateco: 66, mixco: 64, marquense: 62, suchitepequez: 61, aurora: 61, 'san-pedro': 58,
};

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const slug = (s: string) => strip(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
const FILLER = /^(CLUB|DEPORTIVO|DEPOR|CD|CSD|CF|FC|MC|GFC|SOCIAL|Y|DE|DEL|LA|EL|LOS|ATLETICO|SPORT|ASOCIACION)$/;
function shortName(name: string) {
  const words = strip(name).toUpperCase().split(/[^A-Z0-9]+/).filter((w) => w && !FILLER.test(w));
  const base = words[0] ?? strip(name).toUpperCase();
  return (words.length >= 3 ? words.map((w) => w[0]).join('') : base).slice(0, 3);
}
/** Id de Liga Nacional: palabra clave del nombre ("Cobán Imperial" → "coban"). */
function ligaId(name: string) {
  const s = slug(name);
  return Object.keys(LIGA_PRESTIGE).find((k) => s.includes(k)) ?? s;
}
const PALETTE: [string, string][] = [
  ['#1E4FA0', '#FFFFFF'], ['#B5121B', '#FFFFFF'], ['#0B7A3B', '#FFFFFF'], ['#E2B007', '#1A1A1A'],
  ['#5B2C83', '#FFFFFF'], ['#1A1A1A', '#F2C230'], ['#D35400', '#FFFFFF'], ['#00838F', '#FFFFFF'],
];

/** Mismo rango de nivel para cada división en todos los países; el orden de la lista va del más fuerte al más débil. */
const RANGE: Record<1 | 2 | 3, [number, number]> = { 1: [58, 76], 2: [46, 54], 3: [36, 43] };

function build(country: Country, list: TeamData[], tier: 1 | 2 | 3, league: string, used: Set<string>): Club[] {
  const gt = country.code === 'GT';
  return list.map((t, i) => {
    // Guatemala conserva sus ids (escudos y carreras guardadas); el resto lleva el código del país para no chocar.
    let id = !gt ? `${country.code.toLowerCase()}-${slug(t.name)}` : tier === 1 ? ligaId(t.name) : `${tier === 2 ? 'p' : 's'}-${slug(t.name)}`;
    while (used.has(id)) id += '-2';
    used.add(id);
    const h = hash(t.name);
    const [lo, hi] = RANGE[tier];
    const prestige = gt
      ? tier === 1 ? (LIGA_PRESTIGE[id] ?? 60) : tier === 2 ? 46 + (h % 9) : 36 + (h % 8) // 46-54 y 36-43
      : Math.round(hi - ((hi - lo) * i) / Math.max(1, list.length - 1));
    return {
      id,
      country: country.code,
      tier,
      name: t.name,
      short: shortName(t.name),
      city: t.city,
      dept: t.dept,
      stadium: t.stadium,
      rival: t.rival,
      colors: t.colors ?? PALETTE[h % PALETTE.length],
      prestige,
      abroad: false,
      league,
    };
  });
}

const used = new Set<string>();
export const ALL_CLUBS: Club[] = COUNTRIES.flatMap((c) =>
  c.teams.leagues.slice(0, 3).flatMap((l, i) => build(c, l.teams, (i + 1) as 1 | 2 | 3, l.name, used)),
);
const BY_ID = new Map(ALL_CLUBS.map((c) => [c.id, c]));

export const clubById = (id: string): Club => {
  const club = BY_ID.get(id);
  if (!club) throw new Error(`Club desconocido: ${id}`);
  return club;
};

/** Clubes de un país, de primera hacia abajo. */
export const clubsOf = (code: string) => ALL_CLUBS.filter((c) => c.country === code);

/**
 * El club visto por un jugador de esa nacionalidad: en su país, tal cual; afuera es "extranjero" (tier 0) y su nivel
 * se corre por la diferencia entre ligas. ponytail: un solo número por país; los clubes de afuera conservan su orden.
 */
export function viewClub(c: Club, home: Country): Club {
  if (c.country === home.code) return c;
  return { ...c, abroad: true, tier: 0, prestige: c.prestige + countryOf(c.country).level - home.level };
}

/** Ids de clubes por país y departamento (o región), para el debut y para volver a casa. */
export const HOME_CLUBS_BY_DEPT: Record<string, Partial<Record<string, string[]>>> = {};
for (const c of ALL_CLUBS) {
  if (!c.dept) continue;
  ((HOME_CLUBS_BY_DEPT[c.country] ??= {})[c.dept] ??= []).push(c.id);
}
