import { defineConfig } from 'vitest/config';

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
    include: ['src/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.angular/**'],
    reporters: ['default'],
  },
});
