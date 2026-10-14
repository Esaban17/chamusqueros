// Simula miles de carreras con decisiones al azar para revisar el balance del juego.
// Uso: npm run simulate -- 5000       (todas las nacionalidades, por turnos)
//      npm run simulate -- 2000 GT    (solo un país)
//      NAC=aceptar npm run simulate   (toda oferta de otro país se acepta: cota superior de Mundiales)
//      NAC=rechazar | NAC=off         (toda oferta se rechaza | se quitan los eventos nac_*: la base sin la función)
import { readFileSync } from 'node:fs';
import { Career, summarize } from '../src/engine/engine';
import { COUNTRIES, countryOf } from '../src/engine/countries';
import { DIASPORA, elegible, residencia } from '../src/engine/nacionalidad';
import { clubById, clubsOf } from '../src/engine/clubs';
import { ALL_EVENTS } from '../src/engine/events';
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
const legit = (t: string) =>
  GT_CLUBS.reduce((s, c) => s.replaceAll(`${c.name} (${c.city})`, '').replaceAll(c.name.includes('Guatemala') ? c.name : '\0', ''), t).replaceAll('un club de Guatemala', '');
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
  const outEarly = new Set<string>(); // eliminatorias en las que su Selección quedó fuera en la segunda ronda (Concacaf)
  career.start();
  while (!career.isOver && guard++ < 100) {
    if (!career.pendingEvent) {
      const p = career.player;
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
      eventCount[ev.id] = (eventCount[ev.id] ?? 0) + 1;
      catCount[ev.category] = (catCount[ev.category] ?? 0) + 1;
      if (position === 'POR') {
        for (const t of [ev.text, ...ev.options.flatMap((o) => [o.label, ...o.outcomes.map((x) => x.text)])]) {
          if (KEEPER_GOAL.test(t)) keeperGoals.add(`${ev.id}: ${t}`);
        }
      }
      const antes = { caps: p.caps, goals: p.natGoals, home: career.home.code, nt: career.nt.code };
      const forced = ev.id.startsWith('nac_') ? (NAC === 'aceptar' ? 0 : NAC === 'rechazar' ? 1 : -1) : -1;
      const res = career.choose(forced >= 0 ? forced : Math.floor(career.rng() * ev.options.length));
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
  const s = summarize(p);
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
console.log(`Títulos promedio: ${(titles / N).toFixed(2)} · partidos con Selección: ${(caps / N).toFixed(1)} · máximo de goles: ${maxGoals}`);
for (const [pos, v] of Object.entries(byPos)) console.log(`  ${pos}: ${(v.apps / v.n).toFixed(0)} PJ, ${(v.goals / v.n).toFixed(0)} goles`);
console.log('Veredictos:');
for (const [k, v] of Object.entries(verdicts).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${pct(v)}`);
scores.sort((a, b) => a - b);
console.log('Puntaje p25/p50/p75/p90/p97:', [0.25, 0.5, 0.75, 0.9, 0.97].map((q) => scores[Math.floor(q * N)].toFixed(0)).join(' / '));
console.log('Máximos: puntaje', scores.at(-1), '· títulos', maxTitles, '(el servidor acepta hasta 1000 y 200)');
console.log('Fase final (torneos jugados · campeón · finalista):');
for (const [k, v] of Object.entries(koStats).sort()) console.log(`  ${k}: ${v.played} · ${((100 * v.champ) / v.played).toFixed(1)}% · ${((100 * v.final) / v.played).toFixed(1)}%`);
const totalEvents = Object.values(eventCount).reduce((a, b) => a + b, 0);
console.log('Categorías:', Object.entries(catCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${((100 * v) / totalEvents).toFixed(0)}%`).join(' · '));
const sorted = Object.entries(eventCount).sort((a, b) => b[1] - a[1]);
console.log('Más frecuentes:', sorted.slice(0, 8).map(([k, v]) => `${k} ${((100 * v) / totalEvents).toFixed(1)}%`).join(' · '));
const never = ALL_EVENTS.filter((e) => !eventCount[e.id]).map((e) => e.id);
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
