// @vitest-environment node
// L49 — Galerie : panneau Filtres avant la grille (docs/specs/galerie-filtres/fiche.yaml).
// Test d'acceptation écrit AVANT le code, d'après la fiche et la maquette : navigateur réel, application
// construite (dist, `ng build` requis), API simulée par page.route (A1 : GET /api/artworks, A2 : Réessayer).
// Sélecteurs = data-testid de la maquette (= identifiants de champs de la fiche).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page, Route } from 'playwright-core';
import { chromium } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState(['src/styles.scss', 'src/app/features/gallery/gallery.component.scss', 'src/app/features/gallery/gallery.component.ts']);

const FACTIONS = [
  { id: 'space-marines', nom: 'Space Marines' },
  { id: 'necrons', nom: 'Nécrons' },
  { id: 'astra-militarum', nom: 'Astra Militarum' },
];
/** 30 œuvres (2 pages) : 6 Space Marines, 8 Nécrons (Xénos), 16 Astra Militarum (Imperium). */
const ARTWORKS = Array.from({ length: 30 }, (_, i) => {
  const [faction, category] = i < 6 ? ['space-marines', 'Space Marines'] : i < 14 ? ['necrons', 'Xénos'] : ['astra-militarum', 'Imperium'];
  return { id: `aw-${i + 1}`, title: `Œuvre ${i + 1}`, artist: `Artiste ${(i % 7) + 1}`, image: `img-${i + 1}.jpg`, category, faction, likes: i + 1 };
});
const COLLECTIONS = [{ id: 'horus-heresy', name: 'Horus Heresy', description: 'Hérésie', count: 8 }];

type Mode = 'ok' | 'chargement' | 'erreur' | 'erreur-puis-ok';
interface Sim { artworksCalls: number; release: () => void }

/** Simule l'API de la galerie ; en mode « chargement » GET /api/artworks reste en attente jusqu'à release(). */
async function simulate(page: Page, mode: Mode = 'ok'): Promise<Sim> {
  const sim: Sim = { artworksCalls: 0, release: () => undefined };
  let gate: () => void = () => undefined;
  const opened = new Promise<void>((r) => { gate = r; });
  sim.release = gate;
  const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/\/$/, '');
    if (path === '/api/artworks') {
      sim.artworksCalls++;
      if (mode === 'chargement') await opened;
      if (mode === 'erreur' || (mode === 'erreur-puis-ok' && sim.artworksCalls === 1)) return json(route, { statusCode: 500 }, 500);
      return json(route, ARTWORKS);
    }
    if (path === '/api/factions') return json(route, FACTIONS);
    if (path === '/api/artwork-collections') return json(route, COLLECTIONS);
    if (path === '/api/artwork-artists') return json(route, [{ id: 'artiste-1', name: 'Artiste 1', artworkCount: 5 }, { id: 'artiste-2', name: 'Artiste 2', artworkCount: 4 }]);
    if (path === '/api/images') return json(route, []);
    if (path.startsWith('/api/wiki-image')) return json(route, { imageUrl: null });
    if (path.startsWith('/api/image-meta') || path.startsWith('/api/demo')) return json(route, {});
    return json(route, []);
  });
  return sim;
}

const tid = (page: Page, id: string) => page.getByTestId(id);

/** Descripteur de l'élément focalisé : data-testid, sinon zone de la page. */
async function tabSequence(page: Page, from: string, steps: number): Promise<string[]> {
  await tid(page, from).focus();
  const out: string[] = [];
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press('Tab');
    out.push(await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return 'body';
      const t = el.getAttribute('data-testid');
      if (t) return t;
      if (el.closest('[data-testid="grille-oeuvres"]')) return 'carte';
      if (el.closest('.category-grid')) return 'categorie';
      if (el.closest('nav[aria-label="Pagination galerie"]')) return 'pagination';
      const panel = el.closest('.side-panel');
      const h = panel?.querySelector('h3')?.textContent ?? '';
      if (/Artistes/.test(h)) return 'artistes';
      if (/Collections/.test(h)) return 'collections';
      return `autre:${(el.textContent ?? el.tagName).trim().slice(0, 25)}`;
    }));
  }
  return out;
}

const first = (seq: string[], label: string) => seq.indexOf(label);

async function open(page: Page, width: number, mode: Mode = 'ok'): Promise<Sim> {
  await page.setViewportSize({ width, height: 844 });
  const sim = await simulate(page, mode);
  await page.goto(base + '/gallery');
  if (mode === 'ok' || mode === 'erreur-puis-ok') {
    await page.locator('[data-testid="grille-oeuvres"], [data-testid="message-erreur"]').first().waitFor();
  }
  if (mode === 'erreur') await tid(page, 'message-erreur').waitFor();
  if (mode === 'chargement') await tid(page, 'message-chargement').waitFor();
  return sim;
}

async function openPanelIfPhone(page: Page): Promise<void> {
  const btn = tid(page, 'bouton-filtres');
  if (await btn.isVisible() && (await btn.getAttribute('aria-expanded')) !== 'true') await btn.click();
}

const choose = async (page: Page, id: string, label: string) => {
  await tid(page, id).focus();
  await tid(page, id).selectOption({ label });
};
const selected = (page: Page, id: string) => tid(page, id).evaluate((s: HTMLSelectElement) => s.selectedOptions[0]?.textContent?.trim());
const box = async (page: Page, id: string) => (await tid(page, id).boundingBox())!;
const categoriesTop = (page: Page) => page.evaluate(() => document.querySelector('.category-grid')!.parentElement!.getBoundingClientRect().top + scrollY);
const domBefore = (page: Page, a: string, bSelector: string) => page.evaluate(([x, y]) => {
  const A = document.querySelector(`[data-testid="${x}"]`);
  const B = document.querySelector(y);
  return !!A && !!B && !!(A.compareDocumentPosition(B) & Node.DOCUMENT_POSITION_FOLLOWING);
}, [a, bSelector]);

let server: Server;
let browser: Browser;
let base: string;
let page: Page;

describe('galerie — panneau Filtres avant la grille (navigateur, dist) — L49', () => {
  beforeAll(async () => {
    if (!built) throw new Error('application non construite : cd frontend && npx ng build');
    if (stale) throw new Error('application construite périmée : cd frontend && npx ng build');
    ({ base, server } = await startDistServer());
    browser = await chromium.launch();
  });
  afterAll(async () => {
    await browser?.close();
    server?.close();
  });
  const fresh = async () => { page = await browser.newPage(); page.setDefaultTimeout(4000); return page; };
  const done = async () => { await page.close(); };

  // ---------------------------------------------------------------- R1
  it('R1 — ordre de tabulation : recherche, Filtres, Faction, Catégorie, Trier par avant la première carte', async () => {
    await fresh();
    await open(page, 1440);
    const seq = await tabSequence(page, 'recherche', 40);
    await done();
    const iFaction = first(seq, 'filtre-faction');
    expect(iFaction, seq.join(' > ')).toBeGreaterThanOrEqual(0);
    expect(first(seq, 'filtre-categorie')).toBeGreaterThan(iFaction);
    expect(first(seq, 'filtre-tri')).toBeGreaterThan(first(seq, 'filtre-categorie'));
    const iCat = first(seq, 'categorie');
    expect(iCat, seq.join(' > ')).toBeGreaterThanOrEqual(0);
    expect(first(seq, 'filtre-tri')).toBeLessThan(iCat);
    for (const after of ['carte', 'pagination']) {
      const i = first(seq, after);
      if (i >= 0) expect(first(seq, 'filtre-tri')).toBeLessThan(i);
    }
    expect(iFaction).toBeLessThanOrEqual(3);
  }, 60_000);

  it('R1 — le panneau précède .main-col dans le DOM', async () => {
    await fresh();
    await open(page, 1440);
    const before = await domBefore(page, 'panneau-filtres', '.main-col');
    const inLayout = await page.evaluate(() => !!document.querySelector('[data-testid="mise-en-page"] [data-testid="panneau-filtres"]'));
    await done();
    expect(inLayout).toBe(true);
    expect(before).toBe(true);
  }, 30_000);

  // ---------------------------------------------------------------- R2
  it('R2 — 1440 px : panneau à droite de la grille, au même niveau que les catégories', async () => {
    await fresh();
    await open(page, 1440);
    const p = await box(page, 'panneau-filtres');
    const g = await box(page, 'grille-oeuvres');
    const top = await categoriesTop(page);
    await done();
    expect(p.x).toBeGreaterThanOrEqual(g.x + g.width - 1);
    expect(Math.abs(p.y - top)).toBeLessThanOrEqual(8);
  }, 30_000);

  it('R2 — 1440 px : bouton Filtres absent', async () => {
    await fresh();
    await open(page, 1440);
    const visible = await tid(page, 'bouton-filtres').isVisible();
    const panel = await tid(page, 'panneau-filtres').isVisible();
    await done();
    expect(visible).toBe(false);
    expect(panel).toBe(true);
  }, 30_000);

  // ---------------------------------------------------------------- R3
  it('R3 — 390 px : bouton Filtres sous la recherche, après Importer', async () => {
    await fresh();
    await open(page, 390);
    const search = await box(page, 'recherche');
    const filtres = await box(page, 'bouton-filtres');
    const importer = (await page.getByRole('button', { name: /Importer/ }).first().boundingBox())!;
    const seq = await tabSequence(page, 'recherche', 2);
    await done();
    expect(filtres.y).toBeGreaterThanOrEqual(search.y + search.height - 1);
    expect(Math.abs(filtres.y - importer.y)).toBeLessThanOrEqual(2);
    expect(filtres.x).toBeGreaterThan(importer.x);
    expect(seq[0]).toMatch(/Importer/);
    expect(seq[1]).toBe('bouton-filtres');
  }, 30_000);

  it('R3 — aria-expanded passe à true à l\'ouverture, aria-controls pointe le panneau', async () => {
    await fresh();
    await open(page, 390);
    const btn = tid(page, 'bouton-filtres');
    const before = await btn.getAttribute('aria-expanded');
    const controls = await btn.getAttribute('aria-controls');
    await btn.click();
    const after = await btn.getAttribute('aria-expanded');
    const panelId = await tid(page, 'panneau-filtres').getAttribute('id');
    const shown = await tid(page, 'panneau-filtres').isVisible();
    await done();
    expect(before).toBe('false');
    expect(after).toBe('true');
    expect(controls).toBeTruthy();
    expect(controls).toBe(panelId);
    expect(shown).toBe(true);
  }, 30_000);

  it('R3 — Entrée et Espace ouvrent et ferment', async () => {
    await fresh();
    await open(page, 390);
    const btn = tid(page, 'bouton-filtres');
    await btn.focus();
    const states: (string | null)[] = [await btn.getAttribute('aria-expanded')];
    for (const key of ['Enter', 'Enter', 'Space', 'Space']) {
      await page.keyboard.press(key);
      states.push(await btn.getAttribute('aria-expanded'));
    }
    await done();
    expect(states).toEqual(['false', 'true', 'false', 'true', 'false']);
  }, 30_000);

  // ---------------------------------------------------------------- R4
  it('R4 — 390 px : panneau replié (hidden), listes non focalisables', async () => {
    await fresh();
    await open(page, 390);
    const hidden = !(await tid(page, 'panneau-filtres').isVisible());
    const cls = await tid(page, 'panneau-filtres').getAttribute('class');
    const lists = await Promise.all(['filtre-faction', 'filtre-categorie', 'filtre-tri'].map((id) => tid(page, id).isVisible()));
    const seq = await tabSequence(page, 'bouton-filtres', 8);
    await done();
    expect(hidden).toBe(true);
    expect(cls).toMatch(/\bferme\b/);
    expect(lists).toEqual([false, false, false]);
    for (const id of ['filtre-faction', 'filtre-categorie', 'filtre-tri']) expect(seq).not.toContain(id);
  }, 30_000);

  it('R4 — ouvert, Réinitialiser puis les listes suivent immédiatement le bouton Filtres dans l\'ordre de tabulation', async () => {
    await fresh();
    await open(page, 390);
    await openPanelIfPhone(page);
    await choose(page, 'filtre-faction', 'Space Marines');
    const seq = await tabSequence(page, 'bouton-filtres', 4);
    await done();
    expect(seq).toEqual(['bouton-reinitialiser', 'filtre-faction', 'filtre-categorie', 'filtre-tri']);
  }, 30_000);

  it('R4 — chargement et erreur à 390 px : panneau replié, aria-expanded=false', async () => {
    for (const mode of ['chargement', 'erreur'] as const) {
      await fresh();
      const sim = await open(page, 390, mode);
      const expanded = await tid(page, 'bouton-filtres').getAttribute('aria-expanded');
      const visible = await tid(page, 'panneau-filtres').isVisible();
      const cls = await tid(page, 'panneau-filtres').getAttribute('class');
      sim.release();
      await done();
      expect(expanded, mode).toBe('false');
      expect(visible, mode).toBe(false);
      expect(cls, mode).toMatch(/\bferme\b/);
    }
  }, 30_000);

  // ---------------------------------------------------------------- R5
  it('R5 — ouvert : panneau entre le bandeau et les catégories', async () => {
    await fresh();
    await open(page, 390);
    await openPanelIfPhone(page);
    const order = await page.evaluate(() => {
      const hero = document.querySelector('.hero')!;
      const panel = document.querySelector('[data-testid="panneau-filtres"]')!;
      const cats = document.querySelector('.category-grid')!;
      const f = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return [f(hero, panel), f(panel, cats)];
    });
    await done();
    expect(order).toEqual([true, true]);
  }, 30_000);

  it('R5 — 390 px : pastilles de statistiques masquées, haut du panneau à moins de 80 px sous le bouton', async () => {
    await fresh();
    await open(page, 390);
    const statsBefore = await page.locator('.hero-stats').isVisible();
    await openPanelIfPhone(page);
    const stats = await page.locator('.hero-stats').isVisible();
    const b = await box(page, 'bouton-filtres');
    const p = await box(page, 'panneau-filtres');
    await done();
    expect(statsBefore).toBe(true);
    expect(stats).toBe(false);
    expect(p.y - (b.y + b.height)).toBeGreaterThanOrEqual(0);
    expect(p.y - (b.y + b.height)).toBeLessThan(80);
  }, 30_000);

  it('R5 — un filtre actif : pastille 1 sur le bouton', async () => {
    await fresh();
    await open(page, 390);
    await openPanelIfPhone(page);
    await choose(page, 'filtre-faction', 'Space Marines');
    const text = (await tid(page, 'compteur-filtres-actifs').textContent())?.trim();
    const inButton = await tid(page, 'bouton-filtres').locator('[data-testid="compteur-filtres-actifs"]').count();
    await choose(page, 'filtre-categorie', 'Space Marines');
    const two = (await tid(page, 'compteur-filtres-actifs').textContent())?.trim();
    await done();
    expect(text).toBe('1');
    expect(inButton).toBe(1);
    expect(two).toBe('2');
  }, 30_000);

  it('R5 — aucun filtre : pas de pastille', async () => {
    await fresh();
    await open(page, 390);
    await openPanelIfPhone(page);
    const closedCount = await tid(page, 'compteur-filtres-actifs').count();
    await choose(page, 'filtre-faction', 'Space Marines');
    await tid(page, 'bouton-reinitialiser').click();
    const afterReset = await tid(page, 'compteur-filtres-actifs').count();
    await done();
    expect(closedCount).toBe(0);
    expect(afterReset).toBe(0);
  }, 30_000);

  // ---------------------------------------------------------------- R6
  it('R6 — Faction Space Marines : « 6 résultats » annoncé, panneau toujours ouvert', async () => {
    await fresh();
    await open(page, 390);
    await openPanelIfPhone(page);
    await choose(page, 'filtre-faction', 'Space Marines');
    await tid(page, 'resultats-statut').filter({ hasText: '6 résultats' }).waitFor();
    const text = (await tid(page, 'resultats-statut').textContent())?.trim();
    const role = await tid(page, 'resultats-statut').getAttribute('role');
    const panel = await tid(page, 'panneau-filtres').isVisible();
    const expanded = await tid(page, 'bouton-filtres').getAttribute('aria-expanded');
    const cards = await tid(page, 'grille-oeuvres').locator('> *').count();
    await done();
    expect(text).toBe('6 résultats');
    expect(role).toBe('status');
    expect(panel).toBe(true);
    expect(expanded).toBe('true');
    expect(cards).toBe(6);
  }, 30_000);

  it('R6 — 390 px : « 6 résultats » visible dans le panneau, sous Trier par, sans défilement vers la grille', async () => {
    await fresh();
    await open(page, 390);
    await openPanelIfPhone(page);
    await choose(page, 'filtre-faction', 'Space Marines');
    await tid(page, 'resultats-panneau').waitFor({ state: 'visible' });
    const text = (await tid(page, 'resultats-panneau').textContent())?.trim();
    const r = await box(page, 'resultats-panneau');
    const tri = await box(page, 'filtre-tri');
    const scrollY = await page.evaluate(() => window.scrollY);
    const inPanel = await tid(page, 'panneau-filtres').locator('[data-testid="resultats-panneau"]').count();
    await done();
    expect(text).toBe('6 résultats');
    expect(inPanel).toBe(1);
    expect(r.y).toBeGreaterThanOrEqual(tri.y + tri.height - 1);
    expect(r.y + r.height).toBeLessThanOrEqual(844);
    expect(scrollY).toBe(0);
  }, 30_000);

  it('R6 — une seule région role=status porte le total (le rappel du panneau est aria-hidden)', async () => {
    await fresh();
    await open(page, 390);
    await openPanelIfPhone(page);
    await choose(page, 'filtre-faction', 'Space Marines');
    await tid(page, 'resultats-statut').filter({ hasText: '6 résultats' }).waitFor();
    const m = await page.evaluate(() => {
      const regions = [...document.querySelectorAll('[role="status"], [aria-live]')].filter((e) => /6 résultats/.test(e.textContent ?? ''));
      const rappel = document.querySelector('[data-testid="resultats-panneau"]')!;
      return { regions: regions.length, hidden: rappel?.getAttribute('aria-hidden'), inLive: !!rappel?.closest('[role="status"], [aria-live]') };
    });
    await done();
    expect(m.regions).toBe(1);
    expect(m.hidden).toBe('true');
    expect(m.inLive).toBe(false);
  }, 30_000);

  it('R6 — 761 px et plus : rappel du panneau absent', async () => {
    for (const width of [761, 1440]) {
      await fresh();
      await open(page, width);
      await choose(page, 'filtre-faction', 'Space Marines');
      await tid(page, 'resultats-statut').filter({ hasText: '6 résultats' }).waitFor();
      const visible = await tid(page, 'resultats-panneau').isVisible();
      const panel = await tid(page, 'panneau-filtres').isVisible();
      await done();
      expect(panel, `${width}`).toBe(true);
      expect(visible, `${width}`).toBe(false);
    }
  }, 30_000);

  it('R6 — le focus reste sur la liste choisie', async () => {
    await fresh();
    await open(page, 390);
    await openPanelIfPhone(page);
    for (const [id, label] of [['filtre-faction', 'Space Marines'], ['filtre-tri', 'Plus anciennes']] as const) {
      await choose(page, id, label).catch(async () => { await tid(page, id).selectOption({ index: 1 }); });
      await page.waitForTimeout(150);
      const active = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute('data-testid'));
      expect(active, id).toBe(id);
    }
    await done();
  }, 30_000);

  it('R6 — Réinitialiser remet Toutes et lève la pastille', async () => {
    await fresh();
    await open(page, 390);
    await openPanelIfPhone(page);
    await choose(page, 'filtre-faction', 'Space Marines');
    await choose(page, 'filtre-categorie', 'Space Marines');
    await tid(page, 'bouton-reinitialiser').click();
    const f = await selected(page, 'filtre-faction');
    const c = await selected(page, 'filtre-categorie');
    const pastille = await tid(page, 'compteur-filtres-actifs').count();
    await tid(page, 'resultats-statut').filter({ hasText: '30 résultats' }).waitFor();
    await done();
    expect([f, c]).toEqual(['Toutes', 'Toutes']);
    expect(pastille).toBe(0);
  }, 30_000);

  // ---------------------------------------------------------------- R7
  it('R7 — filtres sans résultat : message affiché, pas de grille', async () => {
    await fresh();
    await open(page, 1440);
    await choose(page, 'filtre-faction', 'Space Marines');
    await choose(page, 'filtre-categorie', 'Xénos');
    await tid(page, 'message-vide').waitFor();
    const text = (await tid(page, 'message-vide').textContent())?.trim();
    const grid = await tid(page, 'grille-oeuvres').count();
    const panel = await tid(page, 'panneau-filtres').isVisible();
    const reset = await tid(page, 'bouton-reinitialiser').isVisible();
    await done();
    expect(text).toBe('Aucune œuvre ne correspond à ces filtres.');
    expect(grid).toBe(0);
    expect(panel).toBe(true);
    expect(reset).toBe(true);
  }, 30_000);

  it('R7 — Réinitialiser rend la grille', async () => {
    await fresh();
    await open(page, 1440);
    await choose(page, 'filtre-faction', 'Space Marines');
    await choose(page, 'filtre-categorie', 'Xénos');
    await tid(page, 'message-vide').waitFor();
    await tid(page, 'bouton-reinitialiser').click();
    await tid(page, 'grille-oeuvres').waitFor();
    const empty = await tid(page, 'message-vide').count();
    const f = await selected(page, 'filtre-faction');
    await done();
    expect(empty).toBe(0);
    expect(f).toBe('Toutes');
  }, 30_000);

  // ---------------------------------------------------------------- R8
  it('R8 — chargement : message annoncé, listes et cartes de catégorie désactivées, pastilles « – », pas de total dans le bandeau', async () => {
    await fresh();
    const sim = await open(page, 1440, 'chargement');
    const msg = (await tid(page, 'message-chargement').textContent())?.trim();
    const role = await tid(page, 'message-chargement').getAttribute('role');
    const disabled = await Promise.all(['filtre-faction', 'filtre-categorie', 'filtre-tri'].map((id) => tid(page, id).isDisabled()));
    const cards = await page.evaluate(() => [...document.querySelectorAll('.category-grid button')].map((b) => ({ d: (b as HTMLButtonElement).disabled, c: b.querySelector('.cat-count')?.textContent?.trim() })));
    const stats = await page.locator('.hero-stats .stat-num').allTextContents();
    const desc = (await page.locator('.hero-desc').textContent()) ?? '';
    sim.release();
    await done();
    expect(msg).toBe('Chargement de la galerie…');
    expect(role).toBe('status');
    expect(disabled).toEqual([true, true, true]);
    expect(cards.length).toBeGreaterThan(0);
    for (const c of cards) expect(c).toEqual({ d: true, c: '–' });
    expect(stats.map((s) => s.trim())).toEqual(['–', '–', '–']);
    expect(desc).not.toMatch(/triées, classées et archivées/);
  }, 30_000);

  it('R8 — le panneau précède toujours la grille pendant le chargement', async () => {
    await fresh();
    const sim = await open(page, 1440, 'chargement');
    const before = await domBefore(page, 'panneau-filtres', '.main-col');
    sim.release();
    await done();
    expect(before).toBe(true);
  }, 30_000);

  // ---------------------------------------------------------------- R9
  it('R9 — erreur d\'API : message et bouton Réessayer, cartes de catégorie désactivées, pastilles « – »', async () => {
    await fresh();
    await open(page, 1440, 'erreur');
    const msg = (await tid(page, 'message-erreur').textContent())?.trim();
    const retry = await tid(page, 'bouton-reessayer').isVisible();
    const grid = await tid(page, 'grille-oeuvres').count();
    const vide = await tid(page, 'message-vide').count();
    const disabled = await Promise.all(['filtre-faction', 'filtre-categorie', 'filtre-tri'].map((id) => tid(page, id).isDisabled()));
    const cards = await page.evaluate(() => [...document.querySelectorAll('.category-grid button')].map((b) => ({ d: (b as HTMLButtonElement).disabled, c: b.querySelector('.cat-count')?.textContent?.trim() })));
    const stats = await page.locator('.hero-stats .stat-num').allTextContents();
    const desc = (await page.locator('.hero-desc').textContent()) ?? '';
    await done();
    expect(msg).toBe('Impossible de charger la galerie.');
    expect(retry).toBe(true);
    expect(grid).toBe(0);
    expect(vide).toBe(0);
    expect(disabled).toEqual([true, true, true]);
    expect(cards.length).toBeGreaterThan(0);
    for (const c of cards) expect(c).toEqual({ d: true, c: '–' });
    expect(stats.map((s) => s.trim())).toEqual(['–', '–', '–']);
    expect(desc).not.toMatch(/triées, classées et archivées/);
  }, 30_000);

  it('R9 — Réessayer relance GET /api/artworks', async () => {
    await fresh();
    const sim = await open(page, 1440, 'erreur-puis-ok');
    const before = sim.artworksCalls;
    await tid(page, 'bouton-reessayer').click();
    await tid(page, 'grille-oeuvres').waitFor();
    const after = sim.artworksCalls;
    const err = await tid(page, 'message-erreur').count();
    await done();
    expect(before).toBe(1);
    expect(after).toBe(2);
    expect(err).toBe(0);
  }, 30_000);

  // ---------------------------------------------------------------- R10
  it('R10 — Artistes et Collections après la pagination dans l\'ordre de tabulation', async () => {
    await fresh();
    await open(page, 1440);
    const seq = await tabSequence(page, 'recherche', 90);
    await done();
    const iPage = first(seq, 'pagination');
    const iArt = first(seq, 'artistes');
    const iCol = first(seq, 'collections');
    expect(first(seq, 'filtre-tri'), seq.join(' > ')).toBeGreaterThanOrEqual(0);
    expect(iPage).toBeGreaterThanOrEqual(0);
    expect(iArt).toBeGreaterThan(seq.lastIndexOf('pagination'));
    expect(iCol).toBeGreaterThan(seq.lastIndexOf('pagination'));
    expect(iArt).toBeGreaterThan(first(seq, 'filtre-tri'));
  }, 60_000);

  // ---------------------------------------------------------------- R11
  it('R11 — 900 px : panneau ouvert avant les catégories, pas de bouton Filtres', async () => {
    await fresh();
    await open(page, 900);
    const btn = await tid(page, 'bouton-filtres').isVisible();
    const panel = await tid(page, 'panneau-filtres').isVisible();
    const p = await box(page, 'panneau-filtres');
    const top = await categoriesTop(page);
    const lists = await Promise.all(['filtre-faction', 'filtre-categorie', 'filtre-tri'].map((id) => tid(page, id).isVisible()));
    await done();
    expect(btn).toBe(false);
    expect(panel).toBe(true);
    expect(lists).toEqual([true, true, true]);
    expect(p.y + p.height).toBeLessThanOrEqual(top + 1);
  }, 30_000);

  // ---------------------------------------------------------------- R12
  async function toEmpty(width: number): Promise<void> {
    await open(page, width);
    await openPanelIfPhone(page);
    await choose(page, 'filtre-faction', 'Space Marines');
    await choose(page, 'filtre-categorie', 'Xénos');
    await tid(page, 'message-vide').waitFor();
  }

  it('R12 — 390 px, filtres sans résultat : « Aucune œuvre ne correspond » visible, bas du rappel à moins de 844 px du haut de la page', async () => {
    for (const panelOpen of [true, false]) {
      await fresh();
      await toEmpty(390);
      if (!panelOpen) await tid(page, 'bouton-filtres').click();
      const visible = await tid(page, 'rappel-vide').isVisible();
      const text = (await tid(page, 'rappel-vide').textContent()) ?? '';
      const b = await box(page, 'rappel-vide');
      const scrollY = await page.evaluate(() => window.scrollY);
      const search = await box(page, 'recherche');
      await done();
      expect(visible, `ouvert=${panelOpen}`).toBe(true);
      expect(text).toContain('Aucune œuvre ne correspond');
      expect(b.y + scrollY + b.height, `ouvert=${panelOpen}`).toBeLessThan(844);
      expect(b.y).toBeGreaterThanOrEqual(search.y + search.height - 1);
    }
  }, 30_000);

  it('R12 — 390 px : « Réinitialiser les filtres » visible dans le même écran, cible d\'au moins 44 px', async () => {
    await fresh();
    await toEmpty(390);
    const btn = tid(page, 'bouton-reinitialiser-rappel');
    const visible = await btn.isVisible();
    const text = (await btn.textContent())?.trim();
    const b = await box(page, 'bouton-reinitialiser-rappel');
    const scrollY = await page.evaluate(() => window.scrollY);
    await done();
    expect(visible).toBe(true);
    expect(text).toBe('Réinitialiser les filtres');
    expect(b.height).toBeGreaterThanOrEqual(44);
    expect(b.y + scrollY + b.height).toBeLessThan(844);
  }, 30_000);

  it('R12 — Réinitialiser les filtres remet Toutes et rend la grille', async () => {
    await fresh();
    await toEmpty(390);
    await tid(page, 'bouton-reinitialiser-rappel').click();
    await tid(page, 'grille-oeuvres').waitFor();
    const f = await selected(page, 'filtre-faction');
    const c = await selected(page, 'filtre-categorie');
    const rappel = await tid(page, 'rappel-vide').count();
    await done();
    expect([f, c]).toEqual(['Toutes', 'Toutes']);
    expect(rappel).toBe(0);
  }, 30_000);

  it('R12 — 761 px et plus : rappel absent', async () => {
    for (const width of [761, 1440]) {
      await fresh();
      await toEmpty(width);
      const visible = await tid(page, 'rappel-vide').isVisible();
      const msg = await tid(page, 'message-vide').isVisible();
      await done();
      expect(msg, `${width}`).toBe(true);
      expect(visible, `${width}`).toBe(false);
    }
  }, 30_000);
});
