/* Espace client : « où en est mon travail et que dois-je faire ? » (section 7 du document).
   Le client ne voit jamais un créatif : l'équipe apparaît comme « Équipe créative Studio ». */
(function () {
  const { esc, svc, forfait, rel, date, STATES, icon, D } = CS;
  let s = null;
  const app = document.getElementById('app');
  const FILES = []; const reg = (f, id) => { FILES.push([f, id]); return FILES.length - 1; };
  let openId = null;

  const me = () => CS.load().clients.find(c => c.id === s.id);
  const mine = () => CS.load().orders.filter(o => o.clientId === s.id);
  const LAB = { client: 'Vous', studio: 'Creative Studio' };
  const enCours = o => !['terminee', 'annulee'].includes(o.state);
  const visibleVersions = o => o.versions.filter(v => v.statut === 'validee');

  function head() {
    const c = me();
    CS.header({ where: 'Espace client', who: c.nom, role: c.entreprise || 'Client', nav: [['Tableau de bord', 'espace-client.html', true], ['Commander', 'commander.html'], ['Accueil', 'index.html']] });
  }

  /* Ce qui bloque le projet côté client */
  function todos() {
    const out = [];
    mine().forEach(o => {
      if (o.choix && !o.choix.pick && o.state === 'production') out.push([o.id, 'Choisissez entre deux pistes', `${svc(o.service).nom} · ${o.id}`]);
      if (o.state === 'livree') out.push([o.id, 'Votre livraison est prête : validez-la ou demandez une retouche', `${svc(o.service).nom} · ${o.id}`]);
      const last = o.fil.client[o.fil.client.length - 1];
      if (last && last.from === 'studio' && last.question) out.push([o.id, 'Le Studio vous pose une question', `${svc(o.service).nom} · ${o.id}`]);
      if (o.paiement.statut === 'À régler') out.push([o.id, 'Réglez votre commande pour lancer le travail', `${svc(o.service).nom} · ${o.id}`]);
      if (o.state === 'terminee' && !o.retour) out.push([o.id, 'Donnez votre avis sur cette commande', `${svc(o.service).nom} · ${o.id}`]);
    });
    return out;
  }

  function dashboard() {
    FILES.length = 0;
    const c = me(), list = mine(), cur = list.filter(enCours), td = todos();
    const files = list.flatMap(o => visibleVersions(o).slice(-1).flatMap(v => v.fichiers.map(f => ({ f, o }))));
    const done = new Set(list.map(o => o.service));
    const sugMap = { identite: ['miniature', 'personal', 'landing'], miniature: ['motion', 'identite'], personal: ['miniature', 'landing'], motion: ['miniature', 'landing'], uiux: ['landing', 'identite'], landing: ['uiux', 'motion'], audit: ['identite', 'personal'], podcast: ['miniature', 'motion'], surmesure: ['identite', 'motion'] };
    const sug = [...new Set([...done].flatMap(k => sugMap[k] || []))].filter(k => !done.has(k)).slice(0, 3);
    if (!sug.length) sug.push('identite', 'miniature', 'motion');
    const msgs = list.flatMap(o => o.fil.client.filter(m => m.from === 'studio').map(m => ({ m, o }))).sort((a, b) => b.m.at - a.m.at).slice(0, 3);
    app.innerHTML = `
    <div class="hello rise"><div><span class="eyebrow"><i aria-hidden="true"></i>Espace client</span><h1 class="t">Bonjour ${esc(c.nom.split(' ')[0])}, <b>voici où en est votre travail.</b></h1></div>
      <a class="btn btn-metal" href="commander.html">Nouvelle commande <span class="arr" aria-hidden="true">→</span></a></div>
    <div class="dash">
      <section class="card c8 rise"><header><h3>Mes commandes en cours <span class="n">${cur.length}</span></h3><span class="tiny">Touchez une commande pour l'ouvrir</span></header>
        ${cur.length ? cur.map(o => `<button type="button" class="oc" data-open="${o.id}"><div class="row between"><b>${esc(svc(o.service).nom)}${forfait(o).nom ? ' · ' + esc(forfait(o).nom) : ''}</b><span class="pill ${o.state === 'livree' ? 'live' : 'blue'}">${esc(STATES[o.state].client)}</span></div>
          ${CS.stepsBar(o)}<div class="row between tiny" style="margin-top:.6rem"><span>${o.id} · commandée ${rel(o.createdAt)}</span><span>${o.delaiPromis ? 'Livraison estimée : ' + date(o.delaiPromis) : 'Délai confirmé après étude'}</span></div></button>`).join('') : '<p class="empty">Aucune commande en cours. <a href="commander.html">Commander un service</a></p>'}
      </section>
      <section class="card c4 rise"><header><h3>À faire de ma part <span class="n">${td.length}</span></h3></header>
        ${td.length ? td.map(t => `<button type="button" class="todo" data-open="${t[0]}"><i aria-hidden="true"></i><span>${esc(t[1])}<small>${esc(t[2])}</small></span></button>`).join('') : '<p class="empty">Rien à faire pour l’instant : nous avançons.</p>'}
        <p class="tiny" style="margin-top:.8rem">Un projet avance plus vite quand ces actions sont faites rapidement.</p>
      </section>
      <section class="card c6 rise"><header><h3>Livrables prêts</h3>${files.length ? `<button class="lnk" type="button" data-dlall="${files.slice(0, 5).map(x => reg(x.f, x.o.id)).join(',')}">Tout télécharger</button>` : ''}</header>
        ${files.length ? `<div class="stack">${files.slice(0, 5).map(x => CS.fileRow(x.f, `<button class="btn btn-glass btn-sm" type="button" data-dl="${reg(x.f, x.o.id)}">Télécharger</button>`)).join('')}</div>` : '<p class="empty">Vos fichiers validés par le Studio apparaîtront ici.</p>'}
      </section>
      <section class="card c6 rise"><header><h3>Mon espace marque</h3><span class="tiny">Le Studio n'a plus à vous redemander les bases</span></header>
        <div class="stack">
          <div class="row"><span class="tiny" style="width:5.5rem">Couleurs</span><div class="sw8">${c.marque.couleurs.length ? c.marque.couleurs.map(x => `<span style="background:${esc(x)}" title="${esc(x)}"></span>`).join('') : '<span class="tiny" style="width:auto;border:0">À venir après votre identité</span>'}</div></div>
          <div class="row"><span class="tiny" style="width:5.5rem">Polices</span><span class="small">${c.marque.polices.length ? esc(c.marque.polices.join(' · ')) : '<span class="tiny">À venir</span>'}</span></div>
          <label class="fld"><span>Brief permanent de votre marque</span><textarea class="in" data-brief style="min-height:4.5rem" placeholder="Ce que le Studio doit toujours savoir sur votre marque">${esc(c.marque.brief)}</textarea></label>
          <div class="row" style="justify-content:flex-end"><button class="btn btn-glass btn-sm" type="button" data-savebrief>Enregistrer</button></div>
        </div>
      </section>
      <section class="card c4 rise"><header><h3>Commander la suite</h3></header>
        ${sug.map(k => { const x = svc(k); return `<a class="sug" href="commander.html?service=${k}"><span class="ico">${icon(x.icone)}</span><span>${esc(x.nom)}<br><span class="tiny">${esc(CS.prixTxt(null))}</span></span><span style="margin-left:auto" aria-hidden="true">→</span></a>`; }).join('')}
      </section>
      <section class="card c4 rise"><header><h3>Messages du Studio</h3></header>
        ${msgs.length ? msgs.map(x => `<button type="button" class="oc" data-open="${x.o.id}" style="padding:.75rem"><span class="tiny">${x.o.id} · ${rel(x.m.at)}</span><br><span class="small">${esc(x.m.text.slice(0, 110))}${x.m.text.length > 110 ? '…' : ''}</span></button>`).join('') : '<p class="empty">Aucun message.</p>'}
      </section>
      <section class="card c4 rise"><header><h3>Factures et paiements</h3></header>
        <div class="tblw"><table class="tbl"><thead><tr><th>Commande</th><th>Statut</th><th></th></tr></thead><tbody>
        ${list.map(o => `<tr><td>${o.id}<br><span class="tiny">${esc(svc(o.service).nom)}</span></td><td><span class="pill ${o.paiement.statut === 'Payé' ? 'live' : 'warn'}">${esc(o.paiement.statut)}</span></td><td>${o.paiement.statut === 'Payé' && !CS.LIVE ? `<button class="lnk" type="button" data-dl="${reg({ nom: 'Facture ' + o.id + '.pdf' }, o.id)}">Facture</button>` : o.paiement.statut === 'Payé' ? '<span class="tiny">Facture envoyée par e-mail</span>' : ''}</td></tr>`).join('')}
        </tbody></table></div>
      </section>
    </div>`;
  }

  /* ---------- Fenêtre d'une commande ---------- */
  function order(id) {
    const o = CS.load().orders.find(x => x.id === id && x.clientId === s.id);
    if (!o) return;
    openId = id;
    const f = forfait(o), vv = visibleVersions(o), last = vv[vv.length - 1];
    const left = o.retouches.incluses - o.retouches.utilisees;
    const hist = o.historique.filter(h => STATES[h.state].client).map(h => `<li><span class="tiny">${rel(h.at)}</span> · ${esc(STATES[h.state].client)}</li>`).reverse().join('');
    const html = `
      <div class="row between"><div><span class="tiny">${o.id} · commandée le ${date(o.createdAt)}</span><h2 class="t" style="margin-top:.3rem">${esc(svc(o.service).nom)}${f.nom ? ' · <b>' + esc(f.nom) + '</b>' : ''}</h2></div><button class="icb" type="button" data-x aria-label="Fermer">✕</button></div>
      <div class="card" style="margin-top:1rem"><div class="row between"><span class="pill ${o.state === 'livree' || o.state === 'terminee' ? 'live' : 'blue'}"><span class="dot" aria-hidden="true"></span>${esc(STATES[o.state].client)}</span><span class="tiny">${o.delaiPromis ? 'Livraison estimée : ' + date(o.delaiPromis) : 'Délai confirmé après étude'}</span></div>${CS.stepsBar(o)}
        <dl class="kv" style="margin-top:1rem"><dt>Votre équipe</dt><dd>Équipe créative Studio</dd><dt>Secteur · style · format</dt><dd>${esc([o.brief.secteur, o.brief.style, o.brief.format].filter(Boolean).join(' · '))}</dd><dt>Vitrine</dt><dd>${o.publication ? 'Publication autorisée' : 'Confidentiel'} <button class="lnk" type="button" data-pub>${o.publication ? 'Rendre confidentiel' : 'Autoriser'}</button></dd><dt>Paiement</dt><dd>${esc(o.paiement.statut)}</dd></dl></div>

      ${o.choix && o.state === 'production' ? `<div class="card" style="margin-top:1rem"><header><h3>Choisissez une piste</h3>${o.choix.pick ? `<span class="pill live">Piste ${o.choix.pick.toUpperCase()} choisie</span>` : '<span class="pill warn">À faire</span>'}</header>
        <div class="ab">${['a', 'b'].map(k => `<button type="button" data-pick="${k}" aria-pressed="${o.choix.pick === k}" aria-label="Choisir la piste ${k.toUpperCase()}"><img src="${esc(CS.src(o.choix[k]))}" alt="Piste ${k.toUpperCase()}"><b>Piste ${k.toUpperCase()}</b></button>`).join('')}</div>
        <p class="tiny" style="margin-top:.6rem">Un clic suffit. Le Studio transmet votre choix à l'équipe créative.</p></div>` : ''}

      ${last ? `<div class="card" style="margin-top:1rem"><header><h3>Votre livraison · version ${last.n}</h3><button class="lnk" type="button" data-dlall="${last.fichiers.map(x => reg(x, o.id)).join(',')}">Tout télécharger</button></header>
        <div class="stack">${last.fichiers.map(x => CS.fileRow(x, `<button class="btn btn-glass btn-sm" type="button" data-dl="${reg(x, o.id)}">Télécharger</button>`)).join('')}</div>
        ${o.state === 'livree' ? `<hr class="sep"><div class="row between"><span class="small">Retouches restantes : <b>${left}</b> sur ${o.retouches.incluses}</span><div class="row"><button class="btn btn-glass btn-sm" type="button" data-askret ${left < 1 ? 'disabled' : ''}>Demander une retouche</button><button class="btn btn-metal btn-sm" type="button" data-validate>Valider la livraison</button></div></div>
          <div id="retform" hidden style="margin-top:1rem"><label class="fld"><span>Que faut-il changer ? Soyez précis, une demande par ligne.</span><textarea class="in" data-ret placeholder="Ex. Agrandir le nom sous le logo&#10;Essayer un vert plus clair"></textarea></label><div class="row" style="justify-content:flex-end;margin-top:.6rem"><button class="btn btn-metal btn-sm" type="button" data-sendret>Envoyer la demande</button></div></div>
          <p class="tiny" style="margin-top:.7rem">Sans réponse de votre part, la livraison sera considérée comme validée quelques jours après son envoi.</p>` : ''}</div>` : ''}

      ${o.state === 'terminee' ? `<div class="card" style="margin-top:1rem"><header><h3>Votre avis sur cette commande</h3><span class="tiny">Visible seulement par l'équipe Studio</span></header>
        ${o.retour ? `<p class="small">Merci ! Qualité ${o.retour.q}/5 · Délai ${o.retour.d}/5 · Communication ${o.retour.c}/5. ${o.retour.again ? 'Vous referiez appel à nous.' : ''}</p>` : `
        <div class="stack">${[['q', 'Qualité du travail'], ['d', 'Respect du délai'], ['c', 'Communication']].map(([k, l]) => `<div class="row between"><span class="small">${l}</span><span class="stars" role="radiogroup" aria-label="${l}" data-st="${k}">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" aria-checked="false" aria-label="${n} sur 5" data-v="${n}">★</button>`).join('')}</span></div>`).join('')}
        <label class="fld"><span>Un commentaire (facultatif)</span><textarea class="in" data-com style="min-height:4rem"></textarea></label>
        <label class="sw"><input type="checkbox" data-again checked><span>Je referais appel à Creative Studio</span></label>
        <div class="row" style="justify-content:flex-end"><button class="btn btn-metal btn-sm" type="button" data-sendfb>Envoyer mon avis</button></div></div>`}</div>` : ''}

      <div class="card" style="margin-top:1rem"><header><h3>Messages avec Creative Studio</h3><span class="tiny">Un seul interlocuteur</span></header>
        ${CS.thread(o.fil.client, 'client', LAB)}
        <form class="compose" data-send><label class="sr" for="cmsg">Votre message</label><input class="in" id="cmsg" placeholder="Écrire au Studio…" autocomplete="off"><button class="btn btn-metal btn-sm" type="submit">Envoyer</button></form></div>

      <div class="card" style="margin-top:1rem"><header><h3>Votre brief</h3></header><dl class="kv">${svc(o.service).questions.map((q, i) => o.brief.reponses[i] ? `<dt>${esc(q)}</dt><dd>${esc(o.brief.reponses[i])}</dd>` : '').join('')}${o.brief.couleurs ? `<dt>Couleurs</dt><dd>${esc(o.brief.couleurs)}</dd>` : ''}</dl>
        ${(o.brief.refs || []).length ? `<div class="stack" style="margin-top:.8rem">${o.brief.refs.map(f => typeof f === 'string' ? `<div class="tiny">${esc(f)}</div>` : CS.fileRow(f, f.path || f.url ? `<button class="btn btn-glass btn-sm" type="button" data-dl="${reg(f, o.id)}">Ouvrir</button>` : '')).join('')}</div>` : ''}
        ${!['terminee', 'annulee'].includes(o.state) ? `<div class="row" style="margin-top:.8rem"><label class="sr" for="addrefs">Ajouter des fichiers de référence</label><input class="in" id="addrefs" type="file" multiple data-addrefs style="flex:1"><button class="btn btn-glass btn-sm" type="button" data-sendrefs>Ajouter des références</button></div>` : ''}</div>
      <div class="card" style="margin-top:1rem"><header><h3>Historique</h3></header><ul style="margin:0;padding-left:1rem;display:grid;gap:.3rem;font-size:.8125rem">${hist}</ul>
        ${['soumise', 'qualification', 'dispatch'].includes(o.state) ? '<hr class="sep"><button class="lnk" type="button" data-cancel style="color:var(--bad)">Annuler cette commande</button>' : ''}</div>`;
    const pn = CS.drawer(html, () => { openId = null; history.replaceState(null, '', location.pathname); });
    bindOrder(pn, o);
  }

  function bindOrder(pn, o) {
    const id = o.id, go = (...a) => CS.act(...a).then(r => { refresh(); return r; });
    pn.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => go('pick', id, b.dataset.pick).then(() => CS.toast('Votre choix est transmis')));
    const pub = pn.querySelector('[data-pub]'); if (pub) pub.onclick = () => go('publication', id, !o.publication);
    const ask = pn.querySelector('[data-askret]'); if (ask) ask.onclick = () => { pn.querySelector('#retform').hidden = false; pn.querySelector('[data-ret]').focus(); };
    const sr = pn.querySelector('[data-sendret]'); if (sr) sr.onclick = () => {
      const t = pn.querySelector('[data-ret]').value.trim(); if (!t) return pn.querySelector('[data-ret]').focus();
      go('retouche', id, t).then(() => CS.toast('Demande envoyée au Studio'));
    };
    const va = pn.querySelector('[data-validate]'); if (va) va.onclick = () => go('validate', id).then(() => CS.toast('Livraison validée, merci !'));
    pn.querySelectorAll('[data-st]').forEach(g => g.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; g.dataset.val = b.dataset.v; g.querySelectorAll('button').forEach(x => { const on = +x.dataset.v <= +b.dataset.v; x.classList.toggle('on', on); x.setAttribute('aria-checked', x === b); }); }));
    const fb = pn.querySelector('[data-sendfb]'); if (fb) fb.onclick = () => {
      const v = k => +(pn.querySelector(`[data-st="${k}"]`).dataset.val || 0);
      if (!v('q') || !v('d') || !v('c')) return CS.toast('Donnez une note à chacun des trois critères');
      go('feedback', id, { q: v('q'), d: v('d'), c: v('c'), comment: pn.querySelector('[data-com]').value.trim(), again: pn.querySelector('[data-again]').checked }).then(() => CS.toast('Merci pour votre avis'));
    };
    const form = pn.querySelector('[data-send]'); if (form) form.onsubmit = e => {
      e.preventDefault(); const i = form.querySelector('input'); const t = i.value.trim(); if (!t) return;
      go('msg', id, 'client', t).then(() => setTimeout(() => { const f = document.querySelector('#drawer #cmsg'); if (f) f.focus(); }, 30));
    };
    const ar = pn.querySelector('[data-sendrefs]'); if (ar) ar.onclick = async () => {
      const files = [...pn.querySelector('[data-addrefs]').files]; if (!files.length) return CS.toast('Choisissez d’abord vos fichiers');
      ar.disabled = true; ar.textContent = 'Envoi…';
      try { const up = await CS.uploadAll('refs/' + s.id, files); await go('addRefs', id, up); CS.toast('Références ajoutées'); } catch (x) { CS.toast(CS.clean(x.message)); ar.disabled = false; ar.textContent = 'Ajouter des références'; }
    };
    const ca = pn.querySelector('[data-cancel]'); if (ca) ca.onclick = () => { if (confirmCancel()) go('cancelClient', id).then(() => CS.toast('Commande annulée')); };
  }
  let cancelArmed = 0;
  function confirmCancel() { if (Date.now() - cancelArmed < 4000) return true; cancelArmed = Date.now(); CS.toast('Cliquez une seconde fois pour confirmer l’annulation'); return false; }

  function refresh() { head(); dashboard(); if (openId && CS.drawerOpen()) order(openId); }
  app.addEventListener('click', e => {
    const o = e.target.closest('[data-open]'); if (o) { history.replaceState(null, '', '#' + o.dataset.open); order(o.dataset.open); return; }
    if (e.target.closest('[data-savebrief]')) { CS.act('updateMe', { brief: app.querySelector('[data-brief]').value.trim() }).then(() => CS.toast('Brief de marque enregistré')); }
  });
  document.addEventListener('click', async e => {
    const d = e.target.closest('[data-dl]'); if (d) { const [f, oid] = FILES[+d.dataset.dl] || []; if (f) CS.download(f, oid); return; }
    const a = e.target.closest('[data-dlall]'); if (a) { for (const k of a.dataset.dlall.split(',')) { const [f, oid] = FILES[+k] || []; if (f) { await CS.download(f, oid); await new Promise(r => setTimeout(r, 700)); } } }
  });
  (async () => {
    if (!CS.LIVE) { await CS.ready(); const db0 = CS.load(), s0 = CS.session(); if (!s0 || s0.role !== 'client' || !db0.clients.find(c => c.id === s0.id)) CS.login('client', db0.clients[0].id); }
    if (!(await CS.guard('client'))) return;
    s = CS.session();
    CS.on(refresh);
    head(); dashboard();
    if (location.hash.length > 1) order(decodeURIComponent(location.hash.slice(1)));
  })();
})();
