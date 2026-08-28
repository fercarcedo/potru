import raw from '../data/nodes.json';
import contentRaw from '../data/content.json';
import type { Locale } from '../i18n/types';

/**
 * On disk, every translatable string in content.json and nodes.json is
 * nested `{ es, en }` right next to itself — not forked into a parallel
 * file — so a pliego correction can't land in one language and not the
 * other. `t()` resolves one such pair down to a plain string for the
 * requested locale.
 */
export interface Bi {
  es: string;
  en: string;
}

export const t = (b: Bi, locale: Locale): string => b[locale];

export interface Olt {
  /** identifier used in the pliego, e.g. MUR/1D */
  code: string;
  vendor: string;
  /** line cards fitted, from the TARJETAS column of the node's table */
  cards: number;
  /** GLT2A, "GLT2A y GLT2B", GLT4A… null for the Ericsson cards, which the pliego does not name */
  cardModel: string | null;
  /** GPON ports per line card: 2 for GLT2A/B, 4 for GLT4A, 8 for the BLM 1500 cards */
  portsPerCard: number;
  portsActive: number;
  portsTotal: number;
  /** ONTs in service through this OLT */
  onts: number;
  /** anything the pliego says about this OLT that the numbers alone do not carry */
  note?: string;
}

export interface GalleryItem {
  /** caption exactly as it appears in the pliego ("Alzado izquierdo", …) */
  label: string;
  /** ubicacion | planta | izq | dcha | fondo */
  key: string;
  /** path relative to the site root, without the base ('planos/muros-planta.jpg') */
  src: string;
  w: number;
  h: number;
  /** small variant for the node grid; only the cover image carries one */
  thumb?: { src: string; w: number; h: number };
}

export interface PonGroups {
  /** towns sharing the same passive optical trees */
  groups: string[][];
  note: string;
}

export interface NetworkNode {
  id: string;
  name: string;
  area: string;
  color: string;
  address: string;
  /** the housing described in the pliego: container, ground floor unit, hut… */
  enclosure: string;
  olts: Olt[];
  /** first and last phase 2 week for this node */
  weekFrom: number;
  weekTo: number;
  extra: string;
  /** contract actions affecting this node: PF-1, PV-2… */
  actions: string[];
  towns: string[];
  townsNote?: string;
  ponGroups?: PonGroups;
  gallery: GalleryItem[];
}

/** On disk, a node's free-text fields (enclosure, extra, townsNote, an OLT's
 *  note, ponGroups.note) are nested `{es, en}` the same way as content.json's
 *  prose; everything else on a node (names, towns, figures) is pliego data
 *  and stays a plain value in both locales. */
interface RawOlt extends Omit<Olt, 'note'> {
  note?: Bi;
}

interface RawPonGroups extends Omit<PonGroups, 'note'> {
  note: Bi;
}

interface RawNetworkNode extends Omit<
  NetworkNode,
  'enclosure' | 'extra' | 'townsNote' | 'ponGroups' | 'olts'
> {
  enclosure: Bi;
  extra: Bi;
  townsNote?: Bi;
  ponGroups?: RawPonGroups;
  olts: RawOlt[];
}

function resolveNode(n: RawNetworkNode, locale: Locale): NetworkNode {
  return {
    ...n,
    enclosure: t(n.enclosure, locale),
    extra: t(n.extra, locale),
    townsNote: n.townsNote ? t(n.townsNote, locale) : undefined,
    ponGroups: n.ponGroups
      ? { groups: n.ponGroups.groups, note: t(n.ponGroups.note, locale) }
      : undefined,
    olts: n.olts.map((o) => ({ ...o, note: o.note ? t(o.note, locale) : undefined })),
  };
}

const data = raw as unknown as { nodes: RawNetworkNode[]; pao: RawNetworkNode };

/** The 20 primary nodes, in phase 2 migration order. */
export const NODES: NetworkNode[] = data.nodes.map((n) => resolveNode(n, 'es'));

/** The PAO in Gijón: not a primary node, but it has a record of its own. */
export const PAO_NODE: NetworkNode = resolveNode(data.pao, 'es');

export const ALL_NODES: NetworkNode[] = [...NODES, PAO_NODE];

export const byId: Record<string, NetworkNode> = Object.fromEntries(
  ALL_NODES.map((n) => [n.id, n]),
);

/** Locale-resolved lookup for the handful of call sites that render a single
 *  node's own free text (the node page, the modal): everything else about a
 *  node is locale-independent, so this stays a targeted resolver rather than
 *  a locale-aware twin of `NODES`/`byId`. */
export function nodeById(id: string, locale: Locale = 'es'): NetworkNode | undefined {
  if (locale === 'es') return byId[id];
  const raw = data.nodes.find((n) => n.id === id) ?? (data.pao.id === id ? data.pao : undefined);
  return raw ? resolveNode(raw, locale) : undefined;
}

/** [pill class, description, anchor of the matching card] */
export type ActionDesc = ['fix' | 'var', string, string];

interface RawActionDesc {
  pill: 'fix' | 'var';
  desc: Bi;
  href: string;
}

const RAW_ACTION_DESC: Record<string, RawActionDesc> = {
  'PF-1': {
    pill: 'fix',
    desc: {
      es: 'Sustitución de su OLT por equipo dual GPON/XGS-PON',
      en: 'Replacement of its OLT with a dual GPON/XGS-PON unit',
    },
    href: '#act-pf1',
  },
  'PF-2': {
    pill: 'fix',
    desc: {
      es: 'Instalación de enrutador nuevo (Fase 1)',
      en: 'Installation of a new router (Phase 1)',
    },
    href: '#act-pf2',
  },
  'PF-3': {
    pill: 'fix',
    desc: { es: 'Repuestos de mantenimiento', en: 'Maintenance spares' },
    href: '#act-pf3',
  },
  'PV-1': {
    pill: 'var',
    desc: {
      es: 'ONT nuevas para usuarios con ONT sin capacidad',
      en: 'New ONTs for users whose ONT lacks capacity',
    },
    href: '#act-pv1',
  },
  'PV-2': {
    pill: 'var',
    desc: {
      es: 'ONT nuevas para usuarios con ONT incompatibles',
      en: 'New ONTs for users with incompatible ONTs',
    },
    href: '#act-pv2',
  },
};

function resolveActionDesc(locale: Locale): Record<string, ActionDesc> {
  return Object.fromEntries(
    Object.entries(RAW_ACTION_DESC).map(([code, a]) => [
      code,
      [a.pill, t(a.desc, locale), a.href] as ActionDesc,
    ]),
  );
}

/** Spanish, for the many call sites that only need the codes/hrefs (an
 *  anchor, an existence check) and were written before English existed.
 *  Anything that displays the description text should call actionDesc()
 *  with the visitor's locale instead. */
export const ACTION_DESC: Record<string, ActionDesc> = resolveActionDesc('es');

export function actionDesc(locale: Locale = 'es'): Record<string, ActionDesc> {
  return resolveActionDesc(locale);
}

/**
 * Nodes that house the equipment but whose own town is NOT among the covered
 * ones in the pliego. Marked with * and a dashed ring.
 */
export const HOST_ONLY = ['mieres', 'langreo'];

/** Geographic areas in order of appearance, with their colour. */
export const AREAS: { name: string; color: string }[] = (() => {
  const seen = new Map<string, string>();
  for (const n of NODES) if (!seen.has(n.area)) seen.set(n.area, n.color);
  return [...seen].map(([name, color]) => ({ name, color }));
})();

/* Both totals need nothing from a node but its OLTs, and saying so lets a
   caller — a test, a partial record — hand over just that without a cast. */

/** Total ONTs in service on a node, across all its OLTs. */
export const ontCount = (n: Pick<NetworkNode, 'olts'>): number =>
  n.olts.reduce((a, o) => a + o.onts, 0);

/** Total line cards fitted across a node's OLTs. */
export const cardCount = (n: Pick<NetworkNode, 'olts'>): number =>
  n.olts.reduce((a, o) => a + o.cards, 0);

/** "16 × GLT2A (2 puertos)" / "4 tarjetas de 8 puertos" — how a card set reads in the UI. */
export const cardLabel = (o: Olt): string =>
  o.cardModel
    ? `${o.cards} × ${o.cardModel} (${o.portsPerCard} puertos)`
    : `${o.cards} tarjetas de ${o.portsPerCard} puertos`;

/** Prepends the site base (astro.config's `base`) to a relative path from the JSON. */
export const asset = (path: string): string => import.meta.env.BASE_URL + path;

/**
 * Every `GalleryItem.label` in nodes.json, verbatim, exactly as the pliego's
 * own drawing captions read ("Alzado izquierdo", …) — a small closed
 * vocabulary reused across all 21 nodes' galleries, not per-node free text,
 * so it's a lookup here rather than {es,en} duplicated into every gallery
 * entry. Falls back to the Spanish label itself if a new one ever shows up
 * in the pliego untranslated, rather than showing nothing.
 */
const GALLERY_LABELS: Record<string, Bi> = {
  Ubicación: { es: 'Ubicación', en: 'Location' },
  'Plano de planta': { es: 'Plano de planta', en: 'Floor plan' },
  'Alzado izquierdo': { es: 'Alzado izquierdo', en: 'Left elevation' },
  'Alzado derecho': { es: 'Alzado derecho', en: 'Right elevation' },
  'Alzado fondo': { es: 'Alzado fondo', en: 'Rear elevation' },
};

export function galleryLabel(label: string, locale: Locale = 'es'): string {
  const bi = GALLERY_LABELS[label];
  return bi ? t(bi, locale) : label;
}

/**
 * Site copy transcribed from the pliego that isn't per-node data: the hero's
 * headline figures, the ONT install-base breakdown, the architecture-layer
 * summaries and the GPON/XGS-PON diagram's explanatory text. Kept alongside
 * nodes.json/rooms.json rather than hardcoded into the components and
 * scripts that display it, so it is one place to check against the pliego
 * and one place the data tests can reach.
 */
export interface HeroStat {
  value: string;
  label: string;
  highlight?: boolean;
}

export interface OntInstallEntry {
  model: string;
  note: string;
  pct: number;
  warn: boolean;
}

export interface ArchitectureStep {
  kicker: string;
  heading: string;
  text: string;
}

/**
 * One stop of the guided tour: where to frame the map, which trunks to light
 * up, which node's record the "Entrar en el nodo" button opens, and the copy
 * shown in the panel. `id` is also the key of the stop's "see inside the
 * cables" drawing in DETAILS (src/lib/details.ts) — the two used to be two
 * arrays lined up by index, with nothing checking they stayed aligned.
 */
export interface TourStop {
  id: string;
  /** [x, y, w, h] for the map's viewBox at this stop */
  viewBox: [number, number, number, number];
  /** keys into map.ts's TR index: the trunks this stop highlights */
  trunks: string[];
  /** node whose record the stop can open, or null */
  node: string | null;
  title: string;
  text: string;
}

/** One CWDM system in the PAO, with its channel count and how many of those
 *  channels the pliego lists as occupied. */
export interface PaoRow {
  name: string;
  channels: number;
  used: number;
}

/** Channel-by-channel occupancy of the transport systems in the PAO, plus
 *  the direct-fibre run and the 7750SR-7 capacity warning. Data, not
 *  drawing: graphics.ts's mkPAO() renders it. */
export interface PaoTransport {
  rows: PaoRow[];
  /** the valleys reaching Mieres by direct fibre, with no CWDM in between */
  directLabel: string;
  directNote: string;
  warning: string;
}

/** One labelled span in the wavelength figure — Architecture.astro's «Dos
 *  generaciones sobre el mismo hilo». `lo`/`hi` are nanometres. This is
 *  ITU-T norm data, not pliego data — see `source` on XgsExplainer, which
 *  the figure is required to display alongside it. */
export interface WdmBand {
  lo: number;
  hi: number;
  label: string;
  kind: 'gpon' | 'xgs' | 'video';
}

export interface XgsExplainer {
  gpon: { label: string; rate: string; text: string };
  xgs: { label: string; rate: string; text: string };
  prose: string;
  bands: WdmBand[];
  axisFrom: number;
  axisTo: number;
  /** must be shown with the figure: these wavelengths are not pliego data */
  source: string;
}

export type DiagramMode = 'gpon' | 'xgs';
export type DiagramInfo = Record<string, Record<DiagramMode, string>>;

/** One card in the "Actuaciones previstas" section (Actions.astro). Either
 *  `bullets` (parte fija, a checklist) or `text` (parte variable, a
 *  paragraph) is present, matching how the pliego describes each. */
export interface ContractAction {
  /** anchor id, also used by ACTION_DESC's href for nodes affected by this action */
  id: string;
  /** PF-1, PV-6 · PV-7… */
  code: string;
  pill: 'fix' | 'var';
  part: 'fija' | 'variable';
  heading: string;
  bullets?: string[];
  text?: string;
  /** nodes this action affects, for <AffectedNodes>; absent = none listed */
  aff?: string;
}

interface RawHeroStat {
  value: string;
  label: Bi;
  highlight?: boolean;
}

interface RawOntInstallEntry {
  model: string;
  note: Bi;
  pct: number;
  warn: boolean;
}

interface RawArchitectureStep {
  kicker: Bi;
  heading: Bi;
  text: Bi;
}

type RawDiagramInfo = Record<string, Record<DiagramMode, Bi>>;

interface RawContractAction {
  id: string;
  code: string;
  pill: 'fix' | 'var';
  part: 'fija' | 'variable';
  heading: Bi;
  bullets?: Bi[];
  text?: Bi;
  aff?: string;
}

interface RawTourStop {
  id: string;
  viewBox: [number, number, number, number];
  trunks: string[];
  node: string | null;
  title: Bi;
  text: Bi;
}

interface RawPaoTransport {
  rows: PaoRow[];
  directLabel: string;
  directNote: Bi;
  warning: Bi;
}

interface RawWdmBand {
  lo: number;
  hi: number;
  label: Bi;
  kind: 'gpon' | 'xgs' | 'video';
}

interface RawXgsExplainer {
  gpon: { label: Bi; rate: Bi; text: Bi };
  xgs: { label: Bi; rate: Bi; text: Bi };
  prose: Bi;
  bands: RawWdmBand[];
  axisFrom: number;
  axisTo: number;
  source: Bi;
}

interface ContentData {
  heroStats: RawHeroStat[];
  ontInstallBase: RawOntInstallEntry[];
  architectureSteps: RawArchitectureStep[];
  diagramInfo: RawDiagramInfo;
  contractActions: RawContractAction[];
  tourStops: RawTourStop[];
  paoTransport: RawPaoTransport;
  xgsExplainer: RawXgsExplainer;
}

const content = contentRaw as unknown as ContentData;

export function heroStats(locale: Locale = 'es'): HeroStat[] {
  return content.heroStats.map((s) => ({
    value: s.value,
    label: t(s.label, locale),
    highlight: s.highlight,
  }));
}

export function ontInstallBase(locale: Locale = 'es'): OntInstallEntry[] {
  return content.ontInstallBase.map((o) => ({
    model: o.model,
    note: t(o.note, locale),
    pct: o.pct,
    warn: o.warn,
  }));
}

export function architectureSteps(locale: Locale = 'es'): ArchitectureStep[] {
  return content.architectureSteps.map((s) => ({
    kicker: t(s.kicker, locale),
    heading: t(s.heading, locale),
    text: t(s.text, locale),
  }));
}

export function diagramInfo(locale: Locale = 'es'): DiagramInfo {
  const out: DiagramInfo = {};
  for (const [key, modes] of Object.entries(content.diagramInfo)) {
    out[key] = { gpon: t(modes.gpon, locale), xgs: t(modes.xgs, locale) };
  }
  return out;
}

export function contractActions(locale: Locale = 'es'): ContractAction[] {
  return content.contractActions.map((a) => ({
    id: a.id,
    code: a.code,
    pill: a.pill,
    part: a.part,
    heading: t(a.heading, locale),
    bullets: a.bullets?.map((b) => t(b, locale)),
    text: a.text ? t(a.text, locale) : undefined,
    aff: a.aff,
  }));
}

export function tourStops(locale: Locale = 'es'): TourStop[] {
  return content.tourStops.map((s) => ({
    id: s.id,
    viewBox: s.viewBox,
    trunks: s.trunks,
    node: s.node,
    title: t(s.title, locale),
    text: t(s.text, locale),
  }));
}

export function paoTransport(locale: Locale = 'es'): PaoTransport {
  return {
    rows: content.paoTransport.rows,
    directLabel: content.paoTransport.directLabel,
    directNote: t(content.paoTransport.directNote, locale),
    warning: t(content.paoTransport.warning, locale),
  };
}

export function xgsExplainer(locale: Locale = 'es'): XgsExplainer {
  const x = content.xgsExplainer;
  return {
    gpon: {
      label: t(x.gpon.label, locale),
      rate: t(x.gpon.rate, locale),
      text: t(x.gpon.text, locale),
    },
    xgs: {
      label: t(x.xgs.label, locale),
      rate: t(x.xgs.rate, locale),
      text: t(x.xgs.text, locale),
    },
    prose: t(x.prose, locale),
    bands: x.bands.map((b) => ({ lo: b.lo, hi: b.hi, kind: b.kind, label: t(b.label, locale) })),
    axisFrom: x.axisFrom,
    axisTo: x.axisTo,
    source: t(x.source, locale),
  };
}

/** The contract runs weeks 1–58; Phase 2 (all node migrations) ends at the
 *  same week 58, which is why this single constant covers both the gantt's
 *  span (graphics.ts) and the node grid's mini progress bars (NodeGrid.astro). */
export const CONTRACT_WEEKS = 58;
