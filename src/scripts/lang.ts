/**
 * The language toggle. Unlike theme.ts, this module never mutates the DOM:
 * Spanish and English are two different generated pages (see astro.config.mjs's
 * i18n block and the [...locale] routes), not one page with a data attribute,
 * so switching language is a real navigation. The toggle in Layout.astro is
 * already a real <a href> to the other locale's equivalent page — it works
 * with no JS at all. This module's only job is remembering the choice before
 * the browser follows that link, so the pre-paint script in Layout.astro's
 * <head> (which redirects a first-time English-browser visitor away from the
 * Spanish home page) never fights a choice the visitor already made.
 *
 * See CLAUDE.md on storage: `potru:theme` and `potru:lang` are the two keys
 * the site may keep, and tests/data/no-storage.test.ts holds that line.
 */
import { DOM } from '../lib/dom-ids';

/** Keep in step with the inline script in Layout.astro. */
const KEY = 'potru:lang';

function remember(locale: string) {
  try {
    localStorage.setItem(KEY, locale);
  } catch {
    /* not fatal: the click still navigates, it just won't be remembered for
       the next visit to / */
  }
}

/** Wires the nav's toggle. Safe to call on a page that has no toggle. */
export function initLang(): void {
  const a = document.getElementById(DOM.langToggle);
  if (!(a instanceof HTMLAnchorElement)) return;

  /* the destination locale, i.e. the one this click navigates *to* — see the
     data-lang attribute Layout.astro writes on this same anchor */
  const target = a.dataset.lang;
  if (!target) return;

  a.addEventListener('click', () => remember(target));
}
