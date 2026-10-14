# Plan: convocatoria de otro país por ascendencia o naturalización

Stack: el del repo (TypeScript vanilla, Vite, strings HTML en `src/main.ts`, función de Vercel con Neon). Sin dependencias nuevas.
No hay `constitution.md`, `.gq/` ni `CLAUDE.md` en el repo; se sigue el formato de `specs/eliminatorias-selecciones/`.

## Decisión estructural: Selección separada del origen
`Career.home` (y `Player.setup.country`) sigue siendo la **nacionalidad de origen**: debut, clubes de casa, `viewClub`, moneda, textos de casa. Lo nuevo es la **Selección que representa**, derivada de un único campo opcional del jugador.

- `Player.cambioSel?: { to: string; from: string; caps: number; goals: number; year: number; via: 'madre' | 'padre' | 'naturalizacion' }`: código de la nueva Selección, la de origen, y los partidos y goles con la anterior al cambiar. Su sola presencia significa "ya cambió" (RF-05).
- `Player.herencia?: { country: string; side: 'madre' | 'padre' }`: la ascendencia oculta. Ninguna pantalla la lee; solo el evento.
- `Career.nt` (getter): `countryOf(p.cambioSel?.to ?? p.setup.country)`. Es la única fuente de la Selección en el motor.
- Como `summarize`, `palmares`, `bestMoment`, `drawCareerCard` y la carta del ranking reciben `Player` y no `Career`, el estado vive en `Player`, no en `Career`.
- No hay carreras guardadas a medias (solo `BEST_KEY` y `LAST_SETUP_KEY` en `localStorage`), así que la compatibilidad (RF-13) es: campos opcionales, filas viejas del ranking y partidas sin cambio.

### Menor diff en `src/engine/engine.ts`
Usos de `this.home` que son **Selección** y pasan a `this.nt` (7 sitios):

| Línea | Uso | Cubre |
|---|---|---|
| 324 `const h = this.home` en `simulateNationalTeam` | confederación, `CONFEDS`, `bar`, `h.wc`, `h.name`, copas, Mundial, títulos, hitos | RF-07 casi completo con un cambio |
| 518 `gtStrength` | `strength` y `callup` | fuerza |
| 523 y 525 `rivals` | excluir a la propia Selección; `near` por fuerza | RF-07 (nunca rival de sí misma) |
| 536 `drawGroup` | nombre del equipo del jugador en la tabla | RF-07, RF-11 |
| 827 y 831 `applyEffects` | textos "+n goles con X", "X avanza en la eliminatoria" | RF-10 |

Usos que son **origen** y no se tocan: 151-153 (constructor), 184 `club`, 198-208 (debut), 256 `split`, 266 `centralAmerican`, 632-636 `checkPlayingTime`, 664 `context().country`, 834 `viewClub`, 860-891 `findClub`. `findClub` línea 900 (`near` por confederación del origen) queda en origen: es zona del mercado de fichajes que cambia la otra feature en paralelo.

Cambios adicionales en el motor:
- Constructor: sorteo de la ascendencia con un `createRng(seed ^ 0x9e3779b9)` propio (no gasta el `rng` principal), así las carreras sin ascendencia siguen con la misma secuencia y la comparación de balance es limpia.
- `simulateNationalTeam`: el `nt` que devuelve agrega `team: h.code` y, en la primera temporada tras el cambio, `cambio: true`.
- Nuevo `private addCaps(n)` que suma a `p.caps` y, si `p.age >= 21`, marca `flags.cap_tarde`; sustituye los 4 `p.caps +=` (líneas 432, 447, 464 y 822 de `applyEffects`).
- `applyEffects`: nuevo `e.natTeam` (ver abajo).
- `summarize`: el gentilicio del veredicto sale de la Selección actual (`countryOf(p.cambioSel?.to ?? p.setup.country).adj`); ligas y títulos de club siguen con el origen.
- `context()` agrega `nt: this.nt` sin tocar `country`. No se toca `drawEvent` ni `transferOffer` (zona de la otra feature).

## Cómo (por RF)
- **RF-01/02** Nuevo `src/engine/nacionalidad.ts` (puro, sin DOM): `DIASPORA: Record<string, [code: string, weight: number][]>` con 2 a 5 destinos por cada uno de los 27 orígenes, y `sortearHerencia(rng, origen)` → `{country, side} | undefined` (25 %, madre/padre 50/50). Ejemplos de pesos: GT: US 4, MX 3, ES 2, SV 1; AR: IT 4, ES 3, FR 1, UY 1, PY 1; BR: IT 3, PT 3, DE 2, JP 2; FR: MA 3, PT 3, ES 2, IT 2; NL: MA 3, DE 2. GT no aparece como destino (`ponytail:` evita que `GT_LEAK` de `simulate` dispare por textos legítimos; si se quiere, se abre a futuro). Se valida al cargar el módulo (como los nombres de liga repetidos en `countries.ts`): origen ≠ destino, destinos existen, ninguno es GT.
- **RF-03** Evento `nac_ascendencia` en `src/engine/events/nacionalidad.ts`, registrado con una línea en `events/index.ts`. `when`: `p.herencia`, sin `p.cambioSel`, `19 <= age <= 31`, `ctx.tier === 1 || ctx.abroad`, `p.rating >= countryOf(herencia.country).callup`, `elegible(p)`, `p.wcProgress === 0`, sin bandera `nac_no_<código>`. `once: true`, `weight: 2` (no 3: ≥ 3 es "ruta" y desplazaría ofertas de fichaje y otras rutas; se calibra con `simulate`).
- **RF-04** Evento `nac_naturalizacion`, misma estructura. `residencia(p)` en `nacionalidad.ts`: recorre `p.seasons` desde el final contando temporadas con `clubById(r.clubId).country` igual al de la última y `r.age >= 18`; devuelve `{ code, n }`. `when`: `n >= 5`, código ≠ origen, y las mismas condiciones del RF-03 con la Selección de ese país. Se elimina `ext_doble_nacionalidad` de `extranjero.ts` (lo reemplaza).
- **RF-05** Guardas: `when` exige `!p.cambioSel`; al rechazar se marca `flag: 'nac_no_<código>'` y ambos eventos lo respetan; `applyEffects` ignora `natTeam` si ya hay `cambioSel` (defensa en profundidad).
- **RF-06** Dos opciones por evento con `o(...)` de `helpers.ts`. Aceptar: resultados 0.8 / 0.2 (bien recibido / críticas en origen), ambos con `natTeam`. Rechazar: ánimo +6 y fama +3 (afición de origen), `flag: nac_no_<código>`. Textos con voseo, como los de `seleccion.ts`.
- **RF-07** `Effects.natTeam?: string` (código). En `applyEffects`, si hay `natTeam` válido y no hay `cambioSel`: guarda `cambioSel` con `from: p.setup.country`, `caps: p.caps`, `goals: p.natGoals`; fija `p.ntLevel = rating >= callup + 6 ? 2 : 1` directamente (no `setNtLevel`, que solo sube y repetiría el hito de debut); pone `wcProgress = 0` y borra las banderas `sel_elim_fuera`, `sel_elim_decidido`, `sel_repechaje`, `sel_elim_r2`, `sel_prelista`, `sel_sub17`, `sel_sub17_mundial`, `sel_sub20`, `sel_sub20_mundial`. `p.caps` y `p.natGoals` no se tocan. Como los eventos se resuelven entre bloques, el cambio rige desde la siguiente temporada simulada sin código extra. Chip del resultado: "Ahora jugás con <nombre>".
- **RF-08** `SeasonRecord.nt.team?: string` y `SeasonRecord.nt.cambio?: boolean`, ambos opcionales. La UI lee el país de la temporada de ahí (`nt.team ?? career.home.code`); sin él, igual que antes.
- **RF-09** El evento pasa `milestone: 'Se nacionalizó en <país>'` o `'Eligió jugar para <país> por su madre|padre'`; `applyEffects` le agrega el año como a los demás.
- **RF-10** En el contexto, `country` (origen) no cambia de significado y se agrega `nt`. En `src/engine/events/seleccion.ts` todo lo que habla de la camiseta pasa de `ctx.country` a `ctx.nt`: `bar`, `fed`, `gt`, `gigante`, `migrante` y los usos directos de `ntName`, `stadium`, `conf`, `people` y `dish` de los torneos y la eliminatoria. En `src/engine/events/medios.ts` líneas 373, 385, 396, igual. `extranjero.ts` (nivel, idioma, frío, ligas, "¿Volver a X?") y `base.ts` siguen con `ctx.country`. Sin cambio, `nt === country`, así que nada se mueve para los demás. Eventos juveniles: `sel_sub20_conv` y `sel_preolimpico` agregan `!p.cambioSel` a su `when`; los demás encadenan banderas que `applyEffects` borra.
- **RF-11** `src/main.ts`: `ntBlock(nt)`, `matchRow(m, team)` y `groupTable(g, team)` reciben el país de esa temporada (`countryOf(nt.team ?? career.home.code)`, que ya cae en Guatemala ante un código desconocido) y dejan de usar `career.home`. `ntCall()` usa `career.nt`. Si `nt.cambio`, el texto dice "<Selección> te convocó. Elegiste vestir la camiseta…". `src/ui/card.ts`: colores de la camiseta (líneas 188-205) y escena del momento (línea 334) usan la Selección; la línea de origen (245) sigue con el origen. `src/ui/palmares.ts`: nueva `porSeleccion(p)` que, si hay `cambioSel`, devuelve `[{team, caps, goals, titles}]` (con la anterior: `cambioSel.caps` y `.goals`; con la nueva: `p.caps - cambioSel.caps`; los títulos, de `seasons[].nt.groups` con cierre "Campeón" agrupados por `nt.team`); `finish()` la muestra como "Con cada Selección". `bestMoment`: el kicker toma el país del sufijo " con X" del hito y, si no lo tiene, la Selección actual. Playerhead (`career.home.name`) sigue mostrando el origen. No se divide el palmarés de clubes.
- **RF-12** `finish()` envía `country: p.cambioSel?.to ?? p.setup.country`. `api/ranking.ts` reemplaza `/^[A-Z]{2}$/` por pertenecer a una lista de los 27 códigos, escrita en el archivo (importar `countries.ts` arrastraría todos los equipos y, con `"type": "module"`, exige extensión en el import). `scripts/simulate.ts` lee `api/ranking.ts` y verifica que contenga cada código de `COUNTRIES`, para que no se desincronicen.
- **RF-13** Todos los campos nuevos son opcionales; `Effects.natTeam` es nuevo. Sin `cambioSel` el motor, los textos y la UI siguen el camino de siempre.

## Elegibilidad (`elegible(p)` en `nacionalidad.ts`)
Sin estado nuevo salvo una bandera. Se cumple si `p.caps === 0`, o si `p.caps <= 3` y `!flags.cap_tarde` y `!flags.cap_final` y ningún `seasons[].nt.matches` tiene `comp` que empiece por "Mundial" o por una copa de `CONFED_CUP`. `flags.cap_tarde` la pone `addCaps` (edad >= 21). `flags.cap_final` la ponen los dos eventos de copa con caps de `seleccion.ts` (`sel_copa_oro_mexico` y `sel_copa_oro_usa`, vía `flag` ya existente en `Effects`; la Liga de Naciones y la eliminatoria no son torneo final). `p.caps` incluye amistosos y los partidos de eventos: se cuentan todos (aclaración abierta del spec). Los partidos de eventos no tienen registro de partido, por eso no se deriva de las temporadas.

## Modelo de datos
Todos los campos son opcionales y compatibles hacia atrás; sin migración.
- `Player.cambioSel`, `Player.herencia` (arriba).
- `SeasonRecord.nt.team`, `SeasonRecord.nt.cambio`.
- `EventContext.nt: Country`.
- `Effects.natTeam?: string`.
- Banderas nuevas: `cap_tarde`, `cap_final`, `nac_no_<código>` (todas con valor 1, como las demás).
- Ranking: `card.country` pasa a ser la Selección actual; sin columna ni migración (`card` es `jsonb`).

## Seguridad (OWASP Top 10)
- **A03 Inyección/XSS**: todo nombre de país, federación o Selección que llegue a `innerHTML` pasa por `esc()` (bloque de Selección, "Con cada Selección", banner de convocatoria, hitos, tabla). Los nombres salen de `COUNTRIES`, no de la entrada, pero `r.card.country` viene de la base y `countryOf` solo devuelve filas de la tabla; la carta ya escapa `home.name`. Los textos de eventos se escapan en `gameScreen` como hoy.
- **A08 Integridad**: `api/ranking.ts` valida `card.country` contra los 27 códigos (RF-12); lo inválido se descarta y la carrera se guarda. Los datos de `SeasonRecord` los genera el motor en el cliente: la UI valida `nt.team` con `countryOf` (cae en Guatemala). Se mantiene el comentario `ponytail:` que ya existe sobre un POST armado a mano.
- **A04 Diseño inseguro**: "un cambio por carrera" se aplica en `when` y en `applyEffects`. El puntaje máximo con la nueva ruta (más Mundiales) se compara en `simulate` con los límites del servidor (`score` -100..1000, `titles` 0..200, `caps` 0..500).
- **A06**: cero dependencias nuevas.
- A01, A02, A05, A07, A09 y A10: no aplican (no cambia acceso, configuración, autenticación, registros ni peticiones salientes).

## Pruebas, balance y riesgos
`scripts/simulate.ts` es la prueba. Cambios:
- Contadores: carreras con ascendencia (%, madre/padre), carreras que ven cada oferta (% por vía y por origen), cuántas llegaron a ser elegibles pero no la vieron, pares origen-ascendencia, y ofertas a jugadores no elegibles (debe ser 0).
- Variable `NAC=aceptar|rechazar` para fijar la decisión en los eventos `nac_*`. Con decisión al azar la aceptación sale ~50 % por construcción: no es dato de comportamiento. Se reporta `% recibe oferta` (real) y la tasa de Mundial con `aceptar` (cota superior). Sin `NAC`, el simulador elige al azar como hoy.
- Coherencia: `${country.name} no está en la tabla` y `Jugó el Mundial ${wc} con ${country.name}` pasan a usar la Selección de esa temporada (`nt.team`, `career.nt`); `GT_LEAK` se exime si `career.nt.code === 'GT'`; nuevos chequeos: un solo `cambioSel`, `caps` y `natGoals` no bajan al cambiar, la suma por Selección cuadra, la Selección actual nunca es rival, ningún texto de Selección nombra a otra Selección, y la lista de códigos de la API coincide.
- Medición: antes de implementar, quitar `ext_doble_nacionalidad` y correr `npm run simulate -- 5400` para la base (hoy: Mundial 12,8 %, extranjero 18,9 %, Selección mayor 25,5 %); después, con `NAC=aceptar` y con decisión al azar. Reportar `% de carreras que reciben oferta` (y % que acepta si se fuerza `aceptar`), cambio de la tasa global de Mundiales y por país (GT, SV, HN y BO deben subir; ES, AR y BR casi nada), y el máximo de puntaje y títulos.
- `npm run build` y captura en navegador (preview del Vercel del PR): bloque de Selección tras el cambio, "Con cada Selección", carta con la bandera nueva, y el ranking con una carta nacionalizada.

Riesgos:
- **Balance**: si "aceptar todo" supera +2 puntos de Mundial, se baja la probabilidad de ascendencia (25 %), o se sube la exigencia de nivel (`callup + k`), antes de tocar fuerza o `wc`.
- **Alcance de la oferta**: con `weight: 2` puede no verse a tiempo; se mide "elegibles que la ven" y se sube el peso (sin llegar a 3).
- **Textos**: un `ctx.country` que se me escape en `seleccion.ts` mostraría la Selección de origen; el chequeo de `simulate` lo atrapa.
- **Coordinación con la feature de fichajes y contratos**: cero cambios en `transferOffer`, `drawEvent` y `statsBar`. Posibles conflictos de texto, no de lógica: la línea de import y el arreglo en `events/index.ts`, la zona de `ext_doble_nacionalidad` en `extranjero.ts` (adyacente a `ext_renovacion`, de contratos) y la sección `finish()` de `main.ts` si esa feature agrega dinero al resumen.
