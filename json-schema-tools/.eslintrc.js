module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'standard-with-typescript',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  overrides: [
    {
      env: {
        node: true,
      },
      files: ['.eslintrc.{js,cjs}'],
      parserOptions: {
        sourceType: 'script',
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react'],
  settings: {
    react: {
      version: '18',
    },
  },
  rules: {
    '@typescript-eslint/strict-boolean-expressions': 0,
    '@typescript-eslint/comma-dangle': 0,
    '@typescript-eslint/await-thenable': 0,
    'multiline-ternary': 0,
    '@typescript-eslint/explicit-function-return-type': 0,
    '@typescript-eslint/no-confusing-void-expression': 0,
    '@typescript-eslint/no-invalid-void-type': 0,
    '@typescript-eslint/consistent-type-imports': 'warn',
    '@typescript-eslint/non-nullable-type-assertion-style': 0,
    '@typescript-eslint/no-floating-promises': 0,
    'react-hooks/exhaustive-deps': 0,
    '@typescript-eslint/prefer-nullish-coalescing': 0,
    '@typescript-eslint/no-unsafe-argument': 'warn',
    '@typescript-eslint/indent': 0,
  },
}
