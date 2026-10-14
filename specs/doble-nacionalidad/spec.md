# Convocatoria de otro país por ascendencia o naturalización

## Problema y valor
Hoy la Selección de un jugador es siempre la de su nacionalidad de origen. Un guatemalteco que brilla en Estados Unidos o un argentino con abuelos italianos nunca puede cambiar de camiseta, algo muy común en el fútbol real.
El único rastro es un evento de texto ("Te ofrecen otra selección") sin consecuencias.
Valor: una decisión con peso en la carrera (cambiar de Selección, con sus Mundiales y torneos distintos) y más rejugabilidad: dos carreras del mismo jugador pueden terminar con camisetas distintas.

## Alcance
- Ascendencia oculta de otro país (por madre o por padre), asignada al iniciar la carrera y revelada por un evento cuando la federación de ese país lo busca.
- Oferta de naturalización tras 5 temporadas seguidas jugando en el mismo país extranjero.
- Regla de elegibilidad simplificada, inspirada en la regla FIFA de cambio de asociación.
- Decisión del jugador: aceptar (cambia de Selección) o rechazar (bonus con la afición de origen).
- La Selección que representa se separa de la nacionalidad de origen. Solo cambia la Selección; la liga de casa, la moneda y los textos de origen no.
- Reflejo en pantalla: bloque de Selección de cada temporada, carta de FC, resumen final, hito y ranking.

## Fuera de alcance
Elegir la ascendencia en el formulario de creación (posible mejora), cambiar más de una vez por carrera, volver a la Selección de origen, selecciones fuera de los 27 países jugables como destino, distinguir amistosos de partidos oficiales, dividir el palmarés de clubes por Selección, cambiar la liga o los clubes disponibles por haber cambiado de Selección, cambiar la nacionalidad que se elige en el formulario.

## Regla de elegibilidad (simplificación de la regla FIFA)
Un jugador puede cambiar de Selección si cumple una de estas dos:
1. No ha jugado ningún partido con la Selección mayor de su país de origen.
2. Jugó 3 o menos con ella, todos antes de los 21 años y ninguno en un torneo final (un Mundial o una copa continental).

Jugador "comprometido" es el que no cumple ninguna. A un comprometido no se le ofrece nada: la oferta no aparece. La FIFA real distingue amistosos de oficiales; aquí todos los partidos cuentan (más estricto), ver aclaraciones.

## Requisitos funcionales
- **RF-01** Al iniciar la carrera, con 25 % de probabilidad el jugador tiene ascendencia de otro de los 27 países, por la madre o por el padre (mitad y mitad). Nunca es su propio país de origen ni Guatemala. No se pregunta en el formulario y no se muestra en ninguna pantalla hasta que un evento la revela.
- **RF-02** Cada país de origen tiene una lista corta de países de ascendencia posibles, con más peso para las diásporas reales. Como mínimo: Guatemala con Estados Unidos, México, España y El Salvador; Argentina con Italia y España; Brasil con Italia, Portugal y Japón; Francia con Marruecos y Portugal; Países Bajos con Marruecos. Ninguna lista incluye pares sin vínculo migratorio creíble (por ejemplo Guatemala con Japón).
- **RF-03** Revelación por ascendencia: un evento que sale una sola vez cuando la federación del país de ascendencia lo busca. Solo sale si el jugador tiene entre 19 y 31 años, juega en primera división o en el extranjero, su nivel alcanza el mínimo de convocatoria de esa Selección (el mismo que ya se usa para ser convocado), es elegible (regla de arriba), no ha cambiado de Selección y no está a media eliminatoria mundialista con la Selección de origen. El texto nombra al país, a su federación y si es por la madre o por el padre.
- **RF-04** Naturalización: un evento que sale una sola vez por país cuando el jugador completó 5 temporadas seguidas o más en clubes del mismo país extranjero, contando solo temporadas en las que tenía 18 años o más al empezarla, y las últimas de su historial. Además, su nivel alcanza el mínimo de convocatoria de la Selección de ese país, es elegible, tiene entre 19 y 31 años, no ha cambiado de Selección y no está a media eliminatoria mundialista con la Selección de origen. Reemplaza al evento actual "Te ofrecen otra selección".
- **RF-05** Se cambia de Selección una sola vez por carrera. Si el jugador rechaza la oferta de un país, ese país no vuelve a ofrecerle nada (ni por ascendencia ni por naturalización).
- **RF-06** La oferta ofrece dos opciones: aceptar o rechazar. Rechazar deja al jugador con su Selección actual y le da un bonus de ánimo o de fama con la afición de su país de origen. Los textos siguen el tono de los eventos existentes.
- **RF-07** Aceptar cambia la Selección desde la siguiente temporada que se juega: su confederación, sus torneos (copa continental, eliminatoria, liga de naciones si la hay), sus rivales (la nueva Selección nunca es rival de sí misma), su fuerza, su mínimo de convocatoria y su probabilidad de ir al Mundial. El jugador conserva los partidos y goles previos con la Selección. Queda convocado con un nivel acorde a su nivel de juego frente al mínimo de la nueva Selección: fijo en la lista o convocado ocasional, nunca titular indiscutible ni sin convocar. El avance de la eliminatoria del ciclo y los eventos pendientes de la Selección anterior se reinician.
- **RF-08** Las temporadas ya jugadas conservan la Selección con la que se jugaron; solo las siguientes usan la nueva.
- **RF-09** Aceptar deja un hito en el historial: "Se nacionalizó en <país>" (naturalización) o "Eligió jugar para <país> por su madre" / "por su padre" (ascendencia).
- **RF-10** La liga de casa, los clubes disponibles, la moneda, la comida y demás textos de origen no cambian con la Selección. Los textos de Selección (apodo, federación, estadio, confederación, rivales de la copa) siguen a la Selección actual. Tras el cambio no salen eventos de Selecciones juveniles de la anterior.
- **RF-11** Pantalla: el bloque de Selección de cada temporada muestra la Selección de esa temporada (nombre, bandera, tabla y partidos); la carta de FC muestra la bandera de la Selección actual; el resumen final muestra sus colores y su gentilicio en el veredicto. Si el jugador cambió, el resumen agrega "Con cada Selección": partidos, goles y títulos con cada una.
- **RF-12** Ranking: la carta guardada trae el código de la Selección actual (hoy trae la nacionalidad de origen). El servidor solo acepta uno de los 27 códigos de país; cualquier otro valor se descarta y la carta se guarda sin país, sin perder la carrera.
- **RF-13** Carreras sin los datos nuevos (sin ascendencia, sin cambio, filas viejas del ranking) se muestran igual que antes.

## Criterios de aceptación
- **CA-1** Dadas 20.000 carreras repartidas parejo entre los 27 países, entonces entre 22 % y 28 % tienen ascendencia, entre 45 % y 55 % de ellas por la madre, ninguna con ascendencia del propio origen ni de Guatemala, y cada par origen-ascendencia está en la lista del RF-02. Ninguna carrera guatemalteca tiene ascendencia de Japón. (RF-01, RF-02)
- **CA-2** Dado un jugador sin ascendencia o sin 5 temporadas seguidas en un mismo país extranjero, entonces ninguna oferta de ese tipo aparece; dadas 20.000 carreras, cero ofertas a jugadores comprometidos, a menores de 19 o mayores de 31, o con nivel menor al mínimo de la Selección que los busca. (RF-03, RF-04, RF-06)
- **CA-3** Dada la regla de elegibilidad, entonces: 0 partidos, elegible; 3 partidos jugados a los 19, elegible; 3 partidos con uno a los 22, no; 4 partidos, no; 1 partido en un Mundial o una copa continental, no. (RF-03, RF-04)
- **CA-4** Dado un jugador que acepta, entonces en una sola carrera hay como máximo un cambio, el país rechazado no vuelve a ofrecer, y las temporadas posteriores muestran la nueva Selección en la tabla, en los partidos y en el cierre del torneo mientras las anteriores siguen mostrando la anterior. (RF-05, RF-07, RF-08, RF-11)
- **CA-5** Dado un jugador que acepta, entonces el total de partidos y goles con la Selección no baja y sigue cuadrando con los partidos listados en cada temporada; su nivel de convocatoria queda en 1 o 2; y la nueva Selección nunca aparece como rival en sus propios torneos. (RF-07)
- **CA-6** Dado un jugador que acepta, entonces el país de sus clubes disponibles para fichar, su moneda y sus textos de origen son los mismos que antes y el hito aparece una sola vez con el texto del RF-09. (RF-09, RF-10)
- **CA-7** Dadas 20.000 carreras, entonces ningún texto de Selección nombra a una Selección distinta de la actual, y ningún texto de Guatemala aparece en carreras que no son de Guatemala, no tienen a Guatemala como Selección ni juegan en un club guatemalteco. (RF-10)
- **CA-8** Dado un jugador que cambió, entonces el resumen final lista partidos, goles y títulos por Selección y la suma coincide con el total de la carrera; uno que no cambió ve el resumen idéntico al actual. (RF-11, RF-13)
- **CA-9** Dado el envío de una carta al ranking con país "ZZ" o de más de dos letras, entonces la carrera se guarda sin país; con cada uno de los 27 códigos válidos, el país se conserva; el puntaje y los títulos enviados siguen dentro de lo que acepta el servidor. (RF-12)
- **CA-10** Dado que todas las ofertas se aceptan, entonces la tasa global de carreras que juegan un Mundial sube como máximo 2 puntos porcentuales sobre la base sin la función (12,8 % con 5.400 carreras, medida de nuevo sin el evento reemplazado). Se reporta además el porcentaje de carreras que reciben una oferta. Un guatemalteco que se va a Estados Unidos puede ir a más Mundiales y eso es esperado. (RF-03, RF-04, RF-07)
- **CA-11** Dado un jugador sin cambio, entonces la pantalla de Selección, la carta, el resumen y el ranking se ven igual que antes. (RF-13)

## Decisiones (defaults razonables)
- La Selección se separa de la nacionalidad de origen; solo la Selección cambia. Los textos de Selección y los de origen que comparten pantalla se reparten como dice el RF-10: lo que habla de la camiseta sigue a la Selección, lo que habla de casa sigue al origen.
- Probabilidad de ascendencia 25 %. Guatemala no es destino de ascendencia, pero sí puede ser destino de naturalización.
- Ventana de edad de las ofertas: 19 a 31 años. Cada oferta se ve una sola vez.
- Un jugador sin convocar o con pocos partidos es el caso normal; un comprometido simplemente no recibe la oferta (no hay bloqueo de la federación de origen).
- La naturalización cuenta 5 temporadas de las últimas, seguidas, en clubes del mismo país; cambiar de club dentro del país no la reinicia.
- Rechazar: ánimo +6 y fama +3 como valores base, sujetos a ajuste con el tono de los eventos existentes.
- La carta del ranking guarda un solo país: la Selección actual. Su gentilicio y su bandera salen de ahí.
- El hito dice "en <país>" y no el gentilicio para evitar el género ("Se nacionalizó en Francia").

## Aclaraciones abiertas (no bloquean)
- [NECESITA ACLARACIÓN: ¿los amistosos deben contar como partidos que atan a la Selección de origen? Hoy el juego no los distingue y se cuentan todos (más estricto que la FIFA actual). Se asume que cuentan.]
- [NECESITA ACLARACIÓN: ¿el veredicto del ranking de un jugador nacionalizado debe decir "Leyenda estadounidense" (Selección) o "Leyenda chapina" (origen)? Se asume la Selección, porque la carta guarda un solo país. Pasar a dos campos agregaría un campo al ranking.]
- [NECESITA ACLARACIÓN: ¿Guatemala puede ser país de ascendencia de, por ejemplo, un jugador estadounidense? Se asume que no, para no mezclar textos de Guatemala en carreras de otros países.]
- [NECESITA ACLARACIÓN: ¿el límite de 2 puntos porcentuales en la tasa global de Mundiales (CA-10) es el correcto? Si la simulación lo supera con "todos aceptan", se baja la probabilidad de ascendencia antes de tocar el resto.]
