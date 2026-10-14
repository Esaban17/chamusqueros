// Interfaz de los minijuegos (specs/minijuegos). Dos mecánicas: detener un marcador dentro de una zona (pase, cierre y la
// potencia del penal) y elegir un lado (atajada y la dirección del penal). La primera parte es pura (sin DOM al importar):
// la usa `simulate` para comprobar la equidad. La segunda monta el juego en una tarjeta de decisión.
import { simulatedScore } from '../engine/minigames';
import type { Rng } from '../engine/rng';
import type { MinigameKind, MinigameResult, Resolution } from '../engine/types';

// ---------- Reglas puras ----------

/** Etiqueta del resultado, por tipo (RF-07). Constantes: nunca llevan datos del jugador. */
export const LABELS: Record<MinigameKind, Record<MinigameResult, string>> = {
  penal: { ok: '¡Golazo!', half: 'Atajado', fail: 'Afuera' },
  atajada: { ok: '¡Atajado!', half: 'Rozó el balón', fail: 'Gol del rival' },
  pase: { ok: '¡Pase de gol!', half: 'Pase largo', fail: 'Interceptado' },
  cierre: { ok: '¡Cierre perfecto!', half: 'Llegaste justo', fail: 'Llegaste tarde' },
};

/** Zona de acierto (fracción del recorrido), barrido completo (ms) y ventana de reacción (ms) según la dificultad (RF-08). */
export function params(d: number) {
  const t = (d - 0.1) / 0.8;
  return { zone: 0.3 - 0.2 * t, period: 2200 - 1000 * t, window: 700 - 300 * t };
}

/** El centro de la zona se sortea dentro de este rango, para que la zona entera quepa en el recorrido. */
export const CENTER: [number, number] = [0.25, 0.75];

/** pos y center en [0, 1]. Dentro de la zona vale de 1 a 0,7 (éxito); fuera cae a 0 en un tramo de 1,5 veces su semiancho. */
export function stopScore(pos: number, center: number, zone: number): number {
  const h = zone / 2;
  const dist = Math.abs(pos - center);
  if (dist <= h) return 1 - (0.3 * dist) / h;
  return Math.max(0, 0.7 * (1 - (dist - h) / (1.5 * h)));
}

/** Lado: 0 izquierda, 1 centro, 2 derecha. */
export type Side = 0 | 1 | 2;
/** Adivinar el lado antes del disparo no es un atajo al éxito: como mucho "rozó el balón". */
export const ANTICIPATED = 0.6;

/**
 * Atajada. t: ms desde el disparo hasta que el jugador eligió (negativo: eligió antes de que patearan).
 * Lado equivocado o fuera de la ventana: 0. Después del disparo: de 1 (al instante) a 0,45 (justo a tiempo).
 */
export function sideScore(chosen: Side, kicked: Side, t: number, window: number): number {
  if (chosen !== kicked) return 0;
  if (t < 0) return ANTICIPATED;
  return t > window ? 0 : 1 - (0.55 * t) / window;
}

/** Penal: si el portero se tira al lado que elegiste, el mejor tiro llega a "a medias". */
export const penalScore = (chosen: Side, keeper: Side, power: number) => power * (chosen === keeper ? 0.5 : 1);

/** Modo por turnos: seguro, equilibrada y arriesgada acercan (0,6) o alejan (1,5) del centro el sorteo de "Simular". */
export const RISK_K = [0.6, 1, 1.5] as const;
export const riskScore = (option: 0 | 1 | 2, s: number) => Math.min(1, Math.max(0, 0.5 + RISK_K[option] * (s - 0.5)));

// ---------- Textos de la interfaz (constantes) ----------

const HELP: Record<MinigameKind, string> = {
  penal: 'Elegí a dónde patear y después detené la barra dentro de la zona. Si el portero adivina tu lado, no te sale perfecto.',
  atajada: 'El pateador va a disparar a un lado. Esperá el disparo y tocá ese lado lo más rápido que puedas. Si adivinás antes, solo rozás el balón.',
  pase: 'Detené el marcador dentro de la zona para dar el pase justo. Cuanto más al centro, mejor.',
  cierre: 'El rival se escapa: detené al defensor dentro de la zona antes de que pase. Tenés una sola pasada.',
};
const HELP_CALM = 'Sin movimiento ni reloj: elegí cuánto riesgo tomás. Más riesgo, más chances de acertar y también de fallar.';
const CALM_LABELS: Record<MinigameKind, [string, string, string]> = {
  penal: ['Colocarla', 'Con potencia', 'Al ángulo'],
  atajada: ['Quedarme', 'Tirarme al lado que mira', 'Adivinar'],
  pase: ['Al pie', 'Al espacio', 'Por arriba'],
  cierre: ['Seguir al rival', 'Anticipar', 'Barrerme'],
};
const RISK_NAMES = ['Seguro', 'Equilibrada', 'Arriesgada'];
const SIDES = ['← Izquierda', '↑ Centro', 'Derecha →'];
const MARKER: Record<MinigameKind, string> = { penal: '⚽', atajada: '⚽', pase: '⚽', cierre: '🏃' };
const MAX_MS = 15000; // RF-06: tope de todo el juego desde "Jugar"
const STEP_MS = 6000; // tope de cada paso (el penal tiene dos)
const MAX_SWEEPS = 3;

// ---------- Montaje (DOM) ----------

// ponytail: un solo minijuego vivo a la vez (variable de módulo); si hubiera dos tarjetas a la vez, un teardown por host.
let teardown: (() => void) | null = null;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text; // textContent: nada de lo que se muestra pasa por innerHTML
  return n;
};
const button = (cls: string, text: string, onClick?: () => void) => {
  const b = el('button', cls, text);
  b.type = 'button';
  if (onClick) b.onclick = onClick;
  return b;
};

/**
 * Monta el minijuego dentro de host (la tarjeta de decisión). resolve(score?) llama al motor: solo guarda la Resolution,
 * no redibuja. next() redibuja la pantalla y muestra el desenlace de texto. rng solo lo usa el modo por turnos
 * (el resto del azar de la jugada, como el lado del disparo, usa Math.random).
 * ponytail: lado del disparo, del portero y centro de la zona con Math.random; repetir una carrera con la misma semilla
 * no repite la jugada, solo el sorteo de "Simular". Si hiciera falta, derivar un rng de la semilla y el año.
 */
export function mountMinigame(host: HTMLElement, spec: { kind: MinigameKind; difficulty: number }, rng: Rng, resolve: (score?: number) => Resolution, next: () => void) {
  teardown?.(); // un solo minijuego vivo a la vez: nada de oyentes de una pantalla anterior
  const { kind, difficulty } = spec;
  if (!(kind in LABELS)) return void (resolve(), next()); // tipo desconocido: se simula directo
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches; // se lee al montar, como celebrate.ts
  const pr = params(difficulty);

  // Todo lo que corre: el reloj de cada paso, el tope de 15 s, el cuadro de animación y el teclado.
  let timers: number[] = [];
  let step = 0;
  let raf = 0;
  let onKey: ((e: KeyboardEvent) => void) | null = null;
  let playing = false;
  let done = false;

  /** Todo reloj comprueba que la pantalla siga ahí: si render() la reemplazó, no resuelve nada y se desarma todo (RF-15). */
  const later = (fn: () => void, ms: number) => window.setTimeout(() => (host.isConnected ? fn() : teardown?.()), ms);
  const setKey = (fn: ((e: KeyboardEvent) => void) | null) => {
    if (onKey) document.removeEventListener('keydown', onKey);
    onKey = fn;
    if (fn) document.addEventListener('keydown', fn);
  };
  /** Cada paso tiene su propio tope de tiempo; al pasar de paso se cancela el anterior. */
  const stepLimit = (ms: number) => {
    clearTimeout(step);
    step = later(() => playing && finish(0), ms);
  };
  const stopAll = () => {
    playing = false;
    cancelAnimationFrame(raf);
    clearTimeout(step);
    timers.forEach(clearTimeout);
    timers = [];
    setKey(null);
  };
  const onVisibility = () => {
    if (!host.isConnected) return teardown?.();
    if (document.hidden && playing && !done) listo(); // RF-15: la pestaña dejó de verse, vuelve al inicio sin resultado
  };
  document.addEventListener('visibilitychange', onVisibility);
  teardown = () => {
    stopAll();
    document.removeEventListener('visibilitychange', onVisibility);
    teardown = null;
  };

  // La región que anuncia el resultado vive siempre en la página (fuera de lo que se redibuja) para que se lea al cambiar.
  const live = el('div', 'mg-live');
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  const body = el('div', 'mg-body');
  host.replaceChildren(body, live);

  function frame(help: string, stage: HTMLElement, actions: HTMLElement[]) {
    const bar = el('div', 'mg-actions');
    bar.append(...actions);
    body.replaceChildren(el('p', 'mg-help', help), stage, bar);
  }

  function listo() {
    stopAll();
    live.textContent = '';
    const stage = el('div', 'mg-stage');
    stage.append(el('p', 'mg-wait', 'Listo cuando vos quieras.'));
    frame(calm ? HELP_CALM : HELP[kind], stage, [button('btn big', 'Jugar', start), simular()]);
  }

  /** Cierra el juego: pide el desenlace al motor y muestra primero la etiqueta, con "Continuar" (RF-07). */
  function finish(score?: number) {
    if (done) return;
    done = true;
    stopAll();
    const result = resolve(score).result ?? 'fail';
    const stage = el('div', `mg-stage mg-res mg-res-${result}`);
    const label = el('p', 'mg-label', LABELS[kind][result]);
    label.setAttribute('aria-hidden', 'true'); // lo anuncia la región viva, una sola vez
    stage.append(label);
    const go = button('btn big', 'Continuar', next);
    frame('Así salió la jugada.', stage, [go]);
    live.textContent = `${LABELS[kind][result]}.`;
    // El foco llega tarde a propósito: un último Espacio de quien jugaba con teclado no debe saltarse la etiqueta.
    timers.push(later(() => go.focus(), 700));
  }

  function start() {
    stopAll();
    playing = true;
    if (calm) return calmStep(); // RF-14: por turnos no hay reloj
    timers.push(later(() => finish(0), MAX_MS)); // RF-06: sin acción a tiempo, fallo
    if (kind === 'atajada') return keeperStep();
    if (kind === 'penal') {
      const keeper = Math.floor(Math.random() * 3) as Side;
      return sideStep((chosen) => markerStep((power) => finish(penalScore(chosen, keeper, power)), 'Ahora detené la barra dentro de la zona.'));
    }
    markerStep((score) => finish(score));
  }

  const simular = () => button('btn secondary', 'Simular', () => finish());

  // Modo por turnos: tres botones de riesgo y un sorteo. La equilibrada es exactamente "Simular".
  function calmStep() {
    const stage = el('div', 'mg-stage mg-risks');
    CALM_LABELS[kind].forEach((text, i) => {
      const b = button('btn secondary mg-risk', text);
      b.append(el('small', '', RISK_NAMES[i]));
      b.onclick = () => finish(i === 1 ? undefined : riskScore(i as 0 | 2, simulatedScore(rng, difficulty)));
      stage.append(b);
    });
    frame(HELP_CALM, stage, [simular()]);
    (stage.firstElementChild as HTMLElement).focus();
  }

  // Elegir lado: tres botones y las teclas ← ↑ → y 1 2 3. Solo cuenta la primera acción de este paso.
  function pickSide(status: string, help: string, onPick: (side: Side, at: number) => void) {
    let acted = false;
    const stage = el('div', 'mg-stage mg-sides');
    const msg = el('p', 'mg-status', status);
    const row = el('div', 'mg-lados');
    const buttons = SIDES.map((text, i) => {
      const b = button('btn secondary mg-lado', text, () => act(i as Side)); // Enter y Espacio con el foco aquí; tras un toque, el seguro ya cerró el paso
      row.append(b);
      return b;
    });
    stage.append(msg, row);
    const act = (side: Side) => {
      if (acted || !playing) return;
      acted = true;
      buttons.forEach((b, i) => b.classList.toggle('mg-elegido', i === side));
      onPick(side, performance.now());
    };
    buttons.forEach((b, i) =>
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        act(i as Side);
      }),
    );
    setKey((e) => {
      if (e.repeat || (e.target as Element).closest?.('.mg-actions')) return;
      const side = ({ ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, '1': 0, '2': 1, '3': 2 } as Record<string, Side>)[e.key];
      if (side === undefined) return;
      e.preventDefault();
      act(side);
    });
    frame(help, stage, [simular()]);
    buttons[1].focus();
    return { msg, buttons };
  }

  // Penal, paso 1: el lado. Al elegir, una pausa corta y sigue la potencia.
  function sideStep(then: (side: Side) => void) {
    stepLimit(STEP_MS);
    const { msg } = pickSide('Elegí hacia dónde patear', HELP.penal, (side) => {
      msg.textContent = 'Elegiste. Preparate para la potencia…';
      timers.push(later(() => playing && then(side), 350));
    });
  }

  // Atajada: el pateador toma carrera (0,8 a 1,6 s), dispara a un lado al azar y la pelota tarda `window` ms en llegar.
  function keeperStep() {
    const kicked = Math.floor(Math.random() * 3) as Side;
    let kickedAt = 0;
    let chosen: Side | null = null;
    const { msg, buttons } = pickSide('El pateador toma carrera…', HELP.atajada, (side, at) => {
      chosen = side;
      if (kickedAt) finish(sideScore(side, kicked, at - kickedAt, pr.window));
      else msg.textContent = 'Te adelantaste: ahora esperá el disparo…';
    });
    timers.push(
      later(() => {
        if (!playing) return;
        kickedAt = performance.now();
        msg.textContent = '¡Disparó!';
        buttons[kicked].classList.add('mg-tiro');
        buttons[kicked].append(el('span', 'mg-pelota', ' ⚽'));
        if (chosen !== null) return finish(sideScore(chosen, kicked, -1, pr.window)); // se adelantó: como mucho "rozó el balón"
        timers.push(later(() => finish(0), pr.window)); // la pelota llegó y no se movió
      }, 800 + Math.random() * 800),
    );
  }

  // Detener el marcador: cierre, un solo barrido; pase y potencia, de ida y vuelta (hasta 3 barridos).
  function markerStep(onStop: (score: number) => void, help = HELP[kind]) {
    const center = CENTER[0] + Math.random() * (CENTER[1] - CENTER[0]);
    const stage = el('div', 'mg-stage');
    const zona = button('mg-zona', '');
    zona.setAttribute('aria-label', 'Detener el marcador (toque, Espacio o Enter)');
    const track = el('div', 'mg-track');
    const zone = el('i', 'mg-zone');
    zone.style.left = `${(center - pr.zone / 2) * 100}%`;
    zone.style.width = `${pr.zone * 100}%`;
    const marker = el('i', 'mg-marker', MARKER[kind]);
    track.append(zone, marker);
    zona.append(track, el('span', 'mg-detener', 'Detener (toque, Espacio o Enter)'));
    stage.append(zona);
    frame(help, stage, [simular()]);
    zona.focus();
    const sweeps = kind === 'cierre' ? 1 : MAX_SWEEPS;
    stepLimit(pr.period * sweeps + 400); // respaldo del cuadro de animación
    const t0 = performance.now();
    let acted = false;
    const posAt = (now: number) => {
      const ph = Math.max(0, now - t0) / pr.period;
      return kind === 'cierre' ? Math.min(1, ph) : ph % 2 < 1 ? ph % 2 : 2 - (ph % 2);
    };
    const act = () => {
      if (acted || !playing) return;
      acted = true;
      onStop(stopScore(posAt(performance.now()), center, pr.zone));
    };
    zona.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      act();
    });
    setKey((e) => {
      if (e.repeat || (e.target as Element).closest?.('.mg-actions') || ![' ', 'Enter'].includes(e.key)) return;
      e.preventDefault();
      act();
    });
    const tick = () => {
      if (!playing || acted) return;
      if (!host.isConnected) return teardown?.(); // render() reemplazó la pantalla: se detiene todo
      const now = performance.now();
      if (now - t0 >= pr.period * sweeps + (kind === 'cierre' ? 150 : 0)) return finish(0);
      marker.style.left = `${posAt(now) * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  listo();
}
