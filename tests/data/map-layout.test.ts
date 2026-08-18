/**
 * Referential integrity for map.ts's hand-placed layout tables (POS,
 * SECONDARY, TOWN_POS) against nodes.json — the two are independent, hand-
 * maintained sources of truth for the same nodes and town names, and
 * nothing else checks they agree. This is exactly the shape of bug that
 * already happened once silently: TOWN_POS.mieres had "Ujó" where
 * nodes.json (and the pliego) has "Ujo", and only a live-browser hover
 * check caught it, not a type or a build error.
 */
import { describe, expect, it } from 'vitest';
import { ALL_NODES, byId } from '../../src/lib/data';
import { POS, SECONDARY, TOWN_POS } from '../../src/scripts/map';

/**
 * TOWN_POS's labels are the ones drawn on the map, and a few are
 * deliberately abbreviated to fit ("Sta. Cruz" for "Santa Cruz de Mieres").
 * Every entry not listed here must match nodes.json's `towns[]` verbatim —
 * that discipline is what would have caught "Ujó" vs "Ujo".
 */
const KNOWN_ABBREVIATIONS: Record<string, string> = {
  'Pol. de Coaña': 'Polígono de Coaña',
  'Pol. La Curiscada': 'Polígono de La Curiscada',
  'Sta. Cruz': 'Santa Cruz de Mieres',
  Tuilla: 'Tuilla (a 3,6 km del nodo)',
  Posada: 'Posada de Llanes',
};

describe('POS', () => {
  it('has exactly one entry per primary node, and no others', () => {
    const primaryIds = ALL_NODES.filter((n) => n.id !== 'pao').map((n) => n.id);
    expect(Object.keys(POS).sort()).toEqual([...primaryIds].sort());
  });
});

describe('SECONDARY', () => {
  it('hangs every secondary node off a primary that exists in POS', () => {
    for (const [name, , , , par] of SECONDARY) {
      expect(POS[par], `${name}'s primary "${par}" is not in POS`).toBeTruthy();
    }
  });
});

describe('TOWN_POS', () => {
  it('only labels nodes that exist in POS', () => {
    for (const nid of Object.keys(TOWN_POS)) {
      expect(POS[nid], `TOWN_POS has an entry for unknown node "${nid}"`).toBeTruthy();
    }
  });

  it('names a real town for every label, exactly as nodes.json spells it (or a documented abbreviation)', () => {
    for (const [nid, list] of Object.entries(TOWN_POS)) {
      const node = byId[nid];
      expect(node, `TOWN_POS references unknown node "${nid}"`).toBeTruthy();
      for (const [label] of list) {
        const expected = KNOWN_ABBREVIATIONS[label] ?? label;
        expect(
          node!.towns.includes(expected),
          `${nid}: "${label}" (expected "${expected}") is not in nodes.json's towns: ${JSON.stringify(node!.towns)}`
        ).toBe(true);
      }
    }
  });

  it("keeps the abbreviation list itself honest — every entry is actually shorter than what it stands for", () => {
    for (const [abbr, full] of Object.entries(KNOWN_ABBREVIATIONS)) {
      expect(abbr.length, `"${abbr}" isn't actually shorter than "${full}"`).toBeLessThan(full.length);
    }
  });
});
