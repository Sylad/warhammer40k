// @vitest-environment node
// L53 — bandeau de la galerie sur une image d'en-tête claire : surtitre, description et bouton
// « Importer » ≥ 4,5:1 (WCAG 1.4.3), mesuré sur les pixels rendus. Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState(['src/styles.scss', 'src/styles/_gallery-filtres.scss', 'src/app/features/gallery/gallery.component.scss', 'src/app/features/gallery/gallery.component.ts']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

const DATASHEET = resolve(__dirname, '../../../../../backend/public/datasheets/eld-avatar.jpg');
const BLANC = '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="600"><rect width="1600" height="600" fill="#fff"/></svg>';

describe.skipIf(!built || !chromium)('galerie — bandeau sur image claire (navigateur, dist) — L53', () => {
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

  const images: [string, () => { type: string; body: Buffer | string }][] = [
    ['image blanche (pire cas)', () => ({ type: 'image/svg+xml', body: BLANC })],
    ['fiche technique claire (image réelle)', () => ({ type: 'image/jpeg', body: readFileSync(DATASHEET) })],
  ];
  for (const [nom, image] of images) {
    for (const width of [1440, 390]) {
      it(`${nom} à ${width} px : textes et bouton ≥ 4,5:1`, async () => {
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await context.newPage();
        await page.route('**/api/wiki-image*', (r) => r.fulfill({ json: { imageUrl: '/hero-claire' } }));
        await page.route('**/hero-claire', (r) => { const i = image(); return r.fulfill({ contentType: i.type, body: i.body }); });
        await page.addInitScript(() => sessionStorage.setItem('wh40k.pin', '1234')); // L144 : « + Importer » n'existe qu'en mode édition
        await page.goto(base + '/gallery');
        await page.locator('.hero .eyebrow').waitFor();
        await page.waitForTimeout(800);
        const cibles = ['.hero .eyebrow', '.hero .hero-desc', '.hero .import-btn-hero'];
        const out: Record<string, number> = {};
        const fg = await page.evaluate((sels) => sels.map((s) => getComputedStyle(document.querySelector(s)!).color), cibles);
        await page.addStyleTag({ content: '.hero-text *, .hero-content button { color: transparent !important; text-shadow: none !important; }' });
        await page.waitForTimeout(500);
        for (let i = 0; i < cibles.length; i++) {
          const box = (await page.locator(cibles[i]).first().boundingBox())!;
          const buf = await page.screenshot({ clip: { x: box.x + 4, y: box.y + 4, width: box.width - 8, height: Math.min(box.height, 60) - 8 } /* sans la bordure du bouton */ });
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
          const lf = 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
          out[cibles[i]] = (lf + 0.05) / (lumMax + 0.05);
        }
        await context.close();
        for (const [sel, r] of Object.entries(out)) expect(r, `${sel} ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }, 60_000);
    }
  }
});
