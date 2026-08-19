/**
 * DETAILS is keyed by tour-stop id, and that key is the only thing tying a
 * stop's drawing to the stop's prose and framing in TOUR_STOPS. It used to
 * be positional — two arrays lined up by index — so a reordered or inserted
 * stop paired one stop's text with another's cable section, silently. These
 * tests are what makes the key contract real.
 */
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import { TOUR_STOPS } from '../../src/lib/data';
import { DETAILS } from '../../src/lib/details';

describe('DETAILS (guided tour panels)', () => {
  it('keys every panel by a real tour-stop id', () => {
    const stopIds = new Set(TOUR_STOPS.map((s) => s.id));
    for (const key of Object.keys(DETAILS)) {
      expect(stopIds.has(key), `panel "${key}" belongs to no tour stop`).toBe(true);
    }
  });

  it('gives all 9 stops a panel, in the stops’ own order', () => {
    /* A stop without a panel is supported (tour.ts hides the button), but
       today every stop has one — so drift shows up here rather than as a
       button that quietly stops appearing. */
    expect(Object.keys(DETAILS)).toEqual(TOUR_STOPS.map((s) => s.id));
  });

  it('gives every stop non-empty markup containing at least one <svg>', () => {
    for (const [id, panel] of Object.entries(DETAILS)) {
      expect(panel.length, `stop ${id} is empty`).toBeGreaterThan(0);
      const window = new Window();
      window.document.body.innerHTML = panel;
      expect(
        window.document.body.querySelectorAll('svg').length,
        `stop ${id} has no <svg>`,
      ).toBeGreaterThan(0);
    }
  });
});
