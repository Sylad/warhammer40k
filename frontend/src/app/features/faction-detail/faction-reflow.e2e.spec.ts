// @vitest-environment node
// L31 (WCAG 1.4.10) — pages faction sans défilement horizontal ni texte rogné de 320 à 390 px :
// avant, les cartes « Héros Marquants » (.bible-hero, deux colonnes fixes) poussaient la page à
// 353–409 px, le titre (48 px minimum) dépassait de l'en-tête et y était rogné (« OFFICIO
// ASSASSINORUM » : 163 px), le compteur des sous-factions sortait de l'écran (Grey Knights).
// Au bureau, rendu inchangé (titre à 79,2 px à 1440). Aussi /about à 320 px (.other-card, 5 px).
// Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';
import { reflowProbe } from '../../../testing/reflow-probe';

const { built, stale } = distState([
  'src/app/features/faction-detail/faction-detail.component.scss',
  'src/app/features/faction-detail/faction-detail.component.ts',
  'src/app/features/about/about.component.scss',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}
const FACTIONS = (JSON.parse(readFileSync(resolve(__dirname, '../../../../../backend/seed/factions.json'), 'utf8')) as { id: string }[]).map((f) => f.id);

describe.skipIf(!built || !chromium)('pages faction : redistribution à 320–390 px (navigateur, dist) — L31', () => {
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

  for (const id of FACTIONS) {
    it(`/factions/${id} : ni défilement horizontal, ni texte rogné, ni titre coupé dans un mot (320, 360, 390)`, async () => {
      const page = await browser.newPage();
      const problems: string[] = [];
      for (const w of [320, 360, 390]) {
        await page.setViewportSize({ width: w, height: 800 });
        await page.goto(`${base}/factions/${id}`);
        await page.locator('main h1').waitFor();
        await page.evaluate(() => document.fonts.ready);
        const r = await page.evaluate(reflowProbe, 'main');
        if (r.scroll > 0) problems.push(`${w} px : défilement horizontal de ${r.scroll} px`);
        for (const p of [...r.overflow, ...r.clipped, ...r.broken]) problems.push(`${w} px : ${p}`);
      }
      await page.close();
      expect(problems).toEqual([]);
    });
  }

  it('bureau inchangé : titre de faction à 79,2 px à 1440, 75,13 px à 1366 (comme avant L31)', async () => {
    const page = await browser.newPage();
    for (const [w, fs] of [[1440, '79.2px'], [1366, '75.13px']] as const) {
      await page.setViewportSize({ width: w, height: 900 });
      for (const id of ['officio-assassinorum', 'necrons']) {
        await page.goto(`${base}/factions/${id}`);
        await page.locator('main h1').waitFor();
        expect(await page.locator('main h1').evaluate((h) => getComputedStyle(h).fontSize), `${id} ${w}`).toBe(fs);
      }
    }
    await page.close();
  });

  it('/about à 320 px : pas de défilement horizontal (cartes « Mes autres sites »)', async () => {
    const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
    await page.goto(`${base}/about`);
    await page.locator('main h1').waitFor();
    const r = await page.evaluate(reflowProbe, 'main');
    await page.close();
    expect(r.scroll).toBe(0);
    expect(r.overflow).toEqual([]);
  });
});
