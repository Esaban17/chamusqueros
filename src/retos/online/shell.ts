// Lo que index.ts le presta a las pantallas en línea: el marco (encabezado con "Salir", pie), el título con foco y los botones.
// Solo tipos: así ui-sala.ts y ui-ranking.ts no dependen de index.ts.
export interface Shell {
  /** Reemplaza la pantalla y lleva el foco al título (RF-33). Devuelve el contenedor principal. */
  pantalla(...cuerpo: Node[]): HTMLElement;
  /** Reemplaza la pantalla sin mover el foco (para actualizar en el lugar). */
  marco(...cuerpo: Node[]): HTMLElement;
  titulo(texto: string): HTMLElement;
  boton(texto: string, alClic: () => void, cls?: string): HTMLButtonElement;
  /** Qué hace el "Salir" del encabezado mientras hay una sala abierta; `null` devuelve el comportamiento de siempre. */
  alSalirEncabezado(f: (() => void) | null): void;
  /** La pantalla de entrada de Retos (mismo celular / en línea). */
  entrada(): void;
  /** Salir de Retos hacia el Home. */
  alHome(): void;
}
