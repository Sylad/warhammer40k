// @vitest-environment node
// L47 — la colonne latérale n'est bornée à la hauteur de l'écran (défilement interne) que lorsqu'elle est
// collée (> 1280 px). En dessous, elle s'écoule dans la page : scrollHeight == clientHeight, et la carte
// « Vidéo à la une » s'atteint par le défilement de la page (WCAG 2.4.11). Navigateur réel, dist.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState(['src/app/features/faction-detail/faction-detail.component.scss', 'src/app/features/faction-detail/faction-detail.component.ts']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

describe.skipIf(!built || !chromium)('colonne latérale de la page faction (navigateur, dist) — L47', () => {
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

  for (const [w, h] of [[390, 844], [1024, 768]] as const) {
    it(`L47 — ${w}×${h} : colonne non bornée, carte « Vidéo à la une » atteignable par le défilement de la page`, async () => {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.goto(`${base}/factions/space-marines`);
      await page.locator('main h1').waitFor();
      const side = page.locator('.sidebar').first();
      await side.waitFor();
      const m = await side.evaluate((el) => ({
        scroll: el.scrollHeight,
        client: el.clientHeight,
        maxHeight: getComputedStyle(el).maxHeight,
        overflowY: getComputedStyle(el).overflowY,
      }));
      expect(m.scroll).toBe(m.client);
      expect(m.maxHeight).toBe('none');
      expect(m.overflowY).toBe('visible');
      const carte = page.locator('.sidebar a[href^="/videos"]').first();
      await carte.scrollIntoViewIfNeeded();
      const box = await carte.boundingBox();
      expect(box && box.y >= 0 && box.y + box.height <= h).toBe(true);
      await page.close();
    }, 60_000);
  }

  it('L47 — 1440×900 : la carte « Vidéo à la une » est entièrement visible sans défilement de la colonne (colonne collée)', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/factions/space-marines`);
    await page.locator('main h1').waitFor();
    const carte = page.locator('[data-testid="carte-une-faction"]');
    await carte.waitFor();
    await page.evaluate(() => window.scrollTo(0, 1200)); // colonne collée
    await page.waitForTimeout(200);
    const m = await page.evaluate(() => {
      const side = document.querySelector('.sidebar')!.getBoundingClientRect();
      const c = document.querySelector('[data-testid="carte-une-faction"]')!.getBoundingClientRect();
      return { sideTop: side.top, sideBottom: side.bottom, top: c.top, bottom: c.bottom, vh: innerHeight };
    });
    expect(m.top).toBeGreaterThanOrEqual(m.sideTop);
    expect(m.bottom).toBeLessThanOrEqual(Math.min(m.sideBottom, m.vh));
    await page.close();
  }, 60_000);
});
