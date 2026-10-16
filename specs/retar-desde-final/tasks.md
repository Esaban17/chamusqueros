# Tareas: retar desde la pantalla final

Deriva de `plan.md`. Un solo implementador, en el worktree `/Users/esaban/Desktop/Proyectos Personales/PROJECTS/LigaGT/chamusqueros/.claude/worktrees/retar-desde-final` (rama `claude/retar-desde-final`). Las pruebas se corren con `npx tsx scripts/<archivo>.ts`. Cero dependencias nuevas. Otras ramas editan `src/main.ts` y `finish()` en paralelo (`continuar-carrera`): cambios mínimos, sin reformatear ni mover código.

**Prohibido para el implementador**: crear salas reales en producción para probar (ni con `vercel dev` ni con una vista previa de Vercel: pueden compartir la base de datos de producción); usar `DATABASE_URL` o `ABLY_API_KEY` de producción en cualquier prueba; tocar `api/`, `db/`, `package.json`, `package-lock.json`, `privacidad.html`, `terminos.html`, `src/style.css`, `src/retos/retos.css` o `specs/backlog.md`; cambiar el sondeo (`REFRESCO_MS`, `SONDEO_MS`) o los topes de `api/_limite.ts`.

| ID | Entregable | Depende de | Cubre |
| --- | --- | --- | --- |
| T0 | **Preparar y fijar la línea base.** El worktree no trae `node_modules`: correr `npm ci` primero (no `npm install`: el `package-lock.json` no debe cambiar). Luego `npm run build` (anotar el tamaño comprimido del paquete principal, para CA-12) y las pruebas `retos`, `online-cliente`, `compartir`, `sala`, `perfil`, `seguridad-api`, `contador-carreras`, `ranking-limite` y `headers` en verde **antes** de cambiar nada. Anotar cuántas veces aparece `donateLink(` en `src/main.ts`. Si algo falla de entrada, anotarlo y no culpar a la feature. | — | CA-12, CA-14 |
| T1 | **`scripts/retar-desde-final.test.ts` primero (debe fallar).** Los tres bloques del plan: servidor con `servidor()` (costo: `bd.consultas` y `ably.llamadas` de CA-3, CA-5, CA-6; guardia de `LIMITES.crearIp` = 10 por hora y `SALAS_POR_HORA` = 5), cliente con `fetch` y `localStorage` simulados (CA-3 a CA-8 sobre `crearDesdeFinal`) y estático (CA-2, CA-10, CA-12, CA-13 sobre `src/main.ts`, `src/retos/index.ts` y `src/retos/online/desde-final.ts`). Los imports de `api/` van después de `servidor()`, como en `ranking-limite.test.ts`, y la prueba termina con `s.restaurar()` y una línea de resumen. Fijar en la prueba el número de `donateLink(` anotado en T0. | T0 | RF-02 a RF-12, RF-15; CA-2 a CA-8, CA-10, CA-12, CA-13 |
| T2 | **`src/retos/online/desde-final.ts` (nuevo)** con `Intento`, `AVISOS` y `crearDesdeFinal(): Promise<Intento>` sin parámetros, como en el plan. Usa solo `crearSala`, `infoEnLinea`, `tokenGuardado` y `ErrorCliente` de `./cliente` y el tipo `RespuestaSala` de `./protocolo`. Sin `innerHTML`, sin almacenamiento, sin `console.`, sin nombrar nada de la carrera. Los avisos, textuales de la spec (RF-07). | T1 | RF-04 a RF-07, RF-09, RF-11; CA-3 a CA-7, CA-10 |
| T3 | **`src/retos/index.ts`**: `import type { RespuestaSala }`, el tipo `Destino` ampliado con `{ creada: RespuestaSala }` y `'retar'`, y las dos ramas nuevas **antes** de la rama genérica de `destino.sala`, como en el plan. Ni una línea más; sin reformatear. `npx tsc --noEmit` limpio. | T1 | RF-04, RF-05, RF-06, RF-14; CA-3, CA-4, CA-9 |
| T4 | **`src/main.ts`**, los cinco retoques del plan y nada más: constante `RETAR_DESDE_FINAL`, `import type`, tipo `DestinoRetos`, la línea del bloque `#retarBox` justo después de `#rankBox`, el cableado antes de `document.getElementById('again')!.onclick = createForm;` (con la condición del interruptor) y la función `retarDesdeFinal` después del cierre de `finish()`. Revisar `git diff src/main.ts`: a lo sumo 40 líneas agregadas y 1 quitada (la del tipo); sin tocar `contarCarrera('terminada')`, `guardar`, `#again`, el bloque de donación ni `footer()`. | T2, T3 | RF-01, RF-02, RF-03, RF-08, RF-12, RF-13, RF-14, RF-15; CA-1, CA-2, CA-8, CA-9, CA-12, CA-13 |
| T5 | **Verificar contra la spec** (no contra la intención): `npx tsx scripts/retar-desde-final.test.ts` en verde (si T1 no falló antes de T2 a T4, la prueba no mide nada: revisar). Comprobar que la prueba **falla** si se quita `disabled` antes del `await`, si `crearDesdeFinal` pasa a recibir un parámetro, si se importa `desde-final` de forma estática en `main.ts` y si se mueve el bloque después de `#again`. | T2, T3, T4 | CA-2 a CA-8, CA-10, CA-12, CA-13 |
| T6 | **Verificación en navegador** con `/api/` simulado (receta del plan; sin salas reales), a 360 × 640 y 1280 × 800, tema claro y oscuro. Llegar a la final con la carrera más corta posible y comprobar: **CA-1** (60 s de espera: ninguna petición que la rama base no haga ya, descontando el ruido conocido de `/api/en-vivo`; 0 WebSocket; 0 descargas de Retos); **CA-2** (orden de bloques en el HTML; donación contigua a "Jugar otra carrera"); **CA-3** (con perfil: 1 `POST`, lobby con el enlace del servidor, y luego 1 token y 1 lectura); **CA-4** (sin perfil: 1 `GET`, apodo vacío con una carrera llamada "Marco Pérez", `PUT` y `POST` sin "Marco" ni "Pérez" en el cuerpo, "Atrás" a la entrada de Retos); **CA-5** (`enLinea:false` y `503`: aviso exacto, final intacta, `#share` y `#download` funcionan, segundo clic = 0 peticiones); **CA-6** (`429`); **CA-7** (red abortada: aviso, botón activo con foco; `500`); **CA-8** (doble clic: 1 petición); **CA-9** (barra de direcciones sin `sala=`; 0 llamadas a `navigator.share`, portapapeles y `window.open` antes del clic del anfitrión; Compartir y Copiar entregan el enlace del servidor; "Salir" va al Home y no repite `/api/carreras` ni `/api/ranking`); **CA-11** (sin desplazamiento horizontal, botón de 48 px o más, `role="status"`, orden de Tab); **CA-13** (apagar la constante a mano: la final carga sin errores y sin `#retar`; volver a encenderla). Reportar qué se vio y qué no se pudo ver. | T4, T5 | RF-01 a RF-09, RF-12 a RF-15; CA-1 a CA-9, CA-11, CA-13 |
| T7 | **Cierre.** `npm run build` (sin errores; el paquete principal crece a lo sumo 1 KB comprimido frente a T0); todas las pruebas de T0 más `retar-desde-final` en verde; `git diff --stat` contra la rama base solo con `src/main.ts`, `src/retos/index.ts`, `src/retos/online/desde-final.ts`, `scripts/retar-desde-final.test.ts` y `specs/retar-desde-final/`; `git diff -- api db package.json package-lock.json privacidad.html terminos.html src/style.css src/retos/retos.css specs/backlog.md` vacío; `grep -n "console\." src/retos/online/desde-final.ts` y `grep -n "sala=" src/retos/online/desde-final.ts` sin coincidencias; revisión OWASP A01 a A10 de la sección Seguridad de la spec sobre el diff (A04 y A01 centrales); marcar las casillas de este archivo; commit en español, imperativo, sin push. Si algún CA falla: corregir el código o actualizar la spec de forma explícita, sin dejar la desviación callada. | T1 a T6 | CA-12, CA-14; todos los RF |
| T8 | **Integración (orquestador y usuario, no el implementador).** Antes de desplegar, recomendado (no bloquea): regla de límite del Firewall de Vercel sobre `/api/*` y alertas de uso de Neon (70 % de 100 CU-h) y de Vercel. Revisar conflictos de `finish()` y `src/main.ts` con `continuar-carrera`. Tras desplegar, **no** crear salas de prueba en producción: vigilar con la "Medición posterior" del plan (umbral para apagar `RETAR_DESDE_FINAL`). | T7 | RF-10, RF-11, RF-15 |

## Trazabilidad
| RF | Tareas |
| --- | --- |
| RF-01 | T4, T6 |
| RF-02 | T1, T4, T6 |
| RF-03 | T4, T5, T6 |
| RF-04 | T2, T3 |
| RF-05 | T2, T3, T6 |
| RF-06 | T2, T3, T6 |
| RF-07 | T1, T2, T5, T6 |
| RF-08 | T3, T4, T6 |
| RF-09 | T2, T4, T6 |
| RF-10 | T1, T7, T8 |
| RF-11 | T1, T2, T8 |
| RF-12 | T4, T5, T6 |
| RF-13 | T4, T6 |
| RF-14 | T3, T4, T6 |
| RF-15 | T4, T5, T6, T8 |

Toda tarea cita al menos un RF o un criterio de alcance (T0, T7); ningún RF queda sin tarea. T8 es de integración y no la hace el implementador.

## Archivos que toca la implementación
Nuevos: `src/retos/online/desde-final.ts`, `scripts/retar-desde-final.test.ts`.
Modificados: `src/main.ts` (≤ 40 líneas agregadas, 1 quitada), `src/retos/index.ts` (3 líneas).
Sin cambios, a propósito: `api/`, `db/`, `src/retos/online/ui-sala.ts`, `src/retos/online/cliente.ts`, `src/retos/compartir.ts`, `privacidad.html`, `terminos.html`, `package.json`, `package-lock.json`, `specs/backlog.md`.

## Fuera de estas tareas (a propósito)
- Ocultar el botón con una consulta previa, medir clics, precargar el apodo, elegir categoría en la final, volver a la final: ver "Fuera de alcance" y Decisiones 1 a 8 de la spec.
- Cambiar el sondeo de la sala o los topes del servidor.

## Estado
T0 a T7 hechas (implementación y verificación en el worktree `retar-desde-final`). T8 queda para el orquestador y el usuario.
