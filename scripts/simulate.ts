// Simula miles de carreras con decisiones al azar para revisar el balance del juego.
// Uso: npm run simulate -- 5000       (todas las nacionalidades, por turnos)
//      npm run simulate -- 2000 GT    (solo un país)
//      NAC=aceptar npm run simulate   (toda oferta de otro país se acepta: cota superior de Mundiales)
//      NAC=rechazar | NAC=off         (toda oferta se rechaza | se quitan los eventos nac_*: la base sin la función)
//      OFERTA=uniforme npm run simulate -- 5000   (ante una oferta elige al azar entre todas las opciones, "me quedo" incluida;
//        por defecto decide 50/50 entre quedarse o irse y después sortea el club; OFERTA=mejor: 50/50 y se va al club de mayor
//        prestigio, que es lo más parecido a la política de antes, cuando había un solo club)
// La sección "Tienda" (specs/tienda) mide el balance con tres políticas de compra y revisa saldo, catálogo, topes y textos; TIENDA=off la omite.
// La sección "Minijuegos" (specs/minijuegos) mide Simular, equidad, textos y modo por turnos; la frecuencia ahora es de "Ritmo".
// La sección "Ritmo" (specs/ritmo-por-temporada, scripts/ritmo.ts) mide decisiones por temporada, equidad entre modos, tasas, rutas y variedad;
// RITMO=off lo omite. Costo: unos 3 minutos con 5.000 carreras (el motor sortea unas 5 veces más que antes). AJUSTES='{"ESCALA":0.4}' mueve las perillas.
import { readFileSync } from 'node:fs';
import { Career, MATCHES, earned, summarize, yearsText } from '../src/engine/engine';
import { COUNTRIES, countryOf, moneyShort } from '../src/engine/countries';
import { SCORER_NAME, majorAwards, scorerName, type SeasonFacts } from '../src/engine/awards';
import { DIASPORA, elegible, residencia } from '../src/engine/nacionalidad';
import { clubById, clubsOf, viewClub, ALL_CLUBS } from '../src/engine/clubs';
import { salaryFor } from '../src/engine/contracts';
import { ALL_EVENTS } from '../src/engine/events';
import { medirRitmo } from './ritmo';
import { difficultyFor, resultOf, simulatedScore } from '../src/engine/minigames';
import { createRng } from '../src/engine/rng';
import { CATALOGO, CATEGORIAS, TOPE_ANIMO, TOPE_FAMA, TOPE_FISICO, animoBase, animoDe, contratadoDe, fisicoExtra, bonoEntrenador, itemById, poseidos, riesgoSocial, validar } from '../src/engine/tienda';
import { comprasDestacadasHtml, estadoInicial, tiendaHtml } from '../src/ui/tienda';
import { PAREJA, RUTAS } from '../src/engine/events/amor';
import type { EventContext, MinigameKind, MinigameResult, Mode, Position } from '../src/engine/types';
import { bestMoment, palmares, porSeleccion } from '../src/ui/palmares';
import { CENTER, LABELS, RISK_K, params, penalScore, riskScore, sideScore, stopScore, type Side } from '../src/ui/minigames';
import { FLAG_CODE } from '../src/ui/flags';

const N = Number(process.argv[2] ?? 5000);
// Límite de puntaje que acepta api/ranking.ts (se lee de allí para que el reporte y el servidor no se desfasen).
const SCORE_LIMIT = Number(/isInt\(b\.score, -100, (\d+)\)/.exec(readFileSync(new URL('../api/ranking.ts', import.meta.url), 'utf8'))?.[1]);
const only = process.argv[3]?.toUpperCase();
const countries = only ? [countryOf(only)] : COUNTRIES;
// Un jugador de otro país no puede ver textos de Guatemala (ni "de el" / "a el" sin contraer). Sí puede ver clubes
// guatemaltecos reales: se ignoran las temporadas en un club de Guatemala, las ofertas "Club (ciudad)" y las pruebas allá.
const GT_LEAK =
  /Guatemala|chap[ií]n|FEDEFUT|Bicolor|Liga Nacional(?! de Honduras)|Mateo Flores|Obelisco|\bQ\d|\bGuate\b|la Antigua|a Cobán(?! Imperial)|Trébol|Río Dulce|Costa Sur|\bSAT\b|Proyecto Goal|shuco|(?:^|\s)(de|a) el\s/;
const GT_CLUBS = clubsOf('GT');
// Las ofertas de clubes de Liga Nacional dicen "Club · Liga Nacional, Guatemala": es un club real de allá, no una fuga.
const legit = (t: string) =>
  GT_CLUBS.reduce((s, c) => s.replaceAll(`${c.name} (${c.city})`, '').replaceAll(c.name.includes('Guatemala') ? c.name : '\0', ''), t)
    .replaceAll('un club de Guatemala', '')
    .replaceAll(' · Liga Nacional, Guatemala', '');
const leaks = new Set<string>();
const byCountry: Record<string, { n: number; top: number; nt: number; wc: number; abroad: number; score: number }> = {};
const positions: Position[] = ['POR', 'DEF', 'MED', 'DEL'];
const modes: Mode[] = ['intensa', 'normal', 'expres'];
const verdicts: Record<string, number> = {};
const byPos: Record<string, { goals: number; apps: number; n: number }> = {};
const eventCount: Record<string, number> = {};
const catCount: Record<string, number> = {};
const decisionsByMode: Record<string, number[]> = {};
const minijuegosByMode: Record<string, number[]> = {};
/** Cada carrera termina antes de este número de iteraciones; si lo alcanza, el bucle la cortó en silencio y es un error. */
const GUARD = 2000;
const guardErrors = new Set<string>();
const scores: number[] = [];
// Un portero no anota goles de jugada: ningún texto que vea puede decir que él marcó.
const KEEPER_GOAL = /\b(anotás|anotaste|cabezazo|cabeceás|golazo|marcaste|volviste a marcar)\b|metiste (un |el )?(gol|de cabeza)|gol (de cabeza|tuyo|en tu debut|en el clásico|de despedida)|¡gol|prometo gol|a buscar el gol|gol en el mundial/i;
const keeperGoals = new Set<string>();
// Los partidos con la Selección de cada temporada deben cuadrar con los partidos y goles que suma el jugador.
const ntErrors = new Set<string>();
const awardCount: Record<string, number> = {};
// Fase final de selecciones: torneos jugados y ganados por tipo y grupo de países.
const koStats: Record<string, { played: number; champ: number; final: number }> = {};
// El palmarés agrupa sin perder ni inventar trofeos, y siempre hay un momento destacado con texto.
const summaryErrors = new Set<string>();
const momentCount: Record<string, number> = {};
// ---- Vida sentimental (specs/vida-sentimental) ----
// Apoyo para RS-01 a RS-04 y RS-06 sobre los textos emitidos de la categoría amor. Es apoyo, no reemplazo: RS-07 exige leerlos.
const AMOR_PROHIBIDO =
  /sex|desnud|\bcama\b|acost(ar|ó|ad|ás)|hotel|habitaci|beso apasionado|golpe|golpea|puñ|patada|pelea|amenaz|\barmas?\b|sangre|mata|muert|violen|cachetada|\bmenor|\bniñ|colegio|escuela|quincea|adolescen|chiquill|\bchicas?\b|muchacha|patoj|interesad|cazafort|trofeo|objeto|mantenid|\bloca|histéric|celosa|bruja|zorra|gay\b|homosex|travest|buenota|cuerpazo|curvas|alcohol|cerveza|tragos?\b|\bvino\b|licor|borrach|\bebri|droga|whisky|brindis|resaca|presi[oó]n|presionar|insist/i;
const amorProhibido = new Set<string>();
const amorErrors = new Set<string>();
const amorByMode: Record<string, { n: number[]; decisions: number }> = {};
const amorTexts = new Set<string>();
let compOtro = 0, amorOpen = 0, hijaPairs = 0, hijaMoved = 0, compStep = 0, compMoved = 0, boda = 0;
// ---- Minijuegos (specs/minijuegos) ----
const mjErrors = new Set<string>();
const MJ_POS: Record<MinigameKind, Position> = { penal: 'DEL', atajada: 'POR', pase: 'MED', cierre: 'DEF' };
const mjByMode: Record<string, { n: number[]; decisions: number }> = {};
const MINIJUEGOS_EVENTS = ALL_EVENTS.filter((e) => e.category === 'minijuego'); // todas las de la categoría, incluidas las del contenido nuevo
const mjSeen: Record<string, number> = {};
const mjTexts = new Set<string>(); // todo texto de minijuego que salió, sin repetir
const mjEffects = new Map<string, import('../src/engine/types').Effects[]>(); // los efectos de cada plantilla (no dependen del contexto)
const mjResult: Record<string, Record<MinigameResult, number>> = { 'fácil (hasta 0,35)': { ok: 0, half: 0, fail: 0 }, 'media': { ok: 0, half: 0, fail: 0 }, 'difícil (desde 0,65)': { ok: 0, half: 0, fail: 0 } };
let mjNtTrasCambio = 0;
// ---------- Convocatoria de otro país (src/engine/nacionalidad.ts) ----------
const NAC = process.env.NAC; // aceptar | rechazar | off | (vacío: al azar)
if (NAC === 'off') ALL_EVENTS.splice(0, ALL_EVENTS.length, ...ALL_EVENTS.filter((e) => !e.id.startsWith('nac_')));
const nacErrors = new Set<string>();
const nac = { herencia: 0, madre: 0, oferta: { nac_ascendencia: 0, nac_naturalizacion: 0, alguna: 0 }, disponible: { nac_ascendencia: 0, nac_naturalizacion: 0 }, sinVer: 0, cambio: 0, via: {} as Record<string, number>, mundialCambio: 0 };
const nacByOrigin: Record<string, { n: number; herencia: number; oferta: number; cambio: number }> = {};
// Un texto de Selección no puede nombrar (apodo, federación o estadio) a una Selección distinta de la actual.
const NT_EVENTS = (e: { id: string; category: string }) => (e.category === 'seleccion' && !e.id.startsWith('nac_')) || e.id === 'med_sele' || e.id === 'med_resp_sele' || (e.id.startsWith('mj_') && e.id.endsWith('_seleccion'));
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const otherNt = (nt: ReturnType<typeof countryOf>, text: string) => {
  const mine = [nt.ntName, nt.federation, nt.stadium];
  for (const c of COUNTRIES) {
    if (c.code === nt.code) continue;
    for (const name of [c.ntName, c.federation, c.stadium]) {
      if (name === 'la Sele' || mine.some((m) => m.includes(name) || name.includes(m))) continue; // 'la Sele' (apodo de Costa Rica) también es la forma corta de decir Selección
      if (new RegExp(`(?<![\\p{L}\\d])${esc(name)}(?![\\p{L}\\d])`, 'u').test(text)) return name;
    }
  }
  return null;
};
let maxCaps = 0;
// CA-3: la regla de elegibilidad con los casos del spec. addCaps es privado: se usa para marcar los partidos a los 21 o más.
{
  const mk = (age: number, caps: number, comp?: string) => {
    const c = new Career({ firstName: 'T', lastName: 'T', country: 'GT', dept: 'Guatemala', position: 'DEL', foot: 'Derecho', number: 9, mode: 'normal', avatar: { skin: 0, hair: 0, hairColor: 0, beard: 0, extra: 0 } }, 1);
    c.player.age = age;
    (c as any).addCaps(caps);
    if (comp) c.player.seasons.push({ nt: { debut: false, matches: [{ comp, rival: 'X', gf: 0, ga: 0, goals: 0 }] } } as any);
    return c.player;
  };
  const casos: [string, boolean, boolean][] = [
    ['0 partidos', elegible(mk(25, 0)), true],
    ['3 partidos a los 19', elegible(mk(19, 3)), true],
    ['3 partidos, uno a los 22', elegible({ ...mk(22, 1), caps: 3 }), false],
    ['4 partidos', elegible(mk(19, 4)), false],
    ['1 partido en un Mundial', elegible(mk(19, 1, 'Mundial 2030')), false],
    ['1 partido en la Copa Oro', elegible(mk(19, 1, 'Copa Oro 2031')), false],
    ['1 partido en la Copa América', elegible(mk(19, 1, 'Copa América 2028')), false],
    ['1 partido de eliminatoria', elegible(mk(19, 1, 'Eliminatoria Mundial 2030 · Ronda final')), true],
  ];
  for (const [nombre, got, want] of casos) if (got !== want) nacErrors.add(`elegibilidad: ${nombre} dio ${got}`);
}
// Mercado: ofertas vistas, cuántas veces eligió quedarse y cambios de club por carrera (cualquier causa).
let offers = 0, stayed = 0, moves = 0;
const policy = process.env.OFERTA; // 'uniforme' o 'mejor' (ver arriba); sin valor, 50/50 y club al azar
const uniform = policy === 'uniforme';
// Revisiones del mercado y los contratos (mercado-contratos): errores, ofertas por cantidad de clubes y salarios al firmar.
const marketErrors = new Set<string>();
const offerSize = [0, 0, 0, 0, 0];
let multi = 0, multiSimilar = 0, withAbroad = 0, offersCheck = 0;
const signed: Record<string, number[]> = { 'GT 2da': [], 'GT 1ra': [], 'GT LN': [], 'Top 5 (prestigio 72+)': [] };
const TOP5 = ['ES', 'EN', 'DE', 'IT', 'FR'];
const finalMoney: Record<string, number[]> = { Guatemala: [], 'ES/AR/BR': [] };
let maxSalary = 0, maxLN = 0;
let maxTitles = 0, years = 0, titles = 0, mundial = 0, abroad = 0, caps = 0, maxGoals = 0, reachedLN = 0, debutTier = [0, 0, 0, 0], nt = 0;

for (let i = 0; i < N; i++) {
  // Cada país recibe todas las posiciones y ritmos (con 27 países, i % 3 le daría siempre el mismo ritmo a cada uno).
  const country = countries[i % countries.length];
  const k = Math.floor(i / countries.length);
  const position = positions[k % 4];
  const mode = modes[k % 3];
  const career = new Career(
    {
      firstName: 'Sim', lastName: `#${i}`, country: country.code, dept: country.regions[k % country.regions.length], position, foot: 'Derecho', number: 10, mode,
      avatar: { skin: 0, hair: 0, hairColor: 0, beard: 0, extra: 0 },
    },
    i + 1,
  );
  const leak = (where: string, t: string) => {
    if (country.code === 'GT' || clubById(career.player.clubId).country === 'GT' || career.nt.code === 'GT') return;
    if (where === 'nac_naturalizacion' && residencia(career.player)?.code === 'GT') return; // la oferta de Guatemala nombra a Guatemala
    if (GT_LEAK.test(legit(t))) leaks.add(`${country.code} ${where}: ${t}`);
  };
  debutTier[career.club.tier]++;
  const org = (nacByOrigin[country.code] ??= { n: 0, herencia: 0, oferta: 0, cambio: 0 });
  org.n++;
  const her = career.player.herencia;
  if (her) {
    nac.herencia++;
    org.herencia++;
    if (her.side === 'madre') nac.madre++;
    if (her.country === country.code || her.country === 'GT') nacErrors.add(`${country.code}: ascendencia de su propio país o de Guatemala (${her.country})`);
    if (!DIASPORA[country.code].some(([c]) => c === her.country)) nacErrors.add(`${country.code}-${her.country} no está en la lista de diásporas`);
  }
  const offered: string[] = []; // países que le hicieron una oferta: ninguno se repite
  const seen = new Set<string>();
  const avail = new Set<string>();
  let guard = 0;
  let decisions = 0;
  let amorN = 0; // eventos de amor de esta carrera
  let mjN = 0; // minijuegos de esta carrera
  let hijaClub = ''; // club al abrir la ruta de la hija del técnico
  let compClub = ''; // club al abrir la ruta de la pareja del compañero
  const outEarly = new Set<string>(); // eliminatorias en las que su Selección quedó fuera en la segunda ronda (Concacaf)
  let seenContract: object | null = null; // los contratos se anotan al verlos nuevos: debut, tras cada decisión y tras cada temporada
  const watch = () => {
    const c = career.player.contract;
    if (c === seenContract) return;
    seenContract = c;
    const own = clubById(career.player.clubId);
    maxSalary = Math.max(maxSalary, c.salary);
    const left = c.until - career.player.year + 1;
    if (!(c.salary > 0) || left < 1 || left > 4) marketErrors.add(`contrato fuera de rango: ${c.salary} quetzales, ${left} años`);
    const key = own.country === 'GT' ? ({ 1: 'GT LN', 2: 'GT 1ra', 3: 'GT 2da' } as const)[own.tier as 1 | 2 | 3] : TOP5.includes(own.country) && own.prestige >= 72 ? 'Top 5 (prestigio 72+)' : '';
    if (key) signed[key].push(c.salary);
    if (own.country === 'GT' && own.tier === 1) maxLN = Math.max(maxLN, c.salary);
  };
  watch();
  career.start();
  while (!career.isOver && guard++ < GUARD) {
    if (!career.pendingEvent) {
      const p = career.player;
      const contractBefore = p.contract;
      const yearBefore = p.year;
      const clubBefore = p.clubId;
      const before = [p.caps, p.natGoals];
      const season = career.advance(); // una temporada por vez; null si solo pasó a la siguiente decisión de la misma
      const played = season ? [season] : [];
      const matches = played.flatMap((s) => s.nt?.matches ?? []);
      for (const s of played) {
        const groups = s.nt?.groups ?? [];
        // La Selección de esa temporada: la de origen o, tras un cambio, la nueva.
        const team = countryOf(s.nt?.team ?? country.code);
        if (s.nt && !s.nt.team) ntErrors.add('temporada con Selección sin team');
        for (const m of s.nt?.matches ?? []) {
          if (m.rival === team.name) ntErrors.add(`${team.name} es rival de sí misma`);
          if (!FLAG_CODE[m.rival]) ntErrors.add(`sin bandera: ${m.rival}`);
          const g = groups.find((x) => x.comp === m.comp);
          if (g && !m.round && !g.table.some((r) => r.team === m.rival)) ntErrors.add(`${m.rival} no está en la tabla de ${m.comp}`);
          if (g && m.round && g.table.some((r) => r.team === m.rival)) ntErrors.add(`${m.rival} ya estaba en el grupo de ${m.comp}`);
          if (m.round && m.gf === m.ga !== !!m.pen) ntErrors.add('penales solo en empates de fase final');
          if (m.round && !FLAG_CODE[m.rival]) ntErrors.add(`sin bandera: ${m.rival}`);
        }
        for (const g of groups) {
          const ko = (s.nt?.matches ?? []).filter((m) => m.comp === g.comp && m.round);
          const won = (m: (typeof ko)[number]) => m.gf > m.ga || (m.pen !== undefined && m.pen[0] > m.pen[1]);
          if (new Set(ko.map((m) => m.rival)).size !== ko.length) ntErrors.add(`rival repetido en la fase final de ${g.comp}`);
          if (ko.some((m, i) => i > 0 && !won(ko[i - 1]))) ntErrors.add(`siguió jugando después de perder en ${g.comp}`);
          if (ko.length && g.out === 'Campeón' !== ko.every(won)) ntErrors.add(`el cierre de ${g.comp} no cuadra con sus partidos`);
          if (g.out === 'Campeón' && s.titles.filter((t) => t.startsWith(g.comp)).length !== 1) ntErrors.add(`campeón de ${g.comp} sin un único título`);
          if (ko.length && !g.out) ntErrors.add(`fase final sin cierre en ${g.comp}`);
          if (g.out) {
            const kind = g.comp.startsWith('Mundial') ? 'Mundial' : /Naciones/.test(g.comp) ? 'Liga de Naciones' : 'Copa';
            const bucket = ['ES', 'AR', 'BR'].includes(team.code) ? `${kind} (ES/AR/BR)` : team.code === 'GT' ? `${kind} (GT)` : `${kind} (otros)`;
            const st = (koStats[bucket] ??= { played: 0, champ: 0, final: 0 });
            st.played++;
            if (g.out === 'Campeón') st.champ++;
            if (g.out === 'Campeón' || g.out === 'Subcampeón') st.final++;
          }
          const gt = g.table.findIndex((r) => r.team === team.name);
          if (gt < 0) ntErrors.add(`${team.name} no está en la tabla de ${g.comp}`);
          if (!FLAG_CODE[team.name]) ntErrors.add(`sin bandera: ${team.name}`);
          if (g.table.some((r) => !FLAG_CODE[r.team])) ntErrors.add(`sin bandera en ${g.comp}`);
          if (g.table.some((r) => r.pj !== r.g + r.e + r.p || r.pts !== 3 * r.g + r.e)) ntErrors.add(`tabla mal sumada en ${g.comp}`);
          if (g.table.reduce((t, r) => t + r.gf - r.ga, 0) !== 0) ntErrors.add(`goles a favor y en contra no cuadran en ${g.comp}`);
          const wc = g.comp.match(/Eliminatoria Mundial (\d+)/)?.[1];
          if (wc && g.comp.endsWith('Segunda ronda') && gt >= 2) outEarly.add(wc);
          if (wc && g.comp.endsWith('Ronda final')) {
            if (outEarly.has(wc)) ntErrors.add('ronda final después de quedar fuera en la segunda ronda');
            if ((gt < g.advance) !== groups.some((x) => x.comp === `Mundial ${wc}`)) ntErrors.add(`${team.code}: la ronda final no cuadra con jugar el Mundial`);
          }
        }
      }
      // Contrato: la temporada se jugó con el que había (vigente) y paga; el final nunca queda vencido.
      if (season && contractBefore.until < yearBefore) marketErrors.add('temporada con el contrato vencido');
      if (played[0] && played[0].salary !== contractBefore.salary) marketErrors.add(`salario de la temporada ${played[0].salary} distinto del contrato ${contractBefore.salary}`);
      if (played.some((r) => !(r.salary > 0))) marketErrors.add('temporada sin salario');
      if (season && p.clubId !== clubBefore && p.contract === contractBefore) marketErrors.add('cambió de club por falta de minutos sin contrato nuevo');
      watch();
      const goals = matches.reduce((t, m) => t + m.goals, 0);
      if (matches.length !== p.caps - before[0]) ntErrors.add(`partidos: ${matches.length} listados, ${p.caps - before[0]} sumados`);
      if (goals !== p.natGoals - before[1]) ntErrors.add(`goles: ${goals} listados, ${p.natGoals - before[1]} sumados`);
      if (matches.some((m) => m.gf < m.goals)) ntErrors.add('el jugador anotó más goles que su Selección');
      if (position === 'POR' && goals > 0) ntErrors.add('un portero anotó con la Selección');
    }
    const ev = career.pendingEvent;
    if (ev) {
      const p = career.player;
      // Ofertas de otro país: qué eventos estaban disponibles y, si sale uno, que cumpla todas las condiciones.
      const ctx = career.context();
      for (const id of ['nac_ascendencia', 'nac_naturalizacion'] as const) if (ALL_EVENTS.find((e) => e.id === id)?.when(p, ctx)) avail.add(id);
      if (NT_EVENTS(ev)) {
        for (const t of [ev.title, ev.text, ...ev.options.flatMap((o) => [o.label, ...o.outcomes.map((x) => x.text)])]) {
          const other = otherNt(career.nt, t);
          if (other) nacErrors.add(`${ev.id} con ${career.nt.name} nombra a otra Selección (${other}): ${t.slice(0, 80)}`);
        }
      }
      if (ev.id.startsWith('nac_')) {
        const code = ev.id === 'nac_ascendencia' ? p.herencia?.country : residencia(p)?.code;
        const to = code ? countryOf(code) : null;
        if (!to || !code) nacErrors.add(`${ev.id} sin país de destino`);
        else {
          if (ev.id === 'nac_ascendencia' && !p.herencia) nacErrors.add('oferta por ascendencia sin ascendencia');
          if (ev.id === 'nac_naturalizacion' && (residencia(p)?.n ?? 0) < 5) nacErrors.add('naturalización sin 5 temporadas seguidas');
          if (p.cambioSel) nacErrors.add(`${ev.id}: oferta después de cambiar de Selección`);
          if (offered.includes(code)) nacErrors.add(`${code} ofreció dos veces`);
          if (!elegible(p)) nacErrors.add(`${ev.id}: oferta a un jugador comprometido (${p.caps} partidos)`);
          if (p.age < 19 || p.age > 31) nacErrors.add(`${ev.id}: oferta a los ${p.age} años`);
          if (p.rating < to.callup) nacErrors.add(`${ev.id}: nivel ${Math.round(p.rating)} menor al mínimo de ${to.name} (${to.callup})`);
          if (p.wcProgress !== 0) nacErrors.add(`${ev.id}: oferta a media eliminatoria`);
          offered.push(code);
        }
        seen.add(ev.id);
      }
      for (const t of [ev.title, ev.text, ...ev.options.flatMap((o) => [o.label, ...o.outcomes.map((x) => x.text)])]) leak(ev.id, t);
      {
        const left = career.player.contract.until - career.player.year + 1;
        if (left < 1 || left > 4) marketErrors.add(`decisión con ${left} años de contrato`);
      }
      eventCount[ev.id] = (eventCount[ev.id] ?? 0) + 1;
      catCount[ev.category] = (catCount[ev.category] ?? 0) + 1;
      if (position === 'POR') {
        for (const t of [ev.text, ...ev.options.flatMap((o) => [o.label, ...o.outcomes.map((x) => x.text)])]) {
          if (KEEPER_GOAL.test(t)) keeperGoals.add(`${ev.id}: ${t}`);
        }
      }
      // ---- Vida sentimental: chequeos antes de elegir ----
      const pl = career.player;
      const tiene = (f: string) => (pl.flags[f] ?? 0) > 0;
      if (ev.category === 'amor') {
        amorN++;
        if (pl.age < 18) amorErrors.add(`${ev.id} con ${pl.age} años (RF-02)`);
        if (['amor_cita', 'amor_hija_1', 'amor_companero_1', 'amor_famosa_1'].includes(ev.id) && (PAREJA.some(tiene) || RUTAS.some(tiene))) amorErrors.add(`${ev.id} con jugador no soltero (RF-03)`);
        if (ev.id === 'amor_cita' && (tiene('amor_comprometido') || tiene('amor_casado'))) amorErrors.add('primera cita con comprometido o casado');
        if (ev.id === 'amor_crisis' && tiene('amor_casado')) amorErrors.add('crisis de pareja con un casado');
        if (ev.options.length < 2) amorErrors.add(`${ev.id} con menos de 2 opciones (RF-04)`);
        for (const op of ev.options) if (Math.abs(op.outcomes.reduce((t, x) => t + x.p, 0) - 1) > 1e-6) amorErrors.add(`${ev.id}: "${op.label}" no suma probabilidad 1 (RF-04)`);
        for (const t of [ev.title, ev.text, ...ev.options.flatMap((x) => [x.label, ...x.outcomes.map((y) => y.text)])]) {
          amorTexts.add(t);
          const m = t.match(AMOR_PROHIBIDO);
          if (m) amorProhibido.add(`${ev.id} "${m[0]}": ${t}`);
        }
        if (ev.id === 'amor_hija_1') hijaClub = pl.clubId;
        if ((ev.id === 'amor_hija_2' || ev.id === 'amor_hija_3') && hijaClub) { hijaPairs++; if (pl.clubId !== hijaClub) hijaMoved++; }
        if (ev.id === 'amor_companero_1') compClub = pl.clubId;
        if (ev.id === 'amor_companero_2' && pl.clubId !== compClub) compOtro++;
      }
      if (ev.id === 'farandula' && (tiene('amor_comprometido') || tiene('amor_casado'))) amorErrors.add('farandula con comprometido o casado (RF-13)');
      const clubAntes = pl.clubId;
      const antes = { caps: p.caps, goals: p.natGoals, home: career.home.code, nt: career.nt.code };
      const forced = ev.id.startsWith('nac_') ? (NAC === 'aceptar' ? 0 : NAC === 'rechazar' ? 1 : -1) : -1;
      const pb = career.player;
      const stay = ev.options.length - 1; // en la oferta, la última opción es quedarse
      const pick = forced >= 0 ? forced : ev.id === 'oferta' && !uniform
        ? career.rng() < 0.5 ? stay : policy === 'mejor' ? 0 : Math.floor(career.rng() * stay)
        : Math.floor(career.rng() * ev.options.length);
      const cur = career.club;
      const before = { clubId: pb.clubId, contract: pb.contract, rating: pb.rating, age: pb.age };
      if (ev.id === 'oferta') {
        offers++;
        if (ev.options[pick].label.startsWith('Me quedo')) stayed++;
        // CA-1 a CA-3: cantidad, repetidos, cotas de prestigio, extranjero y textos.
        const o = ev.offers ?? [];
        const n = o.length;
        offersCheck++;
        offerSize[n]++;
        const views = o.map((x) => viewClub(clubById(x.clubId), career.home));
        if (!n || n > 4) marketErrors.add(`oferta con ${n} clubes`);
        if (ev.options.length !== n + 1 || !ev.options[n].label.startsWith('Me quedo')) marketErrors.add('las opciones no son un club cada una más quedarse');
        if (new Set(o.map((x) => x.clubId)).size !== n || o.some((x) => x.clubId === before.clubId)) marketErrors.add('oferta con clubes repetidos o el club actual');
        if (!views.some((v) => v.prestige > cur.prestige)) marketErrors.add('oferta sin un club de mayor prestigio');
        if (views.some((v) => v.prestige > Math.max(before.rating + 6, cur.prestige))) marketErrors.add('oferta por encima de la cota de prestigio');
        if (n >= 3) {
          multi++;
          if (views.some((v) => Math.abs(v.prestige - cur.prestige) <= 8)) multiSimilar++;
        }
        if (views.some((v) => v.abroad)) withAbroad++;
        const canGo = before.age <= 30 && (before.rating >= 64 || cur.abroad) && cur.tier <= 1;
        if (!canGo && views.some((v) => v.abroad && !cur.abroad)) marketErrors.add('oferta del extranjero a un jugador no elegible');
        o.forEach((x, k) => {
          const v = views[k];
          const label = ev.options[k].label;
          for (const part of [v.name, v.league, countryOf(v.country).name, moneyShort(career.home, x.salary), yearsText(x.years)]) {
            if (!label.includes(part)) marketErrors.add(`la opción no muestra "${part}": ${label}`);
          }
          if (x.years < 1 || x.years > 4 || !(x.salary > 0)) marketErrors.add('oferta con contrato fuera de rango');
        });
        const c = before.contract;
        if (!ev.text.includes(moneyShort(career.home, c.salary)) || !ev.text.includes(yearsText(c.until - pb.year + 1))) marketErrors.add('el texto de la oferta no muestra el contrato actual');
      }
      const res = career.choose(pick);
      if (ev.minigame) {
        const mg = ev.minigame;
        const only1 = ev.options.length === 1 && ev.options[0].outcomes.length === 3;
        mjN++;
        mjSeen[ev.id] = (mjSeen[ev.id] ?? 0) + 1;
        if (!only1) mjErrors.add(`${ev.id}: no trae una opción con tres desenlaces`);
        if (MJ_POS[mg.kind] !== pb.setup.position) mjErrors.add(`${ev.id}: tipo ${mg.kind} para un ${pb.setup.position}`);
        if (ev.id.endsWith('_clasico') && !ctx.club.rival) mjErrors.add(`${ev.id}: clásico sin rival`);
        if (ev.id.endsWith('_seleccion')) {
          if (!(pb.ntLevel >= 1) || (pb.flags.sel_retirado ?? 0) > 0) mjErrors.add(`${ev.id}: Selección sin convocatoria vigente`);
          const nt = career.nt.ntName;
          if (!ev.title.includes(nt) || !ev.text.includes(nt)) mjErrors.add(`${ev.id}: no nombra a ${nt} (la Selección que representa)`);
          if (pb.cambioSel) mjNtTrasCambio++;
        }
        if (!(mg.difficulty >= 0.1 && mg.difficulty <= 0.9)) mjErrors.add(`${ev.id}: dificultad ${mg.difficulty}`);
        if (res.result === undefined) mjErrors.add(`${ev.id}: la resolución no trae resultado`);
        else mjResult[mg.difficulty <= 0.35 ? 'fácil (hasta 0,35)' : mg.difficulty >= 0.65 ? 'difícil (desde 0,65)' : 'media'][res.result]++;
        for (const t of [ev.title, ev.text, ev.options[0].label, ...ev.options[0].outcomes.map((x) => x.text)]) mjTexts.add(`${ev.id}: ${t}`);
        mjEffects.set(ev.id, ev.options[0].outcomes.map((x) => x.effects));
      }
      for (const t of res.changes) leak(`${ev.id} (cambio)`, t);
      // CA-5 y CA-6: elegir un club firma lo mostrado; quedarse no toca el contrato; todo cambio de club trae contrato nuevo.
      if (ev.id === 'oferta') {
        const x = ev.offers?.[pick];
        if (x) {
          if (pb.clubId !== x.clubId || pb.contract.salary !== x.salary || pb.contract.until - pb.year + 1 !== x.years) marketErrors.add('el contrato firmado no es el de la oferta');
        } else if (pb.clubId !== before.clubId || pb.contract !== before.contract) marketErrors.add('quedarse cambió el club o el contrato');
      }
      if (pb.clubId !== before.clubId && pb.contract === before.contract) marketErrors.add(`cambió de club en ${ev.id} sin contrato nuevo`);
      watch();
      if (ev.id === 'amor_companero_2') {
        compStep++;
        if (pl.clubId !== clubAntes) compMoved++;
      }
      if (PAREJA.filter(tiene).length > 1) amorErrors.add(`dos estados sentimentales a la vez tras ${ev.id} (RF-01)`);
      if (tiene('amor_famosa') && !PAREJA.some(tiene)) amorErrors.add(`pareja famosa sin pareja tras ${ev.id} (RF-01)`);
      if (!ev.minigame) decisions++;
      // Tras aceptar: nivel de convocatoria 1 o 2, los partidos y goles previos se conservan, y casa, moneda y clubes siguen igual.
      if (ev.id.startsWith('nac_') && p.cambioSel) {
        const c = p.cambioSel;
        if (p.ntLevel !== 1 && p.ntLevel !== 2) nacErrors.add(`aceptó con nivel de convocatoria ${p.ntLevel}`);
        if (p.caps !== antes.caps || p.natGoals !== antes.goals || c.caps !== antes.caps || c.goals !== antes.goals) nacErrors.add('el cambio alteró los partidos o goles con la Selección');
        if (career.home.code !== antes.home || p.setup.country !== antes.home || c.from !== antes.home) nacErrors.add('el cambio alteró el país de origen');
        if (career.nt.code !== c.to || c.to === antes.nt) nacErrors.add('la Selección no cambió a la nueva');
        if (!res.changes.includes(`Ahora jugás con ${career.nt.name}`)) nacErrors.add('falta el aviso "Ahora jugás con"');
        if (p.wcProgress !== 0) nacErrors.add('el cambio no reinició la eliminatoria');
      }
    }
  }
  if (guard >= GUARD) guardErrors.add(`la carrera ${i} (${mode}) alcanzó el límite de ${GUARD} iteraciones: se cortó en silencio`);
  (decisionsByMode[mode] ??= []).push(decisions);
  (minijuegosByMode[mode] ??= []).push(mjN);
  const mm = (mjByMode[mode] ??= { n: [], decisions: 0 });
  mm.n.push(mjN);
  mm.decisions += decisions;
  const p = career.player;
  // ---- Vida sentimental: al terminar la carrera ----
  const am = (amorByMode[mode] ??= { n: [], decisions: 0 });
  am.n.push(amorN);
  am.decisions += decisions;
  if (RUTAS.some((f) => (p.flags[f] ?? 0) > 0)) amorOpen++;
  const casos = p.milestones.filter((m) => m.startsWith('Se casó'));
  boda += casos.length;
  if (casos.length > 1) amorErrors.add('más de un hito "Se casó" (CA-6)');
  if ((p.flags.amor_casado ?? 0) > 0 && !casos.length) amorErrors.add('casado sin hito de boda (CA-6)');
  const iCom = p.milestones.findIndex((m) => m.startsWith('Se comprometió'));
  const iBoda = p.milestones.findIndex((m) => m.startsWith('Se casó'));
  if (iBoda >= 0 && (iCom < 0 || iCom > iBoda)) amorErrors.add('boda sin compromiso antes (CA-6)');
  if (p.milestones.some((m) => /^(Se casó|Se comprometió)/.test(m) && !/\(\d{4}\)$/.test(m))) amorErrors.add('hito de amor sin año');
  const s = summarize(p);
  if (s.earned !== p.seasons.reduce((t, r) => t + r.salary, 0) || s.earned !== earned(p)) marketErrors.add('el dinero final no es la suma de las temporadas');
  if (p.seasons.some((r) => !(r.salary > 0))) marketErrors.add('temporada sin salario');
  for (const r of p.seasons) if (r.note) leak('nota de temporada', r.note);
  if (country.code === 'GT') finalMoney.Guatemala.push(s.earned);
  else if (['ES', 'AR', 'BR'].includes(country.code)) finalMoney['ES/AR/BR'].push(s.earned);
  // Los títulos llevan el nombre de la liga donde se ganaron (puede ser la de Guatemala): no se revisan.
  for (const t of [...p.milestones, ...p.seasons.flatMap((r) => (r.nt?.matches ?? []).map((m) => m.comp)), s.verdict.title]) leak('carrera', t);
  const c = (byCountry[country.code] ??= { n: 0, top: 0, nt: 0, wc: 0, abroad: 0, score: 0 });
  c.n++;
  c.top += p.seasons.some((r) => r.tier === 1) ? 1 : 0;
  c.nt += p.caps > 0 ? 1 : 0;
  c.wc += p.flags.mundial ? 1 : 0;
  c.abroad += s.clubs.some((x) => x.club.abroad) ? 1 : 0;
  c.score += s.score;
  if (position === 'POR') for (const m of p.milestones) if (KEEPER_GOAL.test(m)) keeperGoals.add(`hito: ${m}`);
  const trophies = palmares(p).reduce((t, it) => t + it.count, 0);
  const won = p.titles.length + p.seasons.flatMap((r) => r.awards).length;
  if (trophies !== won) summaryErrors.add(`palmarés: ${trophies} trofeos agrupados, ${won} ganados`);
  const moment = bestMoment(p, s);
  if (!moment.title.trim()) summaryErrors.add(`momento ${moment.kind} sin texto`);
  momentCount[moment.kind] = (momentCount[moment.kind] ?? 0) + 1;
  for (const a of p.seasons.flatMap((r) => r.awards)) awardCount[`${a.kind} ${position}`] = (awardCount[`${a.kind} ${position}`] ?? 0) + 1;
  scores.push(s.score);
  verdicts[s.verdict.title] = (verdicts[s.verdict.title] ?? 0) + 1;
  byPos[position] ??= { goals: 0, apps: 0, n: 0 };
  byPos[position].goals += s.goals;
  byPos[position].apps += s.apps;
  byPos[position].n++;
  years += p.seasons.length;
  moves += p.seasons.filter((r, j) => j > 0 && r.clubId !== p.seasons[j - 1].clubId).length;
  titles += s.titles.length;
  maxTitles = Math.max(maxTitles, s.titles.length);
  caps += p.caps;
  maxCaps = Math.max(maxCaps, p.caps);
  if (p.caps > 0) nt++;
  // ---- Convocatoria de otro país: contadores y coherencia de la carrera completa ----
  for (const id of ['nac_ascendencia', 'nac_naturalizacion'] as const) {
    if (avail.has(id)) nac.disponible[id]++;
    if (seen.has(id)) nac.oferta[id]++;
  }
  if (seen.size) {
    nac.oferta.alguna++;
    org.oferta++;
  } else if (avail.size) nac.sinVer++;
  const cs = p.cambioSel;
  const hitos = p.milestones.filter((m) => /^(Se nacionalizó en|Eligió jugar para)/.test(m));
  if (cs) {
    nac.cambio++;
    org.cambio++;
    nac.via[cs.via] = (nac.via[cs.via] ?? 0) + 1;
    if (p.flags.mundial) nac.mundialCambio++;
    const to = countryOf(cs.to);
    const hito = cs.via === 'naturalizacion' ? `Se nacionalizó en ${to.name}` : `Eligió jugar para ${to.name} por su ${cs.via === 'madre' ? 'madre' : 'padre'}`;
    if (hitos.length !== 1 || hitos[0] !== `${hito} (${cs.year})`) nacErrors.add(`hito del cambio: ${hitos.join(' | ') || 'ninguno'}`);
    // Las temporadas viejas conservan la Selección anterior y solo las siguientes usan la nueva.
    for (const r of p.seasons) {
      const want = Number(r.label.slice(0, 4)) >= cs.year ? cs.to : cs.from;
      if (r.nt && r.nt.team !== want) nacErrors.add(`temporada ${r.label} con ${r.nt.team}, debía ser ${want}`);
    }
    const first = p.seasons.find((r) => r.nt && Number(r.label.slice(0, 4)) >= cs.year);
    if (p.seasons.filter((r) => r.nt?.cambio).length !== (first ? 1 : 0) || (first && !first.nt!.cambio)) nacErrors.add('el aviso de cambio no está solo en la primera temporada con la nueva Selección');
    // Con cada Selección: la suma coincide con el total de la carrera.
    const ps = porSeleccion(p)!;
    const cups = p.seasons.reduce((t, r) => t + (r.nt?.groups ?? []).filter((g) => g.out === 'Campeón').length, 0);
    if (ps.reduce((t, x) => t + x.caps, 0) !== p.caps || ps.reduce((t, x) => t + x.goals, 0) !== p.natGoals || ps.reduce((t, x) => t + x.titles, 0) !== cups) nacErrors.add('"Con cada Selección" no suma el total');
    if (ps.some((x) => x.caps < 0 || x.goals < 0)) nacErrors.add('"Con cada Selección" con valores negativos');
    if (s.verdict.title.startsWith('Leyenda ') && !s.verdict.title.endsWith(to.adj)) nacErrors.add('el veredicto no usa el gentilicio de la Selección actual');
  } else {
    if (hitos.length) nacErrors.add('hito de cambio sin cambio');
    if (porSeleccion(p)) nacErrors.add('"Con cada Selección" sin cambio');
    if (p.seasons.some((r) => r.nt && r.nt.team !== country.code)) nacErrors.add('temporada con otra Selección sin haber cambiado');
  }
  // Si un evento contó la clasificación y el jugador siguió en la Selección esa temporada, tiene que jugar el Mundial.
  for (const m of p.milestones) {
    const wc = m.match(/^Clasificó al Mundial (\d+)/)?.[1];
    const season = wc && p.seasons.find((r) => Number(r.label.slice(0, 4)) + 1 === Number(wc));
    if (season && season.nt && !p.milestones.includes(`Jugó el Mundial ${wc} con ${countryOf(season.nt.team ?? country.code).name}`)) ntErrors.add(`contó que clasificó al Mundial ${wc} y no lo jugó`);
  }
  if (p.flags.mundial) mundial++;
  if (s.clubs.some((c) => c.club.abroad)) abroad++;
  if (p.seasons.some((r) => r.tier === 1)) reachedLN++;
  maxGoals = Math.max(maxGoals, s.goals);
}
const pct = (x: number) => `${((100 * x) / N).toFixed(1)}%`;
const avg = (a: number[]) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
console.log(`Carreras: ${N}`);
console.log(`Debut: primera división ${pct(debutTier[1])} · segunda ${pct(debutTier[2])} · tercera ${pct(debutTier[3])}`);
console.log(`Temporadas promedio: ${(years / N).toFixed(1)} · decisiones (sin minijuegos): intensa ${avg(decisionsByMode.intensa)}, normal ${avg(decisionsByMode.normal)}, exprés ${avg(decisionsByMode.expres)} · minijuegos: intensa ${avg(minijuegosByMode.intensa)}, normal ${avg(minijuegosByMode.normal)}, exprés ${avg(minijuegosByMode.expres)}`);
console.log(`Llegaron a primera: ${pct(reachedLN)} · jugaron en el extranjero: ${pct(abroad)} · Selección mayor: ${pct(nt)} · Mundial: ${pct(mundial)}`);
console.log(`Mercado: ofertas por carrera ${(offers / N).toFixed(2)} · me quedo ${((100 * stayed) / Math.max(1, offers)).toFixed(1)}% · cambio ${((100 * (offers - stayed)) / Math.max(1, offers)).toFixed(1)}% · cambios de club por carrera ${(moves / N).toFixed(2)}`);
console.log(`Títulos promedio: ${(titles / N).toFixed(2)} · partidos con Selección: ${(caps / N).toFixed(1)} · máximo de goles: ${maxGoals}`);
for (const [pos, v] of Object.entries(byPos)) console.log(`  ${pos}: ${(v.apps / v.n).toFixed(0)} PJ, ${(v.goals / v.n).toFixed(0)} goles`);
console.log('Veredictos:');
for (const [k, v] of Object.entries(verdicts).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${pct(v)}`);
scores.sort((a, b) => a - b);
console.log(`Puntaje medio: ${avg(scores)}`);
console.log('Puntaje p25/p50/p75/p90/p97:', [0.25, 0.5, 0.75, 0.9, 0.97].map((q) => scores[Math.floor(q * N)].toFixed(0)).join(' / '));
console.log('Máximos: puntaje', scores.at(-1), '· títulos', maxTitles, `(el servidor acepta hasta ${SCORE_LIMIT} y 200)`);
console.log('Fase final (torneos jugados · campeón · finalista):');
for (const [k, v] of Object.entries(koStats).sort()) console.log(`  ${k}: ${v.played} · ${((100 * v.champ) / v.played).toFixed(1)}% · ${((100 * v.final) / v.played).toFixed(1)}%`);
const totalEvents = Object.values(eventCount).reduce((a, b) => a + b, 0) - (catCount.minijuego ?? 0); // sin minijuegos: hay uno por temporada y no compiten con las decisiones
console.log('Categorías:', Object.entries(catCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${((100 * v) / totalEvents).toFixed(0)}%`).join(' · '));
// ---- Vida sentimental: frecuencia, rutas y chequeos ----
console.log('Categorías (un decimal):', Object.entries(catCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${((100 * v) / totalEvents).toFixed(1)}%`).join(' · '));
for (const m of modes) {
  const a = amorByMode[m];
  const total = a.n.reduce((x, y) => x + y, 0);
  const mean = total / a.n.length;
  const withAny = a.n.filter((x) => x > 0).length / a.n.length;
  const max = Math.max(...a.n);
  console.log(`Amor ${m}: ${mean.toFixed(2)} por carrera · ${(100 * withAny).toFixed(0)}% de carreras con alguno · máximo ${max} · ${((100 * total) / a.decisions).toFixed(1)}% de las decisiones`);
  if (max > 14) amorErrors.add(`${m}: una carrera con ${max} eventos de amor (máximo 14, ritmo-por-temporada CA-12)`);
  if (N >= 5000 && !only && (mean < 1 || mean > 3)) amorErrors.add(`${m}: ${mean.toFixed(2)} eventos de amor por carrera, fuera de 1,0 a 3,0 (ritmo-por-temporada CA-12)`);
}
const amorTotal = catCount.amor ?? 0;
console.log('Amor por evento:', Object.entries(eventCount).filter(([k]) => k.startsWith('amor_')).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k.slice(5)} ${v}`).join(' · '));
console.log(`Amor total: ${((100 * amorTotal) / totalEvents).toFixed(1)}% de las decisiones (tope 15%)`);
if (amorTotal / totalEvents > 0.15) amorErrors.add('la categoría amor pasa del 15% de las decisiones (CA-7)');
console.log(`Amor: rutas abiertas al terminar ${(100 * amorOpen / N).toFixed(2)}% de las carreras (tope 2%) · bodas ${boda}`);
if (amorOpen / N >= 0.02) amorErrors.add('2% o más de las carreras terminan con una ruta abierta (CA-3)');
console.log(`Amor, hija del técnico: ${hijaMoved} de ${hijaPairs} pasos 2 o 3 jugados en otro club que el del paso 1 (RF-16, debe ser 0) · cierres por cambio de club: ${eventCount.amor_hija_fin ?? 0}`);
if (hijaMoved > 0) amorErrors.add(`${hijaMoved} pasos de la hija del técnico en otro club (RF-16)`);
console.log(`Amor, pareja de un compañero: ${compOtro} de ${eventCount.amor_companero_2 ?? 0} pasos 2 jugados en otro club que el del paso 1 (RF-16, debe ser 0) · cierres por cambio de club: ${eventCount.amor_companero_fin ?? 0}`);
if (compOtro > 0) amorErrors.add(`${compOtro} pasos de la pareja del compañero en otro club (RF-16)`);
console.log(`Amor, pareja de un compañero: ${compMoved} de ${compStep} cambiaron de club en el paso 2 (${compStep ? ((100 * compMoved) / compStep).toFixed(1) : '0'}%; esperado entre 20% y 40%)`);
if (compStep >= 50 && (compMoved / compStep < 0.2 || compMoved / compStep > 0.4)) amorErrors.add('la salida del club en amor_companero_2 queda fuera de 20%-40% (CA-5)');
console.log(`Amor: ${amorTexts.size} textos emitidos revisados con la lista de términos prohibidos.`);
const sorted = Object.entries(eventCount).sort((a, b) => b[1] - a[1]);
console.log('Más frecuentes:', sorted.slice(0, 8).map(([k, v]) => `${k} ${((100 * v) / totalEvents).toFixed(1)}%`).join(' · '));
const never = ALL_EVENTS.filter((e) => !eventCount[e.id]).map((e) => e.id);
if (N >= 5000 && !only) for (const id of never) if (id.startsWith('amor_')) amorErrors.add(`${id} nunca salió (CA-8)`);
console.log(`Eventos distintos vistos: ${sorted.length} de ${ALL_EVENTS.length}. Nunca salieron: ${never.join(', ') || 'ninguno'}`);
console.log('Premios por carrera:', Object.entries(awardCount).sort().map(([k, v]) => `${k} ${(v / (N / 4)).toFixed(2)}`).join(' · '));
console.log('Momento destacado:', Object.entries(momentCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v)}`).join(' · '));
if (countries.length > 1) {
  console.log('Por país (primera / extranjero / Selección / Mundial / puntaje medio):');
  const share = (x: number, n: number) => `${((100 * x) / n).toFixed(0)}%`.padStart(4);
  for (const [code, v] of Object.entries(byCountry).sort((a, b) => b[1].wc / b[1].n - a[1].wc / a[1].n)) {
    console.log(`  ${code}: ${share(v.top, v.n)} ${share(v.abroad, v.n)} ${share(v.nt, v.n)} ${share(v.wc, v.n)}  ${(v.score / v.n).toFixed(0)}`);
  }
}
if (leaks.size) {
  console.error(`Textos de Guatemala en carreras de otros países (${leaks.size}):\n  ${[...leaks].slice(0, 40).join('\n  ')}`);
  process.exitCode = 1;
} else if (countries.some((x) => x.code !== 'GT')) console.log('Países: ningún texto de Guatemala se cuela en otras nacionalidades.');
if (guardErrors.size) {
  console.error(`Carreras cortadas por el límite de iteraciones:\n  ${[...guardErrors].slice(0, 10).join('\n  ')}`);
  process.exitCode = 1;
} else console.log(`Iteraciones: ninguna carrera llegó al límite de ${GUARD}.`);
if (summaryErrors.size) {
  console.error(`Resumen de carrera con errores:\n  ${[...summaryErrors].join('\n  ')}`);
  process.exitCode = 1;
} else console.log('Resumen: el palmarés cuadra con títulos y premios, y todo momento tiene texto.');
if (ntErrors.size) {
  console.error(`Partidos con la Selección que no cuadran:\n  ${[...ntErrors].join('\n  ')}`);
  process.exitCode = 1;
} else console.log('Selección: los partidos listados cuadran con partidos y goles sumados.');
// ---------- Convocatoria de otro país: reporte ----------
const pn = (x: number, d = N) => `${((100 * x) / d).toFixed(1)}%`;
console.log(`Ascendencia: ${pct(nac.herencia)} de las carreras (por la madre ${pn(nac.madre, nac.herencia || 1)})`);
console.log(`Ofertas de otro país (% de carreras): por ascendencia ${pct(nac.oferta.nac_ascendencia)} · por naturalización ${pct(nac.oferta.nac_naturalizacion)} · alguna ${pct(nac.oferta.alguna)} · disponibles y nunca vistas ${pct(nac.sinVer)}`);
console.log(`Cambiaron de Selección: ${pct(nac.cambio)} (${Object.entries(nac.via).map(([k, v]) => `${k} ${v}`).join(', ') || 'ninguno'}) · de ellos jugaron un Mundial: ${pn(nac.mundialCambio, nac.cambio || 1)}`);
if (countries.length > 1) {
  console.log('Por origen (ascendencia / recibe oferta / cambia):');
  console.log('  ' + Object.entries(nacByOrigin).map(([code, v]) => `${code} ${pn(v.herencia, v.n)}/${pn(v.oferta, v.n)}/${pn(v.cambio, v.n)}`).join(' · '));
}
// CA-1: tasa de ascendencia y reparto madre/padre (solo con una muestra grande y todos los países).
if (!only && N >= 5000) {
  if (nac.herencia / N < 0.22 || nac.herencia / N > 0.28) nacErrors.add(`ascendencia ${pct(nac.herencia)} fuera de 22-28 %`);
  if (nac.madre / nac.herencia < 0.45 || nac.madre / nac.herencia > 0.55) nacErrors.add(`ascendencia por la madre ${pn(nac.madre, nac.herencia)} fuera de 45-55 %`);
}
// Límites que acepta el servidor (api/ranking.ts).
if (scores.at(-1)! > SCORE_LIMIT || scores[0] < -100 || maxTitles > 200 || maxCaps > 500) nacErrors.add(`fuera de los límites del servidor: puntaje ${scores[0]}..${scores.at(-1)}, títulos ${maxTitles}, partidos ${maxCaps}`);
// La lista de códigos de api/ranking.ts (copia a mano) coincide con COUNTRIES.
{
  const api = readFileSync(new URL('../api/ranking.ts', import.meta.url), 'utf8');
  const listed = [...(api.match(/COUNTRY_CODES = new Set\(\[([^\]]*)\]\)/)?.[1] ?? '').matchAll(/'([A-Z]{2})'/g)].map((m) => m[1]).sort();
  const real = COUNTRIES.map((c) => c.code).sort();
  if (listed.join() !== real.join()) nacErrors.add(`api/ranking.ts no coincide con COUNTRIES: ${listed.join(',')} vs ${real.join(',')}`);
}
if (nacErrors.size) {
  console.error(`Convocatoria de otro país con errores (${nacErrors.size}):\n  ${[...nacErrors].slice(0, 40).join('\n  ')}`);
  process.exitCode = 1;
} else console.log('Convocatoria: ofertas, elegibilidad, cambio, hito, temporadas y "Con cada Selección" cuadran; la lista de la API coincide con COUNTRIES.');
if (keeperGoals.size) {
  console.error(`Textos donde el portero anota (${keeperGoals.size}):\n  ${[...keeperGoals].join('\n  ')}`);
  process.exitCode = 1;
} else console.log('Porteros: ningún texto los hace anotar de jugada.');
if (amorProhibido.size) {
  console.error(`Textos de amor con términos prohibidos (${amorProhibido.size}):\n  ${[...amorProhibido].join('\n  ')}`);
  process.exitCode = 1;
} else console.log('Amor: la búsqueda de términos prohibidos (RS-01 a RS-04, RS-06) no encontró nada. Falta la lectura de RS-07.');
if (amorErrors.size) {
  console.error(`Vida sentimental con errores:\n  ${[...amorErrors].join('\n  ')}`);
  process.exitCode = 1;
} else console.log('Amor: estado coherente, sin menores, rutas cerradas, hitos en orden y opciones que suman 1.');
if (Math.max(...scores) >= SCORE_LIMIT) { console.error(`Puntaje máximo ${Math.max(...scores)}: el servidor acepta menos de ${SCORE_LIMIT} (CA-13)`); process.exitCode = 1; }

// ---------- Mercado y contratos ----------
const GT = countryOf('GT');
const ES_ = countryOf('ES');
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const quant = (a: number[], q: number) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(q * a.length))];
console.log(`Ofertas: ${offersCheck} · clubes por oferta 1/2/3/4: ${offerSize.slice(1).map((n) => `${((100 * n) / Math.max(1, offersCheck)).toFixed(1)}%`).join(' / ')} · con 2 o más: ${((100 * (offersCheck - offerSize[1])) / Math.max(1, offersCheck)).toFixed(1)}%`);
console.log(`Ofertas de 3 o más con un club de prestigio parecido: ${((100 * multiSimilar) / Math.max(1, multi)).toFixed(1)}% · ofertas con un club del extranjero: ${((100 * withAbroad) / Math.max(1, offersCheck)).toFixed(1)}%`);
if (offersCheck && offerSize[1] / offersCheck > 0.05) marketErrors.add(`${((100 * offerSize[1]) / offersCheck).toFixed(1)}% de ofertas con un solo club (máximo 5%)`);
if (multi && multiSimilar / multi < 0.8) marketErrors.add('menos del 80% de las ofertas de 3 o más trae un club parecido');
if (offersCheck && !withAbroad && countries.length > 1) marketErrors.add('ninguna oferta trae un club del extranjero');

// CA-7: monotonía de salaryFor con un club de cada tipo; nunca depende de la nacionalidad.
const grid = (f: (rating: number, fame: number) => number[]) => {
  for (const r of [40, 55, 70, 85, 95]) for (const fame of [0, 20, 80, 150, 300]) if (f(r, fame).some((x, i, a) => i && x < a[i - 1])) return false;
  return true;
};
for (const c of COUNTRIES) {
  const list = clubsOf(c.code).sort((a, b) => a.prestige - b.prestige);
  if (!grid((r, f) => list.map((x) => salaryFor(x, r, f)))) marketErrors.add(`${c.code}: un club de más prestigio paga menos`);
  for (const t of [1, 2] as const) {
    const up = clubsOf(c.code).filter((x) => x.tier === t).map((x) => salaryFor(x, 60, 20));
    const down = clubsOf(c.code).filter((x) => x.tier === t + 1).map((x) => salaryFor(x, 60, 20));
    if (up.length && down.length && Math.min(...up) < Math.max(...down)) marketErrors.add(`${c.code}: la división ${t + 1} paga más que la ${t}`);
  }
}
const sample = ALL_CLUBS.filter((_, i) => i % 7 === 0);
for (const x of sample) {
  const f = (a: number[]) => a.map((r) => salaryFor(x, r, 20));
  if (f([40, 50, 60, 70, 80, 90, 97]).some((v, i, a) => i && v < a[i - 1])) marketErrors.add(`${x.id}: más nivel no paga más`);
  if ([0, 10, 50, 100, 150, 400].map((fa) => salaryFor(x, 70, fa)).some((v, i, a) => i && v < a[i - 1])) marketErrors.add(`${x.id}: más fama no paga más`);
}
for (let pr = 36; pr <= 76; pr++) {
  const same = ALL_CLUBS.filter((x) => x.prestige === pr).sort((a, b) => countryOf(a.country).level - countryOf(b.country).level);
  if (same.some((x, i) => i && countryOf(x.country).level > countryOf(same[i - 1].country).level && salaryFor(x, 60, 20) < salaryFor(same[i - 1], 60, 20))) marketErrors.add(`prestigio ${pr}: una liga mejor paga menos`);
}
for (const x of sample) {
  const base = salaryFor(x, 70, 30);
  for (const home of [GT, countryOf('ES'), countryOf('JP')]) if (salaryFor(viewClub(x, home), 70, 30) !== base) marketErrors.add(`${x.id}: el salario cambia con la nacionalidad`);
}
// CA-8: medianas al firmar por referencia y tope.
const BANDS: Record<string, [number, number]> = { 'GT 2da': [12_000, 45_000], 'GT 1ra': [30_000, 120_000], 'GT LN': [150_000, 600_000], 'Top 5 (prestigio 72+)': [20e6, 150e6] };
console.log('Salario al firmar, mediana (min-max aceptado):');
for (const [k, [lo, hi]] of Object.entries(BANDS)) {
  if (!signed[k].length) continue; // por ejemplo, la corrida de un solo país
  const m = median(signed[k]);
  console.log(`  ${k}: ${moneyShort(GT, m)} de ${signed[k].length} (${moneyShort(GT, lo)} a ${moneyShort(GT, hi)}) · p10 ${moneyShort(GT, quant(signed[k], 0.1))} · p90 ${moneyShort(GT, quant(signed[k], 0.9))}`);
  if (m < lo || m > hi) marketErrors.add(`mediana de ${k} fuera de banda: ${m}`);
}
console.log(`Salario máximo firmado: ${moneyShort(GT, maxSalary)} · máximo en Liga Nacional de Guatemala: ${moneyShort(GT, maxLN)}`);
if (maxSalary > 600e6) marketErrors.add(`salario sobre 600 M: ${maxSalary}`);
if (maxLN > 1_500_000) marketErrors.add(`un salario de Liga Nacional sobre 1,5 M: ${maxLN}`);
// CA-10: formatos de moneyShort.
const FORMATS: [typeof GT, number, string][] = [
  [GT, 850, 'Q850'], [GT, 25_500, 'Q25.5 mil'], [GT, 150_000, 'Q150 mil'], [GT, 1_234_567, 'Q1.2 M'], [GT, 2_900_000_000, 'Q2.9 mil M'],
  [ES_, 10_000_000, '€1.2 M'], [GT, 999_960, 'Q1 M'], [GT, 100_000_000, 'Q100 M'], [GT, 1_000, 'Q1 mil'],
];
for (const [c, n, want] of FORMATS) if (moneyShort(c, n) !== want) marketErrors.add(`moneyShort(${c.code}, ${n}) = "${moneyShort(c, n)}", esperado "${want}"`);
// CA-11: dinero final de carrera.
console.log('Dinero final de carrera (p50 / p90):');
for (const [k, v] of Object.entries(finalMoney)) if (v.length) console.log(`  ${k}: ${moneyShort(GT, quant(v, 0.5))} / ${moneyShort(GT, quant(v, 0.9))} en quetzales (${v.length} carreras)`);
if (finalMoney.Guatemala.length && finalMoney['ES/AR/BR'].length && median(finalMoney['ES/AR/BR']) <= median(finalMoney.Guatemala)) marketErrors.add('el p50 de la potencia no supera al de Guatemala');
if (marketErrors.size) {
  console.error(`Mercado y contratos con errores (${marketErrors.size}):\n  ${[...marketErrors].slice(0, 40).join('\n  ')}`);
  process.exitCode = 1;
} else console.log('Mercado: ofertas, contratos, salarios y formatos de monto cuadran.');

// ---------- Tienda de estilo de vida (specs/tienda) ----------
// TIENDA=off la omite. Cuatro pasadas de N carreras con las mismas semillas, posiciones y ritmos que el bucle principal:
// sin tienda (debe dar lo mismo que el bucle principal), prudente, máximo (la cota superior del gasto) y abusivo (solo vida social, sin límite).
console.log('\n--- Tienda ---');
const tiendaErrors = new Set<string>();
if (process.env.TIENDA === 'off') console.log('Tienda: omitida (TIENDA=off)');
else {
  const t1 = (x: number) => x.toFixed(1);
  const GTM = (q: number) => moneyShort(countryOf('GT'), q);
  const mk = (seed: number, code = 'GT', position: Position = 'DEL') =>
    new Career({ firstName: 'T', lastName: 'T', country: code, dept: countryOf(code).regions[0], position, foot: 'Derecho', number: 9, mode: 'normal', avatar: { skin: 0, hair: 0, hairColor: 0, beard: 0, extra: 0 } }, seed);
  /** Un jugador con saldo (una temporada falsa con ese salario): sirve para probar compras sin jugar una carrera. */
  const conSaldo = (c: Career, q = 1e12) => {
    c.player.seasons.push({ label: '2026-27', salary: q, clubId: c.player.clubId, tier: 3, apps: 0, goals: 0, assists: 0, titles: [], awards: [] } as any);
    return c;
  };
  const tiendaTextos = new Set<string>(); // todo texto de la tienda que se vio, para RC-01 a RC-04
  const textosPersonal = new Set<string>(); // los que hablan de personal, para RC-02

  // ---- CA-3 y RF-08: el catálogo ----
  if (CATALOGO.length !== 42) tiendaErrors.add(`el catálogo tiene ${CATALOGO.length} ítems, deben ser 42 (CA-3)`);
  if (new Set(CATALOGO.map((i) => i.id)).size !== CATALOGO.length) tiendaErrors.add('ids repetidos en el catálogo');
  for (const i of CATALOGO) {
    if (![1, 2, 3, 4, 5].includes(i.estrellas) || !(i.precio > 0) || !i.nombre.trim() || !i.resumen.trim()) tiendaErrors.add(`ítem mal armado: ${i.id}`);
    if (i.categoria !== 'personal' && i.categoria !== 'social' && i.estrellas >= 2 && i.precio < 300_000) tiendaErrors.add(`${i.id}: compra única de 2 o más estrellas bajo Q300.000 (RF-08)`);
    if (i.categoria === 'personal' && i.estrellas >= 2 && i.precio <= 45_000) tiendaErrors.add(`${i.id}: tarifa de 2 o más estrellas que cabe en un salario de Q45.000 (RF-08)`);
    if (i.categoria === 'transporte' && i.precio < 45_000_000) tiendaErrors.add(`${i.id}: transporte de élite bajo Q45 M (RF-08)`);
    if (i.categoria !== 'social' && i.categoria !== 'personal' && i.estrellas >= 2 && i.precio <= 225_000) tiendaErrors.add(`${i.id}: cabe en 5 temporadas de Q45.000 (CA-4)`);
    tiendaTextos.add(`${i.nombre}. ${i.resumen}`);
    if (/\d,\d{2,}/.test(i.resumen)) tiendaErrors.add(`${i.id}: decimales de más en el resumen: ${i.resumen}`);
    if (i.categoria === 'personal') textosPersonal.add(`${i.nombre}. ${i.resumen}`);
  }
  for (const e of new Set(CATALOGO.map((i) => i.espacio))) {
    const l = CATALOGO.filter((i) => i.espacio === e).sort((a, b) => a.estrellas - b.estrellas);
    l.forEach((i, k) => {
      if (k && !(i.precio > l[k - 1].precio && i.animo >= l[k - 1].animo && i.fama >= l[k - 1].fama)) tiendaErrors.add(`${e}: más estrellas no sube el precio o baja el efecto (${i.id})`);
    });
  }
  const conteo = Object.fromEntries(CATEGORIAS.map(([c]) => [c, CATALOGO.filter((i) => i.categoria === c).length]));
  if (['vivienda', 'carros', 'transporte', 'personal', 'social'].some((c, k) => conteo[c] !== [5, 5, 7, 20, 5][k])) tiendaErrors.add(`conteo por categoría: ${JSON.stringify(conteo)}`);
  console.log(`Catálogo: ${CATALOGO.length} ítems (${Object.entries(conteo).map(([k, v]) => `${k} ${v}`).join(' · ')}), precio y efecto crecientes por espacio, cotas de RF-08 y CA-4.`);

  // ---- CA-2: rechazos de cada tipo dejan todo idéntico ----
  {
    const sinCambios = (nombre: string, c: Career, f: () => { ok: boolean; motivo?: string }) => {
      const antes = JSON.stringify(c.player) + c.saldo;
      const r = f();
      if (r.ok || !r.motivo?.trim()) tiendaErrors.add(`rechazo ${nombre}: ${r.ok ? 'se aceptó' : 'sin motivo'}`);
      else tiendaTextos.add(r.motivo);
      if (JSON.stringify(c.player) + c.saldo !== antes) tiendaErrors.add(`rechazo ${nombre}: cambió el saldo, el historial o el jugador`);
    };
    const c = mk(1);
    sinCambios('ítem inexistente', c, () => c.buy('mansion-9'));
    sinCambios('ítem inexistente (contratar)', c, () => c.hire('chef-9'));
    sinCambios('saldo insuficiente (compra)', c, () => c.buy('vivienda-1'));
    sinCambios('saldo insuficiente (contratación)', c, () => c.hire('chef-1'));
    sinCambios('compra de algo que se contrata', c, () => c.buy('chef-1'));
    sinCambios('contratación de algo que se compra', c, () => c.hire('vivienda-1'));
    conSaldo(c, 50_000_000);
    sinCambios('reserva del transporte de élite', c, () => c.buy('helicoptero-3'));
    if (!c.buy('vivienda-3').ok || !c.buy('carro-2').ok || !c.hire('chef-2').ok) tiendaErrors.add('compras válidas rechazadas');
    sinCambios('ya tiene uno mejor (vivienda)', c, () => c.buy('vivienda-2'));
    sinCambios('ya tiene ese (vivienda)', c, () => c.buy('vivienda-3'));
    sinCambios('ya tiene ese carro', c, () => c.buy('carro-2'));
    sinCambios('ya lo tiene contratado', c, () => c.hire('chef-2'));
    c.player.retired = true;
    sinCambios('jugador retirado', c, () => c.buy('carro-3'));
    c.player.retired = false;
    // La reserva del transporte: con 1,5 veces el precio se puede, justo debajo no.
    const e = mk(2);
    conSaldo(e, 67_499_999);
    sinCambios('reserva justo debajo', e, () => e.buy('helicoptero-3'));
    conSaldo(e, 1);
    if (!e.buy('helicoptero-3').ok) tiendaErrors.add('con la reserva exacta (1,5 veces) no dejó comprar el helicóptero');
    // El garaje es una colección: varios carros, no el mismo dos veces, y el ánimo solo cuenta el mejor.
    const g = conSaldo(mk(3));
    for (const k of [1, 2, 3, 4, 5]) if (!g.buy(`carro-${k}`).ok) tiendaErrors.add(`garaje: no dejó comprar el carro ${k}`);
    if (g.buy('carro-3').ok || poseidos(g.player).filter((i) => i.espacio === 'carro').length !== 5) tiendaErrors.add('garaje: repitió un modelo o no es una colección');
    const solo = conSaldo(mk(3));
    solo.buy('carro-5');
    if (animoBase(g.player) !== animoBase(solo.player)) tiendaErrors.add('garaje: el ánimo cuenta más que el mejor carro');
    if (g.player.compras.reduce((t, k) => t + k.fama, 0) !== [1, 2, 3, 4, 5].reduce((t, k) => t + itemById(`carro-${k}`)!.fama, 0)) tiendaErrors.add('garaje: la fama puntual no es la de cada compra');
    // Despedir es libre; contratar el mismo rol en otro nivel reemplaza.
    const h = conSaldo(mk(4));
    h.hire('fisio-2');
    h.hire('fisio-4');
    if (h.player.personal.length !== 1 || contratadoDe(h.player, 'fisio')?.estrellas !== 4) tiendaErrors.add('contratar otro nivel del mismo rol no reemplazó');
    const saldoAntes = h.saldo;
    if (!h.fire('fisio') || h.player.personal.length || h.saldo !== saldoAntes || h.fire('fisio')) tiendaErrors.add('despedir no es libre o no deja al rol vacío');
    // preview: lo que avisa la confirmación.
    const pv = conSaldo(mk(5), 1_000_000);
    pv.hire('entrenador-3');
    const v = pv.preview('vivienda-2');
    if (!v || v.saldoDespues !== 500_000 || v.alcanza || v.tarifas !== 600_000) tiendaErrors.add(`preview de la compra con personal: ${JSON.stringify(v)}`);
    if (pv.preview('vivienda-5') !== null) tiendaErrors.add('preview de una compra que el motor rechaza debe ser null');
  }

  // ---- CA-7: ánimo ----
  {
    const stub = (ids: string[]) => ({ compras: ids.filter((i) => !/^(chef|fisio|entrenador|asistente)/.test(i)).map((id) => ({ id, year: 0, precio: 0, fama: 0 })), personal: ids.filter((i) => /^(chef|fisio|entrenador|asistente)/.test(i)).map((id) => ({ id, desde: 0 })) }) as any;
    let max = 0;
    for (const v of ['', 'vivienda-1', 'vivienda-2', 'vivienda-3', 'vivienda-4', 'vivienda-5']) for (const k of ['', 'carro-1', 'carro-2', 'carro-3', 'carro-4', 'carro-5'])
      for (const h of ['', 'helicoptero-3', 'helicoptero-4']) for (const y of ['', 'yate-3', 'yate-4', 'yate-5']) for (const a of ['', 'avion-4', 'avion-5'])
        for (const s of ['', 'asistente-1', 'asistente-2', 'asistente-3', 'asistente-4', 'asistente-5']) max = Math.max(max, animoBase(stub([v, k, h, y, a, s].filter(Boolean))));
    console.log(`Ánimo base: nominal 5 → ${animoDe(5).toFixed(2)} · nominal 18 → ${animoDe(18).toFixed(2)} · máximo de las 7.776 combinaciones ${max.toFixed(2)} (tope ${TOPE_ANIMO})`);
    if (max > TOPE_ANIMO || animoDe(5) < 2.7 || animoDe(5) > 3 || animoDe(18) < 3.8 || animoDe(18) > TOPE_ANIMO) tiendaErrors.add('el ánimo base se sale de CA-7');
  }

  // ---- CA-8: lesiones evitadas y físico de chef y fisioterapeuta ----
  {
    const evita = (ids: string[]) => {
      const c = mk(11);
      c.player.personal = ids.map((id) => ({ id, desde: 0 }));
      let n = 0;
      for (let i = 0; i < 20000; i++) if ((c as any).applyEffects({ injury: 1 }).includes('Lesión evitada')) n++;
      return (100 * n) / 20000;
    };
    const ambos = evita(['chef-5', 'fisio-5']), soloChef = evita(['chef-5']), soloFisio = evita(['fisio-5']), nadie = evita([]);
    console.log(`Lesión evitada en 20.000 sorteos: chef 5★ y fisio 5★ ${t1(ambos)}% (tope 40) · solo chef ${t1(soloChef)}% (15) · solo fisio ${t1(soloFisio)}% (40) · sin personal ${t1(nadie)}%`);
    if (ambos < 38 || ambos > 42 || soloChef < 13 || soloChef > 17 || soloFisio < 38 || soloFisio > 42 || nadie !== 0) tiendaErrors.add('lesiones evitadas fuera de CA-8');
    const f = mk(12).player;
    f.personal = [{ id: 'chef-5', desde: 0 }, { id: 'fisio-5', desde: 0 }];
    if (fisicoExtra(f) !== TOPE_FISICO) tiendaErrors.add(`el físico de chef y fisio 5★ suma ${fisicoExtra(f)}, debe ser ${TOPE_FISICO}`);
    f.personal = [{ id: 'fisio-1', desde: 0 }];
    if (Math.abs(fisicoExtra(f) - 0.3) > 1e-9) tiendaErrors.add('el físico del fisioterapeuta 1★ no es 0,3');
    // Sin personal no se toca el azar (RF-22): el siguiente número es el mismo que en una carrera sin lesión sorteada.
    const a = mk(13), b = mk(13);
    (a as any).applyEffects({ injury: 1 });
    if (a.rng() !== b.rng()) tiendaErrors.add('sin personal, una lesión consumió azar (RF-22)');
  }

  // ---- CA-9: vida social y abuso ----
  {
    const c = conSaldo(mk(21));
    const p = c.player;
    const n = 10000;
    const gala = itemById('social-5')!;
    const cuenta = [0, 1, 2, 3].map(() => ({ esc: 0, dis: 0, animo: 0, fama: 0 }));
    for (let t = 0; t < n; t++) {
      p.compras = [];
      p.morale = 50;
      p.fame = 0;
      for (let k = 0; k < 4; k++) {
        const r = c.buy('social-5');
        if (!r.ok) { tiendaErrors.add('compra social rechazada'); break; }
        tiendaTextos.add(r.text);
        cuenta[k].esc += /escándalo/.test(r.text) ? 1 : 0;
        cuenta[k].dis += /distrajo/.test(r.text) ? 1 : 0;
        cuenta[k].animo += r.changes.includes(`+${gala.animo} Ánimo`) ? 2 : r.changes.includes(`+${Math.floor(gala.animo / 2)} Ánimo`) ? 1 : r.changes.some((x) => /\+\d+ Ánimo/.test(x)) ? -99 : 0;
        cuenta[k].fama += r.changes.includes(`+${gala.fama} Fama`) ? 2 : r.changes.includes(`+${Math.floor(gala.fama / 2)} Fama`) ? 1 : r.changes.some((x) => /\+\d+ Fama/.test(x)) ? -99 : 0;
      }
    }
    const pc = (x: number) => (100 * x) / n;
    console.log(`Vida social, ${n} ventanas de 4 compras de una Gala benéfica: escándalo/distracción 1.ª ${t1(pc(cuenta[0].esc))}/${t1(pc(cuenta[0].dis))} · 2.ª ${t1(pc(cuenta[1].esc))}/${t1(pc(cuenta[1].dis))} · 3.ª ${t1(pc(cuenta[2].esc))}/${t1(pc(cuenta[2].dis))} (20/15) · 4.ª ${t1(pc(cuenta[3].esc))}/${t1(pc(cuenta[3].dis))} (45/25)`);
    for (const k of [0, 1]) if (cuenta[k].esc || cuenta[k].dis || cuenta[k].animo !== 2 * n || cuenta[k].fama !== 2 * n) tiendaErrors.add(`la compra social ${k + 1} trae riesgo o no da su efecto completo`);
    if (Math.abs(pc(cuenta[2].esc) - 20) > 3 || Math.abs(pc(cuenta[2].dis) - 15) > 3) tiendaErrors.add('la 3.ª compra social no trae 20 % y 15 %');
    if (Math.abs(pc(cuenta[3].esc) - 45) > 3 || Math.abs(pc(cuenta[3].dis) - 25) > 3) tiendaErrors.add('la 4.ª compra social no trae 45 % y 25 %');
    if (cuenta[2].animo !== n || cuenta[2].fama !== n) tiendaErrors.add('la 3.ª compra social no da la mitad del ánimo y la fama');
    if (cuenta[3].animo !== 0 || cuenta[3].fama !== 0) tiendaErrors.add('la 4.ª compra social da ánimo o fama');
    // La ventana: tres temporadas después la cuenta vuelve a empezar.
    p.compras = [];
    for (let k = 0; k < 3; k++) c.buy('social-1');
    p.year += 3;
    if (riesgoSocial(p).factor !== 1) tiendaErrors.add('la ventana de 3 temporadas no se renueva');
    // Determinismo (RF-22): las dos primeras compras sociales y una vivienda no consumen azar.
    const a = conSaldo(mk(22)), b = mk(22);
    a.buy('vivienda-1'); a.buy('social-1'); a.buy('social-2');
    if (a.rng() !== b.rng()) tiendaErrors.add('comprar sin riesgo consumió azar (RF-22)');
  }

  // ---- CA-6: el entrenador solo acelera el avance por la brecha ----
  {
    let casos = 0, mal = 0;
    for (let age = 16; age <= 36; age++) for (const gap of [3, 10, 25, 40]) for (const morale of [30, 60, 90]) for (const share of [0.2, 0.8]) {
      const par = [0, 1].map(() => {
        const c = mk(31);
        const p = c.player;
        Object.assign(p, { age, rating: 50, potential: 50 + gap, morale, fitness: 100 });
        return c;
      });
      par[1].player.personal = [{ id: 'entrenador-5', desde: 0 }];
      (par[0] as any).progress(share, 0, 0, { entrenador: bonoEntrenador(par[0].player), animo: 0, fisico: 0 });
      (par[1] as any).progress(share, 0, 0, { entrenador: bonoEntrenador(par[1].player), animo: 0, fisico: 0 });
      const [x, y] = [par[0].player, par[1].player];
      const dif = y.rating - x.rating;
      casos++;
      const mood = 0.6 + morale / 125;
      const brecha0 = age <= 23 ? Math.min(6, Math.max(0, gap * 0.2 * mood * (0.5 + share / 2))) : age <= 29 ? gap * 0.12 : 0;
      const b = bonoEntrenador(y); // 0 con 30 años o más
      const esperado = age > 29 ? 0 : Math.min(brecha0 * (1 + b), 6) - brecha0;
      if (Math.abs(dif - esperado) > 1e-9 || dif > gap + 1e-9 || x.potential !== y.potential || (age > 29 && b !== 0)) mal++;
    }
    console.log(`Entrenador 5★ contra ninguno (misma semilla y estado): ${casos} casos de los 16 a los 36 años, ${mal} fuera de CA-6`);
    if (mal) tiendaErrors.add(`entrenador: ${mal} de ${casos} casos fuera de CA-6`);
  }

  // ---- CA-13: la pantalla ----
  {
    const es = conSaldo(mk(41, 'ES'), 2_000_000);
    const cash = (q: number) => moneyShort(es.home, q);
    const original = CATALOGO[0].nombre;
    CATALOGO[0].nombre = '<b>x</b>';
    const html = tiendaHtml(es, estadoInicial(), cash);
    CATALOGO[0].nombre = original;
    if (html.includes('<b>x</b>') || !html.includes('&lt;b&gt;x&lt;/b&gt;')) tiendaErrors.add('la pantalla de tienda no escapa los nombres (CA-13)');
    if (/Q\d/.test(html) || !html.includes('€')) tiendaErrors.add('un jugador español no ve euros (CA-13)');
    if (!html.includes('aria-label="3 de 5 estrellas">★★★☆☆<')) tiendaErrors.add('estrellas de un ítem de 3 mal escritas (CA-13)');
    if ((html.match(/<button/g) ?? []).length < 10 || !html.includes('data-act="volver"')) tiendaErrors.add('la pantalla no trae botones ni "Volver al juego"');
    const confirm = tiendaHtml(es, { sel: 'vivienda-2', aviso: '<i>aviso</i>', abiertas: ['vivienda'] }, cash);
    if (confirm.includes('<i>aviso</i>') || !confirm.includes('Saldo después') || !confirm.includes('data-act="confirmar"')) tiendaErrors.add('la confirmación no muestra el saldo después o no escapa el aviso');
    for (const h of [html, confirm]) tiendaTextos.add(h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
    textosPersonal.add(tiendaHtml(es, { sel: 'chef-3', aviso: '', abiertas: ['personal'] }, cash).match(/<li class="t-item t-confirm">[\s\S]*?<\/li>/)?.[0].replace(/<[^>]+>/g, ' ') ?? '');
    // CA-14: el final con la compra más importante.
    const f = conSaldo(mk(42), 2e9);
    f.buy('vivienda-5'); f.buy('yate-3');
    const linea = comprasDestacadasHtml(f.player).replace(/<[^>]+>/g, '');
    if (linea !== 'Mansión ★★★★★ · Yate de 12 metros ★★★' || comprasDestacadasHtml(mk(43).player) !== '') tiendaErrors.add(`línea de compras destacadas: "${linea}" (CA-14)`);
    if (f.saldo !== summarize(f.player).earned - f.gastado) tiendaErrors.add('el saldo final no es ganado menos gastado (CA-14)');
    tiendaTextos.add(linea);
  }

  // ---- CA-15: el ranking no recibe nada de la tienda ----
  {
    const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    const envio = main.match(/rankingApi\(\{[^\n]*\n?[^\n]*\)/)?.[0] ?? '';
    const card = main.match(/const card: RankCard = \{[\s\S]*?\};/)?.[0] ?? '';
    if (!envio || /saldo|gastad|compra|personal|tienda/i.test(envio + card)) tiendaErrors.add('el envío al ranking menciona la tienda (CA-15)');
  }

  // ---- Las pasadas ----
  type Pol = 'sin' | 'prudente' | 'maximo' | 'abuso';
  const grupoDe = (code: string) => (code === 'GT' ? 'Guatemala' : ['ES', 'AR', 'BR'].includes(code) ? 'ES/AR/BR' : 'resto');
  const GRUPOS = ['Guatemala', 'ES/AR/BR', 'resto'];
  // Orden: entrenador, fisioterapeuta, chef, vivienda, asistente, carro, vida social, transporte: fracción del saldo que se acepta gastar.
  const REGLAS: Record<Exclude<Pol, 'sin'>, number[]> = {
    prudente: [0.15, 0.15, 0.15, 0.4, 0.1, 0.4, 0.05, 0.4],
    maximo: [0.3, 0.3, 0.3, 0.9, 0.2, 0.9, 0.2, 0.9],
    abuso: [0, 0, 0, 0, 0, 0, 0.2, 0],
  };
  const porPrecio = (f: (i: (typeof CATALOGO)[number]) => boolean) => CATALOGO.filter(f).sort((a, b) => b.precio - a.precio);

  function pasada(pol: Pol) {
    const R = {
      scores: [] as number[], peaks: [] as number[], peaksBajos: [] as number[], brechas: [] as number[], years: 0, mundial: 0, verd: {} as Record<string, number>,
      saldo: Object.fromEntries(GRUPOS.map((g) => [g, [] as number[]])), ganado: [] as number[], gastado: [] as number[],
      compras: Object.fromEntries(GRUPOS.map((g) => [g, new Map<string, number>()])), n: Object.fromEntries(GRUPOS.map((g) => [g, 0])),
      nivel: Object.fromEntries(GRUPOS.map((g) => [g, Object.fromEntries(CATEGORIAS.map(([c]) => [c, [0, 0, 0, 0, 0, 0]]))])),
      despidos: 0, conDespidos: 0, evitadas: 0, escandalos: 0, distracciones: 0, sociales: 0, famaMax: 0, rechazos: 0, gt2: 0, gt2n: 0, gt2compra: 0, transporteBajo: 0,
    };
    for (let i = 0; i < N; i++) {
      const country = countries[i % countries.length];
      const k = Math.floor(i / countries.length);
      const career = new Career(
        { firstName: 'Sim', lastName: `#${i}`, country: country.code, dept: country.regions[k % country.regions.length], position: positions[k % 4], foot: 'Derecho', number: 10, mode: modes[k % 3], avatar: { skin: 0, hair: 0, hairColor: 0, beard: 0, extra: 0 } },
        i + 1,
      );
      const p = career.player;
      const personalVisto = new Set<string>();
      let gastadoPropio = 0; // lo que se pagó en compras, contado aparte para cuadrar con el motor
      const chequear = (donde: string) => {
        const gastos = p.seasons.reduce((t, r) => t + (r.gastos?.personal ?? 0), 0);
        if (career.saldo < 0) tiendaErrors.add(`${pol}: saldo negativo (${career.saldo}) ${donde}`);
        if (career.saldo !== earned(p) - career.gastado || career.gastado !== gastadoPropio + gastos) tiendaErrors.add(`${pol}: el saldo no cuadra con lo ganado, lo comprado y lo cobrado ${donde}`);
      };
      const comprar = (id: string) => {
        const it = itemById(id)!;
        const r = it.categoria === 'personal' ? career.hire(id) : career.buy(id);
        if (!r.ok) { R.rechazos++; tiendaErrors.add(`${pol}: la política intentó algo que el motor rechaza: ${id}: ${r.motivo}`); return; }
        if (it.categoria !== 'personal') gastadoPropio += it.precio;
        else { personalVisto.add(id); textosPersonal.add(r.text); }
        tiendaTextos.add(r.text);
        if (it.categoria === 'social') R.sociales++;
        if (/escándalo/.test(r.text)) R.escandalos++;
        if (/distrajo/.test(r.text)) R.distracciones++;
        chequear(`tras comprar ${id}`);
      };
      // Compra el ítem más caro de la lista que el motor acepte y quepa en la fracción del saldo.
      const mejor = (lista: typeof CATALOGO, regla: number) => lista.find((i) => i.precio <= regla * career.saldo && validar(p, career.saldo, i.id, i.categoria === 'personal' ? 'contratar' : 'comprar').ok);
      const politica = () => {
        const [rEnt, rFis, rChef, rViv, rAsi, rCar, rSoc, rTra] = REGLAS[pol as Exclude<Pol, 'sin'>];
        if (p.age > 29 && contratadoDe(p, 'entrenador')) career.fire('entrenador');
        const rol = (r: 'entrenador' | 'fisio' | 'chef' | 'asistente', regla: number) => {
          const actual = contratadoDe(p, r)?.estrellas ?? 0;
          const it = mejor(porPrecio((i) => i.espacio === r && i.estrellas > actual), regla);
          if (it) comprar(it.id);
        };
        if (p.age <= 28 && rEnt) rol('entrenador', rEnt);
        if (p.age >= 26 && rFis) rol('fisio', rFis);
        if (p.age >= 26 && rChef) rol('chef', rChef);
        if (rViv) { const it = mejor(porPrecio((i) => i.categoria === 'vivienda'), rViv); if (it) comprar(it.id); }
        if (rAsi) rol('asistente', rAsi);
        if (rCar) {
          const mejorCarro = Math.max(0, ...poseidos(p).filter((i) => i.espacio === 'carro').map((i) => i.estrellas));
          const it = mejor(porPrecio((i) => i.categoria === 'carros' && i.estrellas > mejorCarro), rCar);
          if (it) comprar(it.id);
        }
        if (rSoc) {
          const limite = pol === 'abuso' ? 3 : 2;
          for (let n = 0; n < limite; n++) {
            if (p.compras.filter((c) => itemById(c.id)!.categoria === 'social' && c.year > p.year - 3).length >= limite) break;
            const it = mejor(porPrecio((i) => i.categoria === 'social'), rSoc);
            if (!it) break;
            comprar(it.id);
          }
        }
        if (rTra) for (let n = 0; n < 3; n++) { const it = mejor(porPrecio((i) => i.categoria === 'transporte'), rTra); if (!it) break; comprar(it.id); }
      };
      career.start();
      let guard = 0;
      while (!career.isOver && guard++ < GUARD) {
        if (!career.pendingEvent) {
          // La política corre tras cada temporada simulada (una por vez en los tres modos), como el jugador en el resumen de temporada.
          if (career.advance()) {
            chequear('al cerrar la temporada');
            if (!career.isOver && pol !== 'sin') politica();
          }
        }
        const ev = career.pendingEvent;
        if (ev) {
          const forced = ev.id.startsWith('nac_') ? (NAC === 'aceptar' ? 0 : NAC === 'rechazar' ? 1 : -1) : -1;
          const stay = ev.options.length - 1;
          const pick = forced >= 0 ? forced : ev.id === 'oferta' && !uniform
            ? career.rng() < 0.5 ? stay : policy === 'mejor' ? 0 : Math.floor(career.rng() * stay)
            : Math.floor(career.rng() * ev.options.length);
          if (career.choose(pick).changes.includes('Lesión evitada')) R.evitadas++;
          chequear('tras una decisión');
        }
      }
      if (guard >= GUARD) tiendaErrors.add(`${pol}: la carrera ${i} alcanzó el límite de ${GUARD} iteraciones`);
      const s = summarize(p);
      const g = grupoDe(country.code);
      R.scores.push(s.score);
      R.peaks.push(p.peakRating);
      if (p.potential <= 70) R.peaksBajos.push(p.peakRating);
      R.brechas.push(p.peakRating - p.potential);
      R.years += p.seasons.length;
      if (p.flags.mundial) R.mundial++;
      R.verd[s.verdict.title.startsWith('Leyenda ') ? 'Leyenda' : s.verdict.title] = (R.verd[s.verdict.title.startsWith('Leyenda ') ? 'Leyenda' : s.verdict.title] ?? 0) + 1;
      R.ganado.push(s.earned);
      R.gastado.push(career.gastado);
      R.saldo[g].push(career.saldo);
      R.n[g]++;
      const fama = p.compras.reduce((t, c) => t + c.fama, 0);
      R.famaMax = Math.max(R.famaMax, fama);
      if (fama > TOPE_FAMA) tiendaErrors.add(`${pol}: la fama de la tienda pasó de ${TOPE_FAMA} (${fama})`);
      if (pol === 'sin' && (p.compras.length || p.personal.length || p.seasons.some((r) => r.gastos))) tiendaErrors.add('sin tienda, la carrera trae compras o gastos');
      for (const r of p.seasons) {
        R.despidos += r.gastos?.despidos.length ?? 0;
        for (const d of r.gastos?.despidos ?? []) { tiendaTextos.add(d); textosPersonal.add(d); }
        if (r.gastos && r.gastos.personal < 0) tiendaErrors.add('gasto de personal negativo');
      }
      if (p.seasons.some((r) => r.gastos?.despidos.length)) R.conDespidos++;
      const niveles = Object.fromEntries(CATEGORIAS.map(([c]) => [c, 0]));
      const vistos = new Set<string>();
      for (const c of p.compras) {
        const it = itemById(c.id)!;
        if (!vistos.has(it.id)) R.compras[g].set(it.id, (R.compras[g].get(it.id) ?? 0) + 1); // una vez por carrera, aunque se repita
        vistos.add(it.id);
        niveles[it.categoria] = Math.max(niveles[it.categoria], it.estrellas);
        if (it.categoria === 'transporte' && s.earned < 67_500_000) R.transporteBajo++;
      }
      // El personal no queda en el historial de compras: se cuenta aparte, una vez por nivel contratado en la carrera.
      for (const id of personalVisto) {
        const it = itemById(id)!;
        R.compras[g].set(id, (R.compras[g].get(id) ?? 0) + 1);
        niveles.personal = Math.max(niveles.personal, it.estrellas);
      }
      for (const [cat, n] of Object.entries(niveles)) R.nivel[g][cat][n]++;
      // CA-4: quien nunca salió de la Segunda División de Guatemala no compra nada de 2 o más estrellas.
      const gt2 = country.code === 'GT' && p.seasons.every((r) => r.tier === 3 && clubById(r.clubId).country === 'GT');
      if (gt2) {
        R.gt2n++;
        if (p.compras.some((c) => itemById(c.id)!.estrellas >= 2)) R.gt2compra++;
      }
    }
    return R;
  }
  type Pasada = ReturnType<typeof pasada>;
  const t0 = Date.now();
  const pasadas = { sin: pasada('sin'), prudente: pasada('prudente'), maximo: pasada('maximo'), abuso: pasada('abuso') };
  console.log(`(4 pasadas de ${N} carreras en ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  const sorted = (a: number[]) => [...a].sort((x, y) => x - y);
  const mean = (a: number[]) => a.reduce((t, x) => t + x, 0) / Math.max(1, a.length);
  const stat = (R: Pasada) => ({
    media: mean(R.scores), p90: quant(R.scores, 0.9), max: Math.max(...R.scores), temporadas: R.years / N, mundial: (100 * R.mundial) / N, pico: mean(R.peaks), picoBajo: mean(R.peaksBajos),
    p99brecha: quant(R.brechas, 0.99),
  });
  const base = stat(pasadas.sin);
  // La pasada sin tienda reproduce el bucle principal: mismas semillas, mismas decisiones.
  if (JSON.stringify(sorted(pasadas.sin.scores)) !== JSON.stringify(sorted(scores))) tiendaErrors.add('la pasada sin tienda no da los mismos puntajes que el bucle principal');
  console.log('Con y sin tienda (puntaje medio · p90 · máximo · temporadas por carrera · Mundial · nivel pico · pico con potencial ≤70 · p99 de pico−potencial):');
  for (const [nombre, R] of Object.entries(pasadas)) {
    const s = stat(R);
    console.log(`  ${nombre.padEnd(8)} ${t1(s.media)} · ${s.p90} · ${s.max} · ${s.temporadas.toFixed(2)} · ${t1(s.mundial)}% · ${s.pico.toFixed(2)} · ${s.picoBajo.toFixed(2)} · ${s.p99brecha}`);
  }
  console.log(`  (línea base de main antes de ritmo-por-temporada, 6c440b6: puntaje medio 107,6 · p90 206 · máximo 705 · 21,0 temporadas · Mundial 10,8 %; la pasada "sin" se compara contra sí misma)`);
  for (const nombre of ['prudente', 'maximo'] as const) {
    const R = pasadas[nombre], s = stat(R);
    const errs: string[] = [];
    if (s.media > base.media * 1.05) errs.push(`puntaje medio +${t1((100 * (s.media - base.media)) / base.media)}% (tope 5)`);
    if (s.pico - base.pico > 1.5) errs.push(`nivel pico +${(s.pico - base.pico).toFixed(2)} (tope 1,5)`);
    if (s.picoBajo - base.picoBajo > 1) errs.push(`nivel pico con potencial ≤70 +${(s.picoBajo - base.picoBajo).toFixed(2)} (tope 1,0)`);
    if (s.temporadas - base.temporadas > 0.5) errs.push(`temporadas +${(s.temporadas - base.temporadas).toFixed(2)} (tope 0,5)`);
    if (s.mundial - base.mundial > 1) errs.push(`Mundial +${t1(s.mundial - base.mundial)} puntos (tope 1,0)`);
    if (s.max >= 1000) errs.push(`puntaje máximo ${s.max} (debe ser menor que 1000)`);
    if (s.p99brecha - base.p99brecha > 1) errs.push(`p99 de pico−potencial +${s.p99brecha - base.p99brecha} (tope 1)`);
    for (const v of new Set([...Object.keys(R.verd), ...Object.keys(pasadas.sin.verd)])) {
      const d = (100 * ((R.verd[v] ?? 0) - (pasadas.sin.verd[v] ?? 0))) / N;
      if (Math.abs(d) > 3) errs.push(`veredicto ${v} ${d > 0 ? '+' : ''}${t1(d)} puntos (tope 3)`);
    }
    console.log(`  ${nombre}: ${errs.length ? errs.join(' · ') : 'dentro de los topes de CA-10'}`);
    if (N >= 5000 && !only && errs.length) tiendaErrors.add(`${nombre} fuera de CA-10: ${errs.join('; ')}`);
  }
  console.log('Veredictos con y sin tienda (puntos de diferencia contra sin tienda):');
  for (const v of Object.keys(pasadas.sin.verd).sort((a, b) => pasadas.sin.verd[b] - pasadas.sin.verd[a])) {
    console.log(`  ${v}: sin ${t1((100 * pasadas.sin.verd[v]) / N)}% · prudente ${t1((100 * (pasadas.prudente.verd[v] ?? 0)) / N)}% · máximo ${t1((100 * (pasadas.maximo.verd[v] ?? 0)) / N)}%`);
  }
  for (const nombre of ['prudente', 'maximo', 'abuso'] as const) {
    const R = pasadas[nombre];
    console.log(`\nPolítica ${nombre}: ganado medio ${GTM(mean(R.ganado))} · gastado medio ${GTM(mean(R.gastado))} (${t1((100 * mean(R.gastado)) / mean(R.ganado))}% de lo ganado) · fama máxima de la tienda ${R.famaMax}`);
    for (const g of GRUPOS) if (R.saldo[g].length) console.log(`  saldo final ${g.padEnd(9)} (${R.n[g]}) p10 ${GTM(quant(R.saldo[g], 0.1))} · p50 ${GTM(quant(R.saldo[g], 0.5))} · p90 ${GTM(quant(R.saldo[g], 0.9))}`);
    console.log(`  despidos automáticos por falta de saldo: ${R.despidos} en ${t1((100 * R.conDespidos) / N)}% de las carreras · lesiones evitadas ${R.evitadas} · compras sociales ${R.sociales} · escándalos ${R.escandalos} · distracciones ${R.distracciones}`);
    if (nombre === 'abuso') continue;
    const top = (g: string) => [...R.compras[g]].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => `${itemById(id)!.nombre} ${t1((100 * n) / Math.max(1, R.n[g]))}%`).join(' · ');
    for (const g of GRUPOS) console.log(`  compras más comunes ${g} (% de carreras que la hicieron al menos una vez): ${top(g) || 'ninguna'}`);
    for (const g of GRUPOS) {
      console.log(`  mejor nivel por categoría, ${g} (sin/1★/2★/3★/4★/5★, % de carreras):`);
      for (const [cat, nombreCat] of CATEGORIAS) console.log(`    ${nombreCat.padEnd(20)} ${R.nivel[g][cat].map((n) => t1((100 * n) / Math.max(1, R.n[g])).padStart(5)).join(' ')}`);
    }
    console.log(`  Segunda División de Guatemala toda la carrera: ${R.gt2n} carreras, ${R.gt2compra} compraron algo de 2 o más estrellas (CA-4)`);
    if (R.gt2compra) tiendaErrors.add(`${nombre}: ${R.gt2compra} carreras que nunca salieron de la Segunda División de Guatemala compraron algo de 2 o más estrellas (CA-4)`);
    if (R.transporteBajo) tiendaErrors.add(`${nombre}: transporte de élite con ganado final menor que Q67,5 M (CA-4)`);
  }
  const todo = Object.values(pasadas);
  if (todo.some((R) => Math.max(...R.scores) >= 1000)) tiendaErrors.add('el puntaje máximo llegó a 1.000 o más (CA-15)');
  // Lo que se pudo costear con una carrera normal de Guatemala (revisión de la escala de precios, T7).
  {
    const gt = pasadas.prudente.nivel.Guatemala;
    const alcanza = (cat: string, k: number) => t1((100 * (gt[cat].slice(k).reduce((t, x) => t + x, 0))) / Math.max(1, pasadas.prudente.n.Guatemala));
    console.log(`Guatemala con la política prudente: apartamento o mejor ${alcanza('vivienda', 1)}% · carro normal o mejor ${alcanza('carros', 1)}% · casa de 3★ o más ${alcanza('vivienda', 3)}% · transporte ${alcanza('transporte', 3)}%`);
  }

  // ---- CA-12 (apoyo): búsqueda de términos de RC-01 a RC-04. RC-05 exige que una persona lea cada texto. ----
  const RC_PROHIBIDO = new RegExp([
    // RC-01: servicios sexuales, compañía pagada
    'sex', 'desnud', '\\bcitas?\\b', 'escort', 'mujer', 'chica', 'dama', 'prostit', 'acompañante', 'compañía', 'novia', 'amante', 'cuerpo', 'strip', 'burdel', 'cabaret',
    // RC-02: personas como mercancía (se miran solo en lo que habla del personal, abajo)
    'esclav', 'mercanc', 'propiedad', 'dueñ',
    // RC-03: alcohol, drogas, apuestas
    'alcohol', 'cerveza', '\\bvino\\b', 'trago', 'licor', 'whisky', 'champ[aá]', 'brindis', 'borrach', 'droga', 'apuest', 'casino', 'póker', 'poker', 'cantina', 'cóctel', 'coctel',
    // RC-04: marcas y personas reales
    'ferrari', 'lamborghini', 'porsche', 'tesla', 'mercedes', 'bmw', 'audi', 'toyota', 'honda', 'ford', 'chevrolet', 'rolls', 'bentley', 'bugatti', 'maserati', 'lexus', 'jaguar', 'mazda',
    'nissan', 'cessna', 'boeing', 'airbus', 'gulfstream', 'learjet', 'sikorsky', 'robinson', 'azimut', 'sunseeker', 'ferretti', 'messi', 'ronaldo', 'neymar', 'mbapp', 'maradona',
  ].join('|'), 'i');
  const PERSONAL_TRATO = /compr|posee|poseé|\bobjeto|\blujo|\btuyo\b|\bde tu propiedad/i;
  // El texto de todo lo que dice el código de la tienda (no solo lo que salió en las pasadas): el catálogo, los motivos, los avisos y la pantalla.
  for (const fuente of ['../src/engine/tienda.ts', '../src/ui/tienda.ts']) {
    const src = readFileSync(new URL(fuente, import.meta.url), 'utf8');
    for (const lit of src.match(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) ?? []) tiendaTextos.add(lit);
  }
  let leidos = 0;
  for (const t of tiendaTextos) {
    leidos++;
    const m = t.match(RC_PROHIBIDO);
    if (m) tiendaErrors.add(`texto con "${m[0]}" (RC-01 a RC-04): ${t.slice(0, 120)}`);
  }
  for (const t of textosPersonal) if (PERSONAL_TRATO.test(t)) tiendaErrors.add(`texto de personal que lo trata como objeto (RC-02): ${t.slice(0, 120)}`);
  console.log(`\nTextos de la tienda revisados con la búsqueda de términos: ${leidos} (sin coincidencias; RC-05 exige además la lectura de una persona).`);
}
if (tiendaErrors.size) {
  console.error(`Tienda con errores (${tiendaErrors.size}):\n  ${[...tiendaErrors].slice(0, 40).join('\n  ')}`);
  process.exitCode = 1;
} else console.log('Tienda: catálogo, rechazos, saldo nunca negativo, topes, sorteos, entrenador, pantalla, ranking y textos cuadran.');

// ---------- Minijuegos (specs/minijuegos) ----------
// Los veredictos del puntaje de hoy (specs/minijuegos CA-8, el ancla de ritmo-por-temporada CA-05). La frecuencia, la cobertura por temporada
// y las proporciones de categoría que antes se medían aquí (MJ_BASE, pisos de -2,5) pasaron al sección "Ritmo".
const MJ_VEREDICTOS: Record<string, number> = { 'Jugador de culto': 32.0, Cumplidor: 30.2, 'Referente de la Liga': 13.8, 'Promesa que no fue': 8.4, 'Ídolo nacional': 7.4, Leyenda: 8.2 };
const big = N >= 5000 && !only; // los criterios porcentuales piden la muestra completa
const f1 = (x: number) => x.toFixed(1);
const f2 = (x: number) => x.toFixed(2);
console.log('\n--- Minijuegos ---');

// CA-1: cada situación sale al menos una vez; el resto se comprobó en cada decisión (posición, clásico, Selección, tres desenlaces).
// La lista sale de ALL_EVENTS (toda plantilla de la categoría minijuego), no de un archivo: el contenido nuevo entra solo.
const mjIds = MINIJUEGOS_EVENTS.map((e) => e.id);
console.log(`Situaciones vistas: ${mjIds.filter((id) => mjSeen[id]).length} de ${mjIds.length} · por plantilla: ${mjIds.map((id) => `${id.slice(3)} ${mjSeen[id] ?? 0}`).join(' · ')}`);
if (big) for (const id of mjIds) if (!mjSeen[id]) mjErrors.add(`${id} nunca salió (CA-1)`);
for (const e of MINIJUEGOS_EVENTS) {
  if (typeof e.weight === 'number') mjErrors.add(`${e.id}: peso numérico (el motor lo trataría como paso de una ruta)`);
  if (e.once) mjErrors.add(`${e.id}: con \`once\` (el minijuego sale una vez por temporada, sin límite por carrera; ritmo-por-temporada RF-12)`);
  if (e.cooldown === undefined || e.cooldown < 2) mjErrors.add(`${e.id}: sin espaciado de 3 temporadas (cooldown 2, ritmo-por-temporada RF-11)`);
}
console.log(`Minijuegos de Selección vistos después de cambiar de Selección: ${mjNtTrasCambio} (todos nombran la Selección nueva)`);
// Selección que cambió: la plantilla nombra la nueva y no la de origen (prueba directa, sin depender de la suerte).
{
  const c = new Career({ firstName: 'T', lastName: 'T', country: 'GT', dept: 'Guatemala', position: 'DEL', foot: 'Derecho', number: 9, mode: 'normal', avatar: { skin: 0, hair: 0, hairColor: 0, beard: 0, extra: 0 } }, 1);
  c.player.ntLevel = 1;
  c.player.cambioSel = { to: 'MX', from: 'GT', caps: 0, goals: 0, year: 2030, via: 'madre' };
  const ctx: EventContext = c.context();
  for (const t of MINIJUEGOS_EVENTS.filter((e) => e.id.endsWith('_seleccion'))) {
    const txt = [typeof t.title === 'function' ? t.title(c.player, ctx) : t.title, t.text(c.player, ctx), ...t.options(c.player, ctx)[0].outcomes.map((x) => x.text), ...t.options(c.player, ctx)[0].outcomes.map((x) => x.effects.milestone ?? '')].join(' | ');
    if (!txt.includes('el Tri') || /Azul y Blanco|FEDEFUT|Bicolor|Guatemala/.test(txt)) mjErrors.add(`${t.id}: con la Selección cambiada a México no usa la nueva (${txt.slice(0, 90)})`);
  }
}

// CA-2 (minijuegos): frecuencia y pisos de categoría quedan reemplazados por ritmo-por-temporada RF-09 a RF-13 (sección "Ritmo": uno por temporada,
// 18 años o más, sin repetir en menos de 3 temporadas, categorías contra la línea base de hoy).
console.log('Frecuencia (media por carrera · carreras con al menos uno · máximo): el detalle por temporada está en el sección "Ritmo"');
let mjTotal = 0;
for (const m of modes) {
  const a = mjByMode[m];
  const total = a.n.reduce((x, y) => x + y, 0);
  mjTotal += total;
  console.log(`  ${m}: ${f2(total / a.n.length)} · ${f1((100 * a.n.filter((x) => x > 0).length) / a.n.length)}% · máx ${Math.max(...a.n)}`);
}
console.log(`Categoría minijuego: ${mjTotal} minijuegos en ${N} carreras (${f1(mjTotal / N)} por carrera)`);

// CA-3: dificultad y parámetros.
for (const imp of [1, 2, 3] as const) {
  let prev = -1;
  for (let r = 40; r <= 95; r++) {
    const d = difficultyFor(r, imp);
    if (!(d >= 0.1 && d <= 0.9)) mjErrors.add(`dificultad ${d} fuera de [0,1; 0,9] (nivel ${r}, importancia ${imp})`);
    if (prev >= 0 && d > prev + 1e-12) mjErrors.add(`la dificultad sube con el nivel (${r}, importancia ${imp})`);
    prev = d;
  }
}
for (let r = 40; r <= 95; r++) for (const imp of [1, 2] as const) if (difficultyFor(r, imp + 1) < difficultyFor(r, imp) - 1e-12) mjErrors.add(`la dificultad baja con la importancia (nivel ${r})`);
{
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  const a = params(0.1), b = params(0.9), m = params(0.5);
  if (!near(a.zone, 0.3) || !near(b.zone, 0.1) || !near(a.period, 2200) || !near(b.period, 1200) || !near(a.window, 700) || !near(b.window, 400)) mjErrors.add('params no da los extremos de RF-08');
  if (!near(m.zone, 0.2) || !near(m.period, 1700) || !near(m.window, 550)) mjErrors.add('params no interpola linealmente');
  console.log(`Parámetros: zona ${a.zone}/${m.zone}/${b.zone} · barrido ${a.period}/${m.period}/${b.period} ms · ventana ${a.window}/${m.window}/${b.window} ms (dificultad 0,1/0,5/0,9)`);
}

// CA-4: Simular, 10.000 resultados por dificultad, y la repetición con la misma semilla.
const dist = (d: number, seed: number, n = 10000) => {
  const rng = createRng(seed);
  const c: Record<MinigameResult, number> = { ok: 0, half: 0, fail: 0 };
  const seq: number[] = [];
  for (let i = 0; i < n; i++) {
    const sc = simulatedScore(rng, d);
    c[resultOf(sc)]++;
    if (i < 50) seq.push(sc);
  }
  return { ok: (100 * c.ok) / n, half: (100 * c.half) / n, fail: (100 * c.fail) / n, seq };
};
const okAt: Record<number, number> = {};
for (const d of [0.1, 0.5, 0.9]) {
  const r = dist(d, 7);
  okAt[d] = 0.4 - 0.5 * (d - 0.5);
  console.log(`Simular con dificultad ${d}: éxito ${f1(r.ok)}% · a medias ${f1(r.half)}% · fallo ${f1(r.fail)}%`);
  if (d === 0.5 && (Math.abs(r.ok - 40) > 3 || Math.abs(r.half - 35) > 3 || Math.abs(r.fail - 25) > 3)) mjErrors.add(`Simular con 0,5 dio ${f1(r.ok)}/${f1(r.half)}/${f1(r.fail)} (CA-4)`);
  if (d === 0.1 && r.ok < 55) mjErrors.add(`Simular con 0,1: éxito ${f1(r.ok)}% (CA-4)`);
  if (d === 0.9 && r.ok > 25) mjErrors.add(`Simular con 0,9: éxito ${f1(r.ok)}% (CA-4)`);
  if (dist(d, 7).seq.join() !== r.seq.join()) mjErrors.add('la misma semilla no repite la secuencia (CA-4)');
}
const mjAll = Object.values(mjResult).reduce((t, r) => t + r.ok + r.half + r.fail, 0) || 1;
console.log('Reparto éxito / a medias / fallo con "Simular" en las carreras simuladas:');
for (const [k, r] of Object.entries(mjResult)) {
  const t = r.ok + r.half + r.fail || 1;
  console.log(`  dificultad ${k}: ${f1((100 * r.ok) / t)}% / ${f1((100 * r.half) / t)}% / ${f1((100 * r.fail) / t)}% (${t})`);
}
console.log(`  todas: ${f1((100 * Object.values(mjResult).reduce((t, r) => t + r.ok, 0)) / mjAll)}% / ${f1((100 * Object.values(mjResult).reduce((t, r) => t + r.half, 0)) / mjAll)}% / ${f1((100 * Object.values(mjResult).reduce((t, r) => t + r.fail, 0)) / mjAll)}%`);

// CA-5: jugadores sintéticos con las mismas reglas de puntaje que usa la interfaz. Perfecto: acciones exactas (el portero rival
// se lanza al azar). Al azar: lado y momento uniformes. Éxito = resultOf 'ok'.
{
  const rng = createRng(11);
  const side = () => Math.floor(rng() * 3) as Side;
  const N5 = 20000;
  const rate = (play: () => number) => {
    let ok = 0;
    for (let i = 0; i < N5; i++) if (resultOf(play()) === 'ok') ok++;
    return (100 * ok) / N5;
  };
  const center = () => CENTER[0] + rng() * (CENTER[1] - CENTER[0]);
  for (const d of [0.1, 0.5, 0.9]) {
    const pr = params(d);
    const sim = 100 * okAt[d];
    const perfect: Record<string, number> = {
      pase: rate(() => { const c = center(); return stopScore(c, c, pr.zone); }),
      cierre: rate(() => { const c = center(); return stopScore(c, c, pr.zone); }),
      atajada: rate(() => { const k = side(); return sideScore(k, k, 0, pr.window); }),
      penal: rate(() => { const c = center(); return penalScore(side(), side(), stopScore(c, c, pr.zone)); }),
    };
    const random: Record<string, number> = {
      pase: rate(() => stopScore(rng(), center(), pr.zone)),
      cierre: rate(() => stopScore(rng(), center(), pr.zone)),
      // el pateador espera de 800 a 1.600 ms; el jugador actúa en un momento uniforme entre el inicio y la llegada de la pelota
      atajada: rate(() => { const wait = 800 + rng() * 800; const at = rng() * (wait + pr.window); return sideScore(side(), side(), at - wait, pr.window); }),
      penal: rate(() => penalScore(side(), side(), stopScore(rng(), center(), pr.zone))),
    };
    console.log(`Dificultad ${d} (Simular ${f1(sim)}%): perfecto ${Object.entries(perfect).map(([k, v]) => `${k} ${f1(v)}`).join(' · ')} | al azar ${Object.entries(random).map(([k, v]) => `${k} ${f1(v)}`).join(' · ')}`);
    for (const [k, v] of Object.entries(perfect)) if (v < sim) mjErrors.add(`jugador perfecto de ${k} con ${f1(v)}% < Simular ${f1(sim)}% (dificultad ${d}, CA-5)`);
    for (const [k, v] of Object.entries(random)) if (v > sim) mjErrors.add(`jugador al azar de ${k} con ${f1(v)}% > Simular ${f1(sim)}% (dificultad ${d}, CA-5)`);
  }
}

// CA-6: el motor elige el desenlace con el resultado y se resuelve una sola vez.
{
  const mk = () => {
    const c = new Career({ firstName: 'T', lastName: 'T', country: 'GT', dept: 'Guatemala', position: 'DEL', foot: 'Derecho', number: 9, mode: 'normal', avatar: { skin: 0, hair: 0, hairColor: 0, beard: 0, extra: 0 } }, 3);
    (c as any).pending = {
      id: 'mj_prueba', category: 'minijuego', title: 't', text: 't', minigame: { kind: 'penal', difficulty: 0.5 },
      options: [{ label: 'x', outcomes: ['ok', 'half', 'fail'].map((r) => ({ p: 0, text: r, effects: {} })) }],
    };
    return c;
  };
  const casos: [number, string][] = [[0, 'fail'], [0.34, 'fail'], [0.35, 'half'], [0.69, 'half'], [0.7, 'ok'], [1, 'ok'], [NaN, 'fail'], [Infinity, 'fail'], [-1, 'fail'], [2, 'ok']];
  for (const [score, want] of casos) {
    const r = mk().choose(0, score);
    if (r.text !== want || r.result !== want) mjErrors.add(`choose(0, ${score}) dio ${r.text}, esperado ${want} (CA-6)`);
  }
  const c = mk();
  c.choose(0, 1);
  let again = false;
  try { c.choose(0, 1); } catch { again = true; }
  if (!again) mjErrors.add('resolver dos veces la misma decisión no falló (CA-6)');
  const sinScore = mk().choose(0);
  if (!['ok', 'half', 'fail'].includes(sinScore.text)) mjErrors.add('resolver sin resultado no se comportó como Simular (CA-6)');
}

// CA-7: topes de efectos, palabras prohibidas y goles de portero sobre todo lo que salió.
{
  const PROHIBIDO = /campe[oó]n|t[ií]tulo|clasific|convocad/i;
  for (const [id, list] of mjEffects) {
    list.forEach((e, i) => {
      if ((e.rating ?? 0) < -2 || (e.rating ?? 0) > 2) mjErrors.add(`${id}[${i}]: nivel ${e.rating} fuera de -2 a +2`);
      if ((e.fame ?? 0) > 15) mjErrors.add(`${id}[${i}]: fama +${e.fame} sobre el tope de 15`);
      for (const k of ['transfer', 'transferTo', 'retire', 'position', 'ntLevel', 'natTeam', 'contract', 'potential', 'injury'] as const) if (e[k] !== undefined) mjErrors.add(`${id}[${i}]: efecto prohibido ${k}`);
      if (e.milestone) mjTexts.add(`${id}: ${e.milestone}`);
    });
  }
  for (const t of mjTexts) {
    if (PROHIBIDO.test(t)) mjErrors.add(`texto con palabra prohibida: ${t}`);
    if (t.startsWith('mj_atajada') && KEEPER_GOAL.test(t)) mjErrors.add(`portero que anota: ${t}`);
  }
  console.log(`Minijuegos: ${mjTexts.size} textos distintos revisados (efectos dentro de los topes, sin títulos, clasificaciones ni convocatorias, sin goles de portero).`);
}

// CA-8: el puntaje medio y los veredictos casi no cambian.
{
  const mean = scores.reduce((t, x) => t + x, 0) / scores.length;
  console.log(`Puntaje medio ${f1(mean)} (línea base 107.6, banda 104.4 a 110.8)`);
  if (big && (mean < 104.4 || mean > 110.8)) mjErrors.add(`puntaje medio ${f1(mean)} fuera de 104,4 a 110,8 (CA-8)`);
  const grouped: Record<string, number> = {};
  for (const [k, v] of Object.entries(verdicts)) grouped[k.startsWith('Leyenda ') ? 'Leyenda' : k] = (grouped[k.startsWith('Leyenda ') ? 'Leyenda' : k] ?? 0) + v;
  console.log('Veredictos (cambio contra la línea base, tope 2 puntos):');
  for (const [k, base] of Object.entries(MJ_VEREDICTOS)) {
    const now = (100 * (grouped[k] ?? 0)) / N;
    console.log(`  ${k}: ${f1(now)}% (línea base ${f1(base)}, ${now - base >= 0 ? '+' : ''}${f1(now - base)})`);
    if (big && Math.abs(now - base) > 2) mjErrors.add(`veredicto ${k}: ${f1(now)}% contra ${f1(base)}% (CA-8)`);
  }
}

// CA-9: el modo por turnos con dificultad 0,5.
{
  const rng = createRng(5);
  const n9 = 10000;
  const r: Record<string, number>[] = [0, 1, 2].map(() => ({ ok: 0, half: 0, fail: 0 }));
  for (let i = 0; i < n9; i++) for (const o of [0, 1, 2] as const) r[o][resultOf(riskScore(o, simulatedScore(rng, 0.5)))]++;
  const pc = (o: number, k: string) => (100 * r[o][k]) / n9;
  console.log(`Por turnos (0,5): segura ${f1(pc(0, 'ok'))}/${f1(pc(0, 'half'))}/${f1(pc(0, 'fail'))} · equilibrada ${f1(pc(1, 'ok'))}/${f1(pc(1, 'half'))}/${f1(pc(1, 'fail'))} · arriesgada ${f1(pc(2, 'ok'))}/${f1(pc(2, 'half'))}/${f1(pc(2, 'fail'))} (éxito/a medias/fallo; k ${RISK_K.join(', ')})`);
  if (Math.abs(pc(1, 'ok') - 40) > 3 || Math.abs(pc(1, 'half') - 35) > 3 || Math.abs(pc(1, 'fail') - 25) > 3) mjErrors.add('la equilibrada no da 40/35/25 (CA-9)');
  if (!(pc(0, 'ok') < pc(1, 'ok') && pc(0, 'fail') < pc(1, 'fail'))) mjErrors.add('la segura no tiene menos éxitos y menos fallos que la equilibrada (CA-9)');
  if (!(pc(2, 'ok') > pc(1, 'ok') && pc(2, 'fail') > pc(1, 'fail'))) mjErrors.add('la arriesgada no tiene más éxitos y más fallos que la equilibrada (CA-9)');
}
for (const k of Object.keys(LABELS) as MinigameKind[]) if (Object.keys(LABELS[k]).length !== 3) mjErrors.add(`etiquetas de ${k}`);
if (mjErrors.size) {
  console.error(`Minijuegos con errores (${mjErrors.size}):\n  ${[...mjErrors].slice(0, 40).join('\n  ')}`);
  process.exitCode = 1;
} else console.log('Minijuegos: situaciones, frecuencia, pisos de categoría, dificultad, Simular, equidad, resultados, textos, puntaje y modo por turnos cuadran.');

// ---------- Trofeos (specs/trofeos-reales) ----------
// Juega una carrera completa con decisiones al azar (de su propio generador) o "optimistas" (la opción de mayor valor esperado en nivel y fama).
const trSetup = (seed: number, country = COUNTRIES[seed % COUNTRIES.length]) => ({
  firstName: 'T', lastName: `#${seed}`, country: country.code, dept: country.regions[0], position: positions[seed % 4], foot: 'Derecho' as const, number: 10, mode: modes[seed % 3],
  avatar: { skin: 0, hair: 0, hairColor: 0, beard: 0, extra: 0 },
});
function trCarrera(seed: number, optimista = false, country?: ReturnType<typeof countryOf>) {
  const c = new Career(trSetup(seed, country), seed);
  c.start();
  let guard = 0;
  while (!c.isOver && guard++ < GUARD) {
    if (!c.pendingEvent) c.advance();
    const ev = c.pendingEvent;
    if (!ev) continue;
    let pick = Math.floor(c.rng() * ev.options.length);
    if (optimista) {
      const value = (o: (typeof ev.options)[number]) => o.outcomes.reduce((t, x) => t + x.p * (3 * (x.effects.rating ?? 0) + (x.effects.potential ?? 0) + 0.1 * (x.effects.fame ?? 0) + 0.05 * (x.effects.morale ?? 0)), 0);
      pick = ev.options.reduce((best, o, i) => (value(o) > value(ev.options[best]) ? i : best), 0);
    }
    c.choose(pick);
  }
  return c.player;
}
// CA-5: huella de las temporadas (sin premios) de las semillas 1 a 200. Con el motor de antes de esta función daba ca5eb9d9 (4171 temporadas).
const trErrors = new Set<string>();
const HUELLA_BASE = 'ca5eb9d9';
{
  let h = 2166136261;
  let n = 0;
  for (let seed = 1; seed <= 200; seed++) {
    for (const r of trCarrera(seed).seasons) {
      const { awards: _premios, ...resto } = r;
      for (const ch of JSON.stringify(resto)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
      n++;
    }
  }
  const huella = (h >>> 0).toString(16);
  console.log(`Trofeos, huella de las temporadas sin premios (semillas 1 a 200): ${huella} (${n} temporadas; antes ${HUELLA_BASE})`);
  if (huella !== HUELLA_BASE) trErrors.add(`huella ${huella} distinta de ${HUELLA_BASE}: algo además de los premios cambió las temporadas (CA-5)`);
  // Dos corridas de la misma semilla dan los mismos premios.
  for (let seed = 1; seed <= 40; seed++) {
    const a = JSON.stringify(trCarrera(seed).seasons.map((r) => r.awards));
    if (a !== JSON.stringify(trCarrera(seed).seasons.map((r) => r.awards))) trErrors.add(`semilla ${seed}: dos corridas dieron premios distintos (CA-5)`);
  }
}

// Carrera i del mismo reparto que el bucle principal (país, posición y ritmo van rotando sin repetir pares), decisiones al azar u "optimistas".
function trReparto(i: number) {
  const country = countries[i % countries.length];
  const k = Math.floor(i / countries.length);
  return { country, setup: { ...trSetup(i + 1, country), dept: country.regions[k % country.regions.length], position: positions[k % 4], mode: modes[k % 3] } };
}
function trJugar(i: number, optimista: boolean) {
  const { setup } = trReparto(i);
  const c = new Career(setup, i + 1);
  c.start();
  let guard = 0;
  while (!c.isOver && guard++ < GUARD) {
    if (!c.pendingEvent) c.advance();
    const ev = c.pendingEvent;
    if (!ev) continue;
    const value = (o: (typeof ev.options)[number]) => o.outcomes.reduce((t, x) => t + x.p * (3 * (x.effects.rating ?? 0) + (x.effects.potential ?? 0) + 0.1 * (x.effects.fame ?? 0) + 0.05 * (x.effects.morale ?? 0)), 0);
    c.choose(optimista ? ev.options.reduce((best, o, j) => (value(o) > value(ev.options[best]) ? j : best), 0) : Math.floor(c.rng() * ev.options.length));
  }
  return c.player;
}
const POTENCIAS = ['ES', 'EN', 'IT', 'DE', 'FR', 'AR', 'BR', 'PT', 'NL'];
const NEW = ['balon', 'bota', 'golden'] as const;
const NAMES = { balon: 'Balón de Oro', bota: 'Bota de Oro', golden: 'Golden Boy' };
const trGroup = (code: string) => (code === 'GT' ? 'Guatemala' : POTENCIAS.includes(code) ? 'potencias' : 'resto');

// CA-2: pruebas de borde directas de las reglas (RF-02 a RF-04).
{
  const base: SeasonFacts = { rating: 84, age: 25, fame: 60, apps: 31, goals: 15, matches: 44, clubTitles: 0, own: { country: 'ES', tier: 1 }, held: { balon: 0, bota: 0, golden: false } };
  const win = (f: Partial<SeasonFacts>) => majorAwards({ ...base, ...f });
  const borde = (nombre: string, got: string[], want: string[]) => { if (got.join() !== want.join()) trErrors.add(`borde ${nombre}: dio [${got}], esperado [${want}]`); };
  borde('Balón: nivel 83', win({ rating: 83 }), []);
  borde('Balón: nivel 84', win({}), ['balon']);
  borde('Balón: fama 59', win({ fame: 59 }), []);
  borde('Balón: fama 60', win({ fame: 60 }), ['balon']);
  borde('Balón: 14 goles sin título', win({ goals: 14 }), []);
  borde('Balón: 14 goles con título', win({ goals: 14, clubTitles: 1 }), ['balon']);
  borde('Balón: 30 de 44 partidos (68 %)', win({ apps: 30 }), []);
  borde('Balón: 31 de 44 partidos (70,5 %)', win({ apps: 31 }), ['balon']);
  borde('Balón: liga de nivel 12 (EE. UU.)', win({ own: { country: 'US', tier: 1 } }), []);
  borde('Balón: segunda división', win({ own: { country: 'ES', tier: 2 } }), []);
  borde('Balón: ya tiene 5', win({ held: { balon: 5, bota: 0, golden: false } }), []);
  borde('Balón: ya tiene 4', win({ held: { balon: 4, bota: 0, golden: false } }), ['balon']);
  borde('Bota: 24 goles en casa (grande)', win({ rating: 60, goals: 24 }), []);
  borde('Bota: 25 goles en casa (grande)', win({ rating: 60, goals: 25 }), ['bota']);
  borde('Bota: 32 goles en casa (otra europea)', win({ rating: 60, goals: 32, own: { country: 'PT', tier: 1 } }), []);
  borde('Bota: 33 goles en casa (otra europea)', win({ rating: 60, goals: 33, own: { country: 'PT', tier: 1 } }), ['bota']);
  borde('Bota: 19 goles afuera (grande)', win({ rating: 60, goals: 19, matches: 36 }), []);
  borde('Bota: 20 goles afuera (grande)', win({ rating: 60, goals: 20, matches: 36 }), ['bota']);
  borde('Bota: 26 goles afuera (otra europea)', win({ rating: 60, goals: 26, matches: 36, own: { country: 'NL', tier: 1 } }), []);
  borde('Bota: 27 goles afuera (otra europea)', win({ rating: 60, goals: 27, matches: 36, own: { country: 'NL', tier: 1 } }), ['bota']);
  borde('Bota: fuera de la UEFA', win({ rating: 60, goals: 40, own: { country: 'AR', tier: 1 } }), []);
  borde('Bota: ya tiene 3', win({ rating: 60, goals: 25, held: { balon: 0, bota: 3, golden: false } }), []);
  borde('Golden: 22 años', win({ rating: 70, age: 22, goals: 0 }), []);
  borde('Golden: 21 años', win({ rating: 70, age: 21, goals: 0 }), ['golden']);
  borde('Golden: nivel 69', win({ rating: 69, age: 21, goals: 0 }), []);
  borde('Golden: nivel 70', win({ rating: 70, age: 21, goals: 0 }), ['golden']);
  borde('Golden: 21 de 44 partidos', win({ rating: 70, age: 21, goals: 0, apps: 21 }), []);
  borde('Golden: 22 de 44 partidos', win({ rating: 70, age: 21, goals: 0, apps: 22 }), ['golden']);
  borde('Golden: ya lo ganó', win({ rating: 70, age: 21, goals: 0, held: { balon: 0, bota: 0, golden: true } }), []);
  borde('Golden: liga de otro continente', win({ rating: 70, age: 21, goals: 0, own: { country: 'MX', tier: 1 } }), []);
  borde('Golden: división de ascenso', win({ rating: 70, age: 21, goals: 0, own: { country: 'ES', tier: 2 } }), []);
  borde('El goleador de Hypermotion no tiene nombre propio', [scorerName('ES', 2) ?? ''], ['']);
  borde('El goleador de LaLiga se llama Pichichi', [scorerName('ES', 1) ?? ''], ['Pichichi']);
}

// Una pasada por las carreras con la política dada: reparto de premios por grupo y chequeos de CA-1 y CA-2 sobre cada temporada.
function trMedir(n: number, optimista: boolean) {
  type G = { n: number; any: Record<string, number>; total: Record<string, number> };
  const mk = (): G => ({ n: 0, any: { balon: 0, bota: 0, golden: 0 }, total: { balon: 0, bota: 0, golden: 0 } });
  const g: Record<string, G> = { Guatemala: mk(), potencias: mk(), resto: mk(), todos: mk() };
  const names = new Map<string, number>(); // nombre del goleador -> premios en total
  let balonDos = 0, botaForanea = 0, maxPuntaje = 0, maxBalon = 0, maxBota = 0, maxGolden = 0;
  for (let i = 0; i < n; i++) {
    const { country } = trReparto(i);
    const p = trJugar(i, optimista);
    const seasons = p.seasons;
    const cnt: Record<string, number> = { balon: 0, bota: 0, golden: 0 };
    for (const r of seasons) {
      const own = clubById(r.clubId);
      const matches = MATCHES[r.tier];
      const ntTitles = (r.nt?.groups ?? []).filter((x) => x.out === 'Campeón').length;
      const clubTitles = r.titles.length - ntTitles;
      const had = (k: string) => r.awards.filter((a) => a.kind === k);
      // CA-1: el nombre del goleador.
      const scorer = had('goleador');
      const must = r.goals >= (r.tier === 3 ? 16 : 20);
      if (scorer.length !== (must ? 1 : 0)) trErrors.add(`goleador: ${scorer.length} premios con ${r.goals} goles en la división ${r.tier} (RF-01)`);
      for (const a of scorer) {
        const want = scorerName(own.country, own.tier);
        const nombre = a.label ?? a.name.replace(/ de .+$/, '');
        names.set(nombre, (names.get(nombre) ?? 0) + 1);
        if (want ? a.label !== want || a.name !== `${want} ${r.label}` : a.label !== undefined || !a.name.startsWith('Goleador de ') || !a.name.endsWith(r.label)) trErrors.add(`goleador de ${own.country} división ${own.tier} se llama "${a.name}" (RF-01)`);
      }
      // CA-2: cada premio nuevo cumple sus condiciones (la fama no queda en el registro; sus bordes se prueban arriba) y los topes.
      const strong = own.tier === 1 && countryOf(own.country).level >= 14;
      const uefa = own.tier === 1 && countryOf(own.country).conf === 'UEFA';
      const peso = ['ES', 'EN', 'IT', 'DE', 'FR'].includes(own.country) ? 2 : 1.5;
      const okBalon = strong && r.rating >= 84 && r.apps >= 0.7 * matches && (r.goals >= 15 || clubTitles >= 1);
      const okBota = uefa && r.goals * peso >= 1.1 * matches;
      const okGolden = uefa && r.age <= 21 && r.apps >= 0.5 * matches && r.rating >= 70;
      if (had('balon').length > 1 || had('bota').length > 1 || had('golden').length > 1) trErrors.add('dos premios iguales en una temporada');
      if (had('balon').length && !okBalon) trErrors.add(`Balón sin cumplir: nivel ${r.rating}, ${r.apps}/${matches} partidos, ${r.goals} goles, ${clubTitles} títulos, ${own.country} división ${own.tier} (RF-04)`);
      if (had('bota').length && !okBota) trErrors.add(`Bota sin cumplir: ${r.goals} goles en ${matches} partidos, ${own.country} división ${own.tier} (RF-02)`);
      if (!had('bota').length && okBota && cnt.bota < 3) trErrors.add(`Bota que faltó: ${r.goals} goles en ${matches} partidos, ${own.country} (RF-02)`);
      if (had('golden').length && !okGolden) trErrors.add(`Golden Boy sin cumplir: ${r.age} años, nivel ${r.rating}, ${r.apps}/${matches} partidos (RF-03)`);
      if (!had('golden').length && okGolden && cnt.golden < 1) trErrors.add(`Golden Boy que faltó: ${r.age} años, nivel ${r.rating} (RF-03)`);
      for (const k of NEW) {
        cnt[k] += had(k).length;
        for (const a of had(k)) if (a.name !== `${NAMES[k]} ${r.label}` || a.label !== undefined) trErrors.add(`nombre del premio nuevo: "${a.name}"`);
      }
      if (had('bota').length && r.tier === 0) botaForanea++;
    }
    if (cnt.balon > 5 || cnt.bota > 3 || cnt.golden > 1) trErrors.add(`tope superado: ${cnt.balon} Balones, ${cnt.bota} Botas, ${cnt.golden} Golden Boy (RF-05)`);
    if (cnt.balon >= 2) balonDos++;
    maxBalon = Math.max(maxBalon, cnt.balon); maxBota = Math.max(maxBota, cnt.bota); maxGolden = Math.max(maxGolden, cnt.golden);
    maxPuntaje = Math.max(maxPuntaje, summarize(p).score);
    for (const grupo of [trGroup(country.code), 'todos']) {
      g[grupo].n++;
      for (const k of NEW) { g[grupo].any[k] += cnt[k] > 0 ? 1 : 0; g[grupo].total[k] += cnt[k]; }
    }
  }
  return { g, names, balonDos, botaForanea, maxPuntaje, maxBalon, maxBota, maxGolden };
}
const trPct = (x: number, n: number) => `${((100 * x) / Math.max(1, n)).toFixed(2)}%`;
function trReporte(titulo: string, r: ReturnType<typeof trMedir>) {
  console.log(`Trofeos, ${titulo} (carreras con al menos uno · media por carrera):`);
  for (const [nombre, v] of Object.entries(r.g)) {
    if (!v.n) continue;
    console.log(`  ${nombre.padEnd(10)} n=${String(v.n).padStart(5)} · ${NEW.map((k) => `${NAMES[k]} ${trPct(v.any[k], v.n)} (${(v.total[k] / v.n).toFixed(3)})`).join(' · ')}`);
  }
  console.log(`  Balón de Oro con 2 o más: ${r.balonDos} carreras · Botas de un jugador extranjero: ${r.botaForanea} · máximos por carrera: ${r.maxBalon} Balones, ${r.maxBota} Botas, ${r.maxGolden} Golden Boy · puntaje máximo ${r.maxPuntaje}`);
}
const trAzar = trMedir(N, false);
trReporte(`decisiones al azar, ${N} carreras`, trAzar);
console.log(`Trofeos, goleadores por carrera (premios en total): ${[...trAzar.names].sort().map(([k, v]) => `${k} ${(v / N).toFixed(3)} (${v})`).join(' · ')}`);
// Techo: la política optimista (mayor valor esperado en nivel y fama) en una muestra menor, por tiempo.
const trN2 = Math.min(N, 8000);
const trTecho = trMedir(trN2, true);
trReporte(`política optimista, ${trN2} carreras (techo)`, trTecho);
// RF-05 (con las 20.000 carreras; con menos el ruido pasa de las bandas, y solo se reporta).
if (N >= 20000 && !only) {
  for (const k of NEW) {
    const pot = (100 * trAzar.g.potencias.any[k]) / trAzar.g.potencias.n;
    const gt = (100 * trAzar.g.Guatemala.any[k]) / trAzar.g.Guatemala.n;
    const todos = (100 * trAzar.g.todos.any[k]) / trAzar.g.todos.n;
    if (pot < 0.7 || pot > 2.5) trErrors.add(`${NAMES[k]}: ${pot.toFixed(2)} % de las carreras de potencias, fuera de 0,7 a 2,5 (RF-05)`);
    if (gt > 0.3) trErrors.add(`${NAMES[k]}: ${gt.toFixed(2)} % de las carreras de Guatemala, sobre 0,3 (RF-05)`);
    if (todos > 1.2) trErrors.add(`${NAMES[k]}: ${todos.toFixed(2)} % de todas las carreras, sobre 1,2 (RF-05)`);
  }
  if ((100 * trAzar.g.todos.any.balon) / trAzar.g.todos.n < 0.3) trErrors.add('Balón de Oro: menos de 0,3 % de todas las carreras (RF-05)');
  if (!trAzar.balonDos) trErrors.add('ningún ganador del Balón de Oro lo ganó 2 o más veces (CA-3)');
}
// CA-1: los cinco nombres salen al menos una vez.
if (N >= 5000 && !only) for (const nombre of Object.values(SCORER_NAME)) if (!trAzar.names.get(nombre)) trErrors.add(`el goleador "${nombre}" nunca salió (CA-1)`);
// CA-4: el puntaje medio y los veredictos casi no se mueven; el límite del servidor deja margen sobre el máximo medido.
{
  const mean = scores.reduce((t, x) => t + x, 0) / scores.length;
  console.log(`Trofeos, puntaje medio ${f1(mean)} (línea base 108.3, banda 105.1 a 111.5) · máximo ${scores.at(-1)} (azar de la corrida principal), ${trAzar.maxPuntaje} (azar de esa sección), ${trTecho.maxPuntaje} (optimista) · límite del servidor ${SCORE_LIMIT}`);
  if (big && (mean < 105.1 || mean > 111.5)) trErrors.add(`puntaje medio ${f1(mean)} fuera de 105,1 a 111,5 (CA-4)`);
  const BASE_VEREDICTOS: Record<string, number> = { 'Jugador de culto': 31.8, Cumplidor: 30.4, 'Referente de la Liga': 14.1, 'Promesa que no fue': 8.2, 'Ídolo nacional': 7.3, Leyenda: 8.4 };
  const grouped: Record<string, number> = {};
  for (const [k, v] of Object.entries(verdicts)) grouped[k.startsWith('Leyenda ') ? 'Leyenda' : k] = (grouped[k.startsWith('Leyenda ') ? 'Leyenda' : k] ?? 0) + v;
  for (const [k, base] of Object.entries(BASE_VEREDICTOS)) {
    const now = (100 * (grouped[k] ?? 0)) / N;
    if (big && Math.abs(now - base) > 2) trErrors.add(`veredicto ${k}: ${f1(now)} % contra ${f1(base)} % (CA-4)`);
  }
  const peor = Math.max(scores.at(-1)!, trAzar.maxPuntaje, trTecho.maxPuntaje);
  if (SCORE_LIMIT < 1.25 * peor || peor > 0.8 * SCORE_LIMIT) trErrors.add(`límite del servidor ${SCORE_LIMIT} sin 25 % de margen sobre el máximo medido ${peor} (RF-12)`);
  // Un jugador armado a mano con un Balón, una Bota y un Golden Boy suma 50 puntos por ellos.
  const p = trJugar(0, false);
  const antes = summarize(p).score;
  p.seasons[0].awards.push({ kind: 'balon', name: 'x' }, { kind: 'bota', name: 'x' }, { kind: 'golden', name: 'x' });
  if (summarize(p).score - antes !== 50) trErrors.add(`Balón + Bota + Golden Boy sumaron ${summarize(p).score - antes}, no 50 (RF-06)`);
}
if (trErrors.size) {
  console.error(`Trofeos con errores (${trErrors.size}):\n  ${[...trErrors].slice(0, 40).join('\n  ')}`);
  process.exitCode = 1;
} else console.log('Trofeos: nombres del goleador, condiciones y topes de los premios nuevos, huella de las temporadas, premios repetibles por semilla, puntaje y límite del servidor cuadran.');

// ---------- Ritmo por temporada (specs/ritmo-por-temporada) ----------
console.log('\n--- Ritmo ---');
if (process.env.RITMO === 'off') console.log('Ritmo: omitido (RITMO=off)');
else {
  const errores = medirRitmo(N, !only);
  if (errores.length) {
    console.error(`Ritmo con errores (${errores.length}):\n  ${errores.join('\n  ')}`);
    process.exitCode = 1;
  } else console.log('Ritmo: decisiones por temporada, minijuego, equidad entre modos, tasas, rutas, variedad, efectos, categorías y límites cuadran (o informan, según el tamaño de la muestra).');
}
