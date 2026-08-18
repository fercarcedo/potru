/**
 * graphics.ts returns markup strings built at build time; these assert on
 * the *parsed* structure (element counts, attributes) rather than snapshotting
 * the string, since a snapshot would just get blindly -u'd on every visual
 * tweak without anyone reading it.
 */
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import { CW8, LCOL, TIA, TIAN, gantt, ganttViewBox, mkCWDM, mkPAO, mkSection, occRow } from '../../src/lib/graphics';
import { NODES } from '../../src/lib/data';
import type { Chan } from '../../src/lib/graphics';

// happy-dom's DOMParser only works bound to a Window (it needs the window's
// injected context). Parsed as 'text/html' via innerHTML, happy-dom's HTML
// tree builder mishandles the <style> the HALO constant puts inside every
// <svg> — it silently drops everything that follows it. Parsing as
// 'image/svg+xml' goes through the XML parser instead and is unaffected.
function parseSvg(markup: string) {
  const window = new Window();
  return new window.DOMParser().parseFromString(markup, 'image/svg+xml');
}

describe('colour tables', () => {
  it('TIA and TIAN line up, one colour/name per tube position', () => {
    expect(TIA).toHaveLength(TIAN.length);
  });

  it('every CWDM wavelength in LCOL is also one of the 8 CW8 colours', () => {
    for (const [color] of Object.values(LCOL)) {
      expect(CW8).toContain(color);
    }
  });
});

describe('mkCWDM', () => {
  const chans: Chan[] = [
    { l: 1531, to: 'Navia' },
    { l: 1491, free: true },
    { l: 1471, to: 'Tapia' },
  ];

  it('draws one lambda row per channel, sorted ascending by wavelength', () => {
    const doc = parseSvg(mkCWDM('Título', chans));
    const rowTexts = [...doc.querySelectorAll('text')]
      .map((t) => t.textContent || '')
      .filter((t) => /nm ·/.test(t));
    expect(rowTexts).toHaveLength(3);
    expect(rowTexts[0]).toContain('1471');
    expect(rowTexts[1]).toContain('1491');
    expect(rowTexts[2]).toContain('1531');
  });

  it('marks a free channel as VACANTE and colours it by its LCOL entry', () => {
    const doc = parseSvg(mkCWDM('Título', chans));
    const vacante = [...doc.querySelectorAll('text')].find((t) => t.textContent === 'VACANTE');
    expect(vacante).toBeTruthy();
    expect(vacante!.getAttribute('fill')).toBe('#41e3d2');
  });

  it('escapes a channel destination before writing it into the SVG text', () => {
    const doc = parseSvg(mkCWDM('T', [{ l: 1471, to: 'A & B <C>' }]));
    const dest = [...doc.querySelectorAll('text')].find((t) => (t.textContent || '').includes('A'));
    expect(dest?.textContent).toBe('A & B <C>');
  });
});

describe('mkSection', () => {
  it('draws exactly nT tube circles, cycling the TIA-598 colours past 12', () => {
    const doc = parseSvg(mkSection('Título', 16));
    // one big number label per tube (font-weight 700, text-anchor middle) —
    // count via the numbered index texts 1..16
    const labels = [...doc.querySelectorAll('text')]
      .map((t) => t.textContent)
      .filter((t) => t && /^\d+$/.test(t));
    const nums = labels.map(Number).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });

  it('rings an access tube in cyan', () => {
    const doc = parseSvg(
      mkSection('Título', 8, { access: [3] }, [], '')
    );
    const accessRing = [...doc.querySelectorAll('circle')].filter(
      (c) => c.getAttribute('stroke') === '#41e3d2' && c.getAttribute('fill') === 'none'
    );
    expect(accessRing.length).toBeGreaterThan(0);
  });

  it('marks a dead tube with a cross glyph', () => {
    const doc = parseSvg(mkSection('Título', 8, { dead: [2] }));
    const cross = [...doc.querySelectorAll('text')].find((t) => t.textContent === '✕');
    expect(cross).toBeTruthy();
    expect(cross!.getAttribute('fill')).toBe('#ff7d6b');
  });
});

describe('occRow', () => {
  it('fills exactly `used` squares out of `total`, in order', () => {
    const doc = parseSvg(occRow('Canal', 8, 5));
    // the width=24 rect is each square itself; a filled one also draws a
    // width=30 "glow" rect behind it, excluded here by the width filter
    const rects = [...doc.querySelectorAll('rect')].filter((r) => r.getAttribute('width') === '24');
    const filled = rects.filter((r) => r.getAttribute('fill') !== 'none');
    const free = rects.filter((r) => r.getAttribute('fill') === 'none');
    expect(filled.length).toBe(5);
    expect(free.length).toBe(3);
  });

  it('reports the free count in the trailing label when there is room left', () => {
    const doc = parseSvg(occRow('Canal', 8, 5));
    const label = [...doc.querySelectorAll('text')].find((t) => (t.textContent || '').includes('libres'));
    expect(label?.textContent).toContain('5/8');
    expect(label?.textContent).toContain('3 libres');
  });

  it('reports "sin vacantes" when fully occupied', () => {
    const doc = parseSvg(occRow('Canal', 4, 4));
    const label = [...doc.querySelectorAll('text')].find((t) => (t.textContent || '').includes('vacantes'));
    expect(label?.textContent).toContain('sin vacantes');
  });
});

describe('mkPAO', () => {
  it('renders without throwing and includes the transport-router warning', () => {
    const doc = parseSvg(mkPAO());
    const warn = [...doc.querySelectorAll('text')].find((t) => (t.textContent || '').includes('7750SR-7'));
    expect(warn).toBeTruthy();
  });
});

describe('gantt', () => {
  it('gives every bar a data-node and keeps weekFrom <= weekTo bars in linear x order', () => {
    const doc = parseSvg(`<svg viewBox="${ganttViewBox(NODES)}">${gantt(NODES)}</svg>`);
    const groups = [...doc.querySelectorAll('g[data-node]')];
    expect(groups).toHaveLength(NODES.length);
    const ids = groups.map((g) => g.getAttribute('data-node'));
    expect(ids).toEqual(NODES.map((n) => n.id));
  });

  it('makes each bar at least 8px wide even for a 1-week node', () => {
    const oneWeek = [{ ...NODES[0]!, weekFrom: 20, weekTo: 20 }];
    const doc = parseSvg(`<svg viewBox="${ganttViewBox(oneWeek)}">${gantt(oneWeek)}</svg>`);
    const rect = doc.querySelector('rect')!;
    expect(Number(rect.getAttribute('width'))).toBeGreaterThanOrEqual(8);
  });
});
