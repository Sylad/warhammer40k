// @vitest-environment node
// L238 — navigateur réel, dist : la mention des droits de Games Workshop est au pied de CHAQUE route
// (pages fixes et une fiche par route à paramètre) ; les images du wiki et les fiches techniques portent
// leur crédit (infobulle + liste « Crédits des images de cette page ») ; pas de débordement à 320/390 px.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer, FRONTEND } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/app/layout/main-layout/main-layout.component.ts',
  'src/app/layout/credits-page/credits-page.component.ts',
  'src/app/core/credits/credit-image.ts',
  'src/app/features/about/about.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

const SEED = resolve(FRONTEND, '../backend/seed');
const premier = (f: string) => (JSON.parse(readFileSync(resolve(SEED, f), 'utf8')) as { id: string }[])[0].id;
const PARAMS: Record<string, string> = {
  'factions/:id': `factions/${premier('factions.json')}`,
  'units/:id': 'units/admech-cawl',
  'factions/:factionId/units/:unitId': 'factions/adeptus-mechanicus/units/admech-cawl',
  'subfactions/:id': `subfactions/${premier('subfactions.json')}`,
  'lore/primarchs/:id': `lore/primarchs/${premier('primarchs.json')}`,
  'lore/ships/:id': `lore/ships/${premier('legendary-ships.json')}`,
  'lore/titans/:id': `lore/titans/${premier('god-machines.json')}`,
  'lore/saints/:id': `lore/saints/${premier('living-saints.json')}`,
  'lore/timeline/:id': `lore/timeline/${premier('timeline-events.json')}`,
  'lore/equipment/:id': `lore/equipment/${premier('equipment.json')}`,
};
// Lu dans le source (importer app.routes chargerait Angular sans compilateur dans cet environnement node).
const ROUTES_TS = readFileSync(resolve(FRONTEND, 'src/app/app.routes.ts'), 'utf8');
const PAGES = [...new Set(ROUTES_TS.split('\n')
  .filter((l) => !l.includes('redirectTo'))
  .flatMap((l) => [...l.matchAll(/path: '([^']*)'/g)].map((m) => m[1])))]
  .map((p) => '/' + (p.includes(':') ? PARAMS[p] : p));

const WIKI = 'https://static.wikia.nocookie.net/warhammer40k/images/c/c1/Adeptus_Astartes_Icon.jpg/revision/latest/scale-to-width-down/700';
const CAPTURES = resolve(FRONTEND, '../../warhammer40k-20261120110107-646844.captures');
const JPEG = readFileSync(resolve(FRONTEND, '../backend/public/datasheets/admech-cawl.jpg'));

/** Wiki et fiches techniques servis localement : aucune requête externe, mêmes adresses qu'en prod. */
async function brancher(page: Page): Promise<void> {
  await page.route('**/api/wiki-image**', (r) => r.fulfill({ json: { imageUrl: WIKI, pageTitle: 'Adeptus Astartes', pageUrl: 'https://warhammer40k.fandom.com/wiki/Adeptus_Astartes' } }));
  await page.route('https://static.wikia.nocookie.net/**', (r) => r.fulfill({ body: JPEG, contentType: 'image/jpeg' }));
  await page.route('**/api/images/datasheets/**', (r) => r.fulfill({ body: JPEG, contentType: 'image/jpeg' }));
  await page.route('**/api/images/unit-images', (r) => r.fulfill({ json: { datasheets: ['admech-cawl'], portraits: [] } }));
  await page.route(/^https:\/\/(?!static\.wikia)/, (r) => r.abort());
}

describe.skipIf(!built || !chromium)('crédits et droits (navigateur, dist) — L238', () => {
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

  it('chaque route a une adresse testée (route à paramètre sans fiche d’exemple : à ajouter à PARAMS)', () => {
    expect(PAGES.every((p) => !p.includes('undefined'))).toBe(true);
    expect(PAGES.length).toBeGreaterThan(25);
  });

  it('la mention des droits de Games Workshop est au pied de chaque route', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await brancher(page);
    const manquantes: string[] = [];
    for (const p of PAGES) {
      await page.goto(base + p);
      const mention = page.locator('footer.legal [data-testid="mention-droits"]');
      await mention.waitFor({ timeout: 10_000 });
      const texte = (await mention.innerText()).replace(/\s+/g, ' ');
      if (!texte.includes('sans approbation de Games Workshop') || !texte.includes('© Games Workshop Limited') || !(await mention.isVisible())) manquantes.push(p);
    }
    expect(manquantes).toEqual([]);
    await page.close();
  }, 120_000);

  it('fiche unité : la fiche technique et les images du wiki portent leur crédit ; la liste du pied les nomme', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await brancher(page);
    await page.goto(`${base}/units/admech-cawl`);
    const fiche = page.locator('img[src*="/api/images/datasheets/admech-cawl"]').first();
    await fiche.waitFor();
    await expect.poll(() => fiche.getAttribute('title')).toBe('Fiche technique © Games Workshop');
    await expect.poll(() => page.locator('[data-credit="fandom"]').count()).toBeGreaterThan(0);
    // Infobulle posée par le crédit (une infobulle propre à l'élément est gardée, data-credit-titre absent).
    const titres = await page.locator('[data-credit="fandom"][data-credit-titre]').evaluateAll((els) => els.map((e) => e.getAttribute('title')));
    expect(titres.length).toBeGreaterThan(0);
    for (const t of titres) expect(t).toMatch(/^Illustration © Games Workshop — via le Warhammer 40k Wiki \(Fandom\), fichier « .+ »$/);
    expect(titres).toContain('Illustration © Games Workshop — via le Warhammer 40k Wiki (Fandom), fichier « Adeptus Astartes Icon.jpg »'); // image du proxy
    expect(titres).toContain('Illustration © Games Workshop — via le Warhammer 40k Wiki (Fandom), fichier « MechanicusLogo.jpg »'); // icône de faction (seed)
    const credits = page.locator('[data-testid="credits-page"]');
    await expect.poll(() => credits.locator('li').evaluateAll((l) => l.map((x) => x.getAttribute('data-source')))).toEqual(['fandom', 'fiche']);
    await credits.locator('summary').click();
    expect(await credits.locator('li[data-source="fandom"] a').evaluateAll((a) => a.map((x) => x.getAttribute('href')))).toEqual(
      expect.arrayContaining(['https://warhammer40k.fandom.com/wiki/File:Adeptus_Astartes_Icon.jpg', 'https://warhammer40k.fandom.com/wiki/File:MechanicusLogo.jpg']));
    await page.close();
  });

  for (const [w, h] of [[1440, 900], [390, 844], [320, 640]] as const) {
    it(`${w} px : pied de page et « Crédits et droits » sans débordement, cibles ≥ 24 px, captures`, async () => {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await brancher(page);
      await page.goto(`${base}/factions`);
      const credits = page.locator('[data-testid="credits-page"]');
      await credits.waitFor();
      await credits.locator('summary').click();
      await credits.locator('li').first().waitFor();
      const footer = page.locator('footer.legal');
      await footer.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      for (const b of await footer.locator('a, summary').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
        expect(b).toBeGreaterThanOrEqual(24);
      }
      if (existsSync(CAPTURES) && w !== 320) await footer.screenshot({ path: `${CAPTURES}/l238-pied-factions-${w}.png` });

      await page.goto(`${base}/about#credits`);
      const section = page.locator('section#credits');
      await section.waitFor();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      if (existsSync(CAPTURES) && w !== 320) await section.screenshot({ path: `${CAPTURES}/l238-about-credits-${w}.png` });
      await page.close();
    });
  }
});
