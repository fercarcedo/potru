/**
 * Decides which way each cabinet faces. Pure geometry: no THREE.js, no
 * scene — just the room outline and each bay's footprint, so it is testable
 * without a renderer. Split out of viewer3d.ts's buildRoom() verbatim.
 *
 * Comparing a cabinet against the middle of the room made a free-standing
 * row like Blimea's face two ways at once, so instead this measures how
 * much open floor there is on each side and fronts onto the roomier one.
 * Cabinets that touch form one block and must face the same way: deciding
 * bay by bay made Blimea's near-square OLT grid face in opposite
 * directions, so touching footprints are unioned first and the block's own
 * proportions choose the facing axis.
 */
import { pointInPolygon } from './geometry';

export interface Footprint {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface Solid {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export interface CabinetOrientation {
  rot: number;
  faceW: number;
  faceD: number;
}

/**
 * @param bays room.bays, or anything shaped like a footprint — the returned
 *   Map is keyed by the same object references, so callers can `.get(bay)`.
 * @param poly the room outline, centred (same as buildRoom's `poly`).
 * @param solids every bay's footprint, offset the same way as `poly` —
 *   what a cabinet's openness probe must not cross.
 * @param W, D the room's full width/depth (bay coordinates are plan-relative).
 */
export function computeOrientations<T extends Footprint>(
  bays: T[],
  poly: [number, number][],
  solids: Solid[],
  W: number,
  D: number
): Map<T, CabinetOrientation> {
  const inPoly = (x: number, z: number) => pointInPolygon(poly, x, z);
  const openAt = (x: number, z: number) =>
    inPoly(x, z) && !solids.some((s) => x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1);
  const openness = (x: number, z: number, dx: number, dz: number) => {
    let d = 0;
    for (let t = 0.12; t <= 1.5; t += 0.12) { if (!openAt(x + dx * t, z + dz * t)) break; d = t; }
    return d;
  };

  const orientOf = new Map<T, CabinetOrientation>();

  const boxes = bays.map((b) => ({
    bay: b, x0: b.x - W / 2, x1: b.x - W / 2 + b.w,
    z0: b.z - D / 2, z1: b.z - D / 2 + b.d,
  }));
  /* union-find over cabinets whose footprints touch, within 16 cm */
  const parent = boxes.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  const T = 0.16;
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!, b = boxes[j]!;
      if (a.x0 - T < b.x1 && b.x0 - T < a.x1 && a.z0 - T < b.z1 && b.z0 - T < a.z1)
        parent[find(i)] = find(j);
    }
  const blocks = new Map<number, typeof boxes>();
  boxes.forEach((b, i) => {
    const r = find(i);
    (blocks.get(r) ?? blocks.set(r, []).get(r)!).push(b);
  });
  for (const members of blocks.values()) {
    const x0 = Math.min(...members.map((m) => m.x0)), x1 = Math.max(...members.map((m) => m.x1));
    const z0 = Math.min(...members.map((m) => m.z0)), z1 = Math.max(...members.map((m) => m.z1));
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const alongZ = z1 - z0 > (x1 - x0) * 1.15;
    let rot: number;
    if (alongZ) {
      rot = openness(x1, cz, 1, 0) >= openness(x0, cz, -1, 0) ? Math.PI / 2 : -Math.PI / 2;
    } else {
      rot = openness(cx, z1, 0, 1) >= openness(cx, z0, 0, -1) ? 0 : Math.PI;
    }
    for (const m of members) {
      orientOf.set(m.bay, alongZ
        ? { rot, faceW: m.bay.d, faceD: m.bay.w }
        : { rot, faceW: m.bay.w, faceD: m.bay.d });
    }
  }

  return orientOf;
}
