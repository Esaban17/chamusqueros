# Tareas: términos y condiciones y política de privacidad

Cada tarea es un commit. "Cubre" lista RF, RNF y CA del spec. Antes de fusionar a main, revisar la compuerta de `plan.md`.

## Orden y paralelismo

- T1 y T5 van en paralelo: archivos distintos.
- T2 y T3 van en paralelo, después de T1.
- T4 va después de T3.
- T6 espera aclaraciones externas.
- T7 y T8 van al final.

## Tareas

**T1. Página de términos con su estructura.** Crear `terminos.html` con la misma estructura y estilo que `privacidad.html`: título, fecha, enlace "Volver al juego" y sin recursos externos.
- Depende de: ninguna. En paralelo con T5.
- Cubre: RF-02, RNF-04, RNF-05.
- Prueba: CA-03, CA-04, CA-05 y CA-11 sobre la página vacía.

**T2. Contenido de términos.** Redactar el contenido de `terminos.html` según RF-03 a RF-10, con la fecha de última actualización.
- Depende de: T1. En paralelo con T3.
- Cubre: RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09 y RF-10.
- Prueba: CA-06.

**T3. Incluir la página en la construcción.** Agregar la entrada `terminos` en `vite.config.ts`, junto a `privacidad`.
- Depende de: T1. En paralelo con T2.
- Cubre: RF-02 (salida de la construcción).
- Prueba: CA-01. `npm run build` termina sin errores y existe `dist/terminos.html`.

**T4. Enlace en el pie de página.** Agregar "Términos y condiciones" junto a "Política de privacidad" en `footer()` de `src/main.ts`.
- Depende de: T3.
- Cubre: RF-01.
- Prueba: CA-02 en las cuatro pantallas.

**T5. Corregir la política de privacidad.** Reescribir `privacidad.html`: lista de datos (RF-12), para qué y quién lo ve (RF-13, RF-14), datos locales y borrado en el navegador (RF-15), cómo pedir el borrado sin los datos pendientes (RF-16, parcial), sin anuncios (RF-17), servicios externos (RF-18), donación en plataforma externa con nombre genérico (RF-19, parcial) y fecha de última actualización (RF-09).
- Depende de: ninguna. En paralelo con T1.
- Cubre: RF-09, RF-12, RF-13, RF-14, RF-15, RF-16 (parcial), RF-17, RF-18 y RF-19 (parcial).
- Prueba: CA-07 (sin AdSense), CA-08, CA-09, CA-10 y CA-12.

**T6. Datos pendientes en ambas páginas.** Agregar el correo de contacto y el responsable (RF-11), el método y plazo de borrado (RF-16) y el nombre de la plataforma de donación (RF-19). Cada dato se agrega solo cuando su aclaración está resuelta.
- Depende de: aclaraciones externas; T2 y T5.
- Cubre: RF-11, RF-16, RF-19.
- Prueba: CA-07 completo: `grep -i "adsense\|CORREO_DE_CONTACTO" privacidad.html terminos.html` sin resultados, y el mismo correo en ambas páginas.

**T7. Verificación de presentación.** Revisar 360 px, 1280 px, contraste en claro y en oscuro, y la red al abrir cada página y al abrir el juego.
- Depende de: T2, T4 y T5.
- Cubre: RNF-01, RNF-02, RNF-03, RNF-04, RNF-05 y RNF-06.
- Prueba: CA-03, CA-04, CA-05 y CA-11. Sin commit, salvo que aparezcan defectos.

**T8. Verificación final de contenido.** Revisar que cada punto del spec aparece, que la fecha está presente y que la plataforma nombrada coincide con el enlace de donación cuando exista.
- Depende de: T6 y T7.
- Cubre: RF-01 a RF-19 (lectura).
- Prueba: CA-06, CA-09, CA-13 y CA-14, punto por punto.

## Fuera de esta rama (seguimiento, no se implementa aquí)

- Quitar la integración de anuncios: borrar `src/ui/ads.ts` y sus llamadas en `src/main.ts`, `.env.example`, la sección de AdSense del `README.md` (líneas 41 a 50) y `src/style.css` (línea 298). Cubre RF-17 en el código. Propuesta: rama aparte, pendiente de confirmación.

## Compuertas que no son tareas de código

- Revisión humana del texto de términos y privacidad antes de publicar.
- Comprobar en producción que `VITE_ADSENSE_CLIENT` está vacía.

## Cobertura

- RF-01 → T4. RF-02 → T1 y T3. RF-03, RF-04, RF-05, RF-06, RF-07, RF-08 y RF-10 → T2. RF-09 → T2 y T5. RF-11, RF-16 y RF-19 → T6 (con su parte en T5). RF-12, RF-13, RF-14, RF-15, RF-17 y RF-18 → T5.
- RNF-01, RNF-02 y RNF-03 → T7. RNF-04 y RNF-05 → T1 y T7. RNF-06 → T7.
- Ninguna tarea queda sin requisito.
