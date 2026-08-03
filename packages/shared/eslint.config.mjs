import baseConfig from '../../eslint.base.mjs';

export default [
  {
    ignores: ['dist/**'],
  },
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
