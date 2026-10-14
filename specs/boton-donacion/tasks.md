# Tareas: monetización (donación en lugar de anuncios)

| ID | Entregable | Depende de | Cubre |
|----|------------|------------|-------|
| T-01 | `KOFI_URL` (vacía hasta tener la cuenta) y helper `donateLink` en `src/main.ts`. | — | RF-03, RF-09 |
| T-02 | Enlace en `footer()`. | T-01 | RF-01 |
| T-03 | Bloque "¿Te gustó?" en `finish()`, después de "Jugar otra carrera". | T-01 | RF-02, RF-09 |
| T-04 | Color y área de toque de `footer a` en `src/style.css`. | T-02 | RF-07 |
| T-05 | Quitar AdSense del código: `src/ui/ads.ts`, `public/ads.txt`, imports y llamadas en `src/main.ts`, bloque `.ad` en `src/style.css`. | T-02, T-03 | RF-10, RF-11 |
| T-06 | Quitar AdSense de `.env.example` y `README.md`. | — | RF-10 |
| T-07 | Revisar que no hay scripts, paquetes, modales ni llamadas nuevas. | T-02, T-03, T-05 | RF-04, RF-05, RF-06 |
| T-08 | Variables `VITE_ADSENSE_*` en Vercel: no existen (confirmado por el orquestador). | — | RF-12 |
| T-09 | `npm run build`, grep de CA-11, revisión en `dev` y `build:preview`, 360 y 1280 px, contraste en ambos temas. | T-02 a T-08 | RF-06, RF-07, RF-08, RF-10, RF-11 |
