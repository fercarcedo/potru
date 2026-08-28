# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Potru** — an independent explanatory site about the GPON → XGS-PON renewal of the
**Red Asturcón**, the public FTTH network of Asturias, as described by the public tender
**pliego CON 06/2025** (GIT, Principado de Asturias). The pliego itself only exists in Spanish, which
is the site's own default and unprefixed language; every route also renders under `/en/` — see
"Language" under Conventions for what that rendering does and does not cover yet. Static Astro site,
no server code, deployed as static assets on Cloudflare Workers at `https://potru.app/`.

## The golden rule

**Every figure, name, date and drawing comes from the pliego. Nothing is invented.** When something
is interpretation or an illustrative rendering rather than a literal datum, the UI itself has to say
so — the existing wording is «ilustrativo», «sin desglose en el pliego», «recreación interpretada»,
and the 3D viewer's `sv-warn` notice. When the pliego contradicts itself (e.g. `NVI/1C` says 7 cards
× 8 ports but its table gives 44 total; `BLI/1B` and `BLI/9B` list more active ports than total),
the numbers are transcribed **as-is** and annotated — never "fixed". See `docs/FUENTES.md`, which
records where each class of data came from; keep it updated when data changes.

## Commands

```sh
npm install
npm run dev       # dev server
npm run build     # static site into dist/
npm run preview   # serve dist/ as it will be published
npm run check     # astro check — types and templates
npm run format    # prettier over the repo — see the formatting note below
npm run lint      # eslint (typescript-eslint), the part a formatter can't see
npm run test      # vitest: data, lib and script unit tests (tests/data, tests/lib, tests/scripts)
npm run test:e2e  # playwright: builds + previews dist/, then drives it in Chromium (tests/e2e)
npm run verify    # check + test + build + test:e2e, in that order
```

Node 24 (`.nvmrc`). `npm run verify` is the full gate; run it (or at least `check` and `test`) before
calling a change done. `test:e2e` builds and serves the real `dist/` output rather than the dev
server, so it exercises the same static HTML, base path and asset URLs Cloudflare serves.
`npm run deploy` builds and runs `wrangler deploy` (`wrangler.jsonc`); `npm run cf:dev` builds and
serves that same output locally through Wrangler's own runtime, closer to production than
`npm run preview`.

When reading `astro check` output, filter rather than truncate — `tail` has clipped real errors:

```sh
npx astro check 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E '^Result|^- '
```

## Architecture

Everything deterministic is generated **at build time**; only five things are client islands.

**Build time (no JS shipped):** static sections, node cards, action links, the phase-2 gantt, the 9
cable panels of the guided tour, and the 21 node record pages.

- `src/lib/data.ts` — the typed façade over both JSON data files. From `nodes.json`: `NODES` (20
  primary), `PAO_NODE`, `ALL_NODES`, `byId`, `AREAS`, `ACTION_DESC`, `HOST_ONLY`, and the helpers
  `ontCount`, `cardCount`, `cardLabel`, `asset`. From `content.json`: `HERO_STATS`,
  `ONT_INSTALL_BASE`, `ARCHITECTURE_STEPS`, `DIAGRAM_INFO`, `CONTRACT_ACTIONS`, `TOUR_STOPS`,
  `PAO_TRANSPORT`. Read data through here, not from the JSON directly.
- `src/lib/graphics.ts` — pure SVG generators returning markup strings (`mkCWDM`, `mkSection`,
  `occRow`, `mkPAO`, `gantt`), plus the TIA-598 and CWDM colour tables. Every one of them takes its
  figures as arguments — none of them carries pliego data of its own.
- `src/lib/details.ts` — the tour panels, composed from those generators and embedded hidden in the
  page; the tour island only reveals the current one. It is a `Record` **keyed by tour-stop id**
  (`TOUR_STOPS[i].id`), not an array: the panel and the stop's prose used to be two arrays lined up
  by index, so reordering a stop silently mismatched them. `tests/lib/details.test.ts` guards the
  key contract.
- `src/i18n/` — the site-chrome dictionary, split first by locale and then by domain:
  `types.ts` holds `Locale` and one interface per domain (`NavStrings`, `HeroStrings`, …) composed
  into `UiStrings`; `es/<domain>.ts` and `en/<domain>.ts` (`nav.ts`, `hero.ts`, `nodeDetail.ts`, …)
  each export that domain's strings typed against its interface, so a missing or mistranslated key
  is a compile error at the exact file that got it wrong; `es/index.ts`/`en/index.ts` assemble the
  17 domains into the two `UiStrings` objects; `ui.ts` is the one importable entry point everything
  else uses (`ui(locale)`, defaulting to Spanish, plus the `Locale` type) — components and scripts
  never import an `es/`/`en/` file directly. `tests/lib/ui.test.ts` walks both assembled trees leaf
  by leaf and fails if any string is still identical between locales, which is the one thing the
  per-file interface typing can't catch on its own (a copied string type-checks fine). Covers
  structural chrome (nav, footer, buttons, aria-labels) and node-record labels; pliego-derived prose
  still lives in `content.json`, untranslated so far — see "Language" under Conventions.
- `src/lib/node-render.ts` — the HTML fragments a node record is made of (OLT table, migration
  strip, served towns, the "ÁREA" tag), shared between `NodeDetail.astro` (build time) and
  `src/scripts/modal.ts` (runtime, for the home-page modal) so an escaping fix or a markup change
  can't drift between the two. Every export takes an optional `locale`, defaulting to Spanish.
- `src/pages/[...locale]/nodos/[id].astro` — one static page per node via `getStaticPaths()`,
  crossed with locale (see below): 42 pages, not 21.

**i18n routing**: `astro.config.mjs`'s `i18n` block declares `es` (default) and `en`, with
`prefixDefaultLocale: false`. Both pages live under `src/pages/[...locale]/` — a rest param that
matches **zero** path segments when `getStaticPaths()` gives it `undefined`, which is what leaves
Spanish unprefixed at `/nodos/<id>` while English renders at `/en/nodos/<id>` from the same file.
`Astro.currentLocale` resolves purely from the URL, so any component in the tree can read it — no
prop-drilling needed — and `getRelativeLocaleUrl()` (from `astro:i18n`) builds the other locale's
equivalent of the current path, which is how `Layout.astro` computes the manual toggle's target, and
how every component that links to `/nodos/<id>` (`NodeGrid.astro`, `AffectedNodes.astro`,
`NodeDetail.astro`'s back-link and action links) builds a same-locale href instead of always
pointing at the Spanish tree. `src/scripts/modal.ts` is the one client-side exception:
`getRelativeLocaleUrl` isn't available in a plain browser script, so it composes the English prefix
itself (`${BASE_URL}en/`) — safe only because `prefixDefaultLocale: false` fixes that prefix's shape.
See "Language" under Conventions for what is translated and what still isn't.

**Client islands** (`src/scripts/`, started from `main.ts`, which also wires build-rendered node
cards and gantt bars to the modal):

- `diagram.ts` — end-to-end ONT → splitters → OLT → trunk → PAO schematic, rebuilt on the
  GPON ↔ XGS-PON toggle.
- `map.ts` — the schematic map. `initMap()` returns `svg` and `TR` (the trunk index), which
  `main.ts` passes into `initTour()`; the legacy passed these through `window.__map` and relied on
  map.ts being imported before tour.ts. The ordering is now a compile-time argument, not a comment.
- `tour.ts` — the 9-stop guided tour. The stops themselves (framing, trunks, node, copy) are
  `TOUR_STOPS` in `content.json`; this module only drives them. It moves the map's `viewBox`
  independently, so anything that syncs with zoom state must observe the attribute
  (`MutationObserver`), not just the buttons.
- `svg.ts` — the one `createElementNS` + `setAttribute` factory the islands share. Nothing else in
  `src/scripts/` should spell out the SVG namespace.
- `modal.ts` / `walk.ts` / `viewer3d.ts` — node record modal; and the 3D viewer, which
  dynamic-imports `three` only when the visitor presses "Recorrer el interior en 3D" (keep it that
  way — it is the only heavy chunk).

`map.ts`, `tour.ts`, `viewer3d.ts` and `walk.ts` each overwrite a handful of their own DOM nodes'
text on interaction (a toggle's label, the tour's step counter, the 3D mode switch) — a translated
static label that snapped back to Spanish on the first click would be worse than not translating it
at all, so those specific strings read `document.documentElement.lang` and pull from `ui.ts` too.
This is narrower than full i18n support for these islands: their tooltips, the tour stops' own
prose and the 3D equipment legend are still Spanish-only. `node-render.ts`'s functions run at build
time as well as here, so they take `locale` as an explicit argument instead (`modal.ts` resolves it
once, from the same `document.documentElement.lang`, and passes it through) — reading the DOM
directly would break at build time, when there is no DOM to read.

Everything type-checks, including `src/scripts/map.ts` — once a literal, `// @ts-nocheck`'d port of
the legacy JavaScript. The shared `svgEl()` in `src/scripts/svg.ts` takes a typed `SvgAttrs =
Record<string, string | number>` and calls `String(...)` explicitly before `setAttribute`, matching
the coercion `setAttribute` already did implicitly at runtime, so the type checker sees the same
thing the runtime always did.

### Data files are the source of truth

- `src/data/nodes.json` — the 20 primary nodes plus the PAO: OLTs (`cards`, `cardModel`,
  `portsPerCard`, `portsActive`, `portsTotal`, `onts`), phase-2 weeks, actions, towns, shared PON
  groups, and the plan gallery.
- `src/data/content.json` — every piece of pliego-derived site copy that isn't per-node: the hero's
  headline figures, the ONT install base, the architecture-layer summaries, the diagram's
  explanations, the contract-action cards, the 9 guided-tour stops and the PAO's transport
  occupancy. It exists so this copy is in one checkable place instead of inlined in the components
  and islands that display it, and so `tests/data/content.test.ts` can guard it. Every
  translatable string is nested `{ "es": "…", "en": "…" }` in place — see "Language" under
  Conventions — so `src/lib/data.ts`'s getters take a locale, not the raw JSON shape.
- `src/data/rooms.json` — one entry per node id (21), transcribed in metres from that node's
  `*-planta.jpg`: `outline` polygon, `doors`, and `bays` (`kind` drives the mesh/colour; an `olt`
  bay renders that OLT's real cards and lit ports). Only the Red Asturcón room is modelled;
  adjoining third-party space is a blind wall.
- `public/planos/` — 105 original-resolution JPEGs extracted from the pliego PDF.

These are edited **by hand against the pliego**. The one-shot extractor that created them is gone
from the tree on purpose (`git show dd651e1:tools/extract-legacy.mjs`); re-running it would wipe
`public/planos/` and every correction since. The pliego PDF (54 MB) and the legacy HTML are not
versioned.

## Conventions

- **Base path**: the site is served from the domain root (`base: '/'` in `astro.config.mjs`) —
  it used to be `/potru/`, back when it lived on GitHub Pages as a project site. Every internal
  link or asset still goes through `import.meta.env.BASE_URL` (or `asset()` from
  `src/lib/data.ts`) rather than a hardcoded `/`, so the convention holds if the base ever moves
  again. This is orthogonal to the `/en/` locale prefix from the `i18n` block: base is where the
  site as a whole is mounted, the locale prefix is which rendering of a page you're on, and an
  asset path built from `BASE_URL` is deliberately the same on both.
- **Language**: code, comments and identifiers in English; all user-facing copy, URLs (`/nodos/…`)
  and data in Spanish, with every page also rendering under `/en/`. Spanish is the pliego's own
  language and the site's default; `defaultLocale: 'es'` with `prefixDefaultLocale: false`
  (`astro.config.mjs`) keeps it unprefixed, so no existing URL moved when the `/en/` tree was
  added. A translation is of _this site's_ Spanish summary, not of the pliego, which exists only in
  Spanish: proper nouns, enclosure codes, OLT models and «pliego CON 06/2025» stay untranslated, and
  the disclaimer vocabulary («ilustrativo», «sin desglose en el pliego», «recreación interpretada»,
  the 3D viewer's `sv-warn` notice) gets an English equivalent that concedes exactly as much — see
  the golden rule above.

  **What is translated so far**: every string hardcoded directly in a component's own template
  (headings, leads, buttons, aria-labels — via `src/i18n/ui.ts`), the node record's own labels
  (`node-render.ts`: OLT table headers, migration-strip text, served-towns headings), the runtime
  toggle-state labels in `map.ts`/`tour.ts`/`viewer3d.ts`/`walk.ts` that would otherwise overwrite
  that same chrome with Spanish on the first click, and `content.json`'s pliego-derived prose (the
  architecture-layer summaries, the diagram's click-to-learn text, the contract-action cards, the 9
  guided-tour stops' own title/text, the ONT install-base notes, the PAO transport warning, the
  GPON/XGS-PON explainer). Every translatable string in `content.json` is nested
  `{ "es": "…", "en": "…" }` right where the Spanish already was, not forked into a parallel file,
  so a pliego correction can't land in one language and not the other; `src/lib/data.ts`'s
  `heroStats()`/`architectureSteps()`/`diagramInfo()`/`contractActions()`/`tourStops()`/
  `paoTransport()`/`xgsExplainer()` resolve that down to a locale's plain strings (default Spanish),
  so every consumer sees the same flat shapes as before and needs no change beyond passing a
  locale. **Not translated yet**: `nodes.json`'s per-action descriptions (`ACTION_DESC`), the
  free-text per-node fields (`address`, `enclosure`, `extra`, `townsNote`, `ponGroups.note`) and the
  plan gallery's own labels (`planta`, `alzado`, …); and the markup `graphics.ts`/`details.ts`
  generate via `set:html` (map labels, the gantt, the CWDM/spectrum diagrams, the tour's 9
  cable-detail panels — `DETAILS` in `details.ts` deliberately still asks `paoTransport('es')` even
  for the one panel it could resolve, since the other 8 stay Spanish regardless) plus what the
  client islands build from it at runtime (map tooltips, the 3D viewer's equipment legend) — all of
  it needs a `locale` argument threaded through the generators that don't have one yet.

  The visitor's language follows their browser on first visit to `/` only: an inline pre-paint
  script in `Layout.astro` (mirroring the theme script below it, and gated to fire only there)
  checks `navigator.languages` and, absent a stored choice, redirects an English browser to `/en/`
  before first paint. Otherwise the site follows whatever the visitor last chose with the language
  toggle in the nav (a real `<a href>` to the current page's equivalent in the other locale, wired
  by `src/scripts/lang.ts`) — an explicit choice always wins, and a deep link to `/nodos/<id>` or
  `/en/…` is never auto-redirected, so a shared URL always opens in the language it was shared as.
  `/es/` does not exist as a real route; `public/_redirects` sends it to the unprefixed default.
  `playwright.config.ts` pins `locale: 'es-ES'` for exactly this reason: a Chromium build whose own
  default locale matches `/^en/i` (this varies) would otherwise make the redirect above fire on a
  plain `page.goto('./')`, which almost none of `tests/e2e/smoke.spec.ts` is testing for. The
  `language` describe block opts individual tests into `'en-US'` where that is the point.
  `Layout.astro` also emits a `hreflang` alternate pair (`es`/`en`) plus `x-default` pointing at
  the Spanish URL, on every page, so a crawler discovers `/en/` without needing the redirect.

- **Branding**: the project is _Potru_. Never use "asturcon" as a brand or domain name — the network
  is referred to as «Red Asturcón» in prose only.
- **Client-side storage is for two things only: the colour theme and the language choice.**
  `localStorage` holds `potru:theme` (`"light"` / `"dark"`, written by `src/scripts/theme.ts`) and
  `potru:lang` (`"es"` / `"en"`, written by `src/scripts/lang.ts`), plus the two pre-paint inline
  scripts in `Layout.astro` that read them before first paint, and nothing else. This used to be a
  blanket ban on `localStorage` and `sessionStorage`; it was lifted deliberately, first for the
  theme toggle and then for language, because the alternative — losing the visitor's choice on
  every navigation to `/nodos/<id>`, or being redirected back to the language they already left —
  is worse, and a preference the visitor asked for is not tracking. The ban stays in force for
  everything else, and `tests/data/no-storage.test.ts` is what keeps it honest: it allows exactly
  those two keys in those three files and fails on any other use.
- Honour `prefers-reduced-motion` (there is a global CSS rule, and `tour.ts` checks it).
- Progressive enhancement: node cards and gantt bars are real anchors to `/nodos/<id>`; JS upgrades
  them to the modal.
- Styling is hand-written CSS with custom properties (`--gpon` amber, `--xgs` teal); fonts are
  self-hosted via `@fontsource`, never a CDN. There are two homes for a rule, and which one is not a
  style choice — it is forced by whether Astro's scoped-style attribute can reach the markup:
  - **A component's own `<style>`** if every element the rule touches is written directly in that
    component's own template — no `set:html`, no child component, nothing a client island rewrites.
    Astro tags each of the component's own elements with a `data-astro-cid-*` attribute and adds it
    to the compiled selector, so the rule is automatically more specific than anything global and
    can never be shadowed by import order. A selector that needs to reach _into_ a child component
    (e.g. `.card .affected`, where `.affected` is a child component's root element) cannot be scoped
    this way — scoping does not propagate across a component boundary — so either restyle from the
    child's own `<style>` instead (preferred; see `AffectedNodes.astro`) or fall back to
    `:global(...)` on just that part of the selector.
  - **`src/styles/*.css`, indexed by `global.css`** for everything scoped styles can't reach: markup
    built from strings in `graphics.ts`/`details.ts`/`node-render.ts` via `set:html`, markup a client
    island constructs at runtime (`map.ts`, `diagram.ts`, `modal.ts`, …), tokens and resets, and the
    handful of classes reused verbatim by two unrelated components (`.disclaimer`, used by both
    `Hero.astro` and `Layout.astro`'s footer — each is its own independent instance of the class, so
    it has to be a plain global rule, not a scoped one, to reach both). `global.css` is only an
    `@import` index; Vite inlines it at build time so the site still ships one stylesheet. Put a rule
    in the partial that owns the markup, keep its `@media` overrides **at the end of that same
    partial** (global rules have no scope attribute to fall back on, so equal-specificity overrides
    only win if they come later in the cascade), and add a new partial to `global.css`'s import list
    when it needs a place in that order.
- **Formatting is prettier's**, over the whole repo (`npm run format`, `format:check` in the gate).
  Nothing is hand-aligned: `src/styles/` used to be written one rule per line with the spaces
  squeezed out, and that bought nothing — Astro minifies the stylesheet at build time either way,
  so how the source is written never reaches the wire. `.astro` files included, via
  `prettier-plugin-astro`.
- **Linting is eslint's**, `src/` and `tests/` TypeScript only, on typescript-eslint's
  `recommendedTypeChecked` — type-aware, so it catches the failures this codebase is actually
  exposed to and review is not: a dropped promise from a dynamic import that never resolves, an
  assertion that has stopped telling the compiler anything. It has to be scoped to `.ts`; the
  config files at the root are plain JS with no program behind them, so the same rules there fail
  to load rather than fail to find anything.
- `noUncheckedIndexedAccess` is **on**, and it is what makes the `arr[i]!` idiom honest. Without
  it those assertions are dead weight — `no-unnecessary-type-assertion` reported 80 of them — and
  deleting them would have been the wrong fix, because the moment the flag went on they would all
  be needed again. With it on, 80 became 1. Index into an array and either assert or handle the
  `undefined`; do not reach for `as`.
- Interfaces whose members are **plain closures declare them as properties**, not with method
  shorthand (`openNode: (id: string) => void`, not `openNode(id: string): void`). `ModalApi` and
  `EquipmentBuilders` are both destructured by their callers, and method syntax claims a `this`
  that none of these functions has — which is exactly what `unbound-method` reports.
- Commits are **in English**, conventional-commit style with a scope (`fix(map): …`,
  `feat(data): …`), and a body explaining what was wrong and why the fix works.
- The pliego's drawings and data are excluded from the repo's MIT licence (authorship: GIT). Keep
  the attribution wording in `README.md` and the site footer intact.
