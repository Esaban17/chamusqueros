// Editor de avatar: lo usan el formulario de nueva carrera (main.ts) y la pantalla "Mi perfil" (perfil/index.ts).
// Se extrajo de createForm sin cambiar el HTML que produce. El dibujo de la vista previa lo hace quien lo monta (`alCambiar`),
// porque la camisola y el dorsal dependen de la pantalla.
import type { Avatar } from '../engine/types';
import { BEARD_STYLES, EXTRAS, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, randomAvatar } from './avatar';

function swatches(name: string, colors: string[], selected: number, labels?: string[]) {
  return `<div class="swatches" role="radiogroup">${colors
    .map((c, i) => `<input type="radio" name="${name}" id="${name}-${i}" value="${i}" ${i === selected ? 'checked' : ''}>
      <label for="${name}-${i}" style="--sw:${c}" title="${labels?.[i] ?? ''}"><span class="sr">${labels?.[i] ?? `Tono ${i + 1}`}</span></label>`)
    .join('')}</div>`;
}

function cycler(key: keyof Avatar, options: string[], value: number) {
  return `<div class="cycler" data-key="${key}">
    <button type="button" class="cy-btn" data-dir="-1" aria-label="Anterior">‹</button>
    <output id="cy-${key}">${options[value]}</output>
    <button type="button" class="cy-btn" data-dir="1" aria-label="Siguiente">›</button>
  </div>`;
}

/** El HTML del editor (vista previa `#avatarPreview` y controles). Los valores de `avatar` son índices ya validados. */
export function avatarEditorHtml(avatar: Avatar) {
  return `<div class="avatar-editor">
        <div class="avatar-preview" id="avatarPreview"></div>
        <div class="avatar-controls">
          <div class="field"><span class="label">Piel</span>${swatches('skin', SKIN_TONES, avatar.skin)}</div>
          <div class="field"><span class="label">Pelo</span>${cycler('hair', HAIR_STYLES, avatar.hair)}</div>
          <div class="field"><span class="label">Color de pelo</span>${swatches('hairColor', HAIR_COLORS.map((h) => h[1]), avatar.hairColor, HAIR_COLORS.map((h) => h[0]))}</div>
          <div class="field"><span class="label">Barba</span>${cycler('beard', BEARD_STYLES, avatar.beard)}</div>
          <div class="field"><span class="label">Accesorio</span>${cycler('extra', EXTRAS, avatar.extra)}</div>
          <button type="button" class="btn secondary small" id="shuffle">Avatar al azar</button>
        </div>
      </div>`;
}

/** Código de avatar del servidor ([piel, pelo, color, barba, extra, dorsal]) a `Avatar`; null si algo cae fuera de las listas del juego (A03). */
export function avatarDeCodigo(v: unknown): { avatar: Avatar; dorsal: number } | null {
  if (!Array.isArray(v) || v.length !== 6) return null;
  const max = [SKIN_TONES.length, HAIR_STYLES.length, HAIR_COLORS.length, BEARD_STYLES.length, EXTRAS.length];
  for (let i = 0; i < 5; i++) if (!Number.isInteger(v[i]) || v[i] < 0 || v[i] >= max[i]) return null;
  if (!Number.isInteger(v[5]) || v[5] < 1 || v[5] > 99) return null;
  return { avatar: { skin: v[0], hair: v[1], hairColor: v[2], beard: v[3], extra: v[4] }, dorsal: v[5] };
}

/** Conecta los controles de `raiz` con `avatar` (se modifica en el lugar) y llama a `alCambiar` tras cada cambio. */
export function montarEditorAvatar(raiz: ParentNode, avatar: Avatar, alCambiar: () => void) {
  const sync = () => {
    (['skin', 'hairColor'] as const).forEach((k) => {
      const input = raiz.querySelector<HTMLInputElement>(`#${k}-${avatar[k]}`);
      if (input) input.checked = true;
    });
    raiz.querySelector('#cy-hair')!.textContent = HAIR_STYLES[avatar.hair];
    raiz.querySelector('#cy-beard')!.textContent = BEARD_STYLES[avatar.beard];
    raiz.querySelector('#cy-extra')!.textContent = EXTRAS[avatar.extra];
    alCambiar();
  };
  raiz.querySelectorAll<HTMLInputElement>('input[name="skin"], input[name="hairColor"]').forEach((input) => {
    input.onchange = () => {
      avatar[input.name as 'skin' | 'hairColor'] = Number(input.value);
      alCambiar();
    };
  });
  const lists: Record<string, string[]> = { hair: HAIR_STYLES, beard: BEARD_STYLES, extra: EXTRAS };
  raiz.querySelectorAll<HTMLElement>('.cycler').forEach((el) => {
    const key = el.dataset.key as 'hair' | 'beard' | 'extra';
    el.querySelectorAll<HTMLButtonElement>('.cy-btn').forEach((b) => {
      b.onclick = () => {
        const n = lists[key].length;
        avatar[key] = (avatar[key] + Number(b.dataset.dir) + n) % n;
        sync();
      };
    });
  });
  raiz.querySelector<HTMLElement>('#shuffle')!.onclick = () => {
    Object.assign(avatar, randomAvatar());
    sync();
  };
}
