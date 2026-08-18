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
import { cardLabel, type NetworkNode, type Olt } from '../lib/data';

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

  const canvas = document.getElementById('svCanvas') as HTMLCanvasElement;
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

  /* ---- procedural textures ---- */
  function cv(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d')!);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }
  const raisedFloor = n.id === 'blimea';
  const floorTex = cv(512, 512, (g) => {
    if (raisedFloor) { /* falso suelo practicable: 60×60 tiles */
      g.fillStyle = '#7d8289'; g.fillRect(0, 0, 512, 512);
      g.strokeStyle = '#3a3f47'; g.lineWidth = 4;
      for (let i = 0; i <= 4; i++) {
        g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke();
        g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke();
      }
      for (let x = 64; x < 512; x += 128) for (let y = 64; y < 512; y += 128) {
        g.fillStyle = '#6d7279'; g.fillRect(x - 6, y - 6, 12, 12);
      }
    } else {
      g.fillStyle = '#8d9199'; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 2400; i++) {
        g.fillStyle = `rgba(${60 + Math.random() * 40 | 0},${60 + Math.random() * 40 | 0},${70 + Math.random() * 40 | 0},.15)`;
        g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      }
      g.strokeStyle = 'rgba(40,44,52,.4)'; g.lineWidth = 2;
      for (let i = 0; i <= 4; i++) {
        g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke();
        g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke();
      }
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(W / 1.4, D / 1.4);
  const wallTex = cv(256, 256, (g) => {
    g.fillStyle = '#d4d7db'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(150,158,166,.35)';
    for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 3, 256);
  });

  const mat = {
    floor: new THREE.MeshLambertMaterial({ map: floorTex, side: THREE.DoubleSide }),
    wall: new THREE.MeshLambertMaterial({ map: wallTex, side: THREE.DoubleSide }),
    ceil: new THREE.MeshLambertMaterial({ color: 0x9aa0a8, side: THREE.DoubleSide }),
    door: new THREE.MeshLambertMaterial({ color: 0x6f7680 }),
    alu: new THREE.MeshLambertMaterial({ color: 0xc9cdd2 }),
    chassisAlcatel: new THREE.MeshLambertMaterial({ color: 0xb9bec6 }),
    chassisEricsson: new THREE.MeshLambertMaterial({ color: 0x3a4d6e }),
    chassisNew: new THREE.MeshLambertMaterial({ color: 0x11313a }),
    card: new THREE.MeshLambertMaterial({ color: 0x59626f }),
    glass: new THREE.MeshLambertMaterial({ color: 0xaad4e8, transparent: true, opacity: 0.16, side: THREE.DoubleSide }),
    tray: new THREE.MeshLambertMaterial({ color: 0x8a9099 }),
  };

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
    const door = room.doors.find((d) => d.edge === i);
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
  /* three ≥155 reads light intensity in physical units, so the r128-era values
     the palette was tuned against need scaling by π to look the same */
  const LX = Math.PI;
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

  /* ---- equipment bays ---- */
  const leds: { m: THREE.Mesh; base: number; ph: number }[] = [];
  const oldChassis: THREE.Object3D[] = [];
  const newChassis: THREE.Object3D[] = [];
  const solids: { x0: number; x1: number; z0: number; z1: number }[] = [];

  /* extra finishes for the equipment detail */
  const fin = {
    rail: new THREE.MeshLambertMaterial({ color: 0x1d2126 }),
    bezel: new THREE.MeshLambertMaterial({ color: 0x33383f }),
    trayFace: new THREE.MeshLambertMaterial({ color: 0xb9bfc7 }),
    adapter: new THREE.MeshLambertMaterial({ color: 0x2f8f5b }),
    adapterBlue: new THREE.MeshLambertMaterial({ color: 0x3763a8 }),
    fibre: new THREE.MeshLambertMaterial({ color: 0xf2d024 }),
    fibreRed: new THREE.MeshLambertMaterial({ color: 0xd8503f }),
    steel: new THREE.MeshLambertMaterial({ color: 0xa9aeb5 }),
    panel: new THREE.MeshLambertMaterial({ color: 0xd7dbdf }),
    smoked: new THREE.MeshLambertMaterial({ color: 0x2b3138, transparent: true, opacity: 0.72 }),
    breaker: new THREE.MeshLambertMaterial({ color: 0xecf0f2 }),
    toggle: new THREE.MeshLambertMaterial({ color: 0x1b1f24 }),
    cell: new THREE.MeshLambertMaterial({ color: 0x2b2f36 }),
    module: new THREE.MeshLambertMaterial({ color: 0x4a525d }),
    screen: new THREE.MeshBasicMaterial({ color: 0x184a44 }),
    red: new THREE.MeshLambertMaterial({ color: 0xc0392b }),
    cellCase: new THREE.MeshLambertMaterial({ color: 0x24272c }),
    cellTop: new THREE.MeshLambertMaterial({ color: 0x3a3f46 }),
    cellLabel: new THREE.MeshLambertMaterial({ color: 0xd8dde2 }),
    copper: new THREE.MeshLambertMaterial({ color: 0xb87333 }),
    cableBlack: new THREE.MeshLambertMaterial({ color: 0x24262a }),
    cableBlue: new THREE.MeshLambertMaterial({ color: 0x2f5d9e }),
  };

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

  /** Battery bank: rows of cells on shelves. */
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

  for (const bay of room.bays) {
    solids.push({
      x0: bay.x - W / 2, x1: bay.x - W / 2 + bay.w,
      z0: bay.z - D / 2, z1: bay.z - D / 2 + bay.d,
    });
  }

  const inPoly = (x: number, z: number) => {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i]!, [xj, zj] = poly[j]!;
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
    }
    return hit;
  };
  const openAt = (x: number, z: number) =>
    inPoly(x, z) && !solids.some((s) => x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1);
  /**
   * Which way a cabinet faces. Comparing against the middle of the room made a
   * free-standing row like Blimea's face two ways at once, so instead we measure
   * how much open floor there is on each side and front onto the roomier one.
   */
  const openness = (x: number, z: number, dx: number, dz: number) => {
    let d = 0;
    for (let t = 0.12; t <= 1.5; t += 0.12) { if (!openAt(x + dx * t, z + dz * t)) break; d = t; }
    return d;
  };
  /**
   * How each cabinet is turned. Cabinets that touch form one block and must face
   * the same way: deciding bay by bay made Blimea's near-square OLT grid face in
   * opposite directions. The block's own proportions choose the axis — a block
   * deeper than it is wide is a row running along Z, so its front is on an X
   * face — and the roomier side of that axis wins.
   */
  const orientOf = new Map<Bay, { rot: number; faceW: number; faceD: number }>();
  {
    const boxes = room.bays.map((b) => ({
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
  }

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
    if (inPoly(inx, inz)) {
      box(0.11, 0.42, 0.11, fin.red, inx, 0.68, inz);
      box(0.05, 0.09, 0.05, fin.rail, inx, 0.93, inz);
    }
  }

  /* ---- legend ---- */
  const olts = n.olts;
  const totalCards = olts.reduce((a, o) => a + o.cards, 0);
  document.getElementById('svLegend')!.innerHTML =
    `<b style="color:#41e3d2">Reconstruido del plano</b><br>` +
    `· Planta: <span class="mono">${room.source.split('/').pop()}</span><br>` +
    `· Recinto ${W.toFixed(2)} × ${D.toFixed(2)} m · ${H.toFixed(2)} m libres<br>` +
    `· ${room.bays.length} armarios rotulados en el plano<br>` +
    (olts.length
      ? `· ${olts.length} OLT · ${totalCards} tarjetas<br>` +
        olts.map((o) => `<span class="mono" style="color:#9db4d8">${o.code}</span> ${cardLabel(o)} · ${o.portsActive}/${o.portsTotal} puertos`).join('<br>')
      : '· Sin OLT: punto de interconexión con los operadores') +
    (room.note ? `<br><span style="color:#5a6f8d">${room.note}</span>` : '');

  const modeBtn = document.getElementById('svMode')!;
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
  const inside = (x: number, z: number) => {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i]!, [xj, zj] = poly[j]!;
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
    }
    return hit;
  };
  /* Body radius. The aisle of a container node is only ~0.89 m wide, so a
     single generous margin left barely 20 cm of walkable band and the visitor
     got stuck; walls need more clearance than cabinets do. */
  const M_WALL = 0.22, M_BAY = 0.14;
  const clear = (x: number, z: number) =>
    inside(x + M_WALL, z) && inside(x - M_WALL, z) &&
    inside(x, z + M_WALL) && inside(x, z - M_WALL) &&
    !solids.some((s) => x > s.x0 - M_BAY && x < s.x1 + M_BAY &&
                        z > s.z0 - M_BAY && z < s.z1 + M_BAY);
  /* If we somehow start inside something, never freeze: let the visitor walk out. */
  const free = (x: number, z: number) =>
    clear(x, z) || !clear(cam.position.x, cam.position.z);

  /* start just inside the door, looking into the room */
  const d0 = room.doors[0];
  let start: [number, number] = [0, 0];
  if (d0) {
    const [x1, z1] = poly[d0.edge]!;
    const [x2, z2] = poly[(d0.edge + 1) % poly.length]!;
    const ang = Math.atan2(z2 - z1, x2 - x1);
    const mid = d0.at + d0.width / 2;
    start = [x1 + Math.cos(ang) * mid, z1 + Math.sin(ang) * mid];
  }
  /* walk in from the door until there is room to stand, then a bit further */
  cam.position.set(0, 1.6, 0);
  let entered = false;
  for (let step = 0; step <= 40; step++) {
    const k = step / 40;
    const cx = start[0] * (1 - k), cz = start[1] * (1 - k);
    if (!free(cx, cz)) continue;
    const walked = Math.hypot(cx - start[0], cz - start[1]);
    cam.position.set(cx, 1.6, cz);
    entered = true;
    if (walked > 1.1) break;
  }
  if (!entered && free(0, 0)) cam.position.set(0, 1.6, 0);

  /* look towards the middle of the room: view dir is (-sin y, -cos y) */
  let yaw = Math.atan2(cam.position.x, cam.position.z);
  let pitch = 0;
  const keys: Record<string, boolean> = {};
  const kd = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = true; };
  const ku = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
  addEventListener('keydown', kd);
  addEventListener('keyup', ku);

  /** Moves the camera, sliding along whichever axis is not blocked. */
  function move(dx: number, dz: number) {
    const { x, z } = cam.position;
    if (free(x + dx, z + dz)) { cam.position.x = x + dx; cam.position.z = z + dz; return; }
    if (free(x + dx, z)) cam.position.x = x + dx;
    else if (free(x, z + dz)) cam.position.z = z + dz;
  }
  /** Zoom is optical only: it narrows the field of view, it never moves you. */
  const FOV_NEAR = 22, FOV_FAR = 78;
  let syncZoomBtns = () => {};
  function zoom(amount: number) {
    cam.fov = Math.max(FOV_NEAR, Math.min(FOV_FAR, cam.fov - amount));
    cam.updateProjectionMatrix();
    syncZoomBtns();
  }

  let drag: [number, number] | null = null;
  const pointers = new Map<number, [number, number]>();
  let pinch = 0;
  const pd = (e: PointerEvent) => {
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size === 1) { drag = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId); }
    else drag = null;
  };
  const pm = (e: PointerEvent) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size >= 2) {
      /* two fingers: pinch to zoom */
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a![0] - b![0], a![1] - b![1]);
      if (pinch) zoom((dist - pinch) * 0.35);
      pinch = dist;
      return;
    }
    if (!drag) return;
    yaw -= (e.clientX - drag[0]) * 0.004;
    pitch = Math.max(-1.2, Math.min(1.2, pitch - (e.clientY - drag[1]) * 0.004));
    drag = [e.clientX, e.clientY];
  };
  const pu = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = 0;
    if (!pointers.size) drag = null;
  };
  canvas.addEventListener('pointerdown', pd);
  canvas.addEventListener('pointermove', pm);
  canvas.addEventListener('pointerup', pu);
  canvas.addEventListener('pointercancel', pu);

  const wheel = (e: WheelEvent) => { e.preventDefault(); zoom(-e.deltaY * 0.035); };
  /* the +/− pad in the corner: same optical zoom, one step per press */
  const zoomBtns: [HTMLElement, number][] = [];
  for (const [id, step] of [['svZoomIn', 9], ['svZoomOut', -9]] as const) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    btn.onclick = () => { zoom(step); syncZoomBtns(); };
    zoomBtns.push([btn, step]);
  }
  /* grey a button out once its end of the range is reached */
  syncZoomBtns = () => {
    for (const [btn, step] of zoomBtns) {
      (btn as HTMLButtonElement).disabled =
        step > 0 ? cam.fov <= FOV_NEAR + 0.01 : cam.fov >= FOV_FAR - 0.01;
    }
  };
  syncZoomBtns();
  canvas.addEventListener('wheel', wheel, { passive: false });

  const pad = { f: 0, b: 0, l: 0, r: 0 };
  document.querySelectorAll<HTMLElement>('#svPad button').forEach((b) => {
    const k = b.dataset.k as keyof typeof pad;
    const on = (e: Event) => { e.preventDefault(); pad[k] = 1; };
    const off = (e: Event) => { e.preventDefault(); pad[k] = 0; };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointerleave', off);
  });

  function resize() {
    const w = holder.clientWidth, h = holder.clientHeight;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();
  document.getElementById('svLoading')!.style.display = 'none';

  let raf = 0, last = performance.now();
  function frame(t: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    const sp = 2.2 * dt;
    let mx = 0, mz = 0;
    if (keys['w'] || keys['arrowup'] || pad.f) mz -= 1;
    if (keys['s'] || keys['arrowdown'] || pad.b) mz += 1;
    if (keys['a'] || keys['arrowleft'] || pad.l) mx -= 1;
    if (keys['d'] || keys['arrowright'] || pad.r) mx += 1;
    if (mx || mz) {
      const f = -mz;
      move((-Math.sin(yaw) * f + Math.cos(yaw) * mx) * sp, (-Math.cos(yaw) * f - Math.sin(yaw) * mx) * sp);
    }
    cam.rotation.order = 'YXZ';
    cam.rotation.y = yaw;
    cam.rotation.x = pitch;
    const tt = t / 1000;
    for (const L of leds) {
      const on = Math.sin(tt * 3 + L.ph) > -0.55;
      (L.m.material as THREE.MeshBasicMaterial).color.setHex(on ? L.base : 0x0d1218);
    }
    renderer.render(scene, cam);
  }
  raf = requestAnimationFrame(frame);
  SV = {
    stop() {
      cancelAnimationFrame(raf);
      removeEventListener('keydown', kd);
      removeEventListener('keyup', ku);
      removeEventListener('resize', resize);
      canvas.removeEventListener('wheel', wheel);
      renderer.dispose();
    },
  };
}
