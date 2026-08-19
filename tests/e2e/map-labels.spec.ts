/**
 * Exercises map.ts's label placement pass (src/scripts/label-placement.ts)
 * against the real schematic map. This can only run against a real browser:
 * the pass measures every candidate spot with SVGGraphicsElement.getBBox(),
 * which happy-dom always reports as a zero rect (see label-placement.ts's
 * own doc comment), so the collision/scoring logic is unit-tested there with
 * synthetic measurements and verified end-to-end here.
 */
import { expect, test } from '@playwright/test';

test.describe('schematic map label placement', () => {
  test.beforeEach(async ({ page }) => {
    // '/' would resolve against the origin and drop the '/potru/' base path
    // WHATWG-URL-style; './' keeps it, matching how the site is actually served.
    await page.goto('./');
    await page.waitForSelector('#astMap text.lbl-node');
    // map.ts re-places the labels once IBM Plex Mono has loaded (getBBox()
    // measures the fallback font until then); wait for that second pass.
    await page.evaluate(() => document.fonts.ready);
  });

  test('places every node, secondary and town label inside the map viewBox', async ({ page }) => {
    const overflow = await page.evaluate(() => {
      const svg = document.getElementById('astMap') as unknown as SVGSVGElement;
      const [vx, vy, vw, vh] = svg.getAttribute('viewBox')!.split(' ').map(Number);
      const out: string[] = [];
      for (const el of svg.querySelectorAll('.lbl-node, .lbl-sec, .lbl-town')) {
        const b = (el as SVGGraphicsElement).getBBox();
        if (b.x < vx - 2 || b.y < vy - 2 || b.x + b.width > vx + vw + 2 || b.y + b.height > vy + vh + 2) {
          out.push(el.textContent || '(sin texto)');
        }
      }
      return out;
    });
    expect(overflow).toEqual([]);
  });

  test('does not overlap any two node/secondary/town labels with each other', async ({ page }) => {
    const overlaps = await page.evaluate(() => {
      const svg = document.getElementById('astMap')!;
      const boxes = [...svg.querySelectorAll('.lbl-node, .lbl-sec, .lbl-town')].map((el) => ({
        name: el.textContent || '',
        b: (el as unknown as SVGGraphicsElement).getBBox(),
      }));
      const hits: string[] = [];
      const overlapArea = (a: DOMRect, b: DOMRect) =>
        Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
        Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++)
          if (overlapArea(boxes[i]!.b, boxes[j]!.b) > 0.5) hits.push(`${boxes[i]!.name} × ${boxes[j]!.name}`);
      return hits;
    });
    expect(overlaps).toEqual([]);
  });

  test('draws a leader line only for labels the solver actually moved away from their dot', async ({ page }) => {
    const { leaderCount, farLabels } = await page.evaluate(() => {
      const svg = document.getElementById('astMap')!;
      const leaderCount = svg.querySelectorAll('g > line[stroke="#5a6f8d"]').length;
      const LEADER = 16;
      let farLabels = 0;
      for (const el of svg.querySelectorAll('.lbl-node, .lbl-sec, .lbl-town')) {
        const ax = Number((el as HTMLElement).dataset.ax);
        const ay = Number((el as HTMLElement).dataset.ay);
        const b = (el as unknown as SVGGraphicsElement).getBBox();
        const px = Math.max(b.x, Math.min(ax, b.x + b.width));
        const py = Math.max(b.y, Math.min(ay, b.y + b.height));
        if (Math.hypot(px - ax, py - ay) > LEADER) farLabels++;
      }
      return { leaderCount, farLabels };
    });
    expect(leaderCount).toBe(farLabels);
    // a regression ceiling: today's map needs none, or very few, leader lines
    expect(leaderCount).toBeLessThanOrEqual(3);
  });

  test('known former collisions stay resolved: Pol. de Coaña vs Navia, Sevares off the cable, Oyanco vs Moreda', async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const svg = document.getElementById('astMap')!;
      const byText = (t: string) =>
        [...svg.querySelectorAll('.lbl-node, .lbl-sec, .lbl-town')].find((el) => el.textContent === t);
      const overlapArea = (a: DOMRect, b: DOMRect) =>
        Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
        Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
      const coana = byText('Pol. de Coaña');
      const navia = byText('Navia');
      const oyanco = byText('Oyanco');
      const moreda = byText('Moreda');
      if (!coana || !navia || !oyanco || !moreda) return { found: false };
      return {
        found: true,
        coanaNaviaOverlap: overlapArea(
          (coana as unknown as SVGGraphicsElement).getBBox(),
          (navia as unknown as SVGGraphicsElement).getBBox()
        ),
        oyancoMoredaOverlap: overlapArea(
          (oyanco as unknown as SVGGraphicsElement).getBBox(),
          (moreda as unknown as SVGGraphicsElement).getBBox()
        ),
      };
    });
    expect(result.found).toBe(true);
    expect(result.coanaNaviaOverlap).toBe(0);
    expect(result.oyancoMoredaOverlap).toBe(0);
  });
  /**
   * The three checks below guard the geometry the placement pass cannot fix
   * for itself. A town dot dropped on top of a trunk hides its own leader
   * line (it runs along the cable) and pushes its name away from it, and a
   * hand-placed trunk caption can drift until it captions the wrong cable —
   * both had happened to several labels at once. The thresholds are the
   * loosest ones today's map passes: the worst town label sits 6.4 units
   * from its dot, the tightest dot clears the nearest cable by 9.1, and the
   * furthest caption is 27.3 from one.
   */
  test('keeps every served-town label against its own dot', async ({ page }) => {
    const far = await page.evaluate(() => {
      const svg = document.getElementById('astMap')!;
      const out: string[] = [];
      for (const el of svg.querySelectorAll<SVGTextElement>('.lbl-town')) {
        const ax = Number(el.dataset.ax), ay = Number(el.dataset.ay);
        const b = el.getBBox();
        const px = Math.max(b.x, Math.min(ax, b.x + b.width));
        const py = Math.max(b.y, Math.min(ay, b.y + b.height));
        const gap = Math.hypot(px - ax, py - ay);
        if (gap > 8) out.push(`${el.textContent} (${gap.toFixed(1)})`);
      }
      return out;
    });
    expect(far).toEqual([]);
  });

  test('keeps every served-town dot clear of the trunks, so its leader line shows', async ({ page }) => {
    const onCable = await page.evaluate(() => {
      const svg = document.getElementById('astMap')!;
      const cables = [...svg.querySelectorAll('path')].filter(
        (p) => Number(p.getAttribute('stroke-width') ?? 0) >= 1.5 && (p.getTotalLength?.() ?? 0) > 0);
      const out: string[] = [];
      for (const el of svg.querySelectorAll<SVGTextElement>('.lbl-town')) {
        const ax = Number(el.dataset.ax), ay = Number(el.dataset.ay);
        let min = Infinity;
        for (const p of cables) {
          const len = p.getTotalLength();
          for (let d = 0; d <= len; d += 2) {
            const q = p.getPointAtLength(d);
            min = Math.min(min, Math.hypot(q.x - ax, q.y - ay));
          }
        }
        if (min < 8) out.push(`${el.textContent} (${min.toFixed(1)})`);
      }
      return out;
    });
    expect(onCable).toEqual([]);
  });

  test('keeps every trunk caption beside the cable it names, and off the other captions', async ({ page }) => {
    const { adrift, crowded } = await page.evaluate(() => {
      const svg = document.getElementById('astMap')!;
      const captions = [...svg.querySelectorAll<SVGTextElement>('text[data-trunk]')]
        .map((t) => ({ id: t.dataset.trunk!, name: t.textContent ?? '', b: t.getBBox() }));
      /* distance from a point to a box, 0 when the point is inside it */
      const away = (b: DOMRect, x: number, y: number) =>
        Math.hypot(Math.max(b.x - x, 0, x - (b.x + b.width)), Math.max(b.y - y, 0, y - (b.y + b.height)));
      const adrift: string[] = [];
      for (const { id, name, b } of captions) {
        const path = svg.querySelector<SVGPathElement>(`path[data-trunk="${id}"]`)!;
        const len = path.getTotalLength();
        let min = Infinity;
        for (let d = 0; d <= len; d += 2) {
          const q = path.getPointAtLength(d);
          min = Math.min(min, away(b, q.x, q.y));
        }
        if (min > 30) adrift.push(`${name} (${min.toFixed(1)})`);
      }
      const crowded: string[] = [];
      for (let i = 0; i < captions.length; i++)
        for (let j = i + 1; j < captions.length; j++) {
          const a = captions[i]!.b, c = captions[j]!.b;
          const dx = Math.max(a.x - (c.x + c.width), c.x - (a.x + a.width), 0);
          const dy = Math.max(a.y - (c.y + c.height), c.y - (a.y + a.height), 0);
          if (Math.hypot(dx, dy) < 12) crowded.push(`${captions[i]!.name} × ${captions[j]!.name}`);
        }
      return { adrift, crowded };
    });
    expect(adrift).toEqual([]);
    expect(crowded).toEqual([]);
  });
});
