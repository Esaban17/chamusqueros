// Cierre del bloque B (B9): lo que se puede fijar buscando en el código del modo en línea, sin navegador:
//   npx tsx scripts/online-cliente.test.ts
//  - ningún marcado dinámico (A03) y el almacenamiento solo en cliente.ts;
//  - sin secretos ni variables de entorno del servidor en el cliente (A02);
//  - ningún registro de consola con tokens o cabeceras de autorización (A09);
//  - el GRAFO de imports (transitivo) del modo en línea y de los pintores no llega a preguntas.json, futbolistas.json ni trivia.ts (RF-35);
//  - `ably` solo se carga con import() dentro de transporte.ts.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../src/', import.meta.url));
const online = join(src, 'retos', 'online');
const archivosOnline = readdirSync(online).filter((f) => f.endsWith('.ts')).map((f) => join(online, f));
assert.ok(archivosOnline.length >= 10, 'se esperaban los archivos del modo en línea');
const leer = (f: string) => readFileSync(f, 'utf8');
const nombre = (f: string) => relative(src, f);

// ---------- Marcado y almacenamiento ----------
const marcado = ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval('];
const almacenamiento = ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie'];
const listaDeSecretos = ['ABLY_API_KEY', 'process.env', 'DATABASE_URL'];
const propios = [...archivosOnline, join(src, 'retos', 'ui-dedonde.ts')].filter(existsSync);
for (const f of propios) {
  const t = leer(f);
  for (const x of marcado) assert.ok(!t.includes(x), `${nombre(f)} usa ${x}`);
  for (const x of listaDeSecretos) assert.ok(!t.includes(x), `${nombre(f)} nombra ${x}: nada de secretos en el cliente`);
  if (!f.endsWith('cliente.ts')) for (const x of almacenamiento) assert.ok(!t.includes(x), `${nombre(f)} usa ${x} fuera de cliente.ts`);
  assert.ok(!/console\.\w+\([^)]*(token|authorization|Bearer)/i.test(t), `${nombre(f)} registra un token o una cabecera`);
}
assert.ok(leer(join(online, 'cliente.ts')).includes('localStorage'), 'el almacenamiento vive en cliente.ts');
// Ably y su llave: ni la palabra "Basic" ni un valor con forma de llave en ningún archivo de src/
for (const f of walk(src)) assert.ok(!/[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{6}:[A-Za-z0-9_+/=-]{20,}/.test(leer(f)), `${nombre(f)} parece contener una llave de Ably`);

// ---------- `ably` solo bajo demanda ----------
for (const f of walk(src).filter((x) => /\.(ts|css)$/.test(x))) {
  const t = leer(f);
  const estatico = /^\s*import\s[^'"]*from\s*['"]ably(\/[^'"]*)?['"]/m.test(t) || /^\s*import\s*['"]ably/m.test(t);
  assert.ok(!estatico, `${nombre(f)} importa ably de forma estática`);
  if (/import\(\s*['"]ably/.test(t)) assert.equal(nombre(f), join('retos', 'online', 'transporte.ts'), 'solo transporte.ts carga ably, con import()');
}

// ---------- Grafo de imports ----------
const PROHIBIDOS = ['preguntas.json', 'futbolistas.json', join('retos', 'trivia.ts')];
function resolver(desde: string, esp: string): string | null {
  if (!esp.startsWith('.')) return null;   // paquetes externos
  const base = resolve(dirname(desde), esp);
  for (const c of [base, `${base}.ts`, join(base, 'index.ts')]) if (existsSync(c) && /\.(ts|json|css)$/.test(c)) return c;
  return null;
}
/** Imports estáticos y dinámicos de un archivo, con comentarios fuera para no confundirse. */
function imports(f: string): { estaticos: string[]; dinamicos: string[] } {
  const t = leer(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const est = [...t.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm)].map((m) => m[1] ?? m[2]);
  const din = [...t.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
  return { estaticos: est, dinamicos: din };
}
/**
 * Lo que descarga el modo en línea: los imports estáticos (transitivos) y los dinámicos del primer nivel (cada pintor se baja al usarse),
 * con sus propios imports estáticos. El `import()` de un banco dentro de un pintor de C (por ejemplo, jugarDeDonde en local) no cuenta:
 * no se ejecuta en línea.
 */
function grafo(raices: string[]): Map<string, string[]> {
  const visto = new Map<string, string[]>();   // archivo → camino hasta él
  const cola: [string, number, string[]][] = raices.map((r) => [r, 0, [nombre(r)]]);
  while (cola.length) {
    const [f, nivel, camino] = cola.shift()!;
    if (visto.has(f)) continue;
    visto.set(f, camino);
    if (!f.endsWith('.ts')) continue;
    const { estaticos, dinamicos } = imports(f);
    for (const e of estaticos) { const r = resolver(f, e); if (r) cola.push([r, nivel, [...camino, nombre(r)]]); }
    if (nivel === 0) for (const e of dinamicos) { const r = resolver(f, e); if (r) cola.push([r, 1, [...camino, nombre(r)]]); }
  }
  return visto;
}
const g = grafo(archivosOnline);
for (const [f, camino] of g) for (const p of PROHIBIDOS) assert.ok(!f.endsWith(p), `el modo en línea llega a ${p}: ${camino.join(' → ')}`);
for (const necesario of ['trivia-puro.ts', 'pingpong.ts', 'ui-ping.ts', 'ui-preguntas.ts', 'ui-dedonde-linea.ts']) {
  assert.ok([...g.keys()].some((f) => f.endsWith(necesario)), `el grafo debería incluir ${necesario} (si no, la prueba no está mirando bien)`);
}
// El grafo SÍ detectaría el problema: trivia.ts arrastra el banco.
assert.ok([...grafo([join(src, 'retos', 'trivia.ts')]).keys()].some((f) => f.endsWith('preguntas.json')), 'la prueba debe poder ver el banco desde trivia.ts');

console.log(`online: ${propios.length} archivos sin marcado ni secretos, almacenamiento solo en cliente.ts, ably bajo demanda, y ${g.size} módulos en el grafo sin bancos ni trivia.ts.`);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}
