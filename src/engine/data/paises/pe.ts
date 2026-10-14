// Perú — temporada 2026 en curso al 2026-10-14 (Liga1 Te Apuesto 2026, Torneo Clausura; Liga2 2026). Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla acumulada actual, presupuesto e historia).
// Ascendieron FC Cajamarca y Deportivo Moquegua; descendieron Ayacucho FC y Alianza Universidad; Binacional fue descalificado (2025).
// Liga 2: 18 inscritos; FC San Marcos (Huaraz) se retiró en abril de 2026 y no se incluye (17 clubes activos).
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'Liga 1 de Perú',
      teams: [
        { name: 'Alianza Lima', city: 'Lima', dept: 'Lima', nickname: 'Los Íntimos', colors: ['#002D72', '#FFFFFF'], stadium: 'Estadio Alejandro Villanueva', rival: 'Universitario' },
        { name: 'Universitario', city: 'Lima', dept: 'Lima', nickname: 'Los Cremas', colors: ['#F3E5C0', '#8B0000'], stadium: 'Estadio Monumental', rival: 'Alianza Lima' },
        { name: 'Sporting Cristal', city: 'Lima', dept: 'Lima', nickname: 'Los Celestes', colors: ['#6CACE4', '#FFFFFF'], stadium: 'Estadio Alberto Gallardo' },
        { name: 'Melgar', city: 'Arequipa', dept: 'Arequipa', nickname: 'El Dominó', colors: ['#C8102E', '#000000'], stadium: 'Estadio Monumental de la UNSA' },
        { name: 'Cienciano', city: 'Cusco', dept: 'Cusco', nickname: 'El Papá', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Inca Garcilaso de la Vega', rival: 'Deportivo Garcilaso' },
        { name: 'Deportivo Garcilaso', city: 'Cusco', dept: 'Cusco', nickname: 'El Vendaval Celeste', colors: ['#5BC6FF', '#FFFFFF'], stadium: 'Estadio Inca Garcilaso de la Vega', rival: 'Cienciano' },
        { name: 'Cusco FC', city: 'Cusco', dept: 'Cusco', nickname: 'Los Dorados', colors: ['#EACF75', '#000000'], stadium: 'Estadio Inca Garcilaso de la Vega' },
        { name: 'Alianza Atlético', city: 'Sullana', dept: 'Piura', nickname: 'Los Churres', colors: ['#FFFFFF', '#0033BB'], stadium: 'Estadio Campeones del 36' },
        { name: 'Los Chankas', city: 'Andahuaylas', dept: 'Apurímac', nickname: 'Los Guerreros Chankas', colors: ['#7B0431', '#0F366A'], stadium: 'Estadio Los Chankas' },
        { name: 'Sport Huancayo', city: 'Huancayo', dept: 'Junín', nickname: 'El Rojo Matador', colors: ['#E00013', '#FFFFFF'], stadium: 'Estadio Huancayo' },
        { name: 'Sport Boys', city: 'Callao', dept: 'Callao', nickname: 'La Misilera', colors: ['#F7A1C4', '#000000'], stadium: 'Estadio Miguel Grau' },
        { name: 'Juan Pablo II College', city: 'Chongoyape', dept: 'Lambayeque', nickname: 'Los Auriblancos', colors: ['#FFFFFF', '#FFD100'], stadium: 'Complejo Deportivo Juan Pablo II' },
        { name: 'Atlético Grau', city: 'Piura', dept: 'Piura', nickname: 'Los Albos', colors: ['#FFFFFF', '#C8102E'] },
        { name: 'Comerciantes Unidos', city: 'Cutervo', dept: 'Cajamarca', nickname: 'Las Águilas Cutervinas', colors: ['#2E0C7E', '#FFFFFF'], stadium: 'Estadio Juan Maldonado Gamarra' },
        { name: 'FC Cajamarca', city: 'Cajamarca', dept: 'Cajamarca', nickname: 'Azul y Oro', colors: ['#FFE600', '#0033A0'], stadium: 'Estadio Héroes de San Ramón' },
        { name: 'ADT', city: 'Tarma', dept: 'Junín', nickname: 'El Vendaval Celeste', colors: ['#069BFF', '#FFFFFF'], stadium: 'Estadio Unión Tarma' },
        { name: 'Deportivo Moquegua', city: 'Moquegua', dept: 'Moquegua', nickname: 'La Fuerza del Sur', colors: ['#FFFFFF', '#000000'], stadium: 'Estadio 25 de Noviembre' },
        { name: 'UTC', city: 'Cajamarca', dept: 'Cajamarca', nickname: 'El Gavilán del Norte', colors: ['#F5E6C8', '#000000'], stadium: 'Estadio Héroes de San Ramón' },
      ],
    },
    {
      name: 'Liga 2 de Perú',
      teams: [
        { name: 'Carlos A. Mannucci', city: 'Trujillo', dept: 'La Libertad', nickname: 'Los Carlistas', colors: ['#003FD0', '#FFFFFF'], stadium: 'Estadio Mansiche', rival: 'Universidad César Vallejo' },
        { name: 'Unión Comercio', city: 'Tarapoto', dept: 'San Martín', nickname: 'El Poderoso del Alto Mayo', colors: ['#FF0013', '#FFFFFF'], stadium: 'Estadio Carlos Vidaurre García' },
        { name: 'Universidad César Vallejo', city: 'Trujillo', dept: 'La Libertad', nickname: 'Los Poetas', colors: ['#FF4D00', '#000E29'], stadium: 'Estadio César Acuña Peralta', rival: 'Carlos A. Mannucci' },
        { name: 'Deportivo Llacuabamba', city: 'Huamachuco', dept: 'La Libertad', nickname: 'La Resistencia Celeste', colors: ['#22C8FF', '#FFFFFF'], stadium: 'Estadio Municipal de Huamachuco' },
        { name: 'ADA Jaén', city: 'Jaén', dept: 'Cajamarca', nickname: 'Los Auriverdes', colors: ['#003521', '#FFF700'], stadium: 'Estadio Víctor Montoya Segura' },
        { name: 'Universidad San Martín', city: 'Lima', dept: 'Lima', nickname: 'Los Santos', colors: ['#FFFFFF', '#03183D'], stadium: 'Villa Deportiva USMP' },
        { name: 'Pirata FC', city: 'Chiclayo', dept: 'Lambayeque', nickname: 'Los Piratas del Norte', colors: ['#006F45', '#000000'] },
        { name: 'Alianza Universidad', city: 'Huánuco', dept: 'Huánuco', nickname: 'Los Azulgranas', colors: ['#0043BF', '#8B0000'], stadium: 'Estadio Heraclio Tapia' },
        { name: 'Ayacucho FC', city: 'Ayacucho', dept: 'Ayacucho', nickname: 'Los Zorros', colors: ['#FFFFFF', '#000000'], stadium: 'Estadio Las Américas' }, // colores no confirmados
        { name: 'Unión Minas', city: 'Cerro de Pasco', dept: 'Pasco', nickname: 'El Rodillo Minero', colors: ['#FFE42B', '#0052B5'], stadium: 'Estadio Daniel Alcides Carrión' },
        { name: 'Bentín Tacna Heroica', city: 'Tacna', dept: 'Tacna', nickname: 'El Vendaval Azul', colors: ['#0038BB', '#FFE815'], stadium: 'Estadio Jorge Basadre' },
        { name: 'Comerciantes FC', city: 'Iquitos', dept: 'Loreto', nickname: 'La Fuerza Loretana', colors: ['#00AA2B', '#FFFFFF'] },
        { name: 'Santos FC', city: 'Nasca', dept: 'Ica', nickname: 'La Máquina Azul', colors: ['#0040D5', '#FFFFFF'], stadium: 'Estadio Pedro Huamán Román' },
        // Filial de Sport Huancayo que compite en la Liga 2.
        { name: 'Sport Huancayo B', city: 'Huancayo', dept: 'Junín', colors: ['#E00013', '#FFFFFF'], stadium: 'Estadio Huancayo' },
        { name: 'Estudiantil CNI', city: 'Iquitos', dept: 'Loreto', nickname: 'Los Albos', colors: ['#FFFFFF', '#006A43'] },
        { name: 'Deportivo Binacional', city: 'Juliaca', dept: 'Puno', nickname: 'El Poderoso del Sur', colors: ['#061CAE', '#FFFFFF'], stadium: 'Estadio Guillermo Briceño Rosamedina' },
        { name: 'Academia Cantolao', city: 'Lima', dept: 'Lima', nickname: 'El Delfín', colors: ['#FFD900', '#0033A0'], stadium: 'Estadio Hugo Sotil' }, // color secundario no confirmado
      ],
    },
  ],
  sources: [
    'https://es.wikipedia.org/wiki/Liga1_2026_(Per%C3%BA)',
    'https://es.wikipedia.org/wiki/Liga2_2026_(Per%C3%BA)',
    'https://www.futbolperuano.com/liga-2/noticias/liga-2-2026-se-realizo-el-sorteo-del-fixture-del-torneo-de-ascenso-que-reunira-a-18-equipos-en-busca-de-llegar-a-la-liga-1-573240',
    'https://www.futbolperuano.com/liga-2/noticias/estos-son-los-18-equipos-que-disputaran-la-liga-2-2026-553448',
  ],
} satisfies CountryTeams;
