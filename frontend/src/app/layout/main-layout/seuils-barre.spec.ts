// L250 — les seuils en rem de la barre sont ceux des media queries en em, et chacun a ses règles.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SEUILS_BARRE, classesBarre } from './seuils-barre';

const SOURCE = readFileSync(resolve(__dirname, 'main-layout.component.ts'), 'utf8');

describe('seuils de la barre en rem — L250', () => {
  it('mêmes valeurs que les media queries « width < Xem » du composant', () => {
    const media = [...SOURCE.matchAll(/@media \(width < ([\d.]+)em\)/g)].map((m) => Number(m[1])).sort((a, b) => a - b);
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

  it('taille illisible (jsdom) : repli sur 16 px', () => {
    expect(classesBarre(1440, Number.NaN)).toEqual(classesBarre(1440, 16));
  });
});
