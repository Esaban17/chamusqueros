import type { Effects, EventContext, EventTemplate, MinigameKind, Player, Position } from '../types';
import { o, opt } from '../helpers';

// Minijuegos extra (specs/ritmo-por-temporada): 5 situaciones nuevas x 4 posiciones = 20 plantillas, que sumadas a las 12 de
// minijuegos.ts dan 32. Mismo formato que aquellas: una sola opción ("jugarla") con tres desenlaces fijos [éxito, a medias, fallo];
// el motor elige el desenlace con el resultado de la jugada (por eso p = 0). El tipo es uno por posición, como siempre: solo cambia la ambientación.
// Situaciones: copa, jornada (partido trabado ante el último de la tabla), racha (cortar una mala racha) para cualquier jugador;
// ascenso (liguilla, solo en las divisiones de abajo de su país) y extranjero (club del extranjero).
// Cada una trae 2 variantes de texto (intro y desenlaces); la variante sale de la paridad de las temporadas jugadas.
// Evitar en estos textos: título, campeón (ni campeonato), clasificar y convocatoria (simulate los rechaza en minijuegos).

type Situacion = 'copa' | 'jornada' | 'racha' | 'ascenso' | 'extranjero';
type Texto = string | ((p: Player, ctx: EventContext) => string);
type Par = [Texto, Texto];
const txt = (t: Texto, p: Player, ctx: EventContext) => (typeof t === 'function' ? t(p, ctx) : t);
const variante = (p: Player) => p.seasons.length % 2;
const pick = (par: Par, p: Player, ctx: EventContext) => txt(par[variante(p)], p, ctx);

interface Def {
  kind: MinigameKind;
  pos: Position;
  sit: Situacion;
  title: Texto;
  label: string;
  text: Par;
  ok: Par;
  half: Par;
  fail: Par;
}

// Mismos topes que minijuegos.ts (nivel -2 a +2, fama hasta +15, sin títulos, traspasos ni retiros).
const EFECTOS: Record<Situacion, { ok: Effects; half: Effects; fail: Effects }> = {
  copa: { ok: { rating: 1, fame: 12, morale: 10 }, half: { morale: 2, fame: 2 }, fail: { fame: -1, morale: -9 } },
  jornada: { ok: { rating: 1, fame: 6, morale: 8 }, half: { morale: 2, fame: 1 }, fail: { rating: -1, morale: -8 } },
  racha: { ok: { rating: 1, fame: 8, morale: 12 }, half: { morale: 3, fame: 1 }, fail: { fame: -1, morale: -10 } },
  ascenso: { ok: { rating: 1, fame: 10, morale: 12 }, half: { morale: 2, fame: 2 }, fail: { rating: -1, morale: -10 } },
  extranjero: { ok: { rating: 1, fame: 10, morale: 10 }, half: { morale: 2, fame: 2 }, fail: { fame: -1, morale: -8 } },
};

const club = (_: Player, ctx: EventContext) => ctx.club.name;
const liga = (_: Player, ctx: EventContext) => ctx.club.league;
/** La división de arriba de la que juega hoy (la liguilla de ascenso solo sale en las de abajo). */
const arriba = (_: Player, ctx: EventContext) => ctx.country.leagues[ctx.tier - 2] ?? 'la división de arriba';

// prettier-ignore
const DEFS: Def[] = [
  // ---------- Delantero: penal o mano a mano ----------
  { kind: 'penal', pos: 'DEL', sit: 'copa', title: 'Penal en la copa', label: 'Patear el penal',
    text: [
      (p, c) => `Semifinal de copa y ${club(p, c)} pierde por un gol. En el descuento, el árbitro cobra penal a favor y el capitán te hace una seña: la pelota es tuya.`,
      (p, c) => `Final de copa, 1 a 1 y minuto 88. ${club(p, c)} tiene un penal a favor y en la tribuna nadie respira. Acomodás la pelota y mirás al arquero.`,
    ],
    ok: ['Mirada al arquero, remate al rincón y red. Corriste hacia la tribuna con los brazos abiertos.', 'Esperaste a que se moviera y la tocaste al otro lado. El banco entero salió corriendo a abrazarte.'],
    half: ['El arquero la desvió con la punta de los dedos y la jugada se apagó en un córner. Quedó el aliento contenido.', 'La pelota pegó en el palo y salió. Se te heló todo el cuerpo por un segundo.'],
    fail: ['Te ganaron los nervios y la mandaste a las nubes. Te quedaste con las manos en la cabeza.', 'El arquero adivinó el lado y la agarró sin problemas. Sentiste todas las miradas encima.'] },
  { kind: 'penal', pos: 'DEL', sit: 'jornada', title: 'Mano a mano ante el último de la tabla', label: 'Definir el mano a mano',
    text: [
      (p, c) => `${club(p, c)} no puede con el último de la tabla y el reloj corre. Un pelotazo te deja de frente al arquero, sin nadie más cerca.`,
      'Todos daban por ganado el partido y sigue 0 a 0. Controlás una pelota larga y te quedás solo contra el arquero del último de la tabla.',
    ],
    ok: ['Esperaste su movimiento y la tocaste por abajo. El banco soltó un respiro enorme.', 'Definiste con calma, por encima del arquero. El partido por fin se abrió.'],
    half: ['El arquero salió bien y alcanzó a desviarla. La pelota quedó viva, pero no entró.', 'Pegó en el cuerpo del arquero y se fue al córner. Estuvo cerca.'],
    fail: ['Te apuraste y la pelota se fue lejos del arco. Se te escapó un partido que parecía fácil.', 'Pensaste de más y un defensa te sacó la pelota en el último momento. Qué rabia.'] },
  { kind: 'penal', pos: 'DEL', sit: 'racha', title: 'Un penal para cortar la racha', label: 'Patear el penal',
    text: [
      (p, c) => `${club(p, c)} no gana hace varios partidos y el ambiente está pesado. Cobran penal a favor y el técnico te mira: "Cortá la racha".`,
      'Van varias fechas sin victoria y en la tribuna ya se escuchan los reclamos. Te cobran un penal justo cuando más lo necesitan.',
    ],
    ok: ['La clavaste junto al palo. Se te escapó un grito que venías guardando hace semanas.', 'Rompiste el hielo con un remate fuerte al medio. La tribuna volvió a cantar.'],
    half: ['El arquero tapó con las piernas y la pelota se fue al córner. No fue el desahogo, pero respiraron.', 'Pegó en el palo y salió. La racha sigue, aunque el equipo no se vino abajo.'],
    fail: ['La mandaste a la tribuna. En el vestuario nadie dijo nada, y eso pesó más que cualquier reproche.', 'El arquero adivinó el lado y la tapó fácil. La racha se siente más pesada que antes.'] },
  { kind: 'penal', pos: 'DEL', sit: 'ascenso', title: 'Penal en la liguilla de ascenso', label: 'Patear el penal',
    text: [
      (p, c) => `Partido de liguilla por el ascenso a ${arriba(p, c)} y ${club(p, c)} no rompe el empate. Cobran penal a favor y la tribuna se queda en silencio.`,
      (p, c) => `Un partido de la liguilla decide si ${club(p, c)} sube de división. El árbitro cobra penal para tu equipo y todos se dan vuelta para mirarte.`,
    ],
    ok: ['La pusiste junto al palo y el arquero ni se movió. El ascenso quedó a un paso.', 'Remate fuerte y al medio. El arquero ya estaba en el piso y tu equipo, de pie en el banco.'],
    half: ['El arquero la sacó con una mano. El empate sigue y todos se agarran la cabeza, pero el partido no terminó.', 'Pegó en el palo y la defensa despejó. Todavía hay partido, pero el susto fue enorme.'],
    fail: ['La pelota se fue arriba del travesaño. Te quedaste mirando el pasto un buen rato.', 'Te traicionaron las piernas y la tiraste afuera. El silencio en el estadio duele.'] },
  { kind: 'penal', pos: 'DEL', sit: 'extranjero', title: (p, c) => `Una oportunidad en ${liga(p, c)}`, label: 'Definir la jugada',
    text: [
      (p, c) => `Partido parejo de ${club(p, c)} en ${liga(p, c)}. Un pase largo te deja solo frente al arquero y sentís que es tu momento de mostrar quién sos en este país.`,
      (p, c) => `En ${liga(p, c)} todavía tenés que demostrar quién sos. Te cobran un penal a favor y varios compañeros te miran para ver si te animás.`,
    ],
    ok: ['Esperaste al arquero y la tocaste por encima. El estadio, que no te conocía, aprendió tu apellido.', 'La clavaste al rincón con total calma. Tus compañeros te abrazaron como si fueras de toda la vida.'],
    half: ['El arquero achicó y desvió el remate. El público aplaudió el intento y vos te quedaste con ganas de más.', 'Pegó en el palo y salió. Los compañeros te dieron una palmada en la espalda.'],
    fail: ['Pateaste desviado, con el arco casi abierto. Sentiste el peso de estar lejos de casa.', 'El arquero adivinó y la tapó. Algunos compañeros se miraron y quedó una sensación amarga.'] },

  // ---------- Portero: atajar un penal ----------
  { kind: 'atajada', pos: 'POR', sit: 'copa', title: 'Penal en contra en la copa', label: 'Atajar el penal',
    text: [
      (p, c) => `Semifinal de copa y el árbitro cobra penal contra ${club(p, c)} en los últimos minutos. El pateador acomoda la pelota y la tribuna se queda en silencio.`,
      'Final de copa, 1 a 1 y minuto 85. Cobran penal para el rival. Respirás hondo, mirás al pateador y no pensás en nada más.',
    ],
    ok: ['Te tiraste a tu derecha y la mandaste al córner con las dos manos. Tus compañeros se te vinieron encima.', 'Leíste la carrera, esperaste y la sacaste con el pie. El estadio estalló de alivio.'],
    half: ['La rechazaste hacia el centro, pero el rebote cayó en el área. Tu defensa despejó justo a tiempo.', 'Llegaste a rozarla y se fue pegada al poste, afuera. Un susto enorme que se quedó en eso.'],
    fail: ['Te tiraste al lado contrario. El pateador la puso al otro rincón y quedaste mirando.', 'Te quedaste clavado en el medio y la pelota entró despacio, por abajo. Bajaste la cabeza.'] },
  { kind: 'atajada', pos: 'POR', sit: 'jornada', title: 'Penal en contra del último de la tabla', label: 'Atajar el penal',
    text: [
      (p, c) => `Todos esperaban un trámite, pero el último de la tabla tiene un penal a favor contra ${club(p, c)}. Si lo convierte, se arma un lío enorme.`,
      'El partido parecía fácil y de pronto el árbitro cobra penal para el último de la tabla. Te toca pararte bajo los tres palos.',
    ],
    ok: ['Adivinaste el lado y la mandaste al córner. El último de la tabla no podía creerlo.', 'Te quedaste firme hasta el último segundo y la atajaste con las dos manos. Respiró el estadio entero.'],
    half: ['Llegaste a rozarla con los dedos y se fue al córner. Fue una atajada a medias, pero alcanzó.', 'Rechazaste el remate y tu defensa despejó el rebote. Respiraron, aunque el susto fue grande.'],
    fail: ['Te tiraste mal y la pelota entró suave. Hasta el último de la tabla se animó a festejar.', 'Adivinaste el lado, pero te faltó medio metro. Una distracción cara.'] },
  { kind: 'atajada', pos: 'POR', sit: 'racha', title: 'Penal en contra y la racha', label: 'Atajar el penal',
    text: [
      (p, c) => `${club(p, c)} lleva varios partidos sin ganar y ahora cobran un penal en contra. Si lo atajás, cortás la mala suerte del equipo entero.`,
      (p, c) => `La racha sin victorias pesa, el partido está 0 a 0 y le cobran penal en contra a ${club(p, c)}. El técnico solo te hace una seña: confía en vos.`,
    ],
    ok: ['Te lanzaste a tu izquierda y la sacaste con la mano abierta. El grito del equipo se escuchó hasta afuera.', 'Leíste la intención del pateador y la desviaste. Tus compañeros te abrazaron como si hubieran ganado la copa.'],
    half: ['Tocaste la pelota y pegó en el travesaño. No fue una atajada perfecta, pero el susto pasó.', 'La rechazaste con los pies y el rebote se fue afuera. Menos mal.'],
    fail: ['Te quedaste parado y la pelota entró por el medio. La racha se siente más larga que nunca.', 'El pateador te engañó con la carrera. Entró por la esquina y el silencio fue total.'] },
  { kind: 'atajada', pos: 'POR', sit: 'ascenso', title: 'Penal en la liguilla de ascenso', label: 'Atajar el penal',
    text: [
      (p, c) => `Liguilla por el ascenso a ${arriba(p, c)} y el rival tiene un penal a favor contra ${club(p, c)}. Todo el año de trabajo se juega en esta jugada.`,
      (p, c) => `El partido de liguilla se define en los detalles y el árbitro cobra penal contra ${club(p, c)}. Caminás hacia el arco con las manos sudadas.`,
    ],
    ok: ['Adivinaste el lado y la agarraste sin rebote. El estadio se vino abajo de alegría.', 'Te quedaste hasta el último momento y la desviaste al córner. Tu equipo respiró.'],
    half: ['Llegaste a tocarla, pero quedó el rebote. Tu defensa lo sacó casi de la línea.', 'La rozaste y se fue pegada al poste, afuera. Un susto que te dejó temblando.'],
    fail: ['Te tiraste al lado equivocado. Se te vino el mundo encima.', 'Te faltó un centímetro. La pelota entró y el silencio en tu tribuna fue brutal.'] },
  { kind: 'atajada', pos: 'POR', sit: 'extranjero', title: (p, c) => `Un penal en ${liga(p, c)}`, label: 'Atajar el penal',
    text: [
      (p, c) => `Partido parejo de ${club(p, c)} en ${liga(p, c)} y cobran penal en contra. Es tu momento de mostrar por qué te trajeron.`,
      (p, c) => `Todavía te están conociendo en ${liga(p, c)}. El árbitro cobra penal contra ${club(p, c)} y la tribuna entera te mira, curiosa, a ver qué hacés.`,
    ],
    ok: ['Te tiraste con todo y la mandaste al córner. El público, que no te conocía, aplaudió de pie.', 'La atajaste sin rebote. Tus compañeros, que dudaban, se te tiraron encima.'],
    half: ['La rechazaste hacia un costado y un defensa despejó. Quedaste bien, aunque sin lucirte.', 'Alcanzaste a rozarla y se fue pegada al poste, afuera. Un susto bien aguantado.'],
    fail: ['Elegiste el lado contrario. El pateador la puso en el rincón y vos te quedaste mirando.', 'La pelota entró y extrañaste tu casa más que nunca.'] },

  // ---------- Mediocampista: pase filtrado ----------
  { kind: 'pase', pos: 'MED', sit: 'copa', title: 'Pase decisivo en la copa', label: 'Filtrar el pase',
    text: [
      (p, c) => `Semifinal de copa y ${club(p, c)} necesita un gol para seguir adelante. Te llega la pelota de espaldas a la defensa y tu compañero se desmarca.`,
      'Final de copa, 0 a 0, último cuarto de hora. Recibís entre líneas y se abre un pasillo hacia el delantero.',
    ],
    ok: ['Pase de primera, al espacio justo. Tu compañero solo tuvo que empujarla y el estadio se vino abajo.', 'La pelota pasó entre dos rivales y le llegó perfecta. Fue la asistencia de la noche.'],
    half: ['El pase salió un poco fuerte y tu compañero llegó a medias. Se generó un córner.', 'Tu compañero alcanzó a tocarla, pero el arquero estaba atento. La jugada murió ahí.'],
    fail: ['Un defensa la interceptó y salió de contragolpe. Tuviste que correr de vuelta.', 'Pasó demasiado larga y se fue por la línea de fondo. Te mordiste el labio.'] },
  { kind: 'pase', pos: 'MED', sit: 'jornada', title: 'Pase al hueco ante el último de la tabla', label: 'Filtrar el pase',
    text: [
      (p, c) => `${club(p, c)} domina al último de la tabla, pero no logra abrirlo: están todos metidos atrás. Levantás la cabeza y ves un hueco mínimo entre dos defensas.`,
      'El rival ocupa su área con todos sus jugadores y el partido se atasca. Tenés la pelota en el medio y un compañero que te pide el pase entre líneas.',
    ],
    ok: ['Pasó justo por el hueco, como con hilo. El candado se abrió y el estadio respiró.', 'Un pase al pie, de primera. Tu compañero se perfiló y definió sin problemas.'],
    half: ['El pase llegó, pero sin ventaja. El compañero tuvo que retroceder para no perderla.', 'La pelota salió un poco larga y terminó en un lateral. Faltó puntería.'],
    fail: ['El defensa la cortó fácil. El último de la tabla salió corriendo y se armó un susto.', 'Intentaste algo muy difícil y se la regalaste al rival. El público protestó.'] },
  { kind: 'pase', pos: 'MED', sit: 'racha', title: 'El pase para cortar la racha', label: 'Filtrar el pase',
    text: [
      (p, c) => `${club(p, c)} lleva varios partidos sin ganar. Ves que tu delantero se desmarca por la banda y sabés que ese pase puede cambiar el ánimo del equipo.`,
      'Otro partido apretado y la racha pesa. La defensa rival sube la línea y vos tenés un segundo para elegir el pase.',
    ],
    ok: ['Un pase perfecto, al espacio. Tu delantero entró solo y el estadio por fin se soltó.', 'Pasó entre dos rivales y la pelota llegó a destino. Cambió la cara del equipo entero.'],
    half: ['El pase fue bueno, pero tu compañero llegó con el cuerpo cargado. La jugada quedó en el aire.', 'Alcanzaste a ponerla, pero el delantero llegó apretado y no pudo rematar bien.'],
    fail: ['Pasó fuera de tiempo y el árbitro marcó posición adelantada. La racha sigue.', 'Te la quitaron y salieron rápido. Te quedaste con las manos en la cintura.'] },
  { kind: 'pase', pos: 'MED', sit: 'ascenso', title: 'Pase en la liguilla de ascenso', label: 'Filtrar el pase',
    text: [
      (p, c) => `Liguilla por el ascenso a ${arriba(p, c)} y el partido está cerrado. Recibís en el medio, con poco tiempo, y tu delantero se mueve al espacio.`,
      (p, c) => `El ascenso se juega en este partido y ${club(p, c)} no encuentra el camino. Levantás la cabeza y ves una opción entre dos defensas.`,
    ],
    ok: ['Pasó con precisión milimétrica y tu compañero quedó de cara al arco. La tribuna se puso de pie.', 'El pase fue un guante y la jugada terminó en una ocasión de oro.'],
    half: ['La pelota llegó un poco alta y tu compañero tuvo que bajarla. La defensa alcanzó a cerrar.', 'Alcanzó a llegar, pero lejos del arco. La jugada quedó en un lateral.'],
    fail: ['El pase fue interceptado y el rival salió corriendo. En la tribuna se oyó un murmullo.', 'Se la entregaste a un defensa. Tu técnico se agarró la cabeza.'] },
  { kind: 'pase', pos: 'MED', sit: 'extranjero', title: (p, c) => `Un pase en ${liga(p, c)}`, label: 'Filtrar el pase',
    text: [
      (p, c) => `Tu partido en ${liga(p, c)} con ${club(p, c)} está parejo. La defensa rival presiona alto y tenés un segundo para mostrar tu visión de juego.`,
      'Lejos de casa, todavía te están descubriendo. Recibís entre líneas y tu delantero te pide la pelota al espacio.',
    ],
    ok: ['Un pase de lujo, al hueco. El público, que no te conocía, aplaudió de pie.', 'Pasó entre dos rivales con una precisión que nadie esperaba. Tus compañeros te levantaron el pulgar.'],
    half: ['El pase llegó, pero un poco fuerte. Tu compañero tuvo que estirarse y no pudo rematar.', 'La pelota quedó a medio camino. El rival la despejó y la jugada siguió con un córner.'],
    fail: ['Te la cortaron en el medio y saliste a correr de vuelta. En el banco, nadie dijo nada.', 'Calculaste mal la fuerza y el pase se fue afuera. Un error que se te quedó dando vueltas.'] },

  // ---------- Defensa: cierre o barrida ----------
  { kind: 'cierre', pos: 'DEF', sit: 'copa', title: 'Cierre en la copa', label: 'Cerrar la jugada',
    text: [
      (p, c) => `Copa en juego y ${club(p, c)} gana por la mínima. El rival se escapa por el centro con la pelota dominada y entre él y el arco solo estás vos.`,
      'Semifinal de copa, tiempo extra. El delantero rival recibe de espaldas, gira y arranca hacia el área. Tenés que cortarlo.',
    ],
    ok: ['Llegaste justo y le sacaste la pelota limpia. La tribuna te agradeció con un aplauso largo.', 'Te cruzaste a tiempo y la mandaste a la tribuna. Tus compañeros te abrazaron al verte levantarte.'],
    half: ['Alcanzaste a desviarlo, pero la pelota quedó suelta en el área. El arquero la sacó con los puños.', 'Llegaste con la punta del botín y apenas lo tocaste. Fue suficiente para que el remate saliera desviado.'],
    fail: ['Te ganó la carrera y quedó mano a mano. Solo pudiste mirar cómo se iba.', 'Te lanzaste antes de tiempo y el delantero te saltó. Se te hizo un nudo en el estómago.'] },
  { kind: 'cierre', pos: 'DEF', sit: 'jornada', title: 'Cierre ante el último de la tabla', label: 'Cerrar la jugada',
    text: [
      'Parecía un partido fácil y de pronto el último de la tabla se escapa por la banda. Un delantero veloz te lleva un par de metros y se mete al área.',
      'El último de la tabla tiene una sola ocasión en todo el partido y es esta: una carrera larga a tu espalda. Una distracción y se arma un lío.',
    ],
    ok: ['Corriste con todo, lo alcanzaste y le sacaste la pelota. Un cierre que ahorró un susto enorme.', 'Le cerraste el ángulo a tiempo y lo obligaste a rematar afuera. Un alivio para todo el equipo.'],
    half: ['Llegaste tarde, pero lo molestaste lo suficiente para que el remate saliera flojo.', 'Lo tocaste en el último instante y la pelota fue al córner. Se salvó por un pelo.'],
    fail: ['Te ganó en velocidad y definió con tranquilidad. Hasta el último de la tabla pudo festejar.', 'Calculaste mal la distancia y quedó solo frente al arquero. Te agarraste la cabeza.'] },
  { kind: 'cierre', pos: 'DEF', sit: 'racha', title: 'Cierre para no seguir perdiendo', label: 'Cerrar la jugada',
    text: [
      (p, c) => `Otro partido apretado y ${club(p, c)} no gana hace varias fechas. El rival lanza un contraataque y, si entra, la racha seguirá. Estás solo contra su delantero.`,
      'Un error en la salida y de pronto el rival corre con espacio hacia tu arco. Si lo parás, el equipo recupera la confianza.',
    ],
    ok: ['Te lanzaste con todo y le robaste la pelota limpia. El equipo ganó confianza con esa jugada.', 'Lo acompañaste hasta el borde del área y le cortaste el pase. Tus compañeros te agradecieron a gritos.'],
    half: ['Alcanzaste a empujarlo y el remate salió flojo. Algo es algo.', 'Llegaste con la punta del pie y desviaste la pelota al córner. La racha no cambió, pero el susto pasó.'],
    fail: ['Llegaste tarde y el rival definió sin problemas. La racha se siente cada vez más pesada.', 'Te pasó por el costado y definió. Nadie te dijo nada, pero lo sentiste.'] },
  { kind: 'cierre', pos: 'DEF', sit: 'ascenso', title: 'Cierre en la liguilla de ascenso', label: 'Cerrar la jugada',
    text: [
      (p, c) => `Liguilla por el ascenso a ${arriba(p, c)} y ${club(p, c)} aguanta un resultado ajustado. El rival se escapa por el centro y solo vos podés frenarlo.`,
      (p, c) => `El partido que puede subir a ${club(p, c)} de división se juega al límite. Un delantero rival se mete al área y vos corrés para cortarle el paso.`,
    ],
    ok: ['Te cruzaste a la perfección y despejaste. Tu equipo entero te aplaudió.', 'Llegaste justo y tocaste la pelota sin falta. La tribuna cantó tu nombre.'],
    half: ['Alcanzaste a desviarlo, pero la pelota quedó suelta. Un compañero la despejó.', 'Llegaste con la punta del botín y el rival remató desviado. Se salvaron por muy poco.'],
    fail: ['Llegaste tarde y el rival definió. El silencio de la tribuna se sintió eterno.', 'Te ganó la espalda y quedó solo. Te pasaste las manos por la cara.'] },
  { kind: 'cierre', pos: 'DEF', sit: 'extranjero', title: (p, c) => `Un cierre en ${liga(p, c)}`, label: 'Cerrar la jugada',
    text: [
      (p, c) => `Partido parejo de ${club(p, c)} en ${liga(p, c)}. El rival lanza un contraataque y vos, que todavía te estás acostumbrando al ritmo de acá, tenés que llegar a tiempo.`,
      (p, c) => `En ${liga(p, c)} todo se juega más rápido. El delantero rival arranca con espacio y solo vos estás entre él y tu arquero.`,
    ],
    ok: ['Llegaste justo y le sacaste la pelota. El público, que dudaba de vos, empezó a aplaudirte.', 'Cortaste la jugada con una barrida limpia. Tus compañeros te levantaron del césped.'],
    half: ['Lo desviaste, pero la pelota quedó viva. Tu arquero se encargó del resto.', 'Llegaste con la punta del botín. No fue perfecto, pero el peligro pasó.'],
    fail: ['El ritmo te ganó y llegaste un paso tarde. El rival aprovechó con tranquilidad.', 'Te pasó por el costado y definió. Por un instante, extrañaste la liga de siempre.'] },
];

const importancia: Record<Situacion, (c: EventContext) => 1 | 2 | 3> = {
  copa: (c) => (c.tier === 1 || c.abroad ? 3 : 2),
  jornada: () => 1,
  racha: () => 2,
  ascenso: () => 3,
  extranjero: () => 2,
};

export const MINIJUEGOS_EXTRA_EVENTS: EventTemplate[] = DEFS.map((d) => ({
  id: `mj_${d.kind}_${d.sit}`,
  category: 'minijuego',
  title: (p, c) => txt(d.title, p, c),
  text: (p, c) => pick(d.text, p, c),
  cooldown: 2, // no se repite en menos de 3 temporadas
  when: (p, c) =>
    p.age >= 18 &&
    p.seasons.length >= 2 &&
    p.setup.position === d.pos &&
    (d.sit === 'ascenso' ? !c.abroad && c.tier >= 2 : d.sit === 'extranjero' ? c.abroad : true),
  minigame: (_p, c) => ({ kind: d.kind, importance: importancia[d.sit](c) }),
  options: (p, c) => {
    const e = EFECTOS[d.sit];
    // p = 0 en los tres: el motor elige el desenlace por el resultado de la jugada, no por sorteo (igual que minijuegos.ts).
    return [opt(d.label, o(0, pick(d.ok, p, c), e.ok), o(0, pick(d.half, p, c), e.half), o(0, pick(d.fail, p, c), e.fail))];
  },
}));
