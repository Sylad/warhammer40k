import { defilementSelonPreference } from './section-anchor';

/**
 * L239 — après un filtre, le haut des résultats reste en vue.
 *
 * Cause du saut mesuré à 390 px (Galerie : « Artistes à découvrir », « Collections populaires » ; Vidéos :
 * « Filtres avancés ») : ces boutons sont SOUS la liste. Filtrer raccourcit la liste, donc le document, et le
 * navigateur ramène `scrollY` au nouveau maximum : la page saute d'une distance qui dépend du nombre de
 * résultats (309 à 858 px), le bouton pressé peut sortir de l'écran par le haut et le haut des résultats est
 * loin au-dessus.
 *
 * À appeler une fois le nouveau rendu fait. Si le haut des résultats est encore visible (filtre au-dessus de la
 * liste, ou à côté au bureau), on ne touche à rien : `scrollY` ne bouge pas. Sinon on y va en un seul défilement
 * (instantané avec prefers-reduced-motion), sous la barre du haut (`scroll-padding-top`), et le focus suit le
 * contenu remplacé (WCAG 2.4.3, comme la pagination L71) au lieu de rester sur un bouton hors de l'écran.
 * Rend vrai si la page a défilé.
 */
export function garderResultatsEnVue(resultats: HTMLElement | null | undefined): boolean {
  if (!resultats?.isConnected) return false;
  const marge = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  if (resultats.getBoundingClientRect().top >= marge - 1) return false;
  resultats.focus({ preventScroll: true });
  resultats.scrollIntoView?.({ behavior: defilementSelonPreference(), block: 'start' });
  return true;
}
