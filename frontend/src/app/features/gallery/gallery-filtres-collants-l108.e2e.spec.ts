// @vitest-environment node
// L108 — navigateur réel, application construite (dist), données du seed (dist-server) : au bureau, le panneau Filtres
// suit à nouveau le défilement (collant) sans jamais recouvrir « Artistes à découvrir » / « Collections populaires »
// (régression de L49, revue UX du 12-10). Rectangles mesurés après 800 et 1200 px de défilement et en bas de page ;
// chaque bouton de l'aside reste atteignable au clavier, visible et non recouvert. 1024 et 390 px : rien ne se recouvre.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState(['src/styles.scss', 'src/styles/_gallery-filtres.scss', 'src/app/features/gallery/gallery.component.scss', 'src/app/features/gallery/gallery.component.ts']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

type Rect = { top: number; bottom: number; left: number; right: number };
type Mesure = {
  y: number; position: string; filtres: Rect; aside: Rect; panneaux: { titre: string; visible: Rect | null; dessus: boolean }[];
  filtresDessus: boolean; debord: number;
};

/** Mesure dans la page : rectangles, partie visible de chaque panneau de l'aside (coupée par son défilement et la fenêtre), élément au centre. */
function mesurer(): Mesure {
  const box = (e: Element): Rect => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
  const f = document.querySelector('[data-testid="panneau-filtres"]')!;
  const aside = document.querySelector('.sidebar')!;
  const a = box(aside);
  // la barre fixe du site couvre le haut de la fenêtre (scroll-padding-top) : ce qui passe dessous n'est pas « recouvert par les Filtres »
  const barre = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const clip = { top: Math.max(barre, a.top), bottom: Math.min(innerHeight, a.bottom) };
  const panneaux = [...aside.querySelectorAll('.side-panel')].map((p) => {
    const r = box(p);
    const top = Math.max(r.top, clip.top), bottom = Math.min(r.bottom, clip.bottom);
    if (bottom - top < 4) return { titre: p.querySelector('h3')!.textContent!.trim(), visible: null, dessus: true };
    const x = (r.left + r.right) / 2;
    const pts = [top + 2, (top + bottom) / 2, bottom - 2].map((yy) => document.elementFromPoint(x, yy));
    return { titre: p.querySelector('h3')!.textContent!.trim(), visible: { top, bottom, left: r.left, right: r.right }, dessus: pts.every((e) => !!e && p.contains(e)) };
  });
  const fr = box(f);
  const fy = (Math.max(barre, fr.top) + Math.min(innerHeight, fr.bottom)) / 2;
  const fe = document.elementFromPoint((fr.left + fr.right) / 2, fy);
  return {
    y: scrollY, position: getComputedStyle(f).position, filtres: fr, aside: a, panneaux,
    filtresDessus: !!fe && f.contains(fe), debord: document.documentElement.scrollWidth - innerWidth,
  };
}

const intersecte = (a: Rect, b: Rect) => Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5 && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5;

describe.skipIf(!built || !chromium)('galerie — Filtres collant sans recouvrir Artistes / Collections (L108, navigateur, dist)', () => {
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

  async function open(width: number, height: number): Promise<Page> {
    const page = await browser.newPage();
    page.setDefaultTimeout(6000);
    await page.setViewportSize({ width, height });
    await page.goto(base + '/gallery');
    await page.locator('[data-testid="grille-oeuvres"]').waitFor();
    await page.locator('.sidebar .col-row').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    return page;
  }
  async function aller(page: Page, y: number): Promise<Mesure> {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(150);
    return page.evaluate(mesurer);
  }
  function sansRecouvrement(m: Mesure) {
    const s = JSON.stringify(m);
    expect(m.panneaux.length, s).toBe(2);
    for (const p of m.panneaux) {
      if (!p.visible) continue;
      expect(intersecte(p.visible, m.filtres), `${p.titre} recouvre / est recouvert par Filtres : ${s}`).toBe(false);
      expect(p.dessus, `${p.titre} recouvert : ${s}`).toBe(true);
    }
  }

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  for (const [w, h] of [[1440, 900], [1440, 700], [1300, 1000], [1920, 1080], [1025, 800]] as const) {
    for (const y of [800, 1200]) {
      it(`${w}×${h}, ${y} px de défilement : Filtres collant, entièrement visible sous la barre, sans recouvrir Artistes / Collections`, async () => {
        const page = await open(w, h);
        const m = await aller(page, y);
        await page.close();
        const s = JSON.stringify(m);
        expect(m.y, s).toBe(y);
        expect(m.position, s).toBe('sticky');
        expect(m.filtres.top, s).toBeGreaterThanOrEqual(90);
        expect(m.filtres.top, s).toBeLessThanOrEqual(100);
        expect(m.filtres.bottom, s).toBeLessThanOrEqual(h);
        expect(m.filtresDessus, s).toBe(true);
        // l'aside suit aussi, juste sous les Filtres (pas sorti par le haut)
        expect(m.aside.top, s).toBeGreaterThanOrEqual(m.filtres.bottom);
        expect(m.aside.top - m.filtres.bottom, s).toBeLessThanOrEqual(30);
        expect(m.aside.bottom, s).toBeLessThanOrEqual(h);
        sansRecouvrement(m);
      }, 30_000);
    }

    it(`${w}×${h}, bas de page : Filtres et aside remontent ensemble, aucun recouvrement`, async () => {
      const page = await open(w, h);
      const m = await aller(page, 1e6);
      await page.close();
      expect(m.aside.top, JSON.stringify(m)).toBeGreaterThanOrEqual(m.filtres.bottom);
      sansRecouvrement(m);
    }, 30_000);
  }

  it('1440×900, défilement à 1200 px : chaque bouton de l\'aside, atteint au clavier, est visible et non recouvert', async () => {
    const page = await open(1440, 900);
    await aller(page, 1200);
    // L108 r1 : au bureau, 4 artistes (les 5e et 6e ne sont pas rendus) + les collections
    const n = await page.locator('.sidebar button:visible').count();
    expect(n).toBeGreaterThan(6);
    const fautes: string[] = [];
    for (let i = 0; i < n; i++) {
      await page.locator('.sidebar button:visible').nth(i).focus();
      await page.waitForTimeout(30);
      const r = await page.evaluate((k) => {
        const b = [...document.querySelectorAll<HTMLElement>('.sidebar button')].filter((x) => x.getClientRects().length > 0)[k];
        const x = b.getBoundingClientRect();
        const f = document.querySelector('[data-testid="panneau-filtres"]')!.getBoundingClientRect();
        const e = document.elementFromPoint(x.left + x.width / 2, x.top + x.height / 2);
        return { t: b.textContent!.trim().slice(0, 30), top: x.top, bottom: x.bottom, fb: f.bottom, dessus: !!e && b.contains(e), y: scrollY };
      }, i);
      if (r.top < r.fb - 0.5 || r.bottom > 900 + 0.5 || !r.dessus) fautes.push(JSON.stringify(r));
    }
    await page.close();
    expect(fautes).toEqual([]);
  }, 60_000);

  for (const [w, h] of [[1024, 768], [390, 844]] as const) {
    it(`${w}×${h} : Filtres dans le flux (non collant), aside sous la grille, jamais de recouvrement ni de défilement horizontal`, async () => {
      const page = await open(w, h);
      const mesures: Mesure[] = [];
      for (const y of [0, 800, 1200, 1e6]) mesures.push(await aller(page, y));
      await page.close();
      for (const m of mesures) {
        const s = JSON.stringify(m);
        expect(m.position, s).toBe('static');
        expect(m.debord, s).toBeLessThanOrEqual(0);
        if (m.filtres.bottom > m.filtres.top) expect(m.aside.top, s).toBeGreaterThanOrEqual(m.filtres.bottom);
        sansRecouvrement(m);
      }
    }, 30_000);
  }
  // ——— Revue UX du 23-11 (rapport ux-wh-L108) : un cas par défaut, écrit d'après le rapport ———

  /** Éléments de l'aside qui défilent (l'aside lui-même ou une liste) : débordement, position, indice visible. */
  function defilants() {
    const aside = document.querySelector('.sidebar') as HTMLElement;
    return [aside, ...aside.querySelectorAll<HTMLElement>('*')]
      .filter((e) => { const o = getComputedStyle(e).overflowY; return o === 'auto' || o === 'scroll'; })
      .map((e) => {
        const cs = getComputedStyle(e);
        const masque = cs.maskImage || (cs as unknown as { webkitMaskImage?: string }).webkitMaskImage || 'none';
        return {
          classe: e.className, deborde: e.scrollHeight - e.clientHeight, auBout: e.scrollTop + e.clientHeight >= e.scrollHeight - 1,
          masque, gouttiere: cs.scrollbarGutter, overscroll: cs.overscrollBehaviorY,
        };
      });
  }

  it('M1 — 1440×700 et 1440×900, 800 px : la molette sur Artistes / Collections finit toujours par faire défiler la page', async () => {
    for (const [w, h] of [[1440, 900], [1440, 700]] as const) {
      const page = await open(w, h);
      await aller(page, 800);
      const a = await page.locator('.sidebar').boundingBox();
      await page.mouse.move(a!.x + a!.width / 2, a!.y + Math.min(a!.height, h - a!.y) / 2);
      const ys: number[] = [];
      for (let i = 0; i < 6; i++) {
        await page.mouse.wheel(0, 120);
        await page.waitForTimeout(250);
        ys.push(await page.evaluate(() => scrollY));
      }
      // la colonne peut défiler d'abord (au plus deux crans), puis la page reprend : jamais bloquée à 800
      const d = await page.evaluate(defilants);
      await page.close();
      expect(ys[5], `${w}×${h} : ${JSON.stringify({ ys, d })}`).toBeGreaterThan(800 + 120);
      for (const e of d) expect(e.overscroll, `${w}×${h} : ${JSON.stringify(e)}`).not.toBe('contain');
    }
  }, 60_000);

  it('M2 — 1440×900, 800 px : toute la colonne Artistes / Collections est visible, sans défilement interne', async () => {
    const page = await open(1440, 900);
    const m = await aller(page, 800);
    const d = await page.evaluate(defilants);
    const boutons = await page.evaluate(() => [...document.querySelectorAll('.sidebar button')].filter((b) => b.getClientRects().length > 0).map((b) => {
      const r = b.getBoundingClientRect();
      const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { t: b.textContent!.trim().slice(0, 24), top: r.top, bottom: r.bottom, dessus: !!e && b.contains(e) };
    }));
    await page.close();
    const s = JSON.stringify({ m, d });
    for (const e of d) expect(e.deborde, s).toBeLessThanOrEqual(1);
    expect(m.aside.bottom, s).toBeLessThanOrEqual(900);
    expect(boutons.length, s).toBeGreaterThan(4);
    for (const b of boutons) {
      expect(b.bottom, JSON.stringify(b)).toBeLessThanOrEqual(900);
      expect(b.dessus, JSON.stringify(b)).toBe(true);
    }
  }, 30_000);

  for (const [w, h, nom] of [[1440, 700, '1440×700'], [1152, 720, 'zoom 125 % (1152×720)'], [1025, 800, '1025×800']] as const) {
    it(`M2 — ${nom}, 800 px : le titre de chaque section reste visible, et ce qui défile le montre (fondu, gouttière stable)`, async () => {
      const page = await open(w, h);
      const m = await aller(page, 800);
      const titres = await page.evaluate(() => [...document.querySelectorAll('.sidebar .side-panel h3')].map((t) => {
        const r = t.getBoundingClientRect();
        const e = document.elementFromPoint(r.left + 8, r.top + r.height / 2);
        return { t: t.textContent!.trim(), top: r.top, bottom: r.bottom, dessus: !!e && t.contains(e) };
      }));
      const avant = await page.evaluate(defilants);
      // au bout de chaque liste qui défile, le fondu disparaît (la dernière ligne se lit en entier)
      await page.evaluate(() => {
        const aside = document.querySelector('.sidebar')!;
        for (const e of [aside, ...aside.querySelectorAll('*')] as HTMLElement[]) e.scrollTop = e.scrollHeight;
      });
      await page.waitForTimeout(100);
      const apres = await page.evaluate(defilants);
      await page.close();
      const s = JSON.stringify({ m, titres, avant, apres });
      expect(titres.length, s).toBe(2);
      for (const t of titres) {
        expect(t.top, s).toBeGreaterThanOrEqual(m.aside.top - 0.5);
        expect(t.bottom, s).toBeLessThanOrEqual(Math.min(h, m.aside.bottom) + 0.5);
        expect(t.dessus, s).toBe(true);
      }
      const deborde = avant.filter((e) => e.deborde > 1);
      for (const e of deborde) {
        expect(e.masque, s).not.toBe('none');
        expect(e.gouttiere, s).toBe('stable');
      }
      for (const e of apres.filter((x) => x.deborde > 1)) expect(e.masque, s).toBe('none');
    }, 30_000);
  }

  /** Clic souris au centre d'un bouton de l'aside ; rend sa place avant / après et celle des Filtres après. */
  async function cliquer(page: Page, texte: string) {
    const b = page.locator('.sidebar button', { hasText: texte });
    const lire = () => page.evaluate((t) => {
      const el = [...document.querySelectorAll('.sidebar button')].find((x) => x.textContent!.includes(t))!;
      const r = el.getBoundingClientRect();
      const f = document.querySelector('[data-testid="panneau-filtres"]')!.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, ftop: f.top, fbottom: f.bottom, y: scrollY, pressed: el.getAttribute('aria-pressed') };
    }, texte);
    const avant = await lire();
    const r = await b.boundingBox();
    await page.mouse.click(r!.x + r!.width / 2, r!.y + r!.height / 2);
    await page.waitForTimeout(1600); // glissé éventuel (L239) et hauteur rendue (GEL_MAX_MS)
    return { avant, apres: await lire() };
  }

  for (const reduce of [true, false]) {
    it(`M3 — 1440×900${reduce ? ', reduce' : ''} : un clic sur un artiste ou une collection laisse les Filtres visibles et l'élément cliqué sous le pointeur (±1 px), au clic et au second clic`, async () => {
      const fautes: string[] = [];
      for (const texte of ['Wayne England', 'Mikhail Savier', 'Horus Heresy']) {
        for (const y of [0, 400, 800, 1200]) {
          const page = await open(1440, 900);
          await page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
          await aller(page, y);
          const vis = await page.evaluate((t) => {
            const el = [...document.querySelectorAll('.sidebar button')].find((x) => x.textContent!.includes(t))!;
            const r = el.getBoundingClientRect();
            return r.top >= 78 && r.bottom <= innerHeight;
          }, texte);
          if (!vis) { await page.close(); continue; } // pas cliquable depuis ce départ sans défiler
          for (const tour of ['clic', 'second clic']) {
            const { avant, apres } = await cliquer(page, texte);
            const s = `${texte} depuis ${y} (${tour}) : ${JSON.stringify({ avant, apres })}`;
            if (Math.abs(apres.top - avant.top) > 1) fautes.push(`saut ${(apres.top - avant.top).toFixed(0)} px — ${s}`);
            if (avant.ftop >= 90 && (apres.ftop < 90 || apres.fbottom > 900)) fautes.push(`Filtres sortis — ${s}`);
            if (apres.pressed !== (tour === 'clic' ? 'true' : 'false')) fautes.push(`état pressé — ${s}`);
          }
          await page.close();
        }
      }
      expect(fautes).toEqual([]);
    }, 120_000);
  }

  for (const [w, h] of [[1440, 900], [1300, 1000], [1920, 1080]] as const) {
    it(`M4 — ${w}×${h}, bas de page : la colonne relâchée n'est pas coupée (rien ne défile dedans, chaque ligne est entière)`, async () => {
      const page = await open(w, h);
      await aller(page, 1e6);
      const d = await page.evaluate(defilants);
      const coupes = await page.evaluate(() => {
        const aside = document.querySelector('.sidebar')!.getBoundingClientRect();
        return [...document.querySelectorAll('.sidebar button')].filter((b) => b.getClientRects().length > 0).map((b) => b.getBoundingClientRect())
          .filter((r) => r.bottom > aside.bottom + 0.5 || r.top < aside.top - 0.5).length;
      });
      await page.close();
      for (const e of d) expect(e.deborde, JSON.stringify(d)).toBeLessThanOrEqual(1);
      expect(coupes, JSON.stringify(d)).toBe(0);
    }, 30_000);
  }
});
