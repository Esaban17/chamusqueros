// Ranking de Retos (RF-25, RF-29): los 50 primeros y la posición propia si quedó fuera, con avatar, apodo, puntos y victorias.
// La respuesta del servidor no trae identificadores; aquí tampoco se muestra ninguno. Todo texto con h()/textContent.
import { h } from '../comun';
import { nodoAvatar } from './avatar';
import { ErrorCliente, ranking } from './cliente';
import type { FilaRankingRetos, RankingRetos } from './protocolo';
import type { Shell } from './shell';

function fila(f: FilaRankingRetos): HTMLElement {
  return h('tr', { class: f.yo ? 'rt-yo' : '' },
    h('td', { class: 'rt-r-pos' }, String(f.pos)),
    h('td', {}, h('div', { class: 'rt-r-jug' }, nodoAvatar(f.avatar, 32), h('span', { class: 'rt-r-nombre' }, f.apodo, ...(f.yo ? [h('span', { class: 'rt-tag' }, 'Vos')] : [])))),
    h('td', { class: 'rt-r-num' }, String(f.puntos)),
    h('td', { class: 'rt-r-num' }, String(f.victorias)));
}

function tabla(r: RankingRetos): HTMLElement {
  const dentro = r.yo && r.top.some((x) => x.pos === r.yo!.pos);
  return h('table', { class: 'rt-rank' },
    h('caption', { class: 'sr' }, 'Ranking de Retos: los 50 con más puntos'),
    h('thead', {}, h('tr', {},
      h('th', { scope: 'col' }, h('abbr', { title: 'Posición' }, '#')), h('th', { scope: 'col' }, 'Jugador'), h('th', { scope: 'col' }, 'Puntos'),
      h('th', { scope: 'col' }, h('abbr', { title: 'Victorias' }, 'V')))),
    h('tbody', {},
      ...r.top.map(fila),
      ...(r.yo && !dentro ? [h('tr', { class: 'rt-r-corte' }, h('td', { colspan: '4', 'aria-label': 'Más abajo' }, '…')), fila(r.yo)] : [])));
}

/** `alVolver` decide a dónde se vuelve (la entrada de Retos o la sala de la que se vino). */
export async function pantallaRanking(sh: Shell, alVolver: () => void = () => sh.entrada()): Promise<void> {
  const volver = sh.boton('Volver', alVolver, 'btn secondary');
  const nota = h('p', { class: 'rt-ayuda' }, 'Suman solo las partidas en línea terminadas. Las del mismo celular no cuentan.');
  const main = sh.pantalla(sh.titulo('Ranking de Retos'), h('p', { role: 'status' }, 'Cargando…'), volver);
  try {
    const r = await ranking();
    if (!main.isConnected) return;
    sh.pantalla(
      sh.titulo('Ranking de Retos'),
      r.top.length ? tabla(r) : h('p', { class: 'rt-intro' }, 'Todavía no hay nadie con puntos. Jugá una partida en línea y abrí el ranking.'),
      nota, volver);
  } catch (e) {
    if (!main.isConnected) return;
    const msg = e instanceof ErrorCliente ? e.message : 'No se pudo cargar el ranking.';
    sh.pantalla(sh.titulo('Ranking de Retos'), h('p', { role: 'alert' }, msg), sh.boton('Reintentar', () => void pantallaRanking(sh, alVolver)), volver);
  }
}
