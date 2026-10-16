// Prueba de la lógica pura de Retos Fútbol (src/retos/pingpong.ts): normalización, repeticiones, Reto completo (CA-5),
// validación local (RF-11), nombres (RF-05) y que el código de Retos no interprete marcado ni escriba en el dispositivo (RF-28, RF-29).
//   npx tsx scripts/retos.test.ts
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizar } from '../api/_retos';
import { abre, aceptar, claveTexto, evaluar, marcadorCompleto, nuevaPartida, puntos, sanearNombres, validarEntrada, type Jugada } from '../src/retos/pingpong';
import type { Indice } from '../src/retos/comun';

// normalizar
assert.equal(normalizar('  LiOnEl   MESSÍ '), 'lionel messi');
assert.equal(normalizar("N'Golo Kanté-Jr."), 'n golo kante jr');
assert.equal(claveTexto('MESSI'), claveTexto('messi'));

// RF-05: nombres
assert.deepEqual(sanearNombres('', ''), ['Jugador 1', 'Jugador 2']);
assert.deepEqual(sanearNombres('  Ana   María ', 'Beto'), ['Ana María', 'Beto']);
assert.deepEqual(sanearNombres('Ana', ' ana '), ['Ana (1)', 'ana (2)']);
assert.deepEqual(sanearNombres('Jugador 2', ''), ['Jugador 2 (1)', 'Jugador 2 (2)']);
assert.equal(sanearNombres('x'.repeat(30), 'y')[0], 'x'.repeat(20));
assert.equal([...sanearNombres('😀'.repeat(25), 'y')[0]].length, 20, 'recorta por caracteres, no por unidades UTF-16');
for (const n of sanearNombres('a'.repeat(20), 'a'.repeat(20))) assert.ok(n.length <= 24);

// RF-11: lo que no se envía (y el motivo se dice)
for (const malo of ['', 'Messi1', 'a', 'a'.repeat(41), '-messi', 'messi:x', '(messi)', '*', '<img src=x onerror=alert(1)>', 'a.', '. .']) {
  assert.ok(validarEntrada(malo), `${JSON.stringify(malo)} no debía poder enviarse`);
}
for (const bueno of ['Messi', 'Lionel Messi', "N'Golo Kanté", 'Son Heung-min', 'Ødegaard', 'a'.repeat(40), 'Ro']) assert.equal(validarEntrada(bueno), null, bueno);

// RF-14, RF-16, RF-17: repeticiones por identidad y por texto
const jug = (texto: string, qid: string | null, nombre = texto): Omit<Jugada, 'jugador'> => ({ texto, nombre, qid, sinVerificar: qid === null, apelacion: false });
let p = nuevaPartida();
assert.equal(p.turno, 0);
assert.equal(evaluar(p, 'Messi', 'Q615'), 'ok');
p = aceptar(p, jug('Messi', 'Q615', 'Lionel Messi'));
assert.equal(p.turno, 1, 'el turno pasa al rival');
assert.equal(p.jugadas[0].jugador, 0);
assert.equal(evaluar(p, 'Lionel Messi', 'Q615'), 'repetido', 'mismo futbolista con otro texto');
assert.equal(evaluar(p, '  MESSI ', 'Q615'), 'repetido');
assert.equal(evaluar(p, 'messí', null), 'repetido', 'mismo texto normalizado sin verificación');
assert.equal(evaluar(p, 'Lionel Messi', null), 'ok', 'sin verificación y con texto distinto decide el rival');
assert.equal(evaluar(p, 'Rooney', 'Q266613'), 'ok');
const antes = JSON.stringify(p);
aceptar(p, jug('Rooney', 'Q266613'));
assert.equal(JSON.stringify(p), antes, 'aceptar no muta la partida');
p = aceptar(p, jug('Cristiano', null));
p = aceptar(p, { ...jug('Pelé', 'Q12897'), apelacion: true });
assert.deepEqual(puntos(p), [2, 1]);
assert.equal(evaluar(p, 'cristiano', null), 'repetido', 'lo aceptado sin verificar también cuenta por texto');
assert.equal(nuevaPartida(1).turno, 1);

// CA-5: Reto completo (G1 gana el jugador 1 = índice 0, G2 el 2 = índice 1, E empate)
const G1: Indice = 0, G2: Indice = 1, E = null;
const casos: [(Indice | null)[], boolean, Indice | null][] = [
  [[G1, G1], true, 0],
  [[G1, G2, G1], true, 0],
  [[G1, G2, G2], true, 1],
  [[G1, G2, E], true, null],
  [[G1, E, E], true, 0],
  [[E, E, E], true, null],
  [[G2, G2], true, 1],
  [[G1, G2], false, null],
  [[G1], false, 0],
  [[], false, null],
];
for (const [seq, terminado, ganador] of casos) {
  const m = marcadorCompleto(seq);
  assert.equal(m.terminado, terminado, JSON.stringify(seq) + ' terminado');
  if (terminado) assert.equal(m.ganador, ganador, JSON.stringify(seq) + ' ganador');
}
assert.deepEqual([0, 1, 2].map(abre), [0, 1, 0], 'abren 1, 2, 1');

// RF-28 y RF-29: nada de marcado ni de almacenamiento en el código de Retos (búsqueda de texto)
// Excepciones aprobadas: online/ (identidad y perfil, specs/retos-en-linea) y dia/ (Reto del día, specs/reto-del-dia) son subcarpetas y esta búsqueda
// solo recorre los archivos de primer nivel de src/retos/; cada una tiene su propia prueba (online-cliente.test.ts y reto-del-dia.test.ts, que fija localStorage en dia/almacen.ts).
const prohibidas = ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'eval('];
const raiz = fileURLToPath(new URL('../src/retos/', import.meta.url));
const archivos = readdirSync(raiz).filter((f) => /\.(ts|css)$/.test(f));
assert.ok(archivos.includes('pingpong.ts'), 'se esperaban los archivos de Retos');
for (const f of archivos) {
  const texto = readFileSync(join(raiz, f), 'utf8');
  for (const x of prohibidas) assert.ok(!texto.includes(x), `src/retos/${f} usa ${x}`);
}
console.log(`retos: normalización, nombres, validación, repeticiones, CA-5 (${casos.length} secuencias) y ${archivos.length} archivos sin marcado ni almacenamiento.`);
