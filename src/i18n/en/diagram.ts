import type { DiagramStrings } from '../types';

export const diagram: DiagramStrings = {
  eyebrow: 'Immersive visualization',
  heading: "From the user's living room to the Gijón PAO",
  lead: "The network's full chain: ONT → passive access network (1:16 and 1:4 splitters) → primary node with OLT → trunk network → operator access point. Switch between the current and renewed network, and click each element to learn its role.",
  modeGroupLabel: 'Network state',
  modeCurrent: 'CURRENT NETWORK · GPON',
  modeRenewed: 'RENEWED NETWORK · GPON/XGS-PON',
  diagramAria: 'Diagram of the Asturcón Network',
  zoomGroupLabel: 'Diagram zoom',
  zoomInLabel: 'Zoom into the diagram',
  zoomInTitle: 'Zoom in',
  zoomOutLabel: 'Zoom out of the diagram',
  zoomOutTitle: 'Zoom out',
  fsGroupLabel: 'Fullscreen view of the diagram',
  fsBtnLabel: 'View the diagram in fullscreen',
  captionGpon: 'GPON carrier · 2.5 Gbps ↓',
  captionXgs: 'XGS-PON carrier · 10 Gbps ↓',
  captionPassive: 'Passive element (unchanged)',
  captionPulses: 'pulses = downstream traffic',
  infoDefaultBold: 'Explore the diagram.',
  infoDefaultRest:
    ' Click the ONT, the splitters, the OLT node, the trunk or the PAO to see what they are and how the renewal affects them.',
};
