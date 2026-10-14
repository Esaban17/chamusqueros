-- Prueba del desempate y del "solo se guarda la mejor carrera". Corre en una transacción y no deja datos:
--   psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f db/ranking.test.sql
-- El upsert es copia del de api/ranking.ts: si cambia allá, cambiarlo aquí.
BEGIN;
CREATE TEMP TABLE t (LIKE ranking INCLUDING ALL);
CREATE FUNCTION pg_temp.up(id uuid, n text, s int, ti int, c int) RETURNS void AS $$
  INSERT INTO t (player_id, name, score, titles, caps) VALUES (id, n, s, ti, c)
  ON CONFLICT (player_id) DO UPDATE
    SET name = EXCLUDED.name, score = EXCLUDED.score, titles = EXCLUDED.titles, caps = EXCLUDED.caps, achieved_at = clock_timestamp()
    WHERE (EXCLUDED.score, EXCLUDED.titles, EXCLUDED.caps) > (t.score, t.titles, t.caps)
$$ LANGUAGE sql;
INSERT INTO t VALUES ('00000000-0000-0000-0000-00000000000a', 'A', 182, 6, 40, now() - interval '3 days');
INSERT INTO t VALUES ('00000000-0000-0000-0000-00000000000b', 'B', 182, 6, 55, now() - interval '1 day');  -- más Selección que A
INSERT INTO t VALUES ('00000000-0000-0000-0000-00000000000c', 'C', 120, 2, 10, now() - interval '5 days'); -- igual que D, pero antes
INSERT INTO t VALUES ('00000000-0000-0000-0000-00000000000d', 'D', 120, 2, 10, now() - interval '2 days');
INSERT INTO t VALUES ('00000000-0000-0000-0000-00000000000e', 'E', 120, 3, 0, now());                      -- más títulos que C y D
DO $$ BEGIN ASSERT (SELECT string_agg(name, '' ORDER BY pos) FROM (SELECT name, row_number() OVER (ORDER BY score DESC, titles DESC, caps DESC, achieved_at) pos FROM t) r) = 'BAECD', 'orden de desempate'; END $$;
SELECT pg_temp.up('00000000-0000-0000-0000-00000000000a', 'A2', 100, 9, 99);
DO $$ BEGIN ASSERT (SELECT name = 'A' AND score = 182 FROM t WHERE player_id = '00000000-0000-0000-0000-00000000000a'), 'una carrera peor no reemplaza'; END $$;
SELECT pg_temp.up('00000000-0000-0000-0000-00000000000a', 'A3', 182, 6, 40);
DO $$ BEGIN ASSERT (SELECT name = 'A' AND achieved_at < now() - interval '2 days' FROM t WHERE player_id = '00000000-0000-0000-0000-00000000000a'), 'empate exacto conserva la fecha vieja'; END $$;
SELECT pg_temp.up('00000000-0000-0000-0000-00000000000a', 'A4', 182, 7, 0);
DO $$ BEGIN ASSERT (SELECT name = 'A4' AND titles = 7 FROM t WHERE player_id = '00000000-0000-0000-0000-00000000000a'), 'mejor por desempate reemplaza'; END $$;
DO $$ BEGIN ASSERT (SELECT count(*) FROM t) = 5, 'una fila por jugador'; END $$;
SELECT 'OK' AS ranking_test;
ROLLBACK;
