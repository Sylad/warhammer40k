// @vitest-environment node
// L54 — galerie à 390 px : trois statistiques en trois colonnes égales (plus de 3e pastille
// orpheline de 114 px), libellé 12 px, « COLLECTIONS » tient dans sa pastille.
// Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState(['src/styles.scss', 'src/app/features/gallery/gallery.component.scss', 'src/app/features/gallery/gallery.component.ts']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

describe.skipIf(!built || !chromium)('galerie — statistiques du bandeau à 390 px (navigateur, dist) — L54', () => {
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

  // Balayage px par px (320 → 759), police par défaut 16 et 20 px : « COLLECTIONS » tient partout
  // (WCAG 1.4.10 Reflow, 1.4.3 : le texte ne sort jamais de sa pastille, donc du fond --panel).
  for (const fontSize of [16, 20]) {
    it(`police par défaut ${fontSize} px : aucun libellé ne déborde de 320 à 759 px`, async () => {
      const context = await browser.newContext({ viewport: { width: 320, height: 844 } });
      const page = await context.newPage();
      if (fontSize !== 16) {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Page.setFontSizes', { fontSizes: { standard: fontSize } });
      }
      await page.goto(base + '/gallery');
      await page.locator('.hero-stats .stat-card').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      const bad: string[] = [];
      for (let width = 320; width <= 759; width++) {
        await page.setViewportSize({ width, height: 844 });
        const over = await page.evaluate(() => [...document.querySelectorAll('.hero-stats .stat-label')]
          .map((l) => `${l.textContent!.trim()} +${l.scrollWidth - l.clientWidth}`)
          .filter((s) => !s.endsWith('+0') && !s.endsWith('+-1')));
        if (over.length) bad.push(`${width} px (${over.join(', ')})`);
      }
      await context.close();
      expect(bad).toEqual([]);
    }, 120_000);
  }

  for (const width of [320, 360, 375, 390, 500, 759]) {
    it(`${width} px : libellés sans débordement de leur pastille, pastilles sur une ligne ou alignées`, async () => {
      const page = await browser.newPage();
      await page.setViewportSize({ width, height: 844 });
      await page.goto(base + '/gallery');
      await page.locator('.hero-stats .stat-card').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      const cards = await page.evaluate(() => [...document.querySelectorAll('.hero-stats .stat-card')].map((c) => {
        const r = c.getBoundingClientRect();
        const l = c.querySelector('.stat-label') as HTMLElement;
        return { w: Math.round(r.width * 10) / 10, top: Math.round(r.top), fs: getComputedStyle(l).fontSize, over: l.scrollWidth - l.clientWidth, text: l.textContent };
      }));
      await page.close();
      expect(cards).toHaveLength(3);
      for (const c of cards) expect(c.over, `${c.text} à ${width} px`).toBeLessThanOrEqual(0);
      if (width >= 390) {
        expect(new Set(cards.map((c) => c.top)).size).toBe(1);
        expect(new Set(cards.map((c) => c.w)).size).toBe(1);
        for (const c of cards) expect(c.fs, c.text!).toBe('12px');
      }
    });
  }

  // L60 — de 761 à 1280 px (et au-delà) les trois pastilles sont aussi égales : plus de 3e pastille
  // plus large que les autres (114 px contre 92), sur une seule ligne.
  it('761 → 1600 px : trois pastilles de même largeur, sur une ligne, libellés dans leur pastille', async () => {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 761, height: 900 });
    await page.goto(base + '/gallery');
    await page.locator('.hero-stats .stat-card').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    const bad: string[] = [];
    const widths = [...Array.from({ length: 1280 - 761 + 1 }, (_, i) => 761 + i * 1), 1281, 1440, 1600];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const cards = await page.evaluate(() => [...document.querySelectorAll('.hero-stats .stat-card')].map((c) => {
        const r = c.getBoundingClientRect();
        const l = c.querySelector('.stat-label') as HTMLElement;
        return { w: Math.round(r.width * 10) / 10, top: Math.round(r.top), over: l.scrollWidth - l.clientWidth };
      }));
      const ok = cards.length === 3 && new Set(cards.map((c) => c.w)).size === 1 && new Set(cards.map((c) => c.top)).size === 1 && cards.every((c) => c.over <= 0 && c.w <= 120);
      if (!ok) bad.push(`${width} px (${cards.map((c) => `${c.w}@${c.top}${c.over > 0 ? '!' : ''}`).join(', ')})`);
    }
    await page.close();
    expect(bad).toEqual([]);
  }, 120_000);

  // L60 — le bandeau de statistiques ne prend pas plus de place qu'avant le lot (333 px : 92 + 92 + 113
  // + 2 × 18) : le titre garde sa largeur d'avant (452 px à 1025 px, 707 px à 1280 px).
  it('au-dessus de 1024 px : bandeau de 333 px au plus, titre de largeur inchangée', async () => {
    const page = await browser.newPage();
    await page.goto(base + '/gallery');
    await page.locator('.hero-stats .stat-card').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    const bad: string[] = [];
    for (const [width, h1] of [[1025, 452], [1280, 707]] as const) {
      await page.setViewportSize({ width, height: 900 });
      const m = await page.evaluate(() => ({
        stats: document.querySelector('.hero-stats')!.getBoundingClientRect().width,
        h1: document.querySelector('.hero h1')!.getBoundingClientRect().width,
      }));
      if (m.stats > 333.5 || Math.abs(m.h1 - h1) > 1) bad.push(`${width} px (bandeau ${m.stats}, titre ${m.h1} au lieu de ${h1})`);
    }
    for (const width of [1025, 1100, 1280, 1440, 1600]) {
      await page.setViewportSize({ width, height: 900 });
      const stats = await page.evaluate(() => document.querySelector('.hero-stats')!.getBoundingClientRect().width);
      if (stats > 333.5) bad.push(`${width} px (bandeau ${stats})`);
    }
    await page.close();
    expect(bad).toEqual([]);
  }, 60_000);

  // L63 — mêmes mesures polices web bloquées (repli : le h1 mesure 449 px à 1025 px, pas 452). Seuil
  // relatif : 2 % de 333 px de tolérance sur le bandeau ; le titre doit occuper toute la place que
  // le bandeau MESURÉ lui laisse (grille `minmax(0, 1.1fr) auto`), à 1 px près : sans cela, un
  // max-width ou une marge qui rétrécit le h1 passerait tant que le bandeau n'a pas grossi.
  it('au-dessus de 1024 px, polices web bloquées : bandeau au plus 2 % au-delà de 333 px, titre sur toute la place restante', async () => {
    const page = await browser.newPage();
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await page.goto(base + '/gallery');
    await page.locator('.hero-stats .stat-card').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    const bad: string[] = [];
    for (const width of [1025, 1100, 1280, 1440, 1600]) {
      await page.setViewportSize({ width, height: 900 });
      const m = await page.evaluate(() => {
        const content = document.querySelector('.hero-content') as HTMLElement;
        const cs = getComputedStyle(content);
        const inner = content.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        return {
          inner,
          gap: parseFloat(cs.columnGap) || 0,
          stats: document.querySelector('.hero-stats')!.getBoundingClientRect().width,
          h1: document.querySelector('.hero h1')!.getBoundingClientRect().width,
        };
      });
      const slack = 333 * 0.02; // repli plus large que Cinzel : bandeau de 336 px mesuré
      const room = m.inner - m.gap - m.stats;
      if (m.stats > 333 + slack || Math.abs(m.h1 - room) > 1) bad.push(`${width} px (bandeau ${m.stats}, titre ${m.h1} pour ${room} de place)`);
    }
    await page.close();
    expect(bad).toEqual([]);
  }, 60_000);

  // WCAG 1.4.12 Text Spacing : avec l'espacement imposé par une extension, le texte reste dans
  // la pastille (donc sur le fond --panel qui garantit 4,5:1), quitte à couper le mot.
  it('espacement de texte utilisateur (1.4.12) : le libellé ne sort pas de sa pastille de 320 à 390 px', async () => {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(base + '/gallery');
    await page.locator('.hero-stats .stat-card').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }' });
    const bad: string[] = [];
    for (const width of [320, 340, 360, 375, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const out = await page.evaluate(() => [...document.querySelectorAll('.hero-stats .stat-card')].map((c) => {
        const l = c.querySelector('.stat-label')!;
        const range = document.createRange();
        range.selectNodeContents(l);
        const right = Math.max(...[...range.getClientRects()].map((r) => r.right));
        return `${l.textContent!.trim()} +${Math.round(right - c.getBoundingClientRect().right)}`;
      }).filter((t) => !/\+(-\d+|0)$/.test(t)));
      if (out.length) bad.push(`${width} px (${out.join(', ')})`);
    }
    await page.close();
    expect(bad).toEqual([]);
  });
});
