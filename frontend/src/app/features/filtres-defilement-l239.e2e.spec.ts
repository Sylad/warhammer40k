// @vitest-environment node
// L239 — navigateur réel, application construite (dist) : appliquer un filtre de la Galerie ou des Vidéos ne fait
// plus sauter la page. Revue UX de L238 (20-11) à 390 px : « Karl Kopinski » sautait de 309 px (défilement subi
// −1976 px), « Durée courte » de 858 px. Cause : ces boutons sont SOUS la liste au téléphone ; le filtre raccourcit
// le document et le navigateur ramenait scrollY au nouveau maximum (bouton sorti de l'écran par le haut).
// Revue r1 (20-11) : à 1440 px l'ancrage de défilement de Chromium faisait sauter la page de ~520 px et sortait de l'écran
// le bouton pressé (M1, m5) ; après un filtre placé au-dessus de la liste, le titre et le compte restaient sous la fenêtre
// (M2) ; sans réduction de mouvement, une image de rabattement précédait le glissé (m3).
// Règle mesurée (voir verifier()) : titre et compte des résultats en vue, focus en vue ; page immobile s'ils l'étaient
// déjà ; sinon un seul défilement (glissé sans saut) jusqu'au haut des résultats, focus sur la liste.
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
  /** La section des résultats ; son premier enfant <header> porte le titre et le compte. */
  resultats: string;
  /** Au téléphone, le panneau Filtres de la galerie est replié : l'ouvrir d'abord. */
  ouvrirFiltres?: boolean;
  /** Liste déroulante : le focus reste dessus (WCAG 3.2.2), le compte est dans le panneau au téléphone. */
  liste?: boolean;
}

const clic = (c: Locator) => c.click();
const GALERIE = '[data-testid="section-resultats"]';
const VIDEOS = '[data-testid="liste-videos"]';
const CAS: Cas[] = [
  // sous la grille au téléphone, colonne de droite au bureau
  { page: '/gallery', nom: 'artiste « Karl Kopinski »', controle: (p) => p.locator('.artist-row', { hasText: 'Karl Kopinski' }), appliquer: clic, resultats: GALERIE },
  { page: '/gallery', nom: 'artiste « Wayne England »', controle: (p) => p.locator('.artist-row', { hasText: 'Wayne England' }), appliquer: clic, resultats: GALERIE },
  { page: '/gallery', nom: 'collection « Horus Heresy »', controle: (p) => p.locator('.col-row', { hasText: 'Horus Heresy' }), appliquer: clic, resultats: GALERIE },
  // au-dessus de la grille
  { page: '/gallery', nom: 'faction « Space Marines »', controle: (p) => p.getByTestId('filtre-faction'), appliquer: async (c) => { await c.focus(); await c.selectOption({ label: 'Space Marines' }); }, resultats: GALERIE, ouvrirFiltres: true, liste: true },
  { page: '/gallery', nom: 'carte de catégorie', controle: (p) => p.locator('.category-card').first(), appliquer: clic, resultats: GALERIE },
  // sous la liste au téléphone, colonne de droite au bureau
  { page: '/videos', nom: '« Durée courte »', controle: (p) => p.locator('.check-row', { hasText: 'Durée courte' }), appliquer: clic, resultats: VIDEOS },
  { page: '/videos', nom: '« Animations » (filtres avancés)', controle: (p) => p.locator('.check-row', { hasText: 'Animations' }), appliquer: clic, resultats: VIDEOS },
  // barre d'outils, au-dessus de la liste
  { page: '/videos', nom: 'puce « Lore »', controle: (p) => p.locator('.toolbar .filter', { hasText: 'Lore' }), appliquer: clic, resultats: VIDEOS },
  { page: '/videos', nom: 'puce « Animations »', controle: (p) => p.locator('.toolbar .filter', { hasText: 'Animations' }), appliquer: clic, resultats: VIDEOS },
];
const cas = (nom: string) => CAS.find((c) => c.nom.includes(nom))!;

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
    await page.goto(base + adresse, { waitUntil: 'networkidle' }); // vignettes en échec posées : la page ne bouge plus
    return page;
  }

  /** Contrôle prêt (catalogue lu, panneau Filtres ouvert au téléphone). */
  async function pret(page: Page, c: Cas): Promise<Locator> {
    const controle = c.controle(page);
    const bouton = page.getByTestId('bouton-filtres');
    if (c.ouvrirFiltres) await bouton.waitFor({ state: 'attached' });
    if (c.ouvrirFiltres && (await bouton.isVisible()) && (await bouton.getAttribute('aria-expanded')) !== 'true') await bouton.click();
    await controle.waitFor();
    await expect.poll(() => controle.isEnabled()).toBe(true); // catalogue lu
    return controle;
  }

  /** scrollY, haut de la section des résultats et de son en-tête (titre + compte), élément focalisé, dans la fenêtre. */
  const mesure = (page: Page, sel: string) =>
    page.evaluate((s) => {
      const section = document.querySelector<HTMLElement>(s)!;
      const tete = section.querySelector(':scope > header')!.getBoundingClientRect();
      const actif = document.activeElement as HTMLElement;
      const a = actif.getBoundingClientRect();
      return {
        y: Math.round(scrollY),
        haut: Math.round(section.getBoundingClientRect().top),
        teteHaut: Math.round(tete.top),
        teteBas: Math.round(tete.bottom),
        marge: parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0,
        fenetre: innerHeight,
        finDePage: Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 1,
        focusResultats: actif === section,
        actifHaut: Math.round(a.top),
        actifBas: Math.round(a.bottom),
      };
    }, sel);
  type Mesure = Awaited<ReturnType<typeof mesure>>;
  const teteEnVue = (m: Mesure) => m.teteHaut >= m.marge - 2 && m.teteBas <= m.fenetre + 2;

  /**
   * Règle du lot, mesurée après le filtre :
   *  - le focus est dans la fenêtre, sous la barre (WCAG 2.4.11) : sur le contrôle pressé, ou sur la liste ;
   *  - le titre et le compte des résultats sont dans la fenêtre (liste déroulante : son rappel du compte, au téléphone) ;
   *  - s'ils l'étaient déjà avant, la page n'a pas bougé (±1 px) et le focus est resté sur le contrôle ;
   *  - sinon un seul défilement a posé le haut des résultats sous la barre, focus sur la liste.
   */
  async function verifier(page: Page, c: Cas, controle: Locator, avant: Mesure, apres: Mesure, width: number) {
    const ctx = `scrollY ${avant.y} → ${apres.y}, en-tête ${avant.teteHaut} → ${apres.teteHaut}–${apres.teteBas} px (fenêtre ${apres.fenetre}, barre ${apres.marge}), focus ${apres.actifHaut}–${apres.actifBas} px`;
    // un contrôle entièrement visible ; la liste (plus haute que l'écran) au moins par son haut
    const focusEnVue = apres.actifHaut >= apres.marge - 2 && (apres.focusResultats ? apres.actifHaut < apres.fenetre - 40 : apres.actifBas <= apres.fenetre + 2);
    expect(focusEnVue, `focus hors écran : ${ctx}`).toBe(true);
    if (c.liste) {
      // WCAG 3.2.2 : un choix dans une liste ne déplace ni le focus ni la page ; au téléphone le compte est dans le
      // panneau, sous les listes (R6), au bureau le titre des résultats est à côté
      expect(Math.abs(apres.y - avant.y), ctx).toBeLessThanOrEqual(1);
      expect(apres.focusResultats, ctx).toBe(false);
      if (width < 500) await expect.poll(() => page.getByTestId('resultats-panneau').evaluate((e) => {
        const r = e.getBoundingClientRect();
        return r.height > 0 && r.top >= 0 && r.bottom <= innerHeight;
      })).toBe(true);
      else expect(teteEnVue(apres), `titre des résultats hors écran : ${ctx}`).toBe(true);
      return;
    }
    expect(teteEnVue(apres), `titre et compte des résultats hors écran : ${ctx}`).toBe(true);
    if (teteEnVue(avant)) {
      expect(Math.abs(apres.y - avant.y), `la page a bougé : ${ctx}`).toBeLessThanOrEqual(1);
      expect(apres.focusResultats, ctx).toBe(false);
    } else {
      // sous la barre ; plus bas seulement si la page filtrée finit avant (on ne défile pas au-delà de sa fin)
      if (!apres.finDePage) expect(Math.abs(apres.haut - apres.marge), `haut des résultats pas sous la barre : ${ctx}`).toBeLessThanOrEqual(2);
      expect(apres.focusResultats, `focus pas sur la liste : ${ctx}`).toBe(true);
    }
    expect(await controle.getAttribute('aria-pressed')).toBe('true');
  }

  for (const width of [390, 1440]) {
    for (const c of CAS) {
      it(`${width} px, ${c.page} : ${c.nom} → aucun saut, titre et compte des résultats en vue, focus visible`, async () => {
        const page = await ouvrir(width, c.page);
        const controle = await pret(page, c);
        // la page n'est pas en haut : le contrôle est dans l'écran, à 200 px de son bord bas
        await controle.scrollIntoViewIfNeeded();
        await page.evaluate(() => window.scrollBy(0, 200 - innerHeight / 2));
        await controle.scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);
        const avant = await mesure(page, c.resultats);
        await c.appliquer(controle);
        await page.waitForTimeout(400);
        await verifier(page, c, controle, avant, await mesure(page, c.resultats), width);
        if (c.liste) expect(await controle.inputValue()).not.toBe('');
        await page.close();
      });
    }
  }

  // Revue UX r1, M1 et m5 : au bureau, la colonne de droite est collée ; quand le titre des résultats vient de passer
  // sous la barre (ou est juste dessous), l'ancrage de défilement de Chromium faisait sauter la page de ~520 px au
  // filtre et sortait de l'écran le bouton pressé, qui gardait le focus. Départ : haut des résultats à `decalage` px de
  // la barre (négatif : au-dessus).
  const ANCRAGE: [Cas, number][] = [
    // -107 : départ de la revue (scrollY 778, titre « Œuvres récentes » à −29 px du bord de la fenêtre)
    [cas('Horus Heresy'), -107], [cas('Horus Heresy'), -30], [cas('Horus Heresy'), 100], [cas('Horus Heresy'), -300],
    [cas('Karl Kopinski'), -107], [cas('Karl Kopinski'), -30], [cas('Karl Kopinski'), 100],
    [cas('Durée courte'), -70], [cas('Durée courte'), -370], [cas('Durée courte'), 60],
  ];
  for (const [c, decalage] of ANCRAGE) {
    it(`1440 px, ${c.page} : ${c.nom}, haut des résultats à ${decalage} px de la barre → pas de saut, focus visible`, async () => {
      const page = await ouvrir(1440, c.page);
      const controle = await pret(page, c);
      await page.evaluate(([s, d]) => {
        const m = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
        window.scrollBy(0, document.querySelector(s)!.getBoundingClientRect().top - m - d);
      }, [c.resultats, decalage] as const);
      await page.waitForTimeout(100);
      // le contrôle (colonne collée) est à l'écran avant le clic ; un clic de Playwright ne fait pas défiler
      const avant = await mesure(page, c.resultats);
      expect(Math.abs(avant.haut - avant.marge - decalage), `départ : ${JSON.stringify(avant)}`).toBeLessThanOrEqual(2);
      const box = (await controle.boundingBox())!;
      expect(box.y >= avant.marge && box.y + box.height <= avant.fenetre, `contrôle à ${box.y} px`).toBe(true);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(400);
      await verifier(page, c, controle, avant, await mesure(page, c.resultats), 1440);
      await page.close();
    });
  }

  // Revue UX r1, m3 : sans réduction de mouvement, le filtre placé sous la liste (téléphone) faisait d'abord rabattre la
  // page en une image (832 à 2054 px), puis venait le glissé. Attendu : un glissé seul, chaque image se rapproche du
  // but sans le dépasser, aucune ne fait plus de la moitié du chemin, et il finit sur le haut des résultats.
  for (const c of [cas('Karl Kopinski'), cas('Horus Heresy'), cas('Durée courte'), cas('Animations » (filtres')]) {
    it(`390 px, ${c.page} : ${c.nom} est sous la liste ; sans « reduce », un seul glissé jusqu'au haut des résultats`, async () => {
      const page = await ouvrir(390, c.page, 'no-preference');
      const controle = await pret(page, c);
      await controle.scrollIntoViewIfNeeded();
      const avant = await mesure(page, c.resultats);
      expect(avant.haut).toBeLessThan(0);
      await page.evaluate(() => {
        const w = window as unknown as { traceY: number[] };
        w.traceY = [];
        const pas = () => { w.traceY.push(scrollY); if (w.traceY.length < 240) requestAnimationFrame(pas); };
        requestAnimationFrame(pas);
      });
      await c.appliquer(controle);
      await expect.poll(async () => {
        const m = await mesure(page, c.resultats);
        return Math.abs(m.haut - m.marge) <= 2 && m.focusResultats;
      }, { timeout: 3000 }).toBe(true);
      await page.waitForTimeout(200);
      const trace = await page.evaluate(() => (window as unknown as { traceY: number[] }).traceY);
      const fin = (await mesure(page, c.resultats)).y;
      const chemin = avant.y - fin;
      expect(chemin).toBeGreaterThan(0);
      for (let i = 1; i < trace.length; i++) {
        const pas = trace[i - 1] - trace[i];
        expect(pas, `image ${i} : ${trace[i - 1]} → ${trace[i]} (chemin ${avant.y} → ${fin})`).toBeGreaterThanOrEqual(-1);
        expect(pas, `image ${i} : ${trace[i - 1]} → ${trace[i]} (chemin ${avant.y} → ${fin})`).toBeLessThanOrEqual(chemin / 2);
        expect(trace[i], `dépassement image ${i}`).toBeGreaterThanOrEqual(fin - 1);
      }
      expect(trace.filter((y, i) => i > 0 && y !== trace[i - 1]).length, `glissé en ${trace.length} images`).toBeGreaterThan(3);
      await page.close();
    });
  }
});
