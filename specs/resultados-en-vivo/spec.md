# Resultados de fútbol en vivo en el navbar

## Problema y valor
Casi todos los jugadores entran desde el celular, en Guatemala. Chamusqueros es un juego de fútbol, pero no sabe nada del fútbol que se juega hoy: quien abre el sitio mientras hay un partido no ve nada de eso. El usuario pidió "resultados de fútbol en vivo de partidos que se estén jugando" arriba, y que se valide si existe una API gratuita.
Valor: una razón para abrir el juego mientras hay partido (Liga Nacional, Liga MX, selecciones, Champions), sin costo para el usuario ni para el proyecto.
Si no se hace: el sitio sigue siendo una pantalla estática sin relación con el fútbol real.

## Decisiones (ya tomadas)
Tomadas por el orquestador y el usuario tras investigar; no se reabren aquí.
- **D1 Una sola fuente: ESPN.** Decisión del usuario: **solo ESPN, riesgo aceptado, sin proveedor oficial.** API-Football (api-sports.io) quedó descartada porque ya no tiene plan gratuito, y football-data.org se descartó por decisión del usuario (la versión anterior de esta spec lo usaba como segunda fuente; ya no existe en el diseño). La fuente son los **endpoints públicos NO oficiales de ESPN**, sin llave: cubre Guatemala y Centroamérica, México y MLS, Europa y las selecciones.
  - **Prohibido** raspar páginas HTML (Google, ESPN, Sofascore o cualquier sitio): solo se consumen las respuestas JSON de `site.api.espn.com`.
- **D2 Riesgo aceptado por el usuario sobre ESPN (decisión explícita).** Los endpoints de ESPN no están documentados, pueden cambiar o desaparecer sin aviso, y los términos de ESPN restringen el uso de su contenido. Por eso:
  - El adaptador **falla en silencio**: si la forma de lo que responde no valida, se descarta y la barra se oculta. Si ESPN falla por completo (bloquea a Vercel o cambia su forma), la barra no aparece y el juego funciona igual.
  - La feature se puede **apagar con una variable de entorno** (`ESPN_EN_VIVO=off`) sin cambiar código (Vercel exige redesplegar para que una variable nueva rija). Como ESPN es la única fuente, apaga toda la feature.
  - De ESPN solo se usa **texto**: ningún logo ni imagen.
  - La fuente se cita en la propia barra ("Datos: ESPN") y en los textos legales.
- **D3 Caché compartida en un servidor propio, bajo demanda.** El navegador nunca habla con ESPN. El servidor consulta a ESPN **solo cuando alguien pide `/api/en-vivo` y la caché venció**: sin visitantes no hay llamadas. La caché dura **3 minutos como mínimo**. Una ronda consulta una vez cada liga de la lista (22), **de a 5 en paralelo** (concurrencia limitada), cada liga con su tiempo límite y la ronda entera con otro. Si una liga falla se omite y las demás siguen. Con error de toda la ronda se sirve lo último guardado, con su antigüedad. Dos solicitudes simultáneas con la caché vencida gastan **una** ronda, no dos. Sin partidos en vivo, la respuesta vacía también se guarda y la barra se oculta.
- **D4 Ligas relevantes, de una lista curada** (los códigos exactos y su estado de verificación están en el plan; todos son candidatos hasta la T11):
  - Guatemala y Centroamérica: Liga Nacional de Guatemala, Costa Rica, Honduras, El Salvador, Panamá, Concacaf Champions Cup.
  - México y EE. UU.: Liga MX, MLS.
  - Europa y lo internacional: Champions League, Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, Libertadores, Mundial, Eurocopa, Copa Oro, Liga de Naciones Concacaf, eliminatorias de Concacaf, Copa América y Liga de Naciones UEFA.
  - Orden de la barra: el de esa lista. El Brasileirão, que figuraba en la versión con football-data.org, no se pidió para ESPN y queda fuera.
- **D5 Sin secretos.** ESPN no usa llave ni credencial: no hay secretos en esta feature. La única variable es el interruptor `ESPN_EN_VIVO`.
- **D6 Solo texto.** Sin escudos ni imágenes de terceros; sin dependencias nuevas.
- **D7 Aislamiento.** La barra es un módulo propio con una sola línea de integración en el código existente, porque otras features (Retos Fútbol, Premios y trofeos, Tienda) tocan `home()`, la navegación y los mismos archivos.
- **D8 Pantallas (decidida por el redactor).** La barra aparece en todas las pantallas **excepto mientras hay un minijuego en pantalla** (altura fija y temporizadores de 15 s a 360 px), y se monta una sola vez para que su ciclo de 2 minutos no se reinicie al navegar.
- **D9 Un chip "EN VIVO" por barra, no uno por partido.** El punto rojo y el rótulo van una sola vez al inicio; cada partido muestra liga, equipos, marcador y minuto. Con 8 partidos, 8 puntos rojos serían ruido en 360 px.
- **D10 Honestidad sobre el retraso.** Nuestra parte suma hasta ~6 minutos (caché de 3 min, CDN de 1 min, refresco del navegador de 2 min); ESPN agrega el suyo. La barra muestra "act. hace X min" (mide nuestra caché) y los términos dicen que puede haber retraso de varios minutos. El rótulo "EN VIVO" se mantiene.

## Alcance
Barra delgada fija arriba con los partidos en vivo de la lista curada; servidor intermediario con caché; actualización periódica solo con la pestaña visible; atribución a ESPN; textos legales (privacidad y términos); pasos de activación y verificación.

## Fuera de alcance
Goles, tarjetas y alineaciones; partidos programados o terminados; escudos; notificaciones; favoritos o filtros por usuario; otros deportes; marcadores en tiempo real; amistosos de selecciones; cualquier otro proveedor (API-Football, football-data.org); cabeceras de seguridad o CSP globales (ya es un hallazgo de `specs/home-landing`; no existe `vercel.json`); cualquier cambio de `home()`, `footer()`, `render()` o del ranking.

## Requisitos funcionales
- **RF-01 Visibilidad.** La barra se ve solo si hay al menos un partido en vivo de la lista curada con datos de menos de 30 minutos de antigüedad. En cualquier otro caso (sin partidos, feature apagada, ESPN caído sin datos recientes, sin red) está oculta y no ocupa altura.
- **RF-02 Contenido.** Al inicio, un chip fijo con punto rojo, el rótulo "EN VIVO" y "act. hace X min". Después, un elemento por partido con: liga (nombre corto propio, no el del proveedor), equipo local, marcador ("vs" si se desconoce), equipo visitante y minuto o estado ("Medio tiempo", "Penales" o "En juego" si ESPN no da minuto). Al final de la lista, un elemento de atribución "Datos: ESPN".
- **RF-03 Orden.** Según el orden fijo de la tabla del plan; dentro de la misma liga, el partido con más minutos jugados primero (sin minuto, al final).
- **RF-04 Filtro y tope.** Solo aparecen partidos de las ligas de D4 y, como máximo, 30. Un partido de otra liga nunca aparece.
- **RF-05 Gesto y movimiento.** La lista se desliza horizontalmente con el dedo. Nada se mueve solo: sin marquesina, sin autodesplazamiento y sin animaciones, con o sin `prefers-reduced-motion`.
- **RF-06 Antigüedad.** "act. hace X min" muestra X entero redondeado hacia abajo ("act. ahora" si pasó menos de 1 minuto), y se actualiza sin pedir datos nuevos.
- **RF-07 Actualización del navegador.** Pide datos al cargar y luego cada 2 minutos, solo con la pestaña visible. Con la pestaña oculta no hace ninguna solicitud; al volver a verse, si pasaron 2 minutos o más desde la última, pide de inmediato.
- **RF-08 Ritmo hacia ESPN.** Sin importar cuántos usuarios o solicitudes concurrentes haya: como máximo 1 ronda (una consulta por liga de la lista) cada 3 minutos, con no más de 5 consultas a la vez, y ninguna consulta si nadie pide datos.
- **RF-09 Degradación por liga y por ronda.** Un error, tiempo agotado, respuesta inválida o forma inesperada en una liga solo omite esa liga. Si fallan todas, no se reemplaza lo guardado: se sigue sirviendo lo último guardado mientras tenga menos de 30 minutos; después se omite. Un error no dispara otra ronda antes de que venza el ritmo.
- **RF-10 Interruptor.** Con `ESPN_EN_VIVO=off`, ESPN no se consulta **ni se sirve** lo que hubiera guardado, el servidor responde vacío sin tocar la base, la barra no aparece y el juego funciona igual, sin errores visibles. Solo el valor exacto `off` apaga.
- **RF-11 Sin credenciales y sin fugas.** La feature no usa llaves ni credenciales. Los registros solo llevan el slug de la liga y un motivo corto; nunca cuerpos de respuesta ni encabezados. El servidor solo consulta `site.api.espn.com` y ningún dato del usuario forma parte de las URLs.
- **RF-12 Pantallas.** La barra aparece en Home, ranking, creación, debut, temporadas y final de carrera, y se oculta mientras hay un minijuego en pantalla. Navegar entre pantallas no la recrea ni reinicia el ciclo de 2 minutos.
- **RF-13 Accesibilidad.** Región con nombre accesible ("Resultados de fútbol en vivo"); la lista es alcanzable y desplazable con teclado; los cambios de datos no se anuncian automáticamente a lectores de pantalla; contraste de texto >= 4,5:1 en claro y oscuro; texto >= 12 px; el punto rojo nunca es la única señal (siempre va con el texto "EN VIVO").
- **RF-14 Diseño a 360 px.** Sin scroll horizontal de la página; la barra mide <= 44 px de alto; empuja el contenido (no lo tapa); y la regla de `specs/home-landing` CA-1 sigue cumpliéndose con la barra visible (borde inferior de "Empezar mi carrera" a <= 560 px del tope a 360x640).
- **RF-15 Texto de terceros.** Nombres de equipos y de ligas nunca se interpretan como HTML.
- **RF-16 Legal.** `privacidad.html` dice que los resultados vienen de un proveedor externo (ESPN) consultado por nuestro servidor, y que no se envía ningún dato del usuario a él. `terminos.html` dice que los marcadores son informativos y pueden tener retraso o errores, y que no hay afiliación con ESPN. Ambas nombran la fuente.
- **RF-17 Activación y pruebas sin red.** El plan trae los pasos para aplicar la migración, verificar en una vista previa y apagar la feature. Las pruebas automáticas del servidor y de la barra corren sin red, con respuestas de ejemplo.

## Criterios de aceptación
"Fixture" = respuesta de ejemplo de ESPN guardada en el repo (ver plan).
- **CA-1** Fixture con partidos `in`, `pre`, `post` y medio tiempo en una liga de la lista: la respuesta trae solo los que están en juego (o en medio tiempo), con la etiqueta propia de la liga y en el orden del plan. (RF-02, RF-03, RF-04)
- **CA-2** Fixtures con 35 partidos de ligas de la lista: la respuesta del servidor trae exactamente 30. (RF-04)
- **CA-3** Respuesta vacía o feature apagada: el elemento de la barra tiene `hidden` y el `scrollHeight` del documento es igual al que había sin la feature. (RF-01, RF-10)
- **CA-4** 20 solicitudes simultáneas con la caché vencida: cada liga de ESPN recibe exactamente 1 consulta. (RF-08)
- **CA-5** Caché de 2 min 59 s: 0 consultas; de 3 min 00 s: 1 ronda. (RF-08)
- **CA-5b** Nunca hay más de 5 consultas a ESPN en vuelo a la vez. (RF-08)
- **CA-6** ESPN responde 403, 404, 500, error de red, tiempo agotado (4 s por liga, 8 s por ronda), JSON inválido, cuerpo gigante, forma inesperada (sin `events`) o `state` no reconocido **en todas las ligas**: la respuesta es 200, lo guardado no cambia, se sigue sirviendo lo último guardado y se registra un aviso sin datos sensibles; sin nada guardado, la respuesta es vacía y la barra se oculta. (RF-09, D2)
- **CA-7** Si falla una sola liga (404, tiempo, forma), las demás siguen apareciendo y solo se registra esa. (RF-09)
- **CA-8** Lo guardado tiene 31 minutos: no aporta partidos. Con 29 minutos: sí. (RF-01, RF-09)
- **CA-9** `ESPN_EN_VIVO=off` con lo guardado de hace 1 minuto: 0 consultas a ESPN, 0 partidos en la respuesta y 0 consultas a la base. Solo `off` apaga (`OFF`, `on` y vacío no). (RF-10)
- **CA-10** La respuesta lleva `Cache-Control` con `s-maxage` entre 30 y 120 s, `X-Content-Type-Options: nosniff` y solo contiene estos campos por partido: `liga`, `local`, `visita`, `gl`, `gv`, `estado`, `minuto` (sin logos, ni IDs, ni URLs). (RF-11)
- **CA-11** Un equipo llamado `<img src=x onerror=window.__x=1>`: tras pintar la barra, `window.__x` es `undefined` y el nombre se ve como texto. (RF-15)
- **CA-12** Con `prefers-reduced-motion: reduce` y sin tocar la pantalla durante 10 s: `scrollLeft` de la lista no cambia y ningún elemento de la barra tiene animación ni transición activa. Sin esa preferencia, igual. (RF-05)
- **CA-13** Con reloj simulado y pestaña visible durante 6 minutos: 4 solicitudes en total (t = 0, 2, 4, 6 min). Con pestaña oculta durante 6 minutos: 0 solicitudes adicionales; al volver a verse: 1 solicitud inmediata. (RF-07)
- **CA-14** Datos de hace 3 min 40 s: el chip dice "act. hace 3 min"; de hace 20 s: "act. ahora". (RF-06)
- **CA-15** A 360x640 con 5 partidos: la barra mide <= 44 px, `scrollWidth` del documento <= 360 y el borde inferior de "Empezar mi carrera" del Home queda a <= 560 px del tope. A 360x640 sin partidos el valor es el mismo que hoy. (RF-14)
- **CA-16** Contraste medido del texto de la barra, del chip y de la atribución >= 4,5:1 en tema claro y oscuro. (RF-13)
- **CA-17** Con un minijuego en pantalla la barra no se ve; al terminarlo y volver a otra pantalla, se ve de nuevo sin haber pedido datos extra. (RF-12)
- **CA-18** `npm run build` termina con código 0; `package.json` no cambia sus dependencias; no existe ninguna variable nueva con prefijo `VITE_` ni ninguna llave en `dist/` ni en `git grep`. (RF-11, D6)
- **CA-19** `privacidad.html` contiene "ESPN" y "no enviamos"; `terminos.html` contiene "ESPN" y "retraso". (RF-16)
- **CA-20** Antes de publicar, en la vista previa de Vercel: (a) cada código de liga de ESPN respondió 200 o fue retirado de la lista; (b) la Liga Nacional de Guatemala respondió desde la red de Vercel; (c) la tabla del plan no tiene filas "por verificar". Si ESPN no responde desde Vercel (todas 403), no se publica la barra con datos: la feature queda oculta (comportamiento por diseño) y se decide con el usuario. (D1, D4)

## Seguridad (OWASP Top 10)
Detalle en `plan.md`. Resumen de lo exigido:
- **A02/A05** **No hay credenciales**: ESPN es público y no usa llave, así que no hay secretos en el servidor, en el cliente ni en git. Respuestas con `Content-Type` JSON y `X-Content-Type-Options: nosniff`.
- **A10** el servidor solo consulta un host fijo (`site.api.espn.com`); el `<slug>` sale de una tabla constante; ningún dato del usuario forma parte de las URLs; `redirect: 'error'`.
- **A04** el ritmo (1 ronda/3 min, de a 5 consultas) vale aunque lluevan solicitudes; el CDN absorbe lo demás; sin visitantes no hay llamadas.
- **A03** textos de terceros solo como texto, nunca como HTML.
- **A08** cada respuesta de ESPN se valida y sanea antes de guardarla; no se confía en su forma.
- **A09** los registros solo llevan slug y motivo corto. **A06** sin dependencias nuevas.
- A01, A07: no aplican (dato público de solo lectura, sin cuentas).

## Aclaraciones resueltas
Decisiones del orquestador y del usuario que cierran lo que la primera versión dejaba abierto:
1. **Fuente única (cambio de alcance).** Solo ESPN, riesgo aceptado, sin proveedor oficial. football-data.org y su atribución, su llave, su retraso y el rótulo "con retraso" desaparecen del diseño (reemplaza la aclaración sobre sus términos y sobre qué devuelve `status=LIVE`).
2. **Si ESPN no responde desde Vercel:** la barra se oculta y no rompe nada. `ESPN_EN_VIVO=off` apaga toda la feature. Reemplaza el defecto anterior de "no publicar sin Liga Nacional": se verifica en la vista previa (T11) y se publica igual; si todo da 403, la barra simplemente no aparece.
3. **Códigos de liga de ESPN:** todos son candidatos hasta verificarlos en la vista previa (T11); el que dé 404 se retira. Con ~22 ligas se pide solo bajo demanda, con caché de 3 min y de a 5 en paralelo.
4. **Rótulo "EN VIVO":** se mantiene, con "act. hace X min".
5. **Amistosos:** no van.

Pendiente de la T11 (verificación real, no bloquea implementar): qué slugs de ESPN responden y si la Liga Nacional responde desde la red de Vercel. Un endpoint combinado de ESPN que traiga varias ligas en una llamada **no se pudo confirmar con fuentes públicas** (ver plan, "Optimización por verificar"); no se usa.
