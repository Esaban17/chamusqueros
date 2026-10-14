# Plan: vida sentimental

Stack: el del repo (TypeScript vanilla, Vite). Sin dependencias nuevas, sin cambios en el motor (`drawEvent`, `applyEffects`) ni en el modelo `Player`.
Todo vive en un archivo nuevo de eventos, `src/engine/events/amor.ts`, más líneas sueltas en archivos compartidos (ver "Archivos").

## Cómo funciona hoy (lo que el plan usa)
- Un evento es un `EventTemplate`: `when`, `weight`, `once`, `cooldown`, `options`. `drawEvent()` (`engine.ts`) filtra por `when` y cooldown (4 bloques por defecto), y si hay pasos con `weight` numérico >= 3 los prefiere el 70 % de las veces y los pondera x3. Los pesos dados como función nunca cuentan como ruta.
- Variedad: cada categoría repetida entre las últimas 3 escenas pesa x0,4 (una) o x0,15 (dos). Las rutas se saltan esa regla.
- Mientras hay un paso de ruta disponible, la oferta de otro club baja a 30 % de su chance (`offerChance`). Las rutas de amor lo comparten: se mide (CA-7).
- `Effects.flag` pone la bandera en 1; `unflag` la borra, **después** de poner las banderas (nunca en la misma lista). `milestone` agrega " (año)" al texto: "Se casó (2031)".
- Cualquier `transfer` deja `coach` en 50 y descarta el `coach` del mismo desenlace. En los desenlaces con salida del club, la baja de `coach` del spec (RF-06) no se ve; lo que cuenta es el cambio de club.
- Cada temporada el ánimo vuelve 25 % hacia 60 y `coach` 30 % hacia 55. Por eso un golpe de ánimo es "de una temporada" sin código extra (RF-07).
- La pantalla usa `esc()` en título, texto, opciones, desenlaces y hitos. El rótulo de la categoría sale de `CATEGORY_LABEL` en `main.ts` (sin entrada, la etiqueta queda vacía).
- El ranking recibe nombre, puntaje, títulos, partidos y tarjeta. Las banderas no viajan al servidor.

## Archivos
| Archivo | Cambio |
|---|---|
| `src/engine/events/amor.ts` (nuevo) | `AMOR_EVENTS`, constantes de banderas y ayudas de estado (exporta `PAREJA` y `RUTAS` para `simulate`). |
| `src/engine/events/index.ts` | una importación y `...AMOR_EVENTS` en `ALL_EVENTS`. |
| `src/engine/types.ts` | `'amor'` en `EventCategory` (una línea). |
| `src/main.ts` | `amor: 'Vida sentimental'` en `CATEGORY_LABEL` (una línea de datos; sin pantalla nueva). |
| `src/engine/events/base.ts` | `farandula.when` suma `&& !has(p, 'amor_comprometido') && !has(p, 'amor_casado')` (RF-13). |
| `scripts/simulate.ts` | chequeos y conteos de amor (ver "Pruebas"). |

`engine.ts` no se toca. Si la medición pide frenar o impulsar la categoría, la perilla es la constante `PESO` de `amor.ts` (multiplica los pesos de entrada). Solo si no alcanza, una línea `if (e.category === 'amor') w *= k` en `drawEvent`, que se coordina con la rama de mercado.

## Estado sentimental: banderas (D-03)
| Bandera | Significa | La pone | La borra |
|---|---|---|---|
| `amor_novia` | noviazgo | cita, hija (paso 3 bueno), famosa (paso 1) | compromiso, toda ruptura |
| `amor_comprometido` | compromiso | compromiso | boda, toda ruptura |
| `amor_casado` | casado | boda | separación en la tentación (RF-10) |
| `amor_ya_casado` | ya se casó una vez en la carrera (permanente; no es estado) | boda | nunca |
| `amor_famosa` | la pareja es famosa (con `amor_novia`) | famosa (paso 1) | toda ruptura |
| `amor_hija` | falta el paso 2 de la hija | hija paso 1 | hija paso 2 |
| `amor_hija_2` | falta el paso 3 de la hija | hija paso 2 | hija paso 3 |
| `amor_hija_publica` | la hizo pública (cambia el texto y las chances del paso 3) | hija paso 2 | hija paso 3 |
| `amor_traicion` | falta el paso 2 del compañero | compañero paso 1 (seguir la corriente) | compañero paso 2 |

Ayudas en `amor.ts`:
- `PAREJA = ['amor_novia', 'amor_comprometido', 'amor_casado']` y `RUTAS = ['amor_hija', 'amor_hija_2', 'amor_hija_publica', 'amor_traicion']`.
- `conPareja(p)`, `soltero(p)` (sin `PAREJA` ni `RUTAS`), `adulto(p)` (`p.age >= 18`), `FIN = [...PAREJA, 'amor_famosa']`.
- Toda ruptura usa `unflag: FIN`. Toda transición borra el estado anterior y no repite banderas en `flag` y `unflag`.
- Ninguna carrera guarda banderas viejas con otro significado: las carreras sin `amor_*` son solteras.

## Eventos (13 plantillas, todas `category: 'amor'`, `adulto(p)` en todos los `when`)
Los textos usan `ctx.club.name`, `ctx.club.city`, `ctx.country.name` y los ayudantes `de()` y `cap()`; nunca nombres que escribe el usuario ni palabras de Guatemala fuera de un `ctx.country.code === 'GT'`.

| id | Cuándo (`when`) | Peso | Reparto |
|---|---|---|---|
| `amor_cita` | `soltero`, 18 a 32 años | `1.2 * PESO`, cooldown 6 | Aceptar: noviazgo (~60 %, ánimo +10) o no hubo química (ánimo +1). Esperar: sin cambio, nivel +1 por foco. |
| `amor_compromiso` | `amor_novia`, 21+, sin `amor_ya_casado` | 3 (paso de ruta; con `1.5 * PESO` solo 1 de cada 3 noviazgos llegaba al compromiso), cooldown 6 | Pedir matrimonio: comprometido (~80 %, hito "Se comprometió", ánimo +10) o "necesita tiempo" (ánimo -4). Esperar: 30 % ruptura (`FIN`, ánimo -12). |
| `amor_boda` | `amor_comprometido`, sin `amor_ya_casado` | 3 (paso de ruta) | Boda grande o íntima: casado, hito "Se casó", ánimo +10 a +14, fama +4 en la grande. Todas las opciones terminan en casado (RF-07: la boda lleva a casado; sin boda cancelada). No hay "después". Pone `amor_ya_casado`, que impide otro compromiso o boda (RF-07: una sola vez), y nunca deja un comprometido sin paso siguiente. |
| `amor_crisis` | `amor_novia` o `amor_comprometido` | `1.2 * PESO`, cooldown 8 | Hablar: sigue (ánimo +4) o ruptura (ánimo -14, nivel -1 en el peor caso). Dar espacio: 50 % ruptura. |
| `amor_hija_1` | `soltero`, 19 a 31 años | `0.8 * PESO`, `once` | Invitarla a salir: bandera `amor_hija` (ánimo +6). Distancia profesional: `coach` +3 a +5, ruta cerrada. |
| `amor_hija_2` | `amor_hija` | 3, `once` | Seguir a escondidas, hacerlo público (`amor_hija_publica`) o terminarlo (borra `amor_hija`, ruta cerrada). Los dos primeros ponen `amor_hija_2` y borran `amor_hija`. |
| `amor_hija_3` | `amor_hija_2` | 3, `once` | Dar la cara: ~55 % (70 % si es pública) `coach` +10, noviazgo; si no, `coach` -14. Negarlo todo: 30 % pasa sin cambios; 70 % `coach` -16, ánimo -10, fama -3. Dejar que ella hable: 40 % `coach` +8; 60 % `coach` -12. Todo desenlace borra `amor_hija_2` y `amor_hija_publica`. Nunca `transfer`. |
| `amor_companero_1` | `soltero`, 19 a 31 años | `0.8 * PESO`, `once` | Rechazar: un desenlace, ánimo +6, `coach` +3, ruta cerrada. Seguirle la corriente: bandera `amor_traicion`, ánimo +2 ahora. |
| `amor_companero_2` | `amor_traicion` | 3, `once` | Dar la cara y pedir disculpas: 75 % discusión en el vestuario (`coach` -6, ánimo -8) sin salida; 25 % salida (`transfer: 'any'`). Negarlo todo: 50 % se descubre, escándalo (fama -6, ánimo -10) y salida (`transfer: 'down'`); 50 % "te creen a medias" (`coach` -3, ánimo -4). Que el técnico medie: 75 % `coach` -6 y ánimo -6; 25 % salida (`transfer: 'any'`). Con opciones al azar la salida ronda el 33 % (CA-5). Todo desenlace borra `amor_traicion`. |
| `amor_famosa_1` | `soltero`, fama >= 20, 19 a 32 años | `(fama >= 40 ? 1.5 : 0.7) * PESO`, `once` | Aceptar: `amor_novia` + `amor_famosa`, fama +8 a +12, nivel -1 o forma -6 (distracción). Rechazar: ánimo +2. |
| `amor_famosa_2` | `amor_famosa` | 3, `once` | Posar: fama +6, ánimo +4. Pedir privacidad: fama +1, ánimo +2. Terminar: `FIN`, ánimo -8. Los paparazzi "te persiguen" en cualquier desenlace del texto, sin dinero. |
| `amor_distancia` | `conPareja`, `ctx.abroad` | 3 (paso de ruta; con 2 casi nunca salía), `once` | Que se vaya conmigo: ánimo +8, sin cambio de estado. Larga distancia: 50 % sigue (ánimo -2), 50 % ruptura. Terminar: `FIN`, ánimo -8. |
| `amor_foto` | `conPareja`, fama >= 15, 19+ | `1 * PESO`, cooldown 8 | Resistir: ánimo +5 sin costo. Ceder: >= 50 % ruptura (`FIN`, fama -5, ánimo -14); si no, ánimo -3 por culpa. Todo desenlace de "ceder" tiene algo en negativo. |

Notas de diseño:
- Pasos de ruta (peso 3) dependen solo de su bandera, no de edad ni club (RF-12). Se cierran con `once` y con el borrado de su bandera.
- Los eventos de entrada se separan por `soltero(p)`: con pareja o con una ruta abierta no aparecen (RF-03).
- El compañero del paso 1 y la pareja de la hija son adultos por texto (trabajo, ocupación); no se nombran personas.
- No hay efectos de dinero ni `transferTo` fijo: la salida usa `transfer: 'any'` en todos los casos (`down` devuelve null cuando no hay clubes de menor nivel, y desde el extranjero busca en el país de origen).
- `peso(w)` en `amor.ts` multiplica por `PESO` y topa en 2,9: el motor trata todo peso numérico >= 3 como ruta, y subir `PESO` convertía en ruta a la crisis y a la tentación.
- `amor_hija_1` tiene 15 % de "ella prefiere no mezclar trabajo y vida personal": un no cierra la ruta (RS-05).
- Los desenlaces y números de la tabla son el punto de partida; se ajustan con `simulate` sin cambiar los límites del spec.

## Cómo cubre cada RF
| RF | Dónde |
|---|---|
| RF-01 | Transiciones de la tabla de banderas; todo `flag` de estado borra el anterior; `amor_famosa` solo la pone la cita famosa junto a `amor_novia` y `FIN` la borra. |
| RF-02 | `adulto(p)` en cada `when`; los retirados no reciben decisiones. |
| RF-03 | `soltero(p)` en `amor_cita`, `amor_hija_1`, `amor_companero_1`, `amor_famosa_1`. |
| RF-04 | Convención al escribir cada evento; se verifica en `simulate` (CA-12). |
| RF-05 | `amor_hija_1`, `_2`, `_3`. |
| RF-06 | `amor_companero_1`, `_2`. |
| RF-07 | `amor_cita`, `amor_compromiso`, `amor_boda`, `amor_crisis`. |
| RF-08 | `amor_famosa_1`, `_2`. |
| RF-09 | `amor_distancia`. |
| RF-10 | `amor_foto`. |
| RF-11 | `milestone` solo en `amor_compromiso` ("Se comprometió") y `amor_boda` ("Se casó"). No se agrega nada a `bestMoment`; ninguno coincide con sus expresiones. |
| RF-12 | Pasos de ruta con `once`, borrado de banderas y `when` solo de estado. |
| RF-13 | Una línea en `base.ts`. |
| RF-14 | Texto sin Guatemala; `de()` en lugar de "de el"; chequeo existente de `simulate`. |
| RF-15 | `PESO`, edades y `once` de las entradas; medición en `simulate`. |
| RS-01 a RS-07 | Lectura de cada texto con la lista de la sección "Contenido sensible" del spec + búsqueda automática en `simulate`. |

## Frecuencia (D-05)
- Referencia con `c04dd00` y 1.500 carreras: 20,9 / 11,2 / 7,8 decisiones por carrera (intensa, normal, exprés); `vida` 11 % de las decisiones.
- Mecanismos de freno: eventos de entrada con peso menor a 1,5, `once` en las historias, `cooldown` en los repetibles, variedad por categoría (x0,4 y x0,15) y estados excluyentes. Hay 4 plantillas de entrada y solo con jugador soltero; las de pareja aparecen solo con pareja.
- Se mide con `npm run simulate -- 5000`: línea nueva "Amor: promedio por carrera en cada ritmo, % de carreras con alguno, máximo y % de decisiones", más la línea existente de "Categorías" y "Nunca salieron". Si exprés no cabe entre 1,0 y 3,0 con el tope del 15 %, se baja `PESO` y se reporta (aclaración abierta 1).
- Calibrar en este orden: `PESO` (todas las entradas), luego el peso individual, luego la ventana de edad.

## Seguridad (OWASP Top 10)
- **A03 Inyección/XSS**: todo el contenido es estático del motor; los textos pasan por el render existente con `esc()` (título, texto, opciones, desenlaces, hitos). Ningún texto interpola nombres que escribe el usuario.
- **A06**: cero dependencias nuevas.
- **A08 Integridad**: las banderas viven en el estado de la partida y no viajan al servidor. Una bandera `amor_*` editada a mano en el almacenamiento local solo cambia qué decisiones salen; el código las lee solo como presente o ausente. Carreras guardadas sin banderas de amor son solteras.
- **A04 Diseño**: la fama que suman estos eventos es acotada (< 50 en total por carrera) y no toca títulos; se verifica el "Máximos" de `simulate` (CA-13).
- A01, A02, A05, A07, A09, A10: no aplican (no cambia acceso, configuración, autenticación, registros ni peticiones).

## Pruebas (`scripts/simulate.ts`)
Todo lo nuevo termina en `process.exitCode = 1` al fallar, como los chequeos actuales.
1. Estado (CA-1, CA-2): después de cada decisión, a lo sumo una bandera de `PAREJA`; `amor_famosa` implica pareja; un evento `amor_cita`, `amor_hija_1`, `amor_companero_1` o `amor_famosa_1` solo sale con jugador soltero; ningún evento de amor con `p.age < 18`.
2. Rutas (CA-3): al terminar cada carrera, contar banderas de `RUTAS` abiertas; reportar el %.
3. Compañero (CA-5): % de veces que cambia el `clubId` al resolver `amor_companero_2`.
4. Hitos (CA-6): una sola "Se casó"; `amor_casado` implica ese hito; "Se comprometió" va antes.
5. `farandula` (CA-10): nunca con `amor_comprometido` o `amor_casado`.
6. Formato (CA-12): 2 o más opciones y probabilidades que suman 1 en cada evento de amor emitido.
7. Frecuencia (CA-7), cobertura (CA-8) y puntaje (CA-13): líneas descritas arriba y las existentes.
8. Textos de otros países (CA-9): el chequeo `GT_LEAK` existente ya pasa por cada texto de evento.
9. Tono (CA-11, RS-01 a RS-04): a cada texto de un evento `amor` se le aplica una lista de términos prohibidos (sexo, desnudez, golpes, amenazas, menores, estereotipos) definida en `simulate.ts` junto a `KEEPER_GOAL`. Es apoyo, no reemplazo: la lectura de RS-07 es obligatoria.
Además `npm run build` y una captura de pantalla de un evento con el rótulo "Vida sentimental" (sin nueva UI).

## Riesgos
- **Cambio de club entre pasos de la hija**: el técnico del paso 3 puede no ser el del paso 1. Mitigación: los pasos 2 y 3 dicen "el técnico" sin club. `simulate` cuenta cuántas veces cambió el club entre los pasos 1 y 3; si pasa del 5 %, se agrega una línea en `applyEffects` que borra las banderas de la hija al cambiar de club, coordinada con la rama de mercado.
- **Rutas de amor y ofertas de club**: los pasos de ruta bajan la chance de oferta a 30 % mientras duran (3 pasos como máximo). Se vigila el porcentaje de `contrato` (CA-7).
- **Fusión con ramas paralelas** (mercado y nacionalidad): las líneas compartidas son una unión de tipos, una entrada de rótulo, una importación y una condición; los choques serían de una línea. Sin cambios en `drawEvent`, `transferOffer`, `statsBar`, `simulateNationalTeam` ni eventos de Selección.
- **Coherencia con lo existente**: `med_gol_grande` conserva el chiste "A mi novia… y a la otra" para menores de 24 años, sin estado; se acepta porque es un chiste de un solo uso y no afirma una pareja. Se deja aparte de esta feature.
- **Tono**: el riesgo mayor es de redacción. Las reglas se leen antes de cerrar (T12).
- **Sin divorcio**: el casado solo se puede separar por infidelidad (RF-10). No hay divorcio como ruta (fuera de alcance).
