// Palmarés y momento más destacado de una carrera, con sus imágenes en SVG. Lo usan los resúmenes y la tarjeta para compartir.
import { CLUB_CUPS, type CareerSummary } from '../engine/engine';
import { AWARD_LABEL_ES } from '../engine/awards';
import { COUNTRIES, countryOf } from '../engine/countries';
import { seleccionDe } from '../engine/nacionalidad';
import type { AwardKind, Avatar, Player } from '../engine/types';
import { NT_KIT, avatarSVG } from './avatar';

export type TrophyIcon = AwardKind | 'copa';

/** Trazos de 24x24 (stroke, sin relleno) de cada trofeo o premio. */
export const ICON: Record<TrophyIcon, string> = {
  copa: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/>',
  goleador: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5l4 2.9-1.5 4.6h-5L8 10.4z"/>',
  asistidor: '<path d="M4 19c3-7 8-10 15-10"/><path d="M15 5l4 4-4 4"/>',
  portero: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v4m0-5.5a1.5 1.5 0 0 1 3 0V10m0-4a1.5 1.5 0 0 1 3 0v5m0-2a1.5 1.5 0 0 1 3 0v5a6 6 0 0 1-6 6h-1.5A6.5 6.5 0 0 1 4 15.5V13a1.5 1.5 0 0 1 3-.5"/>',
  joven: '<path d="M12 21v-9M12 12c0-4-3-7-8-7 0 4 3 7 8 7zM12 14c0-3 2.5-6 7-6 0 3.5-2.5 6-7 6z"/>',
  mvp: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  ideal: '<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3z"/><path d="M10 9.5l1.5-1V15M14 8.5V15"/>',
  // Premios de specs/trofeos-reales: balón sobre una peana, bota con tapones y estrella con laurel. Sirven de respaldo de la imagen y para la carta.
  balon: '<circle cx="12" cy="9" r="6"/><path d="M12 6.4l2.2 1.6-.8 2.6h-2.8L9.8 8z"/><path d="M9.5 16L9 20.5M14.5 16l.5 4.5M7 21h10"/>',
  bota: '<path d="M5 4h6l.5 5c1.5 1 4 1.5 7 2.5 1.5.5 2.5 1.5 2.5 3V17H3V9c0-2 1-4 2-5z"/><path d="M6 17v3M11 17v3M16 17v3"/>',
  golden: '<path d="M12 4l1.9 4 4.4.6-3.2 3.1.8 4.4L12 14l-3.9 2.1.8-4.4L5.7 8.6l4.4-.6z"/><path d="M4.5 9c-1 4 .5 8 4.5 10.5M19.5 9c1 4-.5 8-4.5 10.5"/>',
};

export const AWARD_LABEL: Record<AwardKind, string> = {
  goleador: 'Goleador',
  asistidor: 'Máximo asistidor',
  portero: 'Guardameta menos vencido',
  joven: 'Jugador joven del año',
  mvp: 'Mejor jugador',
  ideal: 'Once ideal',
  ...AWARD_LABEL_ES,
};

/** Imagen de un trofeo: archivo de public/trofeos/ y texto alternativo. Constantes: nada de esto sale de datos de la carrera. */
export interface TrofeoImg { file: string; alt: string }
export interface PalmaresItem { icon: TrophyIcon; label: string; count: number; img?: TrofeoImg }

const AWARD_ORDER: AwardKind[] = ['balon', 'bota', 'golden', 'mvp', 'goleador', 'portero', 'asistidor', 'joven', 'ideal'];
/** Copa continental, liga del extranjero, Copa Centroamericana y después las ligas del país, de primera hacia abajo. */
const titleRank = (label: string, leagues: string[]) =>
  CLUB_CUPS.includes(label) ? 0 : label === 'Copa Centroamericana' ? 2 : leagues.includes(label) ? 3 + leagues.indexOf(label) : 1;

const COPA: TrofeoImg = { file: 'copa-dorada.svg', alt: 'Copa dorada' };
const BOTA: TrofeoImg = { file: 'bota-dorada.svg', alt: 'Bota dorada, el premio al máximo goleador' };
const trofeo = (file: string, alt: string): TrofeoImg => ({ file: `${file}.webp`, alt });
/**
 * Imagen de cada trofeo, por la etiqueta del título o del premio. Con foto o dibujo de Wikimedia Commons (licencias y autores en creditos.html),
 * o ilustración propia (copa-dorada, bota-dorada, golden-boy). Sin entrada: el premio no tiene trofeo famoso y se queda con su ícono de trazo.
 */
export const TROFEO_IMG: Record<string, TrofeoImg> = {
  'Balón de Oro': trofeo('balon-de-oro', 'Balón de Oro, trofeo dorado con forma de balón'),
  Pichichi: trofeo('pichichi', 'Trofeo Pichichi, copa de plata con dos asas'),
  'Golden Boy': { file: 'golden-boy.svg', alt: 'Golden Boy, balón dorado sobre un pedestal con una estrella' },
  'Bota de Oro': BOTA,
  Torjägerkanone: BOTA,
  Capocannoniere: BOTA,
  'Bota de Oro de la Premier League': BOTA,
  'Máximo goleador de la Ligue 1': BOTA,
  LaLiga: trofeo('laliga', 'Trofeo de LaLiga'),
  'Premier League': trofeo('premier-league', 'Trofeo de la Premier League'),
  'Serie A': trofeo('serie-a', 'Trofeo de la Serie A'),
  Bundesliga: trofeo('bundesliga', 'Meisterschale, el plato de la Bundesliga'),
  'Liga MX': trofeo('liga-mx', 'Trofeo de la Liga MX'),
  MLS: trofeo('mls', 'Trofeo de la MLS'),
  Eredivisie: trofeo('eredivisie', 'Trofeo de la Eredivisie'),
  'Liga Profesional Argentina': trofeo('argentina', 'Trofeo de la Liga Profesional Argentina'),
  'Brasileirão Série A': trofeo('brasil', 'Trofeo del Brasileirão'),
  'Liga BetPlay': trofeo('colombia', 'Trofeo de la Liga colombiana'),
  'Liga 1 de Perú': trofeo('peru', 'Trofeo de la Liga 1 de Perú'),
  'Primera División de Paraguay': trofeo('paraguay', 'Trofeo de la Primera División de Paraguay'),
  'LigaPro Serie A': trofeo('ecuador', 'Trofeo de la LigaPro de Ecuador'),
  'Primera División de Costa Rica': trofeo('costa-rica', 'Trofeo de la Primera División de Costa Rica'),
  'Champions League': trofeo('champions-league', 'Trofeo de la Champions League'),
  'Copa Libertadores': trofeo('libertadores', 'Trofeo de la Copa Libertadores'),
  'Concacaf Champions Cup': trofeo('concacaf', 'Trofeo de la Concacaf Champions Cup'),
  'Champions League de la CAF': trofeo('caf', 'Trofeo de la Champions League de la CAF'),
};
/** Todo título de club (cualquier liga o división, copa continental o Copa Centroamericana); los de Selección no entran. */
const CLUB_COMPETITIONS = new Set([...COUNTRIES.flatMap((c) => c.leagues), ...CLUB_CUPS, 'Copa Centroamericana']);
/** La imagen del trofeo; sin foto propia, un título de club lleva la copa dorada. Undefined: se dibuja el ícono de trazo. */
export const trophyImg = (label: string, icon: TrophyIcon): TrofeoImg | undefined =>
  (Object.hasOwn(TROFEO_IMG, label) ? TROFEO_IMG[label] : undefined) ?? (icon === 'copa' && CLUB_COMPETITIONS.has(label) ? COPA : undefined);
/** "Liga Nacional · Clausura 2038" y "LaLiga 2031" son el título de "Liga Nacional" y de "LaLiga". */
export const titleLabel = (t: string) => t.replace(/ · (Apertura|Clausura) \d{4}$/, '').replace(/ \d{4}$/, '');

/** Títulos agrupados por competición (sin torneo ni año) y premios por tipo, de mayor a menor importancia. */
export function palmares(p: Player): PalmaresItem[] {
  const leagues = countryOf(p.setup.country).leagues;
  const items = new Map<string, PalmaresItem & { rank: number }>();
  const add = (icon: TrophyIcon, label: string, rank: number) => {
    const it = items.get(label) ?? { icon, label, count: 0, rank };
    it.count++;
    items.set(label, it);
  };
  for (const t of p.titles) {
    const label = titleLabel(t);
    add('copa', label, titleRank(label, leagues));
  }
  // Se agrupa por el nombre propio: el Pichichi no se mezcla con el "Goleador de Liga Nacional".
  for (const a of p.seasons.flatMap((r) => r.awards)) add(a.kind, a.label ?? AWARD_LABEL[a.kind], 10 + AWARD_ORDER.indexOf(a.kind));
  return [...items.values()].sort((a, b) => a.rank - b.rank || b.count - a.count).map(({ icon, label, count }) => ({ icon, label, count, img: trophyImg(label, icon) }));
}

export interface PorSeleccion { team: string; caps: number; goals: number; titles: number }

/** Partidos, goles y títulos con cada Selección; null si el jugador nunca cambió. Los títulos salen del cierre "Campeón" de cada temporada. */
export function porSeleccion(p: Player): PorSeleccion[] | null {
  const c = p.cambioSel;
  if (!c) return null;
  const titles = (code: string) =>
    p.seasons.filter((r) => (r.nt?.team ?? c.from) === code).reduce((t, r) => t + (r.nt?.groups ?? []).filter((g) => g.out === 'Campeón').length, 0);
  return [
    { team: countryOf(c.from).name, caps: c.caps, goals: c.goals, titles: titles(c.from) },
    { team: countryOf(c.to).name, caps: p.caps - c.caps, goals: p.natGoals - c.goals, titles: titles(c.to) },
  ];
}

export type MomentKind = 'mundial' | 'gol' | 'titulo' | 'premio' | 'seleccion' | 'carrera';
export interface Moment { kind: MomentKind; kicker: string; title: string; nt: boolean }

/** Puntos extra según la división de esa temporada: lo mismo vale más en primera o afuera (0) que en las de ascenso. */
const leagueBonus = (tier: number) => (tier === 0 ? 20 : [15, 5, 0][tier - 1]);
const AWARD_BASE: Record<AwardKind, number> = { mvp: 40, goleador: 35, portero: 35, asistidor: 28, joven: 12, ideal: 12, balon: 90, bota: 55, golden: 45 };

/** El momento más importante de la carrera: el de más puntos; si empatan, el más reciente. */
export function bestMoment(p: Player, s: CareerSummary): Moment {
  let best: [number, Moment] = [0, { kind: 'carrera', kicker: 'Tu carrera', title: s.verdict.line, nt: false }];
  const add = (score: number, kind: MomentKind, kicker: string, title: string, nt = false) => {
    if (score >= best[0]) best = [score, { kind, kicker, title, nt }];
  };
  // El país del kicker sale del sufijo " con X" del hito; sin él, la Selección actual.
  const con = (m: string) => `Con ${m.match(/ con (.+)$/)?.[1] ?? seleccionDe(p).name}`;
  const nt = `Con ${seleccionDe(p).name}`;
  for (const m of p.milestones) {
    if (/^Campeón del Mundial \d/.test(m)) add(120, 'mundial', con(m), m.replace(/ con .+$/, ''), true);
    else if (/^Campeón de /.test(m)) add(88, 'seleccion', con(m), m.replace(/ con .+$/, ''), true);
    else if (/^Gol en el Mundial \d/.test(m)) add(100, 'gol', nt, m, true);
    else if (/^Jugó el Mundial \d/.test(m)) add(90, 'mundial', con(m), m.replace(/ con .+$/, ''), true);
    else if (/^Clasificó al Mundial \d/.test(m)) add(85, 'mundial', nt, m, true);
    else if (/^Héroe ante /.test(m)) add(80, 'seleccion', nt, m, true);
    else if (/^(Clasificó a los Juegos Olímpicos|Semifinal de |Capitán de la Selección)/.test(m)) add(52, 'seleccion', nt, m, true);
    else if (/^(Jugó el Mundial Sub|Debut con la Selección|Primera convocatoria)/.test(m)) add(30, 'seleccion', nt, m, true);
  }
  // Títulos: "Liga Nacional · Clausura 2038" o "LaLiga 2031" (liga del país), "MLS 2031" (liga del extranjero, tier 0),
  // "Copa Centroamericana 2030", "Concacaf Champions Cup 2032" (copas continentales).
  for (const r of p.seasons) {
    for (const t of r.titles) {
      const score = CLUB_CUPS.some((c) => t.startsWith(c)) ? 75 : t.startsWith('Copa Centroamericana') ? 52 : r.tier === 0 ? 58 : 20 + leagueBonus(r.tier) * 2;
      add(score, 'titulo', 'Campeón', t);
    }
  }
  for (const r of p.seasons) {
    for (const a of r.awards) add(AWARD_BASE[a.kind] + leagueBonus(r.tier), a.kind === 'goleador' ? 'gol' : 'premio', 'Premio individual', a.name);
  }
  return best[1];
}

// Escena del momento (880x240, sin texto: el texto lo pone quien la muestra para usar las fuentes de la página).
const STAR = 'M0-62l18 37 41 6-30 29 7 41-36-19-36 19 7-41-30-29 41-6z';
const ball = (x: number, y: number, r: number) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFFFFF" stroke="#0D1B2A" stroke-width="${r / 10}"/>
   <path transform="translate(${x} ${y}) scale(${r / 20})" d="M0-8l7.6 5.5-2.9 9h-9.4l-2.9-9z" fill="#0D1B2A"/>`;
/** Bandera con los colores de la Selección (afuera y en medio). ponytail: no dibuja la bandera real de cada país. */
const flag = (x: number, y: number, [c1, c2]: [string, string]) =>
  `<path d="M${x} ${y}v150" stroke="#C9DCEC" stroke-width="5"/>
   <path d="M${x} ${y}c40-10 80 10 150 0v92c-70 10-110-10-150 0z" fill="${c1}"/>
   <path d="M${x + 50} ${y - 3}c17 2 33 4 50 3v92c-17 1-33-1-50-3z" fill="${c2}"/>`;

function hero(kind: MomentKind, rnd: () => number, ntKit: [string, string]): string {
  switch (kind) {
    case 'titulo': {
      const confetti = Array.from({ length: 46 }, () => {
        const c = ['#F0C14B', '#FFFFFF', '#6CB4EE'][Math.floor(rnd() * 3)];
        return `<rect x="${520 + rnd() * 350}" y="${rnd() * 150}" width="7" height="12" fill="${c}" transform="rotate(${rnd() * 90} ${600 + rnd() * 200} ${rnd() * 150})"/>`;
      }).join('');
      return `${confetti}<g transform="translate(705 34)" stroke="#9A6B12" stroke-width="3">
        <path d="M22 18H4c0 26 12 38 30 40M118 18h18c0 26-12 38-30 40" fill="none" stroke="#F0C14B" stroke-width="9"/>
        <path d="M22 0h96v44c0 34-22 58-48 62-26-4-48-28-48-62z" fill="#F0C14B"/>
        <rect x="60" y="104" width="20" height="30" fill="#F0C14B"/>
        <rect x="34" y="132" width="72" height="16" rx="3" fill="#F0C14B"/>
        <rect x="26" y="148" width="88" height="22" rx="3" fill="#7A4E14"/></g>`;
    }
    case 'gol': {
      const net = [...Array.from({ length: 15 }, (_, i) => `M${704 + i * 11} 70v104`), ...Array.from({ length: 9 }, (_, i) => `M700 ${80 + i * 11}h160`)].join('');
      return `<path d="${net}" stroke="#FFFFFF" stroke-opacity=".3" stroke-width="1.5"/>
        <path d="M700 176V66h160v110" fill="none" stroke="#FFFFFF" stroke-width="8"/>${ball(806, 150, 20)}`;
    }
    case 'mundial':
      return `${flag(700, 40, ntKit)}${ball(820, 196, 28)}`;
    case 'seleccion':
      return flag(712, 46, ntKit);
    case 'premio':
      return `<path d="M752 150l-22 70 22-10 14 18 8-62zM798 150l22 70-22-10-14 18-8-62z" fill="#6CB4EE"/>
        <path transform="translate(775 104)" d="${STAR}" fill="#F0C14B" stroke="#9A6B12" stroke-width="4"/>`;
    default:
      return `<ellipse cx="780" cy="214" rx="70" ry="14" fill="#FFFFFF" opacity=".12"/>${ball(780, 192, 24)}`;
  }
}

export function momentSVG(m: Moment, avatar: Avatar, kit: [string, string], number: number, ntKit: [string, string] = NT_KIT): string {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const crowdColors = ['#4997D0', '#FFFFFF', '#2E5F8A', '#6CB4EE', '#4997D0', '#FFFFFF', '#F0C14B'];
  const crowd = [110, 124, 138, 152]
    .flatMap((y, row) => Array.from({ length: 80 }, (_, i) => `<circle cx="${6 + i * 11 + (row % 2) * 5.5}" cy="${y}" r="3.3" fill="${crowdColors[Math.floor(rnd() * crowdColors.length)]}"/>`))
    .join('');
  const stripes = Array.from({ length: 5 }, (_, i) => `<rect x="${i * 176}" y="168" width="88" height="72" fill="#22783F"/>`).join('');
  const face = avatarSVG(avatar, kit, number, 140).replace('<svg ', '<svg x="0" y="0" ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 240" width="880" height="240">
    <rect width="880" height="240" fill="#0B2236"/>
    <g fill="#FFFFFF"><circle cx="600" cy="22" r="60" opacity=".07"/><circle cx="600" cy="22" r="26" opacity=".14"/>
      <circle cx="850" cy="22" r="60" opacity=".07"/><circle cx="850" cy="22" r="26" opacity=".14"/></g>
    <g fill="#E8F1F8"><rect x="580" y="14" width="40" height="14" rx="3"/><rect x="830" y="14" width="40" height="14" rx="3"/></g>
    <rect y="100" width="880" height="62" fill="#13314D"/>${crowd}
    <rect y="158" width="294" height="10" fill="#4997D0"/><rect x="294" y="158" width="292" height="10" fill="#FFFFFF"/><rect x="586" y="158" width="294" height="10" fill="#4997D0"/>
    <rect y="168" width="880" height="72" fill="#1F6E3D"/>${stripes}
    <path d="M0 178h880" stroke="#FFFFFF" stroke-opacity=".45" stroke-width="2"/>
    <ellipse cx="440" cy="240" rx="130" ry="34" fill="none" stroke="#FFFFFF" stroke-opacity=".45" stroke-width="2"/>
    ${hero(m.kind, rnd, ntKit)}
    <circle cx="610" cy="150" r="76" fill="#FFFFFF"/>
    <clipPath id="moment-face"><circle cx="70" cy="70" r="70"/></clipPath>
    <g transform="translate(540 80)"><g clip-path="url(#moment-face)">${face}</g></g>
  </svg>`;
}
