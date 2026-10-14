import type { EventContext, EventTemplate, Player } from '../types';
import { o, opt, has } from '../helpers';

// Banderas que usa este archivo:
// - div_chamba: trabajás en otra chamba además del fútbol → div_chamba_domingo (el jefe te pide el domingo)
// - div_liguilla: tu equipo se metió a la liguilla de ascenso → div_final_ascenso
// - div_visto: un visor te anotó en su libreta → div_prueba (te llaman a prueba en la división de arriba)
// - div_estudia: estudiás en la U además de jugar → div_examenes (choque de exámenes y partido)

const isLower = (ctx: EventContext) => !ctx.abroad && (ctx.tier === 2 || ctx.tier === 3);
const divName = (ctx: EventContext) => (ctx.tier === 3 ? 'Segunda División' : 'Primera División');
const upName = (ctx: EventContext) => (ctx.tier === 3 ? 'Primera División' : 'Liga Nacional');
const goodSeason = (p: Player, ctx: EventContext) =>
  !!ctx.last && (ctx.last.titles.length > 0 || ctx.last.goals >= 10 || (ctx.last.apps >= 25 && ctx.last.rating >= p.rating));

export const DIVISIONES_EVENTS: EventTemplate[] = [
  {
    id: 'div_cancha_tierra',
    category: 'divisiones',
    title: 'Cancha de tierra',
    text: (p, ctx) =>
      ctx.tier === 3
        ? 'Visitan una cancha de tierra con piedras y un palo de la portería torcido. El balón pica para donde quiere.'
        : 'Les toca una grama sintética tan gastada que se ven las costuras. Quema las rodillas en cada barrida.',
    when: (p, ctx) => isLower(ctx),
    weight: 1.5,
    cooldown: 5,
    options: () => [
      opt('Juego por abajo, a ras',
        o(0.6, 'Te adaptaste y dominaste el partido. Ganaron de visita.', { morale: 5, rating: 1 }),
        o(0.4, 'El balón dio un bote raro y te dejó en ridículo. Perdieron.', { morale: -5 })),
      opt('Pelotazo y a correr',
        o(0.5, 'Fútbol directo, nada bonito, pero sacaron el punto.', { morale: 2, fitness: -5 }),
        o(0.5, 'Te raspaste toda la pierna en una caída. Una semana sin entrenar bien.', { fitness: -10, morale: -3 })),
    ],
  },
  {
    id: 'div_microbus',
    category: 'divisiones',
    title: 'Ocho horas en microbús',
    text: (p, ctx) =>
      `${ctx.club.name} viaja de visita en un microbús sin aire acondicionado: ocho horas, salida a las 3 de la mañana y refacción de pan con frijol.`,
    when: (p, ctx) => isLower(ctx),
    weight: 1.5,
    cooldown: 5,
    options: () => [
      opt('Duermo en el viaje como pueda',
        o(0.6, 'Dormiste doblado pero dormiste. Llegaste entero al partido.', { fitness: -4, morale: 2 }),
        o(0.4, 'Te despertaste con tortícolis. Jugaste con el cuello torcido.', { fitness: -10, morale: -3 })),
      opt('Armo la plática y las bromas',
        o(0.75, 'El viaje se hizo corto. El grupo quedó más unido que nunca.', { morale: 8, coach: 3, fitness: -6 }),
        o(0.25, 'El técnico quería dormir y te mandó callar dos veces.', { coach: -5, fitness: -6 })),
    ],
  },
  {
    id: 'div_chamba',
    category: 'divisiones',
    title: 'Otra chamba',
    text: (p, ctx) =>
      `Con lo que paga ${ctx.club.name} no alcanza para el mes. Un conocido te ofrece trabajo entre semana. ¿Qué agarrás?`,
    when: (p, ctx) => isLower(ctx) && p.age >= 18 && !has(p, 'div_chamba'),
    weight: 1.5,
    cooldown: 8,
    options: () => [
      opt('Manejo taxi por las noches',
        o(0.6, 'Sacás buen pisto, aunque dormís poco. La casa está al día.', { morale: 6, fitness: -8, flag: 'div_chamba' }),
        o(0.4, 'Las desveladas te pasan factura en los entrenos de la mañana.', { fitness: -14, coach: -4, flag: 'div_chamba' })),
      opt('Ayudo en construcción',
        o(0.6, 'Cargar block te puso fuerte como toro. Y algo de pisto extra.', { morale: 4, fitness: 4, flag: 'div_chamba' }),
        o(0.4, 'Te jalaste la espalda cargando costales. Fuera dos semanas.', { fitness: -15, morale: -4, flag: 'div_chamba' })),
      opt('Solo fútbol, me aprieto',
        o(1, 'Entrenás descansado, pero el mes se hace eterno sin pisto.', { morale: -6, fitness: 4 })),
    ],
  },
  {
    id: 'div_chamba_domingo',
    category: 'divisiones',
    title: 'El jefe pide el domingo',
    text: () =>
      'Tu jefe de la otra chamba necesita que trabajés este domingo: es el día de más movimiento. Justo hay partido a las 11.',
    when: (p, ctx) => has(p, 'div_chamba') && isLower(ctx),
    weight: 3,
    options: (p, ctx) => [
      opt('Elijo el partido',
        o(0.6, 'Jugaste y ganaron. El jefe te buscó a otro y perdiste la chamba.', { morale: 4, coach: 4, unflag: 'div_chamba' }),
        o(0.4, 'El jefe lo entendió: "Pero solo esta vez, ¿eh?"', { morale: 6, coach: 4 })),
      opt('Trabajo, el pisto manda',
        o(0.5, `Te perdiste el partido. En ${ctx.club.name} te bajaron a la banca.`, { coach: -10, morale: -3 }),
        o(0.5, 'El técnico se enojó tanto que te sacó de la lista dos fechas.', { coach: -14, morale: -6 })),
      opt('Dejo la otra chamba y ya',
        o(1, 'Volviste a ser solo futbolista. Más tiempo, menos pisto.', { fitness: 8, morale: -2, coach: 3, unflag: 'div_chamba' })),
    ],
  },
  {
    id: 'div_sueldo',
    category: 'divisiones',
    title: 'Tres meses sin pago',
    text: (p, ctx) =>
      `El sueldo en ${ctx.club.name} es de Q1,500 al mes… cuando pagan. Ya van tres meses atrasados y el dueño dice "la otra semana".`,
    when: (p, ctx) => isLower(ctx),
    cooldown: 6,
    options: () => [
      opt('Me uno a la huelga del grupo',
        o(0.45, 'No entrenaron dos días y apareció el pisto de dos meses. Algo es algo.', { morale: 6, coach: -3 }),
        o(0.55, 'El dueño amenazó con dar de baja a los "revoltosos". Silencio total.', { morale: -6, coach: -8 })),
      opt('Aguanto, ya pagarán',
        o(0.5, 'Al fin pagaron. Tarde, pero pagaron.', { morale: 2, coach: 3 }),
        o(0.5, 'Nunca pagaron todo. Tu familia te ayudó con el alquiler.', { morale: -10 })),
      opt('Busco otro equipo',
        o(0.6, 'Un equipo del mismo nivel te ofreció pagar puntual. Te fuiste.', { transfer: 'any', morale: 4 }),
        o(0.4, 'Nadie te dio carta de libertad a tiempo. Te quedaste peleado.', { coach: -8, morale: -6 })),
    ],
  },
  {
    id: 'div_arbitro',
    category: 'divisiones',
    title: 'El árbitro de casa',
    text: (p, ctx) =>
      `Visitan un pueblo donde el árbitro desayunó con la directiva local. Van ganando y ya les anuló dos goles y van ${ctx.tier === 3 ? 'tres' : 'dos'} amarillas.`,
    when: (p, ctx) => isLower(ctx),
    cooldown: 5,
    options: () => [
      opt('Le reclamo en su cara',
        o(0.3, 'Se intimidó un poco y pitó parejo el resto. Ganaron.', { morale: 6, fame: 2 }),
        o(0.7, 'Roja directa y una fecha de castigo. El técnico, furioso.', { coach: -10, morale: -6 })),
      opt('Cabeza fría, a buscar el gol',
        o(0.55, 'Metieron el tercero tan claro que ni él lo pudo anular.', { morale: 8, rating: 1 }),
        o(0.45, 'Les pitaron un penal de la nada en el 94. Empate amargo.', { morale: -5 })),
    ],
  },
  {
    id: 'div_aficion_pueblo',
    category: 'divisiones',
    title: 'La afición del pueblo',
    text: (p, ctx) =>
      `En ${ctx.club.city} todos te conocen: la señora de los tamales te regala uno los domingos y el tuc-tuc no te cobra. Ahora te piden ir a la fiesta de un cumpleaños.`,
    when: (p, ctx) => isLower(ctx),
    cooldown: 7,
    options: () => [
      opt('Voy y me tomo fotos con todos',
        o(0.8, 'Te volviste el ídolo del pueblo. Cada domingo la grada grita tu nombre.', { morale: 8, fame: 3 }),
        o(0.2, 'Te quedaste hasta tarde y el lunes llegaste desvelado.', { morale: 5, fitness: -6, coach: -3 })),
      opt('Mando un saludo y me guardo',
        o(1, 'Lo entendieron, aunque la señora de los tamales te vio raro.', { morale: -2, fitness: 3 })),
    ],
  },
  {
    id: 'div_feria',
    category: 'divisiones',
    title: 'Feria patronal',
    text: (p, ctx) =>
      `Es la feria de ${ctx.club.city}: jaripeo, juegos mecánicos y baile el sábado. El partido es el domingo a las 10. Los muchachos ya hicieron planes.`,
    when: (p, ctx) => isLower(ctx),
    cooldown: 7,
    options: () => [
      opt('Me voy al baile con el grupo',
        o(0.4, 'Bailaste hasta la una y aun así metiste gol. Leyenda de feria.', { morale: 10, fame: 3, fitness: -6 }),
        o(0.6, 'Llegaste con ojeras y el profe te dejó en la banca.', { coach: -8, fitness: -8, morale: 3 })),
      opt('Algodón, una vuelta y a dormir',
        o(0.8, 'Disfrutaste un rato sin desvelarte. Equilibrio.', { morale: 4 }),
        o(0.2, 'El grupo te dijo aguado toda la semana.', { morale: -3 })),
      opt('Me quedo en casa',
        o(1, 'Dormiste temprano. Pero te perdiste la feria del año.', { fitness: 5, coach: 3, morale: -4 })),
    ],
  },
  {
    id: 'div_lluvia_mayo',
    category: 'divisiones',
    title: 'Las lluvias de mayo',
    text: () =>
      'Llegaron las lluvias de mayo y la cancha es una piscina. El árbitro quiere suspender, pero el equipo local insiste en jugar.',
    when: (p, ctx) => isLower(ctx),
    cooldown: 6,
    options: () => [
      opt('A jugar en el lodo',
        o(0.55, 'Gol de cabeza con el balón frenado en un charco. Épico.', { morale: 8, fame: 2, fitness: -6 }),
        o(0.45, 'Te resbalaste mal y te doblaste el tobillo.', { fitness: -16, morale: -4 })),
      opt('Pido que se suspenda',
        o(0.6, 'Se reprogramó. El técnico pensaba igual que vos.', { coach: 3 }),
        o(0.4, 'Jugaron igual y los aficionados locales te gritaron "delicado".', { morale: -4 })),
    ],
  },
  {
    id: 'div_pelea_ascenso',
    category: 'divisiones',
    title: 'Peleando el ascenso',
    text: (p, ctx) =>
      `${ctx.club.name} está entre los primeros de la ${divName(ctx)}. Faltan tres fechas y cada punto vale oro para meterse a la liguilla.`,
    when: (p, ctx) => isLower(ctx) && !has(p, 'div_liguilla'),
    weight: (p, ctx) => (goodSeason(p, ctx) ? 2 : 1),
    cooldown: 6,
    options: () => [
      opt('Me echo el equipo al hombro',
        o(0.55, 'Fuiste la figura de la recta final. ¡Están en la liguilla!', { morale: 8, fame: 4, rating: 1, flag: 'div_liguilla' }),
        o(0.45, 'Te faltó aire en la última fecha. Se quedaron a un punto.', { morale: -8, fitness: -6 })),
      opt('Juego para el equipo',
        o(0.45, 'Orden y sacrificio. Clasificaron raspados.', { coach: 5, morale: 5, flag: 'div_liguilla' }),
        o(0.55, 'No alcanzó. El año que viene será.', { morale: -5, coach: 2 })),
    ],
  },
  {
    id: 'div_final_ascenso',
    category: 'divisiones',
    title: 'Liguilla de ascenso',
    text: (p, ctx) =>
      `Final de la liguilla de ascenso. Estadio lleno en ${ctx.club.city}, cohetes desde temprano. El que gane sube a la ${upName(ctx)}.`,
    when: (p, ctx) => has(p, 'div_liguilla') && isLower(ctx),
    weight: 4,
    options: (p, ctx) => [
      opt('Pido cobrar el penal decisivo',
        o(0.5, `¡Gol y ascenso! Te sacaron en hombros. El club de arriba que te vio te fichó.`, { transfer: 'tierUp', fame: 10, morale: 14, unflag: 'div_liguilla', milestone: `Ascenso con ${ctx.club.short}` }),
        o(0.5, 'Lo atajaron. Perdieron el ascenso y no podés dormir en días.', { morale: -14, fame: 2, unflag: 'div_liguilla' })),
      opt('Juego mi partido y confío',
        o(0.45, 'Ganaron y subieron. Un club de la división de arriba te llevó.', { transfer: 'tierUp', fame: 6, morale: 10, unflag: 'div_liguilla', milestone: `Ascenso con ${ctx.club.short}` }),
        o(0.55, 'Perdieron por la mínima. Te quedan la experiencia y el dolor.', { morale: -8, rating: 1, unflag: 'div_liguilla' })),
    ],
  },
  {
    id: 'div_visores',
    category: 'divisiones',
    title: 'Visores en la gradería',
    text: (p, ctx) =>
      `Corre el rumor: hoy hay visores de ${ctx.tier === 2 ? 'un club de Liga Nacional' : 'un equipo de Primera División'} en la gradería de ${ctx.club.city}, con libreta y todo.`,
    when: (p, ctx) => isLower(ctx) && p.rating >= (ctx.tier === 2 ? 58 : 50) && !has(p, 'div_visto'),
    weight: (p, ctx) => (goodSeason(p, ctx) ? 2.5 : 1.2),
    cooldown: 6,
    options: () => [
      opt('Juego para lucirme',
        o(0.4, 'Hiciste de todo y salió bien. Te ficharon esa misma semana.', { transfer: 'tierUp', fame: 6, morale: 10 }),
        o(0.6, 'Te vieron individualista. Anotaron tu nombre, pero con dudas.', { coach: -5, flag: 'div_visto' })),
      opt('Juego como siempre',
        o(0.35, 'Partido serio y completo. Les gustó tu madurez: te ficharon.', { transfer: 'tierUp', fame: 4, morale: 8 }),
        o(0.65, 'Pasaste desapercibido, aunque uno de ellos pidió tu número.', { morale: -2, flag: 'div_visto' })),
    ],
  },
  {
    id: 'div_prueba',
    category: 'divisiones',
    title: 'Llamada para una prueba',
    text: (p, ctx) =>
      `El visor te llamó: te quieren a prueba una semana en un club de ${upName(ctx)}. Tu técnico no te quiere soltar en plena temporada.`,
    when: (p, ctx) => has(p, 'div_visto') && isLower(ctx),
    weight: 3,
    options: () => [
      opt('Voy a la prueba igual',
        o(0.55, 'Te quedaste. Firmaste en la división de arriba.', { transfer: 'tierUp', morale: 12, fame: 5, unflag: 'div_visto' }),
        o(0.45, 'No te quedaste, y al volver el técnico te tenía en la banca.', { coach: -10, morale: -8, unflag: 'div_visto' })),
      opt('Pido ir en vacaciones',
        o(0.35, 'Esperaron por vos. En la pretemporada te ganaste el contrato.', { transfer: 'tierUp', morale: 8, coach: 4, unflag: 'div_visto' }),
        o(0.65, 'Para vacaciones ya habían fichado a otro.', { coach: 5, morale: -6, unflag: 'div_visto' })),
    ],
  },
  {
    id: 'div_venden_plaza',
    category: 'divisiones',
    title: 'Venden la plaza',
    text: (p, ctx) =>
      `Rumor confirmado: el dueño de ${ctx.club.name} vendió la plaza a otro departamento. El equipo, como lo conocés, desaparece.`,
    when: (p, ctx) => isLower(ctx),
    once: true,
    weight: 0.7,
    options: () => [
      opt('Me voy con la plaza nueva',
        o(0.6, 'Te mudaste lejos, pero seguís jugando y al día con el pago.', { transfer: 'any', morale: -2 }),
        o(0.4, 'En el pueblo nuevo no te conoce nadie. Arrancás de cero.', { transfer: 'any', morale: -8 })),
      opt('Busco equipo por mi cuenta',
        o(0.35, 'Un club de la división de arriba te abrió la puerta.', { transfer: 'tierUp', morale: 8 }),
        o(0.65, 'Solo encontraste lugar en un equipo más chico.', { transfer: 'down', morale: -6 })),
    ],
  },
  {
    id: 'div_estudiar',
    category: 'divisiones',
    title: '¿Estudiar o seguir?',
    text: (p, ctx) =>
      `Tenés ${p.age} años y seguís en la ${divName(ctx)}. Te sale una beca en la U para estudiar en la noche. Tu familia ya está haciendo cuentas.`,
    when: (p, ctx) => isLower(ctx) && p.age >= 19 && p.age <= 27 && !has(p, 'div_estudia'),
    once: true,
    options: (p) => [
      opt('Estudio y juego',
        o(0.65, 'Cansado, pero contento. Tu mamá enseña tu carné a todo el mundo.', { morale: 8, fitness: -8, flag: 'div_estudia' }),
        o(0.35, 'Entre la U y el fútbol, el nivel en la cancha bajó.', { rating: -1, fitness: -8, flag: 'div_estudia' })),
      opt('Solo fútbol, quiero subir',
        o(0.6, 'Le metiste todo a la cancha. Se nota.', { rating: 2, morale: 2 }),
        o(0.4, 'Tu familia no entiende la decisión. Pesa en la casa.', { rating: 1, morale: -8 })),
      ...(p.age >= 24
        ? [opt('Cuelgo los tacos y estudio',
            o(1, 'Te despediste del fútbol con la frente en alto. Ahora, a la U.', { retire: true, milestone: 'Dejó el fútbol para estudiar' }))]
        : []),
    ],
  },
  {
    id: 'div_examenes',
    category: 'divisiones',
    title: 'Examen el día del partido',
    text: () =>
      'El examen final de la U cae el sábado a las 2, y el partido de visita sale a las 11. El catedrático no da segunda oportunidad.',
    when: (p, ctx) => has(p, 'div_estudia') && isLower(ctx),
    weight: 2.5,
    cooldown: 6,
    options: () => [
      opt('Hago el examen',
        o(0.7, 'Ganaste el curso. El técnico te descontó, pero lo entendió.', { morale: 6, coach: -5 }),
        o(0.3, 'Ganaste el curso, y el equipo perdió sin vos. Miradas feas.', { morale: 2, coach: -9 })),
      opt('Me voy al partido',
        o(0.6, 'Jugaste bien. El curso lo repetís el otro semestre.', { coach: 5, morale: -4 }),
        o(0.4, 'Perdieron y perdiste el curso. Día redondo de los malos.', { morale: -10 })),
      opt('Dejo la U por ahora',
        o(1, 'Una preocupación menos. Tu mamá no opina igual.', { fitness: 6, morale: -5, unflag: 'div_estudia' })),
    ],
  },
  {
    id: 'div_bus_varado',
    category: 'divisiones',
    title: 'El bus se quedó en la cuesta',
    text: () =>
      'El microbús del equipo se arruinó en plena cuesta, a dos horas de la cancha. Falta hora y media para el partido.',
    when: (p, ctx) => isLower(ctx),
    cooldown: 8,
    options: () => [
      opt('Empujamos todos el bus',
        o(0.5, 'Arrancó a la tercera empujada. Llegaron con el uniforme puesto.', { morale: 6, fitness: -6, coach: 3 }),
        o(0.5, 'No arrancó. Perdieron el partido por no presentarse.', { morale: -6, fitness: -6 })),
      opt('Pido jalón en un pickup',
        o(0.6, 'Medio equipo llegó en la palangana de un pickup. Ganaron igual.', { morale: 8, fame: 2 }),
        o(0.4, 'Llegaste solo con cuatro compañeros. El técnico no estaba feliz.', { coach: -4, morale: -3 })),
    ],
  },
  {
    id: 'div_veterano',
    category: 'divisiones',
    title: 'El veterano que bajó',
    text: (p, ctx) =>
      `Llega a ${ctx.club.name} un exjugador de Liga Nacional de 36 años. Viene a cerrar su carrera cerca de casa y mira a los jóvenes con lupa.`,
    when: (p, ctx) => isLower(ctx) && p.age <= 24,
    once: true,
    options: () => [
      opt('Le pido que me enseñe',
        o(0.75, 'Te enseñó a cuidarte, a cobrar faltas y a no pelear con el árbitro.', { rating: 2, potential: 2, morale: 4 }),
        o(0.25, 'Te enseñó también a llegar tarde. Malas mañas.', { coach: -5, rating: 1 })),
      opt('Vino a quitarme el puesto',
        o(0.5, 'Le competiste de tú a tú y ganaste el puesto. Él te felicitó.', { rating: 1, morale: 6 }),
        o(0.5, 'Te ganó el puesto con pura experiencia.', { coach: -5, morale: -6 })),
    ],
  },
  {
    id: 'div_calor_costa',
    category: 'divisiones',
    title: 'A las tres de la tarde',
    text: () =>
      'Les toca jugar en la Costa Sur a las 3 de la tarde, con 38 grados y sin sombra en la banca. El rival está acostumbrado.',
    when: (p, ctx) => isLower(ctx),
    cooldown: 7,
    options: () => [
      opt('Corro todo, a lo bestia',
        o(0.4, 'Metiste un gol temprano y aguantaron. Terminaste deshidratado.', { morale: 6, fitness: -12 }),
        o(0.6, 'A los 60 minutos no podías ni caminar.', { fitness: -16, coach: -4 })),
      opt('Dosifico y espero mi momento',
        o(0.65, 'Guardaste piernas y apareciste al final. Empate valioso.', { coach: 4, morale: 3 }),
        o(0.35, 'El técnico creyó que estabas caminando. Cambio al medio tiempo.', { coach: -6 })),
    ],
  },
];
