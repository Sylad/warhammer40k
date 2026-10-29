import type { WikiImageResult } from '../services/warhammer.service';

/** Fichiers que le wiki renvoie à la place d'une image absente. */
const FICHIER_INDISPONIBLE = /unavailable|pict-file|image[_-]?not[_-]?found|no[_-]?image/i;

const titre = (t: string): string => t.toLowerCase().replace(/_/g, ' ').trim();

/**
 * L207 (Concepts), repris par les Saints (L215) : une page de galerie (`galleryPages`) n'entre dans une galerie que si le
 * wiki a répondu sous le titre demandé, avec une vraie image (pas le fichier « indisponible »). Un autre titre est le repli
 * de recherche du wiki : « Cadia art » rendait la page Cadian Sector et l'illustration de Lorgar (L200).
 */
export function pageCiblee(demandee: string, r: Pick<WikiImageResult, 'imageUrl' | 'pageTitle'>): boolean {
  if (!r.imageUrl || !r.pageTitle) return false;
  if (FICHIER_INDISPONIBLE.test(r.imageUrl)) return false;
  return titre(r.pageTitle) === titre(demandee);
}
