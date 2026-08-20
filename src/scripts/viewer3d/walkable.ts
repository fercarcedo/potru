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
    pointInPolygon(poly, x + M_WALL, z) &&
    pointInPolygon(poly, x - M_WALL, z) &&
    pointInPolygon(poly, x, z + M_WALL) &&
    pointInPolygon(poly, x, z - M_WALL) &&
    !solids.some(
      (s) => x > s.x0 - M_BAY && x < s.x1 + M_BAY && z > s.z0 - M_BAY && z < s.z1 + M_BAY,
    )
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
  const nx = -Math.sin(ang),
    nz = Math.cos(ang);
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
  poly: [number, number][],
  solids: Solid[],
  start: [number, number],
  dir?: [number, number],
): [number, number] | null {
  const paths: [number, number][] = [];
  if (dir) paths.push(dir);
  /* fall back to the old aim at the room's origin if straight in is blocked */
  const len = Math.hypot(start[0], start[1]);
  if (len > 1e-6) paths.push([-start[0] / len, -start[1] / len]);

  for (const [dx, dz] of paths) {
    let landed: [number, number] | null = null;
    for (let t = 0.05; t <= 3; t += 0.05) {
      const cx = start[0] + dx * t,
        cz = start[1] + dz * t;
      if (!isClear(poly, solids, cx, cz)) {
        if (landed) break; /* blocked before we ever got in: try the next aim */
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
  poly: [number, number][],
  solids: Solid[],
  from: [number, number],
  cell = 0.06,
): (x: number, z: number) => boolean {
  const key = (i: number, j: number) => `${i},${j}`;
  const seen = new Set<string>();
  const i0 = Math.round(from[0] / cell),
    j0 = Math.round(from[1] / cell);
  const queue: [number, number][] = [[i0, j0]];
  seen.add(key(i0, j0));
  /* the room is a few metres across: a plain BFS over ~10^4 cells is fine */
  for (let head = 0; head < queue.length; head++) {
    const [i, j] = queue[head]!;
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const ni = i + di,
        nj = j + dj,
        k = key(ni, nj);
      if (seen.has(k)) continue;
      seen.add(k);
      if (isClear(poly, solids, ni * cell, nj * cell)) queue.push([ni, nj]);
    }
  }
  return (x, z) =>
    seen.has(key(Math.round(x / cell), Math.round(z / cell))) &&
    isClear(poly, solids, Math.round(x / cell) * cell, Math.round(z / cell) * cell);
}

/** How much coverage a heading may give up to face nearer the way in. */
const TIE = 0.02;

/** Metres of clear floor a heading needs, averaged across the frame. */
const MIN_AHEAD = 1.2;
/** Rays cast across the field of view to measure that. */
const FAN = 9;
/** Far enough that nothing beyond it changes a decision. */
const FAR = 12;

/**
 * How much room a heading has to see: the mean distance to the first wall or
 * cabinet over `FAN` rays spread across the field of view.
 *
 * The centre ray alone is not enough. The PAO's arrival faces a gap between
 * two operator cages: straight ahead the corridor runs three metres, while
 * the cages themselves are half a metre off each shoulder and fill the
 * screen. Averaged across the frame that heading scores for what it is.
 */
export function openness(
  poly: [number, number][],
  solids: Solid[],
  from: [number, number],
  ang: number,
  fovDeg: number,
): number {
  let sum = 0;
  for (let i = 0; i < FAN; i++) {
    const t = i / (FAN - 1);
    sum += seeing(poly, solids, from, ang + (t - 0.5) * fovDeg * (Math.PI / 180));
  }
  return sum / FAN;
}

/**
 * How far the eye travels along `ang` from `from` before a cabinet or a wall
 * stops it.
 */
export function seeing(
  poly: [number, number][],
  solids: Solid[],
  from: [number, number],
  ang: number,
): number {
  const dx = Math.cos(ang),
    dz = Math.sin(ang);
  for (let t = 0.05; t <= FAR; t += 0.05) {
    const x = from[0] + dx * t,
      z = from[1] + dz * t;
    if (!pointInPolygon(poly, x, z)) return t;
    if (solids.some((s) => x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1)) return t;
  }
  return FAR;
}

/**
 * Does the segment a→b cross this cabinet? Liang–Barsky against the footprint,
 * which is axis-aligned, so the slab clip is exact and there is no reason to
 * sample the segment and hope.
 */
function crosses(ax: number, az: number, bx: number, bz: number, s: Solid): boolean {
  const dx = bx - ax,
    dz = bz - az;
  let t0 = 0,
    t1 = 1;
  const edges: [number, number][] = [
    [-dx, ax - s.x0],
    [dx, s.x1 - ax],
    [-dz, az - s.z0],
    [dz, s.z1 - az],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      /* parallel to this slab: outside it means the whole segment misses */
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
  }
  return t0 < t1;
}

/**
 * Which cabinets can be seen from a spot, by index.
 *
 * Bearing and area alone say a rack 25 cm from the visitor's nose is worth its
 * footprint, when in fact it is the whole picture and hides everything behind
 * it — which is exactly what Blimea's arrival looked like. A cabinet counts
 * only if no other cabinet stands between it and the visitor.
 */
export function visibleFrom(solids: Solid[], from: [number, number]): boolean[] {
  return solids.map((s, i) => {
    const cx = (s.x0 + s.x1) / 2,
      cz = (s.z0 + s.z1) / 2;
    return !solids.some((o, j) => j !== i && crosses(from[0], from[1], cx, cz, o));
  });
}

/** Shortest signed difference between two bearings, in radians. */
const delta = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/**
 * Which way to face on arrival: the heading that puts the most equipment in
 * view, as a unit vector.
 *
 * Three simpler rules were each wrong on the rooms the others handled. The
 * middle of the bounding box is Blimea's inner corner. Straight in from the
 * doorway is a blank wall in Tineo, where the racks are down the other arm of
 * the L — 96 degrees off. And the equipment's own centre of area, the obvious
 * repair, is worse in a caseta: the bays line both long walls, so their
 * centroid is the middle of the aisle the visitor is standing in, and aiming
 * at it turns them sideways to a room they should be looking down.
 *
 * All three approximate "look at the equipment", so measure that instead of
 * approximating it: sweep the circle and keep the heading with the largest
 * share of cabinet floor area inside the camera's horizontal field of view.
 * Near-equal headings go to whichever is closest to the way the visitor
 * walked in, because that is the one that needs no explaining.
 *
 * `total` is every cabinet, but only the ones `visibleFrom` reports are ever
 * scored, so a heading into the back of a rack is worth what it looks like.
 */
export function arrivalAim(
  poly: [number, number][],
  solids: Solid[],
  from: [number, number],
  fovDeg: number,
  way?: [number, number] | false,
): [number, number] {
  const fallback: [number, number] = way || [0, 1];
  const half = (fovDeg / 2) * (Math.PI / 180);
  /* each cabinet reduced to (bearing from where we stand, floor area) */
  const bays: [number, number][] = [];
  let total = 0;
  const seen = visibleFrom(solids, from);
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i]!;
    const a = (s.x1 - s.x0) * (s.z1 - s.z0);
    total += a;
    if (!seen[i]) continue;
    const px = (s.x0 + s.x1) / 2 - from[0],
      pz = (s.z0 + s.z1) / 2 - from[1];
    /* a cabinet we are standing inside has no bearing to speak of */
    if (Math.hypot(px, pz) < 1e-6) continue;
    bays.push([Math.atan2(pz, px), a]);
  }
  if (!total || !bays.length) return fallback;

  const wayAng = Math.atan2(fallback[1], fallback[0]);
  /* one degree is finer than the difference any of this makes to a visitor */
  const scored: [number, number][] = [];
  let max = 0;
  for (let d = 0; d < 360; d++) {
    const ang = (d * Math.PI) / 180;
    let share = 0;
    for (const [b, a] of bays) if (Math.abs(delta(b, ang)) <= half) share += a;
    share /= total;
    if (share > max) max = share;
    scored.push([ang, share]);
  }
  /* A heading with a cabinet right in front of it is worthless however much
     area it nominally covers — that is Blimea, where the racks flanking the
     aisle score well from half a metre away and fill the screen with painted
     steel. Prefer headings with room to see; drop the requirement only if the
     visitor really is boxed in. */
  const roomy = scored.filter(([ang]) => openness(poly, solids, from, ang, fovDeg) >= MIN_AHEAD);
  const usable = roomy.length ? roomy : scored;
  const ceiling = Math.max(...usable.map(([, share]) => share));

  let bestAng = wayAng,
    bestTurn = Infinity;
  for (const [ang, share] of usable) {
    if (share < ceiling - TIE) continue;
    const turn = Math.abs(delta(ang, wayAng));
    if (turn < bestTurn) {
      bestTurn = turn;
      bestAng = ang;
    }
  }

  /* Centre what that heading sees. Preferring the least turn walks the
     heading out to the edge of the plateau, which leaves the outermost rack
     sliced in half by the edge of the picture; re-centring on the bays
     actually in view costs no coverage — the spread is unchanged, it just
     stops being lopsided — and it is the difference between a composed
     opening shot and one that looks like a mistake. It is only a nicety
     though, so it never buys that at the cost of the room to see that the
     heading was chosen for. */
  let lo = Infinity,
    hi = -Infinity;
  for (const [b] of bays) {
    const d = delta(b, bestAng);
    if (Math.abs(d) > half) continue;
    lo = Math.min(lo, d);
    hi = Math.max(hi, d);
  }
  if (lo <= hi) {
    const centred = bestAng + (lo + hi) / 2;
    const kept = roomy.length === 0 || openness(poly, solids, from, centred, fovDeg) >= MIN_AHEAD;
    if (kept) bestAng = centred;
  }

  return [Math.cos(bestAng), Math.sin(bestAng)];
}

/** How far to either side of the walk-in the visitor may be nudged. */
const ASIDE = 1.2;
/** Step of that sideways search. */
const STEP = 0.05;
/** Elbow room: nearer than this to a cabinet and the visitor shuffles over. */
const COMFORT = 0.45;

export interface Arrival {
  /** where the visitor is standing */
  at: [number, number];
  /** the unit vector they are facing */
  aim: [number, number];
}

/**
 * Where the visitor comes to a stop, and which way they face.
 *
 * `walkInFrom` answers the first half honestly — straight in from the door
 * until there is room to stand — but "room to stand" is the collision margin,
 * `M_BAY`, which is the width you can squeeze through and not the width you
 * want to stop in. Blimea's door opens into the 1.15 m aisle between the left
 * wall and a two-deep block of OLT racks, and walking straight in left the
 * visitor 16 cm off the rack flank, looking at painted steel.
 *
 * So after walking in, if the visitor has ended up within `COMFORT` of
 * something, they shuffle over — the least distance that buys elbow room on
 * both sides, or the middle of the gap when it is too narrow for that. Only
 * when they are actually cramped: centring unconditionally moved the PAO's
 * arrival, which had five metres of corridor ahead of it, into the mouth
 * between two operator cages, and a green cage panel filled the screen.
 */
export function arriveFrom(
  poly: [number, number][],
  solids: Solid[],
  door: Door,
  fovDeg: number,
): Arrival {
  const start = doorway(poly, door);
  const way = inward(poly, door);
  const base = walkInFrom(poly, solids, start, way);
  if (!base) return { at: start, aim: way };

  /* across the way in, since that is the direction the walk had no freedom in */
  const sx = -way[1],
    sz = way[0];
  let lo = 0,
    hi = 0;
  while (
    lo > -ASIDE &&
    isClear(poly, solids, base[0] + sx * (lo - STEP), base[1] + sz * (lo - STEP))
  )
    lo -= STEP;
  while (
    hi < ASIDE &&
    isClear(poly, solids, base[0] + sx * (hi + STEP), base[1] + sz * (hi + STEP))
  )
    hi += STEP;
  /* stay put if there is already room on both sides; otherwise move the least
     that gets it, and settle for the middle when the gap is too tight */
  let off = 0;
  if (lo > -COMFORT || hi < COMFORT) {
    off = hi - lo < 2 * COMFORT ? (lo + hi) / 2 : Math.max(lo + COMFORT, Math.min(0, hi - COMFORT));
  }
  const at: [number, number] = [base[0] + sx * off, base[1] + sz * off];

  return { at, aim: arrivalAim(poly, solids, at, fovDeg, way) };
}
