// Tienda de estilo de vida (specs/tienda): catálogo y reglas puras. Sin DOM y sin importar engine.ts (engine.ts importa este archivo).
// Los precios están en quetzales, como todos los montos del juego; countries.ts los convierte al mostrarlos.
import { countryOf, moneyShort } from './countries';
import type { Player } from './types';

export type Espacio = 'vivienda' | 'carro' | 'helicoptero' | 'avion' | 'yate' | 'entrenador' | 'chef' | 'fisio' | 'asistente' | 'social';
export type Categoria = 'vivienda' | 'carros' | 'transporte' | 'personal' | 'social';
export type Rol = 'entrenador' | 'chef' | 'fisio' | 'asistente';

export interface Item {
  id: string;
  categoria: Categoria;
  espacio: Espacio;
  estrellas: 1 | 2 | 3 | 4 | 5;
  nombre: string;
  /** Compra única, gasto puntual (social) o tarifa por temporada (personal), en quetzales. */
  precio: number;
  /** Ánimo nominal: por temporada (vivienda, carro, transporte, asistente) o inmediato (social). */
  animo: number;
  /** Fama nominal, una sola vez al comprar. */
  fama: number;
  resumen: string;
}

// ponytail: constantes a ojo, calibradas con `npm run simulate` (ver specs/tienda, T7): cada efecto por separado mueve el puntaje medio
// entre 0,5 y 2 puntos con la política que más gasta, y juntos quedan bajo +5 %. Si el balance se mueve, se bajan estas y no el resto del motor.
export const TOPE_ANIMO = 4;
export const TOPE_FAMA = 40;
export const RESERVA_ELITE = 1.5;
export const VENTANA_SOCIAL = 3;
export const MAX_CARROS = 6; // con 5 modelos y sin repetir no se llega; protege si el catálogo crece
export const TOPE_FISICO = 2;
export const TOPE_LESION = 0.4;
const ENTRENADOR_POR_ESTRELLA = 0.01;
const CHEF = { fisico: 0.4, lesion: 0.03 };
const FISIO = { fisico: 0.3, lesion: 0.08 };
const ASISTENTE_ANIMO = [1, 1, 2, 2, 3];
/** Orden en que se cobra el personal (y en que se despide si el saldo no alcanza). */
export const ORDEN_ROLES: Rol[] = ['entrenador', 'fisio', 'chef', 'asistente'];

const ROL_NOMBRE: Record<Rol, string> = { entrenador: 'Entrenador personal', chef: 'Chef', fisio: 'Fisioterapeuta', asistente: 'Asistente' };
/** Descriptor de cada nivel, el mismo para todos los roles. */
const NIVEL = ['de barrio, medio tiempo', 'con experiencia', 'profesional certificado', 'de primer nivel', 'de élite mundial'];
const TARIFA = [6_000, 60_000, 600_000, 6_000_000, 30_000_000];

const pct = (x: number) => `${Math.round(x * 100)} %`;
const num = (x: number) => String(Math.round(x * 10) / 10).replace('.', ',');

const vivienda: [string, number, number][] = [
  ['Apartamento', 50_000, 1],
  ['Casa en residencial', 500_000, 2],
  ['Casa con jardín y piscina', 5_000_000, 3],
  ['Residencia de lujo', 50_000_000, 4],
  ['Mansión', 250_000_000, 5],
];
const carros: [string, number, number, number][] = [
  ['Carro normal', 25_000, 0, 0],
  ['Carro nuevo', 300_000, 1, 0],
  ['Camioneta premium', 3_000_000, 1, 1],
  ['Deportivo', 30_000_000, 2, 2],
  ['Deportivo de lujo', 120_000_000, 2, 3],
];
// estrellas, nombre, precio, ánimo, fama
const transporte: Record<'helicoptero' | 'avion' | 'yate', [number, string, number, number, number][]> = {
  helicoptero: [[3, 'Helicóptero ligero', 45_000_000, 1, 2], [4, 'Helicóptero ejecutivo', 150_000_000, 2, 3]],
  yate: [[3, 'Yate de 12 metros', 60_000_000, 1, 2], [4, 'Yate de 25 metros', 200_000_000, 2, 3], [5, 'Superyate', 700_000_000, 3, 4]],
  avion: [[4, 'Avión turbohélice', 250_000_000, 2, 3], [5, 'Jet privado', 600_000_000, 3, 4]],
};
const social: [string, number, number, number][] = [
  ['Parrillada con amigos', 5_000, 1, 0],
  ['Cena de lujo', 300_000, 1, 0],
  ['Fiesta VIP', 3_000_000, 2, 1],
  ['Palco propio', 30_000_000, 2, 2],
  ['Gala benéfica', 100_000_000, 3, 4],
];

const resumenFijo = (animo: number, fama: number) =>
  [animo ? `Ánimo +${animo} por temporada` : '', fama ? `Fama +${fama} una vez` : ''].filter(Boolean).join(' · ') || 'Sin efecto: te lleva a los entrenamientos';

function rolItem(rol: Rol, e: number): Item {
  const salud = (x: { fisico: number; lesion: number }) => `Físico +${num(x.fisico * e)} por temporada · evita ${pct(x.lesion * e)} de las lesiones`;
  const efecto = { entrenador: `Avance de nivel +${e} % hasta los 29 años`, chef: salud(CHEF), fisio: salud(FISIO), asistente: `Ánimo +${ASISTENTE_ANIMO[e - 1]} por temporada` }[rol];
  return {
    id: `${rol}-${e}`, categoria: 'personal', espacio: rol, estrellas: e as Item['estrellas'], precio: TARIFA[e - 1],
    nombre: `${ROL_NOMBRE[rol]} ${NIVEL[e - 1]}`, animo: rol === 'asistente' ? ASISTENTE_ANIMO[e - 1] : 0, fama: 0, resumen: `${efecto} · tarifa por temporada`,
  };
}

export const CATALOGO: Item[] = [
  ...vivienda.map(([nombre, precio, animo], i): Item => ({
    id: `vivienda-${i + 1}`, categoria: 'vivienda', espacio: 'vivienda', estrellas: (i + 1) as Item['estrellas'], nombre, precio, animo, fama: 0, resumen: resumenFijo(animo, 0),
  })),
  ...carros.map(([nombre, precio, animo, fama], i): Item => ({
    id: `carro-${i + 1}`, categoria: 'carros', espacio: 'carro', estrellas: (i + 1) as Item['estrellas'], nombre, precio, animo, fama, resumen: resumenFijo(animo, fama),
  })),
  ...(['helicoptero', 'yate', 'avion'] as const).flatMap((espacio) =>
    transporte[espacio].map(([estrellas, nombre, precio, animo, fama]): Item => ({
      id: `${espacio}-${estrellas}`, categoria: 'transporte', espacio, estrellas: estrellas as Item['estrellas'], nombre, precio, animo, fama, resumen: resumenFijo(animo, fama),
    })),
  ),
  ...ORDEN_ROLES.flatMap((rol) => [1, 2, 3, 4, 5].map((e) => rolItem(rol, e))),
  ...social.map(([nombre, precio, animo, fama], i): Item => ({
    id: `social-${i + 1}`, categoria: 'social', espacio: 'social', estrellas: (i + 1) as Item['estrellas'], nombre, precio, animo, fama,
    resumen: `Ánimo +${animo}${fama ? ` y fama +${fama}` : ''} al instante · se paga una vez`,
  })),
];

export const CATEGORIAS: [Categoria, string][] = [
  ['vivienda', 'Vivienda'],
  ['carros', 'Carros'],
  ['transporte', 'Transporte de élite'],
  ['personal', 'Personal'],
  ['social', 'Vida social'],
];

const BY_ID = new Map(CATALOGO.map((i) => [i.id, i]));
export const itemById = (id: string): Item | undefined => BY_ID.get(id);
const item = (id: string) => itemById(id)!;

// ---------- Dinero ----------

/** Lo gastado: compras pagadas y tarifas de personal cobradas al cierre de cada temporada. */
export const gastadoDe = (p: Player) => p.compras.reduce((t, c) => t + c.precio, 0) + p.seasons.reduce((t, r) => t + (r.gastos?.personal ?? 0), 0);
/** Saldo = ganado − gastado. No se guarda: se deriva, así no puede descuadrarse. */
export const saldoDe = (p: Player, ganado: number) => ganado - gastadoDe(p);

// ---------- Lo que tiene ----------

/** Bienes comprados, de menor a mayor estrellas, sin repetir: un solo ítem por espacio (el mejor), salvo los carros, que son una colección. */
export function poseidos(p: Player): Item[] {
  const mejor = new Map<string, Item>();
  const carros: Item[] = [];
  for (const c of p.compras) {
    const it = item(c.id);
    if (it.categoria === 'social') continue;
    if (it.espacio === 'carro') {
      if (!carros.includes(it)) carros.push(it);
    } else if (!mejor.has(it.espacio) || mejor.get(it.espacio)!.estrellas < it.estrellas) mejor.set(it.espacio, it);
  }
  return [...mejor.values(), ...carros].sort((a, b) => a.estrellas - b.estrellas || a.precio - b.precio);
}
/** Lo más importante que compró: hasta 4 bienes (vivienda, carro, transporte) de mayor precio. */
export const destacadas = (p: Player): Item[] => poseidos(p).sort((a, b) => b.precio - a.precio).slice(0, 4);
export const contratados = (p: Player): Item[] => p.personal.map((c) => item(c.id));
export const contratadoDe = (p: Player, rol: Rol): Item | undefined => contratados(p).find((i) => i.espacio === rol);
export const tarifaTotal = (p: Player) => contratados(p).reduce((t, i) => t + i.precio, 0);

// ---------- Efectos ----------

/** Ánimo base por temporada con rendimientos decrecientes y tope: 5 aporta 2,8; 18 aporta 4,0; nunca 4. De los carros solo cuenta el mejor. */
export function animoBase(p: Player): number {
  const tiene = poseidos(p);
  const mejorCarro = Math.max(0, ...tiene.filter((i) => i.espacio === 'carro').map((i) => i.animo));
  const suma = tiene.filter((i) => i.espacio !== 'carro').reduce((t, i) => t + i.animo, mejorCarro) + (contratadoDe(p, 'asistente')?.animo ?? 0);
  return suma <= 0 ? 0 : animoDe(suma);
}
export const animoDe = (suma: number) => TOPE_ANIMO * (1 - Math.exp(-suma / TOPE_ANIMO));

/** Sube el avance de nivel que viene de la brecha con el potencial; solo hasta los 29 años. */
export function bonoEntrenador(p: Player): number {
  const e = contratadoDe(p, 'entrenador');
  return e && p.age <= 29 ? ENTRENADOR_POR_ESTRELLA * e.estrellas : 0;
}
export function fisicoExtra(p: Player): number {
  const chef = contratadoDe(p, 'chef');
  const fisio = contratadoDe(p, 'fisio');
  return Math.min(TOPE_FISICO, (chef ? CHEF.fisico * chef.estrellas : 0) + (fisio ? FISIO.fisico * fisio.estrellas : 0));
}
/** Probabilidad de evitar una lesión de evento: la de cada uno combinada y con tope. */
export function probEvitaLesion(p: Player): number {
  const chef = contratadoDe(p, 'chef');
  const fisio = contratadoDe(p, 'fisio');
  return Math.min(TOPE_LESION, 1 - (1 - (chef ? CHEF.lesion * chef.estrellas : 0)) * (1 - (fisio ? FISIO.lesion * fisio.estrellas : 0)));
}

/**
 * Abuso de la vida social según las compras de la ventana (la temporada actual y las dos anteriores), sin contar la que se va a hacer:
 * la primera y la segunda no tienen riesgo; la tercera da la mitad y arriesga; desde la cuarta no da nada y arriesga más.
 */
export function riesgoSocial(p: Player): { factor: number; escandalo: number; distraccion: number } {
  const previas = p.compras.filter((c) => item(c.id).categoria === 'social' && c.year > p.year - VENTANA_SOCIAL).length;
  if (previas <= 1) return { factor: 1, escandalo: 0, distraccion: 0 };
  return previas === 2 ? { factor: 0.5, escandalo: 0.2, distraccion: 0.15 } : { factor: 0, escandalo: 0.45, distraccion: 0.25 };
}

/** Lo que queda del tope de fama que puede dar la tienda en toda la carrera. */
export const famaRestante = (p: Player) => Math.max(0, TOPE_FAMA - p.compras.reduce((t, c) => t + c.fama, 0));

// ---------- Validación ----------

export type Causa = 'inexistente' | 'retirado' | 'modo' | 'tiene' | 'saldo' | 'reserva';
export type Validacion = { ok: true; item: Item } | { ok: false; motivo: string; causa: Causa };

/** Todas las reglas de una compra o contratación. La interfaz solo muestra el motivo en texto. */
export function validar(p: Player, saldo: number, id: string, modo: 'comprar' | 'contratar'): Validacion {
  const no = (causa: Causa, motivo: string): Validacion => ({ ok: false, motivo, causa });
  const it = itemById(id);
  if (!it) return no('inexistente', 'Ese ítem no existe en la tienda.');
  if (p.retired) return no('retirado', 'Ya te retiraste: la tienda es para la carrera en curso.');
  if ((it.categoria === 'personal') !== (modo === 'contratar')) return no('modo', it.categoria === 'personal' ? 'Con los profesionales se trabaja por contrato: usá "Contratar".' : 'Ese ítem no es personal: usá "Comprar".');
  const home = countryOf(p.setup.country);
  if (modo === 'contratar') {
    if (contratadoDe(p, it.espacio as Rol)?.id === id) return no('tiene', 'Ya trabaja con vos a ese nivel.');
  } else if (it.espacio === 'carro') {
    if (p.compras.some((c) => c.id === id)) return no('tiene', 'Ya tenés ese carro en el garaje.');
    if (poseidos(p).filter((i) => i.espacio === 'carro').length >= MAX_CARROS) return no('tiene', `El garaje está lleno (hasta ${MAX_CARROS} carros).`);
  } else if (it.categoria !== 'social') {
    const tiene = poseidos(p).find((i) => i.espacio === it.espacio);
    if (tiene && tiene.estrellas >= it.estrellas) return no('tiene', it.estrellas === tiene.estrellas ? 'Ya tenés ese nivel en este espacio.' : `Ya tenés algo mejor: ${tiene.nombre}.`);
  }
  if (saldo < it.precio) return no('saldo', `No te alcanza: te faltan ${moneyShort(home, it.precio - saldo)}.`);
  const reserva = it.categoria === 'transporte' ? it.precio * RESERVA_ELITE : 0;
  if (saldo < reserva) return no('reserva', `Pide un saldo de ${moneyShort(home, reserva)} (${RESERVA_ELITE.toString().replace('.', ',')} veces su precio).`);
  return { ok: true, item: it };
}

/** "★★★☆☆" para 3. */
export const estrellasTexto = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
