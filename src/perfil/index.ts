// STUB del bloque B para "Mi perfil": el bloque D lo reemplaza con la pantalla real. Al fusionar gana el archivo de D;
// la firma es la del plan: `montarPerfil(app, alSalir)`.
import { h } from '../retos/comun';

export function montarPerfil(app: HTMLElement, alSalir: () => void): void {
  const volver = h('button', { type: 'button', class: 'btn big' }, 'Volver');
  volver.onclick = alSalir;
  app.replaceChildren(h('main', { class: 'rt-main' }, h('h1', { tabindex: '-1' }, 'Mi perfil'), h('p', {}, 'Esta pantalla todavía no está disponible.'), volver));
}
