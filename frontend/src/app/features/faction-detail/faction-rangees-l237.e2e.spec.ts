// @vitest-environment node
// L237 (revue UX r1) — colonne latérale de la fiche faction : chaque rangée, lien ou texte simple, porte le même
// filet et la même hauteur ; seule la première sous le titre du bloc n'a pas de filet. Avant :
// `.row-link:first-of-type` visait le premier <div> du bloc, si bien qu'une rangée en texte simple placée après
// des liens (« Croisades Noires d'Abaddon », « Mythes du Panthéon ») perdait filet et marge (39 px au lieu de 47)
// et se lisait comme le sous-titre du lien du dessus (Gestalt, proximité). Navigateur réel, dist.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { Browser } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState(['src/app/features/faction-detail/faction-detail.component.scss', 'src/app/features/faction-detail/faction-detail.component.ts']);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

type Rangee = { bloc: string; label: string; statique: boolean; premiere: boolean; filet: string; haut: number; hauteur: number };

describe.skipIf(!built || !chromium)('rangées de la colonne latérale de la fiche faction (navigateur, dist) — L237', () => {
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

  for (const [id, texte] of [['chaos-space-marines', "Croisades Noires d'Abaddon"], ['aeldari', 'Mythes du Panthéon']] as const) {
    for (const w of [1440, 390]) {
      it(`${id} à ${w} px : « ${texte} » (texte simple) a le filet et la hauteur d'une rangée lien`, async () => {
        const page = await browser.newPage({ viewport: { width: w, height: 900 } });
        await page.goto(`${base}/factions/${id}`);
        await page.locator('aside .sp .row-link').first().waitFor();
        const rangees: Rangee[] = await page.evaluate(() =>
          [...document.querySelectorAll('aside .sp')].flatMap((sp) => {
            const bloc = sp.querySelector('h3')?.textContent?.trim() ?? '';
            return [...sp.querySelectorAll<HTMLElement>('.row-link')].map((r) => {
              const cs = getComputedStyle(r);
              return {
                bloc,
                label: r.querySelector('.rl-label')?.textContent?.trim() ?? '',
                statique: r.classList.contains('static'),
                premiere: r.previousElementSibling?.tagName === 'H3',
                filet: cs.borderTopWidth,
                haut: parseFloat(cs.paddingTop),
                hauteur: Math.round(r.getBoundingClientRect().height),
              };
            });
          }),
        );
        await page.close();
        const cible = rangees.find((r) => r.label === texte);
        expect(cible, `rangée « ${texte} » absente`).toBeDefined();
        expect(cible!.statique).toBe(true);
        expect(cible!.premiere).toBe(false);
        for (const r of rangees) {
          if (r.premiere) {
            expect(r.filet, `${r.bloc} › ${r.label}`).toBe('0px');
          } else {
            expect(r.filet, `${r.bloc} › ${r.label}`).toBe('1px');
            expect(r.haut, `${r.bloc} › ${r.label}`).toBe(9);
          }
        }
        const lien = rangees.find((r) => !r.statique && !r.premiere && r.bloc === cible!.bloc);
        expect(lien, 'aucune rangée lien comparable dans le bloc').toBeDefined();
        expect(cible!.hauteur).toBe(lien!.hauteur);
      }, 60_000);
    }
  }
});
