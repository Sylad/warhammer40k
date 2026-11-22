// @vitest-environment node
// L98 (revue UX L3, WCAG 1.4.3) — page d'une sous-faction : les libellés du bandeau (« PRIMARQUE », « MONDE
// NATAL »…, 10 px, --muted #8d8678) et leurs valeurs restent ≥ 4,5:1 quelle que soit l'image du wiki posée
// derrière. Avant : 2,8:1 sur l'image des Blood Angels. Navigateur réel, application construite (dist), image
// claire bouchonnée (blanc = pire cas, crème, dégradé clair) ; mesuré sur les pixels rendus, texte rendu
// transparent, comme gallery-voile-cartes-l143.e2e.spec.ts.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/styles.scss',
  'src/app/features/subfaction-detail/subfaction-detail.component.scss',
  'src/app/features/subfaction-detail/subfaction-detail.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

/** Images claires servies à la place du wiki (aucune requête externe). */
const IMAGES: Record<string, string> = {
  blanc: '<rect width="100%" height="100%" fill="#fff"/>',
  creme: '<rect width="100%" height="100%" fill="#f3ead6"/>',
  degrade:
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fb8d8"/>' +
    '<stop offset="1" stop-color="#fffdf5"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>',
};
/** Sous-factions dont le bandeau porte des libellés (primarque, monde natal, fondation…). */
const SUBS = ['blood-angels', 'ultramarines', 'dark-angels'];
/** Sous-factions sans primarque, monde-mère, fondation ni devise (42 sur 182 dans le seed) : pas d'encart du tout. */
const SANS_CHAMP = ['iyanden', 'saim-hann'];
const CIBLES = ['.key-info .ki-label', '.key-info .ki-val'];

async function ouvrir(page: Page, base: string, id: string, image: string): Promise<void> {
  await page.route('**/api/wiki-image**', (r) =>
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ imageUrl: `https://image.test/${image}.svg` }) }),
  );
  await page.route('https://image.test/**', (r) =>
    r.fulfill({
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">${IMAGES[image]}</svg>`,
    }),
  );
  await page.goto(`${base}/subfactions/${id}`);
  await page.locator('main h1').waitFor();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.hero-bg')!).backgroundImage.includes('image.test'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
}

/** Contraste le plus faible de chaque cible : couleur du texte contre le pixel de fond le plus clair de sa boîte. */
async function contrastes(page: Page): Promise<Record<string, number>> {
  const fg = await page.evaluate((sels) => sels.map((s) => getComputedStyle(document.querySelector(s)!).color), CIBLES);
  await page.addStyleTag({ content: '.key-info, .key-info * { color: transparent !important; text-shadow: none !important; }' });
  await page.waitForTimeout(100);
  const out: Record<string, number> = {};
  for (let i = 0; i < CIBLES.length; i++) {
    const n = await page.locator(CIBLES[i]).count();
    let pire = Infinity;
    for (let k = 0; k < n; k++) {
      const buf = await page.locator(CIBLES[i]).nth(k).screenshot();
      const lumMax = await page.evaluate(async ([b64]) => {
        const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
        const cv = document.createElement('canvas');
        cv.width = bmp.width;
        cv.height = bmp.height;
        const ctx = cv.getContext('2d')!;
        ctx.drawImage(bmp, 0, 0);
        const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
        const lum = (c: number[]): number => {
          const l = c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
          return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
        };
        let max = 0;
        for (let p = 0; p < d.length; p += 4) max = Math.max(max, lum([d[p], d[p + 1], d[p + 2]]));
        return max;
      }, [buf.toString('base64')]);
      const rgb = fg[i].match(/\d+/g)!.map(Number);
      const l = rgb.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      pire = Math.min(pire, (0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2] + 0.05) / (lumMax + 0.05));
    }
    out[CIBLES[i]] = pire;
  }
  return out;
}

describe.skipIf(!built || !chromium)('sous-faction — voile sous les libellés du bandeau (navigateur, dist) — L98', () => {
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

  for (const width of [1440, 390]) {
    it(`${width} px : libellés et valeurs du bandeau ≥ 4,5:1 sur image claire (${SUBS.join(', ')})`, async () => {
      const echecs: string[] = [];
      for (const id of SUBS) {
        for (const image of Object.keys(IMAGES)) {
          const page = await browser.newPage({ viewport: { width, height: 900 } });
          await ouvrir(page, base, id, image);
          expect(await page.locator('.key-info .ki-label').count(), `${id} : bandeau sans libellé`).toBeGreaterThan(0);
          for (const [sel, r] of Object.entries(await contrastes(page))) {
            if (r < 4.5) echecs.push(`${id} / ${image} / ${sel} : ${r.toFixed(2)}:1`);
          }
          await page.close();
        }
      }
      expect(echecs).toEqual([]);
    }, 120_000);
  }

  for (const width of [1440, 390]) {
    it(`${width} px : sous-faction sans aucun champ (${SANS_CHAMP.join(', ')}) → aucun encart vide dans le bandeau`, async () => {
      for (const id of SANS_CHAMP) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await ouvrir(page, base, id, 'blanc');
        expect(await page.locator('.hero .key-info').count(), `${id} : encart .key-info rendu sans aucun champ`).toBe(0);
        await page.close();
      }
    }, 60_000);
  }

  it('bureau : le voile reste un encart sous les libellés, le bandeau garde sa hauteur', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await ouvrir(page, base, 'blood-angels', 'blanc');
    const r = await page.evaluate(() => {
      const hero = document.querySelector('.hero')!.getBoundingClientRect();
      const ki = document.querySelector('.key-info')!.getBoundingClientRect();
      return { hero: hero.height, kiW: ki.width, heroW: hero.width };
    });
    expect(r.hero).toBeGreaterThanOrEqual(320);
    expect(r.kiW).toBeLessThan(r.heroW);
    await page.close();
  });
});
