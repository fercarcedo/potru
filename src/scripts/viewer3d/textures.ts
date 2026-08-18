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
  };
}
