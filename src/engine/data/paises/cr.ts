// Costa Rica — temporada en curso al 2026-10-14 (Apertura 2026, temporada 2026-27). Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla tras ~10 jornadas, presupuesto e historia).
// Primera: 10 equipos. Municipal Liberia y Guanacasteca sin licencia; ascendió Inter San Carlos; Escorpiones Belén ganó en la mesa el repechaje ante Guadalupe.
// Liga de Ascenso 2026-27: 15 equipos en dos grupos (A: Palmares, Grecia, Jicaral, Quepos, Rosario, Sarchí, Santa Cruz; B: el resto).
// Colores de la mayoría de clubes de Ascenso aproximados.
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'Primera División de Costa Rica',
      teams: [
        { name: 'Saprissa', city: 'Tibás', dept: 'San José', nickname: 'El Monstruo Morado', colors: ['#5B2C83', '#FFFFFF'], stadium: 'Estadio Ricardo Saprissa', rival: 'Alajuelense' },
        { name: 'Alajuelense', city: 'Alajuela', dept: 'Alajuela', nickname: 'La Liga', colors: ['#D2001E', '#000000'], stadium: 'Estadio Alejandro Morera Soto', rival: 'Saprissa' },
        { name: 'Cartaginés', city: 'Cartago', dept: 'Cartago', nickname: 'Los Brumosos', colors: ['#0033A0', '#FFFFFF'], stadium: 'Estadio José Rafael "Fello" Meza' },
        { name: 'Herediano', city: 'Heredia', dept: 'Heredia', nickname: 'El Team', colors: ['#D52B1E', '#FFD100'] },
        { name: 'Sporting FC', city: 'San José', dept: 'San José', colors: ['#FFFFFF', '#000000'], stadium: 'Estadio Ernesto Rohrmoser' }, // colores no confirmados
        { name: 'San Carlos', city: 'Ciudad Quesada', dept: 'Alajuela', nickname: 'Los Toros del Norte', colors: ['#0047AB', '#FFFFFF'], stadium: 'Estadio Carlos Ugalde Álvarez' },
        { name: 'Inter San Carlos', city: 'Ciudad Quesada', dept: 'Alajuela', colors: ['#000000', '#0047AB'] }, // ciudad y colores no confirmados
        { name: 'Puntarenas', city: 'Puntarenas', dept: 'Puntarenas', nickname: 'Los Chuchequeros', colors: ['#F57F20', '#FFFFFF'], stadium: 'Estadio Miguel "Lito" Pérez' },
        { name: 'Pérez Zeledón', city: 'San Isidro de El General', dept: 'San José', nickname: 'Los Guerreros del Sur', colors: ['#FFFFFF', '#5B2C83'], stadium: 'Estadio Municipal de Pérez Zeledón' }, // colores no confirmados
        { name: 'Escorpiones Belén', city: 'Belén', dept: 'Heredia', nickname: 'Los Escorpiones', colors: ['#FFD100', '#000000'], stadium: 'Estadio Rafael Bolaños' }, // colores no confirmados; juega en El Coyol, Alajuela
      ],
    },
    {
      name: 'Liga de Ascenso de Costa Rica',
      teams: [
        { name: 'Guadalupe', city: 'Guadalupe', dept: 'San José', nickname: 'Los Guadalupanos', colors: ['#FFD100', '#003DA5'] },
        { name: 'Jicaral', city: 'Jicaral', dept: 'Puntarenas', colors: ['#C8102E', '#FFFFFF'] }, // colores no confirmados
        { name: 'Santa Ana', city: 'Santa Ana', dept: 'San José', colors: ['#00843D', '#FFFFFF'] }, // colores no confirmados
        { name: 'Grecia', city: 'Grecia', dept: 'Alajuela', nickname: 'Los Leones', colors: ['#C8102E', '#000000'] },
        { name: 'Carmelita', city: 'Alajuela', dept: 'Alajuela', nickname: 'Los Verdolagas', colors: ['#00843D', '#FFFFFF'] },
        { name: 'Pococí', city: 'Guápiles', dept: 'Limón', colors: ['#FFD100', '#00843D'] }, // colores no confirmados
        { name: 'Palmares', city: 'Palmares', dept: 'Alajuela', colors: ['#FFFFFF', '#C8102E'] }, // colores no confirmados
        { name: 'Sarchí', city: 'Sarchí', dept: 'Alajuela', colors: ['#003DA5', '#FFFFFF'] }, // colores no confirmados
        { name: 'Uruguay de Coronado', city: 'San Isidro de Coronado', dept: 'San José', colors: ['#6CACE4', '#FFFFFF'] },
        { name: 'Aserrí', city: 'Aserrí', dept: 'San José', colors: ['#C8102E', '#FFFFFF'] }, // colores no confirmados
        { name: 'Quepos', city: 'Quepos', dept: 'Puntarenas', colors: ['#003DA5', '#FFD100'] }, // colores no confirmados
        { name: 'Santa Cruz', city: 'Santa Cruz', dept: 'Guanacaste', colors: ['#003DA5', '#FFFFFF'] }, // colores no confirmados
        { name: 'Moravia', city: 'San Vicente de Moravia', dept: 'San José', colors: ['#5B2C83', '#FFFFFF'] }, // colores no confirmados
        { name: 'Pitbull', city: 'San José', dept: 'San José', colors: ['#000000', '#C8102E'] }, // ciudad y colores no confirmados
        { name: 'Rosario', city: 'Rosario', dept: 'Alajuela', colors: ['#003DA5', '#FFFFFF'] }, // ciudad y colores no confirmados; campeón de la Liga Aficionada
      ],
    },
  ],
  sources: [
    'https://www.espn.com/soccer/standings/_/league/crc.1',
    'https://www.teletica.com/municipal-liberia/liberia-queda-fuera-del-apertura-2026-por-incumplimientos-legales_412676',
    'https://www.teletica.com/escorpiones-fc/escorpiones-e-inter-san-carlos-quieren-romper-racha-de-equipos-que-descienden-tras-llegar-a-primera_414165',
    'https://www.teletica.com/liga-de-ascenso/inter-san-carlos-lo-consigue-y-es-el-nuevo-inquilino-de-la-primera-division_409330',
    'https://crhoy.com/deportes/escorpiones-define-su-casa-para-el-torneo-de-apertura-2026/',
    'https://crhoy.com/deportes/liga-de-ascenso-inicia-su-camino-estos-son-todos-los-detalles/',
  ],
} satisfies CountryTeams;
