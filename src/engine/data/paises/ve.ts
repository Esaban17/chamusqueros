// Venezuela — temporada en curso al 2026-10-14 (Liga FUTVE 2026, Torneo Clausura). Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla acumulada al 11/10/2026, presupuesto e historia).
// Ascendió Trujillanos (campeón Segunda División 2025); descendió Yaracuyanos.
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'Liga FUTVE',
      teams: [
        { name: 'Metropolitanos', city: 'Caracas', dept: 'Distrito Capital', nickname: 'El Equipo Violeta', colors: ['#5B2C83', '#FFFFFF'], stadium: 'Estadio Olímpico de la UCV' },
        { name: 'Deportivo Táchira', city: 'San Cristóbal', dept: 'Táchira', nickname: 'El Carrusel Aurinegro', colors: ['#FFD100', '#000000'], stadium: 'Estadio Polideportivo de Pueblo Nuevo', rival: 'Caracas' },
        { name: 'Deportivo La Guaira', city: 'Caracas', dept: 'Distrito Capital', nickname: 'El Equipo Naranja', colors: ['#F47920', '#FFFFFF'], stadium: 'Estadio Olímpico de la UCV' },
        { name: 'Caracas', city: 'Caracas', dept: 'Distrito Capital', nickname: 'Los Rojos del Ávila', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Olímpico de la UCV', rival: 'Deportivo Táchira' },
        { name: 'Carabobo', city: 'Valencia', dept: 'Carabobo', nickname: 'La Granja', colors: ['#7B1E2B', '#FFFFFF'], stadium: 'Polideportivo Misael Delgado' },
        { name: 'Academia Puerto Cabello', city: 'Puerto Cabello', dept: 'Carabobo', nickname: 'Los Porteños', colors: ['#0A2240', '#F47920'], stadium: 'Complejo Deportivo Socialista' },
        { name: 'Portuguesa', city: 'Araure', dept: 'Portuguesa', nickname: 'Los Rojinegros', colors: ['#C8102E', '#000000'], stadium: 'Estadio José Antonio Páez' },
        { name: 'Universidad Central', city: 'Caracas', dept: 'Distrito Capital', nickname: 'El Tricolor', colors: ['#FFD100', '#0033A0'], stadium: 'Estadio Olímpico de la UCV' },
        { name: 'Estudiantes de Mérida', city: 'Mérida', dept: 'Mérida', nickname: 'Los Académicos', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Metropolitano de Mérida' },
        { name: 'Monagas', city: 'Maturín', dept: 'Monagas', nickname: 'Los Azulgranas', colors: ['#0033A0', '#C8102E'], stadium: 'Estadio Monumental de Maturín' },
        { name: 'Zamora', city: 'Barinas', dept: 'Barinas', nickname: 'Los Blanquinegros', colors: ['#FFFFFF', '#000000'], stadium: 'Estadio Agustín Tovar' },
        { name: 'Rayo Zuliano', city: 'Maracaibo', dept: 'Zulia', colors: ['#0A2240', '#FFFFFF'], stadium: 'Estadio José Encarnación Romero' },
        { name: 'Trujillanos', city: 'Valera', dept: 'Trujillo', nickname: 'Los Guerreros de la Montaña', colors: ['#FFD100', '#6B3E26'], stadium: 'Estadio José Alberto Pérez' },
        { name: 'Anzoátegui', city: 'Puerto La Cruz', dept: 'Anzoátegui', colors: ['#C8102E', '#FFD100'], stadium: 'Estadio José Antonio Anzoátegui' }, // colores no confirmados
      ],
    },
    {
      name: 'Liga FUTVE 2',
      // 17 clubes en dos grupos (Oriental: 8, Centro Occidental: 9); orden intercalando ambos grupos por puntos.
      // Colores provisionales (no confirmados) salvo Deportivo Lara, Mineros de Guayana y los filiales.
      teams: [
        { name: 'Deportivo Lara', city: 'Cabudare', dept: 'Lara', nickname: 'Los Rojinegros', colors: ['#C8102E', '#000000'], stadium: 'Estadio Metropolitano de Lara' },
        { name: 'Barquisimeto', city: 'Barquisimeto', dept: 'Lara', colors: ['#0033A0', '#FFFFFF'], stadium: 'Estadio Farid Richa' },
        { name: 'Monagas B', city: 'Maturín', dept: 'Monagas', colors: ['#0033A0', '#C8102E'] },
        { name: 'Aragua', city: 'Maracay', dept: 'Aragua', colors: ['#C8102E', '#FFD100'], stadium: 'Estadio Hermanos Ghersi Páez' },
        { name: 'Yaracuyanos', city: 'San Felipe', dept: 'Yaracuy', colors: ['#007A33', '#FFD100'], stadium: 'Estadio Florentino Oropeza' },
        { name: 'Deportivo Miranda', city: 'Caracas', dept: 'Distrito Capital', colors: ['#0033A0', '#FFD100'], stadium: 'Estadio Brígido Iriarte' },
        { name: 'Ureña', city: 'Ureña', dept: 'Táchira', colors: ['#FFFFFF', '#007A33'] },
        { name: 'Mineros de Guayana', city: 'Ciudad Guayana', dept: 'Bolívar', nickname: 'Los Negriazules', colors: ['#0033A0', '#000000'], stadium: 'Estadio CTE Cachamay' },
        { name: 'Bolívar SC', city: 'Ciudad Bolívar', dept: 'Bolívar', colors: ['#FFD100', '#C8102E'] },
        { name: 'Atlético El Vigía', city: 'El Vigía', dept: 'Mérida', colors: ['#007A33', '#FFFFFF'], stadium: 'Estadio Ramón Hernández' },
        { name: 'Zamora B', city: 'Barinas', dept: 'Barinas', colors: ['#FFFFFF', '#000000'] },
        { name: 'Dynamo Puerto', city: 'Puerto La Cruz', dept: 'Anzoátegui', colors: ['#5BC2E7', '#FFFFFF'] },
        { name: 'Academia Puerto Cabello B', city: 'Puerto Cabello', dept: 'Carabobo', colors: ['#0A2240', '#F47920'] },
        { name: 'Atlético Barinas', city: 'Barinas', dept: 'Barinas', colors: ['#C8102E', '#FFFFFF'] },
        { name: 'Marítimo de La Guaira', city: 'La Guaira', dept: 'La Guaira', colors: ['#003DA5', '#FFFFFF'] },
        { name: 'Atlético Ávila', city: 'Caracas', dept: 'Distrito Capital', colors: ['#007A33', '#FFFFFF'], stadium: 'Estadio Brígido Iriarte' },
        { name: 'Real Frontera', city: 'San Cristóbal', dept: 'Táchira', colors: ['#FFFFFF', '#C8102E'] },
      ],
    },
  ],
  sources: [
    'https://es.wikipedia.org/wiki/Primera_Divisi%C3%B3n_de_Venezuela_2026',
    'https://es.wikipedia.org/wiki/Segunda_Divisi%C3%B3n_de_Venezuela_2026',
    'https://es.wikipedia.org/wiki/Rayo_Zuliano',
    'https://es.wikipedia.org/wiki/Trujillanos_Fútbol_Club',
    'https://es.wikipedia.org/wiki/Academia_Puerto_Cabello',
    'https://es.wikipedia.org/wiki/Universidad_Central_de_Venezuela_Fútbol_Club',
    'https://es.wikipedia.org/wiki/Estudiantes_de_Mérida_Fútbol_Club',
    'https://es.wikipedia.org/wiki/Asociación_Civil_Deportivo_Lara',
  ],
} satisfies CountryTeams;
