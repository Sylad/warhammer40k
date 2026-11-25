// @vitest-environment node
// L259 r1 — QA en prod du 25-11 : /lore/concepts à 320 px, police du navigateur à 32 px (texte à 200 %), le h1
// « Concepts & Lieux Sacrés » se coupait encore au milieu du mot (« CONCEPT / S ») : la garde de L259
// (concepts-h1-l259.e2e.spec.ts) bloquait les polices web et mesurait la police de secours, plus étroite que Cinzel.
// Ici, Cinzel et Inter sont réellement chargées (fichiers du dépôt, src/testing/polices-locales.ts, aucun réseau) et
// le texte est agrandi comme le fait l'utilisateur (réglage de police du navigateur, Page.setFontSizes). Attendu :
//   P1 — à 320 et 390 px, police du navigateur à 16 et 32 px, Cinzel chargée : chaque mot du h1 tient sur sa ligne et
//        dans la boîte du h1 ; à 32 px, le h1 reste au moins 1,05 fois les noms de concepts ;
//   P2 — polices web retenues jusqu'après le premier rendu (police de secours), puis libérées : une fois Cinzel
//        chargée, le titre est remesuré et aucun mot n'est coupé, ni avant ni après ;
//   P3 — 1440 px, réglage normal, Cinzel chargée : h1 de 60 px, noms de 32 px, rien de borné.
// Chromium via playwright-core (sauté s'il manque).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';
import { cinzelChargee, servirPolicesLocales } from '../../../testing/polices-locales';

const { built, stale } = distState(['src/app/core/utils/titres-ajustes.ts', 'src/app/layout/main-layout/main-layout.component.ts', 'src/app/features/lore-concepts/lore-concepts.component.scss']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

type Mesure = { h1: number; boite: number; bornes: number; mots: { mot: string; morceaux: number; largeur: number }[]; h2: { nom: string; taille: number }[] };

async function ouvrir(browser: Browser, base: string, width: number, police: number, retenir = false): Promise<{ page: Page; liberer: () => void }> {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  if (police !== 16) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Page.setFontSizes', { fontSizes: { standard: police } });
  }
  const liberer = await servirPolicesLocales(page, retenir);
  // sans attendre l'événement load (il attend les polices) : avec `retenir`, le premier rendu est en police de secours
  await page.goto(`${base}/lore/concepts`, { waitUntil: 'domcontentloaded' });
  await page.locator('#contenu h1').waitFor({ timeout: 10_000 });
  await page.locator('#contenu .concept-names h2').first().waitFor({ timeout: 10_000 });
  return { page, liberer };
}

/** Laisse l'ajusteur des titres repasser (il attend une image d'animation après chaque changement). */
const stable = (page: Page) => page.evaluate(() => new Promise((r) => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 300)));

const mesurer = (page: Page) => page.evaluate((): Mesure => {
  const h1 = document.querySelector<HTMLElement>('#contenu h1')!;
  const s = getComputedStyle(h1);
  const range = document.createRange();
  const mots: Mesure['mots'] = [];
  const marche = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
  for (let n = marche.nextNode(); n; n = marche.nextNode()) {
    for (const m of (n.textContent ?? '').matchAll(/\S+/g)) {
      range.setStart(n, m.index!);
      range.setEnd(n, m.index! + m[0].length);
      const rects = Array.from(range.getClientRects());
      mots.push({ mot: m[0], morceaux: rects.length, largeur: rects.reduce((l, r) => l + r.width, 0) });
    }
  }
  return {
    h1: parseFloat(s.fontSize),
    boite: h1.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight),
    bornes: document.querySelectorAll('[data-titre-borne]').length,
    mots,
    h2: [...document.querySelectorAll<HTMLElement>('#contenu .concept-names h2')]
      .map((e) => ({ nom: (e.textContent ?? '').trim(), taille: parseFloat(getComputedStyle(e).fontSize) })),
  };
});

const motsCoupes = (m: Mesure, ou: string) => m.mots
  .filter((x) => x.morceaux !== 1 || x.largeur > m.boite + 0.5)
  .map((x) => `${ou} : « ${x.mot} » en ${x.morceaux} morceau(x), ${x.largeur.toFixed(1)} px pour ${m.boite} px (h1 ${m.h1} px)`);

describe.skipIf(!built || !chromium)('/lore/concepts — le h1 ne se coupe pas avec la vraie police Cinzel (L259 r1)', () => {
  let browser: Browser;
  let server: Server;
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

  it('P1 — 320 et 390 px, police 16 et 32 px, Cinzel chargée : aucun mot du h1 coupé ; à 32 px, h1 ≥ 1,05 × noms', async () => {
    const ecarts: string[] = [];
    for (const width of [320, 390]) {
      for (const police of [16, 32]) {
        const { page } = await ouvrir(browser, base, width, police);
        expect(await cinzelChargee(page), `${width} px, ${police} px : Cinzel chargée`).toBe(true);
        await stable(page);
        const m = await mesurer(page);
        expect(m.mots.map((x) => x.mot)).toContain('Concepts');
        ecarts.push(...motsCoupes(m, `${width} px, police ${police} px`));
        if (police === 32) {
          for (const x of m.h2) if (m.h1 < 1.05 * x.taille - 0.01) ecarts.push(`${width} px, 32 px : h1 ${m.h1} px < 1,05 × « ${x.nom} » ${x.taille} px`);
        }
        await page.close();
      }
    }
    expect(ecarts).toEqual([]);
  }, 90_000);

  it('P2 — polices arrivées après le premier rendu : une fois Cinzel chargée, le h1 est remesuré, aucun mot coupé (320 px, 32 px)', async () => {
    const { page, liberer } = await ouvrir(browser, base, 320, 32, true);
    await stable(page);
    const avant = await page.evaluate(() => [...document.fonts].some((f) => f.family.replace(/['"]/g, '') === 'Cinzel' && f.status === 'loaded'));
    expect(avant, 'Cinzel encore absente au premier rendu').toBe(false);
    const secours = await mesurer(page);
    liberer();
    expect(await cinzelChargee(page)).toBe(true);
    await stable(page);
    const m = await mesurer(page);
    await page.close();
    expect(motsCoupes(secours, '320 px, 32 px, police de secours')).toEqual([]);
    expect(motsCoupes(m, '320 px, 32 px, Cinzel arrivée ensuite')).toEqual([]);
  }, 60_000);

  it('P3 — 1440 px, réglage normal, Cinzel chargée : h1 de 60 px, noms de 32 px, rien de borné', async () => {
    const { page } = await ouvrir(browser, base, 1440, 16);
    expect(await cinzelChargee(page)).toBe(true);
    await stable(page);
    const m = await mesurer(page);
    await page.close();
    expect(m.h1).toBe(60);
    expect(new Set(m.h2.map((x) => x.taille))).toEqual(new Set([32]));
    expect(m.bornes).toBe(0);
    expect(motsCoupes(m, '1440 px')).toEqual([]);
  }, 60_000);
});
