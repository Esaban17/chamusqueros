// Prueba del verificador del banco de "¿De dónde es?" (scripts/futbolistas.ts) contra un banco sintético y una fuente falsa: CA-9. Sin red:
//   npx tsx scripts/futbolistas.test.ts
// También comprueba, sin red, que el banco real publicado (src/retos/futbolistas.json) cumple la parte estructural y que la muestra de revisión sale de él.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import banco from '../src/retos/futbolistas.json';
import { SELECCIONES } from '../src/retos/selecciones';
import {
  MAX_TOTAL, MIN_TOTAL, diagnosticar, evaluarEntidad, nombreDe, verificarContraFuente, verificarEstructura,
  type Entidad, type Entrada, type Equipos, type Fuente,
} from './futbolistas';

const CONFEDS = ['CONCACAF', 'CONMEBOL', 'UEFA', 'AFC', 'CAF'] as const;
const LETRAS = 'abcdefghijklmnopqrstuvwxyz';
/** Nombre solo con letras (el alfabeto del ping pong no admite dígitos): "Jugador Abc Def". */
const nombreSintetico = (n: number) => `Jugador ${LETRAS[n % 26].toUpperCase()}${LETRAS[Math.floor(n / 26) % 26]}${LETRAS[Math.floor(n / 676) % 26]} Apellido`;

/** Banco sintético que cumple todo: `cuotas` por confederación repartidas entre sus selecciones. */
function sintetico(cuotas: Record<(typeof CONFEDS)[number], number>): Entrada[] {
  const r: Entrada[] = [];
  let n = 0;
  for (const c of CONFEDS) {
    const sels = Object.keys(SELECCIONES).filter((s) => SELECCIONES[s].confed === c);
    for (let i = 0; i < cuotas[c]; i++) { n++; r.push({ q: `Q${900000 + n}`, nombre: nombreSintetico(n), sel: sels[i % sels.length] }); }
  }
  return r;
}
const BUENO = sintetico({ CONCACAF: 90, CONMEBOL: 90, UEFA: 160, AFC: 50, CAF: 60 });   // 450
assert.deepEqual(verificarEstructura(BUENO), [], 'el banco sintético bueno tiene que pasar');
const sinMutar = JSON.stringify(BUENO);

const falla = (banco: unknown, patron: RegExp, que: string) => {
  const e = verificarEstructura(banco);
  assert.ok(e.some((m) => patron.test(m)), `${que}: se esperaba un error ${patron}, y salió ${JSON.stringify(e.slice(0, 3))}`);
};

// ---------- Estructura ----------
falla(BUENO.slice(0, MIN_TOTAL - 1), /tiene que tener de 400 a 800/, 'menos de 400');
falla([...BUENO, ...sintetico({ CONCACAF: 100, CONMEBOL: 100, UEFA: 100, AFC: 100, CAF: 100 }).map((x, i) => ({ ...x, q: `Q${5000000 + i}`, nombre: nombreSintetico(i + 3000) }))].slice(0, MAX_TOTAL + 1), /tiene que tener de 400 a 800/, 'más de 800');
falla([...BUENO, { ...BUENO[0] }], /repetido/, 'q repetido');
falla([...BUENO.slice(1), { ...BUENO[1], q: 'Q777' }], /ya lo lleva/, 'nombre repetido entre dos personas');
falla([...BUENO.slice(1), { ...BUENO[1], q: 'Q778', nombre: ` ${BUENO[1].nombre.toUpperCase()}` }], /ya lo lleva|se puede mostrar/, 'nombre repetido con otras mayúsculas');
falla([{ ...BUENO[0], sel: 'Atlántida' }, ...BUENO.slice(1)], /no está en SELECCIONES/, 'selección inventada');
falla([{ ...BUENO[0], nombre: '<img src=x onerror=alert(1)>' }, ...BUENO.slice(1)], /no se puede mostrar con seguridad/, 'nombre con marcado');
falla([{ ...BUENO[0], nombre: 'Jugador 5' }, ...BUENO.slice(1)], /no se puede mostrar con seguridad/, 'nombre con dígitos');
falla([{ ...BUENO[0], q: 'Q0' }, ...BUENO.slice(1)], /q inválido/, 'q mal formado');
falla([{ ...BUENO[0], q: 'https://evil.example/Q1' }, ...BUENO.slice(1)], /q inválido/, 'q con URL');
falla([{ ...BUENO[0], extra: 1 }, ...BUENO.slice(1)], /exactamente q, nombre y sel/, 'campo extra');
falla([{ q: 'Q1', nombre: 'Ana Pérez' }, ...BUENO.slice(1)], /exactamente q, nombre y sel/, 'falta un campo');
falla('no es lista', /no es una lista/, 'no es lista');
falla(sintetico({ CONCACAF: 59, CONMEBOL: 100, UEFA: 160, AFC: 50, CAF: 60 }), /CONCACAF tiene 59: el mínimo es 60/, 'poca CONCACAF');
falla(sintetico({ CONCACAF: 90, CONMEBOL: 59, UEFA: 160, AFC: 50, CAF: 60 }), /CONMEBOL tiene 59: el mínimo es 60/, 'poca CONMEBOL');
falla(sintetico({ CONCACAF: 90, CONMEBOL: 90, UEFA: 160, AFC: 50, CAF: 39 }), /CAF tiene 39: el mínimo es 40/, 'poca CAF');
falla(sintetico({ CONCACAF: 90, CONMEBOL: 90, UEFA: 160, AFC: 24, CAF: 60 }), /AFC tiene 24: el mínimo es 25/, 'poca AFC');
falla(sintetico({ CONCACAF: 60, CONMEBOL: 60, UEFA: 400, AFC: 25, CAF: 40 }), /UEFA tiene 400 de 585/, 'UEFA pasa del 45 %');
assert.deepEqual(verificarEstructura(sintetico({ CONCACAF: 90, CONMEBOL: 90, UEFA: 225, AFC: 45, CAF: 50 })), [], 'UEFA con justo 45 % (225 de 500) pasa');
falla(sintetico({ CONCACAF: 90, CONMEBOL: 90, UEFA: 226, AFC: 45, CAF: 50 }), /UEFA tiene 226 de 501/, 'UEFA con 226 de 501 (45,1 %)');
assert.equal(JSON.stringify(BUENO), sinMutar, 'verificarEstructura no muta el banco');

// ---------- Entidades: lo que dice la fuente ----------
const Q_HUMANO = 'Q5', Q_FUTBOLISTA = 'Q937857';
const equipoDe = (sel: string) => `Q9${SELECCIONES[sel].pais.slice(1)}00`;      // QID falso de la selección absoluta de cada país
const EQUIPOS: Equipos = new Map(Object.keys(SELECCIONES).map((s) => [equipoDe(s), [SELECCIONES[s].pais]]));
// Una selección de la fuente que se identifica con dos ids (P1532 y P17), como Inglaterra (P1532 = Inglaterra, P17 = Reino Unido).
EQUIPOS.set(equipoDe('Inglaterra'), [SELECCIONES.Inglaterra.pais, 'Q145']);

type Decl = { rank?: string; mainsnak: { snaktype: string; datavalue?: { value: { id: string } } } };
const decl = (id: string, rank = 'normal'): Decl => ({ rank, mainsnak: { snaktype: 'value', datavalue: { value: { id } } } });
interface Cambios { P31?: Decl[]; P106?: Decl[]; P1532?: Decl[]; P54?: Decl[]; labels?: Entidad['labels']; id?: string; missing?: string }
function entidad(x: Entrada, c: Cambios = {}): Entidad {
  return {
    id: c.id ?? x.q,
    ...(c.missing !== undefined ? { missing: c.missing } : {}),
    labels: c.labels ?? { es: { value: x.nombre } },
    claims: {
      P31: c.P31 ?? [decl(Q_HUMANO)],
      P106: c.P106 ?? [decl(Q_FUTBOLISTA), decl('Q628099')],
      P1532: c.P1532 ?? [decl(SELECCIONES[x.sel].pais)],
      P54: c.P54 ?? [decl('Q1000001'), decl(equipoDe(x.sel)), decl('Q1000002')],   // dos clubes y su selección
    },
  };
}
const ENTRADA: Entrada = { q: 'Q4242', nombre: 'Lionel Ejemplo', sel: 'Argentina' };
const ok = (c: Cambios = {}, x = ENTRADA, nombre: string | undefined = x.nombre) => evaluarEntidad(entidad(x, c), x.q, x.sel, EQUIPOS, nombre);
const noOk = (c: Cambios, patron: RegExp, que: string, x = ENTRADA) => {
  const e = ok(c, x);
  assert.ok(e.some((m) => patron.test(m)), `${que}: se esperaba ${patron}, y salió ${JSON.stringify(e)}`);
};

assert.deepEqual(ok(), [], 'la entidad buena pasa');
noOk({ P31: [decl('Q95074')] }, /no es un humano/, 'personaje');
noOk({ P106: [decl('Q628099')] }, /futbolista de asociación/, 'ocupación distinta');
noOk({ P106: [decl('Q937857', 'deprecated')] }, /futbolista de asociación/, 'ocupación deprecada');
noOk({ P1532: [decl('Q414'), decl('Q38')] }, /2 valores/, 'dos países para el deporte');
noOk({ P1532: [] }, /0 valores/, 'sin país para el deporte');
noOk({ P1532: [decl('Q38')] }, /no Q414/, 'país para el deporte de otra Selección');
noOk({ P1532: [{ mainsnak: { snaktype: 'somevalue' } }] }, /su país para el deporte es null/, 'valor desconocido');
noOk({ P54: [decl('Q1000001')] }, /ninguna selección absoluta de ese país/, 'sin selección (solo clubes)');
noOk({ P54: [decl('Q1000001'), decl('Q2000001')] }, /ninguna selección absoluta de ese país/, 'solo una selección juvenil (no figura como absoluta)');
noOk({ P54: [decl(equipoDe('Argentina')), decl(equipoDe('Italia'))] }, /también figura en otra selección absoluta/, 'dos selecciones absolutas');
noOk({ P54: [decl(equipoDe('Italia'))] }, /ninguna selección absoluta de ese país/, 'solo la de otro país');
noOk({ labels: {} }, /no tiene etiqueta/, 'sin etiqueta');
noOk({ labels: { es: { value: 'Otro Nombre' } } }, /no es su etiqueta/, 'nombre que no es la etiqueta');
noOk({ id: 'Q1' }, /no tiene esa entidad/, 'la fuente devolvió otra entidad');
noOk({ missing: '' }, /no tiene esa entidad/, 'entidad inexistente');
assert.ok(evaluarEntidad(undefined, 'Q9', 'Argentina', EQUIPOS).length, 'sin entidad');
assert.ok(evaluarEntidad(entidad(ENTRADA), 'Q4242', 'Atlántida', EQUIPOS).length, 'selección inventada');
assert.deepEqual(ok({ P1532: [decl('Q414'), decl('Q38', 'deprecated')] }), [], 'una declaración deprecada no cuenta');
assert.deepEqual(ok({ labels: { en: { value: 'Lionel Ejemplo' } } }), [], 'etiqueta en inglés si no hay en español');
// Inglaterra: la selección absoluta se identifica por P1532 o por P17; un escocés no se confunde con un inglés.
{
  const ing: Entrada = { q: 'Q5151', nombre: 'Harry Ejemplo', sel: 'Inglaterra' };
  assert.deepEqual(ok({}, ing), []);
  const esc: Entrada = { q: 'Q5152', nombre: 'Andy Ejemplo', sel: 'Escocia' };
  noOk({ P54: [decl(equipoDe('Escocia')), decl(equipoDe('Inglaterra'))] }, /también figura en otra selección absoluta/, 'escocés que también jugó con Inglaterra', esc);
}
// Nombre para mostrar: la etiqueta corta de inglés cuando la de español solo agrega apellidos.
assert.equal(nombreDe({ id: 'Q1', labels: { es: { value: 'Hugo Sánchez Márquez' }, en: { value: 'Hugo Sánchez' } } }), 'Hugo Sánchez');
assert.equal(nombreDe({ id: 'Q1', labels: { es: { value: 'Kylian Mbappé' }, en: { value: 'Kylian Mbappé' } } }), 'Kylian Mbappé');
assert.equal(nombreDe({ id: 'Q1', labels: { es: { value: 'Joaquín' }, en: { value: 'Joaquín Sánchez' } } }), 'Joaquín', 'no alarga');
assert.equal(nombreDe({ id: 'Q1', labels: { es: { value: 'Christian Noboa' }, en: { value: 'Christian' } } }), 'Christian Noboa', 'una etiqueta de una sola palabra no reemplaza al nombre completo');
assert.equal(nombreDe({ id: 'Q1', labels: { en: { value: 'Solo Inglés' } } }), 'Solo Inglés');
assert.equal(nombreDe({ id: 'Q1', labels: {} }), null);
assert.equal(diagnosticar(entidad(ENTRADA, { P31: [] }), ENTRADA.q, ENTRADA.sel, EQUIPOS)[0].codigo, 'no es humano');

// ---------- El banco completo contra una fuente falsa ----------
const fuenteDe = (b: Entrada[], cambios: Record<string, Cambios> = {}, equipos: Equipos = EQUIPOS): Fuente => ({
  equipos: async () => equipos,
  entidades: async (ids) => new Map(ids.flatMap((id) => { const x = b.find((e) => e.q === id); return x ? [[id, entidad(x, cambios[id])] as const] : []; })),
});
{
  const llamadas: number[] = [];
  const f = fuenteDe(BUENO);
  const original = f.entidades;
  f.entidades = async (ids) => { llamadas.push(ids.length); return original(ids); };
  assert.deepEqual(await verificarContraFuente(BUENO, f), [], 'el banco bueno pasa contra la fuente');
  assert.ok(llamadas.every((n) => n <= 100), 'se lee por lotes');
  assert.equal(llamadas.reduce((a, b) => a + b, 0), BUENO.length, 'se leen todos los futbolistas');
  // Un solo futbolista malo entre 450 se detecta.
  const malo = BUENO[200];
  const e = await verificarContraFuente(BUENO, fuenteDe(BUENO, { [malo.q]: { P1532: [decl('Q414'), decl('Q38')] } }));
  assert.equal(e.length, 1);
  assert.match(e[0], new RegExp(malo.q));
  assert.equal((await verificarContraFuente(BUENO, fuenteDe(BUENO, { [BUENO[0].q]: { missing: '' }, [BUENO[449].q]: { P31: [] } }))).length, 2);
  // Una fuente que devuelve casi nada de selecciones no es creíble: no se da por buena.
  assert.match((await verificarContraFuente(BUENO, fuenteDe(BUENO, {}, new Map([['Q1', ['Q2']]]))))[0], /no es creíble/);
  // Una fuente que se cae hace fallar la verificación (nunca se salta).
  await assert.rejects(verificarContraFuente(BUENO, { equipos: async () => EQUIPOS, entidades: async () => { throw new Error('sin red'); } }), /sin red/);
}

// ---------- El banco real publicado (sin red) ----------
{
  const REAL = banco as Entrada[];
  assert.deepEqual(verificarEstructura(REAL), [], 'src/retos/futbolistas.json tiene que cumplir RF-22 en su estructura');
  const muestra = new URL('./futbolistas/revision-30.json', import.meta.url);
  if (existsSync(muestra)) {
    const m = JSON.parse(readFileSync(muestra, 'utf8')) as (Entrada & { fuente: string; selQ: string })[];
    assert.equal(m.length, 30);
    assert.equal(new Set(m.map((x) => x.q)).size, 30);
    for (const x of m) {
      const real = REAL.find((r) => r.q === x.q);
      assert.ok(real && real.nombre === x.nombre && real.sel === x.sel, `${x.q} de la muestra no está igual en el banco`);
      assert.equal(x.fuente, `https://www.wikidata.org/wiki/${x.q}`);
      assert.equal(x.selQ, SELECCIONES[x.sel].pais);
    }
  }
  console.log(`banco real: ${REAL.length} futbolistas, estructura sin errores`);
}
console.log('futbolistas.test.ts: todo bien');
