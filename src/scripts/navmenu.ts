/**
 * Mobile hamburger menu for the header nav. Layout.astro renders the link
 * list open by default (so it works with no JS at all); this only takes
 * over once it can actually run the toggle, closing the list below 760px
 * (matching CLAUDE.md's global nav breakpoint) and reopening it on resize
 * past that point.
 */
import { DOM } from '../lib/dom-ids';

const BREAKPOINT = '(max-width: 760px)';

export function initNavMenu(): void {
  const toggle = document.getElementById(DOM.navToggle) as HTMLButtonElement | null;
  const menu = document.getElementById(DOM.navMenu);
  if (!toggle || !menu) return;
  toggle.hidden = false;

  function setOpen(open: boolean) {
    menu!.hidden = !open;
    toggle!.setAttribute('aria-expanded', String(open));
  }

  const mq = matchMedia(BREAKPOINT);
  const sync = () => setOpen(!mq.matches);
  mq.addEventListener('change', sync);
  sync();

  toggle.addEventListener('click', () => setOpen(!!menu.hidden));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('click', (e) => {
    const target = e.target as Node;
    if (mq.matches && !menu.hidden && !menu.contains(target) && !toggle.contains(target)) {
      setOpen(false);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });
}
