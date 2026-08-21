/**
 * Shared "view fullscreen" overlay for the map, the end-to-end diagram and
 * the tour's cable-detail panels — anything wide/detailed enough that a
 * phone-width container is the reason its text reads small, same complaint
 * a shrunk viewBox has no real fix for short of more container. Any element
 * with a matching trigger button (`[data-fs-target]`, naming the target's
 * id) can open it; FullscreenViewer.astro mounts the one overlay these all
 * share.
 *
 * The target is *moved* into the overlay, not cloned: these widgets carry
 * live state — the map's node click handlers and hover tooltip, the tour's
 * MutationObserver-driven viewBox writes, the pan/zoom initPannableZoom
 * wires directly on the svg — all of which is bound to that one element.
 * Moving it back on close is what keeps all of that working exactly as it
 * did before, rather than reconstructing it on a copy.
 */
import { DOM } from '../lib/dom-ids';

export function initFullscreen(): void {
  const overlay = document.getElementById(DOM.fsBg);
  const host = document.getElementById(DOM.fsHost);
  const closeBtn = document.getElementById(DOM.fsClose);
  if (!overlay || !host || !closeBtn) return;

  let current: HTMLElement | null = null;
  let placeholder: Comment | null = null;

  function close() {
    if (!current || !placeholder) return;
    placeholder.replaceWith(current);
    current = null;
    placeholder = null;
    overlay!.classList.remove('open');
    document.body.style.overflow = '';
  }

  function open(target: HTMLElement) {
    close();
    document.body.style.overflow = 'hidden';
    placeholder = document.createComment('fs-slot');
    target.replaceWith(placeholder);
    host!.appendChild(target);
    host!.scrollTop = 0;
    current = target;
    overlay!.classList.add('open');
  }

  document.querySelectorAll<HTMLButtonElement>('[data-fs-target]').forEach((btn) => {
    const target = document.getElementById(btn.dataset.fsTarget!);
    if (!target) return;
    /* A trigger low enough in a tall panel (the Gijón/PAO cable detail, for
       one) sits only partly on screen when it's actually pressed — clicking
       a not-fully-visible button is exactly when a browser's default
       "scroll the newly focused element into view" kicks in, animated
       (html has scroll-behavior:smooth), right before the overlay covers
       the whole page anyway. Never letting the button take focus in the
       first place is what stops that scroll from firing at all. */
    btn.addEventListener('pointerdown', (e) => e.preventDefault());
    btn.addEventListener('click', () => open(target));
  });
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });
}
