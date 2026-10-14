// Celebración de un trofeo de selección: confetti que cae, globos que suben y un cartel. Es decoración: no recibe clics
// (pointer-events: none en el CSS), se quita sola y con movimiento reducido deja solo el cartel.
const COLORS = ['#f0c14b', '#ffffff', '#6cb4ee', '#e5484d', '#3fb950'];
const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Título e imagen propios del banner (el Balón de Oro); sin ellos, "¡Campeón!" como siempre. */
export interface CelebrateExtra { title: string; img: { src: string; alt: string; icon: string } }

/** name: nombre del trofeo ("Mundial 2042"); big: el Mundial, más grande y más largo. */
export function celebrate(name: string, big: boolean, extra?: CelebrateExtra) {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.createElement('div');
  root.className = `party${big ? ' big' : ''}`;
  root.setAttribute('aria-hidden', 'true'); // el resultado ya está escrito en la temporada
  const banner = document.createElement('div');
  banner.className = 'party-banner';
  const title = document.createElement('b');
  title.textContent = extra?.title ?? '🏆 ¡Campeón!';
  const trophy = document.createElement('span');
  trophy.textContent = name; // textContent: el nombre nunca se interpreta como HTML
  banner.append(title, trophy);
  if (extra) {
    // Caja fija de 96 x 96 (no mueve el cartel al cargar). La imagen es local; si falla, main.ts la cambia por el ícono (data-icon).
    const img = document.createElement('img');
    img.src = extra.img.src;
    img.alt = extra.img.alt;
    img.width = img.height = 96;
    img.dataset.icon = extra.img.icon;
    banner.prepend(img);
  }
  root.append(banner);
  if (!calm) {
    const piece = (cls: string, vars: Record<string, string>) => {
      const el = document.createElement('i');
      el.className = cls;
      for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
      root.append(el);
    };
    for (let i = 0; i < (big ? 150 : 70); i++) {
      piece('party-bit', { '--x': `${rand(0, 100)}vw`, '--w': `${rand(-12, 12)}vw`, '--r': `${rand(360, 1080)}deg`, '--t': `${rand(3, 5.5)}s`, '--d': `${rand(0, big ? 2.5 : 1.5)}s`, '--c': COLORS[i % COLORS.length] });
    }
    for (let i = 0; i < (big ? 16 : 8); i++) {
      piece('party-balloon', { '--x': `${rand(4, 92)}vw`, '--w': `${rand(-8, 8)}vw`, '--t': `${rand(5, 7)}s`, '--d': `${rand(0, big ? 2 : 1)}s`, '--c': COLORS[(i + 2) % COLORS.length] });
    }
  }
  document.body.append(root);
  // Todas las animaciones terminan antes (retraso + duración < 10 s).
  setTimeout(() => root.remove(), calm ? 4000 : big ? 10000 : 9000);
}
