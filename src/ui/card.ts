// Dibuja la tarjeta final de la carrera (1080x1350, formato de post de Instagram) en un canvas.
import { POSITION_NAMES, type Player } from '../engine/types';
import type { CareerSummary } from '../engine/engine';
import { clubById, type Club } from '../engine/clubs';
import { avatarSVG } from './avatar';

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
  ctx.fillText(s.verdict.title.toUpperCase(), 100, 400);

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
    ctx.fillText(value, x, 540);
    ctx.fillStyle = '#7FC0F0';
    ctx.font = `600 28px ${BODY}`;
    ctx.fillText(label.toUpperCase(), x, 582);
  });

  // Trayectoria de clubes
  ctx.fillStyle = '#7FC0F0';
  ctx.font = `700 28px ${BODY}`;
  ctx.fillText('TRAYECTORIA', 100, 670);
  const crests = await Promise.all(s.clubs.map((c) => loadCrest(c.club)));
  const shown = s.clubs.slice(0, 6);
  shown.forEach((c, i) => {
    const y = 730 + i * 74;
    drawCrest(ctx, c.club, crests[i], 130, y - 10, 28);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 34px ${BODY}`;
    const clubName = c.club.abroad ? c.club.city : c.club.name.length > 22 ? `${c.club.name.slice(0, 21)}…` : c.club.name;
    ctx.fillText(clubName, 180, y);
    ctx.fillStyle = '#B9D3EA';
    ctx.font = `500 28px ${BODY}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${c.from.slice(0, 4)}–20${c.to.slice(-2)} · ${c.apps} PJ · ${c.goals} G`, W - 100, y);
    ctx.textAlign = 'left';
  });
  if (s.clubs.length > shown.length) {
    ctx.fillStyle = '#B9D3EA';
    ctx.font = `500 26px ${BODY}`;
    ctx.fillText(`y ${s.clubs.length - shown.length} clubes más`, 180, 730 + shown.length * 74);
  }

  // Hito principal
  const highlight =
    p.milestones.find((m) => m.includes('Mundial')) ??
    // Un premio mayor (goleador, mejor jugador...) antes que uno de lista como el once ideal.
    p.seasons.flatMap((r) => r.awards).find((a) => a.kind !== 'ideal' && a.kind !== 'joven')?.name ??
    p.milestones.find((m) => m.includes('Copa Oro')) ??
    p.awards[0] ??
    s.verdict.line;
  ctx.fillStyle = '#F0C14B';
  ctx.font = `600 32px ${BODY}`;
  ctx.fillText(highlight.length > 52 ? `${highlight.slice(0, 50)}…` : highlight, 100, H - 150);
  ctx.fillStyle = '#7FC0F0';
  ctx.font = `500 28px ${BODY}`;
  ctx.fillText('¿Superás esta carrera?', 100, H - 104);
}
