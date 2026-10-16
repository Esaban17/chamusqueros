# Backlog de Chamusqueros

Versión final de la ronda 3 del debate PO / finanzas-roi (2026-10-15). Base: `origin/main` en `168d842`. Informes de finanzas: `informes/2026-10-15-finanzas-linea-base.md` y `informes/2026-10-15-finanzas-roi-backlog.md`. Los `informes/` no se publican: el repo es público y traen datos de infraestructura (están en `.gitignore`).

**Recomendación en una frase:** primero lo que no es código (enlace de donación, medir, regla de Rate Limiting y alertas), después la feature `ranking-rate-limit` (S) y `compartir-retos`; `continuar-carrera` queda como la mejor feature M, pero sube solo cuando un contador de carreras iniciadas y terminadas demuestre que se pierden carreras.

**Cómo se ordena:** ya no por RICE. Finanzas mostró con razón que el RICE encadena tasas sin dato (30 % interrumpe, 25 % termina una partida, 40 % termina una carrera) sobre una base de 1.000 jugadores al mes que lo medido contradice (21 filas en 2 días de vida, ~315 al mes extrapolado, buena parte pruebas del equipo). El orden sale de: qué desbloquea datos o ingreso, costo y riesgo de infraestructura, y esfuerzo. El RICE se rehace cuando `medir-base` dé cifras.

---

## Bloque 1. Acciones del usuario sin código

| # | Acción | Costo | Por qué ahora |
| --- | --- | --- | --- |
| 0 | **Pegar `DONATE_URL`** en `src/main.ts:35` (hoy `''`). Con el enlace puesto aparecen el pie y "¿Te gustó?" ya construidos. | 15 min, US$0 | Es el único ingreso posible y todo ROI sin él es indefinido. Hobby permite pedir donaciones (no es uso comercial) siempre que no se ofrezcan ventajas por donar. Recurrente cobra 5,25 % + Q2 (cuenta personal). |
| 1 | **Decidir el script de Vercel Web Analytics** (`medir-base` nivel B). Sí o no. | 1 h de código si es sí | Es lo único que da visitas y origen (WhatsApp). La ventana de Hobby es de 1 mes y no es retroactiva: cada semana sin él es línea base perdida. Obliga a un párrafo en `privacidad.html` y a probar en una vista previa qué guarda del `?sala=`. |
| 2 | **Regla de Rate Limiting del Firewall de Vercel** sobre `/api/*` (1 regla permitida en Hobby) **y alertas de uso** (Neon al 70 % de CU-h, panel de Usage de Vercel, correo de Ably al 80 %). | 15 a 30 min | Cierra el riesgo mayor (pausa de Vercel ~30 días por un pico o un abuso) sin código. No estaba en mi lista; la propuso finanzas. |
| 3 | Verificar en los paneles: si las peticiones bloqueadas por la regla gastan invocaciones; si Usage de Vercel muestra peticiones de CDN por día en Hobby; si Neon y Ably están de verdad en plan gratis (sin tarjeta). | 15 min | Datos que ninguno de los dos puede consultar desde aquí. |
| 4 | Correr las consultas de `medir-base` nivel A cada semana (abajo) y separar tráfico real de pruebas del equipo. | 10 min por semana | Sin esto la decisión sobre `continuar-carrera` y las demás M sigue siendo una apuesta. |

**Consultas de `medir-base` nivel A (Neon):**

```sql
-- jugadores con carrera terminada, por mes (piso: una fila por jugador, su mejor carrera)
select date_trunc('month', achieved_at) m, count(*) from ranking group by 1 order by 1;
-- perfiles de Retos por mes
select date_trunc('month', creado_at) m, count(*) from retos_jugadores group by 1 order by 1;
-- partidas en línea cerradas por día, últimos 14 días
select date_trunc('day', cerrada_at) d, count(*) from retos_partidas where cerrada_at > now() - interval '14 days' group by 1 order by 1;
-- jugadores de Retos que volvieron (más de un día distinto)
select count(*) from (
  select id from (select a id, cerrada_at::date d from retos_partidas union select b, cerrada_at::date from retos_partidas) t
  group by id having count(*) > 1) u;
```

---

## Bloque 2. Features en orden

Cada ítem lleva su razón. Los servicios y costos están en los informes de finanzas.

| # | Slug | Estado (2026-10-15) | Esfuerzo | Servicios | Razón del lugar |
| --- | --- | --- | --- | --- | --- |
| 1 | `ranking-rate-limit` | Implementada en `claude/integracion` (sin desplegar) | S | Reduce Neon y funciones | Único endpoint sin tope (`api/ranking.ts`); la regla del Firewall frena lo masivo, pero no distingue el POST que crea filas y es de una sola región. Es la única con código que no espera ninguna decisión pendiente. **Brief listo: `specs/ranking-rate-limit/brief.md`.** |
| 2 | `compartir-retos` | Implementada en `claude/integracion` (sin desplegar) | S alto | Ninguno | Única palanca de adquisición con operación cero. Va después de la regla del Firewall porque si funciona sube el tráfico. Se mide con `?ref=reto` solo si se concede el nivel B. |
| 3 | `contador-carreras` (`medir-base` nivel C) | Implementada en `claude/integracion` (sin desplegar) | S | 1 tabla de contadores y 1 endpoint pequeño; ~1 escritura a Neon por carrera iniciada o terminada | Mide lo que ninguna otra medida da en Hobby: carreras iniciadas frente a terminadas. Es el dato que decide `continuar-carrera`. Contadores agregados por día, sin id de jugador. |
| 4 | `continuar-carrera` | Implementada en `claude/integracion` (sin desplegar) | M alto (riesgo de L) | Ninguno (`localStorage`) | La mejor M: protege los 17 a 21 minutos de la carrera, de la que cuelgan la carta, el ranking, el compartir y la exposición al enlace de donación. **Sube al primer lugar si, con al menos 100 carreras iniciadas, menos del 60 % se termina.** |
| 5 | `headers-analitica` (cubre `vercel-headers` y `medir-base` nivel B) | Implementada en `claude/integracion` (sin desplegar); CSP en modo solo-reporte | S | Ninguno | Sin XSS conocido (el código usa `textContent`/`esc`). Riesgo de romper Retos en línea con una CSP mal armada: primero `Content-Security-Policy-Report-Only` y probar en una vista previa. |
| 6 | `reto-del-dia` | Implementada en `claude/integracion` (sin desplegar) | M | Ninguno (v1) | Retención sin costo de servidor, pero no pasa por el enlace de donación y su efecto es una apuesta. Espera datos de retorno. |

### Contrato de `contador-carreras` (para que la decisión de finanzas sea explícita)
Sin datos personales ni identificador de jugador ni de dispositivo: una fila por día con dos números (iniciadas, terminadas). Un POST por evento, con límite por IP. Es un cambio al texto de `privacidad.html` solo si se guardara algo por jugador, y no se guarda. Alternativa sin código: ninguna en Hobby (los eventos personalizados son de Pro).

---

## Bloque 3. Descartadas o en espera, con la condición que las reactivaría

| Slug / tema | Estado | Se reactiva si |
| --- | --- | --- |
| `retar-desde-final` | **Implementada** en `claude/integracion` (sin desplegar), por decisión del usuario del 2026-10-15 (antes: "No por ahora") | Ya no aplica. Queda la vigilancia del costo: es la única feature cuyo costo sube con el éxito (Neon despierta casi todo el día); la palanca es `REFRESCO_MS` o el interruptor `RETAR_DESDE_FINAL` en `src/main.ts`. Condiciones originales para reactivarla: ver `specs/retar-desde-final/spec.md`, Decisión 9. |
| Filtro de nombres del ranking | **Hecho** | `api/ranking.ts:68` usa `esOfensivo`. |
| Validar el puntaje del ranking en el servidor (L) | En espera, deuda aceptada | El ranking tiene algo que perder (premios, visibilidad) o aparecen puntajes imposibles. `ponytail:` ya documentado. |
| Ownership del ranking de carrera | Riesgo bajo, aceptado | Se endurece junto con la validación del puntaje. La única credencial es un UUID v4 secreto que ningún endpoint devuelve. |
| Resultados en vivo | Pausada | Se consigue una fuente que no devuelva 403 a Vercel (ESPN responde 403). Apagada, el cliente igual consulta cada 2 min, pero la CDN lo absorbe. |
| Código de recuperación de perfil, cuentas, registro | Fuera por decisión del usuario | El usuario lo reabre. |
| Anuncios, modales de donación, notificaciones, ventajas por donar | Descartadas por decisión cerrada | No se reactivan. Ventajas por donar, además, sacarían al proyecto de la excepción de donaciones de Hobby. |

---

## Siguiente iteración

Hallazgos de las revisiones previas al despliegue (2026-10-15) que **no** se aplicaron en `claude/integracion`. Ya aplicados: de `informes/2026-10-15-ux-integracion.md`, M-1 (alto del bloque Retar), M-2 (aviso de que se sale de la final; guardar el resumen para poder volver sigue pendiente), M-3 (texto coherente con el botón inactivo; quitar el botón tras una falla definitiva sigue pendiente), M-4, B-7 (nombre "Retar a alguien en línea") y M-6 (historial solo con días jugados y "Volver a Retos" a la vista); de `informes/2026-10-15-seguridad-integracion.md`, B-1 y B-2 (commit `42fcf66`).

### UX (`informes/2026-10-15-ux-integracion.md`)

| ID | Pendiente | Severidad |
| --- | --- | --- |
| M-5 | Jerarquía de botones del Home con carrera guardada: que "Continuar mi carrera" sea la única acción principal (por ejemplo, "Empezar mi carrera" como enlace de texto de 44 px). **No cambiar el color propio de Retos**: fue una decisión reciente del usuario. Decidir si aplica también a la sección "Retos Fútbol" de la landing | Media |
| M-6 (resto) | No mostrar "Racha: 0 días" antes de la primera jugada del Reto del día ("Primer día" o esconder la línea) | Media |
| M-7 | Duelo local sin menú del sistema: "Enviar por WhatsApp" como `btn secondary`, alto uniforme de 57 px o rótulo corto "WhatsApp"; en el lobby, el mismo botón mide 54 px (es un `a`) | Media |
| M-8 | Ranking global con 429: agregar "Reintentar", `role="status"` y el mismo texto en los tres rankings ("Hay mucha gente en el ranking. Probá de nuevo en un ratito."); el de Retos (`cliente.ts`) hoy culpa al jugador | Media |
| M-2 (resto) | Guardar el resumen de la final para poder volver desde Retos (feature nueva) | Media |
| M-3 (resto) | Tras una falla definitiva (no disponible, tope), reducir el bloque Retar al aviso, sin botón | Media |
| B-1 | Duelo local: el texto compartido dice "terminó 0 a 0" tras un desempate (`trivia.ts` no suma los aciertos del desempate) | Baja |
| B-2 | Final, "Reintentar": el foco se pierde (`document.activeElement` queda en `BODY`) | Baja |
| B-3 | Final con error distinto de 429 (500, red): el bloque de ranking desaparece sin aviso (preexistente) | Baja |
| B-4 | Texto de 14 px en bloques nuevos (resumen de "Continuar", avisos del formulario y de Retar): 16 px en el aviso del formulario y 15 px mínimo en el resumen | Baja |
| B-5 | Resumen de "Continuar" críptico: "Temporada 2026-27" y "Decisión 3 de 3" | Baja |
| B-6 | Formulario con carrera guardada: la advertencia de que se borra queda al final de 1514 px; subirla al encabezado | Baja |
| B-7 (resto) | La sección "Retos Fútbol" de la landing no menciona el Reto del día (lo fija `reto-del-dia` RF-01; se puede dejar) | Baja |
| B-8 | "Respondé con un toque o con las teclas 1 a 4." no aporta en celular; "Volvé mañana" sin hora de Guatemala; `alert()` de "No se pudo cargar" al abrir Retos (preexistente) | Baja |

### Seguridad (`informes/2026-10-15-seguridad-integracion.md`)

| ID | Pendiente | Severidad |
| --- | --- | --- |
| M-1 | Pasar la CSP de solo-reporte a bloqueante: agregar `frame-ancestors 'none'`, recorrer en navegador todos los flujos con la consola abierta (incluido Retos en línea con Ably y el Reto del día) y recién entonces cambiar la clave a `Content-Security-Policy`; opcional, un `report-uri` propio con tope por IP. Considerar `Cross-Origin-Opener-Policy: same-origin` | Media |
| B-3 | Rama `main` sin protección y sin alertas de Dependabot (un push despliega a producción): activar Dependabot alerts y, si se quiere, exigir `npm run build` y las pruebas antes de fusionar | Baja |
| B-4 | Los informes de finanzas versionados en un repositorio público contienen datos de infraestructura (identificadores de la cuenta de Vercel, dominios de otros proyectos y umbrales de los límites gratuitos): quitarlos o dejar de versionarlos antes del push. Este backlog ya no contiene identificadores de cuenta | Baja |
| I-1 | Contador de carreras abierto a inflado (tope por IP en memoria y por instancia); riesgo aceptado en el spec | Info |
| I-2 | `application/jsonx` y `application/json;x` pasan la comprobación de `api/carreras.ts`: igualar a `=== 'application/json'` o `application/json;` | Info |
| I-3 | `?sala=` y la analítica: quedan el `Referer` de la propia petición y los registros de Vercel (declarado en el spec) | Info |
| I-4 | Hojas de estilo de Google Fonts sin SRI: no aplicable; autoalojar las fuentes las quitaría de la CSP y de la política de privacidad | Info |
| I-5 | Falso positivo de gitleaks en `scripts/fixtures/servidor.ts:54` | Info |

Prerrequisitos operativos del despliegue (no son hallazgos): aplicar `db/contador-carreras.sql` en Neon antes del push (es idempotente), activar Web Analytics en el panel de Vercel y, tras desplegar, revisar las cabeceras con `curl -I` y la consola del navegador en busca de violaciones de la CSP.

---

## Estado verificado de la deuda (resumen)

| Pendiente citado en los specs | Estado hoy |
| --- | --- |
| Rate limit | Cerrado en Retos (`api/_limite.ts`) y en `api/ranking.ts` (`ranking-rate-limit`, implementado en `claude/integracion`; el POST exige JSON desde `42fcf66`) |
| `vercel.json` y headers | Implementado (`headers-analitica`) con la CSP en modo solo-reporte; pasarla a bloqueante sigue pendiente (ver "Siguiente iteración") |
| Analítica | Implementada (`headers-analitica`, `medir-base` nivel B) y contador de carreras (`contador-carreras`); falta activar Web Analytics en el panel de Vercel y aplicar `db/contador-carreras.sql` en Neon al desplegar |
| Progreso de la carrera | Se guarda en el dispositivo (`continuar-carrera`, implementado en `claude/integracion`) |
| Donación | Construida pero apagada (`DONATE_URL = ''`) |

---

## Debate con finanzas

> Histórico: el debate es de la ronda 3. El 2026-10-15 las 7 features quedaron implementadas en `claude/integracion` (ver el estado en los Bloques 2 y 3), incluida `retar-desde-final` por decisión del usuario; el orden y las condiciones de abajo ya no mandan.

### Respuestas a sus objeciones

| Objeción de finanzas | Respuesta | Razón en una línea |
| --- | --- | --- |
| La base de 1.000 jugadores al mes no es un dato; lo medido da ~315 y mucho son pruebas. | **Acepto** | Es una apuesta y el RICE encadena tasas sin dato; lo saco del orden hasta tener cifras. |
| Pegar `DONATE_URL` va antes que todo. | **Acepto** | Ya lo había señalado como lo de mayor retorno; es el único ingreso y cuesta 15 minutos. |
| `medir-base` A y B antes de las M, y B es urgente por la ventana de 1 mes. | **Acepto** | Cada semana sin script es línea base perdida. La decisión de B es del usuario. |
| La regla del Firewall de Vercel va antes del rate limit en código. | **Acepto** | Cubre toda `/api/*` con 15 minutos y sin código; no la tenía en la lista. |
| El tope en código no protege las horas de Neon (una consulta cada 5 min la deja despierta 24 h). | **Acepto con cambio** | El tope no resuelve eso y no lo prometo; pero el código cierra algo que la regla no: el POST que crea filas, con un tope más estricto que el de toda `/api/*`, y rechaza antes de tocar Neon. Mantengo `ranking-rate-limit` (S), como complemento. |
| `ranking-rate-limit` en código va después de la regla. | **Acepto** | Complemento barato, sin urgencia observada; sigue siendo la primera con código porque no espera decisión del usuario. |
| `compartir-retos` es S alto (7+ archivos), no S. | **Acepto** | Cuento los archivos de pantalla de resultado; sigue siendo operación cero. |
| `compartir-retos` sube el tráfico y por eso presiona los límites. | **Acepto** | Por eso va después de la regla del Firewall y de las alertas. |
| `vercel-headers` después: sin vector conocido y puede romper Retos. | **Acepto** | Primero en modo solo-reporte, probado en vista previa. |
| `reto-del-dia` después. | **Acepto** | Retención sin dato, no pasa por el enlace de donación. |
| `retar-desde-final`: no por ahora. | **Acepto** | Su costo (Neon despierto, Ably) crece con el éxito antes que el ingreso. |
| Ninguna se paga con donaciones; una M necesita ~1.400 visitantes nuevos solo para recuperar tokens. | **Acepto** | El valor de estas features es retención o riesgo evitado, no ingreso directo, y lo digo así en cada brief. |
| `continuar-carrera` no debe ser la primera: su 30 % no tiene dato, hoy ni se registra el inicio de una carrera, y es la M más cara. | **Acepto con cambio** | Acepto el lugar (4.º) y el costo de M alto con riesgo de L. No acepto el criterio de reevaluación: ver el desacuerdo 1. Agrego `contador-carreras` para que el dato exista. |
| Reevaluar `continuar-carrera` en 2 a 4 semanas; si menos de la mitad de las cargas termina enviando carrera al ranking, sube al primer lugar. | **Acepto con cambio** | Cambio la métrica: iniciadas frente a terminadas, no cargas frente a envíos (ver abajo). Umbral propuesto: con ≥ 100 iniciadas, menos del 60 % terminadas. |
| Defensa de mi favorita. | **Mantengo** | Es la única feature que protege el activo central (una carrera de 20 minutos en el navegador de WhatsApp, que se cierra solo). Su valor no se mide en donaciones sino en carreras que no se tiran a la basura. Pero no la defiendo sin el dato. |

### Lo acordado
- Orden: `DONATE_URL`, `medir-base` A (y B si el usuario concede), regla del Firewall y alertas, `ranking-rate-limit`, `compartir-retos`, y después las M.
- `retar-desde-final` queda fuera; `vercel-headers` y `reto-del-dia` esperan.
- El RICE numérico no se usa para decidir entre M hasta tener cifras reales.
- Las features se justifican por retención o riesgo evitado; nada aquí se paga con donaciones a corto plazo.
- La donación no ofrece ventajas ni niveles (límite de Hobby).

### Lo que sigue en desacuerdo
1. **Métrica de reevaluación de `continuar-carrera`.** Finanzas propone cargas de página frente a carreras enviadas al ranking. Esa razón mezcla visitantes que nunca empezaron una carrera, visitas repetidas y gente que jugó pero no envió, así que mide la conversión de la landing, no la pérdida en mitad de una carrera, que es lo que esta feature resuelve. Además, `ranking` solo guarda una fila por jugador con su mejor carrera. Yo mantengo el contador de iniciadas y terminadas. Finanzas no lo rechazó (lo menciona en su sección de lo que no se puede medir), pero no lo puso en su orden; queda por acordar si va antes o después de `compartir-retos`.
2. **Peso del argumento financiero.** Para finanzas, `continuar-carrera` vale US$0,4 a 4 al mes. Para mí el criterio principal no es la donación sino el jugador que pierde 20 minutos; el dinero es un efecto lateral. No es un desacuerdo sobre el orden sino sobre qué se considera valor.
3. **Dónde vive el tope de `ranking-rate-limit`.** Finanzas lo ve como complemento de bajo valor esperado ("equilibrio"). Yo lo mantengo porque la regla de Hobby es una sola, cuenta por región, y no distingue entre un GET y un POST que escribe filas.

### Preguntas para el usuario (sin duplicados, con las de finanzas)
1. ¿Ya existe el enlace de donación de Recurrente? ¿Cuenta personal o comercial, con NIT, con monto mínimo? ¿Cuál es el tratamiento fiscal de las donaciones (lo confirma el contador o la SAT)?
2. ¿Aceptas el script de Vercel Web Analytics (cookieless, mismo dominio, ventana de 1 mes), con un párrafo nuevo en `privacidad.html` y una prueba de qué guarda del `?sala=`?
3. ¿Aceptas un contador anónimo de carreras iniciadas y terminadas (una fila por día, sin ids)?
4. ¿Neon y Ably están en plan gratis, sin tarjeta?
5. Las 21 filas del ranking y los 5 perfiles de Retos, ¿son pruebas del equipo o gente real?
6. ¿Cómo se paga el uso de Claude (suscripción o API) y cuánto vale la hora humana?
