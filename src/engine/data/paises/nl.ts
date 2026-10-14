// Países Bajos — temporada en curso al 2026-10-14 (2026-27). Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla actual, presupuesto e historia).
// Ascendieron a la Eredivisie: ADO Den Haag, Cambuur y Willem II (play-off); descendieron Volendam, NAC Breda y Heracles.
// Eerste Divisie (Keuken Kampioen Divisie): 20 clubes; se omiten los filiales Jong Ajax, Jong AZ, Jong PSV y Jong FC Utrecht.
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'Eredivisie',
      teams: [
        { name: 'PSV', city: 'Eindhoven', dept: 'Brabante Septentrional', nickname: 'Boeren', colors: ['#ED1C24', '#FFFFFF'], stadium: 'Philips Stadion', rival: 'Ajax' },
        { name: 'Feyenoord', city: 'Róterdam', dept: 'Holanda Meridional', nickname: 'De Stadionclub', colors: ['#E2001A', '#FFFFFF'], stadium: 'De Kuip', rival: 'Ajax' },
        { name: 'Ajax', city: 'Ámsterdam', dept: 'Holanda Septentrional', nickname: 'Godenzonen', colors: ['#FFFFFF', '#D2122E'], stadium: 'Johan Cruijff ArenA', rival: 'Feyenoord' },
        { name: 'AZ Alkmaar', city: 'Alkmaar', dept: 'Holanda Septentrional', nickname: 'Kaaskoppen', colors: ['#E30613', '#FFFFFF'], stadium: 'AFAS Stadion' },
        { name: 'Twente', city: 'Enschede', dept: 'Overijssel', nickname: 'Tukkers', colors: ['#E30613', '#FFFFFF'], stadium: 'De Grolsch Veste' },
        { name: 'Utrecht', city: 'Utrecht', dept: 'Utrecht', colors: ['#E30613', '#FFFFFF'], stadium: 'Stadion Galgenwaard' },
        { name: 'Groningen', city: 'Groninga', dept: 'Groninga', nickname: 'Trots van het Noorden', colors: ['#00A950', '#FFFFFF'], stadium: 'Euroborg', rival: 'Heerenveen' },
        { name: 'Heerenveen', city: 'Heerenveen', dept: 'Frisia', nickname: 'Superfriezen', colors: ['#003F87', '#FFFFFF'], stadium: 'Abe Lenstra Stadion', rival: 'Groningen' },
        { name: 'Fortuna Sittard', city: 'Sittard', dept: 'Limburgo', colors: ['#FFD700', '#00843D'], stadium: 'Fortuna Sittard Stadion' },
        { name: 'Go Ahead Eagles', city: 'Deventer', dept: 'Overijssel', nickname: 'Kowet', colors: ['#E30613', '#FFD700'], stadium: 'De Adelaarshorst', rival: 'PEC Zwolle' },
        { name: 'NEC Nimega', city: 'Nimega', dept: 'Güeldres', colors: ['#C8102E', '#00843D'], stadium: 'Goffertstadion' },
        { name: 'Sparta Róterdam', city: 'Róterdam', dept: 'Holanda Meridional', nickname: 'Kasteelheren', colors: ['#E30613', '#FFFFFF'], stadium: 'Sparta Stadion Het Kasteel', rival: 'Feyenoord' },
        { name: 'Excelsior', city: 'Róterdam', dept: 'Holanda Meridional', colors: ['#E30613', '#000000'], stadium: 'Van Donge & De Roo Stadion' },
        { name: 'Cambuur', city: 'Leeuwarden', dept: 'Frisia', colors: ['#FFD700', '#004A99'], stadium: 'Kooi Stadion', rival: 'Heerenveen' },
        { name: 'PEC Zwolle', city: 'Zwolle', dept: 'Overijssel', nickname: 'Blauwvingers', colors: ['#0055A4', '#FFFFFF'], stadium: 'MAC³PARK stadion', rival: 'Go Ahead Eagles' },
        { name: 'Telstar', city: 'Velsen', dept: 'Holanda Septentrional', nickname: 'Witte Leeuwen', colors: ['#FFFFFF', '#000000'], stadium: 'BUKO Stadion' },
        { name: 'ADO Den Haag', city: 'La Haya', dept: 'Holanda Meridional', nickname: 'Ooievaars', colors: ['#007A33', '#FFD700'], stadium: 'Werktalent Stadion' },
        { name: 'Willem II', city: 'Tilburgo', dept: 'Brabante Septentrional', nickname: 'Tricolores', colors: ['#E30613', '#003D7C'], stadium: 'Koning Willem II Stadion' },
      ],
    },
    {
      name: 'Eerste Divisie',
      teams: [
        { name: 'Heracles Almelo', city: 'Almelo', dept: 'Overijssel', nickname: 'Heraclieden', colors: ['#000000', '#FFFFFF'], stadium: 'Asito Stadion' },
        { name: 'NAC Breda', city: 'Breda', dept: 'Brabante Septentrional', colors: ['#FFD700', '#000000'], stadium: 'Rat Verlegh Stadion' },
        { name: 'Almere City', city: 'Almere', dept: 'Flevoland', nickname: 'De Zwarte Schapen', colors: ['#E30613', '#000000'], stadium: 'Yanmar Stadion' },
        { name: 'Volendam', city: 'Volendam', dept: 'Holanda Septentrional', nickname: 'Het Andere Oranje', colors: ['#F47920', '#000000'], stadium: 'Kras Stadion' },
        { name: 'VVV-Venlo', city: 'Venlo', dept: 'Limburgo', colors: ['#FFD700', '#000000'], stadium: 'De Koel', rival: 'MVV Maastricht' },
        { name: 'Emmen', city: 'Emmen', dept: 'Drente', colors: ['#E30613', '#FFFFFF'], stadium: 'De Oude Meerdijk' },
        { name: 'Roda JC', city: 'Kerkrade', dept: 'Limburgo', colors: ['#FFD700', '#000000'], stadium: 'Parkstad Limburg Stadion', rival: 'MVV Maastricht' },
        { name: 'RKC Waalwijk', city: 'Waalwijk', dept: 'Brabante Septentrional', colors: ['#FFD700', '#003DA5'], stadium: 'Mandemakers Stadion' },
        { name: 'Vitesse', city: 'Arnhem', dept: 'Güeldres', colors: ['#FFD700', '#000000'], stadium: 'GelreDome', rival: 'De Graafschap' },
        { name: 'MVV Maastricht', city: 'Maastricht', dept: 'Limburgo', colors: ['#E30613', '#FFFFFF'], stadium: 'De Geusselt', rival: 'Roda JC' },
        { name: 'De Graafschap', city: 'Doetinchem', dept: 'Güeldres', nickname: 'Superboeren', colors: ['#003DA5', '#FFFFFF'], stadium: 'De Vijverberg', rival: 'Vitesse' },
        { name: 'TOP Oss', city: 'Oss', dept: 'Brabante Septentrional', colors: ['#E30613', '#FFFFFF'], stadium: 'Frans Heesen Stadion' },
        { name: 'Den Bosch', city: 'Bolduque', dept: 'Brabante Septentrional', colors: ['#003DA5', '#FFFFFF'], stadium: 'De Vliert' },
        { name: 'FC Eindhoven', city: 'Eindhoven', dept: 'Brabante Septentrional', colors: ['#003DA5', '#FFFFFF'], stadium: 'Jan Louwers Stadion' },
        { name: 'Helmond Sport', city: 'Helmond', dept: 'Brabante Septentrional', nickname: 'Kattenmeppers', colors: ['#E30613', '#000000'], stadium: 'GS Staalwerken Stadion' }, // colores no confirmados
        { name: 'Dordrecht', city: 'Dordrecht', dept: 'Holanda Meridional', colors: ['#E30613', '#FFFFFF'], stadium: 'M-Scores Stadion' },
      ],
    },
  ],
  sources: [
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_Eredivisie',
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_Eerste_Divisie',
    'https://www.fcupdate.nl/voetbalcompetities/nederland/keuken-kampioen-divisie/programma-uitslagen/2026-2027/vitesse-nac-03-10',
    'https://nl.wikipedia.org/wiki/TOP_Oss',
    'https://nl.wikipedia.org/wiki/Helmond_Sport',
    'https://en.wikipedia.org/wiki/Helmond_Sport',
    'https://nl.wikipedia.org/wiki/Almere_City_FC',
    'https://nl.wikipedia.org/wiki/FC_Volendam',
  ],
} satisfies CountryTeams;
