/** Libellé lisible d'une sous-catégorie d'équipement (« daemon-weapon » → « Daemon weapon »), commun à /lore/equipment et à la palette Ctrl+K. */
export function subCategoryLabel(subCategory: string): string {
  const sub = subCategory.replace(/-/g, ' ');
  return sub.charAt(0).toUpperCase() + sub.slice(1);
}
