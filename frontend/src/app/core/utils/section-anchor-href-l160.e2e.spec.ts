// @vitest-environment node
// L160 (correction de revue) — les liens d'ancre de section (barres des six fiches, cartes de concepts liés)
// ont un href RÉSOLU qui mène à la bonne page + fragment (jamais « /#x » : <base href="/"> ramènerait à
// l'accueil), le clic simple défile et donne le focus, et un clic du milieu ou avec Ctrl/Méta/Maj n'est pas
// annulé (le navigateur ouvre l'onglet). Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, BrowserContext, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/app/core/utils/section-anchor.ts',
  'src/app/features/lore-concepts/lore-concepts.component.ts',
  'src/app/features/faction-detail/faction-detail.component.ts',
  'src/app/features/primarch-detail/primarch-detail.component.ts',
  'src/app/features/saint-detail/saint-detail.component.ts',
  'src/app/features/ship-detail/ship-detail.component.ts',
  'src/app/features/titan-detail/titan-detail.component.ts',
  'src/app/features/equipment-detail/equipment-detail.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}
vi.setConfig({ testTimeout: 300000, hookTimeout: 60000 });

// Une page par type de lien : le sélecteur des liens d'ancre et la page où ils se trouvent.
const PAGES = [
  { nom: 'concepts (cartes liées)', path: '/lore/concepts', liens: 'a.related-card', attend: 'a.related-card' },
  { nom: 'faction', path: '/factions/orks', liens: 'nav.anchor-nav a', attend: 'nav.anchor-nav a' },
  { nom: 'primarque', path: '/lore/primarchs/lion-eljonson', liens: 'nav.anchor-nav a', attend: 'nav.anchor-nav a' },
  { nom: 'saint', path: '/lore/saints/saint-celestine', liens: 'nav.anchor-nav a', attend: 'nav.anchor-nav a' },
  { nom: 'vaisseau', path: '/lore/ships/phalanx', liens: 'nav.anchor-nav a', attend: 'nav.anchor-nav a' },
  { nom: 'titan', path: '/lore/titans/warhound-titan', liens: 'nav.anchor-nav a', attend: 'nav.anchor-nav a' },
  { nom: 'équipement', path: '/lore/equipment/boltgun-astartes', liens: 'nav.anchor-nav a', attend: 'nav.anchor-nav a' },
];

describe.skipIf(!built || !chromium)('Liens d’ancre de section (navigateur, dist) — L160', () => {
  let server: Server;
  let browser: Browser;
  let base: string;
  let ctx: BrowserContext;
  beforeAll(async () => {
    ({ base, server } = await startDistServer());
    browser = await chromium!.launch();
    ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  });
  afterAll(async () => {
    await ctx?.close();
    await browser?.close();
    server?.close();
  });

  async function ouvre(path: string, attend: string): Promise<Page> {
    const page = await ctx.newPage();
    await page.goto(base + path);
    await page.locator(attend).first().waitFor();
    return page;
  }

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  for (const p of PAGES) {
    it(`${p.nom} — chaque href résolu = page courante + #id d’une section existante (jamais « /#… »)`, async () => {
      const page = await ouvre(p.path, p.attend);
      const liens = await page.locator(p.liens).evaluateAll((as) =>
        (as as HTMLAnchorElement[]).map((a) => ({ href: a.href, cible: document.getElementById(decodeURIComponent(new URL(a.href).hash.slice(1))) != null })),
      );
      expect(liens.length).toBeGreaterThan(0);
      for (const l of liens) {
        expect(l.href).toMatch(new RegExp(`^${base.replace(/[.]/g, '\\.')}${p.path}#[^/]+$`));
        expect(l.cible, l.href).toBe(true);
      }
      await page.close();
    });

    it(`${p.nom} — clic simple : focus sur la section et #id écrit, sans changer de page`, async () => {
      const page = await ouvre(p.path, p.attend);
      const lien = page.locator(p.liens).first();
      const id = await lien.evaluate((a) => decodeURIComponent(new URL((a as HTMLAnchorElement).href).hash.slice(1)));
      await lien.click();
      await page.waitForFunction((i) => document.activeElement?.id === i, id);
      expect(new URL(page.url()).pathname).toBe(p.path);
      expect(new URL(page.url()).hash).toBe(`#${id}`);
      await page.close();
    });

    // Un onglet ouvert en arrière-plan n'expose pas son URL en navigateur sans écran (url() reste vide) : on
    // mesure donc la requête de document qu'il émet (chemin, le fragment n'étant jamais envoyé) ; le href
    // résolu, fragment compris, est vérifié par le premier cas.
    async function ouvreOnglet(page: Page, geste: () => Promise<void>): Promise<string[]> {
      const requetes: string[] = [];
      const noter = (r: import('playwright-core').Request) => { if (r.resourceType() === 'document') requetes.push(new URL(r.url()).pathname); };
      ctx.on('request', noter);
      const nouvelOnglet = ctx.waitForEvent('page', { timeout: 20000 });
      await geste();
      const onglet = await nouvelOnglet;
      await expect.poll(() => requetes.length, { timeout: 20000 }).toBeGreaterThan(0);
      ctx.off('request', noter);
      await onglet.close().catch(() => undefined);
      expect(new URL(page.url()).hash, 'la page d’origine ne bouge pas').toBe('');
      return requetes;
    }

    for (const modifiers of [['Control'], ['Shift']] as const) {
      it(`${p.nom} — ${modifiers.join('+')}+clic ouvre un nouvel onglet sur la bonne page (clic non annulé)`, async () => {
        const page = await ouvre(p.path, p.attend);
        const requetes = await ouvreOnglet(page, () => page.locator(p.liens).first().click({ modifiers: [...modifiers] }));
        expect(requetes).toEqual([p.path]);
        await page.close();
      });
    }

    it(`${p.nom} — clic du milieu : l’onglet ouvert est la bonne page, pas l’accueil`, async () => {
      const page = await ouvre(p.path, p.attend);
      const requetes = await ouvreOnglet(page, () => page.locator(p.liens).first().click({ button: 'middle' }));
      expect(requetes).toEqual([p.path]);
      await page.close();
    });
  }
});
