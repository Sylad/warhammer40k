/** Fond de référence des textes sur les bandeaux sombres : le plus clair que l'image d'un dieu laisse sous son overlay. */
export const FOND_TEXTE_SOMBRE = '#2a2624';

const canaux = (hex: string): number[] => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

const luminance = (hex: string): number => {
  const [r, g, b] = canaux(hex).map(v => v / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Rapport de contraste WCAG entre deux couleurs `#rrggbb`. */
export function contraste(a: string, b: string): number {
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (sombre + 0.05);
}

/**
 * Teinte de texte dérivée d'une couleur `#rrggbb` trop sombre pour être lue (WCAG 1.4.3) : on la mélange au blanc,
 * par pas de 2 %, jusqu'à `minimum`:1 sur `fond`. La couleur déjà assez claire est rendue telle quelle ; les autres
 * gardent leur teinte (le mélange éclaircit sans changer de famille). L'originale reste pour bordures et sigils.
 */
export function teinteLisible(hex: string, fond: string = FOND_TEXTE_SOMBRE, minimum = 4.5): string {
  const base = canaux(hex);
  for (let part = 0; part <= 1.0001; part += 0.02) {
    const c = '#' + base.map(v => Math.round(v + (255 - v) * part).toString(16).padStart(2, '0')).join('');
    if (contraste(c, fond) >= minimum) return c;
  }
  return '#ffffff';
}
