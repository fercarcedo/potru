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
): {
  zoom: (factor: number) => void;
  fitAspect: (containerW: number, containerH: number) => void;
  clearFit: () => void;
} {
  const home = readViewBox(svg);
  const [homeX, homeY, HOME_W, HOME_H] = home;
  const MIN_W = minWidth ?? HOME_W * MIN_FRACTION;
  /* Pan (and the "is there room to pan" / cursor logic in sync() below)
     always measures against the *true* home extent — the whole real map,
     never reduced — so panning past whatever fitAspect last framed always
     reaches the rest of it. ceilingW/H is a *separate*, narrower "how far
     out can zoom go" limit fitAspect can set — see its own comment. */
  const clampX = (x: number, w: number) => Math.max(homeX, Math.min(homeX + HOME_W - w, x));
  const clampY = (y: number, h: number) => Math.max(homeY, Math.min(homeY + HOME_H - h, y));
  let ceilingW = HOME_W,
    ceilingH = HOME_H;
  const vb = () => readViewBox(svg);
  const r2 = (v: number) => Math.round(v * 100) / 100;
  /* A mouse drag over any of this svg's <text> labels would otherwise
     start a native text selection instead of (or as well as) our own pan —
     there's no "copy this label" use case here to preserve. */
  svg.style.userSelect = 'none';

  /**
   * Clamps `targetW` to [MIN_W, ceilingW] and derives height by preserving
   * `origW`:`origH`'s ratio — except when that would push past ceilingH,
   * where height is simply capped there rather than also pulling width
   * back down to match. Pulling width down is what made zooming *out*
   * able to get stuck: fitAspect below can leave a view with height
   * already pinned at the ceiling but width still well short of it, and
   * re-deriving width from a height that's just been capped reproduces
   * the *original*, too-narrow width — a zoom-out that undoes itself.
   * Once height has nothing further to give, width simply keeps growing
   * on its own clamp instead.
   */
  function fitSize(origW: number, origH: number, targetW: number): [number, number] {
    const nw = Math.max(MIN_W, Math.min(ceilingW, targetW));
    const nh = Math.min(ceilingH, origH * (nw / origW));
    return [nw, nh];
  }

  /** Zooms about the middle of the current view, keeping its aspect ratio
   *  (or converging back toward home's, past HOME_H — see fitSize). */
  function zoom(factor: number) {
    const [x, y, w, h] = vb();
    const cx = x + w / 2,
      cy = y + h / 2;
    const [nw, nh] = fitSize(w, h, w * factor);
    const nx = clampX(cx - nw / 2, nw);
    const ny = clampY(cy - nh / 2, nh);
    svg.setAttribute('viewBox', `${r2(nx)} ${r2(ny)} ${r2(nw)} ${r2(nh)}`);
  }

  /**
   * Reframes to the largest view matching `containerW`:`containerH`'s own
   * aspect ratio that still fits inside the home extent, centered on the
   * current view. For content much wider than it is tall (the map, ~2.5:1)
   * shown in a container much taller than it is wide (a phone in
   * fullscreen), width-fit sizing — the default everywhere else — leaves
   * most of that height empty; this is the fix, and it stays a real zoom
   * (not a CSS trick sizing the svg past its container), so pan and the
   * zoom buttons keep working on it exactly as they do at any other zoom
   * level: nothing about them assumes zooming in only ever happens by the
   * factor the + button uses.
   */
  function fitAspect(containerW: number, containerH: number) {
    const ca = containerW / containerH;
    const homeAspect = HOME_W / HOME_H;
    let nw: number, nh: number;
    if (ca >= homeAspect) {
      nw = HOME_W;
      nh = HOME_W / ca;
    } else {
      nh = HOME_H;
      nw = HOME_H * ca;
    }
    /* A container narrow enough (relative to the map's own aspect) can ask
       for a width below MIN_W here — no fitSize, on purpose: fitSize would
       clamp nw up but then keep it exactly ca-proportioned to nh, which
       (nh already pinned at HOME_H) forces nh straight back past HOME_H,
       and *its own* correction for that undoes the clamp right back to
       the too-narrow width. Letting the aspect go slightly off instead —
       floor nw, keep nh at whatever that implies, capped at HOME_H — costs
       a sliver of unused height in that one edge case, not a floor that
       silently doesn't hold. */
    if (nw < MIN_W) {
      nw = MIN_W;
      nh = Math.min(HOME_H, MIN_W / ca);
    }
    const [x, y, w, h] = vb();
    const cx = x + w / 2,
      cy = y + h / 2;
    const nx = clampX(cx - nw / 2, nw);
    const ny = clampY(cy - nh / 2, nh);
    svg.setAttribute('viewBox', `${r2(nx)} ${r2(ny)} ${r2(nw)} ${r2(nh)}`);
    /* This crop becomes the new "how far out can zoom go" ceiling: without
       it, zoom()/fitSize still clamp against the true HOME_W/H, so zooming
       out afterward keeps converging back toward the full, un-cropped map —
       shrinking the rendered box right back to its non-fullscreen size,
       since the svg is laid out at width:100%;height:auto. */
    ceilingW = nw;
    ceilingH = nh;
  }

  /** Restores the zoom-out ceiling to the true home extent — call once
   *  whatever used fitAspect (fullscreen closing) is done with it, so the
   *  in-page view's own zoom-out range goes back to normal. */
  function clearFit() {
    ceilingW = HOME_W;
    ceilingH = HOME_H;
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
    /* the zoom-out button's own disabled state should reflect the ceiling
       fitAspect narrowed, not the true (and now unreachable-by-zoom) home */
    onViewBoxChange?.(vb(), [homeX, homeY, ceilingW, ceilingH], MIN_W);
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

  return { zoom, fitAspect, clearFit };
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
 *  Call once, after the svg has its initial (= "home") viewBox set.
 *  Returns the same zoom/fitAspect initPannableZoom does, for a caller
 *  that needs more than the pad — map.ts uses fitAspect to reframe the map
 *  for fullscreen on a portrait phone. */
export function initViewport(
  svg: SVGSVGElement,
  opts: ViewportOptions = {},
): {
  zoom: (factor: number) => void;
  fitAspect: (containerW: number, containerH: number) => void;
  clearFit: () => void;
} {
  const { zoomIn, zoomOut } = opts;
  /**
   * Keeps the pad honest: grey out whichever button can no longer do
   * anything. Runs on every viewBox change, including ones made elsewhere
   * (the guided tour rewrites the map's viewBox directly to frame each stop).
   */
  const { zoom, fitAspect, clearFit } = initPannableZoom(
    svg,
    opts.minWidth,
    ([, , w, h], [, , ceilW, ceilH], minW) => {
      if (zoomIn) zoomIn.disabled = w <= minW + 0.5;
      if (zoomOut) zoomOut.disabled = !(w < ceilW - 0.5 || h < ceilH - 0.5);
    },
  );
  /* Never let a pad button take focus: one low enough on screen to be
     partly out of view would otherwise get smooth-scrolled into view the
     instant it's pressed (see fullscreen.ts's own note on this). */
  zoomIn?.addEventListener('pointerdown', (e) => e.preventDefault());
  zoomOut?.addEventListener('pointerdown', (e) => e.preventDefault());
  zoomIn?.addEventListener('click', () => zoom(0.72));
  zoomOut?.addEventListener('click', () => zoom(1 / 0.72));
  return { zoom, fitAspect, clearFit };
}
