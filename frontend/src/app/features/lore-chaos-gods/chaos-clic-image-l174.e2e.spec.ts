// @vitest-environment node
// L174 — au navigateur réel (dist) : un point de l'image d'en-tête de chacun des 4 dieux, hors texte et hors ⛶,
// désigne le bouton d'illustration (elementFromPoint) et un vrai clic de souris, puis un toucher, ouvre la visionneuse.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/app/features/lore-chaos-gods/lore-chaos-gods.component.scss',
  'src/app/features/lore-chaos-gods/lore-chaos-gods.component.ts',
]);
const GREY = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#555"/></svg>').toString('base64');
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

describe.skipIf(!built || !chromium)('Panthéon du Chaos, clic sur l\'illustration (navigateur, dist) — L174', () => {
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

  for (const [w, h, tactile] of [[1440, 900, false], [390, 844, true]] as const) {
    it(`R2 — à ${w} px, l'image de chacun des 4 dieux est atteinte par le pointeur et s'ouvre ${tactile ? 'au toucher' : 'au clic'}`, async () => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: tactile });
      const page = await ctx.newPage();
      await page.route('**/api/wiki-image*', (r) => r.fulfill({ json: { imageUrl: GREY } }));
      await page.goto(base + '/lore/chaos-gods');
      await page.locator('.god-bg[style*="background-image"]').first().waitFor();
      const n = await page.locator('.god-bg').count();
      expect(n).toBe(4);
      for (let i = 0; i < n; i++) {
        const tete = page.locator('.god-head').nth(i);
        await tete.scrollIntoViewIfNeeded();
        // coin haut-droit : ni le texte (à gauche), ni le ⛶ (en bas à droite)
        const box = (await tete.boundingBox())!;
        const x = box.x + box.width - 12;
        const y = box.y + 12;
        const cible = await page.evaluate(([px, py]) => {
          const el = document.elementFromPoint(px, py);
          return el?.classList.contains('god-bg') ?? false;
        }, [x, y]);
        expect(cible, `dieu ${i + 1} : l'image est sous le pointeur`).toBe(true);
        if (tactile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
        await page.locator('[role="dialog"] .lightbox-close').waitFor({ timeout: 4000 });
        await page.keyboard.press('Escape');
        await page.locator('[role="dialog"] .lightbox-close').waitFor({ state: 'hidden', timeout: 4000 });
      }
      if (w === 1440) {
        const tete = page.locator('.god-head').first();
        await tete.scrollIntoViewIfNeeded();
        await tete.screenshot({ path: join(process.env.TMPDIR ?? tmpdir(), `chaos-clic-${w}.png`) });
      }
      await ctx.close();
    });
  }
});
