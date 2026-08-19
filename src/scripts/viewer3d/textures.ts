/**
 * Procedural textures and materials for the 3D room. Pure: no scene state,
 * just canvas drawing and THREE.Material construction from plain numbers.
 * Split out of viewer3d.ts's buildRoom() verbatim — see that file's own
 * comment on why the room is reconstructed from the pliego's plans rather
 * than photographed.
 */
import * as THREE from 'three';

/** Draws into an offscreen canvas and wraps it as a THREE texture. */
export function cv(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

/** Blimea alone has a raised/practicable floor (60×60 tiles); every other
 *  node gets a plain speckled floor. */
export function buildFloorTexture(raisedFloor: boolean, W: number, D: number): THREE.CanvasTexture {
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
  return floorTex;
}

export function buildWallTexture(): THREE.CanvasTexture {
  return cv(256, 256, (g) => {
    g.fillStyle = '#d4d7db'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(150,158,166,.35)';
    for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 3, 256);
  });
}

export interface RoomMaterials {
  floor: THREE.MeshLambertMaterial;
  wall: THREE.MeshLambertMaterial;
  ceil: THREE.MeshLambertMaterial;
  door: THREE.MeshLambertMaterial;
  alu: THREE.MeshLambertMaterial;
  chassisAlcatel: THREE.MeshLambertMaterial;
  chassisEricsson: THREE.MeshLambertMaterial;
  chassisNew: THREE.MeshLambertMaterial;
  card: THREE.MeshLambertMaterial;
  glass: THREE.MeshLambertMaterial;
  tray: THREE.MeshLambertMaterial;
}

export function buildMaterials(floorTex: THREE.Texture, wallTex: THREE.Texture): RoomMaterials {
  return {
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
}

export interface Finishes {
  rail: THREE.MeshLambertMaterial;
  bezel: THREE.MeshLambertMaterial;
  trayFace: THREE.MeshLambertMaterial;
  adapter: THREE.MeshLambertMaterial;
  adapterBlue: THREE.MeshLambertMaterial;
  fibre: THREE.MeshLambertMaterial;
  fibreRed: THREE.MeshLambertMaterial;
  steel: THREE.MeshLambertMaterial;
  panel: THREE.MeshLambertMaterial;
  smoked: THREE.MeshLambertMaterial;
  breaker: THREE.MeshLambertMaterial;
  toggle: THREE.MeshLambertMaterial;
  cell: THREE.MeshLambertMaterial;
  module: THREE.MeshLambertMaterial;
  screen: THREE.MeshBasicMaterial;
  red: THREE.MeshLambertMaterial;
  cellCase: THREE.MeshLambertMaterial;
  cellTop: THREE.MeshLambertMaterial;
  cellLabel: THREE.MeshLambertMaterial;
  copper: THREE.MeshLambertMaterial;
  cableBlack: THREE.MeshLambertMaterial;
  cableBlue: THREE.MeshLambertMaterial;
  /** lift-off cover of a floor cable duct («tapa»): chequer plate */
  hatchPlate: THREE.MeshLambertMaterial;
  /** the recess the covers sit in, seen through the joints */
  hatchWell: THREE.MeshLambertMaterial;
  /** ventilation louvre let into a wall («salida de aire», «hueco de A/A») */
  louvre: THREE.MeshLambertMaterial;
  /** body of a passive optical module: PLC splitters are white, not livery grey */
  passive: THREE.MeshLambertMaterial;
  /** the RF side of a video shelf: F connectors and their coax */
  rfBody: THREE.MeshLambertMaterial;
  coax: THREE.MeshLambertMaterial;
  /** the woven mesh panel of an operator cage at the PAO */
  mesh: THREE.MeshLambertMaterial;
}

/** Extra finishes for the equipment detail (rails, cords, cell cases…). */
export function buildFinishes(): Finishes {
  return {
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
    hatchPlate: new THREE.MeshLambertMaterial({ map: buildChequerTexture() }),
    hatchWell: new THREE.MeshLambertMaterial({ color: 0x20242a }),
    louvre: new THREE.MeshLambertMaterial({ color: 0x8f959c }),
    passive: new THREE.MeshLambertMaterial({ color: 0xe3e7ea }),
    rfBody: new THREE.MeshLambertMaterial({ color: 0x2a2d33 }),
    coax: new THREE.MeshLambertMaterial({ color: 0x121417 }),
    mesh: new THREE.MeshLambertMaterial({
      map: buildMeshTexture(), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide,
    }),
  };
}

/** Woven wire mesh: what the PAO's cages are actually panelled with, and what
 *  lets you see whose kit is in which cage from the aisle. */
function buildMeshTexture(): THREE.CanvasTexture {
  const t = cv(64, 64, (g) => {
    g.clearRect(0, 0, 64, 64);
    g.strokeStyle = '#aeb5bd'; g.lineWidth = 4;
    for (const i of [0, 32]) {
      g.beginPath(); g.moveTo(i + 2, 0); g.lineTo(i + 2, 64); g.stroke();
      g.beginPath(); g.moveTo(0, i + 2); g.lineTo(64, i + 2); g.stroke();
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
    g.fillStyle = '#6f747b'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(255,255,255,.20)'; g.lineWidth = 5;
    g.lineCap = 'round';
    for (let i = -128; i < 128; i += 32) {
      for (const [dx, dy] of [[1, 1], [1, -1]] as const) {
        g.beginPath();
        g.moveTo(i + 64, 64 - dy * 10);
        g.lineTo(i + 64 + dx * 20, 64 + dy * 10);
        g.stroke();
      }
    }
    g.strokeStyle = 'rgba(24,27,32,.35)'; g.lineWidth = 3;
    for (let i = 0; i <= 128; i += 32) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}
