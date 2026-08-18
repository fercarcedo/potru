/**
 * Builders for every piece of equipment a room can contain: the generic
 * box/label/cord/portLed primitives, and the per-kind bay builders (romBay,
 * cgbtBay, transportBay, powerBay, batteryBay, chassis, rejiband) that use
 * them. Split out of viewer3d.ts's buildRoom() verbatim, as one factory so
 * the handful of things every builder needs — the scene, the room's
 * materials and finishes, and the accumulated LED list a builder feeds into
 * — stay a single explicit dependency instead of ~15 closure captures.
 */
import * as THREE from 'three';
import type { Olt } from '../../lib/data';
import { cv } from './textures';
import type { Finishes, RoomMaterials } from './textures';

export interface Led {
  m: THREE.Mesh;
  base: number;
  ph: number;
}

export interface EquipmentBuilders {
  box(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, parent?: THREE.Object3D): THREE.Mesh;
  label(text: string, wm: number, x: number, y: number, z: number, ry: number, color?: string): THREE.Mesh;
  portLed(x: number, y: number, z: number, parent: THREE.Object3D, on: boolean, role?: 'gpon-port' | 'status'): void;
  cord(pts: [number, number, number][], parent: THREE.Object3D, m?: THREE.Material, r?: number): void;
  rackFrame(g: THREE.Object3D, w: number, h: number, fz: number, base: number): void;
  romBay(g: THREE.Object3D, w: number, h: number, fz: number, base: number, front: number): void;
  cgbtBay(g: THREE.Object3D, w: number, h: number, d: number, fz: number, base: number): void;
  transportBay(g: THREE.Object3D, w: number, h: number, fz: number, base: number): void;
  powerBay(g: THREE.Object3D, w: number, h: number, fz: number, base: number): void;
  batteryBay(g: THREE.Object3D, w: number, h: number, d: number, base: number): void;
  chassis(o: Olt, g: THREE.Object3D, w: number, y: number, h: number, front: number): void;
  rejiband(x0: number, z0: number, x1: number, z1: number, y: number, wTray?: number): THREE.Group | undefined;
  /** ports/status lamps portLed() lit, for the render loop to blink. */
  leds: Led[];
}

/** Builds every equipment-construction function for one room, bound to its
 *  scene, materials and finishes. Call once per buildRoom(); the returned
 *  `leds` array fills up as the bay loop calls portLed(). */
export function createEquipmentBuilders(scene: THREE.Scene, mat: RoomMaterials, fin: Finishes): EquipmentBuilders {
  const leds: Led[] = [];

  function box(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, parent?: THREE.Object3D) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    (parent ?? scene).add(b);
    return b;
  }

  function label(text: string, wm: number, x: number, y: number, z: number, ry: number, color = '#20242a') {
    const t = cv(512, 96, (g) => {
      g.clearRect(0, 0, 512, 96);
      g.fillStyle = color; g.font = '600 40px monospace'; g.textAlign = 'center';
      g.fillText(text, 256, 62, 500);
    });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(wm, wm * 96 / 512),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide }));
    p.position.set(x, y, z);
    p.rotation.y = ry;
    scene.add(p);
    return p;
  }

  /**
   * A front-panel indicator. `role` separates the GPON ports an OLT really has
   * — which must stay countable against the pliego — from the decorative status
   * lamps on the other equipment.
   */
  function portLed(x: number, y: number, z: number, parent: THREE.Object3D, on: boolean,
                   role: 'gpon-port' | 'status' = 'gpon-port') {
    /* DoubleSide: cabinets against the far wall present their face towards -Z */
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.016, 0.011),
      new THREE.MeshBasicMaterial({ color: on ? 0x39ff88 : 0x0d1218, side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.name = role;
    parent.add(m);
    if (on) leds.push({ m, base: 0x39ff88, ph: Math.random() * 6 });
  }

  /** A slack fibre patch cord: a sagging tube through the given points. */
  function cord(pts: [number, number, number][], parent: THREE.Object3D,
                m: THREE.Material = fin.fibre, r = 0.0045) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    parent.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, r, 5, false), m));
  }

  /** 19" front posts and top/bottom trim, so a cabinet reads as a rack. */
  function rackFrame(g: THREE.Object3D, w: number, h: number, fz: number, base: number) {
    const zz = fz * 0.98;
    box(0.045, h - 0.04, 0.05, fin.rail, -w / 2 + 0.03, base + h / 2, zz, g);
    box(0.045, h - 0.04, 0.05, fin.rail, w / 2 - 0.03, base + h / 2, zz, g);
    box(w, 0.05, 0.06, fin.bezel, 0, base + h - 0.03, zz, g);
    box(w, 0.05, 0.06, fin.bezel, 0, base + 0.03, zz, g);
    /* fan tray under the top cap */
    box(w - 0.12, 0.06, 0.03, fin.module, 0, base + h - 0.10, zz, g);
  }

  /**
   * ROM — Repartidor Óptico Modular: a stack of splice/patch trays, each with a
   * row of SC/APC adapters, plus the slack fibre looping into a side manager.
   */
  function romBay(g: THREE.Object3D, w: number, h: number, fz: number, base: number, front: number) {
    rackFrame(g, w, h, fz, base);
    const inner = w - 0.13;
    const trays = Math.max(4, Math.min(11, Math.floor((h - 0.5) / 0.115)));
    const y0 = base + 0.32;
    const mx = -w / 2 + 0.075;            /* vertical cable manager, left side */
    box(0.055, h - 0.5, 0.05, fin.bezel, mx, base + 0.3 + (h - 0.5) / 2, fz * 0.96, g);
    for (let i = 0; i < trays; i++) {
      const y = y0 + i * 0.115;
      box(inner, 0.10, 0.045, fin.trayFace, 0.03, y, fz * 0.96, g);
      /* adapter row: SC/APC, alternating green and blue as the trays fill up */
      const n = 12;
      for (let j = 0; j < n; j++) {
        const ax = -inner / 2 + 0.055 + j * ((inner - 0.09) / (n - 1)) + 0.03;
        box(0.019, 0.036, 0.022, j < 8 ? fin.adapter : fin.adapterBlue, ax, y, fz * 1.02, g);
      }
      /* a few cords per tray leave the adapters and sag into the manager */
      if (i % 2 === 0) {
        for (const j of [1, 5, 9]) {
          const ax = -inner / 2 + 0.055 + j * ((inner - 0.09) / (n - 1)) + 0.03;
          cord([[ax, y, fz * 1.05], [ax - 0.05, y - 0.055, fz * 1.16 * front > 0 ? fz * 1.16 : fz * 1.16],
                [mx + 0.02, y - 0.03, fz * 1.05], [mx, y - 0.01, fz * 0.98]], g);
        }
      }
    }
    /* the bundle running down the manager and out of the top of the rack */
    cord([[mx, base + 0.3, fz * 1.0], [mx, base + h * 0.55, fz * 1.08],
          [mx, base + h - 0.06, fz * 0.9]], g, fin.fibre, 0.012);
  }

  /** CGBT — Cuadro General de Baja Tensión: enclosure, window and MCB rows. */
  function cgbtBay(g: THREE.Object3D, w: number, h: number, d: number, fz: number, base: number) {
    box(w, h, d, fin.panel, 0, base + h / 2, 0, g);
    /* door with a smoked inspection window */
    const wy = base + h * 0.62, wh = Math.min(h * 0.5, 0.42), ww = w - 0.12;
    box(ww, wh, 0.02, fin.smoked, 0, wy, fz * 1.03, g);
    box(ww + 0.03, 0.018, 0.03, fin.bezel, 0, wy + wh / 2, fz * 1.02, g);
    box(ww + 0.03, 0.018, 0.03, fin.bezel, 0, wy - wh / 2, fz * 1.02, g);
    /* two DIN rails of breakers behind the window */
    const rows = 2, per = Math.max(6, Math.round(ww / 0.026));
    for (let r = 0; r < rows; r++) {
      const ry = wy + (r === 0 ? wh * 0.22 : -wh * 0.22);
      box(ww - 0.02, 0.006, 0.012, fin.steel, 0, ry - 0.035, fz * 0.99, g);
      for (let i = 0; i < per; i++) {
        const bx = -(ww - 0.05) / 2 + i * ((ww - 0.05) / (per - 1));
        box(0.019, 0.062, 0.02, fin.breaker, bx, ry, fz * 0.99, g);
        box(0.012, 0.016, 0.021, fin.toggle, bx, ry + (i % 3 ? 0.012 : -0.012), fz * 1.0, g);
      }
    }
    /* handle and the main switch below the window */
    box(0.022, 0.14, 0.035, fin.bezel, w / 2 - 0.06, base + h * 0.44, fz * 1.05, g);
    box(0.07, 0.07, 0.025, fin.toggle, -w / 2 + 0.09, base + h * 0.34, fz * 1.03, g);
    box(0.05, 0.012, 0.026, fin.red, -w / 2 + 0.09, base + h * 0.34, fz * 1.05, g);
  }

  /**
   * Optical transport / splitter shelf: horizontal line modules with their own
   * optical ports, and the fibre leaving the front.
   */
  function transportBay(g: THREE.Object3D, w: number, h: number, fz: number, base: number) {
    rackFrame(g, w, h, fz, base);
    const inner = w - 0.13;
    const shelves = Math.max(3, Math.min(6, Math.floor((h - 0.6) / 0.26)));
    for (let s = 0; s < shelves; s++) {
      const y = base + 0.45 + s * 0.26;
      box(inner, 0.19, 0.05, fin.module, 0, y, fz * 0.96, g);
      /* three plug-in modules per shelf, each with a pair of optical ports */
      for (let m = 0; m < 3; m++) {
        const mxp = -inner / 2 + inner * (m + 0.5) / 3;
        box(inner / 3 - 0.02, 0.16, 0.03, fin.bezel, mxp, y, fz * 1.02, g);
        box(0.016, 0.016, 0.018, fin.adapterBlue, mxp - 0.02, y + 0.03, fz * 1.06, g);
        box(0.016, 0.016, 0.018, fin.adapterBlue, mxp + 0.02, y + 0.03, fz * 1.06, g);
        portLed(mxp, y - 0.045, fz * 1.07, g, (s + m) % 4 !== 3, 'status');
        if (m === 1) {
          cord([[mxp - 0.02, y + 0.03, fz * 1.08], [mxp - 0.09, y - 0.05, fz * 1.2],
                [-w / 2 + 0.07, y - 0.11, fz * 1.05]], g);
        }
      }
    }
  }

  /** Rectifier / power shelf: plug-in modules with status LEDs. */
  function powerBay(g: THREE.Object3D, w: number, h: number, fz: number, base: number) {
    const inner = w - 0.10;
    const n = Math.max(3, Math.min(5, Math.floor(h / 0.34)));
    for (let i = 0; i < n; i++) {
      const y = base + 0.22 + i * 0.3;
      for (let m = 0; m < 3; m++) {
        const mxp = -inner / 2 + inner * (m + 0.5) / 3;
        box(inner / 3 - 0.015, 0.24, 0.04, fin.module, mxp, y, fz * 0.99, g);
        box(inner / 3 - 0.07, 0.05, 0.02, fin.bezel, mxp, y + 0.08, fz * 1.03, g);
        portLed(mxp, y - 0.06, fz * 1.05, g, true, 'status');
      }
    }
  }

  /**
   * Battery string: monobloc cells on their shelves, with terminals, the copper
   * link bars that put them in series, and the red/black leads leaving the rack.
   */
  function batteryBay(g: THREE.Object3D, w: number, h: number, d: number, base: number) {
    const rows = Math.max(1, Math.min(4, Math.round(h / 0.45)));
    const per = Math.max(2, Math.min(8, Math.round(w / 0.17)));
    const cellD = d * 0.74;
    /* stand: four uprights and a shelf per row */
    for (const sx of [-w / 2 + 0.03, w / 2 - 0.03])
      for (const sz of [-d / 2 + 0.03, d / 2 - 0.03])
        box(0.045, h, 0.045, fin.rail, sx, base + h / 2, sz, g);
    for (let r = 0; r < rows; r++) {
      const shelfY = base + 0.08 + r * ((h - 0.10) / rows);
      const cellH = Math.min(0.23, (h - 0.10) / rows - 0.10);
      box(w - 0.02, 0.025, d - 0.02, fin.steel, 0, shelfY, 0, g);
      const pitch = w / per;
      for (let i = 0; i < per; i++) {
        const cx = -w / 2 + pitch * (i + 0.5);
        const cw = pitch - 0.016;
        const cy = shelfY + 0.0125 + cellH / 2;
        box(cw, cellH, cellD, fin.cellCase, cx, cy, 0, g);
        /* lighter lid and the rating label on the front */
        box(cw, 0.018, cellD, fin.cellTop, cx, cy + cellH / 2, 0, g);
        box(cw * 0.66, cellH * 0.34, 0.005, fin.cellLabel,
            cx, cy + cellH * 0.06, cellD / 2 + 0.004, g);
        /* the two posts, and the link bar bridging to the next cell */
        const ty = cy + cellH / 2 + 0.019;
        for (const s2 of [-1, 1])
          box(0.024, 0.026, 0.024, fin.copper, cx + s2 * cw * 0.3, ty, 0, g);
        if (i < per - 1)
          box(pitch * 0.55, 0.009, 0.018, fin.copper, cx + pitch * 0.5, ty + 0.015, 0, g);
      }
      /* string leads: red from the first post, black from the last */
      const ty = shelfY + 0.0125 + cellH + 0.019;
      cord([[-w / 2 + pitch * 0.5 - (pitch - 0.016) * 0.3, ty, 0],
            [-w / 2 + 0.06, ty + 0.05, cellD * 0.3],
            [-w / 2 + 0.05, shelfY - 0.02, d / 2 - 0.05]], g, fin.red, 0.009);
      cord([[w / 2 - pitch * 0.5 + (pitch - 0.016) * 0.3, ty, 0],
            [w / 2 - 0.06, ty + 0.05, cellD * 0.3],
            [w / 2 - 0.05, shelfY - 0.02, d / 2 - 0.05]], g, fin.cableBlack, 0.009);
    }
  }

  /**
   * One OLT chassis: its real line cards side by side, each carrying its real
   * GPON ports. Active ports are lit, spare ones dark.
   */
  function chassis(o: Olt, g: THREE.Object3D, w: number, y: number, h: number, front: number) {
    const body = o.vendor.includes('Alcatel') ? mat.chassisAlcatel : mat.chassisEricsson;
    box(w - 0.08, h, 0.06, body, 0, y, 0.3 * front, g);
    /* shelf bezel and vendor strip, so the chassis is not a bare slab */
    box(w - 0.08, 0.022, 0.075, fin.bezel, 0, y + h / 2, 0.3 * front, g);
    box(w - 0.08, 0.022, 0.075, fin.bezel, 0, y - h / 2, 0.3 * front, g);
    const usable = w - 0.14;
    const step = usable / o.cards;
    let lit = 0;
    for (let c = 0; c < o.cards; c++) {
      const cx = -usable / 2 + step * (c + 0.5);
      box(Math.min(step * 0.7, 0.05), h * 0.78, 0.03, mat.card, cx, y, 0.325 * front, g);
      /* card ejector latches */
      box(Math.min(step * 0.7, 0.05), 0.012, 0.014, fin.bezel, cx, y + h * 0.39, 0.34 * front, g);
      box(Math.min(step * 0.7, 0.05), 0.012, 0.014, fin.bezel, cx, y - h * 0.39, 0.34 * front, g);
      for (let p = 0; p < o.portsPerCard; p++) {
        const py = y + h * 0.32 - (p + 0.5) * (h * 0.62 / o.portsPerCard);
        portLed(cx, py, 0.345 * front, g, lit++ < o.portsActive);
      }
    }
    /* patch cords leaving the lit ports towards the side manager */
    for (const frac of [0.2, 0.5, 0.8]) {
      const cx = -usable / 2 + usable * frac;
      cord([[cx, y, 0.35 * front], [cx - 0.06, y - h * 0.5, 0.46 * front],
            [-w / 2 + 0.06, y - h * 0.62, 0.34 * front]], g);
    }
  }

  /** Wire-mesh cable tray (rejiband): side rails, longitudinal wires and rungs. */
  function rejiband(x0: number, z0: number, x1: number, z1: number, y: number, wTray = 0.3) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 0.4) return;
    const g = new THREE.Group();
    g.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    g.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    scene.add(g);
    const hh = 0.055;
    /* the two side rails, each a pair of wires */
    for (const s of [-1, 1]) {
      box(len, 0.012, 0.012, fin.steel, 0, hh, s * wTray / 2, g);
      box(len, 0.012, 0.012, fin.steel, 0, -hh, s * wTray / 2, g);
    }
    /* longitudinal bottom wires */
    for (const t of [-0.3, 0, 0.3]) {
      box(len, 0.01, 0.01, fin.steel, 0, -hh, t * wTray, g);
    }
    /* U-shaped rungs every 50 mm, drawn as one instanced mesh */
    const step = 0.05;
    const count = Math.max(2, Math.floor(len / step));
    const rung = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.008, 0.008, wTray), fin.steel, count);
    const up = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.008, hh * 2, 0.008), fin.steel, count * 2);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const px = -len / 2 + (i + 0.5) * (len / count);
      rung.setMatrixAt(i, m4.makeTranslation(px, -hh, 0));
      up.setMatrixAt(i * 2, m4.makeTranslation(px, 0, -wTray / 2));
      up.setMatrixAt(i * 2 + 1, m4.makeTranslation(px, 0, wTray / 2));
    }
    g.add(rung, up);

    /* the cable bundles the tray carries: fibre, a power run and a spare */
    const lay: [number, number, THREE.Material][] = [
      [-0.30, 0.011, fin.fibre],
      [-0.10, 0.008, fin.fibre],
      [0.12, 0.014, fin.cableBlack],
      [0.31, 0.007, fin.cableBlue],
    ];
    const seg = Math.max(4, Math.round(len / 0.45));
    for (const [off, r, m] of lay) {
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= seg; i++) {
        const t = i / seg;
        /* a little wander and sag so the run does not look extruded */
        const wob = Math.sin(t * Math.PI * 2.3 + off * 17) * 0.014;
        const sag = Math.sin(t * Math.PI * 3.1 + off * 9) * 0.005;
        pts.push([-len / 2 + t * len, -hh + r + 0.006 + sag, off * wTray + wob]);
      }
      cord(pts, g, m, r);
    }
    return g;
  }

  return { box, label, portLed, cord, rackFrame, romBay, cgbtBay, transportBay, powerBay, batteryBay, chassis, rejiband, leds };
}
