# Compartir desde Retos Fútbol

Origen: ítem 2 de `specs/backlog.md` (aprobado por el usuario el 2026-10-15 junto con el resto del backlog). Ramas paralelas tocan `src/main.ts` y `src/retos/` (`reto-del-dia`, `ranking-rate-limit`): esta feature no toca `src/main.ts` y cambia lo mínimo en `src/retos/`.

## Problema y valor
El tráfico llega por WhatsApp y la carrera ya tiene un botón "Compartir" (tarjeta + texto + `navigator.share`), pero **ninguna pantalla de Retos** deja compartir lo que acaba de pasar. Quien termina un duelo, local o en línea, no tiene cómo mostrarlo, y esa es la única palanca de adquisición con operación cero: sin servidor nuevo, sin dependencias, sin costo por uso.

Valor: más visitas desde mensajes entre amigos. Es adquisición, no ingreso directo (el backlog lo dice así).

## Alcance
- Botón **Compartir** en la pantalla de resultado final de toda partida de Retos: en el mismo celular (categoría suelta y Reto completo) y en línea.
- Mecanismo con tres escalones, sin dependencias: menú de compartir del sistema (`navigator.share`) → enlace de WhatsApp → copiar el texto.
- Texto corto en español de Guatemala (voseo) y un enlace al sitio. **Nunca** lleva el pase de sala.
- En el lobby de una sala en línea, la invitación que ya existe (RF-03 de `specs/retos-en-linea`) gana el escalón de WhatsApp cuando el navegador no tiene menú de compartir.

## Fuera de alcance
- Imagen o tarjeta del resultado (la carrera la tiene; en Retos requeriría dibujo en canvas por categoría). Si se pide, es otra feature.
- Un "Retar" desde el resultado o cualquier forma de reenviar el pase de una sala viva (`retar-desde-final` está descartada en el backlog).
- Compartir desde el ranking de Retos, el perfil o la carrera (la carrera ya comparte y no cambia).
- Medir (analítica, contador de compartidos): el enlace trae `?ref=reto` y nada más (Decisión 1).
- Cambios en la API, en la base de datos, en `src/main.ts`, `privacidad.html` o `terminos.html`.
- Rastreo de a quién se le compartió o si lo abrió.

## Requisitos funcionales

### Dónde aparece
- **RF-01** (local, resultado final) La pantalla que cierra una partida en el mismo celular muestra el botón "Compartir" (o sus alternativas de RF-04), en dos casos: categoría suelta (ping pong de país, de club, preguntas o ¿De dónde es?) y el resultado final del Reto completo. El marcador intermedio del Reto completo ("Siguiente: …") **no** lo muestra.
- **RF-02** (en línea, resultado) En una sala en fase de fin, la pantalla de resultado muestra "Compartir" a **ambos** jugadores, sea cual sea el resultado (ganó, empató o perdió). No lo muestra si la partida terminó por **abandono** (de cualquiera de los dos) ni si el resultado no trae marcador.
- **RF-03** (invitación, ya existe) El anfitrión sigue viendo "Compartir" y "Copiar enlace" en el lobby mientras la sala tiene **un solo** jugador. Si el navegador **no** ofrece menú de compartir, ve además "Enviar por WhatsApp". Si lo ofrece, no cambia nada respecto de hoy. El invitado y el anfitrión con la sala llena no ven nada de esto.

### Cómo se comparte
- **RF-04** (escalones) Al tocar "Compartir" en un resultado: (1) si el navegador tiene `navigator.share`, se abre el menú del sistema con el texto y el enlace; (2) si no lo tiene, en su lugar se ven dos acciones: un enlace "Enviar por WhatsApp" que abre WhatsApp con el mensaje armado y un botón "Copiar texto"; (3) si el menú del sistema falla por una razón distinta de que la persona lo cerró, se copia el texto como en el escalón 2.
- **RF-05** (cancelar no es error) Si la persona cierra el menú del sistema, no aparece ningún mensaje ni se copia nada.
- **RF-06** (copiar) "Copiar texto" deja en el portapapeles el texto más un espacio y el enlace, y avisa "Copiamos el texto. Pegalo en WhatsApp." en una región `role="status"`. Si el navegador no deja copiar, el texto con el enlace queda visible en un campo de solo lectura, seleccionado, y el aviso dice "Seleccioná el texto y copialo."
- **RF-07** (WhatsApp) El enlace de WhatsApp es `https://wa.me/?text=<mensaje codificado>`, se abre en otra pestaña sin acceso a la del juego y lo dice a quien usa lector de pantalla ("se abre en otra pestaña"), igual que los demás enlaces externos de Retos.

### Qué dice
- **RF-08** (texto) El texto del resultado lo arma una función que solo recibe: categoría, marcador `[a, b]` (enteros), quién ganó (`0`, `1` o empate) y, en línea, cuál índice es quien comparte. **No recibe apodos, nombres locales, código de sala ni enlace de sala**, así que no puede incluirlos. Plantillas (voseo):
  - En línea, primera persona: `Gané|Empaté|Perdí <frase> en Chamusqueros (<propio> a <rival>). ¿Te animás?`
  - Mismo celular: `Jugamos <frase> en Chamusqueros: terminó <mayor> a <menor>. ¿Te animás?` o, en empate, `…: empatamos <a> a <b>. ¿Te animás?`
  - `<frase>`: `un duelo de ping pong de país`, `un duelo de ping pong de club`, `un duelo de preguntas de fútbol`, `un duelo de ¿De dónde es?`, `un Reto completo`.
  - En el Reto completo el marcador es de **categorías ganadas** (por ejemplo `2 a 1`).
  - Largo máximo del texto sin enlace: 160 caracteres.
- **RF-09** (números) Los marcadores se normalizan antes de entrar al texto: entero entre 0 y 99999; cualquier otra cosa (`NaN`, negativo, texto) vale 0.

### Qué enlace lleva (seguridad del pase)
- **RF-10** (enlace del resultado) El enlace de un texto de resultado es **siempre** `<origen del sitio>/?ref=reto`, con el origen de `VITE_SITE_URL` (o `location.origin` si no está), igual que la carrera. Se arma desde el origen, **nunca** desde `location.href`, `location.search` ni `location.hash`: mientras alguien está dentro de una sala, la barra de direcciones tiene `?sala=CODIGO`, y esa cadena no debe viajar.
- **RF-11** (pase) Un texto o enlace de **resultado** contiene 0 veces `sala=` y 0 veces el código de la sala, también cuando la sala sigue abierta (revancha pendiente, 30 minutos de vida). El pase solo se comparte en la **invitación del lobby** (RF-03), por acción explícita del anfitrión y mientras falta el segundo jugador. Nada se comparte solo: sin envíos automáticos ni al cargar la pantalla.
- **RF-12** (invitación) El mensaje de WhatsApp de la invitación es `Te reto a un duelo de fútbol en Chamusqueros: <enlace de la sala>`, con el mismo enlace que ya muestra el lobby.

### Calidad
- **RF-13** (sin efectos) Compartir no llama a la API, no escribe en el almacenamiento del navegador y no agrega dependencias. Retos en el mismo celular sigue sin guardar nada (`specs/retos-futbol` RF-28).
- **RF-14** (accesibilidad) Los botones y el enlace nuevos usan las clases de botón existentes (alto mínimo de 48 px en Retos), tienen texto visible, se alcanzan con teclado en el orden de lectura y no se desbordan a 360×640. Los avisos van en una región `role="status"`.

## Criterios de aceptación
Los CA-1 a CA-6 se prueban con `npx tsx scripts/compartir.test.ts` (funciones puras, sin red ni DOM). Los CA-7 a CA-12 se verifican en el navegador (ver tasks).

- **CA-1** (RF-08) Dado `¿De dónde es?`, marcador `[520, 340]`, ganó el índice 0 y yo = 0, cuando se arma el texto, entonces es exactamente `Gané un duelo de ¿De dónde es? en Chamusqueros (520 a 340). ¿Te animás?`. Con yo = 1 es `Perdí un duelo de ¿De dónde es? en Chamusqueros (340 a 520). ¿Te animás?`.
- **CA-2** (RF-08) Dado `preguntas`, `[3, 3]`, empate y yo = 0, entonces `Empaté un duelo de preguntas de fútbol en Chamusqueros (3 a 3). ¿Te animás?`. Dado `completo`, `[2, 1]`, ganó 0 y yo = 0, entonces `Gané un Reto completo en Chamusqueros (2 a 1). ¿Te animás?`.
- **CA-3** (RF-08) Dado el modo local (sin yo), `pais`, `[4, 6]`, ganó 1, entonces `Jugamos un duelo de ping pong de país en Chamusqueros: terminó 6 a 4. ¿Te animás?`; con `[2, 2]` y empate, `Jugamos un duelo de ping pong de país en Chamusqueros: empatamos 2 a 2. ¿Te animás?`.
- **CA-4** (RF-09) Dado un marcador `[NaN, -5]`, `[1e9, "7"]` o `[undefined, 3.9]`, entonces los números salen `0 a 0`, `99999 a 7` y `0 a 3`, y el texto sigue midiendo ≤ 160 caracteres. Con el marcador más largo posible (`99999 a 99999`) el texto más largo mide ≤ 160.
- **CA-5** (RF-10, RF-11) Dado `VITE_SITE_URL = https://chamusqueros.vercel.app/` (con barra final), o vacío con `location.origin = https://chamusqueros.vercel.app`, entonces el enlace del resultado es exactamente `https://chamusqueros.vercel.app/?ref=reto`. Con un valor inválido (`javascript:alert(1)`, cadena vacía sin origen) el enlace cae al origen de la página o, si tampoco es `http(s)`, a `https://chamusqueros.vercel.app/?ref=reto`.
- **CA-6** (RF-02, RF-11) Dado un `PartidaPublica` en fin con `abandono = null`, una sala con código `ABCDE2` y revancha pendiente, entonces la regla que decide si hay botón en línea devuelve datos y el texto y el enlace resultantes contienen 0 veces `sala=` y 0 veces `ABCDE2`. Con `abandono = 0`, `abandono = 1`, `final = null` o sin `resultados`, esa regla no devuelve nada (no hay botón). Una categoría fuera de las cinco conocidas tampoco produce texto ni botón.
- **CA-7** (RF-01, RF-04, RF-14) En el modo mismo celular, una partida de ¿De dónde es? terminada muestra 1 botón "Compartir" junto a "Revancha"; en un Reto completo el marcador intermedio muestra 0 botones "Compartir" y el resultado final muestra 1. Con `navigator.share` simulado, un clic lo llama 1 vez con `{ text, url }` y `url` = `https://chamusqueros.vercel.app/?ref=reto`.
- **CA-8** (RF-04 a RF-07) Sin `navigator.share`, el resultado muestra 1 enlace con `href` que empieza por `https://wa.me/?text=`, `target="_blank"` y `rel` con `noopener noreferrer`, y 1 botón "Copiar texto". Con el portapapeles simulado, un clic en "Copiar texto" lo llama 1 vez con `<texto> <enlace>` y la región de estado dice "Copiamos el texto. Pegalo en WhatsApp." Con `navigator.share` que rechaza con `AbortError`: 0 copias y 0 mensajes; con `NotAllowedError`: 1 copia. Con portapapeles y `execCommand` fallidos: el campo de solo lectura queda visible con el texto.
- **CA-9** (RF-02, RF-11) Con la página abierta en `/?sala=ABCDE2` (sala mostrada desde un servidor simulado en fase de fin con revancha pendiente), el clic en "Compartir" entrega al menú simulado un `text` y un `url` que contienen 0 veces `sala=` y 0 veces `ABCDE2`. Con `abandono` distinto de `null`, la pantalla muestra 0 botones "Compartir".
- **CA-10** (RF-03, RF-12) En el lobby de una sala con 1 jugador y sin `navigator.share`, el anfitrión ve 1 enlace de WhatsApp cuyo `text` decodificado es `Te reto a un duelo de fútbol en Chamusqueros: https://chamusqueros.vercel.app/?sala=ABCDE2`. Con `navigator.share`, 0 enlaces de WhatsApp y el comportamiento de hoy. Con 2 jugadores, el bloque de invitación sigue oculto. El invitado no lo ve nunca.
- **CA-11** (RF-13) Tras compartir y copiar, `localStorage`, `sessionStorage` y las cookies quedan sin claves nuevas, y la red del navegador no muestra ninguna petición a `/api/` causada por el clic. `package.json` y `package-lock.json` no cambian.
- **CA-12** (alcance) `git diff --stat origin/main` solo toca `src/retos/compartir.ts` (nuevo), `src/retos/index.ts`, `src/retos/online/ui-sala.ts`, `scripts/compartir.test.ts` (nuevo), `specs/compartir-retos/` y, si hace falta, hasta 2 líneas de `src/retos/retos.css`; 0 líneas en `src/main.ts`. `npm run build` y las pruebas de regresión (`retos`, `trivia`, `dedonde`, `online-cliente`, `sala`) pasan.

## Seguridad (OWASP Top 10)
- **A01 (control de acceso)**: el pase de sala (`?sala=`) es una credencial de entrada a una sala viva. Se comparte solo en la invitación (RF-03, RF-11), solo el anfitrión, solo con un jugador, solo por clic. El texto de resultado se arma con una función que **no recibe** el código ni el enlace (RF-08): no filtrar es una propiedad del tipo, no de una condición. El enlace del resultado sale del origen, nunca de la URL actual (RF-10). Sin API nueva, sin permisos nuevos.
- **A02 (cifrado)**: los enlaces son `https://` (dominio de `VITE_SITE_URL`/origen y `wa.me`). Nada secreto viaja: ni token, ni identificador de dispositivo, ni el verificador del perfil.
- **A03 (inyección)**: el texto va a tres destinos y cada uno tiene su regla, sin mezclarlas. (1) `navigator.share`: cadena plana, sin escape HTML. (2) Enlace de WhatsApp: `encodeURIComponent` del mensaje completo (el enlace de la sala lleva `?` y `=`) y atributos puestos con `h()`/`setAttribute`, nunca concatenados en una plantilla de marcado. (3) Cualquier texto visible (avisos, campo de respaldo): `textContent`/`value` por `h()`. **`innerHTML` y `esc()` no se usan** en este código: `esc()` es para armar marcado y aquí no se arma ninguno. Los apodos y nombres locales **no entran** en el texto (RF-08); lo único que viene de la red o del juego son enteros normalizados (RF-09), la categoría (clave de un diccionario cerrado; si no existe, no hay botón) y el enlace de invitación, que ya llega validado por `CODIGO_RE` y se codifica al entrar al mensaje.
- **A04 (diseño inseguro)**: el modelo de amenaza está escrito: el pase solo sale por la invitación explícita, y un resultado terminado con la sala todavía abierta (revancha) no lo filtra. No hay forma de "retar" desde el resultado (descartado en el backlog).
- **A05 (configuración)**: sin cambios de cabeceras ni de entorno. `VITE_SITE_URL` ya existe; si falta o es inválida, el enlace cae a un dominio fijo (CA-5).
- **A06 (componentes)**: cero dependencias nuevas; `navigator.share`, `clipboard` y `wa.me` son del navegador.
- **A07 (autenticación)**: no se toca la identidad del dispositivo ni se muestra a nadie.
- **A08 (integridad)**: el marcador compartido es el que ya calculó el servidor (en línea) o el motor local; compartir no manda ni modifica puntos. Se asume que quien comparte puede editar el texto en WhatsApp; el texto no prueba nada.
- **A09 (registros)**: no se agrega ningún registro ni `console.*`.
- **A10 (SSRF)**: sin llamadas salientes del servidor. El único destino externo es `https://wa.me/`, abierto por la persona, con `noopener noreferrer`.

## Decisiones (supuestos explícitos; ninguna bloquea)
1. **`?ref=reto` en el enlace del resultado**, no en la invitación. El backlog lo condiciona a la analítica de nivel B (rama `headers-analitica`, sin conceder). Sin analítica es inerte: `src/main.ts` solo lee `sala`. Se incluye porque agregarlo después obligaría a tocar de nuevo estas pantallas; si el usuario no concede B, se quita cambiando la constante `REF_RESULTADO` a vacío. No se agrega a la invitación porque el servidor arma ese enlace.
2. **Sin imagen**: texto y enlace. Es lo que WhatsApp reenvía mejor y no suma código de canvas ni peso.
3. **Sin nombres en el texto**, ni locales ni apodos de la red. Razones: `privacidad.html` y `specs/retos-futbol` RF-28 prometen que los nombres del modo local no salen del dispositivo (con nombres tendríamos que reescribir ese texto legal), y el rival en línea no consintió aparecer en el mensaje de otra persona. Costo: el mensaje es menos personal. Se puede revisar, pero entonces entra el cambio legal y un filtro de caracteres de control y de dirección de texto.
4. **Se comparte también una derrota o un empate** en línea (primera persona), pero **no un abandono**: "ganar" porque el rival se fue no es un resultado que presumir, y "perder" por irse tampoco.
5. **El enlace de la invitación no cambia** (lo arma el servidor con el dominio fijo; `LINK_BASE` en `ui-sala.ts` es el respaldo). El enlace del resultado usa `VITE_SITE_URL`/origen, como la carrera. La diferencia de dominio entre ambos es preexistente y no se corrige aquí.
6. **El helper vive en `src/retos/compartir.ts`**, no en `src/ui/`, para no engordar el paquete principal; Retos se baja con `import()`.
7. **Solo la pantalla de resultado final** lleva el botón; el marcador intermedio del Reto completo, no (el resultado de una sola categoría no es lo que se presume).

## Conflictos con specs y código existentes
- `specs/retos-en-linea` RF-03: la invitación gana el escalón de WhatsApp (aditivo; nada se quita). No se edita esa spec.
- `specs/retos-futbol` RF-28 y `privacidad.html`: se **respetan** gracias a la Decisión 3. Si se revierte esa decisión, hay conflicto y hace falta un cambio legal.
- `src/main.ts` `shareText` y el botón de la carrera: no se tocan ni se reutilizan en código (están dentro de `main.ts`, que otras ramas editan); se reutiliza el **patrón** (menú del sistema, copiar, ignorar `AbortError`).
- Las pruebas `scripts/online-cliente.test.ts` (sin `innerHTML` fuera de lo permitido, y el grafo de imports del modo en línea no llega a `preguntas.json`, `futbolistas.json` ni `trivia.ts`) aplican al nuevo código: `compartir.ts` solo importa `comun.ts`.

## Aclaraciones
Ninguna bloquea el plan ni la implementación. Pendientes de confirmar por el usuario, con default ya aplicado: (a) la Decisión 1 (`?ref=reto`) depende de la analítica de nivel B; (b) la Decisión 3 (sin nombres) se puede cambiar si prefieren mensajes más personales, a costa del texto legal.
