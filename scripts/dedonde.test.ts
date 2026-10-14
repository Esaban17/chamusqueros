// Prueba de la lógica pura de "¿De dónde es?" (src/retos/dedonde.ts y selecciones.ts): CA-7 y RF-17 a RF-20. No necesita navegador ni red:
//   npx tsx scripts/dedonde.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import banco from '../src/retos/futbolistas.json';
import { COUNTRIES } from '../src/engine/countries';
import { FLAG_CODE } from '../src/ui/flags';
import {
  BASE, BONUS_MAX, EXTRAS_MAX, MAX_RONDAS, META, PLAZO_MS, cerrarRonda, elegirFutbolista, frase, marcadorInicial, opcionesRonda, puntosRonda,
  type Futbolista, type Marcador,
} from '../src/retos/dedonde';
import { SELECCIONES, plausiblesDe } from '../src/retos/selecciones';

function semilla(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Constantes del spec ----------
assert.deepEqual([META, PLAZO_MS, BASE, BONUS_MAX, MAX_RONDAS, EXTRAS_MAX], [500, 12_000, 100, 50, 25, 3]);

// ---------- C1: selecciones ----------
{
  const claves = Object.keys(SELECCIONES);
  for (const k of claves) assert.ok(FLAG_CODE[k], `${k} no tiene bandera en el juego`);
  // Todas las banderas del juego son de selecciones mayores: ninguna se quedó fuera.
  assert.deepEqual(Object.keys(FLAG_CODE).filter((k) => !SELECCIONES[k]), [], 'banderas del juego sin Selección en selecciones.ts');
  assert.equal(new Set(claves.map((k) => SELECCIONES[k].pais)).size, claves.length, 'dos selecciones con el mismo QID');
  for (const k of claves) assert.match(SELECCIONES[k].pais, /^Q[1-9]\d*$/, k);
  // Cada confederación tiene de sobra distractores plausibles (3 + la correcta).
  for (const c of ['CONCACAF', 'CONMEBOL', 'UEFA', 'AFC', 'CAF'] as const) assert.ok(plausiblesDe(c).length >= 8, `${c}: pocos plausibles`);
  // La confederación de las 27 del juego coincide con la de esta tabla.
  let cruzadas = 0;
  for (const c of COUNTRIES) if (SELECCIONES[c.name]) { assert.equal(SELECCIONES[c.name].confed, c.conf, `${c.name}: confederación distinta de countries.ts`); cruzadas++; }
  assert.ok(cruzadas >= 20, `solo se contrastaron ${cruzadas} países con countries.ts`);
}

// ---------- CA-7: puntos de una ronda ----------
assert.equal(puntosRonda(true, 0), 150, 'acierto a 0 s');
assert.equal(puntosRonda(true, 6000), 125, 'acierto a 6 s');
assert.equal(puntosRonda(true, 12_000), 100, 'acierto a 12,0 s');
assert.equal(puntosRonda(true, 12_001), 0, 'acierto a 12,001 s');
assert.equal(puntosRonda(true, null), 0, 'sin responder');
assert.equal(puntosRonda(false, 0), 0, 'error al instante');
assert.equal(puntosRonda(false, 6000), 0, 'error a media ronda');
assert.equal(puntosRonda(false, 12_000), 0, 'error al límite');
assert.equal(puntosRonda(false, null), 0);
assert.equal(puntosRonda(true, 5000), 129, 'floor(50 × 7000 / 12000) = 29');
assert.equal(puntosRonda(true, 11_999), 100, 'floor(50 × 1 / 12000) = 0');
assert.equal(puntosRonda(true, -300), 150, 'un reloj hacia atrás no pasa del máximo');
assert.equal(puntosRonda(true, NaN), 0);
// El bonus nunca sube con el tiempo.
for (let t = 0; t < 12_000; t += 137) assert.ok(puntosRonda(true, t) >= puntosRonda(true, t + 137), `no monótono en ${t}`);

// ---------- CA-7: los cierres (RF-19) ----------
const m = (a: number, b: number, rondas = 6, extras = 0): Marcador => ({ puntos: [a, b], rondas, extras });
{
  const base = m(400, 400);
  const copia = JSON.stringify(base);
  const r = cerrarRonda(base, [120, 80]);
  assert.equal(JSON.stringify(base), copia, 'no muta el marcador recibido');
  assert.deepEqual(r.marcador, { puntos: [520, 480], rondas: 7, extras: 0 });
  assert.deepEqual(r.fin, { ganador: 0, motivo: 'meta' }, '520 a 480 gana el primero');
}
assert.deepEqual(cerrarRonda(m(400, 400), [110, 140]).fin, { ganador: 1, motivo: 'meta' }, '510 a 540: ambos llegaron, gana el segundo');
assert.deepEqual(cerrarRonda(m(400, 400), [100, 100]).marcador, { puntos: [500, 500], rondas: 7, extras: 1 }, '500 a 500 pasa a ronda extra');
assert.equal(cerrarRonda(m(400, 400), [100, 100]).fin, null);
assert.deepEqual(cerrarRonda(m(300, 380), [120, 100]).fin, null, '420 a 480: nadie llegó');
assert.deepEqual(cerrarRonda(m(300, 500), [0, 0]).fin, { ganador: 1, motivo: 'meta' }, 'uno solo con 500 gana aunque en esta ronda nadie sume');
{
  // 3 rondas extra igualadas dan empate (RF-19).
  let mar = cerrarRonda(m(400, 400), [100, 100]).marcador;     // 500 a 500 → extra 1
  for (let extra = 1; extra <= EXTRAS_MAX; extra++) {
    assert.equal(mar.extras, extra);
    const r = cerrarRonda(mar, [0, 0]);                          // la ronda extra número `extra` queda igual
    if (extra < EXTRAS_MAX) { assert.equal(r.fin, null, `tras la extra ${extra} sigue`); mar = r.marcador; }
    else assert.deepEqual(r.fin, { ganador: null, motivo: 'empate_extras' }, `tras la extra ${extra} es empate`);
  }
  // Una ronda extra que se desempata gana.
  assert.deepEqual(cerrarRonda(cerrarRonda(m(400, 400), [100, 100]).marcador, [120, 0]).fin, { ganador: 0, motivo: 'meta' });
}
{
  // Con 25 rondas y nadie en 500: gana quien tiene más; con empate, rondas extra.
  assert.deepEqual(cerrarRonda(m(380, 350, 24), [100, 100]).fin, { ganador: 0, motivo: 'tope_rondas' }, '25 rondas, 480 a 450');
  assert.deepEqual(cerrarRonda(m(350, 380, 24), [100, 100]).fin, { ganador: 1, motivo: 'tope_rondas' });
  assert.equal(cerrarRonda(m(300, 300, 23), [100, 100]).fin, null, 'con 24 rondas todavía no hay tope');
  const r = cerrarRonda(m(350, 350, 24), [100, 100]);
  assert.equal(r.fin, null, '25 rondas e igualados: ronda extra');
  assert.equal(r.marcador.extras, 1);
  assert.deepEqual(cerrarRonda(r.marcador, [0, 30]).fin, { ganador: 1, motivo: 'tope_rondas' }, '450 a 480 en la ronda extra');
}
assert.equal(frase({ ganador: 1, motivo: 'meta' }, ['Ana', 'Beto'], [510, 540]), 'Beto gana 540 a 510: se llegó a 500 puntos.');
assert.match(frase({ ganador: 0, motivo: 'tope_rondas' }, ['Ana', 'Beto'], [480, 450]), /Tras 25 rondas nadie llegó a 500: gana Ana.*480 a 450/);
assert.match(frase({ ganador: null, motivo: 'empate_extras' }, ['Ana', 'Beto'], [500, 500]), /^Empate a 500 puntos/);

// ---------- Opciones de una ronda (RF-17) ----------
const sintetico: Futbolista[] = Object.keys(SELECCIONES).flatMap((sel, i) => Array.from({ length: 8 }, (_, k) => ({ q: `Q${1000 + i * 10 + k}`, nombre: `Jugador ${sel} ${k}`, sel })));
const BANCO_REAL = banco as Futbolista[];
for (const [nombre, bancoPrueba] of [['sintético', sintetico], ['real', BANCO_REAL]] as const) {
  const azar = semilla(7);
  for (const f of bancoPrueba) {
    const { opciones, correcta } = opcionesRonda(f, azar);
    assert.equal(opciones.length, 4, `${nombre} ${f.q}`);
    assert.equal(new Set(opciones).size, 4, `${nombre} ${f.q}: opciones repetidas`);
    assert.equal(opciones[correcta], f.sel, `${nombre} ${f.q}: la correcta no está en su índice`);
    for (const o of opciones) {
      assert.ok(SELECCIONES[o], `${o} no es una Selección`);
      assert.equal(SELECCIONES[o].confed, SELECCIONES[f.sel].confed, `${nombre} ${f.q}: ${o} no es de la confederación de ${f.sel}`);
      assert.ok(FLAG_CODE[o], `${o} sin bandera`);
      if (o !== f.sel) assert.ok(SELECCIONES[o].plausible, `${nombre} ${f.q}: el distractor ${o} no es plausible`);
    }
  }
}
assert.throws(() => opcionesRonda({ q: 'Q1', nombre: 'X Y', sel: 'Atlántida' }), /desconocida/);

// ---------- elegirFutbolista (RF-17: no se repite en la partida) ----------
{
  const azar = semilla(3);
  const usados = new Set<string>();
  const chicos = sintetico.slice(0, 10);
  for (let i = 0; i < 10; i++) { const f = elegirFutbolista(chicos, usados, azar); assert.ok(!usados.has(f.q)); usados.add(f.q); }
  assert.equal(usados.size, 10, 'sacó los 10 sin repetir ninguno');
  assert.throws(() => elegirFutbolista(chicos, usados, azar), /No quedan/);
}

// ---------- CA-7: 1.000 partidas simuladas ----------
{
  const azar = semilla(20261014);
  const posiciones = [0, 0, 0, 0];
  let rondasTotales = 0;
  const fines: Record<string, number> = {};
  for (let partida = 0; partida < 1000; partida++) {
    const usados = new Set<string>();
    let mar = marcadorInicial();
    let fin: ReturnType<typeof cerrarRonda>['fin'] = null;
    while (!fin) {
      const ganado: [number, number] = [0, 0];
      // Los dos jugadores juegan la misma ronda en línea (un futbolista); aquí cada uno acierta con su suerte.
      const f = elegirFutbolista(sintetico, usados, azar);
      usados.add(f.q);
      const { opciones, correcta } = opcionesRonda(f, azar);
      posiciones[correcta]++;
      assert.equal(opciones[correcta], f.sel);
      for (const i of [0, 1] as const) ganado[i] = puntosRonda(azar() < 0.5 + 0.1 * i, azar() * 13_000);
      const r = cerrarRonda(mar, ganado);
      mar = r.marcador;
      fin = r.fin;
      rondasTotales++;
      assert.ok(mar.rondas <= MAX_RONDAS + EXTRAS_MAX, `partida de ${mar.rondas} rondas`);
    }
    const key = `${fin.motivo}${fin.ganador === null ? ':empate' : ''}`;
    fines[key] = (fines[key] ?? 0) + 1;
    if (fin.ganador !== null) assert.ok(mar.puntos[fin.ganador] > mar.puntos[fin.ganador === 0 ? 1 : 0], 'el ganador tiene más puntos');
    if (fin.motivo === 'meta') assert.ok(mar.puntos[0] >= META || mar.puntos[1] >= META);
  }
  const total = posiciones.reduce((a, b) => a + b, 0);
  for (const [i, n] of posiciones.entries()) assert.ok(n / total >= 0.22 && n / total <= 0.28, `la correcta cae en la posición ${i + 1} el ${((100 * n) / total).toFixed(1)} %`);
  console.log(`CA-7: 1.000 partidas (${rondasTotales} rondas); la correcta cae en cada posición ${posiciones.map((n) => ((100 * n) / total).toFixed(1) + ' %').join(' / ')}; finales ${JSON.stringify(fines)}`);
}

// ---------- Pureza: la lógica no toca el DOM ni el banco ----------
{
  assert.equal(typeof document, 'undefined');
  const texto = readFileSync(fileURLToPath(new URL('../src/retos/dedonde.ts', import.meta.url)), 'utf8');
  assert.ok(!/futbolistas\.json|document\.|window\.|innerHTML|fetch\(/.test(texto), 'dedonde.ts tiene que ser puro');
}
console.log('dedonde.test.ts: todo bien');
