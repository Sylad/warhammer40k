// @vitest-environment node
// L172 — le focus clavier du bouton d'illustration d'un dieu, au navigateur réel (dist) : un cadre or de 2 px
// tracé dans l'en-tête, visible à 1440 et 390 px (le contour de 1 px d'avant était rogné par overflow hidden).
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
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

describe.skipIf(!built || !chromium)('Panthéon du Chaos, focus de l\'illustration (navigateur, dist) — L172', () => {
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

  it('R4 — au clavier, le bouton prend le focus et l\'en-tête trace un cadre or de 2 px entièrement dans ses limites', async () => {
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.goto(base + '/lore/chaos-gods');
      await page.locator('.god-bg').first().waitFor();
      await page.keyboard.press('Tab');
      await page.locator('.god-bg').first().focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      const m = await page.evaluate(() => {
        const bouton = document.querySelector('.god-bg') as HTMLElement;
        const tete = bouton.closest('.god-head') as HTMLElement;
        const cs = getComputedStyle(tete, '::after');
        const r = tete.getBoundingClientRect();
        return {
          focus: document.activeElement === bouton,
          visible: bouton.matches(':focus-visible'),
          border: cs.borderTopWidth + ' ' + cs.borderTopColor + ' ' + cs.borderTopStyle,
          w: parseFloat(cs.width), h: parseFloat(cs.height), tw: r.width, th: r.height,
          nom: bouton.getAttribute('aria-label'),
        };
      });
      expect(m.focus, `${w} px focus`).toBe(true);
      expect(m.visible, `${w} px focus-visible`).toBe(true);
      expect(m.border, `${w} px`).toBe('2px rgb(201, 162, 74) solid');
      expect(Math.round(m.w), `${w} px largeur`).toBeLessThanOrEqual(Math.round(m.tw));
      expect(Math.round(m.h), `${w} px hauteur`).toBeLessThanOrEqual(Math.round(m.th));
      expect(m.nom).toMatch(/^Agrandir l’illustration de /);
      const tete = page.locator('.god-head').first();
      await tete.scrollIntoViewIfNeeded();
      await tete.screenshot({ path: join(process.env.TMPDIR ?? tmpdir(), `chaos-focus-${w}.png`) });
      await page.close();
    }
  });
});
