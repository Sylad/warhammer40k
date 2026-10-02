// @vitest-environment node
// L23, L30 (option b) — barre du haut dans un vrai navigateur, sur l'application CONSTRUITE
// (dist/frontend/browser, `ng build`), pastille la plus large (« 9+ »). Seuils en em : tiroir
// sous 80em, barre compacte sous 106,25em, complète au-delà. Mesurés à chaque seuil ±1 px
// dans quatre configurations : polices web chargées ; polices web bloquées (repli) ; taille
// de police par défaut du navigateur 18 px et 20 px (CDP Page.setFontSizes).
// jsdom ne calcule aucune mise en page. Chromium via playwright-core (sauté s'il manque).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import type { Browser, Page } from 'playwright-core';

const FRONTEND = resolve(__dirname, '../../../..');
const DIST = join(FRONTEND, 'dist/frontend/browser');
const SOURCES = [
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

/** Douze nouveautés plus récentes que la dernière visite → pastille « 9+ ». */
const NEWS = {
  project: 'warhammer40k', generated: '',
  entries: Array.from({ length: 12 }, (_, i) => ({
    slug: `n${i}`, title: `N${i}`, date: '2026-10-01', lots: [], captures: [], html: '',
  })),
};

export interface Config {
  name: string;
  /** Taille de police par défaut du navigateur (px) : 1em des requêtes média. */
  fontSize: number;
  webFonts: boolean;
}
export const CONFIGS: Config[] = [
  { name: 'polices web', fontSize: 16, webFonts: true },
  { name: 'polices web bloquées', fontSize: 16, webFonts: false },
  { name: 'police par défaut 18 px', fontSize: 18, webFonts: true },
  { name: 'police par défaut 20 px', fontSize: 20, webFonts: true },
];
const DRAWER_EM = 80;
const FULL_EM = 106.25;

/** Seuils ±1 px dans le px de la configuration (un seuil fractionnaire : les deux px qui l'encadrent). */
function widths(fontSize: number): number[] {
  return [DRAWER_EM, FULL_EM].flatMap((em) => {
    const px = em * fontSize;
    return Number.isInteger(px) ? [px - 1, px] : [Math.floor(px), Math.ceil(px)];
  });
}

/** Mesures de la barre : débordement, marge logo → premier élément, bouton de recherche. */
export async function measureBar(page: Page) {
  return page.evaluate(() => {
    const box = (e: Element) => e.getBoundingClientRect();
    const visible = (e: Element | null) => !!e && getComputedStyle(e).display !== 'none' && box(e).width > 0;
    const bar = document.querySelector<HTMLElement>('.topbar')!;
    const nav = document.querySelector('nav.nav');
    const navOn = visible(nav);
    const first = navOn
      ? document.querySelector('nav.nav > a')!
      : document.querySelector('.topbar-actions')!;
    const search = box(document.querySelector('.nav-search-btn')!);
    const items = navOn ? [...document.querySelectorAll('nav.nav > a, .nav-dropdown > a, .about-toggle')] : [];
    return {
      mode: !navOn ? 'tiroir' : visible(document.querySelector('.brand-sub')) ? 'complète' : 'compacte',
      overflow: bar.scrollWidth - bar.clientWidth,
      page: document.documentElement.scrollWidth - innerWidth,
      slack: Math.round((box(first).left - box(document.querySelector('.brand')!).right) * 10) / 10,
      searchOn: search.left >= 0 && search.right <= innerWidth,
      searchToEdge: Math.round(innerWidth - search.right),
      tallest: Math.max(0, ...items.map((a) => box(a).height)),
      badge: (navOn ? document.querySelector('.about-toggle .news-badge') : document.querySelector('.menu-toggle .news-badge'))?.textContent?.trim(),
      menuOn: visible(document.querySelector('.menu-toggle')),
    };
  });
}

describe.skipIf(!built || !chromium)('barre du haut, seuils en em ±1 px, pastille « 9+ » (navigateur, dist) — L23, L30', () => {
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

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale, 'dist plus ancien que la barre : relancer ng build').toBe(false);
  });

  for (const cfg of CONFIGS) {
    it.each(widths(cfg.fontSize))(`${cfg.name} — %i px : mode attendu, aucun débordement, ≥ 16 px après le logo, recherche entière à l’écran`, async (width) => {
      const page = await browser.newPage({ viewport: { width, height: 800 } });
      if (cfg.fontSize !== 16) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Page.setFontSizes', { fontSizes: { standard: cfg.fontSize } });
      }
      if (!cfg.webFonts) await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
      await page.addInitScript(() => localStorage.setItem('wh40k.news.seen-v1', JSON.stringify({ date: '2026-09-01', slugs: [] })));
      await page.route('**/nouveautes-data/nouveautes.json', (r) => r.fulfill({ json: NEWS }));
      await page.goto(`${base}/about`);
      await page.waitForSelector('.news-badge', { state: 'attached' });
      const fonts = await page.evaluate(async () => {
        await document.fonts.ready;
        return document.fonts.check('700 16px Cinzel');
      });
      expect(fonts, 'Cinzel chargée seulement avec les polices web').toBe(cfg.webFonts);
      const m = await measureBar(page);
      await page.close();
      const em = width / cfg.fontSize;
      expect(m.mode).toBe(em < DRAWER_EM ? 'tiroir' : em < FULL_EM ? 'compacte' : 'complète');
      expect(m.badge).toBe('9+');
      expect(m.overflow).toBeLessThanOrEqual(0);
      expect(m.page).toBeLessThanOrEqual(0);
      expect(m.slack).toBeGreaterThanOrEqual(16);
      expect(m.searchOn).toBe(true);
      if (m.mode !== 'tiroir') expect(m.tallest).toBeLessThan(40 * (cfg.fontSize / 16)); // chaque lien sur une ligne
    });
  }

  it('« À propos ▾ » au clavier (1440 px) : Entrée ouvre (focus sur le bouton), Tab parcourt les trois liens, Échap ferme et rend le focus ; sortir par Tab ferme', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/about`);
    await page.waitForSelector('button.about-toggle');
    const active = () => page.evaluate(() => (document.activeElement as HTMLElement).getAttribute('href') ?? document.activeElement!.className);
    // Détection de changements regroupée (eventCoalescing) : l'attribut suit à l'image suivante.
    const expanded = async () => {
      await page.waitForTimeout(50);
      return page.getAttribute('button.about-toggle', 'aria-expanded');
    };
    await page.focus('button.about-toggle');
    await page.keyboard.press('Enter');
    expect(await expanded()).toBe('true');
    expect(await active()).toContain('about-toggle');
    const order: string[] = [];
    for (let i = 0; i < 3; i++) { await page.keyboard.press('Tab'); order.push(await active()); }
    expect(order).toEqual(['/nouveautes', '/plan', '/about']);
    await page.keyboard.press('Escape');
    expect(await expanded()).toBe('false');
    expect(await active()).toContain('about-toggle');
    await page.keyboard.press('Space');
    expect(await expanded()).toBe('true');
    for (let i = 0; i < 4; i++) await page.keyboard.press('Tab'); // au-delà du dernier lien
    expect(await expanded()).toBe('false');
    await page.close();
  });

  it('« À propos ▾ » au clavier (1440 px) : Entrée sur « Plan de travail » → focus sur le h1 de la page, pas sur BODY', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/about`);
    await page.waitForSelector('button.about-toggle');
    await page.focus('button.about-toggle');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#menu-a-propos:not([hidden])');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.pathname === '/plan' && document.activeElement?.tagName === 'H1', null, { timeout: 5000 });
    expect(await page.evaluate(() => document.activeElement!.textContent!.trim())).toBe('Ce qui se prépare');
    await page.close();
  });

  it('1440 px : « À propos ▾ » et le méga-menu Lore jamais visibles ensemble (souris et clavier)', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/about`);
    await page.waitForSelector('button.about-toggle');
    const both = () => page.evaluate(() => ({
      about: !(document.getElementById('menu-a-propos') as HTMLElement).hidden,
      lore: getComputedStyle(document.querySelector('.mega-menu')!).display !== 'none',
    }));
    await page.click('button.about-toggle');
    await page.waitForSelector('#menu-a-propos:not([hidden])');
    await page.hover('.nav-dropdown > a');
    await page.waitForTimeout(80);
    expect(await both()).toEqual({ about: false, lore: true });
    // Pointeur resté sur Lore, « À propos » ouvert au clavier : Lore se masque.
    await page.focus('button.about-toggle');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#menu-a-propos:not([hidden])');
    await page.waitForTimeout(80);
    expect(await both()).toEqual({ about: true, lore: false });
    // Focus clavier sur Lore : « À propos » se referme.
    await page.focus('.nav-dropdown > a');
    await page.waitForTimeout(80);
    expect((await both()).about).toBe(false);
    await page.close();
  });
});
