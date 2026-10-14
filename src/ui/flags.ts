// Banderas reales de las selecciones (imágenes de flagcdn.com). Toda selección que use engine.ts debe estar aquí:
// npm run simulate avisa si falta alguna.
export const FLAG_CODE: Record<string, string> = {
  Guatemala: 'gt',
  México: 'mx', 'Estados Unidos': 'us', Canadá: 'ca', Panamá: 'pa', 'Costa Rica': 'cr', Jamaica: 'jm', Honduras: 'hn',
  Curazao: 'cw', 'El Salvador': 'sv', Haití: 'ht', 'Trinidad y Tobago': 'tt', Surinam: 'sr', Nicaragua: 'ni',
  'República Dominicana': 'do', Cuba: 'cu', Guyana: 'gy', Belice: 'bz', Bermudas: 'bm', Granada: 'gd',
  Colombia: 'co', Japón: 'jp', Ecuador: 'ec', 'Corea del Sur': 'kr', Paraguay: 'py', Perú: 'pe', Chile: 'cl',
  Venezuela: 've', 'Arabia Saudita': 'sa', Islandia: 'is', Bolivia: 'bo',
  Argentina: 'ar', Francia: 'fr', España: 'es', Brasil: 'br', Inglaterra: 'gb-eng', Portugal: 'pt', 'Países Bajos': 'nl',
  Alemania: 'de', Croacia: 'hr', Uruguay: 'uy', Marruecos: 'ma', Senegal: 'sn', Australia: 'au', Nigeria: 'ng',
  Egipto: 'eg', Ghana: 'gh',
};

/** Bandera decorativa: el nombre del país siempre va escrito al lado. */
export const flag = (team: string, cls = 'nation-flag') =>
  FLAG_CODE[team] ? `<img class="${cls}" src="https://flagcdn.com/w40/${FLAG_CODE[team]}.png" alt="" loading="lazy">` : '';
