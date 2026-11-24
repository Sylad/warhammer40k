// @vitest-environment node
// L255 — suites de L253 (revue UX r3 et QA en prod du 24-11), texte de la page à 200 % (`html { font-size: 200% }`),
// application CONSTRUITE (dist) :
//   S1 — /videos, 320 et 390 px : la valeur de la liste « Trier par » se lit en entier (« Tri : recommand » à 320 px,
//        WCAG 1.4.4) — chaque mot tient dans la largeur du contenu de la liste, et sa hauteur loge toutes ses lignes ;
//   S2 — /romans, 320, 390 et 1440 px : « 30% » et « TERMINÉ » de l'anneau ne se touchent plus (3 px entre les boîtes,
//        4 px de chevauchement des glyphes) et restent dans l'anneau ;
//   S3 — /lore/concepts, 320 et 390 px : aucun nom de concept (h2) ne rétrécit quand le texte grandit (« L'Astronomican »
//        23,6 → 21,4 px à 390 px), ni ne déborde de sa boîte ;
//   S0 — au réglage normal, rien ne change : liste de 44 px, anneau de 100 px, 3 px sous le pourcentage.
// Chromium via playwright-core (sauté s'il manque).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../testing/dist-server';

const { built, stale } = distState(['src/styles/_texte-agrandi.scss', 'src/app/core/utils/titres-ajustes.ts']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

async function ouvrir(browser: Browser, base: string, route: string, width: number): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  await page.locator('#contenu h1').first().waitFor({ timeout: 10_000 });
  return page;
}

async function agrandir(page: Page): Promise<void> {
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  // classes de texte agrandi (sonde de 1rem) puis ajusteur des titres (lots de mutations)
  await page.waitForFunction(() => document.querySelector('app-main-layout')?.classList.contains('texte-plus-grand'));
  await page.evaluate(() => new Promise((r) => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 300)));
}

describe.skipIf(!built || !chromium)('texte à 200 % — suites de L253 (L255)', () => {
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

  it('S1 — /videos : la valeur de « Trier par » se lit en entier à 320 et 390 px ; 44 px au réglage normal (S0)', async () => {
    for (const width of [320, 390]) {
      const page = await ouvrir(browser, base, '/videos', width);
      const tri = () => page.$eval('#contenu select.select', (s) => {
        const sel = s as HTMLSelectElement;
        const cs = getComputedStyle(sel);
        const ctx = document.createElement('canvas').getContext('2d')!;
        ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const texte = sel.selectedOptions[0].text;
        const contenu = sel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const mots = texte.split(/\s+/).map((m) => ctx.measureText(m).width);
        const lignes = Math.ceil(ctx.measureText(texte).width / contenu);
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
        const hauteurUtile = sel.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        return { texte, contenu, motMax: Math.max(...mots), lignes, logees: Math.floor((hauteurUtile + 1) / lh), hauteur: sel.getBoundingClientRect().height };
      });
      expect((await tri()).hauteur, `${width} px, 100 %`).toBe(44);
      await agrandir(page);
      const t = await tri();
      expect(t.texte).toBe('Tri : recommandées');
      expect(t.motMax, `${width} px : mot le plus long`).toBeLessThanOrEqual(t.contenu);
      expect(t.logees, `${width} px : ${t.lignes} ligne(s) à loger`).toBeGreaterThanOrEqual(t.lignes);
      await page.close();
    }
  }, 60_000);

  it('S2 — /romans : « 30% » et « TERMINÉ » séparés et dans l\'anneau, à 320, 390 et 1440 px ; inchangé au réglage normal (S0)', async () => {
    for (const width of [320, 390, 1440]) {
      const page = await ouvrir(browser, base, '/romans', width);
      const anneau = () => page.evaluate(() => {
        const q = (c: string) => document.querySelector(`#contenu .${c}`)!.getBoundingClientRect();
        const [d, p, s] = [q('donut'), q('donut-pct'), q('donut-sub')];
        const fs = parseFloat(getComputedStyle(document.querySelector('#contenu .donut-sub')!).fontSize);
        return { cote: d.width, ecart: s.top - p.bottom, fs, dedans: p.top >= d.top && s.bottom <= d.bottom && s.left >= d.left && s.right <= d.right && p.left >= d.left && p.right <= d.right };
      });
      await page.locator('#contenu .donut-pct').waitFor();
      const normal = await anneau();
      expect([normal.cote, normal.ecart], `${width} px, 100 %`).toEqual([100, 3]);
      await agrandir(page);
      const a = await anneau();
      // l'accent de « TERMINÉ » monte au-dessus de sa boîte : au moins un tiers de sa taille entre les deux
      expect(a.ecart, `${width} px : écart`).toBeGreaterThanOrEqual(a.fs / 3);
      expect(a.dedans, `${width} px : dans l'anneau`).toBe(true);
      await page.close();
    }
  }, 60_000);

  it('S3 — /lore/concepts : aucun nom de concept ne rétrécit à 200 % ni ne déborde, à 320 et 390 px', async () => {
    for (const width of [320, 390]) {
      const page = await ouvrir(browser, base, '/lore/concepts', width);
      await page.evaluate(() => {
        (window as unknown as { __h2: [HTMLElement, number][] }).__h2 = [...document.querySelectorAll<HTMLElement>('#contenu .concept-names h2')]
          .map((e) => [e, parseFloat(getComputedStyle(e).fontSize)]);
      });
      await agrandir(page);
      const ecarts = await page.evaluate(() => (window as unknown as { __h2: [HTMLElement, number][] }).__h2.flatMap(([e, avant]) => {
        const apres = parseFloat(getComputedStyle(e).fontSize);
        const nom = (e.textContent ?? '').trim();
        const out: string[] = [];
        if (apres < avant - 0.25) out.push(`${nom} : ${avant} → ${apres} px`);
        if (e.scrollWidth > e.clientWidth + 1) out.push(`${nom} : déborde (${e.scrollWidth} > ${e.clientWidth})`);
        return out;
      }));
      expect(ecarts, `${width} px`).toEqual([]);
      await page.close();
    }
  }, 60_000);
});
