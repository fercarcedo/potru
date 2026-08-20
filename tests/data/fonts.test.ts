/**
 * The three faces, and the two things about them that regress silently.
 *
 * A font is the one asset where a one-word edit quadruples the page weight
 * and nothing looks wrong: swapping `@fontsource/newsreader/latin-400.css`
 * for `@fontsource/newsreader` pulls nine subsets instead of one, and
 * swapping the static cut for the variable one costs 107 KB for an optical
 * axis this design never varies. Both render identically in review.
 *
 * The other half is the opposite failure: a `font-family` naming a face that
 * nothing imports. That one does not throw either — the browser just falls
 * back to Georgia or to system-ui and the page quietly loses its typography.
 *
 * See src/styles/fonts.css for why each cut was chosen, with the measured
 * sizes.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectSourceFiles } from './helpers/source-files';

const ROOT = join(__dirname, '../..');
const FONTS = readFileSync(join(ROOT, 'src/styles/fonts.css'), 'utf8');
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>;
};

/** The contract: the only faces the site may name, and where each comes from. */
const FACES = [
  { family: 'Bricolage Grotesque Variable', pkg: '@fontsource-variable/bricolage-grotesque' },
  { family: 'Newsreader', pkg: '@fontsource/newsreader' },
  { family: 'IBM Plex Mono', pkg: '@fontsource/ibm-plex-mono' },
] as const;

/** Fallbacks are allowed to appear unquoted or as well-known system faces. */
const FALLBACKS = new Set(['Georgia', 'Archivo']);

describe('web fonts', () => {
  it('imports exactly the three faces the design uses', () => {
    const imported = [...FONTS.matchAll(/@import '(@fontsource[^/']*\/[^/']+)/g)].map((m) => m[1]!);
    expect([...new Set(imported)].sort()).toEqual(FACES.map((f) => f.pkg).sort());
  });

  it('depends on each of them in package.json', () => {
    for (const { pkg } of FACES) {
      expect(PKG.dependencies[pkg], `${pkg} is imported but not a dependency`).toBeTruthy();
    }
  });

  it('pulls latin only, so eight unused subsets stay out of dist/', () => {
    /* the variable cut has no per-subset entrypoint; every static one does,
       and unicode-range means the browser was already skipping the rest —
       this is about what gets deployed */
    const statics = [...FONTS.matchAll(/@import '@fontsource\/([^/']+)\/([^']+)\.css'/g)];
    expect(statics.length).toBeGreaterThan(0);
    const notLatin = statics.filter(([, , file]) => !file!.startsWith('latin-'));
    expect(notLatin.map(([, p, f]) => `${p}/${f}`)).toEqual([]);
  });

  it('takes Newsreader static, not variable: the opsz axis costs 107 KB unused', () => {
    expect(FONTS).not.toContain('@fontsource-variable/newsreader');
    expect(PKG.dependencies['@fontsource-variable/newsreader']).toBeUndefined();
  });

  it('names no font-family the site does not load', () => {
    const known = new Set<string>([...FACES.map((f) => f.family), ...FALLBACKS]);
    const unknown = new Set<string>();
    for (const { text } of collectSourceFiles(join(ROOT, 'src'), /\.(css|astro|ts)$/)) {
      for (const decl of text.matchAll(/font-family:\s*([^;}"]+)/g)) {
        for (const q of decl[1]!.matchAll(/'([^']+)'/g)) {
          if (!known.has(q[1]!)) unknown.add(q[1]!);
        }
      }
    }
    expect([...unknown]).toEqual([]);
  });
});
