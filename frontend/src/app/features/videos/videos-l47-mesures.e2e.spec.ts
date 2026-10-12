// @vitest-environment node
// L47 (correctifs de revue) — mesures de mise en page dans un vrai navigateur, sur l'application
// construite (dist, `ng build` requis) : lien étiré sur toute la carte (R9), fenêtre de lecture à
// 390 px sans recouvrement du lecteur (R2), bandeau d'état dans le premier écran (R4, R5).
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

describe.skipIf(!built || stale || !chromium)('L47 — mesures de la page /videos (navigateur, dist)', { timeout: 30000 }, () => {
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
  async function open(width: number, path: string): Promise<Page> {
    const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 900 } });
    await page.goto(base + path, { waitUntil: 'networkidle' });
    return page;
  }

  it('R9 — le lien étiré couvre toute la carte (haut de la carte compris)', async () => {
    const page = await open(1440, '/videos?video=disparue');
    const hit = await page.evaluate(() => {
      const card = document.querySelectorAll('article.video-card')[document.querySelectorAll('article.video-card').length - 1] as HTMLElement;
      card.scrollIntoView({ block: 'center' });
      const r = card.getBoundingClientRect();
      const pts = [[0.5, 0.1], [0.5, 0.3], [0.1, 0.9], [0.9, 0.05]];
      return pts.map(([x, y]) => !!document.elementFromPoint(r.left + r.width * x, r.top + r.height * y)?.closest('a.card-link'));
    });
    expect(hit).toEqual([true, true, true, true]);
    await page.close();
  });

  it('R2 — à 390 px, la légende de la fenêtre ne recouvre pas le lecteur', async () => {
    for (const id of ['astartes', 'lord-inquisitor-prologue', 'flashgitz-space-king']) {
      const page = await open(390, `/videos?video=${id}`);
      const m = await page.evaluate(() => {
        const box = document.querySelector('.modal-box')?.getBoundingClientRect();
        const cap = document.querySelector('.modal-cap')?.getBoundingClientRect();
        if (!box || !cap) return null;
        const el = document.elementFromPoint(box.left + 10, box.bottom - 6);
        return { capTop: cap.top, boxBottom: box.bottom, onCap: !!el?.closest('.modal-cap') };
      });
      expect(m).not.toBeNull();
      if (m) {
        expect(m.capTop).toBeGreaterThanOrEqual(m.boxBottom);
        expect(m.onCap).toBe(false);
      }
      await page.close();
    }
  });

  it('R2 — le bouton Fermer ne recouvre pas le lecteur (390 et 1440 px), 44 px minimum', async () => {
    for (const width of [390, 1440]) {
      const page = await open(width, '/videos?video=astartes');
      const m = await page.evaluate(() => {
        const c = document.querySelector('[data-testid="bouton-fermer"]')!.getBoundingClientRect();
        const p = document.querySelector('.modal-player')!.getBoundingClientRect();
        return { w: c.width, h: c.height, top: c.top, cb: c.bottom, pt: p.top, pl: p.left, pr: p.right, cl: c.left, cr: c.right };
      });
      expect(m.cb).toBeLessThanOrEqual(m.pt);
      expect(m.top).toBeGreaterThanOrEqual(0);
      expect(Math.min(m.w, m.h)).toBeGreaterThanOrEqual(44);
      expect(m.cr).toBeLessThanOrEqual(m.pr + 1);
      await page.close();
    }
  });

  it('R5 — à 390 px, le message d\'identifiant inconnu est dans le premier écran', async () => {
    const page = await open(390, '/videos?video=disparue');
    const top = await page.locator('[data-testid="message-vide"]').evaluate((e) => e.getBoundingClientRect().top);
    expect(top).toBeLessThan(500);
    await page.close();
  });

  it('R9 — à 390 px, le hero tient dans la fenêtre (aucun enfant ne dépasse)', async () => {
    const page = await open(390, '/videos');
    const m = await page.evaluate(() => {
      const hero = document.querySelector('.hero')!.getBoundingClientRect();
      const h1 = document.querySelector('.hero h1') as HTMLElement;
      const over = [...document.querySelectorAll('.hero-content *')].filter((e) => e.getBoundingClientRect().right > hero.right + 1).length;
      return { over, h1Clipped: h1.scrollWidth > h1.clientWidth + 1 };
    });
    expect(m).toEqual({ over: 0, h1Clipped: false });
    await page.close();
  });

  it('R5 — le bandeau d\'état précède le hero dans le DOM et à l\'écran', async () => {
    const page = await open(1440, '/videos?video=disparue');
    const m = await page.evaluate(() => {
      const msg = document.querySelector('[data-testid="message-vide"]')!;
      const hero = document.querySelector('.hero')!;
      return { dom: !!(msg.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING), top: msg.getBoundingClientRect().top < hero.getBoundingClientRect().top };
    });
    expect(m).toEqual({ dom: true, top: true });
    await page.close();
  });

  it('R4 — les cartes d\'attente viennent après le hero', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route('**/api/videos*', () => undefined);
    await page.goto(base + '/videos?video=astartes', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.attente');
    const m = await page.evaluate(() => ({
      skel: document.querySelector('.attente')!.getBoundingClientRect().top,
      heroBottom: document.querySelector('.hero')!.getBoundingClientRect().bottom,
    }));
    expect(m.skel).toBeGreaterThanOrEqual(m.heroBottom);
    await page.close();
  });

  it('R9 — le bouton Supprimer est visible en permanence, 44×44 px', async () => {
    const page = await open(390, '/videos?video=disparue');
    const m = await page.locator('[data-testid="bouton-supprimer"]').first().evaluate((e) => {
      const r = e.getBoundingClientRect();
      return { w: r.width, h: r.height, o: getComputedStyle(e).opacity };
    });
    expect(m.w).toBeGreaterThanOrEqual(44);
    expect(m.h).toBeGreaterThanOrEqual(44);
    expect(Number(m.o)).toBeGreaterThan(0.5);
    await page.close();
  });
  it('R2 — fenêtre basse (1366×650, 1280×600, 844×390) : Fermer et « Ouvrir sur YouTube » restent à l\'écran', async () => {
    for (const [w, h] of [[1366, 650], [1280, 600], [844, 390]] as const) {
      for (const id of ['astartes', 'flashgitz-space-king']) {
        const page = await browser.newPage({ viewport: { width: w, height: h } });
        await page.goto(`${base}/videos?video=${id}`, { waitUntil: 'networkidle' });
        const m = await page.evaluate(() => {
          const r = (s: string) => document.querySelector(s)?.getBoundingClientRect();
          return { close: r('[data-testid="bouton-fermer"]'), link: r('.modal-link'), box: r('.modal-box') };
        });
        expect(m.close && m.close.top >= 0 && m.close.bottom <= h).toBe(true);
        expect(m.link && m.link.top >= 0 && m.link.bottom <= h).toBe(true);
        expect(m.box && m.box.height >= 150).toBe(true);
        await page.close();
      }
    }
  });
});
