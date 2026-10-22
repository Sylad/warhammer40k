// @vitest-environment node
// L39 — arrivée sur une ancre : la cible doit apparaître JUSTE SOUS la barre du haut collante
// (entre son bas et bas + 40 px), pas dessous. Le défilement d'ancre du routeur ignore
// scroll-margin-top (window.scrollTo) : décalage global du ViewportScroller. Les pages /plan et
// /nouveautes ont leur propre arrivée (scrollIntoView) : le décalage ne doit pas s'y additionner.
// Navigateur réel sur l'application construite (dist), API servie depuis backend/seed.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import type { Browser, Page } from 'playwright-core';

const FRONTEND = resolve(__dirname, '../../../..');
const SEED = resolve(FRONTEND, '../backend/seed');
const DIST = join(FRONTEND, 'dist/frontend/browser');
const SOURCES = [
  'src/app/app.config.ts',
  'src/app/layout/main-layout/main-layout.component.ts',
  'src/app/features/plan/plan.component.ts',
];
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
};
const FACTIONS = JSON.parse(readFileSync(join(SEED, 'factions.json'), 'utf8'));
const API: Record<string, string> = { '/api/lore/chaos-gods': 'chaos-gods.json', '/api/lore/concepts': 'lore-concepts.json' };
const FICHES: Record<string, string> = {
  primarchs: 'primarchs.json', ships: 'legendary-ships.json', saints: 'living-saints.json',
  equipment: 'equipment.json', 'god-machines': 'god-machines.json',
};
const built = existsSync(join(DIST, 'index.html'));
const stale = built && SOURCES.some((s) => statSync(join(FRONTEND, s)).mtimeMs > statSync(join(DIST, 'index.html')).mtimeMs);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

/**
 * L113 : « page réglée » = état précis, pas `networkidle` (déconseillé par Playwright, fenêtre de 500 ms
 * indifférente à ce que la page attend). Compte les requêtes en vol de la page ; réglée quand il n'y en a
 * plus ET que les polices ne chargent plus, constaté sur deux images successives (le chargement d'une
 * police ou d'une donnée ne part qu'après le rendu qui la réclame).
 */
function trackSettled(page: Page): () => Promise<void> {
  let inflight = 0;
  page.on('request', () => { inflight++; });
  const done = () => { inflight = Math.max(0, inflight - 1); };
  page.on('requestfinished', done);
  page.on('requestfailed', done);
  return async () => {
    for (let calme = 0; calme < 2;) {
      const fontsIdle = await page.evaluate(() => new Promise<boolean>((r) => requestAnimationFrame(() => r(document.fonts.status !== 'loading'))));
      calme = inflight === 0 && fontsIdle ? calme + 1 : 0;
      if (calme < 2) await page.waitForTimeout(50);
    }
  };
}

const news = JSON.parse(readFileSync(join(FRONTEND, 'public/nouveautes-data/nouveautes.json'), 'utf8'));
const plan = JSON.parse(readFileSync(join(FRONTEND, 'public/plan-data/plan.json'), 'utf8'));

describe.skipIf(!built || !chromium)('ancres : la cible arrive sous la barre du haut (navigateur, dist) — L39', () => {
  let server: Server;
  let browser: Browser;
  let base: string;
  beforeAll(async () => {
    server = createServer((req, res) => {
      const path = normalize(decodeURIComponent(new URL(req.url!, 'http://x').pathname));
      if (path.startsWith('/api/')) {
        const fac = /^\/api\/factions\/([\w-]+)$/.exec(path);
        if (fac) {
          res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(FACTIONS.find((x: { id: string }) => x.id === fac[1]) ?? null));
          return;
        }
        if (path === '/api/units' || path === '/api/subfactions') {
          const q = new URL(req.url!, 'http://x').searchParams.get('factionId');
          const all = JSON.parse(readFileSync(join(SEED, path === '/api/units' ? 'units.json' : 'subfactions.json'), 'utf8'));
          res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(all.filter((x: { factionId?: string }) => !q || x.factionId === q)));
          return;
        }
        const fiche = /^\/api\/lore\/(primarchs|ships|saints|equipment|god-machines)\/([\w-]+)$/.exec(path);
        if (fiche) {
          const all = JSON.parse(readFileSync(join(SEED, FICHES[fiche[1]]), 'utf8'));
          res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(all.find((x: { id: string }) => x.id === fiche[2]) ?? null));
          return;
        }
        const f = API[path];
        res.writeHead(200, { 'content-type': 'application/json' }).end(f ? readFileSync(join(SEED, f)) : path.startsWith('/api/demo') || path.startsWith('/api/wiki') ? '{}' : '[]');
        return;
      }
      let file = join(DIST, path);
      if (path.includes('..') || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(readFileSync(file));
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    browser = await chromium!.launch();
  });
  afterAll(async () => {
    await browser?.close();
    server?.close();
  });

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  /** Haut de la cible par rapport au bas de la barre, une fois le défilement fini. */
  async function gap(page: Page, id: string): Promise<{ gap: number; titre: number; bar: number; bottom: boolean; stable: boolean }> {
    await page.waitForFunction((x) => !!document.getElementById(x), id);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    // L105 : la mesure attend une position STABLE (défilement, hauteur de page et haut de la cible
    // inchangés) pendant une fenêtre qui repart tant qu'une police charge (les polices sont retardées de 2,5 s, plus que la fenêtre) — chronométrée
    // sur les images, donc indifférente à la charge de la machine — au lieu de quelques pas de 100 ms
    // qu'un navigateur ralenti franchit avant le reflux ou le défilement différé.
    const stable = await page.evaluate((x) => new Promise<boolean>((done) => {
      const snap = () => `${window.scrollY}|${document.documentElement.scrollHeight}|${document.getElementById(x)?.getBoundingClientRect().top}`;
      const t0 = performance.now();
      let last = snap();
      let since = t0;
      const tick = (now: number) => {
        const cur = snap();
        // Une police en cours de chargement va refluer le texte : la fenêtre repart.
        if (cur !== last || document.fonts.status === 'loading') { last = cur; since = now; }
        // L113 : `true` seulement si la position a vraiment tenu 700 ms ; au plafond (20 s) on rend
        // `false` et le cas échoue en le disant, au lieu de mesurer une position qui bouge encore.
        if (now - since >= 700) done(true);
        else if (now - t0 > 20_000) done(false);
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }), id);
    return page.evaluate((x) => {
      // L89 : sur une fiche à barre d'ancres collée, la cible doit arriver sous l'en-tête ET la barre.
      const nav = document.querySelector('.anchor-nav')?.getBoundingClientRect();
      const bar = Math.max(document.querySelector('.topbar')!.getBoundingClientRect().bottom, nav ? nav.bottom : 0);
      // Bas de page atteint : la cible ne peut pas monter plus haut (page trop courte).
      const bottom = Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 1;
      const cible = document.getElementById(x)!;
      // L164 : le titre de la section (premier h1-h3 de la cible, sinon la cible même) est ce que le visiteur cherche des yeux.
      const titre = (cible.querySelector('h1, h2, h3') ?? cible).getBoundingClientRect().top;
      return { gap: Math.round(cible.getBoundingClientRect().top - bar), titre: Math.round(titre - bar), bar: Math.round(bar), bottom };
    }, id).then((m) => ({ ...m, stable }));
  }

  const cases: [string, (p: Page) => Promise<string>][] = [
    ['Panthéon Chaos, raccourci « Tzeentch »', async (p) => {
      await p.goto(`${base}/lore/chaos-gods`);
      await p.locator('a.quick-link').nth(1).click();
      return 'tzeentch';
    }],
    ['Concepts, carte « Liens inter-concepts »', async (p) => {
      await p.goto(`${base}/lore/concepts`);
      const a = p.locator('a.related-card').last();
      const id = decodeURIComponent((await a.getAttribute('href'))!.split('#')[1]);
      await a.click();
      return id;
    }],
    ['Fiche faction, lien rapide vers #heros', async (p) => {
      await p.goto(`${base}/factions/space-marines`);
      await p.locator('a.row-link[href$="#heros"]').first().click();
      return 'heros';
    }],
    ['Fiche faction, lien rapide vers #subfactions', async (p) => {
      await p.goto(`${base}/factions/space-marines`);
      await p.locator('a.row-link[href$="#subfactions"]').first().click();
      return 'subfactions';
    }],
    ['/plan#<lot>', async (p) => {
      const id = (plan.lots.find((l: { status: string }) => l.status === 'doing') ?? plan.lots[0]).id;
      await p.goto(`${base}/plan#${id}`);
      return id;
    }],
    ['/nouveautes#<entrée>', async (p) => {
      const slug = news.entries.at(-1).slug;
      await p.goto(`${base}/nouveautes#${slug}`);
      return slug;
    }],
  ];

  // L89 : clic sur un lien de la barre d'ancres (scrollIntoView : scroll-margin ET scroll-padding
  // s'additionnent), sur chacune des six fiches.
  const fiches: [string, string][] = [
    ['faction', '/factions/space-marines'], ['primarque', '/lore/primarchs/lion-eljonson'],
    ['vaisseau', '/lore/ships/phalanx'], ['saint', '/lore/saints/saint-celestine'],
    ['titan', '/lore/titans/warhound-titan'], ['équipement', '/lore/equipment/boltgun-astartes'],
  ];
  for (const [nom, url] of fiches) {
    cases.push([`Fiche ${nom}, clic sur la barre d'ancres`, async (p) => {
      await p.goto(`${base}${url}`);
      const links = p.locator('.anchor-nav a');
      await links.first().waitFor();
      const a = links.nth(Math.min(2, (await links.count()) - 1));
      const id = (await a.getAttribute('href'))!.split('#')[1];
      await a.click();
      return id;
    }]);
  }

  for (const [w, h] of [[1440, 900], [390, 844]]) {
    for (const [name, open] of cases) {
      it(`${w} px — ${name} : entre le bas de la barre et +40 px`, async () => {
        const page = await browser.newPage({ viewport: { width: w, height: h } });
        await page.addInitScript(() => localStorage.setItem('wh40k.news.seen-v1', JSON.stringify({ date: '2026-01-01', slugs: [], at: '2026-01-02T10:00:00Z' })));
        // L55 : polices web tardives (2,5 s) — le texte se reflue après l'arrivée sur l'ancre.
        await page.route(/\.(woff2?|ttf)(\?|$)|fonts\.(googleapis|gstatic)/, async (r) => { await new Promise((x) => setTimeout(x, 2500)); await r.continue(); });
        // L113 : données des fiches (unités, sous-factions, primarques, images du wiki) tardives (1,5 s), comme sur une machine chargée :
        // elles ajoutent du contenu au-dessus des sections APRÈS le clic, donc après une position « stable ».
        await page.route(/\/api\/(units|subfactions|lore\/primarchs|wiki-image)(\/|\?|$)/, async (r) => { await new Promise((x) => setTimeout(x, 1500)); await r.continue(); });
        // …et la page ne reçoit son clic qu'une fois réglée (settled) : requêtes terminées, polices chargées.
        const settled = trackSettled(page);
        const goto = page.goto.bind(page);
        page.goto = async (url, opts) => { const r = await goto(url, opts); await settled(); return r; };
        const id = await open(page);
        const m = await gap(page, id);
        await page.close();
        expect(m.stable, `${id} : position encore instable après 20 s d'attente (gap ${m.gap} px mesuré à un instant quelconque)`).toBe(true);
        expect(m.bar).toBeGreaterThan(0);
        expect(m.gap, `${id} : ${m.gap} px sous la barre`).toBeGreaterThanOrEqual(0);
        if (!m.bottom) expect(m.gap, `${id} : ${m.gap} px sous la barre`).toBeLessThanOrEqual(40);
        // L164 R1 — fiches à barre d'ancres : le TITRE de la section visée arrive à moins de 40 px sous la barre.
        if (name.startsWith('Fiche ') && !m.bottom) expect(m.titre, `R1 — ${id} : titre à ${m.titre} px sous la barre`).toBeLessThan(40);
        // L47 : la mesure attend 700 ms de stabilité (20 s au plus) après des polices retardées de 2,5 s :
        // le délai par défaut de 5 s expirait au hasard de la charge de la machine.
      }, 45_000);
    }
  }
});
