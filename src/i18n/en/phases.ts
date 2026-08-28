import type { PhasesStrings } from '../types';

export const phases: PhasesStrings = {
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
};
