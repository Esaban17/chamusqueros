# Plan: eliminatorias de selecciones y celebración

Stack: el del repo (TypeScript vanilla, Vite, CSS). Sin dependencias nuevas.

## Cómo (por RF)
- **RF-01/02/03/04/05** `Career.finals()` en `src/engine/engine.ts`: un partido por ronda con el Poisson de `drawGroup` y `gtStrength()`; rival = el más fuerte de (n.º de ronda) sorteos del pool sin repetir (`ponytail:`); empate → penales con ventaja leve por fuerza (`ponytail:` sin tanda real). Pasa a fase final desde `simulateNationalTeam` (Mundial, copa; la copa deja de decidir la semifinal por azar) y la Liga de Naciones solo si queda 1.º (`ponytail:` sin divisiones). Mejor tercero = 3.º con >= 4 pts (`ponytail:`).
- **RF-06** Los partidos van a `matches` y `caps`. Goles: `strike()` por partido con la probabilidad por posición del grupo mundialista (copa y Liga de Naciones, la tasa de `ntMatches`); solo en partidos donde la Selección anotó.
- **RF-07** `play()` agrega título a `titles` del registro y de la carrera (palmarés y resumen lo cuentan solos), hito y fama. `bestMoment` reconoce "Campeón …".
- **RF-08/10** Tipos: `NtMatch.round?`, `NtMatch.pen?`, `NtGroup.out?` (todos opcionales). `ntBlock`/`matchRow` en `src/main.ts` los leen con validación; sin ellos se renderiza como antes.
- **RF-09** `src/ui/celebrate.ts` (CSS en `style.css`): se llama solo desde `seasonSummary`, la pantalla que revela temporadas nuevas, no desde el historial.

## Modelo de datos
Compatible hacia atrás: campos opcionales; sin migración.

## Seguridad (OWASP Top 10)
- **A03 Inyección/XSS**: ronda, rival, cierre, penales y trofeo van a `innerHTML` con `esc()`; la celebración usa `textContent`.
- **A08 Integridad**: datos de carreras guardadas son no confiables; `pen` solo se muestra si es un par de números, `round` y `out` solo como texto escapado.
- **A04/A08 Ranking**: los títulos de selección suman a `titles` y al puntaje. El servidor limita `score` -100..1000 y `titles` 0..200; se verifica con `simulate` que los máximos nuevos caben y se ajusta si no. El cliente puede mentir: es validación de rango (ya anotado en `api/ranking.ts`).
- **A06**: cero dependencias nuevas.
- A01, A02, A05, A07, A09, A10: no aplican (no cambia acceso, configuración, autenticación, logs ni peticiones).

## Pruebas y riesgos
`npm run simulate` (extendido: coherencia de fase final y tasas de campeón), `npm run build`, captura en navegador de eliminatoria y celebración.
Riesgo: balance de campeones; se calibra con el número de sorteos de rival.
