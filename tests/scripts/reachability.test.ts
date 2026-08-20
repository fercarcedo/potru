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
import {
  arrivalAim,
  arriveFrom,
  doorway,
  inward,
  isClear,
  openness,
  reachableFrom,
  visibleFrom,
  walkInFrom,
} from '../../src/scripts/viewer3d/walkable';
import type { Solid } from '../../src/scripts/viewer3d/walkable';

interface Bay {
  x: number;
  z: number;
  w: number;
  d: number;
  y?: number;
  kind: string;
  label: string;
}
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
    x0: b.x - W / 2,
    x1: b.x - W / 2 + b.w,
    z0: b.z - D / 2,
    z1: b.z - D / 2 + b.d,
  }));
  /* ...and, as buildRoom() does, only the ones a visitor has to walk round: a
     ceiling-slung unit is passed under */
  const solids = foot.filter((_, i) => (room.bays[i]!.y ?? 0) < CEILING_MOUNTED);
  return { poly, foot, solids, W, D };
}

/** The eight points just outside a cabinet's footprint: can you get to it? */
function approaches(s: Solid): [number, number][] {
  const R = 0.2;
  const cx = (s.x0 + s.x1) / 2,
    cz = (s.z0 + s.z1) / 2;
  return [
    [cx, s.z0 - R],
    [cx, s.z1 + R],
    [s.x0 - R, cz],
    [s.x1 + R, cz],
    [s.x0 - R, s.z0 - R],
    [s.x1 + R, s.z0 - R],
    [s.x0 - R, s.z1 + R],
    [s.x1 + R, s.z1 + R],
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
        .filter(
          ([, s]) => !approaches(s).some(([x, z]) => isClear(poly, solids, x, z) && reached(x, z)),
        )
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
      let standable = 0,
        got = 0;
      for (let x = -W / 2; x < W / 2; x += 0.12) {
        for (let z = -D / 2; z < D / 2; z += 0.12) {
          if (!isClear(poly, solids, x, z)) continue;
          standable++;
          if (reached(x, z)) got++;
        }
      }
      expect(standable).toBeGreaterThan(0);
      expect(got / standable, `${id}: only ${got}/${standable} cells reachable`).toBeGreaterThan(
        0.9,
      );
    });
  }
});

/**
 * And once in, is the visitor looking at anything?
 *
 * A room can pass every test above — door on the right wall, every cabinet
 * reachable, the floor connected — and still open on a blank wall, which is
 * what Tineo and Polalena did: their equipment is down the other arm of an L
 * and the old aim, straight in from the doorway, framed none of it. The
 * opposite failure is Blimea's, where the walk-in stopped 16 cm off a rack
 * flank and it filled the screen. Both are properties of the plan geometry,
 * so they belong here rather than in a screenshot someone has to look at.
 */
describe('the visitor arrives looking at the equipment', () => {
  /** matches viewer3d.ts's PerspectiveCamera */
  const FOV = 70;
  /** a room big enough that its walls never decide anything, for the unit cases */
  const OPEN: [number, number][] = [
    [-50, -50],
    [50, -50],
    [50, 50],
    [-50, 50],
  ];

  /** Share of cabinet floor area in front of the visitor and not hidden. */
  function inView(solids: Solid[], from: [number, number], dir: [number, number]) {
    const ang = Math.atan2(dir[1], dir[0]);
    const seen = visibleFrom(solids, from);
    let got = 0,
      total = 0;
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i]!;
      const a = (s.x1 - s.x0) * (s.z1 - s.z0);
      total += a;
      if (!seen[i]) continue;
      const b = Math.atan2((s.z0 + s.z1) / 2 - from[1], (s.x0 + s.x1) / 2 - from[0]);
      const d = Math.atan2(Math.sin(b - ang), Math.cos(b - ang));
      if (Math.abs(d) <= (FOV / 2) * (Math.PI / 180)) got += a;
    }
    return total ? got / total : 1;
  }

  for (const [id, room] of Object.entries(ROOMS)) {
    const door = room.doors[0]!;

    it(`${id}: opens on the equipment, not on a blank wall`, () => {
      const { poly, solids } = centred(room);
      const { at, aim } = arriveFrom(poly, solids, door, FOV);
      const share = inView(solids, at, aim);
      /* Blimea's 14% is the floor and it is the plan, not the code: its door
         opens into a 0.70 m aisle beside the OLT block, so most of the room
         is behind the racks whichever way you turn. Straight in from the
         doorway framed 0% of Tineo and 0% of Polalena. */
      expect(
        share,
        `${id}: only ${(share * 100).toFixed(0)}% of the cabinets in view`,
      ).toBeGreaterThan(0.1);
    });

    it(`${id}: has room to see, rather than a cabinet in its face`, () => {
      const { poly, solids } = centred(room);
      const { at, aim } = arriveFrom(poly, solids, door, FOV);
      const open = openness(poly, solids, at, Math.atan2(aim[1], aim[0]), FOV);
      expect(open, `${id}: only ${open.toFixed(2)} m of clear view`).toBeGreaterThan(1.2);
    });

    it(`${id}: is still an arrival through the door`, () => {
      const { poly, solids } = centred(room);
      const { at } = arriveFrom(poly, solids, door, FOV);
      const d = doorway(poly, door);
      /* stepping aside for elbow room must not become picking the best seat */
      expect(Math.hypot(at[0] - d[0], at[1] - d[1])).toBeLessThan(2);
    });
  }

  it('turns towards the equipment when it is all to one side', () => {
    /* cabinets due north of the visitor, who walked in facing east */
    const solids: Solid[] = [
      { x0: -0.5, x1: 0.5, z0: 3, z1: 3.6 },
      { x0: 0.8, x1: 1.4, z0: 3, z1: 3.6 },
    ];
    expect(inView(solids, [0, 0], [1, 0])).toBeLessThan(1);
    expect(inView(solids, [0, 0], arrivalAim(OPEN, solids, [0, 0], FOV, [1, 0]))).toBe(1);
  });

  it('breaks a tie towards the way the visitor walked in', () => {
    /* two identical clusters, one ahead and one behind: face the one ahead */
    const solids: Solid[] = [
      { x0: -0.5, x1: 0.5, z0: 3, z1: 3.6 },
      { x0: -0.5, x1: 0.5, z0: -3.6, z1: -3 },
    ];
    expect(arrivalAim(OPEN, solids, [0, 0], FOV, [0, 1])[1]).toBeGreaterThan(0);
    expect(arrivalAim(OPEN, solids, [0, 0], FOV, [0, -1])[1]).toBeLessThan(0);
  });

  it('centres what it sees instead of leaving it on the frame edge', () => {
    /* a single cabinet 50° off the way in. Preferring the least turn alone
       would stop as soon as it scraped into the cone, at 15°, with the rack
       against the edge of the picture; centred, the aim is on it. */
    const bearing = (50 * Math.PI) / 180;
    const c: [number, number] = [Math.cos(bearing) * 4, Math.sin(bearing) * 4];
    const solids: Solid[] = [{ x0: c[0] - 0.3, x1: c[0] + 0.3, z0: c[1] - 0.3, z1: c[1] + 0.3 }];
    const aim = arrivalAim(OPEN, solids, [0, 0], FOV, [1, 0]);
    expect((Math.atan2(aim[1], aim[0]) * 180) / Math.PI).toBeCloseTo(50, 0);
  });

  it('does not count a cabinet hidden behind another one', () => {
    /* the far one is squarely behind the near one */
    const solids: Solid[] = [
      { x0: -0.5, x1: 0.5, z0: 1, z1: 1.6 },
      { x0: -0.5, x1: 0.5, z0: 3, z1: 3.6 },
    ];
    expect(visibleFrom(solids, [0, 0])).toEqual([true, false]);
    /* and from the side, both are in the clear */
    expect(visibleFrom(solids, [4, 2.3])).toEqual([true, true]);
  });

  it('faces the way in when there is no equipment to face', () => {
    expect(arrivalAim(OPEN, [], [0, 0], FOV, [1, 0])).toEqual([1, 0]);
  });
});
