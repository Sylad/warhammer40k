// @vitest-environment node
// L96 — navigateur réel, application construite (dist), API bouchonnée par page.route. Revue UX L3 : sur /factions, la
// grille restait vide au chargement et sur erreur d'API, « UNITÉS 0 » s'affichait tant que les unités chargeaient, et une
// recherche sans résultat était muette.
// Attendu (demande du lot) : chaque état a son affichage — chargement visible, erreur avec « Réessayer », recherche vide
// avec « Effacer les filtres » (comme /videos L242 : focus sur le premier résultat revenu) — et une région live annonce le
// nombre de résultats ; à 390 et 1440 px, sans défilement horizontal, cibles d'au moins 24 px.
// Captures : variable CAPTURES (dossier) — jamais dans le dépôt.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page, Route } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/app/features/factions/factions.component.ts',
  'src/app/features/factions/factions.component.scss',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}
const CAPTURES = process.env['CAPTURES'];

describe.skipIf(!built || !chromium)('/factions : états chargement, erreur, recherche vide et région live (navigateur, dist) — L96', () => {
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

  async function ouvrir(largeur: number, prepare?: (page: Page) => Promise<void>): Promise<Page> {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    await page.route((u) => !u.host.startsWith('127.0.0.1'), (r) => r.abort());
    await prepare?.(page);
    await page.setViewportSize({ width: largeur, height: largeur < 600 ? 844 : 900 });
    await page.goto(base + '/factions');
    return page;
  }
  const capture = async (page: Page, nom: string) => {
    if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/${nom}.png`, fullPage: false });
  };
  const statut = (page: Page) => page.locator('[data-testid="compte-factions"]');
  /** Pas de défilement horizontal ; cibles de l'état affiché d'au moins 24 px de côté. */
  const mesures = (page: Page) => page.evaluate(() => ({
    debordement: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    cibles: [...document.querySelectorAll<HTMLElement>('.results button, .toolbar button, .toolbar input, .toolbar select')]
      .map((e) => { const b = e.getBoundingClientRect(); return { t: (e.textContent ?? e.getAttribute('aria-label') ?? '').trim(), w: b.width, h: b.height }; })
      .filter((c) => c.w < 24 || c.h < 24),
  }));
  /** Garde une réponse en attente jusqu'à `relacher()`. */
  function retenir(page: Page, motif: string) {
    let relacher!: () => void;
    const pret = new Promise<void>((r) => (relacher = r));
    return {
      install: () => page.route(motif, async (route: Route) => { await pret; await route.fallback(); }),
      relacher: () => relacher(),
    };
  }

  for (const largeur of [390, 1440]) {
    it(`${largeur} px — chargement : « Chargement des factions… » annoncé, cartes fantômes, puis « 17 factions »`, async () => {
      let r!: ReturnType<typeof retenir>;
      const page = await ouvrir(largeur, async (p) => { r = retenir(p, '**/api/factions'); await r.install(); });
      await page.locator('[data-testid="chargement-factions"]').waitFor();
      expect((await statut(page).textContent())?.trim()).toBe('Chargement des factions…');
      expect(await page.locator('.card-fantome').count()).toBeGreaterThan(0);
      expect(await page.locator('text=Aucune faction').count()).toBe(0);
      await capture(page, `l96-chargement-${largeur}`);
      r.relacher();
      await page.locator('a.card').first().waitFor();
      expect((await statut(page).textContent())?.trim()).toBe(`${await page.locator('a.card').count()} factions`);
      expect(await mesures(page)).toEqual({ debordement: 0, cibles: [] });
      await capture(page, `l96-liste-${largeur}`);
      await page.close();
    });

    it(`${largeur} px — unités en cours : « — » sur chaque carte, jamais « 0 »`, async () => {
      let r!: ReturnType<typeof retenir>;
      const page = await ouvrir(largeur, async (p) => { r = retenir(p, '**/api/units'); await r.install(); });
      await page.locator('a.card').first().waitFor();
      const comptes = await page.locator('.units-count strong').allTextContents();
      expect(new Set(comptes.map((c) => c.trim()))).toEqual(new Set(['—']));
      await capture(page, `l96-unites-en-cours-${largeur}`);
      r.relacher();
      await page.waitForFunction(() => [...document.querySelectorAll('.units-count strong')].some((s) => /\d/.test(s.textContent ?? '')));
      await page.close();
    });

    it(`${largeur} px — erreur : alerte avec « Réessayer » ; Réessayer recharge et le focus va à la première carte`, async () => {
      let echecs = 1;
      const page = await ouvrir(largeur, async (p) => {
        await p.route('**/api/factions', (route) => (echecs-- > 0 ? route.fulfill({ status: 500, body: '{}' }) : route.fallback()));
      });
      const alerte = page.locator('[role="alert"][data-testid="erreur-factions"]');
      await alerte.waitFor();
      expect(await alerte.textContent()).toContain('n’ont pas pu être chargées');
      expect(await page.locator('a.card, .card-fantome').count()).toBe(0);
      expect(await mesures(page)).toEqual({ debordement: 0, cibles: [] });
      await capture(page, `l96-erreur-${largeur}`);
      const bouton = page.locator('[data-testid="bouton-reessayer"]');
      await bouton.focus();
      await page.keyboard.press('Enter');
      await page.locator('a.card').first().waitFor();
      await page.waitForFunction(() => document.activeElement?.matches('a.card'));
      expect(await alerte.count()).toBe(0);
      expect((await statut(page).textContent())?.trim()).toMatch(/^\d+ factions$/);
      await page.close();
    });

    it(`${largeur} px — recherche sans résultat : message, « Effacer les filtres », focus sur la première carte revenue`, async () => {
      const page = await ouvrir(largeur);
      await page.locator('a.card').first().waitFor();
      const total = ((await statut(page).textContent()) ?? '').trim();
      await page.locator('input.search').fill('zzzz');
      const vide = page.locator('[data-testid="filtres-vides"]');
      await vide.waitFor();
      expect(await vide.textContent()).toContain('Aucune faction ne correspond à la recherche « zzzz »');
      expect((await statut(page).textContent())?.trim()).toBe('Aucune faction');
      expect(await mesures(page)).toEqual({ debordement: 0, cibles: [] });
      await page.locator('[data-testid="effacer-etat-vide"]').scrollIntoViewIfNeeded();
      await capture(page, `l96-recherche-vide-${largeur}`);
      await page.locator('[data-testid="effacer-etat-vide"]').click();
      await page.waitForFunction(() => document.activeElement?.matches('a.card'));
      expect((await statut(page).textContent())?.trim()).toBe(total);
      expect(await page.inputValue('input.search')).toBe('');
      await page.close();
    });
  }
});
