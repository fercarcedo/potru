/**
 * Generic collapse/expand for a trigger button + panel pair, defaulting
 * open or closed depending on a breakpoint. Shared by the header's mobile
 * hamburger (navmenu.ts) and the 3D viewer's disclaimer and equipment
 * legend (viewer3d.ts via Viewer3D.astro's sv-warn-toggle/sv-legend-toggle),
 * which used to permanently claim a third of a phone screen with no way to
 * close either.
 */
export interface CollapsibleOptions {
  /** Media query string; the panel starts closed while it matches, open
   *  otherwise, and follows it live (e.g. rotating a phone to landscape).
   *  Omit to always start open. */
  collapseWhen?: string;
  /** Runs after every open/close — e.g. to swap the trigger's own icon. */
  onChange?: (open: boolean) => void;
}

export function initCollapsible(
  toggle: HTMLButtonElement,
  panel: HTMLElement,
  opts: CollapsibleOptions = {},
): { setOpen: (open: boolean) => void } {
  const mq = opts.collapseWhen ? matchMedia(opts.collapseWhen) : null;
  function setOpen(open: boolean) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    opts.onChange?.(open);
  }
  const sync = () => setOpen(!(mq?.matches ?? false));
  mq?.addEventListener('change', sync);
  sync();
  toggle.addEventListener('click', () => setOpen(!!panel.hidden));
  return { setOpen };
}
