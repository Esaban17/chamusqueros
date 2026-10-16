-- Prueba del contador de carreras: suma atómica, corte de día en hora de Guatemala, columnas exactas y CHECK. Corre en una transacción y no deja datos:
--   psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f db/contador-carreras.test.sql      (con db/contador-carreras.sql ya aplicado)
-- SOLO contra una rama de Neon o una base local desechable, nunca contra producción.
-- La sentencia es copia de contarCarrera en api/_bd.ts: si cambia allá, cambiarla aquí.
-- La tabla temporal tiene el mismo nombre que la real y la tapa durante la prueba. El reloj es un parámetro (ms) porque now() es constante en una transacción.
BEGIN;
CREATE TEMP TABLE carreras_dia (LIKE public.carreras_dia INCLUDING ALL);

-- $1 reloj (ms), $2 evento ('iniciada' | 'terminada')
CREATE FUNCTION pg_temp.contar(double precision, text) RETURNS void AS $$
INSERT INTO carreras_dia (dia, iniciadas, terminadas)
VALUES ((to_timestamp($1::double precision / 1000) AT TIME ZONE 'America/Guatemala')::date,
        ($2::text = 'iniciada')::int, ($2::text = 'terminada')::int)
ON CONFLICT (dia) DO UPDATE
	SET iniciadas = carreras_dia.iniciadas + EXCLUDED.iniciadas, terminadas = carreras_dia.terminadas + EXCLUDED.terminadas
$$ LANGUAGE sql;

CREATE FUNCTION pg_temp.ms(t text) RETURNS double precision AS $$ SELECT extract(epoch FROM t::timestamptz)::double precision * 1000 $$ LANGUAGE sql;

DO $$
DECLARE r record;
BEGIN
	-- El primer aviso crea la fila (1, 0); una "terminada" del mismo día la deja en (1, 1).
	PERFORM pg_temp.contar(pg_temp.ms('2026-10-15 12:00:00+00'), 'iniciada');
	SELECT * INTO r FROM carreras_dia;
	ASSERT r.dia = DATE '2026-10-15' AND r.iniciadas = 1 AND r.terminadas = 0, 'primer aviso: (1, 0)';
	PERFORM pg_temp.contar(pg_temp.ms('2026-10-15 13:00:00+00'), 'terminada');
	SELECT * INTO r FROM carreras_dia;
	ASSERT (SELECT count(*) FROM carreras_dia) = 1 AND r.iniciadas = 1 AND r.terminadas = 1, 'mismo día: (1, 1)';

	-- Corte de día: 05:59:59 UTC es 23:59:59 del día anterior en Guatemala; 06:00:00 UTC es 00:00:00 del siguiente.
	PERFORM pg_temp.contar(pg_temp.ms('2026-10-16 05:59:59+00'), 'iniciada');
	ASSERT (SELECT iniciadas FROM carreras_dia WHERE dia = DATE '2026-10-15') = 2, '05:59:59 UTC cuenta en el día de Guatemala anterior';
	PERFORM pg_temp.contar(pg_temp.ms('2026-10-16 06:00:00+00'), 'iniciada');
	ASSERT (SELECT iniciadas FROM carreras_dia WHERE dia = DATE '2026-10-16') = 1, '06:00:00 UTC abre el día siguiente';
	ASSERT (SELECT count(*) FROM carreras_dia) = 2, 'dos días, dos filas';

	-- Columnas exactas de la tabla real (CA-7): nada que identifique a alguien.
	ASSERT (SELECT array_agg(column_name::text ORDER BY column_name) FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'carreras_dia') = ARRAY['dia', 'iniciadas', 'terminadas'], 'la tabla tiene exactamente dia, iniciadas, terminadas';

	-- El CHECK rechaza negativos.
	BEGIN
		UPDATE carreras_dia SET iniciadas = -1;
		ASSERT false, 'el CHECK debía rechazar un valor negativo';
	EXCEPTION WHEN check_violation THEN NULL;
	END;
END $$;

SELECT 'OK' AS resultado;
ROLLBACK;
