/* Creative Studio — intro « fusée » (illustration légère, sans vidéo).
   La fusée Creative Studio s'allume, décolle en laissant un trait de lumière,
   et le ciel se lève comme un rideau pour laisser place au site.
   Pour la COUPER : remplace true par false juste en dessous.
   Pour la revoir à volonté : ajoute ?fusee à l'adresse (ex. monsite.com/?fusee).
   Elle ne joue qu'une fois par visite, se passe d'un clic, et ne s'affiche pas si le visiteur préfère moins d'animations. */
(function () {
  const ACTIVE = true;
  const force = /[?&#]fusee\b/.test(location.search + location.hash);
  if (!ACTIVE && !force) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try { if (!force && sessionStorage.getItem('cs-fusee')) return; sessionStorage.setItem('cs-fusee', '1'); } catch (e) {}

  const root = document.documentElement;
  root.classList.add('fusee-on', 'fusee-lock');
  const E = 'cubic-bezier(.55,0,.9,.35)';
  const css = document.createElement('style');
  css.textContent = `
  html.fusee-lock,html.fusee-lock body{overflow:hidden}
  html.fusee-on .hero *{animation-play-state:paused!important}
  .fz{position:fixed;inset:0;z-index:9999;pointer-events:auto}
  .fz-sky{position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 105%,#1b2a52 0%,#0b1020 38%,#06070b 70%);transition:transform .95s cubic-bezier(.7,0,.25,1)}
  .fz-sky::after{content:"";position:absolute;left:0;right:0;bottom:-2px;height:2px;background:linear-gradient(90deg,transparent,#DCC690 30%,#fff 50%,#00B0FF 70%,transparent);box-shadow:0 0 28px 6px rgba(0,176,255,.45),0 0 60px 12px rgba(220,198,144,.25);opacity:0;transition:opacity .3s}
  .fz.lift .fz-sky{transform:translateY(-101%)}
  .fz.lift .fz-sky::after{opacity:1}
  .fz-star{position:absolute;width:2px;height:2px;border-radius:50%;background:#F3E5D7;animation:fzTw 2.4s ease-in-out infinite alternate}
  @keyframes fzTw{from{opacity:.15}to{opacity:.9}}
  .fz-ground{position:absolute;left:50%;bottom:9vh;width:min(70vw,34rem);height:5.5rem;translate:-50% 0;border-radius:50%;background:radial-gradient(closest-side,rgba(220,198,144,.28),rgba(220,198,144,.06) 60%,transparent);filter:blur(2px)}
  .fz-rocket{position:absolute;left:50%;bottom:12vh;height:min(46vh,25rem);aspect-ratio:200/420;translate:-50% 0;opacity:0;animation:fzIn .6s .1s cubic-bezier(.2,.75,.2,1) forwards}
  .fz-rocket svg{display:block;width:100%;height:100%;overflow:visible}
  .fz.ign .fz-rocket{animation:fzIn .01s forwards,fzShake .09s .05s linear 7}
  .fz.go .fz-rocket{opacity:1;animation:fzUp 1.35s ${E} forwards}
  @keyframes fzUp{from{transform:none}to{transform:translateY(-135vh)}}
  @keyframes fzIn{from{opacity:0;transform:translateY(1.5rem)}to{opacity:1;transform:none}}
  @keyframes fzShake{0%,100%{transform:translate(0,0)}25%{transform:translate(-1.5px,1px)}75%{transform:translate(1.5px,-1px)}}
  .fz-flame{transform-origin:100px 318px;transform:scaleY(0);transition:transform .35s cubic-bezier(.2,.75,.2,1)}
  .fz.ign .fz-flame{transform:scaleY(1)}
  .fz.go .fz-flame{transform:scaleY(1.7)}
  .fz-flame path{animation:fzFl .08s linear infinite alternate}
  @keyframes fzFl{from{opacity:.85}to{opacity:1}}
  .fz-trail{position:absolute;left:50%;bottom:12vh;width:6px;height:135vh;translate:-50% 0;transform-origin:50% 100%;transform:scaleY(0);border-radius:6px;
    background:linear-gradient(to top,rgba(0,176,255,0) 0%,rgba(0,176,255,.55) 35%,#EAF6FF 85%,#fff 100%);box-shadow:0 0 22px 4px rgba(0,176,255,.45);opacity:0}
  .fz.go .fz-trail{opacity:1;transform:scaleY(1);transition:transform 1.35s ${E},opacity .2s}
  .fz.end .fz-trail{opacity:0;transition:opacity .5s}
  .fz-smoke{position:absolute;left:50%;bottom:10vh;width:0;height:0}
  .fz-smoke i{position:absolute;left:-3rem;top:-3rem;width:6rem;height:6rem;border-radius:50%;background:radial-gradient(closest-side,rgba(205,220,245,.55),rgba(205,220,245,0));opacity:0;transform:translate(0,0) scale(.3)}
  .fz.ign .fz-smoke i{animation:fzPuff 1.6s cubic-bezier(.2,.75,.2,1) forwards}
  @keyframes fzPuff{0%{opacity:0;transform:translate(0,0) scale(.3)}25%{opacity:.9}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(var(--s))}}
  .fz-brand{position:absolute;left:0;right:0;bottom:4.2vh;text-align:center;color:#F3E5D7;font:300 clamp(1.1rem,2.2vw,1.6rem)/1.2 "Cy Grotesk",-apple-system,"Segoe UI",Arial,sans-serif;letter-spacing:-.01em;opacity:0;animation:fzIn .7s .35s cubic-bezier(.2,.75,.2,1) forwards;transition:opacity .4s}
  .fz-brand b{font-weight:700;color:#F9CE12}
  .fz-brand small{display:block;margin-top:.4rem;font-size:.7rem;letter-spacing:.22em;text-transform:uppercase;color:#A89F92}
  .fz.go .fz-brand{opacity:0!important;animation:none}
  .fz-skip{position:absolute;right:max(1rem,env(safe-area-inset-right,0px));bottom:max(1rem,env(safe-area-inset-bottom,0px));font:500 13px/1 "Cy Grotesk",-apple-system,"Segoe UI",Arial,sans-serif;color:#F3E5D7;background:rgba(27,22,16,.55);border:1px solid rgba(220,198,144,.3);border-radius:99rem;padding:.7rem 1.1rem;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:opacity .3s}
  .fz.lift .fz-skip{opacity:0;pointer-events:none}
  .fz.gone{opacity:0;transition:opacity .35s;pointer-events:none}`;
  document.head.appendChild(css);

  const rocket = `<svg viewBox="0 0 200 420" aria-hidden="true">
    <defs>
      <linearGradient id="fzBody" x1="0" x2="1"><stop offset="0" stop-color="#E9DCC0"/><stop offset=".35" stop-color="#FFF8EC"/><stop offset=".7" stop-color="#F3E5D7"/><stop offset="1" stop-color="#C9B48A"/></linearGradient>
      <linearGradient id="fzGold" x1="0" x2="1"><stop offset="0" stop-color="#B39557"/><stop offset=".45" stop-color="#F6E2AE"/><stop offset="1" stop-color="#A88C5C"/></linearGradient>
      <linearGradient id="fzFire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="#9FDcFF"/><stop offset=".6" stop-color="#1969FB"/><stop offset="1" stop-color="#1969FB" stop-opacity="0"/></linearGradient>
      <radialGradient id="fzGlow"><stop offset="0" stop-color="#7CC8FF" stop-opacity=".9"/><stop offset="1" stop-color="#1969FB" stop-opacity="0"/></radialGradient>
    </defs>
    <g class="fz-flame">
      <ellipse cx="100" cy="345" rx="55" ry="40" fill="url(#fzGlow)"/>
      <path d="M78 318 C80 350 92 372 100 410 C108 372 120 350 122 318 Z" fill="url(#fzFire)"/>
      <path d="M90 318 C91 338 96 352 100 372 C104 352 109 338 110 318 Z" fill="#fff" opacity=".9"/>
    </g>
    <path d="M62 236 L22 300 L22 332 L62 302 Z" fill="url(#fzGold)"/>
    <path d="M138 236 L178 300 L178 332 L138 302 Z" fill="url(#fzGold)"/>
    <path d="M100 14 C134 48 142 112 142 172 L142 296 Q142 310 128 310 L72 310 Q58 310 58 296 L58 172 C58 112 66 48 100 14 Z" fill="url(#fzBody)"/>
    <path d="M100 14 C123 37 133 74 137 104 L63 104 C67 74 77 37 100 14 Z" fill="url(#fzGold)"/>
    <rect x="58" y="104" width="84" height="5" fill="#B39557" opacity=".55"/>
    <rect x="58" y="252" width="84" height="7" fill="url(#fzGold)"/>
    <circle cx="100" cy="176" r="33" fill="#0B0907" stroke="url(#fzGold)" stroke-width="6"/>
    <image href="brand/creative-studio-mark.png" x="79" y="158" width="42" height="37"/>
    <path d="M100 252 L100 310" stroke="#B39557" stroke-width="2" opacity=".35"/>
    <path d="M78 310 L122 310 L128 322 L72 322 Z" fill="#2a251d"/>
  </svg>`;
  const el = document.createElement('div');
  el.className = 'fz'; el.setAttribute('aria-hidden', 'true');
  let stars = '';
  for (let i = 0; i < 70; i++) stars += `<i class="fz-star" style="left:${(Math.random() * 100).toFixed(2)}%;top:${(Math.random() * 78).toFixed(2)}%;animation-delay:${(Math.random() * 2.4).toFixed(2)}s;opacity:${(.2 + Math.random() * .6).toFixed(2)};transform:scale(${(.6 + Math.random() * 1.1).toFixed(2)})"></i>`;
  let puffs = '';
  for (let i = 0; i < 14; i++) { const a = (i / 13) * Math.PI, d = 7 + Math.random() * 11;
    puffs += `<i style="--dx:${(Math.cos(a) * d * 1.6).toFixed(1)}rem;--dy:${(-Math.sin(a) * d * .35 - 1).toFixed(1)}rem;--s:${(1.4 + Math.random() * 1.6).toFixed(2)};animation-delay:${(Math.random() * .35).toFixed(2)}s"></i>`; }
  el.innerHTML = `<div class="fz-sky">${stars}<div class="fz-ground"></div><div class="fz-brand"><span>Creative</span> <b>Studio</b><small>Be Creative | Be Excellent</small></div></div>
    <div class="fz-trail"></div><div class="fz-smoke">${puffs}</div><div class="fz-rocket">${rocket}</div>
    <button class="fz-skip" type="button" aria-hidden="false">Passer l'intro</button>`;
  const mount = () => (document.body || root).appendChild(el);
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount, { once: true });

  const T = [];
  const at = (ms, fn) => T.push(setTimeout(fn, ms));
  let done = false;
  function reveal() { root.classList.remove('fusee-on'); }
  function finish(fast) {
    if (done) return; done = true; T.forEach(clearTimeout);
    reveal(); root.classList.remove('fusee-lock');
    el.classList.add(fast ? 'gone' : 'end');
    if (!fast) el.classList.add('lift');
    setTimeout(() => el.remove(), fast ? 400 : 900);
  }
  at(750, () => el.classList.add('ign'));              // allumage
  at(1250, () => el.classList.add('go'));              // décollage
  at(1950, () => { el.classList.add('lift'); reveal(); }); // le ciel se lève, le site apparaît
  at(2700, () => el.classList.add('end'));
  at(3050, () => finish());
  el.querySelector('.fz-skip').addEventListener('click', () => finish(true));
  addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish(true); }, { once: true });
})();
