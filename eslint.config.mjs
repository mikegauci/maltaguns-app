import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import prettier from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import unusedImports from 'eslint-plugin-unused-imports'

const eslintConfig = [
  ...nextCoreWebVitals,
  prettier,
  {
    plugins: {
      prettier: prettierPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      'prettier/prettier': 'error',
      '@next/next/no-img-element': 'off',
      'react/no-unescaped-entities': 'off',
      '@next/next/no-page-custom-font': 'off',
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'browser-tools-mcp/**'],
  },
]

export default eslintConfig
