import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactPlugin from 'eslint-plugin-react'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    // Adjust these ignores to match your component project structure
    ignores: ['node_modules', 'dist', 'build', 'demo', '.rollup.cache', 'custom-component-library'],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        React: 'readonly',
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
      // Keep React in JSX scope for React 16 compatibility
      'react/react-in-jsx-scope': 'error',
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
        React: 'readonly',
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
      // Keep React in JSX scope for React 16 compatibility
      'react/react-in-jsx-scope': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  }
)
