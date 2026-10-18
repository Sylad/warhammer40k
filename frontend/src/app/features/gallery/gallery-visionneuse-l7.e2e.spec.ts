// @vitest-environment node
// L7/t2 — navigateur réel, application construite (dist) : le × de la visionneuse reçoit le clic
// (elementFromPoint) à 1440 et 390 px, la barre collante ne le recouvre plus (avant : Ctrl+K à 1440,
// MENU à 390) ; Échap réel ferme la boîte et rend le focus à la carte ; le fond ne défile plus.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/styles.scss', 'src/styles/_gallery-visionneuse.scss', 'src/app/features/gallery/gallery.component.scss',
  'src/app/features/gallery/gallery.component.ts', 'src/app/features/gallery/gallery-modal.directive.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

describe.skipIf(!built || !chromium)('galerie — visionneuse au-dessus de la barre collante (navigateur, dist) — L7/t2', () => {
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

  async function ouvrir(width: number): Promise<Page> {
    const page = await browser.newPage();
    await page.setViewportSize({ width, height: width > 700 ? 900 : 844 });
    await page.goto(base + '/gallery');
    await page.locator('button.art-open').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.locator('button.art-open').first().focus();
    await page.keyboard.press('Enter');
    await page.locator('dialog.modal[open]').waitFor();
    return page;
  }

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  for (const width of [1440, 390]) {
    it(`${width} px : le centre du × reçoit le clic (elementFromPoint), pas la barre collante`, async () => {
      const page = await ouvrir(width);
      const m = await page.evaluate(() => {
        const x = document.querySelector('dialog.modal .close') as HTMLElement;
        const r = x.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { hitIsClose: hit === x, hit: hit ? hit.tagName + '.' + hit.className : null, focus: document.activeElement === x };
      });
      await page.close();
      expect(m.hitIsClose, `élément au centre du × : ${m.hit}`).toBe(true);
      expect(m.focus, 'focus sur ×').toBe(true);
    });

    it(`${width} px : Échap ferme la boîte, le focus revient à la carte, le fond ne défile plus tant qu'elle est ouverte`, async () => {
      const page = await ouvrir(width);
      const bloque = await page.evaluate(() => getComputedStyle(document.body).overflow);
      await page.keyboard.press('Escape');
      await page.locator('dialog.modal').waitFor({ state: 'detached' });
      const m = await page.evaluate(() => ({
        carte: document.activeElement?.classList.contains('art-open'),
        overflow: getComputedStyle(document.body).overflow,
      }));
      await page.close();
      expect(bloque).toBe('hidden');
      expect(m.carte, 'focus rendu au bouton de la carte').toBe(true);
      expect(m.overflow).not.toBe('hidden');
    });
  }
});
