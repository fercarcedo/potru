/**
 * Procedural textures and materials for the 3D room. Pure: no scene state,
 * just canvas drawing and THREE.Material construction from plain numbers.
 * Split out of viewer3d.ts's buildRoom() verbatim — see that file's own
 * comment on why the room is reconstructed from the pliego's plans rather
 * than photographed.
 */
import * as THREE from 'three';

/** Draws into an offscreen canvas and wraps it as a THREE texture. */
export function cv(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D) => void,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  /* every texture built here is a colour map, and with ColorManagement on an
     unmarked one is read as linear and comes out dark */
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * What the room reflects: a bright ceiling fading to a dark floor, as an
 * equirectangular strip for PMREM to filter into an environment map.
 *
 * three ships RoomEnvironment for this, but it is a whole scene of boxes that
 * PMREM has to render into six faces — four seconds of the first room's build,
 * and a demo living room is not what a windowless equipment room reflects
 * anyway. A vertical gradient is both cheaper and closer to the truth: these
 * rooms are lit from ceiling panels and have no other light in them.
 */
export function buildEnvTexture(): THREE.DataTexture {
  /* wide enough for PMREM to have something to filter across: a one-pixel
     column is a degenerate equirect and does not survive the mip chain */
  const w = 64,
    h = 32;
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < h; i++) {
    const t = i / (h - 1); // 0 at the top of the strip
    /* ceiling panels, then wall, then the floor's dim bounce */
    /* ceiling panels down to the wall, then the floor's own dim bounce —
       which has to be more than nothing, or everything below waist height in
       these rooms goes flat */
    const v = t < 0.42 ? 1 - t * 0.5 : 0.79 - (t - 0.42) * 0.67;
    for (let j = 0; j < w; j++) {
      const o = (i * w + j) * 4;
      data[o] = Math.round(238 * v);
      data[o + 1] = Math.round(244 * v);
      data[o + 2] = Math.round(250 * v);
      data[o + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, w, h);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Blimea alone has a raised/practicable floor (60×60 tiles); every other
 *  node gets a plain speckled floor. */
export function buildFloorTexture(raisedFloor: boolean, W: number, D: number): THREE.CanvasTexture {
  const floorTex = cv(512, 512, (g) => {
    if (raisedFloor) {
      /* falso suelo practicable: 60×60 tiles */
      g.fillStyle = '#7d8289';
      g.fillRect(0, 0, 512, 512);
      g.strokeStyle = '#3a3f47';
      g.lineWidth = 4;
      for (let i = 0; i <= 4; i++) {
        g.beginPath();
        g.moveTo(i * 128, 0);
        g.lineTo(i * 128, 512);
        g.stroke();
        g.beginPath();
        g.moveTo(0, i * 128);
        g.lineTo(512, i * 128);
        g.stroke();
      }
      for (let x = 64; x < 512; x += 128)
        for (let y = 64; y < 512; y += 128) {
          g.fillStyle = '#6d7279';
          g.fillRect(x - 6, y - 6, 12, 12);
        }
    } else {
      g.fillStyle = '#8d9199';
      g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 2400; i++) {
        g.fillStyle = `rgba(${(60 + Math.random() * 40) | 0},${(60 + Math.random() * 40) | 0},${(70 + Math.random() * 40) | 0},.15)`;
        g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      }
      g.strokeStyle = 'rgba(40,44,52,.4)';
      g.lineWidth = 2;
      for (let i = 0; i <= 4; i++) {
        g.beginPath();
        g.moveTo(i * 128, 0);
        g.lineTo(i * 128, 512);
        g.stroke();
        g.beginPath();
        g.moveTo(0, i * 128);
        g.lineTo(512, i * 128);
        g.stroke();
      }
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(W / 1.4, D / 1.4);
  return floorTex;
}

export function buildWallTexture(): THREE.CanvasTexture {
  return cv(256, 256, (g) => {
    g.fillStyle = '#d4d7db';
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(150,158,166,.35)';
    for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 3, 256);
  });
}

/**
 * How a surface behaves under light, as three's PBR model wants it: 0
 * metalness is paint or plastic, 1 is bare metal, and roughness is how
 * scattered the reflection is. Naming the handful of real materials once,
 * rather than picking numbers per call, is what keeps a steel rack from
 * looking like a plastic bezel — which was the whole problem with everything
 * being MeshLambert.
 */
const SURFACE = {
  /* bare and brushed metal: rack posts, tray wire, chequer plate, busbars */
  steel: { metalness: 0.9, roughness: 0.42 },
  brushed: { metalness: 0.85, roughness: 0.55 },
  copper: { metalness: 1, roughness: 0.38 },
  /* powder-coated steel: cabinet bodies, panels, bezels */
  paint: { metalness: 0.15, roughness: 0.62 },
  matte: { metalness: 0.05, roughness: 0.8 },
  /* mouldings: adapters, breakers, cable sheath */
  plastic: { metalness: 0, roughness: 0.5 },
  rubber: { metalness: 0, roughness: 0.78 },
  /* the room itself */
  masonry: { metalness: 0, roughness: 0.94 },
} as const;

type Surface = keyof typeof SURFACE;

/** A PBR material of the given colour and surface, in one line. */
function pbr(
  color: number,
  surface: Surface,
  extra: THREE.MeshStandardMaterialParameters = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, ...SURFACE[surface], ...extra });
}

export interface RoomMaterials {
  floor: THREE.MeshStandardMaterial;
  wall: THREE.MeshStandardMaterial;
  ceil: THREE.MeshStandardMaterial;
  door: THREE.MeshStandardMaterial;
  alu: THREE.MeshStandardMaterial;
  chassisAlcatel: THREE.MeshStandardMaterial;
  chassisEricsson: THREE.MeshStandardMaterial;
  chassisNew: THREE.MeshStandardMaterial;
  card: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  tray: THREE.MeshStandardMaterial;
}

export function buildMaterials(floorTex: THREE.Texture, wallTex: THREE.Texture): RoomMaterials {
  return {
    floor: pbr(0xffffff, 'masonry', { map: floorTex, side: THREE.DoubleSide, roughness: 0.72 }),
    wall: pbr(0xffffff, 'masonry', { map: wallTex, side: THREE.DoubleSide }),
    ceil: pbr(0x9aa0a8, 'matte', { side: THREE.DoubleSide }),
    door: pbr(0x6f7680, 'paint'),
    alu: pbr(0xc9cdd2, 'brushed'),
    chassisAlcatel: pbr(0xb9bec6, 'paint'),
    chassisEricsson: pbr(0x3a4d6e, 'paint'),
    chassisNew: pbr(0x11313a, 'paint'),
    card: pbr(0x59626f, 'paint', { roughness: 0.55 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xaad4e8,
      transparent: true,
      opacity: 0.16,
      roughness: 0.08,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
    tray: pbr(0x8a9099, 'brushed'),
  };
}

export interface Finishes {
  rail: THREE.MeshStandardMaterial;
  bezel: THREE.MeshStandardMaterial;
  trayFace: THREE.MeshStandardMaterial;
  adapter: THREE.MeshStandardMaterial;
  adapterBlue: THREE.MeshStandardMaterial;
  fibre: THREE.MeshStandardMaterial;
  fibreRed: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  panel: THREE.MeshStandardMaterial;
  smoked: THREE.MeshStandardMaterial;
  breaker: THREE.MeshStandardMaterial;
  toggle: THREE.MeshStandardMaterial;
  cell: THREE.MeshStandardMaterial;
  module: THREE.MeshStandardMaterial;
  screen: THREE.MeshBasicMaterial;
  red: THREE.MeshStandardMaterial;
  cellCase: THREE.MeshStandardMaterial;
  cellTop: THREE.MeshStandardMaterial;
  cellLabel: THREE.MeshStandardMaterial;
  copper: THREE.MeshStandardMaterial;
  cableBlack: THREE.MeshStandardMaterial;
  cableBlue: THREE.MeshStandardMaterial;
  /** lift-off cover of a floor cable duct («tapa»): chequer plate */
  hatchPlate: THREE.MeshStandardMaterial;
  /** the recess the covers sit in, seen through the joints */
  hatchWell: THREE.MeshStandardMaterial;
  /** ventilation louvre let into a wall («salida de aire», «hueco de A/A») */
  louvre: THREE.MeshStandardMaterial;
  /** body of a passive optical module: PLC splitters are white, not livery grey */
  passive: THREE.MeshStandardMaterial;
  /** the RF side of a video shelf: F connectors and their coax */
  rfBody: THREE.MeshStandardMaterial;
  coax: THREE.MeshStandardMaterial;
  /** the woven mesh panel of an operator cage at the PAO */
  mesh: THREE.MeshStandardMaterial;
}

/** Extra finishes for the equipment detail (rails, cords, cell cases…). */
export function buildFinishes(): Finishes {
  return {
    rail: pbr(0x1d2126, 'steel'),
    bezel: pbr(0x33383f, 'paint'),
    trayFace: pbr(0xb9bfc7, 'paint'),
    adapter: pbr(0x2f8f5b, 'plastic'),
    adapterBlue: pbr(0x3763a8, 'plastic'),
    fibre: pbr(0xf2d024, 'plastic'),
    fibreRed: pbr(0xd8503f, 'plastic'),
    steel: pbr(0xa9aeb5, 'brushed'),
    panel: pbr(0xd7dbdf, 'paint'),
    smoked: pbr(0x2b3138, 'plastic', { transparent: true, opacity: 0.72, roughness: 0.2 }),
    breaker: pbr(0xecf0f2, 'plastic'),
    toggle: pbr(0x1b1f24, 'plastic'),
    cell: pbr(0x2b2f36, 'plastic'),
    module: pbr(0x4a525d, 'paint'),
    screen: new THREE.MeshBasicMaterial({ color: 0x184a44, toneMapped: false }),
    red: pbr(0xc0392b, 'paint'),
    cellCase: pbr(0x24272c, 'plastic'),
    cellTop: pbr(0x3a3f46, 'plastic'),
    cellLabel: pbr(0xd8dde2, 'matte'),
    copper: pbr(0xb87333, 'copper'),
    cableBlack: pbr(0x24262a, 'rubber'),
    cableBlue: pbr(0x2f5d9e, 'rubber'),
    hatchPlate: pbr(0xffffff, 'brushed', { map: buildChequerTexture() }),
    hatchWell: pbr(0x20242a, 'matte'),
    louvre: pbr(0x8f959c, 'brushed'),
    passive: pbr(0xe3e7ea, 'paint'),
    rfBody: pbr(0x2a2d33, 'paint'),
    coax: pbr(0x121417, 'rubber'),
    mesh: pbr(0xffffff, 'brushed', {
      map: buildMeshTexture(),
      transparent: true,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
    }),
  };
}

/** Woven wire mesh: what the PAO's cages are actually panelled with, and what
 *  lets you see whose kit is in which cage from the aisle. */
function buildMeshTexture(): THREE.CanvasTexture {
  const t = cv(64, 64, (g) => {
    g.clearRect(0, 0, 64, 64);
    g.strokeStyle = '#aeb5bd';
    g.lineWidth = 4;
    for (const i of [0, 32]) {
      g.beginPath();
      g.moveTo(i + 2, 0);
      g.lineTo(i + 2, 64);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i + 2);
      g.lineTo(64, i + 2);
      g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Chequer plate, for the lift-off covers of the floor cable duct. The plans
 *  draw the «tapas» cross-hatched; the caseta nodes are «PLANTA SIN SUELO», so
 *  what is under them is the duct, not a raised-floor void. */
function buildChequerTexture(): THREE.CanvasTexture {
  const t = cv(128, 128, (g) => {
    g.fillStyle = '#6f747b';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(255,255,255,.20)';
    g.lineWidth = 5;
    g.lineCap = 'round';
    for (let i = -128; i < 128; i += 32) {
      for (const [dx, dy] of [
        [1, 1],
        [1, -1],
      ] as const) {
        g.beginPath();
        g.moveTo(i + 64, 64 - dy * 10);
        g.lineTo(i + 64 + dx * 20, 64 + dy * 10);
        g.stroke();
      }
    }
    g.strokeStyle = 'rgba(24,27,32,.35)';
    g.lineWidth = 3;
    for (let i = 0; i <= 128; i += 32) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 128);
      g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}
