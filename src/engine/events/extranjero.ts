import type { EventContext, EventTemplate, Player } from '../types';
import { COUNTRIES, countryOf, money } from '../countries';
import { o, opt, has, cap, de } from '../helpers';

// Banderas que usa este archivo:
// ext_visoria   un visor te vio jugar; arranca la ruta para salir al extranjero
// ext_video     ya tenés video de tus mejores jugadas circulando
// ext_agente    tenés representante para buscar club afuera
// ext_agente_inf el representante es informal (riesgo de estafa)
// ext_prueba    pasaste una prueba (trial) en un club del extranjero
// ext_papeles   pasaporte, visa de trabajo y permiso en regla
// ext_liberado  tu club aceptó negociar tu salida; falta la oferta formal
// ext_ingles    estudiaste el idioma estando afuera
// ext_remesas   mandás pisto a tu familia cada mes

const RUTA = ['ext_visoria', 'ext_video', 'ext_agente', 'ext_agente_inf', 'ext_prueba', 'ext_papeles', 'ext_liberado'];

/** Edad razonable para buscar una salida al extranjero. */
const edadRuta = (p: Player) => p.age >= 18 && p.age <= 30;

/** Buena temporada: goles o partidos según la posición. */
function buenaTemporada(p: Player, ctx: EventContext): boolean {
  const l = ctx.last;
  if (!l) return false;
  if (p.setup.position === 'POR' || p.setup.position === 'DEF') return l.apps >= 26;
  if (p.setup.position === 'MED') return l.apps >= 24 && (l.goals >= 5 || l.assists >= 6);
  return l.goals >= 10;
}

/**
 * Destino de la prueba: la liga del extranjero donde el jugador sería titular, de preferencia en su confederación.
 * ponytail: es solo el texto; el club que lo ficha al final sale de findClub('abroad').
 */
function destinoPrueba(p: Player, ctx: EventContext): string {
  const fit = (c: (typeof COUNTRIES)[number]) =>
    Math.abs(67 + c.level - ctx.country.level - (p.rating + 2)) + (c.conf === ctx.country.conf ? 0 : 4);
  const [best] = COUNTRIES.filter((c) => c.code !== ctx.country.code).sort((a, b) => fit(a) - fit(b));
  return `un club de ${best.name}`;
}

/** País del club donde juega (afuera). */
const paisClub = (ctx: EventContext) => countryOf(ctx.club.country);
/** Países donde se habla otro idioma. */
const otroIdioma = (ctx: EventContext) => paisClub(ctx).lang !== ctx.country.lang;
const hayFrio = (ctx: EventContext) => !!paisClub(ctx).cold && !ctx.country.cold;

export const EXTRANJERO_EVENTS: EventTemplate[] = [
  // ---------- A) Ruta para salir al extranjero ----------
  {
    id: 'ext_visor',
    category: 'extranjero',
    title: 'Un visor en la tribuna',
    text: (p, ctx) =>
      `Después del partido, un señor con gorra y libreta se acerca. Dice que es visor y que vio tu temporada: ${ctx.last ? `${ctx.last.apps} partidos` : 'buenos números'}. Quiere tu número.`,
    when: (p, ctx) =>
      !ctx.abroad &&
      edadRuta(p) &&
      !has(p, 'ext_visoria') &&
      (ctx.tier === 3 ? p.rating >= 64 : buenaTemporada(p, ctx) || p.rating >= 66),
    weight: (p, ctx) => (ctx.tier === 3 ? 0.4 : ctx.tier === 1 && p.rating >= 66 ? 3 : 1.5),
    cooldown: 6,
    options: () => [
      opt('Le doy mi número',
        o(0.7, 'A la semana te escribe: quiere ver más jugadas tuyas. Esto va en serio.', { flag: 'ext_visoria', morale: 8 }),
        o(0.3, 'Te llamó una vez y desapareció. Quedaste pensando en eso todo el mes.', { flag: 'ext_visoria', morale: -4 })),
      opt('Le digo que hable con el club',
        o(0.6, 'La directiva tomó nota y te ve con otros ojos. El visor quedó pendiente.', { flag: 'ext_visoria', coach: 4 }),
        o(0.4, 'La directiva cortó el tema de una vez. "Aquí tenés contrato, muchacho."', { coach: 3, morale: -5 })),
      opt('Ahorita solo pienso en mi club',
        o(1, 'El técnico se enteró y le gustó tu actitud. La oportunidad se fue.', { coach: 5, morale: -3 })),
    ],
  },
  {
    id: 'ext_video',
    category: 'extranjero',
    title: 'El video de tus jugadas',
    text: (p, ctx) =>
      `El visor pide un video con tus mejores jugadas como ${p.setup.position === 'POR' ? 'portero' : 'jugador'}. Un editor cobra ${money(ctx.country, 3000)}; tu primo dice que lo hace con el celular.`,
    when: (p, ctx) => !ctx.abroad && has(p, 'ext_visoria') && !has(p, 'ext_video'),
    weight: 3,
    options: (p) => [
      opt('Pago al editor profesional',
        o(0.75, 'Quedó de lujo: cámara lenta, estadísticas y música épica. Ya circula.', { flag: 'ext_video', fame: 4, morale: -3 }),
        o(0.25, 'Pagaste y el editor se tardó dos meses. Llegó tarde, pero llegó.', { flag: 'ext_video', morale: -8 })),
      opt('Que lo haga mi primo',
        o(0.5, 'Salió casero pero honesto. Al visor le bastó.', { flag: 'ext_video', morale: 3 }),
        o(0.5, `Le puso un filtro de corazones a tu ${p.setup.position === 'POR' ? 'mejor atajada' : p.setup.position === 'DEF' ? 'mejor cruce' : 'golazo'}. Hubo que rehacerlo.`, { flag: 'ext_video', morale: -6, fame: -2 })),
    ],
  },
  {
    id: 'ext_representante',
    category: 'contrato',
    title: '¿Quién te representa?',
    text: () =>
      'Para negociar afuera necesitás representante. Uno con licencia cobra su comisión y va despacio; un conocido del barrio promete Europa en tres meses.',
    when: (p, ctx) => !ctx.abroad && has(p, 'ext_video') && !has(p, 'ext_agente'),
    weight: 3,
    options: () => [
      opt('Firmo con el agente con licencia',
        o(0.8, 'Papeles claros, contactos reales. Te dice: "Paciencia, esto se hace bien."', { flag: 'ext_agente', morale: 4 }),
        o(0.2, 'Tiene tantos jugadores que casi no te contesta. Pero el contrato es serio.', { flag: 'ext_agente', morale: -5 })),
      opt('Me voy con el conocido del barrio',
        o(0.35, 'Para sorpresa de todos, tiene un contacto bueno. Arrancan las llamadas.', { flag: 'ext_agente', morale: 6 }),
        o(0.65, 'Habla bonito y promete mucho. Algo no te cuadra, pero ya firmaste.', { flag: ['ext_agente', 'ext_agente_inf'], morale: 2 })),
    ],
  },
  {
    id: 'ext_gastos_tramite',
    category: 'contrato',
    title: 'Los famosos gastos de trámite',
    text: (p, ctx) =>
      `Tu representante informal te pide ${money(ctx.country, 8000)} "para gastos de trámite y para mover tu nombre allá". No te da recibo.`,
    when: (p, ctx) => !ctx.abroad && has(p, 'ext_agente_inf'),
    weight: 4,
    options: () => [
      opt('Le pago, no quiero perder la chance',
        o(0.25, 'De verdad movió tu nombre. Te consiguió una llamada seria.', { unflag: 'ext_agente_inf', morale: 4 }),
        o(0.75, 'Se esfumó con el pisto. Tocó buscar un agente con licencia y empezar de nuevo.', { unflag: ['ext_agente_inf', 'ext_agente'], morale: -14 })),
      opt('Sin recibo no pago nada',
        o(0.7, 'Se enojó y se fue. Mejor: tu familia te recomienda un agente con licencia.', { unflag: 'ext_agente_inf', morale: -3 }),
        o(0.3, 'Te dejó tirado y habló mal de vos con un club. Hay que arrancar de cero.', { unflag: ['ext_agente_inf', 'ext_agente'], morale: -8, fame: -2 })),
    ],
  },
  {
    id: 'ext_prueba',
    category: 'extranjero',
    title: 'Prueba en el extranjero',
    text: (p, ctx) =>
      `Tu agente consiguió una prueba de dos semanas con ${destinoPrueba(p, ctx)}. Tu club en ${ctx.country.name} te da permiso, pero sin goce de salario.`,
    when: (p, ctx) => !ctx.abroad && edadRuta(p) && has(p, 'ext_agente') && !has(p, 'ext_agente_inf') && !has(p, 'ext_prueba') && p.rating >= 62,
    weight: 4,
    options: (p) => {
      const ventaja = Math.min(0.2, Math.max(0, (p.rating - 62) * 0.02));
      return [
        opt('Voy a dejar todo en la prueba',
          o(0.5 + ventaja, 'Te quedaste en todos los entrenos con la cara en alto. "Te vamos a llamar", y llamaron.', { flag: 'ext_prueba', morale: 10, fitness: -6 }),
          o(0.5 - ventaja, 'El ritmo era otro y no estuviste fino. Te dieron las gracias.', { unflag: ['ext_visoria', 'ext_video'], morale: -10, fitness: -6 })),
        opt('Voy a lo seguro, sin arriesgar',
          o(0.35, 'No brillaste, pero tampoco fallaste. Te dejan la puerta abierta.', { flag: 'ext_prueba', morale: 3 }),
          o(0.65, 'Pasaste desapercibido. El visor dejó de contestar.', { unflag: ['ext_visoria', 'ext_video'], morale: -6 })),
        opt('No voy: estamos peleando el torneo',
          o(1, 'Tu técnico te lo agradece. La prueba se la dieron a otro.', { unflag: ['ext_visoria', 'ext_video'], coach: 8, morale: -6 })),
      ];
    },
  },
  {
    id: 'ext_mama_no_quiere',
    category: 'extranjero',
    title: 'Tu mamá no quiere',
    text: (p) =>
      `En el almuerzo del domingo en ${p.setup.dept}, tu mamá llora: "¿Y si te pasa algo allá? ¿Quién te va a cuidar?". Tu papá no dice nada.`,
    when: (p, ctx) => !ctx.abroad && has(p, 'ext_prueba') && p.age <= 24,
    weight: 3,
    once: true,
    options: () => [
      opt('Le explico mis planes con calma',
        o(0.7, 'Le enseñaste todo: contrato, ciudad, dónde vas a vivir. Te dio su bendición.', { morale: 10 }),
        o(0.3, 'No la convenciste, pero te abrazó igual. Te vas con un nudo en la garganta.', { morale: -4 })),
      opt('Le prometo volver cada diciembre',
        o(1, 'Le prometiste y te creyó. Ahora tenés que cumplir.', { morale: 4, fitness: -4 })),
    ],
  },
  {
    id: 'ext_papeles',
    category: 'extranjero',
    title: 'Pasaporte, visa y permiso',
    text: (p, ctx) =>
      `Para firmar necesitás pasaporte vigente, visa de trabajo y permiso de la federación. ${ctx.tier === 3 ? 'Nadie en tu equipo ha hecho ese trámite.' : 'El club te ayuda poco.'}`,
    when: (p, ctx) => !ctx.abroad && has(p, 'ext_prueba') && !has(p, 'ext_papeles'),
    weight: 4,
    options: () => [
      opt('Hago la cola de madrugada',
        o(0.7, 'Tres madrugadas con tamal y café en la fila. Todo salió en regla.', { flag: 'ext_papeles', fitness: -8, morale: 3 }),
        o(0.3, 'Te faltó una constancia. Otra vuelta, otra cita, pero ya casi.', { flag: 'ext_papeles', fitness: -10, morale: -8 })),
      opt('Pago a un tramitador',
        o(0.5, 'Rapidísimo y sin colas. Caro, pero valió la pena.', { flag: 'ext_papeles', morale: 2 }),
        o(0.5, 'Los papeles salieron con un error. La visa se atrasó y casi se cae todo.', { flag: 'ext_papeles', morale: -12, coach: -3 })),
      opt('Que lo resuelva mi agente',
        o(0.6, 'Tu agente conoce el proceso. Te pasan cita para la entrevista de visa.', { flag: 'ext_papeles', morale: 4 }),
        o(0.4, 'Le negaron la visa al primer intento. Hay que esperar otro bloque.', { morale: -10 })),
    ],
  },
  {
    id: 'ext_club_no_vende',
    category: 'contrato',
    title: 'El club no te quiere vender',
    text: (p, ctx) =>
      `La directiva de ${ctx.club.name} pide una cifra imposible por vos. "Si lo quieren, que paguen." Tu agente dice que así no se cierra nada.`,
    when: (p, ctx) => !ctx.abroad && has(p, 'ext_papeles') && !has(p, 'ext_liberado'),
    weight: 4,
    options: () => [
      opt('Hablo con el presidente del club',
        o(0.55, 'Le dijiste que te dio todo y que querés crecer. Bajó la cifra. Hay trato.', { flag: 'ext_liberado', morale: 8 }),
        o(0.45, 'No se movió. Te dijo que esperés al final del torneo.', { morale: -6, coach: -2 })),
      opt('Me planto y no entreno',
        o(0.4, 'La presión funcionó: te liberan para no tener un problema en el vestuario.', { flag: 'ext_liberado', coach: -12, fame: -3 }),
        o(0.6, 'Te mandaron a entrenar aparte. Mala imagen y la oferta se enfrió.', { unflag: RUTA, coach: -15, morale: -10, fame: -4 })),
      opt('Dejo que los agentes negocien',
        o(0.6, 'Lento, pero llegaron a un número. Te avisan que ya podés escuchar ofertas.', { flag: 'ext_liberado', morale: 3 }),
        o(0.4, 'El otro club se cansó de esperar. Toca seguir otro torneo aquí.', { morale: -8 })),
    ],
  },
  {
    id: 'ext_oferta_final',
    category: 'extranjero',
    title: 'La oferta formal',
    text: (p, ctx) =>
      `Llegó por correo: contrato de dos años en el extranjero, sueldo en dólares y vivienda pagada. ${ctx.club.name} ya aceptó. Solo falta tu firma.`,
    when: (p, ctx) => !ctx.abroad && has(p, 'ext_liberado'),
    weight: 4,
    options: (p) => [
      opt('Firmo, me voy',
        o(0.85, 'Te despediste del vestuario con abrazos. Arranca la aventura afuera.', { transfer: 'abroad', unflag: RUTA, morale: 12, fame: 8, milestone: 'Primer contrato en el extranjero' }),
        o(0.15, 'Te vas, pero con la duda en el pecho. Los primeros días serán duros.', { transfer: 'abroad', unflag: RUTA, morale: -4, fame: 6, milestone: 'Primer contrato en el extranjero' })),
      opt('Me quedo un año más aquí',
        o(1, `${p.age <= 23 ? 'Sentís que aún no es tu momento.' : 'Preferiste la tranquilidad.'} El club te lo agradece; la puerta se cierra.`, { unflag: RUTA, coach: 8, morale: -8 })),
    ],
  },

  // ---------- B) Vida en el extranjero ----------
  {
    id: 'ext_idioma',
    category: 'extranjero',
    title: 'No entendés la charla',
    text: (p, ctx) =>
      `En ${ctx.club.city} la charla técnica es en otro idioma. Asentís con la cabeza, pero no entendés la mitad de las indicaciones del técnico.`,
    when: (p, ctx) => ctx.abroad && otroIdioma(ctx) && !has(p, 'ext_ingles'),
    weight: 2,
    cooldown: 6,
    options: () => [
      opt('Me meto a clases tres veces por semana',
        o(0.7, 'Ya entendés las jugadas y hasta los chistes del vestuario.', { flag: 'ext_ingles', coach: 8, fitness: -5 }),
        o(0.3, 'Las clases chocan con la recuperación. Llegás cansado, pero aprendés.', { flag: 'ext_ingles', fitness: -10, coach: 3 })),
      opt('Aprendo solo lo de la cancha',
        o(0.6, '"Derecha, izquierda, presión, cambio." Con eso sobrevivís.', { coach: 2, morale: -2 }),
        o(0.4, 'Malentendiste una indicación y quedó un hueco. El técnico te sacó.', { coach: -8, morale: -5 })),
    ],
  },
  {
    id: 'ext_frio',
    category: 'extranjero',
    title: 'La primera nevada',
    text: (p, ctx) =>
      `Bajo cero en ${ctx.club.city}. El campo amaneció blanco y vos con tres suéteres. En ${p.setup.dept} nunca viste algo así.`,
    when: (p, ctx) => ctx.abroad && hayFrio(ctx),
    once: true,
    options: () => [
      opt('Entreno igual que todos',
        o(0.6, 'Te dolían hasta las pestañas, pero el técnico vio que no te arrugás.', { coach: 8, fitness: -8 }),
        o(0.4, 'Te agarró una bronquitis de las buenas. Dos semanas fuera.', { fitness: -18, morale: -6 })),
      opt('Pido entrenar en el gimnasio',
        o(1, 'Te cuidaste, pero en el vestuario dicen que sos de azúcar.', { fitness: 4, coach: -4, morale: -3 })),
    ],
  },
  {
    id: 'ext_comida',
    category: 'extranjero',
    title: 'Extrañás la comida de casa',
    text: (p, ctx) =>
      `Tres meses sin ${ctx.country.food}. Encontraste una tienda con productos de ${ctx.country.name} a una hora de distancia.`,
    when: (p, ctx) => ctx.abroad,
    cooldown: 8,
    options: () => [
      opt('Voy cada fin de semana',
        o(0.7, 'Volviste con la bolsa llena de sabores de casa. El alma regresó al cuerpo.', { morale: 10, fitness: -4 }),
        o(0.3, 'Te comiste todo en dos días y la báscula del club lo notó.', { morale: 6, fitness: -10, coach: -3 })),
      opt('Me adapto a la comida de aquí',
        o(0.6, 'El nutricionista te armó un plan. Te sentís más liviano.', { fitness: 8, morale: -4 }),
        o(0.4, 'Nada te sabe a nada. Comés por obligación.', { morale: -8, fitness: 2 })),
    ],
  },
  {
    id: 'ext_soledad',
    category: 'extranjero',
    title: 'Navidad lejos de casa',
    text: (p, ctx) =>
      `24 de diciembre en ${ctx.club.city}. En la videollamada tu familia está ${ctx.country.code === 'GT' ? 'comiendo tamales y quemando cohetes' : 'en plena cena de Nochebuena'}. Vos estás solo en el apartamento.`,
    when: (p, ctx) => ctx.abroad,
    cooldown: 10,
    options: () => [
      opt('Acepto la cena de un compañero',
        o(0.75, 'Su familia te recibió como uno más. Ganaste un hermano en el vestuario.', { morale: 8, coach: 3 }),
        o(0.25, 'Fue amable, pero te sentiste fuera de lugar toda la noche.', { morale: -4 })),
      opt('Me quedo en la videollamada',
        o(0.5, 'Tres horas conectado. Tu abuela te dio la bendición por la pantalla.', { morale: 6 }),
        o(0.5, 'Al colgar el silencio pesó más que nunca.', { morale: -10 })),
      opt('Compro boleto y me escapo dos días',
        o(0.55, 'Un abrazo de tu mamá lo cura todo. Volviste con energía.', { morale: 14, fitness: -8, coach: -4 }),
        o(0.45, 'Se atrasó el vuelo de regreso y llegaste tarde al entreno. Multa.', { morale: 4, coach: -10 })),
    ],
  },
  {
    id: 'ext_remesas',
    category: 'extranjero',
    title: 'El pisto para la familia',
    text: (p) =>
      `Tu familia en ${p.setup.dept} necesita arreglar el techo y pagar los estudios de tu hermana. ¿Cuánto mandás cada mes?`,
    when: (p, ctx) => ctx.abroad && !has(p, 'ext_remesas'),
    weight: 2,
    options: () => [
      opt('Mando la mitad de mi sueldo',
        o(0.7, 'Techo nuevo y tu hermana en la U. Jugás con orgullo.', { flag: 'ext_remesas', morale: 12, fitness: -4 }),
        o(0.3, 'Te quedaste justo para comer. La alimentación lo resiente.', { flag: 'ext_remesas', morale: 6, fitness: -10 })),
      opt('Mando algo y ahorro el resto',
        o(0.8, 'Balance sano: ayudás y te vas armando un colchón.', { flag: 'ext_remesas', morale: 4 }),
        o(0.2, 'Un tío dice en el pueblo que te volviste agarrado. Duele.', { flag: 'ext_remesas', morale: -6 })),
    ],
  },
  {
    id: 'ext_comunidad',
    category: 'extranjero',
    title: (p, ctx) => `${cap(ctx.country.people)} en la tribuna`,
    text: (p, ctx) =>
      `En ${ctx.club.city} llegaron cien ${ctx.country.people} al estadio con la bandera de ${ctx.country.name} y una manta: "¡${p.setup.lastName}, orgullo de ${p.setup.dept}!".`,
    when: (p, ctx) => ctx.abroad && ['US', 'MX', 'ES'].includes(ctx.club.country),
    cooldown: 8,
    options: () => [
      opt('Les dedico el partido',
        o(0.6, 'Jugaste con el corazón y te tomaste fotos con todos. Salió en las noticias de allá.', { morale: 12, fame: 8, fitness: -4 }),
        o(0.4, 'Querías lucirte y te fuiste expulsado por una entrada tonta.', { morale: -8, coach: -6, fame: 2 })),
      opt('Saludo al final, concentrado',
        o(1, 'Hiciste tu partido y luego firmaste camisetas. Contentos todos.', { morale: 5, fame: 3 })),
    ],
  },
  {
    id: 'ext_estilo',
    category: 'extranjero',
    title: 'Aquí se juega distinto',
    text: (p, ctx) =>
      `En ${ctx.club.city} todo es más rápido y táctico. El técnico te pide presionar sin pelota los 90 minutos. En ${ctx.country.name} te cuidabas más.`,
    when: (p, ctx) => ctx.abroad && p.rating < 80,
    cooldown: 8,
    options: (p, ctx) => [
      opt('Hago trabajo físico extra',
        o(0.65, 'En seis semanas ya aguantás el ritmo. El técnico te tiene en cuenta.', { rating: 2, fitness: 6, coach: 6 }),
        o(0.35, 'Te pasaste de carga y se te subió el aductor.', { fitness: -15, morale: -5 })),
      opt('Juego a mi manera',
        o(0.35, `Tu toque distinto les sorprendió. A veces el estilo ${de(ctx.country.name)} sirve.`, { fame: 4, coach: 3 }),
        o(0.65, 'El técnico te dijo claro: "Así no." A la banca.', { coach: -10, morale: -6 })),
    ],
  },
  {
    id: 'ext_competencia',
    category: 'extranjero',
    title: 'Pelea por el puesto',
    text: (p) =>
      `El club fichó a otro extranjero para tu posición, ${p.setup.position === 'POR' ? 'un portero alto y con experiencia' : 'más joven y con buen cartel'}. Solo uno será titular.`,
    when: (p, ctx) => ctx.abroad,
    cooldown: 6,
    options: () => [
      opt('Me mato en los entrenos',
        o(0.55, 'Te ganaste el puesto a punta de sudor. El técnico confía en vos.', { coach: 10, rating: 1, fitness: -6 }),
        o(0.45, 'Él empezó mejor. Te toca esperar en la banca.', { coach: -4, morale: -8, fitness: -6 })),
      opt('Me hago su amigo y compito sano',
        o(0.7, 'Se empujan entre los dos y ambos mejoran. Buen ambiente.', { morale: 6, rating: 1 }),
        o(0.3, 'Él no quería amigos, quería tu puesto. Te ganó la partida.', { coach: -6, morale: -4 })),
      opt('Pido salir cedido',
        o(1, 'El club lo anotó. Por ahora, minutos a cuentagotas.', { coach: -5, morale: -3 })),
    ],
  },
  {
    id: 'ext_discriminacion',
    category: 'extranjero',
    title: 'Insultos desde la grada',
    text: () =>
      'Un grupo en la tribuna te grita insultos por tu origen cada vez que tocás la pelota. Varios compañeros lo escucharon. El árbitro sigue el partido.',
    when: (p, ctx) => ctx.abroad,
    once: true,
    options: (p, ctx) => [
      opt('Se lo digo al árbitro y al capitán',
        o(0.65, 'Pararon el partido, se activó el protocolo y sacaron a los responsables. Recibiste mucho apoyo.', { morale: 6, fame: 10, coach: 4 }),
        o(0.35, 'No pararon el juego. Al final el club hizo la denuncia formal contigo.', { morale: -6, fame: 6 })),
      opt('Hago la denuncia pública después',
        o(0.6, `Tus palabras recorrieron ${ctx.country.name} y la liga abrió una investigación.`, { fame: 14, morale: 4, milestone: 'Alzó la voz contra la discriminación' }),
        o(0.4, 'Recibiste apoyo, pero también mensajes feos en redes. Pesa.', { fame: 10, morale: -10 })),
      opt('Respondo jugando y me lo guardo',
        o(1, 'Jugaste bien, pero lo cargás por dentro. Hablalo con alguien de confianza.', { morale: -10, rating: 1 })),
    ],
  },
  {
    id: 'ext_salto',
    category: 'extranjero',
    title: 'Un club más grande te llama',
    text: (p, ctx) =>
      `Tu rendimiento en ${ctx.club.name} llamó la atención de una liga mejor. ${ctx.last ? `Con ${ctx.last.apps} partidos` : 'Con tu temporada'} ya no sos una apuesta: sos opción.`,
    when: (p, ctx) => ctx.abroad && p.age <= 31 && p.rating >= 74 && ctx.club.prestige < 89,
    weight: 2,
    cooldown: 6,
    options: (p, ctx) => [
      opt('Doy el salto',
        o(0.7, `Nuevo club, nueva liga, más exigencia. Otro escalón para el fútbol ${de(ctx.country.name)}.`, { transfer: 'abroadUp', fame: 12, morale: 8, milestone: 'Saltó a una liga mejor' }),
        o(0.3, 'Te fuiste, pero arrancás como la cuarta opción del técnico.', { transfer: 'abroadUp', fame: 8, morale: -6, coach: -8 })),
      opt('Me quedo donde soy titular',
        o(1, 'Seguís siendo figura donde estás. La afición te lo reconoce.', { coach: 8, morale: -2, fame: 2 })),
    ],
  },
  {
    id: 'ext_volver',
    category: 'extranjero',
    title: (p, ctx) => `¿Volver a ${ctx.country.name}?`,
    text: (p, ctx) =>
      `Te llaman de ${ctx.country.name}: un club de ${ctx.country.leagues[0]} te quiere de figura. ${p.coach < 45 ? 'Aquí casi no jugás.' : 'Aquí jugás, pero extrañás.'} ¿Regresás?`,
    when: (p, ctx) => ctx.abroad && (p.coach < 45 || p.morale < 40 || p.age >= 30),
    weight: (p) => (p.coach < 35 || p.morale < 30 ? 2.5 : 1),
    cooldown: 6,
    options: (p, ctx) => [
      opt('Regreso a casa',
        o(0.75, 'Te recibieron en el aeropuerto con pancartas y música. Volvés como figura.', { transfer: 'home', morale: 12, fame: 6, milestone: `Regresó a ${ctx.country.name}` }),
        o(0.25, 'Volviste, pero algunos dicen que "fracasaste afuera". Toca demostrar.', { transfer: 'home', morale: -4, fame: 2 })),
      opt('Aguanto un año más afuera',
        o(0.5, 'Te pusiste las pilas y te ganaste minutos. Valió la pena.', { coach: 10, rating: 1 }),
        o(0.5, `Otro año a medias. El cuerpo está aquí, la cabeza en ${ctx.country.code === 'GT' ? 'Guate' : ctx.country.name}.`, { morale: -10, coach: -4 })),
    ],
  },
  {
    id: 'ext_doble_nacionalidad',
    category: 'extranjero',
    title: 'Te ofrecen otra selección',
    text: (p, ctx) =>
      `Tras años en ${ctx.club.city}, un dirigente te sugiere naturalizarte y jugar por otro país. Con ${ctx.country.name} llevás ${p.caps} partidos.`,
    when: (p, ctx) => ctx.abroad && p.ntLevel <= 1 && p.caps <= 2 && p.age <= 27 && p.rating >= 72,
    once: true,
    options: (p, ctx) => [
      opt(`Mi selección es ${ctx.country.name}`,
        o(0.6, `Lo dijiste en una entrevista y en ${ctx.country.name} te aplaudieron. ${cap(ctx.country.federation)} tomó nota.`, { fame: 10, morale: 6 }),
        o(0.4, `${ctx.country.name} no te llama igual. Pero dormís tranquilo.`, { morale: 2, fame: 4 })),
      opt('Lo pienso con calma',
        o(1, `Se filtró que lo estás pensando. En ${ctx.country.name} hay críticas.`, { fame: -6, morale: -4 })),
    ],
  },

  // ---------- C) Contrato ----------
  {
    id: 'ext_renovacion',
    category: 'contrato',
    title: 'Te ofrecen renovar',
    text: (p, ctx) =>
      `${ctx.club.name} quiere renovarte. ${ctx.last ? `Tras ${ctx.last.apps} partidos` : 'Tras tu temporada'}, te ofrecen tres años con un aumento modesto.`,
    when: (p, ctx) => p.age >= 20 && p.age <= 33 && (ctx.last?.apps ?? 0) >= 15,
    cooldown: 8,
    options: () => [
      opt('Firmo por tres años',
        o(0.8, 'Estabilidad para vos y tu familia. La directiva te ve como pieza clave.', { coach: 6, morale: 6 }),
        o(0.2, 'Al mes llegó una oferta mejor. Ya habías firmado.', { coach: 4, morale: -6 })),
      opt('Pido más y un año menos',
        o(0.5, 'Aceptaron. Te valoran más de lo que creías.', { morale: 8, coach: -2 }),
        o(0.5, 'La directiva se molestó por la exigencia. Negociación tensa.', { coach: -8, morale: -4 })),
      opt('Espero a escuchar otras ofertas',
        o(1, 'Te quedás sin renovar. Te ven como alguien que ya se quiere ir.', { coach: -6, fame: 2 })),
    ],
  },
  {
    id: 'ext_clausula',
    category: 'contrato',
    title: 'La cláusula de rescisión',
    text: (p, ctx) =>
      `En el contrato con ${ctx.club.name} falta definir la cláusula de salida. Tu agente quiere una baja para que puedas irte; el club, una altísima.`,
    when: (p, ctx) => !ctx.abroad && p.age <= 28 && p.rating >= 60 && ctx.tier <= 2,
    once: true,
    options: () => [
      opt('Exijo una cláusula baja',
        o(0.55, 'La aceptaron. Si llega una oferta seria, nadie te detiene.', { morale: 6, coach: -4 }),
        o(0.45, 'La directiva lo tomó como falta de compromiso. Te bajaron el sueldo ofrecido.', { coach: -8, morale: -6 })),
      opt('Acepto la cláusula alta',
        o(0.7, 'El club te blinda y te da la confianza de figura.', { coach: 8, morale: 2 }),
        o(0.3, 'Sentís que te amarraron. Ojalá no llegue nadie a preguntar.', { coach: 6, morale: -6 })),
    ],
  },
  {
    id: 'ext_prestamo',
    category: 'contrato',
    title: 'Préstamo con opción de compra',
    text: (p, ctx) =>
      `En ${ctx.club.name} jugaste poco${ctx.last ? ` (${ctx.last.apps} partidos)` : ''}. Un club de nivel parecido te pide prestado un año, con opción de compra.`,
    when: (p, ctx) => p.age <= 29 && (ctx.last?.apps ?? 99) < 15,
    cooldown: 6,
    options: () => [
      opt('Me voy a préstamo',
        o(0.65, 'Allá sos titular y te volvió la sonrisa.', { transfer: 'any', morale: 8, rating: 1, coach: 6 }),
        o(0.35, 'Te prestaron, pero el técnico de allá tampoco te pone.', { transfer: 'any', morale: -8 })),
      opt('Me quedo a pelear mi lugar',
        o(0.4, 'Le demostraste al técnico que se equivocaba. Volviste al once.', { coach: 10, morale: 6 }),
        o(0.6, 'Otro torneo mirando desde la banca.', { coach: -4, morale: -10, rating: -1 })),
    ],
  },
  {
    id: 'ext_impago',
    category: 'contrato',
    title: 'El club no paga',
    text: (p, ctx) =>
      `${ctx.club.name} debe tres quincenas a toda la plantilla. Algunos compañeros hablan de no presentarse al próximo partido.`,
    when: (p, ctx) => !ctx.abroad && (ctx.tier >= 2 || ctx.club.prestige < 70),
    cooldown: 8,
    options: () => [
      opt('Me sumo a la protesta',
        o(0.6, 'La presión funcionó: pagaron dos quincenas. El grupo quedó más unido.', { morale: 6, coach: -5 }),
        o(0.4, 'La directiva sancionó a los que protestaron, vos incluido.', { coach: -12, morale: -8 })),
      opt('Juego igual y denuncio formal',
        o(0.7, 'Llevaste el caso a la instancia de la federación. Lento, pero firme.', { morale: -3, fame: 3 }),
        o(0.3, 'El trámite se alargó meses. Mientras, a apretarse el cinturón.', { morale: -10, fitness: -4 })),
      opt('Busco salir de aquí',
        o(0.6, 'Encontraste un club que sí paga a tiempo.', { transfer: 'any', morale: 6 }),
        o(0.4, 'Nadie fichaba a mitad de torneo. Tocó quedarse sin pisto.', { morale: -10, coach: -4 })),
    ],
  },
  {
    id: 'ext_suitor',
    category: 'contrato',
    title: 'Oferta sobre la mesa',
    text: (p, ctx) =>
      `${ctx.suitor ? ctx.suitor.name : 'Otro club'} presentó una oferta formal por vos. ${ctx.club.name} la escucha. Tu agente dice que es buen momento.`,
    when: (p, ctx) => !!ctx.suitor && ctx.suitor.id !== ctx.club.id && p.age <= 33,
    weight: 1.5,
    cooldown: 6,
    options: (p, ctx) => [
      opt(`Acepto ir a ${ctx.suitor && ctx.suitor.name.length <= 28 ? ctx.suitor.name : 'ese club'}`,
        o(0.7, 'Nuevo club, nuevo reto. La presentación fue a lo grande.', { transfer: 'suitor', morale: 10, fame: 6 }),
        o(0.3, 'Te fuiste, pero la adaptación costó más de lo pensado.', { transfer: 'suitor', morale: -4, fame: 4, coach: -4 })),
      opt('Uso la oferta para renovar mejor',
        o(0.5, 'Tu club subió su propuesta. Te quedás, mejor pagado.', { morale: 6, coach: 2 }),
        o(0.5, 'La directiva sintió el chantaje. La relación se enfrió.', { coach: -10, morale: -4 })),
      opt('Rechazo, aquí estoy bien',
        o(1, 'La afición celebra tu lealtad. Quizá no vuelva otra chance así.', { coach: 6, fame: 2, morale: -3 })),
    ],
  },
  {
    id: 'ext_agente_directiva',
    category: 'contrato',
    title: 'Tu agente contra la directiva',
    text: (p, ctx) =>
      `Tu representante declaró en un programa deportivo de radio que ${ctx.club.name} "no valora a sus jugadores". El presidente está furioso.`,
    when: (p, ctx) => p.age >= 20 && p.fame >= 10,
    cooldown: 10,
    options: () => [
      opt('Respaldo a mi agente',
        o(0.4, 'El club entendió el mensaje y te mejoró condiciones.', { morale: 6, coach: -4 }),
        o(0.6, 'Te dejaron fuera dos partidos "por decisión técnica".', { coach: -12, morale: -6, fame: 2 })),
      opt('Pido disculpas al club',
        o(0.7, 'El presidente aceptó. Tu agente quedó molesto contigo.', { coach: 6, morale: -4 }),
        o(0.3, 'Ni el club ni tu agente quedaron contentos.', { morale: -8 })),
      opt('Cambio de representante',
        o(1, 'Empezás de cero con otro agente. Costó la multa del contrato.', { morale: -5, coach: 4, unflag: ['ext_agente', 'ext_agente_inf'] })),
    ],
  },
  {
    id: 'ext_grande_o_chico',
    category: 'contrato',
    title: 'Suplente o figura',
    text: (p, ctx) =>
      `Un grande ${ctx.country.code === 'GT' ? 'de la capital' : 'del país'} te ofrece contrato, pero para ser suplente. En ${ctx.club.name} sos figura y te prometen la capitanía.`,
    // Los dos o tres más grandes del país (nivel 74 o más) no reciben esta oferta.
    when: (p, ctx) => !ctx.abroad && ctx.tier <= 2 && ctx.club.prestige < 74 && p.rating >= 60 && p.age <= 30,
    cooldown: 10,
    options: () => [
      opt('Me voy al grande',
        o(0.5, 'Entrenar con los mejores te subió el nivel. Esperás tu momento.', { transfer: 'up', rating: 2, morale: -2, fame: 6 }),
        o(0.5, 'Vitrina grande, pero casi no jugás. La paciencia se acaba.', { transfer: 'up', morale: -10, fame: 4, coach: -6 })),
      opt('Me quedo de figura',
        o(0.7, 'Con la cinta de capitán jugás más suelto que nunca.', { coach: 10, morale: 8, fame: 2 }),
        o(0.3, 'Figura, sí, pero te queda la duda de qué habría pasado.', { coach: 8, morale: -5 })),
    ],
  },
];
