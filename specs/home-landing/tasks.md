# Tareas

- [x] T1 `public/og.png` 1200x630, <= 300 KB, generada una vez con el navegador (avatar, marca, frase); sin dependencias nuevas. (RF-07, CA-4, CA-5)
- [x] T2 `index.html`: `<title>`, `meta description`, `canonical`, `og:*` y `twitter:*` con URL absoluta fija. Depende de T1. (RF-07, CA-4)
- [x] T3 `home()` en `src/main.ts`: hero compacto con CTA arriba y sticker más chico, "Cómo funciona", "Qué incluye" (con `futCard` de ejemplo y 8 banderas), mejores carreras (máx. 3, escapadas) con acceso al ranking, cierre con segundo CTA, sin `adSlot('home')`; handlers por `data-go`. (RF-01 a RF-06, RF-08, D4, CA-3, CA-6, CA-7, CA-8, CA-9)
- [x] T4 Estilos en `src/style.css` para hero, pasos, tarjetas, carta de ejemplo y filas de mejores carreras, en claro y oscuro, sin desborde a 360 px. Depende de T3. (RF-09, CA-1, CA-2)
- [x] T5 Verificar en navegador a 360x640: borde del CTA <= 560 px (con y sin carreras guardadas), `scrollWidth` <= 360, secciones, flujos empezar/ranking/volver, siembra XSS, tema oscuro, sin errores de consola; ajustar T3/T4 si falla. Depende de T4. (CA-1 a CA-3, CA-6 a CA-9)
- [x] T6 `npm run build` y revisar `dist/index.html` y `dist/og.png`; confirmar que `package.json` no cambió. Depende de T2 y T4. (CA-4, CA-5)
- [ ] T7 Tras desplegar, validar la vista previa con el depurador de enlaces de Facebook y pegando el enlace en WhatsApp (la caché puede mostrar la versión vieja). Depende de T6. (RF-07)

Cobertura: RF-01 a RF-09 en T1 a T5; CA-1 a CA-9 en T5 y T6. Sin tarea de seguridad aparte: A03 se prueba en T5 (CA-7).
