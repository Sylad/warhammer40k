// @vitest-environment node
// L52 (correction de revue) — le rechargement sur « morceau absent » ne part que si le morceau répond
// vraiment 404. Le navigateur donne le même message quand le réseau est coupé ou quand le serveur répond
// 502 : recharger alors quitte la page lue pour la page d'erreur du navigateur. Navigateur réel, dist.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, BrowserContext, Page, Request } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState(['src/app/core/utils/morceau-absent.ts', 'src/app/app.config.ts']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}
vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 });

const MORCEAU = /\/chunk-[A-Z0-9]+\.js$/;

describe.skipIf(!built || !chromium)('Morceau absent : rechargement seulement sur un vrai 404 (navigateur, dist) — L52', () => {
  let server: Server;
  let browser: Browser;
  let base: string;
  let ctx: BrowserContext;
  beforeAll(async () => {
    ({ base, server } = await startDistServer());
    browser = await chromium!.launch();
  });
  afterEach(async () => {
    await ctx?.close();
  });
  afterAll(async () => {
    await browser?.close();
    server?.close();
  });

  /** Ouvre l'accueil dans un contexte neuf (sessionStorage vierge) et note les requêtes de document. */
  async function accueil(): Promise<{ page: Page; documents: string[] }> {
    ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(base + '/');
    await page.getByRole('link', { name: 'Romans' }).first().waitFor();
    const documents: string[] = [];
    ctx.on('request', (r: Request) => {
      if (r.resourceType() === 'document') documents.push(new URL(r.url()).pathname);
    });
    return { page, documents };
  }

  /** Clique « Romans » (page pas encore chargée : son morceau est demandé au clic) et laisse 2 s au gestionnaire. */
  async function versRomans(page: Page): Promise<void> {
    await page.getByRole('link', { name: 'Romans' }).first().click();
    await page.waitForTimeout(2000);
  }

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  it('R7 — réseau coupé : le visiteur reste sur la page qu’il lisait, aucun rechargement', async () => {
    const { page, documents } = await accueil();
    await ctx.setOffline(true);
    await versRomans(page);
    expect(documents).toEqual([]);
    expect(page.url()).toBe(base + '/');
  });

  it('R8 — le morceau répond 404 : la page est rechargée sur l’adresse visée, une fois', async () => {
    const { page, documents } = await accueil();
    await ctx.route(MORCEAU, (route) => route.fulfill({ status: 404, body: 'Not found' }));
    await versRomans(page);
    expect(documents).toEqual(['/romans']);
    expect(page.url()).toBe(base + '/romans');
  });

  it('R8 — le morceau répond 502 (passerelle en redémarrage) : pas de rechargement', async () => {
    const { page, documents } = await accueil();
    await ctx.route(MORCEAU, (route) => route.fulfill({ status: 502, body: 'Bad gateway' }));
    await versRomans(page);
    expect(documents).toEqual([]);
    expect(page.url()).toBe(base + '/');
  });
});
