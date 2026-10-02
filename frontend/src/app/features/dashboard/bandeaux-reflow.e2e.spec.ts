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
  'src/styles.scss',
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

  // Revue UX R1 (L32) : à 320 px le champ de recherche de la galerie faisait 96 px (indication
  // rognée à « Rech »), 136 px à 360, 166 px à 390 — « Importer » lui prenait la ligne.
  it('/gallery : au téléphone, champ de recherche sur toute la largeur et « Importer » dessous ; au bureau, inchangé', async () => {
    const page = await browser.newPage();
    const problems: string[] = [];
    for (const [w, h] of [[320, 700], [360, 740], [390, 844], [1440, 900]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(base + '/gallery');
      await page.locator('.search-bar input').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const m = await page.evaluate(() => {
        const r = (s: string) => document.querySelector(s)!.getBoundingClientRect();
        return { input: r('.search-bar input'), wrap: r('.search-bar-wrap'), btn: r('.import-btn-hero') };
      });
      if (w < 1000) {
        if (m.input.width < m.wrap.width - 1) problems.push(`${w} px : champ de ${Math.round(m.input.width)} px sur ${Math.round(m.wrap.width)}`);
        if (m.btn.top < m.input.bottom) problems.push(`${w} px : « Importer » pas sous le champ`);
      } else {
        if (Math.round(m.input.width) !== 520) problems.push(`${w} px : champ de ${m.input.width} px (520 avant)`);
        if (m.btn.top >= m.input.bottom) problems.push(`${w} px : « Importer » n’est plus à côté du champ`);
      }
    }
    await page.close();
    expect(problems).toEqual([]);
  });

  // Revue UX R2 (L32) : le badge du bandeau (« Encyclopédie du 41e millénaire ») passait sur deux
  // lignes dans une boîte de 24 px de haut : « MILLÉNAIRE » débordait du cadre. Même style de badge
  // dans les bandeaux des autres pages Lore (mêmes débordements au téléphone, mesurés) et dans les
  // pastilles des listes : aucun texte hors du cadre, et 24 px de haut au bureau, comme avant.
  const BADGES = ['/lore/concepts', '/lore/chaos-gods', '/lore/civilians', '/lore/galaxy', '/lore/timeline', '/lore/emperor',
    '/lore/primarchs', '/lore/equipment', '/factions', '/romans', '/lore/ships', '/lore/primarchs/horus'];
  it('badges des bandeaux et des listes : texte dans son cadre de 320 à 1440 px, 24 px de haut à 1440 px', async () => {
    const page = await browser.newPage();
    const problems: string[] = [];
    for (const [w, h] of [[320, 700], [360, 740], [390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
      await page.setViewportSize({ width: w, height: h });
      for (const url of BADGES) {
        await page.goto(base + url);
        await page.locator('main .badge').first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        const found = await page.evaluate(() => [...document.querySelectorAll('main .badge')].slice(0, 6).map((e) => {
          const box = e.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(e);
          const bottom = Math.max(...[...range.getClientRects()].filter((r) => r.width > 0).map((r) => r.bottom));
          return { text: e.textContent!.trim().slice(0, 30), height: box.height, spill: bottom - box.bottom };
        }));
        for (const b of found) {
          if (b.spill > 0.5) problems.push(`${w} px ${url} « ${b.text} » : texte ${b.spill.toFixed(1)} px sous le cadre`);
          if (w === 1440 && Math.abs(b.height - 24) > 0.1) problems.push(`${w} px ${url} « ${b.text} » : ${b.height} px de haut (24 avant)`);
        }
      }
    }
    await page.close();
    expect(problems).toEqual([]);
  }, 120_000);
});
