// Acceso a Neon de Retos en línea (A03): funciones con nombre sobre `neon()`, todo parametrizado (nada se arma con texto del usuario).
// Cada consulta empieza con un comentario `/* nombre */`: las pruebas (scripts/fixtures/neon-falso.ts) la reconocen por esa etiqueta.
// El reloj entra como parámetro (ms): así lo controlan las pruebas y todo usa la misma hora. Esquema en db/retos-en-linea.sql.
// Copia en db/retos-en-linea.test.sql de cerrarPartida, historial y rankingRetos: si cambian aquí, cambiarlas allá.
import { neon } from '@neondatabase/serverless';

let conexion: ReturnType<typeof neon> | undefined;
type Fila = Record<string, any>;
/** Perezosa: sin DATABASE_URL (o sin llave de Ably) lo que no necesita base de datos sigue funcionando. */
const sql = (s: TemplateStringsArray, ...v: unknown[]) => (conexion ??= neon(process.env.DATABASE_URL!))(s, ...v) as Promise<Fila[]>;

export interface FilaPerfil {
  apodo: string; avatar: number[] | null; club: string | null; seleccion: string | null;
  puntos: number; jugadas: number; victorias: number; empates: number; derrotas: number;
  racha_tipo: 'V' | 'E' | 'D' | null; racha_n: number; mejor_racha_v: number; posicion: number | null;
}
export interface FilaSala { estado: unknown; version: number; actualizado: number }
export interface FilaRanking { pos: number; apodo: string; avatar: number[] | null; puntos: number; victorias: number; yo: boolean }
export interface Cierre {
  codigo: string; estado: unknown; vista: number; ahora: number; num: number; a: string; b: string;
  puntosA: number; puntosB: number; valida: boolean; resA: 'V' | 'E' | 'D'; resB: 'V' | 'E' | 'D'; cuentaA: boolean; cuentaB: boolean;
}

// ---------- Perfil ----------

/** sha256 del token guardado para ese dispositivo (hex), o null si no hay perfil. */
export async function hashDe(id: string): Promise<string | null> {
  const r = await sql`/* hashDe */ SELECT encode(token_hash, 'hex') AS th FROM retos_jugadores WHERE id = ${id}::uuid`;
  return (r[0]?.th as string | undefined) ?? null;
}

export async function leerPerfil(id: string): Promise<FilaPerfil | null> {
  const r = await sql`/* leerPerfil */
    WITH r AS (
      SELECT id, row_number() OVER (ORDER BY puntos DESC, victorias DESC, llegada_at) AS pos FROM retos_jugadores WHERE puntos > 0
    )
    SELECT j.apodo, j.avatar, j.club, j.seleccion, j.puntos, j.jugadas, j.victorias, j.empates, j.derrotas, j.racha_tipo, j.racha_n, j.mejor_racha_v,
      (SELECT pos::int FROM r WHERE r.id = j.id) AS posicion
    FROM retos_jugadores j WHERE j.id = ${id}::uuid`;
  return (r[0] as FilaPerfil | undefined) ?? null;
}

/** Crea el perfil (reclama el id con ese token) o lo edita si el token es el mismo. null = el id es de otro token. Nunca toca las estadísticas. */
export async function guardarPerfil(id: string, hashHex: string, p: { apodo: string; avatar: number[]; club: string | null; seleccion: string | null }): Promise<{ creado: boolean } | null> {
  const r = await sql`/* guardarPerfil */
    INSERT INTO retos_jugadores (id, token_hash, apodo, avatar, club, seleccion)
    VALUES (${id}::uuid, decode(${hashHex}, 'hex'), ${p.apodo}, ${p.avatar}::smallint[], ${p.club}, ${p.seleccion})
    ON CONFLICT (id) DO UPDATE
      SET apodo = EXCLUDED.apodo, avatar = EXCLUDED.avatar, club = EXCLUDED.club, seleccion = EXCLUDED.seleccion, editado_at = now()
      WHERE retos_jugadores.token_hash = EXCLUDED.token_hash
    RETURNING (xmax = 0) AS creado`;
  return r[0] ? { creado: !!r[0].creado } : null;
}

/** La mejor carrera de ese dispositivo en el ranking de carreras (solo lectura). */
export async function mejorCarrera(id: string): Promise<{ score: number; titles: number; caps: number } | null> {
  const r = await sql`/* mejorCarrera */ SELECT score, titles, caps FROM ranking WHERE player_id = ${id}::uuid`;
  return (r[0] as { score: number; titles: number; caps: number } | undefined) ?? null;
}

/** Los 50 primeros y, aparte, la fila propia si quedó fuera. Nunca devuelve ids. */
export async function rankingRetos(yo: string | null, tope = 50): Promise<FilaRanking[]> {
  const r = await sql`/* rankingRetos */
    WITH r AS (
      SELECT id, apodo, avatar, puntos, victorias, row_number() OVER (ORDER BY puntos DESC, victorias DESC, llegada_at) AS pos
      FROM retos_jugadores WHERE puntos > 0
    )
    SELECT pos::int, apodo, avatar, puntos, victorias, coalesce(id = ${yo}::uuid, false) AS yo
    FROM r WHERE pos <= ${tope}::int OR id = ${yo}::uuid ORDER BY pos`;
  return r as FilaRanking[];
}

// ---------- Salas ----------

export async function leerSala(codigo: string): Promise<FilaSala | null> {
  const r = await sql`/* leerSala */
    SELECT estado, version, (extract(epoch FROM actualizado_at) * 1000)::double precision AS actualizado FROM retos_salas WHERE codigo = ${codigo}`;
  return (r[0] as FilaSala | undefined) ?? null;
}

/** Crea la sala. false si el código ya existe en retos_salas o en retos_partidas (un código reciclado con el mismo `num` haría perder los puntos). */
export async function crearSala(codigo: string, creador: string, estado: unknown, ahora: number): Promise<boolean> {
  const r = await sql`/* crearSala */
    INSERT INTO retos_salas (codigo, creador, estado, creado_at, actualizado_at)
    SELECT ${codigo}, ${creador}::uuid, ${JSON.stringify(estado)}::jsonb, to_timestamp(${ahora}::double precision / 1000), to_timestamp(${ahora}::double precision / 1000)
    WHERE NOT EXISTS (SELECT 1 FROM retos_partidas WHERE sala = ${codigo})
    ON CONFLICT DO NOTHING RETURNING version`;
  return r.length > 0;
}

/** Salas que ese dispositivo creó desde `desde` (ms): el límite de 5 por hora. ponytail: contar y crear no son atómicos; un par de salas de más no importa. */
export async function contarSalas(creador: string, desde: number): Promise<number> {
  const r = await sql`/* contarSalas */ SELECT count(*)::int AS n FROM retos_salas WHERE creador = ${creador}::uuid AND creado_at > to_timestamp(${desde}::double precision / 1000)`;
  return Number(r[0]?.n ?? 0);
}

/** Guarda solo si la sala sigue en la versión que se leyó; devuelve la versión nueva o null (otro la cambió). */
export async function guardarSala(codigo: string, estado: unknown, vista: number, ahora: number): Promise<number | null> {
  const r = await sql`/* guardarSala */
    UPDATE retos_salas SET estado = ${JSON.stringify(estado)}::jsonb, version = version + 1, actualizado_at = to_timestamp(${ahora}::double precision / 1000)
    WHERE codigo = ${codigo} AND version = ${vista}::int RETURNING version`;
  return r[0] ? Number(r[0].version) : null;
}

/** Cierre atómico: guarda la sala (si la versión coincide), anota la partida (una sola vez) y actualiza las estadísticas de los dos, todo en UNA sentencia.
 *  Devuelve la versión nueva, o null si la versión ya no coincidía o la partida ya estaba anotada (entonces no se suma nada). */
export async function cerrarPartida(c: Cierre): Promise<number | null> {
  const r = await sql`/* cerrarPartida */
    WITH s AS (
      UPDATE retos_salas SET estado = ${JSON.stringify(c.estado)}::jsonb, version = version + 1, actualizado_at = to_timestamp(${c.ahora}::double precision / 1000)
      WHERE codigo = ${c.codigo} AND version = ${c.vista}::int RETURNING version
    ), p AS (
      INSERT INTO retos_partidas (sala, num, a, b, puntos_a, puntos_b, valida, cerrada_at)
      SELECT ${c.codigo}, ${c.num}::int, ${c.a}::uuid, ${c.b}::uuid, ${c.puntosA}::int, ${c.puntosB}::int, ${c.valida}::boolean, to_timestamp(${c.ahora}::double precision / 1000) FROM s
      ON CONFLICT DO NOTHING RETURNING 1
    ), ju AS (
      UPDATE retos_jugadores j SET
        puntos = j.puntos + x.pts,
        jugadas = j.jugadas + 1,
        victorias = j.victorias + (x.r = 'V')::int,
        empates = j.empates + (x.r = 'E')::int,
        derrotas = j.derrotas + (x.r = 'D')::int,
        racha_n = CASE WHEN j.racha_tipo = x.r THEN j.racha_n + 1 ELSE 1 END,
        mejor_racha_v = GREATEST(j.mejor_racha_v, CASE WHEN x.r = 'V' THEN CASE WHEN j.racha_tipo = 'V' THEN j.racha_n + 1 ELSE 1 END ELSE 0 END),
        racha_tipo = x.r,
        llegada_at = CASE WHEN x.pts > 0 THEN to_timestamp(${c.ahora}::double precision / 1000) ELSE j.llegada_at END
      FROM (VALUES (${c.a}::uuid, ${c.resA}::text, ${c.puntosA}::int, ${c.cuentaA}::boolean), (${c.b}::uuid, ${c.resB}::text, ${c.puntosB}::int, ${c.cuentaB}::boolean)) AS x(id, r, pts, cuenta)
      WHERE j.id = x.id AND x.cuenta AND EXISTS (SELECT 1 FROM p) RETURNING 1
    )
    SELECT (SELECT version FROM s) AS version, (SELECT count(*) FROM p)::int AS cerrada`;
  return r[0]?.cerrada ? Number(r[0].version) : null;
}

/** Partidas válidas previas entre los dos y puntos ya sumados por cada uno desde `desde` (ms). */
export async function historial(a: string, b: string, desde: number): Promise<{ previas: number; sumaA: number; sumaB: number }> {
  const r = await sql`/* historial */
    SELECT (count(*) FILTER (WHERE par = least(${a}::text, ${b}::text) || '|' || greatest(${a}::text, ${b}::text) AND valida))::int AS previas,
      coalesce(sum(CASE WHEN a = ${a}::uuid THEN puntos_a WHEN b = ${a}::uuid THEN puntos_b END), 0)::int AS suma_a,
      coalesce(sum(CASE WHEN a = ${b}::uuid THEN puntos_a WHEN b = ${b}::uuid THEN puntos_b END), 0)::int AS suma_b
    FROM retos_partidas WHERE cerrada_at > to_timestamp(${desde}::double precision / 1000) AND (a IN (${a}::uuid, ${b}::uuid) OR b IN (${a}::uuid, ${b}::uuid))`;
  return { previas: Number(r[0]?.previas ?? 0), sumaA: Number(r[0]?.suma_a ?? 0), sumaB: Number(r[0]?.suma_b ?? 0) };
}

/** Retención perezosa al crear una sala: salas de más de 1 hora sin actividad y partidas de más de 30 días. */
export async function limpiar(ahora: number): Promise<void> {
  await sql`/* limpiar */
    WITH s AS (DELETE FROM retos_salas WHERE actualizado_at < to_timestamp(${ahora - 3600_000}::double precision / 1000) RETURNING 1)
    DELETE FROM retos_partidas WHERE cerrada_at < to_timestamp(${ahora - 30 * 24 * 3600_000}::double precision / 1000)`;
}
