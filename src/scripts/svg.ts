/**
 * The one SVG element factory the client islands share.
 *
 * map.ts, diagram.ts, tour.ts, hero-fiber.ts and map/place-labels.ts each
 * grew their own `createElementNS` helper (or repeated the namespace URI
 * inline), so the same four lines existed five times and the namespace
 * literal five more. They build different drawings but they all build them
 * the same way: create in the SVG namespace, set attributes, append.
 *
 * Values are coerced to strings explicitly, the same way `setAttribute`
 * already does at runtime — spelled out here only so the type checker sees
 * what the runtime always did.
 */
export const SVG_NS = 'http://www.w3.org/2000/svg';

export type SvgAttrs = Record<string, string | number>;

/** Creates one SVG element with its attributes, appended to `parent` when
 *  given. The tag is keyed off SVGElementTagNameMap, so the caller gets the
 *  concrete element type back (`SVGPathElement` for 'path', …). */
export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: SvgAttrs = {},
  parent?: Element
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) el.setAttribute(k, String(attrs[k]));
  parent?.appendChild(el);
  return el;
}
