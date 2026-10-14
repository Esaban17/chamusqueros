// Dibuja la carta final de la carrera (1080x1350, formato de post de Instagram) en un canvas,
// con el estilo de carta de FC que corresponde al veredicto: ícono, héroe, salón de la fama, oro, plata o bronce.
import { POSITION_NAMES, type Player } from '../engine/types';
import type { CardTier, CareerSummary } from '../engine/engine';
import { clubById, type Club } from '../engine/clubs';
import { countryOf } from '../engine/countries';
import { seleccionDe } from '../engine/nacionalidad';
import { avatarSVG } from './avatar';
import { ICON, bestMoment, momentSVG, palmares, type TrophyIcon } from './palmares';

const W = 1080;
const H = 1350;
const DISPLAY = '"Big Shoulders Display", "Arial Narrow", sans-serif';
const BODY = 'Barlow, "Segoe UI", sans-serif';

interface TierStyle {
  label: string;
  bg: string[]; // degradado diagonal de la carta
  streaks: string[]; // vetas de brillo que la cruzan
  border: string;
  ink: string;
  muted: string;
  accent: string;
  glow: string; // halo del fondo, fuera de la carta
  shards?: boolean; // vidrio quebrado del salón de la fama
}

export const TIERS: Record<CardTier, TierStyle> = {
  icono: {
    label: 'ÍCONO', bg: ['#FFFDF6', '#EFE7D3', '#FBF6EA'], streaks: ['rgba(201,162,74,0.55)', 'rgba(255,255,255,0.9)'],
    border: '#C9A24A', ink: '#2A2214', muted: '#5E4F31', accent: '#8A6510', glow: '#C9A24A',
  },
  heroe: {
    label: 'HÉROE', bg: ['#1B0B45', '#4A1B8F', '#101A55'], streaks: ['rgba(94,231,255,0.45)', 'rgba(232,90,255,0.4)'],
    border: '#9B6BFF', ink: '#FFFFFF', muted: '#D2C4F5', accent: '#5EE7FF', glow: '#7B3CFF',
  },
  salon: {
    label: 'SALÓN DE LA FAMA', bg: ['#2E2E2E', '#0E0E0E', '#3A3A3A'], streaks: ['rgba(255,255,255,0.12)'],
    border: '#D6D6D6', ink: '#FFFFFF', muted: '#BDBDBD', accent: '#F2F2F2', glow: '#8A8A8A', shards: true,
  },
  oro: {
    label: 'ORO', bg: ['#F8E19A', '#D6A93F', '#F2D27A'], streaks: ['rgba(255,255,255,0.45)'],
    border: '#B0832A', ink: '#2E2004', muted: '#5A430E', accent: '#4A3305', glow: '#E0B54D',
  },
  plata: {
    label: 'PLATA', bg: ['#F4F6F8', '#BAC1C9', '#E4E8EC'], streaks: ['rgba(255,255,255,0.6)'],
    border: '#8E98A3', ink: '#18212B', muted: '#3F4B58', accent: '#2A3642', glow: '#AEB7C1',
  },
  bronce: {
    label: 'BRONCE', bg: ['#F4B585', '#C46E3A', '#EC9C64'], streaks: ['rgba(255,255,255,0.35)'],
    border: '#8E4A22', ink: '#2E1404', muted: '#5A2A0E', accent: '#3E1A04', glow: '#D9824A',
  },
};

// Silueta de carta de FC: hombros cóncavos arriba y punta suave abajo.
const L = 48, R = W - 48, T = 48, B = H - 48, C = 80;
function cardPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(L + C, T);
  ctx.lineTo(R - C, T);
  ctx.quadraticCurveTo(R - C, T + C, R, T + C);
  ctx.lineTo(R, B - C);
  ctx.quadraticCurveTo(R, B - C * 0.4, R - C, B - 24);
  ctx.lineTo(W / 2, B);
  ctx.lineTo(L + C, B - 24);
  ctx.quadraticCurveTo(L, B - C * 0.4, L, B - C);
  ctx.lineTo(L, T + C);
  ctx.quadraticCurveTo(L + C, T + C, L + C, T);
  ctx.closePath();
}

function drawBackground(ctx: CanvasRenderingContext2D, t: TierStyle) {
  ctx.fillStyle = '#0B1420';
  ctx.fillRect(0, 0, W, H);
  for (const [x, y] of [[0, H * 0.3], [W, H * 0.75]]) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, W * 0.8);
    g.addColorStop(0, `${t.glow}88`);
    g.addColorStop(1, `${t.glow}00`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.save();
  cardPath(ctx);
  ctx.clip();
  const bg = ctx.createLinearGradient(L, T, R, B);
  t.bg.forEach((c, i) => bg.addColorStop(i / (t.bg.length - 1), c));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Vetas diagonales que se desvanecen hacia abajo, como en las cartas de FC.
  [[380, 70], [500, 22], [640, 130], [820, 36], [930, 80]].forEach(([x, w], i) => {
    const g = ctx.createLinearGradient(0, T, 0, H * 0.75);
    g.addColorStop(0, t.streaks[i % t.streaks.length]);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, T);
    ctx.lineTo(x + w, T);
    ctx.lineTo(x + w - 760, H);
    ctx.lineTo(x - 760, H);
    ctx.fill();
  });

  if (t.shards) {
    // Vidrio quebrado: rayos desde un punto de impacto y facetas alternas.
    const cx = W * 0.7, cy = H * 0.2, n = 16;
    const pts = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + Math.sin(i * 7.3) * 0.18;
      const len = 520 + Math.sin(i * 3.1) * 260;
      return [cx + Math.cos(a) * len, cy + Math.sin(a) * len, a] as const;
    });
    pts.forEach(([x, y], i) => {
      const [nx, ny] = pts[(i + 1) % n];
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.11)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.fill();
    });
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach(([x, y]) => (ctx.moveTo(cx, cy), ctx.lineTo(x, y)));
    pts.forEach(([, , a], i) => {
      const r = 150 + Math.abs(Math.sin(i * 5.7)) * 70;
      ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    });
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();

  cardPath(ctx);
  ctx.lineWidth = 12;
  ctx.strokeStyle = t.border;
  ctx.stroke();
}

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

function drawCrest(ctx: CanvasRenderingContext2D, club: Club, img: HTMLImageElement | null, x: number, y: number, r: number) {
  if (img) {
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = club.colors[0];
  ctx.fill();
  ctx.lineWidth = r * 0.16;
  ctx.strokeStyle = club.colors[1];
  ctx.stroke();
  ctx.fillStyle = club.colors[1];
  ctx.font = `800 ${r * 0.8}px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(club.short, x, y + r * 0.04);
  ctx.restore();
}

export async function drawCareerCard(canvas: HTMLCanvasElement, p: Player, s: CareerSummary) {
  await document.fonts?.ready;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const t = TIERS[s.verdict.tier];
  const home = seleccionDe(p); // colores y escena: la Selección actual
  const origin = countryOf(p.setup.country); // la línea de origen sigue con la nacionalidad
  drawBackground(ctx, t);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';

  ctx.fillStyle = t.accent;
  ctx.font = `900 46px ${DISPLAY}`;
  ctx.fillText(t.label, W / 2, 108);

  // Media (su mejor nivel), posición y bandera, como en la esquina de una carta de FC.
  const cx = 196;
  ctx.fillStyle = t.ink;
  ctx.font = `900 124px ${DISPLAY}`;
  ctx.fillText(String(p.peakRating), cx, 232);
  ctx.font = `800 46px ${DISPLAY}`;
  ctx.fillText(p.setup.position, cx, 284);
  // Colores de la Selección del jugador (en Guatemala, celeste y blanco).
  [home.kit[0], home.kit[1], home.kit[0]].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(cx - 30 + i * 20, 302, 20, 38);
  });
  ctx.strokeStyle = t.muted;
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - 30, 302, 60, 38);

  // Avatar con la camisola del último club
  const lastClub = clubById(p.seasons.at(-1)?.clubId ?? p.clubId);
  const face = await loadSvg(avatarSVG(p.setup.avatar, lastClub.colors, p.setup.number, 400));
  const ax = W - 300;
  const ay = 228;
  const ar = 112;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax, ay, ar + 8, 0, Math.PI * 2);
  ctx.fillStyle = t.border;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ax, ay, ar, 0, Math.PI * 2);
  ctx.clip();
  if (face) ctx.drawImage(face, ax - ar, ay - ar, ar * 2, ar * 2);
  ctx.restore();

  const name = `${p.setup.firstName} ${p.setup.lastName}`.trim().toUpperCase();
  ctx.fillStyle = t.ink;
  let size = 88;
  ctx.font = `900 ${size}px ${DISPLAY}`;
  while (ctx.measureText(name).width > W - 240 && size > 48) {
    size -= 4;
    ctx.font = `900 ${size}px ${DISPLAY}`;
  }
  ctx.fillText(name, W / 2, 420);

  ctx.fillStyle = t.muted;
  ctx.font = `600 28px ${BODY}`;
  const first = s.clubs[0]?.from.slice(0, 4) ?? '';
  const last = s.clubs.at(-1)?.to ?? '';
  // Guatemala muestra el departamento; el resto, el país (no cabe todo en una línea).
  const place = origin.code === 'GT' ? p.setup.dept : origin.name;
  ctx.fillText(`${POSITION_NAMES[p.setup.position]} · ${place} · ${first}–20${last.slice(-2)}`, W / 2, 462);

  // Veredicto
  ctx.fillStyle = t.accent;
  ctx.font = `800 48px ${DISPLAY}`;
  ctx.fillText(s.verdict.title.toUpperCase(), W / 2, 514);

  // Cifras
  const stats: [string, string][] = [
    ['Partidos', String(s.apps)],
    [p.setup.position === 'POR' ? 'Asistencias' : 'Goles', String(p.setup.position === 'POR' ? s.assists : s.goals)],
    ['Títulos', String(s.titles.length)],
    ['Selección', `${p.caps}`],
  ];
  const colW = (W - 200) / 4;
  stats.forEach(([label, value], i) => {
    const x = 100 + colW * (i + 0.5);
    ctx.fillStyle = t.ink;
    ctx.font = `800 76px ${DISPLAY}`;
    ctx.fillText(value, x, 592);
    ctx.fillStyle = t.muted;
    ctx.font = `700 22px ${BODY}`;
    ctx.fillText(label.toUpperCase(), x, 622);
  });

  const section = (label: string, y: number) => {
    ctx.fillStyle = t.muted;
    ctx.font = `700 26px ${BODY}`;
    ctx.textAlign = 'left';
    ctx.fillText(label, 100, y);
  };

  // Palmarés: un trofeo por competición o premio, con cuántas veces se ganó.
  section('PALMARÉS', 670);
  const items = palmares(p);
  const shown = items.length > 5 ? items.slice(0, 4) : items;
  const icons = await Promise.all(shown.map((it) => loadSvg(trophySVG(it.icon))));
  const slot = (W - 200) / 5;
  ctx.textAlign = 'center';
  shown.forEach((it, i) => {
    const cx = 100 + slot * i + slot / 2;
    ctx.beginPath();
    ctx.arc(cx, 728, 40, 0, Math.PI * 2);
    ctx.fillStyle = it.icon === 'copa' ? '#F0C14B' : '#6CB4EE';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = t.border;
    ctx.stroke();
    if (icons[i]) ctx.drawImage(icons[i]!, cx - 24, 704, 48, 48);
    if (it.count > 1) {
      ctx.beginPath();
      ctx.arc(cx + 33, 696, 19, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0D1B2A';
      ctx.stroke();
      ctx.fillStyle = '#0D1B2A';
      ctx.font = `800 22px ${DISPLAY}`;
      ctx.fillText(`×${it.count}`, cx + 33, 704);
    }
    ctx.fillStyle = t.ink;
    ctx.font = `600 21px ${BODY}`;
    wrap(ctx, it.label, slot - 14, 2).forEach((line, j) => ctx.fillText(line, cx, 798 + j * 24));
  });
  if (items.length > shown.length) {
    const cx = 100 + slot * 4 + slot / 2;
    ctx.beginPath();
    ctx.arc(cx, 728, 40, 0, Math.PI * 2);
    ctx.fillStyle = '#1B3550';
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 38px ${DISPLAY}`;
    ctx.fillText(`+${items.length - shown.length}`, cx, 741);
    ctx.fillStyle = t.ink;
    ctx.font = `600 21px ${BODY}`;
    ctx.fillText('más', cx, 798);
  }
  ctx.textAlign = 'left';
  if (!items.length) {
    ctx.fillStyle = t.muted;
    ctx.font = `500 30px ${BODY}`;
    ctx.fillText('Sin títulos ni premios individuales.', 100, 738);
  }

  // Momento más destacado: escena ilustrada con el texto encima.
  section('MOMENTO DESTACADO', 866);
  const moment = bestMoment(p, s);
  const scene = await loadSvg(momentSVG(moment, p.setup.avatar, moment.nt ? home.kit : lastClub.colors, p.setup.number, home.kit));
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(100, 882, W - 200, 240, 20);
  ctx.clip();
  if (scene) ctx.drawImage(scene, 100, 882, W - 200, 240);
  ctx.font = `800 38px ${DISPLAY}`;
  const titleLines = wrap(ctx, moment.title.toUpperCase(), 380, 2);
  const boxW = Math.max(...titleLines.map((l) => ctx.measureText(l).width), 200) + 40;
  ctx.fillStyle = 'rgba(11, 34, 54, 0.88)';
  ctx.beginPath();
  ctx.roundRect(116, 898, boxW, 54 + titleLines.length * 38, 14);
  ctx.fill();
  ctx.fillStyle = '#7FC0F0';
  ctx.font = `700 22px ${BODY}`;
  ctx.fillText(moment.kicker.toUpperCase(), 136, 932);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 38px ${DISPLAY}`;
  titleLines.forEach((line, j) => ctx.fillText(line, 136, 972 + j * 38));
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = t.border;
  ctx.beginPath();
  ctx.roundRect(100, 882, W - 200, 240, 20);
  ctx.stroke();

  // Trayectoria: escudos en fila.
  section('TRAYECTORIA', 1164);
  const crests = await Promise.all(s.clubs.map((c) => loadCrest(c.club)));
  let x = 100;
  for (let i = 0; i < s.clubs.length; i++) {
    const c = s.clubs[i].club;
    const clubName = c.name;
    ctx.font = `600 28px ${BODY}`;
    const width = 56 + ctx.measureText(clubName).width + 30;
    if (x + width > W - 100 - (i < s.clubs.length - 1 ? 70 : 0)) {
      ctx.fillStyle = t.muted;
      ctx.fillText(`+${s.clubs.length - i}`, x, 1212);
      break;
    }
    drawCrest(ctx, c, crests[i], x + 22, 1202, 22);
    ctx.fillStyle = t.ink;
    ctx.fillText(clubName, x + 54, 1212);
    x += width;
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = t.muted;
  ctx.font = `600 24px ${BODY}`;
  ctx.fillText('CHAMUSQUEROS · ¿Superás esta carrera?', W / 2, 1264);
}

const trophySVG = (icon: TrophyIcon) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#0D1B2A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[icon]}</svg>`;

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
