// @vitest-environment node
// L224 — chronologie de la fiche d'un Primarque : l'étiquette de date chevauchait le titre de la bataille,
// à toutes les largeurs (repère en absolu, emporté par la marge haute du contenu). Mesure, pour chaque
// Primarque du seed et chaque bataille, que la date, le titre et le bloc de contenu ne se recouvrent pas
// et que la date reste dans le panneau. Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/app/features/primarch-detail/primarch-detail.component.scss',
  'src/app/features/primarch-detail/primarch-detail.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

const SEED = resolve(__dirname, '../../../../../backend/seed/primarchs.json');
const IDS: string[] = (JSON.parse(readFileSync(SEED, 'utf8')) as { id: string; notableBattles?: unknown[] }[])
  .filter((p) => p.notableBattles?.length)
  .map((p) => p.id);

describe.skipIf(!built || !chromium)('Fiche Primarque, chronologie (navigateur, dist) — L224', () => {
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

  it('le seed a des Primarques avec des batailles', () => {
    expect(IDS.length).toBeGreaterThan(0);
  });

  for (const w of [320, 390, 1440]) {
    it(`à ${w} px, la date ne touche ni le titre ni le contenu de sa bataille, et reste dans le panneau`, async () => {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      await page.route('**/api/wiki-image*', (r) => r.fulfill({ json: { imageUrl: null } }));
      const defauts: string[] = [];
      let dates = 0;
      for (const id of IDS) {
        await page.goto(`${base}/lore/primarchs/${id}`);
        await page.locator('#batailles .tl-event').first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        const r = await page.evaluate(() => {
          const rect = (el: Element) => el.getBoundingClientRect();
          const recouvre = (a: DOMRect, b: DOMRect) =>
            a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
          const panneau = rect(document.querySelector('#batailles')!);
          const out: string[] = [];
          let n = 0;
          document.querySelectorAll('#batailles .tl-event').forEach((ev, i) => {
            const date = ev.querySelector('.tl-date');
            if (!date) return;
            n++;
            const d = rect(date);
            const titre = rect(ev.querySelector('.tl-content h3')!);
            const contenu = rect(ev.querySelector('.tl-content')!);
            if (recouvre(d, titre)) out.push(`bataille ${i + 1} : date sur le titre`);
            if (recouvre(d, contenu)) out.push(`bataille ${i + 1} : date sur le contenu`);
            if (d.left < panneau.left || d.right > panneau.right) out.push(`bataille ${i + 1} : date hors du panneau`);
            const autres = [...document.querySelectorAll('#batailles .tl-content')].filter((c) => !ev.contains(c));
            if (autres.some((c) => recouvre(d, rect(c)))) out.push(`bataille ${i + 1} : date sur une autre bataille`);
          });
          return { out, n };
        });
        dates += r.n;
        defauts.push(...r.out.map((m) => `${id} — ${m}`));
      }
      await page.close();
      expect(dates).toBeGreaterThan(0);
      expect(defauts).toEqual([]);
    }, 120000);
  }
});
