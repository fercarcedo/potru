/**
 * Runs once, after every trunk/node/town/PAO element is already in the map's
 * <svg>: measures every fixed obstacle and every trunk's path, then places
 * each .lbl-node/.lbl-sec/.lbl-town label near its own dot with
 * label-placement.ts's solver, adding a leader line when a label had to
 * move far from its dot.
 *
 * Every name is written next to its dot, and the dots are where the pliego
 * puts them, so the defaults collide: «Pol. de Coaña» landed on «Navia»,
 * «Tapia de Casariego» ran through Navia's marker, «Oyanco» sat on Moreda.
 * This pass keeps each label as drawn if that spot is clear and otherwise
 * walks a ring of positions around its own dot, anchoring the text away from
 * the dot when it goes to the side. Markers and the fixed captions count as
 * obstacles too, not just other labels. Node names are placed first, so the
 * small print yields to them, and a label that ends up far from its dot gets
 * a leader line.
 *
 * Split out of map.ts's initMap() verbatim. label-placement.ts's solver is
 * pure and lives in its own file so it is unit-testable without a renderer
 * (see that file); this half — walking the live SVG to measure obstacles —
 * cannot be, so it stays a thin DOM harness here instead.
 */
import { box, placeLabel } from '../label-placement';
import type { Anchor, Candidate, Measurement, Rect } from '../label-placement';
import { svgEl } from '../svg';

export function placeMapLabels(svg: SVGSVGElement): void {
  /* markers, the PAO square and the fixed captions are all immovable */
  const obstacles: Rect[] = [];
  const cables: Rect[] = [];
  for (const c of svg.querySelectorAll('circle')) {
    const r = +c.getAttribute('r')!;
    if (r < 2 || c.querySelector('animate')) continue;   /* not the pulse halo */
    const cx = +c.getAttribute('cx')!, cy = +c.getAttribute('cy')!;
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;  /* the travelling pulse */
    obstacles.push({ x: cx - r, y: cy - r, w: r * 2, h: r * 2 });
  }
  /* The trunks and the shared-PON loop are drawn thick enough that a name
     lying across one reads as a caption for the cable rather than for its
     dot — «Sevares» did exactly that. They are only a tie-breaker, though:
     among the spots that are genuinely clear, the one that also stays off
     the cables and closest to home wins. Treating them as hard obstacles
     flung the names half a map away. */
  for (const path of svg.querySelectorAll('path')) {
    const len = path.getTotalLength?.() ?? 0;
    const sw = +(path.getAttribute('stroke-width') ?? '0');
    if (!len || sw < 1) continue;
    for (let d = 0; d <= len; d += 5) {
      const q = path.getPointAtLength(d);
      cables.push({ x: q.x - 1.6, y: q.y - 1.6, w: 3.2, h: 3.2 });
    }
  }
  for (const t of svg.querySelectorAll('text'))
    if (!t.getAttribute('class')?.startsWith('lbl-')) obstacles.push(box(t.getBBox()));
  for (const q of svg.querySelectorAll('rect'))
    obstacles.push(box({
      x: +q.getAttribute('x')!, y: +q.getAttribute('y')!,
      width: +q.getAttribute('width')!, height: +q.getAttribute('height')!,
    }, 3));

  const leaders = svgEl('g', {}, svg);

  for (const cls of ['.lbl-node', '.lbl-sec', '.lbl-town'])
    for (const el of svg.querySelectorAll<SVGTextElement>(cls)) {
      const ax = +el.dataset.ax!, ay = +el.dataset.ay!, ar = +el.dataset.ar!;
      /* a label may of course sit against its own dot */
      const others = obstacles.filter(
        (o) => !(ax > o.x && ax < o.x + o.w && ay > o.y && ay < o.y + o.h));
      const home: Candidate = [
        +el.getAttribute('x')! - ax, +el.getAttribute('y')! - ay,
        el.getAttribute('text-anchor') as Anchor,
      ];

      const result = placeLabel({
        ax, ay, ar,
        home,
        obstacles: others,
        cables,
        measure: (dx, dy, anc): Measurement => {
          el.setAttribute('x', String(ax + dx)); el.setAttribute('y', String(ay + dy));
          el.setAttribute('text-anchor', anc);
          const raw = el.getBBox();
          return { raw: { x: raw.x, y: raw.y, w: raw.width, h: raw.height }, padded: box(raw) };
        },
      });

      el.setAttribute('x', String(ax + result.dx)); el.setAttribute('y', String(ay + result.dy));
      el.setAttribute('text-anchor', result.anchor);
      obstacles.push(result.box);

      if (result.needsLeader) {
        const { x: px, y: py } = result.leaderTarget;
        const k = (ar + 2.5) / result.gap;
        svgEl('line', {
          x1: ax + (px - ax) * k, y1: ay + (py - ay) * k,
          x2: ax + (px - ax) * 0.94, y2: ay + (py - ay) * 0.94,
          stroke: '#5a6f8d', 'stroke-width': '.7', opacity: '.5',
        }, leaders);
      }
    }
}
