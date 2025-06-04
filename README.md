# Prisma - Pôle Recherche

## 📚 À propos

Prisma est une application web dédiée à la gestion et au partage de fiches de lecture. Elle permet aux chercheurs et aux étudiants de centraliser, organiser et accéder facilement à leurs notes de lecture.

### Fonctionnalités principales

- **Accessibilité avancée**
  - Thèmes clair/sombre avec mode contraste élevé
  - Sélection de polices adaptées (OpenDyslexic, Open Sans, Inter)
  - Contrôles de zoom
  - Navigation au clavier optimisée

- **Gestion des fiches**
  - Création et édition de fiches de lecture
  - Organisation par tags et catégories
  - Recherche avancée
  - Export PDF optimisé pour l'impression

- **Interface responsive**
  - Design adaptatif pour tous les appareils
  - Mise en page optimisée pour l'impression
  - Navigation intuitive

## 🚧 Feature en cours : Refonte UI avec DaisyUI

### Objectif
Améliorer l'expérience utilisateur et la cohérence visuelle de l'application en intégrant DaisyUI, une bibliothèque de composants pour Tailwind CSS.

### Plan d'implémentation
1. **Phase de configuration**
   - Installation de DaisyUI et dépendances
   - Configuration de Tailwind CSS
   - Personnalisation du thème

2. **Migration des composants**
   - Refonte des composants de mise en page
   - Mise à jour des formulaires
   - Implémentation des nouveaux éléments UI
   - Améliorations responsive

3. **Tests et optimisation**
   - Tests sur différentes tailles d'écran
   - Vérification de l'accessibilité
   - Optimisation des performances
   - Documentation des composants

## 🛠 Installation

### Prérequis
- Node.js (v18 ou supérieur)
- Yarn
- Serveur SFTP pour le stockage des fiches
- Compte Netlify pour le déploiement

### Frameworks et bibliothèques principales
- [Astro](https://astro.build) - Framework web moderne
- [Tailwind CSS](https://tailwindcss.com) - Framework CSS utilitaire
- [DaisyUI](https://daisyui.com) - Composants pour Tailwind CSS
- [PageFind](https://pagefind.app) - Moteur de recherche statique

### Configuration

1. **Cloner le projet**
   ```bash
   git clone [URL_DU_REPO]
   cd astro-prisma
   ```

2. **Installer les dépendances**
   ```bash
   yarn install
   ```

3. **Configuration de l'environnement**
   - Copier `.env.example` en `.env`
   - Remplir les variables d'environnement :
     ```
     # Configuration SFTP
     SFTP_HOST=votre-host.example.com
     SFTP_PORT=22
     SFTP_USERNAME=votre-nom-utilisateur
     SFTP_PASSWORD=votre-mot-de-passe
     # Ou clé SSH (recommandé)
     SFTP_PRIVATE_KEY_PATH=/chemin/vers/votre/cle_privee

     # Environnement et chemin
     ENVIRONMENT=development
     SFTP_BASE_PATH=/prisma

     # Configuration des images
     ALLOWED_IMAGE_DOMAINS=imgur.com,github.com,githubusercontent.com
     BLOCKED_IMAGE_DOMAINS=
     ```

### Commandes principales

| Commande | Description |
|:---------|:------------|
| `yarn dev` | Démarre le serveur de développement sur `localhost:4321` |
| `yarn build` | Construit le site pour la production dans `./dist/` |
| `yarn preview` | Prévisualise la version de production localement |
| `yarn pagefind` | Génère l'index de recherche |
| `yarn copy-pagefind` | Copie l'index pagefind dans `/public` pour les tests locaux |

## 📝 Structure du projet

```
/
├── public/          # Fichiers statiques
├── src/
│   ├── components/  # Composants réutilisables
│   ├── layouts/     # Mises en page
│   ├── pages/       # Pages de l'application
│   └── styles/      # Styles globaux et thèmes
└── package.json
```

## 🔒 Sécurité

- Utilisation des variables d'environnement pour les informations sensibles
- Authentification SFTP par clé SSH recommandée
- Utilisateur SFTP dédié avec permissions limitées
- Validation des domaines d'images autorisés