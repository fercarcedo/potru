import raw from '../data/nodes.json';

/** [code, vendor, cards, ports, ONTs in service] */
export type Olt = [string, string, number, number, number];

export interface GalleryItem {
  /** caption exactly as it appears in the pliego ("Alzado izquierdo", …) */
  label: string;
  /** ubicacion | planta | izq | dcha | fondo */
  key: string;
  /** path relative to the site root, without the base ('planos/muros-planta.jpg') */
  src: string;
  w: number;
  h: number;
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

const data = raw as unknown as { nodes: NetworkNode[]; pao: NetworkNode };

/** The 20 primary nodes, in phase 2 migration order. */
export const NODES: NetworkNode[] = data.nodes;

/** The PAO in Gijón: not a primary node, but it has a record of its own. */
export const PAO_NODE: NetworkNode = data.pao;

export const ALL_NODES: NetworkNode[] = [...NODES, PAO_NODE];

export const byId: Record<string, NetworkNode> = Object.fromEntries(
  ALL_NODES.map((n) => [n.id, n])
);

/** [pill class, description, anchor of the matching card] */
export type ActionDesc = ['fix' | 'var', string, string];

export const ACTION_DESC: Record<string, ActionDesc> = {
  'PF-1': ['fix', 'Sustitución de su OLT por equipo dual GPON/XGSPON', '#act-pf1'],
  'PF-2': ['fix', 'Instalación de enrutador nuevo (Fase 1)', '#act-pf2'],
  'PF-3': ['fix', 'Repuestos de mantenimiento', '#act-pf3'],
  'PV-1': ['var', 'ONT nuevas para usuarios con ONT sin capacidad', '#act-pv1'],
  'PV-2': ['var', 'ONT nuevas para usuarios con ONT incompatibles', '#act-pv2'],
};

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

/** Total ONTs in service on a node, across all its OLTs. */
export const ontCount = (n: NetworkNode): number => n.olts.reduce((a, o) => a + o[4], 0);

/** Prepends the site base ('/potru/') to a relative path from the JSON. */
export const asset = (path: string): string => import.meta.env.BASE_URL + path;
