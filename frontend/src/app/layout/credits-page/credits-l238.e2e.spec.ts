// @vitest-environment node
// L238 — navigateur réel, dist : la mention des droits de Games Workshop est au pied de CHAQUE route
// (pages fixes et une fiche par route à paramètre) ; les images du wiki et les fiches techniques portent
// leur crédit (infobulle + liste « Crédits des images de cette page ») ; pas de débordement à 320/390 px.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer, FRONTEND } from '../../../testing/dist-server';
// r3 — le vrai code du backend (module sans dépendance), pour simuler une panne au niveau de Fandom.
import { rechercherImageWiki, viderCacheWiki } from '../../../../../backend/src/modules/wiki-image/fandom-lookup';

const { built, stale } = distState([
  'src/app/layout/main-layout/main-layout.component.ts',
  'src/app/layout/credits-page/credits-page.component.ts',
  'src/app/core/credits/credit-image.ts',
  'src/app/features/about/about.component.ts',
  'src/app/features/gallery/gallery.component.ts',
  'src/styles/_gallery-visionneuse.scss',
  'src/app/shared/components/credit-legende/credit-legende.component.ts',
  'src/app/features/unit-detail/unit-datasheet-dialog.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

const SEED = resolve(FRONTEND, '../backend/seed');
/** r3 — requête du wiki d'une œuvre du catalogue, comme la galerie la forme (`fetchImage`). */
const ARTWORKS = JSON.parse(readFileSync(resolve(SEED, 'artworks.json'), 'utf8')) as { title: string; wikiQuery?: string }[];
const requeteOeuvre = (titre: string): string => {
  const a = ARTWORKS.find((x) => x.title === titre);
  if (!a) throw new Error(`œuvre absente du seed : ${titre}`);
  return a.wikiQuery ?? `${a.title} warhammer 40k`;
};
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
// Captures à la demande : CAPTURES_DIR=<dossier hors du dépôt> npm run test:e2e (aucune capture sinon).
const CAPTURES = process.env['CAPTURES_DIR'] ? resolve(process.env['CAPTURES_DIR']) : null;
if (CAPTURES) mkdirSync(CAPTURES, { recursive: true });
/** r3 — une capture de la visionneuse attend la fin de son fondu d'entrée (0,2 s), fond de la fenêtre compris. */
async function capturer(page: Page, nom: string): Promise<void> {
  if (!CAPTURES) return;
  await page.locator('dialog.modal').evaluate((d) =>
    Promise.all(d.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined))));
  await page.screenshot({ path: `${CAPTURES}/${nom}` });
}
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
      if (CAPTURES && w !== 320) await footer.screenshot({ path: `${CAPTURES}/l238-pied-factions-${w}.png` });

      await page.goto(`${base}/about#credits`);
      const section = page.locator('section#credits');
      await section.waitFor();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      if (CAPTURES && w !== 320) await section.screenshot({ path: `${CAPTURES}/l238-about-credits-${w}.png` });
      await page.close();
    });
  }

  // ── r1 ──────────────────────────────────────────────────────────────────────────────────────────
  it('r1 (WCAG 1.4.1) : « Crédits et droits », les liens de fichiers et « Tous les crédits » sont soulignés', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await brancher(page);
    await page.goto(`${base}/factions`);
    const credits = page.locator('[data-testid="credits-page"]');
    await credits.waitFor();
    await credits.locator('summary').click();
    await credits.locator('.credits-liens a').first().waitFor();
    const deco = (sel: string) => page.locator(sel).evaluateAll((els) => els.map((e) => getComputedStyle(e).textDecorationLine));
    for (const sel of ['[data-testid="mention-droits"] a', '.credits-liens a', '.credits-tout']) {
      const d = await deco(sel);
      expect(d.length, sel).toBeGreaterThan(0);
      for (const x of d) expect(x, sel).toContain('underline');
    }
    await page.close();
  });

  // r2 — la visionneuse ne dit « Aucune image trouvée » que si le wiki a répondu sans image.
  it('r2 390 px : visionneuse — recherche en cours, panne du wiki (502) puis « Réessayer », vraie absence : trois messages distincts', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await brancher(page);
    let mode: 'attente' | 'panne' | 'absente' | 'ok' = 'attente';
    let liberer = (): void => {};
    await page.route('**/api/wiki-image**', async (r) => {
      if (mode === 'attente') await new Promise<void>((ok) => { const avant = liberer; liberer = () => { avant(); ok(); }; });
      if (mode === 'panne') return r.fulfill({ status: 502, body: 'Bad Gateway' });
      if (mode === 'absente') return r.fulfill({ json: { imageUrl: null, pageTitle: null, pageUrl: null } });
      return r.fulfill({ json: { imageUrl: WIKI, pageTitle: 'Adeptus Astartes', pageUrl: null } });
    });
    const ouvrir = async () => {
      await page.goto(`${base}/gallery`);
      const carte = page.locator('.art-card').first();
      await carte.waitFor();
      await carte.locator('.art-open').click();
      const d = page.locator('dialog.modal');
      await d.waitFor();
      return d.locator('[data-testid="viewer-ecart"]');
    };

    // 1. Recherche en cours : jamais une absence affirmée.
    let ecart = await ouvrir();
    await expect(ecart.innerText()).resolves.toBe('Recherche de l’image sur le Warhammer 40k Wiki…');
    expect(await ecart.getAttribute('data-etat')).toBe('chargement');
    expect(await page.locator('dialog.modal [data-testid="credit-legende"]').count()).toBe(0);
    await capturer(page, 'l238r2-visionneuse-chargement-390.png');
    // … puis l'image arrive.
    mode = 'ok';
    liberer();
    await expect.poll(() => ecart.innerText()).toMatch(/^Image trouvée sur le Warhammer 40k Wiki/);

    // 2. Panne du wiki : l'échec est dit, avec de quoi réessayer.
    mode = 'panne';
    ecart = await ouvrir();
    await expect.poll(() => ecart.getAttribute('data-etat')).toBe('erreur');
    expect(await ecart.getAttribute('role')).toBe('alert');
    expect(await ecart.innerText()).toContain('La recherche de l’image sur le Warhammer 40k Wiki a échoué.');
    expect(await page.locator('dialog.modal').innerText()).not.toContain('Aucune image trouvée');
    const bouton = ecart.locator('[data-testid="viewer-reessayer"]');
    const b = (await bouton.boundingBox())!;
    expect(b.height).toBeGreaterThanOrEqual(24); // WCAG 2.5.8
    expect(b.x + b.width).toBeLessThanOrEqual(390);
    expect(await bouton.evaluate((e) => getComputedStyle(e).textDecorationLine)).toContain('underline');
    await capturer(page, 'l238r2-visionneuse-panne-390.png');
    mode = 'ok';
    await bouton.click();
    await expect.poll(() => ecart.innerText()).toMatch(/^Image trouvée sur le Warhammer 40k Wiki/);
    await expect.poll(() => page.locator('dialog.modal [data-testid="credit-legende"]').count()).toBe(1);

    // 3. Le wiki répond sans image : là seulement, « Aucune image trouvée ».
    mode = 'absente';
    ecart = await ouvrir();
    await expect.poll(() => ecart.getAttribute('data-etat')).toBe('absente');
    expect(await ecart.innerText()).toBe('Aucune image trouvée pour cette œuvre.');
    await capturer(page, 'l238r2-visionneuse-absente-390.png');
    await page.close();
  });

  // r3 — la panne est simulée au niveau de Fandom : /api/wiki-image est rendu par le vrai code du backend
  // (rechercherImageWiki), branché sur un faux Fandom local qui coupe la connexion ou répond 429 en HTML.
  it('r3 390 px : Fandom en panne (connexion coupée, puis 429 HTML) — « erreur » et « Réessayer », jamais « Aucune image trouvée » ; le focus reste sur « Réessayer »', async () => {
    let fandom: 'coupe' | '429' | 'sans-image' = 'coupe';
    let appelsFandom = 0;
    const faux = createServer((req, res) => {
      appelsFandom++;
      if (fandom === 'coupe') return void req.socket.destroy(); // ECONNRESET côté backend
      if (fandom === '429') {
        res.writeHead(429, { 'content-type': 'text/html' });
        return void res.end('<!DOCTYPE html><html><body>Too Many Requests</body></html>');
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(req.url!.includes('list=search') ? { query: { search: [] } } : { query: { pages: { '-1': { missing: '' } } } }));
    });
    await new Promise<void>((ok) => faux.listen(0, '127.0.0.1', ok));
    const baseFandom = `http://127.0.0.1:${(faux.address() as AddressInfo).port}/api.php`;
    viderCacheWiki();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      await brancher(page);
      const reponses: { q: string; json: unknown }[] = [];
      // L244 — la recherche de l'œuvre ouverte peut être retenue ici (`porte`) : le test voit l'état « chargement »
      // avant de laisser partir la réponse (voir `relancer`).
      let requete = '';
      let arrivees = 0;
      let porte: Promise<void> | null = null;
      await page.route('**/api/wiki-image**', async (r) => {
        const q = new URL(r.request().url()).searchParams.get('q')!;
        if (q === requete) {
          arrivees++;
          if (porte) await porte;
        }
        const json = await rechercherImageWiki(q, { base: baseFandom });
        reponses.push({ q, json });
        return r.fulfill({ json }); // notre API répond 200, comme le contrôleur
      });
      await page.goto(`${base}/gallery`);
      const carte = page.locator('.art-card').first();
      await carte.waitFor();
      await carte.locator('.art-open').click();
      const d = page.locator('dialog.modal');
      await d.waitFor();
      const ecart = d.locator('[data-testid="viewer-ecart"]');
      // L243 — la galerie cherche en même temps l'image de chaque œuvre et de chaque catégorie (file de 6) : compter
      // toutes les réponses ne dit rien de la recherche relancée ; on suit la requête de CETTE œuvre.
      // L244 — cause de l'instabilité : `provideZoneChangeDetection({ eventCoalescing: true })` repousse le rendu qui
      // suit l'appui sur Entrée à la trame suivante. Juste après `keyboard.press`, `data-etat` affiche donc encore
      // l'« erreur » d'AVANT l'appui : lire « erreur » ne prouvait pas que la relance avait abouti, et l'Entrée de
      // l'étape 3 pouvait tomber pendant la recherche de l'étape 2 (ignorée, comme le veut `reessayerImage`) ; celle-ci
      // finissait en 429 → « erreur » au lieu de « absente » (CI du 21-11, 9a9452b). `relancer` attend donc trois
      // faits observables, sans délai fixe : la requête de l'œuvre est partie (l'appui a été pris), l'écran dit
      // « chargement » pendant qu'elle est retenue, puis sa réponse est arrivée. Seulement ensuite l'état final est lu :
      // il ne peut plus être celui d'avant l'appui.
      requete = requeteOeuvre(await d.locator('#viewer-titre').innerText());
      const relancer = async (): Promise<void> => {
        let liberer!: () => void;
        porte = new Promise<void>((ok) => { liberer = ok; });
        const avant = arrivees;
        const reponse = page.waitForResponse((r) =>
          r.url().includes('/api/wiki-image') && new URL(r.url()).searchParams.get('q') === requete);
        await page.keyboard.press('Enter');
        await expect.poll(() => arrivees, { timeout: 10_000, message: 'la relance n’a pas envoyé la recherche de l’œuvre' }).toBe(avant + 1);
        await expect.poll(() => ecart.getAttribute('data-etat'), { timeout: 5_000 }).toBe('chargement');
        expect(await ecart.innerText()).toContain('Nouvelle recherche de l’image sur le Warhammer 40k Wiki…');
        expect(await d.locator('[data-testid="viewer-reessayer"]').getAttribute('aria-disabled')).toBe('true');
        porte = null;
        liberer();
        await reponse;
      };
      const derniere = () => reponses.filter((r) => r.q === requete).at(-1)?.json;

      // 1. Connexion coupée par Fandom : notre API a répondu 200, la visionneuse dit quand même l'échec.
      await expect.poll(() => ecart.getAttribute('data-etat')).toBe('erreur');
      expect(appelsFandom).toBeGreaterThan(0);
      expect(reponses.length).toBeGreaterThan(0);
      for (const r of reponses) expect(r.json).toEqual({ imageUrl: null, pageTitle: null, pageUrl: null, erreur: true });
      expect(derniere()).toEqual({ imageUrl: null, pageTitle: null, pageUrl: null, erreur: true });
      expect(await ecart.getAttribute('role')).toBe('alert');
      expect(await ecart.innerText()).toContain('La recherche de l’image sur le Warhammer 40k Wiki a échoué.');
      expect(await d.innerText()).not.toContain('Aucune image trouvée');
      await capturer(page, 'l238r3-visionneuse-fandom-en-panne-390.png');

      // 2. « Réessayer » au clavier, Fandom répond 429 en HTML : encore l'échec, le focus n'a pas quitté le bouton.
      fandom = '429';
      const bouton = d.locator('[data-testid="viewer-reessayer"]');
      await bouton.focus();
      await relancer();
      await expect.poll(() => ecart.getAttribute('data-etat'), { timeout: 5_000 }).toBe('erreur');
      expect(derniere()).toEqual({ imageUrl: null, pageTitle: null, pageUrl: null, erreur: true });
      expect(await d.innerText()).not.toContain('Aucune image trouvée');
      expect(await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).toBe('viewer-reessayer');
      expect(await bouton.getAttribute('aria-disabled')).toBeNull();

      // 3. Fandom répond, sans image : là seulement « Aucune image trouvée » ; le focus suit le message, pas le corps de la page.
      fandom = 'sans-image';
      await relancer();
      expect(derniere()).toEqual({ imageUrl: null, pageTitle: null, pageUrl: null });
      await expect.poll(() => ecart.getAttribute('data-etat'), { timeout: 5_000 }).toBe('absente');
      expect(await ecart.innerText()).toBe('Aucune image trouvée pour cette œuvre.');
      expect(await bouton.count()).toBe(0);
      expect(await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).toBe('viewer-ecart');
    } finally {
      await page.close();
      await new Promise((ok) => faux.close(ok));
    }
  });

  for (const [w, h] of [[1440, 900], [390, 844]] as const) {
    it(`r1 ${w} px : galerie — artiste « Catalogue : », source réelle de l’image, visionneuse avec l’écart et le crédit en légende 12 px`, async () => {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await brancher(page);
      await page.goto(`${base}/gallery`);
      const carte = page.locator('.art-card').first();
      await carte.waitFor();
      await expect.poll(() => carte.locator('.art-artist').innerText()).toMatch(/^Catalogue : .+/);
      await expect.poll(() => carte.locator('[data-testid="source-image"]').innerText()).toBe('Image : Warhammer 40k Wiki');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      if (CAPTURES) await page.locator('.art-grid').screenshot({ path: `${CAPTURES}/l238r1-galerie-cartes-${w}.png` });
      await carte.locator('.art-open').click();
      const d = page.locator('dialog.modal');
      await d.waitFor();
      await expect.poll(() => d.locator('.vi-meta').innerText()).toMatch(/Artiste au catalogue : /);
      await expect(d.locator('[data-testid="viewer-ecart"]').innerText()).resolves.toMatch(/^Image trouvée sur le Warhammer 40k Wiki d’après le titre de l’œuvre : rien n’indique qu’elle soit de .+\.$/);
      const legende = d.locator('[data-testid="credit-legende"]');
      await expect(legende.innerText()).resolves.toContain('Illustration © Games Workshop — via le Warhammer 40k Wiki (Fandom), fichier « Adeptus Astartes Icon.jpg »');
      expect(await legende.evaluate((e) => getComputedStyle(e).fontSize)).toBe('12px');
      expect(await legende.locator('a').getAttribute('href')).toBe('https://warhammer40k.fandom.com/wiki/File:Adeptus_Astartes_Icon.jpg');
      expect(await legende.locator('a').evaluate((e) => getComputedStyle(e).textDecorationLine)).toContain('underline');
      const b = (await legende.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(w);
      if (CAPTURES) {
        await page.waitForTimeout(400); // fondu d'ouverture (0,2 s)
        await page.screenshot({ path: `${CAPTURES}/l238r1-galerie-visionneuse-${w}.png` });
      }
      await page.close();
    });

    it(`r1 ${w} px : agrandissement de la fiche unité — crédit visible en légende 12 px, sous l’image, dans l’écran`, async () => {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await brancher(page);
      await page.goto(`${base}/units/admech-cawl`);
      const bouton = page.locator('.zoom-btn').first();
      await bouton.waitFor();
      await bouton.click();
      const d = page.locator('dialog.ds-dialog');
      await d.waitFor();
      const legende = d.locator('[data-testid="credit-legende"]');
      await expect(legende.innerText()).resolves.toBe('Fiche technique © Games Workshop');
      expect(await legende.evaluate((e) => getComputedStyle(e).fontSize)).toBe('12px');
      expect(await legende.isVisible()).toBe(true);
      const l = (await legende.boundingBox())!;
      const sc = (await d.locator('.ds-scroll').boundingBox())!;
      expect(l.y).toBeGreaterThanOrEqual(sc.y + sc.height - 1); // sous la zone de l'image, jamais recouverte
      expect(l.y + l.height).toBeLessThanOrEqual(h);
      if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/l238r1-agrandissement-fiche-${w}.png` });
      await page.close();
    });
  }
});
