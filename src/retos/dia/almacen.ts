// Reto del día: el ÚNICO archivo de src/retos/dia/ que toca el almacenamiento del navegador (specs/reto-del-dia RF-13 a RF-15, A08).
// Todo lo que se lee es entrada no confiable: desdeTexto() pone el tope de tamaño, parsea y valida todo o nada. Cada acceso va en try/catch:
// el almacenamiento puede estar bloqueado, lleno o no existir, y entonces el reto se juega igual.
import { desdeTexto, type Registro } from './puro';

const CLAVE = 'chamusqueros:reto-dia';

/** El registro guardado, o null si no hay, no se puede leer o no pasa la validación (se comporta como la primera vez). */
export function leer(hoy: number): Registro | null {
  try { return desdeTexto(localStorage.getItem(CLAVE), hoy); } catch { return null; }
}

/** Guarda el registro; false si no se pudo (RF-15: la pantalla avisa y sigue). */
export function guardar(reg: Registro): boolean {
  try { localStorage.setItem(CLAVE, JSON.stringify(reg)); return true; } catch { return false; }
}
