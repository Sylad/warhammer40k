// @vitest-environment node
// L34 — page Nouveautés dans un vrai navigateur (dist, `ng build`) : la date ne se coupe jamais
// en son milieu (« 2 OCTOBRE / 2026 ») ; à 320 et 390 px, avec la marque « Nouveau » et le
// bouton « Copier le lien », la ligne passe à la ligne ENTRE les éléments, sans débordement.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import type { Browser } from 'playwright-core';

const FRONTEND = resolve(__dirname, '../../../..');
const DIST = join(FRONTEND, 'dist/frontend/browser');
const SOURCES = ['src/app/features/nouveautes/nouveautes.component.ts', 'src/app/features/nouveautes/nouveautes.component.scss'];
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

/** Dates les plus larges en capitales : « 30 SEPTEMBRE 2026 », « 12 DÉCEMBRE 2026 ». */
const NEWS = {
  project: 'warhammer40k', generated: '',
  entries: [
    { slug: 'a', title: 'Une entrée de septembre', date: '2026-09-30', lots: [], captures: [], html: '<p>Texte.</p>' },
    { slug: 'b', title: 'Une entrée de décembre', date: '2026-12-12', lots: [], captures: [], html: '<p>Texte.</p>' },
  ],
};

describe.skipIf(!built || !chromium)('page Nouveautés (navigateur, dist) — L34', () => {
  let server: Server;
  let browser: Browser;
  let base: string;
  beforeAll(async () => {
    server = createServer((req, res) => {
      const path = normalize(decodeURIComponent(new URL(req.url!, 'http://x').pathname));
      if (path.startsWith('/api/')) {
        res.writeHead(200, { 'content-type': 'application/json' }).end(path.startsWith('/api/demo') ? '{}' : '[]');
        return;
      }
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
    expect(stale).toBe(false);
  });

  it.each([320, 390, 1440])('%i px, marque « Nouveau » : date sur une ligne, bouton dans la carte, aucun débordement', async (width) => {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    await page.addInitScript(() => localStorage.setItem('wh40k.news.seen-v1', JSON.stringify({ date: '2026-01-01', slugs: [], at: '2026-01-02T10:00:00Z' })));
    await page.route('**/nouveautes-data/nouveautes.json', (r) => r.fulfill({ json: NEWS }));
    await page.goto(`${base}/nouveautes`);
    await page.waitForSelector('.news-new');
    await page.evaluate(() => document.fonts.ready);
    const m = await page.evaluate(() => [...document.querySelectorAll('article.news-entry')].map((a) => {
      const r = (s: string) => a.querySelector(s)!.getBoundingClientRect();
      const time = a.querySelector('time')!;
      const lh = parseFloat(getComputedStyle(time).fontSize) * 1.6;
      return {
        timeLines: time.getClientRects().length, timeH: r('time').height, lh,
        btnIn: r('.news-copy').right <= a.getBoundingClientRect().right && r('.news-copy').left >= a.getBoundingClientRect().left,
        inner: a.scrollWidth - a.clientWidth,
        newH: r('.news-new').height,
      };
    }).concat([{ page: document.documentElement.scrollWidth - innerWidth } as never]));
    await page.close();
    const pageOverflow = (m.pop() as unknown as { page: number }).page;
    expect(pageOverflow).toBeLessThanOrEqual(0);
    for (const e of m) {
      expect(e.timeLines).toBe(1);
      expect(e.timeH).toBeLessThan(e.lh);
      expect(e.btnIn).toBe(true);
      expect(e.inner).toBeLessThanOrEqual(0);
    }
  });
});
