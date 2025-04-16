// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import icon from 'astro-icon';
import react from '@astrojs/react';
import path from "path";

// https://astro.build/config
export default defineConfig({
  integrations: [
    mdx(), 
    icon(), 
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