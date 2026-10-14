// Arabia Saudita — temporada en curso al 2026-10-14 (2026-27). Investigado el 2026-10-14.
// Saudi Pro League: ascendieron Abha (campeón), Al Faisaly y Al Diriyah (play-off); descendieron Al Najma, Al Okhdood y Damac.
// Primera División (Yelo League): subieron de Segunda Al Saqer, Al Jeel y Hajer; bajaron Al Batin, Al Arabi y Al Jubail.
// Orden: de más fuerte a más débil (tabla actual, presupuesto e historia).
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'Saudi Pro League',
      teams: [
        { name: 'Al Hilal', city: 'Riad', dept: 'Riad', nickname: 'Al Zaeem', colors: ['#0055A4', '#FFFFFF'], stadium: 'Kingdom Arena', rival: 'Al Nassr' },
        { name: 'Al Nassr', city: 'Riad', dept: 'Riad', nickname: 'Al Alami', colors: ['#FCD116', '#003DA5'], stadium: 'Al-Awwal Park', rival: 'Al Hilal' },
        { name: 'Al Ittihad', city: 'Yeda', dept: 'La Meca', nickname: 'Al Ameed', colors: ['#FFD100', '#000000'], stadium: 'King Abdullah Sports City', rival: 'Al Ahli' },
        { name: 'Al Ahli', city: 'Yeda', dept: 'La Meca', colors: ['#00843D', '#FFFFFF'], stadium: 'King Abdullah Sports City', rival: 'Al Ittihad' },
        { name: 'Al Qadsiah', city: 'Jobar', dept: 'Provincia Oriental', nickname: 'Los Caballeros del Este', colors: ['#C8102E', '#F2C230'], stadium: 'Prince Mohamed bin Fahd Stadium' },
        { name: 'Neom', city: 'Tabuk', dept: 'Tabuk', colors: ['#FFFFFF', '#0055A4'], stadium: 'King Khalid Sport City Stadium' },
        { name: 'Al Ettifaq', city: 'Dammam', dept: 'Provincia Oriental', colors: ['#007A3D', '#D71920'], stadium: 'EGO Stadium' },
        { name: 'Al Shabab', city: 'Riad', dept: 'Riad', colors: ['#FFFFFF', '#000000'], stadium: 'SHG Arena' },
        { name: 'Al Taawoun', city: 'Buraida', dept: 'Al-Qasim', colors: ['#FFD100', '#0055A4'], stadium: 'King Abdullah Sports City Stadium de Buraida' }, // colores no confirmados
        { name: 'Al Kholood', city: 'Ar Rass', dept: 'Al-Qasim', colors: ['#F5F5DC', '#C8102E'], stadium: 'Al-Hazem Club Stadium' }, // colores no confirmados
        { name: 'Al Fateh', city: 'Al Mubarraz', dept: 'Provincia Oriental', colors: ['#0D22FF', '#FFFFFF'] },
        { name: 'Al Diriyah', city: 'Diriyah', dept: 'Riad', colors: ['#C2A27C', '#6D1A36'], stadium: 'Al-Awwal Park' }, // colores no confirmados
        { name: 'Al Riyadh', city: 'Riad', dept: 'Riad', colors: ['#D71920', '#000000'], stadium: 'SHG Arena' }, // colores no confirmados
        { name: 'Al Hazem', city: 'Ar Rass', dept: 'Al-Qasim', colors: ['#F58220', '#0B2A6F'], stadium: 'Al-Hazem Club Stadium' }, // colores no confirmados
        { name: 'Al Fayha', city: 'Al Majmaa', dept: 'Riad', colors: ['#F58220', '#000000'], stadium: 'Majmaah Sports City Stadium' }, // colores no confirmados
        { name: 'Al Khaleej', city: 'Saihat', dept: 'Provincia Oriental', colors: ['#007A3D', '#FFD100'], stadium: 'Prince Mohamed bin Fahd Stadium' }, // colores no confirmados
        { name: 'Al Faisaly', city: 'Harmah', dept: 'Riad', nickname: 'Al Annabi', colors: ['#800020', '#FFFFFF'], stadium: "Al-Majma'ah Sports City Stadium" },
        { name: 'Abha', city: 'Abha', dept: 'Asir', colors: ['#FFD100', '#000000'], stadium: 'Al-Mahalah Stadium' }, // colores no confirmados
      ],
    },
    {
      name: 'Primera División Saudí',
      teams: [
        { name: 'Damac', city: 'Jamis Mushait', dept: 'Asir', colors: ['#C8102E', '#FFFFFF'], stadium: 'Damac Club Stadium' }, // colores no confirmados
        { name: 'Al Okhdood', city: 'Najrán', dept: 'Najrán', colors: ['#6D1A36', '#FFFFFF'] }, // colores no confirmados
        { name: 'Al Najma', city: 'Unaiza', dept: 'Al-Qasim', colors: ['#00A651', '#FFFFFF'] }, // colores no confirmados
        { name: 'Al Ula', city: 'Al Ula', dept: 'Medina', colors: ['#B5651D', '#FFFFFF'] }, // colores no confirmados
        { name: 'Al Orobah', city: 'Sakaka', dept: 'Al-Yauf', colors: ['#0055A4', '#FFFFFF'], stadium: 'Al-Jawf University Stadium' }, // colores no confirmados
        { name: 'Al Jabalain', city: 'Hail', dept: 'Hail', colors: ['#D71920', '#FFFFFF'], stadium: "Prince Abdulaziz bin Musa'ed Sports City Stadium" }, // colores no confirmados
        { name: 'Al Raed', city: 'Buraida', dept: 'Al-Qasim', colors: ['#D71920', '#000000'], stadium: 'Al-Raed Club Stadium' },
        { name: 'Al Zulfi', city: 'Al Zulfi', dept: 'Riad', colors: ['#00843D', '#FFFFFF'], stadium: 'Al-Zulfi Club Stadium' }, // colores no confirmados
        { name: 'Al Tai', city: 'Hail', dept: 'Hail', colors: ['#FFD100', '#000000'], stadium: "Prince Abdulaziz bin Musa'ed Sports City Stadium" }, // colores no confirmados
        { name: 'Al Wehda', city: 'La Meca', dept: 'La Meca', colors: ['#C8102E', '#FFFFFF'], stadium: 'King Abdulaziz Sports City Stadium' },
        { name: 'Al Bukayriyah', city: 'Al Bukayriyah', dept: 'Al-Qasim', colors: ['#0055A4', '#FFD100'], stadium: 'Al-Bukiryah Club Stadium' }, // colores no confirmados
        { name: 'Al Anwar', city: 'Hotat Bani Tamim', dept: 'Riad', colors: ['#00A651', '#FFD100'], stadium: 'Al-Anwar Club Stadium' }, // colores no confirmados
        { name: 'Jeddah', city: 'Yeda', dept: 'La Meca', colors: ['#0055A4', '#FFFFFF'], stadium: 'Al-Faisal Stadium' }, // colores no confirmados
        { name: 'Al Adalah', city: 'Hofuf', dept: 'Provincia Oriental', colors: ['#00843D', '#FFFFFF'], stadium: 'Hofuf Stadium' }, // colores no confirmados
        { name: 'Al Jandal', city: 'Dumat al-Jandal', dept: 'Al-Yauf', colors: ['#FFD100', '#00843D'], stadium: 'Al-Jawf University Stadium' }, // colores no confirmados
        { name: 'Al Saqer', city: 'Buraida', dept: 'Al-Qasim', colors: ['#0B2A6F', '#FFFFFF'] }, // colores no confirmados
        { name: 'Al Jeel', city: 'Hofuf', dept: 'Provincia Oriental', colors: ['#D71920', '#FFFFFF'] }, // colores no confirmados
        { name: 'Hajer', city: 'Hofuf', dept: 'Provincia Oriental', colors: ['#00843D', '#FFD100'] }, // colores no confirmados
      ],
    },
  ],
  sources: [
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_Saudi_Pro_League',
    'https://en.wikipedia.org/wiki/2025%E2%80%9326_Saudi_First_Division_League',
    'https://en.wikipedia.org/wiki/2025%E2%80%9326_Saudi_Second_Division_League',
    'https://en.wikipedia.org/wiki/Saudi_First_Division_League',
    'https://africasoccer.com/?p=594304',
    'https://en.wikipedia.org/wiki/Neom_SC',
    'https://en.wikipedia.org/wiki/Al-Faisaly_FC',
    'https://en.wikipedia.org/wiki/Al-Diriyah_Club',
    'https://en.wikipedia.org/w/index.php?title=Al_Fateh_SC&action=raw',
  ],
} satisfies CountryTeams;
