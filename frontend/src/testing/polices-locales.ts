/**
 * L259 r1 — les vraies polices web (Cinzel, Inter) dans un test navigateur, sans réseau.
 *
 * La prod charge Cinzel chez Google Fonts (`index.html`) ; les e2e la bloquaient, et mesuraient donc la police de
 * secours (Georgia ou équivalent), plus étroite : un titre « qui tient » dans le test se coupait en prod (QA du
 * 25-11, « CONCEPT|S » à 320 px, texte à 200 %). Ici, la feuille de Google Fonts et ses fichiers sont servis depuis
 * `src/testing/polices/` (sous-ensemble latin de Google Fonts, Cinzel v26 et Inter v20, licence SIL OFL 1.1) : même
 * famille, mêmes graisses, mêmes adresses que la prod, donc même politique de sécurité de contenu (`font-src`).
 * Le sous-ensemble latin couvre tout le texte du site (U+0000-00FF, ponctuation U+2000-206F dont les espaces fines).
 * `ng build` copie la feuille de Google Fonts dans `index.html` (optimisation `inlineFonts`) : les adresses
 * `fonts.gstatic.com/s/<famille>/…` y sont figées au jour du build. Chaque fichier d'une famille connue reçoit donc
 * le fichier latin local, quel que soit son nom (les autres sous-ensembles n'ont aucun caractère du site à dessiner).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from 'playwright-core';

const DOSSIER = join(__dirname, 'polices');
const GSTATIC = 'https://fonts.gstatic.com/polices-locales';

/** Polices variables : un seul fichier pour toutes les graisses demandées par `index.html`. */
const POLICES = [
  { famille: 'Cinzel', fichier: 'cinzel-latin.woff2', graisses: [400, 600, 700] },
  { famille: 'Inter', fichier: 'inter-latin.woff2', graisses: [300, 400, 500] },
];

const FEUILLE = POLICES.flatMap((p) => p.graisses.map((g) => `@font-face {
  font-family: '${p.famille}';
  font-style: normal;
  font-weight: ${g};
  font-display: swap;
  src: url(${GSTATIC}/${p.fichier}) format('woff2');
}`)).join('\n');

/** Sert Cinzel et Inter depuis les fichiers du dépôt à la place de Google Fonts ; tout autre appel à Google Fonts
 *  (icônes Material) est coupé. `retenir` : les fichiers de police attendent l'appel de la fonction rendue (polices
 *  arrivées après le premier rendu, comme sur un réseau lent). */
export async function servirPolicesLocales(page: Page, retenir = false): Promise<() => void> {
  let liberer = () => {};
  const libres = retenir ? new Promise<void>((r) => (liberer = r)) : Promise.resolve();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, async (route) => {
    const url = route.request().url();
    if (/fonts\.googleapis\.com\/css2\?family=Cinzel/.test(url)) {
      return route.fulfill({ contentType: 'text/css', body: FEUILLE, headers: { 'access-control-allow-origin': '*' } });
    }
    const p = POLICES.find((x) => url === `${GSTATIC}/${x.fichier}` || url.includes(`fonts.gstatic.com/s/${x.famille.toLowerCase()}/`));
    if (!p) return route.abort();
    await libres;
    return route.fulfill({ contentType: 'font/woff2', body: readFileSync(join(DOSSIER, p.fichier)), headers: { 'access-control-allow-origin': '*' } });
  });
  return liberer;
}

/** Attend les polices web et vérifie que Cinzel est réellement chargée (pas la police de secours). */
export function cinzelChargee(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some((f) => f.family.replace(/['"]/g, '') === 'Cinzel' && f.status === 'loaded');
  });
}
