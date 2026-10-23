// @vitest-environment node
// L180 (revue UX L12, WCAG 1.4.10) — Civils Impériaux au téléphone : avant, la marge fixe de 50 px du
// hero et de 38 px des en-têtes, le h2 de 32 px, le flex sans `min-width: 0` et `overflow: hidden`
// rognaient le chapeau et les compteurs (80 px à 320), et les h2 (Administratum 52 px à 390,
// Remembrancers 138 px à 320). Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';
import { reflowProbe } from '../../../testing/reflow-probe';

const { built, stale } = distState([
  'src/app/features/lore-civilians/lore-civilians.component.scss',
  'src/app/features/lore-civilians/lore-civilians.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

describe.skipIf(!built || !chromium)('Civils Impériaux, en-têtes au téléphone (navigateur, dist) — L180', () => {
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

  async function open(w: number, h: number): Promise<Page> {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(base + '/lore/civilians');
    await page.locator('.hero h1').waitFor();
    await page.locator('.org-head h2').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    return page;
  }

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  it('R1 — le hero et chaque en-tête d’organisation tiennent dans leur cadre de 320 à 1440 px : ni rogné, ni débordant, titres sans coupure dans un mot', async () => {
    const problems: string[] = [];
    for (const [w, h] of [[320, 700], [360, 740], [390, 844], [768, 1024], [1440, 900]]) {
      const page = await open(w, h);
      for (const root of ['.hero', '.org-head']) {
        const r = await page.evaluate(reflowProbe, root);
        if (r.scroll > 0) problems.push(`${w} px ${root} : défilement horizontal de ${r.scroll} px`);
        for (const p of [...r.overflow, ...r.clipped, ...r.broken]) problems.push(`${w} px ${root} : ${p}`);
      }
      await page.close();
    }
    expect(problems).toEqual([]);
  }, 60_000);

  it('R2 — au téléphone, le texte du hero et des en-têtes garde 16 px de marge au moins de chaque côté', async () => {
    const problems: string[] = [];
    for (const w of [320, 390]) {
      const page = await open(w, 800);
      const m = await page.evaluate(() => {
        const marges = (cadre: Element, contenu: Element) => {
          const a = cadre.getBoundingClientRect();
          const c = contenu.getBoundingClientRect();
          return [c.left - a.left, a.right - c.right];
        };
        return [
          marges(document.querySelector('.hero')!, document.querySelector('.hero-content')!),
          ...[...document.querySelectorAll('.org-head')].map((h) => marges(h, h.querySelector('.org-head-content')!)),
        ];
      });
      m.forEach(([g, d], i) => { if (g < 16 || d < 16) problems.push(`${w} px bloc ${i} : marges ${Math.round(g)} / ${Math.round(d)} px`); });
      await page.close();
    }
    expect(problems).toEqual([]);
  });

  it('R3 — au bureau, marge de 50 px du hero et h2 de 32 px inchangés (1440 × 900)', async () => {
    const page = await open(1440, 900);
    const m = await page.evaluate(() => {
      const hero = document.querySelector('.hero')!.getBoundingClientRect();
      const c = document.querySelector('.hero-content')!.getBoundingClientRect();
      return { fs: getComputedStyle(document.querySelector('.org-head h2')!).fontSize, left: c.left - hero.left - 1 };
    });
    expect(m.fs).toBe('32px');
    expect(Math.round(m.left)).toBe(50);
    await page.close();
  });
});
