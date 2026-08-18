/**
 * CLAUDE.md: "No localStorage / sessionStorage anywhere." A grep-level
 * regression guard — cheaper and just as effective as scanning dist/ output,
 * and doesn't depend on a build having already run.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '../../src');

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...collectFiles(p));
    else if (/\.(ts|astro|js)$/.test(entry)) out.push(p);
  }
  return out;
}

describe('no localStorage / sessionStorage', () => {
  it('never references either Storage API anywhere under src/', () => {
    const offenders = collectFiles(SRC)
      .map((f) => ({ f, text: readFileSync(f, 'utf8') }))
      .filter(({ text }) => /\blocalStorage\b|\bsessionStorage\b/.test(text))
      .map(({ f }) => f);
    expect(offenders).toEqual([]);
  });
});
