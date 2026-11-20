/**
 * L73 — nombre d'œuvres de la galerie, seule source du compte « Œuvres » de l'accueil ET de la
 * galerie : tout ce que la galerie montre, c'est-à-dire le catalogue (`/api/artworks`) plus les
 * images personnelles (`/api/images`, décision du lead du 06-10). La galerie construit sa liste
 * dans le même ordre (catalogue puis images perso, une carte par élément).
 */
export function nombreOeuvresGalerie(catalogue: readonly unknown[], imagesPerso: readonly unknown[]): number {
  return catalogue.length + imagesPerso.length;
}
