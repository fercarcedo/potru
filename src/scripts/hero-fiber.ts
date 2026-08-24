/**
 * Animated fibres in the hero. Purely decorative: three paths with pulses
 * travelling along them. The global prefers-reduced-motion rule silences the
 * animation.
 */
import { DOM } from '../lib/dom-ids';
import { svgEl } from './svg';

export function initHeroFiber() {
  const svg = document.getElementById(DOM.heroFiber)!;
  /* Each pulse starts at its own path's own starting point (paths[i][0]) —
     an svgEl('circle', …) with no cx/cy set defaults to the SVG origin
     (0,0), the top-left corner of the whole hero, right under the sticky
     nav. Every circle whose animateMotion hasn't reached its own `begin`
     yet used to sit stacked there, in the fully-saturated brand colours,
     until its motion timeline kicked in — visible for real (several
     seconds, not one frame) since begin is staggered, and reported as a
     "green mark below the header" that only went away once something (a
     scroll, a repaint) nudged a stalled SMIL timeline into starting. */
  const paths: [d: string, start: [number, number]][] = [
    ['M-50,480 C300,430 500,520 780,410 S1200,300 1460,340', [-50, 480]],
    ['M-50,530 C350,500 600,590 900,470 S1250,380 1460,420', [-50, 530]],
    ['M-50,420 C250,380 520,450 820,350 S1220,240 1460,270', [-50, 420]],
  ];
  const colors = ['var(--gpon)', 'var(--xgs)', 'var(--xgs)'];
  paths.forEach(([d, [x0, y0]], i) => {
    svgEl(
      'path',
      { d, fill: 'none', stroke: colors[i]!, 'stroke-width': '1.2', opacity: '.25' },
      svg,
    );
    for (let k = 0; k < 2; k++) {
      const c = svgEl('circle', { r: '3', cx: x0, cy: y0, fill: colors[i]! }, svg);
      svgEl(
        'animateMotion',
        { dur: 7 + i * 2 + 's', repeatCount: 'indefinite', begin: k * 3.5 + i + 's', path: d },
        c,
      );
    }
  });
}
