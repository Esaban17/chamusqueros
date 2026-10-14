// Avatar de un jugador en línea como nodo del DOM (sin pasar por marcado): el SVG sale de avatarSVG (solo números de listas fijas) y se
// convierte con DOMParser. El mismo dibujo del resto del juego (RF-29).
import { DEFAULT_AVATAR, NT_KIT, avatarSVG } from '../../ui/avatar';
import { h } from '../comun';
import type { AvatarCodigo } from './protocolo';

const entero = (n: number, max: number) => Math.min(max, Math.max(0, Math.trunc(n) || 0));

/** `span` redondo y decorativo (aria-hidden) con el avatar; sin código, el de siempre. */
export function nodoAvatar(a: AvatarCodigo | null, tam = 40): HTMLElement {
  const av = a
    ? { skin: entero(a[0], 5), hair: entero(a[1], 7), hairColor: entero(a[2], 5), beard: entero(a[3], 4), extra: entero(a[4], 3) }
    : DEFAULT_AVATAR;
  const svg = new DOMParser().parseFromString(avatarSVG(av, NT_KIT, a ? entero(a[5], 99) : 10, tam), 'image/svg+xml').documentElement;
  const caja = h('span', { class: 'rt-avatar', 'aria-hidden': 'true' });
  caja.style.width = caja.style.height = `${tam}px`;
  caja.append(document.importNode(svg, true));
  return caja;
}
