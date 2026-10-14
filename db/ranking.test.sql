-- Prueba del desempate y del "solo se guarda la mejor carrera". Corre en una transacción y no deja datos:
--   psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f db/ranking.test.sql
-- El upsert es copia del de api/ranking.ts: si cambia allá, cambiarlo aquí.
BEGIN;
CREATE TEMP TABLE t (LIKE ranking INCLUDING ALL);
CREATE FUNCTION pg_temp.up(id uuid, n text, s int, ti int, c int, av smallint[] DEFAULT NULL) RETURNS void AS $$
  INSERT INTO t (player_id, name, score, titles, caps, avatar) VALUES (id, n, s, ti, c, av)
  ON CONFLICT (player_id) DO UPDATE
    SET name = EXCLUDED.name, score = EXCLUDED.score, titles = EXCLUDED.titles, caps = EXCLUDED.caps, avatar = EXCLUDED.avatar, achieved_at = clock_timestamp()
    WHERE (EXCLUDED.score, EXCLUDED.titles, EXCLUDED.caps) > (t.score, t.titles, t.caps);
  UPDATE t SET avatar = av WHERE player_id = id AND avatar IS NULL AND av IS NOT NULL;
$$ LANGUAGE sql;
INSERT INTO t VALUES ('00000000-0000-0000-0000-00000000000a', 'A', 182, 6, 40, now() - interval '3 days');
INSERT INTO t VALUES ('00000000-0000-0000-0000-00000000000b', 'B', 182, 6, 55, now() - interval '1 day');  -- más Selección que A
INSERT INTO t VALUES ('00000000-0000-0000-0000-00000000000c', 'C', 120, 2, 10, now() - interval '5 days'); -- igual que D, pero antes
INSERT INTO t VALUES ('00000000-0000-0000-0000-00000000000d', 'D', 120, 2, 10, now() - interval '2 days');
INSERT INTO t VALUES ('00000000-0000-0000-0000-00000000000e', 'E', 120, 3, 0, now());                      -- más títulos que C y D
DO $$ BEGIN ASSERT (SELECT string_agg(name, '' ORDER BY pos) FROM (SELECT name, row_number() OVER (ORDER BY score DESC, titles DESC, caps DESC, achieved_at) pos FROM t) r) = 'BAECD', 'orden de desempate'; END $$;
SELECT pg_temp.up('00000000-0000-0000-0000-00000000000a', 'A2', 100, 9, 99, '{1,1,1,1,1,7}');
DO $$ BEGIN ASSERT (SELECT name = 'A' AND score = 182 FROM t WHERE player_id = '00000000-0000-0000-0000-00000000000a'), 'una carrera peor no reemplaza'; END $$;
DO $$ BEGIN ASSERT (SELECT avatar = '{1,1,1,1,1,7}' FROM t WHERE player_id = '00000000-0000-0000-0000-00000000000a'), 'una fila sin avatar lo recibe aunque la carrera sea peor'; END $$;
SELECT pg_temp.up('00000000-0000-0000-0000-00000000000a', 'A3', 182, 6, 40, '{2,2,2,2,2,8}');
DO $$ BEGIN ASSERT (SELECT name = 'A' AND achieved_at < now() - interval '2 days' FROM t WHERE player_id = '00000000-0000-0000-0000-00000000000a'), 'empate exacto conserva la fecha vieja'; END $$;
DO $$ BEGIN ASSERT (SELECT avatar = '{1,1,1,1,1,7}' FROM t WHERE player_id = '00000000-0000-0000-0000-00000000000a'), 'una carrera que no mejora no cambia el avatar'; END $$;
SELECT pg_temp.up('00000000-0000-0000-0000-00000000000a', 'A4', 182, 7, 0, '{3,3,3,3,3,9}');
DO $$ BEGIN ASSERT (SELECT name = 'A4' AND titles = 7 AND avatar = '{3,3,3,3,3,9}' FROM t WHERE player_id = '00000000-0000-0000-0000-00000000000a'), 'mejor por desempate reemplaza, con su avatar'; END $$;
SELECT pg_temp.up('00000000-0000-0000-0000-00000000000f', 'F', 50, 0, 0, '{0,2,1,0,0,23}');
DO $$ BEGIN ASSERT (SELECT avatar = '{0,2,1,0,0,23}' FROM t WHERE player_id = '00000000-0000-0000-0000-00000000000f'), 'jugador nuevo guarda su avatar'; END $$;
DO $$ BEGIN
  INSERT INTO t (player_id, name, score, titles, caps, avatar) VALUES ('00000000-0000-0000-0000-000000000010', 'G', 1, 0, 0, '{1,2}');
  RAISE EXCEPTION 'un avatar incompleto debía rechazarse';
EXCEPTION WHEN check_violation THEN NULL;
END $$;
DO $$ BEGIN ASSERT (SELECT count(*) FROM t) = 6, 'una fila por jugador'; END $$;
SELECT 'OK' AS ranking_test;
ROLLBACK;
