/**
 * Entry point for the 3D viewer. Deliberately light: three and the whole room
 * construction live in ./viewer3d, downloaded only when the visitor presses
 * "Recorrer el interior en 3D". The legacy did the same by injecting a <script>
 * from a CDN.
 */
import { byId } from '../lib/data';
import { initCollapsible } from './collapsible';
import { DOM } from '../lib/dom-ids';

const COLLAPSE_ON_MOBILE = '(max-width: 760px)';

type Viewer = typeof import('./viewer3d');
let viewer: Viewer | null = null;

export async function openWalk(id: string) {
  const n = byId[id];
  if (!n || n.gallery.length < 2) return;

  const bg = document.getElementById(DOM.svBg)!;
  bg.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById(DOM.svTitle)!.textContent = 'Interior simulado · ' + n.name;
  const loading = document.getElementById(DOM.svLoading)!;
  loading.style.display = 'flex';

  try {
    viewer ??= await import('./viewer3d');
  } catch {
    alert('No se pudo cargar el motor 3D (¿sin conexión?)');
    closeWalk();
    return;
  }
  viewer.buildRoom(n);
}

export function closeWalk() {
  document.getElementById(DOM.svBg)!.classList.remove('open');
  document.body.style.overflow = '';
  viewer?.stopRoom();
}

/** Wires the exit button and Escape key. Both entry points that use openWalk
 *  (main.ts on the home page, and the standalone node page's inline script)
 *  call this once before the first click. */
export function initWalk() {
  document.getElementById(DOM.svExit)!.onclick = closeWalk;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById(DOM.svBg)!.classList.contains('open')) {
      closeWalk();
    }
  });

  /* The disclaimer and the equipment legend collapse to an icon on mobile
     by default (unchanged, expanded on desktop) — both used to permanently
     claim a third of a phone screen with no way to close either. */
  const warnToggle = document.getElementById(DOM.svWarnToggle) as HTMLButtonElement,
    warn = document.getElementById(DOM.svWarn)!;
  const { setOpen: setWarnOpen } = initCollapsible(warnToggle, warn, {
    collapseWhen: COLLAPSE_ON_MOBILE,
  });
  document.getElementById(DOM.svWarnClose)!.onclick = () => setWarnOpen(false);

  initCollapsible(
    document.getElementById(DOM.svLegendToggle) as HTMLButtonElement,
    document.getElementById(DOM.svLegend)!,
    { collapseWhen: COLLAPSE_ON_MOBILE },
  );
}
