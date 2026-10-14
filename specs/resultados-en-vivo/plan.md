# Plan: Resultados de fútbol en vivo en el navbar

Stack: el del repo (TypeScript vanilla, Vite, CSS, Vercel Function + Neon, patrón de `api/ranking.ts`). **Sin dependencias nuevas.** Archivos nuevos: `api/en-vivo.ts`, `db/en-vivo.sql`, `db/en-vivo.test.sql`, `src/ui/en-vivo.ts`, `src/ui/en-vivo.css`, `scripts/en-vivo.test.ts` y fixtures en `scripts/fixtures/`. Archivos existentes que se tocan: `src/main.ts` (una línea), `privacidad.html`, `terminos.html`, `.env.example`.

## Lo que se leyó del repo (y lo que implica)
- **No hay navbar ni header común.** Cada pantalla arma su HTML y lo pasa a `render()`, que hace `app.innerHTML = '<div class="flag"></div>' + html` (franja de 8 px de la bandera) en `src/main.ts:182`. Hay 6 pantallas: `home()`, `createForm()`, `debut()`, `gameScreen()`, `finish()`, `rankingScreen()`.
- **Consecuencia:** una barra dentro de `#app` se destruye y recrea en cada `render()` y su temporizador con ella. La barra va **fuera de `#app`**, como hermano anterior (`app.before(barra)`), montada una sola vez.
- **Posición:** `position: sticky; top: 0` (no `fixed`): ocupa su altura en el flujo y empuja el contenido, así que nunca tapa el CTA ni la franja de la bandera. No hay otro elemento `sticky` en `style.css`; el único `fixed` es `.party` (`z-index: 100`, celebraciones), por encima de la barra (`z-index: 50`); los `<dialog>` usan la capa superior y también quedan por encima.
- **Integración:** una línea en `src/main.ts`, justo después de `import './style.css';`: `import './ui/en-vivo';`. El módulo se monta solo al cargarse (el script es de tipo módulo, así que `#app` ya existe). Los estilos van en `src/ui/en-vivo.css`, importado desde el propio módulo: así no se toca `style.css`, donde otras ramas agregan reglas. Usa las variables de color existentes (`--ink`, `--bg`, `--surface`, `--line`, `--muted`, `--celeste`) y la clase `.sr`; el modo oscuro sale gratis.
- **`esc()` no se exporta** de `main.ts`; el módulo nuevo no lo necesita: arma el DOM con `createElement` y `textContent`.
- **Minijuegos:** `gameScreen()` monta `<div class="mg" id="mg">` solo cuando hay minijuego. La barra se oculta con una regla CSS en `en-vivo.css`: `body:has(#mg) #en-vivo { display: none }`. Sin JS ni acoplamiento con `main.ts`. En navegadores sin `:has()` (anteriores a Safari 15.4 y Chrome 105) la barra simplemente sigue visible durante el minijuego; se acepta.
- **`api/ranking.ts` (patrón a copiar):** `neon(process.env.DATABASE_URL!)` al inicio, `export async function GET(req: Request)` con `Response.json`, validación manual con `isInt` y listas permitidas, `cache-control: no-store`, tablas con tabs y MAYÚSCULAS en `db/ranking.sql` (se aplica con `psql "$DATABASE_URL_UNPOOLED" -f …`). `scripts/ranking.test.ts` corre el handler real con un `fetch` falso en lugar de Neon (el driver serverless habla HTTP) y se ejecuta con `npx tsx`.
- **No hay `vercel.json`:** los `Cache-Control` van en la respuesta del handler, como hace `ranking.ts`. Cada archivo de `api/` es una función: la lógica va en un solo archivo (`api/en-vivo.ts`), sin módulos auxiliares dentro de `api/`.
- **`.gitignore`** ya excluye `.env`, `.env*.local` y `.vercel`. `.env.example` hoy solo trae `VITE_SITE_URL` (no trae `DATABASE_URL`; hallazgo menor, fuera de alcance).
- **Legal:** `privacidad.html` dice que Vercel y Neon procesan los datos y no menciona proveedores de datos; `terminos.html` ya tiene "Sin afiliación" y "Servicio tal cual". Ambas tienen "Última actualización: 14 de octubre de 2026".
- **home-landing CA-1** (CTA a <= 560 px a 360x640) es un criterio ya cumplido; la barra le suma <= 44 px y se vuelve a medir (T8).

## Lo que se confirmó de cada fuente
**Aviso de método.** La red de la máquina de trabajo bloquea la categoría "Deportes" (Zscaler) y la documentación de API-Football estaba tras Cloudflare; no se intentó saltar ningún filtro. No se pudo llamar a ninguna de las dos fuentes. Todo lo de abajo viene de páginas públicas leídas con WebFetch, de la documentación espejada en Context7 y de repositorios públicos de terceros (fuente **secundaria**, citada como tal). Nada de esto sustituye la verificación real de T11.

### Fuente A: football-data.org v4
| Dato | Estado | Fuente |
| --- | --- | --- |
| Plan gratis: 12 competencias, 10 consultas/min, marcadores y calendarios "delayed" (sin cifra) | Confirmado | https://www.football-data.org/pricing |
| Las 12: Champions League, Primeira Liga, Premier League, Eredivisie, Bundesliga, Ligue 1, Serie A, LaLiga, Championship, Série A (Brasil), Mundial, Eurocopa ("gratis para siempre") | Confirmado (nombres; la página no da códigos) | https://www.football-data.org/coverage |
| Límite: sin registrar, 100/24 h y solo recursos de áreas y competencias; registrado gratis 10/min; 429 al excederlo | Confirmado | https://docs.football-data.org/general/v4/policies.html y `errors.html` |
| Header de autenticación `X-Auth-Token` | Confirmado (ejemplos `curl` de la documentación) | https://docs.football-data.org/general/v4/competition.html |
| Encabezados de respuesta `X-RequestsAvailable` y `X-RequestCounter-Reset` | Confirmado | https://docs.football-data.org/general/v4/lookup_tables.html |
| Estados: `SCHEDULED`, `TIMED`, `IN_PLAY`, `PAUSED`, `FINISHED`; el seudo-estado `LIVE` sirve como filtro y equivale a `IN_PLAY` + `PAUSED` | Confirmado | https://docs.football-data.org/general/v4/match.html |
| Filtro `status` en listados de partidos; respuesta con `filters`, `resultSet` y `matches[]` | Confirmado | https://docs.football-data.org/general/v4/resources.html |
| `competition` con `code` (`PL`, `PD`, `SA`, `BL1`, `DED`, `CL` aparecen en ejemplos de la documentación) | Confirmado para esos 6 | https://docs.football-data.org/general/v4/competition.html |
| `homeTeam` y `awayTeam` con `name` y `shortName` | Confirmado | `match.html` |
| El `GET https://api.football-data.org/v4/matches?status=LIVE` como llamada única para todas las competencias suscritas | **Por verificar** (el filtro y `LIVE` están documentados; la ruta `/v4/matches` sin competencia no apareció literal) | — |
| Códigos `FL1`, `WC`, `EC`, `BSA` | **Por verificar** (recuerdo del redactor) | — |
| Forma del marcador: la documentación muestra **tres**: `score.fullTime.home/away` (lo que se espera en v4), `score.fullTime.homeTeam/awayTeam` (`overtime.html`, forma vieja) y `homeTeam.score.fulltime` (ejemplo de `match.html`) | **Contradictorio en la documentación** → el adaptador acepta la primera y la segunda, y cualquier otra se trata como marcador desconocido ("–") | https://docs.football-data.org/general/v4/overtime.html |
| Campo `minute` (ejemplo `"90+5"`) | Aparece en un ejemplo; **no se sabe si el plan gratis lo trae** → opcional | `match.html` |
| Términos de uso y atribución | **No leídos** | — |

### Fuente B: ESPN (no oficial, sin llave)
Todo es fuente secundaria: no existe documentación oficial, solo repositorios que consumen estos endpoints.
| Dato | Estado | Fuente |
| --- | --- | --- |
| Patrón `https://site.api.espn.com/apis/site/v2/sports/soccer/{liga}/scoreboard` | Confirmado por uso en muchos repositorios | https://github.com/ralvarezdev/go-espn (docs/espn-api-testing-reference.md), https://github.com/geeksilva97/bethoven (docs/espn-api.md) |
| `status.type.state` = `pre` / `in` / `post`; minuto en `status.displayClock`; `status.period` | Confirmado por uso | https://github.com/nilsbacklund/wc2026-tracker (`espn.py`), https://github.com/okekedev/soccer-globe (`web/src/lib/espn.ts`) |
| `competitions[0].competitors[]` con `homeAway` (`home`/`away`) y `score` (texto) | Confirmado por uso | https://github.com/ralvarezdev/go-espn, https://github.com/geeksilva97/bethoven |
| `status.type.name` con valores `STATUS_*` (la fase fina) | Confirmado el patrón; los valores concretos (`STATUS_HALFTIME`, `STATUS_FIRST_HALF`…) son **recuerdo del redactor** | https://github.com/giodamelio/trmnl-backend (`apis/espn/NOTES.md`) |
| El scoreboard sin parámetro `dates` devuelve la jornada "actual o siguiente"; no se puede elegir el conjunto de ligas con el endpoint genérico | Confirmado por uso | https://github.com/CaptainSpof/dafos (`scoreboard.nix`) |
| Existe un caso de 403 de Akamai contra `site.api.espn.com` (otro endpoint, otra red) | Riesgo observado | https://github.com/sergeykuznetsov1995/data-platform-football (`tests/fixtures/espn/probes/README.md`) |
| Términos de ESPN sobre uso de su contenido | No leídos; el usuario **aceptó el riesgo** (D2) | — |

### Alternativa descartada
API-Football (api-sports.io): sin plan gratuito según el usuario. Lo que se alcanzó a confirmar de su documentación (endpoint `fixtures?live=all`, header `x-apisports-key`) no se usa.

## Cómo se verifica (este entorno no puede llamar a los proveedores)
1. **Fixtures.** Dos fixtures de ejemplo con la forma documentada (arriba) alimentan las pruebas y el desarrollo: `scripts/fixtures/football-data-live.json`, `scripts/fixtures/espn-scoreboard-live.json` y `scripts/fixtures/espn-scoreboard-empty.json`, más variantes rotas dentro de la prueba. Son escritos a mano con solo los campos que consume el adaptador; **no son capturas reales** y el archivo lo dice en un campo `_nota`.
2. **Vista previa de Vercel.** La verificación real se hace con una vista previa desplegada (la función corre fuera de la red corporativa): `npx vercel curl /api/en-vivo --deployment <url-de-la-vista-previa>`. Un día de partidos, la respuesta debe traer partidos de ambas fuentes. Los fallos por liga de ESPN se ven en los registros de ejecución de Vercel (el handler escribe una línea `en-vivo: espn <slug> <estado>` por cada liga que no responde bien).
3. **Códigos de ESPN no confirmados** (tabla de abajo) quedan como candidatos. Se confirman en la vista previa, o abriendo `https://site.api.espn.com/apis/site/v2/sports/soccer/<slug>/scoreboard` en el navegador de un celular con datos móviles (red no corporativa): si responde JSON con `events` (aunque sea vacío) existe; si da 404, se quita de la lista. Tras confirmar, se guarda esa respuesta real como fixture y se vuelve a correr la prueba.

## Modelo común y tablas de ligas
Modelo saneado que producen los dos adaptadores y que se guarda y se sirve:
`{ fuente: 'fd' | 'espn', liga: string, local: string, visita: string, gl: number | null, gv: number | null, estado: 'jugando' | 'descanso' | 'penales', minuto: number | null }`.
El campo `pais` del modelo propuesto por el orquestador se omite: nada lo usa (la etiqueta y el orden salen de la tabla de ligas). `liga` es **siempre la etiqueta propia de la tabla**, nunca el nombre que manda el proveedor (más corto, en español y no confiable).

Tabla `LIGAS` en `api/en-vivo.ts` (`orden` único; define el orden de la barra). "Estado" dice qué tan firme está el código.
| Orden | Etiqueta | Fuente | Código | Estado |
| --- | --- | --- | --- | --- |
| 1 | Liga Nacional GT | espn | `gua.1` | Candidato fuerte (varios repos públicos; uno con respuestas de 2026) |
| 2 | Costa Rica | espn | `crc.1` | Por verificar (sin fuente) |
| 3 | Honduras | espn | `hon.1` | Candidato fuerte |
| 4 | El Salvador | espn | `slv.1` | Candidato (lista de candidatos de un repo) |
| 5 | Panamá | espn | `pan.1` | Candidato (lista de candidatos de un repo) |
| 6 | Concacaf Champions Cup | espn | `concacaf.champions` | Candidato fuerte (varios repos) |
| 7 | Liga MX | espn | `mex.1` | Candidato fuerte |
| 8 | MLS | espn | `usa.1` | Candidato fuerte |
| 9 | Champions League | fd | `CL` | Código confirmado en la documentación |
| 10 | Premier League | fd | `PL` | Confirmado |
| 11 | LaLiga | fd | `PD` | Confirmado |
| 12 | Serie A | fd | `SA` | Confirmado |
| 13 | Bundesliga | fd | `BL1` | Confirmado |
| 14 | Ligue 1 | fd | `FL1` | Por verificar (recuerdo) |
| 15 | Mundial | fd | `WC` | Por verificar (recuerdo) |
| 16 | Eurocopa | fd | `EC` | Por verificar (recuerdo) |
| 17 | Copa Oro | espn | `concacaf.gold` | Candidato fuerte |
| 18 | Liga de Naciones Concacaf | espn | `concacaf.nations.league` | Candidato (un repo) |
| 19 | Eliminatorias Concacaf | espn | `fifa.worldq.concacaf` | Candidato (un repo) |
| 20 | Copa América | espn | `conmebol.america` | Candidato (un repo) |
| 21 | Liga de Naciones UEFA | espn | `uefa.nations` | Candidato (un repo) |
| 22 | Brasileirão | fd | `BSA` | Por verificar (recuerdo) |

Decisiones sobre la tabla: la Concacaf Champions Cup va con Centroamérica porque juegan clubes de Guatemala y Honduras; el Mundial y la Eurocopa vienen de A (no se consulta `fifa.world` ni `uefa.euro` en ESPN, para no duplicar). Las eliminatorias de otras confederaciones, los amistosos y las ligas de otros países quedan fuera. **Son 13 ligas de ESPN por ronda** (una consulta cada una): es el tope; agregar más ligas es costo directo sobre un endpoint no oficial.

## Servidor: `api/en-vivo.ts`
Un `GET` sin parámetros (se ignoran query y headers). Otros métodos: 405.

Variables leídas en cada solicitud (no al importar, para poder probarlas): `FOOTBALL_DATA_KEY` (fuente A activa si existe) y `ESPN_EN_VIVO` (ESPN activa salvo que valga exactamente `off`).

Flujo:
1. Sin ninguna fuente activa: responde vacío, `Cache-Control: public, max-age=0, s-maxage=60`, sin tocar la base (RF-10).
2. Por cada fuente activa, en paralelo (`Promise.all`; cada una atrapa sus propios errores):
   1. **Reclamo atómico** (una sola sentencia; gana quien recibe una fila):
      ```sql
      UPDATE en_vivo_cache SET intento_at = now()
      WHERE fuente = ${f} AND intento_at <= now() - make_interval(secs => ${segundos}::int)
      RETURNING fuente
      ```
      `segundos` = 120 para `fd`, 180 para `espn`. Dos solicitudes simultáneas: la segunda espera el bloqueo de la fila, vuelve a evaluar el `WHERE` con `intento_at` ya actualizado y no recibe fila. Como `intento_at` se marca **antes** de consultar, sirve a la vez de candado: si la función muere a mitad, nadie reintenta hasta que venza el ritmo (no hace falta un candado aparte).
   2. Si ganó: consulta al proveedor (abajo), sanea y, si obtuvo una lista (aunque esté vacía), la guarda: `UPDATE en_vivo_cache SET payload = ${json}::jsonb, actualizado_at = now() WHERE fuente = ${f}`. Si el adaptador falló (error de red, estado HTTP no 200, forma inválida, todas las ligas de ESPN caídas), **no guarda** y registra un aviso. El `intento_at` ya quedó marcado: no hay reintento antes de 2 o 3 minutos, aunque falle.
3. Lee las filas activas en una consulta: `SELECT fuente, payload, (extract(epoch FROM actualizado_at) * 1000)::bigint AS actualizado, coalesce(actualizado_at > now() - make_interval(mins => ${30}::int), false) AS vigente FROM en_vivo_cache WHERE fuente = ANY(${fuentes})`. Solo aportan las filas `vigente` (30 min, constante `MAX_EDAD_MIN`).
4. Une los partidos, ordena por `orden` de la tabla y luego por `minuto` descendente (nulos al final), recorta a 30 y responde `{ actualizado, partidos }`, con `actualizado` = la **menor** marca de las fuentes que aportan partidos (RF-06), o `null` si no hay.
5. Si la base falla (por ejemplo, migración no aplicada): registra el error, responde vacío con `Cache-Control: no-store`. La barra es decoración: nunca rompe nada.

Encabezados de toda respuesta: `Content-Type: application/json` (lo pone `Response.json`), `X-Content-Type-Options: nosniff`, `Cache-Control: public, max-age=0, s-maxage=60` (CDN de Vercel; `max-age=0` evita que el navegador la guarde). Sin encabezados CORS (solo mismo origen).

### Adaptador A (football-data.org)
- `GET https://api.football-data.org/v4/matches?status=LIVE`, header `X-Auth-Token: <FOOTBALL_DATA_KEY>`, `redirect: 'error'`, `AbortSignal.timeout(5000)`. Cuerpo leído como texto y rechazado si pasa de 1,5 MB.
- Se rechaza todo lo que no sea HTTP 200 con un objeto que tenga `matches` como arreglo. Un 429 se trata como error (el ritmo de 2 minutos usa 0,5 consultas por minuto contra un límite de 10).
- Por cada `matches[i]`: `competition.code` debe estar en la tabla con fuente `fd` (si no, se descarta); `status` `IN_PLAY` → `jugando`, `PAUSED` → `descanso` (otro valor, se descarta); `homeTeam.shortName ?? homeTeam.name` y ídem visitante, saneados; marcador `score.fullTime.home/away` (o `homeTeam/awayTeam`), entero 0 a 99 o `null`; `minute` opcional: número o texto `^\d{1,3}(\+\d{1,2})?$` → el primer número, 0 a 130, si no `null`.
- `X-RequestsAvailable` y `X-RequestCounter-Reset` no se usan; no se registran.

### Adaptador B (ESPN)
- Por cada liga ESPN de la tabla, en paralelo con `Promise.allSettled`: `GET https://site.api.espn.com/apis/site/v2/sports/soccer/<slug>/scoreboard`, `redirect: 'error'`, `AbortSignal.timeout(4000)`, header `User-Agent: chamusqueros/1.0 (+https://chamusqueros.vercel.app)` y `Accept: application/json` (identificación honesta; no se imita a un navegador). El `<slug>` sale solo de la tabla constante.
- Una liga cuenta como bien respondida si es HTTP 200 con un objeto cuyo `events` es un arreglo. Si falla (404, 403, red, tiempo, forma), esa liga se omite y se registra `en-vivo: espn <slug> <estado>` (solo slug y código HTTP).
- Si **todas** fallan, el adaptador lanza error y no se guarda nada (RF-09). Si al menos una respondió, se guarda lo de las que respondieron.
- Por cada `events[i]`: estado `status.type.state === 'in'` (si no, se descarta; el estado puede venir en `events[i].status` o en `competitions[0].status`: se acepta el primero que exista); `competitions[0].competitors[]` debe tener un `homeAway: 'home'` y uno `'away'`; nombre `team.displayName`; marcador `score` (texto) → entero 0 a 99 o `null`. Estado: `status.type.name === 'STATUS_HALFTIME'` o `shortDetail === 'HT'` → `descanso`; `STATUS_SHOOTOUT` → `penales`; cualquier otro → `jugando`. Minuto: `displayClock` con forma `^\d{1,3}('|\+\d{1,2}')?$` → el primer número, 0 a 130; si no, `null`.
- Nada de `logo`, `links` ni URLs de la respuesta pasa al modelo.

### Saneado común (A08/A03)
`limpio(texto, max)`: acepta solo `string`; quita caracteres de control, colapsa espacios, recorta por puntos de código a 28 (equipos); vacío = se descarta el partido. Un partido que no cumpla cualquier regla se descarta entero (no se "arregla"). No se confía en ningún campo extra de la respuesta.

## Modelo de datos: `db/en-vivo.sql`
Estilo de `db/ranking.sql` (tabs, MAYÚSCULAS). Una fila por fuente:
```sql
-- Caché de resultados en vivo: una fila por fuente ('fd' = football-data.org, 'espn' = ESPN).
-- payload: partidos ya saneados. actualizado_at: última respuesta buena (NULL = nunca).
-- intento_at: último intento, bueno o malo; sirve de ritmo y de candado (ver api/en-vivo.ts).
-- Aplicar con: psql "$DATABASE_URL_UNPOOLED" -f db/en-vivo.sql
CREATE TABLE IF NOT EXISTS en_vivo_cache (
	fuente text PRIMARY KEY CHECK (fuente IN ('fd', 'espn')),
	payload jsonb NOT NULL DEFAULT '[]',
	actualizado_at timestamptz,
	intento_at timestamptz NOT NULL DEFAULT 'epoch'
);
INSERT INTO en_vivo_cache (fuente) VALUES ('fd'), ('espn') ON CONFLICT DO NOTHING;
```
Sin contador diario: ninguna de las dos fuentes publica tope diario y el ritmo (720 consultas/día como máximo a A; una ronda de 13 cada 3 min a ESPN) ya es el límite. Sin datos personales; la tabla solo se lee y escribe desde el servidor con `DATABASE_URL`.

## Contrato de respuesta
```json
{ "actualizado": 1760457600000,
  "partidos": [ { "fuente": "espn", "liga": "Liga Nacional GT", "local": "Municipal", "visita": "Comunicaciones", "gl": 1, "gv": 0, "estado": "jugando", "minuto": 67 } ] }
```
Vacío: `{ "actualizado": null, "partidos": [] }`. `gl`/`gv` enteros o `null`; `estado` y `fuente` de listas cerradas.

## Cliente: `src/ui/en-vivo.ts` + `src/ui/en-vivo.css`
- Al cargar el módulo crea `<section id="en-vivo" hidden role="region" aria-label="Resultados de fútbol en vivo">` y la inserta con `document.getElementById('app')!.before(...)`. Dentro: un chip fijo (`<span class="ev-tag">`: punto rojo `<i class="ev-dot" aria-hidden="true">`, "EN VIVO", y `<small class="ev-edad">act. hace 3 min</small>`) y `<ul class="ev-lista" tabindex="0" aria-label="Partidos, deslizá para ver más">`.
- Cada `<li class="ev-p">`: liga en texto atenuado, `local gl–gv visita` y el estado; todo con `textContent`. Texto del estado: `jugando` con minuto → `67'`; `jugando` sin minuto → "En juego"; `descanso` → "Medio tiempo"; `penales` → "Penales". Último `<li class="ev-fuente">`: "Datos: " + las fuentes presentes (`fd` → "football-data.org (con retraso)", `espn` → "ESPN") unidas con " · ".
- **Un solo temporizador** `setInterval` de 30 s: si la pestaña está visible, actualiza el texto de antigüedad y, si pasaron >= 120 s desde la última solicitud, llama a `cargar()`. Un `visibilitychange` a visible hace lo mismo de inmediato. `cargar()` usa `fetch('/api/en-vivo', { signal: AbortSignal.timeout(8000) })`; marca la hora de la solicitud también cuando falla (reintenta a los 2 min, no martilla). Ante error conserva lo último pintado; ante datos de más de 30 min de antigüedad oculta la barra.
- **No reconstruye la lista si `actualizado` no cambió** (solo refresca el texto de antigüedad): así no se pierde la posición del deslizamiento cada 2 minutos. Si cambió, guarda y restaura `scrollLeft`.
- `hidden` cuando no hay partidos. La antigüedad es `Math.floor((Date.now() - actualizado) / 60000)`, mínimo 0; 0 → "act. ahora".
- **CSS:** barra `sticky; top: 0; z-index: 50`, alto <= 44 px, fondo `var(--surface)`, borde inferior `1px solid var(--line)`, contenido centrado en `max-width: 560px` como `#app`. La lista: `display: flex; overflow-x: auto; scroll-snap-type: x proximity; overscroll-behavior-x: contain; scrollbar-width: none` (y `::-webkit-scrollbar { display: none }`), elementos `white-space: nowrap; flex: none`. Punto rojo `#d92d20` (decorativo; el texto "EN VIVO" lleva el significado). Texto >= 12 px con colores `var(--ink)` y `var(--muted)`; si `--muted` sobre `--surface` no llega a 4,5:1 en alguno de los dos temas, se usa `--ink`. **Sin `animation`, sin `transition`, sin `scroll-behavior: smooth`**: el requisito de reducir movimiento se cumple por construcción, y no hace falta bloque `prefers-reduced-motion` (el que existe en `style.css:329` no aplica a esta barra).
- Sin `aria-live` (un anuncio cada 2 minutos molesta). La lista con `tabindex="0"` se desplaza con flechas del teclado.
- `body:has(#mg) #en-vivo { display: none }` (minijuego).

## Legal
**`privacidad.html`**: nueva sección "Resultados de fútbol en vivo", antes de "Servicios externos y cookies":
> La barra de resultados en vivo muestra marcadores de partidos que se están jugando. Los obtiene nuestro servidor de dos proveedores externos, football-data.org y ESPN, y los guarda temporalmente en nuestra base de datos. Tu navegador solo se conecta a nuestro servidor, nunca a esos proveedores, y no enviamos a ningún proveedor datos tuyos: ni tu dirección IP, ni tu identificador anónimo. Los datos de partidos no incluyen datos personales. Datos: football-data.org y ESPN.

**`terminos.html`**: nueva sección "Resultados en vivo", antes de "Servicio tal cual", y se amplía "Sin afiliación" con "ni con ESPN ni con football-data.org":
> Los marcadores de la barra de resultados en vivo son solo informativos. Vienen de proveedores externos (football-data.org y ESPN), pueden tener retraso de varios minutos o errores, y no son una fuente oficial. No los uses para tomar decisiones como apuestas. La barra puede dejar de mostrarse en cualquier momento y sin aviso.

Se actualiza "Última actualización" a la fecha en que se implemente.

## Seguridad (OWASP Top 10)
- **A02/A05 (secretos y cabeceras).** `FOOTBALL_DATA_KEY` solo en variables de entorno de Vercel (marcada Sensitive en producción y vista previa) y en `.env.local` (ignorado por git). Nunca con prefijo `VITE_` (Vite expone ese prefijo al navegador). Va en el header `X-Auth-Token`, nunca en la URL. `.env.example` agrega `FOOTBALL_DATA_KEY=` y `ESPN_EN_VIVO=` sin valores. Respuestas con `X-Content-Type-Options: nosniff`. Si la llave se filtra, se regenera en el panel de football-data.org y se actualiza en Vercel. CSP y demás cabeceras globales: hallazgo ya registrado en `home-landing`, fuera de alcance.
- **A10 (SSRF).** Solo dos URLs construidas con constantes: host fijo `api.football-data.org` y host fijo `site.api.espn.com` con el `<slug>` de una tabla constante. Ningún dato de la solicitud entra en las URLs. `redirect: 'error'` (una redirección no puede llevar la llave a otro host) y tiempo límite en todas las consultas.
- **A04 (abuso y cuota).** El endpoint ignora parámetros y devuelve lo guardado; el reclamo atómico limita a 1 consulta/2 min a A y 1 ronda de 13/3 min a ESPN sin importar el tráfico. El CDN con `s-maxage=60` absorbe lo demás. Límite conocido: quien agregue `?x=1,2,3…` evita el CDN y fuerza lecturas baratas a Neon, no consultas a los proveedores. Si molestara, se agrega una regla de límite de tasa en el Firewall de Vercel (configuración, no código).
- **A03 (inyección/XSS).** Nombres de equipos y de ligas: el servidor devuelve texto saneado y la liga sale de una tabla propia; el cliente los pone con `textContent` y nunca con `innerHTML`. Se prueba con CA-11. SQL con consultas parametrizadas del driver, sin concatenar.
- **A08 (integridad de datos).** Toda respuesta de proveedor se valida (tipos, rangos, listas cerradas, tamaño) y se sanea antes de guardarla; un partido inválido se descarta entero; el adaptador de ESPN además falla en silencio y se apaga con `ESPN_EN_VIVO=off`. No se ejecuta ni se interpreta nada de la respuesta.
- **A09 (registros).** Solo se registran: nombre de la fuente, `slug` de liga, código HTTP y el mensaje corto del error. Nunca la llave, ni encabezados, ni cuerpos de respuesta.
- **A06 (componentes).** Sin dependencias nuevas; se reutiliza `@neondatabase/serverless`.
- **A01, A07.** No aplican: dato público de solo lectura, sin cuentas ni sesiones.
- **Riesgo legal (no OWASP).** Los términos de ESPN restringen el uso de su contenido; el usuario lo aceptó (D2). Mitigaciones: solo texto, sin imágenes, atribución visible, interruptor `ESPN_EN_VIVO=off`, identificación honesta del cliente.

## Pruebas
- **`scripts/en-vivo.test.ts`** (`npx tsx scripts/en-vivo.test.ts`, mismo estilo que `scripts/ranking.test.ts`): define `DATABASE_URL` falso, importa el handler real y reemplaza `globalThis.fetch`. **El fake despacha por host**, porque el driver de Neon también usa `fetch`: `*.neon.tech` → una tabla en memoria con las dos filas y un reloj simulado que aplica la misma lógica del reclamo (la fórmula del `WHERE` se reimplementa en la prueba); `api.football-data.org` → fixture, 429, 500, JSON inválido, `matches` ausente, o una promesa que nunca se resuelve (tiempo agotado); `site.api.espn.com` → fixture por `slug`, vacío, 404, 403, forma inesperada. Cuenta las consultas por host y por slug y comprueba que el header `X-Auth-Token` lleva la llave y que ninguna consulta a ESPN lleva llave. Cubre CA-1, 2, 4 a 10: filtro y orden, tope de 30, 20 solicitudes concurrentes, ritmos de 2 y 3 min (con el reloj), errores de A, errores de ESPN por liga y totales, vigencia de 30 min, interruptores y llaves ausentes, y los campos exactos de la respuesta. Ajustar el formato de filas del fake al que parsea `@neondatabase/serverless` (`fields` y `rows`); si estorba, devolver el `payload` como texto JSON y parsearlo en el handler.
- **`db/en-vivo.test.sql`** (`psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f db/en-vivo.test.sql`; transacción con `ROLLBACK`; copia del reclamo con aviso "si cambia en `api/en-vivo.ts`, cambiarlo aquí"): la fila recién creada se reclama; un segundo reclamo inmediato no devuelve fila (la propiedad que da un solo ganador bajo concurrencia); a 1 s antes del ritmo no devuelve fila, al cumplirlo sí; las dos fuentes son independientes. La concurrencia real la garantiza Postgres (una `UPDATE` espera el bloqueo de la fila y reevalúa el `WHERE`); no se simula en dos sesiones.
- **Navegador** (Playwright, ya usado en el repo): se intercepta `/api/en-vivo` con `page.route` y se sirve la respuesta del fixture. 360x640 y 1280x800, claro y oscuro, con y sin `prefers-reduced-motion`. Mide: alto de barra, `scrollWidth`, borde inferior del CTA del Home (CA-15), orden, XSS (CA-11), `scrollLeft` quieto (CA-12), reloj simulado para CA-13 y CA-14, contraste (CA-16), minijuego (CA-17), ranking.
- **Build:** `npm run build` y `git grep`/`grep -r` del valor de la llave en `dist/` (CA-18).

## Pasos para activar
1. **Registrarse en football-data.org** (cuenta gratuita, formulario de registro del sitio https://www.football-data.org); la llave llega por correo. Leer en ese momento sus términos y confirmar la atribución (aclaración 1).
2. **Cargar la llave en Vercel:** `vercel env add FOOTBALL_DATA_KEY production` y `vercel env add FOOTBALL_DATA_KEY preview` (pegar el valor cuando lo pida; marcarla Sensitive desde el panel). Para desarrollo local, `vercel env pull .env.local` o agregar `FOOTBALL_DATA_KEY=…` a mano en `.env.local`.
3. **Migración en Neon:** `psql "$DATABASE_URL_UNPOOLED" -f db/en-vivo.sql` contra la base que use cada entorno (comprobar si la vista previa comparte la base de producción; si no, aplicarla también a esa). Sin migración el endpoint responde vacío y registra el error.
4. **Vista previa:** empujar la rama; con la URL que devuelva Vercel, `npx vercel curl /api/en-vivo --deployment <url>`. Un día con partidos debe traer datos de ambas fuentes. Revisar los registros de ejecución en busca de líneas `en-vivo: espn <slug> <estado>`; quitar de la tabla `LIGAS` los slugs que den 404 y, si ESPN da 403 en todas las ligas, tratar la aclaración 3. Guardar las respuestas reales como fixtures y repetir `npx tsx scripts/en-vivo.test.ts` (T11).
5. **Apagar ESPN sin tocar código:** `vercel env add ESPN_EN_VIVO production` con valor `off` (o editarla en el panel) y **redesplegar** (Deployments → Redeploy): Vercel aplica las variables solo a despliegues nuevos. Para volver a encenderla, borrar la variable o cambiar el valor y redesplegar.
6. **Dejar listo `.env.example`** (`FOOTBALL_DATA_KEY=` y `ESPN_EN_VIVO=` sin valores) y confirmar `.env.local` fuera de git.

## Riesgos
- **ESPN (no oficial).** Puede cambiar, bloquear las IP de Vercel (hay un caso de 403 de Akamai en otra red) o dejar de responder. Mitigación: falla en silencio, interruptor, verificación en vista previa. Consecuencia si falla: sin Liga Nacional, Centroamérica ni México (aclaración 3).
- **Volumen hacia ESPN.** 13 consultas cada 3 minutos mientras alguien use el sitio (tope ~6.200 al día). Mitigación: el ritmo lo fija el servidor, no los visitantes. Si hiciera falta bajar la presión, subir el ritmo a 5 minutos o recortar ligas (cada una cuesta una consulta por ronda).
- **football-data.org gratis.** Retraso sin cifra, forma del marcador contradictoria en la documentación y posible ausencia de minuto. Mitigación: adaptador tolerante, "–" ante marcador desconocido, "En juego" ante minuto ausente, rótulo "con retraso", y verificación real (aclaración 2).
- **Desplazamiento del diseño al cargar.** Si hay partidos, la barra aparece ~300 ms después de cargar y empuja el contenido <= 44 px una vez; puede desplazar un botón justo cuando el usuario va a tocarlo. No se reserva el espacio (ocuparía altura aun sin partidos, contra RF-01). Se acepta y se mide en T8; después de la primera pintura no cambia entre pantallas.
- **`:has()` ausente** en navegadores antiguos: la barra se ve durante un minijuego. Se acepta.
- **Conflictos de fusión** con Retos Fútbol, Premios y Tienda: mitigado al no tocar `render()`, `home()`, `footer()` ni `style.css`; la única línea compartida es el `import` en `main.ts`.
- **Variables de entorno y redespliegue:** apagar ESPN requiere redesplegar (minutos). Si hiciera falta apagado inmediato, se puede agregar una columna de apagado en `en_vivo_cache`; no se hace (nadie lo pidió).
- **Códigos `STATUS_*` de ESPN** (`STATUS_HALFTIME`, `STATUS_SHOOTOUT`) son recuerdo del redactor: si fallan, el partido se muestra como "En juego", que es degradación aceptable.

## Cobertura
RF-01: servidor paso 3 (vigencia), cliente `hidden`. RF-02: cliente (chip, `<li>`, atribución). RF-03: servidor paso 4 y tabla `LIGAS`. RF-04: tabla `LIGAS`, tope en servidor paso 4, filtro en adaptadores. RF-05: CSS sin animaciones. RF-06: servidor paso 4 (`actualizado` mínimo), cliente. RF-07: cliente (temporizador y `visibilitychange`). RF-08: reclamo atómico por fuente. RF-09: pasos 2.2 y 3, adaptadores, error por liga. RF-10: servidor flujo 1 y variables. RF-11: seguridad A02/A05 y A09. RF-12: integración (`import` en `main.ts`, módulo fuera de `#app`, `:has(#mg)`). RF-13: cliente (región, lista con `tabindex`, sin `aria-live`) y CSS. RF-14: CSS y T8. RF-15: `textContent` y saneado. RF-16: sección Legal. RF-17: Pasos para activar y Pruebas. D1 a D10 reflejadas. Sin diseño sin requisito: no hay contador diario, ni candado aparte, ni módulos auxiliares, ni imágenes.
