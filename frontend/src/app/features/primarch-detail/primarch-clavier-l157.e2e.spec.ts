// @vitest-environment node
// L157 (revue UX L10, WCAG 2.1.1, 2.4.3, 4.1.2) — visionneuse de la fiche Primarque au clavier,
// navigateur réel, application construite (dist) : les entrées-signaux du composant partagé ne se
// rendent pas sous TestBed, le focus ne se vérifie donc qu'ici. Attributs et boutons : primarch-clavier-l157.spec.ts.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/app/features/primarch-detail/primarch-detail.component.scss',
  'src/app/features/primarch-detail/primarch-detail.component.ts',
  'src/app/features/lore-primarchs/lore-primarchs.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

const GREY = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#555"/></svg>').toString('base64');

describe.skipIf(!built || !chromium)('Fiche Primarque, clavier (navigateur, dist) — L157', () => {
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

  async function open(): Promise<Page> {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.route('**/api/wiki-image*', (r) => r.fulfill({ json: { imageUrl: GREY } }));
    await page.goto(`${base}/lore/primarchs/horus`);
    await page.locator('#croisade .inline-figure-img').waitFor();
    return page;
  }
  /** Classe de l’élément qui a le focus, et s’il est dans le dialogue. */
  const focus = (page: Page) => page.evaluate(() => {
    const a = document.activeElement as HTMLElement;
    return { classe: a.className, dansDialogue: !!a.closest('[role="dialog"]') };
  });

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  it('R1 — Entrée et Espace sur le portrait, une image intercalée et l’image d’Origines ouvrent la visionneuse', async () => {
    const page = await open();
    for (const sel of ['.hero-portrait', '#description .inline-figure-img', '#origines .info-card-img', '#croisade .inline-figure-img', '#heresie .inline-figure-img']) {
      for (const touche of ['Enter', 'Space']) {
        await page.locator(sel).focus();
        await page.keyboard.press(touche);
        await page.locator('[role="dialog"] .lightbox-close').waitFor();
        expect(await page.locator('[role="dialog"]').count(), `${sel} ${touche}`).toBe(1);
        await page.keyboard.press('Escape');
        await page.locator('[role="dialog"]').waitFor({ state: 'detached' });
      }
    }
    await page.close();
  });

  it('R2 — à l’ouverture au clavier, le focus entre dans le dialogue (Fermer) ; il est modal et nommé', async () => {
    const page = await open();
    await page.locator('.hero-portrait').focus();
    await page.keyboard.press('Enter');
    await page.locator('[role="dialog"] .lightbox-close').waitFor();
    expect(await focus(page)).toEqual({ classe: 'lightbox-close', dansDialogue: true });
    const d = page.locator('app-figure-lightbox[role="dialog"]');
    expect(await d.getAttribute('aria-modal')).toBe('true');
    expect(await d.getAttribute('aria-label')).toMatch(/^Visionneuse — /);
    await page.close();
  });

  it('R3 — Tab et Maj+Tab bouclent dans le dialogue : le focus n’en sort jamais', async () => {
    const page = await open();
    await page.locator('.hero-portrait').focus();
    await page.keyboard.press('Enter');
    await page.locator('[role="dialog"] .lightbox-close').waitFor();
    const total = await page.locator('[role="dialog"] button, [role="dialog"] a[href]').count();
    expect(total).toBeGreaterThan(1);
    for (let i = 0; i < total * 2 + 1; i++) {
      await page.keyboard.press('Tab');
      expect((await focus(page)).dansDialogue, `Tab ${i}`).toBe(true);
    }
    for (let i = 0; i < total * 2 + 1; i++) {
      await page.keyboard.press('Shift+Tab');
      expect((await focus(page)).dansDialogue, `Maj+Tab ${i}`).toBe(true);
    }
    await page.close();
  });

  it('R4 — Échap ferme et rend le focus à l’image d’origine ; le bouton Fermer aussi', async () => {
    const page = await open();
    for (const fermer of ['Escape', 'bouton']) {
      await page.locator('#origines .info-card-img').focus();
      await page.keyboard.press('Enter');
      await page.locator('[role="dialog"] .lightbox-close').waitFor();
      if (fermer === 'Escape') await page.keyboard.press('Escape');
      else await page.locator('.lightbox-close').click();
      await page.locator('[role="dialog"]').waitFor({ state: 'detached' });
      expect(await page.evaluate(() => document.activeElement?.className), fermer).toContain('info-card-img');
    }
    await page.close();
  });

  it('R6 — liste : le filtre actif est aria-pressed=true, un clic déplace l’état', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/lore/primarchs`);
    await page.locator('.filter').first().waitFor();
    const etat = () => page.locator('.filter').evaluateAll((l) => l.map((b) => b.getAttribute('aria-pressed')));
    expect(await etat()).toEqual(['true', 'false', 'false', 'false']);
    await page.locator('.filter').nth(1).focus();
    await page.keyboard.press('Space');
    await page.waitForSelector('.filter:nth-child(2)[aria-pressed="true"]');
    expect(await etat()).toEqual(['false', 'true', 'false', 'false']);
    await page.close();
  });
});
