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
 *
 * L240 r1 (revue UX du 20-11) : la colonne entière est posée à son propre `top` collé (96 px), pas au
 * `scroll-padding-top` (78 px) : posée plus haut, elle sautait de 18 à 49 px et un second clic au même point tombait sur
 * la rangée suivante. Et sans réduction de mouvement, le conteneur de la colonne garde sa hauteur pendant le glissé
 * (`avantFiltre(controle)`) : sinon la liste raccourcie faisait remonter la colonne sous la barre (−92 px) dès la
 * première image, avant que la page ne défile.
 *
 * L240 r2 (revue UX du 20-11, M1-bis) : la rangée bougeait encore là où rien ne défilait (scrollY 1460-1540 à 1440 × 900 :
 * conteneur raccourci rendu tout de suite, colonne repoussée de 6 à 117 px) et en fin de page (colonne déjà repoussée
 * par le bas de son conteneur, ramenée à son `top` par le défilement vers les résultats, +26 à +131 px). Une colonne
 * COLLÉE (à son `top` ou repoussée au-dessus) reste maintenant là où elle était avant le clic : son conteneur garde la
 * hauteur qui la laisse à cette place au défilement visé (`tenir`, gardée jusqu'au filtre suivant ou à un
 * redimensionnement), et ce défilement ne remonte pas au-delà de la borne où la colonne devrait bouger (`borneBasse`),
 * quitte à ne pas amener l'en-tête des résultats sous la barre : la rangée pressée reste sous le pointeur, le focus aussi.
 */

/** Délai maximal avant de rendre au document sa hauteur (navigateur sans `scrollend`, rendu qui n'arrive pas). */
export const GEL_MAX_MS = 1500;

let gelActif: (() => void) | null = null;

/** Coupe l'ancrage et garde la hauteur du document le temps d'un filtre. Rend la fonction à appeler après le rendu. */
export function avantFiltre(
  controle?: HTMLElement | null,
): (resultats: HTMLElement | null | undefined, controle?: HTMLElement | null) => boolean {
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
  // contrôle dans une colonne collée : son conteneur garde sa hauteur jusqu'au rendu (et pendant le glissé, voir plus bas)
  const colonne = colonneDuControle(controle);
  colonne?.garder();
  let delai: ReturnType<typeof setTimeout> | undefined;
  /** Ce que `liberer` fait du conteneur de la colonne : le rendre (par défaut), ou le tenir à sa place (L240 r2). */
  let finColonne = () => colonne?.rendre();
  const liberer = () => {
    if (gelActif !== liberer) return;
    gelActif = null;
    clearTimeout(delai);
    window.removeEventListener('scrollend', liberer);
    html.style.overflowAnchor = ancre;
    html.style.minHeight = hauteur;
    finColonne();
  };
  gelActif = liberer;
  delai = setTimeout(liberer, GEL_MAX_MS);
  const defiler = (but: number, glisse: boolean) => {
    window.scrollTo({ top: but, behavior: glisse ? 'smooth' : 'instant' });
    if (glisse) {
      window.addEventListener('scrollend', liberer, { once: true });
      clearTimeout(delai); // le glissé (0,5 à 0,8 s mesurés) a tout son délai, compté de son départ
      delai = setTimeout(liberer, GEL_MAX_MS);
    } else liberer();
  };
  return (resultats, ctrl = controle) => {
    if (gelActif !== liberer) return false; // un filtre plus récent a pris la main
    colonne?.rendre(); // mesures sur la mise en page filtrée
    const hauteurFiltree = basDuCorps() + surplus;
    const lisse = defilementSelonPreference() === 'smooth';
    if (colonne?.collee) {
      // L240 r2 : la colonne reste où elle était (rangée sous le pointeur) ; défilement vers les résultats borné en conséquence
      const depart = window.scrollY;
      const borne = colonne.borneBasse();
      const versResultats = butDuDefilement(resultats, hauteurFiltree, null, false, colonne.plafond(hauteurFiltree));
      let but = Math.max(0, borne, versResultats ?? depart);
      if (Math.abs(but - depart) < 1) but = depart;
      finColonne = () => colonne.tenir(but);
      if (but === depart) {
        liberer();
        return false;
      }
      if (resultats?.isConnected && enteteVisibleA(resultats, but)) resultats.focus({ preventScroll: true });
      // glissé seulement si la colonne peut rester en place à chaque image (sinon instantané : la rangée ne bouge pas).
      // Pendant le glissé, son `top` collé est sa place et le conteneur assez long pour ne jamais la repousser : le
      // défilement composité de Chromium ne l'attend pas, une hauteur suivie à chaque événement `scroll` aurait une
      // image de retard. À la fin, `top` rendu et conteneur tenu : elle est déjà à sa place.
      const glisse = lisse && depart >= borne - 1;
      if (glisse) {
        colonne.tenir(Math.max(depart, but));
        const rendreTop = colonne.poserTop();
        finColonne = () => { rendreTop(); colonne.tenir(but); };
      } else colonne.tenir(but);
      defiler(but, glisse);
      return true;
    }
    const but = butDuDefilement(resultats, hauteurFiltree, ctrl);
    if (but === null) {
      liberer();
      return false;
    }
    // glissé qui finit avec la colonne collée posée à son `top` : on la garde collée pendant tout le trajet (la mise en
    // page filtrée la ferait remonter dès la première image) ; rendue à la fin, elle est déjà à sa place
    if (lisse && but <= limiteCollee(ctrl, 0, true) + 1) colonne?.garder();
    defiler(but, lisse);
    return true;
  };
}

/** Valeur de `min-height` de chaque conteneur avant qu'on la tienne (L240 r2). */
const styleInitial = new WeakMap<HTMLElement, string>();
/** Hauteur tenue rendue au premier redimensionnement de la fenêtre (une colonne à la fois). */
let relacherAuRedimensionnement: { conteneur: HTMLElement; retirer(): void } | null = null;

/**
 * Colonne collée (`position: sticky`) qui porte `controle`, mesurée avant le filtre ; null hors bloc collé.
 *  - `garder` / `rendre` : hauteur de son conteneur gardée telle quelle, ou rendue (mise en page naturelle) ;
 *  - `tenir(s)` : le conteneur finit au moins là où la colonne, au défilement `s`, reste à sa place d'avant le filtre
 *    (gardé jusqu'au filtre suivant ou à un redimensionnement de la fenêtre) ;
 *  - `poserTop()` : `top` collé posé à sa place le temps d'un glissé ;
 *  - `borneBasse()` : plus petit défilement où la colonne peut rester à cette place (en deçà elle redescendrait : dans
 *    le flux, ou repoussée par le bas d'un conteneur plus long) ;
 *  - `plafond(h)` : plus grand défilement atteignable avec la hauteur tenue, pour une page filtrée de hauteur `h`.
 *
 * Une colonne de hauteur H, collée à `top`, dans un conteneur dont le contenu finit à B (document), est au défilement S
 * à min(max(top, flux − S), B − H − S) dans la fenêtre. Pour la garder à sa place p ≤ top : B ≥ p + H + S (`tenir`,
 * `min-height` ne fait qu'allonger), et S assez grand pour que le conteneur naturel ne la tienne pas plus bas : S ≥ flux − top
 * si p = top, S ≥ B − H − p si elle est repoussée (`borneBasse`).
 */
function colonneDuControle(controle: HTMLElement | null | undefined) {
  const bloc = controle?.isConnected ? ancetreColle(controle) : null;
  const conteneur = bloc?.parentElement;
  if (!bloc || !conteneur) return null;
  const px = (v: string) => parseFloat(v) || 0;
  const cs = getComputedStyle(conteneur);
  const haut = px(cs.paddingTop) + px(cs.borderTopWidth);
  const bas = px(cs.paddingBottom) + px(cs.borderBottomWidth);
  const borderBox = cs.boxSizing === 'border-box';
  if (!styleInitial.has(conteneur)) styleInitial.set(conteneur, conteneur.style.minHeight);
  const initial = styleInitial.get(conteneur)!;
  /** Fin du contenu du conteneur, en coordonnées du document. */
  const finContenu = () => conteneur.getBoundingClientRect().bottom + window.scrollY - bas;
  /** `min-height` qui fait finir le contenu du conteneur en `fin` (coordonnées du document). */
  const poser = (fin: number) => {
    const debut = conteneur.getBoundingClientRect().top + window.scrollY;
    conteneur.style.minHeight = `${Math.max(0, borderBox ? fin + bas - debut : fin - debut - haut)}px`;
  };
  const r = bloc.getBoundingClientRect();
  const csBloc = getComputedStyle(bloc);
  const top = parseFloat(csBloc.top);
  const place = r.top; // haut de la colonne dans la fenêtre, avant le filtre
  const hauteur = r.height + px(csBloc.marginBottom);
  const finAvant = finContenu();
  const rendre = () => { conteneur.style.minHeight = initial; };
  return {
    /** Collée à son `top`, ou repoussée au-dessus par le bas de son conteneur (sinon : dans le flux, pas encore collée). */
    collee: Number.isFinite(top) && place <= top + 0.5,
    /** `top` collé posé à la place de la colonne (elle n'en bouge plus tant qu'elle est collée) ; rend la fonction qui le rétablit. */
    poserTop: () => {
      const avant = bloc.style.top;
      bloc.style.top = `${place}px`;
      return () => { bloc.style.top = avant; };
    },
    garder: () => poser(finAvant),
    rendre,
    tenir: (s: number) => {
      poser(place + hauteur + s);
      if (relacherAuRedimensionnement?.conteneur === conteneur) return;
      relacherAuRedimensionnement?.retirer();
      const relacher = () => {
        retirer();
        conteneur.style.minHeight = initial;
      };
      const retirer = () => {
        window.removeEventListener('resize', relacher);
        relacherAuRedimensionnement = null;
      };
      relacherAuRedimensionnement = { conteneur, retirer };
      window.addEventListener('resize', relacher);
    },
    borneBasse: () => {
      if (Math.abs(place - top) > 0.5) return finContenu() - hauteur - place; // repoussée : le bas du conteneur la tient
      // à son `top` : il suffit qu'elle soit collée, donc que sa place dans le flux soit passée sous ce `top`
      const position = bloc.style.position;
      bloc.style.position = 'static';
      const flux = bloc.getBoundingClientRect().top + window.scrollY;
      bloc.style.position = position;
      return flux - top;
    },
    plafond: (hauteurPage: number) =>
      place + hauteur + (hauteurPage - finContenu()) >= window.innerHeight ? Infinity : hauteurPage - window.innerHeight,
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
  const but = butDuDefilement(resultats, hauteur, controle);
  if (but === null) return false;
  window.scrollTo({ top: but, behavior: defilementSelonPreference() });
  return true;
}

/** `scrollY` visé pour garder l'en-tête des résultats en vue (focus posé sur la liste), ou null si rien ne doit bouger. */
function butDuDefilement(
  resultats: HTMLElement | null | undefined,
  hauteur: number,
  controle?: HTMLElement | null,
  focus = true,
  plafond = hauteur - window.innerHeight,
): number | null {
  if (!resultats?.isConnected || enteteEnVue(resultats)) return null;
  const marge = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  // But borné par la hauteur de la page filtrée (`hauteur`, sans celle que garde avantFiltre()) : sinon le défilement
  // irait plus bas qu'elle ne le permet et la page sauterait de la différence quand on lui rend sa hauteur.
  const cible = window.scrollY + resultats.getBoundingClientRect().top - marge;
  if (focus) resultats.focus({ preventScroll: true });
  const tete = (resultats.querySelector(':scope > header') as HTMLElement | null) ?? resultats;
  const r = tete.getBoundingClientRect();
  // L240 : contrôle dans une colonne collée → on garde la colonne entière à sa place (son `top` collé) si l'en-tête des
  // résultats reste alors entièrement dans la fenêtre, sinon le contrôle pressé seul sous la barre
  const enteteVisibleA = (s: number) => r.bottom + window.scrollY - s <= window.innerHeight;
  const colonne = limiteCollee(controle, marge, true);
  const limite = enteteVisibleA(Math.min(cible, colonne)) ? colonne : limiteCollee(controle, marge);
  return Math.max(0, Math.min(cible, plafond, limite));
}

/** En-tête des résultats entièrement dans la fenêtre, sous la barre, une fois la page défilée jusqu'à `s` ? */
function enteteVisibleA(resultats: HTMLElement, s: number): boolean {
  const marge = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const r = ((resultats.querySelector(':scope > header') as HTMLElement | null) ?? resultats).getBoundingClientRect();
  const d = s - window.scrollY;
  return r.top - d >= marge - 1 && r.bottom - d <= window.innerHeight + 1;
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
 * (`position: sticky`) ; +∞ sinon (contrôle hors bloc collé, ou absent). `blocEntier` : le bloc collé lui-même, posé à
 * son `top` collé (96 px aux Vidéos) et non à `marge` (78 px) — posé plus haut, il remontait de 18 px sous le pointeur,
 * qui tombait alors sur la rangée suivante (revue r1 de L240) ; `marge` ne sert que si ce `top` n'est pas une longueur.
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
  if (blocEntier) {
    const top = parseFloat(getComputedStyle(bloc).top);
    return finConteneur - hauteurBloc - (Number.isFinite(top) ? top : marge);
  }
  return finConteneur - hauteurBloc + controle.getBoundingClientRect().top - r.top - marge;
}
