/**
 * src/i18n/ui.ts's es/en objects already satisfy one shared TypeScript
 * interface, so a missing key is a compile error, not a silent fallback —
 * that part needs no runtime test. What TypeScript cannot catch is a key
 * that got *copied* instead of *translated*: es and en agreeing verbatim on
 * a string that should differ. This walks both trees leaf by leaf and
 * asserts none of them do — the same kind of "checkable in one place" guard
 * this repo already applies to storage keys and font names.
 */
import { describe, expect, it } from 'vitest';
import { ui } from '../../src/i18n/ui';

/** Sample args for every function-valued leaf, so its two locale outputs can
 *  be compared like any string leaf. Keyed by dotted path from the root. */
const SAMPLE_ARGS: Record<string, unknown[]> = {
  'nodeGrid.altPlano': ['Blimea'],
  'meta.nodeTitle': ['Blimea'],
  'meta.paoDescription': ['PAO', 'Recinto de operadores'],
  'meta.nodeDescription': [
    { name: 'Blimea', area: 'Nalón', olts: 1, onts: 100, weekFrom: 1, weekTo: 5 },
  ],
  'map.tourStepOf': [1, 9],
  'viewer3d.legendRoom': ['3.20', '4.10', '2.40'],
  'viewer3d.legendCabinets': [6],
  'viewer3d.legendOltCards': [2, 5],
  'viewer3d.legendOltLine': [8, 22, 32],
};

/** Flattens an object into {dottedPath: leafValue}, resolving any function
 *  leaf against SAMPLE_ARGS so both locales' outputs are plain strings. */
function leaves(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      out[path] = value;
    } else if (typeof value === 'function') {
      const args = SAMPLE_ARGS[path];
      expect(args, `${path} is a function with no SAMPLE_ARGS entry`).toBeDefined();
      out[path] = (value as (...a: unknown[]) => string)(...args!);
    } else if (value && typeof value === 'object') {
      Object.assign(out, leaves(value as Record<string, unknown>, path));
    }
  }
  return out;
}

describe('src/i18n/ui.ts', () => {
  it('defaults to Spanish when no locale is given', () => {
    expect(ui()).toBe(ui('es'));
  });

  it('translates every leaf string: es and en never agree verbatim', () => {
    const es = leaves(ui('es') as unknown as Record<string, unknown>);
    const en = leaves(ui('en') as unknown as Record<string, unknown>);
    expect(Object.keys(es)).toEqual(Object.keys(en));
    const untranslated = Object.keys(es).filter((k) => es[k] === en[k]);
    expect(untranslated, `still identical in es and en: ${untranslated.join(', ')}`).toEqual([]);
  });

  it('keeps pliego figures out of the translation, only the words around them move', () => {
    /* meta.nodeDescription interpolates raw numbers — they must survive
       translation unchanged, the same figure in both locales */
    const args = SAMPLE_ARGS['meta.nodeDescription']![0] as {
      olts: number;
      onts: number;
      weekFrom: number;
      weekTo: number;
    };
    const en = ui('en').meta.nodeDescription(args as never);
    expect(en).toContain(`${args.olts} OLT`);
    expect(en).toContain(`${args.onts} ONT`);
    expect(en).toContain(`${args.weekFrom}–${args.weekTo}`);
  });
});
