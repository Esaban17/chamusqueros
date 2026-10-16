# Tope de uso en el ranking de carreras

Origen: `brief.md` de esta carpeta y `specs/backlog.md` (ronda 3, 2026-10-15). El usuario aprobó implementar todo el backlog el 2026-10-15. Este documento fija el **qué**; el cómo está en `plan.md`.

## Problema y valor
El ranking global de carreras es el único servicio del sitio que acepta peticiones sin ningún límite de uso.
- **Guardar una carrera** acepta cualquier identificador nuevo, así que cada petición puede crear una fila y una escritura en la base. Un script puede llenar el ranking de filas basura.
- **Mirar el ranking** ejecuta cada vez una consulta sobre toda la tabla, sin caché, y a veces una escritura de avatar. Repetirla gasta ejecuciones de Vercel y mantiene despierta la base de Neon.

Con el plan gratis de Vercel, agotar las horas de CPU o el millón de invocaciones pausa el sitio unos 30 días: no hay factura, hay caída. Valor: riesgo evitado, no ingreso. Protege el ranking (el motor del "¿superás mi carrera?") y las cuotas gratuitas, y lo hace sin que un jugador legítimo note el tope.

## Usuarios
- **Jugador**: quiere ver un ranking creíble y que su carrera se guarde al terminar. No debe notar el tope. Muchos son menores de edad y entran desde WhatsApp.
- **Equipo**: quiere que un abuso barato no tumbe el sitio ni llene la base.

## Alcance
- Un tope de uso por dirección de red (IP) para **mirar** el ranking de carreras y otro para **guardar** una carrera.
- El rechazo ocurre antes de cualquier consulta o escritura a la base.
- Respuesta de rechazo con espera sugerida, sin detalles internos.
- Mensaje humano en el cliente, en la pantalla final de la carrera y en la del ranking, sin perder la carta ni la carrera.
- Pruebas automáticas que fijen el comportamiento.

## Fuera de alcance
- Validar el puntaje en el servidor (deuda aceptada, con `ponytail:` en el endpoint).
- Ownership más fuerte de las filas (token con hash): riesgo bajo, aceptado.
- La regla de Rate Limiting del Firewall de Vercel y las alertas de uso: son acciones del usuario en el panel (bloque 1 del backlog). Esta feature ni depende de ellas ni las reemplaza.
- Caché del ranking público, límites globales entre instancias, bloqueo por país o reputación.
- Unificar el limitador propio de `api/futbolista.ts` con el común.
- Tope de tamaño del cuerpo de la petición de guardado (no pedido; se anota como mejora posible).
- Cualquier cambio de esquema en `db/`, de `package.json`, de `privacidad.html` o `terminos.html` (ver Decisión D6).

## Requisitos funcionales
Un "ranking de carreras" es el de `api/ranking.ts`, distinto del ranking de Retos en línea. "Misma IP" es la primera dirección de la cabecera de reenvío de la petición. Los números salen de la Decisión D1.

- **RF-01** (mirar) Desde una misma IP, el ranking de carreras atiende hasta **150 lecturas por minuto**. La lectura 151 dentro del mismo minuto se rechaza.
- **RF-02** (guardar) Desde una misma IP, el ranking de carreras atiende hasta **150 guardados por hora**. El guardado 151 dentro de la misma hora se rechaza. Cuenta todo intento de guardado, también los que terminan siendo "datos inválidos" o "nombre no permitido".
- **RF-03** (independencia) Los dos topes cuentan por separado entre sí, por IP (otra IP no se ve afectada) y por servicio: agotar el tope del ranking de carreras no limita el ranking de Retos en línea ni ningún otro servicio del sitio, y al revés.
- **RF-04** (rechazo previo) Una petición rechazada por el tope **no hace ninguna consulta ni escritura a la base de datos**, incluida la escritura de avatar que acompaña a algunas lecturas, y no cambia ningún dato.
- **RF-05** (forma del rechazo) El rechazo responde con estado **429**, indica en una cabecera de espera los segundos que faltan para que se libere (un entero entre 1 y el largo de la ventana: 60 s para lecturas, 3600 s para guardados), lleva un cuerpo JSON con un mensaje genérico (sin nombres de tablas, consultas, IP, identificadores ni trazas), no se puede guardar en caché y no abre el acceso entre orígenes.
- **RF-06** (ventana) La cuenta es una ventana fija que empieza con la primera petición de esa IP. Pasada la ventana (60 s o 3600 s), la misma IP vuelve a ser atendida con la cuenta en cero.
- **RF-07** (sin cambios bajo el tope) Mientras no se pase del tope, lecturas y guardados responden exactamente igual que hoy: mismos estados, mismos cuerpos, mismas reglas de validación y de nombres.
- **RF-08** (cliente, pantalla final) Si el guardado de la carrera se rechaza con 429, la pantalla final de la carrera muestra, en el lugar del ranking, un mensaje corto en voseo guatemalteco que (a) no culpa al jugador, (b) no usa tecnicismos ni el número 429, (c) dice que la carrera todavía no se pudo guardar en el ranking y (d) invita a reintentar en un rato. Junto al mensaje hay un botón "Reintentar" que vuelve a enviar **la misma carrera**; si esta vez entra, la pantalla muestra el resultado normal (puesto y puntos); si se rechaza otra vez, repite el mensaje. No hay modal. La carta, la imagen de la carta, "Compartir", la descarga y "Jugar otra carrera" funcionan igual que sin rechazo.
- **RF-09** (cliente, pantalla del ranking) Si la lectura del ranking se rechaza con 429, la pantalla del ranking muestra un mensaje corto en voseo, sin tecnicismos ni culpa, que invita a volver a intentar en un rato. El botón "Volver" sigue funcionando.
- **RF-10** (sin rastro de la IP) La IP solo se usa para contar en la memoria del servidor: no se guarda en la base, no se escribe en registros, no se devuelve en ninguna respuesta y no se asocia al identificador del jugador.
- **RF-11** (holgura de uso legítimo) Un grupo de **40 jugadores con la misma IP** (un salón de clases o el wifi de una cancha) puede, en la misma hora, terminar **hasta 3 carreras cada uno** y mirar el ranking **hasta 3 veces cada uno dentro del mismo minuto**, sin recibir ningún 429.

## Criterios de aceptación
Las pruebas automáticas usan los dobles de `scripts/fixtures/` (base falsa, reloj controlado, IP por petición); ninguna toca la base real. CA-08 y CA-09 son de navegador.

- **CA-01** (RF-01, RF-05, RF-06) Dada una IP nueva, cuando hace 150 lecturas en el mismo instante, entonces las 150 responden 200. La lectura 151 responde 429 con espera de 60 s. Treinta segundos después, otra lectura responde 429 con espera de 30 s. A los 60 s de la primera lectura, la lectura siguiente responde 200.
- **CA-02** (RF-02, RF-05, RF-06) Dada una IP nueva, cuando guarda 150 carreras válidas con identificadores distintos, entonces las 150 responden 200. La 151 responde 429 con espera de 3600 s. Pasada una hora desde la primera, un guardado válido responde 200.
- **CA-03** (RF-03) Con la IP A ya rechazada en lecturas: (a) una lectura desde la IP B responde 200; (b) un guardado válido desde la IP A responde 200; (c) una lectura del ranking de Retos en línea desde la IP A responde 200. Con la IP A rechazada en guardados, una lectura desde A responde 200.
- **CA-04** (RF-04) Una lectura con identificador y avatar válidos que está bajo el tope hace 2 consultas a la base (la escritura de avatar y el ranking); una vez rechazada, la misma lectura hace **0**. Un guardado válido bajo el tope hace al menos 1 consulta; rechazado, **0**. El número de consultas registradas por la base falsa no cambia durante la petición rechazada.
- **CA-05** (RF-05, RF-10) La respuesta 429 de lectura y la de guardado traen tipo de contenido JSON, `no-store`, `nosniff`, ninguna cabecera de acceso entre orígenes, un cuerpo con solo las claves `error` y `mensaje`, y ninguno de estos textos: `neon`, `sql`, `DATABASE`, la IP de la petición, el identificador del jugador. La espera es un entero entre 1 y 60 (lectura) o entre 1 y 3600 (guardado).
- **CA-06** (RF-02, RF-07) Con 150 guardados de datos inválidos (por ejemplo, puntaje 5000) desde la IP A, el guardado válido 151 responde 429; antes del tope, los inválidos responden 400 como hoy. La prueba existente del ranking (27 códigos de país, límites de puntaje, nombres ofensivos y válidos) pasa sin cambiar sus afirmaciones.
- **CA-07** (RF-11) Dada una IP, cuando 40 dispositivos distintos guardan una carrera cada uno y miran el ranking 3 veces cada uno en el mismo minuto, entonces las 40 + 120 peticiones responden 200. Cuando esos 40 dispositivos guardan una segunda y una tercera carrera durante la misma hora (120 guardados en total), entonces todas responden 200.
- **CA-08** (RF-08) En un navegador a 360 x 640, con el guardado simulado como 429: la pantalla final muestra el mensaje y "Reintentar" en lugar del ranking; el texto no contiene "429", "error" ni "servidor"; la imagen de la carta aparece, "Compartir" y la descarga funcionan y no aparece ningún modal; no hay desplazamiento horizontal. Al simular que ahora el guardado responde 200 y tocar "Reintentar", se ve "Esta carrera: N pts. Quedaste en el puesto #P" y desaparece el botón.
- **CA-09** (RF-09) En el mismo navegador, con la lectura simulada como 429: la pantalla del ranking muestra el mensaje (distinto de "Cargando…") y "Volver" regresa al Home.
- **CA-10** (RF-10, RF-07) `git diff origin/main` de `api/ranking.ts` no agrega ninguna llamada a `console`, ni a SQL con la IP, ni la IP a ninguna respuesta; `db/`, `package.json` y `package-lock.json` no cambian.
- **CA-11** (alcance) `npm run build` pasa; todas las pruebas `scripts/*.test.ts` pasan, incluida `scripts/seguridad-api.test.ts`; en `src/main.ts` el diff solo toca los dos bloques de manejo de error (RF-08, RF-09), sin reformatear ni mover otro código.

## Seguridad (OWASP Top 10)
Los mecanismos están en el plan. Esta sección es obligatoria; A04 es el motivo de la feature.
- **A04 (diseño inseguro y abuso)**: tope por IP en lectura y en guardado con rechazo antes de tocar la base (RF-01 a RF-05). **Riesgos aceptados y documentados**: (1) el conteo vive en la memoria de cada instancia de la función; peticiones repartidas entre instancias o entre IP (una red de equipos) lo esquivan: es de mejor esfuerzo, frena lo ingenuo, no un ataque distribuido; el tope global es la regla de Rate Limiting del Firewall de Vercel (bloque 1 del backlog). (2) **No impide desplazar a los jugadores reales del Top 50**: entrar al Top 50 exige unos 50 guardados, muy por debajo de 150 por hora; solo se acota el ritmo de escritura (a lo sumo 150 filas por hora por IP y por instancia). Lo que cierra eso es validar el puntaje en el servidor, fuera de alcance. (3) Falsos positivos por IP compartida más grande que la prevista (colegios grandes, la red de un operador móvil): ver D1; el jugador ve el mensaje de RF-08 y puede reintentar. (4) No protege las horas de cómputo de Neon: una consulta periódica bajo el tope mantiene la base despierta; eso se vigila con las alertas de Neon. (5) Un conjunto lleno de IP distintas (20 000 claves en memoria) hace salir la cuenta más antigua: el límite se debilita, no se cierra el servicio.
- **A01 (control de acceso)**: sin cambios; el identificador del jugador sigue siendo un UUID secreto que ningún servicio devuelve. El tope no es control de acceso y no se presenta como tal.
- **A03 (inyección)**: la IP solo es parte de una clave en memoria; nunca llega a SQL, HTML ni registros. Las consultas siguen parametrizadas.
- **A05 (configuración)**: la respuesta 429 usa el mismo formato de errores de Retos: tipo declarado, `nosniff`, `no-store`, sin CORS, mensaje genérico (RF-05).
- **A07 (identificación)**: la IP se toma de la cabecera de reenvío que pone Vercel, igual que los demás servicios; no se confía en el identificador del jugador para el tope (un script rota identificadores a voluntad). Si la cabecera falta, todos los pedidos comparten una clave "desconocida" (en Vercel esa cabecera siempre existe; el caso solo aparece fuera de él).
- **A09 (registros)**: la feature no registra nada, ni la IP ni los rechazos. Consecuencia aceptada: en el plan gratis los registros duran 1 hora, así que los 429 no son una fuente fiable de medición.
- **A06, A08, A10**: sin dependencias nuevas; el servidor no hace llamadas salientes nuevas; nada que integrar o descargar.

## Decisiones
- **D1 Números de los topes** (supuesto del spec; los valores son una perilla en una sola tabla):
  - Una carrera dura 17 a 21 minutos (`specs/ritmo-por-temporada`), así que un dispositivo guarda como máximo 3 carreras por hora.
  - Grupo de referencia: **40 jugadores** con la misma IP (un salón; "decenas de niños" del brief). Guardados: 40 x 3 = 120 en el peor caso; con 25 % de margen para reintentos y rechazos por nombre, **150 por hora**.
  - Lecturas: el mismo grupo mirando el ranking 3 veces cada uno en el mismo minuto son 120; con margen, **150 por minuto** (el ranking de Retos, de uso menos concentrado, tiene 60).
  - Un solo escalón por servicio, sin ráfaga ni segunda ventana: lo mínimo que cumple la restricción. Si el usuario conoce el tamaño típico del grupo que comparte IP (colegios grandes, redes móviles), se ajusta el número sin cambiar el diseño.
- **D2 Clave: IP, no identificador de jugador.** Un script rota UUID; la IP es lo único que no se regala.
- **D3 Mejor esfuerzo.** Mismo mecanismo y mismo límite conocido que ya documenta el módulo común de límites; no se promete más.
- **D4 429 sin segundos en el texto.** El mensaje al jugador dice "en un ratito" y no muestra la espera de la cabecera: es corto, apto para menores y no promete una cuenta que, con varias instancias, no es exacta.
- **D5 Botón "Reintentar" en la pantalla final** (supuesto del spec, no estaba en el brief). El brief pide "invitar a reintentar más tarde" y que no se pierda la carrera; sin botón, reintentar significaría jugar otra carrera de 20 minutos, y la perdida podría ser la mejor. Cuesta unas líneas porque la carrera ya está en el cierre de la pantalla. El Product Owner puede quitarlo sin tocar el resto (RF-08 se reduce a mensaje).
- **D6 Sin cambios legales** (supuesto del spec). `privacidad.html` ya dice, en la sección del verificador de futbolistas, que el límite de uso guarda una cuenta temporal por IP en la memoria del servidor; el brief indica "legal: ninguno nuevo". Se deja así: la cuenta es la misma práctica, no se guarda ni se registra (RF-10). Si el Product Owner prefiere paridad, es una línea en la sección del ranking de `privacidad.html`, fuera de esta feature.
- **D7 Medición.** La prueba automática fija el tope; en producción se mira el crecimiento de filas por hora con la consulta del backlog (`date_trunc('hour', achieved_at)`). Los 429 no se miden (ver A09).

## Conflictos con el código existente
1. **La prueba actual del ranking enviaría ~61 guardados desde una misma "IP" (sin cabecera, clave "desconocida").** Con el tope de 150 aún pasaría, pero por poco margen; debe reiniciar el conteo entre grupos para no depender de ello (plan, T4).
2. **La base falsa de las pruebas (`scripts/fixtures/neon-falso.ts`) solo responde consultas con etiqueta `/* nombre */` y lanza ante cualquier otra; las cuatro consultas del ranking de carreras no tienen etiqueta.** Decisión: etiquetarlas (solo un comentario SQL, como ya hace el módulo de datos de Retos) y sumar un caso a la base falsa que responda vacío. Alternativa descartada: otro doble de `fetch` dentro de la prueba, que se aparta de la regla de usar los dobles comunes. Costo: una línea en un archivo compartido que otras ramas también pueden tocar (conflicto trivial).
3. **`src/main.ts` lo tocan otras ramas en paralelo.** La feature se limita a dos bloques `catch` y no cambia `rankingApi` (hoy ya convierte un 429 en `Error('ranking 429')`). Ver `plan.md`.
4. **El nombre `rankingIp` del módulo de límites y el prefijo `ranking-ip:` ya los usa el ranking de Retos.** Las entradas y claves nuevas llevan otro nombre y otro prefijo, o los dos rankings compartirían contador (RF-03).

## Aclaraciones resueltas
- Ninguna bloquea.
- `[NECESITA ACLARACIÓN, no bloqueante: ¿cuál es el tamaño típico del grupo que comparte una IP (salón, cancha, red móvil)?]` Se supuso 40 (D1). Si el usuario lo conoce, ajusta los dos números.
