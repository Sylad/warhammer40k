import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { acceptationOnly } from './scripts/acceptation-runner.mjs';

// Commande dédiée (orchestrate.accept) : seulement les fichiers du lot (CADENCE_ACCEPTATION).
// Les chemins de l'acceptation sont relatifs à la racine du dépôt.
const root = path.resolve(__dirname, '..');
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    reporters: ['default'],
    include: acceptationOnly().map((f) => path.resolve(root, f)),
  },
});
