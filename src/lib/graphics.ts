/**
 * Deterministic SVG generators: pure functions that return markup.
 *
 * They are called AT BUILD TIME from the .astro components, so these drawings
 * (cable cross-sections, CWDM spectrum, occupancy rows, the PAO panel and the
 * phase 2 gantt) reach the browser already rendered, with no JavaScript.
 *
 * Every text carries a halo (paint-order: stroke) so it never gets lost in the
 * lines and circles underneath it.
 */
import { CONTRACT_WEEKS, HOST_ONLY, type NetworkNode } from './data';
import { escapeHtml as esc } from './escape-html';

/** Colours normalised per CWDM wavelength: [colour, name]. */
export const LCOL: Record<number, [string, string]> = {
  1471: ['#9aa0a6', 'gris'],
  1491: ['#b57edc', 'violeta'],
  1511: ['#4a7bd8', 'azul'],
  1531: ['#3fae5a', 'verde'],
  1551: ['#e8d24a', 'amarillo'],
  1571: ['#e8923a', 'naranja'],
  1591: ['#e05252', 'rojo'],
  1611: ['#9a6a42', 'marrón'],
};

/** Tube and fibre colour code, per the TIA-598 standard. */
export const TIA = [
  '#3f6fd8', '#e8923a', '#3fae5a', '#9a6a42', '#9aa0a6', '#e8eef6',
  '#e05252', '#3a3f47', '#e8d24a', '#b57edc', '#e88ab8', '#4ad8d8',
];

export const TIAN = [
  'azul', 'naranja', 'verde', 'marrón', 'gris', 'blanco',
  'rojo', 'negro', 'amarillo', 'violeta', 'rosa', 'aqua',
];

/** The 8 CWDM colours in λ order, for the channel occupancy rows. */
export const CW8 = ['#9aa0a6', '#b57edc', '#4a7bd8', '#3fae5a', '#e8d24a', '#e8923a', '#e05252', '#9a6a42'];

const HALO = '<style>text{paint-order:stroke;stroke:#0c1524;stroke-width:3px;stroke-linejoin:round}</style>';

export interface Chan {
  /** wavelength in nm */
  l: number;
  /** where the frame is headed */
  to?: string;
  /** vacant channel */
  free?: boolean;
}

/** CWDM spectrum: the mux plus a fan of lambdas in their normalised colour. */
export function mkCWDM(title: string, chans: Chan[], foot?: string): string {
  const ordered = [...chans].sort((a, b) => a.l - b.l);
  const H = 64 + ordered.length * 34;
  let g = `<svg viewBox="0 0 700 ${H}" style="width:100%;max-width:900px;display:block;font-family:'IBM Plex Mono',monospace">`;
  g += HALO;
  g += `<text x="8" y="20" fill="#e8eef6" font-size="14" font-weight="600">${esc(title)}</text>`;
  const muxX = 120, muxY = H / 2 + 8;
  g += `<line x1="10" y1="${muxY - 4}" x2="${muxX - 28}" y2="${muxY - 4}" stroke="#f2d024" stroke-width="3"/>`;
  g += `<line x1="10" y1="${muxY + 4}" x2="${muxX - 28}" y2="${muxY + 4}" stroke="#f2d024" stroke-width="3"/>`;
  g += `<line x1="10" y1="${muxY}" x2="${muxX - 28}" y2="${muxY}" stroke="#f2d024" stroke-width="14" opacity=".14"/>`;
  g += `<text x="12" y="${muxY - 14}" fill="#8da0b8" font-size="9.5">2 ff.oo. alquiladas (par) → Gijón</text>`;
  g += `<path d="M${muxX - 28},${muxY - 16} L${muxX + 8},${muxY - ((ordered.length * 34) / 2)} L${muxX + 8},${muxY + ((ordered.length * 34) / 2)} L${muxX - 28},${muxY + 16} Z" fill="#12233c" stroke="#41e3d2" stroke-width="1.4"/>`;
  g += `<text x="${muxX - 10}" y="${muxY + 4}" fill="#41e3d2" font-size="9" text-anchor="middle" transform="rotate(-90 ${muxX - 10} ${muxY})">CWDM MUX</text>`;
  ordered.forEach((ch, i) => {
    const y = 44 + i * 34;
    const [col, cname] = LCOL[ch.l]!;
    const dash = ch.free ? 'stroke-dasharray="6 5"' : '';
    g += `<line x1="${muxX + 8}" y1="${muxY}" x2="196" y2="${y}" stroke="${col}" stroke-width="2.4" ${dash} opacity="${ch.free ? 0.55 : 0.95}"/>`;
    g += `<line x1="196" y1="${y}" x2="360" y2="${y}" stroke="${col}" stroke-width="3" ${dash}/>`;
    if (!ch.free) g += `<line x1="196" y1="${y}" x2="360" y2="${y}" stroke="${col}" stroke-width="9" opacity=".22"/>`;
    g += `<circle cx="372" cy="${y}" r="7" fill="${ch.free ? 'none' : col}" stroke="${col}" stroke-width="2"/>`;
    g += `<text x="204" y="${y - 6}" fill="${col}" font-size="10.5" font-weight="600">${ch.l} nm · ${esc(cname)}</text>`;
    g += `<text x="388" y="${y + 4}" fill="${ch.free ? '#41e3d2' : '#e8eef6'}" font-size="11.5" ${ch.free ? 'font-weight="600"' : ''}>${ch.free ? 'VACANTE' : esc(ch.to ?? '')}</text>`;
  });
  g += '</svg>';
  return g + (foot ? `<div style="margin-top:8px;color:#8da0b8">${foot}</div>` : '');
}

export interface SectionLabel {
  /** tube numbers the label points at */
  tubes: number[];
  color?: string;
  /** lines separated by | */
  text: string;
}

export interface SectionMarks {
  /** segregated access tubes: cyan ring */
  access?: number[];
  /** dead-end tubes: red cross */
  dead?: number[];
  /** unspliced tubes: dimmed */
  nf?: number[];
  labels?: SectionLabel[];
}

export interface SectionZoom {
  /** the tube being zoomed into */
  t: number;
  /** fibres in use; null = no breakdown in the pliego */
  oc?: number | null;
  nf?: boolean;
  label: string;
  /** lines separated by | */
  sub?: string;
}

/** XL cable cut: circular section, tubes with their fibres and radial labels. */
export function mkSection(
  title: string,
  nT: number,
  marks: SectionMarks = {},
  zooms: SectionZoom[] = [],
  foot = ''
): string {
  const labels = marks.labels || [];
  const H = Math.max(430, 90 + zooms.length * 170);
  let g = `<svg viewBox="0 0 1180 ${H}" style="width:100%;display:block;font-family:'IBM Plex Mono',monospace">`;
  g += HALO;
  g += `<text x="10" y="26" fill="#e8eef6" font-size="17" font-weight="600">${esc(title)}</text>`;
  const CX = 330, CY = H / 2 + 26, Rsh = 136;
  /* sheath, armour and central strength member */
  g += `<circle cx="${CX}" cy="${CY}" r="${Rsh}" fill="#14181f" stroke="#3a4456" stroke-width="8"/>`;
  g += `<circle cx="${CX}" cy="${CY}" r="${Rsh - 12}" fill="none" stroke="#242b36" stroke-width="3"/>`;
  g += `<circle cx="${CX}" cy="${CY}" r="15" fill="#5a6270"/>`;
  g += `<text x="${CX}" y="${CY + 4}" fill="#20242a" font-size="9" text-anchor="middle">alma</text>`;
  g += `<text x="${CX - Rsh + 4}" y="${CY - Rsh + 2}" fill="#5a6f8d" font-size="11">cubierta</text>`;
  const ring1 = Math.min(nT, 12), ring2 = nT - ring1;
  const tubePos: Record<number, [number, number]> = {};
  const tubeAng: Record<number, number> = {};
  function placeRing(count: number, offset: number, rad: number, tr: number) {
    for (let i = 0; i < count; i++) {
      const idx = offset + i + 1;
      const a = -Math.PI / 2 + i * 2 * Math.PI / count;
      const x = CX + Math.cos(a) * rad, y = CY + Math.sin(a) * rad;
      tubePos[idx] = [x, y];
      tubeAng[idx] = a;
      const col = TIA[(idx - 1) % 12]!;
      const nf = (marks.nf || []).includes(idx),
        dead = (marks.dead || []).includes(idx),
        acc = (marks.access || []).includes(idx);
      g += `<circle cx="${x}" cy="${y}" r="${tr}" fill="${col}" opacity="${nf ? 0.3 : 1}" stroke="${acc ? '#41e3d2' : '#060b14'}" stroke-width="${acc ? 3.4 : 1.8}"/>`;
      if (acc) g += `<circle cx="${x}" cy="${y}" r="${tr + 6}" fill="none" stroke="#41e3d2" stroke-width="1.4" opacity=".55"/>`;
      for (let f = 0; f < 8; f++) {
        const fa = -Math.PI / 2 + f * Math.PI / 4;
        const fx = x + Math.cos(fa) * (tr * 0.58), fy = y + Math.sin(fa) * (tr * 0.58);
        g += `<circle cx="${fx}" cy="${fy}" r="${tr * 0.16}" fill="${TIA[f]}" opacity="${nf ? 0.3 : 0.95}" stroke="#060b14" stroke-width=".6"/>`;
      }
      const darkCol = ['#e8eef6', '#e8d24a', '#9aa0a6', '#4ad8d8'].includes(col);
      g += `<text x="${x}" y="${y + 4.5}" fill="${darkCol ? '#20242a' : '#e8eef6'}" font-size="12" text-anchor="middle" font-weight="700" opacity="${nf ? 0.5 : 1}">${idx}</text>`;
      if (dead) g += `<text x="${x + tr - 4}" y="${y - tr + 8}" fill="#ff7d6b" font-size="15" font-weight="700">✕</text>`;
    }
  }
  if (ring2 > 0) {
    placeRing(ring1, 0, 92, 15);
    placeRing(ring2, ring1, 46, 13);
  } else {
    placeRing(ring1, 0, nT > 8 ? 88 : 82, nT > 8 ? 18 : 24);
  }
  /* radial labels, one per tube group */
  labels.forEach((L) => {
    const angs = L.tubes.map((t) => tubeAng[t]).filter((a): a is number => a !== undefined);
    if (!angs.length) return;
    /* circular mean angle */
    let sx = 0, sy = 0;
    angs.forEach((a) => { sx += Math.cos(a); sy += Math.sin(a); });
    const am = Math.atan2(sy, sx);
    const ex = CX + Math.cos(am) * (Rsh + 14), ey = CY + Math.sin(am) * (Rsh + 14);
    const lx = CX + Math.cos(am) * (Rsh + 44), ly = CY + Math.sin(am) * (Rsh + 44);
    L.tubes.forEach((t) => {
      const [tx, ty] = tubePos[t] || [CX, CY];
      g += `<line x1="${tx + Math.cos(tubeAng[t]!) * 20}" y1="${ty + Math.sin(tubeAng[t]!) * 20}" x2="${ex}" y2="${ey}" stroke="${L.color || '#8da0b8'}" stroke-width="1" opacity=".5"/>`;
    });
    g += `<line x1="${ex}" y1="${ey}" x2="${lx}" y2="${ly}" stroke="${L.color || '#8da0b8'}" stroke-width="1.2"/>`;
    const parts = L.text.split('|');
    const vertical = Math.abs(Math.cos(am)) < 0.35; /* group above or below: centre the text */
    let anchor: string, tx0: number, baseY: number;
    if (vertical) {
      anchor = 'middle';
      tx0 = lx;
      baseY = ly + (Math.sin(am) < 0 ? -6 - (parts.length - 1) * 16 : 14);
    } else {
      const right = Math.cos(am) > 0;
      anchor = right ? 'start' : 'end';
      tx0 = lx + (right ? 6 : -6);
      baseY = ly + 4 - (parts.length - 1) * 8;
    }
    parts.forEach((p, pi) => {
      g += `<text x="${tx0}" y="${baseY + pi * 16}" fill="${L.color || '#c8d4e2'}" font-size="12.5" text-anchor="${anchor}" font-weight="${pi === 0 ? '600' : '400'}">${esc(p)}</text>`;
    });
  });
  /* large zooms */
  zooms.forEach((z, zi) => {
    const zy = 100 + zi * 170, ZX = 760, ZR = 58;
    const [tx, ty] = tubePos[z.t] || [CX, CY];
    g += `<line x1="${tx}" y1="${ty}" x2="${ZX - ZR + 6}" y2="${zy - ZR * 0.5}" stroke="#41e3d2" stroke-width="1.1" opacity=".45"/>`;
    g += `<line x1="${tx}" y1="${ty}" x2="${ZX - ZR + 6}" y2="${zy + ZR * 0.5}" stroke="#41e3d2" stroke-width="1.1" opacity=".45"/>`;
    const tcol = TIA[(z.t - 1) % 12]!;
    g += `<circle cx="${ZX}" cy="${zy}" r="${ZR}" fill="#101720" stroke="${tcol}" stroke-width="6"/>`;
    for (let f = 0; f < 8; f++) {
      const fa = -Math.PI / 2 + f * Math.PI / 4;
      const fx = ZX + Math.cos(fa) * 35, fy = zy + Math.sin(fa) * 35;
      const col = TIA[f];
      let st: string;
      if (z.nf) st = `fill="#2a3038" stroke="#3a4456" stroke-width="1.4"`;
      else if (z.oc == null) st = `fill="${col}" stroke="#060b14" stroke-width="1"`;
      else if (f < z.oc) {
        g += `<circle cx="${fx}" cy="${fy}" r="15" fill="${col}" opacity=".22"/>`;
        st = `fill="${col}" stroke="#060b14" stroke-width="1"`;
      } else st = `fill="none" stroke="#41e3d2" stroke-width="2.2" stroke-dasharray="3.5 3.5"`;
      g += `<circle cx="${fx}" cy="${fy}" r="9" ${st}/>`;
      g += `<text x="${fx}" y="${fy + 3.5}" fill="${f < (z.oc ?? 8) && !z.nf ? '#0c1524' : '#41e3d2'}" font-size="8" text-anchor="middle" stroke="none">${f + 1}</text>`;
    }
    if (z.nf) g += `<text x="${ZX}" y="${zy + 6}" fill="#ff7d6b" font-size="20" text-anchor="middle" font-weight="700">✕</text>`;
    g += `<text x="${ZX + ZR + 20}" y="${zy - 20}" fill="#e8eef6" font-size="15" font-weight="600">${esc(z.label)}</text>`;
    if (z.oc != null && !z.nf) {
      g += `<circle cx="${ZX + ZR + 28}" cy="${zy + 4}" r="6.5" fill="${tcol}"/>`;
      g += `<text x="${ZX + ZR + 42}" y="${zy + 9}" fill="#c8d4e2" font-size="13">${z.oc} ocupadas</text>`;
      g += `<circle cx="${ZX + ZR + 178}" cy="${zy + 4}" r="6.5" fill="none" stroke="#41e3d2" stroke-width="1.8" stroke-dasharray="3 3"/>`;
      g += `<text x="${ZX + ZR + 192}" y="${zy + 9}" fill="#41e3d2" font-size="13">${8 - z.oc} vacantes</text>`;
    }
    if (z.sub) z.sub.split('|').forEach((sl, si) => {
      g += `<text x="${ZX + ZR + 20}" y="${zy + 32 + si * 15}" fill="#8da0b8" font-size="11">${esc(sl)}</text>`;
    });
  });
  g += '</svg>';
  return g + (foot ? `<div style="margin-top:10px;color:#8da0b8;line-height:1.65;font-size:.8rem">${foot}</div>` : '');
}

/** Occupancy row: one square per channel, filled when the channel is in use. */
export function occRow(name: string, total: number, used: number, cols?: string[]): string {
  let g = `<svg viewBox="0 0 1000 52" style="width:100%;display:block;font-family:'IBM Plex Mono',monospace">`;
  g += HALO;
  g += `<text x="6" y="32" fill="#e8eef6" font-size="14.5">${esc(name)}</text>`;
  const x0 = Math.max(360, 14 + name.length * 8.8);
  for (let i = 0; i < total; i++) {
    const c = cols ? cols[i % cols.length] : '#ffb454';
    if (i < used) {
      g += `<rect x="${x0 + i * 32}" y="14" width="24" height="24" rx="6" fill="${c}"/>`;
      g += `<rect x="${x0 + i * 32 - 3}" y="11" width="30" height="30" rx="8" fill="${c}" opacity=".18"/>`;
    } else {
      g += `<rect x="${x0 + i * 32}" y="14" width="24" height="24" rx="6" fill="none" stroke="#41e3d2" stroke-width="2" stroke-dasharray="4 3"/>`;
    }
  }
  const st = used < total ? `${used}/${total} · ${total - used} libres` : `${used}/${total} · sin vacantes`;
  g += `<text x="${x0 + total * 32 + 16}" y="32" fill="${used < total ? '#41e3d2' : '#8da0b8'}" font-size="13.5">${st}</text>`;
  g += '</svg>';
  return g;
}

/** Unified PAO panel: channel-by-channel occupancy of the CWDMs in Gijón. */
export function mkPAO(): string {
  const rows = [
    { name: 'CWDM 8133 · Occidental', n: 8, used: 8 },
    { name: 'CWDM 8140 · Suroccidental', n: 4, used: 2 },
    { name: 'CWDM 8133 · Suroriental', n: 8, used: 8 },
    { name: 'CWDM 8133 · Oriental', n: 8, used: 8 },
  ];
  const H = 118 + rows.length * 62;
  let g = `<svg viewBox="0 0 1180 ${H}" style="width:100%;display:block;font-family:'IBM Plex Mono',monospace">`;
  g += HALO;
  g += `<text x="10" y="26" fill="#e8eef6" font-size="17" font-weight="600">Sistemas de transporte en el PAO · ocupación canal a canal</text>`;
  rows.forEach((r, ri) => {
    const y = 70 + ri * 62;
    /* miniature mux, matching the CWDM breakdown */
    g += `<line x1="20" y1="${y - 4}" x2="66" y2="${y - 4}" stroke="#f2d024" stroke-width="2.6"/>`;
    g += `<line x1="20" y1="${y + 4}" x2="66" y2="${y + 4}" stroke="#f2d024" stroke-width="2.6"/>`;
    g += `<path d="M66,${y - 14} L96,${y - 24} L96,${y + 24} L66,${y + 14} Z" fill="#12233c" stroke="#41e3d2" stroke-width="1.3"/>`;
    g += `<text x="112" y="${y - 14}" fill="#e8eef6" font-size="14.5">${esc(r.name)}</text>`;
    for (let i = 0; i < r.n; i++) {
      const cx = 124 + i * 40, cy = y + 10;
      const c = CW8[i % 8];
      if (i < r.used) {
        g += `<circle cx="${cx}" cy="${cy}" r="12" fill="${c}"/>`;
        g += `<circle cx="${cx}" cy="${cy}" r="17" fill="${c}" opacity=".16"/>`;
      } else {
        g += `<circle cx="${cx}" cy="${cy}" r="12" fill="none" stroke="#41e3d2" stroke-width="2.2" stroke-dasharray="4 3"/>`;
      }
    }
    const st = r.used < r.n ? `${r.used}/${r.n} · ${r.n - r.used} LIBRES` : `${r.used}/${r.n} · sin vacantes`;
    g += `<text x="${124 + r.n * 40 + 18}" y="${y + 15}" fill="${r.used < r.n ? '#41e3d2' : '#8da0b8'}" font-size="13.5">${st}</text>`;
  });
  const yd = 70 + rows.length * 62;
  g += `<text x="112" y="${yd - 8}" fill="#e8eef6" font-size="14.5">Caudal / Aller / Nalón</text>`;
  g += `<line x1="124" y1="${yd + 8}" x2="470" y2="${yd + 8}" stroke="#f2d024" stroke-width="3.5"/>`;
  g += `<line x1="124" y1="${yd + 18}" x2="470" y2="${yd + 18}" stroke="#f2d024" stroke-width="3.5"/>`;
  g += `<line x1="124" y1="${yd + 13}" x2="470" y2="${yd + 13}" stroke="#f2d024" stroke-width="18" opacity=".12"/>`;
  g += `<text x="486" y="${yd + 18}" fill="#8da0b8" font-size="13.5">fibras DIRECTAS al 7750 de Mieres · sin CWDM</text>`;
  g += `<rect x="10" y="${yd + 34}" width="760" height="30" rx="8" fill="rgba(255,180,84,.12)" stroke="rgba(255,180,84,.5)"/>`;
  g += `<text x="24" y="${yd + 54}" fill="#ffb454" font-size="13">⚠ Enrutador 7750SR-7: 1 único puerto de 10 Gbps libre en toda la máquina</text>`;
  g += '</svg>';
  return g;
}

/* ---------- Phase 2 gantt ---------- */

const GW = 1080, GROW = 24, GTOP = 34, GLEFT = 190, GRIGHT = 20;
const GW0 = 13, GW1 = CONTRACT_WEEKS, GSPAN = GW1 - GW0 + 1;
const gx = (w: number) => GLEFT + (w - GW0) / GSPAN * (GW - GLEFT - GRIGHT);

export const ganttViewBox = (nodes: NetworkNode[]): string =>
  `0 0 ${GW} ${GTOP + nodes.length * GROW + 14}`;

/**
 * Week-by-week migration calendar: one bar per node, coloured by area.
 * Returns the inside of the <svg>; every bar carries data-node so the island
 * can open the node's record when it is clicked.
 */
export function gantt(nodes: NetworkNode[]): string {
  let g = '';
  for (let w = GW0; w <= GW1; w += 5) {
    g += `<line x1="${gx(w)}" y1="${GTOP - 8}" x2="${gx(w)}" y2="${GTOP + nodes.length * GROW}" stroke="#1c2c44" stroke-width="1"/>`;
    g += `<text x="${gx(w)}" y="${GTOP - 14}" fill="#5a6f8d" font-size="9" text-anchor="middle">s${w}</text>`;
  }
  nodes.forEach((n, i) => {
    const y = GTOP + i * GROW;
    const name = n.name + (HOST_ONLY.includes(n.id) ? ' *' : '');
    g += `<g data-node="${n.id}" style="cursor:pointer">`;
    g += `<text x="${GLEFT - 10}" y="${y + 15}" fill="#8da0b8" font-size="10" text-anchor="end">${esc(name)}</text>`;
    g += `<rect x="${gx(n.weekFrom)}" y="${y + 4}" width="${Math.max(gx(n.weekTo + 1) - gx(n.weekFrom), 8)}" height="13" rx="4" fill="${n.color}" opacity="0.85"/>`;
    g += `<text x="${gx(n.weekTo + 1) + 6}" y="${y + 15}" fill="#5a6f8d" font-size="8.5">${n.weekFrom}–${n.weekTo}</text>`;
    g += `</g>`;
  });
  return g;
}
