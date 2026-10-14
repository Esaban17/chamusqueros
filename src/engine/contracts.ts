// Salario por temporada de un contrato, en quetzales (como el resto de los montos; countries.ts los convierte al mostrar).
import { clubById, type Club } from './clubs';
import { countryOf } from './countries';

// ponytail: constantes a ojo, calibradas con `npm run simulate` (ver specs/mercado-contratos). Un solo número de nivel por país.
const BASE = 18_000; // Segunda División de Guatemala, prestigio 40, nivel parejo con el club y sin fama
const POR_NIVEL_LIGA = 0.21; // exponente por punto de Country.level: España (22) paga unas 100 veces lo que Guatemala
const PRESTIGIO_REF = 40;
const ESCALA_PRESTIGIO = 10; // cada 10 puntos de prestigio multiplican el salario por e
const ESCALA_NIVEL = 20; // jugador por encima (o debajo) del club: e^((nivel - prestigio) / 20), acotado
const FAMA_MAX = 150; // la fama suma hasta un 25 % y el nivel hasta un 60 %: juntos no pasan de 2 veces

/**
 * Salario por temporada para un jugador de ese nivel y fama en ese club.
 * Usa el prestigio propio del club y el nivel de su liga, no la vista de la nacionalidad (viewClub): el mismo club paga lo mismo
 * a cualquiera. La división entra sola por el prestigio (los rangos de cada división no se cruzan en clubs.ts).
 * Crece con el prestigio, el nivel de la liga, el nivel del jugador y su fama. Se redondea a 2 cifras significativas.
 */
export function salaryFor(club: Club, rating: number, fame: number): number {
  const own = clubById(club.id);
  const player = Math.min(1.6, Math.max(0.2, Math.exp((rating - own.prestige) / ESCALA_NIVEL)));
  const level = Math.exp(POR_NIVEL_LIGA * countryOf(own.country).level);
  const raw = BASE * level * Math.exp((own.prestige - PRESTIGIO_REF) / ESCALA_PRESTIGIO) * player * (1 + Math.min(fame, FAMA_MAX) / (4 * FAMA_MAX));
  const step = 10 ** (Math.floor(Math.log10(raw)) - 1);
  return Math.round(raw / step) * step;
}
