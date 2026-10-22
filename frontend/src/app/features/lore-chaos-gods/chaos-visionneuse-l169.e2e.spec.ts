// @vitest-environment node
// L169 (revue UX L11, WCAG 2.1.2, 2.4.3, 4.1.2) — visionneuse du Panthéon du Chaos, navigateur réel, application
// construite (dist) : le focus entre dans le dialogue, y boucle, revient à l'élément d'origine, et « Fermer » n'est
// pas sous la barre du haut à 390 px. Attributs : chaos-visionneuse-l169.spec.ts.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/app/features/lore-chaos-gods/lore-chaos-gods.component.ts',
  'src/app/features/lore-chaos-gods/lore-chaos-gods.component.scss',
  'src/app/shared/lightbox-dialog.directive.ts',
  'src/app/layout/main-layout/main-layout.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

const GREY = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#555"/></svg>').toString('base64');

describe.skipIf(!built || !chromium)('Panthéon du Chaos, visionneuse (navigateur, dist) — L169', () => {
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

  async function open(largeur = 1440): Promise<Page> {
    const page = await browser.newPage({ viewport: { width: largeur, height: largeur === 1440 ? 900 : 844 } });
    // une image distincte par requête : galerie à plusieurs miniatures, comme en production
    await page.route('**/api/wiki-image*', (r) => r.fulfill({ json: { imageUrl: `${GREY}#${new URL(r.request().url()).searchParams.get('q')}` } }));
    await page.goto(`${base}/lore/chaos-gods`);
    await page.locator('.god-bg').first().waitFor();
    await page.locator('.god-bg[style*="background-image"]').first().waitFor();
    return page;
  }
  const focus = (page: Page) => page.evaluate(() => {
    const a = document.activeElement as HTMLElement;
    return { classe: a.className, dansDialogue: !!a.closest('[role="dialog"]') };
  });

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  it('R2 — à l’ouverture au clavier, le focus entre dans le dialogue (Fermer) ; il est modal et nommé', async () => {
    const page = await open();
    await page.locator('.god-bg').first().focus();
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
    await page.locator('.god-bg').first().focus();
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

  it('R4 — Échap et le bouton Fermer rendent le focus à l’élément d’origine (illustration, daemon notable)', async () => {
    const page = await open();
    for (const [origine, classe] of [['.god-bg', 'god-bg'], ['.notable-card', 'notable-card']]) {
      for (const fermer of ['Escape', 'bouton']) {
        await page.locator(origine).first().focus();
        await page.keyboard.press('Enter');
        await page.locator('[role="dialog"] .lightbox-close').waitFor();
        if (fermer === 'Escape') await page.keyboard.press('Escape');
        else await page.locator('.lightbox-close').click();
        await page.locator('[role="dialog"]').waitFor({ state: 'detached' });
        expect(await page.evaluate(() => document.activeElement?.className), `${origine} ${fermer}`).toContain(classe);
      }
    }
    await page.close();
  });

  it('R6 — un clic dans une zone non focalisable du dialogue (description, image, titre) ne sort pas le focus : Tab y reste', async () => {
    const page = await open();
    await page.locator('.god-bg').first().focus();
    await page.keyboard.press('Enter');
    await page.locator('[role="dialog"] .lightbox-close').waitFor();
    for (const zone of ['.lightbox-info .lightbox-desc', '.lightbox-image', '.lightbox-title']) {
      await page.locator(`[role="dialog"] ${zone}`).click();
      expect((await focus(page)).dansDialogue, `clic ${zone}`).toBe(true);
      await page.keyboard.press('Tab');
      expect((await focus(page)).dansDialogue, `Tab après ${zone}`).toBe(true);
    }
    await page.close();
  });

  it('R7 — à 390 px, « Fermer » n’est pas caché sous la barre du haut : le toucher en son centre ferme la visionneuse', async () => {
    const page = await open(390);
    await page.locator('.god-bg').first().focus();
    await page.keyboard.press('Enter');
    await page.locator('[role="dialog"] .lightbox-close').waitFor();
    const dessus = await page.locator('.lightbox-close').evaluate((b) => {
      const r = b.getBoundingClientRect();
      const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!e && (e === b || b.contains(e));
    });
    expect(dessus).toBe(true);
    await page.locator('.lightbox-close').click();
    await page.locator('[role="dialog"]').waitFor({ state: 'detached' });
    await page.close();
  });
});
