// Carta FC "clásica realista" (specs/carta-fc-clasica): una sola definición para la carta HTML y la imagen del canvas.
// Módulo PURO: sin DOM, sin window y sin import.meta, para probarlo con `npx tsx scripts/carta.test.ts` (CA-15).
// Los datos del ranking vienen del servidor y no son de fiar (A08): todo se valida y se acota aquí adentro, y todo
// texto dinámico se limpia y se escapa antes de entrar al SVG (A03).
import type { Avatar } from '../engine/types';
import type { CardTier } from '../engine/engine';
import { BEARD_STYLES, DEFAULT_AVATAR, EXTRAS, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, avatarSVG } from './avatar';
import { esc } from './esc';

// ---------- Tipos ----------

export type Efectos = 'completo' | 'simple';

/** Todo lo que la carta necesita. Los campos numéricos y la posición vienen sin validar: `sanear` los acota. */
export interface DatosCarta {
  nombre: string;
  pos: unknown; media: unknown; apps: unknown; goles: unknown; asist: unknown; titulos: unknown;
  avatar: { a: Partial<Record<keyof Avatar, unknown>>; dorsal: unknown; kit: unknown };
  pais: { bandera: string | null; kit: unknown };
  club: { short: string; colores: unknown; escudo: string | null } | null;
}

export interface OpcionesCarta { modo?: 'html' | 'arte'; efectos?: Efectos; escala?: number; id?: string }

export interface Atributo { etiqueta: string; valor: number }

/** Un texto visible de la carta, ya ubicado: lo dibuja un `<text>` (carta HTML) o `fillText` (imagen). */
export interface Parte { texto: string; fam: 'display' | 'body'; peso: number; tam: number; esp: number; color: string; opacidad: number; dx: number }
export interface ItemTexto { x: number; y: number; anclaje: 'start' | 'middle' | 'end'; relieve: number; partes: Parte[] }

// ---------- Saneo (A03, A08) ----------

const POSICIONES = ['POR', 'DEF', 'MED', 'DEL'] as const;
type Pos = (typeof POSICIONES)[number];

/** Entero dentro de [min, max], o null. Las cadenas, NaN, Infinity y fracciones no pasan. */
export const entero = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null;

/** `#rrggbb` o el neutro. Un color del servidor nunca llega al SVG sin esta prueba. */
export const color = (v: unknown, neutro = '#808080'): string => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : neutro);

const XML_INVALIDO = /[^\t\n\r\x20-퟿-�\u{10000}-\u{10FFFF}]/gu; // lo que XML 1.0 no admite (incluye sustitutos sueltos)
const BIDI = /[​-‏‪-‮⁦-⁩﻿]/g; // ceros de ancho y controles de dirección: falsean nombres

/** Nombre limpio en mayúsculas, de 40 caracteres como máximo. Sin escapar: `esc()` se aplica al insertarlo. */
export function textoLimpio(v: unknown): string {
  if (typeof v !== 'string') return '';
  return [...v.replace(XML_INVALIDO, '').replace(BIDI, '').replace(/\s+/g, ' ').trim().toUpperCase()].slice(0, 40).join('');
}

const clavePos = (v: unknown): Pos | null => (POSICIONES.includes(v as Pos) ? (v as Pos) : null);

// ---------- Atributos (RF-15 a RF-20) ----------

export const CAMPO = ['RIT', 'TIR', 'PAS', 'REG', 'DEF', 'FÍS'];
export const PORTERO = ['EST', 'MAN', 'SAQ', 'REF', 'VEL', 'COL'];
// Solo PESOS interviene en las pruebas (CA-04); el valor final sale de OFFSETS y del ajuste por tasas.
export const PESOS: Record<Pos, number[]> = { DEL: [.20, .25, .12, .20, .03, .20], MED: [.14, .16, .28, .24, .08, .10], DEF: [.14, .04, .12, .10, .40, .20], POR: [.18, .14, .12, .24, .12, .20] };
export const OFFSETS: Record<Pos, number[]> = { DEL: [2, 6, -6, 3, -42, -4], MED: [-1, 0, 4, 5, -17, -6], DEF: [-1, -30, -2, -18, 6, 4], POR: [4, 3, -4, 7, -26, 3] };
export const ESPERADA: Record<Exclude<Pos, 'POR'>, { g: number; a: number }> = { DEL: { g: .45, a: .15 }, MED: { g: .12, a: .20 }, DEF: { g: .04, a: .06 } };

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Seis atributos de 25 a 99 a partir de la media, la posición y las tasas por partido de la carrera.
 * Pura y determinista. Devuelve null si la posición o la media no son válidas (RF-19).
 */
export function atributos(d: { pos: unknown; media: unknown; apps: unknown; goles: unknown; asist: unknown }): Atributo[] | null {
  const pos = clavePos(d.pos);
  const media = entero(d.media, 1, 99);
  if (!pos || media === null) return null;
  const aj = [0, 0, 0, 0, 0, 0]; // RIT, TIR, PAS, REG, DEF, FÍS
  const apps = entero(d.apps, 0, 2000);
  if (pos !== 'POR' && apps) {
    const e = ESPERADA[pos];
    const p = Math.min(1, apps / 60); // con pocos partidos el ajuste pesa menos
    const tasa = (n: unknown, esperada: number) => {
      const v = entero(n, 0, 2000);
      return v === null ? 0 : Math.round(p * limitar(12 * (v / apps - esperada) / Math.max(esperada, .1), -6, 6));
    };
    const ajG = tasa(d.goles, e.g);
    const ajA = tasa(d.asist, e.a);
    aj[1] = ajG;
    aj[2] = ajA;
    aj[3] = Math.round((ajG + ajA) / 2);
  }
  const etiquetas = pos === 'POR' ? PORTERO : CAMPO;
  return etiquetas.map((etiqueta, i) => ({ etiqueta, valor: limitar(Math.round(media + OFFSETS[pos][i] + aj[i]), 25, 99) }));
}

// ---------- Estilos (RF-12) ----------

export interface Estilo {
  label: string; rim: string[]; rimO: number[]; face: string[]; faceO: number[];
  glow: string; ink: string; muted: string; plate: string; plateInk: string; halo: string; lat: string;
  sombra: number; rayo: number; acento: string; oscuro: boolean; tipEsp: number;
}

const OFF_A = [0, .16, .34, .48, .64, .82, 1];
const OFF_B = [0, .18, .36, .5, .66, .84, 1];
const DORADO = ['#fff6c2', '#ecc65f', '#8f640f', '#f7dd85', '#b4841f', '#f6df90', '#6f490b'];

// Los valores de oro, plata, bronce e ícono son los de la referencia (specs/carta-fc-clasica/referencia); cambian solo
// los de contraste (A7, D-10): muted, ink del bronce y sombra. Héroe y salón son derivados (A6): el usuario los valida con las capturas.
export const ESTILOS: Record<CardTier, Estilo> = {
  oro: {
    label: 'ORO', rim: DORADO, rimO: OFF_A, face: ['#f7dd80', '#e1ab33', '#bb871f'], faceO: [0, .45, 1],
    glow: '#fff7d0', ink: '#2a1d02', muted: '#2e2104', plate: 'rgba(38,26,2,.62)', plateInk: '#fff0bf', halo: 'rgba(235,185,70,.45)',
    lat: '#ffffff', sombra: .06, rayo: .42, acento: '#ecc65f', oscuro: false, tipEsp: .42,
  },
  plata: {
    label: 'PLATA', rim: ['#ffffff', '#d2d8df', '#737d88', '#f1f4f7', '#97a1ac', '#e6eaee', '#5f6a75'], rimO: OFF_B, face: ['#f8fafc', '#cdd4db', '#aab3bd'], faceO: [0, .5, 1],
    glow: '#ffffff', ink: '#111a24', muted: '#2c3744', plate: 'rgba(12,20,30,.62)', plateInk: '#f1f5f9', halo: 'rgba(190,200,212,.4)',
    lat: '#ffffff', sombra: .06, rayo: .42, acento: '#d2d8df', oscuro: false, tipEsp: .42,
  },
  bronce: {
    label: 'BRONCE', rim: ['#ffdcba', '#dc8f58', '#74381a', '#f2ad7c', '#a55a2c', '#eaa879', '#592a0e'], rimO: OFF_A, face: ['#f4b887', '#d57d47', '#bf7040'], faceO: [0, .5, 1],
    glow: '#ffe6cf', ink: '#1f0d02', muted: '#210e03', plate: 'rgba(40,16,4,.62)', plateInk: '#ffe9d6', halo: 'rgba(214,130,74,.45)',
    lat: '#ffffff', sombra: 0, rayo: .42, acento: '#dc8f58', oscuro: false, tipEsp: .42,
  },
  icono: {
    label: 'ÍCONO', rim: DORADO, rimO: OFF_A, face: ['#fffdf5', '#f1e8d0', '#dccfa9'], faceO: [0, .5, 1],
    glow: '#ffffff', ink: '#2a2214', muted: '#4a3d22', plate: 'rgba(70,50,8,.82)', plateInk: '#fff1c4', halo: 'rgba(240,215,140,.5)',
    lat: '#a9801f', sombra: .10, rayo: .42, acento: '#f7dd85', oscuro: false, tipEsp: .42,
  },
  heroe: {
    label: 'HÉROE', rim: ['#dcf7ff', '#6fd6ff', '#47339f', '#e8ccff', '#7f5bff', '#bff2ff', '#2f2278'], rimO: OFF_A, face: ['#45168f', '#1f0d63', '#0a1244'], faceO: [0, .5, 1],
    glow: '#6a3cff', ink: '#ffffff', muted: '#d2c4f5', plate: 'rgba(6,8,36,.66)', plateInk: '#ffffff', halo: 'rgba(130,90,255,.6)',
    lat: '#8ff0ff', sombra: .26, rayo: .6, acento: '#6fd6ff', oscuro: true, tipEsp: .42,
  },
  salon: {
    label: 'SALÓN DE LA FAMA', rim: ['#ffffff', '#c9ccd1', '#5d6168', '#eceef0', '#8b9097', '#d9dce0', '#42454b'], rimO: OFF_A, face: ['#4a4c52', '#26272b', '#0c0d0f'], faceO: [0, .5, 1],
    glow: '#cfd4dc', ink: '#ffffff', muted: '#cfd2d8', plate: 'rgba(0,0,0,.6)', plateInk: '#f4f4f6', halo: 'rgba(190,196,206,.4)',
    lat: '#e6e8ec', sombra: .26, rayo: .42, acento: '#d6d6d6', oscuro: true, tipEsp: .12,
  },
};

// ---------- Geometría ----------

/** Silueta: hombros cóncavos, lados rectos y base en punta suave. 300 x 440. */
export const SILUETA = 'M40 4H260Q260 38 296 38V372Q296 394 270 404Q210 424 150 436Q90 424 30 404Q4 394 4 372V38Q40 38 40 4Z';
export const CARA = { sx: 0.93, sy: 0.94 };
const T_CARA = 'translate(150 220) scale(0.93 0.94) translate(-150 -220)';
const T_HUNDIDO1 = 'translate(150 220) scale(0.902 0.914) translate(-150 -220)';
const T_HUNDIDO2 = 'translate(150 220) scale(0.9 0.912) translate(-150 -220)';
/** Escudo genérico (viewBox 28 x 32), el de la referencia. */
export const ESCUDO_PATH = 'M3 3H25V17C25 24 19 28.5 14 30.5C9 28.5 3 24 3 17Z';

/** Cajas fijas de la carta, en unidades de carta (las usa también el canvas). */
export const LAYOUT = {
  retrato: { x: 50, y: 12, t: 252 },
  bandera: { x: 35, y: 140, w: 26, h: 18 },
  escudo: { x: 34, y: 168, w: 26, h: 30 },
};

// ---------- Nombre (RF-08, RF-28) ----------

const ANCHO_MAX = 232;
const ESP_NOMBRE = 0.03;
// Ancho por carácter en em (Big Shoulders Display 900), medido en Chromium y WebKit con canvas y redondeado hacia ARRIBA:
// W .80, M .745, … .70, N/Ñ .543, el resto de letras y cifras hasta .515, y los estrechos (I, 1, espacio, signos) hasta .274.
const ANCHO_ESTRECHO = new Set(['I', 'Í', '1', ' ', '.', ',', "'", '-', '·']);
const anchoCar = (c: string) => (c === 'W' ? 0.82 : c === 'M' ? 0.76 : c === '…' ? 0.72 : c === 'N' || c === 'Ñ' ? 0.56 : ANCHO_ESTRECHO.has(c) ? 0.28 : 0.53);

/** Ancho estimado (unidades de carta) de un nombre ya en mayúsculas. */
export const anchoNombre = (texto: string, tam: number): number => [...texto].reduce((s, c) => s + (anchoCar(c) + ESP_NOMBRE) * tam, 0);

/** Tamaño base 29; baja hasta 18 si no cabe en 232; si aún no cabe, termina en "…". Por longitud: igual en las dos superficies. */
export function nombreAjustado(nombre: unknown): { texto: string; tam: number } {
  let texto = textoLimpio(nombre);
  for (let tam = 29; tam >= 18; tam--) if (anchoNombre(texto, tam) <= ANCHO_MAX) return { texto, tam };
  const c = [...texto];
  while (c.length > 1 && anchoNombre(`${c.join('').trimEnd()}…`, 18) > ANCHO_MAX) c.pop();
  texto = `${c.join('').trimEnd()}…`;
  return { texto, tam: 18 };
}

// ---------- Datos saneados ----------

export interface Limpio {
  nombre: string; pos: Pos | null; media: number | null; apps: number | null; goles: number | null; asist: number | null; titulos: number | null;
  avatar: { a: Avatar; dorsal: number; kit: [string, string] };
  pais: { bandera: string | null; kit: [string, string] };
  club: { short: string; colores: [string, string]; escudo: string | null } | null;
}

const idx = (v: unknown, largo: number, def: number) => entero(v, 0, largo - 1) ?? def;
const par = (v: unknown, def: [string, string]): [string, string] => (Array.isArray(v) ? [color(v[0], def[0]), color(v[1], def[1])] : def);
// Las direcciones no se arman con texto del servidor: la bandera es de flagcdn.com y el escudo, del propio sitio.
const urlBandera = (v: unknown) => (typeof v === 'string' && /^https:\/\/flagcdn\.com\/w\d{2,3}\/[a-z]{2}(-[a-z]{2,3})?\.png$/.test(v) ? v : null);
const urlEscudo = (v: unknown) => (typeof v === 'string' && /^[/\w.-]*escudos\/[a-z0-9-]{1,40}\.png$/.test(v) ? v : null);

export function sanear(d: DatosCarta): Limpio {
  const a = (d.avatar?.a ?? {}) as Record<string, unknown>;
  const club = d.club;
  return {
    nombre: textoLimpio(d.nombre),
    pos: clavePos(d.pos),
    media: entero(d.media, 1, 99),
    apps: entero(d.apps, 0, 2000),
    goles: entero(d.goles, 0, 2000),
    asist: entero(d.asist, 0, 2000),
    titulos: entero(d.titulos, 0, 999),
    avatar: {
      a: {
        skin: idx(a.skin, SKIN_TONES.length, DEFAULT_AVATAR.skin), hair: idx(a.hair, HAIR_STYLES.length, DEFAULT_AVATAR.hair),
        hairColor: idx(a.hairColor, HAIR_COLORS.length, DEFAULT_AVATAR.hairColor), beard: idx(a.beard, BEARD_STYLES.length, DEFAULT_AVATAR.beard),
        extra: idx(a.extra, EXTRAS.length, DEFAULT_AVATAR.extra),
      },
      dorsal: entero(d.avatar?.dorsal, 1, 99) ?? 10,
      kit: par(d.avatar?.kit, ['#4997d0', '#ffffff']),
    },
    pais: { bandera: urlBandera(d.pais?.bandera), kit: par(d.pais?.kit, ['#4997d0', '#ffffff']) },
    club: club ? { short: textoLimpio(club.short).slice(0, 4), colores: par(club.colores, ['#333333', '#ffffff']), escudo: urlEscudo(club.escudo) } : null,
  };
}

const FALTA = '—';
const num = (v: number | null) => (v === null ? FALTA : String(v));

// ---------- Textos (RF-06 a RF-11): la disposición única de las dos superficies ----------

const px = (em: number, tam: number) => em * tam;
const parte = (texto: string, fam: Parte['fam'], peso: number, tam: number, em: number, color: string, opacidad = 1, dx = 0): Parte => ({ texto, fam, peso, tam, esp: px(em, tam), color, opacidad, dx });

/** Línea base de cada texto, en unidades de carta (calibradas contra la referencia, ver specs/carta-fc-clasica/plan.md). */
export const BASE = { media: 88, pos: 119, nombre: 277, atrib: [317, 340, 363], placa: 390.5, punta: 415 };

export function atributosMostrados(d: Limpio): Atributo[] {
  return atributos(d) ?? (d.pos === 'POR' ? PORTERO : CAMPO).map((etiqueta) => ({ etiqueta, valor: NaN }));
}

export function textosCarta(datos: DatosCarta, estilo: CardTier): ItemTexto[] {
  const d = sanear(datos);
  const E = ESTILOS[estilo];
  const rel = E.oscuro ? 0 : 1; // el relieve claro solo luce sobre metal claro
  const items: ItemTexto[] = [];
  const nuevo = (x: number, y: number, anclaje: ItemTexto['anclaje'], relieve: number, ...partes: Parte[]) => items.push({ x, y, anclaje, relieve: relieve * rel, partes });

  nuevo(48, BASE.media, 'middle', .38, parte(num(d.media), 'display', 900, 56, -.01, E.ink));
  nuevo(48, BASE.pos, 'middle', .35, parte(d.pos ?? FALTA, 'display', 800, 23, .04, E.ink));
  const n = nombreAjustado(d.nombre || '');
  nuevo(150, BASE.nombre, 'middle', .4, parte(n.texto, 'display', 900, n.tam, ESP_NOMBRE, E.ink));
  atributosMostrados(d).forEach((a, i) => {
    const col = Math.floor(i / 3), fila = i % 3;
    const cx = col ? 207.5 : 92.5;
    nuevo(cx - 4, BASE.atrib[fila], 'end', .3, parte(Number.isNaN(a.valor) ? FALTA : String(a.valor), 'display', 900, 25, 0, E.ink));
    nuevo(cx + 4, BASE.atrib[fila], 'start', .3, parte(a.etiqueta, 'display', 700, 17, .04, E.muted));
  });
  const portero = d.pos === 'POR';
  const celdas: [string, number | null][] = [['PJ', d.apps], [portero ? 'AST' : 'GOL', portero ? d.asist : d.goles], ['TÍT', d.titulos]];
  celdas.forEach(([etq, v], i) =>
    nuevo([87, 150, 213][i], BASE.placa, 'middle', 0, parte(etq, 'body', 700, 10.5, .08, E.plateInk), parte(num(v), 'display', 900, 16, .02, E.plateInk, 1, 3)));
  nuevo(150 + E.tipEsp * 11 / 2, BASE.punta, 'middle', .35, parte(E.label, 'display', 800, 11, E.tipEsp, E.ink));
  return items;
}

// ---------- SVG ----------

let contador = 0;
const FAM = { display: "'Big Shoulders Display','Arial Narrow',sans-serif", body: "Barlow,'Segoe UI',sans-serif" };
const f2 = (n: number) => String(Math.round(n * 100) / 100);

function textoSVG(it: ItemTexto, claro: boolean): string {
  const ps = it.partes
    .map((p, i) => {
      const dx = i && p.dx ? ` dx="${f2(p.dx)}"` : '';
      const fill = claro ? ' fill="#ffffff"' : ` fill="${p.color}"`;
      return `<tspan${dx}${fill}${!claro && p.opacidad < 1 ? ` fill-opacity="${p.opacidad}"` : ''} font-family="${FAM[p.fam]}" font-weight="${p.peso}" font-size="${f2(p.tam)}" letter-spacing="${f2(p.esp)}">${esc(p.texto)}</tspan>`;
    })
    .join('');
  const y = it.y + (claro ? 1 : 0);
  return `<text x="${f2(it.x)}" y="${f2(y)}" text-anchor="${it.anclaje}"${claro ? ` fill-opacity="${it.relieve}"` : ''}>${ps}</text>`;
}

const grad = (id: string, attrs: string, stops: string) => `<linearGradient id="${id}" ${attrs}>${stops}</linearGradient>`;
const stop = (o: number, c: string, op = 1) => `<stop offset="${o}" stop-color="${c}"${op < 1 ? ` stop-opacity="${op}"` : ''}/>`;

/** Facetas del vidrio quebrado (salón): rayos desde el punto de impacto, todo determinista. */
function vidrio(): string {
  const cx = 210, cy = 88, n = 16;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + Math.sin(i * 7.3) * 0.18;
    const len = 150 + Math.sin(i * 3.1) * 75;
    return [cx + Math.cos(a) * len, cy + Math.sin(a) * len, a] as const;
  });
  const facetas = pts.map(([x, y], i) => {
    const [nx, ny] = pts[(i + 1) % n];
    return `<polygon class="carta-faceta" points="${f2(cx)},${f2(cy)} ${f2(x)},${f2(y)} ${f2(nx)},${f2(ny)}" fill="#fff" fill-opacity="${i % 2 ? '.04' : '.11'}"/>`;
  });
  const grietas = pts.map(([x, y]) => `M${cx} ${cy}L${f2(x)} ${f2(y)}`).join('');
  const anillo = pts.map(([, , a], i) => `${i ? 'L' : 'M'}${f2(cx + Math.cos(a) * (43 + Math.abs(Math.sin(i * 5.7)) * 20))} ${f2(cy + Math.sin(a) * (43 + Math.abs(Math.sin(i * 5.7)) * 20))}`).join('');
  return `${facetas.join('')}<path d="${grietas}${anillo}Z" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width=".7"/>`;
}

function escudoGenerico(c: NonNullable<Limpio['club']>): string {
  const { x, y, w, h } = LAYOUT.escudo;
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 28 32"><path d="${ESCUDO_PATH}" fill="${c.colores[0]}" stroke="${c.colores[1]}" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 11H25" stroke="${c.colores[1]}" stroke-width="1.2" opacity=".55"/><text x="14" y="23" text-anchor="middle" font-family="${FAM.display}" font-weight="800" font-size="${c.short.length > 3 ? 8 : 10}" fill="${c.colores[1]}">${esc(c.short)}</text></svg>`;
}

/** El avatar sin su rectángulo de fondo 200 x 200 (RF-07). Una prueba vigila que la expresión siga encontrándolo. */
export const quitarFondoAvatar = (svg: string): string => svg.replace(/<rect width="200" height="200"[^>]*\/>/, '');
const interiorAvatar = (svg: string) => quitarFondoAvatar(svg).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

export function cartaSVG(datos: DatosCarta, estilo: CardTier, o: OpcionesCarta = {}): string {
  const d = sanear(datos);
  const E = ESTILOS[estilo];
  const modo = o.modo === 'arte' ? 'arte' : 'html';
  const simple = o.efectos === 'simple';
  const id = typeof o.id === 'string' && /^[a-z][a-z0-9-]{0,20}$/.test(o.id) ? o.id : `cf${++contador}`;
  const u = (n: string) => `url(#${id}-${n})`;
  const escala = typeof o.escala === 'number' && o.escala > 0 && o.escala <= 8 ? o.escala : 1;
  const tinta = E.ink;
  const luz = E.oscuro ? 0 : 1; // filetes de luz bajo las líneas: solo sobre metal claro

  const defs = [
    grad(`${id}-rim`, 'x1="0" y1="0" x2="1" y2="1"', E.rim.map((c, i) => stop(E.rimO[i], c)).join('')),
    grad(`${id}-face`, 'x1=".1" y1="0" x2=".7" y2="1"', E.face.map((c, i) => stop(E.faceO[i], c)).join('')),
    `<radialGradient id="${id}-glow" cx=".64" cy=".3" r=".55">${stop(0, E.glow, .55)}${stop(1, E.glow, 0)}</radialGradient>`,
    grad(`${id}-ray`, 'x1="0" y1="0" x2="0" y2="1"', `${stop(0, '#fff', E.rayo)}${stop(.72, '#fff', 0)}`),
    grad(`${id}-shade`, 'x1="0" y1="0" x2="0" y2="1"', `${stop(.55, '#000', 0)}${stop(1, '#000', E.sombra)}`),
    grad(`${id}-ins`, 'x1="0" y1="0" x2="1" y2="1"', `${stop(0, '#000', .55)}${stop(.5, '#000', 0)}${stop(1, '#fff', .75)}`),
    grad(`${id}-edge`, 'x1="0" y1="0" x2="1" y2="1"', `${stop(0, '#fff', .95)}${stop(.45, '#fff', 0)}${stop(1, '#000', .6)}`),
    grad(`${id}-fade`, 'x1="0" y1="0" x2="0" y2="1"', `${stop(.15, '#fff')}${stop(.62, '#fff', 0)}`),
    `<mask id="${id}-fm"><rect width="300" height="440" fill="${u('fade')}"/></mask>`,
    `<pattern id="${id}-lat" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 10H20M10 0V20" stroke="${E.lat}" stroke-opacity=".2" stroke-width=".6"/><path d="M10 4L16 10L10 16L4 10Z" fill="none" stroke="${E.lat}" stroke-opacity=".14" stroke-width=".5"/></pattern>`,
    `<pattern id="${id}-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><path d="M0 1.5H3" stroke="#000" stroke-opacity=".07" stroke-width=".7"/></pattern>`,
    `<clipPath id="${id}-co"><path d="${SILUETA}"/></clipPath>`,
    `<clipPath id="${id}-ci"><path d="${SILUETA}" transform="${T_CARA}"/></clipPath>`,
    grad(`${id}-ln`, 'x1="0" y1="0" x2="1" y2="0"', `${stop(0, tinta, 0)}${stop(.2, tinta)}${stop(.8, tinta)}${stop(1, tinta, 0)}`),
    grad(`${id}-lw`, 'x1="0" y1="0" x2="1" y2="0"', `${stop(0, '#fff', 0)}${stop(.2, '#fff')}${stop(.8, '#fff')}${stop(1, '#fff', 0)}`),
    grad(`${id}-vd`, 'x1="0" y1="0" x2="0" y2="1"', `${stop(0, tinta, 0)}${stop(.2, tinta)}${stop(.8, tinta)}${stop(1, tinta, 0)}`),
    grad(`${id}-ps`, 'x1="0" y1="0" x2="0" y2="1"', `${stop(0, '#000', .5)}${stop(.45, '#000', 0)}`),
  ];
  if (simple) {
    // Variante sin filtros: el grano y el cepillado son tramas fijas del mismo tono (sin azar).
    defs.push(
      `<pattern id="${id}-grano" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".5" fill="#000" fill-opacity=".16"/><circle cx="3.5" cy="3" r=".45" fill="#fff" fill-opacity=".2"/><circle cx="2" cy="4.4" r=".4" fill="#000" fill-opacity=".1"/></pattern>`,
      `<pattern id="${id}-cepillo" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)"><path d="M0 1.5H6" stroke="#fff" stroke-opacity=".07" stroke-width=".6"/><path d="M0 4.5H6" stroke="#000" stroke-opacity=".05" stroke-width=".5"/></pattern>`,
    );
  } else {
    // Bisel especular y grano: filtros de SVG. El grano se compone con transparencia normal (negro y blanco con alfa), sin mix-blend-mode (D-11).
    const ruido = (nombre: string, frec: string, oct: number, semilla: number, k: number) =>
      `<filter id="${id}-${nombre}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="${frec}" numOctaves="${oct}" seed="${semilla}" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 ${k} 0 0 0 ${-k / 2}" result="l"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${-k} 0 0 0 ${k / 2}" result="o"/><feMerge><feMergeNode in="l"/><feMergeNode in="o"/></feMerge></filter>`;
    defs.push(
      `<filter id="${id}-bev" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur in="SourceAlpha" stdDeviation="2" result="b"/><feSpecularLighting in="b" surfaceScale="7" specularConstant="1" specularExponent="25" lighting-color="#ffffff" result="sp"><feDistantLight azimuth="235" elevation="45"/></feSpecularLighting><feComposite in="sp" in2="SourceAlpha" operator="in" result="spc"/><feComposite in="SourceGraphic" in2="spc" operator="arithmetic" k1="0" k2="1" k3=".85" k4="0"/></filter>`,
      ruido('noise', '.85', 2, 7, 1),
      ruido('brush', '.012 .8', 2, 11, 1),
    );
  }
  if (modo === 'html') {
    defs.push(
      grad(`${id}-sw`, 'x1="0" y1="0" x2="1" y2="0"', `${stop(0, '#fff', 0)}${stop(.5, '#fff', .9)}${stop(1, '#fff', 0)}`),
      grad(`${id}-pf`, 'x1="0" y1="0" x2="0" y2="1"', `${stop(.88, '#fff')}${stop(1, '#000')}`),
      `<mask id="${id}-pm" maskUnits="userSpaceOnUse" x="${LAYOUT.retrato.x}" y="${LAYOUT.retrato.y}" width="${LAYOUT.retrato.t}" height="${LAYOUT.retrato.t}"><rect x="${LAYOUT.retrato.x}" y="${LAYOUT.retrato.y}" width="${LAYOUT.retrato.t}" height="${LAYOUT.retrato.t}" fill="${u('pf')}"/></mask>`,
    );
  }

  const rimPath = `<path d="${SILUETA}" fill="${u('rim')}"${simple ? '' : ` filter="${u('bev')}"`}/>${simple ? `<path d="${SILUETA}" transform="translate(150 220) scale(.985 .987) translate(-150 -220)" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/>` : ''}`;
  const rayos = ['118,0 144,0 -56,440 -82,440', '168,0 178,0 -22,440 -32,440', '212,0 258,0 58,440 12,440', '262,0 276,0 76,440 62,440'].map((p) => `<polygon points="${p}" fill="${u('ray')}"/>`).join('');
  const interior = `<g clip-path="${u('ci')}"><rect width="300" height="440" fill="${u('glow')}"/>${rayos}<g fill="none" stroke="${E.lat}" stroke-opacity=".22" stroke-width=".7"><circle cx="186" cy="130" r="92"/><circle cx="186" cy="130" r="112" stroke-dasharray="2 5"/><circle cx="186" cy="130" r="132" stroke-opacity=".12"/></g><rect width="300" height="440" fill="${u('lat')}" mask="${u('fm')}"/><rect width="300" height="440" fill="${u('hatch')}"/>${estilo === 'salon' ? vidrio() : ''}<rect width="300" height="440" fill="${u('shade')}"/></g>`;
  const hundido = `<path d="${SILUETA}" transform="${T_CARA}" fill="none" stroke="${u('ins')}" stroke-width="2.2"/><path d="${SILUETA}" transform="${T_HUNDIDO1}" fill="none" stroke="${tinta}" stroke-opacity=".26" stroke-width=".8"/><path d="${SILUETA}" transform="${T_HUNDIDO2}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width=".6"/>`;
  const textura = `<g clip-path="${u('co')}">${simple
    ? `<rect width="300" height="440" fill="${u('grano')}" opacity=".55"/><rect x="-100" y="-100" width="500" height="640" transform="rotate(-28 150 220)" fill="${u('cepillo')}" opacity=".6"/>`
    : `<rect width="300" height="440" filter="${u('noise')}" opacity=".5"/><rect x="-100" y="-100" width="500" height="640" transform="rotate(-28 150 220)" filter="${u('brush')}" opacity=".3"/>`}</g>`;
  const sweep = `<g clip-path="${u('co')}"><rect class="carta-sweep" x="-160" y="-40" width="70" height="520" fill="${u('sw')}" opacity="0" transform="skewX(-18)"/></g>`;
  const detalles = [
    `<rect x="30" y="128" width="36" height="1.5" fill="${tinta}" opacity=".45"/>${luz ? '<rect x="30" y="129.5" width="36" height="1" fill="#fff" opacity=".4"/>' : ''}`,
    `<rect x="46" y="287" width="208" height="1.5" fill="${u('ln')}" opacity=".5"/>${luz ? `<rect x="46" y="288.5" width="208" height="1" fill="${u('lw')}" opacity=".35"/>` : ''}`,
    `<rect x="149.5" y="297" width="1.5" height="68" fill="${u('vd')}" opacity=".4"/>`,
    `<rect x="56" y="371" width="188" height="26" rx="4" fill="${E.plate}"/><rect x="56" y="371" width="188" height="26" rx="4" fill="${u('ps')}"/>${luz ? '<rect x="58" y="397.4" width="184" height="1" rx=".5" fill="#fff" opacity=".4"/>' : ''}`,
  ].join('');
  const arte = `${rimPath}<path d="${SILUETA}" transform="${T_CARA}" fill="${u('face')}"/>${interior}${hundido}${textura}${detalles}`;
  const filete = `<path d="${SILUETA}" fill="none" stroke="${u('edge')}" stroke-width="1.2"/>`;
  const ns = 'xmlns="http://www.w3.org/2000/svg"';

  if (modo === 'arte') {
    return `<svg ${ns} viewBox="0 0 300 440" width="${f2(300 * escala)}" height="${f2(440 * escala)}"><defs>${defs.join('')}</defs>${arte}${filete}</svg>`;
  }

  // Modo html: retrato, bandera, escudo y textos sobre el arte; el brillo va justo sobre la textura.
  const { retrato, bandera } = LAYOUT;
  const [k1, k2] = d.pais.kit;
  const flag = `<g><rect x="${bandera.x}" y="${bandera.y}" width="26" height="18" rx="2" fill="${k2}"/><rect x="${bandera.x}" y="${bandera.y}" width="8.67" height="18" fill="${k1}"/><rect x="${bandera.x + 17.33}" y="${bandera.y}" width="8.67" height="18" fill="${k1}"/>${d.pais.bandera ? `<image href="${d.pais.bandera}" x="${bandera.x}" y="${bandera.y}" width="26" height="18" preserveAspectRatio="xMidYMid slice"/>` : ''}<rect x="${bandera.x + .5}" y="${bandera.y + .5}" width="25" height="17" rx="1.6" fill="none" stroke="rgba(0,0,0,.35)"/></g>`;
  const escudo = d.club
    ? `<g class="carta-escudo-gen">${escudoGenerico(d.club)}</g>${d.club.escudo ? `<image class="carta-escudo" href="${d.club.escudo}" x="${LAYOUT.escudo.x}" y="${LAYOUT.escudo.y}" width="${LAYOUT.escudo.w}" height="${LAYOUT.escudo.h}" preserveAspectRatio="xMidYMid meet"/>` : ''}`
    : '';
  const retratoSVG = `<g clip-path="${u('co')}"><g mask="${u('pm')}"><svg x="${retrato.x}" y="${retrato.y}" width="${retrato.t}" height="${retrato.t}" viewBox="0 0 200 200">${interiorAvatar(avatarSVG(d.avatar.a, d.avatar.kit, d.avatar.dorsal, 200))}</svg></g></g>`;
  const items = textosCarta(datos, estilo);
  const textos = items.map((it) => (it.relieve ? textoSVG(it, true) : '') + textoSVG(it, false)).join('');
  const at = atributos(d);
  const alt = `Carta ${E.label.toLowerCase()} de ${d.nombre || 'jugador'}: ${d.pos ?? FALTA}, media ${num(d.media)}${at ? `. ${at.map((a) => `${a.etiqueta} ${a.valor}`).join(', ')}` : ''}`;
  return `<svg ${ns} viewBox="0 0 300 440" role="img" aria-label="${esc(alt)}"><defs>${defs.join('')}</defs><g aria-hidden="true">${arte}${sweep}${retratoSVG}${flag}${escudo}${textos}${filete}</g></svg>`;
}
