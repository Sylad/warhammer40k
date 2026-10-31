// @vitest-environment node
// L61 — la garde espacement-texte.e2e.spec.ts doit vraiment tourner (CI) et ne pas passer sur un dist périmé.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import e2eConfig from '../vitest.e2e.config.ts';

const SPEC = 'src/app/layout/main-layout/espacement-texte.e2e.spec.ts';

describe('garde espacement du texte WCAG 1.4.12 (L61)', () => {
  it('npm run test:e2e (donc la CI, après le build) lance espacement-texte.e2e.spec.ts', () => {
    expect(e2eConfig.test.include.map((f) => resolve(f))).toContain(resolve(__dirname, '..', SPEC));
  });

  it('la fraîcheur de dist couvre la feuille de /about, dont le correctif est mesuré', () => {
    const src = readFileSync(resolve(__dirname, '..', SPEC), 'utf8');
    const liste = /distState\(\[([^\]]*)\]\)/.exec(src)?.[1] ?? '';
    expect(liste).toContain('src/app/features/about/about.component.scss');
  });
});
