// @vitest-environment node
// L49 (relecture) — navigateur réel, application construite (dist) : R2 l'aside (Artistes, Collections) reste collant et
// n'est jamais recouvert au défilement (bureau), R12 reflow à 320 px de l'état vide, R6 rappel visible à 390 px dans l'application
// en marche (polices chargées), R8/R9 message et Réessayer dans le premier écran à 1440×900.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page, Route } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState(['src/styles.scss', 'src/styles/_gallery-filtres.scss', 'src/app/features/gallery/gallery.component.scss', 'src/app/features/gallery/gallery.component.ts']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

const FACTIONS = [{ id: 'space-marines', nom: 'Space Marines' }, { id: 'necrons', nom: 'Nécrons' }, { id: 'grey-knights', nom: 'Chevaliers Gris' }];
const ARTWORKS = Array.from({ length: 30 }, (_, i) => ({
  id: `aw-${i + 1}`, title: `Œuvre ${i + 1}`, artist: `Artiste ${(i % 7) + 1}`, image: `img-${i + 1}.jpg`,
  category: i < 9 ? 'Space Marines' : 'Xénos', faction: i < 9 ? 'space-marines' : 'necrons', likes: i + 1,
}));

describe.skipIf(!built || !chromium)('galerie — relecture L49 (navigateur, dist)', () => {
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

  async function open(width: number, height: number, mode: 'ok' | 'chargement' | 'erreur' | 'vide' = 'ok', query = ''): Promise<Page> {
    const page = await browser.newPage();
    page.setDefaultTimeout(6000);
    const json = (r: Route, body: unknown, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname.replace(/\/$/, '');
      if (path === '/api/artworks') {
        if (mode === 'chargement') return new Promise<void>(() => undefined);
        return mode === 'erreur' ? json(route, { statusCode: 500 }, 500) : json(route, ARTWORKS);
      }
      if (path === '/api/factions') return json(route, FACTIONS);
      if (path === '/api/artwork-collections') return json(route, [{ id: 'c', name: 'Collection', description: 'd', count: 8 }]);
      if (path === '/api/artwork-artists') return json(route, [{ id: 'a1', name: 'Artiste 1', artworkCount: 5 }]);
      if (path.startsWith('/api/wiki-image')) return json(route, { imageUrl: null });
      if (path.startsWith('/api/image-meta') || path.startsWith('/api/demo')) return json(route, {});
      return json(route, []);
    });
    await page.setViewportSize({ width, height });
    await page.goto(base + '/gallery' + query);
    await page.locator(mode === 'vide' ? '[data-testid="rappel-vide"]' : mode === 'ok' ? '[data-testid="grille-oeuvres"]' : mode === 'erreur' ? '[data-testid="message-erreur"]' : '[data-testid="message-chargement"]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    return page;
  }

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  it('R2 — 1440 px : après 1200 px de défilement, le panneau Artistes n\'est pas recouvert et son premier bouton est visible', async () => {
    const page = await open(1440, 900);
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(200);
    const m = await page.evaluate(() => {
      const panneau = [...document.querySelectorAll('.sidebar .side-panel')].find((p) => p.querySelector('h3')?.textContent?.includes('Artistes'))!;
      const r = panneau.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const btn = panneau.querySelector('button')!.getBoundingClientRect();
      return { y: window.scrollY, r: { top: r.top, bottom: r.bottom }, dessus: !!top && panneau.contains(top), btn: { top: btn.top, bottom: btn.bottom } };
    });
    await page.close();
    expect(m.y).toBeGreaterThan(1000);
    expect(m.dessus, JSON.stringify(m)).toBe(true);
    expect(m.btn.top, JSON.stringify(m)).toBeGreaterThanOrEqual(0);
    expect(m.btn.bottom, JSON.stringify(m)).toBeLessThanOrEqual(900);
  }, 30_000);

  it('R12 — 390 px : une faction connue sans illustration (?faction=) montre le rappel avec son message propre et Réinitialiser', async () => {
    const page = await open(390, 844, 'vide', '?faction=grey-knights');
    const txt = await page.getByTestId('rappel-vide').innerText();
    const btn = await page.getByTestId('bouton-reinitialiser-rappel').boundingBox();
    await page.close();
    expect(txt).toContain('Aucune illustration de la faction Chevaliers Gris');
    expect(btn!.height).toBeGreaterThanOrEqual(44);
    expect(btn!.y + btn!.height).toBeLessThanOrEqual(844);
  }, 30_000);

  it('R2 — 1440 px : le panneau Filtres ne recouvre pas les Artistes', async () => {
    const page = await open(1440, 900);
    const m = await page.evaluate(() => {
      const f = document.querySelector('[data-testid="panneau-filtres"]')!.getBoundingClientRect();
      const a = document.querySelector('.sidebar')!.getBoundingClientRect();
      return { fb: f.bottom, at: a.top };
    });
    await page.close();
    expect(m.at, JSON.stringify(m)).toBeGreaterThanOrEqual(m.fb);
  }, 30_000);

  it('R12 — 320 px, état vide, panneau ouvert : « Réinitialiser les filtres » reste dans son encadré, sans débordement', async () => {
    const page = await open(320, 640);
    await page.getByTestId('bouton-filtres').click();
    await page.getByTestId('filtre-faction').selectOption({ label: 'Nécrons' });
    await page.getByTestId('filtre-categorie').selectOption({ label: 'Space Marines' });
    await page.getByTestId('rappel-vide').waitFor();
    const m = await page.evaluate(() => {
      const box = document.querySelector('[data-testid="rappel-vide"]')!.getBoundingClientRect();
      const btn = document.querySelector('[data-testid="bouton-reinitialiser-rappel"]') as HTMLElement;
      const b = btn.getBoundingClientRect();
      return { boxR: box.right, btnR: b.right, btnL: b.left, boxL: box.left, clipped: btn.scrollWidth > btn.clientWidth, over: document.documentElement.scrollWidth - innerWidth, h: b.height };
    });
    await page.close();
    expect(m.btnR, JSON.stringify(m)).toBeLessThanOrEqual(m.boxR + 0.5);
    expect(m.btnL).toBeGreaterThanOrEqual(m.boxL - 0.5);
    expect(m.clipped).toBe(false);
    expect(m.over).toBeLessThanOrEqual(0);
    expect(m.h).toBeGreaterThanOrEqual(44);
  }, 30_000);

  it('R6 — 390×844 : « 9 résultats » du panneau entièrement dans le premier écran (polices chargées)', async () => {
    const page = await open(390, 844);
    await page.getByTestId('bouton-filtres').click();
    await page.getByTestId('filtre-faction').selectOption({ label: 'Space Marines' });
    await page.waitForTimeout(200);
    const m = await page.evaluate(() => {
      const r = document.querySelector('[data-testid="resultats-panneau"]')!.getBoundingClientRect();
      return { bottom: r.bottom + window.scrollY, y: window.scrollY, text: document.querySelector('[data-testid="resultats-panneau"]')!.textContent!.trim() };
    });
    await page.close();
    expect(m.text).toBe('9 résultats');
    expect(m.y).toBe(0);
    expect(m.bottom, JSON.stringify(m)).toBeLessThanOrEqual(844 - 24);
  }, 30_000);

  it('R8 — 1440×900, chargement : « Chargement de la galerie… » dans le premier écran', async () => {
    const page = await open(1440, 900, 'chargement');
    const b = await page.evaluate(() => document.querySelector('[data-testid="message-chargement"]')!.getBoundingClientRect().bottom);
    await page.close();
    expect(b).toBeLessThanOrEqual(900);
  }, 30_000);

  it('R9 — 1440×900, erreur : message et « Réessayer » dans le premier écran', async () => {
    const page = await open(1440, 900, 'erreur');
    const b = await page.evaluate(() => document.querySelector('[data-testid="bouton-reessayer"]')!.getBoundingClientRect().bottom);
    await page.close();
    expect(b).toBeLessThanOrEqual(900);
  }, 30_000);

  it('R2 — 1440×900 : après 1500 px de défilement, le panneau Filtres reste à l\'écran et ne recouvre pas les Artistes', async () => {
    const page = await open(1440, 900);
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.waitForTimeout(200);
    const m = await page.evaluate(() => {
      const f = document.querySelector('[data-testid="panneau-filtres"]')!.getBoundingClientRect();
      const a = document.querySelector('.sidebar')!.getBoundingClientRect();
      return { y: window.scrollY, ft: f.top, fb: f.bottom, at: a.top };
    });
    await page.close();
    expect(m.y).toBeGreaterThan(1000);
    expect(m.ft, JSON.stringify(m)).toBeGreaterThanOrEqual(0);
    expect(m.fb, JSON.stringify(m)).toBeLessThanOrEqual(900);
    expect(m.at, JSON.stringify(m)).toBeGreaterThanOrEqual(m.fb);
  }, 30_000);
});
