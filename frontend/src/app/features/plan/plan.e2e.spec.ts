// @vitest-environment node
// L30 — page Plan de travail dans un vrai navigateur, sur l'application CONSTRUITE
// (dist/frontend/browser, `ng build`) : liens Nouveautés et Plan de travail atteignables
// depuis l'accueil à 1440, 390 et 320 px ; aucun débordement horizontal à 320 px
// (WCAG 1.4.10) ; contraste du texte ≥ 4,5:1 mesuré ; arrivée sur une ancre.
// jsdom ne calcule aucune mise en page. Chromium via playwright-core (sauté s'il manque).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import type { Browser, Page } from 'playwright-core';

const FRONTEND = resolve(__dirname, '../../../..');
const DIST = join(FRONTEND, 'dist/frontend/browser');
const SOURCES = [
  'src/app/features/plan/plan.component.ts', 'src/app/features/plan/plan.component.scss',
  'src/app/layout/main-layout/main-layout.component.ts', 'src/app/layout/about-menu/about-menu.component.ts', 'src/styles.scss',
];
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

const today = new Date();
const day = (offset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** Plan d'essai : titres longs (retour à la ligne à 320 px), avancement, les trois états. */
const PLAN = {
  version: 1,
  project: 'warhammer40k',
  lots: [
    { id: 'L30', title: 'Une page Plan de travail : ce qui se prépare', status: 'doing', started: day(0), tasks: { done: 2, total: 5 } },
    { id: 'L31', title: 'Une fiche faction lisible au téléphone, même sur les écrans les plus étroits', status: 'todo' },
    { id: 'L23', title: 'Une page Nouveautés, et un menu au téléphone', status: 'done', started: day(2), finished: day(1) },
    { id: 'L5', title: 'Une vieille livraison', status: 'done', finished: '2020-01-01' },
  ],
};

describe.skipIf(!built || !chromium)('page Plan de travail (navigateur, dist) — L30', () => {
  let server: Server;
  let browser: Browser;
  let base: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const path = normalize(decodeURIComponent(new URL(req.url!, 'http://x').pathname));
      // API simulée vide : une page dont l'API répond en erreur interrompt la détection de
      // changements de toute l'application (défaut antérieur, signalé), et avec elle la barre.
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

  async function open(width: number, path: string, plan: unknown = PLAN): Promise<Page> {
    const page = await browser.newPage({ viewport: { width, height: width >= 1280 ? 900 : 844 } });
    if (plan) await page.route('**/plan-data/plan.json', (r) => r.fulfill({ json: plan }));
    await page.goto(`${base}${path}`);
    return page;
  }

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale, 'dist plus ancien que la page ou la barre : relancer ng build').toBe(false);
  });

  it('1440 px, depuis l’accueil : « À propos ▾ » montre Nouveautés et Plan de travail ; le lien mène à la page (focus sur le h1 non requis : clic souris)', async () => {
    const page = await open(1440, '/');
    const toggle = page.locator('nav.nav button.about-toggle');
    await toggle.waitFor({ state: 'visible' }); // Angular rend après `load` : sous charge, isVisible() immédiat tombait à faux
    expect(await page.locator('#menu-a-propos').isVisible()).toBe(false);
    await toggle.click();
    await page.waitForSelector('button.about-toggle[aria-expanded="true"]'); // détection regroupée : image suivante
    for (const href of ['/nouveautes', '/plan', '/about']) expect(await page.locator(`#menu-a-propos a[href="${href}"]`).isVisible()).toBe(true);
    await page.locator('#menu-a-propos a[href="/plan"]').click();
    await page.waitForSelector('li.plan-lot');
    expect(new URL(page.url()).pathname).toBe('/plan');
    await page.waitForSelector('button.about-toggle.active[aria-expanded="false"]');
    await page.close();
  });

  it.each([1440, 390, 320])('%i px, depuis l’accueil : pied de page « Nouveautés · Plan de travail · À propos », cibles ≥ 44 px dans la largeur', async (width) => {
    const page = await open(width, '/');
    for (const href of ['/nouveautes', '/plan', '/about']) {
      const a = page.locator(`footer nav.legal-nav a[href="${href}"]`);
      await a.scrollIntoViewIfNeeded();
      expect(await a.isVisible()).toBe(true);
      const box = (await a.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    // Chaque ligne du pied commence et finit par un lien (aucun séparateur orphelin).
    const rows = await page.evaluate(() => [...document.querySelectorAll('footer nav.legal-nav > *')].map((e) => ({ tag: e.tagName, top: Math.round(e.getBoundingClientRect().top) })));
    for (const top of new Set(rows.map((r) => r.top))) {
      const line = rows.filter((r) => r.top === top);
      expect(line[0].tag).toBe('A');
      expect(line[line.length - 1].tag).toBe('A');
    }
    await page.locator('footer nav.legal-nav a[href="/plan"]').click();
    await page.waitForSelector('li.plan-lot');
    await page.close();
  });

  it.each([390, 320])('%i px, depuis l’accueil : bouton Menu → Nouveautés et Plan de travail dans le tiroir ; le lien mène à la page', async (width) => {
    const page = await open(width, '/');
    expect(await page.locator('nav.nav').isVisible()).toBe(false);
    await page.locator('button.menu-toggle').click();
    // Fin de l'animation d'ouverture du tiroir (0,2 s) avant de mesurer.
    await page.waitForFunction(() => getComputedStyle(document.getElementById('menu-telephone')!).transform === 'none');
    for (const href of ['/nouveautes', '/plan']) {
      const a = page.locator(`#menu-telephone a[href="${href}"]`);
      expect(await a.isVisible()).toBe(true);
      const box = (await a.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await page.locator('#menu-telephone a[href="/plan"]').click();
    await page.waitForSelector('li.plan-lot');
    expect(new URL(page.url()).pathname).toBe('/plan');
    await page.close();
  });

  it.each([320, 390, 1440])('%i px : aucun débordement horizontal, cartes dans la largeur, ligne état + date sans « · »', async (width) => {
    const page = await open(width, '/plan');
    await page.waitForSelector('li.plan-lot');
    const m = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth - innerWidth,
      cards: [...document.querySelectorAll<HTMLElement>('li.plan-lot, .plan-box')].map((c) => {
        const r = c.getBoundingClientRect();
        return { left: r.left, right: r.right, inner: c.scrollWidth - c.clientWidth };
      }),
      metas: [...document.querySelectorAll('.plan-meta')].map((p) => p.textContent ?? ''),
    }));
    await page.close();
    expect(m.page).toBeLessThanOrEqual(0);
    for (const c of m.cards) {
      expect(c.left).toBeGreaterThanOrEqual(0);
      expect(c.right).toBeLessThanOrEqual(width);
      expect(c.inner).toBeLessThanOrEqual(0);
    }
    for (const t of m.metas) expect(t).not.toContain('·');
  });

  it.each([320, 1440])('%i px : contraste de chaque texte de la page ≥ 4,5:1 (mesuré sur les couleurs calculées)', async (width) => {
    const page = await open(width, '/plan');
    await page.waitForSelector('li.plan-lot');
    const low = await page.evaluate(() => {
      const parse = (c: string) => {
        const n = c.match(/[\d.]+/g)!.map(Number);
        return { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 };
      };
      const lum = ({ r, g, b }: { r: number; g: number; b: number }) => {
        const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const over = (top: { r: number; g: number; b: number; a: number }, under: { r: number; g: number; b: number }) => ({
        r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a),
      });
      /** Fond effectif : empilement des fonds des ancêtres, de la racine vers l'élément. */
      const background = (el: Element) => {
        const chain: Element[] = [];
        for (let e: Element | null = el; e; e = e.parentElement) chain.unshift(e);
        let bg = { r: 5, g: 4, b: 3 }; // --bg
        for (const e of chain) {
          const c = parse(getComputedStyle(e).backgroundColor);
          if (c.a > 0) bg = over(c, bg);
        }
        return bg;
      };
      const out: string[] = [];
      const els = document.querySelectorAll<HTMLElement>('.plan *, footer .legal-nav *');
      for (const el of els) {
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim());
        if (!own || el.closest('.sr-only')) continue;
        const style = getComputedStyle(el);
        const fg = over(parse(style.color), background(el));
        const [l1, l2] = [lum(fg), lum(background(el))].sort((a, b) => b - a);
        const ratio = (l1 + 0.05) / (l2 + 0.05);
        if (ratio < 4.5) out.push(`${el.className || el.tagName} « ${el.textContent!.trim().slice(0, 30)} » ${ratio.toFixed(2)}:1`);
      }
      return { out, count: els.length };
    });
    await page.close();
    expect(low.count).toBeGreaterThan(20);
    expect(low.out).toEqual([]);
  });

  it('arrivée sur /plan#L23 (plan simulé, dates relatives : indépendant du jour) : la carte visée reçoit le focus et est à l’écran', async () => {
    const page = await open(390, '/plan#L23');
    await page.waitForSelector('li.plan-lot.is-target');
    const m = await page.evaluate(() => {
      const el = document.getElementById('L23')!;
      const r = el.getBoundingClientRect();
      return { focused: document.activeElement === el, top: r.top, inView: r.top >= 0 && r.top < innerHeight };
    });
    await page.close();
    expect(m.focused).toBe(true);
    expect(m.inView).toBe(true);
    expect(m.top).toBeGreaterThanOrEqual(70); // pas sous la barre collante
  });
});
