// Comprobaciones estáticas del servidor de Retos en línea (riesgo 1 del plan; A02, A03, A05, A06, A09): qué importa `api/` de `src/`, que todo import
// relativo lleve extensión (Node ESM en Vercel), que no se registren secretos, que la llave de Ably no llegue al cliente y que ningún SQL se arme con texto.
//   npx tsx scripts/seguridad-api.test.ts
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (r: string) => readFileSync(join(RAIZ, r), 'utf8');
const sinComentarios = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

// ---------- Riesgo 1: el grafo de imports de api/ ----------
// Cada import RELATIVO que no sea solo de tipos se resuelve como en Node ESM: con extensión (.js para un .ts, .json con atributo de importación).
const IMPORTS = /\b(import|export)\s+(type\s+)?(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*\{[^}]*\})?\s+from\s+)?'([^']+)'(\s+with\s*\{[^}]*\})?|\bimport\(\s*'([^']+)'\s*\)/g;
const alcanzados = new Map<string, string[]>(); // archivo → quién lo importa
const problemas: string[] = [];
function recorrer(rel: string, desde: string) {
  if (alcanzados.has(rel)) { alcanzados.get(rel)!.push(desde); return; }
  alcanzados.set(rel, [desde]);
  const texto = sinComentarios(leer(rel));
  for (const m of texto.matchAll(IMPORTS)) {
    const tipo = !!m[2];
    const esp = m[3] ?? m[5];
    if (!esp.startsWith('.')) continue;                // paquetes y node:*
    if (tipo) continue;                                // `import type` se borra al compilar
    const abs = resolve(RAIZ, dirname(rel), esp);
    if (esp.endsWith('.json')) {
      if (!m[4] || !/type:\s*'json'/.test(m[4])) problemas.push(`${rel}: el JSON ${esp} se importa sin «with { type: 'json' }»`);
      if (!existsSync(abs)) problemas.push(`${rel}: no existe ${esp}`);
      alcanzados.set(relative(RAIZ, abs), [rel]);
      continue;
    }
    if (!esp.endsWith('.js')) { problemas.push(`${rel}: el import relativo «${esp}» no lleva extensión .js`); continue; }
    const ts = abs.replace(/\.js$/, '.ts');
    if (!existsSync(ts)) { problemas.push(`${rel}: «${esp}» no resuelve a un .ts`); continue; }
    recorrer(relative(RAIZ, ts), rel);
  }
}
const api = readdirSync(join(RAIZ, 'api')).filter((f) => f.endsWith('.ts'));
for (const f of api) recorrer(`api/${f}`, '(entrada)');
assert.deepEqual(problemas, [], problemas.join('\n'));

// Lo que `api/` arrastra de `src/` es lógica pura: nada de DOM, de la app ni de los bancos del modo local.
const deSrc = [...alcanzados.keys()].filter((f) => f.startsWith('src/')).sort();
for (const prohibido of [/^src\/main\.ts$/, /^src\/ui\//, /^src\/engine\//, /^src\/retos\/index\.ts$/, /^src\/retos\/comun\.ts$/, /^src\/retos\/trivia\.ts$/, /^src\/retos\/ui-/, /\.css$/]) {
  assert.deepEqual(deSrc.filter((f) => prohibido.test(f)), [], `api/ no debe arrastrar ${prohibido}`);
}
for (const f of deSrc.filter((x) => x.endsWith('.ts'))) {
  assert.ok(!/\b(document|window|localStorage|navigator)\b\./.test(sinComentarios(leer(f))), `${f} toca el DOM`);
}
// Los dos JSON de los bancos solo los lee api/_bancos.ts.
assert.deepEqual(alcanzados.get('src/retos/preguntas.json'), ['api/_bancos.ts']);
console.log(`seguridad-api: api/ importa de src/ solamente ${deSrc.join(', ')}.`);

// ---------- A09: los registros no llevan tokens, cabeceras ni cuerpos ----------
const fuentes = ['api', 'src/retos/online'].flatMap((d) => readdirSync(join(RAIZ, d)).filter((f) => f.endsWith('.ts')).map((f) => `${d}/${f}`));
for (const f of fuentes) {
  const lineas = sinComentarios(leer(f)).split('\n');
  lineas.forEach((l, i) => {
    if (/console\./.test(l)) assert.ok(f === 'api/_http.ts' || f === 'api/en-vivo.ts' || f === 'api/ranking.ts', `${f}:${i + 1}: console fuera de registrar()`);
    if (/console\./.test(l) && f === 'api/_http.ts') assert.ok(!/token|authorization|headers|body|cuerpo|req\b/i.test(l), `${f}:${i + 1}: un registro menciona un secreto`);
    if (/registrar\(/.test(l) && !/function registrar/.test(l)) assert.ok(!/token|authorization|headers|\.body|\.text\(|\.json\(|req\b|cuerpo/i.test(l.replace(/registrar\('[\w-]+'/, 'registrar(')), `${f}:${i + 1}: registrar() recibe algo sensible: ${l.trim()}`);
  });
}
// registrar() solo escribe la acción y el nombre del error.
assert.match(leer('api/_http.ts'), /console\.error\(`retos-en-linea: \$\{accion\} falló \(\$\{detalle\}\)`\)/);

// ---------- A05: sin CORS abierto ----------
for (const f of api) assert.ok(!/access-control-allow/i.test(leer(`api/${f}`)), `api/${f} abre CORS`);
assert.match(leer('api/_http.ts'), /'x-content-type-options': 'nosniff', 'cache-control': 'no-store'/);

// ---------- A02: la llave de Ably vive solo en el servidor ----------
function archivos(d: string): string[] {
  return readdirSync(join(RAIZ, d)).flatMap((f) => {
    const r = `${d}/${f}`;
    return statSync(join(RAIZ, r)).isDirectory() ? (f === 'node_modules' ? [] : archivos(r)) : [r];
  });
}
for (const f of [...archivos('src'), 'index.html', 'vite.config.ts', 'privacidad.html', 'terminos.html']) {
  assert.ok(!/ABLY_API_KEY|abc123\.def456/.test(leer(f)) || /specs\//.test(f), `${f} nombra la llave de Ably`);
}
assert.ok(!/VITE_ABLY/.test(leer('.env.example')), 'la llave no puede ir en una variable VITE_ (se publica en el cliente)');
const gi = leer('.gitignore');
assert.ok(/^\.env$/m.test(gi) && /^\.env\*\.local$/m.test(gi), '.env y .env*.local están fuera de git');
const env = leer('.env.example');
assert.match(env, /^ABLY_API_KEY=$/m); assert.match(env, /^SITE_URL=$/m);
assert.match(env, /^VITE_SITE_URL=https:\/\/chamusqueros\.vercel\.app$/m);
assert.ok(!/chamusqueros\.com/.test(env), '.env.example sigue con el dominio viejo');
assert.ok(!/No hay llaves ni credenciales/.test(env), '.env.example sigue diciendo que no hay llaves');
for (const l of env.split('\n')) if (/^(ABLY_API_KEY|DATABASE_URL)\s*=\s*\S/.test(l)) assert.fail(`.env.example trae un valor real: ${l}`);

// ---------- A03: ningún SQL se arma con texto ----------
{
  const bd = sinComentarios(leer('api/_bd.ts'));
  assert.ok(!/\bsql\(/.test(bd) && !/\.query\(/.test(bd), 'solo plantillas etiquetadas: nada de sql(texto) ni query(texto)');
  for (const f of api.filter((x) => x !== '_bd.ts' && x !== 'ranking.ts' && x !== 'en-vivo.ts')) assert.ok(!/neon\(/.test(leer(`api/${f}`)), `api/${f} abre su propia conexión`);
  // Cada consulta de _bd.ts lleva su etiqueta para el Neon falso.
  const consultas = [...leer('api/_bd.ts').matchAll(/sql`([^`]*)`/g)].map((m) => m[1]);
  assert.ok(consultas.length >= 12);
  for (const c of consultas) assert.match(c, /^\/\* \w+ \*\//, 'consulta sin etiqueta');
}

// ---------- A06: dependencias ----------
{
  const pkg = JSON.parse(leer('package.json'));
  const deps = Object.keys(pkg.dependencies ?? {}).sort();
  assert.ok(deps.every((d) => ['@neondatabase/serverless', 'ably'].includes(d)), `dependencia inesperada: ${deps}`);
  if (pkg.dependencies?.ably) assert.match(pkg.dependencies.ably, /^\d+\.\d+\.\d+$/, 'ably con versión exacta');
}

// ---------- A10: los únicos hosts del servidor ----------
{
  const hosts = new Set<string>();
  const retos = api.filter((f) => f !== 'en-vivo.ts'); // (en-vivo.ts es de resultados en vivo y llama a ESPN)
  for (const f of retos) for (const m of sinComentarios(leer(`api/${f}`)).matchAll(/'(https?:\/\/[^'`$]*)'|`(https?:\/\/[^`$/]*)/g)) hosts.add(new URL(m[1] ?? m[2]).host);
  assert.deepEqual([...hosts].sort(), ['chamusqueros.vercel.app', 'main.realtime.ably.net', 'www.wikidata.org']);
  for (const f of retos) assert.ok(!/fetch\(\s*(req|url|body|params)/.test(leer(`api/${f}`)), `api/${f} llama a una URL que no es fija`);
}
console.log('seguridad-api: imports con extensión, registros sin secretos, sin CORS, llave solo en el servidor, SQL parametrizado, dependencias y hosts fijos.');
