// @vitest-environment node
// L182 (revue UX L12) — Civils Impériaux, largeur de lecture. Mesuré au départ à 1440 px : description et lore
// sur 980 px (~156 caractères par ligne), grille des figures remplie à 24 % (236 px sur 980) pour 8 organisations
// sur 13. Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

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

describe.skipIf(!built || !chromium)('Civils Impériaux, largeur de lecture (navigateur, dist) — L182', () => {
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

  const ouvrir = async (w: number) => {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto(base + '/lore/civilians');
    await page.locator('.figure-card').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    return page;
  };

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  it('R1 — à 1440 px, description, lore et citation de chaque organisation : au plus 70ch de large et 90 caractères par ligne en moyenne', async () => {
    const page = await ouvrir(1440);
    const r = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.org-main p.description, .org-main p.loreLong, .org-main .citation')].map((p) => {
        const cs = getComputedStyle(p);
        const sonde = document.createElement('span');
        sonde.style.cssText = `position:absolute;visibility:hidden;width:70ch;font:${cs.font}`;
        document.body.append(sonde);
        const ch70 = sonde.getBoundingClientRect().width;
        sonde.remove();
        const lignes = Math.round(p.getBoundingClientRect().height / parseFloat(cs.lineHeight));
        return { classe: p.className, largeur: p.getBoundingClientRect().width, ch70, car: (p.textContent ?? '').trim().length / Math.max(lignes, 1) };
      }),
    );
    expect(r.length).toBeGreaterThanOrEqual(39);
    expect(r.filter((x) => x.classe !== 'citation' && (x.largeur > x.ch70 + 1 || x.car > 90))).toEqual([]);
    expect(r.filter((x) => x.classe === 'citation' && x.largeur > x.ch70 + 1)).toEqual([]);
    await page.close();
  });

  it('R2 — à 1440 px, la grille des figures est bornée à la colonne de lecture et ses cartes la remplissent (plus de piste vide)', async () => {
    const page = await ouvrir(1440);
    const r = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.figures-grid')].map((g) => {
        const gr = g.getBoundingClientRect();
        const texte = g.closest('.org-main')!.querySelector('p.loreLong')!.getBoundingClientRect();
        const cartes = [...g.querySelectorAll('.figure-card')].map((c) => c.getBoundingClientRect());
        return { largeur: gr.width, texte: texte.width, droite: gr.right, derniere: Math.max(...cartes.map((c) => c.right)), n: cartes.length };
      }),
    );
    expect(r.length).toBeGreaterThanOrEqual(8);
    for (const g of r) {
      expect(g.largeur).toBeLessThanOrEqual(g.texte + 1);
      expect(Math.round(g.derniere)).toBeGreaterThanOrEqual(Math.round(g.droite) - 1);
    }
    await page.close();
  });

  it('R3 — à 390 px, les textes et la grille gardent toute la largeur du panneau, sans défilement horizontal', async () => {
    const page = await ouvrir(390);
    const r = await page.evaluate(() => {
      const main = document.querySelector('.org-main')!.getBoundingClientRect().width;
      const p = document.querySelector('.org-main p.loreLong')!.getBoundingClientRect().width;
      const g = document.querySelector('.figures-grid')!.getBoundingClientRect().width;
      return { main, p, g, defile: document.documentElement.scrollWidth > innerWidth };
    });
    expect(Math.round(r.p)).toBe(Math.round(r.main));
    expect(Math.round(r.g)).toBe(Math.round(r.main));
    expect(r.defile).toBe(false);
    await page.close();
  });

  for (const w of [320, 390, 500]) {
    it(`R4 — à ${w} px, la colonne principale tient dans le corps de fiche : rien n'est rogné par l'article`, async () => {
      const page = await ouvrir(w);
      const r = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.org-body')].map((b) => {
          const cs = getComputedStyle(b);
          const dedans = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
          const cadre = b.getBoundingClientRect();
          const trop = [...b.querySelectorAll<HTMLElement>('.org-main, .org-main p.loreLong, .figures-grid, .figure-card')]
            .filter((e) => e.getBoundingClientRect().right > cadre.right + 0.5 || e.getBoundingClientRect().width > dedans + 0.5)
            .map((e) => e.className);
          return { dedans, trop };
        }),
      );
      expect(r).toHaveLength(13);
      for (const b of r) expect(b.trop).toEqual([]);
      await page.close();
    });
  }
});
