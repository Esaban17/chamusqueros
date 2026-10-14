// Pantallas del ping pong de futbolistas: relevo → turno (reloj) → verificando → [decide el rival] → relevo | fin.
// Todo texto entra con h() (nodos de texto): nunca se interpreta como marcado. La lógica pura está en pingpong.ts.
import { h, type Indice, type OpcionesReto, type Pareja } from './comun';
import { aceptar, claveTexto, evaluar, limpiar, nuevaPartida, puntos, rival, validarEntrada, type Jugada, type Partida } from './pingpong';

const TURNO_MS = 15_000; // RF-10
const VERIFICAR_MS = 5_000; // RF-12
const QID = /^Q[1-9]\d{0,9}$/;

export interface ConfigPing {
  tipo: 'pais' | 'club';
  id: string;        // código del país o id del club en el juego
  nombre: string;    // lo que se ve: "Argentina", "Barcelona (España)"
  bandera?: string;  // URL de la bandera, solo decorativa
  aviso?: string;    // regla especial (Inglaterra, Países Bajos)
}
export interface ResultadoPing { ganador: Indice | null; puntos: [number, number]; motivo: string; jugadas: Jugada[] }

type Razon = 'red' | 'tiempo' | 'limite' | 'servicio';
const RAZONES: Record<Razon, string> = {
  red: 'No hay conexión con la fuente de datos.',
  tiempo: 'La fuente de datos tardó más de 5 segundos.',
  limite: 'La fuente de datos recibió demasiadas consultas.',
  servicio: 'La fuente de datos no respondió bien.',
};
type Consulta = { ok: true; valido: boolean; qid: string | null; nombre: string | null } | { ok: false; razon: Razon };

/** RF-26: al cambiar de pantalla el foco va al título. */
export function enfocarTitulo(raiz: HTMLElement) {
  raiz.querySelector<HTMLElement>('h1[tabindex]')?.focus({ preventScroll: true });
}

export function jugarPingPong(host: HTMLElement, jugadores: Pareja, cfg: ConfigPing, onFin: (r: ResultadoPing) => void, opciones: OpcionesReto = {}): () => void {
  let p: Partida = nuevaPartida(opciones.empieza ?? 0);
  let cancelado = false;
  let fase: 'relevo' | 'turno' | 'verificando' | 'decide' | 'fin' = 'relevo';
  let limpiarTurno = () => {};   // detiene el reloj y quita las escuchas del turno
  let abortar = () => {};        // aborta la consulta en curso
  const nombre = (i: Indice) => jugadores[i];

  const pintar = (...nodos: Node[]) => {
    if (cancelado) return;
    limpiarTurno();
    limpiarTurno = () => {};
    host.replaceChildren(h('div', { class: 'rt-pantalla' }, ...nodos));
    window.scrollTo({ top: 0 });
    enfocarTitulo(host);
  };
  const titulo = (t: string) => h('h1', { tabindex: '-1' }, t);
  const contexto = () => h('p', { class: 'rt-ctx' },
    cfg.tipo === 'pais' ? 'País: ' : 'Club: ',
    ...(cfg.bandera ? [h('img', { class: 'nation-flag', src: cfg.bandera, alt: '' })] : []),
    h('b', {}, cfg.nombre));
  const boton = (texto: string, alClic: () => void, cls = 'btn big') => {
    const b = h('button', { type: 'button', class: cls }, texto);
    b.onclick = alClic;
    return b;
  };

  const terminar = (ganador: Indice | null, motivo: string) => {
    if (cancelado || fase === 'fin') return;
    fase = 'fin';
    limpiarTurno();
    onFin({ ganador, puntos: puntos(p), motivo, jugadas: p.jugadas });
  };
  const perder = (quien: Indice, motivo: string) => terminar(rival(quien), motivo);
  const aceptarJugada = (j: Omit<Jugada, 'jugador'>) => { p = aceptar(p, j); relevo(); };

  // ---------- Relevo ----------
  function relevo() {
    fase = 'relevo';
    const ult = p.jugadas.at(-1);
    pintar(
      titulo(`Turno de ${nombre(p.turno)}`),
      contexto(),
      h('p', { class: 'rt-ultimo' }, ult ? `Último aceptado: ${ult.nombre}. Van ${p.jugadas.length}.` : 'Todavía no se dijo ningún futbolista: abrís vos.'),
      ...(cfg.aviso && !p.jugadas.length ? [h('p', { class: 'rt-aviso' }, cfg.aviso)] : []),
      h('p', { class: 'rt-nota' }, `Pasale el celular a ${nombre(p.turno)}. El reloj (15 segundos) empieza cuando ${nombre(p.turno)} toque Listo.`),
      boton('Listo', turno),
    );
  }

  // ---------- Turno ----------
  function turno() {
    fase = 'turno';
    const quien = p.turno;
    const reloj = h('div', { class: 'rt-reloj', 'aria-hidden': 'true' }, String(TURNO_MS / 1000));
    const anuncio = h('p', { class: 'sr', 'aria-live': 'polite' });
    const error = h('p', { class: 'error rt-error', id: 'rt-error', role: 'alert' });
    const campo = h('input', {
      id: 'rt-futbolista', type: 'text', enterkeyhint: 'send', autocomplete: 'off', autocapitalize: 'words',
      autocorrect: 'off', spellcheck: 'false', 'aria-describedby': 'rt-error',
    });
    const etiqueta = h('label', { for: 'rt-futbolista' }, `Escribí un futbolista de ${cfg.nombre}`);
    const enviarBtn = h('button', { type: 'submit', class: 'btn big' }, 'Enviar');
    const form = h('form', { class: 'rt-form', novalidate: '' }, h('div', { class: 'field' }, etiqueta, campo), enviarBtn);

    pintar(
      h('div', { class: 'rt-cabecera' }, titulo(`Turno de ${nombre(quien)}`), h('div', { class: 'rt-reloj-caja' }, reloj, h('span', { class: 'rt-seg', 'aria-hidden': 'true' }, 'seg'))),
      contexto(), form, error, anuncio,
    );

    // RF-27: el reloj se calcula contra un plazo, no con un contador: en segundo plano no regala tiempo.
    const plazo = performance.now() + TURNO_MS;
    const dichos = new Set<number>();
    const tick = () => {
      if (fase !== 'turno' || cancelado) return;
      const resta = plazo - performance.now();
      if (resta <= 0) {
        reloj.textContent = '0';
        anuncio.textContent = 'Se acabó el tiempo';
        return perder(quien, `${nombre(quien)} no respondió a tiempo.`);
      }
      const s = Math.ceil(resta / 1000);
      reloj.textContent = String(s);
      reloj.classList.toggle('rt-urge', s <= 5);
      // RF-26: se anuncia a los 10 s y a los 5 s, no cada segundo.
      for (const u of [10, 5]) if (s <= u && !dichos.has(u)) { dichos.add(u); anuncio.textContent = `${u} segundos`; }
    };
    const intervalo = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    limpiarTurno = () => { clearInterval(intervalo); document.removeEventListener('visibilitychange', tick); };
    setTimeout(() => { if (fase === 'turno' && !dichos.size) anuncio.textContent = `${TURNO_MS / 1000} segundos`; }, 150);

    form.onsubmit = (e) => {
      e.preventDefault();
      if (fase !== 'turno') return; // toques repetidos: ya se está verificando
      const texto = limpiar(campo.value);
      const motivo = validarEntrada(texto);
      if (motivo) { // no cuenta como respuesta y el reloj sigue
        error.textContent = motivo;
        campo.setAttribute('aria-invalid', 'true');
        campo.focus();
        return;
      }
      fase = 'verificando'; // antes de cualquier espera
      limpiarTurno(); // el reloj se detiene al enviar (RF-12)
      enviar(quien, texto);
    };
  }

  // ---------- Envío y verificación ----------
  const previa = (texto: string, qid: string | null) => p.jugadas.find((j) => (qid !== null && j.qid === qid) || claveTexto(j.texto) === claveTexto(texto));

  function enviar(quien: Indice, texto: string) {
    if (evaluar(p, texto, null) === 'repetido') return repetido(quien, texto, null); // mismo texto: pierde sin consultar
    pintar(
      titulo('Verificando…'),
      contexto(),
      h('p', { role: 'status' }, `Buscando a «${texto}». El reloj está detenido.`),
    );
    void consultar(texto).then((r) => {
      if (cancelado || fase !== 'verificando') return;
      if (!r.ok) return decide(quien, texto, 'fallo', RAZONES[r.razon]);
      if (!r.valido) return noCumple(quien, texto);
      if (evaluar(p, texto, r.qid) === 'repetido') return repetido(quien, texto, r.qid);
      aceptarJugada({ texto, nombre: r.nombre ?? texto, qid: r.qid, sinVerificar: false, apelacion: false });
    });
  }

  function repetido(quien: Indice, texto: string, qid: string | null) {
    const ya = previa(texto, qid);
    perder(quien, `${nombre(quien)} repitió a ${ya?.nombre ?? texto}, que ya se dijo.`);
  }

  async function consultar(texto: string): Promise<Consulta> {
    const ctl = new AbortController();
    abortar = () => ctl.abort();
    let vencio = false;
    const t = setTimeout(() => { vencio = true; ctl.abort(); }, VERIFICAR_MS); // RF-12: como máximo 5 s
    try {
      const res = await fetch(`/api/futbolista?${new URLSearchParams({ nombre: claveTexto(texto), tipo: cfg.tipo, id: cfg.id })}`, { signal: ctl.signal });
      if (res.status === 429) return { ok: false, razon: 'limite' };
      if (!res.ok) return { ok: false, razon: 'servicio' };
      const d = await res.json().catch((e) => { if (ctl.signal.aborted) throw e; return null; });
      // Se acepta solo la forma exacta; cualquier otra cosa es "no verificable", no "inválido".
      if (!d || typeof d.valido !== 'boolean') return { ok: false, razon: 'servicio' };
      if (d.valido && !(typeof d.qid === 'string' && QID.test(d.qid))) return { ok: false, razon: 'servicio' };
      return { ok: true, valido: d.valido, qid: d.valido ? d.qid : null, nombre: d.valido && typeof d.nombreCanonico === 'string' ? d.nombreCanonico.slice(0, 80) : null };
    } catch {
      return { ok: false, razon: vencio ? 'tiempo' : 'red' };
    } finally {
      clearTimeout(t);
      abortar = () => {};
    }
  }

  // La fuente dice "no cumple" o "no encontrado": decide la fuente, pero el jugador puede apelar (RF-14c, RF-34).
  function noCumple(quien: Indice, texto: string) {
    fase = 'decide';
    pintar(
      titulo(`No encontramos a «${texto}»`),
      contexto(),
      h('p', {}, `La fuente de datos no lo tiene como futbolista de ${cfg.nombre}. Si ${nombre(quien)} está seguro de que sí lo es, puede apelar: decide ${nombre(rival(quien))}.`),
      h('p', { class: 'rt-nota' }, 'Wikidata puede tener huecos, sobre todo con jugadores de ligas chicas.'),
      boton('Apelar', () => decide(quien, texto, 'apelacion', '')),
      boton('Aceptar la derrota', () => perder(quien, `«${texto}» no figura como futbolista de ${cfg.nombre}.`), 'btn secondary'),
    );
  }

  // RF-17: sin verificación (o con apelación) decide el rival.
  function decide(quien: Indice, texto: string, via: 'fallo' | 'apelacion', razon: string) {
    fase = 'decide';
    const juez = rival(quien);
    pintar(
      titulo(via === 'apelacion' ? `Apelación: decide ${nombre(juez)}` : `No pudimos verificar a «${texto}»`),
      contexto(),
      h('p', {}, via === 'apelacion'
        ? `${nombre(quien)} escribió «${texto}» y dice que sí es futbolista de ${cfg.nombre}, pero la fuente de datos no lo encontró.`
        : `${razon} Esta respuesta no se pudo verificar: decide ${nombre(juez)}.`),
      h('p', { class: 'rt-nota' }, `Pasale el celular a ${nombre(juez)}. El reloj sigue detenido. ¿«${texto}» vale como futbolista de ${cfg.nombre}?`),
      boton('Vale', () => aceptarJugada({ texto, nombre: texto, qid: null, sinVerificar: via === 'fallo', apelacion: via === 'apelacion' })),
      boton('No vale', () => perder(quien, `${nombre(juez)} no aceptó a «${texto}».`), 'btn secondary'),
    );
  }

  relevo();
  return () => {
    cancelado = true;
    limpiarTurno();
    abortar();
  };
}
