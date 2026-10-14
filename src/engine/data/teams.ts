// Equipos del fútbol guatemalteco — temporada 2026-27 (Torneo Apertura 2026).
// Investigado el 2026-10-14. Ver SOURCES y las notas que acompañan cada lista.

export interface TeamData { name: string; city: string; dept: string; nickname?: string; colors?: [string, string]; }

// Liga Nacional (Liga Bantrab), Apertura 2026: 12 equipos.
// Ascendieron San Pedro y Suchitepéquez; descendieron Achuapa y Mictlán (Clausura 2026).
export const LIGA_NACIONAL: TeamData[] = [
  { name: 'Suchitepéquez', city: 'Mazatenango', dept: 'Suchitepéquez', nickname: 'Los Venados', colors: ['#1F4E9E', '#FFFFFF'] },
  { name: 'Comunicaciones', city: 'Guatemala', dept: 'Guatemala', nickname: 'Los Cremas', colors: ['#FFFFFF', '#0B2A5B'] },
  { name: 'Malacateco', city: 'Malacatán', dept: 'San Marcos', nickname: 'Los Toros', colors: ['#C8102E', '#FFFFFF'] },
  { name: 'Cobán Imperial', city: 'Cobán', dept: 'Alta Verapaz', nickname: 'Los Príncipes Azules', colors: ['#0047AB', '#FFFFFF'] },
  { name: 'Aurora', city: 'Amatitlán', dept: 'Guatemala', nickname: 'Los Tigres Aurinegros', colors: ['#FFD100', '#000000'] },
  { name: 'Guastatoya', city: 'Guastatoya', dept: 'El Progreso', nickname: 'Los Pecho Amarillo', colors: ['#FFD200', '#0B7A3B'] },
  // Colores de San Pedro no confirmados en ninguna fuente; valores provisionales.
  { name: 'San Pedro', city: 'San Pedro Sacatepéquez', dept: 'San Marcos', nickname: 'Los Gallos', colors: ['#C8102E', '#FFFFFF'] },
  { name: 'Xelajú', city: 'Quetzaltenango', dept: 'Quetzaltenango', nickname: 'Los Superchivos', colors: ['#D2001F', '#002F87'] },
  { name: 'Municipal', city: 'Guatemala', dept: 'Guatemala', nickname: 'Los Rojos', colors: ['#E30613', '#003DA5'] },
  { name: 'Mixco', city: 'Mixco', dept: 'Guatemala', nickname: 'Los Chicharroneros', colors: ['#0055A4', '#2E8B57'] },
  { name: 'Antigua', city: 'Antigua Guatemala', dept: 'Sacatepéquez', nickname: 'Los Panzas Verdes', colors: ['#007A33', '#FFFFFF'] },
  { name: 'Marquense', city: 'San Marcos', dept: 'San Marcos', nickname: 'Los Leones', colors: ['#FFD100', '#C8102E'] },
];

// Primera División, Apertura 2026: 20 equipos en 2 grupos (Prensa Libre, jornada 16; Guatefutbol 12/06/2026).
export const PRIMERA_DIVISION: TeamData[] = [
  // Grupo A
  { name: 'Huehuetecos', city: 'Huehuetenango', dept: 'Huehuetenango' },
  { name: 'Aguacatán', city: 'Aguacatán', dept: 'Huehuetenango' },
  { name: 'Juventud Copalera', city: 'San Ildefonso Ixtahuacán', dept: 'Huehuetenango' },
  { name: 'Coatepeque', city: 'Coatepeque', dept: 'Quetzaltenango' },
  { name: 'Santa Lucía', city: 'Santa Lucía Cotzumalguapa', dept: 'Escuintla' },
  { name: 'Gomerano', city: 'La Gomera', dept: 'Escuintla' },
  { name: 'Iztapa', city: 'Iztapa', dept: 'Escuintla', nickname: 'Peces Vela' },
  { name: 'Quiché', city: 'Santa Cruz del Quiché', dept: 'Quiché' },
  { name: 'Chichicasteco', city: 'Chichicastenango', dept: 'Quiché' },
  { name: 'Amatitlán', city: 'Amatitlán', dept: 'Guatemala' },
  // Grupo B
  { name: 'Nueva Santa Rosa', city: 'Nueva Santa Rosa', dept: 'Santa Rosa' },
  { name: 'Sacachispas', city: 'Chiquimula', dept: 'Chiquimula' },
  { name: 'Mictlán', city: 'Asunción Mita', dept: 'Jutiapa' },
  { name: 'Sayaxché', city: 'Sayaxché', dept: 'Petén' },
  { name: 'Fraijanes', city: 'Fraijanes', dept: 'Guatemala' },
  { name: 'San Benito', city: 'San Benito', dept: 'Petén' },
  { name: 'Achuapa', city: 'El Progreso', dept: 'Jutiapa' },
  { name: 'Chiquimulilla', city: 'Chiquimulilla', dept: 'Santa Rosa' },
  { name: 'AFF Guatemala', city: 'Guatemala', dept: 'Guatemala' },
  { name: "Champ's Guatemala", city: 'Guatemala', dept: 'Guatemala' },
];

// Segunda División, Apertura 2026: lista incompleta (39 de unos 40 equipos).
// Salen sobre todo de los resultados de agosto a octubre de 2026 en footballant.com.
// Se agregan los descendidos de Primera y algunos clubes que siguen en la categoría.
// Los grupos oficiales no se pudieron confirmar porque las tablas solo existen como imágenes.
export const SEGUNDA_DIVISION: TeamData[] = [
  // Norte (Alta Verapaz / Izabal / Petén / Zacapa) — agrupación inferida
  { name: 'Carchá', city: 'San Pedro Carchá', dept: 'Alta Verapaz' },
  { name: 'Izabal JC', city: 'Puerto Barrios', dept: 'Izabal', nickname: 'Los Tiburones' },
  { name: 'Teculután', city: 'Teculután', dept: 'Zacapa' },
  { name: 'San Cristóbal', city: 'San Cristóbal Verapaz', dept: 'Alta Verapaz' },
  { name: 'Cabañas', city: 'Cabañas', dept: 'Zacapa' },
  { name: 'Flores', city: 'Flores', dept: 'Petén' },
  { name: 'Poptún', city: 'Poptún', dept: 'Petén' },
  { name: 'Juventud Cachacera', city: 'Alta Verapaz', dept: 'Alta Verapaz' },          // sede no confirmada
  { name: 'Municipal R-19', city: 'Alta Verapaz', dept: 'Alta Verapaz' },              // sede no confirmada
  // Oriente
  { name: 'Catocha', city: 'Santa Catarina Mita', dept: 'Jutiapa' },
  { name: 'Monjas', city: 'Monjas', dept: 'Jalapa' },
  { name: 'Jalapaneco', city: 'Jalapa', dept: 'Jalapa' },
  { name: 'Tigres del Jumay', city: 'Jalapa', dept: 'Jalapa' },
  { name: 'Jutiapa', city: 'Jutiapa', dept: 'Jutiapa' },
  { name: 'Cuilapa', city: 'Cuilapa', dept: 'Santa Rosa' },
  { name: 'Sansare', city: 'Sansare', dept: 'El Progreso' },
  { name: 'Sanarate', city: 'Sanarate', dept: 'El Progreso' },
  { name: 'San José del Golfo', city: 'San José del Golfo', dept: 'Guatemala' },
  { name: 'Boca del Monte', city: 'Villa Canales', dept: 'Guatemala' },
  // Metropolitano / Sur
  { name: 'Universidad SC', city: 'Guatemala', dept: 'Guatemala' },
  { name: 'USAC', city: 'Guatemala', dept: 'Guatemala' },
  { name: 'Champs Academy II', city: 'Guatemala', dept: 'Guatemala' },
  { name: 'Petapa', city: 'San Miguel Petapa', dept: 'Guatemala' },
  { name: 'Chimaltenango', city: 'Chimaltenango', dept: 'Chimaltenango' },
  { name: 'Nueva Concepción', city: 'Nueva Concepción', dept: 'Escuintla' },
  { name: 'Escuintla', city: 'Escuintla', dept: 'Escuintla' },
  { name: 'Puerto San José', city: 'San José', dept: 'Escuintla' },
  { name: 'Toros de Taxisco', city: 'Taxisco', dept: 'Santa Rosa' },
  { name: 'Patulul', city: 'Patulul', dept: 'Suchitepéquez' },
  // Occidente
  { name: 'Colomba', city: 'Colomba Costa Cuca', dept: 'Quetzaltenango' },
  { name: 'Sija', city: 'San Carlos Sija', dept: 'Quetzaltenango' },
  { name: 'Cabricán', city: 'Cabricán', dept: 'Quetzaltenango' },
  { name: 'América Salcajá', city: 'Salcajá', dept: 'Quetzaltenango' },
  { name: 'Tacaná', city: 'Tacaná', dept: 'San Marcos' },
  { name: 'Ocós', city: 'Ocós', dept: 'San Marcos' },
  { name: 'Ayutla', city: 'Ayutla', dept: 'San Marcos' },
  { name: 'Cuilquense', city: 'Cuilco', dept: 'Huehuetenango' },
  { name: 'Barillas', city: 'Santa Cruz Barillas', dept: 'Huehuetenango' },   // estuvo en el Clausura 2026; no confirmado en el Apertura 2026
  { name: 'San Sebastián', city: 'San Sebastián', dept: 'Retalhuleu' },       // estuvo en el Clausura 2026; no confirmado en el Apertura 2026
];

export const SOURCES: string[] = [
  'https://www.prensalibre.com/deportes/futbol-nacional/apertura-2026-seis-claves-del-torneo-que-estrena-una-nueva-liguilla-y-recibe-a-san-pedro-y-suchitepequez-breaking/',
  'https://www.prensalibre.com/deportes/futbol-nacional/torneo-apertura-2026-tabla-de-posiciones-de-los-grupos-a-y-b-de-la-primera-division-despues-de-la-fecha-16/',
  'https://guatefutbol.com/2026/06/12/asi-quedan-definidos-los-grupos-a-y-b-en-la-liga-primera-division',
  'https://guatefutbol.com/2026/05/22/oficial-equipo-adquiere-los-derechos-de-csd-ipala',
  'https://guatefutbol.com/2026/05/13/todos-los-detalles-de-la-supercopa-bantrab/',
  'https://www.prensalibre.com/deportes/futbol-nacional/primera-division-definidos-los-clasificados-y-los-descensos-tras-la-ultima-jornada-del-clausura-2026-breaking/',
  'https://www.lared1061.com/posts/equipos-descienden',
  'https://www.lared1061.com/posts/poptun-campeon-clausura',
  'https://agn.gt/que-equipos-descendieron-en-la-liga-nacional/',
  'https://agn.gt/achuapa-es-el-primer-descendido-del-clausura-2026/',
  'https://www.footballant.com/football-data/league/2189',
  'https://en.wikipedia.org/wiki/Liga_Segunda_Divisi%C3%B3n',
  'https://en.wikipedia.org/wiki/Liga_Primera_Divisi%C3%B3n',
  'https://es.wikipedia.org/wiki/Primera_Divisi%C3%B3n_de_Guatemala',
  'https://es.wikipedia.org/wiki/Segunda_Divisi%C3%B3n_de_Guatemala',
  'https://antorchadeportiva.com/category/tablas-de-posiciones-segunda-division/',
  'https://www.guatemala.com/deportes/futbol-guatemalteco/estos-son-los-12-estadios-de-liga-nacional-para-la-temporada-25-26-2.html',
  'https://en.wikipedia.org/wiki/Deportivo_San_Pedro',
  'https://canalantigua.tv/2026/05/10/despues-de-32-anos-san-pedro-fc-cumple-el-sueno-y-llega-a-la-maxima-categoria/',
  'https://emisorasunidas.com/deportes/2026/05/10/san-pedro-asciende-a-la-liga-nacional-de-guatemala/',
  'https://en.wikipedia.org/wiki/CSD_Suchitep%C3%A9quez',
  'https://en.wikipedia.org/wiki/Deportivo_Guastatoya',
  'https://es.wikipedia.org/wiki/Deportivo_Guastatoya',
  'https://es.wikipedia.org/wiki/Deportivo_Malacateco',
  'https://es.wikipedia.org/wiki/Deportivo_Marquense',
  'https://es.wikipedia.org/wiki/Aurora_F%C3%BAtbol_Club',
  'https://es.wikipedia.org/wiki/Deportivo_Mixco',
  'https://en.wikipedia.org/wiki/CSD_Mixco',
  'https://emisorasunidas.com/2023/07/27/deportivo-mixco-presenta-su-indumentaria-para-el-apertura-2023/',
  'http://juventudcopalera.blogspot.com/',
  'https://www.primeraedicion.com.ar/nota/101096751/el-misionero-camilo-villarreal-fue-el-heroe-en-el-juventud-copalera-del-futbol-de-guatemala/',
  'https://en.wikipedia.org/wiki/Izabal_JC',
  'https://emisorasunidas.com/2020/06/13/tellioz-adquiere-ficha-catocha-jugara-primera-division/',
];
