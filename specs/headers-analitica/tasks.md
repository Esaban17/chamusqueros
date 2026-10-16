# Tareas: cabeceras de seguridad y medición de visitas

Trazables a `spec.md` (RF-nn) y `plan.md`. Trabajar solo en el worktree `/Users/esaban/Desktop/Proyectos Personales/PROJECTS/LigaGT/chamusqueros/.claude/worktrees/headers-analitica` (rama `claude/headers-analitica`). No tocar `src/`, `package.json`, `package-lock.json` ni `specs/backlog.md`.

## Bloques
- **Bloque H (cabeceras):** T1, T5 (parte de cabeceras).
- **Bloque A (analítica), separable si el usuario veta D1:** T2, T3, T4, T5 (parte de analítica). Quitar el bloque A no cambia el bloque H.

## Tareas

### T0. Preparar el entorno
- **Entregable:** `node_modules` instalado en el worktree con `npm ci` (el worktree no los trae); `.vercel/project.json` copiado de `/Users/esaban/Desktop/Proyectos Personales/PROJECTS/LigaGT/chamusqueros/.vercel/project.json` a `<worktree>/.vercel/project.json` (ignorado por git, no se versiona).
- **Depende de:** nada. **RF:** RF-10 (condición para verificar con cabeceras reales).

### T1. Crear `vercel.json`
- **Entregable:** `vercel.json` en la raíz con la regla `/(.*)` y las 5 cabeceras exactas de `plan.md` §1 (4 que bloquean + `Content-Security-Policy-Report-Only`). JSON válido, sin otras claves.
- **Depende de:** T0. **RF:** RF-01, RF-02, RF-03.

### T2. Crear `public/analitica-init.js`  (bloque A)
- **Entregable:** el archivo de `plan.md` §2: define `window.va`/`window.vaq` y registra `beforeSend` que quita `sala` y conserva el resto; si falla, devuelve `null`. Sin dependencias, sin transpilar.
- **Depende de:** T0. **RF:** RF-06.

### T3. Agregar las etiquetas en `index.html`  (bloque A)
- **Entregable:** en `<head>`, después del `<link>` de Google Fonts: `<script src="/analitica-init.js"></script>` y luego `<script defer src="/_vercel/insights/script.js"></script>`. Cambio de 2 líneas; no reformatear el resto.
- **Depende de:** T2. **RF:** RF-05.

### T4. Actualizar `privacidad.html`  (bloque A)
- **Entregable:** el párrafo de `plan.md` §4 en "Servicios externos y cookies" y la fecha "15 de octubre de 2026". No cambiar "dos servicios externos".
- **Depende de:** nada (puede ir en paralelo con T2-T3). **RF:** RF-07.

### T5. Escribir `scripts/headers.test.ts`
- **Entregable:** la prueba de `plan.md` §5. Corre con `npx tsx scripts/headers.test.ts`, sin red, y falla si se rompe cualquiera de las comprobaciones 1 a 5. Las comprobaciones 3 a 5 pertenecen al bloque A, la 1 y la 2 al bloque H.
- **Depende de:** T1, T2, T3, T4. **RF:** RF-01, RF-02, RF-03, RF-05, RF-06, RF-07 (CA-1 a CA-3 en forma estática, CA-5 parcial, CA-6, CA-8).

### T6. Compilar y comprobar que no cambian dependencias ni `src/`
- **Entregable:** `npm run build` con código 0; `grep -c "_vercel/insights" dist/index.html` = 1 y `analitica-init.js` aparece antes en `dist/index.html`; las otras 3 páginas de `dist/` con 0; `git diff origin/main -- package.json package-lock.json src` vacío. Si Vite avisa por las etiquetas (plan §3), anotarlo en el reporte; si falla o las mueve, aplicar la alternativa de `plan.md` §3 y avisar.
- **Depende de:** T1-T5. **RF:** RF-05, RF-09 (CA-5, CA-10).

### T7. Verificar con cabeceras reales
- **Entregable:** evidencia de CA-1 y CA-2 (cabeceras en `/`, `/privacidad.html` y `/api/en-vivo`, con `curl -sI`/`npx vercel curl`), y del recorrido de 9 flujos de CA-4 con la consola abierta, listando cada violación y su origen. Orden: `npx vercel dev` primero, vista previa (`npx vercel deploy` sin `--prod`) para el flujo 6 (Ably). Las violaciones de `vercel.live` y del WebSocket de Vite se anotan como ruido. No hacer POST de carrera si la vista previa comparte la base de producción. Si algo no se pudo (inicio de sesión, protección de despliegues, sin Ably), **decirlo en el reporte** con el motivo.
- **Si aparece una violación de un origen propio o de la tabla:** agregarlo a la CSP en `vercel.json` y a la tabla del spec solo si el código lo justifica (archivo:línea); si no, es un hallazgo para el reporte, no un permiso nuevo.
- **Depende de:** T6. **RF:** RF-04, RF-10 (CA-1 a CA-4, CA-11).

### T8. Verificar el 404 previo a la activación
- **Entregable:** con la app abierta (`vercel dev` o vista previa), `GET /_vercel/insights/script.js` responde 404, la Portada se pinta y la consola no muestra excepciones de JavaScript no capturadas (solo el error de red de ese archivo). Se anota en el reporte.
- **Depende de:** T6. **RF:** RF-08 (CA-9).

### T9. Commit
- **Entregable:** un commit en `claude/headers-analitica` con `vercel.json`, `public/analitica-init.js`, `index.html`, `privacidad.html` y `scripts/headers.test.ts`, mensaje en español, imperativo, con las líneas de atribución del entorno. Sin push. El reporte lista cada CA con "verificado con cabeceras reales", "verificado sin cabeceras reales" o "no se pudo" y por qué (CA-11).
- **Depende de:** T5-T8. **RF:** RF-10 (CA-11).

### T10. Paso del usuario (después de fusionar y desplegar; no lo hace el implementador)
- **Entregable:** el usuario activa Web Analytics en el panel de Vercel (proyecto `chamusqueros`, pestaña Analytics), abre el sitio y `/?sala=ABC234` en un navegador normal y comprueba que el cuerpo de `POST /_vercel/insights/view` no contiene `sala` en `o`. Si lo veta (D1), se revierten los archivos del bloque A.
- **Depende de:** despliegue en producción. **RF:** RF-06 (CA-7).

## Trazabilidad
| RF | Tareas |
| --- | --- |
| RF-01 | T1, T5, T7 |
| RF-02 | T1, T5, T7 |
| RF-03 | T1, T5, T7 |
| RF-04 | T7 |
| RF-05 | T3, T5, T6 |
| RF-06 | T2, T5, T10 |
| RF-07 | T4, T5 |
| RF-08 | T3, T8 |
| RF-09 | T6 |
| RF-10 | T0, T7, T9 |

Ninguna tarea sin requisito (T0 sirve a RF-10) y ningún requisito sin tarea. CA-1 a CA-11 cubiertos: CA-1/2 (T5, T7), CA-3 (T5, T7), CA-4 (T7), CA-5 (T5, T6), CA-6 (T5), CA-7 (T10), CA-8 (T5), CA-9 (T8), CA-10 (T6), CA-11 (T9).

## Archivos que tocará la implementación
`vercel.json` (nuevo), `public/analitica-init.js` (nuevo), `index.html`, `privacidad.html`, `scripts/headers.test.ts` (nuevo).
