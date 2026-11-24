/**
 * L250 — seuils de la barre du haut en rem.
 *
 * Les media queries de la barre sont en em : elles suivent la police par défaut du navigateur, mais
 * pas la taille de police de la PAGE (`html { font-size: 200% }`, extension ou feuille de l'utilisateur,
 * WCAG 1.4.4). Texte à 200 %, la barre complète restait affichée à 1440 px et débordait de 640 px.
 * Les mêmes seuils, comptés en rem (taille de police de <html>), posent des classes sur l'hôte qui
 * reprennent les règles des media queries. Police de la page à 100 % : 1rem = 1em de media query,
 * les classes coïncident avec les media queries, la barre ne change pas.
 *
 * Mêmes valeurs que les media queries de `main-layout.component.ts` (comparées par
 * `seuils-barre.spec.ts`).
 */
export const SEUILS_BARRE = {
  /** Sous 106,25rem : barre compacte (sans icônes ni sous-titre). */
  'barre-compacte': 106.25,
  /** Sous 84rem : navigation dans le tiroir, bouton « Menu ». */
  'barre-tiroir': 84,
  /** Sous 31rem : marges réduites, raccourci « Ctrl K » masqué. */
  'barre-etroite': 31,
  /** Sous 20,5rem : le mot « Menu » s'efface. */
  'barre-sans-mot': 20.5,
  /** Sous 19rem : l'aigle du logo s'efface. */
  'barre-sans-aigle': 19,
} as const;

export type ClasseBarre = keyof typeof SEUILS_BARRE | 'texte-agrandi' | 'texte-plus-grand';

/**
 * Police de la page agrandie d'au moins 25 % par rapport à la police par défaut du navigateur
 * (`font-size: medium`) : seul cas où la barre change de forme au-delà des seuils (logo sur deux
 * lignes resserrées au téléphone). Police de la page à 100 % : jamais.
 */
export const TEXTE_AGRANDI = 1.25;

/**
 * L253 — taille du texte de référence des feuilles (1rem = 16 px). Au-delà, quelle qu'en soit la source (police
 * par défaut du navigateur réglée plus grande, `html { font-size: 200% }`), les tailles de texte en rem grandissent
 * et la classe `texte-plus-grand` active les règles de reflux du contenu (`src/styles/_texte-agrandi.scss`).
 * À 16 px, jamais : le rendu normal ne change pas.
 */
export const REM_REFERENCE = 16;

/**
 * Classes actives pour une fenêtre de `largeur` px (barre de défilement comprise, comme une media
 * query : `window.innerWidth`), une taille de police de page de `rem` px et une police par défaut
 * du navigateur de `defaut` px.
 */
export function classesBarre(largeur: number, rem: number, defaut = rem): Record<ClasseBarre, boolean> {
  const r = Number.isFinite(rem) && rem > 0 ? rem : 16;
  const d = Number.isFinite(defaut) && defaut > 0 ? defaut : r;
  const out = { 'texte-agrandi': r >= d * TEXTE_AGRANDI, 'texte-plus-grand': r > REM_REFERENCE + 0.01 } as Record<ClasseBarre, boolean>;
  for (const [classe, seuil] of Object.entries(SEUILS_BARRE) as [keyof typeof SEUILS_BARRE, number][]) out[classe] = largeur < seuil * r;
  return out;
}
