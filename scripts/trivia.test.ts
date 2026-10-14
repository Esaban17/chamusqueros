// Prueba de la lógica de src/retos/trivia.ts (CA-6 y el contrato A↔B). No necesita navegador ni red:
//   npx tsx scripts/trivia.test.ts
// La pantalla (reloj, teclas, foco) se prueba en el navegador; aquí va lo que se puede fijar con tsx: reparto, puntaje, desempate, anuncios del reloj y el ciclo de vida.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import banco from '../src/retos/preguntas.json';
import {
  DIFICULTADES, MAX_RONDAS, anunciosPendientes, barajar, crearControl, ganador, jugarTrivia, muerteSubita, repartir, resultadoDuelo,
  type PreguntaBanco,
} from '../src/retos/trivia';

// Regla 5 del contrato: importar el módulo no toca `document` (aquí no existe) y exporta jugarTrivia con ese nombre.
assert.equal(typeof document, 'undefined');
assert.equal(typeof jugarTrivia, 'function');

const BANCO = banco as unknown as PreguntaBanco[];
function semilla(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- El banco que se publica tiene la forma que espera el juego ----------
assert.ok(BANCO.length >= 150, `el banco tiene ${BANCO.length} preguntas`);
for (const p of BANCO) {
  assert.equal(p.opciones.length, 4, p.id);
  assert.equal(new Set(p.opciones).size, 4, p.id);
  assert.ok(Number.isInteger(p.correcta) && p.correcta >= 0 && p.correcta < 4, p.id);
  assert.ok([1, 2, 3].includes(p.dificultad), p.id);
}
assert.equal(new Set(BANCO.map((p) => p.id)).size, BANCO.length, 'ids repetidos');

// ---------- CA-6: 1.000 partidas simuladas ----------
{
  const azar = semilla(1);
  const posiciones = [0, 0, 0, 0];
  let preguntasTotales = 0;
  for (let g = 0; g < 1000; g++) {
    const [a, b] = repartir(BANCO, azar);
    for (const lista of [a, b]) {
      assert.equal(lista.length, 5);
      assert.deepEqual(lista.map((p) => p.dificultad), [...DIFICULTADES]);   // 1, 1, 2, 2, 3 en ambos
    }
    const ids = [...a, ...b].map((p) => p.id);
    assert.equal(new Set(ids).size, 10, 'ninguna pregunta se repite en la partida');
    for (let i = 0; i < 5; i++) assert.notEqual(a[i].id, b[i].id);            // preguntas distintas de la misma dificultad
    for (const p of [...a, ...b]) {
      const original = BANCO.find((x) => x.id === p.id)!;
      assert.equal(p.opciones[p.correcta], original.opciones[original.correcta], 'la correcta sigue siendo la correcta tras barajar');
      assert.deepEqual([...p.opciones].sort(), [...original.opciones].sort());
      posiciones[p.correcta]++;
      preguntasTotales++;
    }
  }
  for (const [i, n] of posiciones.entries()) {
    const pct = (100 * n) / preguntasTotales;
    assert.ok(pct >= 22 && pct <= 28, `la correcta cae en la posición ${i + 1} el ${pct.toFixed(1)} % de las veces`);
  }
  console.log(`CA-6: 1.000 partidas; la correcta cae en cada posición ${posiciones.map((n) => ((100 * n) / preguntasTotales).toFixed(1) + ' %').join(' / ')}`);
}

// Si el banco no alcanza para una dificultad, falla en vez de repetir preguntas.
{
  const poco = BANCO.filter((p) => p.dificultad !== 3 || p.id === BANCO.find((x) => x.dificultad === 3)!.id);
  assert.throws(() => repartir(poco), /Faltan preguntas de dificultad 3/);
}
// El reparto no modifica el banco.
{
  const copia = JSON.stringify(BANCO);
  repartir(BANCO);
  assert.equal(JSON.stringify(BANCO), copia);
}
// barajar: misma longitud y mismos elementos, sin tocar el original.
{
  const orig = [1, 2, 3, 4, 5, 6];
  const b = barajar(orig, semilla(7));
  assert.deepEqual([...b].sort(), orig);
  assert.deepEqual(orig, [1, 2, 3, 4, 5, 6]);
}

// ---------- Puntaje y desempate (CA-6, RF-22) ----------
assert.equal(ganador([5, 3]), 0, '5-3 gana el jugador 1');
assert.equal(ganador([2, 4]), 1);
assert.equal(ganador([4, 4]), null, '4-4 pasa a muerte súbita');
assert.deepEqual(resultadoDuelo([5, 3], []), { ganador: 0, terminado: true });
assert.deepEqual(resultadoDuelo([4, 4], []), { ganador: null, terminado: false });
assert.deepEqual(resultadoDuelo([4, 4], [[true, false]]), { ganador: 0, terminado: true }, 'muerte súbita 1-0 gana el jugador 1');
assert.deepEqual(resultadoDuelo([4, 4], [[false, true]]), { ganador: 1, terminado: true });
assert.deepEqual(resultadoDuelo([4, 4], [[true, true], [false, false]]), { ganador: null, terminado: false }, 'dos rondas iguales: sigue');
assert.deepEqual(resultadoDuelo([4, 4], [[true, true], [false, false], [true, true]]), { ganador: null, terminado: true }, `${MAX_RONDAS} rondas iguales dan empate`);
assert.deepEqual(resultadoDuelo([4, 4], [[true, true], [false, true]]), { ganador: 1, terminado: true }, 'se decide en la segunda ronda');
assert.deepEqual(resultadoDuelo([0, 0], [[false, false], [false, false], [false, false]]), { ganador: null, terminado: true });

// Muerte súbita: dos preguntas medias nuevas por ronda; en 3 rondas nada se repite con el reparto ni entre rondas.
{
  const azar = semilla(3);
  for (let n = 0; n < 200; n++) {
    const [a, b] = repartir(BANCO, azar);
    const usadas = new Set([...a, ...b].map((p) => p.id));
    for (let r = 0; r < MAX_RONDAS; r++) {
      const [x, y] = muerteSubita(BANCO, usadas, azar);
      assert.equal(x.dificultad, 2);
      assert.equal(y.dificultad, 2);
      assert.notEqual(x.id, y.id);
      assert.ok(!usadas.has(x.id) && !usadas.has(y.id), 'pregunta de desempate repetida');
      assert.equal(x.opciones[x.correcta], BANCO.find((p) => p.id === x.id)!.opciones[BANCO.find((p) => p.id === x.id)!.correcta]);
      usadas.add(x.id);
      usadas.add(y.id);
    }
  }
}
// Sin medias libres completa con otras dificultades; sin preguntas libres falla.
{
  const medias = new Set(BANCO.filter((p) => p.dificultad === 2).map((p) => p.id));
  const [x, y] = muerteSubita(BANCO, medias, semilla(5));
  assert.ok(x.dificultad !== 2 && y.dificultad !== 2);
  assert.throws(() => muerteSubita(BANCO, new Set(BANCO.map((p) => p.id))), /No quedan preguntas/);
}

// ---------- Reloj: anuncios a los 10 s, 5 s y 0, sin repetirse (RF-26) ----------
{
  const hechos = new Set<number>();
  assert.deepEqual(anunciosPendientes(20000, hechos), []);
  assert.deepEqual(anunciosPendientes(10500, hechos), []);
  assert.deepEqual(anunciosPendientes(10000, hechos), [10]);
  hechos.add(10);
  assert.deepEqual(anunciosPendientes(9000, hechos), [], 'el de 10 s no se repite');
  assert.deepEqual(anunciosPendientes(5000, hechos), [5]);
  hechos.add(5);
  assert.deepEqual(anunciosPendientes(0, hechos), [0]);
  hechos.add(0);
  assert.deepEqual(anunciosPendientes(-300, hechos), []);
  // Pestaña en segundo plano: al volver con 4 s restantes se debe avisar una sola vez (la interfaz anuncia el menor).
  assert.deepEqual(anunciosPendientes(4000, new Set()), [10, 5]);
}

// ---------- Contrato: onFin una sola vez y cancelación idempotente (reglas 2 y 3) ----------
{
  let fines = 0;
  let limpiezas = 0;
  const c = crearControl(() => { fines++; });
  c.alLimpiar(() => { limpiezas++; });
  assert.equal(c.activo, true);
  assert.equal(c.terminar({ ganador: 0, puntos: [3, 2] }), true);
  assert.equal(c.terminar({ ganador: 1, puntos: [0, 5] }), false, 'segundo terminar no llama a onFin');
  c.cancelar();
  c.cancelar();
  assert.equal(fines, 1);
  assert.equal(limpiezas, 1, 'los relojes y escuchas se limpian una vez');
  assert.equal(c.activo, false);
}
{
  let fines = 0;
  let limpiezas = 0;
  const c = crearControl(() => { fines++; });
  c.alLimpiar(() => { limpiezas++; });
  c.cancelar();
  c.cancelar();
  assert.equal(c.terminar({ ganador: null, puntos: [0, 0] }), false, 'después de cancelar no se llama a onFin');
  assert.equal(fines, 0);
  assert.equal(limpiezas, 1);
}
{
  const recibido: unknown[] = [];
  const c = crearControl((r) => recibido.push(r));
  c.terminar({ ganador: null, puntos: [4, 4] });
  assert.deepEqual(recibido, [{ ganador: null, puntos: [4, 4] }], 'los puntos no incluyen la muerte súbita y el empate llega como null');
}

// ---------- RF-28, RF-29 y regla 1: el código de Retos B no guarda nada ni arma marcado ----------
{
  const dir = new URL('../src/retos/', import.meta.url);
  for (const f of ['trivia.ts', 'comun.ts']) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    for (const prohibido of ['innerHTML', 'insertAdjacentHTML', 'outerHTML', 'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'window.', 'eval(']) {
      assert.ok(!src.includes(prohibido), `${f} usa ${prohibido}`);
    }
  }
  // Toda mención a `document` en trivia.ts vive dentro de comun.h() (se ejecuta al jugar, no al importar).
  assert.ok(!/\bdocument\b/.test(readFileSync(new URL('trivia.ts', dir), 'utf8').replace(/\/\/.*$/gm, '')), 'trivia.ts no nombra document');
  assert.ok(readdirSync(dir).includes('preguntas.json'));
}

console.log('trivia.test.ts: todo bien');
