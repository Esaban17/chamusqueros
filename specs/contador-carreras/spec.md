# Contador anónimo de carreras iniciadas y terminadas

Fuente: `specs/backlog.md` (ítem 3 y "Contrato de `contador-carreras`"). El usuario aprobó el contador anónimo y la implementación del backlog el 2026-10-15.

## Problema y valor
Hoy nadie sabe cuántas carreras se empiezan ni cuántas se terminan: el ranking guarda una fila por jugador con su mejor carrera, así que no sirve para medir el abandono. Ese dato decide si `continuar-carrera` (la feature M más cara) sube al primer lugar: la regla del backlog es "con al menos 100 carreras iniciadas, menos del 60 % terminadas". En Vercel Hobby no hay otra forma de medirlo (los eventos personalizados son de Pro).

Usuario beneficiado: el creador, que decide con datos. El jugador no ve nada nuevo.

## Alcance
- Un aviso anónimo cuando se crea un jugador nuevo y otro cuando se llega al final de su carrera.
- Un contador por día con dos números (iniciadas, terminadas), guardado en el servidor.
- Un tope de uso por IP contra inflado del contador.
- El texto de `privacidad.html` describe el aviso.

## Fuera de alcance
- Cualquier identificador de jugador, de dispositivo o de sesión; IP, nombre, país, modo de juego, puntaje, versión o cualquier otro dato del jugador o de su carrera.
- Desglose por hora, por país, por posición o por modo. Solo el total del día.
- Pantalla o endpoint para ver los contadores (se leen en la consola de Neon).
- Sondeo, latidos, medición de tiempo jugado o de visitas a la portada.
- Retomar carreras: es `continuar-carrera`. Esta spec solo fija que retomar no contará como inicio (ver Decisiones).
- Consentimiento o aviso emergente: el contador no contiene datos personales.

## Definiciones
- **Carrera iniciada**: se crea un jugador nuevo, es decir, se envía el formulario de creación de jugador con datos válidos y arranca su carrera. Entrar a la pantalla de creación, a la portada, al ranking o a Retos no es iniciar.
- **Carrera terminada**: se muestra la pantalla final de la carrera (la del retiro del jugador, donde se arma su carta y se envía al ranking).
- **Día**: el día calendario en hora de Guatemala (UTC−6, sin horario de verano), asignado por el servidor.

## Requisitos funcionales
- **RF-01** Cada vez que se crea un jugador nuevo, el juego envía un aviso "iniciada". Un aviso por jugador creado.
- **RF-02** Cada vez que se muestra la pantalla final de una carrera, el juego envía un aviso "terminada". Un aviso por carrera.
- **RF-03** Ninguna otra acción envía avisos: ni abrir la portada, el ranking, Retos o el perfil, ni abrir la creación de jugador sin enviarla, ni avanzar de temporada, ni compartir. En particular, una futura función de retomar una carrera guardada no envía "iniciada".
- **RF-04** Cada aviso es una sola petición. No hay sondeo, latidos ni reintentos automáticos.
- **RF-05** El aviso lleva solo el tipo de evento. No lleva identificador de jugador ni de dispositivo, nombre, puntaje, fecha, avatar ni cabeceras de identidad del juego, y no escribe nada en el almacenamiento local.
- **RF-06** El servidor guarda solo contadores: una fila por día con dos números (iniciadas, terminadas). La tabla no tiene ninguna columna que identifique o pueda identificar a alguien. La IP no se guarda en la base.
- **RF-07** El día lo decide el servidor, en hora de Guatemala. Una fecha enviada por el cliente se rechaza.
- **RF-08** Cada aviso válido suma exactamente 1 al contador de su evento en el día actual. Avisos simultáneos no se pierden.
- **RF-09** El servidor acepta solo un aviso bien formado: método POST, cuerpo JSON de a lo más 2 KB con una única clave `evento` cuyo valor es exactamente `iniciada` o `terminada`. Todo lo demás se rechaza sin escribir en la base.
- **RF-10** Cada IP puede enviar a lo más 60 avisos por hora. El aviso 61 de esa hora se rechaza como "demasiadas solicitudes", con el tiempo de espera, y no escribe en la base. La cuenta vive solo en memoria temporal del servidor.
- **RF-11** Si el aviso falla por cualquier motivo (sin red, 4xx, 5xx, tope, lentitud), el juego sigue igual: no muestra mensajes, no se retrasa esperando la respuesta y no deja errores sin capturar.
- **RF-12** Las respuestas de error del servidor son genéricas; nunca incluyen detalles de la base ni del entorno. El registro del servidor guarda solo la acción y el nombre del error.
- **RF-13** El esquema se crea con una migración del repositorio que se puede ejecutar más de una vez sin error ni pérdida de datos. Si el despliegue llega antes que la tabla, el juego funciona igual (RF-11).
- **RF-14** `privacidad.html` explica el aviso: cuándo se envía, qué contiene, para qué sirve, qué no se guarda, el tope por IP y que Vercel y Neon pueden guardar registros técnicos. Su fecha de última actualización es la del cambio.
- **RF-15** No se agregan dependencias, scripts de terceros ni llamadas del servidor a otros servicios.
- **RF-16** No existe forma pública de leer los contadores. El creador los consulta directamente en la base.

## Criterios de aceptación
- **CA-1** (RF-01, RF-06) Dada la tabla vacía y un jugador que envía el formulario válido, cuando arranca su carrera, entonces el navegador hace 1 petición POST al servicio del contador con cuerpo `{"evento":"iniciada"}` y la tabla queda con 1 fila del día con iniciadas = 1 y terminadas = 0.
- **CA-2** (RF-02) Dada esa carrera jugada hasta la pantalla final, cuando se muestra, entonces se hace 1 petición con `{"evento":"terminada"}` y la fila del día queda en (1, 1). El total de la carrera es 2 peticiones.
- **CA-3** (RF-03) Dado un recorrido por portada, ranking, Retos, perfil y la pantalla de creación sin enviarla, cuando se termina, entonces hubo 0 peticiones al servicio del contador.
- **CA-4** (RF-01, RF-02, RF-03) Dada una carrera abandonada en la temporada 3 al recargar la página, y luego un jugador nuevo creado, entonces el día suma 2 iniciadas y 0 terminadas.
- **CA-5** (RF-04) Dada una carrera completa de 17 a 21 minutos, entonces hubo exactamente 2 peticiones al servicio del contador, ninguna periódica; y si la primera falla, no hay un segundo intento (1 petición de ese evento).
- **CA-6** (RF-05) Dado cualquier aviso, entonces su cuerpo es exactamente `{"evento":"iniciada"}` o `{"evento":"terminada"}` (menos de 30 bytes), no lleva `x-player-id`, `x-player-avatar` ni `authorization`, y el contenido del almacenamiento local es idéntico antes y después.
- **CA-7** (RF-06) Dados 1.000 avisos válidos desde 50 IP distintas el mismo día, entonces la tabla tiene 1 fila, tiene exactamente 3 columnas (el día y los dos contadores), y los parámetros enviados a la base son solo la hora y el tipo de evento (ninguna IP).
- **CA-8** (RF-07) Dado un aviso a las 23:59:59 hora de Guatemala (05:59:59 UTC) y otro a las 00:00:00 del día siguiente (06:00:00 UTC), entonces quedan en 2 filas de días distintos. Dado un cuerpo `{"evento":"iniciada","dia":"2020-01-01"}`, entonces responde 400 y la tabla no cambia.
- **CA-9** (RF-08) Dados 3 avisos "iniciada" y 2 "terminada" el mismo día, entonces la fila queda en (3, 2). La suma ocurre en una sola sentencia de la base, no en leer y luego escribir.
- **CA-10** (RF-09, RF-16) Dados GET, un cuerpo sin cabecera `content-type: application/json`, `{}`, `{"evento":"otra"}`, `{"evento":"INICIADA"}`, `{"evento":["iniciada"]}`, `{"evento":"iniciada","x":1}`, un JSON que no es objeto y un cuerpo de 3 KB, entonces cada uno responde con error (400, o 405 el GET) y hubo 0 consultas a la base.
- **CA-11** (RF-10) Dados 60 avisos válidos de una IP en una hora, entonces los 60 responden 204; el 61 responde 429 con `retry-after` entre 1 y 3600 y 0 escrituras; otra IP en ese mismo momento responde 204; pasada la hora, la primera IP vuelve a responder 204.
- **CA-12** (RF-11) Dado el servidor respondiendo 500, respondiendo 429, con la red caída o tardando 30 s, entonces la pantalla siguiente aparece sin esperar la respuesta, no se muestra ningún texto nuevo y no se dispara ningún evento `unhandledrejection`.
- **CA-13** (RF-12) Dada la base fallando con un mensaje que contiene `password=hunter2`, entonces la respuesta es 500 con mensaje genérico sin ese texto y el único registro del servidor es la acción y el nombre del error.
- **CA-14** (RF-13) Dada la migración ejecutada 2 veces seguidas con una fila existente, entonces no hay error y la fila sigue ahí. Dada la prueba SQL de la migración, entonces termina imprimiendo `OK` y revierte su transacción.
- **CA-15** (RF-14) Dado `privacidad.html`, entonces tiene una sección "Contador de carreras" que menciona los dos momentos del aviso, que solo existen dos números por día, que no se guarda identificador, nombre ni IP en la base, el tope por IP en memoria y los registros técnicos de Vercel y Neon; y su fecha de última actualización es la del día del cambio.
- **CA-16** (RF-15) Dado el cambio, entonces `package.json` y `package-lock.json` no cambian, `npm run build` termina sin error y `scripts/seguridad-api.test.ts` sigue pasando.

## Seguridad (OWASP Top 10 2021)
- **A01 Control de acceso**: el endpoint solo escribe y no devuelve datos; no hay lectura pública (RF-16). No hay identidad que proteger porque el aviso es anónimo por diseño (RF-05).
- **A02 Fallos criptográficos / datos**: no hay secretos nuevos ni cookies. Minimización: solo dos números por día (RF-06); la IP no llega a la base.
- **A03 Inyección**: el evento es una lista cerrada de dos valores y la consulta es parametrizada; nada se arma con texto (RF-09). El cliente no manda fecha (RF-07).
- **A04 Diseño inseguro**: tope por IP (RF-10) y cuerpo acotado a 2 KB (RF-09). Riesgo aceptado: el tope es en memoria y por instancia, así que un atacante con muchas IP puede inflar el conteo; el contador no protege nada de valor y se complementa con la regla de Rate Limiting del Firewall de Vercel ya prevista en el backlog.
- **A05 Configuración de seguridad**: sin CORS abierto, `content-type` JSON obligatorio (un formulario de otro sitio no puede disparar el aviso), `nosniff`, `no-store`, errores genéricos (RF-09, RF-12).
- **A06 Componentes vulnerables**: cero dependencias nuevas (RF-15).
- **A07 Identificación y autenticación**: no aplica; no hay cuentas ni sesiones, y el contador no depende de saber quién es quién.
- **A08 Integridad**: sin scripts ni recursos de terceros (RF-15). La migración se revisa y se aplica a mano antes del despliegue (ver Decisiones).
- **A09 Registro y monitoreo**: el registro del servidor guarda acción y nombre del error, nunca cuerpos ni cabeceras (RF-12). El tope devuelve 429, visible en los registros de Vercel.
- **A10 SSRF**: el servidor no hace ninguna llamada saliente nueva (RF-15).
- **Privacidad**: sin datos personales en la base; la transparencia ante el jugador es `privacidad.html` (RF-14).

## Costo declarado
El primer límite que se rompe es el cómputo de Neon (100 CU-h al mes en Free, con la base despierta por 5 minutos tras cada consulta, unos 0,02 CU-h por despertar aislado). Esta feature agrega escrituras:
- "terminada" cae en el mismo instante que el envío al ranking, que ya despierta la base: costo marginal cercano a 0.
- "iniciada" es la que puede despertar una base dormida. Escenario base del informe de finanzas (10.000 visitantes al mes) con el supuesto de que 4 de cada 10 visitantes crean un jugador (sin dato real; hoy no se mide): unos 4.000 inicios al mes, entre 0 (si la base ya está despierta por otras funciones) y unos 45 CU-h (si cada hora pico los mantiene despierta), con un peor caso teórico de 80 CU-h si todos fueran aislados. Se acepta; la alerta de Neon al 70 % del backlog lo cubre, y quitar el contador es revertir la feature.

## Decisiones
- **Iniciada = jugador nuevo, no entrada a la pantalla.** Decidido por el orquestador: `continuar-carrera` permitirá retomar una carrera guardada y retomarla no es un inicio.
- **Terminada = pantalla final de la carrera.** Supuesto: ahí convergen los dos caminos que llegan al final y es el mismo momento en que se envía la carrera al ranking, así que "terminadas" coincide con las carreras que intentan entrar al ranking. Una carrera con el último resumen de temporada mostrado pero sin pasar a la pantalla final no cuenta.
- **Un aviso por evento, sin sondeo.** Decisión del orquestador.
- **Día en hora de Guatemala.** Supuesto: el creador y el público están allí; el corte a medianoche UTC partiría el día en la tarde.
- **Tope de 60 avisos por hora por IP.** Supuesto: una carrera genera 2 avisos en 17 a 21 minutos, así que un aula o una red compartida con 30 jugadores a la vez cabe; si hace falta, es un valor del código.
- **Sin lectura pública** y sin retención: 1 fila por día (unas 365 al año) sin datos personales, no hay nada que borrar.
- **Respuesta sin cuerpo (204)** en el éxito.
- **Migración**: la aplica el orquestador con el visto bueno del usuario antes del despliegue. El implementador nunca la ejecuta contra Neon; las pruebas usan el Neon falso de `scripts/fixtures/`.
- **Diferencia con el backlog**: el contrato dice que `privacidad.html` cambia "solo si se guardara algo por jugador". Aquí se actualiza igual (RF-14) porque ahora el navegador envía una petición al iniciar una carrera aunque el jugador nunca llegue al ranking, y Vercel puede registrar su IP. No se toca `specs/backlog.md`.

## Cómo se lee el dato
El creador suma las filas de un periodo en la consola de Neon (la consulta está en `plan.md`). La regla del backlog es suya; el contador solo da los números. Cautelas: el día del despliegue puede mostrar más terminadas que iniciadas (carreras empezadas antes); las pruebas del propio creador en producción cuentan; los bloqueadores de anuncios pueden ocultar parte de ambos avisos por igual.

## Aclaraciones
**Resueltas**: contador anónimo aprobado por el usuario (2026-10-15); definición de iniciada y terminada; tope por IP; migración sin aplicar por el implementador; fallo silencioso.

**Bloqueantes pendientes**: ninguna.

**Supuestos no bloqueantes** (anotados en Decisiones): día en hora de Guatemala; tope de 60 por hora por IP; terminada = pantalla final; sin lectura pública; costo de Neon aceptado.
