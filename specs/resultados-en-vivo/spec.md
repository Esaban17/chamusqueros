# Resultados de fútbol en vivo en el navbar

## Problema y valor
Casi todos los jugadores entran desde el celular, en Guatemala. Chamusqueros es un juego de fútbol, pero no sabe nada del fútbol que se juega hoy: quien abre el sitio mientras hay un partido no ve nada de eso. El usuario pidió "resultados de fútbol en vivo de partidos que se estén jugando" arriba, y que se valide si existe una API gratuita.
Valor: una razón para abrir el juego mientras hay partido (Liga Nacional, Liga MX, selecciones, Champions), sin costo para el usuario ni para el proyecto.
Si no se hace: el sitio sigue siendo una pantalla estática sin relación con el fútbol real.

## Decisiones (ya tomadas)
Tomadas por el orquestador y el usuario tras investigar; no se reabren aquí.
- **D1 Dos fuentes de datos.** API-Football (api-sports.io) quedó descartada porque ya no tiene plan gratuito (lo confirmó el usuario). Se usan:
  - **Fuente A: football-data.org v4, plan gratuito.** Oficial, requiere registro y llave. Plan gratis: 12 competencias, 10 consultas por minuto, sin tope diario publicado y **marcadores retrasados** (la página de precios no dice cuánto). Cubre lo europeo y lo internacional: Champions League, Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, Brasileirão, Mundial y Eurocopa.
  - **Fuente B: endpoints públicos NO oficiales de ESPN, sin llave.** Cubre lo que A no tiene: Liga Nacional de Guatemala, Centroamérica, Liga MX, MLS y competencias de Concacaf y de selecciones.
  - Cada competencia pertenece a **una sola fuente**; nunca se muestra el mismo partido de dos fuentes.
  - **Prohibido** raspar páginas HTML (Google, ESPN, Sofascore o cualquier sitio): solo se consumen las respuestas JSON citadas arriba.
- **D2 Riesgo aceptado por el usuario sobre ESPN (decisión explícita).** Los endpoints de ESPN no están documentados, pueden cambiar o desaparecer sin aviso, y los términos de ESPN restringen el uso de su contenido. Por eso:
  - El adaptador de ESPN **falla en silencio**: si la forma de lo que responde no valida, se descarta y la barra muestra solo la fuente A (o nada).
  - ESPN se puede **apagar con una variable de entorno** (`ESPN_EN_VIVO=off`) sin cambiar código (Vercel exige redesplegar para que una variable nueva rija).
  - De ESPN solo se usa **texto**: ningún logo ni imagen.
  - La fuente se cita en la propia barra y en los textos legales.
- **D3 Caché compartida por fuente, en un servidor propio.** El navegador nunca habla con los proveedores. Cada fuente tiene su ritmo: football-data.org se consulta como máximo cada **2 minutos** (muy por debajo de las 10 por minuto) y ESPN como máximo cada **3 minutos** (una consulta por liga de la lista, en paralelo y con tiempo límite). Con error de una fuente se sirve lo último guardado de esa fuente, con su antigüedad. Dos solicitudes simultáneas con la caché vencida gastan **una** consulta, no dos. Sin partidos en vivo, la respuesta vacía también se guarda y la barra se oculta.
- **D4 Ligas relevantes, de una lista curada** (los códigos exactos y su estado de verificación están en el plan):
  - ESPN: Liga Nacional de Guatemala; Costa Rica, Honduras, El Salvador y Panamá; Concacaf Champions Cup; Liga MX; MLS; Copa Oro, Liga de Naciones Concacaf, eliminatorias de Concacaf, Copa América y Liga de Naciones UEFA.
  - football-data.org: Champions League, Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, Mundial, Eurocopa y Brasileirão.
  - Orden de la barra: Guatemala y Centroamérica primero (ESPN), luego México y MLS, luego Europa (football-data.org) y las selecciones, y al final el Brasileirão.
- **D5 Secretos e interruptores.** La llave de football-data.org vive solo en `FOOTBALL_DATA_KEY`, variable de entorno del servidor; nunca llega al navegador ni a git. Sin esa llave la fuente A se apaga y el resto sigue. ESPN no usa llave.
- **D6 Solo texto.** Sin escudos ni imágenes de terceros; sin dependencias nuevas.
- **D7 Aislamiento.** La barra es un módulo propio con una sola línea de integración en el código existente, porque otras features (Retos Fútbol, Premios y trofeos, Tienda) tocan `home()`, la navegación y los mismos archivos.
- **D8 Pantallas (decidida por el redactor).** La barra aparece en todas las pantallas **excepto mientras hay un minijuego en pantalla** (altura fija y temporizadores de 15 s a 360 px), y se monta una sola vez para que su ciclo de 2 minutos no se reinicie al navegar.
- **D9 Un chip "EN VIVO" por barra, no uno por partido.** El punto rojo y el rótulo van una sola vez al inicio; cada partido muestra liga, equipos, marcador y minuto. Con 8 partidos, 8 puntos rojos serían ruido en 360 px.
- **D10 Honestidad sobre el retraso.** Nuestra parte suma hasta ~6 minutos (caché de 3 min, CDN de 1 min, refresco del navegador de 2 min); a eso se agrega el retraso propio del proveedor, que en football-data.org gratis existe y no tiene cifra publicada. La barra muestra "act. hace X min" (mide nuestra caché, no el retraso del proveedor), rotula la fuente A como "con retraso" y los términos lo dicen.

## Alcance
Barra delgada fija arriba con los partidos en vivo de la lista curada; servidor intermediario con caché por fuente; actualización periódica solo con la pestaña visible; atribución a las fuentes; textos legales (privacidad y términos); pasos de activación y verificación.

## Fuera de alcance
Goles, tarjetas y alineaciones; partidos programados o terminados; escudos; notificaciones; favoritos o filtros por usuario; otros deportes; marcadores en tiempo real; API-Football; cabeceras de seguridad o CSP globales (ya es un hallazgo de `specs/home-landing`; no existe `vercel.json`); cualquier cambio de `home()`, `footer()`, `render()` o del ranking.

## Requisitos funcionales
- **RF-01 Visibilidad.** La barra se ve solo si hay al menos un partido en vivo de la lista curada con datos de menos de 30 minutos de antigüedad. En cualquier otro caso (sin partidos, sin fuentes activas, error sin datos recientes, sin red) está oculta y no ocupa altura.
- **RF-02 Contenido.** Al inicio, un chip fijo con punto rojo, el rótulo "EN VIVO" y "act. hace X min". Después, un elemento por partido con: liga (nombre corto propio, no el del proveedor), equipo local, marcador, equipo visitante y minuto o estado ("Medio tiempo", "Penales" o "En juego" si el proveedor no da minuto). Al final de la lista, un elemento de atribución "Datos: football-data.org (con retraso) · ESPN", que nombra solo las fuentes con partidos en pantalla.
- **RF-03 Orden.** Según el orden fijo de la tabla del plan (Guatemala y Centroamérica, México y MLS, Europa, selecciones, Brasileirão); dentro de la misma liga, el partido con más minutos jugados primero.
- **RF-04 Filtro y tope.** Solo aparecen partidos de las ligas de D4 y, como máximo, 30. Un partido de otra liga nunca aparece.
- **RF-05 Gesto y movimiento.** La lista se desliza horizontalmente con el dedo. Nada se mueve solo: sin marquesina, sin autodesplazamiento y sin animaciones, con o sin `prefers-reduced-motion`.
- **RF-06 Antigüedad.** "act. hace X min" muestra X entero redondeado hacia abajo ("act. ahora" si pasó menos de 1 minuto). Se calcula con la fuente **más vieja** entre las que aportan partidos en pantalla, y se actualiza sin pedir datos nuevos.
- **RF-07 Actualización del navegador.** Pide datos al cargar y luego cada 2 minutos, solo con la pestaña visible. Con la pestaña oculta no hace ninguna solicitud; al volver a verse, si pasaron 2 minutos o más desde la última, pide de inmediato.
- **RF-08 Ritmo hacia los proveedores.** Sin importar cuántos usuarios o solicitudes concurrentes haya: como máximo 1 consulta a football-data.org cada 2 minutos y 1 ronda a ESPN (una consulta por liga de la lista) cada 3 minutos.
- **RF-09 Degradación independiente.** Un error, tiempo agotado, respuesta inválida o forma inesperada en una fuente no afecta a la otra. De la fuente que falla se sigue sirviendo lo último guardado mientras tenga menos de 30 minutos; después se omite. Un error no reemplaza lo guardado ni dispara otra consulta antes de que venza el ritmo de esa fuente. Si una liga de ESPN falla, solo esa liga se omite; si fallan todas, no se reemplaza lo guardado.
- **RF-10 Interruptores.** Sin `FOOTBALL_DATA_KEY`, la fuente A no se consulta y la barra puede mostrar solo ESPN. Con `ESPN_EN_VIVO=off`, ESPN no se consulta **ni se sirve** lo que hubiera guardado. Sin ninguna fuente activa, el servidor responde vacío sin tocar la base, la barra no aparece y el juego funciona igual, sin errores visibles.
- **RF-11 Secreto.** La llave no aparece en ninguna respuesta, en el código empaquetado para el navegador, en los registros ni en git.
- **RF-12 Pantallas.** La barra aparece en Home, ranking, creación, debut, temporadas y final de carrera, y se oculta mientras hay un minijuego en pantalla. Navegar entre pantallas no la recrea ni reinicia el ciclo de 2 minutos.
- **RF-13 Accesibilidad.** Región con nombre accesible ("Resultados de fútbol en vivo"); la lista es alcanzable y desplazable con teclado; los cambios de datos no se anuncian automáticamente a lectores de pantalla; contraste de texto >= 4,5:1 en claro y oscuro; texto >= 12 px; el punto rojo nunca es la única señal (siempre va con el texto "EN VIVO").
- **RF-14 Diseño a 360 px.** Sin scroll horizontal de la página; la barra mide <= 44 px de alto; empuja el contenido (no lo tapa); y la regla de `specs/home-landing` CA-1 sigue cumpliéndose con la barra visible (borde inferior de "Empezar mi carrera" a <= 560 px del tope a 360x640).
- **RF-15 Texto de terceros.** Nombres de equipos y de ligas nunca se interpretan como HTML.
- **RF-16 Legal.** `privacidad.html` dice que los resultados vienen de proveedores externos (football-data.org y ESPN) consultados por nuestro servidor, y que no se envía ningún dato del usuario a ellos. `terminos.html` dice que los marcadores son informativos y pueden tener retraso o errores, y que no hay afiliación con ESPN ni football-data.org. Ambas nombran las fuentes.
- **RF-17 Activación y pruebas sin llaves.** El plan trae los pasos para registrarse, cargar la llave en Vercel, aplicar la migración y apagar ESPN. Las pruebas automáticas del servidor y de la barra corren sin llaves y sin red, con respuestas de ejemplo de ambas fuentes.

## Criterios de aceptación
"Fixture" = respuesta de ejemplo de una fuente guardada en el repo (ver plan).
- **CA-1** Fixtures con 5 partidos de ligas de la lista (3 de A, 2 de B) y 3 de ligas fuera de la lista: la barra muestra exactamente los 5, en el orden esperado por el plan. (RF-02, RF-03, RF-04)
- **CA-2** Fixtures con 35 partidos de ligas de la lista: la respuesta del servidor trae exactamente 30. (RF-04)
- **CA-3** Respuesta vacía o sin fuentes activas: el elemento de la barra tiene `hidden` y el `scrollHeight` del documento es igual al que había sin la feature. (RF-01, RF-10)
- **CA-4** 20 solicitudes simultáneas con ambas cachés vencidas: football-data.org recibe exactamente 1 consulta y cada liga de ESPN exactamente 1. (RF-08)
- **CA-5** Caché de A de 1 min 59 s: 0 consultas; de 2 min 00 s: 1. Caché de ESPN de 2 min 59 s: 0; de 3 min 00 s: 1. (RF-08)
- **CA-6** football-data.org responde 429, 500, expira (5 s), devuelve JSON inválido o una forma sin `matches`: la respuesta es 200, lo guardado de A no cambia y ESPN sigue aportando partidos. (RF-09)
- **CA-7** ESPN responde con una forma inesperada (sin `events`, o con `state` no reconocido), 403, 404 o expira (4 s) en todas las ligas: la respuesta es 200 con solo los partidos de A, lo guardado de ESPN no cambia y se registra un aviso sin datos sensibles. Si falla una sola liga, las demás siguen apareciendo. (RF-09, D2)
- **CA-8** Lo guardado de una fuente tiene 31 minutos: no aporta partidos. Con 29 minutos: sí. (RF-01, RF-09)
- **CA-9** `ESPN_EN_VIVO=off` con ESPN guardado de hace 1 minuto: 0 consultas a ESPN y 0 partidos de ESPN en la respuesta. Sin `FOOTBALL_DATA_KEY`: 0 consultas a football-data.org y la respuesta puede traer ESPN. Sin ambas: 0 consultas a la base, respuesta vacía con código 200. (RF-10)
- **CA-10** La respuesta lleva `Cache-Control` con `s-maxage` entre 30 y 120 s, y solo contiene estos campos por partido: `fuente`, `liga`, `local`, `visita`, `gl`, `gv`, `estado`, `minuto` (sin logos, ni IDs de equipo, ni URLs, ni la llave). (RF-11)
- **CA-11** Un equipo de cada fixture llamado `<img src=x onerror=window.__x=1>`: tras pintar la barra, `window.__x` es `undefined` y el nombre se ve como texto. (RF-15)
- **CA-12** Con `prefers-reduced-motion: reduce` y sin tocar la pantalla durante 10 s: `scrollLeft` de la lista no cambia y ningún elemento de la barra tiene animación ni transición activa. Sin esa preferencia, igual. (RF-05)
- **CA-13** Con reloj simulado y pestaña visible durante 6 minutos: 4 solicitudes en total (t = 0, 2, 4, 6 min). Con pestaña oculta durante 6 minutos: 0 solicitudes adicionales; al volver a verse: 1 solicitud inmediata. (RF-07)
- **CA-14** Datos con la fuente más vieja de hace 3 min 40 s: el chip dice "act. hace 3 min"; de hace 20 s: "act. ahora". (RF-06)
- **CA-15** A 360x640 con 5 partidos: la barra mide <= 44 px, `scrollWidth` del documento <= 360 y el borde inferior de "Empezar mi carrera" del Home queda a <= 560 px del tope. A 360x640 sin partidos el valor es el mismo que hoy. (RF-14)
- **CA-16** Contraste medido del texto de la barra, del chip y del texto de atribución >= 4,5:1 en tema claro y oscuro. (RF-13)
- **CA-17** Con un minijuego en pantalla la barra no se ve; al terminarlo y volver a otra pantalla, se ve de nuevo sin haber pedido datos extra. (RF-12)
- **CA-18** `npm run build` termina con código 0; `package.json` no cambia sus dependencias; el valor de `FOOTBALL_DATA_KEY` no aparece en `dist/` ni en `git grep`; ninguna variable nueva empieza por `VITE_`. (RF-11, D6)
- **CA-19** `privacidad.html` contiene "football-data.org", "ESPN" y "no enviamos"; `terminos.html` contiene "football-data.org", "ESPN" y "retraso". (RF-16)
- **CA-20** Antes de publicar, en la vista previa de Vercel: (a) football-data.org devolvió al menos un partido en vivo con las llaves reales o `matches: []` sin error; (b) cada código de liga de ESPN respondió 200 o fue retirado de la lista; (c) la Liga Nacional de Guatemala respondió desde la red de Vercel; (d) la tabla del plan no tiene filas "por verificar". (D1, D4)

## Seguridad (OWASP Top 10)
Detalle en `plan.md`. Resumen de lo exigido:
- **A02/A05** la llave solo en el entorno del servidor, en un header (nunca en la URL); respuestas con `Content-Type` JSON y `X-Content-Type-Options: nosniff`.
- **A10** el servidor solo consulta dos hosts fijos (`api.football-data.org` y `site.api.espn.com`); ningún dato del usuario forma parte de las URLs.
- **A04** el ritmo por fuente (1 consulta/2 min y 1 ronda/3 min) vale aunque lluevan solicitudes; el CDN absorbe lo demás.
- **A03** textos de terceros solo como texto, nunca como HTML.
- **A08** cada respuesta de proveedor se valida y sanea antes de guardarla; no se confía en su forma (en ESPN, menos que en nadie).
- **A09** los registros no contienen la llave. **A06** sin dependencias nuevas.
- A01, A07: no aplican (dato público de solo lectura, sin cuentas).

## Aclaraciones
El entorno donde se redactó esta spec no puede alcanzar los proveedores (la red corporativa del usuario bloquea la categoría "Deportes"), así que la forma de las respuestas se tomó de la documentación espejada en Context7 (football-data.org) y de repositorios públicos (ESPN); ver `plan.md`. Lo que sigue **bloquea publicar, no implementar** (se implementa con fixtures):
- [NECESITA ACLARACIÓN: ¿los términos de football-data.org permiten mostrar sus datos en un sitio público gratuito y exigen una atribución determinada (texto o enlace)? No se pudo leer la página de términos. Por defecto la spec atribuye en la barra y en los textos legales (RF-02, RF-16); si exigen un enlace, se agrega al elemento de atribución. Se lee al registrarse.]
- [NECESITA ACLARACIÓN: ¿qué devuelve `status=LIVE` en el plan gratis de football-data.org en un día de partidos: partidos con marcador retrasado, con minuto o sin él, o una lista vacía? Los precios dicen "scores delayed" sin cifra y la documentación muestra tres formas distintas del marcador. Se comprueba en la vista previa de Vercel un día con partidos (plan, T11).]
- [NECESITA ACLARACIÓN: ¿responde ESPN a las funciones de Vercel? Un repositorio público registró un 403 de Akamai contra `site.api.espn.com` desde otra red. Si ESPN no responde desde Vercel, **no habría Liga Nacional, ni Centroamérica, ni México**, y la barra mostraría solo Europa y el Mundial. ¿Se publica igual con solo la fuente A, o se espera? Por defecto: no se publica sin que responda al menos la Liga Nacional (CA-20 c).]
- [NECESITA ACLARACIÓN: códigos de liga de ESPN. `gua.1`, `hon.1`, `mex.1`, `usa.1`, `concacaf.champions` y `concacaf.gold` aparecen en varios repositorios públicos; `slv.1`, `pan.1` y `concacaf.nations.league` en listas de candidatos; `crc.1`, `fifa.worldq.concacaf`, `uefa.nations` y `conmebol.america` no se encontraron con certeza. Se confirman en la vista previa o abriendo cada URL en el navegador de un celular (red no corporativa); la que no responda se retira.]

No bloqueantes (el defecto indicado se aplica si nadie responde):
- [NECESITA ACLARACIÓN: con marcadores retrasados, ¿se mantiene el rótulo "EN VIVO"? Por defecto sí, como pidió el usuario, con "act. hace X min" y la fuente A rotulada "con retraso".]
- [NECESITA ACLARACIÓN: ¿amistosos de selecciones? Por defecto no: no estaban en D4 y llenarían la barra en fechas FIFA.]
