// Piezas que comparten las dos pantallas de "¿De dónde es?" (ui-dedonde.ts: mismo celular; ui-dedonde-linea.ts: en línea).
// Sin banco ni red: solo arma elementos con h(), así que nada de lo que viene de otra persona se interpreta como marcado (RF-34).
import { h } from './comun';
import { META } from './dedonde';
import { FLAG_CODE } from '../ui/flags';

/** El CSS viaja aparte (no se puede importar de forma estática sin romper las pruebas con tsx): se pide al abrir la categoría. */
export const cargarCss = () => import('./dedonde.css').catch(() => undefined);

/** Bandera decorativa (el nombre del país va escrito al lado). */
export const bandera = (sel: string): HTMLElement =>
  FLAG_CODE[sel]
    ? h('img', { class: 'dd-bandera', src: `https://flagcdn.com/w40/${FLAG_CODE[sel]}.png`, alt: '', loading: 'lazy', width: '28', height: '19' })
    : h('span', { class: 'dd-bandera', 'aria-hidden': 'true' });

/** Una de las 4 opciones: número (atajo de teclado), bandera, nombre del país y un lugar para la marca ✓/✗ con texto. */
export function botonOpcion(i: number, sel: string): { boton: HTMLButtonElement; marca: HTMLElement } {
  const marca = h('span', { class: 'dd-marca' });
  const boton = h('button', { type: 'button', class: 'dd-op', 'aria-keyshortcuts': String(i + 1) },
    h('span', { class: 'dd-n', 'aria-hidden': 'true' }, String(i + 1)), bandera(sel), h('span', { class: 'dd-t' }, h('span', { class: 'dd-nombre' }, sel), marca));
  return { boton, marca };
}

/** Marca de una opción: ✓ o ✗ (decorativos) y siempre la palabra al lado. */
export const marcar = (marca: HTMLElement, ok: boolean | null, texto: string) =>
  marca.append(h('span', { class: 'dd-linea' }, ...(ok === null ? [] : [h('span', { 'aria-hidden': 'true' }, ok ? '✓ ' : '✗ ')]), texto));

/** Marcador de los dos jugadores con la barra hacia la meta. `sub` es una línea chica debajo (por ejemplo lo ganado en la ronda). */
export function listaMarcador(filas: { nombre: string; puntos: number; sub?: string }[]): HTMLElement {
  return h('ul', { class: 'dd-marcador' }, ...filas.map((f) => {
    const barra = h('span', { class: 'dd-meta', 'aria-hidden': 'true' }, h('i'));
    barra.firstElementChild!.setAttribute('style', `width:${Math.min(100, (100 * f.puntos) / META)}%`);
    return h('li', {}, h('b', {}, f.nombre), h('span', { class: 'dd-puntos' }, String(f.puntos), h('span', { class: 'dd-sr' }, ' puntos')),
      ...(f.sub ? [h('span', { class: 'dd-sub' }, f.sub)] : []), barra);
  }));
}
