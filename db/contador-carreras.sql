-- Contador anónimo de carreras: una fila por día (hora de Guatemala) con dos números. Sin ninguna columna que identifique a alguien.
-- Aplicar con: psql "$DATABASE_URL_UNPOOLED" -f db/contador-carreras.sql
-- Retroceso (solo si se retira la feature): DROP TABLE carreras_dia;
CREATE TABLE IF NOT EXISTS carreras_dia (
	dia date PRIMARY KEY,
	iniciadas int NOT NULL DEFAULT 0 CHECK (iniciadas >= 0),
	terminadas int NOT NULL DEFAULT 0 CHECK (terminadas >= 0)
);
