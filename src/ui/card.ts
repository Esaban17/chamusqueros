// Dibuja la tarjeta final de la carrera (1080x1350, formato de post de Instagram) en un canvas.
import { POSITION_NAMES, type Player } from '../engine/types';
import type { CareerSummary } from '../engine/engine';
import { clubById, type Club } from '../engine/clubs';
import { NT_KIT, avatarSVG } from './avatar';
import { ICON, bestMoment, momentSVG, palmares, type TrophyIcon } from './palmares';

const W = 1080;
const H = 1350;
const DISPLAY = '"Big Shoulders Display", "Arial Narrow", sans-serif';
const BODY = 'Barlow, "Segoe UI", sans-serif';

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

  // Fondo: franjas celeste y blanco de la bandera, con un panel azul noche encima.
  ctx.fillStyle = '#4997D0';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(W / 3, 0, W / 3, H);
  ctx.fillStyle = '#0D1B2A';
  ctx.beginPath();
  ctx.roundRect(48, 48, W - 96, H - 96, 36);
  ctx.fill();

  ctx.fillStyle = '#7FC0F0';
  ctx.font = `700 34px ${BODY}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('CHAMUSQUEROS', 100, 132);

  // Avatar con la camisola del último club
  const lastClub = clubById(p.seasons.at(-1)?.clubId ?? p.clubId);
  const face = await loadSvg(avatarSVG(p.setup.avatar, lastClub.colors, p.setup.number, 400));
  const ax = W - 250;
  const ay = 190;
  const ar = 120;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax, ay, ar + 8, 0, Math.PI * 2);
  ctx.fillStyle = '#4997D0';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ax, ay, ar, 0, Math.PI * 2);
  ctx.clip();
  if (face) ctx.drawImage(face, ax - ar, ay - ar, ar * 2, ar * 2);
  ctx.restore();

  const name = `${p.setup.firstName} ${p.setup.lastName}`.trim().toUpperCase();
  ctx.fillStyle = '#FFFFFF';
  let size = 112;
  ctx.font = `900 ${size}px ${DISPLAY}`;
  while (ctx.measureText(name).width > W - 470 && size > 48) {
    size -= 4;
    ctx.font = `900 ${size}px ${DISPLAY}`;
  }
  ctx.fillText(name, 100, 250);

  ctx.fillStyle = '#B9D3EA';
  ctx.font = `500 34px ${BODY}`;
  const first = s.clubs[0]?.from.slice(0, 4) ?? '';
  const last = s.clubs.at(-1)?.to ?? '';
  ctx.fillText(`${POSITION_NAMES[p.setup.position]} · ${p.setup.dept} · ${first}–20${last.slice(-2)}`, 100, 304);

  // Veredicto
  ctx.fillStyle = '#F0C14B';
  ctx.font = `800 64px ${DISPLAY}`;
  ctx.fillText(s.verdict.title.toUpperCase(), 100, 390);

  // Cifras
  const stats: [string, string][] = [
    ['Partidos', String(s.apps)],
    [p.setup.position === 'POR' ? 'Asistencias' : 'Goles', String(p.setup.position === 'POR' ? s.assists : s.goals)],
    ['Títulos', String(s.titles.length)],
    ['Selección', `${p.caps}`],
  ];
  const colW = (W - 200) / 4;
  stats.forEach(([label, value], i) => {
    const x = 100 + i * colW;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 104px ${DISPLAY}`;
    ctx.fillText(value, x, 500);
    ctx.fillStyle = '#7FC0F0';
    ctx.font = `600 28px ${BODY}`;
    ctx.fillText(label.toUpperCase(), x, 540);
  });

  const section = (label: string, y: number) => {
    ctx.fillStyle = '#7FC0F0';
    ctx.font = `700 28px ${BODY}`;
    ctx.textAlign = 'left';
    ctx.fillText(label, 100, y);
  };

  // Palmarés: un trofeo por competición o premio, con cuántas veces se ganó.
  section('PALMARÉS', 604);
  const items = palmares(p);
  const shown = items.length > 5 ? items.slice(0, 4) : items;
  const icons = await Promise.all(shown.map((it) => loadSvg(trophySVG(it.icon))));
  const slot = (W - 200) / 5;
  ctx.textAlign = 'center';
  shown.forEach((it, i) => {
    const cx = 100 + slot * i + slot / 2;
    ctx.beginPath();
    ctx.arc(cx, 668, 44, 0, Math.PI * 2);
    ctx.fillStyle = it.icon === 'copa' ? '#F0C14B' : '#6CB4EE';
    ctx.fill();
    if (icons[i]) ctx.drawImage(icons[i]!, cx - 26, 642, 52, 52);
    if (it.count > 1) {
      ctx.beginPath();
      ctx.arc(cx + 36, 634, 20, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0D1B2A';
      ctx.stroke();
      ctx.fillStyle = '#0D1B2A';
      ctx.font = `800 24px ${DISPLAY}`;
      ctx.fillText(`×${it.count}`, cx + 36, 642);
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 22px ${BODY}`;
    wrap(ctx, it.label, slot - 14, 2).forEach((line, j) => ctx.fillText(line, cx, 746 + j * 26));
  });
  if (items.length > shown.length) {
    const cx = 100 + slot * 4 + slot / 2;
    ctx.beginPath();
    ctx.arc(cx, 668, 44, 0, Math.PI * 2);
    ctx.fillStyle = '#1B3550';
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 40px ${DISPLAY}`;
    ctx.fillText(`+${items.length - shown.length}`, cx, 682);
    ctx.font = `600 22px ${BODY}`;
    ctx.fillText('más', cx, 746);
  }
  ctx.textAlign = 'left';
  if (!items.length) {
    ctx.fillStyle = '#B9D3EA';
    ctx.font = `500 30px ${BODY}`;
    ctx.fillText('Sin títulos ni premios individuales.', 100, 676);
  }

  // Momento más destacado: escena ilustrada con el texto encima.
  section('MOMENTO DESTACADO', 828);
  const moment = bestMoment(p, s);
  const scene = await loadSvg(momentSVG(moment, p.setup.avatar, moment.nt ? NT_KIT : lastClub.colors, p.setup.number));
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(100, 846, W - 200, 240, 20);
  ctx.clip();
  if (scene) ctx.drawImage(scene, 100, 846, W - 200, 240);
  ctx.font = `800 38px ${DISPLAY}`;
  const titleLines = wrap(ctx, moment.title.toUpperCase(), 380, 2);
  const boxW = Math.max(...titleLines.map((l) => ctx.measureText(l).width), 200) + 40;
  ctx.fillStyle = 'rgba(11, 34, 54, 0.88)';
  ctx.beginPath();
  ctx.roundRect(116, 862, boxW, 54 + titleLines.length * 38, 14);
  ctx.fill();
  ctx.fillStyle = '#7FC0F0';
  ctx.font = `700 22px ${BODY}`;
  ctx.fillText(moment.kicker.toUpperCase(), 136, 896);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 38px ${DISPLAY}`;
  titleLines.forEach((line, j) => ctx.fillText(line, 136, 936 + j * 38));
  ctx.restore();

  // Trayectoria: escudos en fila.
  section('TRAYECTORIA', 1140);
  const crests = await Promise.all(s.clubs.map((c) => loadCrest(c.club)));
  let x = 100;
  for (let i = 0; i < s.clubs.length; i++) {
    const c = s.clubs[i].club;
    const clubName = c.abroad ? c.city : c.name;
    ctx.font = `600 28px ${BODY}`;
    const width = 56 + ctx.measureText(clubName).width + 30;
    if (x + width > W - 100 - (i < s.clubs.length - 1 ? 70 : 0)) {
      ctx.fillStyle = '#B9D3EA';
      ctx.fillText(`+${s.clubs.length - i}`, x, 1196);
      break;
    }
    drawCrest(ctx, c, crests[i], x + 22, 1186, 22);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(clubName, x + 54, 1196);
    x += width;
  }

  ctx.fillStyle = '#7FC0F0';
  ctx.font = `500 28px ${BODY}`;
  ctx.fillText('¿Superás esta carrera?', 100, 1262);
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
