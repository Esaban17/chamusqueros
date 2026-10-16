# Tareas: Reto del día

Trabajo en el worktree `chamusqueros/.claude/worktrees/reto-del-dia` (rama `claude/reto-del-dia`). Otras ramas editan `src/main.ts` y `src/retos/` en paralelo: cambios aditivos y mínimos, sin reformatear ni mover código. Las pruebas se corren con `npx tsx scripts/<archivo>.ts`.

| ID | Entregable | Depende de | Cubre |
|----|------------|------------|-------|
| T-01 | **`npm ci`** en el worktree (no hay `node_modules`). Con `npm run build` y las pruebas `retos`, `trivia`, `dedonde` y `online-cliente` sin cambios, anotar la línea base (qué pasa y qué ya falla) y el tamaño comprimido del paquete principal y del de Retos. | — | RF-18, RF-23 |
| T-02 | `src/retos/dia/puro.ts`, parte fecha y selección: `diaGT`, `fechaDe`, `diaDe`, `mulberry32`, `tipoDe`, `indiceDe`, `preguntaDelDia`, `opcionesDelDia`. Elegir las dos semillas fijas midiendo CA-3 sobre los bancos reales **antes** de seguir. Sin DOM, sin `Date.now()`, sin `Math.random()`. | T-01 | RF-03, RF-04, RF-05, RF-06, RF-07, RF-17 |
| T-03 | `src/retos/dia/puro.ts`, parte registro: `Registro`, `validar` (todo o nada, objeto nuevo, coherencia con el historial), `registrar`, `rachaVigente`, `ultimos7`, `yaJugado`. | T-02 | RF-08, RF-10, RF-11, RF-12, RF-13, RF-14, RF-16, RF-17 |
| T-04 | `scripts/reto-del-dia.test.ts`: CA-1 a CA-7 contra `puro.ts` con los bancos reales (fronteras de día; alternancia; 356 y 2.080 fechas; dispersión; 1.000 fechas repetidas; 4.000 días de posición de la correcta; racha; últimos 7 días; registros hostiles de CA-7, incluida `__proto__`) y CA-9 (búsqueda de texto sobre `src/retos/dia/`: sin `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`/`eval(`, `localStorage` solo en `almacen.ts`, sin `fetch(`/`XMLHttpRequest`/`sendBeacon`). Debe fallar sin T-02/T-03 y pasar con ellas. | T-02, T-03 | RF-03, RF-04, RF-05, RF-10 a RF-14, RF-16, RF-18, RF-19 |
| T-05 | `src/retos/dia/almacen.ts`: `leer(hoy)` (tope de 4.096 caracteres, `try/catch`, `validar`) y `guardar(reg): boolean` (`try/catch`). Es el único archivo con `localStorage`. Clave `chamusqueros:reto-dia`. | T-03 | RF-13, RF-14, RF-15 |
| T-06 | `src/retos/dia/ui.ts` y `dia.css` (clases `.rd-*`, menos de 40 líneas): `montarRetoDelDia(contenedor, alVolver)` con el flujo del plan (pantalla "Ya jugaste", pregunta con clases `rq-*`, futbolista con `botonOpcion`/`marcar`, resultado, racha, últimos 7 días, aviso de almacenamiento, "Volver a Retos", cancelación). Todo con `h()`. Un solo banco por `import()`. | T-03, T-05 | RF-02, RF-06, RF-07, RF-08, RF-09, RF-11, RF-12, RF-15, RF-16, RF-17, RF-19, RF-20, RF-21 |
| T-07 | `src/retos/index.ts`: la opción "Reto del día" en `entrada()` y la función `retoDelDia()` (mismo patrón que `jugar()`), sin reformatear ni mover nada. Revisar que `index.ts` sigue sin nombrar `localStorage` ni `innerHTML`. Además, por decisión del orquestador: la línea del botón de Retos en `src/main.ts` (una sola línea; *enmendado por la adenda 2026-10-15, ver abajo*), el comentario de `src/retos/online/cliente.ts` y el comentario de excepción en `scripts/retos.test.ts`. | T-06 | RF-01, RF-21, RF-22, RF-23 |
| T-08 | `privacidad.html`: la viñeta del Reto del día en la sección de Retos Fútbol (texto del plan). No tocar `terminos.html` ni la viñeta del duelo. | — | RF-24 |
| T-09 | `npm run build` y las pruebas `reto-del-dia`, `retos`, `trivia`, `dedonde`, `online-cliente` en verde **sin cambiar ninguna aserción de las existentes**. Comparar tamaños con la línea base de T-01: paquete principal igual (±100 B); informar la suma comprimida de los archivos de Retos antes y después, sin umbral (CA-13). Comprobar que `package.json` y `package-lock.json` no cambian. `git diff --stat origin/main`: solo `src/retos/dia/*`, `src/retos/index.ts`, `privacidad.html`, `scripts/reto-del-dia.test.ts`, `specs/reto-del-dia/*` y los tres cambios de T-07 (`src/main.ts` una línea, comentario de `online/cliente.ts`, comentario de `scripts/retos.test.ts`); `package.json` y `package-lock.json` sin cambios (CA-14). | T-04, T-07, T-08 | RF-18, RF-21, RF-23 |
| T-10 | Verificación en navegador con `npm run dev`, reloj simulado y almacenamiento falso: CA-8, CA-10, CA-11, CA-12, CA-13 (pestaña de red) y CA-15; 360×640 y 1280×800, tema claro y oscuro, solo teclado. Si una comprobación revela una desviación del spec, se corrige el código o se actualiza el spec de forma explícita; no queda deriva silenciosa. | T-07, T-08, T-09 | RF-01, RF-02, RF-06 a RF-09, RF-11, RF-12, RF-15, RF-17, RF-20, RF-22, RF-24 |

## Orden de trabajo
T-01 → T-02 → T-03 → T-04 (en paralelo con T-05) → T-06 → T-07 → T-08 → T-09 → T-10. T-08 no depende de código y puede hacerse en cualquier momento.

## Trazabilidad
- Cada RF-01 a RF-24 aparece en al menos una tarea; cada tarea cita al menos un RF.
- Los CA se verifican en T-04 (puros y búsqueda de texto: CA-1 a CA-7 y CA-9), T-09 (CA-13 en tamaños y CA-14) y T-10 (los de navegador).
- Al terminar, el implementador devuelve: los archivos tocados, las pruebas que corrió con su resultado, los tamaños antes y después y cualquier desviación del spec.

## Adenda 2026-10-15: entrada desde el Home

Ver la adenda de `plan.md`. Orden: T-11 → T-12 → T-13 → T-14.

| ID | Entregable | Depende de | Cubre |
|----|------------|------------|-------|
| T-11 | `src/retos/index.ts`: `Destino` gana `'dia'`; rama `destino === 'dia'` → `retoDelDia()`, **antes** de `else if (destino)`. | — | RF-26, RF-27 |
| T-12 | `src/main.ts`: `DestinoRetos` gana `'dia'`; fila `data-go="reto-dia"` antes de la línea 239, sin condición; clave `'reto-dia'` en `destino`; línea 229 vuelve a "Duelos de 2: en un solo celular o en línea". | T-11 | RF-25, RF-26, RF-28, RF-29 |
| T-13 | `src/style.css`: `button.record` (reset de botón), `button.reto-dia .reto-texto` (columna de texto) y `button.reto-dia b` (texto en dos líneas), junto a `.record`. | T-12 | RF-25, RF-30 |
| T-14 | Verificación de la adenda según `plan.md`: build y tamaño, cinco pruebas, navegador a 390×844 y 360×640 con y sin carrera, pestaña de red, `git diff --stat`. Si algo se desvía, se corrige el código o se enmienda la spec de forma explícita. | T-11, T-12, T-13 | RF-25 a RF-30; CA-16 a CA-25 |
