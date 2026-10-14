# Vida sentimental: situaciones de amor, celos y escándalo

## Problema y valor
Las decisiones del juego cubren cancha, medios, contratos y Selección, pero la vida sentimental casi no existe: el único evento del tema (`farandula`, "tu nueva relación") da por hecha una pareja que ninguna decisión creó, y un chiste de `med_gol_grande` ("A mi novia… y a la otra") no tiene consecuencias.
El usuario pidió "situaciones sentimentales, como meterte con la hija del entrenador, la novia de un compañero o cosas así".
Valor: historias de telenovela futbolera, con humor, donde lo que decidís en el amor pega en la carrera (relación con el técnico, ánimo, fama, hasta el club) y la pareja deja huella (hitos como "Se casó (2031)").

## Usuarios
La persona que juega una carrera (jugador de 18 años o más cuando aparecen estos eventos). Sin cuentas ni datos nuevos.

## Alcance
- Una categoría nueva de decisiones, `amor`, con 6 situaciones (RF-05 a RF-10).
- Un estado sentimental coherente durante la carrera: soltero, noviazgo, comprometido, casado (RF-01 a RF-04).
- Hitos de compromiso y boda en el resumen de carrera.
- Reglas de contenido sensible verificables (sección propia).

## Fuera de alcance
- Efectos con dinero y contratos (otra rama los agrega). Ningún evento de amor toca dinero.
- Hijos, familia extendida, suegros como personajes recurrentes.
- Pantallas nuevas: se usa la pantalla de decisiones existente. Solo se agrega el rótulo de la categoría.
- Cambiar el modelo de género: el jugador sigue siendo masculino por defecto en los textos.
- Mostrar el estado sentimental en la ficha, en la tarjeta o en el ranking.
- Divorcio como ruta propia, pareja del mismo país como dato, nombres propios de la pareja.

## Decisiones
- **D-01 Tono.** Telenovela futbolera con humor, voseo del juego, apto para todo público (PG-13): coqueteo, citas, celos, escándalos de prensa. Nada explícito ni sexual, nada de violencia, nada que involucre menores, sin estereotipos ofensivos. Se concreta en la sección "Contenido sensible".
- **D-02 Categoría.** Categoría propia `amor`, no dentro de `vida`. Razones: (a) `simulate` ya reporta el porcentaje por categoría, así que la frecuencia se mide sin código nuevo; (b) la variedad por categoría de `drawEvent` evita que dos escenas de amor se pongan seguidas sin que estos eventos le quiten turnos a `vida` (hoy 11 % de las decisiones); (c) el peso se calibra en el archivo nuevo, sin tocar `drawEvent`. Costo: una línea en la unión `EventCategory` y una en el rótulo de la pantalla.
- **D-03 Estado con banderas.** El estado sentimental vive en `p.flags` con prefijo `amor_`. Sin campos nuevos en `Player`. El detalle de banderas está en el plan.
- **D-04 Género.** Textos en masculino para el jugador, como el resto del juego. La pareja se nombra "tu novia" o "tu pareja"; no se agrega elección de género.
- **D-05 Frecuencia.** Entre 1 y 3 eventos de amor por carrera en promedio (carrera de unas 18 a 21 temporadas), sin dominar. Se mide con `simulate` (CA-7).
- **D-06 País.** Ningún texto asume Guatemala; lo propio de un país va detrás de `ctx.country.code === 'GT'` o sale de `ctx.country`, como los eventos existentes.
- **D-07 Una sola historia a la vez.** Mientras haya una ruta de amor abierta o una pareja, no arranca otra historia de conquista.
- **D-08 "Pleito" es verbal.** En el vestuario hay discusión, silencios y comunicados, nunca golpes.

## Estado sentimental
Cuatro estados excluyentes: **soltero** (por defecto), **noviazgo**, **comprometido**, **casado**.
Transiciones permitidas: soltero → noviazgo → comprometido → casado, y desde cualquier estado con pareja de vuelta a soltero (ruptura). No hay salto soltero → comprometido ni casado → noviazgo.
Una **pareja famosa** es un noviazgo con una marca adicional; vale mientras la pareja siga.
Las historias en curso (hija del entrenador, novia de un compañero) son pasos pendientes mientras el jugador sigue soltero.

## Requisitos funcionales

### Estado y coherencia
- **RF-01** El jugador nunca está en dos estados sentimentales a la vez, y la marca de pareja famosa nunca existe sin pareja.
- **RF-02** Ningún evento de amor aparece con un jugador menor de 18 años ni después de retirarse.
- **RF-03** Los eventos de conquista (primera cita, hija del entrenador, novia de un compañero, famosa o influencer) solo aparecen si el jugador está soltero y no tiene otra historia de amor abierta. Un jugador con noviazgo, compromiso o matrimonio nunca recibe "primera cita".
- **RF-04** Todo evento de amor se muestra con 2 o más opciones, y las probabilidades de los desenlaces de cada opción suman 1.

### Situaciones
- **RF-05 La hija del entrenador.** Ruta de 3 pasos, con ocupación adulta explícita para ella (por ejemplo trabaja en el club).
  - Paso 1: se puede invitarla a salir o mantener distancia profesional. Mantener distancia cierra la ruta sin consecuencias malas y con `coach` +3 o más.
  - Paso 2 (si invitó): se puede seguir a escondidas, hacerlo público o terminarlo. Terminarlo cierra la ruta sin cambio de estado.
  - Paso 3 (si no terminó): el técnico se entera. El desenlace depende de lo elegido en el paso 2. Entre los desenlaces hay al menos uno con `coach` +8 o más y estado noviazgo, y al menos uno con `coach` -12 o menos. Ninguno cambia el club.
- **RF-06 La novia de un compañero.** Ruta de 1 o 2 pasos.
  - Paso 1: rechazar o seguirle la corriente. Rechazar tiene un solo desenlace, con ánimo +4 o más y `coach` +2 o más (respeto del vestuario), y cierra la ruta.
  - Paso 2 (solo si le siguió la corriente): el compañero se entera. Los desenlaces incluyen discusión en el vestuario (`coach` -6 o menos y ánimo -8 o menos), escándalo en medios (fama -4 o menos) y salida del club. La salida (a un club de nivel parecido o menor) ocurre entre 20 % y 40 % de las veces en ese paso, eligiendo opciones al azar. Ningún desenlace deja al jugador con pareja.
- **RF-07 Relación estable.** Cuatro eventos.
  - *Primera cita* (soltero): al menos un desenlace lleva a noviazgo, con ánimo +8 o más.
  - *Compromiso* (solo con noviazgo): pedir matrimonio lleva a comprometido, con hito de compromiso; esperar puede terminar la relación.
  - *Boda* (solo comprometido): lleva a casado, ánimo +10 o más y hito "Se casó". Se puede casar una sola vez por carrera.
  - *Crisis de pareja* (solo noviazgo o comprometido): la ruptura lleva a soltero, con ánimo -12 o menos, nivel -1 como máximo y sin efectos permanentes mayores; el ánimo se normaliza solo con las temporadas.
  - Estar casado es estabilidad: un casado no recibe "primera cita" ni "crisis de pareja".
- **RF-08 Famosa o influencer.** Solo con fama alta y soltero.
  - Paso 1: aceptar lleva a noviazgo con pareja famosa. Un desenlace sube la fama +8 o más y distrae (ánimo, forma o nivel bajan). Rechazar cierra la ruta.
  - Paso 2: los paparazzi. Se puede posar, pedir privacidad o terminar. Entre los desenlaces hay uno con fama +6 o más y otro que termina la relación.
- **RF-09 Distancia.** Si el jugador juega fuera de su país y tiene pareja (cualquier estado), aparece una vez por carrera la decisión: que ella se vaya con él, larga distancia o terminar. Terminar lleva a soltero; larga distancia puede terminar la relación; irse juntos sube el ánimo y no cambia el estado.
- **RF-10 La tentación y la foto filtrada.** Con pareja (cualquier estado), una decisión de infidelidad: resistir o ceder. Resistir no tiene costo y suma ánimo. Ceder nunca sale gratis: todo desenlace tiene ánimo, fama o `coach` en negativo, y al menos la mitad de la probabilidad termina la relación (soltero), con escándalo de fama -4 o menos.

### Hitos y consistencia con lo existente
- **RF-11** Compromiso y boda dejan hito con el año (formato del motor: "Se casó (2031)"). Ninguna otra situación deja hito. Los hitos no cambian el "momento destacado" de la carrera.
- **RF-12** Las historias no quedan colgadas: cada paso de una ruta tiene desenlaces que avanzan al siguiente paso o la cierran, y la condición de cada paso depende solo del estado, no de la edad ni del club. Una ruta solo queda abierta al terminar la carrera si el retiro llegó antes del siguiente paso.
- **RF-13** El evento `farandula` ("tu nueva relación") no aparece con un jugador comprometido o casado.
- **RF-14** Ningún texto de amor asume Guatemala ni rompe las contracciones ("del", "al") para otras nacionalidades.
- **RF-15** La frecuencia cumple D-05 sin quitarles turnos de forma notable a las demás categorías (CA-7).

## Contenido sensible
Reglas de tono (D-01) como requisitos que se verifican leyendo los textos (título, texto, etiquetas de opciones, desenlaces y hitos) y, donde se puede, con búsqueda automática.
- **RS-01 Nada explícito ni sexual.** Ningún texto describe actos sexuales, desnudez ni insinuaciones sexuales. El vocabulario se queda en coqueteo, citas, regalos, besos, celos, rumores y escándalos de prensa.
- **RS-02 Sin violencia.** Ningún texto tiene golpes, agresiones, amenazas, armas ni sangre. El "pleito" es discusión verbal (D-08).
- **RS-03 Sin menores.** Todo evento de amor exige jugador de 18 años o más (RF-02). Toda pareja descrita es explícitamente adulta (ocupación, mayoría de edad) y ningún texto menciona colegio, quinceañeras ni edades menores de 18.
- **RS-04 Sin estereotipos ofensivos.** Ninguna pareja se presenta como interesada, trofeo, rival ni objeto; cada una tiene ocupación y decisiones propias. El humor recae en el jugador y la situación, no en su género, físico, profesión, nacionalidad u orientación.
- **RS-05 Sin presión.** Ninguna opción consiste en insistir o presionar a alguien que dijo que no. Si hay un "no", la historia termina.
- **RS-06 Todo público.** Sin nombres reales de personas ni de clubes ridiculizados. Sin alcohol ni drogas como gracia.
- **RS-07 Revisión.** La búsqueda automática de términos prohibidos no basta: cada texto lo lee una persona con la lista de RS-01 a RS-06 antes de cerrar la feature.

## Criterios de aceptación
- **CA-1** Dadas 5.000 carreras con decisiones al azar, entonces nunca hay dos estados sentimentales a la vez, nunca hay pareja famosa sin pareja, y nunca se emite una conquista con jugador no soltero. (RF-01, RF-03)
- **CA-2** Dadas esas carreras, entonces ningún evento de amor aparece con edad menor de 18. (RF-02, RS-03)
- **CA-3** Dada una carrera con ruta de amor abierta, cuando termina antes de cerrarla, entonces es por retiro; menos del 2 % de las carreras terminan con una ruta abierta. (RF-12)
- **CA-4** Dada la lectura del paso 3 de la hija del entrenador, entonces existe un desenlace con `coach` +8 o más y noviazgo, y otro con `coach` -12 o menos, y ninguno cambia el club. (RF-05)
- **CA-5** Dado "rechazar" en la novia de un compañero, entonces el único desenlace suma ánimo +4 o más y `coach` +2 o más. Dado el paso 2 jugado con opciones al azar, entonces entre 20 % y 40 % de las veces el jugador cambia de club. (RF-06)
- **CA-6** Dadas 5.000 carreras, entonces ninguna tiene más de un hito "Se casó", y todo jugador casado tiene ese hito; el hito de compromiso va antes que el de boda. (RF-07, RF-11)
- **CA-7** Dadas 5.000 carreras (todas las nacionalidades y los tres ritmos), entonces el promedio de eventos de amor por carrera está entre 1,0 y 3,0 en cada ritmo; al menos el 70 % de las carreras ve uno; ninguna ve más de 8; la categoría `amor` suma 15 % o menos de las decisiones; y ninguna otra categoría baja más de 2,5 puntos porcentuales respecto a la medición base (contrato 21 %, medios 19 %, cancha 12 %, divisiones 12 %, retiro 11 %, vida 11 %, selección 7 %, extranjero 4 %, formación 3 %, con 1.500 carreras en `c04dd00`). (RF-15, D-05)
- **CA-8** Dadas las mismas 5.000 carreras, entonces ningún evento `amor_*` aparece en "Nunca salieron". (RF-03, RF-05 a RF-10)
- **CA-9** Dados los textos de amor de las carreras simuladas, entonces la comprobación de textos de otros países sigue sin encontrar nada de Guatemala. (RF-14)
- **CA-10** Dado un jugador comprometido o casado, entonces `farandula` no aparece en ninguna carrera simulada. (RF-13)
- **CA-11** Dados los textos emitidos de la categoría `amor`, entonces la búsqueda de términos de RS-01 a RS-04 no encuentra nada, y la lectura completa del revisor marca RS-01 a RS-06 como cumplidos. (RS-01 a RS-07)
- **CA-12** Dado un evento de amor cualquiera, entonces tiene 2 o más opciones y cada opción suma probabilidad 1. (RF-04)
- **CA-13** Dado el puntaje máximo de `simulate`, entonces sigue por debajo de 1.000. (los límites que acepta el servidor)

## Aclaraciones abiertas (no bloquean)
- [NECESITA ACLARACIÓN: ¿la media de 1 a 3 eventos por carrera debe valer también en modo exprés (unas 8 decisiones, o sea hasta 38 % de las decisiones con 3 eventos)? Default del spec: sí, entre 1,0 y 3,0 en cada ritmo, con tope de 15 % de las decisiones; si exprés no cabe en ambos límites, se calibra el peso con ese tope y se reporta.]
- [NECESITA ACLARACIÓN: ¿el estado sentimental debe verse fuera de la pantalla de decisiones (resumen final, tarjeta)? Default: no; solo hay hitos de compromiso y boda.]
- [NECESITA ACLARACIÓN: ¿quedan bien dos cambios mínimos en archivos compartidos, `EventCategory` en `types.ts` y el rótulo "Vida sentimental" en `CATEGORY_LABEL` de `main.ts`? Sin ellos la categoría no puede existir; la alternativa es meter los eventos en `vida` (D-02).]
- [NECESITA ACLARACIÓN: la historia del técnico puede quedar incoherente si el jugador cambia de club entre pasos (el técnico del paso 3 ya no es el del paso 1; ver riesgos del plan). Default: los textos de los pasos 2 y 3 dicen "el técnico" sin nombre de club.]

Ninguna es bloqueante.
