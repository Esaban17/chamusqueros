// Retos Fútbol en línea, categoría "¿De dónde es?": el pintor (MontarJuego de online/protocolo.ts). B lo llama con el estado público de la ronda;
// el reloj lo manda el servidor (RF-11, RF-20): esta pantalla solo muestra una copia con ctx.ahora() y avisa con ctx.vencer() al llegar a 0.
// NO carga el banco de futbolistas ni ningún otro: recibe el nombre, las 4 opciones y los plazos del estado público (RF-35). La respuesta correcta
// no llega hasta que ambos respondan o venza el plazo (fase 'revelado'). Todo texto entra con h()/textContent (RF-34).
// Para conectarlo al registro de pintores de B: `dedonde: montarDeDonde` (una línea).
import { h } from './comun';
import { PLAZO_MS } from './dedonde';
import type { DeDondePublico, JuegoMontado, MontarJuego } from './online/protocolo';
import { anunciosPendientes } from './trivia-puro';
import { botonOpcion, cargarCss, listaMarcador, marcar } from './ui-dedonde-comun';

const ESPERA_TOQUE_MS = 250;     // un toque que cae justo al cambiar de ronda no responde la ronda nueva
const REINTENTO_VENCER_MS = 1500;  // si el servidor todavía no acepta cerrar el plazo (reloj adelantado), se vuelve a pedir

export const montarDeDonde: MontarJuego<DeDondePublico> = (host, juego, ctx): JuegoMontado<DeDondePublico> => {
  let actual = juego;
  let activo = true;
  let listo = false;                       // el CSS ya se aplicó
  let clave = '';                          // qué pantalla está pintada: fase, ronda y si es extra
  let montadoEn = 0;
  let enviada: number | null = null;       // la opción que toqué en esta ronda (el servidor nunca me la devuelve antes del cierre)
  let reloj: ReturnType<typeof setInterval> | undefined;
  let hechos = new Set<number>();
  let venciUltimo = { clave: '', t: -Infinity };
  let botones: ReturnType<typeof botonOpcion>[] = [];
  let estado: HTMLElement | null = null;
  let seg: HTMLElement | null = null;
  let barra: HTMLElement | null = null;
  let anuncio: HTMLElement | null = null;
  let escuchaTeclas = false;   // el oyente del teclado se pone una sola vez

  const rival = () => (ctx.yo === 0 ? 1 : 0);
  const nombre = (i: 0 | 1) => ctx.jugadores[i]?.apodo ?? `Jugador ${i + 1}`;
  const claveDe = (j: DeDondePublico) => `${j.fase}:${j.n}:${j.extra ? 'x' : ''}`;
  const parar = () => { if (reloj !== undefined) { clearInterval(reloj); reloj = undefined; } };
  const anunciar = (msg: string) => anuncio?.replaceChildren(h('span', {}, msg));

  const textoEstado = (j: DeDondePublico): string => {
    if (j.fase === 'revelado') return '';
    const yoRespondi = enviada !== null || j.respondio[ctx.yo];
    if (!yoRespondi) return j.respondio[rival()] ? `${nombre(rival())} ya respondió. Te toca.` : 'Elegí una opción.';
    return j.respondio[rival()] ? 'Respondieron los dos. Un momento…' : `Respuesta enviada. Esperando a ${nombre(rival())}.`;
  };

  function responder(i: number, e?: Event) {
    const j = actual;
    if (!activo || j.fase !== 'ronda' || enviada !== null || j.respondio[ctx.yo]) return;
    if (e && performance.now() - montadoEn < ESPERA_TOQUE_MS) return;
    enviada = i;
    botones.forEach(({ boton, marca }, k) => {
      boton.disabled = true;
      if (k === i) { boton.classList.add('dd-elegida'); marcar(marca, null, 'Tu respuesta'); }
    });
    estado?.replaceChildren(textoEstado(j));
    // Los errores de red los muestra B; aquí solo se devuelve la posibilidad de volver a elegir si el servidor no llegó a guardarla.
    void ctx.enviar({ t: 'responder', opcion: i }).catch(() => {
      if (!activo || actual.respondio[ctx.yo] || claveDe(actual) !== claveDe(j)) return;
      enviada = null;
      botones.forEach(({ boton, marca }) => { boton.disabled = false; boton.classList.remove('dd-elegida'); marca.replaceChildren(); });
      estado?.replaceChildren('No se pudo enviar tu respuesta. Elegí de nuevo.');
    });
  }

  const tick = () => {
    const j = actual;
    const resto = j.deadline - ctx.ahora();
    const s = Math.max(0, Math.ceil(resto / 1000));
    if (seg) seg.textContent = String(s);
    if (j.fase === 'ronda') {
      if (barra) barra.style.width = `${Math.max(0, Math.min(1, resto / PLAZO_MS)) * 100}%`;
      const nuevos = anunciosPendientes(resto, hechos);
      if (nuevos.length) {
        nuevos.forEach((t) => hechos.add(t));
        anunciar(Math.min(...nuevos) === 0 ? 'Se acabó el tiempo' : `${s} segundos`);
      }
    }
    // Siempre que el reloj llega a 0 se pide cerrar el plazo, también si ya respondí: es la señal de que sigo conectado (RF-09).
    if (resto <= 0) {
      const k = claveDe(j), t = performance.now();
      if (k !== venciUltimo.clave || t - venciUltimo.t >= REINTENTO_VENCER_MS) { venciUltimo = { clave: k, t }; ctx.vencer(); }
    }
  };

  function pintar() {
    const j = actual;
    clave = claveDe(j);
    parar();
    hechos = new Set();
    enviada = null;
    montadoEn = performance.now();
    const yo = ctx.yo, otro = rival();
    const enRonda = j.fase === 'ronda';
    const rev = j.revelado;
    const titulo = h('h2', { class: 'dd-futbolista', tabindex: '-1', id: 'dd-futbolista' }, j.nombre);
    botones = j.opciones.map((o, i) => botonOpcion(i, o));
    seg = h('span', { class: 'dd-seg', 'aria-hidden': 'true' }, '');
    barra = h('i');
    anuncio = h('p', { class: 'dd-sr', 'aria-live': 'polite', 'aria-atomic': 'true' });
    estado = h('p', { class: 'dd-estado', role: 'status' }, textoEstado(j));
    const etiqueta = j.extra ? 'Ronda extra' : `Ronda ${j.n}`;
    const yaRespondi = j.respondio[yo];

    botones.forEach(({ boton, marca }, k) => {
      if (enRonda) {
        boton.disabled = yaRespondi;
        boton.addEventListener('click', (e) => responder(k, e));
        return;
      }
      boton.disabled = true;
      if (!rev) return;
      const mia = rev.elegida[yo] === k, suya = rev.elegida[otro] === k;
      if (k === rev.correcta) { boton.classList.add('dd-ok'); marcar(marca, true, 'Correcta'); }
      else if (mia || suya) boton.classList.add('dd-mal');
      if (mia) marcar(marca, k === rev.correcta, 'Tu respuesta');
      if (suya) marcar(marca, k === rev.correcta, `Respuesta de ${nombre(otro)}`);
    });

    // Al cerrarse la ronda: qué pasó con cada uno y cuánto ganó.
    const resultado = rev
      ? h('div', { class: `dd-fb ${rev.elegida[yo] === rev.correcta ? 'dd-ok' : 'dd-mal'}` },
        h('p', { class: 'dd-fb-t' }, h('span', { 'aria-hidden': 'true' }, rev.elegida[yo] === rev.correcta ? '✓ ' : '✗ '),
          rev.elegida[yo] === null ? 'No respondiste a tiempo' : rev.elegida[yo] === rev.correcta ? 'Acertaste' : 'Fallaste'),
        h('p', { class: 'dd-fb-d' }, `Vos: +${rev.ganado[yo]} puntos · ${nombre(otro)}: +${rev.ganado[otro]} puntos.`),
        h('p', { class: 'dd-fb-d' }, `Era ${j.opciones[rev.correcta]}.`))
      : null;

    const pantalla = h('section', { class: 'dd-pantalla dd-turno', 'aria-labelledby': 'dd-futbolista' },
      h('p', { class: 'dd-cab' }, `¿De dónde es? · ${etiqueta} · meta ${j.meta} puntos`),
      listaMarcador([0, 1].map((i) => ({ nombre: i === yo ? `${nombre(i as 0 | 1)} (vos)` : nombre(i as 0 | 1), puntos: j.puntos[i] }))),
      enRonda
        ? h('div', { class: 'dd-reloj' }, h('p', { class: 'dd-tiempo' }, seg, h('span', { class: 'dd-unidad', 'aria-hidden': 'true' }, ' s')), h('div', { class: 'dd-barra', 'aria-hidden': 'true' }, barra))
        : h('p', { class: 'dd-nota' }, h('span', { 'aria-hidden': 'true' }, seg), ' ', 'segundos para la próxima ronda'),
      h('p', { class: 'dd-pregunta' }, '¿De qué Selección es?'),
      titulo,
      h('div', { class: 'dd-ops', role: 'group', 'aria-labelledby': 'dd-futbolista' }, ...botones.map((b) => b.boton)),
      h('div', { class: 'dd-pie' }, ...(resultado ? [resultado] : []), estado),
      anuncio);
    host.replaceChildren(h('div', { class: 'dd' }, pantalla));
    titulo.focus({ preventScroll: true });
    if (!escuchaTeclas) {
      escuchaTeclas = true;
      host.addEventListener('keydown', alTeclear);
    }
    tick();
    reloj = setInterval(tick, 250);
    if (enRonda) anunciar(`${Math.max(0, Math.ceil((j.deadline - ctx.ahora()) / 1000))} segundos`);
  }

  function alTeclear(e: KeyboardEvent) {
    const n = e.key.length === 1 ? '1234'.indexOf(e.key) : -1;
    if (n < 0 || e.ctrlKey || e.metaKey || e.altKey || actual.fase !== 'ronda') return;
    e.preventDefault();
    responder(n, e);
  }

  /** Mismo estado de pantalla: solo cambia quién ya respondió. Se actualiza en su lugar para no robar el foco. */
  function refrescar() {
    const j = actual;
    estado?.replaceChildren(textoEstado(j));
    if (j.fase === 'ronda' && j.respondio[ctx.yo]) botones.forEach(({ boton }) => { boton.disabled = true; });
  }

  void cargarCss().then(() => {
    if (!activo) return;
    listo = true;
    pintar();
  });

  return {
    actualizar(j) {
      actual = j;
      if (!activo || !listo) return;
      if (claveDe(j) !== clave) pintar();
      else refrescar();
    },
    detener() {
      activo = false;
      parar();
      host.removeEventListener('keydown', alTeclear);
    },
  };
};
