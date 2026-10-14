# Tareas

Todas las tareas se verifican con `npm run simulate -- 5000` y `npm run build` al terminar; cada una dice además qué debe cumplirse.

- [x] T1 Categoría: `'amor'` en `EventCategory` (`src/engine/types.ts`) y `amor: 'Vida sentimental'` en `CATEGORY_LABEL` (`src/main.ts`). Sin dependencias. (D-02, RF-15)
  Hecho cuando: `tsc --noEmit` pasa y la etiqueta de un evento de amor no sale vacía.
- [x] T2 Base de `src/engine/events/amor.ts`: `PESO`, `PAREJA`, `RUTAS`, `FIN`, `conPareja`, `soltero`, `adulto`, `AMOR_EVENTS = []`; registrar en `src/engine/events/index.ts`. Depende de T1. (RF-01, RF-02, RF-03)
  Hecho cuando: el juego arranca sin errores y `ALL_EVENTS` no tiene ids repetidos.
- [x] T3 Relación estable: `amor_cita`, `amor_compromiso`, `amor_boda`, `amor_crisis`, con hitos "Se comprometió" y "Se casó". Depende de T2. (RF-07, RF-11, RF-04, RF-01)
  Hecho cuando: un casado no recibe cita ni crisis, y solo existe una boda por carrera.
- [x] T4 La hija del entrenador: `amor_hija_1`, `amor_hija_2`, `amor_hija_3` con banderas `amor_hija`, `amor_hija_2` y `amor_hija_publica`. Depende de T2. (RF-05, RF-12, RF-03, RF-04)
  Hecho cuando: el paso 3 tiene un desenlace con `coach` +8 o más y noviazgo, y otro con `coach` -12 o menos, y todas las vías borran sus banderas.
- [x] T5 La novia de un compañero: `amor_companero_1`, `amor_companero_2` con `amor_traicion`, `transfer: 'any'` y `'down'`. Depende de T2. (RF-06, RF-12, RF-03, RF-04)
  Hecho cuando: "rechazar" tiene un solo desenlace (ánimo +4 o más, `coach` +2 o más) y la salida del club ronda 33 % con opciones al azar.
- [x] T6 Famosa o influencer: `amor_famosa_1`, `amor_famosa_2` (paparazzi) con `amor_famosa`. Depende de T3. (RF-08, RF-12, RF-03, RF-04)
  Hecho cuando: toda ruptura en este y los demás eventos borra `FIN` y no deja `amor_famosa` sin pareja.
- [x] T7 Distancia: `amor_distancia` (`ctx.abroad` y pareja, una vez por carrera). Depende de T3. (RF-09, RF-04)
  Hecho cuando: no aparece sin pareja ni dentro del país.
- [x] T8 Tentación y foto filtrada: `amor_foto`. Depende de T3. (RF-10, RF-04)
  Hecho cuando: todo desenlace de "ceder" tiene algo negativo y al menos la mitad de la probabilidad termina la relación.
- [x] T9 `farandula` no aparece con `amor_comprometido` ni `amor_casado` (una línea en `src/engine/events/base.ts`). Depende de T3. (RF-13)
- [x] T10 `scripts/simulate.ts`: chequeos de estado, rutas abiertas, cambio de club del compañero, hitos, `farandula`, formato de opciones, línea de frecuencia de amor, lista de términos prohibidos. Depende de T3 a T8. (RF-01 a RF-04, RF-11 a RF-13, RS-01 a RS-04; CA-1 a CA-3, CA-5, CA-6, CA-7, CA-10 a CA-12)
- [x] T11 Calibrar frecuencia con `PESO`, pesos y edades hasta que se cumpla CA-7 y CA-8; reportar los números por ritmo y el cambio en las otras categorías. Depende de T10. (RF-15, D-05)
- [x] T12 Revisión de contenido: leer todos los textos de `amor.ts` con la lista RS-01 a RS-06, anotar el resultado en el reporte y corregir lo que falle; confirmar sin Guatemala fuera de `GT` y con "del" y "al" correctos. Depende de T3 a T8. (RS-01 a RS-07, RF-14, CA-9, CA-11)
- [x] T13 Verificación final: `npm run build`, `npm run simulate -- 5000`, captura de un evento con "Vida sentimental" y comprobación de los CA contra los números. Depende de T9, T11, T12. (CA-1 a CA-13)
- [x] T14 La hija del técnico sigue al técnico: bandera `amor_club_<id>`, pasos 2 y 3 en ese club y evento `amor_hija_fin`; `simulate` exige 0 pasos en otro club. Depende de T4, T10. (RF-16, CA-14)
- [x] T15 Lo mismo para la pareja del compañero: bandera `amor_clubc_<id>`, paso 2 en ese club y evento `amor_companero_fin`. Depende de T5, T14. (RF-16, CA-14)

## Trazabilidad
| Requisito | Tareas |
|---|---|
| RF-01 | T2, T3, T10 |
| RF-02 | T2, T10 |
| RF-03 | T2, T3, T4, T5, T6, T10 |
| RF-04 | T3 a T8, T10 |
| RF-05 | T4 |
| RF-06 | T5 |
| RF-07 | T3 |
| RF-08 | T6 |
| RF-09 | T7 |
| RF-10 | T8 |
| RF-11 | T3, T10 |
| RF-12 | T4, T5, T6, T10 |
| RF-13 | T9, T10 |
| RF-14 | T12, T10 |
| RF-15 | T1, T11 |
| RF-16 | T14, T15 |
| RS-01 a RS-07 | T10, T12 |
| D-02 | T1 |
