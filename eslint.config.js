// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'import/first': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    files: ['jest-setup.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        require: 'readonly',
      },
    },
  },
  {
    ignores: ['dist/*'],
  },
]);
