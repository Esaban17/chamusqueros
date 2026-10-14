// Retos Fútbol, categoría "¿De dónde es?" en el MISMO celular (RF-17 a RF-21, RF-33, RF-34): por turnos, con pantalla de relevo.
// Cada jugador tiene su propio futbolista en cada ronda (RF-20); la ronda se cierra cuando juegan los dos y se aplica cerrarRonda (dedonde.ts).
// Cumple el contrato JugarReto de comun.ts: pinta solo dentro de su contenedor, llama a onFin una sola vez (tras "Ver resultado"), devuelve una
// cancelación idempotente y no toca `document` al importarse. Todo texto entra con h()/textContent (RF-34). No usa el almacenamiento.
// El banco (futbolistas.json) se baja con import() solo aquí: el modo en línea no lo descarga (ver ui-dedonde-linea.ts).
import { h, type Indice, type JugarReto, type Pareja, type ResultadoReto } from './comun';
import {
  BASE, EXTRAS_MAX, MAX_RONDAS, META, PLAZO_MS, cerrarRonda, elegirFutbolista, frase, marcadorInicial, opcionesRonda, puntosRonda,
  type Futbolista, type Marcador,
} from './dedonde';
import { anunciosPendientes, crearControl } from './trivia-puro';
import { botonOpcion, cargarCss, listaMarcador, marcar } from './ui-dedonde-comun';

/** Lo que recibe `onFin`: el contrato (`ganador`, `puntos` de la partida) más el motivo en una frase y cuántas rondas se jugaron. */
export type ResultadoDeDonde = ResultadoReto & { motivo: string; rondas: number };

const ESPERA_TOQUE_MS = 300;  // un doble toque en "Listo" o "Siguiente" no responde la ronda que aparece justo debajo
interface Siguiente { texto: string; accion: () => void }

export const jugarDeDonde: JugarReto = (contenedor, jugadores: Pareja, onFin, opciones = {}) => {
  const empieza: Indice = opciones.empieza ?? 0;
  const otro: Indice = empieza === 0 ? 1 : 0;
  const control = crearControl(onFin);
  const usados = new Set<string>();
  let banco: Futbolista[] = [];
  let marcador: Marcador = marcadorInicial();
  let ganado: [number, number] = [0, 0];   // puntos de la ronda en curso
  const raiz = h('div', { class: 'dd', tabindex: '-1' });
  const anuncio = h('p', { class: 'dd-sr', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const zona = h('div', { class: 'dd-zona' });
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

  const numeroRonda = () => marcador.rondas + 1;
  const etiquetaRonda = () => (marcador.extras > 0 ? `Ronda extra ${marcador.extras} de ${EXTRAS_MAX}` : `Ronda ${numeroRonda()} de ${MAX_RONDAS}`);
  const van = () => `Van ${jugadores[0]} ${marcador.puntos[0]} · ${jugadores[1]} ${marcador.puntos[1]}. Gana el primero en llegar a ${META}.`;

  function relevo(jugador: Indice, alListo: () => void) {
    const titulo = h('h2', { class: 'dd-titulo', tabindex: '-1' }, `Turno de ${jugadores[jugador]}`);
    const listo = h('button', { type: 'button', class: 'btn big dd-listo' }, 'Listo');
    listo.addEventListener('click', (e) => gesto(e, alListo));
    mostrar(
      h('section', { class: 'dd-pantalla dd-relevo' },
        h('p', { class: 'dd-eyebrow' }, `¿De dónde es? · ${etiquetaRonda()}`),
        titulo,
        h('p', { class: 'dd-detalle' }, marcador.rondas ? van() : `Aparece un futbolista y elegís la Selección que representa. Gana el primero en llegar a ${META} puntos.`),
        h('p', { class: 'dd-nota' }, `Tenés ${PLAZO_MS / 1000} segundos. Respondé con un toque o con las teclas 1 a 4. Cuando tengas el celular, tocá «Listo».`),
        listo),
      titulo,
    );
  }

  /** Un turno: el futbolista de este jugador, el reloj de 12 s y sus 4 opciones. El bonus se mide desde que se muestra (RF-18, RF-20). */
  function turno(jugador: Indice, siguiente: () => Siguiente) {
    let f: Futbolista;
    try {
      f = elegirFutbolista(banco, usados, Math.random);
    } catch {
      zona.replaceChildren(h('p', { role: 'alert', class: 'dd-detalle' }, 'No se pudo preparar el futbolista. Salí e intentá de nuevo.'));
      return;
    }
    usados.add(f.q);
    const { opciones: ops, correcta } = opcionesRonda(f, Math.random);
    let respondida = false;
    const inicio = performance.now();
    const hechos = new Set<number>();
    const seg = h('span', { class: 'dd-seg', 'aria-hidden': 'true' }, String(PLAZO_MS / 1000));
    const barra = h('i');
    const titulo = h('h2', { class: 'dd-futbolista', tabindex: '-1', id: 'dd-futbolista' }, f.nombre);
    const piezas = ops.map((o, i) => botonOpcion(i, o));
    const pie = h('div', { class: 'dd-pie' });

    const responder = (i: number, e?: Event) => {
      if (respondida || !control.activo) return;
      if (e && e.timeStamp - ultimoGesto < ESPERA_TOQUE_MS) return;
      respondida = true;
      parar();
      teclas = null;
      const tardo = performance.now() - inicio;
      const tiempo = i >= 0 && tardo > PLAZO_MS ? -1 : i;   // un toque que llegó pasado el plazo cuenta como "sin tiempo"
      const acierto = tiempo === correcta;
      const pts = puntosRonda(acierto, tiempo < 0 ? null : tardo);
      ganado[jugador] = pts;
      piezas.forEach(({ boton, marca }, k) => {
        boton.disabled = true;
        if (k === correcta) { boton.classList.add('dd-ok'); marcar(marca, true, 'Correcta'); }
        else if (k === tiempo) { boton.classList.add('dd-mal'); marcar(marca, false, 'Tu respuesta'); }
      });
      const sig = siguiente();
      const boton = h('button', { type: 'button', class: 'btn big dd-sig', 'aria-describedby': 'dd-fb' }, sig.texto);
      boton.addEventListener('click', (ev) => gesto(ev, sig.accion));
      pie.replaceChildren(
        h('div', { class: `dd-fb ${acierto ? 'dd-ok' : 'dd-mal'}`, id: 'dd-fb' },
          h('p', { class: 'dd-fb-t' }, h('span', { 'aria-hidden': 'true' }, acierto ? '✓ ' : '✗ '), tiempo < 0 ? 'Se acabó el tiempo' : acierto ? 'Correcta' : 'Incorrecta'),
          h('p', { class: 'dd-fb-d' }, acierto
            ? `+${pts} puntos: ${BASE} por acertar y ${pts - BASE} de bonus por rapidez.`
            : `Era ${ops[correcta]}. 0 puntos.`)),
        boton);
      boton.focus();
    };
    piezas.forEach(({ boton }, i) => boton.addEventListener('click', (e) => responder(i, e)));

    const tick = () => {
      const resto = PLAZO_MS - (performance.now() - inicio);
      seg.textContent = String(Math.max(0, Math.ceil(resto / 1000)));
      barra.style.width = `${Math.max(0, Math.min(1, resto / PLAZO_MS)) * 100}%`;
      const nuevos = anunciosPendientes(resto, hechos);
      if (nuevos.length) {
        nuevos.forEach((t) => hechos.add(t));
        anunciar(Math.min(...nuevos) === 0 ? 'Se acabó el tiempo' : `${Math.ceil(resto / 1000)} segundos`);
      }
      if (resto <= 0) responder(-1);
    };

    mostrar(
      h('section', { class: 'dd-pantalla dd-turno', 'aria-labelledby': 'dd-futbolista' },
        h('p', { class: 'dd-cab' }, `${jugadores[jugador]} · ${etiquetaRonda()}`),
        h('div', { class: 'dd-reloj' }, h('p', { class: 'dd-tiempo' }, seg, h('span', { class: 'dd-unidad', 'aria-hidden': 'true' }, ' s')), h('div', { class: 'dd-barra', 'aria-hidden': 'true' }, barra)),
        h('p', { class: 'dd-pregunta' }, '¿De qué Selección es?'),
        titulo,
        h('div', { class: 'dd-ops', role: 'group', 'aria-labelledby': 'dd-futbolista' }, ...piezas.map((p) => p.boton)),
        pie),
      titulo,
    );
    teclas = (n, e) => responder(n, e);
    anunciar(`${PLAZO_MS / 1000} segundos`);
    reloj = setInterval(tick, 250);
  }

  /** Los dos ya jugaron: se cierra la ronda, se muestra el marcador y se sigue o se termina. */
  function cierre() {
    const r = cerrarRonda(marcador, ganado);
    const ronda = etiquetaRonda();   // la que acaba de jugarse (antes de actualizar el marcador)
    const delRonda = ganado;
    marcador = r.marcador;
    ganado = [0, 0];
    const titulo = h('h2', { class: 'dd-titulo', tabindex: '-1' }, r.fin ? 'Fin de la partida' : 'Marcador');
    const filas = listaMarcador([0, 1].map((i) => ({ nombre: jugadores[i], puntos: marcador.puntos[i], sub: `+${delRonda[i]} en esta ronda` })));
    const resumen = r.fin
      ? h('p', { class: 'dd-detalle' }, frase(r.fin, jugadores, marcador.puntos))
      : h('p', { class: 'dd-detalle' }, marcador.extras > 0
        ? `Siguen igualados: ronda extra ${marcador.extras} de ${EXTRAS_MAX}. Gana quien tenga más puntos al cerrarla.`
        : `Faltan ${META} puntos para ganar. Siguiente: ronda ${marcador.rondas + 1} de ${MAX_RONDAS}.`);
    const boton = h('button', { type: 'button', class: 'btn big dd-sig' }, r.fin ? 'Ver resultado' : marcador.extras > 0 ? 'Ronda extra' : 'Siguiente ronda');
    boton.addEventListener('click', (e) => gesto(e, () => {
      if (r.fin) { const fin: ResultadoDeDonde = { ganador: r.fin.ganador, puntos: [marcador.puntos[0], marcador.puntos[1]], motivo: frase(r.fin, jugadores, marcador.puntos), rondas: marcador.rondas }; control.terminar(fin); }
      else jugarRonda();
    }));
    mostrar(
      h('section', { class: 'dd-pantalla dd-cierre' },
        h('p', { class: 'dd-eyebrow' }, `¿De dónde es? · ${ronda} cerrada`),
        titulo, resumen, filas, boton),
      titulo,
    );
  }

  /** Una ronda: juega primero quien abre y después el otro, cada uno con su futbolista. */
  function jugarRonda() {
    relevo(empieza, () =>
      turno(empieza, () => ({
        texto: 'Pasar el celular',
        accion: () => relevo(otro, () => turno(otro, () => ({ texto: 'Ver el marcador', accion: cierre }))),
      })));
  }

  // El CSS y el banco viajan aparte: se pinta cuando ya están. Si no se pueden bajar, se dice (nunca se queda en blanco).
  zona.replaceChildren(h('p', { role: 'status', class: 'dd-detalle' }, 'Preparando futbolistas…'));
  void Promise.all([import('./futbolistas.json'), cargarCss()]).then(([m]) => {
    if (!control.activo) return;
    banco = m.default as unknown as Futbolista[];
    jugarRonda();
  }).catch(() => {
    if (control.activo) zona.replaceChildren(h('p', { role: 'alert', class: 'dd-detalle' }, 'No se pudo cargar el banco de futbolistas. Revisá tu conexión, salí e intentá de nuevo.'));
  });
  return control.cancelar;
};
