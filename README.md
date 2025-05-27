# Astro & Fiches de lecture

Le but de ce projet est de pouvoir mettre à disposition des fiches de lectures et d'optimiser leur accessibilité. 

# Développement

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

## Messages personnalisés de déploiement

Le système envoie automatiquement des messages personnalisés à Netlify lors des déploiements :

### Format des messages
- **Upload de fiche** : `Ajout de la fiche "[Titre du livre]" par [Nom du contributeur]`
- **Test de déploiement** : `Test de déploiement depuis l'interface d'administration`

### Avantages
- **Traçabilité** : Historique clair des modifications dans Netlify
- **Identification** : Savoir qui a ajouté quelle fiche
- **Debugging** : Facilite le diagnostic en cas de problème

Ces messages apparaissent dans :
- L'historique des déploiements Netlify
- Les logs de build
- Les notifications Netlify (si configurées)

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

## 🔐 Authentication

### Overview
The application uses Auth0 for user authentication. This feature allows users to:
- Log in to access the reading sheet creation functionality
- View and modify their profile information
- Log out securely

### Features
- **Login**: Users can log in using Auth0's authentication system
- **Profile Management**: Access to profile information through a dropdown menu
- **Logout**: Secure logout functionality
- **Access Control**: Only authenticated users can create reading sheets

### Implementation Steps
1. **Auth0 Setup**
   - Create an Auth0 application
   - Configure allowed callback URLs
   - Set up application credentials

2. **Frontend Integration**
   - Add Auth0 SDK to the project
   - Implement login/logout functionality
   - Create user profile dropdown menu
   - Add authentication state management

3. **Backend Integration**
   - Set up Auth0 middleware
   - Implement protected routes
   - Add user session management

4. **Environment Configuration**
   Add the following variables to your `.env` file:
   ```
   AUTH0_SECRET='use [openssl rand -hex 32] to generate a 32 bytes value'
   AUTH0_BASE_URL='http://localhost:4321'
   AUTH0_ISSUER_BASE_URL='https://YOUR_AUTH0_DOMAIN'
   AUTH0_CLIENT_ID='YOUR_AUTH0_CLIENT_ID'
   AUTH0_CLIENT_SECRET='YOUR_AUTH0_CLIENT_SECRET'
   ```

5. **UI Components**
   - Add login button for unauthenticated users
   - Create user avatar dropdown menu
   - Implement profile management interface

### Security Considerations
- All authentication is handled through Auth0's secure infrastructure
- No local user management or registration
- Session management is handled by Auth0
- Protected routes ensure only authenticated users can create content