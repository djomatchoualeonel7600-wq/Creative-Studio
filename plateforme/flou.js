/* Creative Studio — effet de flou au défilement.
   Seul le cinquième du bas de l'écran est flou : on devine ce qui arrive. Au-dessus, tout est net.
   - Grands titres et textes d'introduction : flou marqué, léger glissement vers le haut.
   - Tout le reste (cartes, images, paragraphes, boutons…) : flou plus doux.
   Coupé automatiquement si le visiteur préfère moins d'animations. */
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const STRONG = '.head h2, .head > p, .mtext h2, .cta h2, .cta > p, .cta .wrap > p, [data-flou]';
  const SOFT = ['p', 'li', 'h3', 'h4', 'figure', 'img', 'video', 'table', 'blockquote', 'form', '.btn', '.card', '.svc-card', '.ptabs a', '.fchip',
    '.tile', '.mc', '.wt', '.deck', '.tcard', '.cform', '.stat', '.sizes', '.jp', '.index a', '.tags', '.kicker', '.chips', '.filters'].map(s => 'main ' + s).join(',');
  const SKIP = 'header, nav, .nav, .top, .lb, .fusee, .hero, [data-flou-off], .menu, .dd';
  const css = document.createElement('style');
  css.textContent = '.fx-rv{filter:blur(calc((1 - var(--rv,1)) * 14px));opacity:calc(.18 + var(--rv,1) * .82);transform:translate3d(0,calc((1 - var(--rv,1)) * 1.75rem),0)}';
  document.head.appendChild(css);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let strong = [], soft = [], tick = false;
  function collect() {
    strong.forEach(el => el.classList.remove('fx-rv'));
    soft.forEach(el => { el.style.filter = ''; });
    const vh = innerHeight;
    strong = [...document.querySelectorAll(STRONG)].filter(el => !el.closest(SKIP));
    strong.forEach(el => el.classList.add('fx-rv'));
    const S = new Set(strong);
    let c = [...document.querySelectorAll(SOFT)].filter(el => !el.closest(SKIP) && !S.has(el) && ![...S].some(s => s.contains(el)));
    // On garde les blocs de taille raisonnable (un bloc plus haut que l'écran resterait flou trop longtemps)
    c = c.filter(el => { const h = el.offsetHeight; return h > 8 && h < vh * .8; });
    const set = new Set(c);
    soft = c.filter(el => { let p = el.parentElement; while (p) { if (set.has(p)) return false; p = p.parentElement; } return true; });
  }
  /* Le flou ne concerne que le cinquième du bas de l'écran : au-dessus de cette bande, tout est parfaitement net.
     Un élément qui entre par le bas est flou, puis devient net en arrivant à 80 % de la hauteur. */
  const BAND = .2;
  const prog = (top, vh) => { const p = clamp((vh - top) / (vh * BAND), 0, 1); return 1 - Math.pow(1 - p, 2); };
  function upd() {
    tick = false;
    const vh = innerHeight;
    for (const el of strong) {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--rv', r.bottom < -40 ? '1' : r.top > vh + 40 ? '0' : prog(r.top, vh).toFixed(3));
    }
    for (const el of soft) {
      const r = el.getBoundingClientRect();
      const e = r.bottom < 0 ? 1 : r.top > vh + 40 ? 0 : prog(r.top, vh);
      const f = e > .995 ? '' : `blur(${((1 - e) * 7).toFixed(2)}px) opacity(${(.45 + e * .55).toFixed(3)})`;
      if (el._fx !== f) { el._fx = f; el.style.filter = f; }
    }
  }
  const req = () => { if (!tick) { tick = true; requestAnimationFrame(upd); } };
  let rt = 0;
  function start() {
    collect(); upd();
    addEventListener('scroll', req, { passive: true });
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { collect(); upd(); }, 200); });
    // Le contenu ajouté plus tard (galeries, cartes) est pris en compte
    let mt = 0;
    new MutationObserver(() => { clearTimeout(mt); mt = setTimeout(() => { collect(); upd(); }, 250); })
      .observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
  }
  window.CSFlou = { refresh() { collect(); upd(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
