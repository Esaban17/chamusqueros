# Plan: minijuegos durante las temporadas

Stack: el del repo (TypeScript vanilla, Vite, DOM por strings y `render()`). Sin dependencias nuevas, sin canvas.
Cambio mínimo en el motor: un minijuego es un **evento con una sola opción y tres desenlaces ordenados** (éxito, a medias, fallo) más un campo `minigame` que dice el tipo y la dificultad. `choose()` recibe un resultado opcional y lo usa para elegir el desenlace. Las pantallas, `transferOffer` y `retirementEvent` no se tocan.

## Cómo funciona hoy (lo que el plan usa)
- `drawEvent()` (`engine.ts`) filtra el `pool` por `when` y cooldown, y devuelve `{ id, category, title, text, options }` a partir de la plantilla. `weightedPick` elige con el peso de cada plantilla; un peso **numérico >= 3** cuenta como "ruta" (prioridad y x3), un peso dado como función nunca. La variedad baja x0,4 y x0,15 a la categoría repetida en las últimas 3 escenas.
- `choose(optionIndex)` elige el desenlace con `weightedPick` sobre `outcome.p` y llama `applyEffects`. `Resolution` es `{ text, changes }`.
- `Effects` no tiene campo de títulos; el puntaje (`summarize`) depende de nivel pico, fama, goles, títulos, partidos con la Selección y premios. Lo que un desenlace puede mover del puntaje es `rating` (x1,2 en el pico) y `fame` (x0,15).
- `gameScreen()` (`main.ts`) muestra el evento con `ev.options.map(...)` y, tras elegir, `lastResolution` con `esc()` en todo. `CATEGORY_LABEL` da el rótulo (sin entrada, queda vacío).
- `style.css` ya anula animaciones y transiciones CSS con `prefers-reduced-motion`, pero **no detiene lo que se mueve desde JavaScript** (un marcador con `requestAnimationFrame` seguiría moviéndose). `celebrate.ts` es el precedente: lee `matchMedia` al montar.
- `simulate` elige `Math.floor(rng * ev.options.length)` para cada decisión y revisa fugas de Guatemala, goles de portero y categorías sobre todo `ev.options`. Con una sola opción, un minijuego se resuelve ahí como "Simular" sin cambiar esa lógica.
- Estado del repo: la rama de mercado **ya está integrada** (HEAD es el PR #8): `drawEvent` y `transferOffer` quedaron como están; no hay choque vivo con ella.

## Archivos
| Archivo | Cambio |
|---|---|
| `src/engine/types.ts` | Al final de cada tipo: `MinigameKind`, `MinigameResult` (tipos nuevos al final del archivo); `EventCategory` suma `'minijuego'` **después** de `'retiro'`; `EventTemplate.minigame?`, `GameEvent.minigame?`, `Resolution.result?` al final de sus interfaces. |
| `src/engine/minigames.ts` (nuevo) | Funciones puras del motor: `difficultyFor`, `resultOf`, `simulatedScore`, constantes de umbral. Sin DOM. |
| `src/engine/engine.ts` | Una importación; en `drawEvent`, una línea más en el objeto que retorna; en `choose`, la rama de minijuego (ver "Motor"). `transferOffer`, `retirementEvent`, `applyEffects` y `simulateSeason` no se tocan. |
| `src/engine/events/minijuegos.ts` (nuevo) | `MINIJUEGOS_EVENTS`: 12 plantillas (4 tipos x 3 situaciones) y las ayudas de frecuencia. |
| `src/engine/events/index.ts` | Una importación y `...MINIJUEGOS_EVENTS` al final de `ALL_EVENTS`. |
| `src/ui/minigames.ts` (nuevo) | Reglas de puntaje y parámetros (puras, sin DOM al importar) y `mountMinigame` (DOM, `requestAnimationFrame`). |
| `src/style.css` | Bloque `.mg*` al final del archivo. |
| `src/main.ts` | Una importación, `minijuego: 'Minijuego'` en `CATEGORY_LABEL` (después de `retiro`), y la rama de `gameScreen()` (ver "Interfaz"). |
| `scripts/simulate.ts` | Cambios agrupados: un decimal en las categorías, dos líneas de conteo en el bucle y una sección nueva al final del archivo. |

## Motor

### Tipos (`types.ts`)
```ts
export type MinigameKind = 'penal' | 'atajada' | 'pase' | 'cierre';
export type MinigameResult = 'ok' | 'half' | 'fail';
// EventTemplate (al final):  minigame?: (p: Player, ctx: EventContext) => { kind: MinigameKind; importance: 1 | 2 | 3 };
// GameEvent (al final):      minigame?: { kind: MinigameKind; difficulty: number };
// Resolution (al final):     result?: MinigameResult;  // solo si la decisión era un minijuego
```
Convención de una decisión de minijuego: `options` tiene **una** opción ("Patear el penal") cuyos `outcomes` son exactamente tres, en el orden `[éxito, a medias, fallo]`; su campo `p` se ignora (se escribe 0). La opción única es lo que mantiene vivos `simulate`, la revisión de textos y cualquier consumidor que recorra `options`.

### Funciones puras (`engine/minigames.ts`)
- `difficultyFor(rating, importance) = clamp(0.5 + 0.15 * (importance - 2) - 0.01 * (rating - 65), 0.1, 0.9)`. Baja con el nivel, sube con la importancia, dentro de [0,1; 0,9] (RF-08, CA-3).
- `resultOf(score)`: `score` no finito pasa a 0, se recorta a [0, 1]; `>= 0.7` es `'ok'`, `>= 0.35` es `'half'`, si no `'fail'` (RF-11, CA-6).
- `simulatedScore(rng, d)`: sortea el resultado y después un valor uniforme dentro de su tramo ([0,7; 1], [0,35; 0,7), [0; 0,35)). Probabilidades: éxito `0.40 - 0.5 * (d - 0.5)`, fallo `0.25 + 0.5 * (d - 0.5)`, a medias el resto. Da 40/35/25 con 0,5; 60/35/5 con 0,1; 20/35/45 con 0,9 (RF-09, CA-4). Usa el `rng` que recibe, nunca `Math.random`.

### `drawEvent` y `choose`
- `drawEvent`: en el objeto que retorna se agrega una línea: `...(template.minigame ? { minigame: this.minigameFor(template.minigame(p, ctx)) } : {})`, donde `minigameFor` (privado, 3 líneas) devuelve `{ kind, difficulty: difficultyFor(p.rating, importance) }`. Nada más cambia en `drawEvent`.
- `choose(optionIndex, score?: number)`: si `event.minigame`: toma `score ?? simulatedScore(this.rng, event.minigame.difficulty)`, calcula `resultOf(score)`, toma `option.outcomes[{ok:0, half:1, fail:2}[result]]` (lanza si no hay exactamente tres), marca `p.flags[event.id] = p.year` (para el tope y el espaciado, ver "Frecuencia") y devuelve `{ text, changes, result }`. Si no es un minijuego, el camino es el de hoy y `score` se ignora. La segunda llamada ya falla hoy porque `this.pending` queda en null (RF-11, CA-6).
- `Simular` y `simulate` llaman `career.choose(0)` sin resultado: misma función, misma semilla (RF-09).

## Situaciones (`events/minijuegos.ts`)
Doce plantillas, `once: true`, categoría `'minijuego'`, id `mj_<tipo>_<situación>`; `options` con la opción única y `outcomes` en el orden de arriba.

| Tipo | Posición | `liga` (importancia 2; 3 si el club es de primera división) | `clasico` (2) | `seleccion` (2; 3 en eliminatoria) |
|---|---|---|---|---|
| penal | DEL | penal en el último minuto de la final del torneo | mano a mano contra el portero del rival de clásico | penal decisivo con la Selección |
| atajada | POR | penal en contra en la final del torneo | tanda de penales en el clásico | penal en contra con la Selección |
| pase | MED | pase filtrado para el gol que define el torneo | pase filtrado en el clásico | pase filtrado con la Selección |
| cierre | DEF | cierre del contraataque en la final | barrida en el clásico | cierre en el último minuto con la Selección |

- **`when`** común: edad 18 o más, al menos 2 temporadas jugadas, posición del tipo, tope y espaciado de RF-13 (abajo). `clasico` agrega `rivalOf(ctx) !== null`. `seleccion` agrega `p.ntLevel >= 1 && !has(p, 'sel_retirado')`.
- **Textos**: voseo como el resto del juego; nada de Guatemala (`ctx.club.name`, `rivalOf(ctx)`, `ctx.country.ntName` con los ayudantes `de()` y `a()` de `helpers.ts`; nunca el nombre de un país fijo). Todo texto se arma a partir de datos que luego pasan por `esc()` en pantalla.
- **Desenlaces** (`o(0, texto, efectos)`): éxito `{ rating: 1 a 2, fame: 8 a 15, morale: 8 a 12 }`, y en la penal de Selección de DEL opcionalmente `natGoals: 1` y un `milestone` de texto sin título ("Definió un penal decisivo con la Selección"); a medias `{ morale: 0 a 3, fame: 0 a 3 }`; fallo `{ morale: -8 a -12, rating: 0 a -1, fame: 0 a -2 }` (la fama no baja de 0 por el `clamp` de `applyEffects`). Ningún texto dice campeón, título, clasificación ni convocatoria; el de POR nunca dice que anotó (RF-12).
- **Ejemplo** (`mj_penal_liga`): título "Penal en el último minuto"; texto "Final del torneo y ${club} pierde por un gol. El árbitro cobra penal a favor en el último minuto y el técnico te mira: el balón ya lo tenés vos."; opción "Patear el penal"; éxito "La clavaste pegada al palo. El estadio explota y tus compañeros te caen encima."; a medias "El portero la tocó y se fue al poste. Se te hizo un nudo en el estómago."; fallo "Se te fue por arriba del arco. Te quedás mirando el césped."

### Frecuencia (RF-13)
- **Peso**: función (nunca número >= 3, para no volverse "ruta"): `weight: (p) => PESO * (hechos(p) === 0 ? 1 + 0.2 * Math.max(0, p.age - 20) : 1)`, con `hechos(p)` = cantidad de banderas `mj_*` y `PESO` una sola constante del archivo (punto de partida 1,2). El empuje por edad es la perilla para la meta de "al menos uno" sin subir la media.
- **Tope y espaciado** en el `when`: `hechos(p) < 3` y `p.year - últimoAño(p) > MODE_SEASONS[p.setup.mode]` (el año de la última bandera `mj_*`, que `choose` guarda como valor), o sea nunca en dos decisiones seguidas aunque cambie el ritmo.
- **Perillas, en orden**: (1) `PESO`; (2) el empuje por edad; (3) `cooldown` de las plantillas. Si falla CA-2 por una categoría, bajar `PESO`; no tocar `drawEvent` ni los pesos de otras categorías. Cálculo de partida: con ~77,7 % de decisiones del pool y `medios` en 18,4 %, 2,5 puntos de caída de `medios` corresponden a unas 1,4 decisiones de minijuego por carrera en promedio global (13,3 decisiones entre ritmos; `simulate` mezcla los tres). Como el peso por decisión es el mismo en todos los ritmos, intensa (20,8 decisiones) queda en ~1,9 veces la media de normal (11,2) y exprés (7,8) en ~0,7: con normal en 1,0 a 1,2 la media global queda en ~1,2 a 1,4 y `medios` cerca de su piso. Por eso la banda de media es solo para ritmo normal, los otros ritmos se reportan, y el criterio que decide son los pisos de categoría de CA-2.

## Interfaz

### `src/ui/minigames.ts`: reglas puras (sin `document` al importar; `simulate` las importa)
- `params(d)`: con `t = (d - 0.1) / 0.8`, interpola linealmente entre los extremos de RF-08: `zone` 0,30 a 0,10 (del recorrido), `period` 2200 a 1200 ms, `window` 700 a 400 ms.
- `stopScore(pos, center, zone)` (pos y center en [0, 1]): con `h = zone / 2` y `dist = |pos - center|`: dentro de la zona (`dist <= h`) `1 - 0.3 * dist / h` (de 1 a 0,7); fuera, `0.7 * (1 - (dist - h) / (1.5 * h))` recortado a 0 (de 0,7 a 0; el tramo "a medias" cae entre 0,35 y 0,7).
- `sideScore(chosen, kicked, t, window, anticipated)` (atajada): lado equivocado o sin tocar `0`; acertó antes del disparo (`anticipated`) `0.8`; acertó después `1 - 0.55 * t / window` (de 1 a 0,45 dentro de la ventana; fuera de la ventana, 0).
- `penalScore(chosen, keeper, powerScore)`: `powerScore * (chosen === keeper ? 0.5 : 1)` (el portero se lanza a un lado al azar; si coincide, el mejor tiro llega a "a medias").
- `riskScore(option, s)` (modo por turnos): `clamp(0.5 + k * (s - 0.5), 0, 1)` con `k` 0,6 (segura), 1 (equilibrada) y 1,5 (arriesgada), donde `s` sale de `simulatedScore(rng, d)` del motor. La equilibrada es exactamente "Simular" (RF-14, CA-9).
- `LABELS`: la tabla de RF-07, constantes.

### `mountMinigame(host, spec, resolve, next)` (DOM)
- `spec = { kind, difficulty }`; `resolve(score?) => Resolution` es `career.choose(0, score)` envuelto por `main.ts`; `next()` vuelve a dibujar la pantalla; `calm` es `matchMedia('(prefers-reduced-motion: reduce)').matches`, leído dentro al montar, como `celebrate.ts`.
- **Estados**: `listo` (instrucción escrita, botones "Jugar" y "Simular") -> `jugando` -> `resultado` (etiqueta, `aria-live="polite"`, botón "Continuar"). "Simular" está visible en `listo` y en `jugando`; en ambos llama `resolve()` sin resultado, cancela el juego y pasa a `resultado`.
- **Detener el marcador** (pase, cierre, potencia): un `<button class="mg-zona">` ocupa el área; el marcador es un elemento con `transform: translateX` movido por `requestAnimationFrame` con `performance.now()` (nunca un contador de cuadros), en vaivén de `period` ms (pase y potencia) o de un solo pase de izquierda a derecha (cierre, con el rival entrando a la zona); el centro de la zona se sortea en [0,25; 0,75]. La acción es `pointerdown` y `keydown` (Espacio/Enter, sin `repeat`) sobre el botón; el `click` no se usa porque llega tarde. Máximo 3 vaivenes (unos 6 s a dificultad media) y después fallo (RF-06).
- **Elegir lado**: tres botones grandes (izquierda, centro, derecha; `data-lado`) y las teclas ← ↑ → y 1 2 3. Atajada: espera de 0,8 a 1,6 s (con el pateador en carrera), el disparo sale a un lado al azar y la pelota tarda `window` ms en llegar; tocar antes del disparo es anticipar. Penal: el lado se elige antes de la potencia (dos pasos, cada uno con 6 s máximos: 12 s en total).
- **Modo por turnos (`calm`)**: sin `requestAnimationFrame`, sin cuenta atrás y sin límite; tres botones con la etiqueta del tipo (penal: "Colocarla", "Con potencia", "Al ángulo"; atajada: "Quedarme", "Tirarme al lado que mira", "Adivinar"; pase: "Al pie", "Al espacio", "Por arriba"; cierre: "Seguir al rival", "Anticipar", "Barrerme"); la opción segura es la primera, la equilibrada la segunda y la arriesgada la tercera. El resultado lo sortea `riskScore`, que usa la función `simulatedScore` del motor con `Math.random` como `rng` (en este modo no hay semilla que repetir ni dato sensible).
- **Resultado**: la etiqueta de `LABELS[kind][result]` y una animación corta que **sigue al resultado** (balón adentro, atajado o afuera; rival pasa o se frena). Con `calm` o simulado, solo la etiqueta. No hay avance automático: "Continuar" llama `next()` y `gameScreen()` muestra el desenlace de texto con `lastResolution` como hoy.
- **Limpieza** (RF-15): `cancelAnimationFrame` al terminar; un solo `visibilitychange` que, si la pestaña se oculta mientras `jugando`, cancela y vuelve a `listo` sin resolver; cada cuadro comprueba `host.isConnected` y se detiene si `render()` reemplazó la pantalla. Las acciones después del primer resultado se ignoran con un seguro de una vez.
- **Texto**: títulos y desenlaces los dibuja `gameScreen()` con `esc()`; `mountMinigame` solo escribe constantes y usa `textContent`; `kind` desconocido (no está en `LABELS`) cae a "Simular" directo, sin juego.

### `src/style.css` (`.mg*`)
`.mg` con altura fija de `220px` (sin saltos al pasar de `listo` a `jugando` y a `resultado`); la zona y los botones de lado con `min-height: 56px` y `touch-action: manipulation`; `user-select: none` dentro del área; anillo de foco visible (`:focus-visible`); la zona de acierto lleva contorno y trama además del color; la etiqueta de resultado en texto grande, no solo color. A 360 px todo cabe en una columna (sin `overflow-x`). Sin `@media (prefers-reduced-motion)` propio: el movimiento es de JS y ya lo decide `calm`.

### `src/main.ts`
- Importación de `mountMinigame` y `MINIGAME_LABELS` si hace falta; `CATEGORY_LABEL.minijuego = 'Minijuego'` (después de `retiro`).
- `gameScreen()`: en la rama del evento, si `ev.minigame`, en lugar de `<div class="options">...` va `<div class="mg" id="mg"></div>`; después de `render(...)`, `if (!res && ev?.minigame) mountMinigame(document.getElementById('mg')!, ev.minigame, (s) => (lastResolution = career!.choose(0, s)), () => { freshSeasons = 0; gameScreen(); })`. El resto (resultado de texto, `chipClass`, "Seguir") es el mismo flujo.
- Chocar con ramas: `doble-nacionalidad` toca las importaciones de `main.ts` y `chipClass` (adyacente); `vida-sentimental` agrega `amor` a `CATEGORY_LABEL` y a `EventCategory` antes de `retiro` (la entrada de `minijuego` va después, pero las líneas son vecinas). Son conflictos triviales de fusión.

## `scripts/simulate.ts` (cambios agrupados)
1. Línea de categorías con un decimal (`toFixed(1)`): la comparación de CA-2 es a 2,5 puntos y con enteros no se mide.
2. En el bucle, dos líneas: contar `if (ev.minigame)` por carrera (con el id y la importancia) y guardar `res.result`. La elección ya cae en la opción 0 (una sola opción), así que se resuelve como "Simular" sin tocar `pick`. Las revisiones de fugas y de goles de portero ya recorren `ev.options` y alcanzan los tres desenlaces.
3. Sección nueva al final del archivo, "Minijuegos", autocontenida con sus contadores y sus errores (`mjErrors`), con salida de error y `process.exitCode = 1` como las demás:
   - CA-1: plantillas vistas, tres desenlaces, posición, rival, Selección vigente, y que ninguna plantilla de minijuego tenga peso numérico >= 3 (riesgo 4).
   - CA-2: media, máximo y consecutivos por carrera; carreras con al menos uno por ritmo; categorías contra el piso de la línea base.
   - CA-3: cuadrícula nivel x importancia con `difficultyFor` y `params`.
   - CA-4: 10.000 `simulatedScore` por dificultad y la repetición con la misma semilla.
   - CA-5: jugadores sintéticos con `stopScore`, `sideScore` y `penalScore`: perfecto y al azar frente a CA-4.
   - CA-6: tabla de `resultOf` y la doble resolución.
   - CA-7: topes de efectos y las palabras prohibidas sobre los desenlaces vistos.
   - CA-8: puntaje medio y veredictos contra la línea base.
   - CA-9: las tres opciones de riesgo con `riskScore`.
4. Línea base: antes de tocar nada se corrió `simulate 5000` en `main` (HEAD 2f80028): puntaje medio 107,2; categorías contrato 21,8 · medios 18,4 · divisiones 13,4 · cancha 11,7 · retiro 10,9 · vida 10,6 · selección 6,2 · extranjero 3,9 · formación 3,0; decisiones por carrera: intensa 20,8, normal 11,2, exprés 7,8.

## Seguridad (OWASP Top 10)
Ver la sección del spec. En el diseño: el resultado entra por `choose(0, score)`, que acota y valida (`resultOf`); no hay endpoints ni campos nuevos hacia el servidor (`api/ranking.ts` sin cambios); los textos de los desenlaces se escapan con `esc()` en `gameScreen()` y la interfaz del minijuego solo usa constantes y `textContent`; sin dependencias nuevas.

## Pruebas y riesgos
- **Pruebas**: `npm run simulate -- 5000` con todas sus revisiones actuales más la sección de minijuegos; `npm run build` (tipos). CA-10 y CA-11 se verifican a mano en navegador: 360×640 y 1280×800, con y sin "reducir movimiento" (emulación de medios del navegador), teclado, y un club con `<b>x</b>` en el nombre del rival.
- **Riesgo 1, la frecuencia y el tope chocan**: "1 a 3" con piso duro no cabe en los 2,5 puntos (ver Aclaraciones del spec). Mitigación: media de 1,0 a 1,2 en ritmo normal y empuje por edad; si no se llega al 70 % con al menos uno, se reporta y gana el tope.
- **Riesgo 2, calibración humana**: CA-4 y CA-5 fijan la equidad contra jugadores sintéticos, no contra personas. Los números de `params` se afinan jugando en un celular real. Si el éxito humano queda muy lejos de 40 % a 0,5, se cambian `params` y `stopScore`, no los umbrales del motor.
- **Riesgo 3, latencia táctil**: usar `pointerdown` y `touch-action: manipulation` evita el retraso del `click`; el vaivén se calcula con `performance.now()` y no con cuadros, para que un teléfono lento no cambie el reto.
- **Riesgo 4, pesos como "ruta"**: un peso numérico >= 3 en las plantillas las volvería prioritarias y x3. Se usan pesos como función; una revisión en `simulate` falla si alguna plantilla de minijuego tiene peso numérico >= 3.
- **Riesgo 5, la Selección que cambia**: `doble-nacionalidad` agrega `ctx.nt` (la Selección que realmente representa). Mientras no esté integrada, las plantillas `seleccion` usan `ctx.country.ntName`; al integrar, se cambia por `ctx.nt.ntName` en las 4 plantillas (cambio de una palabra en cada una). Sin ese ajuste, quien cambió de Selección vería la anterior.
- **Riesgo 6, `simulate` y la rama de nacionalidad**: ambas agregan secciones al final de `simulate.ts`; chocan al fusionar y se resuelven manteniendo las dos.
- **Trazabilidad**: RF-01: motor (`choose`, opción única), `main.ts`, `events/minijuegos.ts`. RF-02: tabla de situaciones y `when`. RF-03 y RF-04: `mountMinigame`. RF-05: estados `listo` y `jugando`. RF-06: límites de `mountMinigame`. RF-07: `LABELS` y estado `resultado`. RF-08: `difficultyFor` y `params`. RF-09: `simulatedScore` y `choose(0)`. RF-10: `stopScore`, `sideScore`, `penalScore` y CA-5. RF-11: `resultOf` y `choose`. RF-12: desenlaces y topes. RF-13: "Frecuencia". RF-14: modo por turnos y `riskScore`. RF-15: limpieza. RF-16: `style.css` y atributos de accesibilidad.
