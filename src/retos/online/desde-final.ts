// Primer paso de "Retar a alguien en línea" en la pantalla final (specs/retar-desde-final). Sin parámetros: no puede recibir nada de la carrera.
import { ErrorCliente, crearSala, infoEnLinea, tokenGuardado } from './cliente';
import type { RespuestaSala } from './protocolo';

export type Intento =
  | { t: 'sala'; respuesta: RespuestaSala }   // creada: pasar a Retos directo al lobby
  | { t: 'apodo' }                            // falta perfil: pasar a Retos por el flujo de siempre
  | { t: 'fallo'; mensaje: string; definitivo: boolean };

export const AVISOS = {
  noDisponible: 'Retos en línea no está disponible ahora. Probá más tarde desde Retos, en el inicio.',
  sinRed: 'No hay conexión con el servidor. Probá de nuevo.',
  tope: 'Ya creaste varias salas seguido. Probá en un rato desde Retos, en el inicio.',
  otro: 'No se pudo crear la sala. Probá de nuevo.',
} as const;

const fallo = (mensaje: string, definitivo: boolean): Intento => ({ t: 'fallo', mensaje, definitivo });

export async function crearDesdeFinal(): Promise<Intento> {
  try {
    if (!tokenGuardado()) return (await infoEnLinea()) ? { t: 'apodo' } : fallo(AVISOS.noDisponible, true);
    return { t: 'sala', respuesta: await crearSala() };
  } catch (e) {
    if (e instanceof ErrorCliente) {
      if (e.codigo === 'sin_perfil' || e.codigo === 'sin_credencial') return { t: 'apodo' };   // el flujo de siempre lo resuelve
      if (e.codigo === 'en_linea_no_disponible') return fallo(AVISOS.noDisponible, true);
      if (e.codigo === 'limite') return fallo(AVISOS.tope, true);
      if (e.esRed) return fallo(AVISOS.sinRed, false);
    }
    return fallo(AVISOS.otro, false);
  }
}
