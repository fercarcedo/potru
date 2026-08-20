/**
 * Walking src/ and reading every file, for the tests that assert repo-wide
 * invariants rather than the behaviour of one module — "nothing outside these
 * two files may touch storage", "no font-family names a face we do not load".
 *
 * Both of those had their own copy of this loop. One copy, so a test that
 * grows a new file extension does not silently stop covering the others.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export interface SourceFile {
  /** path relative to the directory walked, always slash-separated */
  path: string;
  text: string;
}

/**
 * Every file under `dir` whose name matches `pattern`, read as UTF-8.
 * Paths come back slash-separated so an expected-value list reads the same
 * on any OS.
 */
export function collectSourceFiles(dir: string, pattern: RegExp): SourceFile[] {
  const out: SourceFile[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d)) {
      const p = join(d, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (pattern.test(entry)) {
        out.push({ path: relative(dir, p).split(sep).join('/'), text: readFileSync(p, 'utf8') });
      }
    }
  };
  walk(dir);
  return out;
}
