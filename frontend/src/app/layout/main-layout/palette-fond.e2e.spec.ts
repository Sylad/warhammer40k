// @vitest-environment node
// L163 (revue) — navigateur réel, dist : le fond de la recherche Ctrl+K couvre toute la fenêtre (il
// mesurait 1434×69 px dans la barre du haut) ; un clic dans la page ferme la recherche, la page dessous
// ne reçoit pas le clic, et Tab reste dans la recherche après un clic à côté.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState(['src/app/layout/main-layout/main-layout.component.ts']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

describe.skipIf(!built || !chromium)('fond de la recherche Ctrl+K (navigateur, dist) — L163', () => {
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

  it('R8 — un clic sur le pied de la recherche garde le focus dedans : Tab ne sort pas vers la page', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/factions`);
    await page.locator('button.nav-search-btn').waitFor();
    await page.locator('button.nav-search-btn').click();
    await page.locator('.cmdk-input').fill('horus');
    await page.locator('.cmdk-footer').click();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('.cmdk-panel'))).toBe(true);
    await page.close();
  });

  for (const [w, h] of [[1440, 900], [390, 844]]) {
    it(`R9 — ${w} px : le fond couvre la fenêtre, un clic à côté ferme la recherche sans activer la page`, async () => {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.goto(`${base}/about`);
      await page.locator('button.nav-search-btn').waitFor();
      await page.locator('button.nav-search-btn').click();
      await page.locator('.cmdk-panel').waitFor();
      const box = (await page.locator('.cmdk-backdrop').boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(w - 1);
      expect(box.height).toBeGreaterThanOrEqual(h - 1);
      const url = page.url();
      await page.mouse.click(10, h - 40);
      await page.waitForTimeout(200);
      expect(await page.locator('.cmdk-panel').count()).toBe(0);
      expect(page.url()).toBe(url);
      await page.close();
    });
  }
});
