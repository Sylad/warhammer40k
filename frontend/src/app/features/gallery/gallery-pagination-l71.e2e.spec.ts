// @vitest-environment node
// L71 — navigateur réel, application construite (dist) : Tab jusqu'à « Page suivante », Entrée → le focus
// est sur la grille et la région d'état polie dit « Page 2 sur N » (WCAG 2.4.3, 4.1.3).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState(['src/app/features/gallery/gallery.component.ts']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

describe.skipIf(!built || !chromium)('galerie — changement de page au clavier (navigateur, dist) — L71', () => {
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

  for (const width of [1440, 390]) {
    it(`${width} px : Entrée sur « Page suivante » → focus sur la grille, « Page 2 sur N » annoncé`, async () => {
      const page = await browser.newPage();
      await page.route((u) => !u.host.startsWith('127.0.0.1'), (r) => r.abort()); // aucune requête externe
      await page.setViewportSize({ width, height: width > 500 ? 900 : 844 });
      await page.goto(base + '/gallery');
      const suivante = page.getByRole('button', { name: 'Page suivante' });
      await suivante.waitFor();
      const live = page.getByTestId('pagination-annonce');
      expect(await live.getAttribute('role')).toBe('status');
      expect((await live.textContent())?.trim()).toBe('');
      const total = (await page.locator('.page-indicator strong').nth(1).textContent())!.trim();
      // vrai clavier : focus sur « Page suivante », puis la touche Entrée
      await suivante.focus();
      await page.keyboard.press('Enter');
      await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).toBe('grille-oeuvres');
      // le focus est posé dans le gestionnaire du clic, le texte au rendu qui suit
      await expect.poll(async () => (await live.textContent())?.trim()).toBe(`Page 2 sur ${total}`);
      expect(await page.locator('.page-indicator strong').first().textContent()).toBe('2');
      await page.close();
    });
  }

  // Suite de la revue UX L71 (constat 1, WCAG 2.3.3) : avec « reduce », le saut vers la grille est instantané
  // (mesuré avant : ~2 000 px encore en mouvement à 482 ms à 390 px) ; sans préférence il reste animé.
  for (const reducedMotion of ['reduce', 'no-preference'] as const) {
    it(`390 px, prefers-reduced-motion: ${reducedMotion} → défilement ${reducedMotion === 'reduce' ? 'instantané' : 'doux'}`, async () => {
      const page = await browser.newPage({ reducedMotion });
      await page.route((u) => !u.host.startsWith('127.0.0.1'), (r) => r.abort());
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(base + '/gallery');
      const suivante = page.getByRole('button', { name: 'Page suivante' });
      await suivante.waitFor();
      await suivante.focus();
      const avant = await page.evaluate(() => scrollY);
      // position juste après Entrée (« auto » défile dans le gestionnaire même), puis une fois tout défilement fini
      await page.keyboard.press('Enter');
      const aussitot = await page.evaluate(() => scrollY);
      await page.waitForTimeout(1500);
      const fin = await page.evaluate(() => scrollY);
      expect(avant - fin).toBeGreaterThan(500); // le saut mesuré est réel
      if (reducedMotion === 'reduce') expect(aussitot).toBe(fin);
      else expect(Math.abs(aussitot - fin)).toBeGreaterThan(100); // encore en mouvement
      await page.close();
    });
  }
});
