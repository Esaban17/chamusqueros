# Plan: monetización (donación en lugar de anuncios)

Deriva de `spec.md`. Cada RF queda cubierto abajo.

## Arquitectura
Sin módulos, dependencias ni scripts nuevos. Se tocan `src/main.ts`, `src/style.css`, `.env.example` y `README.md`. Se borran `src/ui/ads.ts` y `public/ads.txt`. `privacidad.html` no se toca: lo cubre la feature de términos y condiciones.

## Cambios
- `src/main.ts`, donación: constante `DONATE_URL` (https, valor pendiente) junto a `SITE_URL`. Helper que devuelve el `<a>` con `target="_blank"` y `rel="noopener noreferrer"`, el texto "Invitame un café ☕" y un `<span class="sr">` con "(se abre en otra pestaña)". (RF-03, RF-09)
- `footer()`: agrega un `<p>` con el helper. Cubre Portada, Ranking, Debut y Final. (RF-01)
- `finish()`: `<section class="panel">` con "¿Te gustó?" y el helper con clase `btn secondary`, después de `#again` y antes de `${footer()}`. Fuera de `#rankBox` y `#toast`, que se reemplazan en runtime. (RF-02, RF-09)
- `src/main.ts`, AdSense: quitar el import de `adSlot, fillAds, initAds`; `fillAds(app)` dentro de `render()`; `initAds()` al final; y las cuatro llamadas `adSlot(...)`, en `home()`, `seasonSummary()`, `gameScreen()` y `finish()`. (RF-10, RF-11)
- `src/style.css`: quitar el bloque `/* Publicidad */` (`.ad`, `.ad-label`, `.ad-placeholder div`). Agregar `footer a { color: var(--ink); text-decoration: underline; display: inline-block; min-height: 24px; }`. (RF-07, RF-10)
- `src/ui/ads.ts` y `public/ads.txt`: borrar. (RF-10)
- `.env.example`: quitar las seis líneas `VITE_ADSENSE_*` con sus comentarios; conservar `VITE_SITE_URL`. (RF-10)
- `README.md`: quitar la fila de `src/ui/ads.ts` y la sección "Google AdSense". (RF-10)
- Sin cambios: `vite.config.ts` y `build:preview` (el modo `single` es del plugin de archivo único). `vite-env.d.ts` no existe en el repo.
- Vercel: borrar las variables `VITE_ADSENSE_*` del panel si existen. Acción manual, fuera del repo. (RF-12)

## Cobertura
- RF-04 y RF-05: por omisión. No se tocan `createForm` ni la lógica de `gameScreen` y `seasonSummary`, salvo quitar su `adSlot`; el enlace es nativo, sin listeners.
- RF-06: no se agrega ningún paquete ni script.
- RF-07: `--ink` da 15:1 en claro y 16:1 en oscuro; `.btn` mide unos 53 px de alto.
- RF-08: sin anchos fijos; `.panel` y `.btn` ya envuelven.

## Verificación
`npm run build`; grep de CA-11 sobre `src index.html`; revisión visual en `npm run dev` y `npm run build:preview` (CA-12); 360 y 1280 px para CA-9. Sin tests unitarios: no hay lógica que probar.

## Riesgos
- Si hay variables `VITE_ADSENSE_*` en Vercel, hoy hay anuncios y su retiro cambia lo que ve el jugador.
- Si la feature de términos y condiciones no entra junto o antes, la política seguirá mencionando AdSense.
- Cambiar el color del pie también cambia el enlace de privacidad (intencional).
- El emoji ☕ se ve distinto según el sistema.
