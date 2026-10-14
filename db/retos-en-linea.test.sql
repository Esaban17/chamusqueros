-- Prueba del cierre atómico de una partida, las rachas, el orden del ranking de Retos y las ventanas de 24 h. Corre en una transacción y no deja datos:
--   psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f db/retos-en-linea.test.sql      (con db/retos-en-linea.sql ya aplicado; mejor en una rama de Neon)
-- Las sentencias son copia de las de api/_bd.ts (cerrarPartida, historial, rankingRetos): si cambian allá, cambiarlas aquí.
-- Las tablas temporales tienen el mismo nombre que las reales y las tapan durante la prueba, así el texto de las consultas es el mismo.
-- El reloj es un parámetro (ms) porque now() es constante dentro de una transacción.
BEGIN;
CREATE TEMP TABLE retos_jugadores (LIKE public.retos_jugadores INCLUDING ALL);
CREATE TEMP TABLE retos_salas (LIKE public.retos_salas INCLUDING ALL);
CREATE TEMP TABLE retos_partidas (LIKE public.retos_partidas INCLUDING ALL);

-- $1 codigo, $2 estado, $3 versión vista, $4 reloj (ms), $5 num, $6 a, $7 b, $8 puntos a, $9 puntos b, $10 válida, $11 resultado a, $12 resultado b, $13 cuenta a, $14 cuenta b
CREATE FUNCTION pg_temp.cerrar(text, text, int, double precision, int, uuid, uuid, int, int, boolean, text, text, boolean, boolean)
RETURNS TABLE (version int, cerrada int) AS $$
WITH s AS (
	UPDATE retos_salas SET estado = $2::jsonb, version = retos_salas.version + 1, actualizado_at = to_timestamp($4::double precision / 1000)
	WHERE codigo = $1 AND retos_salas.version = $3::int RETURNING retos_salas.version
), p AS (
	INSERT INTO retos_partidas (sala, num, a, b, puntos_a, puntos_b, valida, cerrada_at)
	SELECT $1, $5::int, $6::uuid, $7::uuid, $8::int, $9::int, $10::boolean, to_timestamp($4::double precision / 1000) FROM s
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
		llegada_at = CASE WHEN x.pts > 0 THEN to_timestamp($4::double precision / 1000) ELSE j.llegada_at END
	FROM (VALUES ($6::uuid, $11::text, $8::int, $13::boolean), ($7::uuid, $12::text, $9::int, $14::boolean)) AS x(id, r, pts, cuenta)
	WHERE j.id = x.id AND x.cuenta AND EXISTS (SELECT 1 FROM p) RETURNING 1
)
SELECT (SELECT s.version FROM s), (SELECT count(*) FROM p)::int;
$$ LANGUAGE sql;

-- $1 a, $2 b, $3 desde (ms): partidas válidas previas contra el mismo rival y puntos ya sumados por cada uno en la ventana
CREATE FUNCTION pg_temp.historial(uuid, uuid, double precision) RETURNS TABLE (previas int, suma_a int, suma_b int) AS $$
SELECT (count(*) FILTER (WHERE par = least($1::text, $2::text) || '|' || greatest($1::text, $2::text) AND valida))::int,
	coalesce(sum(CASE WHEN a = $1 THEN puntos_a WHEN b = $1 THEN puntos_b END), 0)::int,
	coalesce(sum(CASE WHEN a = $2 THEN puntos_a WHEN b = $2 THEN puntos_b END), 0)::int
FROM retos_partidas WHERE cerrada_at > to_timestamp($3::double precision / 1000) AND (a IN ($1, $2) OR b IN ($1, $2));
$$ LANGUAGE sql;

-- $1 yo (o NULL): los 2 primeros (el de la API usa 50) y la fila propia si quedó fuera
CREATE FUNCTION pg_temp.ranking(uuid) RETURNS TABLE (pos int, apodo text, puntos int, victorias int, yo boolean) AS $$
WITH r AS (
	SELECT id, apodo, puntos, victorias, row_number() OVER (ORDER BY puntos DESC, victorias DESC, llegada_at) AS pos
	FROM retos_jugadores WHERE puntos > 0
)
SELECT r.pos::int, r.apodo, r.puntos, r.victorias, coalesce(r.id = $1::uuid, false) FROM r WHERE r.pos <= 2 OR r.id = $1::uuid ORDER BY r.pos;
$$ LANGUAGE sql;

CREATE FUNCTION pg_temp.ms(t text) RETURNS double precision AS $$ SELECT extract(epoch FROM t::timestamptz)::double precision * 1000 $$ LANGUAGE sql;

INSERT INTO retos_jugadores (id, token_hash, apodo) VALUES
	('00000000-0000-4000-8000-00000000000a', '\x01', 'Ana'),
	('00000000-0000-4000-8000-00000000000b', '\x02', 'Beto'),
	('00000000-0000-4000-8000-00000000000c', '\x03', 'Cami'),
	('00000000-0000-4000-8000-00000000000d', '\x04', 'Dani'),
	('00000000-0000-4000-8000-00000000000e', '\x05', 'Eli');
INSERT INTO retos_salas (codigo, creador, estado) VALUES
	('ABC234', '00000000-0000-4000-8000-00000000000a', '{}'),
	('ABC235', '00000000-0000-4000-8000-00000000000d', '{}'),
	('ABC236', '00000000-0000-4000-8000-00000000000d', '{}');
DO $$ BEGIN ASSERT (SELECT version FROM retos_salas WHERE codigo = 'ABC234') = 1, 'la sala parte en la versión 1'; END $$;

-- Restricciones de las tablas.
DO $$ BEGIN INSERT INTO retos_salas (codigo, creador, estado) VALUES ('ABC0O1', '00000000-0000-4000-8000-00000000000a', '{}'); RAISE EXCEPTION 'un código con 0 O 1 debía rechazarse';
EXCEPTION WHEN check_violation THEN NULL; END $$;
DO $$ BEGIN INSERT INTO retos_salas (codigo, creador, estado) VALUES ('abc234', '00000000-0000-4000-8000-00000000000a', '{}'); RAISE EXCEPTION 'un código en minúsculas debía rechazarse';
EXCEPTION WHEN check_violation THEN NULL; END $$;
DO $$ BEGIN INSERT INTO retos_jugadores (id, token_hash, apodo) VALUES ('00000000-0000-4000-8000-0000000000f1', '\x01', 'x'); RAISE EXCEPTION 'un apodo de 1 carácter debía rechazarse';
EXCEPTION WHEN check_violation THEN NULL; END $$;
DO $$ BEGIN INSERT INTO retos_jugadores (id, token_hash, apodo, avatar) VALUES ('00000000-0000-4000-8000-0000000000f2', '\x01', 'xx', '{1,2}'); RAISE EXCEPTION 'un avatar incompleto debía rechazarse';
EXCEPTION WHEN check_violation THEN NULL; END $$;

-- Cierre atómico: A gana 130 a 35 contra B. Sube la versión de la sala, queda una fila de la partida y se actualizan las estadísticas de los dos.
DO $$ DECLARE r record; BEGIN
	SELECT * INTO r FROM pg_temp.cerrar('ABC234', '{"fase":"fin"}', 1, pg_temp.ms('2026-10-14 12:00+00'), 1,
		'00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b', 130, 35, true, 'V', 'D', true, true);
	ASSERT r.version = 2 AND r.cerrada = 1, 'el primer cierre gana';
	ASSERT (SELECT puntos = 130 AND jugadas = 1 AND victorias = 1 AND racha_tipo = 'V' AND racha_n = 1 AND mejor_racha_v = 1 FROM retos_jugadores WHERE apodo = 'Ana'), 'estadísticas del ganador';
	ASSERT (SELECT puntos = 35 AND jugadas = 1 AND derrotas = 1 AND racha_tipo = 'D' AND racha_n = 1 AND mejor_racha_v = 0 FROM retos_jugadores WHERE apodo = 'Beto'), 'estadísticas del perdedor';
	ASSERT (SELECT estado = '{"fase":"fin"}' FROM retos_salas WHERE codigo = 'ABC234'), 'la sala guarda el estado de cierre';
	ASSERT (SELECT count(*) FROM retos_partidas) = 1, 'una fila de partida';
	-- El mismo cierre otra vez (el segundo celular pidió cerrar a la vez): la versión ya cambió, no pasa nada.
	SELECT * INTO r FROM pg_temp.cerrar('ABC234', '{"fase":"fin"}', 1, pg_temp.ms('2026-10-14 12:00+00'), 1,
		'00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b', 130, 35, true, 'V', 'D', true, true);
	ASSERT r.version IS NULL AND r.cerrada = 0, 'con la versión vieja no cierra';
	ASSERT (SELECT puntos FROM retos_jugadores WHERE apodo = 'Ana') = 130, 'no suma dos veces (versión)';
	-- Aunque la versión coincida, la misma partida (sala, num) no vuelve a sumar (PRIMARY KEY).
	SELECT * INTO r FROM pg_temp.cerrar('ABC234', '{"fase":"fin"}', 2, pg_temp.ms('2026-10-14 12:00+00'), 1,
		'00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b', 130, 35, true, 'V', 'D', true, true);
	ASSERT r.cerrada = 0, 'la misma partida no se anota dos veces';
	ASSERT (SELECT puntos = 130 AND jugadas = 1 FROM retos_jugadores WHERE apodo = 'Ana'), 'no suma dos veces (partida)';
	ASSERT (SELECT puntos = 35 AND jugadas = 1 FROM retos_jugadores WHERE apodo = 'Beto'), 'ni al perdedor';
END $$;

-- Rachas de Dani contra Cami: V, V, E, D, V → racha actual 1 victoria, mejor racha de victorias 2.
DO $$ DECLARE r record; v int := 1; res text[] := ARRAY['V','V','E','D','V']; ro text[] := ARRAY['D','D','E','V','D']; i int; BEGIN
	FOR i IN 1..5 LOOP
		SELECT * INTO r FROM pg_temp.cerrar('ABC235', '{}', v, pg_temp.ms('2026-10-14 13:00+00') + i * 1000, i,
			'00000000-0000-4000-8000-00000000000d', '00000000-0000-4000-8000-00000000000c', 10, 10, true, res[i], ro[i], true, true);
		v := r.version;
		IF i = 2 THEN
			ASSERT (SELECT racha_tipo = 'V' AND racha_n = 2 AND mejor_racha_v = 2 FROM retos_jugadores WHERE apodo = 'Dani'), 'dos victorias seguidas';
		END IF;
	END LOOP;
	ASSERT (SELECT racha_tipo = 'V' AND racha_n = 1 AND mejor_racha_v = 2 AND jugadas = 5 AND victorias = 3 AND empates = 1 AND derrotas = 1 FROM retos_jugadores WHERE apodo = 'Dani'), 'V,V,E,D,V: racha actual 1 y mejor 2';
	ASSERT (SELECT racha_tipo = 'D' AND racha_n = 1 AND mejor_racha_v = 1 AND derrotas = 3 AND empates = 1 AND victorias = 1 FROM retos_jugadores WHERE apodo = 'Cami'), 'rachas del rival';
END $$;

-- Partida que no suma a nadie (corta): la fila queda como no válida y las estadísticas no cambian. Un abandono propio sí cuenta como derrota (cuenta = true, 0 puntos).
DO $$ DECLARE r record; ll timestamptz; BEGIN
	SELECT llegada_at INTO ll FROM retos_jugadores WHERE apodo = 'Dani';
	SELECT * INTO r FROM pg_temp.cerrar('ABC236', '{}', 1, pg_temp.ms('2026-10-14 14:00+00'), 1,
		'00000000-0000-4000-8000-00000000000d', '00000000-0000-4000-8000-00000000000c', 0, 0, false, 'V', 'D', false, false);
	ASSERT r.cerrada = 1, 'la partida corta se anota';
	ASSERT (SELECT jugadas = 5 FROM retos_jugadores WHERE apodo = 'Dani'), 'una partida corta no cuenta en las estadísticas';
	SELECT * INTO r FROM pg_temp.cerrar('ABC236', '{}', 2, pg_temp.ms('2026-10-14 14:05+00'), 2,
		'00000000-0000-4000-8000-00000000000d', '00000000-0000-4000-8000-00000000000c', 0, 0, true, 'D', 'V', true, false);
	ASSERT (SELECT jugadas = 6 AND derrotas = 2 AND racha_tipo = 'D' AND racha_n = 1 AND llegada_at = ll FROM retos_jugadores WHERE apodo = 'Dani'), 'el abandono propio es una derrota que no mueve llegada_at';
	ASSERT (SELECT jugadas = 5 FROM retos_jugadores WHERE apodo = 'Cami'), 'el rival de una partida sin mínimo no suma estadísticas';
END $$;

-- Ventana de 24 h: Ana y Beto jugaron 2 válidas y 1 no válida hace 1 h y una válida hace 30 h (fuera de la ventana).
INSERT INTO retos_partidas (sala, num, a, b, puntos_a, puntos_b, valida, cerrada_at) VALUES
	('ZZZ222', 1, '00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000a', 20, 50, true,  '2026-10-14 11:00+00'),
	('ZZZ222', 2, '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b', 0,  0,  false, '2026-10-14 11:05+00'),
	('ZZZ222', 3, '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b', 500, 500, true, '2026-10-13 06:00+00');
DO $$ DECLARE h record; BEGIN
	SELECT * INTO h FROM pg_temp.historial('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b', pg_temp.ms('2026-10-14 12:30+00') - 24 * 3600 * 1000);
	ASSERT h.previas = 2, 'previas válidas en 24 h: la del cierre de arriba y la de hace 1,5 h; la no válida y la de hace 30 h no cuentan';
	ASSERT h.suma_a = 130 + 50 AND h.suma_b = 35 + 20, 'puntos sumados en la ventana';
	SELECT * INTO h FROM pg_temp.historial('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000c', pg_temp.ms('2026-10-14 12:30+00') - 24 * 3600 * 1000);
	ASSERT h.previas = 0, 'otro rival: sin previas';
	-- A las 24 h exactas de la partida de las 11:00 ya no cuenta (la ventana es estricta).
	SELECT * INTO h FROM pg_temp.historial('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b', pg_temp.ms('2026-10-15 11:00+00') - 24 * 3600 * 1000);
	ASSERT h.previas = 1, 'la partida de las 11:00 está en el borde y no cuenta; queda la de las 12:00';
END $$;

-- Ranking: puntos ↓, victorias ↓, quien llegó primero; 0 puntos no aparece; la fila propia aparece aunque quede fuera.
UPDATE retos_jugadores SET puntos = 0, victorias = 0, llegada_at = NULL;
UPDATE retos_jugadores SET puntos = 100, victorias = 2, llegada_at = '2026-10-14 10:00+00' WHERE apodo = 'Ana';
UPDATE retos_jugadores SET puntos = 100, victorias = 2, llegada_at = '2026-10-14 09:00+00' WHERE apodo = 'Beto';   -- empata con Ana pero llegó antes
UPDATE retos_jugadores SET puntos = 100, victorias = 3, llegada_at = '2026-10-14 11:00+00' WHERE apodo = 'Cami';   -- más victorias que los otros dos
UPDATE retos_jugadores SET puntos = 40,  victorias = 1, llegada_at = '2026-10-14 08:00+00' WHERE apodo = 'Dani';
DO $$ BEGIN
	ASSERT (SELECT string_agg(apodo, '' ORDER BY pos) FROM pg_temp.ranking(NULL)) = 'CamiBeto', 'orden y tope del ranking (aquí 2)';
	ASSERT (SELECT string_agg(apodo, '' ORDER BY pos) FROM pg_temp.ranking('00000000-0000-4000-8000-00000000000d')) = 'CamiBetoDani', 'la fila propia aparece aunque quede fuera';
	ASSERT (SELECT pos FROM pg_temp.ranking('00000000-0000-4000-8000-00000000000d') WHERE yo) = 4, 'con su posición real';
	ASSERT (SELECT count(*) FROM pg_temp.ranking('00000000-0000-4000-8000-00000000000e')) = 2, 'quien tiene 0 puntos no aparece';
END $$;
SELECT 'OK' AS retos_en_linea_test;
ROLLBACK;
