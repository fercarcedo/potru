/**
 * The pliego contradicts itself about two of Blimea's OLTs — BLI/1B records
 * six active GPON ports out of a total of five, BLI/9B twelve out of eleven —
 * and CLAUDE.md's golden rule is that such figures are transcribed as-is and
 * annotated, never quietly corrected.
 *
 * Annotated *where the reader is*, which is the part a test is worth writing
 * for. The note used to live in a `title` attribute: present in the markup,
 * so any test asserting "the note is rendered" would have passed, and
 * invisible to everyone who was not hovering a mouse over the right cell.
 * These assert the visible form instead — the discrepancy marked on the cell
 * it is in, and the sentence on the page.
 */
import { describe, expect, it } from 'vitest';
import { byId, ontCount } from '../../src/lib/data';
import { renderOltTable } from '../../src/lib/node-render';

const blimea = byId['blimea']!;
const HTML = renderOltTable(blimea);

/** The OLTs the pliego is inconsistent about, straight from the data. */
const noted = blimea.olts.filter((o) => o.note);

describe('the OLT table shows the pliego contradicting itself', () => {
  it('has something to test: Blimea carries two annotated OLTs', () => {
    expect(noted.map((o) => o.code)).toEqual(['BLI/1B', 'BLI/9B']);
  });

  it('marks the port cell, which is where the discrepancy is', () => {
    for (const o of noted) {
      expect(HTML).toContain(`<td class="mono warn">${o.portsActive} / ${o.portsTotal}`);
    }
  });

  it('leaves every consistent row unmarked', () => {
    /* one warn cell per annotated OLT and not one more */
    expect(HTML.match(/class="mono warn"/g)).toHaveLength(noted.length);
  });

  it('prints each note on the page, under the table', () => {
    for (const o of noted) {
      expect(HTML).toContain(o.note!);
      expect(HTML).toContain(`<b>${o.code}</b>`);
    }
  });

  it('never hides a note in a title attribute again', () => {
    expect(HTML).not.toContain('title=');
  });

  it('transcribes the contradictory figures exactly, without repairing them', () => {
    /* the temptation is to clamp active to total; the rule is not to */
    expect(HTML).toContain('6 / 5');
    expect(HTML).toContain('12 / 11');
  });

  it('still totals the node, and the total is the sum of the ONT column', () => {
    expect(HTML).toContain(`<tr class="total">`);
    expect(HTML).toContain(`>${ontCount(blimea)}<`);
  });

  it('renders nothing at all for a node with no OLT', () => {
    expect(renderOltTable(byId['pao']!)).toBe('');
  });

  it('adds no footnote row to a node the pliego is consistent about', () => {
    /* three nodes carry notes — muros, navia, blimea — so the clean case has
       to be picked from the data rather than assumed */
    const clean = Object.values(byId).filter(
      (n) => n.olts.length > 0 && !n.olts.some((o) => o.note),
    );
    expect(clean.length).toBeGreaterThan(0);
    for (const n of clean) {
      expect(renderOltTable(n), `${n.id} grew a footnote`).not.toContain('olt-notes');
      expect(renderOltTable(n), `${n.id} grew a warn cell`).not.toContain('mono warn');
    }
  });
});
