// Pruebas estáticas de las imágenes de trofeos, su mapa y sus créditos (specs/trofeos-reales, CA-6 y CA-7). No abre el navegador:
//   npx tsx scripts/trofeos.test.ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLUB_CUPS } from '../src/engine/engine';
import { COUNTRIES } from '../src/engine/countries';
import { AWARD_LABEL, TROFEO_IMG, trophyImg } from '../src/ui/palmares';
import type { AwardKind } from '../src/engine/types';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const errores: string[] = [];
const mal = (t: string) => errores.push(t);

// ---- 1. Archivos de public/trofeos/: tamaño, formato y dimensiones ----
const dir = join(raiz, 'public/trofeos');
const archivos = readdirSync(dir).filter((f) => !f.startsWith('.'));
let total = 0;
/** Ancho y alto desde el encabezado de un WebP (VP8 con pérdida, VP8L sin pérdida o VP8X extendido). */
function dimensionesWebp(b: Buffer): [number, number] | null {
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const tipo = b.toString('ascii', 12, 16);
  if (tipo === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (tipo === 'VP8L') { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
  if (tipo === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  return null;
}
for (const f of archivos) {
  const ruta = join(dir, f);
  const bytes = statSync(ruta).size;
  total += bytes;
  if (bytes > 40 * 1024) mal(`${f} pesa ${bytes} bytes (máximo 40 KB)`);
  if (f.endsWith('.webp')) {
    const d = dimensionesWebp(readFileSync(ruta));
    if (!d) mal(`${f}: no es un WebP legible`);
    else if (d[0] > 200 || d[1] > 200) mal(`${f}: ${d[0]}x${d[1]} pasa de 200 px por lado`);
  } else if (f.endsWith('.svg')) {
    const svg = readFileSync(ruta, 'utf8');
    if (/<script|href=["']?(https?:|\/\/)|xlink:href|<image|onload|onerror/i.test(svg)) mal(`${f}: el SVG propio no puede traer scripts, imágenes ni enlaces`);
    if (/<text/i.test(svg)) mal(`${f}: el SVG propio no lleva texto`);
  } else mal(`${f}: solo .webp o .svg`);
}
if (total > 800 * 1024) mal(`el total pesa ${total} bytes (máximo 800 KB)`);

// ---- 2. El mapa contra los archivos ----
const COPA = trophyImg(COUNTRIES[0].leagues[0], 'copa'); // Liga Nacional: sin foto, copa propia
if (COPA?.file !== 'copa-dorada.svg') mal('un título de club sin foto debía llevar copa-dorada.svg');
const usados = new Set<string>([...Object.values(TROFEO_IMG).map((i) => i.file), COPA?.file ?? '']);
for (const f of usados) if (!archivos.includes(f)) mal(`el mapa pide ${f} y no existe en public/trofeos/`);
for (const f of archivos) if (!usados.has(f)) mal(`${f} es un archivo huérfano: ningún trofeo del mapa lo usa`);
for (const [etiqueta, i] of [...Object.entries(TROFEO_IMG), ['copa', COPA!] as const]) {
  if (!i.alt.trim() || /[<>"'`]/.test(i.alt)) mal(`texto alternativo de "${etiqueta}" vacío o con <, >, comillas o tilde grave: "${i.alt}"`);
  if (!/^[a-z0-9-]+\.(webp|svg)$/.test(i.file)) mal(`nombre de archivo raro para "${etiqueta}": ${i.file}`);
}

// ---- 3. Cobertura de RF-07 ----
const real = ['ES', 'EN', 'IT', 'DE', 'MX', 'US', 'NL', 'AR', 'BR', 'CO', 'PE', 'PY', 'EC', 'CR']; // primeras con foto o dibujo de Commons
for (const c of COUNTRIES) {
  c.leagues.forEach((liga, i) => {
    const img = trophyImg(liga, 'copa');
    if (!img) return mal(`${liga} (${c.code}) sin imagen`);
    const quiereReal = i === 0 && real.includes(c.code);
    if (quiereReal !== img.file.endsWith('.webp')) mal(`${liga}: ${quiereReal ? 'debía llevar la imagen de Commons' : 'debía llevar la copa propia'} y lleva ${img.file}`);
  });
}
for (const copa of [...CLUB_CUPS, 'Copa Centroamericana']) {
  const img = trophyImg(copa, 'copa');
  if (!img) mal(`${copa} sin imagen`);
  else if (['Champions League de la AFC', 'Copa Centroamericana'].includes(copa) === img.file.endsWith('.webp')) mal(`${copa}: ${img.file} no es lo que dice RF-07`);
}
const premios: [string, AwardKind, string][] = [
  ['Balón de Oro', 'balon', 'balon-de-oro.webp'], ['Pichichi', 'goleador', 'pichichi.webp'], ['Golden Boy', 'golden', 'golden-boy.svg'],
  ['Bota de Oro', 'bota', 'bota-dorada.svg'], ['Torjägerkanone', 'goleador', 'bota-dorada.svg'], ['Capocannoniere', 'goleador', 'bota-dorada.svg'],
  ['Bota de Oro de la Premier League', 'goleador', 'bota-dorada.svg'], ['Máximo goleador de la Ligue 1', 'goleador', 'bota-dorada.svg'],
];
for (const [etiqueta, tipo, archivo] of premios) if (trophyImg(etiqueta, tipo)?.file !== archivo) mal(`${etiqueta} debía llevar ${archivo}`);
for (const tipo of ['asistidor', 'portero', 'joven', 'mvp', 'ideal', 'goleador'] as const) if (trophyImg(AWARD_LABEL[tipo], tipo)) mal(`${AWARD_LABEL[tipo]} debía conservar su ícono de trazo`);
for (const sel of ['Mundial', 'Copa Oro', 'Copa América', 'Eurocopa', 'Copa Asiática', 'Copa Africana', 'Liga de Naciones']) if (trophyImg(sel, 'copa')) mal(`${sel} (Selección) debía conservar su ícono`);

// ---- 4. Créditos ----
const creditos = readFileSync(join(raiz, 'creditos.html'), 'utf8');
const entradas = new Map([...creditos.matchAll(/<li data-trofeo="([a-z0-9-]+)">([\s\S]*?)<\/li>/g)].map((m) => [m[1], m[2]]));
const deCommons = new Set(Object.values(TROFEO_IMG).filter((i) => i.file.endsWith('.webp')).map((i) => i.file.replace('.webp', '')));
for (const k of deCommons) {
  const e = entradas.get(k);
  if (!e) { mal(`creditos.html sin entrada para ${k}`); continue; }
  if (!/href="https:\/\/commons\.wikimedia\.org\/wiki\/File:[^"]+"/.test(e)) mal(`${k}: falta el enlace a la página del archivo en Commons`);
  if (!/href="https:\/\/creativecommons\.org\/[^"]+"/.test(e) && !/Dominio público/.test(e)) mal(`${k}: falta el enlace a la licencia o "Dominio público"`);
  if (!/Autor: [^<\s][^<]*</.test(e)) mal(`${k}: falta el autor`);
  if (!/recortada y redimensionada/i.test(e)) mal(`${k}: falta la nota "recortada y redimensionada"`);
  if (/BY-SA/.test(e) && !/misma licencia/.test(e)) mal(`${k}: CC BY-SA sin la aclaración de la misma licencia`);
}
for (const k of entradas.keys()) if (!deCommons.has(k)) mal(`creditos.html tiene "${k}" y no hay un archivo de Commons con ese nombre`);
for (const propia of ['copa-dorada', 'bota-dorada', 'golden-boy']) if (!creditos.includes(`data-propia="${propia}"`)) mal(`creditos.html no lista la ilustración propia ${propia}`);
if (!creditos.includes('mailto:estuardo1314@gmail.com')) mal('creditos.html sin el correo para pedir el retiro de una imagen');
if (!/Sin afiliación/.test(creditos)) mal('creditos.html sin la sección de no afiliación');

// ---- 5. Integración y nada de dominios externos ----
if (!readFileSync(join(raiz, 'src/main.ts'), 'utf8').includes('creditos.html')) mal('el pie de main.ts no enlaza creditos.html');
if (!/creditos/.test(readFileSync(join(raiz, 'vite.config.ts'), 'utf8'))) mal('vite.config.ts no construye creditos.html');
if (!readFileSync(join(raiz, 'terminos.html'), 'utf8').includes('creditos.html')) mal('terminos.html no remite a creditos.html');
const codigo = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? codigo(join(d, e.name)) : /\.(ts|css|html)$/.test(e.name) ? [join(d, e.name)] : []));
for (const f of [...codigo(join(raiz, 'src')), ...readdirSync(raiz).filter((x) => x.endsWith('.html')).map((x) => join(raiz, x))]) {
  const t = readFileSync(f, 'utf8');
  if (/(src=["'`]|url\()\s*(https?:)?\/\/[^"')`]*wikimedia|upload\.wikimedia\.org/i.test(t)) mal(`${f.replace(raiz, '')} carga una imagen de Wikimedia`);
}

if (errores.length) {
  console.error(`trofeos.test: ${errores.length} errores\n  ${errores.join('\n  ')}`);
  process.exit(1);
}
console.log(`trofeos: ${archivos.length} archivos (${(total / 1024).toFixed(0)} KB en total, máximo ${Math.max(...archivos.map((f) => statSync(join(dir, f)).size))} bytes), ${deCommons.size} imágenes de Commons con sus créditos, cobertura de ligas, copas y premios, y ninguna imagen de un dominio externo.`);
