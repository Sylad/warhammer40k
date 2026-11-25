// @vitest-environment node
// L253 passe 2 — texte à 200 %, le contenu se remet en page au lieu de se couper (WCAG 1.4.4, revue UX r1 de L253).
// Avant : à 200 %, `overflow-wrap: anywhere` coupait chaque mot trop long pour sa colonne restée en px — la citation
// de l'accueil une lettre par ligne à 1440 px (77 px de large), les filtres des Vidéos à 768 px (« T/O/U/S » dans
// 50 px), les Informations clés de la fiche unité à 320-390 px, « ARCHIVE/S » à 1440 px, 349 mots coupés sans trait
// (cartes de la galerie, dates de la chronologie, badges des romans), noms des chaînes rognés (« Frenc… »).
// Attendu, application construite, texte de la page à 200 % (`html { font-size: 200% }`) puis police du NAVIGATEUR
// à 32 px (CDP Page.setFontSizes), de 320 à 1440 px — seulement ce qui n'était pas déjà là au réglage normal :
//   T1 — aucun mot coupé sans trait, sauf un mot plus large que 80 % du contenu de la page (aucune marge ne le
//        ferait tenir à 320 px) ;
//   T2 — aucun bloc de texte de moins de 3 fois sa taille de police en largeur (une à deux lettres par ligne) ;
//   T3 — aucun texte rogné en largeur (ellipse ou ancêtre overflow: hidden).
// Sonde : testing/reflux-texte-200.ts. Chromium via playwright-core (sauté s'il manque).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, BrowserContext, Page } from 'playwright-core';
import { distState, startDistServer } from '../../testing/dist-server';
import { refluxTexte, type RefluxRapport } from '../../testing/reflux-texte-200';
import { cinzelChargee, servirPolicesLocales } from '../../testing/polices-locales';

const { built, stale } = distState(['src/styles.scss', 'src/styles/_texte-agrandi.scss', 'src/app/core/utils/titres-ajustes.ts']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

// Les pages de la revue UX r1 (et celles du test des tailles, texte-200-contenu-l253).
const ROUTES = [
  '/', '/gallery', '/units/sm-tactique', '/videos', '/romans', '/lore/timeline', '/plan', '/lore/galaxy',
  '/factions', '/factions/space-marines', '/lore/primarchs/lion-eljonson', '/lore/concepts', '/nouveautes', '/about',
];
const LARGEURS = [1440, 1024, 768, 390, 320];
const SANS_ANIMATION = '*, *::before, *::after { transition: none !important; animation: none !important; }';

/** Trois images : la classe `texte-plus-grand` suit la sonde de 1rem, puis l'ajusteur des titres passe. */
const images = (page: Page) => page.evaluate(() => new Promise((r) => {
  let n = 0;
  const f = () => (++n >= 3 ? r(null) : requestAnimationFrame(f));
  requestAnimationFrame(f);
}));

function ecarts(mode: string, width: number, r: RefluxRapport): string[] {
  return [
    ...r.coupes.map((x) => `T1 ${mode} ${width} px : ${x}`),
    ...r.etroits.map((x) => `T2 ${mode} ${width} px : ${x}`),
    ...r.rognes.map((x) => `T3 ${mode} ${width} px : ${x}`),
  ];
}

describe.skipIf(!built || !chromium)('contenu — texte à 200 %, ni mot coupé sans trait, ni colonne étroite, ni texte rogné — L253', () => {
  let server: Server;
  let browser: Browser;
  let base = '';
  beforeAll(async () => {
    const s = await startDistServer();
    server = s.server;
    base = s.base;
    browser = await chromium!.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  });
  afterAll(async () => {
    await browser?.close();
    server?.close();
  });

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  async function ouvrir(route: string, defaut = 16): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext({ viewport: { width: LARGEURS[0], height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    if (defaut !== 16) await (await context.newCDPSession(page)).send('Page.setFontSizes', { fontSizes: { standard: defaut } });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    await page.locator('#contenu h1').first().waitFor({ timeout: 10_000 });
    await page.addStyleTag({ content: SANS_ANIMATION });
    return { context, page };
  }

  for (const route of ROUTES) {
    it(`${route} : texte de la page à 200 %, 320 à 1440 px`, async () => {
      const { context, page } = await ouvrir(route);
      const trouves: string[] = [];
      for (const width of LARGEURS) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
        await images(page);
        await page.evaluate(refluxTexte, { memoriser: true });
        await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
        await images(page);
        trouves.push(...ecarts('page 200 %', width, await page.evaluate(refluxTexte, {})));
      }
      await context.close();
      expect(trouves.slice(0, 25)).toEqual([]);
    }, 120_000);
  }

  for (const route of ROUTES) {
    it(`${route} : police par défaut du navigateur à 32 px, 320 à 1440 px`, async () => {
      const normal = await ouvrir(route);
      const grand = await ouvrir(route, 32);
      const trouves: string[] = [];
      for (const width of LARGEURS) {
        for (const o of [normal, grand]) {
          await o.page.setViewportSize({ width, height: 900 });
          await images(o.page);
        }
        // défauts déjà présents au réglage normal (même page, police à 16 px)
        const { cles } = await normal.page.evaluate(refluxTexte, { memoriser: true });
        trouves.push(...ecarts('navigateur 32 px', width, await grand.page.evaluate(refluxTexte, { connus: cles })));
      }
      await normal.context.close();
      await grand.context.close();
      expect(trouves.slice(0, 25)).toEqual([]);
    }, 120_000);
  }
});

// L262 — QA en prod du 25-11 (après L259) : police du navigateur à 32 px (texte à 200 %), vraie police Cinzel, les
// titres des pages de lore se coupaient au milieu d'un mot — /lore/civilians à 320 px : h1 « Civils / Impér / iaux »
// et 13 h2 (« Adept/us », « Admin/ist/rat/um »…), 7 h2 à 390 px ; /lore : 6 h2 à 320 px (« Pant/héon », « Chronol/ogie »),
// 3 à 390 px. Les h2 restaient au plancher de l'ajusteur (1,1 × le texte qui suit, 35,2 px) même quand leur mot n'y
// tenait pas. La garde du dessus bloque les polices web (police de secours, plus étroite) et tolère un mot coupé avec
// un trait : ici, Cinzel et Inter sont servies depuis le dépôt (testing/polices-locales.ts), et AUCUNE coupure au
// milieu d'un mot n'est admise dans un h1, h2 ou h3 (ni sans trait, ni à une syllabe ; seulement après un trait
// d'union ou une barre oblique), sur TOUTES les pages /lore*, listes et fiches :
//   L1 — 320 et 390 px, police du navigateur à 32 px ;
//   L2 — réglage normal (16 px) à 1440, 390 et 320 px : rien de coupé non plus, rien de borné par l'ajusteur.
const ROUTES_LORE = [
  '/lore', '/lore/emperor', '/lore/primarchs', '/lore/primarchs/lion-eljonson', '/lore/chaos-gods', '/lore/civilians',
  '/lore/concepts', '/lore/galaxy', '/lore/equipment', '/lore/equipment/boltgun-astartes', '/lore/timeline',
  '/lore/timeline/war-in-heaven', '/lore/ships', '/lore/ships/vengeful-spirit', '/lore/titans', '/lore/titans/warlord-titan',
  '/lore/saints', '/lore/saints/saint-celestine',
];

/** Dans la page : les mots des h1, h2 et h3 visibles de `#contenu` rendus sur plus d'une ligne (un mot = suite sans
 *  espace sécable ; une coupure juste après « - », « ‐ » ou « / » est permise), et les tailles des titres. */
function titresCoupes(): { coupes: string[]; tailles: string[]; bornes: number } {
  const coupes: string[] = [];
  const tailles: string[] = [];
  const range = document.createRange();
  const titres = Array.from(document.querySelectorAll<HTMLElement>('#contenu :is(h1, h2, h3)'))
    .filter((h) => h.getClientRects().length && getComputedStyle(h).visibility !== 'hidden' && !h.closest('[hidden], .sr-only, .visually-hidden, dialog:not([open])'));
  for (const h of titres) {
    tailles.push(`${h.tagName.toLowerCase()} ${parseFloat(getComputedStyle(h).fontSize)}`);
    const marche = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    for (let n = marche.nextNode(); n; n = marche.nextNode()) {
      const texte = n.textContent ?? '';
      for (const m of texte.matchAll(/[^ \t\n\r\f]+/g)) {
        // morceaux coupables après un trait d'union ou une barre oblique : chacun doit tenir sur une ligne
        for (const p of m[0].matchAll(/[^-‐/]*[-‐/]?/g)) {
          if (!p[0]) continue;
          range.setStart(n, m.index! + p.index!);
          range.setEnd(n, m.index! + p.index! + p[0].length);
          const lignes = new Set(Array.from(range.getClientRects()).filter((r) => r.width > 0.5).map((r) => Math.round(r.top / 3)));
          if (lignes.size > 1) {
            coupes.push(`${h.tagName.toLowerCase()} « ${m[0]} » sur ${lignes.size} lignes (${parseFloat(getComputedStyle(h).fontSize)} px)`);
            break;
          }
        }
      }
    }
  }
  return { coupes, tailles, bornes: document.querySelectorAll('#contenu [data-titre-borne]').length };
}

describe.skipIf(!built || !chromium)('pages de lore — vraie police Cinzel, aucun mot coupé dans les h1 à h3 (L262)', () => {
  let server: Server;
  let browser: Browser;
  let base = '';
  beforeAll(async () => {
    const s = await startDistServer();
    server = s.server;
    base = s.base;
    browser = await chromium!.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  });
  afterAll(async () => {
    await browser?.close();
    server?.close();
  });

  /** L'ajusteur des titres repasse après un changement de largeur ou le chargement des polices (une image d'animation). */
  const stable = (page: Page) => page.evaluate(() => new Promise((r) => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 300)));

  async function ouvrirLore(route: string, width: number, police: number): Promise<Page> {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    if (police !== 16) await (await context.newCDPSession(page)).send('Page.setFontSizes', { fontSizes: { standard: police } });
    await servirPolicesLocales(page);
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    await page.locator('#contenu h1').first().waitFor({ timeout: 10_000 });
    await page.addStyleTag({ content: SANS_ANIMATION });
    expect(await cinzelChargee(page), `${route} ${width} px : Cinzel chargée`).toBe(true);
    await stable(page);
    return page;
  }

  for (const route of ROUTES_LORE) {
    it(`${route} : L1 police 32 px à 320 et 390 px, L2 réglage normal à 1440, 390 et 320 px`, async () => {
      const trouves: string[] = [];
      // une page par police, redimensionnée d'une largeur à l'autre (l'ajusteur repasse à chaque largeur)
      for (const [police, largeurs] of [[32, [320, 390]], [16, [1440, 390, 320]]] as const) {
        const page = await ouvrirLore(route, largeurs[0], police);
        for (const width of largeurs) {
          if (width !== largeurs[0]) {
            await page.setViewportSize({ width, height: 900 });
            await stable(page);
          }
          const r = await page.evaluate(titresCoupes);
          if (process.env.L262_TRACE) console.log(route, width, police, r.tailles.join(', '));
          trouves.push(...r.coupes.map((c) => `${police === 32 ? 'L1' : 'L2'} ${width} px, police ${police} px : ${c}`));
          if (police === 16 && r.bornes) trouves.push(`L2 ${width} px : ${r.bornes} titre(s) borné(s) au réglage normal`);
        }
        await page.context().close();
      }
      expect(trouves, `${route} :\n${trouves.join('\n')}`).toEqual([]);
    }, 120_000);
  }
});
