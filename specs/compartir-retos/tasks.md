# Tareas: compartir desde Retos Fútbol

Orden: T0 → T1 → (T2, T3 en paralelo) → T4 → T5. Cada tarea cita el RF que satisface. Ningún RF queda sin tarea ni tarea sin RF.

**Preparación (T0)** antes de tocar nada.

- [x] **T0** Entorno limpio. En el worktree `/Users/esaban/Desktop/Proyectos Personales/PROJECTS/LigaGT/chamusqueros/.claude/worktrees/compartir-retos` (rama `claude/compartir-retos`): `npm ci` (no `npm install`: el `package-lock.json` no debe cambiar), `npm run build` y las pruebas de regresión `npx tsx scripts/retos.test.ts`, `trivia.test.ts`, `dedonde.test.ts`, `online-cliente.test.ts`, `sala.test.ts` en verde **antes** de cambiar nada (línea base). Si algo falla ya, anotarlo y no culparse. Dependencias: ninguna. (CA-12)
  - **Nunca** crear salas reales en producción para probar, ni con `vercel dev` ni con una vista previa de Vercel (pueden compartir la base de datos de producción). Todo se prueba con respuestas simuladas (ver plan, "Cómo probar en línea sin salas reales").

**Núcleo puro**

- [x] **T1** `scripts/compartir.test.ts` **primero** (falla), y luego `src/retos/compartir.ts` (mitad pura): `CategoriaTexto`, `DatosResultado`, `REF_RESULTADO`, `textoResultado`, `datosEnLinea`, `urlResultado`, `enlaceWhatsApp`, con la firma exacta del plan; sin `import.meta.env` ni DOM al cargar el módulo (debe poder importarse con `tsx`). La prueba cubre CA-1 a CA-6, los casos extra del plan (Reto completo `[0, 1, 0]` → `[2, 1]`; `[0, null, 1]` → `[1, 1]`), que una categoría fuera del diccionario (`'otro'`) devuelve `null` en `textoResultado`, que el texto de resultado no contiene `sala=`, `ABCDE2` ni `http`, y la prueba estática de A03 sobre `src/retos/compartir.ts` (sin `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval(`, `location.search`, `location.href`, `location.hash`, `localStorage`, `fetch(`). Dependencias: T0. **RF-08, RF-09, RF-10, RF-11, RF-02 (datos); CA-1 a CA-6.**

**Piezas de interfaz**

- [x] **T2** `src/retos/compartir.ts` (mitad DOM): `anclaWhatsApp` y `botonesCompartir` como en el plan (escalones de RF-04, `AbortError` ignorado, copiar con campo de respaldo, avisos en `role="status"`, todo con `h()`/`textContent`/`.value`). Leer `import.meta.env.VITE_SITE_URL` y `location.origin` **dentro** de `botonesCompartir`, no al cargar el módulo. Reutilizar clases existentes; sin CSS nuevo (si hace falta, ≤ 2 líneas con selector propio en `src/retos/retos.css`). Dependencias: T1. **RF-04, RF-05, RF-06, RF-07, RF-13, RF-14.**
- [x] **T3** Conectar en `src/retos/index.ts`: `import`, `botonesFinales(s, texto: string | null)` con el botón después de "Revancha" (sin botón si `texto` es `null`, y sin cast de `s.modo`), y el texto en `fin()` (solo la rama no completo) y en `final()`. Cambios mínimos: no reformatear, no mover código, no tocar la rama completo de `fin()`. Dependencias: T2. **RF-01, RF-13, RF-14.**
- [x] **T4** Conectar en `src/retos/online/ui-sala.ts`: `import`; en `vistaFin()`, `datosEnLinea(sala.partida, yo)` y, si hay datos, `botonesCompartir(textoResultado({ ...d, yo }))` entre el bloque de revancha y "Ranking de Retos"; en el bloque "Invitar", el enlace de WhatsApp cuando no hay `navigator.share`. Cambios mínimos. Dependencias: T2. **RF-02, RF-03, RF-11, RF-12.** (T3 y T4 tocan archivos distintos: se pueden hacer en paralelo.)

**Cierre**

- [x] **T5** Verificación contra la spec (no contra la intención): `npm run build`; todas las pruebas de T0 en verde más `scripts/compartir.test.ts`; `git diff --stat origin/main` solo con `src/retos/compartir.ts`, `src/retos/index.ts`, `src/retos/online/ui-sala.ts`, `scripts/compartir.test.ts`, `specs/compartir-retos/` (0 líneas en `src/main.ts`, `package.json`, `package-lock.json`, `specs/backlog.md`); `grep -n "sala=" src/retos/compartir.ts` sin coincidencias. En el navegador (`npm run dev`, 360×640 y escritorio, claro y oscuro): CA-7 y CA-8 en el modo mismo celular (partida corta de ¿De dónde es? y un Reto completo); CA-9, CA-10 y CA-11 en línea **con `/api/` simulado** (Playwright `page.route` y `addInitScript` para `navigator.share` y `clipboard`). Si algún CA falla, **corregir el código o actualizar la spec explícitamente**; no dejar la desviación callada. Después, `/gq:audit` o revisión OWASP A01 a A10 sobre el diff, y commit en español, imperativo. Dependencias: T1, T3, T4. **CA-7 a CA-12; todos los RF.**

## Trazabilidad RF → tarea
| RF | Tarea | | RF | Tarea |
|---|---|---|---|---|
| 01 | T3 | | 08 | T1 |
| 02 | T1 (datos), T4 | | 09 | T1 |
| 03 | T4 | | 10 | T1 |
| 04 | T2 | | 11 | T1, T4 |
| 05 | T2 | | 12 | T4 |
| 06 | T2 | | 13 | T2, T3, T5 |
| 07 | T1 (`enlaceWhatsApp`), T2 | | 14 | T2, T3, T5 |

## Fuera de estas tareas (a propósito)
- Imagen o tarjeta, analítica del `ref`, contador de compartidos, cambios legales: ver "Fuera de alcance" y Decisiones 1 a 3 de la spec.
- Editar `specs/backlog.md`, `specs/retos-en-linea/spec.md` o `src/main.ts`.
