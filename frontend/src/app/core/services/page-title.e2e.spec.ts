// @vitest-environment node
// L36 (WCAG 2.4.2) — titre du document et dernier élément du fil d'Ariane = NOM de l'entité une fois
// chargée (avant : « Warhammer 40 000 — Codex Numérique » partout, et « Sm Calgar » / « War In
// Heaven » dans le fil) ; « Unité introuvable » pour un identifiant inconnu ; changement de page
// annoncé dans une région live. Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import type { Browser, Page } from 'playwright-core';

const FRONTEND = resolve(__dirname, '../../../..');
const SEED = resolve(FRONTEND, '../backend/seed');
const DIST = join(FRONTEND, 'dist/frontend/browser');
const SOURCE = 'src/app/core/services/page-title.service.ts';
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const built = existsSync(join(DIST, 'index.html'));
const stale = built && statSync(join(FRONTEND, SOURCE)).mtimeMs > statSync(join(DIST, 'index.html')).mtimeMs;
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}
const seed = (f: string) => JSON.parse(readFileSync(join(SEED, f), 'utf8')) as { id: string }[];

describe.skipIf(!built || !chromium)('titre de page et fil d’Ariane = nom de l’entité (navigateur, dist) — L36', () => {
  let server: Server;
  let browser: Browser;
  let base: string;
  beforeAll(async () => {
    const collections: Record<string, { id: string }[]> = {
      units: seed('units.json'),
      factions: seed('factions.json'),
      'timeline-events': seed('timeline-events.json'),
    };
    server = createServer((req, res) => {
      const path = normalize(decodeURIComponent(new URL(req.url!, 'http://x').pathname));
      if (path.startsWith('/api/')) {
        const m = /^\/api\/(units|factions|timeline-events)\/([^/]+)$/.exec(path);
        const body = m ? collections[m[1]].find((x) => x.id === m[2]) : path.startsWith('/api/demo') || path.startsWith('/api/wiki') ? {} : [];
        res.writeHead(body ? 200 : 404, { 'content-type': 'application/json' }).end(JSON.stringify(body ?? { statusCode: 404 }));
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

  const current = (page: Page) => page.locator('app-breadcrumb nav[aria-label="Fil d\'Ariane"] ol > li [aria-current="page"]');

  for (const [url, name, h] of [
    ['/units/sm-calgar', 'Marneus Calgar, Seigneur des Ultramarines', 'h1'],
    ['/lore/timeline/war-in-heaven', 'La Guerre dans le Ciel', 'h1'],
  ] as const) {
    it(`${url} : titre « ${name} — Warhammer 40 000 », dernier élément du fil = « ${name} »`, async () => {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(base + url);
      await page.locator(`main ${h}`).first().waitFor();
      await expect.poll(() => page.title()).toBe(`${name} — Warhammer 40 000`);
      await expect.poll(() => current(page).textContent()).toBe(name);
      expect(await current(page).count()).toBe(1);
      expect(await page.title()).not.toContain('Codex Numérique');
      await page.close();
    });
  }

  it('identifiant inconnu : « Unité introuvable — Warhammer 40 000 »', async () => {
    const page = await browser.newPage();
    await page.goto(`${base}/units/une-unite-inconnue`);
    await expect.poll(() => page.title()).toBe('Unité introuvable — Warhammer 40 000');
    await page.close();
  });

  it('navigation dans l’application : titre et annonce de la page d’arrivée, rien au premier chargement', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/units/sm-calgar`);
    await expect.poll(() => page.title()).toBe('Marneus Calgar, Seigneur des Ultramarines — Warhammer 40 000');
    const live = page.locator('[aria-live="polite"]');
    expect((await live.textContent())!.trim()).toBe('');
    await page.locator('app-breadcrumb a.bc-link', { hasText: 'Accueil' }).click();
    await expect.poll(() => page.title()).toBe('Accueil — Warhammer 40 000');
    await expect.poll(async () => (await live.textContent())!.trim()).toBe('Accueil');
    await page.close();
  });
});
