/**
 * Guided tour of the network: it frames the map, highlights trunks and opens
 * the cable detail, one stop at a time. The stops themselves — framing,
 * trunks, node and copy — are pliego-derived content and live in
 * content.json (TOUR_STOPS); the detail panels arrive already drawn from the
 * build (src/lib/details.ts, keyed by the same stop id). This module owns
 * neither: it only drives them.
 *
 * Takes the map's svg/TR and the modal's openNode as explicit dependencies —
 * initMap() and initModal() must run first, but that is now main.ts's call
 * order to get right, not an import-order comment.
 */
import { TOUR_STOPS, byId } from '../lib/data';
import { DOM } from '../lib/dom-ids';
import { readViewBox, type ViewBox } from './map/viewport';
import { svgEl } from './svg';

export interface TourDeps {
  svg: SVGSVGElement;
  TR: Record<string, SVGElement>;
  openNode: (id: string, view?: number) => void;
}

export function initTour({ svg, TR, openNode }: TourDeps) {
  const panel = document.getElementById(DOM.tourPanel)!;
  const btnStart = document.getElementById(DOM.tourStart)!;
  const tpStep = document.getElementById(DOM.tpStep)!,
    tpTitle = document.getElementById(DOM.tpTitle)!,
    tpText = document.getElementById(DOM.tpText)!,
    tpPrev = document.getElementById(DOM.tpPrev)!,
    tpNext = document.getElementById(DOM.tpNext)!,
    tpEnter = document.getElementById(DOM.tpEnter)!,
    tpExit = document.getElementById(DOM.tpExit)!;
  const HOME: [number, number, number, number] = [0, 0, 1160, 470];
  const tpDetBtn = document.getElementById(DOM.tpDetBtn)!,
    tpDet = document.getElementById(DOM.tpDet)!;
  tpDetBtn.onclick = () => {
    const open = tpDet.style.display !== 'none';
    tpDet.style.display = open ? 'none' : 'block';
    tpDetBtn.textContent = open ? '■■ Ver los cables por dentro' : '■■ Ocultar los cables';
  };
  let idx = -1,
    animId: number | null = null,
    pulses: SVGElement[] = [];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setVB(target: Readonly<ViewBox>) {
    if (animId) cancelAnimationFrame(animId);
    const cur = readViewBox(svg);
    if (reduced) {
      svg.setAttribute('viewBox', target.join(' '));
      return;
    }
    const t0 = performance.now(),
      D = 700;
    function f(t: number) {
      const k = Math.min((t - t0) / D, 1),
        e = 1 - Math.pow(1 - k, 3);
      /* the four numbers by name rather than by a running index: a viewBox
         is a fixed shape, and indexing it by a variable is what made the
         compiler unsure the far side had a value at all */
      const at = (from: number, to: number) => from + (to - from) * e;
      svg.setAttribute(
        'viewBox',
        [
          at(cur[0], target[0]),
          at(cur[1], target[1]),
          at(cur[2], target[2]),
          at(cur[3], target[3]),
        ].join(' '),
      );
      if (k < 1) animId = requestAnimationFrame(f);
    }
    animId = requestAnimationFrame(f);
  }
  function clearPulses() {
    pulses.forEach((p) => p.remove());
    pulses = [];
  }
  function highlight(ids: string[]) {
    Object.entries(TR).forEach(([k, el]) => {
      if (k.endsWith('_lbl')) {
        el.setAttribute('opacity', ids.includes(k.replace('_lbl', '')) ? '1' : '.55');
        return;
      }
      const on = ids.includes(k);
      el.setAttribute('opacity', on ? '.95' : '.22');
      el.setAttribute('stroke-width', on ? '3.4' : '2.2');
    });
    clearPulses();
    if (!reduced)
      ids.forEach((id) => {
        const path = TR[id];
        if (!path) return;
        const c = svgEl('circle', { r: '3.6', fill: path.getAttribute('stroke')! }, svg);
        svgEl(
          'animateMotion',
          { dur: '3.4s', repeatCount: 'indefinite', path: path.getAttribute('d')! },
          c,
        );
        pulses.push(c);
      });
  }
  function show(i: number) {
    idx = i;
    const s = TOUR_STOPS[i]!;
    panel.classList.add('open');
    tpStep.textContent = `Paseo por la red · parada ${i + 1} de ${TOUR_STOPS.length}`;
    tpTitle.textContent = s.title;
    tpText.textContent = s.text;
    /* the 9 panels are already in the DOM from the build: reveal this stop's */
    const det = tpDet.querySelector<HTMLElement>(`[data-det="${s.id}"]`);
    tpDet.querySelectorAll<HTMLElement>('[data-det]').forEach((d) => {
      d.hidden = d !== det;
    });
    tpDet.style.display = 'none';
    tpDetBtn.style.display = det ? 'inline-block' : 'none';
    tpDetBtn.textContent = '■■ Ver los cables por dentro';
    (tpPrev as HTMLButtonElement).disabled = i === 0;
    tpNext.textContent = i === TOUR_STOPS.length - 1 ? 'Terminar ✓' : 'Siguiente ▶';
    tpEnter.style.display = s.node && byId[s.node]!.gallery.length > 1 ? 'inline-block' : 'none';
    if (s.node) tpEnter.onclick = () => openNode(s.node!, 1);
    tpEnter.textContent = '⌂ Entrar en el nodo';
    setVB(s.viewBox);
    highlight(s.trunks);
    panel.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
  }
  function exitTour() {
    panel.classList.remove('open');
    idx = -1;
    setVB(HOME);
    highlight([]);
    clearPulses();
    Object.entries(TR).forEach(([k, el]) => {
      if (!k.endsWith('_lbl')) {
        el.setAttribute('opacity', '.55');
        el.setAttribute('stroke-width', '2.2');
      } else {
        el.setAttribute('opacity', '1');
      }
    });
    btnStart.textContent = '▶ Reanudar el paseo';
  }
  btnStart.onclick = () => show(idx >= 0 && idx < TOUR_STOPS.length ? idx : 0);
  tpPrev.onclick = () => show(Math.max(0, idx - 1));
  tpNext.onclick = () => {
    if (idx === TOUR_STOPS.length - 1) exitTour();
    else show(idx + 1);
  };
  tpExit.onclick = exitTour;
}
