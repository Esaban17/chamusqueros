# Plan: términos y condiciones y política de privacidad

Deriva de `spec.md`. Cada RF y CA del spec queda cubierto aquí o en `tasks.md`.

## Arquitectura

Sin cambios. El sitio ya es estático y multipágina (una entrada de construcción por página) y tiene una función para el ranking. Esta feature agrega una página estática y un enlace. No agrega capas, servicios ni datos. Según el árbol de decisión de gq:architecture, contenido sin lógica no necesita arquitectura formal.

## Stack

Se respeta el stack del repo: Vite 5, TypeScript sin framework de interfaz, páginas HTML en la raíz, hosting en Vercel (cada push a main despliega a producción) y base del ranking en Neon. El default de GQ no aplica porque el repo ya tiene stack. Sin dependencias nuevas.

- Marca: no se aplica gq:branding. El estilo lo fija `privacidad.html`, por decisión del orquestador: el repo manda sobre el default.
- Validación (gq:validation): no aplica. La feature no recibe datos del usuario.
- Context7: no hace falta, no se agrega ninguna librería.
- `.gq/config.md` y `.gq/constitution.md` no existen. Se usan los defaults. Sugerir `/gq:setup` y `/gq:constitution`.

Alternativa descartada (decisión no trivial): mostrar los textos legales como pantallas dentro del juego. Trade-off: menos archivos y sin cambios en la construcción, pero el texto viaja con el juego (más peso al arranque), no tiene dirección propia y no se abre sin cargar el juego. Por eso van en páginas aparte, como ya hace la privacidad.

Atajo deliberado: estilos repetidos en cada HTML, como hoy. Límite: dos archivos con el mismo CSS. Extraer un CSS compartido al tener una tercera página legal.

## Modelo de datos

Sin cambios. Estado actual de la tabla `ranking` (`db/ranking.sql`): `player_id` (uuid, clave primaria), `name` (texto de 1 a 40 caracteres), `score`, `titles`, `caps`, `achieved_at` (fecha con hora, por defecto ahora), `avatar` (6 valores) y `card` (jsonb). No hay migraciones.

## Origen de cada dato que declara la privacidad

| Dato (RF-12) | Origen | Notas |
|---|---|---|
| Nombre publicado | `api/ranking.ts`, línea 57 | Recorta espacios y deja 40 caracteres; "Anónimo" si queda vacío |
| Identificador anónimo | `playerId()` en `src/main.ts`, líneas 64 a 67 | UUID aleatorio, creado la primera vez y guardado en el almacenamiento local |
| Puntaje, títulos, partidos con la Selección | `api/ranking.ts` (INSERT) | Solo reemplaza la fila si la carrera nueva es mejor |
| Avatar | `db/ranking.sql` | 6 valores numéricos |
| Carta | `toCard` en `api/ranking.ts` | La región y el país los elige el jugador en el formulario (`val('dept')`, `src/main.ts`) |
| Fecha de la mejor carrera | `achieved_at` en `db/ranking.sql` | |
| Datos locales | almacenamiento local en `src/main.ts` (`store` y `save`) | No hay `document.cookie` |
| Servicios externos (RF-18) | `index.html` (tipografías de Google); `src/ui/flags.ts` y `src/main.ts` (banderas de flagcdn.com) | `src/ui/ads.ts` (AdSense) solo si la variable tiene valor |

## Componentes

- `terminos.html` (nuevo): estructura y estilo de `privacidad.html`, con el contenido de RF-02 a RF-10.
- `privacidad.html` (reescrito en el mismo archivo): RF-12 a RF-19, sin AdSense.
- `vite.config.ts`: una entrada `terminos` junto a `privacidad`.
- `src/main.ts`, `footer()` (líneas 220 a 224): un enlace más, con la misma base de URL que el de privacidad. Esa función se llama en cuatro pantallas (líneas 137, 214, 397 y 639), así que un cambio cubre todas.
- Sin cambios: `api/`, `db/`, la lógica del juego y `src/ui/ads.ts`.

## Pruebas

El repo no tiene framework de pruebas y no se agrega uno, porque sería una dependencia sin necesidad. La verificación es:

- Construcción: `npm run build` termina sin errores y existe `dist/terminos.html` (CA-01).
- Búsqueda: el comando de CA-07 sobre las dos páginas.
- Navegador a 360 px y 1280 px, contraste con una herramienta en claro y en oscuro, y red revisada (CA-03 a CA-05, CA-11).
- Lectura contra el spec para el contenido (CA-06, CA-08 a CA-10, CA-13, CA-14).

Opcional: gq:e2e con el MCP de Playwright para los anchos y la red.

## Riesgos y trade-offs

- Es texto plantilla, no asesoría legal. Una persona debe revisarlo antes de publicar.
- Fusionar a main despliega a producción. Por eso la publicación espera a cerrar las aclaraciones que bloquean publicar.
- La regla de nombres no se hace cumplir en el servidor (ver spec, Conflictos). Los términos la declaran como política.
- El borrado por nombre permite que alguien pida borrar una fila ajena. Se acepta mientras no haya un identificador que el jugador pueda ver.
- Si cambia la plataforma de donación, hay que actualizar RF-19.
- Ganancia: cero dependencias y cero cambios de backend. Costo: estilos repetidos, y sin analítica no se sabrá cuánta gente abre las páginas.

## Verificación contra la constitution

No existe `.gq/constitution.md`. Se verifica contra el estándar base de gq:practices:

- El spec es la fuente de verdad. Cumple.
- Una tarea, un commit. Cumple (`tasks.md`).
- Sin dependencias nuevas. Cumple.
- Idioma: el código se nombra en inglés por estándar, pero el nombre de archivo sigue la convención del repo (`privacidad.html`). Desviación justificada: el repo existente manda sobre el default.
- Commits: estilo del repo, imperativo en español y sin prefijo tipo `feat:`. Desviación justificada por el mismo motivo.
- Validación en el borde y manejo de errores: no aplican, porque no hay entradas ni lógica nuevas.

## Seguridad (OWASP)

- A01 Control de acceso: el POST acepta cualquier UUID con formato válido, sin prueba de que venga del dispositivo dueño. Cualquiera puede crear filas sin límite. Pendiente; no se resuelve aquí.
- A03 Inyección: el nombre se escapa al pintarlo (`esc`, `src/main.ts`, líneas 35 y 36), y las consultas van parametrizadas. Pendiente: el servidor no filtra el contenido del nombre.
- A04 Diseño inseguro: reglas de nombres sin control técnico; puntaje calculado en el navegador (`api/ranking.ts`, líneas 52 y 53, lo reconoce el propio código); sin límite de tasa en el POST. Pendiente; no se resuelve aquí.
- A06 y A08: las páginas nuevas no cargan recursos de otros sitios (RNF-04). El juego sí carga tipografías y banderas de terceros; RF-18 lo declara.
- A02, A05, A07, A09 y A10: no se revisaron en esta feature. El identificador anónimo es lo más parecido a una credencial: quien lo tenga puede escribir en su fila.
- Para `/gq:audit` después de implementar: A01, A03 y A04 del ranking.

## Compuerta de publicación

Antes de fusionar a main deben estar resueltos: correo y responsable (RF-11); cómo se identifica el jugador para borrar, plazo de respuesta y plazo de conservación (RF-14, RF-16); qué registros guardan el alojamiento y la base de datos (RF-14); plataforma de donación (RF-19); variable de anuncios vacía en producción (RF-17); y revisión humana del texto.
