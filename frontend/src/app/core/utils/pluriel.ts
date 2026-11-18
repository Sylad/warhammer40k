/**
 * L69 — accord en nombre, règle française : 0 et 1 au singulier, 2 et plus au pluriel
 * (« 0 œuvre », « 1 œuvre », « 2 œuvres »). Une seule règle pour tous les compteurs.
 */
export const accord = (n: number, one: string, many: string): string => (n > 1 ? many : one);

/** Le nombre suivi de son nom accordé : `plural(1, 'œuvre', 'œuvres')` → « 1 œuvre ». */
export const plural = (n: number, one: string, many: string): string => `${n} ${accord(n, one, many)}`;
