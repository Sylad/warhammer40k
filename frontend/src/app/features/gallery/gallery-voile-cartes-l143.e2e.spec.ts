// @vitest-environment node
// L143 — navigateur réel, application construite (dist) : le titre, l'artiste et le nombre de ♥ d'une carte d'œuvre
// restent ≥ 4,5:1 (WCAG 1.4.3) même quand le titre passe sur 3-4 lignes (390 et 320 px) et que l'image est
// blanche (pire cas). Mesuré sur les pixels rendus, texte rendu transparent, comme gallery-voile.e2e.spec.ts.
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

const LONG = 'Marneus Calgar, Maître de Macragge, Seigneur de l’Ultramar et chef des Ultramarines';

describe.skipIf(!built || !chromium)('galerie — voile sous le texte des cartes (navigateur, dist) — L143', () => {
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

  for (const width of [390, 320]) {
    it(`${width} px : titre sur plusieurs lignes, artiste et ♥ ≥ 4,5:1 sur image blanche`, async () => {
      const page = await browser.newPage();
      await page.setViewportSize({ width, height: 844 });
      await page.goto(base + '/gallery');
      await page.locator('.art-card').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      // Pire cas : fond blanc (le dégradé propre à la carte est retiré, seul le voile du texte compte).
      await page.addStyleTag({ content: '.art-card::before { background: #fff !important; }' });
      await page.evaluate((t) => { document.querySelectorAll('.art-title').forEach((e) => { e.textContent = t; }); }, LONG);
      const cibles = ['.art-title', '.art-artist', '.art-likes'];
      const fg = await page.evaluate((sels) => sels.map((s) => getComputedStyle(document.querySelector(s)!).color), cibles);
      const lignes = await page.evaluate(() => {
        const e = document.querySelector('.art-title') as HTMLElement;
        return Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight));
      });
      expect(lignes, 'le titre doit tenir sur au moins 3 lignes pour exercer la règle').toBeGreaterThanOrEqual(3);
      const dedans = await page.evaluate(() => {
        const c = document.querySelector('.art-card')!.getBoundingClientRect();
        const t = document.querySelector('.art-title')!.getBoundingClientRect();
        return t.top >= c.top - 0.5 && t.bottom <= c.bottom + 0.5;
      });
      expect(dedans, 'le titre ne sort pas de la carte').toBe(true);
      await page.addStyleTag({ content: '.art-content * { color: transparent !important; }' });
      await page.waitForTimeout(300);
      const out: Record<string, number> = {};
      for (let i = 0; i < cibles.length; i++) {
        const buf = await page.locator(cibles[i]).first().screenshot();
        const lumMax = await page.evaluate(async ([b64]) => {
          const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
          const cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height;
          const ctx = cv.getContext('2d')!; ctx.drawImage(bmp, 0, 0);
          const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
          const lum = (c: number[]): number => {
            const l = c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
            return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
          };
          let max = 0;
          for (let p = 0; p < d.length; p += 4) max = Math.max(max, lum([d[p], d[p + 1], d[p + 2]]));
          return max;
        }, [buf.toString('base64')]);
        const rgb = fg[i].match(/\d+/g)!.map(Number);
        const l = rgb.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        out[cibles[i]] = (0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2] + 0.05) / (lumMax + 0.05);
      }
      await page.close();
      for (const [sel, r] of Object.entries(out)) expect(r, `${sel} ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }, 60_000);
  }
});
