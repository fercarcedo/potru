/**
 * The shape every locale's UI-chrome dictionary must satisfy — one interface
 * per domain, composed into `UiStrings`. Each `es/<domain>.ts` and
 * `en/<domain>.ts` file types its own export against the matching interface
 * here, so a missing or misspelled key is a compile error at the exact file
 * that got it wrong, not just somewhere in the assembled whole.
 */

export type Locale = 'es' | 'en';

export interface MetaStrings {
  defaultDescription: string;
  homeTitle: string;
  nodeTitle: (name: string) => string;
  paoDescription: (name: string, enclosure: string) => string;
  nodeDescription: (args: {
    name: string;
    area: string;
    olts: number;
    onts: number;
    weekFrom: number;
    weekTo: number;
  }) => string;
}

export interface NavStrings {
  tagline: string;
  viz: string;
  map: string;
  nodes: string;
  architecture: string;
  actions: string;
  phases: string;
  menuSrOnly: string;
}

export interface FooterStrings {
  independentBold: string;
  independentRest: string;
  source: string;
}

export interface SharedStrings {
  walkLabel: string;
  walkNote: string;
  actionsAffecting: string;
  close: string;
  exit: string;
  fullscreenTitle: string;
}

export interface HeroStrings {
  titleLead: string;
  titleWave: string;
  sub: string;
  disclaimerBold: string;
  disclaimerRest: string;
}

export interface ArchitectureStrings {
  eyebrow: string;
  heading: string;
  lead: string;
  ontHeading: string;
  ontSub: string;
  techEyebrow: string;
  techHeading: string;
  spectrumAria: string;
  fsGroupLabel: string;
  fsBtnLabel: string;
}

export interface ActionsStrings {
  eyebrow: string;
  heading: string;
  lead: string;
  fixed: string;
  variable: string;
}

export interface PhasesStrings {
  eyebrow: string;
  heading: string;
  lead: string;
  phase1Heading: string;
  phase1Dur: string;
  phase1Body: string;
  phase2Heading: string;
  phase2Dur: string;
  phase2Body: string;
  nt1: string;
  nt2: string;
  nt3: string;
  calendarHeading: string;
  calendarNote: string;
  ganttAria: string;
  ganttNote: string;
  phase3Heading: string;
  phase3Dur: string;
  phase3Body: string;
}

export interface NodeGridStrings {
  eyebrow: string;
  heading: string;
  lead: string;
  altPlano: (name: string) => string;
  paoPhase1: string;
  weekAbbrev: string;
  interiorFlag: string;
}

export interface MapStrings {
  eyebrow: string;
  heading: string;
  lead: string;
  tourStart: string;
  townsVisible: string;
  townsHidden: string;
  legendOwn: string;
  legendRented: string;
  mapAria: string;
  fsGroupLabel: string;
  fsBtnLabel: string;
  zoomGroupLabel: string;
  zoomInLabel: string;
  zoomInTitle: string;
  zoomOutLabel: string;
  zoomOutTitle: string;
  cableOpen: string;
  cableClose: string;
  cableZoomGroupLabel: string;
  cableZoomInLabel: string;
  cableZoomOutLabel: string;
  cableFsLabel: string;
  tourPrev: string;
  tourNext: string;
  tourEnter: string;
  tourExit: string;
  tourStepOf: (i: number, total: number) => string;
  tourFinish: string;
  tourResume: string;
}

export interface DiagramStrings {
  eyebrow: string;
  heading: string;
  lead: string;
  modeGroupLabel: string;
  modeCurrent: string;
  modeRenewed: string;
  diagramAria: string;
  zoomGroupLabel: string;
  zoomInLabel: string;
  zoomInTitle: string;
  zoomOutLabel: string;
  zoomOutTitle: string;
  fsGroupLabel: string;
  fsBtnLabel: string;
  captionGpon: string;
  captionXgs: string;
  captionPassive: string;
  captionPulses: string;
  infoDefaultBold: string;
  infoDefaultRest: string;
}

export interface NodeModalStrings {
  interiorBadge: string;
  placeholderAlt: string;
  permalink: string;
}

export interface LightboxStrings {
  ariaLabel: string;
  openOriginal: string;
  prevAria: string;
  nextAria: string;
  thumbsAria: string;
  help: string;
}

export interface Viewer3dStrings {
  warnToggleTitle: string;
  warnToggleLabel: string;
  modeRenewed: string;
  modeCurrent: string;
  warnClose: string;
  warnText: string;
  watermark: string;
  help: string;
  zoomGroupLabel: string;
  zoomInTitle: string;
  zoomOutTitle: string;
  legendToggleTitle: string;
  loading: string;
  svTitlePrefix: string;
  loadError: string;
}

export interface FullscreenViewerStrings {
  ariaLabel: string;
}

export interface AffectedNodesStrings {
  label: string;
}

export interface NodeDetailStrings {
  backLink: string;
  oltHeading: string;
  remainingPlans: string;
}

export interface UiStrings {
  meta: MetaStrings;
  nav: NavStrings;
  footer: FooterStrings;
  shared: SharedStrings;
  hero: HeroStrings;
  architecture: ArchitectureStrings;
  actions: ActionsStrings;
  phases: PhasesStrings;
  nodeGrid: NodeGridStrings;
  map: MapStrings;
  diagram: DiagramStrings;
  nodeModal: NodeModalStrings;
  lightbox: LightboxStrings;
  viewer3d: Viewer3dStrings;
  fullscreenViewer: FullscreenViewerStrings;
  affectedNodes: AffectedNodesStrings;
  nodeDetail: NodeDetailStrings;
}
