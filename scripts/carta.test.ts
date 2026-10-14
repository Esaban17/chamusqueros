// Prueba de la carta FC clásica realista (specs/carta-fc-clasica): atributos, saneo y escape, SVG, nombre y contraste.
// Sin navegador (CA-15): importa solo el módulo puro y el avatar.
//   npx tsx scripts/carta.test.ts            (CONTRASTE=1 imprime la tabla de contrastes mínimos)
import assert from 'node:assert/strict';
import { ALL_CLUBS } from '../src/engine/clubs';
import { COUNTRIES } from '../src/engine/countries';
import { avatarSVG } from '../src/ui/avatar';
import {
  CAMPO, ESCUDO_PATH, ESPERADA, ESTILOS, PESOS, PORTERO, SILUETA, anchoNombre, atributos, cartaSVG, nombreAjustado, quitarFondoAvatar, textosCarta,
  type DatosCarta,
} from '../src/ui/carta-svg';
import type { CardTier } from '../src/engine/engine';

const POS = ['POR', 'DEF', 'MED', 'DEL'] as const;
const TIERS = Object.keys(ESTILOS) as CardTier[];
const valores = (r: ReturnType<typeof atributos>) => r!.map((a) => a.valor);

// ---------- Atributos ----------

// CA-01 valor dorado (la carta de muestra de la landing).
const oro = atributos({ pos: 'DEL', media: 88, apps: 512, goles: 231, asist: 94 })!;
assert.deepEqual(valores(oro), [90, 94, 85, 93, 46, 84]);
assert.deepEqual(oro.map((a) => a.etiqueta), ['RIT', 'TIR', 'PAS', 'REG', 'DEF', 'FÍS']);

// CA-02 rango: rejilla de más de 5.000 combinaciones, con goles mayores que partidos.
let n = 0;
for (const pos of POS) for (const media of [1, 2, 25, 30, 40, 50, 60, 75, 85, 90, 95, 98, 99]) for (const apps of [0, 1, 10, 59, 60, 400, 2000]) for (const g of [0, 1, 50, 400, 2000]) for (const a of [0, 7, 2000]) {
  const r = atributos({ pos, media, apps, goles: g, asist: a })!;
  n++;
  assert.equal(r.length, 6);
  for (const x of r) assert.ok(Number.isInteger(x.valor) && x.valor >= 25 && x.valor <= 99, `${pos} ${media} ${apps} ${g} ${a}: ${x.valor}`);
}
assert.ok(n >= 5000, `rejilla de ${n}`);
// Entradas hostiles: no lanza; posición o media inválida da null; cifras inválidas se tratan como faltantes.
const hostiles = [NaN, Infinity, -Infinity, -1, 2.5, undefined, null, '88', '', {}, [], 1e9, true];
for (const h of hostiles) {
  assert.equal(atributos({ pos: h, media: 80, apps: 1, goles: 1, asist: 1 }), null);
  assert.equal(atributos({ pos: 'DEL', media: h, apps: 1, goles: 1, asist: 1 }), null);
  const r = atributos({ pos: 'MED', media: 70, apps: h, goles: h, asist: h });
  assert.deepEqual(valores(r), valores(atributos({ pos: 'MED', media: 70, apps: 0, goles: 0, asist: 0 })), 'cifras inválidas = faltantes');
}
for (const m of [0, 100, 3.5, NaN]) assert.equal(atributos({ pos: 'DEL', media: m, apps: 1, goles: 1, asist: 1 }), null);
assert.equal(atributos({ pos: 'X', media: 80, apps: 1, goles: 1, asist: 1 }), null);
assert.equal(atributos({ pos: 'DEL', media: 80, apps: 100, goles: 'x', asist: -4 })!.length, 6);

// CA-03 determinismo, aunque se cambie el azar y la fecha.
const base = { pos: 'MED', media: 77, apps: 321, goles: 40, asist: 90 };
const ref = JSON.stringify(atributos(base));
const rnd = Math.random, ahora = Date.now;
for (let i = 0; i < 1000; i++) {
  Math.random = () => (i % 2 ? 0.01 : 0.99);
  Date.now = () => i * 1e9;
  assert.equal(JSON.stringify(atributos(base)), ref);
}
Math.random = rnd;
Date.now = ahora;

// CA-04 cercanía a la media: promedio ponderado.
const ponderado = (pos: (typeof POS)[number], r: NonNullable<ReturnType<typeof atributos>>) => r.reduce((s, a, i) => s + a.valor * PESOS[pos][i], 0);
let peor = 0, peorExtremo = 0;
for (const pos of POS) {
  assert.ok(Math.abs(PESOS[pos].reduce((s, v) => s + v, 0) - 1) < 1e-9, 'los pesos suman 1');
  for (let media = 50; media <= 90; media++) {
    const e = pos === 'POR' ? { g: 0, a: 0 } : ESPERADA[pos];
    peor = Math.max(peor, Math.abs(ponderado(pos, atributos({ pos, media, apps: 400, goles: Math.round(e.g * 400), asist: Math.round(e.a * 400) })!) - media));
    for (const [g, a] of [[0, 0], [600, 400], [0, 400], [600, 0]]) peorExtremo = Math.max(peorExtremo, Math.abs(ponderado(pos, atributos({ pos, media, apps: 400, goles: g, asist: a })!) - media));
  }
}
assert.ok(peor <= 1, `con tasas esperadas: ${peor}`);
assert.ok(peorExtremo <= 5, `con tasas extremas: ${peorExtremo}`);

// CA-05 casos por posición (tasas esperadas, media 75).
const caso = (pos: (typeof POS)[number]) => {
  const e = pos === 'POR' ? { g: 0, a: 0 } : ESPERADA[pos];
  return atributos({ pos, media: 75, apps: 400, goles: Math.round(e.g * 400), asist: Math.round(e.a * 400) })!;
};
const orden = (r: NonNullable<ReturnType<typeof atributos>>) => [...r].sort((a, b) => b.valor - a.valor).map((a) => a.etiqueta);
assert.equal(orden(caso('DEL'))[0], 'TIR');
assert.equal(orden(caso('DEL')).at(-1), 'DEF');
assert.deepEqual(orden(caso('MED')).slice(0, 2).sort(), ['PAS', 'REG']);
assert.equal(orden(caso('MED')).at(-1), 'DEF');
assert.equal(orden(caso('DEF'))[0], 'DEF');
assert.equal(orden(caso('DEF')).at(-1), 'TIR');
assert.equal(orden(caso('POR'))[0], 'REF');
assert.equal(orden(caso('POR')).at(-1), 'VEL');
assert.deepEqual(caso('POR').map((a) => a.etiqueta), ['EST', 'MAN', 'SAQ', 'REF', 'VEL', 'COL']);

// CA-06 monotonía.
for (const pos of POS) {
  for (let m = 1; m < 99; m++) {
    const a = valores(atributos({ pos, media: m, apps: 200, goles: 50, asist: 30 })), b = valores(atributos({ pos, media: m + 1, apps: 200, goles: 50, asist: 30 }));
    a.forEach((v, i) => assert.ok(b[i] >= v));
  }
  for (let g = 0; g < 600; g += 10) {
    const a = atributos({ pos, media: 70, apps: 400, goles: g, asist: g })!, b = atributos({ pos, media: 70, apps: 400, goles: g + 10, asist: g + 10 })!;
    assert.ok(b[1].valor >= a[1].valor, 'TIR');
    assert.ok(b[2].valor >= a[2].valor, 'PAS');
  }
}

// CA-07 muestras chicas: con 10 partidos y 10 goles el ajuste de TIR es 1 o menos.
for (const pos of ['DEL', 'MED', 'DEF'] as const) {
  const sin = atributos({ pos, media: 70, apps: 10, goles: 0, asist: 0 })!;
  const todo = atributos({ pos, media: 70, apps: 10, goles: 10, asist: 0 })!;
  const esperado = atributos({ pos, media: 70, apps: 0, goles: 0, asist: 0 })!;
  assert.ok(todo[1].valor - esperado[1].valor <= 1, `${pos} ajuste de TIR ${todo[1].valor - esperado[1].valor}`);
  assert.ok(esperado[1].valor - sin[1].valor <= 0 || sin[1].valor >= esperado[1].valor - 1);
}

// ---------- SVG ----------

const DATOS: DatosCarta = {
  nombre: 'Chepe Chamusquero', pos: 'DEL', media: 88, apps: 512, goles: 231, asist: 94, titulos: 6,
  avatar: { a: { skin: 2, hair: 1, hairColor: 0, beard: 0, extra: 0 }, dorsal: 9, kit: ['#4997d0', '#ffffff'] },
  pais: { bandera: 'https://flagcdn.com/w80/gt.png', kit: ['#4997d0', '#ffffff'] },
  club: { short: 'MUN', colores: ['#d71920', '#ffffff'], escudo: '/escudos/municipal.png' },
};

/** Etiquetas bien formadas: cada apertura se cierra y no quedan sin cerrar (el SVG se arma con strings). */
function balanceado(svg: string) {
  const pila: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)) {
    const [, cierra, nombre, , auto] = m;
    if (auto) continue;
    if (cierra) assert.equal(pila.pop(), nombre, `etiqueta ${nombre} sin abrir`);
    else pila.push(nombre);
  }
  assert.deepEqual(pila, [], 'etiquetas sin cerrar');
}
const ids = (svg: string) => [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);

// CA-09 identificadores únicos y referencias que resuelven.
const a1 = cartaSVG(DATOS, 'oro'), a2 = cartaSVG(DATOS, 'oro');
for (const svg of [a1, a2]) {
  const def = ids(svg);
  assert.equal(new Set(def).size, def.length, 'id repetido dentro de una carta');
  for (const m of svg.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)) assert.ok(def.includes(m[1] ?? m[2]), `referencia rota ${m[1] ?? m[2]}`);
  balanceado(svg);
}
assert.equal(ids(a1).filter((x) => ids(a2).includes(x)).length, 0, 'dos cartas comparten id');
assert.ok(cartaSVG(DATOS, 'oro', { id: 'mia' }).includes('id="mia-rim"'));
assert.ok(!cartaSVG(DATOS, 'oro', { id: '"><script>' }).includes('<script>'), 'id propio inválido');

// CA-10 escape.
const malo = cartaSVG({ ...DATOS, nombre: '<img src=x onerror=alert(1)> "&\'' }, 'plata');
assert.ok(!malo.includes('<img'));
assert.ok(malo.includes('&lt;IMG SRC=X ONERROR=ALERT(1)&gt; &quot;&amp;&#39;'), 'texto escapado');
balanceado(malo);
for (const nombre of ['A\u0000B\u0001C', 'GOL ⚽ 🔥 ñandú', 'a‮b﻿c', 'x\uD800y']) {
  const svg = cartaSVG({ ...DATOS, nombre }, 'oro');
  assert.ok(!/[\u0000-\u0008\u000B\u000C\u000E-\u001F‮﻿]/.test(svg) && !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(svg), 'caracteres inválidos');
  balanceado(svg);
}
// Un club con iniciales maliciosas tampoco rompe el marcado.
assert.ok(!cartaSVG({ ...DATOS, club: { short: '<b>', colores: ['#000000', '#ffffff'], escudo: null } }, 'oro').includes('<b>'));

// CA-11 validación de datos del servidor.
const roto = cartaSVG({
  ...DATOS, pos: 'X', media: 3.5, apps: NaN, goles: -1, asist: '5', titulos: 1e9,
  avatar: { a: { skin: 99, hair: -3, hairColor: 'x', beard: 1.5, extra: NaN }, dorsal: 5000, kit: ['red;"onload="x', 3] },
  pais: { bandera: 'javascript:alert(1)', kit: 'x' }, club: { short: 'AB', colores: ['url(#x)', '#12345'], escudo: 'https://evil.example/x.png' },
}, 'oro');
balanceado(roto);
assert.ok(!/javascript|evil|onload|url\(#x\)|#12345|\b5000\b|NaN/.test(roto), 'valor sin validar en la salida');
assert.ok(roto.includes('>—<'), 'faltante como —');
for (const m of [0, 100, 3.5, NaN]) assert.ok(cartaSVG({ ...DATOS, media: m }, 'oro').includes('>—<'));
assert.ok(textosCarta({ ...DATOS, pos: 'X', media: 3.5 }, 'oro').filter((t) => t.partes[0].texto === '—').length >= 8, 'media, posición y seis atributos en —');
const imagenes = (svg: string) => [...svg.matchAll(/<image[^>]*>/g)].map((m) => m[0]);
assert.ok(imagenes(roto).length === 0, 'sin imágenes externas inválidas');
assert.ok(imagenes(cartaSVG(DATOS, 'oro')).some((i) => i.includes('https://flagcdn.com/w80/gt.png')) && imagenes(cartaSVG(DATOS, 'oro')).some((i) => i.includes('/escudos/municipal.png')));
assert.ok(!cartaSVG({ ...DATOS, club: null }, 'oro').includes('carta-escudo'), 'sin club no hay escudo');

// CA-12 modos y efectos.
const salidas = new Set<string>();
for (const t of TIERS) for (const modo of ['html', 'arte'] as const) for (const efectos of ['completo', 'simple'] as const) {
  const svg = cartaSVG(DATOS, t, { modo, efectos, id: 'x' });
  salidas.add(svg);
  balanceado(svg);
  if (modo === 'arte') for (const prohibido of ['<text', '<image', '<animate', 'class="carta-sweep"']) assert.ok(!svg.includes(prohibido), `${t} arte con ${prohibido}`);
  else assert.ok(svg.includes('class="carta-sweep"') && svg.includes('role="img"') && svg.includes('aria-label='), 'html con brillo y alt');
  if (efectos === 'simple') for (const prohibido of ['feSpecularLighting', 'feTurbulence', 'mix-blend-mode']) assert.ok(!svg.includes(prohibido), `${t} simple con ${prohibido}`);
  else assert.ok(svg.includes('feSpecularLighting') && svg.includes('feTurbulence') && !svg.includes('mix-blend-mode'));
}
assert.equal(salidas.size, 6 * 2 * 2, 'cada estilo, modo y nivel da una salida distinta');
assert.ok(cartaSVG(DATOS, 'oro', { modo: 'arte', escala: 2.6 }).includes('width="780" height="1144"'));

// CA-13 facetas del vidrio quebrado.
for (const t of TIERS) {
  const k = (cartaSVG(DATOS, t).match(/class="carta-faceta"/g) ?? []).length;
  if (t === 'salon') assert.ok(k >= 12 && k <= 18, `facetas ${k}`);
  else assert.equal(k, 0);
}

// CA-14 nombre.
const largos = ['A', 'CHEPE CHAMUSQUERO', 'ABCDEFGHIJKLMNOPQRSTUVWXY', 'Á'.repeat(40), 'W'.repeat(40), 'WILLIAM MATÍAS RODRÍGUEZ DE LA CRUZ'.slice(0, 40), 'I'.repeat(40)];
for (const nom of largos) {
  const { texto, tam } = nombreAjustado(nom);
  assert.ok(tam >= 18 && tam <= 29, `tamaño ${tam}`);
  assert.ok(anchoNombre(texto, tam) <= 232, `${nom} mide ${anchoNombre(texto, tam)}`);
  assert.ok(texto.length >= 1 && [...texto].length <= 40);
  if (tam === 29) assert.equal(texto, nom.toUpperCase());
  if (texto.endsWith('…')) assert.equal(tam, 18);
}
assert.equal(nombreAjustado('Ana').tam, 29);
assert.ok(nombreAjustado('W'.repeat(40)).texto.endsWith('…'));
assert.equal(nombreAjustado(42).texto, '', 'nombre no textual');

// Texto de la placa: el portero muestra asistencias, no goles.
const placa = (pos: string) => textosCarta({ ...DATOS, pos }, 'oro').filter((t) => t.partes.length === 2).map((t) => t.partes[0].texto);
assert.deepEqual(placa('DEL'), ['PJ', 'GOL', 'TÍT']);
assert.deepEqual(placa('POR'), ['PJ', 'AST', 'TÍT']);

// CA-08 mismos números en las dos superficies: la imagen y la carta del ranking arman los datos con los mismos cinco campos.
const deRanking = (c: { pos: string; ovr: number; apps: number; goals: number; assists: number }): DatosCarta => ({ ...DATOS, pos: c.pos, media: c.ovr, apps: c.apps, goles: c.goals, asist: c.assists });
const deImagen = (s: { position: string; peak: number; apps: number; goals: number; assists: number }): DatosCarta => ({ ...DATOS, pos: s.position, media: s.peak, apps: s.apps, goles: s.goals, asist: s.assists });
const fila = { pos: 'MED', ovr: 81, apps: 640, goals: 70, assists: 150 }, carrera = { position: 'MED', peak: 81, apps: 640, goals: 70, assists: 150 };
assert.deepEqual(atributos(deRanking(fila)), atributos(deImagen(carrera)));
assert.deepEqual(textosCarta(deRanking(fila), 'plata'), textosCarta(deImagen(carrera), 'plata'));

// Dependencia con avatarSVG (la rama de los avatares puede cambiarla): el fondo 200 x 200 existe y se quita.
const av = avatarSVG({ skin: 2, hair: 1, hairColor: 0, beard: 0, extra: 0 }, ['#4997d0', '#ffffff'], 9, 200);
assert.ok(/<rect width="200" height="200"[^>]*\/>/.test(av), 'avatarSVG ya no dibuja el fondo 200x200: revisar quitarFondoAvatar');
assert.ok(!/<rect width="200" height="200"/.test(quitarFondoAvatar(av)), 'quitarFondoAvatar no quitó el fondo');
assert.ok(av.includes('viewBox="0 0 200 200"'), 'avatarSVG cambió su viewBox');
assert.ok(/^<svg[^>]*>/.test(av) && /<\/svg>\s*$/.test(av), 'avatarSVG ya no es un svg único: revisar interiorAvatar');

// Los colores de clubes y selecciones del juego pasan la validación (si no, la carta mostraría el neutro).
for (const c of ALL_CLUBS) for (const col of c.colors) assert.match(col, /^#[0-9a-fA-F]{6}$/, c.id);
for (const c of COUNTRIES) for (const col of c.kit) assert.match(col, /^#[0-9a-fA-F]{6}$/, c.code);
assert.ok(SILUETA.startsWith('M40 4') && ESCUDO_PATH.startsWith('M3 3') && CAMPO.length === 6 && PORTERO.length === 6);

// ---------- Contraste (CA-16, RF-24) ----------

type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const rgba = (s: string): { c: RGB; a: number } => {
  const m = /rgba\((\d+),(\d+),(\d+),([\d.]+)\)/.exec(s);
  return m ? { c: [+m[1], +m[2], +m[3]], a: +m[4] } : { c: hex(s), a: 1 };
};
const mezcla = (fondo: RGB, c: RGB, a: number): RGB => fondo.map((v, i) => v * (1 - a) + c[i] * a) as RGB;
const lum = (c: RGB) => {
  const [r, g, b] = c.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a: RGB, b: RGB) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
/** Color local de la cara a una altura (fracción de 0 a 1): el degradado diagonal se aproxima por uno vertical, más la sombra inferior. */
function cara(t: CardTier, f: number, conBrillo = false): RGB {
  const E = ESTILOS[t];
  const o = E.faceO, c = E.face.map(hex);
  const i = f <= o[1] ? 0 : 1;
  const k = (f - o[i]) / (o[i + 1] - o[i]);
  let col = c[i].map((v, j) => v + (c[i + 1][j] - v) * Math.min(1, Math.max(0, k))) as RGB;
  if (conBrillo) col = mezcla(col, hex(E.glow), 0.55);
  return mezcla(col, [0, 0, 0], E.sombra * Math.min(1, Math.max(0, (f - 0.55) / 0.45)));
}
const minimos: Record<string, number> = {};
const anota = (t: string, etq: string, v: number) => { minimos[`${t} ${etq}`] = Math.min(minimos[`${t} ${etq}`] ?? 99, v); };
for (const t of TIERS) {
  const E = ESTILOS[t];
  for (const f of [0.67, 0.75, 0.83]) {
    anota(t, 'etiquetas (>=4,5)', contraste(hex(E.muted), cara(t, f)));
    anota(t, 'cifras de atributos (>=3)', contraste(hex(E.ink), cara(t, f)));
  }
  for (const f of [0.1, 0.2, 0.3]) for (const b of [false, true]) anota(t, 'media y posición (>=3)', contraste(hex(E.ink), cara(t, f, b)));
  for (const f of [0.58, 0.64]) anota(t, 'nombre (>=3)', contraste(hex(E.ink), cara(t, f)));
  anota(t, 'punta (>=4,5)', contraste(hex(E.ink), cara(t, 0.93)));
  const p = rgba(E.plate);
  for (const f of [0.86, 0.9]) anota(t, 'placa (>=4,5)', contraste(hex(E.plateInk), mezcla(cara(t, f), p.c, p.a)));
}
if (process.env.CONTRASTE) console.table(Object.fromEntries(Object.entries(minimos).map(([k, v]) => [k, +v.toFixed(2)])));
for (const [k, v] of Object.entries(minimos)) assert.ok(v >= (k.includes('>=3)') ? 3 : 4.5), `contraste ${k}: ${v.toFixed(2)}`);

console.log(`carta.test.ts: ${n} combinaciones de atributos, peor desvío ${peor.toFixed(2)} (esperadas) y ${peorExtremo.toFixed(2)} (extremas): todo bien.`);
