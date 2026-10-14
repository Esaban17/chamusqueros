// El Salvador — temporada en curso al 2026-10-14 (Apertura 2026, temporada 2026-27). Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla tras ~15 jornadas, presupuesto e historia).
// Primera: 12 equipos. Atlético Balboa compró la plaza de Hércules; Inter FA pasó a llamarse Inter Santa Tecla; ascendió INCA-Aruba; descendió Zacatecoluca FC.
// Segundo nivel: desde 2026 la FESFUT fusionó Segunda y Tercera en la "Liga de Ascenso Copa FOX" (24 clubes en grupos Centro Occidente y Centro Oriente).
// Ciudad y colores de varios clubes del segundo nivel aproximados.
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'Primera División de El Salvador',
      teams: [
        { name: 'FAS', city: 'Santa Ana', dept: 'Santa Ana', nickname: 'Los Tigrillos', colors: ['#C8102E', '#003DA5'], stadium: 'Estadio Óscar Quiteño', rival: 'Alianza' },
        { name: 'Firpo', city: 'Usulután', dept: 'Usulután', nickname: 'Los Toros', colors: ['#FFFFFF', '#C8102E'], stadium: 'Estadio Sergio Torres Rivera', rival: 'Águila' },
        { name: 'Alianza', city: 'San Salvador', dept: 'San Salvador', nickname: 'Los Albos', colors: ['#FFFFFF', '#002F6C'], stadium: 'Estadio Cuscatlán', rival: 'FAS' },
        { name: 'Isidro Metapán', city: 'Metapán', dept: 'Santa Ana', nickname: 'Los Caleros', colors: ['#0055A4', '#FFFFFF'], stadium: 'Estadio Jorge "Calero" Suárez' }, // colores no confirmados
        { name: 'Águila', city: 'San Miguel', dept: 'San Miguel', nickname: 'Los Emplumados', colors: ['#F58220', '#000000'], stadium: 'Estadio Juan Francisco Barraza', rival: 'Firpo' },
        { name: 'Inter Santa Tecla', city: 'Santa Tecla', dept: 'La Libertad', colors: ['#00843D', '#000000'] },
        { name: 'Platense', city: 'Zacatecoluca', dept: 'La Paz', nickname: 'Los Escualos', colors: ['#FFFFFF', '#0B3D91'], stadium: 'Estadio Antonio Toledo Valle' }, // colores no confirmados
        { name: 'Municipal Limeño', city: 'Santa Rosa de Lima', dept: 'La Unión', colors: ['#C8102E', '#FFFFFF'] }, // colores no confirmados
        { name: 'INCA-Aruba', city: 'Colón', dept: 'La Libertad', colors: ['#003DA5', '#FFD100'] }, // colores no confirmados
        { name: 'Atlético Balboa', city: 'La Unión', dept: 'La Unión', colors: ['#6CACE4', '#FFFFFF'], stadium: 'Estadio Marcelino Imbers' }, // colores no confirmados
        { name: 'Fuerte San Francisco', city: 'San Francisco Gotera', dept: 'Morazán', colors: ['#C8102E', '#FFFFFF'] }, // colores no confirmados
        { name: 'Cacahuatique', city: 'Ciudad Barrios', dept: 'San Miguel', colors: ['#00843D', '#FFFFFF'] }, // colores no confirmados
      ],
    },
    {
      name: 'Segunda División de El Salvador',
      teams: [
        { name: 'Independiente de San Vicente', city: 'San Vicente', dept: 'San Vicente', colors: ['#C8102E', '#FFFFFF'] }, // colores no confirmados
        { name: 'Izalco', city: 'Izalco', dept: 'Sonsonate', colors: ['#003DA5', '#FFFFFF'] }, // colores no confirmados
        { name: 'Dragón', city: 'San Miguel', dept: 'San Miguel', nickname: 'Los Dragones', colors: ['#00843D', '#FFFFFF'] },
        { name: 'Once Municipal', city: 'Ahuachapán', dept: 'Ahuachapán', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Simeón Magaña' }, // colores no confirmados
        { name: 'Olímpico Litoral', city: 'La Unión', dept: 'La Unión', colors: ['#003DA5', '#FFFFFF'] }, // colores no confirmados
        { name: 'El Roble', city: 'Ilobasco', dept: 'Cabañas', colors: ['#00843D', '#FFFFFF'] }, // colores no confirmados
        { name: 'Pumas', city: 'Chalatenango', dept: 'Chalatenango', colors: ['#002F6C', '#FFD100'] }, // ciudad y colores no confirmados
        { name: 'Marte Soyapango', city: 'Soyapango', dept: 'San Salvador', colors: ['#C8102E', '#FFFFFF'] }, // colores no confirmados
        { name: 'Once Lobos', city: 'Chalchuapa', dept: 'Santa Ana', nickname: 'Los Lobos', colors: ['#FFD100', '#000000'] }, // colores no confirmados
        { name: 'San Marcos', city: 'San Marcos', dept: 'San Salvador', colors: ['#003DA5', '#FFFFFF'] }, // ciudad y colores no confirmados
        { name: 'El Vencedor', city: 'Santa Elena', dept: 'Usulután', colors: ['#C8102E', '#FFFFFF'] }, // colores no confirmados
        { name: 'Nacional', city: 'San Salvador', dept: 'San Salvador', colors: ['#003DA5', '#C8102E'] }, // ciudad y colores no confirmados
        { name: 'Sal y Mar', city: 'Puerto El Triunfo', dept: 'Usulután', colors: ['#00A3E0', '#FFFFFF'] }, // ciudad y colores no confirmados
        { name: 'Audaz', city: 'Apastepeque', dept: 'San Vicente', colors: ['#000000', '#FFFFFF'] }, // colores no confirmados
        { name: 'Academia BP', city: 'San Salvador', dept: 'San Salvador', colors: ['#003DA5', '#FFFFFF'] }, // ciudad y colores no confirmados
        { name: 'Tenancingo', city: 'Tenancingo', dept: 'Cuscatlán', colors: ['#00843D', '#FFFFFF'] }, // colores no confirmados
        { name: 'ADET-Aruba', city: 'Jayaque', dept: 'La Libertad', colors: ['#003DA5', '#FFD100'] }, // colores no confirmados
        { name: 'FORFUT', city: 'San Salvador', dept: 'San Salvador', colors: ['#000000', '#FFD100'] }, // ciudad y colores no confirmados
        { name: 'San Rafael', city: 'San Rafael Obrajuelo', dept: 'La Paz', colors: ['#C8102E', '#FFFFFF'] }, // ciudad y colores no confirmados
        { name: 'Neo Pipil', city: 'San Juan Nonualco', dept: 'La Paz', colors: ['#00843D', '#FFD100'] }, // colores no confirmados
        { name: 'SESA', city: 'San Miguel', dept: 'San Miguel', colors: ['#003DA5', '#FFFFFF'] }, // ciudad y colores no confirmados
        { name: 'Vendaval', city: 'Apopa', dept: 'San Salvador', colors: ['#6CACE4', '#FFFFFF'] }, // colores no confirmados
        { name: 'Fuerte Aguilares', city: 'Aguilares', dept: 'San Salvador', colors: ['#C8102E', '#000000'] }, // colores no confirmados
        { name: 'Orión', city: 'Santa Rosa de Lima', dept: 'La Unión', colors: ['#5B2C83', '#FFFFFF'] }, // ciudad y colores no confirmados
      ],
    },
  ],
  sources: [
    'https://www.espn.com/soccer/standings/_/league/slv.1',
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_Primera_Divisi%C3%B3n_de_El_Salvador',
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_Segunda_Divisi%C3%B3n_de_El_Salvador',
    'https://en.wikipedia.org/wiki/Segunda_Divisi%C3%B3n_de_El_Salvador',
    'https://www.elsalvador.com/?p=1289974',
    'https://www.eldiariodehoy.com/deportes/10-curiosidades-sobre-inca-aruba-ascendido-a-la-liga-mayor-de-futbol/78126/2026/',
    'https://www.eldiariodehoy.com/deportes/firpo-cumple-103-anos/93905/2026/',
  ],
} satisfies CountryTeams;
