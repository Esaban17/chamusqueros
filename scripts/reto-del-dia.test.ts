// Prueba de la lógica pura del Reto del día (src/retos/dia/puro.ts) y de las reglas de texto del código nuevo: CA-1 a CA-7 y CA-9 de
// specs/reto-del-dia. No necesita navegador ni red:
//   npx tsx scripts/reto-del-dia.test.ts
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import preguntas from '../src/retos/preguntas.json';
import futbolistas from '../src/retos/futbolistas.json';
import type { Futbolista } from '../src/retos/dedonde';
import type { PreguntaBanco } from '../src/retos/trivia-puro';
import {
  desdeTexto, diaDe, diaGT, fechaDe, fechaTexto, indiceDe, llegariaA, opcionesDelDia, preguntaDelDia, rachaVigente, registrar, textoEstado, textoRacha,
  tipoDe, ultimos7, validar, yaJugado, type Registro,
} from '../src/retos/dia/puro';

const P = preguntas as unknown as PreguntaBanco[];
const F = futbolistas as unknown as Futbolista[];
const dia = (fecha: string): number => { const d = diaDe(fecha); assert.notEqual(d, null, fecha); return d as number; };
const HOY = dia('2026-10-15');
assert.equal(HOY, 20741, 'valor de control del plan');
assert.equal(P.length, 178);
assert.equal(F.length, 520);

// ---------- CA-1: fecha de Guatemala (UTC−6 fijo, cambia a las 06:00 UTC) ----------
const gt = (iso: string) => fechaDe(diaGT(Date.parse(iso)));
assert.equal(gt('2026-10-15T05:59:59.999Z'), '2026-10-14');
assert.equal(gt('2026-10-15T06:00:00.000Z'), '2026-10-15');
assert.equal(gt('2026-10-16T05:59:59.999Z'), '2026-10-15');
assert.equal(gt('2026-01-01T05:59:59Z'), '2025-12-31');
assert.equal(gt('2028-02-29T12:00:00Z'), '2028-02-29');
assert.notEqual(tipoDe(dia('2026-10-14')), tipoDe(dia('2026-10-15')));
assert.equal(diaDe('2026-02-30'), null);
assert.equal(diaDe('2026-13-01'), null);
assert.equal(diaDe('2026-1-01'), null);
assert.equal(diaDe('2028-02-29'), dia('2028-02-29'));
assert.equal(diaDe(20741), null);
assert.equal(fechaTexto(HOY, true), '15 de octubre de 2026');
assert.equal(fechaTexto(dia('2026-01-01')), '1 de enero');

// ---------- CA-2: alternancia y vueltas completas ----------
assert.deepEqual(['2026-10-15', '2026-10-16', '2026-10-17'].map((f) => tipoDe(dia(f))), ['futbolista', 'pregunta', 'futbolista']);
const d16 = dia('2026-10-16');
const delTipo = (inicio: number, cuantas: number, t: 'pregunta' | 'futbolista') =>
  Array.from({ length: cuantas }, (_, i) => inicio + i).filter((d) => tipoDe(d) === t);
const idxP = delTipo(d16, 356, 'pregunta').map((d) => indiceDe(d, P.length));
assert.equal(idxP.length, 178);
assert.equal(new Set(idxP).size, 178, 'las 178 preguntas salen una vez cada una');
assert.equal(indiceDe(delTipo(d16, 357, 'pregunta')[178], P.length), idxP[0], 'la fecha 357 repite la primera');
const idxF = delTipo(HOY, 2080, 'futbolista').map((d) => indiceDe(d, F.length));
assert.equal(idxF.length, 1040);
assert.equal(new Set(idxF.slice(0, 520)).size, 520, 'los 520 futbolistas salen una vez cada uno');
assert.deepEqual(idxF.slice(520), idxF.slice(0, 520), 'repiten en el mismo orden');

// ---------- CA-3: dispersión (el archivo agrupa por tema y por selección) ----------
const pares = <T>(xs: T[], mismo: (a: T, b: T) => boolean) => xs.slice(1).filter((x, i) => mismo(xs[i], x)).length / (xs.length - 1);
const temas = idxP.map((i) => P[i].tema);
const sels = idxF.slice(0, 520).map((i) => F[i].sel);
const pTema = pares(temas, (a, b) => a === b);
const pSel = pares(sels, (a, b) => a === b);
assert.ok(pTema <= 0.3, `mismo tema en pares contiguos: ${pTema}`);
assert.ok(pSel <= 0.1, `misma selección en pares contiguos: ${pSel}`);

// ---------- CA-4: determinismo y reparto de la posición de la correcta ----------
for (let d = HOY; d < HOY + 1000; d++) {
  if (tipoDe(d) === 'pregunta') {
    const p: PreguntaBanco = P[indiceDe(d, P.length)];
    const a = preguntaDelDia(p, d), b = preguntaDelDia(p, d);
    assert.deepEqual(a, b);
    assert.equal(a.opciones[a.correcta], p.opciones[p.correcta], 'la correcta sigue siendo la del banco');
    assert.deepEqual([...a.opciones].sort(), [...p.opciones].sort());
  } else {
    const f: Futbolista = F[indiceDe(d, F.length)];
    const a = opcionesDelDia(f, d);
    assert.deepEqual(a, opcionesDelDia(f, d));
    assert.equal(a.opciones[a.correcta], f.sel);
    assert.equal(new Set(a.opciones).size, 4);
  }
}
const pos = { pregunta: [0, 0, 0, 0], futbolista: [0, 0, 0, 0] };
for (let d = HOY; d < HOY + 4000; d++) {
  const t = tipoDe(d);
  pos[t][t === 'pregunta' ? preguntaDelDia(P[indiceDe(d, P.length)], d).correcta : opcionesDelDia(F[indiceDe(d, F.length)], d).correcta]++;
}
for (const t of ['pregunta', 'futbolista'] as const) for (const n of pos[t]) assert.ok(n / 2000 >= 0.22 && n / 2000 <= 0.28, `${t}: ${pos[t]}`);

// ---------- CA-5: racha ----------
const D = dia('2026-10-01');
let r = registrar(null, D, true);
assert.deepEqual([r.racha, r.mejor, r.jugados, r.aciertos], [1, 1, 1, 1]);
r = registrar(r, D + 1, false);
assert.deepEqual([r.racha, r.mejor, r.jugados, r.aciertos], [2, 2, 2, 1]);
r = registrar(r, D + 2, true);
assert.deepEqual([r.racha, r.mejor, r.jugados, r.aciertos], [3, 3, 3, 2]);
r = registrar(r, D + 4, true);
assert.deepEqual([r.racha, r.mejor, r.jugados, r.aciertos], [1, 3, 4, 3]);
assert.equal(registrar(r, D + 4, false), r, 'la misma fecha no cambia nada');
assert.equal(registrar(r, D + 2, false), r, 'una pestaña vieja no cambia nada');
assert.deepEqual(validar(JSON.parse(JSON.stringify(r)), D + 4), r, 'lo que produce registrar siempre es válido');
const cinco: Registro = { v: 1, racha: 5, mejor: 5, jugados: 5, aciertos: 5, hist: [0, 1, 2, 3, 4].map((i) => ({ f: fechaDe(D + i), ok: 1 as const })) };
const ult = D + 4;
assert.deepEqual([ult, ult + 1, ult + 2].map((h) => rachaVigente(cinco, h)), [5, 5, 0]);
assert.equal(llegariaA(cinco, ult), null);
assert.equal(llegariaA(cinco, ult + 1), 6);
assert.equal(llegariaA(cinco, ult + 2), null);
assert.equal(rachaVigente(null, ult), 0);
assert.equal(llegariaA(null, ult), null);
assert.equal(textoRacha(0), '0 días');
assert.equal(textoRacha(1), '1 día');
assert.equal(textoRacha(3), '3 días');
// Cualquier secuencia de jugadas (con saltos, repeticiones y 40 días) deja siempre un registro que pasa validar.
let reg: Registro | null = null;
let d = D;
for (let i = 0; i < 400; i++) {
  d += i % 7 === 3 ? 3 : i % 5 === 0 ? 0 : 1;
  reg = registrar(reg, d, i % 3 !== 0);
  assert.deepEqual(validar(JSON.parse(JSON.stringify(reg)), d), reg, `secuencia, paso ${i}`);
}

// ---------- CA-6: últimos 7 días ----------
const base = dia('2026-10-15');
const seis: Registro = {
  v: 1, racha: 1, mejor: 1, jugados: 3, aciertos: 2,
  hist: [{ f: fechaDe(base - 6), ok: 1 }, { f: fechaDe(base - 4), ok: 0 }, { f: fechaDe(base), ok: 1 }],
};
assert.deepEqual(validar(seis, base), seis);
const u7 = ultimos7(seis, base);
assert.deepEqual(u7.map((x) => textoEstado(x.estado)), ['✓ acertó', '– no jugó', '✗ falló', '– no jugó', '– no jugó', '– no jugó', '✓ acertó']);
assert.deepEqual(u7.map((x) => x.dia), [-6, -5, -4, -3, -2, -1, 0].map((k) => base + k));
assert.deepEqual(yaJugado(seis, base), { ok: true });
assert.deepEqual(yaJugado(seis, base - 4), { ok: false });
assert.equal(yaJugado(seis, base - 1), null);
assert.equal(yaJugado(null, base), null);
assert.deepEqual(ultimos7(null, base).map((x) => x.estado), Array(7).fill('nada'));

// ---------- CA-7: registros hostiles (todo o nada, sin excepción) ----------
const hist = (n: number, fin = HOY, ok: 0 | 1 = 1) => Array.from({ length: n }, (_, i) => ({ f: fechaDe(fin - n + 1 + i), ok }));
const bueno = (c: Record<string, unknown> = {}) => ({ v: 1, racha: 3, mejor: 3, jugados: 3, aciertos: 3, hist: hist(3), ...c });
const valido = (x: unknown) => desdeTexto(typeof x === 'string' ? x : JSON.stringify(x), HOY);
assert.deepEqual(valido(bueno()), bueno());
const malos: [string, unknown][] = [
  ['texto que no es JSON', 'esto no es json {'],
  ['null', 'null'], ['[]', '[]'], ['"x"', '"x"'], ['{}', '{}'], ['texto vacío', ''],
  ['versión 2', bueno({ v: 2 })],
  ['racha -1', bueno({ racha: -1 })],
  ['racha 1,5', bueno({ racha: 1.5 })],
  ['racha "3"', bueno({ racha: '3' })],
  ['racha 1e9', bueno({ racha: 1e9, mejor: 1e9, jugados: 1e9 })],
  ['racha mayor que hoy', bueno({ racha: HOY + 1, mejor: HOY + 1, jugados: HOY + 1 })],
  ['mejor menor que la racha', bueno({ mejor: 2 })],
  ['aciertos mayores que jugados', bueno({ aciertos: 4 })],
  ['jugados menores que la mejor racha', bueno({ jugados: 2, mejor: 3 })],
  ['historial de 8 entradas', bueno({ racha: 8, mejor: 8, jugados: 8, aciertos: 8, hist: hist(8) })],
  ['fecha 2026-02-30', bueno({ hist: [{ f: '2026-02-28', ok: 1 }, { f: '2026-02-30', ok: 1 }, { f: fechaDe(HOY), ok: 1 }] })],
  ['fecha posterior a hoy', bueno({ hist: [...hist(2, HOY - 1), { f: '2026-10-16', ok: 1 }] })],
  ['historial desordenado', bueno({ hist: [hist(3)[1], hist(3)[0], hist(3)[2]] })],
  ['fechas repetidas', bueno({ racha: 1, mejor: 1, hist: [hist(1)[0], hist(1)[0], hist(1)[0]] })],
  ['acierto 2', bueno({ hist: [{ f: fechaDe(HOY - 2), ok: 1 }, { f: fechaDe(HOY - 1), ok: 2 }, { f: fechaDe(HOY), ok: 1 }] })],
  ['acierto "1"', bueno({ hist: [{ f: fechaDe(HOY - 2), ok: '1' }, { f: fechaDe(HOY - 1), ok: 1 }, { f: fechaDe(HOY), ok: 1 }] })],
  ['fecha con marcado', bueno({ hist: [{ f: '<img src=x onerror=alert(1)>', ok: 1 }, { f: fechaDe(HOY - 1), ok: 1 }, { f: fechaDe(HOY), ok: 1 }] })],
  ['fecha que no es texto', bueno({ hist: [{ f: 20739, ok: 1 }, { f: fechaDe(HOY - 1), ok: 1 }, { f: fechaDe(HOY), ok: 1 }] })],
  ['entrada que no es objeto', bueno({ hist: [null, hist(3)[1], hist(3)[2]] })],
  ['historial que no es arreglo', bueno({ hist: { length: 3 } })],
  ['racha 5 con historial de 3 días no consecutivos', bueno({ racha: 5, mejor: 5, jugados: 5, aciertos: 5, hist: [-9, -5, 0].map((k) => ({ f: fechaDe(HOY + k), ok: 1 })) })],
  ['racha 3 con historial de 3 días no consecutivos', bueno({ hist: [-9, -5, 0].map((k) => ({ f: fechaDe(HOY + k), ok: 1 })) })],
  ['racha menor que la serie consecutiva', bueno({ racha: 2, mejor: 3 })],
  ['jugados 3 con historial de 2 entradas', bueno({ hist: hist(2) })],
  ['jugados 1 con historial de 2 entradas', bueno({ racha: 1, mejor: 1, jugados: 1, aciertos: 1, hist: hist(2) })],
  ['4.097 caracteres', JSON.stringify(bueno()) + ' '.repeat(4097 - JSON.stringify(bueno()).length)],
];
for (const [nombre, x] of malos) {
  let res: Registro | null | undefined;
  assert.doesNotThrow(() => { res = valido(x); }, nombre);
  assert.equal(res, null, `debía descartarse: ${nombre}`);
}
const justo = JSON.stringify(bueno()) + ' '.repeat(4096 - JSON.stringify(bueno()).length);
assert.equal(justo.length, 4096);
assert.deepEqual(valido(justo), bueno(), '4.096 caracteres se aceptan');
assert.equal(desdeTexto(null, HOY), null);
// Aceptados: 7 consecutivos con racha 7 y el mismo historial con racha 12 (mejor y jugados de 12 o más).
const siete = { v: 1, racha: 7, mejor: 7, jugados: 7, aciertos: 4, hist: hist(7).map((e, i) => ({ ...e, ok: (i % 2) as 0 | 1 })) };
assert.deepEqual(valido(siete), siete);
const doce = { ...siete, racha: 12, mejor: 12, jugados: 12, aciertos: 9 };
assert.deepEqual(valido(doce), doce);
assert.equal(valido({ ...doce, racha: 6 }), null, 'con 7 consecutivos la racha no puede ser menor que 7');
// Con 7 entradas y un hueco al inicio (6 consecutivas al final), la racha tiene que ser exactamente 6
const hueco = { v: 1, racha: 2, mejor: 9, jugados: 12, aciertos: 8, hist: [-7, -5, -4, -3, -2, -1, 0].map((k) => ({ f: fechaDe(HOY + k), ok: 1 as const })) };
assert.equal(valido(hueco), null, 'racha 2 pero hay 6 consecutivos al final');
assert.deepEqual(valido({ ...hueco, racha: 6 }), { ...hueco, racha: 6 });
// __proto__: no contamina Object.prototype ni entra en el estado
const proto = valido('{"__proto__":{"contaminado":true},"constructor":{"x":1},"v":1,"racha":1,"mejor":1,"jugados":1,"aciertos":1,"hist":[{"f":"2026-10-15","ok":1,"__proto__":{"y":1}}]}');
assert.equal(({} as Record<string, unknown>).contaminado, undefined, 'Object.prototype intacto');
assert.equal((proto as unknown as Record<string, unknown>).contaminado, undefined);
assert.ok(proto, 'el registro válido con claves de más se acepta, sin esas claves');
assert.deepEqual(Object.keys(proto!), ['v', 'racha', 'mejor', 'jugados', 'aciertos', 'hist']);
assert.deepEqual(Object.keys(proto!.hist[0]), ['f', 'ok']);
assert.equal(Object.getPrototypeOf(proto), Object.prototype);
// validar devuelve un objeto nuevo, no el que recibió
const entrada = bueno();
const salida = validar(entrada, HOY);
assert.notEqual(salida, entrada);
assert.notEqual(salida!.hist, entrada.hist);

// ---------- CA-9: búsqueda de texto sobre el código nuevo ----------
const raiz = fileURLToPath(new URL('../src/retos/dia/', import.meta.url));
const archivos = readdirSync(raiz).filter((f) => /\.(ts|css)$/.test(f));
for (const esperado of ['puro.ts', 'almacen.ts', 'ui.ts', 'dia.css']) assert.ok(archivos.includes(esperado), `falta src/retos/dia/${esperado}`);
const sinMarcado = ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval('];
const sinRed = ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'sessionStorage', 'indexedDB', 'document.cookie'];
for (const f of archivos) {
  const texto = readFileSync(join(raiz, f), 'utf8');
  for (const x of [...sinMarcado, ...sinRed]) assert.ok(!texto.includes(x), `src/retos/dia/${f} usa ${x}`);
  assert.equal(texto.includes('localStorage'), f === 'almacen.ts', `localStorage debe aparecer solo en almacen.ts (${f})`);
  if (f === 'puro.ts') for (const x of ['Date.now', 'Math.random', 'document', 'window']) assert.ok(!texto.includes(x), `puro.ts usa ${x}`);
}
// Ajuste post-revisión UX: el historial lista solo los días jugados y, al responder, el resultado se muestra sin desplazarse.
{
  const ui = readFileSync(join(raiz, 'ui.ts'), 'utf8');
  assert.ok(ui.includes(".filter((x) => x.estado !== 'nada')"), 'ui.ts: solo los días jugados');
  assert.ok(ui.includes('res.scrollIntoView()'), 'ui.ts: el resultado queda a la vista');
}
// RF-18: ni dependencias nuevas ni petición a /api/
for (const f of archivos) assert.ok(!readFileSync(join(raiz, f), 'utf8').includes('/api/'), `src/retos/dia/${f} nombra /api/`);

console.log(`reto-del-dia: fecha de Guatemala, alternancia (178 y 520 por vuelta), dispersión (${(100 * pTema).toFixed(1)} % mismo tema, ${(100 * pSel).toFixed(1)} % misma selección),`
  + ` posición de la correcta (${pos.pregunta.map((n) => (n / 20).toFixed(1)).join('/')} y ${pos.futbolista.map((n) => (n / 20).toFixed(1)).join('/')} %), racha, 7 días,`
  + ` ${malos.length} registros hostiles descartados y ${archivos.length} archivos sin marcado, red ni almacenamiento fuera de almacen.ts.`);
