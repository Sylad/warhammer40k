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
  'src/app/layout/main-layout/main-layout.component.ts',
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

  it('R7 — un clic dans une zone non focalisable du dialogue (description, image, titre) ne sort pas le focus : Tab y reste', async () => {
    const page = await open();
    await page.locator('.hero-portrait').focus();
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

  it('R8 — à 390 px, « Fermer » n’est pas caché sous la barre du haut : le toucher en son centre ferme la visionneuse', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    // une image distincte par requête : galerie à plusieurs miniatures, cadre aussi haut que sur une vraie fiche
    await page.route('**/api/wiki-image*', (r) => r.fulfill({ json: { imageUrl: `${GREY}#${new URL(r.request().url()).searchParams.get('q')}` } }));
    await page.goto(`${base}/lore/primarchs/horus`);
    await page.locator('#croisade .inline-figure-img').waitFor();
    await page.locator('.hero-portrait').focus();
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

  it('R9 — Ctrl+K avec la visionneuse ouverte : la recherche s’affiche au-dessus et garde le focus sur son champ', async () => {
    const page = await open();
    await page.locator('.hero-portrait').focus();
    await page.keyboard.press('Enter');
    await page.locator('[role="dialog"] .lightbox-close').waitFor();
    await page.keyboard.press('Control+k');
    await page.locator('.cmdk-panel').waitFor();
    await page.waitForFunction(() => document.activeElement?.classList.contains('cmdk-input'));
    const visible = await page.locator('.cmdk-panel .cmdk-input').evaluate((i) => {
      const r = i.getBoundingClientRect();
      const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!e && (e === i || i.contains(e));
    });
    expect(visible).toBe(true);
    await page.keyboard.type('horus');
    expect(await page.locator('.cmdk-input').inputValue()).toBe('horus');
    await page.close();
  });

  it('R10 — visionneuse ouverte, choisir un autre Primarque par Ctrl+K la ferme : plus de dialogue au nom de l’ancien, le focus est sur le h1 de la nouvelle fiche', async () => {
    const page = await open();
    await page.locator('.hero-portrait').focus();
    await page.keyboard.press('Enter');
    await page.locator('[role="dialog"] .lightbox-close').waitFor();
    await page.keyboard.press('Control+k');
    await page.locator('.cmdk-panel').waitFor();
    await page.waitForFunction(() => document.activeElement?.classList.contains('cmdk-input'));
    await page.keyboard.type('sanguinius');
    await page.locator('.cmdk-item').first().waitFor();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('h1')?.textContent?.trim() === 'Sanguinius');
    // la fiche est réutilisée : laisser les rendus asynchrones se poser avant de mesurer
    await page.locator('#croisade .inline-figure-img').waitFor();
    expect(await page.locator('[role="dialog"]').count(), 'dialogue').toBe(0);
    expect(await page.locator('.lightbox').count(), 'visionneuse').toBe(0);
    expect(await page.locator('.lightbox-title').count(), 'titre de la visionneuse').toBe(0);
    expect(await page.evaluate(() => {
      const a = document.activeElement as HTMLElement;
      return { balise: a.tagName, dansMain: !!a.closest('main'), texte: a.textContent?.trim() };
    })).toEqual({ balise: 'H1', dansMain: true, texte: 'Sanguinius' });
    // la nouvelle fiche s’ouvre normalement et porte son propre nom
    await page.locator('.hero-portrait').click();
    await page.locator('[role="dialog"] .lightbox-title').waitFor();
    expect(await page.locator('[role="dialog"]').getAttribute('aria-label')).toBe('Visionneuse — Sanguinius');
    expect((await page.locator('.lightbox-title').textContent())?.trim()).toBe('Sanguinius');
    await page.close();
  });

  it('R10 — même chose au retour arrière du navigateur (sans la recherche) : visionneuse fermée, focus sur le h1', async () => {
    const page = await open();
    // navigation interne (pas de rechargement) horus -> sanguinius par la recherche ; la visionneuse s’ouvre sur Sanguinius, puis retour
    await page.keyboard.press('Control+k');
    await page.locator('.cmdk-panel').waitFor();
    await page.waitForFunction(() => document.activeElement?.classList.contains('cmdk-input'));
    await page.keyboard.type('sanguinius');
    await page.locator('.cmdk-item').first().waitFor();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('h1')?.textContent?.trim() === 'Sanguinius');
    await page.locator('#croisade .inline-figure-img').waitFor();
    await page.locator('.hero-portrait').focus();
    await page.keyboard.press('Enter');
    await page.locator('[role="dialog"] .lightbox-close').waitFor();
    await page.goBack();
    await page.waitForFunction(() => document.querySelector('h1')?.textContent?.trim() === 'Horus Lupercal');
    await page.locator('#croisade .inline-figure-img').waitFor();
    expect(await page.locator('[role="dialog"]').count(), 'dialogue').toBe(0);
    expect(await page.evaluate(() => (document.activeElement as HTMLElement).tagName)).toBe('H1');
    await page.close();
  });

  it('R11 — Échap avec la recherche ouverte par-dessus la visionneuse ne ferme que la recherche ; le suivant ferme la visionneuse', async () => {
    const page = await open();
    await page.locator('#origines .info-card-img').focus();
    await page.keyboard.press('Enter');
    await page.locator('[role="dialog"] .lightbox-close').waitFor();
    await page.keyboard.press('Control+k');
    await page.locator('.cmdk-panel').waitFor();
    await page.waitForFunction(() => document.activeElement?.classList.contains('cmdk-input'));
    await page.keyboard.press('Escape');
    await page.locator('.cmdk-panel').waitFor({ state: 'detached' });
    expect(await page.locator('[role="dialog"]').count(), 'visionneuse après le 1er Échap').toBe(1);
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"]').waitFor({ state: 'detached' });
    expect(await page.evaluate(() => document.activeElement?.className)).toContain('info-card-img');
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
