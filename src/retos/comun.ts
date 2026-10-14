// Contrato entre el bloque A (estructura, ping pong) y el B (preguntas). Idéntico en ambas ramas.
export type Pareja = [string, string];   // nombres ya saneados (1 a 24 caracteres: hasta 20 más " (1)" o " (2)"); se muestran solo con textContent
export type Indice = 0 | 1;
export interface ResultadoReto {
  ganador: Indice | null;                 // null = empate
  puntos: [number, number];               // aciertos (preguntas) o futbolistas aceptados (ping pong)
}
export interface OpcionesReto { empieza?: Indice }  // quién abre; por defecto 0
/** Pinta una categoría dentro de `contenedor` y devuelve la función que la cancela. */
export type JugarReto = (contenedor: HTMLElement, jugadores: Pareja, onFin: (r: ResultadoReto) => void, opciones?: OpcionesReto) => () => void;

/** Crea un elemento; los textos entran como nodos de texto: nunca se interpretan como marcado. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, string> = {}, ...hijos: (string | Node)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) el.setAttribute(k, v);
  el.append(...hijos);
  return el;
}
