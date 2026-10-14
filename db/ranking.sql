-- Ranking global: una fila por jugador (dispositivo) con su mejor carrera.
-- Orden y desempate: score ↓, títulos ↓, partidos con la Selección ↓, quien lo logró primero.
-- Aplicar con: psql "$DATABASE_URL_UNPOOLED" -f db/ranking.sql
CREATE TABLE IF NOT EXISTS ranking (
	player_id uuid PRIMARY KEY,
	name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
	score int NOT NULL,
	titles int NOT NULL,
	caps int NOT NULL,
	achieved_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ranking_order ON ranking (score DESC, titles DESC, caps DESC, achieved_at);

-- Avatar de la carrera: [piel, pelo, color de pelo, barba, extra, dorsal] (índices de src/ui/avatar.ts).
-- NULL en las filas guardadas antes de que existiera; se completa en la siguiente carrera de ese jugador.
ALTER TABLE ranking ADD COLUMN IF NOT EXISTS avatar smallint[] CHECK (avatar IS NULL OR cardinality(avatar) = 6);

-- Carta estilo FIFA de esa misma carrera: {pos, ovr, club, dept, foot, apps, goals, assists}. La arma api/ranking.ts.
-- NULL en las filas guardadas antes de que existiera; solo se llena cuando el jugador mejora su carrera.
ALTER TABLE ranking ADD COLUMN IF NOT EXISTS card jsonb;
