// Simula miles de carreras con decisiones al azar para revisar el balance del juego.
// Uso: npm run simulate -- 5000       (todas las nacionalidades, por turnos)
//      npm run simulate -- 2000 GT    (solo un país)
import { Career, summarize } from '../src/engine/engine';
import { COUNTRIES, countryOf } from '../src/engine/countries';
import { clubById, clubsOf } from '../src/engine/clubs';
import { ALL_EVENTS } from '../src/engine/events';
import { PAREJA, RUTAS } from '../src/engine/events/amor';
import type { Mode, Position } from '../src/engine/types';
import { bestMoment, palmares } from '../src/ui/palmares';
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
// ---- Vida sentimental (specs/vida-sentimental) ----
// Apoyo para RS-01 a RS-04 y RS-06 sobre los textos emitidos de la categoría amor. Es apoyo, no reemplazo: RS-07 exige leerlos.
const AMOR_PROHIBIDO =
  /sex|desnud|\bcama\b|acost(ar|ó|ad|ás)|hotel|habitaci|beso apasionado|golpe|golpea|puñ|patada|pelea|amenaz|\barmas?\b|sangre|mata|muert|violen|cachetada|\bmenor|\bniñ|colegio|escuela|quincea|adolescen|chiquill|\bchicas?\b|muchacha|patoj|interesad|cazafort|trofeo|objeto|mantenid|\bloca|histéric|celosa|bruja|zorra|gay\b|homosex|travest|buenota|cuerpazo|curvas|alcohol|cerveza|tragos?\b|\bvino\b|licor|borrach|\bebri|droga|whisky|brindis|resaca|presi[oó]n|presionar|insist/i;
const amorProhibido = new Set<string>();
const amorErrors = new Set<string>();
const amorByMode: Record<string, { n: number[]; decisions: number }> = {};
const amorTexts = new Set<string>();
let amorOpen = 0, hijaPairs = 0, hijaMoved = 0, compStep = 0, compMoved = 0, boda = 0;
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
    if (country.code === 'GT' || clubById(career.player.clubId).country === 'GT') return;
    if (GT_LEAK.test(legit(t))) leaks.add(`${country.code} ${where}: ${t}`);
  };
  debutTier[career.club.tier]++;
  let guard = 0;
  let decisions = 0;
  let amorN = 0; // eventos de amor de esta carrera
  let hijaClub = ''; // club al abrir la ruta de la hija del técnico
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
        for (const m of s.nt?.matches ?? []) {
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
            const bucket = ['ES', 'AR', 'BR'].includes(country.code) ? `${kind} (ES/AR/BR)` : country.code === 'GT' ? `${kind} (GT)` : `${kind} (otros)`;
            const st = (koStats[bucket] ??= { played: 0, champ: 0, final: 0 });
            st.played++;
            if (g.out === 'Campeón') st.champ++;
            if (g.out === 'Campeón' || g.out === 'Subcampeón') st.final++;
          }
          const gt = g.table.findIndex((r) => r.team === country.name);
          if (gt < 0) ntErrors.add(`${country.name} no está en la tabla de ${g.comp}`);
          if (!FLAG_CODE[country.name]) ntErrors.add(`sin bandera: ${country.name}`);
          if (g.table.some((r) => !FLAG_CODE[r.team])) ntErrors.add(`sin bandera en ${g.comp}`);
          if (g.table.some((r) => r.pj !== r.g + r.e + r.p || r.pts !== 3 * r.g + r.e)) ntErrors.add(`tabla mal sumada en ${g.comp}`);
          if (g.table.reduce((t, r) => t + r.gf - r.ga, 0) !== 0) ntErrors.add(`goles a favor y en contra no cuadran en ${g.comp}`);
          const wc = g.comp.match(/Eliminatoria Mundial (\d+)/)?.[1];
          if (wc && g.comp.endsWith('Segunda ronda') && gt >= 2) outEarly.add(wc);
          if (wc && g.comp.endsWith('Ronda final')) {
            if (outEarly.has(wc)) ntErrors.add('ronda final después de quedar fuera en la segunda ronda');
            if ((gt < g.advance) !== groups.some((x) => x.comp === `Mundial ${wc}`)) ntErrors.add(`${country.code}: la ronda final no cuadra con jugar el Mundial`);
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
      for (const t of [ev.title, ev.text, ...ev.options.flatMap((o) => [o.label, ...o.outcomes.map((x) => x.text)])]) leak(ev.id, t);
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
        if (ev.id === 'amor_hija_3' && hijaClub) { hijaPairs++; if (pl.clubId !== hijaClub) hijaMoved++; }
      }
      if (ev.id === 'farandula' && (tiene('amor_comprometido') || tiene('amor_casado'))) amorErrors.add('farandula con comprometido o casado (RF-13)');
      const clubAntes = pl.clubId;
      career.choose(Math.floor(career.rng() * ev.options.length));
      if (ev.id === 'amor_companero_2') {
        compStep++;
        if (pl.clubId !== clubAntes) compMoved++;
      }
      if (PAREJA.filter(tiene).length > 1) amorErrors.add(`dos estados sentimentales a la vez tras ${ev.id} (RF-01)`);
      if (tiene('amor_famosa') && !PAREJA.some(tiene)) amorErrors.add(`pareja famosa sin pareja tras ${ev.id} (RF-01)`);
      decisions++;
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
  if (p.caps > 0) nt++;
  // Si un evento contó la clasificación y el jugador siguió en la Selección esa temporada, tiene que jugar el Mundial.
  for (const m of p.milestones) {
    const wc = m.match(/^Clasificó al Mundial (\d+)/)?.[1];
    const season = wc && p.seasons.find((r) => Number(r.label.slice(0, 4)) + 1 === Number(wc));
    if (season && season.nt && !p.milestones.includes(`Jugó el Mundial ${wc} con ${country.name}`)) ntErrors.add(`contó que clasificó al Mundial ${wc} y no lo jugó`);
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
console.log(`Amor, hija del técnico: ${hijaMoved} de ${hijaPairs} cambiaron de club entre los pasos 1 y 3 (${hijaPairs ? ((100 * hijaMoved) / hijaPairs).toFixed(1) : '0'}%; si pasa de 5% se reporta, no se toca applyEffects)`);
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
