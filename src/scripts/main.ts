/**
 * Home page entry point and composition root: starts every island in
 * dependency order and wires the elements the build already rendered (node
 * cards, action links and gantt bars) to the modal.
 *
 * The map and the tour used to rely on map.ts being *imported* before
 * tour.ts, enforced only by a comment. initTour() now takes the map's svg/TR
 * as an explicit argument, so that ordering is a compile-time requirement
 * instead — get it wrong here and TypeScript, not a runtime bug report,
 * catches it.
 */
import { DOM } from '../lib/dom-ids';
import { initHeroFiber } from './hero-fiber';
import { initDiagram } from './diagram';
import { initOntBars } from './ont-bars';
import { initModal } from './modal';
import { initMap } from './map';
import { initTour } from './tour';
import { initWalk } from './walk';
import { initLightbox } from './lightbox';
import { initNavSpy } from './navspy';
import { initFullscreen } from './fullscreen';

initHeroFiber();
initDiagram();
initOntBars();
initWalk();
initLightbox();
initNavSpy();
initFullscreen();

const { openNode } = initModal();
const map = initMap(openNode);
initTour({ svg: map.svg, TR: map.TR, openNode });

/* Cards and links are real anchors to /nodos/<id> so they work without JS;
   with JS the modal wins, since it keeps the visitor on the home page. */
document.querySelectorAll<HTMLAnchorElement>('a[data-node]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    openNode(a.dataset.node!);
  });
});

/* Phase 2 gantt: drawn at build time, it only gets click and hover here. */
document.querySelectorAll<SVGGElement>(`#${DOM.gantt} g[data-node]`).forEach((g) => {
  const bar = g.querySelector('rect')!;
  g.addEventListener('click', () => openNode(g.dataset.node!));
  g.addEventListener('mouseenter', () => bar.setAttribute('opacity', '1'));
  g.addEventListener('mouseleave', () => bar.setAttribute('opacity', '0.85'));
});
/* Its mobile-list stand-in (ganttList in graphics.ts): same click-to-open,
   no hover state to wire since touch has none. */
document.querySelectorAll<HTMLElement>(`#${DOM.ganttList} [data-node]`).forEach((row) => {
  row.addEventListener('click', () => openNode(row.dataset.node!));
});
