// Reto del día, pantalla (specs/reto-del-dia): un solo reto por fecha de Guatemala, en solitario y sin reloj. Se baja con import() solo al tocar
// la opción (index.ts), y de los dos bancos solo el del tipo de hoy (RF-21). Todo texto entra con h()/textContent (RF-19); lo que viene del
// almacenamiento ya pasó por validar() y aquí solo se pinta como texto. No hace ninguna petición: las banderas son las de "¿De dónde es?".
import './dia.css';
import { h } from '../comun';
import type { Futbolista } from '../dedonde';
import type { PreguntaBanco } from '../trivia-puro';
import { guardar, leer } from './almacen';
import {
  diaGT, fechaTexto, indiceDe, llegariaA, opcionesDelDia, preguntaDelDia, rachaVigente, registrar, textoEstado, textoRacha, tipoDe, ultimos7, yaJugado,
  type Registro,
} from './puro';

const ESPERA_TOQUE_MS = 300;  // un doble toque en "Reto del día" no responde la pregunta que aparece justo debajo
interface Opcion { boton: HTMLButtonElement; marcar(ok: boolean): void }
interface Reto { enunciado: Node[]; opciones: Opcion[]; correcta: number; textoCorrecta: string }

/** Pinta el Reto del día en `contenedor` y devuelve la función que lo cancela (no hay temporizadores: solo deja de pintar). */
export function montarRetoDelDia(contenedor: HTMLElement, alVolver: () => void): () => void {
  let vivo = true;
  const hoy = diaGT(Date.now());   // se fija una vez: aunque pase la medianoche, la respuesta cuenta para este reto (RF-17)
  const titulo = h('h1', { tabindex: '-1' }, 'Reto del día');
  const racha = h('p', { class: 'rd-racha' });
  const nota = h('p', { class: 'rd-nota' });
  const zona = h('div', { class: 'rd-zona' });
  const raiz = h('div', { class: 'rd' }, titulo, h('p', { class: 'rd-fecha' }, fechaTexto(hoy, true)), racha, nota, zona);
  contenedor.replaceChildren(raiz);
  titulo.focus();

  const pintarRacha = (reg: Registro | null) => {
    racha.textContent = `Racha: ${textoRacha(rachaVigente(reg, hoy))}`;
    const llega = llegariaA(reg, hoy);
    nota.textContent = llega === null ? '' : `Jugá hoy para llegar a ${llega}`;
  };
  const volver = () => {
    const b = h('button', { type: 'button', class: 'btn big secondary' }, 'Volver a Retos');
    b.onclick = alVolver;
    return b;
  };
  const resultado = (ok: boolean) => [h('span', { 'aria-hidden': 'true' }, ok ? '✓ ' : '✗ '), ok ? 'Acertaste' : 'Fallaste'];

  /** Mejor racha, jugados, aciertos y los últimos 7 días, cada uno con símbolo y texto (RF-12). */
  const estadisticas = (reg: Registro) =>
    h('div', { class: 'rd-stats' },
      h('ul', { class: 'rd-cifras' },
        h('li', {}, `Mejor racha: ${textoRacha(reg.mejor)}`), h('li', {}, `Retos jugados: ${String(reg.jugados)}`), h('li', {}, `Aciertos: ${String(reg.aciertos)}`)),
      h('h3', {}, 'Últimos 7 días'),
      h('ul', { class: 'rd-dias' }, ...ultimos7(reg, hoy).filter((x) => x.estado !== 'nada').map((x) =>
        h('li', {}, h('span', {}, fechaTexto(x.dia)), h('span', { class: `rd-e rd-${x.estado}` }, textoEstado(x.estado))))));

  function yaJugada(reg: Registro, ok: boolean) {
    pintarRacha(reg);
    zona.replaceChildren(h('section', { class: 'rd-res' },
      h('h2', { tabindex: '-1' }, 'Ya jugaste el reto de hoy'),
      h('p', { class: 'rd-linea' }, ...resultado(ok)),
      estadisticas(reg), h('p', {}, 'Volvé mañana.'), volver()));
  }

  /** Baja solo el banco del tipo de hoy y arma el reto: mismo elemento y mismas opciones en cualquier dispositivo (RF-04, RF-05). */
  async function cargar(): Promise<Reto> {
    if (tipoDe(hoy) === 'pregunta') {
      const [m] = await Promise.all([import('../preguntas.json'), import('../trivia.css').catch(() => undefined)]);
      const banco = m.default as unknown as PreguntaBanco[];
      const p = preguntaDelDia(banco[indiceDe(hoy, banco.length)], hoy);
      const opciones = p.opciones.map((texto, i): Opcion => {
        const marca = h('span', { class: 'rq-marca' });
        const boton = h('button', { type: 'button', class: 'rq-op', 'aria-keyshortcuts': String(i + 1) },
          h('span', { class: 'rq-n', 'aria-hidden': 'true' }, String(i + 1)), h('span', { class: 'rq-t' }, texto), marca);
        return { boton, marcar: (ok) => { boton.classList.add(ok ? 'rq-ok' : 'rq-mal'); marca.replaceChildren(h('span', { 'aria-hidden': 'true' }, ok ? '✓ ' : '✗ '), ok ? 'Correcta' : 'Tu respuesta'); } };
      });
      return { enunciado: [h('h2', { class: 'rq-pregunta', id: 'rd-enunciado' }, p.pregunta)], opciones, correcta: p.correcta, textoCorrecta: p.opciones[p.correcta] };
    }
    const [m, c] = await Promise.all([import('../futbolistas.json'), import('../ui-dedonde-comun')]);
    void c.cargarCss();
    const banco = m.default as unknown as Futbolista[];
    const f = banco[indiceDe(hoy, banco.length)];
    const { opciones: sels, correcta } = opcionesDelDia(f, hoy);
    const opciones = sels.map((sel, i): Opcion => {
      const { boton, marca } = c.botonOpcion(i, sel);
      return { boton, marcar: (ok) => { boton.classList.add(ok ? 'dd-ok' : 'dd-mal'); c.marcar(marca, ok, ok ? 'Correcta' : 'Tu respuesta'); } };
    });
    return { enunciado: [h('p', { class: 'dd-pregunta' }, '¿De qué Selección es?'), h('h2', { class: 'dd-futbolista', id: 'rd-enunciado' }, f.nombre)], opciones, correcta, textoCorrecta: sels[correcta] };
  }

  function jugar(reto: Reto, tipo: 'rq' | 'dd') {
    let respondida = false;
    const abierto = performance.now();
    const responder = (i: number) => {
      if (respondida || !vivo || performance.now() - abierto < ESPERA_TOQUE_MS) return;
      respondida = true;
      const acierto = i === reto.correcta;
      reto.opciones.forEach((o, k) => {
        o.boton.disabled = true;
        if (k === reto.correcta) o.marcar(true); else if (k === i) o.marcar(false);
      });
      // RF-16: se vuelve a leer justo antes de guardar; si otra pestaña ya contó esta fecha, vale lo que quedó guardado.
      const actual = leer(hoy);
      const previa = yaJugado(actual, hoy);
      if (actual && previa) return yaJugada(actual, previa.ok);
      const reg = registrar(actual, hoy, acierto);
      const guardado = reg === actual || guardar(reg);
      pintarRacha(reg);
      const res = h('section', { class: 'rd-res' },
        h('h2', { tabindex: '-1', class: acierto ? 'rd-bien' : 'rd-mal' }, ...resultado(acierto)),
        ...(acierto ? [] : [h('p', {}, `La respuesta correcta es: ${reto.textoCorrecta}`)]),
        estadisticas(reg), h('p', {}, 'Volvé mañana.'),
        ...(guardado ? [] : [h('p', { role: 'status', class: 'rd-aviso' }, 'No se pudo guardar tu racha en este navegador.')]),
        volver());
      zona.append(res);
      res.querySelector('h2')!.focus({ preventScroll: true });
      res.scrollIntoView();   // el resultado y "Volver a Retos" quedan a la vista sin tener que desplazarse
    };
    reto.opciones.forEach((o, i) => o.boton.addEventListener('click', () => responder(i)));
    raiz.addEventListener('keydown', (e) => {
      const n = e.key.length === 1 ? '1234'.indexOf(e.key) : -1;
      if (n < 0 || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      responder(n);
    });
    zona.replaceChildren(
      h('section', { class: 'rd-reto', 'aria-labelledby': 'rd-enunciado' }, ...reto.enunciado,
        h('div', { class: `${tipo}-ops`, role: 'group', 'aria-labelledby': 'rd-enunciado' }, ...reto.opciones.map((o) => o.boton)),
        h('p', { class: 'rd-nota' }, 'Respondé con un toque o con las teclas 1 a 4.')));
  }

  async function iniciar() {
    const reg = leer(hoy);
    pintarRacha(reg);
    const previa = yaJugado(reg, hoy);
    if (reg && previa) return yaJugada(reg, previa.ok);   // RF-08: sin banco y sin enunciado
    zona.replaceChildren(h('p', { role: 'status' }, 'Cargando el reto…'));
    try {
      const reto = await cargar();
      if (vivo) jugar(reto, tipoDe(hoy) === 'pregunta' ? 'rq' : 'dd');
    } catch {
      if (vivo) zona.replaceChildren(h('p', { role: 'alert' }, 'No se pudo preparar el reto de hoy. Revisá tu conexión e intentá de nuevo.'), volver());
    }
  }

  void iniciar();
  return () => { vivo = false; };
}
