/* Creative Studio — cœur de la plateforme.
   Deux modes :
   - EN LIGNE (plateforme/config.js rempli) : vrais comptes, vraie base de données et vrais fichiers (Supabase).
     Les droits sont vérifiés dans la base : chacun ne reçoit que ce qu'il a le droit de voir.
   - DÉMONSTRATION (config.js vide) : données d'exemple gardées dans le navigateur du visiteur.
   Les pages appellent toujours les mêmes actions (CS.act) : seul le moteur change. */
(function () {
  const D = window.CS_DATA, CFG = window.CS_CONFIG || {};
  const LIVE = !!(CFG.supabaseUrl && CFG.supabaseKey && window.supabase && window.supabase.createClient);
  const sb = LIVE ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
  const BUCKET = 'cs-fichiers';
  const KEY = 'cs-plateforme-demo-v1', SKEY = 'cs-session';
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  let mem = null;
  const H = 3600e3, DAY = 24 * H, now = () => Date.now();

  /* ---------- États d'une commande (section 10 du document) ---------- */
  const STATES = {
    brouillon:     { n: 1,  studio: 'Brouillon',          client: 'Brouillon',                         crea: '',                           max: null },
    soumise:       { n: 2,  studio: 'Nouvelle',           client: 'Commande reçue',                    crea: '',                           max: 2 * H },
    qualification: { n: 3,  studio: 'À qualifier',        client: 'Nous étudions votre demande',       crea: '',                           max: 6 * H },
    dispatch:      { n: 4,  studio: 'En dispatch',        client: 'Nous composons votre équipe créative', crea: 'Offre ouverte',           max: 4 * H },
    attribuee:     { n: 5,  studio: 'Attribuée',          client: 'Votre équipe est constituée',       crea: 'Mission confirmée',          max: 12 * H },
    production:    { n: 6,  studio: 'En production',      client: 'Création en cours',                 crea: 'En production',              max: 3 * DAY },
    controle:      { n: 7,  studio: 'En contrôle',        client: 'Dernières vérifications',           crea: 'Livrable en cours de contrôle', max: 12 * H },
    livree:        { n: 8,  studio: 'Livrée',             client: 'Livrée',                            crea: 'Livrée au client',           max: 5 * DAY },
    retouche:      { n: 9,  studio: 'Retouches',          client: 'Retouche en cours',                 crea: 'Retouche demandée',          max: 2 * DAY },
    terminee:      { n: 10, studio: 'Terminée',           client: 'Terminée',                          crea: 'Terminée',                   max: null },
    annulee:       { n: 0,  studio: 'Annulée',            client: 'Annulée',                           crea: 'Annulée',                    max: null },
    litige:        { n: 0,  studio: 'Litige',             client: 'En cours de traitement',            crea: 'En attente',                 max: null }
  };
  /* Barre client en 4 étapes : brief reçu, création, contrôle Studio, livraison */
  function clientStep(s) {
    if (['brouillon', 'soumise', 'qualification'].includes(s)) return 0;
    if (['dispatch', 'attribuee', 'production', 'retouche'].includes(s)) return 1;
    if (s === 'controle') return 2;
    return 3;
  }
  const PROGRESS = ['Démarré', 'Pistes envoyées', 'En affinage', 'Prêt à livrer', 'Bloqué'];

  /* ---------- Données d'exemple ---------- */
  function seed() {
    const t = now();
    const ev = (state, by, ago) => ({ state, by, at: t - ago });
    const db = {
      v: 2, seq: 1047,
      clients: [
        { id: 'cl1', nom: 'Douglas Fokam', entreprise: 'Afrisecur', type: 'Entreprise', secteur: 'Restauration', pays: 'Cameroun', langue: 'Français', contact: 'douglas@exemple.com', source: 'LinkedIn', marque: { couleurs: ['#1F3A2E', '#E9C46A', '#F4EDE1'], polices: ['Cy Grotesk', 'Serif éditoriale'], brief: 'Cuisine camerounaise moderne, chaleureuse, haut de gamme sans être froide.' } },
        { id: 'cl2', nom: 'Philippe Simo', entreprise: '', type: 'Particulier', secteur: 'Sport', pays: 'France', langue: 'Français', contact: '+33 6 00 00 00 00', source: 'Bouche à oreille', marque: { couleurs: [], polices: [], brief: '' } },
        ...[['cl3', 'Astone', ''], ['cl4', 'CamerTech', 'CamerTech'], ['cl5', 'LinkedIn Brand Booster', 'LBB'], ['cl6', 'Ndjoka', ''], ['cl7', 'Claude Noumbissi', ''], ['cl8', 'Franck Nobossie', ''], ['cl9', 'Osher Mindset', 'Osher Mindset']]
          .map(([id, nom, ent]) => ({ id, nom, entreprise: ent, type: ent ? 'Entreprise' : 'Particulier', secteur: '', pays: '', langue: 'Français', contact: '', source: '', marque: { couleurs: [], polices: [], brief: '' } }))
      ],
      creatifs: [
        { id: 'cr1', pseudo: 'Étincelle', specialites: ['identite', 'personal'], langues: ['Français', 'Anglais'], niveau: 'Confirmé', statut: 'dispo', capacite: 3, fuseau: 'Afrique/Douala', secteurs: ['Restauration', 'Mode & beauté'], contact: 'etincelle@exemple.com', score: 88, gains: { recu: 640, attente: 180 } },
        { id: 'cr2', pseudo: 'Gloria', specialites: ['identite', 'uiux', 'landing'], langues: ['Français'], niveau: 'Certifié', statut: 'dispo', capacite: 2, fuseau: 'Europe/Paris', secteurs: ['Tech & services'], contact: 'gloria@exemple.com', score: 81, gains: { recu: 420, attente: 0 } },
        { id: 'cr3', pseudo: 'Japhet', specialites: ['miniature', 'motion'], langues: ['Français', 'Anglais'], niveau: 'Confirmé', statut: 'occupe', capacite: 2, fuseau: 'Afrique/Abidjan', secteurs: ['Culture & musique', 'Sport'], contact: 'japhet@exemple.com', score: 92, gains: { recu: 910, attente: 120 } },
        { id: 'cr4', pseudo: 'Corrector X', specialites: ['motion', 'identite'], langues: ['Anglais'], niveau: 'Candidat', statut: 'absent', absentJusqua: t + 4 * DAY, capacite: 1, fuseau: 'Afrique/Lagos', secteurs: ['Sport'], contact: 'correctorx@exemple.com', score: 64, gains: { recu: 0, attente: 0 } },
        { id: 'cr5', pseudo: 'Warrior Design', specialites: ['identite', 'miniature', 'personal'], langues: ['Français'], niveau: 'Certifié', statut: 'dispo', capacite: 2, fuseau: 'Europe/Paris', secteurs: ['Mode & beauté', 'Maison & bien-être'], contact: 'warrior@exemple.com', score: 76, gains: { recu: 260, attente: 0 } },
        ...[['cr6', 'Tower', ['motion', 'identite']], ['cr7', 'Stone Design', ['identite']], ['cr8', 'Queen Design', ['personal', 'miniature']], ['cr9', 'Yves', ['uiux', 'landing']], ['cr10', 'Jean-Yves', ['motion']], ['cr11', 'Mireille', ['identite', 'personal']], ['cr12', 'Cyril', ['miniature']]]
          .map(([id, pseudo, specialites]) => ({ id, pseudo, specialites, langues: ['Français'], niveau: 'Certifié', statut: 'dispo', capacite: 2, fuseau: 'Europe/Paris', secteurs: [], contact: '', score: 75, gains: { recu: 0, attente: 0 } }))
      ],
      orders: [
        { id: 'CS-1042', clientId: 'cl1', service: 'identite', forfait: 'complet', state: 'livree', createdAt: t - 6 * DAY,
          brief: { reponses: ['Maison Kora', 'Restaurant de cuisine camerounaise moderne à Douala', 'Familles et cadres, 25-45 ans', 'Chaleureux, généreux, élégant'], secteur: 'Restauration', style: 'Élégant', format: 'Impression', couleurs: 'Vert profond, or doux', limite: '', refs: ['moodboard-kora.pdf'] },
          publication: true, prix: null, delaiPromis: t - 1 * DAY, creaId: 'cr1', offres: [{ creaId: 'cr1', delai: '4 jours', at: t - 5.8 * DAY }, { creaId: 'cr5', delai: '5 jours', at: t - 5.7 * DAY }],
          progres: 'Prêt à livrer', choix: { a: 'i/el-gallo-01.jpg', b: 'i/diligo-01.jpg', pick: 'a' },
          versions: [{ n: 1, statut: 'refusee', note: 'Première piste', fichiers: [{ nom: 'kora-logo-v1.png', fmt: 'PNG', poids: '1,2 Mo' }], at: t - 3 * DAY },
                     { n: 2, statut: 'validee', note: 'Version finale validée par le Studio', fichiers: [{ nom: 'kora-logo.svg', fmt: 'SVG', poids: '84 Ko' }, { nom: 'kora-logo.png', fmt: 'PNG', poids: '1,4 Mo' }, { nom: 'kora-charte.pdf', fmt: 'PDF', poids: '6,8 Mo' }, { nom: 'kora-sources.zip', fmt: 'ZIP', poids: '48 Mo' }], at: t - 1 * DAY }],
          retouches: { incluses: 2, utilisees: 0, fiches: [] },
          fil: { client: [{ from: 'studio', text: 'Bonjour Douglas, votre brief est clair. Petite question : le nom doit-il apparaître en entier sur le logo ?', at: t - 5.9 * DAY }, { from: 'client', text: 'Oui, en entier s’il vous plaît.', at: t - 5.8 * DAY }, { from: 'studio', text: 'Votre identité est prête. Vous pouvez la télécharger depuis la page de livraison.', at: t - 1 * DAY }],
                 crea: [{ from: 'studio', text: 'Mission confirmée. Le client veut le nom en entier sur le logo.', at: t - 5.7 * DAY }, { from: 'crea', text: 'Bien noté, première piste demain.', at: t - 5.6 * DAY }] },
          historique: [ev('soumise', 'Client', 6 * DAY), ev('qualification', 'Accueil Studio', 5.95 * DAY), ev('dispatch', 'Accueil Studio', 5.9 * DAY), ev('attribuee', 'Dispatch Studio', 5.7 * DAY), ev('production', 'Créatif', 5.6 * DAY), ev('controle', 'Créatif', 3 * DAY), ev('production', 'Contrôle Studio', 2.9 * DAY), ev('controle', 'Créatif', 1.2 * DAY), ev('livree', 'Contrôle Studio', 1 * DAY)],
          paiement: { statut: 'Payé', montant: null }, retour: null, remuneration: null },
        { id: 'CS-1044', clientId: 'cl1', service: 'miniature', forfait: 'pack', state: 'production', createdAt: t - 2 * DAY,
          brief: { reponses: ['Maison Kora TV', 'Recette du ndolé en 10 minutes', 'Le plat fini en gros plan', ''], secteur: 'Restauration', style: 'Audacieux', format: 'Paysage 16:9', couleurs: '', limite: '', refs: [] },
          publication: false, prix: null, delaiPromis: t + 1.5 * DAY, creaId: 'cr3', offres: [{ creaId: 'cr3', delai: '2 jours', at: t - 1.9 * DAY }],
          progres: 'Pistes envoyées', choix: { a: 'i/cookies-01.jpg', b: 'i/pac-y-01.jpg', pick: null },
          versions: [], retouches: { incluses: 2, utilisees: 0, fiches: [] },
          fil: { client: [{ from: 'studio', text: 'Deux pistes vous attendent : choisissez celle qui vous parle le plus.', at: t - 3 * H }], crea: [{ from: 'crea', text: 'Deux pistes déposées pour le choix A ou B.', at: t - 4 * H }] },
          historique: [ev('soumise', 'Client', 2 * DAY), ev('qualification', 'Accueil Studio', 1.98 * DAY), ev('dispatch', 'Accueil Studio', 1.95 * DAY), ev('attribuee', 'Dispatch Studio', 1.9 * DAY), ev('production', 'Créatif', 1.8 * DAY)],
          paiement: { statut: 'Acompte reçu', montant: null }, retour: null, remuneration: null },
        { id: 'CS-1045', clientId: 'cl2', service: 'identite', forfait: 'essentiel', state: 'dispatch', createdAt: t - 7 * H,
          brief: { reponses: ['Simo Training', 'Salle de sport et coaching en ligne', 'Jeunes actifs 20-35 ans', 'Énergie, force, communauté'], secteur: 'Sport', style: 'Audacieux', format: 'Web', couleurs: 'Noir, orange', limite: '', refs: [] },
          publication: true, prix: null, delaiPromis: t + 4 * DAY, creaId: null, offres: [{ creaId: 'cr2', delai: '4 jours', at: t - 2 * H }],
          offreOuverte: { at: t - 3 * H, fin: t + 1 * H, cibles: ['cr1', 'cr2', 'cr5'] },
          progres: null, choix: null, versions: [], retouches: { incluses: 2, utilisees: 0, fiches: [] },
          fil: { client: [{ from: 'studio', text: 'Merci Philippe ! Votre demande est claire, nous composons votre équipe créative.', at: t - 5 * H }], crea: [] },
          historique: [ev('soumise', 'Client', 7 * H), ev('qualification', 'Accueil Studio', 6 * H), ev('dispatch', 'Accueil Studio', 3 * H)],
          paiement: { statut: 'Payé', montant: null }, retour: null, remuneration: null },
        { id: 'CS-1046', clientId: 'cl2', service: 'motion', forfait: 'logo', state: 'controle', createdAt: t - 4 * DAY,
          brief: { reponses: ['Animation du logo Simo Training', '5 secondes', 'Début des vidéos Instagram'], secteur: 'Sport', style: 'Technologique', format: 'Vertical 9:16', couleurs: '', limite: '', refs: [] },
          publication: false, prix: null, delaiPromis: t + 0.5 * DAY, creaId: 'cr3', offres: [{ creaId: 'cr3', delai: '3 jours', at: t - 3.9 * DAY }],
          progres: 'Prêt à livrer', choix: null,
          versions: [{ n: 1, statut: 'soumise', note: 'Animation finale, 5 s, avec et sans son. Mon numéro si besoin : 06 12 34 56 78', fichiers: [{ nom: 'bantu-logo-anim.mp4', fmt: 'MP4', poids: '3,1 Mo' }, { nom: 'bantu-logo-anim-9x16.mp4', fmt: 'MP4', poids: '2,8 Mo' }], at: t - 2 * H, poster: 'v/forme-motion-01.jpg' }],
          retouches: { incluses: 2, utilisees: 0, fiches: [] },
          fil: { client: [], crea: [{ from: 'crea', text: 'Livrable déposé, dites-moi si quelque chose bloque.', at: t - 2 * H }] },
          historique: [ev('soumise', 'Client', 4 * DAY), ev('qualification', 'Accueil Studio', 3.95 * DAY), ev('dispatch', 'Accueil Studio', 3.92 * DAY), ev('attribuee', 'Dispatch Studio', 3.9 * DAY), ev('production', 'Créatif', 3.8 * DAY), ev('controle', 'Créatif', 2 * H)],
          paiement: { statut: 'Payé', montant: null }, retour: null, remuneration: null },
        { id: 'CS-1047', clientId: 'cl2', service: 'personal', forfait: 'profil', state: 'soumise', createdAt: t - 40 * 60e3,
          brief: { reponses: ['Coach sportif, je veux être reconnu comme expert de la remise en forme', 'Entrepreneurs pressés', 'LinkedIn, Instagram'], secteur: 'Sport', style: 'Minimaliste', format: 'Carré 1:1', couleurs: '', limite: '', refs: [] },
          publication: false, prix: null, delaiPromis: null, creaId: null, offres: [], progres: null, choix: null, versions: [],
          retouches: { incluses: 2, utilisees: 0, fiches: [] }, fil: { client: [], crea: [] },
          historique: [ev('soumise', 'Client', 40 * 60e3)], paiement: { statut: 'En attente', montant: null }, retour: null, remuneration: null }
      ],
      journal: [],
      equipe: { sousRole: 'tous' }
    };
    db.orders.forEach(o => o.historique.forEach(h => db.journal.push({ at: h.at, who: h.by, what: `${o.id} → ${STATES[h.state].studio}` })));
    return db;
  }

  /* ---------- Lecture / écriture ---------- */
  const EMPTY = () => ({ v: 2, me: null, clients: [], creatifs: [], orders: [], journal: [], contacts: [], equipe: { sousRole: 'tous' } });
  let urls = {};
  function load() {
    if (LIVE) return mem || (mem = EMPTY());
    if (mem) return mem;
    const raw = ls.get(KEY);
    if (raw) { try { mem = JSON.parse(raw); } catch (e) { mem = null; } }
    if (!mem || mem.v !== 2) { mem = seed(); save(); }
    return mem;
  }
  function save() { if (!LIVE) ls.set(KEY, JSON.stringify(mem)); }
  function reset() { ls.del(KEY); mem = null; load(); }
  window.addEventListener('storage', e => { if (!LIVE && e.key === KEY) { mem = null; load(); CS.emit(); } });

  /* En ligne : la base renvoie une « photographie » des données que cette personne a le droit de voir */
  async function fetchLive() {
    const { data, error } = await sb.rpc('cs_snapshot');
    if (error) throw new Error(error.message);
    mem = Object.assign(EMPTY(), data || {});
    await resolveUrls();
  }
  const isImg = f => f && /^(PNG|JPG|JPEG|WEBP|GIF|SVG|AVIF)$/i.test(f.fmt || '');
  async function resolveUrls() {
    const paths = new Set();
    const add = f => { if (f && typeof f === 'object' && f.path && !urls[f.path]) paths.add(f.path); };
    mem.orders.forEach(o => { if (o.choix) { add(o.choix.a); add(o.choix.b); } (o.versions || []).forEach(v => (v.fichiers || []).filter(isImg).forEach(add)); });
    mem.creatifs.forEach(c => (c.portfolio || []).forEach(add));
    if (!paths.size) return;
    const { data } = await sb.storage.from(BUCKET).createSignedUrls([...paths], 3600);
    (data || []).forEach(x => { if (x.signedUrl) urls[x.path] = x.signedUrl; });
  }
  let booted = null;
  function ready() {
    if (booted) return booted;
    booted = (async () => {
      if (!LIVE) { load(); return; }
      const { data } = await sb.auth.getSession();
      if (data && data.session) { try { await fetchLive(); } catch (e) { mem = EMPTY(); toast(clean(e.message)); } } else mem = EMPTY();
      setInterval(() => { if (session() && !document.hidden && !drawerOpen()) refresh(); }, 45e3);
      document.addEventListener('visibilitychange', () => { if (!document.hidden && session()) refresh(); });
    })();
    return booted;
  }
  async function refresh() { if (LIVE && session()) { try { await fetchLive(); } catch (e) {} } CS.emit(); }

  /* ---------- Session ---------- */
  function session() {
    if (LIVE) return mem && mem.me ? { role: mem.me.role, id: mem.me.id, email: mem.me.email } : null;
    try { return JSON.parse(ls.get(SKEY)) || null; } catch (e) { return null; }
  }
  function login(role, id) { ls.set(SKEY, JSON.stringify({ role, id })); }
  function logout() { if (LIVE) { sb.auth.signOut(); mem = EMPTY(); } else ls.del(SKEY); }
  const base = () => location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
  async function signUp(email, password, meta) {
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: meta, emailRedirectTo: base() + 'connexion.html' } });
    if (error) throw new Error(clean(error.message));
    if (data.session) await fetchLive();
    return !!data.session;
  }
  async function signIn(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(clean(error.message));
    await fetchLive();
    if (!mem.me) throw new Error('Compte introuvable dans la plateforme. Contactez l’équipe Creative Studio.');
  }
  async function resetPassword(email) {
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: base() + 'connexion.html#nouveau' });
    if (error) throw new Error(clean(error.message));
  }
  async function updatePassword(pw) {
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) throw new Error(clean(error.message));
    await fetchLive();
  }
  const SPACE = { client: 'espace-client.html', crea: 'espace-createur.html', studio: 'studio.html' };
  /* Garde d'accès : chaque espace n'ouvre qu'à son rôle (la base le vérifie aussi) */
  async function guard(role) {
    await ready();
    const s = session();
    if (!LIVE) return true;
    if (!s) { location.replace('connexion.html?suite=' + encodeURIComponent(location.pathname.split('/').pop() + location.hash)); return false; }
    if (s.role !== role) { location.replace(SPACE[s.role]); return false; }
    return true;
  }
  function clean(m) {
    m = String(m || 'Une erreur est survenue');
    const T = { 'Invalid login credentials': 'E-mail ou mot de passe incorrect.', 'Email not confirmed': 'Confirmez d’abord votre adresse e-mail grâce au lien reçu.',
      'User already registered': 'Un compte existe déjà avec cette adresse. Connectez-vous.', 'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères.',
      'Failed to fetch': 'Connexion impossible. Vérifiez votre réseau.' };
    for (const k in T) if (m.includes(k)) return T[k];
    return m.replace(/^.*?ERROR:\s*/, '');
  }

  /* ---------- Outils ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SUR = { id: 'surmesure', nom: 'Projet sur mesure', icone: 'sm', forfaits: [], questions: ['Le projet', 'Les métiers nécessaires', 'Date de l’événement ou du lancement', 'Budget indicatif'] };
  const svc = id => id === 'surmesure' ? SUR : (D.services.find(s => s.id === id) || { nom: id, forfaits: [], questions: [] });
  const forfait = (o) => (svc(o.service).forfaits || []).find(f => f.id === o.forfait) || { nom: '' };
  const prixTxt = p => p == null ? 'Sur devis' : `à partir de ${p} ${D.devise}`;
  const delaiTxt = d => d == null ? 'Délai confirmé après étude' : d;
  function rel(at) {
    if (!at) return '';
    const d = at - now(), a = Math.abs(d), fut = d > 0;
    let s;
    if (a < 60e3) s = 'à l’instant';
    else if (a < H) s = Math.round(a / 60e3) + ' min';
    else if (a < DAY) s = Math.round(a / H) + ' h';
    else s = Math.round(a / DAY) + ' j';
    if (s === 'à l’instant') return s;
    return fut ? 'dans ' + s : 'il y a ' + s;
  }
  function dur(ms) {
    const a = Math.abs(ms), h = Math.floor(a / H), m = Math.floor((a % H) / 60e3);
    return (ms < 0 ? '-' : '') + (h >= 48 ? Math.floor(h / 24) + ' j ' + (h % 24) + ' h' : h + ' h ' + String(m).padStart(2, '0'));
  }
  const date = at => at ? new Date(at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—';
  function sinceState(o) { const h = o.historique[o.historique.length - 1]; return h ? now() - h.at : 0; }

  /* Coordonnées masquées : téléphone, e-mail, lien externe (section 11) */
  const RX = [/\+?(\d[ .-]?){8,}\d/g, /[\w.+-]+@[\w-]+\.[\w.]+/g, /(https?:\/\/|www\.)\S+/gi, /\b(whatsapp|wa\.me|linkedin|instagram|telegram)\b/gi];
  function mask(text) {
    let flagged = false, out = String(text);
    RX.forEach(r => { out = out.replace(r, () => { flagged = true; return '[coordonnée masquée]'; }); });
    return { text: out, flagged };
  }

  /* Changer l'état d'une commande, avec trace */
  function setState(o, state, by) {
    o.state = state;
    o.historique.push({ state, by, at: now() });
    load().journal.unshift({ at: now(), who: by, what: `${o.id} → ${STATES[state].studio}` });
    save(); CS.emit();
  }
  function log(who, what) { load().journal.unshift({ at: now(), who, what }); save(); }
  function nextId() { const db = load(); db.seq += 1; save(); return 'CS-' + db.seq; }

  /* Score interne (section 11) : ponctualité 30, conformité 25, retour client 25, réactivité 10, revue 10 */
  function scoreParts(c) {
    const s = c.score || 70;
    return [['Ponctualité', 30, Math.min(100, s + 6)], ['Conformité', 25, Math.max(40, s - 4)], ['Retour client', 25, Math.min(100, s + 2)], ['Réactivité', 10, Math.max(40, s - 8)], ['Revue de l’équipe', 10, s]];
  }

  /* ---------- Interface commune ---------- */
  function theme() {
    try { localStorage.removeItem('cs-theme'); if (sessionStorage.getItem('cs-theme') === 'light') document.documentElement.dataset.theme = 'light'; } catch (e) {}
  }
  function toggleTheme() {
    const R = document.documentElement;
    if (R.dataset.theme === 'light') delete R.dataset.theme; else R.dataset.theme = 'light';
    try { sessionStorage.setItem('cs-theme', R.dataset.theme === 'light' ? 'light' : 'dark'); } catch (e) {}
  }
  let toastT;
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.textContent = msg; t.classList.add('o'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('o'), 2800);
  }
  /* Fenêtre latérale accessible */
  let lastFocus = null;
  function drawer(html, onClose) {
    let d = document.getElementById('drawer');
    if (!d) {
      d = document.createElement('div'); d.id = 'drawer'; d.className = 'drawer';
      d.innerHTML = '<div class="sh" data-x></div><div class="pn" role="dialog" aria-modal="true" tabindex="-1"></div>';
      document.body.append(d);
      d.addEventListener('click', e => { if (e.target.closest('[data-x]')) closeDrawer(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && d.classList.contains('o')) closeDrawer(); });
    }
    if (!d.classList.contains('o')) lastFocus = document.activeElement;
    d._onClose = onClose;
    const pn = d.querySelector('.pn'); const st = pn.scrollTop;
    pn.innerHTML = html; d.classList.add('o'); document.body.style.overflow = 'hidden';
    if (!d._wasOpen) { pn.scrollTop = 0; pn.focus(); } else pn.scrollTop = st;
    d._wasOpen = true;
    return pn;
  }
  function closeDrawer() {
    const d = document.getElementById('drawer'); if (!d) return;
    d.classList.remove('o'); d._wasOpen = false; document.body.style.overflow = '';
    if (d._onClose) d._onClose();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  const drawerOpen = () => { const d = document.getElementById('drawer'); return d && d.classList.contains('o'); };

  /* Barre du haut commune */
  function header(opts) {
    const s = session();
    const el = document.getElementById('top');
    const name = opts.who || '';
    el.innerHTML = `${LIVE ? '' : '<div class="demo">Démonstration de la plateforme : <b>aucune commande n\'est envoyée</b>, les données restent dans votre navigateur. <button type="button" data-reset>Réinitialiser la démo</button></div>'}
    <div class="wrap tin">
      <a class="logo" href="index.html" aria-label="Creative Studio, retour à l'accueil"><img src="brand/creative-studio-mark.png" alt=""><span class="cs"><span class="c1">Creative</span> <b class="c2">Studio</b></span></a>
      <span class="where">${esc(opts.where || '')}</span>
      <nav aria-label="Espaces">${(opts.nav || []).map(n => `<a href="${n[1]}"${n[2] ? ' aria-current="page"' : ''}>${n[0]}</a>`).join('')}</nav>
      ${name ? `<span class="who"><i aria-hidden="true">${esc(name.slice(0, 1))}</i><span>${esc(name)}<small>${esc(opts.role || '')}</small></span></span>` : '<span class="sp"></span>'}
      <button class="icb" type="button" data-theme-t aria-label="Mode clair ou sombre"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg></button>
      ${s ? '<a class="icb" href="connexion.html" data-out aria-label="Se déconnecter" title="Se déconnecter"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/></svg></a>' : ''}
    </div>`;
    const rs = el.querySelector('[data-reset]'); if (rs) rs.onclick = () => { reset(); toast('Démo réinitialisée'); CS.emit(); };
    el.querySelector('[data-theme-t]').onclick = toggleTheme;
    const out = el.querySelector('[data-out]'); if (out) out.onclick = async e => { if (LIVE) { e.preventDefault(); await sb.auth.signOut(); location.href = 'connexion.html'; } else logout(); };
  }

  /* Petits rendus partagés */
  function stepsBar(o) {
    const k = clientStep(o.state), labels = ['Brief reçu', 'Création', 'Contrôle Studio', 'Livraison'];
    const done = o.state === 'terminee' || o.state === 'livree';
    return `<div class="steps" aria-hidden="true">${labels.map((l, i) => `<span class="${i < k || (done && i === k) ? 'on' : i === k ? 'now' : ''}"></span>`).join('')}</div>
      <div class="stlbl">${labels.map((l, i) => i === k ? `<b>${l}</b>` : `<span>${l}</span>`).join('')}</div>`;
  }
  function fileRow(f, action) {
    return `<div class="file"><span class="ic">${esc(f.fmt)}</span><span class="meta">${esc(f.nom)}<small>${esc(f.fmt)} · ${esc(f.poids)}</small></span>${action || ''}</div>`;
  }
  function thread(list, me, labels) {
    if (!list.length) return '<p class="empty">Aucun message pour l’instant.</p>';
    return `<div class="thread">${list.map(m => `<div class="msg ${m.from === me ? 'me' : ''} ${m.masque ? 'hidden-info' : ''}"><small>${esc(labels[m.from] || m.from)} · ${rel(m.at)}</small>${esc(m.text)}${m.masque ? '<small style="margin-top:.3rem;color:var(--warn)">Une coordonnée a été masquée.</small>' : ''}</div>`).join('')}</div>`;
  }


  /* ---------- Actions : une seule liste, deux moteurs ---------- */
  const RPC = {
    createOrder: p => ['cs_create_order', { p }], updateMe: p => ['cs_update_me', { p }], portfolioAdd: p => ['cs_portfolio_add', { p }],
    pick: (id, k) => ['cs_c_pick', { p_id: id, p_k: k }], publication: (id, on) => ['cs_c_publication', { p_id: id, p_on: on }],
    retouche: (id, t) => ['cs_c_retouche', { p_id: id, p_text: t }], validate: id => ['cs_c_validate', { p_id: id }],
    feedback: (id, p) => ['cs_c_feedback', { p_id: id, p }], cancelClient: id => ['cs_c_cancel', { p_id: id }],
    addRefs: (id, files) => ['cs_c_add_refs', { p_id: id, p_files: files }],
    msg: (id, side, text, q) => ['cs_msg', { p_id: id, p_side: side, p_text: text, p_question: !!q }],
    accept: (id, d) => ['cs_k_accept', { p_id: id, p_delai: d }], decline: id => ['cs_k_decline', { p_id: id }],
    progress: (id, p) => ['cs_k_progress', { p_id: id, p_p: p }], deliver: (id, kind, note, files) => ['cs_k_deliver', { p_id: id, p_kind: kind, p_note: note, p_files: files }],
    take: id => ['cs_s_take', { p_id: id }], launch: (id, p) => ['cs_s_launch', { p_id: id, p }], relaunch: id => ['cs_s_relaunch', { p_id: id }],
    assign: (id, c) => ['cs_s_assign', { p_id: id, p_crea: c }], approve: id => ['cs_s_approve', { p_id: id }], reject: (id, c) => ['cs_s_reject', { p_id: id, p_consigne: c }],
    fiche: (id, t, m) => ['cs_s_fiche', { p_id: id, p_text: t, p_motif: m }], forward: (id, sd, i) => ['cs_s_forward', { p_id: id, p_side: sd, p_idx: i }],
    sdo: (id, w) => ['cs_s_do', { p_id: id, p_what: w }], certify: (c, p) => ['cs_s_certify', { p_crea: c, p }], subrole: sr => ['cs_s_subrole', { p_sr: sr }], contactDone: id => ['cs_s_contact_done', { p_id: id }]
  };
  let busy = false;
  async function act(name, ...args) {
    if (busy) return; busy = true;
    try {
      let res;
      if (LIVE) {
        const [fn, params] = RPC[name](...args);
        const { data, error } = await sb.rpc(fn, params);
        if (error) throw new Error(error.message);
        res = data; await fetchLive();
      } else { res = DEMO[name](...args); save(); }
      busy = false; CS.emit(); return res;
    } catch (e) { busy = false; toast(clean(e.message)); throw e; }
  }

  /* Moteur de démonstration : mêmes règles que la base, sur des données d'exemple */
  const O = id => { const o = load().orders.find(x => x.id === id); if (!o) throw new Error('Commande introuvable'); return o; };
  const say = (o, side, from, text, extra) => o.fil[side].push(Object.assign({ from, text, at: now() }, extra || {}));
  const who = () => { const s = session() || {}; return s.role === 'client' ? 'Client' : s.role === 'crea' ? 'Créatif' : 'Équipe Studio'; };
  const meCrea = () => load().creatifs.find(c => c.id === (session() || {}).id);
  function finish(o, by) { setState(o, 'terminee', by); const c = load().creatifs.find(x => x.id === o.creaId); if (c && o.remuneration != null) c.gains.attente += o.remuneration; }
  const DEMO = {
    createOrder(p) {
      const db = load(); let s = session();
      if (!s || s.role !== 'client') {
        const pr = p.profil || {}, cid = 'cl' + (db.clients.length + 1) + '-' + (now() % 100000);
        db.clients.push({ id: cid, nom: pr.nom || 'Client', entreprise: pr.entreprise || '', type: pr.entreprise ? 'Entreprise' : 'Particulier', secteur: pr.secteur || '', pays: pr.pays || '', langue: pr.langue || 'Français', contact: pr.contact || '', source: pr.source || '', marque: { couleurs: [], polices: [], brief: '' } });
        login('client', cid); s = session();
      }
      const id = nextId();
      db.orders.unshift({ id, clientId: s.id, service: p.service, forfait: p.forfait, state: 'soumise', createdAt: now(), brief: p.brief, publication: !!p.publication, parent: !!p.parent,
        prix: null, delaiPromis: null, creaId: null, offres: [], progres: null, choix: null, versions: [], retouches: { incluses: 2, utilisees: 0, fiches: [] },
        fil: { client: [], crea: [] }, historique: [{ state: 'soumise', by: 'Client', at: now() }], paiement: { statut: 'En attente', montant: null }, retour: null, remuneration: null });
      log('Client', `${id} → Nouvelle commande`); return id;
    },
    updateMe(p) {
      const s = session(), db = load();
      if (s.role === 'client') { const c = db.clients.find(x => x.id === s.id); if (p.brief != null) c.marque.brief = p.brief; ['nom', 'entreprise', 'pays', 'langue', 'contact', 'source', 'secteur'].forEach(k => { if (p[k] != null) c[k] = p[k]; }); }
      if (s.role === 'crea') { const c = meCrea(); if (p.statut) c.statut = p.statut; if (p.absentJusqua) c.absentJusqua = +p.absentJusqua; }
    },
    portfolioAdd(p) { const c = meCrea(); c.portfolio = c.portfolio || []; c.portfolio.unshift({ titre: p.titre || 'Travail', secteur: p.secteur, format: p.format, img: p.img, path: p.path, url: p.url, pub: 'Privé', at: now() }); },
    pick(id, k) { const o = O(id); o.choix.pick = k; say(o, 'crea', 'studio', `Le client a choisi la piste ${k.toUpperCase()}.`); log('Client', `${id} : piste ${k.toUpperCase()} choisie`); },
    publication(id, on) { O(id).publication = on; },
    retouche(id, t) { const o = O(id); if (o.retouches.utilisees >= o.retouches.incluses) throw new Error('Plus de retouche incluse dans cette formule'); o.retouches.utilisees++; o.retouches.fiches.push({ n: o.retouches.fiches.length + 1, brut: t, reformule: null, at: now() }); setState(o, 'retouche', 'Client'); },
    validate(id) { finish(O(id), 'Client'); },
    feedback(id, p) { const o = O(id); o.retour = Object.assign({}, p, { at: now() }); log('Client', `${id} : avis envoyé`); },
    cancelClient(id) { setState(O(id), 'annulee', 'Client'); },
    addRefs(id, files) { const o = O(id); o.brief.refs = (o.brief.refs || []).concat(files); say(o, 'client', 'client', `${files.length} fichier(s) de référence ajouté(s).`); },
    msg(id, side, text, q) {
      const o = O(id), s = session();
      if (s.role === 'studio') return say(o, side, 'studio', text, q ? { question: true } : {});
      const m = mask(text), sd = s.role === 'client' ? 'client' : 'crea';
      say(o, sd, sd, m.text, m.flagged ? { masque: true, brut: text } : {});
      if (m.flagged) log('Système', `${id} : coordonnée masquée dans un message ${s.role === 'client' ? 'client' : 'créatif'}`);
    },
    accept(id, d) { const o = O(id), c = meCrea(); if (!o.offres.find(x => x.creaId === c.id)) o.offres.push({ creaId: c.id, delai: d, at: now() }); log(c.pseudo, `${id} : mission acceptée, délai proposé ${d}`); },
    decline(id) { const o = O(id), c = meCrea(); if (o.offreOuverte) o.offreOuverte.cibles = o.offreOuverte.cibles.filter(x => x !== c.id); },
    progress(id, p) { const o = O(id); o.progres = p; if (o.state === 'attribuee') setState(o, 'production', 'Créatif'); log(meCrea().pseudo, `${id} : avancement « ${p} »`); },
    deliver(id, kind, note, files) {
      const o = O(id); if (!files.length) throw new Error('Ajoutez au moins un fichier');
      if (kind === 'pistes' && files.length !== 2) throw new Error('Déposez exactement deux pistes (A et B)');
      o.versions.push({ n: o.versions.length + 1, kind, statut: 'soumise', note, fichiers: files, at: now() }); o.progres = 'Prêt à livrer'; setState(o, 'controle', 'Créatif');
    },
    take(id) { setState(O(id), 'qualification', 'Accueil Studio'); },
    launch(id, p) {
      const o = O(id);
      o.prix = p.prix === '' || p.prix == null ? null : +p.prix; o.remuneration = p.remuneration === '' || p.remuneration == null ? o.remuneration : +p.remuneration;
      o.delaiPromis = p.delai ? +p.delai : null; o.retouches.incluses = +p.retouches || 0; o.briefNettoye = p.briefNettoye || null;
      const cibles = load().creatifs.filter(c => c.niveau !== 'Candidat' && c.statut === 'dispo' && (o.service === 'surmesure' || c.specialites.includes(o.service))).map(c => c.id);
      o.offreOuverte = { at: now(), fin: now() + 4 * H, cibles };
      if (o.paiement.statut === 'En attente' && o.prix != null) o.paiement = { statut: 'À régler', montant: o.prix };
      if (o.state === 'qualification') { say(o, 'client', 'studio', 'Merci ! Votre demande est claire, nous composons votre équipe créative.'); setState(o, 'dispatch', 'Accueil Studio'); }
      return cibles.length;
    },
    relaunch(id) { const o = O(id); o.offreOuverte = Object.assign(o.offreOuverte || { cibles: [] }, { at: now(), fin: now() + 4 * H }); log('Dispatch Studio', `${id} : offre relancée`); return o.offreOuverte.cibles.length; },
    assign(id, cid) {
      const o = O(id), c = load().creatifs.find(x => x.id === cid); o.creaId = cid; delete o.offreOuverte;
      say(o, 'crea', 'studio', `Mission confirmée. Échéance : ${o.delaiPromis ? date(o.delaiPromis) : 'à préciser'}.`);
      say(o, 'client', 'studio', 'Votre équipe créative est constituée. Première piste attendue très vite.'); setState(o, 'attribuee', 'Dispatch Studio'); return c.pseudo;
    },
    approve(id) {
      const o = O(id), v = o.versions.filter(x => x.statut === 'soumise').pop(); if (!v) throw new Error('Aucune version à contrôler');
      if (v.kind === 'pistes') { v.statut = 'pistes'; o.choix = { a: v.fichiers[0], b: v.fichiers[1], pick: null }; say(o, 'client', 'studio', 'Deux pistes vous attendent : choisissez celle qui vous parle le plus.'); say(o, 'crea', 'studio', 'Vos deux pistes ont été transmises au client.'); setState(o, 'production', 'Contrôle Studio'); }
      else { v.statut = 'validee'; say(o, 'client', 'studio', 'Votre livraison est prête. Vous pouvez la télécharger et la valider, ou demander une retouche.'); say(o, 'crea', 'studio', `Version ${v.n} validée et livrée au client.`); setState(o, 'livree', 'Contrôle Studio'); }
    },
    reject(id, t) { const o = O(id), v = o.versions.filter(x => x.statut === 'soumise').pop(); v.statut = 'refusee'; v.consigne = t; say(o, 'crea', 'studio', `Version ${v.n} à corriger : ${t}`); setState(o, o.retouches.fiches.length && o.versions.some(x => x.statut === 'validee') ? 'retouche' : 'production', 'Contrôle Studio'); },
    fiche(id, t, m) { const o = O(id), f = o.retouches.fiches[o.retouches.fiches.length - 1]; f.reformule = t; f.motif = m; say(o, 'crea', 'studio', `Fiche de retouche n°${f.n} disponible dans la mission.`); log('Contrôle Studio', `${id} : fiche de retouche n°${f.n} envoyée (${m})`); },
    forward(id, sd, i) { const o = O(id), m = o.fil[sd][i], to = sd === 'client' ? 'crea' : 'client'; if (to === 'crea' && !o.creaId) throw new Error('Aucun créatif attribué'); say(o, to, 'studio', (sd === 'client' ? 'Message du client, relu par le Studio : ' : 'De la part de l’équipe créative : ') + mask(m.text).text); log('Équipe Studio', `${id} : message transféré après relecture`); },
    sdo(id, w) {
      const o = O(id);
      if (w === 'close') finish(o, 'Plateforme (silence du client)');
      if (w === 'case') { o.etudeDeCas = true; log('Équipe Studio', `${id} : étude de cas préparée pour la vitrine`); }
      if (w === 'litige') setState(o, 'litige', 'Équipe Studio');
      if (w === 'cancel') { if (o.paiement.statut === 'Payé') o.paiement.statut = 'Remboursé'; setState(o, 'annulee', 'Équipe Studio'); }
      if (w === 'paid') { o.paiement.statut = 'Payé'; log('Finance Studio', `${id} : règlement enregistré`); }
    },
    certify(cid, p) { const c = load().creatifs.find(x => x.id === cid); if (p.niveau) c.niveau = p.niveau; if (p.specialites) c.specialites = p.specialites; if (p.score != null) c.score = +p.score; log('Équipe Studio', `${c.pseudo} : niveau ${c.niveau}`); },
    subrole(sr) { load().equipe.sousRole = sr; },
    contactDone(id) { const k = (load().contacts || []).find(x => x.id === id); if (k) k.traite = true; }
  };

  /* ---------- Fichiers ---------- */
  const size = n => n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' Mo' : Math.max(1, Math.round(n / 1024)) + ' Ko';
  const readURL = f => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = () => r(''); fr.readAsDataURL(f); });
  async function upload(prefix, file) {
    const meta = { nom: file.name, fmt: (file.name.split('.').pop() || '').toUpperCase().slice(0, 4), poids: size(file.size) };
    if (!LIVE) { if (/^image\//.test(file.type) && file.size < 6e5) meta.url = await readURL(file); return meta; }
    if (file.size > 50 * 1048576) throw new Error(`${file.name} dépasse 50 Mo.`);
    const safe = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').slice(-80);
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safe}`;
    const { error } = await sb.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) throw new Error('Envoi impossible : ' + clean(error.message));
    meta.path = path; urls[path] = null; return meta;
  }
  async function uploadAll(prefix, files, onStep) {
    const out = [];
    for (let i = 0; i < files.length; i++) { if (onStep) onStep(i + 1, files.length); out.push(await upload(prefix, files[i])); }
    return out;
  }
  const src = x => !x ? '' : typeof x === 'string' ? x : (x.url || urls[x.path] || x.img || '');
  async function download(f, orderId) {
    if (LIVE && f && f.path) {
      const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(f.path, 600, { download: `creative-studio-${orderId ? orderId + '-' : ''}${f.nom}` });
      if (error) return toast('Téléchargement impossible : ' + clean(error.message));
      const l = document.createElement('a'); l.href = data.signedUrl; l.rel = 'noopener'; document.body.append(l); l.click(); l.remove();
    } else if (f && (f.url || f.img)) window.open(f.url || f.img, '_blank', 'noopener');
    else toast('Téléchargement lancé (démonstration)');
  }

  /* Icônes des services (traits fins, couleur du texte) */
  const IC = {
    id: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 15.5 12 7l3.5 8.5M9.8 12.5h4.4"/>',
    yt: '<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="m10.5 9.5 4 2.5-4 2.5z"/>',
    pb: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5a7 7 0 0 1 14 0"/>',
    mo: '<path d="M4 17c3-9 5-9 8 0s5 9 8 0"/><circle cx="12" cy="12" r="1.2"/>',
    ui: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 8.5h18M8 13h8M8 16h5"/>',
    lp: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M10 16h4"/>',
    au: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5M8 10.5h5"/>',
    po: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    sm: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'
  };
  const icon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k] || IC.sm}</svg>`;

  /* Abonnement aux changements */
  const subs = [];
  window.CS = {
    D, STATES, PROGRESS, load, save, reset, session, login, logout, esc, svc, forfait, prixTxt, delaiTxt, rel, dur, date,
    sinceState, mask, setState, log, nextId, scoreParts, clientStep, theme, toggleTheme, toast, drawer, closeDrawer, drawerOpen,
    header, stepsBar, fileRow, thread, icon, now, H, DAY,
    LIVE, sb, ready, refresh, act, guard, signUp, signIn, resetPassword, updatePassword, upload, uploadAll, src, download, isImg, clean, SPACE,
    on(fn) { subs.push(fn); }, emit() { subs.forEach(f => f()); }
  };
  theme();
})();
