// @vitest-environment node
// L113 — la suite complète lance une vingtaine de specs qui pilotent Chromium et d'autres qui
// parcourent dist/ en synchrone, toutes en parallèle (un worker par cœur). Sous cette charge, le
// scan de dist/ de plan-data.test.mjs (~1 s au repos) dépassait les 5 s par défaut de Vitest :
// échec aléatoire, vert en isolé. Garde : la configuration borne le parallélisme et laisse
// aux tests un délai qui ne dépend pas de la charge de la machine.
import { describe, expect, it } from 'vitest';
import config from '../vitest.config.ts';

describe('vitest.config.ts — suite déterministe sous charge (L113)', () => {
  const test = config.test;

  it('borne le nombre de workers (Chromium + scans de dist/ ne saturent pas la machine)', () => {
    expect(test.maxWorkers).toBeGreaterThanOrEqual(1);
    expect(test.maxWorkers).toBeLessThanOrEqual(8);
  });

  it('accorde 30 s par test, comme vitest.e2e.config.ts, au lieu des 5 s par défaut', () => {
    expect(test.testTimeout).toBeGreaterThanOrEqual(30000);
    expect(test.hookTimeout).toBeGreaterThanOrEqual(30000);
  });
});
