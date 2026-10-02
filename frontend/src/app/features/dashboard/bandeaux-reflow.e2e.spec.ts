// @vitest-environment node
// L32 (WCAG 1.4.10) — bandeaux lisibles en entier au téléphone : avant, le texte du bandeau de
// l'accueil (« BIENVENUE, INITIÉ », chapeau, citation) était rogné par le bandeau jusqu'à 390 px,
// celui de la galerie (sur-titre, titre, description, bouton Importer) à 320–360 px, et sur Concepts
// le titre « L'ASTRONOMICAN » dépassait de sa fiche jusqu'à 390 px (59 px rognés), comme le titre et
// les compteurs du bandeau à 320 px. Au bureau, tailles de titres inchangées.
// Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';
import { reflowProbe } from '../../../testing/reflow-probe';

const { built, stale } = distState([
  'src/app/features/dashboard/dashboard.component.scss',
  'src/app/features/gallery/gallery.component.scss',
  'src/app/features/lore-concepts/lore-concepts.component.scss',
  'src/app/features/lore-concepts/lore-concepts.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

const PAGES: [string, string, [string, string][]][] = [
  // adresse, élément attendu, tailles de titres au bureau (1440 × 900) avant L32
  ['/', 'main h1', [['main h1', '79.2px']]],
  ['/gallery', 'main h1', [['main h1', '68px']]],
  ['/lore/concepts', 'main h2', [['main h1', '60px'], ['main .concept h2', '32px']]],
];

describe.skipIf(!built || !chromium)('bandeaux de l’accueil, de la galerie et de Concepts : redistribution (navigateur, dist) — L32', () => {
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

  for (const [url, ready, desktop] of PAGES) {
    it(`${url} : ni défilement horizontal, ni texte rogné, ni titre coupé dans un mot (320 → 1440)`, async () => {
      const page = await browser.newPage();
      const problems: string[] = [];
      for (const [w, h] of [[320, 700], [360, 740], [390, 844], [768, 1024], [1024, 768], [1366, 768], [1440, 900]]) {
        await page.setViewportSize({ width: w, height: h });
        await page.goto(base + url);
        await page.locator(ready).first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        const r = await page.evaluate(reflowProbe, 'main');
        if (r.scroll > 0) problems.push(`${w} px : défilement horizontal de ${r.scroll} px`);
        for (const p of [...r.overflow, ...r.clipped, ...r.broken]) problems.push(`${w} px : ${p}`);
      }
      await page.close();
      expect(problems).toEqual([]);
    });

    it(`${url} : tailles des titres au bureau inchangées (1440 × 900)`, async () => {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(base + url);
      await page.locator(ready).first().waitFor();
      for (const [sel, fs] of desktop) {
        expect(await page.locator(sel).first().evaluate((e) => getComputedStyle(e).fontSize), sel).toBe(fs);
      }
      await page.close();
    });
  }
});
