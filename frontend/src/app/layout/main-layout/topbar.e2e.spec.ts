// @vitest-environment node
// L23 (revue UX) — barre du haut dans un vrai navigateur, sur l'application CONSTRUITE
// (dist/frontend/browser, `ng build`) : à 1280 px, avec la pastille la plus large (« 9+ »),
// la barre ne déborde pas et garde ses marges. jsdom ne calcule aucune mise en page.
// Chromium via playwright-core (test sauté proprement s'il manque).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import type { Browser } from 'playwright-core';

const FRONTEND = resolve(__dirname, '../../../..');
const DIST = join(FRONTEND, 'dist/frontend/browser');
const SOURCES = ['src/app/layout/main-layout/main-layout.component.ts', 'src/styles.scss'];
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
};

const built = existsSync(join(DIST, 'index.html'));
const stale = built && SOURCES.some((s) => statSync(join(FRONTEND, s)).mtimeMs > statSync(join(DIST, 'index.html')).mtimeMs);

let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

/** Douze nouveautés plus récentes que la dernière visite → pastille « 9+ ». */
const NEWS = {
  project: 'warhammer40k', generated: '',
  entries: Array.from({ length: 12 }, (_, i) => ({
    slug: `n${i}`, title: `N${i}`, date: '2026-10-01', lots: [], captures: [], html: '',
  })),
};

describe.skipIf(!built || !chromium)('barre du haut de 1280 à 2560 px, pastille « 9+ » (navigateur, dist) — L23, L30', () => {
  let server: Server;
  let browser: Browser;
  let base: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const path = normalize(decodeURIComponent(new URL(req.url!, 'http://x').pathname));
      if (path.startsWith('/api/')) { res.writeHead(404).end(); return; }
      let file = join(DIST, path);
      if (path.includes('..') || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(readFileSync(file));
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    browser = await chromium!.launch();
  });
  afterAll(async () => {
    await browser?.close();
    server?.close();
  });

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale, 'dist plus ancien que la barre : relancer ng build').toBe(false);
  });

  // L30 : « Plan de travail » ajouté ; barre complète à partir de 1920 px, compacte en dessous,
  // resserrée entre 1280 et 1439 px. Chaque seuil est mesuré des deux côtés.
  it.each([1280, 1366, 1439, 1440, 1699, 1700, 1919, 1920, 2560])(
    '%i px : aucun débordement ; recherche à 34 px du bord ; au moins 16 px entre le logo et le premier lien ; « Plan de travail » visible',
    async (width) => {
      const page = await browser.newPage({ viewport: { width, height: 800 } });
      await page.addInitScript(() => localStorage.setItem('wh40k.news.seen-v1', JSON.stringify({ date: '2026-09-01', slugs: [] })));
      await page.route('**/nouveautes-data/nouveautes.json', (r) => r.fulfill({ json: NEWS }));
      await page.goto(`${base}/about`);
      await page.waitForSelector('nav.nav .news-badge');
      const m = await page.evaluate(() => {
        const box = (s: string) => document.querySelector(s)!.getBoundingClientRect();
        const bar = document.querySelector<HTMLElement>('.topbar')!;
        const links = [...document.querySelectorAll<HTMLElement>('.nav > a, .nav-dropdown > a')];
        const plan = document.querySelector<HTMLElement>('nav.nav a[href="/plan"]')!.getBoundingClientRect();
        return {
          badge: document.querySelector('nav.nav .news-badge')!.textContent!.trim(),
          overflow: bar.scrollWidth - bar.clientWidth,
          page: document.documentElement.scrollWidth - innerWidth,
          searchToEdge: innerWidth - box('.nav-search-btn').right,
          logoToFirstLink: links[0].getBoundingClientRect().left - box('.brand').right,
          tallestLink: Math.max(...links.map((a) => a.getBoundingClientRect().height)),
          planVisible: plan.width > 0 && plan.right <= innerWidth,
        };
      });
      await page.close();
      expect(m.badge).toBe('9+');
      expect(m.overflow).toBeLessThanOrEqual(0);
      expect(m.page).toBeLessThanOrEqual(0);
      expect(m.searchToEdge).toBeGreaterThanOrEqual(33.5);
      expect(m.logoToFirstLink).toBeGreaterThanOrEqual(16);
      expect(m.tallestLink).toBeLessThan(40); // chaque lien sur une ligne
      expect(m.planVisible).toBe(true);
    },
  );
});
