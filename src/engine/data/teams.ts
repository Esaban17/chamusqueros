// Equipos del fútbol guatemalteco — temporada 2026-27 (Torneo Apertura 2026).
// Investigado el 2026-10-14. Ver SOURCES y las notas que acompañan cada lista.

export interface TeamData { name: string; city: string; dept: string; nickname?: string; colors?: [string, string]; stadium?: string; }

// Liga Nacional (Liga Bantrab), Apertura 2026: 12 equipos.
// stadium: estadio de local en el Apertura 2026 (solo los confirmados con fuente; ver SOURCES).
// Ascendieron San Pedro y Suchitepéquez; descendieron Achuapa y Mictlán (Clausura 2026).
export const LIGA_NACIONAL: TeamData[] = [
  { name: 'Suchitepéquez', city: 'Mazatenango', dept: 'Suchitepéquez', nickname: 'Los Venados', colors: ['#1F4E9E', '#FFFFFF'], stadium: 'Estadio Carlos Salazar Hijo' },
  { name: 'Comunicaciones', city: 'Guatemala', dept: 'Guatemala', nickname: 'Los Cremas', colors: ['#FFFFFF', '#0B2A5B'], stadium: 'Estadio Cementos Progreso' },
  { name: 'Malacateco', city: 'Malacatán', dept: 'San Marcos', nickname: 'Los Toros', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Santa Lucía' },
  { name: 'Cobán Imperial', city: 'Cobán', dept: 'Alta Verapaz', nickname: 'Los Príncipes Azules', colors: ['#0047AB', '#FFFFFF'], stadium: 'Estadio José Ángel Rossi' },
  { name: 'Aurora', city: 'Guatemala', dept: 'Guatemala', nickname: 'Los Tigres Aurinegros', colors: ['#FFD100', '#000000'], stadium: 'Estadio Cementos Progreso' },
  { name: 'Guastatoya', city: 'Guastatoya', dept: 'El Progreso', nickname: 'Los Pecho Amarillo', colors: ['#FFD200', '#0B7A3B'], stadium: 'Estadio David Cordón Hichos' },
  // Colores de San Pedro no confirmados en ninguna fuente; valores provisionales.
  { name: 'San Pedro', city: 'San Pedro Sacatepéquez', dept: 'San Marcos', nickname: 'Los Gallos', colors: ['#C8102E', '#FFFFFF'], stadium: 'Estadio Municipal Sampedrano' },
  { name: 'Xelajú', city: 'Quetzaltenango', dept: 'Quetzaltenango', nickname: 'Los Superchivos', colors: ['#D2001F', '#002F87'], stadium: 'Estadio Mario Camposeco' },
  { name: 'Municipal', city: 'Guatemala', dept: 'Guatemala', nickname: 'Los Rojos', colors: ['#E30613', '#003DA5'], stadium: 'Estadio Manuel Felipe Carrera' },
  { name: 'Mixco', city: 'Mixco', dept: 'Guatemala', nickname: 'Los Chicharroneros', colors: ['#0055A4', '#2E8B57'], stadium: 'Estadio Santo Domingo de Guzmán' },
  { name: 'Antigua', city: 'Antigua Guatemala', dept: 'Sacatepéquez', nickname: 'Los Panzas Verdes', colors: ['#007A33', '#FFFFFF'], stadium: 'Estadio Pensativo' },
  { name: 'Marquense', city: 'San Marcos', dept: 'San Marcos', nickname: 'Los Leones', colors: ['#FFD100', '#C8102E'], stadium: 'Estadio Marquesa de la Ensenada' },
];

// Primera División, Apertura 2026: 20 equipos en 2 grupos (Prensa Libre, jornada 16; Guatefutbol 12/06/2026).
export const PRIMERA_DIVISION: TeamData[] = [
  // Grupo A
  { name: 'Huehuetecos', city: 'Huehuetenango', dept: 'Huehuetenango', stadium: 'Estadio Los Cuchumatanes' },
  { name: 'Aguacatán', city: 'Aguacatán', dept: 'Huehuetenango', stadium: 'Estadio Municipal de Aguacatán' },
  { name: 'Juventud Copalera', city: 'San Ildefonso Ixtahuacán', dept: 'Huehuetenango', stadium: 'Estadio Antonio Castillo Castillo' },
  { name: 'Coatepeque', city: 'Coatepeque', dept: 'Quetzaltenango', stadium: 'Estadio Israel Barrios' },
  { name: 'Santa Lucía', city: 'Santa Lucía Cotzumalguapa', dept: 'Escuintla', stadium: 'Estadio Municipal de Santa Lucía Cotzumalguapa' },
  { name: 'Gomerano', city: 'La Gomera', dept: 'Escuintla', stadium: 'Estadio Pedro Coronado Campos' },
  { name: 'Iztapa', city: 'Iztapa', dept: 'Escuintla', nickname: 'Peces Vela', stadium: 'Estadio El Morón' },
  { name: 'Quiché', city: 'Santa Cruz del Quiché', dept: 'Quiché', stadium: 'Estadio Municipal de Santa Cruz del Quiché' },
  { name: 'Chichicasteco', city: 'Chichicastenango', dept: 'Quiché' },
  { name: 'Amatitlán', city: 'Amatitlán', dept: 'Guatemala', stadium: 'Estadio Guillermo Slowing' },
  // Grupo B
  { name: 'Nueva Santa Rosa', city: 'Nueva Santa Rosa', dept: 'Santa Rosa', stadium: 'Estadio Pedro García Arredondo' },
  { name: 'Sacachispas', city: 'Chiquimula', dept: 'Chiquimula', stadium: 'Estadio Las Victorias' },
  { name: 'Mictlán', city: 'Asunción Mita', dept: 'Jutiapa', stadium: 'Estadio La Asunción' },
  { name: 'Sayaxché', city: 'Sayaxché', dept: 'Petén', stadium: 'Estadio Municipal La Pasión' },
  { name: 'Fraijanes', city: 'Fraijanes', dept: 'Guatemala' },
  { name: 'San Benito', city: 'San Benito', dept: 'Petén', stadium: 'Estadio Alejandro Ochaeta Requena' },
  { name: 'Achuapa', city: 'El Progreso', dept: 'Jutiapa', stadium: 'Estadio Manuel Ariza' },
  { name: 'Chiquimulilla', city: 'Chiquimulilla', dept: 'Santa Rosa', stadium: 'Estadio Los Conacastes' },
  { name: 'AFF Guatemala', city: 'San Miguel Petapa', dept: 'Guatemala', stadium: 'Estadio Julio Armando Cóbar' },
  { name: "Champ's Guatemala", city: 'Guatemala', dept: 'Guatemala' },
];

// Segunda División, Apertura 2026: lista incompleta (39 de unos 40 equipos).
// Salen sobre todo de los resultados de agosto a octubre de 2026 en footballant.com.
// Se agregan los descendidos de Primera y algunos clubes que siguen en la categoría.
// Los grupos oficiales no se pudieron confirmar porque las tablas solo existen como imágenes.
export const SEGUNDA_DIVISION: TeamData[] = [
  // Norte (Alta Verapaz / Izabal / Petén / Zacapa) — agrupación inferida
  { name: 'Carchá', city: 'San Pedro Carchá', dept: 'Alta Verapaz', stadium: 'Estadio Juan Ramón Ponce Guay' },
  { name: 'Izabal JC', city: 'Puerto Barrios', dept: 'Izabal', nickname: 'Los Tiburones', stadium: 'Estadio Roy Fearon' },
  { name: 'Teculután', city: 'Teculután', dept: 'Zacapa', stadium: 'Estadio Julio Héctor Paz Castilla' },
  { name: 'San Cristóbal', city: 'San Cristóbal Verapaz', dept: 'Alta Verapaz' },
  { name: 'Cabañas', city: 'Cabañas', dept: 'Zacapa', stadium: 'Estadio Municipal Oswaldo Portillo' },
  { name: 'Flores', city: 'Flores', dept: 'Petén' },
  { name: 'Poptún', city: 'Poptún', dept: 'Petén', stadium: 'Estadio Sosa Ávila' },
  { name: 'Juventud Cachacera', city: 'Quezaltepeque', dept: 'Chiquimula' },
  { name: 'Municipal R-19', city: 'Zacapa', dept: 'Zacapa' },
  // Oriente
  { name: 'Catocha', city: 'Santa Catarina Mita', dept: 'Jutiapa' },
  { name: 'Monjas', city: 'Monjas', dept: 'Jalapa', stadium: 'Estadio Municipal Mario Estrada' },
  { name: 'Jalapaneco', city: 'Jalapa', dept: 'Jalapa' },
  { name: 'Tigres del Jumay', city: 'Jalapa', dept: 'Jalapa', stadium: 'Estadio Las Flores' },
  { name: 'Jutiapa', city: 'Jutiapa', dept: 'Jutiapa', stadium: 'Estadio Winston Pineda' },
  { name: 'Cuilapa', city: 'Cuilapa', dept: 'Santa Rosa', stadium: 'Estadio Municipal de Cuilapa' },
  { name: 'Sansare', city: 'Sansare', dept: 'El Progreso', stadium: 'Estadio Las Victorias de Sansare' },
  { name: 'Sanarate', city: 'Sanarate', dept: 'El Progreso', stadium: 'Estadio Municipal de Sanarate' },
  { name: 'San José del Golfo', city: 'San José del Golfo', dept: 'Guatemala', stadium: 'Estadio Rodolfo Artemio Pineda Véliz' },
  { name: 'Boca del Monte', city: 'Villa Canales', dept: 'Guatemala' },
  // Metropolitano / Sur
  { name: 'Universidad SC', city: 'Guatemala', dept: 'Guatemala' },
  { name: 'USAC', city: 'Guatemala', dept: 'Guatemala' },
  { name: 'Champs Academy II', city: 'Guatemala', dept: 'Guatemala' },
  { name: 'Petapa', city: 'San Miguel Petapa', dept: 'Guatemala' },
  { name: 'Chimaltenango', city: 'Chimaltenango', dept: 'Chimaltenango', stadium: 'Estadio Municipal de Chimaltenango' },
  { name: 'Nueva Concepción', city: 'Nueva Concepción', dept: 'Escuintla', stadium: 'Estadio José Luis Ibarra' },
  { name: 'Escuintla', city: 'Escuintla', dept: 'Escuintla', stadium: 'Estadio Armando Barillas' },
  { name: 'Puerto San José', city: 'San José', dept: 'Escuintla', stadium: 'Estadio Vicente Arévalo' },
  { name: 'Toros de Taxisco', city: 'Taxisco', dept: 'Santa Rosa' },
  { name: 'Patulul', city: 'Patulul', dept: 'Suchitepéquez' },
  // Occidente
  { name: 'Colomba', city: 'Colomba Costa Cuca', dept: 'Quetzaltenango', stadium: 'Estadio César Manuel Aguirre y Aguirre' },
  { name: 'Sija', city: 'San Carlos Sija', dept: 'Quetzaltenango', stadium: 'Estadio José Domingo Calderón Díaz' },
  { name: 'Cabricán', city: 'Cabricán', dept: 'Quetzaltenango' },
  { name: 'América Salcajá', city: 'Salcajá', dept: 'Quetzaltenango', stadium: 'Estadio Panorama Adelso de León Amézquita' },
  { name: 'Tacaná', city: 'Tacaná', dept: 'San Marcos' },
  { name: 'Ocós', city: 'Ocós', dept: 'San Marcos' },
  { name: 'Ayutla', city: 'Ayutla', dept: 'San Marcos', stadium: 'Estadio Tecún Umán' },
  { name: 'Cuilquense', city: 'Cuilco', dept: 'Huehuetenango', stadium: 'Estadio La Regional' },
  { name: 'Barillas', city: 'Santa Cruz Barillas', dept: 'Huehuetenango', stadium: 'Estadio Carlos Enrique Mérida' },   // estuvo en el Clausura 2026; no confirmado en el Apertura 2026
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
  'https://emisorasunidas.com/deportes/2026/10/13/previa-de-la-jornada-14-del-torneo-apertura-2026-guatemala/',
  'https://www.publinews.gt/deportes/2026/07/26/aurora-fc-tropieza-en-su-estreno-en-el-estadio-cementos-progreso/',
  'https://emisorasunidas.com/deportes/2026/09/24/municipal-y-suchitepequez-abren-fecha-11-del-apertura-2026/',
  'https://es.wikipedia.org/wiki/Torneo_Clausura_2026_Primera_Divisi%C3%B3n_(Guatemala)',
  'https://es.wikipedia.org/wiki/Torneo_Clausura_2026_Segunda_Divisi%C3%B3n_(Guatemala)',
  'https://es.wikipedia.org/wiki/Anexo:Estadios_de_f%C3%BAtbol_de_Guatemala',
];
