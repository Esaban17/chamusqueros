// Retos Fútbol: duelo de 2 jugadores en el mismo dispositivo. Pantallas de inicio, elegir país o club, marcador y resultado.
// Se carga con import() desde home() (src/main.ts). No guarda nada en el dispositivo ni toca el motor de la carrera.
import './retos.css';
import { h, type Indice, type Pareja, type ResultadoReto } from './comun';
import { COUNTRIES } from '../engine/countries';
import { clubById } from '../engine/clubs';
import { FLAG_CODE } from '../ui/flags';
import { CLUBES, PAISES } from '../../api/_retos';
import { CATEGORIAS, abre, marcadorCompleto, sanearNombres, type Categoria, type Jugada } from './pingpong';
import { enfocarTitulo, jugarPingPong, type ConfigPing } from './ui-pingpong';

type Modo = 'completo' | Categoria;
type Resultado = ResultadoReto & { motivo?: string; jugadas?: Jugada[] };
interface Sesion {
  modo: Modo;
  elegido: string | null;               // país o club que eligió el jugador; null = al azar (se vuelve a sortear en la revancha)
  jugadores: Pareja;
  categorias: Categoria[];
  refs: { pais: string; club: string }; // lo que se juega en esta partida
  resultados: Resultado[];
}

const NOMBRE_CAT: Record<Categoria, string> = { pais: 'Ping pong de país', club: 'Ping pong de club', preguntas: 'Preguntas' };
const AVISOS: Record<string, string> = {
  EN: 'Inglaterra: cuentan solo los futbolistas que jugaron con su Selección (en la fuente casi nadie figura con nacionalidad "Inglaterra", sino con "Reino Unido", que incluye a Escocia y Gales).',
  NL: 'Países Bajos: cuentan los futbolistas del Reino de los Países Bajos o que jugaron con su Selección.',
};
const WIKIDATA = 'https://www.wikidata.org/';
const base = import.meta.env.BASE_URL;

const azar = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
const nombrePais = (code: string) => COUNTRIES.find((c) => c.code === code)?.name ?? code;
const nombreClub = (id: string) => {
  const c = clubById(id);
  return `${c.name} (${nombrePais(c.country)})`;
};
const nombreCat = (s: Sesion, cat: Categoria) => (cat === 'pais' ? `Ping pong de país: ${nombrePais(s.refs.pais)}` : cat === 'club' ? `Ping pong de club: ${nombreClub(s.refs.club)}` : NOMBRE_CAT[cat]);

export function montarRetos(app: HTMLElement, alSalir: () => void): void {
  let cancelar: (() => void) | null = null; // la categoría en curso
  let generacion = 0;                        // para ignorar un import() que llega después de salir
  let enPartida = false;                     // RF-04: con partida empezada, Salir pide confirmación
  let nombres: [string, string] = ['', ''];  // solo en memoria mientras Retos está abierto (RF-28)

  const detener = () => { generacion++; cancelar?.(); cancelar = null; };
  const salir = () => {
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
      h('p', { class: 'rt-intro' }, 'Un duelo de 2 en el mismo celular: se lo pasan entre turnos. Los nombres son opcionales y no se guardan.'),
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
      ),
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
    const cfg: ConfigPing = cat === 'pais'
      ? { tipo: 'pais', id: s.refs.pais, nombre: nombrePais(s.refs.pais), bandera: FLAG_CODE[nombrePais(s.refs.pais)] ? `https://flagcdn.com/w40/${FLAG_CODE[nombrePais(s.refs.pais)]}.png` : undefined, aviso: AVISOS[s.refs.pais] }
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
      h('p', { class: 'rt-cuenta' }, `${cat === 'preguntas' ? 'Aciertos' : 'Futbolistas aceptados'}: ${j1} ${r.puntos[0]} · ${j2} ${r.puntos[1]}`),
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
      cuerpo.push(...botonesFinales(s));
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
      ...botonesFinales(s),
    );
  }

  /** RF-08: revancha (con otro sorteo si era al azar), cambiar de juego y volver al inicio. */
  function botonesFinales(s: Sesion): Node[] {
    return [
      boton('Revancha', () => empezar(s.modo, s.elegido)),
      boton('Cambiar de juego', inicio, 'btn secondary'),
      boton('Volver al inicio', salir, 'btn secondary'),
    ];
  }

  // RF-33: se baja el modo de preguntas en cuanto se abre Retos, así funciona aunque después se pierda la conexión.
  void import('./trivia').catch(() => {});
  inicio();
}
