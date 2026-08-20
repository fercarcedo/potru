/**
 * The instruments build SVG as strings, so their colours are data in a
 * template rather than rules in a stylesheet — nothing stops a new one being
 * written as a hex, and a hex does not follow the theme. That is exactly how
 * the diagram's element boxes stayed dark after everything around them went
 * light, with dark labels inside them.
 *
 * So: every colour these modules emit is either a CSS custom property, or it
 * is on the list below because it is *data* — a standard's colour, a node's
 * area colour, or a contrast value measured against one of those rather than
 * against the page. The list is the point. Adding to it should feel like a
 * decision, which is the opposite of how a stray #8da0b8 gets in.
 */
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectSourceFiles } from './helpers/source-files';
import { CW8, LCOL, TIA } from '../../src/lib/graphics';
import { ALL_NODES } from '../../src/lib/data';

const SRC = join(__dirname, '../../src');

/** The modules that draw instruments by concatenating SVG. */
const INSTRUMENTS = [
  'lib/graphics.ts',
  'lib/details.ts',
  'scripts/map.ts',
  'scripts/diagram.ts',
  'scripts/hero-fiber.ts',
];

/**
 * Colours these files may still write literally, and why each one is not
 * chrome. Everything else has to be a token.
 */
const DATA_COLOURS = new Map<string, string>([
  ...TIA.map((c) => [c.toLowerCase(), 'TIA-598 fibre colour code'] as const),
  ...Object.values(LCOL).map(([c]) => [c.toLowerCase(), 'CWDM wavelength colour'] as const),
  ...CW8.map((c) => [String(c).toLowerCase(), 'CWDM channel colour'] as const),
  ...ALL_NODES.map((n) => [n.color.toLowerCase(), `area colour of ${n.id}`] as const),
  ['#20242a', 'dark label on a light fibre — contrast against the dot, not the page'],
  ['#37b3a6', 'dimmed XGS trunk, deliberately weaker than --xgs, legible on both grounds'],
  ['#c99a54', 'dimmed GPON trunk, same'],
  ['#060b14', 'hairline separating a coloured fibre dot from whatever is behind it'],
  ['#0c1524', 'dark label on a filled occupancy dot — contrast against the fill'],
  ['#9df08a', 'area colour carried by a served-town row'],
  ['#f2d024', 'yellow is the jacket colour of single-mode fibre — a real patch cord'],
  ['#14181f', "a cable's outer sheath is black, in either theme"],
  ['#5a6270', "the steel strength member at a cable's core"],
]);

const HEX = /#[0-9a-fA-F]{6}\b/g;

describe('instruments take their chrome from the theme', () => {
  const files = collectSourceFiles(SRC, /\.ts$/).filter((f) => INSTRUMENTS.includes(f.path));

  it('finds every instrument module, so a rename cannot silently skip one', () => {
    expect(files.map((f) => f.path).sort()).toEqual([...INSTRUMENTS].sort());
  });

  for (const name of INSTRUMENTS) {
    it(`${name} writes no colour that is not either a token or data`, () => {
      const file = files.find((f) => f.path === name)!;
      const stray = [...new Set(file.text.match(HEX) ?? [])]
        .map((h) => h.toLowerCase())
        .filter((h) => !DATA_COLOURS.has(h));
      expect(stray, `${name}: hardcoded colour(s) that will not follow the theme`).toEqual([]);
    });
  }

  it('actually uses tokens, so the check above is not passing on an empty file', () => {
    const total = files.reduce((n, f) => n + (f.text.match(/var\(--/g) ?? []).length, 0);
    expect(total).toBeGreaterThan(60);
  });

  it('never reaches for a token the theme does not define', () => {
    const declared = new Set(
      [...collectSourceFiles(SRC, /^tokens\.css$/)[0]!.text.matchAll(/(--[\w-]+)\s*:/g)].map(
        (m) => m[1]!,
      ),
    );
    const used = new Set<string>();
    for (const f of files) {
      for (const m of f.text.matchAll(/var\((--[\w-]+)\)/g)) used.add(m[1]!);
    }
    expect([...used].filter((t) => !declared.has(t))).toEqual([]);
  });
});
