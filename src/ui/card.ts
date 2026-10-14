// Dibuja la imagen final de la carrera (1080x1350, formato de post de Instagram) en un canvas: arriba la carta FC
// "clásica realista" (la misma de la carta HTML, ver carta-svg.ts) y debajo el veredicto, el palmarés y el momento destacado.
// El arte (metal, textura, bisel) sale del mismo SVG de la carta cargado como imagen; el texto, el retrato, la bandera y el
// escudo se dibujan con el canvas porque un SVG cargado como imagen no ve las fuentes web ni los archivos externos.
import type { Player } from '../engine/types';
import type { CareerSummary } from '../engine/engine';
import { clubById, type Club } from '../engine/clubs';
import { seleccionDe } from '../engine/nacionalidad';
import { avatarSVG } from './avatar';
import {
  ESCUDO_PATH, ESTILOS, LAYOUT, SILUETA, cartaSVG, quitarFondoAvatar, sanear, textosCarta,
  type DatosCarta, type Efectos, type ItemTexto, type Limpio, type Parte,
} from './carta-svg';
import { ICON, bestMoment, momentSVG, palmares, type TrophyIcon } from './palmares';

const W = 1080;
const H = 1350;
const DISPLAY = '"Big Shoulders Display", "Arial Narrow", sans-serif';
const BODY = 'Barlow, "Segoe UI", sans-serif';
const FAM = { display: DISPLAY, body: BODY };

// La carta va arriba, centrada. Debajo quedan 484 px para el veredicto, el palmarés, el momento destacado y el pie.
const K = 1.9; // escala de la carta (unidades de carta -> píxeles)
const X0 = (W - 300 * K) / 2;
const Y0 = 30;
// ponytail: el arte completo (filtros) tarda más en WebKit; si no está listo a los 1.500 ms se usa la variante simple (plan, T6).
const LIMITE_ARTE_MS = 1500;
const LIMITE_BANDERA_MS = 4000;

const crestCache = new Map<string, HTMLImageElement | null>();

function loadCrest(club: Club): Promise<HTMLImageElement | null> {
  if (crestCache.has(club.id)) return Promise.resolve(crestCache.get(club.id)!);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => (crestCache.set(club.id, img), resolve(img));
    img.onerror = () => (crestCache.set(club.id, null), resolve(null));
    img.src = `${import.meta.env.BASE_URL}escudos/${club.id}.png`;
  });
}

function loadSvg(svg: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

/** La bandera real de flagcdn.com, con CORS anónimo para no contaminar el canvas. Si falla o tarda, null (y se dibujan las franjas). */
function loadFlag(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    setTimeout(() => resolve(null), LIMITE_BANDERA_MS);
    img.src = url;
  });
}

/** Arte completo; si falla o no está a tiempo, la variante simple. Gana la primera que termine bien. */
async function loadArte(d: DatosCarta, estilo: Parameters<typeof cartaSVG>[1]): Promise<HTMLImageElement | null> {
  const arte = (efectos: Efectos) => loadSvg(cartaSVG(d, estilo, { modo: 'arte', escala: K, efectos }));
  const completo = arte('completo');
  const tarde = new Promise<'tarde'>((r) => setTimeout(() => r('tarde'), LIMITE_ARTE_MS));
  const primero = await Promise.race([completo, tarde]);
  if (primero && primero !== 'tarde') return primero;
  const simple = arte('simple');
  return new Promise((resolve) => {
    let pendientes = 2;
    for (const p of [completo, simple]) p.then((img) => (img ? resolve(img) : --pendientes === 0 && resolve(null)));
  });
}

// ---------- Texto ----------

const conEspaciado = (ctx: CanvasRenderingContext2D) => 'letterSpacing' in ctx;

function fuente(ctx: CanvasRenderingContext2D, p: Parte) {
  ctx.font = `${p.peso} ${p.tam * K}px ${FAM[p.fam]}`;
  if (conEspaciado(ctx)) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${p.esp * K}px`;
}

/** Avance de una parte en píxeles, con el espaciado también tras la última letra (igual que un <text> de SVG). */
function avance(ctx: CanvasRenderingContext2D, p: Parte): number {
  fuente(ctx, p);
  if (conEspaciado(ctx)) return ctx.measureText(p.texto).width;
  return [...p.texto].reduce((s, c) => s + ctx.measureText(c).width + p.esp * K, 0);
}

function dibujaParte(ctx: CanvasRenderingContext2D, p: Parte, x: number, y: number) {
  fuente(ctx, p);
  if (conEspaciado(ctx)) return ctx.fillText(p.texto, x, y);
  let cx = x; // respaldo sin letterSpacing: letra por letra
  for (const c of p.texto) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + p.esp * K;
  }
}

function dibujaTexto(ctx: CanvasRenderingContext2D, it: ItemTexto) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const anchos = it.partes.map((p) => avance(ctx, p));
  const total = it.partes.reduce((s, p, i) => s + anchos[i] + (i ? p.dx * K : 0), 0);
  const x = X0 + it.x * K - (it.anclaje === 'middle' ? total / 2 : it.anclaje === 'end' ? total : 0);
  const pasadas = it.relieve ? [{ dy: 1, claro: true }, { dy: 0, claro: false }] : [{ dy: 0, claro: false }];
  for (const { dy, claro } of pasadas) {
    let cx = x;
    it.partes.forEach((p, i) => {
      if (i) cx += p.dx * K;
      ctx.fillStyle = claro ? `rgba(255,255,255,${it.relieve})` : p.color;
      ctx.globalAlpha = claro ? 1 : p.opacidad;
      dibujaParte(ctx, p, cx, Y0 + (it.y + dy) * K);
      cx += anchos[i];
    });
  }
  ctx.globalAlpha = 1;
}

// ---------- Carta ----------

/** Cubre la caja (x, y, w, h) con la imagen, recortando lo que sobre. */
function cubre(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const r = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / r, sh = h / r;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

const caja = (b: { x: number; y: number; w: number; h: number }) => ({ x: X0 + b.x * K, y: Y0 + b.y * K, w: b.w * K, h: b.h * K });

function dibujaBandera(ctx: CanvasRenderingContext2D, d: Limpio, img: HTMLImageElement | null) {
  const { x, y, w, h } = caja(LAYOUT.bandera);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 2 * K);
  ctx.clip();
  if (img) cubre(ctx, img, x, y, w, h);
  else {
    const [a, b] = d.pais.kit;
    [a, b, a].forEach((c, i) => ((ctx.fillStyle = c), ctx.fillRect(x + (w / 3) * i, y, w / 3 + 0.5, h)));
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = K;
  ctx.beginPath();
  ctx.roundRect(x + 0.5 * K, y + 0.5 * K, w - K, h - K, 1.6 * K);
  ctx.stroke();
}

function dibujaEscudo(ctx: CanvasRenderingContext2D, club: NonNullable<Limpio['club']>, img: HTMLImageElement | null) {
  const { x, y, w, h } = caja(LAYOUT.escudo);
  if (img) {
    const r = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    ctx.drawImage(img, x + (w - img.naturalWidth * r) / 2, y + (h - img.naturalHeight * r) / 2, img.naturalWidth * r, img.naturalHeight * r);
    return;
  }
  // Escudo genérico, el mismo de la carta HTML (viewBox 28 x 32): iniciales y colores del club.
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w / 28, h / 32);
  const path = new Path2D(ESCUDO_PATH);
  ctx.fillStyle = club.colores[0];
  ctx.fill(path);
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = club.colores[1];
  ctx.stroke(path);
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(3, 11);
  ctx.lineTo(25, 11);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = club.colores[1];
  ctx.font = `800 ${club.short.length > 3 ? 8 : 10}px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (conEspaciado(ctx)) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  ctx.fillText(club.short, 14, 23);
  ctx.restore();
}

/** El retrato se funde con el metal (opaco hasta el 88 % de su alto) y se recorta con la silueta de la carta. */
function dibujaRetrato(ctx: CanvasRenderingContext2D, face: HTMLImageElement | null) {
  if (!face) return;
  const { x, y, t } = LAYOUT.retrato;
  const lado = Math.round(t * K);
  const aux = document.createElement('canvas');
  aux.width = aux.height = lado;
  const a = aux.getContext('2d')!;
  a.drawImage(face, 0, 0, lado, lado);
  a.globalCompositeOperation = 'destination-in';
  const g = a.createLinearGradient(0, 0, 0, lado);
  g.addColorStop(0.88, '#000');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  a.fillStyle = g;
  a.fillRect(0, 0, lado, lado);
  const recorte = new Path2D();
  recorte.addPath(new Path2D(SILUETA), new DOMMatrix().translate(X0, Y0).scale(K, K));
  ctx.save();
  ctx.clip(recorte);
  ctx.drawImage(aux, X0 + x * K, Y0 + y * K, lado, lado);
  ctx.restore();
}

/** Parte el texto en líneas que caben en maxW; si sobra, la última termina en "…". */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxW || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = `${kept[maxLines - 1]} ${lines.slice(maxLines).join(' ')}`;
  while (ctx.measureText(`${last}…`).width > maxW && last.length > 1) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last.trimEnd()}…`;
  return kept;
}

const trophySVG = (icon: TrophyIcon) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#0D1B2A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[icon]}</svg>`;

/** Lo que la carta guarda de la carrera: los mismos campos que se mandan al ranking (RF-20), para que el mismo jugador muestre lo mismo en las dos. */
function datosDeCarrera(p: Player, s: CareerSummary, club: Club): DatosCarta {
  const home = seleccionDe(p);
  return {
    nombre: `${p.setup.firstName} ${p.setup.lastName}`.trim(),
    pos: p.setup.position, media: p.peakRating, apps: s.apps, goles: s.goals, asist: s.assists, titulos: s.titles.length,
    avatar: { a: p.setup.avatar, dorsal: p.setup.number, kit: club.colors },
    pais: { bandera: `https://flagcdn.com/w160/${home.flag}.png`, kit: home.kit },
    club: { short: club.short, colores: club.colors, escudo: `${import.meta.env.BASE_URL}escudos/${club.id}.png` },
  };
}

export async function drawCareerCard(canvas: HTMLCanvasElement, p: Player, s: CareerSummary) {
  // Las fuentes web se bajan al usarse: se piden los pesos que usa el canvas (ready solo espera lo que la página ya pidió).
  const muestra = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÑ0123456789—… ·¿?';
  await Promise.all([
    ...['900 56px', '800 23px', '700 17px'].map((f) => document.fonts?.load(`${f} "Big Shoulders Display"`, muestra)),
    ...['700 10px', '600 24px', '500 24px'].map((f) => document.fonts?.load(`${f} Barlow`, muestra)),
  ].filter(Boolean));
  await document.fonts?.ready;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const tier = s.verdict.tier;
  const E = ESTILOS[tier];
  const lastClub = clubById(p.seasons.at(-1)?.clubId ?? p.clubId);
  const home = seleccionDe(p);
  const datos = datosDeCarrera(p, s, lastClub);
  const d = sanear(datos);

  const [arte, face, flag, crest] = await Promise.all([
    loadArte(datos, tier),
    loadSvg(quitarFondoAvatar(avatarSVG(d.avatar.a, d.avatar.kit, d.avatar.dorsal, Math.round(LAYOUT.retrato.t * K)))),
    loadFlag(d.pais.bandera),
    loadCrest(lastClub),
  ]);

  // Fondo oscuro con un halo del color del estilo
  ctx.fillStyle = '#0B1420';
  ctx.fillRect(0, 0, W, H);
  for (const [x, y] of [[0, H * 0.3], [W, H * 0.75]]) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, W * 0.8);
    g.addColorStop(0, E.halo.replace(/[\d.]+\)$/, '.5)'));
    g.addColorStop(1, E.halo.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Arte con la sombra y el resplandor de la carta HTML (los pone el canvas, no el SVG)
  if (arte) {
    ctx.save();
    ctx.shadowColor = E.halo;
    ctx.shadowBlur = 26 * K;
    ctx.drawImage(arte, X0, Y0, 300 * K, 440 * K);
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = 18 * K;
    ctx.shadowOffsetY = 20 * K;
    ctx.drawImage(arte, X0, Y0, 300 * K, 440 * K);
    ctx.restore();
  }
  dibujaRetrato(ctx, face);
  dibujaBandera(ctx, d, flag);
  if (d.club) dibujaEscudo(ctx, d.club, crest);
  textosCarta(datos, tier).forEach((it) => dibujaTexto(ctx, it));

  // Debajo de la carta: veredicto, palmarés y momento destacado (A1)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (conEspaciado(ctx)) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  ctx.fillStyle = E.acento;
  ctx.font = `800 56px ${DISPLAY}`;
  ctx.fillText(s.verdict.title.toUpperCase(), W / 2, 936);

  // Palmarés: un trofeo por competición o premio, con cuántas veces se ganó.
  const items = palmares(p);
  const shown = items.length > 5 ? items.slice(0, 4) : items;
  const icons = await Promise.all(shown.map((it) => loadSvg(trophySVG(it.icon))));
  const slot = (W - 200) / 5;
  const cy = 1008;
  shown.forEach((it, i) => {
    const cx = 100 + slot * i + slot / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.fillStyle = it.icon === 'copa' ? '#F0C14B' : '#6CB4EE';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = E.rim[1];
    ctx.stroke();
    if (icons[i]) ctx.drawImage(icons[i]!, cx - 21, cy - 21, 42, 42);
    if (it.count > 1) {
      ctx.beginPath();
      ctx.arc(cx + 28, cy - 30, 17, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0D1B2A';
      ctx.stroke();
      ctx.fillStyle = '#0D1B2A';
      ctx.font = `800 20px ${DISPLAY}`;
      ctx.fillText(`×${it.count}`, cx + 28, cy - 23);
    }
    ctx.fillStyle = '#E8F1F8';
    ctx.font = `600 20px ${BODY}`;
    wrap(ctx, it.label, slot - 14, 2).forEach((line, j) => ctx.fillText(line, cx, cy + 62 + j * 23));
  });
  if (items.length > shown.length) {
    const cx = 100 + slot * 4 + slot / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.fillStyle = '#1B3550';
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 34px ${DISPLAY}`;
    ctx.fillText(`+${items.length - shown.length}`, cx, cy + 12);
    ctx.fillStyle = '#E8F1F8';
    ctx.font = `600 20px ${BODY}`;
    ctx.fillText('más', cx, cy + 62);
  }
  if (!items.length) {
    ctx.fillStyle = '#96AEC4';
    ctx.font = `500 28px ${BODY}`;
    ctx.fillText('Sin títulos ni premios individuales.', W / 2, cy + 8);
  }

  // Momento más destacado: escena ilustrada con el texto encima.
  const moment = bestMoment(p, s);
  const scene = await loadSvg(momentSVG(moment, p.setup.avatar, moment.nt ? home.kit : lastClub.colors, p.setup.number, home.kit));
  const bx = 100, by = 1116, bw = W - 200, bh = 156;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 20);
  ctx.clip();
  if (scene) ctx.drawImage(scene, 0, 72, 880, bh, bx, by, bw, bh); // la escena de 880 x 240, recortada arriba y abajo (el círculo del jugador entra entero)
  ctx.textAlign = 'left';
  ctx.font = `800 34px ${DISPLAY}`;
  const titleLines = wrap(ctx, moment.title.toUpperCase(), 380, 2);
  const boxW = Math.max(...titleLines.map((l) => ctx.measureText(l).width), 200) + 40;
  ctx.fillStyle = 'rgba(11, 34, 54, 0.88)';
  ctx.beginPath();
  ctx.roundRect(bx + 14, by + 12, boxW, 44 + titleLines.length * 34, 14);
  ctx.fill();
  ctx.fillStyle = '#7FC0F0';
  ctx.font = `700 20px ${BODY}`;
  ctx.fillText(moment.kicker.toUpperCase(), bx + 34, by + 42);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 34px ${DISPLAY}`;
  titleLines.forEach((line, j) => ctx.fillText(line, bx + 34, by + 76 + j * 34));
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = E.rim[1];
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 20);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#8FA6BD';
  ctx.font = `600 24px ${BODY}`;
  ctx.fillText('CHAMUSQUEROS · ¿Superás esta carrera?', W / 2, 1318);
}
