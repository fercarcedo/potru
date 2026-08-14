/**
 * Home page entry point: starts the islands and wires the elements the build
 * already rendered (node cards, action links and gantt bars) to the modal.
 */
import './hero-fiber';
import './diagram';
import './ont-bars';
import './map'; // the map has to exist before the tour
import './tour';
import { openNode } from './modal';

/* Cards and links are real anchors to /nodos/<id> so they work without JS;
   with JS the modal wins, since it keeps the visitor on the home page. */
document.querySelectorAll<HTMLAnchorElement>('a[data-node]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    openNode(a.dataset.node!);
  });
});

/* Phase 2 gantt: drawn at build time, it only gets click and hover here. */
document.querySelectorAll<SVGGElement>('#gantt g[data-node]').forEach((g) => {
  const bar = g.querySelector('rect')!;
  g.addEventListener('click', () => openNode(g.dataset.node!));
  g.addEventListener('mouseenter', () => bar.setAttribute('opacity', '1'));
  g.addEventListener('mouseleave', () => bar.setAttribute('opacity', '0.85'));
});
