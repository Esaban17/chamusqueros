import type { EventTemplate, Player } from '../types';
import { o, opt, has } from '../helpers';

// Vida sentimental: situaciones de amor, celos y escándalo (specs/vida-sentimental).
// Tono de telenovela futbolera con humor, apto para todo público: coqueteo, citas, celos y escándalos de prensa.
// Nada explícito, nada de violencia (los pleitos son verbales), nada de menores. Toda pareja es adulta y tiene su propia vida.
//
// El estado sentimental vive en las banderas del jugador (ponytail: sin campos nuevos en Player):
// - amor_novia / amor_comprometido / amor_casado: los tres estados con pareja (excluyentes entre sí). Sin ninguna, está soltero.
// - amor_ya_casado: se casó una vez en la carrera (permanente; impide un segundo compromiso o una segunda boda)
// - amor_famosa: la pareja es famosa (siempre junto a una pareja)
// - amor_hija → amor_hija_2 → fin: la hija del técnico (amor_hija_publica cambia el texto y las chances del paso 3)
// - amor_club_<id del club>: el club donde arrancó esa ruta. Los pasos 2 y 3 solo salen en ese club; si el jugador se va, amor_hija_fin la cierra.
// - amor_traicion → amor_companero_2: la pareja de un compañero
// Toda ruptura borra FIN. Ninguna lista de `flag` repite una bandera de su `unflag`.

/** Perilla de frecuencia: multiplica el peso de los eventos de entrada (ver "Frecuencia" del plan). */
export const PESO = 1.7; // ponytail: calibrado con 5.000 carreras; más peso rompe el tope de -2,5 pp de medios (CA-7)

export const PAREJA = ['amor_novia', 'amor_comprometido', 'amor_casado'];
export const RUTAS = ['amor_hija', 'amor_hija_2', 'amor_hija_publica', 'amor_traicion'];
/** Todo lo que termina en una ruptura: vuelve a soltero. */
export const FIN = [...PAREJA, 'amor_famosa'];

/** Peso de un evento que no es paso de ruta. ponytail: el motor trata todo peso numérico >= 3 como ruta, así que el tope es 2,9. */
const peso = (w: number) => Math.min(w * PESO, 2.9);

/** Bandera con el club donde arrancó la ruta de la hija. ponytail: el nombre lleva el id porque las banderas solo valen 1. */
const clubDeRuta = (id: string) => `amor_club_${id}`;
const rutaHija = (p: Player) => has(p, 'amor_hija') || has(p, 'amor_hija_2');

const algun = (p: Player, banderas: string[]) => banderas.some((b) => has(p, b));
export const conPareja = (p: Player) => algun(p, PAREJA);
/** Soltero y sin una historia de conquista abierta: los eventos de entrada solo salen así. */
export const soltero = (p: Player) => !conPareja(p) && !algun(p, RUTAS);
const adulto = (p: Player) => p.age >= 18;

export const AMOR_EVENTS: EventTemplate[] = [
  // ---------- Relación estable ----------
  {
    id: 'amor_cita',
    category: 'amor',
    title: 'Una invitación',
    text: (p, ctx) =>
      `Una diseñadora que conociste en una actividad de ${ctx.club.name} te escribe: "¿Un café esta semana? Tengo dos entradas para el teatro y nadie con quien ir." Es de las que se ríen de tus chistes, incluso de los malos.`,
    when: (p) => adulto(p) && soltero(p) && p.age <= 32,
    weight: peso(1.2),
    cooldown: 6,
    options: () => [
      opt('Acepto la invitación',
        o(0.6, 'Hubo risas, un segundo café y una tercera salida. Ya son novios, y en el vestuario no paran de preguntarte por ella.', { morale: 10, flag: 'amor_novia' }),
        o(0.4, 'Fue una tarde agradable, pero no hubo chispa. Quedaron como amigos y tu ánimo lo agradece.', { morale: 1 })),
      opt('Ahora toca enfocarme en la cancha',
        o(1, 'Le contestaste con cariño que no era el momento. Esa semana entrenaste con la cabeza despejada.', { rating: 1 })),
    ],
  },
  {
    id: 'amor_compromiso',
    category: 'amor',
    title: 'El anillo',
    text: () =>
      'La relación va de maravilla y en las cenas con la familia ya preguntan "¿para cuándo?". Un joyero te guarda un anillo desde hace semanas.',
    when: (p) => adulto(p) && has(p, 'amor_novia') && p.age >= 21 && !has(p, 'amor_ya_casado'),
    weight: 3, // paso de ruta: sin él, un noviazgo casi nunca llegaba al compromiso (1 de cada 3)
    cooldown: 6,
    options: () => [
      opt('Pedirle matrimonio',
        o(0.8, 'Dijo que sí entre lágrimas, con todo el restaurante aplaudiendo. Hay anillo, y ahora hay que planear una boda.', { morale: 10, flag: 'amor_comprometido', unflag: 'amor_novia', milestone: 'Se comprometió' }),
        o(0.2, 'Te contestó que te quiere, pero que necesita tiempo. El anillo volvió al bolsillo y tu ánimo, al suelo.', { morale: -4 })),
      opt('Esperar un poco más',
        o(0.7, 'Todo siguió igual: series, cenas y planes. Nadie se quejó, por ahora.', { morale: 1 }),
        o(0.3, 'Sintió que la relación no avanzaba y decidió terminarla. Lo hablaron con respeto, pero duele.', { morale: -12, unflag: FIN })),
    ],
  },
  {
    id: 'amor_boda',
    category: 'amor',
    title: 'El gran día',
    text: () => 'Ya hay fecha. Falta decidir cómo será la boda, y la lista de invitados ya incluye a medio plantel, al utilero y hasta al señor de la cafetería.',
    when: (p) => adulto(p) && has(p, 'amor_comprometido') && !has(p, 'amor_ya_casado'),
    weight: 3, // paso de ruta: depende solo del estado
    options: () => [
      opt('Boda grande, con todo el plantel',
        o(0.8, 'Salón lleno, baile hasta tarde y el técnico bailando mejor que vos. La boda salió en las revistas.', { morale: 14, fame: 4, flag: ['amor_casado', 'amor_ya_casado'], unflag: 'amor_comprometido', milestone: 'Se casó' }),
        o(0.2, 'Se cayó el sonido en pleno baile y el plantel improvisó una coreografía que ya circula en redes. Aun así, se casaron felices.', { morale: 12, fame: 6, flag: ['amor_casado', 'amor_ya_casado'], unflag: 'amor_comprometido', milestone: 'Se casó' })),
      opt('Boda íntima, solo familia',
        o(1, 'Veinte invitados, un jardín y cero cámaras. Fue justo lo que querían, y tu ánimo no cabe en el pecho.', { morale: 12, flag: ['amor_casado', 'amor_ya_casado'], unflag: 'amor_comprometido', milestone: 'Se casó' })),
    ],
  },
  {
    id: 'amor_crisis',
    category: 'amor',
    title: 'Crisis de pareja',
    text: () => 'Las concentraciones, los viajes y tus horarios están pesando. Una noche, tu pareja te dice con voz tranquila: "Tenemos que hablar".',
    when: (p) => adulto(p) && (has(p, 'amor_novia') || has(p, 'amor_comprometido')),
    weight: peso(1.4),
    cooldown: 8,
    options: () => [
      opt('Hablar y escucharla de verdad',
        o(0.65, 'Hablaron hasta tarde, pusieron límites y aprendieron a comunicarse mejor. La relación salió reforzada.', { morale: 4 }),
        o(0.35, 'La conversación fue larga y honesta: no querían lo mismo. Se separaron con cariño y tu ánimo se resiente.', { morale: -14, rating: -1, unflag: FIN })),
      opt('Darle espacio',
        o(0.5, 'El espacio les sirvió a los dos y la relación volvió a respirar.', { morale: 2 }),
        o(0.5, 'El espacio se volvió distancia y ya no hubo marcha atrás. Quedaron en buenos términos, pero con un hueco en el pecho.', { morale: -12, unflag: FIN })),
    ],
  },

  // ---------- La hija del entrenador ----------
  {
    id: 'amor_hija_1',
    category: 'amor',
    title: 'La hija del técnico',
    text: (p, ctx) =>
      `Te cruzás seguido con la hija del técnico de ${ctx.club.name}. Es adulta, trabaja en el área de prensa del club y tiene un humor que te desarma. Hoy se rieron un rato en el pasillo del estadio. Invitarla a salir sería lindo… y arriesgado: su papá es quien decide quién juega.`,
    when: (p) => adulto(p) && soltero(p) && p.age >= 19 && p.age <= 31,
    weight: peso(0.8),
    once: true,
    options: (p, ctx) => [
      opt('Invitarla a salir',
        o(0.85, 'Lo pensó un segundo, sonrió y dijo que sí, con una condición: "mi papá todavía no se entera". Desde entonces las miradas en el entreno son de cómplices.', { morale: 6, flag: ['amor_hija', clubDeRuta(ctx.club.id)] }),
        o(0.15, 'Te contestó con amabilidad que prefería no mezclar el trabajo con su vida personal. Lo respetaste y quedaron en buenos términos.', { morale: -3 })),
      opt('Mantener la distancia profesional',
        o(1, 'Decidiste que el vestuario y la familia del técnico no se mezclan. El profe notó tu seriedad y te lo agradeció en silencio.', { coach: 4, morale: 1 })),
    ],
  },
  {
    id: 'amor_hija_2',
    category: 'amor',
    title: 'Salidas con testigos',
    text: () =>
      'Llevan unas semanas saliendo y la cosa va en serio. Ella te dice: "No quiero esconderme para siempre". Mientras tanto, el técnico te mira raro en los entrenos, como si ya sospechara algo.',
    when: (p, ctx) => adulto(p) && has(p, 'amor_hija') && has(p, clubDeRuta(ctx.club.id)),
    weight: 3,
    once: true,
    options: (p, ctx) => [
      opt('Seguir viéndonos a escondidas',
        o(1, 'Siguieron viéndose en cafés lejos del estadio. Te sentís protagonista de una serie de espías, y te encanta. Solo falta saber cuánto dura el secreto.', { morale: 3, flag: 'amor_hija_2', unflag: 'amor_hija' })),
      opt('Hacerlo público',
        o(1, 'Subieron una foto juntos y el vestuario enloqueció. Ahora lo sabe todo el club, incluido el técnico, que todavía no dice nada.', { morale: 4, fame: 2, flag: ['amor_hija_2', 'amor_hija_publica'], unflag: 'amor_hija' })),
      opt('Terminarlo antes de que se complique',
        o(1, 'Lo hablaron con sinceridad: no valía el riesgo. Quedaron en buenos términos y nadie salió herido.', { morale: -4, unflag: ['amor_hija', clubDeRuta(ctx.club.id)] })),
    ],
  },
  {
    id: 'amor_hija_3',
    category: 'amor',
    title: 'El técnico se entera',
    text: (p) =>
      has(p, 'amor_hija_publica')
        ? 'Con la relación a la vista de todos, el técnico te llama a su oficina. Cierra la puerta, se sienta frente a vos y te mira en silencio durante un buen rato.'
        : 'Alguien del club los vio juntos y fue con el cuento al técnico. Te llama a su oficina, cierra la puerta, se sienta frente a vos y te mira en silencio durante un buen rato.',
    when: (p, ctx) => adulto(p) && has(p, 'amor_hija_2') && has(p, clubDeRuta(ctx.club.id)),
    weight: 3,
    once: true,
    options: (p, ctx) => {
      const publica = has(p, 'amor_hija_publica');
      const fin = ['amor_hija_2', 'amor_hija_publica', clubDeRuta(ctx.club.id)];
      return [
        opt('Dar la cara y hablarle con respeto',
          o(publica ? 0.7 : 0.55, 'El técnico respiró hondo y dijo: "Lo que más me importa es que ella esté bien. Cuidala". Terminó invitándote a comer a su casa.', { coach: 10, morale: 8, flag: 'amor_novia', unflag: fin }),
          o(publica ? 0.3 : 0.45, 'El técnico no se tomó bien la noticia y te dijo que lo profesional y lo personal no se mezclan. Los entrenos se volvieron fríos y los saludos, de una palabra.', { coach: -14, morale: -6, unflag: fin })),
        opt('Negarlo todo',
          o(0.3, 'El técnico no preguntó más. Quedaron en no verse para no tentar la suerte y el asunto murió ahí.', { morale: -2, unflag: fin }),
          o(0.7, 'No coló. Entre una mentira y una verdad, el técnico se quedó con lo peor de las dos y se lo contó a todo el cuerpo técnico. En la prensa ya hay rumores.', { coach: -16, morale: -10, fame: -3, unflag: fin })),
        opt('Dejar que ella hable con su papá',
          o(0.4, 'Ella habló con él con la calma de una persona adulta que decide con quién sale. Gracias a ella, el técnico te dio una oportunidad.', { coach: 8, morale: 6, flag: 'amor_novia', unflag: fin }),
          o(0.6, 'Su papá respetó la decisión de ella, pero dijo que "las cosas se dicen de frente" y no por intermediarios. Ella y vos decidieron dejarlo ahí.', { coach: -12, morale: -6, unflag: fin })),
      ];
    },
  },

  {
    id: 'amor_hija_fin',
    category: 'amor',
    title: 'Cada quien por su lado',
    text: () =>
      'Con el cambio de club, lo tuyo con la hija de tu ex técnico se fue enfriando. Ella tiene su trabajo y su propia vida, los mensajes se espaciaron y las visitas, también.',
    // La ruta sigue abierta pero el jugador ya no está en el club donde empezó (RF-16).
    when: (p, ctx) => adulto(p) && rutaHija(p) && !has(p, clubDeRuta(ctx.club.id)),
    weight: 3,
    once: true,
    options: (p) => {
      const fin = ['amor_hija', 'amor_hija_2', 'amor_hija_publica', ...Object.keys(p.flags).filter((f) => f.startsWith('amor_club_'))];
      return [
        opt('Escribirle con cariño y cerrar el capítulo',
          o(1, 'Le escribiste con sinceridad y ella te contestó con una sonrisa y buenos deseos. Quedó un recuerdo bonito y ningún rencor.', { morale: -2, unflag: fin })),
        opt('Dejar que el tiempo haga lo suyo',
          o(1, 'No hubo drama ni despedidas: un día dejaron de escribirse y quedó el buen recuerdo.', { morale: -1, unflag: fin })),
      ];
    },
  },

  // ---------- La pareja de un compañero ----------
  {
    id: 'amor_companero_1',
    category: 'amor',
    title: 'La pareja de un compañero',
    text: () =>
      'En la cena de fin de mes del plantel, la pareja de un compañero, una abogada simpática, se sienta a tu lado. La charla se pone cada vez más coqueta y ella suelta: "Con él no estamos en nuestro mejor momento". Al otro lado de la mesa, tu compañero se ríe de un chiste y no sospecha nada.',
    when: (p) => adulto(p) && soltero(p) && p.age >= 19 && p.age <= 31,
    weight: peso(0.8),
    once: true,
    options: () => [
      opt('Cortar la charla con respeto',
        o(1, 'Cambiaste de tema con una sonrisa y pasaron la noche hablando del partido del domingo. Tu compañero no supo nada, pero en el vestuario se nota que sos de fiar.', { morale: 6, coach: 3 })),
      opt('Seguirle la corriente',
        o(1, 'La charla se alargó, se pasaron los números y te fuiste sonriendo… con un cosquilleo de que esto va a salir caro.', { morale: 2, flag: 'amor_traicion' })),
    ],
  },
  {
    id: 'amor_companero_2',
    category: 'amor',
    title: 'Tu compañero se entera',
    text: () =>
      'Alguien vio los mensajes y en el vestuario ya corre el rumor. Tu compañero te espera junto al casillero, con los brazos cruzados y la mirada fija en el piso. Todos fingen amarrarse los tacos.',
    when: (p) => adulto(p) && has(p, 'amor_traicion'),
    weight: 3,
    once: true,
    options: () => [
      opt('Dar la cara y pedir disculpas',
        o(0.75, 'Hubo una discusión larga y tensa, de esas con silencios en los que se oye el ventilador. El técnico los citó a una reunión del grupo y nadie te saluda por unos días.', { coach: -6, morale: -8, unflag: 'amor_traicion' }),
        o(0.25, 'Tu compañero aceptó las disculpas, pero el club decidió que el vestuario no daba para los dos y te buscó una salida.', { transfer: 'any', morale: -6, unflag: 'amor_traicion' })),
      opt('Negarlo todo',
        o(0.5, 'Los mensajes llegaron a la prensa y tu desmentido duró un día. Fue tema en todos los programas de chismes y el club cortó por lo sano.', { fame: -6, morale: -10, transfer: 'any', unflag: 'amor_traicion' }),
        o(0.5, 'Te creyeron a medias. Nadie dice nada, pero te miran con duda en cada pase y en cada broma.', { coach: -3, morale: -4, unflag: 'amor_traicion' })),
      opt('Pedirle al técnico que medie',
        o(0.75, 'El técnico los sentó a los dos y les dio un sermón de media hora sobre el respeto. La tensión sigue, aunque el clima es más civilizado.', { coach: -6, morale: -6, unflag: 'amor_traicion' }),
        o(0.25, 'El técnico pensó en el bien del grupo y concluyó que un cambio de aire te vendría bien. Te lo dijo con mucho tacto.', { transfer: 'any', morale: -6, unflag: 'amor_traicion' })),
    ],
  },

  // ---------- Famosa o influencer ----------
  {
    id: 'amor_famosa_1',
    category: 'amor',
    title: 'Un mensaje directo',
    text: () =>
      'Una conductora de televisión con millones de seguidores comentó tus jugadas en su programa y hoy te escribió por mensaje directo: "¿Un café? Me gustan tus jugadas y me da curiosidad conocerte fuera de la cancha".',
    when: (p) => adulto(p) && soltero(p) && p.fame >= 20 && p.age >= 19 && p.age <= 32,
    weight: (p) => peso(p.fame >= 40 ? 1.5 : 0.7),
    once: true,
    options: () => [
      opt('Aceptar el café',
        o(0.5, 'La salida apareció en todos los portales. Tu fama se disparó, y tu sueño, también: entre fotos y entrevistas llegás cansado a los entrenos.', { fame: 10, morale: 6, fitness: -6, flag: ['amor_novia', 'amor_famosa'] }),
        o(0.5, 'Pasaron semanas en las que mirabas más el celular que la pelota. La relación va en serio y vos, algo distraído.', { fame: 8, morale: 6, rating: -1, flag: ['amor_novia', 'amor_famosa'] })),
      opt('Rechazar con una sonrisa',
        o(1, 'Le agradeciste y le dijiste que no era el momento. Ella respondió con un emoji de aplauso y todo quedó en buena onda.', { morale: 2 })),
    ],
  },
  {
    id: 'amor_famosa_2',
    category: 'amor',
    title: 'Los paparazzi',
    text: () =>
      'Desde que se supo de la relación, un par de fotógrafos acampan frente a tu casa y en la tele debaten cuánto van a durar. Tu pareja te pregunta cómo querés manejarlo.',
    when: (p) => adulto(p) && has(p, 'amor_famosa'),
    weight: 3,
    once: true,
    options: () => [
      opt('Posar para las cámaras',
        o(1, 'Salieron en la portada de una revista de farándula, sonrientes y bien vestidos. Tu fama sube y tu pareja se ríe de lo bien que te salió la pose.', { fame: 6, morale: 4 })),
      opt('Pedir privacidad',
        o(1, 'Los fotógrafos respetaron el pedido más o menos. La noticia se enfrió y la relación se tranquilizó.', { fame: 1, morale: 2 })),
      opt('Terminar la relación',
        o(1, 'Lo hablaron con calma: dos agendas famosas eran demasiado para una sola relación. Terminaron con un comunicado muy educado.', { morale: -8, unflag: FIN })),
    ],
  },

  // ---------- Pareja y carrera ----------
  {
    id: 'amor_distancia',
    category: 'amor',
    title: 'Un océano de por medio',
    text: (p, ctx) =>
      `Jugar en ${ctx.club.city} es un sueño, pero tu pareja sigue en ${ctx.country.name} con su trabajo, su familia y sus planes. Las videollamadas ya no alcanzan y el cambio de horario hace el resto.`,
    when: (p, ctx) => adulto(p) && conPareja(p) && ctx.abroad,
    weight: 3, // paso de ruta: con pareja y jugando afuera es de lo primero que pasa
    once: true,
    options: () => [
      opt('Que se venga conmigo',
        o(1, 'Ella consiguió trabajo remoto, armó las maletas y se mudó con vos. La casa volvió a sentirse como casa. Eso sí, ahora tenés que aprender a cocinar.', { morale: 8 })),
      opt('Mantener la larga distancia',
        o(0.5, 'Fueron semanas de videollamadas y visitas relámpago. Se extrañan, pero la relación aguanta.', { morale: -2 }),
        o(0.5, 'Los horarios y los viajes pudieron más. Terminaron con cariño y tu ánimo quedó en el piso.', { morale: -8, unflag: FIN })),
      opt('Terminar la relación',
        o(1, 'Lo hablaron con sinceridad: cada uno tiene su camino. Terminaron con respeto, aunque la casa se siente más vacía.', { morale: -8, unflag: FIN })),
    ],
  },
  {
    id: 'amor_foto',
    category: 'amor',
    title: 'La tentación',
    text: () =>
      'Alguien del mundo de la farándula te escribe fuera de horario: "¿Cenamos esta semana? Prometo discreción". Sabés bien que si alguien los ve juntos, la foto va a volar por todas las redes.',
    when: (p) => adulto(p) && conPareja(p) && p.fame >= 15 && p.age >= 19,
    weight: peso(2),
    cooldown: 8,
    options: () => [
      opt('Resistir y contárselo a mi pareja',
        o(1, 'Borraste el mensaje, se lo contaste a tu pareja y terminaron riéndose del intento. Tu conciencia y tu ánimo están tranquilos.', { morale: 5 })),
      opt('Ceder a la tentación',
        o(0.55, 'La foto se filtró antes del amanecer. Tu pareja la vio en redes antes que vos. La relación terminó y los programas de chismes no te perdonaron.', { fame: -5, morale: -14, unflag: FIN }),
        o(0.45, 'Nadie los vio, pero la culpa te acompaña: dormís mal y tu pareja lo nota.', { morale: -4 })),
    ],
  },
];
