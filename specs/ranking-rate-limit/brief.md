# Brief: tope de uso en el ranking de carreras

Listo para `spec-driven-design` (spec, plan y tasks). Origen: `specs/backlog.md` (ronda 3 del debate PO / finanzas, 2026-10-15). Decide el qué y el por qué; los RF, los criterios de aceptación y el cómo son del spec.

## Recomendación
**Hacer, chico (S).** Es la primera feature con código del backlog y la única que no espera ninguna decisión pendiente del usuario.

## Problema
`api/ranking.ts` es el único endpoint de la app sin límite de uso. Los de Retos en línea ya usan `api/_limite.ts`.
- **POST:** acepta cualquier UUID nuevo, así que cada petición crea una fila en la tabla `ranking` de Neon y una escritura. Un script puede llenarla de basura (nombres que pasan el filtro, puntajes falsos) y desplazar al jugador real de la tabla.
- **GET:** cada vez ejecuta una consulta con `row_number()` sobre toda la tabla, sin caché (`cache-control: no-store`), y a veces un `UPDATE` de avatar. Martillarlo gasta invocaciones de Vercel y mantiene Neon despierta.

Con Vercel Hobby, agotar las 4 horas de CPU activa o el millón de invocaciones deja el sitio pausado unos 30 días. No hay factura, hay caída.

## Usuarios
- **Jugador:** quiere ver un ranking creíble y que su carrera se guarde al terminar. No debe notar el tope.
- **Equipo:** quiere que un abuso barato no tumbe el sitio ni llene la base.

## Valor
Protege el ranking (el motor del "¿superás mi carrera?") y las cuotas gratuitas de Vercel y Neon. Es riesgo evitado, no ingreso: no se paga con donaciones (finanzas calcula un valor esperado en "equilibrio"; se hace porque cuesta poco).

## Métrica de éxito
- Con N peticiones por encima del tope desde una misma IP, la siguiente recibe 429 y **no toca Neon**.
- `select count(*) from ranking` no crece a saltos; ninguna IP crea más filas por hora que el tope.
- 0 casos de jugadores legítimos bloqueados en uso normal (ver "Decisiones").

**Cómo se mide hoy:** una prueba automática contra el límite, y el crecimiento de `ranking` por hora (`select date_trunc('hour', achieved_at), count(*) from ranking group by 1`). En Hobby los registros de ejecución duran **1 hora**, así que los 429 en producción no son una fuente fiable para medir; no se promete medirlos.

## Alcance (versión mínima)
- Un tope por IP para el POST y otro para el GET de `api/ranking.ts`, con el mismo mecanismo que ya usan los endpoints de Retos (`api/_limite.ts`, `LIMITES`, `limitar`, y `ipDe` de `api/_http.ts`). Sin dependencias nuevas, sin Redis.
- El rechazo ocurre **antes de cualquier consulta a Neon** (incluido el `UPDATE` del avatar del GET).
- Respuesta 429 con `retry-after`, igual que Retos, sin detalles internos.
- El cliente (`rankingApi` en `src/main.ts`) trata el 429 con un mensaje corto y humano, en la pantalla final y en la del ranking.
- Una prueba que fije el comportamiento (el tope y el 429 sin consulta a la base).

## Fuera de alcance
- Validar el puntaje en el servidor (L; deuda aceptada, `ponytail:` en `api/ranking.ts`).
- Ownership más fuerte (token con hash, como `retos_jugadores`): riesgo bajo, aceptado.
- La regla de Rate Limiting del Firewall de Vercel y las alertas de uso: son acciones del usuario en el panel, no código (bloque 1 del backlog). Esta feature no depende de que existan ni las reemplaza.
- Caché del GET público, límites globales distribuidos, bloqueo por país o por reputación.
- Unificar el limitador duplicado de `api/futbolista.ts` con `_limite.ts` (calidad, no valor).
- Cualquier cambio de esquema en `db/`.

## Decisiones
- **Los topes son de mejor esfuerzo.** `_limite.ts` cuenta en memoria por instancia de la función; es el mismo límite conocido que ya documenta ese archivo. Frena lo ingenuo, no un ataque distribuido. No se promete más.
- **Clave: IP, no id de jugador.** Un script rota UUID a voluntad; la IP es lo único que no regala.
- **El tope de carreras guardadas debe dejar pasar un uso legítimo con holgura.** Restricción de producto: un salón de clases o un wifi de cancha (decenas de niños con la misma IP terminando su carrera en la misma hora) no se bloquea. El spec fija los números con esa restricción, y el GET debe aguantar recargas normales del ranking.
- **Si se rechaza, el jugador no pierde su carta ni su carrera:** la carta, el compartir y la descarga de la imagen siguen funcionando; solo el guardado en el ranking falla, con un mensaje que invita a reintentar más tarde. Sin modal.
- **No promete proteger las horas de Neon.** Una consulta periódica y legítima (un monitor, un rastreador) que pase por debajo del tope mantiene la base despierta; eso se vigila con las alertas de Neon, no con este tope.

## Riesgos
- **Seguridad (A04):** es el motivo de la feature. El tope por instancia puede esquivarse con peticiones repartidas entre instancias; se acepta y se documenta.
- **Falsos positivos:** IP compartida (colegios, wifi público, CGNAT de los operadores móviles de Guatemala). Es el riesgo principal de producto; mitigarlo es la decisión de holgura de arriba.
- **Datos de jugadores y nombres públicos:** el filtro de nombres (`esOfensivo`) ya existe y no cambia. Esta feature no agrega ni expone datos.
- **Contenido para menores:** el mensaje del 429 debe ser corto, sin tecnicismos y sin culpar al jugador.
- **Legal:** ninguno nuevo. No se registra la IP en ninguna parte (el tope vive en memoria y no se guarda).

## Prioridad
Primera feature con código del backlog. Después de las acciones del usuario del bloque 1 (en especial la regla del Firewall, que cubre el tráfico masivo de toda `/api/*`).

## Esfuerzo
S, 1 a 2 horas. Toca `api/ranking.ts`, una entrada en `LIMITES` de `api/_limite.ts`, `src/main.ts` (`rankingApi` y los dos lugares que muestran su error) y una prueba.

## Servicios externos
Ninguno nuevo. Reduce consultas a Neon y ejecuciones de funciones de Vercel bajo abuso.

## Aclaraciones
`[NECESITA ACLARACIÓN: ninguna que bloquee.]` Para el spec, los números exactos de los topes son del plan: la restricción es la de "Decisiones" (un salón completo no se bloquea). Si el usuario conoce el tamaño típico del grupo que comparte una IP, ayuda a fijarlos.
