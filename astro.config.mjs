// @ts-check
import { defineConfig } from 'astro/config';

// Cloudflare Workers static assets, served from the domain root: https://potru.app/
// Every internal link or asset must go through import.meta.env.BASE_URL.
export default defineConfig({
  site: 'https://potru.app',
  base: '/',
  trailingSlash: 'ignore',
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
