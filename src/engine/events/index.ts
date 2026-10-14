import type { EventTemplate } from '../types';
import { BASE_EVENTS } from './base';
import { DIVISIONES_EVENTS } from './divisiones';
import { EXTRANJERO_EVENTS } from './extranjero';
import { MEDIOS_EVENTS } from './medios';
import { NACIONALIDAD_EVENTS } from './nacionalidad';
import { SELECCION_EVENTS } from './seleccion';

export const ALL_EVENTS: EventTemplate[] = [
  ...BASE_EVENTS,
  ...DIVISIONES_EVENTS,
  ...EXTRANJERO_EVENTS,
  ...MEDIOS_EVENTS,
  ...NACIONALIDAD_EVENTS,
  ...SELECCION_EVENTS,
];

const ids = new Set<string>();
for (const e of ALL_EVENTS) {
  if (ids.has(e.id)) throw new Error(`Evento repetido: ${e.id}`);
  ids.add(e.id);
}
