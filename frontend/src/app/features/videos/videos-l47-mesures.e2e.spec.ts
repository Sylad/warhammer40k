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

  it('R5 — à 390 px, le message d\'identifiant inconnu est dans le premier écran', async () => {
    const page = await open(390, '/videos?video=disparue');
    const top = await page.locator('[data-testid="message-vide"]').evaluate((e) => e.getBoundingClientRect().top);
    expect(top).toBeLessThan(500);
    await page.close();
  });
});
