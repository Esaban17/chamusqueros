// Francia — temporada en curso al 2026-10-14 (2026-27). Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla actual, presupuesto e historia).
// Ascendieron a la Ligue 1: Troyes y Le Mans; descendieron Metz y Nantes (Niza se salvó en el play-off ante Saint-Étienne).
// A la Ligue 2 subieron Dijon y Sochaux; bajaron Bastia y Amiens.
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'Ligue 1',
      teams: [
        { name: 'París Saint-Germain', city: 'París', dept: 'Isla de Francia', nickname: 'Les Parisiens', colors: ['#004170', '#DA291C'], stadium: 'Parc des Princes', rival: 'Olympique de Marsella' },
        { name: 'Mónaco', city: 'Mónaco', dept: 'Mónaco', nickname: 'Les Monégasques', colors: ['#E51B22', '#FFFFFF'], stadium: 'Stade Louis II', rival: 'Niza' },
        { name: 'Olympique de Marsella', city: 'Marsella', dept: 'Provenza-Alpes-Costa Azul', nickname: 'Les Phocéens', colors: ['#FFFFFF', '#2FAEE0'], stadium: 'Stade Vélodrome', rival: 'París Saint-Germain' },
        { name: 'Lille', city: 'Lille', dept: 'Altos de Francia', nickname: 'Les Dogues', colors: ['#E01E13', '#1F2C5C'], stadium: 'Stade Pierre-Mauroy', rival: 'Lens' },
        { name: 'Olympique de Lyon', city: 'Lyon', dept: 'Auvernia-Ródano-Alpes', nickname: 'Les Gones', colors: ['#FFFFFF', '#1D3A8F'], stadium: 'Groupama Stadium' },
        { name: 'Lens', city: 'Lens', dept: 'Altos de Francia', nickname: 'Les Sang et Or', colors: ['#FFD100', '#E30613'], stadium: 'Stade Bollaert-Delelis', rival: 'Lille' },
        { name: 'Rennes', city: 'Rennes', dept: 'Bretaña', nickname: 'Les Rouge et Noir', colors: ['#E13327', '#000000'], stadium: 'Roazhon Park' },
        { name: 'Niza', city: 'Niza', dept: 'Provenza-Alpes-Costa Azul', nickname: 'Les Aiglons', colors: ['#C8102E', '#000000'], stadium: 'Allianz Riviera', rival: 'Mónaco' },
        { name: 'Estrasburgo', city: 'Estrasburgo', dept: 'Gran Este', nickname: 'Le Racing', colors: ['#009FE3', '#FFFFFF'], stadium: 'Stade de la Meinau' },
        { name: 'París FC', city: 'París', dept: 'Isla de Francia', colors: ['#1B2A4A', '#FFFFFF'], stadium: 'Stade Jean-Bouin', rival: 'París Saint-Germain' },
        { name: 'Brest', city: 'Brest', dept: 'Bretaña', nickname: 'Les Pirates', colors: ['#E30613', '#FFFFFF'], stadium: 'Stade Francis-Le Blé' },
        { name: 'Toulouse', city: 'Toulouse', dept: 'Occitania', nickname: 'Le Téfécé', colors: ['#5A2A82', '#FFFFFF'], stadium: 'Stadium de Toulouse' },
        { name: 'Lorient', city: 'Lorient', dept: 'Bretaña', nickname: 'Les Merlus', colors: ['#F47920', '#000000'], stadium: 'Stade du Moustoir' },
        { name: 'Angers', city: 'Angers', dept: 'Países del Loira', nickname: 'Le SCO', colors: ['#000000', '#FFFFFF'], stadium: 'Stade Raymond-Kopa' },
        { name: 'Auxerre', city: 'Auxerre', dept: 'Borgoña-Franco Condado', nickname: "L'AJA", colors: ['#FFFFFF', '#004B98'], stadium: "Stade de l'Abbé-Deschamps" },
        { name: 'Le Havre', city: 'El Havre', dept: 'Normandía', nickname: 'Les Ciel et Marine', colors: ['#0B2B5B', '#7BB6E1'], stadium: 'Stade Océane' },
        { name: 'Le Mans', city: 'Le Mans', dept: 'Países del Loira', nickname: 'Les Sang et Or', colors: ['#E30613', '#FFD100'], stadium: 'Stade Marie-Marvingt' },
        { name: 'Troyes', city: 'Troyes', dept: 'Gran Este', nickname: "L'ESTAC", colors: ['#0055A4', '#FFFFFF'], stadium: "Stade de l'Aube" },
      ],
    },
    {
      name: 'Ligue 2',
      teams: [
        { name: 'Saint-Étienne', city: 'Saint-Étienne', dept: 'Auvernia-Ródano-Alpes', nickname: 'Les Verts', colors: ['#009A44', '#FFFFFF'], stadium: 'Stade Geoffroy-Guichard' },
        { name: 'Nantes', city: 'Nantes', dept: 'Países del Loira', nickname: 'Les Canaris', colors: ['#FCDD09', '#00843D'], stadium: 'Stade de la Beaujoire' },
        { name: 'Metz', city: 'Metz', dept: 'Gran Este', nickname: 'Les Grenats', colors: ['#7A1B2E', '#FFFFFF'], stadium: 'Stade Saint-Symphorien', rival: 'Nancy' },
        { name: 'Montpellier', city: 'Montpellier', dept: 'Occitania', nickname: 'La Paillade', colors: ['#00285E', '#F26F21'], stadium: 'Stade de la Mosson' },
        { name: 'Reims', city: 'Reims', dept: 'Gran Este', nickname: 'Les Rouge et Blanc', colors: ['#E30613', '#FFFFFF'], stadium: 'Stade Auguste-Delaune' },
        { name: 'Red Star', city: 'Saint-Ouen', dept: 'Isla de Francia', nickname: "L'Étoile Rouge", colors: ['#00843D', '#FFFFFF'], stadium: 'Stade Bauer' },
        { name: 'Nancy', city: 'Nancy', dept: 'Gran Este', nickname: "L'ASNL", colors: ['#FFFFFF', '#E2001A'], stadium: 'Stade Marcel-Picot', rival: 'Metz' },
        { name: 'Annecy', city: 'Annecy', dept: 'Auvernia-Ródano-Alpes', colors: ['#E30613', '#FFFFFF'], stadium: 'Parc des Sports' },
        { name: 'Dijon', city: 'Dijon', dept: 'Borgoña-Franco Condado', nickname: 'Le DFCO', colors: ['#E30613', '#FFFFFF'], stadium: 'Stade Gaston-Gérard' },
        { name: 'Sochaux', city: 'Montbéliard', dept: 'Borgoña-Franco Condado', nickname: 'Les Lionceaux', colors: ['#FFD100', '#003DA5'], stadium: 'Stade Auguste-Bonal' },
        { name: 'Pau', city: 'Pau', dept: 'Nueva Aquitania', nickname: 'Les Maynats', colors: ['#FFD100', '#003DA5'], stadium: 'Nouste Camp' },
        { name: 'Guingamp', city: 'Guingamp', dept: 'Bretaña', nickname: 'En Avant', colors: ['#E30613', '#000000'], stadium: 'Stade de Roudourou' },
        { name: 'Grenoble', city: 'Grenoble', dept: 'Auvernia-Ródano-Alpes', colors: ['#0055A4', '#FFFFFF'], stadium: 'Stade des Alpes' },
        { name: 'Dunkerque', city: 'Dunkerque', dept: 'Altos de Francia', colors: ['#0055A4', '#FFFFFF'], stadium: 'Stade Marcel-Tribut' },
        { name: 'Clermont', city: 'Clermont-Ferrand', dept: 'Auvernia-Ródano-Alpes', colors: ['#C8102E', '#002F6C'], stadium: 'Stade Gabriel-Montpied' },
        { name: 'Rodez', city: 'Rodez', dept: 'Occitania', colors: ['#E2001A', '#FFD700'], stadium: 'Stade Paul-Lignon' },
        { name: 'Boulogne', city: 'Boulogne-sur-Mer', dept: 'Altos de Francia', colors: ['#E30613', '#000000'], stadium: 'Stade de la Libération' },
        { name: 'Laval', city: 'Laval', dept: 'Países del Loira', nickname: 'Les Tango', colors: ['#F47920', '#000000'], stadium: 'Stade Francis-Le Basser' },
      ],
    },
  ],
  sources: [
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_Ligue_1',
    'https://en.wikipedia.org/wiki/2026%E2%80%9327_Ligue_2',
    'https://www.liguesdefoot.fr/en/championnats/2026-2027/national/ligue-2.md',
    'https://www.maxifoot.fr/info-461005_260731/football.php',
  ],
} satisfies CountryTeams;
