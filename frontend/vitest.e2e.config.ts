import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { acceptationBrowser, acceptationIgnored } from './scripts/acceptation-runner.mjs';

// Étape e2e (npm run test:e2e), APRÈS `npm run build`, Chromium installé : les acceptations de lots qui pilotent
// un navigateur (docs/specs/*/acceptation-*.json, `vert: true` seulement : les rouges attendent leur lot), exclues de vitest.config.ts. 30 s par cas
// (le cas R3 de L47 dure ~2,5 s au repos et a dépassé 5 s sous charge). Un fichier à la fois (L166) : chaque
// fichier lance son Chromium ; trois en parallèle sur le runner CI sont l'hypothèse (non prouvée, voir README L166) des attentes
// expirées au hasard.
const root = path.resolve(__dirname, '..');
const pending = new Set(acceptationIgnored(root));
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    reporters: ['default'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    include: [
      ...acceptationBrowser(root).filter((f) => !pending.has(f)).map((f) => path.resolve(root, f)),
      // L61 : la garde de l'espacement de texte (WCAG 1.4.12) ne tournait nulle part en CI (`vitest run` passe avant le build, dist absent).
      path.resolve(__dirname, 'src/app/layout/main-layout/espacement-texte.e2e.spec.ts'),
      // L52 : le rechargement sur « morceau absent » se mesure avec le réseau coupé et des réponses 404/502 : navigateur réel.
      path.resolve(__dirname, 'src/app/core/utils/morceau-absent.e2e.spec.ts'),
      // L40 : les pages pilotes de la densité (fiches faction et primarque) tiennent les règles D1 à D6 à 1440 et 390 px.
      path.resolve(__dirname, 'src/app/features/densite-pilotes-l40.e2e.spec.ts'),
      // L224 : la date de la chronologie d'un Primarque ne chevauche plus le titre de sa bataille (320, 390, 1440 px).
      path.resolve(__dirname, 'src/app/features/primarch-detail/primarch-chronologie-l224.e2e.spec.ts'),
      // L225 : les titres h2 des fiches faction et Primarque tiennent dans leur panneau à 320 px (« ✠ ICONOGRAPHIE » débordait).
      path.resolve(__dirname, 'src/app/features/faction-detail/fiche-titres-l225.e2e.spec.ts'),
      // L71 : galerie, Entrée sur « Page suivante » → focus sur la grille et « Page 2 sur N » dans la région d'état.
      path.resolve(__dirname, 'src/app/features/gallery/gallery-pagination-l71.e2e.spec.ts'),
    ],
  },
});
