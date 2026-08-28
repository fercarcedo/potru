import type { MetaStrings } from '../types';

export const meta: MetaStrings = {
  defaultDescription:
    'Visor divulgativo de la renovación GPON → XGS-PON de la Red Asturcón, la red pública FTTH de Asturias, según el pliego CON 06/2025 de GIT. Proyecto independiente.',
  homeTitle: 'Potru · GPON → XGS-PON · Renovación FTTH de la Red Asturcón (CON 06/2025)',
  nodeTitle: (name) => `${name} · Potru · renovación GPON → XGS-PON`,
  paoDescription: (name, enclosure) =>
    `${name}: punto de acceso de operadores de la Red Asturcón. ${enclosure}`,
  nodeDescription: ({ name, area, olts, onts, weekFrom, weekTo }) =>
    `Nodo ${name} (área ${area}): ${olts} OLT y ${onts} ONT en servicio, migración prevista en las semanas ${weekFrom}–${weekTo} de la Fase 2 del pliego CON 06/2025.`,
};
