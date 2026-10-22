// @vitest-environment node
// L171 (revue UX L11) — Panthéon du Chaos, largeur de lecture. Mesuré au départ à 1440 px : description et lore
// sur 918 px (~137 caractères par ligne) ; grille des daemons notables à moitié vide (2 cartes de 453 px sur
// 4 pistes de 918 px). Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/app/features/lore-chaos-gods/lore-chaos-gods.component.scss',
  'src/app/features/lore-chaos-gods/lore-chaos-gods.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

describe.skipIf(!built || !chromium)('Panthéon du Chaos, largeur de lecture (navigateur, dist) — L171', () => {
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
    await page.goto(base + '/lore/chaos-gods');
    await page.locator('.notable-card').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    return page;
  };

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  it('R1 — à 1440 px, description et lore de chaque dieu : au plus 70ch de large et 90 caractères par ligne en moyenne', async () => {
    const page = await ouvrir(1440);
    const r = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.god-main p.description, .god-main p.loreLong')].map((p) => {
        const cs = getComputedStyle(p);
        const sonde = document.createElement('span');
        sonde.style.cssText = `position:absolute;visibility:hidden;width:70ch;font:${cs.font}`;
        document.body.append(sonde);
        const ch70 = sonde.getBoundingClientRect().width;
        sonde.remove();
        const lignes = Math.round(p.getBoundingClientRect().height / parseFloat(cs.lineHeight));
        return { classe: p.className, largeur: p.getBoundingClientRect().width, ch70, car: (p.textContent ?? '').trim().length / lignes };
      }),
    );
    expect(r).toHaveLength(8);
    expect(r.filter((x) => x.largeur > x.ch70 + 1 || x.car > 90)).toEqual([]);
    await page.close();
  });

  it('R2 — à 1440 px, la grille des daemons notables est bornée à la colonne de lecture et ses cartes la remplissent (plus de piste vide)', async () => {
    const page = await ouvrir(1440);
    const r = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.notable-grid')].map((g) => {
        const gr = g.getBoundingClientRect();
        const texte = g.closest('.god-main')!.querySelector('p.loreLong')!.getBoundingClientRect();
        const cartes = [...g.querySelectorAll('.notable-card')].map((c) => c.getBoundingClientRect());
        return { largeur: gr.width, texte: texte.width, droite: gr.right, derniere: Math.max(...cartes.map((c) => c.right)), n: cartes.length };
      }),
    );
    expect(r).toHaveLength(4);
    for (const g of r) {
      expect(g.largeur).toBeLessThanOrEqual(g.texte + 1);
      expect(Math.round(g.derniere)).toBeGreaterThanOrEqual(Math.round(g.droite) - 1);
    }
    await page.close();
  });

  it('R3 — à 390 px, les textes et la grille gardent toute la largeur du panneau, sans défilement horizontal', async () => {
    const page = await ouvrir(390);
    const r = await page.evaluate(() => {
      const main = document.querySelector('.god-main')!.getBoundingClientRect().width;
      const p = document.querySelector('.god-main p.loreLong')!.getBoundingClientRect().width;
      const g = document.querySelector('.notable-grid')!.getBoundingClientRect().width;
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
        [...document.querySelectorAll<HTMLElement>('.god-body')].map((b) => {
          const cs = getComputedStyle(b);
          const dedans = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
          const cadre = b.getBoundingClientRect();
          const trop = [...b.querySelectorAll<HTMLElement>('.god-main, .god-main p.loreLong, .daemons-hierarchy, .notable-grid, .notable-card')]
            .filter((e) => e.getBoundingClientRect().right > cadre.right + 0.5 || e.getBoundingClientRect().width > dedans + 0.5)
            .map((e) => e.className);
          return { dedans, trop };
        }),
      );
      expect(r).toHaveLength(4);
      for (const b of r) expect(b.trop).toEqual([]);
      await page.close();
    });
  }
});
