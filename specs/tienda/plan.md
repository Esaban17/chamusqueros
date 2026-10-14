# Plan: tienda de estilo de vida

Stack: el del repo (TypeScript vanilla, Vite, DOM por strings y `render()`, CSS). Sin dependencias nuevas. Dos archivos nuevos en el motor y la interfaz (`src/engine/tienda.ts`, `src/ui/tienda.ts`), uno chico de ayuda (`src/ui/esc.ts`) y cambios acotados en el resto. Las reglas viven en funciones puras de `tienda.ts`; `Career` solo expone métodos delgados que las usan.

## Conflictos con el código actual (y cómo se resuelven)
- **El dinero hoy es `earned(p)`** (suma de `seasons[].salary`) y el encabezado dice "Ganado" (`playerHead`). `earned` no se toca; se agrega `gastado` y `saldo = earned − gastado`, y el encabezado pasa a "Saldo" (cambio explícito a RF-10 de mercado-contratos, ver la spec). `tienda.ts` **no importa `engine.ts`** (engine ya importa tienda: evita el ciclo); recibe el ganado como parámetro y `Career.saldo` lo calcula con `earned(p)`.
- **Las lesiones no se sortean en `simulateSeason`.** Ahí solo se cuenta (`injured = p.injurySeasons > 0` y `p.injurySeasons--`). El riesgo vive en `applyEffects` (`if (e.injury)`), que alimentan 6 resultados de decisiones en `events/`. El pedido asumía lo contrario. Decisión (D-12 de la spec): chef y fisioterapeuta evitan la lesión cuando un resultado la trae, con un sorteo que solo se hace si hay personal; el efecto es chico y el beneficio principal es el físico. No se agrega riesgo base por temporada (cambiaría el balance de todo el juego).
- **El ánimo vuelve a 60 cada temporada** (`progress`: `+(60 − morale) × 0,25`). Un aporte puntual de ánimo por vivienda o asistente se evaporaría en dos temporadas, así que el ánimo base se aplica **por temporada** como corrimiento del punto de retorno: `(60 + bono − morale) × 0,25`. En régimen el ánimo sube lo que dice el bono (tope +8). Mide si mueve demasiado a `starter` (CA-10).
- **El físico antes de los 30 vuelve a 100** (`+(100 − fitness) × 0,3`); desde los 30 cae `randInt(2, 7)` por temporada. Chef y fisioterapeuta solo se notan después de los 30 y tras golpes de eventos. Además `checkForcedRetirement` retira con `age ≥ 33 && fitness ≤ 25` y con `age ≥ 30 && rating < 48`: un físico más alto alarga carreras, y más temporadas son más partidos, goles y `firstDivApps` en el puntaje. **Ese es el canal que más mueve el ranking**, más que la fama: CA-10 mide temporadas por carrera, no solo puntaje.
- **La fama vale 0,15 de puntaje por punto y se acumula; además sube el salario** (`salaryFor`: hasta +25 % con fama 150). Por eso la fama de la tienda es puntual y tiene tope +40 (6 puntos de puntaje como máximo), y el efecto sobre lo ganado es de unos pocos por ciento.
- **El avance de nivel** (`progress`): hasta los 23, `clamp(gap × 0,2 × mood × minutes, 0, 6)`; de 24 a 29, `gap × 0,12`; desde los 30 un declive aleatorio. El entrenador multiplica solo los dos términos de `gap` por `(1 + bono)`, con bono ≤ 0,20. Como `0,2 × mood (máx. 1,4) × minutes (máx. 1) × 1,2 = 0,34` y `0,12 × 1,2 = 0,14`, la ganancia nunca supera la brecha: no hace falta otro tope (se comprueba en CA-6). El potencial no se toca.
- **`esc()` es local de `main.ts`.** La pantalla de tienda se arma en un módulo de `src/ui/` que se prueba sin DOM (CA-13), así que `esc` se mueve a `src/ui/esc.ts` (misma función) y `main.ts` lo importa. Cambio de dos líneas.
- **`Effects` ya sabe mover ánimo, fama, nivel y técnico** con los topes y los textos de cambio ("+4 Ánimo"). Las compras sociales y el escándalo reutilizan `applyEffects` en vez de duplicar esa lógica; no se agregan campos a `Effects`.
- **`simulate` elige una opción al azar y no sabe de compras.** Se agrega un bloque propio con sus carreras propias (sin tienda, política prudente y política que más gasta); el bucle principal, `MJ_BASE` y los veredictos de minijuegos no se tocan. Costo esperado: la corrida completa actual de 5.000 carreras tarda 8 s, y cada pasada nueva simula esas mismas carreras sin las revisiones del bucle principal, así que suma unos segundos (se mide en T6).
- **Coordinación con "premios y trofeos reales"** (toca `AwardKind`, premios en `simulateSeason`, `palmares.ts`, `finish()` y `simulate.ts`; `AwardKind` y los premios ya están en `main`). Para no chocar: los tipos nuevos van **al final** de `Player` y `SeasonRecord`; en `simulateSeason` solo se agregan dos líneas separadas del bloque de premios (el cobro del personal después de `p.seasons.push(record)` y la llamada de bonos antes de `this.progress`); en `finish()` se reemplaza únicamente el panel "Dinero ganado" y no se reordena nada más; `palmares.ts` no se toca y los íconos propios van en `src/ui/tienda.ts`; en `simulate.ts` el bloque nuevo va **entre la sección "Mercado y contratos" y la de "Minijuegos"** (no al final del archivo, donde es probable que otra rama también agregue).

## Archivos
| Archivo | Cambio |
|---|---|
| `src/engine/types.ts` | Al final: `Compra`, `Contratado`; `Player.compras`, `Player.personal` (después de `contract`); `SeasonRecord.gastos?` (después de `salary`). |
| `src/engine/tienda.ts` (nuevo) | Catálogo, constantes y funciones puras: `CATALOGO`, `itemById`, `gastadoDe`, `saldoDe`, `poseidos`, `contratados`, `validar`, `animoBase`, `bonoEntrenador`, `fisicoExtra`, `probEvitaLesion`, `riesgoSocial`, `famaRestante`. Sin DOM, sin `engine.ts`. |
| `src/engine/engine.ts` | Importación; en el constructor, `compras: []` y `personal: []`; getter `saldo`; métodos `buy`, `hire`, `fire`, `preview`, `cobrarPersonal` (privado); dos líneas en `simulateSeason`; tres líneas en `progress`; una condición en `applyEffects` (lesión). |
| `src/ui/esc.ts` (nuevo) | La función `esc` de `main.ts`, exportada. |
| `src/ui/tienda.ts` (nuevo) | `tiendaHtml(c, estado)` (pura, sin DOM al importar), `bindTienda(root, c, estado, volver)` (DOM) e íconos SVG de trazo propios. |
| `src/main.ts` | Importaciones; `esc` importado; `playerHead` ("Saldo"); botón "Tienda" y `tiendaScreen()`; línea de gasto y avisos en `seasonCard`; un panel nuevo en `finish()` en lugar de "Dinero ganado". |
| `src/style.css` | Bloque `.tienda*` al final del archivo. |
| `scripts/simulate.ts` | Un bloque nuevo ("Tienda") entre "Mercado y contratos" y "Minijuegos", y una línea de uso en el encabezado. No toca el bucle principal. |

## Motor

### Datos (`types.ts`, al final de cada interfaz)
```ts
/** Una compra pagada: año en que se hizo, precio pagado y fama que dio (ya acotada por el tope). */
export interface Compra { id: string; year: number; precio: number; fama: number }
/** Un contratado: el id del ítem (rol y estrellas) y el año en que empezó. */
export interface Contratado { id: string; desde: number }
// Player:       compras: Compra[];  personal: Contratado[];     // historial; el saldo se deriva
// SeasonRecord: gastos?: { personal: number; despidos: string[] };  // solo si hubo personal contratado ese cierre
```
Sin migración: el juego no guarda carreras en curso.

### Catálogo (`tienda.ts`)
```ts
export type Espacio = 'vivienda' | 'carro' | 'helicoptero' | 'avion' | 'yate' | 'entrenador' | 'chef' | 'fisio' | 'asistente' | 'social';
export type Categoria = 'vivienda' | 'carros' | 'transporte' | 'personal' | 'social';
export interface Item { id: string; categoria: Categoria; espacio: Espacio; estrellas: 1 | 2 | 3 | 4 | 5; nombre: string; precio: number; animo: number; fama: number; resumen: string }
```
`precio` es la compra única, el gasto puntual (social) o la tarifa por temporada (personal), en quetzales. `animo` es el aporte nominal por temporada (vivienda, carro, transporte, asistente) o el inmediato (social); `fama` es el nominal de una vez. `CATALOGO` se arma desde cuatro tablas pequeñas con las cifras de la spec (vivienda, carros, transporte y vida social con sus nombres; personal como 4 roles × 5 estrellas con una tarifa por estrella y un descriptor por estrella), para que haya un solo lugar donde cambiar un precio. Ids: `vivienda-3`, `carro-5`, `yate-4`, `chef-2`, `social-3`.

Constantes (con `ponytail:` de calibración): `TOPE_ANIMO = 8`, `TOPE_FAMA = 40`, `RESERVA_ELITE = 1.5`, `VENTANA_SOCIAL = 3`, entrenador `0,04 × estrellas`, chef físico `0,4 × estrellas` y lesión `0,03 × estrellas`, fisio físico `0,3 × estrellas` y lesión `0,08 × estrellas`, `TOPE_FISICO = 3`, `TOPE_LESION = 0,40`.

### Funciones puras
- `gastadoDe(p)` = `Σ p.compras[].precio + Σ p.seasons[].gastos?.personal`. `saldoDe(p, ganado)` = `ganado − gastadoDe(p)`.
- `poseidos(p)`: por cada espacio no social ni de personal, el ítem de más estrellas entre sus compras (por construcción es la última). `contratados(p)`: los `Contratado` resueltos a ítems.
- `animoBase(p)` = `TOPE × (1 − e^(−suma/TOPE))`, con `suma` = `Σ animo` de lo poseído más el del asistente contratado. Da 3,73 con suma 5 y 7,16 con suma 18, y nunca llega a 8.
- `bonoEntrenador(p)` (0 si no hay entrenador, o si `p.age > 29`), `fisicoExtra(p)` = `min(TOPE_FISICO, chef + fisio)`, `probEvitaLesion(p)` = `min(TOPE_LESION, 1 − (1 − chef)(1 − fisio))`.
- `riesgoSocial(p)` según las compras sociales con `year ≥ p.year − 2`: 0 o 1 previas → `{ factor: 1, escandalo: 0, distraccion: 0 }`; 2 → `{ 0.5, 0.20, 0.15 }`; 3 o más → `{ 0, 0.45, 0.25 }`.
- `famaRestante(p)` = `TOPE_FAMA − Σ p.compras[].fama` (nunca negativo).
- `validar(p, saldo, id, modo: 'comprar' | 'contratar')` → `{ ok: true, item } | { ok: false, motivo }`. Orden de las comprobaciones: ítem inexistente → jugador retirado → ítem de otro modo ("para eso usa contratar") → ya lo tiene o uno mejor (compra) / mismo nivel (contratar) → saldo insuficiente (`saldo < precio`, con lo que falta) → reserva de élite (`saldo < 1,5 × precio`, con el saldo que pide). Todos los motivos son texto en español que la interfaz muestra sin tocar.

### API de `Career`
```ts
get saldo(): number                                // saldoDe(player, earned(player))
buy(id: string): Resultado                         // vivienda, carro, transporte, social
hire(id: string): Resultado                        // personal
fire(rol: 'entrenador' | 'chef' | 'fisio' | 'asistente'): boolean
preview(id: string): { saldoDespues: number; tarifas: number; alcanza: boolean } | null   // para el aviso de RF-26
type Resultado = { ok: true; text: string; changes: string[] } | { ok: false; motivo: string }
```
- `buy`: `validar` → si es social, se mira `riesgoSocial` **antes** de registrar la compra → se registra `{ id, year: p.year, precio, fama }` → efectos: ánimo y fama vía `applyEffects({ morale, fame })` (con `factor` aplicado y redondeo hacia abajo, y la fama acotada por `famaRestante`; en carros y transporte, la fama es `item.fama − nominal del ítem que reemplaza`, acotada) → si hay riesgo, un solo `rng()` decide entre escándalo, distracción o nada, y se aplica `applyEffects({ fame: −5, morale: −4, coach: −3 })` o `applyEffects({ rating: −1, morale: −2 })`. Sin riesgo (0 o 1 compras previas, y todo lo que no es social) no se consume azar (RF-12, RF-22).
- `hire`: `validar` → quita el contratado del mismo rol si lo hay → agrega `{ id, desde: p.year }`. No cobra: la tarifa se cobra al cierre de la temporada (D-08).
- `fire(rol)`: quita al contratado de ese rol; devuelve si había uno.
- `cobrarPersonal()` (privado), llamado en `simulateSeason` justo después de `p.seasons.push(record)` (el salario de la temporada ya cuenta en `earned`): si no hay personal, nada (`record.gastos` queda sin definir y la carrera es idéntica a la actual). Si hay, `disponible = saldo`, y en orden fijo (entrenador, fisioterapeuta, chef, asistente): si `disponible ≥ tarifa`, se cobra (`disponible −= tarifa`, `personal += tarifa`); si no, se despide (se quita de `p.personal` y se agrega un texto a `despidos`: "Tu chef de primer nivel ★★★★ dejó de trabajar contigo: el saldo no alcanzó"). Al final `record.gastos = { personal, despidos }`. Como cobra contra el saldo disponible, nunca queda negativo (RF-02, RF-15).

### Ganchos en la simulación (un solo cambio por lugar)
- `simulateSeason`: después de `p.seasons.push(record)` → `record.gastos = this.cobrarPersonal()`; y `this.progress(apps / MATCHES[tier], clubTitles, goals)` pasa a recibir un cuarto argumento con los bonos de ese cierre: `{ entrenador: bonoEntrenador(p), animo: animoBase(p), fisico: fisicoExtra(p) }`, calculados **después** del cobro, para que un personal despedido no cuente.
- `progress`: `gap * 0.2 * mood * minutes` pasa a `… * (1 + b.entrenador)` y `gap * 0.12` a `gap * 0.12 * (1 + b.entrenador)`; `(60 - p.morale) * 0.25` pasa a `(60 + b.animo - p.morale) * 0.25`; y después de calcular el físico, `p.fitness = clamp(p.fitness + b.fisico, 20, 100)`. Con bonos en 0 las operaciones son idénticas bit a bit (`x × 1`, `+ 0`), así que RF-22 se cumple sin ramas nuevas.
- `applyEffects`: `if (e.injury)` pasa a `if (e.injury && !evitaLesion())`, donde `evitaLesion()` devuelve `false` sin tocar el azar si `probEvitaLesion(p) === 0` y, si no, `rng() < probEvitaLesion(p)` y agrega el cambio "Lesión evitada" a `changes`. Los 6 resultados con lesión son los únicos afectados.

## Cómo (por RF)
- **RF-01, RF-02, RF-03, RF-04** `gastadoDe` y `saldoDe`; el saldo no se guarda. `validar` rechaza si no alcanza y `buy`/`hire` no escriben nada antes de validar. `playerHead` muestra `cash(career.saldo)` bajo "Saldo". `finish()`: panel nuevo con tres celdas (Ganado, Gastado, Saldo) usando `.money-total` para el saldo y texto chico para las otras dos (no se agrega una quinta celda a `.totals`).
- **RF-05** El saldo y las compras no están en `card` ni en `rankingApi`; `api/ranking.ts` no se toca. Prueba: CA-15.
- **RF-06, RF-07, RF-08** El catálogo de la spec en `tienda.ts`; `simulate` revisa el conteo, la monotonía y las cotas de precio (CA-3, CA-4).
- **RF-09, RF-10, RF-11, RF-12** `validar` y `buy`; el historial es `Player.compras`.
- **RF-13, RF-14, RF-15** `hire`, `fire` y `cobrarPersonal`. En ritmo exprés `playBlock` simula 3 temporadas seguidas y el cobro corre en cada una.
- **RF-16, RF-17** `riesgoSocial` y `buy`.
- **RF-18, RF-19** `animoBase` por temporada en `progress`; la fama se da en `buy` y se acota con `famaRestante`.
- **RF-20, RF-21** Los tres cambios de `progress` y la condición de `applyEffects`.
- **RF-22** Sin ítems, todo bono es 0 y ningún sorteo nuevo corre. Se verifica una vez contra `adc673f` (CA-11).
- **RF-23** Se mide con el bloque "Tienda" de `simulate` (CA-10); si falla, se bajan las constantes de `tienda.ts` y no las probabilidades del resto del motor (T7).
- **RF-24, RF-25, RF-26** Ver Interfaz.
- **RF-27** Ver Interfaz.
- **RF-28** `finish()`: `poseidos(p)` ordenados por precio descendente, los 4 primeros, `Nombre ★★★★★` separados por " · "; vacío no se dibuja.
- **RF-29** `seasonCard`: una línea "Personal: −<monto>" si `r.gastos?.personal`, y cada `despidos` como `<p class="chip down">`.

## Interfaz

### Flujo
`gameScreen()` agrega un botón "Tienda" (secundario, bajo el bloque de decisión o de resultado, antes del historial) solo si `!career.isOver` y no hay un minijuego pendiente sin resolver (`!(ev?.minigame && !lastResolution)`): `mountMinigame` redibuja desde cero al volver y reiniciaría la jugada (no consume el azar al montar, solo con "Simular"). Al pulsarlo se llama a `tiendaScreen()`, que dibuja con `render()` el encabezado (`playerHead()`) y `tiendaHtml(career, estado)`. "Volver al juego" llama a `gameScreen()`, que relee `career.pendingEvent` y `lastResolution` sin cambiarlos (por eso la tienda vuelve al mismo punto, RF-24). El estado de la pantalla es un objeto local de `main.ts`: `{ sel: string | null; aviso: string }`.

### `tiendaHtml` (pura)
De arriba hacia abajo: saldo (`.money-total`); panel "Lo que tienes" (poseídos con estrellas, contratados con su tarifa y "Tarifa total: X por temporada", o "Todavía no tienes nada" si no hay); una sección por categoría, con un acordeón nativo `<details>` por categoría (sin JavaScript, abierta la primera con algo comprable); cada ítem es una tarjeta de una columna con ícono, nombre, estrellas (`<span role="img" aria-label="3 de 5 estrellas">★★★☆☆</span>`), precio con `cash()`, resumen del efecto y un botón de acción (44 px de alto como mínimo). El estado del botón sale de `validar` (sin calcular nada en la interfaz): "Comprar" / "Contratar" / "Cambiar a este nivel", o deshabilitado con el motivo ("Lo tienes", "Te faltan Q40 mil", "Pide un saldo de Q90 M"). Con un ítem seleccionado (`sel`), su tarjeta se reemplaza por el panel de confirmación: ítem, precio, "Saldo después: X", la advertencia de `preview` si `alcanza` es falso ("Con este saldo no podrías pagar a tu personal la próxima temporada: Q6 M"), y los botones "Confirmar" y "Cancelar". Todo dato dinámico pasa por `esc()`. `cash` es la función `moneyShort(home, q)` y se recibe como argumento, para probarla con otra nacionalidad sin DOM.

### `bindTienda`
Delegación de eventos sobre la raíz: seleccionar, cancelar, confirmar (`career.buy` o `career.hire`; con `ok`, el aviso pasa a `res.text`, `sel` se borra y se vuelve a dibujar; con `!ok`, el aviso es `res.motivo`), despedir (`career.fire`) y "Volver al juego". No hay `confirm()` ni `alert()` del navegador.

### Estilo
Bloque `.tienda*` al final de `style.css`, con las variables existentes (`--surface`, `--gold`, `--line`, `--muted`) y el modo oscuro heredado. Una columna a 360 px, `min-height: 44px` en botones, `overflow-wrap: anywhere` en nombres y montos. Estrellas en `--gold`. Sin animaciones nuevas.

### Íconos
Diez trazos de 24×24 (`stroke`, sin relleno), en el estilo de `ICON` de `palmares.ts`, en un `ICONO_TIENDA: Record<Espacio, string>` propio de `src/ui/tienda.ts` (`palmares.ts` no se toca): casa, carro, helicóptero, avión, yate, gorro de chef, silbato (entrenador), cruz médica (fisio), portapapeles (asistente) y confeti (social). Sin imágenes externas.

## Seguridad (OWASP Top 10)
- **A03 Inyección/XSS**: todo texto dinámico de la tienda (nombres, motivos, avisos, montos, despidos) entra a `innerHTML` por `esc()` (ahora en `src/ui/esc.ts`, el mismo que usa `main.ts`). Los nombres del catálogo son constantes del código, pero se escapan igual. Prueba: CA-13 inyecta `<b>x</b>` en un nombre y comprueba el HTML de `tiendaHtml`.
- **A04 Diseño inseguro**: la validación y el invariante del saldo viven en el motor y no en la interfaz (RF-11); `simulate` comprueba el invariante en 5.000 carreras con la política que más gasta (CA-1, CA-2).
- **A08 Integridad de datos**: el estado es local y el navegador puede mentir; editar el saldo o las compras es un riesgo aceptado porque nada de eso va al ranking (RF-05) ni a la carta. El puntaje que sí viaja tiene su tope en `api/ranking.ts` (−100 a 1.000), que no se toca, y CA-15 comprueba que las corridas con tienda quedan debajo.
- **A06 Componentes**: cero dependencias nuevas; las estrellas son texto y los íconos, SVG en línea.
- A01, A02, A05, A07, A09, A10: no aplican (sin cuentas ni accesos nuevos, sin configuración nueva, sin autenticación, sin registros ni peticiones nuevas).

## Pruebas y riesgos

### Bloque "Tienda" de `scripts/simulate.ts`
`TIENDA=off` lo omite; por defecto corre tres pasadas de N carreras con las mismas semillas y las mismas posiciones y ritmos que el bucle principal: **sin tienda**, **prudente** y **máximo**. Cada pasada es su propio bucle (elige opciones al azar, como el principal, y llama a la política tras cada `playBlock`). Las políticas recorren esta prioridad y compran el ítem más caro que pase `validar` y quepa en su regla:

| Orden | Qué | Regla prudente | Regla máximo |
|---|---|---|---|
| 1 | Entrenador, solo con 28 años o menos | tarifa ≤ 15 % del saldo | tarifa ≤ 30 % |
| 2 | Fisioterapeuta, desde los 26 años | tarifa ≤ 15 % | ≤ 30 % |
| 3 | Chef, desde los 26 años | tarifa ≤ 15 % | ≤ 30 % |
| 4 | Vivienda | precio ≤ 40 % del saldo | ≤ 90 % |
| 5 | Asistente | tarifa ≤ 10 % | ≤ 20 % |
| 6 | Carro | precio ≤ 40 % | ≤ 90 % |
| 7 | Vida social, a lo sumo 2 en la ventana de 3 temporadas | precio ≤ 5 % | ≤ 20 % |
| 8 | Transporte de élite | lo que valide, precio ≤ 40 % | ≤ 90 % |

La pasada "máximo" es la **cota superior del impacto**: los criterios de balance (CA-10) se exigen con las dos políticas. Se reporta, por pasada: porcentaje con Mundial, puntaje medio, p90 y máximo, nivel pico medio y el de jugadores con potencial 70 o menos, p99 de (pico − potencial), temporadas por carrera, veredictos, despidos automáticos y lesiones evitadas. Del bloque aparte: p10, p50 y p90 del saldo final por grupo (Guatemala, España/Argentina/Brasil y resto), las 10 compras más comunes, y el porcentaje de carreras que alcanza cada nivel de cada categoría por grupo (CA-4). Revisiones por carrera: saldo = ganado − gastado y ≥ 0 en cada decisión (CA-1), gastado = compras + cobros (CA-5), fama de la tienda ≤ 40 (CA-7), ninguna compra de transporte con ganado final menor que Q67,5 M (CA-4), puntaje máximo < 1.000 (CA-15).
Revisiones directas, sin carreras: rechazos de cada tipo con el estado intacto (CA-2); catálogo, conteo, monotonía y cotas de precio (CA-3, CA-4); `animoBase(5)` y `animoBase(18)` (CA-7); `probEvitaLesion` con 20.000 sorteos (CA-8); 10.000 compras sociales por ventana (CA-9); entrenador de 5 estrellas contra ninguno con dos `Career` de la misma semilla llamando a `progress` por la vía privada (`(career as any).progress(...)`, sin decisiones de por medio, para no divergir el azar) de los 16 a los 29 años y después de los 30 (CA-6); búsqueda de términos de RC-01 a RC-04 sobre todo texto del catálogo y los avisos (CA-12); y `tiendaHtml` con un nombre inyectado, con una nacionalidad española y con 3 de 5 estrellas (CA-13).

### Otras pruebas
- **Huella contra la base** (CA-11): antes de tocar el motor, un script temporal (no se sube) corre 300 carreras en `adc673f` con decisiones al azar y guarda una huella de las temporadas; al final se repite con el motor nuevo sin compras y debe coincidir. Línea base de balance de `adc673f` (5.000 carreras): puntaje medio 107,1, p90 204, máximo 705, 21,0 temporadas, Mundial 10,8 %.
- **`npm run simulate -- 5000`** sigue pasando con todas sus revisiones y sus números no se mueven (la tienda corre en su bloque y el bucle principal no compra).
- **`npm run build`** y una captura en navegador: tienda vacía (saldo 0), con saldo, la confirmación con advertencia, un despido automático, el final con lo comprado, con una nacionalidad no guatemalteca, y a 360 px (sin scroll horizontal y botones de 44 px o más).

### Riesgos
1. **La escala ×10 deja la tienda casi vacía para guatemaltecos** (carrera p90 de Q8,4 M: llegan a 3 estrellas) y el transporte a una fracción chica de carreras. Es lo pedido ("yates y aviones para la élite") y está medido en CA-4; si resulta pobre, se recalibra la tabla sin tocar el diseño.
2. **Chef y fisioterapeuta alargan carreras** por `checkForcedRetirement`. CA-10 pone tope a las temporadas por carrera (+0,5); si falla, baja `TOPE_FISICO` o las estrellas por físico.
3. **El ánimo +8 mueve `starter`** (y `mood` en el avance). Se mide con el nivel pico y los partidos; si mueve demasiado, baja `TOPE_ANIMO`.
4. **Fama y salario**: la fama de la tienda sube un poco el salario futuro (`salaryFor`); efecto estimado de pocos por ciento sobre lo ganado, no se corrige.
5. **El orden fijo de despido** (entrenador, fisioterapeuta, chef, asistente) favorece a quien aparece primero; con saldo corto se conserva el primero que cabe. Es una regla simple y avisada; se puede cambiar a "el más caro primero" sin tocar el resto.
6. **Compra con personal contratado puede dejar sin saldo para pagarlo** en la siguiente temporada; lo cubren el aviso de RF-26 y el despido automático (RF-15). La validación no impide esa compra a propósito: el jugador decide.
7. **Choques de fusión** con premios en `types.ts`, `simulateSeason`, `finish()` y `simulate.ts`: acotados por la sección de coordinación; se resuelven al integrar, sin lógica compartida.
8. **Montos en otras monedas**: un precio de Q5.000 en una moneda de poco valor puede verse con muchos dígitos; `moneyShort` ya lo abrevia ("mil", "M"). Se revisa en captura con una nacionalidad de moneda débil.
