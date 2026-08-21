/**
 * Zoom (buttons, optical only), drag-to-pan and two-finger pinch-to-zoom for
 * an <svg>'s viewBox, plus the MutationObserver that keeps the zoom buttons
 * and cursor in sync with viewBox changes made elsewhere — the guided tour
 * (tour.ts) rewrites the map's viewBox directly to frame each stop. Split
 * out of map.ts's initMap() verbatim, then generalised so the same wiring
 * also drives Diagram.astro's schematic and the tour's cable-detail panels:
 * none of it is specific to the map's own trunks, nodes, towns or labels.
 *
 * Pinch matters more than the buttons on a phone: fullscreen (scripts/
 * fullscreen.ts) gives these svgs a much bigger box to render in, but a
 * bigger box at the same *scale* is still the same scale — without pinch,
 * getting any more legible than that meant falling back to the browser's
 * own page-zoom, which has no idea this element even has a viewBox and
 * just blows up the whole layout around it instead of the drawing.
 */

const MIN_FRACTION = 240 / 1160; /* the map's original floor, as a share of its home width */

/** An SVG viewBox, as its four numbers. */
export type ViewBox = [number, number, number, number];

/**
 * An svg's current viewBox. The attribute is always the four numbers this
 * module and the guided tour write, so the cast is the shape of that
 * agreement rather than a hope — and having it in one place is what keeps
 * `noUncheckedIndexedAccess` from turning every reader into `x!`.
 */
export function readViewBox(svg: SVGSVGElement): ViewBox {
  return svg.getAttribute('viewBox')!.split(' ').map(Number) as ViewBox;
}

interface Point {
  x: number;
  y: number;
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * Wires pan (pointer-drag, so it works with touch), pinch-to-zoom and a
 * zoom(factor) function for one svg's viewBox, plus the cursor/touch-action
 * toggle that only offers a grab once there is somewhere to pan to. This is
 * the shared core behind initViewport below (one svg, its own pad); the
 * tour's cable-detail panels call it directly, since there nine svgs share
 * one pair of buttons and the caller decides which svg they currently act
 * on (see initPannableZoom's use in tour.ts).
 *
 * `onViewBoxChange` fires on every change (pan, zoom, pinch, or an external
 * write like the tour's own viewBox animation) with the new viewBox, the
 * home (zoomed-all-the-way-out) extent and the zoomed-in floor —
 * initViewport uses it to grey out whichever button can no longer do
 * anything.
 */
export function initPannableZoom(
  svg: SVGSVGElement,
  minWidth?: number,
  onViewBoxChange?: (vb: ViewBox, home: ViewBox, minW: number) => void,
): { zoom: (factor: number) => void } {
  const home = readViewBox(svg);
  const [homeX, homeY, HOME_W, HOME_H] = home;
  const MIN_W = minWidth ?? HOME_W * MIN_FRACTION;
  const clampX = (x: number, w: number) => Math.max(homeX, Math.min(homeX + HOME_W - w, x));
  const clampY = (y: number, h: number) => Math.max(homeY, Math.min(homeY + HOME_H - h, y));
  const vb = () => readViewBox(svg);
  const r2 = (v: number) => Math.round(v * 100) / 100;

  /**
   * Clamps `targetW` to [MIN_W, HOME_W] and derives the matching height
   * from `origW`×`origH`'s aspect ratio. `origW` has to be the actual
   * pre-zoom width, not already-scaled — the ratio and the clamp both
   * need to agree on what "1×" means, or clamping the width and deriving
   * the height from it fight each other into a wildly wrong aspect ratio
   * once `targetW` lands outside the clampable range.
   */
  function fitSize(origW: number, origH: number, targetW: number): [number, number] {
    let nw = Math.max(MIN_W, Math.min(HOME_W, targetW));
    let nh = origH * (nw / origW);
    if (nh > HOME_H) {
      nh = HOME_H;
      nw = origW * (nh / origH);
    }
    return [nw, nh];
  }

  /** Zooms about the middle of the current view, keeping its aspect ratio. */
  function zoom(factor: number) {
    const [x, y, w, h] = vb();
    const cx = x + w / 2,
      cy = y + h / 2;
    const [nw, nh] = fitSize(w, h, w * factor);
    const nx = clampX(cx - nw / 2, nw);
    const ny = clampY(cy - nh / 2, nh);
    svg.setAttribute('viewBox', `${r2(nx)} ${r2(ny)} ${r2(nw)} ${r2(nh)}`);
  }

  function sync() {
    const [, , w, h] = vb();
    const zoomedIn = w < HOME_W - 0.5 || h < HOME_H - 0.5;
    svg.style.cursor = zoomedIn ? 'grab' : '';
    /* pan-y, not '': a bare touch over the svg still scrolls the *page*
       vertically like anywhere else, but two fingers (pinch) or a
       horizontal drag are ours to read rather than the browser's — so
       pinch works from the very first, zoomed-all-the-way-out frame, not
       only once there is already somewhere to pan. */
    svg.style.touchAction = zoomedIn ? 'none' : 'pan-y';
    onViewBoxChange?.(vb(), home, MIN_W);
  }
  new MutationObserver(sync).observe(svg, { attributes: true, attributeFilter: ['viewBox'] });
  sync();

  /* ---- drag to pan (one finger) and pinch to zoom (two) ---- */
  const pointers = new Map<number, Point>();
  let dragged = false;
  let pan: { x: number; y: number; vx: number; vy: number; moved: number } | null = null;
  let pinch: { startDist: number; startVB: ViewBox; anchorVX: number; anchorVY: number } | null =
    null;

  function startPinch() {
    pan = null; /* a second finger landing mid-drag hands off to the pinch entirely */
    const [p1, p2] = [...pointers.values()] as [Point, Point];
    const rect = svg.getBoundingClientRect();
    const [x, y, w, h] = vb();
    const m = mid(p1, p2);
    pinch = {
      startDist: dist(p1, p2),
      startVB: [x, y, w, h],
      anchorVX: x + ((m.x - rect.left) / rect.width) * w,
      anchorVY: y + ((m.y - rect.top) / rect.height) * h,
    };
  }

  svg.addEventListener('pointerdown', (e: PointerEvent) => {
    /* a capture that fails must not also take the rest of this handler
       down with it — pointer tracking still has to start either way */
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {
      /* no active pointer to capture (synthetic events, some browser quirks) */
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      startPinch();
      return;
    }
    if (pointers.size !== 1) return;
    const [x, y, w, h] = vb();
    if (w >= HOME_W - 0.5 && h >= HOME_H - 0.5) return; /* nothing to pan */
    pan = { x: e.clientX, y: e.clientY, vx: x, vy: y, moved: 0 };
    svg.style.cursor = 'grabbing';
  });
  svg.addEventListener('pointermove', (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch) {
      const [p1, p2] = [...pointers.values()] as [Point, Point];
      const rect = svg.getBoundingClientRect();
      const factor = pinch.startDist / Math.max(dist(p1, p2), 1);
      const [, , sw, sh] = pinch.startVB;
      const [nw, nh] = fitSize(sw, sh, sw * factor);
      const m = mid(p1, p2);
      const nx = clampX(pinch.anchorVX - ((m.x - rect.left) / rect.width) * nw, nw);
      const ny = clampY(pinch.anchorVY - ((m.y - rect.top) / rect.height) * nh, nh);
      svg.setAttribute('viewBox', `${r2(nx)} ${r2(ny)} ${r2(nw)} ${r2(nh)}`);
      return;
    }
    if (!pan) return;
    const [, , w, h] = vb();
    const rect = svg.getBoundingClientRect();
    const dx = e.clientX - pan.x,
      dy = e.clientY - pan.y;
    pan.moved = Math.max(pan.moved, Math.hypot(dx, dy));
    /* screen pixels → viewBox units */
    const nx = clampX(pan.vx - dx * (w / rect.width), w);
    const ny = clampY(pan.vy - dy * (h / rect.height), h);
    svg.setAttribute('viewBox', `${r2(nx)} ${r2(ny)} ${r2(w)} ${r2(h)}`);
  });
  const endPointer = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    try {
      svg.releasePointerCapture?.(e.pointerId);
    } catch {
      /* already released, or never captured — nothing to undo */
    }
    if (pointers.size < 2) pinch = null;
    /* one finger lifted off a two-finger pinch: don't resume a one-finger
       pan from whatever stale coordinates that finger last had, just let
       the visitor start a fresh gesture if they want to keep panning */
    if (pointers.size >= 1) return;
    if (pan) dragged = pan.moved > 4;
    pan = null;
    sync();
  };
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);
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

  return { zoom };
}

export interface ViewportOptions {
  /** Zoom-in/out buttons; either may be omitted if this svg has no pad. */
  zoomIn?: HTMLButtonElement | null;
  zoomOut?: HTMLButtonElement | null;
  /** Narrowest the view may get, in viewBox units. Defaults to the same
   *  ~1/4.8 share of the home extent the map originally used. */
  minWidth?: number;
}

/** Wires zoom and pan for an svg's viewBox, with its own zoom-in/out pad.
 *  Call once, after the svg has its initial (= "home") viewBox set. */
export function initViewport(svg: SVGSVGElement, opts: ViewportOptions = {}): void {
  const { zoomIn, zoomOut } = opts;
  /**
   * Keeps the pad honest: grey out whichever button can no longer do
   * anything. Runs on every viewBox change, including ones made elsewhere
   * (the guided tour rewrites the map's viewBox directly to frame each stop).
   */
  const { zoom } = initPannableZoom(
    svg,
    opts.minWidth,
    ([, , w, h], [, , HOME_W, HOME_H], minW) => {
      if (zoomIn) zoomIn.disabled = w <= minW + 0.5;
      if (zoomOut) zoomOut.disabled = !(w < HOME_W - 0.5 || h < HOME_H - 0.5);
    },
  );
  zoomIn?.addEventListener('click', () => zoom(0.72));
  zoomOut?.addEventListener('click', () => zoom(1 / 0.72));
}
