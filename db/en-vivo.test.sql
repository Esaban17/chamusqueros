-- Prueba del reclamo atómico de la caché en vivo (un solo ganador por ritmo). Corre en una transacción y no deja datos:
--   psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f db/en-vivo.test.sql
-- El reclamo es copia del de api/en-vivo.ts (reclamar): si cambia allá, cambiarlo aquí.
-- now() es constante dentro de una transacción, así que el reloj se pasa como parámetro (ahora).
-- La concurrencia real la garantiza Postgres: un UPDATE espera el bloqueo de la fila y reevalúa el WHERE con intento_at ya actualizado.
BEGIN;
CREATE TEMP TABLE t (LIKE en_vivo_cache INCLUDING ALL);
INSERT INTO t (id) VALUES (1);
CREATE FUNCTION pg_temp.reclamar(segundos int, ahora timestamptz) RETURNS int AS $$
  WITH g AS (
    UPDATE t SET intento_at = ahora
    WHERE id = 1 AND intento_at <= ahora - make_interval(secs => segundos)
    RETURNING id
  ) SELECT count(*)::int FROM g;
$$ LANGUAGE sql;
DO $$ BEGIN ASSERT (SELECT intento_at = 'epoch' FROM t), 'la fila nueva parte de epoch'; END $$;
DO $$ BEGIN ASSERT pg_temp.reclamar(180, '2026-10-14 12:00:00+00') = 1, 'la fila recién creada se reclama'; END $$;
DO $$ BEGIN ASSERT pg_temp.reclamar(180, '2026-10-14 12:00:00+00') = 0, 'un segundo reclamo inmediato no gana'; END $$;
DO $$ BEGIN ASSERT pg_temp.reclamar(180, '2026-10-14 12:02:59+00') = 0, 'a 1 s antes del ritmo no gana'; END $$;
DO $$ BEGIN ASSERT pg_temp.reclamar(180, '2026-10-14 12:03:00+00') = 1, 'al cumplir el ritmo gana'; END $$;
DO $$ BEGIN ASSERT pg_temp.reclamar(180, '2026-10-14 12:03:00+00') = 0, 'y otra vez solo gana uno'; END $$;
SELECT 'OK' AS en_vivo_test;
ROLLBACK;
