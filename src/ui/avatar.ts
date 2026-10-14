// Avatar del jugador dibujado en SVG: cara, pelo, barba y la camisola del club actual.
import type { Avatar } from '../engine/types';

export const SKIN_TONES = ['#F3D2B3', '#E2B48C', '#C98E62', '#A86E45', '#83522F', '#5C3820'];
export const HAIR_COLORS: [string, string][] = [
  ['Negro', '#1C1714'],
  ['Castaño', '#4A2E1C'],
  ['Café claro', '#8A5A33'],
  ['Rubio', '#D9B25F'],
  ['Pintado celeste', '#4997D0'],
  ['Platinado', '#E7E2D6'],
];
export const HAIR_STYLES = ['Rapado', 'Corto', 'Peinado de lado', 'Cresta', 'Rizos', 'Afro', 'Largo con cola', 'Calvo'];
export const BEARD_STYLES = ['Sin barba', 'Bigote', 'Candado', 'Barba completa', 'Barba de tres días'];
export const EXTRAS = ['Nada', 'Cintillo', 'Arete', 'Vincha y arete'];

/** Camisola de la Selección: azul bandera con detalles blancos. */
export const NT_KIT: [string, string] = ['#4997D0', '#FFFFFF'];

export const DEFAULT_AVATAR: Avatar ={ skin: 2, hair: 1, hairColor: 0, beard: 0, extra: 0 };

export function randomAvatar(): Avatar {
  const r = (n: number) => Math.floor(Math.random() * n);
  return { skin: r(SKIN_TONES.length), hair: r(HAIR_STYLES.length), hairColor: r(3), beard: r(BEARD_STYLES.length), extra: r(EXTRAS.length) };
}

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount)));
  const r = f(n >> 16);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function hairShape(style: number, c: string): string {
  switch (style) {
    case 0: // rapado
      return `<path d="M62 78c2-22 18-36 38-36s36 14 38 36c-6-8-20-14-38-14s-32 6-38 14z" fill="${c}" opacity=".55"/>`;
    case 1: // corto
      return `<path d="M60 84c-2-30 16-48 40-48s42 18 40 48c-4-12-12-20-20-22-10 6-30 6-44 2-8 4-14 10-16 20z" fill="${c}"/>`;
    case 2: // peinado de lado
      return `<path d="M58 88c-4-34 16-54 44-52 26 2 42 22 38 50-6-14-14-24-26-28-18 8-38 6-48 0-4 8-6 18-8 30z" fill="${c}"/>
        <path d="M84 40c18-6 40 0 50 14-16-6-34-6-50-14z" fill="${shade(c, 25)}"/>`;
    case 3: // cresta
      return `<path d="M62 80c2-14 8-24 18-30-6 14-10 22-18 30zM138 80c-2-14-8-24-18-30 6 14 10 22 18 30z" fill="${c}" opacity=".5"/>
        <path d="M86 58c0-16 4-30 14-38 10 8 14 22 14 38-8-4-20-4-28 0z" fill="${c}"/>`;
    case 4: // rizos
      return `<g fill="${c}">${[60, 72, 86, 100, 114, 128, 140]
        .map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 46 : 52}" r="13"/>`)
        .join('')}<circle cx="58" cy="70" r="10"/><circle cx="142" cy="70" r="10"/></g>`;
    case 5: // afro
      return `<ellipse cx="100" cy="64" rx="56" ry="44" fill="${c}"/>`;
    case 6: // largo con cola
      return `<path d="M58 92c-4-36 16-56 42-56s46 20 42 56c-4-14-12-24-22-28-14 6-30 6-42 0-10 6-16 16-20 28z" fill="${c}"/>
        <path d="M140 70c14 6 18 22 12 40-4-12-8-20-16-26z" fill="${c}"/>`;
    default: // calvo
      return '';
  }
}

function beardShape(style: number, c: string): string {
  switch (style) {
    case 1:
      return `<path d="M84 118c8-5 24-5 32 0-4 4-28 4-32 0z" fill="${c}"/>`;
    case 2:
      return `<path d="M84 118c8-5 24-5 32 0-4 4-28 4-32 0z" fill="${c}"/><path d="M92 132c4 8 12 8 16 0v10c-4 4-12 4-16 0z" fill="${c}"/>`;
    case 3:
      return `<path d="M64 98c2 30 18 48 36 48s34-18 36-48c-6 14-12 22-20 24-8-4-24-4-32 0-8-2-14-10-20-24z" fill="${c}"/>`;
    case 4:
      return `<path d="M64 98c2 30 18 48 36 48s34-18 36-48c-6 14-12 22-20 24-8-4-24-4-32 0-8-2-14-10-20-24z" fill="${c}" opacity=".35"/>`;
    default:
      return '';
  }
}

/**
 * Devuelve el SVG del avatar. `kit` son los colores del club (camisola y detalle).
 * viewBox 200x200, pensado para mostrarse en círculo.
 */
export function avatarSVG(a: Avatar, kit: [string, string], number: number, size = 96): string {
  const skin = SKIN_TONES[a.skin] ?? SKIN_TONES[2];
  const hair = (HAIR_COLORS[a.hairColor] ?? HAIR_COLORS[0])[1];
  const skinDark = shade(skin, -28);
  const beardColor = a.hairColor === 4 || a.hairColor === 5 ? HAIR_COLORS[0][1] : hair;
  const afroBehind = a.hair === 5 ? hairShape(5, hair) : '';
  const front = a.hair === 5 ? '' : hairShape(a.hair, hair);
  const band = a.extra === 1 || a.extra === 3 ? `<path d="M60 74c24-10 56-10 80 0v8c-24-10-56-10-80 0z" fill="${kit[1]}"/>` : '';
  const earring = a.extra === 2 || a.extra === 3 ? `<circle cx="60" cy="108" r="3.5" fill="#E9C46A"/>` : '';
  const [shirt, trim] = kit;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="Avatar del jugador">
    <rect width="200" height="200" fill="${shade(shirt, 60)}"/>
    ${afroBehind}
    <path d="M30 200c4-34 30-52 70-52s66 18 70 52z" fill="${shirt}"/>
    <path d="M84 150l16 18 16-18" fill="none" stroke="${trim}" stroke-width="6" stroke-linejoin="round"/>
    <text x="100" y="194" text-anchor="middle" font-family="'Big Shoulders Display', 'Arial Narrow', sans-serif" font-weight="800" font-size="26" fill="${trim}">${number}</text>
    <rect x="88" y="124" width="24" height="28" fill="${skinDark}"/>
    <ellipse cx="62" cy="100" rx="8" ry="11" fill="${skinDark}"/>
    <ellipse cx="138" cy="100" rx="8" ry="11" fill="${skinDark}"/>
    <ellipse cx="100" cy="94" rx="38" ry="46" fill="${skin}"/>
    ${beardShape(a.beard, beardColor)}
    <ellipse cx="86" cy="96" rx="4" ry="4.5" fill="#1C1714"/>
    <ellipse cx="114" cy="96" rx="4" ry="4.5" fill="#1C1714"/>
    <path d="M78 84c4-3 10-3 14 0M108 84c4-3 10-3 14 0" stroke="${beardColor}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    <path d="M100 100v10l-4 3" stroke="${skinDark}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M90 124c6 4 14 4 20 0" stroke="#7A3B2E" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${front}
    ${band}
    ${earring}
  </svg>`;
}
