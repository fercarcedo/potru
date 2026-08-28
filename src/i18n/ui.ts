/**
 * Site-chrome strings: everything hardcoded directly in a component's own
 * template (headings, leads, buttons, aria-labels) plus the handful of
 * runtime toggle-state labels that mirror them (map.ts, tour.ts, viewer3d.ts,
 * walk.ts read this module too, since a translated static label that snaps
 * back to Spanish on the first click would be worse than not translating it).
 *
 * This is chrome and fixed site prose, not pliego data: node names, figures,
 * dates, per-action descriptions (ACTION_DESC) and the free-text fields in
 * nodes.json (address, enclosure, extra, townsNote, ponGroups.note, gallery
 * labels) are untranslated so far — see CLAUDE.md's "Language" convention for
 * the plan to bring content.json's prose and those per-node fields in too.
 *
 * One object per locale, both satisfying the same interface, so a missing
 * translation is a compile error rather than a silent fallback to Spanish.
 * Icons/symbols (▶ ◀ ✕ ⛶ ⚠ ◉ ○ ⌂ ↗ ⇄ 📍 🚶) stay in the markup that calls
 * this module, matching how they were already handled before English existed
 * — only the words around them come from here.
 */

export type Locale = 'es' | 'en';

interface UiStrings {
  meta: {
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
  };
  nav: {
    viz: string;
    map: string;
    nodes: string;
    architecture: string;
    actions: string;
    phases: string;
    menuSrOnly: string;
  };
  footer: {
    independentBold: string;
    independentRest: string;
    source: string;
  };
  shared: {
    walkLabel: string;
    walkNote: string;
    actionsAffecting: string;
    close: string;
    exit: string;
    fullscreenTitle: string;
  };
  hero: {
    titleLead: string;
    titleWave: string;
    sub: string;
    disclaimerBold: string;
    disclaimerRest: string;
  };
  architecture: {
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
  };
  actions: {
    eyebrow: string;
    heading: string;
    lead: string;
    fixed: string;
    variable: string;
  };
  phases: {
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
  };
  nodeGrid: {
    eyebrow: string;
    heading: string;
    lead: string;
    altPlano: (name: string) => string;
    paoPhase1: string;
    weekAbbrev: string;
    interiorFlag: string;
  };
  map: {
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
  };
  diagram: {
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
  };
  nodeModal: {
    interiorBadge: string;
    placeholderAlt: string;
    permalink: string;
  };
  lightbox: {
    ariaLabel: string;
    openOriginal: string;
    prevAria: string;
    nextAria: string;
    thumbsAria: string;
    help: string;
  };
  viewer3d: {
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
  };
  fullscreenViewer: {
    ariaLabel: string;
  };
  affectedNodes: {
    label: string;
  };
  nodeDetail: {
    backLink: string;
    oltHeading: string;
    remainingPlans: string;
  };
}

const es: UiStrings = {
  meta: {
    defaultDescription:
      'Visor divulgativo de la renovación GPON → XGS-PON de la Red Asturcón, la red pública FTTH de Asturias, según el pliego CON 06/2025 de GIT. Proyecto independiente.',
    homeTitle: 'Potru · GPON → XGS-PON · Renovación FTTH de la Red Asturcón (CON 06/2025)',
    nodeTitle: (name) => `${name} · Potru · renovación GPON → XGS-PON`,
    paoDescription: (name, enclosure) =>
      `${name}: punto de acceso de operadores de la Red Asturcón. ${enclosure}`,
    nodeDescription: ({ name, area, olts, onts, weekFrom, weekTo }) =>
      `Nodo ${name} (área ${area}): ${olts} OLT y ${onts} ONT en servicio, migración prevista en las semanas ${weekFrom}–${weekTo} de la Fase 2 del pliego CON 06/2025.`,
  },
  nav: {
    viz: 'Red en vivo',
    map: 'Mapa',
    nodes: 'Nodos',
    architecture: 'Arquitectura',
    actions: 'Actuaciones',
    phases: 'Fases',
    menuSrOnly: 'Menú',
  },
  footer: {
    independentBold: 'Proyecto independiente',
    independentRest:
      ', no afiliado a GIT ni al Principado de Asturias · fuente: pliego público CON 06/2025',
    source:
      'Fuente: Pliego de Condiciones Técnicas · EXPTE CON 06/2025 · aprobado 22-12-2025 · Datos, planos y calendario extraídos del propio pliego',
  },
  shared: {
    walkLabel: 'Recorrer el interior en 3D',
    walkNote: 'simulación generada a partir de planta y alzados',
    actionsAffecting: 'Actuaciones del contrato que afectan a este nodo',
    close: 'Cerrar',
    exit: 'Salir',
    fullscreenTitle: 'Pantalla completa',
  },
  hero: {
    titleLead: 'La Red Asturcón cambia de',
    titleWave: '(longitud de) onda',
    sub: 'Renovación completa del equipamiento electrónico FTTH de la Red Asturcón: 20 nodos primarios pasan de OLT Alcatel 7342 y Ericsson BLM 1500 a una nueva generación dual GPON/XGS-PON, con nuevos enrutadores, nuevo sistema de gestión y migración ordenada de todos los usuarios.',
    disclaimerBold: 'Datos, cifras y planos sacados del pliego',
    disclaimerRest:
      ' de condiciones técnicas del expediente CON 06/2025 (GITPA) · Potru es un proyecto independiente, no afiliado a GIT ni al Principado de Asturias',
  },
  architecture: {
    eyebrow: 'Situación de partida',
    heading: 'Arquitectura actual de la Red Asturcón',
    lead: 'Red FTTH pública, neutra y mayorista, operada por GIT desde 2004 para llevar banda ancha donde la iniciativa privada no despliega. Los operadores minoristas prestan sus servicios (HSI, TVoIP, VoD, VoIP, CATV en RF y telefonía POTS) sobre una misma ONT, con conectividad transparente hasta el PAO.',
    ontHeading: 'Parque de ONT en producción',
    ontSub:
      'La heterogeneidad y antigüedad del parque motiva el suministro de hasta 7.000 ONT GPON nuevas en la parte variable del contrato.',
    techEyebrow: 'La tecnología',
    techHeading: 'Dos generaciones sobre el mismo hilo',
    spectrumAria: 'Ocupación del espectro sobre una misma fibra, con las bandas GPON y XGS-PON',
    fsGroupLabel: 'Pantalla completa del espectro',
    fsBtnLabel: 'Ver el espectro a pantalla completa',
  },
  actions: {
    eyebrow: 'Objeto del contrato',
    heading: 'Actuaciones previstas',
    lead: 'Parte fija llave en mano de alcance cerrado + parte variable activada según necesidades. Cada actuación indica los nodos a los que afecta: pulsa un nombre para abrir su ficha.',
    fixed: 'Parte fija',
    variable: 'Parte variable',
  },
  phases: {
    eyebrow: 'Ejecución',
    heading: 'Tres fases, migración secuencial',
    lead: 'Nada se corta hasta superar todas las pruebas de conformidad, y cada nodo dispone de procedimiento de retorno a la situación anterior.',
    phase1Heading: 'Fase 1 · Instalación inicial y pruebas',
    phase1Dur: 'SEMANAS 1–12',
    phase1Body:
      'Replanteo conjunto, instalación de los 2 enrutadores (PAO Gijón y Mieres), nodo de pruebas en GIT Oviedo, nuevos gestores de elementos y adaptación de los OSS. Pruebas de compatibilidad con las ONT en producción, conformidad de ONT GPON y XGS-PON nuevas y de la combinación GPON/XGS-PON. Formación de hasta 15 personas (mín. 25 h). Superar todas las pruebas es condición indispensable para continuar.',
    phase2Heading: 'Fase 2 · Despliegue y migración de los 20 nodos',
    phase2Dur: 'SEMANAS 13–58 · 46 SEMANAS',
    phase2Body:
      'Instalación del nuevo equipamiento nodo a nodo, comenzando por Muros de Nalón como piloto y siguiendo por los nodos cabecera de cada área. GIT migra a los usuarios; el adjudicatario suministra las ONT GPON de sustitución y los repuestos. La duración por nodo depende de las ONT en servicio:',
    nt1: '5 semanas · 3 instalación + 2 migración',
    nt2: '7 semanas · 4 instalación + 3 migración',
    nt3: '8 semanas · 4 instalación + 4 migración',
    calendarHeading: 'Calendario de migración por nodo',
    calendarNote: '(planificación inicial · pulsa una barra)',
    ganttAria: 'Gantt de migración de nodos',
    ganttNote:
      'Cada barra cubre desde el replanteo hasta el fin de la migración de usuarios del nodo, según el pliego. Colores por área geográfica.',
    phase3Heading: 'Fase 3 · Seguimiento del contrato',
    phase3Dur: 'SOLAPADA CON FASE 2 → FIN DE CONTRATO',
    phase3Body:
      'Activación de la parte variable: licencias de uso, servicio de reparación y sustitución de averías, hasta 5 nodos nuevos, ampliaciones de capacidad, consultas y asesoramiento técnico de nivel 3, y suministro de ONT GPON adicionales y ONT XGS-PON.',
  },
  nodeGrid: {
    eyebrow: 'Ficha por nodo',
    heading: 'Los 20 nodos, uno a uno',
    lead: 'Cada ficha reúne los datos del pliego: plano de ubicación oficial de GIT, equipamiento OLT en producción, ONT en servicio y semanas previstas de renovación (planificación inicial, referida a la firma del contrato). La barra inferior de cada tarjeta sitúa su ventana dentro de las 46 semanas de la Fase 2.',
    altPlano: (name) => `Plano de ${name}`,
    paoPhase1: 'PAO · Fase 1',
    weekAbbrev: 'sem',
    interiorFlag: 'INTERIOR',
  },
  map: {
    eyebrow: 'Territorio',
    heading: '7 áreas geográficas · 20 nodos primarios · 9 secundarios pasivos',
    lead: 'La red está presente en 24 de los 78 concejos asturianos. Los círculos sólidos son nodos primarios (con OLT a renovar); los huecos, nodos secundarios: emplazamientos sin electrónica, solo con repartidores ópticos pasivos colgados de un primario por fibra — la renovación no actúa en ellos. Los puntos pequeños son las poblaciones servidas desde cada nodo. Pulsa cualquier nodo para su ficha o inicia el paseo guiado.',
    tourStart: 'Iniciar paseo por la red',
    townsVisible: 'Poblaciones servidas: visibles',
    townsHidden: 'Poblaciones servidas: ocultas',
    legendOwn: 'Fibra propia (p. ej. Cudillero–Vegadeo, Autovía Minera)',
    legendRented: 'Fibra alquilada + CWDM (p. ej. Cudillero–Gijón, suroriente)',
    mapAria: 'Mapa esquemático de los nodos de la Red Asturcón',
    fsGroupLabel: 'Pantalla completa del mapa',
    fsBtnLabel: 'Ver el mapa a pantalla completa',
    zoomGroupLabel: 'Zoom del mapa',
    zoomInLabel: 'Acercar el mapa',
    zoomInTitle: 'Acercar',
    zoomOutLabel: 'Alejar el mapa',
    zoomOutTitle: 'Alejar',
    cableOpen: 'Ver los cables por dentro',
    cableClose: 'Ocultar los cables',
    cableZoomGroupLabel: 'Zoom del detalle',
    cableZoomInLabel: 'Acercar el detalle',
    cableZoomOutLabel: 'Alejar el detalle',
    cableFsLabel: 'Ver el detalle a pantalla completa',
    tourPrev: 'Anterior',
    tourNext: 'Siguiente',
    tourEnter: 'Entrar en el nodo',
    tourExit: 'Salir del paseo',
    tourStepOf: (i, total) => `Paseo por la red · parada ${i} de ${total}`,
    tourFinish: 'Terminar ✓',
    tourResume: 'Reanudar el paseo',
  },
  diagram: {
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
  },
  nodeModal: {
    interiorBadge: 'VISTA INTERIOR · PLANOS DEL PLIEGO',
    placeholderAlt: 'Plano del nodo',
    permalink: 'Abrir la ficha completa',
  },
  lightbox: {
    ariaLabel: 'Plano a tamaño completo',
    openOriginal: 'Abrir el original',
    prevAria: 'Plano anterior',
    nextAria: 'Plano siguiente',
    thumbsAria: 'Planos del nodo',
    help: 'PULSA el plano para verlo a tamaño real · ARRASTRA para moverte · ← → para cambiar de plano · ESC para salir',
  },
  viewer3d: {
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
  },
  fullscreenViewer: {
    ariaLabel: 'Vista ampliada',
  },
  affectedNodes: {
    label: 'Nodos afectados:',
  },
  nodeDetail: {
    backLink: 'Volver a los 20 nodos',
    oltHeading: 'Equipamiento OLT en producción',
    remainingPlans: 'Resto de planos del pliego',
  },
};

const en: UiStrings = {
  meta: {
    defaultDescription:
      "Explanatory viewer of the Red Asturcón's GPON to XGS-PON renewal, the public FTTH network of Asturias, per pliego CON 06/2025 by GIT. Independent project.",
    homeTitle: 'Potru · GPON → XGS-PON · Red Asturcón FTTH Renewal (CON 06/2025)',
    nodeTitle: (name) => `${name} · Potru · GPON → XGS-PON renewal`,
    paoDescription: (name, enclosure) =>
      `${name}: the Red Asturcón's operator access point. ${enclosure}`,
    nodeDescription: ({ name, area, olts, onts, weekFrom, weekTo }) =>
      `${name} node (area ${area}): ${olts} OLT and ${onts} ONT in service, renewal planned for weeks ${weekFrom}–${weekTo} of pliego CON 06/2025's Phase 2.`,
  },
  nav: {
    viz: 'Network live',
    map: 'Map',
    nodes: 'Nodes',
    architecture: 'Architecture',
    actions: 'Actions',
    phases: 'Phases',
    menuSrOnly: 'Menu',
  },
  footer: {
    independentBold: 'Independent project',
    independentRest:
      ', not affiliated with GIT or the Principality of Asturias · source: public pliego CON 06/2025',
    source:
      'Source: the Pliego de Condiciones Técnicas · EXPTE CON 06/2025 · approved 22-12-2025 · figures, drawings and schedule are taken from the pliego itself',
  },
  shared: {
    walkLabel: 'Walk through the interior in 3D',
    walkNote: 'simulation generated from the floor plan and elevations',
    actionsAffecting: 'Contract actions affecting this node',
    close: 'Close',
    exit: 'Exit',
    fullscreenTitle: 'Fullscreen',
  },
  hero: {
    titleLead: 'The Red Asturcón is changing',
    titleWave: 'wavelength',
    sub: "Complete renewal of the Red Asturcón's FTTH electronics: the 20 primary nodes move from Alcatel 7342 and Ericsson BLM 1500 OLTs to a new dual GPON/XGS-PON generation, with new routers, a new management system and an orderly migration of every user.",
    disclaimerBold: 'Data, figures and drawings taken from the pliego',
    disclaimerRest:
      ' de condiciones técnicas (file CON 06/2025, GITPA) · Potru is an independent project, not affiliated with GIT or the Principality of Asturias',
  },
  architecture: {
    eyebrow: 'Starting point',
    heading: 'Current architecture of the Red Asturcón',
    lead: "A public, neutral, wholesale FTTH network, operated by GIT since 2004 to bring broadband where private operators don't deploy. Retail operators run their services (HSI, TVoIP, VoD, VoIP, RF CATV and POTS telephony) over the same ONT, with transparent connectivity through to the PAO.",
    ontHeading: 'ONT fleet in service',
    ontSub:
      "The fleet's age and variety is why the contract's variable part supplies up to 7,000 new GPON ONTs.",
    techEyebrow: 'The technology',
    techHeading: 'Two generations on the same strand',
    spectrumAria: 'Spectrum occupancy on the same fibre, with the GPON and XGS-PON bands',
    fsGroupLabel: 'Fullscreen view of the spectrum',
    fsBtnLabel: 'View the spectrum in fullscreen',
  },
  actions: {
    eyebrow: 'Purpose of the contract',
    heading: 'Planned actions',
    lead: 'A closed-scope, turnkey fixed part plus a variable part activated as needed. Each action lists the nodes it affects: click a name to open its record.',
    fixed: 'Fixed part',
    variable: 'Variable part',
  },
  phases: {
    eyebrow: 'Execution',
    heading: 'Three phases, sequential migration',
    lead: 'Nothing is cut over until every conformity test passes, and every node has a rollback procedure to the previous situation.',
    phase1Heading: 'Phase 1 · Initial installation and testing',
    phase1Dur: 'WEEKS 1–12',
    phase1Body:
      'Joint site survey, installation of the 2 routers (PAO Gijón and Mieres), a test node at GIT Oviedo, new element managers and OSS adaptation. Compatibility tests with the ONTs in service, conformity of the new GPON and XGS-PON ONTs and of the combined GPON/XGS-PON setup. Training for up to 15 people (min. 25 h). Passing every test is a prerequisite to continue.',
    phase2Heading: 'Phase 2 · Rollout and migration of the 20 nodes',
    phase2Dur: 'WEEKS 13–58 · 46 WEEKS',
    phase2Body:
      "Installation of the new equipment node by node, starting with Muros de Nalón as the pilot and continuing with each area's lead node. GIT migrates the users; the contractor supplies the replacement GPON ONTs and spares. Duration per node depends on the ONTs in service:",
    nt1: '5 weeks · 3 installation + 2 migration',
    nt2: '7 weeks · 4 installation + 3 migration',
    nt3: '8 weeks · 4 installation + 4 migration',
    calendarHeading: 'Node-by-node migration schedule',
    calendarNote: '(initial planning · click a bar)',
    ganttAria: 'Node migration Gantt chart',
    ganttNote:
      "Each bar spans from the site survey to the end of that node's user migration, per the pliego. Colours by geographic area.",
    phase3Heading: 'Phase 3 · Contract follow-up',
    phase3Dur: 'OVERLAPS PHASE 2 → END OF CONTRACT',
    phase3Body:
      'Activation of the variable part: usage licences, fault repair and replacement service, up to 5 new nodes, capacity expansions, level-3 technical consultation and advice, and supply of additional GPON ONTs and XGS-PON ONTs.',
  },
  nodeGrid: {
    eyebrow: 'Record per node',
    heading: 'The 20 nodes, one by one',
    lead: "Each record gathers the pliego's data: GIT's official location plan, the OLT equipment in service, the ONTs in service, and the planned renewal weeks (initial planning, dated from contract signature). The bar at the foot of each card places its window within Phase 2's 46 weeks.",
    altPlano: (name) => `Plan of ${name}`,
    paoPhase1: 'PAO · Phase 1',
    weekAbbrev: 'wk',
    interiorFlag: 'INDOOR',
  },
  map: {
    eyebrow: 'Territory',
    heading: '7 geographic areas · 20 primary nodes · 9 passive secondary nodes',
    lead: "The network reaches 24 of Asturias's 78 municipalities (concejos). Solid circles are primary nodes (with an OLT to renew); hollow ones are secondary nodes: sites with no electronics, only passive optical splitters hung off a primary node by fibre — the renewal doesn't touch them. The small dots are the towns served from each node. Click any node for its record, or start the guided tour.",
    tourStart: 'Start the network tour',
    townsVisible: 'Towns served: visible',
    townsHidden: 'Towns served: hidden',
    legendOwn: 'Own fibre (e.g. Cudillero–Vegadeo, Autovía Minera)',
    legendRented: 'Leased fibre + CWDM (e.g. Cudillero–Gijón, south-east)',
    mapAria: "Schematic map of the Red Asturcón's nodes",
    fsGroupLabel: 'Fullscreen view of the map',
    fsBtnLabel: 'View the map in fullscreen',
    zoomGroupLabel: 'Map zoom',
    zoomInLabel: 'Zoom into the map',
    zoomInTitle: 'Zoom in',
    zoomOutLabel: 'Zoom out of the map',
    zoomOutTitle: 'Zoom out',
    cableOpen: 'See inside the cables',
    cableClose: 'Hide the cables',
    cableZoomGroupLabel: 'Detail zoom',
    cableZoomInLabel: 'Zoom into the detail',
    cableZoomOutLabel: 'Zoom out of the detail',
    cableFsLabel: 'View the detail in fullscreen',
    tourPrev: 'Previous',
    tourNext: 'Next',
    tourEnter: 'Enter the node',
    tourExit: 'Exit the tour',
    tourStepOf: (i, total) => `Network tour · stop ${i} of ${total}`,
    tourFinish: 'Finish ✓',
    tourResume: 'Resume the tour',
  },
  diagram: {
    eyebrow: 'Immersive visualization',
    heading: "From the user's living room to the Gijón PAO",
    lead: "The network's full chain: ONT → passive access network (1:16 and 1:4 splitters) → primary node with OLT → trunk network → operator access point. Switch between the current and renewed network, and click each element to learn its role.",
    modeGroupLabel: 'Network state',
    modeCurrent: 'CURRENT NETWORK · GPON',
    modeRenewed: 'RENEWED NETWORK · GPON/XGS-PON',
    diagramAria: 'Diagram of the Red Asturcón',
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
  },
  nodeModal: {
    interiorBadge: 'INTERIOR VIEW · PLIEGO DRAWINGS',
    placeholderAlt: 'Node plan',
    permalink: 'Open the full record',
  },
  lightbox: {
    ariaLabel: 'Plan at full size',
    openOriginal: 'Open the original',
    prevAria: 'Previous plan',
    nextAria: 'Next plan',
    thumbsAria: "Node's plans",
    help: 'CLICK the plan to view it at full size · DRAG to pan · ← → to change plan · ESC to exit',
  },
  viewer3d: {
    warnToggleTitle: 'Notice about this recreation',
    warnToggleLabel: 'Notice',
    modeRenewed: 'View renewed',
    modeCurrent: 'View current',
    warnClose: 'Close the notice',
    warnText:
      "TO-SCALE RECREATION — the room, the door and each cabinet's position are taken from the pliego's floor plan; the number of OLTs, their cards and their GPON ports, from the equipment tables; and what's silkscreened on each rack — manufacturer, model, code and card set — from those same sources. The finishes, the colours and the equipment's appearance remain interpretation no matter how much the render has improved: knowing an OLT is an Alcatel 7342 is not having a photo of an Alcatel 7342, and the pliego doesn't include one. This is not a photograph or a real model of the node.",
    watermark: 'simulation · not a real image',
    help: 'DRAG to look around · W A S D / arrow keys to move · WHEEL or PINCH to zoom',
    zoomGroupLabel: 'View zoom',
    zoomInTitle: 'Zoom in',
    zoomOutTitle: 'Zoom out',
    legendToggleTitle: 'Room equipment',
    loading: 'LOADING ROOM…',
    svTitlePrefix: 'Simulated interior · ',
    loadError: "Couldn't load the 3D engine (no connection?)",
  },
  fullscreenViewer: {
    ariaLabel: 'Enlarged view',
  },
  affectedNodes: {
    label: 'Nodes affected:',
  },
  nodeDetail: {
    backLink: 'Back to the 20 nodes',
    oltHeading: 'OLT equipment in service',
    remainingPlans: "Rest of the pliego's plans",
  },
};

const DICTS: Record<Locale, UiStrings> = { es, en };

/** Resolves the UI-chrome dictionary for a locale. Defaults to Spanish for
 *  any caller that hasn't threaded a locale through yet. */
export function ui(locale: Locale = 'es'): UiStrings {
  return DICTS[locale];
}
