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
   - [ ] Créer un dossier dédié pour les fiches
   - [ ] Configurer les permissions appropriées
   - [ ] Mettre en place un utilisateur SFTP dédié

2. API d'upload :
   - [ ] Créer une route API sécurisée
   - [ ] Implémenter l'authentification
   - [ ] Configurer l'upload SFTP
   - [ ] Mettre en place la validation des fichiers

3. Intégration Netlify :
   - [ ] Configurer le webhook de reconstruction
   - [ ] Tester le processus complet

**To-Do List:**
- [ ] Configuration initiale du serveur OVH
- [ ] Création de l'API d'upload
- [ ] Mise en place de l'authentification
- [ ] Tests d'intégration

### App Toolbar
**Branch:** `feat/app-toolbar`

**Summary:**
We are creating a new App Toolbar that will:
- Be positioned at the top of the app
- Not be visible on print
- Include accessibility options (font and font-size controls) from the current AccessibilityWidget
- Add a User Avatar placeholder on the right end
- Add the app name as a link to the home page
- Be mobile-friendly and collapse on scroll
- Maintain current accessibility features (font selection, zoom, localStorage persistence)
- Include proper ARIA labels and keyboard navigation

**Implementation Guidance:**
1. Component Structure:
   - Create new AppToolbar.astro component
   - Move accessibility features from Widget.astro
   - Add app name/logo section
   - Add user avatar section

2. Accessibility Features Migration:
   - Move font selection functionality
   - Move zoom controls
   - Maintain localStorage persistence
   - Add reset functionality

3. Responsive Design:
   - Implement mobile-friendly layout
   - Add scroll-based collapse behavior
   - Ensure proper spacing and alignment

4. User Interface:
   - Add app name/logo with home link
   - Add placeholder user avatar
   - Style all elements consistently

5. Accessibility:
   - Add proper ARIA labels
   - Ensure keyboard navigation
   - Maintain screen reader compatibility

**To-Do List:**
- [x] Create new AppToolbar.astro component
- [x] Move accessibility features from Widget.astro
- [x] Implement responsive design with mobile support
- [x] Add app name/logo with home link
- [x] Implement proper ARIA labels and keyboard navigation

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
Copy / Paste the .env.example and rename it .env
Fill the key with your own Github information
Use a fine grain token with these permissions : 
- Read access to metadata
- Read and write access to code and pull request
See [the documentation](https://docs.github.com/fr/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens) for more information

## This branch
- [x] Authentify with Octokit
- [x] Commit a file on github
- [x] Filter files on *.md and *.mdx files only
- [ ] Validate file

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                  | Action                                                                           |
|:-------------------------|:---------------------------------------------------------------------------------|
| `yarn install`           | Installs dependencies                                                            |
| `yarn dev:astro`         | Starts local dev server at `localhost:4321`                                      |
| `yarn dev`               | Copy pagefind index into /public and starts local dev server at `localhost:4321` |
| `yarn copy:pagefind:dev` | Copy pagefind index into /public                                                 |
| `yarn build:astro`       | Build your production site to `./dist/`                                          |
| `yarn build:pagefind`    | Build the pagefind index                                                         |
| `yarn build`             | Build the pagefind index and your production site to `./dist/`                   |
| `yarn preview`           | Preview your build locally, before deploying                                     |
| `yarn astro ...`         | Run CLI commands like `astro add`, `astro check`                                 |
| `yarn astro -- --help`   | Get help using the Astro CLI                                                     |

[![Netlify Status](https://api.netlify.com/api/v1/badges/34286945-ff9a-4d18-9c66-0042e5269beb/deploy-status)](https://app.netlify.com/sites/astro-prisma-102442/deploys)