// @vitest-environment node
// L242 — navigateur réel, application construite (dist). Vu par le run L241/t1 : sur /videos, quand la liste est vide à
// cause des filtres, le bouton « Effacer les filtres » de l'état vide disparaît au clic et le focus retombait sur
// `body` (WCAG 2.4.3, ordre du focus).
// Attendu (demande du lot) : après « Effacer les filtres », au clavier comme à la souris, à 390 et 1440 px, le focus va
// sur un élément qui a du sens (ici le premier résultat revenu), jamais sur body, visible dans la fenêtre ; un lecteur
// d'écran apprend que la liste est revenue (la région `role=status` du compte passe à « N résultats »).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/app/features/videos/videos.component.ts',
  'src/app/features/videos/videos.component.scss',
  'src/app/core/utils/resultats-en-vue.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

const BOUTON = '[data-testid="filtres-vides"] button';

describe.skipIf(!built || !chromium)('Vidéos, « Effacer les filtres » de l’état vide : le focus ne retombe pas sur body (navigateur, dist) — L242', () => {
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

  async function ouvrir(width: number, height: number, mouvement: 'reduce' | 'no-preference'): Promise<Page> {
    const page = await browser.newPage({ reducedMotion: mouvement });
    await page.route((u) => !u.host.startsWith('127.0.0.1'), (r) => r.abort());
    await page.setViewportSize({ width, height });
    await page.goto(base + '/videos', { waitUntil: 'networkidle' });
    await page.locator('.check-row .count').first().waitFor();
    return page;
  }

  /** Élément focalisé : nature, texte, place dans la fenêtre (sous la barre fixe), dans la liste ou non. */
  const focus = (page: Page) => page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    const liste = document.querySelector('[data-testid="liste-videos"]');
    const premier = liste?.querySelector('.card-link') ?? null;
    const b = a?.getBoundingClientRect();
    const haut = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    return {
      body: !a || a === document.body,
      premier: !!a && a === premier,
      texte: (a?.textContent ?? '').trim().slice(0, 60),
      enVue: !!b && b.height > 0 && b.top >= haut - 1 && b.bottom <= innerHeight + 1,
    };
  });

  const cas = [
    [390, 844, 'souris', 'reduce'], [390, 844, 'clavier', 'reduce'], [390, 844, 'clavier', 'no-preference'],
    [1440, 900, 'souris', 'reduce'], [1440, 900, 'clavier', 'reduce'], [1440, 900, 'souris', 'no-preference'],
  ] as const;
  for (const [largeur, hauteur, geste, mouvement] of cas) {
    it(`${largeur}×${hauteur}, ${geste}, ${mouvement} : focus sur le premier résultat revenu, en vue, compte annoncé`, async () => {
      const page = await ouvrir(largeur, hauteur, mouvement);
      const total = ((await page.locator('.results-count').textContent()) ?? '').trim();
      await page.locator('input.search').fill('zzzz-aucune-video');
      await page.locator(BOUTON).waitFor();
      if (geste === 'souris') {
        await page.locator(BOUTON).scrollIntoViewIfNeeded();
        await page.locator(BOUTON).click();
      } else {
        await page.locator(BOUTON).focus();
        await page.keyboard.press('Enter');
      }
      await page.locator('[data-testid="filtres-vides"]').waitFor({ state: 'detached' });
      await page.waitForFunction(() => document.activeElement && document.activeElement !== document.body, null, { timeout: 3000 }).catch(() => {});
      // le glissé (no-preference) peut durer : on attend la fin du défilement
      await page.waitForTimeout(mouvement === 'reduce' ? 50 : 900);
      const f = await focus(page);
      expect(f.body, 'focus retombé sur body').toBe(false);
      expect(f.premier, `focus sur « ${f.texte} », pas sur le premier résultat`).toBe(true);
      expect(f.enVue, 'premier résultat focalisé hors de la fenêtre').toBe(true);
      const statut = page.locator('[data-testid="liste-videos"] .results-count');
      expect(await statut.getAttribute('role')).toBe('status');
      expect(((await statut.textContent()) ?? '').trim()).toBe(total);
      expect(await page.locator('input.search').inputValue()).toBe('');
      await page.close();
    }, 30_000);
  }
});
