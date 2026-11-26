/* Creative Studio — pages de réalisations : visionneuse plein écran, page Miniatures, pages par projets, lecteur de présentations. */
(function () {
  const D = window.R_DATA, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVG = {
    x: '<path d="M6 6l12 12M18 6L6 18"/>', l: '<path d="M15 5l-7 7 7 7"/>', r: '<path d="M9 5l7 7-7 7"/>',
    fs: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8 5v14M16 5v14"/>', zoom: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3M11 8.5v5M8.5 11h5"/>'
  };
  const ico = (k, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SVG[k]}</svg>`;

  /* ================= VISIONNEUSE PLEIN ÉCRAN ================= */
  const LB = (function () {
    let el, img, list = [], i = 0, last = null, idle = 0;
    function build() {
      el = document.createElement('div');
      el.className = 'lb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Visionneuse');
      el.innerHTML = `<div class="bar"><span class="t"></span><span class="n"></span>
          <button class="ic" type="button" data-fs aria-label="Plein écran">${ico('fs')}</button>
          <button class="ic" type="button" data-x aria-label="Fermer">${ico('x')}</button></div>
        <div class="stage"><button class="ic nav p" type="button" data-p aria-label="Précédent">${ico('l')}</button><img alt=""><button class="ic nav x" type="button" data-n aria-label="Suivant">${ico('r')}</button></div>
        <div class="foot" aria-label="Toutes les images"></div>`;
      document.body.appendChild(el);
      img = el.querySelector('.stage img');
      el.querySelector('[data-x]').onclick = close;
      el.querySelector('[data-p]').onclick = e => { e.stopPropagation(); go(i - 1); };
      el.querySelector('[data-n]').onclick = e => { e.stopPropagation(); go(i + 1); };
      el.querySelector('[data-fs]').onclick = () => {
        if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      };
      el.querySelector('.stage').addEventListener('click', e => { if (e.target === img) el.classList.toggle('calm'); else if (e.target.classList.contains('stage')) close(); });
      el.querySelector('.foot').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) go(+b.dataset.i); });
      let sx = null, sy = 0;
      el.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
      el.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(i + (dx < 0 ? 1 : -1)); sx = null; });
      addEventListener('keydown', e => {
        if (!el.classList.contains('o')) return;
        if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(i + 1); else if (e.key === 'ArrowLeft') go(i - 1);
      });
      el.addEventListener('mousemove', () => { el.classList.remove('calm'); clearTimeout(idle); idle = setTimeout(() => el.classList.add('calm'), 2600); });
    }
    function go(k) {
      if (!list.length) return;
      i = (k + list.length) % list.length; const it = list[i];
      img.classList.add('ld');
      const pre = new Image(); pre.onload = pre.onerror = () => { if (list[i] !== it) return; img.src = it.f; img.alt = it.t || ''; img.classList.remove('ld'); };
      pre.src = it.f;
      el.querySelector('.t').innerHTML = `${esc(it.t || '')}${it.sub ? `<small>${esc(it.sub)}</small>` : ''}`;
      el.querySelector('.n').textContent = list.length > 1 ? `${String(i + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}` : '';
      el.querySelectorAll('.foot button').forEach(b => b.setAttribute('aria-current', +b.dataset.i === i ? 'true' : 'false'));
      const cur = el.querySelector(`.foot button[data-i="${i}"]`); if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
      [1, -1].forEach(d => { const n = list[(i + d + list.length) % list.length]; if (n) { const p = new Image(); p.src = n.f; } });
    }
    function open(items, k = 0) {
      if (!el) build();
      list = items; last = document.activeElement;
      el.classList.toggle('solo', items.length < 2);
      el.querySelector('.foot').innerHTML = items.length > 1 ? items.map((it, n) => `<button type="button" data-i="${n}" aria-label="Image ${n + 1}"><img src="${esc(it.s || it.f)}" alt="" loading="lazy"></button>`).join('') : '';
      img.removeAttribute('src');
      el.classList.add('o'); el.classList.remove('calm'); document.documentElement.style.overflow = 'hidden';
      go(k); el.querySelector('[data-x]').focus({ preventScroll: true });
    }
    function close() {
      if (!el) return;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      el.classList.remove('o'); document.documentElement.style.overflow = '';
      if (last && last.focus) last.focus({ preventScroll: true });
    }
    return { open, close };
  })();
  window.CSLB = LB;

  /* ================= PAGE MINIATURES ================= */
  function pageMini() {
    const all = D.mini, THEMES = ['Finance', 'Crypto', 'Business', 'Tech', 'Mindset', 'Vlog'];
    const items = all.map(m => ({ ...m, sub: m.th }));
    const openAt = slug => { const k = items.findIndex(m => m.f === slug); LB.open(items, Math.max(0, k)); };

    // Lecteur de l'accueil : défile une sélection
    const PICK = ['bitcoin-100k', 'je-te-montre-tout', 'braquage', 'metamorphose-30-jours', 'verite-blockchain', 'eloquent-13-minutes', 'on-a-failli-mourir', '0-a-75k'];
    const feat = PICK.map(p => items.find(m => m.f.includes('/' + p + '.'))).filter(Boolean);
    const scr = $('#scr'), ttl = $('#ptitle'), thm = $('#ptheme'), bar = $('#pbar');
    scr.innerHTML = feat.map((m, n) => `<img src="${m.f}" alt="${esc(m.t)}" class="${n ? '' : 'on'}" ${n > 1 ? 'loading="lazy"' : ''}>`).join('');
    let fi = 0, timer = 0;
    const show = n => {
      fi = (n + feat.length) % feat.length;
      scr.querySelectorAll('img').forEach((im, k) => im.classList.toggle('on', k === fi));
      ttl.textContent = feat[fi].t; thm.textContent = feat[fi].th;
      bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run');
    };
    const loop = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => show(fi + 1), 3600); };
    show(0); loop();
    $('#player').addEventListener('click', () => openAt(feat[fi].f));
    $('#pnext').addEventListener('click', e => { e.stopPropagation(); show(fi + 1); loop(); });

    // Le mur : deux rangées qui défilent en sens inverse
    const half = Math.ceil(items.length / 2);
    const row = arr => arr.concat(arr).map(m => `<button type="button" class="wt" data-f="${m.f}" aria-label="Agrandir : ${esc(m.t)}"><img src="${m.s}" alt="" loading="lazy"></button>`).join('');
    $('#wall1').innerHTML = row(items.slice(0, half)); $('#wall2').innerHTML = row(items.slice(half));
    $('#wall').addEventListener('click', e => { const b = e.target.closest('.wt'); if (b) openAt(b.dataset.f); });

    // Galerie filtrable
    let cur = 'Toutes';
    const chips = $('#mfil'), grid = $('#mgrid');
    function renderChips() {
      chips.innerHTML = ['Toutes', ...THEMES].map(t => { const n = t === 'Toutes' ? items.length : items.filter(m => m.th === t).length;
        return `<button type="button" class="mchip" aria-pressed="${t === cur}" data-t="${t}">${t}<sup>${n}</sup></button>`; }).join('');
    }
    function renderGrid() {
      const list = items.filter(m => cur === 'Toutes' || m.th === cur);
      grid.innerHTML = list.map((m, n) => `<button type="button" class="mc" data-f="${m.f}" style="--d:${(n % 6) * 55}ms">
        <span class="mi"><img src="${m.s}" alt="" loading="lazy" width="${m.w}" height="${m.h}"><span class="mt">${m.th}</span><span class="mz">${ico('zoom')}</span></span>
        <span class="mm"><img class="av" src="brand/creative-studio-mark.png" alt=""><span><b>${esc(m.t)}</b><small>Creative Studio · Miniature ${m.w / m.h < 1.5 ? 'carrée' : '16:9'}</small></span></span></button>`).join('');
      requestAnimationFrame(() => grid.querySelectorAll('.mc').forEach(c => c.classList.add('in')));
    }
    chips.addEventListener('click', e => { const b = e.target.closest('.mchip'); if (!b) return; cur = b.dataset.t; renderChips(); renderGrid(); });
    grid.addEventListener('click', e => { const b = e.target.closest('.mc'); if (!b) return; const list = items.filter(m => cur === 'Toutes' || m.th === cur); LB.open(list, list.findIndex(m => m.f === b.dataset.f)); });
    renderChips(); renderGrid();

    // Test du petit format
    const tm = items.find(m => m.f.includes('bitcoin-100k')) || items[0];
    $$('#sizes img').forEach(im => { im.src = tm.f; });
    $('#sizes').addEventListener('click', () => LB.open([tm], 0));

    // Japhet
    const J = D.japhet.map(m => ({ ...m, sub: 'Japhet' }));
    $('#japhet').innerHTML = J.map((m, n) => `<button type="button" class="jp" data-i="${n}"><img src="${m.f}" alt="${esc(m.t)}" loading="lazy" width="${m.w}" height="${m.h}"><span class="mz">${ico('zoom')}</span></button>`).join('');
    $('#japhet').addEventListener('click', e => { const b = e.target.closest('.jp'); if (b) LB.open(J, +b.dataset.i); });
    $$('[data-count]').forEach(n => n.textContent = items.length);
  }

  /* ================= PAGES PAR PROJETS ================= */
  function gallery(list, sub) {
    const wide = list.filter(m => m.w / m.h > 2.2), rest = list.filter(m => m.w / m.h <= 2.2);
    const all = [...wide, ...rest].map(m => ({ ...m, sub }));
    const tile = (m, n) => `<button type="button" class="tile${m.w / m.h > 2.2 ? ' wide' : ''}" data-i="${n}" aria-label="Agrandir : ${esc(m.t)}">
      <img src="${m.s}" alt="${esc(m.t)}" loading="lazy" width="${m.w}" height="${m.h}" style="aspect-ratio:${m.w}/${m.h}">
      <span class="cap"><b>${esc(m.t)}</b>${ico('zoom')}</span></button>`;
    return { all, html: `${wide.length ? `<div class="wides">${wide.map((m, n) => tile(m, n)).join('')}</div>` : ''}<div class="mason">${rest.map((m, n) => tile(m, n + wide.length)).join('')}</div>` };
  }
  function deck(id, slides, title) {
    const S = slides.map((m, n) => ({ ...m, t: `${title} · diapositive ${n + 1}` }));
    return {
      S,
      html: `<div class="deck" id="${id}" tabindex="0" aria-label="Présentation ${esc(title)}, ${S.length} diapositives. Flèches pour naviguer.">
        <div class="dstage">
          <div class="dslides">${S.map((m, n) => `<img src="${m.f}" alt="Diapositive ${n + 1}" ${n > 1 ? 'loading="lazy"' : ''} class="${n ? '' : 'on'}">`).join('')}</div>
          <button class="dnav p" type="button" aria-label="Diapositive précédente">${ico('l')}</button>
          <button class="dnav x" type="button" aria-label="Diapositive suivante">${ico('r')}</button>
          <div class="dprog"><i></i></div>
        </div>
        <div class="dbar">
          <button class="dbtn" type="button" data-play aria-label="Lecture automatique">${ico('play', 'pl')}${ico('pause', 'pa')}</button>
          <span class="dn"><b>01</b> / ${String(S.length).padStart(2, '0')}</span>
          <div class="dstrip">${S.map((m, n) => `<button type="button" data-i="${n}" aria-label="Diapositive ${n + 1}"${n ? '' : ' aria-current="true"'}><img src="${m.s}" alt="" loading="lazy"></button>`).join('')}</div>
          <button class="dbtn wide" type="button" data-full>${ico('fs')}<span>Plein écran</span></button>
        </div></div>`
    };
  }
  function bindDeck(root, S) {
    const imgs = root.querySelectorAll('.dslides img'), strip = root.querySelector('.dstrip'), num = root.querySelector('.dn b'), prog = root.querySelector('.dprog i');
    let k = 0, t = 0, playing = false;
    const go = n => {
      k = (n + S.length) % S.length;
      imgs.forEach((im, j) => { im.classList.toggle('on', j === k); if (Math.abs(j - k) <= 1) im.loading = 'eager'; });
      strip.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-current', j === k ? 'true' : 'false'));
      const b = strip.querySelector(`button[data-i="${k}"]`); if (b) strip.scrollTo({ left: b.offsetLeft - strip.clientWidth / 2 + b.clientWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
      num.textContent = String(k + 1).padStart(2, '0'); prog.style.width = ((k + 1) / S.length * 100) + '%';
    };
    const play = on => { playing = on; root.classList.toggle('playing', on); clearInterval(t); if (on) t = setInterval(() => go(k + 1), 3800); };
    root.querySelector('.dnav.p').onclick = () => { go(k - 1); play(false); };
    root.querySelector('.dnav.x').onclick = () => { go(k + 1); play(false); };
    root.querySelector('[data-play]').onclick = () => play(!playing);
    root.querySelector('[data-full]').onclick = () => { play(false); LB.open(S, k); };
    root.querySelector('.dslides').onclick = () => { play(false); LB.open(S, k); };
    strip.onclick = e => { const b = e.target.closest('button[data-i]'); if (b) { go(+b.dataset.i); play(false); } };
    root.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { go(k + 1); e.preventDefault(); } if (e.key === 'ArrowLeft') { go(k - 1); e.preventDefault(); } });
    let sx = null;
    root.querySelector('.dstage').addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    root.querySelector('.dstage').addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 45) { go(k + (dx < 0 ? 1 : -1)); play(false); } sx = null; });
    go(0);
  }
  function pageProjects() {
    const P = window.R_PAGE;
    $('#index').innerHTML = P.projects.map((p, n) => `<a href="#${p.id}"><span class="no">${String(n + 1).padStart(2, '0')}</span><span class="nm">${esc(p.name)}<small>${esc(p.kind)}</small></span><span class="ct">${p.count()}</span></a>`).join('');
    $('#chapters').innerHTML = P.projects.map((p, n) => `<section class="chap" id="${p.id}" aria-labelledby="${p.id}-t">
      <div class="ch-side"><div class="ch-in">
        <span class="no" aria-hidden="true">${String(n + 1).padStart(2, '0')}</span>
        <div class="kicker">${esc(p.kind)}</div>
        <h2 id="${p.id}-t" data-flou>${p.title}</h2>
        <p data-flou>${esc(p.text)}</p>
        <ul class="tags">${p.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      </div></div>
      <div class="ch-main" data-p="${n}"></div></section>`).join('');
    P.projects.forEach((p, n) => {
      const host = $(`.ch-main[data-p="${n}"]`);
      let html = '', groups = [];
      (p.blocks || []).forEach((b, bi) => {
        if (b.deck) { const d = deck(`${p.id}-deck`, b.deck, b.title); html += `${b.label ? `<h3 class="blk">${esc(b.label)}<small>${b.deck.length} diapositives</small></h3>` : ''}${d.html}`; groups.push({ deck: d.S, id: `${p.id}-deck` }); }
        else { const g = gallery(b.items, b.sub || p.name); html += `${b.label ? `<h3 class="blk">${esc(b.label)}<small>${b.items.length} visuel${b.items.length > 1 ? 's' : ''}</small></h3>` : ''}<div class="gal" data-g="${bi}">${g.html}</div>`; groups.push({ all: g.all, g: bi }); }
      });
      host.innerHTML = html;
      groups.forEach(G => {
        if (G.deck) bindDeck(host.querySelector('#' + G.id), G.deck);
        else host.querySelector(`.gal[data-g="${G.g}"]`).addEventListener('click', e => { const t = e.target.closest('.tile'); if (t) LB.open(G.all, +t.dataset.i); });
      });
    });
    // Sommaire : chapitre en cours
    const links = $$('#index a');
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
    $$('.chap').forEach(c => io.observe(c));
    if (window.CSFlou) CSFlou.refresh();
  }

  /* Apparition douce des blocs */
  function rise() {
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.rise').forEach(el => io.observe(el));
  }

  const page = document.body.dataset.page;
  if (page === 'mini') pageMini(); else pageProjects();
  rise();
})();
