// Ecuador — temporada en curso al 2026-10-14 (LigaPro 2026, fases finales). Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla actual, presupuesto e historia).
// Serie A: ascendieron Guayaquil City y Leones FC; El Nacional descendió por sanción administrativa (FEF), lo que salvó a Técnico Universitario.
// Serie B: ascendieron Liga de Portoviejo y Cuenca Juniors (Segunda Categoría); descendieron El Nacional y Vinotinto (Serie A).
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'LigaPro Serie A',
      teams: [
        { name: 'Independiente del Valle', city: 'Sangolquí', dept: 'Pichincha', nickname: 'Los Rayados del Valle', colors: ['#0A1F44', '#FFFFFF'], stadium: 'Estadio Banco Guayaquil' },
        { name: 'Liga de Quito', city: 'Quito', dept: 'Pichincha', nickname: 'Los Albos', colors: ['#FFFFFF', '#C8102E'], stadium: 'Estadio Rodrigo Paz Delgado', rival: 'Aucas' },
        { name: 'Barcelona SC', city: 'Guayaquil', dept: 'Guayas', nickname: 'El Ídolo del Astillero', colors: ['#FFD100', '#000000'], stadium: 'Estadio Monumental Banco Pichincha', rival: 'Emelec' },
        { name: 'Universidad Católica', city: 'Quito', dept: 'Pichincha', nickname: 'Los Camaratas', colors: ['#5BC2E7', '#FFFFFF'], stadium: 'Estadio Olímpico Atahualpa' },
        { name: 'Aucas', city: 'Quito', dept: 'Pichincha', nickname: 'Los Orientales', colors: ['#FFD100', '#C8102E'], stadium: 'Estadio Gonzalo Pozo Ripalda', rival: 'Liga de Quito' },
        { name: 'Macará', city: 'Ambato', dept: 'Tungurahua', nickname: 'La Celeste', colors: ['#6CACE4', '#FFFFFF'], stadium: 'Estadio Bellavista', rival: 'Técnico Universitario' },
        { name: 'Emelec', city: 'Guayaquil', dept: 'Guayas', nickname: 'Los Eléctricos', colors: ['#0033A0', '#FFFFFF'], stadium: 'Estadio George Capwell', rival: 'Barcelona SC' },
        { name: 'Libertad FC', city: 'Loja', dept: 'Loja', nickname: 'La Naranja', colors: ['#F47920', '#FFFFFF'], stadium: 'Estadio Reina del Cisne' },
        { name: 'Guayaquil City', city: 'Guayaquil', dept: 'Guayas', nickname: 'Los Ciudadanos', colors: ['#5BC2E7', '#FFFFFF'], stadium: 'Estadio Christian Benítez Betancourt' },
        { name: 'Leones FC', city: 'Atuntaqui', dept: 'Imbabura', nickname: 'La Manada', colors: ['#FFD100', '#000000'] }, // colores no confirmados
        { name: 'Mushuc Runa', city: 'Ambato', dept: 'Tungurahua', nickname: 'El Ponchito', colors: ['#C8102E', '#007A33'], stadium: 'Estadio COAC Mushuc Runa' }, // colores no confirmados (blanco, verde y rojo)
        { name: 'Deportivo Cuenca', city: 'Cuenca', dept: 'Azuay', nickname: 'El Expreso Austral', colors: ['#C8102E', '#000000'], stadium: 'Estadio Alejandro Serrano Aguilar' },
        { name: 'Orense', city: 'Machala', dept: 'El Oro', nickname: 'Los Bananeros', colors: ['#007A33', '#FFFFFF'], stadium: 'Estadio 9 de Mayo' },
        { name: 'Técnico Universitario', city: 'Ambato', dept: 'Tungurahua', nickname: 'El Rodillo Rojo', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Bellavista', rival: 'Macará' },
        { name: 'Delfín', city: 'Manta', dept: 'Manabí', nickname: 'Los Cetáceos', colors: ['#FFD100', '#0033A0'], stadium: 'Estadio Jocay', rival: 'Manta FC' },
        { name: 'Manta FC', city: 'Manta', dept: 'Manabí', nickname: 'Los Atuneros', colors: ['#5BC2E7', '#FFFFFF'], stadium: 'Estadio Jocay', rival: 'Delfín' },
      ],
    },
    {
      name: 'LigaPro Serie B',
      teams: [
        { name: 'Vinotinto', city: 'Quito', dept: 'Pichincha', colors: ['#7B1E2B', '#FFFFFF'] },
        // Ex Atlético Vinotinto / Atlético JBG, trasladado a Guayaquil; Wikipedia lo lista como "Atlético Rojiblanco".
        { name: 'Atlético FC', city: 'Guayaquil', dept: 'Guayas', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Christian Benítez Betancourt' },
        // Filial de Independiente del Valle: no puede ascender.
        { name: 'Independiente Juniors', city: 'Sangolquí', dept: 'Pichincha', colors: ['#0A1F44', '#FFFFFF'] },
        { name: '9 de Octubre', city: 'La Troncal', dept: 'Cañar', nickname: 'Los Octubrinos', colors: ['#FFFFFF', '#5BC2E7'], stadium: 'Estadio Municipal de La Troncal' },
        { name: 'Cuenca Juniors', city: 'Cuenca', dept: 'Azuay', nickname: 'Los Gallos', colors: ['#0033A0', '#C9A227'], stadium: 'Estadio Alejandro Serrano Aguilar' },
        // Sancionado con resta de puntos; descendido a Segunda Categoría 2027 según Wikipedia.
        { name: 'El Nacional', city: 'Quito', dept: 'Pichincha', nickname: 'Los Puros Criollos', colors: ['#C8102E', '#0033A0'], stadium: 'Estadio Olímpico Atahualpa' },
        { name: 'San Antonio', city: 'Ibarra', dept: 'Imbabura', nickname: 'El Santo', colors: ['#FFFFFF', '#0033A0'], stadium: 'Estadio Olímpico de Ibarra' }, // colores no confirmados
        { name: 'Gualaceo', city: 'Gualaceo', dept: 'Azuay', nickname: 'El Guala', colors: ['#007A33', '#FFD100'], stadium: 'Estadio Gerardo León Pozo' },
        { name: 'Liga de Portoviejo', city: 'Portoviejo', dept: 'Manabí', nickname: 'La Capira', colors: ['#FFFFFF', '#007A33'], stadium: 'Estadio Reales Tamarindos' },
        // Ex Vargas Torres (cupo comprado y trasladado a Santo Domingo).
        { name: 'Deportivo Santo Domingo', city: 'Santo Domingo', dept: 'Santo Domingo de los Tsáchilas', colors: ['#007A33', '#FFFFFF'], stadium: 'Estadio Etho Vega Baquero' }, // colores no confirmados
        { name: 'Cumbayá', city: 'Quito', dept: 'Pichincha', colors: ['#30C5C5', '#000000'] },
        { name: '22 de Julio', city: 'Esmeraldas', dept: 'Esmeraldas', colors: ['#0033A0', '#FFFFFF'], stadium: 'Estadio Folke Anderson' }, // colores no confirmados
      ],
    },
  ],
  sources: [
    'https://www.teleamazonas.com/deportes/futbol/ligapro/asi-quedaron-hexagonales-cuadrangular-ligapro-2026-fecha-127822/',
    'https://www.metroecuador.com.ec/deportes/2026/09/14/asi-queda-la-tabla-de-ligapro-tras-30-fechas-idv-domina-y-barcelona-sc-se-mete-al-hexagonal-final/',
    'https://en.wikipedia.org/wiki/2026_LigaPro_Serie_A',
    'https://primicias.ec/deportes/ligapro/tabla-posiciones-seriea-ecuador-calendario-partidos-horarios-116252',
    'https://www.extra.ec/noticia/deportes/ligapro-ascendidos-descendidos-temporada-2026-143402.html',
    'https://es.wikipedia.org/wiki/Serie_B_de_Ecuador_2026',
    'https://www.eldiario.ec/deportes/serie-b-2026-liga-de-portoviejo-retorna-y-atletico-jbg-tramita-cambio-de-nombre-tras-desvinculacion-de-vinotinto-20012026/',
    'https://www.elcomercio.com/deportes/futbol/serieb-ecuador-equipos-opciones-ascenso/',
    'https://es.wikipedia.org/wiki/Libertad_Fútbol_Club_(Ecuador)',
    'https://es.wikipedia.org/wiki/Orense_Sporting_Club',
    'https://es.wikipedia.org/wiki/Manta_Fútbol_Club',
    'https://es.wikipedia.org/wiki/Mushuc_Runa_Sporting_Club',
    'https://en.wikipedia.org/wiki/Leones_F.C._(Ecuador)',
    'https://es.wikipedia.org/wiki/Club_Deportivo_Cuenca_Juniors',
    'https://es.wikipedia.org/wiki/Gualaceo_Sporting_Club',
    'https://es.wikipedia.org/wiki/Liga_Deportiva_Universitaria_de_Portoviejo',
    'https://es.wikipedia.org/wiki/Cumbayá_Fútbol_Club',
    'https://es.wikipedia.org/wiki/9_de_Octubre_Fútbol_Club',
    'https://es.wikipedia.org/wiki/San_Antonio_Fútbol_Club',
  ],
} satisfies CountryTeams;
