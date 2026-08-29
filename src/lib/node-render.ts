/**
 * HTML fragments shared between the static node page (NodeDetail.astro,
 * rendered at build time via set:html) and the client-side modal
 * (src/scripts/modal.ts, which renders the same node record without leaving
 * the home page). Keeping these in one place means an escaping fix or a
 * markup change only has to happen once, and can't drift between the two.
 *
 * Every export below takes an optional `locale`, defaulting to Spanish so
 * every existing call site (and test) keeps working unchanged. The labels
 * are this module's own — not `src/i18n/ui.ts` — because nothing outside
 * this module needs them; the figures they wrap (weeks, ONT counts, area
 * names) are pliego data and stay as-is regardless of locale.
 */
import { actionDesc, areaName, cardLabel, ontCount, type NetworkNode } from './data';
import { escapeHtml as esc } from './escape-html';
import type { Locale } from '../i18n/ui';

const LABELS: Record<
  Locale,
  {
    phase1: string;
    weeks1to12: string;
    noMigration: string;
    ofUsers: string;
    week: (n: number) => string;
    surveyStart: string;
    migrationEnd: string;
    weeksTotal: (n: number) => string;
    totalWindow: string;
    ontToMigrate: (n: number) => string;
    toMigrate: string;
    oltHeader: string;
    currentEquipHeader: string;
    cardsHeader: string;
    portsHeader: string;
    ontHeader: string;
    nodeTotal: string;
    townsServed: string;
    sharedPonTrees: string;
    samePon: string;
    area: (a: string) => string;
  }
> = {
  es: {
    phase1: 'Fase 1',
    weeks1to12: 'semanas 1–12',
    noMigration: 'Sin migración',
    ofUsers: 'de usuarios',
    week: (n) => `Semana ${n}`,
    surveyStart: 'replanteo e inicio',
    migrationEnd: 'fin de migración',
    weeksTotal: (n) => `${n} semanas`,
    totalWindow: 'ventana total',
    ontToMigrate: (n) => `${n} ONT`,
    toMigrate: 'a migrar',
    oltHeader: 'OLT',
    currentEquipHeader: 'Equipo actual',
    cardsHeader: 'Tarjetas',
    portsHeader: 'Puertos GPON act./tot.',
    ontHeader: 'ONT',
    nodeTotal: 'Total del nodo',
    townsServed: 'Poblaciones servidas por este nodo',
    sharedPonTrees: 'Árboles PON compartidos (detalle técnico)',
    samePon: 'MISMA PON',
    area: (a) => `ÁREA ${a}`,
  },
  en: {
    phase1: 'Phase 1',
    weeks1to12: 'weeks 1–12',
    noMigration: 'No migration',
    ofUsers: 'of users',
    week: (n) => `Week ${n}`,
    surveyStart: 'site survey & start',
    migrationEnd: 'end of migration',
    weeksTotal: (n) => `${n} weeks`,
    totalWindow: 'total window',
    ontToMigrate: (n) => `${n} ONT`,
    toMigrate: 'to migrate',
    oltHeader: 'OLT',
    currentEquipHeader: 'Current equipment',
    cardsHeader: 'Cards',
    portsHeader: 'GPON ports act./tot.',
    ontHeader: 'ONT',
    nodeTotal: 'Node total',
    townsServed: 'Towns served by this node',
    sharedPonTrees: 'Shared PON trees (technical detail)',
    samePon: 'SAME PON',
    area: (a) => `${a} AREA`,
  },
};

/** The migration window: PAO gets its Phase-1-only variant, every other node
 *  gets start/end week, duration and ONT count. */
export function renderMigStrip(n: NetworkNode, locale: Locale = 'es'): string {
  const t = LABELS[locale];
  if (n.id === 'pao') {
    return (
      `<div class="box"><b>${t.phase1}</b><span>${t.weeks1to12}</span></div>` +
      `<div class="box"><b>${t.noMigration}</b><span>${t.ofUsers}</span></div>`
    );
  }
  const dur = n.weekTo - n.weekFrom + 1;
  const total = ontCount(n);
  return (
    `<div class="box"><b>${t.week(n.weekFrom)}</b><span>${t.surveyStart}</span></div>` +
    `<div class="box"><b>${t.week(n.weekTo)}</b><span>${t.migrationEnd}</span></div>` +
    `<div class="box"><b>${t.weeksTotal(dur)}</b><span>${t.totalWindow}</span></div>` +
    `<div class="box"><b>${t.ontToMigrate(total)}</b><span>${t.toMigrate}</span></div>`
  );
}

/**
 * The OLT equipment table, including the totals row when a node has more than
 * one OLT, and a footnote row for every OLT the pliego contradicts itself
 * about. Empty string when the node has none (the PAO).
 *
 * Those contradictions — BLI/1B recording six active ports out of five,
 * BLI/9B twelve out of eleven — used to live in a `title` attribute on the
 * cards cell: invisible unless hovered, unreachable on a touch screen, and
 * attached to the wrong column, since the discrepancy is in the ports. The
 * whole point of transcribing them as-is instead of quietly correcting them
 * is that a reader sees the discrepancy and knows it is the source's, so it
 * has to be on the page.
 */
export function renderOltTable(n: NetworkNode, locale: Locale = 'es'): string {
  if (!n.olts.length) return '';
  const t = LABELS[locale];
  const rows = n.olts
    .map((o) => {
      /* the note always concerns the port counts, so it marks that cell */
      const odd = o.note ? ' warn' : '';
      const flag = o.note ? ' <span aria-hidden="true">⚠</span>' : '';
      return (
        `<tr><td class="mono">${esc(o.code)}</td><td>${esc(o.vendor)}</td>` +
        `<td class="mono">${esc(cardLabel(o, locale))}</td>` +
        `<td class="mono${odd}">${o.portsActive} / ${o.portsTotal}${flag}</td>` +
        `<td class="mono">${o.onts}</td></tr>`
      );
    })
    .join('');
  const totalRow =
    n.olts.length > 1
      ? `<tr class="total"><td colspan="4">${t.nodeTotal}</td><td class="mono">${ontCount(n)}</td></tr>`
      : '';
  const noted = n.olts.filter((o) => o.note);
  const notes = noted.length
    ? `<tr class="olt-notes"><td colspan="5">` +
      noted.map((o) => `<span><b>${esc(o.code)}</b> ${esc(o.note!)}</span>`).join('') +
      `</td></tr>`
    : '';
  return (
    `<tr><th>${t.oltHeader}</th><th>${t.currentEquipHeader}</th><th>${t.cardsHeader}</th>` +
    `<th>${t.portsHeader}</th><th>${t.ontHeader}</th></tr>` +
    rows +
    totalRow +
    notes
  );
}

/** Served towns, plus the shared-PON-tree detail when the pliego documents
 *  one for this node. Empty string when the node serves no towns directly. */
export function renderTownsBlock(n: NetworkNode, locale: Locale = 'es'): string {
  if (!n.towns?.length) return '';
  const t = LABELS[locale];
  const chips =
    `<div class="act-label">${t.townsServed}</div>` +
    `<div class="town-chips">${n.towns.map((p) => `<span>${esc(p)}</span>`).join('')}</div>`;
  const note = n.townsNote ? `<div class="town-note">${esc(n.townsNote)}</div>` : '';
  const pon = n.ponGroups
    ? `<div class="act-label" style="margin-top:14px">${t.sharedPonTrees}</div>` +
      '<div style="display:flex;flex-wrap:wrap;gap:10px">' +
      n.ponGroups.groups
        .map(
          (gr) =>
            '<div class="pon-group">' +
            gr
              .map(
                (p, i) =>
                  (i > 0 ? '<span class="lnk">─◆─</span>' : '') +
                  `<span class="p">${esc(p)}</span>`,
              )
              .join('') +
            `<span class="tag">${t.samePon}</span></div>`,
        )
        .join('') +
      `</div><div class="town-note" style="border-left-color:var(--pon)">${esc(n.ponGroups.note)}</div>`
    : '';
  return chips + note + pon;
}

/** Links to the contract actions affecting this node. `base` is the site
 *  base path — non-empty when the link has to reach the home page's
 *  #act-* anchors from elsewhere (the node page); empty on the home page
 *  itself, where the modal already renders next to those anchors, and where
 *  `closeModal` marks each link to close the modal before the in-page jump. */
export function renderActionLinks(
  n: NetworkNode,
  base = '',
  closeModal = false,
  locale: Locale = 'es',
): string {
  const closeAttr = closeModal ? ' data-close' : '';
  const desc = actionDesc(locale);
  return n.actions
    .map((a) => {
      const [cls, d, href] = desc[a]!;
      return `<a class="${cls}" href="${base}${href}"${closeAttr} title="${esc(d)}">${esc(a)} · ${esc(d)}</a>`;
    })
    .join('');
}

/** The "ÁREA X" pill next to a node's name. `n.area` is the pliego's own
 *  geographic classification (Occidental, Suroriental…), descriptive Spanish
 *  rather than a proper noun, so it translates via `areaName()` the same way
 *  the "ÁREA"/"AREA" word around it does — noun-adjective order in Spanish
 *  ("ÁREA OCCIDENTAL"), adjective-noun in English ("WESTERN AREA"), since
 *  "AREA WESTERN" reads backwards to an English speaker. */
export function renderAreaTag(n: NetworkNode, locale: Locale = 'es'): string {
  return (
    `<span class="mtag" style="background:${n.color}22;color:${n.color};border:1px solid ${n.color}55">` +
    `${esc(LABELS[locale].area(areaName(n.area, locale).toUpperCase()))}</span>`
  );
}
