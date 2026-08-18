/**
 * 3D recreation of a node's interior.
 *
 * Both the room and its contents are data now, not guesswork:
 *   · src/data/rooms.json  — outline, door and equipment bays transcribed in
 *     metres from the node's `*-planta.jpg` in the pliego.
 *   · src/data/nodes.json  — every OLT with the line cards and GPON ports its
 *     table in the pliego lists, so a cabinet shows the real card count and the
 *     real number of lit ports.
 *
 * What is still interpretation: finishes, colours and the appearance of the
 * equipment itself. The drawings give footprints and labels, not photographs.
 *
 * three comes from npm at a pinned version; the legacy loaded r128 from a CDN.
 * r128 predates colour management and the lighting rework, so ColorManagement
 * is disabled and linear output forced to keep the room looking the way it did.
 */
import * as THREE from 'three';
import roomData from '../data/rooms.json';
import { cardLabel, type NetworkNode } from '../lib/data';
import { DOM } from '../lib/dom-ids';
import { initControls } from './viewer3d/controls';
import { createEquipmentBuilders } from './viewer3d/equipment';
import { pointInPolygon } from './viewer3d/geometry';
import { computeOrientations } from './viewer3d/orientation';
import { LX, buildShell } from './viewer3d/shell';
import { buildFinishes, buildFloorTexture, buildMaterials, buildWallTexture } from './viewer3d/textures';

THREE.ColorManagement.enabled = false;

interface Bay {
  x: number; z: number; w: number; d: number; h: number;
  /** base height when the cabinet is wall-mounted rather than floor-standing */
  y?: number;
  kind: string;
  label: string;
  /** indices into the node's olts[] that live in this cabinet */
  olts?: number[];
}
interface Room {
  source: string;
  h: number;
  outline: [number, number][];
  doors: { edge: number; at: number; width: number }[];
  bays: Bay[];
  note?: string;
}

const ROOMS = roomData as unknown as Record<string, Room>;

let SV: { stop(): void } | null = null;

/** Stops the render loop and releases the current room's resources. */
export function stopRoom() {
  if (SV) { SV.stop(); SV = null; }
}

const COLOR: Record<string, number> = {
  olt: 0x2e3238, odf: 0x39414c, transport: 0x36404e, splitter: 0x36404e,
  catv: 0x3b3a42, rack: 0x2e3238, power: 0x4a4f57, battery: 0x23262c,
  cgbt: 0x55606e, ups: 0x8a9099, cabinet: 0x6f7680, cage: 0xc9cdd2,
  ac: 0x8f959c, empty: 0x4c5158,
};

export function buildRoom(n: NetworkNode) {
  stopRoom();
  const room = ROOMS[n.id];
  if (!room) return;

  const canvas = document.getElementById(DOM.svCanvas) as HTMLCanvasElement;
  const holder = canvas.parentElement!;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  /* linear output, as in r128: the palette was chosen against it */
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1322);

  /* plan coordinates are centred on the room so the camera maths stays simple */
  const xs = room.outline.map((p) => p[0]);
  const zs = room.outline.map((p) => p[1]);
  const W = Math.max(...xs), D = Math.max(...zs), H = room.h;
  const poly: [number, number][] = room.outline.map(([x, z]) => [x - W / 2, z - D / 2]);

  scene.fog = new THREE.Fog(0x0b1322, Math.max(W, D) * 1.4, Math.max(W, D) * 4);
  const cam = new THREE.PerspectiveCamera(70, 1, 0.05, 100);

  /* ---- procedural textures, materials and equipment builders ---- */
  const raisedFloor = n.id === 'blimea';
  const floorTex = buildFloorTexture(raisedFloor, W, D);
  const wallTex = buildWallTexture();
  const mat = buildMaterials(floorTex, wallTex);
  const fin = buildFinishes();
  const { box, label, portLed, cord, rackFrame, romBay, cgbtBay, transportBay, powerBay, batteryBay, chassis, rejiband, leds } =
    createEquipmentBuilders(scene, mat, fin);

  const { halo } = buildShell({ scene, mat, poly, doors: room.doors, W, D, H, box, label });

  /* ---- equipment bays ---- */
  const oldChassis: THREE.Object3D[] = [];
  const newChassis: THREE.Object3D[] = [];
  const solids: { x0: number; x1: number; z0: number; z1: number }[] = [];

  for (const bay of room.bays) {
    solids.push({
      x0: bay.x - W / 2, x1: bay.x - W / 2 + bay.w,
      z0: bay.z - D / 2, z1: bay.z - D / 2 + bay.d,
    });
  }

  const orientOf = computeOrientations(room.bays, poly, solids, W, D);

  for (const bay of room.bays) {
    const g = new THREE.Group();
    g.position.set(bay.x - W / 2 + bay.w / 2, 0, bay.z - D / 2 + bay.d / 2);
    scene.add(g);
    const base = bay.y ?? 0;
    /* local +Z is the front from here on, whichever way the cabinet is turned */
    const { rot, faceW, faceD } = orientOf.get(bay)!;
    g.rotation.y = rot;
    const front = 1;
    const fz = faceD / 2;

    if (bay.kind === 'cage') {
      /* operator cage: aluminium frame with glass/mesh panels */
      const gh = bay.h;
      box(bay.w, 0.05, bay.d, mat.alu, 0, gh, 0, g);
      for (const [px, pz, pw, pd] of [
        [0, -bay.d / 2, bay.w, 0.03], [0, bay.d / 2, bay.w, 0.03],
        [-bay.w / 2, 0, 0.03, bay.d], [bay.w / 2, 0, 0.03, bay.d],
      ] as const) box(pw, gh, pd, mat.glass, px, gh / 2, pz, g);
      const inner = new THREE.Group();
      inner.position.set(0, 0, 0);
      g.add(inner);
      box(0.5, 1.9, 0.5, new THREE.MeshLambertMaterial({ color: 0x2e3238 }), 0, 0.95, 0, inner);
      rackFrame(inner, 0.5, 1.9, 0.26, 0);
      for (let i = 0; i < 6; i++) box(0.42, 0.11, 0.03, fin.module, 0, 0.5 + i * 0.2, 0.27, inner);
      label(bay.label, Math.min(bay.w * 0.8, 1.0), g.position.x, gh + 0.1, g.position.z, 0, '#c8d4e2');
      continue;
    }

    /* the CGBT builds its own enclosure and the battery stand is an open rack:
       a generic body would z-fight with one and hide the cells of the other */
    if (bay.kind !== 'cgbt' && bay.kind !== 'battery') {
      box(faceW, bay.h, faceD,
        new THREE.MeshLambertMaterial({ color: COLOR[bay.kind] ?? 0x4c5158 }),
        0, base + bay.h / 2, 0, g);
    }

    if (bay.olts?.length) {
      rackFrame(g, faceW, bay.h, fz, base);
      const olts = bay.olts.map((i) => n.olts[i]!).filter(Boolean);
      const slot = (bay.h - 0.3) / olts.length;
      olts.forEach((o, i) => {
        const sub = new THREE.Group();
        g.add(sub);
        oldChassis.push(sub);
        chassis(o, sub, faceW, 0.35 + i * slot + slot / 2, Math.min(slot - 0.12, 0.5), front);
      });
      /* the renewed view puts one dual GPON/XGS-PON chassis in the same footprint */
      const nu = new THREE.Group();
      g.add(nu);
      nu.visible = false;
      newChassis.push(nu);
      box(faceW - 0.08, 0.85, 0.06, mat.chassisNew, 0, bay.h / 2, 0.3 * front, nu);
      box(faceW - 0.08, 0.024, 0.08, fin.bezel, 0, bay.h / 2 + 0.425, 0.3 * front, nu);
      for (let i = 0; i < 12; i++) {
        portLed(-faceW / 2 + 0.09 + i * ((faceW - 0.18) / 11), bay.h / 2, 0.345 * front, nu, true);
      }
    } else if (bay.kind === 'odf') {
      romBay(g, faceW, bay.h, fz, base, front);
    } else if (bay.kind === 'cgbt') {
      cgbtBay(g, faceW, bay.h, faceD, fz, base);
    } else if (bay.kind === 'transport' || bay.kind === 'splitter' || bay.kind === 'catv') {
      transportBay(g, faceW, bay.h, fz, base);
    } else if (bay.kind === 'power') {
      powerBay(g, faceW, bay.h, fz, base);
    } else if (bay.kind === 'battery') {
      batteryBay(g, faceW, bay.h, faceD, base);
    } else if (bay.kind === 'ups') {
      rackFrame(g, faceW, bay.h, fz, base);
      box(faceW - 0.18, 0.12, 0.02, fin.screen, 0, base + bay.h * 0.74, fz * 1.02, g);
      for (let i = 0; i < 3; i++) portLed(-0.08 + i * 0.08, base + bay.h * 0.6, fz * 1.03, g, true, 'status');
    } else if (bay.kind === 'rack' || bay.kind === 'empty') {
      rackFrame(g, faceW, bay.h, fz, base);
      if (bay.kind === 'rack') {
        for (let i = 0; i < 5; i++) {
          box(faceW - 0.13, 0.13, 0.045, fin.module, 0, base + 0.45 + i * 0.28, fz * 0.96, g);
          portLed(faceW / 2 - 0.11, base + 0.45 + i * 0.28, fz * 1.02, g, i % 3 !== 2, 'status');
        }
      }
    }

    /* the rear is a vented door, not a bare slab: from behind a rack still reads
       as equipment rather than a black box */
    if (bay.kind !== 'cgbt' && bay.kind !== 'battery' && bay.h > 0.9) {
      const bz = -fz * 1.01;
      box(faceW - 0.05, bay.h - 0.08, 0.012, fin.bezel, 0, base + bay.h / 2, bz, g);
      for (let i = 0; i < Math.max(4, Math.round((bay.h - 0.3) / 0.16)); i++) {
        box(faceW - 0.16, 0.055, 0.016, fin.rail, 0,
            base + 0.2 + i * 0.16, -fz * 1.03, g);
      }
      box(0.02, 0.13, 0.03, fin.steel, faceW / 2 - 0.07, base + bay.h * 0.5, -fz * 1.05, g);
    }

    /* the label goes on the face that looks into the room */
    const lo = new THREE.Vector3(0, base + bay.h + 0.07, fz + 0.02).applyAxisAngle(
      new THREE.Vector3(0, 1, 0), rot).add(g.position);
    label(bay.label, Math.min(faceW * 0.95, 0.8), lo.x, lo.y, lo.z, rot, '#c8d4e2');
  }

  /* ---- rejiband runs above each row of cabinets, as the plans mark them ---- */
  {
    const trayY = Math.min(H - 0.18, 2.18);
    const rows = new Map<number, { x0: number; x1: number; z: number }>();
    for (const bay of room.bays) {
      if (bay.kind === 'cage' || (bay.y ?? 0) > 0.9) continue;
      const cz = bay.z - D / 2 + bay.d / 2;
      const key = Math.round(cz * 2) / 2;      /* group cabinets sharing a wall line */
      const x0 = bay.x - W / 2, x1 = x0 + bay.w;
      const r = rows.get(key);
      if (r) { r.x0 = Math.min(r.x0, x0); r.x1 = Math.max(r.x1, x1); }
      else rows.set(key, { x0, x1, z: cz });
    }
    for (const r of rows.values()) {
      rejiband(r.x0 - 0.15, r.z, r.x1 + 0.15, r.z, trayY);
      /* a drop piece where the run meets the first cabinet of the row */
      box(0.06, 0.34, 0.22, fin.steel, r.x0 + 0.05, trayY - 0.2, r.z, scene);
    }
    /* and a bundle dropping off the tray into each rack it passes over */
    for (const bay of room.bays) {
      if (bay.kind === 'cage' || (bay.y ?? 0) > 0.9 || bay.h < 1.2) continue;
      const cx = bay.x - W / 2 + bay.w / 2;
      const cz = bay.z - D / 2 + bay.d / 2;
      const top = (bay.y ?? 0) + bay.h;
      if (top > trayY - 0.05) continue;
      const m = bay.kind === 'power' || bay.kind === 'cgbt' ? fin.cableBlack : fin.fibre;
      cord([[cx - 0.06, trayY - 0.06, cz],
            [cx - 0.05, trayY - 0.16, cz + 0.05],
            [cx - 0.03, top + 0.06, cz + 0.02],
            [cx - 0.02, top - 0.02, cz]], scene, m, 0.009);
    }
  }

  /* a fire extinguisher by the door, as the elevations show */
  if (room.doors[0]) {
    const d0 = room.doors[0];
    const [ax, az] = poly[d0.edge]!;
    const [bx, bz] = poly[(d0.edge + 1) % poly.length]!;
    const ang = Math.atan2(bz - az, bx - ax);
    const t = d0.at + d0.width + 0.28;
    const ex = ax + Math.cos(ang) * t, ez = az + Math.sin(ang) * t;
    const inx = ex - Math.sin(ang) * -0.12, inz = ez + Math.cos(ang) * -0.12;
    if (pointInPolygon(poly, inx, inz)) {
      box(0.11, 0.42, 0.11, fin.red, inx, 0.68, inz);
      box(0.05, 0.09, 0.05, fin.rail, inx, 0.93, inz);
    }
  }

  /* ---- legend ---- */
  const olts = n.olts;
  const totalCards = olts.reduce((a, o) => a + o.cards, 0);
  document.getElementById(DOM.svLegend)!.innerHTML =
    `<b style="color:#41e3d2">Reconstruido del plano</b><br>` +
    `· Planta: <span class="mono">${room.source.split('/').pop()}</span><br>` +
    `· Recinto ${W.toFixed(2)} × ${D.toFixed(2)} m · ${H.toFixed(2)} m libres<br>` +
    `· ${room.bays.length} armarios rotulados en el plano<br>` +
    (olts.length
      ? `· ${olts.length} OLT · ${totalCards} tarjetas<br>` +
        olts.map((o) => `<span class="mono" style="color:#9db4d8">${o.code}</span> ${cardLabel(o)} · ${o.portsActive}/${o.portsTotal} puertos`).join('<br>')
      : '· Sin OLT: punto de interconexión con los operadores') +
    (room.note ? `<br><span style="color:#5a6f8d">${room.note}</span>` : '');

  const modeBtn = document.getElementById(DOM.svMode)!;
  let renewed = false;
  modeBtn.textContent = '⇄ Ver renovado';
  modeBtn.onclick = () => {
    renewed = !renewed;
    oldChassis.forEach((r) => (r.visible = !renewed));
    newChassis.forEach((r) => (r.visible = renewed));
    halo.intensity = renewed ? 1.1 * LX : 0;
    modeBtn.textContent = renewed ? '⇄ Ver actual' : '⇄ Ver renovado';
  };

  /* ---- camera and controls ---- */
  SV = initControls({ cam, canvas, holder, renderer, scene, poly, solids, startDoor: room.doors[0], leds });
}
