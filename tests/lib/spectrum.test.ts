/**
 * mkSpectrum() draws the wavelength ruler for Architecture.astro's «Dos
 * generaciones sobre el mismo hilo». The one bug worth a permanent test: a
 * centred label at the viewBox edge gets clipped in half by the SVG canvas —
 * "1250" first rendered as "50" — because text-anchor="middle" draws equally
 * either side of its x. The fix anchors the first and last tick off the
 * edge instead; this asserts that anchoring, not just that some text exists.
 */
import { describe, expect, it } from 'vitest';
import { mkSpectrum } from '../../src/lib/graphics';
import { XGS_EXPLAINER } from '../../src/lib/data';

const SVG = mkSpectrum(XGS_EXPLAINER.bands, XGS_EXPLAINER.axisFrom, XGS_EXPLAINER.axisTo);

describe('mkSpectrum', () => {
  it('anchors the first tick so its label reads outward, not clipped by the edge', () => {
    expect(SVG).toContain(`text-anchor="start">${XGS_EXPLAINER.axisFrom}</text>`);
  });

  it('anchors the last tick the same way, off the other edge', () => {
    /* ticks land every 50 nm from axisFrom; the last one at or under axisTo
       is not necessarily axisTo itself (1630 → last tick is 1600) */
    let lastTick = Math.ceil(XGS_EXPLAINER.axisFrom / 50) * 50;
    while (lastTick + 50 <= XGS_EXPLAINER.axisTo) lastTick += 50;
    expect(SVG).toContain(`text-anchor="end">${lastTick}</text>`);
  });

  it('never centre-anchors a tick at either edge again', () => {
    /* the specific regression: a middle-anchored label at x=0 or x=1000 */
    expect(SVG).not.toMatch(/x="0" y="\d+" fill="var\(--muted\)"[^>]*text-anchor="middle"/);
  });

  it('draws every band the data lists, and colours it by kind', () => {
    for (const b of XGS_EXPLAINER.bands) {
      expect(SVG).toContain(`>${b.label}<`);
      const fill = b.kind === 'video' ? 'var(--dim)' : `var(--${b.kind})`;
      expect(SVG).toContain(`fill="${fill}"`);
    }
  });

  it('keeps every band inside the axis span it is drawn against', () => {
    for (const b of XGS_EXPLAINER.bands) {
      expect(b.lo).toBeGreaterThanOrEqual(XGS_EXPLAINER.axisFrom);
      expect(b.hi).toBeLessThanOrEqual(XGS_EXPLAINER.axisTo);
      expect(b.hi).toBeGreaterThan(b.lo);
    }
  });

  it('writes only tokens, no hardcoded colour — this figure is not pliego data either', () => {
    expect(SVG.match(/#[0-9a-fA-F]{6}/g)).toBeNull();
  });
});

describe('XGS_EXPLAINER content', () => {
  it('carries a source note, since the wavelengths are ITU-T norm and not pliego data', () => {
    expect(XGS_EXPLAINER.source.length).toBeGreaterThan(20);
    expect(XGS_EXPLAINER.source).toMatch(/pliego/i);
  });

  it('names both generations', () => {
    expect(XGS_EXPLAINER.gpon.label).toMatch(/GPON/);
    expect(XGS_EXPLAINER.xgs.label).toMatch(/XGS-PON/);
  });
});
