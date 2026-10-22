// @vitest-environment node
// L168 (revue UX L11, WCAG 1.4.10) — Panthéon du Chaos au téléphone : avant, la marge fixe de 50 px
// du hero et des en-têtes de dieu, le h2 de 48 px et l'absence de `min-width: 0` rognaient le h1 et
// le chapeau (27 px), le h2 Tzeentch (61 px), la sphère et la citation à 320 px, et le ⛶ se posait
// sur la citation. Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';
import { reflowProbe } from '../../../testing/reflow-probe';

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

describe.skipIf(!built || !chromium)('Panthéon du Chaos, en-têtes au téléphone (navigateur, dist) — L168', () => {
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

  async function open(w: number, h: number): Promise<Page> {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(base + '/lore/chaos-gods');
    await page.locator('.hero h1').waitFor();
    await page.locator('.god-head h2').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    return page;
  }

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  it('R1 — le hero et les quatre en-têtes de dieu tiennent dans leur cadre de 320 à 1440 px : ni rogné, ni débordant, titres sans coupure dans un mot', async () => {
    const problems: string[] = [];
    for (const [w, h] of [[320, 700], [360, 740], [390, 844], [768, 1024], [1440, 900]]) {
      const page = await open(w, h);
      for (const root of ['.hero', '.god-head']) {
        const r = await page.evaluate(reflowProbe, root);
        if (r.scroll > 0) problems.push(`${w} px ${root} : défilement horizontal de ${r.scroll} px`);
        for (const p of [...r.overflow, ...r.clipped, ...r.broken]) problems.push(`${w} px ${root} : ${p}`);
      }
      await page.close();
    }
    expect(problems).toEqual([]);
  }, 60_000);

  it('R2 — au téléphone, le texte du hero et des en-têtes garde 16 px de marge au moins de chaque côté', async () => {
    const problems: string[] = [];
    for (const w of [320, 390]) {
      const page = await open(w, 800);
      const m = await page.evaluate(() => {
        const marges = (cadre: Element, contenu: Element) => {
          const a = cadre.getBoundingClientRect();
          const c = contenu.getBoundingClientRect();
          return [c.left - a.left, a.right - c.right];
        };
        return [
          marges(document.querySelector('.hero')!, document.querySelector('.hero-content')!),
          ...[...document.querySelectorAll('.god-head')].map((h) => marges(h, h.querySelector('.god-head-content')!)),
        ];
      });
      m.forEach(([g, d], i) => { if (g < 16 || d < 16) problems.push(`${w} px bloc ${i} : marges ${Math.round(g)} / ${Math.round(d)} px`); });
      await page.close();
    }
    expect(problems).toEqual([]);
  });

  it('R3 — le ⛶ de l’image ne recouvre ni la citation ni aucun texte de l’en-tête, de 320 à 1440 px', async () => {
    const problems: string[] = [];
    for (const [w, h] of [[320, 700], [390, 844], [768, 1024], [1440, 900]]) {
      const page = await open(w, h);
      const chevauche = await page.evaluate(() => {
        const out: string[] = [];
        document.querySelectorAll('.god-head').forEach((head, i) => {
          const z = head.querySelector('.god-zoom')!.getBoundingClientRect();
          head.querySelectorAll('.god-head-content *').forEach((e) => {
            if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())) return;
            const r = document.createRange();
            r.selectNodeContents(e);
            for (const b of r.getClientRects()) {
              if (b.width > 0 && b.left < z.right && b.right > z.left && b.top < z.bottom && b.bottom > z.top) {
                out.push(`dieu ${i} : ${e.className || e.tagName} sous le ⛶`);
                return;
              }
            }
          });
        });
        return out;
      });
      problems.push(...chevauche.map((c) => `${w} px ${c}`));
      await page.close();
    }
    expect(problems).toEqual([]);
  }, 60_000);

  it('R4 — au bureau, marge de 50 px et h2 de 48 px inchangés (1440 × 900)', async () => {
    const page = await open(1440, 900);
    const m = await page.evaluate(() => {
      const hero = document.querySelector('.hero')!.getBoundingClientRect();
      const c = document.querySelector('.hero-content')!.getBoundingClientRect();
      return { fs: getComputedStyle(document.querySelector('.god-head h2')!).fontSize, left: c.left - hero.left - 1 };
    });
    expect(m.fs).toBe('48px');
    expect(Math.round(m.left)).toBe(50);
    await page.close();
  });
});
