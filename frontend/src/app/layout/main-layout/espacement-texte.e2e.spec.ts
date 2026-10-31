// @vitest-environment node
// L61 — WCAG 1.4.12 (espacement du texte) sur la barre du haut, application CONSTRUITE (dist) :
// interligne 1,5, lettres 0,12em, mots 0,16em, paragraphes 2em, injectés avec !important comme le
// ferait une extension. À 320 px (et jusqu'à 400 px, polices web chargées ou bloquées, police par
// défaut 16 et 20 px), le bouton « Menu » ne coupe plus son contenu et la page ne défile pas horizontalement
// (barre de défilement visible, avec ou sans la pastille « 9+ » des nouveautés). Chromium via playwright-core (sauté s'il manque).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/styles.scss',
  'src/app/layout/main-layout/main-layout.component.ts',
  'src/app/features/about/about.component.scss',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

const ESPACEMENT = '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }';

describe.skipIf(!built || !chromium)('barre du haut — espacement de texte WCAG 1.4.12 (navigateur, dist) — L61', () => {
  let server: Server;
  let browser: Browser;
  let base: string;
  beforeAll(async () => {
    ({ base, server } = await startDistServer());
    // Barre de défilement VISIBLE (6 px, comptée par les media queries) : --hide-scrollbars masquait
    // le débordement de 1 à 3 px à 320 px (cf. search-hint.e2e.spec.ts, L46).
    browser = await chromium!.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  });
  afterAll(async () => {
    await browser?.close();
    server?.close();
  });

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  const CONFIGS = [
    { name: 'police par défaut 16 px', fontSize: 16, webFonts: true, badge: false },
    { name: 'police par défaut 16 px, polices web bloquées', fontSize: 16, webFonts: false, badge: false },
    { name: 'police par défaut 20 px', fontSize: 20, webFonts: true, badge: false },
    { name: 'police par défaut 20 px, pastille « 9+ »', fontSize: 20, webFonts: true, badge: true },
    { name: 'police par défaut 20 px, pastille « 9+ », polices web bloquées', fontSize: 20, webFonts: false, badge: true },
    { name: 'police par défaut 16 px, pastille « 9+ »', fontSize: 16, webFonts: true, badge: true },
  ];
  for (const cfg of CONFIGS) {
    it(`R1 — ${cfg.name} : de 320 à 400 px, ni défilement horizontal ni contenu du bouton Menu coupé`, async () => {
      const context = await browser.newContext({ viewport: { width: 320, height: 700 } });
      const page = await context.newPage();
      if (cfg.fontSize !== 16) {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Page.setFontSizes', { fontSizes: { standard: cfg.fontSize } });
      }
      if (cfg.badge) await page.addInitScript(() => localStorage.setItem('wh40k.news.seen-v1', JSON.stringify({ date: '2026-09-01', slugs: [] })));
      if (!cfg.webFonts) await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
      await page.goto(`${base}/about`);
      await page.locator('.menu-toggle').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: ESPACEMENT });
      const bad: string[] = [];
      for (let width = 320; width <= 400; width++) {
        await page.setViewportSize({ width, height: 700 });
        const m = await page.evaluate(() => {
          const b = document.querySelector<HTMLElement>('.menu-toggle')!;
          const r = b.getBoundingClientRect();
          const enfants = [...b.children].map((c) => c.getBoundingClientRect()).filter((c) => c.width > 0);
          const sortie = enfants.some((c) => c.left < r.left - 0.5 || c.right > r.right + 0.5);
          return {
            page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            bouton: b.scrollWidth - b.clientWidth,
            sortie,
            barre: document.querySelector<HTMLElement>('.topbar')!.scrollWidth - document.querySelector<HTMLElement>('.topbar')!.clientWidth,
          };
        });
        if (m.page > 0 || m.bouton > 0 || m.sortie || m.barre > 0) bad.push(`${width} px ${JSON.stringify(m)}`);
      }
      await context.close();
      expect(bad).toEqual([]);
    }, 120_000);
  }
});
