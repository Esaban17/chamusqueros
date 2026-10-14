// Honduras — temporada en curso al 2026-10-14 (Apertura 2026, temporada 2026-27). Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla tras la jornada 9, presupuesto e historia).
// Liga Nacional: 12 equipos (grupos Norte y Centro). Descendió Victoria; subió Estrella Roja (Danlí) e ingresó Independiente de Siguatepeque como invitado.
// Liga de Ascenso: 34 clubes confirmados en tres grupos (A centro-sur-oriente, B norte-occidente, C atlántico); la ficha oficial habla de 36.
// Colores de la mayoría de clubes de Ascenso aproximados.
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'Liga Nacional de Honduras',
      teams: [
        { name: 'Olimpia', city: 'Tegucigalpa', dept: 'Francisco Morazán', nickname: 'Los Leones', colors: ['#FFFFFF', '#0033A0'], stadium: 'Estadio Nacional Chelato Uclés', rival: 'Motagua' },
        { name: 'Real España', city: 'San Pedro Sula', dept: 'Cortés', nickname: 'La Máquina', colors: ['#FFD100', '#000000'], stadium: 'Estadio Francisco Morazán', rival: 'Marathón' },
        { name: 'Marathón', city: 'San Pedro Sula', dept: 'Cortés', nickname: 'El Monstruo Verde', colors: ['#00843D', '#FFFFFF'], stadium: 'Estadio Yankel Rosenthal', rival: 'Real España' },
        { name: 'Motagua', city: 'Tegucigalpa', dept: 'Francisco Morazán', nickname: 'Las Águilas Azules', colors: ['#002F87', '#FFFFFF'], stadium: 'Estadio Nacional Chelato Uclés', rival: 'Olimpia' },
        { name: 'Olancho FC', city: 'Juticalpa', dept: 'Olancho', nickname: 'Los Potros', colors: ['#FFFFFF', '#000000'], stadium: 'Estadio Juan Ramón Brevé' }, // colores no confirmados
        { name: 'Génesis PN', city: 'La Paz', dept: 'La Paz', colors: ['#6CACE4', '#FFFFFF'], stadium: 'Estadio Roberto Suazo Córdova' },
        { name: 'Independiente', city: 'Siguatepeque', dept: 'Comayagua', colors: ['#C8102E', '#000000'], stadium: 'Estadio Carlos Miranda' },
        { name: 'Lobos UPNFM', city: 'Tegucigalpa', dept: 'Francisco Morazán', nickname: 'Los Lobos', colors: ['#F57F20', '#003DA5'], stadium: 'Estadio Emilio Williams' }, // juega de local en Choluteca
        { name: 'Estrella Roja', city: 'Danlí', dept: 'El Paraíso', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Marcelo Tinoco' }, // colores no confirmados
        { name: 'Platense', city: 'Puerto Cortés', dept: 'Cortés', nickname: 'Los Escualos', colors: ['#FFFFFF', '#00843D'], stadium: 'Estadio Excélsior' },
        { name: 'Choloma', city: 'Choloma', dept: 'Cortés', colors: ['#003DA5', '#FFFFFF'], stadium: 'Estadio Rubén Deras' }, // colores no confirmados
        { name: 'Juticalpa FC', city: 'Juticalpa', dept: 'Olancho', colors: ['#FFD100', '#003DA5'], stadium: 'Estadio Juan Ramón Brevé' }, // colores no confirmados
      ],
    },
    {
      name: 'Liga de Ascenso de Honduras',
      teams: [
        { name: 'Victoria', city: 'La Ceiba', dept: 'Atlántida', nickname: 'La Jaiba Brava', colors: ['#003DA5', '#FFFFFF'], stadium: 'Estadio Ceibeño', rival: 'Vida' },
        { name: 'Vida', city: 'La Ceiba', dept: 'Atlántida', nickname: 'Los Cocoteros', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Ceibeño', rival: 'Victoria' },
        { name: 'Parrillas One', city: 'La Lima', dept: 'Cortés', colors: ['#003DA5', '#FFFFFF'], stadium: 'Estadio Luis Girón' }, // colores no confirmados
        { name: 'Palestino', city: 'Choloma', dept: 'Cortés', colors: ['#00843D', '#FFFFFF'], stadium: 'Estadio Rubén Deras' }, // colores no confirmados
        { name: 'Arsenal SAO', city: 'Cantarranas', dept: 'Francisco Morazán', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Francisco Gaitán Agüero' }, // colores no confirmados
        { name: 'FAS', city: 'San Lorenzo', dept: 'Valle', colors: ['#C8102E', '#003DA5'], stadium: 'Estadio Ángel Augusto Martínez' }, // colores no confirmados
        { name: 'Pumas', city: 'Las Vegas', dept: 'Santa Bárbara', colors: ['#002F6C', '#FFD100'], stadium: 'Estadio Municipal de Las Vegas' }, // colores no confirmados
        { name: 'Real Sociedad', city: 'Tocoa', dept: 'Colón', nickname: 'Los Aceiteros', colors: ['#FFFFFF', '#003DA5'], stadium: 'Estadio Francisco Martínez Durón' }, // colores no confirmados
        { name: 'Deportes Savio', city: 'Santa Rosa de Copán', dept: 'Copán', colors: ['#003DA5', '#FFFFFF'], stadium: 'Estadio Sergio Reyes' }, // colores no confirmados
        { name: 'Honduras Progreso', city: 'El Progreso', dept: 'Yoro', colors: ['#F57F20', '#000000'], stadium: 'Estadio Humberto Micheletti' }, // colores no confirmados
        { name: 'Hondupino', city: 'Trojes', dept: 'El Paraíso', colors: ['#00843D', '#FFFFFF'], stadium: 'Estadio Raúl Moncada' }, // colores no confirmados
        { name: 'Santa Rosa', city: 'La Masica', dept: 'Atlántida', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Masiqueño' }, // colores no confirmados
        { name: 'Juventus', city: 'Roatán', dept: 'Islas de la Bahía', colors: ['#000000', '#FFFFFF'], stadium: 'Estadio Rogelio Bustillo' }, // colores no confirmados
        { name: 'Social Sol', city: 'Olanchito', dept: 'Yoro', colors: ['#FFD100', '#C8102E'], stadium: 'Estadio San Jorge' }, // colores no confirmados
        { name: 'Gimnástico', city: 'Tegucigalpa', dept: 'Francisco Morazán', colors: ['#003DA5', '#FFFFFF'], stadium: 'Estadio Emilio Larach' }, // colores no confirmados
        { name: 'Real Tegus', city: 'Tegucigalpa', dept: 'Francisco Morazán', colors: ['#5B2C83', '#FFFFFF'], stadium: 'Estadio UPNFM' }, // colores no confirmados
        { name: 'Boca Juniors', city: 'Tocoa', dept: 'Colón', colors: ['#003DA5', '#FFD100'], stadium: 'Estadio Francisco Martínez Durón' }, // colores no confirmados
        { name: 'Brasilia', city: 'Río Lindo', dept: 'Cortés', colors: ['#FFD100', '#00843D'], stadium: 'Estadio Filiberto Fernández' }, // colores no confirmados
        { name: 'Juventud Yoreña', city: 'Yoro', dept: 'Yoro', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Olímpico Yoreño' }, // colores no confirmados
        { name: 'Cruz Azul Opoa', city: 'San Juan de Opoa', dept: 'Copán', colors: ['#0047BB', '#FFFFFF'], stadium: 'Estadio Copán Galel' }, // colores no confirmados
        { name: 'Suyapa', city: 'Villanueva', dept: 'Cortés', colors: ['#6CACE4', '#FFFFFF'], stadium: 'Estadio José Adrián Cruz' }, // colores no confirmados
        { name: 'Espartano', city: 'San José de Colinas', dept: 'Santa Bárbara', colors: ['#C8102E', '#000000'] }, // colores no confirmados
        { name: 'Cuervos', city: 'San Luis', dept: 'Santa Bárbara', colors: ['#000000', '#FFFFFF'], stadium: 'Estadio Fausto Rodríguez' }, // colores no confirmados
        { name: 'San Rafael', city: 'El Pedernal', dept: 'Francisco Morazán', colors: ['#003DA5', '#FFFFFF'], stadium: 'Estadio Maturave El Pedernal' }, // colores no confirmados
        { name: 'Meluca', city: 'Campamento', dept: 'Olancho', colors: ['#00843D', '#FFD100'], stadium: 'Estadio Cornelio Santos' }, // colores no confirmados
        { name: 'AFFI Academia', city: 'Choluteca', dept: 'Choluteca', colors: ['#003DA5', '#C8102E'], stadium: 'Estadio Emilio Williams' }, // colores no confirmados
        { name: 'Pirata', city: 'Nacaome', dept: 'Valle', colors: ['#000000', '#FFFFFF'], stadium: 'Estadio José Elías Nazar' }, // colores no confirmados
        { name: 'Cedeño', city: 'Marcovia', dept: 'Choluteca', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Monjaras' }, // colores no confirmados
        { name: 'Eagles Sport', city: 'Taulabé', dept: 'Comayagua', colors: ['#002F6C', '#FFFFFF'], stadium: 'Estadio Municipal de Taulabé' }, // colores no confirmados
        { name: 'INFOP', city: 'Tegucigalpa', dept: 'Francisco Morazán', colors: ['#003DA5', '#FFD100'], stadium: 'Estadio El Birichiche' }, // colores no confirmados
        { name: 'Municipal San Esteban', city: 'San Esteban', dept: 'Olancho', colors: ['#00843D', '#FFFFFF'], stadium: 'Estadio Boniteño' }, // colores no confirmados
        { name: 'Roma', city: 'Sonaguera', dept: 'Colón', colors: ['#7A2531', '#FFD100'], stadium: 'Estadio Juan de Dios Martínez' }, // colores no confirmados
        { name: 'Tela FC', city: 'Tela', dept: 'Atlántida', colors: ['#003DA5', '#FFFFFF'], stadium: 'Estadio Alfredo León Gómez' }, // colores no confirmados
        { name: 'Estrella FC', city: 'José Santos Guardiola', dept: 'Islas de la Bahía', colors: ['#FFD100', '#003DA5'], stadium: 'Estadio Carlos Calderón' }, // colores no confirmados
      ],
    },
  ],
  sources: [
    'https://www.espn.com/soccer/standings/_/league/hon.1',
    'https://es.wikipedia.org/wiki/Torneo_Apertura_2026_(Honduras)',
    'https://www.tunota.com/deportes/liga-nacional-confirma-torneo-de-12-equipos-para-la-temporada-2026-2027-2026-06-19',
    'https://www.laprensa.hn/deportes/liga-nacional-sorprende-anuncia-nuevo-equipo-invitado-atletico-independiente-PF31164920',
    'https://www.deportestvc.com/liga-nacional/victoria-descendido-de-la-primera-division-de-la-liga-nacional-de-honduras-2026-04-30',
    'https://es.wikipedia.org/wiki/Liga_de_Ascenso_de_Honduras',
    'https://www.elheraldo.hn/deportes/definidos-octavos-final-liga-ascenso-segunda-division-honduras-forman-NC32300805',
  ],
} satisfies CountryTeams;
