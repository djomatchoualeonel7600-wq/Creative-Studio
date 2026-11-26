/* Creative Studio — accueil : le décollage d'introduction et les lumières au défilement.
   « De l'idée au lancement » : une fusée décolle, la caméra la suit, un horizon de lumière
   ouvre le site. Ensuite, les titres se révèlent au défilement et des traits lumineux
   parcourent les cartes. Tout se coupe si le visiteur préfère moins d'animations. */
(function () {
  const R = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = { in3: t => t * t * t, out3: t => 1 - Math.pow(1 - t, 3), io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 };

  /* =================== 1. LE DÉCOLLAGE =================== */
  function intro() {
    const L = document.getElementById('launch');
    if (!L) return;
    if (!R.classList.contains('intro-on')) { L.remove(); return; }
    try { sessionStorage.setItem('cs-intro', '1'); } catch (e) {}
    const sky = L.querySelector('.l-sky'), smoke = L.querySelector('.l-smoke');
    const sx = sky.getContext('2d'), mx = smoke.getContext('2d');
    const rocket = L.querySelector('.l-rocket'), scene = L.querySelector('.l-scene'), flame = L.querySelector('.l-flame');
    let W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    function size() {
      W = innerWidth; H = innerHeight;
      [sky, smoke].forEach(c => { c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px'; });
      sx.setTransform(dpr, 0, 0, dpr, 0, 0); mx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size(); addEventListener('resize', size);

    const stars = Array.from({ length: Math.round(Math.min(260, W * H / 5200)) }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + .2, a: Math.random() * .7 + .2, tw: Math.random() * 6 }));
    const puffs = [];
    const T = { ignite: 900, lift: 1750, arc: 3350, out: 3950, end: 4700 };
    let t0 = performance.now(), last = t0, speed = 0, done = false, raf = 0, skipping = false;

    function nozzle() {
      const r = rocket.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.bottom - r.height * .04 };
    }
    function spawn(n, power) {
      const p = nozzle();
      for (let i = 0; i < n; i++) {
        const side = Math.random() < .5 ? -1 : 1;
        const ground = Math.min(p.y + 6, H * .87);
        puffs.push({ x: p.x + (Math.random() - .5) * 26, y: ground - Math.random() * 18, vx: side * (Math.random() * 3.2 + .4) * power, vy: -Math.random() * .45 - .05,
          r: 30 + Math.random() * 40, g: 1.008 + Math.random() * .009, life: 0, max: 2200 + Math.random() * 1800 });
      }
    }
    function drawSky(dt, el) {
      sx.clearRect(0, 0, W, H);
      const lift = clamp((el - T.lift) / 1600, 0, 1);
      speed = el > T.lift ? Math.min(30, speed + dt * .02 * (1 + lift * 3)) : 0;
      stars.forEach(s => {
        s.y += speed * dt / 1000 * (s.r + .3) / H * 60;
        if (s.y > 1) { s.y -= 1; s.x = Math.random(); }
        const x = s.x * W, y = s.y * H, tw = .6 + .4 * Math.sin(el / 600 + s.tw);
        const len = Math.min(22, speed * s.r * .9);
        sx.strokeStyle = `rgba(243,229,215,${s.a * tw * (speed > 4 ? .6 : 1)})`; sx.lineWidth = s.r; sx.lineCap = 'round';
        sx.beginPath(); sx.moveTo(x, y); sx.lineTo(x, y - len - .1); sx.stroke();
      });
    }
    function drawSmoke(dt, el) {
      mx.clearRect(0, 0, W, H);
      const p = nozzle(), lit = clamp((el - T.ignite) / 500, 0, 1) * (1 - clamp((el - T.lift - 900) / 1400, 0, 1) * .7);
      // lueur au sol
      if (lit > 0) {
        const g = mx.createRadialGradient(p.x, H * .84, 0, p.x, H * .84, Math.max(W, H) * .55);
        g.addColorStop(0, `rgba(160,210,255,${.55 * lit})`); g.addColorStop(.18, `rgba(25,105,251,${.35 * lit})`); g.addColorStop(1, 'rgba(8,6,5,0)');
        mx.fillStyle = g; mx.fillRect(0, 0, W, H);
      }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const q = puffs[i]; q.life += dt;
        if (q.life > q.max) { puffs.splice(i, 1); continue; }
        q.x += q.vx * dt / 16; q.y += q.vy * dt / 16; q.vx *= .985; q.r *= Math.pow(q.g, dt / 16);
        const k = q.life / q.max, a = Math.min(1, q.life / 260) * (1 - k) * .5;
        const near = clamp(1 - Math.hypot(q.x - p.x, q.y - H * .86) / (W * .5), 0, 1) * lit;
        const g = mx.createRadialGradient(q.x, q.y + q.r * .25, 0, q.x, q.y, q.r);
        g.addColorStop(0, `rgba(${Math.round(70 + 150 * near)},${Math.round(76 + 160 * near)},${Math.round(104 + 150 * near)},${a})`);
        g.addColorStop(.45, `rgba(${Math.round(34 + 60 * near)},${Math.round(36 + 70 * near)},${Math.round(58 + 90 * near)},${a * .7})`);
        g.addColorStop(1, 'rgba(10,10,18,0)');
        mx.fillStyle = g; mx.beginPath(); mx.arc(q.x, q.y, q.r, 0, 7); mx.fill();
      }
    }
    function frame(now) {
      const dt = Math.min(48, now - last); last = now;
      const el = now - t0;
      // compte des étapes
      if (el > T.ignite && !L.classList.contains('ign')) L.classList.add('ign');
      if (el > T.lift && !L.classList.contains('lift')) L.classList.add('lift');
      if (el > T.arc && !L.classList.contains('arc')) L.classList.add('arc');
      if (el > T.out && !L.classList.contains('out')) finish();
      // fumée
      if (el > T.ignite && el < T.lift + 1300) spawn(el < T.lift ? 3 : 4, el < T.lift ? .9 : 1.8);
      // fusée et caméra
      const k = clamp((el - T.lift) / 2100, 0, 1), e = ease.in3(k);
      const shake = el > T.ignite && el < T.lift + 700 ? (Math.random() - .5) * 2.2 * (1 - k) : 0;
      rocket.style.transform = `translate3d(calc(-50% + ${shake}px), ${-e * (H * 1.35)}px, 0)`;
      scene.style.transform = `translate3d(0, ${ease.out3(k) * H * .32}px, 0)`;
      flame.style.setProperty('--f', (el > T.ignite ? .55 + clamp((el - T.ignite) / 700, 0, 1) * .45 + Math.random() * .12 : 0).toFixed(3));
      drawSky(dt, el); drawSmoke(dt, el);
      if (!done) raf = requestAnimationFrame(frame);
    }
    function finish() {
      if (L.classList.contains('out')) return;
      L.classList.add('out');
      R.classList.remove('intro-on');
      setTimeout(() => { done = true; cancelAnimationFrame(raf); L.remove(); removeEventListener('resize', size); }, skipping ? 450 : 850);
    }
    function skip() { if (skipping) return; skipping = true; L.classList.add('skip'); finish(); }
    L.querySelector('.l-skip').addEventListener('click', skip);
    addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') skip(); }, { once: true });
    addEventListener('wheel', skip, { once: true, passive: true });
    addEventListener('touchmove', skip, { once: true, passive: true });
    raf = requestAnimationFrame(frame);
  }

  /* =================== 2. LES LUMIÈRES AU DÉFILEMENT =================== */
  function scrollFx() {
    if (reduce) return;
    // Titres qui se révèlent, horizons de lumière qui s'ouvrent entre les sections
    const heads = [...document.querySelectorAll('.head h2, .mtext h2, .cta h2')];
    heads.forEach(h => h.classList.add('fx-rv'));
    const hz = ['atelier', 'services', 'methode', 'contact'].map(id => document.getElementById(id)).filter(Boolean).map(sec => {
      const d = document.createElement('div'); d.className = 'horizon'; d.setAttribute('aria-hidden', 'true'); sec.prepend(d); return d;
    });
    let tick = false;
    function upd() {
      tick = false;
      const vh = innerHeight;
      heads.forEach(h => {
        const r = h.getBoundingClientRect();
        const p = clamp((vh * .96 - r.top) / (vh * .42), 0, 1);
        h.style.setProperty('--rv', p.toFixed(3));
      });
      hz.forEach(d => {
        const r = d.parentElement.getBoundingClientRect();
        const p = clamp((vh - r.top) / (vh * .7), 0, 1);
        d.style.setProperty('--hp', ease.out3(p).toFixed(3));
      });
    }
    const req = () => { if (!tick) { tick = true; requestAnimationFrame(upd); } };
    addEventListener('scroll', req, { passive: true }); addEventListener('resize', req); upd();

    // Traits lumineux qui font le tour des cartes
    function runner(el) {
      if (el.querySelector(':scope > .runner')) return el.querySelector(':scope > .runner');
      const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('class', 'runner'); svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = '<rect class="g" pathLength="100"/><rect class="c" pathLength="100"/>';
      el.append(svg);
      const fit = () => {
        const w = el.offsetWidth, h = el.offsetHeight, rad = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        svg.querySelectorAll('rect').forEach(r => { r.setAttribute('x', 1); r.setAttribute('y', 1); r.setAttribute('width', Math.max(0, w - 2)); r.setAttribute('height', Math.max(0, h - 2)); r.setAttribute('rx', Math.max(0, rad - 1)); });
      };
      fit(); if ('ResizeObserver' in window) new ResizeObserver(fit).observe(el);
      return svg;
    }
    const cards = [...document.querySelectorAll('.svc-card')];
    cards.forEach(c => { runner(c); c.addEventListener('mouseenter', () => c.classList.add('run-h')); c.addEventListener('mouseleave', () => c.classList.remove('run-h')); });
    let relay = null, idx = 0;
    const grid = document.getElementById('svcgrid');
    if (grid && cards.length) new IntersectionObserver(es => {
      const on = es[0].isIntersecting;
      clearInterval(relay);
      if (on) {
        const step = () => { cards.forEach(c => c.classList.remove('run')); const c = cards[idx % cards.length]; void c.offsetWidth; c.classList.add('run'); idx++; };
        step(); relay = setInterval(step, 1500);
      } else cards.forEach(c => c.classList.remove('run'));
    }, { threshold: .2 }).observe(grid);
    // Les autres cartes de verre s'allument au passage
    document.querySelectorAll('.tcard, .cform').forEach(c => { runner(c); c.addEventListener('mouseenter', () => c.classList.add('run-h')); c.addEventListener('mouseleave', () => c.classList.remove('run-h')); });

    // Le chemin d'une commande : une impulsion de lumière court d'une étape à l'autre
    const flow = document.querySelector('.svc-flow');
    if (flow) new IntersectionObserver(es => flow.classList.toggle('on', es[0].isIntersecting), { threshold: .4 }).observe(flow);
  }

  intro();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scrollFx); else scrollFx();
})();
