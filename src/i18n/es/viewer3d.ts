import type { Viewer3dStrings } from '../types';

export const viewer3d: Viewer3dStrings = {
  warnToggleTitle: 'Aviso sobre esta recreación',
  warnToggleLabel: 'Aviso',
  modeRenewed: 'Ver renovado',
  modeCurrent: 'Ver actual',
  warnClose: 'Cerrar el aviso',
  warnText:
    'RECREACIÓN A ESCALA — el recinto, la puerta y la posición de cada armario están tomados del plano de planta del pliego; el número de OLT, sus tarjetas y sus puertos GPON, de las tablas de equipamiento; y lo serigrafiado en cada bastidor —fabricante, modelo, código y juego de tarjetas— de esas mismas fuentes. Los acabados, los colores y el aspecto de los equipos siguen siendo interpretación por mucho que el render haya mejorado: saber que un OLT es un Alcatel 7342 no es tener una foto de un Alcatel 7342, y el pliego no la trae. No es una fotografía ni un modelo real del nodo.',
  watermark: 'simulación · no es imagen real',
  help: 'ARRASTRA para mirar · W A S D / flechas para moverte · RUEDA o PELLIZCA para ampliar',
  zoomGroupLabel: 'Zoom de la vista',
  zoomInTitle: 'Ampliar',
  zoomOutTitle: 'Reducir',
  legendToggleTitle: 'Equipamiento del recinto',
  loading: 'CARGANDO SALA…',
  svTitlePrefix: 'Interior simulado · ',
  loadError: 'No se pudo cargar el motor 3D (¿sin conexión?)',
  legendReconstructed: 'Reconstruido del plano',
  legendFloorPlan: 'Planta',
  legendRoom: (w, d, h) => `Recinto ${w} × ${d} m · ${h} m libres`,
  legendCabinets: (n) => `${n} armarios rotulados en el plano`,
  legendOltCards: (olts, cards) => `${olts} OLT · ${cards} tarjetas`,
  legendOltLine: (portsPerCard, active, total) =>
    ` — ${portsPerCard} puertos GPON <b>por tarjeta</b>, ${active} de ${total} activos`,
  legendNoOlt: 'Sin OLT: punto de interconexión con los operadores',
};
