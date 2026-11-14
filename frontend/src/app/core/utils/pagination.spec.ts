// L40, règle D4 — pagination commune des listes longues (docs/densite/regles.md).
import { describe, expect, it } from 'vitest';
import { signal } from '@angular/core';
import { Pagination } from './pagination';

const liste = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('Pagination (L40, D4)', () => {
  it('montre un pas, puis un pas de plus à chaque « Afficher plus » ; rend l\'index du premier ajouté', () => {
    const p = new Pagination(signal(liste(81)), signal(12));
    expect(p.affiches()).toHaveLength(12);
    expect(p.total()).toBe(81);
    expect(p.restants()).toBe(69);
    expect(p.prochain()).toBe(12);
    expect(p.plus()).toBe(12);
    expect(p.affiches()).toHaveLength(24);
  });

  it('pas de bouton pour un ou deux éléments cachés : la liste qui dépasse de 2 au plus s\'affiche en entier', () => {
    expect(new Pagination(signal(liste(8)), signal(6)).restants()).toBe(0);
    expect(new Pagination(signal(liste(9)), signal(6)).affiches()).toHaveLength(6);
    // Dernier lot : il absorbe la tolérance (6 puis 8, pas 6 puis 6 puis 2).
    const p = new Pagination(signal(liste(14)), signal(6));
    expect(p.prochain()).toBe(8);
    p.plus();
    expect(p.restants()).toBe(0);
  });

  it('suit la largeur (le pas change) et revient à la première page', () => {
    const pas = signal(12);
    const p = new Pagination(signal(liste(81)), pas);
    pas.set(6);
    expect(p.affiches()).toHaveLength(6);
    p.plus();
    p.plus();
    expect(p.affiches()).toHaveLength(18);
    p.reinitialiser();
    expect(p.affiches()).toHaveLength(6);
  });
});
