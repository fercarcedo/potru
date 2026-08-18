/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// Reuses the site's own Vite/Astro config. Note: under Vitest's SSR test
// runner import.meta.env.BASE_URL always resolves to '/', not astro.config's
// '/potru/' — that's a Vite dev-mode quirk isolated to the test runner and
// does not affect `npm run build`, which resolves it correctly (verified
// separately). Tests that touch asset()/BASE_URL assert against the runtime
// value rather than assuming '/potru/'.
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
