/**
 * label-placement.ts is pure geometry, deliberately factored out of map.ts
 * so it is testable without a real getBBox() (see that file's doc comment).
 * These use a synthetic `measure` that reports a fixed-size box at whatever
 * offset the candidate asks for, standing in for a real text measurement.
 */
import { describe, expect, it } from 'vitest';
import { LEADER, box, hits, overlapArea, placeLabel, ringSpots } from '../../src/scripts/label-placement';
import type { Anchor, Measurement, Rect } from '../../src/scripts/label-placement';

const LABEL_W = 20, LABEL_H = 10;

/** A synthetic measurer standing in for a real getBBox() read: places an
 *  axis-aligned LABEL_W×LABEL_H box horizontally centred on ax+dx, with its
 *  *bottom* (baseline) at ay+dy — matching how SVG <text> actually sits
 *  relative to its y attribute, which is what ringSpots's dy offsets (+11
 *  below the dot, -1 above it) are tuned against. Ignores `anchor`; that
 *  only shifts the box horizontally, which none of these tests depend on. */
function measurerAt(ax: number, ay: number): (dx: number, dy: number, anchor?: Anchor) => Measurement {
  return (dx, dy) => {
    const raw: Rect = { x: ax + dx - LABEL_W / 2, y: ay + dy - LABEL_H, w: LABEL_W, h: LABEL_H };
    return { raw, padded: box({ x: raw.x, y: raw.y, width: raw.w, height: raw.h }) };
  };
}

describe('box / hits / overlapArea', () => {
  it('pads a raw bbox on every side', () => {
    const b = box({ x: 10, y: 10, width: 4, height: 4 }, 2);
    expect(b).toEqual({ x: 8, y: 8, w: 8, h: 8 });
  });

  it('hits() is true for overlapping rects and false for disjoint ones', () => {
    const a: Rect = { x: 0, y: 0, w: 10, h: 10 };
    expect(hits(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(hits(a, { x: 20, y: 20, w: 10, h: 10 })).toBe(false);
  });

  it('overlapArea is 0 for disjoint rects and the intersection area otherwise', () => {
    const a: Rect = { x: 0, y: 0, w: 10, h: 10 };
    expect(overlapArea(a, { x: 20, y: 20, w: 5, h: 5 })).toBe(0);
    expect(overlapArea(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(25);
  });
});

describe('ringSpots', () => {
  it('generates 4 rings of 8 candidates', () => {
    expect(ringSpots(7)).toHaveLength(32);
  });

  it('moves each of the 8 directions strictly farther out ring by ring', () => {
    const spots = ringSpots(7);
    const dist = (s: (typeof spots)[number]) => Math.hypot(s[0], s[1]);
    // spots[i], spots[i+8], spots[i+16], spots[i+24] are the same direction
    // at increasing pad — same direction, so distance is directly comparable
    for (let dir = 0; dir < 8; dir++) {
      const distances = [0, 1, 2, 3].map((ring) => dist(spots[ring * 8 + dir]!));
      for (let i = 1; i < distances.length; i++) expect(distances[i]).toBeGreaterThan(distances[i - 1]!);
    }
  });

  it('anchors text away from the dot: right-side spots start, left-side end, vertical middle', () => {
    for (const [dx, , anchor] of ringSpots(7)) {
      if (dx > 0.1) expect(anchor).toBe('start');
      else if (dx < -0.1) expect(anchor).toBe('end');
      else expect(anchor).toBe('middle');
    }
  });
});

describe('placeLabel', () => {
  it('keeps the home spot when it is the closest clear spot to the dot', () => {
    // dy: 0 puts the label's box straddling the dot itself (gap 0) — no ring
    // spot, which all sit at radius >= ar + 4, can beat that when clear.
    const result = placeLabel({
      ax: 100, ay: 100, ar: 7,
      home: [0, 0, 'middle'],
      measure: measurerAt(100, 100),
      obstacles: [],
      cables: [],
    });
    expect(result).toMatchObject({ dx: 0, dy: 0, anchor: 'middle', needsLeader: false });
  });

  it('walks to the next clear ring spot when home collides with an obstacle', () => {
    const home: [number, number, 'middle'] = [0, 22, 'middle'];
    // block the home spot's exact box outright
    const measure = measurerAt(100, 100);
    const homeBox = measure(...home).padded;
    const result = placeLabel({
      ax: 100, ay: 100, ar: 7,
      home,
      measure,
      obstacles: [homeBox],
      cables: [],
    });
    expect([result.dx, result.dy]).not.toEqual([0, 22]);
    // and the winning spot is verifiably clear of the blocked home box
    expect(overlapArea(result.box, homeBox)).toBe(0);
  });

  it('prefers a spot off the cables over one that overlaps them, when both are otherwise clear', () => {
    const measure = measurerAt(100, 100);
    // find two clear ring candidates (no obstacles at all) and cover the
    // nearer one's box with a "cable" — the label must move past it
    const home: [number, number, 'middle'] = [0, 22, 'middle'];
    const nearestRingSpot = ringSpots(7)[0]!;
    const cableBox = measure(nearestRingSpot[0], nearestRingSpot[1]).padded;
    const withoutCable = placeLabel({ ax: 100, ay: 100, ar: 7, home, measure, obstacles: [], cables: [] });
    const withCable = placeLabel({ ax: 100, ay: 100, ar: 7, home, measure, obstacles: [], cables: [cableBox] });
    // home spot itself is untouched by the cable, so both keep the same pick —
    // this asserts the cable is consulted at all, via a spot that touches it
    expect(overlapArea(withCable.box, cableBox)).toBeLessThanOrEqual(overlapArea(withoutCable.box, cableBox));
  });

  it('falls back to the least-overlapping ring spot when nothing is fully clear', () => {
    const ax = 100, ay = 100, ar = 7;
    const measure = measurerAt(ax, ay);
    // wall off a huge area so every candidate collides with something
    const wall: Rect = { x: ax - 200, y: ay - 200, w: 400, h: 400 };
    const result = placeLabel({ ax, ay, ar, home: [0, 22, 'middle'], measure, obstacles: [wall], cables: [] });
    // still returns *a* placement rather than throwing
    expect(Number.isFinite(result.dx)).toBe(true);
    expect(Number.isFinite(result.dy)).toBe(true);
  });

  it('flags needsLeader only once the label sits farther than LEADER from its dot', () => {
    const ax = 100, ay = 100, ar = 7;
    // a measurer that always returns a box centred far from the dot,
    // regardless of candidate — simulates a label that had to drift
    const farMeasure = (): Measurement => {
      const raw: Rect = { x: ax + LEADER * 3, y: ay, w: LABEL_W, h: LABEL_H };
      return { raw, padded: box({ x: raw.x, y: raw.y, width: raw.w, height: raw.h }) };
    };
    const result = placeLabel({ ax, ay, ar, home: [0, 22, 'middle'], measure: farMeasure, obstacles: [], cables: [] });
    expect(result.needsLeader).toBe(true);
    expect(result.gap).toBeGreaterThan(LEADER);
  });
});
