import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactPlugin from 'eslint-plugin-react'
import stylistic from '@stylistic/eslint-plugin'
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
  // Line-length enforcement (all linted files). Code tracks Prettier's
  // printWidth of 100; comments are held to 80 (the source-comment wrap
  // convention) since Prettier doesn't reflow comment text. URLs and
  // string/template/regex literals are exempt because Prettier can't break
  // them either.
  {
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/max-len': [
        'error',
        {
          code: 100,
          comments: 80,
          tabWidth: 2,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
    },
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
      // The two classic hooks rules, listed explicitly rather than via the
      // plugin's `recommended` preset, which also enables the React Compiler
      // rule set. Adopting those is a separate decision.
      'react-hooks/rules-of-hooks': 'error',
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
        // Pinned rather than `'detect'`: eslint-plugin-react's detection
        // calls `context.getFilename()`, which ESLint 10 removed, so it
        // crashes on the first rule that needs the version. Everything else
        // in the plugin runs on ESLint 10. Switch back to `'detect'` once a
        // release with ESLint 10 support ships
        // (https://github.com/jsx-eslint/eslint-plugin-react/pull/4022) and
        // drop the matching `peerDependencyRules` entry in package.json.
        version: '19.3.0',
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
      // The two classic hooks rules, listed explicitly rather than via the
      // plugin's `recommended` preset, which also enables the React Compiler
      // rule set. Adopting those is a separate decision.
      'react-hooks/rules-of-hooks': 'error',
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
        // Pinned rather than `'detect'`: eslint-plugin-react's detection
        // calls `context.getFilename()`, which ESLint 10 removed, so it
        // crashes on the first rule that needs the version. Everything else
        // in the plugin runs on ESLint 10. Switch back to `'detect'` once a
        // release with ESLint 10 support ships
        // (https://github.com/jsx-eslint/eslint-plugin-react/pull/4022) and
        // drop the matching `peerDependencyRules` entry in package.json.
        version: '19.3.0',
      },
    },
  }
)
