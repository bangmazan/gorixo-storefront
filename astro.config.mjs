// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },

  adapter: cloudflare({
    // Muat binding dari wrangler.toml (D1, vars) saat `astro dev` via miniflare.
    platformProxy: { enabled: true }
  })
});