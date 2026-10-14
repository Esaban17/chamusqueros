# Eliminatorias de selecciones y celebración de trofeos

## Problema y valor
En la sección de Selección de cada temporada, el Mundial solo muestra 3 partidos de grupo; la copa continental y la Liga de Naciones, solo el grupo.
El jugador nunca sabe si pasó a octavos, llegó a la final o fue campeón, y ganar un torneo de selección (el mayor sueño del juego) no existe.
Valor: que la carrera con la Selección tenga desenlace y que un título mundial o continental se sienta como el gran momento.

## Alcance
- Fase final por partido único para el Mundial, la copa continental y la Liga de Naciones.
- Ser campeón cuenta como título (palmarés, resumen, ranking) y deja un hito.
- Mostrar la fase final ronda por ronda con un cierre claro.
- Celebración visual al ver una temporada con trofeo de selección.

## Fuera de alcance
Eliminatorias mundialistas, amistosos, prórroga, cuadro completo del torneo (solo los partidos del jugador), divisiones de la Liga de Naciones, cambiar la probabilidad de clasificar al Mundial.

## Requisitos funcionales
- **RF-01** Mundial: pasa quien queda 1.º o 2.º del grupo, o 3.º con 4 puntos o más. Rondas: Dieciseisavos, Octavos, Cuartos, Semifinal y Final.
- **RF-02** Copa continental: según la nota del grupo, pasan los dos primeros a cuartos (Concacaf, Conmebol) o los dos primeros y los mejores terceros a octavos (el resto), hasta la final.
- **RF-03** Liga de Naciones: quien gana su grupo juega Semifinal y Final.
- **RF-04** Cada ronda es un partido; el empate se decide por penales y el resultado los muestra ("1-1 (4-3 pen.)"). Quien pierde queda eliminado.
- **RF-05** Los rivales salen del mismo conjunto del torneo, sin repetir a los del grupo ni entre rondas; los marcadores siguen el mismo modelo que la fase de grupos.
- **RF-06** Cada partido de fase final cuenta como partido con la Selección. Los goles del jugador dependen de su posición (un portero nunca anota) y no superan los de su Selección.
- **RF-07** Ser campeón agrega un hito ("Campeón del Mundial 2042 con España"), un título que cuenta como los de club en palmarés, resumen y ranking, y fama. Llegar a semifinales de una copa o del Mundial deja el hito "Semifinal de …" y 8 de fama.
- **RF-08** La pantalla de cada competencia muestra, bajo la tabla y "Tus partidos", cada ronda con su etiqueta y resultado, y un cierre: "Eliminado en <ronda>", "Eliminado en la fase de grupos", "Subcampeón" o "🏆 Campeón".
- **RF-09** Al revelar una temporada con trofeo de selección se lanzan confetti y globos con el nombre del trofeo, una sola vez; el Mundial más grande que el resto.
- **RF-10** Carreras guardadas antes de este cambio se muestran sin errores y sin fase final.

## Criterios de aceptación
- **CA-1** Dado un Mundial jugado, cuando la Selección es 1.ª, 2.ª o 3.ª con >= 4 pts, entonces hay entre 1 y 5 partidos de fase final con la etiqueta de ronda en orden, y el último es una derrota solo si el cierre dice eliminado o subcampeón. (RF-01, RF-04)
- **CA-2** Dada una copa continental de Concacaf o Conmebol, entonces la primera ronda es Cuartos; en las demás confederaciones, Octavos. (RF-02)
- **CA-3** Dada una Liga de Naciones, entonces hay fase final solo si la Selección fue 1.ª, y empieza en Semifinal. (RF-03)
- **CA-4** Dado un empate en fase final, entonces el resultado trae penales con un ganador y la derrota o victoria se decide por ellos. (RF-04)
- **CA-5** Dadas 5.000 carreras, ningún rival se repite dentro de un mismo torneo y ningún portero anota. (RF-05, RF-06)
- **CA-6** Dado un campeón, entonces el hito, el título en la temporada y el título en el palmarés existen una vez, y el total de partidos y goles del jugador sigue cuadrando con los listados. (RF-06, RF-07)
- **CA-7** Dadas selecciones fuertes (España, Argentina, Brasil), entonces ganan entre 10 % y 20 % de los Mundiales que juegan; Guatemala, menos de 1 %. La tasa de clasificación al Mundial no cambia. (RF-01, RF-07)
- **CA-8** Dada una carrera sin los datos nuevos, entonces la pantalla se ve igual que antes. (RF-10)
- **CA-9** Dada una temporada con trofeo, cuando se muestra por primera vez, entonces la celebración aparece, no bloquea los clics, desaparece sola en menos de 12 s y no se repite al volver al historial; con movimiento reducido no hay animación. (RF-09)
- **CA-10** Dado un campeón, el puntaje y los títulos que se envían al ranking siguen dentro de los límites que acepta el servidor. (RF-07)

## Decisiones (defaults razonables)
- Mejor tercero: 3.º con 4 puntos o más, sin comparar con otros grupos.
- Liga de Naciones: no hay divisiones; todo ganador de grupo juega la fase final.
- El jugador juega todos los partidos de fase final, como los 3 de grupo del Mundial.
- Un título de selección vale lo mismo que uno de club en el puntaje.

## Aclaraciones abiertas (no bloquean)
- [NECESITA ACLARACIÓN: ¿el Mundial debería pesar más que un título de club en el puntaje? Hoy suma 10 + fama; se reporta cuánto cambia el ranking.]
