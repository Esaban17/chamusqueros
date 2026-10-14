# Home como landing page

## Problema y valor
Casi todo el tráfico llega por un enlace compartido en WhatsApp, desde el celular. Quien llega nunca vio el juego: el Home actual es un sticker, "Convertite en leyenda" y un botón, sin explicar qué se hace, qué trae (27 países, Selección, carta, ranking) ni por qué vale dos minutos. Tampoco hay imagen al compartir el enlace.
Valor: que un visitante nuevo entienda el juego en 10 segundos y empiece una carrera, y que el enlace compartido se vea bien.

## Decisiones (ya tomadas)
- **D1** El Home actual se convierte en la landing; no es una página ni una ruta aparte.
- **D2** Jugadores que vuelven: "Empezar mi carrera" (lleva al formulario actual) se ve sin scroll a 360x640. Mejores carreras locales y acceso al ranking se conservan.
- **D3** Sin imágenes pesadas ni dependencias nuevas: se reusan avatar SVG, banderas y carta de FC. Única pieza nueva: una imagen estática para Open Graph.
- **D4** Sin publicidad: el usuario eliminará AdSense por completo (`src/ui/ads.ts` y `adSlot()`, en la feature de donación, otra rama). La landing no incluye `adSlot('home')` ni reserva espacio para anuncios. Si esta feature se implementa antes, solo se quita la llamada de `home()` y el módulo se deja para la otra rama.
- **D5** Teaser del ranking = las mejores carreras guardadas en el dispositivo (sin red). Para un visitante nuevo, un texto que explica el ranking y el acceso. El Home no llama a la API del ranking (evita carga en la base y datos ajenos en la portada).
- **D6** El texto describe solo lo que el juego tiene hoy: 27 países con equipos reales, Selección con eliminatorias mundialistas y Mundial, palmarés con títulos y premios individuales, carta de FC, ranking global. No promete fase final del Mundial (está en otra rama, aún sin integrar).
- **D7** Los enlaces nuevos del footer (donación, términos) son de otras features; esta no toca `footer()`. Como sus enlaces van apilados en párrafos, hay lugar para más.

## Alcance
Hero, "Cómo funciona", "Qué incluye", teaser de ranking/mejores carreras, cierre con segundo llamado y footer; etiquetas de título, descripción, Open Graph y Twitter; imagen OG.

## Fuera de alcance
Ruta o URL propia para la landing, navegación entre secciones, analítica, A/B, cambio del formulario o del juego, headers de seguridad (ver hallazgos), retirar AdSense (otra feature).

## Requisitos funcionales
- **RF-01** Hero: nombre, frase de valor, el avatar/sticker existente (más pequeño que hoy) y el botón "Empezar mi carrera".
- **RF-02** "Cómo funciona": 3 pasos numerados (crear jugador, decidir en cada etapa de la carrera, ver su carta y compararla en el ranking).
- **RF-03** "Qué incluye": 4 bloques: países con equipos reales (el número sale de la lista de países y se muestran 8 banderas), Selección con eliminatorias y Mundial, palmarés con títulos y premios individuales, carta de FC con ejemplo.
- **RF-04** Mejores carreras: con carreras guardadas, muestra hasta 3 (nombre, veredicto, puntos) y el acceso "Ver ranking"; sin ellas, un texto del ranking global (una carrera por jugador, gana quien tenga más puntos) y el mismo acceso.
- **RF-05** Cierre: segundo botón "Empezar mi carrera" tras las secciones, luego el footer sin cambios.
- **RF-06** Todo texto de localStorage o de red se muestra escapado (nunca como HTML).
- **RF-07** `index.html` trae `<title>` (<= 60 caracteres), `meta description` (<= 160), `canonical`, `og:title/description/type/url/site_name/locale/image` (+ ancho, alto y alt) y `twitter:card=summary_large_image` con título, descripción e imagen. La imagen es absoluta, 1200x630, <= 300 KB.
- **RF-08** Empezar carrera y ranking funcionan como hoy; se conserva "Tu récord" para quien ya jugó.
- **RF-09** Se ve bien en claro y oscuro, con texto >= 16 px en cuerpo y botones >= 44 px de alto.

## Criterios de aceptación
- **CA-1** A 360x640, con y sin carreras guardadas, el borde inferior de "Empezar mi carrera" queda a <= 560 px del tope (deja margen para la barra del navegador de WhatsApp). (RF-01, D2)
- **CA-2** A 360 px de ancho, `scrollWidth` del documento <= 360 en la landing completa. (RF-09)
- **CA-3** La landing tiene 1 `h1` y 3 `h2` ("Cómo funciona", "Qué incluye", mejores carreras/ranking), 3 pasos, 4 bloques de inclusión y 2 botones "Empezar mi carrera". (RF-01 a RF-05)
- **CA-4** `dist/index.html` tras `npm run build` contiene `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card` y `<link rel="canonical">`; `dist/og.png` existe, mide 1200x630 y pesa <= 300 KB. (RF-07)
- **CA-5** `npm run build` termina con código 0 y `package.json` no cambia sus dependencias. (D3)
- **CA-6** Clic en "Empezar mi carrera" (cualquiera de los 2) abre el formulario; "Ver ranking" abre el ranking y "Volver" regresa a la landing. (RF-08)
- **CA-7** Con `localStorage` sembrado con un nombre `"><img src=x onerror=window.__x=1>`, tras abrir el Home `window.__x` es `undefined` y el nombre aparece como texto. (RF-06)
- **CA-8** El Home no contiene ningún elemento `.ad` ni la cadena "Publicidad", en producción y en desarrollo. (D4)
- **CA-9** Sin carreras guardadas el Home no muestra "Tu récord" ni errores en consola; con carreras muestra "Tu récord" y hasta 3 filas. (RF-04, RF-08)

## Seguridad (OWASP Top 10)
- **A03 XSS**: nombres, veredictos y posiciones de las mejores carreras vienen de localStorage (no confiable, editable por el usuario): `esc()` o `textContent`; números con `Number()`. Nada de ranking remoto en el Home (D5). Los textos fijos no llevan datos.
- **A06/A08**: cero scripts o dependencias nuevas; la imagen OG es un archivo estático propio. Se siguen usando Google Fonts y flagcdn.com (ya existentes).
- A01, A02, A04, A07, A09, A10: no aplican (sin acceso, autenticación, backend ni peticiones nuevas).
- **Hallazgos fuera de alcance**
  - No existe `vercel.json`: la app no envía CSP, `X-Content-Type-Options`, `Referrer-Policy` ni `frame-ancestors` (A05). Una CSP debería permitir `fonts.googleapis.com`, `fonts.gstatic.com`, imágenes de `flagcdn.com`, `data:`/`blob:` y estilos en línea.
  - `privacidad.html` dice que los datos "no se envían a nuestros servidores", pero el ranking guarda nombre, avatar, carta y un id anónimo; además habla de AdSense (que se elimina) y conserva `CORREO_DE_CONTACTO` sin llenar.
  - `.env.example` trae `VITE_SITE_URL=https://chamusqueros.com`; si Vercel la define con ese valor, "Compartir" apunta a un dominio distinto de chamusqueros.vercel.app.

## Aclaraciones abiertas (no bloquean)
- [NECESITA ACLARACIÓN: "el ranking global y sus premios": hoy no hay premios por posición en el ranking; solo hay premios individuales en el palmarés (Mejor jugador, Goleador...). Esta spec habla solo de esos. ¿Existen premios del ranking que deban anunciarse? Si sí, hay que definirlos antes de publicarlos.]
- [NECESITA ACLARACIÓN: dominio para las etiquetas OG. Se usa https://chamusqueros.vercel.app (fijo en `index.html`). ¿Se migrará a chamusqueros.com pronto? Si sí, usar ese.]
- [NECESITA ACLARACIÓN: cuando se integre la fase final del Mundial (rama `eliminatorias-selecciones`), ¿se actualiza el bloque "Selección" para mencionarla? Hoy no se menciona (D6).]
