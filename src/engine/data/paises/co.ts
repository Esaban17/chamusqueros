// Colombia — temporada 2026 en curso al 2026-10-14 (Liga BetPlay 2026-II / Torneo BetPlay 2026-II). Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla actual, presupuesto e historia).
// Ascendieron Jaguares y Cúcuta Deportivo; descendieron Envigado y Unión Magdalena (temporada 2025).
// La Equidad pasó a llamarse Internacional de Bogotá; Atlético Huila se mudó y es hoy Independiente Valle del Cauca.
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'Liga BetPlay',
      teams: [
        { name: 'Atlético Nacional', city: 'Medellín', dept: 'Antioquia', nickname: 'El Verdolaga', colors: ['#00843D', '#FFFFFF'], stadium: 'Estadio Atanasio Girardot', rival: 'Independiente Medellín' },
        { name: 'América de Cali', city: 'Cali', dept: 'Valle del Cauca', nickname: 'Los Diablos Rojos', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Olímpico Pascual Guerrero', rival: 'Deportivo Cali' },
        { name: 'Millonarios', city: 'Bogotá', dept: 'Bogotá D. C.', nickname: 'El Embajador', colors: ['#003DA5', '#FFFFFF'], stadium: 'Estadio El Campín', rival: 'Santa Fe' },
        { name: 'Independiente Medellín', city: 'Medellín', dept: 'Antioquia', nickname: 'El Poderoso de la Montaña', colors: ['#C8102E', '#003DA5'], stadium: 'Estadio Atanasio Girardot', rival: 'Atlético Nacional' },
        { name: 'Santa Fe', city: 'Bogotá', dept: 'Bogotá D. C.', nickname: 'El Expreso Rojo', colors: ['#D50032', '#FFFFFF'], stadium: 'Estadio El Campín', rival: 'Millonarios' },
        { name: 'Junior', city: 'Barranquilla', dept: 'Atlántico', nickname: 'El Tiburón', colors: ['#E30613', '#FFFFFF'], stadium: 'Estadio Metropolitano Roberto Meléndez' },
        // Club de Cali; su estadio está en Palmira.
        { name: 'Deportivo Cali', city: 'Cali', dept: 'Valle del Cauca', nickname: 'Los Azucareros', colors: ['#00843D', '#FFFFFF'], stadium: 'Estadio Deportivo Cali', rival: 'América de Cali' },
        { name: 'Atlético Bucaramanga', city: 'Bucaramanga', dept: 'Santander', nickname: 'Los Leopardos', colors: ['#FFD100', '#00843D'], stadium: 'Estadio Américo Montanini' },
        { name: 'Deportes Tolima', city: 'Ibagué', dept: 'Tolima', nickname: 'El Pijao', colors: ['#7A1F3D', '#FFC72C'], stadium: 'Estadio Manuel Murillo Toro' },
        { name: 'Once Caldas', city: 'Manizales', dept: 'Caldas', nickname: 'El Blanco Blanco', colors: ['#FFFFFF', '#000000'], stadium: 'Estadio Palogrande' },
        { name: 'Cúcuta Deportivo', city: 'Cúcuta', dept: 'Norte de Santander', nickname: 'El Motilón', colors: ['#C8102E', '#000000'], stadium: 'Estadio General Santander' },
        { name: 'Águilas Doradas', city: 'Medellín', dept: 'Antioquia', nickname: 'Los Dorados', colors: ['#D4AF37', '#000000'], stadium: 'Estadio Cincuentenario' },
        { name: 'Llaneros', city: 'Villavicencio', dept: 'Meta', nickname: 'Los Centauros', colors: ['#FFFFFF', '#000000'], stadium: 'Estadio Bello Horizonte' },
        { name: 'Internacional de Bogotá', city: 'Bogotá', dept: 'Bogotá D. C.', nickname: 'Los Cóndores', colors: ['#FFFFFF', '#000000'], stadium: 'Estadio Metropolitano de Techo' },
        { name: 'Deportivo Pasto', city: 'Pasto', dept: 'Nariño', nickname: 'Los Volcánicos', colors: ['#C71E26', '#212778'], stadium: 'Estadio Departamental Libertad' },
        { name: 'Alianza Valledupar', city: 'Valledupar', dept: 'Cesar', nickname: 'Los Vallenatos', colors: ['#EA1515', '#FFFFFF'], stadium: 'Estadio Armando Maestre Pavajeau' },
        { name: 'Boyacá Chicó', city: 'Tunja', dept: 'Boyacá', nickname: 'Los Ajedrezados', colors: ['#0A60B9', '#FFFFFF'], stadium: 'Estadio La Independencia' },
        // Estadio Hernán Ramírez Villegas cerrado en 2026 por el sismo de agosto; en 2026-II juega en Yopal (Casanare).
        { name: 'Deportivo Pereira', city: 'Pereira', dept: 'Risaralda', nickname: 'El Matecaña', colors: ['#FFD100', '#C8102E'], stadium: 'Estadio Santiago de las Atalayas' },
        { name: 'Fortaleza', city: 'Bogotá', dept: 'Bogotá D. C.', nickname: 'Los Amix', colors: ['#FFFFFF', '#3E4974'], stadium: 'Estadio Metropolitano de Techo' },
        { name: 'Jaguares de Córdoba', city: 'Montería', dept: 'Córdoba', nickname: 'Los Felinos', colors: ['#38B8F5', '#FFFFFF'], stadium: 'Estadio Jaraguay' },
      ],
    },
    {
      name: 'Torneo BetPlay',
      teams: [
        // Ex Atlético Huila / Independiente Yumbo; nueva sede en Palmira desde 2026-II.
        { name: 'Independiente Valle del Cauca', city: 'Palmira', dept: 'Valle del Cauca', colors: ['#FFFFFF', '#000000'], stadium: 'Estadio Francisco Rivera Escobar' }, // colores no confirmados (nueva identidad)
        { name: 'Real Cartagena', city: 'Cartagena', dept: 'Bolívar', nickname: 'Los Heroicos', colors: ['#FFD100', '#00843D'], stadium: 'Estadio Jaime Morón León' },
        { name: 'Real Cundinamarca', city: 'Mosquera', dept: 'Cundinamarca', nickname: 'Cundi', colors: ['#3FA34D', '#FFFFFF'], stadium: 'Estadio Municipal de Mosquera' }, // colores no confirmados
        { name: 'Tigres FC', city: 'Bogotá', dept: 'Bogotá D. C.', nickname: 'El Equipo Felino', colors: ['#FFBA00', '#000000'], stadium: 'Estadio Metropolitano de Techo' }, // colores no confirmados
        { name: 'Unión Magdalena', city: 'Santa Marta', dept: 'Magdalena', nickname: 'El Ciclón Bananero', colors: ['#0033A0', '#C8102E'], stadium: 'Estadio Sierra Nevada' },
        { name: 'Deportes Quindío', city: 'Armenia', dept: 'Quindío', nickname: 'El Milagroso', colors: ['#13C46E', '#FFFFFF'], stadium: 'Estadio Centenario de Armenia' },
        { name: 'Envigado', city: 'Envigado', dept: 'Antioquia', nickname: 'El Equipo Naranja', colors: ['#DE4514', '#00843D'], stadium: 'Estadio Polideportivo Sur' },
        { name: 'Patriotas', city: 'Tunja', dept: 'Boyacá', nickname: 'Los Lanceros', colors: ['#EA1515', '#FFFFFF'], stadium: 'Estadio La Independencia' },
        { name: 'Boca Juniors de Cali', city: 'Cali', dept: 'Valle del Cauca', nickname: 'Bocali', colors: ['#133DC7', '#FFD100'], stadium: 'Estadio Olímpico Pascual Guerrero' },
        { name: 'Inter de Palmira', city: 'Palmira', dept: 'Valle del Cauca', colors: ['#BCFF05', '#FFFFFF'], stadium: 'Estadio Francisco Rivera Escobar' },
        { name: 'Atlético FC', city: 'Cali', dept: 'Valle del Cauca', nickname: 'El Azul y Oro', colors: ['#0A102E', '#D4AF37'], stadium: 'Estadio Olímpico Pascual Guerrero' },
        { name: 'Real Santander', city: 'Piedecuesta', dept: 'Santander', nickname: 'Los Albicelestes', colors: ['#6CACE4', '#FFFFFF'], stadium: 'Estadio Villa Concha' }, // colores no confirmados
        { name: 'Orsomarso', city: 'Yumbo', dept: 'Valle del Cauca', nickname: 'Los Blanquiazules', colors: ['#1D4DF3', '#FFFFFF'], stadium: 'Estadio Municipal Raúl Miranda' },
        { name: 'Bogotá FC', city: 'Bogotá', dept: 'Bogotá D. C.', nickname: 'Los Bogotanos', colors: ['#FFE217', '#39557A'], stadium: 'Estadio Metropolitano de Techo' },
        { name: 'Itagüí Leones', city: 'Itagüí', dept: 'Antioquia', nickname: 'Los Felinos', colors: ['#F4DF24', '#009846'], stadium: 'Estadio Metropolitano Ciudad de Itagüí' },
        { name: 'Barranquilla FC', city: 'Barranquilla', dept: 'Atlántico', nickname: 'Los Rojos de Curramba', colors: ['#ED1C24', '#FFFFFF'], stadium: 'Estadio Romelio Martínez' },
      ],
    },
  ],
  sources: [
    'https://es.wikipedia.org/wiki/Torneo_Finalización_2026_(Colombia)',
    'https://es.wikipedia.org/wiki/Primera_B_2026_(Colombia)',
    'https://www.vanguardia.com/deportes/futbol/2026/09/28/tabla-de-posiciones-de-la-liga-betplay-ii-de-2026-luego-de-la-fecha-12/',
    'https://www.noticiascaracol.com/golcaracol/futbol-colombiano/confirmado-el-otro-equipo-que-descendio-y-jugara-el-torneo-betplay-en-2026-ya-es-oficial-rg10',
    'https://www.clarosports.com/colombia/liga-bet-play/oficial-deportivo-pereira-se-muda-a-yopal-por-el-resto-del-semestre/',
    'https://www.noticiasrcn.com/deportes/pereira-se-queda-sin-estadio-por-lo-que-resta-del-ano-1054295',
    'https://www.valoraanalitik.com/nuevos-duenos-patrocinadores-imagen-asi-construye-internacional-de-bogota-2026/',
    'https://www.publimetro.co/deportes/2026/07/04/ya-es-oficial-tradicional-equipo-del-fpc-metio-cambio-de-nombre-escudo-sede-y-hasta-de-estadio/',
  ],
} satisfies CountryTeams;
