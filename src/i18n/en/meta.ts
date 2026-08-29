import type { MetaStrings } from '../types';

export const meta: MetaStrings = {
  defaultDescription:
    "Explanatory viewer of the Asturcón Network's GPON to XGS-PON renewal, the public FTTH network of Asturias, per pliego CON 06/2025 by GIT. Independent project.",
  homeTitle: 'Potru · GPON → XGS-PON · Asturcón Network FTTH Renewal (CON 06/2025)',
  nodeTitle: (name) => `${name} · Potru · GPON → XGS-PON renewal`,
  paoDescription: (name, enclosure) =>
    `${name}: the Asturcón Network's operator access point. ${enclosure}`,
  nodeDescription: ({ name, area, olts, onts, weekFrom, weekTo }) =>
    `${name} node (area ${area}): ${olts} OLT and ${onts} ONT in service, renewal planned for weeks ${weekFrom}–${weekTo} of pliego CON 06/2025's Phase 2.`,
};
