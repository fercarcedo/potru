/**
 * Every DOM id shared between a component that renders it and a client
 * island that looks it up. Both sides import this instead of repeating the
 * literal string, so a rename is one edit instead of a grep across two
 * different files that happen to agree by coincidence — and TypeScript
 * catches a typo'd DOM.xyz immediately, instead of it silently returning
 * null from getElementById at runtime.
 *
 * This does not make the coupling disappear (an island still reaches into
 * markup it doesn't own), only makes it visible and rename-safe. See
 * CLAUDE.md's architecture notes for the fuller picture.
 */
export const DOM = {
  // Layout.astro — the nav's colour-theme toggle (scripts/theme.ts) and its
  // mobile hamburger menu (scripts/navmenu.ts)
  themeToggle: 'themeToggle',
  navToggle: 'navToggle',
  navMenu: 'navMenu',

  // NetworkMap.astro — the schematic map and the guided tour built on it
  astMap: 'astMap',
  mapWrap: 'mapWrap',
  mapTip: 'mapTip',
  areaLegend: 'areaLegend',
  mapZoomIn: 'mapZoomIn',
  mapZoomOut: 'mapZoomOut',
  townsToggle: 'townsToggle',
  tourStart: 'tourStart',
  tourPanel: 'tourPanel',
  tpStep: 'tpStep',
  tpTitle: 'tpTitle',
  tpText: 'tpText',
  tpPrev: 'tpPrev',
  tpNext: 'tpNext',
  tpEnter: 'tpEnter',
  tpExit: 'tpExit',
  tpDetBtn: 'tpDetBtn',
  tpDet: 'tpDet',
  cableZoomIn: 'cableZoomIn',
  cableZoomOut: 'cableZoomOut',

  // Diagram.astro
  netDiagram: 'netDiagram',
  diagramShell: 'diagramShell',
  infoBox: 'infoBox',
  btnGpon: 'btnGpon',
  btnXgs: 'btnXgs',
  diagZoomIn: 'diagZoomIn',
  diagZoomOut: 'diagZoomOut',

  // FullscreenViewer.astro (scripts/fullscreen.ts) — one shared overlay that
  // the map, the diagram and the cable-detail panels each open via their own
  // [data-fs-target] button, for the same reason the map already zooms:
  // a phone-width container is what makes these svgs' text small to begin
  // with, and fullscreen is the most direct fix — more container, not a
  // shrunk drawing.
  fsBg: 'fsBg',
  fsHost: 'fsHost',
  fsClose: 'fsClose',

  // Hero.astro
  heroFiber: 'heroFiber',

  // Architecture.astro
  ontBars: 'ontBars',

  // Phases.astro
  gantt: 'gantt',
  ganttList: 'ganttList',

  // NodeModal.astro
  modalBg: 'modalBg',
  mImg: 'mImg',
  mImgLink: 'mImgLink',
  mBadge: 'mBadge',
  mTabs: 'mTabs',
  mClose: 'mClose',
  mTitle: 'mTitle',
  mAddr: 'mAddr',
  mEnv: 'mEnv',
  mExtra: 'mExtra',
  mPobl: 'mPobl',
  mOlt: 'mOlt',
  mMig: 'mMig',
  mWalk: 'mWalk',
  mActs: 'mActs',
  mPerma: 'mPerma',

  // Lightbox.astro
  lbBg: 'lbBg',
  lbFig: 'lbFig',
  lbImg: 'lbImg',
  lbCap: 'lbCap',
  lbCount: 'lbCount',
  lbSaid: 'lbSaid',
  lbPrev: 'lbPrev',
  lbNext: 'lbNext',
  lbThumbs: 'lbThumbs',
  lbOpen: 'lbOpen',
  lbClose: 'lbClose',

  // Viewer3D.astro
  svBg: 'svBg',
  svTitle: 'svTitle',
  svCanvas: 'svCanvas',
  svExit: 'svExit',
  svMode: 'svMode',
  svWarn: 'svWarn',
  svWarnToggle: 'svWarnToggle',
  svWarnClose: 'svWarnClose',
  svLegend: 'svLegend',
  svLegendToggle: 'svLegendToggle',
  svLoading: 'svLoading',
  svPad: 'svPad',
  svZoomIn: 'svZoomIn',
  svZoomOut: 'svZoomOut',
} as const;
