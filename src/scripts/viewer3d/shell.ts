/**
 * The room's envelope: floor, ceiling, one wall per outline edge with door
 * gaps, an exit sign over each door, the ceiling cable tray and the four
 * lights. Split out of viewer3d.ts's buildRoom() verbatim — the one thing
 * it hands back is `halo`, which the mode-toggle button dims/brightens.
 */
import * as THREE from 'three';
import type { EquipmentBuilders } from './equipment';
import type { RoomMaterials } from './textures';

export interface Door {
  edge: number;
  at: number;
  width: number;
}

/** three ≥155 reads light intensity in physical units, so the r128-era
 *  values the palette was tuned against need scaling by π to look the same.
 *  Exported because the mode-toggle button (viewer3d.ts) also scales the
 *  halo's intensity by it when switching to the renewed view. */
export const LX = Math.PI;

export interface ShellDeps {
  scene: THREE.Scene;
  mat: RoomMaterials;
  /** the room outline, centred (same as buildRoom's `poly`) */
  poly: [number, number][];
  doors: Door[];
  /** room width, depth and free height */
  W: number;
  D: number;
  H: number;
  box: EquipmentBuilders['box'];
  label: EquipmentBuilders['label'];
}

export function buildShell(deps: ShellDeps): { halo: THREE.PointLight } {
  const { scene, mat, poly, doors, W, D, H, box, label } = deps;

  /* ---- shell: floor, ceiling and one wall per outline edge, with door gaps ---- */
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, z)));
  const floorGeo = new THREE.ShapeGeometry(shape);
  const floor = new THREE.Mesh(floorGeo, mat.floor);
  floor.rotation.x = Math.PI / 2;
  scene.add(floor);
  const ceil = new THREE.Mesh(floorGeo.clone(), mat.ceil);
  ceil.rotation.x = -Math.PI / 2;
  ceil.position.y = H;
  scene.add(ceil);

  poly.forEach(([x1, z1], i) => {
    const [x2, z2] = poly[(i + 1) % poly.length]!;
    const len = Math.hypot(x2 - x1, z2 - z1);
    const ang = Math.atan2(z2 - z1, x2 - x1);
    const door = doors.find((d) => d.edge === i);
    /* a door splits its wall into the two stretches either side of the opening */
    const spans: [number, number][] = door
      ? [[0, door.at], [door.at + door.width, len]]
      : [[0, len]];
    for (const [from, to] of spans) {
      if (to - from < 0.02) continue;
      const mid = (from + to) / 2;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(to - from, H), mat.wall);
      p.position.set(x1 + Math.cos(ang) * mid, H / 2, z1 + Math.sin(ang) * mid);
      p.rotation.y = -ang;
      scene.add(p);
    }
    if (door) {
      const mid = door.at + door.width / 2;
      const dx = x1 + Math.cos(ang) * mid, dz = z1 + Math.sin(ang) * mid;
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(door.width, 2.05), mat.door);
      frame.position.set(dx, 1.025, dz);
      frame.rotation.y = -ang;
      scene.add(frame);
      label('SALIDA', 0.5, dx, 2.25, dz, -ang, '#2a5c55');
    }
  });

  /* ceiling tray and lights, following the long axis of the room */
  const along = W >= D;
  for (let i = 0; i < Math.max(2, Math.round((along ? W : D) / 1.8)); i++) {
    const t = (i + 0.5) / Math.max(2, Math.round((along ? W : D) / 1.8));
    const x = along ? -W / 2 + t * W : 0;
    const z = along ? 0 : -D / 2 + t * D;
    box(along ? 1.1 : 0.16, 0.05, along ? 0.16 : 1.1,
      new THREE.MeshBasicMaterial({ color: 0xeef6f4 }), x, H - 0.04, z);
  }
  scene.add(new THREE.AmbientLight(0xf2f4f6, 0.66 * LX));
  const dl = new THREE.DirectionalLight(0xffffff, 0.42 * LX);
  dl.position.set(2, 4, 2);
  scene.add(dl);
  const fill = new THREE.DirectionalLight(0xdfe8f2, 0.22 * LX);
  fill.position.set(-2, 3, -2);
  scene.add(fill);
  const halo = new THREE.PointLight(0x41e3d2, 0, 9);
  halo.position.set(0, H - 0.5, 0);
  scene.add(halo);

  return { halo };
}
