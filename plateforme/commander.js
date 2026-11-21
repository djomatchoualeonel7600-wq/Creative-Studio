/* Parcours de commande : service → brief guidé → coordonnées → récapitulatif → confirmation.
   Le compte se crée au dernier moment (section 7 du document). */
(function () {
  const { D, esc, svc, prixTxt, delaiTxt, icon } = CS;
  const qs = new URLSearchParams(location.search);
  const st = {
    mode: qs.get('mode') === 'mesure' ? 'mesure' : 'service',
    step: 0,
    service: D.services.some(s => s.id === qs.get('service')) ? qs.get('service') : null,
    forfait: null, reponses: [], secteur: '', style: '', format: '', couleurs: '', limite: '', refs: [], publication: '',
    metiers: [], projet: '', budget: '',
    nom: '', entreprise: '', contact: '', langue: 'Français', pays: '', source: '', cgu: false, done: null,
    email: '', password: '', files: [], sending: false
  };
  if (st.service) { st.forfait = svc(st.service).forfaits[0].id; }
  const flow = document.getElementById('flow'), sum = document.getElementById('sum');
  CS.header({ where: 'Commande', nav: [['Accueil', 'index.html'], ['Commander', 'commander.html', true], ['Mon espace', 'connexion.html']] });

  const STEPS = () => st.mode === 'service' ? ['Service', 'Votre brief', 'Vos coordonnées', 'Récapitulatif'] : ['Votre projet', 'Vos coordonnées', 'Récapitulatif'];
  const radios = (name, list, val, multi) => `<div class="chips" role="${multi ? 'group' : 'radiogroup'}" aria-label="${esc(name)}">${list.map(v => `<label class="ck"><input type="${multi ? 'checkbox' : 'radio'}" name="${name}" value="${esc(v)}" ${multi ? (val.includes(v) ? 'checked' : '') : (val === v ? 'checked' : '')}><span>${esc(v)}</span></label>`).join('')}</div>`;
  const err = id => `<p class="err" id="e-${id}" hidden></p>`;

  function wz() {
    return `<div class="wz" aria-label="Étapes">${STEPS().map((s, i) => `<span class="${i === st.step ? 'on' : i < st.step ? 'ok' : ''}"${i === st.step ? ' aria-current="step"' : ''}><i>${i < st.step ? '✓' : i + 1}</i>${s}</span>`).join('')}</div>`;
  }

  /* ---------- Étapes ---------- */
  function stepService() {
    const s = st.service ? svc(st.service) : null;
    return `<div class="card rise"><header><h3>Quel service vous faut-il ?</h3></header>
      <div class="svcs">${D.services.map(x => `<button type="button" class="svc" data-svc="${x.id}" aria-pressed="${x.id === st.service}"><span class="ico">${icon(x.icone)}</span><b>${esc(x.nom)}</b><small>${esc(x.phrase)}</small><span class="pr">${esc(prixTxt(Math.min(...x.forfaits.map(f => f.prix == null ? Infinity : f.prix)) === Infinity ? null : Math.min(...x.forfaits.map(f => f.prix == null ? Infinity : f.prix))))}</span></button>`).join('')}</div>
      ${s ? `<hr class="sep"><h3>Choisissez une formule</h3><div class="ffs">${s.forfaits.map(f => `<button type="button" class="ff" data-ff="${f.id}" aria-pressed="${f.id === st.forfait}"><b>${esc(f.nom)}</b><ul>${f.inclus.map(i => `<li>${esc(i)}</li>`).join('')}</ul><div class="meta"><span class="pill gold">${esc(prixTxt(f.prix))}</span><span class="pill">${esc(delaiTxt(f.delai))}</span>${f.retouches != null ? `<span class="pill">${f.retouches} retouches incluses</span>` : ''}</div></button>`).join('')}</div>` : ''}
      ${err('svc')}
      <div class="nav2"><a class="btn btn-glass" href="index.html#services">Voir le catalogue</a><button class="btn btn-metal" type="button" data-next>Continuer <span class="arr" aria-hidden="true">→</span></button></div></div>`;
  }
  function stepBrief() {
    const s = svc(st.service);
    return `<div class="card rise"><header><h3>Votre brief · ${esc(s.nom)}</h3><span class="tiny">Répondez simplement, comme à l'oral.</span></header>
      <div class="stack">${s.questions.map((q, i) => `<label class="fld"><span>${esc(q)}${i === 0 ? ' <b>*</b>' : ''}</span><input class="in" data-q="${i}" value="${esc(st.reponses[i] || '')}"${i === 0 ? ' required aria-describedby="e-q0"' : ''}></label>${i === 0 ? err('q0') : ''}`).join('')}</div>
      <div class="grp"><b>Votre secteur <em>*</em></b>${radios('secteur', D.secteurs, st.secteur)}${err('secteur')}</div>
      <div class="grp"><b>Le style qui vous ressemble <em>*</em></b>${radios('style', D.styles, st.style)}${err('style')}</div>
      <div class="grp"><b>Le format principal <em>*</em></b>${radios('format', D.formats, st.format)}${err('format')}</div>
      <div class="g2" style="margin-top:1.25rem">
        <label class="fld"><span>Couleurs que vous aimez (facultatif)</span><input class="in" data-k="couleurs" value="${esc(st.couleurs)}" placeholder="Ex. vert profond, or doux"></label>
        <label class="fld"><span>Date limite (facultatif)</span><input class="in" type="date" data-k="limite" value="${esc(st.limite)}"></label>
      </div>
      <label class="fld" style="margin-top:1rem"><span>Vos références : logos, photos, exemples que vous aimez (facultatif)</span><input class="in" type="file" multiple data-refs></label>
      ${st.files.length ? `<p class="tiny">${st.files.length} fichier(s) : ${st.files.map(f => esc(f.name)).join(', ')}</p>` : ''}
      <div class="grp"><b>Pouvons-nous montrer ce travail dans notre vitrine une fois terminé ? <em>*</em></b>${radios('publication', ['Oui, avec plaisir', 'Non, il reste confidentiel'], st.publication)}<p class="tiny">Votre réponse s'applique à toute la commande. Vous pourrez la modifier plus tard.</p>${err('publication')}</div>
      <div class="nav2"><button class="btn btn-glass" type="button" data-prev>← Retour</button><button class="btn btn-metal" type="button" data-next>Continuer <span class="arr" aria-hidden="true">→</span></button></div></div>`;
  }
  function stepMesure() {
    return `<div class="card rise"><header><h3>Décrivez votre projet</h3><span class="tiny">Pour un événement, un lancement ou plusieurs métiers à la fois.</span></header>
      <label class="fld"><span>Votre projet en quelques lignes <b>*</b></span><textarea class="in" data-k="projet" aria-describedby="e-projet" placeholder="Ex. une conférence à Paris : affiches, photos, vidéo résumé et visuels pour les réseaux.">${esc(st.projet)}</textarea></label>${err('projet')}
      <div class="grp"><b>Les métiers nécessaires <em>*</em></b>${radios('metiers', ['Design graphique', 'Photo', 'Vidéo', 'Montage', 'Motion design', 'Site web', 'Je ne sais pas encore'], st.metiers, true)}${err('metiers')}</div>
      <div class="grp"><b>Votre secteur <em>*</em></b>${radios('secteur', D.secteurs, st.secteur)}${err('secteur')}</div>
      <div class="g2" style="margin-top:1.25rem">
        <label class="fld"><span>Date de l'événement ou du lancement</span><input class="in" type="date" data-k="limite" value="${esc(st.limite)}"></label>
        <label class="fld"><span>Budget indicatif (facultatif)</span><input class="in" data-k="budget" value="${esc(st.budget)}" placeholder="Ex. 1 500 €"></label>
      </div>
      <p class="tiny" style="margin-top:1rem">Le Studio assemble l'équipe en coulisses et vous envoie une seule proposition, avec un seul prix.</p>
      <div class="nav2"><span></span><button class="btn btn-metal" type="button" data-next>Continuer <span class="arr" aria-hidden="true">→</span></button></div></div>`;
  }
  function stepContact() {
    const se = CS.session();
    if (CS.LIVE && se && se.role !== 'client') return `<div class="card rise"><header><h3>Compte ${se.role === 'crea' ? 'créatif' : 'Studio'} connecté</h3></header><p class="small muted">Pour commander, connectez-vous avec un compte client ou déconnectez-vous d'abord.</p><div class="nav2"><button class="btn btn-glass" type="button" data-prev>← Retour</button><a class="btn btn-metal" href="${CS.SPACE[se.role]}">Aller à mon espace</a></div></div>`;
    const me = se ? (CS.load().clients[0] || {}) : {};
    if (CS.LIVE && se && !st.nom) Object.assign(st, { nom: me.nom || '', entreprise: me.entreprise || '', pays: me.pays || '', langue: me.langue || 'Français', contact: me.contact || '' });
    const account = CS.LIVE && !se;
    return `<div class="card rise"><header><h3>${account ? 'Créez votre espace client' : 'Vos coordonnées'}</h3><span class="tiny">${account ? 'Votre espace se crée avec ces seules informations.' : se ? 'Connecté : ' + esc(se.email || '') : 'Votre espace se crée avec ces seules informations.'}</span></header>
      <div class="g2">
        <label class="fld"><span>Votre nom <b>*</b></span><input class="in" data-k="nom" value="${esc(st.nom)}" autocomplete="name" aria-describedby="e-nom"></label>
        <label class="fld"><span>Entreprise ou marque (facultatif)</span><input class="in" data-k="entreprise" value="${esc(st.entreprise)}" autocomplete="organization"></label>
      </div>${err('nom')}
      ${account ? `<div class="g2" style="margin-top:1rem">
        <label class="fld"><span>Adresse e-mail <b>*</b></span><input class="in" type="email" data-k="email" value="${esc(st.email)}" autocomplete="email" aria-describedby="e-email"></label>
        <label class="fld"><span>Mot de passe (8 caractères minimum) <b>*</b></span><input class="in" type="password" data-k="password" value="${esc(st.password)}" autocomplete="new-password" aria-describedby="e-password"></label>
      </div>${err('email')}${err('password')}
      <label class="fld" style="margin-top:1rem"><span>Numéro WhatsApp (facultatif, pour que l’équipe puisse vous joindre)</span><input class="in" data-k="contact" value="${esc(st.contact)}" placeholder="+237 6… ou +33 6…" autocomplete="tel"></label>
      <p class="tiny" style="margin:.5rem 0 0">Déjà un compte ? <a href="connexion.html?suite=commander.html">Connectez-vous</a>, votre commande vous attend.</p>`
      : `<label class="fld" style="margin-top:1rem"><span>E-mail ou numéro WhatsApp <b>*</b></span><input class="in" data-k="contact" value="${esc(st.contact)}" placeholder="vous@exemple.com ou +237 6…" aria-describedby="e-contact"></label>${err('contact')}`}
      <div class="g2" style="margin-top:1rem">
        <label class="fld"><span>Langue</span><select class="in" data-k="langue">${D.langues.map(l => `<option ${l === st.langue ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="fld"><span>Pays <b>*</b></span><input class="in" data-k="pays" value="${esc(st.pays)}" autocomplete="country-name" aria-describedby="e-pays"></label>
      </div>${err('pays')}
      <div class="grp"><b>Comment nous avez-vous connus ?</b>${radios('source', D.sources, st.source)}</div>
      <div class="nav2"><button class="btn btn-glass" type="button" data-prev>← Retour</button><button class="btn btn-metal" type="button" data-next>Voir le récapitulatif <span class="arr" aria-hidden="true">→</span></button></div></div>`;
  }
  function stepRecap() {
    const s = svc(st.service || 'surmesure'), f = s.forfaits.find(x => x.id === st.forfait);
    const L = (k, v) => v ? `<div class="line"><span>${k}</span><b style="font-weight:500;text-align:right">${esc(v)}</b></div>` : '';
    return `<div class="card rise sum"><header><h3>Vérifiez avant d'envoyer</h3></header>
      ${st.mode === 'service' ? L('Service', s.nom) + L('Formule', f && f.nom) + L('Secteur', st.secteur) + L('Style', st.style) + L('Format', st.format) + L('Publication en vitrine', st.publication.startsWith('Oui') ? 'Autorisée' : 'Refusée') : L('Projet', st.projet.slice(0, 80) + (st.projet.length > 80 ? '…' : '')) + L('Métiers', st.metiers.join(', ')) + L('Secteur', st.secteur) + L('Budget indicatif', st.budget)}
      ${L('Date limite', st.limite)}${L('Nom', st.nom)}${L('Contact', st.contact || st.email)}${L('Pays', st.pays)}
      <div class="sub" style="margin-top:1rem"><b style="font-weight:500">Paiement</b><p class="small muted" style="margin:.3rem 0 0">Le Studio confirme le prix et le délai, puis vous envoie le moyen de paiement (carte, virement ou mobile money). Le travail démarre après le règlement. L'argent est conservé jusqu'à la validation de votre livraison.</p></div>
      <label class="sw" style="margin-top:1rem"><input type="checkbox" data-cgu ${st.cgu ? 'checked' : ''}><span>J'accepte les <a href="conditions.html" target="_blank">conditions d'utilisation</a> et la <a href="confidentialite.html" target="_blank">politique de confidentialité</a>.</span></label>${err('cgu')}
      <div class="nav2"><button class="btn btn-glass" type="button" data-prev>← Modifier</button><button class="btn btn-blue" type="button" data-send>Envoyer ma commande <span class="arr" aria-hidden="true">→</span></button></div></div>`;
  }
  function stepDone() {
    if (st.done === 'attente') return `<div class="card done rise"><div class="ok" aria-hidden="true">✉</div><span class="eyebrow"><i aria-hidden="true"></i>Dernière étape</span>
      <h2 class="t" style="margin-top:1rem">Confirmez votre <b>adresse e-mail.</b></h2>
      <p class="lead" style="margin:1rem auto 0">Nous venons d'envoyer un lien à ${esc(st.email)}. Cliquez dessus puis connectez-vous : votre commande sera envoyée automatiquement. ${st.files.length ? 'Vous pourrez ensuite ajouter vos fichiers de référence depuis votre espace.' : ''}</p>
      <div class="row" style="justify-content:center;margin-top:1.5rem"><a class="btn btn-metal" href="connexion.html">Me connecter <span class="arr" aria-hidden="true">→</span></a></div></div>`;
    return `<div class="card done rise"><div class="ok" aria-hidden="true">✓</div><span class="eyebrow"><i aria-hidden="true"></i>Commande ${esc(st.done)}</span>
      <h2 class="t" style="margin-top:1rem">Merci ${esc(st.nom.split(' ')[0])}, <b>c'est bien reçu.</b></h2>
      <p class="lead" style="margin:1rem auto 0">${esc(D.promesse)} Vous suivez tout depuis votre espace : avancement, messages, fichiers.</p>
      <div class="row" style="justify-content:center;margin-top:1.5rem"><a class="btn btn-metal" href="espace-client.html#${esc(st.done)}">Suivre ma commande <span class="arr" aria-hidden="true">→</span></a>${CS.LIVE ? '' : '<a class="btn btn-glass" href="studio.html">Voir le côté Studio (démo)</a>'}</div></div>`;
  }

  /* ---------- Récapitulatif latéral ---------- */
  function side() {
    const s = st.service ? svc(st.service) : null, f = s && s.forfaits.find(x => x.id === st.forfait);
    sum.innerHTML = `<h3>Votre commande</h3>
      ${st.mode === 'mesure' ? `<div class="line"><span>Type</span><b style="font-weight:500">Sur mesure</b></div><div class="line"><span>Prix</span><b style="font-weight:500">Une proposition unique</b></div>` :
        s ? `<div class="line"><span>Service</span><b style="font-weight:500">${esc(s.nom)}</b></div>${f ? `<div class="line"><span>Formule</span><b style="font-weight:500">${esc(f.nom)}</b></div><div class="line"><span>Prix</span><b style="font-weight:500">${esc(prixTxt(f.prix))}</b></div><div class="line"><span>Délai</span><b style="font-weight:500;text-align:right">${esc(delaiTxt(f.delai))}</b></div>` : ''}` : '<p class="empty">Choisissez un service pour commencer.</p>'}
      <div class="prom"><b>Sous 24 heures</b> : votre première direction artistique, après l'envoi de la commande.</div>
      <ul class="gar"><li>Un seul interlocuteur : Creative Studio, du brief à la livraison.</li><li>Chaque travail est contrôlé par l'équipe avant de vous être livré.</li><li>Vos fichiers restent dans votre espace marque.</li><li>Vous suivez l'avancement à chaque étape.</li></ul>`;
  }

  /* ---------- Rendu ---------- */
  function render() {
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-selected', b.dataset.mode === st.mode));
    let body;
    if (st.done) body = stepDone();
    else if (st.mode === 'service') body = [stepService, stepBrief, stepContact, stepRecap][st.step]();
    else body = [stepMesure, stepContact, stepRecap][st.step]();
    flow.innerHTML = (st.done ? '' : wz()) + body;
    side();
  }
  function collect() {
    flow.querySelectorAll('[data-q]').forEach(i => st.reponses[+i.dataset.q] = i.value.trim());
    flow.querySelectorAll('[data-k]').forEach(i => st[i.dataset.k] = i.value.trim());
    ['secteur', 'style', 'format', 'publication', 'source'].forEach(n => { const c = flow.querySelector(`input[name="${n}"]:checked`); if (c) st[n] = c.value; });
    const m = flow.querySelectorAll('input[name="metiers"]'); if (m.length) st.metiers = [...m].filter(x => x.checked).map(x => x.value);
    const c = flow.querySelector('[data-cgu]'); if (c) st.cgu = c.checked;
  }
  function check() {
    const bad = [];
    const need = (ok, id, msg) => { const e = document.getElementById('e-' + id); if (e) { e.hidden = ok; e.textContent = msg; } if (!ok) bad.push(id); };
    const name = st.mode === 'service' ? ['svc', 'brief', 'contact', 'recap'][st.step] : ['mesure', 'contact', 'recap'][st.step];
    if (name === 'svc') need(!!(st.service && st.forfait), 'svc', 'Choisissez un service et une formule.');
    if (name === 'brief') {
      need(!!st.reponses[0], 'q0', 'Cette réponse nous est nécessaire pour démarrer.');
      need(!!st.secteur, 'secteur', 'Choisissez votre secteur.'); need(!!st.style, 'style', 'Choisissez un style.'); need(!!st.format, 'format', 'Choisissez un format.');
      need(!!st.publication, 'publication', 'Dites-nous si nous pouvons montrer ce travail.');
    }
    if (name === 'mesure') { need(st.projet.length > 10, 'projet', 'Décrivez votre projet en quelques mots.'); need(st.metiers.length > 0, 'metiers', 'Choisissez au moins un métier.'); need(!!st.secteur, 'secteur', 'Choisissez votre secteur.'); }
    if (name === 'contact' && CS.LIVE && CS.session() && CS.session().role !== 'client') bad.push('role');
    if (name === 'contact') {
      need(!!st.nom, 'nom', 'Indiquez votre nom.');
      if (CS.LIVE && !CS.session()) {
        need(/^\S+@\S+\.\S+$/.test(st.email), 'email', 'Indiquez une adresse e-mail valide.');
        need(st.password.length >= 8, 'password', 'Choisissez un mot de passe d’au moins 8 caractères.');
      } else need(/^\S+@\S+\.\S+$/.test(st.contact) || /^\+?[\d .-]{8,}$/.test(st.contact), 'contact', 'Indiquez un e-mail ou un numéro WhatsApp valide.');
      need(!!st.pays, 'pays', 'Indiquez votre pays.');
    }
    if (name === 'recap') need(st.cgu, 'cgu', 'Merci d’accepter les conditions pour envoyer la commande.');
    if (bad.length) { const f = flow.querySelector('.err:not([hidden])'); if (f) f.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    return !bad.length;
  }
  function payload(refs) {
    const s0 = svc(st.service || 'surmesure');
    return {
      service: st.mode === 'service' ? st.service : 'surmesure', forfait: st.mode === 'service' ? st.forfait : null,
      brief: st.mode === 'service' ? { reponses: s0.questions.map((q, i) => st.reponses[i] || ''), secteur: st.secteur, style: st.style, format: st.format, couleurs: st.couleurs, limite: st.limite, refs }
        : { reponses: [st.projet, st.metiers.join(', '), st.limite, st.budget], secteur: st.secteur, style: '', format: '', couleurs: '', limite: st.limite, refs, metiers: st.metiers },
      publication: st.mode === 'service' ? st.publication.startsWith('Oui') : false, parent: st.mode === 'mesure',
      profil: { nom: st.nom, entreprise: st.entreprise, pays: st.pays, langue: st.langue, source: st.source, secteur: st.secteur, contact: st.contact || st.email }
    };
  }
  async function send() {
    if (st.sending) return;
    const btn = flow.querySelector('[data-send]'); st.sending = true; if (btn) { btn.disabled = true; btn.textContent = 'Envoi en cours…'; }
    try {
      if (CS.LIVE && !CS.session()) {
        const connected = await CS.signUp(st.email, st.password, { role: 'client', nom: st.nom, entreprise: st.entreprise, pays: st.pays, langue: st.langue, contact: st.contact || st.email, source: st.source, secteur: st.secteur });
        if (!connected) {
          try { localStorage.setItem('cs-commande-en-attente', JSON.stringify(payload([]))); } catch (e) {}
          st.done = 'attente'; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return;
        }
      }
      const se = CS.session();
      const refs = st.files.length ? await CS.uploadAll('refs/' + (se ? se.id : 'demo'), st.files, (i, n) => { if (btn) btn.textContent = `Envoi des fichiers ${i}/${n}…`; }) : [];
      st.done = await CS.act('createOrder', payload(refs));
      render(); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      CS.toast(CS.clean(e.message));
    } finally { st.sending = false; const b = flow.querySelector('[data-send]'); if (b) { b.disabled = false; b.innerHTML = 'Envoyer ma commande <span class="arr" aria-hidden="true">→</span>'; } }
  }

  /* ---------- Événements ---------- */
  document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { collect(); st.mode = b.dataset.mode; st.step = 0; st.done = null; render(); });
  flow.addEventListener('click', e => {
    const sv = e.target.closest('[data-svc]'); if (sv) { collect(); st.service = sv.dataset.svc; st.forfait = svc(st.service).forfaits[0].id; render(); flow.querySelector('.ffs') && flow.querySelector('.ffs').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    const ff = e.target.closest('[data-ff]'); if (ff) { st.forfait = ff.dataset.ff; render(); return; }
    if (e.target.closest('[data-next]')) { collect(); if (check()) { st.step++; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); } return; }
    if (e.target.closest('[data-prev]')) { collect(); st.step--; render(); return; }
    if (e.target.closest('[data-send]')) { collect(); if (check()) send(); }
  });
  flow.addEventListener('change', e => { if (e.target.matches('[data-refs]')) { st.files = [...e.target.files]; } });
  CS.ready().then(render);
})();
