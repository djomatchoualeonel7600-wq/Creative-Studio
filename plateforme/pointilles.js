/* Creative Studio — fond de l'accueil : de petits points s'éclairent doucement autour du curseur.
   Très discret : rien ne bouge tant que la souris ne bouge pas. Coupé sur mobile / tactile
   et si le visiteur préfère moins d'animations. */
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(pointer:fine)').matches) return;
  const hero = document.querySelector('.hero'), bg = hero && hero.querySelector('.bg');
  if (!hero || !bg) return;
  const cv = document.createElement('canvas'); cv.className = 'dots'; cv.setAttribute('aria-hidden', 'true');
  bg.appendChild(cv);
  const g = cv.getContext('2d');
  const GAP = 30, RADIUS = 190;
  let w = 0, h = 0, dpr = 1, mx = -999, my = -999, sx = -999, sy = -999, power = 0, raf = 0, ox = 0, oy = 0;

  function size() {
    const r = hero.getBoundingClientRect(); ox = r.left; oy = r.top;
    dpr = Math.min(2, devicePixelRatio || 1); w = Math.round(r.width); h = Math.round(r.height);
    cv.width = w * dpr; cv.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const light = () => document.documentElement.dataset.theme === 'light';

  function draw() {
    raf = 0;
    // le point lumineux suit le curseur avec un léger retard, et s'éteint quand la souris s'arrête
    sx += (mx - sx) * .14; sy += (my - sy) * .14;
    power += ((mx > -900 ? 1 : 0) - power) * .06;
    g.clearRect(0, 0, w, h);
    if (power > .02) {
      const col = light() ? '142,107,46' : '220,198,144';
      const x0 = Math.max(0, Math.floor((sx - RADIUS) / GAP)), x1 = Math.min(Math.ceil(w / GAP), Math.ceil((sx + RADIUS) / GAP));
      const y0 = Math.max(0, Math.floor((sy - RADIUS) / GAP)), y1 = Math.min(Math.ceil(h / GAP), Math.ceil((sy + RADIUS) / GAP));
      for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) {
        let x = i * GAP + GAP / 2, y = j * GAP + GAP / 2;
        const dx = x - sx, dy = y - sy, d = Math.hypot(dx, dy);
        if (d > RADIUS) continue;
        const k = Math.pow(1 - d / RADIUS, 2) * power;
        // les points s'écartent très légèrement du curseur
        x += dx / (d || 1) * k * 7; y += dy / (d || 1) * k * 7;
        g.fillStyle = `rgba(${col},${(k * .2).toFixed(3)})`;
        g.beginPath(); g.arc(x, y, 1 + k * 1.4, 0, 6.2832); g.fill();
      }
    }
    // on continue tant que quelque chose bouge ou reste visible
    if (power > .02 || (mx > -900 && Math.hypot(mx - sx, my - sy) > .5)) raf = requestAnimationFrame(draw);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(draw); };
  hero.addEventListener('pointermove', e => { mx = e.clientX - ox; my = e.clientY - oy; if (sx < -900) { sx = mx; sy = my; } kick(); }, { passive: true });
  hero.addEventListener('pointerleave', () => { mx = -999; my = -999; kick(); });
  addEventListener('scroll', () => { const r = hero.getBoundingClientRect(); ox = r.left; oy = r.top; }, { passive: true });
  addEventListener('resize', () => { size(); kick(); });
  size();
})();
