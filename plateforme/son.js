/* Creative Studio — ambiance sonore partagée par toutes les pages.
   Le son est généré dans le navigateur. Une fois activé, il reprend tout seul à chaque page
   (même état, même volume) jusqu'à ce que le visiteur le coupe lui-même.
   Un navigateur recharge la page à chaque changement : la reprise est lancée dès le premier instant
   et entre en douceur, pour que le passage d'une page à l'autre reste le plus discret possible. */
(function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  const KEY = 'cs-sound', LEVEL = .24;
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  if (!AC) { const b = document.getElementById('snd'); if (b) b.hidden = true; return; }

  let ctx = null, master = null, bus = null, verb = null, tick = null, on = false, chord = 0, nextAt = 0, nextPing = 0, btn = null;
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  const CHORDS = [[48, 55, 59, 62, 64], [45, 52, 55, 59, 64], [41, 48, 52, 57, 59], [43, 50, 52, 57, 59]];
  const PENTA = [72, 74, 76, 79, 81, 84];

  /* ---------- bouton ---------- */
  const ICON = '<svg class="spk" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16.5 9.5l4 5M20.5 9.5l-4 5"/></svg><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
  function injectCss() {
    if (document.getElementById('cs-snd-css')) return;
    const s = document.createElement('style'); s.id = 'cs-snd-css';
    s.textContent = `.snd-mini{all:unset;box-sizing:border-box;flex:none;display:inline-grid;place-items:center;width:2.5rem;height:2.5rem;border-radius:50%;cursor:pointer;color:#DCC690;border:1px solid rgba(220,198,144,.26);background:rgba(27,22,16,.55);transition:background .25s,transform .25s}
    .snd-mini:hover{background:rgba(220,198,144,.12);transform:translateY(-1px)}
    .snd-mini:focus-visible{outline:2px solid #00B0FF;outline-offset:3px}
    .snd-mini .spk{width:1.125rem;height:1.125rem}
    .snd-mini .eq{display:none;align-items:flex-end;gap:2px;height:.9375rem;width:1.0625rem}
    .snd-mini .eq i{flex:1;height:22%;border-radius:2px;background:#DCC690}
    .snd-mini[aria-pressed="true"] .spk{display:none}
    .snd-mini[aria-pressed="true"] .eq{display:flex}
    .snd-mini[aria-pressed="true"] .eq i{animation:csEq 1.1s ease-in-out infinite}
    .snd-mini[aria-pressed="true"] .eq i:nth-child(2){animation-delay:-.3s}
    .snd-mini[aria-pressed="true"] .eq i:nth-child(3){animation-delay:-.65s}
    .snd-mini[aria-pressed="true"] .eq i:nth-child(4){animation-delay:-.9s}
    @keyframes csEq{0%,100%{height:22%}50%{height:100%}}
    @media (prefers-reduced-motion:reduce){.snd-mini[aria-pressed="true"] .eq i{animation:none;height:70%}}`;
    document.head.appendChild(s);
  }
  function findBtn() {
    btn = document.getElementById('snd');
    if (btn) return btn;
    // Pages sans bouton : on en ajoute un, discret, dans l'en-tête
    const host = document.querySelector('header.top .tin, header.top .bar, header.top > .wrap, header.top');
    if (!host || !host.children.length) return null;
    injectCss();
    btn = document.createElement('button');
    btn.type = 'button'; btn.id = 'snd'; btn.className = 'snd-mini'; btn.title = 'Ambiance sonore'; btn.innerHTML = ICON;
    const go = host.querySelector('.go, .btn, .esp, .thm, .icb');
    if (go && go.parentNode) go.parentNode.insertBefore(btn, go); else host.appendChild(btn);
    paint();
    return btn;
  }

  /* ---------- moteur sonore ---------- */
  function init() {
    if (ctx) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    verb = ctx.createConvolver(); const len = ctx.sampleRate * 3.4, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = buf; const wet = ctx.createGain(); wet.gain.value = .6; verb.connect(wet); wet.connect(master);
    const dry = ctx.createGain(); dry.gain.value = .7; dry.connect(master);
    bus = ctx.createGain(); bus.connect(dry); bus.connect(verb);
  }
  function voice(f, t0, dur, vol, attack) {
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = .6;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack); g.gain.setValueAtTime(vol, t0 + dur); g.gain.linearRampToValueAtTime(0, t0 + dur + 6);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .06 + Math.random() * .05; lg.gain.value = 260; lfo.connect(lg); lg.connect(lp.frequency);
    [['triangle', f], ['sine', f * 1.004]].forEach(([type, fr]) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = fr; o.connect(g); o.start(t0); o.stop(t0 + dur + 6.2); });
    g.connect(lp); lp.connect(bus); lfo.start(t0); lfo.stop(t0 + dur + 6.2);
  }
  function ping() {
    const t = ctx.currentTime + .02, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = hz(PENTA[(Math.random() * PENTA.length) | 0]);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + 3.2);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 3.4);
  }
  let attack = 4.5;
  function sched() {
    const now = ctx.currentTime;
    if (now + 1 >= nextAt) {
      const t0 = Math.max(now, nextAt), c = CHORDS[chord++ % CHORDS.length];
      c.forEach((n, i) => voice(hz(n), t0, 16, i === 0 ? .12 : .07, attack)); nextAt = t0 + 13; attack = 4.5;
    }
    if (now >= nextPing) { ping(); nextPing = now + 3.5 + Math.random() * 5; }
  }
  function ramp(to, s) { const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(to, t + s); }
  function start(resumed) {
    init(); ctx.resume();
    // À la reprise sur une nouvelle page, l'accord s'installe vite pour ne pas laisser de trou
    attack = resumed ? 1.1 : 4.5;
    nextAt = ctx.currentTime; nextPing = ctx.currentTime + (resumed ? 1.5 : 2); sched();
    clearInterval(tick); tick = setInterval(sched, 500); ramp(LEVEL, resumed ? 1.2 : 3);
  }
  function stop() {
    if (!ctx) return;
    clearInterval(tick); tick = null; ramp(0, 1.2); setTimeout(() => { if (!on && ctx) ctx.suspend(); }, 1400);
  }
  function paint() {
    btn = document.getElementById('snd'); if (!btn) return;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? "Couper l'ambiance sonore" : "Activer l'ambiance sonore");
    btn.classList.toggle('trace-on', on); btn.classList.toggle('trace-h', !on);
  }
  function set(v, save, resumed) {
    on = v; paint();
    if (save !== false) store.set(KEY, v ? 'on' : 'off');
    v ? start(resumed) : stop();
  }

  function boot() {
    findBtn();
    // Un seul écouteur pour le bouton, même si l'en-tête de la page est reconstruit plus tard
    document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#snd')) set(!on); });
    // En-tête construit après coup : on garde le bouton présent
    const hostEl = document.querySelector('header.top');
    if (hostEl) new MutationObserver(() => { if (!document.getElementById('snd')) findBtn(); }).observe(hostEl, { childList: true });
    document.addEventListener('visibilitychange', () => {
      if (!on || !ctx) return;
      if (document.hidden) { ramp(0, .4); setTimeout(() => { if (document.hidden && ctx) ctx.suspend(); }, 500); }
      else { ctx.resume(); ramp(LEVEL, 1.5); }
    });

    /* Le visiteur avait activé le son sur une page précédente : on reprend tout de suite.
       Si le navigateur le refuse encore, la reprise a lieu au premier geste de la page. */
    if (store.get(KEY) === 'on') {
      on = true; paint();
      try { start(true); } catch (e) {}
      const unlocked = () => ctx && ctx.state === 'running';
      let tries = 0;
      const poll = setInterval(() => { if (unlocked() || ++tries > 12) clearInterval(poll); else ctx && ctx.resume(); }, 250);
      const evs = ['pointerdown', 'keydown', 'touchend', 'click'];
      const go = e => {
        if (e.target.closest && e.target.closest('#snd')) { off(); return; }
        if (ctx) ctx.resume(); if (on && !tick) start(true);
        if (unlocked()) off(); else setTimeout(() => { if (unlocked()) off(); }, 400);
      };
      const off = () => evs.forEach(t => window.removeEventListener(t, go, true));
      evs.forEach(t => window.addEventListener(t, go, true));
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
