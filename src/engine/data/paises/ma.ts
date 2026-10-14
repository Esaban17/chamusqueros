// Marruecos — temporada en curso al 2026-10-14 (2026-27, arrancó el 24 de septiembre; se mantienen 16 clubes por división).
// Investigado el 2026-10-14. Botola Pro: campeón 2025-26 MAS Fez; ascendieron Moghreb Tetuán (campeón Botola 2), Wydad Témara
// y Amal Tiznit (play-off ante Olympique Dcheira); descendieron Olympique Safi, Yacoub El Mansour y Olympique Dcheira.
// Union Touarga se salvó en play-off ante JS Massira. Botola 2: subieron Ittihad Khemisset y Olympique Khouribga;
// bajaron a Amateur Raja Beni Mellal y Racing Casablanca.
// Orden: de más fuerte a más débil (tabla 2025-26, presupuesto e historia; la 2026-27 lleva solo 1-2 jornadas).
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'Botola Pro',
      teams: [
        { name: 'Raja Casablanca', city: 'Casablanca', dept: 'Casablanca-Settat', nickname: 'Las Águilas Verdes', colors: ['#00843D', '#FFFFFF'], stadium: 'Estadio Mohammed V', rival: 'Wydad Casablanca' },
        { name: 'RS Berkane', city: 'Berkane', dept: 'Oriental', colors: ['#F58220', '#000000'], stadium: 'Estadio Municipal de Berkane' },
        { name: 'AS FAR', city: 'Rabat', dept: 'Rabat-Salé-Kenitra', nickname: 'Los Militares', colors: ['#000000', '#C8102E'], stadium: 'Estadio Príncipe Moulay Abdellah', rival: 'FUS Rabat' },
        { name: 'MAS Fez', city: 'Fez', dept: 'Fez-Mequinez', colors: ['#FFD100', '#000000'], stadium: 'Estadio de Fez' },
        { name: 'Wydad Casablanca', city: 'Casablanca', dept: 'Casablanca-Settat', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Mohammed V', rival: 'Raja Casablanca' },
        { name: 'DH El Jadida', city: 'El Jadida', dept: 'Casablanca-Settat', colors: ['#008633', '#FFFFFF'], stadium: "Estadio Ben M'Hamed El Abdi" },
        { name: 'Ittihad Tanger', city: 'Tánger', dept: 'Tánger-Tetuán-Alhucemas', colors: ['#0055A4', '#FFFFFF'], stadium: 'Estadio Ibn Batouta' },
        { name: 'FUS Rabat', city: 'Rabat', dept: 'Rabat-Salé-Kenitra', colors: ['#FF0000', '#FFFFFF'], stadium: 'Estadio Moulay Hassan', rival: 'AS FAR' },
        { name: 'Kawkab Marrakech', city: 'Marrakech', dept: 'Marrakech-Safi', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio El Harti' },
        { name: 'COD Meknès', city: 'Mequinez', dept: 'Fez-Mequinez', colors: ['#C8102E', '#00843D'], stadium: 'Estadio de Honor de Mequinez' },
        { name: 'RCA Zemamra', city: 'Zemamra', dept: 'Casablanca-Settat', colors: ['#00843D', '#FFFFFF'], stadium: 'Estadio Ahmed Choukri' }, // colores no confirmados
        { name: 'Hassania Agadir', city: 'Agadir', dept: 'Souss-Massa', colors: ['#FF0000', '#FFFFFF'] },
        { name: 'Union Touarga', city: 'Rabat', dept: 'Rabat-Salé-Kenitra', colors: ['#0055A4', '#FFD100'], stadium: 'Estadio Al Medina' }, // colores no confirmados
        { name: 'Moghreb Tetuán', city: 'Tetuán', dept: 'Tánger-Tetuán-Alhucemas', colors: ['#FFFFFF', '#C8102E'], stadium: 'Estadio Saniat Rmel' },
        { name: 'Wydad Témara', city: 'Témara', dept: 'Rabat-Salé-Kenitra', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Olímpico de Rabat' }, // colores no confirmados
        { name: 'Amal Tiznit', city: 'Tiznit', dept: 'Souss-Massa', colors: ['#0055A4', '#FFFFFF'] }, // colores no confirmados
      ],
    },
    {
      name: 'Botola 2',
      teams: [
        { name: 'Olympique Safi', city: 'Safi', dept: 'Marrakech-Safi', colors: ['#0055A4', '#FFFFFF'], stadium: 'Estadio El Massira' }, // colores no confirmados
        { name: 'Olympique Dcheira', city: 'Dcheira El Jihadia', dept: 'Souss-Massa', colors: ['#00843D', '#FFFFFF'], stadium: 'Estadio Ahmed Fana' }, // colores no confirmados
        { name: 'Yacoub El Mansour', city: 'Rabat', dept: 'Rabat-Salé-Kenitra', colors: ['#0055A4', '#FFD100'] }, // colores no confirmados
        { name: 'JS Massira', city: 'El Aaiún', dept: 'El Aaiún-Saguía el-Hamra', colors: ['#00843D', '#FFD100'], stadium: 'Estadio Moulay Rachid' }, // colores no confirmados
        { name: 'Mouloudia Oujda', city: 'Uchda', dept: 'Oriental', colors: ['#00843D', '#FFFFFF'], stadium: 'Estadio de Honor de Uchda', rival: 'USM Oujda' },
        { name: 'Chabab Atlas Khénifra', city: 'Jenifra', dept: 'Béni Mellal-Jenifra', colors: ['#00843D', '#FFFFFF'], stadium: 'Estadio Municipal de Jenifra' }, // colores no confirmados
        { name: 'JS Soualem', city: 'Soualem', dept: 'Casablanca-Settat', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Municipal de Berrechid' }, // colores no confirmados
        { name: 'Stade Marocain', city: 'Rabat', dept: 'Rabat-Salé-Kenitra', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Ahmed Chhoude' }, // colores no confirmados
        { name: 'Wydad Fez', city: 'Fez', dept: 'Fez-Mequinez', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Hassan II' }, // colores no confirmados
        { name: 'USM Oujda', city: 'Uchda', dept: 'Oriental', colors: ['#0055A4', '#FFFFFF'], stadium: 'Estadio Municipal de Uchda', rival: 'Mouloudia Oujda' }, // colores no confirmados
        { name: 'Olympique Khouribga', city: 'Juribga', dept: 'Béni Mellal-Jenifra', colors: ['#00843D', '#FFFFFF'], stadium: 'Estadio del Fosfato' }, // colores no confirmados
        { name: 'Chabab Mohammedia', city: 'Mohammedia', dept: 'Casablanca-Settat', colors: ['#C8102E', '#000000'], stadium: 'Estadio El Bachir' },
        { name: 'Chabab Ben Guerir', city: 'Ben Guerir', dept: 'Marrakech-Safi', colors: ['#FFD100', '#00843D'], stadium: 'Estadio Municipal de Ben Guerir' }, // colores no confirmados
        { name: 'KAC Kenitra', city: 'Kenitra', dept: 'Rabat-Salé-Kenitra', colors: ['#00843D', '#FFFFFF'], stadium: 'Estadio Municipal de Kenitra' }, // colores no confirmados
        { name: 'US Boujaad', city: 'Bejaad', dept: 'Béni Mellal-Jenifra', colors: ['#0055A4', '#FFFFFF'], stadium: 'Estadio Abdelghani Mansouri' }, // colores no confirmados
        { name: 'Ittihad Khemisset', city: 'Jemisset', dept: 'Rabat-Salé-Kenitra', colors: ['#0055A4', '#FFFFFF'], stadium: 'Estadio 18 de Noviembre' }, // colores no confirmados
      ],
    },
  ],
  sources: [
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_Botola_Pro',
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_Botola_Pro_2',
    'https://en.wikipedia.org/wiki/2025%E2%80%9326_Botola_Pro',
    'https://en.wikipedia.org/wiki/2025%E2%80%9326_Botola_Pro_2',
    'https://en.le360.ma/sports/union-touarga-preserve-botola-pro-status-as-amal-tiznit-secure-historic-promotion_QOMKZ43GWNDELKFXGFCHVKSSBY/',
    'https://en.wikipedia.org/w/index.php?title=AS_FAR&action=raw',
    'https://en.wikipedia.org/w/index.php?title=IR_Tangier&action=raw',
    'https://en.wikipedia.org/w/index.php?title=Hassania_Agadir&action=raw',
    'https://en.wikipedia.org/w/index.php?title=Fath_Union_Sport&action=raw',
    'https://en.wikipedia.org/w/index.php?title=Difaâ_Hassani_El_Jadidi&action=raw',
  ],
} satisfies CountryTeams;
