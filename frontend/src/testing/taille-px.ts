/**
 * L253 — taille de texte d'une déclaration CSS en px, au réglage normal (1rem = 16 px). Depuis L253 les
 * feuilles écrivent les tailles de texte en rem (elles suivent la taille de police choisie, WCAG 1.4.4) :
 * un test qui garde un minimum en px compare cette valeur, jamais `parseFloat` du texte brut (« 0.75rem » → 0,75).
 */
export function taillePx(valeur: string): number {
  const m = /^\s*(-?\d*\.?\d+)(px|rem)\s*$/.exec(valeur);
  if (!m) return NaN;
  return m[2] === 'rem' ? parseFloat(m[1]) * 16 : parseFloat(m[1]);
}
