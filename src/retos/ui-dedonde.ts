// STUB del bloque B para "¿De dónde es?" local: el bloque C lo reemplaza con la pantalla real (`jugarDeDonde`, un JugarReto de comun.ts).
// El pintor en línea es ui-dedonde-linea.ts. Al fusionar gana el archivo de C.
import { h, type JugarReto } from './comun';

export const jugarDeDonde: JugarReto = (contenedor) => {
  contenedor.replaceChildren(h('p', { role: 'alert' }, '¿De dónde es? todavía no está disponible.'));
  return () => {};
};
