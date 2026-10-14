// Los dos bancos (preguntas y futbolistas) para el servidor de Retos en línea: el servidor es el que elige y revisa las respuestas (RF-12, RF-13, RF-20).
// Son archivos estáticos versionados y validados por script antes de publicar; el modo en línea del navegador no los descarga.
// RIESGO 1 de specs/retos-en-linea/plan.md: importar JSON y módulos de `src/` desde `api/` hay que confirmarlo en la primera vista previa de Vercel.
// Plan B si el runtime no resuelve el import con atributo: readFileSync con rutas incluidas por `includeFiles` en un vercel.json mínimo.
import preguntas from '../src/retos/preguntas.json' with { type: 'json' };
import futbolistas from '../src/retos/futbolistas.json' with { type: 'json' };
import type { Futbolista } from '../src/retos/dedonde.js';
import type { PreguntaBanco } from '../src/retos/trivia-puro.js';

export const BANCOS = {
  preguntas: preguntas as unknown as PreguntaBanco[],
  futbolistas: futbolistas as unknown as Futbolista[],
};
