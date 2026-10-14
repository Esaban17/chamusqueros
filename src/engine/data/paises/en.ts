// Inglaterra — temporada 2026-27 en curso al 2026-10-14. Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla actual, presupuesto e historia).
// Ascendieron Coventry City, Ipswich Town y Hull City; descendieron West Ham, Burnley y Wolverhampton.
// Al Championship subieron Lincoln City, Cardiff City y Bolton Wanderers.
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'Premier League',
      teams: [
        { name: 'Manchester City', city: 'Mánchester', dept: 'Noroeste', nickname: 'Los Citizens', colors: ['#6CABDD', '#FFFFFF'], stadium: 'Etihad Stadium', rival: 'Manchester United' },
        { name: 'Arsenal', city: 'Londres', dept: 'Londres', nickname: 'Los Gunners', colors: ['#EF0107', '#FFFFFF'], stadium: 'Emirates Stadium', rival: 'Tottenham' },
        { name: 'Liverpool', city: 'Liverpool', dept: 'Noroeste', nickname: 'Los Reds', colors: ['#C8102E', '#FFFFFF'], stadium: 'Anfield', rival: 'Everton' },
        { name: 'Chelsea', city: 'Londres', dept: 'Londres', nickname: 'Los Blues', colors: ['#034694', '#FFFFFF'], stadium: 'Stamford Bridge', rival: 'Tottenham' },
        { name: 'Manchester United', city: 'Mánchester', dept: 'Noroeste', nickname: 'Los Diablos Rojos', colors: ['#DA291C', '#FFFFFF'], stadium: 'Old Trafford', rival: 'Manchester City' },
        { name: 'Newcastle', city: 'Newcastle', dept: 'Noreste', nickname: 'Las Urracas', colors: ['#241F20', '#FFFFFF'], stadium: "St James' Park", rival: 'Sunderland' },
        { name: 'Brighton', city: 'Brighton', dept: 'Sudeste', nickname: 'Las Gaviotas', colors: ['#0057B8', '#FFFFFF'], stadium: 'Amex Stadium' },
        { name: 'Tottenham', city: 'Londres', dept: 'Londres', nickname: 'Los Spurs', colors: ['#FFFFFF', '#132257'], stadium: 'Tottenham Hotspur Stadium', rival: 'Arsenal' },
        { name: 'Aston Villa', city: 'Birmingham', dept: 'Midlands del Oeste', nickname: 'Los Villanos', colors: ['#670E36', '#95BFE5'], stadium: 'Villa Park' },
        { name: 'Brentford', city: 'Londres', dept: 'Londres', nickname: 'Las Abejas', colors: ['#E30613', '#FFFFFF'], stadium: 'Gtech Community Stadium' },
        { name: 'Everton', city: 'Liverpool', dept: 'Noroeste', nickname: 'Los Toffees', colors: ['#003399', '#FFFFFF'], stadium: 'Hill Dickinson Stadium', rival: 'Liverpool' },
        { name: 'Crystal Palace', city: 'Londres', dept: 'Londres', nickname: 'Las Águilas', colors: ['#1B458F', '#C4122E'], stadium: 'Selhurst Park' },
        { name: 'Nottingham Forest', city: 'Nottingham', dept: 'Midlands del Este', nickname: 'Los Tricky Trees', colors: ['#DD0000', '#FFFFFF'], stadium: 'City Ground' },
        { name: 'Leeds United', city: 'Leeds', dept: 'Yorkshire', nickname: 'Los Whites', colors: ['#FFFFFF', '#1D428A'], stadium: 'Elland Road' },
        { name: 'Bournemouth', city: 'Bournemouth', dept: 'Sudoeste', nickname: 'Las Cerezas', colors: ['#DA291C', '#000000'], stadium: 'Vitality Stadium' },
        { name: 'Hull City', city: 'Hull', dept: 'Yorkshire', nickname: 'Los Tigres', colors: ['#F5A12D', '#000000'], stadium: 'MKM Stadium' },
        { name: 'Ipswich Town', city: 'Ipswich', dept: 'Este de Inglaterra', nickname: 'Los Tractor Boys', colors: ['#0044A9', '#FFFFFF'], stadium: 'Portman Road' },
        { name: 'Sunderland', city: 'Sunderland', dept: 'Noreste', nickname: 'Los Black Cats', colors: ['#EB172B', '#FFFFFF'], stadium: 'Stadium of Light', rival: 'Newcastle' },
        { name: 'Fulham', city: 'Londres', dept: 'Londres', nickname: 'Los Cottagers', colors: ['#FFFFFF', '#000000'], stadium: 'Craven Cottage', rival: 'Chelsea' },
        { name: 'Coventry City', city: 'Coventry', dept: 'Midlands del Oeste', nickname: 'Los Sky Blues', colors: ['#59CBE8', '#FFFFFF'], stadium: 'Coventry Building Society Arena' },
      ],
    },
    {
      name: 'Championship',
      teams: [
        { name: 'West Ham', city: 'Londres', dept: 'Londres', nickname: 'Los Hammers', colors: ['#7A263A', '#1BB1E7'], stadium: 'London Stadium', rival: 'Millwall' },
        { name: 'Wolverhampton', city: 'Wolverhampton', dept: 'Midlands del Oeste', nickname: 'Los Lobos', colors: ['#FDB913', '#231F20'], stadium: 'Molineux', rival: 'West Bromwich Albion' },
        { name: 'Middlesbrough', city: 'Middlesbrough', dept: 'Noreste', nickname: 'Boro', colors: ['#E11B22', '#FFFFFF'], stadium: 'Riverside Stadium' },
        { name: 'Swansea City', city: 'Swansea', dept: 'Gales', nickname: 'Los Cisnes', colors: ['#FFFFFF', '#000000'], stadium: 'Swansea.com Stadium', rival: 'Cardiff City' },
        { name: 'Birmingham City', city: 'Birmingham', dept: 'Midlands del Oeste', nickname: 'Los Blues', colors: ['#1E3C96', '#FFFFFF'], stadium: "St Andrew's" },
        { name: 'Burnley', city: 'Burnley', dept: 'Noroeste', nickname: 'Los Clarets', colors: ['#6C1D45', '#99D6EA'], stadium: 'Turf Moor', rival: 'Blackburn Rovers' },
        { name: 'Southampton', city: 'Southampton', dept: 'Sudeste', nickname: 'Los Saints', colors: ['#D71920', '#FFFFFF'], stadium: "St Mary's Stadium", rival: 'Portsmouth' },
        { name: 'West Bromwich Albion', city: 'West Bromwich', dept: 'Midlands del Oeste', nickname: 'Los Baggies', colors: ['#122F67', '#FFFFFF'], stadium: 'The Hawthorns', rival: 'Wolverhampton' },
        { name: 'Stoke City', city: 'Stoke-on-Trent', dept: 'Midlands del Oeste', nickname: 'Los Potters', colors: ['#E03A3E', '#FFFFFF'], stadium: 'bet365 Stadium' },
        { name: 'Sheffield United', city: 'Sheffield', dept: 'Yorkshire', nickname: 'Los Blades', colors: ['#EE2737', '#FFFFFF'], stadium: 'Bramall Lane' },
        { name: 'Wrexham', city: 'Wrexham', dept: 'Gales', nickname: 'Los Dragones', colors: ['#D71920', '#FFFFFF'], stadium: 'Racecourse Ground' },
        { name: 'Blackburn Rovers', city: 'Blackburn', dept: 'Noroeste', nickname: 'Los Rovers', colors: ['#009EE0', '#FFFFFF'], stadium: 'Ewood Park', rival: 'Burnley' },
        { name: 'Norwich City', city: 'Norwich', dept: 'Este de Inglaterra', nickname: 'Los Canarios', colors: ['#FFF200', '#00A650'], stadium: 'Carrow Road' },
        { name: 'Millwall', city: 'Londres', dept: 'Londres', nickname: 'Los Leones', colors: ['#001D5E', '#FFFFFF'], stadium: 'The Den', rival: 'West Ham' },
        { name: 'Bristol City', city: 'Bristol', dept: 'Sudoeste', nickname: 'Los Robins', colors: ['#E21A23', '#FFFFFF'], stadium: 'Ashton Gate' },
        { name: 'Queens Park Rangers', city: 'Londres', dept: 'Londres', nickname: 'QPR', colors: ['#1D5BA4', '#FFFFFF'], stadium: 'Loftus Road' },
        { name: 'Charlton Athletic', city: 'Londres', dept: 'Londres', nickname: 'Los Addicks', colors: ['#D4021D', '#FFFFFF'], stadium: 'The Valley' },
        { name: 'Bolton Wanderers', city: 'Bolton', dept: 'Noroeste', nickname: 'Los Trotters', colors: ['#FFFFFF', '#263C7E'], stadium: 'Toughsheet Community Stadium' },
        { name: 'Watford', city: 'Watford', dept: 'Este de Inglaterra', nickname: 'Los Hornets', colors: ['#FBEE23', '#ED2127'], stadium: 'Vicarage Road' },
        { name: 'Cardiff City', city: 'Cardiff', dept: 'Gales', nickname: 'Los Bluebirds', colors: ['#0070B5', '#FFFFFF'], stadium: 'Cardiff City Stadium', rival: 'Swansea City' },
        { name: 'Portsmouth', city: 'Portsmouth', dept: 'Sudeste', nickname: 'Pompey', colors: ['#001489', '#FFFFFF'], stadium: 'Fratton Park', rival: 'Southampton' },
        { name: 'Lincoln City', city: 'Lincoln', dept: 'Midlands del Este', nickname: 'Los Imps', colors: ['#E2231A', '#FFFFFF'], stadium: 'Sincil Bank' },
        { name: 'Derby County', city: 'Derby', dept: 'Midlands del Este', nickname: 'Los Rams', colors: ['#FFFFFF', '#000000'], stadium: 'Pride Park' },
        { name: 'Preston North End', city: 'Preston', dept: 'Noroeste', nickname: 'Los Lilywhites', colors: ['#FFFFFF', '#002B5C'], stadium: 'Deepdale' },
      ],
    },
  ],
  sources: [
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_Premier_League',
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_EFL_Championship',
    'https://www.premierleague.com/en/news/4673099/the-202627-premier-league-season-officially-starts',
    'https://en.wikipedia.org/wiki/2026_EFL_League_One_play-off_final',
  ],
} satisfies CountryTeams;
