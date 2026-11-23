// @vitest-environment node
// L99 — revue UX L3, WCAG 4.1.2 (nom, rôle, valeur) : sur /factions, le sélecteur « Tri » n'avait pas de nom accessible
// et les boutons de filtre ne portaient pas leur état (aria-pressed) ; même défaut pour les filtres de type et la
// recherche des unités sur la fiche faction.
// Attendu (demande du lot) : le sélecteur de tri a un nom accessible ; chaque bouton de filtre expose son état pressé,
// vrai sur le seul filtre choisi, et le suit au clic ; un test e2e de chaque contrôle. Lu dans l'arbre d'accessibilité de
// Chromium (getByRole, ariaSnapshot), pas dans les attributs : c'est ce qu'entend un lecteur d'écran.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Locator, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/app/features/factions/factions.component.ts',
  'src/app/features/faction-detail/faction-detail.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}
const CAPTURES = process.env['CAPTURES'];

/** Lignes de l'arbre d'accessibilité d'une zone pour un rôle de contrôle donné SANS nom (`- combobox` sans « "…" »). */
async function controlesSansNom(zone: Locator): Promise<string[]> {
  const arbre = await zone.ariaSnapshot();
  return arbre.split('\n').map((l) => l.trim())
    .filter((l) => /^- (button|combobox|textbox|searchbox|group)\b/.test(l) && !/^- \w+ "/.test(l));
}

/** Pour chaque bouton du groupe : [nom, état] lu dans l'arbre d'accessibilité — 'pressé', 'relâché', ou 'sans état'
 *  (bouton sans aria-pressed, ou absent). */
async function etats(groupe: Locator, noms: string[]): Promise<[string, string][]> {
  const out: [string, string][] = [];
  for (const nom of noms) {
    const pressé = await groupe.getByRole('button', { name: nom, exact: true, pressed: true }).count();
    const relâché = await groupe.getByRole('button', { name: nom, exact: true, pressed: false }).count();
    out.push([nom, pressé === 1 && relâché === 0 ? 'pressé' : relâché === 1 && pressé === 0 ? 'relâché' : 'sans état']);
  }
  return out;
}

/** Attend (le rendu suit le clic d'une image) que le seul bouton pressé soit `choisi`, tous les autres relâchés. */
async function attendreChoix(groupe: Locator, noms: string[], choisi: string): Promise<void> {
  const attendu = noms.map((n) => [n, n === choisi ? 'pressé' : 'relâché']);
  await expect.poll(() => etats(groupe, noms), { timeout: 5000, interval: 50 }).toEqual(attendu);
}

describe.skipIf(!built || !chromium)('contrôles nommés et filtres à état, /factions et fiche faction (navigateur, dist) — L99', () => {
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

  async function ouvrir(adresse: string, largeur: number): Promise<Page> {
    const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: largeur, height: largeur < 600 ? 844 : 900 } });
    await page.route((u) => !u.host.startsWith('127.0.0.1'), (r) => r.abort());
    await page.goto(base + adresse);
    await page.locator('main h1').waitFor();
    return page;
  }

  for (const largeur of [390, 1440]) {
    it(`/factions à ${largeur} px : sélecteur de tri nommé, filtres d'alignement à état`, async () => {
      const page = await ouvrir('/factions', largeur);
      const barre = page.locator('main .toolbar');
      await barre.waitFor();

      // Sélecteur de tri : nom accessible, et il reste utilisable sous ce nom.
      const tri = page.getByRole('combobox', { name: 'Trier les factions' });
      expect(await tri.count()).toBe(1);
      await tri.selectOption('units');
      expect(await tri.inputValue()).toBe('units');
      // Recherche : nommée elle aussi.
      expect(await page.getByRole('searchbox', { name: 'Rechercher une faction' }).count()).toBe(1);

      // Filtres : groupe nommé, un seul bouton pressé, qui suit chaque clic.
      const groupe = page.getByRole('group', { name: 'Alignement' });
      expect(await groupe.count()).toBe(1);
      const noms = ['Toutes les factions', 'Imperium', 'Chaos', 'Xénos'];
      await attendreChoix(groupe, noms, 'Toutes les factions');
      for (const choisi of ['Imperium', 'Chaos', 'Xénos', 'Toutes les factions']) {
        await groupe.getByRole('button', { name: choisi, exact: true }).click();
        await attendreChoix(groupe, noms, choisi);
      }
      // Au clavier aussi (Espace sur le bouton focalisé).
      await groupe.getByRole('button', { name: 'Chaos', exact: true }).focus();
      await page.keyboard.press('Space');
      await attendreChoix(groupe, noms, 'Chaos');

      expect(await controlesSansNom(barre)).toEqual([]);
      if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/l99-factions-${largeur}.png` });
      await page.close();
    }, 60_000);

    it(`fiche faction à ${largeur} px : filtres de type d'unité à état, recherche nommée`, async () => {
      const page = await ouvrir('/factions/space-marines', largeur);
      const barre = page.locator('#units .toolbar');
      await barre.waitFor();

      expect(await page.getByRole('searchbox', { name: 'Rechercher une unité' }).count()).toBe(1);
      const groupe = page.getByRole('group', { name: "Type d'unité" });
      expect(await groupe.count()).toBe(1);
      const noms = ['Tous', 'Infanterie', 'Véhicule', 'Héros', 'Psyker'];
      await attendreChoix(groupe, noms, 'Tous');
      for (const choisi of ['Infanterie', 'Véhicule', 'Héros', 'Psyker', 'Tous']) {
        await groupe.getByRole('button', { name: choisi, exact: true }).click();
        await attendreChoix(groupe, noms, choisi);
      }
      // Le filtre agit bien : « Véhicule » ne garde que des cartes de véhicule.
      await groupe.getByRole('button', { name: 'Véhicule', exact: true }).click();
      await attendreChoix(groupe, noms, 'Véhicule');
      const badges = await page.locator('#units .unit-card .u-badge').allTextContents();
      expect(badges.length).toBeGreaterThan(0);
      expect(new Set(badges.map((b) => b.trim()))).toEqual(new Set(['Véhicule']));
      // Un bouton de filtre n'envoie aucun formulaire (type="button") et se presse au clavier.
      await groupe.getByRole('button', { name: 'Héros', exact: true }).focus();
      await page.keyboard.press('Enter');
      await attendreChoix(groupe, noms, 'Héros');
      expect(await groupe.locator('button:not([type="button"])').count()).toBe(0);

      expect(await controlesSansNom(barre)).toEqual([]);
      if (CAPTURES) {
        await barre.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${CAPTURES}/l99-fiche-faction-${largeur}.png` });
      }
      await page.close();
    }, 60_000);
  }
});
