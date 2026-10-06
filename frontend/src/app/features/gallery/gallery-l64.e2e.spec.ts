// @vitest-environment node
// L64/t4-t5 — navigateur réel, application construite (dist) : l'indicateur de pagination tient sur
// une ligne à 390 et 320 px (hauteur de .page-indicator MESURÉE), « 1–24 » n'est jamais coupé ;
// sans collection non vide, le bandeau a deux pastilles et pas de colonne vide.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState(['src/styles.scss', 'src/app/features/gallery/gallery.component.scss', 'src/app/features/gallery/gallery.component.ts']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

describe.skipIf(!built || !chromium)('galerie — pagination et bandeau (navigateur, dist) — L64/t4-t5', () => {
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

  async function open(width: number, collections: unknown[]): Promise<Page> {
    const page = await browser.newPage();
    await page.route('**/api/artwork-collections', (r) => r.fulfill({ json: collections }));
    await page.setViewportSize({ width, height: 844 });
    await page.goto(base + '/gallery');
    await page.locator('.hero-stats .stat-card').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    return page;
  }

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  for (const width of [390, 360, 320]) {
    it(`${width} px : .page-indicator sur une seule ligne, « 1–24 » entier`, async () => {
      const page = await open(width, []);
      await page.locator('.page-indicator').waitFor();
      const m = await page.evaluate(() => {
        const el = document.querySelector('.page-indicator') as HTMLElement;
        const range = document.querySelector('.page-range') as HTMLElement;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        return { h: el.getBoundingClientRect().height, fs, rangeH: range.getBoundingClientRect().height, over: document.documentElement.scrollWidth - innerWidth };
      });
      await page.close();
      expect(m.h, `hauteur ${m.h}`).toBeLessThan(m.fs * 2);
      expect(m.rangeH, `plage ${m.rangeH}`).toBeLessThan(m.fs * 2);
      expect(m.over).toBeLessThanOrEqual(0);
    });
  }

  for (const width of [320, 390, 1440]) {
    it(`${width} px : sans collection non vide, deux pastilles sans colonne vide`, async () => {
      const page = await open(width, [{ id: 'c0', name: 'Vide', count: 0 }]);
      const m = await page.evaluate(() => {
        const box = document.querySelector('.hero-stats') as HTMLElement;
        const cards = [...box.querySelectorAll('.stat-card')].map((c) => c.getBoundingClientRect());
        return { n: cards.length, right: Math.max(...cards.map((c) => c.right)), boxRight: box.getBoundingClientRect().right, cols: getComputedStyle(box).gridTemplateColumns.split(' ').length };
      });
      await page.close();
      expect(m.n).toBe(2);
      expect(m.cols).toBe(2);
      expect(m.boxRight - m.right).toBeLessThanOrEqual(1);
    });
  }
});
