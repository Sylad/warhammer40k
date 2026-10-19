// @vitest-environment node
// L152 (revue UX L8) — sommaire du lore : (R1) le titre « Concepts & Lieux » s'affiche tel quel
// (l'entité « &amp; » était échappée par l'interpolation → « &AMP; ») ; (R2) à 320 px le hero ne
// coupe plus « IMPÉRIAL » ni la fin du chapeau (WCAG 1.4.10) ; (R3) bureau inchangé.
// Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';
import { reflowProbe } from '../../../testing/reflow-probe';

const { built, stale } = distState([
  'src/app/features/lore-hub/lore-hub.component.scss',
  'src/app/features/lore-hub/lore-hub.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

describe.skipIf(!built || !chromium)('sommaire du lore (navigateur, dist) — L152', () => {
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

  it('R1 — le titre de la carte Concepts s\'affiche « Concepts & Lieux », sans entité visible', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/lore`);
    await page.locator('main h1').waitFor();
    const titres = await page.locator('main h2').allTextContents();
    await page.close();
    expect(titres).toContain('Concepts & Lieux');
    expect(titres.filter((t) => /&amp;|&AMP;/i.test(t))).toEqual([]);
  });

  for (const w of [320, 360, 390]) {
    it(`R2 — à ${w} px : ni défilement horizontal, ni texte rogné, ni titre coupé dans un mot`, async () => {
      const page = await browser.newPage({ viewport: { width: w, height: 800 } });
      await page.goto(`${base}/lore`);
      await page.locator('main h1').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const r = await page.evaluate(reflowProbe, 'main');
      await page.close();
      expect(r.scroll).toBe(0);
      expect([...r.overflow, ...r.clipped, ...r.broken]).toEqual([]);
    });
  }

  it('R3 — bureau inchangé : titre du hero à 68 px à 1440 et marge intérieure de 50 px', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/lore`);
    await page.locator('main h1').waitFor();
    const m = await page.evaluate(() => {
      const hero = document.querySelector('main .hero')!;
      return {
        fs: getComputedStyle(document.querySelector('main h1')!).fontSize,
        pad: getComputedStyle(hero).paddingLeft,
      };
    });
    await page.close();
    expect(m).toEqual({ fs: '68px', pad: '50px' });
  });
});
