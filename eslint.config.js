import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'docs']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Empty switch case fallthroughs (intentional in large data maps)
      'no-empty': ['error', { allowEmptyCatch: true }],
      // React 19 / JSX semantic elements are valid identifiers for icon components
      'react-hooks/static-components': 'off',
      // Overly aggressive: handler reassigns a local `result` then sets state after the try,
      // which the rule misreads as synchronous setState-in-effect.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['**/*.test.{js,jsx}'],
    languageOptions: {
      globals: globals.vitest,
    },
  },
  {
    // App entry: lazy() imports are intentional; react-refresh HMR does not apply here.
    files: ['src/main.jsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
