/**
 * Schematic map: trunks (own ones solid, leased ones dashed) with an ambient
 * pulse, primary and secondary nodes, the towns each one serves, and the loop
 * around the shared PON tree in Llanes.
 *
 * initMap() builds it and returns the <svg> and the trunk index so the tour
 * (tour.ts) can frame and highlight; it needs openNode to wire node clicks,
 * which main.ts gets from initModal() and passes in — an explicit dependency
 * in place of the legacy's window.__map and the "import map.ts before
 * tour.ts" ordering this used to rely on silently.
 */
import { HOST_ONLY, NODES, byId, ontCount } from '../lib/data';
import { DOM } from '../lib/dom-ids';
import { escapeHtml as esc } from '../lib/escape-html';
import { placeMapLabels } from './map/place-labels';
import { initViewport } from './map/viewport';
import { svgEl, type SvgAttrs } from './svg';

/** Screen position of each primary node's dot. Exported (with SECONDARY and
 *  TOWN_POS below) purely so tests/data/map-layout.test.ts can check these
 *  hand-placed labels stay in sync with nodes.json — the kind of drift a
 *  spelling fix can introduce silently otherwise (see that test's header). */
export const POS: Record<string, [number, number]> = {
  muros: [385, 120], luarca: [300, 115], navia: [235, 105], castropol: [120, 120], tapia: [175, 95],
  tineo: [300, 220], cangas: [255, 295], mieres: [560, 245], polalena: [545, 362], morcin: [502, 288],
  moreda: [612, 302], cabanaquinta: [655, 348], felechosa: [700, 388], blimea: [700, 240], langreo: [645, 203],
  arriondas: [880, 175], infiesto: [805, 190], nava: [735, 175], llanes: [965, 125], colombres: [1045, 120],
};
/** [name, x, y, colour, id of the primary it hangs off, how it connects] */
export const SECONDARY: [string, number, number, string, string, string][] = [
  ['Vegadeo', 95, 160, '#41e3d2', 'castropol', 'cable de 96 ff.oo. Castropol–Vegadeo'],
  ['La Caridad', 205, 140, '#41e3d2', 'tapia', 'tubos 4–8 del cable Castropol–Cudillero'],
  ['Soto del Barco', 420, 145, '#41e3d2', 'muros', 'fibra desde Muros de Nalón'],
  ['Sta. Eulalia de Cabranes', 757, 148, '#9df08a', 'infiesto', 'fibra desde Infiesto'],
  ['Villamayor', 843, 205, '#9df08a', 'infiesto', 'fibra desde Infiesto'],
  ['El Entrego', 674, 264, '#c9a0ff', 'blimea', 'fibra desde Blimea'],
  ['Sotrondio', 712, 278, '#c9a0ff', 'blimea', 'fibra desde Blimea'],
  ['Barredos', 744, 294, '#c9a0ff', 'blimea', 'fibra desde Blimea'],
  ['Pola de Laviana', 772, 310, '#c9a0ff', 'blimea', 'fibra desde Blimea'],
];
export const PAO = { x: 590, y: 95 };
/**
 * Served-town labels hung off each primary node's dot: [name, x, y][].
 *
 * A town's dot must keep a few units of clearance from every trunk path, and
 * the placement pass cannot give it any: a dot that lands *on* a cable breaks
 * the map twice over. Its leader from the parent node runs along the trunk and
 * so is invisible (this is what happened to «Pol. de Coaña», «Oyanco» and
 * «Corigos», all within 5 units of a cable), and its name gets pushed off its
 * own dot, because place-labels.ts charges a spot that lies across a cable
 * («Figaredo» and «Sta. Cruz» ended up 11 units away from theirs). Both are
 * fixed by moving the *dot* perpendicular to the trunk, not by moving the
 * name. tests/e2e/map-labels.spec.ts measures both invariants.
 */
export const TOWN_POS: Record<string, [string, number, number][]> = {
  muros: [['San Esteban de Pravia', 402, 98]],
  navia: [['Puerto de Vega', 258, 86], ['Pol. de Coaña', 240, 131]],
  castropol: [['Figueras', 150, 130], ['Barres', 105, 100], ['Piantón', 82, 140]],
  tineo: [['Pol. La Curiscada', 334, 193]],
  mieres: [['Figaredo', 505, 265], ['Sta. Cruz', 566, 293], ['Ujo', 528, 308], ['Turón', 598, 272], ['Rioturbio', 592, 220]],
  polalena: [['Villallana', 568, 336]],
  moreda: [['Caborana', 572, 320], ['Oyanco', 641, 313], ['Villanueva', 644, 286]],
  cabanaquinta: [['Corigos', 689, 360]],
  langreo: [['Tuilla', 655, 180]],
  infiesto: [['Sevares', 850, 198]],
  llanes: [['Posada', 903, 132], ['Barro', 906, 110], ['Celorio', 930, 164], ['Porrúa', 996, 160]],
};

/** Remembers which dot a label belongs to, so the placement pass at the end of
 *  this module can look for a free spot around it. */
const anchor = (el: SVGElement, x: number, y: number, r: number) => {
  el.dataset.ax = `${x}`; el.dataset.ay = `${y}`; el.dataset.ar = `${r}`;
};

export function initMap(openNode: (id: string) => void): { svg: SVGSVGElement; TR: Record<string, SVGElement> } {
  const svg = document.getElementById(DOM.astMap) as unknown as SVGSVGElement;
  const tip = document.getElementById(DOM.mapTip)!;
  const shell = svg.parentElement!;

  /** svgEl() bound to the map's own <svg> as the default parent. */
  function e2<K extends keyof SVGElementTagNameMap>(t: K, a: SvgAttrs = {}, parent: Element = svg): SVGElementTagNameMap[K] {
    return svgEl(t, a, parent);
  }

  /** Positions the tooltip near the pointer, clamped inside the map's
   *  shell, and fills it with `html` (already escaped by the caller). */
  function showTip(ev: MouseEvent, html: string) {
    const r = shell.getBoundingClientRect();
    tip.style.opacity = '1';
    tip.style.left = Math.min(ev.clientX - r.left + 14, r.width - 260) + 'px';
    tip.style.top = (ev.clientY - r.top - 10) + 'px';
    tip.innerHTML = html;
  }
  function hideTip() { tip.style.opacity = '0'; }

  e2('path', { d: 'M60,80 C250,55 480,70 620,62 C800,55 980,80 1110,92', fill: 'none', stroke: '#1c2c44', 'stroke-width': 1.5, 'stroke-dasharray': '6 5' });
  e2('text', { x: 1108, y: 78, fill: '#3d5473', 'font-size': 10, 'text-anchor': 'end', 'letter-spacing': '.2em' }).textContent = 'MAR CANTÁBRICO';

  /* ---- TRUNKS (own ones solid, leased ones dashed) ---- */
  const TR: Record<string, SVGElement> = {};
  function trunk(id: string, d: string, own: boolean, label?: string | string[], lx?: number, ly?: number) {
    /* data-trunk pairs a cable with its own caption, which is what
       tests/e2e/map-labels.spec.ts needs to check that the caption is beside
       the cable it names rather than merely beside *a* cable. */
    const p = e2('path', {
      d, fill: 'none', stroke: own ? '#41e3d2' : '#ffb454', 'stroke-width': 2.2,
      opacity: .55, 'stroke-dasharray': own ? '0' : '7 6', 'stroke-linecap': 'round',
      'data-trunk': id,
    });
    if (label) {
      const t = e2('text', { x: lx!, y: ly!, fill: own ? '#37b3a6' : '#c99a54', 'font-size': 8.5, 'letter-spacing': '.08em', 'data-trunk': id });
      /* An array is a caption set on two lines: one <text> with <tspan>s, so
         the tour still has a single element to dim (TR[id + '_lbl']). Only
         the Gijón–Cudillero caption needs it — on one line it is 190 units
         wide and cannot fit between its own curve and the minera trunk. */
      const lines = Array.isArray(label) ? label : [label];
      if (lines.length === 1) t.textContent = lines[0]!;
      else for (const [i, line] of lines.entries()) {
        e2('tspan', { x: lx!, dy: i ? 10 : 0 }, t).textContent = line;
      }
      TR[id + '_lbl'] = t;
    }
    /* permanent ambient pulse: the cable is "alive" */
    const amb = e2('circle', { r: 2.6, fill: own ? '#41e3d2' : '#ffb454', opacity: .85 });
    e2('animateMotion', { dur: `${6 + (id.length % 4) * 1.7}s`, repeatCount: 'indefinite', path: d }, amb);
    TR[id] = p;
    return p;
  }
  /* A trunk's caption is hand-placed — it is the one piece of text the
     placement pass leaves alone — so it has to be put next to its own path
     and away from the other captions by hand. Two of them had drifted far
     enough to read as captions of the wrong cable: «ALQUILADA+CWDM ·
     GIJÓN–CUDILLERO» sat 46 units below its curve, right under «AUTOVÍA
     MINERA», which was itself 75 units to the left of the minera trunk, so
     the two read as one two-line caption of the minera cable; and «ADIF
     Sta.Cruz–Collanzo» sat 80 units to the right of the aller trunk. */
  trunk('occ', 'M352,127 L300,115 L235,105 L205,140 L175,95 L120,120 L95,160', true, 'PROPIA 64F · CUDILLERO–VEGADEO (vía ADIF)', 118, 66);
  trunk('occrent', 'M590,95 C540,108 470,142 420,145 L385,120 L352,127', false, ['ALQUILADA+CWDM', 'GIJÓN–CUDILLERO'], 452, 150);
  e2('circle', { cx: 352, cy: 127, r: 3.5, fill: 'none', stroke: '#8da0b8', 'stroke-width': 1.2 });
  /* el rótulo va abajo a la izquierda y en dos líneas: en una sola se solapaba
     con «Muros de Nalón», que arranca en x=346, y quedaba ilegible */
  e2('line', { x1: 349, y1: 130, x2: 332, y2: 145, stroke: '#5a6f8d', 'stroke-width': .7, opacity: .6 });
  e2('text', { x: 318, y: 154, fill: '#8da0b8', 'font-size': 8.5, 'text-anchor': 'middle' }).textContent = 'Cudillero';
  e2('text', { x: 318, y: 164, fill: '#5a6f8d', 'font-size': 7.5, 'text-anchor': 'middle' }).textContent = '(arqueta ADIF)';
  trunk('minera', 'M590,95 C588,145 572,200 560,245', true, 'AUTOVÍA MINERA', 588, 150);
  trunk('lena', 'M560,245 L545,362', true);
  trunk('nalon', 'M578,165 C615,182 645,190 645,203 L700,240', true);
  trunk('morcin', 'M560,245 L502,288', false);
  trunk('aller', 'M560,245 C585,270 600,288 612,302 L655,348 L700,388', false, 'ADIF Sta.Cruz–Collanzo', 712, 360);
  trunk('surocc', 'M420,145 C390,180 340,200 300,220 L255,295', false, 'F.O. ALQUILADA + CWDM', 282, 258);
  trunk('suror', 'M590,95 C650,130 700,160 735,175 L805,190 L880,175 C915,160 940,140 965,125', false, 'GIJÓN–NAVA–INFIESTO–ARRIONDAS–LLANES', 688, 116);
  trunk('orient', 'M965,125 L1045,120', false);
  const rd = e2('path', { d: 'M965,125 C880,72 730,58 590,95', fill: 'none', stroke: '#9db4d8', 'stroke-width': 1.8, opacity: .5, 'stroke-dasharray': '2 6', 'stroke-linecap': 'round' });
  TR['redund'] = rd;
  const rdl = e2('text', { x: 770, y: 52, fill: '#7288a8', 'font-size': 8.5, 'letter-spacing': '.08em' });
  rdl.textContent = 'RUTA REDUNDANTE ORIENTE↔GIJÓN (desde Llanes)';
  TR['redund_lbl'] = rdl;

  for (const [name, x, y, col, par, how] of SECONDARY) {
    const parPos = POS[par];
    if (parPos) e2('line', { x1: parPos[0], y1: parPos[1], x2: x, y2: y, stroke: col, 'stroke-width': .9, opacity: .35, 'stroke-dasharray': '3 3' });
    const g = e2('g', {});
    g.style.cursor = 'help';
    e2('circle', { cx: x, cy: y, r: 4.5, fill: '#060b14', stroke: col, 'stroke-width': 1.6, opacity: .85 }, g);
    const t = e2('text', { x, y: y + 16, fill: '#8da0b8', 'font-size': 7.5, 'text-anchor': 'middle', class: 'lbl-sec' }, g);
    anchor(t, x, y, 4.5);
    t.textContent = name;
    g.addEventListener('mousemove', (ev) => showTip(ev,
      `<b>${esc(name)} · nodo secundario</b><br>Sin electrónica activa: solo repartidores ópticos pasivos. Se conecta al primario de ${esc(byId[par]!.name)} por ${esc(how)}. La renovación no actúa aquí: al no haber OLT, no hay equipo que sustituir.`));
    g.addEventListener('mouseleave', hideTip);
  }

  NODES.forEach((n) => {
    const [x, y] = POS[n.id]!;
    const g = e2('g', {});
    g.style.cursor = 'pointer';
    const hostOnly = HOST_ONLY.includes(n.id);
    e2('circle', { cx: x, cy: y, r: 7, fill: n.color, opacity: .95 }, g);
    if (hostOnly) {
      e2('circle', { cx: x, cy: y, r: 11, fill: 'none', stroke: '#8da0b8', 'stroke-width': 1, 'stroke-dasharray': '2 3' }, g);
    }
    const halo = e2('circle', { cx: x, cy: y, r: 7, fill: 'none', stroke: n.color, 'stroke-width': 1 }, g);
    e2('animate', { attributeName: 'r', values: '7;15', dur: '2.6s', repeatCount: 'indefinite' }, halo);
    e2('animate', { attributeName: 'opacity', values: '.6;0', dur: '2.6s', repeatCount: 'indefinite' }, halo);
    const lbl = e2('text', { x, y: y + 22, fill: '#8da0b8', 'font-size': 9.5, 'text-anchor': 'middle', class: 'lbl-node' }, g);
    anchor(lbl, x, y, hostOnly ? 11 : 7);
    lbl.textContent = n.name + (hostOnly ? ' *' : '');
    g.addEventListener('mousemove', (ev) => {
      const ont = ontCount(n);
      const ho = hostOnly
        ? `<br><span style="color:#ffb454">* Alberga el nodo/OLT pero su casco urbano NO figura entre las poblaciones servidas: la cobertura de la Red Asturcón aquí son sus núcleos periféricos.</span>`
        : '';
      const pl = n.towns && n.towns.length > 1
        ? `<br><span style="color:#b8c6d8">Sirve a: ${esc(n.towns.slice(0, 3).join(', '))}${n.towns.length > 3 ? '…' : ''}</span>`
        : '';
      showTip(ev, `<b>${esc(n.name)}</b><br>${n.olts.length} OLT · ${ont} ONT · migración sem. ${n.weekFrom}–${n.weekTo}${pl}${ho}<br><span style="color:${n.color}">Área ${esc(n.area)}</span> · <u>pulsa para la ficha</u>`);
    });
    g.addEventListener('mouseleave', hideTip);
    g.addEventListener('click', () => openNode(n.id));
  });

  const gp = e2('g', {});
  gp.style.cursor = 'pointer';
  e2('rect', { x: PAO.x - 10, y: PAO.y - 10, width: 20, height: 20, rx: 4, fill: '#0e1a2e', stroke: '#41e3d2', 'stroke-width': 2 }, gp);
  const pl = e2('text', { x: PAO.x, y: PAO.y - 18, fill: '#e8eef6', 'font-size': 10, 'text-anchor': 'middle', 'font-weight': 600 }, gp);
  pl.textContent = 'GIJÓN · PAO';
  gp.addEventListener('click', () => openNode('pao'));
  gp.addEventListener('mousemove', (ev) => showTip(ev,
    `<b>PAO · Gijón</b><br>Punto de acceso de operadores. Aquí y en Mieres van los enrutadores nuevos.<br><u>pulsa para la ficha</u>`));
  gp.addEventListener('mouseleave', hideTip);

  const leg = document.getElementById(DOM.areaLegend)!;
  const seen = new Set<string>();
  NODES.forEach((n) => {
    if (seen.has(n.area)) return;
    seen.add(n.area);
    const s = document.createElement('span');
    s.style.cssText = 'display:flex;align-items:center;gap:6px';
    s.innerHTML = `<span class="dot" style="background:${n.color}"></span>${esc(n.area)}`;
    leg.appendChild(s);
  });
  const s2 = document.createElement('span');
  s2.style.marginLeft = 'auto';
  s2.className = 'mono';
  s2.textContent = '● primario (OLT) · ○ secundario (pasivo) · • población servida · ▢ PAO · * nodo sin cobertura en su casco urbano';
  leg.appendChild(s2);

  /* ---- layer of served towns ---- */
  const townsLayer = e2('g', {});
  Object.entries(TOWN_POS).forEach(([nid, list]) => {
    const n = byId[nid]!;
    const [nx, ny] = POS[nid]!;
    list.forEach(([name, x, y]) => {
      e2('line', { x1: nx, y1: ny, x2: x, y2: y, stroke: n.color, 'stroke-width': .7, opacity: .22 }, townsLayer);
      e2('circle', { cx: x, cy: y, r: 2.4, fill: n.color, opacity: .75 }, townsLayer);
      const t = e2('text', { x, y: y - 5, fill: '#6f8199', 'font-size': 7, 'text-anchor': 'middle', class: 'lbl-town' }, townsLayer);
      anchor(t, x, y, 2.4);
      t.textContent = name;
    });
  });

  /* shared PON tree: Barro–Celorio–Porrúa–Posada (Llanes). The outline has to
     enclose those four dots wherever they sit, so it is redrawn whenever they
     move — see TOWN_POS.llanes. */
  const shp = e2('path', {
    d: 'M890,130 C888,110 900,98 922,96 C946,94 990,120 1000,142 C1008,160 985,176 950,176 C915,176 894,160 890,130 Z',
    fill: 'rgba(255,215,107,.05)', stroke: '#ffd76b', 'stroke-width': '1', 'stroke-dasharray': '3 4', opacity: '.6',
  }, townsLayer);
  const sht = e2('text', { x: 940, y: 80, fill: '#c9a44e', 'font-size': 7.5, 'text-anchor': 'middle', 'letter-spacing': '.06em' }, townsLayer);
  sht.textContent = 'ÁRBOL PON COMPARTIDO';
  shp.style.pointerEvents = 'all';
  shp.style.cursor = 'help';
  shp.addEventListener('mousemove', (ev) => showTip(ev,
    `<b>Árbol PON compartido</b><br>Detalle técnico del pliego: las redes FTTH de Barro, Celorio, Porrúa y Posada de Llanes están compartidas entre sí — varias poblaciones cuelgan de los mismos árboles ópticos pasivos del nodo de Llanes, en lugar de tener cada una su PON independiente.`));
  shp.addEventListener('mouseleave', hideTip);
  const townsBtn = document.getElementById(DOM.townsToggle)!;
  let townsOn = true;
  townsBtn.onclick = () => {
    townsOn = !townsOn;
    townsLayer.style.display = townsOn ? '' : 'none';
    townsBtn.textContent = townsOn ? '◉ Poblaciones servidas: visibles' : '○ Poblaciones servidas: ocultas';
  };

  initViewport(svg);
  /* Twice on purpose: the placement pass measures text with getBBox(), which
     reports the fallback monospace until IBM Plex Mono has loaded, so on a
     cold cache the first pass places every label against the wrong metrics
     and nothing would ever correct it. The pass is idempotent. */
  placeMapLabels(svg);
  document.fonts?.ready.then(() => placeMapLabels(svg));

  return { svg, TR };
}
