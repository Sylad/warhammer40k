// @vitest-environment node
// L21 — navigateur réel, dist : le premier Tab tombe sur « Aller au contenu » (visible, dans la fenêtre,
// 44 px de haut), Entrée donne le focus à <main> ; le pied tient à 12 px ou plus ; aucun débordement
// horizontal ; la page courante est annoncée dans la barre (1440 px) et dans le tiroir (390 px).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState(['src/app/layout/main-layout/main-layout.component.ts', 'src/app/layout/about-menu/about-menu.component.ts']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

describe.skipIf(!built || !chromium)('gabarit commun (navigateur, dist) — L21', () => {
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

  for (const [w, h] of [[1440, 900], [390, 844]]) {
    it(`R1 — ${w} px : le premier Tab montre « Aller au contenu » dans la fenêtre, Entrée mène au contenu`, async () => {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.goto(`${base}/factions`);
      await page.locator('footer.legal').waitFor();
      const hidden = (await page.locator('.skip-link').boundingBox())!;
      expect(hidden.y + hidden.height).toBeLessThanOrEqual(0); // hors écran avant le focus
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement?.classList.contains('skip-link'))).toBe(true);
      const box = (await page.locator('.skip-link').boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(w);
      expect(box.height).toBeGreaterThanOrEqual(44);
      await page.screenshot({ path: `${process.env.TMPDIR}/l21-skip-${w}.png` });
      await page.keyboard.press('Enter');
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('contenu');
      await page.close();
    });

    it(`R5 — ${w} px : texte du pied ≥ 12 px, pas de débordement horizontal`, async () => {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.goto(`${base}/factions`);
      await page.locator('footer.legal').waitFor();
      expect(await page.locator('.legal-text').evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(12);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      await page.close();
    });
  }

  // Texte lu du gabarit (hors <main> et nœuds aria-hidden, symboles décoratifs) : en-tête, barre, panneaux, tiroir, fil d'Ariane, pied.
  const petitsTextes = (page: import('playwright-core').Page) =>
    page.evaluate(() => {
      const out: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement!;
        const txt = n.textContent!.trim();
        if (!txt || el.closest('[aria-hidden="true"], script, style, main') || !el.getClientRects().length) continue;
        if (getComputedStyle(el).visibility === 'hidden') continue;
        const px = parseFloat(getComputedStyle(el).fontSize);
        if (px < 11.99) out.push(`${txt} (${px.toFixed(2)} px)`);
      }
      return out;
    });

  it('R5 — 390 px : tiroir ouvert, fil d\'Ariane, pastille et pied sans texte sous 12 px', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${base}/factions`);
    await page.locator('button.menu-toggle').click();
    await page.locator('#menu-telephone').waitFor({ state: 'visible' });
    expect(await petitsTextes(page)).toEqual([]);
    await page.close();
  });

  it('R5 — 1440 px : barre, panneau Lore et raccourci sans texte sous 12 px', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/factions`);
    await page.locator('nav.nav').waitFor();
    await page.locator('button.lore-toggle').click();
    await page.locator('#menu-lore').waitFor({ state: 'visible' });
    expect(await petitsTextes(page)).toEqual([]);
    await page.close();
  });

  it('R3 — 1440 px : « Factions » est la seule entrée annoncée page courante dans la barre', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/factions`);
    await page.locator('nav.nav').waitFor();
    expect(await page.locator('nav.nav [aria-current]').evaluateAll((l) => l.map((a) => a.getAttribute('href')))).toEqual(['/factions']);
    expect(await page.locator('nav.nav').getAttribute('aria-label')).toBe('Menu principal');
    await page.close();
  });

  it('R3 — 390 px : le tiroir annonce la page courante', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${base}/romans`);
    await page.locator('button.menu-toggle').click();
    expect(await page.locator('#menu-telephone [aria-current]').evaluateAll((l) => l.map((a) => a.textContent!.trim()))).toEqual(['Romans']);
    await page.screenshot({ path: `${process.env.TMPDIR}/l21-tiroir-390.png` });
    await page.close();
  });
});
