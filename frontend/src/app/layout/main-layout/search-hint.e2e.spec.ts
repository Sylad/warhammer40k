// @vitest-environment node
// L33 — indication du raccourci dans le bouton de recherche : « Ctrl K » hors Mac (Chromium sous
// Linux ici ; avant : « ⌘K »), et contraste ≥ 4,5:1 MESURÉ SUR LES PIXELS RENDUS (avant : or à 70 %
// d'opacité, 4,05:1 relevé en revue, 4,48:1 au pixel le plus contrasté). Navigateur réel, dist.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState(['src/app/layout/main-layout/main-layout.component.ts']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

describe.skipIf(!built || !chromium)('bouton de recherche : raccourci de la plateforme, indication lisible (navigateur, dist) — L33', () => {
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

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  it('1440 px, hors Mac : « Ctrl K » affiché, nom « Rechercher (Ctrl+K) », contraste rendu ≥ 4,5:1', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 300 }, deviceScaleFactor: 4 });
    await page.goto(`${base}/about`);
    const hint = page.locator('button.nav-search-btn .nav-search-kbd');
    await hint.waitFor();
    await page.evaluate(() => document.fonts.ready);
    expect((await hint.textContent())!.trim()).toBe('Ctrl K');
    expect(await page.locator('button.nav-search-btn').getAttribute('aria-label')).toBe('Rechercher (Ctrl+K)');
    // Fond = couleur la plus fréquente de la capture ; texte = pixel le plus éloigné en luminance.
    const png = (await hint.screenshot()).toString('base64');
    const ratio = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const lum = (r: number, g: number, b: number) => {
        const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const counts = new Map<number, number>();
      for (let i = 0; i < d.length; i += 4) {
        const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      const bgKey = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const bg = lum(bgKey >> 16, (bgKey >> 8) & 255, bgKey & 255);
      let text = bg;
      for (let i = 0; i < d.length; i += 4) {
        const l = lum(d[i], d[i + 1], d[i + 2]);
        if (Math.abs(l - bg) > Math.abs(text - bg)) text = l;
      }
      return (Math.max(text, bg) + 0.05) / (Math.min(text, bg) + 0.05);
    }, png);
    await page.close();
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  // Relecture : « Ctrl K » (plus large que « ⌘K ») faisait défiler la page de 421 à 435 px (barre
  // à 437 px de contenu pour 421 px de large) : l'indication ne se masquait qu'à 26,25em (420 px).
  // Avec la pastille (« ☰ Menu 9+ » au-delà de 26,25em), le défilement allait jusqu'à 465 px, et
  // jusqu'à 454 px sur Mac. Balayage px par px, avec et sans pastille, dans les configurations de la
  // barre du haut (topbar.e2e.spec.ts) et sur Mac. Police par défaut 18 / 20 px : à partir de 400 px
  // seulement — en dessous, « ⚜ WARHAMMER 40,000 » + « ☰ Menu » déborde déjà sans l'indication
  // (défaut antérieur, hors L33, signalé à part).
  const MAC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
  const CONFIGS = [
    { name: 'polices web', fontSize: 16, webFonts: true, mac: false, from: 320 },
    { name: 'polices web bloquées', fontSize: 16, webFonts: false, mac: false, from: 320 },
    { name: 'police par défaut 18 px', fontSize: 18, webFonts: true, mac: false, from: 400 },
    { name: 'police par défaut 20 px', fontSize: 20, webFonts: true, mac: false, from: 400 },
    { name: 'Mac (« ⌘K »)', fontSize: 16, webFonts: true, mac: true, from: 320 },
  ];
  const news = (n: number) => ({
    project: 'warhammer40k', generated: '',
    entries: Array.from({ length: n }, (_, i) => ({ slug: `n${i}`, title: `N${i}`, date: '2026-10-01', lots: [], captures: [], html: '' })),
  });
  for (const cfg of CONFIGS) {
    for (const badge of [true, false]) {
      it(`${cfg.name}, ${badge ? 'pastille « 9+ »' : 'sans pastille'} — de ${cfg.from} à 1800 px, chaque largeur : aucun défilement horizontal, recherche entière à l’écran`, async () => {
        const context = await browser.newContext({ viewport: { width: cfg.from, height: 600 }, ...(cfg.mac ? { userAgent: MAC_UA } : {}) });
        const page = await context.newPage();
        if (cfg.fontSize !== 16) {
          const cdp = await context.newCDPSession(page);
          await cdp.send('Page.setFontSizes', { fontSizes: { standard: cfg.fontSize } });
        }
        if (!cfg.webFonts) await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
        await page.addInitScript(() => localStorage.setItem('wh40k.news.seen-v1', JSON.stringify({ date: '2026-09-01', slugs: [] })));
        await page.route('**/nouveautes-data/nouveautes.json', (r) => r.fulfill({ json: news(badge ? 12 : 0) }));
        await page.goto(`${base}/about`);
        await page.waitForSelector('.nav-search-kbd', { state: 'attached' });
        await page.evaluate(() => document.fonts.ready);
        expect((await page.locator('.nav-search-kbd').textContent())!.trim()).toBe(cfg.mac ? '⌘K' : 'Ctrl K');
        expect(await page.locator('.menu-toggle .news-badge').count()).toBe(badge ? 1 : 0);
        const bad: string[] = [];
        for (let width = cfg.from; width <= 1800; width++) {
          await page.setViewportSize({ width, height: 600 });
          const m = await page.evaluate(() => {
            const s = document.querySelector('.nav-search-btn')!.getBoundingClientRect();
            return { scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth, on: s.left >= 0 && s.right <= innerWidth };
          });
          if (m.scroll > 0 || !m.on) bad.push(`${width} px (+${m.scroll})`);
        }
        await context.close();
        expect(bad).toEqual([]);
      }, 180_000);
    }
  }
});
