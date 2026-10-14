// Datos y funciones puras de Retos Fútbol, compartidos por el servicio (api/futbolista.ts) y el navegador (src/retos/).
// Sin DOM ni fetch. El prefijo "_" hace que Vercel no lo publique como ruta.
// Todos los identificadores se verificaron contra Wikidata el 14/10/2026 y scripts/retos-qids.ts los vuelve a comprobar.

export interface Verificacion { valido: boolean; qid: string | null; nombreCanonico: string | null }

/** País del juego (código de src/engine/countries.ts) → nacionalidades (P27) y selección (P1532) de Wikidata. */
export const PAISES: Record<string, { nac: string[]; sel: string }> = {
  GT: { nac: ['Q774'], sel: 'Q774' },
  MX: { nac: ['Q96'], sel: 'Q96' },
  US: { nac: ['Q30'], sel: 'Q30' },
  CR: { nac: ['Q800'], sel: 'Q800' },
  HN: { nac: ['Q783'], sel: 'Q783' },
  SV: { nac: ['Q792'], sel: 'Q792' },
  PA: { nac: ['Q804'], sel: 'Q804' },
  AR: { nac: ['Q414'], sel: 'Q414' },
  BR: { nac: ['Q155'], sel: 'Q155' },
  CO: { nac: ['Q739'], sel: 'Q739' },
  UY: { nac: ['Q77'], sel: 'Q77' },
  CL: { nac: ['Q298'], sel: 'Q298' },
  PE: { nac: ['Q419'], sel: 'Q419' },
  EC: { nac: ['Q736'], sel: 'Q736' },
  PY: { nac: ['Q733'], sel: 'Q733' },
  BO: { nac: ['Q750'], sel: 'Q750' },
  VE: { nac: ['Q717'], sel: 'Q717' },
  ES: { nac: ['Q29'], sel: 'Q29' },
  // Inglaterra: casi nadie figura con nacionalidad Q21 (31) sino con Q145 (Reino Unido, incluye Escocia y Gales). Solo cuenta quien jugó con su Selección.
  EN: { nac: ['Q21'], sel: 'Q21' },
  IT: { nac: ['Q38'], sel: 'Q38' },
  DE: { nac: ['Q183'], sel: 'Q183' },
  FR: { nac: ['Q142'], sel: 'Q142' },
  PT: { nac: ['Q45'], sel: 'Q45' },
  // Países Bajos: casi nadie figura con Q55 (2) sino con el Reino (Q29999); la Selección sí es Q55.
  NL: { nac: ['Q29999'], sel: 'Q55' },
  JP: { nac: ['Q17'], sel: 'Q17' },
  SA: { nac: ['Q851'], sel: 'Q851' },
  MA: { nac: ['Q1028'], sel: 'Q1028' },
};

/** Club (id del juego, src/engine/clubs.ts) → Q de Wikidata (futbolistas con P54 = ese Q). */
export const CLUBES: Record<string, string> = {
  'municipal': 'Q1024341',
  'comunicaciones': 'Q1024337',
  'xelaju': 'Q868872',
  'antigua': 'Q2853237',
  'cr-saprissa': 'Q868582',
  'cr-alajuelense': 'Q1322654',
  'cr-herediano': 'Q82429',
  'hn-olimpia': 'Q1023208',
  'hn-motagua': 'Q1023205',
  'sv-alianza': 'Q1969256',
  'sv-aguila': 'Q932563',
  'pa-tauro': 'Q921299',
  'mx-america': 'Q459090',
  'mx-guadalajara': 'Q503321',
  'mx-cruz-azul': 'Q845859',
  'mx-pumas': 'Q1143000',
  'mx-tigres': 'Q849823',
  'mx-monterrey': 'Q768253',
  'es-real-madrid': 'Q8682',
  'es-barcelona': 'Q7156',
  'es-atletico-de-madrid': 'Q8701',
  'es-sevilla': 'Q10329',
  'es-athletic-club': 'Q8687',
  'en-manchester-united': 'Q18656',
  'en-manchester-city': 'Q50602',
  'en-liverpool': 'Q1130849',
  'en-chelsea': 'Q9616',
  'en-arsenal': 'Q9617',
  'it-juventus': 'Q1422',
  'it-milan': 'Q1543',
  'it-inter-de-milan': 'Q631',
  'it-napoles': 'Q2641',
  'de-bayern-munich': 'Q15789',
  'de-borussia-dortmund': 'Q41420',
  'fr-paris-saint-germain': 'Q483020',
  'pt-benfica': 'Q131499',
  'pt-oporto': 'Q128446',
  'nl-ajax': 'Q81888',
  'ar-boca-juniors': 'Q170703',
  'ar-river-plate': 'Q15799',
  'br-flamengo': 'Q17479',
  'uy-penarol': 'Q16320',
  'us-inter-miami': 'Q16844931',
  'sa-al-nassr': 'Q482764',
};

/** Lo que se acepta como nombre de futbolista: 2 a 40 caracteres, empieza con letra; solo letras, marcas, espacio, apóstrofo, guion y punto. */
export const NOMBRE_RE = /^\p{L}[\p{L}\p{M}'’ .-]{1,39}$/u;

/** Sin tildes ni mayúsculas, signos como espacio y espacios colapsados: "  LiOnEl   MESSÍ " → "lionel messi". Es la misma en el servidor y en el navegador. */
export const normalizar = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[.'’-]/g, ' ').replace(/\s+/g, ' ').trim();

/** RF-15: el texto (ya normalizado) vale si es una secuencia contigua de palabras de un nombre, o es igual a un apodo completo. */
export const coincide = (t: string, nombres: string[], apodos: string[]): boolean =>
  nombres.some((n) => (' ' + n + ' ').includes(' ' + t + ' ')) || apodos.includes(t);
