# Plan: retar desde la pantalla final

Deriva de `specs/retar-desde-final/spec.md`. Cambio chico en código (un módulo nuevo de ~50 líneas, dos retoques localizados) y grande en costo potencial. Cero dependencias, cero API, cero base de datos, cero CSS.

## Lo que ya existe y se reutiliza
- **Crear la sala**: `crearSala()` de `src/retos/online/cliente.ts` (`POST /api/sala`, acción `crear`), que ya valida la forma de la respuesta (`esRespuestaSala`). **Entrar a la sala**: `entrarEnSala(sh, respuesta)` de `src/retos/online/ui-sala.ts`, que pinta el lobby con código, enlace y botones de invitar (`Compartir` / `anclaWhatsApp` / `Copiar enlace`, RF-03 y RF-12 de `compartir-retos`).
- **Perfil**: `crearSalaNueva(sh)` de `ui-sala.ts` (pide el apodo con `pedirApodo`, crea el perfil con `crearPerfil` y crea la sala). La entrada de Retos ya la usa en `abrirEnLinea((sh, m) => m.crearSalaNueva(sh))`.
- **Disponibilidad**: `infoEnLinea()` de `cliente.ts`; cualquier falla cuenta como "no".
- **Errores**: `ErrorCliente` con `codigo` y `esRed` (`cliente.ts`).
- **Credencial**: `tokenGuardado()` de `cliente.ts`.
- **Estilos**: `panel`, `eyebrow`, `btn secondary`, `toast` de `src/style.css`, los mismos de la pantalla final. Cero CSS nuevo (ajuste post-revisión UX: `#retarBox` compacto en `src/style.css`, y sin `eyebrow`). Nota: `src/style.css` no define `.btn:disabled`; un botón inactivo se ve igual, por eso el aviso "Creando la sala…" es el que comunica el estado.
- **Pruebas**: arnés `scripts/fixtures/servidor.ts` (Neon, Ably y Wikidata falsos; `bd.consultas` guarda la etiqueta de cada consulta; `ably.llamadas` guarda cada llamada a Ably), `node:assert`, `npx tsx scripts/<nombre>.test.ts`.
- **Patrón de interruptor**: `DONATE_URL` en `src/main.ts` (vacío oculta el bloque).

## Arquitectura
Un destino nuevo para Retos y un módulo chico que decide el primer paso, **antes** de salir de la pantalla final. Todo lo demás es el flujo existente.

```
Pantalla final (main.ts)
  render: bloque #retarBox (HTML estático, 0 llamadas, 0 módulos)
  clic en #retar ──► import('./retos/online/desde-final')      (solo aquí se baja; trae cliente.ts, que es chico)
                      crearDesdeFinal(): sin parámetros
                        ├─ sin token  ──► infoEnLinea()  GET /api/sala    (1 Fn, 0 Q)
                        │                  ├─ false ─► { t:'fallo', definitivo }       → aviso, final intacta
                        │                  └─ true  ─► { t:'apodo' }
                        └─ con token ──► crearSala()     POST /api/sala   (1 Fn, 5 Q)
                                           ├─ ok ─────────► { t:'sala', respuesta }
                                           ├─ sin_perfil / sin_credencial ─► { t:'apodo' }
                                           ├─ en_linea_no_disponible ─► fallo definitivo
                                           ├─ limite ─► fallo definitivo (tope)
                                           └─ red / otro ─► fallo reintentable
  { t:'sala' }  ──► abrirRetos({ creada: respuesta })  ──► montarRetos ──► entrarEnSala(sh, respuesta)   lobby, invitación existente
  { t:'apodo' } ──► abrirRetos('retar')                ──► montarRetos ──► crearSalaNueva(sh)             apodo existente → perfil → crear → lobby
  { t:'fallo' } ──► aviso en #retarAviso; la final no se tocó
```
Por qué no es "un segundo camino para crear salas": `desde-final.ts` llama a la misma función de `cliente.ts` (`crearSala`) que usa `crearSalaNueva`, no tiene su propia petición ni su propia validación. Solo adelanta el intento para poder decir "falló" sin haber reemplazado la pantalla, y delega en `crearSalaNueva` todo lo que requiere interfaz de Retos (apodo, perfil). Si la implementación prefiere la variante más simple (comprobar disponibilidad y abrir siempre `'retar'`), cumple RF-01 a RF-06 pero **incumple RF-07 para el tope** y cuesta 1 Fn más por clic con perfil; cambiarla exige actualizar primero la spec (Decisión 2).

### Qué pasa con la pantalla final y la sesión
`abrirRetos(destino, alSalir = home)`: el `alSalir` por defecto es `home`, que es lo que se quiere (RF-14). **Nunca** pasar una función que vuelva a llamar a `finish()`.

## Cambios por archivo

### 1. `src/retos/online/desde-final.ts` (nuevo, ~50 líneas)
En `online/` a propósito: así `scripts/online-cliente.test.ts` ya lo revisa (sin `innerHTML`, sin almacenamiento fuera de `cliente.ts`, sin secretos, sin bancos en el grafo de imports).
```ts
// Primer paso de "Retar a alguien en línea" en la pantalla final (specs/retar-desde-final). Sin parámetros: no puede recibir nada de la carrera.
import { ErrorCliente, crearSala, infoEnLinea, tokenGuardado } from './cliente';
import type { RespuestaSala } from './protocolo';

export type Intento =
  | { t: 'sala'; respuesta: RespuestaSala }   // creada: pasar a Retos directo al lobby
  | { t: 'apodo' }                            // falta perfil: pasar a Retos por el flujo de siempre
  | { t: 'fallo'; mensaje: string; definitivo: boolean };

export const AVISOS = {
  noDisponible: 'Retos en línea no está disponible ahora. Probá más tarde desde Retos, en el inicio.',
  sinRed: 'No hay conexión con el servidor. Probá de nuevo.',
  tope: 'Ya creaste varias salas seguido. Probá en un rato desde Retos, en el inicio.',
  otro: 'No se pudo crear la sala. Probá de nuevo.',
} as const;

const fallo = (mensaje: string, definitivo: boolean): Intento => ({ t: 'fallo', mensaje, definitivo });

export async function crearDesdeFinal(): Promise<Intento> {
  try {
    if (!tokenGuardado()) return (await infoEnLinea()) ? { t: 'apodo' } : fallo(AVISOS.noDisponible, true);
    return { t: 'sala', respuesta: await crearSala() };
  } catch (e) {
    if (e instanceof ErrorCliente) {
      if (e.codigo === 'sin_perfil' || e.codigo === 'sin_credencial') return { t: 'apodo' };   // el flujo de siempre lo resuelve
      if (e.codigo === 'en_linea_no_disponible') return fallo(AVISOS.noDisponible, true);
      if (e.codigo === 'limite') return fallo(AVISOS.tope, true);
      if (e.esRed) return fallo(AVISOS.sinRed, false);
    }
    return fallo(AVISOS.otro, false);
  }
}
```
- `limite` agrupa el tope por dispositivo, el de IP y los límites por minuto (`429`); los tres piden esperar, así que el mismo aviso y el botón inactivo sirven.
- Un token guardado que el servidor no reconoce (`403`, `sin_credencial`) cae en `'apodo'`: es el mismo comportamiento que hoy tiene la entrada de Retos (que mostrará el error de `crearPerfil`). No se inventa un caso nuevo.
- Con token y sin perfil en el servidor (`404`), el costo es 1 Fn y 1 Q extra antes de pasar al flujo de siempre. Camino raro, aceptado.

### 2. `src/retos/index.ts` (3 líneas, sin mover ni reformatear nada)
- `import type { RespuestaSala } from './online/protocolo';` junto a los imports de tipos.
- La línea `export type Destino = …` pasa a `{ sala: string } | { creada: RespuestaSala } | 'ranking' | 'perfil' | 'retar'` (1 línea cambiada).
- En el bloque "Apertura", **antes** de la rama genérica `else if (destino) abrirEnLinea(… destino.sala)` (el orden importa para que `tsc` estreche el tipo):
```ts
  else if (destino === 'retar') abrirEnLinea((sh, m) => m.crearSalaNueva(sh));
  else if (typeof destino === 'object' && 'creada' in destino) abrirEnLinea(async (sh, m) => m.entrarEnSala(sh, destino.creada));
```
`abrirEnLinea` ya hace `detener()`, muestra "Cargando…", baja `ui-sala` con `import()` y guarda el control de la sala para que `Salir` funcione. `entrarEnSala` ya llama a `guardarSala(codigo)` (RF-08 de `retos-en-linea`: recargar vuelve a la sala).

### 3. `src/main.ts` (a lo sumo +40 / −1 líneas; todo localizado)
Orden **exacto** de la pantalla final tras el cambio (RF-01, RF-12, Decisión 3):

| # | Bloque | Cambio |
| --- | --- | --- |
| 1 | Veredicto (`section.verdict`) | — |
| 2 | Tarjeta `#cardImg` | — |
| 3 | Fila `#share` / `#download` y `#toast` | — |
| 4 | `#rankBox` "Ranking global" | — |
| 5 | **`#retarBox` "Retos en línea" con `#retar` y `#retarAviso`** | **nuevo** |
| 6 | Totales, dinero, palmarés, Con cada Selección, Momentos, diario de temporadas | — |
| 7 | `#again` "Jugar otra carrera" | — |
| 8 | `.panel.donate` "¿Te gustó?" (justo después de `#again`) | — |
| 9 | `footer()` | — |

Los cinco retoques:
1. Junto a `DONATE_URL`: `const RETAR_DESDE_FINAL = true;` con comentario de una línea (apaga el bloque; costo de Neon/Ably, `specs/retar-desde-final` RF-15).
2. Junto a los imports de tipos: `import type { RespuestaSala } from './retos/online/protocolo';` (se borra al compilar; `CODIGO_RE` ya se importaba de ahí, así que no cambia el paquete).
3. `type DestinoRetos = 'ranking' | 'retar' | { sala: string } | { creada: RespuestaSala };` (la única línea que se quita: la del tipo anterior).
4. En la plantilla de `finish()`, **una línea después** de la línea `<section class="panel" id="rankBox">…</section>` y antes de `<section class="panel">` de los totales:
```ts
    ${RETAR_DESDE_FINAL ? `<section class="panel" id="retarBox"><p>Salís de esta pantalla al crear la sala: antes, guardá la imagen de tu carta.</p><button class="btn secondary" id="retar" type="button">Retar a alguien en línea</button><p class="toast" id="retarAviso" role="status"></p></section>` : ''}
```
   Texto estático: ningún dato de la carrera entra (A03). No usa `esc()` porque no interpola nada.
5. Cableado, **una línea** inmediatamente antes de `document.getElementById('again')!.onclick = createForm;`: `if (RETAR_DESDE_FINAL) document.getElementById('retar')!.onclick = retarDesdeFinal;`. Y la función, a nivel de módulo, justo después del cierre de `finish()` (antes del comentario `// Un link ?sala=…`):
```ts
/** Retar desde la final (specs/retar-desde-final): un clic crea la sala; sin clic no se pide nada. Sin parámetros: nada de la carrera viaja. */
function retarDesdeFinal() {
  const btn = document.getElementById('retar') as HTMLButtonElement;
  const aviso = document.getElementById('retarAviso')!;
  if (btn.disabled) return;
  btn.disabled = true;
  aviso.textContent = 'Creando la sala…';
  import('./retos/online/desde-final')
    .then((m) => m.crearDesdeFinal())
    .then((r) => {
      if (r.t === 'sala') return abrirRetos({ creada: r.respuesta });
      if (r.t === 'apodo') return abrirRetos('retar');
      aviso.textContent = r.mensaje;
      if (!r.definitivo) { btn.disabled = false; btn.focus(); }
    })
    .catch(() => { aviso.textContent = 'No se pudo crear la sala. Probá de nuevo.'; btn.disabled = false; btn.focus(); });
}
```
   `abrirRetos` ya existe (función declarada, no depende del orden). Su `alSalir` por defecto es `home`. No se toca ninguna línea de `guardar`, `again`, el bloque `donate` ni `contarCarrera('terminada')`.

`btn.disabled` es el candado contra el doble clic (CA-8): el primer clic lo pone antes de cualquier `await`.

Conflictos de fusión esperados con `continuar-carrera` (toca `finish()` al principio y probablemente `again`): los retoques 4 y 5 son de líneas aparte; si hay choque, se conservan ambos lados.

### 4. `scripts/retar-desde-final.test.ts` (nuevo)
Un archivo, tres bloques, sin red:
1. **Servidor (costo, CA-3, 5, 6)** con `servidor()` y sus `bd.consultas` / `ably.llamadas`: llamar `POST` de `api/sala.ts` con `{accion:'crear'}`: (a) dispositivo con perfil → 201, `consultas` = `['hashDe','contarSalas','leerPerfil','limpiar','crearSala']`, `ably.llamadas.length === 0`; (b) `PUT` de `api/perfil.ts` para uno nuevo → `['guardarPerfil','leerPerfil','mejorCarrera']`; (c) `servidor({ ably: false })` → 503 con `consultas.length === 0` y `GET /api/sala` → `{ enLinea: false }` con 0 consultas; (d) dispositivo con 5 salas creadas dentro de la hora → 429 con `['hashDe','contarSalas']`; (e) IP con 10 creaciones → 429 con `['hashDe']`. Y que `LIMITES.crearIp` valga `{ max: 10, ms: 3600000 }` y `SALAS_POR_HORA` valga 5 (guardia de "no aflojar", RF-10).
2. **Cliente (CA-3, 4, 5, 6, 7)**: con `globalThis.fetch` y `globalThis.localStorage` simulados (el cliente guarda todo en `try/catch`; sin `localStorage` en Node, `tokenGuardado()` es `null`): sin token y `enLinea:true` → `{t:'apodo'}` con exactamente 1 petición (`GET /api/sala`); sin token y `enLinea:false` → fallo definitivo con el aviso exacto; con token y 201 → `{t:'sala'}`, 1 petición, cuerpo `{"accion":"crear"}`, y ninguna petición a `/api/perfil`; 503 → fallo definitivo; 429 → fallo definitivo con el aviso de tope; `fetch` que rechaza → fallo **no** definitivo con el aviso de red; 500 → no definitivo con `otro`; 404 `sin_perfil` → `{t:'apodo'}`. Una segunda llamada tras un éxito/fracaso no comparte estado.
3. **Estático (CA-2, 10, 12, 13)**: leer `src/main.ts`: `indexOf` de `id="rankBox"` < `id="retarBox"` < `id="again"` < `class="panel donate"`; `#again` y el bloque `donate` siguen contiguos (expresión regular sobre las dos líneas); la cantidad de `donateLink(` es la de la rama base (se fija el número al escribir la prueba); `RETAR_DESDE_FINAL` aparece en exactamente 2 condiciones más su declaración; ninguna importación estática de `./retos/` salvo `./retos/online/protocolo`; `import('./retos/online/desde-final')` presente; la primera sentencia de `finish()` es `contarCarrera('terminada');`; `crearDesdeFinal` sin parámetros (`/crearDesdeFinal\(\)/` en la firma); el cuerpo de `retarDesdeFinal` no contiene `setInterval`, `setTimeout`, `navigator.share`, `clipboard`, `window.open`, `history.` ni `location` (CA-1, CA-9); `desde-final.ts` no contiene `career`, `fullName`, `setup`, `innerHTML`, `localStorage`, `console.`; los avisos de `AVISOS` coinciden con la spec; `src/retos/index.ts` contiene las dos ramas nuevas **antes** de la rama genérica de `destino.sala`.

## Costo y modelo de datos
- Sin tabla, columna, endpoint ni variable de entorno nuevos. El contrato nuevo es la firma de `crearDesdeFinal(): Promise<Intento>` y el destino `{ creada }` de Retos.
- Costo por clic y por sala: ver "Referencia de costo" en la spec. Resumen: con perfil, 1 Fn y 5 Q; sin perfil, 3 Fn y 8 Q; sala completa de 4 minutos, ≈ 57 Fn, ≈ 135 Q, ≈ 53 mensajes y 2 conexiones de Ably.
- Lo que no se toca: `api/_limite.ts` (`crearIp` 10 por hora, `SALAS_POR_HORA` 5), `REFRESCO_MS`, `SONDEO_MS`, el transporte, el motor.

## Seguridad (OWASP Top 10): mecanismos
| Riesgo | Cómo se cumple |
| --- | --- |
| **A01** | El destino `{ creada }` solo lo arma el manejador del clic con la respuesta ya validada; la URL solo produce `{ sala }` con `CODIGO_RE`. El pase vive solo en el lobby y sale solo por los botones del anfitrión (sin `navigator.share` ni `window.open` automáticos; CA-9). La barra de direcciones no se toca. |
| **A02** | HTTPS sin cambios. El módulo nuevo no lee ni escribe el token. |
| **A03** | Bloque HTML estático; avisos de `AVISOS` (constantes) por `textContent`; respuesta validada por `esRespuestaSala` en `cliente.ts`; `scripts/online-cliente.test.ts` prohíbe `innerHTML` en `online/`. |
| **A04** | Un clic = un intento; `disabled` antes del primer `await`; botón inactivo tras `limite` y `noDisponible`; topes del servidor sin tocar y verificados por la prueba (RF-10); costo fijado por la prueba (RF-11); interruptor `RETAR_DESDE_FINAL`. |
| **A05, A06, A07, A08, A09, A10** | Sin cambios de configuración, dependencias (`package*.json` intactos), identidad (apodo vacío, sin precarga), cómputo de puntos, registros (`console.*` prohibido por prueba) ni salidas del servidor. |

## Estrategia de pruebas
1. **`scripts/retar-desde-final.test.ts`**: CA-2 a CA-8, CA-10, CA-12 (parte estática) y CA-13 (parte estática).
2. **Regresión** (todas sin red): `retos`, `online-cliente`, `compartir`, `sala`, `perfil`, `seguridad-api`, `contador-carreras`, `ranking-limite`, `headers` y `npm run build` (incluye `tsc --noEmit`; mirar el tamaño del paquete principal antes y después: CA-12).
3. **Navegador** (CA-1, CA-9, CA-11, y la parte visual de CA-2, 5, 7, 13) con `/api/` simulado, **sin crear salas reales**.

### Cómo probar en el navegador sin salas reales
`npm run dev` es solo Vite: no sirve `/api`. **No** usar `vercel dev` ni una vista previa de Vercel para crear salas (pueden compartir la base de datos de producción). Con Playwright, interceptar solo las rutas sin extensión (`/^\/api\/[^.]*$/` sobre `pathname`; Vite sirve `src` que importa `/api/_retos.ts` y ese módulo no debe interceptarse):
- `GET /api/sala` → `{ "enLinea": true }` (o `false` para CA-5); `GET /api/sala?codigo=ABCDE2` → una `RespuestaSala` en fase `lobby` con un jugador; `POST /api/sala` → 201 con `{ sala, yo: 0, link: "https://chamusqueros.vercel.app/?sala=ABCDE2" }` (o 503, 429, 500, o abortar para red caída); `POST /api/ably-token` → `{ "dev": true }` (transporte de sondeo); `PUT /api/perfil` → 201 con un `PerfilCompleto`; `POST /api/carreras` → 204; `POST /api/ranking` → una lista con la fila propia (como en `ranking-rate-limit` T6).
- Contar peticiones y conexiones desde la interceptación (CA-1, CA-3 a CA-8). Para llegar a la final: la carrera más corta posible, como en T6 de `ranking-rate-limit`.
- `localStorage`: sembrar `chamusqueros:id` y `chamusqueros:retos-token` (con un valor de 43 caracteres base64url inventado) para el camino con perfil; vaciarlo para el camino sin perfil.
- Stubs de `navigator.share`, `navigator.clipboard.writeText` y `window.open` con `page.addInitScript` para CA-9.

## Cobertura (RF → dónde → CA)
| RF | Dónde | CA |
| --- | --- | --- |
| 01 | `main.ts`: bloque de la plantilla (retoque 4) | 1, 2 |
| 02 | Bloque estático; `import()` dentro del clic (retoque 5); `desde-final.ts` no se importa antes | 1, 10 |
| 03 | `retarDesdeFinal`: `disabled` antes del `await`, aviso "Creando la sala…" | 8 |
| 04 | `crearDesdeFinal` llama a `crearSala()`; delega en `crearSalaNueva` (rama `'retar'`) y en `entrarEnSala` (rama `{ creada }`) | 3, 4, 12 |
| 05 | `crearDesdeFinal` con token; rama `{ creada }` de `index.ts` | 3 |
| 06 | `crearDesdeFinal` sin token + `infoEnLinea`; rama `'retar'` de `index.ts` | 4 |
| 07 | `Intento.fallo`, `AVISOS`, manejo del manejador | 5, 6, 7 |
| 08 | Lobby existente; `retarDesdeFinal` sin `navigator.share`, sin `history`, sin `window.open` | 9 |
| 09 | `crearDesdeFinal()` sin parámetros; apodo vacío (`pedirApodo`) | 4, 10 |
| 10 | Sin cambios en `api/`; guardia en la prueba | 6, 12 |
| 11 | Prueba con `bd.consultas` y `ably.llamadas` | 3, 4, 5, 6 |
| 12 | Posición exacta de la tabla de "Cambios por archivo" | 2, 12 |
| 13 | Clases de la pantalla final; `role="status"` | 11 |
| 14 | `alSalir` por defecto = `home` | 9 |
| 15 | `RETAR_DESDE_FINAL` (2 condiciones) | 2, 13 |

Todo lo diseñado está pedido por algún RF; no sobra diseño. Lo que no se diseñó a propósito: sondeo previo de disponibilidad, contador de clics, precarga de apodo, elegir categoría, volver a la final.

## Riesgos
- **La sala que nadie usa** (el costo real, ver spec): una sala creada y abandonada con la pestaña visible gasta más que una partida jugada, por la lectura periódica del lobby (`REFRESCO_MS`, 20 s). Mitigación presente: tope de 5 salas por hora por dispositivo, 10 por IP, la lectura se detiene con la pestaña oculta (al pasar a WhatsApp), la sala vence a los 30 minutos y se limpia a la hora. Palanca fuera de esta feature: subir `REFRESCO_MS` o pausar la lectura cuando Ably está conectado.
- **El éxito cuesta antes de producir ingreso** (finanzas): Neon despierto, Ably (200 conexiones simultáneas ≈ 100 salas a la vez en el plan gratuito) y 1 millón de invocaciones al mes de Vercel Hobby. Mitigaciones: el interruptor `RETAR_DESDE_FINAL` (se apaga con un despliegue); recomendación de tener el límite del Firewall y las alertas de Neon y Vercel antes de publicar; la medición posterior.
- **Conflictos de fusión** con `continuar-carrera` en `finish()` y `src/main.ts`: cambios de líneas sueltas, sin mover código. Resolver conservando ambos lados.
- **Código de Retos que no baja tras crear la sala** (red cae justo después del `POST`): `abrirRetos` ya muestra su alerta y la sala queda huérfana hasta vencer (30 minutos). Poco probable; no se agrega manejo.
- **Navegador dentro de WhatsApp**: `import()` y `fetch` funcionan; los menús de compartir los resuelve el lobby existente (con `anclaWhatsApp` cuando falta `navigator.share`).
- **Un token guardado de otro perfil** (`403`): cae en el flujo de siempre y muestra su error actual. Sin cambio.
- **Botón visible con el servicio apagado**: aviso claro, sin consecuencias (Decisión 1).

## Medición posterior (la hace el usuario o el orquestador, no el implementador)
Solo lectura, en el panel de Neon o con `psql` a una rama de la base, nunca creando salas: partidas cerradas contra salas creadas por día (`retos_partidas` frente a `retos_salas`) para estimar la tasa de salas huérfanas; cómputo del mes en la gráfica de Neon (alerta al 70 % de 100 CU-h); invocaciones del mes en Vercel; conexiones y mensajes en Ably. Umbral sugerido para apagar el interruptor: cómputo de Neon por encima del 70 % antes de la mitad del mes, o más de 3 salas creadas por cada partida cerrada.

## Coordinación con otras ramas
Rama `claude/retar-desde-final`, base: la rama de integración con `contador-carreras`, `reto-del-dia`, `headers-analitica`, `ranking-rate-limit` y `compartir-retos`. No edita `specs/backlog.md`. Comparte `finish()` y `src/main.ts` con `continuar-carrera`.
