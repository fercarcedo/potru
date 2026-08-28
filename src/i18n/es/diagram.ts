import type { DiagramStrings } from '../types';

export const diagram: DiagramStrings = {
  eyebrow: 'Visualización inmersiva',
  heading: 'Del salón del usuario al PAO de Gijón',
  lead: 'Cadena completa de la red: ONT → red de acceso pasiva (splitters 1:16 y 1:4) → nodo primario con OLT → red troncal → punto de acceso de operadores. Cambia entre la red actual y la renovada, y pulsa cada elemento para conocer su papel.',
  modeGroupLabel: 'Estado de la red',
  modeCurrent: 'RED ACTUAL · GPON',
  modeRenewed: 'RED RENOVADA · GPON/XGS-PON',
  diagramAria: 'Esquema de la Red Asturcón',
  zoomGroupLabel: 'Zoom del esquema',
  zoomInLabel: 'Acercar el esquema',
  zoomInTitle: 'Acercar',
  zoomOutLabel: 'Alejar el esquema',
  zoomOutTitle: 'Alejar',
  fsGroupLabel: 'Pantalla completa del esquema',
  fsBtnLabel: 'Ver el esquema a pantalla completa',
  captionGpon: 'Portadora GPON · 2,5 Gbps ↓',
  captionXgs: 'Portadora XGS-PON · 10 Gbps ↓',
  captionPassive: 'Elemento pasivo (no cambia)',
  captionPulses: 'pulsos = tráfico descendente',
  infoDefaultBold: 'Explora el esquema.',
  infoDefaultRest:
    ' Haz clic sobre la ONT, los splitters, el nodo OLT, la troncal o el PAO para ver qué son y cómo les afecta la renovación.',
};
