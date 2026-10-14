// STUB del bloque B para "¿De dónde es?": el bloque C lo reemplaza con la pantalla real (jugarDeDonde local y montarDeDonde en línea).
// Al fusionar gana el archivo de C; los nombres y firmas son los del contrato (comun.ts y online/protocolo.ts).
import { h, type JugarReto } from './comun';
import type { DeDondePublico, MontarJuego } from './online/protocolo';

export const jugarDeDonde: JugarReto = (contenedor) => {
  contenedor.replaceChildren(h('p', { role: 'alert' }, '¿De dónde es? todavía no está disponible.'));
  return () => {};
};

export const montarDeDonde: MontarJuego<DeDondePublico> = (host) => {
  host.replaceChildren(h('p', { role: 'alert' }, '¿De dónde es? todavía no está disponible.'));
  return { actualizar() {}, detener() {} };
};
