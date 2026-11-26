/* Creative Studio — intro « fusée » (en test).
   La fusée décolle, la caméra la suit vers le ciel, puis le site apparaît.
   POUR L'ACTIVER SUR LE SITE EN LIGNE : remplace false par true juste en dessous.
   Pour la voir sans l'activer pour tout le monde : ajoute ?fusee à l'adresse (ex. monsite.com/?fusee).
   Elle ne joue qu'une fois par visite, se passe d'un clic, et ne s'affiche pas si le visiteur préfère moins d'animations. */
(function () {
  const ACTIVE = false;
  const force = /[?&#]fusee\b/.test(location.search + location.hash);
  if (!ACTIVE && !force) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try { if (!force && sessionStorage.getItem('cs-fusee')) return; sessionStorage.setItem('cs-fusee', '1'); } catch (e) {}

  const portrait = innerHeight > innerWidth;
  const root = document.documentElement;
  const css = document.createElement('style');
  css.textContent = `
  .fusee{position:fixed;inset:0;z-index:9999;background:#05060a;display:grid;place-items:center;transition:opacity .8s cubic-bezier(.2,.75,.2,1),visibility .8s}
  .fusee video{width:100%;height:100%;object-fit:cover;display:block}
  .fusee.out{opacity:0;visibility:hidden}
  .fusee .skip{position:absolute;right:max(1rem,env(safe-area-inset-right,0px));bottom:max(1rem,env(safe-area-inset-bottom,0px));font:500 13px/1 "Cy Grotesk",-apple-system,"Segoe UI",Arial,sans-serif;color:#F3E5D7;background:rgba(27,22,16,.55);border:1px solid rgba(220,198,144,.3);border-radius:99rem;padding:.7rem 1.1rem;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
  .fusee .skip:hover{border-color:rgba(220,198,144,.7)}
  html.fusee-lock,html.fusee-lock body{overflow:hidden}`;
  document.head.appendChild(css);

  const el = document.createElement('div');
  el.className = 'fusee'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<video muted playsinline autoplay preload="auto" src="r/intro/fusee-${portrait ? 'v' : 'h'}.mp4"></video><button class="skip" type="button" aria-hidden="false">Passer l'intro</button>`;
  const mount = () => { (document.body || root).appendChild(el); root.classList.add('fusee-lock'); };
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount, { once: true });

  const v = el.querySelector('video');
  let gone = false;
  function finish(fast) {
    if (gone) return; gone = true;
    if (fast) el.style.transitionDuration = '.35s';
    el.classList.add('out'); root.classList.remove('fusee-lock');
    setTimeout(() => el.remove(), 900);
  }
  el.querySelector('.skip').addEventListener('click', () => finish(true));
  addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish(true); }, { once: true });
  v.addEventListener('timeupdate', () => { if (v.currentTime >= v.duration - .75) finish(); });
  v.addEventListener('ended', () => finish());
  v.addEventListener('error', () => finish(true));
  // Si la vidéo ne démarre pas (connexion lente, lecture bloquée), on n'attend pas.
  const guard = setTimeout(() => { if (v.paused || v.readyState < 2) finish(true); }, 2500);
  v.addEventListener('playing', () => clearTimeout(guard), { once: true });
  const p = v.play && v.play(); if (p && p.catch) p.catch(() => finish(true));
})();
