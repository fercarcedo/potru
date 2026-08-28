import type { NodeGridStrings } from '../types';

export const nodeGrid: NodeGridStrings = {
  eyebrow: 'Record per node',
  heading: 'The 20 nodes, one by one',
  lead: "Each record gathers the pliego's data: GIT's official location plan, the OLT equipment in service, the ONTs in service, and the planned renewal weeks (initial planning, dated from contract signature). The bar at the foot of each card places its window within Phase 2's 46 weeks.",
  altPlano: (name) => `Plan of ${name}`,
  paoPhase1: 'PAO · Phase 1',
  weekAbbrev: 'wk',
  interiorFlag: 'INDOOR',
};
