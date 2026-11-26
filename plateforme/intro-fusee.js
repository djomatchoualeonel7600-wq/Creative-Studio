/* Creative Studio — intro « décollage » (illustration SVG/CSS légère, aucune vidéo).
   Une fusée Creative Studio sur sa tour de lancement : lueur bleue au pied, fumée, décollage,
   puis la scène se dissout et laisse place au site, avec un trait de lumière sur l'horizon.
   Pour la COUPER : remplace true par false juste en dessous.
   Elle se joue à chaque ouverture de l'accueil, dure environ 4 secondes et se passe d'un clic.
   Elle ne s'affiche pas si le visiteur préfère moins d'animations. */
(function () {
  const ACTIVE = false;
  if (!ACTIVE) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const root = document.documentElement;
  root.classList.add('fusee-on', 'fusee-lock');
  const css = document.createElement('style');
  css.textContent = `
  html.fusee-lock,html.fusee-lock body{overflow:hidden}
  html.fusee-on .hero *{animation-play-state:paused!important}
  .fz{--H:min(66vh,40rem);--G:11vh;position:fixed;inset:0;z-index:9999;overflow:hidden;pointer-events:auto;font-family:"Cy Grotesk",-apple-system,"Segoe UI",Arial,sans-serif}
  .fz-bg{position:absolute;inset:0;transition:opacity 1.05s cubic-bezier(.4,0,.2,1)}
  .fz.lift .fz-bg{opacity:0}
  .fz-sky{position:absolute;inset:0;background:radial-gradient(90% 60% at 50% 100%,#1c2578 0%,#0d1250 34%,#070a2c 64%,#04051a 100%)}
  .fz-star{position:absolute;width:2px;height:2px;border-radius:50%;background:#dfe5ff;animation:fzTw 2.6s ease-in-out infinite alternate}
  @keyframes fzTw{from{opacity:.12}to{opacity:.85}}
  .fz-mt{position:absolute;left:0;width:100%;height:30vh;bottom:calc(var(--G) - 1px);filter:blur(1.5px)}
  .fz-ground{position:absolute;left:0;right:0;bottom:0;height:var(--G);background:linear-gradient(#0b0e33 0%,#04051a 70%);border-top:1px solid rgba(130,150,255,.35)}
  .fz-ground::before{content:"";position:absolute;left:50%;top:-1px;width:min(70vw,46rem);height:4.5vh;translate:-50% 0;background:radial-gradient(closest-side,rgba(120,150,255,.55),rgba(120,150,255,0));animation:fzBreath 1.4s ease-in-out infinite alternate}
  .fz-rocks{position:absolute;left:0;right:0;top:0;height:100%;opacity:.5}
  @keyframes fzBreath{from{opacity:.55}to{opacity:1}}
  .fz-stage{position:absolute;left:50%;bottom:calc(var(--G) - var(--H) * .0714);height:var(--H);aspect-ratio:320/560;translate:-50% 0}
  .fz-stage svg{display:block;width:100%;height:100%;overflow:visible}
  .fz-stage .sc{transition:opacity .9s ease}
  .fz.lift .fz-stage .sc{opacity:0}
  .glow{transform-box:fill-box;transform-origin:50% 50%;animation:fzBreath .9s ease-in-out infinite alternate}
  .fz.ign .glow{transform:scale(1.25)}
  .fz.go .glow{transform:scale(1.9)}
  .glow{transition:transform .8s ease}
  .rk{transform-origin:170px 470px;animation:fzIdle 3s ease-in-out infinite alternate}
  @keyframes fzIdle{from{transform:translateY(0)}to{transform:translateY(-.6px)}}
  .fz.ign .rk{animation:fzShake .07s linear infinite}
  @keyframes fzShake{0%,100%{transform:translate(0,0)}25%{transform:translate(-.7px,.5px)}75%{transform:translate(.7px,-.5px)}}
  .fz.go .rk{animation:fzUp 2.6s cubic-bezier(.5,0,.85,.45) forwards}
  @keyframes fzUp{0%{transform:translateY(0) scale(1);opacity:1}70%{opacity:1}100%{transform:translateY(-1150px) scale(.55);opacity:0}}
  .fl{transform-box:view-box;transform-origin:170px 462px;transform:scaleY(.22);opacity:.9;transition:transform .5s cubic-bezier(.2,.75,.2,1)}
  .fz.ign .fl{transform:scaleY(.5)}
  .fz.go .fl{transform:scaleY(1.7)}
  .fl path{animation:fzFl .07s linear infinite alternate}
  @keyframes fzFl{from{opacity:.8}to{opacity:1}}
  .sm circle{transform-box:fill-box;transform-origin:50% 50%;animation:fzFloat 2.2s ease-in-out infinite alternate}
  .sm circle:nth-child(2n){animation-duration:1.7s;animation-direction:alternate-reverse}
  @keyframes fzFloat{from{transform:translateY(0) scale(1)}to{transform:translateY(-3px) scale(1.08)}}
  .fz.go .sm circle{animation:fzPuff 1.6s cubic-bezier(.2,.7,.2,1) forwards}
  @keyframes fzPuff{to{transform:translate(var(--dx),var(--dy)) scale(var(--s));opacity:0}}
  .fz-brand{position:absolute;left:0;right:0;top:12vh;display:flex;flex-direction:column;align-items:center;gap:.7rem;text-align:center;color:#F3E5D7;opacity:0;animation:fzIn .8s .25s cubic-bezier(.2,.75,.2,1) forwards;transition:opacity .5s,transform .8s}
  .fz-brand img{width:clamp(2.6rem,6vw,3.6rem);height:auto;filter:drop-shadow(0 0 18px rgba(249,206,18,.35))}
  .fz-brand .nm{font-weight:300;font-size:clamp(1.3rem,3vw,2rem);line-height:1;letter-spacing:-.01em}
  .fz-brand .nm b{font-weight:700;color:#F9CE12}
  .fz-brand small{font-size:.68rem;letter-spacing:.24em;text-transform:uppercase;color:#9fa8e8}
  @keyframes fzIn{from{opacity:0;transform:translateY(.8rem)}to{opacity:1;transform:none}}
  .fz.go .fz-brand{opacity:0!important;animation:none;transform:translateY(-1rem)}
  .fz-flare{position:absolute;left:0;right:0;bottom:18vh;height:2px;opacity:0;transform:scaleX(0);background:linear-gradient(90deg,transparent,#DCC690 22%,#fff 50%,#DCC690 78%,transparent);box-shadow:0 0 26px 5px rgba(220,198,144,.45),0 0 70px 14px rgba(25,105,251,.25)}
  .fz.lift .fz-flare{animation:fzFlare 1.4s cubic-bezier(.2,.7,.2,1) forwards}
  @keyframes fzFlare{0%{opacity:0;transform:scaleX(.05)}25%{opacity:1}100%{opacity:0;transform:scaleX(1.15)}}
  .fz-arc{position:absolute;left:50%;top:calc(-46vmin + 4rem);width:68vmin;height:68vmin;translate:-50% 0;border-radius:50%;border:2px solid rgba(220,198,144,.95);box-shadow:0 0 30px 3px rgba(220,198,144,.45),inset 0 0 40px rgba(25,105,251,.25);opacity:0;transform:scale(.7)}
  .fz.lift .fz-arc{animation:fzArc 1.5s .15s cubic-bezier(.2,.7,.2,1) forwards}
  @keyframes fzArc{0%{opacity:0;transform:scale(.7)}30%{opacity:.9}100%{opacity:0;transform:scale(1.1)}}
  .fz-skip{position:absolute;right:max(1rem,env(safe-area-inset-right,0px));bottom:max(1rem,env(safe-area-inset-bottom,0px));font:500 13px/1 "Cy Grotesk",-apple-system,"Segoe UI",Arial,sans-serif;color:#F3E5D7;background:rgba(10,12,44,.55);border:1px solid rgba(160,175,255,.3);border-radius:99rem;padding:.7rem 1.1rem;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:opacity .3s}
  .fz.lift .fz-skip{opacity:0;pointer-events:none}
  .fz.gone{opacity:0;transition:opacity .35s;pointer-events:none}`;
  document.head.appendChild(css);

  // Tour de lancement (treillis)
  let tower = '<g stroke="#7d8cff" stroke-width="1.4" fill="none" opacity=".85"><path d="M102 168V496M126 168V496"/>';
  for (let y = 168; y < 494; y += 22) tower += `<path d="M102 ${y}H126M102 ${y}L126 ${y + 22}M126 ${y}L102 ${y + 22}"/>`;
  [214, 276, 338, 400].forEach(y => tower += `<path d="M126 ${y}H148" stroke-width="2"/>`);
  tower += '<path d="M98 168H130" stroke-width="3"/></g>';

  const svg = `<svg viewBox="0 0 320 560" aria-hidden="true">
    <defs>
      <linearGradient id="fzBody" x1="0" x2="1"><stop offset="0" stop-color="#7f8be8"/><stop offset=".42" stop-color="#f4f6ff"/><stop offset=".8" stop-color="#a9b3ff"/><stop offset="1" stop-color="#5a66c2"/></linearGradient>
      <linearGradient id="fzFin" x1="0" x2="1"><stop offset="0" stop-color="#3a46b8"/><stop offset="1" stop-color="#1b2276"/></linearGradient>
      <linearGradient id="fzFire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".22" stop-color="#cfe6ff"/><stop offset=".55" stop-color="#4a7bff"/><stop offset="1" stop-color="#4a7bff" stop-opacity="0"/></linearGradient>
      <radialGradient id="fzGlow"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".25" stop-color="#9fc0ff" stop-opacity=".75"/><stop offset=".6" stop-color="#3b52ff" stop-opacity=".28"/><stop offset="1" stop-color="#3b52ff" stop-opacity="0"/></radialGradient>
      <radialGradient id="fzSph" cx=".35" cy=".3"><stop offset="0" stop-color="#1a2070"/><stop offset="1" stop-color="#05061f"/></radialGradient>
    </defs>
    <g class="sc">
      <ellipse class="glow" cx="170" cy="486" rx="150" ry="64" fill="url(#fzGlow)"/>
      ${tower}
      <rect x="112" y="494" width="116" height="26" rx="2" fill="#0a0d36" stroke="#5f6fe0" stroke-width="1" opacity=".95"/>
      <rect x="150" y="486" width="40" height="8" fill="#161b5c"/>
    </g>
    <g class="rk">
      <g class="fl">
        <ellipse cx="170" cy="478" rx="46" ry="34" fill="url(#fzGlow)"/>
        <path d="M153 462 C155 520 164 570 170 650 C176 570 185 520 187 462Z" fill="url(#fzFire)"/>
        <path d="M162 462 C163 500 167 530 170 575 C173 530 177 500 178 462Z" fill="#fff" opacity=".95"/>
      </g>
      <path d="M146 400 L118 458 L118 472 L146 452Z" fill="url(#fzFin)"/>
      <path d="M194 400 L222 458 L222 472 L194 452Z" fill="url(#fzFin)"/>
      <path d="M170 38V66" stroke="#cfd6ff" stroke-width="2"/>
      <path d="M170 62C176 80 180 98 182 120H158C160 98 164 80 170 62Z" fill="#d9deff"/>
      <rect x="158" y="120" width="24" height="58" fill="url(#fzBody)"/>
      <rect x="158" y="142" width="24" height="10" fill="#171d68"/>
      <path d="M158 178H182L188 192H152Z" fill="url(#fzBody)"/>
      <rect x="152" y="192" width="36" height="120" fill="url(#fzBody)"/>
      <rect x="152" y="206" width="36" height="8" fill="#171d68"/>
      <rect x="152" y="300" width="36" height="8" fill="#171d68"/>
      <circle cx="170" cy="257" r="18" fill="#070816" stroke="#DCC690" stroke-width="2.2"/>
      <image href="brand/creative-studio-mark.png" x="156" y="244" width="28" height="25"/>
      <path d="M152 312H188L194 326H146Z" fill="url(#fzBody)"/>
      <rect x="146" y="326" width="48" height="110" fill="url(#fzBody)"/>
      <rect x="146" y="350" width="48" height="12" fill="#171d68"/>
      <rect x="146" y="398" width="48" height="7" fill="#171d68"/>
      <path d="M146 436H194L200 462H140Z" fill="#161b5c"/>
      <rect x="152" y="462" width="9" height="8" fill="#0a0d36"/><rect x="165.5" y="462" width="9" height="8" fill="#0a0d36"/><rect x="179" y="462" width="9" height="8" fill="#0a0d36"/>
    </g>
    <g class="sm sc">
      ${[[84,500,11,-34,-6,2.2],[104,484,6,-30,-26,2.6],[62,507,14,-48,4,1.8],[210,490,13,30,-8,2.4],[236,478,21,44,-14,2],[250,503,8,52,6,2.4],[198,470,8,22,-30,2.8],[132,512,9,-18,8,2.2]]
        .map(c => `<circle cx="${c[0]}" cy="${c[1]}" r="${c[2]}" fill="url(#fzSph)" stroke="rgba(140,160,255,.55)" stroke-width="1.4" style="--dx:${c[3]}px;--dy:${c[4]}px;--s:${c[5]};animation-delay:${(c[0] % 7) * .12}s"/>`).join('')}
    </g>
  </svg>`;

  const el = document.createElement('div');
  el.className = 'fz'; el.setAttribute('aria-hidden', 'true');
  let stars = '';
  for (let i = 0; i < 60; i++) stars += `<i class="fz-star" style="left:${(Math.random() * 100).toFixed(2)}%;top:${(Math.random() * 70).toFixed(2)}%;animation-delay:${(Math.random() * 2.6).toFixed(2)}s;transform:scale(${(.6 + Math.random() * 1.1).toFixed(2)})"></i>`;
  el.innerHTML = `<div class="fz-bg">
      <div class="fz-sky">${stars}</div>
      <svg class="fz-mt" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 200V118C80 88 150 58 230 98C300 134 360 68 450 90C540 112 600 58 700 84C800 110 880 68 1000 108V200Z" fill="rgba(66,78,226,.3)"/>
        <path d="M0 200V152C100 122 200 142 300 126C420 106 520 152 640 131C760 112 880 142 1000 122V200Z" fill="rgba(54,64,196,.4)"/>
      </svg>
      <div class="fz-ground"><svg class="fz-rocks" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0H1000V8L930 6L860 11L770 5L690 10L600 4L520 9L430 5L340 11L250 6L160 10L70 5L0 9Z" fill="#161a55"/></svg></div>
    </div>
    <div class="fz-brand"><img src="brand/creative-studio-mark.png" alt=""><div class="nm"><span>Creative</span> <b>Studio</b></div><small>Be Creative | Be Excellent</small></div>
    <div class="fz-stage">${svg}</div>
    <div class="fz-flare"></div><div class="fz-arc"></div>
    <button class="fz-skip" type="button">Passer l'intro</button>`;
  const mount = () => (document.body || root).appendChild(el);
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount, { once: true });

  const T = [];
  const at = (ms, fn) => T.push(setTimeout(fn, ms));
  let done = false;
  function reveal() { root.classList.remove('fusee-on'); }
  function finish(fast) {
    if (done) return; done = true; T.forEach(clearTimeout);
    reveal(); root.classList.remove('fusee-lock');
    if (fast) el.classList.add('gone'); else el.classList.add('lift');
    setTimeout(() => el.remove(), fast ? 400 : 200);
  }
  at(450, () => el.classList.add('ign'));                      // allumage : la lueur monte
  at(1650, () => el.classList.add('go'));                      // décollage
  at(2500, () => { el.classList.add('lift'); reveal(); });     // la scène se dissout, le site apparaît
  at(3900, () => finish());
  el.querySelector('.fz-skip').addEventListener('click', () => finish(true));
  addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish(true); }, { once: true });
})();
