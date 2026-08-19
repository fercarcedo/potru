/**
 * Flat config for the TypeScript in src/ and tests/.
 *
 * Formatting is not ESLint's job here — prettier owns it, and
 * eslint-config-prettier switches off every rule that would argue with it.
 * What is left is the part a formatter cannot see: unused code, a floating
 * promise, a `case` that falls through.
 *
 * The .astro components are out of scope on purpose, as they are for
 * prettier: linting templates needs eslint-plugin-astro and its own parser,
 * and the logic worth linting already lives in src/scripts and src/lib.
 */
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import ts from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['dist/**', '.astro/**', 'playwright-report/**', 'test-results/**', 'public/**']),
  js.configs.recommended,
  ts.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      /* type-aware, for the handful of rules below that need to know what a
         value actually is. The full recommendedTypeChecked set is not on:
         most of what it adds here is `no-unnecessary-type-assertion` firing
         on the `arr[i]!` idiom, which is only unnecessary while
         noUncheckedIndexedAccess is off — deleting those would quietly make
         the codebase harder to tighten later. */
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      /* A dropped promise is a bug you only find in production: the 3D
         engine failing to load, a font that never resolves. These three are
         the reason this config is type-aware at all. */
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      /* The islands index into arrays whose bounds the surrounding code
         already guarantees — `poly[i]!`, `gallery[view]!`. The alternative is
         a runtime check the codebase would then have to decide what to do
         with, which is worse than the assertion. */
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
  prettier,
);
