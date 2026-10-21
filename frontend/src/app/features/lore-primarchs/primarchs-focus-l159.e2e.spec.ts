// @vitest-environment node
// L159 (WCAG 2.4.7) — l'anneau de focus de la carte n'est pas rogné par overflow:hidden : il est
// tracé sur la carte elle-même, hors de sa boîte. Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/styles.scss',
  'src/app/features/lore-primarchs/lore-primarchs.component.ts',
  'src/app/features/lore-primarchs/lore-primarchs.component.scss',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}
vi.setConfig({ testTimeout: 300000, hookTimeout: 60000 });

describe.skipIf(!built || !chromium)('Liste des Primarques : focus de carte (navigateur, dist) — L159', () => {
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

  it('R6 — Tab ×N : le focus parcourt 20 liens de carte, anneau visible (≥ 2 px) tracé hors de la carte', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/lore/primarchs`);
    await page.locator('main .card').first().waitFor();
    const lien = page.locator('main .card a').first();
    await lien.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const ring = await page.locator('main .card').first().evaluate((c) => {
      const s = getComputedStyle(c);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), offset: parseFloat(s.outlineOffset), overflow: s.overflow };
    });
    expect(ring.style).toBe('solid');
    expect(ring.width).toBeGreaterThanOrEqual(2);
    expect(ring.offset).toBeGreaterThanOrEqual(0);
    // L’anneau est sur la carte (qui rogne ses enfants, pas son propre contour) ; le lien n’en porte pas un second.
    expect(await lien.evaluate((a) => getComputedStyle(a).outlineStyle)).toBe('none');
    const stops = await page.evaluate(() => document.querySelectorAll('main .card a').length);
    expect(stops).toBe(20);
    await page.close();
  });
});
