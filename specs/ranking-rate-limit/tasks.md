# Tareas: tope de uso en el ranking de carreras

Un solo implementador, en el worktree `chamusqueros/.claude/worktrees/ranking-rate-limit` (rama `claude/ranking-rate-limit`). Las pruebas se corren con `npx tsx scripts/<archivo>.ts`. Otras ramas editan `src/main.ts` en paralelo: T5 es el único que lo toca, con el diff mínimo del plan. No se toca `specs/backlog.md`. Sin dependencias nuevas.

- [x] T0 **Preparar y fijar la línea base.** El worktree no trae `node_modules`: correr `npm ci` primero. Luego `npm run build` y todas las `npx tsx scripts/*.test.ts` (en especial `ranking`, `retos-ranking`, `sala`, `perfil`, `ably`, `seguridad-api`) en verde **antes** de cambiar nada; si algo falla de entrada, anotarlo y no culpar a la feature. Sin dependencias. (Alcance, CA-11)
- [x] T1 `api/_limite.ts` y `api/ranking.ts`. En `LIMITES`: `carreraGet: { max: 150, ms: MIN }` y `carreraPost: { max: 150, ms: HORA }` (no reutilizar `rankingIp`). En `ranking.ts`: imports `ipDe`/`limitado` de `./_http.js` y `LIMITES`/`limitar` de `./_limite.js`; el límite como **primera sentencia** de `GET` (clave `carrera-get-ip:${ipDe(req)}`) y de `POST` (`carrera-post-ip:${ipDe(req)}`), con `if (espera) return limitado(espera);`; etiquetas `/* rankingTop */`, `/* rankingAvatarGet */`, `/* rankingGuardar */`, `/* rankingAvatarPost */` al inicio de las cuatro consultas; el comentario `ponytail:` de mejor esfuerzo. Ni `console` ni IP en nada que no sea la clave. Sin dependencias. (RF-01 a RF-07, RF-10; CA-10)
- [x] T2 `scripts/fixtures/neon-falso.ts`: un `case` antes del `default` para las cuatro etiquetas nuevas, que responde `vacio()`. Una línea; no tocar nada más del archivo. Depende de T1 (las etiquetas). (RF-04)
- [x] T3 `scripts/ranking-limite.test.ts` (nuevo): CA-01 a CA-07 con `servidor()`, `reloj`, una IP por petición, `bd.consultas`, y los imports dinámicos tras `servidor()`; guarda `const s = servidor()` una sola vez y termina con `s.restaurar()` y una línea de resumen. Verificar que **falla** si se quita el límite de `GET` o de `POST` (por ejemplo, comentando la línea) y que pasa con el código de T1. Depende de T1 y T2. (RF-01 a RF-07, RF-11; CA-01 a CA-07)
- [x] T4 `scripts/ranking.test.ts`: importar `reiniciarLimites` de `../api/_limite` y llamarlo al inicio de `guardar()` y antes del `POST` suelto de los nombres; sin cambiar ninguna afirmación. Depende de T1. (RF-07; CA-06)
- [x] T5 `src/main.ts`, **solo** dos bloques (ver "`src/main.ts`" del plan): (a) pantalla final: función local `guardar` alrededor de la llamada `rankingApi({...})` sin reindentar `.then` ni `.catch`, rama `e.message === 'ranking 429'` con el mensaje, el botón "Reintentar" (`id="retryRank"`) y la llamada inicial `guardar()`; (b) `rankingScreen`: `catch (e)` con el texto de 429 y el actual para lo demás. No tocar `rankingApi`. Textos en voseo guatemalteco, sin "429", "error" ni "servidor", sin modal. Revisar `git diff src/main.ts`: solo esos dos bloques, sin cambios de formato. Depende de T0. (RF-08, RF-09; CA-11)
- [x] T6 **Verificación en navegador** (CA-08, CA-09): `npm run dev`, intercepción de `/api/ranking` con Playwright como indica el plan (429 con `retry-after`, luego 200), a 360 x 640 y 1280 x 800 en tema claro y oscuro; terminar una carrera (o usar la vista de carrera más corta disponible) y comprobar mensaje, "Reintentar" que funciona, carta, "Compartir" y descarga intactos, ausencia de modal y de desplazamiento horizontal; y la pantalla del ranking con 429 y "Volver". Reportar qué se vio. Depende de T5. (RF-08, RF-09; CA-08, CA-09)
- [x] T7 **Cierre.** `npm run build`; todas las `npx tsx scripts/*.test.ts` (incluidas `ranking-limite`, `ranking`, `retos-ranking`, `seguridad-api`); `git diff --stat origin/main` solo con `api/_limite.ts`, `api/ranking.ts`, `scripts/fixtures/neon-falso.ts`, `scripts/ranking-limite.test.ts`, `scripts/ranking.test.ts`, `src/main.ts` y `specs/ranking-rate-limit/`; `package.json`, `package-lock.json`, `db/`, `privacidad.html`, `terminos.html` y `specs/backlog.md` sin cambios; `git diff origin/main -- api/ranking.ts | grep -E '^\+.*(console|registrar)'` sin resultados; revisión OWASP de la sección Seguridad del spec (A04 central) sobre el diff; marcar las casillas de este archivo. Depende de T1 a T6. (CA-10, CA-11)

## Trazabilidad
| RF | Tareas |
|---|---|
| RF-01, RF-02, RF-03, RF-06 | T1, T3 |
| RF-04 | T1, T2, T3 |
| RF-05 | T1, T3 |
| RF-07 | T1, T3, T4 |
| RF-08, RF-09 | T5, T6 |
| RF-10 | T1, T7 |
| RF-11 | T3 |

Toda tarea cita al menos un RF o un criterio de alcance (T0, T7); ningún RF queda sin tarea.
