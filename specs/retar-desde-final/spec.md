# Retar desde la pantalla final de la carrera

Origen: ítem `retar-desde-final` de `specs/backlog.md` ("No por ahora"). El PO y finanzas la dejaron fuera por costo (`informes/2026-10-15-finanzas-roi-backlog.md`, fila 8): es la única candidata cuyo costo sube con el éxito (Neon despierto, funciones de Vercel, Ably). **El usuario decidió implementarla igual el 2026-10-15**, sin esperar a que se cumplan las condiciones de reactivación del backlog (50 jugadores activos por semana, Neon por debajo del 50 % de las 100 CU-h y un plan para el pico). Esta spec no exige esas condiciones; las registra como riesgo aceptado (Decisión 9) y fija el costo para que se pueda vigilar. `specs/backlog.md` no se edita.

Ramas paralelas tocan `src/main.ts` y la pantalla final: `continuar-carrera` (borra la carrera guardada al llegar a la final) y ya están integradas `contador-carreras`, `ranking-rate-limit`, `reto-del-dia`, `compartir-retos` y `headers-analitica`. Esta feature cambia lo mínimo y de forma localizada en `finish()`.

## Problema y valor
Quien termina una carrera ya está en el momento de más orgullo y de más ganas de mostrarlo. Hoy puede compartir una tarjeta, pero para **retar a un amigo** a un duelo en línea tiene que volver al Home, entrar a Retos, elegir "Retar a alguien en línea", crear el perfil si no lo tiene y recién ahí conseguir el enlace de la sala. Cuatro pasos entre el impulso y el enlace.

Valor: adquisición y retención por un camino que ya existe (la sala en línea con su invitación por enlace y WhatsApp), colocado en la pantalla donde el tráfico de WhatsApp termina. Es adquisición, no ingreso directo (el informe de finanzas lo dice así).

## Alcance
- Un bloque nuevo en la pantalla final de la carrera con un botón "Retar a alguien en línea". Un clic intenta crear una sala de Retos en línea y deja al anfitrión en el lobby de esa sala, donde ya están el código, el enlace y los botones de invitar (Compartir, WhatsApp, Copiar enlace).
- Si el dispositivo todavía no tiene perfil de Retos, el clic lleva a la pantalla de apodo que ya existe y, al crear el perfil, se crea la sala.
- Un interruptor de una línea para apagar el bloque sin tocar nada más (Decisión 6).

## Fuera de alcance
- Un segundo camino para crear salas, un perfil nuevo o una invitación nueva: todo sale del flujo existente de Retos en línea y de `specs/compartir-retos` (RF-03, RF-12).
- Elegir categoría, país o club en la pantalla final: la sala nace con la configuración por defecto y el anfitrión la cambia en el lobby, como siempre.
- Compartir automáticamente el enlace, abrir el menú de compartir del sistema sin un segundo clic, o poner el pase en la barra de direcciones.
- Mandar a la sala algo de la carrera: nombre, carta, puntaje, posición, avatar de la carrera. Precargar el apodo con el nombre de la carrera.
- Volver a la pantalla final desde la sala o desde Retos.
- Cambios en la API, la base de datos, los topes de uso, `privacidad.html`, `terminos.html`, `package.json` y `specs/backlog.md`.
- Medición nueva (contadores, `?ref=`): el costo se vigila con las gráficas de Neon, Vercel y Ably y con una consulta de solo lectura (ver plan, "Medición posterior").
- Ocultar el botón con un sondeo previo de disponibilidad (Decisión 1).

## Requisitos funcionales

### Qué se ve
- **RF-01** (botón) La pantalla final de la carrera muestra un bloque con una frase corta (avisa que al crear la sala se sale de esta pantalla y que conviene guardar antes la imagen de la carta) y **1** botón "Retar a alguien en línea". Queda entre el bloque "Ranking global" y los bloques de totales, es decir, antes de "Jugar otra carrera". El orden relativo de todo lo que ya existía no cambia.
- **RF-02** (cero costo hasta el clic) Mostrar la pantalla final, y quedarse en ella el tiempo que sea, no agrega **ninguna** petición a funciones del servidor, ninguna conexión de tiempo real, ningún temporizador y ninguna descarga del código de Retos en línea. Todo eso ocurre solo a partir del clic.
- **RF-12** (orden y donación) "Jugar otra carrera", "¿Te gustó?" y el pie siguen contiguos y en ese orden (`specs/boton-donacion` RF-02 y CA-2: 2 enlaces de donación en total). El aviso de la carrera enviada al ranking, la tarjeta, "Compartir", "Guardar imagen" y el resto de los bloques funcionan igual que antes.

### Qué hace el clic
- **RF-03** (un clic, un intento) Cada clic hace **un** intento de crear **una** sala. Mientras el intento está en curso el botón queda inactivo y un aviso dice "Creando la sala…". Dos clics seguidos no crean dos salas. Nada se crea sin clic: ni al cargar la pantalla, ni al volver a ella, ni por un temporizador.
- **RF-04** (reuso) Crear la sala, crear el perfil y la invitación usan el flujo existente de Retos en línea y de `compartir-retos`. No hay endpoint, tabla, pantalla de invitación ni texto de invitación nuevos.
- **RF-05** (con perfil) Si el dispositivo ya tiene perfil de Retos, el clic crea la sala sin pasar por la pantalla de apodo y, si sale bien, el anfitrión queda en el lobby de esa sala.
- **RF-06** (sin perfil) Si el dispositivo no tiene perfil, el clic comprueba (1 llamada, sin base de datos) que Retos en línea esté disponible. Si lo está, abre la pantalla de apodo existente, con el campo **vacío**, y al crear el perfil se crea la sala y se entra al lobby. "Atrás" en esa pantalla lleva a la entrada de Retos.

### Qué pasa si no se puede
- **RF-07** (falla sin salir de la final) Si Retos en línea no está disponible, no hay conexión o se alcanzó el tope de salas, el botón **no** abre Retos: muestra un aviso corto en el bloque, y la pantalla final sigue intacta (RF-12). Avisos exactos:
  - No disponible: `Retos en línea no está disponible ahora. Probá más tarde desde Retos, en el inicio.`
  - Sin conexión: `No hay conexión con el servidor. Probá de nuevo.`
  - Tope: `Ya creaste varias salas seguido. Probá en un rato desde Retos, en el inicio.`
  - Cualquier otra falla, o que el código de Retos no se pueda descargar: `No se pudo crear la sala. Probá de nuevo.`
  El botón se reactiva (con el foco puesto en él) solo en "sin conexión" y en "cualquier otra falla". Con "no disponible" y con "tope" queda inactivo en esa visita a la pantalla: reintentar solo gastaría llamadas.
  Excepción documentada: en el camino sin perfil, un tope por IP compartida o una falla después de la pantalla de apodo se muestran en el mensaje de error que Retos ya tiene (con "Reintentar" y "Volver a Retos"), porque en ese punto la persona ya está en Retos.

### Qué se comparte y qué no
- **RF-08** (el pase) El enlace de la sala (`?sala=`) aparece solo en el lobby, que ya lo muestra al anfitrión, y se comparte solo si el anfitrión toca Compartir, Enviar por WhatsApp o Copiar enlace. La pantalla final no lo contiene, la barra de direcciones no lo recibe, y no se abre ningún menú de compartir ni ventana por sí solos.
- **RF-09** (nada de la carrera) El botón no pasa ningún dato de la carrera a la sala: ni nombre, ni carta, ni puntaje, ni posición. El apodo de la sala se escribe a mano en la pantalla de apodo; nunca se precarga. Lo único que viaja es lo que el perfil de Retos ya envía hoy.

### Costo y topes
- **RF-10** (topes sin aflojar) Los topes de uso de la creación de salas no cambian: **10 salas por hora por IP** y **5 salas por hora por dispositivo**, más el resto de los límites por minuto del servidor. Esta feature no toca el servidor.
- **RF-11** (costo acotado y medido) Un clic cuesta, medido sobre el servidor real con base de datos y tiempo real simulados:

  | Caso | Llamadas a funciones | Consultas a Neon | Publicaciones a Ably |
  | --- | --- | --- | --- |
  | Con perfil, sala creada | 1 | 5 | 0 |
  | Sin perfil, hasta el lobby | 3 | 8 | 0 |
  | Retos en línea no disponible (con perfil) | 1 | 0 | 0 |
  | Retos en línea no disponible (sin perfil) | 1 | 0 | 0 |
  | Tope por dispositivo alcanzado | 1 | 2 | 0 |
  | Tope por IP alcanzado | 1 | 1 | 0 |

  Una prueba automática fija estas cifras (CA-3 a CA-6): si alguien encarece la creación, la prueba falla.

### Calidad
- **RF-13** (accesibilidad y diseño) El botón y el aviso usan los estilos y las clases que la pantalla final ya tiene (cero CSS nuevo). El aviso va en una región `role="status"`. No hay desplazamiento horizontal a 360 px ni a 1280 px, en tema claro y oscuro. El orden de tabulación sigue el orden de lectura. El texto es voseo.
- **RF-14** (salida) Al salir de la sala, o de Retos con "Salir", la persona llega al Home. No vuelve a la pantalla final: volver a dibujarla repetiría el aviso de carrera terminada, el envío al ranking y el registro de mejores carreras, y `continuar-carrera` ya borró la carrera guardada.
- **RF-15** (interruptor) Una constante del código, cuyo valor publicado es "encendido", controla el bloque completo. Apagada, la pantalla final es idéntica a la de antes de esta feature (0 elementos `#retar`, 0 diferencias de orden).

## Referencia de costo (lo existente, medido en el código)
Esta sección no es un requisito: es la cuenta que sustenta RF-11 y la decisión del usuario. Fuente: `api/sala.ts`, `api/_bd.ts`, `api/_auth.ts`, `api/perfil.ts`, `api/ably-token.ts`, `api/_limite.ts`, `src/retos/online/ui-sala.ts`, `src/retos/online/transporte.ts` y `src/retos/online/motor.ts`. "Q" = consultas a Neon; "Fn" = invocaciones de funciones de Vercel.

### Lo que agrega esta feature (el clic)
Es la tabla de RF-11. Detalle por llamada:
- Crear sala (`POST /api/sala`, acción `crear`): 1 Fn y 5 Q: `hashDe` (identificar al dispositivo, `api/_auth.ts`), `contarSalas` (tope de 5 por hora), `leerPerfil`, `limpiar` (retención perezosa) y `crearSala`. No publica en Ably (`crear` no llama a `publicar`).
- Comprobar disponibilidad (`GET /api/sala` sin código): 1 Fn, 0 Q (`disponible()` solo mira variables de entorno).
- Crear perfil (`PUT /api/perfil`): 1 Fn y 3 Q: `guardarPerfil`, `leerPerfil`, `mejorCarrera`.
- Tope por IP: `crearIp` responde antes de `contarSalas`, por eso queda en 1 Q (`hashDe`). Tope por dispositivo: `hashDe` y `contarSalas`, 2 Q. No disponible: el `POST` responde 503 antes de cualquier consulta.

### Lo que cuesta la sala completa (ya existía; esta feature la vuelve más probable)
"Reto completo creado desde la final" = una sala de la categoría más corta (Preguntas: 5 rondas, sin desempate, sin revancha), dos jugadores que responden rápido, unos 4 minutos de vida con los dos celulares con la pantalla encendida. Anfitrión nuevo (sin perfil) e invitado nuevo:

| Etapa | Fn | Q | Mensajes de Ably | Fuente |
| --- | --- | --- | --- | --- |
| Anfitrión: disponibilidad, perfil, crear | 3 | 8 | 0 | RF-11 |
| Anfitrión: token de tiempo real (`POST /api/ably-token`) y primera lectura (`GET /api/sala?codigo`) | 2 | 4 | 0 (más 1 conexión WebSocket) | `ably-token.ts`: `hashDe` y `leerSala`; `ui-sala.ts`: `suscribir().then(refrescar)` |
| Invitado: disponibilidad, vista previa, perfil, unirse | 4 | 8 | 1 publicada | `ui-sala.ts` `unirseConLink`; `unirse`: `hashDe`, `leerPerfil`, `leerSala`, `guardarSala` |
| Invitado: token y primera lectura | 2 | 4 | 0 (más 1 conexión WebSocket) | igual que el anfitrión |
| Configurar y empezar (2 acciones) | 2 | 6 | 2 publicadas | `mutar`: `hashDe`, `leerSala`, `guardarSala` |
| 5 rondas: 2 respuestas y 2 cierres de plazo cada una | 20 | 55 a 60 | 15 publicadas | respuesta: 3 Q y publica; cierre: 3 Q (el segundo cierre solo anota actividad); el último cierre usa `historial` y `cerrarPartida` en vez de `guardarSala` |
| Lectura periódica: 1 `GET` por cliente cada 20 s con la pantalla visible | 6 por minuto | 12 por minuto | 0 | `REFRESCO_MS` en `ui-sala.ts`; cada `GET` de miembro: `hashDe` y `leerSala` |

Total para 4 minutos: **≈ 57 Fn, ≈ 135 Q y ≈ 53 mensajes de Ably** (18 publicados, unos 35 entregados a los suscriptores; el plan de `retos-en-linea` asume 1 publicado más 2 entregados por publicación), más **2 conexiones WebSocket** y 2 tokens. Con anfitrión que ya tiene perfil, 2 Fn y 3 Q menos. Los cierres de plazo y la lectura periódica dependen de cuánto tarden las personas: las cifras son un orden de magnitud, no una garantía. El informe de finanzas estima ~75 Fn y ~200 mensajes por sala (para sus supuestos de partida más larga y revancha): mismo orden.

### Lo que preocupa de verdad: la sala que nadie usa
Una sala creada cuyo enlace nadie abre cuesta, con la pestaña visible, **3 Fn y 9 Q** de arranque y después **3 Fn y 6 Q por minuto** (la lectura periódica del anfitrión) hasta que vence a los 30 minutos sin actividad: en el peor caso unas 90 Fn y 180 Q, más de lo que cuesta jugar una partida. La lectura periódica se detiene sola cuando la pestaña no está visible (por ejemplo, cuando la persona pasa a WhatsApp a compartir el enlace). Esta feature **no cambia ese sondeo** (restricción de costo); lo declara como riesgo (ver plan, "Riesgos") y deja la palanca identificada: `REFRESCO_MS`.

### Neon
Cada sala mantiene Neon despierto mientras dure su actividad más el tiempo de autosuspensión del plan gratuito (supuesto: 5 minutos, valor documentado por Neon, no verificado en esta sesión). Una sala aislada de 4 minutos son unos 9 minutos de cómputo; a 0,25 CU de cómputo mínimo, ≈ 0,04 CU-h. El plan gratuito incluye 100 CU-h al mes, **compartidas con el ranking de carreras y todo lo demás**. Orden de magnitud: unas 2.700 salas aisladas al mes agotarían la cuota si nada más gastara; las salas simultáneas comparten tiempo despierto y gastan menos por sala. El informe de finanzas ya anticipa ese cruce entre ~1.600 salas al mes (viral) y el costo de Neon Launch (~US$19 al mes).

## Criterios de aceptación
Los CA-3 a CA-8, CA-10 y CA-13 se prueban con `npx tsx scripts/retar-desde-final.test.ts` (servidor con base de datos y Ably simulados, cliente con `fetch` y almacenamiento simulados, y comprobaciones estáticas del código; sin red). Los demás se verifican en el navegador con `/api/` simulado (ver tasks).

- **CA-1** (RF-01, RF-02) Dada la pantalla final recién dibujada, cuando pasan 60 s sin tocar nada, entonces hay exactamente 1 elemento `#retar`; no sale ninguna petición que la rama base no haga ya en las mismas condiciones y la misma ventana (hoy: 1 a `/api/carreras`, 1 a `/api/ranking` y, como ruido conocido y global, la consulta periódica de `/api/en-vivo` de `src/ui/en-vivo.ts`, que corre en toda pantalla); hay 0 conexiones WebSocket y 0 descargas de archivos de Retos, de `online/` o de `ably`; y el código nuevo de la pantalla final no contiene `setInterval` ni `setTimeout`.
- **CA-2** (RF-01, RF-12, RF-15) Dado el HTML de la pantalla final, entonces el orden es: `#share`, `#download`, `#rankBox`, `#retarBox`, los bloques de totales y dinero, `#again`, el bloque "¿Te gustó?" (inmediatamente después de `#again`) y el pie; el número de enlaces de donación es el mismo que antes de la feature (2 con la constante de donación puesta). Con el interruptor apagado hay 0 elementos `#retarBox` y el resto de los elementos son los mismos y están en el mismo orden que en la rama base (se compara el DOM, no el texto: la condición vacía puede dejar un salto de línea, como ya pasa con la donación).
- **CA-3** (RF-05, RF-11) Dado un dispositivo con perfil y un servidor simulado en buen estado, cuando se toca "Retar a alguien en línea" 1 vez, entonces sale exactamente 1 petición, `POST /api/sala` con cuerpo `{"accion":"crear"}`; salen 0 peticiones a `/api/perfil` y 0 a `/api/sala` sin código; la pantalla pasa a "Sala XXXXXX" con el enlace que mandó el servidor; y en el servidor esa llamada hace exactamente 5 consultas (`hashDe`, `contarSalas`, `leerPerfil`, `limpiar`, `crearSala`) y 0 llamadas a Ably.
- **CA-4** (RF-06, RF-09, RF-11) Dado un dispositivo sin perfil y una carrera cuyo jugador se llama "Marco Pérez", cuando se toca el botón, entonces sale 1 petición `GET /api/sala` sin credenciales, 0 de creación, y se ve "Elegí tu apodo" con el campo vacío (valor `""`). Al enviar el apodo "Chamuco" salen 1 `PUT /api/perfil` y 1 `POST /api/sala` (acción `crear`); el cuerpo de ninguna contiene "Marco" ni "Pérez"; en total son 3 llamadas y 8 consultas (`guardarPerfil`, `leerPerfil`, `mejorCarrera`, más las 5 de CA-3). "Atrás" lleva a la entrada de Retos.
- **CA-5** (RF-07, RF-11) Dado Retos en línea no disponible (sin llave de tiempo real), entonces con perfil el clic hace 1 petición, que responde 503 con 0 consultas a Neon, y sin perfil hace 1 `GET /api/sala` que responde `enLinea: false` con 0 consultas; en ambos casos el aviso es exactamente `Retos en línea no está disponible ahora. Probá más tarde desde Retos, en el inicio.`, el botón queda inactivo, un segundo clic hace 0 peticiones, y la pantalla final conserva `#rankBox`, `#again`, el bloque de donación, el pie y el funcionamiento de `#share`.
- **CA-6** (RF-07, RF-10, RF-11) Dado un dispositivo que ya creó 5 salas en la última hora, cuando se toca el botón, entonces el servidor responde 429 con 2 consultas (`hashDe`, `contarSalas`), el aviso es exactamente `Ya creaste varias salas seguido. Probá en un rato desde Retos, en el inicio.`, el botón queda inactivo y un segundo clic hace 0 peticiones. Dada una IP que ya creó 10 salas en la última hora, responde 429 con 1 consulta. `git diff` de `api/_limite.ts` contra la rama base: vacío.
- **CA-7** (RF-07) Dada la red caída (la petición no llega), entonces el aviso es exactamente `No hay conexión con el servidor. Probá de nuevo.`, el botón se reactiva y tiene el foco, y el siguiente clic hace 1 petición nueva. Dada una respuesta 500, el aviso es `No se pudo crear la sala. Probá de nuevo.` y el botón se reactiva.
- **CA-8** (RF-03) Dados 2 clics en menos de 50 ms, entonces sale 1 sola petición de creación. Mientras el intento está en curso el aviso dice `Creando la sala…` y el botón está inactivo.
- **CA-9** (RF-08, RF-14) Dada una sala creada desde la final, entonces `location.search` sigue vacío (0 veces `sala=` en la barra de direcciones), no se llamó a `navigator.share`, ni al portapapeles, ni a `window.open`; el enlace visible es el que mandó el servidor; y con Compartir (menú del sistema simulado) o Copiar enlace el anfitrión entrega ese mismo enlace. "Salir" del encabezado lleva al Home, no a la final, y no sale ninguna petición a `/api/carreras` ni a `/api/ranking`.
- **CA-10** (RF-02, RF-09) Dado el código, entonces `src/main.ts` no importa de forma estática nada de `./retos/` salvo `./retos/online/protocolo` (que ya importaba), el módulo nuevo se pide solo con `import()` dentro del manejador del clic, y la función que arma el intento **no recibe parámetros**: no puede recibir nada de la carrera. El módulo nuevo no contiene `career`, `fullName`, `setup`, `innerHTML`, `localStorage` ni `console.`.
- **CA-11** (RF-13) A 360 × 640 y a 1280 × 800, en tema claro y oscuro, el bloque nuevo no produce desplazamiento horizontal, el botón mide 48 px de alto o más, el bloque mide 150 px de alto o menos a 360 px de ancho (sin aviso), el aviso se lee con lector de pantalla (región `role="status"`), y Tab llega al botón después del ranking y antes de los bloques siguientes.
- **CA-12** (RF-01, RF-04) Dado el alcance, `git diff --stat` contra la rama base solo toca `src/main.ts`, `src/retos/index.ts`, `src/retos/online/desde-final.ts` (nuevo), `scripts/retar-desde-final.test.ts` (nuevo) y `specs/retar-desde-final/`; 0 líneas en `api/`, `db/`, `package.json`, `package-lock.json`, `privacidad.html`, `terminos.html`, `src/retos/retos.css` y `specs/backlog.md` (`src/style.css` solo para el estilo compacto de `#retarBox`, ajuste post-revisión UX). En `src/main.ts` el diff agrega a lo sumo 40 líneas y quita a lo sumo 1; este cambio no altera la primera línea de `finish()` (hoy `contarCarrera('terminada');`); las líneas de `#again`, del bloque de donación y de `guardar` no cambian. El paquete principal crece a lo sumo 1 KB comprimido (RF-35 de `retos-en-linea` pide que la primera carga no crezca más de 3 KB).
- **CA-13** (RF-15) Con el interruptor apagado, `finish()` termina sin lanzar ningún error, no existe `#retar` y no se hace ninguna llamada al módulo nuevo. La comprobación estática exige que el interruptor aparezca en exactamente 2 condiciones: la que envuelve el bloque y la que envuelve el enlace del manejador.
- **CA-14** (regresión) `npm run build` termina sin error y las pruebas `retos`, `online-cliente`, `compartir`, `sala`, `perfil`, `seguridad-api`, `contador-carreras`, `ranking-limite` y `headers` siguen en verde.

## Seguridad (OWASP Top 10)
- **A01 (control de acceso)**: el pase `?sala=` es una credencial de entrada. Aquí solo existe en el lobby, que ya lo muestra al anfitrión (RF-08), y sale solo por clic del anfitrión; la pantalla final no lo contiene y la barra de direcciones no lo recibe. El destino que abre la sala creada lo construye únicamente el manejador del clic con la respuesta del servidor; nada de la URL ni del almacenamiento lo puede fabricar (la URL solo produce destinos `{ sala }` validados con `CODIGO_RE`). Quien crea la sala es el dispositivo con credencial; sin credencial el servidor no crea nada (`sin_perfil`).
- **A02 (cifrado)**: sin cambios; todo va por HTTPS. Ningún secreto nuevo en el cliente; el token del dispositivo sigue solo en cabeceras y en el almacenamiento de `cliente.ts`.
- **A03 (inyección)**: los avisos son texto fijo del código asignado con `textContent`; ningún dato del servidor ni de la carrera entra a un aviso. El bloque nuevo del HTML es estático (sin interpolar ningún dato de la carrera). La respuesta de creación se valida con la forma que ya exige el cliente (`esRespuestaSala`) antes de pintar. Cero `innerHTML` nuevo con datos.
- **A04 (diseño inseguro)**: es el riesgo principal por ser la razón de que estuviera fuera. Medidas: nada se crea sin clic explícito (RF-03); un solo intento por clic y botón inactivo mientras tanto; tras "tope" y "no disponible" el botón queda inactivo (RF-07); los topes del servidor (10 por hora por IP, 5 por hora por dispositivo y los límites por minuto) no se tocan (RF-10, CA-6); cero sondeo nuevo; el costo del clic está fijado por una prueba (RF-11); un interruptor lo apaga (RF-15). El peor caso es una persona que crea 5 salas por hora y las abandona: cada una cuesta lo descrito en "la sala que nadie usa" y las vacía el servidor al pasar 1 hora sin actividad.
- **A05 (configuración)**: sin cambios de cabeceras, entorno ni CSP; el módulo nuevo es del mismo origen. `vercel.json` no cambia.
- **A06 (componentes)**: cero dependencias nuevas; `package.json` y `package-lock.json` sin cambios (CA-12).
- **A07 (autenticación)**: la identidad del dispositivo no cambia. El apodo no se precarga con el nombre de la carrera (RF-09); el perfil nuevo se crea con el mismo flujo, filtros de apodo y avatar al azar de siempre.
- **A08 (integridad)**: la sala, sus puntos y el ranking de Retos los calcula el servidor como hasta ahora. El botón no manda ni modifica puntos, ni toca el ranking de carreras.
- **A09 (registros y monitoreo)**: no se agrega `console.*` ni registro. El monitoreo del costo se hace con las gráficas de uso de Neon, Vercel y Ably (ver plan, "Medición posterior").
- **A10 (SSRF)**: sin llamadas salientes nuevas del servidor ni del cliente salvo las de Retos en línea que ya existen (el cliente solo habla con el mismo origen y con Ably por el flujo existente).
- **Privacidad (`privacidad.html`)**: verificada, no cambia. Las líneas de "Retos en línea y perfil" ya dicen qué se guarda (apodo, avatar, favoritos, estadísticas, identificador anónimo del dispositivo y su verificador secreto, contenido de la sala), para qué, quién lo procesa (Vercel, Neon, Ably) y cuánto tiempo, y que es opcional. Esta feature solo agrega un camino para llegar a lo mismo, con un clic explícito, sin enviar nada nuevo (la petición de creación no lleva campos; el perfil lleva el mismo apodo y avatar al azar). Si en el futuro se precargara el apodo con el nombre de la carrera, sí habría que reescribir esa sección.

## Decisiones (supuestos explícitos; ninguna bloquea)
1. **El botón se ve siempre; no se consulta la disponibilidad al dibujar la pantalla.** Ocultarlo cuando Retos en línea no está disponible (`retos-en-linea` RF-01 lo hace en la entrada de Retos) exigiría una llamada a una función por **cada** pantalla final dibujada, antes de saber si alguien quiere retar; hoy ya hay 2 llamadas por carrera terminada. Se acepta ver el botón y recibir el aviso al tocarlo (RF-07). El brief admite "no aparece o falla con un mensaje corto".
2. **Con credencial, se crea antes de salir de la final; sin credencial, solo se comprueba la disponibilidad.** Con credencial existe un perfil casi seguro y la creación es 1 llamada: intentarla sin salir de la final deja la pantalla intacta ante tope, caída o servicio apagado (RF-07), y ahorra la lectura del perfil que el flujo de entrada hace (1 Fn y 3 Q). Sin credencial, hay que pasar por la pantalla de apodo (que es de Retos), así que antes se comprueba la disponibilidad con la llamada más barata (1 Fn, 0 Q). La alternativa más simple (comprobar disponibilidad y abrir siempre el flujo de entrada) cuesta 1 Fn más por clic con perfil y deja el tope y las caídas dentro de Retos, con la final ya reemplazada.
3. **Posición del bloque: después del ranking, antes de los totales** (RF-01). Es el punto más alto de la pantalla sin competir con la tarjeta y "Compartir", y deja a "Jugar otra carrera", "¿Te gustó?" y el pie contiguos y sin tocar. Alternativa descartada: justo antes de "Jugar otra carrera" (más abajo, tras el diario de temporadas, menos visible); es un cambio de una línea si el PO lo prefiere.
4. **La salida es el Home, no la final** (RF-14): volver a llamar a `finish()` repite `contarCarrera('terminada')`, el envío al ranking y el registro en `BEST_KEY`, y con `continuar-carrera` ya no hay carrera guardada a la cual volver.
5. **La sala nace con la configuración por defecto** (Reto completo); el anfitrión la cambia en el lobby. No se agrega una pregunta en la final.
6. **Interruptor en el código** (RF-15), en el mismo estilo que la constante de donación: la razón de que estuviera fuera es el costo y conviene poder apagarla con un despliegue. No es una variable de entorno nueva.
7. **Sin medición nueva.** El brief del backlog la puso condicionada a analítica; aquí no se agrega `?ref=` ni contadores. Se mide con las gráficas y una consulta de solo lectura (plan).
8. **No se toca el sondeo de la sala ni los topes** (restricción de costo del usuario). Si la sala huérfana resulta cara, la palanca es `REFRESCO_MS`, en otra feature.
9. **Condiciones de reactivación del backlog no cumplidas.** Retos tiene masa mínima dudosa (5 perfiles y 14 partidas según el informe de finanzas) y no hay plan de pico. El usuario decidió seguir. Se recomienda, sin bloquear, tener antes de desplegar la regla de límite de uso del Firewall de Vercel y las alertas de Neon y Vercel (ítem 2 del informe).
10. **`privacidad.html` y `terminos.html` no cambian** (ver Seguridad, "Privacidad").
11. **Sin perfil y sin red, el aviso es "no disponible", no "sin conexión"** (aclarado al implementar). En el camino sin perfil la comprobación usa `infoEnLinea()`, que por diseño cuenta cualquier falla (sin red, sin API, respuesta rara) como "no" (`retos-en-linea` RF-01) y no distingue la causa. Con la red caída y sin perfil el aviso es `Retos en línea no está disponible ahora. Probá más tarde desde Retos, en el inicio.` y el botón queda inactivo en esa visita; el aviso `No hay conexión con el servidor. Probá de nuevo.` (CA-7) aplica al camino con perfil. Distinguirlos exigiría otra llamada o cambiar `cliente.ts`, y ambos están fuera de alcance. La prueba lo fija.
12. **La salida de la sala creada desde la final** (aclarado al implementar): el "Salir" del encabezado lleva al Home (RF-14); el botón "Salir de la sala" del lobby, ya existente y sin cambios, lleva a la entrada de Retos, desde donde "Salir" lleva al Home. Ningún camino llama a `finish()`.
13. **Ajuste post-revisión UX** (2026-10-15, `informes/2026-10-15-ux-integracion.md` M-1, M-2, M-3, B-7): el bloque pasa de 253 px a 144,5 px a 360 px de ancho (sin eyebrow ni párrafo de invitación; frase de aviso de que se sale de la pantalla y de que conviene guardar la imagen antes; estilo compacto de `#retarBox` en `src/style.css`). El botón se llama "Retar a alguien en línea", igual que en la entrada de Retos. Los avisos definitivos (no disponible y tope) mandan a Retos desde el inicio, porque el botón no se reactiva en esa pantalla. No se guarda el resumen de la final (decisión del orquestador).

## Conflictos con specs y código existentes
- `specs/backlog.md` sigue diciendo "No por ahora" y "queda fuera"; la decisión del usuario del 2026-10-15 la supera. El backlog no se edita aquí; el orquestador decide si lo actualiza.
- `specs/compartir-retos`, "Fuera de alcance" y A04, dice que no hay forma de "retar" desde el resultado y cita `retar-desde-final` como descartada. Se refiere al **resultado de Retos** y a **reenviar el pase de una sala viva**; esta feature no hace ninguna de las dos cosas: crea una sala **nueva**, desde la final de la **carrera**, y el pase sigue saliendo solo por la invitación del lobby (RF-03 y RF-12 de `compartir-retos`, intactos). El RF-11 de `compartir-retos` (los resultados no llevan `sala=`) se cumple tal cual. Esa spec no se edita.
- `specs/retos-en-linea` RF-01: ahí la opción en línea no aparece cuando el modo no está disponible; aquí el botón se ve y falla con aviso (Decisión 1). Es una desviación consciente y limitada a esta pantalla.
- `specs/boton-donacion` RF-02 y CA-2: se cumplen (RF-12, CA-2).
- `specs/contador-carreras`: `contarCarrera('terminada')` sigue siendo la primera línea de `finish()` (CA-12).
- `ranking-rate-limit`: el bloque `rankBox` y su función `guardar` no se tocan.
- `continuar-carrera` (en curso, sin spec en esta rama): comparte `finish()` y `src/main.ts`. Riesgo de fusión, no de comportamiento (ver plan, "Riesgos").
- `retos-en-linea` RF-35: el paquete principal puede crecer a lo sumo 1 KB comprimido (CA-12); el código de Retos en línea solo se descarga tras el clic.

## Aclaraciones
Ninguna bloquea el plan ni la implementación. Con default ya aplicado: (a) Decisión 3, posición del bloque; (b) Decisión 1, botón siempre visible; (c) Decisión 6, interruptor en el código; (d) supuesto de autosuspensión de Neon de 5 minutos (solo afecta la estimación de CU-h); (e) Decisión 9, recomendación de activar límite del Firewall y alertas antes de desplegar.
