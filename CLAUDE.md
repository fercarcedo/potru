# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Potru** — an independent, Spanish-language explanatory site about the GPON → XGS-PON renewal of
the **Red Asturcón**, the public FTTH network of Asturias, as described by the public tender
**pliego CON 06/2025** (GIT, Principado de Asturias). Static Astro site, no server code, deployed to
GitHub Pages at `https://fercarcedo.github.io/potru/`.

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
npm run test      # vitest: data, lib and script unit tests (tests/data, tests/lib, tests/scripts)
npm run test:e2e  # playwright: builds + previews dist/, then drives it in Chromium (tests/e2e)
npm run verify    # check + test + build + test:e2e, in that order
```

Node 24 (`.nvmrc`). `npm run verify` is the full gate; run it (or at least `check` and `test`) before
calling a change done. `test:e2e` builds and serves the real `dist/` output rather than the dev
server, so it exercises the same static HTML, base path and asset URLs GitHub Pages serves.

When reading `astro check` output, filter rather than truncate — `tail` has clipped real errors:

```sh
npx astro check 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E '^Result|^- '
```

## Architecture

Everything deterministic is generated **at build time**; only five things are client islands.

**Build time (no JS shipped):** static sections, node cards, action links, the phase-2 gantt, the 9
cable panels of the guided tour, and the 21 node record pages.

- `src/lib/data.ts` — the typed façade over `nodes.json`: `NODES` (20 primary), `PAO_NODE`,
  `ALL_NODES`, `byId`, `AREAS`, `ACTION_DESC`, `HOST_ONLY`, and the helpers `ontCount`, `cardCount`,
  `cardLabel`, `asset`. Read data through here, not from the JSON directly.
- `src/lib/graphics.ts` — pure SVG generators returning markup strings (`mkCWDM`, `mkSection`,
  `occRow`, `mkPAO`, `gantt`), plus the TIA-598 and CWDM colour tables.
- `src/lib/details.ts` — the 9 tour panels, composed from those generators and embedded hidden in
  the page; the tour island only reveals the current one.
- `src/pages/nodos/[id].astro` — one static page per node via `getStaticPaths()`.

**Client islands** (`src/scripts/`, started from `main.ts`, which also wires build-rendered node
cards and gantt bars to the modal):

- `diagram.ts` — end-to-end ONT → splitters → OLT → trunk → PAO schematic, rebuilt on the
  GPON ↔ XGS-PON toggle.
- `map.ts` — the schematic map. Exports `svg` and `TR` (the trunk index) so `tour.ts` can frame and
  highlight; the legacy passed these through `window.__map`. Must be imported **before** `tour.ts`.
- `tour.ts` — the 9-stop guided tour. It drives the map's `viewBox` independently, so anything that
  syncs with zoom state must observe the attribute (`MutationObserver`), not just the buttons.
- `modal.ts` / `walk.ts` / `viewer3d.ts` — node record modal; and the 3D viewer, which
  dynamic-imports `three` only when the visitor presses "Recorrer el interior en 3D" (keep it that
  way — it is the only heavy chunk).

`src/scripts/map.ts` carries `// @ts-nocheck`: it is a literal port of the legacy JavaScript and
leans on implicit number→string coercion in `setAttribute` throughout. Everything else type-checks.

### Data files are the source of truth

- `src/data/nodes.json` — the 20 primary nodes plus the PAO: OLTs (`cards`, `cardModel`,
  `portsPerCard`, `portsActive`, `portsTotal`, `onts`), phase-2 weeks, actions, towns, shared PON
  groups, and the plan gallery.
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

- **Base path**: the site is served from `/potru/`. Every internal link or asset goes through
  `import.meta.env.BASE_URL` (or `asset()` from `src/lib/data.ts`).
- **Language**: code, comments and identifiers in English; all user-facing copy, URLs (`/nodos/…`)
  and data in Spanish.
- **Branding**: the project is *Potru*. Never use "asturcon" as a brand or domain name — the network
  is referred to as «Red Asturcón» in prose only.
- **No `localStorage` / `sessionStorage`** anywhere.
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
    can never be shadowed by import order. A selector that needs to reach *into* a child component
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
- Commits are **in English**, conventional-commit style with a scope (`fix(map): …`,
  `feat(data): …`), and a body explaining what was wrong and why the fix works.
- The pliego's drawings and data are excluded from the repo's MIT licence (authorship: GIT). Keep
  the attribution wording in `README.md` and the site footer intact.
