/**
 * First-person camera: walk (keys/pad, collision-checked against the room's
 * walls and cabinets), look (drag/pinch), optical zoom, resize and the
 * render loop that also blinks the lit LEDs. Split out of viewer3d.ts's
 * buildRoom() verbatim — see that file for stopRoom()/SV, which own the
 * lifetime of what this returns.
 */
import * as THREE from 'three';
import { DOM } from '../../lib/dom-ids';
import type { Led } from './equipment';
import { pointInPolygon } from './geometry';

export interface Door {
  edge: number;
  at: number;
  width: number;
}

export interface ControlsDeps {
  cam: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  holder: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  /** room outline, centred on the room, same as buildRoom's `poly` */
  poly: [number, number][];
  /** cabinet footprints to steer around, same as buildRoom's `solids` */
  solids: { x0: number; x1: number; z0: number; z1: number }[];
  /** the door to start just inside of; undefined starts at the room's centre */
  startDoor?: Door;
  /** ports/status lamps lit by createEquipmentBuilders(), blinked here */
  leds: Led[];
}

export interface Controls {
  stop(): void;
}

/** Wires movement, look, zoom and the render loop, and starts it. */
export function initControls(deps: ControlsDeps): Controls {
  const { cam, canvas, holder, renderer, scene, poly, solids, startDoor, leds } = deps;

  const inside = (x: number, z: number) => pointInPolygon(poly, x, z);
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
  const d0 = startDoor;
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
  for (const [id, step] of [[DOM.svZoomIn, 9], [DOM.svZoomOut, -9]] as const) {
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
  document.querySelectorAll<HTMLElement>(`#${DOM.svPad} button`).forEach((b) => {
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
  document.getElementById(DOM.svLoading)!.style.display = 'none';

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

  return {
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
