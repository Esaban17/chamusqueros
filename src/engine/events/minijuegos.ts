import type { Effects, EventContext, EventTemplate, MinigameKind, Player, Position } from '../types';
import { o, opt, has, cap, de, rivalOf } from '../helpers';

// Minijuegos (specs/minijuegos): 4 tipos, uno por posición, x 3 situaciones = 12 plantillas.
// Cada una es una decisión de una sola opción ("jugarla") con tres desenlaces, en este orden fijo: [éxito, a medias, fallo].
// El motor (choose) elige el desenlace con el resultado de la jugada; la interfaz (ui/minigames.ts) la pone a jugar.
// Desde specs/ritmo-por-temporada hay un minijuego por temporada (el motor, sacarMinijuego, toma todas las plantillas de la categoría):
// sin `once`, sin peso y sin banderas; el espaciado es el `cooldown` en temporadas (2 = no se repite en menos de 3).
// Los desenlaces solo mueven nivel, fama y ánimo (y un gol y un hito de texto con la Selección): sin títulos, traspasos ni retiros.
// Intro y desenlaces tienen 2 variantes de texto, con el mismo mecanismo que minijuegos-extra.ts (RF-11): sale la de la paridad de las temporadas jugadas.

const mayor = (p: Player) => p.ntLevel >= 1 && !has(p, 'sel_retirado');

type Situacion = 'liga' | 'clasico' | 'seleccion';
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
  text: Par;
  label: string;
  ok: Par;
  half: Par;
  fail: Par;
  /** El éxito con la Selección de un delantero suma un gol y un hito de texto. */
  gol?: string;
}

// Efectos por situación, dentro de los topes de RF-12 (nivel -2 a +2, fama hasta +15).
const EFECTOS: Record<Situacion, { ok: Effects; half: Effects; fail: Effects }> = {
  liga: { ok: { rating: 1, fame: 12, morale: 10 }, half: { morale: 2, fame: 1 }, fail: { rating: -1, fame: -1, morale: -10 } },
  clasico: { ok: { rating: 1, fame: 10, morale: 10 }, half: { morale: 2, fame: 2 }, fail: { fame: -1, morale: -9 } },
  seleccion: { ok: { rating: 1, fame: 15, morale: 12 }, half: { morale: 3, fame: 3 }, fail: { fame: -2, morale: -12 } },
};

const club = (_: Player, ctx: EventContext) => ctx.club.name;
const rival = (_: Player, ctx: EventContext) => rivalOf(ctx) ?? 'el rival de siempre';
const sele = (_: Player, ctx: EventContext) => ctx.nt.ntName;
/** Eliminatoria si toca, si no un amistoso grande: los dos hablan de la Selección que representa hoy (ctx.nt, no la de origen). */
const partido = (_: Player, ctx: EventContext) => (ctx.qualifiers ? 'un partido de eliminatoria' : 'un amistoso internacional');

// prettier-ignore
const DEFS: Def[] = [
  // ---------- Delantero: penal o mano a mano ----------
  { kind: 'penal', pos: 'DEL', sit: 'liga', title: 'Penal en el último minuto',
    text: [
      (p, c) => `Final del torneo y ${club(p, c)} pierde por un gol. El árbitro cobra penal a favor en el último minuto y el técnico te mira: el balón ya lo tenés vos.`,
      (p, c) => `Última fecha del torneo y el empate 1 a 1 se hace eterno. En el descuento, el árbitro señala penal a favor de ${club(p, c)}. Te acercás a la pelota con la tribuna en silencio.`,
    ],
    label: 'Patear el penal',
    ok: [
      'La clavaste pegada al palo. El estadio explota y tus compañeros te caen encima.',
      'Engañaste al arquero con una pausa y la mandaste al rincón. El grito de la tribuna se escuchó hasta el banco.',
    ],
    half: [
      'El portero la tocó y se fue al poste. Se te hizo un nudo en el estómago.',
      'El arquero la rechazó con el brazo y el rebote quedó a un metro del arco. El partido sigue vivo.',
    ],
    fail: [
      'Se te fue por arriba del arco. Te quedás mirando el césped.',
      'Te apuraste y la mandaste afuera. El silencio de la tribuna pesó más que cualquier grito.',
    ] },
  { kind: 'penal', pos: 'DEL', sit: 'clasico', title: 'Mano a mano en el clásico',
    text: [
      (p, c) => `Clásico contra ${rival(p, c)}, partido trabado. Un pase largo te deja solo frente al portero y la tribuna de ${club(p, c)} se pone de pie.`,
      (p, c) => `Clásico contra ${rival(p, c)} y el empate sigue a diez minutos del final. Te llega un rebote dentro del área y el arquero rival sale a tapar. Solo vos podés definir.`,
    ],
    label: 'Definir el mano a mano',
    ok: [
      'Lo dejaste sentado y la picaste por encima. La tribuna se vino abajo.',
      (p, c) => `Esperaste a que se tirara y la pusiste con un toque suave por encima de él. La hinchada de ${club(p, c)} enloqueció.`,
    ],
    half: [
      'El portero achicó bien y alcanzó a tapar con el pie. Casi.',
      'El arquero te cerró el ángulo y la tapó con la pierna. Del córner no salió nada, pero te quedó la rabia de haber estado cerca.',
    ],
    fail: [
      'Pateaste desviado, con el arco abierto. Te agarraste la cabeza.',
      'Lo mandaste por arriba del travesaño. Los hinchas de la otra tribuna te aplaudieron con ironía.',
    ] },
  { kind: 'penal', pos: 'DEL', sit: 'seleccion', title: (p, c) => `Penal con ${c.nt.ntName}`,
    text: [
      (p, c) => `${cap(partido(p, c))} con ${sele(p, c)} y todo se define en el último minuto. Cobran penal y el capitán te da el balón: patea el que más confianza tenga.`,
      (p, c) => `${cap(partido(p, c))} con ${sele(p, c)} empatado en el segundo tiempo. El árbitro marca penal a favor y el técnico te señala el balón sin decir palabra.`,
    ],
    label: 'Patear el penal', gol: 'Definió un penal decisivo',
    ok: [
      (p, c) => `La metiste raspando el palo y todo ${c.nt.name} gritó con vos. Te abrazaron hasta que casi no podías respirar.`,
      'Un disparo seco al ángulo, sin dudar. La tribuna entera se levantó y tus compañeros te cargaron en andas.',
    ],
    half: [
      'El portero adivinó el lado y alcanzó a desviarla. Quedó la sensación de que estuvo cerca.',
      'El arquero llegó a tocarla, pero la pelota pegó en el travesaño y salió. Te quedó una mezcla de alivio y bronca.',
    ],
    fail: [
      'La mandaste a las nubes. Pasaste el resto del partido sin levantar la cara.',
      'Te quedaste pensando demasiado y la pateaste al costado. El banco se llevó las manos a la cabeza.',
    ] },

  // ---------- Portero: atajar un penal ----------
  { kind: 'atajada', pos: 'POR', sit: 'liga', title: 'Penal en contra en la final',
    text: [
      (p, c) => `Final del torneo y el árbitro cobra penal en contra de ${club(p, c)}. El delantero acomoda el balón y la afición contiene la respiración. Ahora el que decide sos vos.`,
      (p, c) => `Último partido del torneo y ${club(p, c)} aguanta el 0 a 0 con uñas y dientes. Cobran penal en contra y el pateador respira hondo mientras te mira.`,
    ],
    label: 'Atajar el penal',
    ok: [
      'Adivinaste el lado y la sacaste con la punta de los dedos. Tus compañeros corrieron a abrazarte.',
      'Leíste el pie del pateador y te quedaste en el lugar exacto. Atajada limpia y la tribuna cantó tu nombre.',
    ],
    half: [
      'Llegaste a rozarla, pero se coló pegada al palo. Faltó un centímetro.',
      'Alcanzaste a tocarla con el guante y el travesaño la devolvió al campo. Pasó tan cerca que te temblaron las piernas.',
    ],
    fail: [
      'Te tiraste al lado contrario. El delantero la puso al otro rincón y se quedó mirando.',
      'El pateador te engañó con la pausa. Te quedaste en el medio y la pelota entró por un costado.',
    ] },
  { kind: 'atajada', pos: 'POR', sit: 'clasico', title: 'Tanda de penales en el clásico',
    text: [
      (p, c) => `El clásico contra ${rival(p, c)} se va a los penales. La tanda está pareja y a ${club(p, c)} le toca atajar el siguiente. Caminás al arco con las manos sudadas.`,
      (p, c) => `Tanda de penales contra ${rival(p, c)}, 4 a 4. Te toca atajar el quinto del rival. Desde la tribuna de ${club(p, c)} alguien grita tu nombre.`,
    ],
    label: 'Atajar el penal',
    ok: [
      'Te lanzaste con todo y la desviaste al córner. La banca explotó.',
      'Adivinaste la esquina y la atajaste con el pie. Tus compañeros corren hacia el arco y se te tiran encima.',
    ],
    half: [
      'La tocaste con la yema de los dedos, pero tuvo fuerza para entrar. Te dejó el sabor amargo.',
      'La tocaste con la punta de los guantes y el palo la devolvió al campo. Se te escapó el aire en un suspiro.',
    ],
    fail: [
      'Te quedó cruzado el lado y la pelota entró lenta. Bajaste la mirada.',
      'El pateador te leyó el movimiento y la pelota entró por el lado que no cubriste. La banca rival se vino abajo.',
    ] },
  { kind: 'atajada', pos: 'POR', sit: 'seleccion', title: (p, c) => `Penal en contra con ${c.nt.ntName}`,
    text: [
      (p, c) => `${cap(partido(p, c))} con ${sele(p, c)} y el árbitro cobra penal a favor del rival en el último minuto. Ves al pateador, ves el arco y escuchás el himno en tu cabeza.`,
      (p, c) => `${cap(partido(p, c))} con ${sele(p, c)} empatado 0 a 0 en los descuentos. El árbitro cobra penal en contra y el pateador toma carrera desde lejos.`,
    ],
    label: 'Atajar el penal',
    ok: [
      (p, c) => `La sacaste con una mano y todo ${c.nt.name} te aplaudió de pie. Ese día fuiste el muro.`,
      (p, c) => `Te tiraste a un costado y la sacaste con la yema de los dedos. La banca de ${c.nt.name} se levantó como si ya hubieran ganado el partido.`,
    ],
    half: [
      'Alcanzaste a rozarla con los guantes. No bastó, pero te aplaudieron el intento.',
      'Rozaste la pelota con los dedos y pegó en el palo. El rebote salió rápido y la defensa lo despejó a tiempo.',
    ],
    fail: [
      'Adivinaste mal y la pelota pasó a tu lado. Te quedaste mirando el techo del estadio.',
      'Te moviste tarde y el pateador la clavó por el medio. La cara del técnico lo dijo todo.',
    ] },

  // ---------- Mediocampista: pase filtrado ----------
  { kind: 'pase', pos: 'MED', sit: 'liga', title: 'El pase que define el torneo',
    text: [
      (p, c) => `Final del torneo y ${club(p, c)} necesita un gol. Recibís de espaldas, girás y ves al delantero desmarcándose entre los centrales. Si ponés el pase justo, queda solo.`,
      (p, c) => `Última fecha del torneo y el empate se hace eterno. Recibís de espaldas y ves a tu extremo corriendo por afuera. Un pase al lugar justo puede cambiarlo todo.`,
    ],
    label: 'Filtrar el pase',
    ok: [
      'Lo dejaste servido con un pase al hueco. El delantero solo tuvo que empujarla. Todos te señalaron.',
      'Lo viste antes que nadie y la pelota le llegó al pie, perfecta. La tribuna se levantó como un solo hombre.',
    ],
    half: [
      'Pasaste largo y el delantero tuvo que estirarse. La jugada se murió en el lateral.',
      'El pase fue un poco corto y un defensor llegó antes. La jugada sigue viva, aunque por poco.',
    ],
    fail: [
      'Un defensa se la llevó antes de que llegara. Te miraron y bajaste los brazos.',
      'Pasaste con demasiada fuerza y la pelota se fue por la línea de fondo. Tu extremo levantó los brazos sin entender.',
    ] },
  { kind: 'pase', pos: 'MED', sit: 'clasico', title: 'Pase filtrado en el clásico',
    text: [
      (p, c) => `Clásico contra ${rival(p, c)} y la defensa rival está ordenada. Levantás la cabeza y ves un hueco entre dos defensas para meter un pase filtrado a favor de ${club(p, c)}.`,
      (p, c) => `Clásico contra ${rival(p, c)} y el partido se pone nervioso. Tenés el balón en la mitad de la cancha y tu punta te pide la pelota a la espalda del lateral rival.`,
    ],
    label: 'Filtrar el pase',
    ok: [
      'Pasó entre los dos defensas como si fuera con hilo. La tribuna entera se puso de pie.',
      (p, c) => `Pasó rasante, sin que nadie la tocara, y tu punta definió con frialdad. La hinchada de ${club(p, c)} explotó.`,
    ],
    half: [
      'Pasaste largo y el compañero no alcanzó a llegar. Faltó puntería.',
      'El pase fue un poco fuerte y tu compañero quedó con el cuerpo cruzado. La jugada murió en la banda.',
    ],
    fail: [
      'Se la regalaste al rival en pleno clásico. Tu técnico se agarró la cabeza.',
      'Un defensa rival se metió en el medio y te la quitó. Se escuchó un murmullo que llegó hasta la cabina de prensa.',
    ] },
  { kind: 'pase', pos: 'MED', sit: 'seleccion', title: (p, c) => `Pase filtrado con ${c.nt.ntName}`,
    text: [
      (p, c) => `${cap(partido(p, c))} con ${sele(p, c)} y el partido está cerrado. Te llega el balón en el medio, el delantero se desmarca y te dan unos segundos para pensar.`,
      (p, c) => `${cap(partido(p, c))} con ${sele(p, c)} y el rival se encierra con todos atrás. Te llega la pelota de frente al arco, con un segundo para mirar. Elegí bien.`,
    ],
    label: 'Filtrar el pase',
    ok: [
      (p, c) => `Un pase de lujo que dejó a tu delantero cara a cara con el arco. La afición ${de(c.nt.ntName)} te ovacionó.`,
      'Viste el espacio antes que nadie y mandaste la pelota justo ahí. Tu delantero entró solo y la tribuna se puso de pie.',
    ],
    half: [
      'El pase fue un poco largo y el compañero llegó con lo justo. La jugada quedó en un córner.',
      'El pase salió un poco corto y el delantero tuvo que frenar. La jugada se diluyó junto a la banda.',
    ],
    fail: [
      'El defensa lo cortó fácil. Con la Selección no hay muchas segundas oportunidades.',
      (p, c) => `El rival te cortó el pase en el peor momento. La tribuna ${de(c.nt.ntName)} quedó en silencio.`,
    ] },

  // ---------- Defensa: cierre o barrida ----------
  { kind: 'cierre', pos: 'DEF', sit: 'liga', title: 'Cierre del contraataque en la final',
    text: [
      (p, c) => `Final del torneo y ${club(p, c)} se fue arriba. El rival arranca un contraataque con espacio y solo vos estás entre su delantero y el arco. Tenés que llegar a tiempo.`,
      (p, c) => `Última fecha del torneo y ${club(p, c)} gana por la mínima. El rival recupera en el medio y sale con la pelota controlada. Te toca frenarlo antes del área.`,
    ],
    label: 'Cerrar la jugada',
    ok: [
      'Llegaste justo y le sacaste el balón limpio. El estadio te agradeció con un aplauso.',
      'Leíste el pase, te adelantaste y le cortaste el camino. Un despeje que valió oro.',
    ],
    half: [
      'Alcanzaste a desviarlo, pero el balón quedó suelto en el área. Se respiró cuando el portero lo agarró.',
      'Llegaste al hombro del rival y el remate salió desviado. Respiraste hondo mientras tus compañeros se acomodaban.',
    ],
    fail: [
      'Te ganó la carrera y quedó mano a mano. Solo pudiste mirar cómo se iba.',
      'Te quedaste a mitad de camino y el rival te pasó por el costado. Definió con calma y la tribuna se quedó helada.',
    ] },
  { kind: 'cierre', pos: 'DEF', sit: 'clasico', title: 'La barrida en el clásico',
    text: [
      (p, c) => `Clásico contra ${rival(p, c)} y el delantero se escapa por la banda. Te lanzás a correr: tenés que barrer en el momento exacto, ni antes ni después.`,
      (p, c) => `Clásico contra ${rival(p, c)}, con la hinchada rival haciendo ruido. Un delantero se escapa por tu banda y se mete hacia el área. Tenés una sola chance: lanzarte al suelo en el momento justo.`,
    ],
    label: 'Barrerte',
    ok: [
      'Te tiraste al piso y le sacaste el balón sin tocarlo a él. Perfecto. La tribuna cantó tu nombre.',
      (p, c) => `Te deslizaste con la pierna extendida y la pelota salió limpia de sus pies. La hinchada de ${club(p, c)} te ovacionó.`,
    ],
    half: [
      'Llegaste con la punta del botín y apenas lo desviaste. Fue suficiente para que se apagara la jugada.',
      'Alcanzaste a tocar la pelota con la punta del pie y cambió de dirección. Se salvó el arco por poco.',
    ],
    fail: [
      'Te tiraste antes de tiempo y el delantero te saltó. Desde el banco no podían creerlo.',
      'Llegaste medio segundo tarde y el delantero te dejó atrás con un toque. Te quedaste en el piso, sin reacción.',
    ] },
  { kind: 'cierre', pos: 'DEF', sit: 'seleccion', title: (p, c) => `Cierre en el último minuto con ${c.nt.ntName}`,
    text: [
      (p, c) => `${cap(partido(p, c))} con ${sele(p, c)} y el rival sale en el último minuto con espacio por tu lado. Corrés hacia él con el corazón en la boca.`,
      (p, c) => `${cap(partido(p, c))} con ${sele(p, c)} y el rival tiene un contraataque con dos hombres contra uno. Vos sos el último defensor. Cerrá el carril sin regalar nada.`,
    ],
    label: 'Cerrar la jugada',
    ok: [
      (p, c) => `Le cortaste el pase con una barrida perfecta. ${c.nt.name} entera respiró aliviada y los compañeros vinieron a abrazarte.`,
      'Lo dejaste sin espacio y le robaste la pelota en el momento justo. El banco saltó del asiento y la defensa entera te felicitó.',
    ],
    half: [
      'Lo desviaste con la punta de la bota, pero el balón siguió vivo. Se salvó por un pelo.',
      'Llegaste de costado y lo empujaste hacia afuera. El remate salió flojo y el arquero lo agarró sin apuros.',
    ],
    fail: [
      'Llegaste tarde y el rival quedó con espacio. Esa imagen se te quedó dando vueltas toda la noche.',
      'Llegaste un paso tarde y el rival te pasó con un amague. En el vestuario nadie te dijo nada, y eso pesó más.',
    ] },
];

export const MINIJUEGOS_EVENTS: EventTemplate[] = DEFS.map((d) => ({
  id: `mj_${d.kind}_${d.sit}`,
  category: 'minijuego',
  title: (p, c) => txt(d.title, p, c),
  text: (p, c) => pick(d.text, p, c),
  cooldown: 2,
  when: (p, c) =>
    p.age >= 18 &&
    p.seasons.length >= 2 &&
    p.setup.position === d.pos &&
    (d.sit === 'clasico' ? rivalOf(c) !== null : d.sit === 'seleccion' ? mayor(p) : true),
  minigame: (p, c) => ({ kind: d.kind, importance: d.sit === 'liga' ? (c.tier === 1 || c.abroad ? 3 : 2) : d.sit === 'seleccion' ? (c.qualifiers ? 3 : 2) : 2 }),
  options: (p, c) => {
    const e = EFECTOS[d.sit];
    const hito = d.gol ? { natGoals: 1, milestone: `${d.gol} con ${c.nt.name}` } : {};
    // p = 0 en los tres: el motor elige el desenlace por el resultado de la jugada, no por sorteo. La variante de texto sale de la paridad (pick).
    return [opt(d.label, o(0, pick(d.ok, p, c), { ...e.ok, ...hito }), o(0, pick(d.half, p, c), e.half), o(0, pick(d.fail, p, c), e.fail))];
  },
}));
