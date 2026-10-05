// @vitest-environment node
// L39 — arrivée sur une ancre : la cible doit apparaître JUSTE SOUS la barre du haut collante
// (entre son bas et bas + 40 px), pas dessous. Le défilement d'ancre du routeur ignore
// scroll-margin-top (window.scrollTo) : décalage global du ViewportScroller. Les pages /plan et
// /nouveautes ont leur propre arrivée (scrollIntoView) : le décalage ne doit pas s'y additionner.
// Navigateur réel sur l'application construite (dist), API servie depuis backend/seed.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import type { Browser, Page } from 'playwright-core';

const FRONTEND = resolve(__dirname, '../../../..');
const SEED = resolve(FRONTEND, '../backend/seed');
const DIST = join(FRONTEND, 'dist/frontend/browser');
const SOURCES = ['src/app/app.config.ts', 'src/app/layout/main-layout/main-layout.component.ts'];
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
};
const API: Record<string, string> = { '/api/lore/chaos-gods': 'chaos-gods.json', '/api/lore/concepts': 'lore-concepts.json' };
const built = existsSync(join(DIST, 'index.html'));
const stale = built && SOURCES.some((s) => statSync(join(FRONTEND, s)).mtimeMs > statSync(join(DIST, 'index.html')).mtimeMs);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

const news = JSON.parse(readFileSync(join(FRONTEND, 'public/nouveautes-data/nouveautes.json'), 'utf8'));
const plan = JSON.parse(readFileSync(join(FRONTEND, 'public/plan-data/plan.json'), 'utf8'));

describe.skipIf(!built || !chromium)('ancres : la cible arrive sous la barre du haut (navigateur, dist) — L39', () => {
  let server: Server;
  let browser: Browser;
  let base: string;
  beforeAll(async () => {
    server = createServer((req, res) => {
      const path = normalize(decodeURIComponent(new URL(req.url!, 'http://x').pathname));
      if (path.startsWith('/api/')) {
        const f = API[path];
        res.writeHead(200, { 'content-type': 'application/json' }).end(f ? readFileSync(join(SEED, f)) : path.startsWith('/api/demo') || path.startsWith('/api/wiki') ? '{}' : '[]');
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

  /** Haut de la cible par rapport au bas de la barre, une fois le défilement fini. */
  async function gap(page: Page, id: string): Promise<{ gap: number; bar: number; bottom: boolean }> {
    await page.waitForFunction((x) => !!document.getElementById(x), id);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    let last = -1;
    for (let i = 0; i < 40; i++) {
      const y = await page.evaluate(() => window.scrollY);
      if (y === last && i > 3) break;
      last = y;
      await page.waitForTimeout(100);
    }
    return page.evaluate((x) => {
      const bar = document.querySelector('.topbar')!.getBoundingClientRect().bottom;
      // Bas de page atteint : la cible ne peut pas monter plus haut (page trop courte).
      const bottom = Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 1;
      return { gap: Math.round(document.getElementById(x)!.getBoundingClientRect().top - bar), bar: Math.round(bar), bottom };
    }, id);
  }

  const cases: [string, (p: Page) => Promise<string>][] = [
    ['Panthéon Chaos, raccourci « Tzeentch »', async (p) => {
      await p.goto(`${base}/lore/chaos-gods`);
      await p.locator('a.quick-link').nth(1).click();
      return 'tzeentch';
    }],
    ['Concepts, carte « Liens inter-concepts »', async (p) => {
      await p.goto(`${base}/lore/concepts`);
      const a = p.locator('a.related-card').last();
      const id = decodeURIComponent((await a.getAttribute('href'))!.split('#')[1]);
      await a.click();
      return id;
    }],
    ['/plan#<lot>', async (p) => {
      const id = (plan.lots.find((l: { status: string }) => l.status === 'doing') ?? plan.lots[0]).id;
      await p.goto(`${base}/plan#${id}`);
      return id;
    }],
    ['/nouveautes#<entrée>', async (p) => {
      const slug = news.entries.at(-1).slug;
      await p.goto(`${base}/nouveautes#${slug}`);
      return slug;
    }],
  ];

  for (const [w, h] of [[1440, 900], [390, 844]]) {
    for (const [name, open] of cases) {
      it(`${w} px — ${name} : entre le bas de la barre et +40 px`, async () => {
        const page = await browser.newPage({ viewport: { width: w, height: h } });
        await page.addInitScript(() => localStorage.setItem('wh40k.news.seen-v1', JSON.stringify({ date: '2026-01-01', slugs: [], at: '2026-01-02T10:00:00Z' })));
        // L55 : polices web tardives (400 ms) — le texte se reflue après l'arrivée sur l'ancre.
        await page.route(/\.(woff2?|ttf)(\?|$)|fonts\.(googleapis|gstatic)/, async (r) => { await new Promise((x) => setTimeout(x, 400)); await r.continue(); });
        const id = await open(page);
        const m = await gap(page, id);
        await page.close();
        expect(m.bar).toBeGreaterThan(0);
        expect(m.gap, `${id} : ${m.gap} px sous la barre`).toBeGreaterThanOrEqual(0);
        if (!m.bottom) expect(m.gap, `${id} : ${m.gap} px sous la barre`).toBeLessThanOrEqual(40);
      });
    }
  }
});
