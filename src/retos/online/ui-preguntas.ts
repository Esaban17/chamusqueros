// Pintor de las preguntas en línea (RF-13): los dos ven la misma pregunta a la vez; la correcta solo llega al cerrarse (revelado).
// Reusa el CSS de las preguntas locales (trivia.css, clases rq-) pero NO importa trivia.ts ni el banco. Todo texto con h()/textContent.
import '../trivia.css';
import { h, type Indice } from '../comun';
import { crearCuenta } from './cuenta';
import type { MontarJuego, PreguntasPublico } from './protocolo';
import { nombresVisibles } from './textos';

const TIEMPO_MS = 20_000; // el plazo real es el `deadline` del servidor; esto solo da el largo de la barra

export const montarPreguntas: MontarJuego<PreguntasPublico> = (host, inicial, ctx) => {
  let juego = inicial;
  let clave = '';
  let cuenta: ReturnType<typeof crearCuenta> | null = null;
  let enviando = false;
  let mia: number | null = null;             // lo que toqué en ESTA pregunta, antes de que el servidor lo confirme
  let botones: HTMLButtonElement[] = [];
  let estado: HTMLElement = h('p');
  let marcas: HTMLElement[] = [];
  const nombres = nombresVisibles(ctx.jugadores);
  const otro: Indice = ctx.yo === 0 ? 1 : 0;
  const anuncio = h('p', { class: 'sr', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const zona = h('div', { class: 'rq-pantalla' });
  const raiz = h('div', { class: 'rq' }, h('h1', { class: 'sr' }, 'Preguntas'), anuncio, zona);
  host.replaceChildren(raiz);

  raiz.addEventListener('keydown', (e) => {
    const n = e.key.length === 1 ? '1234'.indexOf(e.key) : -1;
    if (n < 0 || e.ctrlKey || e.metaKey || e.altKey || juego.fase !== 'pregunta' || n >= botones.length) return;
    e.preventDefault();
    responder(n);
  });

  function responder(i: number) {
    if (enviando || juego.fase !== 'pregunta' || juego.respondio[ctx.yo]) return;
    enviando = true;
    mia = i;
    marcar();
    void ctx.enviar({ t: 'responder', opcion: i }).finally(() => {
      enviando = false;
      if (!juego.respondio[ctx.yo]) { mia = null; marcar(); }   // no llegó: se puede volver a elegir
    });
  }

  /** Estado de los botones y del aviso según lo que ya se respondió (se llama en cada actualización). */
  function marcar() {
    if (juego.fase !== 'pregunta') return;
    const listo = juego.respondio[ctx.yo] || mia !== null;
    botones.forEach((b, i) => {
      b.disabled = listo;
      b.classList.toggle('rq-sel', mia === i);
    });
    marcas.forEach((m, i) => m.replaceChildren(...(mia === i ? [h('span', { 'aria-hidden': 'true' }, '→ '), 'Tu respuesta'] : [])));
    estado.replaceChildren(listo
      ? `Respondiste. ${juego.respondio[otro] ? 'Los dos respondieron.' : `Esperando a ${nombres[otro]}…`}`
      : juego.respondio[otro] ? `${nombres[otro]} ya respondió.` : '');
  }

  function construir() {
    const j = juego;
    const marcador = `${nombres[0]} ${j.aciertos[0]} · ${nombres[1]} ${j.aciertos[1]}`;
    const cab = h('p', { class: 'rq-cab' }, `${j.subita ? `Desempate, pregunta ${j.n}` : `Pregunta ${j.n} de ${j.total}`} · ${marcador}`);
    const titulo = h('h2', { class: 'rq-pregunta', tabindex: '-1', id: 'rq-pregunta' }, j.pregunta);
    cuenta?.detener();
    mia = null;

    if (j.fase === 'pregunta') {
      const seg = h('span', { class: 'rq-seg', 'aria-hidden': 'true' }, '0');
      const barra = h('i');
      marcas = j.opciones.map(() => h('span', { class: 'rq-marca' }));
      botones = j.opciones.map((texto, i) => {
        const b = h('button', { type: 'button', class: 'rq-op', 'aria-keyshortcuts': String(i + 1) },
          h('span', { class: 'rq-n', 'aria-hidden': 'true' }, String(i + 1)), h('span', { class: 'rq-t' }, texto), marcas[i]);
        b.onclick = () => responder(i);
        return b;
      });
      estado = h('p', { class: 'rq-nota', role: 'status' });
      zona.replaceChildren(
        cab,
        h('div', { class: 'rq-reloj' }, h('p', { class: 'rq-tiempo' }, seg, h('span', { class: 'rq-unidad', 'aria-hidden': 'true' }, ' s')), h('div', { class: 'rq-barra', 'aria-hidden': 'true' }, barra)),
        titulo,
        h('div', { class: 'rq-ops', role: 'group', 'aria-labelledby': 'rq-pregunta' }, ...botones),
        h('div', { class: 'rq-pie' }, estado),
      );
      cuenta = crearCuenta(ctx, {
        mostrar: (s, f) => { seg.textContent = String(s); barra.style.width = `${f * 100}%`; },
        anunciar: (m) => { anuncio.textContent = m; },
      });
      cuenta.fijar(j.deadline, TIEMPO_MS);
      marcar();
    } else {
      const r = j.revelado;
      const sigue = h('span', {}, '3');
      const elegida = (k: Indice) => r?.elegida[k] ?? null;
      const veredicto = (k: Indice): string => {
        const e = elegida(k);
        return e === null ? 'no respondió a tiempo' : e === r?.correcta ? 'acertó' : 'falló';
      };
      botones = [];
      const ops = j.opciones.map((texto, i) => {
        const ok = r?.correcta === i;
        const m: (string | Node)[] = [];
        if (ok) m.push(h('span', { 'aria-hidden': 'true' }, '✓ '), 'Correcta');
        else if (elegida(ctx.yo) === i) m.push(h('span', { 'aria-hidden': 'true' }, '✗ '), 'Tu respuesta');
        const rival = elegida(otro) === i ? [h('span', { class: 'rq-rival' }, `${nombres[otro]} eligió esta`)] : [];
        const b = h('button', { type: 'button', disabled: '', class: `rq-op ${ok ? 'rq-ok' : elegida(ctx.yo) === i ? 'rq-mal' : ''}` },
          h('span', { class: 'rq-n', 'aria-hidden': 'true' }, String(i + 1)),
          h('span', { class: 'rq-t' }, texto, ...rival), h('span', { class: 'rq-marca' }, ...m));
        return b;
      });
      const acerte = elegida(ctx.yo) === r?.correcta;
      zona.replaceChildren(
        cab, titulo,
        h('div', { class: 'rq-ops', role: 'group', 'aria-labelledby': 'rq-pregunta' }, ...ops),
        h('div', { class: 'rq-pie' },
          h('div', { class: `rq-fb ${acerte ? 'rq-ok' : 'rq-mal'}`, role: 'status' },
            h('p', { class: 'rq-fb-t' }, h('span', { 'aria-hidden': 'true' }, acerte ? '✓ ' : '✗ '),
              acerte ? 'Correcta' : elegida(ctx.yo) === null ? 'Se acabó el tiempo: incorrecta' : 'Incorrecta'),
            h('p', { class: 'rq-fb-d' }, `${nombres[otro]} ${veredicto(otro)}.`)),
          h('p', { class: 'rq-nota' }, 'Sigue en ', sigue, ' s')),
      );
      cuenta = crearCuenta(ctx, { mostrar: (s) => { sigue.textContent = String(s); }, mudo: true });
      cuenta.fijar(j.deadline);
    }
    zona.querySelector<HTMLElement>('h2[tabindex]')?.focus({ preventScroll: true });
  }

  function pintar() {
    const k = `${juego.fase}|${juego.n}|${juego.subita}|${juego.deadline}`;
    if (k !== clave) { clave = k; construir(); } else marcar();
  }
  pintar();

  return {
    actualizar(j) { juego = j; pintar(); },
    detener() { cuenta?.detener(); cuenta = null; },
  };
};
