/**
 * orientation.ts is pure geometry, deliberately factored out of
 * viewer3d.ts's buildRoom() (see that module's doc comment) so the cabinet-
 * facing solver — the one piece of logic in the 3D viewer whose own
 * comments describe a real prior bug (Blimea's OLT grid facing two ways at
 * once) — is testable without a WebGL context.
 */
import { describe, expect, it } from 'vitest';
import { computeOrientations } from '../../src/scripts/viewer3d/orientation';
import type { Footprint } from '../../src/scripts/viewer3d/orientation';

/** A 4m×4m room, uncentered (x:0..4, z:0..4) — computeOrientations centres
 *  bay footprints against `poly` the same way buildRoom does. */
const W = 4,
  D = 4;
const poly: [number, number][] = [
  [-2, -2],
  [2, -2],
  [2, 2],
  [-2, 2],
];

describe('computeOrientations', () => {
  it('faces an isolated cabinet away from the wall it backs onto', () => {
    // backed against the room's low-z wall, roomy side toward +z
    const bay: Footprint = { x: 1, z: 0.2, w: 2, d: 0.6 };
    const solids = [
      {
        x0: bay.x - W / 2,
        x1: bay.x - W / 2 + bay.w,
        z0: bay.z - D / 2,
        z1: bay.z - D / 2 + bay.d,
      },
    ];
    const orient = computeOrientations([bay], poly, solids, W, D);
    expect(orient.get(bay)!.rot).toBe(0);
  });

  it('turns a block 90° when it is backed against a side wall instead', () => {
    // backed against the room's low-x wall (a block deeper in x than tall in
    // z), roomy side toward +x
    const bay: Footprint = { x: 0.2, z: 1, w: 0.6, d: 2 };
    const solids = [
      {
        x0: bay.x - W / 2,
        x1: bay.x - W / 2 + bay.w,
        z0: bay.z - D / 2,
        z1: bay.z - D / 2 + bay.d,
      },
    ];
    const orient = computeOrientations([bay], poly, solids, W, D);
    expect(orient.get(bay)!.rot).toBeCloseTo(Math.PI / 2, 5);
  });

  it('gives every cabinet in a touching block the same facing — the Blimea regression', () => {
    // two cabinets, edge to edge, both backed against the low-z wall: before
    // the union-find grouping, each was oriented independently and could
    // end up facing opposite ways even though they form one visual row.
    const a: Footprint = { x: 0.5, z: 0.2, w: 1.4, d: 0.6 };
    const b: Footprint = { x: 1.9, z: 0.2, w: 1.4, d: 0.6 }; // touches a's right edge exactly
    const bays = [a, b];
    const solids = bays.map((bay) => ({
      x0: bay.x - W / 2,
      x1: bay.x - W / 2 + bay.w,
      z0: bay.z - D / 2,
      z1: bay.z - D / 2 + bay.d,
    }));
    const orient = computeOrientations(bays, poly, solids, W, D);
    expect(orient.get(a)!.rot).toBe(orient.get(b)!.rot);
    expect(orient.get(a)!.rot).toBe(0); // both away from the wall they're backed against
  });

  it('keeps two separated cabinets independent — no false grouping', () => {
    // one cabinet backed against the low-z wall, the other against the
    // high-z wall — far enough apart (> the 16cm touch threshold) that they
    // must NOT be unioned into one block. If they were, the merged block's
    // bounding box would span both walls and could give both the same
    // (wrong, for one of them) facing.
    const a: Footprint = { x: 1, z: 0.2, w: 2, d: 0.6 };
    const b: Footprint = { x: 1, z: 3.2, w: 2, d: 0.6 };
    const bays = [a, b];
    const solids = bays.map((bay) => ({
      x0: bay.x - W / 2,
      x1: bay.x - W / 2 + bay.w,
      z0: bay.z - D / 2,
      z1: bay.z - D / 2 + bay.d,
    }));
    const orient = computeOrientations(bays, poly, solids, W, D);
    expect(orient.get(a)!.rot).toBe(0); // faces away from the low-z wall
    expect(orient.get(b)!.rot).toBe(Math.PI); // faces away from the high-z wall
  });

  it('returns a Map keyed by the same bay references passed in', () => {
    const bays: Footprint[] = [
      { x: 1, z: 1, w: 0.5, d: 0.5 },
      { x: 3, z: 3, w: 0.5, d: 0.5 },
    ];
    const orient = computeOrientations(bays, poly, [], W, D);
    expect(orient.size).toBe(2);
    for (const bay of bays) expect(orient.has(bay)).toBe(true);
  });
});
