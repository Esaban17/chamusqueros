// Jugar para otro país: ascendencia oculta, elegibilidad (regla FIFA simplificada) y residencia para naturalizarse.
// Puro, sin DOM. La Selección que representa un jugador es p.cambioSel?.to; sin cambio, su nacionalidad de origen.
import { clubById } from './clubs';
import { COUNTRIES, CONFED_CUP, countryOf, type Country } from './countries';
import { chance, weightedPick, type Rng } from './rng';
import type { Player } from './types';

/** Probabilidad de que una carrera nueva tenga ascendencia de otro país. */
export const P_HERENCIA = 0.25;

/**
 * Países de ascendencia posibles de cada nacionalidad, con más peso para las diásporas reales.
 * Guatemala nunca es destino (ponytail: evita textos chapines en carreras de otros países; se abre a futuro si hace falta).
 */
// prettier-ignore
export const DIASPORA: Record<string, [code: string, weight: number][]> = {
  GT: [['US', 4], ['MX', 3], ['ES', 2], ['SV', 1]],
  MX: [['US', 5], ['ES', 2], ['CO', 1]],
  US: [['MX', 4], ['EN', 2], ['DE', 2], ['IT', 1], ['JP', 1]],
  CR: [['US', 3], ['ES', 2], ['PA', 1]],
  HN: [['US', 4], ['ES', 2], ['SV', 1], ['MX', 1]],
  SV: [['US', 5], ['MX', 2], ['ES', 1], ['HN', 1]],
  PA: [['US', 3], ['CO', 2], ['ES', 2], ['CR', 1]],
  AR: [['IT', 4], ['ES', 3], ['FR', 1], ['UY', 1], ['PY', 1]],
  BR: [['IT', 3], ['PT', 3], ['DE', 2], ['JP', 2]],
  CO: [['ES', 3], ['US', 3], ['VE', 1], ['IT', 1]],
  UY: [['IT', 3], ['ES', 3], ['AR', 2], ['BR', 1]],
  CL: [['ES', 3], ['IT', 2], ['DE', 1], ['AR', 1]],
  PE: [['ES', 3], ['IT', 2], ['JP', 2], ['US', 1]],
  EC: [['ES', 3], ['US', 3], ['IT', 1]],
  PY: [['ES', 3], ['AR', 2], ['DE', 1], ['BR', 1]],
  BO: [['ES', 3], ['AR', 2], ['BR', 2], ['US', 1]],
  VE: [['ES', 3], ['IT', 3], ['CO', 2], ['PT', 2], ['US', 1]],
  ES: [['AR', 3], ['FR', 2], ['MA', 2], ['DE', 1], ['CO', 1]],
  EN: [['US', 3], ['ES', 2], ['IT', 1], ['DE', 1], ['PT', 1]],
  IT: [['AR', 4], ['BR', 2], ['US', 2], ['DE', 1], ['FR', 1]],
  DE: [['IT', 3], ['ES', 2], ['US', 2], ['MA', 1]],
  FR: [['MA', 3], ['PT', 3], ['ES', 2], ['IT', 2]],
  PT: [['BR', 4], ['FR', 3], ['ES', 2], ['DE', 1]],
  NL: [['MA', 3], ['DE', 2]],
  JP: [['BR', 4], ['US', 2], ['ES', 1]],
  SA: [['US', 3], ['EN', 2], ['MA', 1]],
  MA: [['FR', 5], ['ES', 3], ['NL', 2], ['DE', 1], ['IT', 1]],
};

// Se valida al cargar (como los nombres de liga repetidos en countries.ts): cada origen tiene de 2 a 5 destinos
// que existen, que no son él mismo ni Guatemala.
for (const c of COUNTRIES) {
  const list = DIASPORA[c.code];
  if (!list || list.length < 2 || list.length > 5) throw new Error(`Diáspora de ${c.code}: se esperan de 2 a 5 destinos`);
  for (const [to] of list) {
    if (to === c.code || to === 'GT' || countryOf(to).code !== to) throw new Error(`Diáspora de ${c.code}: destino inválido ${to}`);
  }
}

/** Sortea la ascendencia de una carrera nueva: 25 % de tenerla, por la madre o por el padre (mitad y mitad). */
export function sortearHerencia(rng: Rng, origen: string): Player['herencia'] {
  if (!chance(rng, P_HERENCIA)) return undefined;
  const [country] = weightedPick(rng, DIASPORA[origen] ?? [], ([, w]) => w);
  return country ? { country, side: chance(rng, 0.5) ? 'madre' : 'padre' } : undefined;
}

/** Selección que representa hoy el jugador (el origen si nunca cambió). */
export const seleccionDe = (p: Player): Country => countryOf(p.cambioSel?.to ?? p.setup.country);

/** Torneo final: un Mundial o la copa de cualquier confederación. */
const esTorneoFinal = (comp: string) => comp.startsWith('Mundial') || Object.values(CONFED_CUP).some((c) => comp.startsWith(c));

/**
 * Regla FIFA simplificada: puede cambiar quien no jugó con la Selección mayor, o jugó 3 o menos, todos antes de los 21
 * y ninguno en un torneo final. ponytail: los amistosos cuentan como partidos que atan (la FIFA real los distingue).
 */
export function elegible(p: Player): boolean {
  if (p.caps === 0) return true;
  if (p.caps > 3 || (p.flags.cap_tarde ?? 0) > 0 || (p.flags.cap_final ?? 0) > 0) return false;
  return !p.seasons.some((r) => r.nt?.matches.some((m) => esTorneoFinal(m.comp)));
}

/**
 * Temporadas seguidas, contando desde la última, en clubes del mismo país (solo las que empezó con 18 años o más).
 * null si el país es el de origen (no hay nada que naturalizar). Cambiar de club dentro del país no reinicia la cuenta.
 */
export function residencia(p: Player): { code: string; n: number } | null {
  let code = '';
  let n = 0;
  for (const r of [...p.seasons].reverse()) {
    const c = clubById(r.clubId).country;
    if (!code) code = c;
    else if (c !== code) break;
    if (r.age >= 18) n++;
  }
  return code && code !== p.setup.country ? { code, n } : null;
}
