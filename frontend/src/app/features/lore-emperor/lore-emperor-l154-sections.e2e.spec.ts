// @vitest-environment node
// L154 (revue UX L9) — sections du Lore de l'Empereur : avant, le texte des sections 2, 4 et 6 restait
// dans une colonne de 200 px tant que l'image du wiki manquait (CLS 0,123), et les lignes
// montaient à ~148 caractères à 1440 px. Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/app/features/lore-emperor/lore-emperor.component.scss',
  'src/app/features/lore-emperor/lore-emperor.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

const GREY = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#555"/></svg>').toString('base64');

describe.skipIf(!built || !chromium)('Lore Empereur, sections (navigateur, dist) — L154', () => {
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

  async function open(w: number, withImage: boolean): Promise<Page> {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    if (withImage) await page.route('**/api/wiki-image*', (r) => r.fulfill({ json: { imageUrl: GREY } }));
    await page.goto(base + '/lore/emperor');
    await page.locator('.section').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    if (withImage) await page.locator('.section-img').first().waitFor();
    return page;
  }

  // Largeur de chaque paragraphe, nombre de lignes et caractères par ligne moyens.
  const mesure = () =>
    [...document.querySelectorAll<HTMLElement>('.section-body p')].map((p) => {
      const cs = getComputedStyle(p);
      const lignes = Math.round(p.getBoundingClientRect().height / parseFloat(cs.lineHeight));
      return { largeur: p.getBoundingClientRect().width, car: (p.textContent ?? '').length / lignes };
    });

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  it('R1 — sans image du wiki, le texte de chaque section occupe la largeur de lecture et non une colonne de 200 px', async () => {
    const page = await open(1440, false);
    const m = await page.evaluate(mesure);
    expect(m.length).toBeGreaterThanOrEqual(6);
    expect(m.filter((x) => x.largeur < 400)).toEqual([]);
    await page.close();
  });

  it('R2 — sans image, l’arrivée tardive d’aucune image ne déplace rien : aucune colonne image n’est réservée', async () => {
    const page = await open(1440, false);
    expect(await page.locator('.section-img').count()).toBe(0);
    const cols = await page.evaluate(() =>
      [...document.querySelectorAll('.section-body')].map((b) => getComputedStyle(b).gridTemplateColumns.split(' ').length),
    );
    expect(cols.filter((n) => n !== 1)).toEqual([]);
    await page.close();
  });

  it('R3 — avec une image, le texte et l’image sont côte à côte (deux colonnes) à 1440 px', async () => {
    const page = await open(1440, true);
    const r = await page.evaluate(() =>
      [...document.querySelectorAll('.section-body')].map((b) => {
        const p = b.querySelector('p')!.getBoundingClientRect();
        const i = b.querySelector('.section-img')!.getBoundingClientRect();
        return { memeLigne: i.top < p.bottom && p.top < i.bottom, largeurImage: i.width };
      }),
    );
    expect(r.length).toBeGreaterThanOrEqual(6);
    expect(r.filter((x) => !x.memeLigne || x.largeurImage !== 200)).toEqual([]);
    await page.close();
  });

  it('R4 — lignes de 90 caractères au plus en moyenne (148 avant) et paragraphe borné à 70ch, avec ou sans image, à 1440 px', async () => {
    for (const withImage of [false, true]) {
      const page = await open(1440, withImage);
      const m = await page.evaluate(mesure);
      const ch70 = await page.evaluate(() => {
        const s = document.createElement('span');
        s.style.cssText = 'position:absolute;width:70ch;font:' + getComputedStyle(document.querySelector('.section-body p')!).font;
        document.body.append(s);
        return s.getBoundingClientRect().width;
      });
      expect(m.filter((x) => x.car > 90 || x.largeur > ch70 + 1), `image: ${withImage}`).toEqual([]);
      await page.close();
    }
  });
});
