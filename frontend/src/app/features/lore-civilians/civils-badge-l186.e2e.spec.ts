// @vitest-environment node
// L186 (QA prod 23-10) — Civils Impériaux : le pictogramme ⛶ (.figure-zoom) chevauchait de 6 px le haut du nom des
// figures quand le texte remplit la carte (Bismarck, Titans, Malcador à 1440 ; Chevaliers-Errants à 390 ;
// Emperor-class à 320), le nom tombant à 4,32–4,47:1 sous le fond du badge. Navigateur réel, application construite.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/app/features/lore-civilians/lore-civilians.component.scss',
  'src/app/features/lore-civilians/lore-civilians.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

describe.skipIf(!built || !chromium)('Civils Impériaux, pictogramme d\'agrandissement (navigateur, dist) — L186', () => {
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

  for (const w of [1440, 390, 320]) {
    it(`R1 — à ${w} px, le pictogramme ⛶ ne recouvre aucune ligne du nom d'aucune figure`, async () => {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      await page.goto(base + '/lore/civilians');
      await page.locator('.figure-card').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      const r = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.figure-card')].map((c) => {
          const z = c.querySelector('.figure-zoom')!.getBoundingClientRect();
          const nom = c.querySelector('.figure-name')!;
          const plage = document.createRange();
          plage.selectNodeContents(nom);
          const recouvre = [...plage.getClientRects()].some(
            (t) => t.left < z.right && t.right > z.left && t.top < z.bottom && t.bottom > z.top,
          );
          return { nom: nom.textContent, recouvre };
        }),
      );
      expect(r.length).toBeGreaterThanOrEqual(29);
      expect(r.filter((x) => x.recouvre)).toEqual([]);
      await page.close();
    });
  }
});
