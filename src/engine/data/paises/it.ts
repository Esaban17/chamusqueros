// Italia — temporada 2026-27 en curso al 2026-10-14. Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla actual, presupuesto e historia).
// Ascendieron Venecia, Frosinone y Monza; descendieron Cremonese, Hellas Verona y Pisa.
// A la Serie B subieron Vicenza, Arezzo, Benevento y Ascoli.
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'Serie A',
      teams: [
        { name: 'Inter de Milán', city: 'Milán', dept: 'Lombardía', nickname: 'Nerazzurri', colors: ['#0068A8', '#000000'], stadium: 'San Siro', rival: 'Milan' },
        { name: 'Nápoles', city: 'Nápoles', dept: 'Campania', nickname: 'Los Partenopeos', colors: ['#12A0D7', '#FFFFFF'], stadium: 'Diego Armando Maradona' },
        { name: 'Milan', city: 'Milán', dept: 'Lombardía', nickname: 'Rossoneri', colors: ['#FB090B', '#000000'], stadium: 'San Siro', rival: 'Inter de Milán' },
        { name: 'Juventus', city: 'Turín', dept: 'Piamonte', nickname: 'La Vecchia Signora', colors: ['#FFFFFF', '#000000'], stadium: 'Allianz Stadium', rival: 'Torino' },
        { name: 'Roma', city: 'Roma', dept: 'Lacio', nickname: 'Giallorossi', colors: ['#8E1F2F', '#F0BC42'], stadium: 'Estadio Olímpico', rival: 'Lazio' },
        { name: 'Lazio', city: 'Roma', dept: 'Lacio', nickname: 'Biancocelesti', colors: ['#87D8F7', '#FFFFFF'], stadium: 'Estadio Olímpico', rival: 'Roma' },
        { name: 'Atalanta', city: 'Bérgamo', dept: 'Lombardía', nickname: 'La Dea', colors: ['#1E71B8', '#000000'], stadium: 'New Balance Arena' },
        { name: 'Como', city: 'Como', dept: 'Lombardía', nickname: 'Lariani', colors: ['#1A3A6E', '#FFFFFF'], stadium: 'Giuseppe Sinigaglia' },
        { name: 'Bolonia', city: 'Bolonia', dept: 'Emilia-Romaña', nickname: 'Rossoblù', colors: ['#A21C26', '#1A2F48'], stadium: "Renato Dall'Ara" },
        { name: 'Fiorentina', city: 'Florencia', dept: 'Toscana', nickname: 'La Viola', colors: ['#482E92', '#FFFFFF'], stadium: 'Artemio Franchi' },
        { name: 'Torino', city: 'Turín', dept: 'Piamonte', nickname: 'Il Toro', colors: ['#8B1E2D', '#FFFFFF'], stadium: 'Olímpico Grande Torino', rival: 'Juventus' },
        { name: 'Cagliari', city: 'Cagliari', dept: 'Cerdeña', nickname: 'Rossoblù', colors: ['#A6192E', '#002B5C'], stadium: 'Unipol Domus' },
        { name: 'Sassuolo', city: 'Sassuolo', dept: 'Emilia-Romaña', nickname: 'Neroverdi', colors: ['#00A752', '#000000'], stadium: 'Mapei Stadium' },
        { name: 'Udinese', city: 'Údine', dept: 'Friuli-Venecia Julia', nickname: 'Los Friulanos', colors: ['#FFFFFF', '#000000'], stadium: 'Bluenergy Stadium' },
        { name: 'Génova', city: 'Génova', dept: 'Liguria', nickname: 'Il Grifone', colors: ['#A6192E', '#002D62'], stadium: 'Luigi Ferraris' },
        { name: 'Frosinone', city: 'Frosinone', dept: 'Lacio', nickname: 'Canarini', colors: ['#FFD100', '#0047AB'], stadium: 'Benito Stirpe' },
        { name: 'Lecce', city: 'Lecce', dept: 'Apulia', nickname: 'Giallorossi', colors: ['#FFD100', '#C8102E'], stadium: 'Via del Mare' },
        { name: 'Parma', city: 'Parma', dept: 'Emilia-Romaña', nickname: 'Crociati', colors: ['#FFFFFF', '#FFD100'], stadium: 'Ennio Tardini' },
        { name: 'Monza', city: 'Monza', dept: 'Lombardía', nickname: 'Biancorossi', colors: ['#E2001A', '#FFFFFF'], stadium: 'Stadio Brianteo' },
        { name: 'Venecia', city: 'Venecia', dept: 'Véneto', nickname: 'Arancioneroverdi', colors: ['#000000', '#F47920'], stadium: 'Pier Luigi Penzo' },
      ],
    },
    {
      name: 'Serie B',
      teams: [
        { name: 'Palermo', city: 'Palermo', dept: 'Sicilia', nickname: 'Rosanero', colors: ['#F0A1BF', '#000000'], stadium: 'Renzo Barbera' },
        { name: 'Hellas Verona', city: 'Verona', dept: 'Véneto', nickname: 'Gialloblù', colors: ['#002F6C', '#FFD100'], stadium: 'Marcantonio Bentegodi' },
        { name: 'Pisa', city: 'Pisa', dept: 'Toscana', nickname: 'Nerazzurri', colors: ['#000000', '#0067B1'], stadium: 'Arena Garibaldi', rival: 'Empoli' },
        { name: 'Cremonese', city: 'Cremona', dept: 'Lombardía', nickname: 'Grigiorossi', colors: ['#A6192E', '#8A8D8F'], stadium: 'Giovanni Zini', rival: 'Mantova' },
        { name: 'Sampdoria', city: 'Génova', dept: 'Liguria', nickname: 'Blucerchiati', colors: ['#1B5AA6', '#FFFFFF'], stadium: 'Luigi Ferraris' },
        { name: 'Modena', city: 'Módena', dept: 'Emilia-Romaña', nickname: 'Canarini', colors: ['#FFD100', '#0047AB'], stadium: 'Alberto Braglia' },
        { name: 'Empoli', city: 'Empoli', dept: 'Toscana', nickname: 'Azzurri', colors: ['#0055A4', '#FFFFFF'], stadium: 'Carlo Castellani', rival: 'Pisa' },
        { name: 'Mantova', city: 'Mantua', dept: 'Lombardía', nickname: 'Virgiliani', colors: ['#FFFFFF', '#C8102E'], stadium: 'Danilo Martelli', rival: 'Cremonese' },
        { name: 'Südtirol', city: 'Bolzano', dept: 'Trentino-Alto Adigio', colors: ['#FFFFFF', '#C8102E'], stadium: 'Marco Druso' },
        { name: 'Benevento', city: 'Benevento', dept: 'Campania', nickname: 'Le Streghe', colors: ['#FFD100', '#C8102E'], stadium: 'Ciro Vigorito', rival: 'Avellino' },
        { name: 'Cesena', city: 'Cesena', dept: 'Emilia-Romaña', nickname: 'Cavallucci Marini', colors: ['#FFFFFF', '#000000'], stadium: 'Dino Manuzzi' },
        { name: 'Avellino', city: 'Avellino', dept: 'Campania', nickname: 'Lupi', colors: ['#007A33', '#FFFFFF'], stadium: 'Partenio-Adriano Lombardi', rival: 'Benevento' },
        { name: 'Ascoli', city: 'Ascoli Piceno', dept: 'Marcas', nickname: 'Bianconeri', colors: ['#000000', '#FFFFFF'], stadium: 'Cino e Lillo Del Duca' },
        { name: 'Padova', city: 'Padua', dept: 'Véneto', nickname: 'Biancoscudati', colors: ['#FFFFFF', '#C8102E'], stadium: 'Euganeo', rival: 'Vicenza' },
        { name: 'Catanzaro', city: 'Catanzaro', dept: 'Calabria', nickname: 'Aquile', colors: ['#FFD100', '#C8102E'], stadium: 'Nicola Ceravolo' },
        { name: 'Vicenza', city: 'Vicenza', dept: 'Véneto', nickname: 'Biancorossi', colors: ['#C8102E', '#FFFFFF'], stadium: 'Romeo Menti', rival: 'Padova' },
        { name: 'Arezzo', city: 'Arezzo', dept: 'Toscana', nickname: 'Amaranto', colors: ['#8B1A2B', '#FFFFFF'], stadium: 'Città di Arezzo' },
        { name: 'Virtus Entella', city: 'Chiavari', dept: 'Liguria', nickname: 'Biancocelesti', colors: ['#87CEEB', '#FFFFFF'], stadium: 'Stadio Comunale de Chiavari' },
        { name: 'Carrarese', city: 'Carrara', dept: 'Toscana', nickname: 'Gialloazzurri', colors: ['#FFD100', '#0055A4'], stadium: 'Stadio dei Marmi' },
        { name: 'Juve Stabia', city: 'Castellammare di Stabia', dept: 'Campania', nickname: 'Le Vespe', colors: ['#FFD100', '#0055A4'], stadium: 'Romeo Menti' },
      ],
    },
  ],
  sources: [
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_Serie_A',
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_Serie_B',
    'https://sport.sky.it/calcio/serie-a/classifica',
    'https://sport.sky.it/calcio/serie-b/2026/07/22/calendario-serie-b-2026-2027-giornate-partite',
  ],
} satisfies CountryTeams;
