// Analyse statique (L254, D-31) : l'équivalent de Checkstyle/PMD pour TypeScript, aux seuils de cadence
// (docs/qualite.md de cadence). L'existant qui les dépasse est figé dans .cadence/analyse/eslint-frontend.json
// (cliquet de `cadence analyse`) : seules les violations nouvelles échouent. Ne pas relever un seuil ici pour
// faire passer un lot : ce fichier est dans `configs:` de cadence.yaml, le changer est un lot `config: true`.
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';

export default tseslint.config(
  // les tests ne sont pas mesurés (comme dans cadence) : un describe de 300 lignes n'est pas une dette de lisibilité
  { ignores: ['dist/**', 'node_modules/**', 'eslint.config.mjs', '**/*.spec.ts', '**/*.test.mjs', 'src/testing/**'] },
  {
    files: ['src/**/*.ts', 'scripts/**/*.mjs'],
    // un eslint-disable ne fait pas disparaître un dépassement : le cliquet le compte quand même
    linterOptions: { noInlineConfig: true },
    languageOptions: { parser: tseslint.parser },
    plugins: { sonarjs },
    rules: {
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 4],
      'max-params': ['error', 5],
      complexity: ['error', 15],
      'sonarjs/cognitive-complexity': ['error', 15],
    },
  },
);
