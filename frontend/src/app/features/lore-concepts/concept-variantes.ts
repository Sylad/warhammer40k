import type { LoreConcept } from '../../core/models/models';
import type { WikiImageResult } from '../../core/services/warhammer.service';

/** Fichiers que le wiki renvoie à la place d'une image absente. */
const FICHIER_INDISPONIBLE = /unavailable|pict-file|image[_-]?not[_-]?found|no[_-]?image/i;
/** Mots d'une requête qui ne désignent pas le sujet et suffiraient à valider n'importe quelle page. */
const MOTS_GENERIQUES = new Set(['warhammer', 'homeworld', 'emperor', 'chaos', 'great']);

const mots = (texte: string): string[] =>
  texte.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').split(/[^a-z0-9]+/).filter(m => m.length >= 4 && !MOTS_GENERIQUES.has(m));

/**
 * L200 : une variante de recherche n'entre dans la galerie de la visionneuse que si elle ramène une vraie image
 * (pas le fichier « indisponible » du wiki) d'une page du sujet : le titre de la page partage un mot avec la requête
 * du concept. Sinon le wiki a répondu par la première page trouvée à la recherche (Red Templars pour le Codex
 * Astartes, Lorgar pour Cadia).
 */
export function varianteDuSujet(c: Pick<LoreConcept, 'name' | 'wikiQuery'>, r: Pick<WikiImageResult, 'imageUrl' | 'pageTitle'>): boolean {
  if (!r.imageUrl || !r.pageTitle) return false;
  if (FICHIER_INDISPONIBLE.test(r.imageUrl)) return false;
  const sujet = new Set([...mots(c.wikiQuery), ...mots(c.name)]);
  return mots(r.pageTitle).some(m => sujet.has(m));
}
