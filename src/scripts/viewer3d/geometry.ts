/**
 * Point-in-polygon (ray casting) against the room's outline. Used by both
 * the cabinet-orientation solver (orientation.ts, probing how much open
 * floor sits on each side of a cabinet) and the camera collision check
 * (controls.ts, keeping the visitor inside the walls) — previously two
 * copies of the exact same function, one per file.
 */
export function pointInPolygon(poly: [number, number][], x: number, z: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]!, [xj, zj] = poly[j]!;
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}
