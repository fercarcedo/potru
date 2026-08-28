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
 * Rendering is physically based: MeshStandard materials with real
 * roughness/metalness, an indoor environment for the reflections they need to
 * read at all, filmic tone mapping and shadow maps. It used to run with
 * ColorManagement off and linear output "as in r128", which was parity with
 * the legacy single-page build; that build is long gone, and the flat look it
 * bought made a steel rack indistinguishable from a plastic bezel.
 */
import * as THREE from 'three';
import roomData from '../data/rooms.json';
import { cardCount, cardLabel, t, type Bi, type NetworkNode } from '../lib/data';
import { DOM } from '../lib/dom-ids';
import { escapeHtml as esc } from '../lib/escape-html';
import { ui } from '../i18n/ui';
import { initControls } from './viewer3d/controls';
import { createEquipmentBuilders, type UnitBuilder } from './viewer3d/equipment';
import { pointInPolygon } from './viewer3d/geometry';
import { computeOrientations } from './viewer3d/orientation';
import { HALO, buildShell, type Vent } from './viewer3d/shell';
import {
  buildEnvTexture,
  buildFinishes,
  buildFloorTexture,
  buildMaterials,
  buildWallTexture,
} from './viewer3d/textures';

interface Bay {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  /** base height when the cabinet is wall-mounted rather than floor-standing */
  y?: number;
  kind: string;
  label: string;
  /** indices into the node's olts[] that live in this cabinet */
  olts?: number[];
  /** the equipment model the plan names for this cabinet, where it names one */
  model?: string;
  /**
   * The plan draws this rack with a door swing, so it is a closed cabinet
   * with a hinged front — Langreo's two «Bastidor COGENT» — not an open
   * 19" frame like the rest.
   */
  enclosed?: boolean;
  /**
   * What the plan draws inside an operator cage at the PAO, in the same plan
   * metres as the cage itself. Without them every cage held the same generic
   * half-rack and there was no telling one operator's from another's.
   */
  racks?: { x: number; z: number; w: number; d: number; label?: string }[];
  /**
   * What the plan says this cabinet actually holds, when its label names more
   * than one thing («Repartidor FO + TX Cube», «GPON y vídeo», «DWDM y
   * splitter»). Each entry fills its own band of the rack; omitted, the
   * cabinet holds one unit of whatever `kind` implies.
   */
  units?: string[];
}
/** A run of rejiband, transcribed from the plan's hatched bands. */
interface Tray {
  /** where the run sits: under the ceiling, on the slab, or an explicit height */
  level?: 'ceiling' | 'floor' | number;
  /** the polyline it follows, in plan metres */
  pts: [number, number][];
  /** tray width; 0.3 m unless the plan says otherwise */
  w?: number;
  /** a vertical drop at pts[0] between `level` and `to` (a «bajada rejiband») */
  to?: 'ceiling' | 'floor' | number;
}
/** A row of lift-off covers over the floor cable duct («tapas»). */
interface Hatch {
  x: number;
  z: number;
  w: number;
  d: number;
  /** how many covers in the row; 1 unless the plan draws more */
  n?: number;
}
interface Room {
  source: string;
  h: number;
  /** the room has a raised access floor, as its plan rotulates */
  raisedFloor?: boolean;
  /** where the plan marks an extinguisher, in plan metres */
  extinguishers?: [number, number][];
  outline: [number, number][];
  doors: { edge: number; at: number; width: number }[];
  vents?: Vent[];
  bays: Bay[];
  trays?: Tray[];
  hatches?: Hatch[];
  /** modelling caveats, nested {es,en} like every other free-text field. */
  note?: Bi;
}

const ROOMS = roomData as unknown as Record<string, Room>;

let SV: { stop(): void } | null = null;

/**
 * The renderer and the environment it reflects, built once and kept.
 *
 * Both used to be per room, and neither depends on which node is open. The
 * environment was the expensive one — PMREM filtering a cubemap was most of
 * the first room's build and was paid again on every visit. The renderer is
 * shared for a second reason: a browser caps how many live WebGL contexts a
 * page may have, and a new one per room walks straight into that cap.
 */
let shared: {
  renderer: THREE.WebGLRenderer;
  env: THREE.Texture;
  /** true when the browser is rasterising in software; quality steps down */
  software: boolean;
} | null = null;

/**
 * Is the GPU real, or is the browser rasterising in software?
 *
 * WebGL is hardware accelerated wherever it can be — that is the browser's
 * decision, not ours, and `powerPreference` is the only lever we get. But it
 * silently falls back to a software rasteriser (SwiftShader on Chrome,
 * llvmpipe on Linux Mesa) when there is no usable GPU: on a locked-down
 * machine, in a VM, behind a blocklisted driver, or in a headless browser.
 * There the shadow pass and a 2× pixel ratio are the difference between a
 * room that turns and a slideshow, so it is worth knowing which we are on.
 */
function isSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const name = String(
    (info && gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || '',
  ).toLowerCase();
  return /swiftshader|llvmpipe|softpipe|software|microsoft basic render/.test(name);
}

function sharedRenderer(canvas: HTMLCanvasElement) {
  if (shared) return shared;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    /* on a laptop with both, ask for the discrete GPU rather than the one
       picked for battery life — this is a scene the visitor is looking at,
       not a background animation */
    powerPreference: 'high-performance',
  });
  /* Khronos neutral rather than ACES: it holds the palette's hues instead of
     pushing them warm, which is what a technical visualisation wants. */
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.35;
  const software = isSoftwareRenderer(renderer.getContext());
  /* Shadows are the first thing to go without a GPU: they double the draw
     calls for a room that is already thousands of boxes. */
  renderer.shadowMap.enabled = !software;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  /* PBR needs something to reflect; without it the cabinets read as flat
     gouache. See buildEnvTexture() for why it is a gradient rather than
     three's RoomEnvironment. */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const src = buildEnvTexture();
  const env = pmrem.fromEquirectangular(src).texture;
  src.dispose();
  pmrem.dispose();
  return (shared = { renderer, env, software });
}

/** Frees the geometry, materials and textures a room built. With the
 *  renderer shared, nothing else does it for us. */
function disposeScene(scene: THREE.Scene) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    for (const mat of [m.material].flat()) {
      if (!mat) continue;
      (mat as THREE.MeshStandardMaterial).map?.dispose();
      mat.dispose();
    }
  });
}

/** Stops the render loop and releases the current room's resources. */
export function stopRoom() {
  if (SV) {
    SV.stop();
    SV = null;
  }
}

/** Kinds that build their own enclosure: the CGBT's cabinet would z-fight
 *  with a generic body, and the battery stand is an open rack whose cells a
 *  generic body would hide. Named once because the bay loop has to skip
 *  them twice — for the body and again for the vented rear door. */
const OWN_ENCLOSURE = new Set(['cgbt', 'battery', 'void']);

const COLOR: Record<string, number> = {
  olt: 0x2e3238,
  odf: 0x39414c,
  transport: 0x36404e,
  splitter: 0x36404e,
  catv: 0x3b3a42,
  rack: 0x2e3238,
  power: 0x4a4f57,
  battery: 0x23262c,
  cgbt: 0x55606e,
  acdist: 0x55606e,
  ups: 0x8a9099,
  cabinet: 0x6f7680,
  cage: 0xc9cdd2,
  ac: 0x8f959c,
  empty: 0x4c5158,
  void: 0x14171c,
};

/** What a bay holds when its label names only one thing. */
const UNITS_OF_KIND: Record<string, string> = {
  olt: 'olt',
  odf: 'odf',
  transport: 'dwdm',
  splitter: 'splitter',
  catv: 'video',
};

/**
 * How much of a rack each unit wants when it shares the cabinet. Only the
 * ratios matter: a «Repartidor FO + TX Cube» gives the ODF three quarters of
 * the bay and the compact transport box the rest, which is roughly how the
 * elevations draw them.
 */
const UNIT_WEIGHT: Record<string, number> = {
  olt: 3,
  odf: 3,
  dwdm: 2,
  splitter: 2,
  video: 1.4,
  txcube: 1,
};

/** The kinds whose front is built band by band rather than as one cabinet. */
const RACK_UNITS = new Set(Object.keys(UNIT_WEIGHT));

/** Above this, a bay hangs clear of a visitor's head and is not an obstacle. */
const CEILING_MOUNTED = 1.8;

/** Where a tray level sits, in metres above the floor. */
function trayHeight(level: Tray['level'], H: number): number {
  if (level === 'floor') return 0.09;
  if (typeof level === 'number') return level;
  return Math.min(H - 0.18, 2.18);
}

export function buildRoom(n: NetworkNode) {
  stopRoom();
  const room = ROOMS[n.id];
  if (!room) return;
  const locale = document.documentElement.lang === 'en' ? 'en' : 'es';
  const T = ui(locale).viewer3d;

  const canvas = document.getElementById(DOM.svCanvas) as HTMLCanvasElement;
  const holder = canvas.parentElement!;
  const { renderer, env, software } = sharedRenderer(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1322);
  scene.environment = env;
  /* the gradient is what stands in for bounce off the walls and floor, so it
     carries more of the room than a reflection-only environment would */
  scene.environmentIntensity = 0.9;

  /* plan coordinates are centred on the room so the camera maths stays simple */
  const xs = room.outline.map((p) => p[0]);
  const zs = room.outline.map((p) => p[1]);
  const W = Math.max(...xs),
    D = Math.max(...zs),
    H = room.h;
  const poly: [number, number][] = room.outline.map(([x, z]) => [x - W / 2, z - D / 2]);

  scene.fog = new THREE.Fog(0x0b1322, Math.max(W, D) * 1.4, Math.max(W, D) * 4);
  const cam = new THREE.PerspectiveCamera(70, 1, 0.05, 100);

  /* ---- procedural textures, materials and equipment builders ---- */
  const raisedFloor = room.raisedFloor === true;
  const floorTex = buildFloorTexture(raisedFloor, W, D);
  const wallTex = buildWallTexture();
  const mat = buildMaterials(floorTex, wallTex);
  const fin = buildFinishes();
  const {
    box,
    label,
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
  } = createEquipmentBuilders(scene, mat, fin);

  const UNIT_BUILDER: Record<string, UnitBuilder> = {
    odf: odfUnit,
    dwdm: dwdmUnit,
    splitter: splitterUnit,
    video: videoUnit,
    txcube: txCubeUnit,
  };

  const { halo } = buildShell({
    software,
    scene,
    mat,
    poly,
    doors: room.doors,
    vents: room.vents,
    W,
    D,
    H,
    box,
    label,
    fin,
  });

  /* One body material per colour, not per cabinet: each distinct material
     costs a shader variant in the colour pass and another in the shadow
     pass, and a room has far more cabinets than colours. */
  const bodies = new Map<number, THREE.MeshStandardMaterial>();
  const body = (color: number) => {
    let m = bodies.get(color);
    if (!m)
      bodies.set(
        color,
        (m = new THREE.MeshStandardMaterial({ color, metalness: 0.15, roughness: 0.62 })),
      );
    return m;
  };

  /* ---- equipment bays ---- */
  const oldChassis: THREE.Object3D[] = [];
  const newChassis: THREE.Object3D[] = [];
  const solids: { x0: number; x1: number; z0: number; z1: number }[] = [];

  for (const bay of room.bays) {
    /* what a visitor has to walk round. A unit slung from the ceiling — the
       «A. acondicionado suspendido en el techo» of Tineo, the machine over
       Cangas' stair — is passed under, not round, and treating it as a solid
       closed the only aisle in Cangas. */
    if ((bay.y ?? 0) >= CEILING_MOUNTED) continue;
    solids.push({
      x0: bay.x - W / 2,
      x1: bay.x - W / 2 + bay.w,
      z0: bay.z - D / 2,
      z1: bay.z - D / 2 + bay.d,
    });
  }

  const orientOf = computeOrientations(room.bays, poly, solids, W, D);

  /* Each cage gets its own accent, so «which one is Adamo?» is answerable
     from across the room. The pliego carries no operator artwork — only the
     names on the plan — so the cages are keyed by colour and wordmark, not by
     anyone's logo. */
  const CAGE_ACCENT = [0x41e3d2, 0xe8a33d, 0x7f8fe0, 0xe06f8f, 0x6fc36f, 0xd0d5db];
  let cageIndex = 0;

  /**
   * An operator cage at the PAO: floor-to-ceiling posts, woven mesh panels, a
   * gate onto the aisle carrying the operator's name, and the racks the plan
   * actually draws inside it.
   */
  function buildCage(bay: Bay, g: THREE.Group, idx: number) {
    const gh = bay.h;
    const accent = CAGE_ACCENT[idx % CAGE_ACCENT.length]!;
    const accentMat = new THREE.MeshStandardMaterial({
      color: accent,
      metalness: 0.2,
      roughness: 0.55,
    });
    /* The gate opens onto the aisle — the middle of the room — so both rows
       of cages present their name to whoever is walking between them. */
    const gateOnMinusZ = bay.z - D / 2 + bay.d / 2 > 0;
    const gz = ((gateOnMinusZ ? -1 : 1) * bay.d) / 2;

    for (const [px, pz] of [
      [-bay.w / 2, -bay.d / 2],
      [bay.w / 2, -bay.d / 2],
      [-bay.w / 2, bay.d / 2],
      [bay.w / 2, bay.d / 2],
    ] as const)
      box(0.06, gh, 0.06, mat.alu, px, gh / 2, pz, g);
    box(bay.w, 0.05, bay.d, mat.alu, 0, gh, 0, g);

    /* mesh on the three closed sides, and on the gate above its name panel */
    const panels: [number, number, number, number][] = [
      [-bay.w / 2, 0, 0.02, bay.d],
      [bay.w / 2, 0, 0.02, bay.d],
      [0, -gz, bay.w, 0.02],
    ];
    /* The mesh has to keep the same cell size whatever the panel measures.
       Repeat lives on the texture, so doing it that way meant a cloned
       material and texture per panel — and every distinct material costs a
       shader variant for the colour pass and another for the shadow pass,
       which is what made this room take five seconds to build. Scaling the
       geometry's own UVs gets the same picture from one shared material. */
    const meshPanel = (m: THREE.Mesh, pw: number, ph: number) => {
      const uv = m.geometry.getAttribute('uv') as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, uv.getX(i) * Math.max(0.5, pw) * 16, uv.getY(i) * Math.max(0.5, ph) * 16);
      }
      uv.needsUpdate = true;
      return m;
    };
    for (const [px, pz, pw, pd] of panels) {
      meshPanel(box(pw, gh - 0.1, pd, fin.mesh, px, gh / 2, pz, g), Math.max(pw, pd), gh);
    }

    /* the gate: an accent frame, the operator's name at eye level, mesh above */
    box(bay.w, 0.06, 0.05, accentMat, 0, gh - 0.03, gz, g);
    for (const sx of [-1, 1])
      box(0.05, gh, 0.05, accentMat, sx * (bay.w / 2 - 0.03), gh / 2, gz, g);
    /* the name plate sits at eye level, mesh above and below it */
    const ny = 1.45,
      nh = 0.62;
    meshPanel(
      box(
        bay.w - 0.1,
        gh - ny - nh / 2 - 0.05,
        0.02,
        fin.mesh,
        0,
        (ny + nh / 2 + gh) / 2 - 0.02,
        gz,
        g,
      ),
      bay.w,
      gh - ny - nh / 2,
    );
    meshPanel(
      box(bay.w - 0.1, ny - nh / 2 - 0.05, 0.02, fin.mesh, 0, (ny - nh / 2) / 2, gz, g),
      bay.w,
      ny - nh / 2,
    );
    box(bay.w - 0.1, nh, 0.03, accentMat, 0, ny, gz, g);
    box(0.05, 0.2, 0.05, fin.steel, bay.w / 2 - 0.14, 1.02, gz * 1.12, g); /* latch */

    /* the name, big, on the gate and again over the top rail */
    const name = bay.label.split('·').pop()!.trim();
    label(
      name.toUpperCase(),
      Math.min(bay.w * 0.78, 1.1),
      g.position.x,
      ny,
      g.position.z + gz * 1.06,
      gateOnMinusZ ? Math.PI : 0,
      '#0d1218',
    );
    label(
      bay.label,
      Math.min(bay.w * 0.9, 1.35),
      g.position.x,
      gh + 0.14,
      g.position.z,
      0,
      '#c8d4e2',
    );

    /* what the plan draws inside */
    for (const rk of bay.racks ?? []) {
      const sub = new THREE.Group();
      sub.position.set(rk.x - bay.x - bay.w / 2 + rk.w / 2, 0, rk.z - bay.z - bay.d / 2 + rk.d / 2);
      g.add(sub);
      const rh = 2.0;
      box(rk.w, rh, rk.d, body(COLOR['rack']!), 0, rh / 2, 0, sub);
      rackFrame(sub, rk.w, rh, rk.d / 2, 0);
      for (let i = 0; i < 6; i++) {
        box(rk.w - 0.13, 0.13, 0.04, fin.module, 0, 0.45 + i * 0.26, rk.d * 0.48, sub);
        portLed(rk.w / 2 - 0.11, 0.45 + i * 0.26, rk.d * 0.52, sub, i % 3 !== 2, 'status');
      }
      if (rk.label) {
        label(
          rk.label,
          Math.min(rk.w * 0.95, 0.7),
          g.position.x + sub.position.x,
          rh + 0.09,
          g.position.z + sub.position.z,
          0,
          '#93a6bf',
        );
      }
    }
  }

  /**
   * The OLT unit of a cabinet: the real line cards and lit GPON ports of every
   * OLT the pliego's table puts in this bay, plus the single dual GPON/XGS-PON
   * chassis the renewal replaces them with, hidden until the mode toggle.
   * Not a plain UnitBuilder because it is the one unit that needs the node.
   */
  function buildOltUnit(
    bay: Bay,
    g: THREE.Object3D,
    w: number,
    y0: number,
    y1: number,
    front: number,
  ) {
    const olts = (bay.olts ?? []).map((i) => n.olts[i]!).filter(Boolean);
    const slot = (y1 - y0) / Math.max(1, olts.length);
    olts.forEach((o, i) => {
      const sub = new THREE.Group();
      g.add(sub);
      oldChassis.push(sub);
      chassis(o, sub, w, y0 + i * slot + slot / 2, Math.min(slot - 0.12, 0.5), front);
    });
    if (!olts.length) return;
    const nu = new THREE.Group();
    g.add(nu);
    nu.visible = false;
    newChassis.push(nu);
    const my = (y0 + y1) / 2,
      mh = Math.min(y1 - y0 - 0.1, 0.85);
    box(w - 0.08, mh, 0.06, mat.chassisNew, 0, my, 0.3 * front, nu);
    box(w - 0.08, 0.024, 0.08, fin.bezel, 0, my + mh / 2, 0.3 * front, nu);
    for (let i = 0; i < 12; i++) {
      portLed(-w / 2 + 0.09 + i * ((w - 0.18) / 11), my, 0.345 * front, nu, true);
    }
  }

  for (const bay of room.bays) {
    const g = new THREE.Group();
    g.position.set(bay.x - W / 2 + bay.w / 2, 0, bay.z - D / 2 + bay.d / 2);
    scene.add(g);
    const base = bay.y ?? 0;
    if (bay.kind === 'cage') {
      /* A cage is a room within the room, not a cabinet: it stays square to
         the plan. Turning it by the cabinet solver's `rot` both mismatched
         its own w x d footprint and, for the PAO's bottom row, flipped its
         gate round to face the wall. */
      buildCage(bay, g, cageIndex++);
      continue;
    }

    /* local +Z is the front from here on, whichever way the cabinet is turned */
    const { rot, faceW, faceD } = orientOf.get(bay)!;
    g.rotation.y = rot;
    const front = 1;
    const fz = faceD / 2;

    if (bay.kind === 'void') {
      /* a floor opening — Cangas' stair down to the basement. The plan draws
         it inside the room with its «barandilla», so it is a thing you walk
         round, not a cabinet and not floor. */
      box(
        faceW,
        0.02,
        faceD,
        new THREE.MeshStandardMaterial({ color: COLOR['void']!, metalness: 0, roughness: 0.95 }),
        0,
        0.01,
        0,
        g,
      );
      for (const [px, pz, pw, pd] of [
        [0, -faceD / 2, faceW, 0.04],
        [0, faceD / 2, faceW, 0.04],
        [-faceW / 2, 0, 0.04, faceD],
        [faceW / 2, 0, 0.04, faceD],
      ] as const) {
        box(pw, 0.035, pd, fin.steel, px, bay.h, pz, g);
        box(pw, 0.03, pd, fin.steel, px, bay.h * 0.55, pz, g);
      }
      for (const [px, pz] of [
        [-faceW / 2, -faceD / 2],
        [faceW / 2, -faceD / 2],
        [-faceW / 2, faceD / 2],
        [faceW / 2, faceD / 2],
      ] as const)
        box(0.045, bay.h, 0.045, fin.rail, px, bay.h / 2, pz, g);
      label(
        bay.label,
        Math.min(faceW * 0.95, 0.8),
        g.position.x,
        bay.h + 0.12,
        g.position.z,
        rot,
        '#c8d4e2',
      );
      continue;
    }

    if (!OWN_ENCLOSURE.has(bay.kind)) {
      box(faceW, bay.h, faceD, body(COLOR[bay.kind] ?? 0x4c5158), 0, base + bay.h / 2, 0, g);
    }

    /* What this cabinet holds: the plan's own reading where the label names
       more than one thing, otherwise the single unit `kind` implies. */
    const units = (bay.units ?? [UNITS_OF_KIND[bay.kind] ?? '']).filter((u) => RACK_UNITS.has(u));

    if (units.length) {
      rackFrame(g, faceW, bay.h, fz, base);
      /* share the rack's usable height between the units, by weight */
      const y0 = base + 0.3,
        y1 = base + bay.h - 0.15;
      const total = units.reduce((s, u) => s + (UNIT_WEIGHT[u] ?? 1), 0);
      let y = y0;
      for (const u of units) {
        const top = y + ((y1 - y0) * (UNIT_WEIGHT[u] ?? 1)) / total;
        if (u === 'olt') buildOltUnit(bay, g, faceW, y, top, front);
        else UNIT_BUILDER[u]!(g, faceW, fz, y, top, front, bay.model);
        y = top;
      }
    } else if (bay.kind === 'cgbt') {
      cgbtBay(g, faceW, bay.h, faceD, fz, base);
    } else if (bay.kind === 'acdist') {
      acDistBay(g, faceW, bay.h, faceD, fz, base);
    } else if (bay.kind === 'power') {
      powerBay(g, faceW, bay.h, fz, base);
    } else if (bay.kind === 'battery') {
      batteryBay(g, faceW, bay.h, faceD, base);
    } else if (bay.kind === 'ups') {
      rackFrame(g, faceW, bay.h, fz, base);
      box(faceW - 0.18, 0.12, 0.02, fin.screen, 0, base + bay.h * 0.74, fz * 1.02, g);
      for (let i = 0; i < 3; i++)
        portLed(-0.08 + i * 0.08, base + bay.h * 0.6, fz * 1.03, g, true, 'status');
    } else if (bay.kind === 'rack' || bay.kind === 'empty') {
      rackFrame(g, faceW, bay.h, fz, base);
      if (bay.kind === 'rack') {
        for (let i = 0; i < 5; i++) {
          box(faceW - 0.13, 0.13, 0.045, fin.module, 0, base + 0.45 + i * 0.28, fz * 0.96, g);
          portLed(faceW / 2 - 0.11, base + 0.45 + i * 0.28, fz * 1.02, g, i % 3 !== 2, 'status');
        }
      }
      if (bay.enclosed) {
        /* a perforated front door on its hinges, as the plan's door swing
           says: the kit behind it shows through the ventilation slots */
        const dw = faceW - 0.03,
          dh = bay.h - 0.06,
          dz = fz * 1.06;
        box(dw, 0.03, 0.028, fin.bezel, 0, base + bay.h - 0.03, dz, g);
        box(dw, 0.03, 0.028, fin.bezel, 0, base + 0.03, dz, g);
        for (const sx of [-1, 1])
          box(0.03, dh, 0.028, fin.bezel, (sx * dw) / 2, base + bay.h / 2, dz, g);
        for (let i = 0; i < Math.round(dh / 0.09); i++) {
          box(dw - 0.08, 0.05, 0.02, fin.rail, 0, base + 0.09 + i * 0.09, dz, g);
        }
        /* hinges down one side, handle down the other */
        for (const hy of [0.2, 0.5, 0.8]) {
          box(0.03, 0.08, 0.05, fin.steel, -dw / 2, base + bay.h * hy, dz - 0.01, g);
        }
        box(0.025, 0.16, 0.05, fin.steel, dw / 2 - 0.06, base + bay.h * 0.48, dz + 0.02, g);
      }
    }

    /* the rear is a vented door, not a bare slab: from behind a rack still reads
       as equipment rather than a black box */
    if (!OWN_ENCLOSURE.has(bay.kind) && bay.h > 0.9) {
      const bz = -fz * 1.01;
      box(faceW - 0.05, bay.h - 0.08, 0.012, fin.bezel, 0, base + bay.h / 2, bz, g);
      for (let i = 0; i < Math.max(4, Math.round((bay.h - 0.3) / 0.16)); i++) {
        box(faceW - 0.16, 0.055, 0.016, fin.rail, 0, base + 0.2 + i * 0.16, -fz * 1.03, g);
      }
      box(0.02, 0.13, 0.03, fin.steel, faceW / 2 - 0.07, base + bay.h * 0.5, -fz * 1.05, g);
    }

    /* the label goes on the face that looks into the room */
    const lo = new THREE.Vector3(0, base + bay.h + 0.07, fz + 0.02)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), rot)
      .add(g.position);
    label(bay.label, Math.min(faceW * 0.95, 0.8), lo.x, lo.y, lo.z, rot, '#c8d4e2');
  }

  /* ---- rejiband ----
     Transcribed per room, because the plans draw the runs explicitly and they
     are not one straight length over each row: Felechosa and Navia ring the
     whole room, Tineo has a branch down the middle and a run along the floor,
     Infiesto and Arriondas a «bajada». */
  const trayY = Math.min(H - 0.18, 2.18);
  for (const t of room.trays ?? []) {
    const y = trayHeight(t.level, H);
    const pts = t.pts.map(([x, z]) => [x - W / 2, y, z - D / 2] as [number, number, number]);
    for (let i = 0; i + 1 < pts.length; i++) rejiband(pts[i]!, pts[i + 1]!, t.w);
    /* a «bajada»: the same tray turned upright, linking two levels */
    if (t.to !== undefined && pts[0]) {
      const [dx, , dz] = pts[0];
      rejiband([dx, y, dz], [dx, trayHeight(t.to, H), dz], t.w);
    }
  }
  /* a bundle dropping off the ceiling tray into each rack it passes over */
  for (const bay of room.bays) {
    if (bay.kind === 'cage' || (bay.y ?? 0) > 0.9 || bay.h < 1.2) continue;
    const cx = bay.x - W / 2 + bay.w / 2;
    const cz = bay.z - D / 2 + bay.d / 2;
    const top = (bay.y ?? 0) + bay.h;
    if (top > trayY - 0.05) continue;
    const m =
      bay.kind === 'power' || bay.kind === 'cgbt' || bay.kind === 'acdist'
        ? fin.cableBlack
        : fin.fibre;
    cord(
      [
        [cx - 0.06, trayY - 0.06, cz],
        [cx - 0.05, trayY - 0.16, cz + 0.05],
        [cx - 0.03, top + 0.06, cz + 0.02],
        [cx - 0.02, top - 0.02, cz],
      ],
      scene,
      m,
      0.009,
    );
  }

  /* ---- «tapas»: the lift-off covers of the floor cable duct ---- */
  for (const h of room.hatches ?? []) {
    hatchRun(h.x - W / 2, h.z - D / 2, h.w, h.d, h.n ?? 1);
  }

  /* fire extinguishers. Where the plan marks them — the PAO draws three —
     that is where they go; elsewhere, one beside the door as the elevations
     show. */
  const extinguisher = (x: number, z: number) => {
    box(0.11, 0.42, 0.11, fin.red, x, 0.68, z);
    box(0.05, 0.09, 0.05, fin.rail, x, 0.93, z);
  };
  if (room.extinguishers?.length) {
    for (const [x, z] of room.extinguishers) extinguisher(x - W / 2, z - D / 2);
  } else if (room.doors[0]) {
    const d0 = room.doors[0];
    const [ax, az] = poly[d0.edge]!;
    const [bx, bz] = poly[(d0.edge + 1) % poly.length]!;
    const ang = Math.atan2(bz - az, bx - ax);
    const t = d0.at + d0.width + 0.28;
    const ex = ax + Math.cos(ang) * t,
      ez = az + Math.sin(ang) * t;
    const inx = ex - Math.sin(ang) * -0.12,
      inz = ez + Math.cos(ang) * -0.12;
    if (pointInPolygon(poly, inx, inz)) extinguisher(inx, inz);
  }

  /* ---- legend ---- */
  const olts = n.olts;
  document.getElementById(DOM.svLegend)!.innerHTML =
    `<b style="color:#41e3d2">${esc(T.legendReconstructed)}</b><br>` +
    `· ${esc(T.legendFloorPlan)}: <span class="mono">${esc(room.source.split('/').pop() ?? '')}</span><br>` +
    `· ${esc(T.legendRoom(W.toFixed(2), D.toFixed(2), H.toFixed(2)))}<br>` +
    `· ${esc(T.legendCabinets(room.bays.length))}<br>` +
    (olts.length
      ? `· ${esc(T.legendOltCards(olts.length, cardCount(n)))}<br>` +
        olts
          .map(
            (o) =>
              `<span class="mono" style="color:#9db4d8">${esc(o.code)}</span> ${esc(cardLabel(o))}` +
              T.legendOltLine(o.portsPerCard, o.portsActive, o.portsTotal),
          )
          .join('<br>')
      : `· ${esc(T.legendNoOlt)}`) +
    (room.note ? `<br><span style="color:#5a6f8d">${esc(t(room.note, locale))}</span>` : '');

  const modeBtn = document.getElementById(DOM.svMode)!;
  let renewed = false;
  modeBtn.textContent = `⇄ ${T.modeRenewed}`;
  modeBtn.onclick = () => {
    renewed = !renewed;
    oldChassis.forEach((r) => (r.visible = !renewed));
    newChassis.forEach((r) => (r.visible = renewed));
    halo.intensity = renewed ? HALO : 0;
    modeBtn.textContent = renewed ? `⇄ ${T.modeCurrent}` : `⇄ ${T.modeRenewed}`;
  };

  /* ---- camera and controls ---- */
  /* Where the visitor lands and which way they face are both initControls'
     to decide: the second depends on the first, and only it knows where the
     walk-in stopped. See arrivalAim() in walkable.ts. */
  const controls = initControls({
    cam,
    canvas,
    holder,
    renderer,
    scene,
    poly,
    solids,
    startDoor: room.doors[0],
    leds,
    software,
  });
  SV = {
    stop() {
      controls.stop();
      disposeScene(scene);
    },
  };
}
