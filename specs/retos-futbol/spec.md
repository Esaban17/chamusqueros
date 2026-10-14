# Retos Fútbol

## Problema y valor
Chamusqueros tiene un solo juego: la carrera de un futbolista, individual y de varios minutos. No hay nada para jugar de a dos ni algo corto que se pueda improvisar con un amigo.
Pedido del usuario: "agregar otro juego dentro del Home, aparte del de carrera de futbolista, 'Retos Fútbol', donde un jugador puede competir en 3 categorías contra otro: 'Mayor cantidad de futbolistas de 1 país sin repetir, puro ping pong', 'Mayor cantidad de futbolistas de un equipo' y 'Preguntas generales de fútbol'".
Valor: un duelo de 2 a 5 minutos entre dos personas con un solo celular (la mayoría juega desde el celular), con datos reales de fútbol y con peso en Centroamérica, que da una segunda razón para volver al sitio.

## Alcance
- El Home ofrece dos juegos: la carrera de siempre y Retos Fútbol.
- Retos Fútbol es un duelo de **2 jugadores en el mismo dispositivo**, que se pasan el celular. Los nombres son opcionales.
- Tres categorías: **ping pong de país**, **ping pong de club** y **preguntas generales**. Una partida es una sola categoría o el **Reto completo** (las tres; gana quien se lleve 2 de 3).
- En el ping pong los jugadores se turnan para escribir un futbolista que cumpla la condición (de un país o de un club). Cada turno tiene reloj. Pierde quien no responde a tiempo, repite o da un nombre que no cumple.
- Los futbolistas se verifican contra una fuente abierta de datos (Wikidata, licencia CC0), no contra listas escritas a mano. Si la fuente falla o tarda, **lo decide el rival** y la partida deja constancia de que no se verificó. Si la fuente dice que un futbolista no cumple, quien lo escribió puede **apelar** y decide el rival (RF-34).
- Un banco de **150 preguntas o más** de opción múltiple, cada una con su fuente y solo con datos estables.
- Las páginas legales (privacidad y términos) reflejan lo nuevo.

## Fuera de alcance
- **Multijugador en línea** (dos celulares). Es la **siguiente fase**; su costo se describe en el plan (salas, tiempo real y anti-trampa). Esta versión no deja ganchos para él.
- Cuentas, ranking, estadísticas, historial, logros, guardar nombres o partidas, compartir resultados.
- Jugar contra la máquina, más de 2 jugadores, torneos, modo contrarreloj global.
- Sonido y vibración.
- Idiomas distintos del español.
- Dirección propia por pantalla ni soporte del botón "Atrás" del navegador dentro de Retos (hoy el juego de carrera tampoco lo tiene).
- Cambiar el juego de carrera, su ranking, su motor, el palmarés o la tienda (hay ramas en paralelo sobre "premios y trofeos" y "tienda"). Cambiar la vista previa para redes (título, descripción e imagen).

## Requisitos funcionales

### Home y navegación
- **RF-01** El Home ofrece los dos juegos con dos botones visibles al abrir: "Empezar mi carrera" (el de siempre) y "Retos Fútbol", este último con una línea que dice que es un duelo de 2 en un celular. Una sección nueva, "Retos Fútbol", explica en pocas líneas las tres categorías y repite el botón.
- **RF-02** A 360×640 el botón "Empezar mi carrera" conserva su posición de hoy (borde inferior a 560 px o menos) y "Retos Fútbol" se ve completo debajo de él sin desplazarse. No hay desplazamiento horizontal en el Home a 360 ni a 1280 px de ancho.
- **RF-03** El flujo de la carrera (crear jugador, temporadas, final, ranking, "Volver") se comporta igual que antes. La vista previa para redes (título, descripción, imagen) no cambia.
- **RF-04** Toda pantalla de Retos tiene un "Salir" visible que lleva al Home. Si hay una partida empezada, pide confirmación. Al salir no queda nada corriendo (relojes, esperas por la fuente de datos).

### Inicio de una partida
- **RF-05** La pantalla de inicio de Retos tiene dos campos de nombre, opcionales y con etiqueta visible, y cuatro opciones: "Reto completo", "Ping pong de país", "Ping pong de club" y "Preguntas". Un nombre vacío se muestra como "Jugador 1" o "Jugador 2". Un nombre admite hasta 20 caracteres, se recorta y se limpia de espacios sobrantes; si los dos quedan iguales se muestran con " (1)" y " (2)".
- **RF-06** En "Ping pong de país" el jugador elige uno de los **27 países del juego** (o "Al azar"). En "Ping pong de club" elige uno de una **lista curada de 40 clubes o más** de las ligas del juego (o "Al azar"). El país o club de la partida está visible durante todo el turno.
- **RF-07** En el Reto completo las categorías van en este orden: ping pong de país, ping pong de club, preguntas. El país y el club se sortean. Quien abre cada categoría se alterna: jugador 1, jugador 2, jugador 1. El Reto completo termina en cuanto alguien gana 2 categorías; si se juegan las 3, gana quien haya ganado más categorías, y si hay igualdad es empate. Entre categorías se ve el marcador.
- **RF-08** Al terminar cualquier partida hay "Revancha" (misma configuración; en el Reto completo se sortean otro país y otro club), "Cambiar de juego" (vuelve al inicio de Retos) y "Volver al inicio" (Home).

### Ping pong de futbolistas
- **RF-09** Los jugadores se turnan. Antes de cada turno hay una pantalla de relevo que dice de quién es el turno y tiene un botón "Listo": el reloj no corre hasta tocarlo. La pantalla de relevo muestra el último futbolista aceptado y cuántos van.
- **RF-10** Cada turno dura **15 segundos**, con un reloj grande y de quién es el turno visibles. Si llega a 0 sin enviar, ese jugador pierde.
- **RF-11** El jugador escribe un nombre y lo envía con un botón o con Enter. Si está vacío, tiene más de 40 caracteres o trae algo que no sea letras, espacios, apóstrofo, guion o punto, no se envía: se explica el motivo y el reloj sigue corriendo; no cuenta como respuesta.
- **RF-12** Mientras se verifica, el reloj se detiene y se indica "Verificando". Esa espera dura como máximo **5 segundos**; pasado ese tiempo se aplica RF-17.
- **RF-13** Es válido un futbolista real que cumpla: para un país, que figure con esa nacionalidad o que haya jugado con la Selección de ese país; para un club, que figure como jugador de ese club. Se muestra el nombre completo reconocido y el turno pasa al rival.
- **RF-14** Pierde en el acto, y gana el rival, quien: (a) no responde a tiempo, (b) escribe un futbolista que ya se dijo en la partida, o (c) escribe un nombre que no corresponde a ningún futbolista que cumpla, salvo que apele y el rival acepte la apelación (RF-34). La pantalla dice el motivo en una frase.
- **RF-15** Se toleran mayúsculas y minúsculas, tildes, espacios sobrantes, el apellido solo y los apodos que la fuente registra como nombre alternativo completo ("MESSI", "Messi" y "lionel messi" valen lo mismo; "Chicharito" vale). **No** se toleran erratas de letras ("Lionel Mesi" no vale). Un texto vale solo si coincide con una parte seguida del nombre del futbolista o con uno de sus apodos completos; no vale por aparecer dentro del apodo de otra persona ("Messi" en México no vale).
- **RF-16** Las repeticiones se detectan por la **identidad del futbolista**, no por el texto: "Messi" y "Lionel Messi" son el mismo, y el segundo cuenta como repetido aunque se haya escrito distinto.
- **RF-17** Si la fuente falla, se demora más de 5 segundos o rechaza por exceso de uso, el juego **no se rompe**: el rival ve lo escrito y decide con "Vale" o "No vale"; el reloj sigue detenido mientras decide. Una pantalla avisa que esa respuesta no se pudo verificar y por qué decide el rival. "No vale" hace perder a quien escribió. Sin verificación, la repetición se detecta por el texto normalizado (sin tildes ni mayúsculas) y si el texto es distinto la decide el rival.
- **RF-18** Al terminar el ping pong se muestra el ganador, el motivo, cuántos futbolistas aceptó cada jugador y la lista completa en orden. Cada futbolista aceptado por decisión del rival porque la fuente falló lleva la marca "sin verificar", y cada uno aceptado por una apelación lleva la marca "por apelación"; ambas con texto y no solo con color.

### Preguntas generales
- **RF-19** Cada jugador responde **5 preguntas** seguidas de opción múltiple (4 opciones, 1 correcta) y luego se pasa el celular. Cada jugador recibe preguntas distintas, pero de la misma dificultad (2 fáciles, 2 medias y 1 difícil). Ninguna pregunta se repite en la partida y el orden de las opciones se baraja en cada partida.
- **RF-20** Cada pregunta tiene un reloj de **20 segundos**. Sin respuesta a tiempo cuenta como incorrecta. Al responder se dice si acertó y cuál era la correcta; solo cuenta la primera respuesta; no avanza solo, hay un botón para continuar.
- **RF-21** Se responde con toque, clic o teclado (teclas 1 a 4, o Tab y Enter).
- **RF-22** Gana quien acierta más. Con empate hay **muerte súbita**: una pregunta nueva de dificultad media para cada uno, y se repite hasta que uno acierte y el otro no, con un máximo de 3 rondas; si siguen igualados, la categoría es un empate.
- **RF-23** El banco tiene **150 preguntas o más**, con estos mínimos por tema: Mundiales 25, Champions 20, Balón de Oro 15, récords 15, clubes 25, estadios 20 y fútbol de Centroamérica 20; y por dificultad: fácil 40, media 50, difícil 30. Cada pregunta tiene una sola respuesta correcta, cuatro opciones distintas y una **fuente verificable** (página de Wikipedia o de Wikidata) con la fecha en que se verificó.
- **RF-24** Solo entran datos **estables**: hechos de ediciones ya cerradas (campeón y sede de un Mundial, ganador de un Balón de Oro de un año, final de una Champions), año de fundación, ciudad de un club o de un estadio. Quedan fuera los datos que cambian con el tiempo: entrenador o plantilla actual, capacidad, patrocinadores en el nombre de un estadio, y récords que se pueden superar salvo que la pregunta los limite a una edición cerrada. Lo que no se puede verificar no entra.

### Transversales
- **RF-25** Funciona a 360 px y en escritorio, sin desplazamiento horizontal. Los botones y las zonas de toque miden 48 px de alto o más. En un celular con el teclado en pantalla abierto (360×320 visibles), el campo de texto, el reloj y el botón de enviar se ven sin desplazarse.
- **RF-26** Accesible: todo campo tiene etiqueta; el reloj se anuncia a lectores de pantalla al empezar el turno, a los 10 s, a los 5 s y al terminar (no cada segundo); al cambiar de pantalla el foco se mueve al título; el foco se ve al navegar con teclado; todo se puede jugar solo con teclado; nada se comunica solo con color (✓/✗ y texto); contraste de 4,5:1 o más en tema claro y oscuro; con "reducir movimiento" no hay animaciones.
- **RF-27** El reloj cuenta tiempo real: si la pestaña pasa a segundo plano durante un turno, el tiempo sigue corriendo y no se gana tiempo.
- **RF-28** Los nombres de los jugadores y las respuestas del juego nunca se guardan en el dispositivo ni salen de él. Lo único que sale es el texto del futbolista que se envía a verificar. Retos no escribe en el almacenamiento del navegador.
- **RF-29** Todo texto que se muestra (nombres de jugadores, nombres reconocidos por la fuente, preguntas, opciones) se ve literal; nunca se interpreta como marcado.
- **RF-30** Retos Fútbol muestra el crédito "Datos de futbolistas: Wikidata (CC0)" con enlace, y enlaces a privacidad y términos.
- **RF-31** `privacidad.html` dice que el texto de los futbolistas que se escriben se envía al servidor del juego, que consulta Wikidata; que no se guarda asociado a datos personales; que hay una memoria temporal de resultados; que el navegador no se conecta a Wikidata; y que los nombres de los jugadores no salen del dispositivo. `terminos.html` aclara que Retos Fútbol es un juego de entretenimiento, que sus datos vienen de fuentes abiertas y pueden contener errores u omisiones, y cómo reportar uno.
- **RF-32** Sin dependencias nuevas. El código de Retos se descarga solo cuando alguien toca "Retos Fútbol": la primera carga del sitio no crece más de 3 KB comprimidos.
- **RF-33** Las preguntas funcionan sin conexión a internet. El ping pong sin conexión sigue jugable con la decisión del rival (RF-17).
- **RF-34** (apelación) Cuando la fuente responde que el futbolista no existe o no cumple (RF-14c), la pantalla lo dice y ofrece dos botones a quien lo escribió: "Apelar" y "Aceptar la derrota". "Apelar" lleva a la pantalla de decisión del rival de RF-17, con el aviso de que es una apelación y no una falla de la fuente; el reloj sigue detenido. "Vale" acepta al futbolista y el turno pasa al rival; "No vale" hace perder a quien apeló. El futbolista aceptado queda marcado "por apelación" en la lista final (RF-18). Solo se apela una respuesta que la fuente rechazó: una repetición (RF-14b) no se apela. No hay límite de apelaciones: apelar solo ocurre cuando de otro modo se pierde.

## Criterios de aceptación
- **CA-1** (RF-01 a RF-03) A 360×640: el borde inferior de "Empezar mi carrera" está a 560 px o menos; "Retos Fútbol" está completo dentro de los 640 px (borde inferior a 620 px o menos); `scrollWidth` es de 360 o menos; a 1280×800 tampoco hay desplazamiento horizontal. Con "Empezar mi carrera" se llega al formulario y se completa una carrera igual que antes; el ranking y "Volver" funcionan. El `<head>` de `index.html` no cambia. Las cuentas de la landing pasan a 4 `h2` y 5 botones `.btn` con `data-go` (2 de carrera, 2 de Retos y el del ranking); con una carrera guardada hay además el enlace "Ranking ›" (6 elementos con `data-go`).
- **CA-2** (RF-13 a RF-16, RF-11) Con la fuente grabada (respuestas fijas) y, aparte, en vivo, estos casos dan el resultado indicado:

  | Entrada | Condición | Resultado |
  |---|---|---|
  | `Messi` | Argentina | válido, "Lionel Messi" |
  | `  MESSI ` | Argentina | válido, mismo futbolista |
  | `Chicharito` | México | válido (apodo registrado) |
  | `Rooney` | Inglaterra | válido (apellido) |
  | `Messi` | México | inválido |
  | `Messi` | Real Madrid | inválido |
  | `Messi` | FC Barcelona | válido |
  | `Lionel Mesi` | Argentina | inválido (errata) |
  | `Taylor Swift` | Estados Unidos | inválido (no es futbolista) |
  | `xqzvwk` | cualquiera | inválido |
  | `Messi` y luego `Lionel Messi` | Argentina | el segundo es repetido; pierde quien lo escribió |
  | `Messi1`, vacío, 41 caracteres | cualquiera | no se envía; el reloj sigue |

- **CA-3** (RF-10, RF-12, RF-27) Con reloj controlado: un turno sin respuesta pierde a los 15,0 s ± 0,3; el reloj no avanza en el relevo ni durante la verificación; con la fuente demorada 6 s, a los 5,0 s ± 0,5 pasa a decisión del rival; un turno con la pestaña oculta 10 s llega a 5 s restantes al volver.
- **CA-4** (RF-17, RF-18, RF-33) Con la fuente devolviendo error, tiempo agotado o rechazo por exceso de uso: aparece la decisión del rival con el aviso; "Vale" continúa y deja "sin verificar" en la lista final; "No vale" hace perder a quien escribió; una partida completa se puede terminar sin ninguna respuesta de la fuente. Un texto repetido sin verificación (mismo texto normalizado) pierde sin preguntar al rival.
- **CA-13** (RF-34) Con la fuente grabada devolviendo "no cumple" para `Zzyxw`: aparecen "Apelar" y "Aceptar la derrota"; "Aceptar la derrota" hace perder a quien escribió; "Apelar" muestra la decisión del rival con el aviso de apelación, "Vale" deja al futbolista "por apelación" en la lista final y pasa el turno, "No vale" hace perder a quien apeló. Un texto repetido no ofrece apelación. Sin ninguna respuesta de la fuente (error), el aviso es el de RF-17 y no el de apelación.
- **CA-5** (RF-07) Para las secuencias de resultados de categoría (G1 gana jugador 1, G2 jugador 2, E empate) el Reto completo da: G1-G1 gana 1 y no juega la tercera; G1-G2-G1 gana 1; G1-G2-G2 gana 2; G1-G2-E empate; G1-E-E gana 1; E-E-E empate; y quien abre cada categoría es 1, 2, 1.
- **CA-6** (RF-19 a RF-22) Con 1.000 partidas simuladas: cada jugador recibe 5 preguntas, ninguna repetida en la partida, con las dificultades 1, 1, 2, 2, 3 en ambos; la opción correcta cae en cada posición entre 22 % y 28 %. Casos de puntaje: 5-3 gana el jugador 1; 4-4 pasa a muerte súbita; muerte súbita 1-0 gana el jugador 1; 3 rondas igualadas dan empate. Sin responder, a los 20,0 s ± 0,3 la pregunta cuenta como incorrecta; una segunda respuesta no cambia nada.
- **CA-7** (RF-23, RF-24) El verificador del banco pasa sin errores: 150 preguntas o más; mínimos por tema y por dificultad; 4 opciones distintas y una sola correcta; fuente https de wikipedia.org o wikidata.org que responde 200; la respuesta correcta figura en la fuente; ninguna pregunta repetida; ninguna con las palabras "actual", "actualmente", "hoy", "vigente", "último" o "más reciente" sin acotar a una edición cerrada. Revisión manual de una persona, de 30 preguntas al azar contra su fuente: 30 de 30 correctas. Con un solo error se revisa el banco entero antes de publicar.
- **CA-8** (RF-06) El verificador de identificadores pasa: los 27 países del juego están en la lista; la lista de clubes tiene 40 o más, y cada club existe en el juego; cada identificador de Wikidata tiene el nombre y el país esperados y al menos 40 futbolistas que lo usan.
- **CA-9** (RF-04, RF-09 a RF-12, RF-20 a RF-22, RF-25 a RF-27) Prueba manual en navegador a 360×640, 360×320 (teclado abierto) y 1280×800, tema claro y oscuro, con y sin "reducir movimiento": (a) se juega un ping pong completo y una partida de preguntas solo con teclado; (b) el reloj se anuncia a los 10 s, 5 s y 0 con un lector de pantalla y no cada segundo; (c) el foco queda en el título al cambiar de pantalla; (d) "Salir" confirma si hay partida y al salir no quedan relojes ni peticiones; (e) sin desplazamiento horizontal ni saltos de altura al cambiar de pantalla; (f) ✓/✗ llevan texto; (g) en celular real, la partida de 2 jugadores se completa pasando el equipo.
- **CA-10** (RF-31, RF-30) `privacidad.html` y `terminos.html` contienen los puntos de RF-31; el crédito con enlace a Wikidata y la licencia CC0 aparecen en Retos y en privacidad.
- **CA-11** (RF-29, A03) Con el nombre de jugador `<img src=x onerror=alert(1)>` y con ese mismo texto como futbolista: se ve literal y no se ejecuta nada. Con las entradas hostiles de la sección de seguridad, el servicio responde "entrada inválida" sin consultar a Wikidata.
- **CA-12** (RF-32, coordinación) `npm run build` pasa sin dependencias nuevas; el tamaño comprimido del paquete principal crece 3 KB o menos; el diff respecto de `main` toca solo `home()` y su manejador de clics en `src/main.ts`, `privacidad.html`, `terminos.html`, `specs/retos-futbol/` y archivos nuevos (el módulo de Retos, el servicio de verificación y sus scripts). Nada en `src/engine/`, `src/ui/`, `src/style.css`, `api/ranking.ts` ni `db/`.

## Seguridad (OWASP Top 10)
Los mecanismos están en el plan; aquí, lo que debe cumplirse:
- **A03 (inyección)**: el texto que escribe el jugador nunca se usa para armar una consulta SPARQL; solo viaja como parámetro codificado de una búsqueda y con un alfabeto restringido. Un texto no puede agregar condiciones ni operadores a la búsqueda (CA-11).
- **A03 (XSS)**: todo dato dinámico se muestra literal, incluidos los nombres que devuelve Wikidata y los de los jugadores (RF-29, CA-11).
- **A04 (diseño inseguro y abuso)**: el servicio de verificación limita el uso por cliente y en total, valida largo y alfabeto, y nunca depende de él para que el juego siga (RF-17). **Riesgo aceptado**: es un duelo en el mismo dispositivo; nadie puede "hacer trampa" frente a un servidor porque no hay ranking ni premio. Las respuestas del banco de preguntas viajan al navegador junto con el código y se pueden ver con las herramientas del navegador.
- **A10 (SSRF)**: el servicio solo llama a hosts fijos de Wikidata; nada de lo que escribe el jugador decide a dónde se llama.
- **A05 (configuración)**: respuestas con tipo de contenido declarado y sin sniffing, sin cabeceras de CORS, errores sin detalles internos. Una política de seguridad de contenido para todo el sitio es un hallazgo previo que sigue **fuera de alcance**.
- **A08 (integridad)**: el banco de preguntas es un archivo estático versionado, validado por script antes de publicar; no se carga nada de internet para jugar preguntas.
- **A06 (componentes)**: sin dependencias nuevas.
- A01, A02, A07, A09: no aplican (sin cuentas ni acceso restringido, sin secretos nuevos, sin autenticación; los registros son los de la plataforma, que la política de privacidad ya menciona).

## Decisiones (defaults razonables)
**Del orquestador**
- **Mismo dispositivo, 2 jugadores, nombres opcionales; una categoría o Reto completo (2 de 3).** El juego en línea es la siguiente fase, fuera de alcance.
- **Ping pong**: país o club elegido, turnos con reloj de 15 s, pierde quien no responde, repite o da un nombre inválido; tolera tildes, mayúsculas y apodos; repetición por identidad.
- **Validación con Wikidata (CC0)**, no con listas de memoria; si falla, **decide el rival** y se deja constancia (RF-17).
- **Mapa país/club ↔ Wikidata**: 27 países y unos 40 clubes, en un archivo estático versionado y verificado contra Wikidata; ningún identificador se inventa.
- **Banco** de 150+ preguntas, con fuente, solo verificable; generadas por script desde Wikidata donde se pueda y completadas con curadas; partida por turnos con reloj y desempate.
- **Home con los dos juegos**, Retos en su propio módulo sin tocar el motor de la carrera; UI a 360 px, accesible, sin dependencias; legal actualizado; paralelización en dos bloques (A y B) con una interfaz fija (ver plan).

**Mías, derivadas del pedido o de lo que se midió**
- **Se conserva "Empezar mi carrera"** como texto del botón de la carrera: lo fijan CA-1, CA-3 y CA-6 de `specs/home-landing`, y es un verbo de acción. El juego se nombra "Carrera de futbolista" en la sección nueva. Si se prefiere el rótulo literal "Carrera de futbolista" en el botón, es un cambio de una línea más la actualización de esas tres cifras.
- **Cambio a una spec anterior, explícito**: `specs/home-landing` CA-3 contaba 3 `h2` y 4 bloques de inclusión; con la sección nueva pasan a 4 `h2` (CA-1 de esta spec). Lo demás de esa spec no cambia.
- **El reloj se detiene al enviar y en el relevo**: la latencia de la fuente (medida entre 1 y 2,5 s con dos consultas) no se descuenta del jugador. Sin esto "pierde quien no responde a tiempo" no sería justo ni verificable.
- **Verificar es siempre en el servidor del juego**, nunca desde el navegador: así el navegador no se conecta a un tercero nuevo y se puede limitar y cachear.
- **Reglas de coincidencia estrictas** (RF-15): la fuente encuentra nombres por alias y texto libre, y sin esta regla "Messi" valdría en México por un alias ("Mexican Messi") de otro futbolista, y en el Real Madrid por el de otro. A cambio, las erratas no se toleran.
- **Selección de Inglaterra y de Países Bajos**: en la fuente, casi nadie figura con nacionalidad "Inglaterra" (31 futbolistas) sino "Reino Unido" (más de 32.000, incluye Escocia, Gales e Irlanda del Norte), y casi nadie con "Países Bajos" (2) sino con el "Reino de los Países Bajos" (más de 8.000). Para Inglaterra se acepta solo a quien jugó con la Selección de Inglaterra; para Países Bajos, el Reino o la Selección. Es una limitación conocida, y se avisa en la pantalla de elegir país.
- **Doble nacionalidad**: un futbolista cuenta para todos los países con los que figura.
- **Futbolista = persona cuya ocupación en la fuente es "futbolista de asociación"**; no se recorren subclases (un recorrido costaría consultas extra por cada texto). Se revisa en la verificación de identificadores con una muestra.
- **Se muestra el último nombre aceptado y el contador, no la lista completa**, durante la partida: recordar lo dicho es parte del ping pong. La lista entera sale al final.
- **Reto completo sortea país y club** y alterna quién abre: menos pantallas y compensa la ventaja de abrir.
- **Preguntas por bloques**: cada jugador responde sus 5 seguidas y se pasa el celular una vez (no 10 pasadas). Preguntas distintas por jugador porque con el mismo celular el segundo vería el acierto del primero.
- **La fuente de cada pregunta no se muestra al jugador** en esta versión; es parte del dato y del verificador.
- **Sin rutas propias**: se entra y se sale con botones, como el resto del sitio.
- **Los nombres de los jugadores no se guardan** (ni siquiera los últimos usados): mínimo de datos.
- **Cuando la fuente dice "no cumple" decide la fuente, pero se puede apelar** (RF-14c, RF-34): cubre los huecos de Wikidata en ligas chicas. Cambio respecto del default original (Aclaración 2).

## Aclaraciones resueltas
Resueltas por el orquestador antes de implementar el bloque A. Ninguna queda abierta salvo la revisión humana del banco (Aclaración 4), que bloquea publicar y no es del bloque A.

**Desvíos aceptados (los 7 del plan)**
1. La verificación usa `list=search` con `haswbstatement:` en lugar de `wbsearchentities` más las `claims` (plan, "Lo que se midió", punto 2). Sigue siendo la API de Wikidata, datos CC0 y un host fijo.
2. Coincidencia estricta (RF-15): contigua en el nombre o igual a un apodo completo; las erratas no se toleran.
3. Mapa de Inglaterra (solo quien jugó con su Selección) y de Países Bajos (el Reino o la Selección), con aviso en pantalla.
4. El servicio es `GET`, no `POST`, para que la CDN de Vercel guarde las respuestas para todos.
5. Retos arma el DOM con `h()`/`textContent` y no con `esc()` (RF-29).
6. Futbolista = ocupación exacta "futbolista de asociación" (Q937857), sin recorrer subclases.
7. El botón de la carrera conserva "Empezar mi carrera". Por eso `specs/home-landing` CA-3 pasa de 3 a **4 `h2`** (se agrega "Retos Fútbol"); el resto de esa spec no cambia (se actualizó su CA-3).

**Aclaraciones**
1. **5 preguntas por jugador, 20 s por pregunta y muerte súbita de hasta 3 rondas**: confirmado (RF-19 a RF-22).
2. **Sí hay apelación** (cambia el default): RF-34 y CA-13; se quitó de "Fuera de alcance".
3. **Inglaterra y Países Bajos como en la Decisión, con aviso en pantalla**: confirmado. El aviso sale al elegir país y en el primer relevo si el país sorteado es uno de los dos.
4. **La revisión humana de las 30 preguntas (CA-7) la hará el usuario antes de publicar.** No es del bloque A.

**Notas de implementación del bloque A**
- Las pantallas del ping pong viven en `src/retos/ui-pingpong.ts` (archivo nuevo dentro del módulo de Retos): `pingpong.ts` queda como lógica pura que se prueba con `tsx`, sin CSS ni DOM.
- `api/futbolista.ts` importa `./_retos.js` (con extensión): resuelve igual en `tsx`, Vite y `tsc`, y es lo que pide el runtime ESM de Vercel. Se confirma en la primera vista previa (plan, riesgo 1).
- Con `vite dev` no hay `/api/*`: el ping pong cae solo a la decisión del rival (RF-17), que además sirve de prueba de ese camino. Las pruebas de navegador interceptan la red.
