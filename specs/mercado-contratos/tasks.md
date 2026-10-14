# Tareas

- [ ] T0 `npm ci` y línea base: `npm run simulate -- 5000` antes de cambiar nada; guardar ofertas por carrera, puntaje medio y veredictos para comparar. (RF-04, CA-4)
- [ ] T1 Tipos en `src/engine/types.ts`, al final de cada interfaz: `Contract`, `Player.contract`, `SeasonRecord.salary`, `Effects.contract?`, `GameEvent.offers?`. Depende de T0. (RF-03, RF-05, RF-06, RF-09)
- [ ] T2 `moneyShort` en `src/engine/countries.ts` junto a `money` (sin tocar `money`) y `salaryFor` en el archivo nuevo `src/engine/contracts.ts` (función pura, constantes del plan). Depende de T1. (RF-08, RF-12)
- [ ] T3 Contrato en el motor, `src/engine/engine.ts`: `signContract` en debut, `applyEffects` y `checkPlayingTime`; renovación al vencer en `simulateSeason`; `SeasonRecord.salary`; `earned()` y `CareerSummary.earned`. Depende de T2. (RF-06, RF-07, RF-09)
- [ ] T4 Ofertas múltiples en `engine.ts`: `abroadOk()` extraída de `findClub`, `offers()`, `transferOffer` con una opción por club, `contract` en los resultados, contrato actual en el texto, `GameEvent.offers`. No tocar `drawEvent` ni `simulateNationalTeam`. Depende de T3. (RF-01, RF-02, RF-03, RF-04, RF-05)
- [ ] T5 UI en `src/main.ts` y `src/style.css`: línea de dinero y contrato en `playerHead()`, chip de lo ganado en `seasonRow`, línea en `seasonCard`, panel "Dinero ganado" en `finish()`; todo por `esc()`. No tocar `home()`. Depende de T3. (RF-10, RF-11, RF-12, RF-13)
- [ ] T6 `scripts/simulate.ts`: revisiones de ofertas, contrato, monotonicidad, bandas, suma de temporadas, formatos, fuga de "Q" en `changes`, `legit()` ampliado para ofertas de clubes guatemaltecos, p50 y p90 del dinero final de Guatemala y de ES/AR/BR. Depende de T4. (CA-1 a CA-9, CA-11, RF-01 a RF-09)
- [ ] T7 Calibrar `salaryFor` hasta que las bandas de CA-8 y la cota de 600 M se cumplan; repetir la corrida de T0 y comprobar CA-4 (si falla, ajustar la política de elección de `simulate`, no las probabilidades del motor); reportar p50 y p90. Depende de T6. (RF-04, RF-08, CA-4, CA-8, CA-11)
- [ ] T8 Verificar en navegador (debut, oferta con varios clubes, historial, final, nacionalidad no guatemalteca, ancho de teléfono), prueba de nombre de club con marcado (CA-12), confirmar que el envío al ranking no cambia, y `npm run build`. Depende de T5 y T7. (RF-10 a RF-13, CA-10, CA-12)

## Trazabilidad
RF-01: T4, T6 · RF-02: T4, T6 · RF-03: T1, T4 · RF-04: T0, T4, T7 · RF-05: T1, T4 · RF-06: T1, T3, T6 · RF-07: T3, T6 · RF-08: T2, T6, T7 · RF-09: T1, T3, T6 · RF-10: T5, T8 · RF-11: T5, T8 · RF-12: T2, T5 · RF-13: T5, T8.
