// Prueba de lo puro de "compartir desde Retos" (src/retos/compartir.ts): textos (CA-1 a CA-4), enlace (CA-5),
// regla del botón en línea y que el resultado no filtre el pase (CA-6) y revisión estática de A03.
//   npx tsx scripts/compartir.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { datosEnLinea, enlaceWhatsApp, textoResultado, urlResultado, type DatosResultado } from '../src/retos/compartir';
import type { PartidaPublica } from '../src/retos/online/protocolo';

const t = (d: DatosResultado) => textoResultado(d);

// CA-1: en línea, primera persona
const dd: DatosResultado = { categoria: 'dedonde', puntos: [520, 340], ganador: 0, yo: 0 };
assert.equal(t(dd), 'Gané un duelo de ¿De dónde es? en Chamusqueros (520 a 340). ¿Te animás?');
assert.equal(t({ ...dd, yo: 1 }), 'Perdí un duelo de ¿De dónde es? en Chamusqueros (340 a 520). ¿Te animás?');

// CA-2: empate y Reto completo
assert.equal(t({ categoria: 'preguntas', puntos: [3, 3], ganador: null, yo: 0 }), 'Empaté un duelo de preguntas de fútbol en Chamusqueros (3 a 3). ¿Te animás?');
assert.equal(t({ categoria: 'completo', puntos: [2, 1], ganador: 0, yo: 0 }), 'Gané un Reto completo en Chamusqueros (2 a 1). ¿Te animás?');
assert.equal(t({ categoria: 'club', puntos: [1, 2], ganador: 1, yo: 1 }), 'Gané un duelo de ping pong de club en Chamusqueros (2 a 1). ¿Te animás?');

// CA-3: mismo celular
assert.equal(t({ categoria: 'pais', puntos: [4, 6], ganador: 1 }), 'Jugamos un duelo de ping pong de país en Chamusqueros: terminó 6 a 4. ¿Te animás?');
assert.equal(t({ categoria: 'pais', puntos: [2, 2], ganador: null }), 'Jugamos un duelo de ping pong de país en Chamusqueros: empatamos 2 a 2. ¿Te animás?');

// CA-4: números normalizados y largo
const cuenta = (p: unknown[]) => t({ categoria: 'dedonde', puntos: p as [number, number], ganador: 0, yo: 0 });
assert.match(cuenta([NaN, -5])!, /\(0 a 0\)/);
assert.match(cuenta([1e9, '7'])!, /\(99999 a 7\)/);
assert.match(cuenta([undefined, 3.9])!, /\(0 a 3\)/);
for (const p of [[NaN, -5], [1e9, '7'], [undefined, 3.9], [99999, 99999], [Infinity, -Infinity]]) assert.ok(cuenta(p)!.length <= 160);
let mayor = 0;
for (const categoria of ['pais', 'club', 'preguntas', 'dedonde', 'completo']) {
  for (const ganador of [0, 1, null] as const) {
    for (const yo of [undefined, 0, 1] as const) {
      const s = t({ categoria, puntos: [99999, 99999], ganador, yo })!;
      mayor = Math.max(mayor, s.length);
      assert.ok(s.length <= 160, s);
      assert.ok(!/sala=|ABCDE2|http/i.test(s), s);
    }
  }
}
assert.ok(mayor > 40);

// Categoría fuera del diccionario (incluidas claves heredadas del prototipo): sin texto
for (const raro of ['otro', '', 'constructor', '__proto__', 'toString']) assert.equal(t({ categoria: raro, puntos: [1, 0], ganador: 0 }), null, raro);

// CA-5: enlace del resultado
const SITIO = 'https://chamusqueros.vercel.app/?ref=reto';
assert.equal(urlResultado('https://chamusqueros.vercel.app/', undefined), SITIO);
assert.equal(urlResultado('', 'https://chamusqueros.vercel.app'), SITIO);
assert.equal(urlResultado(undefined, 'https://chamusqueros.vercel.app'), SITIO);
assert.equal(urlResultado('https://chamusqueros.vercel.app/camino?sala=ABCDE2#x', ''), SITIO, 'solo el origen');
assert.equal(urlResultado('javascript:alert(1)', 'https://chamusqueros.vercel.app'), SITIO);
assert.equal(urlResultado('', ''), SITIO);
assert.equal(urlResultado('javascript:alert(1)', 'file:///etc/passwd'), SITIO);
assert.equal(urlResultado('', 'https://otro.example/?sala=ABCDE2'), 'https://otro.example/?ref=reto');
assert.equal(urlResultado('http://localhost:5173/', undefined), 'http://localhost:5173/?ref=reto');
assert.ok(!urlResultado('https://x.example/?sala=ABCDE2', '').includes('sala='));

// WhatsApp
const mensaje = 'Te reto: https://chamusqueros.vercel.app/?sala=ABCDE2 ¿sí? & más';
const wa = enlaceWhatsApp(mensaje);
assert.ok(wa.startsWith('https://wa.me/?text='));
assert.equal(new URL(wa).searchParams.get('text'), mensaje);
assert.equal(wa.slice('https://wa.me/?text='.length), encodeURIComponent(mensaje));

// CA-6: regla del botón en línea
const base = (o: Partial<PartidaPublica> = {}): PartidaPublica => ({
  num: 1, categorias: ['dedonde'], actual: 0,
  resultados: [{ categoria: 'dedonde', ganador: 0, puntos: [520, 340], motivo: '' }],
  juego: null, entreDeadline: null,
  final: { ganador: 0, motivo: '', abandono: null, rankingGanado: [0, 0], sinPuntos: [null, null] },
  ...o,
});
const d = datosEnLinea(base(), 0);
assert.ok(d);
const texto = t(d!)!;
assert.equal(texto, 'Gané un duelo de ¿De dónde es? en Chamusqueros (520 a 340). ¿Te animás?');
assert.equal(t(datosEnLinea(base(), 1)!), 'Perdí un duelo de ¿De dónde es? en Chamusqueros (340 a 520). ¿Te animás?');
// La sala "ABCDE2" sigue abierta con revancha pendiente: nada del texto ni del enlace la menciona.
const url = urlResultado('https://chamusqueros.vercel.app/', 'https://chamusqueros.vercel.app');
for (const s of [texto, url, `${texto} ${url}`, enlaceWhatsApp(`${texto} ${url}`)]) assert.ok(!s.includes('sala=') && !s.includes('ABCDE2'), s);
const fin = base().final!;
assert.equal(datosEnLinea(base({ final: { ...fin, abandono: 0 } }), 0), null);
assert.equal(datosEnLinea(base({ final: { ...fin, abandono: 1 } }), 0), null);
assert.equal(datosEnLinea(base({ final: null }), 0), null);
assert.equal(datosEnLinea(base({ resultados: [] }), 0), null);
assert.equal(datosEnLinea(null, 0), null);
assert.equal(datosEnLinea(undefined, 1), null);
assert.equal(datosEnLinea(base({ categorias: ['otra' as never] }), 0), null);
assert.equal(datosEnLinea(base({ categorias: [] }), 0), null);
// empate en línea
assert.equal(t(datosEnLinea(base({ final: { ...fin, ganador: null }, resultados: [{ categoria: 'dedonde', ganador: null, puntos: [3, 3], motivo: '' }] }), 1)!),
  'Empaté un duelo de ¿De dónde es? en Chamusqueros (3 a 3). ¿Te animás?');

// Reto completo: marcador = categorías ganadas; una categoría empatada no suma a nadie
const rc = (gs: (0 | 1 | null)[]) => base({
  categorias: ['pais', 'club', 'preguntas'],
  resultados: (['pais', 'club', 'preguntas'] as const).map((categoria, i) => ({ categoria, ganador: gs[i], puntos: [9, 9] as [number, number], motivo: '' })),
});
assert.deepEqual(datosEnLinea(rc([0, 1, 0]), 0)!.puntos, [2, 1]);
assert.deepEqual(datosEnLinea(rc([0, null, 1]), 0)!.puntos, [1, 1]);
assert.equal(datosEnLinea(rc([0, 1, 0]), 0)!.categoria, 'completo');
assert.equal(t(datosEnLinea(rc([0, 1, 0]), 1)!), 'Perdí un Reto completo en Chamusqueros (1 a 2). ¿Te animás?');

// A03 / A01 / RF-13: revisión estática de compartir.ts
const fuente = readFileSync(fileURLToPath(new URL('../src/retos/compartir.ts', import.meta.url)), 'utf8');
for (const x of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'location.search', 'location.href', 'location.hash', 'localStorage', 'sessionStorage', 'document.cookie', 'indexedDB', 'fetch(', 'console.', 'esc(', 'sala=']) {
  assert.ok(!fuente.includes(x), `compartir.ts no debe usar ${x}`);
}
console.log('compartir: textos, números, enlace, regla en línea, sin filtrar el pase y revisión estática.');
