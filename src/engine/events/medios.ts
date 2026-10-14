import type { EventContext, EventTemplate, Player } from '../types';
import { o, opt, has, rivalOf, lastSeasonLine, de, a } from '../helpers';
import { countryOf } from '../countries';

// Banderas que usa este archivo:
// - med_arbitro: criticaste al árbitro en público → med_multa (multa de la Comisión Disciplinaria)
// - med_directiva: criticaste a la directiva o al cuerpo técnico → med_reunion (reconciliación o ruptura)
// - med_msj_sele: le mandaste un mensaje al técnico de la Selección → med_resp_sele (te responde)
// - med_picado: provocaste al rival de clásico → med_clasico_caliente (el clásico se juega con fuego)
// - med_stream: hiciste transmisión con un streamer → med_canal (abrís tu propio canal)
// - med_viral: un video tuyo se hizo viral en redes → med_disculpa (te piden aclarar o seguir)

/** Temporada muy buena: muchos goles, títulos o (porteros) muchos partidos. */
const goodSeason = (p: Player, ctx: EventContext) => {
  const l = ctx.last;
  if (!l) return false;
  if (l.titles.length > 0) return true;
  if (p.setup.position === 'POR' || p.setup.position === 'DEF') return l.apps >= 30 && l.rating >= 70;
  return l.goals >= (p.setup.position === 'DEL' ? 12 : 8);
};

/** Temporada muy mala: casi no jugó, se lesionó o no la metió. */
const badSeason = (p: Player, ctx: EventContext) => {
  const l = ctx.last;
  if (!l) return false;
  if (l.injured || l.apps < 12) return true;
  return p.setup.position === 'DEL' && l.apps >= 15 && l.goals <= 2;
};

/** Pesa más si la última temporada fue extrema (muy buena o muy mala). */
const swing = (p: Player, ctx: EventContext) => (goodSeason(p, ctx) || badSeason(p, ctx) ? 2 : 1);

export const MEDIOS_EVENTS: EventTemplate[] = [
  // ---------- Después de una gran temporada ----------
  {
    id: 'med_gol_grande',
    category: 'medios',
    title: 'Micrófono a pie de cancha',
    text: (p, ctx) =>
      `Llevás ${lastSeasonLine(p, ctx)} y hoy volviste a marcar con ${ctx.club.name}. El reportero de cancha te pone el micrófono: "¿A quién le dedicás el gol?"`,
    when: (p, ctx) => goodSeason(p, ctx) && p.setup.position !== 'POR' && (ctx.last?.goals ?? 0) > 0,
    weight: 2.5,
    cooldown: 5,
    options: (p) => [
      opt('A Dios y a mi familia',
        o(0.8, 'Tu mamá lloró viéndote en la tele. Respuesta de manual que a todos les cae bien.', { morale: 6, fame: 3 }),
        o(0.2, 'Te salió tan repetida que en redes hicieron memes de "la dedicatoria de siempre".', { morale: 2, fame: 1 })),
      opt('Al profe de la Selección, que vea',
        o(0.5, 'La frase abrió todos los noticieros. Ahora todos esperan la convocatoria.', { fame: 10, flag: 'med_msj_sele' }),
        o(0.5, 'Tu técnico dice que primero pensés en el club. Te sentó el siguiente partido.', { fame: 5, coach: -6, flag: 'med_msj_sele' })),
      opt(p.age <= 23 ? 'A mi novia… y a la otra' : 'A los que dijeron que ya no daba',
        o(0.5, 'Carcajada general. El clip se compartió por todo el país.', { fame: 9, morale: 4 }),
        o(0.5, 'No a todos les dio risa. En tu casa hubo plática seria esa noche.', { fame: 6, morale: -6 })),
    ],
  },
  {
    id: 'med_portada',
    category: 'medios',
    title: 'Portada del diario',
    text: (p, ctx) =>
      `Un diario capitalino quiere sacarte en portada tras ${lastSeasonLine(p, ctx)}. Piden sesión de fotos el jueves, día de entreno doble.`,
    when: (p, ctx) => goodSeason(p, ctx) && !ctx.abroad && ctx.tier <= 2,
    weight: 1.5,
    cooldown: 6,
    options: () => [
      opt('Hago la sesión y llego tarde',
        o(0.6, 'Saliste chilero en la portada. El profe te puso a correr extra, nada más.', { fame: 10, coach: -4 }),
        o(0.4, 'La foto salió bien, pero te quedaste fuera de la convocatoria del fin.', { fame: 8, coach: -8, morale: -3 })),
      opt('Pido cambiarla para el lunes',
        o(0.7, 'Aceptaron. Saliste en página interior, pero bien parado con el técnico.', { fame: 4, coach: 3 }),
        o(0.3, 'Le dieron la portada a otro jugador. Ni modo.', { fame: 1, morale: -3 })),
    ],
  },
  // ---------- Mala racha ----------
  {
    id: 'med_mala_racha',
    category: 'medios',
    title: '"¿Se te olvidó jugar?"',
    text: (p, ctx) =>
      `Tras ${lastSeasonLine(p, ctx)}, un periodista te encara al salir del entreno: "La afición dice que ya no sos el mismo. ¿Qué te pasa?"`,
    when: (p, ctx) => badSeason(p, ctx) && p.fame >= 8,
    weight: 2.5,
    cooldown: 5,
    options: () => [
      opt('Acepto que no estoy bien',
        o(0.7, 'La humildad cayó bien. La afición te dio otra oportunidad.', { morale: 4, fame: 2, coach: 3 }),
        o(0.3, 'Te tomaron la palabra: "Ni él cree en sí mismo", tituló un diario.', { morale: -6, fame: -2 })),
      opt('La culpa es de la directiva',
        o(0.4, 'Varios compañeros te dieron la razón en privado. La directiva no.', { morale: 4, coach: -8, fame: 5, flag: 'med_directiva' }),
        o(0.6, 'El presidente del club te llamó a su oficina. Esto se puso feo.', { coach: -12, morale: -4, flag: 'med_directiva' })),
      opt('"Estaba de vacaciones, ya volví"',
        o(0.5, 'La broma desarmó al periodista. Hasta él se rió.', { fame: 4, morale: 3 }),
        o(0.5, 'En redes no les dio gracia: "Con razón juega así".', { fame: -3, morale: -5 })),
    ],
  },
  {
    id: 'med_lesion_reportaje',
    category: 'medios',
    title: 'Reportaje de la lesión',
    text: () =>
      'Un noticiero quiere grabar tu recuperación de la lesión: la terapia, los ejercicios, tu familia. "Que la gente vea que no te rendís", te dicen.',
    when: (p, ctx) => !!ctx.last?.injured && p.fame >= 10,
    weight: 2,
    cooldown: 8,
    options: () => [
      opt('Dejo que graben todo',
        o(0.7, 'El reportaje conmovió al país. Te llegaron mensajes de ánimo hasta de rivales.', { fame: 8, morale: 8 }),
        o(0.3, 'Te grabaron en tu peor día. Verte llorar en tele te bajoneó.', { fame: 6, morale: -5 })),
      opt('Prefiero recuperarme en silencio',
        o(0.8, 'Sin cámaras te concentraste. Volviste más fuerte.', { fitness: 6, morale: 2 }),
        o(0.2, 'Dijeron que te estabas escondiendo. Rumores de que ya no volvías.', { fame: -3, morale: -3 })),
    ],
  },
  // ---------- Rumores de traspaso ----------
  {
    id: 'med_rumor',
    category: 'medios',
    title: 'El rumor del fichaje',
    text: (p, ctx) =>
      `Un programa deportivo asegura que ${ctx.suitor?.name ?? 'otro club'} ya habló con tu representante. Te preguntan en vivo: "¿Es cierto?"`,
    when: (p, ctx) => !!ctx.suitor && ctx.suitor.id !== ctx.club.id,
    weight: (p, ctx) => swing(p, ctx) + 0.5,
    cooldown: 5,
    options: (p, ctx) => [
      opt(`Solo pienso en ${ctx.club.short}`,
        o(0.8, 'La afición te aplaudió el gesto y el técnico te dio una palmada.', { coach: 5, morale: 3 }),
        o(0.2, 'El otro club se enfrió con la respuesta. Se fue la oferta.', { coach: 4, morale: -4 })),
      opt('Sería un sueño, no lo niego',
        o(0.3, `La frase aceleró todo: ${ctx.suitor?.name ?? 'el club'} hizo la oferta formal y se dio.`, { transfer: 'suitor', fame: 6, morale: 6 }),
        o(0.7, 'No se dio el fichaje y en tu club te ven como traidor.', { coach: -10, morale: -5, fame: 4 })),
      opt('Eso lo ve mi representante',
        o(0.9, 'Respuesta fría pero segura. Nadie se enojó.', { fame: 1 }),
        o(0.1, 'Te acusaron de estar negociando a escondidas. Silbidos el domingo.', { morale: -4 })),
    ],
  },
  // ---------- Antes de la final ----------
  {
    id: 'med_conf_final',
    category: 'medios',
    title: 'Conferencia antes de la final',
    text: (p, ctx) =>
      `${ctx.club.name} juega la final el domingo. Te sientan en la conferencia de prensa: "¿Qué le decís a la afición? ¿Promesa de gol?"`,
    when: (p, ctx) => ctx.club.prestige >= 60 && p.rating >= 60 && p.fame >= 12,
    weight: (p, ctx) => swing(p, ctx),
    cooldown: 6,
    options: (p) => [
      opt(p.setup.position === 'POR' ? 'Prometo cero goles en contra' : 'Prometo gol, que lo anoten',
        o(0.45, 'Cumpliste la promesa y la foto dio la vuelta al país.', { fame: 14, morale: 10, milestone: 'Promesa cumplida en la final' }),
        o(0.55, 'No cumpliste y perdieron. Tu frase la repitieron toda la semana.', { fame: 3, morale: -10 })),
      opt('Respeto total al rival',
        o(0.75, 'Discurso sereno. El técnico te felicitó por el liderazgo.', { coach: 6, fame: 3 }),
        o(0.25, 'Te tildaron de aguado. "Así no se gana una final", dijeron.', { fame: -2, morale: -2 })),
      opt('Dedico la final a mi pueblo',
        o(0.8, 'En tu pueblo pusieron pantalla gigante en el parque central.', { morale: 8, fame: 4 }),
        o(0.2, 'Los aficionados capitalinos se sintieron fuera. Algunos reclamos.', { morale: 3, fame: 1 })),
    ],
  },
  // ---------- Radio, podcast, streamer ----------
  {
    id: 'med_radio',
    category: 'medios',
    title: 'Radio a las seis de la mañana',
    text: () =>
      'Un programa deportivo de radio te invita a la tertulia matutina. Es a las 6 en punto, en vivo, y tenés entreno a las 8.',
    when: (p, ctx) => !ctx.abroad && ctx.tier <= 2 && p.fame >= 5,
    weight: (p, ctx) => swing(p, ctx),
    cooldown: 6,
    options: () => [
      opt('Voy y hablo de todo',
        o(0.6, 'Te pusiste a contar anécdotas del vestuario y la audiencia se rió.', { fame: 6, morale: 3 }),
        o(0.4, 'Contaste de más. Un compañero te reclamó lo que dijiste al aire.', { fame: 5, coach: -5, morale: -3 })),
      opt('Voy, pero con respuestas cortas',
        o(0.8, 'Entrevista correcta. Llegaste puntual al entreno.', { fame: 3, fitness: -4 }),
        o(0.2, 'El locutor dijo al aire que eras "más aburrido que un martes".', { fame: 1, morale: -3 })),
      opt('Prefiero dormir',
        o(1, 'Dormiste tus horas. Entrenaste como reloj.', { fitness: 5, coach: 2 })),
    ],
  },
  {
    id: 'med_podcast',
    category: 'medios',
    title: 'Dos horas de podcast',
    text: () =>
      'Un podcast de fútbol muy escuchado te invita a una charla larga, sin cortes. "Aquí se habla de todo, mano", te advierte el anfitrión.',
    when: (p) => p.fame >= 15 && p.age >= 20,
    weight: (p, ctx) => swing(p, ctx),
    cooldown: 7,
    options: () => [
      opt('Hablo de mi historia y mis raíces',
        o(0.75, 'Contaste de dónde venís y cómo empezaste. Muchos te conocieron de verdad.', { fame: 8, morale: 6 }),
        o(0.25, 'Pocos lo vieron completo, pero los que lo vieron te quieren más.', { fame: 3, morale: 4 })),
      opt('Cuento los chismes del vestuario',
        o(0.4, 'El episodio reventó en vistas. En el vestuario, nadie te saluda.', { fame: 12, coach: -10, morale: -4 }),
        o(0.6, 'El técnico se enteró de lo que contaste. Banca y regaño.', { fame: 8, coach: -14 })),
    ],
  },
  {
    id: 'med_streamer',
    category: 'medios',
    title: 'Invitado del streamer',
    text: () =>
      'Un streamer famoso te invita a jugar en vivo un videojuego de fútbol contra él. Medio país joven lo ve cada noche.',
    when: (p) => p.age <= 30 && p.fame >= 10,
    weight: (p, ctx) => swing(p, ctx),
    cooldown: 8,
    options: () => [
      opt('Acepto y me desvelo jugando',
        o(0.6, 'Le ganaste 3-1 y el chat explotó. Ahora los patojos te siguen.', { fame: 9, fitness: -5, flag: 'med_stream' }),
        o(0.4, 'Te goleó 5-0 en vivo. Te van a recordar por eso un buen rato.', { fame: 6, morale: -4, fitness: -5, flag: 'med_stream' })),
      opt('Solo un rato antes de cenar',
        o(0.85, 'Media hora de risas. Te fuiste temprano a descansar.', { fame: 3 }),
        o(0.15, 'El streamer se quejó de que te fuiste rápido. Un poco de burla.', { fame: 1, morale: -2 })),
    ],
  },
  {
    id: 'med_canal',
    category: 'medios',
    title: 'Tu propio canal',
    text: () =>
      'Después de tu paso por el stream, te escriben a diario: "¡Abrí tu canal!". Tu primo dice que él te edita los videos.',
    when: (p) => has(p, 'med_stream') && p.age <= 31,
    weight: 3,
    once: true,
    options: () => [
      opt('Abro el canal con mi primo',
        o(0.55, 'Los videos del día a día de un futbolista pegaron. Pisto extra y fama.', { fame: 10, morale: 5, fitness: -4, unflag: 'med_stream' }),
        o(0.45, 'El técnico te vio grabando en el bus y te llamó la atención.', { fame: 5, coach: -8, unflag: 'med_stream' })),
      opt('Me enfoco solo en el fútbol',
        o(0.9, 'Tu primo se quedó con las ganas, pero vos con la cabeza en lo tuyo.', { coach: 3, unflag: 'med_stream' }),
        o(0.1, 'Tu primo abrió el canal igual, hablando de vos. Ni modo.', { fame: 2, morale: -2, unflag: 'med_stream' })),
    ],
  },
  // ---------- Redes sociales ----------
  {
    id: 'med_viral',
    category: 'medios',
    title: 'Polémica en redes',
    text: () =>
      'Circula un video tuyo bailando en una fiesta la noche antes de un partido que perdieron. Ya es tendencia y los comentarios no perdonan.',
    when: (p) => p.age <= 32 && p.fame >= 10,
    weight: (p, ctx) => (badSeason(p, ctx) ? 2 : 0.8),
    cooldown: 8,
    options: () => [
      opt('Pido disculpas públicas',
        o(0.7, 'El mensaje fue sincero y la ola se calmó en dos días.', { fame: -2, coach: 3 }),
        o(0.3, 'Te dijeron que te disculpabas porque te cacharon. Igual pasó.', { fame: -4, morale: -3 })),
      opt('Contesto que el video es viejo',
        o(0.4, 'Era cierto: el video era de vacaciones. Ganaste la discusión.', { fame: 6, morale: 5 }),
        o(0.6, 'Alguien publicó la fecha exacta. Se armó otra vez.', { fame: -6, coach: -6, flag: 'med_viral' })),
      opt('No digo nada y entreno',
        o(1, 'La tormenta pasó sola, aunque te dejó un par de apodos.', { morale: -4 })),
    ],
  },
  {
    id: 'med_disculpa',
    category: 'medios',
    title: 'La directiva pide aclarar',
    text: (p, ctx) =>
      `La directiva de ${ctx.club.name} no quedó contenta con la polémica del video. Te piden un comunicado oficial y una multa simbólica.`,
    when: (p) => has(p, 'med_viral'),
    weight: 3.5,
    options: () => [
      opt('Firmo el comunicado y pago',
        o(0.85, 'Asunto cerrado. El técnico valoró que dieras la cara.', { coach: 6, morale: -3, unflag: 'med_viral' }),
        o(0.15, 'Te criticaron por leer un texto "escrito por abogados". Ya pasará.', { coach: 4, fame: -2, unflag: 'med_viral' })),
      opt('No pido perdón por divertirme',
        o(0.35, 'Muchos aficionados te respaldaron. La directiva se tragó el enojo.', { fame: 6, coach: -6, unflag: 'med_viral' }),
        o(0.65, 'Te mandaron a entrenar aparte dos semanas.', { coach: -14, morale: -6, unflag: 'med_viral' })),
    ],
  },
  // ---------- Árbitros y consecuencias ----------
  {
    id: 'med_arbitraje',
    category: 'medios',
    title: '"¿Y el arbitraje?"',
    text: (p, ctx) =>
      `${ctx.club.name} perdió con un penal dudoso en el último minuto. Bajás del bus y te rodean las cámaras: "¿Qué opinás del arbitraje?"`,
    when: (p, ctx) => !ctx.abroad && p.fame >= 5,
    weight: (p, ctx) => swing(p, ctx) * 0.8,
    cooldown: 6,
    options: () => [
      opt('Digo lo que pienso del árbitro',
        o(0.5, 'La afición te hizo héroe. La Comisión Disciplinaria tomó nota.', { fame: 8, morale: 5, flag: 'med_arbitro' }),
        o(0.5, 'Se te fue la lengua. Tu frase ya circula y te van a citar.', { fame: 5, morale: -2, flag: 'med_arbitro' })),
      opt('De árbitros no hablo',
        o(0.9, 'Respuesta profesional. Nadie te va a multar por eso.', { coach: 2 }),
        o(0.1, 'Algunos aficionados dijeron que te faltó carácter.', { fame: -1 })),
      opt('"Le regalo unos lentes"',
        o(0.5, 'La broma fue tendencia y nadie pudo sancionarte por eso.', { fame: 6, morale: 3 }),
        o(0.5, 'Te tomaron la broma como ofensa. Hay expediente abierto.', { fame: 5, flag: 'med_arbitro' })),
    ],
  },
  {
    id: 'med_multa',
    category: 'medios',
    title: 'Citado por Disciplinaria',
    text: () =>
      'La Comisión Disciplinaria te cita por tus declaraciones sobre el árbitro. Te ofrecen reducir la sanción si te retractás públicamente.',
    when: (p) => has(p, 'med_arbitro'),
    weight: 4,
    options: () => [
      opt('Me retracto y pago la multa',
        o(0.8, 'Solo pagaste la multa. Te dolió el bolsillo, pero jugás el domingo.', { morale: -4, coach: 3, unflag: 'med_arbitro' }),
        o(0.2, 'La afición te reclamó la retractación: "Se arrugó".', { morale: -4, fame: -4, unflag: 'med_arbitro' })),
      opt('Sostengo lo que dije',
        o(0.3, 'Te bajaron la sanción a una amonestación. Saliste reforzado.', { fame: 8, morale: 6, unflag: 'med_arbitro' }),
        o(0.7, 'Tres partidos de suspensión. El técnico tuvo que buscar reemplazo.', { coach: -10, morale: -8, fame: 3, unflag: 'med_arbitro' })),
    ],
  },
  {
    id: 'med_reunion',
    category: 'medios',
    title: 'Llamado a la oficina',
    text: (p, ctx) =>
      `El presidente de ${ctx.club.name} y el técnico te esperan en la oficina después de tus declaraciones. "Esto se arregla aquí o se arregla afuera", te dicen.`,
    when: (p) => has(p, 'med_directiva'),
    weight: 4,
    options: () => [
      opt('Pido disculpas y me comprometo',
        o(0.75, 'Se dieron la mano. Volviste a la titular la siguiente fecha.', { coach: 10, morale: 3, unflag: 'med_directiva' }),
        o(0.25, 'Te perdonaron de palabra, pero el ambiente quedó frío.', { coach: 4, morale: -3, unflag: 'med_directiva' })),
      opt('Mantengo lo dicho',
        o(0.35, 'Te respetaron la franqueza y corrigieron lo que reclamabas.', { coach: 5, morale: 8, fame: 4, unflag: 'med_directiva' }),
        o(0.65, 'Te pusieron transferible. Te vas a otro club.', { transfer: 'any', morale: -8, unflag: 'med_directiva' })),
    ],
  },
  // ---------- Pueblo y extranjero ----------
  {
    id: 'med_pueblo',
    category: 'medios',
    title: 'De vuelta en el pueblo',
    text: (p) =>
      `Volvés a ${p.setup.dept} en vacaciones y el cable local quiere entrevistarte en el parque central, con la banda del colegio de fondo.`,
    when: (p) => p.fame >= 8 && p.age >= 19,
    weight: (p, ctx) => (goodSeason(p, ctx) ? 2 : 1),
    cooldown: 8,
    options: (p) => [
      opt('Acepto y saludo a todos',
        o(0.85, `Mencionaste a tu primer entrenador y a la señora de la tienda. ${p.setup.dept} está orgulloso.`, { morale: 10, fame: 4 }),
        o(0.15, 'Se te olvidó saludar a tu tío y ahora está ofendido. Cosas de familia.', { morale: 3, fame: 4 })),
      opt('Prometo una cancha para los patojos',
        o(0.5, 'Cumpliste y juntaste para la grama. Tu nombre quedó en un rótulo.', { morale: 12, fame: 7, milestone: `Cancha para los patojos de ${p.setup.dept}` }),
        o(0.5, 'La promesa salió más cara de lo que pensabas. Te reclaman cada vez que volvés.', { morale: -6, fame: 3 })),
      opt('Hoy prefiero descansar',
        o(1, 'Comiste en casa de tu mamá sin cámaras. Pero algunos te dijeron creído.', { morale: 4, fame: -2 })),
    ],
  },
  {
    id: 'med_idioma',
    category: 'medios',
    title: 'Entrevista en otro idioma',
    text: (p, ctx) =>
      `Tras el partido con ${ctx.club.name}, la televisión local te pide unas palabras en su idioma. Tus clases van a medias.`,
    when: (p, ctx) => ctx.abroad && countryOf(ctx.club.country).lang !== ctx.country.lang,
    weight: (p, ctx) => swing(p, ctx) + 0.5,
    cooldown: 6,
    options: (p, ctx) => [
      opt('Me lanzo en su idioma',
        o(0.55, 'Con acento y todo, te entendieron. La afición te aplaudió el esfuerzo.', { fame: 6, morale: 6, coach: 3 }),
        o(0.45, 'Confundiste dos palabras y dijiste algo raro. Ya sos meme allá.', { fame: 4, morale: -6 })),
      opt('Pido traductor',
        o(0.9, 'Respuesta clara y sin sustos.', { fame: 1 }),
        o(0.1, 'El traductor resumió todo en "está contento". Ni modo.', { morale: -2 })),
      opt(`Saludo en ${ctx.country.lang} a ${ctx.country.code === 'GT' ? 'Guate' : ctx.country.name}`,
        o(0.7, `En ${ctx.country.name} lo compartieron por todos lados. La prensa ${ctx.country.adj}, feliz.`, { fame: 5, morale: 4 }),
        o(0.3, 'Allá lo tomaron como que no querés adaptarte.', { fame: 3, coach: -4 })),
    ],
  },
  // ---------- Selección ----------
  {
    id: 'med_sele',
    category: 'medios',
    title: (p, ctx) => (ctx.country.code === 'GT' ? '"¿Qué le falta a la Bicolor?"' : `"¿Qué le falta ${a(ctx.country.ntName)}?"`),
    text: (p, ctx) =>
      ctx.qualifiers
        ? `En plena eliminatoria rumbo al Mundial ${ctx.worldCupYear}, te preguntan: "¿Qué le falta a la Selección para clasificar?"`
        : 'Te preguntan en conferencia: "¿Qué le falta a la Selección para dar el salto?"',
    when: (p) => p.ntLevel > 0,
    weight: (p, ctx) => (ctx.qualifiers ? 2 : 1),
    cooldown: 6,
    options: (p, ctx) => [
      opt('Unión y trabajar callados',
        o(0.85, 'Respuesta de grupo. El cuerpo técnico de la Selección la valoró.', { fame: 3, morale: 3 }),
        o(0.15, 'Te dijeron que era la misma respuesta de hace 20 años.', { fame: 1 })),
      opt(`Más apoyo ${de(ctx.country.federation)}`,
        o(0.45, 'Muchos jugadores te respaldaron. Se abrió el debate en todos los medios.', { fame: 10, morale: 4 }),
        o(0.55, 'En la federación no cayó bien. En la siguiente lista no apareciste.', { fame: 7, morale: -8 })),
      opt('"Que me den la diez y ya"',
        o(0.5, 'El chiste te ganó el cariño de la afición.', { fame: 6, morale: 3 }),
        o(0.5, 'Los veteranos de la Selección no se rieron.', { fame: 4, morale: -4 })),
    ],
  },
  {
    id: 'med_resp_sele',
    category: 'medios',
    title: (p, ctx) => (ctx.country.code === 'GT' ? 'El técnico de la Bicolor' : `El técnico ${de(ctx.country.ntName)}`),
    text: () =>
      'En su conferencia, el técnico de la Selección contesta tu mensaje: "Lo estoy viendo. Pero a la Selección se llega jugando, no hablando."',
    when: (p) => has(p, 'med_msj_sele'),
    weight: 3.5,
    options: (p) => [
      opt('Respondo en la cancha',
        p.rating >= 66
          ? o(0.6, 'Hiciste el mejor mes de tu vida. Llegó la convocatoria.', { ntLevel: 1, caps: 1, fame: 8, morale: 10, unflag: 'med_msj_sele', milestone: 'Primera convocatoria a la Selección mayor' })
          : o(0.6, 'Jugaste bien, pero todavía no alcanza para la lista.', { rating: 1, morale: 2, unflag: 'med_msj_sele' }),
        o(0.4, 'La presión te pesó y bajaste el nivel. Toca esperar otro ciclo.', { morale: -6, unflag: 'med_msj_sele' })),
      opt('Le contesto por la radio',
        o(0.3, 'Se armó un ida y vuelta que vendió periódicos. A él no le hizo gracia.', { fame: 10, morale: -2, unflag: 'med_msj_sele' }),
        o(0.7, 'Quedaste como el que se pelea con el técnico nacional. Puerta cerrada.', { fame: 6, morale: -8, unflag: 'med_msj_sele' })),
    ],
  },
  // ---------- Clásico ----------
  {
    id: 'med_provocacion',
    category: 'medios',
    title: 'Pregunta con veneno',
    text: (p, ctx) =>
      `Semana de clásico. Un periodista te suelta: "Dicen en ${rivalOf(ctx)} que vos no aparecés en partidos grandes. ¿Qué les decís?"`,
    when: (p, ctx) => !!rivalOf(ctx) && p.fame >= 6,
    weight: (p, ctx) => swing(p, ctx),
    cooldown: 6,
    options: (p, ctx) => [
      opt('Que se preparen para el domingo',
        o(0.5, `La frase calentó la semana. En ${rivalOf(ctx)} ya pegaron tu foto en el vestuario.`, { fame: 8, morale: 4, flag: 'med_picado' }),
        o(0.5, 'Tu técnico te pidió no echarle leña al fuego. Tarde.', { fame: 6, coach: -5, flag: 'med_picado' })),
      opt('Respeto al rival, hablo en cancha',
        o(0.85, 'Respuesta madura. El técnico te sonrió en el entreno.', { coach: 5, fame: 2 }),
        o(0.15, 'La porra de tu equipo esperaba más sangre. Te dijeron tibio.', { fame: -2 })),
      opt('"¿Quién es ese?"',
        o(0.6, 'Se rieron hasta los del otro equipo. Buena salida.', { fame: 6, morale: 3 }),
        o(0.4, 'Lo tomaron como desprecio. Te van a buscar en cada jugada.', { fame: 5, flag: 'med_picado' })),
    ],
  },
  {
    id: 'med_clasico_caliente',
    category: 'medios',
    title: 'Clásico con fuego',
    text: (p, ctx) =>
      `Tus declaraciones calentaron todo. La afición ${rivalOf(ctx) ? `de ${rivalOf(ctx)}` : 'rival'} te silba desde el calentamiento y cada balón dividido va con todo.`,
    when: (p) => has(p, 'med_picado'),
    weight: 4,
    options: (p) => [
      opt('Juego con la sangre caliente',
        o(0.45, p.setup.position === 'POR' ? 'Atajaste todo y les callaste la boca. Noche histórica.' : 'Metiste gol y lo celebraste frente a su porra. Noche histórica.', { fame: 14, morale: 12, rating: 1, unflag: 'med_picado', milestone: 'Le cumplió al clásico' }),
        o(0.55, 'Te expulsaron a los 30 minutos por una entrada fuerte.', { coach: -10, morale: -10, fame: 2, unflag: 'med_picado' })),
      opt('Juego frío y simple',
        o(0.7, 'Partido serio, sin errores. No fue épico, pero cumpliste.', { coach: 4, morale: 2, unflag: 'med_picado' }),
        o(0.3, 'Te comiste el partido sin aparecer. Te recordaron tus palabras.', { fame: -5, morale: -6, unflag: 'med_picado' })),
    ],
  },
  // ---------- Otros ----------
  {
    id: 'med_ninos',
    category: 'medios',
    title: 'Programa infantil',
    text: () =>
      'Un programa infantil de la tele te invita: un grupo de niños de escuela te va a entrevistar. Las preguntas no las conoce nadie.',
    when: (p) => p.fame >= 10,
    cooldown: 10,
    options: () => [
      opt('Acepto, a ver qué preguntan',
        o(0.7, 'Te preguntaron si comés verduras y cuánto ganás. Saliste encantador.', { fame: 5, morale: 6 }),
        o(0.3, 'Un niño te dijo que su papá dice que sos malo. Risas nerviosas en vivo.', { fame: 4, morale: -3 })),
      opt('No tengo tiempo esta semana',
        o(1, 'Los productores invitaron a otro jugador. Nadie se enteró.', { fitness: 2 })),
    ],
  },
  {
    id: 'med_periodista_novato',
    category: 'medios',
    title: 'El periodista novato',
    text: () =>
      'Un estudiante de periodismo que hace prácticas en un medio pequeño te pide una exclusiva. Está tan nervioso que le tiembla la grabadora.',
    when: (p) => p.fame >= 6 && p.age >= 21,
    cooldown: 10,
    options: () => [
      opt('Le doy la exclusiva completa',
        o(0.75, 'Su nota fue la más leída del mes. Ahora te tiene un respeto eterno.', { fame: 4, morale: 6 }),
        o(0.25, 'Cambió una palabra en la nota y armó un lío pequeño. Sin mala fe.', { fame: 2, coach: -3 })),
      opt('Le doy dos minutos',
        o(1, 'Tuvo su nota y vos tu tiempo. Nada del otro mundo.', { fame: 1 })),
    ],
  },
];
