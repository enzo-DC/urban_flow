// Base ESLint partagée par toutes les apps/packages du monorepo.
// Chaque app l'importe et y ajoute ses règles spécifiques (Next, Nest…).
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Uniquement l'integration Prettier : a utiliser par les apps qui ont deja leur propre
// config typescript-eslint (ex. Next), pour eviter un conflit "Cannot redefine plugin
// @typescript-eslint" entre deux resolutions differentes du meme plugin.
export const prettierConfig = [eslintPluginPrettierRecommended];

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
