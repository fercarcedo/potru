/**
 * Full-size plan viewer.
 *
 * The pliego's plans are 1891 x 1310 drawings, and the record shows them at
 * about 330 px tall — small enough that the dimension chains they exist for
 * are unreadable. This opens one on the whole screen, fit first and then at
 * its own pixels, which is the size the annotations were drawn at.
 *
 * Progressive enhancement, as the node cards already are: each plan is a real
 * <a href> to the image file, so it works with no JS, and middle-click and
 * ⌘/Ctrl-click still open the original in a tab. Only the plain left-click is
 * upgraded.
 */
import { DOM } from '../lib/dom-ids';

/** Marks a link this island takes over. Also the caption's source: the
 *  caption is the wrapped <img>'s alt, which already reads "Plano de planta ·
 *  Muros de Nalón", so there is no second copy of it to keep in step. */
export const PLAN_LINK = 'data-plan';

let wired = false;

/**
 * Wires the shell rendered by Lightbox.astro. Safe to call from both entry
 * points (main.ts on the home page, the node page's inline script); the
 * second call is a no-op.
 */
export function initLightbox() {
  if (wired) return;
  const bg = document.getElementById(DOM.lbBg);
  if (!bg) return;
  wired = true;

  const fig = document.getElementById(DOM.lbFig)!;
  const img = document.getElementById(DOM.lbImg) as HTMLImageElement;
  const cap = document.getElementById(DOM.lbCap)!;
  const original = document.getElementById(DOM.lbOpen) as HTMLAnchorElement;
  let bodyOverflow = '';

  function open(href: string, caption: string) {
    img.src = href;
    img.alt = caption;
    cap.textContent = caption;
    original.href = href;
    fig.classList.remove('zoomed');
    fig.scrollTo(0, 0);
    bg!.classList.add('open');
    /* the record may already have locked the body; put back exactly what was
       there rather than assuming this overlay is the only one open */
    bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  function close() {
    bg!.classList.remove('open');
    document.body.style.overflow = bodyOverflow;
    img.removeAttribute('src');
  }

  const isOpen = () => bg!.classList.contains('open');

  /* one delegated handler, so plans rendered later by modal.ts are covered
     without re-wiring anything */
  document.addEventListener('click', (e) => {
    const me = e as MouseEvent;
    /* leave the browser's own "open in a new tab" gestures alone */
    if (me.button !== 0 || me.metaKey || me.ctrlKey || me.shiftKey || me.altKey) return;
    const link = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>(`a[${PLAN_LINK}]`);
    if (!link) return;
    e.preventDefault();
    open(link.href, link.querySelector('img')?.alt ?? '');
  });

  /* Escape belongs to whichever overlay is on top: the record's own handler
     is unconditional, so this one has to claim the key before it bubbles */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isOpen()) return;
    e.stopPropagation();
    close();
  }, true);

  document.getElementById(DOM.lbClose)!.onclick = close;
  bg.addEventListener('click', (e) => {
    if (e.target === bg || e.target === fig) close();
  });

  /* fit ⇄ the image's own pixels. Zoomed in, the figure scrolls; dragging it
     is how you read across a drawing without hunting for a scrollbar. */
  let drag: { x: number; y: number; left: number; top: number } | null = null;

  img.addEventListener('click', (e) => {
    e.stopPropagation();
    if (drag) return;
    const zoom = !fig.classList.contains('zoomed');
    /* keep the point under the cursor roughly where it was */
    const r = img.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    fig.classList.toggle('zoomed', zoom);
    if (zoom) {
      fig.scrollTo({
        left: fx * img.naturalWidth - fig.clientWidth / 2,
        top: fy * img.naturalHeight - fig.clientHeight / 2,
      });
    }
  });

  fig.addEventListener('pointerdown', (e) => {
    if (!fig.classList.contains('zoomed') || e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, left: fig.scrollLeft, top: fig.scrollTop };
    fig.setPointerCapture(e.pointerId);
  });
  fig.addEventListener('pointermove', (e) => {
    if (!drag) return;
    fig.classList.add('dragging');
    fig.scrollLeft = drag.left - (e.clientX - drag.x);
    fig.scrollTop = drag.top - (e.clientY - drag.y);
  });
  const endDrag = (e: PointerEvent) => {
    if (!drag) return;
    const moved = Math.hypot(e.clientX - drag.x, e.clientY - drag.y);
    fig.classList.remove('dragging');
    /* a drag must not also count as the click that zooms back out */
    if (moved > 4) setTimeout(() => { drag = null; }, 0);
    else drag = null;
  };
  fig.addEventListener('pointerup', endDrag);
  fig.addEventListener('pointercancel', endDrag);
}
