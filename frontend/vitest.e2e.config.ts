import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { acceptationBrowser, acceptationIgnored } from './scripts/acceptation-runner.mjs';

// Étape e2e (npm run test:e2e), APRÈS `npm run build`, Chromium installé : les acceptations de lots qui pilotent
// un navigateur (docs/specs/*/acceptation-*.json, `vert: true` seulement : les rouges attendent leur lot), exclues de vitest.config.ts. 30 s par cas
// (le cas R3 de L47 dure ~2,5 s au repos et a dépassé 5 s sous charge).
const root = path.resolve(__dirname, '..');
const pending = new Set(acceptationIgnored(root));
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    reporters: ['default'],
    testTimeout: 30000,
    hookTimeout: 60000,
    include: acceptationBrowser(root).filter((f) => !pending.has(f)).map((f) => path.resolve(root, f)),
  },
});
