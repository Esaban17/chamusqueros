# Reto del día

## Problema y valor
Retos Fútbol se juega de a dos y de a ratos; no da una razón para volver mañana. `specs/backlog.md` (ítem 6, `reto-del-dia`) propone un reto corto por fecha, igual para todos, con una racha de días: retención sin costo de servidor. El usuario aprobó implementar todo el backlog el 2026-10-15.
Valor: una jugada de unos 20 segundos, en solitario, con el contenido que Retos ya tiene (178 preguntas y 520 futbolistas), y un número (la racha) que da motivo para abrir el sitio cada día. La versión 1 no usa servidor: operación cero.
Limitación honesta: no hay medición de retorno en el sitio (sin analítica), así que el efecto en retención no se podrá verificar con datos propios. Esta spec entrega la mecánica, no la prueba de su efecto.

## Alcance
- Una opción nueva, "Reto del día", en la pantalla de entrada de Retos, y una línea más corta en el botón de Retos del Home que la menciona (decisión del orquestador, ver Decisiones). *[enmendado por la adenda 2026-10-15; ver Enmiendas]*
- Un solo reto por fecha de Guatemala: una pregunta de fútbol o un futbolista de "¿De dónde es?", alternando por día, igual para todos los dispositivos.
- Una jugada por fecha, sin reloj, con acierto o fallo.
- Una racha de días consecutivos jugados, la mejor racha, jugados, aciertos y los últimos 7 días, guardados solo en el navegador.
- Una frase nueva en `privacidad.html` que describe lo que se guarda.

## Fuera de alcance
- Servidor, cuentas, perfil, ranking, puntos de Retos o cualquier dato que salga del dispositivo. Una racha en el perfil o en un ranking sería una versión 2 y exigiría una spec nueva.
- Compartir el resultado (lo cubre `compartir-retos`, rama aparte), recordatorios, notificaciones, correo.
- Premios, trofeos, ventajas en la carrera o en la tienda por la racha.
- Recuperar días perdidos, elegir el reto, jugar el de otra fecha, jugar más de uno por día.
- Contenido nuevo: ni preguntas ni futbolistas nuevos; solo se reutilizan los bancos actuales.
- Reloj por pregunta y puntos por rapidez.
- Historial más allá de 7 días; sincronizar entre dispositivos o navegadores.
- Defender la racha contra quien cambia el reloj de su propio dispositivo (ver Decisiones).
- Cambios en el Home (más allá del texto de la segunda línea del botón de Retos), en la carrera, en el Reto completo ni en los demás modos de Retos. *[enmendado por la adenda 2026-10-15; ver Enmiendas]*
- Medición de uso (analítica).

## Requisitos funcionales

### Entrada y pantalla
- **RF-01** La pantalla de entrada de Retos muestra una opción "Reto del día" con la línea "Un reto nuevo cada día, igual para todos. Cuidá tu racha." Aparece siempre, también cuando el modo en línea no está disponible. En el Home solo cambia el texto de la segunda línea del botón de Retos, que pasa de "Duelos de 2: en un solo celular o en línea" a "Duelos de 2 y un reto nuevo cada día"; nada más del Home cambia. *[enmendado por la adenda 2026-10-15; ver Enmiendas]*
- **RF-02** La pantalla del reto tiene el título "Reto del día", la fecha de Guatemala escrita en español (por ejemplo, "15 de octubre de 2026"), la racha vigente ("Racha: 3 días", "Racha: 1 día", "Racha: 0 días") y el reto del día.

### Qué reto toca cada día
- **RF-03** El "día" es la fecha de Guatemala (UTC−6 todo el año, sin horario de verano), calculada con el reloj del dispositivo. El reto cambia a las 00:00 de Guatemala (06:00 UTC), no a la medianoche del dispositivo.
- **RF-04** La misma fecha da el mismo reto en cualquier dispositivo y sin conexión: el mismo tipo, el mismo elemento y el mismo orden de las opciones. Recargar la pantalla no cambia el orden de las opciones.
- **RF-05** Los días alternan de tipo: las fechas de Guatemala pares (contando días desde 1970-01-01) son pregunta y las impares, futbolista de "¿De dónde es?". Dentro de cada tipo, los elementos salen en un orden fijo disperso (no el del archivo, que está agrupado por tema y por selección): cada elemento sale una vez antes de que se repita cualquiera. Con los bancos de hoy, una pregunta se repite a los 356 días y un futbolista a los 1.040. Agregar elementos a un banco cambia qué toca en los días siguientes (ver Decisiones).

### Jugar
- **RF-06** La pregunta se juega como en "Preguntas": enunciado, 4 opciones barajadas (una sola correcta), respuesta con toque, clic o teclas 1 a 4, sin reloj. Solo cuenta la primera respuesta. Al responder se marca la correcta y, si falló, la elegida, con ✓/✗ y texto, y se dice cuál era la correcta.
- **RF-07** El futbolista se juega como en "¿De dónde es?": el nombre del futbolista, la consigna "¿De qué Selección es?" y 4 opciones (la correcta y 3 de su confederación), con la misma respuesta y la misma retroalimentación de RF-06, sin reloj ni puntos por rapidez.
- **RF-08** Hay una sola jugada por fecha. Al responder se ve el resultado ("Acertaste" o "Fallaste"), la racha ya actualizada, las estadísticas de RF-12 y "Volvé mañana". Si se abre el reto de nuevo ese mismo día, se ve "Ya jugaste el reto de hoy" con el resultado y las estadísticas, y no hay forma de responder otra vez ni se vuelve a mostrar el enunciado.
- **RF-09** Salir sin responder no cuenta como jugada: al volver ese mismo día el reto sigue disponible.

### Racha y estadísticas
- **RF-10** La racha cuenta días consecutivos de Guatemala con el reto jugado, se haya acertado o fallado. Jugar el día siguiente al último jugado suma 1; jugar después de saltarse uno o más días la deja en 1; jugar de nuevo la misma fecha no cambia nada. Mejor racha es el máximo alcanzado.
- **RF-11** La racha que se muestra es la vigente: igual a la guardada si la última jugada fue hoy o ayer; 0 si pasó más de un día. Si la última fue ayer y hoy no se jugó, la pantalla dice cuánto llegaría a valer ("Jugá hoy para llegar a 4").
- **RF-12** Las estadísticas muestran la mejor racha, los retos jugados, los aciertos y los últimos 7 días (hoy y los 6 anteriores), cada uno con texto y símbolo: "✓ acertó", "✗ falló" o "– no jugó". Nada se comunica solo con color. Ajuste post-revisión UX (2026-10-15, M-6): la pantalla lista solo los días jugados de esos 7 (con un solo día jugado, una fila), y al responder el resultado se muestra sin desplazarse, con "Volver a Retos" a la vista.

### Persistencia y confianza en los datos
- **RF-13** El dato vive solo en el almacenamiento local del navegador, en una sola entrada. Contiene contadores (racha, mejor racha, jugados, aciertos) y, para cada uno de los últimos 7 días jugados, su fecha y si se acertó. No contiene nombres, la opción elegida, la respuesta correcta ni identificadores del dispositivo, y no se envía a ningún servidor.
- **RF-14** Todo lo que se lee del almacenamiento se trata como no confiable. Se descarta por completo (y la pantalla se comporta como la primera vez, sin mensaje de error ni excepción) si no cumple cualquiera de estas condiciones: es JSON de objeto y mide 4.096 caracteres o menos; trae la versión 1; los cuatro contadores son enteros de 0 a la cantidad de días transcurridos desde 1970-01-01 (hoy, 20.741 el 2026-10-15) o menos; mejor racha ≥ racha; jugados ≥ aciertos y ≥ mejor racha; la cantidad de entradas del historial es exactamente el menor entre jugados y 7; el historial tiene 7 entradas o menos, cada una con una fecha real en formato AAAA-MM-DD que no es posterior a hoy y un acierto 0 o 1, en orden estrictamente creciente; y la racha es coherente con el historial: sea R el largo de la serie de días consecutivos que termina en la última entrada; si R es menor que la cantidad de entradas, la racha es exactamente R; si es igual, la racha es R o más. Un registro inválido no se borra al leerlo: lo reemplaza la siguiente jugada.
- **RF-15** Si el almacenamiento no está disponible (bloqueado, lleno o lanza error), el reto se puede jugar igual. La pantalla del resultado avisa "No se pudo guardar tu racha en este navegador." y no se rompe nada.
- **RF-16** Un reto cuenta una sola vez por fecha, aunque haya dos pestañas abiertas o un doble toque: antes de guardar se vuelve a leer el registro y, si ya tiene esa fecha o una posterior, no se suma; si ya tenía esa misma fecha (otra pestaña la contó primero), la pantalla pasa a "Ya jugaste el reto de hoy" con lo que quedó guardado.
- **RF-17** La fecha que cuenta es la del reto que se mostró al abrir la pantalla. Si pasa la medianoche de Guatemala con la pantalla abierta, la respuesta cuenta para la fecha del reto mostrado.

### Transversales
- **RF-18** Operación cero: ningún servicio propio nuevo ni petición a `/api/`, ningún host nuevo, ninguna dependencia nueva, ninguna variable de entorno. Las banderas de las opciones del futbolista son las de flagcdn.com que "¿De dónde es?" ya usa.
- **RF-19** Todo texto que se muestra (preguntas, nombres de futbolistas, opciones, fecha, números) se ve literal; nunca se interpreta como marcado.
- **RF-20** Funciona a 360 px y en escritorio sin desplazamiento horizontal. Los botones miden 48 px de alto o más. Al cambiar de pantalla el foco va al título (al abrir y en "Ya jugaste", el "Reto del día"; al responder, el encabezado del resultado "Acertaste" o "Fallaste", que es el título de lo que aparece). Se juega solo con teclado. Contraste de 4,5:1 o más en tema claro y oscuro. Con "reducir movimiento" no hay animaciones.
- **RF-21** Nada del reto se descarga hasta tocar "Reto del día", y de los dos bancos solo se baja el del tipo de hoy. Si la descarga falla, se dice y hay "Volver a Retos". El paquete principal del sitio no cambia. *[enmendado por la adenda 2026-10-15; ver Enmiendas]*
- **RF-22** El "Salir" del encabezado de Retos lleva al Home sin pedir confirmación (no hay partida que perder), y la pantalla ofrece "Volver a Retos". Al salir no queda nada corriendo.
- **RF-23** Los demás modos de Retos (duelo local, Reto completo de 3 categorías, en línea, perfil, ranking) se comportan igual que antes, y sus pruebas existentes pasan sin cambiar ninguna aserción (la única edición permitida es un comentario en `scripts/retos.test.ts` que nombra la excepción de `src/retos/dia/`, decisión 3 del orquestador).
- **RF-24** `privacidad.html` dice, en una viñeta dentro de la sección de Retos Fútbol, que el Reto del día guarda en el navegador solo fechas, aciertos o fallos y contadores de racha; que eso no sale del dispositivo; y que se borra borrando los datos del sitio. La viñeta que dice que el modo "en el mismo celular" no escribe nada en el almacenamiento se mantiene verdadera porque se refiere al duelo, y se aclara que el Reto del día es aparte.

## Criterios de aceptación
Las "fechas" son fechas de Guatemala. Los números salen de los bancos del 2026-10-15 (178 preguntas, 520 futbolistas).

- **CA-1** (RF-03) Dados estos instantes UTC, entonces la fecha de Guatemala es la indicada: 2026-10-15T05:59:59.999Z → 2026-10-14; 2026-10-15T06:00:00.000Z → 2026-10-15; 2026-10-16T05:59:59.999Z → 2026-10-15; 2026-01-01T05:59:59Z → 2025-12-31; 2028-02-29T12:00:00Z → 2028-02-29. Y el reto de 2026-10-14 (23:59 GT) y el de 2026-10-15 (00:00 GT) son de tipo distinto.
- **CA-2** (RF-05) Dadas las fechas 2026-10-15, 2026-10-16 y 2026-10-17, entonces los tipos son futbolista, pregunta y futbolista. Dadas 356 fechas consecutivas desde 2026-10-16, entonces las 178 preguntas salen exactamente una vez cada una, y la fecha 357 repite la de la primera. Dadas 2.080 fechas consecutivas, entonces los 520 futbolistas salen exactamente una vez cada uno en las primeras 1.040 fechas y repiten en el mismo orden en las siguientes 1.040.
- **CA-3** (RF-05) Dados los 178 días de pregunta consecutivos, entonces en 30 % o menos de los pares de días de pregunta contiguos las dos preguntas son del mismo tema (el orden del archivo da 97 %; un orden al azar da cerca de 15 %). Dados los 520 días de futbolista consecutivos, entonces en 10 % o menos de los pares contiguos los dos futbolistas son de la misma selección (el archivo da 84 %).
- **CA-4** (RF-04) Dadas 1.000 fechas consecutivas desde 2026-10-15, entonces pedir el reto de cada una dos veces da resultados idénticos, con el mismo orden de opciones, y la opción correcta sigue siendo la del banco. Dados 4.000 días consecutivos, entonces la correcta cae en cada posición (1 a 4) entre 22 % y 28 % de las veces, tanto en preguntas como en futbolistas.
- **CA-5** (RF-10, RF-11, RF-16) Dado un registro vacío, cuando se juega la fecha D, entonces la racha es 1, la mejor 1 y los jugados 1. Cuando se juega D+1 (con fallo), entonces la racha es 2, la mejor 2, los jugados 2 y los aciertos solo suben si se acertó. Cuando se juega D+2, entonces racha 3, mejor 3. Cuando se juega D+4 (saltándose D+3), entonces la racha es 1 y la mejor sigue en 3. Cuando se registra otra vez D+4, entonces nada cambia (jugados no sube). Cuando se registra D+2 después de D+4 (pestaña vieja), entonces nada cambia. Dado un registro con última jugada D y racha 5: la vigente es 5 en D, 5 en D+1 (con el aviso "para llegar a 6") y 0 en D+2.
- **CA-6** (RF-12) Dado un registro con jugadas en D−6 (acierto), D−4 (fallo) y D (acierto), entonces los últimos 7 días, de D−6 a D, se listan en orden como: "✓ acertó", "– no jugó", "✗ falló", "– no jugó", "– no jugó", "– no jugó", "✓ acertó", todos con texto y con la fecha de cada uno (`ultimos7` devuelve los 7; la pantalla muestra solo los jugados, ver RF-12).
- **CA-7** (RF-13, RF-14) Dados estos contenidos de la entrada guardada, entonces se descartan y el estado es el de la primera vez, sin excepción: texto que no es JSON; `null`; `[]`; `"x"`; `{}`; versión 2; racha −1; racha 1,5; racha `"3"`; racha 1e9; mejor racha menor que la racha; aciertos mayores que jugados; historial de 8 entradas; fecha `2026-02-30`; fecha posterior a hoy (2026-10-16 cuando hoy es 2026-10-15); historial desordenado; acierto 2; una fecha con texto `<img src=x onerror=alert(1)>`; racha 5 con un historial de 3 días no consecutivos; jugados 3 con un historial de 2 entradas; contenido de 4.097 caracteres. Un registro válido de 7 entradas consecutivas con racha 7, y otro con el mismo historial y racha 12 (con mejor racha y jugados de 12 o más), se aceptan. Un registro con la clave `__proto__` no altera `Object.prototype` ni entra en el estado.
- **CA-8** (RF-15) Dado un almacenamiento que lanza error al leer y al escribir, cuando se juega el reto, entonces se ve el resultado y el aviso de RF-15, y la consola no tiene errores sin capturar. Dado un almacenamiento lleno que lanza solo al escribir, entonces igual.
- **CA-9** (RF-19, RF-13, RF-18) Dado el código nuevo del reto, entonces una búsqueda de texto no encuentra `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` ni `eval(`; `localStorage` aparece en un solo archivo; no hay `fetch(` ni `XMLHttpRequest` ni `sendBeacon`; `package.json` y `package-lock.json` no cambian.
- **CA-10** (RF-01, RF-02, RF-06, RF-07, RF-08, RF-09, RF-11) Dado un navegador a 360×640 con el reloj fijado en 2026-10-15 12:00 GT y sin datos guardados, cuando se abre Retos, entonces "Reto del día" está en la entrada con su línea. Cuando se toca, entonces hay un título "Reto del día", la fecha "15 de octubre de 2026", "Racha: 0 días" y un futbolista con 4 opciones (2026-10-15 es de futbolista). Cuando se sale sin responder y se vuelve a entrar, entonces sigue disponible con las mismas 4 opciones en el mismo orden. Cuando se responde, entonces la opción correcta lleva ✓ y texto, se ve "Racha: 1 día" y "Volvé mañana", y la entrada guardada es un objeto con racha 1, mejor 1, jugados 1 y un historial de una entrada. Cuando se recarga la página, entonces se ve "Ya jugaste el reto de hoy" y no se puede responder. Cuando se avanza el reloj a 2026-10-16 12:00 GT, entonces el reto es una pregunta con 4 opciones, "Racha: 1 día" y "Jugá hoy para llegar a 2"; al responder, "Racha: 2 días". Cuando se avanza a 2026-10-19 sin haber jugado, entonces "Racha: 0 días" y la mejor racha sigue en 2 (en el registro guardado; en pantalla se ve en las estadísticas al jugar ese día).
- **CA-11** (RF-17) Dado el reto de 2026-10-15 abierto a las 23:59:50 GT, cuando se responde a las 00:00:10 del 2026-10-16, entonces la jugada se guarda con la fecha 2026-10-15; al abrir el reto, el de 2026-10-16 está disponible.
- **CA-12** (RF-20) Dado el reto en cada una de sus pantallas (por jugar, resultado, "Ya jugaste") a 360×640 y a 1280×800, entonces el ancho de desplazamiento no supera el ancho de la ventana, cada botón mide 48 px de alto o más, el foco empieza en el título, se completa el reto solo con teclado (Tab, Enter y teclas 1 a 4), y los contrastes son de 4,5:1 o más en tema claro y oscuro.
- **CA-13** (RF-18, RF-21) Dada la pestaña de red al abrir el Home y la entrada de Retos, entonces no hay ninguna petición del reto (ni de sus archivos, ni de los bancos). Dado un clic en "Reto del día" un día de pregunta, entonces no se descarga el banco de futbolistas; un día de futbolista, no se descarga el banco de preguntas. En ambos casos no hay ninguna petición a `/api/` ni a un host que no sea el sitio (o flagcdn.com, solo los días de futbolista). Dado `npm run build`, entonces el tamaño comprimido del paquete principal es igual al de `origin/main` (diferencia de 100 bytes o menos). *[enmendado por la adenda 2026-10-15; ver Enmiendas]* El código del reto es mínimo; el reparto en archivos que genera el empaquetador puede moverse, así que se informa la suma comprimida de los archivos de Retos antes y después, sin umbral.
- **CA-14** (RF-22, RF-23) Dado el reto abierto, cuando se toca "Salir", entonces se ve el Home sin diálogo de confirmación. Dado el cambio completo, entonces `scripts/retos.test.ts`, `scripts/trivia.test.ts`, `scripts/dedonde.test.ts`, `scripts/online-cliente.test.ts` y `npm run build` pasan sin cambiar ninguna aserción (solo `retos.test.ts` gana un comentario), y `git diff --stat origin/main` solo toca los archivos que enumera el plan. *[enmendado por la adenda 2026-10-15; ver Enmiendas]*
- **CA-15** (RF-24) Dado `privacidad.html`, entonces la sección de Retos Fútbol tiene una viñeta que nombra el Reto del día, lo que guarda y cómo borrarlo, y sigue diciendo que el duelo "en el mismo celular" no escribe nada en el almacenamiento.

## Seguridad (OWASP Top 10 2021)
- **A01 Control de acceso y A07 Autenticación:** no aplican; no hay servidor, cuentas ni datos de otras personas. El registro es del propio dispositivo (RF-13, RF-18).
- **A02 Fallas criptográficas:** no se guarda ni se transmite nada sensible: ni nombres, ni identificadores, ni la respuesta correcta (RF-13).
- **A03 Inyección:** todo texto entra con `h()` y `textContent` (RF-19, CA-9). Lo que viene del almacenamiento se reduce a números y fechas validadas y se pinta como texto; nunca se usa como marcado, atributo, clase ni dirección (RF-14, CA-7).
- **A04 Diseño inseguro:** el diseño no tiene nada que proteger a cambio de un incentivo: la racha no da premios ni ranking (Fuera de alcance), así que modificar el reloj o el registro solo afecta a quien lo hace. Se acepta como riesgo residual (ver Decisiones). La validación de RF-14 es todo o nada para que un registro a medias no produzca estados raros.
- **A05 Configuración de seguridad:** sin variables de entorno, sin cabeceras ni funciones nuevas (RF-18).
- **A06 Componentes vulnerables:** cero dependencias nuevas (RF-18, CA-9).
- **A08 Integridad de software y datos:** el almacenamiento local es entrada no confiable: se valida todo (tipos, rangos, coherencia, fechas reales, tamaño) antes de usar nada y se copia campo por campo a un objeto nuevo (RF-14, CA-7). No se carga código ni datos remotos: los bancos viajan con el sitio.
- **A09 Registro y monitoreo:** no se registra el contenido del almacenamiento; los fallos de lectura o escritura se tragan en silencio y se muestran como el aviso de RF-15.
- **A10 SSRF:** no aplica; el reto no hace peticiones (RF-18).
- **No empeorar lo que ya hay:** los bancos viajan con la respuesta correcta en el código, como en "Preguntas" y "¿De dónde es?". La fórmula del reto del día es pública y determinista, así que cualquiera puede calcular el reto de mañana; es lo mismo que leer el archivo del banco. No se agrega ninguna protección que los demás modos no tengan. Lo único que el reto cuida: la respuesta correcta no está en la pantalla antes de responder ni en el almacenamiento después.

## Decisiones
- **Fecha de Guatemala fija a UTC−6** (decisión del orquestador): todos ven el mismo reto el mismo día. Guatemala no usa horario de verano, así que no hace falta una base de zonas horarias.
- **Elección determinista por fecha, sin servidor** (decisión del orquestador): el orden de los elementos sale de un orden fijo disperso del banco, no de "día módulo tamaño", porque el archivo está agrupado por tema y por selección y días seguidos serían casi iguales (CA-3). Consecuencia aceptada: agregar o quitar elementos de un banco reordena los días siguientes, y si ocurre durante un despliegue, quien aún no jugó ese día puede ver otro reto. Quien ya jugó conserva su jugada (el registro es por fecha, no por pregunta).
- **Alternar pregunta y futbolista por la paridad del día:** simple, sin estado y deja a cada banco un día de por medio. Supuesto, no ordenado.
- **Sin reloj y sin puntos por rapidez:** el valor es volver cada día, no ganar un duelo; menos tensión y menos código. Supuesto.
- **La racha cuenta jugar, no acertar:** con una sola pregunta por día, castigar el fallo cortaría la racha por mala suerte y desanimaría justo a quien se quiere retener. Supuesto, fácil de cambiar si el usuario prefiere "acertar".
- **Sin mostrar otra vez el enunciado en "Ya jugaste":** no se guarda la pregunta ni la opción elegida (RF-13), así que no hay nada que mostrar; es menos dato guardado.
- **Historial de 7 días y contadores aparte:** alcanza para la tira de RF-12; la racha y los totales no dependen de que el historial sea largo.
- **Fecha posterior a hoy = registro inválido:** si el reloj del dispositivo se adelantó, jugó y luego se corrigió, la racha se pierde. Se prefiere eso a aceptar fechas imposibles. Quien cambia su reloj puede inflar su propia racha; se acepta porque no hay premios ni ranking.
- **Enmienda explícita a `specs/retos-futbol` RF-28 ("Retos no escribe en el almacenamiento del navegador"):** ya la matizó `specs/retos-en-linea` (identidad y perfil). Esta spec agrega una entrada más (`chamusqueros:reto-dia`), y solo al jugar el Reto del día. El duelo local sigue sin escribir nada. El comentario de `src/retos/online/cliente.ts` que decía "el único archivo de Retos que toca localStorage" se actualiza aquí (solo el comentario; decisión 2 del orquestador): ahora dice que es el único de `online/` y que fuera de `online/` solo lo hace `dia/almacen.ts`.
- **La guarda de `scripts/retos.test.ts` contra `localStorage` no se esquiva en silencio (decisión 3 del orquestador):** esa prueba solo recorre los archivos de primer nivel de `src/retos/`, así que `src/retos/dia/` queda fuera, igual que `online/`. La prueba gana un comentario que nombra a `dia/` como excepción aprobada por esta spec; `scripts/reto-del-dia.test.ts` fija que `localStorage` aparezca solo en `dia/almacen.ts` (CA-9).
- **Banderas en el futbolista:** se usan las de `flagcdn.com` que "¿De dónde es?" ya carga. Si la imagen no carga, el nombre del país sigue escrito al lado y se puede jugar. "Sin red" en esta spec significa sin servidor propio ni hosts nuevos, no sin imágenes.
- **Entrada en el Home, solo como texto (decisión del orquestador, 2026-10-15; reemplaza "Sin entrada en el Home"):** no hay botón nuevo en el Home; el reto vive en el menú de Retos. Pero la segunda línea del botón de Retos (`src/main.ts`, una sola línea, cambio localizado porque otras ramas editan ese archivo) pasa a "Duelos de 2 y un reto nuevo cada día" para que el reto se descubra sin entrar a Retos. *[enmendado por la adenda 2026-10-15; ver Enmiendas]*

## Aclaraciones resueltas
Decididas por el orquestador (fecha de Guatemala, almacenamiento local no confiable, sin servidor, sin proteger de más) o como supuesto explícito arriba (alternancia, sin reloj, racha por jugar, historial de 7 días, enunciado no repetido). No queda ninguna ambigüedad bloqueante.

## Adenda 2026-10-15: entrada desde el Home

Un reto que solo se alcanza por Home → Retos Fútbol → Reto del día no lo ve quien no entra a Retos. Esta adenda pone una fila propia en el Home. Cambia la entrada; el reto, su registro y sus reglas siguen igual.

### Enmiendas a la versión original
Lo siguiente reemplaza texto anterior de este spec. Lo que no está aquí sigue igual.
- RF-01, parte del Home ("nada más del Home cambia"): reemplazada por RF-25 a RF-28.
- Alcance, parte del Home: el botón de Retos ya no menciona el reto; lo reemplaza la fila de RF-25 (ver RF-28).
- **Fuera de alcance**, bullet de cambios en el Home: la fila de RF-25 queda dentro de alcance; el resto del Home sigue fuera.
- **Decisión "Entrada en el Home, solo como texto"**: reemplazada por la primera decisión de esta adenda.
- RF-21 ("el paquete principal del sitio no cambia") y CA-13 (±100 bytes): el paquete principal crece por la fila; ver CA-22 y CA-23.
- CA-14 y el plan (una línea en `src/main.ts`, solo estos archivos): la fila cambia `src/main.ts` en más de una línea y suma `src/style.css` (CA-25). `privacidad.html`, `package.json` y `package-lock.json` no cambian.

### Decisiones
- **Fila propia en el Home** (decisión del orquestador, 2026-10-15). Va entre el bloque de la carrera ("Empezar mi carrera" o "Continuar mi carrera") y el botón "Retos Fútbol", y no depende de nada guardado.
- **Aspecto:** igual que la fila de récord ("Tu récord"): mismo fondo, borde y radio, con el ícono a la izquierda. El ícono es un calendario en SVG en línea, del mismo estilo que el trofeo de esa fila, con `aria-hidden`. Texto: "Reto del día" (línea chica), "Un reto nuevo cada día. Cuidá tu racha." (negrita) y "Jugar ›" a la derecha. Toda la fila es un solo botón de al menos 44 px de alto.
- **Entrada directa:** tocar la fila abre el reto del día, no la entrada de Retos. "Volver a Retos" sigue llevando a la entrada de Retos, y "Salir" al Home, como hoy.
- **Subtítulo de vuelta:** el botón "Retos Fútbol" del Home vuelve a "Duelos de 2: en un solo celular o en línea", porque el reto ya tiene fila propia. Vale para sus dos apariciones.
- **Sin racha ni estado en el Home en esta versión:** `src/retos/dia/puro.ts` importa `dedonde.ts`, que importa `selecciones.ts`. Leer el registro desde el Home metería ese banco en el paquete principal, contra la carga diferida de RF-21. Ver "Fuera de alcance".
- **Sin dependencias nuevas, sin peticiones de red nuevas y sin cambios en el almacenamiento.**
- **Decisión propia de esta adenda (vetable):** en 360 px el texto puede partirse en dos líneas (RF-30). En una sola línea, el estilo de la fila de récord lo corta con puntos suspensivos y se pierde "Cuidá tu racha.". Si se quiere una línea, hay que cambiar el copy o el tamaño de letra, y eso se decide aparte.
- **Nombre `dia` y fila con `go()` (enmienda de implementación, 2026-10-15).** El resumen del orquestador pide `data-go="dia"`, `'dia'` en la unión de `go()` y `dia` en `destino`; el plan decía `reto-dia`. Se sigue el resumen y `plan.md` se actualiza en el mismo cambio. La fila usa `go()`, el helper que ya usan los demás botones del Home, en vez de escribir el `<button>` a mano (sin `type="button"`: fuera de un formulario no hace falta). Solo cambia el tipo de `go`, no su cuerpo. Ningún RF ni CA cambia.

### Requisitos funcionales
- **RF-25** El Home muestra la fila "Reto del día" entre el bloque de la carrera y el botón "Retos Fútbol" (su primera aparición). La fila aparece siempre: con o sin conexión, con o sin el modo en línea, con o sin carrera guardada.
- **RF-26** Toda la fila es un único control: tocarla en cualquier parte abre la pantalla "Reto del día" en un solo paso, sin pasar por la entrada de Retos Fútbol. Si el paquete de Retos no se puede bajar, se muestra el mismo aviso que el botón "Retos Fútbol".
- **RF-27** Desde esa pantalla, "Volver a Retos" lleva a la entrada de Retos Fútbol, y "Salir" lleva al Home sin pedir confirmación.
- **RF-28** Los dos botones "Retos Fútbol" del Home muestran el subtítulo "Duelos de 2: en un solo celular o en línea". Reemplaza el texto de RF-01 para el Home.
- **RF-29** Al abrir el Home, la fila no muestra racha, fecha, estado ni resultado del reto, y el Home no lee ningún dato guardado para el reto. Abrir el Home no pide ningún archivo de Retos. Al tocar la fila se descarga lo necesario para el reto del día, y solo el banco de hoy (RF-21). La fila no agrega dependencias, peticiones de red ni escrituras en el almacenamiento, y el paquete principal no incluye el código ni los bancos del reto.
- **RF-30** A 360 px de ancho, el texto de la fila se lee completo: puede partirse en dos líneas, pero no se corta con puntos suspensivos ni se oculta.

### Criterios de aceptación
Medidas con el almacenamiento vacío, salvo donde se diga.
- **CA-16** (RF-25) Dado el Home a 390×844 sin carrera guardada, cuando se carga sin desplazarse, entonces la fila completa se ve entre "Empezar mi carrera" y "Retos Fútbol". Con una carrera guardada, se informa la posición de la fila (sin umbral).
- **CA-17** (RF-26) Dado el Home, cuando se toca la fila una vez, entonces la primera pantalla es la del reto: su título (h1) es "Reto del día" y la entrada de Retos Fútbol no aparece en el camino.
- **CA-18** (RF-27) Dado el reto abierto desde la fila, cuando se toca "Volver a Retos", entonces se ve la entrada de Retos Fútbol (h1 "Retos Fútbol"). Cuando se toca "Salir", entonces se ve el Home sin diálogo de confirmación; igual desde la entrada de Retos.
- **CA-19** (RF-26) Dada la fila, entonces es un único botón que contiene "Reto del día" y "Jugar ›", mide 44 px de alto o más en 360×640 y en 390×844, y se activa con Tab y Enter.
- **CA-20** (RF-30) Dado el Home a 360×640, entonces no hay desplazamiento horizontal (el ancho de desplazamiento no supera el de la ventana) y la fila muestra "Un reto nuevo cada día. Cuidá tu racha." completo, en una o dos líneas, sin puntos suspensivos.
- **CA-21** (RF-28) Dado el código del Home, entonces "Duelos de 2: en un solo celular o en línea" aparece una vez en `src/main.ts` (la función que pinta los dos botones) y "Duelos de 2 y un reto nuevo cada día" aparece 0 veces.
- **CA-22** (RF-29) Dada la pestaña de red al abrir el Home sin tocar nada, comparada con `origin/main`, entonces no hay peticiones nuevas (ni archivos de Retos ni `/api/`). Dado `src/main.ts`, entonces no importa de `./retos/dia`, `./retos/dedonde` ni `./retos/selecciones`, y su diff no añade `localStorage`, `fetch(` ni dependencias.
- **CA-23** (RF-29; reemplaza a RF-21 y CA-13 en el paquete principal) Dado `npm run build`, entonces el JS del paquete principal, comprimido (gzip), crece 1.000 bytes o menos respecto de `origin/main`, y no contiene ni un enunciado de `preguntas.json` ni un nombre de `futbolistas.json` (se buscan una frase de cada uno que no aparezca en el resto del código).
- **CA-24** (regresión) Dado el cambio, entonces `npm run build` y `npx tsx` de `scripts/reto-del-dia.test.ts`, `scripts/retos.test.ts`, `scripts/retar-desde-final.test.ts`, `scripts/continuar-carrera.test.ts` y `scripts/contador-carreras.test.ts` pasan sin cambiar ninguna aserción.
- **CA-25** (alcance) Dado `git diff --stat origin/main`, entonces solo aparecen `specs/reto-del-dia/*`, `src/main.ts`, `src/retos/index.ts` y `src/style.css`; `package.json`, `package-lock.json`, `privacidad.html` y `src/retos/dia/*` no cambian.

### Fuera de alcance (adenda)
- Racha, fecha o estado del reto en el Home. Siguiente paso posible: mover el registro (`desdeTexto`, `validar`, `registrar`, `rachaVigente`) a un módulo que no importe los bancos, para que el Home lo lea sin subir `selecciones` al paquete principal. Eso pide su propia spec o una adenda.
- Una segunda fila del reto en la sección "Retos Fútbol" de más abajo. Hay una sola fila, arriba.

### Seguridad (OWASP Top 10)
- **A03 Inyección:** el marcado de la fila es un literal fijo, sin datos del usuario ni del almacenamiento (RF-29). *Cumplido:* la fila es un literal pasado a `go()`, sin variables; el diff de `src/main.ts` no añade interpolaciones ni `innerHTML` (CA-22, revisado con `git diff`).
- **A06 Componentes vulnerables:** cero dependencias nuevas (RF-29, CA-22). *Cumplido:* `git diff origin/main -- package.json package-lock.json` sale vacío, y `src/main.ts` no añade imports nuevos.
- **A08 Integridad de datos:** el Home no lee ni escribe almacenamiento para el reto, y no hay datos remotos nuevos (RF-29, CA-22). *Cumplido:* el diff de `src/main.ts` no añade `localStorage` ni `fetch(`, y no importa nada de `./retos/dia`, `./retos/dedonde` ni `./retos/selecciones` (verificado con `grep`).
- **Resto (A01, A02, A04, A05, A07, A09, A10):** no aplica; la fila no pide, guarda ni muestra nada del usuario.
