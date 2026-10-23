// @vitest-environment node
// L176 — Panthéon du Chaos : le numéro « I / IV » … « IV / IV » de chaque dieu reste à 4,5:1 au moins au repos, au
// survol et au focus de l'image d'en-tête (l'opacité de l'image passait de 0,32 à 0,5 : 3,49:1 à 320 px). Mesuré au
// rendu réel : on capture l'en-tête, texte du numéro rendu transparent, et on prend le pixel le plus clair sous lui.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/app/features/lore-chaos-gods/lore-chaos-gods.component.scss',
  'src/app/features/lore-chaos-gods/lore-chaos-gods.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

type Etat = 'repos' | 'survol' | 'focus';

describe.skipIf(!built || !chromium)('Panthéon du Chaos, numéros au survol et au focus (navigateur, dist) — L176', () => {
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

  /** Pire contraste (pixel le plus clair sous le numéro) du numéro de l'article `i`, dans l'état demandé. */
  async function pire(page: Page, i: number, etat: Etat): Promise<{ ratio: number; couleur: string }> {
    const tete = page.locator('.god-head').nth(i);
    await tete.scrollIntoViewIfNeeded();
    const bg = tete.locator('.god-bg');
    if (etat === 'survol') {
      // un point de l'image que le contenu de l'en-tête ne recouvre pas : le coin haut droit
      const r = (await tete.boundingBox())!;
      await page.mouse.move(r.x + r.width - 4, r.y + 4);
    } else {
      await page.mouse.move(0, 0);
    }
    if (etat === 'focus') {
      await page.keyboard.press('Tab');
      await bg.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
    } else {
      await bg.evaluate((el) => (el as HTMLElement).blur());
    }
    const attendu = await bg.evaluate((el, e) => (e === 'survol' ? el.matches(':hover') : e === 'focus' ? el.matches(':focus-visible') : !el.matches(':hover, :focus-visible')), etat);
    expect(attendu, `${etat} atteint`).toBe(true);
    await page.waitForTimeout(500); // transition d'opacité de 0,2 s
    const num = tete.locator('.number');
    const couleur = await num.evaluate((el) => getComputedStyle(el).color);
    await num.evaluate((el) => { (el as HTMLElement).style.setProperty('color', 'transparent', 'important'); });
    const box = (await num.boundingBox())!;
    const png = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
    await num.evaluate((el) => (el as HTMLElement).style.removeProperty('color'));
    const ratio = await page.evaluate(async ({ b64, c }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      const ctx = cv.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      const lum = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      const [tr, tg, tb] = c.match(/\d+/g)!.map(Number);
      const lt = lum(tr, tg, tb);
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let max = 0;
      for (let p = 0; p < d.length; p += 4) max = Math.max(max, lum(d[p], d[p + 1], d[p + 2]));
      return (lt + 0.05) / (max + 0.05);
    }, { b64: png.toString('base64'), c: couleur });
    return { ratio, couleur };
  }

  it('R1 — le numéro de chacun des quatre dieux fait au moins 4,5:1 au repos, au survol et au focus, à 320, 390 et 1440 px', async () => {
    for (const w of [320, 390, 1440]) {
      const page = await browser.newPage({ viewport: { width: w, height: 844 } });
      // Le serveur d'essai ne fournit aucune illustration : on en donne une, entièrement blanche, le pire cas
      // possible (aucune image réelle n'est plus claire), pour que l'opacité de l'image compte vraiment.
      await page.route('**/api/wiki-image**', (r) => r.fulfill({ json: { imageUrl: 'http://images.test/blanc.svg' } }));
      await page.route('http://images.test/**', (r) => r.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#fff"/></svg>',
      }));
      await page.goto(base + '/lore/chaos-gods');
      await page.locator('.god-bg').first().waitFor();
      await page.waitForTimeout(500);
      expect(await page.locator('.god-bg').first().evaluate((el) => getComputedStyle(el).backgroundImage), `${w} px image`).toContain('blanc.svg');
      const n = await page.locator('.god-head').count();
      expect(n).toBe(4);
      for (let i = 0; i < n; i++) {
        for (const etat of ['repos', 'survol', 'focus'] as Etat[]) {
          const m = await pire(page, i, etat);
          expect(m.ratio, `${w} px, dieu ${i + 1}, ${etat}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      await page.close();
    }
  }, 120_000);
});
