/**
 * L31/L32 — nombre de caractères du mot le plus long d'un titre, posé en `--longest-word` sur le
 * titre : la feuille (mixin `fit-title`) borne sa taille pour que ce mot tienne dans son conteneur.
 * Le trait d'union sépare (une ligne peut se couper après lui), pas l'apostrophe ni la virgule.
 */
export function longestWord(text: string | null | undefined): number {
  return Math.max(1, ...(text ?? '').split(/[\s\-‐]+/).map((w) => [...w].length));
}
