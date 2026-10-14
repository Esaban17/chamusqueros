// Simula miles de carreras con decisiones al azar para revisar el balance del juego.
// Uso: npm run simulate -- 5000       (todas las nacionalidades, por turnos)
//      npm run simulate -- 2000 GT    (solo un país)
//      NAC=aceptar npm run simulate   (toda oferta de otro país se acepta: cota superior de Mundiales)
//      NAC=rechazar | NAC=off         (toda oferta se rechaza | se quitan los eventos nac_*: la base sin la función)
//      OFERTA=uniforme npm run simulate -- 5000   (ante una oferta elige al azar entre todas las opciones, "me quedo" incluida;
//        por defecto decide 50/50 entre quedarse o irse y después sortea el club; OFERTA=mejor: 50/50 y se va al club de mayor
//        prestigio, que es lo más parecido a la política de antes, cuando había un solo club)
import { readFileSync } from 'node:fs';
import { Career, earned, summarize, yearsText } from '../src/engine/engine';
import { COUNTRIES, countryOf, moneyShort } from '../src/engine/countries';
import { DIASPORA, elegible, residencia } from '../src/engine/nacionalidad';
import { clubById, clubsOf, viewClub, ALL_CLUBS } from '../src/engine/clubs';
import { salaryFor } from '../src/engine/contracts';
import { ALL_EVENTS } from '../src/engine/events';
import { PAREJA, RUTAS } from '../src/engine/events/amor';
import type { Mode, Position } from '../src/engine/types';
import { bestMoment, palmares, porSeleccion } from '../src/ui/palmares';
import { FLAG_CODE } from '../src/ui/flags';

const N = Number(process.argv[2] ?? 5000);
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
// ---------- Convocatoria de otro país (src/engine/nacionalidad.ts) ----------
const NAC = process.env.NAC; // aceptar | rechazar | off | (vacío: al azar)
if (NAC === 'off') ALL_EVENTS.splice(0, ALL_EVENTS.length, ...ALL_EVENTS.filter((e) => !e.id.startsWith('nac_')));
const nacErrors = new Set<string>();
const nac = { herencia: 0, madre: 0, oferta: { nac_ascendencia: 0, nac_naturalizacion: 0, alguna: 0 }, disponible: { nac_ascendencia: 0, nac_naturalizacion: 0 }, sinVer: 0, cambio: 0, via: {} as Record<string, number>, mundialCambio: 0 };
const nacByOrigin: Record<string, { n: number; herencia: number; oferta: number; cambio: number }> = {};
// Un texto de Selección no puede nombrar (apodo, federación o estadio) a una Selección distinta de la actual.
const NT_EVENTS = (e: { id: string; category: string }) => (e.category === 'seleccion' && !e.id.startsWith('nac_')) || e.id === 'med_sele' || e.id === 'med_resp_sele';
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
  let hijaClub = ''; // club al abrir la ruta de la hija del técnico
  let compClub = ''; // club al abrir la ruta de la pareja del compañero
  const outEarly = new Set<string>(); // eliminatorias en las que su Selección quedó fuera en la segunda ronda (Concacaf)
  let seenContract: object | null = null; // los contratos se anotan al verlos nuevos: debut, tras cada decisión y tras cada bloque
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
  while (!career.isOver && guard++ < 100) {
    if (!career.pendingEvent) {
      const p = career.player;
      const contractBefore = p.contract;
      const yearBefore = p.year;
      const clubBefore = p.clubId;
      const before = [p.caps, p.natGoals];
      const played = career.playBlock();
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
      // Contrato: la primera temporada del bloque se jugó con el que había (vigente), y todas pagan; el final nunca queda vencido.
      if (contractBefore.until < yearBefore) marketErrors.add('temporada con el contrato vencido');
      if (played[0] && played[0].salary !== contractBefore.salary) marketErrors.add(`salario de la temporada ${played[0].salary} distinto del contrato ${contractBefore.salary}`);
      if (played.some((r) => !(r.salary > 0))) marketErrors.add('temporada sin salario');
      if (p.clubId !== clubBefore && p.contract === contractBefore) marketErrors.add('cambió de club por falta de minutos sin contrato nuevo');
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
      decisions++;
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
  (decisionsByMode[mode] ??= []).push(decisions);
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
console.log(`Temporadas promedio: ${(years / N).toFixed(1)} · decisiones: intensa ${avg(decisionsByMode.intensa)}, normal ${avg(decisionsByMode.normal)}, exprés ${avg(decisionsByMode.expres)}`);
console.log(`Llegaron a primera: ${pct(reachedLN)} · jugaron en el extranjero: ${pct(abroad)} · Selección mayor: ${pct(nt)} · Mundial: ${pct(mundial)}`);
console.log(`Mercado: ofertas por carrera ${(offers / N).toFixed(2)} · me quedo ${((100 * stayed) / Math.max(1, offers)).toFixed(1)}% · cambio ${((100 * (offers - stayed)) / Math.max(1, offers)).toFixed(1)}% · cambios de club por carrera ${(moves / N).toFixed(2)}`);
console.log(`Títulos promedio: ${(titles / N).toFixed(2)} · partidos con Selección: ${(caps / N).toFixed(1)} · máximo de goles: ${maxGoals}`);
for (const [pos, v] of Object.entries(byPos)) console.log(`  ${pos}: ${(v.apps / v.n).toFixed(0)} PJ, ${(v.goals / v.n).toFixed(0)} goles`);
console.log('Veredictos:');
for (const [k, v] of Object.entries(verdicts).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${pct(v)}`);
scores.sort((a, b) => a - b);
console.log(`Puntaje medio: ${avg(scores)}`);
console.log('Puntaje p25/p50/p75/p90/p97:', [0.25, 0.5, 0.75, 0.9, 0.97].map((q) => scores[Math.floor(q * N)].toFixed(0)).join(' / '));
console.log('Máximos: puntaje', scores.at(-1), '· títulos', maxTitles, '(el servidor acepta hasta 1000 y 200)');
console.log('Fase final (torneos jugados · campeón · finalista):');
for (const [k, v] of Object.entries(koStats).sort()) console.log(`  ${k}: ${v.played} · ${((100 * v.champ) / v.played).toFixed(1)}% · ${((100 * v.final) / v.played).toFixed(1)}%`);
const totalEvents = Object.values(eventCount).reduce((a, b) => a + b, 0);
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
  if (max > 8) amorErrors.add(`${m}: una carrera con ${max} eventos de amor (CA-7)`);
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
if (scores.at(-1)! > 1000 || scores[0] < -100 || maxTitles > 200 || maxCaps > 500) nacErrors.add(`fuera de los límites del servidor: puntaje ${scores[0]}..${scores.at(-1)}, títulos ${maxTitles}, partidos ${maxCaps}`);
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
if (Math.max(...scores) >= 1000) { console.error(`Puntaje máximo ${Math.max(...scores)}: el servidor acepta menos de 1000 (CA-13)`); process.exitCode = 1; }

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
