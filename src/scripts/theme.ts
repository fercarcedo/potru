/**
 * The colour-theme toggle, and the only module that persists anything.
 *
 * The site has three states, not two: an explicit choice stamps `data-theme`
 * on <html>, and the default — nobody has touched the toggle — stamps
 * nothing, leaving `prefers-color-scheme` to decide. That third state is the
 * one worth protecting: a visitor whose system is dark should get a dark site
 * without ever being asked, and should still be able to override it.
 *
 * The stamp itself is applied by an inline script in Layout.astro's <head>,
 * not here. It has to run before the first paint or the page flashes the
 * wrong theme, and a module script — deferred by definition — is always too
 * late for that. This module only owns what happens after a click.
 *
 * See CLAUDE.md on storage: `potru:theme` is the one key the site may keep,
 * and tests/data/no-storage.test.ts holds that line.
 */
import { DOM } from '../lib/dom-ids';

/** The one key. Keep it in step with the inline script in Layout.astro. */
const KEY = 'potru:theme';

type Theme = 'light' | 'dark';

const isTheme = (v: unknown): v is Theme => v === 'light' || v === 'dark';

/**
 * Storage can throw rather than merely be empty — Safari in private browsing
 * is the usual one, an embedded webview the other. A visitor who cannot store
 * a preference should still get a working toggle for the page they are on, so
 * every access is guarded and failure just means "no stored choice".
 */
function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return isTheme(v) ? v : null;
  } catch {
    return null;
  }
}

function remember(t: Theme) {
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* not fatal: the choice holds for this page, it just will not follow the
       visitor to /nodos/<id> */
  }
}

/** What the visitor is looking at right now, chosen or inherited. */
export function currentTheme(): Theme {
  const stamped = document.documentElement.dataset.theme;
  if (isTheme(stamped)) return stamped;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Names the *destination*, because that is what pressing the button does. */
const label = (now: Theme) => (now === 'dark' ? 'Ver en claro' : 'Ver en oscuro');

/* The icon is static markup, swapped by CSS keyed off data-theme — see
   Layout.astro. All this sets is the accessible name, since a screen reader
   gets no benefit from either glyph. */
function paint(btn: HTMLButtonElement, now: Theme) {
  btn.setAttribute('aria-label', label(now));
  btn.title = label(now);
}

/** Wires the nav's toggle. Safe to call on a page that has no toggle. */
export function initTheme(): void {
  const btn = document.getElementById(DOM.themeToggle);
  if (!(btn instanceof HTMLButtonElement)) return;

  /* the markup ships it hidden, because without this module it does nothing */
  btn.hidden = false;
  paint(btn, currentTheme());

  btn.addEventListener('click', () => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    remember(next);
    paint(btn, next);
  });

  /* If the visitor has never chosen, the site follows the system — including
     when the system changes while the page is open, which is what someone on
     a sunset schedule sees. Once they have chosen, their choice wins and this
     does nothing but keep the button's label truthful. */
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!stored()) paint(btn, currentTheme());
  });
}
