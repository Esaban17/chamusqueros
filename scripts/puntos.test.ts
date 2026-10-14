// Prueba de la fórmula de puntos de ranking (RF-24, CA-10, CA-11). Pura, sin red:
//   npx tsx scripts/puntos.test.ts
import assert from 'node:assert/strict';
import { cumpleMinimo, puntosRanking, rendimientoCategoria, tipoJuego, type EntradaPuntos } from '../src/retos/online/puntos';

const base: EntradaPuntos = { resultado: 'V', rendimiento: 0, cumpleMinimo: true, previasRival24h: 0, sumado24h: 0 };
const p = (e: Partial<EntradaPuntos>) => puntosRanking({ ...base, ...e });

// Rendimiento por categoría con su tope.
assert.equal(rendimientoCategoria('pais', 6), 30);
assert.equal(rendimientoCategoria('club', 10), 50);
assert.equal(rendimientoCategoria('club', 40), 50, 'tope del ping pong');
assert.equal(rendimientoCategoria('preguntas', 5), 25);
assert.equal(rendimientoCategoria('preguntas', 99), 50);
assert.equal(rendimientoCategoria('dedonde', 509), 50);
assert.equal(rendimientoCategoria('dedonde', 9999), 60, 'tope de ¿De dónde es?');
assert.equal(rendimientoCategoria('dedonde', -5), 0);
assert.equal(tipoJuego('pais'), 'ping');
assert.equal(tipoJuego('club'), 'ping');
assert.equal(tipoJuego('dedonde'), 'dedonde');

// CA-10: ping pong entre A (6 futbolistas aceptados, gana) y B (5, pierde).
const A = (previas: number) => p({ resultado: 'V', rendimiento: rendimientoCategoria('pais', 6), previasRival24h: previas }).puntos;
const B = (previas: number) => p({ resultado: 'D', rendimiento: rendimientoCategoria('pais', 5), previasRival24h: previas }).puntos;
assert.deepEqual([A(0), B(0)], [130, 35], '1.ª');
assert.deepEqual([A(1), B(1)], [65, 17], '2.ª');
assert.deepEqual([A(2), B(2)], [32, 8], '3.ª');
assert.deepEqual([A(3), B(3)], [0, 0], '4.ª');
assert.deepEqual([A(9), B(9)], [0, 0], 'desde la 4.ª siempre 0');
assert.equal(p({ previasRival24h: 3 }).sinPuntos, 'repetida');
assert.equal(p({ previasRival24h: 2 }).sinPuntos, null);

// Resultado base: victoria 100, empate 30, derrota 10.
assert.deepEqual([p({ resultado: 'V' }).puntos, p({ resultado: 'E' }).puntos, p({ resultado: 'D' }).puntos], [100, 30, 10]);

// Mínimo de jugadas: con 3 futbolistas aceptados nadie suma; con 4, sí (CA-10).
assert.equal(cumpleMinimo({ ping: 3, preguntas: null, dedonde: null }), false);
assert.equal(cumpleMinimo({ ping: 4, preguntas: null, dedonde: null }), true);
assert.equal(cumpleMinimo({ ping: null, preguntas: 2, dedonde: null }), false);
assert.equal(cumpleMinimo({ ping: null, preguntas: 3, dedonde: null }), true);
assert.equal(cumpleMinimo({ ping: null, preguntas: null, dedonde: 2 }), false);
assert.equal(cumpleMinimo({ ping: null, preguntas: null, dedonde: 3 }), true);
assert.equal(cumpleMinimo({ ping: 9, preguntas: 1, dedonde: null }), false, 'el Reto completo exige el mínimo de cada tipo jugado');
assert.deepEqual(p({ cumpleMinimo: false, rendimiento: 30 }), { puntos: 0, sinPuntos: 'corta' });
assert.deepEqual(p({ cumpleMinimo: false, resultado: 'A' }), { puntos: 0, sinPuntos: 'corta' }, 'ni por abandono del rival');

// Abandono propio: 0 en total, sin motivo de "no suma" (la pantalla dice que abandonó).
assert.deepEqual(p({ resultado: 'A', rendimiento: 50 }), { puntos: 0, sinPuntos: null });

// Tope diario: con 600 ya sumados, 0 y "tope"; con 590, solo los 10 que faltan; con 599 de margen se recorta.
assert.deepEqual(p({ sumado24h: 600 }), { puntos: 0, sinPuntos: 'tope' });
assert.deepEqual(p({ sumado24h: 700 }), { puntos: 0, sinPuntos: 'tope' });
assert.deepEqual(p({ sumado24h: 590, rendimiento: 30 }), { puntos: 10, sinPuntos: null });
assert.deepEqual(p({ sumado24h: 400, rendimiento: 30 }), { puntos: 130, sinPuntos: null });
// El factor va antes que el tope: una 4.ª partida con el tope lleno sigue siendo "repetida".
assert.equal(p({ previasRival24h: 3, sumado24h: 600 }).sinPuntos, 'repetida');

// Reto completo: se suman los rendimientos de cada categoría, cada una con su tope.
const completo = rendimientoCategoria('pais', 12) + rendimientoCategoria('club', 3) + rendimientoCategoria('preguntas', 4);
assert.equal(completo, 50 + 15 + 20);
assert.equal(p({ rendimiento: completo }).puntos, 185);
// Redondeo hacia abajo con el factor.
assert.equal(p({ resultado: 'E', rendimiento: 5, previasRival24h: 1 }).puntos, 17, '35 × 0,5');
assert.equal(p({ resultado: 'D', rendimiento: 25, previasRival24h: 2 }).puntos, 8, '35 × 0,25');
console.log('puntos: CA-10 (130/35, 65/17, 32/8, 0/0), mínimos, abandono, tope diario y Reto completo.');
