// STUB del bloque B para el pintor en línea de "¿De dónde es?": el bloque C lo reemplaza (src/retos/ui-dedonde-linea.ts, `montarDeDonde`).
// Al fusionar gana el archivo de C.
import { h } from './comun';
import type { DeDondePublico, MontarJuego } from './online/protocolo';

export const montarDeDonde: MontarJuego<DeDondePublico> = (host) => {
  host.replaceChildren(h('p', { role: 'alert' }, '¿De dónde es? todavía no está disponible.'));
  return { actualizar() {}, detener() {} };
};
