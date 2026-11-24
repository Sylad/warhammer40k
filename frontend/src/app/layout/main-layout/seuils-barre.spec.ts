// L250 — les seuils en rem de la barre sont ceux des media queries en em, et chacun a ses règles.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SEUILS_BARRE, SEUILS_CONTENU, classesBarre, classesContenu } from './seuils-barre';

const SOURCE = readFileSync(resolve(__dirname, 'main-layout.component.ts'), 'utf8');

describe('seuils de la barre en rem — L250', () => {
  it('mêmes valeurs que les media queries « width < Xem » du composant', () => {
    // (une même media query peut revenir plus bas, pour passer après une règle qu'elle doit emporter — L253)
    const media = [...new Set([...SOURCE.matchAll(/@media \(width < ([\d.]+)em\)/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
    expect(Object.values(SEUILS_BARRE).slice().sort((a, b) => a - b)).toEqual(media);
  });

  it('chaque classe a ses règles :host(.classe) dans le composant', () => {
    for (const classe of [...Object.keys(SEUILS_BARRE), 'texte-agrandi']) {
      expect(SOURCE, classe).toContain(`:host(.${classe}`);
      expect(SOURCE, classe).toContain(`'[class.${classe}]'`);
    }
  });

  it('police de la page à 100 % : mêmes bascules que les media queries (16 et 20 px)', () => {
    for (const px of [16, 20]) {
      for (const [classe, em] of Object.entries(SEUILS_BARRE) as [keyof typeof SEUILS_BARRE, number][]) {
        const seuil = em * px;
        expect(classesBarre(Math.ceil(seuil) - 1, px)[classe], `${classe} ${px}`).toBe(true);
        expect(classesBarre(Math.ceil(seuil), px)[classe], `${classe} ${px}`).toBe(seuil > Math.ceil(seuil));
        expect(classesBarre(Math.ceil(seuil) + 1, px)[classe], `${classe} ${px}`).toBe(false);
      }
      expect(classesBarre(1440, px, px)['texte-agrandi']).toBe(false);
    }
  });

  it('texte de la page à 200 % : tiroir à 1440 px, barre étroite à 390 px, texte agrandi', () => {
    const c1440 = classesBarre(1440, 32, 16);
    expect(c1440['barre-tiroir']).toBe(true);
    expect(c1440['texte-agrandi']).toBe(true);
    expect(classesBarre(390, 32, 16)['barre-etroite']).toBe(true);
    expect(classesBarre(2688, 32, 16)['barre-tiroir']).toBe(false);
  });

  it('L253 — texte plus grand dès que 1rem dépasse 16 px, quelle qu\'en soit la source ; jamais à 16 px', () => {
    expect(classesBarre(1440, 16, 16)['texte-plus-grand']).toBe(false);
    expect(classesBarre(320, 16, 16)['texte-plus-grand']).toBe(false);
    // police par défaut du navigateur à 20 px : `texte-agrandi` (relatif à la police par défaut) reste faux
    expect(classesBarre(320, 20, 20)).toMatchObject({ 'texte-agrandi': false, 'texte-plus-grand': true });
    // police de la page à 200 %
    expect(classesBarre(1440, 32, 16)['texte-plus-grand']).toBe(true);
    expect(classesBarre(1440, 16.005, 16)['texte-plus-grand']).toBe(false);
  });

  it('taille illisible (jsdom) : repli sur 16 px', () => {
    expect(classesBarre(1440, Number.NaN)).toEqual(classesBarre(1440, 16));
  });
});

// L253 passe 2 — classes contenu-<px> : les media queries max-width en px des pages, comptées en rem quand le texte
// est agrandi (à 200 %, 1440 px se met en page comme 720 px). Jamais posées au réglage normal.
describe('classes contenu-<px> du texte agrandi — L253', () => {
  const STYLES = readFileSync(resolve(__dirname, '../../../styles/_texte-agrandi.scss'), 'utf8');
  const posees = (largeur: number, rem: number) =>
    Object.entries(classesContenu(largeur, rem)).filter(([, v]) => v).map(([k]) => k);

  it('jamais au réglage normal (16 px), quelle que soit la largeur', () => {
    for (const largeur of [320, 600, 760, 1024, 1440, 2560]) expect(posees(largeur, 16)).toEqual([]);
    expect(posees(320, Number.NaN)).toEqual([]);
  });

  it('à 32 px, 1440 px se met en page comme 720 px : contenu-760 oui, contenu-600 non', () => {
    expect(posees(1440, 32)).toEqual(['contenu-1280', 'contenu-1220', 'contenu-1100', 'contenu-1024', 'contenu-900', 'contenu-760']);
    expect(posees(2561, 32)).toEqual([]);
  });

  it('bornes inclusives, comme max-width : 1200 px à 32 px = 600 px', () => {
    expect(classesContenu(1200, 32)['contenu-600']).toBe(true);
    expect(classesContenu(1201, 32)['contenu-600']).toBe(false);
  });

  it('chaque classe est liée à l\'hôte et a des règles dans _texte-agrandi.scss', () => {
    for (const px of SEUILS_CONTENU) {
      expect(SOURCE, `contenu-${px}`).toContain(`'[class.contenu-${px}]'`);
      expect(STYLES, `contenu-${px}`).toContain(`app-main-layout.contenu-${px} `);
    }
  });
});
