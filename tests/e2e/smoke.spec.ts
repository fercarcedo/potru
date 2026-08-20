/**
 * End-to-end smoke tests against the real production build (see
 * playwright.config.ts: baseURL/webServer run `npm run preview`, not `dev`),
 * so these exercise the same static output GitHub Pages actually serves —
 * base path, asset URLs, lazy chunks and all. Headless Chrome is the tool
 * CLAUDE.md already asks for when verifying UI changes; this formalises it.
 */
import { expect, test, type Page } from '@playwright/test';

test('home page has no console errors and renders the map', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('./');
  await page.waitForSelector('#astMap text.lbl-node');

  const dotCount = await page.locator('#astMap circle[fill]').count();
  expect(dotCount).toBeGreaterThanOrEqual(20);
  expect(errors).toEqual([]);
});

test('progressive enhancement: node cards are real anchors to /nodos/<id> without JS', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('./');
  const card = page.locator('a.ncard[data-node]').first();
  const id = await card.getAttribute('data-node');
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/potru/nodos/${id}/?$`));
  await context.close();
});

test('progressive enhancement: with JS, the same click opens the modal and updates the URL to the node permalink', async ({
  page,
}) => {
  await page.goto('./');
  const card = page.locator('a.ncard[data-node]').first();
  const id = await card.getAttribute('data-node');
  await card.click();
  await expect(page.locator('#modalBg')).toHaveClass(/open/);
  await expect(page).toHaveURL(new RegExp(`/potru/nodos/${id}/?$`));
});

test("reloading while a node modal is open lands on that node's standalone page", async ({
  page,
}) => {
  await page.goto('./');
  await page.locator('a.ncard[data-node="muros"]').click();
  await expect(page.locator('#modalBg')).toHaveClass(/open/);
  await expect(page).toHaveURL(/\/potru\/nodos\/muros\/?$/);

  await page.reload();
  await expect(page.getByRole('cell', { name: 'MUR/1D', exact: true })).toBeVisible();
});

test('closing the modal restores the home URL, and back/forward reopen it in place', async ({
  page,
}) => {
  await page.goto('./');
  const homeUrl = page.url();
  const card = page.locator('a.ncard[data-node]').first();
  const id = await card.getAttribute('data-node');

  await card.click();
  await expect(page.locator('#modalBg')).toHaveClass(/open/);
  await page.locator('#mClose').click();
  await expect(page.locator('#modalBg')).not.toHaveClass(/open/);
  await expect(page).toHaveURL(homeUrl);

  await page.goBack();
  await expect(page.locator('#modalBg')).toHaveClass(/open/);
  await expect(page).toHaveURL(new RegExp(`/potru/nodos/${id}/?$`));

  await page.goForward();
  await expect(page.locator('#modalBg')).not.toHaveClass(/open/);
  await expect(page).toHaveURL(homeUrl);
});

/**
 * The record slides in on a `pop` keyframe animation, so `.open` appearing
 * does not mean it has come to rest: measuring straight away caught the
 * modal mid-translateY and read y = 0.9 instead of 0. Anything checking
 * where the record sits has to wait for that animation to settle first.
 */
async function settled(page: Page, selector: string) {
  const el = page.locator(selector);
  await expect(el).toBeVisible();
  await el.evaluate((node) => Promise.all(node.getAnimations().map((a) => a.finished)));
  return (await el.boundingBox())!;
}

test.describe('narrow viewports', () => {
  // The suite otherwise runs Desktop Chrome only, so the phone-width rules in
  // styles/node-modal.css had no coverage at all.
  test.use({ viewport: { width: 390, height: 844 } });

  test('the node record fills the viewport edge-to-edge instead of floating as a dialog', async ({
    page,
  }) => {
    await page.goto('./');
    await page.locator('a.ncard[data-node="muros"]').click();
    await expect(page.locator('#modalBg')).toHaveClass(/open/);

    const box = await settled(page, '#modalBg .modal');
    expect(box.x).toBe(0);
    expect(box.y).toBe(0);
    expect(box.width).toBe(390);
  });

  test('the gallery tabs stay inside the plan image', async ({ page }) => {
    await page.goto('./');
    await page.locator('a.ncard[data-node="muros"]').click();
    await expect(page.locator('#modalBg')).toHaveClass(/open/);

    await settled(page, '#modalBg .modal');
    const img = (await page.locator('#modalBg .mimg').boundingBox())!;
    const tabs = (await page.locator('#modalBg .gal-tabs').boundingBox())!;
    expect(tabs.y).toBeGreaterThanOrEqual(img.y);
    expect(tabs.y + tabs.height).toBeLessThanOrEqual(img.y + img.height);
  });
});

test('clicking a gantt bar opens the same node modal', async ({ page }) => {
  await page.goto('./');
  const bar = page.locator('#gantt g[data-node]').first();
  const id = await bar.getAttribute('data-node');
  await bar.click();
  await expect(page.locator('#modalBg')).toHaveClass(/open/);
  await expect(page.locator('#mTitle')).not.toBeEmpty();
  void id;
});

test('the guided tour walks all 9 stops and back', async ({ page }) => {
  await page.goto('./');
  await page.locator('#tourStart').click();
  await expect(page.locator('#tourPanel')).toHaveClass(/open/);
  await expect(page.locator('#tpStep')).toContainText('parada 1 de 9');

  for (let stop = 2; stop <= 9; stop++) {
    await page.locator('#tpNext').click();
    await expect(page.locator('#tpStep')).toContainText(`parada ${stop} de 9`);
  }
  // "Siguiente" becomes "Terminar ✓" on the last stop and exits the tour
  await page.locator('#tpNext').click();
  await expect(page.locator('#tourPanel')).not.toHaveClass(/open/);
});

test('the three.js viewer chunk loads only after "Recorrer el interior en 3D" is pressed', async ({
  page,
}) => {
  // the built chunk is named after its source module (viewer3d.<hash>.js),
  // not after the "three" package it bundles. Only the .js chunk is the
  // heavy payload under test — Viewer3D.astro's own stylesheet is cheap and
  // loads eagerly like any other component CSS, which is fine.
  const threeRequests: string[] = [];
  page.on('request', (req) => {
    if (/viewer3d.*\.js$/i.test(req.url())) threeRequests.push(req.url());
  });

  await page.goto('./nodos/muros/');
  await page.waitForLoadState('networkidle');
  expect(threeRequests, 'three.js must not load before the button is pressed').toEqual([]);

  await page.getByRole('button', { name: /Recorrer el interior en 3D/ }).click();
  await expect(page.locator('#svBg')).toHaveClass(/open/, { timeout: 10_000 });
  await page.waitForTimeout(500); // let the dynamic import's network request land
  expect(threeRequests.length).toBeGreaterThan(0);
});

test('a node record page renders its gallery and OLT table', async ({ page }) => {
  await page.goto('./nodos/muros/');
  await expect(page.locator('img').first()).toBeVisible();
  await expect(page.getByRole('cell', { name: 'MUR/1D', exact: true })).toBeVisible();
});

test('an OLT the pliego contradicts itself about is flagged on the page, not in a tooltip', async ({
  page,
}) => {
  /* Muros' MUR/1D is one of three such OLTs in the data. The figures are
     transcribed exactly and annotated — the annotation used to sit in a title
     attribute, which no touch device can reach. */
  await page.goto('./nodos/muros/');
  await expect(page.locator('.olt-table td.warn')).toBeVisible();
  await expect(page.locator('.olt-table tr.olt-notes')).toBeVisible();
  await expect(page.locator('.olt-table tr.olt-notes')).toContainText('MUR/1D');
  await expect(page.locator('.olt-table [title]')).toHaveCount(0);
});

test('the modal and the static node page render the same OLT and shared-PON data', async ({
  page,
}) => {
  // llanes has ponGroups (a shared-PON-tree detail block) and 2 OLTs — the
  // richest node record, and the one most likely to show divergence between
  // NodeDetail.astro and modal.ts now that both call lib/node-render.ts.
  await page.goto('./nodos/llanes/');
  const staticOlt = (await page.locator('.olt-table').innerText()).trim();
  const staticPon = (await page.locator('.pon-group').first().innerText()).trim();

  await page.goto('./');
  await page.locator('a.ncard[data-node="llanes"]').click();
  await expect(page.locator('#modalBg')).toHaveClass(/open/);
  const modalOlt = (await page.locator('#mOlt').innerText()).trim();
  const modalPon = (await page.locator('#mPobl .pon-group').first().innerText()).trim();

  expect(modalOlt).toBe(staticOlt);
  expect(modalPon).toBe(staticPon);
});

test('every internal link and asset on the home page stays under the /potru/ base path', async ({
  page,
}) => {
  await page.goto('./');
  const offenders = await page.evaluate(() => {
    const bad: string[] = [];
    for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href^="/"]')) {
      if (!a.getAttribute('href')!.startsWith('/potru/')) bad.push(a.getAttribute('href')!);
    }
    for (const el of document.querySelectorAll<HTMLImageElement | HTMLScriptElement>(
      'img[src^="/"], script[src^="/"]',
    )) {
      const src = el.getAttribute('src')!;
      if (!src.startsWith('/potru/')) bad.push(src);
    }
    return bad;
  });
  expect(offenders).toEqual([]);
});

test.describe('plans open full size', () => {
  // The plans are 1891 x 1310 drawings shown at ~330 px in the record, so the
  // dimension chains they exist for are only readable full size.

  test('a plan on the node page opens the lightbox, and Escape closes it', async ({ page }) => {
    await page.goto('./nodos/muros/');
    await page.locator('.detail-gallery .plan-link').first().click();

    const lb = page.locator('#lbBg');
    await expect(lb).toHaveClass(/open/);
    await expect(page.locator('#lbCap')).toContainText('Muros de Nalón');

    // click the plan to swap from fit-to-screen to the image's own pixels
    await page.locator('#lbImg').click();
    await expect(page.locator('#lbFig')).toHaveClass(/zoomed/);

    await page.keyboard.press('Escape');
    await expect(lb).not.toHaveClass(/open/);
  });

  test('closing a plan opened over the record leaves the record open', async ({ page }) => {
    await page.goto('./');
    await page.locator('a.ncard[data-node="muros"]').click();
    await expect(page.locator('#modalBg')).toHaveClass(/open/);

    await page.locator('#mImgLink').click();
    await expect(page.locator('#lbBg')).toHaveClass(/open/);

    // Escape belongs to the topmost overlay: the record must survive it, and
    // the page behind must stay locked
    await page.keyboard.press('Escape');
    await expect(page.locator('#lbBg')).not.toHaveClass(/open/);
    await expect(page.locator('#modalBg')).toHaveClass(/open/);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  });

  test('every plan stays a real link to its image, so it works without JS', async ({ page }) => {
    await page.goto('./nodos/muros/');
    const hrefs = await page
      .locator('.plan-link')
      .evaluateAll((links) =>
        links.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? ''),
      );
    expect(hrefs.length).toBeGreaterThan(1);
    for (const href of hrefs) expect(href).toMatch(/^\/potru\/planos\/.+\.jpg$/);
  });
});

test.describe("stepping through a node's plans", () => {
  test('arrows and the thumbnail strip move between the plans of a node', async ({ page }) => {
    await page.goto('./nodos/tineo/');
    await page.locator('.node-hero .plan-link').click();
    await expect(page.locator('#lbBg')).toHaveClass(/open/);
    await expect(page.locator('#lbCount')).toHaveText('1 / 5');
    await expect(page.locator('#lbThumbs button')).toHaveCount(5);

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#lbCount')).toHaveText('2 / 5');
    await page.locator('#lbNext').click();
    await expect(page.locator('#lbCount')).toHaveText('3 / 5');
    // and it wraps, rather than dead-ending
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#lbCount')).toHaveText('5 / 5');

    await page.locator('#lbThumbs button').nth(1).click();
    await expect(page.locator('#lbCount')).toHaveText('2 / 5');
    await expect(page.locator('#lbThumbs button').nth(1)).toHaveClass(/on/);
  });

  test('the strip steps aside once a plan is zoomed to its own pixels', async ({ page }) => {
    await page.goto('./nodos/tineo/');
    await page.locator('.node-hero .plan-link').click();
    await expect(page.locator('#lbThumbs')).toBeVisible();

    await page.locator('#lbImg').click();
    await expect(page.locator('#lbBg')).toHaveClass(/reading/);
    await expect(page.locator('#lbThumbs')).not.toBeVisible();

    // stepping to another plan starts it fit to the screen again
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#lbBg')).not.toHaveClass(/reading/);
    await expect(page.locator('#lbThumbs')).toBeVisible();
  });

  test('the record opens the lightbox on its own tab, and follows it back', async ({ page }) => {
    await page.goto('./');
    await page.locator('a.ncard[data-node="tineo"]').click();
    // switch the record to its third plan first
    await page.locator('#mTabs button').nth(2).click();
    await page.locator('#mImgLink').click();
    await expect(page.locator('#lbCount')).toHaveText('3 / 5');

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');
    await expect(page.locator('#modalBg')).toHaveClass(/open/);
    // the record is left on the plan the lightbox ended on
    await expect(page.locator('#mTabs button.on')).toHaveText('Alzado derecho');
  });
});

test('stepping between plans is announced, since the set wraps with no end state', async ({
  page,
}) => {
  await page.goto('./nodos/tineo/');
  await page.locator('.node-hero .plan-link').click();
  const said = page.locator('#lbSaid');
  await expect(said).toHaveText(/Ubicación · Tineo, 1 de 5/i);
  await page.keyboard.press('ArrowLeft'); // wraps to the last
  await expect(said).toHaveText(/, 5 de 5$/);
  // and the visible caption is not doubled up with the counter beside it
  await expect(page.locator('#lbCap')).not.toContainText('de 5');
});

test.describe('colour theme', () => {
  test('the toggle only appears once its script has run', async ({ page }) => {
    /* it is hidden in the markup on purpose: pressing it without JS does
       nothing, and a dead control is worse than no control */
    await page.goto('./');
    const btn = page.locator('#themeToggle');
    await expect(btn).toBeVisible();
    await expect(btn).toHaveText(/Ver en (claro|oscuro)/);
  });

  test('the visitor with no stored choice follows the system', async ({ browser }) => {
    for (const [scheme, expected] of [
      ['dark', 'rgb(13, 21, 32)'],
      ['light', 'rgb(237, 241, 245)'],
    ] as const) {
      const ctx = await browser.newContext({ colorScheme: scheme });
      const page = await ctx.newPage();
      await page.goto('./');
      /* no stamp at all: prefers-color-scheme is doing the work */
      await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/);
      await expect(page.locator('body')).toHaveCSS('background-color', expected);
      await ctx.close();
    }
  });

  test('a chosen theme beats the system and survives a click through to a node', async ({
    browser,
  }) => {
    /* the whole reason the choice is stored at all: /nodos/<id> is a separate
       document, so anything held only in memory is gone by the time it loads */
    const ctx = await browser.newContext({ colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto('./');
    await page.locator('#themeToggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.goto('./nodos/blimea/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(237, 241, 245)');
    await ctx.close();
  });

  test('the stamp is applied before the first paint, so there is no flash', async ({ browser }) => {
    /* an inline <script> in <head> does this; a module script is deferred and
       would paint the system theme first, then snap */
    const ctx = await browser.newContext({ colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto('./');
    await page.evaluate(() => localStorage.setItem('potru:theme', 'light'));

    /* stop as soon as the document exists, well before load: the attribute
       must already be there */
    await page.goto('./nodos/blimea/', { waitUntil: 'commit' });
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
    await ctx.close();
  });
});
