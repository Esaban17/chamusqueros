// Barra de resultados en vivo: se monta sola al importarse, fuera de #app (render() reemplaza todo lo que hay dentro).
// Pide /api/en-vivo (nunca a ESPN) al cargar y cada 2 minutos con la pestaña visible. Los textos van con textContent.
import './en-vivo.css';

type Partido = { liga: string; local: string; visita: string; gl: number | null; gv: number | null; estado: string; minuto: number | null };
type Datos = { actualizado: number; partidos: Partido[] };

const CADA_MS = 120_000;
const MAX_EDAD_MS = 30 * 60_000;

const barra = document.createElement('section');
barra.id = 'en-vivo';
barra.hidden = true;
barra.setAttribute('aria-label', 'Resultados de fútbol en vivo');
const nuevo = <K extends keyof HTMLElementTagNameMap>(tag: K, clase: string, texto?: string) => {
  const el = document.createElement(tag);
  el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
};
const edad = nuevo('small', 'ev-edad');
const etiqueta = nuevo('span', 'ev-tag');
const punto = nuevo('i', 'ev-dot');
punto.setAttribute('aria-hidden', 'true');
etiqueta.append(punto, nuevo('b', 'ev-rotulo', 'EN VIVO'), edad);
const lista = nuevo('ul', 'ev-lista');
lista.tabIndex = 0; // para que el teclado pueda desplazarla con las flechas
lista.setAttribute('aria-label', 'Partidos, deslizá para ver más');
barra.append(etiqueta, lista);
document.getElementById('app')!.before(barra);

let datos: Datos | null = null;
let ultimaSolicitud = 0;

const estadoDe = (p: Partido) => (p.estado === 'descanso' ? 'Medio tiempo' : p.estado === 'penales' ? 'Penales' : p.minuto != null ? `${p.minuto}'` : 'En juego');

function armarLista() {
  const izq = lista.scrollLeft;
  lista.replaceChildren(
    ...(datos?.partidos ?? []).map((p) => {
      const li = nuevo('li', 'ev-p');
      li.append(nuevo('span', 'ev-liga', p.liga), nuevo('span', 'ev-eq', `${p.local} ${p.gl == null || p.gv == null ? 'vs' : `${p.gl}–${p.gv}`} ${p.visita}`), nuevo('span', 'ev-min', estadoDe(p)));
      return li;
    }),
    nuevo('li', 'ev-fuente', 'Datos: ESPN'),
  );
  lista.scrollLeft = izq; // no perder el deslizamiento al refrescar
}

/** Muestra u oculta la barra y actualiza "act. hace X min" sin pedir nada. */
function pintar() {
  const ms = datos ? Date.now() - datos.actualizado : Infinity;
  barra.hidden = !datos || ms >= MAX_EDAD_MS;
  if (barra.hidden || !datos) return;
  const m = Math.max(0, Math.floor(ms / 60_000));
  edad.textContent = m < 1 ? 'act. ahora' : `act. hace ${m} min`;
}

async function cargar() {
  ultimaSolicitud = Date.now(); // también si falla: se reintenta a los 2 min, no se martilla
  try {
    const res = await fetch('/api/en-vivo', { signal: AbortSignal.timeout(8000) });
    const j = await res.json();
    if (!res.ok || !Array.isArray(j?.partidos) || (j.actualizado !== null && typeof j.actualizado !== 'number')) return;
    const nueva = j.partidos.length && j.actualizado !== null ? (j as Datos) : null;
    // Sin cambios no se reconstruye la lista: así no se pierde la posición del deslizamiento.
    if ((nueva?.actualizado ?? null) !== (datos?.actualizado ?? null)) { datos = nueva; armarLista(); }
  } catch { /* se conserva lo último pintado */ }
  pintar();
}

/** Un solo temporizador: con la pestaña visible, refresca la antigüedad y pide datos si ya pasaron 2 minutos. */
function tic() {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - ultimaSolicitud >= CADA_MS - 5000) void cargar();
  else pintar();
}
setInterval(tic, 30_000);
document.addEventListener('visibilitychange', tic);
tic();
