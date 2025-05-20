// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: netlify(),
  integrations: [
    mdx(), 
    react({
      include: ['**/*.tsx', '**/*.jsx']
    })
  ],
  vite: {
    build: {
      rollupOptions: {
        external: '/pagefind/pagefind.js',
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src/'),
      },
    },
  }
});