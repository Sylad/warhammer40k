// @vitest-environment node
// L156 (WCAG 1.4.3, revue UX L10) — contrastes du Lore des Primarques. Mesurés au départ : badges de
// statut sur l'image des cartes (Expurgé 1,13:1, Mort 1,4:1, Daemon-Prince 2,1:1, Disparu 2,6:1),
// numéro 2,1:1, monde natal 3,7:1, « Expurgé » de la fiche 2,05:1, titre de la visionneuse en
// primaryColor sous 3:1 pour 15 fiches sur 20. Navigateur réel, application construite (dist) :
// le rapport se calcule sur les couleurs réellement rendues, fonds semi-transparents composés.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/styles.scss',
  'src/app/features/lore-primarchs/lore-primarchs.component.ts',
  'src/app/features/lore-primarchs/lore-primarchs.component.scss',
  'src/app/features/primarch-detail/primarch-detail.component.ts',
  'src/app/features/primarch-detail/primarch-detail.component.scss',
  'src/app/shared/components/figure-lightbox/figure-lightbox.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}
vi.setConfig({ testTimeout: 300000, hookTimeout: 60000 });
const PRIMARCHS: { id: string; primaryColor?: string; status: string }[] = JSON.parse(
  readFileSync(resolve(__dirname, '../../../../../backend/seed/primarchs.json'), 'utf8'),
);
const SEUIL = 4.5; // WCAG 1.4.3, texte courant

/** Exécutée dans la page : rapport de contraste du texte de chaque nœud visé (fonds composés). */
function contrastes(selector: string): { cible: string; ratio: number; couleur: string; fond: string }[] {
  type Rgba = [number, number, number, number];
  const parse = (c: string): Rgba => {
    const m = c.match(/rgba?\(([^)]+)\)/)!;
    const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return [r, g, b, a];
  };
  const sur = (dessus: Rgba, dessous: Rgba): Rgba => {
    const a = dessus[3] + dessous[3] * (1 - dessus[3]);
    const m = (i: number) => (dessus[i] * dessus[3] + dessous[i] * dessous[3] * (1 - dessus[3])) / (a || 1);
    return [m(0), m(1), m(2), a];
  };
  const lum = ([r, g, b]: Rgba) => {
    const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const fond = (el: Element): Rgba => {
    let acc: Rgba = parse(getComputedStyle(document.body).backgroundColor);
    if (acc[3] < 1) acc = [5, 4, 3, 1];
    const chaine: Element[] = [];
    for (let e: Element | null = el; e; e = e.parentElement) chaine.unshift(e);
    for (const e of chaine) {
      const bg = parse(getComputedStyle(e).backgroundColor);
      if (bg[3] > 0) acc = sur(bg, acc);
    }
    return acc;
  };
  return [...document.querySelectorAll(selector)].map((el) => {
    const f = fond(el);
    const t = sur(parse(getComputedStyle(el).color), f);
    const [a, b] = [lum(t), lum(f)].sort((x, y) => y - x);
    return {
      cible: `${el.className || el.tagName}« ${(el.textContent ?? '').trim().slice(0, 24)} »`,
      ratio: Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100,
      couleur: getComputedStyle(el).color,
      fond: `rgb(${f.slice(0, 3).map(Math.round)})`,
    };
  });
}

async function sousSeuil(page: Page, selector: string, contexte: string): Promise<string[]> {
  const mesures = await page.evaluate(contrastes, selector);
  expect(mesures.length, `${contexte} : « ${selector} » introuvable`).toBeGreaterThan(0);
  return mesures.filter((m) => m.ratio < SEUIL).map((m) => `${contexte} ${m.cible} ${m.ratio}:1 (${m.couleur} sur ${m.fond})`);
}

describe.skipIf(!built || !chromium)('Lore Primarques : contrastes (navigateur, dist) — L156', () => {
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

  it('R1 — la liste : statut, numéro et monde natal de chacune des 20 cartes à 4,5:1 au moins', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/lore/primarchs`);
    await page.locator('article.card').first().waitFor();
    expect(await page.locator('article.card').count()).toBe(20);
    const problems = [
      ...(await sousSeuil(page, '.card-img .status', 'liste')),
      ...(await sousSeuil(page, '.card-img .number', 'liste')),
      ...(await sousSeuil(page, '.card .stat.homeworld', 'liste')),
    ];
    await page.close();
    expect(problems).toEqual([]);
  });

  it('R2 — la liste : les badges de statut et le numéro ont un fond plein (rien de l’image ne passe dessous)', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/lore/primarchs`);
    await page.locator('article.card').first().waitFor();
    const alphas = await page.evaluate(() =>
      [...document.querySelectorAll('.card-img .status, .card-img .number')].map((e) => {
        const c = getComputedStyle(e).backgroundColor;
        const a = c.match(/rgba?\(([^)]+)\)/)![1].split(/[ ,/]+/).filter(Boolean).map(Number)[3];
        return a === undefined ? 1 : a;
      }),
    );
    await page.close();
    expect(alphas.length).toBe(40);
    expect(alphas.filter((a) => a < 1)).toEqual([]);
  });

  it('R3 — les 20 fiches : numéro, badges, statut et monde natal à 4,5:1 au moins (1440 et 390 px)', async () => {
    const page = await browser.newPage();
    const problems: string[] = [];
    for (const w of [1440, 390]) {
      await page.setViewportSize({ width: w, height: 900 });
      for (const p of PRIMARCHS) {
        await page.goto(`${base}/lore/primarchs/${p.id}`);
        await page.locator('main .hero h1').waitFor();
        problems.push(...(await sousSeuil(page, '.hero-number, .hero-badges .badge', `${w} px ${p.id}`)));
        problems.push(...(await sousSeuil(page, '.info-row-vert span:not(.ico)', `${w} px ${p.id}`)));
      }
    }
    await page.close();
    expect(problems).toEqual([]);
  });

  it('R4 — la visionneuse des 20 fiches : titre à 4,5:1 au moins, couleur de la légion en filet', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    // l'API bouchonnée ne renvoie aucune image du wiki : la visionneuse ne s'ouvre qu'avec une image
    await page.route('**/api/wiki-image**', (r) =>
      r.fulfill({ json: { imageUrl: 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%2710%27/%3E' } }),
    );
    const problems: string[] = [];
    for (const p of PRIMARCHS) {
      await page.goto(`${base}/lore/primarchs/${p.id}`);
      await page.locator('.hero-portrait').click();
      await page.locator('.lightbox-title').waitFor();
      problems.push(...(await sousSeuil(page, '.lightbox-title', p.id)));
      const filet = await page.locator('.lightbox-title').evaluate((e) => {
        const s = getComputedStyle(e);
        return { couleur: s.borderLeftColor, epaisseur: s.borderLeftWidth };
      });
      const attendu = await page.evaluate((c) => {
        const d = document.createElement('i');
        d.style.color = c;
        document.body.appendChild(d);
        const v = getComputedStyle(d).color;
        d.remove();
        return v;
      }, p.primaryColor || '#c9a24a');
      if (filet.couleur !== attendu || parseFloat(filet.epaisseur) < 3) {
        problems.push(`${p.id} : filet ${filet.epaisseur} ${filet.couleur}, attendu ≥ 3px ${attendu}`);
      }
      await page.keyboard.press('Escape');
    }
    await page.close();
    expect(problems).toEqual([]);
  });
});
