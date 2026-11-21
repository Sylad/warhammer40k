// @vitest-environment node
// L241/t1 — navigateur réel, application construite (dist). Revue UX de L241 (21-11, M1) : de 761 à 1220 px, « Filtres
// avancés » est sous la liste et la rangée pressée reste sous le pointeur (L241) ; le compte « N résultats » était donc
// hors de l'écran dans 24 départs sur 32, et l'état vide (« Aucune vidéo ne correspond… Effacer les filtres ») à
// −226..−12 px à 1024×768 en fin de page : on ne voyait pas que la liste avait changé (Nielsen 1), ni comment sortir
// d'une liste vide (Nielsen 9).
// Attendu (spec : revue UX M1, précédent L240 de la Galerie) :
// - à 768×1024 et 1024×768, après chaque filtre avancé, un rappel du compte en tête du panneau, entièrement dans la
//   fenêtre, qui dit le même nombre que le compte de la liste ;
// - quand plus rien ne correspond, ce rappel dit « Aucun résultat » et offre « Effacer les filtres », visible ; ce bouton
//   rend la liste complète et le focus reste dans le panneau, en vue ;
// - une seule région annoncée (le rappel est caché au lecteur d'écran, hors de toute région live) ;
// - la rangée pressée ne bouge pas (L241) ;
// - à 1440 et 390 px, pas de rappel dans ce panneau (le compte est en vue par L239/L240).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/app/features/videos/videos.component.ts',
  'src/app/features/videos/videos.component.scss',
  'src/app/core/utils/resultats-en-vue.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

const FILTRES = ['Durée courte', 'Long format', 'FR uniquement', 'Animations'] as const;
const RAPPEL = '[data-testid="rappel-compte-videos"]';

describe.skipIf(!built || !chromium)('Vidéos, « Filtres avancés » de 761 à 1220 px : rappel du compte et de l’état vide (navigateur, dist) — L241/t1', () => {
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

  async function ouvrir(width: number, height: number): Promise<Page> {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    await page.route((u) => !u.host.startsWith('127.0.0.1'), (r) => r.abort());
    await page.setViewportSize({ width, height });
    await page.goto(base + '/videos', { waitUntil: 'networkidle' });
    await page.locator('.check-row .count').first().waitFor();
    return page;
  }

  /** Boîte de l'élément dans la fenêtre, et bord haut utile (sous la barre fixe : `scroll-padding-top`). */
  const boite = (page: Page, sel: string) => page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    const b = e.getBoundingClientRect();
    const haut = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const style = getComputedStyle(e);
    return { top: b.top, bottom: b.bottom, h: b.height, haut, ih: innerHeight, visible: style.display !== 'none' && style.visibility !== 'hidden' && b.height > 0, texte: (e as HTMLElement).innerText.replace(/\s+/g, ' ').trim() };
  }, sel);
  const enVue = (b: NonNullable<Awaited<ReturnType<typeof boite>>>) => b.visible && b.top >= b.haut - 1 && b.bottom <= b.ih + 1;
  const compteListe = async (page: Page) => ((await page.locator('.results-count').textContent()) ?? '').replace(/\s+/g, ' ').trim();

  /** Départs de la revue : rangée juste sous la barre, au milieu de la fenêtre, au bas de la fenêtre, fin de page. */
  type Depart = 'haute' | 'milieu' | 'bas' | 'fin';
  async function placer(page: Page, nom: string, depart: Depart): Promise<{ x: number; y: number; top: number }> {
    return page.locator('.check-row', { hasText: nom }).evaluate(async (r, d) => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const b0 = r.getBoundingClientRect();
      const barre = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const place = d === 'haute' ? barre + 2 : d === 'bas' ? innerHeight - b0.height - 2 : (innerHeight - b0.height) / 2;
      const y = d === 'fin' ? max : Math.max(0, Math.min(max, b0.top + scrollY - place));
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((f) => requestAnimationFrame(() => requestAnimationFrame(f)));
      const b = r.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2, top: b.top };
    }, depart);
  }
  const repos = (page: Page) => page.evaluate(async () => {
    for (let i = 0; i < 200 && document.documentElement.style.minHeight; i++) await new Promise((r) => setTimeout(r, 10));
    await new Promise((f) => requestAnimationFrame(() => requestAnimationFrame(f)));
  });

  for (const [largeur, hauteur] of [[768, 1024], [1024, 768]] as const) {
    it(`${largeur}×${hauteur} : chaque filtre avancé, quatre départs → rappel du compte en vue, égal au compte de la liste, rangée immobile`, async () => {
      const page = await ouvrir(largeur, hauteur);
      const echecs: string[] = [];
      for (const nom of FILTRES) {
        for (const depart of ['haute', 'milieu', 'bas', 'fin'] as const) {
          const cas = `${nom} depuis ${depart}`;
          const p = await placer(page, nom, depart);
          await page.mouse.click(p.x, p.y);
          await repos(page);
          const r = await boite(page, RAPPEL);
          const liste = await compteListe(page);
          if (!r) echecs.push(`${cas} : pas de rappel`);
          else {
            if (!enVue(r)) echecs.push(`${cas} : rappel hors de la fenêtre (${Math.round(r.top)}..${Math.round(r.bottom)} px, fenêtre ${Math.round(r.haut)}..${r.ih})`);
            if (r.texte.toLowerCase() !== liste.toLowerCase()) echecs.push(`${cas} : rappel « ${r.texte} » ≠ liste « ${liste} »`);
          }
          const apres = await page.locator('.check-row', { hasText: nom }).evaluate((e) => e.getBoundingClientRect().top);
          if (Math.abs(apres - p.top) > 2) echecs.push(`${cas} : rangée ${Math.round(p.top)} → ${Math.round(apres)} px`);
          await page.mouse.click(p.x, p.y); // défait
          await repos(page);
          if (await page.locator('.check-row[aria-pressed="true"]').count()) echecs.push(`${cas} : second clic ne défait pas`);
        }
      }
      expect(echecs).toEqual([]);
      await page.close();
    }, 60_000);

    for (const depart of ['fin', 'haute', 'bas'] as const)
    it(`${largeur}×${hauteur}, départ ${depart} : plus rien ne correspond → « Aucun résultat » et « Effacer les filtres » en vue ; le bouton rend la liste, focus dans le panneau`, async () => {
      const page = await ouvrir(largeur, hauteur);
      const total = await compteListe(page);
      let p = await placer(page, 'Long format', depart);
      await page.mouse.click(p.x, p.y);
      await repos(page);
      p = await placer(page, 'Durée courte', depart);
      await page.mouse.click(p.x, p.y);
      await repos(page);
      expect(await compteListe(page)).toMatch(/^0 résultat$/);
      const r = await boite(page, RAPPEL);
      expect(r, 'rappel présent').not.toBeNull();
      expect(r!.texte).toMatch(/aucun résultat/i);
      expect(enVue(r!), `rappel ${Math.round(r!.top)}..${Math.round(r!.bottom)} px`).toBe(true);
      const bouton = page.locator(`${RAPPEL} button`, { hasText: 'Effacer les filtres' });
      expect(await bouton.count()).toBe(1);
      const b = (await bouton.boundingBox())!;
      expect(b.height, 'cible ≥ 44 px').toBeGreaterThanOrEqual(44);
      expect(b.y + b.height).toBeLessThanOrEqual(hauteur + 1);
      expect(b.y).toBeGreaterThanOrEqual(r!.haut - 1);
      const avant = (await boite(page, RAPPEL))!.top;
      await bouton.click();
      await repos(page);
      expect(await compteListe(page)).toBe(total);
      expect(await page.locator('.check-row[aria-pressed="true"]').count()).toBe(0);
      const apres = (await boite(page, RAPPEL))!;
      expect(Math.abs(apres.top - avant), `rappel ${Math.round(avant)} → ${Math.round(apres.top)} px`).toBeLessThanOrEqual(2);
      expect(apres.texte.toLowerCase()).toBe(total.toLowerCase());
      const focus = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        const b = a?.getBoundingClientRect();
        return { dansPanneau: !!a?.closest('.side-panel'), top: b?.top ?? -1, bottom: b?.bottom ?? -1 };
      });
      expect(focus.dansPanneau, 'focus dans « Filtres avancés »').toBe(true);
      expect(focus.top).toBeGreaterThanOrEqual(0);
      expect(focus.bottom).toBeLessThanOrEqual(hauteur);
      await page.close();
    }, 60_000);

    it(`${largeur}×${hauteur} : une seule région annoncée — le rappel est caché au lecteur d'écran et hors région live`, async () => {
      const page = await ouvrir(largeur, hauteur);
      const p = await placer(page, 'Animations', 'fin');
      await page.mouse.click(p.x, p.y);
      await repos(page);
      const etat = await page.evaluate((s) => {
        const rappel = document.querySelector(s);
        const texte = rappel?.querySelector('[aria-hidden="true"]');
        return {
          lives: document.querySelectorAll('[data-testid="liste-videos"] [aria-live], [data-testid="liste-videos"] [role="status"]').length,
          rappelLive: !!rappel?.closest('[aria-live], [role="status"]') || !!rappel?.querySelector('[aria-live], [role="status"]'),
          texteCache: !!texte && (texte as HTMLElement).innerText.trim().length > 0,
        };
      }, RAPPEL);
      expect(etat.lives).toBe(1);
      expect(etat.rappelLive).toBe(false);
      expect(etat.texteCache).toBe(true);
      await page.close();
    }, 30_000);
  }

  it('761×1024 (panneau le plus étroit, 264 px) : l’état vide du rappel tient dans le panneau, 44 px de haut', async () => {
    const page = await ouvrir(761, 1024);
    await page.locator('.check-row', { hasText: 'Long format' }).click();
    await repos(page);
    await page.locator('.check-row', { hasText: 'Durée courte' }).click();
    await repos(page);
    const m = await page.evaluate((s) => {
      const r = document.querySelector(s)!;
      const b = r.querySelector('button')!.getBoundingClientRect();
      const rr = r.getBoundingClientRect();
      return { deborde: r.scrollWidth - r.clientWidth, droite: b.right - rr.right, h: rr.height, hb: b.height };
    }, RAPPEL);
    expect(m.deborde).toBeLessThanOrEqual(0);
    expect(m.droite).toBeLessThanOrEqual(0.5);
    expect(m.h).toBe(44);
    expect(m.hb).toBeGreaterThanOrEqual(44);
    await page.close();
  }, 30_000);

  for (const [largeur, hauteur] of [[1440, 900], [390, 844], [760, 1024], [1221, 800]] as const) {
    it(`${largeur}×${hauteur} : pas de rappel dans « Filtres avancés »`, async () => {
      const page = await ouvrir(largeur, hauteur);
      const r = await boite(page, RAPPEL);
      expect(r === null || !r.visible).toBe(true);
      await page.close();
    }, 30_000);
  }
});
