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

  async function ouvrir(width: number, adresse: string, reducedMotion: 'reduce' | 'no-preference' = 'reduce', height = width > 500 ? 900 : 844): Promise<Page> {
    const page = await browser.newPage({ reducedMotion });
    await page.route((u) => !u.host.startsWith('127.0.0.1'), (r) => r.abort()); // aucune requête externe
    await page.setViewportSize({ width, height });
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
      // sous la barre ; plus bas seulement si la page filtrée finit avant (on ne défile pas au-delà de sa fin), ou si le
      // contrôle pressé, dans une colonne collée, serait passé sous la barre : la colonne, arrivée au bas de son
      // conteneur, reste à son `top` collé (L240 r1), ou le contrôle seul juste sous la barre
      const colle = await placeColle(controle);
      const borneParLeControle = colle !== null && colle.auBas
        && (Math.abs(colle.haut - apres.marge) <= 2 || Math.abs(colle.colonne - colle.topColle) <= 2);
      if (!apres.finDePage && !borneParLeControle) expect(Math.abs(apres.haut - apres.marge), `haut des résultats pas sous la barre : ${ctx}`).toBeLessThanOrEqual(2);
      expect(apres.focusResultats, `focus pas sur la liste : ${ctx}`).toBe(true);
    }
    // L240 (revue r2, m1) : un contrôle d'une colonne collée reste entièrement sous la barre après le défilement
    const colle = await placeColle(controle);
    if (colle) expect(colle.haut, `contrôle collé sous la barre (${colle.haut}–${colle.bas} px, barre ${apres.marge}) : ${ctx}`).toBeGreaterThanOrEqual(apres.marge - 2);
    expect(await controle.getAttribute('aria-pressed')).toBe('true');
  }

  /**
   * Haut et bas du contrôle, haut de sa colonne et son `top` collé, dans la fenêtre, et si la colonne touche le bas de son
   * conteneur (elle ne peut plus rester collée plus bas), s'il est dans un bloc `position: sticky` ; sinon null.
   */
  const placeColle = (controle: Locator) =>
    controle.evaluate((e) => {
      let colle: HTMLElement | null = null;
      for (let x: HTMLElement | null = e; x && x !== document.body; x = x.parentElement) if (getComputedStyle(x).position === 'sticky') colle = x;
      if (!colle) return null;
      const r = e.getBoundingClientRect();
      const c = colle.getBoundingClientRect();
      const parent = colle.parentElement!;
      const fin = parent.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(parent).paddingBottom) || 0);
      return {
        haut: Math.round(r.top),
        bas: Math.round(r.bottom),
        colonne: Math.round(c.top),
        topColle: parseFloat(getComputedStyle(colle).top),
        auBas: c.bottom + (parseFloat(getComputedStyle(colle).marginBottom) || 0) >= fin - 2,
      };
    });

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

  // L240 (revue r2 de L239, m1) : à 1440 px, « Durée courte » cliqué depuis scrollY 400 et 1700 (départs de la revue) ;
  // avec 2 résultats la mise en page devient plus courte que la colonne collée, qui remonte avec le bas de son conteneur :
  // la rangée pressée finissait à 54-90 px, sous la barre (70 px). Le défilement est borné pour la garder dessous.
  for (const [nom, depart] of [['Durée courte', 400], ['Durée courte', 1700], ['Animations » (filtres', 1700]] as const) {
    it(`1440 px, /videos : « ${nom.replace(/[»(].*$/, '').trim()} » des filtres avancés depuis scrollY ${depart} → la rangée pressée reste sous la barre`, async () => {
      const c = cas(nom);
      const page = await ouvrir(1440, c.page);
      const controle = await pret(page, c);
      await page.evaluate((y) => window.scrollTo(0, y), depart);
      await page.waitForTimeout(100);
      const avant = await mesure(page, c.resultats);
      const box = (await controle.boundingBox())!;
      expect(box.y >= avant.marge && box.y + box.height <= avant.fenetre, `contrôle à ${box.y} px`).toBe(true);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(400);
      const apres = await mesure(page, c.resultats);
      await verifier(page, c, controle, avant, apres, 1440);
      const colle = (await placeColle(controle))!;
      expect(colle, 'la colonne des filtres avancés est collée à 1440 px').not.toBeNull();
      expect(colle.haut, `rangée pressée à ${colle.haut}–${colle.bas} px, barre ${apres.marge}`).toBeGreaterThanOrEqual(apres.marge - 2);
      // la colonne entière (titre « Filtres avancés » compris) tient sous la barre avec l'en-tête des résultats
      expect(colle.colonne, `haut de la colonne à ${colle.colonne} px, barre ${apres.marge}`).toBeGreaterThanOrEqual(apres.marge - 2);
      await page.close();
    });
  }

  // L240, revue UX r1 (M1) : départs 1700 et 2000, colonne collée à son `top` (96 px). Le défilement la posait à 78 px
  // (scroll-padding-top) : la rangée pressée sautait de 18 à 49 px et un second clic au même point tombait sur la rangée
  // suivante (« Long format » au lieu de défaire « Durée courte »). Attendu : la rangée ne bouge pas de plus de 2 px, ni au
  // filtre ni quand on le défait, et le second clic au même point défait le filtre ; titre et compte en vue.
  for (const motion of ['reduce', 'no-preference'] as const) {
    for (const [nom, depart] of [['Durée courte', 1700], ['Durée courte', 2000], ['Long format', 1700], ['FR uniquement', 2000]] as const) {
      it(`1440 px, /videos (${motion}) : « ${nom} » depuis scrollY ${depart} → la rangée reste sous le pointeur, un second clic défait le filtre`, async () => {
        const page = await ouvrir(1440, '/videos', motion);
        const controle = page.locator('.check-row', { hasText: nom });
        await controle.waitFor();
        await expect.poll(() => controle.isEnabled()).toBe(true);
        await page.evaluate((y) => window.scrollTo(0, y), depart);
        await page.waitForTimeout(150);
        const avant = (await placeColle(controle))!;
        expect(avant, 'colonne collée').not.toBeNull();
        const box = (await controle.boundingBox())!;
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        // trace image par image de la rangée pressée : jamais sous la barre pendant le glissé (revue r1, m1)
        await controle.evaluate((e) => {
          const w = window as unknown as { traceRangee: number[] };
          w.traceRangee = [];
          const pas = () => { w.traceRangee.push(e.getBoundingClientRect().top); if (w.traceRangee.length < 90) requestAnimationFrame(pas); };
          requestAnimationFrame(pas);
        });
        await page.mouse.click(x, y);
        await expect.poll(() => controle.getAttribute('aria-pressed')).toBe('true');
        await page.waitForTimeout(motion === 'reduce' ? 400 : 1600);
        const trace = await page.evaluate(() => (window as unknown as { traceRangee: number[] }).traceRangee);
        const marge = (await mesure(page, VIDEOS)).marge;
        expect(Math.min(...trace), `rangée pendant le défilement : ${trace.map(Math.round).join(' ')}`).toBeGreaterThanOrEqual(marge - 2);
        const apres = (await placeColle(controle))!;
        expect(Math.abs(apres.haut - avant.haut), `rangée ${avant.haut} → ${apres.haut} px, colonne ${avant.colonne} → ${apres.colonne}`).toBeLessThanOrEqual(2);
        expect(Math.abs(apres.colonne - avant.colonne), `colonne ${avant.colonne} → ${apres.colonne}`).toBeLessThanOrEqual(2);
        const m = await mesure(page, VIDEOS);
        expect(teteEnVue(m), `titre et compte : ${m.teteHaut}–${m.teteBas} px`).toBe(true);
        // le pointeur, resté au même point, est toujours sur la rangée pressée
        expect(await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest('.check-row')?.textContent?.trim(), [x, y] as const)).toContain(nom);
        await page.mouse.click(x, y);
        await expect.poll(() => controle.getAttribute('aria-pressed')).toBe('false');
        await page.waitForTimeout(motion === 'reduce' ? 400 : 1600);
        expect(await page.locator('.check-row[aria-pressed="true"]').count(), 'aucun autre filtre avancé activé').toBe(0);
        const defait = (await placeColle(controle))!;
        expect(Math.abs(defait.haut - avant.haut), `rangée après le second clic : ${avant.haut} → ${defait.haut} px`).toBeLessThanOrEqual(2);
        await page.close();
      });
    }
  }

  // L240, revue UX r2 (M1-bis) : la rangée bougeait encore dans deux bandes, que les départs 1700 et 2000 ci-dessus ne
  // touchent pas. (a) scrollY 1460-1540 : l'en-tête des résultats est en vue, la page ne défile pas, mais la liste
  // raccourcie raccourcit le conteneur de la colonne collée, qui la repoussait vers le haut (Durée courte à 1500 :
  // 154 → 108 px, le second clic activait Long format). (b) fin de page : la colonne, déjà repoussée par le bas de son
  // conteneur, revenait à son `top` quand la page défilait vers les résultats (+26 à +131 px, second clic perdu).
  // Balayage : chaque départ de 1300 à la fin de la page, par pas de 20 px, chaque filtre avancé, 1440 × 900, 768 et 700 ;
  // page neuve à chaque départ (navigation dans l'application). Attendu : la rangée pressée reste sous le pointeur à ±4 px,
  // pendant le défilement compris, et un second clic au même point défait ce filtre, rangée toujours sous le pointeur.
  const FILTRES_AVANCES = ['Durée courte', 'Long format', 'FR uniquement', 'Animations'] as const;
  for (const motion of ['reduce', 'no-preference'] as const) {
    for (const hauteur of [900, 768, 700]) {
      it(`1440×${hauteur}, /videos (${motion}) : tout départ de 1300 à la fin de page, pas de 20 px → la rangée pressée reste sous le pointeur (±4 px), le second clic défait le filtre`, async () => {
        const page = await ouvrir(1440, '/videos', motion, hauteur);
        /** Page neuve : on quitte /videos et on y revient dans l'application (composant recréé, aucun style gardé). */
        const recharger = async () => {
          await page.evaluate(async () => {
            const aller = (u: string) => { history.pushState(null, '', u); dispatchEvent(new PopStateEvent('popstate')); };
            aller('/about');
            for (let i = 0; i < 100 && document.querySelector('.check-row'); i++) await new Promise((r) => setTimeout(r, 10));
            aller('/videos');
            for (let i = 0; i < 200; i++) {
              const r = document.querySelector<HTMLButtonElement>('.check-row');
              if (r && !r.disabled && r.querySelector('.count')) break;
              await new Promise((r) => setTimeout(r, 10));
            }
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          });
        };
        /** Clic au point (x, y) ; rend le haut de la rangée (min, max) pendant le défilement qui suit, puis à l'arrêt. */
        const cliquer = async (rangee: Locator, x: number, y: number) => {
          await rangee.evaluate((e) => {
            const w = window as unknown as { suivi: { min: number; max: number; fin: Promise<number> } };
            let stable = 0, n = 0, dernier = NaN;
            w.suivi = { min: Infinity, max: -Infinity, fin: new Promise<number>((fin) => {
              const pas = () => {
                const t = e.getBoundingClientRect().top;
                w.suivi.min = Math.min(w.suivi.min, t);
                w.suivi.max = Math.max(w.suivi.max, t);
                stable = scrollY === dernier ? stable + 1 : 0;
                dernier = scrollY;
                if ((++n > 4 && stable >= 6) || n > 150) fin(t); else requestAnimationFrame(pas);
              };
              requestAnimationFrame(pas);
            }) };
          });
          await page.mouse.click(x, y);
          return page.evaluate(async () => {
            const w = window as unknown as { suivi: { min: number; max: number; fin: Promise<number> } };
            const fin = await w.suivi.fin;
            return { min: w.suivi.min, max: w.suivi.max, fin };
          });
        };
        await page.locator('.check-row').first().waitFor();
        const finDePage = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
        const departs: number[] = [];
        for (let y = 1300; y < finDePage; y += 20) departs.push(y);
        departs.push(finDePage);
        const echecs: string[] = [];
        let testes = 0;
        let caches = 0;
        const ecart = (s: { min: number; max: number; fin: number }, y0: number) => Math.max(Math.abs(s.min - y0), Math.abs(s.max - y0), Math.abs(s.fin - y0));
        for (const nom of FILTRES_AVANCES) {
          for (const depart of departs) {
            await recharger();
            const rangee = page.locator('.check-row', { hasText: nom });
            await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), depart);
            await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
            const box = (await rangee.boundingBox())!;
            const x = box.x + box.width / 2;
            const y = box.y + box.height / 2;
            const cas = `${nom} depuis ${depart}`;
            // rangée cachée sous la barre du haut (fin de page : colonne repoussée par le bas de son conteneur) : pas de clic possible
            const visee = await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest('.check-row')?.textContent ?? '', [x, y] as const);
            if (!visee.includes(nom)) { caches++; continue; }
            testes++;
            const un = await cliquer(rangee, x, y);
            const sous = await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest('.check-row')?.textContent?.trim() ?? '', [x, y] as const);
            if (await rangee.getAttribute('aria-pressed') !== 'true') echecs.push(`${cas} : filtre pas appliqué`);
            if (ecart(un, box.y) > 4 || !sous.includes(nom)) {
              echecs.push(`${cas} : rangée ${Math.round(box.y)} → ${Math.round(un.fin)} px (${Math.round(un.min)} à ${Math.round(un.max)} pendant le défilement), sous le pointeur : « ${sous.replace(/\s+\d+$/, '')} »`);
              continue;
            }
            const deux = await cliquer(rangee, x, y);
            const actifs = (await page.locator('.check-row[aria-pressed="true"]').allTextContents()).map((t) => t.replace(/\s+\d+\s*$/, '').trim());
            if (actifs.length || ecart(deux, box.y) > 4) {
              echecs.push(`${cas}, second clic : rangée ${Math.round(box.y)} → ${Math.round(deux.fin)} px (${Math.round(deux.min)} à ${Math.round(deux.max)}), filtres actifs : ${actifs.join(', ') || 'aucun'}`);
            }
          }
        }
        expect(echecs, `${echecs.length} départs sur ${testes} (fin de page ${finDePage}, ${caches} départs où la rangée est sous la barre)`).toEqual([]);
        expect(caches, 'rangée cliquable à au moins trois départs sur quatre').toBeLessThan((testes + caches) / 4);
        await page.close();
      }, 600_000);
    }
  }

  // L240 (revue r2 de L239, m2) : un clic sur la puce déjà active (« Tous » au chargement, ou Lore cliquée deux fois)
  // faisait défiler la page de 1554 px (1440) ou 2737 px (390) sans changer la liste. Attendu : rien ne bouge.
  for (const width of [390, 1440]) {
    for (const puce of ['Tous', 'Lore'] as const) {
      it(`${width} px, /videos : clic sur la puce « ${puce} » déjà active → ni défilement ni déplacement du focus`, async () => {
        const page = await ouvrir(width, '/videos');
        const controle = page.locator('.toolbar .filter', { hasText: puce });
        await controle.waitFor();
        if (puce !== 'Tous') {
          await controle.click();
          await expect.poll(() => controle.getAttribute('aria-pressed')).toBe('true');
          await page.waitForTimeout(400);
        }
        expect(await controle.getAttribute('aria-pressed')).toBe('true');
        await controle.scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);
        const avant = await mesure(page, VIDEOS);
        const nombre = await page.locator(`${VIDEOS} .card-link`).count();
        await controle.click();
        await page.waitForTimeout(400);
        const apres = await mesure(page, VIDEOS);
        expect(Math.abs(apres.y - avant.y), `scrollY ${avant.y} → ${apres.y}`).toBeLessThanOrEqual(1);
        expect(apres.focusResultats).toBe(false);
        expect(await controle.evaluate((e) => e === document.activeElement)).toBe(true);
        expect(await page.locator(`${VIDEOS} .card-link`).count()).toBe(nombre);
        await page.close();
      });
    }
  }

  // L240 (revue r2 de L239, m3) : téléphone bas (390×667), liste Faction entièrement visible au bas de l'écran (631-667
  // px dans la revue). Le choix ne déplace ni la page ni le focus (WCAG 3.2.2) ; le rappel du compte du panneau était
  // sous Trier par, 174 px plus bas (805 px, hors de la fenêtre). Attendu : le compte est dans la fenêtre, page et focus
  // immobiles. Départ : bas de la liste à `marge` px du bas de l'écran.
  for (const [hauteur, marge] of [[667, 0], [667, 40], [844, 0], [844, 300]] as const) {
    it(`390×${hauteur}, /gallery, liste Faction à ${marge} px du bas de l'écran : choix → le compte du panneau est à l'écran, rien ne bouge`, async () => {
      const c = cas('faction');
      const page = await ouvrir(390, c.page, 'reduce', hauteur);
      const controle = await pret(page, c);
      await controle.evaluate((e, m) => window.scrollBy(0, e.getBoundingClientRect().bottom - innerHeight + m), marge);
      await page.waitForTimeout(100);
      const liste = (await controle.boundingBox())!;
      expect(liste.y >= 70 && liste.y + liste.height <= hauteur + 1, `liste Faction à ${liste.y} px`).toBe(true);
      const avant = await mesure(page, c.resultats);
      await c.appliquer(controle);
      await expect.poll(() => page.getByTestId('resultats-panneau').textContent()).toMatch(/^\s*\d+ résultats?\s*$/);
      await page.waitForTimeout(300);
      const apres = await mesure(page, c.resultats);
      expect(Math.abs(apres.y - avant.y), `scrollY ${avant.y} → ${apres.y}`).toBeLessThanOrEqual(1);
      expect(await controle.evaluate((e) => e === document.activeElement)).toBe(true);
      const r = await page.getByTestId('resultats-panneau').evaluate((e) => {
        const b = e.getBoundingClientRect();
        return { haut: Math.round(b.top), bas: Math.round(b.bottom), h: b.height };
      });
      expect(r.h).toBeGreaterThan(0);
      expect(r.haut >= apres.marge - 2 && r.bas <= hauteur, `compte à ${r.haut}–${r.bas} px (fenêtre ${hauteur}, barre ${apres.marge})`).toBe(true);
      // la région d'état de la grille annonce le même compte (le rappel du panneau est aria-hidden)
      expect((await page.getByTestId('resultats-statut').textContent())?.trim()).toBe((await page.getByTestId('resultats-panneau').textContent())?.trim());
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
