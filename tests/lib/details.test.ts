import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import { DETAILS } from '../../src/lib/details';

describe('DETAILS (guided tour panels)', () => {
  it('has exactly 9 stops, one per tour panel', () => {
    expect(DETAILS).toHaveLength(9);
  });

  it('gives every stop non-empty markup containing at least one <svg>', () => {
    for (const [i, panel] of DETAILS.entries()) {
      expect(panel.length, `stop ${i} is empty`).toBeGreaterThan(0);
      const window = new Window();
      window.document.body.innerHTML = panel;
      expect(window.document.body.querySelectorAll('svg').length, `stop ${i} has no <svg>`).toBeGreaterThan(0);
    }
  });
});
