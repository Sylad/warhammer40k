import path from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';
import { acceptationBrowser, acceptationIgnored } from './scripts/acceptation-runner.mjs';

/**
 * Vitest config for the Warhammer 40K frontend.
 *
 * Scope intentionnellement étroit :
 *  - On teste les helpers PURS extraits des composants Angular (`*.utils.ts`).
 *  - On NE bootstrap PAS Angular ni Leaflet (testé manuellement / via build).
 *  - Pas d'inclusion des `*.spec.ts` legacy Karma/Jasmine — il n'en existe pas
 *    aujourd'hui, mais si on en ajoute, ils auront un suffixe `.karma.spec.ts`.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    // L30 : + tests des scripts Node (générateur du Plan de travail, workflow CI).
    include: ['src/**/*.spec.ts', 'scripts/**/*.test.mjs'],
    // L106 : tests d'acceptation des lots pas encore verts (docs/specs/*/acceptation-<lot>.json, vert: false),
    // exclus de la suite et de la CI ; la commande orchestrate.accept les lance seule.
    exclude: [
      ...configDefaults.exclude,
      '**/dist/**',
      '**/.angular/**',
      ...acceptationIgnored(path.resolve(__dirname, '..')).map((f) => path.resolve(__dirname, '..', f)),
      // L47 : une acceptation qui pilote un navigateur veut dist + Chromium : rangée avec les e2e, quel que soit `vert`.
      ...acceptationBrowser(path.resolve(__dirname, '..')).map((f) => path.resolve(__dirname, '..', f)),
    ],
    reporters: ['default'],
    // L113 : un worker par cœur (32 ici) lançait ~20 Chromium et les scans de dist/ en même temps ; sous
    // cette charge le scan de plan-data.test.mjs (~1 s au repos) dépassait les 5 s par défaut. Parallélisme
    // borné, délai de 30 s comme vitest.e2e.config.ts : garde dans scripts/vitest-charge.test.mjs.
    maxWorkers: 8,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
