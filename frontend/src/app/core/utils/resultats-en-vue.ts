import { defilementSelonPreference } from './section-anchor';

/**
 * L239 — après un filtre, le haut des résultats (titre et compte) est en vue, et la page ne saute jamais d'elle-même.
 *
 * Trois sauts mesurés (revues du 20-11) :
 *  - 390 px, filtre SOUS la liste (« Artistes à découvrir », « Collections populaires », « Filtres avancés ») : le
 *    filtre raccourcit le document et le navigateur rabat `scrollY` au nouveau maximum (309 à 858 px, bouton pressé
 *    sorti de l'écran par le haut) ; sans réduction de mouvement, ce rabattement faisait une première image avant le
 *    glissé (revue r1, m3) ;
 *  - 1440 px, ancrage de défilement de Chromium (`overflow-anchor`) : la grille raccourcie déplace l'ancre et la
 *    page saute de ~520 px, le bouton pressé (qui garde le focus) sort de l'écran par le bas (r1, M1 ; m5 aux Vidéos) ;
 *  - filtre AU-DESSUS de la liste (carte de catégorie, puces des Vidéos) : rien ne bougeait, mais le titre et le
 *    compte des résultats restaient sous la fenêtre (1160 à 2451 px pour 844 ; r1, M2).
 *
 * Usage : `const fin = avantFiltre();` juste AVANT de changer l'état, puis `fin(sectionResultats)` une fois le
 * nouveau rendu fait (afterNextRender). Entre les deux, l'ancrage est coupé et le document garde au moins sa hauteur :
 * le navigateur ne déplace rien. Ensuite :
 *  - en-tête des résultats entièrement visible (sous la barre du haut, au-dessus du bas de la fenêtre) → rien ne
 *    bouge, le focus reste sur le bouton pressé (visible) ;
 *  - sinon, au-dessus OU en dessous → un seul défilement qui le pose sous la barre (`scroll-padding-top`), ou aussi
 *    près que le permet la fin de la page filtrée,
 *    instantané avec prefers-reduced-motion, et le focus suit le contenu remplacé (WCAG 2.4.3, comme la pagination
 *    L71) au lieu de rester sur un bouton sorti de l'écran (WCAG 2.4.11).
 * La hauteur gardée est rendue à la fin du défilement (`scrollend`, ou au plus tard après un délai).
 *
 * L240 (revue r2 de L239, m1) : au bureau, « Filtres avancés » des Vidéos est dans une colonne COLLÉE ; la liste
 * filtrée raccourcit la mise en page, la colonne remonte avec le bas de son conteneur et le bouton pressé finissait à
 * 54-90 px, sous la barre du haut (70 px). `fin(resultats, controle)` borne le défilement pour que la colonne collée
 * entière reste sous la barre si l'en-tête des résultats tient encore dans la fenêtre, sinon le contrôle pressé seul
 * (voir `limiteCollee()`).
 */

/** Délai maximal avant de rendre au document sa hauteur (navigateur sans `scrollend`, rendu qui n'arrive pas). */
export const GEL_MAX_MS = 1500;

let gelActif: (() => void) | null = null;

/** Coupe l'ancrage et garde la hauteur du document le temps d'un filtre. Rend la fonction à appeler après le rendu. */
export function avantFiltre(): (resultats: HTMLElement | null | undefined, controle?: HTMLElement | null) => boolean {
  gelActif?.();
  const html = document.documentElement;
  // ce qui dépasse le bas du <body> (marge du dernier élément, qui traverse celle du body) : la hauteur gardée
  // ci-dessous ne touche pas le <body>, donc la hauteur de la page filtrée = bas du <body> + ce surplus
  const basDuCorps = () => document.body.getBoundingClientRect().bottom + window.scrollY;
  const surplus = html.scrollHeight - basDuCorps();
  const ancre = html.style.overflowAnchor;
  const hauteur = html.style.minHeight;
  html.style.overflowAnchor = 'none';
  html.style.minHeight = `${html.scrollHeight}px`;
  let delai: ReturnType<typeof setTimeout> | undefined;
  const liberer = () => {
    if (gelActif !== liberer) return;
    gelActif = null;
    clearTimeout(delai);
    window.removeEventListener('scrollend', liberer);
    html.style.overflowAnchor = ancre;
    html.style.minHeight = hauteur;
  };
  gelActif = liberer;
  delai = setTimeout(liberer, GEL_MAX_MS);
  return (resultats, controle) => {
    if (gelActif !== liberer) return false; // un filtre plus récent a pris la main
    const bouge = garderResultatsEnVue(resultats, basDuCorps() + surplus, controle);
    if (bouge && defilementSelonPreference() === 'smooth') {
      window.addEventListener('scrollend', liberer, { once: true });
      clearTimeout(delai); // le glissé (0,5 à 0,8 s mesurés) a tout son délai, compté de son départ
      delai = setTimeout(liberer, GEL_MAX_MS);
    } else liberer();
    return bouge;
  };
}

/** En-tête des résultats (titre et compte) entièrement dans la fenêtre, sous la barre du haut ? */
export function enteteEnVue(resultats: HTMLElement): boolean {
  const marge = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const tete = (resultats.querySelector(':scope > header') as HTMLElement | null) ?? resultats;
  const r = tete.getBoundingClientRect();
  return r.top >= marge - 1 && r.bottom <= window.innerHeight + 1;
}

/** Amène l'en-tête des résultats sous la barre s'il n'est pas en vue, focus compris. Rend vrai si la page a défilé. */
export function garderResultatsEnVue(
  resultats: HTMLElement | null | undefined,
  hauteur = document.documentElement.scrollHeight,
  controle?: HTMLElement | null,
): boolean {
  if (!resultats?.isConnected || enteteEnVue(resultats)) return false;
  const marge = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  // But borné par la hauteur de la page filtrée (`hauteur`, sans celle que garde avantFiltre()) : sinon le défilement
  // irait plus bas qu'elle ne le permet et la page sauterait de la différence quand on lui rend sa hauteur.
  const cible = window.scrollY + resultats.getBoundingClientRect().top - marge;
  resultats.focus({ preventScroll: true });
  const tete = (resultats.querySelector(':scope > header') as HTMLElement | null) ?? resultats;
  const r = tete.getBoundingClientRect();
  // L240 : contrôle dans une colonne collée → on garde la colonne entière sous la barre si l'en-tête des résultats
  // reste alors entièrement dans la fenêtre, sinon le contrôle pressé seul
  const enteteVisibleA = (s: number) => r.bottom + window.scrollY - s <= window.innerHeight;
  const colonne = limiteCollee(controle, marge, true);
  const limite = enteteVisibleA(Math.min(cible, colonne)) ? colonne : limiteCollee(controle, marge);
  const haut = Math.min(cible, hauteur - window.innerHeight, limite);
  window.scrollTo({ top: Math.max(0, haut), behavior: defilementSelonPreference() });
  return true;
}

/** Premier ancêtre (ou l'élément même) en `position: sticky`, sinon null. */
function ancetreColle(el: HTMLElement): HTMLElement | null {
  for (let e: HTMLElement | null = el; e && e !== document.body; e = e.parentElement) {
    if (getComputedStyle(e).position === 'sticky') return e;
  }
  return null;
}

/**
 * L240 — plus grand `scrollY` qui laisse le haut de `controle` sous la barre (`marge`) quand il est dans un bloc collé
 * (`position: sticky`) ; +∞ sinon (contrôle hors bloc collé, ou absent). `blocEntier` : le haut du bloc collé lui-même.
 *
 * Un bloc collé de hauteur H, dans un conteneur dont le contenu finit à B (coordonnées du document), a son haut à
 * D(S) = borne(S + top, position dans le flux, B − H) : au défilement S, le contrôle (décalé de `d` dans le bloc) est à
 * min(max(top, flux − S), B − H − S) + d dans la fenêtre. Le premier terme vaut au moins top + d (le bloc collé est
 * posé sous la barre) ; le second passe sous la marge dès que S > B − H + d − marge. D'où la borne, sans connaître la
 * position dans le flux (inconnue tant que le bloc est collé).
 */
export function limiteCollee(controle: HTMLElement | null | undefined, marge: number, blocEntier = false): number {
  if (!controle?.isConnected) return Infinity;
  const bloc = ancetreColle(controle);
  const conteneur = bloc?.parentElement;
  if (!bloc || !conteneur) return Infinity;
  const cs = getComputedStyle(conteneur);
  const finConteneur = conteneur.getBoundingClientRect().bottom + window.scrollY
    - (parseFloat(cs.paddingBottom) || 0) - (parseFloat(cs.borderBottomWidth) || 0);
  const r = bloc.getBoundingClientRect();
  const hauteurBloc = r.height + (parseFloat(getComputedStyle(bloc).marginBottom) || 0);
  const decalage = blocEntier ? 0 : controle.getBoundingClientRect().top - r.top;
  return finConteneur - hauteurBloc + decalage - marge;
}
