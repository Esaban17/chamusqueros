// Panamá — temporada en curso al 2026-10-14 (Apertura 2026, temporada 2026-27). Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla tras ~11 jornadas, presupuesto e historia).
// LPF: 12 equipos en dos conferencias. Ascendió Unión Coclé; descendió Atlético Nacional.
// Liga Prom: lista de Wikipedia (24 clubes, incluye filiales); se quitaron los que hoy están en la LPF y se añadieron Atlético Nacional,
// Rayados de Chiriquí y Unión Coclé II. La plantilla 2026-27 completa no se pudo confirmar.
// Colores de la mayoría de clubes de Liga Prom aproximados.
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'Liga Panameña de Fútbol',
      teams: [
        { name: 'Plaza Amador', city: 'Ciudad de Panamá', dept: 'Panamá', nickname: 'Los Leones', colors: ['#C8102E', '#FFFFFF'], stadium: 'COS Sports Plaza', rival: 'Tauro' },
        { name: 'Árabe Unido', city: 'Colón', dept: 'Colón', nickname: 'Los Árabes', colors: ['#FFFFFF', '#0047AB'], stadium: 'Estadio Armando Dely Valdés' }, // colores no confirmados
        { name: 'San Francisco', city: 'La Chorrera', dept: 'Panamá Oeste', nickname: 'Los Monjes', colors: ['#003DA5', '#FFFFFF'], stadium: 'Estadio Agustín "Muquita" Sánchez', rival: 'CAI' }, // colores no confirmados
        { name: 'Tauro', city: 'Ciudad de Panamá', dept: 'Panamá', nickname: 'Los Toros', colors: ['#000000', '#C8102E'], stadium: 'Estadio Rommel Fernández', rival: 'Plaza Amador' },
        { name: 'Alianza', city: 'Ciudad de Panamá', dept: 'Panamá', colors: ['#0047AB', '#FFFFFF'], stadium: 'Estadio Rommel Fernández' }, // colores no confirmados
        { name: 'Veraguas United', city: 'Santiago de Veraguas', dept: 'Veraguas', colors: ['#00843D', '#FFFFFF'], stadium: 'Estadio Aristocles "Toco" Castillo' }, // colores no confirmados
        { name: 'Universitario', city: 'Penonomé', dept: 'Coclé', colors: ['#003DA5', '#FFD100'], stadium: 'Estadio Universidad Latina' }, // colores no confirmados
        { name: 'UMECIT', city: 'Ciudad de Panamá', dept: 'Panamá', colors: ['#002F6C', '#C8102E'], stadium: 'Campo Futuras Promesas' }, // colores no confirmados
        { name: 'CAI', city: 'La Chorrera', dept: 'Panamá Oeste', nickname: 'Los Chorreranos', colors: ['#FFD100', '#000000'], stadium: 'Estadio Agustín "Muquita" Sánchez', rival: 'San Francisco' }, // colores no confirmados
        { name: 'Sporting San Miguelito', city: 'San Miguelito', dept: 'Panamá', colors: ['#F57F20', '#000000'], stadium: 'COS Sports Plaza' }, // colores no confirmados; sede provisional
        { name: 'Herrera', city: 'Chitré', dept: 'Herrera', colors: ['#00843D', '#FFFFFF'], stadium: 'Estadio Gustavo Posam' }, // colores no confirmados; sede provisional en Parita
        { name: 'Unión Coclé', city: 'Penonomé', dept: 'Coclé', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Virgilio Tejeira' }, // colores no confirmados
      ],
    },
    {
      name: 'Liga Prom',
      teams: [
        { name: 'Atlético Nacional', city: 'Ciudad de Panamá', dept: 'Panamá', colors: ['#00843D', '#FFFFFF'], stadium: 'Estadio Luis "Cascarita" Tapia' }, // colores no confirmados
        { name: 'Árabe Unido II', city: 'Colón', dept: 'Colón', colors: ['#FFFFFF', '#0047AB'], stadium: 'Estadio Armando Dely Valdés' }, // campeón Clausura 2026
        { name: 'UDELAS', city: 'San Miguelito', dept: 'Panamá', colors: ['#003DA5', '#FFFFFF'] }, // colores no confirmados
        { name: 'Panamá City', city: 'Ciudad de Panamá', dept: 'Panamá', colors: ['#000000', '#FFD100'], stadium: 'Yappy Park' }, // colores no confirmados
        { name: 'Mario Méndez', city: 'David', dept: 'Chiriquí', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio San Cristóbal' }, // colores no confirmados
        { name: 'Rayados de Chiriquí', city: 'David', dept: 'Chiriquí', colors: ['#003DA5', '#FFFFFF'] }, // no confirmado
        { name: 'Atlético Chiriquí', city: 'David', dept: 'Chiriquí', colors: ['#C8102E', '#003DA5'], stadium: 'Estadio San Cristóbal' }, // no confirmado
        { name: 'Universidad Latina', city: 'Penonomé', dept: 'Coclé', colors: ['#003DA5', '#FFD100'] }, // colores no confirmados
        { name: 'Águilas de la U', city: 'Ciudad de Panamá', dept: 'Panamá', colors: ['#FFD100', '#003DA5'] }, // colores no confirmados
        { name: 'San Martín', city: 'Ciudad de Panamá', dept: 'Panamá', colors: ['#6CACE4', '#FFFFFF'] }, // colores no confirmados
        { name: 'Panamá Oeste', city: 'Capira', dept: 'Panamá Oeste', colors: ['#00843D', '#FFD100'] }, // colores no confirmados
        { name: 'Bocas FC', city: 'Changuinola', dept: 'Bocas del Toro', colors: ['#00A3E0', '#FFFFFF'] }, // colores no confirmados
        { name: 'Colón C-3', city: 'Colón', dept: 'Colón', colors: ['#C8102E', '#000000'] }, // colores no confirmados
        { name: 'Academy Champions', city: 'Colón', dept: 'Colón', colors: ['#000000', '#FFD100'] }, // colores no confirmados
        { name: 'Potros del Este', city: 'Ciudad de Panamá', dept: 'Panamá', colors: ['#5B2C83', '#FFFFFF'] }, // colores no confirmados
        { name: 'San Francisco II', city: 'La Chorrera', dept: 'Panamá Oeste', colors: ['#003DA5', '#FFFFFF'] }, // no confirmado
        { name: 'Tauro II', city: 'Ciudad de Panamá', dept: 'Panamá', colors: ['#000000', '#C8102E'] }, // no confirmado
        { name: 'Plaza Amador II', city: 'Ciudad de Panamá', dept: 'Panamá', colors: ['#C8102E', '#FFFFFF'] }, // no confirmado
        { name: 'Alianza II', city: 'Ciudad de Panamá', dept: 'Panamá', colors: ['#0047AB', '#FFFFFF'] }, // no confirmado
        { name: 'UMECIT II', city: 'Ciudad de Panamá', dept: 'Panamá', colors: ['#002F6C', '#C8102E'] }, // no confirmado
        { name: 'Sporting San Miguelito II', city: 'San Miguelito', dept: 'Panamá', colors: ['#F57F20', '#000000'] }, // no confirmado
        { name: 'CAI II', city: 'La Chorrera', dept: 'Panamá Oeste', colors: ['#FFD100', '#000000'] }, // no confirmado
        { name: 'Herrera II', city: 'Chitré', dept: 'Herrera', colors: ['#00843D', '#FFFFFF'] }, // no confirmado
        { name: 'Unión Coclé II', city: 'Penonomé', dept: 'Coclé', colors: ['#C8102E', '#FFFFFF'] }, // no confirmado
      ],
    },
  ],
  sources: [
    'https://es.wikipedia.org/wiki/Torneo_Apertura_2026_(Panam%C3%A1)',
    'https://es.wikipedia.org/wiki/Primera_Divisi%C3%B3n_de_Panam%C3%A1',
    'https://www.tvn-2.com/tvmax/lpf/liga-panamena-de-futbol-torneo-apertura-2026-tabla-de-posiciones-tauro-fc-plaza-amador-deportivo-arabe-unido-umecit-fc-sporting-sm-san-francisco-fc_1_2254464.html',
    'https://www.prensa.com/tema/liga-panamena-de-futbol/1/',
    'https://es.wikipedia.org/wiki/Liga_Prom',
  ],
} satisfies CountryTeams;
