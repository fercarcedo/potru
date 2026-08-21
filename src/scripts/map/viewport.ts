/**
 * Zoom (buttons, optical only) and drag-to-pan for an <svg>'s viewBox, plus
 * the MutationObserver that keeps the zoom buttons and cursor in sync with
 * viewBox changes made elsewhere — the guided tour (tour.ts) rewrites the
 * map's viewBox directly to frame each stop. Split out of map.ts's
 * initMap() verbatim, then generalised so the same wiring also drives
 * Diagram.astro's schematic and the tour's cable-detail panels: none of it
 * is specific to the map's own trunks, nodes, towns or labels.
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

/**
 * Wires pan (pointer-drag, so it works with touch) and a zoom(factor)
 * function for one svg's viewBox, plus the cursor/touch-action toggle that
 * only offers a grab once there is somewhere to pan to. This is the shared
 * core behind initViewport below (one svg, its own pad); the tour's
 * cable-detail panels call it directly, since there nine svgs share one
 * pair of buttons and the caller decides which svg they currently act on
 * (see initPannableZoom's use in tour.ts).
 *
 * `onViewBoxChange` fires on every change (pan, zoom, or an external write
 * like the tour's own viewBox animation) with the new viewBox, the home
 * (zoomed-all-the-way-out) extent and the zoomed-in floor — initViewport
 * uses it to grey out whichever button can no longer do anything.
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

  /** Zooms about the middle of the current view, keeping its aspect ratio. */
  function zoom(factor: number) {
    const [x, y, w, h] = vb();
    const cx = x + w / 2,
      cy = y + h / 2;
    let nw = Math.max(MIN_W, Math.min(HOME_W, w * factor));
    let nh = h * (nw / w);
    if (nh > HOME_H) {
      nh = HOME_H;
      nw = w * (nh / h);
    }
    const nx = clampX(cx - nw / 2, nw);
    const ny = clampY(cy - nh / 2, nh);
    const r2 = (v: number) => Math.round(v * 100) / 100;
    svg.setAttribute('viewBox', `${r2(nx)} ${r2(ny)} ${r2(nw)} ${r2(nh)}`);
  }

  function sync() {
    const [, , w, h] = vb();
    const zoomedIn = w < HOME_W - 0.5 || h < HOME_H - 0.5;
    svg.style.cursor = zoomedIn ? 'grab' : '';
    /* only swallow touch gestures when there is actually room to pan */
    svg.style.touchAction = zoomedIn ? 'none' : '';
    onViewBoxChange?.(vb(), home, MIN_W);
  }
  new MutationObserver(sync).observe(svg, { attributes: true, attributeFilter: ['viewBox'] });
  sync();

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
    const nx = clampX(pan.vx - dx * (w / rect.width), w);
    const ny = clampY(pan.vy - dy * (h / rect.height), h);
    const r2 = (v: number) => Math.round(v * 100) / 100;
    svg.setAttribute('viewBox', `${r2(nx)} ${r2(ny)} ${r2(w)} ${r2(h)}`);
  });
  const endPan = (e: PointerEvent) => {
    if (!pan) return;
    dragged = pan.moved > 4;
    pan = null;
    svg.releasePointerCapture?.(e.pointerId);
    sync();
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
