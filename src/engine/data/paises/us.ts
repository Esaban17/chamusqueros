// Estados Unidos — temporada en curso al 2026-10-14 (MLS 2026 y USL Championship 2026). Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (puntos de la fase regular a ~10 de octubre, presupuesto e historia).
// MLS: solo los 27 clubes con sede en EE. UU. (se omiten Toronto, CF Montréal y Vancouver). Sin expansión en 2026.
// USL Championship: 25 clubes; entraron Brooklyn FC y Sporting Club Jacksonville; salió North Carolina FC.
// Colores de la USL aproximados a partir de la identidad de cada club.
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'MLS',
      teams: [
        { name: 'Nashville SC', city: 'Nashville', dept: 'Tennessee', colors: ['#ECE83A', '#1F1646'], stadium: 'Geodis Park' },
        { name: 'Inter Miami', city: 'Miami', dept: 'Florida', nickname: 'Las Garzas', colors: ['#F7B5CD', '#231F20'], stadium: 'Nu Stadium', rival: 'Orlando City' },
        { name: 'St. Louis City', city: 'San Luis', dept: 'Misuri', colors: ['#EC1458', '#0A1E2C'], stadium: 'Energizer Park' },
        { name: 'Chicago Fire', city: 'Chicago', dept: 'Illinois', nickname: 'The Men in Red', colors: ['#C8102E', '#0A174A'], stadium: 'Soldier Field' },
        { name: 'LAFC', city: 'Los Ángeles', dept: 'California', nickname: 'The Black & Gold', colors: ['#000000', '#C39E6D'], stadium: 'BMO Stadium', rival: 'LA Galaxy' },
        { name: 'FC Dallas', city: 'Frisco', dept: 'Texas', nickname: 'Los Toros', colors: ['#E81F3E', '#2A4076'], stadium: 'Toyota Stadium', rival: 'Houston Dynamo' },
        { name: 'New England Revolution', city: 'Foxborough', dept: 'Massachusetts', nickname: 'The Revs', colors: ['#0A2240', '#CE0E2D'], stadium: 'Gillette Stadium' },
        { name: 'Charlotte FC', city: 'Charlotte', dept: 'Carolina del Norte', nickname: 'The Crown', colors: ['#1A85C8', '#000000'], stadium: 'Bank of America Stadium' },
        { name: 'San Jose Earthquakes', city: 'San José', dept: 'California', nickname: 'The Quakes', colors: ['#0067B1', '#000000'], stadium: 'PayPal Park' },
        { name: 'Houston Dynamo', city: 'Houston', dept: 'Texas', colors: ['#FF6B00', '#101820'], stadium: 'Shell Energy Stadium', rival: 'FC Dallas' },
        { name: 'Philadelphia Union', city: 'Chester', dept: 'Pensilvania', nickname: 'The U', colors: ['#071B2C', '#B19B69'], stadium: 'Subaru Park' },
        { name: 'Seattle Sounders', city: 'Seattle', dept: 'Washington', nickname: 'Sounders', colors: ['#5D9741', '#005595'], stadium: 'Lumen Field', rival: 'Portland Timbers' },
        { name: 'Orlando City', city: 'Orlando', dept: 'Florida', nickname: 'The Lions', colors: ['#633492', '#FDE192'], stadium: 'Inter&Co Stadium', rival: 'Inter Miami' },
        { name: 'Colorado Rapids', city: 'Commerce City', dept: 'Colorado', nickname: 'The Rapids', colors: ['#960A2C', '#9CC2EA'], stadium: "Dick's Sporting Goods Park" },
        { name: 'New York Red Bulls', city: 'Harrison', dept: 'Nueva Jersey', nickname: 'Red Bulls', colors: ['#ED1E36', '#23326A'], stadium: 'Sports Illustrated Stadium', rival: 'New York City FC' },
        { name: 'FC Cincinnati', city: 'Cincinnati', dept: 'Ohio', nickname: 'The Orange and Blue', colors: ['#F05323', '#263B80'], stadium: 'TQL Stadium', rival: 'Columbus Crew' },
        { name: 'LA Galaxy', city: 'Carson', dept: 'California', nickname: 'Los Galácticos', colors: ['#00245D', '#FFD200'], stadium: 'Dignity Health Sports Park', rival: 'LAFC' },
        { name: 'New York City FC', city: 'Nueva York', dept: 'Nueva York', colors: ['#6CACE4', '#041E42'], stadium: 'Yankee Stadium', rival: 'New York Red Bulls' },
        { name: 'Portland Timbers', city: 'Portland', dept: 'Oregón', nickname: 'The Timbers', colors: ['#00482B', '#D69A00'], stadium: 'Providence Park', rival: 'Seattle Sounders' },
        { name: 'Real Salt Lake', city: 'Sandy', dept: 'Utah', nickname: 'RSL', colors: ['#B30838', '#013A81'], stadium: 'America First Field' },
        { name: 'San Diego FC', city: 'San Diego', dept: 'California', colors: ['#0E1E37', '#00B2E3'], stadium: 'Snapdragon Stadium' },
        { name: 'Austin FC', city: 'Austin', dept: 'Texas', nickname: 'Los Verdes', colors: ['#00B140', '#000000'], stadium: 'Q2 Stadium' },
        { name: 'D.C. United', city: 'Washington D. C.', dept: 'Distrito de Columbia', nickname: 'Black-and-Red', colors: ['#000000', '#EF3E42'], stadium: 'Audi Field' },
        { name: 'Minnesota United', city: 'Saint Paul', dept: 'Minnesota', nickname: 'The Loons', colors: ['#231F20', '#9BCDE4'], stadium: 'Allianz Field' },
        { name: 'Columbus Crew', city: 'Columbus', dept: 'Ohio', nickname: 'The Crew', colors: ['#FEDD00', '#000000'], stadium: 'ScottsMiracle-Gro Field', rival: 'FC Cincinnati' },
        { name: 'Atlanta United', city: 'Atlanta', dept: 'Georgia', nickname: 'The Five Stripes', colors: ['#80000A', '#221F1F'], stadium: 'Mercedes-Benz Stadium' },
        { name: 'Sporting Kansas City', city: 'Kansas City', dept: 'Kansas', nickname: 'Sporting KC', colors: ['#002F65', '#91B0D5'], stadium: 'Sporting Park' },
      ],
    },
    {
      name: 'USL Championship',
      teams: [
        { name: 'Tampa Bay Rowdies', city: 'San Petersburgo', dept: 'Florida', nickname: 'The Rowdies', colors: ['#006241', '#FDDA24'], stadium: 'Al Lang Stadium' },
        { name: 'Louisville City', city: 'Louisville', dept: 'Kentucky', nickname: 'LouCity', colors: ['#5A2B81', '#C5A44B'], stadium: 'Lynn Family Stadium' },
        { name: 'Detroit City', city: 'Detroit', dept: 'Míchigan', nickname: 'Le Rouge', colors: ['#6D2C41', '#C7A36F'], stadium: 'Keyworth Stadium' },
        { name: 'El Paso Locomotive', city: 'El Paso', dept: 'Texas', nickname: 'Locomotive', colors: ['#13294B', '#F37021'], stadium: 'Southwest University Park' },
        { name: 'Charleston Battery', city: 'Charleston', dept: 'Carolina del Sur', nickname: 'The Battery', colors: ['#000000', '#FDD100'], stadium: 'Patriots Point Soccer Complex' },
        { name: 'New Mexico United', city: 'Albuquerque', dept: 'Nuevo México', nickname: 'United', colors: ['#000000', '#FFD100'], stadium: 'Isotopes Park' },
        { name: 'Sacramento Republic', city: 'Sacramento', dept: 'California', nickname: 'Republic', colors: ['#B4232A', '#1F1F1F'], stadium: 'Heart Health Park' },
        { name: 'Lexington SC', city: 'Lexington', dept: 'Kentucky', colors: ['#0E2B5C', '#BFD730'], stadium: 'Lexington SC Stadium' },
        { name: 'FC Tulsa', city: 'Tulsa', dept: 'Oklahoma', colors: ['#0B1F3A', '#F58025'], stadium: 'ONEOK Field' },
        { name: 'Pittsburgh Riverhounds', city: 'Pittsburgh', dept: 'Pensilvania', nickname: 'The Hounds', colors: ['#000000', '#FDB827'], stadium: 'F.N.B. Stadium' },
        { name: 'Colorado Springs Switchbacks', city: 'Colorado Springs', dept: 'Colorado', nickname: 'Switchbacks', colors: ['#002855', '#FDB927'], stadium: 'Weidner Field' },
        { name: 'Hartford Athletic', city: 'Hartford', dept: 'Connecticut', colors: ['#00843D', '#0B1F3A'], stadium: 'Trinity Health Stadium' },
        { name: 'Orange County SC', city: 'Irvine', dept: 'California', colors: ['#F15A22', '#000000'], stadium: 'Championship Soccer Stadium' },
        { name: 'Rhode Island FC', city: 'Pawtucket', dept: 'Rhode Island', colors: ['#0B2240', '#F5B400'], stadium: 'Centreville Bank Stadium' },
        { name: 'San Antonio FC', city: 'San Antonio', dept: 'Texas', colors: ['#000000', '#D50032'], stadium: 'Toyota Field' },
        { name: 'Miami FC', city: 'Miami', dept: 'Florida', colors: ['#0B2341', '#F2A900'], stadium: 'Pitbull Stadium' },
        { name: 'Las Vegas Lights', city: 'Las Vegas', dept: 'Nevada', nickname: 'The Lights', colors: ['#E10098', '#FFE600'], stadium: 'Cashman Field' },
        { name: 'Indy Eleven', city: 'Indianápolis', dept: 'Indiana', colors: ['#002A5C', '#C8102E'], stadium: 'Carroll Stadium' },
        { name: 'Oakland Roots', city: 'Oakland', dept: 'California', colors: ['#000000', '#FDB515'], stadium: 'Oakland Coliseum' },
        { name: 'Phoenix Rising', city: 'Phoenix', dept: 'Arizona', colors: ['#E31B23', '#000000'], stadium: 'Phoenix Rising Soccer Stadium' },
        { name: 'Loudoun United', city: 'Leesburg', dept: 'Virginia', colors: ['#D52B1E', '#0A2240'], stadium: 'Segra Field' },
        { name: 'Birmingham Legion', city: 'Birmingham', dept: 'Alabama', nickname: 'Legion', colors: ['#000000', '#B5975A'], stadium: 'Protective Stadium' },
        { name: 'Monterey Bay FC', city: 'Seaside', dept: 'California', colors: ['#004C97', '#9ADBE8'], stadium: 'Cardinale Stadium' },
        { name: 'Brooklyn FC', city: 'Nueva York', dept: 'Nueva York', colors: ['#000000', '#FFFFFF'], stadium: 'Maimonides Park' }, // colores no confirmados
        { name: 'Sporting Club Jacksonville', city: 'Jacksonville', dept: 'Florida', nickname: 'Sporting JAX', colors: ['#0B2341', '#00A3AD'], stadium: 'Hodges Stadium' }, // colores no confirmados
      ],
    },
  ],
  sources: [
    'https://www.espn.com/soccer/standings/_/league/usa.1',
    'https://en.wikipedia.org/wiki/2026_Major_League_Soccer_season',
    'https://en.wikipedia.org/wiki/2026_USL_Championship_season',
  ],
} satisfies CountryTeams;
