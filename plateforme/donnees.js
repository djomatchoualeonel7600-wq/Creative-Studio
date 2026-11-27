/* ==========================================================================
   CATALOGUE ET LISTES DE RÉFÉRENCE — à modifier ici, nulle part ailleurs.
   prix    : null = « Sur devis ». Mets un nombre (ex. 150) pour afficher « à partir de 150 € ».
   delai   : null = « Délai confirmé après étude ». Mets un texte (ex. "5 jours").
   retouches : null = non affiché. Mets un nombre (ex. 2).
   Ajouter un service ou un secteur = ajouter une ligne, sans toucher au reste du site.
   ========================================================================== */
window.CS_DATA = {
  devise: "€",
  promesse: "Votre première direction artistique arrive sous 24 heures.",

  services: [
    { id: "identite", nom: "Identité visuelle", icone: "id", image: "i/kolobi-studio-01.jpg",
      phrase: "Un logo et tout ce qui va avec, pour que votre marque se reconnaisse partout.",
      forfaits: [
        { id: "essentiel", nom: "Logo", inclus: ["Logo principal et variantes", "Palette de couleurs", "Fichiers prêts à l'emploi"], prix: null, delai: null, retouches: null },
        { id: "complet", nom: "Identité complète", inclus: ["Logo et déclinaisons", "Couleurs et typographies", "Mockups, flyers et bannières", "Guide d'utilisation"], prix: null, delai: null, retouches: null }
      ],
      questions: ["Comment s'appelle votre marque ?", "Que faites-vous, en une phrase ?", "Qui sont vos clients ?", "Trois mots qui décrivent l'image que vous voulez donner"] },
    { id: "miniature", nom: "Miniatures YouTube", icone: "yt", image: "r/m/breaking-into-tech.jpg",
      phrase: "Des miniatures qui donnent envie de cliquer, au bon format, à chaque vidéo.",
      forfaits: [
        { id: "unite", nom: "À l'unité", inclus: ["Une miniature 16:9", "Version prête à publier"], prix: null, delai: null, retouches: null },
        { id: "pack", nom: "Pack mensuel", inclus: ["Plusieurs miniatures par mois", "Même ligne visuelle", "Priorité de traitement"], prix: null, delai: null, retouches: null }
      ],
      questions: ["Lien ou nom de votre chaîne", "Titre de la vidéo", "Le message principal de la miniature", "Photo de vous à utiliser (si vous en avez une)"] },
    { id: "personal", nom: "Personal branding", icone: "pb", image: "r/pb/etincelle/banniere-linkedin.jpg",
      phrase: "Une image personnelle claire et cohérente, sur LinkedIn et partout ailleurs.",
      forfaits: [
        { id: "profil", nom: "Profil", inclus: ["Bannière et visuels de profil", "Ligne graphique pour vos posts"], prix: null, delai: null, retouches: null },
        { id: "complet", nom: "Accompagnement", inclus: ["Positionnement", "Kit de visuels pour les réseaux", "Modèles de posts réutilisables"], prix: null, delai: null, retouches: null }
      ],
      questions: ["Votre métier et ce que vous voulez qu'on retienne de vous", "Votre public cible", "Les réseaux que vous utilisez"] },
    { id: "motion", nom: "Motion design", icone: "mo", image: "v/kolobi-studio-motion-01.jpg", video: "v/kolobi-studio-motion-01.mp4",
      phrase: "Votre logo et vos messages prennent vie en animation 2D ou 3D.",
      forfaits: [
        { id: "logo", nom: "Animation de logo", inclus: ["Animation courte du logo", "Versions pour vidéo et réseaux"], prix: null, delai: null, retouches: null },
        { id: "video", nom: "Vidéo animée", inclus: ["Script visuel", "Animation complète", "Formats 16:9 et 9:16"], prix: null, delai: null, retouches: null }
      ],
      questions: ["Que doit raconter l'animation ?", "Durée souhaitée", "Où sera-t-elle diffusée ?"] },
    { id: "uiux", nom: "UI & UX design", icone: "ui", image: "i/jacinthe-01.jpg",
      phrase: "Des écrans simples à utiliser et beaux à regarder, pour votre site ou votre application.",
      forfaits: [
        { id: "maquette", nom: "Maquette", inclus: ["Parcours utilisateur", "Maquettes des écrans principaux"], prix: null, delai: null, retouches: null },
        { id: "produit", nom: "Produit complet", inclus: ["Parcours et maquettes", "Prototype cliquable", "Bibliothèque de composants"], prix: null, delai: null, retouches: null }
      ],
      questions: ["Site ou application ?", "Que doit pouvoir faire l'utilisateur ?", "Avez-vous déjà une identité visuelle ?"] },
    { id: "landing", nom: "Landing page", icone: "lp", image: "v/space-motion-04.jpg",
      phrase: "Une page qui présente votre offre et transforme les visiteurs en clients.",
      forfaits: [
        { id: "page", nom: "Une page", inclus: ["Design de la page", "Version mobile", "Textes mis en forme"], prix: null, delai: null, retouches: null }
      ],
      questions: ["Quelle offre la page présente-t-elle ?", "Quelle action attendez-vous du visiteur ?", "Avez-vous déjà les textes ?"] },
    { id: "audit", nom: "Consultation et audit", icone: "au", image: null,
      phrase: "Un regard d'expert sur votre marque, avec des recommandations claires.",
      forfaits: [
        { id: "audit", nom: "Audit de marque", inclus: ["Analyse de votre image actuelle", "Recommandations écrites", "Échange de restitution"], prix: null, delai: null, retouches: null }
      ],
      questions: ["Qu'est-ce qui ne va pas aujourd'hui, selon vous ?", "Liens vers vos supports actuels"] },
    { id: "podcast", nom: "Studio de podcast", icone: "po", image: null,
      phrase: "Enregistrer votre podcast ou votre interview dans un studio équipé.",
      forfaits: [
        { id: "session", nom: "Session studio", inclus: ["Studio et matériel", "Accompagnement sur place"], prix: null, delai: null, retouches: null }
      ],
      questions: ["Podcast ou interview ?", "Nombre de personnes au micro", "Date souhaitée"] }
  ],

  secteurs: ["Restauration", "Mode & beauté", "Sport", "Tech & services", "Culture & musique", "Maison & bien-être", "Autre"],
  styles: ["Minimaliste", "Élégant", "Audacieux", "Ludique", "Luxe", "Naturel", "Rétro", "Technologique"],
  formats: ["Carré 1:1", "Paysage 16:9", "Vertical 9:16", "Impression", "Web", "Vidéo"],
  langues: ["Français", "Anglais"],
  sources: ["LinkedIn", "Bouche à oreille", "Instagram", "Recherche Google", "Un événement", "Autre"],
  motifsRetouche: ["Qualité", "Délai", "Communication", "Brief"]
};
