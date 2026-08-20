/**
 * The two palettes have to declare the same tokens.
 *
 * This is the failure mode a themed site gets exactly once, and never sees in
 * review: a token defined only in the light block renders the dark page with
 * one colour from the wrong set — text from one theme on the other theme's
 * ground — and only for the visitors in that theme. There is no type system
 * over CSS custom properties, so a test is the only thing that catches a
 * token added to one block and forgotten in the other two.
 *
 * Three blocks, because there are three states: the bare :root (light), the
 * un-stamped default under prefers-color-scheme (the visitor who never
 * touched the toggle), and the explicit [data-theme='dark'] stamp.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync(join(__dirname, '../../src/styles/tokens.css'), 'utf8');

/** The custom properties declared in one `{ … }` block. */
function tokensIn(block: string): string[] {
  return [...block.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]!).sort();
}

/** Body of the first block whose selector line matches. */
function block(re: RegExp): string {
  const at = CSS.search(re);
  expect(at, `no block matching ${String(re)} in tokens.css`).toBeGreaterThan(-1);
  const open = CSS.indexOf('{', at);
  /* the blocks here are flat — no nested rules — so the first '}' closes it */
  return CSS.slice(open + 1, CSS.indexOf('}', open));
}

const LIGHT = tokensIn(block(/^:root \{/m));
const AUTO_DARK = tokensIn(block(/:root:not\(\[data-theme='light'\]\) \{/));
const PICKED_DARK = tokensIn(block(/^:root\[data-theme='dark'\] \{/m));

describe('the colour themes declare the same tokens', () => {
  it('the light palette is not empty, so the rest of this means something', () => {
    expect(LIGHT.length).toBeGreaterThan(10);
  });

  it('the system-default dark palette matches light, token for token', () => {
    expect(AUTO_DARK).toEqual(LIGHT);
  });

  it('the explicitly chosen dark palette matches light too', () => {
    expect(PICKED_DARK).toEqual(LIGHT);
  });

  it('both dark blocks agree, so the toggle cannot differ from the OS default', () => {
    expect(PICKED_DARK).toEqual(AUTO_DARK);
  });

  it('declares color-scheme in all three states, or form controls come out inverted', () => {
    /* `prefers-color-scheme:` contains the same substring, so exclude it */
    const states = CSS.match(/(?<!prefers-)color-scheme:/g) ?? [];
    expect(states.length).toBe(3);
  });

  it('keeps --gpon and --xgs identical across themes: they mean a technology', () => {
    const value = (b: string, t: string) => new RegExp(`${t}:\\s*([^;]+);`).exec(b)?.[1]?.trim();
    const light = block(/^:root \{/m);
    const darks = [
      block(/:root:not\(\[data-theme='light'\]\) \{/),
      block(/^:root\[data-theme='dark'\] \{/m),
    ];
    for (const dark of darks) {
      for (const t of ['--gpon', '--xgs']) {
        expect(value(dark, t), `${t} differs between themes`).toBe(value(light, t));
      }
    }
  });
});
