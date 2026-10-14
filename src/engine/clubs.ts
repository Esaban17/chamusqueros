// Clubes de Guatemala por división y destinos en el extranjero.
// Los datos de cada equipo (nombre, ciudad, departamento, colores) están en ./data/teams.ts.
// prestige: nivel del club (35-95). Un titular necesita una valoración cercana a este número.
// Los escudos se cargan desde /escudos/<id>.png si el archivo existe; si no, se dibuja un escudo con iniciales.
import { LIGA_NACIONAL, PRIMERA_DIVISION, SEGUNDA_DIVISION, type TeamData } from './data/teams';
import type { Tier } from './types';

export interface Club {
  id: string;
  tier: Tier; // 1 Liga Nacional, 2 Primera División, 3 Segunda División, 0 extranjero
  name: string;
  short: string; // 3 letras para escudos genéricos
  city: string;
  dept?: string;
  colors: [string, string];
  prestige: number;
  abroad: boolean;
  league: string; // nombre del torneo para los títulos
}

export const DEPARTAMENTOS = [
  'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula', 'El Progreso', 'Escuintla', 'Guatemala',
  'Huehuetenango', 'Izabal', 'Jalapa', 'Jutiapa', 'Petén', 'Quetzaltenango', 'Quiché', 'Retalhuleu',
  'Sacatepéquez', 'San Marcos', 'Santa Rosa', 'Sololá', 'Suchitepéquez', 'Totonicapán', 'Zacapa',
] as const;

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

function build(list: TeamData[], tier: 1 | 2 | 3): Club[] {
  const used = new Set<string>();
  return list.map((t) => {
    let id = tier === 1 ? ligaId(t.name) : `${tier === 2 ? 'p' : 's'}-${slug(t.name)}`;
    while (used.has(id)) id += '-2';
    used.add(id);
    const h = hash(t.name);
    const prestige = tier === 1 ? (LIGA_PRESTIGE[id] ?? 60) : tier === 2 ? 46 + (h % 9) : 36 + (h % 8); // 46-54 y 36-43
    return {
      id,
      tier,
      name: t.name,
      short: shortName(t.name),
      city: t.city,
      dept: t.dept,
      colors: t.colors ?? PALETTE[h % PALETTE.length],
      prestige,
      abroad: false,
      league: tier === 1 ? 'Liga Nacional' : tier === 2 ? 'Primera División' : 'Segunda División',
    };
  });
}

export const GT_CLUBS: Club[] = [...build(LIGA_NACIONAL, 1), ...build(PRIMERA_DIVISION, 2), ...build(SEGUNDA_DIVISION, 3)];

// Destinos en el extranjero sin nombres de clubes reales, ordenados por nivel.
export const ABROAD_CLUBS: Club[] = [
  { id: 'sv', tier: 0, name: 'un club de El Salvador', short: 'SLV', city: 'El Salvador', colors: ['#0F47AF', '#FFFFFF'], prestige: 62, abroad: true, league: 'Liga de El Salvador' },
  { id: 'hn', tier: 0, name: 'un club de Honduras', short: 'HON', city: 'Honduras', colors: ['#00BCE4', '#FFFFFF'], prestige: 67, abroad: true, league: 'Liga de Honduras' },
  { id: 'usl', tier: 0, name: 'un club de la USL', short: 'USL', city: 'Estados Unidos', colors: ['#2B2D42', '#EF233C'], prestige: 70, abroad: true, league: 'USL Championship' },
  { id: 'cr', tier: 0, name: 'un club de Costa Rica', short: 'CRC', city: 'Costa Rica', colors: ['#002B7F', '#CE1126'], prestige: 72, abroad: true, league: 'Liga de Costa Rica' },
  { id: 'mls', tier: 0, name: 'un club de la MLS', short: 'MLS', city: 'Estados Unidos', colors: ['#0B1F3A', '#D7263D'], prestige: 79, abroad: true, league: 'MLS' },
  { id: 'mx', tier: 0, name: 'un club de la Liga MX', short: 'LMX', city: 'México', colors: ['#006341', '#C8102E'], prestige: 82, abroad: true, league: 'Liga MX' },
  { id: 'esp2', tier: 0, name: 'un club de Segunda de España', short: 'ESP', city: 'España', colors: ['#AA151B', '#F1BF00'], prestige: 84, abroad: true, league: 'Segunda de España' },
  { id: 'eur', tier: 0, name: 'un club de primera en Europa', short: 'EUR', city: 'Europa', colors: ['#003399', '#FFCC00'], prestige: 89, abroad: true, league: 'una liga de primera en Europa' },
];

export const ALL_CLUBS = [...GT_CLUBS, ...ABROAD_CLUBS];
const BY_ID = new Map(ALL_CLUBS.map((c) => [c.id, c]));

export const clubById = (id: string): Club => {
  const club = BY_ID.get(id);
  if (!club) throw new Error(`Club desconocido: ${id}`);
  return club;
};

/** Ids de clubes por departamento, para el debut y para volver a casa. */
export const HOME_CLUBS_BY_DEPT: Partial<Record<string, string[]>> = {};
for (const c of GT_CLUBS) {
  if (!c.dept) continue;
  (HOME_CLUBS_BY_DEPT[c.dept] ??= []).push(c.id);
}
