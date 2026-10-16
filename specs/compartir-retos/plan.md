# Plan: compartir desde Retos Fútbol

Deriva de `specs/compartir-retos/spec.md`. Cambio chico: un módulo nuevo, dos pantallas editadas, una prueba. Cero dependencias, cero API, cero base de datos.

## Lo que ya existe y se reutiliza
- `h()` de `src/retos/comun.ts` (elementos con `textContent`; nunca marcado).
- Clases de botón `btn`, `btn secondary`, `btn big`, `row`, `rt-ayuda`, `.rt .field textarea`, `.sr` y `a.btn` (`src/style.css`, `src/retos/retos.css`). **Cero CSS nuevo** previsto.
- El patrón de la invitación del lobby (`src/retos/online/ui-sala.ts`, bloque "Invitar (RF-03)"): `navigator.clipboard.writeText` → `execCommand('copy')` sobre un `textarea` → aviso en `role="status"`.
- El patrón de la carrera (`src/main.ts`, `shareText` y el manejador de `#share`): `navigator.share` → copiar, ignorando `AbortError`. **No se importa** (está en `main.ts`); se repite el patrón.
- Tipos `PartidaPublica`, `Indice`, `Categoria` de `src/retos/online/protocolo.ts` (solo `import type`).
- Pruebas con `node:assert` y `npx tsx scripts/<nombre>.test.ts` (sin framework). No hay DOM en Node: lo puro se prueba ahí, lo visual en el navegador.

## Arquitectura
Un módulo `src/retos/compartir.ts` con dos mitades:

**Puro (probado con `tsx`)**, sin DOM ni `import.meta.env` al cargarse:
```ts
export type CategoriaTexto = 'pais' | 'club' | 'preguntas' | 'dedonde' | 'completo';
export interface DatosResultado {
  categoria: string;               // clave de FRASE; fuera del diccionario → sin texto ni botón
  puntos: [number, number];        // por índice de jugador; en el Reto completo, categorías ganadas
  ganador: 0 | 1 | null;           // null = empate
  yo?: 0 | 1;                      // en línea: quién comparte. Sin él: mismo celular
}
export const REF_RESULTADO = 'reto';                                   // '' quita ?ref= (Decisión 1)
export function textoResultado(d: DatosResultado): string | null;      // RF-08, RF-09; null si la categoría no está en el diccionario
export function datosEnLinea(p: PartidaPublica | null | undefined, yo: Indice): DatosResultado | null;   // RF-02
export function urlResultado(variable?: string, origenPagina?: string): string;                          // RF-10
export function enlaceWhatsApp(mensaje: string): string;                // RF-07: 'https://wa.me/?text=' + encodeURIComponent
```
- `textoResultado`: diccionario cerrado `FRASE` para `<frase>`; categoría desconocida (por ejemplo un modo nuevo de otra rama) → devuelve `null` y la pantalla simplemente no muestra el botón; nunca lanza. Números por `normalizar(n)` = `Math.min(99999, Math.max(0, Math.trunc(Number(n)) || 0))`. La firma **no tiene** parámetro de nombre, código ni enlace.
- `datosEnLinea`: devuelve `DatosResultado` con `yo` ya puesto (así la llamada es `textoResultado(d)`); `null` si no hay `p`, `p.final` o `p.resultados.length`, o si `p.final.abandono !== null`. `categoria` = `'completo'` si `p.categorias.length > 1`, si no `p.categorias[0]`. `puntos` = en completo, `[nº de resultados con ganador 0, nº con ganador 1]`; en suelta, `p.resultados[0].puntos`. `ganador` = `p.final.ganador`. `null` si la categoría no está en el diccionario.
- `urlResultado(variable, origenPagina)`: intenta `new URL(variable)`, luego `new URL(origenPagina)`; usa solo el `origin` si el protocolo es `http:` o `https:`; si ninguno sirve, `https://chamusqueros.vercel.app`. Devuelve `${origin}/` + (`?ref=reto` si `REF_RESULTADO`). **Nunca** lee `location.search`, `location.href` ni `location.hash`. (Los defaults reales los pone el DOM: `import.meta.env.VITE_SITE_URL` y `location.origin`, leídos dentro de la función DOM, no al cargar el módulo, para que `tsx` pueda importar el archivo.)

**DOM (probado en el navegador)**:
```ts
export function botonesCompartir(texto: string | null): HTMLElement | null;   // null si no hay texto; si no, div.row + región de estado + (campo de respaldo, oculto)
export function anclaWhatsApp(mensaje: string, etiqueta?: string): HTMLAnchorElement;
```
- `botonesCompartir`: lee `urlResultado(import.meta.env.VITE_SITE_URL, location.origin)` al construirse. Con `typeof navigator.share === 'function'` crea un botón "Compartir" (`btn secondary`) → `await navigator.share({ title: 'Chamusqueros: Retos Fútbol', text: texto, url })`; `AbortError` se ignora; cualquier otro error cae a copiar. Sin `navigator.share` crea `anclaWhatsApp(`${texto} ${url}`)` y un botón "Copiar texto". Copiar: `clipboard.writeText(`${texto} ${url}`)`; si falla, `execCommand('copy')` sobre un `textarea` de solo lectura (`value`, no `innerHTML`) que se muestra y se selecciona; si eso también falla, queda visible con "Seleccioná el texto y copialo."
- `anclaWhatsApp`: `h('a', { class: 'btn', href: enlaceWhatsApp(mensaje), target: '_blank', rel: 'noopener noreferrer' }, etiqueta, h('span', { class: 'sr' }, ' (se abre en otra pestaña)'))`. Etiqueta por defecto "Enviar por WhatsApp".
- Todo texto entra por `h()`/`textContent`/`.value`. Sin `innerHTML`, sin `esc()`, sin `localStorage`, sin `fetch`.

### Dónde se conecta
| Archivo | Cambio |
|---|---|
| `src/retos/index.ts` | `import { botonesCompartir, textoResultado } from './compartir'`. `botonesFinales(s: Sesion)` pasa a `botonesFinales(s: Sesion, texto: string | null)` y devuelve `[Revancha, …(botonesCompartir(texto) ? [botonesCompartir(texto)] : []), Cambiar de juego, Volver al inicio]` (sin botón si `texto` es `null`). En `fin()` (rama `else`, no completo): `botonesFinales(s, textoResultado({ categoria: s.modo, puntos: r.puntos, ganador: r.ganador }))`; `DatosResultado.categoria` se declara `string` para que no haga falta ningún cast y un modo nuevo de otra rama no rompa la compilación ni la pantalla. En `final(s)`: `categoria: 'completo'`, `puntos: m.victorias`, `ganador: m.ganador`. **No** se toca la rama `completo` de `fin()` (marcador intermedio). Tres retoques más en total, ninguno mueve código. |
| `src/retos/online/ui-sala.ts` | (1) `import { anclaWhatsApp, botonesCompartir, datosEnLinea, textoResultado } from '../compartir'`. (2) En `vistaFin()`, entre el bloque de revancha y el `cuerpo.push(sh.boton('Ranking de Retos' …` : `const d = datosEnLinea(sala.partida, yo); const c = d && botonesCompartir(textoResultado(d)); if (c) cuerpo.push(c);`. (3) En el bloque "Invitar (RF-03)": si `typeof navigator.share !== 'function'`, agregar `anclaWhatsApp(`Te reto a un duelo de fútbol en Chamusqueros: ${link}`)` a `botones` antes de `copiar`. Nada más. |
| `scripts/compartir.test.ts` | Nuevo. |

`src/main.ts`: **0 líneas**. `src/retos/retos.css`: 0 líneas previstas; si el campo de respaldo necesita margen, hasta 2 líneas con selector propio `.rt-compartir …` (anotar en el commit).

## Por qué esto y no otra cosa
- **Un helper común, no uno por pantalla**: el backlog contó "7+ archivos" por pantallas de resultado; en realidad todas las terminaciones locales pasan por `botonesFinales` y la de línea por `vistaFin`, así que son 2 archivos de UI + 1 helper + 1 prueba.
- **Texto como función pura sin nombres**: la propiedad de seguridad ("el resultado no filtra el pase") se garantiza por la firma y se prueba con `tsx`, sin navegador.
- **`wa.me` + copiar como alternativa** en lugar de un botón de WhatsApp siempre visible: cuando hay `navigator.share` (celulares, el tráfico real) ya incluye WhatsApp; el enlace solo hace falta en escritorio.
- **Sin imagen, sin estado, sin API**: nada que operar.

## Modelo de datos y contratos
Ninguno. No hay tabla, endpoint ni almacenamiento nuevos. El único contrato nuevo es la firma de `textoResultado`.

## Seguridad (OWASP Top 10): mecanismos
| Riesgo | Cómo se cumple |
|---|---|
| **A01** | `textoResultado` no recibe código ni enlace; `urlResultado` solo usa el origen (CA-5, CA-6, CA-9). El pase sale únicamente en la invitación del lobby, sin tocar su lógica de cuándo se muestra (anfitrión, 1 jugador, clic). |
| **A02** | Enlaces `https`; `urlResultado` rechaza protocolos distintos de `http(s)` y cae a un dominio fijo. |
| **A03** | `encodeURIComponent` en `enlaceWhatsApp`; `h()`/`textContent`/`.value`; prueba estática que busca `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval(` , `location.search`, `location.href`, `location.hash`, `localStorage` y `fetch(` en `compartir.ts` y falla si aparecen. Ningún apodo ni nombre entra al texto. |
| **A04** | Sin función "retar desde el resultado"; no se agregó un camino para reenviar un pase fuera de la invitación. |
| **A05, A07, A09, A10** | Sin cambios de configuración, identidad, registros ni llamadas salientes. |
| **A06** | `package.json` y `package-lock.json` sin cambios (CA-11/12). |
| **A08** | Compartir no modifica puntos ni estado de sala. |

## Estrategia de pruebas
1. **`scripts/compartir.test.ts`** (`npx tsx scripts/compartir.test.ts`, sin red): CA-1 a CA-6 al pie de la letra; casos extra: `datosEnLinea` con Reto completo y ganadores por categoría `[0, 1, 0]` → `puntos [2, 1]`; con `[0, null, 1]` → `[1, 1]` (una categoría empatada no suma a nadie); texto más largo ≤ 160; la prueba estática de A03 sobre `src/retos/compartir.ts`; y que **el texto de resultado no contiene** `sala=`, `ABCDE2`, ni `http`.
2. **Regresión** (todas sin red, ya existen): `scripts/retos.test.ts`, `trivia.test.ts`, `dedonde.test.ts`, `online-cliente.test.ts`, `sala.test.ts`, `seguridad-api.test.ts`. `npm run build` (incluye `tsc --noEmit`).
3. **Navegador** (CA-7 a CA-11): ver "Cómo probar en línea sin salas reales".

### Cómo probar en línea sin salas reales
`npm run dev` es solo Vite: **no sirve `/api`**, así que el modo en línea no aparece solo. **No** usar `vercel dev` ni una vista previa de Vercel para crear salas: pueden compartir la base de datos de producción. En su lugar, con Playwright (o a mano en la consola) interceptar `/api/` con respuestas fijas (solo las rutas sin extensión, p. ej. `/^\/api\/[^.]*$/` sobre `pathname`: Vite sirve `src` que importa `/api/_retos.ts` y ese módulo no debe interceptarse): `GET /api/sala` → `{ "enLinea": true }`; `GET /api/sala?codigo=ABCDE2` → una `RespuestaSala` con `fase: 'fin'`, `partida.final` con `abandono: null`, `revancha: [false, false]`; `POST /api/ably-token` → `{ "dev": true }` (transporte de sondeo). Abrir `/?sala=ABCDE2` (así la barra de direcciones sí lleva el pase) y comprobar CA-9. Para el lobby (CA-10), la misma respuesta con `fase: 'lobby'` y un jugador. Stubs de `navigator.share` y `navigator.clipboard.writeText` con `page.addInitScript`.

## Cobertura (RF → dónde → CA)
| RF | Dónde | CA |
|---|---|---|
| 01 | `index.ts` (`fin` no completo, `final`, `botonesFinales`) | 7 |
| 02 | `datosEnLinea`, `ui-sala.ts` (`vistaFin`) | 6, 9 |
| 03, 12 | `ui-sala.ts` (bloque Invitar), `anclaWhatsApp` | 10 |
| 04, 05, 06 | `botonesCompartir` | 7, 8 |
| 07 | `enlaceWhatsApp`, `anclaWhatsApp` | 8 |
| 08, 09 | `textoResultado` | 1 a 4 |
| 10 | `urlResultado` | 5, 9 |
| 11 | firma de `textoResultado`, `urlResultado`, `datosEnLinea` | 6, 9 |
| 13 | `compartir.ts` sin efectos; sin cambios en `package.json` | 11, 12 |
| 14 | clases existentes, `role="status"`, `.sr` | 7, 8 (a 360×640) |

Todo lo diseñado está pedido por algún RF; no sobra diseño.

## Riesgos
- **Conflicto de fusión con `reto-del-dia`** (agrega un modo en `src/retos/index.ts`): los retoques en `index.ts` son una línea de `import`, la firma de `botonesFinales` y dos llamadas. Si `reto-del-dia` también cambia `botonesFinales` o `fin`/`final`, resolver a mano en la fusión, conservando ambos. Mitigación: no mover ni reformatear nada.
- **Conflicto con `ranking-rate-limit`**: ninguno previsto (toca `api/` y `rankingApi` en `main.ts`).
- **Navegador dentro de WhatsApp o de otra app**: `navigator.share` puede faltar o `clipboard` estar bloqueado. Por eso el campo de respaldo (RF-06) existe.
- **`wa.me` en escritorio** abre WhatsApp Web o pide instalar la app: aceptable, es la alternativa pedida.
- **El enlace del resultado trae `?ref=reto` sin analítica**: inerte; quitar con `REF_RESULTADO = ''` (Decisión 1).
- **La barra de direcciones conserva `?sala=`** durante toda la sala (la limpia `main.ts` solo al salir). Por eso `urlResultado` no mira la URL. Quien comparta la *pestaña* por otro medio no es responsabilidad de esta feature.
- **Tráfico**: si funciona, sube la carga; el backlog ya la ordenó después de la regla del Firewall y de las alertas de uso.

## Coordinación con otras ramas
Rama `claude/compartir-retos`, base `origin/main` + backlog. No edita `specs/backlog.md`. Fusiona sin dependencia de `ranking-rate-limit`, `contador-carreras` ni `headers-analitica`.
