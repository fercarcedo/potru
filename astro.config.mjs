// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages project site: https://fercarcedo.github.io/potru/
// Every internal link or asset must go through import.meta.env.BASE_URL.
export default defineConfig({
  site: 'https://fercarcedo.github.io',
  base: '/potru/',
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
