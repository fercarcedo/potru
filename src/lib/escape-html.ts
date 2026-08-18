/**
 * Escapes free text — node names, OLT notes, town names, ONT model names —
 * before it goes into markup built by string concatenation (innerHTML, an
 * SVG <text> element). Used wherever graphics.ts, node-render.ts and the
 * client islands interpolate pliego-derived strings: none of the current
 * data contains '<' or '&', but nothing guarantees a future note or town
 * name won't, and unescaped interpolation there would corrupt the markup.
 */
export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
