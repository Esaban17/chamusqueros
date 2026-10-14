# Plan: Home como landing page

Stack: el del repo (TypeScript vanilla, Vite, CSS, strings HTML con `render()`). Sin dependencias nuevas. Todo en `src/main.ts` y `src/style.css`, donde ya viven `esc()`, `store()`, `futCard()` y `home()`; no se crea módulo nuevo.

## Cómo (por RF)
- **RF-01 / CA-1** `home()` reordena: marca, `h1` + frase, botón (`data-go="start"`) y fila "Tu récord"/"Ver ranking", y el sticker debajo de ellos a ~170 px de ancho (hoy 250 px; el avatar pasa de 234 a ~150). Así el botón queda alto sin depender del tamaño del avatar. La altura de hoy no está medida; se mide en T5 y, si no entra en 560 px, se reduce el `h1` (`clamp`) antes que quitar contenido.
- **RF-02** `<section>` con `h2` y `<ol class="steps">` de 3 elementos (texto fijo).
- **RF-03** `<section>` con 4 tarjetas `.feat`: (1) `COUNTRIES.length` países + 8 `<img>` de flagcdn con la clase de `flag()` (el código sale de `COUNTRIES[i].flag`, mismos `loading="lazy"`); (2) Selección con eliminatorias y Mundial; (3) palmarés: títulos y premios individuales (`AWARD_LABEL`); (4) carta de FC: `futCard()` con una fila de ejemplo constante (`RankRow` fija, rotulada "Ejemplo"), sin datos de usuario. Si `.fut` no se ve bien en 328 px, se escala por CSS; si no cabe, se cambia por una descripción (no se rediseña la carta).
- **RF-04 / D5** Sección de mejores carreras: lee `store<BestCareer[]>(BEST_KEY, [])`, `slice(0, 3)`, cada fila con `esc(name)`, `esc(verdict)`, `Number(score) || 0`. Vacío: párrafo con la regla del ranking. El acceso al ranking es un botón en esta sección (y el enlace "Ranking ›" de "Tu récord" arriba, como hoy). Los botones de acción llevan `data-go="start"` o `data-go="ranking"` y los handlers se atan con `querySelectorAll`, porque ahora hay más de un botón por acción (los ids únicos `start` y `ranking` se reemplazan por `data-go`).
- **RF-05** Segundo botón `data-go="start"` antes de `${footer()}`. `footer()` no cambia (D7).
- **RF-06 / A03** Ver Seguridad.
- **RF-07** `index.html`: `<title>`, `meta description`, `canonical`, `og:*`, `twitter:*` con URL absoluta fija `https://chamusqueros.vercel.app` (`%VITE_*%` deja el literal si falta la variable; se descarta). Copy propuesto: título "Chamusqueros: la carrera de tu futbolista en 2 minutos" (53); descripción "Creá tu futbolista, elegí tu país y viví su carrera con equipos reales de 27 países, hasta la Selección y el Mundial. Gratis y en 2 minutos." (139). `og:locale=es_LA`. El 27 es texto estático: se actualiza a mano si cambia la lista (riesgo anotado).
- **Imagen OG** `public/og.png` 1200x630, generada una sola vez fuera del repo: una página HTML temporal con el avatar (`avatarSVG`), la marca y la frase, capturada con el navegador de Playwright ya instalado en el entorno (no es dependencia del proyecto) y optimizada a <= 300 KB (paleta del juego, sin fotos). No se genera en el build.
- **RF-08** No se toca `createForm`, `rankingScreen` ni el flujo; `back` ya llama `home`.
- **RF-09 / D4** CSS en `style.css` con las variables existentes (claro/oscuro ya definidos); botones `.btn` ya miden >= 44 px; grid de `.feat` de 1 columna a <= 380 px. Se retira la llamada `adSlot('home')` de `home()` (el módulo `ads.ts` y el import en `render` lo retira la otra rama).

## Modelo de datos
Ninguno. Se lee `BEST_KEY` como hoy; sin esquema nuevo ni migración.

## Seguridad (OWASP Top 10)
- **A03**: todo dato de localStorage pasa por `esc()` o `Number()`; la carta de ejemplo es constante; sin API en el Home. Se prueba con CA-7.
- **A06/A08**: sin scripts ni dependencias; `og.png` es estático propio.
- A01, A02, A04, A07, A09, A10: no aplican.
- Hallazgos (CSP/headers ausentes, `privacidad.html` desactualizada, `VITE_SITE_URL`): en la spec, fuera de alcance.

## Cobertura
RF-01 a RF-09 cubiertos arriba; D1 a D7 reflejadas. Nada de diseño sin requisito: no hay rutas, ni estado nuevo, ni módulo nuevo.

## Pruebas y riesgos
- `npm run build`; en navegador a 360x640 (Playwright): medir borde inferior de `#start`, `scrollWidth`, conteo de secciones, flujos de CA-6, siembra para CA-7, tema oscuro.
- Riesgo: WhatsApp cachea la vista previa de un enlace ya compartido; tras desplegar, forzar con el depurador de enlaces de Facebook (no se puede probar localmente).
- Riesgo: conflicto de fusión con las ramas que tocan `footer()` y el import de `ads`; mitigado al no tocar `footer()`. Orden sugerido: donación y términos primero.
- Riesgo: `.fut` puede asumir un ancho de diálogo; se verifica en T3.
