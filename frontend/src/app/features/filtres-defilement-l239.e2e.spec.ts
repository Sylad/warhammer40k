// @vitest-environment node
// L239 — navigateur réel, application construite (dist) : appliquer un filtre de la Galerie ou des Vidéos ne fait
// plus sauter la page. Revue UX de L238 (20-11) à 390 px : « Karl Kopinski » sautait de 309 px (défilement subi
// −1976 px), « Durée courte » de 858 px. Cause : ces boutons sont SOUS la liste au téléphone ; le filtre raccourcit
// le document et le navigateur ramenait scrollY au nouveau maximum (bouton sorti de l'écran par le haut).
// Règle mesurée, à 390 et 1440 px, sur window.scrollY avant/après :
//  - haut des résultats visible (ou plus bas) avant le filtre → scrollY inchangé (±1 px) ; le contenu au-dessus peut
//    changer de hauteur (une faction a moins de catégories), la page, elle, ne défile pas ;
//  - haut des résultats sorti de l'écran par le haut (filtre sous la liste) → un seul défilement qui pose le haut des
//    résultats sous la barre du haut (scroll-padding-top), focus sur la liste ; jamais le « nouveau bas » subi.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Locator, Page } from 'playwright-core';
import { distState, startDistServer } from '../../testing/dist-server';

const { built, stale } = distState([
  'src/app/features/gallery/gallery.component.ts',
  'src/app/features/videos/videos.component.ts',
  'src/app/core/utils/resultats-en-vue.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

interface Cas {
  page: '/gallery' | '/videos';
  nom: string;
  /** Le bouton ou la liste du filtre. */
  controle: (p: Page) => Locator;
  /** Applique le filtre (clic ou choix dans la liste). */
  appliquer: (c: Locator) => Promise<unknown>;
  /** Le haut des résultats (ce que l'utilisateur doit voir après le filtre). */
  resultats: string;
  /** Au téléphone, le panneau Filtres de la galerie est replié : l'ouvrir d'abord. */
  ouvrirFiltres?: boolean;
}

const clic = (c: Locator) => c.click();
const CAS: Cas[] = [
  // sous la grille au téléphone, colonne de droite au bureau
  { page: '/gallery', nom: 'artiste « Karl Kopinski »', controle: (p) => p.locator('.artist-row', { hasText: 'Karl Kopinski' }), appliquer: clic, resultats: '[data-testid="section-resultats"]' },
  { page: '/gallery', nom: 'artiste « Wayne England »', controle: (p) => p.locator('.artist-row', { hasText: 'Wayne England' }), appliquer: clic, resultats: '[data-testid="section-resultats"]' },
  // au-dessus de la grille
  { page: '/gallery', nom: 'faction « Space Marines »', controle: (p) => p.getByTestId('filtre-faction'), appliquer: (c) => c.selectOption({ label: 'Space Marines' }), resultats: '[data-testid="section-resultats"]', ouvrirFiltres: true },
  { page: '/gallery', nom: 'carte de catégorie', controle: (p) => p.locator('.category-card').first(), appliquer: clic, resultats: '[data-testid="section-resultats"]' },
  // sous la liste au téléphone, colonne de droite au bureau
  { page: '/videos', nom: '« Durée courte »', controle: (p) => p.locator('.check-row', { hasText: 'Durée courte' }), appliquer: clic, resultats: '[data-testid="liste-videos"]' },
  { page: '/videos', nom: '« Animations » (filtres avancés)', controle: (p) => p.locator('.check-row', { hasText: 'Animations' }), appliquer: clic, resultats: '[data-testid="liste-videos"]' },
  // barre d'outils, au-dessus de la liste
  { page: '/videos', nom: 'puce « Lore »', controle: (p) => p.locator('.toolbar .filter', { hasText: 'Lore' }), appliquer: clic, resultats: '[data-testid="liste-videos"]' },
];

describe.skipIf(!built || !chromium)('filtres de la Galerie et des Vidéos : pas de saut de page (navigateur, dist) — L239', () => {
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

  async function ouvrir(width: number, adresse: string, reducedMotion: 'reduce' | 'no-preference' = 'reduce'): Promise<Page> {
    const page = await browser.newPage({ reducedMotion });
    await page.route((u) => !u.host.startsWith('127.0.0.1'), (r) => r.abort()); // aucune requête externe
    await page.setViewportSize({ width, height: width > 500 ? 900 : 844 });
    await page.goto(base + adresse);
    return page;
  }

  /** Haut du bloc dans la fenêtre, et marge de la barre du haut (scroll-padding-top). */
  const mesure = (page: Page, sel: string) =>
    page.evaluate((s) => ({
      y: Math.round(scrollY),
      haut: Math.round(document.querySelector(s)!.getBoundingClientRect().top),
      marge: parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0,
      fenetre: innerHeight,
    }), sel);

  for (const width of [390, 1440]) {
    for (const cas of CAS) {
      it(`${width} px, ${cas.page} : ${cas.nom} → aucun saut, haut des résultats en vue`, async () => {
        const page = await ouvrir(width, cas.page);
        const controle = cas.controle(page);
        const bouton = page.getByTestId('bouton-filtres');
        if (cas.ouvrirFiltres) await bouton.waitFor({ state: 'attached' });
        if (cas.ouvrirFiltres && (await bouton.isVisible()) && (await bouton.getAttribute('aria-expanded')) !== 'true') await bouton.click();
        await controle.waitFor();
        await expect.poll(() => controle.isEnabled()).toBe(true); // catalogue lu
        // la page n'est pas en haut : le contrôle est dans l'écran, à 200 px de son bord bas
        await controle.scrollIntoViewIfNeeded();
        await page.evaluate(() => window.scrollBy(0, 200 - innerHeight / 2));
        await controle.scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);
        const avant = await mesure(page, cas.resultats);
        const auDessus = avant.haut < avant.marge - 1; // haut des résultats sorti de l'écran par le haut

        await cas.appliquer(controle);
        await page.waitForTimeout(400);
        const apres = await mesure(page, cas.resultats);

        if (!auDessus) {
          // filtre au-dessus ou à côté des résultats : la page ne bouge pas
          expect(Math.abs(apres.y - avant.y), `scrollY ${avant.y} → ${apres.y}`).toBeLessThanOrEqual(1);
        } else {
          // filtre sous la liste : un seul défilement qui pose le haut des résultats sous la barre, focus sur la liste
          expect(Math.abs(apres.haut - apres.marge), `haut des résultats à ${apres.haut} px (barre : ${apres.marge})`).toBeLessThanOrEqual(2);
          expect(await page.evaluate((s) => document.activeElement === document.querySelector(s), cas.resultats)).toBe(true);
        }
        if (cas.nom.includes('Space Marines')) expect(await controle.inputValue()).not.toBe('');
        else expect(await controle.getAttribute('aria-pressed')).toBe('true');
        await page.close();
      });
    }
  }

  // Les deux cas de la revue UX, au téléphone : le haut des résultats était bien hors de l'écran avant le filtre
  // (sinon les cas ci-dessus ne prouveraient rien), et le défilement doux finit au même endroit.
  for (const cas of CAS.filter((c) => c.nom.includes('Karl Kopinski') || c.nom.includes('Durée courte'))) {
    it(`390 px, ${cas.page} : ${cas.nom} est sous la liste ; sans « reduce », le défilement doux finit sur le haut des résultats`, async () => {
      const page = await ouvrir(390, cas.page, 'no-preference');
      const controle = cas.controle(page);
      await controle.waitFor();
      await controle.scrollIntoViewIfNeeded();
      const avant = await mesure(page, cas.resultats);
      expect(avant.haut).toBeLessThan(0);
      await cas.appliquer(controle);
      await expect.poll(async () => {
        const m = await mesure(page, cas.resultats);
        return Math.abs(m.haut - m.marge) <= 2;
      }, { timeout: 3000 }).toBe(true);
      await page.close();
    });
  }
});
