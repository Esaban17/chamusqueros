# Plan: ritmo por temporada y puntajes justos entre modos

Stack: el del repo (TypeScript vanilla, Vite, DOM por strings y `render()`). Sin dependencias nuevas. Un archivo nuevo en el motor (`src/engine/ritmo.ts`, puro, sin DOM ni `engine.ts`) y cambios acotados en `engine.ts`, `types.ts`, `events/minijuegos.ts`, `main.ts` y `scripts/simulate.ts`. **Sin `process.env` ni lectura de entorno en el motor** (el prototipo desechable lo usó para barrer parámetros; en el navegador no existe): las perillas son constantes exportadas.

## Cómo se llegó a este diseño (prototipo desechable, no se sube)
Se copió `src/engine/` a una carpeta temporal y se probaron cinco variantes con el mismo script de diagnóstico (mismas carreras en los tres modos, 3 políticas). Lo que mostraron, en orden:

1. **Solo normalizar los efectos numéricos por decisión no alcanza.** Con 3 decisiones por temporada y efectos escalados, la brecha entre modos bajó de 13 a entre 3 y 6 puntos de media, pero las tasas globales se fueron: Mundial 15 a 20 % (hoy 10,8), jugó afuera 25 a 37 % (hoy 12), dinero +20 a +40 %. La causa: ofertas de traspaso, retiro, pasos y entradas de rutas se sortean **por decisión** y ahora hay 5 veces más.
2. **Poner un presupuesto global de pasos de ruta por temporada hunde las rutas.** Con las *continuaciones* (peso numérico >= 3) limitadas y las *entradas* (peso < 3, fijan una bandera) libres, la entrada a la ruta de extranjero salía en 68 a 85 % de las carreras (hoy 14 %) y la oferta final en 0 %; prelista → debut bajó de 40 % a 17 % de finalización. Está al revés: hay que **limitar las entradas y dar prioridad a la continuación de una ruta abierta**.
3. **Las extras que consumen cupo desbalancean.** Si un paso de ruta ocupa una de las 3 decisiones, exprés (2) tiene menos pasos por temporada que intensa (3). Por eso las decisiones de historia **se suman** al cupo y se sortean **al empezar la temporada** (la agenda), no una por una.
4. **Limitar usos o alargar el espaciado para variar no es gratis.** Con espaciado de 8 temporadas y máximo 2 usos por plantilla, intensa agota el repertorio y relaja el espaciado en 1,3 % de las decisiones; las rutas dejan de ser iguales entre modos. Solo el contenido nuevo baja la repetición de verdad (A4).

Variante final ("agenda por temporada"), configuración y resultado (10.000 carreras por modo, decisiones al azar; 6.000 por modo en las otras dos políticas):

| | intensa | normal | exprés | media | hoy (media de los 3) |
|---|---|---|---|---|---|
| Puntaje medio, al azar | 108,2 | 107,7 | 107,7 | 107,9 | 107,6 |
| p50 / p90, al azar | 83 / 206 | 83 / 203 | 83 / 207 | 83 / 205 | 82 / 206 |
| p97 / máximo, al azar | 307 / 649 | 312 / 716 | 313 / 744 | | 325 / 882 |
| Mejor opción: media / p50 / p90 | 131,7 / 100 / 262 | 132,0 / 99 / 267 | 131,6 / 100 / 263 | 131,8 | 123,4 / 91 / 255 |
| Techo: media / p90 / máximo | 132,6 / 264 / 747 | 134,9 / 273 / 715 | 134,0 / 268 / 776 | 133,8 | 130,8 / 267 / 821 |
| Mundial | 11,3 % | 10,9 % | 11,1 % | 11,1 % | 10,6 % |
| Selección mayor | 24,1 % | 23,4 % | 23,9 % | 23,8 % | 21,0 % |
| Jugó afuera | 11,7 % | 11,3 % | 11,9 % | 11,6 % | 11,7 % |
| Cambió de Selección | 1,05 % | 0,97 % | 0,81 % | 0,94 % | 0,84 % |
| Ofertas de traspaso por carrera | 1,66 | 1,66 | 1,65 | 1,66 | 1,70 |
| Títulos / premios por carrera | 3,60 / 8,38 | 3,63 / 8,36 | 3,55 / 8,43 | 3,59 / 8,39 | 3,73 / 8,55 |
| Dinero medio (millones de Q) | 92,2 | 92,6 | 90,0 | 91,6 | 94,8 |
| Temporadas / edad de retiro | 20,0 / 36,0 | 20,0 / 36,0 | 20,0 / 36,0 | | 21,0 / 37,0 |
| Decisiones por carrera / por temporada | 67,1 / 3,37 | 57,8 / 2,89 | 47,9 / 2,40 | | 12,2 / 0,59 |
| Eventos de amor por carrera (máximo) | 2,62 (12) | 2,41 (11) | 2,36 (11) | | 1,02 (7) |
| Con compromiso / con boda | 8,9 / 6,2 % | 9,1 / 6,6 % | 9,1 / 7,0 % | | 4,8 / 3,8 % |
| Plantillas repetidas por carrera | 29,3 | 23,1 | 17,5 | | 1,6 |
| Decisiones con algún cambio numérico visible | 86 % | 89 % | 92 % | | 98 % |
| Minijuegos con algún cambio numérico visible | 43 % | 43 % | 43 % | | 100 % |

Rutas (carreras que ven el primer paso / el último / finalización), mismas carreras:

| Ruta | intensa | normal | exprés | hoy (finalización, media) |
|---|---|---|---|---|
| Extranjero: visor → oferta final | 31,4 / 1,3 / 4 % | 30,8 / 1,2 / 4 % | 30,1 / 1,4 / 5 % | 1 % |
| Selección: prelista → debut | 8,7 / 4,7 / 54 % | 8,0 / 4,4 / 56 % | 8,7 / 4,8 / 55 % | 40 % |
| Selección: eliminatoria grupos → decisivo | 22,0 / 6,6 / 30 % | 21,1 / 5,6 / 27 % | 21,5 / 6,4 / 30 % | 12 % |
| Selección: Sub-20 → Mundial Sub-20 | 13,5 / 1,0 / 7 % | 9,2 / 0,7 / 7 % | 9,7 / 0,7 / 8 % | 4 % |
| Amor: cita → compromiso | 53,0 / 19,7 / 37 % | 48,5 / 19,8 / 41 % | 48,4 / 21,0 / 43 % | 41 % |
| Amor: compromiso → boda | 19,7 / 6,2 / 31 % | 19,8 / 6,6 / 33 % | 21,0 / 7,0 / 33 % | 31 % |
| Amor: hija del técnico (1 → 3) | 32,3 / 7,0 / 22 % | 29,2 / 7,5 / 26 % | 29,5 / 6,9 / 23 % | 19 % |
| Amor: pareja de un compañero (1 → 2) | 31,5 / 14,1 / 45 % | 28,9 / 13,5 / 47 % | 28,8 / 12,9 / 45 % | 42 % |

Proporción de categorías (sin oferta, retiro ni minijuego), media de modos, contra hoy: amor 4,7 % (10,8), cancha 21,3 % (13,4), contrato 6,9 % (9,7), ascenso 15,7 % (18,7), extranjero 2,2 % (3,4), formación 5,3 % (3,8), medios 23,5 % (21,4), Selección 2,9 % (6,8), vida 17,4 % (11,9). **No cumple CA-12 todavía** (cancha +7,9 y vida +5,5 puntos; amor -6,1): se corrige con los pesos de categoría de T6, no con el mecanismo.

Límites del prototipo, que el spec no oculta: no tiene las 32 plantillas de minijuego (usa las 12 de hoy con espaciado de 3 temporadas, así que salen 0,4 por temporada y no 1: los 18 minijuegos por carrera de la tabla de duración son el objetivo del diseño, no lo medido); las perillas salen de barridos de 2.000 a 10.000 carreras y hay que recalibrarlas con `simulate` (T6); el redondeo, la clasificación y la agenda están hechos "a mano" en una copia, no con la estructura que sigue.

## Conflictos con el código actual (y cómo se resuelven)
- **`playBlock()` simula `MODE_SEASONS[mode]` temporadas y después sortea una decisión** (`engine.ts`). Se reemplaza por `advance()`, que devuelve la siguiente decisión de la temporada o, al agotarla, simula **una** temporada y arma la siguiente. `MODE_SEASONS` (`types.ts`) se elimina; lo usa también `events/minijuegos.ts` (`hayLugar`).
- **`block` cuenta decisiones, no años.** Hoy `cooldown ?? 4` significa "4 bloques", y con un solo sorteo por bloque son 4, 8 o 12 temporadas según el modo. Pasa a **temporadas** (`this.temporada`), así que `cooldown ?? 4` conserva su valor numérico y cambia de significado: 4 temporadas en los tres modos. Los `cooldown` explícitos de las plantillas (2 a 10) se leen igual, en temporadas. Es una decisión de este plan y el comentario de `EventTemplate.cooldown` lo dice.
- **Probabilidades por sorteo en `drawEvent`**: `offerChance` (traspaso), `retirementEvent` (desde los 33), la elección de pasos de ruta (`chance(rng, 0.7)` y x3), `outgrowing`. Pasan a la agenda por temporada (abajo). `drawEvent()` se parte en `sacarDecision()` y `sacarMinijuego()`; `transferOffer`, `retirementEvent`, `findClub`, `offers` no cambian.
- **El pool puede quedar vacío.** Con 3 sorteos por temporada y espaciado de 4 temporadas, `weightedPick` sobre `[]` devolvía `undefined` y rompía `drawEvent` (pasó en el prototipo). Regla: si no hay candidatas se relaja el espaciado (nunca `once`); si sigue vacío se salta esa decisión. En 10.000 carreras por modo la relajación no ocurrió; con espaciado de 8 temporadas sí (1,3 %). Se cuenta en `simulate` (CA-08).
- **Minijuegos**: todas las plantillas son `once`, con `PESO_MJ`, `EMPUJE`, `hayLugar` y banderas `mj_<tipo>_<situación>` con el año (`choose()` las escribe). Todo eso desaparece; el espaciado usa `lastSeen` y la situación vista se guarda en el motor, no en `Player.flags`.
- **`Effects` son enteros y `applyEffects` los acumula tal cual.** Escalar con 3 decisiones por temporada da fracciones; se redondea con sorteo (abajo), no se muestran decimales.
- **Retiro**: hoy la oferta de retiro *reemplaza* a la decisión de ese bloque. Pasa a ser una decisión de historia que se suma.
- **`scripts/simulate.ts` corta cada carrera con `guard++ < 100`** (4 bucles) y cada iteración es una decisión o un `playBlock`. Hoy intensa hace ~40 iteraciones; con 85 interacciones y un `advance()` entre cada una pasa de 170: **truncaría las carreras en silencio**. Se sube a 2.000 y un chequeo falla si una carrera lo alcanza.
- **`once` y `usedOnce`** sirven: nada que cambiar. **`remember()` guarda `recentCategories` (últimas 3)**: con 3 decisiones por temporada sigue evitando la misma categoría seguida.
- **Seguridad**: sin superficie nueva (ver el spec).

## Mecanismo
### Agenda de la temporada
Al empezar cada temporada (`beginSeason`), con el estado de ese momento, se sortea la **agenda**: una lista ordenada de pasos que `advance()` consume uno por uno.

1. **Clases de plantilla** (derivadas de la propia plantilla, con caché por `id`; `simulate` imprime la clasificación para auditarla):
   - **paso**: peso numérico >= 3 (lo mismo que hoy es "ruta").
   - **entrada**: no es paso, su categoría es `seleccion`, `extranjero`, `amor`, `medios` o `divisiones` y algún desenlace fija una bandera (`flag`).
   - **oferta de otro país**: algún desenlace tiene `natTeam` (`nac_ascendencia`, `nac_naturalizacion`).
   - **consecuencia**: ni paso, ni entrada ni oferta, y algún desenlace tiene `ntLevel`, `caps`, `natGoals`, `wcProgress`, `transfer`, `transferTo`, `retire` o `position`.
   - **ritmo**: todo lo demás.
2. **Agenda** (en este orden de sorteo; después se mezcla con el generador de la carrera):
   - Oferta de retiro (si `age >= 33` y sale, `chance(rng, clamp((age - 32) * 0.16, 0, 0.8))`, como hoy): va primero.
   - Oferta de traspaso (mismo `offerChance` de hoy, con `* P_OFERTA`): va primero (después del retiro).
   - Por cada categoría con un **paso** disponible: entra con probabilidad `P_PASO`. Una por categoría y temporada.
   - Por cada categoría con una **entrada** disponible: entra con probabilidad `P_ENTRADA` (`P_ENTRADA_AMOR` para amor). Una por categoría y temporada.
   - Una **consecuencia** con probabilidad `P_CONSECUENCIA` (una por temporada).
   - Cada **oferta de otro país** disponible con probabilidad `P_NAC`.
   - Tope: 3 pasos de historia (se quitan las entradas primero, luego las consecuencias, y los pasos de las rutas con ventana más corta al final).
   - `K` decisiones de **ritmo** (`decisionesDe(mode, temporada)`).
3. Cada ítem se resuelve **al momento de sacarlo**, con el estado de entonces (una decisión anterior puede cambiar qué hay disponible): se elige la plantilla con el mismo `weightedPick` y los mismos multiplicadores de hoy (`notable`, `qualifiers`, `abroad`, `tier`, variedad de categoría). Si no hay candidata, se salta (en el prototipo, 0,6 % de los ítems de historia).
4. Al agotar la agenda sale el **minijuego** (si aplica) y después se simula la temporada. `progreso.de` es el largo de la agenda al empezar; si se salta un ítem, `de` baja en uno.

Efecto por clase: **ritmo** se escala con `escalar(effects, ESCALA / K, rng)`; paso, entrada, consecuencia, oferta y retiro van sin escalar; el minijuego, con `ESCALA_MJ`.

### `src/engine/ritmo.ts` (nuevo, puro)
- `DECISIONES: Record<Mode, readonly number[]> = { intensa: [3], normal: [3, 2], expres: [2] }` y `decisionesDe(mode, temporada)` (`DECISIONES[mode][temporada % largo]`).
- `AJUSTES` (constante exportada con las perillas, ver "Calibración").
- `escalar(e: Effects, s: number, rng: Rng): Effects`: para `rating`, `potential`, `morale`, `fitness`, `coach`, `fame`, `injury`, `caps`, `natGoals`, `wcProgress` aplica `x = v * s; n = floor(x) + (rng() < x - floor(x) ? 1 : 0)`. Redondeo sin sesgo; con `s === 1` devuelve el mismo objeto y **no consume el generador**. El resto de los campos (`flag`, `milestone`, `transfer`, `ntLevel`, `natTeam`, `retire`, `position`, `contract`) pasan intactos.
- `claseDe(t, p, ctx)` y `armarAgenda(...)`: las reglas de arriba, puras salvo por el `rng`.

### `engine.ts`
- `start()`: `beginSeason()` y la primera decisión. `advance(): SeasonRecord | null`: si hay algo en la agenda lo saca y devuelve `null`; si no, simula **una** temporada (`simulateSeason()`), evalúa `checkForcedRetirement()`, incrementa `temporada`, y (si no se retiró) hace `beginSeason()` y deja la primera decisión de la siguiente temporada en `pending`, como hacía `playBlock`. `playBlock()` y `block` desaparecen.
- `get progreso(): { n: number; de: number; temporada: string; minijuego: boolean } | null` (`temporada` con `seasonLabel(p.year)`); `null` si no hay evento pendiente.
- `choose()`: usa `this.escalaActual` (fijada al sacar la decisión) con `escalar(...)` antes de `applyEffects`. Sin cambios en la regla de los minijuegos (`resultOf`, tres desenlaces); deja de escribir `flags[event.id]`.
- `available(e)`: `this.temporada - seen > (e.cooldown ?? 4)`; el relajo de arriba.
- `context()`, `transferOffer`, `retirementEvent`, `simulateSeason`, `progress` y el cálculo del puntaje (`summarize`) **no cambian**.

### Minijuegos (`events/minijuegos.ts`)
- 8 situaciones por posición (**32 plantillas**): las 3 de hoy (liga, clásico, Selección) más `copa`, `jornada` (partido trabado ante el colista), `racha` (partido para cortar una mala racha), `ascenso` (liguilla; solo `tier >= 2`) y `extranjero` (club del extranjero). Aplican a cualquier jugador: `liga`, `copa`, `jornada`, `racha` (4 por posición, cumple RF-10). Condicionadas: `clasico` (rival), `seleccion` (convocatoria vigente), `ascenso`, `extranjero`. El tipo (`penal`, `atajada`, `pase`, `cierre`) sigue siendo uno por posición: solo cambian las ambientaciones, no la interfaz.
- Cada situación tiene **2 variantes** de `text`, `ok`, `half` y `fail` (arreglos); la variante es `usos de esa situación % 2` (determinista, sin sorteo).
- Se quita `once`, `weight`, `EMPUJE`, `PESO_MJ`, `hayLugar` y `hechos`; `cooldown: 2` (no se repite en menos de 3 temporadas). `when`: `age >= 18 && temporadas jugadas >= 2 && posición` y la condición de cada situación.
- `Career.sacarMinijuego()`: filtra por `when` y espaciado, sortea con `weightedPick` uniforme y devuelve el evento con `minigame` como hoy. Sin candidata, la temporada se simula sin minijuego.
- Los efectos por situación (`EFECTOS`) se mantienen; `choose()` los escala con `ESCALA_MJ`.

### UI (`main.ts`, `style.css`)
- `advance()` pasa a: `const r = career.advance(); freshSeasons = r ? 1 : 0; lastResolution = null; r ? seasonSummary([r]) : gameScreen();` (`seasonSummary` mantiene su firma con arreglo; su comentario "1 a 3 según el modo" se corrige; el botón "Seguir" ya existe).
- `gameScreen()`: el `eyebrow` de la tarjeta pasa de `categoría · año · edad` a `Decisión n de N · Temporada AAAA-AA · edad años` o, para un minijuego, `Minijuego de la temporada · Temporada AAAA-AA`; con `esc()`. `CATEGORY_LABEL` no cambia.
- `createForm()`: `seg('mode', [['intensa', 'Intensa', '3 por temporada'], ['normal', 'Normal', '2 o 3 por temporada'], ['expres', 'Exprés', '2 por temporada']])` y una línea "Cada temporada trae además un minijuego."
- `seasonLog()`: "Tu primera temporada arranca después de estas decisiones."
- `debut()`, `tiendaScreen`, `finish`, `shareText` sin cambios. La tienda sigue oculta con un minijuego a medias (`!(ev?.minigame && !res)`).

## Calibración (T6; perillas en orden)
Valores de partida **medidos en el prototipo** (la tabla de arriba): `ESCALA = 0,5` (cada decisión de ritmo pesa `0,5 / K`: 1/6 con 3, 1/4 con 2); `ESCALA_MJ = 0,04`; `P_PASO = 0,7`; `P_ENTRADA = 0,04`; `P_ENTRADA_AMOR = 0,10`; `P_CONSECUENCIA = 0,04`; `P_OFERTA = 0,6` (multiplica el `offerChance` de hoy); `P_NAC = 0,25`; cooldown 4 temporadas.

Orden y criterio que manda cada paso (si dos chocan, ganan los de arriba):
1. `ESCALA`: hasta que media, p50 y p90 de los tres modos estén dentro de ±5 % (CA-03, CA-04) y la media global en 107,6 ±5 % (CA-05).
2. `P_CONSECUENCIA` y `P_ENTRADA`: Mundial, Selección y jugó afuera dentro de CA-06 (en el prototipo el Mundial pide `P_CONSECUENCIA` bajo; subirlo sube Mundial y jugó afuera juntos).
3. `P_OFERTA`: 1,68 ofertas por carrera ±10 %, igual en los tres modos.
4. `P_PASO` y `P_ENTRADA_AMOR`: finalización y arranques de CA-07; eventos de amor entre 1,0 y 3,0 (CA-12). Subir `P_ENTRADA_AMOR` sube las bodas más rápido que la proporción de amor (A5).
5. `P_NAC`: 0,8 % de cambios de Selección ±0,5 (CA-06).
6. Pesos de categoría (`PESO_CATEGORIA`, multiplicadores sobre las plantillas de ritmo, nuevos): cancha, vida, medios, formación y ascenso a 4 puntos o menos de hoy (CA-12). Es la perilla que falta en el prototipo.
7. `ESCALA_MJ`: aporte esperado de los minijuegos <= 1 punto (CA-10) y al menos 40 % con cambio visible (CA-09).
No se toca: la fórmula de `summarize`, `AWARD_POINTS`, `api/ranking.ts`, la tienda ni `progress()`.

## Chequeos de `scripts/simulate.ts` que hay que actualizar (muchos asumen la cantidad actual de decisiones)
| Chequeo (hoy) | Por qué se rompe | Qué se hace |
|---|---|---|
| `guard++ < 100` (bucle principal, pasadas de la tienda, `trCarrera`, `trJugar`) | 85 interacciones y un `advance()` entre cada una: trunca en silencio | Subir a 2.000; error si una carrera lo alcanza |
| `career.playBlock()` y el bloque de revisiones de "temporadas del bloque" (`played`, `played[0].salary`, `contractBefore`) | Ya no hay bloques de 1 a 3 temporadas | `advance()` devuelve un solo registro; las revisiones de contrato, Selección y salarios se hacen por temporada |
| Mercado: "decisión con N años de contrato", ofertas (`offerSize`, `multi`, `withAbroad`), medianas de salario | Dependen del número de ofertas y de decisiones | Se mantienen las reglas; las bandas de salario no cambian; se agrega ofertas por carrera y por temporada por modo (CA-06) |
| Amor: `max > 8` (CA-7), `compStep >= 50` con 20-40 %, `amorOpen >= 2 %`, "Amor total 15 %", "nunca salió (CA-8)" | Hay 5 veces más decisiones: el máximo por carrera pasa de 7 a 12 y la proporción baja | `max > 14`; promedio de 1,0 a 3,0 por modo; 15 % de las decisiones sigue; el resto queda igual |
| Minijuegos: `decisions - lastMj === 1`, `max > 3`, "meta en ritmo normal 1,0 a 1,2" y "70 % con al menos uno", `MJ_BASE` y pisos (-2,5), `mjSeen`, CA-1 (cada situación sale) | Un minijuego por temporada: 18 por carrera y cada situación sale muchas veces | Reemplazar por CA-02 (por temporada, sin repetir en menos de 3 temporadas, 95 % de cobertura, 32 situaciones, variantes) y por CA-12 (proporciones, no pisos viejos) |
| Minijuegos CA-8: puntaje medio 104,4 a 110,8 y `MJ_VEREDICTOS` a 2 puntos | **Siguen valiendo**: es el ancla de CA-05 | Sin cambios |
| Tienda: cuatro pasadas con `politica()` "al cerrar el bloque", "línea base de adc673f" impresa a mano, CA-10 (con y sin tienda), "puntaje máximo 1.000" (CA-15) | La política corre cada temporada (no cada bloque) y la línea base impresa es del motor viejo | La política corre tras cada `advance()` que devuelve una temporada; CA-10 sigue siendo contra la pasada "sin"; se actualiza el texto de la línea base |
| Trofeos: `HUELLA_BASE = 'ca5eb9d9'` (4.171 temporadas), banda de puntaje 105,1 a 111,5, `SCORE_LIMIT < 1,25 x peor` | La huella cambia seguro: cambian las temporadas simuladas | Recalcular la huella con el motor nuevo y anotarla (el motivo, en el comentario); dos corridas de la misma semilla siguen dando los mismos premios; banda y límite sin cambio |
| Nacionalidad: ofertas (`nac.oferta`, `nac.cambio`), "disponibles y nunca vistas", elegibilidad y chequeos del cambio | La frecuencia de la oferta depende de `P_NAC` | Mantener los chequeos; agregar CA-06 (0,8 % de cambios ±0,5) |
| Línea "Temporadas promedio ... decisiones" y `decisionsByMode` | Mezclan decisiones y minijuegos | Separar decisiones de ritmo, de historia y minijuegos; agregar por temporada |
| Límites del servidor (`SCORE_LIMIT` leído de `api/ranking.ts`, `maxCaps`, títulos) | El máximo se mueve | Sin cambio de criterio; reportar el máximo de las tres políticas (CA-04, CA-13) |

### Bloque nuevo "Ritmo" (al final de `simulate.ts`)
Corre sus propias carreras (mismo reparto que el bucle principal) con tres políticas (al azar, mejor opción, techo) y los tres modos por igual: `RITMO=off` lo omite; con menos de 5.000 carreras solo reporta. Imprime las tablas de este plan y falla (`process.exitCode = 1`) cuando incumple CA-01 a CA-12: decisiones por temporada por modo, minijuegos por temporada y cobertura, paridad (media, p50, p90) por política, tasas globales y por modo, rutas (primer paso, último paso, finalización) contra la tabla del spec, variedad y relajaciones, cambios visibles, aporte del minijuego, interacciones y duración estimada, proporciones de categoría. Más una prueba directa de `escalar` (100.000 sorteos por escala, sesgo <= 2 %) y de que `escalar(e, 1, rng)` no consume el generador. Costo: el motor hace unas 5 veces más sorteos por carrera, así que `npm run simulate` (5.000) pasa de unos 20 s a ~1 minuto y `-- 20000` a ~4 minutos.

## Cobertura de los RF
RF-01 a RF-05: `advance`, `beginSeason`, agenda (`ritmo.ts`) y `retirementEvent` sin cambios. RF-06, RF-07, RF-22 a RF-24: `main.ts` (T4). RF-08: no hay nada que migrar (no se guardan carreras). RF-09 a RF-13: `events/minijuegos.ts`, `sacarMinijuego`, `ESCALA_MJ` (T3). RF-14: la agenda por temporada, `P_*`, cooldown en temporadas (T2). RF-15 y RF-16: `escalar` y `ESCALA` (T1, T2). RF-17 a RF-21: calibración y bloque "Ritmo" de `simulate` (T5, T6). RF-18: no se toca `summarize`, `AWARD_POINTS` ni `api/ranking.ts`.

## Riesgos
1. **CA-12 (proporciones) no se cumple todavía** y puede chocar con CA-07 y CA-06: subir amor sube las bodas; subir Selección sube el Mundial. Mitigación: `PESO_CATEGORIA` para las de ritmo; amor, Selección y extranjero tienen piso del 40 % (no igualdad) por eso (A5).
2. **Calibración frágil**: las perillas se mueven juntas (`ESCALA` y `P_CONSECUENCIA` afectan el Mundial). Mitigación: orden fijo, una perilla por corrida, muestra de 20.000 y el prototipo como punto de partida.
3. **Repetición de decisiones (CA-08)**: 37 a 44 % de repeticiones con el repertorio actual. El tope de 50 % se cumple; la meta de 35 % necesita contenido (A4).
4. **Duración** (A3): 17 a 21 minutos por carrera.
5. **El rótulo "n de N"** puede saltar si se salta un ítem (0,6 % de los ítems de historia); `de` baja en uno y no se muestra un número mayor que N.
6. **Costo de `simulate`**: ~3x más lento; avisar en el encabezado del script.
7. **Un efecto de decisión de ritmo vale 1/6 a 1/4 de hoy**: muchas decisiones mostrarán un solo chip o ninguno (86 a 92 % muestran al menos uno). Es la consecuencia de RF-15; A6.

## Alternativas descartadas
- **Normalizar solo los efectos** (primera variante): no corrige ofertas, retiro ni rutas (punto 1 del prototipo).
- **Un presupuesto único de pasos de ruta por temporada**: hunde la finalización (punto 2).
- **Que las decisiones de historia ocupen cupo**: reabre la brecha entre modos (punto 3).
- **`MODE_SEASONS` como "temporadas sin decisión"** (dejar bloques de 2 o 3 temporadas con varias decisiones antes): complica el resumen y no corrige lo por decisión.
- **Escalar por el modo en lugar de por las decisiones de la temporada**: normal alterna 3 y 2, y la escala debe seguir a la temporada.
- **Una ruta de datos por plantilla (`clase: 'paso' | 'entrada'...` escrita a mano en las 157 plantillas)**: más segura pero 20 a 30 ediciones; se prefiere inferirla y auditarla con `simulate`, y marcar a mano solo las que la auditoría muestre mal clasificadas.
