# Tareas: contador anónimo de carreras

Deriva de `plan.md`. Trabajar en el worktree `.claude/worktrees/contador-carreras` (rama `claude/contador-carreras`). Cero dependencias nuevas.

**Prohibido para el implementador**: aplicar `db/contador-carreras.sql` a Neon, usar `DATABASE_URL` de producción en cualquier prueba, o tocar `specs/backlog.md`. La migración la aplica el orquestador al integrar, con el visto bueno del usuario, antes del despliegue (T-13).

| ID | Entregable | Depende de | Cubre |
|----|------------|------------|-------|
| T-01 | **Arrancar**: `npm ci` en el worktree (instala exactamente el lock; `package.json` y `package-lock.json` no deben cambiar) y `npx tsc --noEmit` limpio como línea base. | — | RF-15 |
| T-02 | `db/contador-carreras.sql`: tabla `carreras_dia` (`dia date PRIMARY KEY`, `iniciadas`, `terminadas` con `DEFAULT 0` y `CHECK >= 0`), `IF NOT EXISTS`, cabecera con el comando de aplicación, tabs. | — | RF-06, RF-13 |
| T-03 | `db/contador-carreras.test.sql`: transacción con tabla temporal y la misma sentencia de T-05; afirma (1,0) → (1,1), corte de día entre 05:59:59 y 06:00:00 UTC, columnas exactas `{dia, iniciadas, terminadas}`, `CHECK` contra negativos; imprime `OK`; `ROLLBACK`. Solo se corre contra una base desechable (T-12). | T-02 | RF-06, RF-07, RF-08 |
| T-04 | `api/_limite.ts`: `carrerasIp: { max: 60, ms: HORA }` en `LIMITES`, con comentario. | — | RF-10 |
| T-05 | `api/_bd.ts`: `contarCarrera(evento: 'iniciada' \| 'terminada', ahora: number): Promise<void>` con la consulta etiquetada `/* contarCarrera */` del plan. Sin tocar el resto del archivo. | — | RF-06, RF-07, RF-08 |
| T-06 | `scripts/fixtures/neon-falso.ts`: `carrerasDia`, `case 'contarCarrera'` (día = `ahora` − 6 h en ISO, suma según `p[1]`) y vaciado en `limpiar()`. | T-05 | RF-08 |
| T-07 | `api/carreras.ts`: `export async function POST` con el orden del plan (tope → `content-type` → `leerJson` y validación de una sola clave → `contarCarrera(…, Date.now())` → 204 → `try/catch` con `registrar('carreras', e)` y `fallo('error')`). Imports relativos con extensión `.js` (`./_bd.js`, etc.; lo exige `seguridad-api.test.ts`). Solo `POST`; sin `neon(`, sin `console.`, sin `fetch`. | T-04, T-05 | RF-05, RF-07, RF-09, RF-10, RF-12, RF-15, RF-16 |
| T-08 | `src/contador-carreras.ts`: `contarCarrera(evento)` fire-and-forget, `keepalive`, `credentials: 'omit'`, `catch` vacío y `try/catch` síncrono, sin reintentos ni almacenamiento. | — | RF-04, RF-05, RF-11 |
| T-09 | `src/main.ts`, 3 líneas y nada más: el `import` al final del bloque de imports, `contarCarrera('iniciada');` justo después de `career = new Career(setup);`, y `contarCarrera('terminada');` como primera línea de `finish()`. Sin reformatear ni mover código (otras ramas tocan el archivo). Comprobar con `git diff --stat src/main.ts`: 3 líneas agregadas, 0 quitadas. | T-08 | RF-01, RF-02, RF-03, RF-04 |
| T-10 | `privacidad.html`: sección "Contador de carreras" antes de "Anuncios" y la fecha de última actualización del día del cambio, con el contenido del plan. Solo esas dos zonas. | — | RF-14 |
| T-11 | `scripts/contador-carreras.test.ts`: servidor (CA-1, 7, 8, 9, 10, 11, 13), cliente (CA-5, 6, 12), estática de `main.ts` y `api/carreras.ts`, y `privacidad.html` (CA-15), según "Pruebas" del plan. Usa `servidor()` de `scripts/fixtures/servidor.ts`. | T-06, T-07, T-08, T-09, T-10 | RF-01 a RF-14, RF-16 |
| T-12 | **Verificar**: `npx tsx scripts/contador-carreras.test.ts`; las pruebas existentes que comparten el Neon falso y el arnés (`perfil`, `sala`, `ably`, `retos-ranking`, `ranking`, `seguridad-api`); `npm run build` y `npm run build:preview`; `git diff -- package.json package-lock.json` vacío (CA-16). A mano: `npm run dev`, crear un jugador y llegar a la final (o simular) y ver en la pestaña de red exactamente 2 peticiones a `/api/carreras` y ninguna al recorrer portada, ranking, Retos y perfil (CA-3, CA-5); con la red cortada, sin textos nuevos. `db/contador-carreras.test.sql` solo si hay una base local desechable o una rama de Neon que el usuario indique; si no, queda anotado como no ejecutado. | T-01 a T-11 | RF-01 a RF-16 |
| T-13 | **Integración (orquestador y usuario, no el implementador)**: con el visto bueno del usuario, aplicar `db/contador-carreras.sql` a Neon antes del despliegue; correr `db/contador-carreras.test.sql` en una rama de Neon; desplegar; enviar 2 avisos de prueba, comprobar la fila del día y anotar o borrar esas cuentas; configurar la alerta de Neon al 70 % si no existe; revisar conflictos en `src/main.ts` y `privacidad.html` con las otras ramas. | T-12 | RF-13 |

## Trazabilidad
- RF-01: T-09, T-11 · RF-02: T-09, T-11 · RF-03: T-09, T-11 · RF-04: T-08, T-09 · RF-05: T-07, T-08 · RF-06: T-02, T-03, T-05 · RF-07: T-03, T-05, T-07 · RF-08: T-03, T-05, T-06 · RF-09: T-07 · RF-10: T-04, T-07 · RF-11: T-08 · RF-12: T-07 · RF-13: T-02, T-13 · RF-14: T-10 · RF-15: T-01, T-07 · RF-16: T-07.
- Sin tarea huérfana: T-11 y T-12 verifican; T-13 cierra RF-13 en producción.

## Archivos que toca la implementación
Nuevos: `db/contador-carreras.sql`, `db/contador-carreras.test.sql`, `api/carreras.ts`, `src/contador-carreras.ts`, `scripts/contador-carreras.test.ts`.
Modificados: `api/_bd.ts`, `api/_limite.ts`, `scripts/fixtures/neon-falso.ts`, `src/main.ts` (3 líneas), `privacidad.html` (sección y fecha).
