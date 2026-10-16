// Carrera guardada en el dispositivo (specs/continuar-carrera): acceso al almacenamiento, bloque del Home y avisos.
// Nada de aquí hace peticiones de red, escribe en la consola ni toca el contador de carreras: retomar no cuenta como carrera iniciada.
// Guardar, leer y borrar nunca lanzan: sin almacenamiento (lleno, bloqueado, modo privado) el juego sigue como siempre, sin mensajes.
import { seasonLabel, type Career } from './engine/engine';
import { leer, serializar } from './engine/guardado';
import { POSITION_NAMES, type Resolution } from './engine/types';
import { esc } from './ui/esc';

export const CLAVE = 'chamusqueros:carrera';
export type Almacen = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** El almacenamiento del navegador, o null si no existe o el acceso lanza. */
function delNavegador(): Almacen | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

/** Quita la carrera guardada (si falla, no hay nada que hacer). */
export function borrarCarrera(a: Almacen | null = delNavegador()): void {
  try {
    a?.removeItem(CLAVE);
  } catch {
    /* sin almacenamiento */
  }
}

/** Guarda la carrera (reemplaza la anterior: hay una sola). Si no se puede, borra la copia anterior para no ofrecer una desactualizada. Devuelve `d` para usarse en línea. */
export function guardarCarrera<T extends Resolution | null>(c: Career, d: T, a: Almacen | null = delNavegador()): T {
  try {
    const texto = serializar(c, d);
    if (texto === null || !a) borrarCarrera(a);
    else a.setItem(CLAVE, texto);
  } catch {
    borrarCarrera(a);
  }
  return d;
}

/** Solo si hay una entrada (sin validarla ni consumirla). */
export function hayCarreraGuardada(a: Almacen | null = delNavegador()): boolean {
  try {
    return a?.getItem(CLAVE) != null;
  } catch {
    return false;
  }
}

/** La carrera guardada y válida; null si no hay; 'descartada' (y la entrada se borra) si no sirve. */
export function leerCarrera(a: Almacen | null = delNavegador()): { career: Career; desenlace: Resolution | null } | 'descartada' | null {
  try {
    const texto = a?.getItem(CLAVE);
    if (texto == null) return null;
    const g = leer(texto);
    if (g) return g;
    borrarCarrera(a);
    return 'descartada';
  } catch {
    return null;
  }
}

export const AVISO_DESCARTADA = 'No pudimos recuperar tu carrera guardada. Empezá una nueva.';
export const AVISO_FORMULARIO = 'Ya tenés una carrera guardada. Si empezás otra, se borra.';

/** El bloque del Home: "Continuar mi carrera" con una línea de resumen. Todo texto de lo guardado pasa por esc(). */
export function bloqueContinuar(c: Career): string {
  const p = c.player;
  const nombre = `${p.setup.firstName} ${p.setup.lastName}`.trim();
  return `<div class="continuar">
      <button class="btn big" data-go="continuar">Continuar mi carrera</button>
      <p class="continuar-resumen">${esc(nombre)} · ${POSITION_NAMES[p.setup.position]} · ${p.age} años · ${seasonLabel(p.year)} · ${esc(c.club.name)}</p>
    </div>`;
}
