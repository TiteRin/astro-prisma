# Astro - Prisma
## 📚 À propos

Cette application est destinée au pôle recherche de l’association Prisma (Lille), et est un **work in progress**.
L’objectif est de proposer l’ensemble des fiches de lectures du Pôle Recherche et Pédagogique, en mettant l’accent sur l’**accessibilité visuelle**.  
L’objectif secondaire est de conserver la main sur les données saisies et de ne pas passer par un service tiers comme Google Drive ou Amazon pour stocker les données. 

## Fonctionnalités principales
### Gestion des fiches de lecture
- Upload de fiches de lectures écrites au format Markdown
- Stockage sur un VPS
- Organisation par tags et catégories
- Recherche avancée

### Accessibilité
- Thème clair/sombre avec mode de constraste élevé
- Sélection de polices adaptées
- Contrôle du zoom
- Export PDF
 
## Prochaines étapes
- Ajouter un système d’authentification / gestion de droits pour sécuriser l’accès
- Ajouter un formulaire de saisie pour la création/modification des fiches de lectures

## Stack
- [Astro](https://astro.build/) : il y a peu d’interaction à prévoir sur le site, donc un site statique semblait approprié. Lorsqu’une fiche est ajoutée, modifiée ou supprimée, le site est reconstruit
- [Tailwind](https://tailwindcss.com/) et [DaisyUI]([https://astro.build/](https://daisyui.com/)) : Tailwind permet d’avoir facilement accès à de nombreuses classes utilitaires mais j’apprécie la surcouche DaisyUI qui aide à éviter d’avoir un HTML avec trop de classes
- Pas de base de données - pour le moment
