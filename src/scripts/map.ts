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
import { HOST_ONLY, NODES, areaName, byId, ontCount, t as resolveBi, type Bi } from '../lib/data';
import type { Locale } from '../i18n/types';
import { DOM } from '../lib/dom-ids';
import { escapeHtml as esc } from '../lib/escape-html';
import { ui } from '../i18n/ui';
import { placeMapLabels } from './map/place-labels';
import { initViewport, readViewBox } from './map/viewport';
import { svgEl, type SvgAttrs } from './svg';

/** Screen position of each primary node's dot. Exported (with SECONDARY and
 *  TOWN_POS below) purely so tests/data/map-layout.test.ts can check these
 *  hand-placed labels stay in sync with nodes.json — the kind of drift a
 *  spelling fix can introduce silently otherwise (see that test's header). */
export const POS: Record<string, [number, number]> = {
  muros: [385, 120],
  luarca: [300, 115],
  navia: [235, 105],
  castropol: [120, 120],
  tapia: [175, 95],
  tineo: [300, 220],
  cangas: [255, 295],
  mieres: [560, 245],
  polalena: [545, 362],
  morcin: [502, 288],
  moreda: [612, 302],
  cabanaquinta: [655, 348],
  felechosa: [700, 388],
  blimea: [700, 240],
  langreo: [645, 203],
  arriondas: [880, 175],
  infiesto: [805, 190],
  nava: [735, 175],
  llanes: [965, 125],
  colombres: [1045, 120],
};
const biFromMuros: Bi = { es: 'fibra desde Muros de Nalón', en: 'fibre from Muros de Nalón' };
const biFromInfiesto: Bi = { es: 'fibra desde Infiesto', en: 'fibre from Infiesto' };
const biFromBlimea: Bi = { es: 'fibra desde Blimea', en: 'fibre from Blimea' };

/** [name, x, y, colour, id of the primary it hangs off, how it connects] */
export const SECONDARY: [string, number, number, string, string, Bi][] = [
  [
    'Vegadeo',
    95,
    160,
    'var(--xgs)',
    'castropol',
    { es: 'cable de 96 ff.oo. Castropol–Vegadeo', en: 'the 96-fibre Castropol–Vegadeo cable' },
  ],
  [
    'La Caridad',
    205,
    140,
    'var(--xgs)',
    'tapia',
    {
      es: 'tubos 4–8 del cable Castropol–Cudillero',
      en: 'tubes 4–8 of the Castropol–Cudillero cable',
    },
  ],
  ['Soto del Barco', 420, 145, 'var(--xgs)', 'muros', biFromMuros],
  ['Sta. Eulalia de Cabranes', 757, 148, '#9df08a', 'infiesto', biFromInfiesto],
  ['Villamayor', 843, 205, '#9df08a', 'infiesto', biFromInfiesto],
  ['El Entrego', 674, 264, '#c9a0ff', 'blimea', biFromBlimea],
  ['Sotrondio', 712, 278, '#c9a0ff', 'blimea', biFromBlimea],
  ['Barredos', 744, 294, '#c9a0ff', 'blimea', biFromBlimea],
  ['Pola de Laviana', 772, 310, '#c9a0ff', 'blimea', biFromBlimea],
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
  navia: [
    ['Puerto de Vega', 258, 86],
    ['Pol. de Coaña', 240, 131],
  ],
  castropol: [
    ['Figueras', 150, 130],
    ['Barres', 105, 100],
    ['Piantón', 82, 140],
  ],
  tineo: [['Pol. La Curiscada', 334, 193]],
  mieres: [
    ['Figaredo', 505, 265],
    ['Sta. Cruz', 566, 293],
    ['Ujo', 528, 308],
    ['Turón', 598, 272],
    ['Rioturbio', 592, 220],
  ],
  polalena: [['Villallana', 568, 336]],
  moreda: [
    ['Caborana', 572, 320],
    ['Oyanco', 641, 313],
    ['Villanueva', 644, 286],
  ],
  cabanaquinta: [['Corigos', 689, 360]],
  langreo: [['Tuilla', 655, 180]],
  infiesto: [['Sevares', 850, 198]],
  llanes: [
    ['Posada', 903, 132],
    ['Barro', 906, 110],
    ['Celorio', 930, 164],
    ['Porrúa', 996, 160],
  ],
};

/** Remembers which dot a label belongs to, so the placement pass at the end of
 *  this module can look for a free spot around it. */
const anchor = (el: SVGElement, x: number, y: number, r: number) => {
  el.dataset.ax = `${x}`;
  el.dataset.ay = `${y}`;
  el.dataset.ar = `${r}`;
};

/** The map's own fixed labels and tooltip prose — this module's captions,
 *  not pliego data, so they live here rather than in ui.ts (chrome) or
 *  content.json (pliego prose). Per-item strings that vary by trunk/node
 *  (SECONDARY's `how`, each trunk's own caption) are `Bi` literals resolved
 *  inline instead, since a lookup table keyed by locale can't hold data
 *  that's also keyed by which trunk or node it belongs to. */
const MAP_LABELS: Record<
  Locale,
  {
    seaLabel: string;
    ownTrunk: string;
    leasedCwdm: [string, string];
    adifVault: string;
    leasedFoCwdm: string;
    redundantRoute: string;
    secondaryNode: (name: string) => string;
    secondaryDesc: (primary: string, how: string) => string;
    hostOnlyNote: string;
    servesTowns: (towns: string) => string;
    nodeTooltip: (olts: number, ont: number, weekFrom: number, weekTo: number) => string;
    area: (a: string) => string;
    clickForRecord: string;
    paoTooltip: string;
    legend: string;
    sharedPonTree: string;
    sharedPonTreeTitle: string;
    sharedPonTooltip: string;
  }
> = {
  es: {
    seaLabel: 'MAR CANTÁBRICO',
    ownTrunk: 'PROPIA 64F · CUDILLERO–VEGADEO (vía ADIF)',
    leasedCwdm: ['ALQUILADA+CWDM', 'GIJÓN–CUDILLERO'],
    adifVault: '(arqueta ADIF)',
    leasedFoCwdm: 'F.O. ALQUILADA + CWDM',
    redundantRoute: 'RUTA REDUNDANTE ORIENTE↔GIJÓN (desde Llanes)',
    secondaryNode: (name) => `${name} · nodo secundario`,
    secondaryDesc: (primary, how) =>
      `Sin electrónica activa: solo repartidores ópticos pasivos. Se conecta al primario de ${primary} por ${how}. La renovación no actúa aquí: al no haber OLT, no hay equipo que sustituir.`,
    hostOnlyNote:
      '* Alberga el nodo/OLT pero su casco urbano NO figura entre las poblaciones servidas: la cobertura de la Red Asturcón aquí son sus núcleos periféricos.',
    servesTowns: (towns) => `Sirve a: ${towns}`,
    nodeTooltip: (olts, ont, weekFrom, weekTo) =>
      `${olts} OLT · ${ont} ONT · migración sem. ${weekFrom}–${weekTo}`,
    area: (a) => `Área ${a}`,
    clickForRecord: 'pulsa para la ficha',
    paoTooltip: 'Punto de acceso de operadores. Aquí y en Mieres van los enrutadores nuevos.',
    legend:
      '● primario (OLT) · ○ secundario (pasivo) · • población servida · ▢ PAO · * nodo sin cobertura en su casco urbano',
    sharedPonTree: 'ÁRBOL PON COMPARTIDO',
    sharedPonTreeTitle: 'Árbol PON compartido',
    sharedPonTooltip:
      'Detalle técnico del pliego: las redes FTTH de Barro, Celorio, Porrúa y Posada de Llanes están compartidas entre sí — varias poblaciones cuelgan de los mismos árboles ópticos pasivos del nodo de Llanes, en lugar de tener cada una su PON independiente.',
  },
  en: {
    seaLabel: 'CANTABRIAN SEA',
    ownTrunk: 'OWN 64F · CUDILLERO–VEGADEO (via ADIF)',
    leasedCwdm: ['LEASED+CWDM', 'GIJÓN–CUDILLERO'],
    adifVault: '(ADIF vault)',
    leasedFoCwdm: 'LEASED F.O. + CWDM',
    redundantRoute: 'REDUNDANT ROUTE EAST↔GIJÓN (from Llanes)',
    secondaryNode: (name) => `${name} · secondary node`,
    secondaryDesc: (primary, how) =>
      `No active electronics: only passive optical splitters. Connects to the ${primary} primary via ${how}. The renewal does not act here: with no OLT, there is no equipment to replace.`,
    hostOnlyNote:
      "* Houses the node/OLT but its own town is NOT among the towns served: the Asturcón Network's coverage here is its outlying settlements.",
    servesTowns: (towns) => `Serves: ${towns}`,
    nodeTooltip: (olts, ont, weekFrom, weekTo) =>
      `${olts} OLT · ${ont} ONT · migration wk. ${weekFrom}–${weekTo}`,
    area: (a) => `${a} Area`,
    clickForRecord: 'click for the record',
    paoTooltip: 'Operator access point. The new routers go here and in Mieres.',
    legend:
      '● primary (OLT) · ○ secondary (passive) · • town served · ▢ PAO · * node with no coverage in its own town',
    sharedPonTree: 'SHARED PON TREE',
    sharedPonTreeTitle: 'Shared PON tree',
    sharedPonTooltip:
      'Technical detail from the pliego: the FTTH networks of Barro, Celorio, Porrúa and Posada (Llanes) are shared with each other — several towns hang off the same passive optical trees of the Llanes node, instead of each having its own independent PON.',
  },
};

export function initMap(openNode: (id: string) => void): {
  svg: SVGSVGElement;
  TR: Record<string, SVGElement>;
} {
  /* Read here, not at module scope: tests/data/map-layout.test.ts imports
     this module's exported constants under Node, with no `document`, and
     initMap() itself is never called there. */
  const locale: Locale = document.documentElement.lang === 'en' ? 'en' : 'es';
  const T = ui(locale).map;
  const bi = (b: Bi) => resolveBi(b, locale);
  const L = MAP_LABELS[locale];
  const svg = document.getElementById(DOM.astMap) as unknown as SVGSVGElement;
  const tip = document.getElementById(DOM.mapTip)!;
  const shell = svg.parentElement!;

  /** svgEl() bound to the map's own <svg> as the default parent. */
  function e2<K extends keyof SVGElementTagNameMap>(
    t: K,
    a: SvgAttrs = {},
    parent: Element = svg,
  ): SVGElementTagNameMap[K] {
    return svgEl(t, a, parent);
  }

  /** Positions the tooltip near the pointer, clamped inside the map's
   *  shell, and fills it with `html` (already escaped by the caller). */
  function showTip(ev: MouseEvent, html: string) {
    const r = shell.getBoundingClientRect();
    tip.style.opacity = '1';
    tip.style.left = Math.min(ev.clientX - r.left + 14, r.width - 260) + 'px';
    tip.style.top = ev.clientY - r.top - 10 + 'px';
    tip.innerHTML = html;
  }
  function hideTip() {
    tip.style.opacity = '0';
  }

  e2('path', {
    d: 'M60,80 C250,55 480,70 620,62 C800,55 980,80 1110,92',
    fill: 'none',
    stroke: 'var(--line)',
    'stroke-width': 1.5,
    'stroke-dasharray': '6 5',
  });
  e2('text', {
    x: 1108,
    y: 78,
    fill: 'var(--dim)',
    'font-size': 10,
    'text-anchor': 'end',
    'letter-spacing': '.2em',
  }).textContent = L.seaLabel;

  /* ---- TRUNKS (own ones solid, leased ones dashed) ---- */
  const TR: Record<string, SVGElement> = {};
  function trunk(
    id: string,
    d: string,
    own: boolean,
    label?: string | string[],
    lx?: number,
    ly?: number,
  ) {
    /* data-trunk pairs a cable with its own caption, which is what
       tests/e2e/map-labels.spec.ts needs to check that the caption is beside
       the cable it names rather than merely beside *a* cable. */
    const p = e2('path', {
      d,
      fill: 'none',
      stroke: own ? 'var(--xgs)' : 'var(--gpon)',
      'stroke-width': 2.2,
      opacity: 0.55,
      'stroke-dasharray': own ? '0' : '7 6',
      'stroke-linecap': 'round',
      'data-trunk': id,
    });
    if (label) {
      const t = e2('text', {
        x: lx!,
        y: ly!,
        fill: own ? '#37b3a6' : '#c99a54',
        'font-size': 8.5,
        'letter-spacing': '.08em',
        'data-trunk': id,
      });
      /* An array is a caption set on two lines: one <text> with <tspan>s, so
         the tour still has a single element to dim (TR[id + '_lbl']). Only
         the Gijón–Cudillero caption needs it — on one line it is 190 units
         wide and cannot fit between its own curve and the minera trunk. */
      const lines = Array.isArray(label) ? label : [label];
      if (lines.length === 1) t.textContent = lines[0]!;
      else
        for (const [i, line] of lines.entries()) {
          e2('tspan', { x: lx!, dy: i ? 10 : 0 }, t).textContent = line;
        }
      TR[id + '_lbl'] = t;
    }
    /* permanent ambient pulse: the cable is "alive" */
    const amb = e2('circle', { r: 2.6, fill: own ? 'var(--xgs)' : 'var(--gpon)', opacity: 0.85 });
    e2(
      'animateMotion',
      { dur: `${6 + (id.length % 4) * 1.7}s`, repeatCount: 'indefinite', path: d },
      amb,
    );
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
  trunk(
    'occ',
    'M352,127 L300,115 L235,105 L205,140 L175,95 L120,120 L95,160',
    true,
    L.ownTrunk,
    118,
    66,
  );
  trunk(
    'occrent',
    'M590,95 C540,108 470,142 420,145 L385,120 L352,127',
    false,
    L.leasedCwdm,
    452,
    150,
  );
  e2('circle', {
    cx: 352,
    cy: 127,
    r: 3.5,
    fill: 'none',
    stroke: 'var(--muted)',
    'stroke-width': 1.2,
  });
  /* el rótulo va abajo a la izquierda y en dos líneas: en una sola se solapaba
     con «Muros de Nalón», que arranca en x=346, y quedaba ilegible */
  e2('line', {
    x1: 349,
    y1: 130,
    x2: 332,
    y2: 145,
    stroke: 'var(--dim)',
    'stroke-width': 0.7,
    opacity: 0.6,
  });
  e2('text', {
    x: 318,
    y: 154,
    fill: 'var(--muted)',
    'font-size': 8.5,
    'text-anchor': 'middle',
  }).textContent = 'Cudillero';
  e2('text', {
    x: 318,
    y: 164,
    fill: 'var(--dim)',
    'font-size': 7.5,
    'text-anchor': 'middle',
  }).textContent = L.adifVault;
  trunk('minera', 'M590,95 C588,145 572,200 560,245', true, 'AUTOVÍA MINERA', 588, 150);
  trunk('lena', 'M560,245 L545,362', true);
  trunk('nalon', 'M578,165 C615,182 645,190 645,203 L700,240', true);
  trunk('morcin', 'M560,245 L502,288', false);
  trunk(
    'aller',
    'M560,245 C585,270 600,288 612,302 L655,348 L700,388',
    false,
    'ADIF Sta.Cruz–Collanzo',
    712,
    360,
  );
  trunk('surocc', 'M420,145 C390,180 340,200 300,220 L255,295', false, L.leasedFoCwdm, 282, 258);
  trunk(
    'suror',
    'M590,95 C650,130 700,160 735,175 L805,190 L880,175 C915,160 940,140 965,125',
    false,
    'GIJÓN–NAVA–INFIESTO–ARRIONDAS–LLANES',
    688,
    116,
  );
  trunk('orient', 'M965,125 L1045,120', false);
  const rd = e2('path', {
    d: 'M965,125 C880,72 730,58 590,95',
    fill: 'none',
    stroke: 'var(--muted)',
    'stroke-width': 1.8,
    opacity: 0.5,
    'stroke-dasharray': '2 6',
    'stroke-linecap': 'round',
  });
  TR['redund'] = rd;
  const rdl = e2('text', {
    x: 770,
    y: 52,
    fill: 'var(--muted)',
    'font-size': 8.5,
    'letter-spacing': '.08em',
  });
  rdl.textContent = L.redundantRoute;
  TR['redund_lbl'] = rdl;

  for (const [name, x, y, col, par, how] of SECONDARY) {
    const parPos = POS[par];
    if (parPos)
      e2('line', {
        x1: parPos[0],
        y1: parPos[1],
        x2: x,
        y2: y,
        stroke: col,
        'stroke-width': 0.9,
        opacity: 0.35,
        'stroke-dasharray': '3 3',
      });
    const g = e2('g', {});
    g.style.cursor = 'help';
    e2(
      'circle',
      {
        cx: x,
        cy: y,
        r: 4.5,
        fill: 'var(--panel)',
        stroke: col,
        'stroke-width': 1.6,
        opacity: 0.85,
      },
      g,
    );
    const t = e2(
      'text',
      {
        x,
        y: y + 16,
        fill: 'var(--muted)',
        'font-size': 7.5,
        'text-anchor': 'middle',
        class: 'lbl-sec',
      },
      g,
    );
    anchor(t, x, y, 4.5);
    t.textContent = name;
    g.addEventListener('mousemove', (ev) =>
      showTip(
        ev,
        `<b>${esc(L.secondaryNode(name))}</b><br>${esc(L.secondaryDesc(byId[par]!.name, bi(how)))}`,
      ),
    );
    g.addEventListener('mouseleave', hideTip);
  }

  NODES.forEach((n) => {
    const [x, y] = POS[n.id]!;
    const g = e2('g', {});
    g.style.cursor = 'pointer';
    const hostOnly = HOST_ONLY.includes(n.id);
    e2('circle', { cx: x, cy: y, r: 7, fill: n.color, opacity: 0.95 }, g);
    if (hostOnly) {
      e2(
        'circle',
        {
          cx: x,
          cy: y,
          r: 11,
          fill: 'none',
          stroke: 'var(--muted)',
          'stroke-width': 1,
          'stroke-dasharray': '2 3',
        },
        g,
      );
    }
    const halo = e2(
      'circle',
      { cx: x, cy: y, r: 7, fill: 'none', stroke: n.color, 'stroke-width': 1 },
      g,
    );
    e2(
      'animate',
      { attributeName: 'r', values: '7;15', dur: '2.6s', repeatCount: 'indefinite' },
      halo,
    );
    e2(
      'animate',
      { attributeName: 'opacity', values: '.6;0', dur: '2.6s', repeatCount: 'indefinite' },
      halo,
    );
    const lbl = e2(
      'text',
      {
        x,
        y: y + 22,
        fill: 'var(--muted)',
        'font-size': 9.5,
        'text-anchor': 'middle',
        class: 'lbl-node',
      },
      g,
    );
    anchor(lbl, x, y, hostOnly ? 11 : 7);
    lbl.textContent = n.name + (hostOnly ? ' *' : '');
    g.addEventListener('mousemove', (ev) => {
      const ont = ontCount(n);
      const ho = hostOnly
        ? `<br><span style="color:var(--gpon)">${esc(L.hostOnlyNote)}</span>`
        : '';
      const pl =
        n.towns && n.towns.length > 1
          ? `<br><span style="color:var(--muted)">${esc(L.servesTowns(n.towns.slice(0, 3).join(', ')))}${n.towns.length > 3 ? '…' : ''}</span>`
          : '';
      showTip(
        ev,
        `<b>${esc(n.name)}</b><br>${esc(L.nodeTooltip(n.olts.length, ont, n.weekFrom, n.weekTo))}${pl}${ho}<br><span style="color:${n.color}">${esc(L.area(areaName(n.area, locale)))}</span> · <u>${esc(L.clickForRecord)}</u>`,
      );
    });
    g.addEventListener('mouseleave', hideTip);
    g.addEventListener('click', () => openNode(n.id));
  });

  const gp = e2('g', {});
  gp.style.cursor = 'pointer';
  e2(
    'rect',
    {
      x: PAO.x - 10,
      y: PAO.y - 10,
      width: 20,
      height: 20,
      rx: 4,
      fill: 'var(--panel)',
      stroke: 'var(--xgs)',
      'stroke-width': 2,
    },
    gp,
  );
  const pl = e2(
    'text',
    {
      x: PAO.x,
      y: PAO.y - 18,
      fill: 'var(--txt)',
      'font-size': 10,
      'text-anchor': 'middle',
      'font-weight': 600,
    },
    gp,
  );
  pl.textContent = 'GIJÓN · PAO';
  gp.addEventListener('click', () => openNode('pao'));
  gp.addEventListener('mousemove', (ev) =>
    showTip(ev, `<b>PAO · Gijón</b><br>${esc(L.paoTooltip)}<br><u>${esc(L.clickForRecord)}</u>`),
  );
  gp.addEventListener('mouseleave', hideTip);

  const leg = document.getElementById(DOM.areaLegend)!;
  const seen = new Set<string>();
  NODES.forEach((n) => {
    if (seen.has(n.area)) return;
    seen.add(n.area);
    const s = document.createElement('span');
    s.style.cssText = 'display:flex;align-items:center;gap:6px';
    s.innerHTML = `<span class="dot" style="background:${n.color}"></span>${esc(areaName(n.area, locale))}`;
    leg.appendChild(s);
  });
  const s2 = document.createElement('span');
  s2.style.marginLeft = 'auto';
  s2.className = 'mono';
  s2.textContent = L.legend;
  leg.appendChild(s2);

  /* ---- layer of served towns ---- */
  const townsLayer = e2('g', {});
  Object.entries(TOWN_POS).forEach(([nid, list]) => {
    const n = byId[nid]!;
    const [nx, ny] = POS[nid]!;
    list.forEach(([name, x, y]) => {
      e2(
        'line',
        { x1: nx, y1: ny, x2: x, y2: y, stroke: n.color, 'stroke-width': 0.7, opacity: 0.22 },
        townsLayer,
      );
      e2('circle', { cx: x, cy: y, r: 2.4, fill: n.color, opacity: 0.75 }, townsLayer);
      const t = e2(
        'text',
        {
          x,
          y: y - 5,
          fill: 'var(--dim)',
          'font-size': 7,
          'text-anchor': 'middle',
          class: 'lbl-town',
        },
        townsLayer,
      );
      anchor(t, x, y, 2.4);
      t.textContent = name;
    });
  });

  /* shared PON tree: Barro–Celorio–Porrúa–Posada (Llanes). The outline has to
     enclose those four dots wherever they sit, so it is redrawn whenever they
     move — see TOWN_POS.llanes. */
  const shp = e2(
    'path',
    {
      d: 'M890,130 C888,110 900,98 922,96 C946,94 990,120 1000,142 C1008,160 985,176 950,176 C915,176 894,160 890,130 Z',
      fill: 'rgba(255,215,107,.05)',
      stroke: 'var(--gpon)',
      'stroke-width': '1',
      'stroke-dasharray': '3 4',
      opacity: '.6',
    },
    townsLayer,
  );
  const sht = e2(
    'text',
    {
      x: 940,
      y: 80,
      fill: 'var(--pon)',
      'font-size': 7.5,
      'text-anchor': 'middle',
      'letter-spacing': '.06em',
    },
    townsLayer,
  );
  sht.textContent = L.sharedPonTree;
  shp.style.pointerEvents = 'all';
  shp.style.cursor = 'help';
  shp.addEventListener('mousemove', (ev) =>
    showTip(ev, `<b>${esc(L.sharedPonTreeTitle)}</b><br>${esc(L.sharedPonTooltip)}`),
  );
  shp.addEventListener('mouseleave', hideTip);
  const townsBtn = document.getElementById(DOM.townsToggle)!;
  let townsOn = true;
  townsBtn.onclick = () => {
    townsOn = !townsOn;
    townsLayer.style.display = townsOn ? '' : 'none';
    townsBtn.textContent = townsOn ? `◉ ${T.townsVisible}` : `○ ${T.townsHidden}`;
  };

  const { fitAspect, clearFit } = initViewport(svg, {
    zoomIn: document.getElementById(DOM.mapZoomIn) as HTMLButtonElement | null,
    zoomOut: document.getElementById(DOM.mapZoomOut) as HTMLButtonElement | null,
  });

  /* On a portrait phone the map's ~2.5:1 aspect ratio, width-fit like
     everywhere else, leaves most of fullscreen's own height empty — the
     one thing fullscreen (scripts/fullscreen.ts) was supposed to fix.
     Reframing to fill that height is a real, correct zoom (fitAspect), not
     a CSS trick, so it's undone the same way any other zoom would be:
     remembered before, restored after, rather than left to bleed back into
     the small in-page map once fullscreen closes. Watching #fsBg's own
     class rather than the fullscreen module's return value keeps this
     content-agnostic on that module's side — it doesn't need to know the
     map is special, just that something under #mapWrap wants a say once
     its target actually lands in the DOM at fullscreen size. */
  const mapFsBtn = document.querySelector<HTMLButtonElement>(`#${DOM.mapWrap} .fs-trigger`);
  const fsBg = document.getElementById(DOM.fsBg);
  let savedForFullscreen: ReturnType<typeof readViewBox> | null = null;
  mapFsBtn?.addEventListener('click', () => {
    if (!matchMedia('(max-width: 760px) and (orientation: portrait)').matches) return;
    requestAnimationFrame(() => {
      const host = document.getElementById(DOM.fsHost);
      if (!host) return;
      const r = host.getBoundingClientRect();
      savedForFullscreen = readViewBox(svg);
      fitAspect(r.width, r.height);
    });
  });
  if (fsBg) {
    new MutationObserver(() => {
      if (!fsBg.classList.contains('open') && savedForFullscreen) {
        svg.setAttribute('viewBox', savedForFullscreen.join(' '));
        savedForFullscreen = null;
        /* fitAspect narrowed how far zoom-out can go to the fullscreen crop —
           without this, the in-page map would keep that narrower ceiling
           forever, unable to zoom back out to its own true home extent. */
        clearFit();
      }
    }).observe(fsBg, { attributes: true, attributeFilter: ['class'] });
  }
  /* Twice on purpose: the placement pass measures text with getBBox(), which
     reports the fallback monospace until IBM Plex Mono has loaded, so on a
     cold cache the first pass places every label against the wrong metrics
     and nothing would ever correct it. The pass is idempotent.

     document.fonts.load() for this exact font, not document.fonts.ready:
     .ready only waits for fonts the browser has already decided are
     needed, and that decision's timing turns out to depend on unrelated
     fonts elsewhere on the page — confirmed by a real regression, not a
     hypothetical one: switching the hero's headline face to
     font-display:optional made .ready resolve near-instantly, before IBM
     Plex Mono itself had even started loading, since nothing else was
     left pending to wait for, so this correction pass fired too early and
     labels stayed measured against the fallback (e2e caught Oyanco's
     label 10+ units from its dot instead of tight against it). load()
     asks for this exact font directly, kicking off its own fetch if one
     hasn't started, so this no longer rides on some other font's loading
     speed to happen to be slow enough. */
  placeMapLabels(svg);
  void document.fonts?.load('10px "IBM Plex Mono"').then(() => placeMapLabels(svg));

  return { svg, TR };
}
