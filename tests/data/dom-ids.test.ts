/**
 * src/lib/dom-ids.ts exists so a DOM id rename is one edit instead of a grep
 * across a component and an island that happen to agree by coincidence. It
 * only covers half the contract, though: TypeScript sees DOM.astMap, but
 * `#astMap { … }` in src/styles/map.css — and `#heroFiber { … }` in
 * Hero.astro's own scoped <style> — are plain strings CSS can't import. A
 * rename type-checks clean and silently unstyles the element.
 *
 * This closes that half: every id selector written anywhere in the site's
 * CSS has to name an id DOM actually declares.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DOM } from '../../src/lib/dom-ids';

const SRC = join(__dirname, '../../src');

function collectFiles(dir: string, re: RegExp): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...collectFiles(p, re));
    else if (re.test(entry)) out.push(p);
  }
  return out;
}

/** Everything between <style> and </style> in an .astro component. */
function styleBlocks(source: string): string {
  return [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
}

/**
 * Id selectors only. Declaration blocks are stripped innermost-first — which
 * keeps the selectors inside @media while dropping every `color: #41e3d2`,
 * the only other place a `#` shows up in this codebase.
 */
function idSelectors(css: string): string[] {
  let text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (let prev = ''; prev !== text;) {
    prev = text;
    text = text.replace(/\{[^{}]*\}/g, ' ');
  }
  return [...text.matchAll(/#([A-Za-z_][\w-]*)/g)].map((m) => m[1]!);
}

describe('CSS id selectors match src/lib/dom-ids.ts', () => {
  const known = new Set<string>(Object.values(DOM));
  const sources: { file: string; css: string }[] = [
    ...collectFiles(join(SRC, 'styles'), /\.css$/).map((f) => ({
      file: f,
      css: readFileSync(f, 'utf8'),
    })),
    ...collectFiles(SRC, /\.astro$/).map((f) => ({
      file: f,
      css: styleBlocks(readFileSync(f, 'utf8')),
    })),
  ];

  for (const { file, css } of sources) {
    const ids = [...new Set(idSelectors(css))];
    if (!ids.length) continue;
    it(`${file.slice(SRC.length + 1)} only targets ids DOM declares`, () => {
      for (const id of ids) {
        expect(known.has(id), `#${id} is styled here but is not in dom-ids.ts`).toBe(true);
      }
    });
  }

  it('found id selectors to check at all (the scanner still works)', () => {
    const all = sources.flatMap(({ css }) => idSelectors(css));
    expect(all.length).toBeGreaterThan(0);
  });
});
