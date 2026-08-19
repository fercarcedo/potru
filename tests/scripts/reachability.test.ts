/**
 * Can a visitor get in, and get to everything?
 *
 * changes.txt reported two failures the viewer had no way to catch: the walk
 * of a node not starting at its door, and parts of a room the visitor cannot
 * reach. Both are a property of `rooms.json` alone — the door on the wrong
 * wall, or cabinets closing the only aisle — so they belong in a test over
 * the data, using the same walkability rule the camera itself uses.
 */
import { describe, expect, it } from 'vitest';
import rooms from '../../src/data/rooms.json';
import { doorway, inward, isClear, reachableFrom, walkInFrom } from '../../src/scripts/viewer3d/walkable';
import type { Solid } from '../../src/scripts/viewer3d/walkable';

interface Bay { x: number; z: number; w: number; d: number; y?: number; kind: string; label: string }
interface Room {
  h: number;
  outline: [number, number][];
  doors: { edge: number; at: number; width: number }[];
  bays: Bay[];
}
const ROOMS = rooms as unknown as Record<string, Room>;

/** mirrors viewer3d.ts: above this a bay hangs clear of a visitor's head */
const CEILING_MOUNTED = 1.8;

/** buildRoom() centres the plan on the room; so does this. */
function centred(room: Room) {
  const W = Math.max(...room.outline.map((p) => p[0]));
  const D = Math.max(...room.outline.map((p) => p[1]));
  const poly = room.outline.map(([x, z]) => [x - W / 2, z - D / 2] as [number, number]);
  /* one footprint per bay, in bay order, so callers can pair them up... */
  const foot: Solid[] = room.bays.map((b) => ({
    x0: b.x - W / 2, x1: b.x - W / 2 + b.w,
    z0: b.z - D / 2, z1: b.z - D / 2 + b.d,
  }));
  /* ...and, as buildRoom() does, only the ones a visitor has to walk round: a
     ceiling-slung unit is passed under */
  const solids = foot.filter((_, i) => (room.bays[i]!.y ?? 0) < CEILING_MOUNTED);
  return { poly, foot, solids, W, D };
}

/** The eight points just outside a cabinet's footprint: can you get to it? */
function approaches(s: Solid): [number, number][] {
  const R = 0.2;
  const cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2;
  return [
    [cx, s.z0 - R], [cx, s.z1 + R], [s.x0 - R, cz], [s.x1 + R, cz],
    [s.x0 - R, s.z0 - R], [s.x1 + R, s.z0 - R], [s.x0 - R, s.z1 + R], [s.x1 + R, s.z1 + R],
  ];
}

describe('every room lets the visitor in through its door', () => {
  for (const [id, room] of Object.entries(ROOMS)) {
    it(`${id}: the walk-in from the door lands on standable floor near it`, () => {
      const { poly, solids } = centred(room);
      const door = room.doors[0];
      expect(door, `${id} has no door`).toBeTruthy();
      const start = doorway(poly, door!);
      const landed = walkInFrom(poly, solids, start, inward(poly, door!));
      expect(landed, `${id}: nowhere to stand walking in from the door`).toBeTruthy();
      /* it is a walk *in*, not a hike to the far side */
      expect(Math.hypot(landed![0] - start[0], landed![1] - start[1])).toBeLessThan(3.05);
    });
  }
});

describe('every cabinet can be walked up to', () => {
  for (const [id, room] of Object.entries(ROOMS)) {
    it(`${id}: no cabinet is walled off from the door`, () => {
      const { poly, foot, solids } = centred(room);
      const door = room.doors[0]!;
      const start = walkInFrom(poly, solids, doorway(poly, door), inward(poly, door))!;
      const reached = reachableFrom(poly, solids, start);
      const stranded = room.bays
        .map((bay, i) => [bay, foot[i]!] as const)
        /* a cage is a room within the room; a wall cabinet is looked at, not
           walked round; and a ceiling unit has no floor beside it at all */
        .filter(([bay]) => bay.kind !== 'cage' && (bay.y ?? 0) < CEILING_MOUNTED)
        .filter(([, s]) => !approaches(s).some(([x, z]) => isClear(poly, solids, x, z) && reached(x, z)))
        .map(([bay]) => bay.label);
      expect(stranded, `unreachable in ${id}: ${stranded.join(', ')}`).toEqual([]);
    });
  }
});

describe('no room is mostly unreachable floor', () => {
  for (const [id, room] of Object.entries(ROOMS)) {
    it(`${id}: the visitor can reach most of the standable floor`, () => {
      const { poly, solids, W, D } = centred(room);
      const door = room.doors[0]!;
      const start = walkInFrom(poly, solids, doorway(poly, door), inward(poly, door))!;
      const reached = reachableFrom(poly, solids, start);
      let standable = 0, got = 0;
      for (let x = -W / 2; x < W / 2; x += 0.12) {
        for (let z = -D / 2; z < D / 2; z += 0.12) {
          if (!isClear(poly, solids, x, z)) continue;
          standable++;
          if (reached(x, z)) got++;
        }
      }
      expect(standable).toBeGreaterThan(0);
      expect(got / standable, `${id}: only ${got}/${standable} cells reachable`)
        .toBeGreaterThan(0.9);
    });
  }
});
