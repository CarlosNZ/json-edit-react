import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['build', 'src/package'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Example modules are intentionally dual-purpose: each is the single
    // source of truth for a demo data set, exporting its data + logic (for
    // the main demo to import back) alongside the default component used by
    // the /examples route. That deliberately trips `only-export-components`,
    // and since the displayed source is meant to show that logic inline,
    // splitting it out would defeat the purpose. We accept the dev-only loss
    // of Fast Refresh for these files instead.
    files: ['src/examples/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  }
)
