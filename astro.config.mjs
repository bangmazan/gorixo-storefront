// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // Eksplisit: build SSR/on-demand agar endpoint API & halaman dinamis
  // ter-generate ke worker (dist/server/entry.mjs), bukan hanya static.
  // Halaman yang ingin tetap statis memakai `export const prerender = true`.
  output: 'server',

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: cloudflare({
    // Muat binding dari wrangler.jsonc (D1, vars) saat `astro dev` via miniflare.
    platformProxy: { enabled: true }
  })
});