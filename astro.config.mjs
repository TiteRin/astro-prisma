// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import path from "path";

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
        '@': path.resolve('./src/'),
      },
    },
  }
});