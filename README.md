# Astro & Fiches de lecture

Le but de ce projet est de pouvoir mettre à disposition des fiches de lectures et d’optimiser leur accessibilité. 

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