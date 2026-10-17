// @vitest-environment node
// L139 R1 — /romans à 320 px : accroche, description et champ de recherche tiennent dans le bandeau
// (avant : bord droit à 322 px pour un bandeau de 300). Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState(['src/app/features/series/series.component.scss', 'src/app/features/series/series.component.ts']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

describe.skipIf(!built || !chromium)('page Romans : bandeau à 320 px (navigateur, dist) — L139', () => {
  let server: Server;
  let browser: Browser;
  let base: string;
  beforeAll(async () => {
    ({ base, server } = await startDistServer());
    browser = await chromium!.launch();
  });
  afterAll(async () => {
    await browser?.close();
    server?.close();
  });

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  for (const w of [320, 390]) {
    it(`R1 — /romans à ${w} px : le texte et la recherche du bandeau ne dépassent pas le bandeau`, async () => {
      const page = await browser.newPage({ viewport: { width: w, height: 800 } });
      await page.goto(`${base}/romans`);
      await page.locator('main h1').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const r = await page.evaluate(() => {
        const hero = document.querySelector('main .hero')!.getBoundingClientRect();
        const sel = ['.eyebrow', 'h1', '.hero-desc', '.search-bar'];
        return sel.map((s) => ({ s, over: document.querySelector(`main .hero ${s}`)!.getBoundingClientRect().right - hero.right }));
      });
      await page.close();
      for (const x of r) expect(x.over, x.s).toBeLessThanOrEqual(0.5);
    }, 60_000);
  }
});
