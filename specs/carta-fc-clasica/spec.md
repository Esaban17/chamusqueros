# Carta FC "Clásica realista" en todos los estilos

## Problema y valor
Pedido del usuario: entre tres propuestas, validó el diseño **"1 · Clásica realista"** y pidió aplicarlo **a todos los estilos de carta**.

Hoy hay **dos cartas distintas** que no se parecen entre sí ni a una carta de FC:

1. **La imagen para compartir** (`drawCareerCard`, canvas de 1080 x 1350, `src/ui/card.ts`): una hoja con degradado plano y vetas, avatar en círculo, nombre, veredicto, cuatro cifras, palmarés, momento destacado y trayectoria. No muestra atributos ni bandera real (dibuja tres franjas con los colores de la Selección).
2. **La carta HTML** (`futCard()` en `src/main.ts` y `.fut*` en `src/style.css`): el diálogo del ranking y el ejemplo de la landing. Fondo plano, avatar cuadrado, seis cifras (PJ, GOL, AST, TÍT, SEL, PTS) y ninguna bandera real.

Valor: una sola carta con el aspecto de un objeto coleccionable (metal con bisel, textura, retrato grande, seis atributos), igual en la pantalla y en la imagen que se comparte, para los seis estilos que ya existen (ícono, héroe, salón de la fama, oro, plata, bronce). Compartir una carrera es la forma en que el juego se difunde; la carta es lo que se ve.

El diseño aprobado está en `specs/carta-fc-clasica/referencia/Main.dc.html` (copia del artboard validado: oro, plata, bronce e ícono, con datos de ejemplo fijos). **Esa carta es la fuente de verdad visual.** Este spec describe qué debe verse y qué debe cumplirse; el cómo está en `plan.md`.

## Alcance
- **Un solo diseño** para las dos superficies (carta HTML e imagen del canvas), fiel a la referencia: silueta de escudo con hombros cóncavos, marco metálico con bisel, textura, retrato grande que se desvanece, media y posición arriba a la izquierda, bandera y escudo apilados, nombre condensado, seis atributos en dos columnas, placa de carrera y etiqueta del estilo en la punta.
- **Los seis estilos** con el mismo diseño y su paleta: oro, plata, bronce e ícono como en la referencia; héroe y salón de la fama con paletas propias derivadas de las que ya tenían.
- **Seis atributos calculados** (el juego no los tiene) a partir de la posición, la media y las estadísticas de carrera que ya se guardan en el ranking. La regla de cálculo es parte de este spec (ver "Atributos").
- **Datos reales del jugador** en la carta: bandera de la Selección que representa hoy, escudo del club, avatar con la camisola del club, nombre y cifras.
- Imagen para compartir de 1080 x 1350 con la carta centrada, el veredicto y el pie de marca debajo.
- Brillo animado en la carta HTML, apagado con `prefers-reduced-motion`.
- Que la carta se lea bien en un celular de 360 px y que la imagen siga siendo nítida.

## Fuera de alcance
- El servidor y lo que se guarda en el ranking: `api/ranking.ts`, `db/` y la forma de `RankCard` **no cambian**. Los atributos se calculan en el navegador con lo que ya hay.
- Palmarés, momento destacado, trayectoria de clubes, partidos con la Selección (SEL), puntos (PTS) y asistencias en la **imagen** y en la **carta del diálogo**: la referencia no los tiene y no caben (ver A1). Siguen en la pantalla de resultados. `palmares.ts` y `momentSVG` no se tocan (los usa también `scripts/simulate.ts`).
- Estilos nuevos de carta, cambios al veredicto o a los umbrales de `verdictFor`.
- Las otras dos propuestas (holográfica, moderna) y cualquier animación en la imagen exportada.
- Escudos de liga, logos de EA SPORTS o de FUT: no se usan. La carta es original, inspirada en el lenguaje visual de las cartas de fútbol; la sección "Sin afiliación" de `terminos.html` ya lo cubre.
- La tabla del ranking (la fila con avatar pequeño) y la pantalla de resultados, salvo el cambio de la imagen.
- Guardar atributos o vallas invictas en el ranking (ver A3).
- Cambiar `avatarSVG` o el editor de avatar (los trabaja otra rama; ver "Coordinación").

## Términos
- **Carta**: el objeto visual completo (silueta, metal, retrato, textos). Existe como **carta HTML** (SVG en línea dentro de la página) y como **imagen** (PNG de 1080 x 1350 hecho en un canvas).
- **Estilo**: uno de seis, según el veredicto de la carrera: `icono`, `heroe`, `salon`, `oro`, `plata`, `bronce` (`CardTier`, sin cambios).
- **Media**: la valoración más alta de la carrera (`peakRating`; en el ranking, `ovr`).
- **Atributo**: uno de seis valores de 25 a 99. En campo: RIT (ritmo), TIR (tiro), PAS (pase), REG (regate), DEF (defensa), FÍS (físico). En portería: EST (estirada), MAN (manejo), SAQ (saque), REF (reflejos), VEL (velocidad), COL (colocación).
- **Unidades de carta**: el sistema de 300 x 440 de la referencia. Toda medida de este spec está en esas unidades salvo que diga píxeles.
- **Faltante**: dato que no existe (carreras guardadas antes de que existiera la carta, `card = null`) o que no pasa la validación. Se muestra como "—".

## Requisitos funcionales

### Una carta, dos superficies
- **RF-01** La carta HTML y la imagen salen **de la misma definición** (misma silueta, misma paleta, misma disposición y los mismos textos). Para una misma carrera, ambas muestran el mismo nombre, media, posición, seis atributos con sus valores, cifras de la placa y etiqueta de estilo.
- **RF-02** Los seis estilos usan el diseño completo. Cambia la paleta, y en el salón de la fama la capa de "vidrio quebrado" (RF-13). Dos cartas de estilos distintos con los mismos datos se distinguen a simple vista.

### Diseño (qué se ve)
- **RF-03 Silueta.** Escudo de proporción 300 x 440 con hombros cóncavos arriba, lados rectos y base en punta suave, con el mismo contorno de la referencia. Nada del contenido sale de la silueta.
- **RF-04 Marco metálico.** Borde con degradado de siete paradas (claro, medio, oscuro, claro, medio, claro, oscuro, en diagonal), una **cara interior** más pequeña (93 % de ancho y 94 % de alto de la silueta) con su propio degradado, y un **bisel** visible: filo claro arriba a la izquierda, filo oscuro abajo a la derecha, más un filete fino de luz en el borde exterior. El borde se ve de metal, no de color plano.
- **RF-05 Textura.** Sobre la cara: cepillado diagonal y grano finos; una **rejilla de rombos** visible arriba que se desvanece hacia abajo (casi nula del 62 % de la altura hacia abajo); cuatro **rayos** diagonales que se apagan hacia abajo; tres **anillos** concéntricos detrás del retrato (uno punteado); un halo de luz detrás del retrato; y una sombra suave en el tercio inferior. Un **hundido interior** con dos filetes (uno oscuro y uno claro) a lo largo de la cara. Con efectos "simples" (RF-26) el grano y el cepillado se reemplazan por una trama fina del mismo tono.
- **RF-06 Esquina izquierda.** De arriba abajo, centrados en una columna angosta: la **media** en número grande, la **posición** (POR, DEF, MED, DEL), un **divisor** fino, la **bandera** de la Selección que representa el jugador hoy y debajo el **escudo** del club.
- **RF-07 Retrato.** El avatar del jugador, con su cara y la camisola del último club, en tamaño grande (252 x 252 unidades), **sin fondo propio** y con un desvanecimiento hacia abajo que lo funde con el metal antes de llegar al nombre. Se apoya a la derecha de la columna de la esquina sin taparla y se recorta con la silueta: nada del retrato sale del marco.
- **RF-08 Nombre.** En mayúsculas, fuente condensada, centrado bajo el retrato, con una línea fina que se desvanece en los extremos debajo. Tamaño base 29 unidades; si no cabe en 232 unidades de ancho baja hasta 18; si aún no cabe termina en "…". **Nunca** pisa el borde ni la esquina.
- **RF-09 Atributos.** Seis atributos en **dos columnas** separadas por un divisor vertical: primera columna los tres primeros del orden, segunda los tres últimos. Cada celda muestra el valor en número grande y la etiqueta de tres letras. El orden en campo es RIT, TIR, PAS | REG, DEF, FÍS.
- **RF-10 Placa.** Una placa redondeada con tres cifras: **PJ** (partidos), **GOL** (goles) y **TÍT** (títulos). Para porteros la segunda cifra es **AST** (asistencias): un portero con "GOL 0" no dice nada. Lleva un leve relieve hundido.
- **RF-11 Etiqueta de estilo.** El nombre del estilo en la punta, separado por letras: ÍCONO, HÉROE, SALÓN DE LA FAMA, ORO, PLATA, BRONCE.
- **RF-12 Paletas.** Oro, plata, bronce e ícono usan la paleta de la referencia (con los ajustes de contraste de RF-24). **Héroe**: marco azul cian a violeta y cara violeta profundo a azul noche, con rejilla y anillos cian y rayos más intensos. **Salón de la fama**: marco grafito con reflejos de plata y cara grafito a negro, con texto blanco. Los valores exactos están en el plan.
- **RF-13 Vidrio quebrado (salón de la fama).** Sobre la cara, entre 12 y 18 **facetas** triangulares que irradian desde un punto de impacto en el tercio superior derecho de la carta, alternando claras y oscuras con transparencia baja, más un contorno fino de grietas. Los demás estilos no lo llevan.
- **RF-14 Brillo animado.** Solo en la carta HTML: una franja de luz cruza la carta cada unos 6 s. Con `prefers-reduced-motion: reduce` **no hay animación** y no queda ninguna franja visible. La imagen exportada no lleva brillo.

### Atributos
- **RF-15** `atributos(datos)` es una **función pura y determinista**: mismas entradas, mismas salidas; no usa azar, fecha ni nada externo. Devuelve seis pares etiqueta y valor en el orden de RF-09, o nada (`null`) si la posición o la media no son válidas (ver RF-19).
- **RF-16** Los seis valores son **enteros entre 25 y 99**, para cualquier entrada válida y para cualquier entrada inválida (RF-19).
- **RF-17** Fórmula (los números están en la sección "Tabla de atributos"): cada atributo parte de la **media** más un desplazamiento propio de la posición. Tres atributos de campo (TIR, PAS, REG) se ajustan además por las **tasas por partido** de la carrera (goles y asistencias entre partidos), comparadas con una tasa esperada de la posición. Los ajustes pesan menos si hay pocos partidos. El **promedio ponderado** de los seis valores (con los pesos de la posición) queda cerca de la media: a 1 punto o menos con tasas esperadas, y a 5 puntos o menos con tasas extremas.
- **RF-18** Porteros: usan etiquetas propias (EST, MAN, SAQ, REF, VEL, COL) y **no se ajustan por tasas** (goles y asistencias no dicen nada de un portero). Dependen de la media y de la posición.
- **RF-19** Entradas inválidas o faltantes (el servidor guarda lo que el navegador manda, A08): una posición fuera de POR, DEF, MED, DEL o una media que no sea entero de 1 a 99 → no hay atributos y la carta muestra "—" en los seis. Partidos, goles o asistencias que no sean enteros de 0 a 2.000, o partidos igual a 0 → se tratan como faltantes y no ajustan nada (los atributos salen solo de media y posición).
- **RF-20** La imagen y la carta del ranking calculan los atributos **con los mismos campos** (posición, media, partidos, goles, asistencias) aunque la imagen tenga más datos. El mismo jugador muestra los mismos seis números en las dos. (Por eso las vallas invictas no entran: ver A3.)

### Datos reales
- **RF-21** La **bandera** es la de la Selección que el jugador representa hoy (la de origen si nunca cambió), como hoy. Si la imagen de la bandera no carga, se muestran tres franjas con los colores de esa Selección.
- **RF-22** El **escudo** es el del último club de la carrera (el mismo que se guarda en el ranking). Si el archivo del escudo no existe, se muestra un escudo genérico con las iniciales y los colores del club, como en el resto del juego. Una carta sin club (carrera guardada antes de la carta) no muestra escudo.
- **RF-23** El **avatar** es el del jugador con la camisola y el dorsal del último club; si la carrera es anterior al avatar, el que ya se dibuja hoy en el ranking (derivado del nombre).

### Calidad
- **RF-24 Contraste.** Todo texto de la carta se lee en los seis estilos: **al menos 4,5:1** para texto de menos de 18 px efectivos (etiquetas de atributos, placa, etiqueta de estilo) y **3:1** para números y nombre de 18 px efectivos o más, medido contra el color real de la cara en la zona donde está el texto. La referencia **no cumple** en oro y bronce (etiquetas y rótulo de la punta); esos tonos se corrigen sin cambiar el aspecto (A7).
- **RF-25 Imagen.** El archivo sigue siendo un PNG de **1080 x 1350**. La carta va centrada, a escala 2,6 (780 x 1144 px), con el veredicto en grande y el pie "CHAMUSQUEROS · ¿Superás esta carrera?" debajo, sobre el fondo oscuro de siempre con un halo del color del estilo. Las líneas, el bisel y el texto se ven nítidos al 100 % (no escalados desde una imagen chica). Un PNG de tamaño fijo no depende del `devicePixelRatio`.
- **RF-26 Efectos.** El diseño completo usa filtros de SVG (iluminación especular para el bisel, ruido para grano y cepillado). Existe una variante **simple** que no usa `feSpecularLighting`, `feTurbulence` ni `mix-blend-mode` y conserva silueta, degradados, filetes y rejilla. Si la variante completa falla o tarda demasiado al generar la imagen, se usa la simple sin que el usuario lo note más que por el grano.
- **RF-27 Carta HTML en celular.** Con el ancho de pantalla de 360 px la carta mide entre 280 y 300 px de ancho, sin scroll horizontal. Con 280 px de ancho ningún texto mide menos de 9,5 px efectivos.
- **RF-28 Textos largos.** Un nombre de 40 caracteres de ancho máximo (el límite del servidor) se ajusta según RF-08 en las dos superficies. Cifras de hasta 4 dígitos (partidos hasta 2.000) caben en la placa; los atributos de dos dígitos en su celda.
- **RF-29 Identificadores.** Varias cartas pueden convivir en una página (el diálogo, la landing, pruebas): los identificadores internos del SVG (degradados, filtros, máscaras) son **únicos por carta**. Ningún `id` se repite entre dos cartas.
- **RF-30 Accesibilidad.** La carta HTML es una imagen con un texto alternativo que dice estilo, nombre, posición, media y atributos; la animación respeta `prefers-reduced-motion` (RF-14). La imagen exportada conserva su `alt` en la pantalla de resultados.
- **RF-31** Ninguna dependencia nueva.

### Pantallas
- **RF-32 Diálogo del ranking.** Muestra la carta HTML del jugador elegido, y debajo del escudo una línea con el veredicto (en el color de acento del estilo), el departamento y el pie, como la línea `fut-meta` de hoy. Los datos que la fila no guardó se muestran como "—".
- **RF-33 Landing.** El ejemplo ("Carta de FC") muestra la carta HTML de un jugador de muestra constante, sin datos del usuario.
- **RF-34 Resultados.** La pantalla de resultados sigue mostrando la imagen generada y los botones de compartir y descargar, sin cambios de comportamiento.

## Atributos: tabla de pesos y desplazamientos
Orden de los seis: campo `[RIT, TIR, PAS, REG, DEF, FÍS]`; portería `[EST, MAN, SAQ, REF, VEL, COL]`.

| Posición | Pesos del promedio | Desplazamientos sobre la media |
|---|---|---|
| DEL | .20 .25 .12 .20 .03 .20 | +2, +6, -6, +3, -42, -4 |
| MED | .14 .16 .28 .24 .08 .10 | -1, 0, +4, +5, -17, -6 |
| DEF | .14 .04 .12 .10 .40 .20 | -1, -30, -2, -18, +6, +4 |
| POR | .18 .14 .12 .24 .12 .20 | +4, +3, -4, +7, -26, +3 |

Los pesos de cada fila suman 1 y los desplazamientos están elegidos para que el promedio ponderado de los desplazamientos sea casi 0 (DEL -0,28; MED +0,22; DEF -0,18; POR -0,18).

**Ajuste por tasas** (solo DEL, MED y DEF; POR no). Con `g = goles / partidos`, `a = asistencias / partidos` y `p = min(1, partidos / 60)`:

- Tasa esperada: goles DEL 0,45, MED 0,12, DEF 0,04; asistencias DEL 0,15, MED 0,20, DEF 0,06.
- `ajG = redondear(p * limitar(12 * (g - esperadaG) / max(esperadaG, 0,10), -6, +6))`; `ajA` igual con asistencias.
- TIR suma `ajG`; PAS suma `ajA`; REG suma `redondear((ajG + ajA) / 2)`. RIT, DEF y FÍS no se ajustan.

**Valor final** de cada atributo: `limitar(redondear(media + desplazamiento + ajuste), 25, 99)`.

Ejemplo (la carta de muestra de la landing: DEL, media 88, 512 partidos, 231 goles, 94 asistencias; `g = 0,451` sin ajuste, `a = 0,184` ajuste +3, REG +2): **RIT 90, TIR 94, PAS 85, REG 93, DEF 46, FÍS 84**. Promedio ponderado 88,5.

Las cifras de la referencia (86, 90, 78, 87, 41, 76 para media 88) eran ilustrativas y están por debajo de lo que daría cualquier ponderación cercana a la media; no se copian.

## Criterios de aceptación
Cada criterio se verifica leyendo una salida o una captura; los números son los de este spec.

**Atributos** (prueba `scripts/carta.test.ts`, sin navegador)
- **CA-01** Valor dorado: DEL, media 88, 512 partidos, 231 goles, 94 asistencias → `[90, 94, 85, 93, 46, 84]` con etiquetas `RIT TIR PAS REG DEF FÍS`.
- **CA-02** Rango: para posiciones POR/DEF/MED/DEL, media 1 a 99, partidos 0 a 2.000 y goles y asistencias de 0 a 2.000 (rejilla de al menos 5.000 combinaciones, incluyendo goles mayores que partidos), todo valor es entero y está entre 25 y 99. Con entradas `NaN`, `Infinity`, negativas, fraccionarias, `undefined` y cadenas, la función no lanza: devuelve `null` (posición o media inválida) o valores en rango (cifras inválidas tratadas como faltantes).
- **CA-03** Determinismo: 1.000 llamadas con las mismas entradas devuelven lo mismo; el resultado no cambia si se cambia `Math.random` o la fecha por valores fijos distintos.
- **CA-04** Cercanía a la media: con tasas esperadas y 400 partidos, para cada posición y media 50 a 90, el promedio ponderado difiere de la media en 1 punto o menos (medido: 0,28). Con tasas extremas (0 goles o 1,5 goles por partido; 0 o 1 asistencia por partido) y 400 partidos, en 5 puntos o menos (medido: 4,3).
- **CA-05** Casos por posición con tasas esperadas y media 75: en DEL el mayor es TIR y el menor DEF; en MED los mayores son REG y PAS y el menor DEF; en DEF el mayor es DEF y el menor TIR; en POR el mayor es REF, el menor VEL y las etiquetas son `EST MAN SAQ REF VEL COL`.
- **CA-06** Monotonía: subir la media nunca baja un atributo; subir goles por partido nunca baja TIR; subir asistencias por partido nunca baja PAS.
- **CA-07** Muestras chicas: con 10 partidos y 10 goles, el ajuste de TIR es 1 o menos.
- **CA-08** Mismos números en las dos superficies: para una carrera de ejemplo, los seis valores de la imagen y de la carta construida con los campos de `RankCard` son idénticos.

**Carta SVG** (misma prueba, sin navegador)
- **CA-09** Identificadores únicos: dos llamadas seguidas sin `id` explícito producen conjuntos de `id` disjuntos; toda referencia `url(#x)` o `href="#x"` apunta a un `id` definido en esa misma salida; ningún `id` se repite dentro de una salida.
- **CA-10** Escape: con el nombre `<img src=x onerror=alert(1)> "&'` la salida no contiene `<img`, contiene el texto escapado, y es bien formada (etiquetas balanceadas). Un nombre con caracteres de control (`\u0000`, `\u0001`) o con emoji produce una salida sin esos caracteres de control.
- **CA-11** Validación de datos del servidor: media 0, 100, 3,5, `NaN` y posición `"X"` dan "—" y no rompen; un color de club fuera de `#rrggbb` y un índice de avatar fuera de rango se reemplazan por valores válidos; ningún valor sin validar aparece en la salida.
- **CA-12** Los seis estilos generan una salida distinta en cada modo (`html`, `arte`) y en los dos niveles de efectos; `arte` no contiene `<text`, `<image`, `<animate` ni `class="carta-sweep"`; `simple` no contiene `feSpecularLighting`, `feTurbulence` ni `mix-blend-mode`; `completo` contiene los dos filtros.
- **CA-13** Salón de la fama: la salida del estilo `salon` contiene entre 12 y 18 facetas y los demás estilos ninguna.
- **CA-14** Nombre: el tamaño y el texto resultantes cumplen RF-08 para nombres de 1, 12, 25 y 40 caracteres (incluidos 40 `W`), y el ancho estimado nunca supera 232 unidades.
- **CA-15** La prueba corre con `npx tsx scripts/carta.test.ts` sin navegador: el módulo no usa `document`, `window` ni `import.meta.env`.
- **CA-16** Contraste (cálculo en la prueba): para cada estilo, cada par de color de texto y color local de la cara de la tabla del plan cumple RF-24.

**Navegador** (capturas, a mano o con el navegador automatizado)
- **CA-17** Fidelidad: capturas lado a lado de la referencia y del juego para los seis estilos, en carta HTML y en imagen (12 capturas del juego; la referencia tiene cuatro estilos y para héroe y salón se compara contra la lista de RF-04 a RF-13). Cada una pasa la lista de RF-03 a RF-11 sin faltantes.
- **CA-18** Medidas: la imagen descargada es de 1080 x 1350; la carta HTML a 360 px de pantalla mide entre 280 y 300 px y la página no tiene scroll horizontal; a 280 px de ancho el texto más chico mide 9,5 px o más.
- **CA-19** Contraste en pixeles: en las capturas de los seis estilos, el contraste medido de las etiquetas de atributos, la placa y la etiqueta de estilo contra el fondo local es de 4,5:1 o más.
- **CA-20** Datos reales: una carrera con Selección distinta de Guatemala muestra su bandera real en la carta HTML y en la imagen; con la bandera bloqueada (red caída) la imagen se genera igual y se descarga (el canvas no queda contaminado); un club sin escudo muestra el escudo genérico.
- **CA-21** Nombres largos: capturas con nombres de 40 caracteres de ancho (`WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW` y uno con tildes y espacios) en los seis estilos: ninguno desborda el marco ni pisa la columna de la esquina.
- **CA-22** Movimiento: con `prefers-reduced-motion: reduce` emulado la carta no anima; sin él, la franja de luz cruza la carta.
- **CA-23** Una carta de una fila del ranking sin `card` (carrera vieja) se muestra con "—" en media, posición, atributos y cifras, sin errores en consola.
- **CA-24** Rendimiento (medida, no umbral duro): se registran en el plan el tiempo de generar la imagen con efectos completos y simples, y el de abrir el diálogo, en Chromium y en WebKit; el plan fija el criterio para activar los efectos simples a partir de esas cifras.

**Cierre**
- **CA-25** `npm run build` pasa; `npx tsx scripts/ranking.test.ts`, `scripts/trofeos.test.ts` y el resto de `scripts/*.test.ts` siguen pasando; `git diff` no toca `api/`, `db/` ni `package.json`.
- **CA-26** `grep` de `TIERS` y de las reglas `.fut-` antiguas en `src/` sin resultados fuera de lo nuevo.

## Seguridad (OWASP)
- **A03 (inyección):** la carta se arma con texto que viene del servidor (nombre, departamento) y del jugador. Todo texto dinámico dentro del SVG pasa por `esc()` y por una limpieza de caracteres no válidos en XML antes de insertarse; los colores se validan contra `#rrggbb`; las direcciones de la bandera y del escudo no se construyen con texto del servidor (la bandera sale del código de país conocido y el escudo de un club que existe en el juego). En la imagen el nombre se dibuja con `fillText` (no es marcado). Un nombre malicioso nunca llega a un atributo ni a una etiqueta sin escapar.
- **A08 (datos del servidor no confiables):** `RankCard`, los números de la fila y el avatar se **validan y acotan en el navegador** antes de pintar (enteros dentro de rango; el avatar con índices dentro de las listas de `avatar.ts`; la posición dentro de las cuatro). Lo inválido se trata como faltante. El servidor ya valida, pero el cliente no lo da por hecho.
- **A06 (componentes vulnerables):** sin dependencias nuevas; ni librería de gráficos ni de fuentes.
- **A05 (configuración):** sin cambios. La bandera se pide a `flagcdn.com` como hoy en el diálogo; para el canvas se pide con CORS anónimo (el servidor responde `access-control-allow-origin: *`) y si falla se usa el respaldo, de modo que el canvas nunca queda contaminado.
- Sin superficie nueva en el resto: no hay rutas, parámetros, almacenamiento, autenticación ni peticiones nuevas al servidor propio.

## Coordinación
- En paralelo se trabaja "Retos en línea, perfil y ¿De dónde es?", que toca `main.ts` (perfil y avatar), `api/` y `src/retos/`. Esta feature se queda en `src/ui/card.ts`, un módulo nuevo (`src/ui/carta-svg.ts`), `src/style.css` (solo el bloque `.fut*`), `scripts/carta.test.ts` y un cambio acotado en `main.ts`: `futCard`, la línea de importación de `card`, y la función que enlaza escudos del diálogo.
- Dependencia fija: `avatarSVG(avatar, kit, dorsal, tamaño)` de `src/ui/avatar.ts` y el tipo `Avatar`. Si la otra rama cambia esa firma o agrega campos al avatar, se adapta al integrar (el desvanecimiento del retrato quita el rectángulo de fondo del avatar con una expresión regular; una prueba la vigila, ver plan).
- Si la otra rama agrega campos a `RankCard` o a lo que guarda el ranking, la carta los ignora; los atributos siguen saliendo de los cinco campos de RF-20.

## Decisiones (defaults razonables)
- **D-01 Un solo diseño en las dos superficies, fiel a la referencia** (del orquestador): silueta, marco metálico, textura, hundido, esquina izquierda, retrato, nombre, atributos, placa, etiqueta y brillo solo en HTML.
- **D-02 Los seis estilos con paleta propia** (del orquestador): oro, plata, bronce e ícono como la referencia; héroe y salón derivados de los colores que tenían (héroe violeta y cian sobre oscuro; salón grafito con plata y vidrio quebrado).
- **D-03 Una función única arma el SVG** (del orquestador): `cartaSVG(datos, estilo, opciones)`, sin DOM. La carta HTML la inserta en línea. La imagen usa la **misma función en modo `arte`** (solo metal y geometría) cargada como imagen, y dibuja el texto, la bandera, el escudo y el retrato con el canvas. Justificación en el plan.
- **D-04 Atributos por función pura** (del orquestador), con la tabla de arriba. **Desvío:** las vallas invictas no entran, porque el ranking no las guarda y la misma carrera mostraría números distintos en la imagen y en el ranking (A3).
- **D-05 Porteros con etiquetas propias** (decisión mía): EST, MAN, SAQ, REF, VEL, COL. Cuesta una fila en la tabla y evita "TIR 40" en un portero. Se evita "POS" (choca con la posición) y "ESTIR" (no cabe en 30 unidades).
- **D-06 La placa de un portero muestra AST en lugar de GOL** (decisión mía): conserva lo que hace hoy la imagen (portero muestra asistencias).
- **D-07 Composición de la imagen:** carta a escala 2,6 centrada (780 x 1144 px en 1080 x 1350), con 40 px arriba, veredicto debajo y pie de marca al final. El fondo conserva el color oscuro y el halo del estilo.
- **D-08 El veredicto se conserva fuera de la carta:** debajo de la carta en el diálogo y en la imagen, no dentro de ella. El resto de lo que mostraba la carta anterior se quita (A1).
- **D-09 Dos niveles de efectos** (`completo` y `simple`) con un solo conmutador, en vez de detección de dispositivo. La imagen genera con `completo` y cae a `simple` si falla o tarda; la carta HTML usa `completo`. Se mide en el plan (T6) y el umbral lo fija esa medición (A2).
- **D-10 Contraste sobre fidelidad en los tonos que no cumplen:** se oscurece el tono de las etiquetas en oro y bronce y se reduce la sombra inferior de la cara en los estilos claros, lo mínimo para llegar a 4,5:1 (A7).
- **D-11 Sin `mix-blend-mode`:** el grano y el cepillado se componen con transparencia normal. La referencia usa `overlay`, con soporte irregular en SVG en Safari.
- **D-12 La referencia se versiona:** `specs/carta-fc-clasica/referencia/Main.dc.html` es la copia del artboard aprobado, para que el spec no dependa de una carpeta temporal.

## Aclaraciones (ninguna bloquea el paso a plan)
- **A1** [NECESITA ACLARACIÓN: ¿se aceptan las pérdidas de contenido de la imagen y del diálogo? La imagen de hoy muestra palmarés (hasta 5 trofeos), momento destacado, trayectoria de clubes y partidos con la Selección; la carta del diálogo muestra AST, SEL y PTS. La carta de la referencia no tiene nada de eso y la silueta de 300 x 440 deja 150 px de fondo a cada lado en la imagen de 1080. Default: se quitan; el veredicto y el pie quedan debajo de la carta, y todo lo demás sigue en la pantalla de resultados. Alternativa: volver a poner palmarés y trayectoria en una franja debajo de la carta (implica reducir la carta a 2,2 de escala).] No bloquea: se implementa lo pedido ("fiel a la referencia").
- **A2** [NECESITA ACLARACIÓN: umbral de rendimiento en iPhone. ¿Hay un iPhone (o BrowserStack) para medir la generación de la imagen y la apertura del diálogo con y sin filtros? Default: el plan mide en Chromium y WebKit de escritorio y define el respaldo por error o tiempo (más de 1.500 ms al generar la imagen); si la medición en WebKit lo justifica, la variante simple se activa por defecto en WebKit.] No bloquea.
- **A3** [NECESITA ACLARACIÓN: vallas invictas para porteros. El pedido las menciona "si existen"; existen por temporada (`SeasonRecord.cleanSheets`) pero `RankCard` no las guarda, y el servidor no se toca. Default: no se usan en ninguna superficie; la carta de un portero depende solo de la media. Si se quieren, hay que agregar un campo a `RankCard` y a `toCard()` en `api/ranking.ts` (fuera de esta feature).] No bloquea.
- **A4** [NECESITA ACLARACIÓN: etiquetas de portero. Default EST, MAN, SAQ, REF, VEL, COL (D-05). ¿Se prefieren las mismas seis etiquetas de campo para todos?] No bloquea: cambiarlo cuesta una línea.
- **A5** [NECESITA ACLARACIÓN: la imagen pide la bandera real a `flagcdn.com` (hoy dibuja franjas de color). Con la red o ese servicio caído, o con CORS rechazado, usa las franjas. ¿Se acepta depender de un servicio externo para la imagen, o se prefieren siempre las franjas y la bandera real solo en la carta HTML?] No bloquea: default, bandera real con respaldo.
- **A6** [NECESITA ACLARACIÓN: paletas de héroe y salón. No están en la referencia; el plan las deriva de lo que tenían y de la paleta "héroe" del generador. ¿El usuario las valida con las capturas de T7?] No bloquea: se corrigen en la tabla de paletas.
- **A7** [NECESITA ACLARACIÓN: la referencia no cumple 4,5:1 en oro y bronce (etiquetas de atributos medidas en 2,5 a 3,4:1 y rótulo de la punta en 3,5:1). Default: oscurecer las etiquetas y reducir la sombra inferior de la cara hasta cumplir (D-10). ¿Se acepta ese pequeño cambio respecto del artboard aprobado?] No bloquea.
- **A8** [NECESITA ACLARACIÓN: ¿la carta animada del diálogo debe pausarse fuera de pantalla o al cerrarse? Default: no; hay una sola carta animada a la vez (diálogo o ejemplo de la landing) y el costo es una franja de transformación.] No bloquea.

Bloqueantes abiertas: **ninguna**.
