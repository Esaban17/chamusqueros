// Alemania — temporada en curso al 2026-10-14 (2026-27). Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla actual, presupuesto e historia).
// Ascendieron a la Bundesliga: Schalke 04, Elversberg (debut) y Paderborn (play-off ante Wolfsburgo).
// Descendieron: Wolfsburgo, Heidenheim y St. Pauli. A la 2. Bundesliga subieron Osnabrück y Energie Cottbus;
// bajaron a la 3. Liga Fortuna Düsseldorf y Preußen Münster.
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'Bundesliga',
      teams: [
        { name: 'Bayern Múnich', city: 'Múnich', dept: 'Baviera', nickname: 'Der Rekordmeister', colors: ['#DC052D', '#FFFFFF'], stadium: 'Allianz Arena', rival: 'Borussia Dortmund' },
        { name: 'Borussia Dortmund', city: 'Dortmund', dept: 'Renania del Norte-Westfalia', nickname: 'Die Schwarzgelben', colors: ['#FDE100', '#000000'], stadium: 'Signal Iduna Park', rival: 'Schalke 04' },
        { name: 'Bayer Leverkusen', city: 'Leverkusen', dept: 'Renania del Norte-Westfalia', nickname: 'Die Werkself', colors: ['#E32221', '#000000'], stadium: 'BayArena' },
        { name: 'RB Leipzig', city: 'Leipzig', dept: 'Sajonia', nickname: 'Die Roten Bullen', colors: ['#FFFFFF', '#DD0741'], stadium: 'Red Bull Arena' },
        { name: 'Friburgo', city: 'Friburgo', dept: 'Baden-Wurtemberg', nickname: 'Breisgau-Brasilianer', colors: ['#E2001A', '#000000'], stadium: 'Europa-Park Stadion' },
        { name: 'Stuttgart', city: 'Stuttgart', dept: 'Baden-Wurtemberg', nickname: 'Die Schwaben', colors: ['#FFFFFF', '#E32219'], stadium: 'MHPArena' },
        { name: 'Eintracht Fráncfort', city: 'Fráncfort', dept: 'Hesse', nickname: 'Die Adler', colors: ['#E1000F', '#000000'], stadium: 'Deutsche Bank Park' },
        { name: 'Hoffenheim', city: 'Sinsheim', dept: 'Baden-Wurtemberg', colors: ['#1961B5', '#FFFFFF'], stadium: 'PreZero Arena' },
        { name: 'Augsburgo', city: 'Augsburgo', dept: 'Baviera', nickname: 'Die Fuggerstädter', colors: ['#BA3733', '#46714D'], stadium: 'WWK Arena' },
        { name: 'Werder Bremen', city: 'Bremen', dept: 'Bremen', nickname: 'Die Werderaner', colors: ['#1D9053', '#FFFFFF'], stadium: 'Weserstadion', rival: 'Hamburgo' },
        { name: 'Mainz 05', city: 'Maguncia', dept: 'Renania-Palatinado', nickname: 'Die Nullfünfer', colors: ['#C3141E', '#FFFFFF'], stadium: 'MEWA Arena' },
        { name: 'Colonia', city: 'Colonia', dept: 'Renania del Norte-Westfalia', nickname: 'Die Geißböcke', colors: ['#FFFFFF', '#ED1C24'], stadium: 'RheinEnergieStadion', rival: 'Borussia Mönchengladbach' },
        { name: 'Borussia Mönchengladbach', city: 'Mönchengladbach', dept: 'Renania del Norte-Westfalia', nickname: 'Die Fohlen', colors: ['#FFFFFF', '#1A8F3C'], stadium: 'Borussia-Park', rival: 'Colonia' },
        { name: 'Hamburgo', city: 'Hamburgo', dept: 'Hamburgo', nickname: 'Der Dino', colors: ['#FFFFFF', '#0A3F86'], stadium: 'Volksparkstadion', rival: 'Werder Bremen' },
        { name: 'Schalke 04', city: 'Gelsenkirchen', dept: 'Renania del Norte-Westfalia', nickname: 'Die Königsblauen', colors: ['#004D9D', '#FFFFFF'], stadium: 'Veltins-Arena', rival: 'Borussia Dortmund' },
        { name: 'Union Berlín', city: 'Berlín', dept: 'Berlín', nickname: 'Die Eisernen', colors: ['#EB1923', '#FFFFFF'], stadium: 'Stadion An der Alten Försterei' },
        { name: 'Elversberg', city: 'Spiesen-Elversberg', dept: 'Sarre', nickname: 'Die Elv', colors: ['#000000', '#FFFFFF'], stadium: 'Waldstadion an der Kaiserlinde' },
        { name: 'Paderborn', city: 'Paderborn', dept: 'Renania del Norte-Westfalia', colors: ['#005CA9', '#000000'], stadium: 'Home Deluxe Arena' },
      ],
    },
    {
      name: '2. Bundesliga',
      teams: [
        { name: 'Hertha Berlín', city: 'Berlín', dept: 'Berlín', nickname: 'Die Alte Dame', colors: ['#005CA9', '#FFFFFF'], stadium: 'Olympiastadion' },
        { name: 'Wolfsburgo', city: 'Wolfsburgo', dept: 'Baja Sajonia', nickname: 'Die Wölfe', colors: ['#65B32E', '#FFFFFF'], stadium: 'Volkswagen Arena' },
        { name: 'St. Pauli', city: 'Hamburgo', dept: 'Hamburgo', nickname: 'Kiezkicker', colors: ['#6B4423', '#FFFFFF'], stadium: 'Millerntor-Stadion' },
        { name: 'Heidenheim', city: 'Heidenheim', dept: 'Baden-Wurtemberg', colors: ['#E2001A', '#003B79'], stadium: 'Voith-Arena' },
        { name: 'Núremberg', city: 'Núremberg', dept: 'Baviera', nickname: 'Der Club', colors: ['#AA1124', '#000000'], stadium: 'Max-Morlock-Stadion', rival: 'Greuther Fürth' },
        { name: 'Kaiserslautern', city: 'Kaiserslautern', dept: 'Renania-Palatinado', nickname: 'Die Roten Teufel', colors: ['#E2001A', '#FFFFFF'], stadium: 'Fritz-Walter-Stadion' },
        { name: 'Magdeburgo', city: 'Magdeburgo', dept: 'Sajonia-Anhalt', colors: ['#0052A5', '#FFFFFF'], stadium: 'Avnet Arena' },
        { name: 'Hannover 96', city: 'Hanóver', dept: 'Baja Sajonia', nickname: 'Die Roten', colors: ['#C8102E', '#000000'], stadium: 'Heinz von Heiden Arena', rival: 'Eintracht Braunschweig' },
        { name: 'Bochum', city: 'Bochum', dept: 'Renania del Norte-Westfalia', colors: ['#005BA4', '#FFFFFF'], stadium: 'Vonovia Ruhrstadion' },
        { name: 'Arminia Bielefeld', city: 'Bielefeld', dept: 'Renania del Norte-Westfalia', colors: ['#004E95', '#000000'], stadium: 'Schüco-Arena' },
        { name: 'Darmstadt 98', city: 'Darmstadt', dept: 'Hesse', nickname: 'Die Lilien', colors: ['#004E9F', '#FFFFFF'], stadium: 'Merck-Stadion am Böllenfalltor' },
        { name: 'Holstein Kiel', city: 'Kiel', dept: 'Schleswig-Holstein', nickname: 'Die Störche', colors: ['#003D86', '#FFFFFF'], stadium: 'Holstein-Stadion' },
        { name: 'Eintracht Braunschweig', city: 'Brunswick', dept: 'Baja Sajonia', nickname: 'Die Löwen', colors: ['#FFD700', '#004A99'], stadium: 'Eintracht-Stadion', rival: 'Hannover 96' },
        { name: 'Energie Cottbus', city: 'Cottbus', dept: 'Brandeburgo', colors: ['#E2001A', '#FFFFFF'], stadium: 'LEAG Energie Stadion' },
        { name: 'Karlsruhe', city: 'Karlsruhe', dept: 'Baden-Wurtemberg', colors: ['#0053A0', '#FFFFFF'], stadium: 'BBBank Wildpark' },
        { name: 'Greuther Fürth', city: 'Fürth', dept: 'Baviera', nickname: 'Kleeblatt', colors: ['#008D3F', '#FFFFFF'], stadium: 'Sportpark Ronhof Thomas Sommer', rival: 'Núremberg' },
        { name: 'Osnabrück', city: 'Osnabrück', dept: 'Baja Sajonia', nickname: 'Die Lila-Weißen', colors: ['#5A2B81', '#FFFFFF'], stadium: 'Stadion an der Bremer Brücke' },
        { name: 'Dynamo Dresde', city: 'Dresde', dept: 'Sajonia', colors: ['#FFD700', '#000000'], stadium: 'Rudolf-Harbig-Stadion' },
      ],
    },
  ],
  sources: [
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_Bundesliga',
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_2._Bundesliga',
    'https://www.diefalsche9.de/die-teilnehmer-der-2-bundesliga-2026-27/',
    'https://de.wikipedia.org/wiki/SV_07_Elversberg',
    'https://de.wikipedia.org/wiki/SC_Paderborn_07',
  ],
} satisfies CountryTeams;
