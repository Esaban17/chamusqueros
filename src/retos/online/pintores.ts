// Registro de pintores: qué módulo dibuja cada categoría en línea (se elige por `juego.cat`). Cada uno se baja con import() al usarse.
// El de "¿De dónde es?" es del bloque C (`montarDeDonde` en src/retos/ui-dedonde.ts): ya está conectado aquí; si C cambia el nombre o el
// archivo, es esta única línea.
import type { DeDondePublico, MontarJuego, PingPublico, PreguntasPublico } from './protocolo';

export interface Pintores {
  pais: () => Promise<MontarJuego<PingPublico>>;
  club: () => Promise<MontarJuego<PingPublico>>;
  preguntas: () => Promise<MontarJuego<PreguntasPublico>>;
  dedonde: () => Promise<MontarJuego<DeDondePublico>>;
}

export const PINTORES: Pintores = {
  pais: () => import('./ui-ping').then((m) => m.montarPing),
  club: () => import('./ui-ping').then((m) => m.montarPing),
  preguntas: () => import('./ui-preguntas').then((m) => m.montarPreguntas),
  dedonde: () => import('../ui-dedonde').then((m) => m.montarDeDonde),   // <- C
};
