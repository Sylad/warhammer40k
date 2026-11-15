// @vitest-environment node
// L225 — revue UX de L40 : à 320 px, le titre « ✠ ICONOGRAPHIE » de la fiche faction (un seul mot en capitales,
// 26 px) débordait de son panneau. Mesure, pour chaque faction et chaque Primarque du seed, que chaque titre h2
// de la fiche tient dans la boîte de contenu de son parent à 320 px (Iconographie affichée : images du wiki
// bouchonnées), et que la page ne défile pas en largeur à 320, 390 et 1440 px. Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/app/features/faction-detail/faction-detail.component.scss',
  'src/app/features/faction-detail/faction-detail.component.ts',
  'src/app/features/primarch-detail/primarch-detail.component.scss',
  'src/app/features/primarch-detail/primarch-detail.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

const SEED = resolve(__dirname, '../../../../../backend/seed');
const ids = (file: string) => (JSON.parse(readFileSync(resolve(SEED, file), 'utf8')) as { id: string }[]).map((x) => x.id);
const FICHES = [
  ...ids('factions.json').map((id) => `/factions/${id}`),
  ...ids('primarchs.json').map((id) => `/lore/primarchs/${id}`),
];
/** PNG 1×1 : l'Iconographie ne s'affiche que si le wiki rend des images. */
const IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe.skipIf(!built || !chromium)('Fiches faction et Primarque, titres h2 sans débordement (navigateur, dist) — L225', () => {
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

  for (const w of [320, 390, 1440]) {
    it(`à ${w} px, aucune fiche ne défile en largeur${w === 320 ? ' et chaque titre h2 tient dans son parent' : ''}`, async () => {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      await page.route('**/api/wiki-image*', (r) => r.fulfill({ json: { imageUrl: IMAGE } }));
      const defauts: string[] = [];
      let iconographies = 0;
      for (const url of FICHES) {
        await page.goto(`${base}${url}`);
        await page.locator('main h1').first().waitFor();
        await page.locator('#iconographie h2').waitFor();
        await page.evaluate(() => document.fonts.ready);
        const r = await page.evaluate((titres) => {
          const out: string[] = [];
          const vw = document.documentElement.clientWidth;
          const scroll = document.documentElement.scrollWidth - vw;
          if (scroll > 0) out.push(`défilement horizontal de ${scroll} px`);
          if (titres) document.querySelectorAll('main h2').forEach((h) => {
            const parent = h.parentElement!;
            const cs = getComputedStyle(parent);
            const p = parent.getBoundingClientRect();
            const gauche = p.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
            const droite = p.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
            const range = document.createRange();
            range.selectNodeContents(h);
            const t = range.getBoundingClientRect();
            const b = h.getBoundingClientRect();
            const depasse = Math.max(Math.max(b.right, t.right) - droite, gauche - Math.min(b.left, t.left));
            if (depasse > 0.5) out.push(`h2 « ${h.textContent!.trim()} » déborde de ${Math.round(depasse)} px`);
          });
          return { out, icono: !!document.querySelector('#iconographie h2') };
        }, w === 320);
        if (r.icono) iconographies++;
        defauts.push(...r.out.map((m) => `${url} — ${m}`));
      }
      await page.close();
      expect(iconographies).toBe(FICHES.length);
      expect(defauts).toEqual([]);
    }, 300000);
  }
});
