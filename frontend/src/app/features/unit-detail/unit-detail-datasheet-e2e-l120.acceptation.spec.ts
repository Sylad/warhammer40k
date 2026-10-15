// @vitest-environment node
// L120 — mesures de la figure de la fiche unité (docs/specs/unit-detail-datasheet/fiche.yaml) : navigateur réel,
// application construite (dist, `ng build` requis, puis `npm run test:e2e`). API simulée par context.route
// (A1 : HEAD/GET /api/images/datasheets/:id → un SVG ; le reste vient de backend/seed via le serveur de test).
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, BrowserContext, Page } from 'playwright-core';
import { chromium } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/styles.scss',
  'src/app/features/unit-detail/unit-detail.component.ts',
  'src/app/features/unit-detail/unit-detail.component.scss',
]);
vi.setConfig({ testTimeout: 30000, hookTimeout: 60000 });
const UNIT = 'sm-tactique';
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#888"/></svg>';

let server: Server;
let browser: Browser;
let base: string;
let ctx: BrowserContext;
let page: Page;

async function fresh(width: number): Promise<void> {
  ctx = await browser.newContext({ viewport: { width, height: 900 } });
  ctx.setDefaultTimeout(5000);
  await ctx.route('**/api/images/datasheets/**', (route) => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: SVG }));
  page = await ctx.newPage();
  await page.goto(`${base}/units/${UNIT}`);
  await page.locator('.hero figure img').waitFor({ state: 'visible', timeout: 3000 });
}
const box = async (sel: string) => (await page.locator(sel).first().boundingBox())!;

describe('fiche unité — mesures de la figure (navigateur, dist) — L120', () => {
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

  it('R1 — hauteur ≈ 400 px et colonnes 44/56 % mesurées à 1440 px (test e2e Playwright, npm run test:e2e, jsdom ne mesure pas)', async () => {
    await fresh(1440);
    try {
      const fig = await box('.hero figure');
      expect(fig.height).toBeGreaterThanOrEqual(380);
      expect(fig.height).toBeLessThanOrEqual(440);
      const hero = await box('.hero');
      const text = await box('.hero .hero-text');
      const inner = hero.width - 2 * 46 - 2; // padding 46 px de chaque côté, bord 1 px
      expect(text.width / inner).toBeGreaterThan(0.42);
      expect(text.width / inner).toBeLessThan(0.46);
      expect(fig.width / inner).toBeGreaterThan(0.45);
      expect(fig.width / inner).toBeLessThan(0.58);
      expect(fig.x).toBeGreaterThan(text.x + text.width - 1);
    } finally { await ctx.close(); }
  });

  it('R11 — ≤ 760 px : la figure est en pleine largeur et fait 259 px de haut (e2e Playwright à 390 px, npm run test:e2e)', async () => {
    await fresh(390);
    try {
      const fig = await box('.hero figure');
      const hero = await box('.hero');
      expect(fig.height).toBeGreaterThanOrEqual(255);
      expect(fig.height).toBeLessThanOrEqual(263);
      expect(fig.width).toBeGreaterThanOrEqual(340);
      expect(fig.y).toBeGreaterThanOrEqual(hero.y + hero.height - 1);
      expect(fig.y - (hero.y + hero.height)).toBeLessThan(40);
      const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.hero')!, '::before').backgroundImage);
      expect(bg).not.toContain('url(');
    } finally { await ctx.close(); }
  });

  it('R13 — hauteur du bouton ≥ 44 px à 390 px', async () => {
    await fresh(390);
    try {
      const b = await page.getByRole('button', { name: 'Agrandir la fiche technique de Escouade Tactique' }).first().boundingBox();
      expect(b!.height).toBeGreaterThanOrEqual(44);
    } finally { await ctx.close(); }
  });
});
