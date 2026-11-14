import { computed, signal, type Signal } from '@angular/core';

/**
 * L40, règle D4 (docs/densite/regles.md) — une liste longue s'affiche par pages : `pas` éléments,
 * puis « Afficher N de plus » avec le nombre affiché sur le total. On n'ajoute pas de bouton pour
 * cacher un ou deux éléments : une liste qui dépasse le pas de `tolerance` éléments au plus
 * s'affiche en entier (le bouton prendrait autant de place qu'eux).
 */
export class Pagination<T> {
  private readonly pages = signal(1);

  constructor(
    private readonly source: Signal<readonly T[]>,
    private readonly pas: Signal<number>,
    private readonly tolerance = 2,
  ) {}

  readonly limite = computed(() => {
    const n = this.source().length;
    const lim = this.pas() * this.pages();
    return n <= lim + this.tolerance ? n : lim;
  });
  readonly affiches = computed(() => this.source().slice(0, this.limite()));
  readonly total = computed(() => this.source().length);
  readonly restants = computed(() => this.total() - this.affiches().length);
  /** Taille du prochain lot (le dernier peut absorber la tolérance). */
  readonly prochain = computed(() => {
    const r = this.restants();
    return r <= this.pas() + this.tolerance ? r : this.pas();
  });

  /** Ajoute un lot ; rend l'index du premier élément ajouté (pour y porter le focus). */
  plus(): number {
    const premier = this.affiches().length;
    this.pages.update((p) => p + 1);
    return premier;
  }

  reinitialiser(): void {
    this.pages.set(1);
  }
}
