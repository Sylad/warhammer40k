// @vitest-environment node
// L5/t1 (WCAG 1.4.10) — page Romans sans défilement horizontal à 320 et 390 px : avant, la barre
// d'onglets (.tabs nowrap) poussait la page à 492 px. Navigateur réel, application construite (dist).
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

describe.skipIf(!built || !chromium)('page Romans : redistribution à 320 et 390 px (navigateur, dist) — L5', () => {
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
    it(`L5/t1 — /romans à ${w} px : ni défilement horizontal, ni onglet hors de l'écran`, async () => {
      const page = await browser.newPage({ viewport: { width: w, height: 800 } });
      await page.goto(`${base}/romans`);
      await page.locator('main h1').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const r = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        out: [...document.querySelectorAll('main .tabs button, main .tabs a')].filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5).length,
        tabs: document.querySelectorAll('main .tabs button, main .tabs a').length,
      }));
      await page.close();
      expect(r.tabs).toBeGreaterThan(0);
      expect(r.scroll).toBe(0);
      expect(r.out).toBe(0);
    }, 60_000);
  }
});
