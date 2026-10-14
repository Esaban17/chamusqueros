// Textos y nombres compartidos por el modo local (index.ts) y el modo en línea. Sin DOM al importar y sin los bancos de preguntas ni de futbolistas.
import { COUNTRIES } from '../../engine/countries';
import { clubById } from '../../engine/clubs';
import { FLAG_CODE } from '../../ui/flags';
import type { Categoria, PerfilPublico } from './protocolo';

export const NOMBRE_CAT: Record<Categoria, string> = { pais: 'Ping pong de país', club: 'Ping pong de club', preguntas: 'Preguntas', dedonde: '¿De dónde es?' };
export const AVISOS: Record<string, string> = {
  EN: 'Inglaterra: cuentan solo los futbolistas que jugaron con su Selección (en la fuente casi nadie figura con nacionalidad "Inglaterra", sino con "Reino Unido", que incluye a Escocia y Gales).',
  NL: 'Países Bajos: cuentan los futbolistas del Reino de los Países Bajos o que jugaron con su Selección.',
};

export const nombrePais = (code: string) => COUNTRIES.find((c) => c.code === code)?.name ?? code;
/** Nombre del club con su país; si el id no existe en el juego, devuelve el id tal cual (nunca lanza). */
export function nombreClub(id: string): string {
  try {
    const c = clubById(id);
    return `${c.name} (${nombrePais(c.country)})`;
  } catch { return id; }
}
/** Bandera (solo decorativa) de un país por su nombre en español. */
export const banderaDe = (nombre: string): string | undefined => (FLAG_CODE[nombre] ? `https://flagcdn.com/w40/${FLAG_CODE[nombre]}.png` : undefined);
/** Ruta del escudo de un club, solo si el id tiene la forma de un id del juego. */
export const escudoDe = (id: string): string | undefined => (/^[a-z0-9-]{1,60}$/.test(id) ? `${import.meta.env.BASE_URL}escudos/${id}.png` : undefined);

/** Nombre a mostrar de un jugador de la sala: el apodo, y si hay dos con el mismo, con su número. */
export function nombresVisibles(jugadores: readonly PerfilPublico[]): string[] {
  const [a, b] = jugadores.map((j) => j.apodo);
  return b !== undefined && a.toLowerCase() === b.toLowerCase() ? [`${a} (1)`, `${b} (2)`] : jugadores.map((j) => j.apodo);
}

export const MOTIVOS_SIN_PUNTOS = { corta: 'partida muy corta', repetida: 'ya jugaron varias veces hoy', tope: 'tope diario' } as const;
