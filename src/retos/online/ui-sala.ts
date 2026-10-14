// Pantallas de la sala en línea: apodo, crear, compartir, unirse por link, lobby, juego, marcador, resultado, revancha y reconexión.
// El servidor es el árbitro: aquí solo se pintan los estados públicos que llegan (por el canal o por las respuestas) y se mandan intenciones.
// Todo texto que viene de otra persona entra con h()/textContent (RF-34): nunca se interpreta como marcado.
import { h, type Indice } from '../comun';
import { COUNTRIES } from '../../engine/countries';
import { CLUBES, PAISES } from '../../../api/_retos';
import { limpiar } from '../pingpong';
import { nodoAvatar } from './avatar';
import { crearCuenta } from './cuenta';
import {
  ErrorCliente, configurar, crearPerfil, crearReloj, crearSala, empezar, estadoSala, esPrevio, guardarSala, infoEnLinea, jugar, olvidarSala,
  pedirToken, perfilPropio, revancha, salaGuardada, salir, unirse, vencer,
} from './cliente';
import { PINTORES } from './pintores';
import {
  CODIGO_RE, canal, type Config, type CtxJuego, type EstadoConexion, type JuegoMontado, type JuegoPublico, type Modo,
  type PerfilPublico, type RespuestaSala, type SalaPublica, type Transporte,
} from './protocolo';
import type { Shell } from './shell';
import { AVISOS, MOTIVOS_SIN_PUNTOS, NOMBRE_CAT, banderaDe, escudoDe, nombreClub, nombrePais, nombresVisibles } from './textos';
import { transporteAuto } from './transporte';

/** El link siempre se arma con el dominio fijo (como el servidor); solo se usa si el servidor no mandó `link` (por ejemplo, al reconectar). */
const LINK_BASE = 'https://chamusqueros.vercel.app';
const REFRESCO_MS = 20_000;   // ponytail: red de seguridad por si se pierde una publicación; el estado completo llega con cada evento o respuesta
const AVISO_CONEXION_MS = 1500;
const NOMBRE_MODO: Record<Modo, string> = { completo: 'Reto completo', pais: 'Ping pong de país', club: 'Ping pong de club', preguntas: 'Preguntas', dedonde: '¿De dónde es?' };
const DESCRIPCION_MODO: Record<Modo, string> = {
  completo: 'Las tres categorías (país, club y preguntas): gana quien se lleve 2 de 3.',
  pais: 'Turnos de 15 segundos para decir futbolistas de un país, sin repetir.',
  club: 'Turnos de 15 segundos para decir futbolistas de un club, sin repetir.',
  preguntas: '5 preguntas de fútbol, las mismas para los dos, 20 segundos cada una.',
  dedonde: 'Un futbolista, 4 selecciones: gana el primero en llegar a 500 puntos.',
};
const nombreRef = (modo: Modo, ref: string | null) => (ref === null ? 'al azar' : modo === 'pais' ? nombrePais(ref) : nombreClub(ref));

// ---------- Piezas ----------
const parrafo = (texto: string, cls = '') => h('p', cls ? { class: cls } : {}, texto);

function infoJugador(p: PerfilPublico, etiquetas: string[] = []): HTMLElement {
  const sel = p.seleccion ? nombrePais(p.seleccion) : null;
  const bandera = sel ? banderaDe(sel) : undefined;
  const escudo = p.club ? escudoDe(p.club) : undefined;
  const escudoImg = escudo ? h('img', { class: 'rt-escudo', src: escudo, alt: '', loading: 'lazy' }) : null;
  escudoImg?.addEventListener('error', () => escudoImg.remove());
  return h('div', { class: 'rt-jug' },
    nodoAvatar(p.avatar, 44),
    h('div', { class: 'rt-jug-datos' },
      h('p', { class: 'rt-jug-nombre' }, h('b', {}, p.apodo), ...etiquetas.map((e) => h('span', { class: 'rt-tag' }, e))),
      ...(p.club ? [h('p', { class: 'rt-jug-fav' }, ...(escudoImg ? [escudoImg] : []), nombreClub(p.club))] : []),
      ...(sel ? [h('p', { class: 'rt-jug-fav' }, ...(bandera ? [h('img', { class: 'nation-flag', src: bandera, alt: '' })] : []), sel)] : []),
    ));
}

function pantallaMensaje(sh: Shell, titulo: string, texto: string, ...botones: HTMLElement[]) {
  return sh.pantalla(sh.titulo(titulo), parrafo(texto), ...botones);
}
const pantallaCargando = (sh: Shell, texto: string) => sh.pantalla(sh.titulo('Retos en línea'), h('p', { role: 'status' }, texto));

function pantallaError(sh: Shell, e: unknown, reintentar?: () => void) {
  const msg = e instanceof ErrorCliente ? e.message : 'Algo falló. Probá de nuevo en un momento.';
  pantallaMensaje(sh, 'No se pudo', msg,
    ...(reintentar ? [sh.boton('Reintentar', reintentar)] : []), sh.boton('Volver a Retos', () => sh.entrada(), 'btn secondary'));
}

// ---------- Apodo (RF-04, RF-27, RF-31) ----------
/** Pide el apodo y crea el perfil (el avatar parte al azar). Resuelve `true` si quedó creado y `false` si se volvió atrás. */
function pedirApodo(sh: Shell, razon: string): Promise<boolean> {
  return new Promise((resolver) => {
    const campo = h('input', { id: 'rt-apodo', type: 'text', maxlength: '20', autocomplete: 'nickname', autocapitalize: 'words', spellcheck: 'false', 'aria-describedby': 'rt-apodo-ayuda rt-apodo-error', enterkeyhint: 'go' });
    const error = h('p', { class: 'error rt-error', id: 'rt-apodo-error', role: 'alert' });
    const seguir = h('button', { type: 'submit', class: 'btn big' }, 'Continuar');
    const form = h('form', { class: 'rt-form', novalidate: '' },
      h('div', { class: 'field' }, h('label', { for: 'rt-apodo' }, 'Tu apodo'), campo),
      h('p', { class: 'rt-ayuda', id: 'rt-apodo-ayuda' }, 'De 2 a 20 caracteres: letras, números, espacios, apóstrofo, guion y punto. Lo ven los demás jugadores y el ranking.'),
      error, seguir);
    form.onsubmit = async (e) => {
      e.preventDefault();
      const apodo = limpiar(campo.value);
      const largo = [...apodo].length;
      if (largo < 2 || largo > 20) {
        error.textContent = 'El apodo tiene que tener entre 2 y 20 caracteres.';
        campo.setAttribute('aria-invalid', 'true');
        campo.focus();
        return;
      }
      seguir.disabled = true;
      error.textContent = '';
      try {
        await crearPerfil(apodo);
        resolver(true);
      } catch (err) {
        seguir.disabled = false;
        error.textContent = err instanceof ErrorCliente ? err.message : 'No se pudo crear el perfil.';
        campo.setAttribute('aria-invalid', 'true');
        campo.focus();
      }
    };
    sh.pantalla(
      sh.titulo('Elegí tu apodo'),
      parrafo(razon, 'rt-intro'),
      h('div', { class: 'panel' }, form),
      sh.boton('Atrás', () => resolver(false), 'btn secondary'),
    );
  });
}

/** `true` si este dispositivo ya tiene perfil o lo creó ahora; `false` si no hay conexión o se canceló (ya se mostró lo que corresponde). */
async function asegurarPerfil(sh: Shell, razon: string): Promise<boolean> {
  pantallaCargando(sh, 'Conectando…');
  try {
    if (await perfilPropio()) return true;
  } catch (e) {
    return new Promise((resolver) => pantallaError(sh, e, () => void asegurarPerfil(sh, razon).then(resolver)));
  }
  return pedirApodo(sh, razon);
}

// ---------- Flujos de entrada ----------
const RAZON_CREAR = 'Antes de crear la sala, elegí cómo te van a ver los demás. Lo podés cambiar después en tu perfil.';
const RAZON_UNIRSE = 'Antes de entrar a la sala, elegí cómo te van a ver los demás. Lo podés cambiar después en tu perfil.';

export async function crearSalaNueva(sh: Shell): Promise<SalaControl | null> {
  if (!(await asegurarPerfil(sh, RAZON_CREAR))) { sh.entrada(); return null; }
  pantallaCargando(sh, 'Creando la sala…');
  try {
    return entrarEnSala(sh, await crearSala());
  } catch (e) {
    pantallaError(sh, e, () => void crearSalaNueva(sh));
    return null;
  }
}

function pantallaNoExiste(sh: Shell) {
  pantallaMensaje(sh, 'La sala no existe o ya venció', 'Pedile a tu rival que te mande un enlace nuevo, o creá una sala propia.',
    sh.boton('Crear una sala', () => void crearSalaNueva(sh)), sh.boton('Volver a Retos', () => sh.entrada(), 'btn secondary'));
}
function pantallaLlena(sh: Shell, anfitrion?: string) {
  pantallaMensaje(sh, 'Sala llena', anfitrion ? `La sala de ${anfitrion} ya tiene dos jugadores.` : 'Esa sala ya tiene dos jugadores.',
    sh.boton('Crear una sala', () => void crearSalaNueva(sh)), sh.boton('Volver a Retos', () => sh.entrada(), 'btn secondary'));
}

/** Quien abre el enlace `?sala=`: entra directo si ya es de la sala o ya tiene perfil; si no, antes pide el apodo (RF-04). */
export async function unirseConLink(sh: Shell, codigo: string): Promise<SalaControl | null> {
  if (!CODIGO_RE.test(codigo)) { pantallaNoExiste(sh); return null; }
  pantallaCargando(sh, 'Buscando la sala…');
  if (!(await infoEnLinea())) {
    pantallaMensaje(sh, 'En línea no disponible', 'El modo en línea no está disponible por ahora. Podés jugar en el mismo celular.', sh.boton('Volver a Retos', () => sh.entrada()));
    return null;
  }
  try {
    const r = await estadoSala(codigo);
    if (!esPrevio(r)) return entrarEnSala(sh, r);
    if (r.llena) { pantallaLlena(sh, r.anfitrion); return null; }
    if (!(await asegurarPerfil(sh, RAZON_UNIRSE))) { sh.entrada(); return null; }
    pantallaCargando(sh, 'Entrando a la sala…');
    return entrarEnSala(sh, await unirse(codigo));
  } catch (e) {
    if (e instanceof ErrorCliente && (e.codigo === 'sala_inexistente' || e.codigo === 'sala_vencida')) pantallaNoExiste(sh);
    else if (e instanceof ErrorCliente && e.codigo === 'sala_llena') pantallaLlena(sh);
    else if (e instanceof ErrorCliente && e.codigo === 'mismo_dispositivo') pantallaMensaje(sh, 'No podés jugar contra vos mismo', 'Esta sala ya la abriste desde este dispositivo. Mandale el enlace a otra persona.', sh.boton('Volver a Retos', () => sh.entrada()));
    else pantallaError(sh, e, () => void unirseConLink(sh, codigo));
    return null;
  }
}

/** RF-08: si este dispositivo tenía una sala abierta, vuelve a ella en su estado actual. `null` si no había o ya no existe. */
export async function reanudarSala(sh: Shell): Promise<SalaControl | null> {
  const codigo = salaGuardada();
  if (!codigo) return null;
  pantallaCargando(sh, 'Volviendo a tu sala…');
  try {
    const r = await estadoSala(codigo);
    if (esPrevio(r) || r.sala.fase === 'cerrada') { olvidarSala(); return null; }
    return entrarEnSala(sh, r);
  } catch (e) {
    if (e instanceof ErrorCliente && !e.esRed && e.codigo !== 'limite') olvidarSala();   // la red caída no borra la sala recordada
    return null;
  }
}

// ---------- La sala ----------
export interface SalaControl { detener(): void }

const transporteEnLinea = (): Transporte => transporteAuto(pedirToken, async (codigo) => {
  const r = await estadoSala(codigo);
  return esPrevio(r) ? null : { v: r.sala.v, sala: r.sala };
});

const plazoDe = (s: SalaPublica): number | null => (s.fase === 'jugando' ? s.partida?.juego?.deadline ?? null : s.fase === 'entre' ? s.partida?.entreDeadline ?? null : null);

export function entrarEnSala(sh: Shell, inicial: RespuestaSala, transporte: Transporte = transporteEnLinea()): SalaControl {
  const yo: Indice = inicial.yo;
  const otro: Indice = yo === 0 ? 1 : 0;
  const codigo = inicial.sala.codigo;
  const link = inicial.link ?? `${LINK_BASE}/?sala=${codigo}`;
  const reloj = crearReloj();
  let sala = inicial.sala;
  let vMax = sala.v;
  reloj.muestrear(sala.ahora);
  guardarSala(codigo);

  let activo = true;
  let nombres = nombresVisibles(sala.jugadores);
  let claveVista = '';
  let lobby: { actualizar(): void } | null = null;
  let pintor: { clave: string; montado: JuegoMontado<JuegoPublico> | null } | null = null;
  let cuentaEntre: ReturnType<typeof crearCuenta> | null = null;
  let conexion: EstadoConexion = 'conectado';
  let cortada = false;
  let cancelarTransporte: (() => void) | null = null;
  let timerError: ReturnType<typeof setTimeout> | undefined;
  let timerConexion: ReturnType<typeof setTimeout> | undefined;
  let guardian: ReturnType<typeof setTimeout> | undefined;
  let ultimoVencer = { v: -1, t: 0 };
  const historia = new Map<string, Map<string, string>>();   // lo ocurrido en cada categoría, para el resultado (el contrato no lo trae)

  // ---------- Marco fijo de la sala ----------
  const estado = h('div', { class: 'rt-conexion', role: 'status', 'aria-live': 'polite' });
  const errores = h('p', { class: 'error rt-error', role: 'alert' });
  const contenido = h('div', { class: 'rt-vista' });
  const raiz = h('div', { class: 'rt-sala' }, estado, errores, contenido);

  const mostrarError = (e: unknown) => {
    if (!activo) return;
    if (e instanceof ErrorCliente && !e.esRed && ['sala_vencida', 'sala_inexistente', 'no_miembro'].includes(e.codigo)) { terminarSinSala(); return; }
    const msg = e instanceof ErrorCliente ? (e.codigo === 'limite' && e.reintentarSeg ? `Demasiados intentos seguidos. Esperá ${e.reintentarSeg} segundos.` : e.message) : 'Algo falló. Probá de nuevo.';
    errores.textContent = msg;
    clearTimeout(timerError);
    timerError = setTimeout(() => { errores.textContent = ''; }, 7000);
    if (e instanceof ErrorCliente && ['fase_incorrecta', 'fuera_de_turno', 'aun_no', 'conflicto'].includes(e.codigo)) void refrescar();
  };
  /** Ejecuta una acción del jugador; la respuesta trae el estado completo. */
  async function hacer(f: () => Promise<RespuestaSala>) {
    try {
      const r = await f();
      errores.textContent = '';
      aplicar(r.sala);
    } catch (e) { mostrarError(e); }
  }

  // ---------- Reloj y vencimientos ----------
  /** Pide cerrar el plazo vigente. El servidor solo acepta si de verdad pasó; llamarlo también es la señal de que este celular sigue conectado (RF-09). */
  function pedirVencer() {
    if (!activo) return;
    const v = vMax;
    if (ultimoVencer.v === v && Date.now() - ultimoVencer.t < 1500) return;
    ultimoVencer = { v, t: Date.now() };
    void intentarVencer(v, 0);
  }
  async function intentarVencer(v: number, intento: number) {
    try {
      aplicar((await vencer(codigo, v)).sala);
    } catch (e) {
      if (!(e instanceof ErrorCliente) || e.esRed) return;   // sin red: el guardián y el refresco lo reintentan
      if (['sala_vencida', 'sala_inexistente', 'no_miembro'].includes(e.codigo)) { mostrarError(e); return; }
      const espera = e.codigo === 'aun_no' ? (e.faltanMs ?? 1500) + 60 : e.codigo === 'limite' ? (e.reintentarSeg ?? 2) * 1000 : 0;
      if (espera && intento < 6 && activo && vMax === v) setTimeout(() => { if (activo && vMax === v) void intentarVencer(v, intento + 1); }, Math.min(espera, 5000));
    }
  }
  /** Red de seguridad: si el pintor no pidió cerrar el plazo, se pide aquí poco después de que venza, y se insiste unos segundos. */
  function programarGuardian() {
    clearTimeout(guardian);
    const d = plazoDe(sala);
    if (d === null || !activo) return;
    const v = vMax;
    const tic = (n: number) => {
      if (!activo || vMax !== v || n > 8) return;
      pedirVencer();
      guardian = setTimeout(() => tic(n + 1), 2000);
    };
    guardian = setTimeout(() => tic(0), Math.max(0, d - reloj.ahora()) + 400);
  }

  async function refrescar() {
    if (!activo) return;
    try {
      const r = await estadoSala(codigo);
      if (esPrevio(r)) terminarSinSala(); else aplicar(r.sala);
    } catch (e) {
      if (e instanceof ErrorCliente && !e.esRed && ['sala_vencida', 'sala_inexistente', 'no_miembro'].includes(e.codigo)) terminarSinSala();
    }
  }

  // ---------- Conexión (RF-16) ----------
  function pintarConexion() {
    clearTimeout(timerConexion);
    if (conexion === 'conectado') { estado.replaceChildren(); return; }
    timerConexion = setTimeout(() => {
      if (!activo || conexion === 'conectado') return;
      if (conexion === 'reconectando') { estado.replaceChildren(h('p', {}, 'Reconectando…')); return; }
      estado.replaceChildren(h('p', {}, 'Se perdió la conexión con la sala. '), sh.boton('Reintentar', () => void reconectar(), 'btn secondary'));
    }, AVISO_CONEXION_MS);
  }
  const alConexion = (c: EstadoConexion) => {
    if (!activo) return;
    if (c !== 'conectado') cortada = true;
    else if (cortada) { cortada = false; void refrescar(); }   // al volver, el estado actual sin intervención
    conexion = c;
    pintarConexion();
  };
  async function suscribir() {
    cancelarTransporte?.();
    cancelarTransporte = null;
    try {
      const cancelar = await transporte.suscribir(canal(codigo), (e) => aplicar(e.sala), alConexion);
      if (activo) cancelarTransporte = cancelar; else cancelar();
    } catch { alConexion('caido'); }
  }
  async function reconectar() {
    conexion = 'reconectando';
    pintarConexion();
    await suscribir();
    await refrescar();
  }

  // ---------- Estado nuevo ----------
  function aplicar(nueva: SalaPublica) {
    if (!activo) return;
    reloj.muestrear(nueva.ahora);
    if (nueva.v <= vMax) return;   // viejo o repetido
    vMax = nueva.v;
    sala = nueva;
    nombres = nombresVisibles(sala.jugadores);
    registrar();
    pintar();
    programarGuardian();
  }

  function registrar() {
    const p = sala.partida;
    const j = p?.juego;
    if (!p || !j) return;
    const clave = `${p.num}:${p.actual}`;
    const m = historia.get(clave) ?? new Map<string, string>();
    historia.set(clave, m);
    if (j.cat === 'pais' || j.cat === 'club') {
      j.jugadas.forEach((x, i) => m.set(String(i), `${x.nombre} (${nombres[x.jugador]})${x.sinVerificar ? ' · sin verificar' : ''}${x.apelacion ? ' · por apelación' : ''}`));
    } else if (j.fase === 'revelado' && j.revelado) {
      const r = j.revelado;
      const dicho = (k: Indice) => (r.elegida[k] === null ? 'no respondió' : r.elegida[k] === r.correcta ? 'acertó' : 'falló');
      m.set(`${j.cat === 'preguntas' && j.subita ? 's' : ''}${j.n}`, j.cat === 'preguntas'
        ? `${j.pregunta} → ${j.opciones[r.correcta]} (${nombres[0]} ${dicho(0)}, ${nombres[1]} ${dicho(1)})`
        : `${j.nombre} → ${j.opciones[r.correcta]} (${nombres[0]} +${'ganado' in r ? r.ganado[0] : 0}, ${nombres[1]} +${'ganado' in r ? r.ganado[1] : 0})`);
    }
  }

  // ---------- Pintar ----------
  function detenerVista() {
    pintor?.montado?.detener();
    pintor = null;
    cuentaEntre?.detener();
    cuentaEntre = null;
    lobby = null;
  }
  function poner(vista: Node, foco = true) {
    contenido.replaceChildren(vista);
    if (foco) contenido.querySelector<HTMLElement>('h1[tabindex]')?.focus({ preventScroll: true });
  }

  function pintar() {
    // Una vista nueva (cambia la fase o la partida) se reconstruye; la misma se actualiza en el lugar.
    const clave = `${sala.fase}|${sala.partida?.num ?? ''}|${sala.fase === 'entre' || sala.fase === 'fin' ? sala.v : ''}`;
    if (sala.fase === 'lobby' && lobby && claveVista === clave) { lobby.actualizar(); return; }
    if (sala.fase === 'jugando' && claveVista === clave) { actualizarJuego(); return; }
    detenerVista();
    claveVista = clave;
    if (sala.fase === 'lobby') { const l = vistaLobby(); lobby = l; poner(l.nodo); window.scrollTo({ top: 0 }); }
    else if (sala.fase === 'jugando') montarJuego();
    else if (sala.fase === 'entre') { poner(vistaEntre()); }
    else if (sala.fase === 'fin') { poner(vistaFin()); window.scrollTo({ top: 0 }); }
    else { poner(vistaCerrada()); olvidarSala(); }
  }

  // ----- Lobby (RF-06) -----
  function vistaLobby() {
    const soyAnfitrion = yo === 0;
    const lista = h('ul', { class: 'rt-jugs' });
    const nodoInvitar = h('section', { class: 'panel', 'aria-label': 'Invitar' });
    const nodoConfig = h('section', { class: 'panel', 'aria-labelledby': 'rt-cfg-t' });
    const ayuda = h('p', { class: 'rt-ayuda', id: 'rt-empezar-ayuda', role: 'status' });
    const empezarBtn = sh.boton('Empezar', () => { empezarBtn.disabled = true; void hacer(() => empezar(codigo)).finally(() => { empezarBtn.disabled = sala.jugadores.length < 2; }); });
    empezarBtn.setAttribute('aria-describedby', 'rt-empezar-ayuda');
    const salirBtn = sh.boton('Salir de la sala', () => { if (dejarSala()) sh.entrada(); }, 'btn secondary');

    // Configuración (solo el anfitrión cambia; el invitado ve el cambio en vivo)
    const selModo = h('select', { id: 'rt-modo' }, ...(Object.keys(NOMBRE_MODO) as Modo[]).map((m) => h('option', { value: m }, NOMBRE_MODO[m])));
    const selRef = h('select', { id: 'rt-ref' });
    const campoRef = h('div', { class: 'field' }, h('label', { for: 'rt-ref', id: 'rt-ref-l' }, ''), selRef);
    const notaModo = h('p', { class: 'rt-ayuda' });
    const aviso = h('p', { class: 'rt-aviso' });
    const lectura = h('p', { class: 'rt-lectura', role: 'status' });
    let poblado: Modo | null = null;
    const poblarRef = (modo: Modo) => {
      poblado = modo;
      selRef.replaceChildren(h('option', { value: '' }, 'Al azar'));
      if (modo === 'pais') for (const c of COUNTRIES.filter((c) => c.code in PAISES)) selRef.append(h('option', { value: c.code }, c.name));
      else if (modo === 'club') for (const id of Object.keys(CLUBES)) selRef.append(h('option', { value: id }, nombreClub(id)));
      campoRef.hidden = modo !== 'pais' && modo !== 'club';
      campoRef.querySelector('label')!.textContent = modo === 'pais' ? 'País' : 'Club';
    };
    const mandarConfig = () => {
      const modo = selModo.value as Modo;
      const config: Config = { modo, ref: modo === 'pais' || modo === 'club' ? selRef.value || null : null };
      void hacer(() => configurar(codigo, config));
    };
    selModo.onchange = () => { poblarRef(selModo.value as Modo); mandarConfig(); };
    selRef.onchange = mandarConfig;
    nodoConfig.append(
      h('h2', { class: 'rt-sub', id: 'rt-cfg-t' }, '¿A qué juegan?'),
      ...(soyAnfitrion ? [h('div', { class: 'field' }, h('label', { for: 'rt-modo' }, 'Categoría'), selModo), campoRef] : [lectura]),
      notaModo, aviso);

    // Invitar (RF-03): código, enlace, Compartir y Copiar enlace
    if (soyAnfitrion) {
      const campoLink = h('textarea', { id: 'rt-link', readonly: '', rows: '2', 'aria-label': 'Enlace de la sala', spellcheck: 'false' }, link);
      campoLink.onfocus = () => campoLink.select();
      const copiado = h('p', { class: 'rt-ayuda', role: 'status' });
      const copiar = sh.boton('Copiar enlace', async () => {
        try {
          await navigator.clipboard.writeText(link);
        } catch {
          campoLink.focus();
          campoLink.select();
          if (!(document.execCommand?.('copy'))) { copiado.textContent = 'Seleccioná el enlace y copialo.'; return; }
        }
        copiar.textContent = 'Copiado';
        copiado.textContent = 'Enlace copiado.';
        setTimeout(() => { copiar.textContent = 'Copiar enlace'; copiado.textContent = ''; }, 2500);
      }, 'btn secondary');
      const botones: HTMLElement[] = [];
      if (typeof navigator.share === 'function') {
        botones.push(sh.boton('Compartir', async () => {
          try { await navigator.share({ title: 'Chamusqueros: Retos Fútbol', text: 'Te reto a un duelo de fútbol en línea.', url: link }); } catch { /* canceló el menú */ }
        }));
      }
      botones.push(copiar);
      nodoInvitar.append(
        h('h2', { class: 'rt-sub' }, 'Invitá a alguien'),
        h('p', { class: 'rt-ayuda' }, 'Código de la sala'),
        h('p', { class: 'rt-codigo', 'aria-label': `Código: ${[...codigo].join(' ')}` }, codigo),
        h('div', { class: 'field' }, h('label', { for: 'rt-link' }, 'Enlace'), campoLink),
        h('div', { class: 'row' }, ...botones), copiado);
    }

    const actualizar = () => {
      const js = sala.jugadores;
      lista.replaceChildren(
        ...js.map((p, i) => h('li', {}, infoJugador(p, [...(i === 0 ? ['Anfitrión'] : []), ...(i === yo ? ['Vos'] : [])]))),
        ...(js.length < 2 ? [h('li', { class: 'rt-espera' }, 'Esperando al segundo jugador…')] : []));
      const { modo, ref } = sala.config;
      if (soyAnfitrion) {
        selModo.value = modo;
        if (poblado !== modo) poblarRef(modo);
        selRef.value = ref ?? '';
      } else {
        lectura.textContent = `${NOMBRE_MODO[modo]}${modo === 'pais' || modo === 'club' ? `: ${nombreRef(modo, ref)}` : ''}. Lo elige ${nombres[0]}.`;
      }
      notaModo.textContent = DESCRIPCION_MODO[modo];
      aviso.textContent = modo === 'pais' && ref && AVISOS[ref] ? AVISOS[ref] : '';
      aviso.hidden = !aviso.textContent;
      nodoInvitar.hidden = js.length >= 2;
      if (soyAnfitrion) {
        empezarBtn.disabled = js.length < 2;
        ayuda.textContent = js.length < 2 ? 'Para empezar tienen que estar los dos en la sala.' : 'Están los dos. Cuando quieras, empezá.';
      } else {
        ayuda.textContent = js.length < 2 ? 'Esperando…' : `Esperá a que ${nombres[0]} empiece la partida.`;
      }
    };
    const nodo = h('div', { class: 'rt-lobby' },
      h('h1', { tabindex: '-1' }, `Sala ${codigo}`),
      h('section', { class: 'panel', 'aria-label': 'Jugadores', 'aria-live': 'polite' }, lista),
      ...(soyAnfitrion ? [nodoInvitar] : []), nodoConfig,
      ...(soyAnfitrion ? [empezarBtn] : []), ayuda, salirBtn);
    actualizar();
    return { nodo, actualizar };
  }

  // ----- Juego (RF-11) -----
  const ctxJuego = (): CtxJuego => ({
    yo, jugadores: sala.jugadores, ahora: reloj.ahora,
    enviar: (a) => hacer(() => jugar(codigo, a)),
    vencer: pedirVencer,
  });

  function franja(): HTMLElement {
    const j = sala.jugadores;
    const lado = (i: Indice) => h('div', { class: 'rt-vs-j' }, nodoAvatar(j[i].avatar, 32), h('span', { class: 'rt-vs-n' }, nombres[i], ...(i === yo ? [h('span', { class: 'rt-tag' }, 'Vos')] : [])));
    return h('div', { class: 'rt-vs' }, lado(yo), h('span', { class: 'rt-vs-v', 'aria-hidden': 'true' }, 'vs'), lado(otro));
  }

  function montarJuego() {
    const juego = sala.partida?.juego;
    const caja = h('div', { class: 'rt-juego' });
    poner(h('div', {}, franja(), caja), false);
    if (!juego || !sala.partida) { caja.append(h('p', { role: 'status' }, 'Preparando la partida…')); return; }
    const clave = `${sala.partida.num}:${sala.partida.actual}:${juego.cat}`;
    const mia = { clave, montado: null as JuegoMontado<JuegoPublico> | null };
    pintor = mia;
    caja.append(h('p', { role: 'status' }, 'Cargando…'));
    const ctx = ctxJuego();
    (async () => {
      const montar = (await PINTORES[juego.cat]()) as unknown as (host: HTMLElement, j: JuegoPublico, c: CtxJuego) => JuegoMontado<JuegoPublico>;
      if (!activo || pintor !== mia) return;
      caja.replaceChildren();
      mia.montado = montar(caja, sala.partida?.juego ?? juego, ctx);   // con el estado más nuevo, por si llegó otro mientras cargaba
    })().catch(() => {
      if (activo && pintor === mia) caja.replaceChildren(h('p', { role: 'alert' }, 'No se pudo cargar esta categoría. Revisá tu conexión.'), sh.boton('Reintentar', () => { claveVista = ''; pintar(); }, 'btn secondary'));
    });
  }
  function actualizarJuego() {
    const p = sala.partida;
    if (!p?.juego) return;
    const clave = `${p.num}:${p.actual}:${p.juego.cat}`;
    if (pintor?.clave !== clave) { detenerVista(); claveVista = ''; pintar(); return; }   // pasó a otra categoría del Reto completo
    pintor.montado?.actualizar(p.juego);
  }

  // ----- Marcador entre categorías -----
  function vistaEntre() {
    const p = sala.partida!;
    const cuentaNodo = h('span', {}, '0');
    const anuncio = h('p', { class: 'sr', 'aria-live': 'polite' });
    const ganadas: [number, number] = [p.resultados.filter((r) => r.ganador === 0).length, p.resultados.filter((r) => r.ganador === 1).length];
    const sigue = p.categorias[p.resultados.length];
    cuentaEntre = crearCuenta({ ahora: reloj.ahora, vencer: pedirVencer }, { mostrar: (s) => { cuentaNodo.textContent = String(s); }, anunciar: (m) => { anuncio.textContent = m; } });
    if (p.entreDeadline !== null) cuentaEntre.fijar(p.entreDeadline);
    return h('div', {},
      h('h1', { tabindex: '-1' }, 'Marcador del Reto'),
      h('p', { class: 'rt-marcador' }, `${nombres[0]} ${ganadas[0]} · ${nombres[1]} ${ganadas[1]}`),
      h('ul', { class: 'rt-lista' }, ...p.resultados.map((r) => h('li', {}, `${NOMBRE_CAT[r.categoria]}: ${resumenCat(r.ganador, r.puntos)}. ${r.motivo}`))),
      ...(sigue ? [h('p', { class: 'rt-ayuda' }, `Sigue: ${NOMBRE_CAT[sigue]}. Empieza en `, cuentaNodo, ' s.')] : []),
      anuncio);
  }
  const resumenCat = (g: Indice | null, pts: [number, number]) => `${g === null ? 'empate' : `gana ${nombres[g]}`} (${pts[0]} a ${pts[1]})`;

  // ----- Resultado y revancha (RF-10, RF-15) -----
  function vistaFin() {
    const p = sala.partida;
    const f = p?.final;
    const abandono = f?.abandono ?? null;
    const titulo = !f ? 'Fin de la partida'
      : abandono === yo ? 'Perdiste por abandono'
      : abandono !== null ? `${nombres[abandono]} abandonó`
      : f.ganador === null ? 'Empate' : f.ganador === yo ? '¡Ganaste!' : `Ganó ${nombres[f.ganador]}`;
    const cuerpo: Node[] = [h('h1', { tabindex: '-1' }, titulo)];
    if (f) {
      if (abandono !== null && abandono !== yo) cuerpo.push(h('p', { class: 'rt-motivo' }, 'Ganaste la partida.'));
      cuerpo.push(h('p', { class: 'rt-motivo' }, f.motivo));
    }
    if (p) {
      cuerpo.push(h('h2', { class: 'rt-sub' }, 'Puntos de la partida'));
      cuerpo.push(h('ul', { class: 'rt-lista' }, ...p.resultados.map((r) => h('li', {}, `${NOMBRE_CAT[r.categoria]}: ${resumenCat(r.ganador, r.puntos)}`))));
      const lineas = [...historia.entries()].filter(([k]) => k.startsWith(`${p.num}:`));
      if (lineas.some(([, m]) => m.size)) {
        cuerpo.push(h('h2', { class: 'rt-sub' }, 'Lo que pasó'));
        for (const [k, m] of lineas) {
          if (!m.size) continue;
          const cat = p.categorias[Number(k.split(':')[1])];
          cuerpo.push(h('h3', { class: 'rt-sub3' }, cat ? NOMBRE_CAT[cat] : 'Partida'), h('ol', { class: 'rt-lista' }, ...[...m.values()].map((t) => h('li', {}, t))));
        }
      }
    }
    if (f) {
      cuerpo.push(h('h2', { class: 'rt-sub' }, 'Puntos de ranking'));
      cuerpo.push(h('ul', { class: 'rt-lista' }, ...([yo, otro] as Indice[]).map((i) => {
        const motivo = f.sinPuntos[i];
        const texto = f.rankingGanado[i] > 0 ? `+${f.rankingGanado[i]} puntos`
          : abandono === i ? 'no suma: abandonó' : `no sumó${motivo ? ` (${MOTIVOS_SIN_PUNTOS[motivo]})` : ''}`;
        return h('li', {}, `${nombres[i]}${i === yo ? ' (vos)' : ''}: ${texto}`);
      })));
    }
    // Revancha: la nueva partida empieza cuando los dos la aceptan; si uno salió, ya no se puede.
    if (sala.salio !== null) {
      cuerpo.push(h('p', { class: 'rt-motivo', role: 'status' }, `${nombres[sala.salio]} salió de la sala.`));
    } else if (sala.revancha[yo]) {
      const esp = sh.boton(`Esperando la revancha de ${nombres[otro]}…`, () => {}, 'btn big');
      esp.disabled = true;
      cuerpo.push(esp);
    } else {
      if (sala.revancha[otro]) cuerpo.push(h('p', { class: 'rt-motivo', role: 'status' }, `${nombres[otro]} quiere la revancha.`));
      const b = sh.boton('Revancha', () => { b.disabled = true; void hacer(() => revancha(codigo)).finally(() => { b.disabled = false; }); });
      cuerpo.push(b);
    }
    cuerpo.push(
      sh.boton('Ranking de Retos', () => { detener(); void import('./ui-ranking').then((m) => m.pantallaRanking(sh, () => { void reanudarSala(sh).then((c) => { if (!c) sh.entrada(); }); })); }, 'btn secondary'),
      sh.boton('Salir de la sala', () => { if (dejarSala()) sh.entrada(); }, 'btn secondary'));
    return h('div', {}, ...cuerpo);
  }

  function vistaCerrada() {
    return h('div', {}, h('h1', { tabindex: '-1' }, 'La sala se cerró'), parrafo(`${nombres[0]} salió y cerró la sala.`),
      sh.boton('Volver a Retos', () => { dejarSala(); sh.entrada(); }));
  }

  // ---------- Salir y cerrar ----------
  /** Salir de la sala por voluntad propia. En plena partida pide confirmación y pierde por abandono. `false` si se arrepintió. */
  function dejarSala(): boolean {
    if (!activo) return true;
    if ((sala.fase === 'jugando' || sala.fase === 'entre') && !confirm('¿Salir de la partida? Perdés por abandono.')) return false;
    detener();
    olvidarSala();
    void salir(codigo).catch(() => {});   // ponytail: sin reintento; si no llega, la sala vence sola por inactividad
    return true;
  }
  function terminarSinSala() {
    if (!activo) return;
    detener();
    olvidarSala();
    pantallaNoExiste(sh);
  }
  function detener() {
    if (!activo) return;
    activo = false;
    detenerVista();
    clearTimeout(guardian);
    clearTimeout(timerError);
    clearTimeout(timerConexion);
    clearInterval(refresco);
    document.removeEventListener('visibilitychange', alVer);
    removeEventListener('online', alVolverRed);
    cancelarTransporte?.();
    sh.alSalirEncabezado(null);
  }

  const alVer = () => { if (document.visibilityState === 'visible') { void refrescar(); programarGuardian(); } };
  const alVolverRed = () => void refrescar();
  const refresco = setInterval(() => { if (document.visibilityState === 'visible') void refrescar(); }, REFRESCO_MS);
  document.addEventListener('visibilitychange', alVer);
  addEventListener('online', alVolverRed);

  sh.alSalirEncabezado(() => { if (dejarSala()) sh.alHome(); });
  sh.marco(raiz);
  pintar();
  programarGuardian();
  void suscribir().then(() => refrescar());   // el estado de ahora, por si algo cambió entre la respuesta y la suscripción
  return { detener };
}
