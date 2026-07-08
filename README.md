# GTA6 HUB — Application communautaire

Application 100% gratuite dédiée à la communauté GTA 6 : compte, classement mondial, chat en direct, quiz, galerie tenues/véhicules, assistant IA. Interface bilingue FR/EN.

## 🚀 Déployer sur Netlify (5 minutes)

### Étape 1 — Mettre le projet sur GitHub (recommandé)
1. Crée un nouveau dépôt sur GitHub.
2. Mets-y tout le contenu de ce dossier (`netlify.toml`, `package.json`, `netlify/`, `public/`).

Ou plus simple : sur [app.netlify.com](https://app.netlify.com), fais un **glisser-déposer** de ce dossier entier directement dans l'interface "Deploy manually" (onglet "Deploys" d'un nouveau site). Netlify Blobs fonctionne aussi dans ce mode.

### Étape 2 — Connecter le site sur Netlify
- "Add new site" → "Import an existing project" (si GitHub) ou "Deploy manually" (si glisser-déposer).
- Build command : *(laisser vide, rien à builder)*
- Publish directory : `public`
- Functions directory : `netlify/functions` *(déjà configuré dans `netlify.toml`)*

### Étape 3 — Ajouter ta clé API (pour l'assistant IA)
Dans Netlify : **Site settings → Environment variables**, ajoute :

| Clé | Valeur |
|---|---|
| `ANTHROPIC_API_KEY` | ta clé API Anthropic (commence par `sk-ant-...`) |
| `AI_MODEL` *(optionnel)* | ex. `claude-sonnet-4-5-20250929` — laisse vide pour la valeur par défaut |

Puis redéploie le site (Deploys → Trigger deploy) pour que la variable soit prise en compte.

### Étape 4 — C'est en ligne !
Netlify te donne une URL du type `https://ton-site.netlify.app`. Tu peux la personnaliser gratuitement (Site settings → Domain management → Change site name), ou brancher ton propre nom de domaine.

## 💾 Stockage des données
Toutes les données (comptes, classement, chat, galerie) sont stockées via **Netlify Blobs**, un stockage clé-valeur intégré à Netlify, **gratuit** dans la limite du plan gratuit Netlify (largement suffisant pour démarrer). Aucune base de données externe à configurer.

## 🔐 Comptes utilisateurs
Système simple pseudo + code PIN (4 à 6 chiffres), pensé pour une appli communautaire gratuite et rapide à utiliser — pas de mot de passe complexe ni d'email requis. Le code PIN est haché (SHA-256) avant stockage.

## 🌍 Rendre l'appli virale
Quelques leviers une fois en ligne :
- Partage le lien sur Reddit (r/GTA6, r/GTA), Discord, TikTok/X avec des captures du classement ou de la galerie.
- Encourage les utilisateurs à partager leur score de quiz ("J'ai eu X/8, et toi ?").
- Ajoute régulièrement de nouvelles questions de quiz au fichier `public/index.html` (tableau `QUIZ`) au fur et à mesure des annonces officielles Rockstar.
- Le compte à rebours avant le 19 novembre 2026 (visible sur la page d'accueil) crée un rendez-vous régulier.

## 🛠️ Développement local
```bash
npm install -g netlify-cli
npm install
netlify dev
```
Cela lance le site + les fonctions en local avec un émulateur Netlify Blobs.

## 📁 Structure du projet
```
gta6hub/
├── netlify.toml              # config Netlify (redirections /api/*)
├── package.json              # dépendance @netlify/blobs
├── public/
│   └── index.html            # toute l'application (frontend)
└── netlify/functions/
    ├── _store.js              # helper stockage
    ├── auth.js                # inscription / connexion
    ├── leaderboard.js         # classement mondial
    ├── chat.js                # chat communautaire
    ├── gallery.js             # galerie tenues/véhicules
    └── ai-chat.js             # assistant IA (Ray)
```

## ⚠️ Important
- Cette application est un projet de fans **non affilié à Rockstar Games ni à Take-Two Interactive**. Garde cette mention visible (déjà présente en bas de page) pour rester dans un usage acceptable de la marque GTA.
- N'utilise que des images dont tu as le droit (captures de ton propre gameplay, créations perso) pour la galerie — évite de republier des visuels officiels protégés par le droit d'auteur.
- Pense à mettre à jour les questions du quiz au fil des annonces officielles pour rester crédible dans la communauté.
