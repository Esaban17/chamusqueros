// Prueba de "Continuar mi carrera" (specs/continuar-carrera; RF-01 a RF-15; CA-1 a CA-14): guardado, lectura defensiva, retomar con el mismo resultado,
// contador, borrado, tamaño, escapado y privacidad. Sin DOM ni red. CA-8, CA-9, CA-11 y CA-12 (medidas y pantallas) se verifican en el navegador.
//   npx tsx scripts/continuar-carrera.test.ts        (unos 2 a 4 minutos: 24 carreras con todos sus puntos de guardado y ~120 procesos nuevos)
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Career } from '../src/engine/engine';
import { FORMATO, MAX_CARACTERES, leer, serializar } from '../src/engine/guardado';
import { CLASES } from '../src/engine/ritmo';
import { COUNTRIES } from '../src/engine/countries';
import { AVISO_DESCARTADA, AVISO_FORMULARIO, CLAVE, bloqueContinuar, borrarCarrera, guardarCarrera, hayCarreraGuardada, leerCarrera, type Almacen } from '../src/continuar-carrera';
import { crearSetup, jugar, resultadoDe } from './continuar-carrera.hijo';
import type { Mode, Position, Resolution } from '../src/engine/types';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const leerArchivo = (r: string) => readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const sinComentarios = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const inicio = Date.now();

// ---------- Utilidades ----------
/** Forma canónica (claves ordenadas, sin undefined): lo restaurado arma sus objetos en otro orden de claves que el original. */
function canon(v: unknown): string {
  const f = (x: unknown): unknown => (Array.isArray(x) ? x.map(f) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, f((x as Record<string, unknown>)[k])])) : x);
  return JSON.stringify(f(JSON.parse(JSON.stringify(v))));
}
function almacenFalso() {
  const m = new Map<string, string>();
  const a: Almacen & { m: Map<string, string> } = { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
  return a;
}
/** Carrera nueva de la política fija, hasta el primer punto que cumpla `cuando`; devuelve el texto guardado. */
function estadoDonde(cuando: (c: Career, d: Resolution | null) => boolean, semillas = 200): string {
  for (let seed = 1; seed < semillas; seed++) {
    const c = new Career(crearSetup('intensa', 'DEL', 'GT'), seed);
    let hallado: string | null = null;
    jugar(c, null, (cc, d) => { if (!hallado && cuando(cc, d)) hallado = serializar(cc, d); });
    if (hallado) return hallado;
  }
  throw new Error('no se encontró un estado de prueba');
}
const limpiarMemoria = () => (CLASES as Map<string, unknown>).clear(); // la memoria de ritmo.ts empieza vacía, como en una página recién abierta

// =============== CA-2: minijuego pendiente y resuelto ===============
{
  const texto = estadoDonde((c, d) => !!c.pendingEvent?.minigame && !d);
  const j = JSON.parse(texto);
  j.motor.pending.minigame = { kind: 'penal', difficulty: 0.5 };
  const g = leer(JSON.stringify(j))!;
  assert.ok(g);
  assert.deepEqual(g.career.pendingEvent!.minigame, { kind: 'penal', difficulty: 0.5 }, 'mismo minijuego (tipo y dificultad)');
  assert.equal(g.desenlace, null, 'sin resultado');
  assert.equal(g.career.progreso!.minijuego, true);
  assert.match(leerArchivo('src/main.ts'), /Minijuego de la temporada/, 'el avance dice "Minijuego de la temporada"');
  const a = almacenFalso();
  const r = g.career.choose(0, 0.1);
  guardarCarrera(g.career, r, a);
  const l = leerCarrera(a);
  assert.ok(l && l !== 'descartada');
  assert.equal(l.career.pendingEvent, null, 'ya no hay decisión pendiente');
  assert.equal(l.desenlace!.result, 'fail', 'el desenlace es el de fallo');
  const sigue = leerCarrera(a) as Exclude<ReturnType<typeof leerCarrera>, null | 'descartada'>;
  jugar(sigue.career, sigue.desenlace, () => {}); // no vuelve a ofrecer ese minijuego: sigue con "Seguir"
  assert.ok(sigue.career.isOver);
}

// =============== CA-5: lectura defensiva ===============
const base = estadoDonde((c, d) =>
  !d && !!c.pendingEvent && !c.pendingEvent.minigame && c.player.compras.length > 0 && c.player.personal.length > 0 &&
  c.player.seasons.some((s) => s.nt?.groups?.length && s.awards.length) && c.player.milestones.length > 0 && c.player.titles.length > 0 && Object.keys(c.player.flags).length > 0);
{
  const buena = leer(base);
  assert.ok(buena, 'una carrera válida se acepta');
  // Devuelve una copia, no el objeto leído
  const parseOriginal = JSON.parse;
  let leido: any;
  JSON.parse = ((t: string, r?: any) => (leido = parseOriginal(t, r))) as typeof JSON.parse;
  const copia = leer(base)!;
  JSON.parse = parseOriginal;
  assert.ok(leido.motor.player !== (copia.career.player as unknown));
  assert.notEqual(copia.career.player.seasons[0], leido.motor.player.seasons[0]);
  assert.notEqual(copia.career.player.flags, leido.motor.player.flags);
  assert.notEqual(copia.career.player.setup.avatar, leido.motor.player.setup.avatar);
  assert.notEqual(copia.career.pendingEvent!.options, leido.motor.pending.options);

  const mut = (f: (j: any) => void) => { const j = JSON.parse(base); f(j); return JSON.stringify(j); };
  const crudo = (re: RegExp, por: string) => { const t = base.replace(re, por); assert.notEqual(t, base, `la sustitución ${re} cambia algo`); return t; };
  const P = '"><img src=x onerror=window.__x=1>';
  const entradaProto = base.replace(/"flags":\{/, (m) => (base.includes('"flags":{}') ? `${m}"__proto__":{"polluted":1}` : `${m}"__proto__":{"polluted":1},`));
  const casos: [string, string][] = [
    ['versión anterior', mut((j) => (j.v = FORMATO - 1))], ['versión posterior', mut((j) => (j.v = FORMATO + 1))], ['versión ausente', mut((j) => delete j.v)],
    ['versión como texto', mut((j) => (j.v = String(FORMATO)))],
    ['JSON truncado', base.slice(0, Math.floor(base.length / 2))],
    ['null', 'null'], ['lista', '[]'], ['número', '5'], ['texto', '"hola"'], ['vacío', ''],
    ['más de 200 000 caracteres', 'x'.repeat(MAX_CARACTERES + 1)],
    ['más de 200 000 caracteres con forma de JSON', JSON.stringify({ v: FORMATO, relleno: 'x'.repeat(MAX_CARACTERES) })],
    ['nivel 99', mut((j) => (j.motor.player.rating = 99))], ['nivel 1e999', crudo(/"rating":[\d.]+/, '"rating":1e999')], ['nivel negativo', mut((j) => (j.motor.player.rating = -1))],
    ['nivel como texto', mut((j) => (j.motor.player.rating = '70'))],
    ['edad -5', mut((j) => (j.motor.player.age = -5))], ['edad 200', mut((j) => (j.motor.player.age = 200))], ['edad fraccionaria', mut((j) => (j.motor.player.age = 20.5))],
    ['club inexistente', mut((j) => (j.motor.player.clubId = 'no-existe'))], ['club inexistente en una temporada', mut((j) => (j.motor.player.seasons[0].clubId = 'no-existe'))],
    ['club "constructor"', mut((j) => (j.motor.player.clubId = 'constructor'))],
    ['país ZZ', mut((j) => (j.motor.player.setup.country = 'ZZ'))], ['departamento ajeno', mut((j) => (j.motor.player.setup.dept = 'constructor'))],
    ['artículo de tienda inexistente', mut((j) => (j.motor.player.compras[0].id = 'no-existe'))], ['personal inexistente', mut((j) => (j.motor.player.personal[0].id = 'no-existe'))],
    ['clave __proto__ en banderas', entradaProto],
    ['bandera con nombre raro', mut((j) => (j.motor.player.flags['x y<'] = 1))], ['bandera "constructor"', mut((j) => (j.motor.player.flags.constructor = 1))],
    ['texto de 10 001 caracteres', mut((j) => j.motor.player.milestones.push('x'.repeat(10_001)))],
    ['texto de 10 001 caracteres en la decisión', mut((j) => (j.motor.pending.text = 'x'.repeat(10_001)))],
    ['nombre de 17 caracteres', mut((j) => (j.motor.player.setup.firstName = 'x'.repeat(17)))], ['apellido vacío', mut((j) => (j.motor.player.setup.lastName = ''))],
    ['10 000 temporadas', mut((j) => (j.motor.player.seasons = Array.from({ length: 10_000 }, () => j.motor.player.seasons[0])))],
    ['61 temporadas', mut((j) => (j.motor.player.seasons = Array.from({ length: 61 }, () => j.motor.player.seasons[0])))],
    ['etiqueta de temporada con HTML', mut((j) => (j.motor.player.seasons[0].label = P))],
    ['decisión sin opciones', mut((j) => (j.motor.pending.options = []))], ['decisión sin desenlaces', mut((j) => (j.motor.pending.options[0].outcomes = []))],
    ['categoría de decisión inventada', mut((j) => (j.motor.pending.category = 'otra'))],
    ['efecto con clave desconocida', mut((j) => (j.motor.pending.options[0].outcomes[0].effects.evil = 1))],
    ['efecto con bandera __proto__', mut((j) => (j.motor.pending.options[0].outcomes[0].effects.flag = '__proto__'))],
    ['efecto a un club inexistente', mut((j) => (j.motor.pending.options[0].outcomes[0].effects.transferTo = 'no-existe'))],
    ['paso de agenda de tipo desconocido', mut((j) => (j.motor.agenda = [{ k: 'otro' }]))], ['agenda de 13 pasos', mut((j) => (j.motor.agenda = Array.from({ length: 13 }, () => ({ k: 'ritmo' }))))],
    ['agenda que no es lista', mut((j) => (j.motor.agenda = { k: 'ritmo' }))],
    ['generador negativo', mut((j) => (j.motor.rng = -1))], ['generador fraccionario', mut((j) => (j.motor.rng = 1.5))], ['generador como texto', mut((j) => (j.motor.rng = '12345'))],
    ['generador demasiado grande', mut((j) => (j.motor.rng = 2 ** 32))],
    ['campo desconocido en el jugador', mut((j) => (j.motor.player.extra = 1))], ['campo desconocido en el motor', mut((j) => (j.motor.extra = 1))],
    ['campo desconocido en la raíz', mut((j) => (j.extra = 1))], ['campo desconocido en una temporada', mut((j) => (j.motor.player.seasons[0].extra = 1))],
    ['falta un campo del jugador', mut((j) => delete j.motor.player.fame)], ['falta el generador', mut((j) => delete j.motor.rng)],
    ['decisión pendiente y desenlace a la vez', mut((j) => (j.desenlace = { text: 'x', changes: [] }))],
    ['minijuego sin tres desenlaces', mut((j) => { j.motor.pending.minigame = { kind: 'penal', difficulty: 0.5 }; j.motor.pending.options[0].outcomes = j.motor.pending.options[0].outcomes.slice(0, 2); })],
    ['minijuego de tipo inventado', mut((j) => (j.motor.pending.minigame = { kind: 'otro', difficulty: 0.5 }))],
    ['dificultad fuera de rango', mut((j) => (j.motor.pending.minigame = { kind: 'penal', difficulty: 5 }))],
    ['ofertas a un club inexistente', mut((j) => (j.motor.pending.offers = [{ clubId: 'no-existe', salary: 1, years: 1 }]))],
    ['equipo de grupo largo', mut((j) => (j.motor.player.seasons.find((s: any) => s.nt?.groups?.length).nt.groups[0].table[0].team = 'x'.repeat(10_001)))],
    ['selección con código inventado', mut((j) => (j.motor.player.seasons.find((s: any) => s.nt?.team).nt.team = 'ZZ'))],
  ];
  for (const [nombre, texto] of casos) {
    assert.equal(leer(texto), null, `leer rechaza: ${nombre}`);
    const a = almacenFalso();
    a.m.set(CLAVE, texto);
    assert.equal(hayCarreraGuardada(a), true);
    assert.equal(leerCarrera(a), 'descartada', `leerCarrera descarta: ${nombre}`);
    assert.equal(a.m.size, 0, `y borra la entrada: ${nombre}`);
    assert.equal(leerCarrera(a), null, 'la segunda vez ya no hay aviso');
  }
  // Una lectura válida por el almacenamiento
  const a = almacenFalso();
  a.m.set(CLAVE, base);
  const l = leerCarrera(a);
  assert.ok(l && l !== 'descartada');
  assert.equal(a.m.size, 1, 'una carrera válida no se borra al leerla');
  // Sin contaminación de prototipo
  assert.equal(({} as any).polluted, undefined);
  assert.deepEqual(Object.keys(Object.prototype), []);
  assert.equal(({} as any).evil, undefined);
}

// =============== CA-3, CA-8 (código), CA-13: el contador y la red ===============
{
  const llamadas: unknown[][] = [];
  const fetchReal = globalThis.fetch;
  globalThis.fetch = ((...args: unknown[]) => (llamadas.push(args), Promise.resolve(new Response(null, { status: 204 })))) as typeof fetch;
  try {
    const a = almacenFalso();
    const c = new Career(crearSetup('normal', 'DEL', 'GT'), 77);
    guardarCarrera(c, null, a);
    c.start();
    guardarCarrera(c, null, a);
    const l = leerCarrera(a);
    assert.ok(l && l !== 'descartada');
    bloqueContinuar(l.career);
    hayCarreraGuardada(a);
    jugar(l.career, l.desenlace, (cc, d) => void guardarCarrera(cc, d, a));
    borrarCarrera(a);
    assert.equal(llamadas.length, 0, 'guardar, leer, retomar, jugar y borrar no hacen ninguna petición');
  } finally {
    globalThis.fetch = fetchReal;
  }
  const main = sinComentarios(leerArchivo('src/main.ts'));
  assert.equal((main.match(/new Career\(/g) ?? []).length, 1, 'main.ts crea una sola carrera, con los datos del formulario');
  assert.match(main, /career = new Career\(setup\);\s*contarCarrera\('iniciada'\);/, "y avisa 'iniciada' justo después");
  assert.equal((main.match(/contarCarrera\('iniciada'\)/g) ?? []).length, 1);
  assert.equal((main.match(/contarCarrera\('terminada'\)/g) ?? []).length, 1);
  const retomar = /function continuarCarrera\(\) \{[\s\S]*?\n\}\n/.exec(main)?.[0] ?? '';
  assert.ok(retomar.length > 100, 'se encontró continuarCarrera');
  assert.equal(/contarCarrera|new Career\(|fetch/.test(retomar), false, 'retomar no cuenta ni crea carreras');
  for (const f of ['src/continuar-carrera.ts', 'src/engine/guardado.ts']) {
    const t = sinComentarios(leerArchivo(f));
    assert.equal(/contarCarrera|contador-carreras|fetch|XMLHttpRequest|sendBeacon|console\./.test(t), false, `${f}: sin contador, sin red y sin consola`);
  }
  // Una carrera retomada que llega al final: finish() avisa "terminada" una vez (RF-08, S-6); ahí también se borra lo guardado
  const fin = /function finish\(\) \{[\s\S]*?\n\}\n/.exec(main)?.[0] ?? '';
  assert.match(fin, /contarCarrera\('terminada'\);\s*borrarCarrera\(\);/);
}

// =============== CA-4, CA-10: borrado y una sola entrada ===============
{
  const a = almacenFalso();
  const setupA = { ...crearSetup('normal', 'DEL', 'GT'), lastName: 'Primera' };
  const setupB = { ...crearSetup('normal', 'DEL', 'GT'), lastName: 'Segunda' };
  guardarCarrera(new Career(setupA, 1), null, a);
  guardarCarrera(new Career(setupB, 2), null, a);
  assert.deepEqual([...a.m.keys()], [CLAVE], 'una sola entrada y ninguna otra clave');
  assert.equal(JSON.parse(a.m.get(CLAVE)!).motor.player.setup.lastName, 'Segunda', 'la segunda reemplaza a la primera');
  assert.equal(guardarCarrera(new Career(setupA, 1), null, a), null, 'devuelve su segundo argumento');
  borrarCarrera(a);
  assert.equal(a.m.size, 0);
  assert.equal(hayCarreraGuardada(a), false);
  const main = sinComentarios(leerArchivo('src/main.ts'));
  assert.equal((main.match(/borrarCarrera\(\)/g) ?? []).length, 2, 'main.ts borra solo al terminar y al crear (no al abrir el formulario)');
  assert.match(main, /contarCarrera\('iniciada'\);\s*borrarCarrera\(\);\s*guardarCarrera\(career, null\);\s*lastResolution = null;\s*debut\(\);/);
  for (const f of ['src/continuar-carrera.ts', 'src/engine/guardado.ts']) assert.equal((sinComentarios(leerArchivo(f)).match(/setItem\(/g) ?? []).length <= 1, true);
  assert.match(AVISO_FORMULARIO, /borra/);
  assert.match(AVISO_DESCARTADA, /No pudimos recuperar tu carrera guardada/);
  assert.match(main, /hayCarreraGuardada\(\)/);
  // Los cuatro puntos de guardado de main.ts (RF-01)
  assert.match(main, /function gameScreen\(\) \{\s*guardarCarrera\(career!, lastResolution\);/);
  assert.match(main, /\(score\) => guardarCarrera\(career!, \(lastResolution = career!\.choose\(0, score\)\)\)/);
  assert.match(main, /const draw = \(keepScroll: boolean\) => \{\s*guardarCarrera\(career!, lastResolution\);/);
}

// =============== CA-7: almacenamiento roto o sin espacio ===============
{
  const c = new Career(crearSetup('normal', 'DEL', 'GT'), 5);
  c.start();
  const previo = almacenFalso();
  guardarCarrera(c, null, previo);
  const cuota = { getItem: previo.getItem, setItem: () => { throw new DOMException('cuota excedida', 'QuotaExceededError'); }, removeItem: previo.removeItem, };
  guardarCarrera(c, null, cuota); // lanza al guardar: no lanza hacia fuera
  assert.equal(previo.m.size, 0, 'la copia anterior queda borrada');
  const roto: Almacen = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); }, removeItem: () => { throw new Error('bloqueado'); } };
  assert.equal(guardarCarrera(c, null, roto), null);
  assert.equal(leerCarrera(roto), null);
  assert.equal(hayCarreraGuardada(roto), false);
  borrarCarrera(roto);
  assert.equal(guardarCarrera(c, null, null), null, 'sin almacenamiento');
  assert.equal(leerCarrera(null), null);
  assert.equal(hayCarreraGuardada(null), false);
  borrarCarrera(null);
  // Sin localStorage global (Node): el valor por defecto tampoco lanza
  assert.doesNotThrow(() => { guardarCarrera(c, null); leerCarrera(); hayCarreraGuardada(); borrarCarrera(); });
  // Un estado de más de 200 000 caracteres no se guarda y borra lo anterior
  const a = almacenFalso();
  guardarCarrera(c, null, a);
  assert.equal(a.m.size, 1);
  c.player.milestones.push('x'.repeat(MAX_CARACTERES));
  assert.equal(serializar(c, null), null);
  guardarCarrera(c, null, a);
  assert.equal(a.m.size, 0, 'no se guarda y la copia desactualizada se borra');
}

// =============== CA-6: escapado ===============
{
  const P = '"><img src=x onerror=window.__x=1>';
  const c = new Career({ ...crearSetup('normal', 'DEL', 'GT'), firstName: '"><img src=x>', lastName: '<script>' }, 9);
  const html = bloqueContinuar(c);
  assert.equal(/<img|<script/i.test(html), false, 'el resumen del Home escapa el nombre');
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Continuar mi carrera/);
  // El validador fija la forma de la etiqueta de temporada; y los textos de la decisión y del desenlace, que sí admite, se pintan con esc() (auditoría estática)
  assert.equal(leer(base.replace(/"label":"\d{4}-\d{2}"/, `"label":"${P.replaceAll('"', '\\"')}"`)), null);
  const main = sinComentarios(leerArchivo('src/main.ts'));
  const cuerpo = (nombre: string) => {
    const i = main.search(new RegExp(`function ${nombre}\\(`));
    assert.ok(i >= 0, `existe ${nombre}`);
    const j = main.indexOf('\n}\n', i);
    return main.slice(i, j + 2);
  };
  // Cada interpolación ${...} de las funciones que pintan la carrera: si toca un campo de texto del jugador o de sus temporadas, tiene que ir dentro de esc().
  const TEXTO = /\b(?:r|a|m|g|ev|res|o|nt|p|t|d|h|c|row|s)\.(?:label|name|title|text|note|rival|team|comp|out|nombre)\b|\bfullName\(\)|setup\.(?:firstName|lastName|dept)/;
  const seguras = [
    // (función, texto de la interpolación) comprobadas a mano: no son texto libre
    ['seasonCard', "r.titles.map((t) => trophy('copa', 'Campeón', t, trophyImg(titleLabel(t), 'copa')))"], // trophy() escapa label y detail
    ['seasonCard', 'r.awards.map((a) => {'], // trophy() escapa label y detail
    ['finish', "p.setup.lastName.toLowerCase().replace(/[^a-z0-9]+/g, '-')"], // nombre de archivo de la imagen, no HTML: solo queda [a-z0-9-]
    ['ntBlock', 'comps.map((c) => {'], // bloque con sentencias: su salida pasa por esc(c), esc(out), groupTable y matchRow (se comprueba abajo) ['finish', 'comprasDestacadasHtml(p)'], ['finish', 'trophies'],
  ];
  const interpolaciones = (src: string) => {
    const out: string[] = [];
    for (let i = src.indexOf('${'); i >= 0; i = src.indexOf('${', i + 2)) {
      let prof = 1, j = i + 2;
      while (j < src.length && prof) (src[j] === '{' ? prof++ : src[j] === '}' && prof--, j++);
      out.push(src.slice(i + 2, j - 1));
    }
    return out;
  };
  const dentroDeEsc = (expr: string, pos: number) => {
    for (let prof = 0, k = pos - 1; k >= 0; k--) {
      if (expr[k] === ')') prof++;
      else if (expr[k] === '(') { if (prof === 0) { if (/\b(?:esc|trophy|cash|flag|crest|trofeoSrc|titleLabel|trophyImg|Number|moneyShort)$/.test(expr.slice(0, k))) return true; } else prof--; }
    }
    return false;
  };
  // Lo que está dentro de una interpolación anidada se revisa en su propia vuelta: aquí se tapa para no contarlo dos veces.
  const sinAnidadas = (expr: string) => {
    let out = '', prof = 0;
    for (let k = 0; k < expr.length; k++) {
      if (expr[k] === '$' && expr[k + 1] === '{') { prof++; out += '  '; k++; } else if (prof && expr[k] === '{') { prof++; out += ' '; } else if (prof && expr[k] === '}') { prof--; out += ' '; } else out += prof ? ' ' : expr[k];
    }
    return out;
  };
  let revisadas = 0;
  for (const f of ['playerHead', 'statsBar', 'seasonRow', 'seasonLog', 'seasonCard', 'ntBlock', 'groupTable', 'matchRow', 'seasonSummary', 'gameScreen', 'finish', 'debut', 'ntCall']) {
    const src = f === 'ntCall' ? /const ntCall = [^\n]*/.exec(main)![0] : cuerpo(f);
    for (const expr of interpolaciones(src)) {
      revisadas++;
      for (const m of sinAnidadas(expr).matchAll(new RegExp(TEXTO, 'g'))) {
        const usoComoCondicion = /^\s*(?:\?(?!\?)|&&|\|\||===|!==|\.length)/.test(expr.slice(m.index! + m[0].length)); // solo se lee, no se pinta
        if (usoComoCondicion || dentroDeEsc(expr, m.index!) || seguras.some(([fn, e]) => fn === f && expr.includes(e))) continue;
        assert.fail(`${f}: interpolación sin esc() de un campo de texto de la carrera: ${m[0]} en \${${expr.slice(0, 120)}}`);
      }
    }
  }
  assert.ok(revisadas > 80, `se revisaron ${revisadas} interpolaciones`);
  assert.match(main, /Temporada \$\{esc\(r\.label\)\}/);
  assert.match(main, /<span class="year">\$\{esc\(r\.label\)\}<\/span>/);
}

// =============== CA-14: privacidad ===============
{
  const t = leerArchivo('privacidad.html');
  assert.match(t, /<h2>Carrera en curso en tu dispositivo<\/h2>/);
  const sec = /<h2>Carrera en curso en tu dispositivo<\/h2>([\s\S]*?)<h2>/.exec(t)![1];
  for (const re of [/no se envía a ningún servidor/i, /Qué contiene/, /Cuándo se borra/, /Cómo borrarla a mano/, /pantalla final/, /crear un jugador nuevo/]) assert.match(sec, re);
  assert.match(t, /la carrera que tenés en curso/);
  assert.match(t, /Última actualización: 15 de octubre de 2026/);
}

// =============== CA-1, CA-7 (tamaño): misma carrera desde cualquier punto de guardado ===============
const MODOS: Mode[] = ['intensa', 'normal', 'expres'];
const POSICIONES: Position[] = ['POR', 'DEL'];
const PAISES = ['GT', 'AR', 'ES', 'JP']; // Concacaf, Conmebol, UEFA, AFC
for (const p of PAISES) assert.ok(COUNTRIES.some((c) => c.code === p));

function hijo(texto: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, ['--import', 'tsx', 'scripts/continuar-carrera.hijo.ts'], { cwd: raiz });
    let salida = '', err = '';
    p.stdout.on('data', (d) => (salida += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? resolve(JSON.parse(salida)) : reject(new Error(`hijo ${code}: ${err.slice(0, 500)}`))));
    p.stdin.end(JSON.stringify({ texto, mult: 7 }));
  });
}

let combos = 0, cortes = 0, cortesHijo = 0, mayor = 0, alExtranjero = 0;
const trabajosHijo: (() => Promise<void>)[] = [];
for (const modo of MODOS) for (const pos of POSICIONES) for (const pais of PAISES) {
  const nombre = `${modo}/${pos}/${pais}`;
  limpiarMemoria();
  const c = new Career(crearSetup(modo, pos, pais), 1000 + combos);
  const guardados: string[] = [serializar(c, null)!]; // punto (a): al crear el jugador, antes de que arranque
  jugar(c, null, (cc, d) => {
    const t = serializar(cc, d);
    assert.ok(t !== null, `${nombre}: se guarda`);
    guardados.push(t);
  });
  const ref = canon(resultadoDe(c));
  assert.ok(guardados.length >= 100, `${nombre}: al menos 100 puntos de guardado (${guardados.length})`);
  if (c.player.seasons.some((s) => s.tier === 0)) alExtranjero++;
  mayor = Math.max(mayor, ...guardados.map((g) => g.length));
  assert.ok(c.player.retired, `${nombre}: llegó al retiro`);

  // Todos los cortes, en el mismo proceso: guardar -> leer -> validar -> restaurar -> seguir con la misma política.
  for (const [k, texto] of guardados.entries()) {
    const g = leer(texto);
    assert.ok(g, `${nombre}, corte ${k}: se lee`);
    assert.equal(canon(JSON.parse(serializar(g.career, g.desenlace)!)), canon(JSON.parse(texto)), `${nombre}, corte ${k}: guardar lo restaurado da lo mismo`);
    jugar(g.career, g.desenlace, () => {});
    assert.equal(canon(resultadoDe(g.career)), ref, `${nombre}, corte ${k}: jugador, puntaje, carta y envío al ranking iguales`);
    cortes++;
  }

  // Al menos 5 cortes (el primero, el penúltimo y tres repartidos) en un proceso nuevo del intérprete por cada uno: sin nada de la carrera original en memoria.
  const n = guardados.length;
  const idx = [...new Set([0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 2])];
  assert.ok(idx.length >= 5);
  for (const k of idx) {
    trabajosHijo.push(async () => {
      const r = (await hijo(guardados[k])) as { error?: string };
      assert.equal(r.error, undefined, `${nombre}, corte ${k} (proceso nuevo): se lee`);
      assert.equal(canon(r), ref, `${nombre}, corte ${k} (proceso nuevo): resultado igual`);
      cortesHijo++;
    });
  }
  combos++;
}
assert.equal(combos, 24);
assert.ok(alExtranjero >= 4, `hay carreras que pasan al extranjero (${alExtranjero} de 24)`);
// CA-7: el mayor tamaño guardado
assert.ok(mayor <= 60_000, `tamaño máximo ${mayor} <= 60000`);
// Procesos nuevos, de a 8
{
  const cola = [...trabajosHijo];
  await Promise.all(Array.from({ length: 8 }, async () => { for (let t = cola.shift(); t; t = cola.shift()) await t(); }));
  assert.equal(cortesHijo, trabajosHijo.length);
}

console.log(
  `continuar-carrera: OK. ${combos} carreras, ${cortes} cortes en el mismo proceso y ${cortesHijo} en un proceso nuevo, todos con el mismo resultado; ` +
  `${alExtranjero} pasan al extranjero; tamaño máximo guardado ${mayor} caracteres (tope ${MAX_CARACTERES}); ${((Date.now() - inicio) / 1000).toFixed(0)} s.`,
);
