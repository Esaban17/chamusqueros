// Retos Fútbol: pantalla de entrada ("Jugar en el mismo celular" / "Retar a alguien en línea"), el duelo local de 2 jugadores
// (inicio, elegir país o club, marcador y resultado) y la puerta al modo en línea (online/). Se carga con import() desde home() (src/main.ts).
// El modo local no guarda nada en el dispositivo ni toca el motor de la carrera. El modo en línea y su identidad viven en online/cliente.ts
// y se bajan con import() solo al elegirlo (RF-35); aquí solo se importa el cliente HTTP, que es chico.
import './retos.css';
import { h, type Indice, type Pareja, type ResultadoReto } from './comun';
import { botonesCompartir, textoResultado } from './compartir';
import { COUNTRIES } from '../engine/countries';
import { CLUBES, PAISES } from '../../api/_retos';
import { CATEGORIAS, abre, marcadorCompleto, sanearNombres, type Categoria, type Jugada } from './pingpong';
import { enfocarTitulo, jugarPingPong, type ConfigPing } from './ui-pingpong';
import { infoEnLinea, salaGuardada } from './online/cliente';
import type { Shell } from './online/shell';
import type { RespuestaSala } from './online/protocolo';
import { AVISOS, NOMBRE_CAT, banderaDe, nombreClub, nombrePais } from './online/textos';

type CatLocal = Categoria | 'dedonde';
type Modo = 'completo' | CatLocal;
type Resultado = ResultadoReto & { motivo?: string; jugadas?: Jugada[] };
interface Sesion {
  modo: Modo;
  elegido: string | null;               // país o club que eligió el jugador; null = al azar (se vuelve a sortear en la revancha)
  jugadores: Pareja;
  categorias: CatLocal[];
  refs: { pais: string; club: string }; // lo que se juega en esta partida
  resultados: Resultado[];
}

/** A dónde abre Retos: una sala por su link, el ranking o el perfil. Sin destino, la entrada (o la sala que este dispositivo tenía abierta). */
export type Destino = { sala: string } | { creada: RespuestaSala } | 'ranking' | 'perfil' | 'retar' | 'dia';

const WIKIDATA = 'https://www.wikidata.org/';
const base = import.meta.env.BASE_URL;

const azar = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
const nombreCat = (s: Sesion, cat: CatLocal) => (cat === 'pais' ? `Ping pong de país: ${nombrePais(s.refs.pais)}` : cat === 'club' ? `Ping pong de club: ${nombreClub(s.refs.club)}` : NOMBRE_CAT[cat]);

export function montarRetos(app: HTMLElement, alSalir: () => void, destino?: Destino): void {
  let cancelar: (() => void) | null = null; // la categoría en curso
  let generacion = 0;                        // para ignorar un import() que llega después de salir
  let enPartida = false;                     // RF-04: con partida empezada, Salir pide confirmación
  let nombres: [string, string] = ['', ''];  // solo en memoria mientras Retos está abierto (RF-28)
  let salirEnLinea: (() => void) | null = null;   // mientras hay una sala abierta, "Salir" del encabezado sale de la sala (RF-09)
  let sala: { detener(): void } | null = null;     // la sala en línea abierta

  const detener = () => { generacion++; cancelar?.(); cancelar = null; sala?.detener(); sala = null; salirEnLinea = null; };
  const salir = () => {
    if (salirEnLinea) return salirEnLinea();
    if (enPartida && !confirm('¿Salir de la partida? Se pierde el avance.')) return;
    detener();
    alSalir();
  };

  // ---------- Marco común: encabezado con Salir, contenido y pie ----------
  function marco(...cuerpo: Node[]): HTMLElement {
    const salirBtn = h('button', { type: 'button', class: 'btn secondary rt-salir' }, 'Salir');
    salirBtn.onclick = salir;
    const enlace = (href: string, texto: string, nueva = false) =>
      h('a', { href, ...(nueva ? { target: '_blank', rel: 'noopener noreferrer' } : {}) }, texto, ...(nueva ? [h('span', { class: 'sr' }, ' (se abre en otra pestaña)')] : []));
    const main = h('main', { class: 'rt-main' }, ...cuerpo);
    app.replaceChildren(
      h('div', { class: 'flag' }),
      h('div', { class: 'rt' },
        h('header', { class: 'rt-top' }, h('div', { class: 'brand' }, 'Chamus', h('span', {}, 'queros')), salirBtn),
        main,
        h('footer', { class: 'rt-pie' },
          h('p', {}, 'Datos de futbolistas: ', enlace(WIKIDATA, 'Wikidata (CC0)', true)),
          h('p', {}, enlace(`${base}privacidad.html`, 'Política de privacidad'), ' · ', enlace(`${base}terminos.html`, 'Términos y condiciones')),
        ),
      ),
    );
    window.scrollTo({ top: 0 });
    return main;
  }
  function pantalla(...cuerpo: Node[]) {
    const main = marco(...cuerpo);
    enfocarTitulo(main);
    return main;
  }
  const titulo = (t: string) => h('h1', { tabindex: '-1' }, t);
  const boton = (texto: string, alClic: () => void, cls = 'btn big') => {
    const b = h('button', { type: 'button', class: cls }, texto);
    b.onclick = alClic;
    return b;
  };

  // ---------- Lo que se le presta al modo en línea ----------
  /** Un Shell atado a la generación actual: si se salió de Retos mientras algo cargaba, sus pantallas ya no pintan nada. */
  function shell(): Shell {
    const id = generacion;
    const vivo = () => id === generacion;
    return {
      pantalla: (...c) => (vivo() ? pantalla(...c) : h('div')),
      marco: (...c) => (vivo() ? marco(...c) : h('div')),
      titulo,
      boton: (t, f, c) => boton(t, f, c),
      alSalirEncabezado: (f) => { if (vivo()) salirEnLinea = f; },
      entrada: () => { if (vivo()) entrada(); },
      alHome: () => { if (vivo()) { detener(); alSalir(); } },
    };
  }
  /** Abre una pantalla del modo en línea (se baja con import() solo ahora) y recuerda la sala que quedó abierta. */
  function abrirEnLinea(f: (sh: Shell, m: typeof import('./online/ui-sala')) => Promise<{ detener(): void } | null | void>) {
    detener();
    enPartida = false;
    const id = generacion;
    const sh = shell();
    const cargando = pantalla(titulo('Retos en línea'), h('p', { role: 'status' }, 'Cargando…'));
    void import('./online/ui-sala').then((m) => f(sh, m)).then((c) => {
      if (!c) return;
      if (id !== generacion) c.detener(); else sala = c;
    }).catch(() => {
      if (id === generacion && cargando.isConnected) pantalla(titulo('No se pudo cargar'), h('p', {}, 'Revisá tu conexión e intentá de nuevo.'), boton('Volver a Retos', entrada));
    });
  }
  const abrirRanking = (vuelta: () => void) => {
    detener();
    const sh = shell();
    void import('./online/ui-ranking').then((m) => m.pantallaRanking(sh, vuelta)).catch(() => {
      pantalla(titulo('No se pudo cargar'), h('p', {}, 'Revisá tu conexión e intentá de nuevo.'), boton('Volver a Retos', entrada));
    });
  };
  const abrirPerfil = (vuelta: () => void) => {
    detener();
    const id = generacion;
    void import('../perfil/index').then((m) => { if (id === generacion) m.montarPerfil(app, vuelta); }).catch(() => {
      if (id === generacion) pantalla(titulo('No se pudo cargar'), h('p', {}, 'Revisá tu conexión e intentá de nuevo.'), boton('Volver a Retos', entrada));
    });
  };

  // ---------- Entrada (RF-01): mismo celular o en línea ----------
  function entrada() {
    detener();
    enPartida = false;
    const id = generacion;
    const opcion = (t: string, d: string, alClic: () => void) => {
      const b = h('button', { type: 'button', class: 'btn secondary rt-op' }, h('b', {}, t), h('span', {}, d));
      b.onclick = alClic;
      return b;
    };
    // Se pinta ya con el modo local; la opción en línea aparece cuando el servidor dice que está disponible (RF-01, RF-37).
    const enLinea = h('div', { class: 'rt-ops' });
    const secundarios = h('div', { class: 'row' }, boton('Mi perfil', () => abrirPerfil(entrada), 'btn secondary'));
    pantalla(
      titulo('Retos Fútbol'),
      h('p', { class: 'rt-intro' }, 'Elegí cómo jugar.'),
      h('div', { class: 'rt-ops' },
        opcion('Jugar en el mismo celular', 'Se lo pasan entre turnos. No suma al ranking.', () => {
          void import('./trivia').catch(() => {});   // RF-33: el modo de preguntas se baja al elegir este modo, así funciona aunque después se pierda la conexión
          inicio();
        })),
      enLinea, secundarios,
    );
    void infoEnLinea().then((ok) => {
      if (!ok || id !== generacion) return;
      enLinea.append(opcion('Retar a alguien en línea', 'Cada uno en su celular: creás una sala y le mandás el enlace.', () => abrirEnLinea((sh, m) => m.crearSalaNueva(sh))));
      secundarios.append(boton('Ranking de Retos', () => abrirRanking(entrada), 'btn secondary'));
    });
  }

  // ---------- Reto del día (specs/reto-del-dia): se entra solo desde el botón del Home (destino 'dia') y se vuelve al Home ----------
  function retoDelDia() {
    detener();
    enPartida = false;
    const id = generacion;
    const host = h('div', { class: 'rt-juego' });
    marco(host);
    void import('./dia/ui').then((m) => { if (id === generacion) cancelar = m.montarRetoDelDia(host, salir); }).catch(() => {
      if (id === generacion) pantalla(titulo('No se pudo cargar el reto del día'), h('p', {}, 'Revisá tu conexión e intentá de nuevo.'), boton('Volver al inicio', salir));
    });
  }

  // ---------- Inicio (RF-05) ----------
  function inicio() {
    detener();
    enPartida = false;
    const campo = (i: 0 | 1) => h('input', { id: `rt-j${i + 1}`, type: 'text', maxlength: '20', autocomplete: 'off', value: nombres[i] });
    const [c1, c2] = [campo(0), campo(1)];
    const opcion = (modo: Modo, t: string, d: string) => {
      const b = h('button', { type: 'button', class: 'btn secondary rt-op' }, h('b', {}, t), h('span', {}, d));
      b.onclick = () => {
        nombres = [c1.value, c2.value];
        if (modo === 'pais' || modo === 'club') elegir(modo);
        else empezar(modo, null);
      };
      return b;
    };
    pantalla(
      titulo('Retos Fútbol'),
      h('p', { class: 'rt-intro' }, 'Un duelo de 2 en el mismo celular: se lo pasan entre turnos. Los nombres son opcionales y no se guardan. Estas partidas no suman al ranking.'),
      h('div', { class: 'panel' },
        h('div', { class: 'grid-2' },
          h('div', { class: 'field' }, h('label', { for: 'rt-j1' }, 'Jugador 1 (opcional)'), c1),
          h('div', { class: 'field' }, h('label', { for: 'rt-j2' }, 'Jugador 2 (opcional)'), c2),
        ),
      ),
      h('h2', { class: 'rt-sub' }, '¿A qué juegan?'),
      h('div', { class: 'rt-ops' },
        opcion('completo', 'Reto completo', 'Las tres categorías: gana quien se lleve 2 de 3.'),
        opcion('pais', 'Ping pong de país', 'Turnos para decir futbolistas de un país, sin repetir.'),
        opcion('club', 'Ping pong de club', 'Turnos para decir futbolistas de un club, sin repetir.'),
        opcion('preguntas', 'Preguntas', '5 preguntas de fútbol para cada uno.'),
        opcion('dedonde', '¿De dónde es?', 'Adiviná la nacionalidad de futbolistas: gana el primero en llegar a 500 puntos.'),
      ),
      boton('Atrás', entrada, 'btn secondary'),
    );
  }

  // ---------- Elegir país o club (RF-06) ----------
  function elegir(modo: 'pais' | 'club') {
    const esPais = modo === 'pais';
    const select = h('select', { id: 'rt-ref' }, h('option', { value: '' }, 'Al azar'));
    if (esPais) for (const c of COUNTRIES) select.append(h('option', { value: c.code }, c.name));
    else for (const id of Object.keys(CLUBES)) select.append(h('option', { value: id }, nombreClub(id)));
    pantalla(
      titulo(NOMBRE_CAT[modo]),
      h('div', { class: 'panel' }, h('div', { class: 'field' }, h('label', { for: 'rt-ref' }, esPais ? 'País' : 'Club'), select)),
      ...(esPais ? [h('p', { class: 'rt-aviso' }, 'Dos países tienen reglas especiales. ', AVISOS.EN, ' ', AVISOS.NL)] : []),
      h('p', { class: 'rt-nota' }, 'Cada jugador tiene 15 segundos por turno. Los futbolistas se verifican en Wikidata; si no se puede, decide el rival.'),
      boton('Empezar', () => empezar(modo, select.value || null)),
      boton('Atrás', inicio, 'btn secondary'),
    );
  }

  // ---------- Partida ----------
  function empezar(modo: Modo, elegido: string | null) {
    const refs = {
      pais: modo === 'pais' && elegido ? elegido : azar(Object.keys(PAISES)),
      club: modo === 'club' && elegido ? elegido : azar(Object.keys(CLUBES)),
    };
    const s: Sesion = {
      modo, elegido, jugadores: sanearNombres(nombres[0], nombres[1]),
      categorias: modo === 'completo' ? [...CATEGORIAS] : [modo], refs, resultados: [],
    };
    enPartida = true;
    void jugar(s, 0);
  }

  async function jugar(s: Sesion, i: number) {
    detener();
    const id = generacion;
    const cat = s.categorias[i];
    const empieza = abre(i);
    const host = h('div', { class: 'rt-juego' });
    marco(host);
    let terminada = false;
    const alTerminar = (r: Resultado) => { terminada = true; fin(s, i, r); };

    if (cat === 'preguntas') {
      try {
        const { jugarTrivia } = await import('./trivia');
        if (id !== generacion) return;
        const c = jugarTrivia(host, s.jugadores, alTerminar, { empieza });
        if (!terminada) cancelar = c;
      } catch {
        if (id !== generacion) return;
        pantalla(titulo('No se pudieron cargar las preguntas'), h('p', {}, 'Revisá tu conexión e intentá de nuevo.'), boton('Volver al inicio de Retos', inicio));
      }
      return;
    }
    if (cat === 'dedonde') {
      try {
        const { jugarDeDonde } = await import('./ui-dedonde');
        if (id !== generacion) return;
        const c = jugarDeDonde(host, s.jugadores, alTerminar, { empieza });
        if (!terminada) cancelar = c;
      } catch {
        if (id !== generacion) return;
        pantalla(titulo('No se pudo cargar ¿De dónde es?'), h('p', {}, 'Revisá tu conexión e intentá de nuevo.'), boton('Volver al inicio de Retos', inicio));
      }
      return;
    }
    const cfg: ConfigPing = cat === 'pais'
      ? { tipo: 'pais', id: s.refs.pais, nombre: nombrePais(s.refs.pais), bandera: banderaDe(nombrePais(s.refs.pais)), aviso: AVISOS[s.refs.pais] }
      : { tipo: 'club', id: s.refs.club, nombre: nombreClub(s.refs.club) };
    const c = jugarPingPong(host, s.jugadores, cfg, alTerminar, { empieza });
    if (!terminada) cancelar = c;
  }

  // ---------- Resultado de una categoría y marcador (RF-07, RF-18) ----------
  function fin(s: Sesion, i: number, r: Resultado) {
    cancelar = null;
    s.resultados.push(r);
    const cat = s.categorias[i];
    const completo = s.modo === 'completo';
    const m = marcadorCompleto(s.resultados.map((x) => x.ganador));
    const [j1, j2] = s.jugadores;
    const quien = (g: Indice | null) => (g === null ? 'Empate' : `Gana ${s.jugadores[g]}`);

    const cuerpo: Node[] = [
      titulo(quien(r.ganador)),
      h('p', { class: 'rt-cat' }, nombreCat(s, cat)),
      ...(r.motivo ? [h('p', { class: 'rt-motivo' }, r.motivo)] : []),
      h('p', { class: 'rt-cuenta' }, `${cat === 'preguntas' ? 'Aciertos' : cat === 'dedonde' ? 'Puntos' : 'Futbolistas aceptados'}: ${j1} ${r.puntos[0]} · ${j2} ${r.puntos[1]}`),
    ];
    if (r.jugadas?.length) {
      cuerpo.push(h('h2', { class: 'rt-sub' }, 'Los futbolistas, en orden'));
      cuerpo.push(h('ol', { class: 'rt-lista' }, ...r.jugadas.map((j) => h('li', {},
        `${j.nombre} (${s.jugadores[j.jugador]})`,
        ...(j.sinVerificar ? [h('span', { class: 'rt-marca' }, ' · sin verificar')] : []),
        ...(j.apelacion ? [h('span', { class: 'rt-marca' }, ' · por apelación')] : []),
      ))));
    }
    if (completo) {
      cuerpo.push(h('p', { class: 'rt-marcador' }, `Marcador del Reto: ${j1} ${m.victorias[0]} · ${j2} ${m.victorias[1]}`));
      if (!m.terminado) {
        const sig = s.categorias[i + 1];
        cuerpo.push(h('p', { class: 'rt-nota' }, `Sigue: ${nombreCat(s, sig)}. Abre ${s.jugadores[abre(i + 1)]}.`));
        cuerpo.push(boton(`Siguiente: ${NOMBRE_CAT[sig]}`, () => void jugar(s, i + 1)));
      } else {
        cuerpo.push(boton('Ver el resultado final', () => final(s)));
      }
    } else {
      enPartida = false;
      cuerpo.push(...botonesFinales(s, textoResultado({ categoria: s.modo, puntos: r.puntos, ganador: r.ganador })));
    }
    pantalla(...cuerpo);
  }

  function final(s: Sesion) {
    enPartida = false;
    const m = marcadorCompleto(s.resultados.map((x) => x.ganador));
    const [j1, j2] = s.jugadores;
    pantalla(
      titulo(m.ganador === null ? 'Empate en el Reto completo' : `Gana ${s.jugadores[m.ganador]} el Reto completo`),
      h('p', { class: 'rt-marcador' }, `Categorías ganadas: ${j1} ${m.victorias[0]} · ${j2} ${m.victorias[1]}`),
      h('ul', { class: 'rt-lista' }, ...s.resultados.map((r, i) =>
        h('li', {}, `${nombreCat(s, s.categorias[i])}: ${r.ganador === null ? 'empate' : `gana ${s.jugadores[r.ganador]}`} (${r.puntos[0]} a ${r.puntos[1]})`))),
      ...botonesFinales(s, textoResultado({ categoria: 'completo', puntos: m.victorias, ganador: m.ganador })),
    );
  }

  /** RF-08: revancha (con otro sorteo si era al azar), cambiar de juego y volver al inicio. */
  function botonesFinales(s: Sesion, texto: string | null): Node[] {
    const compartir = botonesCompartir(texto);
    return [
      boton('Revancha', () => empezar(s.modo, s.elegido)),
      ...(compartir ? [compartir] : []),
      boton('Cambiar de juego', inicio, 'btn secondary'),
      boton('Volver al inicio', salir, 'btn secondary'),
    ];
  }

  // ---------- Apertura ----------
  const volverAlHome = () => { detener(); alSalir(); };
  if (destino === 'ranking') abrirRanking(volverAlHome);
  else if (destino === 'perfil') abrirPerfil(volverAlHome);
  else if (destino === 'retar') abrirEnLinea((sh, m) => m.crearSalaNueva(sh));
  else if (typeof destino === 'object' && 'creada' in destino) abrirEnLinea(async (sh, m) => m.entrarEnSala(sh, destino.creada));
  else if (destino === 'dia') retoDelDia();
  else if (destino) abrirEnLinea((sh, m) => m.unirseConLink(sh, destino.sala));
  else if (salaGuardada()) abrirEnLinea(async (sh, m) => (await m.reanudarSala(sh)) ?? void sh.entrada());   // RF-08: volver a la sala de siempre
  else entrada();
}
