# Plan: continuar mi carrera

Deriva de `spec.md` de esta carpeta. Cada `RF-nn` está cubierto en "Cobertura". Nada de lo que sigue lo pide ningún requisito de más.

## Lo que se leyó antes de diseñar
- `src/engine/engine.ts`, clase `Career`: el estado que decide el futuro no está solo en `player`. Campos privados: `usedOnce` (Set), `lastSeen` (Map), `recentCategories`, `suitor` (un `Club`), `pending` (el `GameEvent` ya armado, con textos y desenlaces), `agenda` (lo que falta por sacar), `hechas`, `de`, `ritmoK`, `mjHecho`, `escala`. `stats` es solo para `scripts/simulate.ts`: no se guarda. `home`, `homeClubs` y `abroadClubs` salen de `setup.country`: se recalculan.
- `src/engine/rng.ts`: `createRng(seed)` es mulberry32 con un único `uint32` interno `a` que arranca en `seed >>> 0`. Por eso `createRng(a_actual)` continúa exactamente la misma secuencia: solo falta poder leer `a`. No hay otra fuente de azar en el motor (`Math.random` y `Date.now` no aparecen en `src/engine/`, salvo el seed por defecto del constructor). `herencia` usa un rng derivado del seed, pero su resultado ya está en `player.herencia`.
- Lo que ocurre entre `choose()` y la siguiente decisión es determinista dado el estado: `advance()` simula la temporada y saca la siguiente decisión con el mismo rng. Por eso guardar el estado exacto en cada pantalla estable basta para la "misma carrera".
- `src/ui/minigames.ts`: el minijuego llama a `career.choose(0, score)` al resolverse (callback `resolve`) y redibuja al pulsar "Continuar". En modo por turnos usa `career.rng` antes de resolver; en el modo normal la jugada usa `Math.random` (deuda `ponytail` documentada, S-3). Si la pestaña se oculta a mitad de juego vuelve al inicio (`specs/minijuegos` RF-15): retomar "al inicio del minijuego" es el mismo comportamiento.
- `src/main.ts`: un único `new Career(setup)` (formulario) y un único `finish()`. `gameScreen()` se llama tras cada `choose`, tras volver de la tienda y tras `advance()` sin temporada; sin decisión ni desenlace llama a `advance()`. `seasonSummary()` se llama solo desde `advance()` y desde la tienda. `tiendaScreen(volver)` tiene un `draw` que corre tras cada compra. `home()` pinta con `esc()` y ya sabe que `localStorage` es editable. El formulario limita el nombre a 16 y el apellido a 18 caracteres.
- `src/ui/avatar.ts` (`SKIN_TONES`, `HAIR_STYLES`...) y `src/ui/avatar-editor.ts` (`avatarDeCodigo`): validación de avatar ya escrita; se reutiliza.
- `src/engine/tienda.ts`: `CATALOGO`, `itemById`. `itemById(c.id)!` revienta con un id desconocido: hay que validar contra el catálogo.
- `src/engine/clubs.ts`: `clubById` lanza si no existe; `ALL_CLUBS.find` no. `viewClub(club, home)` reconstruye la vista de un club extranjero.
- `specs/contador-carreras/plan.md`: "retomar una carrera guardada no pasa por `new Career(setup)` desde el formulario, así que no cuenta (RF-03); esa feature deberá conservar esa propiedad". La prueba de contador ya fija que `main.ts` tiene exactamente un `contarCarrera('iniciada')` después de `new Career(` y antes de `debut();`.
- Medición hecha para este plan (40 carreras de 102 decisiones, `JSON.stringify` de `player` más decisión pendiente): máximo 22 995 caracteres. El tope de 200 000 deja casi 9 veces de margen.
- `privacidad.html`: la sección "Qué queda solo en tu navegador" dice que "los datos de tu jugador y el historial de tus carreras quedan solo en tu navegador". Hay que ampliarla; no se menciona hoy `BEST_KEY` ni `LAST_SETUP_KEY` (hallazgo, no se arregla aquí).

## Decisión de diseño: estado exacto en cada pantalla estable
Se descartó guardar un registro de elecciones y reproducirlas: cualquier cambio del motor entre despliegues (otras ramas lo tocan) daría una carrera distinta con el mismo registro, en silencio. Se guarda el estado, no la historia (D-1).

### Puntos de guardado (RF-01) y por qué esos
| Punto | Dónde en `main.ts` | Por qué |
|---|---|---|
| Creación del jugador | justo después de `contarCarrera('iniciada');` en el envío del formulario | Cierra la ventana entre crear y la primera pantalla de juego. También borra la carrera anterior (D-4). |
| Cada pantalla de decisión, minijuego o desenlace | primera línea de `gameScreen()` | Cubre después de `choose`, después de `start`, después de `advance` sin temporada y después de volver de la tienda. Con `!ev && !res && !isOver` guarda y luego llama a `advance()`: inofensivo. |
| Resolución de un minijuego | el callback `resolve` que se le pasa a `mountMinigame` | El resultado se ve en una pantalla propia antes de "Continuar". Sin este punto, cerrar ahí permitiría repetir la jugada (RF-05). |
| Compra, contratación o despido | `draw` de `tiendaScreen` | `buy` puede gastar azar (riesgo social) y cambia saldo y fama: perderlo cambiaría la carrera. |

No se guarda desde `render()` (lo llaman el Home y el ranking: podría resucitar una carrera terminada) ni en `seasonSummary()`. Si se cierra en el resumen de temporada, lo guardado es el desenlace anterior con "Seguir": retomar vuelve a simular la misma temporada con el mismo azar y muestra el mismo resumen (RF-04). Si se visitó la tienda desde el resumen, lo guardado es la decisión nueva: el resumen no se vuelve a ver, pero la temporada ya está en el historial. Aceptado.

Qué pasa a mitad de un minijuego (RF-05): lo guardado tiene la decisión pendiente con `minigame` (tipo y dificultad ya calculados) y se retoma en su pantalla "Listo cuando vos quieras". Lo gastado del rng en modo por turnos antes de resolver no se guarda; es parte de la jugada que se pierde.

## Archivos
Nuevos:
- `scripts/continuar-carrera.hijo.ts`: ayudante de la prueba (restaura un estado en un proceso nuevo y lo juega hasta el retiro). No es una prueba por sí mismo.
- `src/engine/guardado.ts`: formato, validación y (de)serialización. Puro: sin DOM ni almacenamiento, importable desde Node.
- `src/continuar-carrera.ts`: acceso al almacenamiento, clave, bloque del Home y aviso. Recibe el almacenamiento como parámetro (por defecto el del navegador, con `try/catch`) para poder probarlo.
- `scripts/continuar-carrera.test.ts`: todas las pruebas (`npx tsx scripts/continuar-carrera.test.ts`).

Modificados: `src/engine/rng.ts` (accesor del estado), `src/engine/engine.ts` (exportar y restaurar), `src/main.ts` (líneas puntuales), `src/style.css` (solo el bloque del Home si hace falta), `privacidad.html` (una sección y una frase y la fecha).
No se toca: `api/`, `db/`, `src/engine/` salvo lo anterior, `ui/minigames.ts`, `ui/tienda.ts`, `package.json`, `specs/backlog.md`.

## Cambios en el motor (mínimos)
`src/engine/rng.ts`:
```ts
export type RngConEstado = Rng & { estado(): number };
export function createRng(seed: number): RngConEstado   // misma secuencia; .estado() devuelve `a`
```
`createRng(estado)` retoma la secuencia (porque `a` inicial es el seed). Sin cambio de comportamiento: lo prueba que las pruebas existentes (`scripts/puntos.test.ts`, `motor.test.ts`, `ritmo`) y `npm run simulate` siguen igual.

`src/engine/engine.ts`:
- `readonly rng: RngConEstado`.
- `export interface EstadoMotor { rng: number; player: Player; usedOnce: string[]; lastSeen: [string, number][]; recentCategories: EventCategory[]; suitor: string | null; pending: GameEvent | null; agenda: Item[]; hechas: number; de: number; ritmoK: number; mjHecho: boolean; escala: number }`.
- `exportar(): EstadoMotor` (devuelve referencias; quien guarda las serializa de inmediato).
- Constructor: `constructor(setup: PlayerSetup, seed = Date.now(), estado?: EstadoMotor)`. Con `estado`, usa `createRng(estado.rng)`, calcula `home`, `homeClubs`, `abroadClubs` como siempre, asigna el resto desde `estado` (el `suitor` como `viewClub(clubById(id), this.home)`) y **no** corre el sorteo del debut ni `signContract`: retorna antes. Sin `estado` el constructor queda igual.
- `static restaurar(e: EstadoMotor): Career { return new Career(e.player.setup, 0, e); }`. Es el único camino de retomar; `main.ts` no escribe un segundo `new Career(`.

## Formato guardado (`src/engine/guardado.ts`)
Clave de almacenamiento: `chamusqueros:carrera` (una sola, RF-02), en `src/continuar-carrera.ts`.
```
{ "v": 1, "motor": EstadoMotor, "desenlace": Resolution | null }
```
`FORMATO = 1`. Se sube el número a mano cuando cambia la forma de `Player`, de la agenda o de `EstadoMotor` (sin él, una carrera vieja que no valida simplemente se descarta; subirlo evita que valide mal una forma que cambió de significado). El recordatorio vive en la cabecera de `guardado.ts` y en la prueba de ida y vuelta (CA-1), que falla si el validador no conoce un campo nuevo (no se toca `types.ts`).

`MAX_CARACTERES = 200_000` (RF-13).

### API
```ts
serializar(c: Career, desenlace: Resolution | null): string | null    // null si pasa de MAX_CARACTERES
leer(texto: string): { career: Career; desenlace: Resolution | null } | null   // todo o nada; nunca lanza
```
`leer`: (1) si `texto.length > MAX_CARACTERES` → null, antes de `JSON.parse`; (2) `JSON.parse` en `try`; (3) `v === FORMATO` exacto; (4) valida y **construye una copia nueva** campo a campo (A08: no se usa el objeto leído); (5) `Career.restaurar(copia)`; (6) prueba de humo en el mismo `try`: lee `career.club`, `career.nt`, `career.saldo`, `career.progreso` y `career.pendingEvent`; cualquier excepción → null.

### Validador (compacto, a mano, sin dependencias)
Unas pocas funciones de 1 a 3 líneas que lanzan ante un valor malo y devuelven el valor limpio: `ent(min,max)`, `num(min,max)` (finito), `txt(max)`, `bool`, `uno(...valores)`, `lista(v,max)`, `forma({campo: v,...}, {opcionales})`. `forma` rechaza claves desconocidas y faltantes (la forzosidad que obliga a mantener el validador al día) y construye el objeto resultado desde cero. Todo el módulo apunta a unas 120 líneas.

| Campo | Regla |
|---|---|
| `rng` | entero 0 a 2^32 − 1 |
| `player.setup` | `firstName` 0 a 16 caracteres, `lastName` 1 a 18; `country` en `COUNTRIES`; `dept` una de las regiones de su país (el motor lo usa como clave de una tabla: `constructor` rompería `findClub('home')`); `position` en `POSITION_NAMES`; `foot` y `mode` en sus listas; `number` entero 1 a 99; `avatar` por los índices de las listas (como `avatarDeCodigo`) |
| `player` numéricos | `age` entero 16 a 60; `year` entero `START_YEAR` a `START_YEAR + 60`; `rating`, `potential`, `peakRating` 0 a 97; `morale`, `fitness`, `coach` 0 a 100; `fame` 0 a 9999; `injurySeasons` 0 a 60; `ntLevel` 0 a 3; `caps`, `natGoals` 0 a 5000; `wcProgress` 0 a 3 |
| `player.clubId` | existe en `ALL_CLUBS` |
| `player.seasons` | hasta 50; cada `SeasonRecord`: `label` con la forma `^\d{4}-\d{2}$` (hoy se pinta sin escapar);  números finitos acotados, `tier` 0 a 3, `clubId` existente, `titles` hasta 30 textos, `awards` hasta 30 `{kind en AwardKind, name ≤ 120, label opcional ≤ 60}`, `nt` opcional con `matches` (hasta 40) y `groups` (hasta 8, `table` hasta 24 filas: la ronda final de Conmebol tiene 10 equipos) con textos ≤ 120 y números acotados, `gastos` opcional con `despidos` hasta 8 textos ≤ 200 |
| `titles`, `awards`, `milestones` | hasta 300 textos de hasta 160 caracteres |
| `flags` | hasta 200 entradas; clave que cumple `^[A-Za-z][A-Za-z0-9_-]{0,79}$` y no es una propiedad de `Object.prototype` (las banderas reales traen mayúsculas, `golClasico`, `nac_no_DE`, y ids de club con guion, `amor_club_ar-barracas-central`: el patrón de solo minúsculas del diseño inicial habría rechazado carreras legítimas); valor entero 0 a 1000 |
| `contract` | `salary` 0 a 1e12, `until` entero `START_YEAR` a `START_YEAR + 80` |
| `compras`, `personal` | hasta 600 y 4 entradas (la vida social se puede comprar sin límite por temporada; 600 compras caben holgadas en 200 000 caracteres); `id` existe en `CATALOGO` (por `itemById`); números acotados |
| `cambioSel`, `herencia` | opcionales; países en `COUNTRIES`; `via`, `side` en sus listas |
| `retired` | booleano |
| `usedOnce`, `lastSeen` | hasta 400 entradas; ids ≤ 80 caracteres; `lastSeen` valor entero 0 a 60 |
| `recentCategories` | hasta 3, categorías del tipo `EventCategory` |
| `suitor` | `null` o club existente |
| `agenda` | hasta 12 pasos; `k` en el conjunto cerrado de `Item` (`retiro`, `oferta`, `consecuencia`, `ritmo`, `paso`, `entrada`, `nac`); `cat` en `EventCategory` donde aplique; `id` ≤ 80 en `nac` |
| `hechas`, `de`, `ritmoK`, `escala` | enteros 0 a 20 (`escala`: número 0 a 1) |
| `pending` | `null` o `GameEvent`: `id` ≤ 80, `category` válida, `title` ≤ 160, `text` ≤ 1 500, hasta 8 opciones con `label` ≤ 400 y hasta 3 desenlaces `{p 0 a 1, text ≤ 600, effects}`; `effects` con solo las claves de `Effects`: numéricos acotados a ±200 (`injury` ±10), `transfer` en su lista, `transferTo` club existente, `position` en `Position`, `retire` booleano, `flag`/`unflag` texto o hasta 8 textos, `milestone` ≤ 160, `ntLevel`, `natTeam` país existente, `contract`; `offers` opcional hasta 4 con `clubId` existente; `minigame` opcional con `kind` en `MinigameKind` y `difficulty` 0,1 a 0,9; `clase` opcional. Si es minijuego, la opción 0 tiene exactamente 3 desenlaces (como exige `choose`) |
| `desenlace` | No puede haber desenlace si hay decisión pendiente (invariante añadida en la implementación: con ambos, "Seguir" lanza `Falta resolver la decisión pendiente`). `null` o `{text ≤ 600, changes hasta 12 textos ≤ 80, result opcional en 'ok'|'half'|'fail'}` |

Las longitudes de texto de la tabla se aflojaron al implementar (título 300, texto de decisión 3 000, etiqueta de opción 800, texto de desenlace 1 500, listas de textos hasta 300 de 300 caracteres; todas muy por debajo de 10 001, que sigue rechazándose). Las cotas son holgadas respecto de lo que produce el motor hoy (medido con `npm run simulate`); T-04 las contrasta con 200 carreras simuladas para que ninguna carrera legítima se rechace. El criterio de diseño es "no romper y no inyectar", no impedir la trampa (el puntaje del ranking ya lo calcula el cliente; deuda aceptada en el backlog). No se validan invariantes cruzadas del tipo "edad = 16 + temporadas": una futura rama podría cambiarlas y rechazar carreras buenas.

Reglas de seguridad del validador: las claves de `flags` pasan por patrón y lista de exclusión antes de usarse como clave; el objeto de `flags` resultante es uno nuevo `{}` al que se asigna por clave validada; no se copian claves del objeto leído que no estén en la forma.

## Módulo del navegador (`src/continuar-carrera.ts`)
```ts
export const CLAVE = 'chamusqueros:carrera';
export function guardarCarrera<T extends Resolution | null>(c: Career, d: T, a?: Almacen): T   // devuelve d para poder usarse en línea
export function borrarCarrera(a?: Almacen): void
export function leerCarrera(a?: Almacen): { career: Career; desenlace: Resolution | null } | 'descartada' | null
export function hayCarreraGuardada(a?: Almacen): boolean   // solo la presencia de la entrada
export function bloqueContinuar(c: Career): string       // HTML del Home, todo con esc()
export const AVISO_DESCARTADA: string                    // "No pudimos recuperar tu carrera guardada. Empezá una nueva."
export const AVISO_FORMULARIO: string
```
`Almacen = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>`; por defecto `localStorage` dentro de `try` (si el acceso lanza, es `null` y todo es un no-op).
- `guardarCarrera`: `serializar`; si da `null` o `setItem` lanza, intenta `removeItem` (RF-13) y sigue. Nunca lanza.
- `leerCarrera`: sin entrada → `null`; con entrada válida → la carrera; con entrada inválida → `removeItem` y `'descartada'` (RF-11). Nunca lanza.
- `bloqueContinuar`: botón `data-go="continuar"` con `class="btn big"`, texto exacto "Continuar mi carrera", y una línea `small` con nombre, posición, edad, temporada y club, cada dato con `esc()`. Sin `innerHTML` de nada que no pase por `esc`.
- Nada de este módulo importa `contador-carreras`. La prueba lo comprueba (RF-08).

## Cambios en `src/main.ts` (localizados; otras ramas lo tocan)
Sin reformatear ni mover nada. Cada punto (10 en total) es una línea o pocas, y se verifica con `git diff --stat src/main.ts` (solo agregados, salvo la línea del callback de minijuego y la de `home()` que cambia de estilo el primer botón).
1. Import al final del bloque de imports: `import { AVISO_DESCARTADA, AVISO_FORMULARIO, bloqueContinuar, borrarCarrera, guardarCarrera, hayCarreraGuardada, leerCarrera } from './continuar-carrera';`.
2. Envío del formulario: tras `contarCarrera('iniciada');` agregar `borrarCarrera(); guardarCarrera(career, null);`. No se mueve ni se toca la línea de `new Career(setup)` ni la del contador.
3. `gameScreen()`: primera línea `guardarCarrera(career!, lastResolution);`.
4. `mountMinigame(...)`: el callback pasa a `(score) => guardarCarrera(career!, (lastResolution = career!.choose(0, score)))`.
5. `tiendaScreen`, dentro de `draw`: `guardarCarrera(career!, lastResolution);`.
6. `finish()`: `borrarCarrera();` justo debajo de `contarCarrera('terminada');`.
7. `home()`: `const g = leerCarrera();` al inicio; si `g` es una carrera, `bloqueContinuar(g.career)` va antes de `go('start', ...)` y ese primer botón de empezar pasa a `btn secondary`; si es `'descartada'`, un `<p class="aviso">` con `AVISO_DESCARTADA` en el mismo sitio y el primer "Empezar mi carrera" sigue siendo el botón principal (sin carrera que continuar no hay otra acción principal; `tasks.md` T-07 decía `btn secondary` también con el aviso y se descartó: el RF-11 pide que quede "disponible"). El segundo "Empezar mi carrera" (cierre) no cambia. `destino` gana `continuar: continuarCarrera`.
8. Función nueva `continuarCarrera()`, junto a `debut()`:
   ```ts
   function continuarCarrera() {
     const g = leerCarrera();
     if (!g || g === 'descartada') return home();
     career = g.career; lastResolution = g.desenlace; freshSeasons = 0;
     if (career.isOver && !lastResolution) return finish();
     if (!career.pendingEvent && !lastResolution && !career.player.seasons.length) return debut();
     gameScreen();
   }
   ```
   No contiene `contarCarrera` (RF-08, CA-3). Cubre los cuatro destinos de RF-07.
9. Formulario (`createForm`): si `hayCarreraGuardada()` (solo mira que la entrada exista, sin validarla ni consumirla), una línea con `AVISO_FORMULARIO` cerca del botón de crear (RF-10). Si la entrada resultara inválida, igual se sobrescribe al crear.

10. Escapado (RF-12): `${r.label}` pasa a `${esc(r.label)}` en `seasonCard` y `seasonRow`, y cualquier otra interpolación de texto de la carrera sin `esc(` que la auditoría estática encuentre. Cambios de una expresión, sin reformatear.

Home y CA-1 de `specs/home-landing` (RF-06, CA-8): se mide en la tarea T-09 a 360x640 con una carrera guardada de nombre largo. Si "Empezar mi carrera" no queda a 560 px o menos, palancas en este orden: ocultar la frase del héroe cuando hay carrera guardada, reducir el `h1` con `clamp` (como autoriza el plan de `home-landing`), reducir el relleno del bloque. No se quita contenido de la landing para quien no tiene carrera guardada.

## Contador (RF-08)
Sin cambios en `src/contador-carreras.ts` ni en el servidor. Tres propiedades fijadas por prueba (CA-3): (a) `main.ts` sigue teniendo un único `new Career(`, un único `contarCarrera('iniciada')` justo después, antes de `debut();`; (b) `src/continuar-carrera.ts` y la función `continuarCarrera` de `main.ts` no contienen `contarCarrera`; (c) con `fetch` falso, `leerCarrera` + `Career` restaurada hacen 0 peticiones. Llegar a `finish()` desde una carrera retomada manda "terminada" porque `finish()` no cambia (S-6).

## Pruebas (`scripts/continuar-carrera.test.ts`)
Sin DOM: usa un almacenamiento falso (objeto con `getItem`/`setItem`/`removeItem`), un `fetch` falso global para contar llamadas y el patrón de `scripts/motor.test.ts` (`node:assert/strict`, ejecución con `npx tsx`).
- **Ida y vuelta y misma carrera (CA-1, CA-13).** Dos niveles: todos los cortes en el mismo proceso (barato, cubre la lógica) y, además, al menos 5 cortes por carrera cuya restauración y continuación corren en un proceso hijo nuevo (`execFileSync(process.execPath, ['--import', 'tsx', 'scripts/continuar-carrera.hijo.ts'], { input })`, que lee el estado y la política por entrada estándar y devuelve el resultado final), para que la memoria de clasificación de `ritmo.ts` empiece vacía como en una página recién abierta. Son ~120 procesos; si el total pasa de 2 minutos se reducen los cortes por carrera a 3, nunca a 0. Política determinista y función solo del estado (así retomar desde cualquier punto da lo mismo; un contador de pasos externo no sobrevive a un corte) que elige `(temporadas * 7 + n * 3) % opciones.length`, resuelve minijuegos con puntaje fijo 0,55, y en cada pantalla estable compra el ítem más caro que alcance y contrata si puede (para ejercitar la tienda y su azar). Se juega una carrera de referencia sin cortes y se guarda la serie de estados serializados en cada punto de guardado. Para cada estado k: `leer(estado_k)` → `career`, se sigue con la misma política hasta el retiro, y se compara con `assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)))` el jugador final, `summarize(player)` y `verdictFor(...)`. 24 combinaciones: modos (`intensa`, `normal`, `expres`) × posiciones (`POR`, `DEL`) × 4 países de confederaciones distintas (por ejemplo `GT`, `ES`, `AR` y uno de Asia o África; el implementador toma los códigos de `COUNTRIES`). El nivel del proceso hijo es el que detecta si `claseDe` (memoizada por id) clasificara distinto según el primer jugador que la vio (riesgo 3).
- **Minijuego (CA-2).** Un jugador con minijuego pendiente: restaurar → mismo `minigame`; `choose(0, 0.1)` + `guardarCarrera` → leer: sin pendiente, `desenlace.result === 'fail'`.
- **Validación (CA-5).** Una tabla de mutaciones sobre el JSON de una carrera válida (cada una una línea), cada una debe dar `leer(...) === null` sin excepción; una carrera sana debe leerse y ser una copia (`!==` por referencia en `player`). Contaminación: tras todas, `({} as any).polluted === undefined` y `Object.keys(Object.prototype)` vacío.
- **Contador (CA-3).** Con `fetch` falso, `leerCarrera` y restaurar: 0 llamadas. Lectura del código fuente: `src/continuar-carrera.ts` no contiene `contarCarrera`; `main.ts` tiene un `new Career(`, un `contarCarrera('iniciada')` y ninguna aparición de `contarCarrera` dentro de `function continuarCarrera`.
- **Borrado y una sola entrada (CA-4, CA-10).** Con el almacenamiento falso: guardar A, guardar B → 1 clave; `borrarCarrera` → 0; `main.ts` llama a `borrarCarrera()` dentro de `finish()` y en el envío del formulario (lectura del código).
- **Tamaño y almacenamiento roto (CA-7).** Máximo de tamaño sobre las 24; un almacenamiento cuyo `setItem` lanza, uno cuyo acceso lanza y `null`; estado de más de 200 000 caracteres → no se guarda.
- **Escapado (CA-6).** `bloqueContinuar` con nombre `"><img src=x onerror=window.__x=1>` no contiene `<img`. Auditoría estática de `main.ts`: la prueba busca, dentro de las funciones que pintan datos de la carrera (`playerHead`, `statsBar`, `seasonRow`, `seasonLog`, `seasonCard`, `ntBlock`, `groupTable`, `matchRow`, `seasonSummary`, `gameScreen`, `finish`), las interpolaciones `${...}` de campos de texto del jugador o de sus temporadas sin `esc(` ni conversión a número, y falla ante una no listada como segura. Una ya conocida: `r.label` en `seasonCard` y `seasonRow` (se escapa en esos dos lugares y además el validador fija su forma). `chipClass` solo devuelve literales ('up', 'down' o vacío): seguro, no se toca. El pintado real se verifica en navegador (T-09).
- **Privacidad (CA-14).** `privacidad.html` contiene "Carrera en curso en tu dispositivo", la fecha de actualización del día de la prueba (la que quede en el archivo) y las menciones pedidas.
- **Dependencias (CA-13).** `package.json` y `package-lock.json` sin diferencias (`git diff` vacío, en la verificación manual).
- **A mano en navegador (T-09).** CA-6 (nombre y texto con HTML), CA-8 (medidas a 360x640 y modo oscuro), CA-9 (cuatro destinos), CA-11 y CA-12.

Se corren además las pruebas existentes que dependen del motor: `scripts/puntos.test.ts`, `scripts/trofeos.test.ts`, `scripts/carta.test.ts`, `scripts/contador-carreras.test.ts`, `npm run simulate` (el puntaje medio no debe cambiar: el rng no cambió) y `npm run build`.

## privacidad.html (RF-15)
- Sección nueva "Carrera en curso en tu dispositivo", después de "Qué queda solo en tu navegador" o antes de "Contador de carreras", mismo tono (voseo) y estructura: qué contiene (tu jugador con su nombre, avatar, país, historial, palmarés, compras y la decisión pendiente); dónde (solo el almacenamiento local de tu navegador); que nunca se envía a nuestros servidores; para qué (retomar si se cierra); cuándo se borra (al llegar a la pantalla final y al crear otro jugador); cómo borrarla a mano (borrando los datos del sitio); que hay una sola por dispositivo.
- Ajustar la frase de "Qué queda solo en tu navegador" para que no contradiga ni duplique, sin reescribirla.
- "Última actualización" = fecha del día del cambio.
- Cambio acotado a esas zonas; `terminos.html` no cambia.

## Seguridad (OWASP Top 10 2021), cómo se cumple
| Riesgo | Medida | RF |
|---|---|---|
| A01 | No hay servidor ni acceso nuevo; lo guardado es del origen | RF-14 |
| A02 | No se guarda el id del ranking ni secretos; nada sale del dispositivo; texto de privacidad | RF-14, RF-15 |
| A03 | Escapado en el Home y en el juego; claves de banderas por patrón y sin claves de prototipo; copia nueva en vez del objeto leído | RF-11, RF-12 |
| A04 | Todo o nada con versión exacta; tope de 200 000 caracteres antes de `JSON.parse`; cotas de listas y textos | RF-11, RF-13 |
| A05 | Sin cabeceras ni endpoints nuevos; la CSP sigue en `vercel-headers` | — |
| A06 | Cero dependencias | RF-14 |
| A07 | No aplica | — |
| A08 | La carrera guardada es un dato no confiable: validación estructural y de referencias, prueba de humo del motor tras restaurar, descarte seguro | RF-11 |
| A09 | Sin `console.*`; el descarte no registra contenido guardado | RF-11 |
| A10 | Sin peticiones | RF-14 |

## Riesgos
1. **Validador que rechaza carreras legítimas** (cotas muy justas o un campo nuevo de otra rama). Mitigación: cotas holgadas contrastadas con 200 carreras simuladas (T-04); la prueba CA-1 falla si el validador no conoce un campo, y `forma` rechaza claves desconocidas (obliga a actualizarlo). Si una rama agrega un campo a `Player` o a `Effects` sin actualizar el validador, sus carreras no se pueden retomar y se descartan, nunca se corrompen.
2. **Campos nuevos de otras ramas** (`Player`, `Career`, `Effects`): el cambio de forma exige subir `FORMATO` y actualizar `guardado.ts` en la misma rama. Se anota en la cabecera del módulo y en el reporte de integración.
3. **`claseDe` memoizada por proceso** (`ritmo.ts`): la clase de una plantilla sale de la primera vez que se vio. Si dependiera del estado del jugador, una carrera retomada en una página nueva podría clasificar distinto que la original. La prueba con proceso nuevo (CA-1) lo detecta; si falla, el arreglo es de `ritmo.ts` (clasificar sin depender del jugador) y se avisa al orquestador antes de tocarlo.
4. **Conflictos en `src/main.ts`**: son 10 puntos pequeños. Si hay conflicto, se conservan ambas partes. Es el archivo que más tocan las otras ramas.
5. **Home sin espacio a 360x640** (RF-06): se mide antes de dar por cerrado; palancas definidas arriba.
6. **Dos pestañas** (S-5): sin protección; documentado.
7. **Cuota de almacenamiento y modo privado**: guardar falla en silencio y borra la copia anterior; el jugador pierde la posibilidad de retomar, no la carrera en curso.

## Esfuerzo y riesgo de L
**M alto** (la medida de `specs/backlog.md`): unas 12 tareas, todas pequeñas salvo el validador (T-03), que es la parte más larga. Sería L si: (a) el validador comprobara también invariantes cruzadas y la coherencia económica del jugador (se descarta expresamente); (b) se guardara un registro de elecciones y se reprodujera, o se guardara dentro de cada minijuego (se descartan); o (c) se agregaran varias ranuras o sincronización entre pestañas (fuera de alcance).
**Versión mínima M (si el validador se alarga)**: mantener todo pero validar `seasons[].nt` solo en superficie (arreglos y números acotados, sin tablas de grupos) y el desenlace; el pintado de `nt` lo protege `esc()`. No se recorta el escapado, la versión, el tope ni la prueba de ida y vuelta.

## Cobertura (RF → plan)
| RF | Dónde |
|---|---|
| RF-01 | Tabla de puntos de guardado; cambios 2 a 5 de `main.ts` |
| RF-02 | Clave única `CLAVE`; `guardarCarrera` reemplaza; CA-10 |
| RF-03 | `EstadoMotor` + `Player` + `desenlace`; `exportar` y `restaurar` |
| RF-04 | `createRng(estado)`, estado exacto, prueba de ida y vuelta |
| RF-05 | Punto de guardado del callback del minijuego; `pending` guardado con su `minigame` |
| RF-06 | `bloqueContinuar`, cambio 7 de `main.ts`, medición T-09 |
| RF-07 | `continuarCarrera` (cambio 8) |
| RF-08 | `restaurar` no pasa por el formulario; `continuarCarrera` sin contador; pruebas estáticas |
| RF-09 | Cambios 2 y 6 de `main.ts` |
| RF-10 | Cambio 9 de `main.ts` |
| RF-11 | `leer` y el validador; `leerCarrera` descarta; aviso del Home |
| RF-12 | `esc()` en `bloqueContinuar` y en las pantallas que ya lo usan |
| RF-13 | `MAX_CARACTERES`; `guardarCarrera` silencioso; borra la copia anterior |
| RF-14 | Sin red, sin dependencias; módulo sin importar el contador |
| RF-15 | `privacidad.html` |
