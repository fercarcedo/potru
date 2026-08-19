/**
 * The unit builders of src/scripts/viewer3d/equipment.ts.
 *
 * Every rack-mounted unit fills a band of a cabinet, and the bay loop picks
 * one by name out of a table. Getting the name wrong, or handing a builder a
 * band it cannot fit anything into, produces no error at all — just an empty
 * cabinet in the viewer, which is exactly the failure these tests catch.
 *
 * The materials are built here rather than by buildFinishes(), which needs a
 * 2D canvas context happy-dom does not provide.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createEquipmentBuilders } from '../../src/scripts/viewer3d/equipment';
import type { Finishes, RoomMaterials } from '../../src/scripts/viewer3d/textures';

/** any finish/material name resolves to the same plain stub */
const proxy = <T extends object>() => {
  const made: Record<string, THREE.Material> = {};
  return new Proxy(
    {},
    {
      get: (_t, k: string | symbol) =>
        (made[String(k)] ??= new THREE.MeshLambertMaterial({ color: 0x888888 })),
    },
  ) as T;
};

function builders() {
  const scene = new THREE.Scene();
  return { scene, b: createEquipmentBuilders(scene, proxy<RoomMaterials>(), proxy<Finishes>()) };
}

/** every mesh under the group, however deeply nested */
function meshes(o: THREE.Object3D): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) out.push(c);
  });
  return out;
}

const UNITS = ['odfUnit', 'dwdmUnit', 'splitterUnit', 'videoUnit', 'txCubeUnit'] as const;

describe('rack units', () => {
  for (const name of UNITS) {
    it(`${name} fills a full-height band with equipment`, () => {
      const { b } = builders();
      const g = new THREE.Group();
      b[name](g, 0.6, 0.3, 0.3, 1.85, 1);
      expect(meshes(g).length).toBeGreaterThan(5);
    });

    it(`${name} still builds something in a band only 25 cm tall`, () => {
      const { b } = builders();
      const g = new THREE.Group();
      b[name](g, 0.6, 0.3, 0.3, 0.55, 1);
      expect(meshes(g).length).toBeGreaterThan(0);
    });

    it(`${name} keeps everything inside the band it was given`, () => {
      const { b } = builders();
      const g = new THREE.Group();
      b[name](g, 0.6, 0.3, 0.4, 1.6, 1);
      /* 15 cm of slack: bezels and slack patch cords do sit proud of the
         band's edge, but a unit must not spill into its neighbour's U space */
      const bb = new THREE.Box3().setFromObject(g);
      expect(bb.min.y).toBeGreaterThan(0.4 - 0.15);
      expect(bb.max.y).toBeLessThan(1.6 + 0.15);
    });
  }

  it('the splitter is passive: it lights no lamps, unlike the DWDM shelf', () => {
    const sp = builders();
    sp.b.splitterUnit(new THREE.Group(), 0.6, 0.3, 0.3, 1.85, 1);
    expect(sp.b.leds).toHaveLength(0);

    const tx = builders();
    tx.b.dwdmUnit(new THREE.Group(), 0.6, 0.3, 0.3, 1.85, 1);
    expect(tx.b.leds.length).toBeGreaterThan(0);
  });
});

describe('rejiband', () => {
  it('runs between two points at any angle, horizontal or vertical', () => {
    for (const [a, b2] of [
      [
        [0, 2.2, 0],
        [3, 2.2, 0],
      ],
      [
        [0, 2.2, 0],
        [0, 2.2, 2],
      ],
      [
        [1, 2.2, 1],
        [1, 0.1, 1],
      ] /* a «bajada»: straight down */,
    ] as const) {
      const { b } = builders();
      const g = b.rejiband([...a], [...b2]);
      expect(g, `${a.join(',')} → ${b2.join(',')}`).toBeTruthy();
      expect(meshes(g!).length).toBeGreaterThan(4);
    }
  });

  it('skips a run too short to be a tray', () => {
    const { b } = builders();
    expect(b.rejiband([0, 2.2, 0], [0.1, 2.2, 0])).toBeUndefined();
  });
});

describe('floor duct covers', () => {
  it('lays one cover per «tapa», flush with the slab', () => {
    const { scene, b } = builders();
    b.hatchRun(0.6, 0.7, 0.445, 0.595, 6);
    const ms = meshes(scene);
    /* the duct recess, plus a plate and two handles per cover */
    expect(ms.length).toBe(1 + 6 * 3);
    for (const m of ms) expect(Math.abs(m.position.y)).toBeLessThan(0.05);
  });
});
