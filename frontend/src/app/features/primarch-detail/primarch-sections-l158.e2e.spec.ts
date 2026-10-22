// @vitest-environment node
// L158 (revue UX L10) — sections de la fiche d'un Primarque. Mesuré au départ à 1440 px : lignes de
// 100 à 121 caractères (Hérésie, Héritage, Description sans image) ; colonne vide de 335 px à droite
// du texte de Grande Croisade quand l'image du wiki manque, et dans Destin des Primarques perdus
// (2 citations seulement : la troisième n'existe pas). Navigateur réel, application construite (dist).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Server } from 'node:http';
import type { Browser, Page } from 'playwright-core';
import { distState, startDistServer } from '../../../testing/dist-server';

const { built, stale } = distState([
  'src/app/features/primarch-detail/primarch-detail.component.scss',
  'src/app/features/primarch-detail/primarch-detail.component.ts',
]);
let chromium: typeof import('playwright-core').chromium | null = null;
try {
  chromium = (await import('playwright-core')).chromium;
} catch {
  chromium = null;
}

const GREY = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#555"/></svg>').toString('base64');
const TEXTES = '#description .lead, #description .lore-block, #heresie .heresy-text, #heritage > p';

describe.skipIf(!built || !chromium)('Fiche Primarque, sections (navigateur, dist) — L158', () => {
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

  async function open(id: string, w: number, withImage: boolean): Promise<Page> {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    if (withImage) await page.route('**/api/wiki-image*', (r) => r.fulfill({ json: { imageUrl: GREY } }));
    await page.goto(`${base}/lore/primarchs/${id}`);
    await page.locator('#description').waitFor();
    await page.evaluate(() => document.fonts.ready);
    if (withImage) await page.locator('#croisade .inline-figure').waitFor();
    return page;
  }

  /** Nombre de colonnes de la grille qui contient le texte (1 si le parent n'est pas une grille à colonnes). */
  const colonnes = (sel: string) => (page: Page) =>
    page.evaluate((s) => getComputedStyle(document.querySelector(s)!.parentElement!).gridTemplateColumns.split(' ').length, sel);

  it('application construite à jour (sinon : ng build)', () => {
    expect(stale).toBe(false);
  });

  it('R1 — Description, Hérésie et Héritage : paragraphe borné à 70ch et 90 caractères par ligne au plus en moyenne, avec ou sans image, à 1440 px', async () => {
    for (const withImage of [false, true]) {
      const page = await open('horus', 1440, withImage);
      const r = await page.evaluate((sel) => {
        const els = [...document.querySelectorAll<HTMLElement>(sel)];
        const mesures = els.map((p) => {
          const cs = getComputedStyle(p);
          const probe = document.createElement('span');
          probe.style.cssText = `position:absolute;visibility:hidden;width:70ch;font:${cs.font}`;
          document.body.append(probe);
          const ch70 = probe.getBoundingClientRect().width;
          probe.remove();
          const lignes = Math.round(p.getBoundingClientRect().height / parseFloat(cs.lineHeight));
          return { id: p.className || p.tagName, largeur: p.getBoundingClientRect().width, ch70, car: (p.textContent ?? '').trim().length / lignes };
        });
        return mesures;
      }, TEXTES);
      expect(r.length, `image: ${withImage}`).toBeGreaterThanOrEqual(3);
      expect(r.filter((x) => x.largeur > x.ch70 + 1 || x.car > 90), `image: ${withImage}`).toEqual([]);
      await page.close();
    }
  });

  it('R2 — sans image du wiki, le texte de Grande Croisade occupe une seule colonne (pas de colonne vide de 335 px)', async () => {
    const page = await open('horus', 1440, false);
    expect(await colonnes('#croisade .col-text')(page)).toBe(1);
    const largeur = await page.evaluate(() => document.querySelector('#croisade .col-text')!.getBoundingClientRect().width);
    expect(largeur).toBeGreaterThan(500);
    await page.close();
  });

  it('R3 — avec l’image, Grande Croisade garde le texte et l’image côte à côte (deux colonnes)', async () => {
    const page = await open('horus', 1440, true);
    const r = await page.evaluate(() => {
      const t = document.querySelector('#croisade .col-text')!.getBoundingClientRect();
      const i = document.querySelector('#croisade .inline-figure')!.getBoundingClientRect();
      return { memeLigne: i.top < t.bottom && t.top < i.bottom, cote: i.right <= t.left || i.left >= t.right };
    });
    expect(r).toEqual({ memeLigne: true, cote: true });
    await page.close();
  });

  it('R4 — Primarque perdu (2 citations) : Destin est en une colonne, sans colonne vide ; avec 4 citations, citation et texte côte à côte', async () => {
    const perdu = await open('primarch-ii', 1440, false);
    expect(await perdu.locator('#destin .pull-quote').count()).toBe(0);
    expect(await colonnes('#destin .col-text')(perdu)).toBe(1);
    expect(await perdu.evaluate(() => document.querySelector('#destin .col-text')!.getBoundingClientRect().width)).toBeGreaterThan(500);
    await perdu.close();
    const complet = await open('horus', 1440, false);
    const r = await complet.evaluate(() => {
      const t = document.querySelector('#destin .col-text')!.getBoundingClientRect();
      const q = document.querySelector('#destin .pull-quote')!.getBoundingClientRect();
      return q.left >= t.right && q.top < t.bottom;
    });
    expect(r).toBe(true);
    await complet.close();
  });

  // L158/t1 (revue UX) — « 70ch » est la largeur du chiffre 0 d'Inter (9,46 px) alors qu'un caractère moyen en
  // français en fait ~7,1 : 70ch donnait ~90 caractères par ligne (83 à 100 mesurés à 1440 px). On mesure donc le
  // résultat, en caractères par ligne RENDUE (un Range par caractère), pas une largeur en unités CSS.
  const SECTIONS_TEXTE: Record<string, string> = {
    'Description (chapeau)': '#description .lead',
    'Description (texte)': '#description .lore-block',
    Hérésie: '#heresie .heresy-text',
    Héritage: '#heritage > p',
  };

  /** Caractères par ligne rendue de chaque élément (espaces de fin de ligne exclus). */
  async function lignes(page: Page, sel: string): Promise<number[]> {
    return page.evaluate((s) => {
      const el = document.querySelector(s)!;
      const parLigne = new Map<number, string>();
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode() as Text | null; n; n = w.nextNode() as Text | null) {
        const t = n.data;
        for (let i = 0; i < t.length; i++) {
          const r = document.createRange();
          r.setStart(n, i);
          r.setEnd(n, i + 1);
          const rect = r.getClientRects()[0];
          if (!rect || rect.width === 0) continue; // saut de ligne conservé (pre-line) ou espace replié
          const k = Math.round(rect.top);
          parLigne.set(k, (parLigne.get(k) ?? '') + t[i]);
        }
      }
      return [...parLigne.entries()].sort((a, b) => a[0] - b[0]).map(([, txt]) => txt.trim().length);
    }, sel);
  }
  const mediane = (v: number[]) => {
    const s = [...v].sort((a, b) => a - b);
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  };

  // Bornes d'après la mesure des 20 fiches à 1440 px (médiane des lignes pleines / ligne la plus longue) :
  // chapeau 61–70 / ≤ 70 · Description 70,5–75 / 73–84 · Hérésie 67,5–76,5 / 73–79 · Héritage 66–73 / 70–77.
  // « ≈ 70 » se lit donc médiane de 58 à 80 (±~12 autour de 70, marge d'un à trois caractères sur les extrêmes mesurés)
  // et ligne la plus longue ≤ 88 (84 mesuré : une phrase sans espace propice) ; avant le lot : 83 à 100 en médiane.
  // Toutes les fiches, pas deux textes : une correction du seed ne doit pas faire rougir ce test sans changement CSS.
  const FICHES: string[] = JSON.parse(readFileSync(resolve(__dirname, '../../../../../backend/seed/primarchs.json'), 'utf8')).map((x: { id: string }) => x.id);

  it('R5 — à 1440 px, sur les 20 fiches, chaque section de texte (chapeau compris) tient à ≈ 70 caractères par ligne : médiane des lignes pleines de 58 à 80 (la dernière d’un paragraphe est courte par nature), ligne la plus longue 88 au plus ; avec ou sans image', async () => {
    expect(FICHES.length).toBe(20);
    const hors: string[] = [];
    // L'image du wiki ne touche que Grande Croisade : Horus et Sanguinius suffisent avec image, les 20 sans.
    const cas: [string, boolean][] = [...FICHES.map((id): [string, boolean] => [id, false]), ['horus', true], ['sanguinius', true]];
    for (const [id, withImage] of cas) {
      const page = await open(id, 1440, withImage);
      expect(await page.evaluate(() => document.fonts.check('15px Inter')), 'police Inter chargée (réseau requis)').toBe(true);
      for (const [nom, sel] of Object.entries(SECTIONS_TEXTE)) {
        const l = await lignes(page, sel);
        const med = mediane(l.length > 1 ? l.slice(0, -1) : l); // lignes pleines : la dernière d'un paragraphe est courte par nature
        const max = Math.max(...l);
        if (med < 58 || med > 80 || max > 88) hors.push(`${id}${withImage ? ' +image' : ''} · ${nom} : médiane (lignes pleines) ${med}, max ${max} (${l.join(' ')})`);
      }
      await page.close();
    }
    expect(hors).toEqual([]);
  }, 120000);

  // L158/t1 (2e passe) — la consigne du lot : rien ne change sous 761 px. Entre ~612 et 760 px la zone de contenu du
  // panneau (571 à 650 px) est sous l'ancien plafond de 70ch (662 px) : les textes y prennent toute la largeur, et le
  // texte d'Hérésie n'est pas recentré (il était à 56 px du bord à 720 px, contre 21 px pour les autres sections).
  it.each([700, 760])('R8 — à %i px, les textes gardent leur largeur d’avant le lot (celle du panneau, plafonnée à 70ch) et le texte d’Hérésie est aligné sur son titre et sur les autres sections', async (w) => {
    const page = await open('horus', w, false);
    const r = await page.evaluate(() => {
      const box = (s: string) => document.querySelector(s)!.getBoundingClientRect();
      /** Largeur attendue sans le lot : zone de contenu du panneau, plafonnée à 70ch (mesuré avec la police de l'élément). */
      const attendue = (sel: string, panneau: string, plafond: boolean) => {
        const p = document.querySelector<HTMLElement>(panneau)!;
        const cs = getComputedStyle(p);
        const zone = p.getBoundingClientRect().width - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const el = document.querySelector<HTMLElement>(sel)!;
        const probe = document.createElement('span');
        probe.style.cssText = `position:absolute;visibility:hidden;width:70ch;font:${getComputedStyle(el).font}`;
        document.body.append(probe);
        const ch70 = probe.getBoundingClientRect().width;
        probe.remove();
        return plafond ? Math.min(zone, ch70) : zone;
      };
      const textes: [string, string, boolean][] = [
        ['#description .lead', '#description', false], // le chapeau n'avait pas de plafond de 70ch avant le lot (770 px)
        ['#description .lore-block', '#description', true],
        ['#heresie .heresy-text', '#heresie', true],
        ['#heritage > p', '#heritage', true],
      ];
      return {
        ecarts: textes.map(([sel, panneau, plafond]) => ({ sel, ecart: Math.round((box(sel).width - attendue(sel, panneau, plafond)) * 10) / 10 })),
        heresieGauche: box('#heresie .heresy-text').left - box('#heresie h2').left,
        heritageGauche: box('#heritage > p').left - box('#heritage h2').left,
      };
    });
    expect(r.ecarts.filter((x) => Math.abs(x.ecart) > 1), `${w} px`).toEqual([]);
    expect(Math.abs(r.heresieGauche), 'Hérésie : texte aligné sur son titre').toBeLessThanOrEqual(1);
    expect(Math.abs(r.heresieGauche - r.heritageGauche), 'Hérésie comme les autres sections').toBeLessThanOrEqual(1);
    await page.close();
  });

  it('R6 — texte seul et colonne double ont la même largeur de lecture (à 1440 px, écart de 15 px au plus)', async () => {
    const page = await open('horus', 1440, false);
    const l = await page.evaluate(() => {
      const w = (s: string) => document.querySelector(s)!.getBoundingClientRect().width;
      return { seul: w('#heritage > p'), heresie: w('#heresie .heresy-text'), lore: w('#description .lore-block'), double: w('#personnalite .col-text'), colonneDouble: document.querySelector('#personnalite .two-col') !== null };
    });
    expect(l.colonneDouble).toBe(true);
    for (const k of ['seul', 'heresie', 'lore'] as const) expect(Math.abs(l[k] - l.double), k).toBeLessThanOrEqual(15);
    await page.close();
  });

  it('R7 — Hérésie : le texte partage l’axe de la citation et de l’image (centré dans le panneau), toujours aligné à gauche', async () => {
    const page = await open('horus', 1440, true);
    await page.locator('#heresie .inline-figure').waitFor();
    const r = await page.evaluate(() => {
      const cx = (s: string) => {
        const b = document.querySelector(s)!.getBoundingClientRect();
        return b.left + b.width / 2;
      };
      return {
        texte: cx('#heresie .heresy-text'),
        citation: cx('#heresie .pull-quote-inline'),
        image: cx('#heresie .inline-figure'),
        panneau: cx('#heresie'),
        align: getComputedStyle(document.querySelector('#heresie .heresy-text')!).textAlign,
      };
    });
    expect(Math.abs(r.texte - r.citation)).toBeLessThanOrEqual(1);
    expect(Math.abs(r.texte - r.image)).toBeLessThanOrEqual(1);
    expect(Math.abs(r.texte - r.panneau)).toBeLessThanOrEqual(1);
    expect(['left', 'start']).toContain(r.align);
    await page.close();
  });
});
