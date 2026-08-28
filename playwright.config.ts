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
    // Pinned so the suite's default `page` fixture is deterministic: without
    // this, a browser install whose own default locale happens to match
    // /^en/i (Chromium's varies by build/OS) makes Layout.astro's pre-paint
    // script redirect a plain `page.goto('./')` to /en/, which is not what
    // most of this suite is testing. The 'language' describe block in
    // smoke.spec.ts opts individual tests into 'en-US' explicitly instead.
    locale: 'es-ES',
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
