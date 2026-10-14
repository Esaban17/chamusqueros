-- Retos en línea: perfil + ranking de Retos, salas y partidas cerradas. Ver specs/retos-en-linea/plan.md ("Identidad y datos").
-- Aplicar con: psql "$DATABASE_URL_UNPOOLED" -f db/retos-en-linea.sql   (idempotente; solo crea, no toca db/ranking.sql)
CREATE TABLE IF NOT EXISTS retos_jugadores (
	id uuid PRIMARY KEY,                       -- el mismo del ranking de carreras; nunca sale del servidor
	token_hash bytea NOT NULL,                 -- sha256 del token del dispositivo (el token no se guarda)
	apodo text NOT NULL CHECK (char_length(apodo) BETWEEN 2 AND 20),
	avatar smallint[] CHECK (avatar IS NULL OR cardinality(avatar) = 6),   -- [piel, pelo, color, barba, extra, dorsal]
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
-- Orden del ranking de Retos: puntos ↓, victorias ↓, quien llegó primero. Quien tiene 0 puntos no aparece.
CREATE INDEX IF NOT EXISTS retos_jugadores_ranking ON retos_jugadores (puntos DESC, victorias DESC, llegada_at) WHERE puntos > 0;

CREATE TABLE IF NOT EXISTS retos_salas (
	codigo text PRIMARY KEY CHECK (codigo ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$'),
	creador uuid NOT NULL,                     -- para el límite de salas por hora
	estado jsonb NOT NULL,                     -- SalaInterna (con ids y respuestas): no sale del servidor
	version int NOT NULL DEFAULT 1,            -- control de concurrencia: UPDATE ... WHERE version = la que se leyó
	creado_at timestamptz NOT NULL DEFAULT now(),
	actualizado_at timestamptz NOT NULL DEFAULT now()   -- la sala vence a los 30 min de esto
);
CREATE INDEX IF NOT EXISTS retos_salas_creador ON retos_salas (creador, creado_at);

-- Una fila por partida cerrada: evita sumar dos veces (PRIMARY KEY) y alimenta el factor por rival y el tope diario.
-- El plan decía que una partida que no cumple el mínimo no deja fila; se guarda igual, con valida = false, para que la derrota por abandono
-- se cuente en la misma sentencia atómica de cierre. Solo las válidas cuentan como "partida previa contra el mismo rival".
CREATE TABLE IF NOT EXISTS retos_partidas (
	sala text NOT NULL,
	num int NOT NULL,                          -- 1, 2, ... por revancha
	a uuid NOT NULL,
	b uuid NOT NULL,
	par text GENERATED ALWAYS AS (least(a::text, b::text) || '|' || greatest(a::text, b::text)) STORED,
	puntos_a int NOT NULL,
	puntos_b int NOT NULL,
	valida boolean NOT NULL DEFAULT true,
	cerrada_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (sala, num)
);
CREATE INDEX IF NOT EXISTS retos_partidas_par ON retos_partidas (par, cerrada_at);
CREATE INDEX IF NOT EXISTS retos_partidas_a ON retos_partidas (a, cerrada_at);
CREATE INDEX IF NOT EXISTS retos_partidas_b ON retos_partidas (b, cerrada_at);
