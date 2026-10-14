import './style.css';
import './ui/en-vivo';
import { Career, summarize, verdictFor, yearsText, type CareerSummary } from './engine/engine';
import { ALL_CLUBS, clubById, viewClub, type Club } from './engine/clubs';
import { COUNTRIES, countryOf, moneyShort, type Country } from './engine/countries';
import { de } from './engine/helpers';
import {
  POSITION_NAMES,
  type Avatar,
  type NtGroup,
  type NtMatch,
  type Foot,
  type Mode,
  type PlayerSetup,
  type Position,
  type Resolution,
  type SeasonRecord,
} from './engine/types';
import { DEFAULT_AVATAR, NT_KIT, avatarSVG } from './ui/avatar';
import { avatarDeCodigo, avatarEditorHtml, montarEditorAvatar } from './ui/avatar-editor';
import { CODIGO_RE } from './retos/online/protocolo';
import { TIERS, drawCareerCard } from './ui/card';
import { celebrate } from './ui/celebrate';
import { mountMinigame } from './ui/minigames';
import { esc } from './ui/esc';
import { bindTienda, comprasDestacadasHtml, estadoInicial, tiendaHtml } from './ui/tienda';
import { flag } from './ui/flags';
import { AWARD_LABEL, ICON, palmares, porSeleccion, titleLabel, trophyImg, type TrofeoImg, type TrophyIcon } from './ui/palmares';

const app = document.getElementById('app')!;
const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) || location.origin;
// Donación con Recurrente: poné aquí el enlace de "Cobro flexible" (app de Recurrente → Cobrar → ⋯ → Cobro flexible → copiar enlace).
// ponytail: vacía no se muestra ningún enlace de donación; así la rama se puede publicar antes de tener la cuenta.
const DONATE_URL: string = '';
const BEST_KEY = 'chamusqueros:mejores';
const LAST_SETUP_KEY = 'chamusqueros:ultimo';
const PLAYER_KEY = 'chamusqueros:id';
const PERFIL_KEY = 'chamusqueros:perfil';   // copia local del perfil (src/perfil/cliente.ts): sin token
const NT_LABEL = ['', 'Convocado a la Selección', 'Fijo en la Selección', 'Titular en la Selección'];

let career: Career | null = null;
let lastResolution: Resolution | null = null;
let freshSeasons = 0;

function store<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

// ---------- Ranking global (api/ranking.ts) ----------

/** avatar: [piel, pelo, color de pelo, barba, extra, dorsal], o null en carreras guardadas antes de que existiera. */
interface RankRow { pos: number; name: string; score: number; titles: number; caps: number; avatar: number[] | null; card: RankCard | null; me: boolean }
/** Carta estilo FIFA de esa misma carrera; null en las guardadas antes de que existiera. ovr: la valoración más alta. */
/** country: Selección que representa (la de origen si nunca cambió); las cartas guardadas antes de que existiera son de Guatemala. */
interface RankCard { pos: Position; ovr: number; club: string; dept: string; foot: Foot; apps: number; goals: number; assists: number; country?: string }

let pid = '';
/** Id anónimo del dispositivo: cada usuario aparece una sola vez en el ranking, con su mejor carrera. */
function playerId() {
  if (!pid) save(PLAYER_KEY, (pid = store<string>(PLAYER_KEY, '') || crypto.randomUUID()));
  return pid;
}

const avatarCode = (a: Avatar, number: number) => [a.skin, a.hair, a.hairColor, a.beard, a.extra, number];

async function rankingApi(career?: Omit<RankRow, 'pos' | 'me'>): Promise<RankRow[]> {
  // Al solo mirar el ranking se manda el último avatar: completa la fila si se guardó antes de que existiera el avatar.
  const last = store<Partial<PlayerSetup>>(LAST_SETUP_KEY, {});
  const look: Record<string, string> = last.avatar ? { 'x-player-avatar': avatarCode(last.avatar, last.number ?? 10).join(',') } : {};
  const res = await fetch('/api/ranking', career
    ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: playerId(), ...career }) }
    : { headers: { 'x-player-id': playerId(), ...look } });
  if (!res.ok) throw new Error(`ranking ${res.status}`);
  return res.json();
}

/**
 * Las carreras guardadas antes de que existiera el avatar no tienen uno: se dibuja uno fijo a partir del nombre
 * (siempre el mismo para ese nombre) hasta que el jugador vuelva y la API guarde el suyo.
 */
function nameAvatar(name: string): number[] {
  const h = [...name].reduce((acc, c) => (Math.imul(acc, 31) + c.charCodeAt(0)) >>> 0, 7);
  return [h % 6, (h >>> 3) % 8, (h >>> 6) % 3, (h >>> 8) % 5, (h >>> 11) % 4, 1 + ((h >>> 13) % 99)];
}

function rankAvatar(r: RankRow) {
  const [skin, hair, hairColor, beard, extra, number] = r.avatar ?? nameAvatar(r.name);
  return `<span class="rank-avatar" aria-hidden="true">${avatarSVG({ skin, hair, hairColor, beard, extra }, NT_KIT, number, 36)}</span>`;
}

function rankingTable(rows: RankRow[]) {
  return `<div class="log ranking">
    <div class="log-head"><span>#</span><span>JUGADOR</span><span>PTS</span><span>TÍT</span><span>SEL</span></div>
    ${rows.map((r, i) => `${i && r.pos > rows[i - 1].pos + 1 ? '<p class="season-empty">…</p>' : ''}
      <button class="season${r.me ? ' me' : ''}" data-i="${i}" aria-haspopup="dialog">
        <span class="year">${r.pos}</span>
        <span class="club">${rankAvatar(r)}<span class="rank-name"><span>${esc(r.name)}</span><small>${esc(verdictFor(r.score, countryOf(r.card?.country).adj).title)}</small></span></span>
        <span>${r.score}</span><span>${r.titles}</span><span>${r.caps}</span>
      </button>`).join('')}
  </div>
  <p class="season-empty">Tocá un jugador para ver su carta. Empates: gana quien tenga más títulos, después más partidos con la Selección y, si siguen iguales, quien llegó primero.</p>`;
}

/** Carta de FC de una fila del ranking, con el estilo de su veredicto (el mismo de la carta final, ui/card.ts).
 * Lo que la fila no guardó (carreras de antes de la carta) sale como "—". */
function futCard(r: RankRow) {
  const c = r.card;
  const club = ALL_CLUBS.find((k) => k.id === c?.club); // no clubById: el id viene de la base y clubById tira error si no existe
  const [skin, hair, hairColor, beard, extra, number] = r.avatar ?? nameAvatar(r.name);
  const home = countryOf(c?.country);
  const v = verdictFor(r.score, home.adj);
  const t = TIERS[v.tier];
  const stats: [string, number | string][] = [
    ['PJ', c?.apps ?? '—'], ['GOL', c?.goals ?? '—'], ['AST', c?.assists ?? '—'], ['TÍT', r.titles], ['SEL', r.caps], ['PTS', r.score],
  ];
  return `<div class="fut" style="--fut-a:${t.bg[0]};--fut-b:${t.bg[1]};--fut-c:${t.bg[2]};--fut-ink:${t.ink};--fut-muted:${t.muted};--fut-accent:${t.accent};--fut-border:${t.border}">
    <span class="fut-tier">${t.label}</span>
    <div class="fut-side">${c ? `<b>${c.ovr}</b><span>${c.pos}</span>` : ''}<i class="fut-flag" title="${esc(home.name)}" style="background:url(https://flagcdn.com/w40/${home.flag}.png) center/cover"></i>${club ? crest(club, true) : ''}</div>
    <div class="fut-face">${avatarSVG({ skin, hair, hairColor, beard, extra }, club?.colors ?? NT_KIT, number, 160)}</div>
    <h3 class="fut-name">${esc(r.name)}</h3>
    <dl class="fut-stats">${stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    <p class="fut-meta"><b>${esc(v.title)}</b>${c ? ` · ${esc(c.dept)} · Pie ${c.foot.toLowerCase()}` : ''}</p>
  </div>`;
}

async function rankingScreen() {
  render(`
    <section class="hero"><span class="eyebrow">Ranking global</span><h1>Los mejores</h1></section>
    <section class="panel" id="rank"><p class="season-empty">Cargando…</p></section>
    <button class="btn big" id="back">Volver</button>
    <dialog class="fut-dialog" id="fut" aria-label="Carta del jugador"></dialog>
    ${footer()}
  `);
  document.getElementById('back')!.onclick = home;
  const box = document.getElementById('rank')!;
  const dialog = document.getElementById('fut') as HTMLDialogElement;
  // Tocar afuera de la carta la cierra. Sin llaves, el false de && cancelaría el clic del botón Cerrar.
  dialog.onclick = (e) => {
    if (e.target === dialog) dialog.close();
  };
  try {
    const rows = await rankingApi();
    box.innerHTML = rows.length ? rankingTable(rows) : '<p class="season-empty">Todavía no hay carreras en el ranking. ¡Sé el primero!</p>';
    box.onclick = (e) => {
      const row = (e.target as Element).closest<HTMLElement>('[data-i]');
      if (!row) return;
      dialog.innerHTML = `${futCard(rows[Number(row.dataset.i)])}<form method="dialog"><button class="btn">Cerrar</button></form>`;
      bindCrests(dialog);
      dialog.showModal();
    };
  } catch {
    box.innerHTML = '<p class="season-empty">No pudimos cargar el ranking. Probá de nuevo en un rato.</p>';
  }
}

function crest(club: Club, small = false) {
  return `<span class="crest${small ? ' sm' : ''}" style="--c1:${club.colors[0]};--c2:${club.colors[1]}" title="${esc(club.name)}">
    ${club.short}<img src="${import.meta.env.BASE_URL}escudos/${club.id}.png" alt="" loading="lazy"></span>`;
}
function bindCrests(root: ParentNode) {
  root.querySelectorAll<HTMLImageElement>('.crest img').forEach((img) => {
    const drop = () => img.remove();
    if (img.complete && img.naturalWidth === 0) drop();
    else img.addEventListener('error', drop, { once: true });
  });
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Afuera se muestra el país del club; en casa, su liga. */
const tierTag = (club: Club) => (club.abroad ? countryOf(club.country).name : club.league);
/** Club de una temporada visto desde la nacionalidad del jugador (afuera = extranjero). */
const seasonClub = (id: string) => viewClub(clubById(id), career!.home);

function render(html: string, keepScroll = false) {
  const y = window.scrollY;
  app.innerHTML = `<div class="flag"></div>${html}`;
  bindCrests(app);
  window.scrollTo({ top: keepScroll ? y : 0 });
}

// ---------- Portada ----------

interface BestCareer { name: string; verdict: string; score: number; goals: number; titles: number; position: Position }

/** Carta de ejemplo de la landing: constante, sin datos del usuario. */
const DEMO_CARD: RankRow = {
  pos: 1, name: 'Chepe Chamusquero', score: 175, titles: 6, caps: 48, avatar: null, me: false,
  card: { pos: 'DEL', ovr: 88, club: 'municipal', dept: 'Guatemala', foot: 'Derecho', apps: 512, goals: 231, assists: 94, country: 'GT' },
};

function home() {
  // ponytail: localStorage lo puede editar el usuario; solo se valida lo mínimo para que la portada no se rompa.
  const raw = store<unknown>(BEST_KEY, []);
  const best = (Array.isArray(raw) ? (raw as Partial<BestCareer>[]) : []).filter((b) => b && typeof b === 'object').slice(0, 3);
  const top = best[0];
  const last = store<Partial<PlayerSetup>>(LAST_SETUP_KEY, {});
  const name = [last.firstName, last.lastName].filter(Boolean).join(' ') || 'Tu nombre';
  const number = last.number ?? 10;
  const go = (what: 'start' | 'ranking' | 'retos' | 'perfil' | 'ranking-retos', label: string, cls = 'btn big') => `<button class="${cls}" data-go="${what}">${label}</button>`;
  const retos = (cls: string) => go('retos', 'Retos Fútbol<span style="display:block;font:500 14px/1.3 var(--body);color:var(--muted)">Duelo de 2 en un solo celular</span>', cls);
  render(`
    <div class="brand">Chamus<span>queros</span></div>
    <section class="hero center">
      <h1>Convertite <span>en leyenda</span></h1>
      <p>Creá a tu futbolista y viví su carrera entera, decisión por decisión.</p>
    </section>
    ${go('start', 'Empezar mi carrera')}
    ${retos('btn secondary')}
    ${top
      ? `<div class="record">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/></svg>
          <div><small>Tu récord</small><b>${esc(String(top.name))} · ${esc(String(top.verdict))}</b></div>
          <button class="link" data-go="ranking">Ranking ›</button>
        </div>`
      : ''}
    <div class="sticker" aria-hidden="true">
      ${avatarSVG(last.avatar ?? DEFAULT_AVATAR, countryOf(last.country).kit, number, 150)}
      <div class="sticker-band"><div><small>Selección · Dorsal ${number}</small><b>${esc(name)}</b></div><i></i></div>
      <span class="seal"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" fill="currentColor"/></svg>Leyenda</span>
    </div>

    <section class="land">
      <h2>Cómo funciona</h2>
      <ol class="steps">
        <li><div><b>Creá a tu jugador</b><span>Elegí su cara, su país, su posición y su dorsal.</span></div></li>
        <li><div><b>Decidí en cada etapa</b><span>Fichajes, lesiones, la Selección: cada elección cambia su carrera.</span></div></li>
        <li><div><b>Mirá su carta y compará</b><span>Al retirarse recibe su carta de FC y compite en el ranking global.</span></div></li>
      </ol>
    </section>

    <section class="land">
      <h2>Qué incluye</h2>
      <div class="feat">
        <h3>${COUNTRIES.length} países con equipos reales</h3>
        <p>Debutá en la liga de tu país y mirá si das el salto al extranjero.</p>
        <div class="flags" aria-hidden="true">${COUNTRIES.slice(0, 8).map((c) => flag(c.name, 'mini-flag')).join('')}</div>
      </div>
      <div class="feat">
        <h3>Selección y Mundial</h3>
        <p>Si rendís, te convocan: eliminatorias, copas continentales y, según tu país, la Liga de Naciones. Llegá a la fase final del Mundial y salí campeón.</p>
      </div>
      <div class="feat">
        <h3>Palmarés</h3>
        <p>Títulos de club y de selección, y premios individuales: ${AWARD_LABEL.mvp}, ${AWARD_LABEL.goleador}, ${AWARD_LABEL.ideal} y más.</p>
      </div>
      <div class="feat">
        <h3>Carta de FC</h3>
        <p>Cada carrera termina en una carta para compartir. Ejemplo:</p>
        <div class="fut-demo">${futCard(DEMO_CARD)}</div>
      </div>
    </section>

    <section class="land">
      <h2>Retos Fútbol</h2>
      <p>Jugá de a dos con un solo celular: ping pong de futbolistas por país o por club, y preguntas de fútbol. Gana quien se lleve 2 de 3.</p>
      <ul>
        <li><b>Ping pong de país:</b> se turnan para decir futbolistas de un país, sin repetir.</li>
        <li><b>Ping pong de club:</b> lo mismo con los futbolistas de un club.</li>
        <li><b>Preguntas:</b> 5 preguntas de fútbol para cada uno.</li>
      </ul>
      ${retos('btn secondary')}
      <div class="row">${go('perfil', 'Mi perfil ›', 'link')}${go('ranking-retos', 'Ranking de Retos ›', 'link')}</div>
    </section>

    <section class="land">
      <h2>${best.length ? 'Tus mejores carreras' : 'Ranking global'}</h2>
      ${best.length
        ? `<ol class="best">${best.map((b, i) => `<li><span class="n">${i + 1}</span><span class="who"><b>${esc(String(b.name))}</b><small>${esc(String(b.verdict))}</small></span><span class="pts">${Number(b.score) || 0} pts</span></li>`).join('')}</ol>`
        : '<p>El ranking global guarda una carrera por jugador y gana quien tenga más puntos. Terminá la tuya y mirá en qué puesto quedás.</p>'}
      ${go('ranking', 'Ver ranking', 'btn secondary')}
    </section>

    <section class="land closing">
      <p class="closing-title">¿Listo para debutar?</p>
      ${go('start', 'Empezar mi carrera')}
    </section>
    ${footer()}
  `);
  const destino = {
    start: createForm, ranking: rankingScreen, retos: () => abrirRetos(), perfil: abrirPerfil, 'ranking-retos': () => abrirRetos('ranking'),
  };
  app.querySelectorAll<HTMLElement>('[data-go]').forEach((b) => (b.onclick = destino[b.dataset.go as keyof typeof destino]));
}

// Retos Fútbol y el perfil viven en su propio paquete: solo se descargan cuando alguien los abre.
/** Adonde abre Retos: el ranking, o una sala por su código (link `?sala=`). */
type DestinoRetos = 'ranking' | { sala: string };
const sinPaquete = () => alert('No se pudo cargar. Revisá tu conexión e intentá de nuevo.');
function abrirRetos(destino?: DestinoRetos, alSalir: () => void = home) {
  // ponytail: el cast sobra cuando el bloque B agrega el tercer parámetro a montarRetos (B7); mientras tanto compila con la firma vieja.
  import('./retos/index')
    .then((m) => (m.montarRetos as (a: HTMLElement, salir: () => void, d?: DestinoRetos) => void)(app, alSalir, destino))
    .catch(sinPaquete);
}
function abrirPerfil() {
  import('./perfil/index').then((m) => m.montarPerfil(app, home)).catch(sinPaquete);
}

/** Enlace de donación: abre otra pestaña sin acceso a la del juego ni a la dirección de origen. */
function donateLink(cls = '') {
  return `<a${cls ? ` class="${cls}"` : ''} href="${DONATE_URL}" target="_blank" rel="noopener noreferrer">Invitame un café ☕<span class="sr"> (se abre en otra pestaña)</span></a>`;
}

function footer() {
  return `<footer>
    <p>Juego de ficción. Los partidos, resultados y situaciones son simulados.</p>
    <p><a href="${import.meta.env.BASE_URL}privacidad.html">Política de privacidad</a></p>
    <p><a href="${import.meta.env.BASE_URL}terminos.html">Términos y condiciones</a></p>
    <p><a href="${import.meta.env.BASE_URL}creditos.html">Créditos de imágenes</a></p>
    ${DONATE_URL ? `<p>${donateLink()}</p>` : ''}
  </footer>`;
}

// ---------- Crear jugador ----------

function seg(name: string, options: [string, string, string?][], selected: string) {
  return `<div class="seg" role="radiogroup">${options
    .map(([value, label, hint]) => {
      const id = `${name}-${value}`;
      return `<input type="radio" name="${name}" id="${id}" value="${value}" ${value === selected ? 'checked' : ''}>
        <label for="${id}">${label}${hint ? `<small>${hint}</small>` : ''}</label>`;
    })
    .join('')}</div>`;
}

/** Departamentos (o estados, provincias...) del país; el elegido antes si es del mismo país. */
function regionOptions(code: string, selected?: string) {
  const regions = countryOf(code).regions;
  const pick = selected && regions.includes(selected) ? selected : code === 'GT' ? 'Guatemala' : regions[0];
  return regions.map((d) => `<option ${d === pick ? 'selected' : ''}>${esc(d)}</option>`).join('');
}

function createForm() {
  const last = store<Partial<PlayerSetup>>(LAST_SETUP_KEY, {});
  // RF-30: con perfil guardado, el avatar es el del perfil y, si el nombre está vacío, la primera palabra del apodo. Todo sigue editable.
  const perfil = store<{ apodo?: unknown; avatar?: unknown } | null>(PERFIL_KEY, null);
  const delPerfil = avatarDeCodigo(perfil?.avatar);
  const avatar: Avatar = { ...DEFAULT_AVATAR, ...(delPerfil?.avatar ?? last.avatar ?? {}) };
  const nombre = last.firstName || (typeof perfil?.apodo === 'string' ? perfil.apodo.trim().split(/\s+/)[0].slice(0, 16) : '');
  const country = countryOf(last.country).code;
  const countries = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  render(`
    <section class="hero"><span class="eyebrow">Creá a tu jugador</span><h1>Tu jugador</h1></section>
    <form class="panel" id="form" novalidate>
      ${avatarEditorHtml(avatar)}
      <div class="grid-2">
        <div class="field"><label for="firstName">Nombre</label><input id="firstName" maxlength="16" autocomplete="off" value="${esc(nombre)}" placeholder="Carlos"></div>
        <div class="field"><label for="lastName">Apellido</label><input id="lastName" maxlength="18" autocomplete="off" value="${esc(last.lastName ?? '')}" placeholder="Ruiz"></div>
      </div>
      <div class="field"><label for="country">Nacionalidad</label><select id="country">${countries
        .map((c) => `<option value="${c.code}" ${c.code === country ? 'selected' : ''}>${esc(c.name)}</option>`)
        .join('')}</select></div>
      <div class="grid-2">
        <div class="field"><label for="dept" id="deptLabel">${countryOf(country).regionLabel}</label><select id="dept">${regionOptions(country, last.dept)}</select></div>
        <div class="field"><label for="number">Dorsal</label><input id="number" type="number" min="1" max="99" inputmode="numeric" value="${last.number ?? 10}"></div>
      </div>
      <div class="field"><span class="label">Posición</span>${seg('position', [['POR', 'POR'], ['DEF', 'DEF'], ['MED', 'MED'], ['DEL', 'DEL']], last.position ?? 'DEL')}</div>
      <div class="field"><span class="label">Pierna hábil</span>${seg('foot', [['Derecho', 'Derecha'], ['Zurdo', 'Zurda'], ['Ambidiestro', 'Ambas']], last.foot ?? 'Derecho')}</div>
      <div class="field"><span class="label">Ritmo de la carrera</span>${seg('mode', [
        ['intensa', 'Intensa', '3 por temporada'],
        ['normal', 'Normal', '2 o 3 por temporada'],
        ['expres', 'Exprés', '2 por temporada'],
      ], last.mode ?? 'intensa')}
        <p class="season-empty">Decisiones por temporada. Cada temporada trae además un minijuego.</p></div>
      <p class="error" id="error" role="alert"></p>
      <button class="btn big" type="submit">Debutar</button>
    </form>
    <button class="btn secondary" id="back">Volver</button>
  `);

  const preview = document.getElementById('avatarPreview')!;
  const countrySel = document.getElementById('country') as HTMLSelectElement;
  const number = () => Number((document.getElementById('number') as HTMLInputElement).value) || 10;
  const paint = () => (preview.innerHTML = avatarSVG(avatar, countryOf(countrySel.value).kit, number(), 132));
  // Cada país tiene sus regiones; el jugador debuta en un club de la suya si existe.
  countrySel.onchange = () => {
    document.getElementById('dept')!.innerHTML = regionOptions(countrySel.value);
    document.getElementById('deptLabel')!.textContent = countryOf(countrySel.value).regionLabel;
    paint();
  };
  montarEditorAvatar(app, avatar, paint);
  paint();
  document.getElementById('number')!.addEventListener('input', paint);
  document.getElementById('back')!.onclick = home;
  document.getElementById('form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = (id: string) => (document.getElementById(id) as HTMLInputElement).value.trim();
    const radio = (name: string) => (document.querySelector(`input[name="${name}"]:checked`) as HTMLInputElement).value;
    const lastName = val('lastName');
    if (!lastName) {
      document.getElementById('error')!.textContent = 'Escribí el apellido de tu jugador. Es el que va en la camisola.';
      return;
    }
    const setup: PlayerSetup = {
      firstName: val('firstName'),
      lastName,
      country: countrySel.value,
      dept: val('dept'),
      number: Math.min(99, Math.max(1, number())),
      position: radio('position') as Position,
      foot: radio('foot') as Foot,
      mode: radio('mode') as Mode,
      avatar: { ...avatar },
    };
    save(LAST_SETUP_KEY, setup);
    career = new Career(setup);
    lastResolution = null;
    debut();
  });
}

// ---------- Juego ----------

const fullName = () => (career ? `${career.player.setup.firstName} ${career.player.setup.lastName}`.trim() : '');

function debut() {
  const c = career!;

  const club = c.club;
  const [first, second] = c.home.leagues;
  const where =
    club.tier === 1
      ? `Empezás en las fuerzas básicas de un club de ${first}. Debutar en el primer equipo no va a ser fácil.`
      : club.tier === 2
        ? `Empezás en ${second}, la antesala de ${first}. Acá se forjan los que suben.`
        : `Empezás en ${club.league}: canchas duras, viajes largos y mucha hambre. Desde aquí empiezan muchas leyendas.`;
  render(`
    ${playerHead()}
    <section class="panel event">
      <span class="eyebrow">${esc(club.league)} · ${c.player.year}</span>
      <h3>Firmaste con ${esc(club.name)}</h3>
      <p class="text">Tenés 16 años y ${esc(club.name)} te abre las puertas.${club.stadium ? ` Vas a jugar de local en el ${esc(club.stadium)}, en ${esc(club.city)}.` : ''} ${where}</p>
      <button class="btn big" id="go">Arrancar la carrera</button>
    </section>
    ${footer()}
  `);
  document.getElementById('go')!.onclick = () => {
    career!.start();
    freshSeasons = 0;
    gameScreen();
  };
}

/** Sigue la temporada: la siguiente decisión o, si ya no queda nada, simula la temporada y muestra su resumen (uno por temporada). */
function advance() {
  const r = career!.advance();
  freshSeasons = r ? 1 : 0;
  lastResolution = null;
  if (r) seasonSummary([r]);
  else gameScreen();
}

// ---------- Resumen de temporada ----------

const ntCall = (team: Country = career!.nt) => `<p class="nt-title">${flag(team.name, 'mini-flag')}¡Te han llamado a la Selección!</p>`;

const trophySvg = (icon: TrophyIcon) => `<svg aria-hidden="true" viewBox="0 0 24 24">${ICON[icon]}</svg>`;
/** Archivo local de public/trofeos/ (el nombre sale de la tabla fija TROFEO_IMG, nunca de datos de la carrera). */
const trofeoSrc = (img: TrofeoImg) => `${import.meta.env.BASE_URL}trofeos/${img.file}`;

/** Un trofeo con su imagen (caja fija de 48 x 48: no mueve nada al cargar) o, sin imagen, su ícono de trazo. */
function trophy(icon: TrophyIcon, label: string, detail: string, img?: TrofeoImg) {
  const pic = img
    ? `<img class="trophy-img" src="${esc(trofeoSrc(img))}" width="48" height="48" loading="lazy" decoding="async" alt="${esc(img.alt)}" data-icon="${icon}">`
    : trophySvg(icon);
  return `<li class="trophy${icon === 'copa' ? '' : ' award'}">${pic}<span><b>${esc(label)}</b><small>${esc(detail)}</small></span></li>`;
}
// Si una imagen no carga (archivo faltante, bloqueada, sin conexión) se cambia por el ícono de trazo del mismo trofeo, en la misma caja.
// 'error' no burbujea: un solo oyente en la fase de captura, sin manejadores en línea. La clave se busca en la lista fija ICON.
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.dataset.icon) return;
  const icon = img.dataset.icon;
  if (Object.hasOwn(ICON, icon)) img.outerHTML = trophySvg(icon as TrophyIcon);
  else img.remove();
}, true);

/** team: la Selección de esa temporada (puede no ser la de hoy ni la de origen). */
function matchRow(m: NtMatch, team: Country) {
  // Las carreras viejas no traen penales ni ronda; si vienen mal formados se ignoran.
  const pen = Array.isArray(m.pen) && m.pen.length === 2 && m.pen.every(Number.isFinite) ? m.pen : null;
  const d = m.gf - m.ga || (pen ? pen[0] - pen[1] : 0);
  const [cls, tag, word] = d > 0 ? ['win', 'G', 'Victoria'] : d < 0 ? ['loss', 'P', 'Derrota'] : ['draw', 'E', 'Empate'];
  return `<li><span class="res ${cls}"><span aria-hidden="true">${tag}</span><span class="sr">${word}</span></span>
    <span>${typeof m.round === 'string' ? `<small class="round">${esc(m.round)}</small>` : ''}${esc(team.name)} ${m.gf}-${m.ga}${pen ? ` (${pen[0]}-${pen[1]} pen.)` : ''} ${flag(m.rival)}${esc(m.rival)}</span>${m.goals ? `<span class="chip up">${m.goals} ${m.goals > 1 ? 'goles' : 'gol'}</span>` : ''}</li>`;
}

/** Tabla final del grupo de la Selección del jugador; G, E y P se esconden en pantallas angostas. */
function groupTable(g: NtGroup, team: Country) {
  const rows = g.table.map((r, i) => {
    const dg = r.gf - r.ga;
    const cls = [r.team === team.name ? 'gt' : '', i < g.advance ? 'up' : ''].filter(Boolean).join(' ');
    return `<tr${cls ? ` class="${cls}"` : ''}><td>${i + 1}</td><td><span class="team">${flag(r.team)}<span>${esc(r.team)}</span></span></td>
      <td>${r.pj}</td><td class="wide">${r.g}</td><td class="wide">${r.e}</td><td class="wide">${r.p}</td><td>${dg > 0 ? '+' : ''}${dg}</td><td><b>${r.pts}</b></td></tr>`;
  });
  return `<table class="group">
    <thead><tr><th scope="col"><span class="sr">Puesto</span></th><th scope="col">Selección</th><th scope="col"><abbr title="Partidos jugados">PJ</abbr></th>
      <th scope="col" class="wide"><abbr title="Ganados">G</abbr></th><th scope="col" class="wide"><abbr title="Empatados">E</abbr></th><th scope="col" class="wide"><abbr title="Perdidos">P</abbr></th>
      <th scope="col"><abbr title="Diferencia de goles">DG</abbr></th><th scope="col"><abbr title="Puntos">Pts</abbr></th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>
  <p class="group-note">${esc(g.note)}</p>`;
}

function ntBlock(nt: NonNullable<SeasonRecord['nt']>) {
  // La Selección de esa temporada; sin nt.team (temporadas viejas) es la de origen, y un código raro cae en Guatemala.
  const home = countryOf(nt.team ?? career!.home.code);
  const camiseta = home.code === 'GT' ? 'azul y blanco' : `camiseta ${esc(de(home.ntName))}`;
  const groups = nt.groups ?? [];
  const comps = [...new Set([...groups.map((g) => g.comp), ...nt.matches.map((m) => m.comp)])];
  return `<div class="nt-call${nt.debut ? ' debut' : ''}">
    ${nt.debut ? `${ntCall(home)}<p>${esc(home.name)} te convocó por primera vez. Vas a vestir la ${camiseta}.</p>`
      : nt.cambio ? `${ntCall(home)}<p>${esc(home.name)} te convocó. Elegiste vestir la ${camiseta}.</p>`
      : `<p class="nt-title">${flag(home.name, 'mini-flag')}Convocado a la Selección</p>`}
    ${comps.map((c) => {
      const g = groups.find((x) => x.comp === c);
      const mine = nt.matches.filter((m) => m.comp === c && !m.round);
      const ko = nt.matches.filter((m) => m.comp === c && m.round);
      const out = typeof g?.out === 'string' ? g.out : '';
      return `<p class="nt-comp">${esc(c)}</p>${g ? groupTable(g, home) : ''}${mine.length ? `${g ? '<p class="group-note">Tus partidos</p>' : ''}<ul class="matches">${mine.map((m) => matchRow(m, home)).join('')}</ul>` : g ? '<p class="group-note">No jugaste en este grupo.</p>' : ''}
        ${ko.length ? `<p class="group-note">Fase final</p><ul class="matches">${ko.map((m) => matchRow(m, home)).join('')}</ul>` : ''}
        ${out ? `<p class="ko-out${out === 'Campeón' ? ' champ' : ''}">${out === 'Campeón' ? '🏆 ' : ''}${esc(out)}</p>` : ''}`;
    }).join('')}
  </div>`;
}

function seasonCard(r: SeasonRecord) {
  const club = seasonClub(r.clubId);
  const league = club.league;
  const stats: [string, number][] = [
    ['Partidos', r.apps],
    r.cleanSheets === undefined ? ['Goles', r.goals] : ['Vallas invictas', r.cleanSheets],
    ['Asistencias', r.assists],
  ];
  const trophies = [
    ...r.titles.map((t) => trophy('copa', 'Campeón', t, trophyImg(titleLabel(t), 'copa'))),
    ...r.awards.map((a) => {
      const label = a.label ?? AWARD_LABEL[a.kind];
      return trophy(a.kind, label, league, trophyImg(label, a.kind));
    }),
  ];
  return `<section class="panel season-card">
    <span class="eyebrow">Temporada ${r.label} · ${r.age} años</span>
    <p class="club-line">${crest(club, true)}<span>${esc(cap(club.name))}</span><span class="tier">${esc(tierTag(club))}</span></p>
    <div class="totals">${stats.map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('')}</div>
    <p class="meta money">Ganaste <b>${esc(cash(r.salary))}</b> en la temporada</p>
    ${r.gastos?.personal ? `<p class="meta money">Pagaste <b>${esc(cash(r.gastos.personal))}</b> a tu personal</p>` : ''}
    ${(r.gastos?.despidos ?? []).map((d) => `<p class="chip down">${esc(d)}</p>`).join('')}
    ${r.injured ? '<p class="chip down">Temporada marcada por una lesión</p>' : ''}
    ${trophies.length ? `<ul class="trophies">${trophies.join('')}</ul>` : ''}
    ${r.nt ? ntBlock(r.nt) : ''}
    ${r.note ? `<p class="season-empty">${esc(r.note)}</p>` : ''}
  </section>`;
}

/** Lo que pasó en la temporada recién jugada (una por pantalla en los tres modos), antes de la siguiente decisión. */
function seasonSummary(played: SeasonRecord[], first = true) {
  const over = career!.isOver;
  render(`${playerHead()}${played.map(seasonCard).join('')}
    ${over ? '' : '<button class="btn secondary" id="shop">Tienda</button>'}
    <button class="btn big" id="next">${over ? 'Ver mi carrera' : 'Seguir'}</button>`);
  document.getElementById('next')!.onclick = () => (over ? finish() : gameScreen());
  // Desde aquí la tienda es segura: la decisión que sigue todavía no se mostró, así que no hay un minijuego a medio jugar.
  const shop = document.getElementById('shop');
  if (shop) shop.onclick = () => tiendaScreen(() => seasonSummary(played, false));
  if (!first) return; // al volver de la tienda no se celebra otra vez
  // Solo aquí, al revelar las temporadas nuevas: el historial no la repite. El Mundial, si lo hay, manda.
  const cups = played.flatMap((r) => (r.nt?.groups ?? []).filter((g) => g.out === 'Campeón').map((g) => g.comp));
  const mundial = cups.find((c) => c.startsWith('Mundial'));
  const balon = played.flatMap((r) => r.awards).find((a) => a.kind === 'balon');
  const img = trophyImg('Balón de Oro', 'balon');
  // Prioridad: Mundial, Balón de Oro y después una copa de selección.
  if (mundial) celebrate(mundial, true);
  else if (balon && img) celebrate(balon.name, false, { title: '¡Balón de Oro!', img: { src: trofeoSrc(img), alt: img.alt, icon: 'balon' } });
  else if (cups[0]) celebrate(cups[0], false);
}

/** Monto en la moneda de la nacionalidad (los datos están en quetzales). */
const cash = (quetzales: number) => moneyShort(career!.home, quetzales);

function playerHead() {
  const p = career!.player;
  const club = career!.club;
  const nt = p.ntLevel > 0 ? ` · <span class="nt">${NT_LABEL[p.ntLevel]}</span>` : '';
  return `<header class="player-head">
    <div class="avatar">${avatarSVG(p.setup.avatar, club.colors, p.setup.number, 72)}</div>
    <div class="who">
      <h2>${esc(fullName())}</h2>
      <p class="meta">${POSITION_NAMES[p.setup.position]} · ${p.age} años · ${esc(career!.home.name)}${nt}</p>
      <p class="meta money">Saldo <b>${esc(cash(career!.saldo))}</b> · Contrato ${esc(cash(p.contract.salary))} por temporada · ${yearsText(p.contract.until - p.year + 1)}</p>
      <p class="club-line">${crest(club, true)}<span>${esc(cap(club.name))}</span><span class="tier">${esc(tierTag(club))}</span></p>
      ${club.stadium ? `<p class="meta">${esc(club.stadium)} · ${esc(club.city)}</p>` : ''}
    </div>
  </header>`;
}

/** La tienda (specs/tienda). volver: a dónde regresa "Volver al juego"; el juego en sí no se toca, así que queda en el mismo punto. */
function tiendaScreen(volver: () => void) {
  const estado = estadoInicial();
  const draw = (keepScroll: boolean) => {
    render(`${playerHead()}${tiendaHtml(career!, estado, cash)}`, keepScroll);
    bindTienda(document.getElementById('tienda')!, career!, estado, () => draw(true), volver);
  };
  draw(false);
}

function statsBar() {
  const p = career!.player;
  const items: [string, number, number][] = [
    ['Nivel', Math.round(p.rating), p.rating],
    ['Ánimo', Math.round(p.morale), p.morale],
    ['Físico', Math.round(p.fitness), p.fitness],
    ['Técnico', Math.round(p.coach), p.coach],
    ['Fama', Math.round(p.fame), Math.min(100, p.fame / 1.5)],
  ];
  return `<section class="stats">${items
    .map(([k, v, pct]) => `<div class="stat"><span class="k">${k}</span><span class="v">${v}</span><span class="bar"><i style="width:${Math.max(3, Math.min(100, pct))}%"></i></span></div>`)
    .join('')}</section>`;
}

function seasonRow(r: SeasonRecord, fresh: boolean) {
  const club = seasonClub(r.clubId);
  // Afuera, el país; en casa, la división (las de ascenso: "1ra Div." y "2da Div." en Guatemala, "2da Div." en el resto).
  const tier = club.abroad ? countryOf(club.country).name : ((career!.home.short ?? ['', '2da Div.'])[r.tier - 1] ?? '');
  const chips = [
    ...r.titles.map((t) => `<span class="chip gold">${esc(t)}</span>`),
    ...r.awards.map((a) => `<span class="chip gold">${esc(a.label ?? AWARD_LABEL[a.kind])}</span>`),
    `<span class="chip">Ganó ${esc(cash(r.salary))}</span>`,
    r.nt ? `<span class="chip">Selección · ${r.nt.matches.length} PJ</span>` : '',
    r.note ? `<span class="chip">${esc(r.note)}</span>` : '',
  ].filter(Boolean);
  return `<div class="season${r.injured ? ' injured' : ''}${fresh ? ' fresh' : ''}">
    <span class="year">${r.label}</span>
    <span class="club">${crest(club, true)}<span>${esc(club.name)}${tier ? ` <small>${esc(tier)}</small>` : ''}</span></span>
    <span>${r.apps}</span><span>${r.goals}</span><span>${r.assists}</span>
    ${chips.length ? `<div class="season-titles">${chips.join('')}</div>` : ''}
  </div>`;
}

function seasonLog() {
  const seasons = [...career!.player.seasons].reverse();
  return `<section class="panel">
    <span class="eyebrow">Temporadas</span>
    <div class="log">
      <div class="log-head"><span>AÑO</span><span>CLUB</span><span>PJ</span><span>G</span><span>A</span></div>
      ${seasons.length ? seasons.map((r, i) => seasonRow(r, i < freshSeasons)).join('') : '<p class="season-empty">Tu primera temporada arranca después de estas decisiones.</p>'}
    </div>
  </section>`;
}

function chipClass(change: string) {
  if (change.startsWith('+') || change.startsWith('Convocado') || change.startsWith('Ahora jugás con') || change.endsWith('avanza en la eliminatoria') || change.startsWith('Más peso') || change === 'Lesión evitada') return 'up';
  if (change.startsWith('-') || change === 'Lesión') return 'down';
  return '';
}

const CATEGORY_LABEL: Record<string, string> = {
  formacion: 'Formación',
  vida: 'Vida personal',
  cancha: 'En la cancha',
  medios: 'Medios',
  contrato: 'Contrato',
  seleccion: 'Selección',
  extranjero: 'Extranjero',
  divisiones: 'Ascenso',
  amor: 'Vida sentimental',
  retiro: 'Final de carrera',
  minijuego: 'Minijuego',
};

/** "Decisión 2 de 3 · Temporada 2031-32 · 17 años" o "Minijuego de la temporada · Temporada 2031-32" (el llamador lo escapa). */
function progresoText(g: Career['progreso'], category: string, age: number) {
  if (!g) return CATEGORY_LABEL[category] ?? '';
  return g.minijuego ? `Minijuego de la temporada · Temporada ${g.temporada}` : `Decisión ${g.n} de ${g.de} · Temporada ${g.temporada} · ${age} años`;
}

function gameScreen() {
  const ev = career!.pendingEvent;
  const res = lastResolution;
  // Una temporada sin ninguna decisión ni minijuego (no debería pasar): se simula y sigue.
  if (!ev && !res && !career!.isOver) return advance();
  const p = career!.player;
  const eventHtml = res
    ? `<section class="panel event">
        ${res.changes.includes('Convocado a la Selección') ? `<div class="nt-call debut">${ntCall()}</div>` : ''}
        <p class="outcome">${esc(res.text)}</p>
        ${res.changes.length ? `<div class="chips">${res.changes.map((c) => `<span class="chip ${chipClass(c)}">${esc(c)}</span>`).join('')}</div>` : ''}
        <button class="btn big" id="next">${career!.isOver ? 'Ver mi carrera' : 'Seguir'}</button>
      </section>`
    : ev
      ? `<section class="panel event cat-${ev.category}">
          <span class="eyebrow">${esc(progresoText(career!.progreso, ev.category, p.age))}</span>
          <h3>${esc(ev.title)}</h3>
          <p class="text">${esc(ev.text)}</p>
          ${ev.minigame ? '<div class="mg" id="mg"></div>' : `<div class="options">${ev.options.map((o, i) => `<button class="btn secondary" data-opt="${i}">${esc(o.label)}</button>`).join('')}</div>`}
        </section>`
      : '';
  // La tienda reinicia la pantalla al volver: con un minijuego a medio jugar se perdería la jugada, así que ahí no se ofrece.
  const shop = !career!.isOver && !(ev?.minigame && !res) ? '<button class="btn secondary" id="shop">Tienda</button>' : '';
  render(`${playerHead()}${statsBar()}${eventHtml}${shop}${seasonLog()}`);
  const shopBtn = document.getElementById('shop');
  if (shopBtn) shopBtn.onclick = () => tiendaScreen(gameScreen);
  app.querySelectorAll<HTMLButtonElement>('[data-opt]').forEach((b) => {
    b.onclick = () => {
      lastResolution = career!.choose(Number(b.dataset.opt));
      freshSeasons = 0;
      gameScreen();
    };
  });
  // Un minijuego reemplaza a las opciones de texto: "Continuar" vuelve a dibujar y muestra el desenlace como cualquier decisión.
  if (!res && ev?.minigame) {
    mountMinigame(
      document.getElementById('mg')!,
      ev.minigame,
      career!.rng,
      (score) => (lastResolution = career!.choose(0, score)),
      () => {
        freshSeasons = 0;
        gameScreen();
      },
    );
  }
  const next = document.getElementById('next');
  if (next) next.onclick = () => (career!.isOver ? finish() : advance());
}

// ---------- Final ----------

function shareText(s: CareerSummary) {
  const p = career!.player;
  const stat = p.setup.position === 'POR' ? `${s.apps} partidos` : `${s.apps} partidos y ${s.goals} goles`;
  return `${fullName()} terminó como "${s.verdict.title}" en Chamusqueros: ${stat}, ${s.titles.length} títulos y ${p.caps} partidos con la Selección. ¿Superás mi carrera?`;
}

function finish() {
  const p = career!.player;
  const s = summarize(p);
  const best = store<BestCareer[]>(BEST_KEY, []);
  best.push({ name: fullName(), verdict: s.verdict.title, score: s.score, goals: s.goals, titles: s.titles.length, position: p.setup.position });
  best.sort((a, b) => b.score - a.score);
  save(BEST_KEY, best.slice(0, 5));

  const highlights = p.milestones; // los premios ya están en el palmarés
  const trophies = palmares(p);
  const porSel = porSeleccion(p); // solo si cambió de Selección
  render(`
    <section class="verdict">
      <span class="eyebrow">${esc(fullName())} · retirado a los ${p.age} años</span>
      <h1>${esc(s.verdict.title)}</h1>
      <p>${esc(s.verdict.line)}</p>
    </section>
    <img class="card-img" id="cardImg" alt="Tarjeta con el resumen de la carrera">
    <div class="row">
      <button class="btn" id="share">Compartir</button>
      <button class="btn secondary" id="download">Guardar imagen</button>
    </div>
    <p class="toast" id="toast" role="status"></p>
    <section class="panel" id="rankBox"><span class="eyebrow">Ranking global</span><p class="season-empty">Guardando tu carrera…</p></section>
    <section class="panel">
      <div class="totals">
        <div><b>${s.apps}</b><span>Partidos</span></div>
        <div><b>${s.goals}</b><span>Goles</span></div>
        <div><b>${p.caps}</b><span>Selección</span></div>
        <div><b>${p.natGoals}</b><span>Goles Sel.</span></div>
      </div>
    </section>
    <section class="panel">
      <span class="eyebrow">Dinero de la carrera</span>
      <div class="totals t-totales">
        <div><b>${esc(cash(s.earned))}</b><span>Ganado</span></div>
        <div><b>${esc(cash(career!.gastado))}</b><span>Gastado</span></div>
        <div><b class="saldo">${esc(cash(career!.saldo))}</b><span>Saldo</span></div>
      </div>
      ${comprasDestacadasHtml(p) ? `<p class="meta">Lo mejor que compraste: ${comprasDestacadasHtml(p)}</p>` : ''}
      <p class="meta">Los contratos de ${p.seasons.length} temporadas, menos lo que gastaste. No cuenta para el puntaje.</p>
    </section>
    ${trophies.length ? `<section class="panel"><span class="eyebrow">Palmarés</span><p class="meta"><a href="${import.meta.env.BASE_URL}creditos.html">Créditos de imágenes</a></p><ul class="trophies">${trophies
      .map((t) => trophy(t.icon, t.label, `${t.icon === 'copa' ? 'Campeón ' : ''}${t.count === 1 ? '1 vez' : `${t.count} veces`}`, t.img))
      .join('')}</ul></section>` : ''}
    ${porSel ? `<section class="panel"><span class="eyebrow">Con cada Selección</span><ul class="list">${porSel
      .map((t) => `<li>${flag(t.team, 'mini-flag')}<b>${esc(t.team)}</b>: ${t.caps} PJ · ${t.goals} ${t.goals === 1 ? 'gol' : 'goles'} · ${t.titles} ${t.titles === 1 ? 'título' : 'títulos'}</li>`)
      .join('')}</ul></section>` : ''}
    ${highlights.length ? `<section class="panel"><span class="eyebrow">Momentos</span><ul class="list">${highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul></section>` : ''}
    ${seasonLog()}
    <button class="btn big" id="again">Jugar otra carrera</button>
    ${DONATE_URL ? `<section class="panel donate"><h3>¿Te gustó?</h3>${donateLink('btn secondary')}</section>` : ''}
    ${footer()}
  `);

  const rankBox = document.getElementById('rankBox')!;
  const card: RankCard = {
    pos: p.setup.position, ovr: p.peakRating, club: p.seasons.at(-1)?.clubId ?? p.clubId, dept: p.setup.dept, foot: p.setup.foot,
    apps: s.apps, goals: s.goals, assists: s.assists, country: career!.nt.code, // la Selección actual (la de origen si nunca cambió)
  };
  rankingApi({ name: fullName(), score: s.score, titles: s.titles.length, caps: p.caps, avatar: avatarCode(p.setup.avatar, p.setup.number), card })
    .then((rows) => {
      const me = rows.find((r) => r.me)!;
      rankBox.innerHTML = `<span class="eyebrow">Ranking global</span>
        <p>Esta carrera: <b>${s.score} pts</b>. ${me.score > s.score ? 'Tu mejor carrera' : 'Quedaste'} en el puesto <b>#${me.pos}</b>${me.score > s.score ? ` con ${me.score} pts` : ''}.</p>
        <button class="btn secondary" id="seeRank">Ver ranking</button>`;
      document.getElementById('seeRank')!.onclick = rankingScreen;
    })
    .catch(() => rankBox.remove());

  const canvas = document.createElement('canvas');
  const toast = (msg: string) => (document.getElementById('toast')!.textContent = msg);
  const ready = drawCareerCard(canvas, p, s).then(() => {
    (document.getElementById('cardImg') as HTMLImageElement).src = canvas.toDataURL('image/png');
  });
  const blob = () => ready.then(() => new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png')));
  const fileName = `chamusqueros-${p.setup.lastName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;

  document.getElementById('share')!.onclick = async () => {
    const text = shareText(s);
    try {
      const b = await blob();
      const file = b ? new File([b], fileName, { type: 'image/png' }) : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${text} ${SITE_URL}` });
        return;
      }
      if (navigator.share) {
        await navigator.share({ text, url: SITE_URL });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${SITE_URL}`);
      toast('Copiamos el texto. Pegalo en WhatsApp o en tus redes.');
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') toast('Este navegador no deja compartir. Guardá la imagen y subila a tus redes.');
    }
  };
  document.getElementById('download')!.onclick = async () => {
    const b = await blob();
    if (!b) return toast('No se pudo crear la imagen.');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Si no se descargó, mantené presionada la tarjeta para guardarla.');
  };
  document.getElementById('again')!.onclick = createForm;
}

// Un link `?sala=XXXXXX` válido abre Retos directo en esa sala; al salir se limpia la URL para que no la reabra.
const sala = new URLSearchParams(location.search).get('sala');
if (sala && CODIGO_RE.test(sala)) {
  abrirRetos({ sala }, () => {
    history.replaceState(null, '', location.pathname);
    home();
  });
} else home();
