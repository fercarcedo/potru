/**
 * Pure geometry for map.ts's label placement pass: given a dot, its home
 * label position and a list of already-measured obstacle/cable rectangles,
 * picks the least-bad spot on a ring around the dot. Kept separate from
 * map.ts (and typed, unlike it) so the collision/scoring logic — the part
 * that actually had bugs («Pol. de Coaña» on «Navia», «Sevares» reading as a
 * cable caption) — is testable without a real renderer: happy-dom's
 * SVGGraphicsElement.getBBox() always returns a zero rect, so this logic
 * cannot be exercised through the DOM in tests, only through a real browser.
 * map.ts supplies the live `measure` callback (a getBBox() read per
 * candidate); tests supply a synthetic one.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Anchor = 'start' | 'middle' | 'end';

/** [dx, dy from the dot, text-anchor] */
export type Candidate = [number, number, Anchor];

/** A label's raw and padded (PAD-inflated) box at some candidate position. */
export interface Measurement {
  raw: Rect;
  padded: Rect;
}

const PAD = 1.6;

/** Pads a raw getBBox() rect into the box used for collision testing. */
export const box = (r: { x: number; y: number; width: number; height: number }, m = PAD): Rect => ({
  x: r.x - m,
  y: r.y - m,
  w: r.width + m * 2,
  h: r.height + m * 2,
});

export const hits = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export const overlapArea = (a: Rect, b: Rect): number =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/**
 * Spots around a dot of radius r, nearest first. `end`/`start` push the text
 * away from the dot instead of straddling it. Three rings of eight, so a
 * crowded dot has somewhere close to go before it has to drift.
 */
export const ringSpots = (r: number): Candidate[] => {
  const out: Candidate[] = [];
  for (const pad of [4, 10, 17, 26])
    for (const [ux, uy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
      [0.72, 0.72],
      [-0.72, 0.72],
      [0.72, -0.72],
      [-0.72, -0.72],
    ] as const) {
      const anc: Anchor = ux > 0.1 ? 'start' : ux < -0.1 ? 'end' : 'middle';
      /* the baseline sits at the foot of the text, so below the dot it has to
         clear the cap height too, and beside it drops to mid-height */
      const dy = uy > 0.1 ? uy * (r + pad) + 11 : uy < -0.1 ? uy * (r + pad) - 1 : 4;
      out.push([ux * (r + pad), dy, anc]);
    }
  return out;
};

/** Beyond this the label no longer reads as belonging to its dot and needs a
 *  leader line — which is a last resort, so it costs the solver dearly. */
export const LEADER = 16;

export interface PlaceLabelInput {
  ax: number;
  ay: number;
  ar: number;
  /** the label's as-drawn offset and anchor, tried first */
  home: Candidate;
  /** measures the label's box were it placed at this candidate */
  measure: (dx: number, dy: number, anchor: Anchor) => Measurement;
  /** other labels/markers/captions; a candidate may not overlap these */
  obstacles: Rect[];
  /** trunk cables and the shared-PON loop; a tie-breaker, not a hard block */
  cables: Rect[];
}

export interface PlaceLabelResult {
  dx: number;
  dy: number;
  anchor: Anchor;
  /** the padded box at the chosen position, for the next label's obstacles */
  box: Rect;
  /** true once the label sits far enough from its dot to need a leader line */
  needsLeader: boolean;
  /** the point on the label box closest to the dot, where a leader would land */
  leaderTarget: { x: number; y: number };
  /** distance from the dot to leaderTarget */
  gap: number;
}

/**
 * Picks a spot for one label: the home spot if it is clear, otherwise the
 * clear ring spot that needs no leader line, then the one off the cables,
 * then the one closest to home; if nothing is fully clear, the ring spot
 * that overlaps obstacles the least.
 */
export function placeLabel(input: PlaceLabelInput): PlaceLabelResult {
  const { ax, ay, ar, home, measure, obstacles, cables } = input;
  let clear: { dx: number; dy: number; anc: Anchor; m: Measurement; cost: number } | null = null;
  let least: { dx: number; dy: number; anc: Anchor; m: Measurement; cost: number } | null = null;

  const cands: Candidate[] = [home, ...ringSpots(ar)];
  for (let i = 0; i < cands.length; i++) {
    const [dx, dy, anc] = cands[i]!;
    const m = measure(dx, dy, anc);
    const hard = obstacles.reduce((a, o) => a + overlapArea(m.padded, o), 0);
    if (hard) {
      if (!least || hard < least.cost) least = { dx, dy, anc, m, cost: hard };
      continue;
    }
    /* Clear of everything solid. Now prefer, in this order: no leader line,
       then off the cables, then as close to home as possible. */
    const gap = Math.hypot(
      Math.max(m.raw.x, Math.min(ax, m.raw.x + m.raw.w)) - ax,
      Math.max(m.raw.y, Math.min(ay, m.raw.y + m.raw.h)) - ay,
    );
    const soft =
      (gap > LEADER ? 500 : 0) +
      gap * 2 +
      i * 0.5 +
      cables.reduce((a, o) => a + overlapArea(m.padded, o), 0);
    if (!clear || soft < clear.cost) clear = { dx, dy, anc, m, cost: soft };
  }

  const pick = clear ?? least!;
  const px = Math.max(pick.m.raw.x, Math.min(ax, pick.m.raw.x + pick.m.raw.w));
  const py = Math.max(pick.m.raw.y, Math.min(ay, pick.m.raw.y + pick.m.raw.h));
  const gap = Math.hypot(px - ax, py - ay);

  return {
    dx: pick.dx,
    dy: pick.dy,
    anchor: pick.anc,
    box: pick.m.padded,
    needsLeader: gap > LEADER,
    leaderTarget: { x: px, y: py },
    gap,
  };
}
