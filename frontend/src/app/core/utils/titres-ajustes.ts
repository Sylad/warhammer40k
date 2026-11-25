/**
 * L253 passe 2 (WCAG 1.4.4) — titres bornés par leur boîte quand le texte est agrandi.
 *
 * Texte à 200 %, un grand titre double alors que sa colonne garde sa largeur : « ARCHIVE / S » à 1440 px, « Gal|axie »
 * au téléphone (revue UX de L253). `overflow-wrap: anywhere` (styles/_texte-agrandi.scss) le coupait au milieu d'un
 * mot, sans trait. Le mixin `fit-title` (L31) borne déjà certains titres en CSS, à condition de connaître leur mot le
 * plus long et d'avoir un conteneur de requête ; ici, la mesure est faite dans la page, pour tous :
 *  - candidats : les titres h1 à h6 et les textes en Cinzel (police d'affichage : titres de cartes, dates,
 *    étiquettes), jamais un paragraphe, jamais un texte sur une seule ligne (`white-space: nowrap`) ;
 *  - mesure : la largeur du mot le plus long (somme des morceaux d'un mot déjà coupé) contre la largeur du contenu
 *    de la boîte du candidat ;
 *  - s'il ne tient pas, la taille du candidat est réduite juste assez (`font-size` en ligne, marqué
 *    `data-titre-borne`) ; plancher d'un autre texte : sa taille au réglage normal (taille × 16 / rem : les tailles
 *    sont en rem) ; plancher d'un titre (passe 3, revue UX r2 : à 320 px, le h1 de /videos tombait à 32 px sous un
 *    paragraphe d'introduction de 34 px) : jamais sous sa taille au réglage normal, et au moins `ECHELLE[h]` fois le
 *    texte qui le suit (`texteQuiSuit` : le premier paragraphe après lui dans son bloc, au moins 1rem) — h1 1,25,
 *    h2 1,1, h3 à h6 1 ; au-delà, le mot se coupe à une syllabe, avec un trait (`hyphens: auto`) ; le h1 cède
 *    jusqu'à 1,2 fois ce texte si son mot n'y tient pas (L259 r1 : la vraie Cinzel, plus large que la police de
 *    secours des e2e, coupait « CONCEPT|S » à 320 px, sans trait) ;
 *    le h1 dépasse aussi de `SOUS_TITRES` les h2 à h6 qui étaient plus petits que lui au réglage normal, mais ceux-ci
 *    ne le font pas grandir au-delà de ce que son mot le plus long tient : ils redescendent alors sous lui, jamais sous
 *    leur propre plancher (L259 : « Le Warp » à 64 px portait le h1 de /lore/concepts à 70,4 px, « CONC|EPTS ») ;
 *  - un h1 que `fit-title` (L31) a figé sous ce plancher (accueil, fiche unité au téléphone) y est relevé ; un h2 à
 *    h6 borné par `fit-title` (`--longest-word` posé) l'est jusqu'à ce que son mot tienne, jamais sous sa taille au
 *    réglage normal (L255, QA de L253 : sa requête de conteneur se resserre quand le texte grandit, « L'Astronomican »
 *    de /lore/concepts passait de 23,6 à 21,4 px à 390 px) ;
 *  - jamais un élément tourné ou mis à l'échelle (`transform` autre qu'une translation : sa boîte n'est pas mesurée dans le même repère que son texte, la
 *    flèche tournée des cartes de la chronologie) ni un glyphe seul (« › », « ▾ »).
 * Seulement en texte plus grand (classe `texte-plus-grand`) : au réglage normal, `effacerTitresAjustes` retire tout.
 */

export const ATTRIBUT_BORNE = 'data-titre-borne';
/** L262 : titre dont le mot le plus long ne tient pas dans sa boîte, même à sa taille finale : lui seul garde la
 *  césure (`hyphens: auto`, styles/_texte-agrandi.scss) ; les autres titres ne se coupent qu'entre les mots. */
export const ATTRIBUT_CESURE = 'data-titre-cesure';
const MARGE = 0.98;

function largeurContenu(e: HTMLElement): number {
  let bloc: HTMLElement | null = e;
  while (bloc && getComputedStyle(bloc).display.startsWith('inline') && !getComputedStyle(bloc).display.includes('-')) bloc = bloc.parentElement;
  if (!bloc) return 0;
  const s = getComputedStyle(bloc);
  return bloc.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
}

/** Largeur rendue du mot le plus long sous `e` (somme des morceaux d'un mot coupé sur plusieurs lignes). */
export function motLePlusLong(e: HTMLElement, descendants = true): number {
  return mesurerMots(e, descendants).mot;
}

/** Bloc qui porte la ligne d'un nœud de texte (premier ancêtre qui n'est pas en ligne). */
function blocDe(e: Element | null): Element | null {
  while (e && getComputedStyle(e).display.startsWith('inline') && !getComputedStyle(e).display.includes('-')) e = e.parentElement;
  return e;
}

/** `mot` : largeur rendue du mot le plus long sous `e` ; `ligne` (L262) : si un mot est rendu sur plusieurs lignes,
 *  la place qu'a le texte sur une ligne (du début de la ligne suivante, où le mot reprend, au bout de son morceau sur
 *  la première), plus juste que la boîte de `e` quand un glyphe ou un écart de flex la partage (`h2.section-title` en
 *  inline-flex avec « ✠ ») ; 0 sinon. Un mot peut couvrir plusieurs nœuds de texte d'un même bloc (« « » + espace
 *  fine insécable + <span>Armageddon</span>, 11<sup>e</sup>) : il est mesuré entier. */
export function mesurerMots(e: HTMLElement, descendants = true): { mot: number; ligne: number } {
  const { morceaux, texte } = texteDesBlocs(e, descendants);
  let max = 0;
  let ligne = 0;
  const range = document.createRange();
  // mots séparés par les seules espaces sécables : « Armageddon » (espaces fines insécables) est un bloc ; L262 :
  // la ligne peut aussi passer après un trait d'union ou une barre oblique (« Dieux- / Machines »)
  for (const m of texte.matchAll(/[^ \t\n\r\f\-‐/]+[-‐/]*|[-‐/]+/g)) {
    const rects = rectsDuMot(morceaux, m.index, m.index + m[0].length, range);
    max = Math.max(max, rects.reduce((l, r) => l + r.width, 0));
    const place = placeDeLigne(rects);
    if (place > 0) ligne = ligne ? Math.min(ligne, place) : place;
  }
  return { mot: max, ligne };
}

type Morceau = { n: Text; debut: number };

/** Texte de `e` mis bout à bout, nœud par nœud ; une espace entre deux blocs et pour un <br>. Sans les descendants,
 *  les nœuds directs sont séparés par des éléments : jamais un seul mot. */
function texteDesBlocs(e: HTMLElement, descendants: boolean): { morceaux: Morceau[]; texte: string } {
  const morceaux: Morceau[] = [];
  let texte = '';
  let blocPrecedent: Element | null | undefined;
  const marche = document.createTreeWalker(e, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = marche.nextNode(); n; n = marche.nextNode()) {
    if (n.nodeType !== Node.TEXT_NODE) {
      if ((n as Element).tagName === 'BR') texte += ' ';
    } else if (descendants || n.parentNode === e) {
      const bloc = descendants ? blocDe(n.parentElement) : null;
      if (blocPrecedent !== undefined && (!descendants || bloc !== blocPrecedent)) texte += ' ';
      blocPrecedent = bloc;
      morceaux.push({ n: n as Text, debut: texte.length });
      texte += n.textContent ?? '';
    }
  }
  return { morceaux, texte };
}

/** Rectangles rendus du texte [debut, fin[, à travers les nœuds qui le portent. */
function rectsDuMot(morceaux: Morceau[], debut: number, fin: number, range: Range): DOMRect[] {
  const rects: DOMRect[] = [];
  for (const k of morceaux) {
    const long = k.n.length;
    if (k.debut >= fin || k.debut + long <= debut) continue;
    range.setStart(k.n, Math.max(0, debut - k.debut));
    range.setEnd(k.n, Math.min(long, fin - k.debut));
    rects.push(...Array.from(range.getClientRects()).filter((r) => r.width > 0));
  }
  return rects;
}

/** Mot rendu sur plusieurs lignes : du début de la ligne suivante au bout de son morceau sur la première ; 0 sinon.
 *  Première ligne : les morceaux qui chevauchent en hauteur le plus haut (un exposant reste sur sa ligne). */
function placeDeLigne(rects: DOMRect[]): number {
  if (rects.length < 2) return 0;
  const plusHaut = rects.reduce((a, r) => (r.top < a.top ? r : a));
  const premiere = rects.filter((r) => r.top < plusHaut.bottom - 2);
  const suite = rects.filter((r) => !premiere.includes(r));
  if (!suite.length) return 0;
  return Math.max(...premiere.map((r) => r.right)) - Math.min(...suite.map((r) => r.left));
}

/** Tourné ou mis à l'échelle (une translation seule ne change pas les largeurs mesurées). */
function transforme(s: CSSStyleDeclaration): boolean {
  return s.transform !== 'none' && !/^matrix\(1, 0, 0, 1,/.test(s.transform);
}

function estCandidat(e: HTMLElement): boolean {
  if (/^H[1-6]$/.test(e.tagName)) return true;
  if (e.tagName === 'P' || e.closest('h1, h2, h3, h4, h5, h6')) return false;
  const s = getComputedStyle(e);
  if (!s.fontFamily.includes('Cinzel')) return false;
  if (transforme(s) || [...(e.textContent ?? '').trim()].length <= 1) return false;
  // seulement les éléments qui portent eux-mêmes du texte (le plus proche du texte gagne)
  return Array.from(e.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim());
}

/** Retire les bornes posées. */
export function effacerTitresAjustes(racine: ParentNode): void {
  for (const e of Array.from(racine.querySelectorAll<HTMLElement>(`[${ATTRIBUT_BORNE}]`))) {
    e.style.removeProperty('font-size');
    e.removeAttribute(ATTRIBUT_BORNE);
  }
  for (const e of Array.from(racine.querySelectorAll<HTMLElement>(`[${ATTRIBUT_CESURE}]`))) e.removeAttribute(ATTRIBUT_CESURE);
}

/** Facteur du plancher d'un titre, par niveau, sur la taille du texte qui le suit. */
export const ECHELLE: Record<string, number> = { H1: 1.25, H2: 1.1 };
/** Le h1 dépasse d'autant les sous-titres (h2 à h6) qui étaient plus petits que lui au réglage normal. */
export const SOUS_TITRES = 1.1;
/** Minimums du h1 quand son mot le plus long ne tient pas à `ECHELLE` / `SOUS_TITRES` (L259 r1) : 1,2 fois le texte
 *  qui le suit (R6 de L253, « nettement un titre ») et 1,05 fois les sous-titres à leur plancher. */
export const H1_MIN = 1.2;
/** L262 : dernier recours d'un titre dont le mot le plus long ne tient pas même à sa taille au réglage normal (à 200 %,
 *  les marges en rem des cartes et des en-têtes doublent et resserrent sa colonne) : il descend jusqu'à ce que le mot
 *  tienne, pas sous cette part de sa taille au réglage normal ; au-delà, le mot se coupe à une syllabe, avec un trait. */
export const ULTIME = 0.6;
export const SOUS_TITRES_MIN = 1.05;

const estTitre = (e: Element) => /^H[1-6]$/.test(e.tagName);

/** Taille du texte qui suit le titre `e` : le premier paragraphe visible après lui, dans un de ses trois blocs
 *  parents au plus (sans sortir de `racine`) ; 0 s'il n'y en a pas. */
export function texteQuiSuit(e: HTMLElement, racine: HTMLElement): number {
  let bloc = e.parentElement;
  for (let i = 0; bloc && i < 3; i++, bloc = bloc === racine ? null : bloc.parentElement) {
    for (const p of Array.from(bloc.querySelectorAll<HTMLElement>('p'))) {
      if (!(e.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING) || !p.getClientRects().length) continue;
      if (!(p.textContent ?? '').trim()) continue;
      return parseFloat(getComputedStyle(p).fontSize);
    }
  }
  return 0;
}

/** Tailles des éléments `els` au réglage normal (1rem = 16 px) : la page passe un instant à 16 px, sans image
 *  rendue entre les deux (aucun observateur ne voit la sonde de 1rem changer). */
function taillesNormales(els: HTMLElement[]): number[] {
  if (!els.length) return [];
  const html = document.documentElement;
  const avant = html.style.getPropertyValue('font-size');
  const priorite = html.style.getPropertyPriority('font-size');
  html.style.setProperty('font-size', '16px', 'important');
  const tailles = els.map((e) => parseFloat(getComputedStyle(e).fontSize));
  if (avant) html.style.setProperty('font-size', avant, priorite);
  else html.style.removeProperty('font-size');
  return tailles;
}

/** Plancher du h1 (L259 r1) : `m` ses mesures (taille, largeur disponible, mot le plus long), `normale` sa taille au
 *  réglage normal, `suit` la taille du texte qui le suit (au moins 1rem), `sesSous` les sous-titres qui étaient plus
 *  petits que lui au réglage normal. */
function plancherH1(
  m: { taille: number; dispo: number; mot: number },
  normale: number,
  suit: number,
  sesSous: { plancher: number; cible: number }[],
): number {
  // plancher dur (au-delà, son mot se coupe, avec un trait si la langue le permet) : sa taille au réglage normal,
  // nettement au-dessus du texte qui le suit (`H1_MIN`, R6 de L253) et des sous-titres à leur propre plancher
  // (`SOUS_TITRES_MIN`)…
  const dur = Math.max(normale, H1_MIN * suit, SOUS_TITRES_MIN * Math.max(0, ...sesSous.map((t) => t.plancher)));
  // … puis, tant que son mot le plus long tient dans sa boîte : `ECHELLE` fois le texte qui le suit, et un dixième
  // au-dessus des sous-titres qui étaient plus petits que lui au réglage normal ; ceux-ci ne le font pas grandir
  // au-delà de ce qui tient (L259 : « Le Warp » à 64 px portait le h1 de /lore/concepts à 70,4 px, « CONC|EPTS »),
  // ce sont alors eux qui redescendent. L259 r1 (QA en prod) : avec la vraie Cinzel, plus large que la police de
  // secours, « CONCEPTS » ne tenait pas à 1,25 × 32 px dans 242 px à 320 px : le h1 descend à 38,4 px, pas sous `dur`.
  const voulu = Math.max(normale, ECHELLE['H1'] * suit, ...sesSous.map((t) => t.cible * SOUS_TITRES));
  const tient = m.dispo > 0 && m.mot > 0 ? (m.taille * m.dispo * MARGE) / m.mot : Infinity;
  // Si son mot ne tient pas même à `dur`, céder ne sert à rien : il se coupe de toute façon (avec un trait si la
  // langue le permet), le h1 garde `ECHELLE` fois le texte qui le suit (règle d'avant L259 r1).
  // (sans `MARGE` : à 320 px, « CONCEPTS » tient à 38,4 px dans 242 px, la marge le mettait juste au-dessus)
  const tientADur = !(m.dispo > 0 && m.mot > 0) || (m.mot * dur) / m.taille <= m.dispo;
  // L262 (QA en prod du 25-11) : si son mot ne tient même pas à `dur`, il descend jusqu'à ce qu'il tienne, jamais sous
  // sa taille au réglage normal (`ULTIME` fois, en dernier recours) — un mot coupé au milieu (« Civils / Impér / iaux » à 320 px) se lit plus mal qu'un
  // h1 moins détaché du texte qui le suit. (Avant : il gardait `ECHELLE` fois ce texte et le mot se coupait.)
  return tientADur ? Math.max(dur, Math.min(voulu, tient)) : Math.max(ULTIME * normale, Math.min(dur, tient));
}

/** Au centième inférieur, sans erreur flottante (1,2 × 34 = 40,8 donnait 40,79). */
function poser(e: HTMLElement, taille: number): void {
  e.style.setProperty('font-size', `${Math.floor(taille * 100 + 1e-6) / 100}px`);
  e.setAttribute(ATTRIBUT_BORNE, '');
}

/** L262 : passe de vérification, une fois les tailles posées. La largeur d'un mot en Cinzel n'est pas proportionnelle
 *  à la taille (« DESCRIPTION » : 341 px à 44 px, mais 188,5 px à 23,74 px, pas 182) et la boîte d'un titre n'est pas
 *  toujours la place de son texte (glyphe dans un inline-flex) : un titre réduit « juste assez » pouvait encore se
 *  couper. Chaque titre dont le mot le plus long dépasse sa boîte ou est rendu sur plusieurs lignes est réduit à la
 *  place mesurée (trois passes au plus), pas sous `ultime` ; s'il n'y tient pas même là, il garde la césure
 *  (`ATTRIBUT_CESURE`). */
function verifierTitres(titres: { e: HTMLElement; ultime: number }[], bornes: Map<HTMLElement, number>): void {
  let restants = titres;
  for (let passe = 0; passe < 3 && restants.length; passe++) {
    const trop = restants
      .map((t) => {
        const { mot, ligne } = mesurerMots(t.e);
        const boite = largeurContenu(t.e);
        // un mot rendu sur plusieurs lignes : la place de sa ligne fait foi
        return { ...t, mot, dispo: ligne ? Math.min(boite, ligne) : boite, coupe: ligne > 0, taille: parseFloat(getComputedStyle(t.e).fontSize) };
      })
      .filter((t) => t.dispo > 0 && (t.coupe || t.mot > t.dispo));
    for (const t of trop) {
      const voulu = (t.taille * t.dispo * MARGE) / t.mot;
      if (voulu < t.ultime) {
        if (t.ultime < t.taille - 0.25) poser(t.e, t.ultime);
        t.e.setAttribute(ATTRIBUT_CESURE, '');
      } else poser(t.e, voulu);
      bornes.set(t.e, Math.max(voulu, t.ultime));
    }
    restants = trop.filter((t) => !t.e.hasAttribute(ATTRIBUT_CESURE)).map(({ e, ultime }) => ({ e, ultime }));
  }
}


/** Plancher retenu d'un sous-titre : le souple s'il laisse tenir le mot, sinon ce qui tient (`tient`), au plus le
 *  souple et au moins `ULTIME` fois sa taille normale ; le h1 reste au-dessus de lui (L259). */
function plancherRetenu(m: { dispo: number; mot: number; taille: number }, plancher: number, normale: number, tient: number): number {
  const tientAuPlancher = !(m.dispo > 0 && m.mot > 0) || (m.mot * plancher) / m.taille <= m.dispo * MARGE;
  return tientAuPlancher ? plancher : Math.max(ULTIME * normale, Math.min(plancher, tient));
}

/** L262 : un h1 descendu pour que son mot tienne garde ses sous-titres sous lui (`SOUS_TITRES_MIN`), pas sous leur
 *  propre `ULTIME` ; plus petits, ils tiennent d'autant mieux. (Au-dessus de son plancher dur, c'était déjà le cas.) */
function garderSousLesH1(
  h1s: { e: HTMLElement; normale: number }[],
  sousTitres: { e: HTMLElement; normale: number }[],
  bornes: Map<HTMLElement, number>,
): void {
  const finale = (e: HTMLElement) => parseFloat(getComputedStyle(e).fontSize);
  for (const h1 of h1s) {
    const f = finale(h1.e);
    for (const t of sousTitres.filter((x) => x.normale < h1.normale && finale(x.e) > f / SOUS_TITRES_MIN + 0.01)) {
      const borne = Math.max(ULTIME * t.normale, f / SOUS_TITRES_MIN);
      if (borne < finale(t.e) - 0.01) {
        poser(t.e, borne);
        bornes.set(t.e, borne);
      }
    }
  }
}

/** Borne la taille des titres de `racine` dont le mot le plus long dépasse leur boîte, et relève un h1 figé sous
 *  son plancher ; `rem` : 1rem en px. */
export function ajusterTitres(racine: HTMLElement, rem: number): number {
  effacerTitresAjustes(racine);
  const candidats = Array.from(racine.querySelectorAll<HTMLElement>('*')).filter((e) => {
    if (!e.getClientRects().length || !(e.textContent ?? '').trim()) return false;
    const s = getComputedStyle(e);
    if (s.whiteSpace === 'nowrap' || transforme(s)) return false;
    return estCandidat(e);
  });
  // Lecture de toutes les mesures, puis écriture : une seule mise en page.
  const mesures = candidats.map((e) => {
    const titre = estTitre(e);
    const s = getComputedStyle(e);
    const fit = titre && s.getPropertyValue('--longest-word').trim() !== '';
    return { e, titre, fit, dispo: largeurContenu(e), mot: motLePlusLong(e, titre), taille: parseFloat(s.fontSize) };
  });
  const titres = mesures.filter((m) => m.titre);
  const tn = taillesNormales(titres.map((t) => t.e));
  const normales = new Map(titres.map((m, i) => [m.e, tn[i]]));
  const bornes = new Map<HTMLElement, number>();
  // tailles finales des titres de niveau 2 à 6 (avec leur normale et leur plancher) : le h1 reste au-dessus
  const sousTitres: { e: HTMLElement; taille: number; normale: number; plancher: number; cible: number }[] = [];
  const cibleTitre = (m: (typeof mesures)[number], plancher: number) => {
    const { dispo, mot, taille } = m;
    // le mot le plus long ne tient pas : réduit juste assez, pas sous le plancher (un titre déjà plus petit que son
    // plancher garde sa taille)
    return dispo > 0 && mot > dispo ? Math.max(Math.min(plancher, taille), (taille * dispo * MARGE) / mot) : taille;
  };
  // L262 : h2 à h6, le mot le plus long tient-il au plancher souple (`ECHELLE` fois le texte qui le suit) ? Sinon, le
  // titre descend jusqu'à ce qu'il tienne, pas sous son plancher dur (taille au réglage normal, `ULTIME` fois en dernier
  // recours) — QA du 25-11 : les h2
  // de /lore et /lore/civilians restaient à 1,1 × 32 = 35,2 px, « Pant|héon », « Adept|us ».
  for (const m of mesures) {
    const { e, titre, dispo, mot, taille } = m;
    if (!titre) {
      if (!(dispo > 0 && mot > dispo)) continue;
      // un autre texte : pas sous sa taille au réglage normal (taille × 16 / rem)
      const borne = Math.max((taille * 16) / rem, (taille * dispo * MARGE) / mot);
      if (borne < taille - 0.25) bornes.set(e, borne);
      continue;
    }
    if (e.tagName === 'H1') continue;
    const normale = normales.get(e) ?? 0;
    const plancher = Math.max(normale, (ECHELLE[e.tagName] ?? 1) * Math.max(rem, texteQuiSuit(e, racine)));
    // borné par fit-title (L31) sous son plancher : relevé jusqu'à ce que son mot le plus long tienne, sans dépasser
    // le plancher, et jamais sous sa taille au réglage normal (L255 ; au-delà de ce qui tient, « ASTARTE|S » se
    // coupait sans trait : un nom propre n'a pas toujours de césure)
    const tient = dispo > 0 && mot > 0 ? (taille * dispo * MARGE) / mot : plancher;
    const retenu = plancherRetenu(m, plancher, normale, tient);
    const cible = m.fit ? Math.max(cibleTitre(m, retenu), Math.min(retenu, Math.max(normale, tient))) : cibleTitre(m, retenu);
    sousTitres.push({ e, taille, normale, plancher: retenu, cible });
  }
  for (const m of mesures.filter((x) => x.e.tagName === 'H1')) {
    const normale = normales.get(m.e) ?? 0;
    const sesSous = sousTitres.filter((t) => t.normale < normale);
    const plancher = plancherH1(m, normale, Math.max(rem, texteQuiSuit(m.e, racine)), sesSous);
    // un h1 plus petit que son plancher (figé par fit-title) y est relevé
    const cible = Math.max(cibleTitre(m, plancher), plancher);
    // (jamais sous leur propre plancher : taille au réglage normal, échelle sur le texte qui les suit)
    for (const t of sesSous) t.cible = Math.min(t.cible, Math.max(t.plancher, cible / SOUS_TITRES));
    if (Math.abs(cible - m.taille) > 0.25) bornes.set(m.e, cible);
  }
  for (const t of sousTitres) if (Math.abs(t.cible - t.taille) > 0.25) bornes.set(t.e, t.cible);
  for (const [e, borne] of bornes) poser(e, borne);
  verifierTitres(titres.map((m) => ({ e: m.e, ultime: ULTIME * (normales.get(m.e) ?? 0) })), bornes);
  garderSousLesH1(mesures.filter((x) => x.e.tagName === 'H1').map((x) => ({ e: x.e, normale: normales.get(x.e) ?? 0 })), sousTitres, bornes);
  return bornes.size;
}
