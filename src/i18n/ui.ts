/**
 * Public entry point for site-chrome strings: everything hardcoded directly
 * in a component's own template (headings, leads, buttons, aria-labels) plus
 * the handful of runtime toggle-state labels that mirror them (map.ts,
 * tour.ts, viewer3d.ts, walk.ts read this module too, since a translated
 * static label that snaps back to Spanish on the first click would be worse
 * than not translating it).
 *
 * This is chrome and fixed site prose, not pliego data: node names, figures,
 * dates, per-action descriptions (ACTION_DESC) and the free-text fields in
 * nodes.json (address, enclosure, extra, townsNote, ponGroups.note, gallery
 * labels) are untranslated so far — see CLAUDE.md's "Language" convention for
 * the plan to bring content.json's prose and those per-node fields in too.
 *
 * The strings themselves live one file per domain, split first by locale and
 * then by domain (`es/nav.ts`, `en/nav.ts`, …), each typed against the
 * interface in `types.ts` — so a missing or mistranslated key is a compile
 * error at the exact file that got it wrong. `es/index.ts`/`en/index.ts`
 * assemble those into the two `UiStrings` objects this module resolves
 * between; every consumer still just imports `ui`/`Locale` from here.
 */
import { en } from './en';
import { es } from './es';
import type { Locale, UiStrings } from './types';

export type { Locale } from './types';

const DICTS: Record<Locale, UiStrings> = { es, en };

/** Resolves the UI-chrome dictionary for a locale. Defaults to Spanish for
 *  any caller that hasn't threaded a locale through yet. */
export function ui(locale: Locale = 'es'): UiStrings {
  return DICTS[locale];
}
