# Plan: Retos Fútbol en línea, ¿De dónde es?, ranking y perfil

Deriva de `spec.md` de esta carpeta. Cada `RF-nn` está cubierto en "Cobertura". Lo que ningún requisito pide no está aquí.

## Lo que se confirmó antes de diseñar (Ably, 14/10/2026)
Todo salió de la documentación pública de Ably (Context7 y las páginas indicadas). Lo que **no** se pudo confirmar se marca "a verificar" y tiene tarea.

| Dato | Fuente |
|---|---|
| Publicar desde el servidor: `POST https://main.realtime.ably.net/channels/{canal}/messages`, cuerpo JSON `{ "name", "data", "id"? }`, `Authorization: Basic base64(llave)` (equivale a `curl -u llave`), éxito **201** con `{ channel, messageId }`. Un `id` en el mensaje hace la publicación idempotente. | https://ably.com/docs/api/rest-api |
| Pedir token desde el servidor: `POST https://main.realtime.ably.net/keys/{keyName}/requestToken` con un TokenRequest **sin firmar** y autenticación Basic o por token (así lo dice la página: "Basic or token auth for unsigned"). Responde `TokenDetails { token, issued, expires, capability, keyName? }`. | https://ably.com/docs/api/rest-api |
| TokenRequest: `keyName` = `"<idApp>:<idLlave>"` (la parte de `ABLY_API_KEY` antes de `:`), `ttl` en **milisegundos** (el ejemplo lo manda como cadena `"3600000"`), `capability` como **cadena JSON** (`"{\"retos:ABC234\":[\"subscribe\"]}"`), `clientId` opcional, `timestamp` en ms (tolerancia de 2 min), `nonce` de 16 caracteres o más. Una firma `mac` (HMAC-SHA-256) solo hace falta en el TokenRequest firmado. | https://ably.com/docs/api/token-request-spec.md |
| Capacidades: mapa `canal → operaciones`; `subscribe` equivale a `message-subscribe` + `presence-subscribe` + `object-subscribe` + `annotation-subscribe`. Un token **nunca excede** a la llave: su capacidad es la **intersección** de lo pedido y lo que permite la llave; si la intersección es vacía, falla. Sin capacidad pedida, el token recibe todo lo de la llave (por eso siempre se pide explícita). Un cambio en la llave no afecta conexiones ya abiertas. | https://ably.com/docs/auth/capabilities |
| Plan gratis: **6 000 000 mensajes al mes, 200 conexiones simultáneas, 200 canales simultáneos, 500 mensajes/s**, sin tarjeta. | https://ably.com/docs/platform/pricing/free |
| Límites: mensaje de **64 KiB** (gratis y Standard), **50 mensajes/s por canal** de publicación, **50 TokenRequests/s y 60 000/hora** (gratis), **50 peticiones HTTP/s y 25 000/hora** (gratis). El tope de mensajes por mes se aplica con aviso por correo; la página no dice qué pasa exactamente al excederlo. | https://ably.com/docs/platform/pricing/limits |
| Cliente web: `ably` en su forma modular `import { BaseRealtime, WebSocketTransport, FetchRequest } from 'ably/modular'`; `new BaseRealtime({ ...opciones, plugins: { WebSocketTransport, FetchRequest } })`; autenticación por `authCallback(params, cb)` que puede devolver un `TokenDetails`, un TokenRequest firmado, una cadena de token o un JWT; el SDK la vuelve a llamar al vencer el token. | https://ably.com/docs/sdk/js/v2.0/classes/modular.BaseRealtime.html y https://ably.com/docs/sdk/js/v2.21/interfaces/ably.ClientOptions.html |
| Versión: `ably` **2.29.0** (publicada el 23/09/2026, con más de 3 semanas), la última estable en npm al escribir esto. | `npm view ably` |

**A verificar con la primera llamada real (tarea A7 y paso 6 de "Pasos para activar")**
1. Que `requestToken` sin firmar con Basic devuelva `TokenDetails` y no pida firma. **Plan B** si no: firmar el TokenRequest en el servidor con `node:crypto` (`HMAC-SHA-256`, base64, texto canónico documentado en la página del TokenRequest) y devolverlo al cliente, cuyo `authCallback` lo acepta tal cual. Ninguno de los dos caminos agrega dependencias.
2. Que `ttl` acepte número o solo cadena (mandar cadena, como en el ejemplo oficial).
3. Que `subscribe` por `ably/modular` funcione sin el plugin de presencia (la documentación lo indica; el cliente no usa presencia). Si el paquete modular no resulta más chico que el completo, se usa el completo con el mismo `import()`; el tamaño del chunk se mide en B2.
4. Cuántos mensajes cuenta Ably por publicación con 2 suscriptores. **Supuesto del plan: 3** (1 publicado y 2 entregados). Con eso, una partida típica de 100 a 300 mensajes permite entre 20 000 y 60 000 partidas al mes en el plan gratis.

**Techos que el plan acepta y documenta (no se resuelven con código)**: 200 conexiones y 200 canales = unas **100 salas a la vez**; 25 000 publicaciones HTTP por hora (unas 7 por segundo); 6 M de mensajes al mes. Pasar de ahí es subir de plan de Ably. Quien solo abre un link no se conecta hasta unirse.

## Arquitectura en una vista
```
Navegador A ──HTTP──► /api/sala (jugar, vencer, ...) ──► motor puro ──► Neon (estado + versión)
Navegador B ──HTTP──►        │                                  │
      ▲                      └── tras guardar: publicar ───────►│ Ably REST (host fijo)
      │                                                          ▼
      └──WebSocket (solo suscribir, token de 1 canal, solo lectura)── Ably ◄── evento "estado" {v, sala pública}
```
- **Una sola verdad**: la fila de la sala en Neon, con un número de `version`. Cada transición es "leer, calcular con el motor puro, guardar si la versión no cambió".
- **El evento es el estado completo público**, no un delta. Un cliente que se reconecta, o que se pierde un evento, se corrige con el siguiente o con un `GET`. La publicación a Ably es de mejor esfuerzo: si falla, el estado ya está guardado.
- **El servidor no confía en el cliente** para nada: ni reloj, ni turno, ni puntos, ni respuesta correcta.

## Identidad y datos

### Una identidad por dispositivo
- `id`: el UUID que ya existe en `localStorage` (`chamusqueros:id`), el del ranking de carreras. Se reutiliza para tener **un único perfil por dispositivo**.
- `token`: 32 bytes aleatorios (`crypto.getRandomValues`), en base64url (43 caracteres), nuevo en `localStorage` (`chamusqueros:retos-token`). Se crea la primera vez que se guarda el perfil.
- Cada petición del cliente lleva `x-jugador-id: <uuid>` y `authorization: Bearer <token>`. El servidor guarda **`sha256(token)`** y compara en tiempo constante (`timingSafeEqual`). El token nunca va en la URL ni en un cuerpo, ni se registra.
- **El `id` no es secreto en el ranking de carreras** (cualquiera que lo conozca podría reemplazar esa fila: `POST /api/ranking` no pide token). Por eso **el `id` nunca sale del servidor**: no está en ninguna respuesta ni evento (A01). Los jugadores se refieren entre sí por índice 0 o 1 y por perfil público.
- Primera vez: `PUT /api/perfil` con un `id` que no existe **reclama** esa fila con el token enviado. Si el `id` ya existe con otro token: 403. (Riesgo aceptado: quien conozca el UUID de alguien que nunca creó perfil podría reclamarlo antes; el UUID no se publica en ningún lado.)

### Esquema: `db/retos-en-linea.sql`
Mismo estilo que `db/ranking.sql` (tabuladores, mayúsculas, encabezado con el comando de aplicación). `CREATE ... IF NOT EXISTS`.
```sql
-- Retos en línea: perfil + ranking de Retos, salas y partidas cerradas.
-- Aplicar con: psql "$DATABASE_URL_UNPOOLED" -f db/retos-en-linea.sql
CREATE TABLE IF NOT EXISTS retos_jugadores (
	id uuid PRIMARY KEY,                       -- el mismo del ranking de carreras; nunca sale del servidor
	token_hash bytea NOT NULL,                 -- sha256 del token del dispositivo
	apodo text NOT NULL CHECK (char_length(apodo) BETWEEN 2 AND 20),
	avatar smallint[],                         -- [piel, pelo, color, barba, extra, dorsal]
	club text,                                 -- id de ALL_CLUBS
	seleccion text,                            -- código de COUNTRIES (27)
	puntos int NOT NULL DEFAULT 0,
	jugadas int NOT NULL DEFAULT 0,
	victorias int NOT NULL DEFAULT 0,
	empates int NOT NULL DEFAULT 0,
	derrotas int NOT NULL DEFAULT 0,
	racha_tipo char(1) CHECK (racha_tipo IN ('V', 'E', 'D')),
	racha_n int NOT NULL DEFAULT 0,
	mejor_racha_v int NOT NULL DEFAULT 0,
	llegada_at timestamptz,                    -- cuándo llegó a su puntaje actual (desempate)
	creado_at timestamptz NOT NULL DEFAULT now(),
	editado_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS retos_jugadores_ranking ON retos_jugadores (puntos DESC, victorias DESC, llegada_at) WHERE puntos > 0;

CREATE TABLE IF NOT EXISTS retos_salas (
	codigo text PRIMARY KEY CHECK (codigo ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$'),
	creador uuid NOT NULL,                     -- para el límite de salas por hora
	estado jsonb NOT NULL,                     -- SalaInterna (con ids y respuestas): no sale del servidor
	version int NOT NULL DEFAULT 1,            -- control de concurrencia: ver "Transiciones"
	creado_at timestamptz NOT NULL DEFAULT now(),
	actualizado_at timestamptz NOT NULL DEFAULT now()   -- la sala vence a los 30 min de esto
);
CREATE INDEX IF NOT EXISTS retos_salas_creador ON retos_salas (creador, creado_at);

CREATE TABLE IF NOT EXISTS retos_partidas (    -- una fila por partida cerrada; evita sumar dos veces y alimenta el anti-abuso
	sala text NOT NULL,
	num int NOT NULL,                          -- 1, 2, ... por revancha
	a uuid NOT NULL,
	b uuid NOT NULL,
	par text GENERATED ALWAYS AS (least(a::text, b::text) || '|' || greatest(a::text, b::text)) STORED,
	puntos_a int NOT NULL,
	puntos_b int NOT NULL,
	cerrada_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (sala, num)
);
CREATE INDEX IF NOT EXISTS retos_partidas_par ON retos_partidas (par, cerrada_at);
CREATE INDEX IF NOT EXISTS retos_partidas_a ON retos_partidas (a, cerrada_at);
CREATE INDEX IF NOT EXISTS retos_partidas_b ON retos_partidas (b, cerrada_at);
```
- `retos_partidas` solo guarda partidas que cumplieron el mínimo (las que cuentan para el factor por rival y el tope diario). Una partida que no cumple no deja fila.
- **Retención**: las filas de `retos_partidas` de más de 30 días y las salas de más de 1 hora se borran de forma perezosa al crear una sala (`DELETE ... WHERE`), sin tarea programada.
- `db/retos-en-linea.test.sql`: igual que `db/en-vivo.test.sql` (transacción con tablas temporales, `ASSERT`, `ROLLBACK`). Prueba: el cierre atómico solo gana una vez, la racha (V, V, E, D, V), el orden del ranking y el desempate, y el tope de las ventanas de 24 h.

### Transiciones: concurrencia
```sql
UPDATE retos_salas SET estado = $nuevo, version = version + 1, actualizado_at = now()
WHERE codigo = $codigo AND version = $vista RETURNING version;
```
Si no devuelve fila, otro la cambió: se relee y se **reintenta hasta 3 veces** recalculando con el motor (la acción puede haber dejado de aplicar y entonces se responde el estado actual). Dos celulares que piden `vencer` a la vez producen **una** transición. El cierre de una partida que suma puntos va en **una sola sentencia con CTE**: `UPDATE` de la sala (con la condición de versión) → `INSERT` en `retos_partidas ... ON CONFLICT DO NOTHING` → `UPDATE` de los dos jugadores solo `FROM` la fila insertada. Si la versión no coincide o la partida ya existe, no cambia nada y los puntos no se suman dos veces.

## Archivos y dueños

| Archivo | Dueño | Nota |
|---|---|---|
| `src/retos/online/protocolo.ts` | **T0** (idéntico en A, B, C y D) | El contrato (abajo). Solo tipos y constantes. |
| `src/retos/trivia-puro.ts` | **T0** | Se **mueve** aquí, sin cambiarla, la lógica pura de `src/retos/trivia.ts` (`barajar`, `repartir`, `ganador`, `muerteSubita`, `resultadoDuelo`, `anunciosPendientes`, `crearControl`, constantes y tipos) y `trivia.ts` la reexporta. Motivo: `trivia.ts` hace `import banco from './preguntas.json'`, así que todo lo que lo importe arrastra el banco al modo en línea. El servidor y los pintores en línea importan `trivia-puro.ts`, nunca `trivia.ts`. `scripts/trivia.test.ts` pasa sin cambios. |
| `src/retos/comun.ts`, `pingpong.ts`, `trivia.ts`, `ui-pingpong.ts`, `preguntas.json`, `api/_retos.ts` | **congelados** | Nadie los edita; A, B y C los importan. Única excepción: el movimiento de `trivia.ts` a `trivia-puro.ts` en T0. (`pingpong.ts` ya es puro y se importa tal cual.) |
| `src/retos/dedonde.ts` | **C** (T0 deja un stub con las firmas) | Lógica pura de "¿De dónde es?", compartida por local y servidor. |
| `src/retos/selecciones.ts` | C | Selecciones con confederación y QID de país (para el banco y las opciones). |
| `src/retos/futbolistas.json`, `scripts/futbolistas.ts`, `scripts/futbolistas.test.ts`, `scripts/dedonde.test.ts` | C | Banco, generador y verificador, pruebas. |
| `src/retos/ui-dedonde.ts`, `src/retos/dedonde.css` | C | Pantalla local (`jugarDeDonde`) y pintor en línea (`montarDeDonde`). |
| `src/retos/online/motor.ts` | A | Máquina de estados pura de sala y partida. |
| `src/retos/online/puntos.ts` | A | Fórmula pura de puntos de ranking. |
| `api/sala.ts`, `api/perfil.ts`, `api/ably-token.ts`, `api/retos-ranking.ts` | A | Cuatro funciones nuevas (con las 4 actuales, 8 en total: el plan Hobby de Vercel limita las funciones por despliegue; **a verificar** el tope vigente en la primera vista previa). |
| `api/_bd.ts`, `api/_auth.ts`, `api/_limite.ts`, `api/_ably.ts`, `api/_nombres.ts`, `api/_ids.ts`, `api/_bancos.ts`, `api/_verificar.ts` | A | Módulos de apoyo (con `_` no son rutas). |
| `api/futbolista.ts` | A | Solo se **extrae** `verificar` y su caché a `api/_verificar.ts`; el comportamiento y `scripts/futbolista.test.ts` no cambian. |
| `db/retos-en-linea.sql`, `db/retos-en-linea.test.sql`, `.env.example` | A | |
| `scripts/*.test.ts` del servidor y `scripts/fixtures/neon-falso.ts` | A | Pruebas sin red. |
| `src/retos/online/transporte.ts`, `cliente.ts`, `ui-sala.ts`, `ui-ping.ts`, `ui-preguntas.ts`, `ui-ranking.ts` | B | Cliente en línea. |
| `src/retos/index.ts`, `src/retos/retos.css` | B | **B es el único que edita `index.ts`**: entrada "mismo celular / en línea", "¿De dónde es?" local (usa la salida de C), ranking, perfil (usa la salida de D) y el destino al abrir (`montarRetos(app, alSalir, destino?)`). |
| `package.json`, `package-lock.json` | B | **Solo B** instala `ably` (`npm install --save-exact ably@2.29.0`). |
| `src/ui/avatar-editor.ts`, `src/perfil/cliente.ts`, `src/perfil/index.ts`, `src/perfil/perfil.css` | D | Perfil. |
| `src/main.ts` | D | **Solo D**: enlaces del Home, `?sala=`, extracción del editor de avatar y precarga del formulario de carrera. |
| `privacidad.html`, `terminos.html` | D | Textos legales. |
| `specs/retos-futbol/spec.md`, `specs/home-landing/spec.md` | D | Solo las cifras de "Conflictos con specs anteriores". |

**Regla de merge**: cada archivo tiene un solo dueño. Los archivos creados por T0 (`protocolo.ts` y los stubs) los reemplaza su dueño y **gana el de su dueño**. `protocolo.ts` no se edita en las ramas: si el contrato debe cambiar, se cambia **aquí primero** y se avisa a los cuatro.

## Contrato A↔B↔C↔D

### `src/retos/online/protocolo.ts` (T0 lo copia sin cambios)
```ts
// Contrato entre servidor (A), cliente en línea (B), ¿De dónde es? (C) y perfil (D). Idéntico en las cuatro ramas.
// Solo tipos y constantes: sin red, sin importar nada de la app. Si cambia, cambia primero specs/retos-en-linea/plan.md.

// ---------- Constantes ----------
export const CODIGO_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;   // 31 caracteres, sin 0 O 1 I L
export const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const canal = (codigo: string) => `retos:${codigo}`;        // un canal por sala
export const EVENTO = 'estado';                                    // el único evento del canal
export const SALA_VIDA_MS = 30 * 60_000;

// ---------- Tipos base ----------
export type Indice = 0 | 1;
export type Categoria = 'pais' | 'club' | 'preguntas' | 'dedonde';
export type Modo = 'completo' | Categoria;                          // 'completo' = país, club, preguntas
export interface Config { modo: Modo; ref: string | null }          // ref: código de país o id de club; null = al azar
/** [piel, pelo, color de pelo, barba, extra, dorsal]: el mismo código del ranking de carreras (api/ranking.ts). */
export type AvatarCodigo = [number, number, number, number, number, number];

// ---------- Perfil ----------
export interface PerfilPublico { apodo: string; avatar: AvatarCodigo | null; club: string | null; seleccion: string | null }
export interface PerfilEdicion { apodo: string; avatar: AvatarCodigo; club: string | null; seleccion: string | null }
export type TipoRacha = 'V' | 'E' | 'D';
export interface Estadisticas {
  jugadas: number; victorias: number; empates: number; derrotas: number;
  rachaTipo: TipoRacha | null; rachaN: number; mejorRachaV: number;
  puntos: number; posicion: number | null;                         // null mientras tenga 0 puntos
}
export interface MejorCarrera { score: number; titles: number; caps: number }
export interface PerfilCompleto extends PerfilPublico { estadisticas: Estadisticas; mejorCarrera: MejorCarrera | null }

// ---------- Estado público de una sala (lo que viaja por el canal y por las respuestas) ----------
export type FaseSala = 'lobby' | 'jugando' | 'entre' | 'fin' | 'cerrada';   // 'entre': marcador entre categorías del Reto completo
export type MotivoSinPuntos = 'corta' | 'repetida' | 'tope';

export interface SalaPublica {
  codigo: string;
  v: number;                       // versión: el cliente se queda con la mayor que vio
  ahora: number;                   // reloj del servidor (ms) al armar esta vista: para corregir el reloj del cliente
  vence: number;                   // ms: cuándo vence la sala por inactividad
  fase: FaseSala;
  config: Config;
  jugadores: PerfilPublico[];      // [0] anfitrión; largo 1 o 2. Nunca lleva identificadores.
  partida: PartidaPublica | null;
  revancha: [boolean, boolean];    // quién ya aceptó la revancha
  salio: Indice | null;            // quién salió de la sala o abandonó
}
export interface PartidaPublica {
  num: number;                     // 1; sube con cada revancha
  categorias: Categoria[];         // 1, o 3 en el Reto completo
  actual: number;                  // índice en `categorias` de la que se juega
  resultados: ResultadoCategoria[];
  juego: JuegoPublico | null;      // null en 'entre' y 'fin'
  entreDeadline: number | null;    // ms del servidor: cuándo arranca la siguiente categoría (fase 'entre')
  final: FinalPublico | null;      // solo en fase 'fin'
}
export interface ResultadoCategoria { categoria: Categoria; ganador: Indice | null; puntos: [number, number]; motivo: string }
export interface FinalPublico {
  ganador: Indice | null; motivo: string; abandono: Indice | null;
  rankingGanado: [number, number];                       // puntos de ranking que sumó cada uno (0 si no sumó)
  sinPuntos: [MotivoSinPuntos | null, MotivoSinPuntos | null];
}

export interface JugadaPing { jugador: Indice; nombre: string; sinVerificar: boolean; apelacion: boolean }
export interface PingPublico {
  cat: 'pais' | 'club'; ref: string;
  fase: 'turno' | 'verificando' | 'rechazado' | 'decide';   // rechazado: la fuente dijo que no; decide: el rival decide
  turno: Indice;                                            // de quién es el turno, y en 'decide' quién escribió
  texto: string | null;                                     // lo escrito (desde 'verificando')
  porFuente: boolean;                                       // en 'decide': true = la fuente falló; false = apelación
  deadline: number;                                         // ms del servidor
  jugadas: JugadaPing[];                                    // los aceptados, en orden (sin identificadores de la fuente)
}
export interface PreguntasPublico {
  cat: 'preguntas'; fase: 'pregunta' | 'revelado';
  n: number; total: number; subita: boolean;
  pregunta: string; opciones: string[];
  respondio: [boolean, boolean];                            // solo si ya respondió, nunca qué eligió
  aciertos: [number, number];                               // de las preguntas ya cerradas
  deadline: number;
  revelado: { correcta: number; elegida: [number | null, number | null] } | null;   // solo en 'revelado'
}
export interface DeDondePublico {
  cat: 'dedonde'; fase: 'ronda' | 'revelado';
  n: number; extra: boolean;
  nombre: string;                                           // el futbolista
  opciones: string[];                                       // 4 nombres de selección (clave de FLAG_CODE, en español)
  respondio: [boolean, boolean];
  puntos: [number, number]; meta: number;
  deadline: number;
  revelado: { correcta: number; elegida: [number | null, number | null]; ganado: [number, number] } | null;
}
export type JuegoPublico = PingPublico | PreguntasPublico | DeDondePublico;

// ---------- Evento del canal (servidor → clientes) ----------
export interface EventoCanal { v: number; sala: SalaPublica }      // name: EVENTO; data: este objeto

// ---------- Acciones del jugador ----------
export type Accion =
  | { t: 'texto'; texto: string }            // ping pong: el futbolista que escribe
  | { t: 'apelar'; apelar: boolean }         // ping pong, tras 'rechazado': apelar o aceptar la derrota
  | { t: 'decidir'; vale: boolean }          // ping pong, el rival decide (falla de la fuente o apelación)
  | { t: 'responder'; opcion: number };      // preguntas y ¿De dónde es?: 0 a 3

// ---------- HTTP ----------
// Todas las peticiones con identidad llevan:  x-jugador-id: <uuid>   y   authorization: Bearer <token>
export type CodigoError =
  | 'entrada_invalida' | 'apodo_rechazado' | 'sin_credencial' | 'sin_perfil' | 'no_miembro'
  | 'sala_inexistente' | 'sala_vencida' | 'sala_llena' | 'mismo_dispositivo' | 'no_anfitrion'
  | 'fase_incorrecta' | 'fuera_de_turno' | 'aun_no' | 'conflicto' | 'limite'
  | 'en_linea_no_disponible' | 'error';
export interface ErrorApi { error: CodigoError; mensaje?: string; faltanMs?: number }

// GET /api/sala                      → InfoEnLinea                                   (sin identidad)
export interface InfoEnLinea { enLinea: boolean }
// GET /api/sala?codigo=C             → RespuestaSala si es de la sala; PreviaSala si no lo es
export interface PreviaSala { previa: true; llena: boolean; anfitrion: string }
// POST /api/sala   (cuerpo: PeticionSala)  → RespuestaSala
export type PeticionSala =
  | { accion: 'crear' }
  | { accion: 'unirse'; codigo: string }
  | { accion: 'configurar'; codigo: string; config: Config }       // solo el anfitrión, en el lobby
  | { accion: 'empezar'; codigo: string }                          // solo el anfitrión, con 2 jugadores
  | { accion: 'jugar'; codigo: string; jugada: Accion }
  | { accion: 'vencer'; codigo: string; v: number }                // v: la versión que el cliente vio vencida
  | { accion: 'revancha'; codigo: string }
  | { accion: 'salir'; codigo: string };
export interface RespuestaSala { sala: SalaPublica; yo: Indice; link?: string }   // link: solo al crear

// POST /api/ably-token  (cuerpo: { codigo })  → RespuestaToken   (503 en_linea_no_disponible si no hay llave)
export interface TokenAbly { token: string; issued: number; expires: number; capability: string }
export type RespuestaToken = TokenAbly | { dev: true };   // con EN_LINEA_DEV=1 el servidor responde { dev: true } y el cliente usa el transporte de sondeo

// GET /api/perfil                    → PerfilCompleto        (404 sin_perfil)
// PUT /api/perfil  (cuerpo: PerfilEdicion) → PerfilCompleto  (201 al crear, 200 al editar; 403 si el id es de otro token)

// GET /api/retos-ranking             → RankingRetos          (la identidad es opcional: sin ella, `yo` es null)
export interface FilaRankingRetos { pos: number; apodo: string; avatar: AvatarCodigo | null; puntos: number; victorias: number; yo: boolean }
export interface RankingRetos { top: FilaRankingRetos[]; yo: FilaRankingRetos | null }

// ---------- Transporte en tiempo real (cliente) ----------
export type EstadoConexion = 'conectado' | 'reconectando' | 'caido';
export interface Transporte {
  /** Se suscribe al canal; devuelve la función que cancela. El estado de la conexión se avisa aparte. */
  suscribir(canal: string, alEvento: (e: EventoCanal) => void, alConexion?: (c: EstadoConexion) => void): Promise<() => void>;
}

// ---------- Pintor de una categoría en línea (B lo llama; B pinta ping y preguntas, C pinta ¿De dónde es?) ----------
export interface CtxJuego {
  yo: Indice; jugadores: PerfilPublico[];
  ahora(): number;                           // reloj del servidor estimado: Date.now() + desfase
  enviar(a: Accion): Promise<void>;          // POST jugar; los errores los muestra B
  vencer(): void;                            // pide cerrar el plazo vigente (el servidor decide si ya venció)
}
export interface JuegoMontado<J extends JuegoPublico> { actualizar(j: J): void; detener(): void }
export type MontarJuego<J extends JuegoPublico> = (host: HTMLElement, juego: J, ctx: CtxJuego) => JuegoMontado<J>;
```

### Códigos HTTP
`400` `entrada_invalida` / `apodo_rechazado` · `401` `sin_credencial` · `403` `no_miembro` / `no_anfitrion` / token ajeno al `id` · `404` `sin_perfil` / `sala_inexistente` · `409` `sala_llena` / `mismo_dispositivo` / `fase_incorrecta` / `fuera_de_turno` / `aun_no` (con `faltanMs`) / `conflicto` (tras 3 reintentos) · `410` `sala_vencida` · `429` `limite` (con `retry-after`) · `503` `en_linea_no_disponible`. Todas las respuestas: JSON, `cache-control: no-store`, `x-content-type-options: nosniff`, sin CORS. Cuerpos de más de 2 KB: 400.

### Quién hace qué en cada acción (servidor)
| Acción | Quién puede | Efecto |
|---|---|---|
| `crear` | cualquiera con perfil | Crea la sala con el apodo del perfil como anfitrión; devuelve `link`. 5 salas por hora por dispositivo (cuenta en Neon). |
| `unirse` | con perfil, no miembro | Entra como jugador 1. `sala_llena`, `mismo_dispositivo`, `sala_vencida`. Si ya es miembro, devuelve su sala (reconexión). |
| `configurar` / `empezar` | anfitrión, `lobby` | Cambia `config`; empieza solo con 2 jugadores. |
| `jugar` | miembro, y solo la acción que la fase espera de **ese** jugador | Valida con el motor; puede disparar la verificación en Wikidata (ping pong). |
| `vencer` | miembro | Siempre anota que el miembro sigue conectado (RF-09). Solo transiciona si `v` es la versión actual **y** `ahora ≥ deadline`; si no, devuelve el estado actual (`aun_no` solo si `v` coincide y el plazo no llegó). |
| `revancha` | miembro, `fin` | Marca su aceptación; con las dos, arranca la partida siguiente. |
| `salir` | miembro | En `lobby`: sale (si es el anfitrión, la sala pasa a `cerrada`). En partida: abandono. En `fin`: marca `salio`. |

## Ably: `api/_ably.ts` y `api/ably-token.ts`
- `disponible()`: `ABLY_API_KEY` presente con forma `idApp.idLlave:secreto`, o `EN_LINEA_DEV=1`. `GET /api/sala` sin código responde `{ enLinea: disponible() }`.
- `publicar(codigo, evento)`: `fetch('https://main.realtime.ably.net/channels/' + encodeURIComponent(canal(codigo)) + '/messages', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(3000), headers: Basic + json, body: { name: EVENTO, data: evento, id: codigo + ':' + v } })`. El `id` hace la publicación idempotente. Éxito = 201. Un fallo se registra (solo código) y **no** falla la jugada. Host fijo; nada del usuario decide la URL (A10). En modo dev, no hace nada.
- `api/ably-token.ts`: valida identidad y que el dispositivo sea miembro de la sala `codigo`; llama `POST https://main.realtime.ably.net/keys/{keyName}/requestToken` con Basic y el TokenRequest `{ keyName, ttl: "900000", capability: JSON.stringify({ [canal(codigo)]: ['subscribe'] }), timestamp: Date.now(), nonce: <16 bytes hex> }`. **Sin `clientId`** (no se filtra identidad). Devuelve el `TokenDetails` tal cual. Vida de **15 min**; el cliente lo renueva por `authCallback`, que repite esta comprobación de membresía, así un jugador que sale deja de renovar. 30 por hora por dispositivo.
- Plan B documentado arriba si el TokenRequest sin firmar no funciona.

## Motor puro: `src/retos/online/motor.ts` (A)
Sin DOM, sin red, sin `Date.now()` ni `Math.random()`: recibe el reloj y el azar como parámetros. Se prueba con `tsx`.
```ts
interface Entorno { ahora: number; azar: () => number; bancos: { preguntas: PreguntaBanco[]; futbolistas: Futbolista[] } }
type Resultado = { ok: true; sala: SalaInterna; efectos: Efecto[] } | { ok: false; error: CodigoError; faltanMs?: number }
type Efecto = { t: 'verificar'; texto: string; tipo: 'pais' | 'club'; id: string } | { t: 'cierre'; cierre: CierrePartida }
crearSala(codigo, anfitrion: Miembro, env): SalaInterna
aplicar(sala: SalaInterna, quien: Indice, peticion: PeticionSala | { accion: 'verificado'; resultado: Verificacion | 'fuente_falla' }, env): Resultado
vistaPublica(sala: SalaInterna, ahora: number): SalaPublica   // quita ids, respuestas correctas y lo que eligió el rival
```
- `SalaInterna` (lo que se guarda en `estado`): `miembros: { id, perfil }[]`, `config`, `fase`, `partida` con el detalle interno (respuestas correctas, QID de los futbolistas ya dichos, plazos, **`inactivos: [n, n]`** = plazos seguidos sin ninguna petición del jugador, y `visto: [plazo, plazo]`), `revancha`, `salio`, `num`.
- **Fases del ping pong** (RF-12): `turno` (15 s) → `verificando` (plazo de 6 s, mientras el servidor consulta a la fuente) → resultado: **acepta** (siguiente turno), **repetido** (pierde el autor, sin apelación), **no cumple** → `rechazado` (10 s: el autor apela o acepta la derrota; sin respuesta, pierde) → `decide` (20 s, el rival; sin respuesta, **vale**), **falla de la fuente** → `decide` directo con `porFuente`. Si la función muere a mitad de la verificación, `vencer` tras los 6 s lo trata como falla de la fuente. Texto repetido sin identidad: por texto normalizado (reusa `claveTexto`, `evaluar`, `validarEntrada` de `pingpong.ts`).
- **Preguntas** (RF-13): una pregunta por vez para ambos; dificultades 1, 1, 2, 2, 3; cierra cuando ambos respondieron o vence (20 s) → `revelado` (3 s) → siguiente; empate → muerte súbita de hasta 3 rondas (preguntas medias nuevas). Reusa `barajar`, `muerteSubita`, `resultadoDuelo` de `trivia-puro.ts` (lógica pura, sin DOM ni banco). El servidor elige **una** pregunta por ronda para ambos (la repartición local da una distinta a cada uno; en línea no).
- **¿De dónde es?** (RF-17 a RF-20): usa `src/retos/dedonde.ts` de C (`opcionesRonda`, `puntosRonda`, `cerrarRonda`, `elegirFutbolista`). Una ronda para ambos; cierra cuando ambos respondieron o vence (12 s) → `revelado` (3 s) → siguiente o fin. Tiempo de respuesta = `ahora de recepción − inicio de la ronda`, en el servidor.
- **Reto completo**: país → club → preguntas, abre 0, 1, 0; entre categorías, fase `entre` con `entreDeadline` (6 s); termina al ganar 2 o al jugar las 3 (`marcadorCompleto`, `abre`).
- **Abandono** (RF-09): la señal de que alguien sigue ahí es **cualquier petición autenticada suya**, sea `jugar` o `vencer`, transicione o no (el cliente de quien está conectado llama a `vencer` al llegar su reloj a 0; el desconectado no). Regla: cada petición de un miembro `i` pone `inactivos[i] = 0` y anota `visto[i] = plazo vigente`; al cerrarse un plazo, `inactivos[i]` sube **solo si `i` no hizo ninguna petición desde que ese plazo empezó**. Con 2, abandona. Así **no responder una pregunta (jugada legítima, cuenta como incorrecta) no es abandono**. El endpoint anota la actividad antes de decidir si hay transición, así que una petición `vencer` con `v` vieja también cuenta. Esto exige que el cliente llame a `vencer` siempre que su reloj llegue a 0, también cuando ya respondió. `salir` en partida abandona de inmediato. El rival gana. **No se usa presencia de Ably** (Decisiones).
- **Revancha**: en `fin`, `revancha[i] = true`; con las dos, `num++`, nuevo sorteo, `abre` alterna. `salir` en `fin` marca `salio` y cancela la revancha.
- **`cierre`** (efecto al pasar a `fin`): `{ num, categorias, ganador, abandono, rendimiento: [n, n], jugadasValidas, ids: [string, string] }`. El endpoint lo convierte en puntos con `puntos.ts` y estadísticas (abajo).
- **Vencimiento de la sala** (30 min) no es del motor: lo evalúa el endpoint contra `actualizado_at`.

## Puntos de ranking: `src/retos/online/puntos.ts` (A)
Pura. Los números de RF-24 son constantes exportadas.
```ts
export const RES = { V: 100, E: 30, D: 10 } as const;
export const POR_ACIERTO = { ping: 5, preguntas: 5 } as const;   export const TOPE = { ping: 50, preguntas: 50, dedonde: 60 } as const;
export const MIN = { ping: 4, preguntas: 3, dedonde: 3 } as const;   // futbolistas aceptados en total / preguntas cerradas / rondas cerradas
export const FACTOR = [1, 0.5, 0.25, 0] as const;                     // por partidas previas válidas contra el mismo rival en 24 h
export const TOPE_DIARIO = 600;
puntosRanking(e: { resultado: 'V' | 'E' | 'D' | 'A'; rendimiento: number; cumpleMinimo: boolean; previasRival24h: number; sumado24h: number }): { puntos: number; sinPuntos: MotivoSinPuntos | null }
```
Orden: sin mínimo → 0 `corta`; `A` (abandona él) → 0; `base = RES[resultado] + rendimiento`; `× FACTOR[min(previas, 3)]` con `floor`; si el factor da 0 → `repetida`; `min(…, TOPE_DIARIO − sumado24h)` (si queda 0 → `tope`). El rendimiento de cada categoría ya viene con su tope aplicado (en el Reto completo se suman las categorías jugadas). Ejemplos de CA-10 como pruebas.

**Estadísticas y racha** (RF-28): se actualizan en la misma sentencia de cierre cuando `puntos > 0`, o cuando el jugador abandona (derrota propia). `racha_n = CASE WHEN racha_tipo = nuevo THEN racha_n + 1 ELSE 1 END`; `mejor_racha_v = GREATEST(mejor_racha_v, nueva racha si es 'V')`. `llegada_at = now()` solo si `puntos` cambió.

**Anti-abuso, resumen**: mismo dispositivo no entra dos veces (RF-05); mínimo de jugadas; factor por rival 100/50/25/0 %; tope diario de 600; salas por hora; límites por IP. **Riesgo residual aceptado** en la spec (A04): otro navegador o incógnito = otro dispositivo.

## Endpoints (A)
Todos son `export async function GET/POST/PUT(req: Request)` como `api/ranking.ts`, con `neon(process.env.DATABASE_URL!)` en `api/_bd.ts`, que expone funciones con nombre (`leerSala`, `guardarSala`, `cerrarPartida`, `leerPerfil`, …) para que las pruebas las reconozcan por su SQL.

- **Auth (`api/_auth.ts`)**: lee `x-jugador-id` (UUID) y `authorization`; calcula el hash y lo compara con `token_hash`. `identificar(req)` → `{ id } | ErrorApi`. Nunca registra el token.
- **Límites (`api/_limite.ts`)**: ventana fija en memoria por clave (dispositivo o IP), con el mismo patrón y los mismos topes de memoria que `futbolista.ts` (de mejor esfuerzo; la regla global es una regla de Rate Limiting del Firewall de Vercel, tarea del usuario). Valores: `jugar` 30/min por dispositivo; `vencer` 60/min; `GET sala` 120/min por dispositivo; `GET sala` de no miembro 20/min por IP; `unirse` 20/min por IP; `crear` 10/hora por IP más **5/hora por dispositivo contadas en Neon**; `PUT perfil` 10/min por dispositivo y 30/hora por IP; `ably-token` 30/hora por dispositivo; `retos-ranking` 60/min por IP. Todas devuelven 429 con `retry-after`.
- **`api/sala.ts`**:
  - `GET` sin `codigo` → `InfoEnLinea`.
  - `GET ?codigo=` → valida con `CODIGO_RE`; lee; si venció (`actualizado_at + 30 min`) → 410; si el dispositivo es miembro → `RespuestaSala` (la reconexión y el sondeo); si no → `PreviaSala` (`llena`, apodo del anfitrión) con el límite por IP.
  - `POST` → valida el cuerpo (`PeticionSala`), identifica, aplica el motor con el bucle de versión (3 intentos), ejecuta los efectos (verificación en Wikidata con `api/_verificar.ts`, y el cierre), guarda, **publica** y responde `RespuestaSala`. La verificación **no** retiene la fila: primero se guarda `verificando`, se publica, se consulta a la fuente (tope de 4 s ya existente) y se aplica `verificado` con la misma regla de versión.
  - `crear`: borra de forma perezosa lo viejo (retención arriba), genera el código con `crypto.getRandomValues` sobre `ALFABETO_CODIGO` y **reintenta si existe en `retos_salas` o en `retos_partidas`** (esta última retiene 30 días: un código reciclado con el mismo `num` haría que `ON CONFLICT DO NOTHING` perdiera los puntos en silencio), y arma `link = SITE_URL + '/?sala=' + codigo` con `SITE_URL` de entorno (por defecto `https://chamusqueros.vercel.app`; **no** del encabezado `Host`).
- **`api/_verificar.ts`**: se extrae de `futbolista.ts` la función `verificar` con `FalloWikidata`, `llamar`, la caché en memoria y el tope de llamadas salientes (150/min por instancia). `futbolista.ts` queda con la validación de entrada, el límite por IP y la respuesta HTTP; **el módulo compartido conserva el único host (`https://www.wikidata.org/w/api.php`), `redirect: 'error'` y los plazos**. `scripts/futbolista.test.ts` debe pasar sin cambios. El ping pong en línea llama `verificar(...)` directo (sin salir a HTTP propio) y usa el mismo mapa de `api/_retos.ts`.
- **`api/_bancos.ts`**: importa `src/retos/preguntas.json` y `src/retos/futbolistas.json` para el servidor. Si el runtime pide atributo de importación (`with { type: 'json' }`), se usa; **plan B** si no resuelve en la vista previa: `readFileSync` con las rutas incluidas por `includeFiles` en un `vercel.json` mínimo. A verificar en la primera vista previa (riesgo 1).
- **`api/_nombres.ts`**: `validarApodo(texto)` → `{ ok: true, apodo } | { ok: false, motivo }`. Normaliza NFC, colapsa espacios, 2 a 20 caracteres, `^[\p{L}\p{N} '.\-]+$`, al menos 2 letras. Rechaza **datos personales** (`@`, `http`, `www`, `.com`, 7 o más dígitos en total) y **ofensivos**: se normaliza una copia (minúsculas, sin tildes, `0→o 1→i 3→e 4→a 5→s 7→t`, sin signos, letras repetidas colapsadas) y se busca cada raíz de una lista corta y estática (`OFENSIVAS`, unas 30, que escribe el orquestador y revisa el usuario; Aclaración 5). Se prueba con las entradas de CA-13. **Riesgo residual**: es un filtro básico, con falsos negativos (variantes raras) y algún falso positivo; se documenta y se puede ampliar sin tocar la lógica.
- **`api/_ids.ts`**: `CLUB_IDS` (los 1.042 ids de `ALL_CLUBS`) y `COUNTRY_CODES` (los 27), escritos a mano como en `api/ranking.ts`; `scripts/perfil.test.ts` comprueba que coincidan con `ALL_CLUBS` y `COUNTRIES` (si no, falla), igual que `scripts/simulate.ts` hace con los países.
- **`api/perfil.ts`**: `GET` devuelve el perfil con las estadísticas, la posición (`row_number() OVER (ORDER BY puntos DESC, victorias DESC, llegada_at)`, null con 0 puntos) y `mejorCarrera` leyendo `ranking` (`SELECT score, titles, caps FROM ranking WHERE player_id = $id`, solo lectura). `PUT` valida **todo** (apodo con `validarApodo`; `avatar` con los rangos de `api/ranking.ts`; `club` contra `CLUB_IDS` o `null`; `seleccion` contra `COUNTRY_CODES` o `null`; ningún campo extra), y hace el `INSERT ... ON CONFLICT (id) DO UPDATE ... WHERE retos_jugadores.token_hash = EXCLUDED.token_hash`; si el conflicto no actualizó ninguna fila, el token es ajeno → 403. No modifica nunca las estadísticas.
- **`api/retos-ranking.ts`**: `WITH r AS (SELECT id, apodo, avatar, puntos, victorias, row_number() OVER (...) AS pos FROM retos_jugadores WHERE puntos > 0) SELECT ... WHERE pos <= 50 OR id = $yo`. La respuesta no incluye `id`; `yo` se marca comparando en el servidor. Misma estructura que `ranking()` de `api/ranking.ts`.

## ¿De dónde es?: banco, lógica y UI (C)

### Lógica pura: `src/retos/dedonde.ts`
Compartida por la UI local, el motor y el servidor. Sin DOM al importar.
```ts
export const META = 500, PLAZO_MS = 12_000, BASE = 100, BONUS_MAX = 50, MAX_RONDAS = 25, EXTRAS_MAX = 3;
export interface Futbolista { q: string; nombre: string; sel: string }     // sel: clave de FLAG_CODE (nombre del país en español)
export interface Marcador { puntos: [number, number]; rondas: number; extras: number }
/** 0 si falló o no respondió (tardoMs null) o tardó más de PLAZO_MS; si no, BASE + floor(BONUS_MAX × (PLAZO_MS − tardoMs) / PLAZO_MS). */
export function puntosRonda(acerto: boolean, tardoMs: number | null): number
/** 4 opciones barajadas: la selección correcta y 3 de su confederación (de las marcadas `plausible`), sin repetir. */
export function opcionesRonda(f: Futbolista, azar: () => number): { opciones: string[]; correcta: number }
/** Un futbolista del banco que no esté en `usados` (por `q`). */
export function elegirFutbolista(banco: readonly Futbolista[], usados: ReadonlySet<string>, azar: () => number): Futbolista
/** Suma los puntos de la ronda y decide: seguir, o fin con ganador/empate (regla de RF-19). */
export function cerrarRonda(m: Marcador, ganado: readonly [number, number]): { marcador: Marcador; fin: null | { ganador: Indice | null; motivo: 'meta' | 'tope_rondas' | 'empate_extras' } }
```
`cerrarRonda`: suma y `rondas + 1`; es *terminable* si alguien tiene `≥ META` o `rondas ≥ MAX_RONDAS`; si es terminable y los puntos difieren, gana el mayor; si es terminable y empatan, `extras + 1` y sigue, salvo que `extras` ya valga `EXTRAS_MAX`, que es empate. (CA-7 como pruebas.)

### Selecciones: `src/retos/selecciones.ts`
`SELECCIONES: Record<string, { confed: Confed; pais: string /* QID de "país para el deporte" (P1532) */; plausible: boolean }>`, con las claves de `FLAG_CODE` (`src/ui/flags.ts`) que sean selecciones mayores (≈ 100). `confed` usa el tipo `Confed` de `src/engine/countries.ts` (`import type`: no arrastra datos). `plausible` marca las ~60 selecciones que sirven de distractor (se excluyen micro-estados como Andorra o San Marino, fáciles de descartar). El script y las pruebas comprueban que cada clave tenga bandera.

### Banco: `src/retos/futbolistas.json` y `scripts/futbolistas.ts`
Forma de cada entrada: `{ "q": "Q615", "nombre": "Lionel Messi", "sel": "Argentina" }`. Mismo estilo que `scripts/preguntas.ts`:
1. **Generar** (`--generar`): consulta SPARQL con **cadenas fijas** (nada del usuario) a Wikidata: humanos con ocupación `Q937857` (futbolista de asociación) y exactamente un valor de P1532 que sea un país de `SELECCIONES`, ordenados por número de enlaces a Wikipedias (`wikibase:sitelinks`). El umbral de fama se **calibra** por confederación hasta cumplir los mínimos de RF-22 (CONCACAF y CAF necesitan umbral más bajo que UEFA); Guatemala entra con el umbral que dé jugadores con datos suficientes, y si no los hay se informa y no se inventa.
2. **Descartar ambiguos**: más de una selección mayor (P54 a selecciones nacionales distintas), P1532 que contradice la selección en P54, sin etiqueta en español o inglés, nombre con caracteres fuera de lo seguro para mostrar. Recorta por confederación para que ninguna pase del 45 %.
3. **Verificar** (`--verificar`): cada `q` se **vuelve a leer** con `wbgetentities` y debe ser humano, futbolista, con esa selección **como único valor**; sin repetidos; entre 400 y 800; mínimos de RF-22; toda `sel` en `SELECCIONES` y con bandera. Escribe el JSON **solo si todo pasa**; deja un informe de conteos por confederación.
4. **Revisión humana** de 30 al azar contra Wikidata/Wikipedia: **compuerta de publicación** (CA-9), la hace el usuario.
- Fuente: Wikidata, CC0. Tamaño estimado del JSON: ≈ 35 KB para 600 entradas; solo lo cargan el modo local de ¿De dónde es? (import dinámico) y el servidor.

### UI (C): `src/retos/ui-dedonde.ts`, `src/retos/dedonde.css`
- `jugarDeDonde: JugarReto` (tipo de `comun.ts`): local, por turnos. Pantalla de relevo (como `ui-pingpong.ts`), reloj de 12 s en `performance.now()`, nombre del futbolista como `<h1>`/texto, 4 botones de opción con bandera (`FLAG_CODE`, imagen decorativa con `alt=""`) y nombre, resultado del turno (✓/✗ con texto), marcador. La ronda se cierra cuando juegan los dos; `cerrarRonda`. `onFin` recibe `{ ganador, puntos: [pts, pts] }`. Lee el banco con `import('./futbolistas.json')`.
- `montarDeDonde: MontarJuego<DeDondePublico>`: el pintor en línea, **sin cargar el banco**; recibe todo del estado público (nombre, opciones, plazos). Reloj con `ctx.ahora()` y `ctx.vencer()` al cumplirse el plazo. Anuncios del reloj a lectores de pantalla en 10 s, 5 s y 0 (reusa `anunciosPendientes` de `trivia-puro.ts`).
- Todo con `h()`/`textContent`; sin `innerHTML`.

## Cliente en línea (B)
- **`transporte.ts`**: implementa `Transporte` de `protocolo.ts`.
  - `transporteAbly()`: `const { BaseRealtime, WebSocketTransport, FetchRequest } = await import('ably/modular')`; `new BaseRealtime({ authCallback, plugins: { WebSocketTransport, FetchRequest } })`; `authCallback` hace `POST /api/ably-token` con la identidad y devuelve el `TokenDetails`; `channels.get(canal)` y `subscribe(EVENTO, m => alEvento(m.data))`; el estado de la conexión (`connected`, `disconnected`/`connecting`, `failed`) se traduce a `EstadoConexion`. Cancelar = `unsubscribe` y cerrar la conexión si ya no quedan canales. Sin presencia, sin publicar.
  - `transporteSondeo(intervaloMs)`: `GET /api/sala?codigo=` cada 3 s y emite el evento si la versión subió. Sirve de **implementación de desarrollo sin llave** (`EN_LINEA_DEV=1`), y B puede usarlo de respaldo si la conexión no se establece en 8 s (opcional, B8).
  - `transporteFalso()`: expone `emitir(evento)` para pruebas con `tsx`.
- **`cliente.ts`**: funciones tipadas con `protocolo.ts` (`infoEnLinea`, `crearSala`, `unirse`, `configurar`, `empezar`, `jugar`, `vencer`, `revancha`, `salir`, `estadoSala`, `ranking`), la identidad (`id` y `token` de `localStorage`, con `try/catch` en cada acceso), el desfase de reloj (`ahora() = Date.now() + (sala.ahora − Date.now() al recibir)`) y el manejo de `429` y `410`. Se queda con la `v` más alta: ignora eventos con `v` menor o igual.
- **Flujo**: Retos → "Retar a alguien en línea" (solo si `infoEnLinea()` dice que sí) → si no hay perfil, pide apodo (RF-31; el avatar parte al azar) → "Crear sala" → pantalla con código, link, **Compartir** (`navigator.share` si existe, con `try/catch` por cancelación) y **Copiar enlace** (`navigator.clipboard`, con respaldo de seleccionar el texto) → lobby. Con `?sala=`: `main.ts` (D) llama `montarRetos(app, alSalir, { sala })`; si hay perfil, `unirse`; si no, pide apodo y luego `unirse`. Una sala conocida en `localStorage` (`chamusqueros:sala`, solo el código, sin secreto) se reabre sola (RF-08) con `estadoSala`.
- **Seguridad de la red**: el cliente acepta un evento solo si tiene la forma de `EventoCanal` (comprobación mínima de tipos antes de pintarlo).
- **Pintores**: B escribe `ui-ping.ts` y `ui-preguntas.ts` (`MontarJuego<PingPublico>` y `MontarJuego<PreguntasPublico>`) reutilizando CSS (`retos.css`, `trivia.css`) y textos donde sirva, e importando lo puro solo de `trivia-puro.ts` y `pingpong.ts` (nunca `trivia.ts`); C entrega `montarDeDonde`. B elige el pintor por `juego.cat`.
- **El modo en línea no importa `preguntas.json` ni `futbolistas.json`**, ni directa ni transitivamente: no importa `trivia.ts` (que carga el banco) sino `trivia-puro.ts`. Hoy `src/retos/index.ts` ejecuta `void import('./trivia')` al abrir Retos (el prefetch de RF-33 de `retos-futbol`); B7 lo mueve a la rama "Jugar en el mismo celular", para que abrir Retos o entrar en línea no descargue el banco. Una prueba recorre el grafo de imports de `src/retos/online/`, `ui-ping.ts`, `ui-preguntas.ts` y `montarDeDonde` buscando `preguntas.json`, `futbolistas.json` y `trivia.ts`.
- **Ranking de Retos** (`ui-ranking.ts`): `ranking()`; tabla con avatar (`avatarSVG` con `NT_KIT`), apodo, puntos y victorias; la fila propia resaltada y, si quedó fuera, después de "…". Accesible desde Retos y, vía D, desde el Home.

## Perfil (D)
- **`src/ui/avatar-editor.ts`**: se **extrae** de `createForm` en `src/main.ts` (HTML de `.avatar-editor`, `swatches`, `cycler`, la lógica de `sync/paint` y "Avatar al azar") a funciones reutilizables (`montarEditorAvatar(contenedor, avatar, alCambiar)`), **sin cambiar** el HTML que genera. `createForm` pasa a usarlo. Prueba de regresión: el HTML del formulario antes y después es idéntico (CA-14).
- **`src/perfil/cliente.ts`**: `GET/PUT /api/perfil` con la identidad de B (`cliente.ts`; si D va antes, usa la misma clave de `localStorage` y la misma función de cabeceras definida en el contrato: `x-jugador-id` y `authorization`). Guarda una copia del perfil en `localStorage` (`chamusqueros:perfil`, **sin token**) para precargar el formulario de carrera sin red.
- **`src/perfil/index.ts`**: `montarPerfil(app, alSalir)`. Secciones: apodo (con el motivo del rechazo del servidor), editor de avatar, **club favorito** (campo de búsqueda sobre `ALL_CLUBS` por nombre o ciudad, lista de resultados con escudo `/escudos/<id>.png` o el dibujado, máximo 30 resultados, y "Sin club"), **selección favorita** (`<select>` de los 27 países con bandera), estadísticas (partidas, V/E/D, racha actual y mejor racha de victorias, puntos y posición, mejor carrera), la leyenda de RF-28 y el aviso de RF-32. "Guardar" hace `PUT`. Funciona sin Ably.
- **`src/main.ts`**: (1) dos enlaces `.link` en la sección "Retos Fútbol": "Mi perfil ›" y "Ranking de Retos ›", con `data-go="perfil"` y `data-go="ranking-retos"`; (2) el manejador abre `import('./perfil/index')` o `import('./retos/index')` con destino `'ranking'`; (3) al arrancar, si la URL trae `?sala=XXXXXX` válido, abre Retos con `{ sala }`; (4) `createForm` se precarga desde `chamusqueros:perfil` (RF-30: avatar siempre; nombre solo si el campo viene vacío). Cambios mínimos en `home()`, `createForm()` y el arranque; sin `import` estáticos nuevos pesados.

## Legal (D)
- `privacidad.html`: nueva sección "Retos en línea y perfil": qué se guarda y para qué (apodo, avatar, club y selección favoritos, identificador anónimo del dispositivo y su verificador secreto —guardado como huella, nunca el token—, estadísticas y puntos, contenido de cada sala mientras dura: jugadas, nombres de futbolistas, respuestas); quién lo procesa (Vercel, Neon y **Ably**, proveedor de tiempo real: recibe la dirección IP y los datos de conexión del navegador, y los mensajes de la sala, que solo contienen el estado público); cuánto (las salas se borran a las pocas horas; el perfil y el ranking mientras existan o hasta pedir el borrado); cómo pedir el borrado (correo, con el apodo, igual que la fila del ranking). Corrige la frase de que los nombres "no salen de tu dispositivo": aplica al modo local. Aclara que el modo local no envía nada.
- `terminos.html`: reglas del ranking de Retos (puntos solo de partidas en línea, calculados por el servidor; factor por rival y tope diario; mínimo de jugadas; el derecho de ajustar, borrar o reiniciar puntos), conducta (no jugar contra uno mismo con otros dispositivos, no usar apodos ofensivos ni datos personales, no abusar del servicio), disponibilidad "tal cual" del modo en línea.

## Seguridad (OWASP Top 10): mecanismos
| Riesgo | Cómo se cumple |
|---|---|
| **A01** | Toda acción pasa por `identificar()` (id + token) y `esMiembro(sala, id)`; el motor valida que la fase espere esa acción **de ese jugador**; `configurar` y `empezar` exigen anfitrión. `vistaPublica` es el **único** camino de salida (evento y respuestas), y una prueba recorre 1.000 partidas buscando el índice de la correcta, los QID, los ids y el token en cada payload. `TokenAbly`: capacidad `["subscribe"]` sobre `retos:CODIGO` y nada más; se emite solo a miembros. Los ids de dispositivo no salen del servidor (ranking de carreras no tiene token). |
| **A02 / A05** | `ABLY_API_KEY` solo en Vercel (Production y Preview) y `.env.local` (ya ignorado por git; se verifica); se agrega `ABLY_API_KEY=` y `SITE_URL=` **vacíos** a `.env.example`. La llave de la app en Ably se **restringe** a `retos:*` con `publish` y `subscribe` (límite de daño si se filtra). Token de dispositivo: hash sha256, `timingSafeEqual`. Cabeceras: `nosniff`, `no-store`, sin CORS, errores genéricos. |
| **A03** | Validación de cada campo antes de usarlo (tipos, largos, alfabetos, rangos, listas cerradas; cuerpos ≤ 2 KB; sin campos extra); SQL solo con plantillas parametrizadas de `neon` (nada concatenado); `CODIGO_RE` antes de cualquier consulta; el texto del futbolista sigue la ruta ya probada de `futbolista.ts` (alfabeto cerrado, entre comillas, sin SPARQL); el cliente muestra todo con `h()`/`textContent`. |
| **A04** | Límites por dispositivo e IP (tabla de `api/_limite.ts`) y los durables en Neon (salas por hora, tope diario); mínimos, factor por rival, bloqueo del mismo dispositivo; fuerza bruta de códigos: 31^6 combinaciones, 20 intentos/min por IP en `GET` de no miembros, y un código acertado solo muestra "llena" y el apodo del anfitrión. Riesgos residuales en la spec. |
| **A06** | `ably` 2.29.0 **exacta** (sin `^`) y `package-lock.json`; solo en el chunk del modo en línea; `npm audit` en el cierre. |
| **A07** | Token de 256 bits de `crypto.getRandomValues`, nunca en URL ni registros, guardado como hash; código de sala aleatorio con `crypto.getRandomValues`. |
| **A08** | Todo cálculo es del servidor (motor, plazos, puntos, estadísticas); cierre atómico y único (CTE + `PRIMARY KEY (sala, num)`); bancos versionados y verificados por script. |
| **A09** | Los `console.error` llevan solo código de error y nombre de la acción; ninguna prueba ni código imprime cabeceras, cuerpos de Ably ni tokens (una prueba busca `console.` junto a `token`/`authorization`). |
| **A10** | Dos hosts fijos: `https://main.realtime.ably.net/...` y `https://www.wikidata.org/w/api.php`; `redirect: 'error'`; plazos; el único dato variable es el nombre del canal, que sale de `CODIGO_RE`. Una prueba verifica que toda llamada saliente empiece por uno de esos dos prefijos. |

## Cobertura (RF → dónde)
| RF | Dónde |
|---|---|
| 01, 02 | B (`index.ts`, `infoEnLinea`), C (opción local), `GET /api/sala` |
| 03, 04, 05, 06 | `api/sala.ts` (`crear`, `unirse`, `configurar`, `empezar`), motor (lobby), `ui-sala.ts` |
| 07 | `actualizado_at` + `sala_vencida` en `api/sala.ts` |
| 08 | `cliente.ts` (sala en `localStorage`), `GET ?codigo=`, `unirse` idempotente, `vistaPublica` con `ahora` |
| 09 | motor (`inactivos`, `salir`), `ui-sala.ts` |
| 10 | motor (`revancha`, `num`), `ui-sala.ts` |
| 11, 14 | motor + `vencer` (`deadline`, versión) |
| 12 | motor (fases del ping pong), `api/_verificar.ts`, `ui-ping.ts` |
| 13 | motor (preguntas), `vistaPublica`, `ui-preguntas.ts` |
| 15, 16 | `FinalPublico`, `puntos.ts`, `EstadoConexion`, `transporte.ts` |
| 17, 18, 19 | `dedonde.ts` |
| 20 | motor (ronda simultánea) y `ui-dedonde.ts` (local por turnos) |
| 21 | motor / `ui-dedonde.ts` |
| 22 | `scripts/futbolistas.ts`, `futbolistas.json` |
| 23, 24 | `puntos.ts`, `cerrarPartida` (SQL), `api/sala.ts` |
| 25 | `api/retos-ranking.ts`, `ui-ranking.ts`, enlace en `main.ts` |
| 26, 27, 28 | `api/perfil.ts`, `api/_nombres.ts`, `src/perfil/index.ts` |
| 29 | `ui-sala.ts` (lobby), pintores, `ui-ranking.ts`, perfil |
| 30 | `src/main.ts` (`createForm`) + `avatar-editor.ts` |
| 31 | `cliente.ts` y flujo de B |
| 32 | `src/perfil/index.ts` |
| 33, 34 | todos los `ui-*`, `retos.css`, `dedonde.css`, `perfil.css` |
| 35 | imports dinámicos; prueba de peso (CA-17) |
| 36 | `privacidad.html`, `terminos.html` |
| 37 | `disponible()` |

## Pruebas (todas sin red)
Se corren con `npx tsx scripts/<archivo>.ts`.
- **Puras**: `scripts/motor.test.ts` (fases, plazos con reloj inyectado, abandono, revancha, Reto completo, `vistaPublica` sin secretos, 1.000 partidas), `scripts/puntos.test.ts` (CA-10 y CA-11), `scripts/dedonde.test.ts` (CA-7), `scripts/nombres.test.ts` (CA-13), `scripts/futbolistas.test.ts` (verificador contra un JSON sintético).
- **Endpoints con `fetch` falso** (estilo `scripts/ranking.test.ts`, que despacha por el texto de la consulta): `scripts/fixtures/neon-falso.ts` (una base en memoria que reconoce las consultas de `api/_bd.ts` y respeta la condición de versión), Ably falso (registra las llamadas, responde 201 y un `TokenDetails`) y Wikidata falso (reusa el modelado de `scripts/futbolista.test.ts`). Casos: CA-1, CA-2, CA-3, CA-4, CA-5, CA-6, CA-8, CA-11, CA-12, CA-13, CA-18; todas las llamadas salientes empiezan por los dos prefijos permitidos; dos `vencer` simultáneos dan una transición; el cierre suma una vez.
- **Cliente**: `scripts/transporte.test.ts` con `transporteFalso` (ignora versiones viejas, reconexión) y la búsqueda de cadenas prohibidas en `src/retos/` (`innerHTML`, `preguntas.json`/`futbolistas.json` en el modo en línea).
- **SQL**: `db/retos-en-linea.test.sql` (el CTE de cierre, rachas, orden, ventanas) corre a mano contra una rama de Neon.
- **Navegador** (manual, CA-15): dos navegadores en 360×640, 360×320 y 1280×800, claro y oscuro.
- **Regresión**: `scripts/futbolista.test.ts`, `retos.test.ts`, `trivia.test.ts`, `ranking.test.ts`, `en-vivo.test.ts` pasan sin cambios; `npm run build` y el peso (CA-17).

## Pasos para activar (los hace el usuario)
1. Crear la cuenta en https://ably.com (plan gratis, sin tarjeta) y una **app** (por ejemplo "chamusqueros").
2. En la app, abrir "API Keys", crear o editar una llave y limitarla a los canales `retos:*` con las capacidades **`publish`** y **`subscribe`** (nada más). Copiar la llave completa con la forma `idApp.idLlave:secreto`.
3. Guardarla en Vercel, para Production y Preview: `vercel env add ABLY_API_KEY production` y `vercel env add ABLY_API_KEY preview`. Opcional: `vercel env add SITE_URL production` si el dominio no es `https://chamusqueros.vercel.app`.
4. Para trabajar en local: `vercel env pull .env.local` (o copiar la llave a `.env.local`; ya está fuera de git) y correr `vercel dev`. Sin llave, `EN_LINEA_DEV=1` en `.env.local` usa el transporte de sondeo.
5. **Migración SQL en Neon**: `psql "$DATABASE_URL_UNPOOLED" -f db/retos-en-linea.sql` (idempotente). Opcional en una rama de Neon: `psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f db/retos-en-linea.test.sql`.
6. Redesplegar y comprobar: `vercel curl /api/sala` debe responder `{"enLinea":true}`; crear una sala y abrir el link en un segundo navegador. Aquí se confirman los puntos "a verificar" de Ably (token sin firmar, `ttl`, modular).
7. **Antes de publicar**: la revisión humana de 30 futbolistas del banco (CA-9) y de 30 preguntas (la de `retos-futbol`, si sigue pendiente), y revisar la lista `OFENSIVAS`.
8. Opcional: regla de Rate Limiting del Firewall de Vercel para `/api/sala` (por ejemplo, 120 por minuto por IP): el tope global que los límites en memoria no dan.

Sin llave configurada (o con `ABLY_API_KEY` vacía): `GET /api/sala` responde `{ enLinea: false }`, `/api/ably-token` responde 503 `en_linea_no_disponible` y la UI oculta la opción (RF-01, RF-37).

## Riesgos
1. **Importar `src/` desde `api/`** (motor, `dedonde.ts`, `pingpong.ts`, bancos JSON): hoy `api/` solo importa de `api/`. Se usan extensiones `.js` como ya hace `futbolista.ts`; el JSON puede pedir atributo de importación. Se prueba en la **primera vista previa de Vercel** (tarea A14). Plan B: mover la lógica pura compartida a `api/_compartido/` y que `src/` la importe desde ahí (como `src/retos/pingpong.ts` ya importa `api/_retos`).
2. **Tope de funciones del plan de Vercel**: 8 con las nuevas; a verificar el límite vigente. Plan B: unir `perfil` y `retos-ranking` en una sola función con `?recurso=`.
3. **Latencia de Neon** (HTTP): cada jugada hace al menos una lectura y una escritura; en ping pong, además la verificación (hasta 4 s). Los plazos incluyen margen (verificando 6 s; el reloj del turno se detiene mientras se verifica, igual que en local). Medir en la vista previa.
4. **Ably**: techos de 200 conexiones, 25 000 publicaciones HTTP por hora, 6 M de mensajes al mes (arriba). Si se supera, el servicio se degrada (aviso de Ably por correo); la UI muestra "Reconectando"/"Reintentar".
5. **Reloj y latencia**: el bonus de ¿De dónde es? mide en el servidor; un celular lento pierde algo de bonus. Aceptado.
6. **Dos `vencer` y una jugada en el mismo instante**: ganan por orden de llegada a Neon; la versión evita dobles efectos. Probado en CA-5.
7. **Un jugador puede perder por abandono** si su conexión cae dos plazos seguidos (riesgo 4 de A04 aceptado).
8. **Filtro de apodos** y **abuso con varios dispositivos**: residuales aceptados en la spec.
9. **Desactualización de `api/_ids.ts`** frente a `ALL_CLUBS`: la prueba lo detecta.
10. **Peso**: el chunk de `ably` se mide en B2; si el modular no ayuda, se usa el completo, solo en el modo en línea.

## Coordinación con otras ramas
- Las ramas en paralelo sobre premios y tienda tocan `src/engine/`, `src/ui/` y `db/`: este plan **sí** toca `src/ui/` (solo `avatar-editor.ts`, nuevo, y `main.ts` por D) y agrega archivos nuevos en `db/`; no edita `db/ranking.sql`, `api/ranking.ts` ni `src/engine/`.
- `src/main.ts` es el punto caliente (D): los cambios son mínimos y localizados en `home()`, `createForm()` y el arranque; si otra rama lo toca, se resuelve con el merge de esas funciones, no del archivo.
- Conflicto de cifras con `specs/retos-futbol` CA-1 y con `specs/home-landing` (elementos con `data-go`): D las actualiza.
