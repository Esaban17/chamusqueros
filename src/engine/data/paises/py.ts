// Paraguay — temporada 2026 (Torneo Clausura 2026, fecha 14; División Intermedia, fecha 28). Investigado el 2026-10-14.
// Orden: de más fuerte a más débil (tabla actual, presupuesto e historia).
// Ascendieron Rubio Ñu y San Lorenzo; descendieron General Caballero JLM y Atlético Tembetary (2025).
import type { CountryTeams } from '../teams';

export default {
  leagues: [
    {
      name: 'Primera División de Paraguay',
      teams: [
        { name: 'Olimpia', city: 'Asunción', dept: 'Asunción', nickname: 'El Decano', colors: ['#FFFFFF', '#000000'], stadium: 'Estadio Defensores del Chaco', rival: 'Cerro Porteño' },
        { name: 'Cerro Porteño', city: 'Asunción', dept: 'Asunción', nickname: 'El Ciclón', colors: ['#C8102E', '#0033A0'], stadium: 'Estadio General Pablo Rojas', rival: 'Olimpia' },
        { name: 'Libertad', city: 'Asunción', dept: 'Asunción', nickname: 'El Gumarelo', colors: ['#000000', '#FFFFFF'], stadium: 'Estadio La Huerta' },
        { name: 'Guaraní', city: 'Asunción', dept: 'Asunción', nickname: 'El Aborigen', colors: ['#FFD100', '#000000'], stadium: 'Estadio La Arboleda' },
        { name: 'Nacional', city: 'Asunción', dept: 'Asunción', nickname: 'La Academia', colors: ['#FFFFFF', '#0033A0'], stadium: 'Estadio Arsenio Erico' },
        { name: '2 de Mayo', city: 'Pedro Juan Caballero', dept: 'Amambay', nickname: 'El Gallo Norteño', colors: ['#0033A0', '#FFFFFF'], stadium: 'Estadio Río Parapití' },
        { name: 'Sportivo Trinidense', city: 'Asunción', dept: 'Asunción', nickname: 'El Triki', colors: ['#0033A0', '#FFD100'], stadium: 'Estadio Martín Torres' },
        { name: 'Sportivo Ameliano', city: 'Villeta', dept: 'Central', nickname: 'La V Azulada', colors: ['#FFFFFF', '#0033A0'], stadium: 'La Fortaleza del Pikysyry' },
        { name: 'Sportivo Luqueño', city: 'Luque', dept: 'Central', nickname: 'El Auriazul', colors: ['#FFD100', '#0033A0'], stadium: 'Estadio Luis Salinas' },
        { name: 'Rubio Ñu', city: 'Asunción', dept: 'Asunción', nickname: 'Los Albiverdes', colors: ['#FFFFFF', '#009A44'], stadium: 'Estadio La Arboleda' },
        { name: 'Recoleta', city: 'Asunción', dept: 'Asunción', nickname: 'Los Canarios', colors: ['#000000', '#FFD100'], stadium: 'Estadio Ricardo Gregor' },
        { name: 'San Lorenzo', city: 'San Lorenzo', dept: 'Central', nickname: 'El Rayadito', colors: ['#E30613', '#FFFFFF'], stadium: 'Estadio Gunther Vogel' },
      ],
    },
    {
      name: 'División Intermedia',
      teams: [
        { name: 'General Caballero JLM', city: 'Juan León Mallorquín', dept: 'Alto Paraná', nickname: 'El Rojo de Mallorquín', colors: ['#E30613', '#FFFFFF'], stadium: "Estadio Ka'arendy" },
        { name: 'Deportivo Santaní', city: 'San Estanislao', dept: 'San Pedro', nickname: 'El Santa', colors: ['#000000', '#FFFFFF'], stadium: 'Estadio Juan José Vázquez' },
        { name: '12 de Junio', city: 'Villa Hayes', dept: 'Presidente Hayes', nickname: 'El Auriazul', colors: ['#FFD100', '#0033A0'], stadium: 'Estadio Facundo de León Fossati' },
        { name: 'Sol de América', city: 'Villa Elisa', dept: 'Central', nickname: 'El Danzarín', colors: ['#0033A0', '#FFFFFF'], stadium: 'Estadio Luis Alfonso Giagni' },
        { name: 'Independiente FBC', city: 'Asunción', dept: 'Asunción', nickname: 'El Inde', colors: ['#E30613', '#FFFFFF'], stadium: 'Estadio Ricardo Gregor' }, // no confirmado (colores)
        { name: 'Atlético Tembetary', city: 'Villa Elisa', dept: 'Central', nickname: 'El Tembe', colors: ['#009A44', '#E30613'], stadium: 'Estadio Luis Alfonso Giagni' },
        { name: 'Benjamín Aceval', city: 'Villa Hayes', dept: 'Presidente Hayes', colors: ['#0033A0', '#FFFFFF'], stadium: 'Estadio Isidro Roussillón' }, // no confirmado (colores)
        { name: 'Sportivo Carapeguá', city: 'Carapeguá', dept: 'Paraguarí', nickname: 'El Potro', colors: ['#E30613', '#FFFFFF'] }, // no confirmado (colores)
        { name: 'Paraguarí AC', city: 'Paraguarí', dept: 'Paraguarí', colors: ['#009A44', '#FFFFFF'], stadium: 'Estadio General Bruguez' }, // no confirmado (colores)
        { name: 'Resistencia', city: 'Asunción', dept: 'Asunción', nickname: 'El Triángulo Rojo', colors: ['#E30613', '#FFFFFF'], stadium: 'Estadio Tomás Beggan Correa' },
        { name: 'Deportivo Capiatá', city: 'Capiatá', dept: 'Central', nickname: 'Los Auriazules', colors: ['#FFD100', '#0033A0'], stadium: 'Estadio Erico Galeano Segovia' },
        { name: 'Fernando de la Mora', city: 'Asunción', dept: 'Asunción', nickname: 'El Matador', colors: ['#E30613', '#FFFFFF'], stadium: 'Estadio Emiliano Ghezzi' },
        { name: '3 de Noviembre', city: 'Asunción', dept: 'Asunción', nickname: 'El Trico', colors: ['#FFFFFF', '#E30613'], stadium: 'Estadio Rubén Ramírez' },
        { name: 'Tacuary', city: 'Asunción', dept: 'Asunción', nickname: 'El Buque', colors: ['#000000', '#FFFFFF'], stadium: 'Estadio Emiliano Ghezzi' },
        { name: 'Guaireña', city: 'Villarrica', dept: 'Guairá', nickname: 'El Albiceleste', colors: ['#6CACE4', '#FFFFFF'], stadium: 'Estadio Parque del Guairá' },
        { name: 'Encarnación', city: 'Encarnación', dept: 'Itapúa', nickname: 'El Rayo Sureño', colors: ['#FFFFFF', '#E30613'], stadium: 'Estadio Villa Alegre' },
      ],
    },
  ],
  sources: [
    'https://es.wikipedia.org/wiki/Torneo_Clausura_2026_(Paraguay)',
    'https://es.wikipedia.org/wiki/División_Intermedia_2026',
    'https://www.abc.com.py/deportes/futbol/2026/08/04/torneo-clausura-2026-el-inedito-puntero-del-futbol-paraguayo/',
    'https://www.abc.com.py/deportes/futbol/2-de-mayo/2025/04/09/2-de-mayo-gallo-contra-canario-duelo-avicola/',
    'https://es.wikipedia.org/wiki/Club_Nacional_(Paraguay)',
    'https://es.wikipedia.org/wiki/Club_Sportivo_Trinidense',
    'https://es.wikipedia.org/wiki/Club_Sportivo_Ameliano',
    'https://es.wikipedia.org/wiki/Club_Rubio_Ñu',
    'https://en.wikipedia.org/wiki/Recoleta_FC',
    'https://es.wikipedia.org/wiki/Club_Sportivo_San_Lorenzo',
    'https://es.wikipedia.org/wiki/Club_General_Caballero_(Juan_León_Mallorquín)',
    'https://es.wikipedia.org/wiki/Club_Deportivo_Santaní',
    'https://es.wikipedia.org/wiki/Club_12_de_Junio',
    'https://en.wikipedia.org/wiki/Club_Sol_de_América',
    'https://es.wikipedia.org/wiki/Club_Atlético_Tembetary',
    'https://es.wikipedia.org/wiki/Club_Deportivo_Capiatá',
    'https://es.wikipedia.org/wiki/Club_Fernando_de_la_Mora',
    'https://es.wikipedia.org/wiki/Club_3_de_Noviembre',
    'https://es.wikipedia.org/wiki/Club_Tacuary',
    'https://es.wikipedia.org/wiki/Guaireña_Fútbol_Club',
    'https://es.wikipedia.org/wiki/Encarnación_Fútbol_Club',
  ],
} satisfies CountryTeams;
