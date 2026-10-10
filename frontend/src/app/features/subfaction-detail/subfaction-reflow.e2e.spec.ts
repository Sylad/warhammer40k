// @vitest-environment node
// L88 (WCAG 1.4.10) — pages sous-faction sans défilement horizontal ni texte rogné de 320 à 390 px :
// avant, la colonne unique (`1fr`) s'élargissait au contenu le plus large (mot de titre, devise,
// lien), le bandeau (`overflow: hidden`) rognait son texte (57/182 pages à 320 px, Shadowkeepers
// +80 px à 390). Navigateur réel, application construite (dist), les 182 sous-factions du seed.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';
import { reflowProbe } from '../../../testing/reflow-probe';

const { built, stale } = distState([
  'src/app/features/subfaction-detail/subfaction-detail.component.scss',
  'src/app/features/subfaction-detail/subfaction-detail.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}
const SUBS = (JSON.parse(readFileSync(resolve(__dirname, '../../../../../backend/seed/subfactions.json'), 'utf8')) as { id: string }[]).map((f) => f.id);

describe.skipIf(!built || !chromium)('pages sous-faction : redistribution à 320–390 px (navigateur, dist) — L88', () => {
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

  it(`les ${SUBS.length} sous-factions : ni défilement horizontal, ni texte rogné, ni titre coupé dans un mot (320, 360, 390)`, async () => {
    const page = await browser.newPage();
    const problems: string[] = [];
    for (const w of [320, 360, 390]) {
      await page.setViewportSize({ width: w, height: 800 });
      for (const id of SUBS) {
        await page.goto(`${base}/subfactions/${id}`);
        await page.locator('main h1').waitFor();
        const r = await page.evaluate(reflowProbe, 'main');
        if (r.scroll > 0) problems.push(`${id} ${w} px : défilement horizontal de ${r.scroll} px`);
        for (const p of [...r.overflow, ...r.clipped, ...r.broken]) problems.push(`${id} ${w} px : ${p}`);
      }
    }
    await page.close();
    expect(problems).toEqual([]);
  }, 600_000);

  it('bureau inchangé : titre à 64 px à 1440, colonne principale + 320 px de barre latérale', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/subfactions/${SUBS[0]}`);
    await page.locator('main h1').waitFor();
    expect(await page.locator('main h1').evaluate((h) => getComputedStyle(h).fontSize)).toBe('64px');
    expect(await page.locator('.sidebar').evaluate((e) => e.getBoundingClientRect().width)).toBe(320);
    await page.close();
  });
});
