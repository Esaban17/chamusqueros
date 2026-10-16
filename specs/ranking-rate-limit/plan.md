# Plan: tope de uso en el ranking de carreras

Deriva de `spec.md` de esta carpeta. Cada `RF-nn` está cubierto en "Cobertura". Lo que ningún requisito pide no está aquí. Sin dependencias nuevas, sin cambios de esquema, sin servicios nuevos.

## Lo que se leyó antes de diseñar
- `api/_limite.ts`: ventana fija en memoria por clave (`limitar(clave, {max, ms})` devuelve los segundos que faltan o 0), tabla `LIMITES`, `MIN`, `HORA`, `reiniciarLimites()` para pruebas; `limitar` toma `ahora = Date.now()` por defecto, así que un reloj falso la controla. Ya existe `rankingIp` (60/min) y el prefijo de clave `ranking-ip:`, **ambos del ranking de Retos** (`api/retos-ranking.ts`).
- `api/_http.ts`: `ipDe(req)` (primera IP de `x-forwarded-for`, 64 caracteres como máximo, `'desconocida'` si falta) y `limitado(segundos)`, que arma el 429 con `retry-after`, `content-type`, `nosniff` y `no-store`, sin CORS y con un mensaje genérico. Lo usan todos los servicios de Retos. Su único import de `src/` es de tipos, así que no cambia el grafo de imports de `api/` que vigila `scripts/seguridad-api.test.ts`.
- `api/ranking.ts`: `GET` (a veces `UPDATE` de avatar y luego el ranking) y `POST` (lee el cuerpo, valida, `INSERT ... ON CONFLICT`, a veces `UPDATE` de avatar, ranking). Cuatro consultas, ninguna con etiqueta.
- `src/main.ts`: `rankingApi` ya convierte un 429 en `Error('ranking 429')`; el consumidor de la pantalla final está en el bloque de guardado de la carrera (cerca de las líneas 810 a 830) y el de la pantalla del ranking en `rankingScreen` (cerca de las líneas 159 a 170).
- Pruebas: `scripts/ranking.test.ts` (fetch falso propio; ~61 guardados sin cabecera de IP), `scripts/fixtures/servidor.ts` (`servidor()` reinicia los límites, controla `Date.now`, fabrica peticiones con una IP distinta cada una, expone `bd.consultas`) y `scripts/fixtures/neon-falso.ts` (lanza ante consultas sin etiqueta).

## Arquitectura en una vista
```
GET/POST /api/ranking
   │  1. limitar(clave por IP)  ──► 429 + retry-after            (nada de lo siguiente corre)
   │  2. (hoy) leer cuerpo, validar, consultas a Neon
   ▼
main.ts: rankingApi() lanza Error('ranking 429') ──► dos catch muestran el mensaje humano
```
No hay componentes nuevos: dos entradas en una tabla, dos llamadas a una función existente y dos ramas de manejo de error.

## Cambios por archivo

### `api/_limite.ts` (RF-01, RF-02, RF-03, RF-06)
Dos entradas nuevas en `LIMITES`, con nombre distinto de `rankingIp` (que es del ranking de Retos):
```ts
carreraGet: { max: 150, ms: MIN },    // GET /api/ranking por IP (un salón de 40 mirando el ranking, con margen)
carreraPost: { max: 150, ms: HORA },  // POST /api/ranking por IP (40 dispositivos x 3 carreras por hora = 120, más 25 % de margen)
```
Los números y su derivación están en `spec.md`, D1. Nada más cambia en el archivo.

### `api/ranking.ts` (RF-01 a RF-07, RF-10)
- Imports nuevos, con extensión `.js`: `import { ipDe, limitado } from './_http.js';` y `import { LIMITES, limitar } from './_limite.js';`.
- **Primera sentencia de `GET` y de `POST`**, antes de leer el cuerpo y antes de cualquier consulta (incluido el `UPDATE` de avatar del `GET`):
  ```ts
  const espera = limitar(`carrera-get-ip:${ipDe(req)}`, LIMITES.carreraGet);   // en POST: `carrera-post-ip:` y LIMITES.carreraPost
  if (espera) return limitado(espera);
  ```
  Los prefijos `carrera-get-ip:` y `carrera-post-ip:` no chocan con `ranking-ip:` (RF-03). Consecuencia buscada: los guardados que terminan en 400 también cuentan (RF-02, CA-06).
- La IP no se registra ni se devuelve: solo entra en la clave (RF-10). No se agrega `console` ni `registrar` (el rechazo no se registra; spec A09).
- Etiquetar las cuatro consultas con un comentario SQL al inicio, como hace `api/_bd.ts`: `/* rankingTop */` (el `WITH r AS ...`), `/* rankingAvatarGet */` (el `UPDATE` del `GET`), `/* rankingGuardar */` (el `INSERT`), `/* rankingAvatarPost */` (el `UPDATE` del `POST`). Es solo un comentario: el SQL no cambia. `scripts/ranking.test.ts` busca `INSERT INTO ranking` con una expresión sin ancla y lee `params[6]`, así que no se afecta.
- Extender en una línea el comentario `ponytail:` del archivo (o agregar uno junto al límite): el tope es por instancia y de mejor esfuerzo; el global es la regla del Firewall de Vercel; el puntaje no se valida (ya documentado).

### `scripts/fixtures/neon-falso.ts` (RF-04, solo pruebas)
Un caso nuevo antes del `default`, que responde vacío a las cuatro etiquetas (la prueba de este plan mide cuántas consultas llegan, no lo que devuelve la base):
```ts
case 'rankingTop': case 'rankingAvatarGet': case 'rankingGuardar': case 'rankingAvatarPost': return vacio();
```
`ranking.ts` entonces responde `[]` con 200. El esquema y el orden real del ranking se prueban en `db/ranking.test.sql`, no aquí. Riesgo: otras ramas también agregan casos a este archivo; el conflicto es trivial (cada una agrega su línea).

### `scripts/ranking-limite.test.ts` (nuevo; CA-01 a CA-07)
Usa `servidor()` (límites reiniciados, `reloj`, `peticion` con IP propia por petición, `bd.consultas`) e importa (con `await import`, después de llamar a `servidor()`, porque `api/ranking.ts` abre su conexión al cargarse y lee `DATABASE_URL`) `GET` y `POST` de `api/ranking` y `GET` de `api/retos-ranking`. Se corre con `npx tsx scripts/ranking-limite.test.ts` y guarda `const s = servidor()` una sola vez y termina con `s.restaurar()`.
- Auxiliares: `ver(ip, avatar?)` (GET con `x-player-id` y `x-player-avatar` válidos cuando se pide) y `guardar(ip, n)` (POST con identificador distinto por `n`, nombre `Prueba`, puntaje 120, titles 3, caps 12). Las peticiones se arman con `s.peticion(metodo, '/api/ranking', { ip, cabeceras, cuerpo })`.
- CA-01: 150 lecturas en `T0`, la 151 da 429 con `retry-after` 60; `reloj.avanzar(30_000)`, 429 con 30; `reloj.set(T0 + 60_000)`, 200.
- CA-02: igual con guardados y 3600; `reloj.set(T0 + 3_600_000)`.
- CA-03: IP B, guardado desde A tras agotar lecturas de A, lectura de A tras agotar guardados de A, y `GET` de `api/retos-ranking` desde A tras agotar lecturas de carrera de A (el ranking de Retos usa la base falsa con la etiqueta `rankingRetos`, que ya existe).
- CA-04: contar `s.bd.consultas.length` antes y después: lectura con avatar bajo el tope suma 2; rechazada suma 0; guardado válido bajo el tope suma al menos 1; rechazado suma 0.
- CA-05: encabezados y cuerpo crudo de ambos 429 (`Object.keys(cuerpo)` ordenado es `['error', 'mensaje']`; el texto no contiene `neon`, `sql`, `DATABASE`, la IP ni el identificador); `retry-after` es entero y está en rango.
- CA-06: 150 guardados con puntaje 5000 dan 400; el 151, válido, da 429.
- CA-07: 40 dispositivos desde la misma IP, 40 guardados y 120 lecturas en `T0`, luego 80 guardados más repartidos con `reloj.avanzar` dentro de la hora (120 en total): ningún 429.
- Salida final con una línea de resumen, como las demás pruebas.

### `scripts/ranking.test.ts` (RF-07; CA-06)
Importar `reiniciarLimites` de `../api/_limite` y llamarlo al inicio de `guardar()` y antes del `POST` suelto del bloque de nombres, para que ninguna afirmación dependa de cuántos guardados se hayan hecho antes. Las afirmaciones no cambian.

### `src/main.ts` (RF-08, RF-09; CA-08, CA-09, CA-11)
**Cambios mínimos, otras ramas editan este archivo.** Prohibido: reformatear, reordenar, renombrar, tocar `rankingApi` (ya lanza `Error('ranking 429')`), `footer()`, `DONATE_URL` o cualquier otro bloque. El diff se limita a dos lugares.

1. **Pantalla final** (bloque del guardado, `rankingApi({ name: fullName(), ... })`). Envolver la llamada en una función local sin reindentar las líneas de `.then` y `.catch`, y agregar una rama al principio del `.catch`:
   ```ts
   const guardar = (): void => { rankingApi({ ...mismos argumentos... })
     .then(...sin cambios...)
     .catch((e: Error) => {
       if (e.message === 'ranking 429') {
         rankBox.innerHTML = `<span class="eyebrow">Ranking global</span>
           <p>Hay mucha gente en el ranking y tu carrera todavía no se pudo guardar. Tu carta sigue lista. Probá de nuevo en un ratito.</p>
           <button class="btn secondary" id="retryRank">Reintentar</button>`;
         document.getElementById('retryRank')!.onclick = () => {
           rankBox.innerHTML = '<span class="eyebrow">Ranking global</span><p class="season-empty">Guardando tu carrera…</p>';
           guardar();
         };
         return;
       }
       ...resto del catch sin cambios...
     }); };
   guardar();
   ```
   El mensaje es texto fijo (sin datos de la red), por lo que no hay `esc` que aplicar. No se lee `retry-after` (D4 del spec; además `noUnusedLocals` prohíbe dejar una variable sin usar). Los textos exactos pueden afinarse si se mantienen los cuatro puntos de RF-08.
2. **Pantalla del ranking** (`rankingScreen`, el `catch` final): pasar de `catch {` a `catch (e) {` y elegir el texto:
   ```ts
   box.innerHTML = (e as Error).message === 'ranking 429'
     ? '<p class="season-empty">Hay mucha gente mirando el ranking. Probá de nuevo en un ratito.</p>'
     : '<p class="season-empty">No pudimos cargar el ranking. Probá de nuevo en un rato.</p>';
   ```
   (el segundo texto es el actual, sin cambios.)

## Cobertura
| Requisito | Dónde se cubre | Criterio |
|---|---|---|
| RF-01 | `LIMITES.carreraGet` y su llamada al inicio de `GET` en `api/ranking.ts` | CA-01, CA-07 |
| RF-02 | `LIMITES.carreraPost` y su llamada al inicio de `POST` | CA-02, CA-06, CA-07 |
| RF-03 | Nombres de entrada y prefijos de clave propios (`carrera-get-ip:`, `carrera-post-ip:`) | CA-03 |
| RF-04 | El límite es la primera sentencia de cada manejador, antes del cuerpo y de la base | CA-04 |
| RF-05 | Reuso de `limitado(espera)` de `api/_http.ts` (429, `retry-after`, `no-store`, `nosniff`, sin CORS, mensaje genérico) | CA-05 |
| RF-06 | Ventana fija de `limitar` | CA-01, CA-02 |
| RF-07 | El resto del manejador no cambia; etiquetas SQL solo comentan | CA-06 |
| RF-08 | Rama 429 del `.catch` de la pantalla final y función `guardar` | CA-08 |
| RF-09 | Rama 429 del `catch` de `rankingScreen` | CA-09 |
| RF-10 | La IP solo forma parte de la clave; sin `console`, sin SQL con IP, sin cambios en `db/` | CA-05, CA-10 |
| RF-11 | Los números de D1 (150 y 150) frente a 40 dispositivos | CA-07 |
| Seguridad / alcance | Sin dependencias; `seguridad-api.test.ts` verde | CA-10, CA-11 |

Sobra diseño: nada. No hay caché, ráfaga, segunda ventana, almacén compartido ni cabecera de límites restantes porque ningún requisito los pide.

## Estrategia de pruebas
- Automática, sin red ni base real: `scripts/ranking-limite.test.ts` (CA-01 a CA-07) con `servidor()` y la base falsa; `scripts/ranking.test.ts` sigue verificando validación y nombres con su `fetch` falso.
- Regresión: `npm run build` (incluye `tsc --noEmit` sobre `src`, `scripts` y `api`) y todas las `npx tsx scripts/<archivo>.test.ts`, en especial `retos-ranking`, `sala`, `perfil`, `ably`, `ranking`, `seguridad-api`.
- Navegador (CA-08, CA-09): `npm run dev`; el servidor de desarrollo de Vite no sirve `/api`, así que las respuestas se simulan con la intercepción de red de Playwright (`page.route('**/api/ranking', ...)`): 429 con `retry-after: 60` y cuerpo `{"error":"limite","mensaje":"..."}` para el guardado y para la lectura; después 200 con una fila `{pos, name, score, titles, caps, avatar, card, me: true}` para el reintento. 360 x 640 y 1280 x 800, tema claro y oscuro.

## Riesgos
1. **Falso positivo por IP compartida mayor que 40** (colegio grande, CGNAT de operadores móviles): el jugador ve el mensaje y puede reintentar (RF-08). Mitigación: números con margen (D1) en una tabla de una línea; sube sin tocar el diseño.
2. **Mejor esfuerzo**: conteo por instancia; ver spec, A04, riesgos 1 y 2. No se promete protección del Top 50 ni de las horas de Neon.
3. **Merge en `src/main.ts`**: el diff cae en dos bloques ya existentes y sin reindentar el resto; si otra rama movió esos bloques, se reaplica a mano a partir de las dos descripciones de arriba.
4. **La etiqueta SQL** cambia el texto de la consulta que ve Neon; solo es un comentario y se prueba con `scripts/ranking.test.ts`. No se puede probar contra la base real sin una instancia de prueba, y esta feature no la usa.
5. **`ipDe` devuelve `'desconocida'` sin cabecera**: todos comparten un contador. En Vercel la cabecera siempre existe.

## Archivos que toca la implementación
`api/_limite.ts`, `api/ranking.ts`, `scripts/fixtures/neon-falso.ts`, `scripts/ranking-limite.test.ts` (nuevo), `scripts/ranking.test.ts`, `src/main.ts` (dos bloques). Nada en `db/`, `package.json`, `package-lock.json`, `privacidad.html`, `terminos.html` ni `specs/backlog.md`.
