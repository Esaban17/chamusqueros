// STUB de A: en el merge gana el archivo de B completo
import type { JugarReto } from './comun';

export const jugarTrivia: JugarReto = (_c, _j, onFin) => { onFin({ ganador: null, puntos: [0, 0] }); return () => {}; };
