// @vitest-environment node
// L108 — navigateur réel, application construite (dist), données du seed (dist-server) : au bureau, le panneau Filtres
// suit à nouveau le défilement (collant) sans jamais recouvrir « Artistes à découvrir » / « Collections populaires »
// (régression de L49, revue UX du 12-10). Rectangles mesurés après 800 et 1200 px de défilement et en bas de page ;
// chaque bouton de l'aside reste atteignable au clavier, visible et non recouvert. 1024 et 390 px : rien ne se recouvre.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState(['src/styles.scss', 'src/styles/_gallery-filtres.scss', 'src/app/features/gallery/gallery.component.scss', 'src/app/features/gallery/gallery.component.ts']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

type Rect = { top: number; bottom: number; left: number; right: number };
type Mesure = {
  y: number; position: string; filtres: Rect; aside: Rect; panneaux: { titre: string; visible: Rect | null; dessus: boolean }[];
  filtresDessus: boolean; debord: number;
};

/** Mesure dans la page : rectangles, partie visible de chaque panneau de l'aside (coupée par son défilement et la fenêtre), élément au centre. */
function mesurer(): Mesure {
  const box = (e: Element): Rect => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
  const f = document.querySelector('[data-testid="panneau-filtres"]')!;
  const aside = document.querySelector('.sidebar')!;
  const a = box(aside);
  // la barre fixe du site couvre le haut de la fenêtre (scroll-padding-top) : ce qui passe dessous n'est pas « recouvert par les Filtres »
  const barre = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const clip = { top: Math.max(barre, a.top), bottom: Math.min(innerHeight, a.bottom) };
  const panneaux = [...aside.querySelectorAll('.side-panel')].map((p) => {
    const r = box(p);
    const top = Math.max(r.top, clip.top), bottom = Math.min(r.bottom, clip.bottom);
    if (bottom - top < 4) return { titre: p.querySelector('h3')!.textContent!.trim(), visible: null, dessus: true };
    const x = (r.left + r.right) / 2;
    const pts = [top + 2, (top + bottom) / 2, bottom - 2].map((yy) => document.elementFromPoint(x, yy));
    return { titre: p.querySelector('h3')!.textContent!.trim(), visible: { top, bottom, left: r.left, right: r.right }, dessus: pts.every((e) => !!e && p.contains(e)) };
  });
  const fr = box(f);
  const fy = (Math.max(barre, fr.top) + Math.min(innerHeight, fr.bottom)) / 2;
  const fe = document.elementFromPoint((fr.left + fr.right) / 2, fy);
  return {
    y: scrollY, position: getComputedStyle(f).position, filtres: fr, aside: a, panneaux,
    filtresDessus: !!fe && f.contains(fe), debord: document.documentElement.scrollWidth - innerWidth,
  };
}

const intersecte = (a: Rect, b: Rect) => Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5 && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5;

describe.skipIf(!built || !chromium)('galerie — Filtres collant sans recouvrir Artistes / Collections (L108, navigateur, dist)', () => {
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

  async function open(width: number, height: number): Promise<Page> {
    const page = await browser.newPage();
    page.setDefaultTimeout(6000);
    await page.setViewportSize({ width, height });
    await page.goto(base + '/gallery');
    await page.locator('[data-testid="grille-oeuvres"]').waitFor();
    await page.locator('.sidebar .col-row').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    return page;
  }
  async function aller(page: Page, y: number): Promise<Mesure> {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(150);
    return page.evaluate(mesurer);
  }
  function sansRecouvrement(m: Mesure) {
    const s = JSON.stringify(m);
    expect(m.panneaux.length, s).toBe(2);
    for (const p of m.panneaux) {
      if (!p.visible) continue;
      expect(intersecte(p.visible, m.filtres), `${p.titre} recouvre / est recouvert par Filtres : ${s}`).toBe(false);
      expect(p.dessus, `${p.titre} recouvert : ${s}`).toBe(true);
    }
  }

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  for (const [w, h] of [[1440, 900], [1440, 700], [1300, 1000]] as const) {
    for (const y of [800, 1200]) {
      it(`${w}×${h}, ${y} px de défilement : Filtres collant, entièrement visible sous la barre, sans recouvrir Artistes / Collections`, async () => {
        const page = await open(w, h);
        const m = await aller(page, y);
        await page.close();
        const s = JSON.stringify(m);
        expect(m.y, s).toBe(y);
        expect(m.position, s).toBe('sticky');
        expect(m.filtres.top, s).toBeGreaterThanOrEqual(90);
        expect(m.filtres.top, s).toBeLessThanOrEqual(100);
        expect(m.filtres.bottom, s).toBeLessThanOrEqual(h);
        expect(m.filtresDessus, s).toBe(true);
        // l'aside suit aussi, juste sous les Filtres (pas sorti par le haut)
        expect(m.aside.top, s).toBeGreaterThanOrEqual(m.filtres.bottom);
        expect(m.aside.top - m.filtres.bottom, s).toBeLessThanOrEqual(30);
        expect(m.aside.bottom, s).toBeLessThanOrEqual(h);
        sansRecouvrement(m);
      }, 30_000);
    }

    it(`${w}×${h}, bas de page : Filtres et aside remontent ensemble, aucun recouvrement`, async () => {
      const page = await open(w, h);
      const m = await aller(page, 1e6);
      await page.close();
      expect(m.aside.top, JSON.stringify(m)).toBeGreaterThanOrEqual(m.filtres.bottom);
      sansRecouvrement(m);
    }, 30_000);
  }

  it('1440×900, défilement à 1200 px : chaque bouton de l\'aside, atteint au clavier, est visible et non recouvert', async () => {
    const page = await open(1440, 900);
    await aller(page, 1200);
    const n = await page.locator('.sidebar button').count();
    expect(n).toBeGreaterThan(6);
    const fautes: string[] = [];
    for (let i = 0; i < n; i++) {
      await page.locator('.sidebar button').nth(i).focus();
      await page.waitForTimeout(30);
      const r = await page.evaluate((k) => {
        const b = document.querySelectorAll('.sidebar button')[k] as HTMLElement;
        const x = b.getBoundingClientRect();
        const f = document.querySelector('[data-testid="panneau-filtres"]')!.getBoundingClientRect();
        const e = document.elementFromPoint(x.left + x.width / 2, x.top + x.height / 2);
        return { t: b.textContent!.trim().slice(0, 30), top: x.top, bottom: x.bottom, fb: f.bottom, dessus: !!e && b.contains(e), y: scrollY };
      }, i);
      if (r.top < r.fb - 0.5 || r.bottom > 900 + 0.5 || !r.dessus) fautes.push(JSON.stringify(r));
    }
    await page.close();
    expect(fautes).toEqual([]);
  }, 60_000);

  for (const [w, h] of [[1024, 768], [390, 844]] as const) {
    it(`${w}×${h} : Filtres dans le flux (non collant), aside sous la grille, jamais de recouvrement ni de défilement horizontal`, async () => {
      const page = await open(w, h);
      const mesures: Mesure[] = [];
      for (const y of [0, 800, 1200, 1e6]) mesures.push(await aller(page, y));
      await page.close();
      for (const m of mesures) {
        const s = JSON.stringify(m);
        expect(m.position, s).toBe('static');
        expect(m.debord, s).toBeLessThanOrEqual(0);
        if (m.filtres.bottom > m.filtres.top) expect(m.aside.top, s).toBeGreaterThanOrEqual(m.filtres.bottom);
        sansRecouvrement(m);
      }
    }, 30_000);
  }
});
