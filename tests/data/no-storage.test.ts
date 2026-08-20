/**
 * CLAUDE.md: client-side storage is for one thing only, the colour theme.
 *
 * This was a blanket ban on both Storage APIs, and the test was a plain grep.
 * The ban was lifted for exactly one key — `potru:theme`, so the visitor's
 * choice survives a click through to /nodos/<id> — and a grep that allowed
 * `localStorage` anywhere would have stopped guarding anything at all. So it
 * now checks the two things that actually matter: only the files that own the
 * theme may touch storage, and even they may only touch that one key.
 *
 * A grep-level guard, still: cheaper than scanning dist/ and it doesn't
 * depend on a build having run.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '../../src');

/** The only key any of this is allowed to read or write. */
const THEME_KEY = 'potru:theme';

/** The only files allowed to name a Storage API, and why. */
const OWNERS = [
  'scripts/theme.ts', // the toggle, and the one module that persists the choice
  'layouts/Layout.astro', // the pre-paint inline script, which cannot wait for a module
];

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...collectFiles(p));
    else if (/\.(ts|astro|js)$/.test(entry)) out.push(p);
  }
  return out;
}

/** Repo-relative and slash-separated, so the OWNERS list reads the same on any OS. */
const rel = (f: string) => relative(SRC, f).split(sep).join('/');

const FILES = collectFiles(SRC).map((f) => ({ f: rel(f), text: readFileSync(f, 'utf8') }));
const STORAGE = /\blocalStorage\b|\bsessionStorage\b/;

describe('client-side storage is only ever the colour theme', () => {
  it('names a Storage API only in the files that own the theme', () => {
    const offenders = FILES.filter(({ f, text }) => STORAGE.test(text) && !OWNERS.includes(f)).map(
      ({ f }) => f,
    );
    expect(offenders).toEqual([]);
  });

  it('never touches sessionStorage, which nothing here needs', () => {
    const offenders = FILES.filter(({ text }) => /\bsessionStorage\b/.test(text)).map(({ f }) => f);
    expect(offenders).toEqual([]);
  });

  it('reads and writes no key but the theme', () => {
    /*
     * Resolving the argument matters: theme.ts passes its own `KEY` constant
     * rather than repeating the literal at three call sites, which is the
     * right way to write it and would look identical to a smuggled variable
     * if this only matched quotes. So each file's `const NAME = '...'` is
     * collected first and the argument resolved through it; anything that
     * still will not resolve is reported as dynamic, which is the case this
     * is really guarding against.
     */
    const found = new Set<string>();
    for (const { text } of FILES) {
      const consts = new Map<string, string>();
      for (const m of text.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(['"`])([^'"`]*)\2/g)) {
        consts.set(m[1]!, m[3]!);
      }
      for (const m of text.matchAll(/\.(?:get|set|remove)Item\(\s*([^,)]+)/g)) {
        const arg = m[1]!.trim();
        const lit = /^(['"`])([^'"`]*)\1$/.exec(arg);
        if (lit) found.add(lit[2]!);
        else if (consts.has(arg)) found.add(consts.get(arg)!);
        else found.add(`dynamic: ${arg}`);
      }
    }
    expect([...found].sort()).toEqual([THEME_KEY]);
  });
});
