// @vitest-environment node
// L47 — Vidéos : ouvrir une vidéo précise par l'adresse (docs/specs/videos-ouvrir/fiche.yaml).
// Test d'acceptation écrit AVANT le code, d'après la fiche et la maquette : navigateur réel, application
// construite (dist, `ng build` requis), API simulée par context.route (A1/A3 : GET /api/videos, A6 : DELETE /api/videos/:id,
// page faction : GET /api/factions/:id). Sélecteurs = data-testid de la maquette (= identifiants de champs de la fiche).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, BrowserContext, Page, Route } from 'playwright-core';
import { chromium } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/styles.scss',
  'src/app/features/videos/videos.component.ts',
  'src/app/features/videos/videos.component.scss',
  'src/app/features/faction-detail/faction-detail.component.ts',
]);

const SEED = resolve(__dirname, '../../../../../backend/seed');
const factionSeed = JSON.parse(readFileSync(resolve(SEED, 'factions.json'), 'utf8')) as { id: string; nom: string }[];
const SPACE_MARINES = factionSeed.find((f) => f.id === 'space-marines')!;
const NECRONS = factionSeed.find((f) => f.id === 'necrons')!;

const mk = (id: string, titre: string, extra: Record<string, unknown> = {}) => ({
  id, titre, createur: 'Chaîne test', description: `Description de ${titre}`, url: `https://www.youtube.com/watch?v=${id}`,
  embedId: `emb-${id}`, embedType: 'video', type: 'animation', langue: 'FR', tags: ['Test'], incontournable: false,
  duration: '10:00', category: 'animation', language: 'FR', featured: false, ...extra,
});
/** 24 vidéos : 3 à la une (Incontournables), 21 autres (3 pages de « Toutes les vidéos » : 9 par page). */
const VIDEOS = [
  mk('astartes', 'Astartes — Partie 1', { featured: true, incontournable: true, tags: ['Space Marines'] }),
  mk('emperor-tts', 'If the Emperor Had a Text-to-Speech Device', { featured: true, incontournable: true }),
  mk('lord-inquisitor', 'The Lord Inquisitor — Film complet 4K', { featured: true, incontournable: true }),
  mk('astartes-2', 'Astartes — Partie 2'),
  mk('ultramarines-film', 'Ultramarines — Le film'),
  mk('primarques-en-bref', 'Les Primarques en bref'),
  ...Array.from({ length: 17 }, (_, i) => mk(`filler-${i + 1}`, `Vidéo de remplissage ${i + 1}`)),
  mk('sans-embed', 'Vidéo sans lecteur', { embedId: null, embedType: null, url: 'https://www.youtube.com/watch?v=sansembed' }),
];
const LAST = VIDEOS[VIDEOS.length - 1];

type Mode = 'ok' | 'chargement' | 'erreur' | 'erreur-puis-ok';
interface Sim { videosCalls: number; deleted: string[]; release: () => void }

/** Simule l'API ; en mode « chargement », GET /api/videos reste en attente jusqu'à release(). */
async function simulate(ctx: BrowserContext, mode: Mode = 'ok'): Promise<Sim> {
  const sim: Sim = { videosCalls: 0, deleted: [], release: () => undefined };
  let gate: () => void = () => undefined;
  const opened = new Promise<void>((r) => { gate = r; });
  sim.release = gate;
  const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  await ctx.route('**/api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/\/$/, '');
    if (path === '/api/videos' && req.method() === 'GET') {
      sim.videosCalls++;
      if (mode === 'chargement') await opened;
      if (mode === 'erreur' || (mode === 'erreur-puis-ok' && sim.videosCalls === 1)) return json(route, { statusCode: 500 }, 500);
      return json(route, VIDEOS.filter((v) => !sim.deleted.includes(v.id)));
    }
    if (path.startsWith('/api/videos/') && req.method() === 'DELETE') {
      const id = decodeURIComponent(path.slice('/api/videos/'.length));
      sim.deleted.push(id);
      return json(route, { deleted: id });
    }
    if (path === '/api/factions') return json(route, [SPACE_MARINES, NECRONS]);
    if (path === `/api/factions/${SPACE_MARINES.id}`) return json(route, SPACE_MARINES);
    if (path === `/api/factions/${NECRONS.id}`) return json(route, NECRONS);
    if (path.startsWith('/api/wiki-image')) return json(route, { imageUrl: null });
    if (path.startsWith('/api/demo') || path.startsWith('/api/image-meta')) return json(route, {});
    return json(route, []);
  });
  return sim;
}

const tid = (page: Page, id: string) => page.getByTestId(id);
const cardLink = (page: Page, id: string) => page.locator(`a[href="/videos?video=${id}"]`).first();
const videoParam = (page: Page) => new URL(page.url()).searchParams.get('video');
const activeDesc = (page: Page) => page.evaluate(() => {
  const el = document.activeElement as HTMLElement | null;
  return { tag: el?.tagName ?? '', testid: el?.getAttribute('data-testid') ?? '', href: el?.getAttribute('href') ?? '' };
});
const insideDialog = (page: Page) => page.evaluate(() => !!document.activeElement?.closest('[data-testid="modale-video"]'));

let server: Server;
let browser: Browser;
let base: string;
let ctx: BrowserContext;
let page: Page;

async function fresh(mode: Mode = 'ok', width = 1440): Promise<Sim> {
  ctx = await browser.newContext({ viewport: { width, height: 900 } });
  ctx.setDefaultTimeout(8000);
  const sim = await simulate(ctx, mode);
  page = await ctx.newPage();
  return sim;
}
const done = async () => { await ctx.close(); };
const settle = async () => {
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  await page.waitForLoadState('networkidle');
};

describe('vidéos — ouvrir une vidéo précise par l\'adresse (navigateur, dist) — L47', () => {
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

  // ---------------------------------------------------------------- R1
  it('R1 — carte à la une : href /videos?video=astartes sur la page Space Marines', async () => {
    await fresh();
    try {
      await page.goto(`${base}/factions/${SPACE_MARINES.id}`);
      await tid(page, 'carte-une-faction').waitFor({ state: 'attached' });
      expect(await tid(page, 'carte-une-faction').getAttribute('href')).toBe('/videos?video=astartes');
    } finally { await done(); }
  });

  it('R1 — carte de repli : href /videos sans paramètre', async () => {
    await fresh();
    try {
      await page.goto(`${base}/factions/${NECRONS.id}`);
      await tid(page, 'carte-repli-faction').waitFor({ state: 'attached' });
      expect(await tid(page, 'carte-repli-faction').getAttribute('href')).toBe('/videos');
      expect(await tid(page, 'carte-une-faction').count()).toBe(0);
    } finally { await done(); }
  });

  // ---------------------------------------------------------------- R2
  it('R2 — /videos?video=astartes : la fenêtre s\'ouvre sur « Astartes — Partie 1 »', async () => {
    await fresh();
    try {
      await page.goto(`${base}/videos?video=astartes`);
      await tid(page, 'modale-video').waitFor();
      const dlg = page.getByRole('dialog', { name: 'Astartes — Partie 1' });
      expect(await dlg.count()).toBe(1);
      expect(await tid(page, 'modale-video').getAttribute('aria-modal')).toBe('true');
      expect((await tid(page, 'titre-video').textContent())?.trim()).toBe('Astartes — Partie 1');
      expect(await tid(page, 'lecteur-video').locator('iframe[src*="emb-astartes"]').count()).toBe(1);
      expect((await activeDesc(page)).testid).toBe('bouton-fermer');
    } finally { await done(); }
  });

  it('R2 — vidéo hors des 9 premières de « Toutes les vidéos » : ouverte quand même', async () => {
    await fresh();
    try {
      await page.goto(`${base}/videos?video=filler-17`);
      await tid(page, 'modale-video').waitFor();
      expect((await tid(page, 'titre-video').textContent())?.trim()).toBe('Vidéo de remplissage 17');
      expect(await page.getByRole('dialog', { name: 'Vidéo de remplissage 17' }).count()).toBe(1);
    } finally { await done(); }
  });

  it('R2 — vidéo sans embedId : repli « Ouvrir sur YouTube »', async () => {
    await fresh();
    try {
      await page.goto(`${base}/videos?video=${LAST.id}`);
      await tid(page, 'modale-video').waitFor();
      expect(await tid(page, 'lecteur-video').locator('iframe').count()).toBe(0);
      const link = tid(page, 'modale-video').getByRole('link', { name: /Ouvrir sur YouTube/ });
      expect(await link.getAttribute('href')).toBe(LAST.url);
    } finally { await done(); }
  });

  it('R2 — Tab et Maj+Tab bouclent dans la fenêtre, le fond est inerte', async () => {
    await fresh();
    try {
      await page.goto(`${base}/videos?video=${LAST.id}`);
      await tid(page, 'modale-video').waitFor();
      const seq: string[] = [];
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        expect(await insideDialog(page), `Tab n°${i + 1}`).toBe(true);
        seq.push((await activeDesc(page)).testid || (await activeDesc(page)).tag);
      }
      // la fenêtre ne contient que Fermer et « Ouvrir sur YouTube » : le cycle revient sur Fermer
      expect(new Set(seq).size).toBeGreaterThanOrEqual(2);
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Shift+Tab');
        expect(await insideDialog(page), `Maj+Tab n°${i + 1}`).toBe(true);
      }
      const inert = await page.evaluate(() => {
        const inertOf = (el: Element | null) => !!el?.closest('[inert]');
        return { h1: inertOf(document.querySelector('h1')), nav: inertOf(document.querySelector('nav')) };
      });
      expect(inert.h1).toBe(true);
      expect(inert.nav).toBe(true);
    } finally { await done(); }
  });

  // ---------------------------------------------------------------- R3
  it('R3 — Fermer, Échap et le fond retirent ?video de l\'adresse', async () => {
    await fresh();
    try {
      for (const how of ['bouton', 'echap', 'fond'] as const) {
        await page.goto(`${base}/videos?video=astartes`);
        await tid(page, 'modale-video').waitFor();
        expect(videoParam(page)).toBe('astartes');
        if (how === 'bouton') await tid(page, 'bouton-fermer').click();
        else if (how === 'echap') await page.keyboard.press('Escape');
        else await tid(page, 'modale-video').click({ position: { x: 4, y: 4 } });
        await tid(page, 'modale-video').waitFor({ state: 'detached' });
        expect(videoParam(page), how).toBeNull();
        await page.reload();
        await settle();
        expect(await tid(page, 'modale-video').count(), `rechargement après ${how}`).toBe(0);
      }
    } finally { await done(); }
  });

  it('R3 — clic sur une carte : ?video=<id> écrit', async () => {
    await fresh();
    try {
      await page.goto(`${base}/videos`);
      await settle();
      await cardLink(page, 'astartes-2').click();
      await tid(page, 'modale-video').waitFor();
      expect(videoParam(page)).toBe('astartes-2');
      expect((await tid(page, 'titre-video').textContent())?.trim()).toBe('Astartes — Partie 2');
    } finally { await done(); }
  });

  it('R3 — Précédent après fermeture rouvre la vidéo', async () => {
    await fresh();
    try {
      await page.goto(`${base}/videos`);
      await settle();
      await cardLink(page, 'astartes-2').click();
      await tid(page, 'modale-video').waitFor();
      await tid(page, 'bouton-fermer').click();
      await tid(page, 'modale-video').waitFor({ state: 'detached' });
      expect(videoParam(page)).toBeNull();
      await page.goBack();
      await tid(page, 'modale-video').waitFor();
      expect(videoParam(page)).toBe('astartes-2');
      expect((await tid(page, 'titre-video').textContent())?.trim()).toBe('Astartes — Partie 2');
    } finally { await done(); }
  });

  // ---------------------------------------------------------------- R4
  it('R4 — liste en attente : message de chargement, pas de fenêtre', async () => {
    const sim = await fresh('chargement');
    try {
      await page.goto(`${base}/videos?video=astartes`);
      await tid(page, 'message-chargement').waitFor();
      expect((await tid(page, 'message-chargement').textContent())?.trim()).toBe('Chargement de la vidéo…');
      expect(await page.locator('[role="status"]', { has: tid(page, 'message-chargement') }).count()
        + (await tid(page, 'message-chargement').getAttribute('role') === 'status' ? 1 : 0)).toBeGreaterThan(0);
      expect(await tid(page, 'modale-video').count()).toBe(0);
      sim.release();
    } finally { await done(); }
  });

  it('R4 — liste reçue : le message disparaît et la fenêtre s\'ouvre', async () => {
    const sim = await fresh('chargement');
    try {
      await page.goto(`${base}/videos?video=astartes`);
      await tid(page, 'message-chargement').waitFor();
      sim.release();
      await tid(page, 'modale-video').waitFor();
      expect(await tid(page, 'message-chargement').count()).toBe(0);
      expect((await tid(page, 'titre-video').textContent())?.trim()).toBe('Astartes — Partie 1');
    } finally { await done(); }
  });

  // ---------------------------------------------------------------- R5
  it('R5 — /videos?video=disparue : message affiché, liste entière, pas de fenêtre', async () => {
    await fresh();
    try {
      await page.goto(`${base}/videos?video=disparue`);
      await tid(page, 'message-vide').waitFor();
      expect((await tid(page, 'message-vide').textContent())?.trim()).toBe('Cette vidéo n\'est plus dans le codex. Voici les autres vidéos.');
      const role = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="message-vide"]');
        return el?.getAttribute('role') ?? el?.closest('[role]')?.getAttribute('role') ?? null;
      });
      expect(role).toBe('status');
      expect(await tid(page, 'modale-video').count()).toBe(0);
      expect(await tid(page, 'liste-videos').count()).toBe(1);
      expect(await tid(page, 'carte-video').count()).toBeGreaterThan(3);
      expect(videoParam(page)).toBe('disparue');
    } finally { await done(); }
  });

  it('R5 — /videos sans paramètre : pas de message', async () => {
    await fresh();
    try {
      await page.goto(`${base}/videos`);
      await settle();
      expect(await tid(page, 'carte-video').count()).toBeGreaterThan(3);
      expect(await tid(page, 'message-vide').count()).toBe(0);
      expect(await tid(page, 'modale-video').count()).toBe(0);
    } finally { await done(); }
  });

  // ---------------------------------------------------------------- R6
  it('R6 — fermeture après arrivée par adresse : focus sur le h1', async () => {
    await fresh();
    try {
      await page.goto(`${base}/videos?video=astartes`);
      await tid(page, 'modale-video').waitFor();
      await tid(page, 'bouton-fermer').click();
      await tid(page, 'modale-video').waitFor({ state: 'detached' });
      expect((await activeDesc(page)).tag).toBe('H1');
    } finally { await done(); }
  });

  it('R6 — fermeture après clic ou Entrée : focus sur le lien étiré de la carte', async () => {
    await fresh();
    try {
      await page.goto(`${base}/videos`);
      await settle();
      await cardLink(page, 'astartes-2').click();
      await tid(page, 'modale-video').waitFor();
      await tid(page, 'bouton-fermer').click();
      await tid(page, 'modale-video').waitFor({ state: 'detached' });
      expect(await activeDesc(page)).toMatchObject({ tag: 'A', href: '/videos?video=astartes-2' });

      await cardLink(page, 'ultramarines-film').focus();
      await page.keyboard.press('Enter');
      await tid(page, 'modale-video').waitFor();
      await page.keyboard.press('Escape');
      await tid(page, 'modale-video').waitFor({ state: 'detached' });
      expect(await activeDesc(page)).toMatchObject({ tag: 'A', href: '/videos?video=ultramarines-film' });
    } finally { await done(); }
  });

  // ---------------------------------------------------------------- R7
  it('R7 — API en échec : message et bouton Réessayer, role=alert', async () => {
    await fresh('erreur');
    try {
      await page.goto(`${base}/videos?video=astartes`);
      await tid(page, 'message-erreur').waitFor();
      expect((await tid(page, 'message-erreur').textContent())?.trim()).toBe('Impossible de charger les vidéos.');
      expect(await page.locator('[role="alert"]', { has: tid(page, 'message-erreur') }).count()).toBe(1);
      expect(await page.locator('[role="alert"]', { has: tid(page, 'bouton-reessayer') }).count()).toBe(1);
      expect((await tid(page, 'bouton-reessayer').textContent())?.trim()).toBe('Réessayer');
      expect(await tid(page, 'modale-video').count()).toBe(0);
    } finally { await done(); }
  });

  it('R7 — Réessayer rappelle l\'API et ouvre la vidéo si elle revient', async () => {
    const sim = await fresh('erreur-puis-ok');
    try {
      await page.goto(`${base}/videos?video=astartes`);
      await tid(page, 'message-erreur').waitFor();
      const before = sim.videosCalls;
      await tid(page, 'bouton-reessayer').click();
      await tid(page, 'modale-video').waitFor();
      expect(sim.videosCalls).toBeGreaterThan(before);
      expect((await tid(page, 'titre-video').textContent())?.trim()).toBe('Astartes — Partie 1');
      expect(await tid(page, 'message-erreur').count()).toBe(0);
    } finally { await done(); }
  });

  // ---------------------------------------------------------------- R8
  it('R8 — ?video= vide : pas de fenêtre, pas de message', async () => {
    await fresh();
    try {
      await page.goto(`${base}/videos?video=`);
      await settle();
      expect(await tid(page, 'carte-video').count()).toBeGreaterThan(3);
      expect(await tid(page, 'modale-video').count()).toBe(0);
      expect(await tid(page, 'message-vide').count()).toBe(0);
      expect(await tid(page, 'message-chargement').count()).toBe(0);
    } finally { await done(); }
  });

  // ---------------------------------------------------------------- R9
  it('R9 — chaque carte reste un <article> dont le titre est un <a href="/videos?video=<id>"> focusable', async () => {
    await fresh();
    try {
      await page.goto(`${base}/videos`);
      await settle();
      const cards = await tid(page, 'carte-video').evaluateAll((els) => els.map((el) => {
        const a = el.querySelector('a');
        return { tag: el.tagName, href: a?.getAttribute('href') ?? null, title: a?.textContent?.trim() ?? '', inHeading: !!a?.closest('h1,h2,h3,h4') };
      }));
      expect(cards.length).toBeGreaterThanOrEqual(9);
      for (const c of cards) {
        expect(c.tag).toBe('ARTICLE');
        expect(c.href).toMatch(/^\/videos\?video=[^&]+$/);
        expect(c.inHeading).toBe(true);
      }
      const astartes = cards.find((c) => c.href === '/videos?video=astartes');
      expect(astartes?.title).toBe('Astartes — Partie 1');
      await cardLink(page, 'astartes-2').focus();
      expect(await activeDesc(page)).toMatchObject({ tag: 'A', href: '/videos?video=astartes-2' });
    } finally { await done(); }
  });

  it('R9 — le bouton Supprimer est frère du lien, jamais son descendant ; Tab : lien puis bouton', async () => {
    await fresh();
    try {
      await page.goto(`${base}/videos`);
      await settle();
      const card = tid(page, 'carte-video').filter({ has: cardLink(page, 'astartes-2') });
      const rel = await card.evaluate((el) => {
        const a = el.querySelector('a')!;
        const b = el.querySelector('[data-testid="bouton-supprimer"]');
        return { exists: !!b, inLink: !!b && a.contains(b), closestLink: !!b?.closest('a'), tag: b?.tagName ?? '' };
      });
      expect(rel).toEqual({ exists: true, inLink: false, closestLink: false, tag: 'BUTTON' });
      await cardLink(page, 'astartes-2').focus();
      await page.keyboard.press('Tab');
      expect((await activeDesc(page)).testid).toBe('bouton-supprimer');
      expect(await page.evaluate(() => !!document.activeElement?.closest('[data-testid="carte-video"]')?.querySelector('a[href="/videos?video=astartes-2"]'))).toBe(true);
      expect(await tid(page, 'carte-video').filter({ has: cardLink(page, 'astartes') }).locator('[data-testid="bouton-supprimer"]').count()).toBe(0);
    } finally { await done(); }
  });

  it('R9 — le focus du lien dessine le contour de la carte', async () => {
    await fresh();
    try {
      await page.goto(`${base}/videos`);
      await settle();
      const card = tid(page, 'carte-video').filter({ has: cardLink(page, 'astartes-2') });
      const outline = () => card.evaluate((el) => { const s = getComputedStyle(el); return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) }; });
      await cardLink(page, 'astartes-2').focus();
      const on = await outline();
      expect(on.style).not.toBe('none');
      expect(on.width).toBeGreaterThan(0);
      await page.evaluate(() => (document.activeElement as HTMLElement).blur());
      const off = await outline();
      expect(off.style === 'none' || off.width === 0).toBe(true);
      // le lien lui-même ne dessine pas de contour : seul celui de la carte se voit
      await cardLink(page, 'astartes-2').focus();
      expect(await cardLink(page, 'astartes-2').evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
    } finally { await done(); }
  });

  it('R9 — Entrée sur le lien ouvre la fenêtre et écrit ?video', async () => {
    await fresh();
    try {
      await page.goto(`${base}/videos`);
      await settle();
      await cardLink(page, 'ultramarines-film').focus();
      await page.keyboard.press('Enter');
      await tid(page, 'modale-video').waitFor();
      expect(videoParam(page)).toBe('ultramarines-film');
      expect((await tid(page, 'titre-video').textContent())?.trim()).toBe('Ultramarines — Le film');
    } finally { await done(); }
  });

  it('R9 — clic du milieu : nouvel onglet sur la vidéo, page courante inchangée', async () => {
    await fresh();
    try {
      await page.goto(`${base}/videos`);
      await settle();
      const [tab] = await Promise.all([
        ctx.waitForEvent('page'),
        cardLink(page, 'astartes-2').click({ button: 'middle' }),
      ]);
      // le nouvel onglet démarre à about:blank : attendre sa vraie adresse, pas seulement le chargement
      await tab.waitForURL(/\/videos\?video=astartes-2$/);
      await tab.waitForLoadState();
      expect(new URL(tab.url()).pathname + new URL(tab.url()).search).toBe('/videos?video=astartes-2');
      expect(videoParam(page)).toBeNull();
      expect(await tid(page, 'modale-video').count()).toBe(0);
    } finally { await done(); }
  });

  it('R9 — clic sur ✕ : la vidéo est supprimée, aucune fenêtre ne s\'ouvre', async () => {
    const sim = await fresh();
    try {
      page.on('dialog', (d) => { void d.accept(); });
      await page.goto(`${base}/videos`);
      await settle();
      const card = tid(page, 'carte-video').filter({ has: cardLink(page, 'astartes-2') });
      await card.locator('[data-testid="bouton-supprimer"]').click();
      await expect.poll(() => sim.deleted).toEqual(['astartes-2']);
      expect(await tid(page, 'modale-video').count()).toBe(0);
      expect(videoParam(page)).toBeNull();
    } finally { await done(); }
  });

  it('R9 — état vide : cartes focusables, filtres et « Charger plus… » sont des boutons', async () => {
    await fresh();
    try {
      await page.goto(`${base}/videos?video=disparue`);
      await tid(page, 'message-vide').waitFor();
      const first = tid(page, 'liste-videos').locator('[data-testid="carte-video"]').first();
      const link = first.locator('a').first();
      expect(await link.getAttribute('href')).toMatch(/^\/videos\?video=/);
      await link.focus();
      expect((await activeDesc(page)).tag).toBe('A');
      const outline = await first.evaluate((el) => getComputedStyle(el).outlineStyle);
      expect(outline).not.toBe('none');
      expect(await page.getByRole('button', { name: /^Tous/ }).first().evaluate((el) => el.tagName)).toBe('BUTTON');
      expect(await page.getByRole('button', { name: /Charger plus/ }).last().evaluate((el) => el.tagName)).toBe('BUTTON');
      expect(await page.locator('a', { hasText: /Charger plus/ }).count()).toBe(0);
    } finally { await done(); }
  });
});
