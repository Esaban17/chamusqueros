// Chile — temporada 2026 en curso al 2026-10-14 (Liga de Primera y Liga de Ascenso 2026). Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla actual, presupuesto e historia).
// Ascendieron Universidad de Concepción y Deportes Concepción; descendieron Unión Española y Deportes Iquique (2025).
// Segunda categoría: Deportes Puerto Montt ascendió desde la Segunda División; Santiago Morning descendió (2025).
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      // Nombre comercial: Liga de Primera.
      name: 'Primera División de Chile',
      teams: [
        { name: 'Colo-Colo', city: 'Santiago', dept: 'Metropolitana de Santiago', nickname: 'El Cacique', colors: ['#FFFFFF', '#000000'], stadium: 'Estadio Monumental David Arellano', rival: 'Universidad de Chile' },
        { name: 'Universidad de Chile', city: 'Santiago', dept: 'Metropolitana de Santiago', nickname: 'El Romántico Viajero', colors: ['#00329B', '#C8102E'], stadium: 'Estadio Nacional', rival: 'Colo-Colo' },
        { name: 'Universidad Católica', city: 'Santiago', dept: 'Metropolitana de Santiago', nickname: 'Los Cruzados', colors: ['#FFFFFF', '#0033A0'], stadium: 'Claro Arena', rival: 'Universidad de Chile' },
        { name: 'Coquimbo Unido', city: 'Coquimbo', dept: 'Coquimbo', nickname: 'Los Piratas', colors: ['#FFD100', '#000000'], stadium: 'Estadio Francisco Sánchez Rumoroso', rival: 'Deportes La Serena' },
        { name: 'Everton', city: 'Viña del Mar', dept: 'Valparaíso', nickname: 'Los Ruleteros', colors: ['#003DA5', '#FFC72C'], stadium: 'Estadio Sausalito' },
        { name: 'Palestino', city: 'Santiago', dept: 'Metropolitana de Santiago', nickname: 'Los Árabes', colors: ['#007A3D', '#E4002B'], stadium: 'Estadio Municipal de La Cisterna' },
        { name: "O'Higgins", city: 'Rancagua', dept: "O'Higgins", nickname: 'El Capo de Provincia', colors: ['#00A3E0', '#FFFFFF'], stadium: 'Estadio El Teniente' },
        { name: 'Huachipato', city: 'Talcahuano', dept: 'Biobío', nickname: 'Los Acereros', colors: ['#0055A4', '#000000'], stadium: 'Estadio Huachipato-CAP Acero' },
        { name: 'Ñublense', city: 'Chillán', dept: 'Ñuble', nickname: 'Los Diablos Rojos', colors: ['#D50032', '#FFFFFF'], stadium: 'Estadio Nelson Oyarzún' },
        { name: 'Audax Italiano', city: 'Santiago', dept: 'Metropolitana de Santiago', nickname: 'Los Tanos', colors: ['#007A33', '#FFFFFF'], stadium: 'Estadio Bicentenario de La Florida' },
        { name: 'Deportes Limache', city: 'Limache', dept: 'Valparaíso', nickname: 'Los Tomateros', colors: ['#E30613', '#000000'], stadium: 'Estadio Lucio Fariña Fernández' },
        { name: 'Deportes Concepción', city: 'Concepción', dept: 'Biobío', nickname: 'Los Lilas', colors: ['#7B3F98', '#FFFFFF'], stadium: 'Estadio Ester Roa', rival: 'Universidad de Concepción' },
        { name: 'Deportes La Serena', city: 'La Serena', dept: 'Coquimbo', nickname: 'Los Papayeros', colors: ['#AA0000', '#FFFFFF'], stadium: 'Estadio La Portada', rival: 'Coquimbo Unido' },
        { name: 'Cobresal', city: 'El Salvador', dept: 'Atacama', nickname: 'Los Mineros', colors: ['#F47920', '#FFFFFF'], stadium: 'Estadio El Cobre' },
        { name: 'Universidad de Concepción', city: 'Concepción', dept: 'Biobío', nickname: 'El Campanil', colors: ['#FFD100', '#003DA5'], stadium: 'Estadio Ester Roa', rival: 'Deportes Concepción' },
        { name: 'Unión La Calera', city: 'La Calera', dept: 'Valparaíso', nickname: 'Los Cementeros', colors: ['#D50032', '#FFFFFF'], stadium: 'Estadio Nicolás Chahuán' },
      ],
    },
    {
      // Nombre comercial: Liga de Ascenso.
      name: 'Primera B de Chile',
      teams: [
        { name: 'Cobreloa', city: 'Calama', dept: 'Antofagasta', nickname: 'Los Loínos', colors: ['#FF6600', '#FFFFFF'], stadium: 'Estadio Zorros del Desierto' },
        { name: 'Santiago Wanderers', city: 'Valparaíso', dept: 'Valparaíso', nickname: 'Los Caturros', colors: ['#007A33', '#FFFFFF'], stadium: 'Estadio Elías Figueroa Brander' },
        { name: 'Unión Española', city: 'Santiago', dept: 'Metropolitana de Santiago', nickname: 'Los Hispanos', colors: ['#C8102E', '#FFD100'], stadium: 'Estadio Santa Laura' },
        { name: 'San Luis de Quillota', city: 'Quillota', dept: 'Valparaíso', nickname: 'Los Canarios', colors: ['#F7F310', '#000000'], stadium: 'Estadio Lucio Fariña Fernández' },
        { name: 'Deportes Antofagasta', city: 'Antofagasta', dept: 'Antofagasta', nickname: 'Los Pumas', colors: ['#6CACE4', '#FFFFFF'], stadium: 'Estadio Calvo y Bascuñán' },
        { name: 'Magallanes', city: 'San Bernardo', dept: 'Metropolitana de Santiago', nickname: 'La Academia', colors: ['#6CACE4', '#FFFFFF'], stadium: 'Estadio Luis Navarro Avilés' },
        { name: 'Deportes Iquique', city: 'Iquique', dept: 'Tarapacá', nickname: 'Los Dragones Celestes', colors: ['#4FB3E8', '#FFFFFF'], stadium: 'Estadio Tierra de Campeones' },
        { name: 'Deportes Recoleta', city: 'Santiago', dept: 'Metropolitana de Santiago', nickname: 'Los Albiazules', colors: ['#001A57', '#FFFFFF'], stadium: 'Estadio Leonel Sánchez Lineros' },
        { name: 'Deportes Copiapó', city: 'Copiapó', dept: 'Atacama', nickname: 'El León de Atacama', colors: ['#FFFFFF', '#EE0000'], stadium: 'Estadio Luis Valenzuela Hermosilla' },
        { name: 'San Marcos de Arica', city: 'Arica', dept: 'Arica y Parinacota', nickname: 'El Santo', colors: ['#6CACE4', '#FFFFFF'], stadium: 'Estadio Carlos Dittborn' },
        { name: 'Deportes Temuco', city: 'Temuco', dept: 'La Araucanía', nickname: 'El Pije', colors: ['#007A33', '#FFFFFF'], stadium: 'Estadio Germán Becker' },
        { name: 'Deportes Puerto Montt', city: 'Puerto Montt', dept: 'Los Lagos', nickname: 'Los Delfines', colors: ['#FFFFFF', '#009242'], stadium: 'Estadio Regional de Chinquihue' },
        { name: 'Curicó Unido', city: 'Curicó', dept: 'Maule', nickname: 'Los Tortilleros', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio La Granja', rival: 'Rangers' },
        { name: 'Rangers', city: 'Talca', dept: 'Maule', nickname: 'Los Piducanos', colors: ['#EE0000', '#000000'], stadium: 'Estadio Bicentenario Iván Azócar Bernales', rival: 'Curicó Unido' },
        { name: 'Unión San Felipe', city: 'San Felipe', dept: 'Valparaíso', nickname: 'El Uní-Uní', colors: ['#FFFFFF', '#EE0000'], stadium: 'Estadio Municipal Javier Muñoz Delgado' },
        { name: 'Deportes Santa Cruz', city: 'Santa Cruz', dept: "O'Higgins", nickname: 'Los Unionistas', colors: ['#003399', '#FFFFFF'], stadium: 'Estadio Joaquín Muñoz García' },
      ],
    },
  ],
  sources: [
    'https://es.wikipedia.org/wiki/Liga_de_Primera_2026',
    'https://es.wikipedia.org/wiki/Liga_de_Ascenso_2026',
    'https://es.wikipedia.org/wiki/Anexo:Temporada_2026_del_f%C3%BAtbol_chileno',
  ],
} satisfies CountryTeams;
