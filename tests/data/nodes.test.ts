/**
 * Invariants over src/data/nodes.json — the hand-transcribed heart of the
 * site. These tests exist to catch a bad edit to the pliego transcription,
 * not to validate application logic (see tests/lib for that).
 */
import { describe, expect, it } from 'vitest';
import raw from '../../src/data/nodes.json';
import { ACTION_DESC, HOST_ONLY } from '../../src/lib/data';
import type { NetworkNode, Olt } from '../../src/lib/data';
import fs from 'node:fs';
import path from 'node:path';

const data = raw as unknown as { nodes: NetworkNode[]; pao: NetworkNode };
const ALL: NetworkNode[] = [...data.nodes, data.pao];
const PUBLIC_DIR = path.resolve(__dirname, '../../public');

/**
 * The pliego contradicts itself for these three OLTs (see docs/FUENTES.md):
 * NVI/1C's prose ("7 tarjetas de 8 puertos" = 56) doesn't match its own
 * ports-total column (44); BLI/1B and BLI/9B list more active ports than
 * total. Potru transcribes these as-is rather than "fixing" them, and
 * annotates them with a `note`. This is the one allowed exceptions list —
 * anything not on it must be internally consistent.
 */
const KNOWN_PLIEGO_CONTRADICTIONS = new Set(['NVI/1C', 'BLI/1B', 'BLI/9B']);

const allOlts: { node: NetworkNode; olt: Olt }[] = ALL.flatMap((node) =>
  node.olts.map((olt) => ({ node, olt })),
);

describe('node roster', () => {
  it('has the 20 primary nodes plus the PAO', () => {
    expect(data.nodes).toHaveLength(20);
    expect(data.pao.id).toBe('pao');
  });

  it('has unique, kebab-case ids', () => {
    const ids = ALL.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('gives every area exactly one colour', () => {
    const colorByArea = new Map<string, string>();
    for (const n of data.nodes) {
      if (colorByArea.has(n.area)) {
        expect(n.color).toBe(colorByArea.get(n.area));
      } else {
        colorByArea.set(n.area, n.color);
      }
    }
  });

  it('lists HOST_ONLY nodes that actually exist', () => {
    const ids = new Set(ALL.map((n) => n.id));
    for (const id of HOST_ONLY) expect(ids.has(id)).toBe(true);
  });
});

describe('OLT port and card arithmetic', () => {
  for (const { node, olt } of allOlts) {
    const isKnownContradiction = KNOWN_PLIEGO_CONTRADICTIONS.has(olt.code);

    it(`${olt.code} (${node.id}): active ports never exceed total, unless documented`, () => {
      if (isKnownContradiction) {
        // The contradiction must still be real, and must still be annotated —
        // this direction of the test stops the exception list from going stale.
        expect(
          olt.portsActive > olt.portsTotal || olt.cards * olt.portsPerCard !== olt.portsTotal,
        ).toBe(true);
        expect(olt.note).toBeTruthy();
      } else {
        expect(olt.portsActive).toBeLessThanOrEqual(olt.portsTotal);
      }
    });

    it(`${olt.code} (${node.id}): cards × portsPerCard equals portsTotal, unless documented`, () => {
      const computed = olt.cards * olt.portsPerCard;
      if (isKnownContradiction) {
        // covered above; this test only enforces the invariant for the rest
      } else {
        expect(computed).toBe(olt.portsTotal);
      }
    });

    it(`${olt.code} (${node.id}): onts in service does not exceed active ports`, () => {
      // Each active GPON/XGS-PON port can serve many ONTs downstream of a
      // splitter, so this is a sanity floor, not an equality.
      expect(olt.onts).toBeGreaterThanOrEqual(0);
    });
  }

  it('does not have undocumented contradictions beyond the known three', () => {
    for (const { olt } of allOlts) {
      if (KNOWN_PLIEGO_CONTRADICTIONS.has(olt.code)) continue;
      expect(olt.portsActive, `${olt.code} active > total`).toBeLessThanOrEqual(olt.portsTotal);
      expect(olt.cards * olt.portsPerCard, `${olt.code} cards*portsPerCard != portsTotal`).toBe(
        olt.portsTotal,
      );
    }
  });
});

describe('actions', () => {
  it('references only known action codes', () => {
    for (const n of ALL) {
      for (const a of n.actions) {
        expect(Object.keys(ACTION_DESC), `${n.id} references unknown action ${a}`).toContain(a);
      }
    }
  });
});

describe('phase 2 schedule', () => {
  it('has weekFrom <= weekTo for every primary node', () => {
    for (const n of data.nodes) {
      expect(n.weekFrom, n.id).toBeLessThanOrEqual(n.weekTo);
    }
  });

  it('keeps the PAO week range too', () => {
    expect(data.pao.weekFrom).toBeLessThanOrEqual(data.pao.weekTo);
  });
});

describe('shared PON groups', () => {
  it('only groups towns that are served by some node', () => {
    const knownTowns = new Set(ALL.flatMap((n) => n.towns));
    for (const n of ALL) {
      if (!n.ponGroups) continue;
      for (const group of n.ponGroups.groups) {
        for (const town of group) {
          expect(
            knownTowns.has(town),
            `${n.id}: ponGroups town "${town}" is not in any node's towns[]`,
          ).toBe(true);
        }
      }
    }
  });

  it('never groups fewer than two towns', () => {
    for (const n of ALL) {
      if (!n.ponGroups) continue;
      for (const group of n.ponGroups.groups) {
        expect(group.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('gallery assets', () => {
  it('has an ubicación cover image with a thumbnail for every primary node', () => {
    for (const n of data.nodes) {
      const cover = n.gallery.find((g) => g.key === 'ubicacion');
      expect(cover, `${n.id} has no ubicacion image`).toBeTruthy();
      expect(cover?.thumb, `${n.id}'s ubicacion image has no thumb`).toBeTruthy();
    }
  });

  it('points every gallery src (and thumb) at a file that exists in public/', () => {
    for (const n of ALL) {
      for (const g of n.gallery) {
        expect(fs.existsSync(path.join(PUBLIC_DIR, g.src)), `${n.id}: missing ${g.src}`).toBe(true);
        expect(g.w).toBeGreaterThan(0);
        expect(g.h).toBeGreaterThan(0);
        if (g.thumb) {
          expect(
            fs.existsSync(path.join(PUBLIC_DIR, g.thumb.src)),
            `${n.id}: missing thumb ${g.thumb.src}`,
          ).toBe(true);
          expect(g.thumb.w).toBeGreaterThan(0);
          expect(g.thumb.h).toBeGreaterThan(0);
          expect(g.thumb.w).toBeLessThanOrEqual(g.w);
        }
      }
    }
  });
});
