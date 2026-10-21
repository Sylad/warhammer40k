// @vitest-environment node
// L155 (WCAG 1.4.10, revue UX L10) — les en-têtes du Lore des Primarques se redistribuent au
// téléphone : à 320 px l'en-tête de la liste était rogné de ~35 px (marge fixe de 50 px) et le
// titre de plusieurs fiches (Sanguinius, Mortarion, Primarque-Perdu II / XI) était coupé dans un
// mot (pas de fit-title, double gouttière 14 + 16 px, texte de 218 px). Au bureau, tailles inchangées.
// Navigateur réel, application construite (dist), les 20 fiches du seed.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';
import { reflowProbe } from '../../../testing/reflow-probe';

const { built, stale } = distState([
  'src/styles.scss',
  'src/styles/_fit-title.scss',
  'src/app/features/lore-primarchs/lore-primarchs.component.scss',
  'src/app/features/primarch-detail/primarch-detail.component.ts',
  'src/app/features/primarch-detail/primarch-detail.component.scss',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}
vi.setConfig({ testTimeout: 300000, hookTimeout: 60000 });
const PRIMARCHS: { id: string }[] = JSON.parse(readFileSync(resolve(__dirname, '../../../../../backend/seed/primarchs.json'), 'utf8'));
const WIDTHS = [320, 360, 390, 768];

describe.skipIf(!built || !chromium)('Lore Primarques : en-têtes redistribués (navigateur, dist) — L155', () => {
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

  it('R1 — la liste : l’en-tête n’est ni rogné ni en défilement horizontal de 320 à 768 px', async () => {
    const page = await browser.newPage();
    const problems: string[] = [];
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto(`${base}/lore/primarchs`);
      await page.locator('main .hero h1').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const r = await page.evaluate(reflowProbe, 'main');
      if (r.scroll > 0) problems.push(`${w} px : défilement horizontal de ${r.scroll} px`);
      for (const p of [...r.overflow, ...r.clipped, ...r.broken]) problems.push(`${w} px : ${p}`);
    }
    await page.close();
    expect(problems).toEqual([]);
  });

  it('R2 — les 20 fiches : titre entier, sans coupure dans un mot, de 320 à 768 px', async () => {
    expect(PRIMARCHS.length).toBe(20);
    const page = await browser.newPage();
    const problems: string[] = [];
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 800 });
      for (const p of PRIMARCHS) {
        await page.goto(`${base}/lore/primarchs/${p.id}`);
        await page.locator('main .hero h1').waitFor();
        await page.evaluate(() => document.fonts.ready);
        const r = await page.evaluate(reflowProbe, 'main .hero');
        const spill = await page.evaluate(() => {
          const h1 = document.querySelector('main .hero h1') as HTMLElement;
          return h1.scrollWidth - h1.clientWidth;
        });
        if (r.scroll > 0) problems.push(`${w} px ${p.id} : défilement horizontal de ${r.scroll} px`);
        if (spill > 0) problems.push(`${w} px ${p.id} : titre débordant de sa boîte de ${spill} px`);
        for (const x of [...r.overflow, ...r.clipped, ...r.broken]) problems.push(`${w} px ${p.id} : ${x}`);
      }
    }
    await page.close();
    expect(problems).toEqual([]);
  });

  it('R3 — la fiche : une seule gouttière de 16 px à 320 px (le cadre de l’en-tête commence à 16 px du bord, pas 30)', async () => {
    const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
    await page.goto(`${base}/lore/primarchs/sanguinius`);
    await page.locator('main .hero h1').waitFor();
    const left = await page.locator('main .hero').evaluate((e) => e.getBoundingClientRect().left);
    await page.close();
    expect(left).toBe(16);
  });

  it('R4 — au bureau (1440 × 900), tailles de titres inchangées', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/lore/primarchs`);
    await page.locator('main .hero h1').waitFor();
    const list = await page.locator('main .hero h1').evaluate((e) => getComputedStyle(e).fontSize);
    await page.goto(`${base}/lore/primarchs/sanguinius`);
    await page.locator('main .hero h1').waitFor();
    const detail = await page.locator('main .hero h1').evaluate((e) => getComputedStyle(e).fontSize);
    await page.close();
    expect({ list, detail }).toEqual({ list: '56px', detail: '78px' });
  });
});
