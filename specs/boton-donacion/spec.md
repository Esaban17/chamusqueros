# Monetización: donación en lugar de anuncios

## Problema y valor
El juego es gratis y los jugadores no tienen cómo apoyar al creador. Decisión del usuario: no habrá anuncios. Valor: un aporte voluntario que no pide registro ni interrumpe la carrera, en un juego sin publicidad.

## Alcance
- Enlace de donación en el pie que ya existe en Portada, Ranking, Debut y Final.
- Llamado visible en la pantalla final de la carrera.
- Eliminación completa de Google AdSense del código, las variables de entorno, la documentación y el archivo de publicidad.

## Fuera de alcance
Widgets, overlays y scripts de terceros; anuncios de otro proveedor; registro o contador de clics; donación dentro de las pantallas de juego; cambios de dominio; páginas legales (las cubre la feature de términos y condiciones). Google Fonts y las banderas de flagcdn.com ya existen y no cambian aquí.

## Dependencias (fuera de esta spec)
- La feature de términos y condiciones cubre `privacidad.html` y la página de términos. Debe quitar las menciones a AdSense, mencionar el servicio externo de la donación, corregir lo que dice sobre datos enviados a servidores (el ranking sí envía) y reemplazar el marcador de correo. Esta spec no toca esos archivos.

## Requisitos funcionales
- **RF-01** El pie de Portada, Ranking, Debut y Final tiene un enlace de donación.
- **RF-02** La pantalla final muestra "¿Te gustó?" con el enlace, después de "Jugar otra carrera" y antes del pie.
- **RF-03** El enlace abre una pestaña nueva con una única dirección https fijada en el código. Su nombre accesible indica que abre otra pestaña. La pestaña del juego no cambia.
- **RF-04** Las pantallas de juego (crear jugador, temporada y decisiones) no muestran donación. Ningún modal, banner ni ventana emergente pide donar.
- **RF-05** Al hacer clic, el juego no escribe en el almacenamiento local ni hace peticiones a sus servidores.
- **RF-06** No se agregan scripts, dependencias ni recursos de terceros.
- **RF-07** El texto del enlace tiene contraste de 4,5:1 o más sobre su fondo, en tema claro y oscuro. Su área de toque mide 24 × 24 px o más.
- **RF-08** No aparece desplazamiento horizontal en Portada ni en Final, a 360 px ni a 1280 px.
- **RF-09** Los textos son "¿Te gustó?" e "Invitame un café ☕", en voseo como el resto de la interfaz.
- **RF-10** El repo no conserva AdSense: sin módulo de anuncios, sin llamadas ni estilos de anuncios, sin variables `VITE_ADSENSE_*` en `.env.example`, sin `public/ads.txt` y sin sección de AdSense en el README.
- **RF-11** Ninguna pantalla muestra recuadros de publicidad ni los textos "Publicidad" o "Espacio publicitario".
- **RF-12** El proyecto de Vercel no tiene variables `VITE_ADSENSE_*`.

## Criterios de aceptación
- **CA-1** Dado el pie de Portada, Ranking, Debut o Final, entonces hay un enlace de donación en él. (RF-01)
- **CA-2** Dada la pantalla final, entonces "¿Te gustó?" va entre "Jugar otra carrera" y el pie, y hay dos enlaces de donación en total. (RF-02)
- **CA-3** Dado un clic en cualquier enlace, entonces se abre una pestaña nueva con la dirección fijada, la pestaña del juego sigue en su pantalla y la nueva no recibe la dirección de origen. (RF-03)
- **CA-4** Dado el enlace leído por un lector de pantalla, entonces se anuncia que abre otra pestaña. (RF-03)
- **CA-5** Dada una carrera completa de Debut a "Ver mi carrera", entonces crear jugador, temporada y decisiones no tienen enlace ni ventana que pida donar. (RF-04)
- **CA-6** Dado un clic en el enlace, entonces no se escribe nada en el almacenamiento local y no hay peticiones a los servidores del juego. (RF-05)
- **CA-7** Dado el cambio, entonces las dependencias del proyecto no cambian y `npm run build` termina sin error. (RF-06, RF-10)
- **CA-8** Dados el enlace del pie y el bloque final, en tema claro y oscuro, entonces el contraste es 4,5:1 o más y el área de toque 24 × 24 px o más. (RF-07)
- **CA-9** Dadas las pantallas de Portada y Final a 360 px y a 1280 px, entonces no hay desplazamiento horizontal. (RF-08)
- **CA-10** Dado el bloque final, entonces sus textos son los de RF-09. (RF-09)
- **CA-11** Dado el código, entonces `grep -ri "adsense\|adsbygoogle\|adSlot" src index.html` no devuelve nada; el módulo de anuncios y `public/ads.txt` ya no existen; y `.env.example` y `README.md` no mencionan AdSense ni `VITE_ADSENSE_*`. (RF-10)
- **CA-12** Dadas Portada, decisiones, temporada y final en `npm run dev` y en `npm run build:preview`, entonces no aparece ningún recuadro de publicidad ni los textos "Publicidad" o "Espacio publicitario". (RF-11)
- **CA-13** Dado el panel del proyecto en Vercel, entonces no existe ninguna variable `VITE_ADSENSE_*`. Verificación manual. (RF-12)

## Seguridad (OWASP Top 10 2021)
- A06 y A08: cero scripts y dependencias de terceros nuevos. El enlace no carga código ajeno (RF-06).
- A06 y A08: quitar AdSense elimina un script de terceros que se cargaba en la página cuando estaba configurado. Reduce la superficie de A06 y A08 (RF-10).
- A03: la dirección es una constante del código, nunca un dato del jugador, de la API ni de la URL (RF-03).
- Enlace externo: pestaña nueva, sin acceso a la pestaña del juego y sin enviar la dirección de origen (RF-03).
- Datos: el clic no recolecta nada del jugador (RF-05). El destino usa sus propias cookies; que la política lo diga es tarea de la feature de términos y condiciones (ver Dependencias).
- Resto del Top 10: A01, A02, A04, A05, A07, A09 y A10 no cambian. Quedan recursos de terceros que ya existían (Google Fonts y banderas de flagcdn.com), fuera de esta entrega.

## Decisiones
- AdSense se elimina por completo: decisión del usuario, sin anuncios.
- Portada no tiene llamado propio: el pie basta.
- Los enlaces del pie pasan a tinta con subrayado. El celeste actual da 3,7:1 en tema claro y no cumple RF-07. El enlace de privacidad cambia igual.
- El modo `single` de la configuración de build se conserva: es del plugin de archivo único (`build:preview`), no de publicidad.

## Aclaraciones abiertas (no bloquean)
- [NECESITA ACLARACIÓN: ¿Ko-fi o Buy Me a Coffee, y cuál es la URL de la página?] No bloquea: la dirección es una constante que se fija al implementar.
- [NECESITA ACLARACIÓN: ¿"todas las pantallas" incluye crear jugador, temporada y decisiones? Hoy no tienen pie. La spec asume que no, por "nada que interrumpa el juego".]
- [NECESITA ACLARACIÓN: ¿README y `public/ads.txt` entran en el retiro de AdSense, o solo el código? La spec los incluye por la instrucción de eliminar AdSense por completo.]
- [NECESITA ACLARACIÓN: No se pudo revisar el panel de Vercel: el MCP respondió 403 y el CLI no está instalado. ¿Alguien confirma que no hay variables VITE_ADSENSE_* definidas? Si las hay, hay anuncios activos hoy y quitarlos cambia lo que ve el jugador.]
