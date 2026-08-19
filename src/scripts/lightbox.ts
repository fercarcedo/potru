/**
 * Full-size plan viewer.
 *
 * The pliego's plans are 1891 x 1310 drawings, and the record shows them at
 * about 330 px tall — small enough that the dimension chains they exist for
 * are unreadable. This opens one on the whole screen, fit first and then at
 * its own pixels, and lets you step through the rest of that node's plans
 * without going back out: comparing a plan against its own elevations is the
 * main reason to be looking at them at all.
 *
 * Progressive enhancement, as the node cards already are: each plan is a real
 * <a href> to the image file, so it works with no JS, and middle-click and
 * ⌘/Ctrl-click still open the original in a tab. Only the plain left-click is
 * upgraded.
 */
import { DOM } from '../lib/dom-ids';

export interface Plan {
  /** already base-prefixed, as `asset()` returns it */
  src: string;
  /** what the top bar and the thumbnail's alt say: "Plano de planta · Muros" */
  caption: string;
}

/** Marks a link this island takes over. */
export const PLAN_LINK = 'data-plan';

/**
 * A link whose set of plans is not simply "the other plan links on the page".
 * The record's hero is one <img> that swaps through a gallery behind its tabs,
 * so modal.ts registers what that one link stands for instead of the DOM
 * being asked to describe it.
 */
type PlanSet = () => { plans: Plan[]; index: number; onChange?: (i: number) => void };
const registered = new WeakMap<HTMLAnchorElement, PlanSet>();

export function registerPlanSet(link: HTMLAnchorElement, set: PlanSet) {
  registered.set(link, set);
}

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
  const count = document.getElementById(DOM.lbCount)!;
  const said = document.getElementById(DOM.lbSaid)!;
  const original = document.getElementById(DOM.lbOpen) as HTMLAnchorElement;
  const thumbs = document.getElementById(DOM.lbThumbs)!;
  const prev = document.getElementById(DOM.lbPrev)!;
  const next = document.getElementById(DOM.lbNext)!;

  let plans: Plan[] = [];
  let idx = 0;
  let onChange: ((i: number) => void) | undefined;
  let bodyOverflow = '';

  const isOpen = () => bg!.classList.contains('open');

  function setZoom(on: boolean) {
    fig.classList.toggle('zoomed', on);
    /* the thumbnail strip steps aside once you have committed to reading one
       drawing; the arrows and the keys still work, so nothing is lost */
    bg!.classList.toggle('reading', on);
  }

  function show(i: number, tell = true) {
    idx = (i + plans.length) % plans.length;
    const p = plans[idx]!;
    img.src = p.src;
    img.alt = p.caption;
    cap.textContent = p.caption;
    count.textContent = plans.length > 1 ? `${idx + 1} / ${plans.length}` : '';
    /* announced as one phrase — "Plano de planta · Tineo, 3 de 5" — rather
       than as two unrelated updates to the caption and the counter */
    said.textContent = plans.length > 1
      ? `${p.caption}, ${idx + 1} de ${plans.length}`
      : p.caption;
    original.href = p.src;
    setZoom(false);
    fig.scrollTo(0, 0);
    thumbs.querySelectorAll('button').forEach((b, n) => {
      b.classList.toggle('on', n === idx);
      b.setAttribute('aria-selected', String(n === idx));
    });
    thumbs.children[idx]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (tell) onChange?.(idx);
  }

  /** Opens `plans` at `index`. `onIndexChange` lets the record's gallery tabs
   *  follow along, so closing leaves it on the plan you ended up at. */
  function openPlans(next_: Plan[], index: number, onIndexChange?: (i: number) => void) {
    if (!next_.length) return;
    plans = next_;
    onChange = onIndexChange;

    thumbs.innerHTML = '';
    const many = plans.length > 1;
    thumbs.style.display = many ? '' : 'none';
    prev.style.display = next.style.display = many ? '' : 'none';
    if (many) {
      plans.forEach((p, n) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.title = p.caption;
        const t = document.createElement('img');
        t.src = p.src;
        t.alt = p.caption;
        t.loading = 'lazy';
        b.appendChild(t);
        b.onclick = () => show(n);
        thumbs.appendChild(b);
      });
    }

    show(index, false);
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
    thumbs.innerHTML = '';
  }

  /** The plans of a page that lays them all out: every plan link, in the
   *  order the record shows them. */
  function plansInDocument(): Plan[] {
    return [...document.querySelectorAll<HTMLAnchorElement>(`a[${PLAN_LINK}]`)].map((a) => ({
      src: a.href,
      caption: a.querySelector('img')?.alt ?? '',
    }));
  }

  /* one delegated handler, so plans rendered later by modal.ts are covered
     without re-wiring anything */
  document.addEventListener('click', (e) => {
    const me = e as MouseEvent;
    /* leave the browser's own "open in a new tab" gestures alone */
    if (me.button !== 0 || me.metaKey || me.ctrlKey || me.shiftKey || me.altKey) return;
    const link = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>(`a[${PLAN_LINK}]`);
    if (!link) return;
    e.preventDefault();
    const set = registered.get(link);
    if (set) {
      const { plans: ps, index, onChange: cb } = set();
      openPlans(ps, index, cb);
    } else {
      const all = [...document.querySelectorAll<HTMLAnchorElement>(`a[${PLAN_LINK}]`)];
      openPlans(plansInDocument(), Math.max(0, all.indexOf(link)));
    }
  });

  /* Escape belongs to whichever overlay is on top: the record's own handler
     is unconditional, so this one has to claim the key before it bubbles */
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    } else if (e.key === 'ArrowLeft' && plans.length > 1) {
      e.stopPropagation();
      show(idx - 1);
    } else if (e.key === 'ArrowRight' && plans.length > 1) {
      e.stopPropagation();
      show(idx + 1);
    }
  }, true);

  prev.onclick = () => show(idx - 1);
  next.onclick = () => show(idx + 1);
  document.getElementById(DOM.lbClose)!.onclick = close;
  bg.addEventListener('click', (e) => {
    if (e.target === bg || e.target === fig || (e.target as HTMLElement).classList.contains('lb-stage')) close();
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
    setZoom(zoom);
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
