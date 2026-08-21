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
import {
  CONTRACT_WEEKS,
  HOST_ONLY,
  type NetworkNode,
  type PaoTransport,
  type WdmBand,
} from './data';
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

/**
 * Tube and fibre colour code, per the TIA-598 standard.
 *
 * These are the standard's colours and never the theme's, so they stay
 * literal where the rest of this module takes CSS custom properties. Index 5
 * is «blanco» and happens to be the same value the old dark theme used for
 * text — swapping it for var(--txt) would turn the white fibre dark on a
 * light page, which is a standards table quietly corrupted.
 */
export const TIA = [
  '#3f6fd8',
  '#e8923a',
  '#3fae5a',
  '#9a6a42',
  '#9aa0a6',
  '#e8eef6',
  '#e05252',
  '#3a3f47',
  '#e8d24a',
  '#b57edc',
  '#e88ab8',
  '#4ad8d8',
];

export const TIAN = [
  'azul',
  'naranja',
  'verde',
  'marrón',
  'gris',
  'blanco',
  'rojo',
  'negro',
  'amarillo',
  'violeta',
  'rosa',
  'aqua',
];

/** The 8 CWDM colours in λ order, for the channel occupancy rows. */
export const CW8 = [
  '#9aa0a6',
  '#b57edc',
  '#4a7bd8',
  '#3fae5a',
  '#e8d24a',
  '#e8923a',
  '#e05252',
  '#9a6a42',
];

const HALO =
  '<style>text{paint-order:stroke;stroke:var(--panel);stroke-width:3px;stroke-linejoin:round}</style>';

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
  g += `<text x="8" y="20" fill="var(--txt)" font-size="14" font-weight="600">${esc(title)}</text>`;
  const muxX = 120,
    muxY = H / 2 + 8;
  g += `<line x1="10" y1="${muxY - 4}" x2="${muxX - 28}" y2="${muxY - 4}" stroke="#f2d024" stroke-width="3"/>`;
  g += `<line x1="10" y1="${muxY + 4}" x2="${muxX - 28}" y2="${muxY + 4}" stroke="#f2d024" stroke-width="3"/>`;
  g += `<line x1="10" y1="${muxY}" x2="${muxX - 28}" y2="${muxY}" stroke="#f2d024" stroke-width="14" opacity=".14"/>`;
  g += `<path d="M${muxX - 28},${muxY - 16} L${muxX + 8},${muxY - (ordered.length * 34) / 2} L${muxX + 8},${muxY + (ordered.length * 34) / 2} L${muxX - 28},${muxY + 16} Z" fill="var(--panel2)" stroke="var(--xgs)" stroke-width="1.4"/>`;
  /* Fixed under the title rather than pinned above the mux (muxY-relative):
     the fan of lines from the mux to each channel converges on muxY, so at
     4+ channels that spot is the busiest point in the whole drawing, and
     this label is long enough to run straight through it. Every fan line's
     highest point is y=44 (channel 0's own endpoint) regardless of channel
     count, so a fixed row here is clear no matter how many channels there
     are, instead of only for however few happened to leave it room. */
  g += `<text x="8" y="36" fill="var(--muted)" font-size="9.5">2 ff.oo. alquiladas (par) → Gijón</text>`;
  g += `<text x="${muxX - 10}" y="${muxY + 4}" fill="var(--xgs-tx)" font-size="9" text-anchor="middle" transform="rotate(-90 ${muxX - 10} ${muxY})">CWDM MUX</text>`;
  ordered.forEach((ch, i) => {
    const y = 44 + i * 34;
    const [col, cname] = LCOL[ch.l]!;
    const dash = ch.free ? 'stroke-dasharray="6 5"' : '';
    g += `<line x1="${muxX + 8}" y1="${muxY}" x2="196" y2="${y}" stroke="${col}" stroke-width="2.4" ${dash} opacity="${ch.free ? 0.55 : 0.95}"/>`;
    g += `<line x1="196" y1="${y}" x2="360" y2="${y}" stroke="${col}" stroke-width="3" ${dash}/>`;
    if (!ch.free)
      g += `<line x1="196" y1="${y}" x2="360" y2="${y}" stroke="${col}" stroke-width="9" opacity=".22"/>`;
    g += `<circle cx="372" cy="${y}" r="7" fill="${ch.free ? 'none' : col}" stroke="${col}" stroke-width="2"/>`;
    g += `<text x="204" y="${y - 6}" fill="${col}" font-size="10.5" font-weight="600">${ch.l} nm · ${esc(cname)}</text>`;
    g += `<text x="388" y="${y + 4}" fill="${ch.free ? 'var(--xgs-tx)' : 'var(--txt)'}" font-size="11.5" ${ch.free ? 'font-weight="600"' : ''}>${ch.free ? 'VACANTE' : esc(ch.to ?? '')}</text>`;
  });
  g += '</svg>';
  return (
    g +
    (foot
      ? `<div style="margin-top:8px;padding-left:8px;padding-right:8px;color:var(--muted)">${foot}</div>`
      : '')
  );
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

/** Break `text` at a word boundary into at most two lines, each within
 *  `maxChars` — used where a zoom label runs past the edge of the canvas. */
function wrapTwo(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const words = text.split(' ');
  let line1 = '';
  for (const w of words) {
    const next = line1 ? `${line1} ${w}` : w;
    if (next.length > maxChars) break;
    line1 = next;
  }
  if (!line1) return [text]; /* a single word longer than maxChars: leave it be */
  return [line1, text.slice(line1.length).trim()];
}

/** XL cable cut: circular section, tubes with their fibres and radial labels. */
export function mkSection(
  title: string,
  nT: number,
  marks: SectionMarks = {},
  zooms: SectionZoom[] = [],
  foot = '',
): string {
  const labels = marks.labels || [];
  const H = Math.max(430, 90 + zooms.length * 170);
  let g = `<svg viewBox="0 0 1180 ${H}" style="width:100%;display:block;font-family:'IBM Plex Mono',monospace">`;
  g += HALO;
  g += `<text x="10" y="26" fill="var(--txt)" font-size="17" font-weight="600">${esc(title)}</text>`;
  const CX = 330,
    CY = H / 2 + 26,
    Rsh = 136;
  /* sheath, armour and central strength member */
  g += `<circle cx="${CX}" cy="${CY}" r="${Rsh}" fill="#14181f" stroke="var(--line)" stroke-width="8"/>`;
  g += `<circle cx="${CX}" cy="${CY}" r="${Rsh - 12}" fill="none" stroke="var(--line)" stroke-width="3"/>`;
  g += `<circle cx="${CX}" cy="${CY}" r="15" fill="#5a6270"/>`;
  g += `<text x="${CX}" y="${CY + 4}" fill="#20242a" font-size="9" text-anchor="middle">alma</text>`;
  g += `<text x="${CX - Rsh + 4}" y="${CY - Rsh + 2}" fill="var(--dim)" font-size="11">cubierta</text>`;
  const ring1 = Math.min(nT, 12),
    ring2 = nT - ring1;
  const tubePos: Record<number, [number, number]> = {};
  const tubeAng: Record<number, number> = {};
  function placeRing(count: number, offset: number, rad: number, tr: number) {
    for (let i = 0; i < count; i++) {
      const idx = offset + i + 1;
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / count;
      const x = CX + Math.cos(a) * rad,
        y = CY + Math.sin(a) * rad;
      tubePos[idx] = [x, y];
      tubeAng[idx] = a;
      const col = TIA[(idx - 1) % 12]!;
      const nf = (marks.nf || []).includes(idx),
        dead = (marks.dead || []).includes(idx),
        acc = (marks.access || []).includes(idx);
      g += `<circle cx="${x}" cy="${y}" r="${tr}" fill="${col}" opacity="${nf ? 0.3 : 1}" stroke="${acc ? '#41e3d2' : '#060b14'}" stroke-width="${acc ? 3.4 : 1.8}"/>`;
      if (acc)
        g += `<circle cx="${x}" cy="${y}" r="${tr + 6}" fill="none" stroke="var(--xgs)" stroke-width="1.4" opacity=".55"/>`;
      for (let f = 0; f < 8; f++) {
        const fa = -Math.PI / 2 + (f * Math.PI) / 4;
        const fx = x + Math.cos(fa) * (tr * 0.58),
          fy = y + Math.sin(fa) * (tr * 0.58);
        g += `<circle cx="${fx}" cy="${fy}" r="${tr * 0.16}" fill="${TIA[f]}" opacity="${nf ? 0.3 : 0.95}" stroke="#060b14" stroke-width=".6"/>`;
      }
      /* Contrast against the fibre's own colour, not against the page, so
         these two stay literal while everything else here takes a token: on
         white, yellow, grey or aqua the number has to go dark whichever
         theme the site is in. The name used to be darkCol, which said the
         opposite of what it selects. */
      const lightFibre = ['#e8eef6', '#e8d24a', '#9aa0a6', '#4ad8d8'].includes(col);
      g += `<text x="${x}" y="${y + 4.5}" fill="${lightFibre ? '#20242a' : '#e8eef6'}" font-size="12" text-anchor="middle" font-weight="700" opacity="${nf ? 0.5 : 1}">${idx}</text>`;
      if (dead)
        g += `<text x="${x + tr - 4}" y="${y - tr + 8}" fill="var(--danger)" font-size="15" font-weight="700">✕</text>`;
    }
  }
  if (ring2 > 0) {
    placeRing(ring1, 0, 92, 15);
    placeRing(ring2, ring1, 46, 13);
  } else {
    placeRing(ring1, 0, nT > 8 ? 88 : 82, nT > 8 ? 18 : 24);
  }
  const CHAR_W = 7.4; /* advance width of IBM Plex Mono at 12.5px, for the clamps below */
  const MARGIN = 10;
  /* large zooms, drawn before the radial labels below: a zoom's leader line
     can run right past where a label sits (both converge on the same tube),
     and painting the label — with its own halo — on top afterwards is what
     keeps the line from visibly cutting through the label's text. */
  zooms.forEach((z, zi) => {
    const zy = 100 + zi * 170,
      ZX = 760,
      ZR = 58;
    const [tx, ty] = tubePos[z.t] || [CX, CY];
    g += `<line x1="${tx}" y1="${ty}" x2="${ZX - ZR + 6}" y2="${zy - ZR * 0.5}" stroke="var(--xgs)" stroke-width="1.1" opacity=".45"/>`;
    g += `<line x1="${tx}" y1="${ty}" x2="${ZX - ZR + 6}" y2="${zy + ZR * 0.5}" stroke="var(--xgs)" stroke-width="1.1" opacity=".45"/>`;
    const tcol = TIA[(z.t - 1) % 12]!;
    g += `<circle cx="${ZX}" cy="${zy}" r="${ZR}" fill="var(--panel)" stroke="${tcol}" stroke-width="6"/>`;
    for (let f = 0; f < 8; f++) {
      const fa = -Math.PI / 2 + (f * Math.PI) / 4;
      const fx = ZX + Math.cos(fa) * 35,
        fy = zy + Math.sin(fa) * 35;
      const col = TIA[f];
      let st: string;
      if (z.nf) st = `fill="var(--panel2)" stroke="var(--line)" stroke-width="1.4"`;
      else if (z.oc == null) st = `fill="${col}" stroke="#060b14" stroke-width="1"`;
      else if (f < z.oc) {
        g += `<circle cx="${fx}" cy="${fy}" r="15" fill="${col}" opacity=".22"/>`;
        st = `fill="${col}" stroke="#060b14" stroke-width="1"`;
      } else st = `fill="none" stroke="var(--xgs)" stroke-width="2.2" stroke-dasharray="3.5 3.5"`;
      g += `<circle cx="${fx}" cy="${fy}" r="9" ${st}/>`;
      g += `<text x="${fx}" y="${fy + 3.5}" fill="${f < (z.oc ?? 8) && !z.nf ? '#0c1524' : '#41e3d2'}" font-size="8" text-anchor="middle" stroke="none">${f + 1}</text>`;
    }
    if (z.nf)
      g += `<text x="${ZX}" y="${zy + 6}" fill="var(--danger)" font-size="20" text-anchor="middle" font-weight="700">✕</text>`;
    const labelLines = wrapTwo(z.label, Math.floor((1180 - (ZX + ZR + 20) - MARGIN) / 9));
    labelLines.forEach((ln, li) => {
      const ly = zy - 20 - (labelLines.length - 1 - li) * 17;
      g += `<text x="${ZX + ZR + 20}" y="${ly}" fill="var(--txt)" font-size="15" font-weight="600">${esc(ln)}</text>`;
    });
    if (z.oc != null && !z.nf) {
      g += `<circle cx="${ZX + ZR + 28}" cy="${zy + 4}" r="6.5" fill="${tcol}"/>`;
      g += `<text x="${ZX + ZR + 42}" y="${zy + 9}" fill="var(--muted)" font-size="13">${z.oc} ocupadas</text>`;
      g += `<circle cx="${ZX + ZR + 178}" cy="${zy + 4}" r="6.5" fill="none" stroke="var(--xgs)" stroke-width="1.8" stroke-dasharray="3 3"/>`;
      g += `<text x="${ZX + ZR + 192}" y="${zy + 9}" fill="var(--xgs-tx)" font-size="13">${8 - z.oc} vacantes</text>`;
    }
    if (z.sub)
      z.sub.split('|').forEach((sl, si) => {
        g += `<text x="${ZX + ZR + 20}" y="${zy + 32 + si * 15}" fill="var(--muted)" font-size="11">${esc(sl)}</text>`;
      });
  });
  /* radial labels, one per tube group */
  labels.forEach((L) => {
    const angs = L.tubes.map((t) => tubeAng[t]).filter((a): a is number => a !== undefined);
    if (!angs.length) return;
    /* circular mean angle */
    let sx = 0,
      sy = 0;
    angs.forEach((a) => {
      sx += Math.cos(a);
      sy += Math.sin(a);
    });
    /* A tube set spread evenly around the circle (e.g. "all of them") sums to
       a near-zero vector, and atan2 on floating-point noise near (0, 0) picks
       an arbitrary quadrant instead of a meaningful direction — that quadrant
       has landed the label past the edge of the canvas before now. Snap that
       degenerate case to a fixed, safe direction instead of trusting the noise. */
    const am = Math.hypot(sx, sy) < 1e-6 ? 0 : Math.atan2(sy, sx);
    const ex = CX + Math.cos(am) * (Rsh + 14),
      ey = CY + Math.sin(am) * (Rsh + 14);
    const lx = CX + Math.cos(am) * (Rsh + 44),
      ly = CY + Math.sin(am) * (Rsh + 44);
    L.tubes.forEach((t) => {
      const [tx, ty] = tubePos[t] || [CX, CY];
      g += `<line x1="${tx + Math.cos(tubeAng[t]!) * 20}" y1="${ty + Math.sin(tubeAng[t]!) * 20}" x2="${ex}" y2="${ey}" stroke="${L.color || 'var(--muted)'}" stroke-width="1" opacity=".5"/>`;
    });
    g += `<line x1="${ex}" y1="${ey}" x2="${lx}" y2="${ly}" stroke="${L.color || 'var(--muted)'}" stroke-width="1.2"/>`;
    const parts = L.text.split('|');
    const textW = Math.max(...parts.map((p) => p.length)) * CHAR_W;
    const vertical = Math.abs(Math.cos(am)) < 0.35; /* group above or below: centre the text */
    let anchor: string, tx0: number, baseY: number;
    if (vertical) {
      anchor = 'middle';
      tx0 = Math.min(Math.max(lx, MARGIN + textW / 2), 1180 - MARGIN - textW / 2);
      baseY = ly + (Math.sin(am) < 0 ? -6 - (parts.length - 1) * 16 : 14);
    } else {
      const right = Math.cos(am) > 0;
      anchor = right ? 'start' : 'end';
      tx0 = right ? Math.min(lx + 6, 1180 - MARGIN - textW) : Math.max(lx - 6, MARGIN + textW);
      baseY = ly + 4 - (parts.length - 1) * 8;
    }
    /* keep every line inside the viewBox top-to-bottom the same way, whether
       the overflow is a real label direction or the fallback above — and
       clear the title's own baseline by more than a hair, since an
       upward-pointing label (bold first line, same as the title) lands
       close enough at 34 to read as touching it. */
    const firstY = baseY,
      lastY = baseY + (parts.length - 1) * 16;
    if (firstY < 52) baseY += 52 - firstY;
    else if (lastY > H - MARGIN) baseY -= lastY - (H - MARGIN);
    parts.forEach((p, pi) => {
      g += `<text x="${tx0}" y="${baseY + pi * 16}" fill="${L.color || 'var(--muted)'}" font-size="12.5" text-anchor="${anchor}" font-weight="${pi === 0 ? '600' : '400'}">${esc(p)}</text>`;
    });
  });
  g += '</svg>';
  return (
    g +
    (foot
      ? `<div style="margin-top:10px;padding-left:10px;padding-right:10px;color:var(--muted);line-height:1.65;font-size:.8rem">${foot}</div>`
      : '')
  );
}

/** Occupancy row: one square per channel, filled when the channel is in use. */
export function occRow(name: string, total: number, used: number, cols?: string[]): string {
  let g = `<svg viewBox="0 0 1000 52" style="width:100%;display:block;font-family:'IBM Plex Mono',monospace">`;
  g += HALO;
  g += `<text x="6" y="32" fill="var(--txt)" font-size="14.5">${esc(name)}</text>`;
  const x0 = Math.max(360, 14 + name.length * 8.8);
  for (let i = 0; i < total; i++) {
    const c = cols ? cols[i % cols.length] : 'var(--gpon)';
    if (i < used) {
      g += `<rect x="${x0 + i * 32}" y="14" width="24" height="24" rx="6" fill="${c}"/>`;
      g += `<rect x="${x0 + i * 32 - 3}" y="11" width="30" height="30" rx="8" fill="${c}" opacity=".18"/>`;
    } else {
      g += `<rect x="${x0 + i * 32}" y="14" width="24" height="24" rx="6" fill="none" stroke="var(--xgs)" stroke-width="2" stroke-dasharray="4 3"/>`;
    }
  }
  const st =
    used < total ? `${used}/${total} · ${total - used} libres` : `${used}/${total} · sin vacantes`;
  g += `<text x="${x0 + total * 32 + 16}" y="32" fill="${used < total ? 'var(--xgs-tx)' : 'var(--muted)'}" font-size="13.5">${st}</text>`;
  g += '</svg>';
  return g;
}

/** Unified PAO panel: channel-by-channel occupancy of the CWDMs in Gijón.
 *  The figures are pliego data and live in content.json (PAO_TRANSPORT), not
 *  here — this only draws whatever it is handed, like every other generator
 *  in this file. */
export function mkPAO(t: PaoTransport): string {
  const { rows } = t;
  const yd = 70 + rows.length * 62; /* y where the rows end and the direct-fibre line starts */
  /* yd, then the direct-fibre line (yd+8..yd+18) and the warning banner
     (yd+34, height 30) below it, plus a bottom margin */
  const H = yd + 64 + 12;
  let g = `<svg viewBox="0 0 1180 ${H}" style="width:100%;display:block;font-family:'IBM Plex Mono',monospace">`;
  g += HALO;
  g += `<text x="10" y="26" fill="var(--txt)" font-size="17" font-weight="600">Sistemas de transporte en el PAO · ocupación canal a canal</text>`;
  rows.forEach((r, ri) => {
    const y = 70 + ri * 62;
    /* miniature mux, matching the CWDM breakdown */
    g += `<line x1="20" y1="${y - 4}" x2="66" y2="${y - 4}" stroke="#f2d024" stroke-width="2.6"/>`;
    g += `<line x1="20" y1="${y + 4}" x2="66" y2="${y + 4}" stroke="#f2d024" stroke-width="2.6"/>`;
    g += `<path d="M66,${y - 14} L96,${y - 24} L96,${y + 24} L66,${y + 14} Z" fill="var(--panel2)" stroke="var(--xgs)" stroke-width="1.3"/>`;
    g += `<text x="112" y="${y - 14}" fill="var(--txt)" font-size="14.5">${esc(r.name)}</text>`;
    for (let i = 0; i < r.channels; i++) {
      const cx = 124 + i * 40,
        cy = y + 10;
      const c = CW8[i % 8];
      if (i < r.used) {
        g += `<circle cx="${cx}" cy="${cy}" r="12" fill="${c}"/>`;
        g += `<circle cx="${cx}" cy="${cy}" r="17" fill="${c}" opacity=".16"/>`;
      } else {
        g += `<circle cx="${cx}" cy="${cy}" r="12" fill="none" stroke="var(--xgs)" stroke-width="2.2" stroke-dasharray="4 3"/>`;
      }
    }
    const st =
      r.used < r.channels
        ? `${r.used}/${r.channels} · ${r.channels - r.used} LIBRES`
        : `${r.used}/${r.channels} · sin vacantes`;
    g += `<text x="${124 + r.channels * 40 + 18}" y="${y + 15}" fill="${r.used < r.channels ? 'var(--xgs-tx)' : 'var(--muted)'}" font-size="13.5">${st}</text>`;
  });
  g += `<text x="112" y="${yd - 8}" fill="var(--txt)" font-size="14.5">${esc(t.directLabel)}</text>`;
  g += `<line x1="112" y1="${yd + 8}" x2="470" y2="${yd + 8}" stroke="#f2d024" stroke-width="3.5"/>`;
  g += `<line x1="112" y1="${yd + 18}" x2="470" y2="${yd + 18}" stroke="#f2d024" stroke-width="3.5"/>`;
  g += `<line x1="112" y1="${yd + 13}" x2="470" y2="${yd + 13}" stroke="#f2d024" stroke-width="18" opacity=".12"/>`;
  g += `<text x="486" y="${yd + 18}" fill="var(--muted)" font-size="13.5">${esc(t.directNote)}</text>`;
  g += `<rect x="10" y="${yd + 34}" width="760" height="30" rx="8" fill="rgba(255,180,84,.12)" stroke="rgba(255,180,84,.5)"/>`;
  g += `<text x="24" y="${yd + 54}" fill="var(--gpon-tx)" font-size="13">${esc(t.warning)}</text>`;
  g += '</svg>';
  return g;
}

/* ---------- Phase 2 gantt ---------- */

const GW = 1080,
  GROW = 24,
  GTOP = 34,
  GLEFT = 190,
  GRIGHT = 20;
const GW0 = 13,
  GW1 = CONTRACT_WEEKS,
  GSPAN = GW1 - GW0 + 1;
const gx = (w: number) => GLEFT + ((w - GW0) / GSPAN) * (GW - GLEFT - GRIGHT);

export const ganttViewBox = (nodes: NetworkNode[]): string =>
  `0 0 ${GW} ${GTOP + nodes.length * GROW + 14}`;

/**
 * Mobile alternative to gantt(): the same week-by-week calendar as a
 * stacked list instead of an svg plotted against a shared week axis —
 * scaled down to phone width, a single 1080-unit viewBox either forces
 * horizontal scroll (the min-width floor this replaced) or shrinks 20 rows
 * of names and dates below legibility, and unlike the schematic map or the
 * end-to-end diagram, a gantt's row labels and bars can't be panned to
 * independently: they're both text on the same line, so zooming in on one
 * loses the other. Same information per row as gantt() — name, area colour,
 * week range, and where that range sits in the full contract span, this
 * time as a div's proportional width instead of a plotted bar — and every
 * row keeps data-node so the same click-to-open wiring works on both.
 */
export function ganttList(nodes: NetworkNode[]): string {
  return nodes
    .map((n) => {
      const name = n.name + (HOST_ONLY.includes(n.id) ? ' *' : '');
      const left = ((n.weekFrom - GW0) / GSPAN) * 100;
      const width = Math.max(((n.weekTo + 1 - n.weekFrom) / GSPAN) * 100, 1.5);
      return `<div class="gr" data-node="${n.id}">
        <div class="gr-name">${esc(name)}</div>
        <div class="gr-track"><div class="gr-bar" style="left:${left}%;width:${width}%;background:${n.color}"></div></div>
        <div class="gr-weeks">s${n.weekFrom}–${n.weekTo}</div>
      </div>`;
    })
    .join('');
}

/**
 * Week-by-week migration calendar: one bar per node, coloured by area.
 * Returns the inside of the <svg>; every bar carries data-node so the island
 * can open the node's record when it is clicked.
 */
export function gantt(nodes: NetworkNode[]): string {
  let g = '';
  for (let w = GW0; w <= GW1; w += 5) {
    g += `<line x1="${gx(w)}" y1="${GTOP - 8}" x2="${gx(w)}" y2="${GTOP + nodes.length * GROW}" stroke="var(--line)" stroke-width="1"/>`;
    g += `<text x="${gx(w)}" y="${GTOP - 14}" fill="var(--dim)" font-size="9" text-anchor="middle">s${w}</text>`;
  }
  nodes.forEach((n, i) => {
    const y = GTOP + i * GROW;
    const name = n.name + (HOST_ONLY.includes(n.id) ? ' *' : '');
    g += `<g data-node="${n.id}" style="cursor:pointer">`;
    g += `<text x="${GLEFT - 10}" y="${y + 15}" fill="var(--muted)" font-size="10" text-anchor="end">${esc(name)}</text>`;
    g += `<rect x="${gx(n.weekFrom)}" y="${y + 4}" width="${Math.max(gx(n.weekTo + 1) - gx(n.weekFrom), 8)}" height="13" rx="4" fill="${n.color}" opacity="0.85"/>`;
    g += `<text x="${gx(n.weekTo + 1) + 6}" y="${y + 15}" fill="var(--dim)" font-size="8.5">${n.weekFrom}–${n.weekTo}</text>`;
    g += `</g>`;
  });
  return g;
}

/**
 * The wavelength ruler for Architecture.astro's «Dos generaciones sobre el
 * mismo hilo»: one fibre drawn as a bar, with the occupied bands as
 * segments on it. Bands and axis span are figures the caller passes in
 * (XGS_EXPLAINER, ultimately content.json) — this function draws them, it
 * does not know they are ITU-T norm data rather than pliego data. The page
 * around it is what has to say that; see the `source` note it renders next
 * to this figure.
 *
 * Labels alternate between two tiers with a leader line down to their band,
 * because the narrowest band here is under 3% of the axis and no label
 * fits inside one.
 */
export function mkSpectrum(bands: WdmBand[], axisFrom: number, axisTo: number): string {
  const W = 1000,
    BAR_Y = 74,
    BAR_H = 34,
    AXIS_Y = 122;
  const span = axisTo - axisFrom;
  const x = (nm: number) => ((nm - axisFrom) / span) * W;

  const kindVar: Record<WdmBand['kind'], string> = {
    gpon: 'var(--gpon)',
    xgs: 'var(--xgs)',
    video: 'var(--dim)',
  };
  /* --gpon and --xgs are the vivid brand colours the band fill wants, but at
     1.6-2:1 they fail as text on a light panel — that's what their -tx
     variants are for; --dim already reads fine as text in both themes. */
  const kindTextVar: Record<WdmBand['kind'], string> = {
    gpon: 'var(--gpon-tx)',
    xgs: 'var(--xgs-tx)',
    video: 'var(--dim)',
  };

  let g = `<rect x="0" y="${BAR_Y}" width="${W}" height="${BAR_H}" rx="3" fill="var(--panel2)" stroke="var(--line)"/>`;
  bands.forEach((b, i) => {
    const bx = x(b.lo),
      bw = Math.max(x(b.hi) - bx, 2);
    g += `<rect x="${bx}" y="${BAR_Y}" width="${bw}" height="${BAR_H}" fill="${kindVar[b.kind]}"/>`;
    const mid = bx + bw / 2;
    const tierA = i % 2 === 0;
    const labelY = tierA ? 8 : 48;
    /* Tier B's label sits closer to the bar than tier A's, so its leader is
       shorter — but it still has to land in the gap *above* the bar (62 to
       74), not inside it. It used to run 84→82, which is 10 to 8 px into
       the band's own fill (74–108): a two-pixel stroke sitting on top of
       whatever colour the band already was, all but invisible except as a
       stray mark on the edge of the amber GPON ↑ band. */
    const leadY1 = tierA ? 44 : 66;
    const leadY2 = BAR_Y - 2;
    g += `<line x1="${mid}" y1="${leadY1}" x2="${mid}" y2="${leadY2}" stroke="var(--line)" stroke-width="1"/>`;
    g += `<text x="${mid}" y="${labelY}" fill="${kindTextVar[b.kind]}" font-size="12" font-weight="600" text-anchor="middle">${esc(b.label)}</text>`;
    g += `<text x="${mid}" y="${labelY + 14}" fill="var(--muted)" font-size="10.5" text-anchor="middle">${b.lo}–${b.hi}</text>`;
  });

  g += `<line x1="0" y1="${AXIS_Y}" x2="${W}" y2="${AXIS_Y}" stroke="var(--line)" stroke-width="1"/>`;
  const ticks: number[] = [];
  for (let nm = Math.ceil(axisFrom / 50) * 50; nm <= axisTo; nm += 50) ticks.push(nm);
  ticks.forEach((nm, i) => {
    const tx = x(nm);
    /* the first and last tick sit at the viewBox edge, where a centred
       label would be clipped in half — the ruler's own "1250" reading "50"
       is what that looks like — so those two anchor off the edge instead */
    const anchor = i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle';
    g += `<line x1="${tx}" y1="${AXIS_Y}" x2="${tx}" y2="${AXIS_Y + 5}" stroke="var(--line)" stroke-width="1"/>`;
    g += `<text x="${tx}" y="${AXIS_Y + 17}" fill="var(--muted)" font-size="9.5" text-anchor="${anchor}">${nm}</text>`;
  });
  g += `<text x="${W}" y="${AXIS_Y + 34}" fill="var(--dim)" font-size="9" text-anchor="end">nm</text>`;
  /* letter-spacing="1" at font-size 9 is over a tenth of the glyph width —
     it read as "FIB RA" rather than tracked caps. 0.4 keeps the tracked-caps
     look without the gap. */
  g += `<text x="0" y="${AXIS_Y + 34}" fill="var(--dim)" font-size="9" text-anchor="start" letter-spacing="0.4">UNA SOLA FIBRA MONOMODO</text>`;
  return g;
}
