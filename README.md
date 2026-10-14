# Chamusqueros

Juego web de carrera futbolera. Creás un jugador, elegís su nacionalidad y debutás en la liga de tu país con equipos reales; tomás decisiones y al final obtenés una tarjeta para compartir. Hay 27 países jugables (Guatemala con sus tres divisiones; el resto con primera y segunda) y desde cualquiera podés fichar por clubes reales del resto del mundo.

## Correr el proyecto

```bash
npm install
npm run dev          # servidor local en http://localhost:5173
npm run build        # sitio listo para publicar en dist/
npm run build:preview  # todo en un solo HTML en dist-single/ (para vistas previas)
npm run simulate -- 5000     # simula 5,000 carreras de todos los países para revisar el balance
npm run simulate -- 2000 GT  # solo un país
```

## Estructura

| Archivo | Qué contiene |
| --- | --- |
| `src/engine/data/teams.ts` | Equipos reales de Liga Nacional, Primera y Segunda División de Guatemala (Apertura 2026), con fuentes |
| `src/engine/data/paises/` | Primera y segunda división de los otros 26 países (temporada en curso al 14/10/2026), con fuentes |
| `src/engine/countries.ts` | Cada país: Selección (fuerza, umbral de convocatoria, chance de Mundial), nivel de su liga, moneda y textos propios |
| `src/engine/clubs.ts` | Nivel de cada club y cómo se ve un club extranjero según la nacionalidad del jugador |
| `src/engine/events/` | Las 129 decisiones, por tema: `base`, `divisiones`, `extranjero`, `medios`, `seleccion` |
| `src/engine/engine.ts` | Simulación de temporadas, Selección, traspasos, elección de escenarios y veredicto final |
| `src/ui/avatar.ts` | Avatar personalizable (piel, pelo, barba, accesorios) dibujado en SVG |
| `src/ui/card.ts` | Tarjeta final en imagen (1080x1350) |
| `src/ui/flags.ts` | Banderas de las selecciones rivales (código de país para flagcdn.com) |
| `src/ui/ads.ts` | Integración con Google AdSense |
| `src/main.ts` | Pantallas del juego |
| `scripts/simulate.ts` | Simulación masiva para balancear |

Para agregar una decisión nueva, copiá un bloque del archivo de su tema en `src/engine/events/`. Las probabilidades de cada opción deben sumar 1. Las rutas (Selección, salir al extranjero) se encadenan con banderas: un resultado pone `flag`, el paso siguiente la exige en `when` y tiene `weight` de 3 o más. El motor le da prioridad a los pasos de una ruta en curso y evita repetir el mismo tipo de escena seguida. Después corré `npm run simulate`: muestra el balance y qué eventos nunca salen.

Para actualizar los equipos cada torneo (ascensos y descensos), editá `src/engine/data/teams.ts` (Guatemala) o el archivo del país en `src/engine/data/paises/`. Los equipos de cada liga van del más fuerte al más débil: el orden decide su nivel. Para agregar un país, creá su archivo de equipos y agregá su fila en `src/engine/countries.ts` (los nombres de liga no se pueden repetir entre países). `npm run simulate` avisa si algún texto de Guatemala se cuela en la carrera de otra nacionalidad.

## Escudos

Poné los escudos en `public/escudos/<id>.png` (ver `public/escudos/LEEME.md`; los ids de Primera empiezan con `p-` y los de Segunda con `s-`, por ejemplo `p-coatepeque.png`; los de otros países empiezan con su código, por ejemplo `mx-america.png`). Si falta alguno, el juego dibuja un escudo con iniciales y colores. Revisá también los colores y ciudades de cada club en `clubs.ts`: son una primera versión.

## Google AdSense

1. Publicá el sitio en un dominio propio (AdSense no acepta subdominios gratuitos como `*.vercel.app`).
2. Creá la cuenta en AdSense, agregá el sitio y esperá la aprobación.
3. Creá tres bloques de anuncios "Display" y copiá sus IDs.
4. Copiá `.env.example` a `.env` y llená `VITE_ADSENSE_CLIENT` (ca-pub-...) y los tres `VITE_ADSENSE_SLOT_*`.
5. Cambiá el número en `public/ads.txt` por tu ID de editor (pub-...).
6. Poné tu correo en `privacidad.html`.

Los anuncios están en la portada, debajo del historial durante el juego y en la pantalla final, lejos de los botones de decisión para evitar clics accidentales (política de AdSense).

## Publicar

Cualquier hosting estático sirve: Vercel, Netlify o Cloudflare Pages. Comando de build `npm run build`, carpeta de salida `dist`.
