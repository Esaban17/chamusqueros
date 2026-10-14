// Pantalla de la tienda (specs/tienda): tiendaHtml es pura (se prueba sin DOM) y bindTienda le pone los eventos.
// La interfaz no calcula nada: pregunta al motor (validar, preview, buy, hire, fire) y muestra lo que responde.
import type { Career } from '../engine/engine';
import { CATALOGO, CATEGORIAS, contratadoDe, contratados, destacadas, estrellasTexto, itemById, poseidos, tarifaTotal, validar, type Espacio, type Item, type Rol } from '../engine/tienda';
import type { Player } from '../engine/types';
import { esc } from './esc';

/** Íconos de 24x24 (stroke, sin relleno), en el estilo de ICON de palmares.ts. */
export const ICONO_TIENDA: Record<Espacio, string> = {
  vivienda: '<path d="M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-5h4v5"/>',
  carro: '<path d="M5 17H3v-5l2-5h14l2 5v5h-2M5 12h14M9 17h6"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  helicoptero: '<path d="M3 5h18M12 5v3M4 14a6 6 0 0 1 6-6h3a5 5 0 0 1 5 5v2H5a1 1 0 0 1-1-1zM18 15l4-2M7 19h9"/>',
  avion: '<path d="M12 3c1 0 1.5 1 1.5 2.5V10l8 4v2l-8-1.5V19l2 1.5V22L12 21l-3.5 1v-1.5l2-1.5v-4.5L2.5 16v-2l8-4V5.5C10.5 4 11 3 12 3z"/>',
  yate: '<path d="M3 15h18l-3 5H6zM12 3v12M12 4l6 9h-6M12 7l-5 6h5"/>',
  entrenador: '<circle cx="9" cy="15" r="5"/><path d="M13 12l8-6v5l-6 3M9 12v3"/>',
  chef: '<path d="M7 14a4 4 0 1 1 1.5-7.7A4 4 0 0 1 15.5 6.3 4 4 0 1 1 17 14M7 14v6h10v-6M7 17h10"/>',
  fisio: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  asistente: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11h6M9 15h6"/>',
  social: '<path d="M4 20l5-14 9 9zM14 4v3M18 7h3M19 11l2-1M6 3v2"/>',
};

export interface EstadoTienda {
  /** Ítem con la confirmación abierta. */
  sel: string | null;
  /** Último aviso (lo que se compró, un rechazo o un despido). */
  aviso: string;
  /** Categorías desplegadas: se conservan al volver a dibujar. */
  abiertas: string[];
}
export const estadoInicial = (): EstadoTienda => ({ sel: null, aviso: '', abiertas: ['vivienda'] });

const icono = (e: Espacio) => `<svg class="t-ico" aria-hidden="true" viewBox="0 0 24 24">${ICONO_TIENDA[e]}</svg>`;
const estrellas = (n: number) => `<span class="t-stars" role="img" aria-label="${n} de 5 estrellas">${estrellasTexto(n)}</span>`;
const modoDe = (i: Item) => (i.categoria === 'personal' ? 'contratar' : 'comprar');

function tarjeta(c: Career, i: Item, estado: EstadoTienda, cash: (q: number) => string): string {
  const personal = i.categoria === 'personal';
  const cabeza = `${icono(i.espacio)}<span class="t-info"><b class="t-nombre">${esc(i.nombre)}</b>${estrellas(i.estrellas)}<small>${esc(i.resumen)}</small></span>`;
  const precio = `${esc(cash(i.precio))}${personal ? ' por temporada' : ''}`;
  const pv = estado.sel === i.id ? c.preview(i.id) : null;
  if (pv) {
    const aviso = [
      !pv.alcanza ? `Con este saldo no podrías pagar a tu personal: ${cash(pv.tarifas)} por temporada. Si no alcanza, deja de trabajar con vos.` : '',
      pv.abuso ?? '',
    ].filter(Boolean);
    return `<li class="t-item t-confirm">
      <div class="t-fila">${cabeza}</div>
      <p class="t-dato">${personal ? 'Tarifa' : 'Precio'}: <b>${precio}</b></p>
      <p class="t-dato">Saldo después: <b>${esc(cash(pv.saldoDespues))}</b>${personal ? ' (la tarifa se cobra al cierre de cada temporada)' : ''}</p>
      ${aviso.map((a) => `<p class="t-aviso">${esc(a)}</p>`).join('')}
      <div class="row"><button class="btn" data-act="confirmar" data-id="${esc(i.id)}">Confirmar</button><button class="btn secondary" data-act="cancelar">Cancelar</button></div>
    </li>`;
  }
  const v = validar(c.player, c.saldo, i.id, modoDe(i));
  const boton = v.ok
    ? `<button class="btn t-btn" data-act="elegir" data-id="${esc(i.id)}">${personal ? (contratadoDe(c.player, i.espacio as Rol) ? 'Cambiar a este nivel' : 'Contratar') : 'Comprar'}</button>`
    : `<button class="btn secondary t-btn" disabled>${v.causa === 'tiene' ? (personal ? 'Contratado' : 'Lo tenés') : 'No alcanza'}</button>`;
  return `<li class="t-item${!v.ok && v.causa === 'tiene' ? ' t-tiene' : ''}">
    <div class="t-fila">${cabeza}<span class="t-precio">${precio}</span></div>
    ${v.ok ? '' : `<p class="t-motivo">${esc(v.motivo)}</p>`}
    ${boton}
  </li>`;
}

/** Pantalla completa de la tienda, de arriba hacia abajo: saldo, lo que se tiene y las cinco categorías. cash: monto en la moneda de la nacionalidad. */
export function tiendaHtml(c: Career, estado: EstadoTienda, cash: (quetzales: number) => string): string {
  const p = c.player;
  const tengo = poseidos(p);
  const personal = contratados(p);
  const volver = '<button class="btn big" data-act="volver">Volver al juego</button>';
  return `<div id="tienda" class="tienda">
    <section class="panel">
      <span class="eyebrow">Tienda de estilo de vida</span>
      <p class="money-total">${esc(cash(c.saldo))}</p>
      <p class="meta">Tu saldo: lo ganado menos lo gastado. Gastar acá mueve poco: es para vivir mejor, no para jugar mejor.</p>
    </section>
    ${estado.aviso ? `<p class="t-banner" role="status" tabindex="-1">${esc(estado.aviso)}</p>` : '<p class="t-banner t-vacio" role="status" tabindex="-1"></p>'}
    ${volver}
    <section class="panel">
      <span class="eyebrow">Lo que tenés</span>
      ${tengo.length || personal.length
        ? `<ul class="t-tengo">
          ${tengo.map((i) => `<li>${icono(i.espacio)}<span class="t-info"><b>${esc(i.nombre)}</b>${estrellas(i.estrellas)}</span></li>`).join('')}
          ${personal.map((i) => `<li>${icono(i.espacio)}<span class="t-info"><b>${esc(i.nombre)}</b>${estrellas(i.estrellas)}<small>${esc(cash(i.precio))} por temporada</small></span><button class="btn secondary small" data-act="despedir" data-rol="${esc(i.espacio)}">Dejar de trabajar juntos</button></li>`).join('')}
        </ul>${personal.length ? `<p class="meta">Tarifa total del personal: <b>${esc(cash(tarifaTotal(p)))}</b> por temporada, al cierre de cada una.</p>` : ''}`
        : '<p class="season-empty">Todavía no tenés nada. Lo que ganás en la carrera se puede gastar acá.</p>'}
    </section>
    ${CATEGORIAS.map(([cat, nombre]) => `<details class="panel t-cat" data-cat="${cat}"${estado.abiertas.includes(cat) ? ' open' : ''}>
      <summary><span class="eyebrow">${esc(nombre)}</span></summary>
      <ul class="t-lista">${CATALOGO.filter((i) => i.categoria === cat).map((i) => tarjeta(c, i, estado, cash)).join('')}</ul>
    </details>`).join('')}
    ${volver}
  </div>`;
}

/** "Mansión ★★★★★ · Yate ★★★": lo más importante que compró, ya escapado. Vacío si no compró nada. */
export const comprasDestacadasHtml = (p: Player) => destacadas(p).map((i) => `${esc(i.nombre)} <span class="t-stars" role="img" aria-label="${i.estrellas} de 5 estrellas">${'★'.repeat(i.estrellas)}</span>`).join(' · ');

/** Eventos de la tienda (delegados en su raíz, que se vuelve a crear en cada dibujo). redraw: vuelve a dibujar con el estado nuevo. */
export function bindTienda(root: HTMLElement, c: Career, estado: EstadoTienda, redraw: () => void, volver: () => void) {
  root.addEventListener('toggle', (e) => {
    const d = e.target as HTMLElement;
    const cat = d.dataset.cat;
    if (!cat) return;
    const abierta = (d as HTMLDetailsElement).open;
    estado.abiertas = abierta ? [...new Set([...estado.abiertas, cat])] : estado.abiertas.filter((x) => x !== cat);
  }, true);
  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');
    if (!b || b.disabled) return;
    const id = b.dataset.id ?? '';
    switch (b.dataset.act) {
      case 'volver':
        return volver();
      case 'elegir':
        estado.sel = id;
        estado.aviso = '';
        break;
      case 'cancelar':
        estado.sel = null;
        break;
      case 'confirmar': {
        const res = itemById(id)?.categoria === 'personal' ? c.hire(id) : c.buy(id);
        estado.aviso = res.ok ? `${res.text}${res.changes.length ? ` Cambios: ${res.changes.join(', ')}.` : ''}` : res.motivo;
        estado.sel = null;
        break;
      }
      case 'despedir': {
        const rol = b.dataset.rol as Rol;
        const antes = contratadoDe(c.player, rol);
        estado.aviso = c.fire(rol) && antes ? `${antes.nombre} dejó de trabajar con vos. Ya no se le paga ni aplica sus efectos.` : '';
        break;
      }
      default:
        return;
    }
    redraw();
    // El dibujo nuevo reemplaza todo el HTML: sin esto el teclado pierde el foco.
    const foco = estado.sel ? '[data-act="confirmar"]' : '.t-banner';
    document.querySelector<HTMLElement>(foco)?.focus({ preventScroll: !estado.sel });
  });
}
