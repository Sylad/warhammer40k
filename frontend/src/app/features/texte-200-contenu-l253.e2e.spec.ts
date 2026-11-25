// @vitest-environment node
// L253 — texte de la page à 200 % (`html { font-size: 200% }`, comme le réglage de taille de police du navigateur ;
// WCAG 1.4.4 et 1.4.10), application CONSTRUITE (dist). Avant : les tailles de texte du contenu étaient en px, le
// corps des pages ne grandissait pas (rapport 200 % / 100 % = 1,00 pour le texte courant, les titres et les
// libellés, revue UX de L250). Attendu, sur /, /gallery, une fiche unité, /plan et d'autres pages, de 320 à 1440 px :
//   R1 — texte courant (p) : chaque paragraphe visible double (rapport 1,95 à 2,05) ;
//   R2 — titres (h1 à h3) : rapport ≥ 1,9, sauf un titre borné par la largeur de sa colonne (fit-title, L31 : son
//        mot le plus long doit tenir) ou par l'ajusteur des titres (L253 passe 2, `data-titre-borne` sur lui ou un
//        ancêtre, core/utils/titres-ajustes.ts) — alors, sans la borne (`--longest-word: 1`, taille en ligne de
//        l'ajusteur retirée), il atteint 1,9, et il ne déborde pas de sa boîte ;
//   R3 — libellés (boutons, liens, étiquettes, éléments de liste) : rapport ≥ 1,9, sauf dans un titre borné par
//        l'ajusteur (même contrôle que R2) ;
//        Passe 3 (revue de code r2) : un titre borné par l'ajusteur ne descend jamais sous sa taille à 100 % (h1 de
//        /lore/timeline à 320 px : 34 → 32 px) ;
//   R4 — ni la page ni le contenu ne défilent horizontalement (scrollWidth = clientWidth) ;
//   R6 — passe 3 (revue UX r2, N-C1) : le h1 reste nettement un titre — au moins 1,2 fois le texte qui le suit
//        (premier paragraphe après lui dans ses trois blocs parents, comme `texteQuiSuit`) et 1,05 fois chaque h2 ou
//        h3 qui était plus petit que lui à 100 % (à 320 px, h1 de /videos 32 px sous une introduction de 34 px) ;
//        L262 : sauf si son mot le plus long ne tiendrait pas dans sa boîte à 1,2 fois ce texte (pour R2 : à sa
//        taille à 100 %) — aucun mot coupé au milieu d'abord ; jamais sous 0,6 fois sa taille à 100 % ; un sous-titre
//        déjà à 0,6 fois sa taille à 100 % n'a plus à rester sous le h1 ;
//   R7 — passe 3 (revue de code r2) : l'ajusteur ne borne ni un glyphe seul ni un élément tourné (flèche « › » des
//        cartes de la chronologie, restée à 22 px à 200 %) ;
//   R5 — vrai réglage du navigateur (police par défaut à 32 px, CDP Page.setFontSizes) : le texte courant mesure le
//        double de celui d'une police par défaut à 16 px, et aucune page ne défile horizontalement.
// Les mêmes éléments sont mesurés avant et après (références gardées dans la page : le texte repliable ajoute des
// boutons à 200 %). Le rendu au réglage normal est gardé par tailles-texte-rem-l253.spec.ts (aucune taille de texte
// en px) et par l'instantané de component-styles.spec.ts. Chromium via playwright-core (sauté s'il manque).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../testing/dist-server';

const { built, stale } = distState(['src/styles.scss', 'src/styles/_texte-agrandi.scss', 'src/app/core/utils/titres-ajustes.ts']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

const ROUTES = [
  '/', '/gallery', '/units/sm-tactique', '/plan', '/factions/space-marines', '/videos', '/romans', '/lore/timeline',
  '/lore/primarchs/lion-eljonson', '/lore/concepts', '/nouveautes', '/about',
];
const LARGEURS = [1440, 1024, 768, 390, 320];

const TEXTE = '#contenu p';
const TITRES = '#contenu :is(h1, h2, h3)';
const LIBELLES = '#contenu :is(button, a, label, li, dt, dd, th, td, figcaption)';

type Mesure = {
  n: string; avant: number; apres: number; borne?: number; deborde?: boolean; ajuste?: boolean; h1?: boolean; suit?: number;
  /** titres : largeur du mot le plus long (coupable après un trait d'union) et du contenu de la boîte, à `apres` */
  mot?: number; boite?: number;
};

/** L262 : le mot le plus long du titre `x` ne tiendrait pas dans sa boîte à la taille `t` (l'ajusteur ne descend
 *  sous le plancher de R2 ou de R6 qu'alors : un mot coupé au milieu se lit plus mal qu'un titre moins détaché). */
const neTiendraitPas = (x: Mesure, t: number) => !!x.mot && !!x.boite && (x.mot * t) / x.apres > x.boite * 0.97;

async function taille(page: Page, t: string): Promise<void> {
  await page.evaluate((v) => { document.documentElement.style.fontSize = v; }, t);
  // deux images : la classe `texte-agrandi` (L250) suit la sonde de 1rem
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** Retient les éléments visibles et porteurs de texte de chaque groupe, avec leur taille à 100 %. */
async function retenir(page: Page): Promise<void> {
  await page.evaluate(({ TEXTE, TITRES, LIBELLES }) => {
    const visibles = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].filter((e) => {
      if (!e.getClientRects().length || !(e.textContent ?? '').trim()) return false;
      if (e.closest('[hidden], [inert], .sr-only, .visually-hidden')) return false;
      return getComputedStyle(e).visibility !== 'hidden';
    });
    const w = window as unknown as { __l253: Record<string, { e: HTMLElement; avant: number }[]> };
    w.__l253 = Object.fromEntries(Object.entries({ texte: TEXTE, titres: TITRES, libelles: LIBELLES }).map(([k, sel]) =>
      [k, visibles(sel).map((e) => ({ e, avant: parseFloat(getComputedStyle(e).fontSize) }))]));
  }, { TEXTE, TITRES, LIBELLES });
}

async function relire(page: Page): Promise<Record<string, Mesure[]>> {
  return page.evaluate(() => {
    const w = window as unknown as { __l253: Record<string, { e: HTMLElement; avant: number }[]> };
    const nom = (e: HTMLElement) => `${e.tagName.toLowerCase()}${typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : ''} « ${(e.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 28)} »`;
    const out: Record<string, Mesure[]> = {};
    for (const [k, liste] of Object.entries(w.__l253)) {
      out[k] = liste.filter(({ e }) => e.isConnected && e.getClientRects().length).map(({ e, avant }) => {
        const m: Mesure = { n: nom(e), avant, apres: parseFloat(getComputedStyle(e).fontSize) };
        if (k === 'titres') {
          m.ajuste = e.hasAttribute('data-titre-borne');
          const range = document.createRange();
          const marche = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
          m.mot = 0;
          for (let n = marche.nextNode(); n; n = marche.nextNode()) {
            for (const x of (n.textContent ?? '').matchAll(/[^ \t\n\r\f\-‐/]+[-‐/]*/g)) {
              range.setStart(n, x.index!);
              range.setEnd(n, x.index! + x[0].length);
              m.mot = Math.max(m.mot, Array.from(range.getClientRects()).reduce((l, r) => l + r.width, 0));
            }
          }
          const s = getComputedStyle(e);
          m.boite = e.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
          m.h1 = e.tagName === 'H1';
          // texte qui suit (même règle que titres-ajustes.ts → texteQuiSuit)
          let bloc = e.parentElement;
          const racine = document.querySelector('#contenu');
          for (let i = 0; m.h1 && bloc && i < 3 && m.suit === undefined; i++, bloc = bloc === racine ? null : bloc.parentElement) {
            const p = [...bloc.querySelectorAll<HTMLElement>('p')].find((x) => (e.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING)
              && x.getClientRects().length && (x.textContent ?? '').trim());
            if (p) m.suit = parseFloat(getComputedStyle(p).fontSize);
          }
        }
        if ((k === 'titres' || k === 'libelles') && m.apres / avant < 1.9) {
          // Titre borné par sa colonne (fit-title, L31 ; ou ajusteur des titres, `data-titre-borne`, L253 passe 2 :
          // le mot le plus long tient dans sa boîte) ? Sans la borne, il doit atteindre le double, et ne pas déborder.
          const ajuste = e.closest<HTMLElement>('[data-titre-borne]');
          if (k === 'titres' || ajuste) {
            const style = e.getAttribute('style');
            const styleAjuste = ajuste?.getAttribute('style') ?? null;
            if (k === 'titres') e.style.setProperty('--longest-word', '1');
            ajuste?.style.removeProperty('font-size');
            m.borne = parseFloat(getComputedStyle(e).fontSize);
            if (style === null) e.removeAttribute('style'); else e.setAttribute('style', style);
            if (ajuste && ajuste !== e) { if (styleAjuste === null) ajuste.removeAttribute('style'); else ajuste.setAttribute('style', styleAjuste); }
            m.deborde = e.scrollWidth > e.clientWidth + 1;
          }
        }
        return m;
      });
    }
    return out;
  }) as Promise<Record<string, Mesure[]>>;
}

describe.skipIf(!built || !chromium)('contenu — texte de la page à 200 % (navigateur, dist) — L253', () => {
  let server: Server;
  let browser: Browser;
  beforeAll(async () => {
    const s = await startDistServer();
    server = s.server;
    (globalThis as { __base?: string }).__base = s.base;
    browser = await chromium!.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  });
  afterAll(async () => {
    await browser?.close();
    server?.close();
  });

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  for (const route of ROUTES) {
    it(`${route} : texte, titres et libellés doublent ; aucun défilement horizontal (320 à 1440 px)`, async () => {
      const context = await browser.newContext({ viewport: { width: LARGEURS[0], height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
      await page.goto(`${(globalThis as { __base?: string }).__base}${route}`, { waitUntil: 'networkidle' });
      await page.locator('#contenu h1').first().waitFor({ timeout: 10_000 });
      // Des boutons ont `transition: all` : leur taille de police s'anime, on mesure la valeur d'arrivée.
      await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
      const ecarts: string[] = [];
      let paragraphes = 0;
      let titres = 0;
      for (const width of LARGEURS) {
        await page.setViewportSize({ width, height: 900 });
        await taille(page, '100%');
        await retenir(page);
        await taille(page, '200%');
        const m = await relire(page);
        paragraphes += m.texte.length;
        titres += m.titres.length;
        for (const x of m.texte) {
          const r = x.apres / x.avant;
          if (r < 1.95 || r > 2.05) ecarts.push(`R1 ${width} px ${x.n} ${x.avant} → ${x.apres} px`);
        }
        for (const x of m.titres) {
          if (x.ajuste && x.apres < x.avant - 0.5 && !neTiendraitPas(x, x.avant)) ecarts.push(`R2 ${width} px ${x.n} borné sous sa taille à 100 % : ${x.avant} → ${x.apres} px`);
          if (x.apres < 0.6 * x.avant - 0.5) ecarts.push(`R2 ${width} px ${x.n} sous 0,6 fois sa taille à 100 % : ${x.avant} → ${x.apres} px`);
          if (x.h1 && x.suit && x.apres < 1.2 * x.suit && !neTiendraitPas(x, 1.2 * x.suit)) ecarts.push(`R6 ${width} px ${x.n} ${x.apres} px, texte qui suit ${x.suit} px`);
          for (const y of m.titres) {
            // (un sous-titre déjà à 0,6 fois sa taille à 100 % ne descend plus : L262)
            if (x.h1 && !y.h1 && y.avant < x.avant && x.apres < 1.05 * y.apres - 0.02 && y.apres > 0.6 * y.avant + 0.3) ecarts.push(`R6 ${width} px ${x.n} ${x.apres} px ≤ ${y.n} ${y.apres} px`);
          }
          if (x.apres / x.avant >= 1.9) continue;
          if (x.borne === undefined || x.borne / x.avant < 1.9 || x.deborde) ecarts.push(`R2 ${width} px ${x.n} ${x.avant} → ${x.apres} px (sans borne ${x.borne}, déborde ${x.deborde})`);
        }
        for (const x of m.libelles) {
          if (!(x.apres / x.avant < 1.9)) continue; // (0 → 0 px : bouton à texte masqué, comme avant)
          if (x.borne === undefined || x.borne / x.avant < 1.9 || x.deborde) ecarts.push(`R3 ${width} px ${x.n} ${x.avant} → ${x.apres} px (sans borne ${x.borne}, déborde ${x.deborde})`);
        }
        const d = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (d > 0) ecarts.push(`R4 ${width} px : la page défile de ${d} px`);
        const glyphes = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('#contenu [data-titre-borne]')]
          .filter((e) => [...(e.textContent ?? '').trim()].length <= 1 || !/^(none|matrix\(1, 0, 0, 1,.*)$/.test(getComputedStyle(e).transform))
          .map((e) => `${e.tagName.toLowerCase()}.${e.className} « ${(e.textContent ?? '').trim()} »`));
        for (const g of glyphes) ecarts.push(`R7 ${width} px ${g} borné`);
      }
      await context.close();
      expect(paragraphes, 'paragraphes mesurés').toBeGreaterThan(0);
      expect(titres, 'titres mesurés').toBeGreaterThan(0);
      expect(ecarts.slice(0, 20)).toEqual([]);
    }, 120_000);
  }

  for (const route of ROUTES) {
    it(`R5 — ${route}, police par défaut du navigateur à 32 px : texte courant double, aucun défilement horizontal`, async () => {
      const ouvrir = async (defaut: number) => {
        const context = await browser.newContext({ viewport: { width: LARGEURS[0], height: 900 }, reducedMotion: 'reduce' });
        const page = await context.newPage();
        if (defaut !== 16) await (await context.newCDPSession(page)).send('Page.setFontSizes', { fontSizes: { standard: defaut } });
        await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
        await page.goto(`${(globalThis as { __base?: string }).__base}${route}`, { waitUntil: 'networkidle' });
        await page.locator('#contenu h1').first().waitFor({ timeout: 10_000 });
        await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
        return { context, page };
      };
      const tailles = (page: Page) => page.evaluate((sel) => [...new Set([...document.querySelectorAll<HTMLElement>(sel)]
        .filter((e) => e.getClientRects().length && (e.textContent ?? '').trim())
        .map((e) => Math.round(parseFloat(getComputedStyle(e).fontSize) * 10) / 10))].sort((a, b) => a - b), TEXTE);
      const normal = await ouvrir(16);
      const grand = await ouvrir(32);
      const ecarts: string[] = [];
      for (const width of LARGEURS) {
        await normal.page.setViewportSize({ width, height: 900 });
        await grand.page.setViewportSize({ width, height: 900 });
        await grand.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const a = await tailles(normal.page);
        const b = await tailles(grand.page);
        const doubles = a.map((v) => Math.round(v * 20) / 10);
        if (!a.length || b.some((v) => !doubles.some((d) => Math.abs(d - v) <= 0.2))) ecarts.push(`${width} px : texte ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
        const d = await grand.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (d > 0) ecarts.push(`${width} px : la page défile de ${d} px`);
      }
      await normal.context.close();
      await grand.context.close();
      expect(ecarts).toEqual([]);
    }, 120_000);
  }
});
