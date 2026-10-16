// Compartir un resultado de Retos Fútbol (specs/compartir-retos). Dos mitades:
//  - pura (textoResultado, datosEnLinea, urlResultado, enlaceWhatsApp): se prueba con tsx, sin DOM ni entorno al cargar;
//  - DOM (botonesCompartir, anclaWhatsApp): menú del sistema, WhatsApp y copiar. Todo texto entra por h()/textContent/value.
// El texto del resultado NO recibe apodos, nombres, código de sala ni enlace de sala: no puede filtrarlos (RF-08, RF-11).
import { h, type Indice } from './comun';
import type { PartidaPublica } from './online/protocolo';

export type CategoriaTexto = 'pais' | 'club' | 'preguntas' | 'dedonde' | 'completo';
export interface DatosResultado {
  categoria: string;               // clave de FRASE; fuera del diccionario no hay texto ni botón
  puntos: [number, number];        // por índice de jugador; en el Reto completo, categorías ganadas
  ganador: 0 | 1 | null;           // null = empate
  yo?: 0 | 1;                      // en línea: quién comparte. Sin él: mismo celular
}

/** '' quita el ?ref= del enlace del resultado (Decisión 1 de la spec). */
export const REF_RESULTADO = 'reto';
const SITIO_FIJO = 'https://chamusqueros.vercel.app';

const FRASE: Record<CategoriaTexto, string> = {
  pais: 'un duelo de ping pong de país',
  club: 'un duelo de ping pong de club',
  preguntas: 'un duelo de preguntas de fútbol',
  dedonde: 'un duelo de ¿De dónde es?',
  completo: 'un Reto completo',
};
const conocida = (c: string): c is CategoriaTexto => Object.hasOwn(FRASE, c);

/** RF-09: entero entre 0 y 99999; lo demás vale 0. */
const normalizar = (n: unknown) => Math.min(99999, Math.max(0, Math.trunc(Number(n)) || 0));

/** RF-08. `null` si la categoría no es una de las cinco. */
export function textoResultado(d: DatosResultado): string | null {
  if (!conocida(d.categoria)) return null;
  const frase = FRASE[d.categoria];
  const a = normalizar(d.puntos?.[0]);
  const b = normalizar(d.puntos?.[1]);
  if (d.yo === 0 || d.yo === 1) {
    const propio = d.yo === 0 ? a : b;
    const rival = d.yo === 0 ? b : a;
    const verbo = d.ganador === null ? 'Empaté' : d.ganador === d.yo ? 'Gané' : 'Perdí';
    return `${verbo} ${frase} en Chamusqueros (${propio} a ${rival}). ¿Te animás?`;
  }
  const cierre = d.ganador === null ? `empatamos ${a} a ${b}` : `terminó ${Math.max(a, b)} a ${Math.min(a, b)}`;
  return `Jugamos ${frase} en Chamusqueros: ${cierre}. ¿Te animás?`;
}

/** RF-02: datos del botón en línea, o `null` (abandono, sin final, sin marcador o categoría desconocida). */
export function datosEnLinea(p: PartidaPublica | null | undefined, yo: Indice): DatosResultado | null {
  if (!p?.final || !p.resultados?.length || p.final.abandono !== null) return null;
  const categoria = p.categorias.length > 1 ? 'completo' : p.categorias[0];
  if (typeof categoria !== 'string' || !conocida(categoria)) return null;
  const puntos: [number, number] = categoria === 'completo'
    ? [p.resultados.filter((r) => r.ganador === 0).length, p.resultados.filter((r) => r.ganador === 1).length]
    : p.resultados[0].puntos;
  return { categoria, puntos, ganador: p.final.ganador, yo };
}

/** RF-10: `<origen>/?ref=reto`. Solo el origen de la variable o de la página; nunca la barra de direcciones completa. */
export function urlResultado(variable?: string, origenPagina?: string): string {
  let origen = SITIO_FIJO;
  for (const candidato of [variable, origenPagina]) {
    try {
      const u = new URL(candidato ?? '');
      if (u.protocol === 'https:' || u.protocol === 'http:') { origen = u.origin; break; }
    } catch { /* no es una URL: probar la siguiente */ }
  }
  return `${origen}/${REF_RESULTADO ? `?ref=${REF_RESULTADO}` : ''}`;
}

/** RF-07 */
export const enlaceWhatsApp = (mensaje: string) => `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

// ---------- DOM ----------

/** RF-07: enlace a WhatsApp en otra pestaña, anunciado a quien usa lector de pantalla. */
export function anclaWhatsApp(mensaje: string, etiqueta = 'Enviar por WhatsApp'): HTMLAnchorElement {
  return h('a', { class: 'btn', href: enlaceWhatsApp(mensaje), target: '_blank', rel: 'noopener noreferrer' }, etiqueta, h('span', { class: 'sr' }, ' (se abre en otra pestaña)'));
}

/** RF-04 a RF-06. `null` si no hay texto. El texto compartido lleva el enlace del resultado, nunca el de la barra de direcciones. */
export function botonesCompartir(texto: string | null): HTMLElement | null {
  if (!texto) return null;
  const url = urlResultado(import.meta.env.VITE_SITE_URL as string | undefined, location.origin);
  const mensaje = `${texto} ${url}`;
  const aviso = h('p', { class: 'rt-ayuda', role: 'status' });
  const campo = h('textarea', { readonly: '', rows: '3', 'aria-label': 'Texto para compartir', spellcheck: 'false' });
  const caja = h('div', { class: 'field', hidden: '' }, campo);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensaje);
    } catch {
      campo.value = mensaje;
      caja.hidden = false;
      campo.focus();
      campo.select();
      if (!document.execCommand?.('copy')) { aviso.textContent = 'Seleccioná el texto y copialo.'; return; }
      caja.hidden = true;
    }
    aviso.textContent = 'Copiamos el texto. Pegalo en WhatsApp.';
  };

  const acciones: HTMLElement[] = [];
  if (typeof navigator.share === 'function') {
    const b = h('button', { type: 'button', class: 'btn secondary' }, 'Compartir');
    b.onclick = async () => {
      try {
        await navigator.share({ title: 'Chamusqueros: Retos Fútbol', text: texto, url });
      } catch (e) {
        if ((e as { name?: string } | null)?.name !== 'AbortError') await copiar();   // RF-05: cerrar el menú no es un error
      }
    };
    acciones.push(b);
  } else {
    const c = h('button', { type: 'button', class: 'btn secondary' }, 'Copiar texto');
    c.onclick = () => void copiar();
    acciones.push(anclaWhatsApp(mensaje), c);
  }
  return h('div', { class: 'rt-compartir' }, h('div', { class: 'row' }, ...acciones), aviso, caja);
}
