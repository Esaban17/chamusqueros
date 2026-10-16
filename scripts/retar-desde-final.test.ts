// Prueba de "Retar a alguien en línea" en la pantalla final (specs/retar-desde-final, CA-2 a CA-8, CA-10, CA-12, CA-13): costo del clic sobre el servidor real con
// Neon y Ably falsos, el primer paso del cliente con `fetch` y almacenamiento simulados, y comprobaciones estáticas del código. Sin red:
//   npx tsx scripts/retar-desde-final.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { servidor } from './fixtures/servidor';

const s = servidor();
const salaApi = await import('../api/sala');
const perfilApi = await import('../api/perfil');
const { HORA, LIMITES, SALAS_POR_HORA } = await import('../api/_limite');
const { AVISOS, crearDesdeFinal } = await import('../src/retos/online/desde-final');
const { crearPerfil } = await import('../src/retos/online/cliente');

const leerJson = async (r: Response) => { const t = await r.text(); return t ? JSON.parse(t) : null; };
const etiquetas = () => s.bd.consultas.map((c) => c.tag);
const AVATAR = [1, 2, 3, 0, 1, 10];
const conPerfil = async (apodo: string) => {
  const d = s.nuevoDispositivo(apodo);
  const r = await perfilApi.PUT(s.peticion('PUT', '/api/perfil', { d, cuerpo: { apodo, avatar: AVATAR, club: null, seleccion: null } }));
  assert.equal(r.status, 201);
  return d;
};
const reiniciarConteo = () => { s.bd.consultas.length = 0; s.ably.llamadas.length = 0; };

// ---------- Servidor: lo que cuesta cada caso (RF-10, RF-11; CA-3, CA-5, CA-6) ----------
{
  const d = await conPerfil('Ana');
  reiniciarConteo();
  const r = await salaApi.POST(s.peticion('POST', '/api/sala', { d, cuerpo: { accion: 'crear' } }));
  assert.equal(r.status, 201);
  assert.deepEqual(etiquetas(), ['hashDe', 'contarSalas', 'leerPerfil', 'limpiar', 'crearSala'], 'con perfil: 5 consultas');
  assert.equal(s.ably.llamadas.length, 0, 'crear no publica en Ably');

  reiniciarConteo();
  const nuevo = s.nuevoDispositivo('Beto');
  const p = await perfilApi.PUT(s.peticion('PUT', '/api/perfil', { d: nuevo, cuerpo: { apodo: 'Beto', avatar: AVATAR, club: null, seleccion: null } }));
  assert.equal(p.status, 201);
  assert.deepEqual(etiquetas(), ['guardarPerfil', 'leerPerfil', 'mejorCarrera'], 'crear el perfil: 3 consultas');

  // Tope por dispositivo: 5 salas dentro de la hora; la sexta se responde con 2 consultas.
  const e = await conPerfil('Cami');
  for (let i = 0; i < SALAS_POR_HORA; i++) assert.equal((await salaApi.POST(s.peticion('POST', '/api/sala', { d: e, cuerpo: { accion: 'crear' } }))).status, 201);
  reiniciarConteo();
  const tope = await salaApi.POST(s.peticion('POST', '/api/sala', { d: e, cuerpo: { accion: 'crear' } }));
  assert.equal(tope.status, 429);
  assert.deepEqual(etiquetas(), ['hashDe', 'contarSalas'], 'tope por dispositivo: 2 consultas');
  assert.equal(s.ably.llamadas.length, 0);

  // Tope por IP: 10 creaciones por hora desde la misma IP; la undécima se responde con 1 consulta.
  const ip = '198.51.100.7';
  for (let i = 0; i < LIMITES.crearIp.max; i++) {
    const x = await conPerfil(`Ip${i}`);
    assert.equal((await salaApi.POST(s.peticion('POST', '/api/sala', { d: x, ip, cuerpo: { accion: 'crear' } }))).status, 201, `creación ${i + 1} por IP`);
  }
  const y = await conPerfil('Ip10');
  reiniciarConteo();
  assert.equal((await salaApi.POST(s.peticion('POST', '/api/sala', { d: y, ip, cuerpo: { accion: 'crear' } }))).status, 429);
  assert.deepEqual(etiquetas(), ['hashDe'], 'tope por IP: 1 consulta');

  // RF-10: los topes no se aflojan.
  assert.deepEqual(LIMITES.crearIp, { max: 10, ms: 3_600_000 });
  assert.equal(HORA, 3_600_000);
  assert.equal(SALAS_POR_HORA, 5);
}

// ---------- Servidor sin llave de tiempo real: 0 consultas (CA-5) ----------
const sinAbly = async <T>(f: () => Promise<T>): Promise<T> => {
  const llave = process.env.ABLY_API_KEY;
  delete process.env.ABLY_API_KEY;
  try { return await f(); } finally { process.env.ABLY_API_KEY = llave; }
};
{
  const d = s.nuevoDispositivo('Dani');
  reiniciarConteo();
  await sinAbly(async () => {
    assert.equal((await salaApi.POST(s.peticion('POST', '/api/sala', { d, cuerpo: { accion: 'crear' } }))).status, 503);
    assert.equal(s.bd.consultas.length, 0, 'no disponible con perfil: 0 consultas');
    assert.deepEqual(await leerJson(await salaApi.GET(s.peticion('GET', '/api/sala'))), { enLinea: false });
    assert.equal(s.bd.consultas.length, 0, 'no disponible sin perfil: 0 consultas');
  });
}

// ---------- Cliente: crearDesdeFinal contra el servidor real simulado (CA-3 a CA-8) ----------
type Peticion = { metodo: string; ruta: string; cuerpo: unknown };
const peticiones: Peticion[] = [];
const memoria = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => memoria.get(k) ?? null,
  setItem: (k: string, v: string) => void memoria.set(k, String(v)),
  removeItem: (k: string) => void memoria.delete(k),
};
const fetchAnterior = globalThis.fetch;
let modo: 'servidor' | 'cae' | 'error500' = 'servidor';
let ipCliente = 0;
globalThis.fetch = (async (entrada: unknown, init?: RequestInit) => {
  const url = String(entrada);
  if (!url.startsWith('/api/')) return fetchAnterior(entrada as RequestInfo, init);
  const metodo = init?.method ?? 'GET';
  peticiones.push({ metodo, ruta: url, cuerpo: init?.body ? JSON.parse(String(init.body)) : undefined });
  if (modo === 'cae') throw new TypeError('fetch failed');
  if (modo === 'error500') return new Response('{}', { status: 500, headers: { 'content-type': 'application/json' } });
  const req = new Request(`https://chamusqueros.vercel.app${url}`, {
    method: metodo, body: init?.body, headers: { ...(init?.headers as Record<string, string>), 'x-forwarded-for': `10.9.${++ipCliente % 250}.1, 76.76.21.21` },
  });
  const ruta = url.split('?')[0];
  if (ruta === '/api/sala') return metodo === 'POST' ? salaApi.POST(req) : salaApi.GET(req);
  if (ruta === '/api/perfil') return metodo === 'PUT' ? perfilApi.PUT(req) : perfilApi.GET(req);
  throw new Error(`ruta inesperada en la prueba: ${url}`);
}) as typeof fetch;

const darIdentidad = (d: { id: string; token: string }) => { memoria.set('chamusqueros:id', JSON.stringify(d.id)); memoria.set('chamusqueros:retos-token', d.token); };
const sinIdentidad = () => memoria.clear();
const limpiar = () => { peticiones.length = 0; reiniciarConteo(); modo = 'servidor'; };

// CA-3: con perfil, 1 petición (POST crear), 0 al perfil, 0 a /api/sala sin código; 5 consultas y 0 llamadas a Ably.
{
  const d = await conPerfil('Eva');
  darIdentidad(d);
  limpiar();
  const r = await crearDesdeFinal();
  assert.equal(r.t, 'sala');
  assert.equal(peticiones.length, 1);
  assert.deepEqual(peticiones[0], { metodo: 'POST', ruta: '/api/sala', cuerpo: { accion: 'crear' } });
  assert.ok(!peticiones.some((p) => p.ruta.startsWith('/api/perfil')));
  if (r.t === 'sala') {
    assert.match(r.respuesta.sala.codigo, /^[A-Z2-9]{6}$/);
    assert.equal(r.respuesta.link, `https://chamusqueros.vercel.app/?sala=${r.respuesta.sala.codigo}`, 'el enlace es el que mandó el servidor');
  }
  assert.deepEqual(etiquetas(), ['hashDe', 'contarSalas', 'leerPerfil', 'limpiar', 'crearSala']);
  assert.equal(s.ably.llamadas.length, 0);

  // Sin estado entre llamadas: otra llamada hace otra petición, no reusa la anterior.
  limpiar();
  await crearDesdeFinal();
  assert.equal(peticiones.length, 1);
}

// CA-4: sin perfil, 1 GET sin credenciales y nada más; con apodo, PUT y POST; total 3 llamadas y 8 consultas; nada de la carrera en los cuerpos.
{
  sinIdentidad();
  limpiar();
  const r = await crearDesdeFinal();
  assert.deepEqual(r, { t: 'apodo' });
  assert.equal(peticiones.length, 1);
  assert.deepEqual(peticiones[0], { metodo: 'GET', ruta: '/api/sala', cuerpo: undefined });
  assert.equal(s.bd.consultas.length, 0, 'comprobar la disponibilidad no toca la base');
  assert.equal(memoria.size, 0, 'sin clic en el apodo no se crea ni guarda ninguna identidad');
  await crearPerfil('Chamuco');
  const r2 = await crearDesdeFinal();
  assert.equal(r2.t, 'sala');
  assert.deepEqual(peticiones.map((p) => `${p.metodo} ${p.ruta}`), ['GET /api/sala', 'PUT /api/perfil', 'POST /api/sala']);
  assert.deepEqual(peticiones[2].cuerpo, { accion: 'crear' });
  assert.ok(!JSON.stringify(peticiones).includes('Marco') && !JSON.stringify(peticiones).includes('Pérez'));
  assert.equal(s.bd.consultas.length, 8, 'sin perfil, hasta el lobby: 8 consultas');
  assert.deepEqual(etiquetas().slice(0, 3), ['guardarPerfil', 'leerPerfil', 'mejorCarrera']);
  assert.equal(s.ably.llamadas.length, 0);
}

// Un token guardado que el servidor no conoce (sin perfil): cae en el flujo de siempre.
{
  darIdentidad(s.nuevoDispositivo('Fantasma'));
  limpiar();
  assert.deepEqual(await crearDesdeFinal(), { t: 'apodo' });
  assert.equal(peticiones.length, 1);
}

// CA-5: Retos en línea no disponible, con y sin perfil: aviso exacto, definitivo, 0 consultas.
await sinAbly(async () => {
  const noDisponible = { t: 'fallo', mensaje: 'Retos en línea no está disponible ahora. Probá más tarde desde Retos, en el inicio.', definitivo: true };
  darIdentidad(s.nuevoDispositivo('Gus'));
  limpiar();
  assert.deepEqual(await crearDesdeFinal(), noDisponible);
  assert.equal(peticiones.length, 1);
  assert.equal(s.bd.consultas.length, 0);
  sinIdentidad();
  limpiar();
  assert.deepEqual(await crearDesdeFinal(), noDisponible);
  assert.deepEqual(peticiones, [{ metodo: 'GET', ruta: '/api/sala', cuerpo: undefined }]);
  assert.equal(s.bd.consultas.length, 0);
});

// CA-6: tope por dispositivo: aviso exacto, definitivo, 2 consultas.
{
  const d = await conPerfil('Hugo');
  darIdentidad(d);
  for (let i = 0; i < SALAS_POR_HORA; i++) assert.equal((await crearDesdeFinal()).t, 'sala');
  limpiar();
  const r = await crearDesdeFinal();
  assert.deepEqual(r, { t: 'fallo', mensaje: 'Ya creaste varias salas seguido. Probá en un rato desde Retos, en el inicio.', definitivo: true });
  assert.equal(peticiones.length, 1);
  assert.deepEqual(etiquetas(), ['hashDe', 'contarSalas']);
}

// CA-7: red caída (reintentable, aviso exacto) y error 500 (reintentable, aviso genérico); cada clic hace una petición nueva.
{
  darIdentidad(await conPerfil('Ines'));
  limpiar();
  modo = 'cae';
  assert.deepEqual(await crearDesdeFinal(), { t: 'fallo', mensaje: 'No hay conexión con el servidor. Probá de nuevo.', definitivo: false });
  assert.equal(peticiones.length, 1);
  assert.deepEqual(await crearDesdeFinal(), { t: 'fallo', mensaje: 'No hay conexión con el servidor. Probá de nuevo.', definitivo: false });
  assert.equal(peticiones.length, 2, 'el siguiente clic hace una petición nueva');
  limpiar();
  modo = 'error500';
  assert.deepEqual(await crearDesdeFinal(), { t: 'fallo', mensaje: 'No se pudo crear la sala. Probá de nuevo.', definitivo: false });
  assert.equal(peticiones.length, 1);
  // Sin perfil y sin conexión: la comprobación de disponibilidad falla como "no disponible" (cualquier falla cuenta como no, como en la entrada de Retos).
  sinIdentidad();
  limpiar();
  modo = 'cae';
  assert.deepEqual(await crearDesdeFinal(), { t: 'fallo', mensaje: AVISOS.noDisponible, definitivo: true });   // Decisión 11 de la spec
  limpiar();
}
assert.deepEqual(AVISOS, {
  noDisponible: 'Retos en línea no está disponible ahora. Probá más tarde desde Retos, en el inicio.',
  sinRed: 'No hay conexión con el servidor. Probá de nuevo.',
  tope: 'Ya creaste varias salas seguido. Probá en un rato desde Retos, en el inicio.',
  otro: 'No se pudo crear la sala. Probá de nuevo.',
});

// ---------- Estático (CA-2, CA-10, CA-12, CA-13; RF-03, RF-08, RF-09, RF-14, RF-15) ----------
const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8');
const main = leer('../src/main.ts');
const desdeFinal = leer('../src/retos/online/desde-final.ts');
const indice = leer('../src/retos/index.ts');
const cuerpoDe = (texto: string, inicio: string, fin: string) => {
  const a = texto.indexOf(inicio);
  assert.ok(a >= 0, `no está ${inicio}`);
  const b = texto.indexOf(fin, a + inicio.length);
  assert.ok(b > a, `no cierra ${inicio}`);
  return texto.slice(a, b);
};

// CA-2: orden de la pantalla final.
{
  const orden = ['id="share"', 'id="download"', 'id="rankBox"', 'id="retarBox"', 'id="again"', 'class="panel donate"', '${footer()}'].map((x) => {
    const i = main.indexOf(x, main.indexOf('function finish()'));
    assert.ok(i > 0, `falta ${x} en finish()`);
    return i;
  });
  assert.deepEqual([...orden].sort((a, b) => a - b), orden, 'orden: #share, #download, #rankBox, #retarBox, #again, donación, pie');
  const entre = cuerpoDe(main, 'id="retarBox"', 'id="again"');
  assert.ok(entre.includes('class="panel"') && entre.includes('<span class="eyebrow">Ranking global') === false, 'el bloque queda entre el ranking y los totales');
  assert.match(main, /id="rankBox">.*<\/section>\n\s*\$\{RETAR_DESDE_FINAL \? `<section class="panel" id="retarBox">/, '#retarBox va justo después del ranking');
  assert.match(main, /<button class="btn big" id="again">Jugar otra carrera<\/button>\n\s*\$\{DONATE_URL \? `<section class="panel donate"><h3>¿Te gustó\?<\/h3>/, '"Jugar otra carrera" y "¿Te gustó?" siguen contiguos');
  assert.equal((main.match(/donateLink\(/g) ?? []).length, 3, 'mismos enlaces de donación que la rama base');
  assert.ok(/id="retarAviso" role="status"/.test(main), 'el aviso va en una región role="status"');
  assert.ok(/id="retar" type="button"/.test(main));
  // Ajuste post-revisión UX: nombre único de la acción, aviso de que se sale de la pantalla y bloque compacto (sin eyebrow ni párrafo largo).
  const bloque = cuerpoDe(main, '<section class="panel" id="retarBox">', '</section>');
  assert.ok(bloque.includes('>Retar a alguien en línea</button>'), 'botón: Retar a alguien en línea');
  assert.ok(bloque.includes('Salís de esta pantalla al crear la sala: antes, guardá la imagen de tu carta.'), 'aviso de que se sale de la final');
  assert.ok(!bloque.includes('eyebrow') && !main.includes('Retar a un amigo'), 'sin eyebrow y sin el nombre anterior');
  assert.ok(/#retarBox \{ padding: 14px 16px; gap: 0; \}/.test(readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')), 'estilo compacto del bloque');
  assert.ok(readFileSync(new URL('../src/retos/index.ts', import.meta.url), 'utf8').includes("opcion('Retar a alguien en línea'"), 'misma etiqueta en la entrada de Retos');
}

// CA-13 / RF-15: el interruptor está en exactamente 2 condiciones más su declaración.
{
  assert.equal((main.match(/RETAR_DESDE_FINAL/g) ?? []).length, 3, 'declaración y dos condiciones');
  assert.match(main, /^const RETAR_DESDE_FINAL = true;/m, 'valor publicado: encendido');
  assert.equal((main.match(/\$\{RETAR_DESDE_FINAL \? `/g) ?? []).length, 1, 'condición del bloque');
  assert.equal((main.match(/if \(RETAR_DESDE_FINAL\) document\.getElementById\('retar'\)!\.onclick = retarDesdeFinal;/g) ?? []).length, 1, 'condición del enlace del manejador');
}

// CA-10: nada de ./retos/ de forma estática salvo el protocolo; el módulo nuevo solo con import() en el manejador del clic.
{
  const estaticos = [...main.matchAll(/^import\b[^;]*?from\s*'(\.\/retos\/[^']+)'/gms)].map((m) => m[1]);
  assert.ok(estaticos.every((x) => x === './retos/online/protocolo'), `importaciones estáticas de retos: ${estaticos.join(', ')}`);
  assert.equal((main.match(/import\('\.\/retos\/online\/desde-final'\)/g) ?? []).length, 1);
  const manejador = cuerpoDe(main, 'function retarDesdeFinal()', '\n}\n');
  assert.ok(manejador.includes("import('./retos/online/desde-final')"), 'se pide dentro del manejador');
  assert.ok(!main.includes("from './retos/online/desde-final'"));
  assert.match(desdeFinal, /export async function crearDesdeFinal\(\): Promise<Intento>/, 'sin parámetros');
  assert.match(manejador, /m\.crearDesdeFinal\(\)/);
  for (const x of ['career', 'fullName', 'setup', 'innerHTML', 'localStorage', 'console.', 'sala=']) assert.ok(!desdeFinal.includes(x), `desde-final.ts contiene ${x}`);
  // RF-02 / RF-08 / RF-09: el manejador no usa temporizadores, menús de compartir, historial ni datos de la carrera.
  for (const x of ['setInterval', 'setTimeout', 'navigator.share', 'clipboard', 'window.open', 'history.', 'location', 'career', 'fullName', 'finish']) {
    assert.ok(!manejador.includes(x), `retarDesdeFinal contiene ${x}`);
  }
  // CA-8 / RF-03: el candado se pone antes de la primera espera.
  assert.ok(manejador.indexOf('btn.disabled = true') > 0 && manejador.indexOf('btn.disabled = true') < manejador.indexOf('import('), 'disabled antes del import()');
  assert.ok(manejador.includes("'Creando la sala…'"));
  // RF-14: sin segundo argumento, abrirRetos usa su alSalir por defecto, que es home (nunca finish()).
  const llamadas = [...manejador.matchAll(/abrirRetos\(([^)]*)\)/g)].map((m) => m[1]);
  assert.deepEqual(llamadas, ['{ creada: r.respuesta }', "'retar'"], 'abrirRetos sin alSalir');
  assert.match(main, /function abrirRetos\(destino\?: DestinoRetos, alSalir: \(\) => void = home\)/);
  assert.ok(!/alSalir[^\n]*finish/.test(main), 'ningún alSalir llama a finish()');
}

// CA-12 / CA-1: finish() sigue empezando igual; el bloque nuevo no agrega temporizadores.
{
  assert.match(main, /function finish\(\) \{\n  contarCarrera\('terminada'\);\n  borrarCarrera\(\);/);
  assert.ok(!/<section class="panel" id="retarBox">[^`]*(setInterval|setTimeout)/.test(main));
}

// Retos: las dos ramas nuevas van antes de la rama genérica de { sala }.
{
  const generica = indice.indexOf('m.unirseConLink(sh, destino.sala)');
  const retar = indice.indexOf("destino === 'retar'");
  const creada = indice.indexOf("'creada' in destino");
  assert.ok(retar > 0 && creada > retar && generica > creada, 'orden de las ramas de destino');
  assert.ok(indice.includes('m.crearSalaNueva(sh)') && indice.includes('m.entrarEnSala(sh, destino.creada)'));
}

s.restaurar();
console.log('retar-desde-final: ok');
