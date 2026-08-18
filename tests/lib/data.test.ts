import { describe, expect, it } from 'vitest';
import {
  ACTION_DESC,
  ALL_NODES,
  AREAS,
  HOST_ONLY,
  NODES,
  PAO_NODE,
  asset,
  byId,
  cardCount,
  cardLabel,
  ontCount,
} from '../../src/lib/data';
import type { Olt } from '../../src/lib/data';

describe('ontCount / cardCount', () => {
  it('sums onts and cards across all of a node’s OLTs', () => {
    const node = NODES.find((n) => n.olts.length > 1);
    expect(node, 'fixture requires a node with 2+ OLTs').toBeTruthy();
    const expectedOnts = node!.olts.reduce((a, o) => a + o.onts, 0);
    const expectedCards = node!.olts.reduce((a, o) => a + o.cards, 0);
    expect(ontCount(node!)).toBe(expectedOnts);
    expect(cardCount(node!)).toBe(expectedCards);
  });

  it('is 0 for a node with no OLTs (defensive, in case one is ever added)', () => {
    expect(ontCount({ olts: [] } as any)).toBe(0);
    expect(cardCount({ olts: [] } as any)).toBe(0);
  });
});

describe('cardLabel', () => {
  it('names the model when the pliego gives one', () => {
    const olt: Olt = {
      code: 'X/1A',
      vendor: 'v',
      cards: 16,
      cardModel: 'GLT2A',
      portsPerCard: 2,
      portsActive: 10,
      portsTotal: 32,
      onts: 100,
    };
    expect(cardLabel(olt)).toBe('16 × GLT2A (2 puertos)');
  });

  it('falls back to a bare port count for the unnamed Ericsson cards', () => {
    const olt: Olt = {
      code: 'X/1A',
      vendor: 'v',
      cards: 4,
      cardModel: null,
      portsPerCard: 8,
      portsActive: 22,
      portsTotal: 32,
      onts: 339,
    };
    expect(cardLabel(olt)).toBe('4 tarjetas de 8 puertos');
  });
});

describe('AREAS', () => {
  it('lists each area once, in order of first appearance, with its colour', () => {
    const seen = new Set<string>();
    let prevIndex = -1;
    for (const area of AREAS) {
      expect(seen.has(area.name), `duplicate area ${area.name}`).toBe(false);
      seen.add(area.name);
      const firstIndex = NODES.findIndex((n) => n.area === area.name);
      expect(firstIndex).toBeGreaterThan(prevIndex);
      prevIndex = firstIndex;
      expect(area.color).toBe(NODES[firstIndex]!.color);
    }
    expect(seen.size).toBe(new Set(NODES.map((n) => n.area)).size);
  });
});

describe('byId / ALL_NODES / HOST_ONLY', () => {
  it('covers every node including the PAO', () => {
    expect(ALL_NODES).toHaveLength(NODES.length + 1);
    expect(ALL_NODES.at(-1)).toBe(PAO_NODE);
    for (const n of ALL_NODES) expect(byId[n.id]).toBe(n);
  });

  it('resolves every HOST_ONLY id through byId', () => {
    for (const id of HOST_ONLY) expect(byId[id]).toBeTruthy();
  });
});

describe('ACTION_DESC', () => {
  it('gives every action a pill class, a description and an anchor', () => {
    for (const [code, [pill, desc, anchor]] of Object.entries(ACTION_DESC)) {
      expect(['fix', 'var']).toContain(pill);
      expect(desc.length).toBeGreaterThan(0);
      expect(anchor.startsWith(`#act-${code.toLowerCase().replace('-', '')}`)).toBe(true);
    }
  });
});

describe('asset()', () => {
  it('prepends the site base to a relative path exactly once', () => {
    const base = import.meta.env.BASE_URL;
    const out = asset('planos/muros-planta.jpg');
    expect(out).toBe(base + 'planos/muros-planta.jpg');
    expect(out.indexOf(base)).toBe(0);
  });
});
