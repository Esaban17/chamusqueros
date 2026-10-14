import type { EventContext, EventTemplate, Player } from '../types';
import { countryOf } from '../countries';
import { o, opt, has, cap, de } from '../helpers';
import { elegible, residencia } from '../nacionalidad';

// Banderas que usa este archivo:
// nac_no_<código>   rechazó la oferta de ese país: no vuelve a ofrecerle nada (ni por ascendencia ni por naturalización)
// Cambiar de Selección se hace una sola vez por carrera: Effects.natTeam lo aplica engine.ts y deja Player.cambioSel.

/**
 * Peso de las dos ofertas. ponytail: una función y no un número, porque un número >= 3 cuenta como "ruta" y gana prioridad sobre
 * las ofertas de fichaje y otras rutas. Es una oferta rara y corta (pocos jugadores cumplen la regla y la ventana dura un par
 * de temporadas): con peso 2 solo la veía el 0,2 % de las carreras; con 100 casi siempre sale cuando está disponible (~2,5 %).
 */
const PESO_OFERTA = () => 100;

/** Ventana de edad de las ofertas. */
const edad = (p: Player) => p.age >= 19 && p.age <= 31;

/**
 * Condiciones comunes: la federación de `code` lo busca si su nivel alcanza el mínimo de convocatoria de esa Selección,
 * es elegible, no cambió antes, no rechazó a ese país y no está a media eliminatoria mundialista con su Selección.
 */
const nivelYElegible = (p: Player, code: string) =>
  !p.cambioSel && edad(p) && p.rating >= countryOf(code).callup && elegible(p) && p.wcProgress === 0 && !has(p, `nac_no_${code}`);

/** Opciones de las dos ofertas: aceptar (cambia de Selección) o rechazar (bonus con la afición de origen). */
const decision = (ctx: EventContext, code: string, hito: string) => {
  const to = countryOf(code);
  return [
    opt(`Acepto jugar con ${to.ntName}`,
      o(0.8, `Firmaste y ${to.federation} te presentó con la camiseta ${de(to.ntName)}. Nueva casa, nuevos retos.`, { natTeam: code, fame: 8, morale: 8, milestone: hito }),
      o(0.2, `Firmaste, pero en ${ctx.country.name} hay quien lo toma a mal. Ya vestís ${to.ntName} y toca callar bocas en la cancha.`, { natTeam: code, fame: 3, morale: -4, milestone: hito })),
    opt(`Sigo con ${ctx.nt.name}`,
      o(1, `Dijiste que tu camiseta es la de ${ctx.nt.name}. La afición te lo agradece y ${to.federation} entendió la decisión.`, { morale: 6, fame: 3, flag: `nac_no_${code}` })),
  ];
};

export const NACIONALIDAD_EVENTS: EventTemplate[] = [
  {
    id: 'nac_ascendencia',
    category: 'seleccion',
    title: (p) => `${cap(countryOf(p.herencia!.country).name)} te busca`,
    text: (p) => {
      const h = p.herencia!;
      const to = countryOf(h.country);
      return `${cap(to.federation)} revisó tus papeles y encontró algo: ${h.side === 'madre' ? 'tu mamá' : 'tu papá'} es de ${to.name}, así que podés vestir la camiseta ${de(to.ntName)}. Te llamaron por teléfono para ofrecértelo.`;
    },
    when: (p, ctx) => !!p.herencia && (ctx.tier === 1 || ctx.abroad) && nivelYElegible(p, p.herencia.country),
    once: true,
    weight: PESO_OFERTA,
    options: (p, ctx) => {
      const h = p.herencia!;
      return decision(ctx, h.country, `Eligió jugar para ${countryOf(h.country).name} por su ${h.side === 'madre' ? 'madre' : 'padre'}`);
    },
  },
  {
    id: 'nac_naturalizacion',
    category: 'seleccion',
    title: (p) => `Te ofrecen la nacionalidad de ${countryOf(residencia(p)!.code).name}`,
    text: (p, ctx) => {
      const r = residencia(p)!;
      const to = countryOf(r.code);
      return `Llevás ${r.n} años seguidos en ${to.name} y ${to.federation} te propone naturalizarte para jugar con ${to.ntName}. Con ${ctx.country.name} llevás ${p.caps} ${p.caps === 1 ? 'partido' : 'partidos'}.`;
    },
    when: (p) => {
      const r = residencia(p);
      // Si ese país es el de su ascendencia, la oferta es la otra (por la madre o el padre).
      return !!r && r.n >= 5 && p.herencia?.country !== r.code && nivelYElegible(p, r.code);
    },
    weight: PESO_OFERTA,
    options: (p, ctx) => {
      const code = residencia(p)!.code;
      return decision(ctx, code, `Se nacionalizó en ${countryOf(code).name}`);
    },
  },
];
