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

  function portLed(x: number, y: number, z: number, parent: THREE.Object3D, on: boolean) {
    /* DoubleSide: cabinets against the far wall present their face towards -Z */
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.016, 0.011),
      new THREE.MeshBasicMaterial({ color: on ? 0x39ff88 : 0x0d1218, side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    parent.add(m);
    if (on) leds.push({ m, base: 0x39ff88, ph: Math.random() * 6 });
  }

  /**
   * One OLT chassis: its real line cards side by side, each carrying its real
   * GPON ports. Active ports are lit, spare ones dark.
   */
  function chassis(o: Olt, g: THREE.Object3D, w: number, y: number, h: number, front: number) {
    const body = o.vendor.includes('Alcatel') ? mat.chassisAlcatel : mat.chassisEricsson;
    box(w - 0.08, h, 0.06, body, 0, y, 0.3 * front, g);
    const usable = w - 0.14;
    const step = usable / o.cards;
    let lit = 0;
    for (let c = 0; c < o.cards; c++) {
      const cx = -usable / 2 + step * (c + 0.5);
      box(Math.min(step * 0.7, 0.05), h * 0.78, 0.03, mat.card, cx, y, 0.325 * front, g);
      for (let p = 0; p < o.portsPerCard; p++) {
        const py = y + h * 0.32 - (p + 0.5) * (h * 0.62 / o.portsPerCard);
        portLed(cx, py, 0.345 * front, g, lit++ < o.portsActive);
      }
    }
  }

  for (const bay of room.bays) {
    const g = new THREE.Group();
    g.position.set(bay.x - W / 2 + bay.w / 2, 0, bay.z - D / 2 + bay.d / 2);
    scene.add(g);
    const base = bay.y ?? 0;
    solids.push({
      x0: bay.x - W / 2, x1: bay.x - W / 2 + bay.w,
      z0: bay.z - D / 2, z1: bay.z - D / 2 + bay.d,
    });

    if (bay.kind === 'cage') {
      /* operator cage: aluminium frame with glass/mesh panels */
      const gh = bay.h;
      box(bay.w, 0.05, bay.d, mat.alu, 0, gh, 0, g);
      for (const [px, pz, pw, pd] of [
        [0, -bay.d / 2, bay.w, 0.03], [0, bay.d / 2, bay.w, 0.03],
        [-bay.w / 2, 0, 0.03, bay.d], [bay.w / 2, 0, 0.03, bay.d],
      ] as const) box(pw, gh, pd, mat.glass, px, gh / 2, pz, g);
      box(0.5, 1.9, 0.5, new THREE.MeshLambertMaterial({ color: 0x2e3238 }), 0, 0.95, 0, g);
      label(bay.label, Math.min(bay.w * 0.8, 1.0), g.position.x, gh + 0.1, g.position.z, 0, '#c8d4e2');
      continue;
    }

    const cab = box(bay.w, bay.h, bay.d,
      new THREE.MeshLambertMaterial({ color: COLOR[bay.kind] ?? 0x4c5158 }),
      0, base + bay.h / 2, 0, g);

    if (bay.olts?.length) {
      const olts = bay.olts.map((i) => n.olts[i]!).filter(Boolean);
      const front = bay.z + bay.d / 2 < D / 2 ? 1 : -1;
      const slot = (bay.h - 0.3) / olts.length;
      olts.forEach((o, i) => {
        const sub = new THREE.Group();
        g.add(sub);
        oldChassis.push(sub);
        chassis(o, sub, bay.w, 0.35 + i * slot + slot / 2, Math.min(slot - 0.12, 0.5), front);
      });
      /* the renewed view puts one dual GPON/XGSPON chassis in the same footprint */
      const nu = new THREE.Group();
      g.add(nu);
      nu.visible = false;
      newChassis.push(nu);
      box(bay.w - 0.08, 0.85, 0.06, mat.chassisNew, 0, bay.h / 2, 0.3 * front, nu);
      for (let i = 0; i < 12; i++) {
        portLed(-bay.w / 2 + 0.09 + i * ((bay.w - 0.18) / 11), bay.h / 2, 0.345 * front, nu, true);
      }
    } else if (bay.kind === 'odf' || bay.kind === 'rack' || bay.kind === 'transport' || bay.kind === 'splitter') {
      for (let i = 0; i < 5; i++) {
        const f = bay.z + bay.d / 2 < D / 2 ? 1 : -1;
        box(bay.w - 0.1, 0.1, 0.04, mat.tray, 0, base + 0.4 + i * 0.32, (bay.d / 2 + 0.01) * f, g);
      }
    }

    /* the label goes on the face that looks into the room */
    const toSouth = bay.z + bay.d / 2 < D / 2;
    const face = (bay.d / 2 + 0.02) * (toSouth ? 1 : -1);
    label(bay.label, Math.min(bay.w * 0.95, 0.8),
      g.position.x, base + bay.h + 0.07, g.position.z + face, toSouth ? 0 : Math.PI, '#c8d4e2');
    void cab;
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
  const M = 0.34; /* keep this far from walls and cabinets */
  const free = (x: number, z: number) =>
    inside(x + M, z) && inside(x - M, z) && inside(x, z + M) && inside(x, z - M) &&
    !solids.some((s) => x > s.x0 - M && x < s.x1 + M && z > s.z0 - M && z < s.z1 + M);

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
  /** Zoom is a dolly along the view direction, so you can walk up to a rack. */
  function dolly(amount: number) {
    move(-Math.sin(yaw) * amount, -Math.cos(yaw) * amount);
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
      if (pinch) dolly((dist - pinch) * 0.006);
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

  const wheel = (e: WheelEvent) => { e.preventDefault(); dolly(-e.deltaY * 0.0016); };
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
