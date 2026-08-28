import type { PhasesStrings } from '../types';

export const phases: PhasesStrings = {
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
};
