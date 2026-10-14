import type { EventTemplate, Player, EventContext } from '../types';
import { CONFED_CUP, type Confed } from '../countries';
import { o, opt, has, cap, de } from '../helpers';

// Banderas que usa este archivo:
// sel_sub17            convocado a la Sub-17 (abre microciclo y Premundial Sub-17)
// sel_sub17_mundial    la Sub-17 clasificó al Mundial Sub-17 (raro)
// sel_sub20            convocado a la Sub-20 (abre el Premundial Sub-20)
// sel_sub20_mundial    la Sub-20 clasificó al Mundial Sub-20
// sel_sub23            jugó el Preolímpico Sub-23
// sel_prelista         está en la prelista de la mayor, esperando el debut
// sel_retirado         se retiró de la Selección mayor (cierra todos los eventos de la mayor)
// sel_elim_fuera       quedó eliminado en la eliminatoria del ciclo actual
// sel_elim_decidido    ya se jugó el partido decisivo de la eliminatoria del ciclo
// sel_repechaje        la Selección se fue al repechaje
// sel_elim_r2          el motor ya jugó la segunda ronda de la eliminatoria del ciclo (la pone engine.ts)
// Las banderas de eliminatoria se limpian en los eventos que solo salen fuera de eliminatoria.

const mayor = (p: Player) => p.ntLevel >= 1 && !has(p, 'sel_retirado');
const enEliminatoria = (p: Player, ctx: EventContext) =>
  ctx.qualifiers && mayor(p) && !has(p, 'sel_elim_fuera');
const limpiaElim = ['sel_elim_fuera', 'sel_elim_decidido', 'sel_repechaje', 'sel_elim_r2'];
const gol = (p: Player) => p.setup.position === 'DEL' || p.setup.position === 'MED';
/** Cuánto más alto que en Guatemala está el listón para entrar a la Selección del jugador. */
const bar = (ctx: EventContext) => ctx.country.callup - 71;
const fed = (ctx: EventContext) => ctx.country.federation;
const gt = (ctx: EventContext) => ctx.country.code === 'GT';

/** Torneos juveniles de cada confederación. */
const JUVENIL: Record<Confed, (cat: string) => string> = {
  CONCACAF: (cat) => `Premundial ${cat} de Concacaf`,
  CONMEBOL: (cat) => `Sudamericano ${cat}`,
  UEFA: (cat) => `Europeo ${cat}`,
  AFC: (cat) => `Copa Asiática ${cat}`,
  CAF: (cat) => `Copa Africana ${cat}`,
};
const PREOLIMPICO: Record<Confed, string> = {
  CONCACAF: 'el Preolímpico de Concacaf',
  CONMEBOL: 'el Preolímpico Sudamericano',
  UEFA: 'el Europeo Sub-21, que reparte los cupos olímpicos',
  AFC: 'la Copa Asiática Sub-23, que reparte los cupos olímpicos',
  CAF: 'la Copa Africana Sub-23, que reparte los cupos olímpicos',
};
const ELIMINATORIA: Record<Confed, string> = {
  CONCACAF: 'en Concacaf nadie regala nada. Toca de visita en el Caribe.',
  CONMEBOL: 'en Sudamérica no hay partido fácil. Toca de visita en la altura.',
  UEFA: 'en Europa nadie regala nada. Toca de visita en una noche helada.',
  AFC: 'en Asia los viajes son eternos. Toca de visita en el Golfo.',
  CAF: 'en África nadie regala nada. Toca de visita con 40 grados.',
};
/** El gigante de la confederación, para la tanda de penales en la copa (si es el propio país, el siguiente). */
const GIGANTE: Record<Confed, [string, string]> = {
  CONCACAF: ['México', 'Estados Unidos'],
  CONMEBOL: ['Brasil', 'Argentina'],
  UEFA: ['España', 'Francia'],
  AFC: ['Japón', 'Corea del Sur'],
  CAF: ['Marruecos', 'Senegal'],
};
const gigante = (ctx: EventContext) => GIGANTE[ctx.country.conf].find((n) => n !== ctx.country.name)!;
/** Selecciones con mucha gente viviendo en Estados Unidos. */
const migrante = (ctx: EventContext) => (ctx.country.conf === 'CONCACAF' || ctx.country.conf === 'CONMEBOL') && ctx.country.code !== 'US';

export const SELECCION_EVENTS: EventTemplate[] = [
  // ---------- Sub-17 ----------
  {
    id: 'sel_sub17_conv',
    category: 'seleccion',
    title: 'Convocatoria a la Sub-17',
    text: (p, ctx) =>
      `Un visor ${de(fed(ctx))} te vio jugar con ${ctx.club.name} y llegó la carta: estás convocado a la Sub-17. En ${p.setup.dept} ya lo anda contando toda la familia.`,
    when: (p) => p.age >= 16 && p.age <= 17 && p.rating >= 46 && !has(p, 'sel_sub17'),
    once: true,
    weight: 2,
    options: (p, ctx) => [
      opt('Me presento listo para todo',
        o(0.7, 'Te quedaste en el grupo. El profe de la Sub-17 te apuntó en su libreta.', { fame: 4, morale: 8, flag: 'sel_sub17', milestone: 'Convocado a la Sub-17' }),
        o(0.3, 'Los nervios te traicionaron en el primer entreno, pero te dejaron en el grupo.', { morale: -3, flag: 'sel_sub17' })),
      opt('Pido no ir, el club me necesita',
        o(0.6, 'El técnico del club te lo agradece con minutos.', { coach: 6, morale: -2 }),
        o(0.4, `En ${fed(ctx)} no se olvidan de los que dicen que no.`, { coach: 3, morale: -6, fame: -2 })),
    ],
  },
  {
    id: 'sel_sub17_micro',
    category: 'seleccion',
    title: 'Microciclo de la Sub-17',
    text: (p, ctx) =>
      `Microciclo de una semana en ${gt(ctx) ? 'el Proyecto Goal' : `el complejo ${de(fed(ctx))}`}. Tres turnos de entreno, charlas tácticas y la mamá preguntando cada noche si ya cenaste.`,
    when: (p) => has(p, 'sel_sub17') && p.age <= 18,
    weight: 3,
    once: true,
    options: () => [
      opt('Le meto a los tres turnos',
        o(0.65, 'Terminaste molido, pero el profe te puso con los titulares.', { rating: 2, fitness: -6, morale: 5 }),
        o(0.35, 'Te sobrecargaste y una contractura te dejó viendo desde afuera.', { fitness: -12, morale: -4 })),
      opt('Me dosifico para no lesionarme',
        o(0.6, 'Llegaste fresco al interescuadras y cumpliste.', { rating: 1, fitness: 4 }),
        o(0.4, 'El cuerpo técnico te vio flojo y te bajó en la lista.', { morale: -6, fame: -2 })),
    ],
  },
  {
    id: 'sel_sub17_premundial',
    category: 'seleccion',
    title: 'Premundial Sub-17',
    text: (p, ctx) =>
      `${JUVENIL[ctx.country.conf]('Sub-17')}. Se juega contra selecciones con academias de primer mundo. Un buen torneo te pone en el radar.`,
    when: (p) => has(p, 'sel_sub17') && p.age <= 18,
    weight: 3,
    once: true,
    options: (p) => [
      opt(gol(p) ? 'Busco el gol en cada pelota' : 'Me tiro a todas, sin miedo',
        o(0.25, '¡Clasificaron al Mundial Sub-17! Fuiste de los mejores del grupo.', { fame: 14, rating: 2, morale: 12, flag: 'sel_sub17_mundial', unflag: 'sel_sub17', milestone: 'Clasificó al Mundial Sub-17' }),
        o(0.45, 'Se quedaron a un partido, pero tu torneo llamó la atención.', { fame: 6, rating: 1, unflag: 'sel_sub17' }),
        o(0.3, 'Eliminados en el grupo y te expulsaron por una entrada tarde.', { morale: -8, fame: -2, unflag: 'sel_sub17' })),
      opt('Juego simple y ordenado',
        o(0.6, 'Torneo correcto. No brillaste, pero tampoco fallaste.', { rating: 1, fame: 3, unflag: 'sel_sub17' }),
        o(0.4, 'Eliminados en primera ronda. Pasaste de largo.', { morale: -4, unflag: 'sel_sub17' })),
    ],
  },
  {
    id: 'sel_sub17_mundial',
    category: 'seleccion',
    title: 'Mundial Sub-17',
    text: (p, ctx) =>
      `${ctx.country.name} en un Mundial Sub-17. Hay visores de Europa en la tribuna y el debut es contra una potencia ${ctx.country.conf === 'CONMEBOL' ? 'europea' : 'sudamericana'}.`,
    when: (p) => has(p, 'sel_sub17_mundial'),
    weight: 4,
    once: true,
    options: () => [
      opt('Me muestro, es mi vitrina',
        o(0.45, 'Hiciste un partidazo. Tu nombre salió en medios de otros países.', { fame: 18, rating: 2, potential: 3, morale: 10, unflag: 'sel_sub17_mundial', milestone: 'Jugó el Mundial Sub-17' }),
        o(0.55, 'Quisiste hacer todo solo y el profe te sentó al medio tiempo.', { fame: 4, morale: -6, unflag: 'sel_sub17_mundial', milestone: 'Jugó el Mundial Sub-17' })),
      opt('Juego para el equipo',
        o(0.7, 'Partidos serios y un empate histórico. Se aprende un montón.', { fame: 8, potential: 2, unflag: 'sel_sub17_mundial', milestone: 'Jugó el Mundial Sub-17' }),
        o(0.3, 'Tres derrotas. Duele, pero volvés con otra cabeza.', { morale: -5, potential: 1, unflag: 'sel_sub17_mundial', milestone: 'Jugó el Mundial Sub-17' })),
    ],
  },

  // ---------- Sub-20 ----------
  {
    id: 'sel_sub20_conv',
    category: 'seleccion',
    title: 'Llamado de la Sub-20',
    text: (p, ctx) =>
      `La Sub-20 arma su lista para el Premundial y tu nombre está. Pero ${ctx.club.name} te tiene en el once y la gira choca con el cierre del torneo.`,
    when: (p) => p.age >= 18 && p.age <= 20 && p.rating >= 52 && !has(p, 'sel_sub20'),
    once: true,
    weight: 2,
    options: () => [
      opt('Voy con la Sub-20',
        o(0.75, 'Te ganaste el puesto en la Sub-20. El club lo aceptó a regañadientes.', { fame: 5, morale: 6, coach: -4, flag: 'sel_sub20', milestone: 'Convocado a la Sub-20' }),
        o(0.25, 'Fuiste, pero el técnico del club te mandó a la banca al volver.', { coach: -10, flag: 'sel_sub20' })),
      opt('Me quedo peleando el cierre',
        o(0.6, 'El club te lo agradece y cerrás el torneo de titular.', { coach: 8, rating: 1 }),
        o(0.4, 'El club perdió igual y vos te quedaste sin Premundial.', { morale: -8 })),
    ],
  },
  {
    id: 'sel_sub20_premundial',
    category: 'seleccion',
    title: 'Premundial Sub-20',
    text: (p, ctx) =>
      `${JUVENIL[ctx.country.conf]('Sub-20')}. Los mejores van al Mundial. Último partido de grupo: un empate alcanza, una derrota los manda a casa.`,
    when: (p) => has(p, 'sel_sub20') && p.age <= 21,
    weight: 3,
    once: true,
    options: () => [
      opt('Pido la pelota en los momentos duros',
        o(0.35, '¡Al Mundial Sub-20! Tu jugada abrió el marcador.', { fame: 14, rating: 2, morale: 12, flag: 'sel_sub20_mundial', unflag: 'sel_sub20', milestone: 'Clasificó al Mundial Sub-20' }),
        o(0.35, 'Empataron, pero otros resultados los dejaron fuera. Buen torneo tuyo.', { fame: 6, rating: 1, unflag: 'sel_sub20' }),
        o(0.3, 'Perdiste una pelota que terminó en gol rival. Te lo van a recordar.', { morale: -10, fame: -3, unflag: 'sel_sub20' })),
      opt('Cumplo con lo táctico',
        o(0.55, 'Partido serio. Quedaron fuera por diferencia de goles.', { rating: 1, fame: 3, unflag: 'sel_sub20' }),
        o(0.45, 'Se cayeron en el segundo tiempo. Otra vez será.', { morale: -5, unflag: 'sel_sub20' })),
    ],
  },
  {
    id: 'sel_sub20_mundial',
    category: 'seleccion',
    title: 'Mundial Sub-20',
    text: (p, ctx) =>
      `Mundial Sub-20. Te toca un rival ${ctx.country.conf === 'UEFA' ? 'sudamericano' : 'europeo'} con medio equipo jugando en primera división. En ${ctx.country.name} ponen los partidos de madrugada.`,
    when: (p) => has(p, 'sel_sub20_mundial'),
    weight: 4,
    once: true,
    options: (p) => [
      opt(gol(p) ? 'Me la juego al ataque' : 'Me la juego en cada duelo',
        o(0.4, `${p.setup.position === 'POR' ? 'Atajada' : gol(p) ? 'Golazo' : 'Cierre'} de antología: sos tendencia en todo el país.`, { fame: 20, rating: 2, potential: 2, morale: 12, unflag: 'sel_sub20_mundial', milestone: 'Jugó el Mundial Sub-20' }),
        o(0.6, 'Diste todo, pero te pasaron por encima. Aprendiste a la mala.', { fame: 5, morale: -5, unflag: 'sel_sub20_mundial', milestone: 'Jugó el Mundial Sub-20' })),
      opt('Juego con orden y paciencia',
        o(0.7, 'Pasaron a octavos por primera vez en años. Sos parte de la historia.', { fame: 12, potential: 2, morale: 8, unflag: 'sel_sub20_mundial', milestone: 'Jugó el Mundial Sub-20' }),
        o(0.3, 'Eliminados en el grupo sin hacer ruido.', { morale: -4, unflag: 'sel_sub20_mundial', milestone: 'Jugó el Mundial Sub-20' })),
    ],
  },
  {
    id: 'sel_preolimpico',
    category: 'seleccion',
    title: 'Preolímpico Sub-23',
    text: (p, ctx) =>
      `La Sub-23 juega ${PREOLIMPICO[ctx.country.conf]}. ${gt(ctx) ? 'Hace décadas que Guatemala no va a unos Juegos Olímpicos' : `En ${ctx.country.name} sueñan con una medalla olímpica`} y te quieren de líder del grupo.`,
    when: (p) => p.age >= 21 && p.age <= 23 && p.rating >= 56 && !has(p, 'sel_sub23'),
    once: true,
    options: () => [
      opt('Acepto ser uno de los líderes',
        o(0.3, '¡Clasificaron a los Juegos Olímpicos! El país entero se volcó a la calle.', { fame: 20, rating: 2, morale: 14, flag: 'sel_sub23', milestone: 'Clasificó a los Juegos Olímpicos' }),
        o(0.7, 'Se quedaron en semifinales, pero te ganaste el respeto del grupo.', { fame: 6, rating: 1, flag: 'sel_sub23', milestone: 'Jugó el Preolímpico Sub-23' })),
      opt('Me enfoco en mi club',
        o(0.6, 'Tu club te lo agradece y tenés un torneo regular.', { coach: 8, morale: -2 }),
        o(0.4, 'La prensa dice que le hiciste el feo a la Selección.', { fame: -4, coach: 5 })),
    ],
  },

  // ---------- Selección mayor: camino al debut ----------
  {
    id: 'sel_prelista',
    category: 'seleccion',
    title: 'En la prelista de la mayor',
    text: (p, ctx) =>
      `Tu nombre aparece en la prelista de la Selección mayor para un microciclo. ${ctx.last ? `Con ${ctx.last.apps} partidos la última temporada,` : 'Sin mucho recorrido,'} sos de los más nuevos.`,
    when: (p, ctx) => p.ntLevel === 0 && p.rating >= 65 + bar(ctx) && p.age >= 18 && (ctx.tier === 1 || ctx.abroad) && !has(p, 'sel_prelista') && !has(p, 'sel_retirado'),
    once: true,
    weight: 2,
    options: () => [
      opt('Llego antes que todos al microciclo',
        o(0.7, 'El técnico de la Selección te vio con hambre. Quedaste en la lista.', { fame: 5, morale: 8, flag: 'sel_prelista' }),
        o(0.3, 'Te notaron nervioso con los veteranos, pero te dejan en la prelista.', { morale: -3, flag: 'sel_prelista' })),
      opt('Voy tranquilo, sin presionarme',
        o(0.5, 'Cumpliste sin brillar. Seguís en el radar.', { fame: 2, flag: 'sel_prelista' }),
        o(0.5, 'Pasaste desapercibido y te sacaron del grupo.', { morale: -6 })),
    ],
  },
  {
    id: 'sel_club_no_presta',
    category: 'seleccion',
    title: 'El club no te quiere prestar',
    text: (p, ctx) =>
      `La Selección te convoca para una fecha FIFA, pero ${ctx.club.name} juega el clásico esa semana y no te quiere soltar. El presidente del club te llama.`,
    when: (p) => has(p, 'sel_prelista') && p.ntLevel === 0,
    weight: 3,
    cooldown: 3,
    options: (p, ctx) => [
      opt('Me presento a la Selección',
        o(0.65, 'La Selección te lo valora. En el club hay caras largas.', { coach: -10, fame: 3, morale: 4 }),
        o(0.35, 'Fuiste y ni siquiera entraste en la lista final. Y el club, enojado.', { coach: -12, morale: -8 })),
      opt('Le hago caso al club',
        o(0.5, 'El club te lo agradece. La Selección dice que habrá otras fechas.', { coach: 8, morale: -4 }),
        o(0.5, `En ${fed(ctx)} lo tomaron mal y te sacaron de la prelista.`, { coach: 8, morale: -10, unflag: 'sel_prelista' })),
    ],
  },
  {
    id: 'sel_debut',
    category: 'seleccion',
    title: (p, ctx) => `Debut con ${ctx.country.ntName}`,
    text: (p, ctx) =>
      `Amistoso internacional y el técnico te dice que hoy debutás. Suena el himno, te tiembla la pierna y ves el ${p.setup.number} ${gt(ctx) ? 'azul y blanco' : de(ctx.country.ntName)} en tu espalda.`,
    when: (p) => has(p, 'sel_prelista') && p.ntLevel === 0 && !has(p, 'sel_retirado'),
    weight: 4,
    once: true,
    options: (p) => [
      opt(gol(p) ? 'Pido la pelota desde el primer minuto' : 'Juego con personalidad',
        o(0.45, gol(p) ? '¡Gol en tu debut! No te lo creés ni vos.' : 'Partidazo en tu debut. Te dieron el premio al mejor del partido.', { ntLevel: 1, caps: 1, natGoals: gol(p) ? 1 : 0, fame: 16, morale: 14, unflag: 'sel_prelista', milestone: 'Debut con la Selección mayor' }),
        o(0.55, 'Te comiste los nervios y una amarilla temprana, pero ya debutaste.', { ntLevel: 1, caps: 1, fame: 6, morale: 2, unflag: 'sel_prelista', milestone: 'Debut con la Selección mayor' })),
      opt('Juego sencillo, sin errores',
        o(0.8, 'Debut correcto. El técnico te felicitó en el vestuario.', { ntLevel: 1, caps: 1, fame: 8, morale: 8, unflag: 'sel_prelista', milestone: 'Debut con la Selección mayor' }),
        o(0.2, 'Entraste en el 85 y casi ni tocaste la pelota. Pero cuenta.', { ntLevel: 1, caps: 1, fame: 3, morale: 4, unflag: 'sel_prelista', milestone: 'Debut con la Selección mayor' })),
    ],
  },

  // ---------- Selección mayor: conflictos y crecimiento ----------
  {
    id: 'sel_lesion_previa',
    category: 'seleccion',
    title: 'Molestia antes de la fecha FIFA',
    text: () =>
      'Te llega la convocatoria, pero arrastrás una molestia en el muslo. El médico de la Selección dice que puede aguantar; el del club dice que no.',
    when: (p) => mayor(p) && p.fitness < 80,
    cooldown: 6,
    options: () => [
      opt('Viajo igual, no me la pierdo',
        o(0.5, 'Aguantaste y jugaste los dos partidos. Te aplaudieron el sacrificio.', { caps: 2, fame: 6, fitness: -10, coach: -5 }),
        o(0.5, 'Se rompió del todo en el calentamiento. Fuera varias semanas.', { injury: 1, fitness: -20, morale: -10, coach: -8 })),
      opt('Me quedo a recuperarme',
        o(0.7, 'Volviste al cien con tu club. Prudencia que se agradece.', { fitness: 12, coach: 5, fame: -2 }),
        o(0.3, 'Tu reemplazo la rompió y ahora te toca pelear el puesto.', { fitness: 12, morale: -8 })),
    ],
  },
  {
    id: 'sel_viajes',
    category: 'seleccion',
    title: 'Viaje de regreso eterno',
    text: (p, ctx) =>
      ctx.abroad
        ? `Doble fecha FIFA y cruzás medio mundo para jugar. Volvés a ${ctx.club.name} con jet lag y el técnico te quiere en el once el sábado.`
        : `Doble fecha FIFA con dos vuelos y escalas. Volvés el jueves y ${ctx.club.name} juega el sábado. El técnico te pregunta cómo estás.`,
    when: (p) => mayor(p),
    cooldown: 6,
    options: () => [
      opt('Le digo que estoy listo',
        o(0.55, 'Jugaste con lo que quedaba de tanque y cumpliste.', { coach: 6, fitness: -10 }),
        o(0.45, 'Te arrastraste en la cancha. Te sacaron al medio tiempo.', { coach: -6, fitness: -12, morale: -5 })),
      opt('Pido descansar ese partido',
        o(0.6, 'Descansaste y volviste fuerte la siguiente fecha.', { fitness: 10, coach: -3 }),
        o(0.4, 'El técnico no lo entendió: "La Selección sí, nosotros no".', { fitness: 10, coach: -10 })),
    ],
  },
  {
    id: 'sel_tecnico_nuevo',
    category: 'seleccion',
    title: 'Cambio de técnico en la Sele',
    text: (p, ctx) =>
      `${cap(fed(ctx))} despidió al técnico de la Selección. El nuevo llega con su gente y dice en conferencia que "nadie tiene el puesto asegurado".`,
    when: (p) => mayor(p) && p.age >= 20,
    cooldown: 10,
    options: () => [
      opt('Le pido una reunión para presentarme',
        o(0.6, 'Le gustó tu actitud. Seguís en sus planes.', { caps: 2, morale: 6, fame: 3 }),
        o(0.4, 'Te escuchó amable, pero en la siguiente lista no apareciste.', { morale: -8, fame: -3 })),
      opt('Dejo que hable la cancha',
        o(0.5, 'Tu temporada con el club te sostuvo en la lista.', { caps: 1, morale: 3 }),
        o(0.5, 'El nuevo técnico prefirió a los suyos. Te toca esperar.', { morale: -6 })),
    ],
  },
  {
    id: 'sel_prensa',
    category: 'seleccion',
    title: 'Críticas de la prensa',
    text: () =>
      'Tras una derrota, un programa deportivo de radio dice que no tenés nivel de Selección. El clip circula en redes y tu tía te lo manda al chat familiar.',
    when: (p) => mayor(p) && p.caps >= 2,
    cooldown: 6,
    options: () => [
      opt('Respondo en mis redes',
        o(0.35, 'Tu respuesta fue elegante y la gente se puso de tu lado.', { fame: 6, morale: 6 }),
        o(0.65, 'Se armó la polémica. Ahora sos el tema de toda la semana.', { fame: 3, morale: -10, coach: -4 })),
      opt('Me callo y entreno',
        o(0.6, 'La crítica pasó sola. Siguiente partido, buena actuación.', { morale: 3, rating: 1 }),
        o(0.4, 'Te lo quedaste adentro y te costó dormir.', { morale: -6 })),
    ],
  },
  {
    id: 'sel_consolidar',
    category: 'seleccion',
    title: 'Pelear un puesto fijo',
    text: (p) =>
      `Ya tenés ${p.caps} partidos con la Selección, pero sos de los que entra y sale de la lista. El técnico te dice que quiere verte más regular.`,
    when: (p, ctx) => p.ntLevel === 1 && p.rating >= 64 + bar(ctx) && p.caps >= 2 && !has(p, 'sel_retirado'),
    weight: 2,
    cooldown: 4,
    options: () => [
      opt('Me quedo a doble turno en el club',
        o(0.6, 'Llegaste a la siguiente fecha en tu mejor forma. Ya sos fijo en la lista.', { ntLevel: 2, caps: 3, fame: 8, fitness: -8, morale: 8 }),
        o(0.4, 'El cuerpo dijo basta. Una sobrecarga te sacó de la convocatoria.', { fitness: -15, morale: -6 })),
      opt('Sigo con lo mío, a mi ritmo',
        o(0.4, 'Tus números en el club hablaron por vos. Fijo en la lista.', { ntLevel: 2, caps: 2, fame: 5 }),
        o(0.6, 'Seguís en la puerta giratoria: una lista sí, otra no.', { caps: 1, morale: -4 })),
    ],
  },
  {
    id: 'sel_capitan',
    category: 'seleccion',
    title: 'La cinta de capitán',
    text: (p) =>
      `El capitán de la Selección se retiró. Con ${p.caps} partidos y tu nivel, el técnico te ofrece la cinta. Ser capitán es dar la cara cuando se pierde.`,
    when: (p, ctx) => p.ntLevel === 2 && p.rating >= 70 + bar(ctx) && p.age >= 24 && !has(p, 'sel_retirado'),
    weight: 2,
    once: true,
    options: () => [
      opt('Acepto la cinta',
        o(0.7, 'Sos el capitán y titular indiscutible. Responsabilidad que pesa y que honra.', { ntLevel: 3, caps: 3, fame: 18, morale: 12, milestone: 'Capitán de la Selección mayor' }),
        o(0.3, 'Aceptaste y te tocó una racha de derrotas. Los dardos van para vos.', { ntLevel: 3, caps: 3, fame: 8, morale: -8, milestone: 'Capitán de la Selección mayor' })),
      opt('Que la lleve alguien con más años',
        o(0.6, 'El grupo valoró tu humildad. Igual sos titular fijo.', { ntLevel: 3, caps: 2, fame: 6, morale: 4 }),
        o(0.4, 'El técnico lo leyó como falta de carácter.', { morale: -6, fame: -2 })),
    ],
  },

  // ---------- Torneos ----------
  {
    id: 'sel_liga_naciones',
    category: 'seleccion',
    title: 'Liga de Naciones',
    text: (p, ctx) =>
      ctx.country.conf === 'UEFA'
        ? 'Liga de Naciones de la UEFA: si ganan el grupo, suben de liga y aseguran rivales más fuertes. Último partido, de visita en una noche helada.'
        : 'Liga de Naciones de Concacaf: si ganan el grupo, suben de liga y aseguran rivales más fuertes. Último partido, de visita en el Caribe con 35 grados.',
    when: (p, ctx) => mayor(p) && !ctx.qualifiers && (ctx.country.conf === 'CONCACAF' || ctx.country.conf === 'UEFA'),
    cooldown: 6,
    options: (p) => [
      opt('Salgo a ganar desde el inicio',
        o(0.5, gol(p) ? '¡Marcaste y ganaron el grupo! Ascenso de liga.' : 'Ganaron el grupo con un partidazo tuyo. Ascenso de liga.', { caps: 2, natGoals: gol(p) ? 1 : 0, fame: 10, morale: 8, unflag: limpiaElim }),
        o(0.5, 'El calor los mató en el segundo tiempo. Empate y a esperar otro ciclo.', { caps: 2, fitness: -10, morale: -5, unflag: limpiaElim })),
      opt('Administro el esfuerzo',
        o(0.6, 'Partido inteligente, triunfo mínimo y a casa.', { caps: 2, fame: 5, fitness: -4, unflag: limpiaElim }),
        o(0.4, 'Se metieron atrás y les empataron al final.', { caps: 2, morale: -6, unflag: limpiaElim })),
    ],
  },
  {
    id: 'sel_copa_oro_mexico',
    category: 'seleccion',
    title: (p, ctx) => `Penal contra ${gigante(ctx)}`,
    text: (p, ctx) =>
      p.setup.position === 'POR'
        ? `${CONFED_CUP[ctx.country.conf]}, cuartos contra ${gigante(ctx)}. Tanda de penales y el último lo patean ellos. Si lo atajás, ${ctx.country.name} hace historia.`
        : `${CONFED_CUP[ctx.country.conf]}, cuartos contra ${gigante(ctx)}. Tanda de penales y te toca el quinto. Si lo metés, ${ctx.country.name} hace historia.`,
    when: (p) => mayor(p) && p.caps >= 3,
    once: true,
    options: (p, ctx) => [
      opt(p.setup.position === 'POR' ? 'Me tiro a mi palo fuerte' : 'Lo pateo fuerte, arriba',
        o(0.4, `¡Histórico! Eliminaron a ${gigante(ctx)} y ${gt(ctx) ? 'el Obelisco se llenó' : 'las calles se llenaron'} de gente.`, { caps: 2, fame: 25, morale: 16, milestone: `Héroe ante ${gigante(ctx)} en ${CONFED_CUP[ctx.country.conf]}` }),
        o(0.6, 'No pudo ser. Llorás en el césped y el país te abraza igual.', { caps: 2, fame: 4, morale: -12 })),
      opt(p.setup.position === 'POR' ? 'Espero hasta el último momento' : 'Lo coloco al palo, seguro',
        o(0.55, `¡Adentro, al otro lado! ${ctx.country.name} a semifinales. Locura.`, { caps: 2, fame: 22, morale: 14, milestone: `Héroe ante ${gigante(ctx)} en ${CONFED_CUP[ctx.country.conf]}` }),
        o(0.45, p.setup.position === 'POR' ? 'Te la picaron al centro. Ni modo.' : 'Lo adivinó el portero. Ni modo.', { caps: 2, fame: 2, morale: -12 })),
    ],
  },
  {
    id: 'sel_copa_oro_usa',
    category: 'seleccion',
    title: 'Copa Oro ante Estados Unidos',
    text: (p, ctx) =>
      `Copa Oro, fase de grupos contra Estados Unidos en su casa. Ellos tienen jugadores en las mejores ligas; ustedes, garra y un estadio medio lleno de ${ctx.country.people}.`,
    when: (p, ctx) => mayor(p) && ctx.country.conf === 'CONCACAF' && ctx.country.code !== 'US',
    cooldown: 8,
    options: (p) => [
      opt('Presiono arriba, sin complejos',
        o(0.3, gol(p) ? '¡Le ganaron a Estados Unidos y el gol fue tuyo!' : '¡Le ganaron a Estados Unidos! Partido de tu vida.', { caps: 2, natGoals: gol(p) ? 1 : 0, fame: 18, morale: 12 }),
        o(0.7, 'La presión los dejó sin piernas. Goleada en contra.', { caps: 2, fitness: -8, morale: -8 })),
      opt('Nos cerramos y salimos al contragolpe',
        o(0.5, 'Empate sufrido que sabe a victoria.', { caps: 2, fame: 8, morale: 6 }),
        o(0.5, 'Aguantaron 80 minutos y en una pelota parada se acabó.', { caps: 2, morale: -6 })),
    ],
  },
  {
    id: 'sel_amistoso_eeuu',
    category: 'seleccion',
    title: 'Amistoso con la afición migrante',
    text: (p, ctx) =>
      `Amistoso en un estadio de Los Ángeles lleno de ${ctx.country.people} que no ven a su Selección en persona desde hace años. Después del partido te esperan afuera.`,
    when: (p, ctx) => mayor(p) && !ctx.qualifiers && migrante(ctx),
    cooldown: 6,
    options: (p, ctx) => [
      opt('Me quedo una hora firmando y platicando',
        o(0.8, `Fotos, abrazos y una señora que te regaló ${ctx.country.dish}. Eso no tiene precio.`, { caps: 1, fame: 10, morale: 12, fitness: -4, unflag: limpiaElim }),
        o(0.2, 'Perdiste el bus del equipo y el técnico te puso una multa.', { caps: 1, fame: 8, morale: 4, coach: -5, unflag: limpiaElim })),
      opt('Saludo rápido y me voy a descansar',
        o(0.6, 'Llegaste fresco al siguiente compromiso.', { caps: 1, fame: 3, fitness: 4, unflag: limpiaElim }),
        o(0.4, 'En redes dicen que te creíste mucho. Golpe a tu imagen.', { caps: 1, fame: -3, morale: -4, unflag: limpiaElim })),
    ],
  },

  // ---------- Eliminatoria mundialista ----------
  {
    id: 'sel_elim_grupos',
    category: 'seleccion',
    title: 'Eliminatoria: fase de grupos',
    text: (p, ctx) =>
      `Arranca la eliminatoria rumbo al Mundial ${ctx.worldCupYear}. Grupo accesible en el papel, pero ${ELIMINATORIA[ctx.country.conf]}`,
    when: (p, ctx) => enEliminatoria(p, ctx) && p.wcProgress === 0 && !has(p, 'sel_elim_r2'),
    weight: 3,
    cooldown: 2,
    options: (p, ctx) => [
      opt('Juego con todo, cada punto cuenta',
        o(0.65, `Ganaron el grupo. El sueño del ${ctx.worldCupYear} sigue vivo.`, { caps: 4, natGoals: gol(p) ? 1 : 0, fame: 10, morale: 8, wcProgress: 1 }),
        o(0.35, 'Una derrota en la cancha sintética los dejó fuera. Golpe durísimo.', { caps: 3, fame: -4, morale: -14, flag: 'sel_elim_fuera' })),
      opt('Me cuido para la fase final',
        o(0.5, 'El equipo cumplió sin vos al cien. Pasaron igual.', { caps: 2, fame: 2, fitness: 6, wcProgress: 1 }),
        o(0.5, 'Eliminados y la prensa dice que te guardaste.', { caps: 2, fame: -6, morale: -12, flag: 'sel_elim_fuera' })),
    ],
  },
  {
    id: 'sel_elim_mateo_flores',
    category: 'seleccion',
    title: (p, ctx) => `${cap(ctx.country.stadium)} lleno`,
    text: (p, ctx) =>
      `Fase final rumbo al ${ctx.worldCupYear}. ${gt(ctx) ? 'El Doroteo Guamuch Flores, el Mateo Flores,' : cap(ctx.country.stadium)} está lleno desde el mediodía. La gente canta el himno a todo pulmón.`,
    when: (p, ctx) => enEliminatoria(p, ctx) && p.wcProgress >= 1 && p.wcProgress < 3,
    weight: 3,
    cooldown: 3,
    options: (p) => [
      opt('Me alimento de la gente y voy al frente',
        o(0.55, gol(p) ? '¡Gol tuyo y el estadio se viene abajo! Tres puntos de oro.' : 'Partidazo tuyo y tres puntos de oro. El estadio tiembla.', { caps: 2, natGoals: gol(p) ? 1 : 0, fame: 16, morale: 12, wcProgress: 1 }),
        o(0.45, 'La ansiedad pudo más. Empate amargo y silbidos al final.', { caps: 2, fame: -2, morale: -8 })),
      opt('Mantengo la calma y el orden',
        o(0.6, 'Triunfo trabajado, 1-0. Así se gana en eliminatoria.', { caps: 2, fame: 8, morale: 6, wcProgress: 1 }),
        o(0.4, 'Empate sin goles. Se escapan dos puntos que van a doler.', { caps: 2, morale: -6 })),
    ],
  },
  {
    id: 'sel_elim_visita',
    category: 'seleccion',
    title: 'Visita a un estadio hostil',
    text: (p, ctx) =>
      `${ctx.country.conf === 'CONCACAF' ? 'Visita en Centroamérica' : 'Visita a un estadio hostil'}: petardos en el hotel a medianoche, el bus llega tarde y la cancha está dura. El estadio silba cada vez que tocás la pelota.`,
    when: (p, ctx) => enEliminatoria(p, ctx) && p.wcProgress >= 1 && p.wcProgress < 3,
    weight: 3,
    cooldown: 3,
    options: () => [
      opt('Pido calma al grupo y juego frío',
        o(0.45, 'Punto de oro de visita, o hasta los tres. Silencio en las gradas.', { caps: 2, fame: 10, morale: 8, wcProgress: 1 }),
        o(0.55, 'Los aguantaron hasta el 90 y cayó el gol rival. Toca reponerse.', { caps: 2, morale: -8 })),
      opt('Respondo las provocaciones',
        o(0.25, 'Les ganaste la guerra mental y la pelea en la cancha.', { caps: 2, fame: 12, wcProgress: 1 }),
        o(0.75, 'Roja directa por un empujón. Fuera del siguiente partido.', { caps: 1, fame: -6, morale: -10, coach: -6 })),
    ],
  },
  {
    id: 'sel_elim_decisivo',
    category: 'seleccion',
    title: 'El partido decisivo',
    text: (p, ctx) =>
      `Última fecha. Si ganan, ${ctx.country.name} está en el Mundial ${ctx.worldCupYear}${ctx.country.wcDebut ? ' por primera vez' : ''}. Si empatan, repechaje. El país se paraliza para verlos.`,
    when: (p, ctx) => enEliminatoria(p, ctx) && p.wcProgress >= 1 && !has(p, 'sel_elim_decidido'),
    weight: 4,
    cooldown: 2,
    options: (p, ctx) => [
      opt('Pido la pelota en cada jugada',
        o(0.35, `¡${ctx.country.name.toUpperCase()} AL MUNDIAL ${ctx.worldCupYear}! Nadie en el país durmió esa noche.`, { caps: 1, natGoals: gol(p) ? 1 : 0, fame: 25, morale: 16, wcProgress: 1, flag: 'sel_elim_decidido', milestone: `Clasificó al Mundial ${ctx.worldCupYear}` }),
        o(0.35, 'Empate con sabor amargo. Queda el repechaje.', { caps: 1, fame: 6, flag: ['sel_elim_decidido', 'sel_repechaje'] }),
        o(0.3, 'Perdieron. Otra vez el "casi". Duele en el alma.', { caps: 1, morale: -16, flag: ['sel_elim_decidido', 'sel_elim_fuera'] })),
      opt('Hago lo mío, sin cargar el mundo',
        o(0.6, 'Empate y repechaje. Hiciste tu trabajo.', { caps: 1, fame: 5, flag: ['sel_elim_decidido', 'sel_repechaje'] }),
        o(0.4, 'Se escapó en el último minuto. Lloran jugadores y afición.', { caps: 1, morale: -14, flag: ['sel_elim_decidido', 'sel_elim_fuera'] })),
    ],
  },
  {
    id: 'sel_repechaje',
    category: 'seleccion',
    title: 'Repechaje mundialista',
    text: (p, ctx) =>
      `Repechaje intercontinental en cancha neutral. Un solo partido separa a ${ctx.country.name} del Mundial ${ctx.worldCupYear}. El rival es de otro continente y de otro ritmo.`,
    when: (p, ctx) => ctx.qualifiers && mayor(p) && has(p, 'sel_repechaje'),
    weight: 4,
    options: (p, ctx) => [
      opt('Dejo el alma en la cancha',
        o(0.35, `¡Clasificados por el repechaje! ${ctx.country.name} va al Mundial ${ctx.worldCupYear}.`, { caps: 1, natGoals: gol(p) ? 1 : 0, fame: 25, morale: 16, wcProgress: 1, unflag: 'sel_repechaje', milestone: `Clasificó al Mundial ${ctx.worldCupYear}` }),
        o(0.65, 'Se quedaron a nada. El "casi" más doloroso de tu carrera.', { caps: 1, fitness: -8, morale: -16, unflag: 'sel_repechaje', flag: 'sel_elim_fuera' })),
      opt('Juego con cabeza fría',
        o(0.3, `Ganaron en penales. ¡Al Mundial ${ctx.worldCupYear}!`, { caps: 1, fame: 22, morale: 14, wcProgress: 1, unflag: 'sel_repechaje', milestone: `Clasificó al Mundial ${ctx.worldCupYear}` }),
        o(0.7, 'Eliminados por un gol. Te consuela haber llegado tan lejos.', { caps: 1, morale: -12, unflag: 'sel_repechaje', flag: 'sel_elim_fuera' })),
    ],
  },

  // ---------- Retiro de la Selección ----------
  {
    id: 'sel_despedida',
    category: 'seleccion',
    title: 'Partido de despedida',
    text: (p, ctx) =>
      `Con ${p.age} años y ${p.caps} partidos con la Selección, ${fed(ctx)} te ofrece un amistoso de despedida en ${ctx.country.stadium}. Tu familia ya compró las entradas.`,
    when: (p) => p.age >= 32 && p.ntLevel >= 1 && p.caps >= 10 && !has(p, 'sel_retirado'),
    once: true,
    options: (p) => [
      opt('Acepto la despedida',
        o(0.6, gol(p) ? 'Gol de despedida y vuelta olímpica. Lloró hasta el utilero.' : 'Te sacaron al minuto 70 entre aplausos. Lloró hasta el utilero.', { caps: 1, natGoals: gol(p) ? 1 : 0, fame: 20, morale: 14, flag: 'sel_retirado', milestone: 'Despedida de la Selección' }),
        o(0.4, 'Llovió y llegó media afición, pero los que llegaron no se olvidan.', { caps: 1, fame: 10, morale: 6, flag: 'sel_retirado', milestone: 'Despedida de la Selección' })),
      opt('Todavía no, quiero seguir',
        o(0.5, 'El técnico te sigue llamando. Te queda cuerda.', { caps: 1, morale: 5 }),
        o(0.5, 'Te dejaron de convocar sin despedida. Queda un sabor raro.', { morale: -10, fame: -3, flag: 'sel_retirado' })),
    ],
  },
  {
    id: 'sel_renuncia',
    category: 'seleccion',
    title: 'Dejar la Selección por el club',
    text: (p, ctx) =>
      `A los ${p.age}, cada fecha FIFA te cuesta una semana de recuperación. En ${ctx.club.name} te ofrecen renovar si te dedicás solo al club.`,
    when: (p) => p.age >= 32 && p.ntLevel >= 2 && !has(p, 'sel_retirado'),
    once: true,
    options: () => [
      opt('Renuncio a la Selección',
        o(0.7, 'Anunciaste tu retiro internacional. Tu cuerpo y tu club te lo agradecen.', { fitness: 15, coach: 10, fame: -4, flag: 'sel_retirado', milestone: 'Retiro de la Selección' }),
        o(0.3, 'La afición no lo entendió y te llovieron críticas.', { fitness: 15, coach: 8, fame: -8, morale: -6, flag: 'sel_retirado', milestone: 'Retiro de la Selección' })),
      opt('Sigo con las dos camisetas',
        o(0.5, 'Aguantaste el ritmo una temporada más. Orgullo puro.', { caps: 3, fame: 6, fitness: -12 }),
        o(0.5, 'El cuerpo pasó factura: lesión muscular en plena temporada.', { caps: 2, injury: 1, fitness: -18, coach: -6 })),
    ],
  },
];
