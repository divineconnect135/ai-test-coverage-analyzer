import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
)
