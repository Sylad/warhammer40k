import { DestroyRef, inject, signal, type Signal } from '@angular/core';

/**
 * L40 — règles communes de densité (docs/densite/regles.md), côté application.
 *
 * Seuil téléphone : moins de 600 px (classe « compacte » de Material 3, skill interface-utilisable).
 * Une liste montre au plus 12 éléments au bureau et 6 au téléphone avant « Afficher plus » (D4).
 */
export const TELEPHONE_MAX_PX = 599.98;
export const LISTE_MAX = { bureau: 12, telephone: 6 } as const;

/**
 * Vrai sous 600 px de large, suit le redimensionnement (à appeler dans un contexte d'injection).
 * Sans `matchMedia` (jsdom), on est au bureau.
 */
export function estTelephone(): Signal<boolean> {
  const mq = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(`(max-width: ${TELEPHONE_MAX_PX}px)`)
    : null;
  const s = signal(mq?.matches ?? false);
  if (mq) {
    const suivre = (e: MediaQueryListEvent) => s.set(e.matches);
    mq.addEventListener('change', suivre);
    inject(DestroyRef).onDestroy(() => mq.removeEventListener('change', suivre));
  }
  return s.asReadonly();
}

/** D4 : une liste qui dépasse son pas de 2 éléments au plus s'affiche en entier. */
export const LISTE_TOLERANCE = 2;

/**
 * D2 : un texte replié montre `lignes` lignes puis le bouton « Lire la suite » (44 px de haut et
 * 4 px de marge, src/styles/_densite.scss) ; il ne se replie que si la page y gagne au moins
 * `gainMinLignes` lignes.
 */
export const REPLI = { lignes: 6, boutonPx: 48, gainMinLignes: 3 } as const;

/**
 * Hauteur (px) que le repli fait gagner à la page : texte entier contre texte replié plus bouton,
 * dans une rangée dont l'encart voisin le plus haut mesure `voisin` (0 sans voisin). Un encart plus
 * haut que le texte entier fixe la hauteur de la rangée : replier n'y gagne rien.
 */
export function gainDuRepli(entier: number, ligne: number, voisin = 0, lignes: number = REPLI.lignes): number {
  return Math.max(0, Math.max(entier, voisin) - Math.max(lignes * ligne + REPLI.boutonPx, voisin));
}

/**
 * Hauteur du plus haut voisin de `cellule` sur la même rangée d'une grille ou d'une flexbox en
 * ligne (0 sinon). Un voisin étiré (align-self stretch) prend la hauteur de la rangée, donc la
 * nôtre : on l'ignore, sa hauteur propre n'est pas mesurable.
 */
export function hauteurVoisine(cellule: Element): number {
  const parent = cellule.parentElement;
  if (!parent) return 0;
  const sp = getComputedStyle(parent);
  const grille = /grid/.test(sp.display);
  const ligneFlex = /flex/.test(sp.display) && !sp.flexDirection.startsWith('column');
  if (!grille && !ligneFlex) return 0;
  const haut = cellule.getBoundingClientRect().top;
  let max = 0;
  for (const v of Array.from(parent.children)) {
    if (v === cellule) continue;
    const r = v.getBoundingClientRect();
    if (!r.height || Math.abs(r.top - haut) > 2) continue;
    const self = getComputedStyle(v).alignSelf;
    const align = self === 'auto' || !self ? sp.alignItems : self;
    if (!align || align === 'normal' || align === 'stretch') continue;
    max = Math.max(max, r.height);
  }
  return max;
}
