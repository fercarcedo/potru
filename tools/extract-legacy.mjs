#!/usr/bin/env node
/**
 * Extracts the dataset from the legacy single-page build
 * (asturcon-xgspon.html, produced by the build_site*.py Python scripts) into:
 *
 *   src/data/nodes.json   the 20 primary nodes + the PAO, without base64
 *   public/planos/*.jpg   the 105 plans from the pliego, as real files
 *
 * Usage:
 *   node tools/extract-legacy.mjs <path-to-legacy-html> [--no-images]
 *
 * The legacy HTML is NOT versioned (5.3 MB, mostly base64 duplicating the plans
 * that already live in public/planos). See docs/FUENTES.md.
 *
 * Important: the legacy file carries literal \uXXXX sequences inside its JS
 * strings, left there by the patch pipeline, so the DATA object is located by
 * brace matching and parsed as JSON — never manipulated as plain text.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// "planos" stays in the public path: it is part of the site's Spanish URLs.
const PLANS_DIR = join(ROOT, 'public', 'planos');
const DATA_FILE = join(ROOT, 'src', 'data', 'nodes.json');

const args = process.argv.slice(2);
const writeImages = !args.includes('--no-images');
const legacyPath = args.find((a) => !a.startsWith('--'));

if (!legacyPath) {
  console.error('usage: node tools/extract-legacy.mjs <path-to-legacy-html> [--no-images]');
  process.exit(1);
}

/** Locates `const DATA = {…}` and returns it parsed. */
function readLegacyData(html) {
  const marker = html.indexOf('const DATA = {');
  if (marker < 0) throw new Error('`const DATA = {` not found in the legacy HTML');
  const start = html.indexOf('{', marker);
  let depth = 0;
  let end = start;
  for (; end < html.length; end++) {
    const c = html[end];
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) break;
  }
  return JSON.parse(html.slice(start, end + 1));
}

/**
 * Intrinsic size of a JPEG, read from its SOF marker. Stored in the JSON so the
 * <img> tags can carry width/height and the gallery does not shift on load.
 */
function jpegSize(buf) {
  let i = 2; // skip SOI
  while (i < buf.length) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    // SOF0..SOF15 except DHT (c4), JPG (c8) and DAC (cc)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error('JPEG SOF marker not found');
}

/** `data:image/jpeg;base64,…` → Buffer */
function decode(dataUri) {
  const comma = dataUri.indexOf(',');
  if (comma < 0 || !dataUri.startsWith('data:image/jpeg;base64,')) {
    throw new Error('expected a base64 JPEG data URI');
  }
  return Buffer.from(dataUri.slice(comma + 1), 'base64');
}

const html = readFileSync(legacyPath, 'utf8');
const DATA = readLegacyData(html);

if (writeImages) {
  rmSync(PLANS_DIR, { recursive: true, force: true });
  mkdirSync(PLANS_DIR, { recursive: true });
}
mkdirSync(dirname(DATA_FILE), { recursive: true });

let imageCount = 0;

/**
 * Converts a legacy node into the site's shape: each plan's base64 string is
 * replaced by a gallery entry holding a relative path and its size. The order
 * reproduces the legacy modal: location first, then the interior plans.
 */
function convert(node) {
  const used = new Map();
  const entries = [['Ubicación', node.img, 'ubicacion'], ...(node.interior ?? [])];

  const gallery = entries.map(([label, dataUri, key]) => {
    // several nodes repeat a view (Tineo has two "Alzado derecho"): suffix -2, -3…
    const n = (used.get(key) ?? 0) + 1;
    used.set(key, n);
    const file = `${node.id}-${key}${n > 1 ? `-${n}` : ''}.jpg`;

    const buf = decode(dataUri);
    const { w, h } = jpegSize(buf);
    if (writeImages) writeFileSync(join(PLANS_DIR, file), buf);
    imageCount++;

    return { label, key, src: `planos/${file}`, w, h };
  });

  return {
    id: node.id,
    name: node.name,
    area: node.area,
    color: node.color,
    address: node.addr,
    enclosure: node.env,
    olts: node.olts,
    weekFrom: node.w0,
    weekTo: node.w1,
    extra: node.extra,
    actions: node.acts,
    towns: node.pobl,
    ...(node.poblNote ? { townsNote: node.poblNote } : {}),
    ...(node.ponGroups ? { ponGroups: node.ponGroups } : {}),
    gallery,
  };
}

const out = {
  nodes: DATA.nodes.map(convert),
  pao: convert(DATA.pao),
};

writeFileSync(DATA_FILE, JSON.stringify(out, null, 2) + '\n');

const written = writeImages ? readdirSync(PLANS_DIR).length : 0;
console.log(
  `nodes: ${out.nodes.length} + PAO · plans: ${imageCount}` +
    (writeImages ? ` (${written} files in public/planos)` : ' (not written)')
);
