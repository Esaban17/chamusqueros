// Mi perfil: apodo, avatar (el editor de la carrera), club y selección favoritos, y las estadísticas en línea que calcula el servidor.
// Se carga con import() desde el Home (src/main.ts) y desde Retos. Funciona sin Ably: solo habla con /api/perfil.
// Todo texto externo (apodo, mensajes del servidor) entra con h()/textContent; los ids de club y país salen de las listas del juego (A03).
import './perfil.css';
import { h } from '../retos/comun';
import { ALL_CLUBS, type Club } from '../engine/clubs';
import { COUNTRIES, countryOf } from '../engine/countries';
import type { Avatar } from '../engine/types';
import { NT_KIT, avatarSVG, randomAvatar } from '../ui/avatar';
import { avatarDeCodigo, avatarEditorHtml, montarEditorAvatar } from '../ui/avatar-editor';
import { FLAG_CODE } from '../ui/flags';
import type { Estadisticas, MejorCarrera, PerfilCompleto, PerfilEdicion } from '../retos/online/protocolo';
import { ErrorPerfil, guardarPerfil, leerPerfil, perfilLocal } from './cliente';

const MAX_CLUBES = 30;
const MIN_BUSQUEDA = 2;
const base = import.meta.env.BASE_URL;

const sinTildes = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function bandera(pais: string): HTMLImageElement | null {
  const c = FLAG_CODE[pais];
  return c ? h('img', { class: 'nation-flag', src: `https://flagcdn.com/w40/${c}.png`, alt: '', loading: 'lazy' }) : null;
}

/** Escudo del club: el dibujado (siglas y colores) con la imagen encima si existe; si no carga, queda el dibujado. */
function escudo(club: Club): HTMLElement {
  const img = h('img', { src: `${base}escudos/${club.id}.png`, alt: '', loading: 'lazy' });
  img.addEventListener('error', () => img.remove(), { once: true });
  const el = h('span', { class: 'crest sm' }, club.short, img);
  el.style.setProperty('--c1', club.colors[0]);
  el.style.setProperty('--c2', club.colors[1]);
  return el;
}

function textoRacha(e: Estadisticas): string {
  if (!e.rachaTipo || e.rachaN < 1) return 'Sin racha';
  if (e.rachaTipo === 'V') return plural(e.rachaN, 'victoria seguida', 'victorias seguidas');
  if (e.rachaTipo === 'E') return plural(e.rachaN, 'empate seguido', 'empates seguidos');
  return plural(e.rachaN, 'derrota seguida', 'derrotas seguidas');
}

function bloqueEstadisticas(e: Estadisticas, mejor: MejorCarrera | null): HTMLElement {
  const celda = (k: string, v: string | Node) => h('div', { class: 'pf-stat' }, h('dt', {}, k), h('dd', {}, v));
  return h('div', { class: 'pf-estadisticas' },
    h('dl', { class: 'pf-stats' },
      celda('Partidas', String(e.jugadas)), celda('Victorias', String(e.victorias)), celda('Empates', String(e.empates)),
      celda('Derrotas', String(e.derrotas)), celda('Puntos', String(e.puntos)),
      celda('Posición', e.posicion ? `#${e.posicion}` : h('span', {}, '—', h('span', { class: 'sr' }, ' (todavía sin puntos)'))),
    ),
    h('dl', { class: 'pf-rachas' },
      celda('Racha actual', textoRacha(e)),
      celda('Mejor racha de victorias', e.mejorRachaV > 0 ? plural(e.mejorRachaV, 'victoria seguida', 'victorias seguidas') : 'Ninguna todavía'),
    ),
    ...(mejor ? [h('p', { class: 'pf-nota' }, `Tu mejor carrera: ${mejor.score} pts · ${plural(mejor.titles, 'título', 'títulos')} · ${plural(mejor.caps, 'partido', 'partidos')} con la Selección.`)] : []),
  );
}

const ESTADISTICAS_VACIAS: Estadisticas = { jugadas: 0, victorias: 0, empates: 0, derrotas: 0, rachaTipo: null, rachaN: 0, mejorRachaV: 0, puntos: 0, posicion: null };

export function montarPerfil(app: HTMLElement, alSalir: () => void): void {
  let activo = true;
  const salir = () => { activo = false; alSalir(); };

  function marco(...cuerpo: Node[]): HTMLElement {
    const volver = h('button', { type: 'button', class: 'btn secondary pf-volver' }, 'Volver');
    volver.onclick = salir;
    const main = h('div', { class: 'pf-main' }, ...cuerpo);
    app.replaceChildren(
      h('div', { class: 'flag' }),
      h('div', { class: 'pf' }, h('header', { class: 'pf-top' }, h('div', { class: 'brand' }, 'Chamus', h('span', {}, 'queros')), volver), main),
    );
    window.scrollTo({ top: 0 });
    main.querySelector<HTMLElement>('h1[tabindex]')?.focus({ preventScroll: true });   // RF-33: el foco va al título
    return main;
  }
  const titulo = () => h('h1', { tabindex: '-1' }, 'Mi perfil');

  async function cargar() {
    marco(titulo(), h('p', { class: 'pf-nota', role: 'status' }, 'Cargando tu perfil…'));
    let servidor: PerfilCompleto | null = null;
    let sinConexion = false;
    try {
      servidor = await leerPerfil();
    } catch (e) {
      // Sin servidor el perfil igual se muestra con la copia local; guardar necesitará conexión.
      sinConexion = !(e instanceof ErrorPerfil) || e.codigo === 'red';
    }
    if (activo) formulario(servidor, perfilLocal(), sinConexion);
  }

  function formulario(servidor: PerfilCompleto | null, local: PerfilEdicion | null, sinConexion: boolean) {
    const ini = servidor ?? local;
    const codigo = avatarDeCodigo(ini?.avatar);
    const avatar: Avatar = codigo ? { ...codigo.avatar } : randomAvatar();   // sin perfil, el avatar parte al azar (RF-31)
    const dorsal = codigo?.dorsal ?? 10;
    let club = ini?.club ?? null;

    // ---------- Apodo ----------
    const apodo = h('input', { id: 'pf-apodo', type: 'text', maxlength: '20', autocomplete: 'off', spellcheck: 'false', value: ini?.apodo ?? '', 'aria-describedby': 'pf-apodo-ayuda pf-apodo-error' });
    const errorApodo = h('p', { class: 'error', id: 'pf-apodo-error', role: 'alert' });

    // ---------- Avatar (el editor de la carrera) ----------
    const editor = h('div', {});
    editor.innerHTML = avatarEditorHtml(avatar);   // HTML propio con índices numéricos: sin texto de nadie
    const pintar = () => { editor.querySelector('#avatarPreview')!.innerHTML = avatarSVG(avatar, NT_KIT, dorsal, 132); };
    montarEditorAvatar(editor, avatar, pintar);
    pintar();

    // ---------- Club favorito ----------
    const actual = h('div', { class: 'pf-club-actual', 'aria-live': 'polite' });
    const buscador = h('input', { id: 'pf-club-q', type: 'search', autocomplete: 'off', spellcheck: 'false', placeholder: 'Nombre o ciudad', 'aria-describedby': 'pf-club-ayuda' });
    const ayuda = h('p', { class: 'pf-nota', id: 'pf-club-ayuda', 'aria-live': 'polite' }, `Escribí al menos ${MIN_BUSQUEDA} letras para buscar tu club.`);
    const lista = h('ul', { class: 'pf-clubes' });
    let indice: { club: Club; clave: string }[] | null = null;   // ponytail: búsqueda lineal sobre ~1.000 clubes; sobra para teclear
    const pintarActual = () => {
      const c = ALL_CLUBS.find((x) => x.id === club);
      actual.replaceChildren(...(c ? [escudo(c), h('b', {}, c.name), h('span', { class: 'pf-sub' }, countryOf(c.country).name)] : ['Sin club favorito']));
    };
    const buscar = () => {
      const q = sinTildes(buscador.value.trim());
      if (q.length < MIN_BUSQUEDA) { lista.replaceChildren(); ayuda.textContent = `Escribí al menos ${MIN_BUSQUEDA} letras para buscar tu club.`; return; }
      indice ??= ALL_CLUBS.map((c) => ({ club: c, clave: sinTildes(`${c.name} ${c.city}`) }));
      const hallados = indice.filter((x) => x.clave.includes(q));
      ayuda.textContent = !hallados.length ? 'No encontramos ese club.' : hallados.length > MAX_CLUBES ? `Mostramos ${MAX_CLUBES} de ${hallados.length}: escribí más para afinar.` : plural(hallados.length, 'resultado', 'resultados');
      lista.replaceChildren(...hallados.slice(0, MAX_CLUBES).map(({ club: c }) => {
        const b = h('button', { type: 'button', class: 'pf-opcion', 'aria-pressed': String(c.id === club) },
          escudo(c), h('span', {}, c.name, h('small', {}, `${c.city} · ${countryOf(c.country).name}`)));
        b.onclick = () => {
          club = c.id;
          pintarActual();
          lista.querySelectorAll('.pf-opcion').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        };
        return h('li', {}, b);
      }));
    };
    buscador.addEventListener('input', buscar);
    const sinClub = h('button', { type: 'button', class: 'btn secondary small pf-sin' }, 'Sin club');
    sinClub.onclick = () => {
      club = null;
      pintarActual();
      lista.querySelectorAll('.pf-opcion').forEach((o) => o.setAttribute('aria-pressed', 'false'));
    };
    pintarActual();

    // ---------- Selección favorita ----------
    const select = h('select', { id: 'pf-sel' }, h('option', { value: '' }, 'Sin selección favorita'));
    for (const c of [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name, 'es'))) {
      const o = h('option', { value: c.code }, c.name);
      if (c.code === ini?.seleccion) o.selected = true;
      select.append(o);
    }
    const banderaSel = h('span', { 'aria-hidden': 'true' });
    const pintarBandera = () => {
      const pais = COUNTRIES.find((c) => c.code === select.value);
      const img = pais && bandera(pais.name);
      banderaSel.replaceChildren(...(img ? [img] : []));
    };
    select.addEventListener('change', pintarBandera);
    pintarBandera();

    // ---------- Guardar ----------
    const error = h('p', { class: 'error', role: 'alert' });
    const estado = h('p', { class: 'pf-estado', role: 'status' });
    const guardar = h('button', { type: 'submit', class: 'btn big' }, 'Guardar perfil');
    const estadisticas = h('div', {}, bloqueEstadisticas(servidor?.estadisticas ?? ESTADISTICAS_VACIAS, servidor?.mejorCarrera ?? null));

    const form = h('form', { class: 'panel', novalidate: '' },
      h('div', { class: 'field' }, h('label', { for: 'pf-apodo' }, 'Apodo'), apodo,
        h('p', { class: 'pf-nota', id: 'pf-apodo-ayuda' }, 'De 2 a 20 caracteres: letras, números, espacios, apóstrofo, guion y punto.'), errorApodo),
      h('div', { class: 'field', role: 'group', 'aria-labelledby': 'pf-l-avatar' }, h('span', { class: 'label', id: 'pf-l-avatar' }, 'Avatar'), editor),
      h('div', { class: 'field', role: 'group', 'aria-labelledby': 'pf-l-club' },
        h('span', { class: 'label', id: 'pf-l-club' }, 'Club favorito'), actual,
        h('label', { for: 'pf-club-q', class: 'sr' }, 'Buscar club'), buscador, ayuda, lista, sinClub),
      h('div', { class: 'field' }, h('label', { for: 'pf-sel' }, 'Selección favorita'), h('div', { class: 'pf-sel' }, banderaSel, select)),
      error, guardar, estado,
    );
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      error.textContent = estado.textContent = errorApodo.textContent = '';
      apodo.removeAttribute('aria-invalid');
      const nombre = apodo.value.trim().replace(/\s+/g, ' ');
      const rechazar = (m: string) => { errorApodo.textContent = m; apodo.setAttribute('aria-invalid', 'true'); apodo.focus(); };
      if (nombre.length < 2 || nombre.length > 20) return rechazar('Escribí un apodo de 2 a 20 caracteres.');
      guardar.disabled = true;
      guardar.textContent = 'Guardando…';
      try {
        const r = await guardarPerfil({ apodo: nombre, avatar: [avatar.skin, avatar.hair, avatar.hairColor, avatar.beard, avatar.extra, dorsal], club, seleccion: select.value || null });
        if (!activo) return;
        apodo.value = r.apodo;
        estadisticas.replaceChildren(bloqueEstadisticas(r.estadisticas, r.mejorCarrera));
        estado.textContent = 'Perfil guardado.';
      } catch (e) {
        if (!activo) return;
        const c = e instanceof ErrorPerfil ? e.codigo : 'error';
        if (c === 'apodo_rechazado') rechazar((e as ErrorPerfil).message !== c ? (e as ErrorPerfil).message : 'Ese apodo no se puede usar. Probá con otro.');
        else if (c === 'sin_credencial' || c === 'no_miembro') error.textContent = 'Este perfil pertenece a otro navegador, o se borraron los datos del sitio en este. Desde acá no se puede editar.';
        else if (c === 'limite') error.textContent = 'Demasiados intentos seguidos. Esperá un momento y probá de nuevo.';
        else if (c === 'red') error.textContent = 'No pudimos conectar con el servidor, así que el perfil no se guardó. Podés seguir jugando y volver a intentarlo en un rato.';
        else error.textContent = 'No pudimos guardar el perfil. Probá de nuevo en un rato.';
      } finally {
        guardar.disabled = false;
        guardar.textContent = 'Guardar perfil';
      }
    });

    const privacidad = h('a', { href: `${base}privacidad.html` }, 'política de privacidad');
    marco(
      titulo(),
      ...(sinConexion ? [h('p', { class: 'pf-aviso', role: 'status' }, 'No pudimos conectar con el servidor: no vemos tus estadísticas y guardar el perfil necesita conexión. La carrera funciona igual.')] : []),
      h('p', { class: 'pf-aviso' }, 'Tu perfil vive en este dispositivo. Si borrás los datos del navegador se desvincula: queda en el servidor sin dueño hasta que pidas su borrado (', privacidad, ').'),
      form,
      h('h2', {}, 'Tus estadísticas'),
      estadisticas,
      h('p', { class: 'pf-nota' }, 'Solo cuentan las partidas en línea. Las partidas en el mismo celular no suman a estas estadísticas ni al ranking.'),
    );
  }

  void cargar();
}
