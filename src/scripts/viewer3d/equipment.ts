/**
 * Builders for every piece of equipment a room can contain: the generic
 * box/label/cord/portLed primitives, and the per-kind bay builders (cgbtBay,
 * acDistBay, powerBay, batteryBay, chassis, rejiband) that use them. Split
 * out of viewer3d.ts's buildRoom() verbatim, as one factory so the handful
 * of things every builder needs — the scene, the room's materials and
 * finishes, and the accumulated LED list a builder feeds into — stay a
 * single explicit dependency instead of ~15 closure captures.
 *
 * Rack-mounted equipment is built by the *unit* builders (odfUnit, dwdmUnit,
 * splitterUnit, videoUnit, txCubeUnit). They all share one contract — fill
 * the vertical band [y0, y1] of a cabinet that is `w` wide with its front
 * face at `fz` — because the plans routinely put two of them in the same
 * cabinet («Repartidor FO + TX Cube», «GPON y vídeo», «DWDM y splitter»),
 * and the caller stacks them by handing each one its own band.
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

/** A point in room space: metres, centred on the room, Y up. */
export type Vec3 = [number, number, number];

/**
 * Fills one vertical slice of a cabinet's front.
 *
 * @param g     the cabinet's group; local +Z is its front, whichever way it faces
 * @param w     the cabinet's face width
 * @param fz    half its face depth — the plane its front panels sit on
 * @param y0,y1 the band to fill, in the cabinet's local Y
 * @param front +1; kept so cord routing can mirror with the face
 */
export type UnitBuilder = (
  g: THREE.Object3D,
  w: number,
  fz: number,
  y0: number,
  y1: number,
  front: number,
  /** the model the plan names for this cabinet, where it names one */
  model?: string,
) => void;

/* Every member is a plain closure, declared as a property rather than with
   method shorthand: buildRoom() pulls them off this object by destructuring,
   and method syntax would be claiming a `this` that none of them has. */
export interface EquipmentBuilders {
  box: (
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent?: THREE.Object3D,
  ) => THREE.Mesh;
  silkscreen: (
    parent: THREE.Object3D,
    text: string,
    wm: number,
    x: number,
    y: number,
    z: number,
    opts?: { align?: 'left' | 'center'; color?: string; hm?: number },
  ) => THREE.Mesh;
  label: (
    text: string,
    wm: number,
    x: number,
    y: number,
    z: number,
    ry: number,
    color?: string,
  ) => THREE.Mesh;
  portLed: (
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D,
    on: boolean,
    role?: 'gpon-port' | 'status',
  ) => void;
  cord: (pts: Vec3[], parent: THREE.Object3D, m?: THREE.Material, r?: number) => void;
  rackFrame: (g: THREE.Object3D, w: number, h: number, fz: number, base: number) => void;
  /** ROM — Repartidor Óptico Modular: stacked splice/patch trays. */
  odfUnit: UnitBuilder;
  /** DWDM / WDM / Transmode transport: shelves of lit line modules. */
  dwdmUnit: UnitBuilder;
  /** Passive PLC splitter shelves — no LEDs, that is the point. */
  splitterUnit: UnitBuilder;
  /** CATV / vídeo: optical receiver plus the RF side and its coax. */
  videoUnit: UnitBuilder;
  /** «TX Cube» / «Transporte Cube»: one compact transport chassis. */
  txCubeUnit: UnitBuilder;
  cgbtBay: (g: THREE.Object3D, w: number, h: number, d: number, fz: number, base: number) => void;
  /** «Dist. C.A.»: an AC distribution board, simpler than the CGBT. */
  acDistBay: (g: THREE.Object3D, w: number, h: number, d: number, fz: number, base: number) => void;
  powerBay: (g: THREE.Object3D, w: number, h: number, fz: number, base: number) => void;
  batteryBay: (g: THREE.Object3D, w: number, h: number, d: number, base: number) => void;
  chassis: (o: Olt, g: THREE.Object3D, w: number, y: number, h: number, front: number) => void;
  /** Wire-mesh cable tray between two points in room space. */
  rejiband: (a: Vec3, b: Vec3, wTray?: number) => THREE.Group | undefined;
  /** Lift-off covers over a floor cable duct («tapas»). */
  hatchRun: (x: number, z: number, w: number, d: number, n: number) => void;
  /** ports/status lamps portLed() lit, for the render loop to blink. */
  leds: Led[];
}

/** Builds every equipment-construction function for one room, bound to its
 *  scene, materials and finishes. Call once per buildRoom(); the returned
 *  `leds` array fills up as the bay loop calls portLed(). */
export function createEquipmentBuilders(
  scene: THREE.Scene,
  mat: RoomMaterials,
  fin: Finishes,
): EquipmentBuilders {
  const leds: Led[] = [];

  function box(
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent?: THREE.Object3D,
  ) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    (parent ?? scene).add(b);
    return b;
  }

  function label(
    text: string,
    wm: number,
    x: number,
    y: number,
    z: number,
    ry: number,
    color = '#20242a',
  ) {
    const t = cv(512, 96, (g) => {
      g.clearRect(0, 0, 512, 96);
      g.fillStyle = color;
      g.font = '600 40px monospace';
      g.textAlign = 'center';
      g.fillText(text, 256, 62, 500);
    });
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(wm, (wm * 96) / 512),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide }),
    );
    p.position.set(x, y, z);
    p.rotation.y = ry;
    scene.add(p);
    return p;
  }

  /**
   * Text printed on a piece of equipment, the way real kit carries its
   * vendor and model on the bezel.
   *
   * Unlike label(), which floats a caption over a cabinet in world
   * coordinates, this hangs off the cabinet's own group so it turns with it.
   * The canvas is sized from the physical width — the visitor can walk to
   * within 20 cm of a rack, and a fixed 512 px would be a blur by then.
   */
  function silkscreen(
    parent: THREE.Object3D,
    text: string,
    wm: number,
    x: number,
    y: number,
    z: number,
    opts: { align?: 'left' | 'center'; color?: string; hm?: number } = {},
  ) {
    const { align = 'center', color = '#c8d0d8' } = opts;
    const hm = opts.hm ?? wm * 0.07;
    /* ~1200 px per metre of print, capped so a wide chassis stays cheap */
    const pw = Math.min(2048, Math.max(256, Math.round(wm * 1200)));
    const ph = Math.max(32, Math.round((pw * hm) / wm));
    const t = cv(pw, ph, (g) => {
      g.clearRect(0, 0, pw, ph);
      g.fillStyle = color;
      g.font = `600 ${Math.round(ph * 0.72)}px monospace`;
      g.textBaseline = 'middle';
      g.textAlign = align === 'left' ? 'left' : 'center';
      g.fillText(text, align === 'left' ? ph * 0.3 : pw / 2, ph * 0.54, pw - ph * 0.5);
    });
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(wm, hm),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide }),
    );
    p.position.set(x, y, z);
    parent.add(p);
    return p;
  }

  /**
   * A front-panel indicator. `role` separates the GPON ports an OLT really has
   * — which must stay countable against the pliego — from the decorative status
   * lamps on the other equipment.
   */
  function portLed(
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D,
    on: boolean,
    role: 'gpon-port' | 'status' = 'gpon-port',
  ) {
    /* DoubleSide: cabinets against the far wall present their face towards -Z */
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.016, 0.011),
      new THREE.MeshBasicMaterial({ color: on ? 0x39ff88 : 0x0d1218, side: THREE.DoubleSide }),
    );
    m.position.set(x, y, z);
    m.name = role;
    parent.add(m);
    if (on) leds.push({ m, base: 0x39ff88, ph: Math.random() * 6 });
  }

  /** A slack fibre patch cord: a sagging tube through the given points. */
  function cord(pts: Vec3[], parent: THREE.Object3D, m: THREE.Material = fin.fibre, r = 0.0045) {
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
    box(w - 0.12, 0.06, 0.03, fin.module, 0, base + h - 0.1, zz, g);
  }

  /**
   * ROM — Repartidor Óptico Modular: a stack of splice/patch trays, each with a
   * row of SC/APC adapters, plus the slack fibre looping into a side manager.
   */
  const odfUnit: UnitBuilder = (g, w, fz, y0, y1, front) => {
    const inner = w - 0.13;
    const usable = y1 - y0;
    const trays = Math.max(2, Math.min(11, Math.floor(usable / 0.115)));
    const mx = -w / 2 + 0.075; /* vertical cable manager, left side */
    box(0.055, usable, 0.05, fin.bezel, mx, (y0 + y1) / 2, fz * 0.96, g);
    for (let i = 0; i < trays; i++) {
      const y = y0 + 0.06 + i * 0.115;
      box(inner, 0.1, 0.045, fin.trayFace, 0.03, y, fz * 0.96, g);
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
          cord(
            [
              [ax, y, fz * 1.05],
              [ax - 0.05, y - 0.055, fz * 1.16 * front],
              [mx + 0.02, y - 0.03, fz * 1.05],
              [mx, y - 0.01, fz * 0.98],
            ],
            g,
          );
        }
      }
    }
    /* the bundle running down the manager and out of the top of the unit */
    cord(
      [
        [mx, y0, fz * 1.0],
        [mx, (y0 + y1) / 2, fz * 1.08],
        [mx, y1, fz * 0.9],
      ],
      g,
      fin.fibre,
      0.012,
    );
  };

  /**
   * Passive PLC splitter shelves. The plans put splitters in the same cabinet
   * as the Transmode often enough that the two used to render identically;
   * what tells them apart on site is that a splitter is passive — one input,
   * a fan-out of pigtails, and **no lamps at all**.
   */
  const splitterUnit: UnitBuilder = (g, w, fz, y0, y1, front) => {
    const inner = w - 0.13;
    const shelves = Math.max(1, Math.min(5, Math.floor((y1 - y0) / 0.17)));
    for (let s = 0; s < shelves; s++) {
      const y = y0 + 0.1 + s * 0.17;
      box(inner, 0.13, 0.05, fin.passive, 0, y, fz * 0.96, g);
      box(inner, 0.012, 0.055, fin.bezel, 0, y + 0.065, fz * 0.96, g);
      /* the input port, hard left, and its feed */
      const ix = -inner / 2 + 0.035;
      box(0.021, 0.038, 0.024, fin.adapter, ix, y, fz * 1.03, g);
      cord(
        [
          [ix, y, fz * 1.06],
          [ix - 0.03, y + 0.07, fz * 1.14 * front],
          [-w / 2 + 0.07, y + 0.12, fz * 1.0],
        ],
        g,
      );
      /* the 1:N fan-out: eight outputs, each with its pigtail dropping away */
      const n = 8;
      for (let j = 0; j < n; j++) {
        const ax = -inner / 2 + 0.1 + j * ((inner - 0.14) / (n - 1));
        box(0.016, 0.032, 0.022, fin.adapterBlue, ax, y, fz * 1.03, g);
        if (j % 2 === 0) {
          cord(
            [
              [ax, y, fz * 1.06],
              [ax + 0.02, y - 0.06, fz * 1.13 * front],
              [w / 2 - 0.07, y - 0.1, fz * 1.0],
            ],
            g,
            fin.fibre,
            0.0035,
          );
        }
      }
    }
  };

  /**
   * The video half of a «GPON y vídeo» / «Splitter + vídeo» cabinet: an
   * optical receiver fed by fibre, and the RF side — F connectors and the
   * black coax leaving them, which is what makes it read as CATV rather than
   * as one more optical shelf.
   */
  const videoUnit: UnitBuilder = (g, w, fz, y0, y1, front) => {
    const inner = w - 0.13;
    const y = (y0 + y1) / 2;
    const h = Math.min(y1 - y0 - 0.04, 0.26);
    box(inner, h, 0.06, fin.rfBody, 0, y, fz * 0.96, g);
    box(inner, 0.016, 0.07, fin.bezel, 0, y + h / 2, fz * 0.96, g);
    box(inner, 0.016, 0.07, fin.bezel, 0, y - h / 2, fz * 0.96, g);
    /* optical receiver on the left: its fibre in, and a level meter */
    const ox = -inner / 2 + 0.06;
    box(0.09, h * 0.6, 0.03, fin.module, ox, y, fz * 1.02, g);
    box(0.018, 0.018, 0.02, fin.adapter, ox, y + h * 0.18, fz * 1.05, g);
    cord(
      [
        [ox, y + h * 0.18, fz * 1.08],
        [ox - 0.04, y + h * 0.5, fz * 1.16 * front],
        [-w / 2 + 0.07, y + h * 0.62, fz * 1.0],
      ],
      g,
    );
    box(0.05, 0.03, 0.02, fin.screen, ox, y - h * 0.2, fz * 1.05, g);
    portLed(ox + 0.03, y - h * 0.2, fz * 1.06, g, true, 'status');
    /* RF output stage: F connectors, each with its coax dropping out */
    const n = 4;
    for (let j = 0; j < n; j++) {
      const ax = inner / 2 - 0.05 - j * 0.055;
      box(0.026, 0.026, 0.03, fin.copper, ax, y, fz * 1.03, g);
      cord(
        [
          [ax, y, fz * 1.06],
          [ax, y - h * 0.55, fz * 1.14 * front],
          [w / 2 - 0.07, y - h * 0.8, fz * 1.0],
        ],
        g,
        fin.coax,
        0.0075,
      );
    }
  };

  /**
   * «TX Cube» / «Transporte Cube»: the compact transport chassis several plans
   * rack on top of the Repartidor FO. One box, a couple of line ports and a
   * handful of client ports — deliberately a fraction of a DWDM shelf stack,
   * because that size difference is how the plan distinguishes them.
   */
  const txCubeUnit: UnitBuilder = (g, w, fz, y0, y1, front) => {
    const inner = w - 0.15;
    const h = Math.min(y1 - y0 - 0.03, 0.2);
    const y = y1 - 0.03 - h / 2;
    box(inner, h, 0.08, fin.module, 0, y, fz * 0.94, g);
    box(inner, 0.014, 0.09, fin.bezel, 0, y + h / 2, fz * 0.94, g);
    box(inner, 0.014, 0.09, fin.bezel, 0, y - h / 2, fz * 0.94, g);
    /* the two line ports, left, and their fibre leaving upwards */
    for (const s of [-1, 1]) {
      const lx = -inner / 2 + 0.04 + (s > 0 ? 0.032 : 0);
      box(0.018, 0.02, 0.022, fin.adapter, lx, y + h * 0.2, fz * 1.02, g);
      cord(
        [
          [lx, y + h * 0.2, fz * 1.05],
          [lx - 0.02, y + h * 0.6, fz * 1.12 * front],
          [-w / 2 + 0.07, y + h * 0.9, fz * 1.0],
        ],
        g,
      );
    }
    /* client SFP cage row, and the status lamps that make it a live box */
    for (let j = 0; j < 6; j++) {
      const ax = -inner / 2 + 0.12 + j * ((inner - 0.17) / 5);
      box(0.02, 0.016, 0.018, fin.adapterBlue, ax, y - h * 0.22, fz * 1.02, g);
      portLed(ax, y + h * 0.22, fz * 1.04, g, j % 3 !== 2, 'status');
    }
  };

  /** CGBT — Cuadro General de Baja Tensión: enclosure, window and MCB rows. */
  function cgbtBay(g: THREE.Object3D, w: number, h: number, d: number, fz: number, base: number) {
    box(w, h, d, fin.panel, 0, base + h / 2, 0, g);
    /* door with a smoked inspection window */
    const wy = base + h * 0.62,
      wh = Math.min(h * 0.5, 0.42),
      ww = w - 0.12;
    box(ww, wh, 0.02, fin.smoked, 0, wy, fz * 1.03, g);
    box(ww + 0.03, 0.018, 0.03, fin.bezel, 0, wy + wh / 2, fz * 1.02, g);
    box(ww + 0.03, 0.018, 0.03, fin.bezel, 0, wy - wh / 2, fz * 1.02, g);
    /* two DIN rails of breakers behind the window */
    const rows = 2,
      per = Math.max(6, Math.round(ww / 0.026));
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
   * «Dist. C.A.» — the AC distribution board a few nodes have instead of a
   * CGBT. Same family of kit but a smaller animal: one DIN rail behind a
   * plain door, no inspection window and no main rotary switch.
   */
  function acDistBay(g: THREE.Object3D, w: number, h: number, d: number, fz: number, base: number) {
    box(w, h, d, fin.panel, 0, base + h / 2, 0, g);
    /* plain door, with the flush lock the enclosure actually has */
    const dy = base + h * 0.6,
      dh = Math.min(h * 0.7, 0.6),
      dw = w - 0.06;
    box(dw, dh, 0.018, fin.panel, 0, dy, fz * 1.02, g);
    box(dw + 0.02, 0.014, 0.026, fin.bezel, 0, dy + dh / 2, fz * 1.02, g);
    box(dw + 0.02, 0.014, 0.026, fin.bezel, 0, dy - dh / 2, fz * 1.02, g);
    box(0.03, 0.03, 0.022, fin.steel, w / 2 - 0.05, dy, fz * 1.04, g);
    /* the single rail of breakers, seen through the door's cut-out */
    const per = Math.max(5, Math.round(dw / 0.03));
    box(dw - 0.05, 0.075, 0.014, fin.toggle, 0, dy + dh * 0.18, fz * 1.03, g);
    box(dw - 0.06, 0.006, 0.012, fin.steel, 0, dy + dh * 0.18 - 0.04, fz * 1.035, g);
    for (let i = 0; i < per; i++) {
      const bx = -(dw - 0.08) / 2 + i * ((dw - 0.08) / (per - 1));
      box(0.02, 0.058, 0.016, fin.breaker, bx, dy + dh * 0.18, fz * 1.04, g);
      box(
        0.012,
        0.014,
        0.017,
        fin.toggle,
        bx,
        dy + dh * 0.18 + (i % 2 ? 0.011 : -0.011),
        fz * 1.045,
        g,
      );
    }
    /* the tag the boards carry, and the earth stud below it */
    box(dw * 0.4, 0.05, 0.005, fin.cellLabel, -dw * 0.2, dy - dh * 0.28, fz * 1.03, g);
    box(0.02, 0.02, 0.02, fin.copper, dw * 0.3, dy - dh * 0.3, fz * 1.03, g);
  }

  /**
   * Optical transport shelf (DWDM / WDM / Transmode): horizontal line modules
   * with their own optical ports, LEDs, and the fibre leaving the front.
   */
  const dwdmUnit: UnitBuilder = (g, w, fz, y0, y1, _front, model) => {
    const inner = w - 0.13;
    const shelves = Math.max(1, Math.min(6, Math.floor((y1 - y0) / 0.26)));
    /* «Transmode 5800 + 8133», «Transmode EMXP 10 GbE» — the plan names the
       box in some nodes and not in others, and an unnamed shelf stays
       unnamed rather than borrowing a neighbour's model */
    if (model) {
      silkscreen(
        g,
        model.toUpperCase(),
        inner * 0.9,
        0,
        y0 + 0.13 + shelves * 0.26 - 0.09,
        fz * 1.03,
        {
          hm: 0.026,
          color: '#9db4d8',
        },
      );
    }
    for (let s = 0; s < shelves; s++) {
      const y = y0 + 0.13 + s * 0.26;
      box(inner, 0.19, 0.05, fin.module, 0, y, fz * 0.96, g);
      /* three plug-in modules per shelf, each with a pair of optical ports */
      for (let m = 0; m < 3; m++) {
        const mxp = -inner / 2 + (inner * (m + 0.5)) / 3;
        box(inner / 3 - 0.02, 0.16, 0.03, fin.bezel, mxp, y, fz * 1.02, g);
        box(0.016, 0.016, 0.018, fin.adapterBlue, mxp - 0.02, y + 0.03, fz * 1.06, g);
        box(0.016, 0.016, 0.018, fin.adapterBlue, mxp + 0.02, y + 0.03, fz * 1.06, g);
        portLed(mxp, y - 0.045, fz * 1.07, g, (s + m) % 4 !== 3, 'status');
        if (m === 1) {
          cord(
            [
              [mxp - 0.02, y + 0.03, fz * 1.08],
              [mxp - 0.09, y - 0.05, fz * 1.2],
              [-w / 2 + 0.07, y - 0.11, fz * 1.05],
            ],
            g,
          );
        }
      }
    }
  };

  /** Rectifier / power shelf: plug-in modules with status LEDs. */
  function powerBay(g: THREE.Object3D, w: number, h: number, fz: number, base: number) {
    const inner = w - 0.1;
    const n = Math.max(3, Math.min(5, Math.floor(h / 0.34)));
    for (let i = 0; i < n; i++) {
      const y = base + 0.22 + i * 0.3;
      for (let m = 0; m < 3; m++) {
        const mxp = -inner / 2 + (inner * (m + 0.5)) / 3;
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
      const shelfY = base + 0.08 + r * ((h - 0.1) / rows);
      const cellH = Math.min(0.23, (h - 0.1) / rows - 0.1);
      box(w - 0.02, 0.025, d - 0.02, fin.steel, 0, shelfY, 0, g);
      const pitch = w / per;
      for (let i = 0; i < per; i++) {
        const cx = -w / 2 + pitch * (i + 0.5);
        const cw = pitch - 0.016;
        const cy = shelfY + 0.0125 + cellH / 2;
        box(cw, cellH, cellD, fin.cellCase, cx, cy, 0, g);
        /* lighter lid and the rating label on the front */
        box(cw, 0.018, cellD, fin.cellTop, cx, cy + cellH / 2, 0, g);
        box(
          cw * 0.66,
          cellH * 0.34,
          0.005,
          fin.cellLabel,
          cx,
          cy + cellH * 0.06,
          cellD / 2 + 0.004,
          g,
        );
        /* the two posts, and the link bar bridging to the next cell */
        const ty = cy + cellH / 2 + 0.019;
        for (const s2 of [-1, 1])
          box(0.024, 0.026, 0.024, fin.copper, cx + s2 * cw * 0.3, ty, 0, g);
        if (i < per - 1)
          box(pitch * 0.55, 0.009, 0.018, fin.copper, cx + pitch * 0.5, ty + 0.015, 0, g);
      }
      /* string leads: red from the first post, black from the last */
      const ty = shelfY + 0.0125 + cellH + 0.019;
      cord(
        [
          [-w / 2 + pitch * 0.5 - (pitch - 0.016) * 0.3, ty, 0],
          [-w / 2 + 0.06, ty + 0.05, cellD * 0.3],
          [-w / 2 + 0.05, shelfY - 0.02, d / 2 - 0.05],
        ],
        g,
        fin.red,
        0.009,
      );
      cord(
        [
          [w / 2 - pitch * 0.5 + (pitch - 0.016) * 0.3, ty, 0],
          [w / 2 - 0.06, ty + 0.05, cellD * 0.3],
          [w / 2 - 0.05, shelfY - 0.02, d / 2 - 0.05],
        ],
        g,
        fin.cableBlack,
        0.009,
      );
    }
  }

  /**
   * One OLT chassis: its real line cards side by side, each carrying its real
   * GPON ports. Active ports are lit, spare ones dark.
   */
  function chassis(o: Olt, g: THREE.Object3D, w: number, y: number, h: number, front: number) {
    const body = o.vendor.includes('Alcatel') ? mat.chassisAlcatel : mat.chassisEricsson;
    const fw = w - 0.08;
    box(fw, h, 0.06, body, 0, y, 0.3 * front, g);
    /* Vendor and model above, the pliego's own code and card set below —
       where the real thing carries them. Every one of these strings is a
       datum: nodes.json's `vendor`, `code`, `cards` and `cardModel`, from
       the node's equipment table. What the chassis *looks* like is still
       interpretation; what it says it is, is not. */
    const bz = 0.032;
    box(fw, bz, 0.075, fin.bezel, 0, y + h / 2, 0.3 * front, g);
    box(fw, bz, 0.075, fin.bezel, 0, y - h / 2, 0.3 * front, g);
    const sz = 0.3 * front + 0.039;
    silkscreen(g, o.vendor.toUpperCase(), fw * 0.92, 0, y + h / 2, sz, {
      align: 'left',
      hm: bz * 0.8,
    });
    /* the Ericsson cards are the ones the pliego never names, so that half of
       the line simply says how many there are */
    const cards = o.cardModel ? `${o.cards} × ${o.cardModel}` : `${o.cards} tarjetas`;
    silkscreen(g, `${o.code} · ${cards}`, fw * 0.92, 0, y - h / 2, sz, {
      align: 'left',
      hm: bz * 0.8,
      color: '#9db4d8',
    });
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
        const py = y + h * 0.32 - (p + 0.5) * ((h * 0.62) / o.portsPerCard);
        portLed(cx, py, 0.345 * front, g, lit++ < o.portsActive);
      }
    }
    /* patch cords leaving the lit ports towards the side manager */
    for (const frac of [0.2, 0.5, 0.8]) {
      const cx = -usable / 2 + usable * frac;
      cord(
        [
          [cx, y, 0.35 * front],
          [cx - 0.06, y - h * 0.5, 0.46 * front],
          [-w / 2 + 0.06, y - h * 0.62, 0.34 * front],
        ],
        g,
      );
    }
  }

  /**
   * Wire-mesh cable tray (rejiband): side rails, longitudinal wires and rungs.
   *
   * Takes two points in room space rather than a horizontal pair plus a
   * height, because the plans do not only run the tray along the walls: Tineo
   * has a «Rejiband por el suelo», Infiesto a «bajada rejiband», and several
   * nodes drop a branch from the ceiling run to a floor duct. Orienting from
   * the direction vector covers all three with the same builder.
   */
  function rejiband(a: Vec3, b: Vec3, wTray = 0.3) {
    const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = dir.length();
    if (len < 0.2) return;
    const g = new THREE.Group();
    g.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.normalize());
    scene.add(g);
    const hh = 0.055;
    /* the two side rails, each a pair of wires */
    for (const s of [-1, 1]) {
      box(len, 0.012, 0.012, fin.steel, 0, hh, (s * wTray) / 2, g);
      box(len, 0.012, 0.012, fin.steel, 0, -hh, (s * wTray) / 2, g);
    }
    /* longitudinal bottom wires */
    for (const t of [-0.3, 0, 0.3]) {
      box(len, 0.01, 0.01, fin.steel, 0, -hh, t * wTray, g);
    }
    /* U-shaped rungs every 50 mm, drawn as one instanced mesh */
    const step = 0.05;
    const count = Math.max(2, Math.floor(len / step));
    const rung = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.008, 0.008, wTray),
      fin.steel,
      count,
    );
    const up = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.008, hh * 2, 0.008),
      fin.steel,
      count * 2,
    );
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
      [-0.3, 0.011, fin.fibre],
      [-0.1, 0.008, fin.fibre],
      [0.12, 0.014, fin.cableBlack],
      [0.31, 0.007, fin.cableBlue],
    ];
    const seg = Math.max(4, Math.round(len / 0.45));
    for (const [off, r, m] of lay) {
      const pts: Vec3[] = [];
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

  /**
   * The «tapas» of a floor cable duct: `n` lift-off chequer-plate covers in a
   * row from (x, z), each `w × d`. The caseta plans label them TAPAS and note
   * «PLANTA SIN SUELO» — they are the covers of the duct the cables run in,
   * not manholes and not a raised floor, so they sit flush with the slab.
   */
  function hatchRun(x: number, z: number, w: number, d: number, n: number) {
    /* the duct itself, seen as a dark recess through the joints */
    box(w * n + 0.03, 0.05, d + 0.03, fin.hatchWell, x + (w * n) / 2, -0.024, z + d / 2);
    for (let i = 0; i < n; i++) {
      const cx = x + w * (i + 0.5);
      const cz = z + d / 2;
      box(w - 0.012, 0.014, d - 0.012, fin.hatchPlate, cx, 0.007, cz);
      /* the two recessed lifting handles each cover has */
      for (const s of [-1, 1]) {
        box(w * 0.22, 0.006, 0.022, fin.hatchWell, cx, 0.015, cz + s * d * 0.3);
      }
    }
  }

  return {
    box,
    label,
    silkscreen,
    portLed,
    cord,
    rackFrame,
    odfUnit,
    dwdmUnit,
    splitterUnit,
    videoUnit,
    txCubeUnit,
    cgbtBay,
    acDistBay,
    powerBay,
    batteryBay,
    chassis,
    rejiband,
    hatchRun,
    leds,
  };
}
