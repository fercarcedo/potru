// @ts-check
import { defineConfig } from 'astro/config';

// Cloudflare Workers static assets, served from the domain root: https://potru.app/
// Every internal link or asset must go through import.meta.env.BASE_URL.
export default defineConfig({
  site: 'https://potru.app',
  base: '/',
  trailingSlash: 'ignore',
  // Spanish is the pliego's own language and stays unprefixed at the domain
  // root; English is the only other rendering, under /en/. prefixDefaultLocale
  // stays false so no existing /nodos/<id> URL moves.
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  build: {
    // The plans live in public/ and are served as-is; every other asset
    // (fonts, JS chunks) is grouped under _astro/.
    assets: '_astro',
  },
  vite: {
    build: {
      // The 3D viewer is the only heavy chunk, and it loads on demand.
      chunkSizeWarningLimit: 900,
    },
  },
});
