/**
 * Invariants over src/data/rooms.json, transcribed by hand in metres from
 * each node's *-planta.jpg (see docs/FUENTES.md). These check the geometry
 * is self-consistent enough for the 3D viewer to render it without falling
 * back to guesses.
 */
import { describe, expect, it } from 'vitest';
import rooms from '../../src/data/rooms.json';
import { ALL_NODES, byId } from '../../src/lib/data';

type Point = [number, number];
interface Door {
  edge: number;
  at: number;
  width: number;
}
interface Bay {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  y?: number;
  kind: string;
  label: string;
  olts?: number[];
  units?: string[];
}
interface Tray {
  level?: 'ceiling' | 'floor' | number;
  pts: Point[];
  w?: number;
  to?: 'ceiling' | 'floor' | number;
}
interface Hatch {
  x: number;
  z: number;
  w: number;
  d: number;
  n?: number;
}
interface Vent {
  edge: number;
  at: number;
  w: number;
  h?: number;
  y?: number;
}
interface Room {
  source: string;
  h: number;
  outline: Point[];
  doors: Door[];
  vents?: Vent[];
  bays: Bay[];
  trays?: Tray[];
  hatches?: Hatch[];
}

const ROOMS = rooms as unknown as Record<string, Room>;

// Kinds src/scripts/viewer3d.ts actually renders (either a dedicated mesh
// branch, or the generic boxed-cabinet fallback with a COLOR table entry).
const KNOWN_BAY_KINDS = new Set([
  'cabinet', 'power', 'olt', 'splitter', 'odf', 'transport',
  'cgbt', 'acdist', 'empty', 'rack', 'battery', 'ac', 'ups', 'catv', 'cage',
]);

// The rack-mounted units a cabinet can hold, mirroring viewer3d.ts's
// UNIT_WEIGHT / UNIT_BUILDER tables. A typo here would otherwise leave a
// cabinet silently empty rather than fail.
const KNOWN_UNITS = new Set(['olt', 'odf', 'dwdm', 'splitter', 'video', 'txcube']);

function polygonArea(pts: Point[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[(i + 1) % pts.length]!;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function bbox(pts: Point[]) {
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}

describe('room roster', () => {
  it('has exactly one entry per node id, PAO included', () => {
    const ids = ALL_NODES.map((n) => n.id);
    expect(Object.keys(ROOMS).sort()).toEqual([...ids].sort());
  });
});

describe('room outlines', () => {
  for (const [id, room] of Object.entries(ROOMS)) {
    it(`${id}: outline is a closed simple polygon with positive area`, () => {
      expect(room.outline.length).toBeGreaterThanOrEqual(3);
      expect(polygonArea(room.outline)).toBeGreaterThan(0);
    });

    it(`${id}: ceiling height is positive`, () => {
      expect(room.h).toBeGreaterThan(0);
    });
  }
});

describe('doors sit on a real outline edge', () => {
  for (const [id, room] of Object.entries(ROOMS)) {
    for (const [i, door] of room.doors.entries()) {
      it(`${id}: door ${i} (edge ${door.edge}) fits within its edge's length`, () => {
        expect(door.edge).toBeGreaterThanOrEqual(0);
        expect(door.edge).toBeLessThan(room.outline.length);
        const a = room.outline[door.edge]!;
        const b = room.outline[(door.edge + 1) % room.outline.length]!;
        const edgeLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
        expect(door.width).toBeGreaterThan(0);
        expect(door.at).toBeGreaterThanOrEqual(0);
        expect(door.at + door.width).toBeLessThanOrEqual(edgeLen + 1e-6);
      });
    }
  }
});

describe('bays', () => {
  for (const [id, room] of Object.entries(ROOMS)) {
    const box = bbox(room.outline);

    for (const [i, bay] of room.bays.entries()) {
      it(`${id}: bay ${i} (${bay.kind}) has a known kind`, () => {
        expect(KNOWN_BAY_KINDS.has(bay.kind), `unknown kind "${bay.kind}"`).toBe(true);
      });

      it(`${id}: bay ${i} (${bay.kind}) has positive footprint and height`, () => {
        expect(bay.w).toBeGreaterThan(0);
        expect(bay.d).toBeGreaterThan(0);
        expect(bay.h).toBeGreaterThan(0);
      });

      it(`${id}: bay ${i} (${bay.kind}) fits within the room's bounding box`, () => {
        expect(bay.x).toBeGreaterThanOrEqual(box.minX - 1e-6);
        expect(bay.x + bay.w).toBeLessThanOrEqual(box.maxX + 1e-6);
        expect(bay.z).toBeGreaterThanOrEqual(box.minZ - 1e-6);
        expect(bay.z + bay.d).toBeLessThanOrEqual(box.maxZ + 1e-6);
      });

      if (bay.olts?.length) {
        it(`${id}: bay ${i}'s olts[] indices exist on the node`, () => {
          const node = byId[id]!;
          for (const oltIndex of bay.olts!) {
            expect(node.olts[oltIndex], `${id} has no olts[${oltIndex}]`).toBeTruthy();
          }
        });
      }

      if (bay.units) {
        it(`${id}: bay ${i} (${bay.label}) lists units the viewer can build`, () => {
          expect(bay.units!.length).toBeGreaterThan(0);
          for (const u of bay.units!) {
            expect(KNOWN_UNITS.has(u), `unknown unit "${u}"`).toBe(true);
          }
          // an 'olt' unit is what draws the chassis, so the bay has to say
          // which OLTs of the node it holds
          if (bay.units!.includes('olt')) expect(bay.olts?.length).toBeGreaterThan(0);
        });
      }
    }
  }
});

describe('rejiband runs', () => {
  for (const [id, room] of Object.entries(ROOMS)) {
    const box = bbox(room.outline);
    for (const [i, tray] of (room.trays ?? []).entries()) {
      it(`${id}: tray ${i} is a polyline inside the room`, () => {
        expect(tray.pts.length).toBeGreaterThanOrEqual(2);
        for (const [x, z] of tray.pts) {
          expect(x).toBeGreaterThanOrEqual(box.minX - 1e-6);
          expect(x).toBeLessThanOrEqual(box.maxX + 1e-6);
          expect(z).toBeGreaterThanOrEqual(box.minZ - 1e-6);
          expect(z).toBeLessThanOrEqual(box.maxZ + 1e-6);
        }
      });

      it(`${id}: tray ${i} has no zero-length segment`, () => {
        for (let j = 0; j + 1 < tray.pts.length; j++) {
          const a = tray.pts[j]!, b = tray.pts[j + 1]!;
          expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeGreaterThan(0.05);
        }
      });

      if (tray.to !== undefined) {
        it(`${id}: tray ${i}'s drop goes somewhere else`, () => {
          expect(tray.to).not.toBe(tray.level ?? 'ceiling');
        });
      }
    }
  }
});

describe('floor duct covers («tapas»)', () => {
  for (const [id, room] of Object.entries(ROOMS)) {
    const box = bbox(room.outline);
    for (const [i, hatch] of (room.hatches ?? []).entries()) {
      const runW = hatch.w * (hatch.n ?? 1);

      it(`${id}: hatch ${i} fits within the room's bounding box`, () => {
        expect(hatch.w).toBeGreaterThan(0);
        expect(hatch.d).toBeGreaterThan(0);
        expect(hatch.x).toBeGreaterThanOrEqual(box.minX - 1e-6);
        expect(hatch.x + runW).toBeLessThanOrEqual(box.maxX + 1e-6);
        expect(hatch.z).toBeGreaterThanOrEqual(box.minZ - 1e-6);
        expect(hatch.z + hatch.d).toBeLessThanOrEqual(box.maxZ + 1e-6);
      });

      it(`${id}: hatch ${i} is in the aisle, not under a cabinet`, () => {
        for (const bay of room.bays) {
          const clear = hatch.x + runW <= bay.x + 1e-6 || bay.x + bay.w <= hatch.x + 1e-6
            || hatch.z + hatch.d <= bay.z + 1e-6 || bay.z + bay.d <= hatch.z + 1e-6;
          expect(clear, `overlaps "${bay.label}"`).toBe(true);
        }
      });
    }
  }
});

describe('wall vents', () => {
  for (const [id, room] of Object.entries(ROOMS)) {
    for (const [i, vent] of (room.vents ?? []).entries()) {
      it(`${id}: vent ${i} fits within its edge`, () => {
        expect(vent.edge).toBeGreaterThanOrEqual(0);
        expect(vent.edge).toBeLessThan(room.outline.length);
        const a = room.outline[vent.edge]!;
        const b = room.outline[(vent.edge + 1) % room.outline.length]!;
        const edgeLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
        expect(vent.w).toBeGreaterThan(0);
        expect(vent.at).toBeGreaterThanOrEqual(0);
        expect(vent.at + vent.w).toBeLessThanOrEqual(edgeLen + 1e-6);
      });

      it(`${id}: vent ${i} does not sit in a doorway`, () => {
        for (const door of room.doors) {
          if (door.edge !== vent.edge) continue;
          const clear = vent.at + vent.w <= door.at + 1e-6
            || door.at + door.width <= vent.at + 1e-6;
          expect(clear, `vent ${i} overlaps a door on edge ${vent.edge}`).toBe(true);
        }
      });
    }
  }
});
