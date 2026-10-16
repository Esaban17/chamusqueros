// Ayudante de scripts/continuar-carrera.test.ts (no es una prueba): la política de juego fija y el cierre de una carrera.
// Como programa (un proceso nuevo del intérprete, con la memoria de ritmo.ts vacía como en una página recién abierta) lee de la entrada estándar
// `{"texto": <carrera guardada>, "mult": n}`, la restaura con `leer` y la juega hasta el retiro con la misma política; imprime el resultado en JSON.
import { pathToFileURL } from 'node:url';
import { Career, summarize } from '../src/engine/engine';
import { leer } from '../src/engine/guardado';
import { CATALOGO, validar, contratadoDe, type Rol } from '../src/engine/tienda';
import { countryOf } from '../src/engine/countries';
import type { Mode, PlayerSetup, Position, Resolution } from '../src/engine/types';

/** Puntaje que obtiene el jugador en todo minijuego. */
export const PUNTAJE_MINIJUEGO = 0.55;
export type Guardar = (c: Career, desenlace: Resolution | null) => void;

export function crearSetup(mode: Mode, position: Position, country: string): PlayerSetup {
  return {
    firstName: 'Ana', lastName: 'Ruiz', country, dept: countryOf(country).regions[0], position, foot: 'Derecho', number: 9, mode,
    avatar: { skin: 1, hair: 2, hairColor: 1, beard: 0, extra: 0 },
  };
}

/**
 * La tienda según el estado (no según en qué pantalla se esté, para que retomar desde cualquier punto de guardado dé lo mismo):
 * compra el bien más caro que alcance, contrata al profesional de más estrellas que alcance y se da una salida social por año.
 * Cada compra o contratación es un punto de guardado.
 */
function tienda(c: Career, res: Resolution | null, guardar: Guardar) {
  const p = c.player;
  for (;;) {
    const bien = CATALOGO.filter((i) => i.categoria !== 'social' && i.categoria !== 'personal')
      .sort((a, b) => b.precio - a.precio)
      .find((i) => validar(p, c.saldo, i.id, 'comprar').ok);
    if (!bien) break;
    c.buy(bien.id);
    guardar(c, res);
  }
  for (;;) {
    const pro = CATALOGO.filter((i) => i.categoria === 'personal')
      .sort((a, b) => b.precio - a.precio)
      .find((i) => i.estrellas > (contratadoDe(p, i.espacio as Rol)?.estrellas ?? 0) && validar(p, c.saldo, i.id, 'contratar').ok && c.preview(i.id)?.alcanza);
    if (!pro) break;
    c.hire(pro.id);
    guardar(c, res);
  }
  const sale = p.compras.some((x) => x.year === p.year && x.id.startsWith('social-'));
  const social = !sale && CATALOGO.filter((i) => i.categoria === 'social').sort((a, b) => b.precio - a.precio).find((i) => validar(p, c.saldo, i.id, 'comprar').ok);
  if (social) {
    c.buy(social.id);
    guardar(c, res);
  }
}

/**
 * Juega la carrera hasta el retiro como lo hace src/main.ts: guarda al mostrar cada pantalla de juego (b), al resolver un minijuego (c) y tras cada
 * compra (d). Si `c` viene de una carrera retomada, `res` es su desenlace guardado. Las elecciones dependen solo del estado: (temporadas * mult + n) % opciones.
 */
export function jugar(c: Career, res: Resolution | null, guardar: Guardar, mult = 7) {
  if (!c.pendingEvent && !res && !c.isOver && !c.player.seasons.length) c.start(); // "Arrancar la carrera"
  for (let i = 0; i < 5000; i++) {
    guardar(c, res); // gameScreen()
    const ev = c.pendingEvent;
    if (res) {
      if (c.isOver) return;
      c.advance(); // "Seguir"; el resumen de la temporada no es un punto de guardado
      if (c.isOver) return; // el resumen lleva directo a la pantalla final
      res = null;
    } else if (!ev) {
      if (c.isOver) return;
      c.advance();
      if (c.isOver) return;
    } else if (ev.minigame) {
      res = c.choose(0, PUNTAJE_MINIJUEGO);
      guardar(c, res);
    } else {
      tienda(c, res, guardar);
      res = c.choose((c.player.seasons.length * mult + (c.progreso?.n ?? 0) * 3) % ev.options.length);
    }
  }
  throw new Error('la carrera no termina');
}

/** Todo lo que sale de una carrera terminada: el jugador completo, el resumen, el veredicto y lo que se envía al ranking. */
export function resultadoDe(c: Career) {
  const p = c.player;
  const s = summarize(p);
  return {
    player: p, resumen: s,
    ranking: {
      name: `${p.setup.firstName} ${p.setup.lastName}`.trim(), score: s.score, titles: s.titles.length, caps: p.caps,
      card: { pos: p.setup.position, ovr: p.peakRating, club: p.seasons.at(-1)?.clubId ?? p.clubId, dept: p.setup.dept, foot: p.setup.foot, apps: s.apps, goals: s.goals, assists: s.assists, country: c.nt.code },
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let entrada = '';
  for await (const trozo of process.stdin) entrada += trozo;
  const { texto, mult } = JSON.parse(entrada) as { texto: string; mult: number };
  const g = leer(texto);
  if (!g) {
    process.stdout.write(JSON.stringify({ error: 'no se pudo leer' }));
    process.exit(0);
  }
  jugar(g.career, g.desenlace, () => {}, mult);
  process.stdout.write(JSON.stringify(resultadoDe(g.career)));
}
