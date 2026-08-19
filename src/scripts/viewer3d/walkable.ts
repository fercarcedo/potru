/**
 * Where a visitor can stand, and how they get in.
 *
 * Pure geometry, shared by the first-person camera (controls.ts, which used
 * to own it) and by the room data's own tests. Splitting it out is what makes
 * "does this room's walk-in start at the door, and can you reach every
 * cabinet from there?" a question a test can answer — a room whose door sits
 * on the wrong wall, or whose cabinets close the only aisle, otherwise fails
 * silently as a visitor stuck against a wall.
 */
import { pointInPolygon } from './geometry';

export interface Solid {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export interface Door {
  edge: number;
  at: number;
  width: number;
}

/**
 * Body radius. The aisle of a caseta node is only ~0.89 m wide, so a single
 * generous margin left barely 20 cm of walkable band and the visitor got
 * stuck; walls need more clearance than cabinets do.
 */
export const M_WALL = 0.22;
export const M_BAY = 0.14;

/** Can a visitor stand here? Inside the walls, clear of every cabinet. */
export function isClear(poly: [number, number][], solids: Solid[], x: number, z: number): boolean {
  return (
    pointInPolygon(poly, x + M_WALL, z) && pointInPolygon(poly, x - M_WALL, z) &&
    pointInPolygon(poly, x, z + M_WALL) && pointInPolygon(poly, x, z - M_WALL) &&
    !solids.some((s) => x > s.x0 - M_BAY && x < s.x1 + M_BAY &&
                        z > s.z0 - M_BAY && z < s.z1 + M_BAY)
  );
}

/** The middle of a door's opening, in room coordinates. */
export function doorway(poly: [number, number][], door: Door): [number, number] {
  const [x1, z1] = poly[door.edge]!;
  const [x2, z2] = poly[(door.edge + 1) % poly.length]!;
  const ang = Math.atan2(z2 - z1, x2 - x1);
  const mid = door.at + door.width / 2;
  return [x1 + Math.cos(ang) * mid, z1 + Math.sin(ang) * mid];
}

/** The unit vector pointing from a door into the room. */
export function inward(poly: [number, number][], door: Door): [number, number] {
  const [x1, z1] = poly[door.edge]!;
  const [x2, z2] = poly[(door.edge + 1) % poly.length]!;
  const ang = Math.atan2(z2 - z1, x2 - x1);
  const [dx, dz] = doorway(poly, door);
  const nx = -Math.sin(ang), nz = Math.cos(ang);
  const sign = pointInPolygon(poly, dx + nx * 0.1, dz + nz * 0.1) ? 1 : -1;
  return [nx * sign, nz * sign];
}

/** How far in from the door the visitor comes to a stop. */
const WALK_IN = 1.2;

/**
 * Steps in from a door, straight in, until there is room to stand — then to
 * about a stride and a half inside. Returns where the visitor ends up, or
 * null if the doorway never opens up, which is what "the view does not start
 * at the door" looks like from here.
 *
 * Straight in, not towards the middle of the room: aiming at the centre walks
 * a diagonal, and in Blimea that put the visitor's nose 16 cm from a rack.
 */
export function walkInFrom(
  poly: [number, number][], solids: Solid[], start: [number, number], dir?: [number, number]
): [number, number] | null {
  const paths: [number, number][] = [];
  if (dir) paths.push(dir);
  /* fall back to the old aim at the room's origin if straight in is blocked */
  const len = Math.hypot(start[0], start[1]);
  if (len > 1e-6) paths.push([-start[0] / len, -start[1] / len]);

  for (const [dx, dz] of paths) {
    let landed: [number, number] | null = null;
    for (let t = 0.05; t <= 3; t += 0.05) {
      const cx = start[0] + dx * t, cz = start[1] + dz * t;
      if (!isClear(poly, solids, cx, cz)) {
        if (landed) break;      /* blocked before we ever got in: try the next aim */
        continue;
      }
      landed = [cx, cz];
      if (t >= WALK_IN) break;
    }
    if (landed) return landed;
  }
  return null;
}

/**
 * Flood-fills the standable floor from `from` on a grid of `cell` metres.
 * Returns a predicate: can the visitor get from `from` to (x, z)?
 */
export function reachableFrom(
  poly: [number, number][], solids: Solid[], from: [number, number], cell = 0.06
): (x: number, z: number) => boolean {
  const key = (i: number, j: number) => `${i},${j}`;
  const seen = new Set<string>();
  const i0 = Math.round(from[0] / cell), j0 = Math.round(from[1] / cell);
  const queue: [number, number][] = [[i0, j0]];
  seen.add(key(i0, j0));
  /* the room is a few metres across: a plain BFS over ~10^4 cells is fine */
  for (let head = 0; head < queue.length; head++) {
    const [i, j] = queue[head]!;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const ni = i + di, nj = j + dj, k = key(ni, nj);
      if (seen.has(k)) continue;
      seen.add(k);
      if (isClear(poly, solids, ni * cell, nj * cell)) queue.push([ni, nj]);
    }
  }
  return (x, z) => seen.has(key(Math.round(x / cell), Math.round(z / cell)))
    && isClear(poly, solids, Math.round(x / cell) * cell, Math.round(z / cell) * cell);
}
