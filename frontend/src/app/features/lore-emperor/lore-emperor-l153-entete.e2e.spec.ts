// @vitest-environment node
// L153 (revue UX L9, WCAG 1.4.10 et 1.4.3) — en-tête du Lore de l'Empereur au téléphone : avant, sa
// marge fixe de 60 px, son titre sans mesure et son bloc sans `min-width: 0` rognaient le texte de
// ~70 px à 320 px et le collaient au bord droit à 390 px ; le sous-titre n'avait que 4,29:1 sur
// l'image à 390 px. Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';
import { reflowProbe } from '../../../testing/reflow-probe';

const { built, stale } = distState([
  'src/app/features/lore-emperor/lore-emperor.component.scss',
  'src/app/features/lore-emperor/lore-emperor.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

// Pire image possible pour la lisibilité : un aplat blanc (le proxy du wiki peut renvoyer n'importe quoi).
const WHITE = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#fff"/></svg>').toString('base64');

const luminance = (rgb: number[]) => {
  const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

describe.skipIf(!built || !chromium)('Lore Empereur, en-tête au téléphone (navigateur, dist) — L153', () => {
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

  async function open(w: number, h: number, withImage: boolean): Promise<Page> {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    if (withImage) await page.route('**/api/wiki-image*', (r) => r.fulfill({ json: { imageUrl: WHITE } }));
    await page.goto(base + '/lore/emperor');
    await page.locator('.hero h1').waitFor();
    await page.evaluate(() => document.fonts.ready);
    return page;
  }

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  it('R1 — le texte de l’en-tête tient dans le bandeau de 320 à 1440 px : ni rogné, ni débordant, titre sans coupure dans un mot', async () => {
    const problems: string[] = [];
    for (const [w, h] of [[320, 700], [360, 740], [390, 844], [768, 1024], [1440, 900]]) {
      const page = await open(w, h, false);
      const r = await page.evaluate(reflowProbe, '.hero');
      if (r.scroll > 0) problems.push(`${w} px : défilement horizontal de ${r.scroll} px`);
      for (const p of [...r.overflow, ...r.clipped, ...r.broken]) problems.push(`${w} px : ${p}`);
      await page.close();
    }
    expect(problems).toEqual([]);
  }, 60_000);

  it('R2 — au téléphone, le texte garde une marge d’au moins 16 px de chaque côté dans le bandeau', async () => {
    const problems: string[] = [];
    for (const w of [320, 360, 390]) {
      const page = await open(w, 800, false);
      const m = await page.evaluate(() => {
        const hero = document.querySelector('.hero')!.getBoundingClientRect();
        const c = document.querySelector('.hero-content')!.getBoundingClientRect();
        return { left: c.left - hero.left, right: hero.right - c.right };
      });
      if (m.left < 16 || m.right < 16) problems.push(`${w} px : marges ${Math.round(m.left)} / ${Math.round(m.right)} px`);
      await page.close();
    }
    expect(problems).toEqual([]);
  });

  it('R3 — au bureau, titre de 64 px et marge de 60 px inchangés (1440 × 900)', async () => {
    const page = await open(1440, 900, false);
    const m = await page.evaluate(() => {
      const hero = document.querySelector('.hero')!.getBoundingClientRect();
      const c = document.querySelector('.hero-content')!.getBoundingClientRect();
      return { fs: getComputedStyle(document.querySelector('.hero h1')!).fontSize, left: c.left - hero.left - 1 };
    });
    expect(m.fs).toBe('64px');
    expect(Math.round(m.left)).toBe(60);
    await page.close();
  });

  it('R4 — le sous-titre garde 4,5:1 au moins sur l’image la plus claire possible, à 390 px et à 1440 px', async () => {
    const problems: string[] = [];
    for (const [w, h] of [[390, 844], [1440, 900]]) {
      const page = await open(w, h, true);
      const sub = page.locator('.hero .subtitle');
      const color = await sub.evaluate((e) => getComputedStyle(e).color);
      await sub.evaluate((e) => { (e as HTMLElement).style.color = 'transparent'; (e as HTMLElement).style.textShadow = 'none'; });
      const png = (await sub.screenshot()).toString('base64');
      const lum = await page.evaluate(async (b64) => {
        const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
        const c = new OffscreenCanvas(bmp.width, bmp.height);
        const ctx = c.getContext('2d')!;
        ctx.drawImage(bmp, 0, 0);
        const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
        let best = 0;
        for (let i = 0; i < d.length; i += 4) {
          const l = [d[i], d[i + 1], d[i + 2]].map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
          best = Math.max(best, 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]);
        }
        return best;
      }, png);
      const fg = luminance(color.match(/\d+/g)!.slice(0, 3).map(Number));
      const ratio = (fg + 0.05) / (lum + 0.05);
      if (ratio < 4.5) problems.push(`${w} px : contraste ${ratio.toFixed(2)}:1`);
      await page.close();
    }
    expect(problems).toEqual([]);
  });
});
