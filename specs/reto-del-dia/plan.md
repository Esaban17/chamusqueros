# Plan: Reto del día

Deriva de `spec.md`. Cada RF queda cubierto en "Cobertura". Sin dependencias, sin servidor, sin variables de entorno.

## Arquitectura
Un módulo nuevo en una **subcarpeta**, `src/retos/dia/`, que Retos baja con `import()` solo al tocar la opción. Tres capas, de lo puro a lo que toca el navegador:

| Archivo (nuevo) | Qué es | Toca |
|---|---|---|
| `src/retos/dia/puro.ts` | Lógica pura, probada con `tsx`: fecha de Guatemala, qué reto toca, opciones deterministas, validación y actualización del registro, racha vigente, últimos 7 días. Sin DOM, sin almacenamiento, sin `Date.now()` ni `Math.random()` (todo entra por parámetro). | nada |
| `src/retos/dia/almacen.ts` | **El único archivo con `localStorage`.** `leer(hoy)` y `guardar(registro)`, ambos con `try/catch`. | almacenamiento |
| `src/retos/dia/ui.ts` + `dia.css` | `montarRetoDelDia(contenedor, alVolver): () => void`. Pinta con `h()`. | DOM |
| `scripts/reto-del-dia.test.ts` | Prueba de `puro.ts` (CA-1 a CA-7) y búsqueda de texto sobre `src/retos/dia/` (CA-9). | — |

*[enmendado por la adenda 2026-10-15; ver abajo]* Se modifican solo estos archivos existentes (los tres últimos por decisión del orquestador, ver spec "Decisiones"):
- `src/retos/index.ts`: una opción en `entrada()` y una función `retoDelDia()` (15 líneas añadidas, nada movido ni reformateado).
- `privacidad.html`: una viñeta.
- `src/main.ts`: una sola línea, el texto de la segunda línea del botón de Retos ("Duelos de 2 y un reto nuevo cada día"). *[enmendado por la adenda 2026-10-15; ver abajo]*
- `src/retos/online/cliente.ts`: solo el comentario del encabezado.
- `scripts/retos.test.ts`: solo un comentario que nombra a `src/retos/dia/` como excepción aprobada.

**No se toca** nada más de `src/main.ts`, `package.json`, `package-lock.json`, `api/`, `src/retos/trivia*.ts`, `dedonde.ts`, `comun.ts`, ni ningún archivo de `scripts/` existente. *[enmendado por la adenda 2026-10-15: `src/main.ts` cambia más de una línea; ver abajo]*

### Por qué una subcarpeta
`scripts/retos.test.ts` (línea 76) recorre `src/retos/*.ts|css` de primer nivel y falla si encuentra `localStorage`. El filtro `/\.(ts|css)$/` descarta una carpeta llamada `dia`, y `scripts/online-cliente.test.ts` solo barre `src/retos/online/` y `ui-dedonde.ts`: las dos pruebas pasan sin cambiar ninguna aserción (se comprobó con `readdirSync` sobre el árbol actual). La excepción no se esquiva en silencio: `retos.test.ts` gana un comentario que dice que `dia/` es la excepción aprobada por esta spec, igual que `online/`. La alternativa, relajar esas pruebas, debilita una regla que hoy es global. Dentro de `dia/`, la regla "`localStorage` en un solo archivo" la hace cumplir la prueba nueva (CA-9).

### Reuso (sin tocar los archivos compartidos)
| Se reusa | De dónde | Para qué |
|---|---|---|
| `h()` | `src/retos/comun.ts` | todo el DOM; texto siempre como nodo de texto (RF-19) |
| `barajar(a, azar)` | `src/retos/trivia-puro.ts` | orden fijo del banco y orden de las opciones, con un `azar` sembrado |
| `PreguntaBanco`, `PreguntaJuego` (tipos) | `trivia-puro.ts` | tipos de la pregunta |
| `opcionesRonda(f, azar)`, `Futbolista` | `src/retos/dedonde.ts` | las 4 selecciones del futbolista, con `azar` sembrado |
| `botonOpcion`, `marcar`, `cargarCss` | `src/retos/ui-dedonde-comun.ts` | opciones con bandera y su marca ✓/✗ y texto, y el CSS de "¿De dónde es?" |
| clases `rq-*` y `trivia.css` | `src/retos/trivia.css` (por `import('../trivia.css')`) | la pregunta, con el mismo aspecto que "Preguntas" |
| `preguntas.json`, `futbolistas.json` | `src/retos/` (por `import()`, solo el del día) | el contenido; nada nuevo (RF-05) |
| `.btn`, `.panel`, `.rt-*`, `marco()`/`pantalla()` | `style.css`, `retos.css`, `index.ts` | el marco de Retos con "Salir" y el pie legal |

Lo que se **reescribe** (pocas líneas, a propósito):
- La preparación de una pregunta (barajar las opciones y recalcular `correcta`): `preparar` de `trivia-puro.ts` no está exportado y ese archivo es de los que otras ramas dan por congelado. Son 2 líneas en `puro.ts`.
- La pantalla de una pregunta sin reloj: el closure `pregunta()` de `trivia.ts` está atado al reloj y a `crearControl`; refactorizarlo para reusarlo sería tocar un archivo compartido. Se escribe una pantalla corta en `ui.ts` con las mismas clases `rq-*`.
- Un generador pseudoaleatorio sembrado de 5 líneas (mulberry32). No se importa de `scripts/`.

## Lógica pura (`puro.ts`)

### Fecha de Guatemala (RF-03, RF-17)
- `diaGT(ms) = Math.floor((ms - 6 * 3_600_000) / 86_400_000)`: el entero de días desde 1970-01-01 en hora de Guatemala. Cambia a las 06:00 UTC. Sin `Intl` ni zonas: UTC−6 es fija.
- `fechaDe(dia)`: `new Date(dia * 86_400_000).toISOString().slice(0, 10)` → `AAAA-MM-DD`.
- `diaDe(fecha)`: valida el formato con `/^\d{4}-\d{2}-\d{2}$/`, construye con `Date.UTC` y exige que `fechaDe(resultado) === fecha` (rechaza `2026-02-30`); devuelve `null` si no es una fecha real.
- Valores de control (CA-1): `diaGT(Date.parse('2026-10-15T06:00:00Z')) = 20741` (`2026-10-15`, impar → futbolista); `05:59:59.999Z` da 20740.

### Qué reto toca (RF-04, RF-05)
```
tipoDe(dia): 'pregunta' | 'futbolista'     // dia % 2 === 0 ? 'pregunta' : 'futbolista'
indiceDe(dia, n): number                   // n = tamaño del banco del tipo de ese día
  orden  = barajar([0..n-1], mulberry32(SEMILLA[tipoDe(dia)]))   // orden fijo y disperso
  indice = orden[Math.floor(dia / 2) % n]
```
- Cada índice sale una vez por vuelta de `n` días del mismo tipo (CA-2). Con 178 y 520 elementos, el barajado se calcula por llamada (microsegundos).
- Si CA-4 falla con `mulberry32(dia)` sembrado con días consecutivos, se mezcla la semilla (por ejemplo `Math.imul(dia, 0x9E3779B1)`) y no se ensanchan las bandas.
- `SEMILLA` son dos constantes enteras fijas en el código (elegidas: `0x5eed0001` y `0x5eed0002`; medido con los bancos del 2026-10-15: 14,7 % de pares contiguos del mismo tema, 1,7 % de la misma selección, correcta en cada posición entre 23,4 % y 27,4 %; no hizo falta mezclar la semilla del día). Cambiarlas reordena todo: no se cambian.
- El tamaño del banco entra por parámetro (`n`), no por import, para que el módulo siga puro y la prueba use los bancos reales. Así la interfaz solo necesita el banco del tipo de hoy (RF-21).
- Dispersión (CA-3): el implementador calcula el valor real con las semillas elegidas; si no cumple el umbral (30 % de pares del mismo tema en preguntas, 10 % de la misma selección en futbolistas), cambia la constante **antes** de publicar, nunca después.

### Orden de las opciones (RF-04)
- Pregunta: `preguntaDelDia(p, dia)` hace `barajar(p.opciones.map((texto, i) => ({ texto, ok: i === p.correcta })), mulberry32(dia))` y recalcula `correcta` (mismo código que `preparar`).
- Futbolista: `opcionesRonda(f, mulberry32(dia))`.
- Un solo `mulberry32(dia)` por reto: recargar no cambia el orden, y dos dispositivos coinciden.

### Registro, validación y racha (RF-10 a RF-16)
```
interface Registro { v: 1; racha: number; mejor: number; jugados: number; aciertos: number; hist: { f: string; ok: 0 | 1 }[] }
validar(raw: unknown, hoy: number): Registro | null     // todo o nada (RF-14)
desdeTexto(texto: string | null, hoy: number): Registro | null   // tope de 4.096 + JSON.parse en try/catch + validar; lo usa almacen.leer
fechaTexto(dia, anio?) · llegariaA(reg, hoy) · textoRacha(n) · textoEstado(e)   // textos y "Jugá hoy para llegar a N"
registrar(reg: Registro | null, dia: number, acierto: boolean): Registro   // RF-10, RF-16
rachaVigente(reg: Registro | null, hoy: number): number                    // RF-11
ultimos7(reg: Registro | null, hoy: number): { dia: number; estado: 'ok' | 'mal' | 'nada' }[]   // RF-12, de hoy-6 a hoy
yaJugado(reg: Registro | null, dia: number): { ok: boolean } | null         // RF-08
```
- `validar` **construye un objeto nuevo** campo por campo con los valores ya comprobados (no devuelve `raw`): descarta cualquier clave extra, incluida `__proto__` (CA-7). Comprueba, en este orden: objeto plano; `v === 1`; contadores con `Number.isInteger` y `0 ≤ n ≤ hoy`; `mejor ≥ racha`; `jugados ≥ aciertos` y `≥ mejor`; `hist.length === Math.min(jugados, 7)`; `hist` es arreglo de 7 o menos; cada `f` pasa `diaDe` (fecha real) con `diaDe(f) ≤ hoy`; `ok` es 0 o 1; fechas estrictamente crecientes; coherencia de la racha con el largo R de la serie final consecutiva (RF-14). El tope de 4.096 caracteres se verifica en `desdeTexto` (de `puro.ts`, para poder probarlo) antes de `JSON.parse`.
- `registrar`: sin registro → racha 1. Si `dia ≤ última` (misma fecha o una pestaña vieja), devuelve el registro **sin cambios** (RF-16). Si `dia === última + 1` → `racha + 1`; si no → 1. Actualiza `mejor`, `jugados`, `aciertos`, agrega la entrada y conserva las últimas 7.
- `rachaVigente`: `racha` si `última ≥ hoy - 1`; si no, 0.
- No se guarda el `id` del reto ni la opción elegida (RF-13): la fecha basta para saber el tipo (paridad).

## Almacenamiento (`almacen.ts`)
- Clave `chamusqueros:reto-dia`, como `chamusqueros:perfil`, `:id` y `:sala`.
- `leer(hoy)`: `try { return desdeTexto(localStorage.getItem(K), hoy); } catch { return null; }`.
- `guardar(reg): boolean`: `try { localStorage.setItem(K, JSON.stringify(reg)); return true; } catch { return false; }`. El `false` dispara el aviso de RF-15.
- Es el único archivo de `dia/` que nombra `localStorage` (CA-9).

## Pantalla (`ui.ts`, `dia.css`)
`montarRetoDelDia(contenedor, alVolver)` devuelve una función de cancelación (pone un indicador en falso; no hay temporizadores). Lo que ya cargó no pinta si se salió (mismo patrón de `generacion` que usa `index.ts`).

Flujo:
1. `hoy = diaGT(Date.now())` (se fija una vez: RF-17). `reg = leer(hoy)`.
2. Si `yaJugado(reg, hoy)`: pantalla "Ya jugaste el reto de hoy" con resultado y estadísticas, y "Volver a Retos". No se carga ningún banco (RF-21).
3. Si no: `tipo = tipoDe(hoy)`; se importa solo el JSON de ese tipo (y su CSS); `i = indiceDe(hoy, banco.length)`; `banco[i]` es el reto (RF-21).
4. Se pinta: `h1` "Reto del día" (`tabindex=-1`, recibe el foco), fecha en español con un arreglo de 12 meses (sin `Intl`), línea de racha vigente (RF-11) y el reto.
   - Pregunta: `h2` con el enunciado, 4 botones `rq-op` con número, texto y marca; teclas 1 a 4 en el contenedor, igual que `trivia.ts`; espera de 300 ms contra el doble toque, como los otros modos.
   - Futbolista: `h2` con el nombre, consigna "¿De qué Selección es?" y 4 `botonOpcion` de `ui-dedonde-comun.ts`.
5. Al responder (solo la primera vez): `reg2 = registrar(leer(hoy), hoy, acierto)`; `ok = guardar(reg2)`; se marcan correcta y elegida con `marcar`/clases `rq-ok`/`rq-mal` y texto; se muestra "Acertaste"/"Fallaste", la racha, las estadísticas de `ultimos7`, "Volvé mañana" y, si `!ok`, "No se pudo guardar tu racha en este navegador." (`role="status"`). Se relee con `leer` justo antes de `registrar` (RF-16).
6. `alVolver` es `entrada` de `index.ts` ("Volver a Retos").

Texto: todo con `h()`; los números pasan por `String(n)`; los valores del registro no se usan como clase, atributo ni enlace (RF-19, A03). La cadena de la fecha sale de `fechaDe` + un arreglo de meses fijo.

Accesibilidad (RF-20): foco al `h1`; `aria-keyshortcuts` 1 a 4 en las opciones; ✓/✗ con texto; la tira de 7 días es una lista con "✓ acertó / ✗ falló / – no jugó" y la fecha; los botones usan `.btn` y `rq-op`/`dd-op` (alto mínimo ya definido en esos estilos: se verifica a 48 px); `dia.css` (menos de 40 líneas, solo `.rd-*`) usa las variables de color existentes y respeta `prefers-reduced-motion` por no tener animaciones.

Al responder, el foco va al encabezado del resultado ("Acertaste"/"Fallaste"), que es el título de lo que aparece; si al releer el registro ya estaba esa fecha (otra pestaña), se pinta "Ya jugaste". El `ui-dedonde-comun` se baja con `import()` solo los días de futbolista. Se importa estáticamente `./dia.css` desde `ui.ts` (no lo carga `tsx`); `trivia.css` y `dedonde.css` se piden con `import()` como ya hacen sus módulos.

## Entrada en Retos (`src/retos/index.ts`)
Dentro de `entrada()`, en el `div.rt-ops` que hoy tiene "Jugar en el mismo celular", se agrega una segunda opción con la función `opcion(...)` que ya existe:
```ts
opcion('Reto del día', 'Un reto nuevo cada día, igual para todos. Cuidá tu racha.', retoDelDia)
```
y, junto a las otras funciones de pantalla, `retoDelDia()`:
```ts
function retoDelDia() {
  detener();
  enPartida = false;
  const id = generacion;
  const host = h('div', { class: 'rt-juego' });
  marco(host);
  void import('./dia/ui').then((m) => { if (id === generacion) cancelar = m.montarRetoDelDia(host, entrada); }).catch(() => {
    if (id === generacion) pantalla(titulo('No se pudo cargar el reto del día'), h('p', {}, 'Revisá tu conexión e intentá de nuevo.'), boton('Volver a Retos', entrada));
  });
}
```
- Es el mismo patrón de `jugar()` para "Preguntas" y "¿De dónde es?". `detener()` llama a `cancelar`, así que "Salir" no deja nada corriendo (RF-22). `enPartida = false` evita la confirmación.
- La opción aparece **antes** de `infoEnLinea()` y no depende de él (RF-01).
- `index.ts` no nombra `localStorage` ni `innerHTML` (lo exige `retos.test.ts`).
- Conflictos con ramas en paralelo: `compartir-retos` edita las pantallas de resultado de `index.ts` (`fin`, `final`, `botonesFinales`); este cambio vive en `entrada()` y en una función nueva, así que el choque esperado es de contexto, no de contenido. Si Git lo marca, se resuelve conservando ambos.

## Legal (`privacidad.html`)
Una viñeta nueva en la lista de "Retos Fútbol", después de la que dice que el modo «en el mismo celular» no escribe nada:
> El «Reto del día» (aparte del duelo) guarda en tu navegador, y solo ahí, las fechas en que lo jugaste, si acertaste o fallaste y tu racha. No incluye nombres ni identificadores, no se envía a ningún servidor y se borra al borrar los datos del sitio en tu navegador.

La viñeta del duelo no se cambia (sigue siendo cierta). `terminos.html` no cambia.

## Cobertura
| RF | Dónde |
|---|---|
| RF-01 | opción en `entrada()` de `index.ts`, fuera de `infoEnLinea()`; una línea de texto en `main.ts` |
| RF-02 | `ui.ts` paso 4; `fechaDe` + arreglo de meses |
| RF-03 | `diaGT`, `fechaDe`, `diaDe` |
| RF-04 | `mulberry32(dia)` para las opciones; orden fijo por semilla constante |
| RF-05 | `tipoDe` y `indiceDe` (paridad, `barajar` sembrado, vuelta de `n`) |
| RF-06 | `preguntaDelDia` y pantalla `rq-*` sin reloj |
| RF-07 | `opcionesRonda` sembrado y `botonOpcion`/`marcar` |
| RF-08 | `yaJugado`, pantalla "Ya jugaste" sin banco |
| RF-09 | el registro se escribe solo al responder (paso 5) |
| RF-10 | `registrar` |
| RF-11 | `rachaVigente` y la línea "Jugá hoy para llegar a N" |
| RF-12 | `ultimos7` y la lista de estadísticas |
| RF-13 | forma de `Registro`; `almacen.ts` |
| RF-14 | `validar` + tope de tamaño en `leer` |
| RF-15 | `guardar` devuelve `false` y el aviso |
| RF-16 | `registrar` ignora `dia ≤ última`; relectura antes de guardar |
| RF-17 | `hoy` fijado al abrir la pantalla, usado en `registrar` |
| RF-18 | sin `fetch`, sin dependencias, sin `api/` (CA-9, CA-13) |
| RF-19 | `h()`/`textContent`; prueba de texto |
| RF-20 | clases y foco de `ui.ts`; verificación en navegador (CA-12) |
| RF-21 | `import()` de `./dia/ui` y de un solo banco |
| RF-22 | `detener()`/`cancelar` en `retoDelDia()`; `enPartida = false` |
| RF-23 | ningún archivo compartido se edita salvo `index.ts` (opción + función) |
| RF-24 | viñeta en `privacidad.html` |

## Seguridad (OWASP Top 10)
| Riesgo | Cómo se cumple |
|---|---|
| **A01 / A07** | No aplican: sin servidor, cuentas ni datos ajenos. |
| **A02** | Se guarda solo fecha, 0/1 y contadores; ni nombres, ni identificadores, ni la respuesta. |
| **A03** | `h()` y `textContent`; los números del registro pasan por `String`; nada del almacenamiento llega a clases, atributos ni URLs. La prueba nueva busca `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` y `eval(` en `src/retos/dia/` (CA-9), igual que las pruebas actuales hacen con el resto de Retos. |
| **A04** | La racha no da nada a cambio, así que alterar el reloj o el registro solo daña a quien lo hace. `validar` es todo o nada y con tope de 4.096 caracteres. Riesgo residual aceptado: se puede inflar la propia racha. |
| **A05** | Sin configuración, cabeceras, funciones ni variables nuevas. |
| **A06** | `package.json` y `package-lock.json` sin cambios (CA-9). |
| **A08** | `JSON.parse` dentro de `try/catch`; el resultado nunca se usa tal cual: `validar` construye un objeto nuevo con campos comprobados (CA-7, incluida `__proto__`). Sin código ni datos remotos: los bancos son los del sitio. |
| **A09** | No se registra el contenido del almacenamiento; los errores de lectura o escritura se capturan y se traducen al aviso. |
| **A10** | No aplica: sin peticiones. |

## Verificación
1. `npm ci` y línea base en `origin/main`+backlog: `npm run build` y `npx tsx scripts/{retos,trivia,dedonde,online-cliente}.test.ts` (si algo ya fallaba, se anota antes de tocar nada).
2. `npx tsx scripts/reto-del-dia.test.ts` (CA-1 a CA-7 y CA-9).
3. `npm run build` (`tsc --noEmit` incluye `src/retos/dia/`) y comparación de tamaños con `origin/main` (CA-13: paquete principal ±100 B; suma de Retos solo informada). `noUnusedLocals` está activo.
4. Regresión: las cuatro pruebas del punto 1 pasan **sin cambiar ninguna aserción** (CA-14; `retos.test.ts` solo gana un comentario).
5. Navegador (`npm run dev`) con el reloj simulado (Playwright, `page.clock`) a 360×640 y 1280×800, claro y oscuro: CA-8, CA-10, CA-11, CA-12, CA-13 y CA-15. El almacenamiento que lanza error se simula reemplazando `Storage.prototype.getItem/setItem`.
6. `git diff --stat origin/main`: solo los archivos de este plan (CA-14).

## Riesgos
- **Dispersión insuficiente con una semilla mala:** se mide con CA-3 antes de publicar y la semilla se elige una vez.
- **Reordenar el banco o agregarle elementos cambia el reto de los días siguientes** (aceptado en la spec). Para no sorprender a quien ya jugó, el registro es por fecha. Si el cambio llega a mitad de día, quien no había jugado ve otro reto: no se mitiga en la versión 1.
- **`opcionesRonda` puede lanzar** si una selección no tiene suficientes distractores (hoy una prueba lo vigila): `ui.ts` lo captura y muestra "No se pudo preparar el reto de hoy", sin tocar el registro.
- **Choque de ediciones en `index.ts`** con `compartir-retos` y otras ramas: cambios aditivos y pequeños, sin reformatear.
- **El reloj del dispositivo es la única fuente de la fecha:** un reloj mal puesto da un reto distinto o descarta el registro (RF-14). Aceptado: sin servidor no hay otra fuente.
- **La descarga del módulo falla sin conexión:** mensaje y "Volver a Retos"; una vez bajado, el reto no necesita red (salvo las banderas).
- **Efecto en retención no medible** con lo que hay hoy (sin analítica): se entrega la mecánica y se deja a las decisiones del backlog (`medir-base`) la medición.

## Adenda 2026-10-15: entrada desde el Home

Deriva de la adenda de `spec.md` (RF-25 a RF-30, CA-16 a CA-25); sus decisiones no se reabren. No hay archivos nuevos. No cambian `puro.ts`, `almacen.ts`, `ui.ts`, `package.json`, `package-lock.json` ni `privacidad.html` (ya describe lo que guarda el reto).

### Cambios
| Archivo | Cambio | RF |
|---|---|---|
| `src/main.ts` | (a) `DestinoRetos` (línea 318) gana `'dia'`. (b) En `home()`, una fila inline antes de `${retos('btn retos')}` de la línea 239, sin condición (a diferencia de `.record`, que depende de `top`): `<button type="button" class="record reto-dia" data-go="reto-dia">` con el SVG de calendario (`aria-hidden`), `<span class="reto-texto"><small>Reto del día</small><b>Un reto nuevo cada día. Cuidá tu racha.</b></span>` y `<span class="link">Jugar ›</span>`. Dentro de `<button>` solo cabe contenido de frase: por eso `<span>` y no `<div>`, y ningún botón dentro del botón. (c) En el objeto `destino`: `'reto-dia': () => abrirRetos('dia')`. No se toca `go()`. (d) Línea 229 (closure `retos`): vuelve a "Duelos de 2: en un solo celular o en línea". Es una sola cadena, que cubre las dos apariciones (líneas 239 y 292). | RF-25, RF-26, RF-28 |
| `src/retos/index.ts` | (a) `Destino` (línea 30) gana `'dia'`. (b) En "Apertura" (líneas 346-353): `else if (destino === 'dia') retoDelDia();` **antes** de `else if (destino)` (línea 351), que trata cualquier valor verdadero como `{ sala }`. | RF-26, RF-27 |
| `src/style.css` | Junto a `.record` (líneas 253-260): `button.record { width: 100%; font: inherit; color: inherit; text-align: left; cursor: pointer; }` y `button.reto-dia .reto-texto { display: flex; flex-direction: column; flex: 1; min-width: 0; line-height: 1.25; }`, `button.reto-dia b { white-space: normal; }`. Nada más. | RF-25, RF-30 |

Sin `'dia'` en los dos tipos, `abrirRetos('dia')` no compila; por eso T-11 va antes que T-12.

### Cobertura
| RF | Dónde |
|---|---|
| RF-25 | fila en `main.ts`, antes de la línea 239, sin condición |
| RF-26 | `destino['reto-dia']` en `main.ts`; rama `dia` en `index.ts`. Si la descarga falla, `sinPaquete` muestra el mismo aviso que el botón |
| RF-27 | `retoDelDia()` ya existente: "Salir" llama a `alSalir` (que es `home`); "Volver a Retos" llama a `entrada`. Sin cambios |
| RF-28 | closure `retos` de `main.ts` (línea 229) |
| RF-29 | ningún `import` nuevo ni `localStorage` en `main.ts`; CA-22 y CA-23 |
| RF-30 | `button.reto-dia b` en `style.css` |

### Verificación
1. `npm run build`: JS del paquete principal, comprimido, contra `origin/main` (CA-23), y búsqueda de una frase de `preguntas.json` y de un nombre de `futbolistas.json` en ese JS.
2. `npx tsx` de `scripts/reto-del-dia.test.ts`, `retos.test.ts`, `retar-desde-final.test.ts`, `continuar-carrera.test.ts` y `contador-carreras.test.ts` (CA-24). `retar-desde-final.test.ts` fija la firma de `abrirRetos` y el cuerpo de `retarDesdeFinal`, que esta adenda no toca. Si una falla, se corrige el código, no la aserción.
3. Navegador (`npm run dev`), 390×844 y 360×640, con y sin carrera guardada: CA-16 a CA-20; tocar la fila, "Volver a Retos" y "Salir"; pestaña de red (CA-22); con la red cortada, el aviso de RF-26.
4. `git diff --stat origin/main` (CA-25).

### Riesgos
- **Primer pantallazo (estimado desde el CSS, no medido):** la fila suma su alto (56 px mínimo de `.record`) más los 20 px de separación de `#app`. "Tu récord", que va después del botón de Retos, puede quedar fuera de 844 px. No es requisito; se informa en CA-16. La fila nueva sí tiene que entrar.
- **Altura:** con dos líneas, la fila crece por encima de 56 px. CA-19 mide el mínimo; se informa el alto real.
- **Paquete principal:** marcado y dos reglas de CSS. CA-23 lo mide con tope de 1.000 bytes comprimidos; no se estima.
- **Sin red:** la primera descarga es el paquete de Retos, y `abrirRetos` la captura con `sinPaquete` (alerta), no con la pantalla de Retos. Es el mismo comportamiento que el botón "Retos Fútbol".
