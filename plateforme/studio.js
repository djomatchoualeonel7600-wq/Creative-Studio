/* Back-office : la tour de contrôle de l'équipe Studio (section 9 du document).
   Seule l'équipe voit les deux côtés ; chaque passage entre client et créatif passe par ici. */
(function () {
  const { esc, svc, forfait, rel, date, dur, STATES, D } = CS;
  let s = null;
  const FILES = []; const reg = (f, id) => { FILES.push([f, id]); return FILES.length - 1; };
  const app = document.getElementById('app');
  let tab = 'file', openId = null, q = '', onlyDispo = false, tick = null;

  const ROLES = { tous: 'Accès complet', accueil: 'Accueil et qualification', dispatch: 'Dispatch', controle: 'Contrôle qualité', finance: 'Finance' };
  const role = () => CS.load().equipe.sousRole || 'tous';
  const ACCESS = {
    tous: ['qualif', 'dispatch', 'controle', 'retouche', 'messages', 'finance', 'clients', 'creatifs', 'catalogue', 'journal', 'actions'],
    accueil: ['qualif', 'messages', 'clients', 'catalogue', 'journal', 'actions'],
    dispatch: ['dispatch', 'creatifs', 'messages', 'journal', 'actions'],
    controle: ['controle', 'retouche', 'messages', 'journal', 'actions'],
    finance: ['finance', 'clients', 'journal']
  };
  const can = m => ACCESS[role()].includes(m);
  const db = () => CS.load();
  const client = id => db().clients.find(c => c.id === id) || { nom: '?', entreprise: '' };
  const crea = id => db().creatifs.find(c => c.id === id);
  const charge = c => db().orders.filter(o => o.creaId === c.id && ['attribuee', 'production', 'controle', 'retouche'].includes(o.state)).length;
  const LATE = o => { const m = STATES[o.state].max; return m && CS.sinceState(o) > m; };

  const COLS = [
    ['Nouvelles', ['soumise']], ['À qualifier', ['qualification']], ['En dispatch', ['dispatch']], ['En production', ['attribuee', 'production']],
    ['En contrôle', ['controle']], ['Retouches', ['retouche']], ['Livrées', ['livree']], ['Terminées', ['terminee']], ['Litiges et annulées', ['litige', 'annulee']]
  ];

  function head() {
    CS.header({ where: 'Back-office', who: 'Équipe Studio', role: ROLES[role()], nav: [['Back-office', 'studio.html', true], ['Espace client', 'espace-client.html'], ['Espace créatif', 'espace-createur.html'], ['Accueil', 'index.html']] });
  }

  /* Les cinq chiffres de la semaine */
  function kpis() {
    const os = db().orders;
    const acc = os.map(o => { const a = o.historique.find(h => h.state === 'soumise'), b = o.historique.find(h => h.state === 'attribuee'); return a && b ? b.at - a.at : null; }).filter(x => x != null);
    const liv = os.filter(o => o.delaiPromis && o.historique.some(h => h.state === 'livree'));
    const onTime = liv.filter(o => o.historique.find(h => h.state === 'livree').at <= o.delaiPromis).length;
    const ret = os.filter(o => ['livree', 'terminee', 'retouche'].includes(o.state));
    const fb = os.filter(o => o.retour);
    const avg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
    return [
      [acc.length ? dur(avg(acc)).replace(/ 0+$/, '') : '—', 'Entre commande et acceptation'],
      [liv.length ? Math.round(onTime / liv.length * 100) + ' %' : '—', 'Livrées dans le délai promis'],
      [ret.length ? avg(ret.map(o => o.retouches.utilisees)).toFixed(1).replace('.', ',') : '—', 'Retouches par commande'],
      [fb.length ? avg(fb.map(o => (o.retour.q + o.retour.d + o.retour.c) / 3)).toFixed(1).replace('.', ',') + ' / 5' : '—', 'Retour client moyen'],
      ['—', 'Marge par commande (prix à fixer)']
    ];
  }

  function render() {
    FILES.length = 0;
    const tabs = [['file', 'File des commandes', true], ['creatifs', 'Créatifs', can('creatifs')], ['clients', 'Clients', can('clients')], ['catalogue', 'Catalogue', can('catalogue')], ['finance', 'Finance', can('finance')], ['contacts', 'Messages du site', can('clients')], ['journal', "Journal d'activité", can('journal')]].filter(t => t[2]);
    if (!tabs.find(t => t[0] === tab)) tab = 'file';
    app.innerHTML = `
      <div class="hello rise"><div><span class="eyebrow"><i aria-hidden="true"></i>Back-office · ${esc(ROLES[role()])}</span><h1 class="t">La tour de <b>contrôle.</b></h1><p class="lead">Rien n'atteint le client sans passer par ici. Le client et le créatif ne se parlent jamais directement.</p></div>
        <label class="fld" style="min-width:15rem"><span>Sous-rôle (chacun voit ce dont il a besoin)</span><select class="in" data-role>${Object.entries(ROLES).map(([k, l]) => `<option value="${k}" ${k === role() ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <div class="kpis rise">${kpis().map(k => `<div class="kpi"><b>${esc(k[0])}</b><small>${esc(k[1])}</small></div>`).join('')}</div>
      <div class="tabs" role="tablist">${tabs.map(t => `<button type="button" role="tab" data-tab="${t[0]}" aria-selected="${t[0] === tab}">${t[1]}</button>`).join('')}</div>
      <div id="tabc">${({ file: tFile, creatifs: tCrea, clients: tClients, catalogue: tCat, finance: tFin, journal: tJournal, contacts: tContacts })[tab]()}</div>`;
    clearInterval(tick); tick = setInterval(() => document.querySelectorAll('[data-timer]').forEach(el => { const o = db().orders.find(x => x.id === el.dataset.timer); if (o) { el.textContent = dur(CS.sinceState(o)); el.classList.toggle('late', LATE(o)); } }), 30e3);
  }

  function tFile() {
    const os = db().orders;
    return `<p class="tiny" style="margin:-.5rem 0 .9rem">Chaque carte porte un chronomètre depuis son dernier changement d'état ; en rouge, le délai maximal est dépassé.</p>
    <div class="kan">${COLS.map(([l, sts]) => { const list = os.filter(o => sts.includes(o.state)); return `<section class="col" aria-label="${l}"><header><span>${l}</span><span class="pill">${list.length}</span></header>
      ${list.map(o => { const c = crea(o.creaId); return `<button type="button" class="kc" data-open="${o.id}"><b>${o.id} · ${esc(svc(o.service).nom)}</b><small>${esc(client(o.clientId).entreprise || client(o.clientId).nom)}${c ? ' → ' + esc(c.pseudo) : ''}</small>
        <div class="row"><span class="pill ${LATE(o) ? 'bad' : ''}"><span class="timer ${LATE(o) ? 'late' : ''}" data-timer="${o.id}">${dur(CS.sinceState(o))}</span></span>${o.state === 'dispatch' ? `<span class="pill blue">${o.offres.length} main(s) levée(s)</span>` : ''}${o.fil.client.some(m => m.masque) || o.fil.crea.some(m => m.masque) || o.versions.some(v => v.statut === 'soumise' && CS.mask(v.note || '').flagged) ? '<span class="pill warn">Coordonnée signalée</span>' : ''}</div></button>`; }).join('') || '<p class="empty">—</p>'}</section>`; }).join('')}</div>`;
  }

  function tCrea() {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = db().creatifs.filter(c => (!onlyDispo || c.statut === 'dispo') && terms.every(t => [c.pseudo, c.niveau, ...c.langues, ...c.secteurs, ...c.specialites.map(k => svc(k).nom)].join(' ').toLowerCase().includes(t)));
    const stat = c => c.statut === 'dispo' ? '<span class="pill live"><span class="dot"></span>Disponible</span>' : c.statut === 'occupe' ? '<span class="pill warn">Occupé</span>' : `<span class="pill">Absent jusqu'au ${date(c.absentJusqua)}</span>`;
    const etat = c => c.score >= 75 ? '<span class="pill live">Actif</span>' : c.score >= 65 ? '<span class="pill warn">À surveiller</span>' : '<span class="pill bad">Accompagnement</span>';
    return `<div class="row" style="margin-bottom:1rem"><label class="fld" style="flex:1;min-width:16rem"><span>Recherche interne (ex. « identité anglais restauration »)</span><input class="in" data-q value="${esc(q)}" placeholder="Service, langue, secteur, pseudo…"></label><label class="sw" style="margin-top:1.2rem"><input type="checkbox" data-dispo ${onlyDispo ? 'checked' : ''}><span>Disponibles seulement</span></label></div>
    <div class="card tblw"><table class="tbl"><thead><tr><th>Créatif</th><th>Services certifiés</th><th>Langues</th><th>Statut</th><th>Charge</th><th>Score interne</th><th>État</th><th>Contact</th></tr></thead><tbody>
    ${list.map(c => `<tr><td>${esc(c.pseudo)}<br><span class="tiny">${esc(c.niveau)} · ${esc(c.fuseau)}</span></td><td class="small">${esc(c.specialites.map(k => svc(k).nom).join(', '))}<br><span class="tiny">${esc(c.secteurs.join(', '))}</span></td><td class="small">${esc(c.langues.join(', '))}</td><td>${stat(c)}</td><td class="small">${charge(c)} / ${c.capacite}</td>
      <td><details><summary style="cursor:pointer"><b style="font-weight:500">${c.score}</b> / 100</summary><div style="margin-top:.4rem;display:grid;gap:.25rem">${CS.scoreParts(c).map(p => `<div class="lvl tiny"><span style="width:7.5rem">${p[0]} (${p[1]} %)</span><i><b style="width:${p[2]}%"></b></i></div>`).join('')}</div></details></td><td>${etat(c)}</td><td class="tiny">${esc(c.contact)}</td></tr>
      <tr><td colspan="8" style="padding-top:0"><details${c.niveau === 'Candidat' ? ' open' : ''}><summary class="small" style="cursor:pointer;color:var(--champagne)">${c.niveau === 'Candidat' ? 'Examiner la candidature' : 'Gérer ce créatif'}</summary>
        <div class="sub" style="margin-top:.5rem"><dl class="kv">${c.nom ? `<dt>Nom</dt><dd>${esc(c.nom)}</dd>` : ''}${(c.specialitesDemandees || []).length ? `<dt>Services demandés</dt><dd>${esc(c.specialitesDemandees.map(k => svc(k).nom).join(', '))}</dd>` : ''}${c.lienTravaux ? `<dt>Travaux</dt><dd>${esc(c.lienTravaux)}</dd>` : ''}${c.presentation ? `<dt>Présentation</dt><dd>${esc(c.presentation)}</dd>` : ''}${c.createdAt ? `<dt>Inscrit</dt><dd>${rel(c.createdAt)}</dd>` : ''}</dl>
        ${(c.portfolio || []).length ? `<div class="thumbs" style="margin:.7rem 0">${c.portfolio.map(p => `<img src="${esc(CS.src(p))}" alt="${esc(p.titre || '')}" loading="lazy">`).join('')}</div>` : '<p class="tiny">Aucun travail déposé dans son portfolio.</p>'}
        <div class="row" style="align-items:flex-end;margin-top:.5rem"><label class="fld"><span>Niveau</span><select class="in" data-niv="${c.id}">${['Candidat', 'Certifié', 'Confirmé', 'Référent'].map(n => `<option ${n === c.niveau ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="fld" style="width:6rem"><span>Score</span><input class="in" type="number" min="0" max="100" data-sco="${c.id}" value="${c.score}"></label></div>
        <div class="fld" style="margin-top:.6rem"><span>Services certifiés (il ne reçoit des offres que pour ceux-là)</span><div class="chips">${D.services.map(x => `<label class="ck"><input type="checkbox" data-spe="${c.id}" value="${x.id}" ${c.specialites.includes(x.id) || (c.niveau === 'Candidat' && (c.specialitesDemandees || []).includes(x.id)) ? 'checked' : ''}><span>${esc(x.nom)}</span></label>`).join('')}</div></div>
        <div class="row" style="justify-content:flex-end;margin-top:.6rem"><button class="btn btn-metal btn-sm" type="button" data-certify="${c.id}">Enregistrer</button></div></div></details></td></tr>`).join('') || '<tr><td colspan="8" class="empty">Aucun créatif ne correspond.</td></tr>'}
    </tbody></table></div><p class="tiny" style="margin-top:.6rem">Score : ponctualité 30 %, conformité 25 %, retour client 25 %, réactivité 10 %, revue de l'équipe 10 %. ${CS.LIVE ? 'Le score se règle à la main pour l’instant.' : 'Valeurs d’exemple.'}</p>`;
  }
  function tClients() {
    return `<div class="card tblw"><table class="tbl"><thead><tr><th>Client</th><th>Type</th><th>Secteur</th><th>Pays</th><th>Nous a connus par</th><th>Commandes</th><th>Contact</th></tr></thead><tbody>
    ${db().clients.map(c => `<tr><td>${esc(c.nom)}<br><span class="tiny">${esc(c.entreprise || '')}</span></td><td class="small">${esc(c.type)}</td><td class="small">${esc(c.secteur || '')}</td><td class="small">${esc(c.pays || '')}</td><td class="small">${esc(c.source || '—')}</td><td class="small">${db().orders.filter(o => o.clientId === c.id).length}</td><td class="tiny">${esc(c.contact)}</td></tr>`).join('')}
    </tbody></table></div>`;
  }
  function tContacts() {
    const list = db().contacts || [];
    return `<p class="tiny" style="margin-top:0">Les demandes envoyées depuis le formulaire « Proposition de collaboration » de l'accueil.</p>
    <div class="card tblw"><table class="tbl"><thead><tr><th>Reçu</th><th>Nom</th><th>Téléphone</th><th>E-mail</th><th>Réseaux</th><th></th></tr></thead><tbody>
    ${list.map(k => `<tr style="${k.traite ? 'opacity:.55' : ''}"><td class="tiny">${rel(k.at)}</td><td class="small">${esc((k.prenom || '') + ' ' + (k.nom || ''))}</td><td class="small">${esc(k.telephone || '')}</td><td class="small">${esc(k.email || '')}</td><td class="tiny">${esc(k.reseaux || '')}</td><td>${k.traite ? '<span class="pill live">Traité</span>' : `<button class="btn btn-glass btn-sm" type="button" data-kdone="${k.id}">Marquer traité</button>`}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Aucun message pour l’instant.</td></tr>'}
    </tbody></table></div>`;
  }
  function tCat() {
    return `<p class="small muted" style="margin-top:0">Services, formules, prix, délais, retouches incluses et questions du brief sont des données : dans la vraie plateforme, on les modifie ici sans toucher au code. Dans cette démonstration, ils se règlent dans le fichier <code>plateforme/donnees.js</code>.</p>
    <div class="g2">${D.services.map(x => `<div class="card"><header><h3>${esc(x.nom)}</h3><span class="pill">${x.forfaits.length} formule(s)</span></header>
      ${x.forfaits.map(f => `<div class="sub"><div class="row between"><b style="font-weight:500">${esc(f.nom)}</b><span class="tiny">${esc(CS.prixTxt(f.prix))} · ${esc(CS.delaiTxt(f.delai))}${f.retouches != null ? ' · ' + f.retouches + ' retouches' : ''}</span></div><p class="tiny" style="margin:.3rem 0 0">${esc(f.inclus.join(' · '))}</p></div>`).join('')}
      <p class="tiny" style="margin:.7rem 0 0">Brief : ${esc(x.questions.join(' / '))}</p></div>`).join('')}</div>
    <div class="card" style="margin-top:1rem"><header><h3>Listes de référence</h3></header><dl class="kv"><dt>Secteurs</dt><dd>${esc(D.secteurs.join(', '))}</dd><dt>Styles</dt><dd>${esc(D.styles.join(', '))}</dd><dt>Formats</dt><dd>${esc(D.formats.join(', '))}</dd><dt>Langues</dt><dd>${esc(D.langues.join(', '))}</dd><dt>Motifs de retouche</dt><dd>${esc(D.motifsRetouche.join(', '))}</dd></dl></div>`;
  }
  function tFin() {
    return `<div class="formula">Marge = prix client − rémunération du créatif − frais de paiement − coût interne (qualification, dispatch, contrôle)</div>
    <div class="card tblw"><table class="tbl"><thead><tr><th>Commande</th><th>Client</th><th>Prix client</th><th>Rémunération</th><th>Paiement</th><th>Marge</th></tr></thead><tbody>
    ${db().orders.map(o => `<tr><td>${o.id}<br><span class="tiny">${esc(svc(o.service).nom)}</span></td><td class="small">${esc(client(o.clientId).entreprise || client(o.clientId).nom)}</td><td class="small">${o.prix != null ? o.prix + ' ' + D.devise : 'À fixer'}</td><td class="small">${o.remuneration != null ? o.remuneration + ' ' + D.devise : 'Selon la grille'}</td><td><span class="pill ${o.paiement.statut === 'Payé' ? 'live' : 'warn'}">${esc(o.paiement.statut)}</span></td><td class="small">${o.prix != null && o.remuneration != null ? (o.prix - o.remuneration) + ' ' + D.devise + ' avant frais' : '—'}</td></tr>`).join('')}
    </tbody></table></div><p class="tiny" style="margin-top:.6rem">Les montants apparaissent dès que les prix et la grille de rémunération sont fixés dans le catalogue.</p>`;
  }
  function tJournal() {
    return `<div class="card"><ul style="list-style:none;margin:0;padding:0;display:grid;gap:.4rem">${db().journal.slice().sort((a, b) => b.at - a.at).slice(0, 60).map(j => `<li class="small" style="display:flex;gap:1rem;border-bottom:1px solid rgba(220,198,144,.08);padding-bottom:.4rem"><span class="tiny" style="width:6.5rem;flex:none">${rel(j.at)}</span><b style="font-weight:500;width:8.5rem;flex:none">${esc(j.who)}</b><span>${esc(j.what)}</span></li>`).join('')}</ul></div>`;
  }

  /* ---------- Fenêtre d'une commande ---------- */
  function order(id) {
    const o = db().orders.find(x => x.id === id); if (!o) return;
    openId = id;
    const cl = client(o.clientId), c = crea(o.creaId), f = forfait(o);
    const sec = [];
    if (can('qualif') && ['soumise', 'qualification'].includes(o.state)) sec.push(qualif(o));
    if (can('dispatch') && o.state === 'dispatch') sec.push(dispatch(o));
    if (can('controle') && o.state === 'controle') sec.push(controle(o));
    if (can('retouche') && o.state === 'retouche') sec.push(retouche(o));
    if (can('actions') && o.state === 'livree') sec.push(`<div class="card" style="margin-top:1rem"><header><h3>En attente du client</h3></header><p class="small muted" style="margin-top:0">Livrée ${rel(o.historique[o.historique.length - 1].at)}. Sans réponse après le délai annoncé, le silence vaut validation.</p><button class="btn btn-glass btn-sm" type="button" data-close>Clôturer : silence vaut validation</button></div>`);
    if (o.state === 'terminee') sec.push(`<div class="card" style="margin-top:1rem"><header><h3>Commande terminée</h3></header>${o.retour ? `<p class="small" style="margin-top:0">Retour brut du client : qualité ${o.retour.q}/5, délai ${o.retour.d}/5, communication ${o.retour.c}/5. ${o.retour.again ? 'Referait appel à nous.' : 'Ne referait pas appel à nous.'}${o.retour.comment ? '<br>« ' + esc(o.retour.comment) + ' »' : ''}</p>` : '<p class="small muted" style="margin-top:0">Pas encore de retour client.</p>'}
      <p class="small">Rémunération du créatif déclenchée, indicateurs mis à jour.</p>${o.publication ? `<button class="btn btn-glass btn-sm" type="button" data-case ${o.etudeDeCas ? 'disabled' : ''}>${o.etudeDeCas ? 'Étude de cas créée' : 'Mettre en vitrine (étude de cas)'}</button>` : '<span class="pill">Confidentiel : pas de vitrine</span>'}</div>`);
    const html = `
      <div class="row between"><div><span class="tiny">${o.id} · reçue ${rel(o.createdAt)}${o.parent ? ' · projet parent' : ''}</span><h2 class="t" style="margin-top:.3rem">${esc(svc(o.service).nom)}${f.nom ? ' · <b>' + esc(f.nom) + '</b>' : ''}</h2></div><button class="icb" type="button" data-x aria-label="Fermer">✕</button></div>
      <div class="card" style="margin-top:1rem"><div class="row between"><span class="pill blue"><span class="dot" aria-hidden="true"></span>${esc(STATES[o.state].studio)}</span><span class="tiny">Depuis <span class="timer ${LATE(o) ? 'late' : ''}">${dur(CS.sinceState(o))}</span>${STATES[o.state].max ? ' · maximum ' + dur(STATES[o.state].max) : ''}</span></div>
        <dl class="kv" style="margin-top:.9rem"><dt>Client</dt><dd>${esc(cl.nom)}${cl.entreprise ? ' · ' + esc(cl.entreprise) : ''} <span class="tiny">(${esc(cl.contact)})</span></dd><dt>Créatif</dt><dd>${c ? esc(c.pseudo) + ' · ' + esc(c.niveau) : 'Pas encore attribué'}</dd><dt>Secteur · style · format</dt><dd>${esc([o.brief.secteur, o.brief.style, o.brief.format].filter(Boolean).join(' · '))}</dd><dt>Échéance promise</dt><dd>${o.delaiPromis ? date(o.delaiPromis) : 'À fixer'}</dd><dt>Publication</dt><dd>${o.publication ? 'Autorisée par le client' : 'Refusée'}</dd><dt>Paiement</dt><dd>${esc(o.paiement.statut)}${can('finance') && !['Payé', 'Remboursé'].includes(o.paiement.statut) ? ' <button class="lnk" type="button" data-paid>Enregistrer le règlement</button>' : ''}</dd></dl></div>
      ${sec.join('')}
      ${can('messages') ? relay(o) : ''}
      <div class="card" style="margin-top:1rem"><header><h3>Brief du client (brut)</h3></header><dl class="kv">${svc(o.service).questions.map((qq, i) => o.brief.reponses[i] ? `<dt>${esc(qq)}</dt><dd>${esc(o.brief.reponses[i])}</dd>` : '').join('')}</dl>${(o.brief.refs || []).length ? `<div class="stack" style="margin-top:.7rem">${o.brief.refs.map(f => typeof f === 'string' ? `<div class="tiny">${esc(f)}</div>` : CS.fileRow(f, f.path || f.url ? `<button class="btn btn-glass btn-sm" type="button" data-dl="${reg(f, o.id)}">Ouvrir</button>` : '')).join('')}</div>` : ''}</div>
      <div class="card" style="margin-top:1rem"><header><h3>Journal de la commande</h3></header><ul style="list-style:none;margin:0;padding:0;display:grid;gap:.35rem">${o.historique.slice().reverse().map(h => `<li class="small"><span class="tiny">${new Date(h.at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span> · <b style="font-weight:500">${esc(h.by)}</b> → ${esc(STATES[h.state].studio)}</li>`).join('')}</ul>
        ${can('actions') && !['terminee', 'annulee', 'litige'].includes(o.state) ? '<hr class="sep"><div class="row"><button class="lnk" type="button" data-litige style="color:var(--warn)">Ouvrir un litige</button><button class="lnk" type="button" data-cancel style="color:var(--bad)">Annuler et rembourser</button></div>' : ''}</div>`;
    const pn = CS.drawer(html, () => { openId = null; });
    bind(pn, o);
  }

  function qualif(o) {
    const brief = o.briefNettoye || svc(o.service).questions.map((qq, i) => o.brief.reponses[i] ? `${qq} : ${o.brief.reponses[i]}` : '').filter(Boolean).join('\n');
    return `<div class="card" style="margin-top:1rem;border-color:rgba(0,176,255,.4)"><header><h3>Qualification</h3>${o.state === 'soumise' ? '<button class="btn btn-glass btn-sm" type="button" data-take>Prendre en charge</button>' : '<span class="pill blue">En cours</span>'}</header>
      <div class="${o.state === 'soumise' ? 'locked' : ''}">
      <div class="g3"><label class="fld"><span>Prix client (${D.devise})</span><input class="in" type="number" min="0" data-prix value="${o.prix ?? ''}" placeholder="Selon la grille"></label><label class="fld"><span>Livraison promise le</span><input class="in" type="date" data-delai value="${o.delaiPromis ? new Date(o.delaiPromis).toISOString().slice(0, 10) : new Date(CS.now() + 4 * CS.DAY).toISOString().slice(0, 10)}"></label><label class="fld"><span>Retouches incluses</span><input class="in" type="number" min="0" data-ret value="${o.retouches.incluses}"></label></div>
      <label class="fld" style="margin-top:.8rem;max-width:16rem"><span>Rémunération du créatif (${D.devise})</span><input class="in" type="number" min="0" data-remu value="${o.remuneration ?? ''}" placeholder="Selon la grille"></label>
      <label class="fld" style="margin-top:.8rem"><span>Brief nettoyé pour le créatif (aucune information sur le client)</span><textarea class="in" data-brief>${esc(brief)}</textarea></label>
      <div class="row" style="margin-top:.8rem"><input class="in" data-question placeholder="Poser une question au client…" style="flex:1"><button class="btn btn-glass btn-sm" type="button" data-ask>Envoyer la question</button></div>
      <hr class="sep"><div class="row between"><span class="tiny">L'offre partira vers les créatifs certifiés pour « ${esc(svc(o.service).nom)} » et disponibles.</span><button class="btn btn-blue btn-sm" type="button" data-launch>Lancer le dispatch <span class="arr" aria-hidden="true">→</span></button></div></div></div>`;
  }
  function eligible(o) {
    return db().creatifs.filter(c => o.service === 'surmesure' || c.specialites.includes(o.service))
      .map(c => ({ c, off: o.offres.find(x => x.creaId === c.id), ch: charge(c) }))
      .sort((a, b) => (!!b.off - !!a.off) || (b.c.statut === 'dispo') - (a.c.statut === 'dispo') || b.c.score - a.c.score);
  }
  function dispatch(o) {
    const fin = o.offreOuverte ? o.offreOuverte.fin - CS.now() : 0;
    return `<div class="card" style="margin-top:1rem;border-color:rgba(0,176,255,.4)"><header><h3>Dispatch</h3><span class="pill ${fin > 0 ? 'blue' : 'bad'}">${fin > 0 ? 'Offre ouverte encore ' + dur(fin) : 'Offre expirée : relancer'}</span></header>
      <p class="tiny" style="margin-top:0">Filtre : certifiés pour ce service, puis disponibilité, langue, secteur, capacité, classés par score. L'équipe choisit.</p>
      <div class="tblw"><table class="tbl elig"><thead><tr><th>Créatif</th><th>Statut</th><th>Main levée</th><th>Charge</th><th>Score</th><th>Secteur connu</th><th></th></tr></thead><tbody>
      ${eligible(o).map(x => `<tr class="${x.off ? 'hand' : ''}"><td>${esc(x.c.pseudo)}<br><span class="tiny">${esc(x.c.niveau)} · ${esc(x.c.langues.join(', '))}</span></td><td class="small">${x.c.statut === 'dispo' ? 'Disponible' : x.c.statut === 'occupe' ? 'Occupé' : 'Absent'}</td><td class="small">${x.off ? `Oui · ${esc(x.off.delai)}` : '—'}</td><td class="small">${x.ch} / ${x.c.capacite}</td><td class="small">${x.c.score}</td><td class="small">${x.c.secteurs.includes(o.brief.secteur) ? 'Oui' : '—'}</td><td><button class="btn ${x.off ? 'btn-metal' : 'btn-glass'} btn-sm" type="button" data-assign="${x.c.id}" ${x.c.statut === 'absent' ? 'disabled' : ''}>Attribuer</button></td></tr>`).join('')}
      </tbody></table></div>${fin <= 0 ? '<div class="row" style="margin-top:.7rem"><button class="btn btn-glass btn-sm" type="button" data-relaunch>Relancer l’offre pour 4 h</button></div>' : ''}</div>`;
  }
  function controle(o) {
    const v = o.versions.filter(x => x.statut === 'soumise').pop();
    if (!v) return '';
    const m = CS.mask(v.note || '');
    return `<div class="card" style="margin-top:1rem;border-color:rgba(0,176,255,.4)"><header><h3>Contrôle qualité · version ${v.n}</h3><span class="tiny">Déposée ${rel(v.at)}</span></header>
      ${v.poster ? `<img src="${esc(v.poster)}" alt="Aperçu du livrable" style="border-radius:.8rem;border:1px solid var(--glass-line);max-height:14rem;object-fit:cover;width:100%;margin-bottom:.7rem">` : ''}
      ${v.kind === 'pistes' ? '<p class="small" style="margin-top:0"><span class="pill blue">Deux pistes A et B</span> Une fois approuvées, le client choisit sa piste.</p>' : ''}
      ${v.fichiers.some(f => CS.isImg(f) && CS.src(f)) ? `<div class="thumbs" style="margin-bottom:.7rem">${v.fichiers.filter(f => CS.isImg(f) && CS.src(f)).map(f => `<img src="${esc(CS.src(f))}" alt="${esc(f.nom)}">`).join('')}</div>` : ''}
      <div class="stack">${v.fichiers.map(f => CS.fileRow(f, f.path || f.url ? `<button class="btn btn-glass btn-sm" type="button" data-dl="${reg(f, o.id)}">Ouvrir</button>` : '')).join('')}</div>
      <p class="small" style="margin:.7rem 0 0">Note du créatif : ${esc(v.note || '—')}</p>${m.flagged ? '<p class="raw">La note contient une coordonnée personnelle : elle ne sera jamais transmise au client.</p>' : ''}
      <div style="display:grid;gap:.4rem;margin:.9rem 0">${['Conforme au brief et au choix du client', 'Formats et résolution corrects', 'Fichiers nettoyés : noms, signature, métadonnées', 'Niveau de qualité Creative Studio'].map(l => `<label class="sw"><input type="checkbox" data-qc><span>${l}</span></label>`).join('')}</div>
      <label class="fld"><span>Consigne au créatif si vous renvoyez</span><input class="in" data-consigne placeholder="Ex. Agrandir le nom, respecter la marge de sécurité"></label>
      <div class="row" style="justify-content:flex-end;margin-top:.8rem"><button class="btn btn-glass btn-sm" type="button" data-reject>Renvoyer au créatif</button><button class="btn btn-metal btn-sm" type="button" data-approve>${v.kind === 'pistes' ? 'Approuver et envoyer les pistes' : 'Approuver et livrer au client'} <span class="arr" aria-hidden="true">→</span></button></div></div>`;
  }
  function retouche(o) {
    const f = o.retouches.fiches[o.retouches.fiches.length - 1];
    if (!f) return '';
    return `<div class="card" style="margin-top:1rem;border-color:rgba(232,176,75,.45)"><header><h3>Retour client → fiche de retouche n°${f.n}</h3><span class="tiny">${o.retouches.utilisees} / ${o.retouches.incluses} retouches utilisées</span></header>
      <p class="small" style="margin-top:0">Demande brute du client :</p><div class="sub small" style="white-space:pre-line">${esc(f.brut)}</div>
      <label class="fld" style="margin-top:.8rem"><span>Fiche claire et numérotée pour le créatif (une consigne par ligne)</span><textarea class="in" data-reform>${esc(f.reformule || f.brut)}</textarea></label>
      <div class="row between" style="margin-top:.7rem"><label class="fld" style="min-width:12rem"><span>Motif</span><select class="in" data-motif>${D.motifsRetouche.map(m => `<option ${f.motif === m ? 'selected' : ''}>${m}</option>`).join('')}</select></label><button class="btn btn-metal btn-sm" type="button" data-sendfiche>${f.reformule ? 'Mettre à jour la fiche' : 'Envoyer la fiche au créatif'}</button></div></div>`;
  }
  function relay(o) {
    const one = (list, side) => list.length ? `<div class="thread">${list.map((m, i) => `<div class="msg ${m.from === 'studio' ? 'me' : ''} ${m.masque ? 'hidden-info' : ''}"><small>${m.from === 'studio' ? 'Studio' : side === 'client' ? 'Client' : 'Créatif'} · ${rel(m.at)}</small>${esc(m.text)}${m.masque && m.brut ? `<div class="raw">Texte d'origine (vu par l'équipe seule) : ${esc(m.brut)}</div>` : ''}${m.from !== 'studio' ? `<br><button class="fwd" type="button" data-fwd="${side}:${i}">Transférer ${side === 'client' ? 'au créatif' : 'au client'} après relecture</button>` : ''}</div>`).join('')}</div>` : '<p class="empty">Aucun message.</p>';
    return `<div class="card" style="margin-top:1rem"><header><h3>Messages relayés</h3><span class="tiny">Deux fils, jamais de contact direct</span></header>
      <div class="relay"><div><b class="small" style="font-weight:500">Fil client</b>${one(o.fil.client, 'client')}<form class="compose" data-say="client"><label class="sr" for="sc">Écrire au client</label><input class="in" id="sc" placeholder="Écrire au client…" autocomplete="off"><button class="btn btn-glass btn-sm">Envoyer</button></form></div>
      <div><b class="small" style="font-weight:500">Fil créatif</b>${o.creaId ? one(o.fil.crea, 'crea') + '<form class="compose" data-say="crea"><label class="sr" for="sk">Écrire au créatif</label><input class="in" id="sk" placeholder="Écrire au créatif…" autocomplete="off"><button class="btn btn-glass btn-sm">Envoyer</button></form>' : '<p class="empty">Ouvert dès l’attribution.</p>'}</div></div></div>`;
  }

  function bind(pn, o) {
    const id = o.id, go = (...a) => CS.act(...a).then(r => { refresh(); return r; });
    const on = (sel, fn) => { const el = pn.querySelector(sel); if (el) el.onclick = fn; };
    const val = sel => { const el = pn.querySelector(sel); return el ? el.value.trim() : ''; };
    on('[data-paid]', () => go('sdo', id, 'paid').then(() => CS.toast('Règlement enregistré')));
    on('[data-take]', () => go('take', id));
    on('[data-ask]', () => { const t = val('[data-question]'); if (!t) return pn.querySelector('[data-question]').focus(); go('msg', id, 'client', t, true).then(() => CS.toast('Question envoyée au client')); });
    on('[data-launch]', () => {
      const d = pn.querySelector('[data-delai]').value;
      go('launch', id, { prix: val('[data-prix]'), remuneration: val('[data-remu]'), delai: d ? String(new Date(d + 'T18:00:00').getTime()) : '', retouches: +val('[data-ret]') || 0, briefNettoye: val('[data-brief]') })
        .then(n => CS.toast(n ? `Offre envoyée à ${n} créatif(s)` : 'Aucun créatif certifié et disponible pour ce service : certifiez-en un, puis relancez'));
    });
    pn.querySelectorAll('[data-assign]').forEach(b => b.onclick = () => go('assign', id, b.dataset.assign).then(() => CS.toast('Mission attribuée')));
    on('[data-relaunch]', () => go('relaunch', id).then(n => CS.toast(`Offre relancée vers ${n} créatif(s)`)));
    on('[data-approve]', () => {
      if (![...pn.querySelectorAll('[data-qc]')].every(x => x.checked)) return CS.toast('Cochez toute la liste de contrôle avant de livrer');
      go('approve', id).then(() => CS.toast('Transmis au client'));
    });
    on('[data-reject]', () => { const t = val('[data-consigne]'); if (!t) { pn.querySelector('[data-consigne]').focus(); return CS.toast('Écrivez une consigne pour le créatif'); } go('reject', id, t).then(() => CS.toast('Renvoyé au créatif avec la consigne')); });
    on('[data-sendfiche]', () => go('fiche', id, val('[data-reform]'), pn.querySelector('[data-motif]').value).then(() => CS.toast('Fiche envoyée au créatif')));
    on('[data-close]', () => go('sdo', id, 'close'));
    on('[data-case]', () => go('sdo', id, 'case').then(() => CS.toast('Étude de cas préparée pour la vitrine')));
    on('[data-litige]', () => go('sdo', id, 'litige'));
    on('[data-cancel]', () => { if (confirmTwice()) go('sdo', id, 'cancel'); });
    pn.querySelectorAll('[data-fwd]').forEach(b => b.onclick = () => { const [side, i] = b.dataset.fwd.split(':'); go('forward', id, side, +i).then(() => CS.toast('Transféré après relecture')); });
    pn.querySelectorAll('[data-say]').forEach(f => f.onsubmit = e => {
      e.preventDefault(); const t = f.querySelector('input').value.trim(); if (!t) return;
      go('msg', id, f.dataset.say, t).then(() => setTimeout(() => { const i = document.querySelector(`#drawer [data-say="${f.dataset.say}"] input`); if (i) i.focus(); }, 30));
    });
  }
  let armed = 0;
  function confirmTwice() { if (Date.now() - armed < 4000) return true; armed = Date.now(); CS.toast('Cliquez une seconde fois pour confirmer'); return false; }

  function refresh() { head(); render(); if (openId && CS.drawerOpen()) order(openId); }
  app.addEventListener('click', e => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; render(); return; }
    const op = e.target.closest('[data-open]'); if (op) { order(op.dataset.open); return; }
    const kd = e.target.closest('[data-kdone]'); if (kd) { CS.act('contactDone', +kd.dataset.kdone).then(refresh); return; }
    const ce = e.target.closest('[data-certify]'); if (ce) {
      const cid = ce.dataset.certify;
      CS.act('certify', cid, { niveau: app.querySelector(`[data-niv="${cid}"]`).value, score: +app.querySelector(`[data-sco="${cid}"]`).value || 0, specialites: [...app.querySelectorAll(`[data-spe="${cid}"]:checked`)].map(x => x.value) })
        .then(() => { CS.toast('Créatif mis à jour'); refresh(); });
    }
  });
  app.addEventListener('change', e => {
    if (e.target.matches('[data-role]')) { const v = e.target.value; if (!CS.LIVE) CS.login('studio', v); CS.act('subrole', v).then(() => { CS.toast('Sous-rôle : ' + ROLES[v]); refresh(); }); }
    if (e.target.matches('[data-dispo]')) { onlyDispo = e.target.checked; render(); }
  });
  app.addEventListener('input', e => { if (e.target.matches('[data-q]')) { q = e.target.value; const pos = e.target.selectionStart; render(); const i = app.querySelector('[data-q]'); i.focus(); i.setSelectionRange(pos, pos); } });
  document.addEventListener('click', e => { const d = e.target.closest('[data-dl]'); if (d) { const [f, oid] = FILES[+d.dataset.dl] || []; if (f) CS.download(f, oid); } });
  (async () => {
    if (!CS.LIVE) { await CS.ready(); const s0 = CS.session(); if (!s0 || s0.role !== 'studio') CS.login('studio', 'tous'); }
    if (!(await CS.guard('studio'))) return;
    s = CS.session();
    CS.on(refresh);
    head(); render();
  })();

})();
