// Google AdSense. Se activa al definir VITE_ADSENSE_CLIENT (ca-pub-...) en el archivo .env.
// Sin ID de editor, en desarrollo y en la vista previa se muestra un recuadro que marca dónde irá el anuncio.

type SlotName = 'home' | 'game' | 'result';

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;
const SLOTS: Record<SlotName, string | undefined> = {
  home: import.meta.env.VITE_ADSENSE_SLOT_HOME,
  game: import.meta.env.VITE_ADSENSE_SLOT_GAME,
  result: import.meta.env.VITE_ADSENSE_SLOT_RESULT,
};
const SHOW_PLACEHOLDERS = import.meta.env.DEV || import.meta.env.MODE === 'single';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function initAds() {
  if (!CLIENT || document.querySelector('script[data-adsense]')) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(CLIENT)}`;
  s.crossOrigin = 'anonymous';
  s.dataset.adsense = '1';
  document.head.appendChild(s);
}

export function adSlot(name: SlotName): string {
  const slot = SLOTS[name];
  if (CLIENT && slot) {
    return `<aside class="ad" aria-label="Publicidad"><span class="ad-label">Publicidad</span>
      <ins class="adsbygoogle" style="display:block" data-ad-client="${CLIENT}" data-ad-slot="${slot}"
        data-ad-format="auto" data-full-width-responsive="true"></ins></aside>`;
  }
  if (SHOW_PLACEHOLDERS) {
    return `<aside class="ad ad-placeholder" aria-label="Espacio publicitario"><span class="ad-label">Publicidad</span>
      <div>Anuncio de Google AdSense · bloque “${name}”</div></aside>`;
  }
  return '';
}

/** Pide a AdSense que llene los bloques nuevos que se acaban de pintar. */
export function fillAds(root: ParentNode) {
  if (!CLIENT) return;
  root.querySelectorAll<HTMLElement>('ins.adsbygoogle:not([data-pushed])').forEach((el) => {
    el.dataset.pushed = '1';
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* el bloqueador de anuncios puede impedirlo; el juego sigue igual */
    }
  });
}
