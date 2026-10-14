// México — temporada en curso al 2026-10-14 (Apertura 2026). Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla tras la jornada 11, presupuesto e historia).
// Liga MX: 18 equipos; regresó Atlante (ocupa la plaza de Mazatlán). América, Cruz Azul y Atlante comparten el Estadio Banorte.
// Liga de Expansión: 16 equipos; nuevos Alacranes de Durango, Piratas (Veracruz) y Cruz Azul Hidalgo; salió Irapuato.
// Solo se confirmó el top 3 de Expansión antes de la J12 (Leones Negros, Atlético Morelia, Atlético La Paz); el resto va por historia y presupuesto.
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'Liga MX',
      teams: [
        { name: 'América', city: 'Ciudad de México', dept: 'Ciudad de México', nickname: 'Las Águilas', colors: ['#FFD100', '#0A2240'], stadium: 'Estadio Banorte', rival: 'Guadalajara' },
        { name: 'Toluca', city: 'Toluca', dept: 'Estado de México', nickname: 'Los Diablos Rojos', colors: ['#D2001F', '#FFFFFF'], stadium: 'Estadio Nemesio Díez' },
        { name: 'Cruz Azul', city: 'Ciudad de México', dept: 'Ciudad de México', nickname: 'La Máquina', colors: ['#0047BB', '#FFFFFF'], stadium: 'Estadio Banorte', rival: 'América' },
        { name: 'Guadalajara', city: 'Guadalajara', dept: 'Jalisco', nickname: 'Chivas', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Akron', rival: 'América' },
        { name: 'Tigres', city: 'San Nicolás de los Garza', dept: 'Nuevo León', nickname: 'Los Felinos', colors: ['#FDB913', '#003A70'], stadium: 'Estadio Universitario', rival: 'Monterrey' },
        { name: 'Monterrey', city: 'Monterrey', dept: 'Nuevo León', nickname: 'Rayados', colors: ['#003DA5', '#FFFFFF'], stadium: 'Estadio BBVA', rival: 'Tigres' },
        { name: 'León', city: 'León', dept: 'Guanajuato', nickname: 'La Fiera', colors: ['#006847', '#FFFFFF'], stadium: 'Estadio León' },
        { name: 'Atlas', city: 'Guadalajara', dept: 'Jalisco', nickname: 'Los Rojinegros', colors: ['#C8102E', '#000000'], stadium: 'Estadio Jalisco', rival: 'Guadalajara' },
        { name: 'Querétaro', city: 'Querétaro', dept: 'Querétaro', nickname: 'Gallos Blancos', colors: ['#0033A0', '#000000'], stadium: 'Estadio Corregidora' },
        { name: 'Pachuca', city: 'Pachuca', dept: 'Hidalgo', nickname: 'Los Tuzos', colors: ['#003DA5', '#FFFFFF'], stadium: 'Estadio Hidalgo' },
        { name: 'Pumas', city: 'Ciudad de México', dept: 'Ciudad de México', nickname: 'Los Universitarios', colors: ['#002B5C', '#C5A55A'], stadium: 'Estadio Olímpico Universitario', rival: 'América' },
        { name: 'Tijuana', city: 'Tijuana', dept: 'Baja California', nickname: 'Xolos', colors: ['#C8102E', '#000000'], stadium: 'Estadio Caliente' },
        { name: 'Puebla', city: 'Puebla', dept: 'Puebla', nickname: 'La Franja', colors: ['#FFFFFF', '#003DA5'], stadium: 'Estadio Cuauhtémoc' },
        { name: 'Santos Laguna', city: 'Torreón', dept: 'Coahuila', nickname: 'Los Guerreros', colors: ['#00843D', '#FFFFFF'], stadium: 'Estadio Corona' },
        { name: 'Atlético de San Luis', city: 'San Luis Potosí', dept: 'San Luis Potosí', nickname: 'Los Tuneros', colors: ['#D2001F', '#0A2240'], stadium: 'Estadio Alfonso Lastras' },
        { name: 'Atlante', city: 'Ciudad de México', dept: 'Ciudad de México', nickname: 'Los Potros de Hierro', colors: ['#002F87', '#C8102E'], stadium: 'Estadio Banorte' },
        { name: 'Necaxa', city: 'Aguascalientes', dept: 'Aguascalientes', nickname: 'Los Rayos', colors: ['#D2001F', '#FFFFFF'], stadium: 'Estadio Victoria' },
        { name: 'FC Juárez', city: 'Ciudad Juárez', dept: 'Chihuahua', nickname: 'Los Bravos', colors: ['#78BE20', '#000000'], stadium: 'Estadio Olímpico Benito Juárez' },
      ],
    },
    {
      name: 'Liga de Expansión MX',
      teams: [
        { name: 'Leones Negros', city: 'Zapopan', dept: 'Jalisco', nickname: 'La Melena Dorada', colors: ['#002B5C', '#C5A55A'], stadium: 'Estadio Jalisco' },
        { name: 'Atlético Morelia', city: 'Morelia', dept: 'Michoacán', nickname: 'Los Canarios', colors: ['#FFD100', '#C8102E'], stadium: 'Estadio Morelos' },
        { name: 'Atlético La Paz', city: 'La Paz', dept: 'Baja California Sur', colors: ['#0072CE', '#FFFFFF'], stadium: 'Estadio Guaycura' },
        { name: 'Tepatitlán', city: 'Tepatitlán de Morelos', dept: 'Jalisco', nickname: 'Los Alteños', colors: ['#00843D', '#FFFFFF'], stadium: 'Estadio Gregorio "Tepa" Gómez' },
        { name: 'Jaiba Brava', city: 'Tampico', dept: 'Tamaulipas', nickname: 'La Jaiba Brava', colors: ['#F57F20', '#003DA5'], stadium: 'Estadio Tamaulipas' },
        { name: 'Mineros de Zacatecas', city: 'Zacatecas', dept: 'Zacatecas', nickname: 'Los Mineros', colors: ['#002F6C', '#FFD100'], stadium: 'Estadio Carlos Vega Villalba' },
        { name: 'Tapatío', city: 'Zapopan', dept: 'Jalisco', nickname: 'Los Chivitas', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Akron' },
        { name: 'Venados', city: 'Mérida', dept: 'Yucatán', nickname: 'Los Venados', colors: ['#7A2531', '#FFFFFF'], stadium: 'Estadio Carlos Iturralde' },
        { name: 'Correcaminos', city: 'Ciudad Victoria', dept: 'Tamaulipas', nickname: 'Los Correcaminos', colors: ['#F57F20', '#003DA5'], stadium: 'Estadio Marte R. Gómez' },
        { name: 'Alacranes de Durango', city: 'Durango', dept: 'Durango', nickname: 'Los Alacranes', colors: ['#5B2C83', '#FFFFFF'], stadium: 'Estadio Francisco Zarco' },
        { name: 'Cancún', city: 'Cancún', dept: 'Quintana Roo', nickname: 'Las Iguanas', colors: ['#00A3E0', '#FFFFFF'], stadium: 'Estadio Andrés Quintana Roo' },
        { name: 'Dorados', city: 'Mazatlán', dept: 'Sinaloa', nickname: 'Los Dorados', colors: ['#FFB81C', '#0A2240'], stadium: 'Estadio El Encanto' }, // juega de local en Mazatlán en el Apertura 2026
        { name: 'Tlaxcala', city: 'Tlaxcala', dept: 'Tlaxcala', nickname: 'Los Coyotes', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Tlahuicole' },
        { name: 'Alebrijes de Oaxaca', city: 'Oaxaca', dept: 'Oaxaca', nickname: 'Los Alebrijes', colors: ['#E4002B', '#FFD100'], stadium: 'Estadio Tecnológico de Oaxaca' },
        { name: 'Piratas', city: 'Boca del Río', dept: 'Veracruz', nickname: 'Los Piratas', colors: ['#C8102E', '#000000'], stadium: 'Estadio Luis "Pirata" Fuente' }, // colores no confirmados
        { name: 'Cruz Azul Hidalgo', city: 'Ciudad Cooperativa Cruz Azul', dept: 'Hidalgo', nickname: 'La Maquinita', colors: ['#0047BB', '#FFFFFF'], stadium: 'Estadio Refundación' },
      ],
    },
  ],
  sources: [
    'https://www.aztecajalisco.com/deportes/liga-mx-como-quedo-chivas-y-atlas-en-la-tabla-general-tras-la-jornada-11-del-apertura-2026/',
    'https://www.foxsports.com.mx/2026/07/24/tabla-general-de-liga-mx-tras-la-jornada-2-atlante-empato-con-america-y-chivas-es-sotanero/',
    'https://vanguardia.com.mx/deportes/cdmx-america-cruz-azul-y-atlante-compartiran-el-estadio-banorte-en-2026-MG19685548',
    'https://www.cronica.com.mx/deportes/2026/07/21/liga-de-expansion-cuando-inicia-el-torneo-y-que-equipos-la-conforman/',
    'https://www.clarosports.com/futbol/liga-de-expansion-mx/liga-de-expansion-mx-presenta-calendario-del-apertura-2026-habra-16-equipos-y-tres-nuevos-clubes/',
    'https://www.quadratin.com.mx/deportes/se-abre-el-telon-de-la-jornada-12-en-la-liga-de-expansion/',
  ],
} satisfies CountryTeams;
