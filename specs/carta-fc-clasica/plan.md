# Plan: carta FC "Clásica realista" en todos los estilos

Stack: el del repo (TypeScript vanilla, Vite, DOM por strings, canvas 2D). **Sin dependencias nuevas** (RF-31). Un módulo nuevo **puro** (`src/ui/carta-svg.ts`: sin DOM, sin `import.meta`, sin importar `card.ts`), `src/ui/card.ts` reescrito en su parte de dibujo, un cambio acotado en `futCard()` de `src/main.ts`, el bloque `.fut*` de `src/style.css` y una prueba `scripts/carta.test.ts`. No se toca `api/`, `db/`, `package.json` ni `src/ui/avatar.ts`.

## Conflictos con el código actual (y cómo se resuelven)
- **`TIERS` en `card.ts` no sirve para el diseño nuevo** (tiene `bg`, `streaks`, `border`, `shards`, un solo color por capa) y `card.ts` toca el DOM, así que el módulo puro no puede importarlo. Se reemplaza por `ESTILOS` en `carta-svg.ts` (con `label`, el metal y `acento`). `main.ts` deja de importar `TIERS`; `card.ts` también.
- **La imagen de hoy dibuja palmarés, momento, trayectoria y SEL**; la referencia no. Por A1 (resuelta) el **palmarés y el momento destacado se conservan** fuera de la carta, debajo de ella; la trayectoria de clubes y SEL se quitan. `card.ts` sigue importando `bestMoment`, `momentSVG`, `palmares` e `ICON` y conserva `trophySVG` y `wrap`; `TIERS`, `drawBackground`, `cardPath` y `drawCrest` se eliminan.
- **La referencia está hecha con `div` posicionados y CSS** (`text-shadow`, `mask-image`, `drop-shadow`, `mix-blend-mode`), no con SVG puro. Una carta que sirva para HTML y para imagen necesita SVG puro: el texto pasa a `<text>`, el desvanecimiento del retrato a `<mask>`, el relieve del texto a una copia clara desplazada 1 unidad, y la sombra exterior y el halo a una capa externa (CSS en HTML, `shadowBlur` en canvas).
- **La referencia comparte un identificador global** (`#sweepg`) y usa `mix-blend-mode: overlay` para el grano. Aquí cada carta lleva sus propios identificadores y el grano se compone con transparencia normal (D-11).
- **La referencia tiene bandera y escudo fijos** (franjas de Guatemala y un escudo de ejemplo) y atributos fijos. Aquí vienen de los datos.
- **`avatarSVG` devuelve un `<svg>` con rectángulo de fondo `200 x 200`** y un `<text>` con el dorsal (fuente web). La referencia lo quita con una expresión regular. Se hace igual y una prueba comprueba que la expresión sigue encontrando el rectángulo (si la otra rama cambia `avatarSVG`, la prueba falla en lugar de dibujar un cuadrado de color detrás del retrato).
- **`document.fonts.ready` no basta en el canvas**: las fuentes web se descargan al usarse y `ready` no espera pesos que ninguna parte de la página ha pedido. Hoy funciona porque la página ya usa 700, 800 y 900. Con el diseño nuevo se piden explícitamente con `document.fonts.load(...)` los pesos que usa el canvas (ver `drawCareerCard`).
- **Desvío respecto de la decisión 4 del orquestador:** las vallas invictas no entran en `atributos()` (A3, D-04).
- **`DatosCarta` con campos `unknown`:** el plan los tipaba (`pos: Position | null`...); en el código la posición, la media y las cifras entran como `unknown` y `sanear()` los valida adentro (más fuerte para A08: quien llama no puede olvidar el saneo).
- **Desvío menor respecto de la decisión 3:** `cartaSVG(datos, estilo, opciones)` lleva un tercer parámetro (`modo`, `efectos`, `escala`, `id`) porque la imagen necesita el modo `arte`.

## Decisión técnica del canvas

**Se elige: el arte se rasteriza desde el mismo SVG (`cartaSVG` en modo `arte`) cargado como `Image`, y el texto, el retrato, la bandera y el escudo se dibujan con el canvas.**

| Opción | Veredicto | Por qué |
|---|---|---|
| **A. Todo en un SVG cargado como `Image`** | Descartada | Un SVG cargado como imagen **no carga recursos externos**: ni las fuentes web (`Big Shoulders Display`, `Barlow` caen a la fuente del sistema, el nombre sale en otra tipografía), ni la bandera de `flagcdn.com`, ni `/escudos/*.png`. Incrustar las fuentes en base64 agrega cientos de KB al paquete y requiere archivos de fuente que el repo no tiene. |
| **B. Arte como imagen + texto y fotos con el canvas** | **Elegida** | La función única arma el SVG (geometría, metal, textura: lo que no depende de fuentes ni de archivos externos). El texto sale con `fillText` y las fuentes ya cargadas; bandera y escudo con `drawImage` (con CORS anónimo para la bandera); el retrato con una máscara del canvas. La disposición de textos es **una sola tabla** (`LAYOUT` / `textosCarta()`) que alimenta los `<text>` del modo `html` y los `fillText` de la imagen, así que no hay dos diseños que mantener. |
| **C. Dibujo directo con la API del canvas** | Descartada | Reescribe a mano degradados escalonados, patrones, máscaras y los filtros del bisel y el ruido (no hay equivalente en el canvas 2D). Habría dos implementaciones del mismo diseño que se separan con el tiempo. |
| **D. `foreignObject` o una librería que rasterice el DOM** | Descartada | `foreignObject` en un SVG como imagen contamina el canvas en Safari y no carga fuentes; las librerías son dependencia nueva (A06). |

### Filtros de SVG en Safari iOS: respaldo
- `feSpecularLighting` (bisel) y `feTurbulence` (grano y cepillado) existen en todos los motores pero cuestan en WebKit móvil, y el soporte de `mix-blend-mode` dentro de SVG ha sido irregular. **Se evita `mix-blend-mode`** (D-11): el grano y el cepillado son rectángulos con el ruido convertido a transparencia (negro y blanco con alfa), compuestos con la mezcla normal.
- Un solo conmutador `efectos: 'completo' | 'simple'` en `cartaSVG`. **`simple`** quita `feSpecularLighting` y `feTurbulence`: el bisel queda como los dos filetes degradados que ya existen (`ins`, `edge`) más un filete claro adicional; el grano y el cepillado se reemplazan por dos patrones de trama (puntos y líneas diagonales muy finas, constantes en el código, sin azar) del mismo tono.
- **Imagen:** se genera con `completo`. Si no carga (`onerror`) o no está lista a los **1.500 ms**, se genera `simple` en paralelo y se usa la primera que termine. Es robusto sin detectar dispositivo.
- **Carta HTML:** `completo` por defecto. T6 mide; si WebKit lo justifica, el conmutador se activa por defecto en WebKit (decisión con datos, A2).
- El SVG de la imagen lleva `width` y `height` **al tamaño de destino** (570 x 836), además del `viewBox`: sin ellos Firefox no dibuja el SVG con `drawImage` y WebKit lo rasteriza a 300 x 440 y lo agranda borroso. `devicePixelRatio` no aplica a un PNG de 1080 x 1350 exportado.

## `src/ui/carta-svg.ts` (nuevo, puro)

### Tipos y funciones exportadas
```ts
export type Efectos = 'completo' | 'simple';
export interface DatosCarta {
  nombre: string;
  pos: Position | null; media: number | null;               // null = faltante
  apps: number | null; goles: number | null; asist: number | null; titulos: number | null;
  avatar: { a: Avatar; dorsal: number; kit: [string, string] };
  pais: { nombre: string; bandera: string | null; kit: [string, string] };   // bandera = URL ya construida por quien llama
  club: { nombre: string; short: string; colores: [string, string]; escudo: string | null } | null;
}
export interface OpcionesCarta { modo?: 'html' | 'arte'; efectos?: Efectos; escala?: number; id?: string }
export const ESTILOS: Record<CardTier, Estilo>;       // paletas (ver tabla) y etiqueta
export function atributos(d: Pick<DatosCarta, 'pos'|'media'|'apps'|'goles'|'asist'>): { etiqueta: string; valor: number }[] | null;
export function nombreAjustado(nombre: string): { texto: string; tam: number };   // RF-08, por longitud, sin medir
export function textosCarta(d: DatosCarta, estilo: CardTier): ItemTexto[];        // un ItemTexto por texto visible
export function cartaSVG(d: DatosCarta, estilo: CardTier, o?: OpcionesCarta): string;
export const SILUETA: string;                         // el trazo de la referencia, para recortar en canvas con Path2D
export function quitarFondoAvatar(svg: string): string;
```
- `cartaSVG` y `atributos` **sanean sus entradas adentro** (quien llama no puede olvidarlo): `entero(v, min, max)` → número o `null`; `color(v)` → `#rrggbb` o un color neutro; índices de avatar acotados a las listas de `avatar.ts` (`SKIN_TONES`, `HAIR_STYLES`...) y dorsal de 1 a 99; `texto(v)` = quitar caracteres inválidos en XML 1.0 (`/[^\t\n\r -퟿-�\u{10000}-\u{10FFFF}]/gu`), colapsar espacios, recortar a 40 caracteres y pasar por `esc()`.
- **Identificadores únicos:** `id` por defecto sale de un contador del módulo (`cf1`, `cf2`...); `o.id` lo fija (pruebas, capturas reproducibles) y se valida con `/^[a-z][a-z0-9-]{0,20}$/`. Todo identificador interno es `${id}-rim`, `${id}-face`, `${id}-bev`... y toda referencia es `url(#${id}-x)`.
- `modo: 'html'` (por defecto): el SVG completo, con `viewBox="0 0 300 440"`, sin `width`/`height` (el CSS lo dimensiona), `role="img"`, un `aria-label` con estilo, nombre, posición, media y atributos, y todo el contenido interior `aria-hidden`. Incluye el retrato (SVG anidado, máscara y recorte con la silueta), la bandera (`<image>` sobre un rectángulo de franjas de respaldo), el escudo (`<image>` sobre un escudo genérico de respaldo, ver T4), los `<text>` y el brillo (`class="carta-sweep"`).
- `modo: 'arte'`: solo geometría y metal; con `width`/`height` = 300 y 440 por `escala`. **No** emite `<text>`, `<image>`, retrato ni brillo.

### Capas (de abajo hacia arriba), en unidades de carta
Silueta `SILUETA` = `M40 4H260Q260 38 296 38V372Q296 394 270 404Q210 424 150 436Q90 424 30 404Q4 394 4 372V38Q40 38 40 4Z`. La cara es la misma silueta escalada hacia el centro `(150, 220)` con `sx = .93`, `sy = .94`.

1. **Borde**: la silueta con el degradado `rim` (diagonal, siete paradas en 0, .16, .34, .48, .64, .82, 1) y, en `completo`, el filtro de bisel.
2. **Cara**: silueta escalada con el degradado `face` (`x1 .1, y1 0, x2 .7, y2 1`).
3. **Dentro de la cara (recortado)**: halo radial (`cx .64, cy .3, r .55`, color `glow` a .55 de opacidad); 4 rayos `(118,26) (168,10) (212,46) (262,14)` como polígonos que caen a 200 unidades a la izquierda, con degradado blanco que se apaga al 72 %; 3 anillos en `(186,130)` de radios 92, 112 (punteado `2 5`) y 132, color `lat`; rejilla de rombos (patrón de 20 x 20 girado 45°, `lat` a .2 y .14) con la **máscara** vertical que la apaga entre el 15 % y el 62 % de la altura; trama fina (patrón 3 x 3 girado -35°); en el salón de la fama las **facetas**; sombra inferior (negro desde el 55 % de la altura hasta `sombra` de opacidad).
4. **Hundido**: contorno de la cara con degradado oscuro a claro (`ins`, 2,2 de ancho) y dos filetes más chicos (`sx - .028`/`sy - .026` oscuro y `sx - .03`/`sy - .028` claro).
5. **Textura (recortada a la silueta)**: ruido `fractalNoise` (frecuencia .85, 2 octavas) y cepillado (`.012 .8`, 2 octavas, girado -28°) en `completo`; sus equivalentes de trama en `simple`.
6. **Detalles**: placa de la carrera, divisor bajo la posición, línea bajo el nombre, divisor vertical de atributos (ver `LAYOUT`).
7. **Brillo** (`html` solamente): rectángulo con degradado blanco, `class="carta-sweep"`, recortado a la silueta, definido con identificador propio.
8. **Filete exterior** de la silueta con degradado claro a oscuro (1,2 de ancho).

Para `html`, sobre esto, en orden: retrato, bandera, escudo, textos.

### `LAYOUT` (unidades de carta; tomado de la referencia, `D1_CSS`)
| Elemento | Posición | Tamaño y estilo |
|---|---|---|
| Media | centro x 48, tope y 42 | 56, peso 900, display; relieve claro de 1 |
| Posición | centro x 48, tope y 99 | 23, 800, `.04em` |
| Divisor | x 30 a 66, y 128 | 1,5 de alto, tinta a .45 |
| Bandera | x 35, y 140 | 26 x 18, con sombra de 1 |
| Escudo | x 34, y 168 | 26 x 30 (contenido) |
| Retrato | x 50, y 12 | 252 x 252; opaco hasta el 88 % de su alto y transparente al 100 % |
| Nombre | centro x 150, tope y 251 | 29 base, 900, display, `.03em`, mayúsculas |
| Línea del nombre | x 46 a 254, y 287 | 1,5, degradado transparente a tinta a transparente |
| Divisor vertical | x 149,5, y 297 a 365 | 1,5, a .4 |
| Atributos | columnas centradas en x 92,5 y 207,5; filas con tope en 296, 319 y 342 | valor 25/900 con borde derecho en el centro menos 4; etiqueta 17/700, `.04em`, borde izquierdo en el centro más 4 |
| Placa | x 56, y 371, 188 x 26, radio 4 | fondo `plate`; tres celdas centradas en x 87, 150 y 213; etiqueta body 10,5/700 `.08em`, cifra display 16/900 |
| Etiqueta de estilo | centro x 150 (más la mitad del espaciado), tope y 405 | 11, 800, `.42em`, tinta a opacidad 1 |

El texto de un `<text>` se ubica por la línea base: la conversión "tope a línea base" se calibra una sola vez superponiendo la captura de la referencia (T3) y se deja en la tabla como `y` definitivo.

### Nombre (RF-08, RF-28)
`nombreAjustado(nombre)`: tamaño 29; el ancho estimado es la suma de un ancho por carácter (tabla por clase: mayúsculas anchas `W M` 0,62 em, estrechas `I` 0,28 em, resto 0,5 em; un valor **por encima** del real medido, ver T3) por el tamaño más el espaciado de `.03em`. Baja de 29 a 18 hasta que quepa en 232; si en 18 no cabe, recorta caracteres y agrega "…". Es una función pura por longitud: HTML y canvas muestran el mismo texto y tamaño, y se prueba sin navegador. T3 calibra la tabla midiendo en el navegador los 40 `W` de peor caso y fija el factor para que el estimado sea mayor o igual que el real.

### Brillo y movimiento
Los keyframes viven en `style.css` (`@keyframes carta-sweep`, la misma animación de la referencia: 6 s, de `translateX(-120px)` a `translateX(520px)` con `skewX(-18deg)`), con `@media (prefers-reduced-motion: reduce) { .carta-sweep { animation: none; opacity: 0 } }`. El elemento tiene opacidad 0 en reposo, así que sin animación no queda franja visible.

## Tabla de atributos (RF-15 a RF-20)
La tabla de pesos, desplazamientos, tasas esperadas y fórmula están en el spec ("Atributos: tabla de pesos y desplazamientos"). En código:
```ts
const CAMPO = ['RIT','TIR','PAS','REG','DEF','FÍS'], PORTERO = ['EST','MAN','SAQ','REF','VEL','COL'];
const PESOS   = { DEL:[.20,.25,.12,.20,.03,.20], MED:[.14,.16,.28,.24,.08,.10], DEF:[.14,.04,.12,.10,.40,.20], POR:[.18,.14,.12,.24,.12,.20] };
const OFFSETS = { DEL:[2,6,-6,3,-42,-4], MED:[-1,0,4,5,-17,-6], DEF:[-1,-30,-2,-18,6,4], POR:[4,3,-4,7,-26,3] };
const ESPERADA = { DEL:{ g:.45, a:.15 }, MED:{ g:.12, a:.20 }, DEF:{ g:.04, a:.06 } };
```
`PESOS` solo se usa en las pruebas (para CA-04); no interviene en el valor. Medido con un prototipo en `node` antes de escribir el spec: dorado `[90, 94, 85, 93, 46, 84]`; peor `|ponderado − media|` con tasas esperadas, media 50 a 90: 0,28; con tasas extremas: 4,3.

Ejemplos (400 partidos, 0,2 goles y 0,1 asistencias por partido): DEL 60 → 62, 60, 50, 58, 25, 56; MED 75 → 74, 81, 73, 80, 58, 69; DEF 70 → 69, 46, 73, 58, 76, 74; POR 82 → 86, 85, 78, 89, 56, 85. DEL 99 → 99, 99, 89, 97, 57, 95 (el tope de 99 aplana los valores altos; es esperado).

## Paletas (`ESTILOS`)
Paradas del degradado del borde en 0, .16, .34, .48, .64, .82, 1. `face` en 0, .5, 1. Oro, plata, bronce e ícono vienen del generador de la referencia; **los valores en negrita son cambios de contraste** (D-10). Héroe sale del generador (propuesta holográfica, misma familia que el viejo `TIERS.heroe`: violeta, cian). Salón de la fama es nuevo (grafito y plata, de `TIERS.salon`). Valores finales tras T7: `muted` de oro #2e2104 y de bronce #210e03, sombra del bronce 0 (con los iniciales, el contraste medido en pixeles daba 4,07:1 en las etiquetas del oro y 4,37:1 en la punta del bronce); la plata usa las paradas del borde .18 / .36 / .5 / .66 / .84 de la referencia; héroe con rayos a .6; salón con el espaciado de la punta en .12 em. Los valores vigentes son los de `ESTILOS` en `src/ui/carta-svg.ts`.

| Estilo | `rim` (7 paradas) | `face` (3) | `glow` | `ink` | `muted` (etiquetas) | `plate` / `plateInk` | `halo` | `lat` | `sombra` | `acento` (fondo oscuro) |
|---|---|---|---|---|---|---|---|---|---|---|
| oro | #fff6c2 #ecc65f #8f640f #f7dd85 #b4841f #f6df90 #6f490b | #f7dd80 #e1ab33 #bb871f (paradas 0 / .45 / 1) | #fff7d0 | #2a1d02 | **#2e2104** | rgba(38,26,2,.62) / #fff0bf | rgba(235,185,70,.45) | #ffffff | **.06** | #ecc65f |
| plata | #ffffff #d2d8df #737d88 #f1f4f7 #97a1ac #e6eaee #5f6a75 | #f8fafc #cdd4db #aab3bd | #ffffff | #111a24 | **#2c3744** | rgba(12,20,30,.62) / #f1f5f9 | rgba(190,200,212,.4) | #ffffff | **.06** | #d2d8df |
| bronce | #ffdcba #dc8f58 #74381a #f2ad7c #a55a2c #eaa879 #592a0e | #f4b887 #d57d47 #bf7040 | #ffe6cf | **#1f0d02** | **#210e03** | rgba(40,16,4,.62) / #ffe9d6 | rgba(214,130,74,.45) | #ffffff | **0** | #dc8f58 |
| ícono | #fff6c2 #ecc65f #8f640f #f7dd85 #b4841f #f6df90 #6f490b | #fffdf5 #f1e8d0 #dccfa9 | #ffffff | #2a2214 | **#4a3d22** | rgba(70,50,8,.82) / #fff1c4 | rgba(240,215,140,.5) | #a9801f | **.10** | #f7dd85 |
| héroe | #dcf7ff #6fd6ff #47339f #e8ccff #7f5bff #bff2ff #2f2278 | #45168f #1f0d63 #0a1244 | #6a3cff | #ffffff | #d2c4f5 | rgba(6,8,36,.66) / #ffffff | rgba(130,90,255,.6) | #8ff0ff | .26 (rayos a .22) | #6fd6ff |
| salón | #ffffff #c9ccd1 #5d6168 #eceef0 #8b9097 #d9dce0 #42454b | #4a4c52 #26272b #0c0d0f | #cfd4dc | #ffffff | #cfd2d8 | rgba(0,0,0,.6) / #f4f4f6 | rgba(190,196,206,.4) | #e6e8ec | .26 | #d6d6d6 |

Contraste estimado (texto contra el color local de la cara a 67 %, 75 % y 83 % de la altura, con la sombra inferior; etiqueta de la punta al 93 %), con los valores de la tabla: oro 5,6 / 5,2 / 4,7 (punta 5,0); plata 7,0 / 6,4 / 6,0 (punta 7,8); bronce 5,3 / 5,0 / 4,7 (punta 4,7); ícono 7,6 / 7,0 / 6,5 (punta 8,8); héroe 10,5 a 10,9; salón 11,1 a 12,1. Con los valores de la referencia eran, en oro y bronce, de 2,5 a 3,4 (etiquetas) y 3,5 (punta). La estimación aproxima el degradado diagonal con uno vertical: la prueba (T2) usa la misma aproximación y CA-19 la confirma con píxeles.

### Salón de la fama: vidrio quebrado
Se porta el bucle de `card.ts` (`TIERS.salon.shards`) a unidades de carta: punto de impacto en `(210, 88)` (tercio superior derecho), 16 rayos con ángulo `i/16 · 2π + sin(i · 7,3) · .18` y largo `150 + sin(i · 3,1) · 75`; cada faceta es el triángulo `impacto, rayo i, rayo i+1`, alternando blanco a .04 y .11 de opacidad; contorno fino blanco a .3 y un polígono interior irregular (radios 43 a 63). Todo determinista (sin azar). Las facetas van en la capa 3, recortadas a la cara.

## `src/ui/card.ts`: `drawCareerCard(canvas, p, s)`
Misma firma y mismo resultado para quien la llama (`main.ts` no cambia en esta parte). Pasos:
1. `await document.fonts.load('900 56px "Big Shoulders Display"')`, `'800 …'`, `'700 17px "Big Shoulders Display"'`, `'700 10px Barlow'`, `'600 24px Barlow'` y `await document.fonts.ready`.
2. `datos = datosDeCarrera(p, s)` (función local): nombre completo, `p.setup.position`, `p.peakRating`, `s.apps`, `s.goals`, `s.assists`, `s.titles.length`, avatar de `p.setup` con el dorsal y las camisolas del último club (`clubById(p.seasons.at(-1)?.clubId ?? p.clubId)`, el mismo que va al ranking), país `seleccionDe(p)` con `bandera = https://flagcdn.com/w160/<flag>.png` y `kit`, y el club con `escudo = ${import.meta.env.BASE_URL}escudos/<id>.png`.
3. En paralelo: imagen del arte (`cartaSVG(datos, estilo, { modo: 'arte', escala: 1.9, efectos: 'completo' })`, con el respaldo `simple` a los 1.500 ms o ante error), retrato (`quitarFondoAvatar(avatarSVG(...))` cargado como imagen), bandera (`new Image()` con `crossOrigin = 'anonymous'` antes de asignar `src`; `w160` para que a 68 px de ancho no se vea borrosa) y escudo (`loadCrest` existente, que ya devuelve `null` si falta).
4. Dibujo, en este orden, con `W = 1080`, `H = 1350`, `K = 1.9` (A1: debajo de la carta caben el veredicto, el palmarés y el momento), origen de la carta `(255, 30)`. El texto no usa `ctx.scale`: cada tamaño, espaciado y posición se multiplica por `K`:
   - Fondo `#0B1420` y dos halos radiales con `halo` del estilo (como `drawBackground` de hoy, sin la silueta).
   - Arte con sombra (el halo y la sombra salen del canvas, no del SVG): `ctx.shadowColor = 'rgba(0,0,0,.55)'`, `shadowBlur`, `shadowOffsetY` (la sombra exterior de la referencia); un segundo `drawImage` con `shadowColor = halo` para el resplandor.
   - Retrato: se dibuja en un canvas auxiliar de `252 · ESC` de lado, se aplica `globalCompositeOperation = 'destination-in'` con un degradado lineal (opaco hasta el 88 %, transparente al 100 %), y se compone sobre la imagen, **recortado con `new Path2D(SILUETA)`** escalado (así nada sale del marco).
   - Bandera: `drawImage`, o tres franjas con `pais.kit` si no cargó. Escudo: `drawImage` o el escudo genérico con `drawCrest` (la función que ya existe).
   - Textos: `textosCarta(datos, estilo)`; cada ítem se dibuja con `fillText`, su copia clara de relieve y el espaciado entre letras. `ctx.letterSpacing` no existe en todos los navegadores: si `'letterSpacing' in ctx` es falso, se dibuja letra por letra con el avance medido.
   - Veredicto (display 800, 56 px, color `acento`) centrado en `y = 936`; palmarés (hasta cinco íconos de 34 px de radio con su conteo, y la etiqueta en una o dos líneas) con centro en `y = 1008`; momento destacado (la escena de `momentSVG` recortada, 880 x 156 desde `y = 1116`, con el kicker y el título encima) y el pie `CHAMUSQUEROS · ¿Superás esta carrera?` (Barlow 600, 24 px, gris azulado) en `y = 1318`.
5. Un portero cambia GOL por AST en la placa (D-06) dentro de `textosCarta`, no aquí.

`TIERS`, `drawBackground`, `cardPath` y `drawCrest` se eliminan (el escudo genérico ahora es el de la referencia, con `ESCUDO_PATH`); `loadCrest`, `trophySVG` y `wrap` se conservan.

## `src/main.ts` y `src/style.css`
- **`futCard(r)`** (cambio acotado): arma `DatosCarta` con los campos de la fila (nombre, `c?.pos`, `c?.ovr`, `c?.apps`, `c?.goals`, `c?.assists`, `r.titles`, avatar de la fila con el respaldo `nameAvatar`, bandera `https://flagcdn.com/w80/<flag>.png`, club encontrado con `ALL_CLUBS.find` y su escudo) y devuelve `<div class="fut" style="--fut-halo:…">${cartaSVG(datos, tier, { efectos })}<p class="fut-meta" style="--fut-acento:…"><b>veredicto</b> · dept · Pie …</p></div>`. El veredicto y el departamento pasan por `esc()`.
- **Enlace de escudos** (`bindCrests` se amplía o se agrega una función hermana de cuatro líneas): para cada `image.carta-escudo`, en `load` se oculta el escudo genérico de debajo y en `error` se quita la imagen. Sin esto el escudo transparente dejaría ver el genérico detrás. Se llama donde hoy ya se llama `bindCrests(dialog)` y `bindCrests(app)`.
- Se quita el import de `TIERS`. `RankRow`, `RankCard`, `nameAvatar`, `DEMO_CARD`, `rankingTable` y todo lo demás **no cambian**.
- **`style.css`:** se borran las ~20 reglas `.fut*` y se dejan `.fut-dialog*` y `.fut-demo*`. Nuevas: `.fut { width: min(300px, calc(100vw - 32px)); }`, `.fut > svg { display: block; width: 100%; height: auto; overflow: visible; filter: drop-shadow(0 20px 18px rgb(0 0 0 / .55)) drop-shadow(0 0 26px var(--fut-halo)); }`, `.fut-meta` (texto pequeño en mayúsculas, color claro sobre el fondo del diálogo, `b` en `var(--fut-acento)`), `@keyframes carta-sweep` y la regla de movimiento reducido. `.fut-demo .fut { max-width: 300px }` se conserva.

## Medición (T6)
Con `npm run dev` y el navegador automatizado, en Chromium y WebKit (si el entorno lo trae), 5 corridas y la mediana:
1. Imagen: tiempo desde asignar `src` al arte (780 x 1144) hasta `onload`, con `completo` y con `simple`; y el total de `drawCareerCard`.
2. Carta HTML: tiempo desde `innerHTML` del diálogo hasta el segundo `requestAnimationFrame`, con `completo` y con `simple`.
3. Diferencia visual entre `completo` y `simple` (captura lado a lado, se anota si el grano se pierde de forma notoria).

Resultado (mediana de 5 corridas tras una de calentamiento; entre paréntesis, la primera corrida; Playwright 1.57, Chromium 143 y WebKit 26.0 de escritorio, macOS, DPR 2):

| Medida | Chromium completo | Chromium simple | WebKit completo | WebKit simple |
|---|---|---|---|---|
| Arte (570 x 836) hasta dibujado en canvas (ms) | 70 (95) | 17 (29) | 62 (135) | 16 (17) |
| `drawCareerCard` total (ms) | 142 (509) | no se mide por separado | 42 (251) | no se mide por separado |
| Diálogo hasta el segundo `requestAnimationFrame` (ms) | 23 (9) | 17 (14) | 83 (94) | 33 (19) |
| Diálogo real (ranking simulado, 11 filas, completo) | 8 a 14 | | 92 a 108 | |

Con el criterio de abajo (WebKit: arte completo 62 ms contra 800, diálogo completo 83 ms contra 150) **`completo` queda por defecto en todos los motores** y la imagen conserva el respaldo `simple` a los 1.500 ms o ante error. La diferencia visual de `simple` es solo un grano más fino y un bisel sin brillo especular (captura `simple-vs-completo.png`). iPhone real: pendiente (A2); si el usuario mide más de 150 ms en el diálogo, basta activar `efectos: 'simple'` por `CSS.supports('-webkit-touch-callout', 'none')` en `futCard`.

**Criterio:** si en WebKit el arte `completo` pasa de **800 ms** o el diálogo `completo` de **150 ms**, o hay diferencia visual que cambie la carta, el conmutador se activa por defecto en WebKit (detección con `CSS.supports('-webkit-touch-callout', 'none')`, que identifica a Safari de iOS y no a Chrome de escritorio); si no, `completo` en todos y la imagen mantiene el respaldo de 1.500 ms. Una medición en iPhone real sigue pendiente (A2).

## Estrategia de pruebas
`scripts/carta.test.ts`, al estilo de `scripts/ranking.test.ts` (`node:assert/strict`, un `console.log` final). Se corre con `npx tsx scripts/carta.test.ts`. Importa solo `src/ui/carta-svg.ts` y tipos; no hay `document`, así que prueba también CA-15.
- **Atributos:** CA-01 a CA-07, con la rejilla de CA-02 y las entradas hostiles.
- **Saneo y escape:** CA-10, CA-11.
- **SVG:** CA-09, CA-12, CA-13, CA-14, y una aserción de que `quitarFondoAvatar` realmente quita el rectángulo `200 x 200` de la salida de `avatarSVG` (vigila la dependencia).
- **Contraste:** CA-16, con el cálculo de luminancia WCAG sobre los pares de la tabla de paletas y el color local de la cara (aproximado, ver arriba).
- **Equivalencia entre superficies:** CA-08, construyendo los `DatosCarta` desde una fila de ranking y desde un resumen de carrera de ejemplo y comparando `atributos()` y `textosCarta()`.
- En navegador (T7), con capturas: CA-17 a CA-23.

## Cobertura de los RF
| RF | Dónde |
|---|---|
| RF-01, RF-02 | `cartaSVG`, `textosCarta`, `ESTILOS` (módulo único) · T3, T5 |
| RF-03 a RF-05, RF-12 | capas 1 a 8 y paletas · T2, T3 |
| RF-06, RF-07, RF-09, RF-10, RF-11 | `LAYOUT` y `textosCarta` · T3 |
| RF-08, RF-28 | `nombreAjustado` · T3 |
| RF-13 | facetas del salón · T3 |
| RF-14 | brillo y `style.css` · T4 |
| RF-15 a RF-20 | `atributos()` y saneo · T1 |
| RF-21 a RF-23 | `DatosCarta`, bandera, escudo, avatar · T3, T4, T5 |
| RF-24 | paletas con contraste · T2, T7 |
| RF-25 | `drawCareerCard` · T5 |
| RF-26 | `efectos`, respaldo y medición · T3, T5, T6 |
| RF-27 | `.fut` y `style.css` · T4, T7 |
| RF-29 | identificadores · T3 |
| RF-30 | `aria-label` y movimiento reducido · T3, T4 |
| RF-31 | sin cambios en `package.json` · T8 |
| RF-32 a RF-34 | `futCard`, landing, resultados · T4, T5 |

## Riesgos
- **Fidelidad de las texturas con `feTurbulence`**: el mismo filtro se ve distinto con la escala (la frecuencia es en unidades de usuario, así que el grano escala con la carta). Mitigación: comparar capturas de la imagen a 2,6 y de la carta HTML a 1 (T7).
- **WebKit móvil lento o distinto**: ver "Medición" y el respaldo. Peor caso: la imagen sale con `simple` y la carta HTML con `completo` se siente lenta al abrir; el conmutador por WebKit lo cubre.
- **Alineación del texto SVG respecto del HTML de la referencia**: la línea base y los espaciados difieren de los `div`. Mitigación: calibrar `y` superponiendo la captura (T3).
- **`ctx.letterSpacing` ausente** en algunos navegadores: respaldo letra por letra.
- **Bandera**: depende de un servicio externo (`flagcdn.com`) y de CORS; con respaldo en el canvas y en el SVG. A5.
- **`avatarSVG` cambia en la rama paralela**: la prueba lo detecta; se adapta al integrar.
- **Textos que desbordan**: la tabla de anchos es una estimación; T3 la calibra con el peor caso y CA-21 lo verifica con capturas.
- **Contraste con degradado diagonal**: la estimación es vertical; CA-19 mide píxeles reales.
- **Imagen contaminada** (`toBlob` lanza): solo si una imagen sin CORS entra al canvas; la bandera usa `crossOrigin` y el escudo es del mismo origen. CA-20 lo prueba bloqueando la bandera.

## Alternativas descartadas
- Mantener `TIERS` y agregar los campos del metal: el módulo puro no puede importar `card.ts` (toca el DOM) y la tabla vieja tiene campos que el diseño ya no usa.
- Dibujar todo en el canvas (C) o rasterizar el DOM (D): ver la tabla de la decisión.
- Incrustar las fuentes en el SVG: archivos que el repo no tiene y peso en el paquete.
- Detectar el dispositivo por el agente de usuario para decidir los efectos: se decide por error y tiempo, y por una medición.
- Guardar los atributos en el ranking: cambiaría el servidor (fuera de alcance) y obligaría a migrar.
- Una animación de partículas o destellos (la propuesta holográfica): no se eligió esa propuesta.
