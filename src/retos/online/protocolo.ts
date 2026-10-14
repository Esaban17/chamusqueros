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
