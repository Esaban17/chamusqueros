import './style.css';
import { Career, LEAGUE_NAME, summarize, type CareerSummary } from './engine/engine';
import { DEPARTAMENTOS, clubById, type Club } from './engine/clubs';
import {
  POSITION_NAMES,
  type Avatar,
  type Foot,
  type Mode,
  type PlayerSetup,
  type Position,
  type Resolution,
  type SeasonRecord,
} from './engine/types';
import { adSlot, fillAds, initAds } from './ui/ads';
import { BEARD_STYLES, DEFAULT_AVATAR, EXTRAS, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, avatarSVG, randomAvatar } from './ui/avatar';
import { drawCareerCard } from './ui/card';

const app = document.getElementById('app')!;
const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) || location.origin;
const BEST_KEY = 'leyenda-chapina:mejores';
const LAST_SETUP_KEY = 'leyenda-chapina:ultimo';
const NT_KIT: [string, string] = ['#4997D0', '#FFFFFF'];
const NT_LABEL = ['', 'Convocado a la Selección', 'Fijo en la Selección', 'Titular en la Selección'];

let career: Career | null = null;
let lastResolution: Resolution | null = null;
let freshSeasons = 0;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

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
const tierTag = (club: Club) => (club.abroad ? club.city : LEAGUE_NAME[club.tier]);

function render(html: string) {
  app.innerHTML = `<div class="flag"></div>${html}`;
  bindCrests(app);
  fillAds(app);
  window.scrollTo({ top: 0 });
}

// ---------- Portada ----------

interface BestCareer { name: string; verdict: string; score: number; goals: number; titles: number; position: Position }

function home() {
  const best = store<BestCareer[]>(BEST_KEY, []);
  const sample = store<Partial<PlayerSetup>>(LAST_SETUP_KEY, {}).avatar ?? DEFAULT_AVATAR;
  render(`
    <section class="hero">
      <span class="eyebrow">Fútbol de Guatemala</span>
      <h1>Leyenda <span>Chapina</span></h1>
      <p>Arrancá en Segunda División, subí a la Liga Nacional, salí al extranjero y peleá un lugar en la Bicolor. Una carrera entera en dos minutos.</p>
    </section>
    <div class="hero-avatar" aria-hidden="true">${avatarSVG(sample, NT_KIT, 10, 132)}</div>
    <button class="btn big" id="start">Crear mi jugador</button>
    ${best.length ? `<section class="panel"><span class="eyebrow">Tus mejores carreras</span><div class="best">${best
      .map((b) => `<div class="best-row"><b>${esc(b.name)}</b><span>${esc(b.verdict)} · ${b.position === 'POR' ? '' : `${b.goals} G · `}${b.titles} títulos</span></div>`)
      .join('')}</div></section>` : ''}
    ${adSlot('home')}
    ${footer()}
  `);
  document.getElementById('start')!.onclick = createForm;
}

function footer() {
  return `<footer>
    <p>Juego de ficción. Los partidos, resultados y situaciones son simulados.</p>
    <p><a href="${import.meta.env.BASE_URL}privacidad.html">Política de privacidad</a></p>
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

function swatches(name: string, colors: string[], selected: number, labels?: string[]) {
  return `<div class="swatches" role="radiogroup">${colors
    .map((c, i) => `<input type="radio" name="${name}" id="${name}-${i}" value="${i}" ${i === selected ? 'checked' : ''}>
      <label for="${name}-${i}" style="--sw:${c}" title="${labels?.[i] ?? ''}"><span class="sr">${labels?.[i] ?? `Tono ${i + 1}`}</span></label>`)
    .join('')}</div>`;
}

function cycler(key: keyof Avatar, options: string[], value: number) {
  return `<div class="cycler" data-key="${key}">
    <button type="button" class="cy-btn" data-dir="-1" aria-label="Anterior">‹</button>
    <output id="cy-${key}">${options[value]}</output>
    <button type="button" class="cy-btn" data-dir="1" aria-label="Siguiente">›</button>
  </div>`;
}

function createForm() {
  const last = store<Partial<PlayerSetup>>(LAST_SETUP_KEY, {});
  const avatar: Avatar = { ...DEFAULT_AVATAR, ...(last.avatar ?? {}) };
  render(`
    <section class="hero"><span class="eyebrow">Creá a tu jugador</span><h1>Tu jugador</h1></section>
    <form class="panel" id="form" novalidate>
      <div class="avatar-editor">
        <div class="avatar-preview" id="avatarPreview"></div>
        <div class="avatar-controls">
          <div class="field"><span class="label">Piel</span>${swatches('skin', SKIN_TONES, avatar.skin)}</div>
          <div class="field"><span class="label">Pelo</span>${cycler('hair', HAIR_STYLES, avatar.hair)}</div>
          <div class="field"><span class="label">Color de pelo</span>${swatches('hairColor', HAIR_COLORS.map((h) => h[1]), avatar.hairColor, HAIR_COLORS.map((h) => h[0]))}</div>
          <div class="field"><span class="label">Barba</span>${cycler('beard', BEARD_STYLES, avatar.beard)}</div>
          <div class="field"><span class="label">Accesorio</span>${cycler('extra', EXTRAS, avatar.extra)}</div>
          <button type="button" class="btn secondary small" id="shuffle">Avatar al azar</button>
        </div>
      </div>
      <div class="grid-2">
        <div class="field"><label for="firstName">Nombre</label><input id="firstName" maxlength="16" autocomplete="off" value="${esc(last.firstName ?? '')}" placeholder="Carlos"></div>
        <div class="field"><label for="lastName">Apellido</label><input id="lastName" maxlength="18" autocomplete="off" value="${esc(last.lastName ?? '')}" placeholder="Ruiz"></div>
      </div>
      <div class="grid-2">
        <div class="field"><label for="dept">Departamento</label><select id="dept">${DEPARTAMENTOS.map(
          (d) => `<option ${d === (last.dept ?? 'Guatemala') ? 'selected' : ''}>${d}</option>`,
        ).join('')}</select></div>
        <div class="field"><label for="number">Dorsal</label><input id="number" type="number" min="1" max="99" inputmode="numeric" value="${last.number ?? 10}"></div>
      </div>
      <div class="field"><span class="label">Posición</span>${seg('position', [['POR', 'POR'], ['DEF', 'DEF'], ['MED', 'MED'], ['DEL', 'DEL']], last.position ?? 'DEL')}</div>
      <div class="field"><span class="label">Pierna hábil</span>${seg('foot', [['Derecho', 'Derecha'], ['Zurdo', 'Zurda'], ['Ambidiestro', 'Ambas']], last.foot ?? 'Derecho')}</div>
      <div class="field"><span class="label">Ritmo de la carrera</span>${seg('mode', [
        ['intensa', 'Intensa', '1 decisión por año'],
        ['normal', 'Normal', 'cada 2 años'],
        ['expres', 'Exprés', 'cada 3 años'],
      ], last.mode ?? 'intensa')}</div>
      <p class="error" id="error" role="alert"></p>
      <button class="btn big" type="submit">Debutar</button>
    </form>
    <button class="btn secondary" id="back">Volver</button>
  `);

  const preview = document.getElementById('avatarPreview')!;
  const number = () => Number((document.getElementById('number') as HTMLInputElement).value) || 10;
  const paint = () => (preview.innerHTML = avatarSVG(avatar, NT_KIT, number(), 132));
  const sync = () => {
    (['skin', 'hairColor'] as const).forEach((k) => {
      const input = document.getElementById(`${k}-${avatar[k]}`) as HTMLInputElement | null;
      if (input) input.checked = true;
    });
    document.getElementById('cy-hair')!.textContent = HAIR_STYLES[avatar.hair];
    document.getElementById('cy-beard')!.textContent = BEARD_STYLES[avatar.beard];
    document.getElementById('cy-extra')!.textContent = EXTRAS[avatar.extra];
    paint();
  };
  paint();
  app.querySelectorAll<HTMLInputElement>('input[name="skin"], input[name="hairColor"]').forEach((input) => {
    input.onchange = () => {
      avatar[input.name as 'skin' | 'hairColor'] = Number(input.value);
      paint();
    };
  });
  const lists: Record<string, string[]> = { hair: HAIR_STYLES, beard: BEARD_STYLES, extra: EXTRAS };
  app.querySelectorAll<HTMLElement>('.cycler').forEach((el) => {
    const key = el.dataset.key as 'hair' | 'beard' | 'extra';
    el.querySelectorAll<HTMLButtonElement>('.cy-btn').forEach((b) => {
      b.onclick = () => {
        const n = lists[key].length;
        avatar[key] = (avatar[key] + Number(b.dataset.dir) + n) % n;
        sync();
      };
    });
  });
  document.getElementById('shuffle')!.onclick = () => {
    Object.assign(avatar, randomAvatar());
    sync();
  };
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
  const where =
    club.tier === 1
      ? 'Empezás en las fuerzas básicas de un club de Liga Nacional. Debutar en el primer equipo no va a ser fácil.'
      : club.tier === 2
        ? 'Empezás en Primera División, la antesala de la Liga Nacional. Acá se forjan los que suben.'
        : 'Empezás en Segunda División: canchas duras, viajes largos y mucha hambre. Desde aquí empiezan muchas leyendas.';
  render(`
    ${playerHead()}
    <section class="panel event">
      <span class="eyebrow">${esc(LEAGUE_NAME[club.tier])} · ${c.player.year}</span>
      <h3>Firmaste con ${esc(club.name)}</h3>
      <p class="text">Tenés 16 años y ${esc(club.city)} te abre las puertas. ${where}</p>
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

function advance() {
  const played = career!.playBlock();
  freshSeasons = played.length;
  lastResolution = null;
  if (career!.isOver) return finish();
  gameScreen();
}

function playerHead() {
  const p = career!.player;
  const club = career!.club;
  const nt = p.ntLevel > 0 ? ` · <span class="nt">${NT_LABEL[p.ntLevel]}</span>` : '';
  return `<header class="player-head">
    <div class="avatar">${avatarSVG(p.setup.avatar, club.colors, p.setup.number, 72)}</div>
    <div class="who">
      <h2>${esc(fullName())}</h2>
      <p class="meta">${POSITION_NAMES[p.setup.position]} · ${p.age} años${nt}</p>
      <p class="club-line">${crest(club, true)}<span>${esc(cap(club.name))}</span><span class="tier">${esc(tierTag(club))}</span></p>
    </div>
  </header>`;
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
  const club = clubById(r.clubId);
  const tier = club.abroad ? '' : r.tier === 1 ? '' : r.tier === 2 ? '1ra Div.' : '2da Div.';
  return `<div class="season${r.injured ? ' injured' : ''}${fresh ? ' fresh' : ''}">
    <span class="year">${r.label}</span>
    <span class="club">${crest(club, true)}<span>${esc(club.abroad ? club.city : club.name)}${tier ? ` <small>${esc(tier)}</small>` : ''}</span></span>
    <span>${r.apps}</span><span>${r.goals}</span><span>${r.assists}</span>
    ${r.titles.length || r.note ? `<div class="season-titles">${r.titles.map((t) => `<span class="chip gold">${esc(t)}</span>`).join('')}${r.note ? `<span class="chip">${esc(r.note)}</span>` : ''}</div>` : ''}
  </div>`;
}

function seasonLog() {
  const seasons = [...career!.player.seasons].reverse();
  return `<section class="panel">
    <span class="eyebrow">Temporadas</span>
    <div class="log">
      <div class="log-head"><span>AÑO</span><span>CLUB</span><span>PJ</span><span>G</span><span>A</span></div>
      ${seasons.length ? seasons.map((r, i) => seasonRow(r, i < freshSeasons)).join('') : '<p class="season-empty">Tu primera temporada arranca después de esta decisión.</p>'}
    </div>
  </section>`;
}

function chipClass(change: string) {
  if (change.startsWith('+') || change.startsWith('Convocado') || change.startsWith('Guatemala') || change.startsWith('Más peso')) return 'up';
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
  retiro: 'Final de carrera',
};

function gameScreen() {
  const ev = career!.pendingEvent;
  const res = lastResolution;
  const p = career!.player;
  const eventHtml = res
    ? `<section class="panel event">
        <p class="outcome">${esc(res.text)}</p>
        ${res.changes.length ? `<div class="chips">${res.changes.map((c) => `<span class="chip ${chipClass(c)}">${esc(c)}</span>`).join('')}</div>` : ''}
        <button class="btn big" id="next">${career!.isOver ? 'Ver mi carrera' : 'Seguir'}</button>
      </section>`
    : ev
      ? `<section class="panel event cat-${ev.category}">
          <span class="eyebrow">${CATEGORY_LABEL[ev.category] ?? ''} · ${p.year} · ${p.age} años</span>
          <h3>${esc(ev.title)}</h3>
          <p class="text">${esc(ev.text)}</p>
          <div class="options">${ev.options.map((o, i) => `<button class="btn secondary" data-opt="${i}">${esc(o.label)}</button>`).join('')}</div>
        </section>`
      : '';
  render(`${playerHead()}${statsBar()}${eventHtml}${seasonLog()}${adSlot('game')}`);
  app.querySelectorAll<HTMLButtonElement>('[data-opt]').forEach((b) => {
    b.onclick = () => {
      lastResolution = career!.choose(Number(b.dataset.opt));
      freshSeasons = 0;
      gameScreen();
    };
  });
  const next = document.getElementById('next');
  if (next) next.onclick = () => (career!.isOver ? finish() : advance());
}

// ---------- Final ----------

function shareText(s: CareerSummary) {
  const p = career!.player;
  const stat = p.setup.position === 'POR' ? `${s.apps} partidos` : `${s.apps} partidos y ${s.goals} goles`;
  return `${fullName()} terminó como "${s.verdict.title}" en Leyenda Chapina: ${stat}, ${s.titles.length} títulos y ${p.caps} partidos con la Selección. ¿Superás mi carrera?`;
}

function finish() {
  const p = career!.player;
  const s = summarize(p);
  const best = store<BestCareer[]>(BEST_KEY, []);
  best.push({ name: fullName(), verdict: s.verdict.title, score: s.score, goals: s.goals, titles: s.titles.length, position: p.setup.position });
  best.sort((a, b) => b.score - a.score);
  save(BEST_KEY, best.slice(0, 5));

  const highlights = [...p.milestones, ...p.awards];
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
    ${adSlot('result')}
    <section class="panel">
      <div class="totals">
        <div><b>${s.apps}</b><span>Partidos</span></div>
        <div><b>${s.goals}</b><span>Goles</span></div>
        <div><b>${p.caps}</b><span>Selección</span></div>
        <div><b>${p.natGoals}</b><span>Goles Sel.</span></div>
      </div>
    </section>
    ${s.titles.length ? `<section class="panel"><span class="eyebrow">Títulos (${s.titles.length})</span><div class="chips">${s.titles.map((t) => `<span class="chip gold">${esc(t)}</span>`).join('')}</div></section>` : ''}
    ${highlights.length ? `<section class="panel"><span class="eyebrow">Momentos</span><ul class="list">${highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul></section>` : ''}
    ${seasonLog()}
    <button class="btn big" id="again">Jugar otra carrera</button>
    ${footer()}
  `);

  const canvas = document.createElement('canvas');
  const toast = (msg: string) => (document.getElementById('toast')!.textContent = msg);
  const ready = drawCareerCard(canvas, p, s).then(() => {
    (document.getElementById('cardImg') as HTMLImageElement).src = canvas.toDataURL('image/png');
  });
  const blob = () => ready.then(() => new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png')));
  const fileName = `leyenda-chapina-${p.setup.lastName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;

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

initAds();
home();
