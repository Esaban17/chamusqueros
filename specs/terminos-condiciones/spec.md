# Términos y condiciones y política de privacidad exacta

## Problema y valor

Chamusqueros muestra públicamente el nombre y la carta de cada jugador en un ranking, y pronto recibirá donaciones. No tiene términos. Su política de privacidad dice que los datos no salen del navegador, lo cual es inexacto desde que existe el ranking, y habla de anuncios de Google AdSense que el usuario decidió no usar.

Usuarios: quien publica su nombre en el ranking y quien dona.

Valor: antes de publicar un nombre o pagar una donación, cada persona puede leer las reglas, los datos que quedan guardados y cómo pedir que los borren. El operador queda con reglas claras para borrar entradas, reiniciar el ranking y no dar garantías.

Si no se hace: la política sigue siendo inexacta y no hay una forma documentada de pedir un borrado.

## Alcance

- Página de términos y condiciones, enlazada desde el pie de página junto a la política de privacidad.
- Corrección de la política de privacidad: qué guarda el ranking, para qué, quién lo procesa, cómo pedir el borrado, qué servicios externos contacta el juego y qué pasa con las donaciones.
- Ambas páginas muestran el mismo correo de contacto real, sin marcadores.

## Fuera de alcance

- Casilla o bloqueo de aceptación de términos.
- Validar o filtrar nombres en el servidor del ranking (hallazgo de seguridad, ver Conflictos).
- Botón de borrado dentro del juego: el borrado es por solicitud.
- Quitar del código la integración de anuncios. La decisión de no usar anuncios está tomada; la limpieza va en otra rama.
- El botón de donación. Esta feature solo describe la donación.
- Otros idiomas, analítica y cookies que el juego no crea.

## Requisitos funcionales

### Términos y pie de página

- RF-01: En las cuatro pantallas que muestran el pie de página (portada, ranking, debut y final de carrera), aparece el enlace "Términos y condiciones" junto a "Política de privacidad", y lleva a la página de términos.
- RF-02: La página de términos tiene el título "Términos y condiciones", la fecha de última actualización, un enlace "Volver al juego" y la misma estructura y estilo que la página de privacidad.
- RF-03: El juego es gratuito, de ficción y entretenimiento. No se cobra por jugar.
- RF-04: No tiene afiliación con FIFA, EA Sports, federaciones, ligas ni clubes. Los nombres reales se usan solo como referencia, y las marcas pertenecen a sus dueños.
- RF-05: No se permiten nombres ofensivos, que suplanten a otra persona ni que contengan datos personales.
- RF-06: Se reserva el derecho de borrar entradas del ranking y de reiniciarlo.
- RF-07: Las donaciones son voluntarias, no dan ventajas en el juego, no son reembolsables y se procesan en una plataforma externa con sus propios términos.
- RF-08: El servicio se ofrece "tal cual", sin garantías, con limitación de responsabilidad.
- RF-09: Los términos pueden cambiar. Ambas páginas muestran la fecha de última actualización con día, mes y año.
- RF-10: La ley aplicable es la de Guatemala.
- RF-11: Ambas páginas muestran el mismo correo de contacto. [NECESITA ACLARACIÓN: correo de contacto]

### Política de privacidad (corrección)

- RF-12: Lista lo que el ranking guarda por jugador, y solo eso: nombre publicado, identificador anónimo, puntaje, títulos, partidos con la Selección, avatar (aspecto y dorsal), carta (posición, valoración, club, región de origen, pie, partidos, goles, asistencias y país) y fecha de la mejor carrera.
- RF-13: Explica que el identificador anónimo se genera en el dispositivo la primera vez que se juega, que identifica al jugador en el ranking, que cada dispositivo ocupa una sola fila y que la fila se reemplaza solo cuando la nueva carrera es mejor. Dice que el identificador no se muestra a otros jugadores.
- RF-14: Explica para qué se usan los datos: mostrar el ranking y la carta del jugador. Dice que el ranking es público (los 50 primeros y la fila del jugador si quedó fuera) y nombra a los proveedores de alojamiento y de base de datos que procesan esos datos.
- RF-15: Explica qué queda solo en el navegador (los datos del jugador y de sus carreras) y cómo se borran: borrando los datos del sitio en el navegador.
- RF-16: Explica cómo pedir el borrado de la fila del ranking: escribir al correo de contacto con el nombre publicado.
- RF-17: Dice que el sitio no muestra anuncios. No menciona AdSense ni cookies de anuncios.
- RF-18: Nombra los servicios externos que el juego contacta: el servicio de tipografías de Google y el servicio de banderas. Dice que reciben la dirección IP del navegador. Declara que el juego no crea cookies propias.
- RF-19: Nombra la plataforma externa de donación y su política de privacidad, y dice que el sitio no guarda datos de pago. [NECESITA ACLARACIÓN: Ko-fi o Buy Me a Coffee]

### No funcionales

- RNF-01: A 360 px de ancho: sin desplazamiento horizontal y con texto de cuerpo de 16 px o más.
- RNF-02: A 1280 px de ancho: el texto ocupa como máximo 680 px y queda centrado.
- RNF-03: Contraste de 4.5:1 o más en texto y enlaces, en modo claro y en modo oscuro.
- RNF-04: Las dos páginas no cargan recursos de otros sitios y no tienen formularios ni campos de entrada.
- RNF-05: Ambas páginas comparten tipografía, colores y ancho con la página de privacidad.
- RNF-06: Abrir el juego no pide ninguna de las dos páginas.
- Observabilidad: no aplica. No se agrega medición de visitas.

## Criterios de aceptación

- CA-01 (RF-02): Dado que la construcción del sitio termina sin errores, cuando se revisa su salida, entonces incluye la página de términos en `terminos.html`.
- CA-02 (RF-01): Dado el pie de página en las cuatro pantallas, cuando el jugador toca "Términos y condiciones", entonces se abre la página de términos. "Política de privacidad" sigue abriendo la suya.
- CA-03 (RNF-01): Dado un teléfono de 360 px de ancho, cuando se abre cualquiera de las dos páginas, entonces no hay desplazamiento horizontal y el texto del cuerpo mide 16 px o más.
- CA-04 (RNF-02): Dado un escritorio de 1280 px, cuando se abre cualquiera de las dos páginas, entonces el texto ocupa como máximo 680 px y queda centrado.
- CA-05 (RNF-03): Dado el texto y los enlaces en modo claro y en modo oscuro, cuando se mide el contraste, entonces es de 4.5:1 o más.
- CA-06 (RF-02 a RF-10): Dada la página de términos, cuando se revisa, entonces aparece cada punto de RF-02 a RF-10 una vez.
- CA-07 (RF-11, RF-17): Dadas ambas páginas, cuando se corre `grep -i "adsense\|CORREO_DE_CONTACTO" privacidad.html terminos.html`, entonces no hay resultados, y el mismo correo aparece en las dos páginas.
- CA-08 (RF-12): Dada la página de privacidad, cuando se compara su lista de datos con lo que guarda el ranking y la carta del jugador, entonces coinciden: no sobra ni falta ningún dato.
- CA-09 (RF-13, RF-14, RF-18): Dada la página de privacidad, cuando se revisa, entonces explica el identificador anónimo, dice que el ranking es público y nombra a los proveedores y a los servicios externos.
- CA-10 (RF-15, RF-16): Dada la página de privacidad, cuando se revisa, entonces explica cómo borrar los datos del navegador y cómo pedir el borrado de la fila.
- CA-11 (RNF-04, RNF-06): Dada cualquiera de las dos páginas con la red revisada, cuando carga, entonces no hay peticiones a otros dominios. Y al abrir el juego no se pide ninguna de las dos páginas.
- CA-12 (RF-18): Dado el código del juego, cuando se busca la creación de cookies propias, entonces no aparece ninguna.
- CA-13 (RF-19): Dada la plataforma de donación elegida, cuando se revisa la privacidad, entonces aparecen su nombre y un enlace a su política.
- CA-14 (RF-09): Dado un cambio en los términos o en la privacidad, cuando se publica, entonces la fecha de última actualización de esa página cambia.

## Decisiones

- `terminos.html` es una página nueva con la misma estructura y estilo que `privacidad.html`. `privacidad.html` se reescribe en su propio archivo.
- El enlace va en `footer()` de `src/main.ts`, junto al de privacidad.
- La página se agrega a la construcción en `vite.config.ts`, junto a la de privacidad. La comprobación es que `dist/terminos.html` exista tras `npm run build`.
- Título: "Términos y condiciones · Chamusqueros".
- Sin casilla de aceptación.
- Sin anuncios, por decisión del usuario.
- Borrado por correo, con el nombre publicado. No se agrega ninguna función nueva para eso. El riesgo que implica está en `plan.md`.
- Donaciones en plataforma externa. Mientras no se decida cuál, el texto dice "plataforma externa".
- La regla de nombres se publica tal como la decidió el orquestador, aunque el servidor todavía no la haga cumplir. El hallazgo queda registrado en Conflictos.
- Nombres de archivo en español, como `privacidad.html`, por convención del repo.

## Conflictos con el código existente

- Anuncios: `src/ui/ads.ts` carga AdSense si `VITE_ADSENSE_CLIENT` tiene valor. `README.md` (líneas 41 a 50), `.env.example` y `src/style.css` (línea 298) lo documentan. "Sin anuncios" depende de que esa variable esté vacía en producción. Esta rama no permite comprobarlo.
- Privacidad actual: `privacidad.html` (línea 19) dice que los datos no se envían a servidores. Es inexacto desde que existe el ranking: los datos locales sí quedan en el navegador, pero la fila del ranking sí se envía al servidor.
- Nombres: los términos declaran la regla de RF-05, pero `api/ranking.ts` (línea 57) solo recorta espacios y deja 40 caracteres. No hay filtro de contenido ni de suplantación.
- Puntaje: se calcula en el navegador y el servidor solo valida rangos (`api/ranking.ts`, líneas 52 y 53). Por eso RF-06 se reserva el derecho de borrar.

## Aclaraciones abiertas (no bloquean el plan ni la implementación)

- [NECESITA ACLARACIÓN: correo de contacto]. No bloquea. El coordinador lo entrega al implementador; va el mismo en ambas páginas.
- [NECESITA ACLARACIÓN: Ko-fi o Buy Me a Coffee]. No bloquea. Hasta decidirlo, el texto dice "plataforma externa".
