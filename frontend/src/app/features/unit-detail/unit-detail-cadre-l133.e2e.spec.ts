// @vitest-environment node
// L133 — fiche unité, onglet Aperçu, panneau « Fiche technique » : le cadre épouse le rapport de l'image
// (règle R7 de docs/specs/unit-detail-datasheet/fiche.yaml, revue UX L120, Nielsen 8). Avant L133 le cadre était
// carré (aspect-ratio: 1) : un scan 898×596 y laissait 287 px vides à 1440 px et 103 px à 390 px.
// Mesure en navigateur réel sur l'application construite (dist) : hauteur du cadre moins hauteur de l'image
// réellement peinte (object-fit contain), pour un scan 3:2 et pour un format différent (le cadre suit l'image,
// pas une constante 3:2).
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/app/features/unit-detail/unit-detail.component.ts',
  'src/app/features/unit-detail/unit-detail.component.scss',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}
vi.setConfig({ testTimeout: 30000, hookTimeout: 60000 });
const UNIT = 'sm-tactique';
const svg = (w: number, h: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#888"/></svg>`;

/** vide = hauteur intérieure du cadre moins image peinte ; videL = la même chose en largeur. */
interface Mesure { cadreL: number; cadreH: number; imgL: number; imgH: number; vide: number; videL: number }

describe.skipIf(!built || !chromium)('fiche unité — cadre du panneau Fiche technique au rapport de l\'image (navigateur, dist) — L133', () => {
  let server: Server;
  let browser: Browser;
  let base: string;

  async function mesurer(width: number, w: number, h: number): Promise<Mesure> {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    ctx.setDefaultTimeout(5000);
    await ctx.route('**/api/images/datasheets/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg(w, h) }));
    const page: Page = await ctx.newPage();
    try {
      await page.goto(`${base}/units/${UNIT}`);
      const img = page.locator('.panel-datasheet .ds-frame img');
      await img.waitFor({ state: 'visible' });
      await page.waitForFunction(() => {
        const i = document.querySelector<HTMLImageElement>('.panel-datasheet .ds-frame img');
        return !!i && i.complete && i.naturalWidth > 0;
      });
      return await page.evaluate(() => {
        const frame = document.querySelector<HTMLElement>('.panel-datasheet .ds-frame')!;
        const i = frame.querySelector('img')!;
        const f = frame.getBoundingClientRect();
        const r = i.getBoundingClientRect();
        // Image peinte en object-fit: contain dans la boîte de l'<img>.
        const s = Math.min(r.width / i.naturalWidth, r.height / i.naturalHeight);
        const imgL = i.naturalWidth * s;
        const imgH = i.naturalHeight * s;
        const cs = getComputedStyle(frame);
        const bordH = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
        const bordL = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
        return { cadreL: f.width, cadreH: f.height, imgL, imgH, vide: f.height - bordH - imgH, videL: f.width - bordL - imgL };
      });
    } finally {
      await ctx.close();
    }
  }

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

  for (const width of [1440, 390]) {
    it(`R7 — scan 898×596 à ${width} px : aucun vide sous l'image dans le cadre (≤ 1 px), image pleine largeur`, async () => {
      const m = await mesurer(width, 898, 596);
      console.info(`L133 ${width} px, scan 898×596 :`, JSON.stringify(m));
      expect(m.vide).toBeLessThanOrEqual(1);
      expect(m.videL).toBeLessThanOrEqual(1);
      // Jamais agrandie au-delà de sa taille naturelle (panneau limité à 898 px).
      expect(m.imgL).toBeLessThanOrEqual(898 + 0.5);
    });
  }

  it('R7 — une image d\'un autre format (800×1000) : le cadre suit son rapport, pas un 3:2 figé', async () => {
    const m = await mesurer(1440, 800, 1000);
    console.info('L133 1440 px, image 800×1000 :', JSON.stringify(m));
    expect(m.vide).toBeLessThanOrEqual(1);
    expect(m.videL).toBeLessThanOrEqual(1);
    expect(m.imgH / m.imgL).toBeCloseTo(1000 / 800, 2);
  });
});
