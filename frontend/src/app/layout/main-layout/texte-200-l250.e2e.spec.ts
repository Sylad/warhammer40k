// @vitest-environment node
// L250 — texte de la page à 200 % (`html { font-size: 200% }`, WCAG 1.4.4 et 1.4.10), application
// CONSTRUITE (dist), barre de défilement visible. Avant : les seuils de la barre (media queries en em)
// ne suivaient pas la police de la page, la barre complète restait affichée et la page défilait
// horizontalement (1440 px : scrollWidth 2076 ; 390 px : 548). Attendu, sur /, /gallery et une fiche
// unité, à 320, 390, 1024 et 1440 px, texte à 100 % et à 200 % :
//   R1 — scrollWidth = clientWidth (ni la page ni la barre ne défilent horizontalement) ;
//   R2 — à 200 %, chaque lien et bouton de l'en-tête reste atteignable au clavier : loupe et « Menu »
//        dans la fenêtre, Entrée ouvre le tiroir (focus sur « Fermer »), Tab y parcourt les 10 liens,
//        chacun entier dans la fenêtre et sans texte coupé, Échap rend le focus à « Menu » ;
//   R3 — à 100 %, les classes de seuil en rem ne changent rien : chaque boîte de la barre est la même
//        avec et sans elles (320 à 1800 px, police par défaut 16 et 20 px).
// Chromium via playwright-core (sauté s'il manque).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, BrowserContext, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/styles.scss',
  'src/app/layout/main-layout/main-layout.component.ts',
  'src/app/layout/main-layout/seuils-barre.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

const ROUTES = ['/', '/gallery', '/units/sm-tactique'];
const LARGEURS = [320, 390, 1024, 1440];
const CLASSES_L250 = ['barre-compacte', 'barre-tiroir', 'barre-etroite', 'barre-sans-mot', 'barre-sans-aigle', 'texte-agrandi'];

async function ouvrir(browser: Browser, route: string, width: number, fontSize = 16): Promise<{ context: BrowserContext; page: Page }> {
  // Mouvement réduit : le tiroir s'ouvre sans glissé (sinon ses liens sont mesurés en route).
  const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  if (fontSize !== 16) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Page.setFontSizes', { fontSizes: { standard: fontSize } });
  }
  // Pastille « 9+ » (bouton Menu le plus large) : aucune nouveauté vue.
  await page.addInitScript(() => localStorage.setItem('wh40k.news.seen-v1', JSON.stringify({ date: '2026-01-01', slugs: [] })));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(`${(globalThis as { __base?: string }).__base}${route}`);
  await page.locator('.topbar').waitFor();
  await page.locator('main h1').first().waitFor({ timeout: 10_000 }).catch(() => undefined);
  return { context, page };
}

/** Texte de la page à `taille` (comme la QA de L248 : après chargement), puis deux images pour la mise à jour. */
async function texte(page: Page, taille: string): Promise<void> {
  await page.evaluate((t) => { document.documentElement.style.fontSize = t; }, taille);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

async function debordement(page: Page) {
  return page.evaluate(() => {
    const d = document.documentElement;
    const bar = document.querySelector<HTMLElement>('.topbar')!;
    return { page: d.scrollWidth - d.clientWidth, barre: bar.scrollWidth - bar.clientWidth };
  });
}

describe.skipIf(!built || !chromium)('en-tête — texte de la page à 200 % (navigateur, dist) — L250', () => {
  let server: Server;
  let browser: Browser;
  beforeAll(async () => {
    const s = await startDistServer();
    server = s.server;
    (globalThis as { __base?: string }).__base = s.base;
    browser = await chromium!.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  });
  afterAll(async () => {
    await browser?.close();
    server?.close();
  });

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  for (const route of ROUTES) {
    it(`R1 — ${route} : ni la page ni la barre ne défilent horizontalement, 100 % et 200 %`, async () => {
      const bad: string[] = [];
      for (const width of LARGEURS) {
        const { context, page } = await ouvrir(browser, route, width);
        for (const taille of ['100%', '200%']) {
          await texte(page, taille);
          const m = await debordement(page);
          if (m.page > 0 || m.barre > 0) bad.push(`${width} px ${taille} ${JSON.stringify(m)}`);
        }
        await context.close();
      }
      expect(bad).toEqual([]);
    }, 120_000);
  }

  for (const width of LARGEURS) {
    it(`R2 — ${width} px, 200 % : loupe et Menu dans la fenêtre, tiroir parcouru au clavier`, async () => {
      const { context, page } = await ouvrir(browser, '/gallery', width);
      await texte(page, '200%');
      const actions = await page.evaluate(() => {
        const cw = document.documentElement.clientWidth;
        return ['.nav-search-btn', '.menu-toggle', '.brand'].map((s) => {
          const e = document.querySelector<HTMLElement>(s)!;
          const r = e.getBoundingClientRect();
          return { s, visible: getComputedStyle(e).display !== 'none' && r.width > 0, dedans: r.left >= 0 && r.right <= cw + 0.5 };
        });
      });
      expect(actions).toEqual([
        { s: '.nav-search-btn', visible: true, dedans: true },
        { s: '.menu-toggle', visible: true, dedans: true },
        { s: '.brand', visible: true, dedans: true },
      ]);
      // La barre complète est repliée : ses liens ne sont plus dans l'ordre de tabulation.
      expect(await page.locator('nav.nav').isVisible()).toBe(false);

      await page.locator('.menu-toggle').focus();
      await page.keyboard.press('Enter');
      await expect.poll(() => page.evaluate(() => document.activeElement?.classList.contains('drawer-close'))).toBe(true);
      const vus: string[] = [];
      const coupes: string[] = [];
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const m = await page.evaluate(() => {
          const a = document.activeElement as HTMLElement;
          const r = a.getBoundingClientRect();
          const cw = document.documentElement.clientWidth;
          const vh = window.innerHeight;
          return {
            texte: (a.textContent ?? '').replace(/\s+/g, ' ').trim(),
            dansTiroir: !!a.closest('#menu-telephone'),
            dedans: r.left >= 0 && r.right <= cw + 0.5 && r.top >= 0 && r.bottom <= vh + 0.5,
            coupe: a.scrollWidth > a.clientWidth + 0.5,
          };
        });
        if (!m.dansTiroir) break;
        vus.push(m.texte.replace(/ ?\d\+?.*$/, ''));
        if (!m.dedans || m.coupe) coupes.push(`${m.texte} ${JSON.stringify(m)}`);
        await page.evaluate(() => (document.activeElement as HTMLElement).scrollIntoView({ block: 'nearest' }));
      }
      expect(vus).toEqual(['Accueil', 'Factions', 'Romans', 'Vidéos', 'Jeux vidéo', 'Galerie', 'Lore', 'Nouveautés', 'Plan de travail', 'À propos']);
      expect(coupes).toEqual([]);
      const tiroir = await page.evaluate(() => {
        const d = document.querySelector<HTMLElement>('#menu-telephone')!;
        return { horizontal: d.scrollWidth - d.clientWidth, page: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      expect(tiroir).toEqual({ horizontal: 0, page: 0 });
      await page.keyboard.press('Escape');
      expect(await page.evaluate(() => document.activeElement?.classList.contains('menu-toggle'))).toBe(true);
      await context.close();
    }, 60_000);
  }

  it('R2 — texte posé à 200 % avant le chargement (feuille de l’utilisateur) : même barre repliée', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 800 } });
    const page = await context.newPage();
    await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.id = 'feuille-utilisateur';
      s.textContent = 'html { font-size: 200% !important; }';
      document.head.append(s);
    }));
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await page.goto(`${(globalThis as { __base?: string }).__base}/`);
    await page.locator('.topbar').waitFor();
    expect(await page.locator('.menu-toggle').isVisible()).toBe(true);
    expect(await debordement(page)).toEqual({ page: 0, barre: 0 });
    // Retour à 100 % : la barre compacte revient (la sonde de 1rem suit la police de la page).
    await page.evaluate(() => document.getElementById('feuille-utilisateur')!.remove());
    await expect.poll(() => page.locator('nav.nav').isVisible()).toBe(true);
    expect(await page.locator('.menu-toggle').isVisible()).toBe(false);
    await context.close();
  }, 60_000);

  for (const fontSize of [16, 20]) {
    it(`R3 — texte à 100 %, police par défaut ${fontSize} px : la barre est la même avec et sans les classes en rem`, async () => {
      const ecarts: string[] = [];
      const { context, page } = await ouvrir(browser, '/', 320, fontSize);
      for (const width of [320, 340, 390, 480, 500, 1024, 1343, 1344, 1345, 1440, 1699, 1700, 1701, 1800, 2100]) {
        await page.setViewportSize({ width, height: 800 });
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const res = await page.evaluate((classes) => {
          const host = document.querySelector<HTMLElement>('app-main-layout')!;
          const boites = () => [...document.querySelectorAll<HTMLElement>('.topbar, .topbar *')]
            .map((e) => { const r = e.getBoundingClientRect(); return `${Math.round(r.left * 10)},${Math.round(r.top * 10)},${Math.round(r.width * 10)},${Math.round(r.height * 10)}`; });
          const avec = boites();
          const posees = classes.filter((c) => host.classList.contains(c));
          host.classList.remove(...posees);
          const sans = boites();
          host.classList.add(...posees);
          const diff = avec.map((b, i) => (b === sans[i] ? null : `${i}: ${b} ≠ ${sans[i]}`)).filter(Boolean);
          return { posees, diff };
        }, CLASSES_L250);
        if (res.posees.includes('texte-agrandi')) ecarts.push(`${width} px : texte-agrandi posé à 100 %`);
        if (res.diff.length) ecarts.push(`${width} px [${res.posees.join(' ')}] ${res.diff.slice(0, 3).join(' ; ')}`);
      }
      await context.close();
      expect(ecarts).toEqual([]);
    }, 120_000);
  }
});
