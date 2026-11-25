// @vitest-environment node
// L259 — /lore/concepts, le h1 « Concepts & Lieux Sacrés » au téléphone (WCAG 1.4.10 et 1.4.4, règle des titres du
// site, core/utils/titres-ajustes.ts). Avant : texte de la page à 200 %, l'ajusteur des titres portait le h1 à 1,1 fois
// le plus grand nom de concept (« Le Warp », h2 à 64 px), soit 70,4 px : « CONC|EPTS » coupé au milieu, sans trait, à
// 320 et 390 px. Attendu, application construite (dist), polices web bloquées :
//   H1 — à 320 et 390 px, au réglage normal et à 200 %, chaque mot du h1 tient sur sa ligne (« Concepts » en un seul
//        morceau) et dans la boîte du h1 ;
//   H2 — à 200 %, la taille des noms de concepts ne force plus celle du h1 : le h1 reste au-dessus d'eux (1,05 fois au
//        moins, R6 de L253) parce qu'ils redescendent, jamais sous leur taille au réglage normal ;
//   H3 — à 1440 px, rien ne change : h1 de 60 px (120 px à 200 %), noms de concepts de 32 px (64 px à 200 %).
// Chromium via playwright-core (sauté s'il manque).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState(['src/styles/_texte-agrandi.scss', 'src/app/core/utils/titres-ajustes.ts', 'src/app/features/lore-concepts/lore-concepts.component.scss']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

type Mesure = { h1: number; boite: number; mots: { mot: string; morceaux: number; largeur: number }[]; h2: { nom: string; taille: number }[] };

async function ouvrir(browser: Browser, base: string, width: number): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(`${base}/lore/concepts`, { waitUntil: 'networkidle' });
  await page.locator('#contenu h1').waitFor({ timeout: 10_000 });
  await page.locator('#contenu .concept-names h2').first().waitFor({ timeout: 10_000 });
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
  return page;
}

async function agrandir(page: Page): Promise<void> {
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await page.waitForFunction(() => document.querySelector('app-main-layout')?.classList.contains('texte-plus-grand'));
  await page.evaluate(() => new Promise((r) => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 300)));
}

const mesurer = (page: Page) => page.evaluate((): Mesure => {
  const h1 = document.querySelector<HTMLElement>('#contenu h1')!;
  const s = getComputedStyle(h1);
  const range = document.createRange();
  const mots: Mesure['mots'] = [];
  const marche = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
  for (let n = marche.nextNode(); n; n = marche.nextNode()) {
    for (const m of (n.textContent ?? '').matchAll(/\S+/g)) {
      range.setStart(n, m.index!);
      range.setEnd(n, m.index! + m[0].length);
      const rects = Array.from(range.getClientRects());
      mots.push({ mot: m[0], morceaux: rects.length, largeur: rects.reduce((l, r) => l + r.width, 0) });
    }
  }
  return {
    h1: parseFloat(s.fontSize),
    boite: h1.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight),
    mots,
    h2: [...document.querySelectorAll<HTMLElement>('#contenu .concept-names h2')]
      .map((e) => ({ nom: (e.textContent ?? '').trim(), taille: parseFloat(getComputedStyle(e).fontSize) })),
  };
});

/** Écarts H1 : un mot coupé en plusieurs morceaux, ou plus large que la boîte du h1. */
const motsCoupes = (m: Mesure, ou: string) => m.mots
  .filter((x) => x.morceaux !== 1 || x.largeur > m.boite + 0.5)
  .map((x) => `${ou} : « ${x.mot} » en ${x.morceaux} morceau(x), ${x.largeur.toFixed(1)} px pour ${m.boite} px (h1 ${m.h1} px)`);

describe.skipIf(!built || !chromium)('/lore/concepts — le h1 ne se coupe plus au milieu d\'un mot (L259)', () => {
  let browser: Browser;
  let server: Server;
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

  it('H1, H2 — 320 et 390 px : « Concepts » tient sur sa ligne, au réglage normal et à 200 % ; le h1 reste au-dessus des noms', async () => {
    const ecarts: string[] = [];
    for (const width of [320, 390]) {
      const page = await ouvrir(browser, base, width);
      const normal = await mesurer(page);
      expect(normal.mots.map((x) => x.mot)).toContain('Concepts');
      ecarts.push(...motsCoupes(normal, `${width} px, 100 %`));
      await agrandir(page);
      const grand = await mesurer(page);
      ecarts.push(...motsCoupes(grand, `${width} px, 200 %`));
      if (grand.h1 < normal.h1 - 0.25) ecarts.push(`${width} px : h1 ${normal.h1} → ${grand.h1} px à 200 %`);
      grand.h2.forEach((x, i) => {
        if (grand.h1 < 1.05 * x.taille) ecarts.push(`${width} px, 200 % : h1 ${grand.h1} px ≤ « ${x.nom} » ${x.taille} px`);
        if (x.taille < normal.h2[i].taille - 0.25) ecarts.push(`${width} px : « ${x.nom} » ${normal.h2[i].taille} → ${x.taille} px à 200 %`);
      });
      await page.close();
    }
    expect(ecarts).toEqual([]);
  }, 60_000);

  it('H3 — 1440 px : h1 de 60 px (120 px à 200 %), noms de 32 px (64 px à 200 %)', async () => {
    const page = await ouvrir(browser, base, 1440);
    const normal = await mesurer(page);
    await agrandir(page);
    const grand = await mesurer(page);
    await page.close();
    expect([normal.h1, grand.h1]).toEqual([60, 120]);
    expect(new Set(normal.h2.map((x) => x.taille))).toEqual(new Set([32]));
    expect(new Set(grand.h2.map((x) => x.taille))).toEqual(new Set([64]));
    expect([...motsCoupes(normal, '1440 px, 100 %'), ...motsCoupes(grand, '1440 px, 200 %')]).toEqual([]);
  }, 60_000);
});
