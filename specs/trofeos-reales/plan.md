# Plan: premios y trofeos reales con imágenes

Stack: el del repo (TypeScript vanilla, Vite, DOM por strings y `render()`). Sin dependencias nuevas. Cambio mínimo en el motor: la **lógica de los premios nuevos vive en un archivo puro** (`src/engine/awards.ts`) que `simulateSeason` consulta con unas pocas líneas; la UI resuelve la imagen de cada trofeo con una **tabla fija por etiqueta** y las imágenes son archivos estáticos del propio sitio.

## Cómo funciona hoy (lo que el plan usa)
- `simulateSeason` (`engine.ts`) arma los premios con `award(kind, name)`, que escribe `"${name} de ${liga} ${temporada}"` con `club.league`. El goleador sale con `goals >= (tier === 3 ? 16 : 20)`. `p.awards` guarda los textos; `SeasonRecord.awards` guarda `{ kind, name }`. Ningún premio gasta el azar salvo `portero`, `mvp`, `ideal` y `joven` (`chance(rng, ...)`).
- `club` es la **vista del jugador**: para un club de afuera, `club.tier` es 0 (36 partidos, `MATCHES[0]`) y `club.league` es la liga real. `clubById(club.id)` (variable `own` en el cálculo de títulos) da la división y el país **reales** del club. Los premios nuevos usan `own`.
- `AWARD_POINTS` (`Record<AwardKind, number>`) solo suma goleador y mvp (5). Su comentario dice que los demás no puntúan para que las carreras ya guardadas sigan siendo comparables. `summarize` suma `awardPoints` al puntaje entero. Puntaje medio 108,3 y máximo 717 (`simulate 20000`).
- `api/ranking.ts` valida `isInt(score, -100, 1000)` y títulos hasta 200. La carta que se envía no lleva premios.
- `palmares()` (`ui/palmares.ts`) agrupa por `AWARD_LABEL[a.kind]`: todos los goleadores caen en una sola línea. `TrophyIcon = AwardKind | 'copa'`; `ICON`, `AWARD_LABEL` y `AWARD_BASE` son `Record<AwardKind, ...>` (TypeScript obliga a completar los tipos nuevos). `card.ts` dibuja `ICON` en el canvas; `bestMoment` usa `AWARD_BASE`.
- `main.ts`: `trophy(icon, label, detail)` pinta un `<svg>` de 48 x 48 en `.trophy`; lo usan `seasonCard` y `finish`; `seasonLog` muestra chips con `AWARD_LABEL[a.kind]`. `label` hoy no pasa por `esc()` (eran constantes). `celebrate(name, big)` se llama solo para campeón de Selección. `footer()` enlaza privacidad y términos (`import.meta.env.BASE_URL`).
- `vite.config.ts` construye tres páginas (`index`, `privacidad`, `terminos`). `public/` solo tiene `escudos/`, `favicon.*` y `og.png`. El modo `single` (`build:preview`) no incluye `public/` en el archivo único: allí las imágenes no cargan y se ven los íconos (es el comportamiento de fallo, aceptado).
- `terminos.html` ya dice "Sin afiliación" (FIFA, EA Sports, federaciones, ligas y clubes). `privacidad.html` lista como servicios externos solo Google Fonts y flagcdn.com; no cambia.
- Estado del repo: HEAD `adc673f` ya integra el PR #12 (minijuegos); no hay choque vivo con `engine.ts`, `types.ts`, `main.ts` ni `simulate.ts`.

## Hallazgos que cambian el pedido (medidos, ver "Línea base" del spec)
1. **El nivel 90 no existe**: pico de 90 o más en 0,1 % de las carreras, también con decisiones óptimas. El Balón de Oro usa 84 (Decisión 3 del spec).
2. **Afuera se juegan 36 partidos y en casa 44** (`MATCHES`): el máximo de goles de un delantero es 21 afuera y 28 en casa. Un tope fijo de goles dejaría sin Bota de Oro a los extranjeros; por eso la Bota usa la tasa de goles por partido.
3. **"Primera división" es `clubById(club.id).tier === 1`, no `club.tier`**: un chapín en LaLiga ve `tier 0` y perdería el Pichichi y el resto de los premios.
4. **Conflicto spec y código**: el comentario de `AWARD_POINTS` dice que los premios nuevos no puntúan. Se decide que sí puntúan (Decisión 6 del spec) y se actualiza el comentario.
5. **`palmares()` agruparía todos los goleadores en una línea**: la clave de agrupación pasa a ser la etiqueta del premio.

## Archivos
| Archivo | Cambio |
|---|---|
| `src/engine/types.ts` | `AwardKind` suma `'balon' \| 'bota' \| 'golden'` **al final** de la unión; `SeasonAward.label?: string` al final de la interfaz (nombre corto sin liga ni temporada: "Pichichi"). Nada más. |
| `src/engine/awards.ts` (nuevo) | Funciones puras sin DOM: `scorerName(country, tier)` (la tabla de RF-01), `majorAwards(facts)` (RF-02 a RF-04) y las constantes (países, umbrales, topes). Importa `countryOf` de `countries.ts` para `conf` y `level`. |
| `src/engine/engine.ts` | Una importación; en `simulateSeason` el goleador toma su nombre de `scorerName` y, después de `joven`, un bucle agrega los premios de `majorAwards`; `AWARD_POINTS` suma `balon: 25, bota: 15, golden: 10` y se reescribe su comentario. `summarize`, `choose` y `drawEvent` no se tocan. Ningún `chance()` nuevo. |
| `src/ui/palmares.ts` | `AWARD_LABEL`, `ICON` (3 íconos de trazo nuevos: balón sobre peana, bota, estrella con laurel), `AWARD_ORDER` y `AWARD_BASE` con los tres tipos; `titleLabel(t)` exportada (la lógica que hoy está dentro de `palmares()`); la tabla `TROFEO_IMG` y `trophyImg(label, icon)`; `palmares()` agrupa por `a.label ?? AWARD_LABEL[a.kind]` y devuelve `img?` en cada línea. |
| `src/main.ts` | `trophy(icon, label, detail, img?)` con la imagen y `esc()` en todo; `seasonCard` y `finish` pasan la imagen; chips de `seasonLog` con `a.label ?? AWARD_LABEL[a.kind]`; un solo oyente `error` delegado; el enlace "Créditos de imágenes" en `footer()`; la llamada de celebración del Balón de Oro. |
| `src/ui/celebrate.ts` | Tercer parámetro opcional `extra?: { title: string; img: { src: string; alt: string } }` que cambia el título y suma la imagen del banner. Sin él, igual que hoy. |
| `src/style.css` | `.trophy-img` (48 x 48, `object-fit: contain`, fondo claro, relleno 4 px, radio 12 px) y `.party-banner img` (96 x 96). Bloque propio al final. |
| `public/trofeos/` (nuevo) | 20 imágenes WebP de Commons (tabla de abajo) y 3 SVG propios: `copa-dorada.svg`, `bota-dorada.svg`, `golden-boy.svg`. |
| `creditos.html` (nuevo) | Créditos de imágenes (RF-11), con el mismo estilo en línea que `terminos.html`. |
| `vite.config.ts` | Una línea: `creditos` en `rollupOptions.input`. |
| `terminos.html` | En "Sin afiliación", una frase sobre premios y trofeos con enlace a los créditos, y la fecha de última actualización. |
| `README.md` | Tres líneas en la tabla de estructura: `awards.ts`, `public/trofeos/` y `creditos.html`. |
| `api/ranking.ts` y `scripts/ranking.test.ts` | Solo si la medición lo pide (RF-12): el límite de puntaje y su prueba. |
| `scripts/simulate.ts` | Un bloque propio "Trofeos" al final (CA-1 a CA-5). |
| `scripts/trofeos.test.ts` (nuevo) | Pruebas estáticas de imágenes, mapa y créditos (CA-6, CA-7). Se corre con `npx tsx scripts/trofeos.test.ts`, como `ranking.test.ts`. |

## Motor

### Tipos
```ts
export type AwardKind = 'goleador' | 'asistidor' | 'portero' | 'joven' | 'mvp' | 'ideal' | 'balon' | 'bota' | 'golden';
export interface SeasonAward { kind: AwardKind; name: string; label?: string /* "Pichichi"; sin él, AWARD_LABEL[kind] */ }
```
Las carreras o temporadas viejas no traen `label` ni los tipos nuevos: se muestran como hoy (RF-12).

### `awards.ts`
```ts
export const SCORER_NAME: Record<string, string> = { ES: 'Pichichi', IT: 'Capocannoniere', EN: 'Bota de Oro de la Premier League', DE: 'Torjägerkanone', FR: 'Máximo goleador de la Ligue 1' };
export const scorerName = (country: string, ownTier: Tier) => (ownTier === 1 ? SCORER_NAME[country] : undefined);

export interface SeasonFacts {
  rating: number;      // Math.round(p.rating): el mismo que guarda el registro
  age: number;
  fame: number;        // p.fame antes de cerrar la temporada
  apps: number; goals: number;
  matches: number;     // MATCHES[tier] de la vista del jugador (36 afuera, 44 en casa)
  clubTitles: number;  // títulos de club de la temporada (los de Selección se agregan después)
  own: { country: string; tier: Tier }; // el club REAL: país y división en su propia liga
  held: { balon: number; bota: number; golden: boolean }; // lo ya ganado en la carrera
}
export function majorAwards(f: SeasonFacts): ('balon' | 'bota' | 'golden')[]
```
Reglas (parámetros iniciales; si `simulate` pide afinarlos, se actualiza el spec):
- Común: `own.tier === 1`. `conf = countryOf(own.country).conf`, `level = countryOf(own.country).level`.
- **Bota** (`conf === 'UEFA'`): `goals * (TOP5.includes(own.country) ? 2 : 1.5) >= 1.1 * matches` y `held.bota < 3`. `TOP5 = ES, EN, IT, DE, FR`.
- **Golden Boy** (`conf === 'UEFA'`): `age <= 21 && apps >= 0.5 * matches && rating >= 70 && !held.golden`. La regla se apoya en `held`, que `engine.ts` cuenta de `p.seasons` (no hace falta ninguna bandera).
- **Balón** (`level >= 14`): `rating >= 84 && apps >= 0.7 * matches && (goals >= 15 || clubTitles >= 1) && fame >= 60 && held.balon < 5`. Niveles de liga hoy en esa banda: ES 22, EN 24, IT 21, DE 21, FR 19, BR 17, PT 15, AR 15, NL 14, MX 14.
- Puro y sin `rng`: la misma semilla da las mismas temporadas (CA-5).

### `engine.ts`
En `simulateSeason`, donde hoy se arma el goleador y el resto de los premios:
```ts
const own = clubById(club.id);
const named = scorerName(own.country, own.tier);
if (goals >= (tier === 3 ? 16 : 20)) {
  if (named) awards.push({ kind: 'goleador', label: named, name: `${named} ${seasonLabel(p.year)}` });
  else award('goleador', 'Goleador');
}
// ... asistidor, portero, mvp/ideal, joven como hoy ...
const held = (k: AwardKind) => p.seasons.reduce((n, r) => n + r.awards.filter((a) => a.kind === k).length, 0);
for (const kind of majorAwards({ rating: Math.round(p.rating), age: p.age, fame: p.fame, apps, goals, matches: MATCHES[tier], clubTitles: titles.length, own, held: { balon: held('balon'), bota: held('bota'), golden: held('golden') > 0 } }))
  awards.push({ kind, name: `${AWARD_LABEL_ES[kind]} ${seasonLabel(p.year)}` }); // 'Balón de Oro', 'Bota de Oro', 'Golden Boy'
```
`AWARD_LABEL_ES` es un objeto de tres cadenas en `awards.ts` (el motor no importa de `ui/`); `palmares.ts` lo importa para completar `AWARD_LABEL`, así el texto vive en un solo lugar. Los premios nuevos se agregan **al final** del arreglo de la temporada: el orden de los demás no cambia. `titles` ya es solo de club en ese punto (la Selección se suma después, en `simulateNationalTeam`).

### Puntaje
`AWARD_POINTS = { goleador: 5, mvp: 5, portero: 0, asistidor: 0, joven: 0, ideal: 0, balon: 25, bota: 15, golden: 10 }`. El comentario pasa a decir que los premios nuevos puntúan por decisión del producto y que son muy raros (el medio sube menos de 1 punto, CA-4). El aporte máximo por carrera es 5 x 25 + 3 x 15 + 10 = 180.

### Frecuencia (RF-05): qué se mide y con qué
Se corre `npm run simulate -- 20000` (las potencias son 9 de 27 nacionalidades: unas 6.700 carreras; a 1 % son unos 67 casos, con ruido de ±25 % relativo, por eso las bandas son anchas). Mediciones previas con las reglas de arriba (16.200 carreras, decisiones al azar; con política optimista entre paréntesis):

| Premio | Potencias (≥ 1) | Guatemala | Todos | Media por carrera (potencias) |
|---|---|---|---|---|
| Balón de Oro (84) | 1,4 % (2,2 %) | 0,0 % | 0,6 % | 0,039 (0,070) |
| Bota de Oro (1,1 x partidos) | 1,4 % (1,1 %) | 0,0 % | 0,5 % | 0,020 (0,016) |
| Golden Boy (70) | 1,4 % (2,6 %) | 0,0 % | 0,5 % | 0,015 (0,029) |

Si tras implementar una celda sale de su banda, se mueve **un** umbral (nivel del Balón, 1,1 de la Bota o nivel del Golden Boy) y se anota en "Resultados de la calibración" del spec. Es una calibración, no un cambio de regla.

## Imágenes

### Investigación en Commons (hecha en esta fase)
Búsqueda por el motor de Commons y por sus categorías (`... trophy icons`, `Trophy of ...`), con las licencias, autores, tamaños y marcas de borrado leídos de la API de Commons el 14/10/2026. **Criterios de exclusión**: licencia no libre; marcada para borrado; logo de patrocinador visible; origen de prensa; personas. Lo que se elige, y lo que no, con el motivo:

**Elegidas (20 de Commons).** Todas se descargan una vez, se recortan y se redimensionan a 200 px como máximo, y se guardan como `public/trofeos/<clave>.webp`.

| Clave (`public/trofeos/<clave>.webp`) | Se usa para | Página en Commons | Archivo original | Autor | Licencia | Notas |
|---|---|---|---|---|---|---|
| balon-de-oro | Balón de Oro | [Balón de oro.png](https://commons.wikimedia.org/wiki/File:Bal%C3%B3n_de_oro.png) | https://upload.wikimedia.org/wikipedia/commons/0/0b/Bal%C3%B3n_de_oro.png | Dintrex | Dominio público | 2529x2990, 231 KB. Ilustración plana de una réplica; etiqueta `PD-shape` puesta por el autor (ver riesgo 3). |
| pichichi | Pichichi (goleador de LaLiga) | [Trofeo Pichichi CR7Museum.jpg](https://commons.wikimedia.org/wiki/File:Trofeo_Pichichi_CR7Museum.jpg) | https://upload.wikimedia.org/wikipedia/commons/a/a0/Trofeo_Pichichi_CR7Museum.jpg | Tkotw12 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | 3840x2560, 1282 KB. Foto en vitrina de museo: se recorta la copa de la izquierda. Lleva grabado "MARCA" (parte del objeto). |
| laliga | LaLiga | [Trofeo de La Liga 9900.jpg](https://commons.wikimedia.org/wiki/File:Trofeo_de_La_Liga_9900.jpg) | https://upload.wikimedia.org/wikipedia/commons/d/d3/Trofeo_de_La_Liga_9900.jpg | Lisímaco de Egipto | [CC0](https://creativecommons.org/publicdomain/zero/1.0/deed.en) | 2304x3072, 2847 KB. Foto; se recorta el trofeo (sin la rotulación del fondo). |
| premier-league | Premier League | [Premier league trophy icon.png](https://commons.wikimedia.org/wiki/File:Premier_league_trophy_icon.png) | https://upload.wikimedia.org/wikipedia/commons/2/2c/Premier_league_trophy_icon.png | Riccardo de Conciliis | [CC BY-SA 2.5](https://creativecommons.org/licenses/by-sa/2.5) | 362x453, 124 KB. Ilustración; sin patrocinador. |
| serie-a | Serie A | [Coppa Campioni d'Italia (Serie A).png](https://commons.wikimedia.org/wiki/File:Coppa_Campioni_d'Italia_(Serie_A).png) | https://upload.wikimedia.org/wikipedia/commons/a/ae/Coppa_Campioni_d%27Italia_%28Serie_A%29.png | ForzaJuve2019 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | 365x600, 7 KB. Ilustración plana, fondo transparente. |
| bundesliga | Bundesliga | [Meisterschale.png](https://commons.wikimedia.org/wiki/File:Meisterschale.png) | https://upload.wikimedia.org/wikipedia/commons/b/be/Meisterschale.png | it:Utente:Roberto82 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | 500x500, 135 KB. Ilustración de la Meisterschale; el autor la migró de GFDL a CC BY-SA 3.0. |
| liga-mx | Liga MX | [Liga MX Trophy.jpg](https://commons.wikimedia.org/wiki/File:Liga_MX_Trophy.jpg) | https://upload.wikimedia.org/wikipedia/commons/c/c3/Liga_MX_Trophy.jpg | Hefebreo | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | 612x1400, 140 KB. Foto (recorte de una foto de Flickr revisada en Commons); se recorta el fondo de césped. |
| mls | MLS | [MLS Cup.svg](https://commons.wikimedia.org/wiki/File:MLS_Cup.svg) | https://upload.wikimedia.org/wikipedia/commons/1/1a/MLS_Cup.svg | Luigi Chiesa | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | 120x250, 5 KB. Ilustración vectorial de la MLS Cup. |
| eredivisie | Eredivisie | [Eredivisie Trophy.png](https://commons.wikimedia.org/wiki/File:Eredivisie_Trophy.png) | https://upload.wikimedia.org/wikipedia/commons/2/2f/Eredivisie_Trophy.png | MacMoreno | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | 851x854, 409 KB. Ilustración; el escudo de la KNVB va grabado en el trofeo real (parte del objeto). |
| argentina | Liga Profesional Argentina | [LigaProfesionalArg21.png](https://commons.wikimedia.org/wiki/File:LigaProfesionalArg21.png) | https://upload.wikimedia.org/wikipedia/commons/3/35/LigaProfesionalArg21.png | LCont5 | [CC0](https://creativecommons.org/publicdomain/zero/1.0/deed.en) | 573x1000, 128 KB. Ilustración, CC0. |
| brasil | Brasileirão Série A | [BrasileiraoA2014-.png](https://commons.wikimedia.org/wiki/File:BrasileiraoA2014-.png) | https://upload.wikimedia.org/wikipedia/commons/9/92/BrasileiraoA2014-.png | Guigoma | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | 1090x1474, 133 KB. Ilustración del trofeo vigente desde 2014. |
| colombia | Liga BetPlay | [PrimeraA2020-.png](https://commons.wikimedia.org/wiki/File:PrimeraA2020-.png) | https://upload.wikimedia.org/wikipedia/commons/e/ee/PrimeraA2020-.png | LCont5 | [CC0](https://creativecommons.org/publicdomain/zero/1.0/deed.en) | 207x500, 33 KB. Ilustración, CC0. |
| peru | Liga 1 de Perú | [TrofeoLiga1-Peru.svg](https://commons.wikimedia.org/wiki/File:TrofeoLiga1-Peru.svg) | https://upload.wikimedia.org/wikipedia/commons/8/8d/TrofeoLiga1-Peru.svg | Lamder | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | 512x1233, 391 KB. Ilustración vectorial. |
| paraguay | Primera División de Paraguay | [CopaDePrimeraAPF2016-.png](https://commons.wikimedia.org/wiki/File:CopaDePrimeraAPF2016-.png) | https://upload.wikimedia.org/wikipedia/commons/9/95/CopaDePrimeraAPF2016-.png | LCont5 | [CC0](https://creativecommons.org/publicdomain/zero/1.0/deed.en) | 319x1000, 145 KB. Ilustración, CC0. |
| ecuador | LigaPro Serie A | [Football of Ecuador - LigaPro Trophy.svg](https://commons.wikimedia.org/wiki/File:Football_of_Ecuador_-_LigaPro_Trophy.svg) | https://upload.wikimedia.org/wikipedia/commons/3/31/Football_of_Ecuador_-_LigaPro_Trophy.svg | Sageo | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | 339x665, 22 KB. Ilustración vectorial. |
| costa-rica | Primera División de Costa Rica | [Costa Rican Primera Division Trophy Icon.png](https://commons.wikimedia.org/wiki/File:Costa_Rican_Primera_Division_Trophy_Icon.png) | https://upload.wikimedia.org/wikipedia/commons/1/1d/Costa_Rican_Primera_Division_Trophy_Icon.png | ElYolero6 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | 845x1646, 169 KB. Ilustración. |
| champions-league | Champions League (UEFA) | [UEFA - Champions League.png](https://commons.wikimedia.org/wiki/File:UEFA_-_Champions_League.png) | https://upload.wikimedia.org/wikipedia/commons/b/b1/UEFA_-_Champions_League.png | Brgesto | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | 318x496, 27 KB. Ilustración sin logos. Alternativa CC0 (foto en museo, más sucia): `2005 Champions League trophy in Anfield museum.jpg`, de Jprw. |
| libertadores | Copa Libertadores | [Taça Libertadores 2013.png](https://commons.wikimedia.org/wiki/File:Ta%C3%A7a_Libertadores_2013.png) | https://upload.wikimedia.org/wikipedia/commons/0/03/Ta%C3%A7a_Libertadores_2013.png | Gabrielhsp | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | 860x1367, 605 KB. Recorte con fondo transparente. Alternativa CC0 (foto en vitrina con espejos): `Troféu da Copa Libertadores da América de 2023.jpg`, de Alexandre M. B. Berwanger. |
| concacaf | Concacaf Champions Cup | [Trofeo de Liga de Campeones Concacaf.svg](https://commons.wikimedia.org/wiki/File:Trofeo_de_Liga_de_Campeones_Concacaf.svg) | https://upload.wikimedia.org/wikipedia/commons/4/4b/Trofeo_de_Liga_de_Campeones_Concacaf.svg | ElYolero6 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | 143x316, 22 KB. Ilustración vectorial. |
| caf | Champions League de la CAF | [CAF Champions League Trophy.svg](https://commons.wikimedia.org/wiki/File:CAF_Champions_League_Trophy.svg) | https://upload.wikimedia.org/wikipedia/commons/6/6b/CAF_Champions_League_Trophy.svg | Mess | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | 500x1000, 34 KB. Ilustración vectorial. |

Las licencias de las filas son las que muestra la API de Commons; las páginas de archivo son la fuente que se enlaza en los créditos. Las notas dicen qué se recorta.

**Descartadas, con el motivo** (para que nadie las vuelva a proponer):

| Trofeo | Archivo de Commons | Motivo |
|---|---|---|
| Ligue 1 | [`Ligue 1 Trophy 2024.png`](https://commons.wikimedia.org/wiki/File:Ligue_1_Trophy_2024.png) (CC0, Papertop) | Marcada en Commons con "Deletion requests July 2026". Se usa la copa propia. Los otros trofeos de la Ligue 1 ([`Ligue1 trophy.svg`](https://commons.wikimedia.org/wiki/File:Ligue1_trophy.svg), de Kanchelskis, CC BY-SA 3.0) son un esquema que no se reconoce. |
| Champions League de la AFC | [`AFC Champions League trophy.jpg`](https://commons.wikimedia.org/wiki/File:AFC_Champions_League_trophy.jpg) (CC BY 4.0, Mehdi Bolourian) | La fuente declarada es una agencia de prensa (Fars) y la base lleva el logo de la competición. Se usa la copa propia. |
| Bota de Oro de la Premier League | [`2008 Premier League GoldenBoot CR7Museum.jpg`](https://commons.wikimedia.org/wiki/File:2008_Premier_League_GoldenBoot_CR7Museum.jpg) (CC BY-SA 4.0, Tkotw12), [`PremierLeagueGoldenBoot.png`](https://commons.wikimedia.org/wiki/File:PremierLeagueGoldenBoot.png) (CC BY-SA 4.0, KenanKagan2004) | Muestran el logo del patrocinador ("Barclays"). Se usa la bota propia. |
| Capocannoniere | [`Premio di capocannoniere.jpg`](https://commons.wikimedia.org/wiki/File:Premio_di_capocannoniere.jpg) (CC BY-SA 4.0, Danielino3191) | Es un aficionado con unas botas, no el premio de la Serie A. No hay foto libre del trofeo. Se usa la bota propia. |
| Bota de Oro (europea) | [`Bota de oro.png`](https://commons.wikimedia.org/wiki/File:Bota_de_oro.png) (dominio público, Dintrex), [`Bota de oro.svg`](https://commons.wikimedia.org/wiki/File:Bota_de_oro.svg) (CC0, Mannivu) y las fotos de vitrina de la categoría `European Golden Shoe` (Messi, Forlán, Pančev, Eusébio, CR7 Museum) | El objeto real es una réplica de bota con las tres bandas diagonales de una marca deportiva grabadas (se ven en la foto de Pančev y en las dos ilustraciones): es el logo de una marca en el trofeo. Las otras fotos son oscuras o tienen una camiseta firmada de fondo y no se recortan limpias. Se usa la bota propia. |
| Torjägerkanone | [`Kanone4.jpg`](https://commons.wikimedia.org/wiki/File:Kanone4.jpg) (CC BY-SA 3.0, Kicker Sportmagazin) | Origen en prensa (es la revista que entrega el premio): se aplica la misma regla que a la AFC aunque Commons la tenga con CC, y la licencia, migrada de GFDL en de.wikipedia, no muestra un permiso verificable por terceros. Se usa la bota propia. |
| Golden Boy | (ninguno) | La [categoría `Golden Boy (award)`](https://commons.wikimedia.org/wiki/Category:Golden_Boy_(award)) está vacía y las búsquedas solo devuelven flores, un bus y una obra de teatro. Ilustración propia. |
| Liga MX | [`Liga MX trophy.png`](https://commons.wikimedia.org/wiki/File:Liga_MX_trophy.png) (CC BY-SA 4.0, Cementeɾo) | Se ve como una silueta negra. Se usa la foto de Hefebreo. |
| Bolivia | [`Trofeo de liga boliviana.png`](https://commons.wikimedia.org/wiki/File:Trofeo_de_liga_boliviana.png) (CC BY-SA 4.0, GRop5t) | Silueta oscura sin detalle a 200 px. Copa propia. |
| Uruguay | [`Silueta trofeo Campeón Uruguayo (blanco).png`](https://commons.wikimedia.org/wiki/File:Silueta_trofeo_Campe%C3%B3n_Uruguayo_(blanco).png) (dominio público, Juanchocarbonero) | Siluetas marcadas como "trademarked". Copa propia. |
| Portugal, Japón, Arabia Saudita, Marruecos, Chile, Venezuela, Honduras, El Salvador, Panamá, Guatemala | (sin archivo útil) | Búsquedas por la categoría `... trophy icons` y por texto sin resultado con un trofeo de la liga actual (solo libros escaneados o fotos con personas); `2013 البطولة المغربية الإحترافية .png` es de una radio. Copa propia. |
| Premier League, Bundesliga | Fotos con jugadores, con patrocinador, o vitrinas con reflejos | Se prefieren las ilustraciones limpias de la tabla. |
| Champions League y Libertadores | Fotos CC0 de museo (Jprw; Berwanger) | Están como alternativas en las notas de la tabla: la ilustración elegida queda más limpia a 200 px. Si se prefiere CC0 para tener menos obligaciones de crédito, se cambian sin tocar nada más. |

**Ilustraciones propias (3 SVG)**, de menos de 2 KB cada una, sin texto y en la paleta de la copa que ya dibuja `hero('titulo')` en `palmares.ts` (relleno `#F0C14B`, borde `#9A6B12`):
- `copa-dorada.svg`: toda liga sin imagen (Ligue 1, Liga Portugal, J1 League, Saudi Pro League, Botola Pro y las primeras de Guatemala, Honduras, El Salvador, Panamá, Chile, Uruguay, Bolivia y Venezuela), todas las divisiones de ascenso, la Champions League de la AFC y la Copa Centroamericana.
- `bota-dorada.svg`: Bota de Oro, Capocannoniere, Torjägerkanone, Bota de Oro de la Premier League y Máximo goleador de la Ligue 1.
- `golden-boy.svg`: balón dorado sobre un pedestal con una estrella, distinto del balón del Balón de Oro por el pedestal escalonado.

**Procesamiento** (solo en desarrollo, fuera de `package.json`; los originales se bajan a una carpeta temporal fuera del repo y no se versionan):
1. Descarga del archivo original (columna "Archivo original") con `curl -A "Chamusqueros (contacto)"`.
2. Fotos: recorte manual al trofeo (`magick in.jpg -crop AxB+X+Y +repage`); ilustraciones: sin recorte, solo bordes transparentes sobrantes (`-trim`). Las vectoriales se rasterizan a 400 px (`magick -background none in.svg -resize 400x400`).
3. Reducción a 200 px por el lado mayor (`magick ... -resize 200x200`; `sips --resampleHeightWidthMax 200` sirve en macOS).
4. WebP con `cwebp -q 82 -alpha_q 90 -m 6` (ilustraciones planas, `-lossless` si pesan menos). Meta: 30 KB o menos de promedio; tope por archivo 40 KB; tope total 800 KB (lo esperable son 200 a 300 KB).
5. Se abre cada una sobre fondo claro y se confirma que el trofeo se reconoce y que no queda texto de patrocinador.

**Mapa de la UI** (`TROFEO_IMG` en `ui/palmares.ts`, clave = etiqueta del título o del premio; `{ file, alt }`):
- Premios: `Balón de Oro` y `Pichichi` (Commons); `Golden Boy` (propia `golden-boy`); `Bota de Oro`, `Torjägerkanone`, `Capocannoniere`, `Bota de Oro de la Premier League` y `Máximo goleador de la Ligue 1` (propia `bota-dorada`).
- Ligas con imagen: `LaLiga`, `Premier League`, `Serie A`, `Bundesliga`, `Liga MX`, `MLS`, `Eredivisie`, `Liga Profesional Argentina`, `Brasileirão Série A`, `Liga BetPlay`, `Liga 1 de Perú`, `Primera División de Paraguay`, `LigaPro Serie A`, `Primera División de Costa Rica`.
- Copas: `Champions League`, `Copa Libertadores`, `Concacaf Champions Cup`, `Champions League de la CAF`.
- `trophyImg(label, icon)`: si la etiqueta está en el mapa, esa imagen; si no y `icon === 'copa'`, `copa-dorada.svg`; si no (premios sin trofeo famoso y "Goleador de <liga>"), `undefined` y se dibuja `ICON`.
- Los textos alternativos son constantes de esta tabla ("Trofeo de LaLiga", "Balón de Oro, trofeo dorado con forma de balón"...), no llevan datos de la carrera.

## Interfaz

### `src/ui/palmares.ts`
- `AWARD_LABEL`, `AWARD_ORDER` (`balon`, `bota`, `golden`, `mvp`, `goleador`, ...) y `AWARD_BASE` (`balon: 90`, `bota: 55`, `golden: 45`: con el bono de liga, un Balón de Oro queda en 105 (110 si se ganó en el extranjero), por encima de casi cualquier hito salvo ser campeón del Mundial) con los tres tipos nuevos; `ICON` con los tres íconos de trazo (sirven de respaldo y para el canvas de `card.ts`).
- `palmares(p)`: títulos como hoy con `titleLabel(t)`; premios con `a.label ?? AWARD_LABEL[a.kind]` como clave; cada línea lleva `img = trophyImg(label, icon)`. `PalmaresItem` suma `img?` **al final**.
- `bestMoment`: solo las entradas nuevas de `AWARD_BASE` (el título del momento ya es `a.name`, que trae el nombre propio).

### `src/main.ts` y `src/style.css`
```ts
function trophy(icon: TrophyIcon, label: string, detail: string, img?: TrofeoImg) {
  const pic = img
    ? `<img class="trophy-img" src="${import.meta.env.BASE_URL}trofeos/${img.file}" width="48" height="48" loading="lazy" decoding="async" alt="${esc(img.alt)}" data-icon="${icon}">`
    : `<svg aria-hidden="true" viewBox="0 0 24 24">${ICON[icon]}</svg>`;
  return `<li class="trophy${icon === 'copa' ? '' : ' award'}">${pic}<span><b>${esc(label)}</b><small>${esc(detail)}</small></span></li>`;
}
document.addEventListener('error', (e) => {   // 'error' no burbujea: se atiende en la captura
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.classList.contains('trophy-img')) return;
  const icon = img.dataset.icon;
  if (icon && icon in ICON) img.outerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24">${ICON[icon as TrophyIcon]}</svg>`;
  else img.remove();
}, true);
```
- `seasonCard`: títulos con `trophy('copa', 'Campeón', t, trophyImg(titleLabel(t), 'copa'))`; premios con `const label = a.label ?? AWARD_LABEL[a.kind]` y `trophy(a.kind, label, league, trophyImg(label, a.kind))`.
- `finish`: `trophy(t.icon, t.label, detail, t.img)` y, bajo el título del palmarés, un enlace pequeño "Créditos de imágenes" (CC BY pide el crédito cerca del uso).
- `seasonLog` (chips): `a.label ?? AWARD_LABEL[a.kind]`.
- `footer()`: un párrafo más con el enlace `creditos.html`, igual que los otros dos.
- `seasonSummary`: prioridad Mundial, Balón de Oro y luego copa de selección:
```ts
const mundial = cups.find((c) => c.startsWith('Mundial'));
const balon = played.flatMap((r) => r.awards).find((a) => a.kind === 'balon');
if (mundial) celebrate(mundial, true);
else if (balon) celebrate(balon.name, false, { title: '¡Balón de Oro!', img: { src: `${import.meta.env.BASE_URL}trofeos/${img.file}`, alt: img.alt } });
else if (cups[0]) celebrate(cups[0], false);
```
  (`img = trophyImg('Balón de Oro', 'balon')!`, que existe por RF-07.)
- `style.css` (al final): `.trophy-img { flex: none; width: 48px; height: 48px; box-sizing: border-box; padding: 4px; border-radius: 12px; background: #fff; object-fit: contain; }` y `.party-banner img { width: 96px; height: 96px; object-fit: contain; border-radius: 16px; background: #fff; padding: 6px; }`. La caja blanca unifica fotos e ilustraciones en tema claro y oscuro. Sin `margin` ni `transition`: no mueve nada al cargar.

### `src/ui/celebrate.ts`
Tercer parámetro opcional `extra`. Con `extra`: el `<b>` del banner dice `extra.title` (en vez de "🏆 ¡Campeón!"), y se agrega un `<img>` de 96 x 96 con `src` y `alt` de `extra` (nunca `innerHTML`; `loading` por omisión, porque el banner se ve de inmediato). Sin movimiento, solo el banner, como hoy. La celebración sigue con `aria-hidden` y sin clics.

### `src/ui/card.ts`
Sin cambios de lógica: `ICON` ya cubre los tres tipos nuevos (TypeScript lo exige al agregarlos), así que la carta compartida muestra su ícono de trazo. Sin rasters (fuera de alcance, Decisión 14).

## Páginas legales
- **`creditos.html`** (nueva; `<html lang="es">`, mismo `<style>` en línea que `terminos.html`, modo oscuro incluido). Contenido: título "Créditos de imágenes"; una introducción ("Las imágenes de los trofeos vienen de Wikimedia Commons con licencias libres; cada una está recortada y redimensionada"); una lista con un `<li data-trofeo="<clave>">` por imagen de Commons: título de la obra (enlace a su página de Commons, `rel="noopener"`), autor, licencia con su enlace (o "Dominio público"), fuente "Wikimedia Commons" y "Recortada y redimensionada" (en las BY-SA, "...; esta versión se comparte bajo la misma licencia"); las notas de la tabla (el "MARCA" grabado, el escudo de la KNVB); una sección "Ilustraciones propias" con los tres SVG; "Sin afiliación": los premios y trofeos (Balón de Oro, Bota de Oro, Golden Boy, Pichichi, Capocannoniere, Torjägerkanone y los de ligas y copas) y sus nombres pertenecen a sus dueños y se usan solo como referencia; Chamusqueros no tiene relación con ellos; "Retiro": para pedir que se retire una imagen, el correo de contacto de siempre (se sustituye por la ilustración propia); enlace "Volver al juego".
- **`terminos.html`**: en "Sin afiliación", una frase ("Los nombres de premios y trofeos pertenecen a sus dueños; ver Créditos de imágenes.") con enlace, y la fecha de última actualización.
- **`privacidad.html`**: sin cambios (las imágenes no son de terceros).

## Servidor (RF-12)
`api/ranking.ts` solo valida rangos y no recibe premios ni imágenes. El puntaje máximo medido hoy es 717 (698 y 741 en dos corridas de 16.200; la segunda con política optimista) y el aporte de los premios nuevos es 180 como máximo. La regla: el límite de puntaje es al menos 1,25 veces el máximo medido con los premios nuevos, con las dos políticas. Si el máximo queda en 800 o menos, el límite de 1000 se mantiene; si no, se sube a 1200 en `api/ranking.ts` (`isInt(b.score, -100, 1200)`) y en `scripts/ranking.test.ts` (los casos 1000/1001 pasan a 1200/1201). Es una cota de cordura (A04); el servidor no puede verificar el puntaje y eso no cambia. Títulos (200) y partidos con la Selección (500) no cambian.

## `scripts/simulate.ts` (cambios agrupados)
Un bloque nuevo "Trofeos" al final, autocontenido (sus contadores y sus errores, `process.exitCode = 1` como los demás), más una línea de huella:
1. **Huella (CA-5)**: hash FNV de las temporadas de las semillas 1 a 200 **sin** `awards`. Se imprime siempre. T0 la agrega y la anota antes de tocar el motor.
2. **CA-1**: por cada goleador de cada temporada, el nombre contra `scorerName(country, tier)` de su club real; los cinco nombres vistos; "Goleador de <liga>" en las divisiones de ascenso de esos países y en el resto.
3. **CA-2**: recálculo de cada premio nuevo desde el registro de la temporada (nivel, partidos, goles, títulos, edad, club) y los topes por carrera; y pruebas de borde directas de `majorAwards` (fama 59 y 60; nivel 83 y 84 y 69 y 70; 20 y 21 años; 24 y 25 goles en casa y 19 y 20 afuera).
4. **CA-3**: tabla por grupo (Guatemala, potencias, resto, todos): carreras con al menos uno y media por carrera, de cada premio; ganadores de Balón con 2 o más; Botas ganadas por extranjeros; las mismas cifras con la política optimista (elige la opción de mayor valor esperado de `3 x nivel + potencial + 0,1 x fama + 0,05 x ánimo`); y la banda de RF-05.
5. **CA-4**: puntaje medio y veredictos contra la línea base (108,3, banda 105,1 a 111,5; ningún veredicto a más de 2 puntos), puntaje máximo contra el límite del servidor (1,25 veces), y el caso armado a mano (Balón + Bota + Golden Boy = 50).
6. Los premios por carrera ya se imprimen en la línea "Premios por carrera" (`awardCount` por tipo y posición); los tipos nuevos aparecen solos. La revisión "el palmarés agrupa sin perder ni inventar trofeos" sigue valiendo con la agrupación por etiqueta.

## `scripts/trofeos.test.ts`
Estática, sin navegador (importa `ui/palmares.ts`, que no toca el DOM al importarse, como ya hace `simulate`):
1. Lee `public/trofeos/`: 40 KB o menos por archivo, 800 KB o menos en total, extensión `.webp` o `.svg`; para `.webp`, ancho y alto desde el encabezado (VP8, VP8L o VP8X) con 200 px o menos.
2. Cada `file` de `TROFEO_IMG` y de la copa propia existe; no hay archivos huérfanos; `alt` no vacío y sin `<`, `>` ni comillas.
3. Cobertura de RF-07: recorre `COUNTRIES` (`leagues`) y `CLUB_CUPS`: toda liga, división de ascenso y copa tiene imagen con `trophyImg(label, 'copa')`; Balón, Bota, Pichichi, Torjägerkanone, Golden Boy, Capocannoniere, Bota de Oro de la Premier League y Máximo goleador de la Ligue 1 tienen imagen; asistidor, guardameta, joven, mejor jugador, once ideal y "Goleador" no.
4. Créditos: cada clave de Commons (todas las del mapa menos las tres propias) tiene su `<li data-trofeo="...">` en `creditos.html` con un enlace a `commons.wikimedia.org/wiki/File:`, un enlace a `creativecommons.org` o el texto "Dominio público", un autor no vacío y la frase "recortada y redimensionada"; no hay `data-trofeo` sin archivo.
5. Integración: `src/main.ts` contiene `creditos.html` (pie), `vite.config.ts` contiene `creditos`; y ningún `.ts` de `src/` ni HTML del repo contiene `upload.wikimedia.org` en un `src=` ni en un `url(`.

## Seguridad (OWASP Top 10)
Ver la sección del spec. En el diseño: el nombre de archivo sale solo de la tabla por etiqueta (nada de datos de la carrera en `src`); `alt`, etiqueta y detalle pasan por `esc()` en `trophy()`; el ícono de respaldo se busca por clave en `ICON` (lista fija) y `data-icon` nunca se interpreta como HTML; un solo oyente `error` en vez de `onerror` en línea (no hay que relajar una futura política de contenido); `api/ranking.ts` no recibe campos nuevos; sin dependencias; las imágenes se sirven del propio origen; `creditos.html` solo enlaza a Commons (`rel="noopener"`), no carga nada de allá.

## Pruebas y riesgos
- **Pruebas**: `npm run simulate -- 20000` (todas las revisiones actuales más "Trofeos"); `npx tsx scripts/trofeos.test.ts`; `npx tsx scripts/ranking.test.ts`; `npm run build` (tipos y que `creditos.html` entre al sitio). CA-8 a mano en navegador (360 x 640 y 1280 x 800; claro y oscuro; con `/trofeos/*` bloqueado; el Balón de Oro se fuerza bajando el umbral en `awards.ts` con `npm run dev` y se revierte).
- **Riesgo 1, la rareza no sale en banda**: las reglas se midieron antes de implementarlas, pero con 6.700 carreras de potencias el ruido es grande. Mitigación: bandas anchas y, si hace falta, mover un solo umbral por premio (ver "Frecuencia") y anotarlo en el spec.
- **Riesgo 2, el puntaje máximo**: premios repetibles. Mitigación: los topes (5, 3 y 1) y la regla del 1,25 del límite del servidor.
- **Riesgo 3, licencia libre no es permiso sobre el diseño del trofeo ni sobre su marca**: la licencia de Commons cubre la foto o el dibujo de quien la hizo, no la escultura ni el nombre (Balón de Oro, Golden Boy, Pichichi...). Dos autores marcaron sus réplicas del Balón y de la Bota de Oro como dominio público por "formas simples" (`PD-shape`) y Commons lo aceptó, pero es una etiqueta puesta por el autor sobre un diseño ajeno. El uso aquí es gratuito, de referencia, con crédito y sin afiliación; con esa mitigación se acepta (Aclaración 2 del spec, a confirmar antes de fusionar). Si un dueño pide el retiro, `trophyImg` devuelve la ilustración propia de esa entrada en un cambio de una línea.
- **Riesgo 4, Commons cambia o borra un archivo**: no importa en ejecución (hay copia propia), pero la licencia podría revocarse o la imagen quedar marcada (como `Ligue 1 Trophy 2024.png`). Mitigación: la investigación está fechada (14/10/2026); la tabla guarda la página y el archivo original; el retiro es una línea.
- **Riesgo 5, la Bota de Oro es una ilustración, no el trofeo real**: el usuario pidió "bota de oro" y la bota real lleva grabadas las tres bandas de una marca (regla de logos, RF-10). Si se prefiere la foto, la candidata es `Messi's Golden Shoe (51937265513).jpg` (CC BY 2.0, Radek Kucharski, fondo oscuro limpio), tras decidir si el relieve de la bota cuenta como logo (Aclaración 4 del spec). El cambio es una fila de la tabla y una línea del mapa.
- **Riesgo 6, mezcla de estilos** (fotos e ilustraciones): se unifica con la caja de 48 x 48 de fondo claro y relleno. Si una foto sigue viéndose sucia a 48 px, se recorta más o se pasa a la ilustración propia.
- **Riesgo 7, `build:preview` (archivo único)**: no incluye `public/`; las imágenes no cargan y se ven los íconos de trazo. Es el fallo previsto (RF-09), no un error.
- **Riesgo 8, peso y red**: 23 archivos de 200 px, con carga diferida; el palmarés solo pide las que están a la vista. Total esperado de 200 a 300 KB, tope de 800 KB.
- **Riesgo 9, la misma semilla**: ningún `chance()` nuevo; CA-5 compara una huella de temporadas antes y después.
- **Trazabilidad**: RF-01: `awards.ts` (`scorerName`), `engine.ts`, tipos (`label`), `palmares.ts`. RF-02 a RF-04: `awards.ts` (`majorAwards`) y `engine.ts`. RF-05: "Frecuencia", `simulate.ts`. RF-06: `AWARD_POINTS`, `summarize`, `simulate.ts`. RF-07: tabla de imágenes, `public/trofeos/`, `TROFEO_IMG`, `trophyImg`. RF-08: `palmares()`, `trophy()`, `seasonCard`, `finish`, `seasonLog`, `seasonSummary`, `celebrate.ts`. RF-09: `trophy()`, el oyente `error`, `style.css`. RF-10: tabla, procesamiento, `trofeos.test.ts`. RF-11: `creditos.html`, `terminos.html`, `footer()`, `vite.config.ts`. RF-12: tipos opcionales, `api/ranking.ts` y su prueba.
