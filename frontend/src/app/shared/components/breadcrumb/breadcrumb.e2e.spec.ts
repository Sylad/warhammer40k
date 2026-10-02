// @vitest-environment node
// L39 (revue UX) — liens du fil d'Ariane distingués AUTREMENT que par la couleur (WCAG 1.4.1) :
// soulignés au repos ; au survol / focus, ni la couleur ni l'aspect de l'élément courant.
// Hauteur du fil inchangée à 1440, 390 et 320 px (comparée à la même page sans soulignement). Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import type { Browser } from 'playwright-core';

const FRONTEND = resolve(__dirname, '../../../../..');
const SEED = resolve(FRONTEND, '../backend/seed');
const DIST = join(FRONTEND, 'dist/frontend/browser');
const SOURCE = 'src/app/shared/components/breadcrumb/breadcrumb.component.ts';
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

describe.skipIf(!built || !chromium)('fil d’Ariane : liens soulignés, survol distinct du courant (navigateur, dist) — L39', () => {
  let server: Server;
  let browser: Browser;
  let base: string;
  beforeAll(async () => {
    const units = seed('units.json');
    const factions = seed('factions.json');
    server = createServer((req, res) => {
      const path = normalize(decodeURIComponent(new URL(req.url!, 'http://x').pathname));
      if (path.startsWith('/api/')) {
        const u = /^\/api\/units\/([^/]+)$/.exec(path)?.[1];
        const f = /^\/api\/factions\/([^/]+)$/.exec(path)?.[1];
        const body = u ? units.find((x) => x.id === u) : f ? factions.find((x) => x.id === f) : path.startsWith('/api/demo') || path.startsWith('/api/wiki') ? {} : [];
        res.writeHead(body ? 200 : 404, { 'content-type': 'application/json' }).end(JSON.stringify(body ?? {}));
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

  const style = (e: Element) => {
    const s = getComputedStyle(e);
    return { color: s.color, line: s.textDecorationLine, thick: s.textDecorationThickness, offset: s.textUnderlineOffset };
  };

  for (const [w, h] of [[1440, 900], [390, 844], [320, 700]]) {
    it(`${w} px : lien souligné au repos, survol et focus différents du courant, hauteur du fil inchangée`, async () => {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.goto(`${base}/units/sm-calgar`);
      const link = page.locator('app-breadcrumb a.bc-link').first();
      await link.waitFor();
      const current = await page.locator('app-breadcrumb [aria-current="page"]').evaluate(style);
      const rest = await link.evaluate(style);
      await link.hover();
      const hover = await link.evaluate(style);
      await page.mouse.move(0, h - 1);
      await link.focus();
      const focus = await link.evaluate(style);
      const nav = page.locator('app-breadcrumb nav');
      const navH = await nav.evaluate((n) => n.getBoundingClientRect().height);
      // Même page sans soulignement ni épaississement : la hauteur du fil ne doit pas bouger.
      await page.addStyleTag({ content: 'app-breadcrumb a.bc-link { text-decoration: none !important; }' });
      const plainH = await nav.evaluate((n) => n.getBoundingClientRect().height);
      await page.close();
      expect(rest.line).toBe('underline');
      expect(rest.offset).toBe('3px');
      expect(current.line).toBe('none');
      for (const s of [hover, focus]) {
        expect(s.line).toBe('underline');
        expect(s.color).not.toBe(current.color);
        expect(s.thick).not.toBe(rest.thick);
      }
      expect(navH).toBe(plainH);
    });
  }
});
