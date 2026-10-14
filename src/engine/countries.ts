// Países jugables: la nacionalidad decide la liga del debut, la Selección y los textos.
// Los equipos están en ./data (Guatemala en teams.ts, el resto en paises/<código>.ts).
// Agregar un país: su archivo de equipos y una fila en COUNTRIES.
import { LIGA_NACIONAL, PRIMERA_DIVISION, SEGUNDA_DIVISION, SOURCES, type CountryTeams } from './data/teams';
import ar from './data/paises/ar';
import bo from './data/paises/bo';
import br from './data/paises/br';
import cl from './data/paises/cl';
import co from './data/paises/co';
import cr from './data/paises/cr';
import de from './data/paises/de';
import ec from './data/paises/ec';
import en from './data/paises/en';
import es from './data/paises/es';
import fr from './data/paises/fr';
import hn from './data/paises/hn';
import it from './data/paises/it';
import jp from './data/paises/jp';
import ma from './data/paises/ma';
import mx from './data/paises/mx';
import nl from './data/paises/nl';
import pa from './data/paises/pa';
import pe from './data/paises/pe';
import pt from './data/paises/pt';
import py from './data/paises/py';
import sa from './data/paises/sa';
import sv from './data/paises/sv';
import us from './data/paises/us';
import uy from './data/paises/uy';
import ve from './data/paises/ve';

export type Confed = 'CONCACAF' | 'CONMEBOL' | 'UEFA' | 'AFC' | 'CAF';
/** Copa de selecciones de cada confederación (engine.ts decide en qué años se juega). */
export const CONFED_CUP: Record<Confed, string> = { CONCACAF: 'Copa Oro', CONMEBOL: 'Copa América', UEFA: 'Eurocopa', AFC: 'Copa Asiática', CAF: 'Copa Africana' };

export interface Country {
  code: string;
  name: string;
  adj: string; // gentilicio en femenino: "Leyenda chapina"
  people: string; // gentilicio en plural: "cien chapines en la tribuna"
  conf: Confed;
  federation: string;
  ntName: string; // apodo de la Selección: "Debut con la Azul y Blanco"
  stadium: string; // donde juega de local la Selección
  /** Fuerza de la Selección para simular partidos, en la misma escala que los rivales de engine.ts. */
  strength: number;
  /** Nivel del jugador para la primera convocatoria (Guatemala: 71). Los demás umbrales de la Selección se corren igual. */
  callup: number;
  /** Probabilidad base de jugar el Mundial estando en la Selección (Guatemala: 1.2%). */
  wc: number;
  /**
   * Nivel de su liga respecto a la de Guatemala. Los clubes de cada país tienen el mismo rango de nivel (58-76 en primera)
   * para que toda carrera se juegue igual en casa; afuera, un club vale su nivel + level del país − level de la nacionalidad.
   */
  level: number;
  kit: [string, string]; // camiseta de la Selección
  flag: string; // código de flagcdn.com
  regionLabel: string;
  regions: string[];
  split: boolean; // Apertura y Clausura (si no, una liga por temporada)
  money: [symbol: string, perQuetzal: number];
  lang: string;
  cold?: boolean; // ahí nieva en invierno
  wcDebut?: boolean; // nunca fue a un Mundial
  cup?: [name: string, chance: number]; // copa continental que pelean sus grandes
  short?: string[]; // etiqueta corta de cada división en el historial
  dish: string; // "una señora te regaló un tamal"
  food: string; // "Tres meses sin ..."
  leagues: string[]; // nombre de cada división, de primera hacia abajo
  teams: CountryTeams;
}

export const DEPARTAMENTOS = [
  'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula', 'El Progreso', 'Escuintla', 'Guatemala',
  'Huehuetenango', 'Izabal', 'Jalapa', 'Jutiapa', 'Petén', 'Quetzaltenango', 'Quiché', 'Retalhuleu',
  'Sacatepéquez', 'San Marcos', 'Santa Rosa', 'Sololá', 'Suchitepéquez', 'Totonicapán', 'Zacapa',
];

const GT_TEAMS: CountryTeams = {
  leagues: [
    { name: 'Liga Nacional', teams: LIGA_NACIONAL },
    { name: 'Primera División', teams: PRIMERA_DIVISION },
    { name: 'Segunda División', teams: SEGUNDA_DIVISION },
  ],
  sources: SOURCES,
};

type Row = Omit<Country, 'leagues' | 'regions'> & { regions?: string[] };
const ES = 'español';
const LIB: [string, number] = ['Copa Libertadores', 0.02];
const UCL: [string, number] = ['Champions League', 0.05];

// prettier-ignore
const ROWS: Row[] = [
  { code: 'GT', name: 'Guatemala', adj: 'chapina', people: 'chapines', conf: 'CONCACAF', federation: 'FEDEFUT', ntName: 'la Azul y Blanco', stadium: 'el Mateo Flores',
    strength: 66, callup: 71, wc: 0.012, level: 0, kit: ['#4997D0', '#FFFFFF'], flag: 'gt', regionLabel: 'Departamento', regions: DEPARTAMENTOS, split: true,
    money: ['Q', 1], lang: ES, wcDebut: true, short: ['', '1ra Div.', '2da Div.'], dish: 'un tamal', food: 'frijolitos, sin tortillas recién hechas, sin un pepián como el de tu abuela', teams: GT_TEAMS },
  { code: 'MX', name: 'México', adj: 'mexicana', people: 'mexicanos', conf: 'CONCACAF', federation: 'la FMF', ntName: 'el Tri', stadium: 'el Azteca',
    strength: 84, callup: 75, wc: 0.8, level: 14, kit: ['#006847', '#FFFFFF'], flag: 'mx', regionLabel: 'Estado', split: true,
    money: ['MX$', 2.4], lang: ES, cup: ['Concacaf Champions Cup', 0.05], dish: 'unos tamales', food: 'tacos al pastor, sin tortillas recién hechas, sin el mole de tu abuela', teams: mx },
  { code: 'US', name: 'Estados Unidos', adj: 'estadounidense', people: 'estadounidenses', conf: 'CONCACAF', federation: 'U.S. Soccer', ntName: 'el Team USA', stadium: 'el SoFi Stadium',
    strength: 83, callup: 75, wc: 0.75, level: 12, kit: ['#FFFFFF', '#0A3161'], flag: 'us', regionLabel: 'Estado', split: false,
    money: ['US$', 0.13], lang: 'inglés', cold: true, cup: ['Concacaf Champions Cup', 0.05], dish: 'una hamburguesa', food: 'las barbacoas del domingo, sin el pastel de manzana de tu abuela', teams: us },
  { code: 'CR', name: 'Costa Rica', adj: 'tica', people: 'ticos', conf: 'CONCACAF', federation: 'la Fedefútbol', ntName: 'la Sele', stadium: 'el Estadio Nacional',
    strength: 73, callup: 72, wc: 0.12, level: 4, kit: ['#CE1126', '#002B7F'], flag: 'cr', regionLabel: 'Provincia', split: true,
    money: ['₡', 66], lang: ES, dish: 'un gallo pinto', food: 'gallo pinto, sin casado, sin los tamales de tu abuela', teams: cr },
  { code: 'HN', name: 'Honduras', adj: 'catracha', people: 'catrachos', conf: 'CONCACAF', federation: 'FENAFUTH', ntName: 'la H', stadium: 'el Olímpico Metropolitano',
    strength: 70, callup: 71, wc: 0.06, level: -1, kit: ['#FFFFFF', '#00BCE4'], flag: 'hn', regionLabel: 'Departamento', split: true,
    money: ['L ', 3.4], lang: ES, dish: 'una baleada', food: 'baleadas, sin sopa de caracol, sin las tortillas de tu abuela', teams: hn },
  { code: 'SV', name: 'El Salvador', adj: 'salvadoreña', people: 'salvadoreños', conf: 'CONCACAF', federation: 'FESFUT', ntName: 'la Selecta', stadium: 'el Cuscatlán',
    strength: 64, callup: 70, wc: 0.01, level: -4, kit: ['#0F47AF', '#FFFFFF'], flag: 'sv', regionLabel: 'Departamento', split: true,
    money: ['US$', 0.13], lang: ES, dish: 'una pupusa', food: 'pupusas, sin curtido, sin los tamales de tu abuela', teams: sv },
  { code: 'PA', name: 'Panamá', adj: 'panameña', people: 'panameños', conf: 'CONCACAF', federation: 'FEPAFUT', ntName: 'la Marea Roja', stadium: 'el Rommel Fernández',
    strength: 74, callup: 72, wc: 0.2, level: -2, kit: ['#DA121A', '#FFFFFF'], flag: 'pa', regionLabel: 'Provincia', split: true,
    money: ['B/.', 0.13], lang: ES, dish: 'una empanada', food: 'sancocho, sin patacones, sin el arroz con pollo de tu abuela', teams: pa },
  { code: 'AR', name: 'Argentina', adj: 'argentina', people: 'argentinos', conf: 'CONMEBOL', federation: 'la AFA', ntName: 'la Albiceleste', stadium: 'el Monumental',
    strength: 93, callup: 79, wc: 0.97, level: 15, kit: ['#74ACDF', '#FFFFFF'], flag: 'ar', regionLabel: 'Provincia', split: true,
    money: ['AR$', 180], lang: ES, cup: ['Copa Libertadores', 0.06], dish: 'una empanada', food: 'asado del domingo, sin mate, sin las empanadas de tu abuela', teams: ar },
  { code: 'BR', name: 'Brasil', adj: 'brasileña', people: 'brasileños', conf: 'CONMEBOL', federation: 'la CBF', ntName: 'la Canarinha', stadium: 'el Maracaná',
    strength: 90, callup: 78, wc: 0.97, level: 17, kit: ['#FFDF00', '#009C3B'], flag: 'br', regionLabel: 'Estado', split: false,
    money: ['R$', 0.71], lang: 'portugués', cup: ['Copa Libertadores', 0.06], dish: 'un pão de queijo', food: 'feijoada, sin pão de queijo, sin el arroz con frijoles de tu abuela', teams: br },
  { code: 'CO', name: 'Colombia', adj: 'colombiana', people: 'colombianos', conf: 'CONMEBOL', federation: 'la FCF', ntName: 'la Tricolor', stadium: 'el Metropolitano de Barranquilla',
    strength: 83, callup: 76, wc: 0.8, level: 9, kit: ['#FCD116', '#003893'], flag: 'co', regionLabel: 'Departamento', split: true,
    money: ['COL$', 520], lang: ES, cup: LIB, dish: 'una arepa', food: 'arepas, sin bandeja paisa, sin el ajiaco de tu abuela', teams: co },
  { code: 'UY', name: 'Uruguay', adj: 'uruguaya', people: 'uruguayos', conf: 'CONMEBOL', federation: 'la AUF', ntName: 'la Celeste', stadium: 'el Centenario',
    strength: 84, callup: 77, wc: 0.8, level: 8, kit: ['#5CBFEB', '#FFFFFF'], flag: 'uy', regionLabel: 'Departamento', split: true,
    money: ['UY$', 5.2], lang: ES, cup: LIB, dish: 'un chivito', food: 'asado, sin mate, sin el chivito de los domingos', teams: uy },
  { code: 'CL', name: 'Chile', adj: 'chilena', people: 'chilenos', conf: 'CONMEBOL', federation: 'la ANFP', ntName: 'la Roja', stadium: 'el Estadio Nacional de Santiago',
    strength: 75, callup: 73, wc: 0.35, level: 6, kit: ['#D52B1E', '#FFFFFF'], flag: 'cl', regionLabel: 'Región', split: false,
    money: ['CLP$', 123], lang: ES, cup: LIB, dish: 'una empanada de pino', food: 'empanadas de pino, sin pastel de choclo, sin la cazuela de tu abuela', teams: cl },
  { code: 'PE', name: 'Perú', adj: 'peruana', people: 'peruanos', conf: 'CONMEBOL', federation: 'la FPF', ntName: 'la Blanquirroja', stadium: 'el Estadio Nacional de Lima',
    strength: 75, callup: 73, wc: 0.3, level: 3, kit: ['#FFFFFF', '#D91023'], flag: 'pe', regionLabel: 'Departamento', split: true,
    money: ['S/', 0.48], lang: ES, cup: LIB, dish: 'un anticucho', food: 'ceviche, sin lomo saltado, sin el ají de gallina de tu abuela', teams: pe },
  { code: 'EC', name: 'Ecuador', adj: 'ecuatoriana', people: 'ecuatorianos', conf: 'CONMEBOL', federation: 'la FEF', ntName: 'la Tri', stadium: 'el Rodrigo Paz Delgado',
    strength: 80, callup: 75, wc: 0.7, level: 8, kit: ['#FFDD00', '#034EA2'], flag: 'ec', regionLabel: 'Provincia', split: false,
    money: ['US$', 0.13], lang: ES, cup: LIB, dish: 'un bolón de verde', food: 'encebollado, sin bolón de verde, sin el seco de pollo de tu abuela', teams: ec },
  { code: 'PY', name: 'Paraguay', adj: 'paraguaya', people: 'paraguayos', conf: 'CONMEBOL', federation: 'la APF', ntName: 'la Albirroja', stadium: 'el Defensores del Chaco',
    strength: 76, callup: 74, wc: 0.45, level: 5, kit: ['#D52B1E', '#FFFFFF'], flag: 'py', regionLabel: 'Departamento', split: true,
    money: ['₲', 970], lang: ES, cup: LIB, dish: 'una chipa', food: 'chipa, sin sopa paraguaya, sin el tereré de las tardes', teams: py },
  { code: 'BO', name: 'Bolivia', adj: 'boliviana', people: 'bolivianos', conf: 'CONMEBOL', federation: 'la FBF', ntName: 'la Verde', stadium: 'el Hernando Siles',
    strength: 66, callup: 70, wc: 0.08, level: -1, kit: ['#007934', '#FFFFFF'], flag: 'bo', regionLabel: 'Departamento', split: true,
    money: ['Bs ', 0.9], lang: ES, cup: LIB, dish: 'una salteña', food: 'salteñas, sin silpancho, sin el pique macho de los domingos', teams: bo },
  { code: 'VE', name: 'Venezuela', adj: 'venezolana', people: 'venezolanos', conf: 'CONMEBOL', federation: 'la FVF', ntName: 'la Vinotinto', stadium: 'el Monumental de Maturín',
    strength: 74, callup: 73, wc: 0.3, level: -1, kit: ['#7B1E3A', '#FFFFFF'], flag: 've', regionLabel: 'Estado', split: true,
    money: ['US$', 0.13], lang: ES, wcDebut: true, cup: LIB, dish: 'una arepa', food: 'arepas, sin pabellón, sin las hallacas de tu abuela', teams: ve },
  { code: 'ES', name: 'España', adj: 'española', people: 'españoles', conf: 'UEFA', federation: 'la RFEF', ntName: 'la Roja', stadium: 'el Metropolitano',
    strength: 92, callup: 77, wc: 0.97, level: 22, kit: ['#C60B1E', '#FFC400'], flag: 'es', regionLabel: 'Comunidad', split: false,
    money: ['€', 0.12], lang: ES, cold: true, cup: UCL, dish: 'un bocadillo de tortilla', food: 'tortilla de patatas, sin jamón, sin el cocido de tu abuela', teams: es },
  { code: 'EN', name: 'Inglaterra', adj: 'inglesa', people: 'ingleses', conf: 'UEFA', federation: 'la FA', ntName: 'los Tres Leones', stadium: 'Wembley',
    strength: 90, callup: 77, wc: 0.97, level: 24, kit: ['#FFFFFF', '#CF081F'], flag: 'gb-eng', regionLabel: 'Región', split: false,
    money: ['£', 0.1], lang: 'inglés', cold: true, cup: UCL, dish: 'un pastel de carne', food: 'fish and chips, sin el desayuno inglés, sin el asado de los domingos', teams: en },
  { code: 'IT', name: 'Italia', adj: 'italiana', people: 'italianos', conf: 'UEFA', federation: 'la FIGC', ntName: 'la Azzurra', stadium: 'el Olímpico de Roma',
    strength: 87, callup: 76, wc: 0.8, level: 21, kit: ['#0064AA', '#FFFFFF'], flag: 'it', regionLabel: 'Región', split: false,
    money: ['€', 0.12], lang: 'italiano', cold: true, cup: UCL, dish: 'un plato de pasta', food: 'la pasta de tu abuela, sin pizza de verdad, sin un buen espresso', teams: it },
  { code: 'DE', name: 'Alemania', adj: 'alemana', people: 'alemanes', conf: 'UEFA', federation: 'la DFB', ntName: 'la Mannschaft', stadium: 'el Olympiastadion',
    strength: 88, callup: 77, wc: 0.95, level: 21, kit: ['#FFFFFF', '#000000'], flag: 'de', regionLabel: 'Estado', split: false,
    money: ['€', 0.12], lang: 'alemán', cold: true, cup: UCL, dish: 'un pretzel', food: 'bratwurst, sin pretzels, sin el pastel de tu abuela', teams: de },
  { code: 'FR', name: 'Francia', adj: 'francesa', people: 'franceses', conf: 'UEFA', federation: 'la FFF', ntName: 'les Bleus', stadium: 'el Stade de France',
    strength: 92, callup: 79, wc: 0.97, level: 19, kit: ['#002395', '#FFFFFF'], flag: 'fr', regionLabel: 'Región', split: false,
    money: ['€', 0.12], lang: 'francés', cold: true, cup: UCL, dish: 'un cruasán', food: 'baguette recién horneada, sin quesos, sin el guiso de tu abuela', teams: fr },
  { code: 'PT', name: 'Portugal', adj: 'portuguesa', people: 'portugueses', conf: 'UEFA', federation: 'la FPF', ntName: 'la Selección das Quinas', stadium: 'el Estádio da Luz',
    strength: 89, callup: 78, wc: 0.95, level: 15, kit: ['#DA291C', '#006600'], flag: 'pt', regionLabel: 'Distrito', split: false,
    money: ['€', 0.12], lang: 'portugués', cup: ['Champions League', 0.015], dish: 'un pastel de nata', food: 'bacalao, sin pastéis de nata, sin el caldo verde de tu abuela', teams: pt },
  { code: 'NL', name: 'Países Bajos', adj: 'neerlandesa', people: 'neerlandeses', conf: 'UEFA', federation: 'la KNVB', ntName: 'la Oranje', stadium: 'el Johan Cruyff Arena',
    strength: 88, callup: 76, wc: 0.9, level: 14, kit: ['#FF6200', '#FFFFFF'], flag: 'nl', regionLabel: 'Provincia', split: false,
    money: ['€', 0.12], lang: 'neerlandés', cold: true, cup: ['Champions League', 0.015], dish: 'unas croquetas', food: 'stroopwafels, sin croquetas, sin el guiso de tu abuela', teams: nl },
  { code: 'JP', name: 'Japón', adj: 'japonesa', people: 'japoneses', conf: 'AFC', federation: 'la JFA', ntName: 'los Samuráis Azules', stadium: 'el Estadio Nacional de Tokio',
    strength: 82, callup: 75, wc: 0.95, level: 10, kit: ['#0B2C80', '#FFFFFF'], flag: 'jp', regionLabel: 'Prefectura', split: false,
    money: ['¥', 19.5], lang: 'japonés', cold: true, cup: ['Champions League de la AFC', 0.06], dish: 'un onigiri', food: 'ramen, sin sushi de verdad, sin el curry de tu abuela', teams: jp },
  { code: 'SA', name: 'Arabia Saudita', adj: 'saudí', people: 'saudíes', conf: 'AFC', federation: 'la SAFF', ntName: 'los Halcones Verdes', stadium: 'el King Fahd',
    strength: 72, callup: 74, wc: 0.4, level: 11, kit: ['#006C35', '#FFFFFF'], flag: 'sa', regionLabel: 'Región', split: false,
    money: ['SAR ', 0.49], lang: 'árabe', cup: ['Champions League de la AFC', 0.06], dish: 'unos dátiles', food: 'kabsa, sin dátiles, sin el café árabe de tu abuela', teams: sa },
  { code: 'MA', name: 'Marruecos', adj: 'marroquí', people: 'marroquíes', conf: 'CAF', federation: 'la FRMF', ntName: 'los Leones del Atlas', stadium: 'el Príncipe Moulay Abdellah',
    strength: 83, callup: 77, wc: 0.92, level: 6, kit: ['#C1272D', '#006233'], flag: 'ma', regionLabel: 'Región', split: false,
    money: ['MAD ', 1.27], lang: 'árabe', cup: ['Champions League de la CAF', 0.07], dish: 'un pan de sémola', food: 'tajín, sin cuscús, sin el té de menta de tu abuela', teams: ma },
];

export const COUNTRIES: Country[] = ROWS.map((r) => ({
  ...r,
  leagues: r.teams.leagues.map((l) => l.name),
  regions: r.regions ?? [...new Set(r.teams.leagues.flatMap((l) => l.teams.map((t) => t.dept)))].sort((a, b) => a.localeCompare(b, 'es')),
}));

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));
/** País por código; las carreras guardadas antes de que existiera la nacionalidad son de Guatemala. */
export const countryOf = (code?: string): Country => BY_CODE.get(code ?? 'GT') ?? BY_CODE.get('GT')!;

// Los títulos se cuentan por el nombre de la liga: dos ligas con el mismo nombre se confundirían.
const leagueNames = new Set<string>();
for (const name of COUNTRIES.flatMap((c) => c.leagues)) {
  if (leagueNames.has(name)) throw new Error(`Liga repetida: ${name}`);
  leagueNames.add(name);
}

/** Monto en la moneda del país a partir de quetzales, redondeado a dos cifras: "Q3,000", "€360". */
export function money(c: Country, quetzales: number): string {
  const [symbol, rate] = c.money;
  const n = quetzales * rate;
  const step = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1);
  return `${symbol}${(Math.round(n / step) * step).toLocaleString('en-US')}`;
}
