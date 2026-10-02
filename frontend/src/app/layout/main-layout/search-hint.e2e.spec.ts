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
});
