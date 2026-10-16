# Plan: cabeceras de seguridad y medición de visitas

Deriva de `specs/headers-analitica/spec.md` (D1-D9, RF-01 a RF-10). Arquitectura mínima: **un archivo de configuración, un archivo estático, dos HTML tocados y una prueba**. Cero cambios en `src/` (RF-09), así que no choca con las ramas que editan `src/main.ts`.

## Archivos
| Archivo | Cambio | RF |
| --- | --- | --- |
| `vercel.json` | **Nuevo.** Una regla de cabeceras para `/(.*)`. | RF-01, RF-02, RF-03 |
| `public/analitica-init.js` | **Nuevo.** Registra `beforeSend` en la cola de la analítica. | RF-06 |
| `index.html` | Dos etiquetas `<script>` en `<head>`, después del `<link>` de Google Fonts. | RF-05 |
| `privacidad.html` | Un párrafo en "Servicios externos y cookies" (o sección propia) y la fecha. | RF-07 |
| `scripts/headers.test.ts` | **Nuevo.** Prueba sin red, con `tsx`, como el resto de `scripts/`. | RF-01, 02, 03, 05, 06, 07 |

No se tocan: `src/**`, `package.json`, `package-lock.json`, `specs/backlog.md`, `.gitignore` (`.vercel` ya está ignorado).

## 1. `vercel.json`
Sin `$schema` ni otras claves: el archivo no cambia el build ni el enrutado (`framework`, `rewrites`, `cleanUrls` quedan como están).

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        { "key": "Content-Security-Policy-Report-Only", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://flagcdn.com; connect-src 'self' https://main.realtime.ably.net wss://main.realtime.ably.net https://*.ably-realtime.com wss://*.ably-realtime.com; object-src 'none'; base-uri 'self'; form-action 'self'" }
      ]
    }
  ]
}
```

Decisiones de redacción, cada una con su razón:
- **Esquema explícito para Ably (`https://` y `wss://`).** No se depende de cómo cada navegador empareja `https:` con `wss:`; en solo-reporte eso daría reportes falsos.
- **`*.ably-realtime.com`** cubre `main.{a..e}.fallback.ably-realtime.com`, `internet-up.` y `ws-up.` del SDK 2.29.0 y las formas `a..e.ably-realtime.com` de la documentación anterior. El host principal va exacto (`main.realtime.ably.net`). No se listan `*.ably.io` (hosts históricos, sin evidencia en el código); si el reporte los muestra, se agregan.
- **`font-src` sin `'self'`:** no hay `@font-face` ni `url()` en `src/` (verificado); solo Google Fonts. **`img-src` con `'self'`:** escudos y trofeos locales.
- **`script-src 'self'`:** el módulo de entrada, los trozos de `import()`, `/analitica-init.js` y `/_vercel/insights/script.js` son del propio origen. No hay scripts en línea en `index.html`.
- **Sin `frame-ancestors`:** el protector contra marcos es `X-Frame-Options: DENY` (D3). No se afirma nada sobre cómo trata el navegador `frame-ancestors` dentro de una política de solo-reporte; se añade cuando la CSP pase a bloquear.
- **Sin `blob:`** (D9) y sin `report-uri`/`report-to` (D8).
- **Headers de funciones:** `api/_http.ts:22`, `api/futbolista.ts:20` y `api/en-vivo.ts:109` ya envían `x-content-type-options: nosniff`. Si Vercel devuelve el valor duplicado, `nosniff, nosniff` sigue cumpliendo (el navegador usa el primer valor de la lista); CA-1 comprueba que *contiene* `nosniff`, no que aparezca una vez.

## 2. `public/analitica-init.js`
Archivo clásico, no módulo, **bloqueante** y propio, para no necesitar `'unsafe-inline'` en `script-src` ni un hash que haya que recalcular. Va antes de la etiqueta de Vercel, que lee `window.vaq` al arrancar y ejecuta `beforeSend` antes del primer pageview (evidencia en D5).

```js
// Analítica de Vercel: debe correr ANTES de /_vercel/insights/script.js (lee window.vaq al iniciar).
window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
// El parámetro ?sala= es el pase a una sala viva: no debe llegar a la analítica. Si falla, se descarta el evento.
window.va('beforeSend', function (e) {
  try {
    var u = new URL(e.url);
    u.searchParams.delete('sala');
    return Object.assign({}, e, { url: u.toString() });
  } catch (_) { return null; }
});
```

Por qué `beforeSend` y no `history.replaceState` (D6): `main.ts:873` solo limpia al salir; cambiarlo toca `main.ts` y altera la recarga. Por qué no un `<script>` en línea: obligaría a `'unsafe-inline'` o a un hash en la CSP (A05).

## 3. `index.html`
Dentro de `<head>`, después del `<link rel="stylesheet">` de fuentes y antes de `</head>`, en este orden:

```html
<script src="/analitica-init.js"></script>
<script defer src="/_vercel/insights/script.js"></script>
```

- Solo `index.html` (S1). El orden importa (CA-5): el archivo de inicio es bloqueante y corre en el análisis del documento; el de Vercel es `defer`.
- Vite deja intactas las rutas absolutas que apuntan a `public/`. `/_vercel/insights/script.js` no existe en el repo (lo sirve la plataforma): Vite puede avisar en el build que una etiqueta sin `type="module"` no se empaqueta. Es un aviso, no un error, y se deja pasar. Si el build falla o mueve las etiquetas, **alternativa documentada** (no la primera opción): mover el registro de `beforeSend` a un módulo `src/analitica.ts` importado en la primera línea de `src/main.ts` y poner la etiqueta de Vercel `defer` *después* del `<script type="module">` en el cuerpo. Eso toca `main.ts` (1 línea) y obligaría a revisar CA-5 con el orden real de `dist/index.html`.
- `vite dev` y `vite preview` no sirven `/_vercel/insights/script.js`: responde 404 (igual que en producción antes de activar Web Analytics, RF-08). La consola muestra el error de red; el juego no se ve afectado.

## 4. `privacidad.html`
- En `<h2>Servicios externos y cookies</h2>`, agregar un párrafo (voseo, como el resto de la página) con las 6 afirmaciones de CA-8. Texto propuesto:

  > Para saber cuántas personas visitan el sitio y de dónde llegan, usamos Vercel Web Analytics. El script se carga desde nuestro propio dominio y lo procesa Vercel, que ya aloja el sitio. No usa cookies: te distingue con un valor derivado de la petición que se descarta a las 24 horas. Guarda datos agregados: la página, de dónde llegaste, el país, el sistema, el navegador y el tipo de dispositivo. No se cruza con otros sitios. El código de una sala de Retos en línea (el parámetro «sala» del enlace) no se envía a la analítica.

- Cambiar "Última actualización: 14 de octubre de 2026." por "15 de octubre de 2026.".
- La frase "dos servicios externos" **no cambia** (la analítica es del propio dominio). "El juego no crea cookies propias" sigue siendo cierto: no se llama a `enableCookie`.

## 5. `scripts/headers.test.ts`
Una sola prueba, `npx tsx scripts/headers.test.ts`, sin red, con `node:assert/strict` y `node:vm` (patrón de `scripts/*.test.ts`):
1. **`vercel.json`:** `JSON.parse`; hay una regla con `source: "/(.*)"`; los 4 valores de RF-01 exactos; existe `Content-Security-Policy-Report-Only` y **no** `Content-Security-Policy` (RF-02).
2. **CSP:** se separa en directivas; `script-src` es exactamente `'self'`; `style-src` contiene `'unsafe-inline'`, `https://fonts.googleapis.com`; `font-src`, `img-src`, `connect-src` contienen los orígenes de la tabla; no aparece `unsafe-eval` ni un `*` suelto; hay `object-src 'none'` (RF-03).
3. **`index.html`:** una sola vez `/_vercel/insights/script.js`; `/analitica-init.js` aparece antes; `terminos.html`, `privacidad.html` y `creditos.html` no contienen `_vercel/insights` (RF-05).
4. **`public/analitica-init.js`** en `vm.runInNewContext` con `window` simulado: `window.vaq[0][0] === 'beforeSend'`; las 4 URLs de CA-6 (RF-06).
5. **`privacidad.html`** contiene "Web Analytics", "24 horas" y "15 de octubre de 2026" (RF-07).

No se agrega script a `package.json` (los demás tests tampoco lo tienen).

## 6. Estrategia de verificación (la que importa: cabeceras reales)
`vite preview` **no** aplica `vercel.json`; no cuenta (RF-10). Orden de preferencia:
1. **`npx vercel dev`** en el worktree, tras copiar `/Users/esaban/Desktop/Proyectos Personales/PROJECTS/LigaGT/chamusqueros/.vercel/project.json` a `<worktree>/.vercel/project.json` (el directorio está en `.gitignore`; no se versiona). Con él se verifican CA-1 y CA-2 con `curl -sI`. Limitación: `vercel dev` corre `vite` debajo, así que el WebSocket de recarga en caliente (`ws://localhost`) genera reportes que se descartan; y Retos en línea cae al sondeo porque `ABLY_API_KEY` no está en el entorno de desarrollo (informe de finanzas, tabla de servicios): el flujo 6 de CA-4 **no se puede verificar aquí**.
   - **Hallazgos al implementar (2026-10-15):** (a) bajo `vercel dev`, Retos **no carga**: `src/retos/*` importa `api/_retos.ts` y `vercel dev` enruta `/api/*` a funciones (404 del módulo); es una limitación de desarrollo previa, no de esta feature, y no ocurre en el build. Los flujos de Retos (5, 7 y las pantallas de Retos) se recorrieron con el build de `dist/` servido por un servidor temporal que aplica las cabeceras de `vercel.json` y reenvía solo GET de `/api/*` a `vercel dev` (cualquier otro método se bloquea); las cabeceras reales (CA-1, CA-2) sí se vieron bajo `vercel dev`. (b) Bajo `vercel dev`, `/_vercel/insights/script.js` responde 200 con el HTML de Vite (no 404): el navegador lo rechaza por `nosniff` ("MIME type not executable") sin excepción de JavaScript; el 404 de RF-08 (`text/plain`) se confirmó en producción actual con `curl`. (c) `GET /api/sala` responde `enLinea: false` sin `ABLY_API_KEY`, así que Retos en línea y `/?sala=` solo llegan a "En línea no disponible"; los orígenes de Ably se comprobaron con una sonda del navegador (fetch y WebSocket a cada host, con testigos negativos) contra la CSP real.
2. **Vista previa de Vercel:** `npx vercel deploy` (sin `--prod`), `npx vercel curl /<ruta> --deployment <url>` para las cabeceras, y un navegador con la consola abierta para CA-4 (en consola, Chrome marca los reportes con "[Report Only]"). La vista previa sí tiene `ABLY_API_KEY`, así que ahí se prueba el flujo 6 (con **una** persona que cree una sala basta: ya abre el WebSocket). La protección de despliegues puede exigir inicio de sesión; si no se logra abrir en un navegador, el reporte dice que CA-4 quedó sin verificar y por qué.
3. **Ruido esperado que no cuenta como fallo:** reportes de `vercel.live` (barra de Vercel en vistas previas) y el WebSocket de Vite. Todo lo demás (origen propio o de la tabla) cuenta y bloquea el visto bueno.
4. **Datos:** en el flujo 4 no se hace el POST de una carrera si la vista previa comparte la base de producción (el ranking real se ensucia con pruebas); el GET cubre la misma directiva `connect-src 'self'`.
5. **Analítica:** el script ignora navegadores automatizados (`navigator.webdriver`), así que **Playwright no sirve** para CA-7; se verifica a mano, ya activada la analítica (paso del usuario).

## 7. Orden de despliegue (producción)
1. Fusionar a `main` → Vercel despliega producción. Antes: vista previa con CA-1 a CA-4 verificados.
2. El script responde 404 hasta el paso 3 (RF-08); no pasa nada.
3. **El usuario activa Web Analytics** en el panel. Luego abre el sitio y `/?sala=ABC234` en un navegador normal y comprueba CA-7.
4. Si algo falla en producción: `vercel rollback` al despliegue anterior, o revertir el commit.

## 8. Cobertura RF → plan
| RF | Dónde |
| --- | --- |
| RF-01 | §1 (`vercel.json`), §5.1 |
| RF-02 | §1, §5.1 |
| RF-03 | §1, §5.2 |
| RF-04 | §6 (recorrido de 9 flujos en vista previa) |
| RF-05 | §3, §5.3 |
| RF-06 | §2, §5.4 |
| RF-07 | §4, §5.5 |
| RF-08 | §3 (404 esperado), §6 |
| RF-09 | Sin cambios en `src/` ni dependencias (tabla de archivos); `npm run build` |
| RF-10 | §6 |

## 9. Riesgos del plan
- **Vite reescribe o avisa por las etiquetas:** cubierto en §3, con alternativa.
- **`vercel dev` pide vincular o iniciar sesión:** el reporte lo dice; se pasa a la vista previa.
- **Una directiva olvidada que no aparece en ninguno de los 9 flujos:** es el límite de un solo-reporte sin colector (S2). Por eso el paso a bloquear es otra feature y repite CA-4.
