// Retos Fútbol, categoría "Preguntas" (bloque B): 5 preguntas por jugador, 20 s cada una y muerte súbita si hay empate.
// Cumple el contrato A↔B de specs/retos-futbol/plan.md ("Interfaz A↔B"): pinta solo dentro de su contenedor, llama a onFin una sola vez
// (después de "Ver resultado"), devuelve una cancelación idempotente y no toca `document` al importarse, así la lógica pura se prueba con
// tsx (scripts/trivia.test.ts). Todo el texto entra con h()/textContent: nada se interpreta como marcado (RF-29). No usa el almacenamiento (RF-28).
import { h, type Indice, type JugarReto, type Pareja, type ResultadoReto } from './comun';
import banco from './preguntas.json';

// ---------- Lógica pura (sin DOM) ----------

export type Dificultad = 1 | 2 | 3;
export interface PreguntaBanco { id: string; tema: string; dificultad: Dificultad; pregunta: string; opciones: string[]; correcta: number; fuente: string; verificado: string; origen: string }
/** Una pregunta ya preparada para jugar: opciones barajadas y `correcta` recalculada. */
export interface PreguntaJuego { id: string; dificultad: Dificultad; pregunta: string; opciones: string[]; correcta: number }
export type Azar = () => number;

/** Dificultad de cada una de las 5 preguntas de un jugador (RF-19). */
export const DIFICULTADES: readonly Dificultad[] = [1, 1, 2, 2, 3];
export const TIEMPO_MS = 20000;
export const MAX_RONDAS = 3;
/** Segundos restantes en los que el reloj se anuncia a lectores de pantalla; 0 es "se acabó el tiempo" (RF-26). */
export const UMBRALES = [10, 5, 0] as const;

/** Fisher-Yates sobre una copia. */
export function barajar<T>(a: readonly T[], azar: Azar = Math.random): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function preparar(p: PreguntaBanco, azar: Azar): PreguntaJuego {
  const orden = barajar(p.opciones.map((texto, i) => ({ texto, ok: i === p.correcta })), azar);
  return { id: p.id, dificultad: p.dificultad, pregunta: p.pregunta, opciones: orden.map((o) => o.texto), correcta: orden.findIndex((o) => o.ok) };
}

/** 5 preguntas para cada jugador con las dificultades 1, 1, 2, 2, 3. En cada puesto, los dos jugadores reciben preguntas distintas de la misma dificultad; ninguna se repite en la partida. */
export function repartir(preguntas: readonly PreguntaBanco[], azar: Azar = Math.random): [PreguntaJuego[], PreguntaJuego[]] {
  const usadas = new Set<string>();
  const a: PreguntaJuego[] = [];
  const b: PreguntaJuego[] = [];
  for (const d of DIFICULTADES) {
    const [p1, p2] = barajar(preguntas.filter((p) => p.dificultad === d && !usadas.has(p.id)), azar);
    if (!p2) throw new Error(`Faltan preguntas de dificultad ${d}`);
    usadas.add(p1.id);
    usadas.add(p2.id);
    a.push(preparar(p1, azar));
    b.push(preparar(p2, azar));
  }
  return [a, b];
}

/** Gana quien acierta más; null si hay empate. */
export const ganador = (puntos: readonly [number, number]): Indice | null => (puntos[0] > puntos[1] ? 0 : puntos[1] > puntos[0] ? 1 : null);

/** Una ronda de muerte súbita: dos preguntas nuevas de dificultad media (una para cada jugador). Si ya no quedan medias, completa con las demás. */
export function muerteSubita(preguntas: readonly PreguntaBanco[], usadas: ReadonlySet<string>, azar: Azar = Math.random): [PreguntaJuego, PreguntaJuego] {
  const libres = preguntas.filter((p) => !usadas.has(p.id));
  const [p1, p2] = [...barajar(libres.filter((p) => p.dificultad === 2), azar), ...barajar(libres.filter((p) => p.dificultad !== 2), azar)];
  if (!p2) throw new Error('No quedan preguntas para la muerte súbita');
  return [preparar(p1, azar), preparar(p2, azar)];
}

/** Resultado del duelo: `rondas` son las de muerte súbita ya jugadas (si acertó el jugador 0 y si acertó el 1). Gana quien acierta y el otro no; tras MAX_RONDAS iguales, empate. */
export function resultadoDuelo(puntos: readonly [number, number], rondas: readonly (readonly [boolean, boolean])[]): { ganador: Indice | null; terminado: boolean } {
  const g = ganador(puntos);
  if (g !== null) return { ganador: g, terminado: true };
  for (const [a, b] of rondas) if (a !== b) return { ganador: a ? 0 : 1, terminado: true };
  return { ganador: null, terminado: rondas.length >= MAX_RONDAS };
}

/** Anuncios del reloj que ya corresponden con ese tiempo restante y todavía no se hicieron (con la pestaña en segundo plano puede haber varios a la vez). */
export function anunciosPendientes(restanteMs: number, hechos: ReadonlySet<number>): number[] {
  return UMBRALES.filter((t) => restanteMs <= t * 1000 && !hechos.has(t));
}

/** Ciclo de vida de la partida: `onFin` se llama una sola vez, nunca después de cancelar, y cancelar es idempotente. */
export function crearControl(onFin: (r: ResultadoReto) => void) {
  let activo = true;
  const limpiezas: (() => void)[] = [];
  const limpiar = () => { while (limpiezas.length) limpiezas.pop()!(); };
  return {
    get activo() { return activo; },
    alLimpiar(f: () => void) { limpiezas.push(f); },
    terminar(r: ResultadoReto): boolean {
      if (!activo) return false;
      activo = false;
      limpiar();
      onFin(r);
      return true;
    },
    cancelar() {
      if (!activo) return;
      activo = false;
      limpiar();
    },
  };
}

// ---------- Pantallas ----------

const BANCO = banco as unknown as PreguntaBanco[];
const ESPERA_TOQUE_MS = 300;  // un doble toque en "Listo" o "Siguiente" no responde la pregunta que aparece justo debajo
interface Siguiente { texto: string; accion: () => void }

export const jugarTrivia: JugarReto = (contenedor, jugadores: Pareja, onFin, opciones = {}) => {
  const empieza: Indice = opciones.empieza ?? 0;
  const otro: Indice = empieza === 0 ? 1 : 0;
  const control = crearControl(onFin);
  const puntos: [number, number] = [0, 0];
  const rondas: [boolean, boolean][] = [];
  const raiz = h('div', { class: 'rq', tabindex: '-1' });
  const anuncio = h('p', { class: 'rq-sr', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const zona = h('div', { class: 'rq-zona' });
  raiz.append(anuncio, zona);
  contenedor.replaceChildren(raiz);

  let reloj: ReturnType<typeof setInterval> | undefined;
  const parar = () => { if (reloj !== undefined) { clearInterval(reloj); reloj = undefined; } };
  let teclas: ((n: number, e: Event) => void) | null = null;
  let ultimoGesto = -Infinity;  // timeStamp del último toque que cambió de pantalla (reloj de los eventos, no el del juego)
  control.alLimpiar(parar);
  control.alLimpiar(() => { teclas = null; });
  raiz.addEventListener('keydown', (e) => {
    const n = e.key.length === 1 ? '1234'.indexOf(e.key) : -1;
    if (n < 0 || !teclas || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    teclas(n, e);
  });

  const anunciar = (msg: string) => anuncio.replaceChildren(h('span', {}, msg));
  const mostrar = (pantalla: HTMLElement, foco: HTMLElement) => {
    parar();
    teclas = null;
    zona.replaceChildren(pantalla);
    foco.focus();
  };
  const gesto = (e: Event, f: () => void) => { ultimoGesto = e.timeStamp; f(); };

  let listas: [PreguntaJuego[], PreguntaJuego[]];
  const usadas = new Set<string>();
  try {
    listas = repartir(BANCO);
    for (const l of listas) for (const p of l) usadas.add(p.id);
  } catch {
    zona.replaceChildren(h('p', { role: 'alert', class: 'rq-detalle' }, 'No se pudieron preparar las preguntas. Salí e intentá de nuevo.'));
    return control.cancelar;
  }

  function relevo(jugador: Indice, detalle: string, alListo: () => void) {
    const titulo = h('h2', { class: 'rq-titulo', tabindex: '-1' }, `Turno de ${jugadores[jugador]}`);
    const listo = h('button', { type: 'button', class: 'btn big rq-listo' }, 'Listo');
    listo.addEventListener('click', (e) => gesto(e, alListo));
    mostrar(
      h('section', { class: 'rq-pantalla rq-relevo' },
        h('p', { class: 'rq-eyebrow' }, 'Preguntas'),
        titulo,
        h('p', { class: 'rq-detalle' }, detalle),
        h('p', { class: 'rq-nota' }, 'Respondé con un toque o con las teclas 1 a 4.'),
        listo),
      titulo,
    );
  }

  function pregunta(jugador: Indice, p: PreguntaJuego, cabecera: string, alResponder: (acierto: boolean) => void, siguiente: () => Siguiente) {
    let respondida = false;
    const limite = performance.now() + TIEMPO_MS;
    const hechos = new Set<number>();
    const seg = h('span', { class: 'rq-seg', 'aria-hidden': 'true' }, String(TIEMPO_MS / 1000));
    const barra = h('i');
    const titulo = h('h2', { class: 'rq-pregunta', tabindex: '-1', id: 'rq-pregunta' }, p.pregunta);
    const marcas = p.opciones.map(() => h('span', { class: 'rq-marca' }));
    const botones = p.opciones.map((texto, i) =>
      h('button', { type: 'button', class: 'rq-op', 'aria-keyshortcuts': String(i + 1) },
        h('span', { class: 'rq-n', 'aria-hidden': 'true' }, String(i + 1)), h('span', { class: 'rq-t' }, texto), marcas[i]));
    const pie = h('div', { class: 'rq-pie' });

    const responder = (i: number, e?: Event) => {
      if (respondida || !control.activo) return;
      if (e && e.timeStamp - ultimoGesto < ESPERA_TOQUE_MS) return;
      respondida = true;
      parar();
      teclas = null;
      const acierto = i === p.correcta;
      alResponder(acierto);
      botones.forEach((b, k) => {
        b.disabled = true;
        if (k === p.correcta) { b.classList.add('rq-ok'); marcas[k].replaceChildren(h('span', { 'aria-hidden': 'true' }, '✓ '), 'Correcta'); }
        else if (k === i) { b.classList.add('rq-mal'); marcas[k].replaceChildren(h('span', { 'aria-hidden': 'true' }, '✗ '), 'Tu respuesta'); }
      });
      const sig = siguiente();
      const boton = h('button', { type: 'button', class: 'btn big rq-sig', 'aria-describedby': 'rq-fb' }, sig.texto);
      boton.addEventListener('click', (ev) => gesto(ev, sig.accion));
      pie.replaceChildren(
        h('div', { class: `rq-fb ${acierto ? 'rq-ok' : 'rq-mal'}`, id: 'rq-fb' },
          h('p', { class: 'rq-fb-t' }, h('span', { 'aria-hidden': 'true' }, acierto ? '✓ ' : '✗ '), i < 0 ? 'Se acabó el tiempo: incorrecta' : acierto ? 'Correcta' : 'Incorrecta'),
          acierto ? '' : h('p', { class: 'rq-fb-d' }, `La respuesta correcta es: ${p.opciones[p.correcta]}`)),
        boton);
      boton.focus();
    };
    botones.forEach((b, i) => b.addEventListener('click', (e) => responder(i, e)));

    const tick = () => {
      const resto = limite - performance.now();
      seg.textContent = String(Math.max(0, Math.ceil(resto / 1000)));
      barra.style.width = `${Math.max(0, Math.min(1, resto / TIEMPO_MS)) * 100}%`;
      const nuevos = anunciosPendientes(resto, hechos);
      if (nuevos.length) {
        nuevos.forEach((t) => hechos.add(t));
        anunciar(Math.min(...nuevos) === 0 ? 'Se acabó el tiempo' : `${Math.ceil(resto / 1000)} segundos`);
      }
      if (resto <= 0) responder(-1);
    };

    mostrar(
      h('section', { class: 'rq-pantalla rq-turno', 'aria-labelledby': 'rq-pregunta' },
        h('p', { class: 'rq-cab' }, `${jugadores[jugador]} · ${cabecera}`),
        h('div', { class: 'rq-reloj' }, h('p', { class: 'rq-tiempo' }, seg, h('span', { class: 'rq-unidad', 'aria-hidden': 'true' }, ' s')), h('div', { class: 'rq-barra', 'aria-hidden': 'true' }, barra)),
        titulo,
        h('div', { class: 'rq-ops', role: 'group', 'aria-labelledby': 'rq-pregunta' }, ...botones),
        pie),
      titulo,
    );
    teclas = (n, e) => responder(n, e);
    anunciar(`${TIEMPO_MS / 1000} segundos`);
    reloj = setInterval(tick, 250);
  }

  /** Las 5 preguntas de un jugador, una tras otra. */
  function tanda(jugador: Indice, i: number, alAcabar: () => Siguiente) {
    const lista = listas[jugador];
    pregunta(jugador, lista[i], `Pregunta ${i + 1} de ${lista.length}`, (a) => { if (a) puntos[jugador]++; },
      () => (i + 1 < lista.length ? { texto: 'Siguiente', accion: () => tanda(jugador, i + 1, alAcabar) } : alAcabar()));
  }

  const terminar = (g: Indice | null) => control.terminar({ ganador: g, puntos: [puntos[0], puntos[1]] });
  /** Qué sigue tras el último acierto o fallo: el resultado si ya se decidió, o el desempate. */
  const veredicto = (textoSeguir: string, alSeguir: () => void): Siguiente => {
    const r = resultadoDuelo(puntos, rondas);
    return r.terminado ? { texto: 'Ver resultado', accion: () => terminar(r.ganador) } : { texto: textoSeguir, accion: alSeguir };
  };

  /** Muerte súbita: una pregunta media para cada uno, hasta MAX_RONDAS rondas. */
  function ronda(n: number) {
    const [pa, pb] = muerteSubita(BANCO, usadas, Math.random);
    usadas.add(pa.id);
    usadas.add(pb.id);
    const acierto: [boolean, boolean] = [false, false];
    const detalle = `Van ${puntos[0]} a ${puntos[1]}: hay empate. Desempate, ronda ${n} de ${MAX_RONDAS}: una pregunta para cada uno.`;
    const cab = `Desempate, ronda ${n} de ${MAX_RONDAS}`;
    relevo(empieza, detalle, () =>
      pregunta(empieza, pa, cab, (a) => { acierto[empieza] = a; }, () => ({
        texto: 'Pasar el celular',
        accion: () => relevo(otro, detalle, () =>
          pregunta(otro, pb, cab, (a) => { acierto[otro] = a; }, () => {
            rondas.push(acierto);
            return veredicto('Siguiente ronda', () => ronda(n + 1));
          })),
      })));
  }

  const finDeTandas = (): Siguiente => veredicto('Desempate', () => ronda(1));
  const detalleTanda = `${DIFICULTADES.length} preguntas, ${TIEMPO_MS / 1000} segundos para cada una. Cuando tengas el celular, tocá «Listo».`;
  const inicio = () =>
    relevo(empieza, detalleTanda, () =>
      tanda(empieza, 0, () => ({
        texto: 'Pasar el celular',
        accion: () => relevo(otro, detalleTanda, () => tanda(otro, 0, finDeTandas)),
      })));

  // El CSS viaja aparte (no se puede importar de forma estática sin romper la prueba con tsx): se pinta cuando ya está aplicado.
  void import('./trivia.css').catch(() => undefined).then(() => { if (control.activo) inicio(); });
  return control.cancelar;
};
