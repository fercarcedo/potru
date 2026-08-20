/**
 * Flat config for the TypeScript in src/ and tests/.
 *
 * Formatting is not ESLint's job here — prettier owns it, and
 * eslint-config-prettier switches off every rule that would argue with it.
 * What is left is the part a formatter cannot see: unused code, a floating
 * promise, an assertion that is no longer telling the compiler anything.
 *
 * Type-aware linting is on (`recommendedTypeChecked`), which is why the .ts
 * block carries `projectService`. It has to be scoped to .ts: the config
 * files at the root are plain JS with no program behind them, so the same
 * rules there fail to load rather than fail to find anything.
 *
 * The .astro components are not linted. Their logic is a few lines of
 * frontmatter each — everything worth a rule lives in src/scripts and
 * src/lib — and eslint-plugin-astro brings its own parser for the templates.
 */
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import ts from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    'dist/**',
    '.astro/**',
    'playwright-report/**',
    'test-results/**',
    'public/**',
    /* throwaway scripts, gitignored: they are node one-offs, not repo code */
    '*.tmp.mjs',
    '*.tmp.js',
  ]),
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [ts.configs.recommendedTypeChecked],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      /* The islands index into arrays whose bounds the surrounding code
         already guarantees — `poly[i]!`, `gallery[view]!`. With
         noUncheckedIndexedAccess on, those assertions are load-bearing, so
         no-unnecessary-type-assertion agrees with them and this rule only
         needs to stop objecting to the shape. */
      '@typescript-eslint/no-non-null-assertion': 'off',
      /* An unused argument is often documentation of a signature the caller
         must still satisfy — a UnitBuilder that ignores `front`, say. Let a
         leading underscore say "deliberate". */
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  /* the root config files: plain JS, no program, so nothing type-aware */
  { files: ['**/*.{js,mjs,cjs}'], extends: [ts.configs.disableTypeChecked] },
  prettier,
);
