/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// Reuses the site's own Vite/Astro config. astro.config's base is '/' too,
// so there's no longer a gap between what Vitest's SSR test runner resolves
// import.meta.env.BASE_URL to and what `npm run build` resolves it to — but
// tests that touch asset()/BASE_URL still assert against the runtime value
// rather than hardcoding '/', so a future base-path change wouldn't reopen
// the gap silently.
export default getViteConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/data/**/*.test.ts', 'tests/lib/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'dom',
          environment: 'happy-dom',
          include: ['tests/scripts/**/*.test.ts'],
        },
      },
    ],
  },
});
