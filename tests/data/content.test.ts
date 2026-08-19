/**
 * Invariants over src/data/content.json — pliego-derived site copy that used
 * to be hardcoded into Hero.astro, Architecture.astro, ont-bars.ts and
 * diagram.ts, where nothing could check it. Moving it to src/data/ only pays
 * off if it is actually guarded, so this mirrors tests/data/nodes.test.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  ACTION_DESC,
  ARCHITECTURE_STEPS,
  CONTRACT_ACTIONS,
  DIAGRAM_INFO,
  HERO_STATS,
  ONT_INSTALL_BASE,
  PAO_TRANSPORT,
  TOUR_STOPS,
  byId,
} from '../../src/lib/data';

describe('heroStats', () => {
  it('has at least one entry and no blank value/label', () => {
    expect(HERO_STATS.length).toBeGreaterThan(0);
    for (const s of HERO_STATS) {
      expect(s.value.trim()).not.toBe('');
      expect(s.label.trim()).not.toBe('');
    }
  });
});

describe('ontInstallBase', () => {
  it('sums to 100% across the transcribed models', () => {
    const total = ONT_INSTALL_BASE.reduce((a, o) => a + o.pct, 0);
    expect(total).toBeCloseTo(100, 1);
  });

  it('gives every entry a model name and a non-negative share', () => {
    for (const o of ONT_INSTALL_BASE) {
      expect(o.model.trim()).not.toBe('');
      expect(o.pct).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('architectureSteps', () => {
  it('has a kicker, heading and body for every layer', () => {
    expect(ARCHITECTURE_STEPS.length).toBeGreaterThan(0);
    for (const s of ARCHITECTURE_STEPS) {
      expect(s.kicker.trim()).not.toBe('');
      expect(s.heading.trim()).not.toBe('');
      expect(s.text.trim()).not.toBe('');
    }
  });
});

describe('diagramInfo', () => {
  it('gives every element both a gpon and an xgs explanation', () => {
    const keys = Object.keys(DIAGRAM_INFO);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      expect(DIAGRAM_INFO[k]!.gpon.trim()).not.toBe('');
      expect(DIAGRAM_INFO[k]!.xgs.trim()).not.toBe('');
    }
  });

  it('covers the 6 elements the diagram island actually renders', () => {
    expect(Object.keys(DIAGRAM_INFO).sort()).toEqual([
      'olt',
      'ont',
      'oss',
      'pao',
      'split',
      'troncal',
    ]);
  });
});

describe('contractActions', () => {
  it('has a unique id and a heading for every card', () => {
    const ids = CONTRACT_ACTIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of CONTRACT_ACTIONS) expect(a.heading.trim()).not.toBe('');
  });

  it('gives every card exactly one of bullets or text, and at least one of them', () => {
    for (const a of CONTRACT_ACTIONS) {
      expect(a.bullets && a.text, `${a.id} has both bullets and text`).toBeFalsy();
      expect(a.bullets || a.text, `${a.id} has neither bullets nor text`).toBeTruthy();
      if (a.bullets) expect(a.bullets.length).toBeGreaterThan(0);
    }
  });

  it('gives every "fija" action the fix pill and every "variable" action the var pill', () => {
    for (const a of CONTRACT_ACTIONS) {
      expect(a.pill, a.id).toBe(a.part === 'fija' ? 'fix' : 'var');
    }
  });

  it('every ACTION_DESC code used elsewhere in the site also has a contract action card', () => {
    const cardCodes = new Set(CONTRACT_ACTIONS.map((a) => a.code));
    for (const code of Object.keys(ACTION_DESC)) {
      expect(cardCodes.has(code), `${code} is referenced by ACTION_DESC but has no card`).toBe(
        true,
      );
    }
  });
});

describe('tourStops', () => {
  it('has 9 stops with unique ids, a title and a body', () => {
    expect(TOUR_STOPS).toHaveLength(9);
    const ids = TOUR_STOPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of TOUR_STOPS) {
      expect(s.id.trim(), 'blank stop id').not.toBe('');
      expect(s.title.trim(), s.id).not.toBe('');
      expect(s.text.trim(), s.id).not.toBe('');
    }
  });

  it('frames every stop inside the map’s own 1160×470 canvas', () => {
    /* the viewBox is fed straight to the map's <svg>; a stop framed outside
       it shows blank space instead of the network */
    for (const s of TOUR_STOPS) {
      const [x, y, w, h] = s.viewBox;
      expect(s.viewBox, s.id).toHaveLength(4);
      expect(w, s.id).toBeGreaterThan(0);
      expect(h, s.id).toBeGreaterThan(0);
      expect(x, s.id).toBeGreaterThanOrEqual(0);
      expect(y, s.id).toBeGreaterThanOrEqual(0);
      expect(x + w, s.id).toBeLessThanOrEqual(1160);
      expect(y + h, s.id).toBeLessThanOrEqual(470);
    }
  });

  it('only points “Entrar en el nodo” at nodes that exist', () => {
    for (const s of TOUR_STOPS) {
      if (s.node) expect(byId[s.node], `${s.id} → ${s.node}`).toBeTruthy();
    }
  });
});

describe('paoTransport', () => {
  it('never reports more channels occupied than a system has', () => {
    expect(PAO_TRANSPORT.rows.length).toBeGreaterThan(0);
    for (const r of PAO_TRANSPORT.rows) {
      expect(r.name.trim()).not.toBe('');
      expect(r.channels, r.name).toBeGreaterThan(0);
      expect(r.used, r.name).toBeGreaterThanOrEqual(0);
      expect(r.used, r.name).toBeLessThanOrEqual(r.channels);
    }
  });

  it('carries the direct-fibre run and the 7750SR-7 capacity warning', () => {
    expect(PAO_TRANSPORT.directLabel.trim()).not.toBe('');
    expect(PAO_TRANSPORT.directNote.trim()).not.toBe('');
    expect(PAO_TRANSPORT.warning).toContain('7750SR-7');
  });
});
