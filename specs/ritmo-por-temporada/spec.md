# Ritmo por temporada y puntajes justos entre modos

## Problema y valor
Pedido del usuario: "que haya 2-3 decisiones y 1 minijuego por temporada; cuando se elige normal o exprés cuesta más sacar punteos altos, corregir esto".

Hoy el modo de juego decide **cuántas temporadas se simulan entre una decisión y la siguiente**: intensa 1, normal 2, exprés 3. Eso tiene dos costos medidos:

1. **Pocas decisiones.** Una carrera de unas 20 temporadas trae 19,5 decisiones en intensa, 10,2 en normal y 6,9 en exprés (0,98, 0,48 y 0,32 por temporada), y un minijuego cada 14 a 25 temporadas (1,3, 1,0 y 0,8 por carrera).
2. **Puntaje desigual entre modos.** El ranking mezcla modos, pero con decisiones al azar el puntaje medio es 115,0 en intensa, 105,9 en normal y 101,8 en exprés, y el p90 es 231, 199 y 187 (exprés queda 19 % abajo). Con la política "mejor opción" de `simulate` la brecha es mayor: media 134,1, 121,9 y 114,3.

Valor: que cada temporada tenga ritmo propio (decisiones y un minijuego, siempre) y que el modo elegido cambie cuánto se juega por temporada, no cuánto vale la carrera.

### Diagnóstico (medido en `main`, `6c440b6`, antes de cambiar nada)
Ver "Línea base medida". Resumen de la hipótesis del pedido ("menos decisiones, menos efectos acumulados de nivel y fama, menos puntaje"):

- **Confirmada en la dirección, refutada en la causa principal.** De los 13,2 puntos que separan intensa de exprés con decisiones al azar, el **nivel pico** explica solo 0,7 (5 %); la **fama** explica 5,2 (39 %); los **partidos con la Selección y el Mundial** explican 6,3 (48 %); el resto, 1,0. Con "mejor opción" son 1,4 (7 %), 7,1 (36 %) y 11,1 (56 %). El nivel casi no se mueve (nivel pico medio 72,1, 71,7 y 71,5); lo que cambia es **cuántos eventos de ruta** (convocatoria, eliminatoria, ofertas) ve cada modo.
- **Dos mecanismos por decisión, no por temporada, que mueven el puntaje y no son "efectos acumulados":** la oferta de traspaso se sortea en cada decisión (2,36, 1,54 y 1,19 ofertas por carrera; jugaron en el extranjero 20,7 %, 9,3 % y 5,2 %) y el retiro se ofrece en cada decisión desde los 33 años (edad media de retiro 36,0, 37,2 y 37,7: exprés juega 1,7 temporadas más y gana más premios, 9,6 contra 7,1 por carrera).
- Por eso normalizar solo los efectos numéricos de las decisiones no alcanza: hay que pasar a **por temporada** todo lo que hoy es **por decisión**.

## Alcance
- Cada temporada se juega así: **decisiones → minijuego → simulación de la temporada → resumen de esa temporada**, en los tres modos.
- El modo elegido pasa a significar **cuántas decisiones por temporada**: intensa 3, normal alterna 3 y 2, exprés 2. A esas se suman, cuando toca, las **decisiones de historia** (ver "Términos").
- **Un minijuego por temporada** desde los 18 años, que reemplaza al muestreo actual de minijuegos.
- **Puntaje justo entre modos**: el puntaje esperado, su distribución y el máximo alcanzable con buen juego son equivalentes en los tres modos, y el balance global del juego (tasa de Mundial, extranjero, Selección, ofertas, premios, dinero) no cambia de forma notable.
- Las rutas encadenadas (extranjero, Selección, amor, cambio de Selección) siguen completándose en los tres modos.
- La pantalla de decisión muestra el progreso de la temporada ("Decisión 2 de 3 · Temporada 2031-32").

## Fuera de alcance
- La fórmula del puntaje, los premios, los títulos y los topes de `api/ranking.ts`.
- Nuevos modos de juego, guardar carreras en curso, la tienda, el mercado, el cálculo de salarios y las mecánicas de los minijuegos (zona, ventana, "Simular", modo por turnos).
- Reescribir el repertorio de decisiones. Se agregan situaciones de minijuego (RF-10); el resto del contenido nuevo queda como pregunta abierta (A4).
- Migrar carreras o puntajes viejos: no hay carreras guardadas. El ranking seguirá comparando carreras jugadas con el balance viejo y el nuevo; no se recalcula nada.

## Términos
- **Decisión de ritmo**: las que fija el modo (3, 2 o 3-2, 2 por temporada). Pesan lo mismo en todas las temporadas de un modo.
- **Decisión de historia**: oferta de traspaso, oferta de retiro (desde los 33 años), oferta de otro país para cambiar de Selección, y los pasos y entradas de una historia encadenada (Selección, extranjero, amor, prensa, ascenso). No cuentan para el cupo del modo.
- **Interacción**: una decisión (de ritmo o de historia) o un minijuego. El resumen de temporada no cuenta.
- **Política al azar / mejor opción / techo**: las de `simulate`. Al azar elige una opción al azar (y 50/50 quedarse o irse ante una oferta); mejor opción elige la de mayor valor esperado en nivel y fama; techo es mejor opción con los minijuegos jugados a la perfección.

## Requisitos funcionales

### Ritmo de la temporada
- **RF-01** Toda temporada, desde la primera (16 años), se juega en este orden: sus decisiones, su minijuego (si le toca, RF-09) y la simulación de la temporada, que termina en su resumen. No se simula nada entre dos decisiones de la misma temporada.
- **RF-02** Decisiones de ritmo por temporada: **intensa 3**; **normal 3 en la primera temporada, 2 en la segunda y así alternando**; **exprés 2**. Siempre se ofrecen todas (no se saltan).
- **RF-03** Las decisiones de historia se suman a las de ritmo. Una temporada trae **a lo sumo 3 decisiones de historia, sin contar la oferta de traspaso y la de retiro**. Cada categoría de historia aporta a lo sumo un paso y una entrada por temporada. La media de decisiones de historia por temporada es la misma en los tres modos (RF-14).
- **RF-04** Las decisiones de la temporada (de ritmo y de historia) salen mezcladas; el minijuego va siempre al final, justo antes de simular. La oferta de traspaso y la de retiro, si salen, van primero.
- **RF-05** Cuando el jugador elige retirarse ante la oferta de retiro, la carrera termina sin simular la temporada empezada (como hoy). Si elige "una temporada más", la temporada trae todas sus decisiones. El retiro forzado (por edad o nivel) se evalúa después de simular, como hoy.
- **RF-06** Tras cada temporada simulada se muestra **su** resumen (una temporada por pantalla) en los tres modos, con "Seguir"; si el jugador se retiró, "Ver mi carrera". Ya no hay resúmenes de 2 o 3 temporadas juntas.
- **RF-07** La tienda sigue disponible donde está hoy: entre decisiones (menos con un minijuego a medias) y en el resumen de temporada. Ninguna regla de la tienda cambia.
- **RF-08** Las carreras en curso no se guardan; no hay datos que migrar.

### Minijuego de la temporada
- **RF-09** Cada temporada de un jugador de 18 años o más, con al menos 2 temporadas jugadas, trae **exactamente un minijuego** de la posición del jugador (penal, atajada, pase o cierre), siempre con "Simular" disponible. Antes de los 18 años no hay minijuego. Si ninguna situación aplica, la temporada se simula sin minijuego (no debe pasar en la práctica, CA-02).
- **RF-10** Hay al menos **6 situaciones por posición** (24 o más en total): las tres actuales (final de torneo, clásico, Selección) y al menos tres más, de las cuales **al menos 4 por posición aplican a cualquier jugador** (sin clásico ni convocatoria). Las que dependen del contexto (clásico con rival, Selección con convocatoria vigente, ascenso, jugar afuera, etc.) solo salen si aplican, y hablan de la Selección y del club actuales, como hoy.
- **RF-11** Variedad: la misma situación no se repite en menos de 3 temporadas, y cada situación tiene **al menos 2 variantes de texto** que alternan.
- **RF-12** El minijuego **deja de competir con las decisiones**: ya no tiene peso, empuje, tope por carrera ni "una sola vez por carrera". Sus reglas de dificultad, "Simular", equidad, reducción de movimiento y etiquetas de resultado no cambian (`specs/minijuegos`).
- **RF-13** El minijuego pesa poco en el puntaje: con "Simular", su efecto esperado sobre el puntaje de una carrera entera es de **1 punto o menos** (hoy, con 1,3 minijuegos por carrera, es de unos 0,9). Jugarlo bien sigue dando más que jugarlo mal. Su resultado se ve igual (etiqueta y texto).

### Puntaje justo entre modos
- **RF-14** Todo lo que hoy se sortea o se mide **por decisión** pasa a ser **por temporada**: la probabilidad de recibir una oferta de traspaso, la de que se ofrezca el retiro, la de que salga un paso o una entrada de historia, la de recibir una oferta de otro país, y el espaciado entre repeticiones de una misma decisión. Resultado: la edad de retiro, el número de temporadas y las ofertas por carrera son los mismos en los tres modos.
- **RF-15** El efecto esperado **por temporada** de las decisiones de ritmo sobre nivel, potencial, fama, ánimo, físico, técnico, lesiones y partidos con la Selección es el mismo en los tres modos: cada decisión de ritmo pesa en proporción inversa a cuántas hay en su temporada (con 3 pesa menos que con 2). Las decisiones de historia tienen su efecto completo.
- **RF-16** Lo que el jugador ve es entero, como hoy. Un efecto que por RF-15 resulta fraccionario se redondea **sin sesgo** (un "+1 Nivel" que vale 0,2 aparece 1 de cada 5 veces): el promedio de lo mostrado es igual al efecto aplicado.
- **RF-17** Con decisiones al azar y con la política "mejor opción", el puntaje medio, el p50 y el p90 de cada modo quedan dentro de **±5 %** del promedio de los tres modos (CA-03 y CA-04). El máximo alcanzable con buen juego es equivalente (techo, CA-04).
- **RF-18** La fórmula del puntaje, los puntos por premio, el límite de `api/ranking.ts` y los topes de títulos y partidos no cambian.

### Balance global
- **RF-19** Las tasas globales del juego (mezcla de los tres modos) no cambian de forma notable: Mundial, jugó afuera, Selección mayor, cambio de Selección, ofertas de traspaso, títulos, premios (incluidos Balón de Oro, Bota de Oro y Golden Boy), dinero y puntaje (CA-05 y CA-06).
- **RF-20** Las rutas encadenadas se completan en los tres modos tanto como hoy en promedio (CA-07), sin que se multipliquen las historias que arrancan y no terminan.
- **RF-21** Los topes que hoy se miden por carrera (máximo de eventos de amor por carrera, 3 minijuegos por carrera, 1 minijuego cada 2 decisiones) se redefinen por temporada o como proporción (ver "Cambios a specs anteriores"). El repertorio no se agota: si no queda ninguna decisión disponible se relaja el espaciado (nunca el "una sola vez") y la carrera sigue.

### Pantalla
- **RF-22** En la pantalla de decisión se ve el progreso de la temporada: "Decisión n de N · Temporada AAAA-AA", donde N es el total de decisiones que tiene esa temporada (las de ritmo más las de historia). El minijuego se rotula aparte: "Minijuego de la temporada · Temporada AAAA-AA". El rótulo y los textos del jugador se muestran escapados.
- **RF-23** El formulario de creación describe el ritmo como decisiones por temporada: Intensa "3 por temporada", Normal "2 o 3 por temporada", Exprés "2 por temporada", y aclara que cada temporada trae además un minijuego.
- **RF-24** El resumen de temporada, la tienda, el minijuego (con "Simular" y modo por turnos), la celebración de trofeos y el final siguen funcionando igual. El historial dice "Tu primera temporada arranca después de estas decisiones" cuando está vacío.

## Criterios de aceptación
Todos se miden con `npm run simulate -- 20000` (semillas 1 a 20000, las 27 nacionalidades, las 4 posiciones y los 3 modos repartidos por igual, unos 6.700 por modo), salvo los que dicen otra cosa. Las líneas base son las de la sección "Línea base medida".

- **CA-01 Decisiones por temporada.** Dadas las carreras simuladas, entonces toda temporada tiene exactamente 3 decisiones de ritmo en intensa, 3 y 2 alternando (empezando por 3) en normal y 2 en exprés; ninguna temporada tiene más de 3 decisiones de historia (sin contar traspaso y retiro); la media de historia por temporada es de 0,8 o menos y no difiere más de 15 % entre modos. (RF-02, RF-03)
- **CA-02 Un minijuego por temporada.** Dadas las carreras, entonces en cada modo y posición al menos el 95 % de las temporadas con jugador de 18 años o más y 2 temporadas jugadas tienen exactamente un minijuego; ninguna temporada antes de los 18 tiene uno; la misma situación no se repite en menos de 3 temporadas; hay 24 o más situaciones y cada una trae 2 o más variantes de texto distintas; cada situación sale al menos una vez en 20.000 carreras. (RF-09, RF-10, RF-11)
- **CA-03 Equidad con decisiones al azar.** Dadas las carreras, entonces la media, el p50 y el p90 del puntaje de cada modo están dentro de ±5 % del promedio de los tres modos. Hoy: media 115,0 / 105,9 / 101,8; p50 87 / 80 / 78; p90 231 / 199 / 187. (RF-17)
- **CA-04 Equidad con mejor opción y con techo.** Dadas 8.000 o más carreras por política, entonces media, p50 y p90 de cada modo están dentro de ±5 % del promedio de los tres modos con la política "mejor opción" y con la política "techo"; y el puntaje máximo de las tres políticas no pasa de 960 (80 % del límite del servidor, 1.200). Hoy, con mejor opción: media 134,1 / 121,9 / 114,3; p90 273 / 258 / 234. (RF-17, RF-18)
- **CA-05 Nivel global del puntaje.** Dadas las carreras con decisiones al azar, entonces la media de los tres modos está entre 102,2 y 113,0 (107,6 ±5 %), el p50 entre 77,6 y 85,8 (81,7 ±5 %), el p90 entre 195 y 216 (206 ±5 %), cada veredicto cambia 2 puntos o menos contra hoy, y el límite del servidor sigue dando al menos 25 % de margen sobre el máximo medido. (RF-18, RF-19)
- **CA-06 Tasas globales.** Dadas las carreras con decisiones al azar, entonces, contra hoy: Mundial 10,8 % ±1,5 puntos; jugó afuera 12,0 % ±2 puntos; Selección mayor 21,7 % ±2,5 puntos; cambio de Selección 0,8 % ±0,5 puntos; ofertas de traspaso por carrera 1,68 ±10 %; títulos por carrera 3,74 ±10 %; premios por carrera 8,55 ±10 %; dinero medio ±10 %; Balón de Oro, Bota de Oro y Golden Boy dentro de las bandas de `specs/trofeos-reales` (RF-05). Además, en cada modo la tasa de Mundial, la de jugó afuera y las ofertas por carrera quedan dentro de ±10 % del promedio de los modos. (RF-14, RF-19)
- **CA-07 Rutas.** Dadas las carreras con decisiones al azar, entonces, para cada ruta de la tabla de la línea base, en **cada modo**: la tasa de finalización (carreras que ven el último paso entre carreras que ven el primero) es al menos el 90 % de la media de los tres modos de hoy; el porcentaje de carreras en que arranca la ruta no pasa de 2,5 veces la media de hoy; y toda ruta se completa al menos una vez. Las rutas de amor abiertas al terminar siguen por debajo de 2 % de las carreras. (RF-20)
- **CA-08 Variedad y repertorio.** Dadas las carreras, entonces ninguna plantilla de decisión sale antes de 4 temporadas de su última vez (salvo la relajación de RF-21, que ocurre en menos de 0,5 % de las decisiones); ninguna carrera se queda sin decisión disponible; el porcentaje de decisiones cuya plantilla ya había salido en esa carrera se reporta por modo y no pasa de 50 % (hoy 15 % / 11 % / 9 %). Meta, no tope: 35 % o menos (ver A4). (RF-21)
- **CA-09 Efectos visibles.** Dadas las carreras, entonces al menos el 80 % de las decisiones de ritmo muestran al menos un cambio numérico y al menos el 40 % de los minijuegos lo muestran (hoy, 98 % y 100 %); y el redondeo de RF-16 es insesgado: con 100.000 sorteos por cada escala usada, el promedio mostrado difiere 2 % o menos del efecto aplicado. (RF-16)
- **CA-10 El minijuego pesa poco.** Dadas las carreras con "Simular", entonces el aporte medio de los minijuegos al puntaje por carrera (fama x 0,15 + nivel x 1,2 de lo que mueven) es de 1 punto o menos, y con la política techo el puntaje medio sube no más de 3 puntos respecto de mejor opción. (RF-13)
- **CA-11 Interacciones y duración.** Dadas las carreras, entonces la media de interacciones por carrera en intensa es de 60 o más, y se reporta por modo junto con la duración estimada (supuestos en "Duración estimada"). (Pedido del orquestador)
- **CA-12 Proporción de categorías.** Dadas las carreras, entonces, sin contar oferta de traspaso, retiro ni minijuego, ninguna categoría cambia más de 8 puntos de su proporción contra hoy, las de ritmo (cancha, vida, medios, formación, ascenso) quedan a 4 puntos o menos de hoy, y amor y Selección no bajan del 40 % de su proporción de hoy. Hoy: amor 10,8 %, cancha 13,4 %, vida 11,9 %. Los topes de amor pasan a: promedio de 1,0 a 3,0 eventos por carrera en cada modo, máximo 14 por carrera y 15 % o menos de las decisiones (ver "Cambios a specs anteriores"). (RF-21)
- **CA-13 Repetibilidad y límites.** Dadas dos corridas con la misma semilla y las mismas decisiones, entonces la carrera es idéntica (el redondeo sin sesgo usa el generador de la carrera); `npm run build` pasa; los límites de puntaje (1.200), títulos (200) y partidos (500) de `api/ranking.ts` no se superan en las 20.000 carreras; `scripts/*.test.ts` pasan. (RF-16, RF-18)
- **CA-14 Pantalla (a mano, 360 x 640 y 1280 x 800, claro y oscuro).** Dadas una carrera en cada modo, entonces: el rótulo de progreso dice "Decisión n de N · Temporada AAAA-AA" y coincide con las decisiones reales de esa temporada; el minijuego lleva su rótulo; tras cada temporada aparece su resumen con "Seguir"; la tienda abre en el resumen y entre decisiones (no con un minijuego a medias) y vuelve al mismo punto; el formulario muestra las tres descripciones nuevas; sin scroll horizontal y con botones de 44 px o más. (RF-06, RF-07, RF-22 a RF-24)

## Línea base medida (`6c440b6`, antes de cambiar nada)
Medida con un script de diagnóstico desechable (no se sube) que juega las **mismas carreras en los tres modos** (misma semilla, país, posición y departamento) con 6.000 carreras por modo; y con `npm run simulate` (5.000 carreras, 18 s) para los valores globales.

| Decisiones al azar | intensa | normal | exprés | media de los 3 |
|---|---|---|---|---|
| Decisiones por carrera (sin minijuego) | 19,5 | 10,2 | 6,9 | 12,2 |
| Decisiones por temporada | 0,98 | 0,48 | 0,32 | 0,59 |
| Minijuegos por carrera | 1,32 | 1,04 | 0,83 | 1,06 |
| Temporadas por carrera | 20,0 | 21,2 | 21,7 | 21,0 |
| Puntaje medio | 115,0 | 105,9 | 101,8 | 107,6 |
| p25 / p50 / p75 | 59 / 87 / 142 | 56 / 80 / 130 | 55 / 78 / 126 | 57 / 82 / 133 |
| p90 / p97 / p99 | 231 / 343 / 437 | 199 / 319 / 422 | 187 / 314 / 410 | 206 / 325 / 423 |
| Máximo | 705 | 882 | 676 | 882 |
| Nivel pico medio | 72,07 | 71,71 | 71,50 | 71,76 |
| Fama final media (p90) | 99,2 (190) | 74,3 (138) | 64,5 (118) | 79,3 |
| Títulos por carrera | 3,72 | 3,72 | 3,76 | 3,73 |
| Mundial | 13,35 % | 10,00 % | 8,58 % | 10,64 % |
| Selección mayor | 28,8 % | 18,9 % | 15,4 % | 21,0 % |
| Partidos con la Selección | 13,5 | 8,3 | 6,8 | 9,5 |
| Jugó afuera | 20,7 % | 9,3 % | 5,2 % | 11,7 % |
| Cambió de Selección | 1,58 % | 0,62 % | 0,32 % | 0,84 % |
| Ofertas de traspaso por carrera | 2,36 | 1,54 | 1,19 | 1,70 |
| Premios por carrera | 7,07 | 8,98 | 9,60 | 8,55 |
| Dinero medio (millones de Q) | 113,9 | 87,6 | 82,9 | 94,8 |
| Edad de retiro | 36,0 | 37,2 | 37,7 | 37,0 |
| Eventos de amor por carrera | 1,81 | 0,77 | 0,47 | 1,02 |
| Con compromiso / con boda | 9,6 % / 8,0 % | 3,0 % / 2,3 % | 1,7 % / 1,1 % | 4,8 % / 3,8 % |
| Δ de nivel / fama / potencial que dan las decisiones | 0,66 / 35,9 / 0,26 | 0,20 / 18,5 / 0,15 | 0,04 / 12,4 / 0,11 | |
| Plantillas repetidas por carrera | 3,0 | 1,1 | 0,6 | |

Términos del puntaje que explican la brecha (media por carrera, al azar): nivel pico (pico − 60) x 1,2: 14,5 / 14,1 / 13,8; fama x 0,15: 14,9 / 11,1 / 9,7; partidos con la Selección x 0,5: 6,8 / 4,1 / 3,4; Mundial x 60: 11,0 / 9,5 / 8,1.

Mejor opción (política optimista de `simulate`): media 134,1 / 121,9 / 114,3; p50 99 / 88 / 86; p90 273 / 258 / 234; máximo 832 / 804 / 778. Techo (mejor opción y minijuegos perfectos): media 143,3 / 129,6 / 119,4; p90 284 / 275 / 243.

Rutas, al azar, 8.000 carreras por modo (carreras que ven el primer paso / el último paso / finalización) en intensa, normal, exprés, y la media de los tres:

| Ruta | intensa | normal | exprés | media (finalización) |
|---|---|---|---|---|
| Extranjero: visor → oferta final | 23,3 / 0,7 / 3 % | 11,8 / 0,0 / 0 % | 6,2 / 0,0 / 0 % | 1 % |
| Selección: prelista → debut | 10,7 / 5,8 / 54 % | 3,9 / 1,6 / 40 % | 1,7 / 0,5 / 27 % | 40 % |
| Selección: eliminatoria (grupos → decisivo) | 26,1 / 9,0 / 35 % | 14,2 / 0,0 / 0 % | 11,0 / 0,0 / 0 % | 12 % |
| Selección: Sub-20 → Mundial Sub-20 | 9,9 / 0,8 / 8 % | 6,0 / 0,2 / 3 % | 3,4 / 0,0 / 0 % | 4 % |
| Amor: cita → compromiso | 39,0 / 20,2 / 52 % | 22,1 / 8,3 / 38 % | 12,8 / 4,2 / 33 % | 41 % |
| Amor: compromiso → boda | 20,2 / 8,1 / 40 % | 8,3 / 2,4 / 28 % | 4,2 / 1,0 / 24 % | 31 % |
| Amor: hija del técnico (paso 1 → 3) | 22,5 / 4,7 / 21 % | 10,7 / 2,3 / 22 % | 8,5 / 1,1 / 13 % | 19 % |
| Amor: pareja de un compañero (1 → 2) | 23,4 / 10,8 / 46 % | 10,8 / 4,7 / 44 % | 9,0 / 3,4 / 37 % | 42 % |

Proporción de cada categoría sin contar oferta de traspaso, retiro ni minijuego (media de modos): amor 10,8 %, cancha 13,4 %, contrato 9,7 %, ascenso 18,7 %, extranjero 3,4 %, formación 3,8 %, medios 21,4 %, Selección 6,8 %, vida 11,9 %.

Valores de `npm run simulate` (5.000): decisiones 20,9 / 11,3 / 7,8 (incluyen minijuegos), temporadas 21,0, puntaje medio 107,3, p25 / p50 / p75 / p90 / p97 = 56 / 82 / 134 / 205 / 324, máximo 705, Mundial 10,8 %, jugó afuera 12,0 %, Selección 21,7 %, ofertas 1,68 por carrera, títulos 3,74.

## Duración estimada
Supuestos (de quien escribe, sin medir jugadores reales): una decisión lleva 12 s (leer, elegir y leer el desenlace), un minijuego 16 s (jugarlo y ver el resultado; con "Simular", 4 s) y un resumen de temporada 8 s.

| | intensa | normal | exprés |
|---|---|---|---|
| Hoy: interacciones por carrera | 20,8 | 11,2 | 7,7 |
| Hoy: duración | 7 min | 3,7 min | 2,5 min |
| Nuevo: decisiones por carrera (medido en el prototipo) | 67 | 58 | 48 |
| Nuevo: minijuegos por carrera (una por temporada desde los 18) | 18 | 18 | 18 |
| Nuevo: interacciones por carrera | 85 | 76 | 66 |
| Nuevo: duración | **21 min** | **19 min** | **17 min** |
| Nuevo, con todos los minijuegos en "Simular" | 17 min | 15 min | 13 min |

Una carrera pasa a durar de 3 a 7 veces más y "Exprés" deja de ser rápido (de 2,5 a 17 minutos). Es consecuencia directa del pedido (2 a 3 decisiones y un minijuego por temporada, 20 temporadas); se implementa lo pedido y la alternativa queda en A3.

## Seguridad (OWASP)
No hay superficie nueva: no hay rutas, parámetros, autenticación, almacenamiento ni peticiones nuevas, y no entra ninguna dependencia. Lo único con texto nuevo (rótulos de progreso, etiquetas del formulario, situaciones y variantes de minijuego) son constantes del juego o pasan por `esc()` (A03). El ranking **no cambia**: el puntaje se calcula en el navegador con la misma fórmula y `api/ranking.ts` sigue validando rangos con el mismo límite (1.200); solo se comprueba que el máximo medido siga dejando 25 % de margen (CA-04, CA-13). La limitación conocida del ranking (un POST armado a mano entra) no cambia.

## Decisiones (defaults razonables)
- **D-01 Los modos pasan a significar "decisiones por temporada"** (del orquestador). Se elimina el "bloque de temporadas". Un resumen por temporada en los tres modos (decidido aquí: es una pantalla, ya no tres juntas).
- **D-02 "Normal" alterna 3 y 2** (decisión mía). El pedido dice "normal 2 o 3"; con intensa 3 y exprés 2, un número fijo dejaba a normal idéntico a uno de los otros dos. Alternar da 2,5 de media y tres modos distintos. Ver A1.
- **D-03 La oferta de traspaso, el retiro y los pasos de historia se suman, no ocupan cupo** (decisión mía, por los datos): si ocuparan un cupo, un modo con 2 decisiones tendría menos pasos de ruta que uno con 3 y la brecha volvería. Con el prototipo, la media de decisiones de historia por temporada (con la oferta de traspaso) es de 0,4 y el 94 % de las temporadas trae 0 o 1. El rótulo "Decisión n de N" cuenta todas.
- **D-04 Todo lo que era por decisión pasa a por temporada** (RF-14). Lo mide `simulate` con ofertas, edad de retiro y rutas por modo.
- **D-05 El minijuego va al final de la temporada**, justo antes de simular: sus situaciones hablan de finales, clásicos y partidos decisivos.
- **D-06 Nivel de equiparación = el promedio de los tres modos de hoy** (decisión del orquestador y mía): puntaje medio 107,6, Mundial 10,8 %, etc. Intensa baja alrededor de 6 % y exprés sube alrededor de 5 %. Alternativa en A2.
- **D-07 Efectos por decisión mucho más chicos** (consecuencia de RF-15, medida): como hay unas 5 veces más decisiones que el promedio de hoy, cada decisión de ritmo pesa entre 1/6 (intensa) y 1/4 (exprés) de lo que pesa hoy; las de historia conservan su peso. Los efectos se redondean sin sesgo. Ver A6.
- **D-08 El minijuego es casi cosmético para el puntaje** (consecuencia de RF-13): con 18 por carrera, para que el balance no se mueva cada uno vale una fracción de lo que vale hoy. Se mantiene su resultado visible (etiqueta y texto), no su peso. Ver A6.
- **D-09 Equidad por simulación, no por fórmula**: la comprobación es `simulate` (CA-03 a CA-07), no un cálculo. Los parámetros se calibran con él.
- **D-10 Persistencia**: ninguna carrera en curso se guarda; no hay migración (del orquestador).

## Aclaraciones (ninguna bloquea el paso a plan)
- **A1** [NECESITA ACLARACIÓN: ¿"Normal" alterna 3 y 2 decisiones por temporada (default, D-02)? Si se prefiere un número fijo, cuál: con 3 normal queda igual a intensa; con 2, igual a exprés, y los tres modos pasan a ser dos.] No bloquea: el default es consistente con el pedido.
- **A2** [NECESITA ACLARACIÓN: ¿igualar los modos al promedio actual (default: intensa baja de 115 a 107,6 de media y de 231 a 206 de p90; Mundial 10,8 %; jugó afuera 12 %) o al nivel de intensa de hoy (la media global sube a 115, el Mundial a ~13,4 % y jugó afuera a ~20,7 %, y habría que reabrir los criterios de balance de las otras features)?] No bloquea: el pedido dice que normal y exprés cuesten menos, no que intensa cueste más, pero D-06 y el punto 3 del orquestador (balance global sin cambios) llevan al promedio.
- **A3** [NECESITA ACLARACIÓN: la carrera pasa de 2,5 a 7 min a 17 a 21 min (ver "Duración estimada"). ¿Se acepta? Alternativas, de menor a mayor cambio: (a) que el minijuego del resto de la carrera se pueda "simular todo" con un toque; (b) que "Exprés" tenga 1 decisión de ritmo por temporada y el minijuego automático (~10 min); (c) un cuarto ritmo, "Rápido", con 1 decisión y sin minijuego.] No bloquea: se implementa lo pedido.
- **A4** [NECESITA ACLARACIÓN: variedad. Con unas 67 decisiones por carrera y 103 plantillas repetibles, el 44 % (intensa), 40 % (normal) y 37 % (exprés) de las decisiones repite una plantilla ya vista en la carrera (hoy, 15 %, 11 % y 9 %); alargar el espaciado a 8 temporadas y limitar a 2 usos baja eso a ~25 %, pero en el prototipo rompió la equidad entre modos (el repertorio se agota antes en intensa y el motor tiene que relajar el espaciado). ¿Se agrega contenido (unas 50 plantillas nuevas o variantes de texto) o se acepta la repetición con el tope de 50 % de CA-08?] No bloquea: el tope de CA-08 es duro; la meta de 35 % necesita contenido.
- **A5** [NECESITA ACLARACIÓN: ¿proporción de categorías o tasas? Mantener las tasas (Mundial, jugó afuera, ofertas, bodas) y la proporción de cada categoría a la vez no es posible con el mismo repertorio: las categorías de historia (amor, Selección, extranjero) bajan de proporción (amor de 10,8 % a ~4,7 %, Selección de 6,8 % a ~2,9 %) porque su frecuencia es por temporada y hay unas 5 veces más decisiones. Default: se mantienen las tasas y la proporción baja (CA-12 pone el piso en la mitad). Subir la proporción de amor al nivel de hoy lleva las bodas de ~7 % de las carreras (hoy 3,8 %) a ~15 %.] No bloquea.
- **A6** [NECESITA ACLARACIÓN: ¿se acepta que cada decisión de ritmo pese 1/6 a 1/4 de lo de hoy (muchas decisiones muestran "+1 Fama" o un solo chip) y que el minijuego sea casi cosmético en el puntaje (efecto esperado de 1 punto por carrera)? Es la consecuencia inevitable de tener unas 5 veces más decisiones y unas 17 veces más minijuegos con el balance fijo. La alternativa es subir los efectos y aceptar que el puntaje medio y el Mundial suban (se rompe RF-19).] No bloquea: default según RF-15 y RF-13.
- **A7** [NECESITA ACLARACIÓN: ¿el minijuego empieza a los 18 años (default, igual que hoy: edad 18 y 2 temporadas jugadas) o también en las temporadas de 16 y 17?] No bloquea.
- **A8** [NECESITA ACLARACIÓN: ¿la oferta de cambio de Selección (ascendencia o naturalización) sigue siendo "una oferta cuando se puede" con una probabilidad por temporada calibrada para mantener el 0,8 % de cambios (default), o se quiere que sea más visible?] No bloquea.

## Aclaraciones resueltas
Del usuario y del orquestador, antes de implementar. Cada una cierra la aclaración del mismo número de arriba.
1. **A1, Normal:** alterna 3 y 2 decisiones por temporada (empieza en 3).
2. **A2, nivel de igualación:** el promedio actual (default). Jugando bien, todos los modos llegan a unos 132 de media; el balance de premios, Mundial y dinero se mantiene.
3. **A3, duración:** el usuario **acepta 17 a 21 minutos** por carrera. No hay atajos de "simular el resto".
4. **A4, variedad:** se agrega contenido (unas 50 decisiones y variantes más 20 situaciones de minijuego, en `variedad.ts` y `minijuegos-extra.ts`). El criterio de repetición (CA-08) se mide con el contenido integrado.
5. **A5, tasas contra proporción:** se mantienen las **tasas**. La perilla `PESO_CATEGORIA` acerca las proporciones de las categorías de ritmo (cancha, vida, medios, formación); amor y Selección quedan sobre el piso de 40 % de su proporción de hoy (CA-12) y no más.
6. **A6, pesos:** se acepta que cada decisión de ritmo pese de 1/6 a 1/4 de lo de hoy y que el minijuego sea casi cosmético en el puntaje (`ESCALA_MJ`; el ánimo que deja se ve más, `ESCALA_MJ_ANIMO`, porque no puntúa).
7. **A7, minijuego:** solo desde los 18 años.
8. **A8, cambio de Selección:** es una oferta por temporada (`P_NAC`), calibrada para mantener el 0,8 % de cambios.

Corrección que el spec advertía (RF-05): la temporada de la oferta de retiro también trae sus decisiones de ritmo. La oferta de retiro y la de traspaso son decisiones de historia que se suman a las de ritmo y van primero; quien elige "una temporada más" sigue con todas las de su temporada.

## Calibración (T6, con `variedad.ts` y `minijuegos-extra.ts` integrados)
Medida con `npx tsx scripts/ritmo.ts 20000` (20.000 carreras por modo con decisiones al azar, 8.000 con mejor opción y techo, las mismas carreras en los tres modos). Perillas finales (`AJUSTES` en `src/engine/ritmo.ts`): `ESCALA` 0,5 · `ESCALA_MJ` 0,03 · `ESCALA_MJ_ANIMO` 0,06 · `P_PASO` 1 · `P_ENTRADA` 0,04 · `P_ENTRADA_AMOR` 0,105 · `P_CONSECUENCIA` 0,01 · `P_OFERTA` 0,6 · `P_NAC` 0,25 · `PESO_CATEGORIA` cancha 0,2, vida 0,2, medios 0,45, formación 0,5, amor 0,2.

| | intensa | normal | exprés | hoy (media) |
|---|---|---|---|---|
| Puntaje al azar: media / p50 / p90 | 108,8 / 84 / 208 | 109,3 / 84 / 208 | 108,9 / 84 / 209 | 107,6 / 82 / 206 |
| Mejor opción: media / p50 / p90 | 130,8 / 98 / 263 | 131,9 / 101 / 269 | 132,5 / 99 / 267 | |
| Techo: media / p50 / p90 | 133,9 / 102 / 266 | 134,6 / 101 / 271 | 133,8 / 101 / 272 | |
| Mundial · jugó afuera · Selección mayor | 10,6 · 11,2 · 23,9 % | 10,7 · 11,1 · 23,9 % | 10,6 · 10,9 · 24,1 % | 10,8 · 12,0 · 21,7 % |
| Cambió de Selección | 0,94 % | 0,81 % | 0,88 % | 0,8 % |
| Ofertas de traspaso por carrera | 1,71 | 1,72 | 1,71 | 1,68 |
| Interacciones por carrera (decisiones + minijuegos) | 87,7 (69,7 + 18,0) | 78,0 (60,0 + 18,0) | 67,8 (49,8 + 18,0) | |
| Duración estimada | 21,4 min | 19,5 min | 17,4 min | |
| Decisiones con una plantilla ya vista en la carrera | 16,7 % | 13,8 % | 11,0 % | 15 / 11 / 9 % |

Resultados que el spec dejó como pregunta: el puntaje máximo de las tres políticas fue 838 (el límite del servidor, 1.200, deja 43 % de margen); el minijuego aporta 0,51 puntos por carrera con "Simular" y el techo sube 2,4 sobre mejor opción; el 49 % de los minijuegos y el 86 % de las decisiones de ritmo muestran algún cambio; el espaciado no se relajó en ninguna decisión.

Proporción de categorías contra hoy (sin traspaso, retiro ni minijuego): amor 4,4 % (10,8), cancha 13,8 % (13,4), contrato 12,9 % (9,7), ascenso 19,3 % (18,7), extranjero 2,4 % (3,4), formación 6,8 % (3,8), medios 23,0 % (21,4), Selección 3,2 % (6,8), vida 14,2 % (11,9). `PESO_CATEGORIA` acerca las categorías de ritmo (todas a 4 puntos o menos de hoy); amor queda apenas sobre su piso de 40 % (4,3 %) y Selección sobre el suyo (2,7 %): A5, se mantienen las tasas. Amor lleva 2,4 a 2,5 eventos por carrera (máximo 12).

Rutas (arranca / finalización, media de los tres modos; hoy): extranjero 30,8 % / 7,1 % (13,8 / 1); prelista → debut 8,7 / 59,3 % (5,4 / 40); eliminatoria 23,2 / 50,6 % (17,1 / 12); Sub-20 9,8 / 8,7 % (6,4 / 4); cita → compromiso 51,0 / 38,4 % (24,6 / 41); compromiso → boda 25,4 / 44,4 % (10,9 / 31); hija del técnico 30,9 / 25,0 % (13,9 / 19); pareja de un compañero 30,3 / 47,8 % (14,4 / 42). **Cita → compromiso en intensa queda en 37,0 %, a una décima del piso (90 % de 41 = 36,9 %)**, y compromiso → boda arranca en 24,5 a 26,0 % contra un tope de 27,3 %: subir amor para ganar margen en uno rompe el otro (riesgo 1).

Pendiente de contenido (no son de la calibración): las 12 situaciones de `minijuegos.ts` todavía no traen 2 variantes de texto (RF-11); las 20 de `minijuegos-extra.ts` sí.

## Cambios a specs anteriores
- **minijuegos** (`specs/minijuegos`): RF-13 (máximo 3 por carrera, nunca en dos decisiones seguidas, media de 1,0 a 1,2 en normal) y CA-2 (frecuencia y pisos de categoría) quedan reemplazados por RF-09 a RF-13 de esta spec; "cada plantilla sale una sola vez por carrera" y el empuje por edad desaparecen; se agregan al menos 12 situaciones (el plan propone 20) y variantes de texto. CA-8 (puntaje medio entre 104,4 y 110,8; veredictos a 2 puntos) **sigue valiendo** y es el ancla de CA-05.
- **vida-sentimental**: CA-7 ("de 1,0 a 3,0 eventos por carrera en intensa", "ninguna carrera con más de 8", tope de 15 %) pasa a "de 1,0 a 3,0 en cada modo, máximo 14, 15 % o menos de las decisiones" (CA-12). Los pasos de las rutas siguen cerrándose; el chequeo de rutas abiertas (menos de 2 %) sigue.
- **tienda**: D-09 y el plan RF-13 a RF-15 hablan de "en ritmo exprés un bloque son 3 temporadas": ya no hay bloques; la reserva de una temporada y el cobro por temporada se mantienen. La línea base de CA-10 (con y sin tienda) se recalcula con el motor nuevo; los topes (+5 % de puntaje medio, etc.) son los mismos.
- **mercado-contratos**: las ofertas de traspaso son por temporada (RF-14); las ofertas por carrera se mantienen (1,68 ±10 %). CA-6 (contrato de 1 a 4 años en cada decisión, contrato nuevo tras cada cambio) no cambia.
- **trofeos-reales**: CA-4 (puntaje medio 105,1 a 111,5, veredictos a 2 puntos, límite del servidor con 25 % de margen) no cambia de criterio; el máximo medido se vuelve a calcular. **CA-5 (la huella de las temporadas sin premios)** se rompe a propósito porque cambian las temporadas simuladas: se recalcula con el motor nuevo y se anota el valor nuevo; sigue valiendo que dos corridas de la misma semilla den los mismos premios.
- **doble-nacionalidad**: "la ventana dura un par de bloques" pasa a "un par de temporadas"; la oferta se mide por temporada (A8). El criterio de "ascendencia 22-28 %" no cambia (no depende de las decisiones).
- **retos-futbol, resultados-en-vivo, home-landing, términos, donación, eliminatorias-selecciones**: sin cambios.
