// L40, règle D2 — gain du repli d'un texte long : texte entier contre 6 lignes et le bouton, rangée
// de grille comprise (un encart voisin plus haut que le texte fixe la hauteur : gain nul).
import { describe, expect, it } from 'vitest';
import { REPLI, gainDuRepli, hauteurVoisine } from './densite';

const L = 26.7; // ligne de .col-text (15 px × 1,78)
const replie = REPLI.lignes * L + REPLI.boutonPx; // ≈ 208 px

describe('gainDuRepli (D2)', () => {
  it('sans voisin : texte entier moins 6 lignes et le bouton', () => {
    expect(gainDuRepli(20 * L, L)).toBeCloseTo(20 * L - replie);
    expect(gainDuRepli(9 * L, L)).toBeLessThan(3 * L); // 9 lignes : moins de 3 lignes gagnées
    expect(gainDuRepli(11 * L, L)).toBeGreaterThanOrEqual(3 * L); // 11 lignes : au moins 3
    expect(gainDuRepli(5 * L, L)).toBe(0);
  });
  it('encart voisin plus haut que le texte entier : gain nul (Lion, Origines à 1440 px)', () => {
    expect(gainDuRepli(11 * L, L, 395)).toBe(0);
  });
  it('encart voisin entre les deux : seul ce qui dépasse l’encart est gagné', () => {
    expect(gainDuRepli(20 * L, L, 300)).toBeCloseTo(20 * L - 300);
  });
});

function boite(el: HTMLElement, top: number, height: number) {
  el.getBoundingClientRect = () => ({ top, height, bottom: top + height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON: () => ({}) });
}

describe('hauteurVoisine (D2)', () => {
  function rangee(display: string, alignItems: string) {
    const parent = document.createElement('div');
    parent.style.display = display;
    parent.style.alignItems = alignItems;
    const cellule = document.createElement('div');
    const encart = document.createElement('aside');
    const dessous = document.createElement('div');
    parent.append(cellule, encart, dessous);
    document.body.append(parent);
    boite(cellule, 100, 200);
    boite(encart, 100, 395);
    boite(dessous, 600, 500); // rangée suivante : ignorée
    return { parent, cellule };
  }
  it('grille alignée en haut : plus haut voisin de la même rangée', () => {
    const { parent, cellule } = rangee('grid', 'start');
    expect(hauteurVoisine(cellule)).toBe(395);
    parent.remove();
  });
  it('voisin étiré (hauteur de la rangée, donc la nôtre) ou bloc ordinaire : 0', () => {
    for (const [d, a] of [['grid', 'stretch'], ['block', 'start']]) {
      const { parent, cellule } = rangee(d, a);
      expect(hauteurVoisine(cellule)).toBe(0);
      parent.remove();
    }
  });
});
