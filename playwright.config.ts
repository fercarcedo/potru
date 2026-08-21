import { defineConfig, devices } from '@playwright/test';

// Runs against the real production build (npm run build && npm run preview),
// not the dev server, so it exercises the same static output Cloudflare
// serves — base path, asset URLs and all.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321/',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4321/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // `astro preview` auto-backgrounds itself under an agentic dev tool
    // (Claude Code and friends), which then reads as an early exit to
    // Playwright's webServer launcher. Force normal foreground behaviour.
    env: { ASTRO_PREVIEW_BACKGROUND: '0' },
  },
});
