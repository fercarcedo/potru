/**
 * Zoom (buttons, optical only) and drag-to-pan for the schematic map's
 * <svg>, plus the MutationObserver that keeps the zoom buttons and cursor
 * in sync with viewBox changes made elsewhere — the guided tour (tour.ts)
 * rewrites the viewBox directly to frame each stop. Split out of map.ts's
 * initMap() verbatim: this touches only the <svg> and the two zoom
 * buttons, nothing about trunks, nodes, towns or labels.
 */
import { DOM } from '../../lib/dom-ids';

const HOME_W = 1160,
  HOME_H = 470,
  MIN_W = 240;

/** An SVG viewBox, as its four numbers. */
export type ViewBox = [number, number, number, number];

/**
 * The map's current viewBox. The attribute is always the four numbers this
 * module and the guided tour write, so the cast is the shape of that
 * agreement rather than a hope — and having it in one place is what keeps
 * `noUncheckedIndexedAccess` from turning every reader into `x!`.
 */
export function readViewBox(svg: SVGSVGElement): ViewBox {
  return svg.getAttribute('viewBox')!.split(' ').map(Number) as ViewBox;
}

/** Wires zoom and pan for the map. Call once, after the map's <svg> has its
 *  initial viewBox set. */
export function initViewport(svg: SVGSVGElement): void {
  /** Zooms about the middle of the current view, keeping its aspect ratio. */
  function zoomMap(factor: number) {
    const [x, y, w, h] = readViewBox(svg);
    const cx = x + w / 2,
      cy = y + h / 2;
    let nw = Math.max(MIN_W, Math.min(HOME_W, w * factor));
    let nh = h * (nw / w);
    if (nh > HOME_H) {
      nh = HOME_H;
      nw = w * (nh / h);
    }
    const nx = Math.max(0, Math.min(HOME_W - nw, cx - nw / 2));
    const ny = Math.max(0, Math.min(HOME_H - nh, cy - nh / 2));
    const r2 = (v: number) => Math.round(v * 100) / 100;
    svg.setAttribute('viewBox', `${r2(nx)} ${r2(ny)} ${r2(nw)} ${r2(nh)}`);
  }
  const zoomIn = document.getElementById(DOM.mapZoomIn) as HTMLButtonElement | null;
  const zoomOut = document.getElementById(DOM.mapZoomOut) as HTMLButtonElement | null;
  zoomIn?.addEventListener('click', () => zoomMap(0.72));
  zoomOut?.addEventListener('click', () => zoomMap(1 / 0.72));

  const vb = () => readViewBox(svg);

  /**
   * Keeps the pad honest: grey out whichever button can no longer do anything,
   * and only offer the grab cursor while there is something to pan to. Driven
   * by a MutationObserver so it also follows the guided tour, which rewrites
   * the viewBox itself.
   */
  function syncMap() {
    const [, , w, h] = vb();
    const zoomedIn = w < HOME_W - 0.5 || h < HOME_H - 0.5;
    if (zoomIn) zoomIn.disabled = w <= MIN_W + 0.5;
    if (zoomOut) zoomOut.disabled = !zoomedIn;
    svg.style.cursor = zoomedIn ? 'grab' : '';
    /* only swallow touch gestures when there is actually room to pan */
    svg.style.touchAction = zoomedIn ? 'none' : '';
  }
  new MutationObserver(syncMap).observe(svg, { attributes: true, attributeFilter: ['viewBox'] });
  syncMap();

  /* ---- drag to pan, once zoomed in ---- */
  let dragged = false;
  let pan: { x: number; y: number; vx: number; vy: number; moved: number } | null = null;
  svg.addEventListener('pointerdown', (e: PointerEvent) => {
    const [x, y, w, h] = vb();
    if (w >= HOME_W - 0.5 && h >= HOME_H - 0.5) return; /* nothing to pan */
    pan = { x: e.clientX, y: e.clientY, vx: x, vy: y, moved: 0 };
    svg.setPointerCapture(e.pointerId);
    svg.style.cursor = 'grabbing';
  });
  svg.addEventListener('pointermove', (e: PointerEvent) => {
    if (!pan) return;
    const [, , w, h] = vb();
    const rect = svg.getBoundingClientRect();
    const dx = e.clientX - pan.x,
      dy = e.clientY - pan.y;
    pan.moved = Math.max(pan.moved, Math.hypot(dx, dy));
    /* screen pixels → viewBox units */
    const nx = Math.max(0, Math.min(HOME_W - w, pan.vx - dx * (w / rect.width)));
    const ny = Math.max(0, Math.min(HOME_H - h, pan.vy - dy * (h / rect.height)));
    const r2 = (v: number) => Math.round(v * 100) / 100;
    svg.setAttribute('viewBox', `${r2(nx)} ${r2(ny)} ${r2(w)} ${r2(h)}`);
  });
  const endPan = (e: PointerEvent) => {
    if (!pan) return;
    dragged = pan.moved > 4;
    pan = null;
    svg.releasePointerCapture?.(e.pointerId);
    syncMap();
  };
  svg.addEventListener('pointerup', endPan);
  svg.addEventListener('pointercancel', endPan);
  /* a drag that ends over a node must not also open its record */
  svg.addEventListener(
    'click',
    (e: Event) => {
      if (!dragged) return;
      dragged = false;
      e.stopPropagation();
      e.preventDefault();
    },
    true,
  );
}
