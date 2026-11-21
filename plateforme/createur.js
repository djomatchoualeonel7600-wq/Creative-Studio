/* Espace créatif : une boîte de missions, pas une vitrine (section 8 du document).
   Le créatif ne voit jamais le client : seulement un numéro de mission, un secteur, un type de projet. */
(function () {
  const { esc, svc, forfait, rel, date, STATES, PROGRESS, D } = CS;
  let s = null;
  const FILES = []; const reg = (f, id) => { FILES.push([f, id]); return FILES.length - 1; };
  const app = document.getElementById('app');
  let openId = null, tick = null;
  const me = () => CS.load().creatifs.find(c => c.id === s.id);
  const LAB = { crea: 'Vous', studio: 'Creative Studio' };
  const remu = o => o.remuneration == null ? 'Selon la grille' : o.remuneration + ' ' + D.devise;
  const briefClean = o => o.briefNettoye || svc(o.service).questions.map((q, i) => o.brief.reponses[i] ? `${q} : ${o.brief.reponses[i]}` : '').filter(Boolean).join('\n');

  function offers() {
    const c = me();
    return CS.load().orders.filter(o => o.state === 'dispatch' && o.offreOuverte && !o.creaId && (CS.LIVE || (o.offreOuverte.cibles || []).includes(c.id)));
  }
  const missions = () => CS.load().orders.filter(o => o.creaId === s.id && ['attribuee', 'production', 'controle', 'retouche', 'livree'].includes(o.state));
  const doneMissions = () => CS.load().orders.filter(o => o.creaId === s.id && o.state === 'terminee');

  function head() {
    const c = me();
    CS.header({ where: 'Espace créatif', who: c.pseudo, role: c.niveau, nav: [['Mes missions', 'espace-createur.html', true], ['Accueil', 'index.html']] });
  }

  function render() {
    const c = me(), of = offers(), ms = missions(), dm = doneMissions();
    const ret = ms.filter(o => o.state === 'retouche');
    FILES.length = 0;
    const parts = CS.LIVE ? realParts(dm) : CS.scoreParts(c);
    const portfolio = CS.LIVE ? (c.portfolio || []) : (c.portfolio || (c.portfolio = [{ titre: 'Identité restaurant', secteur: 'Restauration', format: 'Impression', img: 'i/el-gallo-01.jpg', pub: 'Privé' }, { titre: 'Motif de marque', secteur: 'Mode & beauté', format: 'Carré 1:1', img: 'i/keniz-01.jpg', pub: 'Montré en vitrine' }, { titre: 'Pack cookies', secteur: 'Restauration', format: 'Impression', img: 'i/cookies-01.jpg', pub: 'Privé' }]));
    app.innerHTML = `${c.niveau === 'Candidat' ? `<div class="card rise" style="margin-top:2rem;border-color:rgba(0,176,255,.45)"><header><h3>Votre candidature est en cours d'examen</h3><span class="pill blue">Candidat</span></header><p class="small muted" style="margin:0">Merci ${esc(c.pseudo)} ! L'équipe Creative Studio étudie votre profil. Déposez dès maintenant 3 à 5 de vos meilleurs travaux dans « Mon portfolio » ci-dessous : ils servent à votre certification. Une fois certifié pour un service, vous recevrez ici des offres de missions payées.</p></div>` : ''}
    <div class="hello rise"><div><span class="eyebrow"><i aria-hidden="true"></i>Espace créatif · ${esc(c.niveau)}</span><h1 class="t">Bonjour ${esc(c.pseudo)}, <b>voici vos missions.</b></h1></div>
      <div class="card" style="padding:.9rem 1rem"><div class="row"><span class="small">Mon statut</span>
        <div class="seg" role="group" aria-label="Mon statut">${[['dispo', 'Disponible'], ['occupe', 'Occupé'], ['absent', 'Absent']].map(([k, l]) => `<button type="button" data-stat="${k}" aria-pressed="${c.statut === k}">${l}</button>`).join('')}</div></div>
        ${c.statut === 'absent' ? `<label class="fld" style="margin-top:.6rem"><span>Absent jusqu'au</span><input class="in" type="date" data-until value="${c.absentJusqua ? new Date(c.absentJusqua).toISOString().slice(0, 10) : ''}"></label>` : ''}
        <p class="tiny" style="margin:.5rem 0 0">Visible uniquement par l'équipe Studio. ${c.capacite} missions en parallèle · ${esc(c.langues.join(', '))} · ${esc(c.fuseau)}</p></div></div>
    <div class="dash">
      <section class="card c7 rise"><header><h3>Offres ouvertes <span class="n">${of.length}</span></h3><span class="tiny">Levez la main, l'équipe attribue</span></header>
        ${of.length ? of.map(o => { const mine = o.offres.find(x => x.creaId === c.id); return `<div class="offer"><div class="row between"><b style="font-weight:500">Mission ${o.id} · ${esc(svc(o.service).nom)}</b><span class="cd" data-cd="${o.offreOuverte.fin}">--</span></div>
          <div class="row tiny" style="margin-top:.3rem"><span class="pill">${esc(o.brief.secteur)}</span><span class="pill">${esc(o.brief.style || '—')}</span><span class="pill">${esc(o.brief.format || '—')}</span><span>Rémunération : ${esc(remu(o))}</span><span>Échéance client : ${o.delaiPromis ? date(o.delaiPromis) : 'à définir'}</span></div>
          <p class="small muted" style="white-space:pre-line;margin:.6rem 0">${esc(briefClean(o))}</p><p class="tiny" style="margin:0 0 .6rem">Client : masqué · Brief nettoyé par le Studio</p>
          ${mine ? `<span class="pill live"><span class="dot" aria-hidden="true"></span>Vous avez levé la main · délai proposé ${esc(mine.delai)}</span>` : `<div class="row"><label class="sr" for="dl-${o.id}">Délai proposé</label><select class="in" id="dl-${o.id}" style="width:auto">${['2 jours', '3 jours', '4 jours', '5 jours', '1 semaine'].map(d => `<option>${d}</option>`).join('')}</select><button class="btn btn-blue btn-sm" type="button" data-accept="${o.id}">J'accepte cette mission</button><button class="lnk" type="button" data-decline="${o.id}">Décliner</button></div>`}</div>`; }).join('')
          : `<p class="empty">${c.statut === 'dispo' ? 'Aucune offre pour l’instant. Les nouvelles offres apparaissent ici d’elles-mêmes : revenez régulièrement.' : 'Passez en « Disponible » pour recevoir des offres.'}</p>`}
      </section>
      <section class="card c5 rise"><header><h3>Mes missions en cours <span class="n">${ms.length}</span></h3></header>
        ${ms.length ? ms.map(o => `<button type="button" class="mi" data-open="${o.id}"><div class="row between"><b style="font-weight:500">${o.id} · ${esc(svc(o.service).nom)}</b><span class="pill ${o.state === 'retouche' ? 'warn' : o.state === 'controle' ? 'blue' : ''}">${esc(STATES[o.state].crea)}</span></div>
          <div class="row tiny" style="margin-top:.3rem"><span>${esc(o.brief.secteur)}</span><span>Échéance : ${o.delaiPromis ? date(o.delaiPromis) : '—'}</span><span>Avancement : ${esc(o.progres || 'non déclaré')}</span></div></button>`).join('') : '<p class="empty">Aucune mission en cours.</p>'}
      </section>
      <section class="card c4 rise"><header><h3>Retouches demandées <span class="n">${ret.length}</span></h3></header>
        ${ret.length ? ret.map(o => { const f = o.retouches.fiches[o.retouches.fiches.length - 1]; return `<button type="button" class="mi" data-open="${o.id}"><b style="font-weight:500">${o.id} · fiche n°${f ? f.n : '—'}</b><br><span class="tiny">${f && f.reformule ? esc(f.reformule.split('\n')[0]) : 'Le Studio prépare la fiche de retouche'}</span></button>`; }).join('') : '<p class="empty">Aucune retouche en attente.</p>'}
      </section>
      <section class="card c4 rise"><header><h3>Mes gains</h3></header>
        <div class="g2"><div class="kpi"><b>${c.gains.recu} ${D.devise}</b><small>Déjà payé</small></div><div class="kpi"><b>${c.gains.attente} ${D.devise}</b><small>À recevoir</small></div></div>
        <p class="tiny" style="margin-top:.7rem">Le paiement est déclenché quand le client valide la livraison. ${dm.length} mission(s) terminée(s).</p>
      </section>
      <section class="card c4 rise"><header><h3>Mes indicateurs</h3>${CS.LIVE ? '' : '<span class="tiny">Exemple</span>'}</header>
        ${parts.slice(0, 4).map(p => `<div style="margin-bottom:.55rem"><div class="row between small"><span>${p[0]}</span><b style="font-weight:500">${p[2]} %</b></div><div class="bar"><i style="width:${p[2]}%"></i></div></div>`).join('')}
        <p class="tiny">${CS.LIVE && !dm.length ? 'Vos indicateurs apparaîtront après vos premières missions terminées.' : 'Calculés sur vos délais et vos retouches. Les notes internes de l’équipe ne sont pas affichées.'}</p>
      </section>
      <section class="card c6 rise"><header><h3>Mon portfolio</h3><span class="tiny">Privé tant que l'équipe ne le montre pas</span></header>
        ${portfolio.length ? '' : '<p class="empty">Aucun travail déposé pour l’instant.</p>'}<div class="pf-grid">${portfolio.map(p => `<figure><img src="${esc(CS.src(p))}" alt="${esc(p.titre)}" loading="lazy"><figcaption>${esc(p.pub)} · ${esc(p.secteur)}</figcaption></figure>`).join('')}</div>
        <details style="margin-top:.8rem" ${c.niveau === 'Candidat' && !portfolio.length ? 'open' : ''}><summary class="small" style="cursor:pointer">Déposer un travail</summary>
          <div class="stack" style="margin-top:.7rem"><label class="fld"><span>Nom du projet</span><input class="in" data-pft></label>
          <div class="g2"><label class="fld"><span>Secteur (obligatoire)</span><select class="in" data-pfs>${D.secteurs.map(x => `<option>${x}</option>`).join('')}</select></label><label class="fld"><span>Format (obligatoire)</span><select class="in" data-pff>${D.formats.map(x => `<option>${x}</option>`).join('')}</select></label></div>
          <label class="fld"><span>Image du travail (JPG, PNG, WEBP)</span><input class="in" type="file" data-pfi accept="image/*"></label>
          <p class="tiny">L'accord de publication vient de la commande d'origine : vous ne publiez jamais seul.</p>
          <div class="row" style="justify-content:flex-end"><button class="btn btn-glass btn-sm" type="button" data-pfadd>Déposer</button></div></div></details>
      </section>
      <section class="card c6 rise"><header><h3>Annuaire des créatifs</h3><span class="tiny">Entre pairs, pour les missions d'équipe</span></header>
        ${CS.load().creatifs.filter(x => x.id !== c.id).map(x => `<div class="peer"><i aria-hidden="true">${esc(x.pseudo[0])}</i><span style="flex:1">${esc(x.pseudo)}<br><span class="tiny">${esc(x.specialites.map(k => svc(k).nom).join(', '))} · ${esc(x.langues.join(', '))}</span></span><span class="pill">${esc(x.niveau)}</span></div>`).join('')}
      </section>
    </div>`;
    countdown();
  }
  function countdown() {
    clearInterval(tick);
    const upd = () => document.querySelectorAll('[data-cd]').forEach(el => { const d = +el.dataset.cd - CS.now(); el.textContent = d > 0 ? 'Répondre avant ' + CS.dur(d) : 'Offre expirée'; });
    upd(); tick = setInterval(upd, 30e3);
  }

  /* ---------- Fenêtre d'une mission ---------- */
  function mission(id) {
    const o = CS.load().orders.find(x => x.id === id && x.creaId === s.id); if (!o) return;
    openId = id;
    const fiche = o.retouches.fiches[o.retouches.fiches.length - 1];
    const canDeliver = ['attribuee', 'production', 'retouche'].includes(o.state);
    const html = `
      <div class="row between"><div><span class="tiny">Mission ${o.id} · client masqué</span><h2 class="t" style="margin-top:.3rem">${esc(svc(o.service).nom)}${forfait(o).nom ? ' · <b>' + esc(forfait(o).nom) + '</b>' : ''}</h2></div><button class="icb" type="button" data-x aria-label="Fermer">✕</button></div>
      <div class="card" style="margin-top:1rem"><div class="row between"><span class="pill ${o.state === 'retouche' ? 'warn' : 'blue'}"><span class="dot" aria-hidden="true"></span>${esc(STATES[o.state].crea)}</span><span class="tiny">Échéance : ${o.delaiPromis ? date(o.delaiPromis) + ' (' + rel(o.delaiPromis) + ')' : '—'}</span></div>
        <dl class="kv" style="margin-top:.9rem"><dt>Secteur · style · format</dt><dd>${esc([o.brief.secteur, o.brief.style, o.brief.format].filter(Boolean).join(' · '))}</dd><dt>Rémunération</dt><dd>${esc(remu(o))}</dd>${o.choix ? `<dt>Choix A ou B</dt><dd>${o.choix.pick ? 'Le client a choisi la piste ' + o.choix.pick.toUpperCase() : 'En attente du client'}</dd>` : ''}</dl>
        ${['attribuee', 'production', 'retouche'].includes(o.state) ? `<hr class="sep"><b class="small" style="font-weight:500">Déclarer mon avancement</b><div class="prog" role="group" aria-label="Avancement">${PROGRESS.map(p => `<button type="button" data-p="${p}" aria-pressed="${o.progres === p}">${p}</button>`).join('')}</div><p class="tiny" style="margin:.5rem 0 0">Deux secondes suffisent. Sans nouvelle de votre part, la plateforme vous relance puis prévient l'équipe.</p>` : ''}</div>
      <div class="card" style="margin-top:1rem"><header><h3>Brief nettoyé par le Studio</h3></header><p class="small" style="white-space:pre-line;margin:0">${esc(briefClean(o))}</p>${o.brief.couleurs ? `<p class="small muted">Couleurs aimées : ${esc(o.brief.couleurs)}</p>` : ''}${(o.brief.refs || []).length ? `<div class="stack" style="margin-top:.7rem">${o.brief.refs.filter(f => typeof f === 'object').map(f => CS.fileRow(f, f.path || f.url ? `<button class="btn btn-glass btn-sm" type="button" data-dl="${reg(f, o.id)}">Ouvrir</button>` : '')).join('')}</div>` : ''}</div>
      ${o.state === 'retouche' ? `<div class="card" style="margin-top:1rem;border-color:rgba(232,176,75,.45)"><header><h3>Fiche de retouche n°${fiche ? fiche.n : ''}</h3></header>${fiche && fiche.reformule ? `<ol class="small" style="margin:0;padding-left:1.1rem">${fiche.reformule.split('\n').filter(Boolean).map(l => `<li>${esc(l)}</li>`).join('')}</ol>` : '<p class="empty">Le Studio reformule la demande du client. Vous la recevrez ici, claire et numérotée.</p>'}</div>` : ''}
      <div class="card" style="margin-top:1rem"><header><h3>Mes dépôts</h3></header>
        ${o.versions.length ? o.versions.map(v => `<div class="sub"><div class="row between"><b style="font-weight:500">Version ${v.n}</b><span class="pill ${v.statut === 'validee' || v.statut === 'pistes' ? 'live' : v.statut === 'refusee' ? 'bad' : 'blue'}">${v.statut === 'validee' ? 'Validée par le Studio' : v.statut === 'pistes' ? 'Pistes transmises au client' : v.statut === 'refusee' ? 'À corriger' : 'En contrôle'}</span></div><p class="tiny" style="margin:.3rem 0">${esc(v.note || '')}${v.consigne ? '<br><b style="color:var(--warn);font-weight:500">Consigne du Studio : ' + esc(v.consigne) + '</b>' : ''}</p><div class="stack">${v.fichiers.map(f => CS.fileRow(f, f.path || f.url ? `<button class="btn btn-glass btn-sm" type="button" data-dl="${reg(f, o.id)}">Ouvrir</button>` : '')).join('')}</div></div>`).join('') : '<p class="empty">Aucun dépôt pour l’instant.</p>'}
        ${canDeliver ? `<hr class="sep"><b class="small" style="font-weight:500">Livrer une nouvelle version</b>
          <div class="seg" role="radiogroup" aria-label="Type de dépôt" style="margin-top:.6rem">${(o.choix ? [['livrable', 'Livraison']] : [['pistes', 'Deux pistes A et B'], ['livrable', 'Livraison']]).map(([k, l], i) => `<button type="button" role="radio" data-kind="${k}" aria-pressed="${i === 0}">${l}</button>`).join('')}</div>
          <p class="tiny" data-kindhelp>${o.choix ? 'Déposez les fichiers finaux.' : 'Déposez exactement deux images : le client choisira entre la piste A et la piste B.'}</p>
          <label class="fld" style="margin-top:.6rem"><span>Fichiers (PNG, JPG, PDF, SVG, sources…)</span><input class="in" type="file" multiple data-files></label>
          <div class="chk">${['Formats demandés respectés', 'Résolution suffisante pour l’impression et le web', 'Fichiers bien nommés', 'Aucune signature ni nom personnel dans les fichiers'].map((l, i) => `<label class="sw"><input type="checkbox" data-chk="${i}"><span>${l}</span></label>`).join('')}</div>
          <label class="fld"><span>Note de livraison pour le Studio</span><textarea class="in" data-note style="min-height:4rem" placeholder="Ce que vous livrez, ce qu'il faut savoir"></textarea></label>
          <div class="row" style="justify-content:flex-end;margin-top:.6rem"><button class="btn btn-metal btn-sm" type="button" data-deliver>Envoyer au contrôle Studio <span class="arr" aria-hidden="true">→</span></button></div>` : ''}</div>
      <div class="card" style="margin-top:1rem"><header><h3>Messages avec Creative Studio</h3><span class="tiny">Le Studio relaie avec le client</span></header>
        ${CS.thread(o.fil.crea, 'crea', LAB)}
        <form class="compose" data-send><label class="sr" for="mmsg">Votre message</label><input class="in" id="mmsg" placeholder="Écrire au Studio…" autocomplete="off"><button class="btn btn-metal btn-sm" type="submit">Envoyer</button></form></div>`;
    const pn = CS.drawer(html, () => { openId = null; });
    bind(pn, o);
  }
  function bind(pn, O) {
    const id = O.id, go = (...a) => CS.act(...a).then(r => { refresh(); return r; });
    pn.querySelectorAll('[data-p]').forEach(b => b.onclick = () => go('progress', id, b.dataset.p).then(() => CS.toast('Avancement déclaré')));
    pn.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => {
      pn.querySelectorAll('[data-kind]').forEach(x => x.setAttribute('aria-pressed', x === b));
      pn.querySelector('[data-kindhelp]').textContent = b.dataset.kind === 'pistes' ? 'Déposez exactement deux images : le client choisira entre la piste A et la piste B.' : 'Déposez les fichiers finaux.';
    });
    const dv = pn.querySelector('[data-deliver]'); if (dv) dv.onclick = async () => {
      const files = [...pn.querySelector('[data-files]').files];
      const kindB = pn.querySelector('[data-kind][aria-pressed="true"]'); const kind = kindB ? kindB.dataset.kind : 'livrable';
      if (!files.length) return CS.toast('Ajoutez vos fichiers');
      if (kind === 'pistes' && files.length !== 2) return CS.toast('Déposez exactement deux pistes (A et B)');
      if (![...pn.querySelectorAll('[data-chk]')].every(x => x.checked)) return CS.toast('Cochez la liste de contrôle avant d’envoyer');
      dv.disabled = true;
      try {
        const up = await CS.uploadAll('livrables/' + id, files, (i, n) => { dv.textContent = `Envoi ${i}/${n}…`; });
        await go('deliver', id, kind, pn.querySelector('[data-note]').value.trim(), up);
        CS.toast('Envoyé au contrôle du Studio');
      } catch (e) { dv.disabled = false; dv.innerHTML = 'Envoyer au contrôle Studio <span class="arr" aria-hidden="true">→</span>'; }
    };
    const form = pn.querySelector('[data-send]'); if (form) form.onsubmit = e => {
      e.preventDefault(); const t = form.querySelector('input').value.trim(); if (!t) return;
      go('msg', id, 'crea', t).then(() => setTimeout(() => { const f = document.querySelector('#drawer #mmsg'); if (f) f.focus(); }, 30));
    };
  }
  /* Indicateurs réels (en ligne) : délais tenus et retouches sur les missions terminées */
  function realParts(dm) {
    if (!dm.length) return [];
    const onTime = dm.filter(o => { const l = o.historique.find(h => h.state === 'livree'); return o.delaiPromis && l && l.at <= o.delaiPromis; }).length;
    const ret = dm.reduce((a, o) => a + (o.retouches.utilisees || 0), 0) / dm.length;
    const first = dm.filter(o => !o.versions.some(v => v.statut === 'refusee')).length;
    return [['Délais tenus', 0, Math.round(onTime / dm.length * 100)], ['Validés au premier contrôle', 0, Math.round(first / dm.length * 100)], ['Missions sans retouche', 0, Math.round(dm.filter(o => !o.retouches.utilisees).length / dm.length * 100)]].concat(ret ? [] : []);
  }

  function refresh() { head(); render(); if (openId && CS.drawerOpen()) mission(openId); }
  app.addEventListener('click', async e => {
    const c = me();
    const st = e.target.closest('[data-stat]'); if (st) {
      const p = { statut: st.dataset.stat }; if (p.statut === 'absent' && !c.absentJusqua) p.absentJusqua = CS.now() + 3 * CS.DAY;
      CS.act('updateMe', p).then(() => { CS.toast('Statut mis à jour'); refresh(); }); return;
    }
    const ac = e.target.closest('[data-accept]'); if (ac) { const id = ac.dataset.accept; CS.act('accept', id, app.querySelector('#dl-' + id).value).then(() => { CS.toast('Main levée : l’équipe choisit et vous confirme'); refresh(); }); return; }
    const de = e.target.closest('[data-decline]'); if (de) { CS.act('decline', de.dataset.decline).then(refresh); return; }
    const op = e.target.closest('[data-open]'); if (op) { mission(op.dataset.open); return; }
    if (e.target.closest('[data-pfadd]')) {
      const b = e.target.closest('[data-pfadd]'), f = app.querySelector('[data-pfi]').files[0];
      if (!f) return CS.toast('Choisissez une image');
      if (!/^image\//.test(f.type)) return CS.toast('Déposez une image (JPG, PNG ou WEBP)');
      b.disabled = true; b.textContent = 'Envoi…';
      try {
        const up = await CS.upload('portfolio/' + s.id, f);
        await CS.act('portfolioAdd', { titre: app.querySelector('[data-pft]').value.trim() || 'Travail', secteur: app.querySelector('[data-pfs]').value, format: app.querySelector('[data-pff]').value, path: up.path, url: up.url, img: up.url ? undefined : (CS.LIVE ? undefined : 'i/logo-all-01.jpg') });
        CS.toast('Travail déposé (privé)'); refresh();
      } catch (x) { b.disabled = false; b.textContent = 'Déposer'; }
    }
  });
  document.addEventListener('click', e => { const d = e.target.closest('[data-dl]'); if (d) { const [f, oid] = FILES[+d.dataset.dl] || []; if (f) CS.download(f, oid); } });
  app.addEventListener('change', e => { if (e.target.matches('[data-until]')) CS.act('updateMe', { statut: 'absent', absentJusqua: new Date(e.target.value).getTime() }); });
  (async () => {
    if (!CS.LIVE) { await CS.ready(); const db0 = CS.load(), s0 = CS.session(); if (!s0 || s0.role !== 'crea' || !db0.creatifs.find(c => c.id === s0.id)) CS.login('crea', 'cr1'); }
    if (!(await CS.guard('crea'))) return;
    s = CS.session();
    CS.on(refresh);
    head(); render();
  })();
})();
