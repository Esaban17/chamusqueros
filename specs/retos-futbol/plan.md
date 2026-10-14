# Plan: Retos Fútbol

Stack: el del repo (TypeScript vanilla, Vite, CSS con las variables existentes, Vercel Functions en `api/`). **Sin dependencias nuevas.** Retos vive en su propio módulo (`src/retos/`), se carga con `import()` dinámico (Vite lo separa en otro paquete) y no toca el motor de la carrera.
Diferencia con el resto de la pantalla del repo: Retos arma el DOM con `createElement`/`textContent` (ver "Seguridad") y no con strings + `esc()`. `esc()` no está exportada de `main.ts` y no se toca `main.ts` más allá de `home()`.

## Lo que se midió antes de diseñar (Wikidata, 14/10/2026)
Estos datos cambian el diseño respecto de lo pedido; el plan los usa y las tareas los vuelven a comprobar.

1. **`wbsearchentities` + `wbgetentities&props=claims` no sirve como mecanismo principal.** Con "Messi" devuelve primero un apellido, una comuna italiana y objetos astronómicos, y Lionel Messi queda **5.º** de 10; con "Rooney" no aparece ningún futbolista inglés en los 10; con "Hernandez Chicharito" no devuelve nada. Y pedir las `claims` de Messi pesa **829 KB** (la de Cristiano, 739 KB), con 1 a 1,5 s solo en esa segunda llamada.
2. **La búsqueda de texto de la API (`action=query&list=search`) con `haswbstatement:` resuelve la relación del lado de Wikidata**: una sola llamada (0,4 a 0,7 s, payload de unos bytes) devuelve solo futbolistas (`P106=Q937857`) que además cumplan la condición. Encontró "Rooney" (Q266613), "Chicharito" (Q165125, por alias) y rechazó a Messi en México. Se usa esa, y una segunda llamada pequeña (`wbgetentities&props=labels|aliases`, unos KB) para el nombre y la regla de coincidencia. **Es una desviación de lo pedido ("wbsearchentities y luego las claims")**; sigue siendo la API de Wikidata, sus datos CC0 y un host fijo. Si se prefiere el mecanismo literal, solo cambia `buscar()` en la tarea A3 (y se pierden "Rooney" y el apellido solo).
3. **Esa búsqueda también encuentra por alias y texto libre y da falsos positivos**: "Messi" con México devuelve a Emi Mercenari (alias "Mexican Messi") y con Real Madrid a Arda Güler (alias propio). De ahí la **regla de coincidencia estricta** (RF-15), probada hoy: "Messi"/México queda rechazado, "MESSI"/Argentina, "Chicharito"/México y "Rooney"/Inglaterra pasan; "Lionel Mesi" no encuentra nada. Los apodos como "Pescadito" (Carlos Ruiz) **no** valen si la fuente no los tiene como alias completo.
4. **El mapa de países no es 1 a 1**: con nacionalidad `Q21` (Inglaterra) hay 31 futbolistas contra 5.064 con selección `Q21` y 32.672 con `Q145` (Reino Unido, que incluye Escocia y Gales); con `Q55` (Países Bajos) hay 2 contra 8.319 con `Q29999` (Reino de los Países Bajos) y 1.547 con selección `Q55`. Los otros 25 países sí tienen cientos o miles con su propio identificador.
5. **Barcelona (`Q7156`) y Chelsea (`Q9616`) no son "instancia de club de fútbol" (`Q476028`)** y Boca (`Q170703`) es "club deportivo". La verificación de un club no puede exigir `P31=Q476028`; exige país y cantidad de jugadores con ese club (`P54`).
6. **Latencia real**: 2 llamadas = 1 a 2,5 s. Por eso el reloj se detiene al enviar.
7. SPARQL para el banco: la consulta de ganadores del Balón de Oro (`P166`=`Q166177`, calificador `P585`) devuelve 46 filas (faltan años) y **dos ganadores en 2024** (hombre y mujer); la de Mundiales con `P31=Q19317` o `P179=Q19317` devuelve 0 filas. Hay que modelar y validar cada plantilla (ver B1). Ejemplo observado: la edición 2022 (`Q284163`) lleva `P1346` (campeón), `P17` (sede) y `P580`/`P582` (fechas) y su `P31` incluye `Q27020041` ("temporada"); `Q500834` es solo "torneo" y no sirve de ancla.

## Archivos y dueños
Dos agentes en paralelo. Los archivos de uno no se tocan desde el otro; el único compartido (`comun.ts`) es idéntico en ambos.

| Archivo | Dueño | Qué |
|---|---|---|
| `src/retos/comun.ts` | A y B (idéntico) | Contrato A↔B: tipos, `h()` (ver "Interfaz"). |
| `api/_retos.ts` | A | Mapa país/club → identificadores de Wikidata, `NOMBRE_RE`, `normalizar()`, tipos de la respuesta. Compartido con el navegador. El prefijo `_` hace que Vercel no lo publique como ruta. |
| `api/futbolista.ts` | A | Verificación de futbolistas. |
| `scripts/retos-qids.ts` | A | Verificador de identificadores contra Wikidata (en vivo) y contra el juego. |
| `scripts/futbolista.test.ts` | A | Prueba del servicio con `fetch` falso (modelo: `scripts/ranking.test.ts`). |
| `scripts/retos.test.ts` | A | Prueba de la lógica pura del ping pong y del Reto completo. |
| `src/retos/index.ts`, `src/retos/pingpong.ts`, `src/retos/ui-pingpong.ts`, `src/retos/retos.css` | A | Pantallas, marcador, lógica pura del ping pong (`pingpong.ts`, sin DOM) y sus pantallas con el reloj (`ui-pingpong.ts`). Prefijo CSS `rt-`. |
| `src/retos/trivia.ts` | **B** (A deja un stub; gana B) | `jugarTrivia`. |
| `src/retos/trivia.css` | B | Prefijo CSS `rq-`. |
| `src/retos/preguntas.json` | B | Banco generado y verificado. |
| `scripts/preguntas.ts`, `scripts/preguntas/curadas.json` | B | Generar, verificar y escribir el banco. |
| `scripts/trivia.test.ts` | B | Reparto, puntaje, desempate. |
| `src/main.ts` | A | **Solo `home()`** (botón, sección y manejador). |
| `privacidad.html`, `terminos.html` | A | Texto legal. |

No se edita `package.json` (los scripts se corren con `npx tsx scripts/...`, como `scripts/ranking.test.ts`) ni `src/style.css` ni `tsconfig.json`: el CSS de Retos vive en sus propios archivos y TypeScript 5.6 con `moduleResolution: Bundler` ya activa `resolveJsonModule` (comprobado en `typescript/lib/tsc.js`).

## Interfaz A↔B

`src/retos/comun.ts` (copiar tal cual; si el archivo ya existe con este contenido, no hacer nada; en un merge de dos altas idénticas, git no tiene conflicto):

```ts
// Contrato entre el bloque A (estructura, ping pong) y el B (preguntas). Idéntico en ambas ramas.
export type Pareja = [string, string];   // nombres ya saneados (1 a 24 caracteres: hasta 20 más " (1)" o " (2)"); se muestran solo con textContent
export type Indice = 0 | 1;
export interface ResultadoReto {
  ganador: Indice | null;                 // null = empate
  puntos: [number, number];               // aciertos (preguntas) o futbolistas aceptados (ping pong)
}
export interface OpcionesReto { empieza?: Indice }  // quién abre; por defecto 0
/** Pinta una categoría dentro de `contenedor` y devuelve la función que la cancela. */
export type JugarReto = (contenedor: HTMLElement, jugadores: Pareja, onFin: (r: ResultadoReto) => void, opciones?: OpcionesReto) => () => void;

/** Crea un elemento; los textos entran como nodos de texto: nunca se interpretan como marcado. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, string> = {}, ...hijos: (string | Node)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) el.setAttribute(k, v);
  el.append(...hijos);
  return el;
}
```

**Lo que B entrega**: `src/retos/trivia.ts` con `export const jugarTrivia: JugarReto` (nombre exacto, firma exacta), más `preguntas.json`. **Lo que A hace**: integra con una línea, `const { jugarTrivia } = await import('./trivia'); cancelar = jugarTrivia(host, jugadores, alTerminar, { empieza })`.

Reglas del contrato:
1. `jugarTrivia` **vacía y pinta solo dentro de `contenedor`**; el encabezado, el "Salir", el crédito y el pie los pone A fuera del contenedor. No toca `window`, el almacenamiento ni otros nodos.
2. Llama a `onFin` **una sola vez**, después del último comentario de respuesta y de que el jugador toque "Ver resultado". **No** muestra el resultado de la partida: lo muestra A.
3. El valor que devuelve cancela todo (relojes, escuchas) y es idempotente; después de cancelar no se llama a `onFin`.
4. `ResultadoReto.puntos` son los aciertos de cada jugador (sin contar la muerte súbita). `ganador` ya incorpora el desempate.
5. `trivia.ts` **no toca `document` al importarse** (para poder probar su lógica pura con `tsx`) y trae su propio reloj; unificarlo con el de A es una limpieza posterior opcional, no parte de esta entrega.
6. Que A compile sin B: A crea `src/retos/trivia.ts` como **stub** (`export const jugarTrivia: JugarReto = (_c, _j, onFin) => { onFin({ ganador: null, puntos: [0, 0] }); return () => {}; }`, con el comentario "STUB de A: en el merge gana el archivo de B completo"). Regla de merge: **gana el archivo de B entero**; A no lo edita.
7. Los nombres de los jugadores llegan saneados (`Pareja`). B igual los pinta con `h()`/`textContent`.

## Servicio de verificación: `api/futbolista.ts`

Patrón de `api/ranking.ts`: funciones con la firma de la Web (`export async function GET(req: Request)`), `Response.json`, errores con código y cuerpo breve.

**Método y petición**: `GET /api/futbolista?nombre=<texto>&tipo=pais|club&id=<código o id de club>`. Se eligió **GET y no POST** porque una respuesta a un GET con `Cache-Control: s-maxage` la guarda la CDN de Vercel para **todos** los usuarios; un POST nunca se cachea, y la memoria de una función no se comparte entre instancias. El cliente manda el nombre ya normalizado (minúsculas, sin tildes) para que "Messi", "MESSI" y "messi" caigan en la misma entrada de caché.

**Respuesta (200)**: `{ valido: boolean, qid: string | null, nombreCanonico: string | null }`. Cualquier otra cosa es un código HTTP: 400 entrada inválida, 429 límite de uso, 502 Wikidata respondió mal, 504 Wikidata tardó. El cliente trata todo lo que no sea 200 (y los fallos de red y el tiempo de espera) como **no verificable**, no como "inválido".

**Algoritmo**
1. `limitar(ip)` → 429 con `Retry-After`.
2. Validar: `tipo` ∈ {`pais`,`club`}; `id` ∈ claves de `PAISES` o `CLUBES` (lista cerrada); `nombre` cumple `NOMBRE_RE = /^\p{L}[\p{L}\p{M}'’ .-]{1,39}$/u` (2 a 40 caracteres, empieza con letra). Si no, 400 sin consultar a nadie.
3. `t = normalizar(nombre)`: NFD, quitar marcas (`\p{M}`), minúsculas, `[.'’-]` → espacio, espacios colapsados. Si `t` tiene menos de 2 letras, 400. La minúscula neutraliza `AND`/`OR`/`NOT`, que solo son operadores en mayúscula.
4. Caché en memoria por `tipo|id|t`. Si está y no venció, responder.
5. **Buscar** (una llamada, `URLSearchParams`, nada concatenado a mano):
   `action=query&list=search&srsearch="<t>" haswbstatement:P106=Q937857 <filtro>&srlimit=5&srnamespace=0&srprop=&format=json`
   con `<filtro>` = país: `haswbstatement:P27=Qa|P27=Qb|P1532=Qc` (según `PAISES[id]`); club: `haswbstatement:P54=Qclub`. Los QIDs salen del mapa estático, nunca del jugador. `<t>` va **entre comillas** (frase) y ya solo tiene letras y espacios. Cada `title` de la respuesta se valida con `/^Q[1-9]\d{0,9}$/`.
6. Sin resultados → `{ valido:false, qid:null, nombreCanonico:null }`.
7. **Etiquetas** (una llamada): `action=wbgetentities&ids=Q1|Q2|…&props=labels|aliases&languages=es|en&format=json`. Se recorre en el orden de la búsqueda y **el primero que cumpla la regla gana**: `t` debe ser una secuencia **contigua de palabras** de la etiqueta normalizada (es o en), **o** igual a un alias completo normalizado. Ejemplos: "messi" ⊂ "lionel messi" pasa; "messi" ≠ "mexican messi" falla. `nombreCanonico` = etiqueta es, o en si no hay.
8. Si ninguno cumple → `valido:false`. Si cumple → `{ valido:true, qid, nombreCanonico }`.
9. Guardar en la caché y responder.

**Llamadas salientes**: un solo host y ruta fijos, `https://www.wikidata.org/w/api.php`; `fetch(url, { signal: AbortSignal.timeout(2000), redirect: 'error', headers: { 'user-agent': UA, accept: 'application/json' } })`. Plazo total del servicio: 4 s (si la primera llamada consumió más de 2 s, la segunda usa lo que queda). El navegador espera **5 s** y pasa a decisión del rival. `UA = 'Chamusqueros/1.0 (https://chamusqueros.vercel.app/privacidad.html; retos-futbol)'` (la política de Wikimedia pide un agente propio con un contacto; esa página lista el contacto).

**Caché**: (1) CDN: `Cache-Control: public, max-age=0, s-maxage=86400, stale-while-revalidate=86400` si `valido`, `s-maxage=3600` si no; las respuestas de error llevan `no-store`. (2) Memoria por instancia: máximo 1.000 entradas (se descarta la más antigua), vigencia 24 h si `valido` y 1 h si no; los errores no se guardan.

**Límite de uso**: por IP (primera de `x-forwarded-for`, que Vercel fija), 30 solicitudes por 60 s, ventana fija, y un tope de 150 llamadas salientes por minuto por instancia (cortesía con Wikidata). Mapa de IPs con tope de 5.000 entradas (al llegar se limpian las vencidas). `// ponytail: por instancia y de mejor esfuerzo; una regla de "Rate Limiting" en el Firewall de Vercel sería el tope global (configuración, no código).` Las respuestas que salen de la CDN no pasan por la función y no gastan cuota.

**Cabeceras**: `content-type: application/json; charset=utf-8`, `x-content-type-options: nosniff`, sin `access-control-*` (mismo origen).

## Mapa de identificadores (`api/_retos.ts`)

Todo **verificado el 14/10/2026** contra Wikidata (nombre, país y cantidad de futbolistas con ese valor). No se inventó ninguno; `scripts/retos-qids.ts` (A2) los vuelve a comprobar.

**Forma**
```ts
export const PAISES: Record<string, { nac: string[]; sel: string }> = { GT: { nac: ['Q774'], sel: 'Q774' }, … };
export const CLUBES: Record<string, string> = { 'municipal': 'Q1024341', … };   // clave = id del club en el juego
```
Filtro de país: `nac.map(q => 'P27='+q).concat('P1532='+sel).join('|')`. En el juego los clubes de Guatemala conservan sus ids (`municipal`, `xelaju`…) y los demás son `<código>-<nombre>` (ver `src/engine/clubs.ts`).

**Países (27)**: `{ nac: [Q], sel: Q }` con el mismo Q, salvo estas dos.

| Código | Q | País | Futbolistas P27 / P1532 |
|---|---|---|---|
| GT | Q774 | Guatemala | 382 / 41 |
| MX | Q96 | México | 4.313 / 1.028 |
| US | Q30 | Estados Unidos | 9.297 / 5.662 |
| CR | Q800 | Costa Rica | 961 / 209 |
| HN | Q783 | Honduras | 757 / 156 |
| SV | Q792 | El Salvador | 494 / 83 |
| PA | Q804 | Panamá | 437 / 97 |
| AR | Q414 | Argentina | 9.535 / 1.859 |
| BR | Q155 | Brasil | 12.928 / 8.648 |
| CO | Q739 | Colombia | 2.971 / 699 |
| UY | Q77 | Uruguay | 2.936 / 768 |
| CL | Q298 | Chile | 2.537 / 459 |
| PE | Q419 | Perú | 1.905 / 307 |
| EC | Q736 | Ecuador | 1.368 / 270 |
| PY | Q733 | Paraguay | 1.486 / 353 |
| BO | Q750 | Bolivia | 806 / 187 |
| VE | Q717 | Venezuela | 963 / 219 |
| ES | Q29 | España | 12.761 / 2.252 |
| **EN** | **nac `Q21`, sel `Q21`** | Inglaterra | 31 / 5.064 (**no** se usa `Q145`: incluiría a escoceses y galeses) |
| IT | Q38 | Italia | 15.263 / 1.615 |
| DE | Q183 | Alemania | 26.604 / 6.684 |
| FR | Q142 | Francia | 12.936 / 6.191 |
| PT | Q45 | Portugal | 4.520 / 1.085 |
| **NL** | **nac `Q29999`, sel `Q55`** | Países Bajos | 8.319 (Reino) / 1.547 |
| JP | Q17 | Japón | 9.505 / 698 |
| SA | Q851 | Arabia Saudí | 2.264 / 660 |
| MA | Q1028 | Marruecos | 1.393 / 472 |

**Clubes (44)**, `id del juego → Q` y futbolistas con `P54` = ese Q. Se eligieron los más nombrados de cada liga del juego: 12 de Centroamérica, 6 de México y el resto de las ligas grandes y de Sudamérica.

| id del juego | Q | Club | P54 |
|---|---|---|---|
| municipal | Q1024341 | Municipal | 158 |
| comunicaciones | Q1024337 | Comunicaciones | 181 |
| xelaju | Q868872 | Xelajú | 73 |
| antigua | Q2853237 | Antigua GFC | 55 |
| cr-saprissa | Q868582 | Saprissa | 307 |
| cr-alajuelense | Q1322654 | Alajuelense | 264 |
| cr-herediano | Q82429 | Herediano | 258 |
| hn-olimpia | Q1023208 | Olimpia (HN) | 200 |
| hn-motagua | Q1023205 | Motagua | 219 |
| sv-alianza | Q1969256 | Alianza (SV) | 186 |
| sv-aguila | Q932563 | Águila | 197 |
| pa-tauro | Q921299 | Tauro | 95 |
| mx-america | Q459090 | América | 535 |
| mx-guadalajara | Q503321 | Guadalajara | 544 |
| mx-cruz-azul | Q845859 | Cruz Azul | 397 |
| mx-pumas | Q1143000 | Pumas UNAM | 286 |
| mx-tigres | Q849823 | Tigres UANL | 333 |
| mx-monterrey | Q768253 | Monterrey | 322 |
| es-real-madrid | Q8682 | Real Madrid | 829 |
| es-barcelona | Q7156 | FC Barcelona | 1.348 |
| es-atletico-de-madrid | Q8701 | Atlético de Madrid | 808 |
| es-sevilla | Q10329 | Sevilla | 560 |
| es-athletic-club | Q8687 | Athletic Club | 819 |
| en-manchester-united | Q18656 | Manchester United | 1.266 |
| en-manchester-city | Q50602 | Manchester City | 1.162 |
| en-liverpool | Q1130849 | Liverpool (ING) | 1.122 |
| en-chelsea | Q9616 | Chelsea | 915 |
| en-arsenal | Q9617 | Arsenal | 1.112 |
| it-juventus | Q1422 | Juventus | 1.144 |
| it-milan | Q1543 | Milan | 1.273 |
| it-inter-de-milan | Q631 | Inter de Milán | 1.415 |
| it-napoles | Q2641 | Nápoles | 912 |
| de-bayern-munich | Q15789 | Bayern Múnich | 811 |
| de-borussia-dortmund | Q41420 | Borussia Dortmund | 505 |
| fr-paris-saint-germain | Q483020 | París Saint-Germain | 617 |
| pt-benfica | Q131499 | Benfica | 730 |
| pt-oporto | Q128446 | Oporto | 624 |
| nl-ajax | Q81888 | Ajax | 926 |
| ar-boca-juniors | Q170703 | Boca Juniors | 804 |
| ar-river-plate | Q15799 | River Plate | 834 |
| br-flamengo | Q17479 | Flamengo | 1.029 |
| uy-penarol | Q16320 | Peñarol | 649 |
| us-inter-miami | Q16844931 | Inter Miami | 43 |
| sa-al-nassr | Q482764 | Al-Nassr | 386 |

Cuidado con homónimos: `Q1131189` es otro Liverpool (Uruguay), `Q604589` otro Olimpia (Paraguay), `Q4816995` otro Atlético Nacional (Panamá). Los ids del juego de esta tabla se **calcularon** a mano con la regla de `clubs.ts` (`<código>-<slug>`) y no se ejecutaron contra `ALL_CLUBS` (el worktree no tiene `node_modules`); el verificador (A2) comprueba que **existan** y falla si alguno no.
Verificados también (no incluidos, por si se amplía): Villarreal `Q12297`, Valencia `Q10333`, Tottenham `Q18741`, Roma `Q2739`, Lyon `Q704`, Marsella `Q132885`, Sporting `Q75729`, PSV `Q11938`, Palmeiras `Q80964`, Nacional (UY) `Q499616`, LAFC `Q18380286`, Al-Hilal `Q73965`, Colo-Colo `Q207373`, Atlético Nacional `Q332605`.

**Criterio de "verificado"** (`scripts/retos-qids.ts`, en vivo): (a) `wbgetentities` devuelve la entidad y su etiqueta (es o en) corresponde al nombre esperado; (b) su país (`P17`) es el del país del club (para el de Guatemala, `Q774`; Boca/Barcelona/Chelsea no exigen `P31`); (c) `list=search` con `haswbstatement:P106=Q937857 haswbstatement:P54=<Q>` informa 40 o más resultados (`srinfo=totalhits`); (d) para cada país, la misma consulta con su filtro informa 40 o más; (e) cada id de club existe en `ALL_CLUBS`; (f) los 27 códigos de `PAISES` son exactamente los de `COUNTRIES`. Sale con código distinto de 0 si algo falla.

## Ping pong (bloque A)

**Lógica pura (`src/retos/pingpong.ts`, sin DOM al importar)**
- `claveTexto(nombre)`: `normalizar()` de `api/_retos.ts` (la misma que el servidor).
- Estado de la partida: lista de jugadas `{ jugador, texto, qid | null, sinVerificar }`, de quién es el turno, claves usadas (QID cuando hay, texto normalizado siempre).
- `evaluar(estado, jugada)` devuelve `ok`, `repetido` o, según RF-14, la derrota; repetición: mismo QID, o mismo texto normalizado (cubre RF-17 sin verificación).
- `marcadorCompleto(resultados)` para el Reto completo (RF-07): `{ victorias:[n,n], terminado, ganador }` y `abre(categoria)` = 0,1,0.

**Máquina de la partida (UI)**: `relevo` → `turno` → (`verificando` → `decide-rival` | `no-cumple` → `apelar` → `decide-rival`)? → `relevo` | `fin`.
- **Relevo**: título "Turno de {nombre}", último futbolista aceptado y contador, botón "Listo" (autoenfocado). El reloj no existe todavía.
- **Turno**: reloj grande, país o club (con bandera o escudo si los hay) y campo con `<label>` visible ("Escribí un futbolista de {país/club}"), `enterkeyhint="send"`, `autocomplete="off"`, `autocapitalize="words"`, `spellcheck="false"`. `Enter` o el botón envían. Validación local con `NOMBRE_RE`; si falla, mensaje en una región `role="alert"` y el reloj sigue. Un texto ya usado (misma clave normalizada) pierde sin consultar.
- **Reloj**: se calcula con `performance.now()` contra un plazo (no con un contador decreciente), así el segundo plano no regala tiempo (RF-27). Repinta con `setInterval` de 250 ms; el número visible lleva `aria-hidden` y una región `aria-live="polite"` con la clase `.sr` anuncia "15 segundos", "10", "5" y "Se acabó el tiempo". Se detiene al enviar y no se reanuda (cada turno es nuevo).
- **Verificando**: `fetch('/api/futbolista?…', { signal: AbortSignal.timeout(5000) })`; texto "Verificando…" en `role="status"`. 200 → `valido` decide. Cualquier otra cosa → **decide-rival**.
- **Decide-rival**: pantalla "No pudimos verificar a «{texto}». Decide {rival}" con aviso del motivo (sin conexión / tardó mucho / límite de uso) y botones "Vale" y "No vale". Pasa por `textContent`. "Vale" → jugada con `sinVerificar: true`; "No vale" → derrota de quien escribió.
- **No cumple y apelación (RF-34)**: si la fuente responde `valido:false`, pantalla "No encontramos a «{texto}»" con "Apelar" y "Aceptar la derrota". "Apelar" reutiliza `decide-rival` con el título "Apelación: decide {rival}"; "Vale" → jugada con `apelacion: true`; "No vale" → derrota de quien apeló.
- **Fin**: ganador, motivo, conteo y lista completa con "· sin verificar" y "· por apelación" en texto (RF-18). Botones de RF-08.
- Al cancelar (Salir) se aborta el `fetch` (`AbortController`) y se limpian `setInterval` y escuchas.
- Un solo `AbortController` por turno; toques repetidos en "Enviar" se ignoran (el estado pasa a `verificando` antes de cualquier `await`).

## Preguntas (bloque B)

### Banco: `src/retos/preguntas.json`
Arreglo de objetos, un esquema fijo:
```json
{ "id": "mun-2018-campeon", "tema": "mundiales", "dificultad": 1, "pregunta": "¿Qué selección ganó el Mundial de 2018?",
  "opciones": ["Francia", "Croacia", "Bélgica", "Brasil"], "correcta": 0,
  "fuente": "https://www.wikidata.org/wiki/Q…", "verificado": "2026-10-14", "origen": "sparql" }
```
`tema` ∈ `mundiales | champions | balon-de-oro | records | clubes | estadios | centroamerica`; `dificultad` 1, 2 o 3; `origen` ∈ `sparql | curada`; `correcta` es el índice (0 a 3) en el archivo; el orden se baraja al jugar. El archivo **no** se genera a mano: lo escribe `scripts/preguntas.ts`.

### Generación y verificación: `scripts/preguntas.ts`
Corre con `npx tsx scripts/preguntas.ts` (genera y verifica) y `--verificar` (solo verifica el banco existente, sin regenerar). Las consultas SPARQL son **cadenas fijas del script** (no llevan texto de ningún usuario).
1. **Generadas** (origen `sparql`): plantillas por tema contra `https://query.wikidata.org/sparql`, con el mismo agente propio y un tiempo máximo por consulta. Primeras plantillas: campeón y sede de cada Mundial; ganador del Balón de Oro por año (solo premio masculino: se **descartan los años con más de un ganador**); campeón de cada final de Champions; año de fundación de clubes de la lista de Retos; ciudad de un estadio (por el club). Cada plantilla se **calibra primero**: el total de filas se contrasta con el que debe ser (p. ej. 22 Mundiales disputados hasta 2022 más el de 2026 si ya hay campeón, y los años de Balón de Oro desde 1956) y se descarta la plantilla si no cuadra. Las opciones incorrectas salen de entidades del mismo tipo que **no** cumplen la misma relación en Wikidata.
2. **Doble comprobación** de las generadas: la respuesta correcta se vuelve a leer por otra vía (`wbgetentities` de la entidad citada como fuente) y debe coincidir con la de SPARQL.
3. **Curadas** (`scripts/preguntas/curadas.json`, origen `curada`): las que SPARQL no cubre bien (Centroamérica, récords de una edición cerrada, estadios y clubes). **Regla para quien las redacta**: cada pregunta se escribe **leyendo la fuente en esa misma sesión** y la fuente va en el campo; no se escribe nada de memoria. Lo que no se pueda sostener con una fuente, no entra.
4. **Verificador (CA-7)**, para todas: esquema (campos, tipos, 4 opciones distintas no vacías, `correcta` 0 a 3, sin ids repetidos, sin preguntas repetidas); `fuente` con `https:` y host `es.wikipedia.org`, `en.wikipedia.org` o `www.wikidata.org`; la fuente responde 200; **la opción correcta aparece en el texto de la fuente** (extracto de Wikipedia con `action=query&prop=extracts&explaintext=1`, o etiquetas/valores de la entidad de Wikidata), comparando sin tildes ni mayúsculas; las incorrectas **no** son la correcta; mínimos por tema y dificultad (RF-23); lista de palabras vetadas ("actual", "actualmente", "hoy", "vigente", "último", "más reciente") sin una edición cerrada nombrada. Escribe `src/retos/preguntas.json` **solo si todo pasa** y deja un informe (conteos por tema y dificultad).
5. **Límite honesto**: el script confirma que la fuente existe y que contiene la respuesta, no que la pregunta esté bien planteada ni que la opción incorrecta sea realmente falsa en todos los sentidos. Eso lo cubre la revisión manual de 30 preguntas al azar (CA-7), que debe hacerla una persona distinta de quien las generó.

### Modo de juego: `src/retos/trivia.ts` (+ `trivia.css`)
- **Lógica pura** (probada con `tsx`): `repartir(banco, azar)` entrega a cada jugador 5 preguntas con dificultades 1, 1, 2, 2, 3, sin repetirse entre sí ni dentro; elige una pregunta por dificultad y se la asigna al azar a un jugador, y a la otra le da otra de la misma dificultad; baraja las opciones (Fisher-Yates con `Math.random`); `ganador(puntos)`; `muerteSubita(banco, usadas, azar)` hasta 3 rondas con dificultad 2.
- **UI**: relevo ("Turno de {nombre}") → 5 preguntas seguidas del mismo jugador (relevo solo al cambiar de jugador) → relevo → 5 del otro → (muerte súbita si hay empate) → botón "Ver resultado" → `onFin`. Cada pregunta: texto en `<h2>`, reloj de 20 s (mismo criterio de plazo y de anuncios que el de A: 10, 5 y 0), 4 botones de 56 px de alto, atajos 1 a 4, y al responder se marcan "✓ Correcta"/"✗ Incorrecta" con texto, se dice cuál era, y aparece "Siguiente". Solo cuenta la primera respuesta (los botones se deshabilitan al primer toque). Todo con `h()`.
- El JSON se importa estático dentro de `trivia.ts`; como `trivia.ts` se importa dinámicamente desde `index.ts`, el banco viaja en el mismo paquete diferido que el modo (unos 80 KB sin comprimir para 150 preguntas; no pesa en la primera carga).

## Home, navegación y estilos (bloque A)

**`src/main.ts`, solo `home()`** (otras ramas tocan `finish()`, `gameScreen()` y el motor; esas zonas no se tocan):
1. Debajo del botón `go('start', 'Empezar mi carrera')`: `<button class="btn secondary" data-go="retos">Retos Fútbol · duelo de 2</button>`. Se reutilizan `.btn.secondary`; no hay CSS nuevo en `style.css`.
2. Una `<section class="land">` nueva entre "Qué incluye" y el ranking: `h2` "Retos Fútbol", un párrafo ("Jugá de a dos con un solo celular: ping pong de futbolistas por país o por club, y preguntas de fútbol. Gana quien se lleve 2 de 3."), una lista corta de las 3 categorías y un botón `data-go="retos"`. Todo con clases existentes (`.land`, `.feat`).
3. El manejador (última línea de `home()`): de `b.onclick = b.dataset.go === 'start' ? createForm : rankingScreen` pasa a un mapa `{ start: createForm, ranking: rankingScreen, retos: abrirRetos }`, con `const abrirRetos = () => import('./retos/index').then((m) => m.montarRetos(app, home)).catch(() => alert('No se pudo cargar Retos Fútbol. Revisá tu conexión e intentá de nuevo.'))`. **Sin importaciones nuevas arriba de `main.ts`** (menos choque con las ramas de premios y tienda).
4. Lo que no cambia: `index.html` y sus metadatos, `footer()`, `render()`, `createForm`, `rankingScreen`.

**Navegación**: no hay router (`render()` reemplaza el contenido de `#app`). `montarRetos(app, alSalir)` toma `app`, lo vacía, repone la franja `.flag` y pinta las pantallas de Retos con su propio `scrollTo(0)`; `alSalir` es `home`. Dentro de Retos la navegación es una función `ir(pantalla)`. Sin rutas, como la carrera.

**Pantallas de A**: inicio (nombres + 4 opciones) → elegir país o club (`<select>` con `<label>`, más "Al azar"; el de países muestra el aviso de Inglaterra y Países Bajos) → (partida) → resultado → (siguiente categoría o final). Cada pantalla: encabezado con marca y "Salir", `<main>` con el foco en su `<h1 tabindex="-1">` al montarse, y pie con el crédito "Datos de futbolistas: Wikidata (CC0)" (enlace con `rel="noopener noreferrer"`, nueva pestaña) y los enlaces a privacidad y términos.

**CSS** (`src/retos/retos.css`, `src/retos/trivia.css`, importados desde cada módulo, así viajan con el paquete diferido): variables de `style.css` (`--ink`, `--surface`, `--line`, `--celeste`, `--good`, `--bad`), una columna de 560 px como máximo, reloj de al menos 72 px de alto de letra, botones y zonas de 48 a 56 px, `:focus-visible` heredado, `@media (max-height: 420px)` para compactar con el teclado abierto (reloj en línea con el título, sin márgenes grandes) y `@media (prefers-reduced-motion: reduce)` sin transiciones. Estados sin color solo: ✓/✗ con texto.

## Legal (bloque A)
**`privacidad.html`**: sección nueva "Retos Fútbol" con: (1) lo que escribís como futbolista se envía a nuestro servidor, que consulta Wikidata para verificarlo; (2) esa consulta sale de nuestro servidor, no de tu navegador, así que Wikidata (Wikimedia) recibe el texto y la dirección IP de nuestro servidor, no la tuya; (3) no guardamos lo que escribís asociado a ningún dato personal ni a un identificador; hay una **memoria temporal** de resultados (hasta 24 horas, sin identidad) para responder más rápido, y el límite de uso guarda una cuenta temporal por dirección IP en memoria, que se pierde al reiniciarse; (4) Vercel puede guardar registros técnicos de esa petición (ya está dicho arriba: se remite a esa sección); (5) los nombres que ponen los dos jugadores no salen de tu dispositivo ni se guardan; (6) crédito: "Datos de futbolistas: Wikidata, licencia CC0 (https://www.wikidata.org)" y, de buena práctica, no obligatorio. Se ajusta la frase "El juego se conecta a dos servicios externos" aclarando que Retos no suma ninguno desde el navegador. La fecha de "Última actualización" es la del día de la publicación.
**`terminos.html`**: "Gratis y de ficción" pasa a "La carrera es de ficción; Retos Fútbol usa datos reales de fuentes abiertas"; sección nueva "Retos Fútbol": es un juego de entretenimiento, sin premios ni apuestas; los datos de futbolistas vienen de Wikidata y las preguntas de un banco propio con fuentes, pueden contener errores u omisiones y una respuesta marcada como incorrecta puede deberse a un dato faltante; para reportar un error, el correo de contacto del sitio; cuando no se puede verificar, la decisión es del rival.

## Seguridad (OWASP Top 10)
- **A03, inyección en la consulta a Wikidata**: (1) el servicio **nunca** arma SPARQL ni usa texto del usuario en una consulta SPARQL (SPARQL solo existe en `scripts/preguntas.ts`, con cadenas fijas, fuera del servidor); (2) los parámetros viajan por `URLSearchParams` (codificados); (3) el texto va a la búsqueda **solo** tras pasar `NOMBRE_RE` (letras, marcas, espacio, apóstrofo, guion, punto; 2 a 40 caracteres, empieza con letra), normalizado a letras y espacios, en minúsculas, **entre comillas**: no hay `:` ni `"` ni `-` inicial ni paréntesis ni `*`, así que no se pueden agregar `haswbstatement:`, negaciones, frases ni comodines; (4) `tipo` e `id` son listas cerradas; los QIDs de la consulta salen del mapa estático; los `title` que devuelve Wikidata se validan con `^Q[1-9]\d{0,9}$` antes de reutilizarlos.
- **A03, XSS**: ningún dato dinámico entra por `innerHTML`. Retos arma el DOM con `h()`/`textContent`; es **más fuerte** que `esc()` y no depende de una función que `main.ts` no exporta. Vale para nombres de jugadores, `nombreCanonico` (que viene de un tercero), texto escrito, preguntas y opciones. Las únicas cadenas con marcado son constantes del código. (`esc()` se usa solo en `home()`, donde ya estaba.) Prueba: CA-11.
- **A04, abuso del servicio**: validación estricta antes de gastar una llamada, límite por IP (30 por minuto) y tope de llamadas salientes (150 por minuto por instancia), caché en dos niveles, plazo de 4 s, y **el juego no depende del servicio** (RF-17). Se declara que el límite es por instancia y de mejor esfuerzo; el tope global sería una regla de Firewall de Vercel (configuración, opcional: tarea A12). Riesgo aceptado del diseño: sin ranking ni premios no hay incentivo para hacer trampa; el banco de preguntas es público en el paquete.
- **A10, SSRF**: una constante `https://www.wikidata.org/w/api.php`; el host y la ruta no dependen de ninguna entrada; `redirect: 'error'`; solo se reenvían QIDs validados. (`scripts/preguntas.ts` además llama a `query.wikidata.org` y a las fuentes ya validadas por dominio, y corre solo en la máquina del desarrollador.)
- **A05, cabeceras y configuración**: `content-type` declarado, `x-content-type-options: nosniff`, sin CORS, errores con mensaje fijo (sin trazas ni URL de Wikidata). No hay `vercel.json` y no se crea uno: una política de seguridad de contenido para todo el sitio es un hallazgo previo (lo registran `specs/home-landing` y `specs/minijuegos`) y sigue fuera de alcance.
- **A08, integridad**: banco estático versionado en el repositorio; se valida con `scripts/preguntas.ts --verificar` antes de publicar; Retos no carga datos de internet para jugar preguntas ni ejecuta nada que venga de fuera. Wikidata solo entrega texto, que se muestra con `textContent`.
- **A06, componentes**: sin dependencias nuevas; `fetch`, `AbortSignal.timeout` y `Intl`/`\p{L}` son de la plataforma.
- **A01, A02, A07, A09**: no aplican (sin cuentas ni autorización; sin secretos nuevos, el endpoint no usa claves; sin autenticación; los registros son los de Vercel, que la política de privacidad ya menciona).

## Cobertura (RF → dónde)
RF-01 a RF-03: "Home" · RF-04: "Navegación" y "Pantallas" · RF-05 a RF-08: "Pantallas de A", `marcadorCompleto` · RF-09 a RF-12: "Ping pong" · RF-13 a RF-16: "Servicio" (pasos 5 a 8) y `evaluar` · RF-17, RF-18: "Decide-rival", "Fin" · RF-19 a RF-22: "Modo de juego" · RF-23, RF-24: "Banco" y "Verificador" · RF-25 a RF-27: "CSS", "Reloj" · RF-28: no se escribe en almacenamiento (A y B) · RF-29: "Seguridad A03" · RF-30, RF-31: "Pantallas de A", "Legal" · RF-32: carga diferida y CA-12 · RF-33: banco local y RF-17.
Diseño que ningún RF pide: ninguno; el mapa de países por `{ nac, sel }` y la regla de coincidencia salen de las mediciones del inicio.

## Pruebas
- **`scripts/futbolista.test.ts`** (modelo: `ranking.test.ts`; `npx tsx scripts/futbolista.test.ts`): `fetch` falso con respuestas modeladas sobre lo observado hoy (Messi `Q615`; Chicharito `Q165125` con alias; Rooney `Q266613`; `Q141539677` "Emi Mercenari" con alias "Mexican Messi"; `Q108159340` Arda Güler; sin resultados). Cubre CA-2 (los 12 casos), CA-11 (entradas hostiles: `a" haswbstatement:P27=Q96`, `-messi`, `messi:x`, `(messi)`, `*`, 200 letras, `%00`, vacío, `tipo=otro`, `id=zz`: 400 y **cero** llamadas salientes), "toda llamada saliente empieza con `https://www.wikidata.org/w/api.php?`", la ventana del límite (la 31.ª en 60 s da 429; pasada la ventana vuelve a 200), la caché (dos peticiones iguales, una sola llamada saliente) y el comportamiento ante error/tiempo agotado de Wikidata (502/504 sin guardar en caché).
- **`scripts/retos.test.ts`**: `normalizar` ("  LiOnEl   MESSÍ " → "lionel messi"), `evaluar` (repetido por QID y por texto), `marcadorCompleto` (CA-5), y que ningún archivo de `src/retos/` use `innerHTML`, `insertAdjacentHTML` ni `localStorage` (búsqueda de texto: es el comprobante de RF-28/RF-29).
- **`scripts/trivia.test.ts`** (B): CA-6 con 1.000 partidas simuladas, puntaje, muerte súbita.
- **En vivo (humo, a mano, no en CI)**: `npx tsx scripts/retos-qids.ts` (CA-8) y `npx tsx scripts/retos-qids.ts --humo`, que repite la tabla de CA-2 contra Wikidata y mide la latencia (meta: 90 % de las respuestas en 2 s o menos).
- **Navegador (Playwright del entorno, no es dependencia)**: CA-1, CA-3 (reloj controlado con `page.clock`), CA-4 (ruta de red interceptada para devolver 500, tardar 6 s y devolver 429), CA-9, CA-12. B prueba su pantalla sin A con `await import('/src/retos/trivia.ts')` desde `page.evaluate` sobre `vite dev`: no hace falta un arnés.
- **Vista previa de Vercel**: tras el primer despliegue, `vercel curl` a `/api/futbolista?nombre=messi&tipo=pais&id=AR` (según la memoria del proyecto, las previas se prueban con `vercel curl`).

## Riesgos
1. **Resolución del import `api/futbolista.ts` → `./_retos`**: el proyecto es `"type": "module"` y Vercel puede exigir la extensión (`./_retos.js`). Se comprueba en la primera vista previa (tarea A11). Plan B: copiar el mapa dentro de `api/futbolista.ts` y fijar la igualdad con una prueba (el precedente de `COUNTRY_CODES` en `api/ranking.ts`).
2. **Huecos de Wikidata** en ligas chicas (Guatemala: 382 futbolistas con su nacionalidad; Xelajú 73, Antigua 55): un futbolista real puede dar "no cumple". Es la Aclaración 2. Se mide en la prueba en vivo con 20 nombres conocidos de Liga Nacional antes de publicar y se informa el porcentaje.
3. **Índice de búsqueda con retraso**: un jugador agregado hace minutos puede no aparecer. Se acepta.
4. **Alias editables por cualquiera** en Wikidata: la regla de coincidencia reduce, no elimina, los falsos positivos (RF-15). Se acepta; el nombre reconocido se muestra siempre, y el juego es entre amigos.
5. **Datos que cambian**: el banco se congela con su fecha; el 2026-10-14 el Mundial 2026 ya se jugó, así que el campeón sale de la consulta y no de la memoria de quien redacta.
6. **Cuota de Wikidata/WDQS**: el servicio hace 2 llamadas por texto nuevo y se apoya en la CDN; el script del banco corre solo a mano.
7. **Choque de merge** con "premios y trofeos" y "tienda": ver "Coordinación".
8. **Tiempo de espera percibido**: hasta 5 s de "Verificando" en el peor caso; con Wikidata sana, de 1 a 2 s.

## Siguiente fase: Retos en línea (no se construye; costo)
Jugar en dos celulares no es "esta misma pantalla por la red". Lo que costaría:
- **Salas**: crear y unirse con un código, ciclo de vida (lleno, abandono, caducidad), reconexión, y limpiar las abandonadas. Hace falta estado compartido y duradero; hoy el único almacén es Neon.
- **Tiempo real**: las Vercel Functions no mantienen conexiones largas. Habría que usar un servicio de mensajería en tiempo real (canal gestionado) o *polling* sobre la base, con su costo, sus latencias y su cuota.
- **Reloj autoritativo**: el tiempo del turno lo cuenta el servidor, no el navegador (hoy es del cliente); hay que compensar la latencia de cada jugador.
- **Anti-trampa**: en el ping pong el servidor ya valida, pero nadie puede impedir buscar en otra pestaña; en preguntas, las respuestas correctas **no pueden viajar al navegador** antes de responder (el banco pasa al servidor y cada pregunta se sirve por separado); límites por sala y por identidad; abandono para no perder.
- **Identidad y moderación**: nombres visibles para un desconocido (hoy no salen del dispositivo), reportes, y una revisión de privacidad completa (se guardarían nombres, IP, partidas).
- **Pruebas**: simular desconexiones, dos clientes y relojes distintos; es la parte más cara.
Orden de magnitud: es una feature de varias semanas, no una variante de esta. Esta versión no deja ganchos para ella (YAGNI).

## Coordinación con otras ramas
- **"Premios y trofeos reales"** (motor, palmarés, `finish`) y **"tienda"** (motor, `gameScreen`, `simulate`): Retos no toca `src/engine/`, `src/ui/`, `scripts/simulate.ts`, `style.css` ni `package.json`. El único archivo compartido es `src/main.ts`, y solo dentro de `home()`; no se agregan `import` arriba. Si alguna rama cambia `home()`, el conflicto es de una zona acotada.
- **Orden sugerido de integración**: A y B en paralelo, B primero si hay que elegir (A tiene el stub). Un solo PR por bloque o uno combinado; en el merge de `trivia.ts` gana el de B.
- El crédito a Wikidata y las páginas legales no chocan con las ramas de donación y términos: se parte de `origin/main` (que ya trae ambas).
