// @vitest-environment node
// L54 — galerie à 390 px : trois statistiques en trois colonnes égales (plus de 3e pastille
// orpheline de 114 px), libellé 12 px, « COLLECTIONS » tient dans sa pastille.
// Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState(['src/styles.scss', 'src/app/features/gallery/gallery.component.scss', 'src/app/features/gallery/gallery.component.ts']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

describe.skipIf(!built || !chromium)('galerie — statistiques du bandeau à 390 px (navigateur, dist) — L54', () => {
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

  // Balayage px par px (320 → 759), police par défaut 16 et 20 px : « COLLECTIONS » tient partout
  // (WCAG 1.4.10 Reflow, 1.4.3 : le texte ne sort jamais de sa pastille, donc du fond --panel).
  for (const fontSize of [16, 20]) {
    it(`police par défaut ${fontSize} px : aucun libellé ne déborde de 320 à 759 px`, async () => {
      const context = await browser.newContext({ viewport: { width: 320, height: 844 } });
      const page = await context.newPage();
      if (fontSize !== 16) {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Page.setFontSizes', { fontSizes: { standard: fontSize } });
      }
      await page.goto(base + '/gallery');
      await page.locator('.hero-stats .stat-card').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      const bad: string[] = [];
      for (let width = 320; width <= 759; width++) {
        await page.setViewportSize({ width, height: 844 });
        const over = await page.evaluate(() => [...document.querySelectorAll('.hero-stats .stat-label')]
          .map((l) => `${l.textContent!.trim()} +${l.scrollWidth - l.clientWidth}`)
          .filter((s) => !s.endsWith('+0') && !s.endsWith('+-1')));
        if (over.length) bad.push(`${width} px (${over.join(', ')})`);
      }
      await context.close();
      expect(bad).toEqual([]);
    }, 120_000);
  }

  for (const width of [320, 360, 375, 390, 500, 759]) {
    it(`${width} px : libellés sans débordement de leur pastille, pastilles sur une ligne ou alignées`, async () => {
      const page = await browser.newPage();
      await page.setViewportSize({ width, height: 844 });
      await page.goto(base + '/gallery');
      await page.locator('.hero-stats .stat-card').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      const cards = await page.evaluate(() => [...document.querySelectorAll('.hero-stats .stat-card')].map((c) => {
        const r = c.getBoundingClientRect();
        const l = c.querySelector('.stat-label') as HTMLElement;
        return { w: Math.round(r.width * 10) / 10, top: Math.round(r.top), fs: getComputedStyle(l).fontSize, over: l.scrollWidth - l.clientWidth, text: l.textContent };
      }));
      await page.close();
      expect(cards).toHaveLength(3);
      for (const c of cards) expect(c.over, `${c.text} à ${width} px`).toBeLessThanOrEqual(0);
      if (width >= 390) {
        expect(new Set(cards.map((c) => c.top)).size).toBe(1);
        expect(new Set(cards.map((c) => c.w)).size).toBe(1);
        for (const c of cards) expect(c.fs, c.text!).toBe('12px');
      }
    });
  }
});
