// Ranking global (Vercel Function + Neon). Una fila por jugador con su mejor carrera; esquema en db/ranking.sql.
// Orden: score ↓, títulos ↓, partidos con la Selección ↓, quien lo logró primero.
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOP = 50;

const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

/** Los TOP mejores más la fila del jugador si quedó afuera. Nunca devuelve player_id. */
async function ranking(playerId: string | null) {
  const rows = await sql`
    WITH r AS (
      SELECT player_id, name, score, titles, caps,
        row_number() OVER (ORDER BY score DESC, titles DESC, caps DESC, achieved_at) AS pos
      FROM ranking
    )
    SELECT pos::int, name, score, titles, caps, coalesce(player_id = ${playerId}::uuid, false) AS me
    FROM r WHERE pos <= ${TOP} OR player_id = ${playerId}::uuid
    ORDER BY pos`;
  return Response.json(rows, { headers: { 'cache-control': 'no-store' } });
}

export function GET(req: Request) {
  const id = req.headers.get('x-player-id');
  return ranking(id && UUID.test(id) ? id : null);
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  // ponytail: el puntaje se calcula en el navegador y aquí solo se validan rangos; un POST armado a mano entra.
  // Para blindarlo habría que simular la carrera en el servidor a partir de la semilla y las decisiones.
  if (!b || typeof b.id !== 'string' || !UUID.test(b.id) || !isInt(b.score, -100, 1000) || !isInt(b.titles, 0, 200) || !isInt(b.caps, 0, 500)) {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  }
  const name = [...String(b.name ?? '').replace(/\s+/g, ' ').trim()].slice(0, 40).join('') || 'Anónimo';
  // Solo reemplaza si la carrera nueva es mejor según el mismo orden del ranking; si empata, conserva la fecha vieja.
  await sql`
    INSERT INTO ranking (player_id, name, score, titles, caps)
    VALUES (${b.id}, ${name}, ${b.score}, ${b.titles}, ${b.caps})
    ON CONFLICT (player_id) DO UPDATE
      SET name = EXCLUDED.name, score = EXCLUDED.score, titles = EXCLUDED.titles, caps = EXCLUDED.caps, achieved_at = now()
      WHERE (EXCLUDED.score, EXCLUDED.titles, EXCLUDED.caps) > (ranking.score, ranking.titles, ranking.caps)`;
  return ranking(b.id);
}
