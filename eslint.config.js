// Flat config (ESLint 9). `bun run lint`. Counts by rule are reported in
//  nothing is disabled inline.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import mobx from 'eslint-plugin-mobx';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-register/**',
      'node_modules/**',
      'public/**',
      'Data/**',
      'Data-v097d/**',
      // generated from OpenMU's packet XML - regenerate, never lint
      'versions/shared/packets/*Packets.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, mobx },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...mobx.configs.recommended.rules,
      // Engine code passes `_`-prefixed unused args on purpose.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'prefer-const': 'warn',
      'no-var': 'warn',
      // MobX observables are mutated in place by design.
      'mobx/missing-observer': 'warn',
      'mobx/exhaustive-make-observable': 'off',
    },
  },
  {
    files: ['tools/**', 'proxy/**', 'versions/shared/packets/generate.ts', '*.config.{js,ts}'],
    rules: { 'no-console': 'off' },
  },
  {
    // Content loaders: a Vite glob in the client, a synchronous `require` under Bun (servers and tools),
    // where there is no glob. See versions/shared/items/all.ts.
    files: ['versions/shared/*/all.ts', 'tools/itemFiles.ts', 'tools/monsterFiles.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  }
);
