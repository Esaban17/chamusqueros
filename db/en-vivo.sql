-- Caché de resultados en vivo (ESPN): una sola fila, id = 1.
-- payload: partidos ya saneados. actualizado_at: última respuesta buena (NULL = nunca).
-- intento_at: último intento, bueno o malo; sirve de ritmo y de candado (ver api/en-vivo.ts).
-- Aplicar con: psql "$DATABASE_URL_UNPOOLED" -f db/en-vivo.sql
CREATE TABLE IF NOT EXISTS en_vivo_cache (
	id int PRIMARY KEY CHECK (id = 1),
	payload jsonb NOT NULL DEFAULT '[]',
	actualizado_at timestamptz,
	intento_at timestamptz NOT NULL DEFAULT 'epoch'
);

INSERT INTO en_vivo_cache (id) VALUES (1) ON CONFLICT DO NOTHING;
