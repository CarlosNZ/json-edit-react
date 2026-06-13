import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactPlugin from 'eslint-plugin-react'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    // Adjust these ignores to match your component project structure
    ignores: [
      'node_modules',
      'dist',
      'build',
      // Claude Code harness data, incl. git worktrees that carry their own
      // (unlinted) demo/ and custom-component-library/ checkouts.
      '.claude',
      'demo',
      '.rollup.cache',
      'build_package',
      'pack-output',
      'test/style-mock.js',
      // packages/* are sibling workspace packages with their own lint scope.
      // Root eslint only covers core (src/).
      'packages',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
      // Automatic JSX runtime (tsconfig `jsx: react-jsx`): JSX compiles to
      // `react/jsx-runtime` calls, so React no longer needs to be in scope.
      // Both classic-runtime rules are therefore off.
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      // Lint dependency arrays of our custom effect wrapper as well as the
      // built-in effect hooks.
      'react-hooks/exhaustive-deps': ['warn', { additionalHooks: '(useIsomorphicLayoutEffect)' }],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // Add JavaScript files support
  {
    extends: [js.configs.recommended],
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
      // Automatic JSX runtime (tsconfig `jsx: react-jsx`): JSX compiles to
      // `react/jsx-runtime` calls, so React no longer needs to be in scope.
      // Both classic-runtime rules are therefore off.
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      // Lint dependency arrays of our custom effect wrapper as well as the
      // built-in effect hooks.
      'react-hooks/exhaustive-deps': ['warn', { additionalHooks: '(useIsomorphicLayoutEffect)' }],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  }
)
