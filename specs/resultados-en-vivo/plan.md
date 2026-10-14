# Plan: Resultados de fútbol en vivo en el navbar

Stack: el del repo (TypeScript vanilla, Vite, CSS, Vercel Function + Neon, patrón de `api/ranking.ts`). **Sin dependencias nuevas.** Una sola fuente: ESPN (decisión del usuario: solo ESPN, riesgo aceptado, sin proveedor oficial). Archivos nuevos: `api/en-vivo.ts`, `db/en-vivo.sql`, `db/en-vivo.test.sql`, `src/ui/en-vivo.ts`, `src/ui/en-vivo.css`, `scripts/en-vivo.test.ts` y fixtures en `scripts/fixtures/`. Archivos existentes que se tocan: `src/main.ts` (una línea), `privacidad.html`, `terminos.html`, `.env.example`.

## Lo que se leyó del repo (y lo que implica)
- **No hay navbar ni header común.** Cada pantalla arma su HTML y lo pasa a `render()`, que hace `app.innerHTML = '<div class="flag"></div>' + html` (franja de 8 px de la bandera). Hay 6 pantallas: `home()`, `createForm()`, `debut()`, `gameScreen()`, `finish()`, `rankingScreen()`.
- **Consecuencia:** una barra dentro de `#app` se destruye y recrea en cada `render()` y su temporizador con ella. La barra va **fuera de `#app`**, como hermano anterior (`app.before(barra)`), montada una sola vez.
- **Posición:** `position: sticky; top: 0` (no `fixed`): ocupa su altura en el flujo y empuja el contenido, así que nunca tapa el CTA ni la franja de la bandera. El único `fixed` del repo es `.party` (`z-index: 100`), por encima de la barra (`z-index: 50`); los `<dialog>` usan la capa superior.
- **Integración:** una línea en `src/main.ts`, justo después de `import './style.css';`: `import './ui/en-vivo';`. El módulo se monta solo al cargarse. Los estilos van en `src/ui/en-vivo.css`, importado desde el propio módulo: no se toca `style.css`. Usa las variables de color existentes; el modo oscuro sale gratis.
- **Minijuegos:** `gameScreen()` monta `<div class="mg" id="mg">` solo cuando hay minijuego. La barra se oculta con `body:has(#mg) #en-vivo { display: none }`. En navegadores sin `:has()` la barra sigue visible durante el minijuego; se acepta.
- **`api/ranking.ts` (patrón a copiar):** `neon(process.env.DATABASE_URL!)`, `export async function GET`, `Response.json`, validación manual, tablas con tabs y MAYÚSCULAS en `db/*.sql` (se aplican con `psql "$DATABASE_URL_UNPOOLED" -f …`). **No tiene ningún `CREATE TABLE` en el handler**, así que `api/en-vivo.ts` tampoco crea su tabla: la migración se aplica a mano. Sin migración, el endpoint responde vacío con `no-store` y registra el error.
- **No hay `vercel.json`:** los `Cache-Control` van en la respuesta del handler. Cada archivo de `api/` es una función: la lógica va en un solo archivo. Solo se exporta `GET`; Vercel responde 405 a los demás métodos.
- **`.gitignore`** ya excluye `.env`, `.env*.local` y `.vercel`.

## Lo que se confirmó de ESPN
**Aviso de método.** La red de la máquina de trabajo bloquea la categoría "Deportes" y no se intentó saltar ningún filtro. No se pudo llamar a ESPN. Todo viene de repositorios públicos de terceros (fuente **secundaria**) y no sustituye la verificación real de T11.
| Dato | Estado | Fuente |
| --- | --- | --- |
| Patrón `https://site.api.espn.com/apis/site/v2/sports/soccer/{liga}/scoreboard` | Confirmado por uso en muchos repositorios | https://github.com/ralvarezdev/go-espn (docs/espn-api-testing-reference.md), https://github.com/geeksilva97/bethoven (docs/espn-api.md) |
| `status.type.state` = `pre` / `in` / `post`; minuto en `status.displayClock` | Confirmado por uso | https://github.com/nilsbacklund/wc2026-tracker (`espn.py`), https://github.com/okekedev/soccer-globe (`web/src/lib/espn.ts`) |
| `competitions[0].competitors[]` con `homeAway` y `score` (texto) | Confirmado por uso | go-espn, bethoven |
| `status.type.name` con valores `STATUS_*` | Patrón confirmado; `STATUS_HALFTIME` y `STATUS_SHOOTOUT` son recuerdo del redactor | https://github.com/giodamelio/trmnl-backend (`apis/espn/NOTES.md`) |
| El scoreboard sin `dates` devuelve la jornada "actual o siguiente" | Confirmado por uso | https://github.com/CaptainSpof/dafos |
| Caso de 403 de Akamai contra `site.api.espn.com` (otro endpoint, otra red) | Riesgo observado | https://github.com/sergeykuznetsov1995/data-platform-football |
| Términos de ESPN sobre el uso de su contenido | No leídos; el usuario **aceptó el riesgo** (D2) | — |

**Optimización por verificar (T11), no usada.** Un endpoint de ESPN que traiga varias ligas en una sola llamada reduciría las 22 consultas por ronda a una. Una búsqueda pública no lo confirmó (los scrapers consultados hacen una llamada por liga); si en la T11 se comprueba con un navegador desde una red no corporativa que existe (por ejemplo, un scoreboard genérico de fútbol), se evalúa cambiar el adaptador. Mientras tanto no se usa.

## Cómo se verifica (este entorno no puede llamar a ESPN)
1. **Fixtures.** `scripts/fixtures/espn-scoreboard-live.json` y `espn-scoreboard-empty.json`, escritos a mano con la forma de arriba y un campo `_nota`; **no son capturas reales**. Alimentan las pruebas; las variantes rotas se arman dentro de la prueba.
2. **Vista previa de Vercel** (la función corre fuera de la red corporativa): `npx vercel curl /api/en-vivo --deployment <url-de-la-vista-previa>`. Un día de partidos debe traer partidos. Los fallos por liga se ven en los registros de ejecución (`en-vivo: espn <slug> <motivo>`).
3. **Códigos de ESPN no confirmados** (tabla de abajo): se confirman en la vista previa, o abriendo `https://site.api.espn.com/apis/site/v2/sports/soccer/<slug>/scoreboard` en el navegador de un celular con datos móviles: JSON con `events` (aunque sea vacío) = existe; 404 = se quita de la lista. Tras confirmar, se guarda esa respuesta real como fixture y se repite la prueba.

## Modelo común y tabla de ligas
Modelo saneado que se guarda y se sirve:
`{ liga: string, local: string, visita: string, gl: number | null, gv: number | null, estado: 'jugando' | 'descanso' | 'penales', minuto: number | null }`.
`liga` es **siempre la etiqueta propia de la tabla**, nunca el nombre que manda ESPN.

Tabla `LIGAS` en `api/en-vivo.ts` (el índice define el orden de la barra). "Estado" dice qué tan firme está el código: **todos son candidatos hasta la T11**.
| Orden | Etiqueta | Código | Estado |
| --- | --- | --- | --- |
| 1 | Liga Nacional GT | `gua.1` | Candidato fuerte (varios repos públicos) |
| 2 | Costa Rica | `crc.1` | Por verificar (sin fuente) |
| 3 | Honduras | `hon.1` | Candidato fuerte |
| 4 | El Salvador | `slv.1` | Candidato |
| 5 | Panamá | `pan.1` | Candidato |
| 6 | Concacaf Champions Cup | `concacaf.champions` | Candidato fuerte |
| 7 | Liga MX | `mex.1` | Candidato fuerte |
| 8 | MLS | `usa.1` | Candidato fuerte |
| 9 | Champions League | `uefa.champions` | Candidato fuerte |
| 10 | Premier League | `eng.1` | Candidato fuerte |
| 11 | LaLiga | `esp.1` | Candidato fuerte |
| 12 | Serie A | `ita.1` | Candidato fuerte |
| 13 | Bundesliga | `ger.1` | Candidato fuerte |
| 14 | Ligue 1 | `fra.1` | Candidato fuerte |
| 15 | Libertadores | `conmebol.libertadores` | Candidato |
| 16 | Mundial | `fifa.world` | Candidato |
| 17 | Eurocopa | `uefa.euro` | Candidato |
| 18 | Copa Oro | `concacaf.gold` | Candidato fuerte |
| 19 | Liga de Naciones Concacaf | `concacaf.nations.league` | Candidato |
| 20 | Eliminatorias Concacaf | `fifa.worldq.concacaf` | Candidato |
| 21 | Copa América | `conmebol.america` | Candidato |
| 22 | Liga de Naciones UEFA | `uefa.nations` | Candidato |

**Son 22 ligas por ronda** (una consulta cada una): es el tope; agregar más es costo directo sobre un endpoint no oficial. El Brasileirão (que venía de football-data.org) queda fuera; las eliminatorias de otras confederaciones, los amistosos y otras ligas, también.

## Servidor: `api/en-vivo.ts`
Un `GET` sin parámetros (se ignoran query y headers). Variable leída en cada solicitud (no al importar, para poder probarla): `ESPN_EN_VIVO` (la feature está activa salvo que valga exactamente `off`).

Flujo:
1. `ESPN_EN_VIVO=off`: responde vacío, `Cache-Control: public, max-age=0, s-maxage=60`, sin tocar la base (RF-10).
2. **Reclamo atómico** (una sola sentencia; gana quien recibe una fila):
   ```sql
   UPDATE en_vivo_cache SET intento_at = now()
   WHERE id = 1 AND intento_at <= now() - make_interval(secs => ${180}::int)
   RETURNING id
   ```
   Dos solicitudes simultáneas: la segunda espera el bloqueo de la fila, reevalúa el `WHERE` con `intento_at` ya actualizado y no recibe fila. `intento_at` se marca **antes** de consultar, así que sirve a la vez de candado: si la función muere a mitad, nadie reintenta hasta que venza el ritmo.
3. Si ganó: una **ronda** (abajo) y, si obtuvo una lista (aunque esté vacía), la guarda: `UPDATE en_vivo_cache SET payload = ${json}::jsonb, actualizado_at = now() WHERE id = 1`. Si toda la ronda falló, **no guarda** y registra un aviso. Quien pierde el reclamo no espera: sirve lo guardado.
4. Lee la fila (`payload`, `actualizado` en ms y `edad` en segundos, ambos calculados en la base). Solo aporta si `edad < 30 min` (`MAX_EDAD_MIN`).
5. Ordena por el índice de la tabla `LIGAS` y luego por `minuto` descendente (nulos al final), recorta a 30 y responde `{ actualizado, partidos }`, o `{ actualizado: null, partidos: [] }` si no hay.
6. Si la base falla (por ejemplo, migración sin aplicar): registra el error, responde vacío con `Cache-Control: no-store`. La barra es decoración: nunca rompe nada.

Encabezados: `Content-Type: application/json`, `X-Content-Type-Options: nosniff`, `Cache-Control: public, max-age=0, s-maxage=60` (CDN de Vercel; `max-age=0` evita que el navegador la guarde). Sin CORS (solo mismo origen).

### Ronda a ESPN
- Por cada liga de la tabla, **de a 5 a la vez** (un grupo de 5 trabajadores toma la siguiente liga cuando termina): `GET https://site.api.espn.com/apis/site/v2/sports/soccer/<slug>/scoreboard`, `redirect: 'error'`, tiempo límite de 4 s por liga y de 8 s para toda la ronda (con 22 ligas y todo colgado serían 5 tandas de 4 s, más que el límite de una función; pasado el tope de la ronda no se lanzan más ligas), `User-Agent: chamusqueros/1.0 (+https://chamusqueros.vercel.app)` y `Accept: application/json` (identificación honesta). El `<slug>` sale solo de la tabla constante.
- Una liga cuenta como bien respondida si es HTTP 200, el cuerpo mide <= 1,5 MB y es un objeto con `events` arreglo. Si falla, esa liga se omite y se registra `en-vivo: espn <slug> <motivo>` (solo slug y motivo corto: `HTTP 403`, `tiempo agotado`, `red`, `json inválido`, `forma inesperada`, `estado desconocido`, `cuerpo demasiado grande`).
- Si **todas** fallan, la ronda lanza error y no se guarda nada (RF-09). Si al menos una respondió, se guarda lo de las que respondieron.
- Por cada `events[i]`: el estado sale del primero que exista entre `events[i].status` y `competitions[0].status`; `status.type.state` debe ser `pre`, `in` o `post` (otro valor o ausente = forma inesperada: esa liga se omite entera) y solo `in` pasa; `competitions[0].competitors[]` debe tener un `homeAway: 'home'` y uno `'away'`; nombre `team.displayName`; marcador `score` (texto) → entero 0 a 99 o `null`. Estado: `status.type.name === 'STATUS_HALFTIME'` o `shortDetail === 'HT'` → `descanso`; `STATUS_SHOOTOUT` → `penales`; otro → `jugando`. Minuto: `displayClock` con forma `67'`, `45'+2'` o `90+5` → el primer número, 0 a 130; si no, `null`.
- Nada de `logo`, `links` ni URLs de la respuesta pasa al modelo.

### Saneado (A08/A03)
`limpio(texto, 28)`: acepta solo `string`; quita caracteres de control y de formato (incluye los que invierten el sentido del texto), colapsa espacios, recorta por puntos de código a 28; vacío = se descarta el partido. Un partido que no cumpla cualquier regla se descarta entero (no se "arregla"). No se confía en ningún campo extra.

## Modelo de datos: `db/en-vivo.sql`
Estilo de `db/ranking.sql` (tabs, MAYÚSCULAS). Una sola fila (`id = 1`) con `payload jsonb`, `actualizado_at` (última respuesta buena, NULL = nunca) e `intento_at` (último intento; ritmo y candado). Sin datos personales; solo se lee y escribe desde el servidor con `DATABASE_URL`. Sin contador diario: el ritmo ya es el límite (una ronda de 22 cada 3 minutos como máximo, solo si alguien pide datos).

## Contrato de respuesta
```json
{ "actualizado": 1760457600000,
  "partidos": [ { "liga": "Liga Nacional GT", "local": "Municipal", "visita": "Comunicaciones", "gl": 1, "gv": 0, "estado": "jugando", "minuto": 67 } ] }
```
Vacío: `{ "actualizado": null, "partidos": [] }`. `gl`/`gv` enteros o `null`; `estado` de lista cerrada.

## Cliente: `src/ui/en-vivo.ts` + `src/ui/en-vivo.css`
- Al cargar el módulo crea `<section id="en-vivo" hidden aria-label="Resultados de fútbol en vivo">` (una `section` con nombre ya es una región) y la inserta con `document.getElementById('app')!.before(...)`. Dentro: un chip fijo (punto rojo `aria-hidden`, "EN VIVO" y `<small>` "act. hace 3 min") y `<ul tabindex="0" aria-label="Partidos, deslizá para ver más">`.
- Cada `<li>`: liga atenuada, `local gl–gv visita` ("vs" si falta el marcador) y el estado; todo con `textContent`. `jugando` con minuto → `67'`; sin minuto → "En juego"; `descanso` → "Medio tiempo"; `penales` → "Penales". Último `<li>`: "Datos: ESPN".
- **Un solo temporizador** `setInterval` de 30 s: con la pestaña visible, actualiza la antigüedad y, si pasaron ~120 s desde la última solicitud (con 5 s de tolerancia por la deriva del temporizador), llama a `cargar()`. `visibilitychange` hace lo mismo de inmediato. `cargar()` usa `fetch('/api/en-vivo', { signal: AbortSignal.timeout(8000) })` y marca la hora también cuando falla (reintenta a los 2 min). Ante error conserva lo último pintado; con datos de más de 30 min oculta la barra.
- **No reconstruye la lista si `actualizado` no cambió**; si cambió, guarda y restaura `scrollLeft`.
- `hidden` cuando no hay partidos. La antigüedad es `Math.floor((Date.now() - actualizado) / 60000)`, mínimo 0; 0 → "act. ahora".
- **CSS:** barra `sticky; top: 0; z-index: 50`, alto 36 px (tope 44), fondo `var(--surface)`, borde inferior `1px solid var(--line)`, contenido alineado a la columna de 560 px de `#app`. Lista `display: flex; overflow-x: auto; scroll-snap-type: x proximity; scrollbar-width: none`. Punto rojo `#d92d20` (decorativo). Texto >= 12 px con `--ink` y `--muted` (medido: >= 6,2:1 en claro y >= 7,2:1 en oscuro). **Sin `animation`, sin `transition`, sin `scroll-behavior`**: el requisito de reducir movimiento se cumple por construcción. Ojo: `#en-vivo[hidden]` lleva su propia regla `display: none`, porque `display: flex` anularía el atributo `hidden`.
- Sin `aria-live` (un anuncio cada 2 minutos molesta). La lista con `tabindex="0"` se desplaza con flechas.

## Legal
**`privacidad.html`**: sección "Resultados de fútbol en vivo", antes de "Servicios externos y cookies": los marcadores los obtiene nuestro servidor de un proveedor externo, ESPN; los guarda temporalmente; el navegador solo se conecta a nuestro servidor; "no enviamos a ESPN datos tuyos: ni tu dirección IP, ni tu identificador anónimo"; "Datos: ESPN".
**`terminos.html`**: sección "Resultados en vivo", antes de "Servicio tal cual" (marcadores informativos, de ESPN, con retraso de varios minutos o errores, no oficiales, no usarlos para apuestas, la barra puede dejar de mostrarse), y "Sin afiliación" pasa a nombrar a ESPN. La fecha de "Última actualización" ya era la de hoy (14 de octubre de 2026).

## Seguridad (OWASP Top 10)
- **A02/A05 (secretos y cabeceras).** **No hay credenciales en esta feature**: ESPN es público y no usa llave, así que no hay nada que filtrar al navegador, a git ni a los registros. La única variable es `ESPN_EN_VIVO` (interruptor, no secreto) y ninguna empieza por `VITE_`. `.env.example` solo trae su nombre. Respuestas con `X-Content-Type-Options: nosniff`. CSP y demás cabeceras globales: hallazgo ya registrado en `home-landing`, fuera de alcance.
- **A10 (SSRF).** Una sola URL construida con constantes: host fijo `site.api.espn.com` con el `<slug>` de una tabla constante. Ningún dato de la solicitud entra en las URLs. `redirect: 'error'` y tiempo límite en todas las consultas.
- **A04 (abuso y cuota).** El endpoint ignora parámetros y devuelve lo guardado; el reclamo atómico limita a 1 ronda/3 min, de a 5 consultas, sin importar el tráfico; sin visitantes no hay llamadas. El CDN con `s-maxage=60` absorbe lo demás. Límite conocido: quien agregue `?x=1,2,3…` evita el CDN y fuerza lecturas baratas a Neon, no consultas a ESPN. Si molestara, una regla de límite de tasa en el Firewall de Vercel (configuración, no código).
- **A03 (inyección/XSS).** El servidor devuelve texto saneado y la liga sale de una tabla propia; el cliente los pone con `textContent` y nunca con `innerHTML`. SQL con consultas parametrizadas del driver.
- **A08 (integridad de datos).** Toda respuesta de ESPN se valida (tipos, rangos, listas cerradas, tamaño) y se sanea antes de guardarla; un partido inválido se descarta entero; una liga con forma inesperada se omite; el adaptador falla en silencio y se apaga con `ESPN_EN_VIVO=off`. No se ejecuta ni se interpreta nada de la respuesta.
- **A09 (registros).** Solo se registran el slug de la liga y un motivo corto de una lista fija, o el mensaje corto de un error de la base. Nunca cuerpos ni encabezados.
- **A06 (componentes).** Sin dependencias nuevas; se reutiliza `@neondatabase/serverless`.
- **A01, A07.** No aplican: dato público de solo lectura, sin cuentas ni sesiones.
- **Riesgo legal (no OWASP).** Los términos de ESPN restringen el uso de su contenido; el usuario lo aceptó (D2). Mitigaciones: solo texto, sin imágenes, atribución visible, interruptor `ESPN_EN_VIVO=off`, identificación honesta del cliente.

## Pruebas
- **`scripts/en-vivo.test.ts`** (`npx tsx scripts/en-vivo.test.ts`, mismo estilo que `scripts/ranking.test.ts`): define `DATABASE_URL` falso, importa el handler real y reemplaza `globalThis.fetch`. El fake despacha por host: `*.neon.tech` → una fila en memoria con reloj simulado, que responde como Neon por HTTP (`fields` con tipos y filas como arreglos de texto, para que el driver real las convierta) y reimplementa solo la fórmula del reclamo; `site.api.espn.com` → fixture por `slug`, vacío, 403, 404, 500, red, tiempo agotado, JSON inválido, cuerpo gigante, forma inesperada; cualquier otro host falla la prueba. Los plazos de `AbortSignal.timeout` se achican 100 veces y se anota el valor pedido (4000 y 8000). Cubre: filtro y orden, tope de 30, 20 solicitudes concurrentes, límite de 5 en vuelo, ritmo de 3 min, ESPN caído por completo (con y sin datos guardados), una liga caída y las demás bien, vigencia de 30 min, interruptor, forma inválida (A08), saneado, base caída, solo `GET` exportado y registros sin datos sensibles.
- **`db/en-vivo.test.sql`** (`psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f db/en-vivo.test.sql`; transacción con `ROLLBACK`; copia del reclamo con aviso "si cambia en `api/en-vivo.ts`, cambiarlo aquí"): la fila nueva se reclama; un segundo reclamo inmediato no devuelve fila; a 1 s antes del ritmo no devuelve fila y al cumplirlo sí. La concurrencia real la garantiza Postgres; no se simula en dos sesiones.
- **Navegador** (Playwright, `/api/en-vivo` interceptado con `page.route`; **no** se deja un archivo en `public/api/`, porque Vite lo copiaría a `dist/` y en Vercel un estático taparía a la función): 360x640 y 1280x800, claro y oscuro, con y sin `prefers-reduced-motion`; mide alto de la barra, `scrollWidth`, borde inferior del CTA, XSS (CA-11, con la carga completa servida por la ruta), `scrollLeft` quieto, reloj simulado (CA-13), antigüedad (CA-14), contraste (CA-16), minijuego (CA-17).
- **Build:** `npm run build` y `grep -r` de llaves en `dist/` (CA-18).

## Pasos para activar
1. **Migración en Neon:** `psql "$DATABASE_URL_UNPOOLED" -f db/en-vivo.sql` contra la base que use cada entorno (previews y producción comparten base: comprobarlo). Para probarla antes: `psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f db/en-vivo.test.sql`. Sin migración el endpoint responde vacío y registra el error. No hay llaves que cargar.
2. **Vista previa:** empujar la rama; con la URL que devuelva Vercel, `npx vercel curl /api/en-vivo --deployment <url>`. Un día con partidos debe traer datos. Revisar los registros de ejecución en busca de líneas `en-vivo: espn <slug> <motivo>`; quitar de la tabla `LIGAS` los slugs que den 404. Si todas dan 403, ESPN bloquea a Vercel: la barra queda oculta (por diseño) y se decide con el usuario. Guardar las respuestas reales como fixtures y repetir `npx tsx scripts/en-vivo.test.ts` (T11).
3. **Apagar la feature sin tocar código:** `vercel env add ESPN_EN_VIVO production` con valor `off` y **redesplegar** (Vercel aplica las variables solo a despliegues nuevos). Para volver a encenderla, borrar la variable o cambiar el valor y redesplegar.

## Riesgos
- **ESPN (no oficial, única fuente).** Puede cambiar, bloquear las IP de Vercel (hay un caso de 403 de Akamai en otra red) o dejar de responder. Consecuencia: la barra desaparece, sin romper nada. Mitigación: falla en silencio, interruptor, verificación en vista previa.
- **Volumen hacia ESPN.** 22 consultas por ronda, como máximo una ronda cada 3 minutos y solo si alguien pide datos (tope ~10.500 consultas al día con tráfico continuo). Mitigación: el ritmo lo fija el servidor. Si hiciera falta bajar la presión, subir el ritmo a 5 minutos, recortar ligas o usar el endpoint combinado si se confirma.
- **Duración de la función.** Ronda normal: 5 tandas de ~0,3 s. Ronda colgada: tope de 8 s. Sin ese tope serían 20 s.
- **Una liga con un solo evento de forma rara se omite entera** (`estado desconocido`): es deliberado para detectar cambios de formato; el costo es perder esa liga hasta la siguiente ronda.
- **Desplazamiento del diseño al cargar.** Si hay partidos, la barra aparece ~300 ms después de cargar y empuja el contenido 36 px una vez. No se reserva el espacio (ocuparía altura aun sin partidos, contra RF-01). Después de la primera pintura no cambia entre pantallas.
- **`:has()` ausente** en navegadores antiguos: la barra se ve durante un minijuego. Se acepta.
- **Variables de entorno y redespliegue:** apagar requiere redesplegar (minutos).
- **Códigos `STATUS_*` de ESPN** (`STATUS_HALFTIME`, `STATUS_SHOOTOUT`) son recuerdo del redactor: si fallan, el partido se muestra como "En juego".
- **En el escritorio** la lista queda dentro de la columna de 560 px y se desliza con rueda o gesto; no se ve completa. Se acepta (diseño pensado para el celular).

## Cobertura
RF-01: servidor paso 4 (vigencia), cliente `hidden`. RF-02: cliente. RF-03: servidor paso 5 y tabla `LIGAS`. RF-04: tabla, tope en el paso 5, filtro de estado. RF-05: CSS sin animaciones. RF-06: cliente. RF-07: cliente (temporizador y `visibilitychange`). RF-08: reclamo atómico y concurrencia de 5. RF-09: pasos 3 y 4, error por liga. RF-10: servidor paso 1. RF-11: seguridad A02/A05, A09, A10. RF-12: integración y `:has(#mg)`. RF-13: cliente y CSS. RF-14: CSS y T8. RF-15: `textContent` y saneado. RF-16: sección Legal. RF-17: Pasos para activar y Pruebas.

## Textos legales para publicar al activar una fuente
Retirados de `privacidad.html` y `terminos.html` mientras la barra esté apagada; ajustar el nombre del proveedor al activar.

- Privacidad, sección "Resultados de fútbol en vivo": "La barra de resultados en vivo muestra marcadores de partidos que se están jugando. Los obtiene nuestro servidor de un proveedor externo, <proveedor>, y los guarda temporalmente en nuestra base de datos. Tu navegador solo se conecta a nuestro servidor, nunca al proveedor, y no le enviamos datos tuyos: ni tu dirección IP, ni tu identificador anónimo. Los datos de partidos no incluyen datos personales. Datos: <proveedor>."
- Términos, sección "Resultados en vivo": "Los marcadores de la barra de resultados en vivo son solo informativos. Vienen de un proveedor externo, <proveedor>, pueden tener retraso de varios minutos o errores, y no son una fuente oficial. No los uses para tomar decisiones como apuestas. La barra puede dejar de mostrarse en cualquier momento y sin aviso." Y sumar al proveedor en la lista de "sin afiliación".
