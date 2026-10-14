import { MODE_SEASONS, type Effects, type EventContext, type EventTemplate, type MinigameKind, type Player, type Position } from '../types';
import { o, opt, has, cap, de, rivalOf } from '../helpers';

// Minijuegos (specs/minijuegos): 4 tipos, uno por posición, x 3 situaciones = 12 plantillas.
// Cada una es una decisión de una sola opción ("jugarla") con tres desenlaces, en este orden fijo: [éxito, a medias, fallo].
// El motor (choose) elige el desenlace con el resultado de la jugada; la interfaz (ui/minigames.ts) la pone a jugar.
// Banderas: mj_<tipo>_<situación> guarda el año en que salió (el tope de 3 y el espaciado leen esos años).
// Los desenlaces solo mueven nivel, fama y ánimo (y un gol y un hito de texto con la Selección): sin títulos, traspasos ni retiros.

/** Perilla de frecuencia: multiplica el peso de las 12 plantillas (ver "Frecuencia" del plan). */
export const PESO_MJ = 8; // ponytail: calibrado con 5.000 carreras (normal: 1,04 por carrera); más peso sube la media pero cada plantilla sale una sola vez, así que el techo es bajo
/** Empuje suave hacia el primer minijuego: cada año sobre los 20 sin ninguno sube el peso en esta fracción. */
const EMPUJE = 0.2;

const hechos = (p: Player) => Object.keys(p.flags).filter((k) => k.startsWith('mj_'));
const ultimoAnio = (p: Player) => Math.max(0, ...hechos(p).map((k) => p.flags[k]));
/** Nunca más de 3 por carrera y nunca en dos decisiones seguidas, aunque cambie el ritmo (las decisiones van una por bloque). */
const hayLugar = (p: Player) => hechos(p).length < 3 && p.year - ultimoAnio(p) > MODE_SEASONS[p.setup.mode];
const mayor = (p: Player) => p.ntLevel >= 1 && !has(p, 'sel_retirado');

type Situacion = 'liga' | 'clasico' | 'seleccion';
type Texto = string | ((p: Player, ctx: EventContext) => string);
const txt = (t: Texto, p: Player, ctx: EventContext) => (typeof t === 'function' ? t(p, ctx) : t);

interface Def {
  kind: MinigameKind;
  pos: Position;
  sit: Situacion;
  title: Texto;
  text: Texto;
  label: string;
  ok: Texto;
  half: Texto;
  fail: Texto;
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
    text: (p, c) => `Final del torneo y ${club(p, c)} pierde por un gol. El árbitro cobra penal a favor en el último minuto y el técnico te mira: el balón ya lo tenés vos.`,
    label: 'Patear el penal',
    ok: 'La clavaste pegada al palo. El estadio explota y tus compañeros te caen encima.',
    half: 'El portero la tocó y se fue al poste. Se te hizo un nudo en el estómago.',
    fail: 'Se te fue por arriba del arco. Te quedás mirando el césped.' },
  { kind: 'penal', pos: 'DEL', sit: 'clasico', title: 'Mano a mano en el clásico',
    text: (p, c) => `Clásico contra ${rival(p, c)}, partido trabado. Un pase largo te deja solo frente al portero y la tribuna de ${club(p, c)} se pone de pie.`,
    label: 'Definir el mano a mano',
    ok: 'Lo dejaste sentado y la picaste por encima. La tribuna se vino abajo.',
    half: 'El portero achicó bien y alcanzó a tapar con el pie. Casi.',
    fail: 'Pateaste desviado, con el arco abierto. Te agarraste la cabeza.' },
  { kind: 'penal', pos: 'DEL', sit: 'seleccion', title: (p, c) => `Penal con ${c.nt.ntName}`,
    text: (p, c) => `${cap(partido(p, c))} con ${sele(p, c)} y todo se define en el último minuto. Cobran penal y el capitán te da el balón: patea el que más confianza tenga.`,
    label: 'Patear el penal', gol: 'Definió un penal decisivo',
    ok: (p, c) => `La metiste raspando el palo y todo ${c.nt.name} gritó con vos. Te abrazaron hasta que casi no podías respirar.`,
    half: 'El portero adivinó el lado y alcanzó a desviarla. Quedó la sensación de que estuvo cerca.',
    fail: 'La mandaste a las nubes. Pasaste el resto del partido sin levantar la cara.' },

  // ---------- Portero: atajar un penal ----------
  { kind: 'atajada', pos: 'POR', sit: 'liga', title: 'Penal en contra en la final',
    text: (p, c) => `Final del torneo y el árbitro cobra penal en contra de ${club(p, c)}. El delantero acomoda el balón y la afición contiene la respiración. Ahora el que decide sos vos.`,
    label: 'Atajar el penal',
    ok: 'Adivinaste el lado y la sacaste con la punta de los dedos. Tus compañeros corrieron a abrazarte.',
    half: 'Llegaste a rozarla, pero se coló pegada al palo. Faltó un centímetro.',
    fail: 'Te tiraste al lado contrario. El delantero la puso al otro rincón y se quedó mirando.' },
  { kind: 'atajada', pos: 'POR', sit: 'clasico', title: 'Tanda de penales en el clásico',
    text: (p, c) => `El clásico contra ${rival(p, c)} se va a los penales. La tanda está pareja y a ${club(p, c)} le toca atajar el siguiente. Caminás al arco con las manos sudadas.`,
    label: 'Atajar el penal',
    ok: 'Te lanzaste con todo y la desviaste al córner. La banca explotó.',
    half: 'La tocaste con la yema de los dedos, pero tuvo fuerza para entrar. Te dejó el sabor amargo.',
    fail: 'Te quedó cruzado el lado y la pelota entró lenta. Bajaste la mirada.' },
  { kind: 'atajada', pos: 'POR', sit: 'seleccion', title: (p, c) => `Penal en contra con ${c.nt.ntName}`,
    text: (p, c) => `${cap(partido(p, c))} con ${sele(p, c)} y el árbitro cobra penal a favor del rival en el último minuto. Ves al pateador, ves el arco y escuchás el himno en tu cabeza.`,
    label: 'Atajar el penal',
    ok: (p, c) => `La sacaste con una mano y todo ${c.nt.name} te aplaudió de pie. Ese día fuiste el muro.`,
    half: 'Alcanzaste a rozarla con los guantes. No bastó, pero te aplaudieron el intento.',
    fail: 'Adivinaste mal y la pelota pasó a tu lado. Te quedaste mirando el techo del estadio.' },

  // ---------- Mediocampista: pase filtrado ----------
  { kind: 'pase', pos: 'MED', sit: 'liga', title: 'El pase que define el torneo',
    text: (p, c) => `Final del torneo y ${club(p, c)} necesita un gol. Recibís de espaldas, girás y ves al delantero desmarcándose entre los centrales. Si ponés el pase justo, queda solo.`,
    label: 'Filtrar el pase',
    ok: 'Lo dejaste servido con un pase al hueco. El delantero solo tuvo que empujarla. Todos te señalaron.',
    half: 'Pasaste largo y el delantero tuvo que estirarse. La jugada se murió en el lateral.',
    fail: 'Un defensa se la llevó antes de que llegara. Te miraron y bajaste los brazos.' },
  { kind: 'pase', pos: 'MED', sit: 'clasico', title: 'Pase filtrado en el clásico',
    text: (p, c) => `Clásico contra ${rival(p, c)} y la defensa rival está ordenada. Levantás la cabeza y ves un hueco entre dos defensas para meter un pase filtrado a favor de ${club(p, c)}.`,
    label: 'Filtrar el pase',
    ok: 'Pasó entre los dos defensas como si fuera con hilo. La tribuna entera se puso de pie.',
    half: 'Pasaste largo y el compañero no alcanzó a llegar. Faltó puntería.',
    fail: 'Se la regalaste al rival en pleno clásico. Tu técnico se agarró la cabeza.' },
  { kind: 'pase', pos: 'MED', sit: 'seleccion', title: (p, c) => `Pase filtrado con ${c.nt.ntName}`,
    text: (p, c) => `${cap(partido(p, c))} con ${sele(p, c)} y el partido está cerrado. Te llega el balón en el medio, el delantero se desmarca y te dan unos segundos para pensar.`,
    label: 'Filtrar el pase',
    ok: (p, c) => `Un pase de lujo que dejó a tu delantero cara a cara con el arco. La afición ${de(c.nt.ntName)} te ovacionó.`,
    half: 'El pase fue un poco largo y el compañero llegó con lo justo. La jugada quedó en un córner.',
    fail: 'El defensa lo cortó fácil. Con la Selección no hay muchas segundas oportunidades.' },

  // ---------- Defensa: cierre o barrida ----------
  { kind: 'cierre', pos: 'DEF', sit: 'liga', title: 'Cierre del contraataque en la final',
    text: (p, c) => `Final del torneo y ${club(p, c)} se fue arriba. El rival arranca un contraataque con espacio y solo vos estás entre su delantero y el arco. Tenés que llegar a tiempo.`,
    label: 'Cerrar la jugada',
    ok: 'Llegaste justo y le sacaste el balón limpio. El estadio te agradeció con un aplauso.',
    half: 'Alcanzaste a desviarlo, pero el balón quedó suelto en el área. Se respiró cuando el portero lo agarró.',
    fail: 'Te ganó la carrera y quedó mano a mano. Solo pudiste mirar cómo se iba.' },
  { kind: 'cierre', pos: 'DEF', sit: 'clasico', title: 'La barrida en el clásico',
    text: (p, c) => `Clásico contra ${rival(p, c)} y el delantero se escapa por la banda. Te lanzás a correr: tenés que barrer en el momento exacto, ni antes ni después.`,
    label: 'Barrerte',
    ok: 'Te tiraste al piso y le sacaste el balón sin tocarlo a él. Perfecto. La tribuna cantó tu nombre.',
    half: 'Llegaste con la punta del botín y apenas lo desviaste. Fue suficiente para que se apagara la jugada.',
    fail: 'Te tiraste antes de tiempo y el delantero te saltó. Desde el banco no podían creerlo.' },
  { kind: 'cierre', pos: 'DEF', sit: 'seleccion', title: (p, c) => `Cierre en el último minuto con ${c.nt.ntName}`,
    text: (p, c) => `${cap(partido(p, c))} con ${sele(p, c)} y el rival sale en el último minuto con espacio por tu lado. Corrés hacia él con el corazón en la boca.`,
    label: 'Cerrar la jugada',
    ok: (p, c) => `Le cortaste el pase con una barrida perfecta. ${c.nt.name} entera respiró aliviada y los compañeros vinieron a abrazarte.`,
    half: 'Lo desviaste con la punta de la bota, pero el balón siguió vivo. Se salvó por un pelo.',
    fail: 'Llegaste tarde y el rival quedó con espacio. Esa imagen se te quedó dando vueltas toda la noche.' },
];

export const MINIJUEGOS_EVENTS: EventTemplate[] = DEFS.map((d) => ({
  id: `mj_${d.kind}_${d.sit}`,
  category: 'minijuego',
  title: (p, c) => txt(d.title, p, c),
  text: (p, c) => txt(d.text, p, c),
  once: true,
  // Peso como función, nunca un número >= 3: el motor lo trataría como paso de una ruta (prioridad y x3).
  weight: (p) => PESO_MJ * (hechos(p).length === 0 ? 1 + EMPUJE * Math.max(0, p.age - 20) : 1),
  when: (p, c) =>
    p.age >= 18 &&
    p.seasons.length >= 2 &&
    p.setup.position === d.pos &&
    hayLugar(p) &&
    (d.sit === 'clasico' ? rivalOf(c) !== null : d.sit === 'seleccion' ? mayor(p) : true),
  minigame: (p, c) => ({ kind: d.kind, importance: d.sit === 'liga' ? (c.tier === 1 || c.abroad ? 3 : 2) : d.sit === 'seleccion' ? (c.qualifiers ? 3 : 2) : 2 }),
  options: (p, c) => {
    const e = EFECTOS[d.sit];
    const hito = d.gol ? { natGoals: 1, milestone: `${d.gol} con ${c.nt.name}` } : {};
    // p se ignora en los tres: el motor elige el desenlace por posición, no por sorteo.
    return [opt(d.label, o(0, txt(d.ok, p, c), { ...e.ok, ...hito }), o(0, txt(d.half, p, c), e.half), o(0, txt(d.fail, p, c), e.fail))];
  },
}));
