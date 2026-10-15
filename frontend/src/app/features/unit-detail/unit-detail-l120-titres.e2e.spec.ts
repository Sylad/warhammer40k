// @vitest-environment node
// L120 R12 — « le texte du hero garde son contenu » : avec la figure, aucun titre de fiche ne passe sous
// elle. Navigateur réel, application construite (dist), les 133 unités à 761, 900, 1100 et 1440 px.
// On mesure le texte lui-même (Range sur le contenu du h1), pas la boîte du h1 qui occupe toute la colonne,
// et le débordement horizontal du h1 (scrollWidth) : un mot trop long sort de sa colonne sans changer sa boîte.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/styles.scss',
  'src/styles/_fit-title.scss',
  'src/app/features/unit-detail/unit-detail.component.ts',
  'src/app/features/unit-detail/unit-detail.component.scss',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}
vi.setConfig({ testTimeout: 300000, hookTimeout: 60000 });
const UNITS: { id: string; nom: string }[] = JSON.parse(readFileSync(resolve(__dirname, '../../../../../backend/seed/units.json'), 'utf8'));
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#888"/></svg>';
const WIDTHS = [761, 900, 1100, 1440];

describe.skipIf(!built || !chromium)('fiche unité — aucun titre sous la figure (navigateur, dist) — L120 R12', () => {
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

  it('les 133 unités du seed', () => {
    expect(UNITS.length).toBe(133);
  });

  it.each(WIDTHS)('%i px — le texte du h1 ne chevauche la figure pour aucune des 133 unités', async (width) => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    ctx.setDefaultTimeout(8000);
    await ctx.route('**/api/images/datasheets/**', (route) => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: SVG }));
    const page = await ctx.newPage();
    const bad: string[] = [];
    try {
      for (const u of UNITS) {
        await page.goto(`${base}/units/${u.id}`);
        await page.locator('.hero figure img').waitFor({ state: 'visible' });
        await page.evaluate(() => document.fonts.ready);
        const m = await page.evaluate(() => {
          const h1 = document.querySelector('.hero h1') as HTMLElement;
          const fig = document.querySelector('.hero-figure')!.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(h1);
          let overlap = 0;
          let right = 0;
          for (const r of Array.from(range.getClientRects())) {
            right = Math.max(right, r.right);
            const w = Math.min(r.right, fig.right) - Math.max(r.left, fig.left);
            const h = Math.min(r.bottom, fig.bottom) - Math.max(r.top, fig.top);
            if (r.width > 0 && w > 0 && h > 0) overlap = Math.max(overlap, w);
          }
          const box = h1.getBoundingClientRect();
          const boxOverlap = Math.min(box.right, fig.right) - Math.max(box.left, fig.left) > 0
            && Math.min(box.bottom, fig.bottom) - Math.max(box.top, fig.top) > 0;
          return { overlap, boxOverlap, spill: h1.scrollWidth - h1.clientWidth, right, figLeft: fig.left, font: getComputedStyle(h1).fontSize };
        });
        if (m.overlap > 0 || m.boxOverlap || m.spill > 1) {
          bad.push(`${u.id} « ${u.nom} » : texte sous la figure de ${m.overlap.toFixed(0)} px, boîte ${m.boxOverlap ? 'chevauche' : 'ok'}, débord ${m.spill} px (h1 ${m.font})`);
        }
      }
    } finally { await ctx.close(); }
    console.log(`[L120] ${width} px : ${bad.length} titre(s) sous la figure sur ${UNITS.length}`);
    expect(bad).toEqual([]);
  });
});
