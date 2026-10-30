// @vitest-environment node
// L57 — /videos et /romans sans défilement horizontal, à 1440 et 390 px (relevé QA du 05-10 :
// panneau latéral à x=1511 pour 1440, tiroir du menu à x=704 pour 390). Navigateur réel, application
// construite (dist, `ng build` requis). Mesuré le 30-10 : à 1440 et 390 px aucun des deux ne défile (le
// tiroir fermé, fixed, hors écran et inert, ne compte pas dans scrollWidth) ; à 320 px /videos défilait de
// 27 px (titre « INCONTOURNABLES » de 317 px dans 260) — corrigé.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/app/features/videos/videos.component.scss',
  'src/app/features/videos/videos.component.ts',
  'src/app/features/series/series.component.scss',
  'src/app/features/series/series.component.ts',
  'src/app/layout/main-layout/main-layout.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

const PAGES = [
  { route: '/videos', h1: 'main h1' },
  { route: '/romans', h1: 'main h1' },
];

describe.skipIf(!built || !chromium)('L57 — /videos et /romans : pas de défilement horizontal (navigateur, dist)', () => {
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

  async function ouvrir(route: string, width: number): Promise<Page> {
    const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 900 } });
    await page.goto(base + route, { waitUntil: 'networkidle' });
    await page.locator('main h1').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    return page;
  }

  /** Largeur de défilement en trop + éléments hors flux fixe qui dépassent à droite de la fenêtre. */
  const mesure = () => ({
    scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    debordent: [...document.querySelectorAll('body *')]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        if (r.width === 0 || r.right <= innerWidth + 1) return false;
        for (let a: Element | null = e; a; a = a.parentElement) if (getComputedStyle(a).position === 'fixed') return false;
        return true;
      })
      .slice(0, 5)
      .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} → ${Math.round(e.getBoundingClientRect().right)}`),
  });

  for (const { route } of PAGES) {
    for (const w of [1440, 390, 320]) {
      it(`R1 — ${route} à ${w} px : le document ne défile pas et rien (hors fixe) ne dépasse à droite`, async () => {
        const page = await ouvrir(route, w);
        const m = await page.evaluate(mesure);
        await page.close();
        expect(m).toEqual({ scroll: 0, debordent: [] });
      }, 60_000);
    }
  }

  for (const { route } of PAGES) {
    it(`R2 — ${route} à 390 px : tiroir fermé inerte et hors de l'écran, sans effet sur le défilement`, async () => {
      const page = await ouvrir(route, 390);
      const m = await page.evaluate(() => {
        const d = document.querySelector('#menu-telephone') as HTMLElement;
        return { inert: d.hasAttribute('inert'), position: getComputedStyle(d).position, visibility: getComputedStyle(d).visibility, left: d.getBoundingClientRect().left };
      });
      await page.close();
      expect(m.inert).toBe(true);
      expect(m.position).toBe('fixed');
      expect(m.visibility).toBe('hidden');
      expect(m.left).toBeGreaterThanOrEqual(0 - 1); // ancré à gauche de la fenêtre, jamais à droite (x=704 relevé)
    }, 60_000);

    it(`R3 — ${route} à 390 px : tiroir ouvert contenu dans la fenêtre, puis refermé sans défilement`, async () => {
      const page = await ouvrir(route, 390);
      await page.locator('.menu-toggle').click();
      await page.locator('#menu-telephone.open').waitFor();
      await page.waitForTimeout(400); // fin de la transition de 0,2 s
      const ouvert = await page.evaluate(() => {
        const r = document.querySelector('#menu-telephone')!.getBoundingClientRect();
        return { left: r.left, right: r.right, vw: innerWidth, scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#menu-telephone.open'));
      const ferme = await page.evaluate(mesure);
      await page.close();
      expect(ouvert.left).toBeGreaterThanOrEqual(-1);
      expect(ouvert.right).toBeLessThanOrEqual(ouvert.vw + 1);
      expect(ouvert.scroll).toBe(0);
      expect(ferme.scroll).toBe(0);
    }, 60_000);
  }

  it('R4 — /videos à 1440 px : le panneau latéral tient dans la colonne de droite de la fenêtre', async () => {
    const page = await ouvrir('/videos', 1440);
    const m = await page.evaluate(() => {
      const r = document.querySelector('section.side-panel')!.getBoundingClientRect();
      return { left: r.left, right: r.right, vw: innerWidth };
    });
    await page.close();
    expect(m.left).toBeGreaterThan(0);
    expect(m.right).toBeLessThanOrEqual(m.vw);
  }, 60_000);
});
