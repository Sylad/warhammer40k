// @vitest-environment node
// L120 — mesures de la figure de la fiche unité (docs/specs/unit-detail-datasheet/fiche.yaml) : navigateur réel,
// application construite (dist, `ng build` requis, puis `npm run test:e2e`). API simulée par context.route
// (A1 : HEAD/GET /api/images/datasheets/:id → un SVG ; le reste vient de backend/seed via le serveur de test).
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Server } from 'node:http';
import type { Browser, BrowserContext, Page } from 'playwright-core';
import { chromium } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/styles.scss',
  'src/app/features/unit-detail/unit-detail.component.ts',
  'src/app/features/unit-detail/unit-detail.component.scss',
  'src/app/features/unit-detail/unit-datasheet-dialog.component.ts',
  'src/app/features/unit-detail/unit-datasheet-dialog.component.scss',
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
const PUBLIC = resolve(__dirname, '../../../../../backend/public');
const SCAN = readFileSync(resolve(PUBLIC, 'datasheets/sm-tactique.jpg')); // un vrai scan 898×596
const PORTRAIT = readFileSync(resolve(PUBLIC, 'portraits/inq-valeria.jpg')); // un vrai insigne 350×260

/** Fiche d'une unité avec les vrais fichiers : `datasheet` (scan) ou `portrait` local ; l'autre route répond 404. */
async function freshWith(width: number, unit: string, files: { datasheet?: Buffer; portrait?: Buffer }, height = 900): Promise<void> {
  ctx = await browser.newContext({ viewport: { width, height } });
  ctx.setDefaultTimeout(5000);
  await ctx.route('**/api/images/datasheets/**', (route) => files.datasheet
    ? route.fulfill({ status: 200, contentType: 'image/jpeg', body: files.datasheet })
    : route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
  await ctx.route('**/api/images/portraits/**', (route) => files.portrait
    ? route.fulfill({ status: 200, contentType: 'image/jpeg', body: files.portrait })
    : route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
  page = await ctx.newPage();
  await page.goto(`${base}/units/${unit}`);
  await page.locator('.hero figure img').waitFor({ state: 'visible', timeout: 3000 });
  await page.waitForFunction(() => (document.querySelector('.hero figure img') as HTMLImageElement | null)?.complete === true);
}
/** Échelle (écran / natif) et largeur à l'écran d'un <img> en object-fit contain dans sa boîte. */
const shown = (sel: string) => page.evaluate((s) => {
  const i = document.querySelector(s) as HTMLImageElement;
  const r = i.getBoundingClientRect();
  const scale = Math.min(r.width / i.naturalWidth, r.height / i.naturalHeight);
  return { scale, width: i.naturalWidth * scale, nat: i.naturalWidth };
}, sel);
const openZoom = async () => {
  await page.locator('.hero figure button.zoom-btn').click();
  await page.locator('dialog[open] img.ds-img').waitFor({ state: 'visible' });
  await page.waitForFunction(() => (document.querySelector('dialog img.ds-img') as HTMLImageElement | null)?.complete === true);
};
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
      const b = await page.getByRole('button', { name: 'Fiche technique · agrandir — Escouade Tactique' }).first().boundingBox();
      expect(b!.height).toBeGreaterThanOrEqual(44);
    } finally { await ctx.close(); }
  });

  it('R17 — à 390 px, l\'image de la fenêtre est à 898 px dans un conteneur défilable, départ en haut à gauche, Fermer reste au-dessus', async () => {
    await freshWith(390, UNIT, { datasheet: SCAN });
    try {
      const inFigure = await shown('.hero figure img');
      await openZoom();
      const inDialog = await shown('dialog img.ds-img');
      expect(inDialog.width).toBeGreaterThanOrEqual(Math.min(inDialog.nat, 898) - 0.5);
      expect(inDialog.width).toBeLessThanOrEqual(898.5);
      expect(inDialog.scale).toBeGreaterThan(inFigure.scale * 2);
      const sc = await page.evaluate(() => {
        const c = document.querySelector('dialog .ds-scroll') as HTMLElement;
        const st = getComputedStyle(c);
        return { overflowX: st.overflowX, overflowY: st.overflowY, touchAction: st.touchAction, scrollW: c.scrollWidth, clientW: c.clientWidth, scrollH: c.scrollHeight, clientH: c.clientHeight, left: c.scrollLeft, top: c.scrollTop, boxTop: c.getBoundingClientRect().top, boxW: c.getBoundingClientRect().width };
      });
      expect(sc.overflowX).toBe('auto');
      expect(sc.overflowY).toBe('auto');
      expect(sc.touchAction).toBe('manipulation'); // Chromium normalise « pan-x pan-y pinch-zoom » en « manipulation »
      expect(sc.scrollW).toBeGreaterThan(sc.clientW);
      expect(sc.scrollH).toBeGreaterThanOrEqual(sc.clientH);
      expect([sc.left, sc.top]).toEqual([0, 0]);
      expect(sc.boxW).toBeGreaterThanOrEqual(388);
      const close = await box('dialog .ds-close');
      expect(close.width).toBeGreaterThanOrEqual(44);
      expect(close.height).toBeGreaterThanOrEqual(44);
      expect(close.y + close.height).toBeLessThanOrEqual(sc.boxTop + 1);
      // la fenêtre se fait défiler au doigt jusqu'à la fin de l'image
      await page.evaluate(() => { const c = document.querySelector('dialog .ds-scroll') as HTMLElement; c.scrollLeft = c.scrollWidth; });
      expect(await page.evaluate(() => (document.querySelector('dialog .ds-scroll') as HTMLElement).scrollLeft)).toBeGreaterThan(400);
    } finally { await ctx.close(); }
  });

  it('R17 — à 390 px, une image plus petite que l\'écran n\'est jamais plus petite dans la fenêtre que dans la figure', async () => {
    await freshWith(390, 'inq-valeria', { portrait: PORTRAIT });
    try {
      const inFigure = await shown('.hero figure img');
      await openZoom();
      const inDialog = await shown('dialog img.ds-img');
      expect(inDialog.width).toBeGreaterThanOrEqual(inFigure.width - 0.5);
      expect(inDialog.width).toBeGreaterThanOrEqual(388);
      expect(inDialog.width).toBeLessThanOrEqual(392); // max(conteneur 390 px, min(natif 350 px, 898 px)) : pas étirée à la hauteur du conteneur
    } finally { await ctx.close(); }
  });

  it('R17 — à 1440 px, un portrait local de 350×260 est au moins aussi grand dans la fenêtre que dans la figure', async () => {
    await freshWith(1440, 'inq-valeria', { portrait: PORTRAIT });
    try {
      expect(await page.locator('.hero figure figcaption').textContent()).toContain('Illustration · agrandir');
      expect(await page.locator('h2', { hasText: 'Fiche technique' }).count()).toBe(0);
      const inFigure = await shown('.hero figure img');
      expect(inFigure.width).toBeGreaterThan(400); // la figure agrandit ce petit insigne (≈ 475 px)
      await openZoom();
      const inDialog = await shown('dialog img.ds-img');
      expect(inDialog.width).toBeGreaterThanOrEqual(inFigure.width - 0.5);
      expect(inDialog.scale).toBeGreaterThanOrEqual(inFigure.scale - 0.002);
    } finally { await ctx.close(); }
  });

  it('R17 — à 1440 px, un scan de fiche tient dans la fenêtre à 100 % du natif au plus et reste centré', async () => {
    await freshWith(1440, UNIT, { datasheet: SCAN });
    try {
      const inFigure = await shown('.hero figure img');
      await openZoom();
      const inDialog = await shown('dialog img.ds-img');
      expect(inDialog.scale).toBeGreaterThanOrEqual(inFigure.scale - 0.002);
      expect(inDialog.scale).toBeLessThanOrEqual(1.001);
      const r = await box('dialog img.ds-img');
      expect(Math.abs(r.x + r.width / 2 - 720)).toBeLessThan(2);
    } finally { await ctx.close(); }
  });
});
