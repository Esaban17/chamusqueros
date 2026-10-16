# Plan: contador anónimo de carreras

Deriva de `spec.md` de esta carpeta. Cada `RF-nn` está cubierto en "Cobertura". Nada de lo que sigue lo pide ningún requisito de más.

## Lo que se leyó antes de diseñar
- `api/_limite.ts`: ventana fija en memoria por clave; `LIMITES` y `limitar()`; `HORA` exportado.
- `api/_http.ts`: `responder`, `fallo`, `limitado`, `ipDe`, `leerJson` (tope 2 KB, objeto o null), `registrar`. El código de error `entrada_invalida` ya existe.
- `api/_bd.ts`: acceso a Neon con plantillas etiquetadas `/* nombre */`, reloj como parámetro (ms). El Neon falso reconoce las consultas por esa etiqueta.
- `api/ranking.ts` (único `neon()` aparte de `_bd.ts` y `en-vivo.ts`): se llama en `finish()` justo cuando termina la carrera.
- `scripts/fixtures/neon-falso.ts` y `servidor.ts`: base en memoria detrás de `fetch`, reloj controlado, `peticion()` con IP distinta por defecto.
- `scripts/seguridad-api.test.ts`: exige que `console.` solo esté en `registrar()`, que ningún archivo de `api/` salvo `_bd.ts`, `ranking.ts` y `en-vivo.ts` llame a `neon(`, que toda consulta de `_bd.ts` lleve etiqueta, y que no haya dependencias nuevas. El endpoint nuevo cumple todo sin tocar esa prueba.
- `src/main.ts`: un único `new Career(setup)` (envío del formulario de creación, `createForm`) y un único `finish()`, al que llegan los dos caminos de "Ver mi carrera".
- `db/ranking.sql` y `db/ranking.test.sql`: patrón de migración (comentario con el comando, tabs, `IF NOT EXISTS`) y de prueba (transacción, tabla temporal con el mismo nombre, `ASSERT`, `ROLLBACK`).

## Nombres
- Tabla: `carreras_dia`.
- Endpoint: `POST /api/carreras` (archivo `api/carreras.ts`).
- Migración: `db/contador-carreras.sql` y `db/contador-carreras.test.sql`.
- Módulo del cliente: `src/contador-carreras.ts`, función `contarCarrera(evento)`.

## Arquitectura mínima
Navegador (`contarCarrera`) → `POST /api/carreras` → `contarCarrera` en `api/_bd.ts` → un `INSERT ... ON CONFLICT DO UPDATE` sobre `carreras_dia`. Sin lectura, sin caché, sin cola.

### Modelo de datos (`db/contador-carreras.sql`)
```
CREATE TABLE IF NOT EXISTS carreras_dia (
	dia date PRIMARY KEY,
	iniciadas int NOT NULL DEFAULT 0 CHECK (iniciadas >= 0),
	terminadas int NOT NULL DEFAULT 0 CHECK (terminadas >= 0)
);
```
Tres columnas, ninguna identifica a nadie. Idempotente. Retroceso (manual, solo si se retira la feature): `DROP TABLE carreras_dia;`. Comentario de cabecera con el comando de aplicación, como en `db/ranking.sql`: `psql "$DATABASE_URL_UNPOOLED" -f db/contador-carreras.sql`.

### Consulta (`api/_bd.ts`, función `contarCarrera(evento, ahora)`)
```
/* contarCarrera */
INSERT INTO carreras_dia (dia, iniciadas, terminadas)
VALUES ((to_timestamp(${ahora}::double precision / 1000) AT TIME ZONE 'America/Guatemala')::date,
        (${evento}::text = 'iniciada')::int, (${evento}::text = 'terminada')::int)
ON CONFLICT (dia) DO UPDATE
	SET iniciadas = carreras_dia.iniciadas + EXCLUDED.iniciadas, terminadas = carreras_dia.terminadas + EXCLUDED.terminadas
```
Una sentencia: la suma es atómica (RF-08). El día sale del reloj del servidor (RF-07). Parámetros en orden de aparición: `[ahora, evento, evento]`. Tipo del parámetro `evento`: `'iniciada' | 'terminada'`. Copia en `db/contador-carreras.test.sql`; el comentario de cabecera de `_bd.ts` ya pide mantener esas copias.

### Endpoint (`api/carreras.ts`, solo `export async function POST`)
Orden fijo, de lo más barato a lo más caro:
1. `limitar(`carreras-ip:${ipDe(req)}`, LIMITES.carrerasIp)`; si pasa del tope, `limitado(espera)` (429 con `retry-after`) — RF-10. Va antes de leer el cuerpo, así lo malformado también cuenta contra el tope.
2. `content-type` debe empezar con `application/json`; si no, `fallo('entrada_invalida')` — RF-09 (cierra el envío desde formularios de otros sitios).
3. `leerJson(req)`: máximo 2 KB y objeto; una sola clave, `evento`, con valor exactamente `iniciada` o `terminada`; si no, `fallo('entrada_invalida')` — RF-09, RF-07.
4. `contarCarrera(evento, Date.now())`.
5. Éxito: `new Response(null, { status: 204, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } })`.
6. Todo dentro de `try/catch`: `registrar('carreras', e)` y `fallo('error')` (500 genérico) — RF-12.

Los imports relativos de `api/carreras.ts` llevan extensión `.js` (`./_bd.js`, `./_http.js`, `./_limite.js`): `scripts/seguridad-api.test.ts` lo exige (Node ESM en Vercel).

Sin export `GET`: Vercel responde 405 a lo demás (RF-16). No lee `x-player-id` ni ninguna cabecera de identidad (RF-05). No hay llamadas salientes (RF-15).

### Tope (`api/_limite.ts`)
Una línea en `LIMITES`: `carrerasIp: { max: 60, ms: HORA }` con comentario "2 avisos por carrera; cabe un aula". Mismo mecanismo de mejor esfuerzo (por instancia) que el resto; el tope global es la regla de Rate Limiting del Firewall de Vercel (`ponytail` ya documentado en el archivo).

### Cliente (`src/contador-carreras.ts`)
```ts
export function contarCarrera(evento: 'iniciada' | 'terminada'): void
```
`fetch('/api/carreras', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ evento }), keepalive: true, credentials: 'omit' })` sin `await`, con `.catch(() => {})` y todo en un `try/catch` por si `fetch` lanza de forma síncrona. Sin reintentos (RF-04), sin cabeceras del juego, sin localStorage (RF-05), sin mensajes (RF-11). `keepalive` evita perder "terminada" si el jugador cierra la pestaña justo al llegar al final. En `npm run dev` y en `build:preview` no hay `/api`: la petición falla en silencio.

### `src/main.ts` (cambios mínimos, otras ramas lo tocan)
Tres líneas, sin reformatear ni mover nada:
1. `import { contarCarrera } from './contador-carreras';` junto a los demás imports (al final del bloque, para no chocar con líneas que otras ramas agreguen en medio).
2. En el manejador del formulario, justo después de `career = new Career(setup);`: `contarCarrera('iniciada');` — RF-01.
3. Primera línea del cuerpo de `function finish() {`: `contarCarrera('terminada');` — RF-02.
Retomar una carrera guardada (`continuar-carrera`, después) no pasa por `new Career(setup)` desde el formulario, así que no cuenta (RF-03); esa feature deberá conservar esa propiedad.

### `privacidad.html` (RF-14)
Una sección nueva "Contador de carreras", antes de "Anuncios", en el mismo tono (voseo) y estructura que "Retos Fútbol". Contenido: cuándo se envía (al crear un jugador y al llegar al final de su carrera); qué contiene (una palabra, "iniciada" o "terminada"); para qué (saber cuántas carreras se empiezan y cuántas se terminan, para decidir qué mejorar); qué se guarda (dos números por día, sin identificador anónimo, sin nombre, sin IP, sin nada de tu jugador); el límite de uso por IP en memoria temporal que se pierde al reiniciar; que Vercel y Neon pueden guardar registros técnicos como la IP; que no hay nada que borrar por jugador. Y poner en la línea "Última actualización" la fecha del día del cambio (hoy, 15 de octubre de 2026, si se hace hoy). Cambio acotado a esas dos zonas por si otra rama toca el mismo archivo. `terminos.html` no cambia (ya prohíbe los envíos automáticos abusivos).

### Pruebas
- `scripts/fixtures/neon-falso.ts`: `bd.carrerasDia: Map<string, { iniciadas: number; terminadas: number }>` (se vacía en `limpiar()`) y `case 'contarCarrera'` que calcula el día como `new Date(ahora - 6 * 3600_000).toISOString().slice(0, 10)` (Guatemala es UTC−6 fijo) y suma según `p[1]`. Mismo comentario del archivo: si la consulta cambia en `_bd.ts`, cambiarla aquí.
- `scripts/contador-carreras.test.ts` (`npx tsx scripts/contador-carreras.test.ts`), con `servidor()` de `scripts/fixtures/servidor.ts`:
  - Servidor: CA-1 (parte servidor), CA-7, CA-8, CA-9, CA-10, CA-11, CA-13. El 204, la tabla con (n, m) y los parámetros enviados (`[ahora, evento, evento]`, sin IP).
  - Cliente (con `fetch` falso): CA-5 (1 petición por llamada, 1 sola si falla), CA-6 (cuerpo exacto, sin cabeceras del juego), CA-12 (rechazo, 500, 429 y un `fetch` que lanza síncrono: no propaga ni deja `unhandledrejection`; `contarCarrera` devuelve `undefined` sin esperar).
  - Estática sobre `src/main.ts` (CA-1, CA-2, CA-3): hay exactamente un `contarCarrera('iniciada')`, ubicado después de `new Career(` y antes de `debut();`; exactamente un `contarCarrera('terminada')`, dentro de `function finish()`; ningún otro `contarCarrera(`.
  - Estática sobre `api/carreras.ts`: solo exporta `POST`; llama a `limitar` antes de `leerJson`; no lee `x-player-id`, `x-forwarded-for` salvo vía `ipDe`, ni `authorization`.
  - `privacidad.html` (CA-15): contiene "Contador de carreras", una fecha de actualización igual a la del día de la prueba y las menciones pedidas.
- `db/contador-carreras.test.sql`: transacción con tabla temporal `carreras_dia` que tapa la real (patrón de `db/retos-en-linea.test.sql`) y una función temporal con la misma sentencia. Afirma: primer aviso crea (1, 0); segundo "terminada" del mismo día deja (1, 1); 05:59:59 UTC y 06:00:00 UTC caen en días distintos (CA-8); `information_schema.columns` de la tabla real es exactamente `{dia, iniciadas, terminadas}` (CA-7); un valor negativo viola el `CHECK`; imprime `OK`; `ROLLBACK`. Se corre solo contra una rama de Neon o una base local desechable, nunca contra la de producción (ver Tasks).
- No se agrega script en `package.json`: las pruebas del repo se corren con `npx tsx`.

### Orden de despliegue
1. Aplicar `db/contador-carreras.sql` a Neon (lo hace el orquestador con el visto bueno del usuario; el implementador no).
2. Desplegar. Si el orden se invierte, el endpoint responde 500 genérico y el juego no se entera (RF-11, RF-13).
3. Verificar con dos avisos de prueba y revisar la tabla (el dato de prueba del creador se anota o se borra).

### Cómo leer el dato
En la consola de Neon (SQL Editor):
`SELECT sum(iniciadas) AS iniciadas, sum(terminadas) AS terminadas, round(100.0 * sum(terminadas) / nullif(sum(iniciadas), 0), 1) AS pct FROM carreras_dia WHERE dia >= current_date - 30;`

## Stack
Lo que el repo ya usa: Vercel Functions, `@neondatabase/serverless` vía `api/_bd.ts`, `api/_limite.ts`, `api/_http.ts`, `tsx` para pruebas. Sin desviaciones ni dependencias nuevas (RF-15). Funciones de Vercel Hobby: hoy 7 en `api/` (`ably-token`, `en-vivo`, `futbolista`, `perfil`, `ranking`, `retos-ranking`, `sala`); con esta, 8 de las 12 que permite Hobby. Si otra rama agrega más, revisar el total al integrar.

## Seguridad (OWASP Top 10 2021), cómo se cumple
| Riesgo | Medida | RF |
|---|---|---|
| A01 | Endpoint solo de escritura, sin `GET`, sin tabla pública | RF-16 |
| A02 | Sin secretos ni cookies; la IP vive solo en memoria; tabla de 3 columnas | RF-05, RF-06 |
| A03 | Lista cerrada de 2 valores, consulta parametrizada, sin fecha del cliente | RF-07, RF-09 |
| A04 | Tope de 60/h por IP antes de leer el cuerpo; cuerpo de 2 KB; riesgo de inflado con muchas IP aceptado | RF-09, RF-10 |
| A05 | Sin CORS, `content-type` JSON obligatorio, `nosniff`, `no-store`, errores genéricos | RF-09, RF-12 |
| A06 | Cero dependencias | RF-15 |
| A07 | No aplica (anónimo por diseño) | — |
| A08 | Sin scripts de terceros; migración revisada y aplicada a mano | RF-13, RF-15 |
| A09 | `registrar()` sin cuerpos ni cabeceras; el 429 queda en los registros de Vercel | RF-12 |
| A10 | Sin llamadas salientes nuevas | RF-15 |

## Riesgos
1. **CU-h de Neon** (el límite más cercano): cada "iniciada" puede despertar la base. Rango en `spec.md` ("Costo declarado"). Mitigación: alerta de Neon al 70 %; si molesta, revertir. Fuera de este plan: guardar en memoria y escribir por lotes exigiría estado entre peticiones, que Vercel no ofrece.
2. **Inflado**: tope por instancia, no global. Una IP puede sumar hasta 60 por hora por instancia caliente. Mitigación: regla de Firewall del backlog; el umbral de decisión (100 iniciadas y 60 %) se lee con criterio, no a ciegas.
3. **Datos ruidosos**: el día del despliegue, las pruebas del creador y los bloqueadores de anuncios. Anotado en `spec.md`.
4. **Conflictos de integración en `src/main.ts` y `privacidad.html`**: por eso son 3 líneas y 2 zonas. Si hay conflicto, se resuelve conservando ambas partes.
5. **Despliegue antes que la tabla**: sin daño para el jugador (RF-11); se pierden los avisos hasta aplicar la migración.

## Cobertura (RF → plan)
| RF | Dónde |
|---|---|
| RF-01 | `main.ts`, llamada tras `new Career(setup)` |
| RF-02 | `main.ts`, primera línea de `finish()` |
| RF-03 | Solo dos llamadas en `main.ts`; prueba estática |
| RF-04 | Cliente sin reintentos ni sondeo; `main.ts` |
| RF-05 | Cliente (`src/contador-carreras.ts`) y endpoint sin cabeceras de identidad |
| RF-06 | `db/contador-carreras.sql` (3 columnas); consulta sin IP; endpoint |
| RF-07 | `contarCarrera` en `_bd.ts` (hora del servidor, zona de Guatemala); validación de una sola clave |
| RF-08 | Sentencia única `INSERT ... ON CONFLICT DO UPDATE` |
| RF-09 | `api/carreras.ts` pasos 2 y 3 |
| RF-10 | `LIMITES.carrerasIp` y paso 1 del endpoint |
| RF-11 | Cliente: sin `await`, `catch` vacío, sin UI |
| RF-12 | `api/carreras.ts` paso 6 y `registrar` |
| RF-13 | `db/contador-carreras.sql` idempotente; orden de despliegue |
| RF-14 | `privacidad.html` |
| RF-15 | Sin cambios en `package.json`; sin `fetch` saliente en el servidor |
| RF-16 | Sin export `GET`; consulta manual en Neon |
