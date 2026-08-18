/**
 * HTML fragments shared between the static node page (NodeDetail.astro,
 * rendered at build time via set:html) and the client-side modal
 * (src/scripts/modal.ts, which renders the same node record without leaving
 * the home page). Keeping these in one place means an escaping fix or a
 * markup change only has to happen once, and can't drift between the two.
 */
import { ACTION_DESC, cardLabel, ontCount, type NetworkNode } from './data';
import { escapeHtml as esc } from './escape-html';

/** The migration window: PAO gets its Phase-1-only variant, every other node
 *  gets start/end week, duration and ONT count. */
export function renderMigStrip(n: NetworkNode): string {
  if (n.id === 'pao') {
    return (
      '<div class="box"><b>Fase 1</b><span>semanas 1–12</span></div>' +
      '<div class="box"><b>Sin migración</b><span>de usuarios</span></div>'
    );
  }
  const dur = n.weekTo - n.weekFrom + 1;
  const total = ontCount(n);
  return (
    `<div class="box"><b>Semana ${n.weekFrom}</b><span>replanteo e inicio</span></div>` +
    `<div class="box"><b>Semana ${n.weekTo}</b><span>fin de migración</span></div>` +
    `<div class="box"><b>${dur} semanas</b><span>ventana total</span></div>` +
    `<div class="box"><b>${total} ONT</b><span>a migrar</span></div>`
  );
}

/** The OLT equipment table, including the totals row when a node has more
 *  than one OLT. Empty string when the node has none (the PAO). */
export function renderOltTable(n: NetworkNode): string {
  if (!n.olts.length) return '';
  const rows = n.olts
    .map(
      (o) =>
        `<tr><td class="mono">${esc(o.code)}</td><td>${esc(o.vendor)}</td>` +
        `<td class="mono" title="${esc(o.note ?? '')}">${esc(cardLabel(o))}</td>` +
        `<td class="mono">${o.portsActive} / ${o.portsTotal}</td><td class="mono">${o.onts}</td></tr>`
    )
    .join('');
  const totalRow =
    n.olts.length > 1
      ? `<tr class="total"><td colspan="4">Total del nodo</td><td class="mono">${ontCount(n)}</td></tr>`
      : '';
  return (
    '<tr><th>OLT</th><th>Equipo actual</th><th>Tarjetas</th><th>Puertos GPON act./tot.</th><th>ONT</th></tr>' +
    rows +
    totalRow
  );
}

/** Served towns, plus the shared-PON-tree detail when the pliego documents
 *  one for this node. Empty string when the node serves no towns directly. */
export function renderTownsBlock(n: NetworkNode): string {
  if (!n.towns?.length) return '';
  const chips =
    '<div class="act-label">Poblaciones servidas por este nodo</div>' +
    `<div class="town-chips">${n.towns.map((p) => `<span>${esc(p)}</span>`).join('')}</div>`;
  const note = n.townsNote ? `<div class="town-note">${esc(n.townsNote)}</div>` : '';
  const pon = n.ponGroups
    ? '<div class="act-label" style="margin-top:14px">Árboles PON compartidos (detalle técnico)</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px">' +
      n.ponGroups.groups
        .map(
          (gr) =>
            '<div class="pon-group">' +
            gr.map((p, i) => (i > 0 ? '<span class="lnk">─◆─</span>' : '') + `<span class="p">${esc(p)}</span>`).join('') +
            '<span class="tag">MISMA PON</span></div>'
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
export function renderActionLinks(n: NetworkNode, base = '', closeModal = false): string {
  const closeAttr = closeModal ? ' data-close' : '';
  return n.actions
    .map((a) => {
      const [cls, desc, href] = ACTION_DESC[a]!;
      return `<a class="${cls}" href="${base}${href}"${closeAttr} title="${esc(desc)}">${esc(a)} · ${esc(desc)}</a>`;
    })
    .join('');
}

/** The "ÁREA X" pill next to a node's name. */
export function renderAreaTag(n: NetworkNode): string {
  return (
    `<span class="mtag" style="background:${n.color}22;color:${n.color};border:1px solid ${n.color}55">` +
    `ÁREA ${esc(n.area.toUpperCase())}</span>`
  );
}
