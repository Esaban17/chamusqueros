// España — temporada 2026-27 en curso al 2026-10-14. Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla actual, presupuesto e historia).
// Ascendieron Racing de Santander, Deportivo y Málaga; descendieron Real Oviedo, Girona y Mallorca.
// A Hypermotion subieron Tenerife, Eldense, Sabadell y Celta Fortuna.
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'LaLiga',
      teams: [
        { name: 'Real Madrid', city: 'Madrid', dept: 'Comunidad de Madrid', nickname: 'Los Merengues', colors: ['#FFFFFF', '#FEBE10'], stadium: 'Santiago Bernabéu', rival: 'Barcelona' },
        { name: 'Barcelona', city: 'Barcelona', dept: 'Cataluña', nickname: 'Los Culés', colors: ['#A50044', '#004D98'], stadium: 'Spotify Camp Nou', rival: 'Real Madrid' },
        { name: 'Atlético de Madrid', city: 'Madrid', dept: 'Comunidad de Madrid', nickname: 'Los Colchoneros', colors: ['#CB3524', '#FFFFFF'], stadium: 'Riyadh Air Metropolitano', rival: 'Real Madrid' },
        { name: 'Real Betis', city: 'Sevilla', dept: 'Andalucía', nickname: 'Los Verdiblancos', colors: ['#00954C', '#FFFFFF'], stadium: 'Estadio de La Cartuja', rival: 'Sevilla' },
        { name: 'Villarreal', city: 'Villarreal', dept: 'Comunidad Valenciana', nickname: 'El Submarino Amarillo', colors: ['#FFE667', '#005187'], stadium: 'Estadio de la Cerámica' },
        { name: 'Athletic Club', city: 'Bilbao', dept: 'País Vasco', nickname: 'Los Leones', colors: ['#EE2523', '#FFFFFF'], stadium: 'San Mamés', rival: 'Real Sociedad' },
        { name: 'Real Sociedad', city: 'San Sebastián', dept: 'País Vasco', nickname: 'Txuri-urdin', colors: ['#0067B1', '#FFFFFF'], stadium: 'Reale Arena', rival: 'Athletic Club' },
        { name: 'Sevilla', city: 'Sevilla', dept: 'Andalucía', nickname: 'Los Nervionenses', colors: ['#FFFFFF', '#D4021D'], stadium: 'Ramón Sánchez-Pizjuán', rival: 'Real Betis' },
        { name: 'Celta de Vigo', city: 'Vigo', dept: 'Galicia', nickname: 'Los Celestes', colors: ['#8AC3EE', '#FFFFFF'], stadium: 'Balaídos', rival: 'Deportivo de La Coruña' },
        { name: 'Valencia', city: 'Valencia', dept: 'Comunidad Valenciana', nickname: 'Los Che', colors: ['#FFFFFF', '#000000'], stadium: 'Mestalla', rival: 'Levante' },
        { name: 'Alavés', city: 'Vitoria', dept: 'País Vasco', nickname: 'El Glorioso', colors: ['#0057A8', '#FFFFFF'], stadium: 'Mendizorroza' },
        { name: 'Espanyol', city: 'Cornellà de Llobregat', dept: 'Cataluña', nickname: 'Los Pericos', colors: ['#007FC8', '#FFFFFF'], stadium: 'RCDE Stadium', rival: 'Barcelona' },
        { name: 'Osasuna', city: 'Pamplona', dept: 'Navarra', nickname: 'Los Rojillos', colors: ['#D91A21', '#0A346F'], stadium: 'El Sadar' },
        { name: 'Getafe', city: 'Getafe', dept: 'Comunidad de Madrid', nickname: 'Los Azulones', colors: ['#005999', '#FFFFFF'], stadium: 'Coliseum' },
        { name: 'Rayo Vallecano', city: 'Madrid', dept: 'Comunidad de Madrid', nickname: 'Los Franjirrojos', colors: ['#FFFFFF', '#E53027'], stadium: 'Estadio de Vallecas' },
        { name: 'Deportivo de La Coruña', city: 'La Coruña', dept: 'Galicia', nickname: 'El Dépor', colors: ['#0055A4', '#FFFFFF'], stadium: 'Riazor', rival: 'Celta de Vigo' },
        { name: 'Racing de Santander', city: 'Santander', dept: 'Cantabria', nickname: 'El Racing', colors: ['#FFFFFF', '#00804A'], stadium: 'El Sardinero' },
        { name: 'Levante', city: 'Valencia', dept: 'Comunidad Valenciana', nickname: 'Los Granotas', colors: ['#B4053F', '#005BA4'], stadium: 'Ciutat de València', rival: 'Valencia' },
        { name: 'Elche', city: 'Elche', dept: 'Comunidad Valenciana', nickname: 'Los Franjiverdes', colors: ['#FFFFFF', '#05642C'], stadium: 'Martínez Valero' },
        { name: 'Málaga', city: 'Málaga', dept: 'Andalucía', nickname: 'Los Boquerones', colors: ['#5DA9DD', '#FFFFFF'], stadium: 'La Rosaleda' },
      ],
    },
    {
      name: 'LaLiga Hypermotion',
      teams: [
        { name: 'Mallorca', city: 'Palma', dept: 'Islas Baleares', nickname: 'Los Bermellones', colors: ['#E20613', '#000000'], stadium: 'Son Moix' },
        { name: 'Almería', city: 'Almería', dept: 'Andalucía', nickname: 'Los Indálicos', colors: ['#EE1C25', '#FFFFFF'], stadium: 'UD Almería Stadium' },
        { name: 'Girona', city: 'Gerona', dept: 'Cataluña', nickname: 'Los Blanquivermells', colors: ['#CD2534', '#FFFFFF'], stadium: 'Montilivi' },
        { name: 'Eibar', city: 'Éibar', dept: 'País Vasco', nickname: 'Los Armeros', colors: ['#0F3A7D', '#A6192E'], stadium: 'Ipurua' },
        { name: 'Castellón', city: 'Castellón de la Plana', dept: 'Comunidad Valenciana', nickname: 'Los Orelluts', colors: ['#000000', '#FFFFFF'], stadium: 'Castalia' },
        { name: 'Real Oviedo', city: 'Oviedo', dept: 'Principado de Asturias', nickname: 'Los Carbayones', colors: ['#0055A4', '#FFFFFF'], stadium: 'Carlos Tartiere', rival: 'Sporting de Gijón' },
        { name: 'Sporting de Gijón', city: 'Gijón', dept: 'Principado de Asturias', nickname: 'Los Rojiblancos', colors: ['#E30613', '#FFFFFF'], stadium: 'El Molinón', rival: 'Real Oviedo' },
        { name: 'Granada', city: 'Granada', dept: 'Andalucía', nickname: 'Los Nazaríes', colors: ['#C8102E', '#FFFFFF'], stadium: 'Nuevo Los Cármenes' },
        { name: 'Las Palmas', city: 'Las Palmas de Gran Canaria', dept: 'Canarias', nickname: 'Los Amarillos', colors: ['#FFE400', '#0055A4'], stadium: 'Estadio de Gran Canaria', rival: 'Tenerife' },
        { name: 'Real Valladolid', city: 'Valladolid', dept: 'Castilla y León', nickname: 'Los Pucelanos', colors: ['#5C2D91', '#FFFFFF'], stadium: 'José Zorrilla' },
        { name: 'Burgos', city: 'Burgos', dept: 'Castilla y León', nickname: 'Los Blanquinegros', colors: ['#FFFFFF', '#000000'], stadium: 'El Plantío' },
        { name: 'Sabadell', city: 'Sabadell', dept: 'Cataluña', nickname: 'Los Arlequinados', colors: ['#0072CE', '#FFFFFF'], stadium: 'Nova Creu Alta' },
        { name: 'Leganés', city: 'Leganés', dept: 'Comunidad de Madrid', nickname: 'Los Pepineros', colors: ['#FFFFFF', '#0055A4'], stadium: 'Butarque' },
        { name: 'Tenerife', city: 'Santa Cruz de Tenerife', dept: 'Canarias', nickname: 'Los Blanquiazules', colors: ['#FFFFFF', '#0055A4'], stadium: 'Heliodoro Rodríguez López', rival: 'Las Palmas' },
        { name: 'Cádiz', city: 'Cádiz', dept: 'Andalucía', nickname: 'Los Piratas', colors: ['#FFE500', '#0045A5'], stadium: 'Nuevo Mirandilla' }, // no confirmado: Wikipedia lo nombra 'JP Financial Estadio'
        { name: 'Córdoba', city: 'Córdoba', dept: 'Andalucía', nickname: 'Los Califas', colors: ['#FFFFFF', '#007A33'], stadium: 'Nuevo Arcángel' },
        // Club del Principado de Andorra (no es comunidad autónoma); juega en el sistema español.
        { name: 'Andorra', city: 'Encamp', dept: 'Andorra', nickname: 'Los Tricolores', colors: ['#003DA5', '#FFD100'], stadium: 'Nou Estadi Encamp' },
        { name: 'Eldense', city: 'Elda', dept: 'Comunidad Valenciana', nickname: 'Los Azulgranas', colors: ['#0047AB', '#C8102E'], stadium: 'Pepico Amat' },
        { name: 'Celta Fortuna', city: 'Vigo', dept: 'Galicia', colors: ['#8AC3EE', '#FFFFFF'], stadium: 'Balaídos' },
        { name: 'Real Sociedad B', city: 'San Sebastián', dept: 'País Vasco', nickname: 'Sanse', colors: ['#0067B1', '#FFFFFF'], stadium: 'Zubieta' },
        { name: 'Ceuta', city: 'Ceuta', dept: 'Ceuta', nickname: 'Los Caballas', colors: ['#FFFFFF', '#000000'], stadium: 'Alfonso Murube' },
        { name: 'Albacete', city: 'Albacete', dept: 'Castilla-La Mancha', nickname: 'El Queso Mecánico', colors: ['#FFFFFF', '#B71C1C'], stadium: 'Carlos Belmonte' },
      ],
    },
  ],
  sources: [
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_La_Liga',
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_Segunda_Divisi%C3%B3n',
    'https://www.udalmeriasad.com/en/news/los-22-de-la-proxima-liga-hypermotion',
    'https://www.laliga.com/noticias/horarios-de-la-primera-jornada-de-laliga-hypermotion-2026-27',
  ],
} satisfies CountryTeams;
