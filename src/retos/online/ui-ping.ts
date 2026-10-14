// Pintor del ping pong de futbolistas en línea (RF-11, RF-12). Recibe el estado público y lo dibuja; el servidor decide todo:
// aquí solo se muestran el turno, el reloj (una copia del plazo del servidor) y los botones de cada fase.
// Todo texto entra con h()/textContent (RF-34). Importa solo lo puro: nunca trivia.ts ni los bancos.
import { h, type Indice } from '../comun';
import { limpiar, validarEntrada } from '../pingpong';
import { crearCuenta } from './cuenta';
import type { Accion, MontarJuego, PingPublico } from './protocolo';
import { banderaDe, nombreClub, nombrePais, nombresVisibles } from './textos';

const TURNO_S = 15, DECIDE_S = 20, APELAR_S = 10; // solo para el texto; el plazo real es el `deadline` del servidor

export const montarPing: MontarJuego<PingPublico> = (host, inicial, ctx) => {
  let juego = inicial;
  let clave = '';
  let cuenta: ReturnType<typeof crearCuenta> | null = null;
  let enviando = false;
  const nombres = nombresVisibles(ctx.jugadores);
  const rival = (i: Indice): Indice => (i === 0 ? 1 : 0);
  const anuncio = h('p', { class: 'sr', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const zona = h('div', { class: 'rt-pantalla' });
  const resumen = h('p', { class: 'rt-ultimo' });
  host.replaceChildren(anuncio, zona);

  const titulo = (t: string) => h('h1', { tabindex: '-1' }, t);
  const refNombre = () => (juego.cat === 'pais' ? nombrePais(juego.ref) : nombreClub(juego.ref));
  const contexto = () => {
    const bandera = juego.cat === 'pais' ? banderaDe(refNombre()) : undefined;
    return h('p', { class: 'rt-ctx' }, juego.cat === 'pais' ? 'País: ' : 'Club: ',
      ...(bandera ? [h('img', { class: 'nation-flag', src: bandera, alt: '' })] : []), h('b', {}, refNombre()));
  };
  /** Manda una acción; mientras espera, los botones del grupo quedan apagados (un toque doble no manda dos veces). */
  const mandar = (a: Accion, botones: HTMLButtonElement[]) => {
    if (enviando) return;
    enviando = true;
    botones.forEach((b) => (b.disabled = true));
    void ctx.enviar(a).finally(() => { enviando = false; botones.forEach((b) => (b.disabled = false)); });
  };
  const grupo = (...bs: [string, Accion, string?][]) => {
    const nodos = bs.map(([texto, , cls]) => h('button', { type: 'button', class: cls ?? 'btn big' }, texto));
    nodos.forEach((n, i) => { n.onclick = () => mandar(bs[i][1], nodos); });
    return nodos;
  };

  function resumir() {
    const ult = juego.jugadas.at(-1);
    resumen.replaceChildren(ult
      ? `Van ${juego.jugadas.length}. Último aceptado: ${ult.nombre} (${nombres[ult.jugador]})`
      : 'Todavía no se dijo ningún futbolista.');
    if (ult?.sinVerificar) resumen.append(h('span', { class: 'rt-marca' }, ' · sin verificar'));
    if (ult?.apelacion) resumen.append(h('span', { class: 'rt-marca' }, ' · por apelación'));
  }

  function construir() {
    const { fase, turno, texto, porFuente } = juego;
    const yo = ctx.yo;
    const autor = nombres[turno];
    const reloj = h('div', { class: 'rt-reloj', 'aria-hidden': 'true' }, '0');
    const conReloj = fase !== 'verificando';
    cuenta?.detener();
    cuenta = crearCuenta(ctx, {
      mostrar: (s) => { reloj.textContent = String(s); reloj.classList.toggle('rt-urge', s <= 5); },
      anunciar: (m) => { anuncio.textContent = m; },
      mudo: !conReloj,
    });
    const cab = (t: string) => h('div', { class: 'rt-cabecera' }, titulo(t),
      ...(conReloj ? [h('div', { class: 'rt-reloj-caja' }, reloj, h('span', { class: 'rt-seg', 'aria-hidden': 'true' }, 'seg'))] : []));
    const cuerpo: Node[] = [];

    if (fase === 'turno' && turno === yo) {
      const error = h('p', { class: 'error rt-error', id: 'rt-error', role: 'alert' });
      const campo = h('input', {
        id: 'rt-futbolista', type: 'text', enterkeyhint: 'send', autocomplete: 'off', autocapitalize: 'words',
        autocorrect: 'off', spellcheck: 'false', 'aria-describedby': 'rt-error',
      });
      const enviar = h('button', { type: 'submit', class: 'btn big' }, 'Enviar');
      const form = h('form', { class: 'rt-form', novalidate: '' },
        h('div', { class: 'field' }, h('label', { for: 'rt-futbolista' }, `Escribí un futbolista de ${refNombre()}`), campo), enviar);
      form.onsubmit = (e) => {
        e.preventDefault();
        if (enviando) return;
        const t = limpiar(campo.value);
        const motivo = validarEntrada(t);
        if (motivo) { // no se manda y el reloj sigue
          error.textContent = motivo;
          campo.setAttribute('aria-invalid', 'true');
          campo.focus();
          return;
        }
        error.textContent = '';
        campo.removeAttribute('aria-invalid');
        mandar({ t: 'texto', texto: t }, [enviar]);
      };
      cuerpo.push(cab('Tu turno'), contexto(), form, error);
    } else if (fase === 'turno') {
      cuerpo.push(cab(`Turno de ${autor}`), contexto(), h('p', {}, `${autor} tiene ${TURNO_S} segundos para decir un futbolista de ${refNombre()}.`));
    } else if (fase === 'verificando') {
      cuerpo.push(cab('Verificando…'), contexto(), h('p', { role: 'status' }, `Buscando a «${texto ?? ''}». El reloj está detenido.`));
    } else if (fase === 'rechazado' && turno === yo) {
      const [apelar, aceptar] = grupo(['Apelar', { t: 'apelar', apelar: true }], ['Aceptar la derrota', { t: 'apelar', apelar: false }, 'btn secondary']);
      cuerpo.push(cab(`No encontramos a «${texto ?? ''}»`), contexto(),
        h('p', {}, `La fuente de datos no lo tiene como futbolista de ${refNombre()}. Si estás seguro de que sí lo es, podés apelar: decide ${nombres[rival(yo)]}. Tenés ${APELAR_S} segundos.`),
        h('p', { class: 'rt-ayuda' }, 'Wikidata puede tener huecos, sobre todo con jugadores de ligas chicas.'), apelar, aceptar);
    } else if (fase === 'rechazado') {
      cuerpo.push(cab(`${autor} puede apelar`), contexto(),
        h('p', {}, `La fuente de datos no encontró a «${texto ?? ''}». ${autor} puede apelar y, si lo hace, decidís vos.`));
    } else if (fase === 'decide' && turno !== yo) {
      const [vale, noVale] = grupo(['Vale', { t: 'decidir', vale: true }], ['No vale', { t: 'decidir', vale: false }, 'btn secondary']);
      cuerpo.push(cab(porFuente ? `No pudimos verificar a «${texto ?? ''}»` : `Apelación: decidís vos`), contexto(),
        h('p', {}, porFuente
          ? `La fuente de datos no respondió bien, así que decidís vos. ${autor} escribió «${texto ?? ''}».`
          : `${autor} escribió «${texto ?? ''}» y dice que sí es futbolista de ${refNombre()}, pero la fuente de datos no lo encontró.`),
        h('p', { class: 'rt-ayuda' }, `¿«${texto ?? ''}» vale como futbolista de ${refNombre()}? Tenés ${DECIDE_S} segundos; si no decidís, vale.`), vale, noVale);
    } else {
      cuerpo.push(cab(`Decide ${nombres[rival(turno)]}`), contexto(),
        h('p', {}, porFuente
          ? `La fuente de datos no pudo verificar «${texto ?? ''}», así que decide ${nombres[rival(turno)]}.`
          : `${nombres[rival(turno)]} decide si «${texto ?? ''}» vale.`));
    }
    resumir();
    zona.replaceChildren(...cuerpo, resumen);
    zona.querySelector<HTMLElement>('h1[tabindex]')?.focus({ preventScroll: true });
    cuenta.fijar(juego.deadline);
  }

  function pintar() {
    const k = [juego.fase, juego.turno, juego.texto, juego.porFuente, juego.deadline].join('|');
    if (k === clave) { resumir(); return; }
    clave = k;
    construir();
  }
  pintar();

  return {
    actualizar(j) { juego = j; pintar(); },
    detener() { cuenta?.detener(); cuenta = null; },
  };
};
