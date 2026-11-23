// @vitest-environment node
// L107 — Vidéos : le carré ▶ d'une carte ne recouvre jamais le titre (ni les étiquettes, ni les pastilles
// durée / indisponible), quelle que soit la longueur du titre. Avant : ▶ de 62 px centré sur la carte, posé sur
// un titre de 3 lignes à 1440 px (« Toutes les vidéos »). Mesuré dans un vrai navigateur sur le dist, à 1440,
// 1024 et 390 px, sur toutes les cartes (listes dépliées), puis avec des titres allongés à 2, 4 et 8 lignes.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const SOURCES = ['src/app/features/videos/videos.component.ts', 'src/app/features/videos/videos.component.scss'];
const { built, stale } = distState(SOURCES);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

interface Ecart { carte: number; titre: string; motif: string }

/** Pour chaque carte : le ▶ est dans la carte, sans intersection avec titre, étiquettes et pastilles, et laisse passer le clic au lien. */
function mesurer(page: Page): Promise<{ cartes: number; ecarts: Ecart[] }> {
  return page.evaluate(() => {
    const inter = (a: DOMRect, b: DOMRect) =>
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
    const cartes = [...document.querySelectorAll<HTMLElement>('article.video-card')];
    const ecarts: { carte: number; titre: string; motif: string }[] = [];
    cartes.forEach((carte, i) => {
      const play = carte.querySelector<HTMLElement>('.play');
      const titre = carte.querySelector<HTMLElement>('.video-title')?.textContent?.trim() ?? '';
      if (!play) { ecarts.push({ carte: i, titre, motif: 'pas de ▶' }); return; }
      const p = play.getBoundingClientRect();
      const c = carte.getBoundingClientRect();
      if (p.width < 1 || p.left < c.left - 0.5 || p.right > c.right + 0.5 || p.top < c.top - 0.5 || p.bottom > c.bottom + 0.5) {
        ecarts.push({ carte: i, titre, motif: 'hors de la carte' });
      }
      for (const sel of ['.video-title', '.tags', '.duration', '.unavailable', '.video-meta']) {
        const el = carte.querySelector<HTMLElement>(sel);
        if (el && inter(p, el.getBoundingClientRect())) ecarts.push({ carte: i, titre, motif: `recouvre ${sel}` });
      }
    });
    return { cartes: cartes.length, ecarts };
  });
}

describe.skipIf(!built || stale || !chromium)('L107 — le ▶ des cartes vidéo ne recouvre jamais le titre', { timeout: 60000 }, () => {
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

  async function ouvrir(width: number): Promise<Page> {
    const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 900 } });
    await page.goto(base + '/videos', { waitUntil: 'networkidle' });
    await page.waitForSelector('article.video-card');
    // Toutes les cartes : « Charger plus » déplié jusqu'au bout.
    // Clic dans la page (le bouton est recréé à chaque rendu : un clic Playwright attendait parfois un nœud détaché).
    await page.evaluate(async () => {
      for (let n = 0; n < 50; n++) {
        const plus = [...document.querySelectorAll<HTMLButtonElement>('button.load-more')].find((b) => b.textContent?.includes('Charger plus'));
        if (!plus) return;
        plus.click();
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
      }
    });
    expect(await page.locator('button.load-more', { hasText: 'Charger plus' }).count()).toBe(0);
    return page;
  }

  for (const width of [1440, 1024, 390]) {
    it(`${width} px — titres réels : aucun ▶ sur un titre`, async () => {
      const page = await ouvrir(width);
      const m = await mesurer(page);
      expect(m.cartes).toBeGreaterThan(10);
      expect(m.ecarts).toEqual([]);
      await page.close();
    });

    it(`${width} px — titres allongés (2, 4, 8 lignes) : aucun ▶ sur un titre, clic sur ▶ = lien de la carte`, async () => {
      const page = await ouvrir(width);
      for (const mots of [6, 14, 30]) {
        await page.evaluate((n) => {
          const long = Array.from({ length: n }, (_, k) => `Mot${k}`).join(' ');
          document.querySelectorAll<HTMLElement>('article.video-card .card-link').forEach((a) => { a.textContent = long; });
        }, mots);
        const m = await mesurer(page);
        expect(m.ecarts, `${mots} mots`).toEqual([]);
      }
      const surLien = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('article.video-card .play')].slice(0, 5).map((p) => {
          p.scrollIntoView({ block: 'center' });
          const r = p.getBoundingClientRect();
          return !!document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('a.card-link');
        }),
      );
      expect(surLien).toEqual([true, true, true, true, true]);
      await page.close();
    });
  }
});
