// Ranking global (Vercel Function + Neon). Una fila por jugador con su mejor carrera; esquema en db/ranking.sql.
// Orden: score ↓, títulos ↓, partidos con la Selección ↓, quien lo logró primero.
import { neon } from '@neondatabase/serverless';
import { esOfensivo } from './_nombres.js';

const sql = neon(process.env.DATABASE_URL!);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOP = 50;
// Avatar: [piel, pelo, color de pelo, barba, extra, dorsal]; máximos según las listas de src/ui/avatar.ts.
const AVATAR_MIN = [0, 0, 0, 0, 0, 1];
const AVATAR_MAX = [5, 7, 5, 4, 3, 99];

// Los 27 países jugables (src/engine/countries.ts). Se escribe aquí y no se importa: countries.ts arrastra todos los equipos.
// ponytail: copia a mano; scripts/simulate.ts comprueba que coincida con COUNTRIES.
const COUNTRY_CODES = new Set([
  'GT', 'MX', 'US', 'CR', 'HN', 'SV', 'PA', 'AR', 'BR', 'CO', 'UY', 'CL', 'PE', 'EC', 'PY', 'BO', 'VE', 'ES', 'EN', 'IT', 'DE', 'FR', 'PT', 'NL', 'JP', 'SA', 'MA',
]);

const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isAvatar = (v: unknown): v is number[] =>
  Array.isArray(v) && v.length === AVATAR_MAX.length && v.every((x, i) => isInt(x, AVATAR_MIN[i], AVATAR_MAX[i]));

/** Carta estilo FIFA armada solo con campos validados; null si algo no cuadra (la carrera se guarda igual). */
function toCard(c: any) {
  const ok = c && ['POR', 'DEF', 'MED', 'DEL'].includes(c.pos) && ['Derecho', 'Zurdo', 'Ambidiestro'].includes(c.foot)
    && isInt(c.ovr, 1, 99) && typeof c.club === 'string' && /^[a-z0-9-]{1,60}$/.test(c.club) && typeof c.dept === 'string' && c.dept.length <= 40
    && isInt(c.apps, 0, 2000) && isInt(c.goals, 0, 2000) && isInt(c.assists, 0, 2000);
  // País de la Selección que representa (el de origen si nunca cambió): uno de los 27 códigos; si falta o no está en la lista,
  // la carta se guarda sin él (se muestra como Guatemala) y la carrera no se pierde.
  const country = typeof c?.country === 'string' && COUNTRY_CODES.has(c.country) ? c.country : undefined;
  return ok ? { pos: c.pos, ovr: c.ovr, club: c.club, dept: c.dept, foot: c.foot, apps: c.apps, goals: c.goals, assists: c.assists, country } : null;
}

/** Los TOP mejores más la fila del jugador si quedó afuera. Nunca devuelve player_id. */
async function ranking(playerId: string | null) {
  const rows = await sql`
    WITH r AS (
      SELECT player_id, name, score, titles, caps, avatar, card,
        row_number() OVER (ORDER BY score DESC, titles DESC, caps DESC, achieved_at) AS pos
      FROM ranking
    )
    SELECT pos::int, name, score, titles, caps, avatar, card, coalesce(player_id = ${playerId}::uuid, false) AS me
    FROM r WHERE pos <= ${TOP} OR player_id = ${playerId}::uuid
    ORDER BY pos`;
  return Response.json(rows, { headers: { 'cache-control': 'no-store' } });
}

export async function GET(req: Request) {
  const raw = req.headers.get('x-player-id');
  const id = raw && UUID.test(raw) ? raw : null;
  // Las filas guardadas antes de que existiera el avatar lo toman del último jugador creado en ese dispositivo.
  const avatar = req.headers.get('x-player-avatar')?.split(',').map(Number);
  // Si falla, se muestra igual el ranking: completar el avatar no debe tumbar la lectura.
  if (id && isAvatar(avatar)) await sql`UPDATE ranking SET avatar = ${avatar}::smallint[] WHERE player_id = ${id} AND avatar IS NULL`.catch(() => {});
  return ranking(id);
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  // El tope de puntaje deja 25 % sobre el máximo que mide `npm run simulate` (con los premios de specs/trofeos-reales sube a unos 900).
  // ponytail: el puntaje se calcula en el navegador y aquí solo se validan rangos; un POST armado a mano entra.
  // Para blindarlo habría que simular la carrera en el servidor a partir de la semilla y las decisiones.
  if (!b || typeof b.id !== 'string' || !UUID.test(b.id) || !isInt(b.score, -100, 1200) || !isInt(b.titles, 0, 200) || !isInt(b.caps, 0, 500)) {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  }
  const name = [...String(b.name ?? '').replace(/\s+/g, ' ').trim()].slice(0, 40).join('') || 'Anónimo';
  // El mismo filtro de ofensivos de los apodos de Retos (api/_nombres.ts): terminos.html promete nombres sin ofensas en el ranking.
  if (esOfensivo(name)) return Response.json({ error: 'Nombre no permitido' }, { status: 400 });
  // Un avatar mal formado (o de una versión vieja del juego, que no lo manda) no tumba la carrera: se guarda sin avatar.
  const avatar = isAvatar(b.avatar) ? b.avatar : null;
  const card = toCard(b.card);
  // Solo reemplaza si la carrera nueva es mejor según el mismo orden del ranking; si empata, conserva la fecha vieja.
  // Copia en db/ranking.test.sql: si cambia aquí, cambiarlo allá.
  await sql`
    INSERT INTO ranking (player_id, name, score, titles, caps, avatar, card)
    VALUES (${b.id}, ${name}, ${b.score}, ${b.titles}, ${b.caps}, ${avatar}::smallint[], ${card && JSON.stringify(card)}::jsonb)
    ON CONFLICT (player_id) DO UPDATE
      SET name = EXCLUDED.name, score = EXCLUDED.score, titles = EXCLUDED.titles, caps = EXCLUDED.caps, avatar = EXCLUDED.avatar, card = EXCLUDED.card, achieved_at = now()
      WHERE (EXCLUDED.score, EXCLUDED.titles, EXCLUDED.caps) > (ranking.score, ranking.titles, ranking.caps)`;
  // Las filas guardadas antes de que existiera el avatar lo reciben en la siguiente carrera, aunque no sea mejor.
  if (avatar) await sql`UPDATE ranking SET avatar = ${avatar}::smallint[] WHERE player_id = ${b.id} AND avatar IS NULL`;
  return ranking(b.id);
}
