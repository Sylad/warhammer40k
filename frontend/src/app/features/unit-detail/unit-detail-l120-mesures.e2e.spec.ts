// @vitest-environment node
// L120 — deux mesures de la revue que jsdom ne peut pas faire (docs/specs/unit-detail-datasheet/fiche.yaml) :
// R8 (WCAG 2.4.3) le focus revient au bouton d'origine après la fermeture de la fenêtre, par Échap, par le
// bouton Fermer et par un clic sur le fond ; R5 sans figure, ni vide de 297 px sous le hero à 390 px, ni
// texte du hero plafonné à 44 % (56 %, 80 % sous 1281 px, 100 % sous 761 px comme avant le lot). Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, BrowserContext, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/styles.scss',
  'src/app/features/unit-detail/unit-detail.component.ts',
  'src/app/features/unit-detail/unit-detail.component.scss',
  'src/app/features/unit-detail/unit-datasheet-dialog.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}
vi.setConfig({ testTimeout: 30000, hookTimeout: 60000 });
const UNIT = 'sm-tactique';
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#888"/></svg>';

describe.skipIf(!built || !chromium)('fiche unité — focus rendu et hero sans figure (navigateur, dist) — L120', () => {
  let server: Server;
  let browser: Browser;
  let base: string;
  let ctx: BrowserContext;
  let page: Page;

  /** `figure: true` : la fiche technique répond 200 ; sinon HEAD en 404 et wiki vide (le serveur de test répond déjà `imageUrl: null`). */
  async function open(width: number, figure: boolean): Promise<void> {
    ctx = await browser.newContext({ viewport: { width, height: 900 } });
    ctx.setDefaultTimeout(5000);
    await ctx.route('**/api/images/datasheets/**', (route) =>
      figure
        ? route.fulfill({ status: 200, contentType: 'image/svg+xml', body: SVG })
        : route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
    page = await ctx.newPage();
    await page.goto(`${base}/units/${UNIT}`);
    await page.locator('.hero h1').first().waitFor();
    if (figure) await page.locator('.hero figure img').waitFor({ state: 'visible' });
    else await page.waitForTimeout(600); // laisse le HEAD (404) et le wiki (vide) se résoudre
  }

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

  const closers: [string, () => Promise<void>][] = [
    ['Échap', () => page.keyboard.press('Escape')],
    ['le bouton Fermer', () => page.locator('.ds-close').click()],
    ['un clic sur le fond', () => page.mouse.click(4, 450)],
  ];
  for (const [name, close] of closers) {
    it(`R8 — Entrée ouvre, ${name} ferme : document.activeElement est le bouton d'origine`, async () => {
      await open(1440, true);
      try {
        const btn = page.locator('.hero button.zoom-btn');
        await btn.focus();
        await page.keyboard.press('Enter');
        await page.locator('dialog.ds-dialog[open]').waitFor();
        expect(await page.evaluate(() => document.activeElement?.className)).toBe('ds-close');
        await close();
        await page.locator('dialog.ds-dialog').waitFor({ state: 'detached' });
        const active = await page.evaluate(() => {
          const a = document.activeElement as HTMLElement | null;
          return { tag: a?.tagName, cls: a?.className, inHero: !!a?.closest('.hero') };
        });
        expect(active).toEqual({ tag: 'BUTTON', cls: 'zoom-btn', inHero: true });
      } finally { await ctx.close(); }
    });
  }

  it('R5 — sans figure à 390 px, l\'écart entre le bas du hero et nav.tabs est de ≈ 26 px (pas 297 px)', async () => {
    await open(390, false);
    try {
      expect(await page.locator('.hero figure').count()).toBe(0);
      const hero = (await page.locator('.hero').boundingBox())!;
      const tabs = (await page.locator('nav.tabs').boundingBox())!;
      const gap = tabs.y - (hero.y + hero.height);
      console.log(`[L120] écart hero → nav.tabs à 390 px sans figure : ${gap.toFixed(1)} px`);
      expect(gap).toBeGreaterThan(10);
      expect(gap).toBeLessThan(40);
    } finally { await ctx.close(); }
  });

  // R5 : sans figure, le texte retrouve son comportement d'avant le lot : largeur de son contenu plafonnée à 56 %
  // (80 % sous 1281 px, pleine largeur sous 761 px) ; avec figure le plafond est de 44 %.
  const PLAFONDS: [number, number][] = [[1440, 0.56], [1200, 0.8], [390, 1]];
  for (const [width, cap] of PLAFONDS) {
    it(`R5 — sans figure à ${width} px, le plafond de largeur du texte du hero est de ${Math.round(cap * 100)} % de la largeur utile`, async () => {
      await open(width, false);
      try {
        const m = await page.evaluate(() => {
          const hero = document.querySelector('.hero') as HTMLElement;
          const cs = getComputedStyle(hero);
          const inner = hero.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
          const text = document.querySelector('.hero .hero-text') as HTMLElement;
          return { inner, max: getComputedStyle(text).maxWidth, width: text.getBoundingClientRect().width };
        });
        console.log(`[L120] texte du hero sans figure à ${width} px : plafond ${m.max}, largeur ${(100 * m.width / m.inner).toFixed(1)} %`);
        expect(m.max).toBe(`${Math.round(cap * 100)}%`);
        expect(m.width).toBeLessThanOrEqual(cap * m.inner + 1);
      } finally { await ctx.close(); }
    });
  }
});
