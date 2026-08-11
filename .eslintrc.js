module.exports = {
  root: true,
  extends: '@react-native',
  plugins: ['import'],
  rules: {
    'import/order': [
      'error',
      {
        groups: [
          ['builtin', 'external'],
          'internal',
          ['parent', 'sibling', 'index'],
        ],
        pathGroups: [
          {
            pattern: '{app,features,shared}/**',
            group: 'internal',
          },
        ],
        pathGroupsExcludedImportTypes: [],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/naming-convention': [
          'error',
          {
            selector: 'variableLike',
            format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
            leadingUnderscore: 'allow',
          },
          {
            selector: 'typeLike',
            format: ['PascalCase'],
          },
          {
            selector: 'function',
            format: ['camelCase', 'PascalCase'],
          },
          {
            selector: 'import',
            format: ['camelCase', 'PascalCase'],
          },
        ],
      },
    },
    {
      // Features may only be imported through their public index.ts —
      // no reaching into another feature's internals.
      files: ['src/features/*/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['features/*/*'],
                message:
                  "Import from another feature's public API only (e.g. `features/home`), not its internals.",
              },
            ],
          },
        ],
      },
    },
    {
      // Domain code is framework-free: no React/React Native, no reaching
      // up into screens/components/hooks/services of its own feature.
      files: ['src/**/domain/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'react',
                message: 'Domain code must not depend on React.',
              },
              {
                name: 'react-native',
                message: 'Domain code must not depend on React Native.',
              },
            ],
            patterns: [
              {
                group: [
                  '**/screens/**',
                  '**/components/**',
                  '**/hooks/**',
                  '**/services/**',
                ],
                message:
                  'Domain code must not depend on UI or service layers (dependency points inward).',
              },
            ],
          },
        ],
      },
    },
  ],
};
