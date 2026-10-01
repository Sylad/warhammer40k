/**
 * L23 — page Nouveautés : fonctions pures (testées par Vitest, sans Angular).
 */

/** [largeur, hauteur] d'une capture, lus dans tailles.json (npm run news). */
export type CaptureSize = [number, number];

/** Jour (YYYY-MM-DD) en toutes lettres, sans décalage de fuseau. */
export function formatDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

export function captureAlt(title: string, index: number, count: number): string {
  return count > 1 ? `Capture d’écran ${index + 1} sur ${count} : ${title}` : `Capture d’écran : ${title}`;
}

/**
 * Place réservée AVANT chargement : le lien prend min(largeur dispo, largeur naturelle,
 * largeur qui donne 32rem de haut), l'image le remplit à ses proportions (aspect-ratio).
 * Une capture de téléphone ne s'étire pas, une de bureau ne déborde pas.
 */
export function captureBoxWidth(size: CaptureSize | undefined): string | null {
  return size ? `min(100%, ${size[0]}px, calc(32rem * ${size[0]} / ${size[1]}))` : null;
}

/** Largeur sous laquelle la visionneuse passe en mode téléphone. */
export const PHONE_MAX = 640;

/**
 * - `scroll` (téléphone) : largeur naturelle, au plus deux largeurs d'écran, dans une zone
 *   qui défile (leçon d'ol-companion L13 : réduite à l'écran, une capture est illisible) ;
 * - `fit` (bureau) : capture entière à l'écran ;
 * - `natural` (bureau) : capture haute qui, entière, perdrait plus de 20 % de sa largeur
 *   → largeur naturelle, défilement vertical (revue UX claude-code-codex L13).
 * Marges : 50 px de large, 104 px de haut (bouton « Fermer » hors de la zone).
 */
export function viewerMode(
  size: CaptureSize | undefined,
  viewport: { width: number; height: number },
): 'scroll' | 'fit' | 'natural' {
  if (viewport.width < PHONE_MAX) return 'scroll';
  if (!size) return 'fit';
  const scale = Math.min(1, (viewport.width - 50) / size[0], (viewport.height - 104) / size[1]);
  return scale < 0.8 ? 'natural' : 'fit';
}

/** Largeur de la capture dans la visionneuse au téléphone : naturelle, au plus 2 écrans. */
export function viewerPhoneWidth(size: CaptureSize, viewportWidth: number): number {
  return Math.min(size[0], 2 * viewportWidth);
}

/**
 * Index de la première entrée déjà vue qui suit une entrée nouvelle (séparateur
 * « Déjà vu lors de votre visite du … ») ; -1 s'il n'y a pas lieu (premier visiteur,
 * rien de nouveau, ou tout est nouveau).
 */
export function separatorIndex(fresh: readonly boolean[], hasVisited: boolean): number {
  if (!hasVisited) return -1;
  const last = fresh.lastIndexOf(true);
  return last >= 0 && last + 1 < fresh.length ? last + 1 : -1;
}
