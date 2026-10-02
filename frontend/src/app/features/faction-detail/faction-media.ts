/**
 * L42 — contenu du bloc « Médias » d'une page faction, tiré des données :
 *  - illustrations : champ `faction` (identifiant) ; la première dans l'ordre des données (la
 *    plus appréciée des Space Marines est « L'Empereur sur le Trône d'Or », étiquetée space-marines) ;
 *  - vidéos : AUCUN champ faction — seules leurs `tags` (texte libre) nomment parfois une faction
 *    ou une sous-faction. Une vidéo est retenue si une étiquette ÉGALE (casse et accents ignorés)
 *    le nom de la faction ou d'une de ses sous-factions ; à la une, puis incontournable, d'abord.
 *  Rien de correspondant → null : la page montre un visuel neutre (symbole de la faction).
 */
const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

export function videoForFaction<V extends { tags?: string[]; featured?: boolean; incontournable?: boolean }>(
  videos: readonly V[],
  names: readonly string[],
): V | null {
  const wanted = new Set(names.filter(Boolean).map(norm));
  const hits = videos.filter((v) => (v.tags ?? []).some((t) => wanted.has(norm(t))));
  return hits.find((v) => v.featured) ?? hits.find((v) => v.incontournable) ?? hits[0] ?? null;
}

export function artworkForFaction<A extends { faction?: string }>(artworks: readonly A[], factionId: string): A | null {
  return artworks.find((a) => a.faction === factionId) ?? null;
}
