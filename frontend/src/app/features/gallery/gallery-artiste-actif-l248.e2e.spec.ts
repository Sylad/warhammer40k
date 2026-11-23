// @vitest-environment node
// L248 — navigateur réel, application construite (dist), données du seed (dist-server) : sous 1024 px la colonne montre
// 6 artistes, au bureau 4 (L108 r1). Un 5e ou 6e artiste choisi à 800 px puis la fenêtre élargie à 1440 px : son bouton
// restait masqué alors que le filtre restait actif (Nielsen 1, visibilité de l'état). Attendu : le bouton de l'artiste
// actif reste affiché, dans la partie visible de sa liste et de la fenêtre, pressé, et un clic dessus retire le filtre ;
// texte à 100 % et à 200 %, fenêtre de 900 et 700 px de haut.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState(['src/styles/_gallery-filtres.scss', 'src/app/features/gallery/gallery.component.scss', 'src/app/features/gallery/gallery.component.ts']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

type Etat = { pressed: string | null; rendu: boolean; dansListe: boolean; dansFenetre: boolean; dessus: boolean; boutons: number; compte: string };

/** Le bouton de l'artiste `nom` : rendu, dans la partie visible de sa liste et de la fenêtre, non recouvert. */
function etat(nom: string): Etat {
  const b = [...document.querySelectorAll<HTMLElement>('.sidebar .artist-row')].find((x) => x.querySelector('strong')!.textContent!.trim() === nom)!;
  const rendu = b.getClientRects().length > 0;
  const r = b.getBoundingClientRect();
  const l = b.closest('.side-list')!.getBoundingClientRect();
  const barre = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const e = rendu ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
  return {
    pressed: b.getAttribute('aria-pressed'),
    rendu,
    dansListe: rendu && r.top >= l.top - 1 && r.bottom <= l.bottom + 1,
    dansFenetre: rendu && r.top >= barre - 1 && r.bottom <= innerHeight + 1,
    dessus: !!e && b.contains(e),
    boutons: [...document.querySelectorAll('.sidebar .artist-row')].filter((x) => x.getClientRects().length > 0).length,
    compte: document.querySelector('[data-testid="grille-oeuvres"]')!.children.length + '',
  };
}

describe.skipIf(!built || !chromium)('galerie — l\'artiste du filtre actif reste visible et retirable (L248, navigateur, dist)', () => {
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

  async function open(texte200: boolean): Promise<Page> {
    const page = await browser.newPage();
    page.setDefaultTimeout(6000);
    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto(base + '/gallery');
    // texte à 200 % : taille de police par défaut doublée (réglage du navigateur), la mise en page en px reste la même
    if (texte200) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await page.locator('[data-testid="grille-oeuvres"]').waitFor();
    await page.locator('.sidebar .artist-row').nth(5).waitFor();
    await page.evaluate(() => document.fonts.ready);
    return page;
  }

  for (const texte200 of [false, true]) {
    for (const rang of [4, 5]) {
      for (const h of [900, 700]) {
        it(`${rang + 1}e artiste choisi à 800 px, fenêtre passée à 1440×${h}, texte ${texte200 ? '200' : '100'} % : bouton visible, pressé, et retire le filtre`, async () => {
          const page = await open(texte200);
          const bouton = page.locator('.sidebar .artist-row').nth(rang);
          const nom = (await bouton.locator('strong').textContent())!.trim();
          const avant = await page.locator('[data-testid="grille-oeuvres"] > *').count();
          await bouton.click();
          await page.waitForTimeout(300);
          expect(await bouton.getAttribute('aria-pressed')).toBe('true');

          await page.setViewportSize({ width: 1440, height: h });
          await page.waitForTimeout(400);
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(150);
          const m = await page.evaluate(etat, nom);
          const s = JSON.stringify(m);
          expect(m.pressed, s).toBe('true');
          expect(m.rendu, s).toBe(true);
          expect(m.dansListe, s).toBe(true);
          // les autres 5e / 6e restent masqués au bureau : 4 + l'artiste actif
          expect(m.boutons, s).toBe(5);

          // amené dans la fenêtre (comme le ferait un défilement de la page), il n'est recouvert par rien
          await page.locator('.sidebar .artist-row.active').scrollIntoViewIfNeeded();
          await page.waitForTimeout(150);
          const v = await page.evaluate(etat, nom);
          expect(v.dansFenetre, JSON.stringify(v)).toBe(true);
          expect(v.dansListe, JSON.stringify(v)).toBe(true);
          expect(v.dessus, JSON.stringify(v)).toBe(true);

          // retirable : un clic sur le bouton défait le filtre ; il redevient masqué (5e / 6e au bureau)
          await page.locator('.sidebar .artist-row.active').click();
          await page.waitForTimeout(300);
          const apres = await page.evaluate(etat, nom);
          expect(apres.pressed, JSON.stringify(apres)).toBe('false');
          expect(apres.boutons, JSON.stringify(apres)).toBe(4);
          expect(await page.locator('[data-testid="grille-oeuvres"] > *').count()).toBe(avant);
          await page.close();
        }, 30_000);
      }
    }
  }
});

// L248 r1 — la rangée active (artiste, collection) se distingue des autres sans la couleur du texte (WCAG 1.4.1) :
// fond, filet à gauche et marque « ✕ » mesurés ; le filet et la pastille contrastent d'au moins 3:1 avec le fond du
// panneau (WCAG 1.4.11) ; le nom du bouton ne change pas, « Retirer le filtre … » en title.
type Marque = { fond: string; filet: string; marque: boolean; pastille: string; title: string | null; nom: string; contrasteFilet: number; contrastePastille: number };

function marques([selecteur, index]: [string, number]): Marque {
  const b = document.querySelectorAll<HTMLElement>(selecteur)[index];
  const cs = getComputedStyle(b);
  const pastille = b.querySelector<HTMLElement>('.ar-avatar, .col-icon')!;
  const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const lum = ([r, g, v]: number[]) => {
    const f = (x: number) => ((x /= 255) <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(v);
  };
  const ratio = (a: number[], c: number[]) => { const [x, y] = [lum(a), lum(c)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const panneau = [19, 15, 11]; // haut du dégradé du panneau, le plus clair (rgba(19,15,11,.92))
  const filet = cs.boxShadow.match(/rgba?\([^)]*\)/)?.[0] ?? '';
  return {
    fond: cs.backgroundColor,
    filet: cs.boxShadow,
    marque: !!b.querySelector('.row-mark') && b.querySelector('.row-mark')!.getClientRects().length > 0,
    pastille: getComputedStyle(pastille).backgroundColor,
    title: b.getAttribute('title'),
    nom: b.querySelector('strong')!.textContent!.trim(),
    contrasteFilet: filet ? ratio(rgb(filet), panneau) : 0,
    contrastePastille: ratio(rgb(getComputedStyle(pastille).backgroundColor), panneau),
  };
}

describe.skipIf(!built || !chromium)('galerie — la rangée active se reconnaît sans la couleur (L248 r1, navigateur, dist)', () => {
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

  for (const [w, h] of [[1440, 900], [390, 844]] as const) {
    for (const sel of ['.sidebar .artist-row', '.sidebar .col-row']) {
      it(`${sel.includes('artist') ? 'artiste' : 'collection'} à ${w}×${h} : fond, filet et marque, contraste ≥ 3:1`, async () => {
        const page = await browser.newPage();
        page.setDefaultTimeout(6000);
        await page.setViewportSize({ width: w, height: h });
        await page.goto(base + '/gallery');
        await page.locator('[data-testid="grille-oeuvres"]').waitFor();
        await page.locator(sel).nth(1).waitFor();
        const avant = await page.evaluate(([s]) => document.querySelectorAll<HTMLElement>(s)[1].getBoundingClientRect().height, [sel]);
        await page.locator(sel).nth(1).click();
        await page.waitForTimeout(300);
        expect(await page.locator(sel).nth(1).getAttribute('aria-pressed')).toBe('true');
        const actif = await page.evaluate(marques, [sel, 1] as [string, number]);
        const autre = await page.evaluate(marques, [sel, 0] as [string, number]);
        const m = JSON.stringify({ actif, autre });
        expect(actif.fond, m).not.toBe(autre.fond);
        expect(actif.filet, m).not.toBe(autre.filet);
        expect(actif.filet, m).toMatch(/inset/);
        expect(actif.marque, m).toBe(true);
        expect(autre.marque, m).toBe(false);
        expect(actif.pastille, m).not.toBe(autre.pastille);
        expect(actif.contrasteFilet, m).toBeGreaterThanOrEqual(3);
        expect(actif.contrastePastille, m).toBeGreaterThanOrEqual(3);
        expect(actif.title, m).toBe('Retirer le filtre ' + actif.nom);
        expect(autre.title, m).toBeNull();
        // la marque ne fait pas grandir la rangée (la colonne tient toujours, L108 r1)
        const hauteur = await page.evaluate(([s]) => document.querySelectorAll<HTMLElement>(s)[1].getBoundingClientRect().height, [sel]);
        expect(hauteur).toBeLessThanOrEqual(avant + 0.5);
        await page.close();
      }, 30_000);
    }
  }
});
