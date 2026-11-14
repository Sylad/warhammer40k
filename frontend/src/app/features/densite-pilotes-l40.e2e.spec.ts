// @vitest-environment node
// L40 — campagne densité : les deux pages pilotes (fiche faction, fiche Lore « primarque ») tiennent
// les règles communes D1 à D6 (docs/densite/regles.md) à 1440×900 et 390×844, pour CHAQUE faction et
// CHAQUE primarque des données. La mesure est celle de `npm run densite` (scripts/densite-lib.mjs),
// prise au navigateur sur l'application construite (dist), au repos (rien de déplié).
// Puis « Lire la suite » : déplié, le texte entier se lit ; replié, il revient à ses lignes.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../testing/dist-server';
// @ts-expect-error module JavaScript sans déclaration de types
import { LARGEURS, ecarts, mesurer } from '../../../scripts/densite-lib.mjs';

const { built, stale } = distState([
  'src/app/features/faction-detail/faction-detail.component.ts',
  'src/app/features/faction-detail/faction-detail.component.scss',
  'src/app/features/primarch-detail/primarch-detail.component.ts',
  'src/app/features/primarch-detail/primarch-detail.component.scss',
  'src/app/shared/components/texte-repliable/texte-repliable.component.ts',
  'src/styles/_densite.scss',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}
const seed = (f: string) => (JSON.parse(readFileSync(resolve(__dirname, '../../../../backend/seed', f), 'utf8')) as { id: string }[]).map((x) => x.id);
const PAGES = [...seed('factions.json').map((id) => `/factions/${id}`), ...seed('primarchs.json').map((id) => `/lore/primarchs/${id}`)];

describe.skipIf(!built || !chromium)('pages pilotes de la densité : règles D1 à D6 (navigateur, dist) — L40', () => {
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

  for (const { nom, w, h } of LARGEURS as { nom: string; w: number; h: number }[]) {
    it(`${w} px : aucune fiche faction ni primarque en écart aux règles`, async () => {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      const problemes: string[] = [];
      for (const path of PAGES) {
        await page.goto(base + path);
        await page.locator('main h1').waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(100); // mesure du repli (ResizeObserver)
        const m = await page.evaluate(mesurer);
        for (const e of ecarts(m, nom)) problemes.push(`${path} ${e.regle} ${e.detail}`);
        // DENSITE_DEBUG=1 : détail des blocs en cause (lignes, caractères par ligne).
        if (process.env.DENSITE_DEBUG) for (const p of m.prose) if (p.lignesAffichees > 8 || p.cpl > 80) problemes.push(`  ${JSON.stringify(p)}`);
      }
      await page.close();
      expect(problemes).toEqual([]);
    }, 120000);
  }

  it('« Lire la suite » déplie le texte entier, « Réduire » le replie ; focus gardé sur le bouton', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(base + '/factions/space-marines');
    const p = page.locator('#chronique p.bible-text');
    const bouton = page.locator('#chronique button.tr-bouton');
    await bouton.waitFor();
    const replie = await p.evaluate((e) => [e.clientHeight, e.scrollHeight]);
    expect(replie[1]).toBeGreaterThan(replie[0] + 1);
    await bouton.click();
    await expect.poll(() => bouton.getAttribute('aria-expanded')).toBe('true');
    const deplie = await p.evaluate((e) => [e.clientHeight, e.scrollHeight]);
    expect(deplie[0]).toBe(deplie[1]);
    expect(await bouton.evaluate((b) => b === document.activeElement)).toBe(true);
    await bouton.click();
    await expect.poll(() => bouton.getAttribute('aria-expanded')).toBe('false');
    expect(await p.evaluate((e) => e.clientHeight)).toBe(replie[0]);
    await page.close();
  });

  it('un texte qui tient en entier n\'a pas de bouton (Space Marines, Origine : 176 caractères)', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base + '/factions/space-marines');
    await page.locator('#histoire').waitFor();
    expect(await page.locator('#histoire button.tr-bouton').count()).toBe(0);
    await page.close();
  });
});
