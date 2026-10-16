# Cabeceras de seguridad y medición de visitas

Une dos ítems de `specs/backlog.md`: `vercel-headers` (#5 del Bloque 2) y `medir-base` nivel B (#1 del Bloque 1). Van juntos porque la política de contenido (CSP) y la etiqueta del script de analítica se definen a la vez: la CSP debe permitir el script, y el script debe declararse en la CSP.

## Problema y valor
- **Cabeceras:** el proyecto no tiene `vercel.json`; el sitio no envía `X-Content-Type-Options`, `Referrer-Policy`, protección contra marcos ni `Permissions-Policy` ni CSP (hallazgo A05 de `specs/home-landing/spec.md`). No hay un XSS conocido (el código usa `textContent` y `esc`), así que es riesgo evitado, no un arreglo urgente. Lo que sí hay es el riesgo contrario: una CSP mal armada rompería Retos en línea en producción.
- **Medición:** hoy no se sabe cuántas visitas hay ni de dónde vienen (Web Analytics no está activo; informe de finanzas, línea base, punto 3). La ventana de Hobby es de 1 mes y no es retroactiva: cada semana sin script es línea base perdida.
- **Valor:** (a) endurecer sin cambiar el juego; (b) tener visitas y origen (WhatsApp) para decidir las features M con cifras en vez de supuestos.

## Decisiones
| # | Decisión | Fuente |
| --- | --- | --- |
| D1 | **El script de Vercel Web Analytics va, con su párrafo en `privacidad.html`.** Aprobado al aceptar todo el backlog; el usuario puede vetarlo. Si lo veta, se quitan la etiqueta, el archivo de inicio y el párrafo (bloque separable en `tasks.md`); las cabeceras siguen. | Usuario, 2026-10-15 (aceptó implementar todo el backlog); lectura del orquestador |
| D2 | **La CSP va como `Content-Security-Policy-Report-Only`; no hay CSP que bloquee en esta entrega.** Pasar a modo que bloquea es una feature posterior. | Decisión del PO |
| D3 | **Las otras cuatro cabeceras sí se aplican (bloquean).** Protección contra marcos con `X-Frame-Options: DENY` en vez de `frame-ancestors`: así no hace falta una CSP que bloquee, y funciona en todos los navegadores. | Decisión del PO ("frame-ancestors o X-Frame-Options") |
| D4 | **El script se sirve desde el propio dominio (`/_vercel/insights/script.js`), con etiqueta `<script>`, sin paquete npm.** | `vercel.com/docs/analytics/quickstart` (variante HTML), consulta del 2026-10-15 |
| D5 | **`beforeSend` existe en la variante de etiqueta `<script>`** y es el mecanismo para quitar `?sala=`. Evidencia: la documentación (`/docs/analytics/redacting-sensitive-data`, bloque HTML: `window.va('beforeSend', fn)`) y el propio `script.js` publicado (v0.1.3): al leer la cola `window.vaq` ejecuta `"beforeSend"===t?i=e` **antes** del primer pageview, y ese pageview manda `location.href` completo (con `?sala=`) en el campo `o` de `POST /_vercel/insights/view`. Sin `beforeSend`, el pase a la sala sí viajaría. | `curl https://vercel.com/_vercel/insights/script.js` y la documentación, 2026-10-15 |
| D6 | **Se descarta `history.replaceState` para esto.** `src/main.ts:873` limpia la URL al *salir* de la sala, no al leerla; moverlo al inicio cambiaría el comportamiento (recargar ya no reentraría a la sala) y toca la zona de `main.ts` que otras ramas editan en paralelo. `beforeSend` no toca `src/`. | `src/main.ts:869-876` |
| D7 | **La etiqueta de analítica va solo en `index.html`** (la app). Las tres páginas legales no se miden. | Supuesto S1 |
| D8 | **No se recolectan los reportes de la CSP** (sin `report-uri`/`report-to`): serían un endpoint nuevo y más invocaciones en Hobby. Los reportes viven en la consola del navegador y se revisan a mano. | Supuesto S2 |
| D9 | `blob:` **no** va en `img-src`: solo se usa como `href` de una descarga (`src/main.ts:860`), que es navegación y no carga de imagen. Si el modo de solo-reporte lo reporta, se agrega. La imagen de la tarjeta de 1080x1350 se muestra con `data:` (`src/main.ts:832`). | Lectura del código |

## Alcance
- `vercel.json` nuevo con las cabeceras de RF-01 y RF-02 para todas las rutas.
- Etiqueta de analítica en `index.html` y un archivo de inicio propio que registra `beforeSend`.
- Párrafo nuevo y fecha actualizada en `privacidad.html`.
- Un script de prueba (`scripts/headers.test.ts`, con `tsx`, como el resto de `scripts/`).

## Fuera de alcance
Pasar la CSP a modo que bloquea; endpoint o servicio que recoja reportes de la CSP; HSTS (Vercel ya lo gestiona en `*.vercel.app`); `@vercel/analytics` o Speed Insights; eventos personalizados (no existen en Hobby); medir las páginas legales; `contador-carreras` (`medir-base` nivel C); el paso del usuario de activar Web Analytics en el panel (ver "Pasos del usuario").

## Recursos externos que la app carga (de dónde sale la lista de la CSP)
Salen del código, no de suposiciones. Esta tabla es la única fuente de orígenes permitidos (RF-03).

| Tipo | Origen | Dónde se usa |
| --- | --- | --- |
| Hojas de estilo | `https://fonts.googleapis.com` | `index.html:26-29` (`<link rel="stylesheet">` de Barlow y Big Shoulders Display) |
| Tipografías | `https://fonts.gstatic.com` | los archivos de fuente que pide la hoja anterior; `index.html:25` |
| Imágenes | `https://flagcdn.com` | `src/main.ts:134`, `src/ui/card.ts:242`, `src/ui/flags.ts:27`, `src/retos/ui-dedonde-comun.ts:13`, `src/perfil/index.ts:24`, `src/retos/online/textos.ts:22` (patrón fijo en `src/ui/carta-svg.ts:191`) |
| Imágenes | `data:` | `src/ui/card.ts:47` (SVG de la carta convertido a imagen para el canvas de 1080x1350) y `src/main.ts:832` (`canvas.toDataURL` mostrado en `<img id="cardImg">`) |
| Imágenes | propio sitio (`escudos/`, `trofeos/`) | `src/main.ts:175,479`, `src/ui/card.ts:38` |
| Estilos en línea | atributos `style="..."` en plantillas HTML | `src/main.ts:137,174,221,637`, `src/ui/avatar-editor.ts:10`, `setAttribute('style', …)` en `src/retos/ui-dedonde-comun.ts:32`; bloque `<style>` en `privacidad.html:9`, `terminos.html:9`, `creditos.html:9`. Por eso `style-src` necesita `'unsafe-inline'`. Las asignaciones `el.style.width = …` (p. ej. `trivia.ts:121`) **no** lo requieren. |
| Conexiones | propio sitio (`/api/*`, `/_vercel/insights/view`) | `src/main.ts:83`, `src/ui/en-vivo.ts:62`, `src/retos/ui-pingpong.ts:172`, `src/retos/online/cliente.ts:93`, `src/perfil/cliente.ts:101`; analítica (nueva) |
| Conexiones | Ably, WebSocket y HTTPS: `main.realtime.ably.net` | `src/retos/online/transporte.ts:84-90` crea `BaseRealtime` sin `endpoint`/`environment`; el SDK `ably@2.29.0` usa `main.realtime.ably.net` por defecto (`node_modules/ably/src/common/lib/util/defaults.ts:149`). El servidor usa el mismo host (`api/_ably.ts:8`). |
| Conexiones | Ably, respaldo: `main.{a..e}.fallback.ably-realtime.com`, `internet-up.ably-realtime.com` (https), `ws-up.ably-realtime.com` (wss) | `defaults.ts:66-70` y `src/platform/web/lib/util/defaults.ts:5-6` del SDK. La documentación de Ably (consultada con Context7) cita `a..e.ably-realtime.com` para versiones anteriores; el comodín `*.ably-realtime.com` cubre ambas formas. |
| Scripts | propio sitio | `index.html:35` (módulo de entrada), trozos que baja `import()` (`src/main.ts:311,316`, `transporte.ts:84`); nuevos: `/_vercel/insights/script.js` y el archivo de inicio |

**No hay lista que permitir para:** `blob:` (D9), Wikidata y ESPN (los consulta el servidor, no el navegador: `privacidad.html`, `api/en-vivo.ts`), los enlaces a prensa en `src/engine/data/teams.ts:106-137` (comentarios), la página de donación (`DONATE_URL` es una navegación, no una carga; `src/main.ts:321`), las fuentes locales (no hay `@font-face` ni `url()` en `src/`).

## Requisitos funcionales
- **RF-01** Toda respuesta del sitio (la app, `privacidad.html`, `terminos.html`, `creditos.html` y `/api/*`) lleva cuatro cabeceras con estos valores exactos:
  `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `X-Frame-Options: DENY`; `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`.
  La `Permissions-Policy` no cierra `web-share` ni `clipboard-write`, que la app usa (`src/main.ts:843-850`, `src/retos/online/ui-sala.ts:421-434`).
- **RF-02** Las mismas respuestas llevan `Content-Security-Policy-Report-Only`. Ninguna lleva `Content-Security-Policy` (la que bloquea).
- **RF-03** La política de RF-02 permite, por directiva, exactamente los orígenes de la tabla anterior y ninguno más. No contiene `'unsafe-eval'`, ni comodín `*` solo, ni `'unsafe-inline'` en `script-src`. Incluye `object-src 'none'`, `base-uri 'self'` y `form-action 'self'`.
- **RF-04** El juego no cambia: Portada, crear jugador, carrera, final con tarjeta, ranking, Retos en el mismo celular, Retos en línea y las tres páginas legales funcionan igual con las cabeceras puestas. Una política en modo solo-reporte no bloquea nada.
- **RF-05** `index.html` carga el script de analítica con **una** etiqueta `<script defer src="/_vercel/insights/script.js">`, sin paquete npm y sin otro origen. Ninguna otra página del sitio la lleva.
- **RF-06** Al abrir `/?sala=XXXXXX`, el evento que se manda a la analítica **no contiene `sala`** en la URL. Se conservan los demás parámetros (por ejemplo `ref=reto`, que usará `compartir-retos`). Si quitar el parámetro falla, el evento se descarta (privacidad antes que conteo).
- **RF-07** `privacidad.html` explica la analítica: la sirve el propio dominio y la procesa Vercel; no usa cookies; identifica al visitante con un valor derivado de la petición que se descarta a las 24 horas; guarda datos agregados (página, de dónde viene, país, sistema, navegador y tipo de dispositivo); no se cruza con otros sitios; el código de una sala (`?sala=`) no se envía. La sección «Servicios externos y cookies» aclara que la analítica se carga desde el propio dominio, así que desde el navegador siguen siendo dos servicios externos (Google Fonts y flagcdn.com) más Ably en Retos en línea; y la fecha de «Última actualización» pasa a 15 de octubre de 2026. "El juego no crea cookies propias" sigue siendo cierto.
- **RF-08** Mientras Web Analytics no esté activado en el panel de Vercel, `/_vercel/insights/script.js` responde 404 y la app funciona igual: sin pantalla rota y sin errores de JavaScript propios (solo el error de red de ese archivo en la consola).
- **RF-09** Cero dependencias nuevas: `package.json` y `package-lock.json` no cambian; `npm run build` termina sin error; `src/` no se modifica.
- **RF-10** El reporte del implementador dice, para cada verificación de CA-1 a CA-8, si se hizo con cabeceras reales (`npx vercel dev` o `npx vercel curl` contra una vista previa) o no se pudo. `vite preview` no aplica `vercel.json` y no cuenta como verificación.

## Criterios de aceptación
- **CA-1** Dada una vista previa o `vercel dev`, cuando se piden `/`, `/privacidad.html` y `/api/en-vivo`, entonces las 3 respuestas llevan las 4 cabeceras de RF-01 con el valor exacto. (RF-01)
- **CA-2** Dadas las mismas 3 respuestas, entonces las 3 llevan `Content-Security-Policy-Report-Only` y 0 llevan `Content-Security-Policy`. (RF-02)
- **CA-3** Dado el valor de la CSP de solo-reporte, cuando se leen sus directivas, entonces cada origen de `script-src`, `style-src`, `font-src`, `img-src` y `connect-src` aparece en la tabla de recursos, y los 6 orígenes de la tabla que no son el propio sitio (`fonts.googleapis.com`, `fonts.gstatic.com`, `flagcdn.com`, `data:`, `main.realtime.ably.net`, `*.ably-realtime.com`) están presentes, además de `'unsafe-inline'` en `style-src`. `grep -c "unsafe-eval"` = 0 y `script-src` no contiene `unsafe-inline`. (RF-03)
- **CA-4** Dado el recorrido de 9 flujos (1 Portada, 2 crear jugador y una temporada, 3 final con tarjeta mostrada y descarga/compartir, 4 lectura del ranking (`GET /api/ranking`) y, solo si la vista previa no usa la base de producción, el envío de una carrera, 5 Retos en el mismo celular con banderas, 6 Retos en línea con una sala creada y conexión por Ably, 7 perfil, 8 las 3 páginas legales, 9 `/?sala=XXXXXX` abierto desde un enlace), cuando se corre en una vista previa con la consola abierta, entonces 9 de 9 flujos completan sin cambio de comportamiento y hay 0 violaciones de la CSP cuyo origen sea propio o esté en la tabla. Se descartan, por ser ajenas a la app, las de `vercel.live` (barra de Vercel en vistas previas) y las del WebSocket de recarga en caliente de Vite (`ws://localhost`) si se corre con `vercel dev`. (RF-03, RF-04)
- **CA-5** Dado `dist/index.html` tras `npm run build`, entonces contiene exactamente 1 etiqueta `/_vercel/insights/script.js`, y el archivo de inicio de `beforeSend` aparece **antes** que ella. Las otras 3 páginas HTML tienen 0 etiquetas de analítica. (RF-05)
- **CA-6** Dado el archivo de inicio ejecutado con un `window` simulado, cuando se invoca el `beforeSend` registrado con estas 4 URLs, entonces devuelve: `https://x.app/?sala=ABC234` → `https://x.app/`; `https://x.app/?sala=ABC234&ref=reto` → `https://x.app/?ref=reto`; `https://x.app/` → `https://x.app/` sin cambio; un valor que no es URL → `null` (evento descartado). Esta prueba corre sin red (`npx tsx scripts/headers.test.ts`). (RF-06)
- **CA-7** Dado Web Analytics ya activado y una vista previa o producción, cuando se abre `/?sala=ABC234` en un navegador normal (no automatizado: el script ignora `navigator.webdriver`), entonces el cuerpo de la petición `POST /_vercel/insights/view` tiene 0 apariciones de `sala` en el campo `o`. Verificación manual con las herramientas de red del navegador. (RF-06)
- **CA-8** Dado `privacidad.html`, entonces contiene el párrafo de RF-07 con las 6 afirmaciones (propio dominio y Vercel, sin cookies, valor descartado a 24 h, datos agregados, sin cruce entre sitios, `?sala=` no se envía) y "Última actualización: 15 de octubre de 2026". (RF-07)
- **CA-9** Dado Web Analytics sin activar, cuando se abre la app, entonces `GET /_vercel/insights/script.js` responde 404, la Portada se pinta y hay 0 excepciones de JavaScript no capturadas. (RF-08)
- **CA-10** Dado el cambio, entonces `git diff origin/main -- package.json package-lock.json src` está vacío y `npm run build` termina con código 0. (RF-09)
- **CA-11** Dado el reporte del implementador, entonces indica para CA-1 a CA-4 si se verificó con cabeceras reales o no se pudo, y por qué. (RF-10)

## Riesgos de romper producción y cómo los cubre el spec
| # | Riesgo | Efecto | Cobertura |
| --- | --- | --- | --- |
| R1 | `vercel.json` mal formado | El despliegue falla en la construcción; **producción sigue con el despliegue anterior** (no se reemplaza) | CA-1 en vista previa antes de fusionar; la prueba `scripts/headers.test.ts` parsea el JSON |
| R2 | Una cabecera que bloquea rompe una función (`X-Frame-Options`, `Permissions-Policy`, `nosniff`) | Pantalla o descarga rotas | La política de permisos no cierra `web-share` ni `clipboard-write`; nadie incrusta el sitio en un marco (S3); CA-4 recorre los 9 flujos |
| R3 | CSP mal armada rompe Retos en línea | Retos no conecta | No bloquea (D2); Ably entra en la lista con evidencia del SDK; el flujo 6 de CA-4 lo comprueba en vista previa |
| R4 | Etiqueta de analítica con 404 antes de activar | Error de red en la consola | RF-08, CA-9 |
| R5 | El `?sala=` llega a Vercel | Pase de sala (30 min de vida) visible en el panel | D5, RF-06, CA-6, CA-7 |
| R6 | Los reportes de la CSP nadie los ve | Falsa seguridad al pasar a bloquear | D8: sin colector; el paso a bloquear exige repetir CA-4 con la consola; queda como supuesto S2 |

Vuelta atrás: revertir el commit (o `vercel rollback` al despliegue anterior). Las cabeceras y la analítica son bloques separables.

## Pasos del usuario (fuera del código)
Al final, después de fusionar y desplegar: activar **Web Analytics** en el panel de Vercel (proyecto `chamusqueros`, pestaña Analytics, Enable). Hasta entonces el script responde 404 (RF-08). Después, abrir el sitio una vez en un navegador normal y confirmar que aparece la visita (CA-7). Hobby incluye 50.000 eventos al mes y 1 mes de historial; al pasarse, la recolección se pausa 7 días sin afectar al sitio (informe de finanzas, `medir-base` B).

## Seguridad (OWASP Top 10 2021)
- **A05 (central):** introduce las cabeceras que faltan. La CSP en modo solo-reporte no bloquea hoy; riesgo residual: `style-src 'unsafe-inline'` (necesario por RF-03 / tabla) y que sin colector (D8) los reportes solo se ven en la consola. `script-src 'self'` sin `unsafe-inline` es el valor de la política cuando pase a bloquear: contiene un XSS futuro.
- **A08 (central):** el script es de la plataforma y se sirve desde el propio dominio, sin paquete npm ni origen externo (RF-05, RF-09). No se puede fijar con integridad de subrecurso porque Vercel lo versiona; riesgo aceptado. La CSP lo permite solo por `'self'`.
- **A04 / A01 (diseño y control de acceso):** el pase a una sala viva es un secreto en la URL; RF-06 evita que salga hacia la analítica. Riesgo residual: la petición `POST /_vercel/insights/view` va al mismo dominio, así que el encabezado `Referer` de esa petición puede llevar la URL completa a la infraestructura de Vercel, que ya recibe esa URL al servir la página. No es una exposición nueva; el código vence a los 30 minutos.
- **A09:** sin colector de reportes (D8); se documenta como límite.
- **A06:** cero dependencias nuevas (RF-09).
- A02, A03, A07, A10: no aplican (sin cambios de datos, autenticación ni peticiones del servidor).

## Conflictos con otros specs
- `specs/boton-donacion/spec.md` RF-06 ("no se agregan scripts… de terceros") y `specs/home-landing/spec.md` (A06/A08, "cero scripts… nuevos"): ambos estaban acotados a su feature. Este script no es de un tercero distinto de la plataforma que ya aloja el sitio y se sirve del mismo dominio. No se editan esos specs. `informes/2026-10-15-finanzas-roi-backlog.md` ya lo marcó como conflicto "a decidir"; D1 lo decide.
- `privacidad.html` dice que el navegador se conecta a "dos servicios externos" (Google Fonts y flagcdn.com). Con la analítica servida desde el propio dominio esa cifra sigue siendo cierta (finanzas proponía pasar a tres; no hace falta). RF-07 solo toca lo que la analítica cambia.

## Supuestos (no bloqueantes)
- **S1** Solo se mide la app (`index.html`); las páginas legales no. Cambia si el PO quiere ver visitas a la política de privacidad.
- **S2** No hay colector de reportes de la CSP. Cambia si el PO quiere ver violaciones de usuarios reales antes de pasar a bloquear (costaría una función nueva y quedar bajo los topes de Hobby).
- **S3** Nadie incrusta el sitio en un `<iframe>` (ni Recurrente ni otra página). Cambia si el PO quiere incrustarlo: `X-Frame-Options: DENY` se cambia a `SAMEORIGIN` o se quita.
- **S4** Las visitas del equipo a vistas previas y a producción se cuentan; el panel de Vercel las separa por entorno (production / preview). En desarrollo local el script no existe, así que no cuentan.
- **S5** `Referrer-Policy: strict-origin-when-cross-origin` es el valor por defecto de los navegadores modernos; se fija para que los navegadores viejos no manden la URL completa (con `?sala=`) a Google Fonts o flagcdn.com.

## Ambigüedades
Ninguna bloqueante.
