// Carrera guardada (specs/continuar-carrera): formato, validación y (de)serialización. Puro: sin DOM ni almacenamiento.
//
// SI CAMBIA LA FORMA de Player, de SeasonRecord, de GameEvent/Effects, de la agenda (ritmo.ts) o de EstadoMotor (engine.ts):
//   1. Actualizar el validador de abajo (`forma` rechaza claves desconocidas y faltantes: una carrera con un campo que el validador no
//      conoce NO se puede retomar, se descarta entera; scripts/continuar-carrera.test.ts falla si pasa con una carrera simulada).
//   2. Subir FORMATO si el significado de un campo guardado cambió (la versión debe coincidir exactamente al leer).
//
// Lo guardado es un dato NO confiable (el jugador lo puede editar): todo o nada, y se construye una copia nueva campo a campo.
import { ALL_CLUBS } from './clubs';
import { COUNTRIES, countryOf } from './countries';
import { Career, START_YEAR, summarize, type EstadoMotor } from './engine';
import { CATALOGO } from './tienda';
import type { Item } from './ritmo';
import type {
  AwardKind, CambioSel, Compra, Contract, Contratado, Effects, EventCategory, EventOption, GameEvent, MinigameKind, NtGroup, NtGroupRow, NtMatch,
  Outcome, Player, PlayerSetup, Resolution, SeasonAward, SeasonRecord,
} from './types';
import { BEARD_STYLES, EXTRAS, HAIR_COLORS, HAIR_STYLES, SKIN_TONES } from '../ui/avatar';

export const FORMATO = 1;
export const MAX_CARACTERES = 200_000;

// ---------- Piezas del validador: cada una lanza ante un valor malo y devuelve el valor limpio ----------
type V<T> = (v: unknown) => T;
const no = (): never => {
  throw new Error('guardado inválido');
};
const num = (min: number, max: number): V<number> => (v) => (typeof v === 'number' && v >= min && v <= max ? v : no());
const ent = (min: number, max: number): V<number> => (v) => (typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : no());
const txt = (max: number, min = 0): V<string> => (v) => (typeof v === 'string' && v.length >= min && v.length <= max ? v : no());
const bool: V<boolean> = (v) => (typeof v === 'boolean' ? v : no());
const uno = <T extends string>(valores: readonly T[]): V<T> => (v) => (valores.includes(v as T) ? (v as T) : no());
const lista = <T>(max: number, f: V<T>, min = 0): V<T[]> => (v) => (Array.isArray(v) && v.length >= min && v.length <= max ? v.map((x) => f(x)) : no());
const par = <A, B>(a: V<A>, b: V<B>): V<[A, B]> => (v) => (Array.isArray(v) && v.length === 2 ? [a(v[0]), b(v[1])] : no());
const nulo = <T>(f: V<T>): V<T | null> => (v) => (v === null ? null : f(v));

type Forma<T> = { [K in keyof T]-?: V<Exclude<T[K], undefined>> };
/** Objeto con exactamente estas claves (las opcionales pueden faltar). Construye un objeto nuevo: nunca devuelve el leído. */
function forma<T extends object>(campos: Forma<T>, opcionales: readonly (keyof T)[] = []): V<T> {
  return (v) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return no();
    const o = v as Record<string, unknown>;
    // Claves desconocidas (incluida "__proto__", que JSON.parse deja como clave propia) no pasan.
    for (const k of Object.keys(o)) if (!Object.hasOwn(campos, k)) no();
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(campos)) {
      if (!Object.hasOwn(o, k)) {
        if (opcionales.includes(k as keyof T)) continue;
        no();
      }
      out[k] = (campos as Record<string, V<unknown>>)[k](o[k]);
    }
    return out as T;
  };
}

// ---------- Conjuntos cerrados (Record<...> obliga a que la lista esté completa si el tipo crece) ----------
const claves = <T extends string>(r: Record<T, unknown>) => Object.keys(r) as T[];
const CATEGORIAS = claves<EventCategory>({
  formacion: 1, vida: 1, cancha: 1, medios: 1, contrato: 1, seleccion: 1, extranjero: 1, divisiones: 1, amor: 1, retiro: 1, minijuego: 1,
});
const PREMIOS = claves<AwardKind>({ goleador: 1, asistidor: 1, portero: 1, joven: 1, mvp: 1, ideal: 1, balon: 1, bota: 1, golden: 1 });
const MINIJUEGOS = claves<MinigameKind>({ penal: 1, atajada: 1, pase: 1, cierre: 1 });
const TRASPASOS = claves<NonNullable<Effects['transfer']>>({ up: 1, down: 1, tierUp: 1, abroad: 1, abroadUp: 1, home: 1, any: 1, suitor: 1 });
const POSICIONES = ['POR', 'DEF', 'MED', 'DEL'] as const;
const PIES = ['Derecho', 'Zurdo', 'Ambidiestro'] as const;
const MODOS = ['intensa', 'normal', 'expres'] as const;

const IDS_CLUB = new Set(ALL_CLUBS.map((c) => c.id));
const IDS_ITEM = new Set(CATALOGO.map((i) => i.id));
const club: V<string> = (v) => (typeof v === 'string' && IDS_CLUB.has(v) ? v : no());
const itemTienda: V<string> = (v) => (typeof v === 'string' && IDS_ITEM.has(v) ? v : no());
const pais: V<string> = uno(COUNTRIES.map((c) => c.code));
/** Nombre de bandera: acotado por patrón y sin ninguna propiedad de Object.prototype (el objeto resultante se arma por clave validada). */
const claveBandera: V<string> = (v) => (typeof v === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(v) && !(v in Object.prototype) ? v : no());
const dinero = num(0, 1e12);
const resultado = uno(['ok', 'half', 'fail'] as const);

// ---------- Jugador ----------
const avatar = forma<PlayerSetup['avatar']>({
  skin: ent(0, SKIN_TONES.length - 1), hair: ent(0, HAIR_STYLES.length - 1), hairColor: ent(0, HAIR_COLORS.length - 1),
  beard: ent(0, BEARD_STYLES.length - 1), extra: ent(0, EXTRAS.length - 1),
});
const setupBase = forma<PlayerSetup>({
  firstName: txt(16), lastName: txt(18, 1), country: pais, dept: txt(40), position: uno(POSICIONES), foot: uno(PIES), number: ent(1, 99),
  mode: uno(MODOS), avatar,
});
const setup: V<PlayerSetup> = (v) => {
  const s = setupBase(v);
  // El departamento sale de la lista de su país: el motor lo usa como clave de una tabla.
  if (!countryOf(s.country).regions.includes(s.dept)) no();
  return s;
};

const premio = forma<SeasonAward>({ kind: uno(PREMIOS), name: txt(160), label: txt(80) }, ['label']);
const partido = forma<NtMatch>(
  { comp: txt(120), rival: txt(80), gf: ent(0, 50), ga: ent(0, 50), goals: ent(0, 50), round: txt(60), pen: par(ent(0, 50), ent(0, 50)) },
  ['round', 'pen'],
);
const fila = forma<NtGroupRow>({
  team: txt(80), pj: ent(0, 60), g: ent(0, 60), e: ent(0, 60), p: ent(0, 60), gf: ent(0, 300), ga: ent(0, 300), pts: ent(0, 300),
});
const grupo = forma<NtGroup>({ comp: txt(120), note: txt(200), advance: ent(0, 8), table: lista(24, fila), out: txt(100) }, ['out']);
const seleccion = forma<NonNullable<SeasonRecord['nt']>>(
  { debut: bool, matches: lista(60, partido), groups: lista(8, grupo), team: pais, cambio: bool },
  ['groups', 'team', 'cambio'],
);
const temporada = forma<SeasonRecord>(
  {
    label: (v) => (typeof v === 'string' && /^\d{4}-\d{2}$/.test(v) ? v : no()),
    age: ent(14, 70), clubId: club, tier: ent(0, 3) as V<SeasonRecord['tier']>, apps: ent(0, 100), goals: ent(0, 300), assists: ent(0, 300),
    rating: ent(0, 97), titles: lista(30, txt(160)), awards: lista(30, premio), cleanSheets: ent(0, 100), injured: bool, note: txt(400), nt: seleccion,
    salary: dinero, gastos: forma<NonNullable<SeasonRecord['gastos']>>({ personal: dinero, despidos: lista(8, txt(300)) }),
  },
  ['cleanSheets', 'note', 'nt', 'gastos'],
);
const contrato = forma<Contract>({ salary: dinero, until: ent(START_YEAR, START_YEAR + 80) });
const compra = forma<Compra>({ id: itemTienda, year: ent(START_YEAR, START_YEAR + 80), precio: dinero, fama: num(0, 100) });
const contratado = forma<Contratado>({ id: itemTienda, desde: ent(START_YEAR, START_YEAR + 80) });
const cambioSel = forma<CambioSel>({ to: pais, from: pais, caps: ent(0, 5000), goals: ent(0, 5000), year: ent(START_YEAR, START_YEAR + 80), via: uno(['madre', 'padre', 'naturalizacion'] as const) });
const herencia = forma<NonNullable<Player['herencia']>>({ country: pais, side: uno(['madre', 'padre'] as const) });
const banderas: V<Record<string, number>> = (v) => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return no();
  const ks = Object.keys(v);
  if (ks.length > 200) no();
  const out: Record<string, number> = {};
  for (const k of ks) out[claveBandera(k)] = ent(0, 1000)((v as Record<string, unknown>)[k]);
  return out;
};
const textos = lista(300, txt(300));
const jugador = forma<Player>(
  {
    setup, age: ent(14, 70), year: ent(START_YEAR, START_YEAR + 80), rating: num(0, 97), potential: num(0, 97), morale: num(0, 100), fitness: num(0, 100),
    fame: num(0, 9999), coach: num(0, 100), clubId: club, injurySeasons: ent(0, 60), ntLevel: ent(0, 3) as V<Player['ntLevel']>, caps: ent(0, 5000),
    natGoals: ent(0, 5000), wcProgress: ent(0, 3), seasons: lista(60, temporada), titles: textos, awards: textos, milestones: textos, flags: banderas,
    peakRating: ent(0, 97), retired: bool, cambioSel, herencia, contract: contrato, compras: lista(600, compra), personal: lista(4, contratado),
  },
  ['cambioSel', 'herencia'],
);

// ---------- Decisión pendiente ----------
const bandera = claveBandera;
const efectos = forma<Effects>(
  {
    rating: num(-200, 200), potential: num(-200, 200), morale: num(-200, 200), fitness: num(-200, 200), fame: num(-200, 200), coach: num(-200, 200),
    injury: num(-10, 10), transfer: uno(TRASPASOS), transferTo: club, retire: bool,
    flag: (v) => (typeof v === 'string' ? bandera(v) : lista(8, bandera)(v)), unflag: (v) => (typeof v === 'string' ? bandera(v) : lista(8, bandera)(v)),
    position: uno(POSICIONES), milestone: txt(300), ntLevel: ent(0, 3) as V<NonNullable<Effects['ntLevel']>>, caps: num(-5000, 5000),
    natGoals: num(-5000, 5000), wcProgress: num(-10, 10), natTeam: pais, contract: contrato,
  },
  ['rating', 'potential', 'morale', 'fitness', 'fame', 'coach', 'injury', 'transfer', 'transferTo', 'retire', 'flag', 'unflag', 'position', 'milestone',
    'ntLevel', 'caps', 'natGoals', 'wcProgress', 'natTeam', 'contract'],
);
const desenlaceEvento = forma<Outcome>({ p: num(0, 1), text: txt(1500), effects: efectos });
const opcion = forma<EventOption>({ label: txt(800), outcomes: lista(6, desenlaceEvento, 1) });
const evento: V<GameEvent> = (v) => {
  const e = forma<GameEvent>(
    {
      id: txt(80, 1), category: uno(CATEGORIAS), title: txt(300), text: txt(3000), options: lista(8, opcion, 1), clase: uno(['ritmo', 'historia'] as const),
      offers: lista(4, forma<NonNullable<GameEvent['offers']>[number]>({ clubId: club, salary: dinero, years: ent(0, 20) })),
      minigame: forma<NonNullable<GameEvent['minigame']>>({ kind: uno(MINIJUEGOS), difficulty: num(0.1, 0.9) }),
    },
    ['clase', 'offers', 'minigame'],
  )(v);
  // Un minijuego se resuelve con la opción 0 y exactamente tres desenlaces (éxito, a medias, fallo), como exige Career.choose.
  if (e.minigame && e.options[0].outcomes.length !== 3) no();
  return e;
};
const paso: V<Item> = (v) => {
  const k = typeof v === 'object' && v !== null ? (v as { k?: unknown }).k : undefined;
  if (k === 'paso' || k === 'entrada') return forma<{ k: 'paso' | 'entrada'; cat: EventCategory }>({ k: uno(['paso', 'entrada'] as const), cat: uno(CATEGORIAS) })(v);
  if (k === 'nac') return forma<{ k: 'nac'; id: string }>({ k: uno(['nac'] as const), id: txt(80, 1) })(v);
  return forma<{ k: 'retiro' | 'oferta' | 'consecuencia' | 'ritmo' }>({ k: uno(['retiro', 'oferta', 'consecuencia', 'ritmo'] as const) })(v);
};
const motor = forma<EstadoMotor>({
  rng: ent(0, 2 ** 32 - 1), player: jugador, usedOnce: lista(400, txt(80)), lastSeen: lista(400, par(txt(80), ent(0, 100))),
  recentCategories: lista(3, uno(CATEGORIAS)), suitor: nulo(club), pending: nulo(evento), agenda: lista(12, paso), hechas: ent(0, 20), de: ent(0, 20),
  ritmoK: ent(0, 20), mjHecho: bool, escala: num(0, 1),
});
const desenlace = forma<Resolution>({ text: txt(1500), changes: lista(12, txt(200)), result: resultado }, ['result']);
const raiz = forma<{ v: number; motor: EstadoMotor; desenlace: Resolution | null }>({
  v: (x) => (x === FORMATO ? x : no()), motor, desenlace: nulo(desenlace),
});

// ---------- API ----------
/** El texto a guardar, o null si la carrera pasa de MAX_CARACTERES (o no se puede serializar). */
export function serializar(c: Career, d: Resolution | null): string | null {
  try {
    const texto = JSON.stringify({ v: FORMATO, motor: c.exportar(), desenlace: d });
    return texto.length > MAX_CARACTERES ? null : texto;
  } catch {
    return null;
  }
}

/** Lee lo guardado: todo o nada. null si algo no cuadra; nunca lanza. Devuelve una carrera armada con una copia nueva de los datos. */
export function leer(texto: string): { career: Career; desenlace: Resolution | null } | null {
  try {
    if (typeof texto !== 'string' || texto.length > MAX_CARACTERES) return null;
    const r = raiz(JSON.parse(texto));
    // Una decisión pendiente y un desenlace en pantalla a la vez no existen: "Seguir" lanzaría y el juego quedaría trabado.
    if (r.motor.pending && r.desenlace) return null;
    const career = Career.restaurar(r.motor);
    // Prueba de humo: lo que las pantallas leen enseguida. Si algo revienta ahora, mejor descartar que romper el juego después.
    void [career.club, career.nt, career.saldo, career.progreso, career.pendingEvent, career.context(), summarize(career.player)];
    return { career, desenlace: r.desenlace };
  } catch {
    return null;
  }
}
