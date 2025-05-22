# Astro & Fiches de lecture

Le but de ce projet est de pouvoir mettre à disposition des fiches de lectures et d'optimiser leur accessibilité. 

# Développement

## Features in Progress

### Intégration OVH
**Branch:** `feat/ovh-integration`

**Summary:**
Nous mettons en place un système d'upload de fiches de lecture sur un serveur OVH :
- Upload sécurisé via SFTP
- Validation des fichiers
- Reconstruction automatique via Netlify
- Stockage des fichiers sur le serveur OVH

**Étapes d'implémentation:**
1. Configuration du serveur OVH :
   - [x] Créer un dossier dédié pour les fiches
   - [-] Configurer les permissions appropriées
   - [-] Mettre en place un utilisateur SFTP dédié

2. API d'upload :
   - [x] Créer une route API sécurisée
   - [ ] Implémenter l'authentification
   - [x] Configurer l'upload SFTP
   - [ ] Mettre en place la validation des fichiers

3. Intégration Netlify :
   - [x] Configurer le webhook de reconstruction
   - [ ] Tester le processus complet

**To-Do List:**
- [x] Configuration initiale du serveur OVH
- [x] Création de l'API d'upload
- [-] Mise en place de l'authentification
- [ ] Tests d'intégration

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## .env file
Pour le développement local, copiez `.env.example` et renommez-le en `.env`.
Remplissez les informations suivantes :

```
# SFTP Configuration
SFTP_HOST=votre-host.example.com
SFTP_PORT=22
SFTP_USERNAME=votre-nom-utilisateur
SFTP_PASSWORD=votre-mot-de-passe
# Ou clé SSH (recommandé)
SFTP_PRIVATE_KEY_PATH=/chemin/vers/votre/cle_privee

# Environnement et chemin
ENVIRONMENT=development
SFTP_BASE_PATH=/prisma

# Webhook Netlify (optionnel pour le développement local)
NETLIFY_BUILD_HOOK=https://api.netlify.com/build_hooks/votre-id-de-build-hook

# Image Domain Configuration
# Liste de domaines autorisés pour les images (vide = autoriser tous)
ALLOWED_IMAGE_DOMAINS=imgur.com,github.com,githubusercontent.com
# Liste de domaines bloqués pour les images (vide = ne bloquer aucun)
BLOCKED_IMAGE_DOMAINS=
```

## Configuration SFTP

### Structure des dossiers sur le serveur SFTP
Nous recommandons la structure suivante sur votre serveur SFTP pour gérer les différents environnements :

```
/prisma
  /production    # Fiches de lecture pour l'environnement de production
  /staging       # Fiches de lecture pour l'environnement de préproduction
  /development   # Fiches de lecture pour l'environnement de développement
```

### Configuration des variables d'environnement

**Option 1 : Pour le déploiement sur Netlify**

Nous utilisons les variables d'environnement de Netlify pour configurer l'accès SFTP en production :

1. Connectez-vous à votre compte Netlify
2. Sélectionnez votre projet
3. Allez dans **Site settings** > **Build & deploy** > **Environment**
4. Ajoutez les variables suivantes :

```
# SFTP Configuration
SFTP_HOST
SFTP_PORT
SFTP_USERNAME
SFTP_PASSWORD (ou utiliser SFTP_PRIVATE_KEY pour plus de sécurité)

# Environnement et chemin
ENVIRONMENT (development, staging ou production)
SFTP_BASE_PATH (/prisma)

# Build hook
NETLIFY_BUILD_HOOK
```

**Option 2 : Pour le développement local**

Utilisez le fichier `.env` comme décrit plus haut dans la section "`.env file`".

Ces variables seront utilisées par l'application pour se connecter au serveur SFTP et stocker les fiches de lecture dans l'environnement approprié.

### Configuration du Build Hook Netlify

Pour obtenir un build hook Netlify :
1. Connectez-vous à votre compte Netlify
2. Sélectionnez votre projet
3. Allez dans **Site settings** > **Build & deploy** > **Build hooks**
4. Cliquez sur **Add build hook**
5. Donnez un nom à votre hook (ex: "SFTP Upload Trigger")
6. Sélectionnez la branche à reconstruire
7. Ajoutez l'URL générée comme variable d'environnement `NETLIFY_BUILD_HOOK` dans vos paramètres Netlify

### Sécurité et bonnes pratiques

- Utilisez les variables d'environnement de Netlify pour stocker ces informations sensibles
- Préférez l'authentification par clé SSH plutôt que par mot de passe
- Créez un utilisateur SFTP dédié avec des permissions limitées au dossier des fiches
- Pour les environnements de développement local, utilisez un fichier `.env` (non commité dans git)

## 🧞 Commands

Toutes les commandes sont exécutées depuis la racine du projet, dans un terminal :

| Commande                 | Action                                                                          |
|:-------------------------|:--------------------------------------------------------------------------------|
| `yarn install`           | Installe les dépendances                                                        |
| `yarn dev`         | Démarre le serveur de développement local sur `localhost:4321`                  |
| `yarn copy-pagefind` | Copie uniquement l'index pagefind dans `/public` pour le test en local                               |
| `yarn build`       | Construit votre site pour la production dans `./dist/`                          |
| `yarn pagefind`    | Construit l'index pagefind                                                      |
| `yarn preview`           | Prévisualisez localement votre build, avant déploiement                         |
| `yarn astro ...`         | Exécutez les commandes CLI comme `astro add`, `astro check`                     |
| `yarn astro -- --help`   | Obtenez de l'aide sur l'utilisation de l'interface CLI d'Astro                  |

[![Netlify Status](https://api.netlify.com/api/v1/badges/34286945-ff9a-4d18-9c66-0042e5269beb/deploy-status)](https://app.netlify.com/sites/astro-prisma-102442/deploys)