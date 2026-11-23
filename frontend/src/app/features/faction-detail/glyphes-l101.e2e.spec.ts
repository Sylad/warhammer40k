// @vitest-environment node
// L101 — suites de L81/L83/L86 (revue UX L3, WCAG 1.1.1 et 1.3.1) : sur /factions et les fiches faction, les glyphes
// décoratifs (✠ des titres, ⚔, ⌚ ⊛ ▤ ⚜ ☗ ☖ ✎, flèches → et ›, symbole de la faction) étaient lus par les lecteurs
// d'écran (« croix de Malte Histoire & Lore », « flèche droite »). Attendu : aucun n'est dans l'arbre d'accessibilité
// (aria-hidden, ou texte de remplacement quand le glyphe porte un sens — aucun ici : chacun double un texte voisin).
// Et « 41e » sous un parent en capitales s'affiche et se lit « 41ᵉ » (exposant minuscule), jamais « 41E ».
// Lu dans l'arbre d'accessibilité de Chromium (ariaSnapshot) : c'est ce qu'entend un lecteur d'écran.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/app/features/factions/factions.component.ts',
  'src/app/features/faction-detail/faction-detail.component.ts',
  'src/styles.scss',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

const FACTIONS = (JSON.parse(readFileSync(resolve(__dirname, '../../../../../backend/seed/factions.json'), 'utf8')) as { id: string }[])
  .map((f) => f.id);

/** Symboles « autres » d'Unicode (✠ ⚔ ⌚ ⊛ ⚠ ▤ ⚜ ▶ ▦…, symboles des factions), flèches et guillemet simple › de rangée. */
const GLYPHE = /[\p{So}←-⇿›]/u;

/** Lignes de l'arbre d'accessibilité de `main` qui contiennent un glyphe. */
async function glyphesLus(page: Page): Promise<string[]> {
  const arbre = await page.locator('main').ariaSnapshot();
  return arbre.split('\n').map((l) => l.trim()).filter((l) => GLYPHE.test(l));
}

/** Indications (placeholder) d'un champ qui contiennent une flèche : lues comme description par certains lecteurs. */
async function indicationsFlechees(page: Page): Promise<string[]> {
  return page.locator('main [placeholder]').evaluateAll((els) =>
    els.map((e) => e.getAttribute('placeholder') ?? '').filter((p) => /[←-⇿]/.test(p)));
}

describe.skipIf(!built || !chromium)('glyphes décoratifs hors de l\'arbre d\'accessibilité, « 41ᵉ » (navigateur, dist) — L101', () => {
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

  async function ouvrir(page: Page, adresse: string): Promise<void> {
    await page.goto(base + adresse);
    await page.locator('main h1').waitFor();
  }

  async function nouvellePage(largeur: number): Promise<Page> {
    const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: largeur, height: largeur < 600 ? 844 : 900 } });
    await page.route((u) => !u.host.startsWith('127.0.0.1'), (r) => r.abort());
    return page;
  }

  for (const largeur of [390, 1440]) {
    it(`/factions à ${largeur} px : aucun glyphe lu, « 41ᵉ » affiché et lu en exposant minuscule`, async () => {
      const page = await nouvellePage(largeur);
      try {
        await ouvrir(page, '/factions');
        await page.locator('main .grid a.card').first().waitFor();
        expect(await glyphesLus(page)).toEqual([]);

        const arbre = await page.locator('main').ariaSnapshot();
        // Lu : l'exposant est un nœud « superscript » de texte « e » minuscule, juste après « 41 » (accroche et encart).
        expect(arbre).not.toMatch(/41E|superscript: E/);
        const lignes = arbre.split('\n').map((l) => l.trim());
        const exposants = lignes.flatMap((l, i) => (l.startsWith('- superscript') ? [`${lignes[i - 1]} | ${l}`] : []));
        expect(exposants.length).toBeGreaterThan(0);
        for (const e of exposants) expect(e).toMatch(/ 41 \| - superscript: e$/);

        // Affiché : le rendu (innerText applique text-transform) garde « e » minuscule, en exposant.
        const eyebrow = page.locator('main .eyebrow');
        expect(await eyebrow.innerText()).toContain('41e');
        const sup = eyebrow.locator('sup');
        expect(await sup.evaluate((e) => getComputedStyle(e).textTransform)).toBe('none');
        expect(await sup.evaluate((e) => getComputedStyle(e).verticalAlign)).toBe('super');
        for (const s of await page.locator('main sup').all()) expect(await s.innerText()).toBe('e');

        // La carte de faction se lit une fois par son nom (emblème décoratif, alt vide).
        const carte = page.locator('main .grid a.card').first();
        const nom = (await carte.locator('h2').evaluate((h) => h.textContent ?? '')).trim();
        const nomCarte = await carte.evaluate((a) => a.textContent ?? '');
        expect(nomCarte.split(nom).length - 1).toBe(1);
        expect(await page.locator('main .card-sigil img:not([alt=""])').count()).toBe(0);
      } finally {
        await page.close();
      }
    });
  }

  it(`chaque fiche faction (${FACTIONS.length}) à 1440 px : aucun glyphe décoratif lu, aucune flèche dans une indication`, async () => {
    const page = await nouvellePage(1440);
    try {
      const fautes: Record<string, string[]> = {};
      for (const id of FACTIONS) {
        await ouvrir(page, `/factions/${id}`);
        await page.locator('main .sidebar .sp').first().waitFor();
        await page.waitForLoadState('networkidle');
        const lus = [...await glyphesLus(page), ...(await indicationsFlechees(page)).map((p) => `placeholder: ${p}`)];
        if (lus.length) fautes[id] = lus;
      }
      expect(fautes).toEqual({});
    } finally {
      await page.close();
    }
  }, 120000);

  it('fiche Space Marines à 390 px : aucun glyphe décoratif lu (titres, liens rapides, cartes, « Voir toutes les unités »)', async () => {
    const page = await nouvellePage(390);
    try {
      await ouvrir(page, '/factions/space-marines');
      await page.locator('main .sf-card').first().waitFor();
      await page.waitForLoadState('networkidle');
      // Les glyphes sont bien rendus à l'écran : le test ne passe pas parce qu'ils auraient disparu.
      expect(await page.locator('main .t-flourish').count()).toBeGreaterThan(3);
      expect(await page.locator('main .rl-ico').count()).toBeGreaterThan(0);
      expect(await glyphesLus(page)).toEqual([]);
      // Titre de section : lu sans la croix.
      await expect.poll(() => page.getByRole('heading', { level: 2, name: 'Histoire & Lore', exact: true }).count()).toBe(1);
    } finally {
      await page.close();
    }
  });
});
