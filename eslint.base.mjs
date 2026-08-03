// Base ESLint partagée par toutes les apps/packages du monorepo.
// Chaque app l'importe et y ajoute ses règles spécifiques (Next, Nest…).
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const baseConfig = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);

export default baseConfig;
